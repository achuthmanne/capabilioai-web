/**
 * events/assessmentCompletedEvent.js — pre-Milestone 10
 * ---------------------------------------------------------------------------
 * Per your recommendation: a small, consistent internal object representing
 * "assessment completed," rather than passing `{ assessment, instance,
 * submission, rewardResult }` around as four separate parameters to every
 * downstream consumer. No event bus, no pub/sub — just a factory that
 * builds one well-shaped object, constructed once in submission-engine/
 * service.js right after the Reward Engine runs.
 *
 *   AssessmentCompletedEvent
 *   ├── assessment    the persisted av2_assessments row
 *   ├── instance      the av2_challenge_instances row
 *   ├── submission    the persisted av2_submissions row
 *   └── rewardResult  reward-engine/engine.js's output ({ eloEntry, xpEntry, skillProgress, alreadyApplied })
 *
 * Milestone 10's Portfolio Decision is the first consumer. The intent,
 * stated explicitly so it isn't re-litigated later: Analytics,
 * Notifications, Certificates, and Recruiter feeds should all be able to
 * consume this SAME object shape without any of submission-engine/service.js's
 * call sites changing — a new consumer is a new function that takes an
 * `AssessmentCompletedEvent`, not a new parameter threaded through existing
 * signatures.
 *
 * This is intentionally the dumbest possible "event" — a plain, frozen
 * object, no emitter, no listeners, no async dispatch. If genuine
 * fan-out/decoupling is ever needed (e.g. Portfolio Decision and Analytics
 * both reacting to the same event without submission-engine/service.js
 * having to call each one by name), that's the point to introduce a real
 * event bus — not before.
 */
export class InvalidAssessmentCompletedEventError extends Error {
  constructor(issues) {
    super(`Invalid AssessmentCompletedEvent: ${issues.join("; ")}`)
    this.name = "InvalidAssessmentCompletedEventError"
    this.issues = issues
  }
}

/**
 * @param {{ assessment: object, instance: object, submission: object, rewardResult: object }} input
 * @returns {Readonly<object>} a frozen AssessmentCompletedEvent
 */
export function createAssessmentCompletedEvent({ assessment, instance, submission, rewardResult }) {
  const issues = []
  if (!assessment) issues.push("assessment is required")
  if (!instance) issues.push("instance is required")
  if (!submission) issues.push("submission is required")
  if (!rewardResult) issues.push("rewardResult is required")
  if (issues.length) throw new InvalidAssessmentCompletedEventError(issues)

  return Object.freeze({ assessment, instance, submission, rewardResult })
}
