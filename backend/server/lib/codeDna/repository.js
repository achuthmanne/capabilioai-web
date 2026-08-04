// Code DNA (GitHub) proof-object persistence.
//
// Deliberately NOT reused from lib/arena-v2/proofObjects/repository.js —
// that module's insert() upserts with { onConflict: "source,source_ref",
// ignoreDuplicates: true }, which is correct for immutable one-per-submission
// Arena/SkillStudio proofs but wrong here: Code DNA is a "current snapshot"
// per user (re-analysis should REPLACE the stored data, not no-op on
// conflict and silently keep serving a stale snapshot). This module does a
// real update-on-conflict upsert scoped to (user_id, source, proof_type),
// backed by the UNIQUE(user_id, source, proof_type) constraint added in the
// proof_objects_code_dna_support migration (2026-08-04).
import { supabaseAdmin } from "../supabase.js"

export const SOURCE = "github_code_dna"
export const PROOF_TYPE = "code_dna_profile"

const MAX_SCORE_HISTORY = 20

// Upserts the user's current Code DNA snapshot. Never throws into the
// caller's response path on its own — callers should catch and log, since a
// persistence failure must not block the user from seeing their analysis.
//
// BUG FIX (2026-08-05, found while building the identity timeline): this
// used to build source_ref from scratch on every call — `{ username,
// analysis, scores, analyzedAt }` — which silently WIPED any `repoInterview`
// previously saved by saveRepoInterview() on every re-analyze (Refresh
// button, or an automatic re-run), even though nothing about the interview
// changed. Now reads the existing row first and carries `repoInterview`
// forward untouched. Also appends a small `scoreHistory` entry each run
// (capped at the most recent 20), giving the Developer Identity Timeline
// real progression data going forward — this can't be backfilled for past
// analyses since we never stored it before, but every analysis from now on
// contributes a real, dated data point rather than nothing.
export async function upsertProfile(userId, { username, analysis, scores }) {
  const existing = await getProfile(userId)
  const analyzedAt = new Date().toISOString()
  const prevHistory = Array.isArray(existing?.source_ref?.scoreHistory) ? existing.source_ref.scoreHistory : []
  const scoreHistory = [
    ...prevHistory,
    { analyzedAt, totalCommits: analysis?.totalCommits ?? null, commitsAreExact: !!analysis?.commitsAreExact, publicRepos: analysis?.publicRepos ?? null, followers: analysis?.followers ?? null, scores },
  ].slice(-MAX_SCORE_HISTORY)

  const row = {
    user_id: userId,
    source: SOURCE,
    proof_type: PROOF_TYPE,
    domain: "General",
    title: `Code DNA — ${username}`,
    source_ref: {
      username, analysis, scores, analyzedAt, scoreHistory,
      ...(existing?.source_ref?.repoInterview ? { repoInterview: existing.source_ref.repoInterview } : {}),
    },
    score: scores?.builder ?? null,
    is_portfolio_visible: true,
    is_recruiter_visible: true,
    publish_state: "self_selected",
    // Never set to 'verified' here — only markVerified() (called after a
    // real bio-code ownership check passes) may do that.
  }
  const { data, error } = await supabaseAdmin
    .from("proof_objects")
    .upsert(row, { onConflict: "user_id,source,proof_type" })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markVerified(userId) {
  const { data, error } = await supabaseAdmin
    .from("proof_objects")
    .update({ trust_level: "verified" })
    .eq("user_id", userId)
    .eq("source", SOURCE)
    .eq("proof_type", PROOF_TYPE)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from("proof_objects")
    .select("*")
    .eq("user_id", userId)
    .eq("source", SOURCE)
    .eq("proof_type", PROOF_TYPE)
    .maybeSingle()
  if (error) throw error
  return data
}

// AI Repository Interview (2026-08-04) — deliberately stored INSIDE the same
// code_dna_profile row's source_ref (as a sibling `repoInterview` key next to
// `analysis`/`scores`), not as a new proof_type/row. Reasons: (1) it only
// makes sense in the context of an existing analysis (questions are
// generated FROM the analyzed repo's real tech stack/README/commit data —
// there's nothing to interview about without one), (2) avoids a schema
// migration / new CHECK-constraint value for what is really a sub-artifact
// of the same Code DNA snapshot, not an independent piece of evidence, and
// (3) keeps "one canonical Code DNA row per user" intact rather than
// spawning a second row that could drift out of sync with the analysis it
// depends on. Partial UPDATE (merge into existing source_ref), never an
// upsert — this must fail loudly if no analysis exists yet rather than
// silently creating a bare row with no analysis behind it.
export async function saveRepoInterview(userId, { repoName, questions, transcript, evaluation }) {
  const existing = await getProfile(userId)
  if (!existing) throw new Error("Analyze this profile at least once before running a repository interview.")
  const source_ref = {
    ...existing.source_ref,
    repoInterview: { repoName, questions, transcript, evaluation, completedAt: new Date().toISOString() },
  }
  const { data, error } = await supabaseAdmin
    .from("proof_objects")
    .update({ source_ref })
    .eq("user_id", userId)
    .eq("source", SOURCE)
    .eq("proof_type", PROOF_TYPE)
    .select()
    .single()
  if (error) throw error
  return data
}
