import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import { processSubscriptionWebhookEvent } from './subscriptionWebhook.js'

const TEST_SECRET = 'whsec_test_fake_do_not_use_in_prod'
function sign(body, secret = TEST_SECRET) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

function makeFakeDb() {
  const events = new Map()
  const profileUpdates = []
  function chain(table) {
    const s = { table, filters: {} }
    const api = {
      select() { return api },
      eq(col, val) { s.filters[col] = val; return api },
      async maybeSingle() {
        if (table === 'payment_webhook_events') return { data: events.get(s.filters.razorpay_event_id) || null, error: null }
        return { data: null, error: null }
      },
      insert(row) {
        if (table === 'payment_webhook_events') {
          if (events.has(row.razorpay_event_id)) return Promise.resolve({ error: { message: 'duplicate key', code: '23505' } })
          events.set(row.razorpay_event_id, { ...row, seen_count: 1 })
        }
        return Promise.resolve({ data: row, error: null })
      },
      update(patch) {
        return {
          eq(col, val) {
            if (table === 'payment_webhook_events') {
              const ev = events.get(val)
              if (ev) events.set(val, { ...ev, ...patch })
              return Promise.resolve({ error: null })
            }
            if (table === 'profiles') {
              profileUpdates.push({ id: val, patch })
              return Promise.resolve({ error: null })
            }
            return Promise.resolve({ error: null })
          },
        }
      },
    }
    return api
  }
  return { from: (t) => chain(t), _events: events, _profileUpdates: profileUpdates }
}

function makeBaseParams(overrides = {}) {
  const payload = {
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } },
  }
  const rawBody = JSON.stringify(payload)
  return {
    eventId: 'evt_1',
    eventType: payload.event,
    payload,
    rawBody,
    signatureHeader: sign(rawBody),
    webhookSecret: TEST_SECRET,
    fetchOrder: async () => ({ notes: { planId: 'pro', uid: 'user-1' } }),
    fetchPayment: async () => ({ order_id: 'order_1', status: 'captured', amount: 29900 }),
    getPlan: () => ({ amount: 29900, label: 'Pro' }),
    ...overrides,
  }
}

describe('processSubscriptionWebhookEvent', () => {
  test('rejects an invalid signature and never touches profiles', async () => {
    const db = makeFakeDb()
    const params = makeBaseParams({ signatureHeader: 'not-a-real-signature' })
    const result = await processSubscriptionWebhookEvent(db, params)
    assert.equal(result.accepted, false)
    assert.equal(result.httpStatus, 400)
    assert.equal(db._profileUpdates.length, 0)
  })

  test('a valid payment.captured for a real subscription order grants the plan', async () => {
    const db = makeFakeDb()
    const result = await processSubscriptionWebhookEvent(db, makeBaseParams())
    assert.equal(result.accepted, true)
    assert.equal(result.processingResult, 'plan_granted')
    assert.equal(db._profileUpdates.length, 1)
    assert.equal(db._profileUpdates[0].id, 'user-1')
    assert.equal(db._profileUpdates[0].patch.subscription, 'pro')
  })

  test('amount mismatch is NOT granted (fraud/tamper guard, same rule as /verify-payment)', async () => {
    const db = makeFakeDb()
    const params = makeBaseParams({ fetchPayment: async () => ({ order_id: 'order_1', status: 'captured', amount: 100 }) })
    const result = await processSubscriptionWebhookEvent(db, params)
    assert.equal(result.processingResult, 'grant_failed:payment_not_verified')
    assert.equal(db._profileUpdates.length, 0)
  })

  test('an order that is not a subscription order (e.g. a mentor booking) is skipped, not granted', async () => {
    const db = makeFakeDb()
    const params = makeBaseParams({ fetchOrder: async () => ({ notes: { mentor_booking_id: 'b1' } }) })
    const result = await processSubscriptionWebhookEvent(db, params)
    assert.equal(result.processingResult, 'not_a_subscription_order')
    assert.equal(db._profileUpdates.length, 0)
  })

  test('redelivery of an already-granted event is a safe no-op duplicate, not a second grant', async () => {
    const db = makeFakeDb()
    const params = makeBaseParams()
    await processSubscriptionWebhookEvent(db, params)
    const second = await processSubscriptionWebhookEvent(db, params)
    assert.equal(second.duplicate, true)
    assert.equal(db._profileUpdates.length, 1, 'grant must only have happened once')
  })

  test('payment.failed for a subscription order is acknowledged without granting anything', async () => {
    const db = makeFakeDb()
    const payload = { event: 'payment.failed', payload: { payment: { entity: { id: 'pay_2', order_id: 'order_2' } } } }
    const rawBody = JSON.stringify(payload)
    const params = makeBaseParams({
      eventId: 'evt_2', eventType: 'payment.failed', payload, rawBody, signatureHeader: sign(rawBody),
    })
    const result = await processSubscriptionWebhookEvent(db, params)
    assert.equal(result.processingResult, 'payment_failed_acknowledged')
    assert.equal(db._profileUpdates.length, 0)
  })
})
