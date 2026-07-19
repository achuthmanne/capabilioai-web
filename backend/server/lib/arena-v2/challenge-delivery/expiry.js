/**
 * challenge-delivery/expiry.js — Milestone 6
 * ---------------------------------------------------------------------------
 * Pure. Decides whether an already-fetched instance counts as expired, given
 * either an explicit `expires_at` or a fallback computed from
 * `submission_rules.timeLimitSecs` + `started_at`. No I/O — service.js calls
 * this on a row it already has in hand before deciding to reuse it.
 */
export function isInstanceExpired(instance, now = new Date()) {
  if (!instance) return true

  if (instance.expires_at) {
    return new Date(instance.expires_at).getTime() <= now.getTime()
  }

  const timeLimitSecs = instance.submission_rules?.timeLimitSecs
  if (typeof timeLimitSecs === "number" && instance.started_at) {
    const deadline = new Date(instance.started_at).getTime() + timeLimitSecs * 1000
    return deadline <= now.getTime()
  }

  // No expiry configured at all (untimed challenge, e.g. many Common
  // Challenges per content_spec/08) — never expires on its own.
  return false
}
