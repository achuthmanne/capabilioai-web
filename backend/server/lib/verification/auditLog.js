/**
 * verification/auditLog.js — Trust & Verification Center, Phase 1
 * ---------------------------------------------------------------------------
 * Hash-chained, append-only audit log — each entry's hash covers the
 * previous entry's hash plus this entry's own payload, so any retroactive
 * edit, deletion, or reordering breaks the chain and is detectable. This is
 * the practical substitute for blockchain anchoring the user chose: same
 * tamper-evidence property, no wallet, no gas, no new chain dependency.
 *
 * NEVER pass raw document bytes or extracted personal text into `details` —
 * only provider-reported summary fields (match/confidence/reason). The
 * `documentHash` field stores the sha256 of the uploaded file's bytes,
 * proving *a specific file* was involved without storing the file itself
 * here (it should already live wherever the app stores uploads today).
 */
import crypto from "crypto"
import { supabaseAdmin } from "../supabase.js"

const TABLE = "verification_audit_log"

/** Deterministic JSON stringify (sorted keys) so hashes are reproducible. */
function canonicalStringify(obj) {
  const sortedKeys = Object.keys(obj).sort()
  const sorted = {}
  for (const k of sortedKeys) sorted[k] = obj[k]
  return JSON.stringify(sorted)
}

export function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

/**
 * @param {{userId, proofObjectId?, documentHash?, providerId, capabilityUsed, result, confidence?, details?}} entry
 * @returns {Promise<object>} the inserted row
 */
export async function appendEntry(entry) {
  const { data: last, error: lastErr } = await supabaseAdmin
    .from(TABLE)
    .select("entry_hash")
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (lastErr) throw lastErr
  const prevHash = last?.entry_hash || null

  const payload = {
    user_id: entry.userId,
    proof_object_id: entry.proofObjectId || null,
    document_hash: entry.documentHash || null,
    provider_id: entry.providerId,
    capability_used: entry.capabilityUsed,
    result: entry.result,
    confidence: entry.confidence ?? null,
    details: entry.details || {},
  }
  const entryHash = sha256Hex((prevHash || "") + canonicalStringify(payload))

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert({ ...payload, prev_hash: prevHash, entry_hash: entryHash })
    .select().single()
  if (error) throw error
  return data
}

export async function getAuditLog(userId) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("seq", { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * Walks the ENTIRE chain (not just one user's rows — the chain is global)
 * and recomputes every entry_hash from its stored payload + the previous
 * row's stored entry_hash, confirming each one matches. Returns the first
 * broken link, if any — this is the actual tamper-detection mechanism the
 * whole design exists for, and is cheap enough to run on demand rather
 * than needing a scheduled job.
 */
export async function verifyChainIntegrity() {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .order("seq", { ascending: true })
  if (error) throw error

  let expectedPrevHash = null
  for (const row of data || []) {
    if (row.prev_hash !== expectedPrevHash) {
      return { intact: false, brokenAtSeq: row.seq, reason: "prev_hash does not match the preceding row's entry_hash" }
    }
    const payload = {
      user_id: row.user_id, proof_object_id: row.proof_object_id, document_hash: row.document_hash,
      provider_id: row.provider_id, capability_used: row.capability_used, result: row.result,
      confidence: row.confidence, details: row.details,
    }
    const recomputed = sha256Hex((row.prev_hash || "") + canonicalStringify(payload))
    if (recomputed !== row.entry_hash) {
      return { intact: false, brokenAtSeq: row.seq, reason: "entry_hash does not match its own recomputed payload — row was altered after insert" }
    }
    expectedPrevHash = row.entry_hash
  }
  return { intact: true, rowsChecked: data?.length || 0 }
}
