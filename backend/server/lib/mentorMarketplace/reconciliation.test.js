import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { releaseStaleReservations, recoverMissedWebhooks, autoCompleteEligibleBookings, runReconciliation } from './reconciliation.js'

/**
 * Fake Supabase-like client. Each table is a plain array of row objects.
 * The query builder supports the small subset of chained filters this
 * module actually uses (.eq, .lt, .in, .maybeSingle, .update, .insert).
 */
function makeFakeDb(initial) {
  const tables = structuredClone(initial)
  return {
    _tables: tables,
    from(name) {
      const rows = tables[name]
      let filtered = rows
      let pendingPatch = null
      const chain = {
        select() { return chain },
        eq(col, val) {
          filtered = filtered.filter(r => r[col] === val)
          if (pendingPatch) { for (const r of filtered) Object.assign(r, pendingPatch); pendingPatch = null }
          return chain
        },
        lt(col, val) { filtered = filtered.filter(r => new Date(r[col]).getTime() < new Date(val).getTime()); return chain },
        in(col, vals) { filtered = filtered.filter(r => vals.includes(r[col])); return chain },
        async maybeSingle() { return { data: filtered[0] || null, error: null } },
        update(patch) { pendingPatch = patch; return chain },
        async insert(row) { rows.push({ ...row, id: `generated-${rows.length}` }); return { data: row, error: null } },
      }
      // Make the chain awaitable directly (resolves to {data,error} of current filter state)
      chain.then = (resolve) => { if (pendingPatch) { for (const r of filtered) Object.assign(r, pendingPatch); pendingPatch = null }; resolve({ data: filtered, error: null }) }
      return chain
    },
    async rpc(fnName, params) {
      if (fnName === 'mentor_release_booking') {
        const booking = tables.mentor_bookings.find(b => b.id === params.p_booking_id)
        if (booking) booking.status = params.p_new_status
        return { data: { success: true, booking_id: params.p_booking_id }, error: null }
      }
      if (fnName === 'mentor_confirm_booking') {
        const booking = tables.mentor_bookings.find(b => b.id === params.p_booking_id)
        if (booking) booking.status = 'confirmed'
        return { data: { success: true, booking_id: params.p_booking_id }, error: null }
      }
      throw new Error(`unexpected rpc ${fnName}`)
    },
  }
}

describe('releaseStaleReservations', () => {
  const baseState = {
    mentor_availability_slots: [
      { id: 'slot-1', mentor_id: 'm1', slot_status: 'reserved', reservation_expires_at: '2026-01-01T00:00:00Z' },
      { id: 'slot-2', mentor_id: 'm1', slot_status: 'available', reservation_expires_at: null },
    ],
    mentor_bookings: [
      { id: 'booking-1', slot_id: 'slot-1', status: 'pending_payment' },
    ],
    mentor_audit_log: [],
  }

  test('dry-run reports what WOULD be released without mutating', async () => {
    const db = makeFakeDb(baseState)
    const result = await releaseStaleReservations(db, { now: new Date('2026-01-02T00:00:00Z'), commit: false })
    assert.equal(result.checked, 1)
    assert.equal(result.actions[0].wouldRelease, true)
    assert.equal(db._tables.mentor_bookings[0].status, 'pending_payment') // unchanged
  })

  test('--commit actually releases the stale reservation', async () => {
    const db = makeFakeDb(baseState)
    const result = await releaseStaleReservations(db, { now: new Date('2026-01-02T00:00:00Z'), commit: true })
    assert.equal(result.actions[0].released, true)
    assert.equal(db._tables.mentor_bookings[0].status, 'failed')
  })

  test('a slot whose reservation has not yet expired is not touched', async () => {
    const db = makeFakeDb(baseState)
    const result = await releaseStaleReservations(db, { now: new Date('2025-12-31T00:00:00Z'), commit: true })
    assert.equal(result.checked, 0)
  })
})

