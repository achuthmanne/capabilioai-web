import { test } from "node:test"
import assert from "node:assert/strict"
import { assembleAssessment } from "./engine.js"

function fakeDeps(overrides = {}) {
  const inserted = []
  return {
    deps: {
      insertAssessment: async (row) => { inserted.push(row); return { id: "assess-1", ...row } },
      ...overrides,
    },
    inserted,
  }
}

test("assembles a passing assessment from a passing validator result", async () => {
  const { deps, inserted } = fakeDeps()
  const submission = { id: "sub-1", user_id: "user-1", is_timed_out: false }
  const instance = { id: "inst-1" }
  const validatorResult = { passed: true, score: 100, evidence: [{ metric: "x", expected: 1, actual: 1, passed: true }], diagnostics: [] }

  const result = await assembleAssessment({ submission, instance, validatorResult }, deps)

  assert.equal(result.finalScore, 100)
  assert.equal(result.isZeroEffort, false)
  assert.equal(inserted[0].submissionId, "sub-1")
  assert.equal(inserted[0].instanceId, "inst-1")
  assert.equal(inserted[0].userId, "user-1")
  assert.ok(inserted[0].feedback.summary.includes("passed"))
})

test("caps the score when the submission was timed out (zero-effort rule)", async () => {
  const { deps, inserted } = fakeDeps()
  const submission = { id: "sub-2", user_id: "user-1", is_timed_out: true }
  const instance = { id: "inst-2" }
  const validatorResult = { passed: true, score: 100, evidence: [], diagnostics: [] }

  const result = await assembleAssessment({ submission, instance, validatorResult }, deps)

  assert.equal(result.finalScore, 30)
  assert.equal(result.isZeroEffort, true)
  assert.match(inserted[0].feedback.summary, /late/)
})

test("throws if validatorResult has no numeric score — Assessment must never fabricate a score", async () => {
  const { deps } = fakeDeps()
  await assert.rejects(() => assembleAssessment({
    submission: { id: "s" }, instance: { id: "i" }, validatorResult: {},
  }, deps))
})

test("throws if submission or instance is missing", async () => {
  const { deps } = fakeDeps()
  const validatorResult = { score: 50 }
  await assert.rejects(() => assembleAssessment({ instance: { id: "i" }, validatorResult }, deps))
  await assert.rejects(() => assembleAssessment({ submission: { id: "s" }, validatorResult }, deps))
})

test("translates validatorResult.evidence and .diagnostics into the public feedback.detail array (internal ValidatorResult -> external Feedback DTO boundary)", async () => {
  const { deps, inserted } = fakeDeps()
  const validatorResult = {
    passed: false, score: 0,
    evidence: [{ metric: "value #1", expected: 100, actual: "not found", passed: false }],
    diagnostics: ["Your SQL query failed to execute: syntax error"],
  }
  await assembleAssessment({ submission: { id: "s", user_id: "u", is_timed_out: false }, instance: { id: "i" }, validatorResult }, deps)
  const detail = inserted[0].feedback.detail
  assert.equal(detail.length, 2)
  assert.equal(detail[0].metric, "value #1")
  assert.equal(detail[1].metric, "execution")
  assert.equal(detail[1].actual, "Your SQL query failed to execute: syntax error")
})

test("never writes to av2_elo_ledger or av2_xp_ledger — that's Milestone 9's job, not this engine's", async () => {
  const seenCalls = []
  const deps = {
    insertAssessment: async (row) => { seenCalls.push("insertAssessment"); return { id: "a1", ...row } },
  }
  await assembleAssessment({
    submission: { id: "s", user_id: "u", is_timed_out: false },
    instance: { id: "i" },
    validatorResult: { passed: true, score: 100, evidence: [], diagnostics: [] },
  }, deps)
  assert.deepEqual(seenCalls, ["insertAssessment"])
})
