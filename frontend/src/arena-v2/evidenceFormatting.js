// evidenceFormatting.js — Arena V2, final consolidation pass
// ---------------------------------------------------------------------------
// Pure-JS, no React, no network — the same discipline as workstationRegistry.js
// (unit-testable with node:test, importable from both the shared workspace
// shell and the recruiter view without pulling in any component code).
//
// WHY THIS FILE EXISTS: after twelve domain-workspace phases, two files had
// quietly drifted on how they present the exact same three facts —
// elapsed/time-taken, ELO delta, and "is this score good enough to show a
// recruiter" — because each was built independently against the same
// backend DTO shape rather than a shared source of truth:
//   - ArenaV2WorkspaceShell.jsx's TopMissionBar and BottomEvidenceArea each
//     hand-rolled their own "+"/"" sign-prefix logic for an ELO delta.
//   - ArenaV2RecruiterView.jsx had its own local `formatDuration` and its
//     own separate ELO-delta "+"/"—" formatting.
//   - ArenaV2RecruiterView.jsx hardcoded a "70" score threshold for the
//     green/yellow score color, with no link back to the fact that every
//     seeded av2_challenge_template_version across all twelve domains
//     already declares `portfolio_decision.minScoreToAutoPublish: 70` —
//     the SAME number, chosen independently, never centralized.
// None of this was a bug (all three call sites computed the same values),
// but it was drift risk: the next person editing one of them would have no
// signal that a sibling copy existed. This module is the single home for
// all three now. No behavior changes — every existing call site's rendered
// output is unchanged, this only removes the duplication.

// Matches `portfolio_decision.minScoreToAutoPublish` in 12 of the 13 seeded
// av2_challenge_template_versions (verified via execute_sql during this
// consolidation pass — one template, the original SQL/Data Analyst pilot,
// uses 80 instead). 70 was already the value ArenaV2RecruiterView.jsx
// hardcoded for its score-color threshold before this pass; this constant
// does not change that behavior, it only gives the existing number a single
// named home instead of being re-typed at each call site. It is a
// client-side display threshold only — the authoritative auto-publish gate
// is always read per-template from real backend data, never this constant.
export const RECRUITER_READY_SCORE_THRESHOLD = 70

/**
 * @param {number|null|undefined} delta
 * @returns {string} "+12", "-8", or "—" if delta is not a finite number
 */
export function formatEloDelta(delta) {
  if (typeof delta !== "number" || !Number.isFinite(delta)) return "—"
  return `${delta >= 0 ? "+" : ""}${delta}`
}

/**
 * @param {number|null|undefined} secs
 * @returns {string} "45s" for sub-minute durations, "12 min" otherwise, or
 *   "—" if secs is not a finite number
 */
export function formatDuration(secs) {
  if (typeof secs !== "number" || !Number.isFinite(secs)) return "—"
  const m = Math.round(secs / 60)
  return m < 1 ? `${secs}s` : `${m} min`
}

/**
 * @param {number|null|undefined} score
 * @returns {string} "82/100" or "—/100" if score is not a finite number
 */
export function formatScore(score) {
  const shown = typeof score === "number" && Number.isFinite(score) ? score : "—"
  return `${shown}/100`
}

/**
 * @param {number|null|undefined} score
 * @returns {boolean} whether this score clears the shared recruiter-ready
 *   bar — same 70 every content template already uses for auto-publish
 */
export function isRecruiterReadyScore(score) {
  return typeof score === "number" && Number.isFinite(score) && score >= RECRUITER_READY_SCORE_THRESHOLD
}
