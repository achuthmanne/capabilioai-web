/**
 * challenge-library/repository.js — Milestone 2
 * ---------------------------------------------------------------------------
 * Data-access layer for every Content table from Milestone 1
 * (arena_v2_migration/001_schema.sql). Thin wrappers around supabaseAdmin —
 * all writes use the service-role client (never the anon/user client),
 * matching the "no client-writable content" posture documented in that
 * migration's RLS section. Routes call these; these never get called from
 * anywhere except backend/server/routes/arenaV2Library.js.
 */

import { supabaseAdmin } from "../../supabase.js"

// ── Role Capabilities ────────────────────────────────────────────────────────

export async function listRoleCapabilities({ careerFamily } = {}) {
  let q = supabaseAdmin.from("av2_role_capabilities").select("*").order("role")
  if (careerFamily) q = q.eq("career_family", careerFamily)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getRoleCapabilities(role, careerFamily = "IT") {
  const { data, error } = await supabaseAdmin
    .from("av2_role_capabilities")
    .select("*")
    .eq("role", role)
    .eq("career_family", careerFamily)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertRoleCapabilities(row) {
  const { data, error } = await supabaseAdmin
    .from("av2_role_capabilities")
    .upsert(row, { onConflict: "career_family,role" })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRoleCapabilities(role, careerFamily = "IT") {
  const { error } = await supabaseAdmin
    .from("av2_role_capabilities")
    .delete()
    .eq("role", role)
    .eq("career_family", careerFamily)
  if (error) throw error
}

// ── Skill Dependency Graphs ──────────────────────────────────────────────────

export async function getActiveSkillGraph(role, careerFamily = "IT") {
  const { data, error } = await supabaseAdmin
    .from("av2_skill_dependency_graphs")
    .select("*")
    .eq("role", role)
    .eq("career_family", careerFamily)
    .eq("is_active", true)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listSkillGraphVersions(role, careerFamily = "IT") {
  const { data, error } = await supabaseAdmin
    .from("av2_skill_dependency_graphs")
    .select("*")
    .eq("role", role)
    .eq("career_family", careerFamily)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

// Creates a new version. If markActive, flips every other version for this
// role/family to is_active=false first (single-active-version invariant —
// new starts always resolve to exactly one graph version).
export async function createSkillGraphVersion(row, { markActive = true } = {}) {
  if (markActive) {
    const { error: deactivateErr } = await supabaseAdmin
      .from("av2_skill_dependency_graphs")
      .update({ is_active: false })
      .eq("role", row.role)
      .eq("career_family", row.career_family)
    if (deactivateErr) throw deactivateErr
  }
  const { data, error } = await supabaseAdmin
    .from("av2_skill_dependency_graphs")
    .insert({ ...row, is_active: markActive })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Scenario Packs ───────────────────────────────────────────────────────────

export async function listScenarioPacks({ status = "active", industry } = {}) {
  let q = supabaseAdmin.from("av2_scenario_packs").select("*").eq("status", status).order("name")
  if (industry) q = q.eq("industry", industry)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getScenarioPack(slug, version) {
  let q = supabaseAdmin.from("av2_scenario_packs").select("*").eq("slug", slug)
  q = version ? q.eq("version", version) : q.order("created_at", { ascending: false }).limit(1)
  const { data, error } = await q
  if (error) throw error
  return version ? (data?.[0] || null) : (data?.[0] || null)
}

export async function createScenarioPack(row) {
  const { data, error } = await supabaseAdmin.from("av2_scenario_packs").insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateScenarioPackStatus(id, status) {
  const { data, error } = await supabaseAdmin
    .from("av2_scenario_packs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Datasets + Dataset Versions ──────────────────────────────────────────────

export async function createDataset(row) {
  const { data, error } = await supabaseAdmin.from("av2_datasets").upsert(row, { onConflict: "dataset_id" }).select().single()
  if (error) throw error
  return data
}

export async function listDatasetVersions(datasetId) {
  const { data, error } = await supabaseAdmin
    .from("av2_dataset_versions")
    .select("*")
    .eq("dataset_id", datasetId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function getActiveDatasetVersion(datasetId) {
  const { data, error } = await supabaseAdmin
    .from("av2_dataset_versions")
    .select("*")
    .eq("dataset_id", datasetId)
    .eq("is_active", true)
    .maybeSingle()
  if (error) throw error
  return data
}

// New dataset version never mutates a prior version's seed_sql in place —
// per content_spec/06 Dataset Versioning: a fix ships as vN+1, never an edit
// to vN, since in-progress students may be querying against it right now.
export async function createDatasetVersion(row, { markActive = true } = {}) {
  if (markActive) {
    const { error: deactivateErr } = await supabaseAdmin
      .from("av2_dataset_versions")
      .update({ is_active: false })
      .eq("dataset_id", row.dataset_id)
    if (deactivateErr) throw deactivateErr
  }
  const { data, error } = await supabaseAdmin
    .from("av2_dataset_versions")
    .insert({ ...row, is_active: markActive })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Challenge Templates + Versions ───────────────────────────────────────────

export async function listChallengeTemplates({ challengeType, role, skill, status = "active" } = {}) {
  let q = supabaseAdmin.from("av2_challenge_templates").select("*").eq("status", status)
  if (challengeType) q = q.eq("challenge_type", challengeType)
  if (role) q = q.eq("role", role)
  if (skill) q = q.eq("skill", skill)
  const { data, error } = await q.order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function getChallengeTemplate(id) {
  const { data, error } = await supabaseAdmin.from("av2_challenge_templates").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data
}

export async function createChallengeTemplate(row) {
  const { data, error } = await supabaseAdmin.from("av2_challenge_templates").insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateChallengeTemplate(id, patch) {
  const { data, error } = await supabaseAdmin
    .from("av2_challenge_templates")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listChallengeTemplateVersions(templateId) {
  const { data, error } = await supabaseAdmin
    .from("av2_challenge_template_versions")
    .select("*")
    .eq("challenge_template_id", templateId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function getActiveChallengeTemplateVersion(templateId) {
  const { data, error } = await supabaseAdmin
    .from("av2_challenge_template_versions")
    .select("*")
    .eq("challenge_template_id", templateId)
    .eq("is_active", true)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createChallengeTemplateVersion(templateId, row, { markActive = true } = {}) {
  if (markActive) {
    const { error: deactivateErr } = await supabaseAdmin
      .from("av2_challenge_template_versions")
      .update({ is_active: false })
      .eq("challenge_template_id", templateId)
    if (deactivateErr) throw deactivateErr
  }
  const { data, error } = await supabaseAdmin
    .from("av2_challenge_template_versions")
    .insert({ ...row, challenge_template_id: templateId, is_active: markActive })
    .select()
    .single()
  if (error) throw error
  return data
}
