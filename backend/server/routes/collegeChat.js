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
    .select("id, institution_id, recruiter_id, subject, created_by, created_at, last_message_at, context_type, context_id, status_tag")
    .eq("id", threadId)
    .maybeSingle()
  return data || null
}

// 2026-07-31 coordination layer: explicit CC-style participants
// (thread_participants) are gated behind this flag — the table and RLS
// exist, but the backend only grants access through it once the flag is
// on. This is the one component of the coordination layer with real
// access-control blast radius (it can add a reader to a thread who
// wouldn't otherwise see it), so it ships off by default pending a manual
// RLS review, per the design doc's Phase 4 gating.
const EXPLICIT_PARTICIPANTS_ENABLED = process.env.ENABLE_THREAD_EXPLICIT_PARTICIPANTS === "true"

async function isExplicitParticipant(threadId, userId) {
  if (!EXPLICIT_PARTICIPANTS_ENABLED) return false
  const { data } = await supabaseAdmin
    .from("thread_participants")
    .select("user_id")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .maybeSingle()
  return !!data
}

// A user may access a thread if:
//   - it's a channel (recruiter_id null) and they're ANY active institution
//     staff member ("placement" or "staff" tier), OR
//   - it's a recruiter thread and they're "placement" tier staff, OR
//   - they are the specific recruiter the thread is with, OR
//   - (flagged) they were explicitly CC'd onto this specific thread.
// Never broader than that — a different recruiter cannot read it, and a
// channel-only-tier staffer (professor/mentor/dept_head) cannot read
// recruiter threads without an explicit CC.
async function canAccessThread(thread, userId) {
  if (!thread) return false
  if (thread.recruiter_id === userId) return true
  const access = await getInstitutionAccess(thread.institution_id, userId)
  if (access) {
    if (thread.recruiter_id === null) return true // channel — any staff tier
    if (access === "placement") return true // recruiter thread — placement tier only
  }
  return isExplicitParticipant(thread.id, userId)
}

const CONTEXT_TYPES = ["student", "recruiter_relationship", "interview", "offer", "approval", "drive"]
const STATUS_TAGS = ["pending", "reviewed", "approved", "shortlisted", "selected", "offer_sent"]

// ── POST /threads — start a thread ────────────────────────────────────────
// 2026-07-31 coordination layer: accepts optional contextType/contextId/
// statusTag so a thread can be launched already bound to a real
// placement-operations object (student, offer, interview, drive, ...) —
// see the "Message about this" launchers in InstitutionOS.jsx. Omitting
// them keeps the exact pre-existing behavior (a plain channel/recruiter
// thread), so nothing about the original Phase 5 contract changes.
router.post("/threads", requireAuth, async (req, res) => {
  const { institutionId, recruiterId = null, subject = null, firstMessage, contextType = null, contextId = null, statusTag = null } = req.body || {}
  if (!institutionId) return res.status(400).json({ error: "institutionId is required" })
  if (!firstMessage || !firstMessage.trim()) return res.status(400).json({ error: "firstMessage is required" })
  if (contextType && !CONTEXT_TYPES.includes(contextType))
    return res.status(400).json({ error: `contextType must be one of: ${CONTEXT_TYPES.join(", ")}` })
  if (contextType && !contextId)
    return res.status(400).json({ error: "contextId is required when contextType is set" })
  if (statusTag && !STATUS_TAGS.includes(statusTag))
    return res.status(400).json({ error: `statusTag must be one of: ${STATUS_TAGS.join(", ")}` })

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
    .insert({
      institution_id: institutionId, recruiter_id: effectiveRecruiterId, subject, created_by: req.user.id,
      context_type: contextType, context_id: contextId, status_tag: statusTag,
    })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })

  const { error: msgErr } = await supabaseAdmin
    .from("institution_chat_messages")
    .insert({ thread_id: thread.id, sender_id: req.user.id, body: firstMessage.trim() })
  if (msgErr) return res.status(500).json({ error: msgErr.message })

  res.status(200).json({ thread })
})

