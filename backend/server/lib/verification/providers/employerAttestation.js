/**
 * verification/providers/employerAttestation.js — Trust & Verification
 * Center, Phase 1 extension.
 * ---------------------------------------------------------------------------
 * A real, independent second verification path for claimed employment,
 * alongside EPFO/AuthBridge (routes/verify.js's /epfo/confirm): a former
 * employer confirms or declines a specific claimed role+dates via a
 * one-time emailed link, no Capabilio account required on their end.
 *
 * This does NOT fit the pipeline's synchronous verify({file, claim}) shape
 * — a real attestation takes days (waiting on a human at another company to
 * click a link), not a single request/response. Registered here anyway
 * (capability='supported', not 'unsupported') because it IS a real,
 * implemented capability — /api/verification/providers should say so —
 * but verify() itself throws with clear guidance to the dedicated
 * async endpoints (routes/employerAttestation.js) rather than pretending a
 * synchronous call can do what only a multi-day human workflow can. Those
 * dedicated endpoints write the actual outcome into the same hash-chained
 * verification_audit_log via lib/verification/auditLog.js directly.
 */
export async function verify() {
  throw new Error(
    "Provider \"employer_attestation\" cannot be invoked via the synchronous /api/verification/verify endpoint — " +
    "it requires a multi-day human confirmation flow. Use POST /api/pro/attestation/request instead."
  )
}

export default {
  id: "employer_attestation",
  name: "Employer Attestation",
  capability: "supported",
  note: "Real: a former employer confirms/declines a claimed role via a one-time emailed link (routes/employerAttestation.js). Not invoked through this synchronous pipeline — see verify() for why.",
  verify,
}
