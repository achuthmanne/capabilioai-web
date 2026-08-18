/**
 * Mentor Marketplace Admin — Career OS Workstream 4.
 *
 * INTERNAL ONLY. Every route requires requireAuth + requireAdmin
 * (backend/server/lib/arena-v2/requireAdmin.js — the existing
 * `profiles.is_admin` gate), matching the discipline in
 * routes/questionBankAdmin.js. Also gated by the same
 * MENTOR_MARKETPLACE_V1_ENABLED backend flag as the user-facing routes.
 *
 *   GET    /admin/mentor/applications              — review queue
 *   POST   /admin/mentor/applications/:id/approve   — creates mentor_profiles row
 *   POST   /admin/mentor/applications/:id/reject
 *   GET    /admin/mentor/disputes                   — open disputes
 *   POST   /admin/mentor/disputes/:id/resolve        — resolves + applies refund/payout adjustment
 *   GET    /admin/mentor/reviews                     — moderation queue (pending)
 *   POST   /admin/mentor/reviews/:id/moderate         — approve/reject
 *   GET    /admin/mentor/review-reports               — open reports
 *   POST   /admin/mentor/review-reports/:id/resolve
 *   POST   /admin/mentor/payouts                      — create an admin-triggered payout BATCH
 *   POST   /admin/mentor/payouts/:id/finalize
 *   POST   /admin/mentor/payouts/:id/mark-paid         — records manual transfer_reference
 *   POST   /admin/mentor/reconciliation/run            — runs the reconciliation sweep (dry-run unless commit:true)
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { requireAdmin } from "../lib/requireAdmin.js"
import { MENTOR_MARKETPLACE_V1_ENABLED } from "./mentorMarketplace.js"
import { createPayoutBatch, finalizePayoutBatch, markPayoutPaid } from "../lib/mentorMarketplace/payouts.js"
import { runReconciliation, makeRazorpayOrderStatusChecker } from "../lib/mentorMarketplace/reconciliation.js"
import { razorpay } from "../lib/razorpay.js"
import { resolveRefundPct } from "../lib/mentorMarketplace/refundPolicy.js"
import { releaseBooking } from "../lib/mentorMarketplace/slotReservation.js"

const router = Router()

function requireFlag(req, res, next) {
  if (!MENTOR_MARKETPLACE_V1_ENABLED) return res.status(403).json({ error: "mentor_marketplace_v1 is disabled" })
  next()
}
router.use(requireFlag, requireAuth, requireAdmin)

async function logAudit({ entityType, entityId, actorId, action, fromStatus, toStatus, note }) {
  await supabaseAdmin.from("mentor_audit_log").insert({
    entity_type: entityType, entity_id: entityId, actor_id: actorId, action,
    from_status: fromStatus || null, to_status: toStatus || null, note: note || null,
  })
}

// ── Applications review queue ─────────────────────────────────────────────
router.get("/applications", async (req, res) => {
  try {
    const { status = "submitted" } = req.query
    const { data, error } = await supabaseAdmin.from("mentor_applications").select("*").eq("status", status).order("created_at", { ascending: false })
    if (error) throw error
    res.json({ applications: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/applications/:id/approve", async (req, res) => {
  try {
    const { data: application, error } = await supabaseAdmin.from("mentor_applications").select("*").eq("id", req.params.id).single()
    if (error) throw error
    if (!["submitted", "in_review"].includes(application.status)) {
      return res.status(400).json({ error: `Cannot approve an application in status '${application.status}'` })
    }

    const { data: profile, error: profErr } = await supabaseAdmin.from("mentor_profiles").insert({
      user_id: application.user_id, application_id: application.id, bio: application.bio,
      expertise_tags: application.expertise_tags, hourly_rate: application.proposed_hourly_rate,
      currency: application.currency, is_active: true,
    }).select().single()
    if (profErr) throw profErr

    const { data: updated, error: updErr } = await supabaseAdmin.from("mentor_applications")
      .update({ status: "approved", reviewer_id: req.user.id, decided_at: new Date().toISOString() })
      .eq("id", req.params.id).select().single()
    if (updErr) throw updErr

    await logAudit({ entityType: "mentor_application", entityId: application.id, actorId: req.user.id, action: "approved", fromStatus: application.status, toStatus: "approved" })
    res.json({ success: true, application: updated, mentorProfile: profile })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/applications/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason?.trim()) return res.status(400).json({ error: "reason is required to reject an application" })
    const { data: application, error } = await supabaseAdmin.from("mentor_applications").select("status").eq("id", req.params.id).single()
    if (error) throw error
    if (!["submitted", "in_review"].includes(application.status)) {
      return res.status(400).json({ error: `Cannot reject an application in status '${application.status}'` })
    }
    const { data, error: updErr } = await supabaseAdmin.from("mentor_applications")
      .update({ status: "rejected", rejection_reason: reason, reviewer_id: req.user.id, decided_at: new Date().toISOString() })
      .eq("id", req.params.id).select().single()
    if (updErr) throw updErr
    await logAudit({ entityType: "mentor_application", entityId: req.params.id, actorId: req.user.id, action: "rejected", fromStatus: application.status, toStatus: "rejected", note: reason })
    res.json({ success: true, application: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Disputes ───────────────────────────────────────────────────────────────
router.get("/disputes", async (req, res) => {
  try {
    const { status = "open" } = req.query
    const { data, error } = await supabaseAdmin.from("mentor_disputes").select("*").eq("status", status).order("created_at", { ascending: false })
    if (error) throw error
    res.json({ disputes: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/disputes/:id/resolve", async (req, res) => {
  try {
    const { resolution, notes } = req.body // resolution: resolved_refund | resolved_partial_refund | resolved_no_refund
    if (!["resolved_refund", "resolved_partial_refund", "resolved_no_refund"].includes(resolution)) {
      return res.status(400).json({ error: "resolution must be resolved_refund, resolved_partial_refund, or resolved_no_refund" })
    }
    const { data: dispute, error } = await supabaseAdmin.from("mentor_disputes").select("*").eq("id", req.params.id).single()
    if (error) throw error
    if (dispute.status === "resolved_refund" || dispute.status === "resolved_partial_refund" || dispute.status === "resolved_no_refund") {
      return res.status(400).json({ error: "Dispute already resolved" })
    }

    const { data: booking } = await supabaseAdmin.from("mentor_bookings").select("*").eq("id", dispute.booking_id).single()
    const refundPct = resolution === "resolved_refund" ? 1.0 : resolution === "resolved_partial_refund" ? 0.5 : 0
    const refundAmount = Math.round(Number(booking.price_amount) * refundPct * 100) / 100

    const { data: updatedDispute, error: dErr } = await supabaseAdmin.from("mentor_disputes")
      .update({ status: resolution, resolved_by_admin_id: req.user.id, resolution_notes: notes || null, resolved_at: new Date().toISOString() })
      .eq("id", req.params.id).select().single()
    if (dErr) throw dErr

    if (refundPct > 0) {
      await supabaseAdmin.from("mentor_bookings").update({ status: "refunded", refund_amount: refundAmount }).eq("id", booking.id)
    }

    await logAudit({ entityType: "mentor_dispute", entityId: dispute.id, actorId: req.user.id, action: "resolved", fromStatus: dispute.status, toStatus: resolution, note: `refund_amount=${refundAmount}` })
    res.json({ success: true, dispute: updatedDispute, refundAmount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── No-show reporting (admin-adjudicated in v1 — either party reports, admin can override) ─
router.post("/bookings/:id/no-show", async (req, res) => {
  try {
    const { reportedRole } = req.body // 'mentee' | 'mentor' — who failed to show
    if (!["mentee", "mentor"].includes(reportedRole)) return res.status(400).json({ error: "reportedRole must be mentee or mentor" })
    const { data: booking, error } = await supabaseAdmin.from("mentor_bookings").select("*").eq("id", req.params.id).single()
    if (error) throw error

    const refundPct = resolveRefundPct({ actor: reportedRole, reason: "no_show" })
    const newStatus = reportedRole === "mentee" ? "no_show_mentee" : "no_show_mentor"
    const released = await releaseBooking(supabaseAdmin, { bookingId: booking.id, newStatus, actorId: req.user.id, reason: `no_show reported: ${reportedRole}` })
    if (!released.success) return res.status(400).json({ error: released.error })

    const refundAmount = Math.round(Number(booking.price_amount) * refundPct * 100) / 100
    await supabaseAdmin.from("mentor_bookings").update({
      no_show_reported_by: req.user.id, no_show_reported_at: new Date().toISOString(), refund_amount: refundAmount,
    }).eq("id", booking.id)

    await logAudit({ entityType: "mentor_booking", entityId: booking.id, actorId: req.user.id, action: "no_show_reported", toStatus: newStatus, note: `refund_amount=${refundAmount}` })
    res.json({ success: true, status: newStatus, refundAmount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Review moderation ──────────────────────────────────────────────────────
router.get("/reviews", async (req, res) => {
  try {
    const { status = "pending" } = req.query
    const { data, error } = await supabaseAdmin.from("mentor_reviews").select("*").eq("moderation_status", status).order("created_at", { ascending: false })
    if (error) throw error
    res.json({ reviews: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/reviews/:id/moderate", async (req, res) => {
  try {
    const { decision } = req.body // 'approved' | 'rejected'
    if (!["approved", "rejected"].includes(decision)) return res.status(400).json({ error: "decision must be approved or rejected" })
    const { data, error } = await supabaseAdmin.from("mentor_reviews")
      .update({ moderation_status: decision, moderated_by: req.user.id, moderated_at: new Date().toISOString() })
      .eq("id", req.params.id).select().single()
    if (error) throw error
    await logAudit({ entityType: "mentor_review", entityId: req.params.id, actorId: req.user.id, action: "moderated", toStatus: decision })
    res.json({ success: true, review: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/review-reports", async (req, res) => {
  try {
    const { status = "open" } = req.query
    const { data, error } = await supabaseAdmin.from("mentor_review_reports").select("*").eq("status", status).order("created_at", { ascending: false })
    if (error) throw error
    res.json({ reports: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/review-reports/:id/resolve", async (req, res) => {
  try {
    const { status, note } = req.body // reviewed | dismissed | actioned
    if (!["reviewed", "dismissed", "actioned"].includes(status)) return res.status(400).json({ error: "status must be reviewed, dismissed, or actioned" })
    const { data, error } = await supabaseAdmin.from("mentor_review_reports")
      .update({ status, resolved_by: req.user.id, resolved_at: new Date().toISOString() })
      .eq("id", req.params.id).select().single()
    if (error) throw error
    if (status === "actioned") {
      await supabaseAdmin.from("mentor_reviews").update({ moderation_status: "pending" }).eq("id", data.review_id)
    }
    await logAudit({ entityType: "mentor_review_report", entityId: req.params.id, actorId: req.user.id, action: "resolved", toStatus: status, note })
    res.json({ success: true, report: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Payout batches (admin-triggered, never automated) ────────────────────
router.post("/payouts", async (req, res) => {
  try {
    const { mentorId, periodStart, periodEnd, platformFeePct } = req.body
    if (!mentorId || !periodStart || !periodEnd) return res.status(400).json({ error: "mentorId, periodStart, periodEnd are required" })
    const result = await createPayoutBatch(supabaseAdmin, { mentorId, periodStart, periodEnd, adminId: req.user.id, platformFeePct })
    if (!result.success) return res.status(400).json({ error: result.error })
    res.status(201).json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/payouts/:id/finalize", async (req, res) => {
  try {
    const result = await finalizePayoutBatch(supabaseAdmin, { payoutId: req.params.id, adminId: req.user.id })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/payouts/:id/mark-paid", async (req, res) => {
  try {
    const { transferReference, taxInvoiceNumber } = req.body
    const result = await markPayoutPaid(supabaseAdmin, { payoutId: req.params.id, adminId: req.user.id, transferReference, taxInvoiceNumber })
    if (!result.success) return res.status(400).json({ error: result.error })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Reconciliation trigger (dry-run unless commit:true) ──────────────────
router.post("/reconciliation/run", async (req, res) => {
  try {
    const commit = req.body?.commit === true
    // TRANCHE 3 (2026-07-25): wire the REAL Razorpay order-status checker
    // (same live client payments.js uses) instead of leaving the default
    // throwing stub in place — before this, every missed-webhook candidate
    // was flagged-for-admin-review with a stub error instead of actually
    // being checked/recovered. Falls back gracefully per-booking: if the
    // Razorpay call errors (bad creds, network), recoverMissedWebhooks
    // already catches per-booking and flags for admin review.
    const result = await runReconciliation(supabaseAdmin, {
      commit,
      checkRazorpayOrderStatus: makeRazorpayOrderStatusChecker(razorpay()),
    })
    await logAudit({ entityType: "mentor_reconciliation", entityId: null, actorId: req.user.id, action: commit ? "reconciliation_committed" : "reconciliation_dry_run", note: JSON.stringify({ staleReleased: result.staleReservations.actions.length, missedWebhooksChecked: result.missedWebhooks.checked, autoCompletions: result.autoCompletions.results.length }) })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
