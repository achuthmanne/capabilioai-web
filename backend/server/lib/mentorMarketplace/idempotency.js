/**
 * idempotency.js — Career OS Workstream 4.
 *
 * Every POST booking/payment mutation endpoint under /api/pro/v1/mentor
 * requires an `Idempotency-Key` header. This module hashes the request body,
 * persists (or looks up) the outcome in `mentor_idempotency_keys`, and tells
 * the caller whether to execute the mutation or replay a stored response.
 *
 * Persisted (not in-memory) per the mandatory design requirement — safe
 * across process restarts / multi-worker clustering (server.js runs one
 * Express process per core when ENABLE_CLUSTER=true).
 */
import crypto from 'crypto'

export function hashRequestBody(body) {
  const normalized = JSON.stringify(body ?? {}, Object.keys(body ?? {}).sort())
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

/**
 * Checks an idempotency key before a mutation runs.
 *
 * @param {object} db - supabaseAdmin-like client (must expose .from())
 * @param {object} params - { idempotencyKey, userId, endpoint, requestBody }
 * @returns {Promise<{ replay: true, status:number, payload:any } | { replay: false, conflict?: true }>}
 *   - replay:true  => caller must return the stored response verbatim, do not re-run the mutation
 *   - replay:false, conflict:true => same key reused with a different body/endpoint/user -> caller must 409
 *   - replay:false (no conflict) => caller should proceed with the mutation, then call recordIdempotentResponse()
 */
export async function checkIdempotencyKey(db, { idempotencyKey, userId, endpoint, requestBody }) {
  if (!idempotencyKey) {
    return { replay: false, missingKey: true }
  }
  const requestHash = hashRequestBody(requestBody)

  const { data: existing, error } = await db
    .from('mentor_idempotency_keys')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .maybeSingle()

  if (error) throw error

  if (!existing) {
    return { replay: false, requestHash }
  }

  if (new Date(existing.expires_at) < new Date()) {
    // Expired — treat as if it never existed; caller may proceed and this
    // row will be overwritten by a fresh insert (see recordIdempotentResponse).
    return { replay: false, requestHash, expiredRow: existing }
  }

  if (existing.request_hash !== requestHash) {
    // Same key, different body/endpoint/user combination => hard conflict.
    return { replay: false, conflict: true }
  }

  return { replay: true, status: existing.response_status, payload: existing.response_payload }
}

/**
 * Persists the response for a freshly-executed mutation so a retry with the
 * same key replays this exact response instead of re-running the mutation.
 */
export async function recordIdempotentResponse(db, { idempotencyKey, userId, endpoint, requestHash, status, payload, ttlHours = 24 }) {
  if (!idempotencyKey) return
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString()
  const { error } = await db
    .from('mentor_idempotency_keys')
    .upsert(
      {
        idempotency_key: idempotencyKey,
        user_id: userId,
        endpoint,
        request_hash: requestHash,
        response_status: status,
        response_payload: payload,
        expires_at: expiresAt,
      },
      { onConflict: 'idempotency_key,endpoint,user_id' }
    )
  if (error) throw error
}
