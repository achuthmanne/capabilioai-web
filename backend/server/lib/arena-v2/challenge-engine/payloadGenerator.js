/**
 * challenge-engine/payloadGenerator.js — Milestone 3
 * ---------------------------------------------------------------------------
 * Pure assembly of a Challenge Payload — the exact shape frozen in
 * arena_content_spec/08-challenge-templates-and-payload.md. Takes already-
 * resolved rows (template, active version, scenario pack, dataset version,
 * skill graph version, chosen difficulty) and returns a plain object. No I/O,
 * no randomness — same inputs always produce the same payload shape (only
 * `challengeInstanceId` differs, since it's a fresh id per call).
 *
 * Scope note: this function does NOT persist anything to
 * av2_challenge_instances. Per the frozen pipeline (Challenge Engine ->
 * Challenge Payload Validator -> Workstation Router), persistence as an
 * "issued" instance is the Payload Validator's concern (Milestone 4) — it
 * only becomes a real, queryable instance after both gates pass. Milestone 3
 * hands back an in-memory payload; Milestone 4 is what turns a *valid* one
 * into a row.
 *
 * `portfolioDecision.recruiterEvidence` is intentionally left null here — it
 * can't be populated until the student actually finishes (score, verification
 * state), so it's filled in at Assessment time, not generation time.
 */
import { randomUUID } from "node:crypto"

export function generateChallengePayload({
  userId,
  challengeType,
  careerFamily = "IT",
  role,
  industry = null,
  scenarioPack = null,       // { id, version, ... } | null
  scenario = null,           // { scenarioId, name, templateChain } | null
  template,                  // av2_challenge_templates row
  templateVersion,           // av2_challenge_template_versions row
  datasetVersion = null,     // av2_dataset_versions row | null
  difficulty,
  skillGraphVersion = null,
  workstationVersion,
}) {
  if (!template) throw new Error("generateChallengePayload: template is required")
  if (!templateVersion) throw new Error("generateChallengePayload: templateVersion is required")
  if (!difficulty) throw new Error("generateChallengePayload: difficulty is required")

  const difficultyConfig = templateVersion.difficulty_variants?.[difficulty] || {}

  return {
    challengeInstanceId: randomUUID(),
    challengeType,
    careerFamily,
    role,
    industry,

    scenarioPackId: scenarioPack?.id || null,
    scenarioPackVersion: scenarioPack?.version || null,
    scenarioId: scenario?.scenarioId || null,

    challengeTemplateId: template.id,
    challengeTemplateVersion: templateVersion.version,

    datasetId: datasetVersion?.dataset_id || null,
    datasetVersion: datasetVersion?.version || null,

    difficulty,
    skill: template.skill,
    skillGraphVersion,

    workstation: template.workstation,
    workstationVersion,

    payload: {
      ...difficultyConfig,
      // Dataset seeding info surfaces to the workstation so it can build its
      // sql.js/Pyodide sandbox from the pinned version, never "latest."
      ...(datasetVersion ? { datasetSchema: datasetVersion.schema, datasetSeedSql: datasetVersion.seed_sql } : {}),
    },

    validator: {
      type: templateVersion.validator.type,
      version: templateVersion.validator.version,
      config: {
        ...templateVersion.validator.config,
        ...(datasetVersion ? { seedDatasetId: datasetVersion.dataset_id } : {}),
      },
    },

    assessmentRules: templateVersion.assessment_rules || {},
    submissionRules: templateVersion.submission_rules || {},
    progressionRules: templateVersion.progression_rules || {},
    rewardRules: templateVersion.reward_rules,

    portfolioDecision: {
      ...(templateVersion.portfolio_decision || {}),
      recruiterEvidence: null,   // filled at Assessment time, not here
    },
  }
}
