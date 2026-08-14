/**
 * reward-engine/engine.js — Milestone 9
 * ---------------------------------------------------------------------------
 * The Reward Engine: strictly downstream of Assessment.
 *
 *   Assessment -> Result -> Reward Engine -> ELO / XP -> Skill Progress
 *
 * This module consumes only `{ assessment, instance }` — `assessment` for
 * the one number that matters (`final_score`) plus its own identity
 * (`id`, `user_id`), `instance` for routing metadata (`challenge_type`,
 * `role`, `skill`, `difficulty`, `career_family`, `reward_rules`). It has
 * ZERO knowledge of validators, submissions, workstations, or how any
 * challenge was graded — the same boundary discipline as assessment/
 * engine.js not knowing how XP is calculated, mirrored on this side: the
 * Reward Engine doesn't know how SQL (or anything else) was graded.
 *
 * Portfolio Decision (the diagram's final box) is explicitly OUT OF SCOPE
 * here — that's Milestone 10 ("Portfolio & Recruiter Evidence"). This
 * engine reads nothing from `instance.portfolio_decision` and writes
 * nothing to av2_portfolio_artifacts.
 *
 * IDEMPOTENCY: `av2_assessments.submission_id` is UNIQUE, so a given
 * assessment can only ever be created once per submission — but if reward
 * posting itself is ever retried against the SAME already-created
 * assessment (e.g. a caller retrying after a transient failure), this
 * engine checks for an existing ledger row keyed by `assessment_id` first
 * and short-circuits rather than double-crediting ELO/XP or double-counting
 * a skill-progress attempt. This is a practical safeguard, not a full
 * transactional guarantee — see docs/future-improvements.md for the
 * broader retry/idempotency trade-off this milestone accepted.
 *
 * Dependency-injected, same pattern as every prior milestone.
 */
import * as repo from "./repository.js"
import { computeEloDelta, START_ELO } from "./eloFormula.js"
import { computeXpGained } from "./xpFormula.js"
import { nextSkillProgress } from "./skillProgress.js"

export class RewardEngineError extends Error {}
export class RewardRulesViolationError extends RewardEngineError {}

export const defaultDeps = {
  getLatestEloForRole: repo.getLatestEloForRole,
  getEloEntryForAssessment: repo.getEloEntryForAssessment,
  getXpEntryForAssessment: repo.getXpEntryForAssessment,
  insertEloLedgerEntry: repo.insertEloLedgerEntry,
  insertXpLedgerEntry: repo.insertXpLedgerEntry,
  getSkillProgress: repo.getSkillProgress,
  upsertSkillProgress: repo.upsertSkillProgress,
}

/**
 * @param {{ assessment: object, instance: object }} input
 * @param {object} deps
 * @returns {Promise<{ eloEntry: object|null, xpEntry: object|null, skillProgress: object, alreadyApplied: boolean }>}
 */
export async function applyRewards({ assessment, instance }, deps = defaultDeps) {
  if (!assessment) throw new RewardEngineError("applyRewards: assessment is required")
  if (!instance) throw new RewardEngineError("applyRewards: instance is required")
  if (typeof assessment.final_score !== "number") {
    throw new RewardEngineError("applyRewards: assessment.final_score must be a number")
  }

  // Defensive re-check of the frozen ELO/XP split invariant, independent of
  // schemaValidator.js's issuance-time check — never trust upstream
  // blindly (same philosophy stated in schemaValidator.js and router.js).
  // This checks the row as actually PERSISTED, not the payload as
  // generated, in case anything else ever produced a differently-shaped row.
  const rewardRules = instance.reward_rules || {}
  if (instance.challenge_type === "common" && rewardRules.common?.elo !== false) {
    throw new RewardRulesViolationError(
      "Common challenge instance has rewardRules.common.elo !== false — refusing to post rewards rather than risk awarding ELO on a Common Challenge"
    )
  }
  if (instance.challenge_type === "domain" && rewardRules.domain?.elo !== true) {
    throw new RewardRulesViolationError(
      "Domain challenge instance has rewardRules.domain.elo !== true — refusing to post rewards rather than risk an ELO-eligible challenge going XP-only"
    )
  }

  const isDomain = instance.challenge_type === "domain"

  // Idempotency check — see header note.
  const existing = isDomain
    ? await deps.getEloEntryForAssessment(assessment.id)
    : await deps.getXpEntryForAssessment(assessment.id)
  if (existing) {
    const skillProgress = await deps.getSkillProgress(assessment.user_id, instance.career_family, instance.skill)
    return {
      eloEntry: isDomain ? existing : null,
      xpEntry: isDomain ? null : existing,
      skillProgress,
      alreadyApplied: true,
    }
  }

  let eloEntry = null
  let xpEntry = null

  if (isDomain) {
    const currentElo = (await deps.getLatestEloForRole(assessment.user_id, instance.role)) ?? START_ELO
    const { delta, newElo } = computeEloDelta({
      currentElo,
      difficulty: instance.difficulty,
      score: assessment.final_score,
    })
    eloEntry = await deps.insertEloLedgerEntry({
      userId: assessment.user_id,
      assessmentId: assessment.id,
      role: instance.role,
      eloBefore: currentElo,
      eloAfter: newElo,
      delta,
      reason: `${instance.skill} (${instance.difficulty})`,
    })
  } else {
    const xpGained = computeXpGained({ difficulty: instance.difficulty, finalScore: assessment.final_score })
    xpEntry = await deps.insertXpLedgerEntry({
      userId: assessment.user_id,
      assessmentId: assessment.id,
      skill: instance.skill,
      xpGained,
      // Simplified proxy, NOT a real consecutive-day streak — true streak
      // tracking needs its own per-user daily-completion state, which
      // doesn't exist yet (see docs/future-improvements.md, carried
      // forward from the note left at Milestone 2/6). This is honestly
      // "was this a genuine, non-zero-effort completion," nothing more.
      streakCounted: !assessment.is_zero_effort && assessment.final_score > 0,
    })
  }

  const currentSkillProgress = await deps.getSkillProgress(assessment.user_id, instance.career_family, instance.skill)
  const updates = nextSkillProgress({ current: currentSkillProgress, finalScore: assessment.final_score })
  const skillProgress = await deps.upsertSkillProgress({
    userId: assessment.user_id,
    careerFamily: instance.career_family,
    skill: instance.skill,
    masteryState: updates.mastery_state,
    attemptsCount: updates.attempts_count,
    bestScore: updates.best_score,
    lastAttemptedAt: updates.last_attempted_at,
  })

  return { eloEntry, xpEntry, skillProgress, alreadyApplied: false }
}
