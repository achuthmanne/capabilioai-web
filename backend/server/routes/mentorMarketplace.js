/**
 * Mentor Marketplace — Career OS Workstream 4 (v2 design, real implementation).
 *
 * User-facing routes, mounted at /api/pro/v1/mentor in server.js. Every
 * route is gated by MENTOR_MARKETPLACE_V1_ENABLED (backend flag, same
 * pattern as routes/skillPulseV2.js's V2_FLAG_ENABLED) — while off, every
 * route in this file 403s regardless of auth/admin state, so the API
 * surface is unreachable even if called directly.
 *
 * POST endpoints that mutate state (booking creation, checkout, cancel,
 * review submission) require an `Idempotency-Key` header, enforced via
 * backend/server/lib/mentorMarketplace/idempotency.js.
 *
 *   POST   /application                  — submit a mentor application
 *   GET    /mentors                      — browse active mentor profiles
 *   GET    /mentors/:mentorId/slots      — browse a mentor's available slots
 *   POST   /bookings                     — reserve a slot (pending_payment, short hold)
 *   POST   /bookings/:id/checkout        — create a Razorpay order for a reserved booking
 *   POST   /bookings/:id/cancel          — mentee/mentor-initiated cancellation (refund tier applied)
 *   GET    /bookings                     — list the caller's own bookings (mentee or mentor side)
 *   POST   /reviews                      — submit a review for a completed booking
 *   POST   /reviews/:id/report           — flag an existing (likely approved) review for re-review
 *   GET    /mentors/:mentorId/reviews    — public: approved reviews only, mentee first-name+initial only
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { razorpay, PLAN_PRICES } from "../lib/razorpay.js"
import { checkIdempotencyKey, recordIdempotentResponse, hashRequestBody } from "../lib/mentorMarketplace/idempotency.js"
import { reserveSlot, releaseBooking } from "../lib/mentorMarketplace/slotReservation.js"
import { resolveRefundPct, isWithinDisputeWindow, isWithinNoShowReportingWindow, MENTOR_MARKETPLACE_POLICY } from "../lib/mentorMarketplace/refundPolicy.js"

const router = Router()

// Backend release gate — mirrors skillPulseV2.js's V2_FLAG_ENABLED pattern.
// Default false. Flip via env, never by editing this constant in a hotfix.
export const MENTOR_MARKETPLACE_V1_ENABLED =
  process.env.MENTOR_MARKETPLACE_V1 === "true" || process.env.VITE_FF_MENTOR_MARKETPLACE_V1 === "true"

function requireFlag(req, res, next) {
  if (!MENTOR_MARKETPLACE_V1_ENABLED) {
    return res.status(403).json({ error: "mentor_marketplace_v1 is disabled" })
  }
  next()
}

router.use(requireFlag, requireAuth)

// ── Idempotency middleware factory — wraps a mutation handler ───────────────
function withIdempotency(endpoint, handler) {
  return async (req, res) => {
    const idempotencyKey = req.headers["idempotency-key"]
    if (!idempotencyKey) return res.status(400).json({ error: "Idempotency-Key header is required" })

    try {
      const check = await checkIdempotencyKey(supabaseAdmin, {
        idempotencyKey, userId: req.user.id, endpoint, requestBody: req.body,
      })
      if (check.conflict) {
        return res.status(409).json({ error: "Idempotency-Key reused with a different request" })
      }
      if (check.replay) {
        return res.status(check.status).json(check.payload)
      }

      const requestHash = check.requestHash || hashRequestBody(req.body)
      const result = await handler(req)
      await recordIdempotentResponse(supabaseAdmin, {
        idempotencyKey, userId: req.user.id, endpoint, requestHash,
        status: result.status, payload: result.body,
      })
      return res.status(result.status).json(result.body)
    } catch (e) {
      console.error(`[mentorMarketplace:${endpoint}]`, e.message)
      return res.status(500).json({ error: e.message })
    }
  }
}

// ── Application submission ───────────────────────────────────────────────
router.post("/application", withIdempotency("/pro/v1/mentor/application", async (req) => {
  const { bio, expertise_tags, proposed_hourly_rate, currency } = req.body
  const { data, error } = await supabaseAdmin.from("mentor_applications").insert({
    user_id: req.user.id, bio, expertise_tags: expertise_tags || [],
    proposed_hourly_rate, currency: currency || "INR", status: "submitted",
  }).select().single()
  if (error) throw error
  return { status: 201, body: { success: true, application: data } }
}))

// ── Browse mentors ────────────────────────────────────────────────────────
router.get("/mentors", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("mentor_profiles")
      .select("id, bio, expertise_tags, hourly_rate, currency, timezone")
      .eq("is_active", true).eq("is_suspended", false)
    if (error) throw error
    res.json({ mentors: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Browse a mentor's available slots ────────────────────────────────────
router.get("/mentors/:mentorId/slots", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("mentor_availability_slots")
      .select("id, start_at, end_at, slot_status")
      .eq("mentor_id", req.params.mentorId)
      .eq("slot_status", "available")
      .order("start_at", { ascending: true })
    if (error) throw error
    res.json({ slots: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Reserve a slot (short hold, pending_payment) ─────────────────────────
router.post("/bookings", withIdempotency("/pro/v1/mentor/bookings", async (req) => {
  const { mentorId, slotId } = req.body
  if (!mentorId || !slotId) {
    return { status: 400, body: { error: "mentorId and slotId are required" } }
  }

  const { data: slot, error: slotErr } = await supabaseAdmin
    .from("mentor_availability_slots").select("*").eq("id", slotId).eq("mentor_id", mentorId).maybeSingle()
  if (slotErr) throw slotErr
  if (!slot) return { status: 404, body: { error: "slot_not_found" } }

  const { data: mentor, error: mentorErr } = await supabaseAdmin
    .from("mentor_profiles").select("hourly_rate, currency").eq("id", mentorId).maybeSingle()
  if (mentorErr) throw mentorErr
  if (!mentor) return { status: 404, body: { error: "mentor_not_found" } }

  const result = await reserveSlot(supabaseAdmin, {
    slotId, mentorId, menteeId: req.user.id,
    scheduledStart: slot.start_at, scheduledEnd: slot.end_at,
    priceAmount: mentor.hourly_rate, currency: mentor.currency,
    holdMinutes: MENTOR_MARKETPLACE_POLICY.reservation.holdMinutes,
  })

  if (!result.success) return { status: result.httpStatus, body: { error: result.error } }
  return { status: 201, body: { success: true, bookingId: result.bookingId, holdMinutes: MENTOR_MARKETPLACE_POLICY.reservation.holdMinutes } }
}))

// ── Create Razorpay order for a reserved booking ─────────────────────────
router.post("/bookings/:id/checkout", withIdempotency("/pro/v1/mentor/bookings/checkout", async (req) => {
  const { data: booking, error } = await supabaseAdmin.from("mentor_bookings").select("*").eq("id", req.params.id).maybeSingle()
  if (error) throw error
  if (!booking) return { status: 404, body: { error: "booking_not_found" } }
  if (booking.mentee_id !== req.user.id) return { status: 403, body: { error: "not_your_booking" } }
  if (booking.status !== "pending_payment") return { status: 400, body: { error: `Cannot checkout a booking in status '${booking.status}'` } }

  const amountPaise = Math.round(Number(booking.price_amount) * 100)
  const order = await razorpay().orders.create({
    amount: amountPaise, currency: booking.currency,
    receipt: `mentor_${booking.id.slice(0, 8)}_${Date.now()}`,
    notes: { mentor_booking_id: booking.id, mentee_id: req.user.id },
  })

  const { error: payErr } = await supabaseAdmin.from("mentor_payments").insert({
    booking_id: booking.id, razorpay_order_id: order.id, amount: booking.price_amount, currency: booking.currency, status: "created",
  })
  if (payErr) throw payErr

  return { status: 201, body: { orderId: order.id, amount: order.amount, currency: order.currency } }
}))

// ── Cancel a booking (mentee or mentor side) ─────────────────────────────
router.post("/bookings/:id/cancel", withIdempotency("/pro/v1/mentor/bookings/cancel", async (req) => {
  const { data: booking, error } = await supabaseAdmin.from("mentor_bookings").select("*").eq("id", req.params.id).maybeSingle()
  if (error) throw error
  if (!booking) return { status: 404, body: { error: "booking_not_found" } }

  const { data: mentorProfile } = await supabaseAdmin.from("mentor_profiles").select("id, user_id").eq("id", booking.mentor_id).maybeSingle()
  const isMentee = booking.mentee_id === req.user.id
  const isMentor = mentorProfile?.user_id === req.user.id
  if (!isMentee && !isMentor) return { status: 403, body: { error: "not_a_party_to_this_booking" } }
  if (!["pending_payment", "confirmed"].includes(booking.status)) {
    return { status: 400, body: { error: `Cannot cancel a booking in status '${booking.status}'` } }
  }

  const hoursUntilStart = (new Date(booking.scheduled_start).getTime() - Date.now()) / 3600000
  const actor = isMentor ? "mentor" : "mentee"
  const refundPct = resolveRefundPct({ actor, reason: "cancellation", hoursUntilStart })
  const newStatus = isMentor ? "cancelled_by_mentor" : "cancelled_by_mentee"

  const released = await releaseBooking(supabaseAdmin, { bookingId: booking.id, newStatus, actorId: req.user.id, reason: req.body?.reason || null })
  if (!released.success) return { status: 400, body: { error: released.error } }

  const refundAmount = Math.round(Number(booking.price_amount) * refundPct * 100) / 100
  await supabaseAdmin.from("mentor_bookings").update({ refund_amount: refundAmount }).eq("id", booking.id)

  // Actual Razorpay refund call (if a payment was captured) is intentionally
  // NOT issued here in this pass — refunding a real captured payment
  // requires a live Razorpay account this sandbox does not have. The
  // refund_amount is computed and recorded now so an admin/ops process can
  // issue it via the Razorpay dashboard/API using this exact number.
  return { status: 200, body: { success: true, status: newStatus, refundPct, refundAmount } }
}))

// ── List own bookings ──────────────────────────────────────────────────────
router.get("/bookings", async (req, res) => {
  try {
    const { data: asMentee, error: e1 } = await supabaseAdmin.from("mentor_bookings").select("*").eq("mentee_id", req.user.id)
    if (e1) throw e1
    const { data: mentorProfile } = await supabaseAdmin.from("mentor_profiles").select("id").eq("user_id", req.user.id).maybeSingle()
    let asMentor = []
    if (mentorProfile) {
      const { data, error: e2 } = await supabaseAdmin.from("mentor_bookings").select("*").eq("mentor_id", mentorProfile.id)
      if (e2) throw e2
      asMentor = data
    }
    res.json({ asMentee, asMentor })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Submit a review (mentee only, only after booking is completed) ──────
router.post("/reviews", withIdempotency("/pro/v1/mentor/reviews", async (req) => {
  const { bookingId, rating, comment } = req.body
  if (!Number.isInteger(rating) || rating < MENTOR_MARKETPLACE_POLICY.review.ratingMin || rating > MENTOR_MARKETPLACE_POLICY.review.ratingMax) {
    return { status: 400, body: { error: `rating must be an integer ${MENTOR_MARKETPLACE_POLICY.review.ratingMin}-${MENTOR_MARKETPLACE_POLICY.review.ratingMax}` } }
  }
  const { data: booking, error } = await supabaseAdmin.from("mentor_bookings").select("*").eq("id", bookingId).maybeSingle()
  if (error) throw error
  if (!booking) return { status: 404, body: { error: "booking_not_found" } }
  if (booking.mentee_id !== req.user.id) return { status: 403, body: { error: "not_your_booking" } }
  if (booking.status !== "completed") return { status: 400, body: { error: "Booking must be completed before it can be reviewed" } }

  // Real DB-level uniqueness (mentor_reviews.booking_id UNIQUE) is the hard
  // guarantee — this insert will fail with a unique_violation on a second attempt.
  const { data, error: insertErr } = await supabaseAdmin.from("mentor_reviews").insert({
    booking_id: bookingId, mentee_id: req.user.id, mentor_id: booking.mentor_id,
    rating, comment: comment || null, moderation_status: "pending",
  }).select().single()
  if (insertErr) {
    if (String(insertErr.message || "").includes("mentor_reviews_booking_id_key") || String(insertErr.code) === "23505") {
      return { status: 409, body: { error: "A review already exists for this booking" } }
    }
    throw insertErr
  }
  return { status: 201, body: { success: true, review: data } }
}))

// ── Report an existing review ────────────────────────────────────────────
router.post("/reviews/:id/report", withIdempotency("/pro/v1/mentor/reviews/report", async (req) => {
  const { reason } = req.body
  if (!reason?.trim()) return { status: 400, body: { error: "reason is required" } }
  const { data, error } = await supabaseAdmin.from("mentor_review_reports").insert({
    review_id: req.params.id, reported_by: req.user.id, reason,
  }).select().single()
  if (error) throw error
  return { status: 201, body: { success: true, report: data } }
}))

// ── Public: approved reviews for a mentor, mentee shown as first name + last initial ──
router.get("/mentors/:mentorId/reviews", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("mentor_reviews")
      .select("id, rating, comment, created_at, mentee_id")
      .eq("mentor_id", req.params.mentorId)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
    if (error) throw error

    const menteeIds = [...new Set((data || []).map(r => r.mentee_id))]
    let namesById = {}
    if (menteeIds.length) {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", menteeIds)
      namesById = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]))
    }

    const reviews = (data || []).map(r => {
      const fullName = namesById[r.mentee_id] || ""
      const [first, ...rest] = fullName.trim().split(/\s+/)
      const lastInitial = rest.length ? `${rest[rest.length - 1][0]}.` : ""
      return {
        id: r.id, rating: r.rating, comment: r.comment, created_at: r.created_at,
        reviewerDisplayName: first ? `${first} ${lastInitial}`.trim() : "Anonymous",
      }
    })
    res.json({ reviews })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
