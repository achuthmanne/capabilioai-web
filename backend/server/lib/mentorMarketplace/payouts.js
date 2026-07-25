/**
 * payouts.js — Career OS Workstream 4.
 *
 * V1 supports ADMIN-TRIGGERED PAYOUT BATCHES ONLY. There is no automated
 * Razorpay Route disbursement anywhere in this module or anywhere else in
 * the codebase — this sandbox cannot confirm Razorpay Route capability or
 * the linked-account/KYC prerequisites for it, so automating transfers is
 * explicitly out of scope and flagged as an open item requiring real
 * account verification. Every function here computes eligibility/amounts
 * and writes a batch + line items; the actual money movement is a manual
 * step an admin performs outside this system, then records via
 * `transfer_reference` on the batch.
 *
 * Do not rename anything here to "automated payout" — see workstream
 * instructions. This is "admin-triggered payout batch" creation logic only.
 */
import { isBookingPayoutEligible, MENTOR_MARKETPLACE_POLICY } from './refundPolicy.js'

/**
 * Finds bookings for a mentor in [periodStart, periodEnd] that are eligible
 * for payout and not already claimed by a previous batch (mentor_payout_line_items
 * has UNIQUE(booking_id) at the DB level as the hard guarantee; this function
 * additionally filters using an explicit exclusion set for defense in depth).
 */
export async function findEligibleBookings(db, { mentorId, periodStart, periodEnd }) {
  const { data: bookings, error } = await db
    .from('mentor_bookings')
    .select('id, status, price_amount, currency, scheduled_start')
    .eq('mentor_id', mentorId)
    .gte('scheduled_start', periodStart)
    .lte('scheduled_start', periodEnd)
  if (error) throw error

  const { data: alreadyPaidLineItems } = await db
    .from('mentor_payout_line_items')
    .select('booking_id')
  const alreadyPaidIds = new Set((alreadyPaidLineItems || []).map(li => li.booking_id))

  // Exclude bookings with an unresolved (open/investigating) dispute — "on-hold".
  const { data: openDisputeBookingIds } = await db
    .from('mentor_disputes')
    .select('booking_id')
    .in('status', ['open', 'investigating'])
  const onHoldIds = new Set((openDisputeBookingIds || []).map(d => d.booking_id))

  return (bookings || []).filter(b =>
    isBookingPayoutEligible(b.status) &&
    !alreadyPaidIds.has(b.id) &&
    !onHoldIds.has(b.id)
  )
}

/**
 * Creates a payout batch (status='draft') + line items for all currently
 * eligible bookings in the period, computing platform fee split. Does NOT
 * mark it 'paid' — that's a separate explicit admin action once the manual
 * transfer has actually happened (see markPayoutPaid below).
 */
export async function createPayoutBatch(db, { mentorId, periodStart, periodEnd, adminId, platformFeePct = MENTOR_MARKETPLACE_POLICY.payout.defaultPlatformFeePct, currency = 'INR', taxInvoiceRequired = false }) {
  const eligible = await findEligibleBookings(db, { mentorId, periodStart, periodEnd })
  if (eligible.length === 0) {
    return { success: false, error: 'no_eligible_bookings' }
  }

  const grossAmount = eligible.reduce((sum, b) => sum + Number(b.price_amount), 0)
  const platformFeeAmount = round2(grossAmount * platformFeePct)
  const netAmount = round2(grossAmount - platformFeeAmount)

  const { data: payout, error: payoutError } = await db
    .from('mentor_payouts')
    .insert({
      mentor_id: mentorId,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'draft',
      platform_fee_pct: platformFeePct,
      gross_amount: grossAmount,
      platform_fee_amount: platformFeeAmount,
      net_amount: netAmount,
      currency,
      tax_invoice_required: taxInvoiceRequired,
      triggered_by_admin_id: adminId,
    })
    .select()
    .single()
  if (payoutError) throw payoutError

  const lineItems = eligible.map(b => ({ payout_id: payout.id, booking_id: b.id, amount: b.price_amount }))
  const { error: lineItemsError } = await db.from('mentor_payout_line_items').insert(lineItems)
  if (lineItemsError) throw lineItemsError

  await db.from('mentor_audit_log').insert({
    entity_type: 'mentor_payout', entity_id: payout.id, actor_id: adminId,
    action: 'payout_batch_created', to_status: 'draft',
    note: `admin-triggered payout batch: ${eligible.length} bookings, gross ${grossAmount} ${currency}`,
  })

  return { success: true, payout, bookingCount: eligible.length, grossAmount, platformFeeAmount, netAmount }
}

/** Admin finalizes a draft batch (locks it — no more bookings can be added). */
export async function finalizePayoutBatch(db, { payoutId, adminId }) {
  const { data, error } = await db.from('mentor_payouts').update({ status: 'finalized', finalized_at: new Date().toISOString() }).eq('id', payoutId).select().single()
  if (error) throw error
  await db.from('mentor_audit_log').insert({ entity_type: 'mentor_payout', entity_id: payoutId, actor_id: adminId, action: 'payout_batch_finalized', from_status: 'draft', to_status: 'finalized' })
  return { success: true, payout: data }
}

/**
 * Admin records that the manual transfer has actually happened (there is no
 * automated disbursement). `transferReference` is a free-text field for
 * whatever reference the admin's manual transfer produced (bank reference
 * number, manual Razorpay Payout Links reference, etc — NOT a Razorpay
 * Route automated transfer id, since Route is not confirmed/enabled here).
 */
export async function markPayoutPaid(db, { payoutId, adminId, transferReference, taxInvoiceNumber }) {
  if (!transferReference?.trim()) {
    return { success: false, error: 'transfer_reference_required' }
  }
  const { data, error } = await db
    .from('mentor_payouts')
    .update({ status: 'paid', paid_at: new Date().toISOString(), transfer_reference: transferReference, tax_invoice_number: taxInvoiceNumber || null })
    .eq('id', payoutId)
    .select()
    .single()
  if (error) throw error
  await db.from('mentor_audit_log').insert({ entity_type: 'mentor_payout', entity_id: payoutId, actor_id: adminId, action: 'payout_batch_marked_paid_admin_triggered', from_status: 'finalized', to_status: 'paid', note: `transfer_reference=${transferReference}` })
  return { success: true, payout: data }
}

function round2(n) { return Math.round(n * 100) / 100 }
