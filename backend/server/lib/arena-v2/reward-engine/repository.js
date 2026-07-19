/**
 * reward-engine/repository.js — Milestone 9
 * ---------------------------------------------------------------------------
 * Data access for av2_elo_ledger, av2_xp_ledger, and av2_skill_progress
 * (all Milestone 1 tables). Does not touch av2_assessments — that's
 * assessment/repository.js's job, and this module never needs to write
 * there.
 *
 * "Current" ELO is deliberately NOT a separate stored field anywhere — it's
 * derived from the most recent av2_elo_ledger row's `elo_after` for
 * (user, role), the standard event-sourced-ledger pattern. No schema change
 * needed; av2_elo_ledger already carries everything required.
 */
import { supabaseAdmin } from "../../supabase.js"

export async function getLatestEloForRole(userId, role) {
  const { data, error } = await supabaseAdmin
    .from("av2_elo_ledger")
    .select("elo_after")
    .eq("user_id", userId)
    .eq("role", role)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.elo_after ?? null
}

// Idempotency guard — see engine.js's header note on why applyRewards
// checks for an existing ledger row before writing.
export async function getEloEntryForAssessment(assessmentId) {
  const { data, error } = await supabaseAdmin
    .from("av2_elo_ledger").select("*").eq("assessment_id", assessmentId).maybeSingle()
  if (error) throw error
  return data
}

export async function getXpEntryForAssessment(assessmentId) {
  const { data, error } = await supabaseAdmin
    .from("av2_xp_ledger").select("*").eq("assessment_id", assessmentId).maybeSingle()
  if (error) throw error
  return data
}

export async function insertEloLedgerEntry(row) {
  const { data, error } = await supabaseAdmin
    .from("av2_elo_ledger")
    .insert({
      user_id: row.userId, assessment_id: row.assessmentId, role: row.role,
      elo_before: row.eloBefore, elo_after: row.eloAfter, delta: row.delta, reason: row.reason,
    })
    .select().single()
  if (error) throw error
  return data
}

export async function insertXpLedgerEntry(row) {
  const { data, error } = await supabaseAdmin
    .from("av2_xp_ledger")
    .insert({
      user_id: row.userId, assessment_id: row.assessmentId, skill: row.skill,
      xp_gained: row.xpGained, streak_counted: row.streakCounted,
    })
    .select().single()
  if (error) throw error
  return data
}

export async function getSkillProgress(userId, careerFamily, skill) {
  const { data, error } = await supabaseAdmin
    .from("av2_skill_progress")
    .select("*")
    .eq("user_id", userId).eq("career_family", careerFamily).eq("skill", skill)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertSkillProgress(row) {
  const { data, error } = await supabaseAdmin
    .from("av2_skill_progress")
    .upsert(
      {
        user_id: row.userId, career_family: row.careerFamily, skill: row.skill,
        mastery_state: row.masteryState, attempts_count: row.attemptsCount,
        best_score: row.bestScore, last_attempted_at: row.lastAttemptedAt,
      },
      { onConflict: "user_id,career_family,skill" }
    )
    .select().single()
  if (error) throw error
  return data
}
