import { test } from "node:test"
import assert from "node:assert/strict"
import { validatePayloadShape } from "./schemaValidator.js"

function validPayload(overrides = {}) {
  return {
    challengeInstanceId: "11111111-1111-1111-1111-111111111111",
    challengeType: "domain",
    careerFamily: "IT",
    role: "Data Analyst",
    difficulty: "Easy",
    skill: "SQL",
    challengeTemplateId: "tmpl-1",
    challengeTemplateVersion: "v1",
    workstation: "sql",
    workstationVersion: "v1",
    payload: { prompt: "..." },
    validator: { type: "ground_truth_compare", version: "v1", config: {} },
    rewardRules: {
      common: { xp: 10, streak: true, skillMastery: true, elo: false },
      domain: { xp: 10, streak: true, skillMastery: true, elo: true, baseEloGain: 20 },
    },
    portfolioDecision: { recruiterEvidence: null },
    ...overrides,
  }
}

test("validatePayloadShape accepts a well-formed domain payload", () => {
  const { valid, issues } = validatePayloadShape(validPayload())
  assert.equal(valid, true)
  assert.deepEqual(issues, [])
})

test("validatePayloadShape accepts a well-formed common payload with role null", () => {
  const { valid } = validatePayloadShape(validPayload({ challengeType: "common", role: null }))
  assert.equal(valid, true)
})

test("validatePayloadShape rejects a domain payload with no role", () => {
  const { valid, issues } = validatePayloadShape(validPayload({ role: null }))
  assert.equal(valid, false)
  assert.ok(issues.some((i) => i.includes("role is required")))
})

test("validatePayloadShape rejects an unknown workstation id", () => {
  const { valid, issues } = validatePayloadShape(validPayload({ workstation: "not_a_real_workstation" }))
  assert.equal(valid, false)
  assert.ok(issues.some((i) => i.includes("unknown workstation id")))
})

test("validatePayloadShape rejects an unknown validator type", () => {
  const { valid, issues } = validatePayloadShape(validPayload({ validator: { type: "not_real", version: "v1", config: {} } }))
  assert.equal(valid, false)
  assert.ok(issues.some((i) => i.includes("unknown validator type")))
})

test("validatePayloadShape rejects an empty payload.payload (the hard gate)", () => {
  const { valid, issues } = validatePayloadShape(validPayload({ payload: {} }))
  assert.equal(valid, false)
  assert.ok(issues.some((i) => i.includes("payload.payload")))
})

test("validatePayloadShape rejects missing rewardRules", () => {
  const { valid, issues } = validatePayloadShape(validPayload({ rewardRules: undefined }))
  assert.equal(valid, false)
  assert.ok(issues.some((i) => i.includes("rewardRules")))
})

test("validatePayloadShape rejects rewardRules.common.elo = true (frozen ELO/XP split)", () => {
  const { valid, issues } = validatePayloadShape(validPayload({
    rewardRules: {
      common: { xp: 10, streak: true, skillMastery: true, elo: true },
      domain: { xp: 10, streak: true, skillMastery: true, elo: true, baseEloGain: 20 },
    },
  }))
  assert.equal(valid, false)
  assert.ok(issues.some((i) => i.includes("Common Challenges never award ELO")))
})

test("validatePayloadShape rejects an invalid difficulty tier", () => {
  const { valid, issues } = validatePayloadShape(validPayload({ difficulty: "Legendary" }))
  assert.equal(valid, false)
  assert.ok(issues.some((i) => i.includes("difficulty must be one of")))
})

test("validatePayloadShape rejects a non-object payload entirely", () => {
  const { valid, issues } = validatePayloadShape(null)
  assert.equal(valid, false)
  assert.deepEqual(issues, ["payload must be an object"])
})

test("validatePayloadShape collects multiple issues at once rather than stopping at the first", () => {
  const { valid, issues } = validatePayloadShape({})
  assert.equal(valid, false)
  assert.ok(issues.length > 3)
})
