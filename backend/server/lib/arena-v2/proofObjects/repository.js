/**
 * proofObjects/repository.js
 * ---------------------------------------------------------------------------
 * Data access for the new `proof_objects` table (see migration
 * create_proof_objects_table, 2026-07-20). Uses supabaseAdmin (service role)
 * exclusively — proof_objects has no client-writable RLS policy by design
 * (see the migration's comment): only backend pipelines write here, never a
 * direct client update, same integrity pattern as the ELO ledger.
 */
import { supabaseAdmin } from "../../supabase.js"

const TABLE = "proof_objects"

function toRow(p) {
  return {
    user_id: p.userId,
    source: p.source,
    source_ref: p.sourceRef || {},
    domain: p.domain || "General",
    skill: p.skill ?? null,
    skills_demonstrated: p.skillsDemonstrated || [],
    challenge_type: p.challengeType ?? null,
    workstation: p.workstation ?? null,
    role: p.role ?? null,
    industry: p.industry ?? null,
    difficulty: p.difficulty ?? null,
    title: p.title || "Untitled Challenge",
    problem_statement: p.problemStatement || "",
    final_submission: p.finalSubmission || {},
    snapshots: p.snapshots || [],
    build_output: p.buildOutput || {},
    ai_evaluation: p.aiEvaluation || {},
    validator_result: p.validatorResult || {},
    artifacts: p.artifacts || [],
    tags: p.tags || [],
    score: p.score ?? null,
    elo_delta: p.eloDelta ?? 0,
    time_taken_secs: p.timeTakenSecs ?? null,
    trust_level: p.trustLevel || "self-claimed",
    is_portfolio_visible: p.isPortfolioVisible ?? true,
    is_recruiter_visible: p.isRecruiterVisible ?? true,
    completed_at: p.completedAt || new Date().toISOString(),
  }
}

// Idempotency: rather than reading back by jsonb equality (fragile — key order
// in `source_ref` isn't guaranteed stable), rely on the UNIQUE(source,
// source_ref) constraint from the migration and upsert with
// ignoreDuplicates. A retried call against the same instance/submission/
// assessment triple never creates a second proof object.
export async function insert(proofObject) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .upsert(toRow(proofObject), { onConflict: "source,source_ref", ignoreDuplicates: true })
    .select().maybeSingle()
  if (error) throw error
  // maybeSingle() returns null when the upsert was a no-op (duplicate) — in
  // that case, fetch the existing row so the caller still gets a proof object back.
  if (data) return data
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("source", proofObject.source)
    .contains("source_ref", proofObject.sourceRef)
    .maybeSingle()
  if (fetchErr) throw fetchErr
  return existing
}

/** Bulk insert for the backfill script — tolerant of individual row conflicts. */
export async function insertMany(proofObjects) {
  if (!proofObjects.length) return { inserted: 0, skipped: 0 }
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .upsert(proofObjects.map(toRow), { onConflict: "source,source_ref", ignoreDuplicates: true })
    .select()
  if (error) throw error
  return { inserted: data?.length || 0 }
}

export async function listForUser(userId, { portfolioOnly = false } = {}) {
  let q = supabaseAdmin.from(TABLE).select("*").eq("user_id", userId).order("completed_at", { ascending: false })
  if (portfolioOnly) q = q.eq("is_portfolio_visible", true)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getById(id) {
  const { data, error } = await supabaseAdmin.from(TABLE).select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data
}
