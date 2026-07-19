/**
 * reward-engine/eloFormula.js — Milestone 9
 * ---------------------------------------------------------------------------
 * Pure ELO math for Domain Challenges. No I/O, no knowledge of validators,
 * submissions, or workstations — takes a current rating, a difficulty tier,
 * and a 0-100 score, returns the new rating. This is exactly the "Result ->
 * Reward Engine" boundary from your diagram: the only input this formula
 * needs is the number Assessment already computed.
 *
 * LINEAGE: the same standard ELO shape (logistic expected-score curve,
 * rating-tiered K-factor) Arena V1 already uses in
 * backend/server/lib/grading-worker.js's `computeEloUpdate` — reimplemented
 * here rather than imported, to keep av2_ fully isolated from legacy Arena
 * V1 modules (the same isolation principle established since Milestone 1's
 * schema comment: "Arena V1 stays frozen and running exactly as it does
 * today"). Deliberately narrower than V1's version: V1 also applies an
 * attempt-count decay multiplier and a time-taken bonus, both of which need
 * submission-level metadata (attempt number, time taken) that this
 * milestone's Reward Engine does not accept as input, by design — see
 * docs/future-improvements.md for the trade-off.
 */
export const CHALLENGE_ELO_BY_DIFFICULTY = { Easy: 800, Medium: 1100, Hard: 1400, Expert: 1700 }
export const START_ELO = 800
const ELO_FLOOR = 100
const MAX_NEGATIVE_DELTA = -30
const MIN_PASSING_DELTA = 3

/**
 * @param {{ currentElo: number, difficulty: string, score: number }} input
 * @returns {{ delta: number, newElo: number }}
 */
export function computeEloDelta({ currentElo, difficulty, score }) {
  if (typeof currentElo !== "number" || Number.isNaN(currentElo)) throw new Error("computeEloDelta: currentElo must be a number")
  if (typeof score !== "number" || Number.isNaN(score)) throw new Error("computeEloDelta: score must be a number")

  const challengeElo = CHALLENGE_ELO_BY_DIFFICULTY[difficulty] || CHALLENGE_ELO_BY_DIFFICULTY.Medium
  const expected = 1 / (1 + Math.pow(10, (challengeElo - currentElo) / 400))
  const actual = Math.max(0, Math.min(1, score / 100))
  const K = currentElo < 800 ? 48 : currentElo < 1100 ? 36 : currentElo < 1400 ? 28 : 20

  let delta = Math.round(K * (actual - expected))
  // A genuinely passing attempt (score >= 70) should never net a token
  // +0/+1 against a much stronger opponent rating — carries forward the
  // same floor V1 applies.
  if (actual >= 0.7 && delta < MIN_PASSING_DELTA) delta = MIN_PASSING_DELTA
  if (delta < MAX_NEGATIVE_DELTA) delta = MAX_NEGATIVE_DELTA

  const newElo = Math.max(ELO_FLOOR, currentElo + delta)
  return { delta, newElo }
}
