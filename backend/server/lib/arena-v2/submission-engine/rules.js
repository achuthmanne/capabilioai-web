/**
 * submission-engine/rules.js — Milestone 8
 * ---------------------------------------------------------------------------
 * Pure gate: decides whether a submission attempt is allowed at all, and
 * whether it counts as timed-out (the signal Assessment's zero-effort rule
 * consumes — see assessment/engine.js). No I/O — service.js calls this on
 * data it already has in hand, same pattern as challenge-delivery/expiry.js.
 *
 * `submission_rules` shape (av2_challenge_instances.submission_rules,
 * authored per template — content_spec/08): `{ maxAttempts?: number,
 * timeLimitSecs?: number }`. Both optional; absence means "unlimited."
 */
const TERMINAL_INSTANCE_STATUSES = ["graded", "expired", "abandoned"]

export class SubmissionNotAllowedError extends Error {
  constructor(reason) {
    super(reason)
    this.name = "SubmissionNotAllowedError"
  }
}

/**
 * @param {{ instance: object, attemptCount: number, timeTakenSecs?: number }} input
 * @returns {{ allowed: boolean, reason?: string, isTimedOut: boolean }}
 */
export function checkSubmissionAllowed({ instance, attemptCount, timeTakenSecs = null }) {
  if (!instance) return { allowed: false, reason: "No such challenge instance", isTimedOut: false }

  if (TERMINAL_INSTANCE_STATUSES.includes(instance.status)) {
    return { allowed: false, reason: `This challenge is ${instance.status} and no longer accepting submissions`, isTimedOut: false }
  }

  const maxAttempts = instance.submission_rules?.maxAttempts
  if (typeof maxAttempts === "number" && attemptCount >= maxAttempts) {
    return { allowed: false, reason: `Maximum attempts (${maxAttempts}) already reached for this challenge`, isTimedOut: false }
  }

  const timeLimitSecs = instance.submission_rules?.timeLimitSecs
  const isTimedOut = typeof timeLimitSecs === "number" && typeof timeTakenSecs === "number" && timeTakenSecs > timeLimitSecs

  // A late submission is still allowed — it gets graded, just capped by
  // Assessment's zero-effort rule (Arena V1's timeout-exploit fix,
  // preserved). Rejecting it outright would throw away real work; capping
  // it is the actual fix.
  return { allowed: true, isTimedOut }
}
