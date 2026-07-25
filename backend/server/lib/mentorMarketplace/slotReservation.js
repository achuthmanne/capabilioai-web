/**
 * slotReservation.js — Career OS Workstream 4.
 *
 * Wraps the SECURITY DEFINER Postgres functions defined in
 * career_os_ws4_mentor_marketplace_migration.sql:
 *   - mentor_reserve_slot   (row-locked reserve + create pending_payment booking)
 *   - mentor_confirm_booking (pending_payment -> confirmed, slot -> booked)
 *   - mentor_release_booking (any non-terminal -> cancelled/failed/etc, slot -> available)
 *
 * WHY AN RPC AND NOT TWO SEPARATE supabase-js CALLS: Supabase's REST API is
 * stateless per HTTP request — there is no way to hold a `SELECT ... FOR
 * UPDATE` row lock open across two separate supabase-js calls from Node.
 * The row lock + the state check + the write all have to happen inside a
 * single Postgres statement/transaction, which means a plpgsql function
 * body is the only correct place for it. This module is a thin, testable
 * wrapper around that RPC — it owns request validation and error-shape
 * translation, not the locking itself (that's the DB's job).
 */
import { MENTOR_MARKETPLACE_POLICY } from './refundPolicy.js'

export const SLOT_RESERVATION_ERRORS = Object.freeze({
  SLOT_NOT_FOUND: 'slot_not_found',
  SLOT_UNAVAILABLE: 'slot_no_longer_available',
  DUPLICATE_BOOKING: 'duplicate_booking',
})

/**
 * Attempts to reserve a slot and create a pending_payment booking.
 * @param {object} db - supabaseAdmin-like client exposing .rpc()
 * @param {object} params
 * @returns {Promise<{success:true, bookingId:string, slotId:string} | {success:false, error:string, httpStatus:number}>}
 */
export async function reserveSlot(db, { slotId, mentorId, menteeId, scheduledStart, scheduledEnd, priceAmount, currency, holdMinutes = MENTOR_MARKETPLACE_POLICY.reservation.holdMinutes }) {
  const { data, error } = await db.rpc('mentor_reserve_slot', {
    p_slot_id: slotId,
    p_mentor_id: mentorId,
    p_mentee_id: menteeId,
    p_scheduled_start: scheduledStart,
    p_scheduled_end: scheduledEnd,
    p_price_amount: priceAmount,
    p_currency: currency,
    p_hold_minutes: holdMinutes,
  })

  if (error) {
    // Unique-constraint violations (e.g. uq_mentor_mentee_start) surface as
    // Postgres errors from the INSERT inside the function, not the jsonb
    // return value, if they happen outside the function's own catch block.
    if (String(error.message || '').includes('uq_mentor_mentee_start')) {
      return { success: false, error: SLOT_RESERVATION_ERRORS.DUPLICATE_BOOKING, httpStatus: 409 }
    }
    return { success: false, error: error.message || 'reservation_failed', httpStatus: 500 }
  }

  if (!data?.success) {
    const httpStatus = data?.error === SLOT_RESERVATION_ERRORS.SLOT_NOT_FOUND ? 404 : 409
    return { success: false, error: data?.error || 'reservation_failed', httpStatus }
  }

  return { success: true, bookingId: data.booking_id, slotId: data.slot_id }
}

/** Confirms a booking on a verified captured payment. */
export async function confirmBooking(db, { bookingId, actorId = null }) {
  const { data, error } = await db.rpc('mentor_confirm_booking', { p_booking_id: bookingId, p_actor_id: actorId })
  if (error) return { success: false, error: error.message || 'confirm_failed' }
  if (!data?.success) return { success: false, error: data?.error || 'confirm_failed' }
  return { success: true, bookingId: data.booking_id }
}

/** Releases a slot back to available and moves the booking to a terminal/cancelled state. */
export async function releaseBooking(db, { bookingId, newStatus, actorId = null, reason = null }) {
  const { data, error } = await db.rpc('mentor_release_booking', {
    p_booking_id: bookingId,
    p_new_status: newStatus,
    p_actor_id: actorId,
    p_reason: reason,
  })
  if (error) return { success: false, error: error.message || 'release_failed' }
  if (!data?.success) return { success: false, error: data?.error || 'release_failed' }
  return { success: true, bookingId: data.booking_id }
}
