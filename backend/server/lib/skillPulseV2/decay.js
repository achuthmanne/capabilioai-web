/**
 * decay.js — Career OS Workstream 3, Part E: explainable skill decay state.
 *
 * Pure, dependency-free. Given a skill and the set of "relevant signals" that
 * touched it, returns a decay state PLUS the exact signal that drove that
 * state — never just a bucket or a bare score (product rule: "show the exact
 * driver, never only a score").
 *
 * States (exact boundaries from the Workstream 3 instructions):
 *   Fresh    — fewer than 4 weeks since the most recent relevant signal
 *   Aging    — 4 to 7 weeks
 *   At Risk  — 8 to 15 weeks
 *   Decayed  — 16+ weeks (or no relevant signal has ever been recorded)
 *
 * A "relevant signal" is one of:
 *   weekly_pulse_activity — the skill was answered on (correctly or not — the
 *     ACT of engaging with it is the signal, not the score) in a completed
 *     weekly pulse
 *   verified_proof        — a verified project/proof artifact tied to the skill
 *   certification         — a relevant certification (career_events
 *     certification_earned, or profiles.certifications entry, matched by name)
 *   verified_skill_event   — a verified career_events skill_verified event
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export const DECAY_STATES = Object.freeze({
  FRESH: "fresh",
  AGING: "aging",
  AT_RISK: "at_risk",
  DECAYED: "decayed",
})

export const DECAY_STATE_LABELS = {
  [DECAY_STATES.FRESH]: "Fresh",
  [DECAY_STATES.AGING]: "Aging",
  [DECAY_STATES.AT_RISK]: "At Risk",
  [DECAY_STATES.DECAYED]: "Decayed",
}

const SIGNAL_TYPES = new Set([
  "weekly_pulse_activity", "verified_proof", "certification", "verified_skill_event",
])

const SIGNAL_LABELS = {
  weekly_pulse_activity: "Answered a Weekly Pulse question on this skill",
  verified_proof: "Verified project/proof evidence submitted",
  certification: "Relevant certification recorded",
  verified_skill_event: "Verified skill event recorded",
}

function weeksSince(date, now) {
  return (now.getTime() - date.getTime()) / WEEK_MS
}

function stateForWeeks(weeks) {
  if (weeks < 4) return DECAY_STATES.FRESH
  if (weeks < 8) return DECAY_STATES.AGING
  if (weeks < 16) return DECAY_STATES.AT_RISK
  return DECAY_STATES.DECAYED
}

/**
 * @param {Array<{type: string, occurred_at: string|Date, label?: string}>} signals
 * @param {Date} [now]
 * @returns {{state: string, stateLabel: string, weeksSinceSignal: number|null, driver: object|null}}
 */
export function computeDecayState(signals, now = new Date()) {
  const valid = (signals || [])
    .filter(s => s && SIGNAL_TYPES.has(s.type) && s.occurred_at)
    .map(s => ({ ...s, _date: s.occurred_at instanceof Date ? s.occurred_at : new Date(s.occurred_at) }))
    .filter(s => !isNaN(s._date.getTime()))

  if (!valid.length) {
    return {
      state: DECAY_STATES.DECAYED,
      stateLabel: DECAY_STATE_LABELS[DECAY_STATES.DECAYED],
      weeksSinceSignal: null,
      driver: null, // no relevant signal on record — explicit, not hidden behind a score
    }
  }

  // Most recent signal wins — that's what "relevant signal" freshness means.
  valid.sort((a, b) => b._date - a._date);
  const mostRecent = valid[0]
  const weeks = weeksSince(mostRecent._date, now)
  const state = stateForWeeks(weeks)

  return {
    state,
    stateLabel: DECAY_STATE_LABELS[state],
    weeksSinceSignal: Math.round(weeks * 10) / 10,
    driver: {
      type: mostRecent.type,
      label: mostRecent.label || SIGNAL_LABELS[mostRecent.type],
      occurred_at: mostRecent._date.toISOString(),
    },
  }
}

/**
 * Convenience: decay state for a whole set of skills at once, keyed by
 * skill id. `signalsBySkillId` maps skill id -> signal array (already
 * gathered by the caller from weekly_answers/proof_artifacts/career_events/
 * certifications — this module has no DB access, by design).
 */
export function computeDecayStates(skillIds, signalsBySkillId, now = new Date()) {
  const out = {}
  for (const id of skillIds) {
    out[id] = computeDecayState(signalsBySkillId?.[id] || [], now)
  }
  return out
}

export function isAtRiskOrWorse(decayState) {
  return decayState === DECAY_STATES.AT_RISK || decayState === DECAY_STATES.DECAYED
}
