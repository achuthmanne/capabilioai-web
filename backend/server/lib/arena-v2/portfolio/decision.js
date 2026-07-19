/**
 * portfolio/decision.js — Milestone 10
 * ---------------------------------------------------------------------------
 * Pure Portfolio Decision logic. Consumes an AssessmentCompletedEvent and
 * decides whether — and how — a Portfolio Artifact should exist, per the
 * frozen contract (arena_content_spec/08's `portfolioDecision` schema,
 * `10-portfolio-and-recruiter-evidence.md`'s verification semantics):
 *
 *   eligibleFor: "domain only"        — Common Challenges never produce
 *                                        portfolio artifacts, no exceptions.
 *   minScoreToAutoPublish: number     — score >= this -> auto-published,
 *                                        Verified.
 *   allowManualPublishBelowThreshold  — if true and below threshold, a DRAFT
 *                                        artifact is still created
 *                                        (publish_state='not_published') so
 *                                        the student can later choose to
 *                                        publish it themselves
 *                                        (Self-Selected) — see
 *                                        portfolio/engine.js's publish flow.
 *                                        If false, no artifact at all.
 *
 * BOUNDARY: this module knows nothing about how the score was computed
 * (validator internals) or how rewards were computed (ELO/XP formulas) —
 * it only reads `event.assessment.final_score` and `event.instance`'s
 * portfolio_decision/challenge_type/difficulty/industry/scenario/skill
 * fields, exactly mirroring the same "consume only the Result" discipline
 * Reward Engine has toward Assessment. The Reward Engine does NOT decide
 * portfolio publication — this module does, entirely separately, both
 * fed by the same AssessmentCompletedEvent but never calling each other.
 */
export const DECISION_TYPES = Object.freeze({
  NOT_ELIGIBLE: "not_eligible", // Common Challenge, or no portfolioDecision configured
  AUTO_PUBLISH: "auto_publish", // score met the threshold
  PENDING_MANUAL: "pending_manual", // below threshold, but manual publish is allowed — draft created
  NOT_QUALIFYING: "not_qualifying", // below threshold, manual publish not allowed — nothing created
})

const isPlainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v)

/**
 * @param {object} event an AssessmentCompletedEvent (events/assessmentCompletedEvent.js)
 * @returns {{ type: string, publishState: string|null, verification: string|null }}
 */
export function decidePortfolioPublication(event) {
  const { assessment, instance } = event

  if (instance.challenge_type !== "domain") {
    return { type: DECISION_TYPES.NOT_ELIGIBLE, publishState: null, verification: null }
  }

  const portfolioDecision = instance.portfolio_decision
  if (!isPlainObject(portfolioDecision) || typeof portfolioDecision.minScoreToAutoPublish !== "number") {
    // A domain template with no real portfolioDecision config — treat as
    // not eligible rather than guessing a threshold. This is a content gap
    // (a domain template should always declare one per the frozen payload
    // schema), not a student-facing error.
    return { type: DECISION_TYPES.NOT_ELIGIBLE, publishState: null, verification: null }
  }

  if (assessment.final_score >= portfolioDecision.minScoreToAutoPublish) {
    return { type: DECISION_TYPES.AUTO_PUBLISH, publishState: "auto_published", verification: "Verified" }
  }

  if (portfolioDecision.allowManualPublishBelowThreshold === true) {
    return { type: DECISION_TYPES.PENDING_MANUAL, publishState: "not_published", verification: "Self-Selected" }
  }

  return { type: DECISION_TYPES.NOT_QUALIFYING, publishState: null, verification: null }
}
