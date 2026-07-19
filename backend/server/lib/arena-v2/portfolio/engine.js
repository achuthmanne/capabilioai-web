/**
 * portfolio/engine.js — Milestone 10
 * ---------------------------------------------------------------------------
 * The Portfolio Decision -> Portfolio Artifact orchestrator:
 *
 *   Assessment -> Reward Engine -> Portfolio Decision -> Portfolio Artifact -> Recruiter Evidence
 *
 * Takes ONE input: an AssessmentCompletedEvent (events/assessmentCompletedEvent.js).
 * This is deliberately the same object Reward Engine could have consumed —
 * but Reward Engine never calls this module, and this module never calls
 * Reward Engine. Both are independent consumers of the same event, exactly
 * per your instruction that the Reward Engine must not decide portfolio
 * publication.
 *
 * Recruiter Evidence (the diagram's 4th box) is produced here as the
 * `recruiter_evidence` JSONB attached to the artifact at creation time
 * (portfolio/recruiterEvidence.js's `buildRecruiterEvidence`) — the
 * *read-side* presentation of that evidence (`buildRecruiterEvidenceView`)
 * is used by routes/arenaV2Portfolio.js, not here.
 *
 * IDEMPOTENCY: same pattern as reward-engine/engine.js — checks for an
 * existing artifact keyed by `assessment_id` before creating one, so a
 * retried call against the same assessment never creates a duplicate
 * artifact row (no DB-level UNIQUE constraint enforces this on
 * av2_portfolio_artifacts.assessment_id, same accepted trade-off logged in
 * docs/future-improvements.md for the reward ledgers).
 *
 * Dependency-injected, same pattern as every prior milestone.
 */
import * as repo from "./repository.js"
import { decidePortfolioPublication, DECISION_TYPES } from "./decision.js"
import { buildRecruiterEvidence } from "./recruiterEvidence.js"
import { buildProofObjectFromAssessment } from "../proofObjects/builder.js"
import * as proofRepo from "../proofObjects/repository.js"

export class PortfolioEngineError extends Error {}

export const defaultDeps = {
  getArtifactForAssessment: repo.getArtifactForAssessment,
  insertArtifact: repo.insertArtifact,
  // New Proof Object pipeline (portfolio redesign, 2026-07-20) — additive:
  // the legacy av2_portfolio_artifacts write above is left in place since
  // routes/arenaV2Portfolio.js still reads it, but proof_objects is now the
  // canonical source for the new Portfolio UI going forward.
  insertProofObject: proofRepo.insert,
}

/**
 * @param {object} event an AssessmentCompletedEvent
 * @param {object} deps
 * @returns {Promise<{ decisionType: string, artifact: object|null, alreadyApplied: boolean }>}
 */
export async function recordPortfolioOutcome(event, deps = defaultDeps) {
  if (!event?.assessment || !event?.instance) {
    throw new PortfolioEngineError("recordPortfolioOutcome: a valid AssessmentCompletedEvent is required")
  }

  const decision = decidePortfolioPublication(event)

  // Phase 1A (Evidence System unification, 2026-07-20): every completed
  // assessment becomes a Proof Object now — not just domain challenges that
  // clear the portfolio-eligibility bar. Evidence existing is independent of
  // whether it's ever *visible*; visibility is entirely controlled by
  // publishState inside the builder. This runs BEFORE the eligibility
  // early-return below (unlike the legacy av2_portfolio_artifacts write,
  // which is unchanged and still only fires for domain-eligible challenges —
  // proof_objects is now the sole source routes/arenaV2Portfolio.js reads
  // from, av2_portfolio_artifacts is retained only because the e2e suite
  // still asserts against it). Non-fatal: a Proof Object write hiccup must
  // never fail the assessment-completed flow.
  try {
    const proofObject = buildProofObjectFromAssessment(event, decision)
    await deps.insertProofObject(proofObject)
  } catch (err) {
    console.error("[portfolio/engine] Failed to record proof object (non-fatal):", err.message)
  }

  if (decision.type === DECISION_TYPES.NOT_ELIGIBLE || decision.type === DECISION_TYPES.NOT_QUALIFYING) {
    return { decisionType: decision.type, artifact: null, alreadyApplied: false }
  }

  const existing = await deps.getArtifactForAssessment(event.assessment.id)
  if (existing) {
    return { decisionType: decision.type, artifact: existing, alreadyApplied: true }
  }

  const { instance, assessment } = event
  const recruiterEvidence = buildRecruiterEvidence({ instance, assessment, verification: decision.verification })

  const artifact = await deps.insertArtifact({
    userId: assessment.user_id,
    assessmentId: assessment.id,
    instanceId: instance.id,
    artifactType: instance.portfolio_decision.artifactType,
    publishState: decision.publishState,
    recruiterEvidence,
  })

  return { decisionType: decision.type, artifact, alreadyApplied: false }
}