// ── PATCH /threads/:threadId — reclassify context / update status tag ────
// Staff-only (any active tier) — a recruiter can read a thread but never
// reclassify it; that's an institution-side coordination action.
router.patch("/threads/:threadId", requireAuth, async (req, res) => {
  const thread = await getThread(req.params.threadId)
  if (!thread) return res.status(404).json({ error: "Thread not found" })
  const access = await getInstitutionAccess(thread.institution_id, req.user.id)
  if (!access) return res.status(403).json({ error: "Requires an active institution staff role" })

  const { contextType, contextId, statusTag } = req.body || {}
  const patch = {}
  if (contextType !== undefined) {
    if (contextType !== null && !CONTEXT_TYPES.includes(contextType))
      return res.status(400).json({ error: `contextType must be one of: ${CONTEXT_TYPES.join(", ")}` })
    patch.context_type = contextType
  }
  if (contextId !== undefined) patch.context_id = contextId
  if (statusTag !== undefined) {
    if (statusTag !== null && !STATUS_TAGS.includes(statusTag))
      return res.status(400).json({ error: `statusTag must be one of: ${STATUS_TAGS.join(", ")}` })
    patch.status_tag = statusTag
  }
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Nothing to update" })

  const { data: updated, error } = await supabaseAdmin
    .from("institution_chat_threads").update(patch).eq("id", thread.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ thread: updated })
})

// ── GET /threads?institutionId= — list threads the caller can see ────────
router.get("/threads", requireAuth, async (req, res) => {
  const { institutionId } = req.query
  if (!institutionId) return res.status(400).json({ error: "institutionId is required" })

  const staffAccess = await getInstitutionAccess(institutionId, req.user.id)
  let query = supabaseAdmin
    .from("institution_chat_threads")
    .select("id, institution_id, recruiter_id, subject, created_by, created_at, last_message_at, context_type, context_id, status_tag")
    .eq("institution_id", institutionId)

  if (staffAccess === "staff") {
    // Channel-only tier (professor/dept_head/mentor) — channels only, never
    // recruiter threads even if one happens to exist for this institution.
    // (Flagged) also include any thread they were explicitly CC'd onto.
    let threadIds = null
    if (EXPLICIT_PARTICIPANTS_ENABLED) {
      const { data: cc } = await supabaseAdmin.from("thread_participants").select("thread_id").eq("user_id", req.user.id)
      threadIds = (cc || []).map((c) => c.thread_id)
    }
    query = threadIds && threadIds.length > 0
      ? query.or(`recruiter_id.is.null,id.in.(${threadIds.join(",")})`)
      : query.is("recruiter_id", null)
  } else if (staffAccess !== "placement") {
    // Not institution staff at all — own recruiter thread(s), plus
    // (flagged) any thread they were explicitly CC'd onto.
    let threadIds = []
    if (EXPLICIT_PARTICIPANTS_ENABLED) {
      const { data: cc } = await supabaseAdmin.from("thread_participants").select("thread_id").eq("user_id", req.user.id)
      threadIds = (cc || []).map((c) => c.thread_id)
    }
    query = threadIds.length > 0
      ? query.or(`recruiter_id.eq.${req.user.id},id.in.(${threadIds.join(",")})`)
      : query.eq("recruiter_id", req.user.id)
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

// ─────────────────────────────────────────────────────────────────────────
// Coordination layer (2026-07-31): message -> task/follow-up and
// message -> approval conversion. Both are real tracked data objects
// (chat_followups / chat_approvals), not UI-only labels. Staff-only
// (any active tier) — a recruiter can participate in a thread but not
// spin up internal follow-ups/approvals from it.
// ─────────────────────────────────────────────────────────────────────────

async function requireStaffOnThread(threadId, userId) {
  const thread = await getThread(threadId)
  if (!thread) return { thread: null, access: null }
  const access = await getInstitutionAccess(thread.institution_id, userId)
  return { thread, access }
}

// ── POST /threads/:threadId/followups — convert a message into a task ────
router.post("/threads/:threadId/followups", requireAuth, async (req, res) => {
  const { thread, access } = await requireStaffOnThread(req.params.threadId, req.user.id)
  if (!thread) return res.status(404).json({ error: "Thread not found" })
  if (!access) return res.status(403).json({ error: "Requires an active institution staff role" })

  const { title, messageId = null, assignedTo = null, dueAt = null } = req.body || {}
  if (!title || !title.trim()) return res.status(400).json({ error: "title is required" })

  const { data: followup, error } = await supabaseAdmin
    .from("chat_followups")
    .insert({
      thread_id: thread.id, message_id: messageId, institution_id: thread.institution_id,
      created_by: req.user.id, assigned_to: assignedTo, title: title.trim(), due_at: dueAt,
    })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })

  if (assignedTo && assignedTo !== req.user.id) {
    try {
      await supabaseAdmin.from("notifications").insert({
        user_id: assignedTo, type: "followup_assigned", title: "New follow-up assigned to you",
        body: title.trim().slice(0, 140), actor_id: req.user.id,
        entity_id: followup.id, entity_type: "chat_followups", category: "chat",
      })
    } catch (err) { console.error("[collegeChat] followup notify", err) }
  }

  res.status(200).json({ followup })
})

// ── GET /followups?institutionId=&status= — follow-up queue ──────────────
router.get("/followups", requireAuth, async (req, res) => {
  const { institutionId, status } = req.query
  if (!institutionId) return res.status(400).json({ error: "institutionId is required" })
  const access = await getInstitutionAccess(institutionId, req.user.id)
  if (!access) return res.status(403).json({ error: "Requires an active institution staff role" })

  let query = supabaseAdmin.from("chat_followups").select("*").eq("institution_id", institutionId)
  if (status) query = query.eq("status", status)
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ followups: data || [] })
})

