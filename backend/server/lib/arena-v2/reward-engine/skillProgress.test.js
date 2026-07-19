import { test } from "node:test"
import assert from "node:assert/strict"
import { computeMasteryState, nextSkillProgress } from "./skillProgress.js"

test("computeMasteryState thresholds", () => {
  assert.equal(computeMasteryState({ bestScore: 90, attemptsCount: 1 }), "mastered")
  assert.equal(computeMasteryState({ bestScore: 70, attemptsCount: 1 }), "proficient")
  assert.equal(computeMasteryState({ bestScore: 30, attemptsCount: 2 }), "weak")
  assert.equal(computeMasteryState({ bestScore: 30, attemptsCount: 1 }), "attempted") // not enough attempts yet to call it "weak"
  assert.equal(computeMasteryState({ bestScore: 50, attemptsCount: 1 }), "attempted")
})

test("nextSkillProgress starts a fresh row correctly when there's no current progress", () => {
  const result = nextSkillProgress({ current: null, finalScore: 50 })
  assert.equal(result.attempts_count, 1)
  assert.equal(result.best_score, 50)
  assert.equal(result.mastery_state, "attempted")
})

test("a strong first attempt can immediately register as proficient/mastered — mastery_state is score-derived, not attempt-count-gated upward", () => {
  const result = nextSkillProgress({ current: null, finalScore: 80 })
  assert.equal(result.mastery_state, "proficient")
})

test("nextSkillProgress is monotonic — best_score never decreases even after a worse attempt", () => {
  const afterGood = nextSkillProgress({ current: null, finalScore: 90 })
  const afterBad = nextSkillProgress({ current: afterGood, finalScore: 20 })
  assert.equal(afterBad.best_score, 90)
  assert.equal(afterBad.mastery_state, "mastered") // a single later weak attempt never undoes mastery
  assert.equal(afterBad.attempts_count, 2)
})

test("nextSkillProgress increments attempts_count across repeated calls", () => {
  let progress = null
  for (let i = 0; i < 3; i++) progress = nextSkillProgress({ current: progress, finalScore: 50 })
  assert.equal(progress.attempts_count, 3)
})

test("throws on a non-numeric finalScore", () => {
  assert.throws(() => nextSkillProgress({ current: null, finalScore: null }))
})
