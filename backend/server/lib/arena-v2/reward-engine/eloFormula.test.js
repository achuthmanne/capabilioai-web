import { test } from "node:test"
import assert from "node:assert/strict"
import { computeEloDelta, CHALLENGE_ELO_BY_DIFFICULTY, START_ELO } from "./eloFormula.js"

test("a perfect score against an evenly-matched difficulty gains a positive delta", () => {
  const { delta, newElo } = computeEloDelta({ currentElo: START_ELO, difficulty: "Easy", score: 100 })
  assert.ok(delta > 0)
  assert.equal(newElo, START_ELO + delta)
})

test("a zero score against an evenly-matched difficulty loses rating", () => {
  const { delta } = computeEloDelta({ currentElo: START_ELO, difficulty: "Easy", score: 0 })
  assert.ok(delta < 0)
})

test("a passing score (>=70) never nets a token +0/+1 against a much harder challenge", () => {
  const { delta } = computeEloDelta({ currentElo: 800, difficulty: "Expert", score: 75 })
  assert.ok(delta >= 3)
})

test("floors the maximum negative delta at -30", () => {
  // A strongly favored player (expected score ~0.85 against Easy) who
  // completely whiffs (score 0) with a mid-tier K-factor (36) would
  // otherwise swing past -30 — confirms the floor actually clips it.
  const { delta } = computeEloDelta({ currentElo: 1099, difficulty: "Easy", score: 0 })
  assert.equal(delta, -30)
})

test("never drops rating below the floor of 100", () => {
  const { newElo } = computeEloDelta({ currentElo: 110, difficulty: "Expert", score: 0 })
  assert.ok(newElo >= 100)
})

test("higher-rated players use a smaller K-factor (smaller swings)", () => {
  const low = computeEloDelta({ currentElo: 700, difficulty: "Medium", score: 100 })
  const high = computeEloDelta({ currentElo: 1500, difficulty: "Medium", score: 100 })
  assert.ok(low.delta >= high.delta)
})

test("unknown difficulty falls back to Medium's challenge rating rather than throwing", () => {
  assert.doesNotThrow(() => computeEloDelta({ currentElo: 800, difficulty: "Nonsense", score: 50 }))
})

test("throws on non-numeric currentElo or score — Reward Engine must never silently invent a rating", () => {
  assert.throws(() => computeEloDelta({ currentElo: null, difficulty: "Easy", score: 50 }))
  assert.throws(() => computeEloDelta({ currentElo: 800, difficulty: "Easy", score: null }))
})

test("CHALLENGE_ELO_BY_DIFFICULTY covers all four difficulty tiers", () => {
  assert.deepEqual(Object.keys(CHALLENGE_ELO_BY_DIFFICULTY).sort(), ["Easy", "Expert", "Hard", "Medium"].sort())
})
