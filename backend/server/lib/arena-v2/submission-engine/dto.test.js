import { test } from "node:test"
import assert from "node:assert/strict"
import { buildFeedbackResponseDto, FEEDBACK_DTO_SCHEMA_VERSION } from "./dto.js"

function fixture(overrides = {}) {
  return {
    submission: {
      id: "sub-1", instance_id: "inst-1", attempt_number: 1, status: "validated",
      is_timed_out: false, validator_result: { passed: true, score: 100, detail: [] },
      submitted_at: "2026-01-01T00:00:00Z",
    },
    assessment: {
      final_score: 100, is_zero_effort: false,
      feedback: { summary: "Your submission passed validation.", detail: [] },
      created_at: "2026-01-01T00:00:05Z",
    },
    ...overrides,
  }
}

test("builds a well-formed feedback DTO from a passing submission/assessment", () => {
  const dto = buildFeedbackResponseDto(fixture())
  assert.equal(dto.schemaVersion, FEEDBACK_DTO_SCHEMA_VERSION)
  assert.equal(dto.submissionId, "sub-1")
  assert.equal(dto.challengeInstanceId, "inst-1")
  assert.equal(dto.passed, true)
  assert.equal(dto.finalScore, 100)
})

test("passed reflects the validator's own passed flag, not just finalScore === 100", () => {
  const { submission, assessment } = fixture({
    submission: { id: "s", instance_id: "i", attempt_number: 1, status: "validated", is_timed_out: false, validator_result: { passed: false, score: 60, detail: [] }, submitted_at: "t" },
    assessment: { final_score: 60, is_zero_effort: false, feedback: {}, created_at: "t2" },
  })
  const dto = buildFeedbackResponseDto({ submission, assessment })
  assert.equal(dto.passed, false)
  assert.equal(dto.finalScore, 60)
})

test("never includes anything resembling a validator config or ground-truth query", () => {
  const dto = buildFeedbackResponseDto(fixture())
  const serialized = JSON.stringify(dto)
  assert.equal(serialized.toLowerCase().includes("groundtruthquery"), false)
  assert.equal("validator" in dto, false)
})

test("omitting rewardResult (Milestone 8 callers) still produces the exact same DTO shape — additive, non-breaking", () => {
  const dto = buildFeedbackResponseDto(fixture())
  assert.equal(dto.rewards, null)
})

test("surfaces an ELO rewards block for a domain challenge", () => {
  const rewardResult = {
    eloEntry: { eloBefore: 800, eloAfter: 812, delta: 12 },
    xpEntry: null,
    skillProgress: { mastery_state: "proficient", best_score: 100 },
  }
  const dto = buildFeedbackResponseDto({ ...fixture(), rewardResult })
  assert.equal(dto.rewards.type, "elo")
  assert.deepEqual(dto.rewards.elo, { before: 800, after: 812, delta: 12 })
  assert.equal(dto.rewards.xp, null)
  assert.equal(dto.rewards.skill.masteryState, "proficient")
})

test("surfaces an XP rewards block for a common challenge", () => {
  const rewardResult = {
    eloEntry: null,
    xpEntry: { xpGained: 8, streakCounted: true },
    skillProgress: { mastery_state: "mastered", best_score: 100 },
  }
  const dto = buildFeedbackResponseDto({ ...fixture(), rewardResult })
  assert.equal(dto.rewards.type, "xp")
  assert.deepEqual(dto.rewards.xp, { gained: 8, streakCounted: true })
  assert.equal(dto.rewards.elo, null)
})

test("rewards block never includes anything reward-engine-internal (no formula constants, no raw ledger rows beyond the curated fields)", () => {
  const rewardResult = { eloEntry: { eloBefore: 800, eloAfter: 812, delta: 12, id: "elo-1", user_id: "u", assessment_id: "a" }, xpEntry: null, skillProgress: { mastery_state: "proficient", best_score: 100, id: "sp-1" } }
  const dto = buildFeedbackResponseDto({ ...fixture(), rewardResult })
  assert.deepEqual(Object.keys(dto.rewards.elo).sort(), ["after", "before", "delta"])
  assert.deepEqual(Object.keys(dto.rewards.skill).sort(), ["bestScore", "masteryState"])
})

test("omitting portfolioOutcome (Milestone 8/9 callers) still produces the exact same DTO shape — additive, non-breaking", () => {
  const dto = buildFeedbackResponseDto(fixture())
  assert.equal(dto.portfolio, null)
})

test("surfaces a portfolio block when an artifact was auto-published", () => {
  const portfolioOutcome = { decisionType: "auto_publish", artifact: { publishState: "auto_published" }, alreadyApplied: false }
  const dto = buildFeedbackResponseDto({ ...fixture(), portfolioOutcome })
  assert.equal(dto.portfolio.decisionType, "auto_publish")
  assert.equal(dto.portfolio.artifactCreated, true)
  assert.equal(dto.portfolio.publishState, "auto_published")
})

test("surfaces a portfolio block honestly when nothing was created (common challenge / below threshold)", () => {
  const portfolioOutcome = { decisionType: "not_eligible", artifact: null, alreadyApplied: false }
  const dto = buildFeedbackResponseDto({ ...fixture(), portfolioOutcome })
  assert.equal(dto.portfolio.decisionType, "not_eligible")
  assert.equal(dto.portfolio.artifactCreated, false)
  assert.equal(dto.portfolio.publishState, null)
})

test("portfolio block never includes the full recruiter_evidence object — only enough for the submit-flow UI", () => {
  const portfolioOutcome = {
    decisionType: "auto_publish",
    artifact: { publishState: "auto_published", recruiterEvidence: { skill: "SQL", scorePct: 100, skillsDemonstrated: ["SQL"] } },
    alreadyApplied: false,
  }
  const dto = buildFeedbackResponseDto({ ...fixture(), portfolioOutcome })
  assert.equal("recruiterEvidence" in dto.portfolio, false)
  assert.equal("skillsDemonstrated" in dto.portfolio, false)
})

test("reflects zero-effort/timeout state honestly", () => {
  const { submission, assessment } = fixture({
    submission: { id: "s", instance_id: "i", attempt_number: 1, status: "validated", is_timed_out: true, validator_result: { passed: true, score: 100, detail: [] }, submitted_at: "t" },
    assessment: { final_score: 30, is_zero_effort: true, feedback: { summary: "late" }, created_at: "t2" },
  })
  const dto = buildFeedbackResponseDto({ submission, assessment })
  assert.equal(dto.isZeroEffort, true)
  assert.equal(dto.isTimedOut, true)
  assert.equal(dto.finalScore, 30)
})
