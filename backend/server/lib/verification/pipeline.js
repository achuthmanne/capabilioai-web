/**
 * verification/pipeline.js — Trust & Verification Center, Phase 1
 * ---------------------------------------------------------------------------
 * The orchestrator: dispatch to a provider, hash-chain the result into the
 * audit log, and — on a real "verified" result — promote the linked Proof
 * Object's trust_level automatically. This is the "verification results
 * must update the portfolio and evidence engine automatically" requirement:
 * proof_objects IS the evidence engine (per the Phase 1A unification), so
 * updating trust_level here is the whole mechanism — there's no second
 * "portfolio" table to separately notify.
 *
 * Deliberately thin: extraction/matching logic lives in each provider, not
 * here. This function's only job is sequencing + the audit trail, so a new
 * provider never has to duplicate hash-chaining or trust_level-update code.
 */
import { getProvider } from "./providers/registry.js"
import * as auditLog from "./auditLog.js"
import * as proofRepo from "../arena-v2/proofObjects/repository.js"

export class VerificationPipelineError extends Error {
  constructor(message, code) { super(message); this.code = code }
}

/**
 * @param {{userId:string, proofObjectId?:string, providerId:string, file?:{buffer:Buffer,mimetype:string}, claim?:object}} input
 * @returns {Promise<{status:string, confidence:number, details:object, auditEntry:object}>}
 */
export async function runVerification({ userId, proofObjectId, providerId, file, claim }) {
  if (!userId) throw new VerificationPipelineError("userId is required", "MISSING_USER")

  const provider = getProvider(providerId)
  if (!provider) throw new VerificationPipelineError(`Unknown provider "${providerId}"`, "UNKNOWN_PROVIDER")
  if (provider.capability === "unsupported") {
    // Fails fast here rather than relying on the provider's own throwing
    // stub — makes "this provider can't verify anything yet" a clean 4xx
    // at the API boundary instead of a caught 500.
    throw new VerificationPipelineError(
      `Provider "${providerId}" is declared but not yet implemented (capability=unsupported).${provider.note ? " " + provider.note : ""}`,
      "PROVIDER_UNSUPPORTED"
    )
  }

  const documentHash = file?.buffer ? auditLog.sha256Hex(file.buffer) : null

  let result
  try {
    result = await provider.verify({ file, claim })
  } catch (e) {
    result = { status: "error", confidence: 0, details: { reason: e.message } }
  }

  const auditEntry = await auditLog.appendEntry({
    userId,
    proofObjectId: proofObjectId || null,
    documentHash,
    providerId,
    capabilityUsed: provider.capability,
    result: result.status,
    confidence: result.confidence ?? null,
    details: result.details || {},
  })

  if (result.status === "verified" && proofObjectId) {
    try {
      await proofRepo.updateTrustLevel(proofObjectId, "verified")
    } catch (e) {
      // Non-fatal — the audit entry (source of truth for what actually
      // happened) is already written; a failed trust_level write here is a
      // display-layer inconsistency to fix on retry, not a lost verification.
      console.error("[verification/pipeline] Failed to update proof_object trust_level (non-fatal):", e.message)
    }
  }

  return { ...result, auditEntry }
}