// ── PATCH /followups/:id — mark done/dismissed ────────────────────────────
router.patch("/followups/:id", requireAuth, async (req, res) => {
  const { data: followup } = await supabaseAdmin.from("chat_followups").select("*").eq("id", req.params.id).maybeSingle()
  if (!followup) return res.status(404).json({ error: "Follow-up not found" })
  const access = await getInstitutionAccess(followup.institution_id, req.user.id)
  if (!access) return res.status(403).json({ error: "Requires an active institution staff role" })

  const { status } = req.body || {}
  if (!["open", "done", "dismissed"].includes(status)) return res.status(400).json({ error: "Invalid status" })

  const { data: updated, error } = await supabaseAdmin
    .from("chat_followups")
    .update({ status, resolved_at: status === "open" ? null : new Date().toISOString() })
    .eq("id", followup.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ followup: updated })
})

// ── POST /threads/:threadId/approvals — convert a message into an approval ─
router.post("/threads/:threadId/approvals", requireAuth, async (req, res) => {
  const { thread, access } = await requireStaffOnThread(req.params.threadId, req.user.id)
  if (!thread) return res.status(404).json({ error: "Thread not found" })
  if (!access) return res.status(403).json({ error: "Requires an active institution staff role" })

  const { subject, messageId = null, approverId = null, contextType = null, contextId = null } = req.body || {}
  if (!subject || !subject.trim()) return res.status(400).json({ error: "subject is required" })
  if (contextType && !["student", "recruiter_relationship", "interview", "offer", "drive"].includes(contextType))
    return res.status(400).json({ error: "Invalid contextType" })

  const { data: approval, error } = await supabaseAdmin
    .from("chat_approvals")
    .insert({
      thread_id: thread.id, message_id: messageId, institution_id: thread.institution_id,
      requested_by: req.user.id, approver_id: approverId, subject: subject.trim(),
      context_type: contextType, context_id: contextId,
    })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })

  // Notify the named approver, or (if unassigned) every placement-tier
  // staff member — an unclaimed approval shouldn't sit invisible.
  try {
    let recipients = approverId ? [approverId] : []
    if (!approverId) {
      const { data: inst } = await supabaseAdmin.from("institutions").select("admin_user_id").eq("id", thread.institution_id).single()
      const { data: staff } = await supabaseAdmin
        .from("institution_staff").select("user_id")
        .eq("institution_id", thread.institution_id).eq("status", "active").in("role", PLACEMENT_ROLES)
      recipients = [inst?.admin_user_id, ...(staff || []).map((s) => s.user_id)].filter(Boolean)
    }
    recipients = recipients.filter((id) => id !== req.user.id)
    if (recipients.length > 0) {
      await supabaseAdmin.from("notifications").insert(
        recipients.map((userId) => ({
          user_id: userId, type: "approval_requested", title: "Approval requested",
          body: subject.trim().slice(0, 140), actor_id: req.user.id,
          entity_id: approval.id, entity_type: "chat_approvals", category: "chat",
        }))
      )
    }
  } catch (err) { console.error("[collegeChat] approval notify", err) }

  res.status(200).json({ approval })
})

