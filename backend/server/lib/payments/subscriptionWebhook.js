/**
 * subscriptionWebhook.js — Tranche C (2026-07-25): the general
 * subscription/plan Razorpay payment path (backend/server/routes/
 * payments.js — /create-order + /verify-payment) never had a webhook. Only
 * a client-driven POST /api/verify-payment granted the plan. If the user's
 * browser closed, lost network, or crashed after Razorpay captured the
 * payment but before that request completed, the payment succeeded and the
 * user was charged, but nothing ever granted the entitlement — and there
 * was no server-side recovery path for it (unlike the mentor marketplace,
 * which has both a webhook AND a reconciliation sweep, from Tranche 8 /
 * Workstream 4). This closes that gap using the exact same pattern already
 * proven for mentor marketplace: signature-verified, deduped-by-event-id
 * webhook, idempotent-by-construction grant.
 *
 * Signature verification is IDENTICAL in construction to the mentor
 * marketplace webhook (HMAC-SHA256 over the raw request body, same
 * RAZORPAY_WEBHOOK_SECRET — Razorpay dashboards typically have one webhook
 * config per account posting all subscribed event types to whichever URLs
 * are registered), so this reuses that exact function rather than
 * reimplementing HMAC verification a second time.
 *
 * SCOPE: this webhook only acts on orders whose Razorpay order `notes`
 * contain `planId` + `uid` and do NOT contain `mentor_booking_id` — i.e.
 * exactly the orders created by POST /api/create-order in payments.js. Any
 * other event (mentor bookings, theme purchases, unrelated account
 * activity) is recorded for audit but explicitly skipped here — mentor
 * bookings already have their own dedicated webhook/table
 * (mentorMarketplace/webhook.js), and theme purchases are a separate,
 * lower-stakes cosmetic path not covered by this pass (see payments.js's
 * existing P1 note on theme pricing).
 */
import { verifyWebhookSignature } from '../mentorMarketplace/webhook.js'

function isTerminalResult(result) {
  if (!result) return false
  return result === 'plan_granted'
    || result === 'payment_failed_acknowledged'
    || result === 'not_a_subscription_order'
    || result.startsWith('grant_failed')
    || result.startsWith('unhandled_event_type')
}

/**
 * @param {object} db - supabaseAdmin-like client
 * @param {object} params
 * @param {string} params.eventId - x-razorpay-event-id header
 * @param {string} params.eventType - payload.event
 * @param {object} params.payload - parsed JSON body
 * @param {string} params.rawBody - exact raw request body bytes
 * @param {string} params.signatureHeader - x-razorpay-signature header
 * @param {string} params.webhookSecret - RAZORPAY_WEBHOOK_SECRET
 * @param {(orderId:string)=>Promise<object>} params.fetchOrder - injectable, defaults require a real client to be passed by the route
 * @param {(paymentId:string)=>Promise<object>} params.fetchPayment - injectable
 * @param {(planId:string)=>({amount:number,label:string}|undefined)} params.getPlan - PLAN_PRICES lookup, injected to avoid a hard import cycle
 */
export async function processSubscriptionWebhookEvent(db, {
  eventId, eventType, payload, rawBody, signatureHeader, webhookSecret,
  fetchOrder, fetchPayment, getPlan,
}) {
  const signatureValid = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret)
  if (!signatureValid) {
    await recordEvent(db, { eventId, eventType, payload, signatureValid: false, processingResult: 'rejected_invalid_signature' })
    return { accepted: false, httpStatus: 400, reason: 'invalid_signature' }
  }
  if (!eventId) {
    await recordEvent(db, { eventId: null, eventType, payload, signatureValid: true, processingResult: 'rejected_missing_event_id' })
    return { accepted: false, httpStatus: 400, reason: 'missing_event_id' }
  }

  const dedupe = await recordEvent(db, { eventId, eventType, payload, signatureValid: true, processingResult: 'received' })
  if (dedupe.duplicate) {
    return { accepted: true, httpStatus: 200, duplicate: true }
  }
  // dedupe.retry === true falls through and reprocesses — safe because the
  // grant below is a deterministic UPDATE keyed on uid (re-granting the same
  // plan is a no-op), identical to /verify-payment's own idempotency note.

  const orderId = payload?.payload?.payment?.entity?.order_id
    || payload?.payload?.order?.entity?.id
    || null

  let processingResult = 'not_a_subscription_order'
  if (orderId && (eventType === 'payment.captured' || eventType === 'payment.failed')) {
    try {
      const order = await fetchOrder(orderId)
      const notes = order?.notes || {}
      const isSubscriptionOrder = !!notes.planId && !!notes.uid && !notes.mentor_booking_id
      if (isSubscriptionOrder) {
        if (eventType === 'payment.failed') {
          processingResult = 'payment_failed_acknowledged'
        } else {
          const plan = getPlan(notes.planId)
          const paymentId = payload?.payload?.payment?.entity?.id
          const payment = paymentId ? await fetchPayment(paymentId) : null
          const validCapture = plan
            && payment?.order_id === orderId
            && ['captured', 'authorized'].includes(payment?.status)
            && Number(payment?.amount) === Number(plan.amount)
          if (validCapture) {
            const { error } = await db.from('profiles').update({
              subscription: notes.planId,
              subscription_cycle_start: new Date().toISOString(),
              razorpay_payment_id: paymentId,
              razorpay_order_id: orderId,
              updated_at: new Date().toISOString(),
            }).eq('id', notes.uid)
            processingResult = error ? `grant_failed:${error.message}` : 'plan_granted'
          } else {
            processingResult = 'grant_failed:payment_not_verified'
          }
        }
      }
    } catch (e) {
      processingResult = `grant_failed:${e.message}`
    }
  } else if (orderId) {
    processingResult = `unhandled_event_type:${eventType}`
  }

  await updateEventResult(db, eventId, processingResult)
  return { accepted: true, httpStatus: 200, processingResult }
}

async function recordEvent(db, { eventId, eventType, payload, signatureValid, processingResult }) {
  if (!eventId) {
    await db.from('payment_webhook_events').insert({
      razorpay_event_id: `invalid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      event_type: eventType || null,
      payload: payload || {},
      signature_valid: signatureValid,
      processing_result: processingResult,
    })
    return { duplicate: false }
  }

  const { data: existing } = await db.from('payment_webhook_events').select('*').eq('razorpay_event_id', eventId).maybeSingle()
  if (existing) {
    await db.from('payment_webhook_events')
      .update({ seen_count: (existing.seen_count || 1) + 1, last_seen_at: new Date().toISOString() })
      .eq('razorpay_event_id', eventId)
    if (isTerminalResult(existing.processing_result)) return { duplicate: true }
    return { duplicate: false, retry: true }
  }

  const { error } = await db.from('payment_webhook_events').insert({
    razorpay_event_id: eventId,
    event_type: eventType || null,
    payload: payload || {},
    signature_valid: signatureValid,
    processing_result: processingResult,
  })
  if (error) {
    if (String(error.message || '').includes('duplicate key') || String(error.code) === '23505') {
      return { duplicate: true }
    }
    throw error
  }
  return { duplicate: false }
}

async function updateEventResult(db, eventId, processingResult) {
  await db.from('payment_webhook_events').update({ processing_result: processingResult }).eq('razorpay_event_id', eventId)
}
