import { test } from "node:test"
import assert from "node:assert/strict"
import { isInstanceExpired } from "./expiry.js"

test("isInstanceExpired treats a missing instance as expired", () => {
  assert.equal(isInstanceExpired(null), true)
})

test("isInstanceExpired uses expires_at when present", () => {
  const now = new Date("2026-07-17T12:00:00Z")
  assert.equal(isInstanceExpired({ expires_at: "2026-07-17T11:59:00Z" }, now), true)
  assert.equal(isInstanceExpired({ expires_at: "2026-07-17T12:01:00Z" }, now), false)
})

test("isInstanceExpired falls back to submission_rules.timeLimitSecs + started_at when expires_at is absent", () => {
  const now = new Date("2026-07-17T12:00:00Z")
  const startedAt = "2026-07-17T11:00:00Z" // 1 hour ago
  assert.equal(isInstanceExpired({ started_at: startedAt, submission_rules: { timeLimitSecs: 1800 } }, now), true) // 30 min limit, already over
  assert.equal(isInstanceExpired({ started_at: startedAt, submission_rules: { timeLimitSecs: 7200 } }, now), false) // 2 hr limit, still within
})

test("isInstanceExpired never expires an untimed instance", () => {
  const now = new Date("2026-07-17T12:00:00Z")
  assert.equal(isInstanceExpired({ started_at: "2020-01-01T00:00:00Z", submission_rules: {} }, now), false)
})
