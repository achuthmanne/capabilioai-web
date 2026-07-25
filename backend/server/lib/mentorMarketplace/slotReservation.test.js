import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { reserveSlot, confirmBooking, releaseBooking, SLOT_RESERVATION_ERRORS } from './slotReservation.js'

/**
 * IMPORTANT SCOPE NOTE: these tests exercise slotReservation.js's request
 * shaping and error-mapping logic against a FAKE db.rpc() that mimics the
 * mentor_reserve_slot() plpgsql function's row-locking semantics in plain
 * JS. This proves the JS wrapper correctly turns various RPC outcomes into
 * the right {success, error, httpStatus} shape. It does NOT prove the real
 * Postgres `SELECT ... FOR UPDATE` row lock in the migration is race-free
 * under genuine concurrent connections — that requires hitting the live
 * Supabase Postgres instance with two simultaneous connections, which this
 * sandbox cannot do (no direct Postgres connection string, MCP tools are
 * single-call). The row-lock's correctness is a property of the SQL function
 * body itself (single-statement, single-transaction FOR UPDATE + UPDATE),
 * not of this JS wrapper.
 */

function makeFakeRpcDb(slotStore) {
  return {
    async rpc(fnName, params) {
      if (fnName === 'mentor_reserve_slot') {
        const slot = slotStore.slots[params.p_slot_id]
        if (!slot) return { data: { success: false, error: 'slot_not_found' }, error: null }
        const now = Date.now()
        const stillReserved = slot.status === 'reserved' && slot.reservation_expires_at && slot.reservation_expires_at > now
        if (slot.status === 'booked' || stillReserved) {
          return { data: { success: false, error: 'slot_no_longer_available' }, error: null }
        }
        // Duplicate (mentor, mentee, scheduled_start) guard, mirrors uq_mentor_mentee_start
        const dupKey = `${params.p_mentor_id}|${params.p_mentee_id}|${params.p_scheduled_start}`
        if (slotStore.bookingKeys.has(dupKey)) {
          return { data: null, error: { message: 'duplicate key value violates unique constraint "uq_mentor_mentee_start"' } }
        }
        slot.status = 'reserved'
        slot.reservation_expires_at = now + params.p_hold_minutes * 60000
        const bookingId = `booking-${Object.keys(slotStore.bookings).length + 1}`
        slotStore.bookings[bookingId] = { status: 'pending_payment', slot_id: params.p_slot_id }
        slotStore.bookingKeys.add(dupKey)
        return { data: { success: true, booking_id: bookingId, slot_id: params.p_slot_id }, error: null }
      }
      if (fnName === 'mentor_confirm_booking') {
        const booking = slotStore.bookings[params.p_booking_id]
        if (!booking) return { data: { success: false, error: 'booking_not_found' }, error: null }
        if (booking.status !== 'pending_payment') return { data: { success: false, error: 'invalid_state' }, error: null }
        booking.status = 'confirmed'
        slotStore.slots[booking.slot_id].status = 'booked'
        return { data: { success: true, booking_id: params.p_booking_id }, error: null }
      }
      if (fnName === 'mentor_release_booking') {
        const booking = slotStore.bookings[params.p_booking_id]
        if (!booking) return { data: { success: false, error: 'booking_not_found' }, error: null }
        booking.status = params.p_new_status
        const slot = slotStore.slots[booking.slot_id]
        if (slot.status !== 'booked') { slot.status = 'available'; slot.reservation_expires_at = null }
        return { data: { success: true, booking_id: params.p_booking_id }, error: null }
      }
      throw new Error(`unexpected rpc ${fnName}`)
    },
  }
}

function freshStore() {
  return { slots: { s1: { status: 'available', reservation_expires_at: null } }, bookings: {}, bookingKeys: new Set() }
}

