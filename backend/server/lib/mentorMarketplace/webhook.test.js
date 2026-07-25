import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import { verifyWebhookSignature, processWebhookEvent } from './webhook.js'

/**
 * SCOPE NOTE (read before trusting these results): these are SIGNATURE-
 * VERIFICATION UNIT TESTS using a fake RAZORPAY_WEBHOOK_SECRET test value
 * (`whsec_test_fake_do_not_use_in_prod`) and hand-constructed HMAC
 * signatures. They prove verifyWebhookSignature() correctly accepts a
 * validly-signed payload and rejects a tampered one/wrong secret. This is
 * NOT a real Razorpay Test Mode integration test — that requires a live
 * Razorpay dashboard webhook configured to actually deliver signed events,
 * which is not available in this sandbox. Do not represent this as having
 * verified Razorpay's actual webhook delivery behavior end-to-end.
 */
const TEST_SECRET = 'whsec_test_fake_do_not_use_in_prod'

function sign(body, secret = TEST_SECRET) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

describe('verifyWebhookSignature', () => {
  test('accepts a validly-signed payload', () => {
    const body = JSON.stringify({ event: 'payment.captured', payload: {} })
    const sig = sign(body)
    assert.equal(verifyWebhookSignature(body, sig, TEST_SECRET), true)
  })

  test('rejects a tampered payload (body changed after signing)', () => {
    const body = JSON.stringify({ event: 'payment.captured', payload: { amount: 100 } })
    const sig = sign(body)
    const tamperedBody = JSON.stringify({ event: 'payment.captured', payload: { amount: 999999 } })
    assert.equal(verifyWebhookSignature(tamperedBody, sig, TEST_SECRET), false)
  })

  test('rejects a signature produced with the wrong secret', () => {
    const body = JSON.stringify({ event: 'payment.captured' })
    const sig = sign(body, 'a_different_secret')
    assert.equal(verifyWebhookSignature(body, sig, TEST_SECRET), false)
  })

  test('rejects when signature header is missing', () => {
    assert.equal(verifyWebhookSignature('{}', undefined, TEST_SECRET), false)
  })

  test('rejects when webhook secret is not configured', () => {
    const body = '{}'
    const sig = sign(body)
    assert.equal(verifyWebhookSignature(body, sig, undefined), false)
  })
})

// ── processWebhookEvent — dedup + state-transition orchestration ──────────
function makeFakeDb() {
  const webhookEvents = new Map() // by razorpay_event_id
  const bookings = { 'booking-1': { status: 'pending_payment', slot_id: 'slot-1' } }
  const slots = { 'slot-1': { status: 'reserved' } }
  return {
    _webhookEvents: webhookEvents,
    _bookings: bookings,
    from(name) {
      if (name === 'mentor_payment_webhook_events') {
        const filters = {}
        let pendingPatch = null
        const api = {
          select() { return api },
          eq(col, val) {
            filters[col] = val
            // Apply a queued .update(patch) as soon as the filter that
            // identifies the target row is chained (mirrors real
            // supabase-js: .update(patch).eq(col,val) applies to the
            // filtered row(s)).
            if (pendingPatch) {
              const existing = webhookEvents.get(filters.razorpay_event_id)
              if (existing) webhookEvents.set(filters.razorpay_event_id, { ...existing, ...pendingPatch })
              pendingPatch = null
            }
            return api
          },
          async maybeSingle() {
            return { data: webhookEvents.get(filters.razorpay_event_id) || null, error: null }
          },
          async insert(row) {
            if (webhookEvents.has(row.razorpay_event_id)) {
              return { error: { message: 'duplicate key value violates unique constraint', code: '23505' } }
            }
            webhookEvents.set(row.razorpay_event_id, { ...row, seen_count: 1 })
            return { error: null }
          },
          update(patch) { pendingPatch = patch; return api },
        }
        return api
      }
      throw new Error(`unexpected table ${name}`)
    },
    async rpc(fnName, params) {
      if (fnName === 'mentor_confirm_booking') {
        const b = bookings[params.p_booking_id]
        if (!b || b.status !== 'pending_payment') return { data: { success: false, error: 'invalid_state' }, error: null }
        b.status = 'confirmed'
        slots[b.slot_id].status = 'booked'
        return { data: { success: true, booking_id: params.p_booking_id }, error: null }
      }
      if (fnName === 'mentor_release_booking') {
        const b = bookings[params.p_booking_id]
        if (!b) return { data: { success: false, error: 'booking_not_found' }, error: null }
        b.status = params.p_new_status
        return { data: { success: true, booking_id: params.p_booking_id }, error: null }
      }
      throw new Error(`unexpected rpc ${fnName}`)
    },
  }
}

