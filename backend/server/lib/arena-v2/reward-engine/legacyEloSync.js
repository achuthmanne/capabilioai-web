/**
 * legacyEloSync.js — bridges Arena V2's ELO ledger to the legacy scalar
 * field so V1-era surfaces don't go stale when a domain's default entry
 * point moves to V2.
 * ---------------------------------------------------------------------------
 * V2's real source of truth for ELO remains av2_elo_ledger (event-sourced,
 * per user+role — see reward-engine/repository.js's header comment). This
 * module does NOT change that or replace it. It exists only because several
 * pre-V2 surfaces still read the single legacy `profiles.elo_rating` column
 * directly and were never updated to know V2 exists:
 *   - App.jsx (~line 1549): the header "ELO {n}" badge
 *   - Pulse.jsx authorElo(): post author's ELO shown on every feed card
 *   - Pulse.jsx nexus/search results: "ELO {n}" shown on Discover cards
 * Without this bridge, any user whose domain defaults into V2 would keep
 * completing real, scored missions while every one of those surfaces shows
 * their ELO frozen at whatever it was under V1 — a confusing, silent
 * regression, not a cosmetic one.
 *
 * Deliberately best-effort / non-throwing, called the same defensive way
 * submission-engine/service.js already calls notifySkillStudio: a sync
 * failure here must never fail a real, already-graded, already-rewarded
 * submission. See that file's call site for the guard.
 */
import { supabaseAdmin } from "../../supabase.js"

export async function syncLegacyElo(rewardResult, userId) {
  // BUG FIX (2026-08-14, found via live verification): reward-engine/
  // repository.js's insertEloLedgerEntry() does `.select().single()`
  // straight off Supabase, which returns the RAW DB ROW — real column
  // names (elo_after, elo_before, user_id...), not the camelCase
  // (eloAfter, eloBefore) the row's INPUT object used. Only
  // engine.test.js's hand-built mock (`{ id: "elo-1", ...row }`, spreading
  // the camelCase input straight back) ever returns camelCase — that's a
  // test-fixture-only shape, not what production actually returns. Reading
  // `.eloAfter` here silently got `undefined` in production (the
  // typeof-number guard below just no-opped), so every real submission
  // graded fine and updated av2_elo_ledger correctly, but this bridge never
  // fired and profiles.elo_rating stayed frozen. Confirmed by a live test
  // submission: av2_elo_ledger got a correct new row while elo_rating
  // didn't move. Reading both spellings defensively so neither the real
  // repository shape nor the test-mock shape breaks this again.
  const eloEntry = rewardResult?.eloEntry
  const newElo = eloEntry?.elo_after ?? eloEntry?.eloAfter
  // XP-only rewards (Common Challenges) have no eloEntry — nothing to sync,
  // and that's correct: Common Challenges were never ELO-eligible under V1
  // either, so the legacy field shouldn't move for them.
  if (typeof newElo !== "number" || !userId) return
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ elo_rating: Math.round(newElo) })
    .eq("id", userId)
  if (error) throw error
}
