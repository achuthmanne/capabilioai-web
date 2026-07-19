/**
 * assessment/engine.js — Milestone 8, normalized pre-M9
 * ---------------------------------------------------------------------------
 * The Assessment stage: combines a validator result with (currently absent)
 * rubric/AI signals and the zero-effort/timeout rule into one persisted
 * av2_assessments row. This is the ONLY writer of av2_assessments — ELO/XP
 * posting (av2_elo_ledger / av2_xp_ledger) is explicitly Milestone 9's job,
 * not this one (per your own roadmap: "Milestone 9 — ELO/XP/Skill
 * Progression"). This engine does not read or write either ledger.
 *
 * BOUNDARY, reinforced by the ValidatorResult normalization: this module
 * consumes only the canonical shape (validatorResult.js) — `passed`,
 * `score`, `evidence`, `diagnostics`. It has zero validator-type-specific
 * logic (no "if this was SQL, do X"); that's exactly what makes it safe for
 * Milestone 9's Reward Engine to sit downstream of THIS module's output
 * (Assessment's Result: finalScore, isZeroEffort, rewardRules) without ever
 * needing to know how any given challenge was graded either.
 *
 * The public, student-facing `feedback.detail` field name (frozen since
 * Milestone 8's Feedback DTO, already tested/consumed by the frontend) is
 * intentionally kept as-is even though the internal field is now named
 * `evidence` — this is a deliberate translation at the boundary between the
 * internal ValidatorResult shape and the external, already-shipped DTO
 * contract, not an inconsistency.
 *
 * Dependency-injected, same pattern as every prior milestone.
 */
import * as repo from "./repository.js"
import { computeFinalScore, computeTimingModifier } from "./scoring.js"

export const defaultDeps = {
  insertAssessment: repo.insertAssessment,
}

/**
 * @param {{ submission: object, instance: object, validatorResult: { passed: boolean, score: number, evidence: Array, diagnostics: Array } }} input
 * @param {object} deps
 * @returns {Promise<object>} the persisted av2_assessments row
 */
export async function assembleAssessment({ submission, instance, validatorResult }, deps = defaultDeps) {
  if (!submission) throw new Error("assembleAssessment: submission is required")
  if (!instance) throw new Error("assembleAssessment: instance is required")
  if (!validatorResult || typeof validatorResult.score !== "number") {
    throw new Error("assembleAssessment: validatorResult with a numeric score is required")
  }

  // isZeroEffort today reflects exactly one real signal: the submission
  // engine's own timeout check (submission-engine/rules.js). Rubric-driven
  // or AI-driven zero-effort detection (e.g. an empty rubric_review
  // submission) is out of scope until that validator type is implemented —
  // see docs/future-improvements.md.
  const isZeroEffort = !!submission.is_timed_out
  const timingModifier = computeTimingModifier()

  const finalScore = computeFinalScore({
    validatorScore: validatorResult.score,
    rubricScore: null,
    aiReviewScore: null,
    aiReviewWeight: 0,
    timingModifier,
    isZeroEffort,
  })

  // isZeroEffort is checked FIRST, ahead of validatorResult.passed: a
  // correct-but-late submission still gets its score capped (the whole
  // point of the timeout-exploit fix), so the summary must say so rather
  // than reporting a plain "passed" that would contradict the capped score
  // sitting right next to it.
  const feedback = {
    summary: isZeroEffort
      ? "Submitted after the time limit — graded, but capped since it was late."
      : validatorResult.passed
        ? "Your submission passed validation."
        : "Your submission did not pass validation.",
    // Translation, not renaming-in-place: internal ValidatorResult.evidence
    // -> public FeedbackDto.detail. diagnostics (execution-level problems,
    // e.g. "your SQL failed to execute") are folded in as informational,
    // non-graded entries so the student still sees why nothing else could
    // be graded, without conflating them with real per-criterion evidence.
    detail: [
      ...(validatorResult.evidence || []),
      ...(validatorResult.diagnostics || []).map((message) => ({ metric: "execution", expected: null, actual: message, passed: false, info: true })),
    ],
  }

  return deps.insertAssessment({
    submissionId: submission.id,
    instanceId: instance.id,
    userId: submission.user_id,
    validatorScore: validatorResult.score,
    rubricScore: null,
    aiReviewScore: null,
    aiReviewWeight: 0,
    timingModifier,
    codeQualityNotes: [],
    finalScore,
    isZeroEffort,
    feedback,
  })
}
