/**
 * verification/providers/declared.js — Trust & Verification Center, Phase 1
 * ---------------------------------------------------------------------------
 * Providers named in the spec that are NOT wired to a real verification
 * path yet. Declared honestly as capability='unsupported' rather than
 * faked — calling verify() on any of these throws, so a caller can never
 * accidentally produce a false "verified" result from a provider that
 * doesn't actually check anything. This list is exactly the modularity
 * point of the framework: adding a real integration later means writing
 * one new provider file and registering it — nothing else in the pipeline
 * changes.
 *
 * DigiLocker and EPFO specifically already have STUB routes in
 * routes/verify.js (any OTP != "000000" passes) — those are pre-existing
 * demo scaffolding, not part of this framework, and are NOT what
 * capability='unsupported' here refers to. They are unsupported in the
 * sense that no REAL DigiLocker/EPFO API call happens anywhere in this
 * codebase yet.
 */
const NOTES = {
  aws: "AWS Certification verification requires AWS's partner verification API (not public) or credential-ID lookup on their verify page — not yet integrated.",
  microsoft: "Microsoft Learn certification verification requires Credly/Microsoft's badge API — not yet integrated.",
  cisco: "Cisco certification verification requires Cisco's credential verification portal API — not yet integrated.",
  digilocker: "DigiLocker has a stub OTP flow in routes/verify.js for demo purposes only — no real DigiLocker API integration exists.",
  employer_epfo: "EPFO has a real employer-name-matching flow in routes/verify.js (matchEpfoToExperiences) but the EPFO API call itself is stubbed — not yet integrated.",
  university: "University/institution verification (degree confirmation) has no standard public API — requires per-institution partnership or DigiLocker's academic records API once that's integrated.",
  employer: "Direct employer verification (employment confirmation) has no public API — requires per-employer partnership, or routes through the existing EPFO employer-matching path.",
}

function unsupportedVerify(id) {
  return async () => {
    throw new Error(`Provider "${id}" is declared but not yet implemented — capability is 'unsupported'. See providers/declared.js for status.`)
  }
}

const DISPLAY_NAMES = {
  aws: "AWS", microsoft: "Microsoft", cisco: "Cisco", digilocker: "DigiLocker",
  employer_epfo: "EPFO", university: "University", employer: "Employer",
}

export const DECLARED_PROVIDERS = Object.entries(NOTES).map(([id, note]) => ({
  id,
  name: DISPLAY_NAMES[id] || id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
  capability: "unsupported",
  note,
  verify: unsupportedVerify(id),
}))
