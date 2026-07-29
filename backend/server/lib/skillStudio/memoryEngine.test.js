import { test } from "node:test"
import assert from "node:assert/strict"
import { computeDecayedConfidence, halfLifeFromEase, bandFor } from "./memoryEngine.js"

test("halfLifeFromEase is monotonic increasing and bounded", () => {
  const low = halfLifeFromEase(1.3)
  const mid = halfLifeFromEase(2.5)
  const high = halfLifeFromEase(3.2)
  assert.ok(low < mid && mid < high, "half-life should increase with ease factor")
  assert.ok(low >= 3, "half-life never below the 3-day floor")
  assert.ok(high <= 45, "half-life never above the 45-day ceiling")
})

test("computeDecayedConfidence returns original confidence with no prior reinforcement", () => {
  const result = computeDecayedConfidence({ confidence: 0.8, lastReinforcedAt: null, easeFactor: 2.5 })
  assert.equal(result, 0.8)
})

test("computeDecayedConfidence decays over time and never goes negative", () => {
  const now = new Date("2026-08-01T00:00:00Z")
  const reinforcedRecently = computeDecayedConfidence(
    { confidence: 0.9, lastReinforcedAt: "2026-07-31T00:00:00Z", easeFactor: 2.5 }, now
  )
  const reinforcedLongAgo = computeDecayedConfidence(
    { confidence: 0.9, lastReinforcedAt: "2026-01-01T00:00:00Z", easeFactor: 2.5 }, now
  )
  assert.ok(reinforcedRecently > reinforcedLongAgo, "less time elapsed should mean less decay")
  assert.ok(reinforcedLongAgo >= 0, "decay never produces a negative confidence")
  assert.ok(reinforcedRecently <= 0.9, "decay never increases confidence")
})

test("computeDecayedConfidence: higher ease factor decays slower over the same interval", () => {
  const now = new Date("2026-08-15T00:00:00Z")
  const lastReinforcedAt = "2026-08-01T00:00:00Z"
  const lowEase = computeDecayedConfidence({ confidence: 0.9, lastReinforcedAt, easeFactor: 1.3 }, now)
  const highEase = computeDecayedConfidence({ confidence: 0.9, lastReinforcedAt, easeFactor: 3.2 }, now)
  assert.ok(highEase > lowEase, "a skill with more successful reviews (higher ease) should retain more confidence")
})

test("bandFor thresholds match spec bands (high >=0.75, medium >=0.45, else low)", () => {
  assert.equal(bandFor(0.9), "high")
  assert.equal(bandFor(0.75), "high")
  assert.equal(bandFor(0.5), "medium")
  assert.equal(bandFor(0.45), "medium")
  assert.equal(bandFor(0.2), "low")
  assert.equal(bandFor(0), "low")
})
