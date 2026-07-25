/**
 * reconciliation.js — Career OS Workstream 4.
 *
 * Importable functions used both by scripts/mentorReconciliation.mjs (CLI,
 * dry-run by default) and, optionally, an admin-triggered API route
 * (mentorMarketplaceAdmin.js). This codebase has no cron/scheduler
 * infrastructure today (checked: no node-cron, no scheduled Render job, no
 * Supabase pg_cron usage anywhere in server/), so auto-completion
 * (refundPolicy.js's isEligibleForAutoCompletion) is implemented as PART OF
 * this reconciliation sweep rather than a separate scheduled task — running
 * `node scripts/mentorReconciliation.mjs --commit` periodically (via
 * whatever external scheduler the ops team already uses for similar jobs)
 * covers both "release stale reservations" and "auto-complete eligible
 * bookings" in one pass. This is a deliberate implementation choice,
 * documented here per the workstream's requirement to state which mechanism
 * was chosen.
 *
 * "Live Razorpay order-status lookup" is STUBBED — checkRazorpayOrderStatus
 * below is an injectable function so tests can mock it; the real
 * implementation (calling razorpay().orders.fetch()/payments.fetch(), same
 * client already used in payments.js) is not wired to a live Razorpay
 * account in this sandbox. This is called out explicitly, not silently
 * skipped.
 */
import { confirmBooking, releaseBooking } from './slotReservation.js'
import { isEligibleForAutoCompletion } from './refundPolicy.js'

/**
 * Default (unimplemented-for-real) Razorpay order-status checker. The real
 * version would call `razorpay().orders.fetch(orderId)` /
 * `razorpay().payments.fetch(paymentId)` (backend/server/lib/razorpay.js,
 * already used by payments.js) and return the actual captured/failed
 * status. Injected as a parameter specifically so this module and its tests
 * do not depend on live Razorpay credentials.
 */
export async function stubCheckRazorpayOrderStatus(/* razorpayOrderId */) {
  throw new Error(
    'stubCheckRazorpayOrderStatus is a stub — no live Razorpay account is available in this environment. ' +
    'Replace with a real razorpay().orders.fetch()/payments.fetch() call before relying on this in production.'
  )
}

/**
 * TRANCHE 3 (2026-07-25): the REAL Razorpay order-status checker, built from
 * an injected Razorpay client (the same `razorpay()` singleton payments.js
 * already uses live in production — so on the deployed server this is fully
 * functional, not a stub). Injected as a factory rather than importing
 * ../razorpay.js directly so this module and its tests still never require
 * live credentials: the admin route passes the real client; tests keep
 * passing fakes. Returns the shape recoverMissedWebhooks expects:
 * { status: 'captured'|'failed'|'pending', paymentId }.
 */
export function makeRazorpayOrderStatusChecker(razorpayClient) {
  return async function checkRazorpayOrderStatus(razorpayOrderId) {
    const payments = await razorpayClient.orders.fetchPayments(razorpayOrderId)
    const items = payments?.items || []
    const captured = items.find(p => p.status === 'captured' || p.status === 'authorized')
    if (captured) return { status: 'captured', paymentId: captured.id }
    // Only report 'failed' when Razorpay shows at least one attempt and ALL
    // attempts failed — an order with no payment attempts at all is
    // 'pending' (ambiguous), which recoverMissedWebhooks flags for admin
    // review instead of releasing the slot out from under a paying user.
    if (items.length > 0 && items.every(p => p.status === 'failed')) {
      return { status: 'failed', paymentId: items[items.length - 1].id }
    }
    return { status: 'pending' }
  }
}

/**
 * Sweep 1: find slots whose reservation has expired with no captured
 * payment, and release them back to 'available'.
 */
export async function releaseStaleReservations(db, { now = new Date(), commit = false } = {}) {
  const { data: staleSlots, error } = await db
    .from('mentor_availability_slots')
    .select('id, mentor_id, reservation_expires_at, slot_status')
    .eq('slot_status', 'reserved')
    .lt('reservation_expires_at', now.toISOString())
  if (error) throw error

  const actions = []
  for (const slot of staleSlots || []) {
    const { data: booking } = await db
      .from('mentor_bookings')
      .select('id, status')
      .eq('slot_id', slot.id)
      .maybeSingle()

    if (!booking || booking.status !== 'pending_payment') {
      actions.push({ slotId: slot.id, skipped: true, reason: 'no_pending_booking' })
      continue
    }

    if (commit) {
      const result = await releaseBooking(db, { bookingId: booking.id, newStatus: 'failed', reason: 'reservation_expired_no_payment' })
      await logAuditEntry(db, { entityType: 'mentor_availability_slot', entityId: slot.id, action: 'reconciliation_released_stale_reservation', note: 'reservation_expires_at passed with no captured payment' })
      actions.push({ slotId: slot.id, bookingId: booking.id, released: result.success })
    } else {
      actions.push({ slotId: slot.id, bookingId: booking.id, wouldRelease: true, dryRun: true })
    }
  }
  return { checked: staleSlots?.length || 0, actions }
}

