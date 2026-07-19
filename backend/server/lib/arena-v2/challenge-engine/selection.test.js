import { test } from "node:test"
import assert from "node:assert/strict"
import { pickNextSkill, defaultDifficultyForMastery, pickDifficulty, pickTemplate, pickScenario } from "./selection.js"

// ── pickNextSkill ─────────────────────────────────────────────────────────────

test("pickNextSkill prefers a weak skill over anything else", () => {
  const skill = pickNextSkill(["SQL", "Excel", "Power BI"], [
    { skill: "SQL", mastery_state: "mastered" },
    { skill: "Excel", mastery_state: "weak" },
  ])
  assert.equal(skill, "Excel")
})

test("pickNextSkill falls back to unattempted when nothing is weak", () => {
  const skill = pickNextSkill(["SQL", "Excel"], [{ skill: "SQL", mastery_state: "proficient" }])
  assert.equal(skill, "Excel")
})

test("pickNextSkill round-robins by oldest last_attempted_at when everything's been tried", () => {
  const skill = pickNextSkill(["SQL", "Excel"], [
    { skill: "SQL", mastery_state: "proficient", last_attempted_at: "2026-07-01T00:00:00Z" },
    { skill: "Excel", mastery_state: "proficient", last_attempted_at: "2026-06-01T00:00:00Z" },
  ])
  assert.equal(skill, "Excel")
})

test("pickNextSkill throws on an empty candidate list", () => {
  assert.throws(() => pickNextSkill([], []))
})

// ── difficulty ────────────────────────────────────────────────────────────────

test("defaultDifficultyForMastery maps every state to a sensible tier", () => {
  assert.equal(defaultDifficultyForMastery("unattempted"), "Easy")
  assert.equal(defaultDifficultyForMastery("attempted"), "Medium")
  assert.equal(defaultDifficultyForMastery("weak"), "Easy")
  assert.equal(defaultDifficultyForMastery("proficient"), "Hard")
  assert.equal(defaultDifficultyForMastery("mastered"), "Expert")
})

test("pickDifficulty honors an explicit request when the tier is declared", () => {
  const d = pickDifficulty({ masteryState: "unattempted", declaredTiers: ["Easy", "Medium", "Hard"], requested: "Hard" })
  assert.equal(d, "Hard")
})

test("pickDifficulty falls back to the easiest declared tier if the requested one isn't supported", () => {
  const d = pickDifficulty({ masteryState: "mastered", declaredTiers: ["Easy", "Medium"], requested: "Expert" })
  assert.equal(d, "Easy")
})

test("pickDifficulty uses the mastery default when nothing is requested", () => {
  const d = pickDifficulty({ masteryState: "proficient", declaredTiers: ["Easy", "Medium", "Hard", "Expert"], requested: null })
  assert.equal(d, "Hard")
})

test("pickDifficulty throws if the template version declares zero tiers", () => {
  assert.throws(() => pickDifficulty({ masteryState: "weak", declaredTiers: [], requested: null }))
})

// ── template anti-repetition ──────────────────────────────────────────────────

test("pickTemplate avoids recently-served templates when alternatives exist", () => {
  const templates = [{ id: "a" }, { id: "b" }, { id: "c" }]
  for (let i = 0; i < 20; i++) {
    const { template, degradedToRepeat } = pickTemplate(templates, ["a", "b"])
    assert.equal(template.id, "c")
    assert.equal(degradedToRepeat, false)
  }
})

test("pickTemplate degrades gracefully to a repeat when every template was recently served", () => {
  const templates = [{ id: "a" }, { id: "b" }]
  const { template, degradedToRepeat } = pickTemplate(templates, ["a", "b"])
  assert.ok(["a", "b"].includes(template.id))
  assert.equal(degradedToRepeat, true)
})

test("pickTemplate throws on an empty eligible list", () => {
  assert.throws(() => pickTemplate([], []))
})

// ── scenario selection ────────────────────────────────────────────────────────

test("pickScenario returns the requested scenario when it exists in the pack", () => {
  const pack = { scenarios: [{ scenarioId: "a" }, { scenarioId: "b" }] }
  assert.equal(pickScenario(pack, "b").scenarioId, "b")
})

test("pickScenario falls back to the first scenario when the requested one isn't found", () => {
  const pack = { scenarios: [{ scenarioId: "a" }, { scenarioId: "b" }] }
  assert.equal(pickScenario(pack, "z").scenarioId, "a")
})

test("pickScenario returns null for a pack with no scenarios", () => {
  assert.equal(pickScenario({ scenarios: [] }, null), null)
  assert.equal(pickScenario(null, null), null)
})
