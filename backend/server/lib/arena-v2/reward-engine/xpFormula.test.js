import { test } from "node:test"
import assert from "node:assert/strict"
import { computeXpGained, XP_BASE_BY_DIFFICULTY } from "./xpFormula.js"

test("a perfect score awards the full base XP for the difficulty", () => {
  assert.equal(computeXpGained({ difficulty: "Easy", finalScore: 100 }), XP_BASE_BY_DIFFICULTY.Easy)
  assert.equal(computeXpGained({ difficulty: "Expert", finalScore: 100 }), XP_BASE_BY_DIFFICULTY.Expert)
})

test("a zero score awards zero XP", () => {
  assert.equal(computeXpGained({ difficulty: "Medium", finalScore: 0 }), 0)
})

test("partial credit scales XP proportionally", () => {
  assert.equal(computeXpGained({ difficulty: "Hard", finalScore: 50 }), Math.round(XP_BASE_BY_DIFFICULTY.Hard * 0.5))
})

test("unknown difficulty falls back to Medium's base rather than throwing", () => {
  assert.equal(computeXpGained({ difficulty: "Nonsense", finalScore: 100 }), XP_BASE_BY_DIFFICULTY.Medium)
})

test("clamps out-of-range scores rather than awarding negative or excess XP", () => {
  assert.equal(computeXpGained({ difficulty: "Easy", finalScore: -20 }), 0)
  assert.equal(computeXpGained({ difficulty: "Easy", finalScore: 500 }), XP_BASE_BY_DIFFICULTY.Easy)
})

test("throws on a non-numeric finalScore", () => {
  assert.throws(() => computeXpGained({ difficulty: "Easy", finalScore: null }))
})
