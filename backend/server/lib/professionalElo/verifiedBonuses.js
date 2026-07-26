/**
 * verifiedBonuses.js — bounded, verification-gated ELO modifiers (Skill
 * Rating v2, Phase 1 — see docs/elo-engine-v2-architecture.md §D.3/D.4).
 *
 * TRUST-GATING RULE (non-negotiable, enforced here and ONLY here):
 *   - experience_bonus_elo is 0 until the user's EPFO/UAN verification has
 *     actually succeeded (epf_records.verification_status === 'verified').
 *     It is NEVER touched by resume upload, manual experience entry, or any
 *     other profile CRUD path — those write only to `profiles`/
 *     `career_timeline`/etc, and none of that code imports this module.
 *   - cert_bonus_elo is 0 until a professional_certifications row's
 *     verification_status is 'verified'. Self-added, unverified certificates
 *     (still visible in the profile as "claimed") contribute nothing.
 *
 * Both bonuses are RECOMPUTED (pure functions of current verified state),
 * never incremented — this is what makes duplicate verification callbacks
 * safe: calling recompute twice for the same verified state produces a
 * second event with delta 0, never double-counts.
 *
 * KNOWN SIMPLIFICATION (documented, not hidden): the experience bonus uses
 * `profiles.years_of_experience` (a self-reported magnitude) as the input to
 * the diminishing-returns table, but only applies it once EPFO verification
 * has independently confirmed real employment exists. This is a pragmatic
 * v1 slice — a fuller v2 would derive years directly from verified
 * per-employer date ranges (see the architecture doc's `claimed_experience`
 * design) rather than trusting the self-reported total once *any*
 * employer is verified. Flagged here rather than silently shipped as if it
 * were the full per-employer model.
 */
import { supabaseAdmin } from "../supabase.js"

export const MAX_EXPERIENCE_BONUS = 150
export const MAX_CERT_BONUS = 80

// Guidance table (diminishing returns) — step function: the bonus for a
// given years_of_experience is the value at the highest threshold the user
// meets or exceeds. Deliberately NOT interpolated/smoothed — these are the
// exact guidance values, nothing invented between them.
const EXPERIENCE_STEPS = [
  { years: 0, bonus: 0 },
  { years: 1, bonus: 20 },
  { years: 2, bonus: 35 },
  { years: 3, bonus: 50 },
  { years: 5, bonus: 75 },
  { years: 7, bonus: 90 },
  { years: 10, bonus: 110 },
  { years: 15, bonus: 130 },
  { years: 20, bonus: 150 },
]

export function computeExperienceBonus(verifiedYears) {
  if (!verifiedYears || verifiedYears <= 0) return 0
  let bonus = 0
  for (const step of EXPERIENCE_STEPS) {
    if (verifiedYears >= step.years) bonus = step.bonus
  }
  return Math.min(bonus, MAX_EXPERIENCE_BONUS)
}

// Certification guidance values — the ONLY cert_type keys the system
// recognizes. Claiming an unrecognized type is rejected at claim-time
// (see professionalCertifications.js route) rather than silently
// defaulting to some value — closes the "invent a new cert type" gaming
// vector.
export const CERT_VALUES = {
  oscp: 20,
  aws_professional: 18,
  google_professional_cloud: 18,
  azure_architect: 17,
  cka: 17,
  rhce: 16,
  ceh: 10,
  coursera_professional: 5,
  udemy: 2,
  workshop: 1,
}

export function computeCertBonusFromVerifiedList(verifiedCerts) {
  const total = (verifiedCerts || []).reduce((sum, c) => sum + (CERT_VALUES[c.cert_type] || 0), 0)
  return Math.min(total, MAX_CERT_BONUS)
}

function clampElo(v, minElo, maxElo) {
  return Math.max(minElo, Math.min(maxElo, Math.round(v)))
}

