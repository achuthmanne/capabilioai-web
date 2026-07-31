/**
 * routes/collegeChat.js — College Path in-house chat (Phase 5, 2026-07-31)
 * ---------------------------------------------------------------------------
 * Human-to-human messaging between a college's admin/placement-cell staff
 * and, optionally, a connected recruiter — distinct from routes/chat.js,
 * which is a generic AI career-coach endpoint and has nothing to do with
 * this feature despite the similar name.
 *
 * Mounted at /api/college-chat in server.js.
 *
 *   POST /threads                    — start a thread (internal or with a recruiter)
 *   GET  /threads?institutionId=     — list threads the caller can see
 *   GET  /threads/:threadId/messages — read a thread's messages (paginated)
 *   POST /threads/:threadId/messages — send a message
 *
 * Security: RLS (institution_chat_threads/institution_chat_messages, see
 * college_path_chat_system migration) is the source of truth for read
 * access if these tables are ever queried directly; supabaseAdmin bypasses
 * RLS, so getThreadAccess() below is the independent second layer for every
 * route here — same "two independent checks" posture as college.js.
 * Messages are append-only (no edit/delete route) — the message history
 * itself is the audit trail requested for this feature; no separate log.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"

const router = Router()

const ADMIN_ROLES = ["college_admin", "placement_officer"]

// Resolves whether `userId` may access threads for `institutionId`, and as
// which kind of participant ("staff" or, only relevant for recruiter
// threads, "recruiter"). Returns null if the user has no standing at all.
async function getInstitutionAccess(institutionId, userId) {
  const { data: inst } = await supabaseAdmin
    .from("institutions")
    .select("admin_user_id")
    .eq("id", institutionId)
    .maybeSingle()
  if (inst?.admin_user_id === userId) return "staff"

  const { data: staff } = await supabaseAdmin
    .from("institution_staff")
    .select("role")
    .eq("institution_id", institutionId)
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ADMIN_ROLES)
    .maybeSingle()
  if (staff) return "staff"

  return null
}

async function getThread(threadId) {
  const { data } = await supabaseAdmin
    .from("institution_chat_threads")
    .select("id, institution_id, recruiter_id, subject, created_by, created_at, last_message_at")
    .eq("id", threadId)
    .maybeSingle()
  return data || null
}

// A user may access a thread if they're institution staff (college_admin /
// placement_officer) for that institution, OR they are the specific
// recruiter the thread is with. Never broader than that — a different
// recruiter, or a professor/mentor/dept_head, cannot read it.
async function canAccessThread(thread, userId) {
  if (!thread) return false
  if (thread.recruiter_id === userId) return true
  const access = await getInstitutionAccess(thread.institution_id, userId)
  return access === "staff"
}

// ── POST /threads — start a thread ────────────────────────────────────────
router.post("/threads", requireAuth, async (req, res) => {
  const { institutionId, recruiterId = null, subject = null, firstMessage } = req.body || {}
  if (!institutionId) return res.status(400).json({ error: "institutionId is required" })
  if (!firstMessage || !firstMessage.trim()) return res.status(400).json({ error: "firstMessage is required" })

  const staffAccess = await getInstitutionAccess(institutionId, req.user.id)
  let effectiveRecruiterId = recruiterId

  if (recruiterId) {
    // Either the named recruiter is starting the thread themselves, or an
    // institution staff member is starting it with a recruiter — never a
    // staff member impersonating a different recruiter.
    if (req.user.id === recruiterId) {
      effectiveRecruiterId = req.user.id
    } else if (staffAccess === "staff") {
      effectiveRecruiterId = recruiterId
    } else {
      return res.status(403).json({ error: "Not authorized to start this thread" })
    }
  } else if (staffAccess !== "staff") {
    // Internal (no recruiter) threads are college_admin/placement_officer only.
    return res.status(403).json({ error: "Requires college_admin or placement_officer role" })
  }

  const { data: thread, error } = await supabaseAdmin
    .from("institution_chat_threads")
    .insert({ institution_id: institutionId, recruiter_id: effectiveRecruiterId, subject, created_by: req.user.id })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })

  const { error: msgErr } = await supabaseAdmin
    .from("institution_chat_messages")
    .insert({ thread_id: thread.id, sender_id: req.user.id, body: firstMessage.trim() })
  if (msgErr) return res.status(500).json({ error: msgErr.message })

  res.status(200).json({ thread })
})

// ── GET /threads?institutionId= — list threads the caller can see ────────
router.get("/threads", requireAuth, async (req, res) => {
  const { institutionId } = req.query
  if (!institutionId) return res.status(400).json({ error: "institutionId is required" })

  const staffAccess = await getInstitutionAccess(institutionId, req.user.id)
  let query = supabaseAdmin
    .from("institution_chat_threads")
    .select("id, institution_id, recruiter_id, subject, created_by, created_at, last_message_at")
    .eq("institution_id", institutionId)

  if (staffAccess !== "staff") {
    // Not institution staff — can only see their own recruiter threads.
    query = query.eq("recruiter_id", req.user.id)
  }

  const { data, error } = await query.order("last_message_at", { ascending: false }).limit(100)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ threads: data || [] })
})

// ── GET /threads/:threadId/messages ───────────────────────────────────────
router.get("/threads/:threadId/messages", requireAuth, async (req, res) => {
  const thread = await getThread(req.params.threadId)
  if (!(await canAccessThread(thread, req.user.id))) return res.status(404).json({ error: "Thread not found" })

  const { data, error } = await supabaseAdmin
    .from("institution_chat_messages")
    .select("id, sender_id, body, created_at")
    .eq("thread_id", req.params.threadId)
    .order("created_at", { ascending: true })
    .limit(200)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ thread, messages: data || [] })
})

// ── POST /threads/:threadId/messages — send a message ────────────────────
router.post("/threads/:threadId/messages", requireAuth, async (req, res) => {
  const { body } = req.body || {}
  if (!body || !body.trim()) return res.status(400).json({ error: "body is required" })
  if (body.length > 4000) return res.status(400).json({ error: "Message too long (max 4000 characters)" })

  const thread = await getThread(req.params.threadId)
  if (!(await canAccessThread(thread, req.user.id))) return res.status(404).json({ error: "Thread not found" })

  const { data: message, error } = await supabaseAdmin
    .from("institution_chat_messages")
    .insert({ thread_id: thread.id, sender_id: req.user.id, body: body.trim() })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })

  await supabaseAdmin
    .from("institution_chat_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", thread.id)

  // Notify the other side — best-effort, never blocks the send.
  try {
    const { data: sender } = await supabaseAdmin.from("profiles").select("name, org_name").eq("id", req.user.id).single()
    const senderName = sender?.org_name || sender?.name || "Someone"
    const recipients = new Set()
    if (thread.recruiter_id && thread.recruiter_id !== req.user.id) recipients.add(thread.recruiter_id)
    if (!thread.recruiter_id || thread.recruiter_id === req.user.id) {
      const { data: inst } = await supabaseAdmin.from("institutions").select("admin_user_id").eq("id", thread.institution_id).single()
      const { data: staff } = await supabaseAdmin
        .from("institution_staff")
        .select("user_id")
        .eq("institution_id", thread.institution_id)
        .eq("status", "active")
        .in("role", ADMIN_ROLES)
      for (const id of [inst?.admin_user_id, ...(staff || []).map((s) => s.user_id)]) {
        if (id && id !== req.user.id) recipients.add(id)
      }
    }
    if (recipients.size > 0) {
      await supabaseAdmin.from("notifications").insert(
        [...recipients].map((userId) => ({
          user_id: userId, type: "chat_message", title: `New message from ${senderName}`,
          body: body.trim().slice(0, 140), actor_id: req.user.id,
          entity_id: thread.id, entity_type: "institution_chat_threads", category: "chat",
        }))
      )
    }
  } catch (err) {
    console.error("[collegeChat] notify", err)
  }

  res.status(200).json({ message })
})

export default router
