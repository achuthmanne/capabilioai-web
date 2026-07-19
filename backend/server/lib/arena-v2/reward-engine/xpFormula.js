/**
 * reward-engine/xpFormula.js — Milestone 9
 * ---------------------------------------------------------------------------
 * Pure XP math for Common Challenges. Same boundary as eloFormula.js: only
 * consumes what Assessment already produced (finalScore) plus the
 * difficulty tier — no validator/submission internals.
 *
 * XP_BASE_BY_DIFFICULTY values are a first, reasonable pass (not pinned to
 * any existing Arena V1 constant — V1's XP-equivalent path used the
 * ambiguous `elo_gained` column on `streak_events`, flagged as a naming
 * hazard in docs/future-improvements.md #2, so there was nothing to port
 * forward here). Revisit the exact numbers once there's real usage data;
 * the shape (base-by-difficulty, scaled by finalScore fraction) is the part
 * meant to be durable.
 */
export const XP_BASE_BY_DIFFICULTY = { Easy: 10, Medium: 20, Hard: 35, Expert: 50 }

/**
 * @param {{ difficulty: string, finalScore: number }} input
 * @returns {number} XP gained, rounded, >= 0
 */
export function computeXpGained({ difficulty, finalScore }) {
  if (typeof finalScore !== "number" || Number.isNaN(finalScore)) {
    throw new Error("computeXpGained: finalScore must be a number")
  }
  const base = XP_BASE_BY_DIFFICULTY[difficulty] || XP_BASE_BY_DIFFICULTY.Medium
  const fraction = Math.max(0, Math.min(1, finalScore / 100))
  return Math.round(base * fraction)
}
