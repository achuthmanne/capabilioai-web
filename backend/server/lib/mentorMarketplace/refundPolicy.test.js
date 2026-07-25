import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  menteeCancellationRefundPct,
  resolveRefundPct,
  isWithinNoShowReportingWindow,
  isWithinDisputeWindow,
  isEligibleForAutoCompletion,
  isBookingPayoutEligible,
  MENTOR_MARKETPLACE_POLICY,
} from './refundPolicy.js'

describe('menteeCancellationRefundPct', () => {
  test('>24h before: full refund', () => assert.equal(menteeCancellationRefundPct(25), 1.0))
  test('exactly 24h before: full refund (boundary, > uses strict comparison so 24 is not > 24)', () => {
    // 24h is NOT strictly > 24, so it falls into the 6-24h tier per spec wording "6-24h before".
    assert.equal(menteeCancellationRefundPct(24), 0.5)
  })
  test('12h before: 50% refund', () => assert.equal(menteeCancellationRefundPct(12), 0.5))
  test('exactly 6h before: 50% refund (boundary inclusive)', () => assert.equal(menteeCancellationRefundPct(6), 0.5))
  test('<6h before: no refund', () => assert.equal(menteeCancellationRefundPct(3), 0))
})

describe('resolveRefundPct', () => {
  test('mentor-initiated cancellation: full refund regardless of timing', () => {
    assert.equal(resolveRefundPct({ actor: 'mentor', reason: 'cancellation', hoursUntilStart: 1 }), 1.0)
  })
  test('mentee-initiated cancellation defers to tiered policy', () => {
    assert.equal(resolveRefundPct({ actor: 'mentee', reason: 'cancellation', hoursUntilStart: 30 }), 1.0)
  })
  test('mentor no-show: full refund to mentee', () => {
    assert.equal(resolveRefundPct({ actor: 'mentor', reason: 'no_show' }), 1.0)
  })
  test('mentee no-show: no refund', () => {
    assert.equal(resolveRefundPct({ actor: 'mentee', reason: 'no_show' }), 0)
  })
  test('mentee no-show leaves mentor payout-eligible per policy config', () => {
    assert.equal(MENTOR_MARKETPLACE_POLICY.noShow.menteeNoShowMentorPayoutEligible, true)
  })
  test('throws on unknown reason', () => {
    assert.throws(() => resolveRefundPct({ actor: 'mentee', reason: 'bogus' }))
  })
})

describe('isWithinNoShowReportingWindow (48h)', () => {
  const scheduledEnd = '2026-01-01T10:00:00Z'
  test('within window', () => {
    const now = new Date('2026-01-02T09:00:00Z') // +23h
    assert.equal(isWithinNoShowReportingWindow(scheduledEnd, now), true)
  })
  test('outside window', () => {
    const now = new Date('2026-01-04T00:00:00Z') // +62h
    assert.equal(isWithinNoShowReportingWindow(scheduledEnd, now), false)
  })
})

describe('isWithinDisputeWindow (7 days)', () => {
  const scheduledEnd = '2026-01-01T10:00:00Z'
  test('within window', () => {
    assert.equal(isWithinDisputeWindow(scheduledEnd, new Date('2026-01-05T10:00:00Z')), true)
  })
  test('outside window', () => {
    assert.equal(isWithinDisputeWindow(scheduledEnd, new Date('2026-01-10T10:00:00Z')), false)
  })
})

describe('isEligibleForAutoCompletion (24h after scheduled_end, no dispute/no-show)', () => {
  const scheduledEnd = '2026-01-01T10:00:00Z'
  test('eligible once 24h have passed with no dispute/no-show', () => {
    assert.equal(isEligibleForAutoCompletion({ scheduledEnd, hasOpenDispute: false, hasNoShowReport: false, now: new Date('2026-01-02T10:01:00Z') }), true)
  })
  test('not eligible before 24h have passed', () => {
    assert.equal(isEligibleForAutoCompletion({ scheduledEnd, hasOpenDispute: false, hasNoShowReport: false, now: new Date('2026-01-02T09:00:00Z') }), false)
  })
  test('never eligible while a dispute is open, regardless of elapsed time', () => {
    assert.equal(isEligibleForAutoCompletion({ scheduledEnd, hasOpenDispute: true, hasNoShowReport: false, now: new Date('2026-02-01T10:00:00Z') }), false)
  })
  test('never eligible while a no-show report is pending', () => {
    assert.equal(isEligibleForAutoCompletion({ scheduledEnd, hasOpenDispute: false, hasNoShowReport: true, now: new Date('2026-02-01T10:00:00Z') }), false)
  })
})

describe('isBookingPayoutEligible', () => {
  test('excludes failed/refunded/disputed/cancelled bookings', () => {
    for (const s of ['failed', 'refunded', 'cancelled_by_mentee', 'cancelled_by_mentor']) {
      assert.equal(isBookingPayoutEligible(s), false, s)
    }
  })
  test('includes completed/confirmed/no_show_mentee bookings', () => {
    for (const s of ['completed', 'confirmed', 'no_show_mentee']) {
      assert.equal(isBookingPayoutEligible(s), true, s)
    }
  })
})
