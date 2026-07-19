/**
 * reward-engine/skillProgress.js — Milestone 9
 * ---------------------------------------------------------------------------
 * Pure mastery-state logic for av2_skill_progress (Milestone 1's table,
 * read by Challenge Engine's selection.js since Milestone 3 but never
 * written to by anything until now — closing that loop is explicitly this
 * milestone's job).
 *
 * DELIBERATELY SIMPLE, flagged as a placeholder (same honesty as Milestone
 * 3's selection.js header note about Skill Engine): mastery state is
 * recomputed from `best_score` alone, which only ever increases (monotonic
 * by construction — see `nextSkillProgress`), so a single strong attempt is
 * never undone by a later weak one. This is not a trend-aware or
 * recency-weighted model — see docs/future-improvements.md.
 */
const MASTERED_THRESHOLD = 85
const PROFICIENT_THRESHOLD = 65
const WEAK_THRESHOLD = 40
const WEAK_MIN_ATTEMPTS = 2

/**
 * @param {{ bestScore: number, attemptsCount: number }} input
 * @returns {string} one of av2_skill_progress's mastery_state enum values
 *          (never 'unattempted' — this function is only called once an
 *          attempt has actually happened)
 */
export function computeMasteryState({ bestScore, attemptsCount }) {
  if (bestScore >= MASTERED_THRESHOLD) return "mastered"
  if (bestScore >= PROFICIENT_THRESHOLD) return "proficient"
  if (attemptsCount >= WEAK_MIN_ATTEMPTS && bestScore < WEAK_THRESHOLD) return "weak"
  return "attempted"
}

/**
 * @param {{ current: object|null, finalScore: number, now?: Date }} input
 * @returns {{ attempts_count: number, best_score: number, mastery_state: string, last_attempted_at: string }}
 */
export function nextSkillProgress({ current, finalScore, now = new Date() }) {
  if (typeof finalScore !== "number" || Number.isNaN(finalScore)) {
    throw new Error("nextSkillProgress: finalScore must be a number")
  }
  const attemptsCount = (current?.attempts_count || 0) + 1
  const bestScore = Math.max(current?.best_score ?? 0, finalScore)
  return {
    attempts_count: attemptsCount,
    best_score: bestScore,
    mastery_state: computeMasteryState({ bestScore, attemptsCount }),
    last_attempted_at: now.toISOString(),
  }
}