describe('reserveSlot', () => {
  test('successful reservation returns bookingId', async () => {
    const db = makeFakeRpcDb(freshStore())
    const result = await reserveSlot(db, { slotId: 's1', mentorId: 'm1', menteeId: 'u1', scheduledStart: '2026-08-01T10:00:00Z', scheduledEnd: '2026-08-01T11:00:00Z', priceAmount: 500, currency: 'INR' })
    assert.equal(result.success, true)
    assert.ok(result.bookingId)
  })

  test('second concurrent-style reservation on the same slot loses cleanly (no double booking)', async () => {
    const store = freshStore()
    const db = makeFakeRpcDb(store)
    const first = await reserveSlot(db, { slotId: 's1', mentorId: 'm1', menteeId: 'u1', scheduledStart: '2026-08-01T10:00:00Z', scheduledEnd: '2026-08-01T11:00:00Z', priceAmount: 500, currency: 'INR' })
    const second = await reserveSlot(db, { slotId: 's1', mentorId: 'm1', menteeId: 'u2', scheduledStart: '2026-08-01T10:00:00Z', scheduledEnd: '2026-08-01T11:00:00Z', priceAmount: 500, currency: 'INR' })
    assert.equal(first.success, true)
    assert.equal(second.success, false)
    assert.equal(second.error, SLOT_RESERVATION_ERRORS.SLOT_UNAVAILABLE)
    assert.equal(second.httpStatus, 409)
  })

  test('reserving a nonexistent slot returns 404', async () => {
    const db = makeFakeRpcDb(freshStore())
    const result = await reserveSlot(db, { slotId: 'nope', mentorId: 'm1', menteeId: 'u1', scheduledStart: '2026-08-01T10:00:00Z', scheduledEnd: '2026-08-01T11:00:00Z', priceAmount: 500, currency: 'INR' })
    assert.equal(result.success, false)
    assert.equal(result.httpStatus, 404)
  })

  test('duplicate (mentor, mentee, scheduled_start) is rejected as 409 duplicate_booking', async () => {
    const store = freshStore()
    store.slots.s2 = { status: 'available', reservation_expires_at: null }
    const db = makeFakeRpcDb(store)
    await reserveSlot(db, { slotId: 's1', mentorId: 'm1', menteeId: 'u1', scheduledStart: '2026-08-01T10:00:00Z', scheduledEnd: '2026-08-01T11:00:00Z', priceAmount: 500, currency: 'INR' })
    const dup = await reserveSlot(db, { slotId: 's2', mentorId: 'm1', menteeId: 'u1', scheduledStart: '2026-08-01T10:00:00Z', scheduledEnd: '2026-08-01T11:00:00Z', priceAmount: 500, currency: 'INR' })
    assert.equal(dup.success, false)
    assert.equal(dup.error, SLOT_RESERVATION_ERRORS.DUPLICATE_BOOKING)
    assert.equal(dup.httpStatus, 409)
  })

  test('a slot with an EXPIRED reservation can be re-reserved', async () => {
    const store = freshStore()
    store.slots.s1.status = 'reserved'
    store.slots.s1.reservation_expires_at = Date.now() - 1000 // already expired
    const db = makeFakeRpcDb(store)
    const result = await reserveSlot(db, { slotId: 's1', mentorId: 'm1', menteeId: 'u2', scheduledStart: '2026-08-01T10:00:00Z', scheduledEnd: '2026-08-01T11:00:00Z', priceAmount: 500, currency: 'INR' })
    assert.equal(result.success, true)
  })
})

describe('confirmBooking / releaseBooking', () => {
  test('confirming a pending_payment booking books the slot', async () => {
    const store = freshStore()
    const db = makeFakeRpcDb(store)
    const reserved = await reserveSlot(db, { slotId: 's1', mentorId: 'm1', menteeId: 'u1', scheduledStart: '2026-08-01T10:00:00Z', scheduledEnd: '2026-08-01T11:00:00Z', priceAmount: 500, currency: 'INR' })
    const confirmed = await confirmBooking(db, { bookingId: reserved.bookingId })
    assert.equal(confirmed.success, true)
    assert.equal(store.slots.s1.status, 'booked')
  })

  test('cannot confirm an already-confirmed booking twice', async () => {
    const store = freshStore()
    const db = makeFakeRpcDb(store)
    const reserved = await reserveSlot(db, { slotId: 's1', mentorId: 'm1', menteeId: 'u1', scheduledStart: '2026-08-01T10:00:00Z', scheduledEnd: '2026-08-01T11:00:00Z', priceAmount: 500, currency: 'INR' })
    await confirmBooking(db, { bookingId: reserved.bookingId })
    const second = await confirmBooking(db, { bookingId: reserved.bookingId })
    assert.equal(second.success, false)
  })

  test('releasing a booking frees the slot back to available', async () => {
    const store = freshStore()
    const db = makeFakeRpcDb(store)
    const reserved = await reserveSlot(db, { slotId: 's1', mentorId: 'm1', menteeId: 'u1', scheduledStart: '2026-08-01T10:00:00Z', scheduledEnd: '2026-08-01T11:00:00Z', priceAmount: 500, currency: 'INR' })
    const released = await releaseBooking(db, { bookingId: reserved.bookingId, newStatus: 'cancelled_by_mentee', reason: 'test' })
    assert.equal(released.success, true)
    assert.equal(store.slots.s1.status, 'available')
  })
})