/**
 * Sweep 2: find pending_payment bookings older than `thresholdMinutes` with
 * no webhook event recorded at all — these are candidates for a "missed
 * webhook" recovery check against the (stubbed) Razorpay order-status API.
 * If the injected checker says the payment WAS actually captured, confirm
 * the booking instead of leaving it to expire/be wrongly released.
 */
export async function recoverMissedWebhooks(db, { now = new Date(), thresholdMinutes = 20, commit = false, checkRazorpayOrderStatus = stubCheckRazorpayOrderStatus } = {}) {
  const cutoff = new Date(now.getTime() - thresholdMinutes * 60000).toISOString()
  const { data: pendingBookings, error } = await db
    .from('mentor_bookings')
    .select('id, slot_id, created_at, status')
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)
  if (error) throw error

  const results = []
  for (const booking of pendingBookings || []) {
    const { data: payment } = await db.from('mentor_payments').select('razorpay_order_id, status').eq('booking_id', booking.id).maybeSingle()
    if (!payment?.razorpay_order_id) {
      results.push({ bookingId: booking.id, skipped: true, reason: 'no_payment_record' })
      continue
    }

    // Has a webhook already resolved this? If mentor_payments.status is
    // already captured/failed, a webhook got through — nothing to recover.
    if (['captured', 'authorized', 'failed'].includes(payment.status)) {
      results.push({ bookingId: booking.id, skipped: true, reason: 'already_resolved_by_webhook' })
      continue
    }

    let liveStatus
    try {
      liveStatus = await checkRazorpayOrderStatus(payment.razorpay_order_id)
    } catch (e) {
      results.push({ bookingId: booking.id, error: e.message, flaggedForAdminReview: true })
      continue
    }

    if (liveStatus?.status === 'captured') {
      if (commit) {
        const confirmed = await confirmBooking(db, { bookingId: booking.id })
        await db.from('mentor_payments').update({ status: 'captured', razorpay_payment_id: liveStatus.paymentId }).eq('booking_id', booking.id)
        await logAuditEntry(db, { entityType: 'mentor_booking', entityId: booking.id, action: 'reconciliation_recovered_missed_webhook', toStatus: 'confirmed', note: 'Razorpay order-status check found a captured payment with no webhook delivery' })
        results.push({ bookingId: booking.id, recovered: true, confirmed: confirmed.success })
      } else {
        results.push({ bookingId: booking.id, wouldRecover: true, dryRun: true })
      }
    } else if (liveStatus?.status === 'failed') {
      if (commit) {
        await releaseBooking(db, { bookingId: booking.id, newStatus: 'failed', reason: 'razorpay_confirms_payment_failed' })
      }
      results.push({ bookingId: booking.id, wouldFail: !commit, failed: commit })
    } else {
      results.push({ bookingId: booking.id, flaggedForAdminReview: true, reason: 'ambiguous_or_pending_live_status', liveStatus })
    }
  }
  return { checked: pendingBookings?.length || 0, results }
}

/**
 * Sweep 3: auto-complete bookings whose scheduled_end passed the
 * auto-completion threshold with no open dispute / no-show report.
 */
export async function autoCompleteEligibleBookings(db, { now = new Date(), commit = false } = {}) {
  const { data: confirmedBookings, error } = await db
    .from('mentor_bookings')
    .select('id, scheduled_end, status')
    .eq('status', 'confirmed')
  if (error) throw error

  const results = []
  for (const booking of confirmedBookings || []) {
    const { data: dispute } = await db.from('mentor_disputes').select('id').eq('booking_id', booking.id).in('status', ['open', 'investigating']).maybeSingle()
    const hasOpenDispute = !!dispute
    const hasNoShowReport = !!booking.no_show_reported_at

    if (!isEligibleForAutoCompletion({ scheduledEnd: booking.scheduled_end, hasOpenDispute, hasNoShowReport, now })) {
      continue
    }

    if (commit) {
      await db.from('mentor_bookings').update({ status: 'completed', completed_at: now.toISOString() }).eq('id', booking.id)
      await logAuditEntry(db, { entityType: 'mentor_booking', entityId: booking.id, action: 'reconciliation_auto_completed', fromStatus: 'confirmed', toStatus: 'completed' })
      results.push({ bookingId: booking.id, completed: true })
    } else {
      results.push({ bookingId: booking.id, wouldComplete: true, dryRun: true })
    }
  }
  return { checked: confirmedBookings?.length || 0, results }
}

async function logAuditEntry(db, { entityType, entityId, action, fromStatus, toStatus, note }) {
  await db.from('mentor_audit_log').insert({
    entity_type: entityType, entity_id: entityId, actor_id: null, action,
    from_status: fromStatus || null, to_status: toStatus || null, note: note || null,
  })
}

/** Runs all three sweeps and returns a combined report. */
export async function runReconciliation(db, { now = new Date(), commit = false, checkRazorpayOrderStatus } = {}) {
  const staleReservations = await releaseStaleReservations(db, { now, commit })
  const missedWebhooks = await recoverMissedWebhooks(db, { now, commit, checkRazorpayOrderStatus })
  const autoCompletions = await autoCompleteEligibleBookings(db, { now, commit })
  return { commit, generatedAt: now.toISOString(), staleReservations, missedWebhooks, autoCompletions }
}
