/**
 * challenge-delivery/dto.js — Milestone 6
 * ---------------------------------------------------------------------------
 * Pure. Builds the client-safe response shape from a persisted instance row
 * + the Workstation Router's routing descriptor.
 *
 * SECURITY DECISION, deliberate and load-bearing: `validator` is NEVER
 * included in this DTO. Several validator configs carry the answer key
 * itself — e.g. `ground_truth_compare`'s config is
 * `{ seedDatasetId, groundTruthQuery, tolerancePct }` (05-validators.md) —
 * and `groundTruthQuery` is literally the SQL that produces the correct
 * answer. Shipping `instance.validator` to the browser would hand every
 * student the grading key for their own challenge. Nothing about the
 * frozen spec requires the client to see the validator; it's an
 * implementation detail of Submission/Assessment (a future milestone),
 * not something the Workstation needs to render or the student needs to
 * solve the challenge. If a future validator type genuinely needs to expose
 * something to the client (e.g. a rubric's criteria for `rubric_review`),
 * add an explicit, narrow field for that — never re-add `validator` wholesale.
 */
// Bumped only when a breaking change is made to this DTO's shape. Existing
// frontend clients can check this field and refuse to render (rather than
// silently mis-render) if a future backend change ever needs to break shape.
export const CHALLENGE_DTO_SCHEMA_VERSION = "v1"

export function buildChallengeResponseDto({ instance, routing, resumed }) {
  return {
    schemaVersion: CHALLENGE_DTO_SCHEMA_VERSION,
    challengeInstanceId: instance.id,
    resumed: !!resumed,
    status: instance.status,

    challengeType: instance.challenge_type,
    careerFamily: instance.career_family,
    role: instance.role,
    industry: instance.industry,
    difficulty: instance.difficulty,
    skill: instance.skill,

    scenarioPackId: instance.scenario_pack_id,
    scenarioId: instance.scenario_id,

    workstation: routing.workstation,
    componentKey: routing.componentKey,
    uiModules: routing.uiModules,
    artifactType: routing.artifactType,
    payload: routing.payload,

    assessmentRules: instance.assessment_rules,
    submissionRules: instance.submission_rules,
    rewardRules: instance.reward_rules,
    portfolioDecision: instance.portfolio_decision,

    startedAt: instance.started_at,
    expiresAt: instance.expires_at,
  }
}
