/**
 * confidenceFeedback.js — Career OS Workstream 3, Part D: bounded, visible
 * confidence math for Weekly Skill Pulse V2 results.
 *
 * Same capped-nudge product rule as v1 (backend/server/routes/weeklyPulse.js
 * header comment): a single pulse can move a skill's level_score by at most
 * +/-15 total, split across however many questions touched that skill, never
 * per-question, and it only nudges — it never sets `verified`. This module
 * makes the math explicit and returns every intermediate value the results
 * screen needs to show its work ("visible bounded math" — not just a final
 * number), rather than only a final delta.
 */

const MAX_DELTA_PER_SKILL = 15
const MIN_LEVEL_SCORE = 0
const MAX_LEVEL_SCORE = 100

/**
 * @param {Array<{skillId: string, isCorrect: boolean}>} answersForSkill — every
 *   answered question that touched one specific skill in this pulse.
 * @param {number} previousLevelScore
 * @returns {{
 *   skillId: string, correct: number, total: number, ratio: number,
 *   rawDelta: number, cappedDelta: number, previousLevelScore: number,
 *   newLevelScore: number, capped: boolean, explanation: string
 * }}
 */
export function computeBoundedConfidenceChange(skillId, answersForSkill, previousLevelScore) {
  const total = answersForSkill.length
  const correct = answersForSkill.filter(a => a.isCorrect).length
  const ratio = total > 0 ? correct / total : 0.5
  // -1..+1 scaled to -15..+15, matching v1's exact formula so the two flows
  // stay comparable/consistent for a user who moves between them.
  const rawDelta = Math.round((ratio - 0.5) * 2 * MAX_DELTA_PER_SKILL)
  const cappedDelta = Math.max(-MAX_DELTA_PER_SKILL, Math.min(MAX_DELTA_PER_SKILL, rawDelta))
  const uncappedNewScore = previousLevelScore + cappedDelta
  const newLevelScore = Math.max(MIN_LEVEL_SCORE, Math.min(MAX_LEVEL_SCORE, uncappedNewScore))

  return {
    skillId,
    correct,
    total,
    ratio,
    rawDelta,
    cappedDelta,
    previousLevelScore,
    newLevelScore,
    capped: Math.abs(rawDelta) > MAX_DELTA_PER_SKILL || uncappedNewScore !== newLevelScore,
    explanation: `${correct}/${total} correct this pulse -> ${cappedDelta >= 0 ? "+" : ""}${cappedDelta} `
      + `(capped to +/-${MAX_DELTA_PER_SKILL} per pulse) -> ${previousLevelScore} -> ${newLevelScore}`,
  }
}

/**
 * @param {Array<{skillId, questionId, isCorrect}>} answers — all answers in
 *   the completed pulse (across all skills touched).
 * @param {Record<string, number>} previousLevelScoreBySkillId
 */
export function computeAllConfidenceChanges(answers, previousLevelScoreBySkillId) {
  const bySkill = new Map()
  for (const a of answers) {
    if (!a.skillId) continue
    const arr = bySkill.get(a.skillId) || []
    arr.push(a)
    bySkill.set(a.skillId, arr)
  }
  const changes = []
  for (const [skillId, arr] of bySkill.entries()) {
    const prev = previousLevelScoreBySkillId?.[skillId] ?? 50
    changes.push(computeBoundedConfidenceChange(skillId, arr, prev))
  }
  return changes
}

export const CONFIDENCE_FEEDBACK_MAX_DELTA_PER_SKILL = MAX_DELTA_PER_SKILL
