/**
 * eloEngine.js — Professional ELO (real assessment-performance rating track).
 *
 * PRODUCT DECISION (2026-07-25): Professional users get a visible Professional
 * ELO. This is a SEPARATE track from the existing profile-completeness-driven
 * fields on `profiles` (role_elo, market_elo, proof_elo, mobility_elo,
 * elo_rating, aura_score — all computed by computeEloSignals() in
 * professionalProfile.js, recalculated on every POST /pro/profile). Those
 * fields are driven by profile completeness (skills count, experiences
 * count, EPFO verification, certs count, vault files) — under the new
 * product rules, ELO must move ONLY from real assessment performance and
 * MUST NEVER change from profile CRUD/resume edits/company linking/cert
 * import. Rather than retrofit that architecture (large, risky, touches a
 * live route many other surfaces depend on), this is a new, independent
 * table + engine: professional_elo_state / professional_elo_events. Nothing
 * in professionalProfile.js was touched, so by construction profile CRUD
 * cannot reach this track — see career_os_professional_elo migration.
 *
 * Where this is called from: backend/server/routes/weeklyPulse.js's
 * POST /pro/weekly/:pulseId/complete — the SAME place skill-graph confidence
 * feedback already applies (confidenceFeedback.js), so a completed pulse
 * produces both a skill-graph update AND a Professional ELO event from the
 * same real assessment data, in the same request.
 *
 * Bounds (all deliberately conservative — "bounded, not destructive", per
 * product rule 6):
 *   - A single pulse can move ELO by at most +/-40 total (MAX_PULSE_DELTA),
 *     regardless of question count — mirrors the existing +/-15-per-skill
 *     cap philosophy already used for skill confidence.
 *   - ELO is clamped to [MIN_ELO, MAX_ELO] at all times.
 *   - Inactivity decay only begins after 14 full days with no completed
 *     pulse (product rule 5); decay is a small fixed amount per day beyond
 *     that, with the number of "decay days" counted in a single catch-up
 *     capped at MAX_DECAY_DAYS — so returning after a long absence never
 *     produces an unbounded drop in one application, and decay can never
 *     push ELO below MIN_ELO.
 */

// v2 trust-gating update (2026-07-26, docs/elo-engine-v2-architecture.md):
// base raised to 800 (professional baseline) and ceiling raised to 2400 to
// leave room for the new bounded experience/cert modifiers (max +150/+80,
// see verifiedBonuses.js) on top of assessment-driven capability. Existing
// professional_elo_state rows are untouched by this constant change — only
// NEW rows (first-time professional users) get 800; nobody's already-stored
// ELO retroactively shifts.
export const STARTING_ELO = 800
export const MIN_ELO = 400
export const MAX_ELO = 2400

const MAX_PULSE_DELTA = 40
const PER_QUESTION_BASE = 4 // before difficulty scaling

const INACTIVITY_GRACE_DAYS = 14 // product rule 5 — decay starts day 15
const DECAY_PER_DAY = 2
const MAX_DECAY_DAYS = 30 // bounds a single catch-up application (product rule 6)

function clampElo(v) {
  return Math.max(MIN_ELO, Math.min(MAX_ELO, Math.round(v)))
}

/**
 * @param {Array<{isCorrect: boolean, difficulty?: number}>} answered — every
 *   answered question in the completed pulse, difficulty 1-5 (defaults to 3
 *   / neutral if not present on the question row).
 */
export function computePulseEloDelta(answered) {
  let raw = 0
  for (const a of answered) {
    const difficulty = a.difficulty && a.difficulty >= 1 && a.difficulty <= 5 ? a.difficulty : 3
    const scale = difficulty / 3 // difficulty 3 = 1x, difficulty 5 = ~1.67x, difficulty 1 = ~0.33x
    raw += (a.isCorrect ? 1 : -1) * PER_QUESTION_BASE * scale
  }
  const cappedDelta = Math.max(-MAX_PULSE_DELTA, Math.min(MAX_PULSE_DELTA, Math.round(raw)))
  return { rawDelta: Math.round(raw), cappedDelta, capped: Math.round(raw) !== cappedDelta }
}

/**
 * @param {number} daysInactive — whole days since the user's last completed
 *   pulse (or last decay application, whichever is more recent).
 */
export function computeFreshnessDecay(daysInactive) {
  if (!daysInactive || daysInactive <= INACTIVITY_GRACE_DAYS) {
    return { decayDays: 0, delta: 0 }
  }
  const decayDays = Math.min(daysInactive - INACTIVITY_GRACE_DAYS, MAX_DECAY_DAYS)
  const delta = -(decayDays * DECAY_PER_DAY)
  return { decayDays, delta }
}

function buildNextAction({ correctCount, questionCount, skillsToRevisit }) {
  if (questionCount === 0) return "Take this week's Skill Pulse to keep your Professional ELO active."
  const accuracy = correctCount / questionCount
  if (accuracy >= 0.8) return "Strong pulse — keep the streak going next week."
  if (skillsToRevisit?.length) {
    const names = skillsToRevisit.slice(0, 2).map(s => s.skill_name || "a recent skill").join(", ")
    return `Review ${names} — that's where this pulse showed the biggest gap.`
  }
  return "Review this week's missed questions before your next pulse."
}

