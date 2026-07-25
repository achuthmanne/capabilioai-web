/**
 * pulseProgress.js — Career OS Workstream 3, Part D: pause/resume helpers.
 *
 * Same pattern the v1 flow already relies on (see docs/career-os-
 * implementation-plan.md §5d "Pause/resume behavior"): there's no separate
 * "paused" field — resumability falls out of persisting every answer
 * immediately and recomputing "where was I" on load. This module makes that
 * recomputation an explicit, pure, testable function instead of leaving it
 * inline in a React component (as v1's WeeklyCareerCheck.jsx does today).
 */

/**
 * @param {Array<{id: string}>} questions — in a stable, fixed order (the
 *   order they were selected/persisted in — never re-sorted between loads,
 *   or "resume" would land on the wrong question).
 * @param {Set<string>} answeredQuestionIds
 * @returns {{ index: number, isComplete: boolean }} index of the first
 *   unanswered question, or `questions.length` (with isComplete: true) if
 *   every question already has an answer.
 */
export function resumeAt(questions, answeredQuestionIds) {
  const idx = (questions || []).findIndex(q => !answeredQuestionIds.has(q.id))
  if (idx === -1) return { index: questions?.length || 0, isComplete: true }
  return { index: idx, isComplete: false }
}

/**
 * Keyboard-support mapping (Part D: arrows, 1-4, Enter). Pure translation
 * from a key event's `key` value to an intent — no DOM/React dependency, so
 * it's testable and reusable if the option count or layout ever changes.
 * @param {string} key — the raw KeyboardEvent.key value
 * @param {number} optionCount
 * @returns {{ type: "select", optionIndex: number } | { type: "next" } | { type: "prev" } | { type: "submit" } | null}
 */
export function mapKeyToIntent(key, optionCount) {
  if (key === "Enter") return { type: "submit" }
  if (key === "ArrowRight") return { type: "next" }
  if (key === "ArrowLeft") return { type: "prev" }
  const n = Number(key)
  if (Number.isInteger(n) && n >= 1 && n <= optionCount) {
    return { type: "select", optionIndex: n - 1 }
  }
  return null
}
