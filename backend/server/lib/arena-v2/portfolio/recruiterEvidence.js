/**
 * portfolio/recruiterEvidence.js — Milestone 10
 * ---------------------------------------------------------------------------
 * Pure builders for the Recruiter Skill Evidence structure
 * (10-portfolio-and-recruiter-evidence.md's worked example table), and the
 * final recruiter-facing view of a Portfolio Artifact.
 *
 * Two separate concerns, kept in two functions:
 *   buildRecruiterEvidence   — the JSONB payload stored on
 *                              av2_portfolio_artifacts.recruiter_evidence,
 *                              computed once at artifact-creation time.
 *   buildRecruiterEvidenceView — the read-side shape a recruiter-facing
 *                              query (routes/arenaV2Portfolio.js's
 *                              candidates/:userId/evidence endpoint) hands
 *                              back — recruiter_evidence plus a few
 *                              artifact-level fields (artifactType,
 *                              publishState, createdAt), never the raw DB
 *                              column names.
 *
 * KNOWN GAP, flagged rather than half-solved: `skillsDemonstrated` should
 * be "drawn from the Challenge Template's declared skill tags, not free
 * text" per spec — but av2_challenge_templates only has a single `skill`
 * TEXT column (Milestone 1), no multi-tag array. Until that column exists,
 * this returns a single-element array `[instance.skill]`. See
 * docs/future-improvements.md.
 *
 * KNOWN GAP #2: `scenario` uses `instance.scenario_id` verbatim rather than
 * resolving the Scenario Pack's human-readable scenario name — doing that
 * would require this module to depend on challenge-library/engine
 * repository code, which it deliberately does not (keeps Portfolio
 * Decision's dependency surface small). See docs/future-improvements.md.
 */

/**
 * @param {{ instance: object, assessment: object, verification: string }} input
 * @returns {object} the recruiter_evidence JSONB shape
 */
export function buildRecruiterEvidence({ instance, assessment, verification }) {
  return {
    skill: instance.skill,
    status: "Completed", // an assessment always implies completion — no "In Progress" artifacts are ever created
    scorePct: assessment.final_score,
    verification,
    difficulty: instance.difficulty,
    industry: instance.industry ?? null,
    scenario: instance.scenario_id ?? null,
    skillsDemonstrated: [instance.skill],
  }
}

/**
 * @param {object} artifact an av2_portfolio_artifacts row
 * @returns {object} the recruiter-facing view
 */
export function buildRecruiterEvidenceView(artifact) {
  return {
    ...artifact.recruiter_evidence,
    artifactType: artifact.artifact_type,
    publishState: artifact.publish_state,
    createdAt: artifact.created_at,
  }
}

// Phase 1A (Evidence System unification, 2026-07-20): the proof_objects
// equivalent of buildRecruiterEvidenceView above — used by
// routes/arenaV2Portfolio.js's /candidates/:userId/evidence endpoint, now
// reading proof_objects instead of av2_portfolio_artifacts. Verification
// label is derived from publish_state rather than stored separately, since
// proof_objects folds decision.verification into that one field.
const VERIFICATION_BY_PUBLISH_STATE = {
  auto_published: "Verified",
  self_selected: "Self-Selected",
}

/**
 * @param {object} proof a proof_objects row (only ever called with
 *   is_recruiter_visible=true rows, so publish_state is always
 *   'auto_published' or 'self_selected' in practice)
 * @returns {object} the recruiter-facing view
 */
export function buildRecruiterEvidenceViewFromProof(proof) {
  // Arena V2 Pilot Phase addition (additive only — every field below is new,
  // nothing above was removed or renamed, so this stays backward-compatible
  // with any existing consumer): recruiters asked to see evidence, not just
  // a completion status — time taken, ELO delta, and the AI Reviewer's
  // structured findings (strengths/suggestions/recruiter-readiness) are
  // already captured on the proof_objects row (elo_delta, time_taken_secs,
  // validator_result.metadata — see rubricReview.js and
  // proofObjects/builder.js) but were never surfaced through this read-side
  // view before. Falls back to null/[] gracefully for proofs from
  // ground_truth_compare or any other validator type that doesn't populate
  // these metadata keys.
  const aiMeta = proof.validator_result?.metadata || {}
  return {
    skill: proof.skill,
    status: "Completed",
    scorePct: proof.score,
    verification: VERIFICATION_BY_PUBLISH_STATE[proof.publish_state] || "Self-Selected",
    difficulty: proof.difficulty,
    industry: proof.industry,
    scenario: null, // KNOWN GAP, same as the legacy builder above — proof_objects doesn't carry a scenario name either
    skillsDemonstrated: proof.skills_demonstrated || [],
    artifactType: proof.challenge_type,
    createdAt: proof.completed_at,
    role: proof.role || null,
    title: proof.title || null,
    eloDelta: proof.elo_delta ?? null,
    timeTakenSecs: proof.time_taken_secs ?? null,
    strengths: Array.isArray(aiMeta.strengths) ? aiMeta.strengths : [],
    suggestions: Array.isArray(aiMeta.suggestions) ? aiMeta.suggestions : [],
    taskQuality: aiMeta.taskQuality || null,
    recruiterReadiness: aiMeta.recruiterReadiness || null,
    recruiterReadinessNote: aiMeta.recruiterReadinessNote || null,
    criteriaScores: aiMeta.criteriaScores || null,
  }
}
