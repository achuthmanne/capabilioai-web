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
  // STALE CLAIM CORRECTED (production audit): this used to say "the EPFO API
  // call itself is stubbed — not yet integrated." That stopped being true
  // once routes/verify.js's /epfo/confirm was wired to AuthBridge/TruthScreen's
  // real Employee PF Verification API — that path is real and live, called
  // from Orbit.jsx/Aura.jsx. This declared entry stays "unsupported" only
  // because EPFO verification doesn't go through THIS synchronous provider
  // framework (it's its own dedicated route, same reasoning as
  // employer_attestation below) — not because the underlying capability is fake.
  employer_epfo: "EPFO verification is real and live via AuthBridge (routes/verify.js's /epfo/search-company + /epfo/confirm) — just not invoked through this synchronous provider framework, same reasoning as employer_attestation.",
  university: "University/institution verification (degree confirmation) has no standard public API — requires per-institution partnership or DigiLocker's academic records API once that's integrated.",
  // Direct, generic "employer verification" with no specific mechanism is
  // still genuinely unsupported — but a real, specific mechanism now exists:
  // see the separately-registered "employer_attestation" provider (a former
  // employer confirms via emailed link) and "employer_epfo" above (EPFO
  // employer-name matching). This entry covers anything neither of those two
  // real paths can do.
  employer: "No generic employer-verification API exists — but two real, specific mechanisms now do: EPFO employer matching (see employer_epfo) and direct employer attestation via emailed confirmation link (see employer_attestation).",
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
