import { test } from "node:test"
import assert from "node:assert/strict"
import { submitChallenge, InstanceNotFoundError, defaultDeps } from "./service.js"
import { SubmissionNotAllowedError } from "./rules.js"

function makeInstance(overrides = {}) {
  return {
    id: "inst-1", user_id: "user-1", status: "issued",
    submission_rules: {}, payload: { datasetSeedSql: "CREATE TABLE t (a INT);" },
    validator: { type: "ground_truth_compare", version: "v1", config: {} },
    ...overrides,
  }
}

function fakeDeps(overrides = {}) {
  const calls = []
  const submissions = {}
  const instanceStatuses = []
  const base = {
    getInstanceForSubmission: async (id, userId) => {
      calls.push(["getInstanceForSubmission", id, userId])
      return overrides.instance !== undefined ? overrides.instance : makeInstance()
    },
    getAttemptCount: async () => { calls.push(["getAttemptCount"]); return overrides.attemptCount ?? 0 },
    insertSubmission: async (row) => {
      calls.push(["insertSubmission", row])
      const sub = { id: "sub-1", instance_id: row.instanceId, user_id: row.userId, attempt_number: row.attemptNumber, status: "running", is_timed_out: row.isTimedOut }
      submissions[sub.id] = sub
      return sub
    },
    updateSubmissionResult: overrides.updateSubmissionResult || (async (id, { status, validatorResult }) => {
      calls.push(["updateSubmissionResult", id, status])
      submissions[id] = { ...submissions[id], status, validator_result: validatorResult, validated_at: "t" }
      return submissions[id]
    }),
    markInstanceStatus: async (id, status) => { calls.push(["markInstanceStatus", id, status]); instanceStatuses.push(status) },
    runValidator: overrides.runValidator || (async () => ({ passed: true, score: 100, evidence: [], diagnostics: [] })),
    assembleAssessment: overrides.assembleAssessment || (async ({ submission }) => ({
      id: "assess-1", final_score: 100, is_zero_effort: false, feedback: { summary: "ok", detail: [] }, created_at: "t",
    })),
    assessmentDeps: {},
    applyRewards: overrides.applyRewards || (async ({ assessment, instance }) => {
      calls.push(["applyRewards", assessment, instance])
      return { eloEntry: null, xpEntry: { xpGained: 5, streakCounted: true }, skillProgress: { mastery_state: "attempted", best_score: 100 }, alreadyApplied: false }
    }),
    rewardEngineDeps: {},
    recordPortfolioOutcome: overrides.recordPortfolioOutcome || (async (event) => {
      calls.push(["recordPortfolioOutcome", event])
      return { decisionType: "not_eligible", artifact: null, alreadyApplied: false }
    }),
    portfolioDeps: {},
    // Only present at all when a test explicitly opts in (Skill Studio loop
    // closure tests, below) — every pre-existing test's deps object gets
    // exactly the same shape it always had, with no notifySkillStudio key,
    // proving service.js's `typeof deps.notifySkillStudio === "function"`
    // guard is what keeps them passing unchanged, not an accidental default.
    ...(overrides.notifySkillStudio ? { notifySkillStudio: overrides.notifySkillStudio, skillStudioDeps: {} } : {}),
  }
  return { deps: base, calls, instanceStatuses, submissions }
}

test("happy path: submits, grades, assesses, and marks the instance graded when passed", async () => {
  const { deps, instanceStatuses } = fakeDeps()
  const dto = await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  assert.equal(dto.schemaVersion, "v1")
  assert.equal(dto.finalScore, 100)
  assert.deepEqual(instanceStatuses, ["graded"])
})

test("throws InstanceNotFoundError when the instance doesn't exist or isn't owned by this user", async () => {
  const { deps } = fakeDeps({ instance: null })
  await assert.rejects(
    () => submitChallenge({ userId: "user-1", instanceId: "nope", submissionData: {} }, deps),
    InstanceNotFoundError
  )
})

test("throws SubmissionNotAllowedError when rules.js rejects (e.g. instance already graded)", async () => {
  const { deps } = fakeDeps({ instance: makeInstance({ status: "graded" }) })
  await assert.rejects(
    () => submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: {} }, deps),
    SubmissionNotAllowedError
  )
})

test("RETRY FLOW: a failed attempt with attempts remaining leaves the instance in_progress, not graded", async () => {
  const { deps, instanceStatuses } = fakeDeps({
    instance: makeInstance({ submission_rules: { maxAttempts: 3 } }),
    attemptCount: 0, // this will be attempt 1 of 3
    runValidator: async () => ({ passed: false, score: 40, evidence: [], diagnostics: [] }),
    assembleAssessment: async () => ({ id: "a1", final_score: 40, is_zero_effort: false, feedback: {}, created_at: "t" }),
  })
  await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  assert.deepEqual(instanceStatuses, ["in_progress"])
})

