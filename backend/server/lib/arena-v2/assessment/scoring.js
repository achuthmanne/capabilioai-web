/**
 * assessment/scoring.js — Milestone 8
 * ---------------------------------------------------------------------------
 * Pure combination logic for the Assessment stage (blueprint: "validator +
 * rubric + capped AI supplement + timing + code quality — never AI-only",
 * av2_assessments' column comment). No I/O.
 *
 * SCOPE THIS MILESTONE: only `validatorScore` has a real, non-null input
 * today — `ground_truth_compare` is the only wired validator (registry.js),
 * and it never produces a rubric score or an AI review. `rubricScore`,
 * `aiReviewScore`/`aiReviewWeight` are threaded through as parameters (not
 * hardcoded away) so the *shape* of Assessment is correct now and a future
 * milestone can populate them for real (e.g. once `rubric_review` gets a
 * submission-validator implementation) without changing this function's
 * contract — see docs/future-improvements.md.
 *
 * ZERO-EFFORT / TIMEOUT-EXPLOIT FIX: carries forward the exact shape of
 * Arena V1's fix (backend/server/lib/grading-worker.js:
 * `Math.min(30, aiReview?.score || 0)` when `is_timed_out`) — a timed-out
 * submission is still graded (so a genuine near-complete attempt isn't
 * thrown away), but its score is capped low so finishing late is never as
 * good as finishing on time. `isZeroEffort` on the Assessment row is exactly
 * this flag, generalized beyond just "timed out" to any submission judged
 * to be effectively a non-attempt.
 */
export const ZERO_EFFORT_SCORE_CAP = 30

/**
 * Timing modifier is intentionally 0 in this milestone — there's no signal
 * yet to compute a graduated bonus/penalty from beyond the binary timeout
 * flag (handled separately via isZeroEffort's hard cap, not a modifier).
 * Threaded through explicitly rather than omitted so a future milestone
 * (e.g. "reward completions well under the time budget") has an obvious
 * place to plug in real logic. Flagged in docs/future-improvements.md.
 */
export function computeTimingModifier() {
  return 0
}

/**
 * @param {{ validatorScore: number, rubricScore?: number|null,
 *           aiReviewScore?: number|null, aiReviewWeight?: number,
 *           timingModifier?: number, isZeroEffort?: boolean }} input
 * @returns {number} final score, 0-100
 */
export function computeFinalScore({
  validatorScore,
  rubricScore = null,
  aiReviewScore = null,
  aiReviewWeight = 0,
  timingModifier = 0,
  isZeroEffort = false,
}) {
  if (typeof validatorScore !== "number" || Number.isNaN(validatorScore)) {
    throw new Error("computeFinalScore: validatorScore must be a number")
  }

  // Base: validator is always authoritative. A rubric score, if present,
  // is blended in alongside it (never used alone — "never AI-only").
  let base = validatorScore
  if (typeof rubricScore === "number") {
    base = (base + rubricScore) / 2
  }
  // Capped AI supplement — weight is expected to already be pre-capped by
  // whatever produces it (rubric_review's aiReviewWeightCap, 05-validators.md);
  // this function does not itself enforce a ceiling on aiReviewWeight, since
  // no validator implemented in this milestone ever sets one above 0.
  if (typeof aiReviewScore === "number" && aiReviewWeight > 0) {
    base = base * (1 - aiReviewWeight) + aiReviewScore * aiReviewWeight
  }

  let final = base + timingModifier
  if (isZeroEffort) {
    final = Math.min(final, ZERO_EFFORT_SCORE_CAP)
  }

  return Math.max(0, Math.min(100, Math.round(final * 100) / 100))
}
