/**
 * portfolio/repository.js — Milestone 10
 * ---------------------------------------------------------------------------
 * Data access for av2_portfolio_artifacts (Milestone 1's table) only.
 * Doesn't touch av2_assessments, av2_elo_ledger, or av2_xp_ledger —
 * those belong to assessment/repository.js and reward-engine/repository.js
 * respectively.
 */
import { supabaseAdmin } from "../../supabase.js"

// Idempotency guard — see portfolio/engine.js's header note (same pattern
// as reward-engine/engine.js's getEloEntryForAssessment/getXpEntryForAssessment).
export async function getArtifactForAssessment(assessmentId) {
  const { data, error } = await supabaseAdmin
    .from("av2_portfolio_artifacts")
    .select("*")
    .eq("assessment_id", assessmentId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function insertArtifact(row) {
  const { data, error } = await supabaseAdmin
    .from("av2_portfolio_artifacts")
    .insert({
      user_id: row.userId,
      assessment_id: row.assessmentId,
      instance_id: row.instanceId,
      artifact_type: row.artifactType,
      publish_state: row.publishState,
      recruiter_evidence: row.recruiterEvidence,
      storage_url: row.storageUrl ?? null,
    })
    .select().single()
  if (error) throw error
  return data
}

export async function getArtifactById(artifactId) {
  const { data, error } = await supabaseAdmin
    .from("av2_portfolio_artifacts").select("*").eq("id", artifactId).maybeSingle()
  if (error) throw error
  return data
}

export async function listArtifactsForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from("av2_portfolio_artifacts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data || []
}

export async function listPublishedArtifactsForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from("av2_portfolio_artifacts")
    .select("*")
    .eq("user_id", userId)
    .neq("publish_state", "not_published")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data || []
}

export async function updatePublishState(artifactId, publishState) {
  const { data, error } = await supabaseAdmin
    .from("av2_portfolio_artifacts")
    .update({ publish_state: publishState })
    .eq("id", artifactId)
    .select().single()
  if (error) throw error
  return data
}
