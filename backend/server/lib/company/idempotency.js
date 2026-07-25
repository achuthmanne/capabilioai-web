/**
 * idempotency.js — Company Module (Career OS Workstream 5, scoped pass).
 *
 * Only one mutation in company.js needs an Idempotency-Key: POST
 * /api/pro/v1/company/me/link. Unlike mentor marketplace's booking/payment
 * flow (which creates NEW rows — a naive retry would double-book or
 * double-charge), the link mutation is a pure UPDATE of
 * profiles.company_id / company_link_state to a specific value: replaying
 * it with the same body converges to the exact same row state every time,
 * no duplicate side effects are possible at the database level.
 *
 * Given that, and given the DB migration for this workstream deliberately
 * scoped to exactly one new table (company_memberships — see
 * career_os_ws5_company_module_migration.sql), this reuses
 * mentor marketplace's pure `hashRequestBody` helper (no reason to
 * duplicate that logic) but skips standing up a second persisted
 * `*_idempotency_keys` table for a mutation that doesn't need one for
 * correctness. This in-memory, per-process, best-effort cache exists only
 * to make an exact key+body replay within its TTL return the identical
 * response instead of re-running the (harmless but wasteful) update —
 * NOT a correctness guarantee. If a future company.js mutation is added
 * that DOES create new rows with a duplicate-side-effect risk (e.g. an
 * employer-verification request queue), reach for the persisted
 * mentorMarketplace/idempotency.js pattern instead of extending this file.
 */
import { hashRequestBody } from "../mentorMarketplace/idempotency.js"

export { hashRequestBody }

const TTL_MS = 5 * 60 * 1000 // 5 minutes — long enough to catch client retry storms, short enough not to leak memory
const store = new Map() // key: `${userId}:${endpoint}:${idempotencyKey}` -> { requestHash, status, payload, expiresAt }

function sweepExpired() {
  const now = Date.now()
  for (const [k, v] of store) {
    if (v.expiresAt <= now) store.delete(k)
  }
}

/**
 * @returns {{ replay:true, status:number, payload:any } | { replay:false, conflict?:true, requestHash:string }}
 */
export function checkIdempotencyKey({ idempotencyKey, userId, endpoint, requestBody }) {
  if (!idempotencyKey) return { replay: false, missingKey: true, requestHash: hashRequestBody(requestBody) }
  sweepExpired()

  const requestHash = hashRequestBody(requestBody)
  const cacheKey = `${userId}:${endpoint}:${idempotencyKey}`
  const existing = store.get(cacheKey)

  if (!existing) return { replay: false, requestHash }
  if (existing.requestHash !== requestHash) return { replay: false, conflict: true, requestHash }
  return { replay: true, status: existing.status, payload: existing.payload }
}

export function recordIdempotentResponse({ idempotencyKey, userId, endpoint, requestHash, status, payload }) {
  if (!idempotencyKey) return
  const cacheKey = `${userId}:${endpoint}:${idempotencyKey}`
  store.set(cacheKey, { requestHash, status, payload, expiresAt: Date.now() + TTL_MS })
}
