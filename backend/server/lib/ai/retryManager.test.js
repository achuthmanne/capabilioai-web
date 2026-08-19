import { test } from "node:test"
import assert from "node:assert/strict"
import { executeWithRetry } from "./retryManager.js"

// 2026-08-19 (Phase 2.7 architecture refinement): executeWithRetry's
// return contract changed from a bare value to
// { result, retryCount, providerUsed, fallbackUsed } — Requirement 5
// needs a real retryCount, which didn't exist before. Zero business-code
// callers exist (confirmed via repo-wide grep), so this contract change
// is fully contained to this file + aiService.js.

test("executeWithRetry returns the primary attempt's result on first success — retryCount 0, no fallback", async () => {
  let calls = 0
  const outcome = await executeWithRetry(async () => { calls++; return { text: "ok", provider: "groq" } })
  assert.equal(outcome.result.text, "ok")
  assert.equal(outcome.retryCount, 0)
  assert.equal(outcome.providerUsed, "groq")
  assert.equal(outcome.fallbackUsed, false)
  assert.equal(calls, 1)
})

test("executeWithRetry retries a 429 (rate-limited) error and succeeds on the second attempt — retryCount reflects the extra attempt", async () => {
  let calls = 0
  const outcome = await executeWithRetry(async () => {
    calls++
    if (calls === 1) { const err = new Error("rate limited"); err.status = 429; throw err }
    return { text: "recovered", provider: "groq" }
  }, { maxRetries: 2 })
  assert.equal(outcome.result.text, "recovered")
  assert.equal(outcome.retryCount, 1, "one retry beyond the first attempt")
  assert.equal(outcome.fallbackUsed, false)
  assert.equal(calls, 2)
})

test("executeWithRetry does NOT retry a non-retryable error (e.g. a 400 validation error) — fails fast", async () => {
  let calls = 0
  await assert.rejects(
    () => executeWithRetry(async () => { calls++; const err = new Error("bad request"); err.status = 400; throw err }, { maxRetries: 3 }),
    /bad request/
  )
  assert.equal(calls, 1, "a non-retryable error must not consume any retry attempts")
})

test("executeWithRetry falls back to a secondary provider after the primary is exhausted — fallbackUsed true, providerUsed reflects the fallback — this is what replaced contentGenerator.js's manual gemini-then-groq try/catch (see contentGenerator.test.js)", async () => {
  const calls = []
  const outcome = await executeWithRetry(
    async (providerOverride) => {
      calls.push(providerOverride || "primary")
      if (!providerOverride) { const err = new Error("primary down"); err.status = 500; throw err }
      return { text: `served-by-${providerOverride}`, provider: providerOverride }
    },
    { maxRetries: 0, fallbackProvider: "groq" }
  )
  assert.equal(outcome.result.text, "served-by-groq")
  assert.equal(outcome.fallbackUsed, true)
  assert.equal(outcome.providerUsed, "groq")
  assert.deepEqual(calls, ["primary", "groq"])
})

test("executeWithRetry throws the last real error when both primary and fallback are exhausted", async () => {
  await assert.rejects(
    () => executeWithRetry(
      async (providerOverride) => { const err = new Error(providerOverride ? "fallback down too" : "primary down"); err.status = 500; throw err },
      { maxRetries: 0, fallbackProvider: "groq" }
    ),
    /fallback down too/
  )
})

test("executeWithRetry enforces its timeout — a call that never resolves is rejected, not hung forever", async () => {
  await assert.rejects(
    () => executeWithRetry(() => new Promise(() => {}), { timeoutMs: 50, maxRetries: 0 }),
    /timed out/
  )
})
