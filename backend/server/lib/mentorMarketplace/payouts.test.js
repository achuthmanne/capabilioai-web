import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { findEligibleBookings, createPayoutBatch, finalizePayoutBatch, markPayoutPaid } from './payouts.js'

function makeFakeDb(initial) {
  const tables = structuredClone(initial)
  let idCounter = 0
  return {
    _tables: tables,
    from(name) {
      const rows = tables[name] || (tables[name] = [])
      let filtered = rows
      let pendingPatch = null
      let insertedRows = null

      // applyPatch() runs lazily right before a terminal call (select/single/
      // maybeSingle/then), so .update(patch).eq(...).select().single() filters
      // BEFORE the patch is applied, matching real supabase-js semantics.
      function applyPendingPatch() {
        if (pendingPatch) {
          for (const r of filtered) Object.assign(r, pendingPatch)
          pendingPatch = null
        }
      }

      const chain = {
        select() { applyPendingPatch(); return chain },
        eq(col, val) { filtered = filtered.filter(r => r[col] === val); return chain },
        gte(col, val) { filtered = filtered.filter(r => new Date(r[col]).getTime() >= new Date(val).getTime()); return chain },
        lte(col, val) { filtered = filtered.filter(r => new Date(r[col]).getTime() <= new Date(val).getTime()); return chain },
        in(col, vals) { filtered = filtered.filter(r => vals.includes(r[col])); return chain },
        async maybeSingle() { applyPendingPatch(); return { data: (insertedRows || filtered)[0] || null, error: null } },
        async single() { applyPendingPatch(); return { data: (insertedRows || filtered)[0] || null, error: null } },
        update(patch) { pendingPatch = patch; return chain },
        insert(row) {
          const insertRowsArr = Array.isArray(row) ? row : [row]
          insertedRows = insertRowsArr.map(r => ({ id: `gen-${idCounter++}`, ...r }))
          rows.push(...insertedRows)
          filtered = insertedRows
          return chain
        },
      }
      chain.then = (resolve) => { applyPendingPatch(); resolve({ data: insertedRows || filtered, error: null }) }
      return chain
    },
  }
}

function baseBookings() {
  return [
    { id: 'b1', mentor_id: 'm1', status: 'completed', price_amount: 1000, currency: 'INR', scheduled_start: '2026-01-05T10:00:00Z' },
    { id: 'b2', mentor_id: 'm1', status: 'completed', price_amount: 500, currency: 'INR', scheduled_start: '2026-01-10T10:00:00Z' },
    { id: 'b3', mentor_id: 'm1', status: 'refunded', price_amount: 800, currency: 'INR', scheduled_start: '2026-01-12T10:00:00Z' },
    { id: 'b4', mentor_id: 'm1', status: 'failed', price_amount: 200, currency: 'INR', scheduled_start: '2026-01-15T10:00:00Z' },
    { id: 'b5', mentor_id: 'm1', status: 'no_show_mentee', price_amount: 300, currency: 'INR', scheduled_start: '2026-01-16T10:00:00Z' },
  ]
}

describe('findEligibleBookings', () => {
  test('excludes failed/refunded/disputed; includes completed and mentee-no-show (mentor stays payout-eligible)', async () => {
    const db = makeFakeDb({ mentor_bookings: baseBookings(), mentor_payout_line_items: [], mentor_disputes: [] })
    const eligible = await findEligibleBookings(db, { mentorId: 'm1', periodStart: '2026-01-01', periodEnd: '2026-01-31' })
    const ids = eligible.map(b => b.id).sort()
    assert.deepEqual(ids, ['b1', 'b2', 'b5'])
  })

  test('excludes a booking already paid out in a previous batch', async () => {
    const db = makeFakeDb({ mentor_bookings: baseBookings(), mentor_payout_line_items: [{ booking_id: 'b1' }], mentor_disputes: [] })
    const eligible = await findEligibleBookings(db, { mentorId: 'm1', periodStart: '2026-01-01', periodEnd: '2026-01-31' })
    assert.ok(!eligible.some(b => b.id === 'b1'))
  })

  test('excludes a booking with an open dispute (on-hold)', async () => {
    const db = makeFakeDb({ mentor_bookings: baseBookings(), mentor_payout_line_items: [], mentor_disputes: [{ booking_id: 'b2', status: 'open' }] })
    const eligible = await findEligibleBookings(db, { mentorId: 'm1', periodStart: '2026-01-01', periodEnd: '2026-01-31' })
    assert.ok(!eligible.some(b => b.id === 'b2'))
  })
})

