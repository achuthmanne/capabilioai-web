import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { hashRequestBody, checkIdempotencyKey, recordIdempotentResponse } from './idempotency.js'

describe('hashRequestBody (re-exported from mentorMarketplace/idempotency.js)', () => {
  test('same body (different key order) hashes identically', () => {
    assert.equal(hashRequestBody({ a: 1, b: 2 }), hashRequestBody({ b: 2, a: 1 }))
  })
})

describe('checkIdempotencyKey / recordIdempotentResponse (in-memory, company module)', () => {
  test('missing key flagged, caller must require it', () => {
    const result = checkIdempotencyKey({ idempotencyKey: undefined, userId: 'u1', endpoint: '/x', requestBody: {} })
    assert.equal(result.replay, false)
    assert.equal(result.missingKey, true)
  })

  test('first call for a fresh key: no replay, proceed', () => {
    const result = checkIdempotencyKey({ idempotencyKey: 'k1', userId: 'u1', endpoint: '/pro/v1/company/me/link', requestBody: { company_id: 'c1' } })
    assert.equal(result.replay, false)
    assert.ok(result.requestHash)
  })

  test('replay: same key + same body returns the recorded response, does not re-run', () => {
    const idempotencyKey = 'k2'
    const userId = 'u2'
    const endpoint = '/pro/v1/company/me/link'
    const requestBody = { company_id: 'c2' }

    const first = checkIdempotencyKey({ idempotencyKey, userId, endpoint, requestBody })
    assert.equal(first.replay, false)
    recordIdempotentResponse({ idempotencyKey, userId, endpoint, requestHash: first.requestHash, status: 200, payload: { success: true, company_id: 'c2' } })

    const second = checkIdempotencyKey({ idempotencyKey, userId, endpoint, requestBody })
    assert.equal(second.replay, true)
    assert.equal(second.status, 200)
    assert.deepEqual(second.payload, { success: true, company_id: 'c2' })
  })

  test('conflict: same key, different body -> conflict flagged, no replay', () => {
    const idempotencyKey = 'k3'
    const userId = 'u3'
    const endpoint = '/pro/v1/company/me/link'

    const first = checkIdempotencyKey({ idempotencyKey, userId, endpoint, requestBody: { company_id: 'c3' } })
    recordIdempotentResponse({ idempotencyKey, userId, endpoint, requestHash: first.requestHash, status: 200, payload: { success: true } })

    const second = checkIdempotencyKey({ idempotencyKey, userId, endpoint, requestBody: { company_id: 'DIFFERENT' } })
    assert.equal(second.replay, false)
    assert.equal(second.conflict, true)
  })

  test('scoping: same key but different userId or endpoint does not collide', () => {
    const requestBody = { company_id: 'c4' }
    const first = checkIdempotencyKey({ idempotencyKey: 'shared-key', userId: 'u4a', endpoint: '/pro/v1/company/me/link', requestBody })
    recordIdempotentResponse({ idempotencyKey: 'shared-key', userId: 'u4a', endpoint: '/pro/v1/company/me/link', requestHash: first.requestHash, status: 200, payload: { success: true, who: 'u4a' } })

    const otherUser = checkIdempotencyKey({ idempotencyKey: 'shared-key', userId: 'u4b', endpoint: '/pro/v1/company/me/link', requestBody })
    assert.equal(otherUser.replay, false, 'different user, same key, should not replay the other user\'s cached response')

    const otherEndpoint = checkIdempotencyKey({ idempotencyKey: 'shared-key', userId: 'u4a', endpoint: '/pro/v1/company/other', requestBody })
    assert.equal(otherEndpoint.replay, false, 'different endpoint, same key, should not replay')
  })
})
