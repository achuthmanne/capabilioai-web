/**
 * reward-engine/eloFormula.js — Milestone 9
 * ---------------------------------------------------------------------------
 * Pure ELO math for Domain Challenges. No I/O — takes a current rating, a
 * difficulty tier, and a 0-100 final score, returns the new rating. This is
 * the "Result -> Reward Engine" boundary: the only input this formula needs
 * is the number Assessment already computed.
 *
 * 2026-08-14 — REPLACED the previous logistic expected-score / rating-tiered
 * K-factor curve entirely (explicit product decision, account owner). That
 * model computed a delta relative to the student's current rating vs. the
 * challenge's own "difficulty rating" (e.g. Easy = 800, Expert = 1700),
 * which is exactly what produced the reported bug: a student's very first
 * submission in a role had no rating history to compare against, so the
 * math effectively anchored on the challenge's own rating band (~800) as
 * "current," compounding with a separate seeding bug to jump a student's
 * visible ELO by hundreds of points off one Easy question. Confusing and
 * wrong for students to see, on top of being the wrong mental model for
 * this product: ELO here does not need to reflect a matchmaking-style
 * expected-outcome comparison between "player rating" and "challenge
 * rating" — it needs to reward real, graded progress in small, predictable,
 * difficulty-scaled steps on top of wherever the student already is.
 *
 * New rule, stated plainly by the account owner: passing a Domain Challenge
 * awards a FLAT amount based on difficulty (Easy +5, Medium +10, Hard +15,
 * Expert +20 — extending the same +5-per-tier step the owner specified for
 * Easy/Medium/Hard). A failing submission awards nothing — ELO does not
 * move. No comparison to current rating, no K-factor, no negative delta.
 * "Passing" is judged purely on Assessment's own `final_score` (the one
 * number this module is allowed to know about, preserving the Reward
 * Engine's zero-knowledge-of-validators boundary — see engine.js's header)
 * against PASSING_SCORE_THRESHOLD.
 */
export const START_ELO = 800   // last-resort seed ONLY for an account with no rating anywhere at all — see reward-engine/repository.js's getLegacyElo, which normally seeds a role's first attempt from the student's real, existing rating instead.
export const FLAT_ELO_AWARD_BY_DIFFICULTY = { Easy: 5, Medium: 10, Hard: 15, Expert: 20 }
export const PASSING_SCORE_THRESHOLD = 70
const ELO_FLOOR = 100

/**
 * @param {{ currentElo: number, difficulty: string, score: number }} input
 * @returns {{ delta: number, newElo: number }}
 */
export function computeEloDelta({ currentElo, difficulty, score }) {
  if (typeof currentElo !== "number" || Number.isNaN(currentElo)) throw new Error("computeEloDelta: currentElo must be a number")
  if (typeof score !== "number" || Number.isNaN(score)) throw new Error("computeEloDelta: score must be a number")

  const passed = score >= PASSING_SCORE_THRESHOLD
  const delta = passed ? (FLAT_ELO_AWARD_BY_DIFFICULTY[difficulty] ?? FLAT_ELO_AWARD_BY_DIFFICULTY.Medium) : 0
  // Floor is defensive only — delta is never negative under this rule, so
  // this only matters if currentElo itself was already below 100 (e.g. a
  // corrupted/legacy row), which should never happen but must never make
  // things worse if it does.
  const newElo = Math.max(ELO_FLOOR, currentElo + delta)
  return { delta, newElo }
}
