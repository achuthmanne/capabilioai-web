/**
 * routes/execIntros.js — Executive Path warm-introduction requests
 *
 * Real replacement for the ExecutiveNetwork.jsx "Introductions" tab, which
 * previously rendered an honest EmptyState explaining that no dedicated
 * table existed yet. This is that table + the routes on top of it.
 *
 * Distinct from the existing `connections` system (pulseNexus.js
 * /nexus/connect, already real, powers Peer Circles + ExecutiveHome's
 * pending-requests card): a `connections` row is a generic "let's connect"
 * ask with no stated purpose. An `exec_intro_requests` row always carries an
 * explicit `reason` (funding/mentorship/partnership/hiring/customer/other)
 * and a message — the founder-networking equivalent of "what's this about"
 * being answered before the recipient has to decide whether to engage.
 *
 * Routes:
 *   POST  /api/exec/intro-requests            — send a request
 *   GET   /api/exec/intro-requests?direction=incoming|outgoing  — list mine
 *   PATCH /api/exec/intro-requests/:id        — accept/decline (target only)
 *
 * Server-side enforcement (not just UI):
 *   - requireAuth on every route — req.user.id is always the true actor,
 *     never a client-supplied id (repo-wide convention, see other routes).
 *   - Only the target of a request may accept/decline it (403 otherwise).
 *   - Self-requests rejected (also enforced at the DB level via CHECK
 *     constraint exec_intro_requests_no_self, so this isn't UI-only either).
 *   - Expired requests (past expires_at, still 'pending') are lazily
 *     flipped to 'expired' on read rather than requiring a cron job —
 *     keeps this slice self-contained with no new scheduled-task dependency.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"

const router = Router()

const VALID_REASONS = ["funding", "mentorship", "partnership", "hiring", "customer", "other"]

const PROFILE_FIELDS = "id,display_name,name,current_role_title,current_company,headline,verification_state,path,profile_photo_url"

// Lazily expire any pending rows past their expires_at for a given user,
// so GET always reflects reality without needing a background job.
async function expireStaleRequests(userId) {
  await supabaseAdmin
    .from("exec_intro_requests")
    .update({ status: "expired" })
    .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString())
    .then(() => {})
    .catch(() => {}) // best-effort — a failed expiry sweep shouldn't break the read
}

router.post("/exec/intro-requests", requireAuth, async (req, res) => {
  try {
    const { target_id, reason, message } = req.body
    if (!target_id) return res.status(400).json({ error: "target_id is required" })
    if (target_id === req.user.id) return res.status(400).json({ error: "Cannot request an introduction to yourself" })
    if (!VALID_REASONS.includes(reason)) return res.status(400).json({ error: `reason must be one of: ${VALID_REASONS.join(", ")}` })
    if (!message?.trim()) return res.status(400).json({ error: "message is required" })
    if (message.length > 500) return res.status(400).json({ error: "message must be 500 characters or fewer" })

    const { data: target } = await supabaseAdmin.from("profiles").select("id").eq("id", target_id).single()
    if (!target) return res.status(404).json({ error: "Target profile not found" })

    const { data, error } = await supabaseAdmin
      .from("exec_intro_requests")
      .insert({
        requester_id: req.user.id,
        target_id,
        reason,
        message: message.trim(),
      })
      .select(`*, requester:requester_id(${PROFILE_FIELDS}), target:target_id(${PROFILE_FIELDS})`)
      .single()
    if (error) throw error

    await supabaseAdmin.from("notifications").insert({
      user_id:        target_id,
      type:           "exec_intro_request",
      title:          "Introduction Request",
      body:           `${data.requester?.display_name || data.requester?.name || "Someone"} wants an introduction — ${reason}`,
      actor_id:       req.user.id,
      reference_id:   data.id,
      reference_type: "exec_intro_request",
    }).catch(() => {})

    res.json({ success: true, request: data })
  } catch (e) {
    console.error("[execIntros] POST /exec/intro-requests", e)
    res.status(500).json({ error: e.message })
  }
})

router.get("/exec/intro-requests", requireAuth, async (req, res) => {
  try {
    const direction = req.query.direction === "outgoing" ? "outgoing" : "incoming"
    await expireStaleRequests(req.user.id)

    let q = supabaseAdmin
      .from("exec_intro_requests")
      .select(`*, requester:requester_id(${PROFILE_FIELDS}), target:target_id(${PROFILE_FIELDS})`)
      .order("created_at", { ascending: false })

    q = direction === "outgoing" ? q.eq("requester_id", req.user.id) : q.eq("target_id", req.user.id)

    const { data, error } = await q
    if (error) throw error
    res.json({ requests: data || [], direction })
  } catch (e) {
    console.error("[execIntros] GET /exec/intro-requests", e)
    res.status(500).json({ error: e.message })
  }
})

router.patch("/exec/intro-requests/:id", requireAuth, async (req, res) => {
  try {
    const { status } = req.body
    if (!["accepted", "declined"].includes(status)) return res.status(400).json({ error: "status must be 'accepted' or 'declined'" })

    const { data: reqRow } = await supabaseAdmin.from("exec_intro_requests").select("id,target_id,requester_id,status").eq("id", req.params.id).single()
    if (!reqRow) return res.status(404).json({ error: "Request not found" })
    if (reqRow.target_id !== req.user.id) return res.status(403).json({ error: "Only the recipient can respond to this request" })
    if (reqRow.status !== "pending") return res.status(409).json({ error: `Request already ${reqRow.status}` })

    const { data, error } = await supabaseAdmin
      .from("exec_intro_requests")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select(`*, requester:requester_id(${PROFILE_FIELDS}), target:target_id(${PROFILE_FIELDS})`)
      .single()
    if (error) throw error

    if (status === "accepted") {
      await supabaseAdmin.from("notifications").insert({
        user_id:        reqRow.requester_id,
        type:           "exec_intro_accepted",
        title:          "Introduction Accepted",
        body:           `${data.target?.display_name || data.target?.name || "Someone"} accepted your introduction request`,
        actor_id:       req.user.id,
        reference_id:   data.id,
        reference_type: "exec_intro_request",
      }).catch(() => {})
    }

    res.json({ success: true, request: data })
  } catch (e) {
    console.error("[execIntros] PATCH /exec/intro-requests/:id", e)
    res.status(500).json({ error: e.message })
  }
})

export default router
