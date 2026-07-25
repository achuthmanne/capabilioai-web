/**
 * webhook.js — Career OS Workstream 4, Razorpay webhook handling.
 *
 * Signature verification here is a COMPLETELY SEPARATE code path from the
 * existing checkout signature check in backend/server/routes/payments.js:
 *   - Checkout (payments.js):  HMAC-SHA256(order_id + '|' + payment_id, RAZORPAY_KEY_SECRET)
 *   - Webhook (this file):     HMAC-SHA256(raw_request_body,             RAZORPAY_WEBHOOK_SECRET)
 * Different inputs, different secret, different construction — do not merge
 * these two checks. The webhook secret is configured separately in the
 * Razorpay dashboard (Settings -> Webhooks) from the API key/secret pair.
 *
 * verifyWebhookSignature() takes the RAW request body string (not the
 * parsed JSON) because HMAC verification must run over the exact bytes
 * Razorpay signed — re-serializing parsed JSON can produce different bytes
 * (key order, whitespace) and silently break verification. server.js must
 * mount this route with express.raw({ type: 'application/json' }) BEFORE
 * the global express.json() parser touches it.
 */
import crypto from 'crypto'
import { confirmBooking, releaseBooking } from './slotReservation.js'

/**
 * @param {string} rawBody - the exact raw request body bytes (as a string or Buffer)
 * @param {string} signatureHeader - the `x-razorpay-signature` header value
 * @param {string} secret - RAZORPAY_WEBHOOK_SECRET
 */
export function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  // Use timing-safe comparison; both buffers must be equal length for timingSafeEqual.
  const expectedBuf = Buffer.from(expected, 'utf8')
  const givenBuf = Buffer.from(String(signatureHeader), 'utf8')
  if (expectedBuf.length !== givenBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, givenBuf)
}

/**
 * Processes one webhook delivery end-to-end:
 *  1. Verify signature (reject before trusting any event data).
 *  2. Dedupe via x-razorpay-event-id (UNIQUE constraint is the real guard;
 *     this function also short-circuits on a re-delivery it already knows about).
 *  3. Apply the booking/payment/slot state transition for the event type.
 *  4. Log the event + processing result — all in one logical transaction
 *     from the caller's perspective (see note below on atomicity).
 *
 * ATOMICITY NOTE: true single-DB-transaction atomicity across the
 * mentor_payment_webhook_events insert + mentor_payments/mentor_bookings/
 * mentor_availability_slots updates would require another SECURITY DEFINER
 * plpgsql function (same reasoning as slotReservation.js). This module
 * performs the event-dedup insert FIRST with the UNIQUE(razorpay_event_id)
 * constraint as the actual concurrency guard (a second simultaneous
 * delivery of the same event_id fails the insert with a unique_violation
 * and is treated as a safe no-op), then calls the existing
 * mentor_confirm_booking/mentor_release_booking RPCs (which are themselves
 * single-transaction) for the booking-side state change. This is safe under
 * duplicate delivery because the dedup insert is the atomic gate — a
 * redelivered event can never get past step 2 a second time.
 *
 * TRANCHE 8 PRODUCTION-SAFETY FIX (2026-07-25): the dedup insert above
 * originally treated ANY existing row for an event_id as "already fully
 * processed" and short-circuited before ever calling confirmBooking/
 * releaseBooking. That's wrong for the specific case where a prior delivery
 * got as far as recording the event (`processing_result: 'received'`) and
 * then the process crashed/errored before the booking-state RPC ran — the
 * row exists, so redelivery was silently swallowed as a "duplicate", and
 * the booking was left stranded in pending_payment forever (no cron/
 * scheduler exists in this codebase to catch it later — see
 * reconciliation.js). Fixed by only treating an existing row as a true
 * duplicate when its processing_result is a TERMINAL outcome (see
 * isTerminalResult below); a row still sitting at 'received' (or a prior
 * RPC-call failure) is retried. This is safe to retry because
 * confirmBooking/releaseBooking's underlying RPCs gate on
 * status='pending_payment' under FOR UPDATE — calling them again on an
 * already-confirmed booking is already a proven no-op (see slotReservation.js).
 */