test("RETRY FLOW: a failed attempt on the LAST allowed attempt marks the instance graded (attempts exhausted)", async () => {
  const { deps, instanceStatuses } = fakeDeps({
    instance: makeInstance({ submission_rules: { maxAttempts: 3 } }),
    attemptCount: 2, // this will be attempt 3 of 3 — the last one
    runValidator: async () => ({ passed: false, score: 40, evidence: [], diagnostics: [] }),
    assembleAssessment: async () => ({ id: "a1", final_score: 40, is_zero_effort: false, feedback: {}, created_at: "t" }),
  })
  await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  assert.deepEqual(instanceStatuses, ["graded"])
})

test("a passing attempt always marks the instance graded, even with retries still nominally available", async () => {
  const { deps, instanceStatuses } = fakeDeps({
    instance: makeInstance({ submission_rules: { maxAttempts: 3 } }),
    attemptCount: 0,
    runValidator: async () => ({ passed: true, score: 100, evidence: [], diagnostics: [] }),
  })
  await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  assert.deepEqual(instanceStatuses, ["graded"])
})

test("when the validator itself fails (e.g. NotImplementedValidatorError), the submission is marked failed_to_validate and the error propagates rather than fabricating a result", async () => {
  const { deps, calls } = fakeDeps({
    runValidator: async () => { throw new Error("boom — validator crashed") },
  })
  await assert.rejects(
    () => submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps),
    /boom/
  )
  const updateCall = calls.find((c) => c[0] === "updateSubmissionResult")
  assert.equal(updateCall[2], "failed_to_validate")
  // Assessment must never be assembled from a validator that never actually ran.
  assert.equal(calls.some((c) => c[0] === "assembleAssessment"), false)
})

test("the failure-fallback validatorResult also uses the canonical ValidatorResult shape (evidence/diagnostics), not an ad-hoc one", async () => {
  const stored = []
  const { deps } = fakeDeps({
    runValidator: async () => { throw new Error("groundTruthCompare: broken content") },
    updateSubmissionResult: async (id, { status, validatorResult }) => { stored.push(validatorResult); return { id, status, validator_result: validatorResult } },
  })
  await assert.rejects(() => submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps))
  assert.equal(stored[0].passed, false)
  assert.equal(stored[0].score, 0)
  assert.ok(Array.isArray(stored[0].evidence))
  assert.ok(Array.isArray(stored[0].diagnostics))
  assert.match(stored[0].diagnostics[0], /Grading could not run/)
})

test("MILESTONE 9 BOUNDARY: Reward Engine receives only { assessment, instance } — never validatorResult or submissionData", async () => {
  let received = null
  const { deps } = fakeDeps({
    applyRewards: async ({ assessment, instance }) => {
      received = { assessment, instance, keys: Object.keys({ assessment, instance }) }
      return { eloEntry: null, xpEntry: { xpGained: 1, streakCounted: true }, skillProgress: {}, alreadyApplied: false }
    },
  })
  await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  assert.deepEqual(received.keys, ["assessment", "instance"])
  assert.equal(received.assessment.id, "assess-1")
  assert.equal(received.instance.id, "inst-1")
})

test("rewards are applied before the instance is marked graded, and the reward result reaches the Feedback DTO", async () => {
  const { deps, calls } = fakeDeps()
  const dto = await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  const rewardCallIndex = calls.findIndex((c) => c[0] === "applyRewards")
  const markGradedIndex = calls.findIndex((c) => c[0] === "markInstanceStatus")
  assert.ok(rewardCallIndex >= 0 && rewardCallIndex < markGradedIndex)
  assert.equal(dto.rewards.type, "xp")
  assert.equal(dto.rewards.xp.gained, 5)
})