/**
 * Applies one completed pulse's outcome to the Professional ELO track.
 * Creates the user's elo-state row (at STARTING_ELO) on first use.
 *
 * @param {object} db — supabaseAdmin
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.pulseId
 * @param {Array<{isCorrect: boolean, difficulty?: number}>} params.answered
 * @param {number} params.correctCount
 * @param {number} params.questionCount
 * @param {Array<{skill_id: string, skill_name: string|null, delta: number}>} params.skillsRefreshed
 * @param {Array<{skill_id: string, skill_name: string|null, delta: number}>} params.skillsToRevisit
 */
export async function applyPulseCompletionToElo(db, {
  userId, pulseId, answered, correctCount, questionCount, skillsRefreshed = [], skillsToRevisit = [],
}) {
  const state = await getOrCreateEloState(db, userId)
  const { cappedDelta } = computePulseEloDelta(answered)

  const oldElo = state.elo
  const newElo = clampElo(oldElo + cappedDelta)
  const actualDelta = newElo - oldElo

  const affectedSkills = [...skillsRefreshed, ...skillsToRevisit].map(s => ({
    skill_id: s.skill_id, skill_name: s.skill_name, delta: s.delta,
  }))

  const reason = `Weekly Skill Pulse completed: ${correctCount}/${questionCount} correct`
    + (actualDelta !== 0 ? ` -> ${actualDelta > 0 ? "+" : ""}${actualDelta} Professional ELO` : " -> no ELO change (net-neutral pulse)")

  const nextAction = buildNextAction({ correctCount, questionCount, skillsToRevisit })

  await db.from("professional_elo_state").update({
    elo: newElo,
    last_assessment_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId)

  await db.from("professional_elo_events").insert({
    user_id: userId,
    event_type: actualDelta >= 0 ? "assessment_correct" : "assessment_incorrect",
    delta: actualDelta,
    old_elo: oldElo,
    new_elo: newElo,
    reason,
    affected_skills: affectedSkills,
    next_action: nextAction,
    pulse_id: pulseId,
  })

  return { oldElo, newElo, delta: actualDelta, reason, affectedSkills, nextAction }
}

/**
 * Lazily applies bounded inactivity decay if 15+ days have passed since the
 * user's last completed pulse (or last decay application). Called at read
 * time (GET /pro/elo/professional) and before generating a new pulse — there
 * is no scheduler/cron in this codebase (deliberately not added for this
 * feature either), so decay is computed on-demand rather than pushed on a
 * timer. Safe to call on every read: a no-op when not yet due.
 */
export async function applyPendingDecay(db, userId) {
  const state = await getOrCreateEloState(db, userId)
  const lastActivity = state.last_assessment_at ? new Date(state.last_assessment_at) : new Date(state.created_at)
  const lastDecayCheckpoint = state.last_decay_applied_at ? new Date(state.last_decay_applied_at) : lastActivity
  // Decay accrues from whichever is more recent: real activity, or the last
  // time we already applied decay for this gap — prevents double-counting.
  const since = lastDecayCheckpoint > lastActivity ? lastDecayCheckpoint : lastActivity
  const daysInactive = Math.floor((Date.now() - since.getTime()) / (24 * 60 * 60 * 1000))

  const { decayDays, delta } = computeFreshnessDecay(daysInactive)
  if (decayDays === 0) return { applied: false, elo: state.elo }

  const oldElo = state.elo
  const newElo = clampElo(oldElo + delta)
  const actualDelta = newElo - oldElo
  const now = new Date().toISOString()

  await db.from("professional_elo_state").update({
    elo: newElo,
    last_decay_applied_at: now,
    updated_at: now,
  }).eq("user_id", userId)

  if (actualDelta !== 0) {
    await db.from("professional_elo_events").insert({
      user_id: userId,
      event_type: "decay",
      delta: actualDelta,
      old_elo: oldElo,
      new_elo: newElo,
      // NAMING RULE (weeklyPulse.js header): this feature must never be
      // called "assessment" in any user-facing text — "Skill Pulse" only.
      reason: `No Skill Pulse activity for ${daysInactive} days — skill-freshness decay (${decayDays} day${decayDays === 1 ? "" : "s"} past the 14-day grace period)`,
      affected_skills: [],
      next_action: "Take this week's Skill Pulse to stop freshness decay and start recovering ELO.",
    })
  }

  return { applied: actualDelta !== 0, elo: newElo, delta: actualDelta }
}

export async function getOrCreateEloState(db, userId) {
  const { data: existing } = await db.from("professional_elo_state").select("*").eq("user_id", userId).maybeSingle()
  if (existing) return existing

  const now = new Date().toISOString()
  const { data: created, error } = await db.from("professional_elo_state").insert({
    user_id: userId, elo: STARTING_ELO, created_at: now, updated_at: now,
  }).select().single()
  if (error) {
    // Race with a concurrent first-read — re-fetch rather than fail.
    const { data: retry } = await db.from("professional_elo_state").select("*").eq("user_id", userId).maybeSingle()
    if (retry) return retry
    throw error
  }
  return created
}