describe('recoverMissedWebhooks — the mandatory missed-webhook-recovery test', () => {
  function state() {
    return {
      mentor_bookings: [
        { id: 'booking-1', slot_id: 'slot-1', status: 'pending_payment', created_at: '2026-01-01T00:00:00Z' },
      ],
      mentor_payments: [
        { booking_id: 'booking-1', razorpay_order_id: 'order_abc', status: 'created' },
      ],
      mentor_audit_log: [],
    }
  }

  test('a booking whose payment was actually captured (per mocked Razorpay check) but no webhook arrived is correctly transitioned to confirmed, not left stuck or wrongly expired', async () => {
    const db = makeFakeDb(state())
    const mockRazorpayCheck = async (orderId) => {
      assert.equal(orderId, 'order_abc')
      return { status: 'captured', paymentId: 'pay_recovered_1' }
    }
    const result = await recoverMissedWebhooks(db, {
      now: new Date('2026-01-01T01:00:00Z'), // 60 min later, past the 20-min threshold
      thresholdMinutes: 20,
      commit: true,
      checkRazorpayOrderStatus: mockRazorpayCheck,
    })
    assert.equal(result.checked, 1)
    assert.equal(result.results[0].recovered, true)
    assert.equal(db._tables.mentor_bookings[0].status, 'confirmed')
    assert.equal(db._tables.mentor_payments[0].status, 'captured')
  })

  test('a booking whose mocked Razorpay check says failed is released, not left pending', async () => {
    const db = makeFakeDb(state())
    const mockRazorpayCheck = async () => ({ status: 'failed' })
    const result = await recoverMissedWebhooks(db, { now: new Date('2026-01-01T01:00:00Z'), commit: true, checkRazorpayOrderStatus: mockRazorpayCheck })
    assert.equal(result.results[0].failed, true)
    assert.equal(db._tables.mentor_bookings[0].status, 'failed')
  })

  test('a booking already resolved by a real webhook (payment.status=captured) is skipped, not double-processed', async () => {
    const s = state()
    s.mentor_payments[0].status = 'captured'
    const db = makeFakeDb(s)
    const result = await recoverMissedWebhooks(db, { now: new Date('2026-01-01T01:00:00Z'), commit: true })
    assert.equal(result.results[0].skipped, true)
    assert.equal(result.results[0].reason, 'already_resolved_by_webhook')
  })

  test('a booking younger than the threshold is not checked at all', async () => {
    const db = makeFakeDb(state())
    const result = await recoverMissedWebhooks(db, { now: new Date('2026-01-01T00:05:00Z'), thresholdMinutes: 20, commit: true })
    assert.equal(result.checked, 0)
  })

  test('an ambiguous live status is flagged for admin review, not silently resolved', async () => {
    const db = makeFakeDb(state())
    const mockRazorpayCheck = async () => ({ status: 'created' })
    const result = await recoverMissedWebhooks(db, { now: new Date('2026-01-01T01:00:00Z'), commit: true, checkRazorpayOrderStatus: mockRazorpayCheck })
    assert.equal(result.results[0].flaggedForAdminReview, true)
  })

  test('the real stub throws (documents that the live Razorpay call is not implemented here)', async () => {
    const db = makeFakeDb(state())
    const result = await recoverMissedWebhooks(db, { now: new Date('2026-01-01T01:00:00Z'), commit: true }) // uses default stub
    assert.equal(result.results[0].flaggedForAdminReview, true)
    assert.ok(result.results[0].error.includes('stub'))
  })
})

describe('autoCompleteEligibleBookings', () => {
  function state() {
    return {
      mentor_bookings: [
        { id: 'booking-1', scheduled_end: '2026-01-01T10:00:00Z', status: 'confirmed', no_show_reported_at: null },
      ],
      mentor_disputes: [],
      mentor_audit_log: [],
    }
  }

  test('auto-completes 24h+ after scheduled_end with no dispute/no-show', async () => {
    const db = makeFakeDb(state())
    const result = await autoCompleteEligibleBookings(db, { now: new Date('2026-01-02T10:01:00Z'), commit: true })
    assert.equal(result.results[0].completed, true)
    assert.equal(db._tables.mentor_bookings[0].status, 'completed')
  })

  test('does not auto-complete while an open dispute exists', async () => {
    const s = state()
    s.mentor_disputes.push({ id: 'd1', booking_id: 'booking-1', status: 'open' })
    const db = makeFakeDb(s)
    const result = await autoCompleteEligibleBookings(db, { now: new Date('2026-01-05T10:00:00Z'), commit: true })
    assert.equal(result.results.length, 0)
    assert.equal(db._tables.mentor_bookings[0].status, 'confirmed')
  })
})

describe('runReconciliation', () => {
  test('runs all three sweeps and returns a combined report', async () => {
    const db = makeFakeDb({
      mentor_availability_slots: [],
      mentor_bookings: [],
      mentor_payments: [],
      mentor_disputes: [],
      mentor_audit_log: [],
    })
    const result = await runReconciliation(db, { commit: false })
    assert.ok(result.staleReservations)
    assert.ok(result.missedWebhooks)
    assert.ok(result.autoCompletions)
    assert.equal(result.commit, false)
  })
})

// ── TRANCHE 3 (2026-07-25): makeRazorpayOrderStatusChecker ────────────────
import { makeRazorpayOrderStatusChecker } from './reconciliation.js'

describe('makeRazorpayOrderStatusChecker', () => {
  const makeClient = (items) => ({ orders: { fetchPayments: async () => ({ items }) } })

  test('a captured payment reports captured with the payment id', async () => {
    const check = makeRazorpayOrderStatusChecker(makeClient([
      { id: 'pay_a', status: 'failed' },
      { id: 'pay_b', status: 'captured' },
    ]))
    assert.deepEqual(await check('order_1'), { status: 'captured', paymentId: 'pay_b' })
  })

  test('all attempts failed reports failed', async () => {
    const check = makeRazorpayOrderStatusChecker(makeClient([
      { id: 'pay_a', status: 'failed' },
      { id: 'pay_b', status: 'failed' },
    ]))
    const r = await check('order_1')
    assert.equal(r.status, 'failed')
  })

  test('zero payment attempts is ambiguous — pending, never failed (protects a paying user mid-checkout)', async () => {
    const check = makeRazorpayOrderStatusChecker(makeClient([]))
    assert.deepEqual(await check('order_1'), { status: 'pending' })
  })

  test('a Razorpay API error propagates (recoverMissedWebhooks catches per-booking and flags for admin review)', async () => {
    const check = makeRazorpayOrderStatusChecker({ orders: { fetchPayments: async () => { throw new Error('auth failed') } } })
    await assert.rejects(() => check('order_1'), /auth failed/)
  })
})
