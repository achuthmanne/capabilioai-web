/**
 * validator.test.js — Milestone 4
 * Fully dependency-injected: no Supabase, no network. Fakes track their own
 * calls so tests can assert on what got logged/emitted/persisted.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { validateAndIssue, PayloadRejectedError } from "./validator.js"

function validPayload(overrides = {}) {
  return {
    challengeInstanceId: "11111111-1111-1111-1111-111111111111",
    challengeType: "domain",
    careerFamily: "IT",
    role: "Frontend Developer",
    difficulty: "Easy",
    skill: "React",
    challengeTemplateId: "tmpl-1",
    challengeTemplateVersion: "v1",
    workstation: "react_frontend",
    workstationVersion: "v1",
    payload: { prompt: "..." },
    validator: { type: "live_render_probe", version: "v1", config: {} },
    rewardRules: {
      common: { xp: 10, streak: true, skillMastery: true, elo: false },
      domain: { xp: 10, streak: true, skillMastery: true, elo: true, baseEloGain: 20 },
    },
    portfolioDecision: { recruiterEvidence: null },
    ...overrides,
  }
}

function makeDeps(overrides = {}) {
  const calls = { logRejection: [], emitAnalyticsEvent: [], insertChallengeInstance: [] }
  const deps = {
    getRoleCapabilities: async () => ({
      role: "Frontend Developer",
      workstations: ["react_frontend", "code"],
      validators: ["live_render_probe", "test_case_judge"],
    }),
    insertChallengeInstance: async (payload, userId) => {
      calls.insertChallengeInstance.push({ payload, userId })
      return { id: payload.challengeInstanceId, user_id: userId, status: "issued" }
    },
    logRejection: async (args) => { calls.logRejection.push(args) },
    emitAnalyticsEvent: async (args) => { calls.emitAnalyticsEvent.push(args) },
    ...overrides,
  }
  return { deps, calls }
}

test("validateAndIssue issues an instance and emits validator_passed when both gates pass", async () => {
  const { deps, calls } = makeDeps()
  const instance = await validateAndIssue(validPayload(), { userId: "u1" }, deps)

  assert.equal(instance.status, "issued")
  assert.equal(calls.insertChallengeInstance.length, 1)
  assert.equal(calls.logRejection.length, 0)
  assert.equal(calls.emitAnalyticsEvent.length, 1)
  assert.equal(calls.emitAnalyticsEvent[0].eventType, "validator_passed")
})

test("validateAndIssue rejects at the schema gate before ever checking Capability Registry", async () => {
  const { deps, calls } = makeDeps()
  let capabilityChecked = false
  deps.getRoleCapabilities = async () => { capabilityChecked = true; return null }

  await assert.rejects(
    () => validateAndIssue(validPayload({ workstation: "not_a_real_workstation" }), { userId: "u1" }, deps),
    PayloadRejectedError
  )
  assert.equal(capabilityChecked, false)
  assert.equal(calls.logRejection.length, 1)
  assert.equal(calls.logRejection[0].gate, "schema_shape")
  assert.equal(calls.insertChallengeInstance.length, 0)
})

test("validateAndIssue rejects at the capability gate with a schema-valid payload for an unregistered workstation", async () => {
  const { deps, calls } = makeDeps({
    getRoleCapabilities: async () => ({ role: "Frontend Developer", workstations: ["code"], validators: ["test_case_judge"] }),
  })

  await assert.rejects(
    () => validateAndIssue(validPayload(), { userId: "u1" }, deps),
    PayloadRejectedError
  )
  assert.equal(calls.logRejection.length, 1)
  assert.equal(calls.logRejection[0].gate, "capability_registry")
  assert.equal(calls.insertChallengeInstance.length, 0)
})

test("validateAndIssue rejects when no Capability Registry entry exists for the role at all", async () => {
  const { deps, calls } = makeDeps({ getRoleCapabilities: async () => null })

  let caught = null
  try {
    await validateAndIssue(validPayload(), { userId: "u1" }, deps)
    assert.fail("expected rejection")
  } catch (err) {
    caught = err
  }
  assert.ok(caught instanceof PayloadRejectedError)
  assert.equal(caught.gate, "capability_registry")
  assert.equal(calls.logRejection[0].reason.includes("no Capability Registry entry exists"), true)
})

test("validateAndIssue never checks Capability Registry for Common Challenges", async () => {
  const { deps, calls } = makeDeps()
  let capabilityChecked = false
  deps.getRoleCapabilities = async () => { capabilityChecked = true; return null }

  const commonPayload = validPayload({
    challengeType: "common", role: null, workstation: "sql",
    validator: { type: "ground_truth_compare", version: "v1", config: {} },
  })
  await validateAndIssue(commonPayload, { userId: "u1" }, deps)
  assert.equal(capabilityChecked, false)
  assert.equal(calls.insertChallengeInstance.length, 1)
})

test("validateAndIssue requires a userId", async () => {
  const { deps } = makeDeps()
  await assert.rejects(() => validateAndIssue(validPayload(), {}, deps))
})

test("PayloadRejectedError carries the gate name and issues for the caller to inspect", async () => {
  const { deps } = makeDeps()
  try {
    await validateAndIssue(validPayload({ difficulty: "Legendary" }), { userId: "u1" }, deps)
    assert.fail("expected rejection")
  } catch (err) {
    assert.ok(err instanceof PayloadRejectedError)
    assert.equal(err.gate, "schema_shape")
    assert.ok(Array.isArray(err.issues) && err.issues.length > 0)
  }
})
