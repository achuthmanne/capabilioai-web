import { test } from "node:test"
import assert from "node:assert/strict"
import { computeEloDelta, FLAT_ELO_AWARD_BY_DIFFICULTY, PASSING_SCORE_THRESHOLD, START_ELO } from "./eloFormula.js"

test("a passing score awards the flat amount for its difficulty", () => {
  const { delta, newElo } = computeEloDelta({ currentElo: 456, difficulty: "Easy", score: 100 })
  assert.equal(delta, 5)
  assert.equal(newElo, 461)
})

test("Medium awards +10, Hard awards +15, Expert awards +20 on a pass", () => {
  assert.equal(computeEloDelta({ currentElo: 500, difficulty: "Medium", score: 90 }).delta, 10)
  assert.equal(computeEloDelta({ currentElo: 500, difficulty: "Hard", score: 90 }).delta, 15)
  assert.equal(computeEloDelta({ currentElo: 500, difficulty: "Expert", score: 90 }).delta, 20)
})

test("a score exactly at the passing threshold still awards the flat amount", () => {
  const { delta } = computeEloDelta({ currentElo: 500, difficulty: "Easy", score: PASSING_SCORE_THRESHOLD })
  assert.equal(delta, 5)
})

test("a failing score awards nothing — ELO does not move at all, no penalty", () => {
  const { delta, newElo } = computeEloDelta({ currentElo: 456, difficulty: "Hard", score: 40 })
  assert.equal(delta, 0)
  assert.equal(newElo, 456)
})

test("a score just below the passing threshold awards nothing", () => {
  const { delta } = computeEloDelta({ currentElo: 500, difficulty: "Easy", score: PASSING_SCORE_THRESHOLD - 1 })
  assert.equal(delta, 0)
})

test("the award is completely independent of the student's current rating — no expected-score comparison", () => {
  const low = computeEloDelta({ currentElo: 200, difficulty: "Medium", score: 100 })
  const high = computeEloDelta({ currentElo: 1900, difficulty: "Medium", score: 100 })
  assert.equal(low.delta, high.delta)
  assert.equal(low.delta, 10)
})

test("never drops rating below the floor of 100 (defensive only — delta is never negative)", () => {
  const { newElo } = computeEloDelta({ currentElo: 100, difficulty: "Easy", score: 0 })
  assert.equal(newElo, 100)
})

test("unknown difficulty falls back to Medium's flat award rather than throwing", () => {
  const { delta } = computeEloDelta({ currentElo: 500, difficulty: "Nonsense", score: 100 })
  assert.equal(delta, FLAT_ELO_AWARD_BY_DIFFICULTY.Medium)
})

test("throws on non-numeric currentElo or score — Reward Engine must never silently invent a rating", () => {
  assert.throws(() => computeEloDelta({ currentElo: null, difficulty: "Easy", score: 50 }))
  assert.throws(() => computeEloDelta({ currentElo: 800, difficulty: "Easy", score: null }))
})

test("FLAT_ELO_AWARD_BY_DIFFICULTY covers all four difficulty tiers as a clean +5 step", () => {
  assert.deepEqual(FLAT_ELO_AWARD_BY_DIFFICULTY, { Easy: 5, Medium: 10, Hard: 15, Expert: 20 })
})

test("START_ELO is only used as the very last resort seed (documented, not exercised by this pure formula)", () => {
  assert.equal(START_ELO, 800)
})
