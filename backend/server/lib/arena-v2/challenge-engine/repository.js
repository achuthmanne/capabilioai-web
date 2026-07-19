/**
 * challenge-engine/repository.js — Milestone 3
 * ---------------------------------------------------------------------------
 * Data-access for the tables Challenge Engine needs that Milestone 2's
 * challenge-library/repository.js doesn't already cover (that one is scoped
 * to Content tables only). This one reads/writes the execution-state tables
 * from Milestone 1 that selection logic depends on: skill progress, domain
 * grants, recent instance history (anti-repetition), and dataset-by-scenario-
 * pack lookup.
 *
 * `insertChallengeInstance` is exported here (Milestone 1's table, written by
 * whichever module issues the instance) but is NOT called by engine.js — per
 * payloadGenerator.js's header note, persistence happens after the Payload
 * Validator (Milestone 4) passes a payload, not before. It's exported now so
 * Milestone 4 doesn't need a fourth repository file for one insert.
 */
import { supabaseAdmin } from "../../supabase.js"

export async function getSkillProgress(userId, careerFamily = "IT") {
  const { data, error } = await supabaseAdmin
    .from("av2_skill_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("career_family", careerFamily)
  if (error) throw error
  return data || []
}

export async function hasActiveDomainGrant(userId) {
  const { data, error } = await supabaseAdmin
    .from("av2_domain_challenge_grants")
    .select("id, expires_at, revoked_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
  if (error) throw error
  const now = Date.now()
  return (data || []).some((g) => !g.expires_at || new Date(g.expires_at).getTime() > now)
}

export async function getRecentTemplateIdsForSkill(userId, skill, limit = 3) {
  const { data, error } = await supabaseAdmin
    .from("av2_challenge_instances")
    .select("challenge_template_id, created_at")
    .eq("user_id", userId)
    .eq("skill", skill)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).map((r) => r.challenge_template_id)
}

// Milestone 2's challenge-library/repository.js only exposes scenario pack
// lookup by (slug, version) — Challenge Templates store scenario_pack_id
// (uuid), so this by-id variant lives here rather than reopening the frozen
// Milestone 2 file.
export async function getScenarioPackById(id) {
  if (!id) return null
  const { data, error } = await supabaseAdmin
    .from("av2_scenario_packs")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getDatasetForScenarioPack(scenarioPackId) {
  if (!scenarioPackId) return null
  const { data, error } = await supabaseAdmin
    .from("av2_datasets")
    .select("*")
    .eq("scenario_pack_id", scenarioPackId)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getActiveDatasetVersion(datasetId) {
  if (!datasetId) return null
  const { data, error } = await supabaseAdmin
    .from("av2_dataset_versions")
    .select("*")
    .eq("dataset_id", datasetId)
    .eq("is_active", true)
    .maybeSingle()
  if (error) throw error
  return data
}

// Exported for Milestone 4 (Challenge Payload Validator) to call once a
// payload has passed both gates. Not used by engine.js itself.
export async function insertChallengeInstance(payload, userId) {
  const { data, error } = await supabaseAdmin
    .from("av2_challenge_instances")
    .insert({
      id: payload.challengeInstanceId,
      user_id: userId,
      challenge_type: payload.challengeType,
      career_family: payload.careerFamily,
      role: payload.role,
      industry: payload.industry,
      scenario_pack_id: payload.scenarioPackId,
      scenario_pack_version: payload.scenarioPackVersion,
      scenario_id: payload.scenarioId,
      challenge_template_id: payload.challengeTemplateId,
      challenge_template_version: payload.challengeTemplateVersion,
      dataset_id: payload.datasetId,
      dataset_version: payload.datasetVersion,
      difficulty: payload.difficulty,
      skill: payload.skill,
      skill_graph_version: payload.skillGraphVersion,
      workstation: payload.workstation,
      workstation_version: payload.workstationVersion,
      payload: payload.payload,
      validator: payload.validator,
      assessment_rules: payload.assessmentRules,
      submission_rules: payload.submissionRules,
      progression_rules: payload.progressionRules,
      reward_rules: payload.rewardRules,
      portfolio_decision: payload.portfolioDecision,
      status: "issued",
    })
    .select()
    .single()
  if (error) throw error
  return data
}
