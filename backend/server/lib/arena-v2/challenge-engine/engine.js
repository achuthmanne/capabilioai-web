/**
 * challenge-engine/engine.js — Milestone 3
 * ---------------------------------------------------------------------------
 * Orchestrator: "assembles the selected Difficulty Variant into a
 * standardized Challenge Payload" (blueprint §1, one line, this file is the
 * implementation of that line). Combines Milestone 2's Content repository
 * reads, Milestone 3's own execution-state reads, the pure selection logic
 * (selection.js), and the pure payload assembly (payloadGenerator.js).
 *
 * Dependency-injected on purpose: `deps` defaults to the real Supabase-backed
 * repositories, but every unit test passes a fake `deps` object instead —
 * this file's own logic (ordering, gating, error cases) is fully testable
 * with zero database access. See engine.test.js.
 *
 * Does NOT persist an av2_challenge_instances row — see payloadGenerator.js's
 * header note. Returns the assembled payload plus a small `meta` block for
 * observability (anti-repetition degradation, resolved mastery state) that a
 * caller may want to log to av2_challenge_analytics_events later.
 */
import * as libraryRepo from "../challenge-library/repository.js"
import * as engineRepo from "./repository.js"
import { pickNextSkill, pickDifficulty, pickTemplate, pickScenario } from "./selection.js"
import { generateChallengePayload } from "./payloadGenerator.js"

export class ChallengeEngineError extends Error {}
export class EntitlementError extends ChallengeEngineError {}
export class NoEligibleContentError extends ChallengeEngineError {}

// Placeholder registry — Workstation Router (Milestone 5) owns real
// workstation versioning. Every workstation defaults to "v1" until then.
export const WORKSTATION_VERSIONS = {
  code: "v1", sql: "v1", notebook: "v1", react_frontend: "v1", api: "v1",
  terminal: "v1", excel: "v1", dashboard: "v1", report: "v1",
  system_design: "v1", embedded: "v1", calculator: "v1", full_stack: "v1",
}

export const defaultDeps = {
  listChallengeTemplates: libraryRepo.listChallengeTemplates,
  getActiveChallengeTemplateVersion: libraryRepo.getActiveChallengeTemplateVersion,
  getActiveSkillGraph: libraryRepo.getActiveSkillGraph,
  getScenarioPackById: engineRepo.getScenarioPackById,
  getDatasetForScenarioPack: engineRepo.getDatasetForScenarioPack,
  getActiveDatasetVersion: engineRepo.getActiveDatasetVersion,
  getSkillProgress: engineRepo.getSkillProgress,
  hasActiveDomainGrant: engineRepo.hasActiveDomainGrant,
  getRecentTemplateIdsForSkill: engineRepo.getRecentTemplateIdsForSkill,
}

export async function selectAndGenerateChallenge(input, deps = defaultDeps) {
  const {
    userId,
    challengeType,
    careerFamily = "IT",
    role = null,
    industry = null,
    skill: requestedSkill = null,
    difficulty: requestedDifficulty = null,
    scenarioId: requestedScenarioId = null,
  } = input

  if (!userId) throw new ChallengeEngineError("userId is required")
  if (!["common", "domain"].includes(challengeType)) throw new ChallengeEngineError("challengeType must be 'common' or 'domain'")
  if (challengeType === "domain" && !role) throw new ChallengeEngineError("role is required for domain challenges")

  // Entitlement gate — Domain Challenges only, per content_spec/08 +
  // av2_domain_challenge_grants (Milestone 1). Common Challenges stay ungated.
  if (challengeType === "domain") {
    const granted = await deps.hasActiveDomainGrant(userId)
    if (!granted) throw new EntitlementError("No active Domain Challenge grant for this user")
  }

  // 1. Candidate templates for this type (+ role, if domain)
  const templatesForType = await deps.listChallengeTemplates({
    challengeType,
    role: challengeType === "domain" ? role : undefined,
    status: "active",
  })
  if (templatesForType.length === 0) {
    throw new NoEligibleContentError(`No active ${challengeType} templates${role ? ` for role "${role}"` : ""}`)
  }

  // 2. Skill selection
  const candidateSkills = [...new Set(templatesForType.map((t) => t.skill))]
  const skillProgressRows = await deps.getSkillProgress(userId, careerFamily)
  const skill = requestedSkill && candidateSkills.includes(requestedSkill)
    ? requestedSkill
    : pickNextSkill(candidateSkills, skillProgressRows)

  const eligibleForSkill = templatesForType.filter((t) => t.skill === skill)
  if (eligibleForSkill.length === 0) {
    throw new NoEligibleContentError(`No active templates for skill "${skill}"`)
  }

  // 3. Template selection (anti-repetition)
  const recentTemplateIds = await deps.getRecentTemplateIdsForSkill(userId, skill)
  const { template, degradedToRepeat } = pickTemplate(eligibleForSkill, recentTemplateIds)

  // 4. Active version for the chosen template
  const templateVersion = await deps.getActiveChallengeTemplateVersion(template.id)
  if (!templateVersion) throw new NoEligibleContentError(`Template "${template.slug}" has no active version`)

  // 5. Difficulty
  const masteryState = skillProgressRows.find((r) => r.skill === skill)?.mastery_state || "unattempted"
  const declaredTiers = Object.keys(templateVersion.difficulty_variants || {})
  const difficulty = pickDifficulty({ masteryState, declaredTiers, requested: requestedDifficulty })

  // 6. Scenario Pack + Scenario + Dataset (domain only, and only if the
  //    template is actually scenario-tagged — not every domain template has
  //    to be, per content_spec/06)
  let scenarioPack = null, scenario = null, datasetVersion = null
  if (challengeType === "domain" && template.scenario_pack_id) {
    scenarioPack = await deps.getScenarioPackById(template.scenario_pack_id)
    if (scenarioPack) {
      scenario = pickScenario(scenarioPack, requestedScenarioId || template.scenario_id)
      const dataset = await deps.getDatasetForScenarioPack(scenarioPack.id)
      if (dataset) datasetVersion = await deps.getActiveDatasetVersion(dataset.dataset_id)
    }
  }

  // 7. Skill Graph version (domain only — skill graphs are per-role content;
  //    Common Challenges have no role, so no graph to pin against)
  let skillGraphVersion = null
  if (challengeType === "domain") {
    const graph = await deps.getActiveSkillGraph(role, careerFamily)
    skillGraphVersion = graph?.version || null
  }

  const workstationVersion = WORKSTATION_VERSIONS[template.workstation] || "v1"

  const payload = generateChallengePayload({
    userId,
    challengeType,
    careerFamily,
    role,
    industry,
    scenarioPack,
    scenario,
    template,
    templateVersion,
    datasetVersion,
    difficulty,
    skillGraphVersion,
    workstationVersion,
  })

  return {
    payload,
    meta: { masteryState, degradedToRepeat, resolvedSkill: skill },
  }
}
