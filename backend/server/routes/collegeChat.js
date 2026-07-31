/**
 * routes/collegeChat.js — College Path in-house chat (Phase 5, 2026-07-31;
 * broadened to team channels 2026-07-31 follow-up)
 * ---------------------------------------------------------------------------
 * Two kinds of thread, distinguished by recruiter_id:
 *   - Internal ("channel", recruiter_id IS NULL) — the institution's own
 *     staff talking to each other. Open to EVERY active institution_staff
 *     role (college_admin, placement_officer, professor, dept_head, mentor)
 *     plus the institution admin — this is Capabilio's own in-house
 *     equivalent of a Teams channel, deliberately built in-house rather than
 *     integrating a third party (see 2026-07-31 product decision).
 *   - Recruiter thread (recruiter_id IS NOT NULL) — placement-cell <->
 *     recruiter. Stays restricted to college_admin/placement_officer + the
 *     specific recruiter, same as Phase 5 — business-sensitive, not
 *     general-staff visibility.
 * Distinct from routes/chat.js, which is a generic AI career-coach endpoint
 * and has nothing to do with this feature despite the similar name.
 *
 * Mounted at /api/college-chat in server.js.
 *
 *   POST /threads                    — start a thread (channel or with a recruiter)
 *   GET  /threads?institutionId=     — list threads the caller can see
 *   GET  /threads/:threadId/messages — read a thread's messages (paginated)
 *   POST /threads/:threadId/messages — send a message
 *
 * Security: RLS (institution_chat_threads/institution_chat_messages, see
 * college_path_chat_system + college_path_chat_team_channels migrations) is
 * the source of truth for read access if these tables are ever queried
 * directly; supabaseAdmin bypasses RLS, so getInstitutionAccess() below is
 * the independent second layer for every route here, kept in lockstep with
 * the RLS predicate — same "two independent checks" posture as college.js.
 * Messages are append-only (no edit/delete route) — the message history
 * itself is the audit trail requested for this feature; no separate log.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"

const router = Router()

// Full access: recruiter threads + channels.
const PLACEMENT_ROLES = ["college_admin", "placement_officer"]
// Channel-only access: internal threads (recruiter_id IS NULL), never
// recruiter threads — mirrors the RLS predicate exactly.
const CHANNEL_ONLY_ROLES = ["professor", "dept_head", "mentor"]

// Resolves whether `userId` may access threads for `institutionId`, and at
// which tier: "placement" (institution admin or college_admin/
// placement_officer — sees everything) or "staff" (any other active staff
// role — channels only). Returns null if the user has no staff standing at
// all (e.g. they're only ever a recruiter, checked separately per-thread).
async function getInstitutionAccess(institutionId, userId) {
  const { data: inst } = await supabaseAdmin
    .from("institutions")
    .select("admin_user_id")
    .eq("id", institutionId)
    .maybeSingle()
  if (inst?.admin_user_id === userId) return "placement"

  const { data: staff } = await supabaseAdmin
    .from("institution_staff")
    .select("role")
    .eq("institution_id", institutionId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle()
  if (!staff) return null
  return PLACEMENT_ROLES.includes(staff.role) ? "placement"
    : CHANNEL_ONLY_ROLES.includes(staff.role) ? "staff"
    : null
}

async function getThread(threadId) {
  const { data } = await supabaseAdmin
    .from("institution_chat_threads")
    .select("id, institution_id, recruiter_id, subject, created_by, created_at, last_message_at")
    .eq("id", threadId)
    .maybeSingle()
  return data || null
}

// A user may access a thread if:
//   - it's a channel (recruiter_id null) and they're ANY active institution
//     staff member ("placement" or "staff" tier), OR
//   - it's a recruiter thread and they're "placement" tier staff, OR
//   - they are the specific recruiter the thread is with.
// Never broader than that — a different recruiter cannot read it, and a
// channel-only-tier staffer (professor/mentor/dept_head) cannot read
// recruiter threads.
async function canAccessThread(thread, userId) {
  if (!thread) return false
  if (thread.recruiter_id === userId) return true
  const access = await getInstitutionAccess(thread.institution_id, userId)
  if (!access) return false
  if (thread.recruiter_id === null) return true // channel — any staff tier
  return access === "placement" // recruiter thread — placement tier only
}

// ── POST /threads — start a thread ────────────────────────────────────────
router.post("/threads", requireAuth, async (req, res) => {
  const { institutionId, recruiterId = null, subject = null, firstMessage } = req.body || {}
  if (!institutionId) return res.status(400).json({ error: "institutionId is required" })
  if (!firstMessage || !firstMessage.trim()) return res.status(400).json({ error: "firstMessage is required" })

  const staffAccess = await getInstitutionAccess(institutionId, req.user.id)
  let effectiveRecruiterId = recruiterId

  if (recruiterId) {
    // Either the named recruiter is starting the thread themselves, or a
    // "placement" tier staff member is starting it with a recruiter — never
    // a staff member impersonating a different recruiter, and never a
    // channel-only-tier staffer (professor/mentor/dept_head) starting a
    // recruiter conversation.
    if (req.user.id === recruiterId) {
      effectiveRecruiterId = req.user.id
    } else if (staffAccess === "placement") {
      effectiveRecruiterId = recruiterId
    } else {
      return res.status(403).json({ error: "Not authorized to start this thread" })
    }
  } else if (!staffAccess) {
    // Channels (no recruiter) are open to any active institution_staff role.
    return res.status(403).json({ error: "Requires an active institution staff role" })
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

  if (staffAccess === "staff") {
    // Channel-only tier (professor/dept_head/mentor) — channels only, never
    // recruiter threads even if one happens to exist for this institution.
    query = query.is("recruiter_id", null)
  } else if (staffAccess !== "placement") {
    // Not institution staff at all — can only see their own recruiter thread(s).
    query = query.eq("recruiter_id", req.user.id)
  }
  // staffAccess === "placement" — no extra filter, sees channels + recruiter threads.

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
    if (!thread.recruiter_id) {
      // Channel — notify every active staff member (any role), same
      // audience that can read the channel.
      const { data: inst } = await supabaseAdmin.from("institutions").select("admin_user_id").eq("id", thread.institution_id).single()
      const { data: staff } = await supabaseAdmin
        .from("institution_staff")
        .select("user_id")
        .eq("institution_id", thread.institution_id)
        .eq("status", "active")
      for (const id of [inst?.admin_user_id, ...(staff || []).map((s) => s.user_id)]) {
        if (id && id !== req.user.id) recipients.add(id)
      }
    } else if (thread.recruiter_id === req.user.id) {
      // Recruiter replying in their own thread — notify only placement-tier
      // staff, mirroring canAccessThread's recruiter-thread restriction.
      const { data: inst } = await supabaseAdmin.from("institutions").select("admin_user_id").eq("id", thread.institution_id).single()
      const { data: staff } = await supabaseAdmin
        .from("institution_staff")
        .select("user_id")
        .eq("institution_id", thread.institution_id)
        .eq("status", "active")
        .in("role", PLACEMENT_ROLES)
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
