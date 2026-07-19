/**
 * submission-engine/dto.js — Milestones 8 & 9
 * ---------------------------------------------------------------------------
 * Pure. Builds the client-safe Feedback DTO from a persisted submission +
 * assessment row (+ optionally a reward result) — the return-path
 * counterpart to challenge-delivery/dto.js's ChallengeResponseDto
 * (Milestone 6).
 *
 * SECURITY DECISION, same discipline as Milestone 6: this DTO never includes
 * `instance.validator` (the grading config/answer key), never includes the
 * raw `submission.submission_data` of any OTHER student, and never includes
 * anything beyond `assessment.feedback` (already scrubbed of secrets by the
 * Validator stage itself — see submission-validators/groundTruthCompare.js's
 * own no-leak guarantee, and validatorResult.js's canonical shape). If a
 * future validator type's `evidence[]` ever risks including something
 * sensitive, scrub it in that validator, not here — this DTO trusts
 * `feedback` because upstream stages already guarantee it's safe.
 *
 * `submission.validator_result` is the canonical ValidatorResult shape
 * (validatorResult.js: `{ passed, score, evidence, timing, diagnostics,
 * metadata }`) — this DTO reads only `.passed` from it, sourced from the
 * Validator stage itself rather than inferred from `finalScore === 100`, so
 * a future validator type that reasonably passes below 100 (e.g.
 * `numeric_tolerance` with partial credit) is still reported correctly.
 *
 * MILESTONE 9 ADDITION: an optional `rewardResult` (reward-engine/engine.js's
 * output) surfaces a `rewards` block. This is purely additive — a caller
 * that omits `rewardResult` gets the exact same DTO shape Milestone 8
 * shipped, so no schemaVersion bump was needed (additive fields are exactly
 * what a schemaVersion is meant to make safe to add without breaking
 * existing clients). This DTO stays ignorant of HOW rewards were computed
 * (ELO formula, XP formula, mastery thresholds) — it only reads the
 * reward-engine's already-finished output, same arm's-length relationship
 * it has with `assessment.feedback`.
 *
 * MILESTONE 10 ADDITION: an optional `portfolioOutcome` (portfolio/engine.js's
 * output) surfaces a `portfolio` block — same additive, no-schema-bump
 * pattern as Milestone 9's `rewards`. This DTO does not know WHY an
 * artifact was or wasn't created (threshold math, eligibility rules); it
 * only reports what portfolio/engine.js already decided. It never includes
 * the full `recruiter_evidence` object here — only enough for the student's
 * own submit-flow UI to know what happened (created vs not, published vs
 * draft). The full recruiter-facing view is a separate, explicit read
 * (routes/arenaV2Portfolio.js), not bundled into every submission response.
 */
export const FEEDBACK_DTO_SCHEMA_VERSION = "v1"

function buildRewardsBlock(rewardResult) {
  if (!rewardResult) return null
  const { eloEntry, xpEntry, skillProgress } = rewardResult
  return {
    type: eloEntry ? "elo" : "xp",
    elo: eloEntry ? { before: eloEntry.eloBefore ?? eloEntry.elo_before, after: eloEntry.eloAfter ?? eloEntry.elo_after, delta: eloEntry.delta } : null,
    xp: xpEntry ? { gained: xpEntry.xpGained ?? xpEntry.xp_gained, streakCounted: xpEntry.streakCounted ?? xpEntry.streak_counted } : null,
    skill: skillProgress
      ? { masteryState: skillProgress.masteryState ?? skillProgress.mastery_state, bestScore: skillProgress.bestScore ?? skillProgress.best_score }
      : null,
  }
}

function buildPortfolioBlock(portfolioOutcome) {
  if (!portfolioOutcome) return null
  const { decisionType, artifact } = portfolioOutcome
  return {
    decisionType,
    artifactCreated: !!artifact,
    publishState: artifact?.publishState ?? artifact?.publish_state ?? null,
  }
}

export function buildFeedbackResponseDto({ submission, assessment, rewardResult = null, portfolioOutcome = null }) {
  return {
    schemaVersion: FEEDBACK_DTO_SCHEMA_VERSION,
    submissionId: submission.id,
    challengeInstanceId: submission.instance_id,
    attemptNumber: submission.attempt_number,
    status: submission.status,
    isTimedOut: submission.is_timed_out,

    passed: !!submission.validator_result?.passed,
    finalScore: assessment.final_score,
    isZeroEffort: assessment.is_zero_effort,
    feedback: assessment.feedback,
    rewards: buildRewardsBlock(rewardResult),
    portfolio: buildPortfolioBlock(portfolioOutcome),

    submittedAt: submission.submitted_at,
    gradedAt: assessment.created_at,
  }
}