describe('processWebhookEvent', () => {
  test('rejects with 400 and records the attempt when signature is invalid', async () => {
    const db = makeFakeDb()
    const rawBody = JSON.stringify({ event: 'payment.captured' })
    const result = await processWebhookEvent(db, {
      eventId: 'evt_1', eventType: 'payment.captured', payload: {}, rawBody,
      signatureHeader: 'garbage', webhookSecret: TEST_SECRET,
    })
    assert.equal(result.accepted, false)
    assert.equal(result.httpStatus, 400)
    assert.equal(result.reason, 'invalid_signature')
  })

  test('valid payment.captured event confirms the matching booking', async () => {
    const db = makeFakeDb()
    const payload = { payload: { payment: { entity: { notes: { mentor_booking_id: 'booking-1' } } } } }
    const rawBody = JSON.stringify(payload)
    const sig = sign(rawBody)
    const result = await processWebhookEvent(db, {
      eventId: 'evt_captured_1', eventType: 'payment.captured', payload, rawBody,
      signatureHeader: sig, webhookSecret: TEST_SECRET,
    })
    assert.equal(result.accepted, true)
    assert.equal(result.processingResult, 'booking_confirmed')
    assert.equal(db._bookings['booking-1'].status, 'confirmed')
  })

  test('MISSED-WEBHOOK REDELIVERY: the same event_id delivered twice is a safe no-op the second time', async () => {
    const db = makeFakeDb()
    const payload = { payload: { payment: { entity: { notes: { mentor_booking_id: 'booking-1' } } } } }
    const rawBody = JSON.stringify(payload)
    const sig = sign(rawBody)
    const first = await processWebhookEvent(db, { eventId: 'evt_dup', eventType: 'payment.captured', payload, rawBody, signatureHeader: sig, webhookSecret: TEST_SECRET })
    const second = await processWebhookEvent(db, { eventId: 'evt_dup', eventType: 'payment.captured', payload, rawBody, signatureHeader: sig, webhookSecret: TEST_SECRET })
    assert.equal(first.accepted, true)
    assert.equal(second.accepted, true)
    assert.equal(second.duplicate, true)
    // Booking only confirmed once — status is 'confirmed', not double-processed/erroring.
    assert.equal(db._bookings['booking-1'].status, 'confirmed')
  })

  test('missing x-razorpay-event-id is rejected with 400 even with a valid signature', async () => {
    const db = makeFakeDb()
    const rawBody = JSON.stringify({ event: 'payment.captured' })
    const sig = sign(rawBody)
    const result = await processWebhookEvent(db, { eventId: undefined, eventType: 'payment.captured', payload: {}, rawBody, signatureHeader: sig, webhookSecret: TEST_SECRET })
    assert.equal(result.accepted, false)
    assert.equal(result.httpStatus, 400)
    assert.equal(result.reason, 'missing_event_id')
  })

  test('TRANCHE 8 FIX: a redelivery for an event stuck at "received" (prior crash before booking-state update) is retried, not silently swallowed', async () => {
    const db = makeFakeDb()
    // Simulate a PRIOR delivery that got as far as the dedupe insert but
    // crashed before confirmBooking ran — this is exactly the state the old
    // code would have permanently stranded.
    db._webhookEvents.set('evt_crashed', {
      razorpay_event_id: 'evt_crashed', event_type: 'payment.captured',
      payload: {}, signature_valid: true, processing_result: 'received', seen_count: 1,
    })
    assert.equal(db._bookings['booking-1'].status, 'pending_payment', 'booking should still be unconfirmed before the retry')

    const payload = { payload: { payment: { entity: { notes: { mentor_booking_id: 'booking-1' } } } } }
    const rawBody = JSON.stringify(payload)
    const sig = sign(rawBody)
    const result = await processWebhookEvent(db, {
      eventId: 'evt_crashed', eventType: 'payment.captured', payload, rawBody,
      signatureHeader: sig, webhookSecret: TEST_SECRET,
    })

    assert.equal(result.accepted, true)
    assert.equal(result.duplicate, undefined, 'must NOT be short-circuited as a duplicate')
    assert.equal(result.processingResult, 'booking_confirmed')
    assert.equal(db._bookings['booking-1'].status, 'confirmed', 'the stranded booking must actually get confirmed on retry')
  })

  test('payment.failed releases the booking back to available/failed', async () => {
    const db = makeFakeDb()
    const payload = { payload: { payment: { entity: { notes: { mentor_booking_id: 'booking-1' } } } } }
    const rawBody = JSON.stringify(payload)
    const sig = sign(rawBody)
    const result = await processWebhookEvent(db, { eventId: 'evt_failed_1', eventType: 'payment.failed', payload, rawBody, signatureHeader: sig, webhookSecret: TEST_SECRET })
    assert.equal(result.accepted, true)
    assert.equal(db._bookings['booking-1'].status, 'failed')
  })
})