/**
 * Recomputes experience_bonus_elo for a user from their CURRENT verified
 * EPFO/UAN state. Idempotent: safe to call after every EPFO status check,
 * webhook, or manual admin verification action — if nothing changed, the
 * recorded delta is 0 and no event is written.
 *
 * @param {object} db — supabaseAdmin (or a fake for tests)
 * @param {string} userId
 */
export async function recomputeExperienceBonus(db, userId) {
  const { data: pp } = await db.from("professional_profiles").select("id").eq("user_id", userId).maybeSingle()

  let isEpfoVerified = false
  if (pp) {
    const { data: records } = await db.from("epf_records").select("verification_status").eq("professional_profile_id", pp.id)
    isEpfoVerified = (records || []).some(r => r.verification_status === "verified")
  }

  const { data: profile } = await db.from("profiles").select("years_of_experience").eq("id", userId).maybeSingle()
  const verifiedYears = isEpfoVerified ? (profile?.years_of_experience || 0) : 0
  const newBonus = computeExperienceBonus(verifiedYears)

  return applyBonusRecompute(db, {
    userId,
    field: "experience_bonus_elo",
    newBonus,
    eventType: "experience_bonus_recompute",
    reason: isEpfoVerified
      ? `EPFO/UAN verification confirmed — verified experience bonus set to +${newBonus} (based on ${verifiedYears} year${verifiedYears === 1 ? "" : "s"} of experience)`
      : "No verified EPFO/UAN record on file — experience bonus is 0 until verification succeeds",
  })
}

/**
 * Recomputes cert_bonus_elo for a user from ALL of their currently
 * `verified` professional_certifications rows. Idempotent for the same
 * reason as recomputeExperienceBonus — pure function of current state.
 */
export async function recomputeCertBonus(db, userId) {
  const { data: certs } = await db.from("professional_certifications")
    .select("cert_type, verification_status")
    .eq("user_id", userId)
    .eq("verification_status", "verified")

  const newBonus = computeCertBonusFromVerifiedList(certs || [])

  return applyBonusRecompute(db, {
    userId,
    field: "cert_bonus_elo",
    newBonus,
    eventType: "cert_bonus_recompute",
    reason: (certs || []).length > 0
      ? `Certificate verification confirmed — verified certification bonus set to +${newBonus} (${certs.length} verified certificate${certs.length === 1 ? "" : "s"})`
      : "No verified certificates on file — certification bonus is 0 until verification succeeds",
  })
}

async function applyBonusRecompute(db, { userId, field, newBonus, eventType, reason }) {
  const { data: state } = await db.from("professional_elo_state").select("*").eq("user_id", userId).maybeSingle()
  if (!state) {
    // No ELO state row yet for this user — nothing to recompute onto. The
    // bonus will be picked up correctly once getOrCreateEloState creates
    // their row (e.g. on first Skill Pulse or first status read).
    return { applied: false, reason: "no_elo_state_yet" }
  }

  const oldBonus = state[field] || 0
  if (oldBonus === newBonus) {
    // Idempotent no-op — this is what makes duplicate verification
    // callbacks (webhook retries, repeated status polls) safe.
    return { applied: false, oldBonus, newBonus }
  }

  const oldOverall = clampElo(state.elo + (state.experience_bonus_elo || 0) + (state.cert_bonus_elo || 0), 400, 2400)
  const newState = { ...state, [field]: newBonus }
  const newOverall = clampElo(newState.elo + (newState.experience_bonus_elo || 0) + (newState.cert_bonus_elo || 0), 400, 2400)

  await db.from("professional_elo_state").update({
    [field]: newBonus,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId)

  await db.from("professional_elo_events").insert({
    user_id: userId,
    event_type: eventType,
    delta: newOverall - oldOverall,
    old_elo: oldOverall,
    new_elo: newOverall,
    reason,
    affected_skills: [],
    next_action: null,
  })

  return { applied: true, oldBonus, newBonus, oldOverall, newOverall }
}