test("MILESTONE 10 BOUNDARY: Portfolio Engine receives the AssessmentCompletedEvent (assessment, instance, submission, rewardResult) — Reward Engine and Portfolio Engine never call each other", async () => {
  let receivedEvent = null
  const { deps, calls } = fakeDeps({
    recordPortfolioOutcome: async (event) => { calls.push(["recordPortfolioOutcome", event]); receivedEvent = event; return { decisionType: "auto_publish", artifact: { publishState: "auto_published" }, alreadyApplied: false } },
  })
  await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  assert.deepEqual(Object.keys(receivedEvent).sort(), ["assessment", "instance", "rewardResult", "submission"])
  assert.equal(receivedEvent.assessment.id, "assess-1")
  assert.equal(receivedEvent.instance.id, "inst-1")
  assert.equal(receivedEvent.submission.instance_id, "inst-1")
  assert.ok(receivedEvent.rewardResult)
  // The reward-engine fake was never touched by recordPortfolioOutcome, and
  // vice versa — each was called exactly once by submitChallenge itself.
  assert.equal(calls.filter((c) => c[0] === "applyRewards").length, 1)
  assert.equal(calls.filter((c) => c[0] === "recordPortfolioOutcome").length, 1)
})

test("portfolio outcome reaches the Feedback DTO, additively", async () => {
  const { deps } = fakeDeps({
    recordPortfolioOutcome: async () => ({ decisionType: "auto_publish", artifact: { publishState: "auto_published" }, alreadyApplied: false }),
  })
  const dto = await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  assert.equal(dto.portfolio.decisionType, "auto_publish")
  assert.equal(dto.portfolio.artifactCreated, true)
  assert.equal(dto.portfolio.publishState, "auto_published")
})

test("passes the instance's pinned datasetSeedSql to the validator as context, never re-fetching \"latest\"", async () => {
  let capturedContext = null
  const { deps } = fakeDeps({
    runValidator: async ({ context }) => { capturedContext = context; return { passed: true, score: 100, evidence: [], diagnostics: [] } },
  })
  await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  assert.equal(capturedContext.datasetSeedSql, "CREATE TABLE t (a INT);")
})

// ─────────────────────────────────────────────────────────────────────────
// SKILL STUDIO V2 LOOP CLOSURE (2026-07-29) — notifySkillStudio wiring.
// These are ADDITIVE to every test above; none of the existing fakeDeps()
// fixtures were touched, and none of them include notifySkillStudio/
// skillStudioDeps — proving the guarded `typeof deps.notifySkillStudio ===
// "function"` check in service.js keeps every pre-existing caller working
// unchanged, exactly as intended.
// ─────────────────────────────────────────────────────────────────────────

test("SKILL STUDIO LOOP CLOSURE: notifySkillStudio receives the identical AssessmentCompletedEvent Reward/Portfolio Engine received", async () => {
  let receivedEvent = null
  const { deps } = fakeDeps({
    notifySkillStudio: async (event) => { receivedEvent = event; return { ok: true } },
  })
  await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  assert.ok(receivedEvent)
  assert.deepEqual(Object.keys(receivedEvent).sort(), ["assessment", "instance", "rewardResult", "submission"])
  assert.equal(receivedEvent.assessment.id, "assess-1")
})

test("SKILL STUDIO LOOP CLOSURE: is called AFTER recordPortfolioOutcome and BEFORE the instance is marked graded", async () => {
  const { deps, calls } = fakeDeps({
    notifySkillStudio: async () => { calls.push(["notifySkillStudio"]); return { ok: true } },
  })
  await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  const portfolioIdx = calls.findIndex((c) => c[0] === "recordPortfolioOutcome")
  const notifyIdx = calls.findIndex((c) => c[0] === "notifySkillStudio")
  const markGradedIdx = calls.findIndex((c) => c[0] === "markInstanceStatus")
  assert.ok(portfolioIdx >= 0 && portfolioIdx < notifyIdx && notifyIdx < markGradedIdx)
})

test("SKILL STUDIO LOOP CLOSURE: a deps object with NO notifySkillStudio key behaves exactly as before (every pre-existing test's fixture shape)", async () => {
  const { deps, instanceStatuses } = fakeDeps() // base fixture never sets notifySkillStudio
  const dto = await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  assert.equal(dto.finalScore, 100)
  assert.deepEqual(instanceStatuses, ["graded"])
})

test("SKILL STUDIO LOOP CLOSURE: if notifySkillStudio somehow throws (violating its own contract), the Arena response is still returned successfully, not broken", async () => {
  const { deps } = fakeDeps({
    notifySkillStudio: async () => { throw new Error("Skill Studio bug — must never surface to the learner") },
  })
  const dto = await submitChallenge({ userId: "user-1", instanceId: "inst-1", submissionData: { query: "SELECT 1" } }, deps)
  assert.equal(dto.finalScore, 100)
})

test("SKILL STUDIO LOOP CLOSURE: defaultDeps wires notifySkillStudio to the real arenaIngestion.notifySkillStudio", async () => {
  assert.equal(typeof defaultDeps.notifySkillStudio, "function")
  assert.equal(typeof defaultDeps.skillStudioDeps, "object")
})
