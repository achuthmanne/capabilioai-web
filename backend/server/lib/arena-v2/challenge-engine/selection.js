/**
 * challenge-engine/selection.js — Milestone 3
 * ---------------------------------------------------------------------------
 * Pure selection logic — no I/O. Everything here takes already-fetched rows
 * and returns a decision, so it's unit-testable without a database and
 * reusable regardless of where the rows came from (real Supabase today,
 * potentially a cache later).
 *
 * NOTE on scope: the frozen blueprint assigns "next best skill" and
 * "difficulty ladder" reasoning to the Skill Engine and Challenge Progression
 * modules, neither of which is scheduled as its own milestone yet. Rather
 * than block Challenge Engine on modules that don't exist, this file
 * implements a minimal, self-contained default strategy for both — pure
 * functions, injectable, clearly a placeholder. Logged in
 * docs/future-improvements.md: replace `pickNextSkill`/`pickDifficulty`'s
 * bodies with real calls into Skill Engine / Challenge Progression once those
 * milestones exist, without changing engine.js's call sites.
 */

export const MASTERY_STATES = ["unattempted", "attempted", "weak", "proficient", "mastered"]
export const DIFFICULTY_ORDER = ["Easy", "Medium", "Hard", "Expert"]

// ── Skill selection ──────────────────────────────────────────────────────────
// Default strategy: prefer a skill the student is weak on, then one never
// attempted, then round-robin the least-recently-attempted proficient skill.
// `candidateSkills` is the full list of skills this role/category actually
// has content for (from Challenge Library); `progressRows` is the student's
// av2_skill_progress rows (may be empty for a brand-new student).
export function pickNextSkill(candidateSkills, progressRows = []) {
  if (!Array.isArray(candidateSkills) || candidateSkills.length === 0) {
    throw new Error("pickNextSkill: no candidate skills available")
  }

  const progressBySkill = new Map(progressRows.map((r) => [r.skill, r]))

  const weak = candidateSkills.filter((s) => progressBySkill.get(s)?.mastery_state === "weak")
  if (weak.length) return weak[0]

  const unattempted = candidateSkills.filter((s) => !progressBySkill.has(s) || progressBySkill.get(s).mastery_state === "unattempted")
  if (unattempted.length) return unattempted[0]

  // Everything's been attempted at least once — round-robin by oldest last_attempted_at
  const withDates = candidateSkills
    .map((s) => ({ skill: s, lastAttempted: progressBySkill.get(s)?.last_attempted_at || null }))
    .sort((a, b) => {
      if (!a.lastAttempted) return -1
      if (!b.lastAttempted) return 1
      return new Date(a.lastAttempted) - new Date(b.lastAttempted)
    })
  return withDates[0].skill
}

// ── Difficulty selection ─────────────────────────────────────────────────────
// Maps a student's mastery_state for the chosen skill to a default tier, then
// clamps to whatever tiers the specific Challenge Template Version actually
// declares (content_spec/08: "not every template needs all four tiers").
export function defaultDifficultyForMastery(masteryState) {
  switch (masteryState) {
    case "mastered":   return "Expert"
    case "proficient": return "Hard"
    case "weak":       return "Easy"
    case "attempted":  return "Medium"
    case "unattempted":
    default:           return "Easy"
  }
}

export function pickDifficulty({ masteryState, declaredTiers, requested }) {
  if (!Array.isArray(declaredTiers) || declaredTiers.length === 0) {
    throw new Error("pickDifficulty: challenge template version declares no difficulty tiers")
  }

  const candidate = requested || defaultDifficultyForMastery(masteryState)

  if (declaredTiers.includes(candidate)) return candidate

  // Requested/default tier isn't declared on this template version — fall back
  // to the easiest tier the template actually supports, never silently to a
  // harder one than what was asked for.
  const sortedDeclared = [...declaredTiers].sort(
    (a, b) => DIFFICULTY_ORDER.indexOf(a) - DIFFICULTY_ORDER.indexOf(b)
  )
  return sortedDeclared[0]
}

// ── Template selection (anti-repetition) ─────────────────────────────────────
// `eligibleTemplates` already filtered by challengeType/role/skill/status at
// the query layer (challenge-library/repository.js). This applies
// anti-repetition on top: avoid the same template as the student's last N
// instances for this skill, but degrade gracefully (allow repeats) rather
// than fail if the pool would otherwise be empty.
export function pickTemplate(eligibleTemplates, recentTemplateIds = [], { avoidLastN = 3 } = {}) {
  if (!Array.isArray(eligibleTemplates) || eligibleTemplates.length === 0) {
    throw new Error("pickTemplate: no eligible challenge templates for this selection")
  }

  const recentSet = new Set(recentTemplateIds.slice(0, avoidLastN))
  const fresh = eligibleTemplates.filter((t) => !recentSet.has(t.id))
  const pool = fresh.length > 0 ? fresh : eligibleTemplates

  const degraded = fresh.length === 0 && eligibleTemplates.length > 0
  const picked = pool[Math.floor(Math.random() * pool.length)]

  return { template: picked, degradedToRepeat: degraded }
}

// ── Scenario selection (domain only) ─────────────────────────────────────────
export function pickScenario(scenarioPack, requestedScenarioId) {
  if (!scenarioPack || !Array.isArray(scenarioPack.scenarios) || scenarioPack.scenarios.length === 0) {
    return null
  }
  if (requestedScenarioId) {
    const match = scenarioPack.scenarios.find((s) => s.scenarioId === requestedScenarioId)
    if (match) return match
  }
  return scenarioPack.scenarios[0]
}
