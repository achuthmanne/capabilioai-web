/**
 * refundPolicy.js — Career OS Workstream 4, server-owned v1 policy config.
 *
 * Single exported config object so every refund/no-show/dispute/review/
 * auto-completion number lives in one auditable place instead of scattered
 * magic numbers across routes. Mirrors the discipline of
 * `questionBankGate.js` (Workstream 3) — pure functions, no I/O, easy to
 * unit test in isolation.
 *
 * Auto-completion is triggered by the reconciliation job
 * (`reconciliation.js`), not a separate cron — see that file's header for
 * why (this codebase has no cron/scheduler infra today; the reconciliation
 * job is already meant to run periodically, so auto-completion piggybacks
 * on that same sweep rather than inventing a second scheduled task).
 */

export const MENTOR_MARKETPLACE_POLICY = Object.freeze({
  cancellation: Object.freeze({
    // Mentee-initiated cancellation, tiered by time-to-scheduled_start.
    fullRefundHoursBefore: 24,   // >24h before scheduled_start: full refund
    partialRefundHoursBefore: 6, // 6-24h before: 50% refund
    partialRefundPct: 0.5,
    // <6h before: no refund (fallthrough, no explicit constant needed)
  }),
  mentorInitiated: Object.freeze({
    // Mentor-initiated cancellation OR mentor no-show: full refund to mentee.
    refundPct: 1.0,
  }),
  noShow: Object.freeze({
    // Mentee no-show: no refund to mentee, mentor stays payout-eligible.
    menteeNoShowRefundPct: 0,
    menteeNoShowMentorPayoutEligible: true,
    // Mentor no-show: full refund to mentee.
    mentorNoShowRefundPct: 1.0,
    // Window after scheduled_end during which a no-show can be reported.
    reportingWindowHours: 48,
  }),
  dispute: Object.freeze({
    // Window after scheduled_end during which a dispute can be raised.
    windowDays: 7,
  }),
  review: Object.freeze({
    // Exactly one mentee review per completed booking — enforced by the
    // UNIQUE(booking_id) constraint on mentor_reviews AND checked here.
    oneReviewPerBooking: true,
    ratingMin: 1,
    ratingMax: 5,
    // Mentors cannot review mentees in v1 — no reciprocal review path exists
    // anywhere in this codebase; this constant exists purely to document the
    // decision, not to gate any code path (there is none to gate).
    reciprocalMentorReviewsAllowed: false,
  }),
  autoCompletion: Object.freeze({
    // A booking auto-transitions to 'completed' this many hours after
    // scheduled_end, IF no dispute has been raised and no no-show has been
    // reported in that window. Implemented in reconciliation.js, run via
    // scripts/mentorReconciliation.mjs (dry-run by default) — not a cron.
    hoursAfterScheduledEnd: 24,
  }),
  payout: Object.freeze({
    // Configurable platform fee percentage (matches mentor_payouts.platform_fee_pct default).
    defaultPlatformFeePct: 0.15,
    // Bookings in these statuses are NEVER payout-eligible.
    excludedStatuses: Object.freeze(['failed', 'refunded', 'disputed', 'cancelled_by_mentee', 'cancelled_by_mentor']),
    // A booking on hold (open dispute) is excluded until resolved — checked
    // separately via mentor_disputes, not a booking.status value alone.
  }),
  reservation: Object.freeze({
    // Short checkout hold — not a permanent booking.
    holdMinutes: 15,
  }),
})

/**
 * Compute the mentee-side refund percentage for a mentee-initiated
 * cancellation, given hours-until-scheduled_start.
 */
export function menteeCancellationRefundPct(hoursUntilStart) {
  const p = MENTOR_MARKETPLACE_POLICY.cancellation
  if (hoursUntilStart > p.fullRefundHoursBefore) return 1.0
  if (hoursUntilStart >= p.partialRefundHoursBefore) return p.partialRefundPct
  return 0
}

/**
 * Resolve the refund percentage for any cancellation/no-show scenario.
 * `actor` is 'mentee' | 'mentor'; `reason` is 'cancellation' | 'no_show'.
 */
export function resolveRefundPct({ actor, reason, hoursUntilStart }) {
  if (reason === 'no_show') {
    if (actor === 'mentee') return MENTOR_MARKETPLACE_POLICY.noShow.menteeNoShowRefundPct
    if (actor === 'mentor') return MENTOR_MARKETPLACE_POLICY.noShow.mentorNoShowRefundPct
    throw new Error(`Unknown no-show actor: ${actor}`)
  }
  if (reason === 'cancellation') {
    if (actor === 'mentor') return MENTOR_MARKETPLACE_POLICY.mentorInitiated.refundPct
    if (actor === 'mentee') return menteeCancellationRefundPct(hoursUntilStart)
    throw new Error(`Unknown cancellation actor: ${actor}`)
  }
  throw new Error(`Unknown cancellation reason: ${reason}`)
}

export function isWithinNoShowReportingWindow(scheduledEnd, now = new Date()) {
  const windowMs = MENTOR_MARKETPLACE_POLICY.noShow.reportingWindowHours * 3600 * 1000
  return now.getTime() - new Date(scheduledEnd).getTime() <= windowMs
}

export function isWithinDisputeWindow(scheduledEnd, now = new Date()) {
  const windowMs = MENTOR_MARKETPLACE_POLICY.dispute.windowDays * 24 * 3600 * 1000
  return now.getTime() - new Date(scheduledEnd).getTime() <= windowMs
}

/**
 * Whether a booking is eligible to auto-complete right now (no dispute open,
 * no no-show reported, and enough time has passed since scheduled_end).
 */
export function isEligibleForAutoCompletion({ scheduledEnd, hasOpenDispute, hasNoShowReport, now = new Date() }) {
  if (hasOpenDispute || hasNoShowReport) return false
  const thresholdMs = MENTOR_MARKETPLACE_POLICY.autoCompletion.hoursAfterScheduledEnd * 3600 * 1000
  return now.getTime() - new Date(scheduledEnd).getTime() >= thresholdMs
}

/** Whether a booking status is payout-eligible per policy. */
export function isBookingPayoutEligible(bookingStatus) {
  return !MENTOR_MARKETPLACE_POLICY.payout.excludedStatuses.includes(bookingStatus)
}
