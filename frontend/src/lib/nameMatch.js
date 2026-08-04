// nameMatch.js — 2026-08-05
// ---------------------------------------------------------------------------
// Shared, deterministic (no AI call) identity-mismatch check used before
// applying data extracted from an uploaded resume, a GitHub profile, or a
// LinkedIn profile to a user's account. Direct product ask: a resume
// belonging to a different person was uploaded and its experience/education/
// skills were silently applied to the account without any check.
//
// Deliberately conservative — token-overlap based, not exact-match — so
// legitimate variation (middle names, nicknames, "Gopi Chand" vs
// "Gopi Nelluri" sharing "Gopi") does NOT get flagged. Only genuinely
// unrelated names (no shared token at all) are treated as a mismatch. This
// errs toward not annoying real users over catching every edge case; the
// caller decides what to do with a mismatch (this module never blocks
// anything itself, it only reports).
function normalizeTokens(raw) {
  return (raw || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2) // drop single-letter initials/noise
}

/**
 * @param {string} accountName the account's registered display name
 * @param {string} extractedName the name found in the uploaded/analyzed source
 * @returns {boolean} true only when there is no plausible connection between
 *   the two names — false whenever either name is missing/unparseable
 *   (can't judge a mismatch without two real names, so don't claim one)
 */
export function namesLikelyMismatch(accountName, extractedName) {
  const a = normalizeTokens(accountName)
  const b = normalizeTokens(extractedName)
  if (a.length === 0 || b.length === 0) return false
  const overlap = a.some(t => b.includes(t) || b.some(bt => bt.startsWith(t) || t.startsWith(bt)))
  return !overlap
}

/**
 * Builds the confirmation message shown to the user. Kept as a single
 * source of truth so the wording stays consistent across resume/GitHub/
 * LinkedIn upload flows.
 */
export function mismatchWarning(sourceLabel, accountName, extractedName) {
  return (
    `The name on this ${sourceLabel} ("${extractedName}") doesn't match your account name ` +
    `("${accountName}"). If this isn't your ${sourceLabel}, cancel and upload the correct one — ` +
    `applying someone else's data to your profile could get your account flagged.\n\n` +
    `Continue anyway?`
  )
}