describe('createPayoutBatch', () => {
  test('computes gross/fee/net correctly for a 15% platform fee', async () => {
    const db = makeFakeDb({ mentor_bookings: baseBookings(), mentor_payout_line_items: [], mentor_disputes: [], mentor_payouts: [], mentor_audit_log: [] })
    const result = await createPayoutBatch(db, { mentorId: 'm1', periodStart: '2026-01-01', periodEnd: '2026-01-31', adminId: 'admin1', platformFeePct: 0.15 })
    assert.equal(result.success, true)
    assert.equal(result.bookingCount, 3) // b1, b2, b5
    assert.equal(result.grossAmount, 1800) // 1000+500+300
    assert.equal(result.platformFeeAmount, 270) // 15%
    assert.equal(result.netAmount, 1530)
    assert.equal(result.payout.status, 'draft')
  })

  test('fails cleanly with no eligible bookings', async () => {
    const db = makeFakeDb({ mentor_bookings: [], mentor_payout_line_items: [], mentor_disputes: [], mentor_payouts: [], mentor_audit_log: [] })
    const result = await createPayoutBatch(db, { mentorId: 'm1', periodStart: '2026-01-01', periodEnd: '2026-01-31', adminId: 'admin1' })
    assert.equal(result.success, false)
    assert.equal(result.error, 'no_eligible_bookings')
  })

  test('never labels the batch or its audit note as "automated" — it is admin-triggered', async () => {
    const db = makeFakeDb({ mentor_bookings: baseBookings(), mentor_payout_line_items: [], mentor_disputes: [], mentor_payouts: [], mentor_audit_log: [] })
    await createPayoutBatch(db, { mentorId: 'm1', periodStart: '2026-01-01', periodEnd: '2026-01-31', adminId: 'admin1' })
    const note = db._tables.mentor_audit_log[0].note
    assert.ok(note.includes('admin-triggered'))
    assert.ok(!note.toLowerCase().includes('automated'))
  })
})

describe('finalizePayoutBatch / markPayoutPaid', () => {
  test('markPayoutPaid requires a transfer_reference (manual transfer, not automated)', async () => {
    const db = makeFakeDb({ mentor_payouts: [{ id: 'p1', status: 'finalized' }], mentor_audit_log: [] })
    const result = await markPayoutPaid(db, { payoutId: 'p1', adminId: 'admin1', transferReference: '' })
    assert.equal(result.success, false)
    assert.equal(result.error, 'transfer_reference_required')
  })

  test('markPayoutPaid with a reference succeeds and logs an audit entry', async () => {
    const db = makeFakeDb({ mentor_payouts: [{ id: 'p1', status: 'finalized' }], mentor_audit_log: [] })
    const result = await markPayoutPaid(db, { payoutId: 'p1', adminId: 'admin1', transferReference: 'NEFT-REF-12345' })
    assert.equal(result.success, true)
    assert.equal(db._tables.mentor_payouts[0].transfer_reference, 'NEFT-REF-12345')
    assert.equal(db._tables.mentor_audit_log.length, 1)
  })

  test('finalizePayoutBatch transitions draft -> finalized', async () => {
    const db = makeFakeDb({ mentor_payouts: [{ id: 'p1', status: 'draft' }], mentor_audit_log: [] })
    const result = await finalizePayoutBatch(db, { payoutId: 'p1', adminId: 'admin1' })
    assert.equal(result.success, true)
    assert.equal(db._tables.mentor_payouts[0].status, 'finalized')
  })
})
