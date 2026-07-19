import { test } from "node:test"
import assert from "node:assert/strict"
import { computeFinalScore, computeTimingModifier, ZERO_EFFORT_SCORE_CAP } from "./scoring.js"

test("validator score alone passes through unchanged (today's only real scoring path)", () => {
  assert.equal(computeFinalScore({ validatorScore: 87 }), 87)
})

test("blends in a rubric score when present", () => {
  assert.equal(computeFinalScore({ validatorScore: 80, rubricScore: 60 }), 70)
})

test("blends in a capped AI supplement when weight > 0", () => {
  const score = computeFinalScore({ validatorScore: 80, aiReviewScore: 100, aiReviewWeight: 0.2 })
  assert.equal(score, 80 * 0.8 + 100 * 0.2)
})

test("isZeroEffort caps the final score at ZERO_EFFORT_SCORE_CAP regardless of underlying score", () => {
  assert.equal(computeFinalScore({ validatorScore: 100, isZeroEffort: true }), ZERO_EFFORT_SCORE_CAP)
  assert.equal(computeFinalScore({ validatorScore: 10, isZeroEffort: true }), 10) // already below cap
})

test("clamps to [0, 100] even with an extreme timing modifier", () => {
  assert.equal(computeFinalScore({ validatorScore: 95, timingModifier: 50 }), 100)
  assert.equal(computeFinalScore({ validatorScore: 5, timingModifier: -50 }), 0)
})

test("throws on a non-numeric validatorScore — Assessment must always have a real validator result", () => {
  assert.throws(() => computeFinalScore({ validatorScore: null }))
  assert.throws(() => computeFinalScore({}))
})

test("computeTimingModifier is a placeholder returning 0 (flagged in future-improvements, not silently omitted)", () => {
  assert.equal(computeTimingModifier(), 0)
})
