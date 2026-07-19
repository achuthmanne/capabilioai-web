import { test } from "node:test"
import assert from "node:assert/strict"
import { createValidatorResult, isValidatorResult, InvalidValidatorResultError } from "./validatorResult.js"

test("constructs a well-formed result with defaults for optional fields", () => {
  const r = createValidatorResult({ passed: true, score: 100 })
  assert.deepEqual(r, { passed: true, score: 100, evidence: [], timing: {}, diagnostics: [], metadata: {} })
})

test("preserves all provided fields", () => {
  const r = createValidatorResult({
    passed: false, score: 40,
    evidence: [{ metric: "x", expected: 1, actual: 2, passed: false }],
    timing: { durationMs: 12 },
    diagnostics: ["something went wrong"],
    metadata: { validatorType: "ground_truth_compare" },
  })
  assert.equal(r.evidence.length, 1)
  assert.equal(r.timing.durationMs, 12)
  assert.deepEqual(r.diagnostics, ["something went wrong"])
  assert.equal(r.metadata.validatorType, "ground_truth_compare")
})

test("rejects a non-boolean passed", () => {
  assert.throws(() => createValidatorResult({ passed: "yes", score: 100 }), InvalidValidatorResultError)
})

test("rejects a score outside 0-100", () => {
  assert.throws(() => createValidatorResult({ passed: true, score: 150 }), InvalidValidatorResultError)
  assert.throws(() => createValidatorResult({ passed: true, score: -1 }), InvalidValidatorResultError)
})

test("rejects non-array evidence/diagnostics and non-object timing/metadata", () => {
  assert.throws(() => createValidatorResult({ passed: true, score: 1, evidence: "nope" }))
  assert.throws(() => createValidatorResult({ passed: true, score: 1, diagnostics: "nope" }))
  assert.throws(() => createValidatorResult({ passed: true, score: 1, timing: "nope" }))
  assert.throws(() => createValidatorResult({ passed: true, score: 1, metadata: "nope" }))
})

test("isValidatorResult is a non-throwing predicate for the same rules", () => {
  assert.equal(isValidatorResult({ passed: true, score: 100 }), true)
  assert.equal(isValidatorResult({ passed: "nope", score: 100 }), false)
  assert.equal(isValidatorResult(null), false)
})
