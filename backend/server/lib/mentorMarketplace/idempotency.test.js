import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { hashRequestBody, checkIdempotencyKey, recordIdempotentResponse } from './idempotency.js'

// Minimal fake Supabase-like query builder backed by an in-memory array,
// enough to exercise the exact .from().select().eq().eq().eq().maybeSingle()
// and .from().upsert() chains idempotency.js calls.
function makeFakeDb(rows = []) {
  const table = rows
  return {
    from(name) {
      assert.equal(name, 'mentor_idempotency_keys')
      const filters = {}
      const api = {
        select() { return api },
        eq(col, val) { filters[col] = val; return api },
        async maybeSingle() {
          const match = table.find(r => Object.entries(filters).every(([k, v]) => r[k] === v))
          return { data: match || null, error: null }
        },
        async upsert(row) {
          const idx = table.findIndex(r =>
            r.idempotency_key === row.idempotency_key && r.endpoint === row.endpoint && r.user_id === row.user_id
          )
          if (idx >= 0) table[idx] = { ...table[idx], ...row }
          else table.push({ ...row })
          return { data: row, error: null }
        },
      }
      return api
    },
  }
}

describe('hashRequestBody', () => {
  test('same body (different key order) hashes identically', () => {
    const h1 = hashRequestBody({ a: 1, b: 2 })
    const h2 = hashRequestBody({ b: 2, a: 1 })
    assert.equal(h1, h2)
  })
  test('different bodies hash differently', () => {
    assert.notEqual(hashRequestBody({ a: 1 }), hashRequestBody({ a: 2 }))
  })
})

describe('checkIdempotencyKey', () => {
  test('missing key flagged, caller must require it', async () => {
    const db = makeFakeDb()
    const result = await checkIdempotencyKey(db, { idempotencyKey: undefined, userId: 'u1', endpoint: '/x', requestBody: {} })
    assert.equal(result.replay, false)
    assert.equal(result.missingKey, true)
  })

  test('first call for a fresh key: no replay, proceed', async () => {
    const db = makeFakeDb()
    const result = await checkIdempotencyKey(db, { idempotencyKey: 'k1', userId: 'u1', endpoint: '/book', requestBody: { slot: 's1' } })
    assert.equal(result.replay, false)
    assert.ok(result.requestHash)
  })

  test('valid retry (same key+user+endpoint+body) returns stored response', async () => {
    const db = makeFakeDb()
    const body = { slot: 's1' }
    const hash = hashRequestBody(body)
    await recordIdempotentResponse(db, { idempotencyKey: 'k1', userId: 'u1', endpoint: '/book', requestHash: hash, status: 201, payload: { bookingId: 'b1' } })
    const result = await checkIdempotencyKey(db, { idempotencyKey: 'k1', userId: 'u1', endpoint: '/book', requestBody: body })
    assert.equal(result.replay, true)
    assert.equal(result.status, 201)
    assert.deepEqual(result.payload, { bookingId: 'b1' })
  })

  test('same key reused with a DIFFERENT body is a conflict, not silently processed', async () => {
    const db = makeFakeDb()
    const bodyA = { slot: 's1' }
    const hashA = hashRequestBody(bodyA)
    await recordIdempotentResponse(db, { idempotencyKey: 'k1', userId: 'u1', endpoint: '/book', requestHash: hashA, status: 201, payload: { bookingId: 'b1' } })
    const result = await checkIdempotencyKey(db, { idempotencyKey: 'k1', userId: 'u1', endpoint: '/book', requestBody: { slot: 's2' } })
    assert.equal(result.replay, false)
    assert.equal(result.conflict, true)
  })

  test('same key reused by a DIFFERENT user is treated as a distinct row (scoped by user_id), not a collision', async () => {
    const db = makeFakeDb()
    const body = { slot: 's1' }
    const hash = hashRequestBody(body)
    await recordIdempotentResponse(db, { idempotencyKey: 'k1', userId: 'u1', endpoint: '/book', requestHash: hash, status: 201, payload: { bookingId: 'b1' } })
    const result = await checkIdempotencyKey(db, { idempotencyKey: 'k1', userId: 'u2', endpoint: '/book', requestBody: body })
    assert.equal(result.replay, false)
    assert.equal(result.conflict, undefined)
  })

  test('expired key is not replayed — caller proceeds as if fresh', async () => {
    const db = makeFakeDb()
    const body = { slot: 's1' }
    const hash = hashRequestBody(body)
    await recordIdempotentResponse(db, { idempotencyKey: 'k1', userId: 'u1', endpoint: '/book', requestHash: hash, status: 201, payload: { bookingId: 'b1' }, ttlHours: -1 })
    const result = await checkIdempotencyKey(db, { idempotencyKey: 'k1', userId: 'u1', endpoint: '/book', requestBody: body })
    assert.equal(result.replay, false)
    assert.ok(result.expiredRow)
  })
})
