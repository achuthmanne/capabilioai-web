/**
 * eloRadar.js
 * ---------------------------------------------------------------------------
 * Relocated 2026-08-16 out of routes/arena.js during Arena's deletion — this
 * function is shared, not Arena-specific: skillStudio/roleGapSeeder.js also
 * depends on it to derive the same 0-100 radar score from a raw
 * skill_graph.elo_value, and skill_graph is Skill Studio's own table (kept).
 * Formula intentionally lives in exactly one place so every caller gets the
 * same scale.
 */
export function eloValueToRadarScore(eloValue) {
  const v = Number(eloValue) || 400
  return Math.max(0, Math.min(100, Math.round(((v - 400) / 1200) * 100)))
}