// ── GET /approvals?institutionId=&status= — approvals inbox ──────────────
router.get("/approvals", requireAuth, async (req, res) => {
  const { institutionId, status } = req.query
  if (!institutionId) return res.status(400).json({ error: "institutionId is required" })
  const access = await getInstitutionAccess(institutionId, req.user.id)
  if (!access) return res.status(403).json({ error: "Requires an active institution staff role" })

  let query = supabaseAdmin.from("chat_approvals").select("*").eq("institution_id", institutionId)
  if (status) query = query.eq("status", status)
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ approvals: data || [] })
})

// ── PATCH /approvals/:id/decide — approve or reject ───────────────────────
// "Placement" tier only — approvals are institution-authoritative decisions
// (e.g. approving a recruiter-facing action), not something a channel-only
// staffer (professor/mentor/dept_head) should be able to grant.
router.patch("/approvals/:id/decide", requireAuth, async (req, res) => {
  const { data: approval } = await supabaseAdmin.from("chat_approvals").select("*").eq("id", req.params.id).maybeSingle()
  if (!approval) return res.status(404).json({ error: "Approval not found" })
  const access = await getInstitutionAccess(approval.institution_id, req.user.id)
  if (access !== "placement") return res.status(403).json({ error: "Requires college_admin or placement_officer role" })
  if (approval.status !== "pending") return res.status(409).json({ error: "Already decided" })

  const { decision } = req.body || {}
  if (!["approved", "rejected"].includes(decision)) return res.status(400).json({ error: "decision must be approved or rejected" })

  const { data: updated, error } = await supabaseAdmin
    .from("chat_approvals")
    .update({ status: decision, decided_by: req.user.id, decided_at: new Date().toISOString(), approver_id: req.user.id })
    .eq("id", approval.id).select().single()
  if (error) return res.status(500).json({ error: error.message })

  try {
    if (approval.requested_by !== req.user.id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: approval.requested_by, type: "approval_decided",
        title: decision === "approved" ? "Approval granted" : "Approval rejected",
        body: approval.subject.slice(0, 140), actor_id: req.user.id,
        entity_id: approval.id, entity_type: "chat_approvals", category: "chat",
      })
    }
  } catch (err) { console.error("[collegeChat] approval-decided notify", err) }

  res.status(200).json({ approval: updated })
})

// ── POST /threads/:threadId/participants — CC someone onto a thread ──────
// Flagged (ENABLE_THREAD_EXPLICIT_PARTICIPANTS) — see the migration header
// and canAccessThread's comment for why this is off by default.
router.post("/threads/:threadId/participants", requireAuth, async (req, res) => {
  if (!EXPLICIT_PARTICIPANTS_ENABLED) return res.status(404).json({ error: "Not available" })
  const { thread, access } = await requireStaffOnThread(req.params.threadId, req.user.id)
  if (!thread) return res.status(404).json({ error: "Thread not found" })
  if (!access) return res.status(403).json({ error: "Requires an active institution staff role" })

  const { userId, roleInThread = "cc" } = req.body || {}
  if (!userId) return res.status(400).json({ error: "userId is required" })
  if (!["owner", "member", "cc", "mentioned"].includes(roleInThread)) return res.status(400).json({ error: "Invalid roleInThread" })

  const { error } = await supabaseAdmin
    .from("thread_participants")
    .upsert({ thread_id: thread.id, user_id: userId, role_in_thread: roleInThread, added_by: req.user.id }, { onConflict: "thread_id,user_id" })
  if (error) return res.status(500).json({ error: error.message })

  try {
    await supabaseAdmin.from("notifications").insert({
      user_id: userId, type: "chat_cc_added", title: "You were added to a conversation",
      body: thread.subject || "Capabilio chat", actor_id: req.user.id,
      entity_id: thread.id, entity_type: "institution_chat_threads", category: "chat",
    })
  } catch (err) { console.error("[collegeChat] cc notify", err) }

  res.status(200).json({ success: true })
})

export default router
