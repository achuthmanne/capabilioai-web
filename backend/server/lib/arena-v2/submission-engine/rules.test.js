import { test } from "node:test"
import assert from "node:assert/strict"
import { checkSubmissionAllowed } from "./rules.js"

const baseInstance = { status: "issued", submission_rules: {} }

test("allows a first attempt with no attempt/time limits configured", () => {
  const result = checkSubmissionAllowed({ instance: baseInstance, attemptCount: 0 })
  assert.equal(result.allowed, true)
  assert.equal(result.isTimedOut, false)
})

test("rejects submitting to a null instance", () => {
  const result = checkSubmissionAllowed({ instance: null, attemptCount: 0 })
  assert.equal(result.allowed, false)
})

for (const status of ["graded", "expired", "abandoned"]) {
  test(`rejects submitting to an instance already in terminal status "${status}"`, () => {
    const result = checkSubmissionAllowed({ instance: { ...baseInstance, status }, attemptCount: 0 })
    assert.equal(result.allowed, false)
    assert.match(result.reason, new RegExp(status))
  })
}

test("allows submitting to an instance still in_progress", () => {
  const result = checkSubmissionAllowed({ instance: { ...baseInstance, status: "in_progress" }, attemptCount: 0 })
  assert.equal(result.allowed, true)
})

test("rejects once maxAttempts is reached", () => {
  const instance = { ...baseInstance, submission_rules: { maxAttempts: 3 } }
  assert.equal(checkSubmissionAllowed({ instance, attemptCount: 2 }).allowed, true)
  assert.equal(checkSubmissionAllowed({ instance, attemptCount: 3 }).allowed, false)
  assert.match(checkSubmissionAllowed({ instance, attemptCount: 3 }).reason, /Maximum attempts/)
})

test("flags isTimedOut when timeTakenSecs exceeds the configured limit, but still allows the submission", () => {
  const instance = { ...baseInstance, submission_rules: { timeLimitSecs: 600 } }
  const onTime = checkSubmissionAllowed({ instance, attemptCount: 0, timeTakenSecs: 300 })
  assert.equal(onTime.allowed, true)
  assert.equal(onTime.isTimedOut, false)

  const late = checkSubmissionAllowed({ instance, attemptCount: 0, timeTakenSecs: 900 })
  assert.equal(late.allowed, true)
  assert.equal(late.isTimedOut, true)
})

test("isTimedOut is false when no time limit is configured, no matter how long it took", () => {
  const result = checkSubmissionAllowed({ instance: baseInstance, attemptCount: 0, timeTakenSecs: 999999 })
  assert.equal(result.isTimedOut, false)
})