function isTerminalResult(result) {
  if (!result) return false
  return result.startsWith('booking_')
    || result === 'refund_acknowledged'
    || result === 'no_matching_booking'
    || result.startsWith('unhandled_event_type')
}
export async function processWebhookEvent(db, { eventId, eventType, payload, rawBody, signatureHeader, webhookSecret }) {
  const signatureValid = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret)

  if (!signatureValid) {
    // Still record the attempt for audit purposes, but never act on the data.
    await recordWebhookEvent(db, { eventId, eventType, payload, signatureValid: false, processingResult: 'rejected_invalid_signature' })
    return { accepted: false, httpStatus: 400, reason: 'invalid_signature' }
  }

  if (!eventId) {
    await recordWebhookEvent(db, { eventId: null, eventType, payload, signatureValid: true, processingResult: 'rejected_missing_event_id' })
    return { accepted: false, httpStatus: 400, reason: 'missing_event_id' }
  }

  const dedupe = await recordWebhookEvent(db, { eventId, eventType, payload, signatureValid: true, processingResult: 'received' })
  if (dedupe.duplicate) {
    // Genuine duplicate — the prior delivery already reached a terminal
    // outcome (booking confirmed/failed/etc). Safe no-op, 200 so Razorpay
    // stops retrying.
    return { accepted: true, httpStatus: 200, duplicate: true }
  }
  // dedupe.retry === true means a row for this event_id already existed but
  // was left at a non-terminal state by a prior crashed/failed attempt —
  // fall through and actually process it (see TRANCHE 8 fix note above).

  const bookingId = payload?.payload?.payment?.entity?.notes?.mentor_booking_id
    || payload?.payload?.order?.entity?.notes?.mentor_booking_id
    || null

  let processingResult = 'no_matching_booking'
  if (bookingId) {
    if (eventType === 'payment.captured') {
      const result = await confirmBooking(db, { bookingId, actorId: null })
      processingResult = result.success ? 'booking_confirmed' : `confirm_failed:${result.error}`
    } else if (eventType === 'payment.failed') {
      const result = await releaseBooking(db, { bookingId, newStatus: 'failed', reason: 'payment_failed_webhook' })
      processingResult = result.success ? 'booking_marked_failed' : `release_failed:${result.error}`
    } else if (eventType === 'refund.processed') {
      processingResult = 'refund_acknowledged' // refund ledger update handled by dispute/cancellation flow that initiated it
    } else {
      processingResult = `unhandled_event_type:${eventType}`
    }
  }

  await updateWebhookProcessingResult(db, eventId, processingResult)
  return { accepted: true, httpStatus: 200, processingResult }
}

async function recordWebhookEvent(db, { eventId, eventType, payload, signatureValid, processingResult }) {
  if (!eventId) {
    await db.from('mentor_payment_webhook_events').insert({
      razorpay_event_id: `invalid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      event_type: eventType || null,
      payload: payload || {},
      signature_valid: signatureValid,
      processing_result: processingResult,
    })
    return { duplicate: false }
  }

  // Try to fetch first — if it exists, this is a redelivery. Bump seen_count
  // either way. Only short-circuit as a true duplicate if the prior attempt
  // reached a terminal outcome; otherwise this is a crash-recovery retry —
  // let the caller actually run the booking-state transition again (see
  // TRANCHE 8 fix note above isTerminalResult for why that's safe).
  const { data: existing } = await db.from('mentor_payment_webhook_events').select('*').eq('razorpay_event_id', eventId).maybeSingle()
  if (existing) {
    await db.from('mentor_payment_webhook_events')
      .update({ seen_count: (existing.seen_count || 1) + 1, last_seen_at: new Date().toISOString() })
      .eq('razorpay_event_id', eventId)
    if (isTerminalResult(existing.processing_result)) {
      return { duplicate: true }
    }
    return { duplicate: false, retry: true }
  }

  const { error } = await db.from('mentor_payment_webhook_events').insert({
    razorpay_event_id: eventId,
    event_type: eventType || null,
    payload: payload || {},
    signature_valid: signatureValid,
    processing_result: processingResult,
  })
  if (error) {
    // Unique violation racing with a concurrent delivery of the same event_id.
    if (String(error.message || '').includes('duplicate key') || String(error.code) === '23505') {
      return { duplicate: true }
    }
    throw error
  }
  return { duplicate: false }
}

async function updateWebhookProcessingResult(db, eventId, processingResult) {
  await db.from('mentor_payment_webhook_events').update({ processing_result: processingResult }).eq('razorpay_event_id', eventId)
}
