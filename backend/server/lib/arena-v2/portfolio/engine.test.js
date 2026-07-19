import { test } from "node:test"
import assert from "node:assert/strict"
import { recordPortfolioOutcome, PortfolioEngineError } from "./engine.js"
import { DECISION_TYPES } from "./decision.js"

function domainEvent(overrides = {}) {
  return {
    assessment: { id: "assess-1", user_id: "user-1", final_score: 90, ...(overrides.assessment || {}) },
    instance: {
      id: "inst-1", challenge_type: "domain", skill: "SQL", difficulty: "Hard", industry: "Banking", scenario_id: "fraud-detection",
      portfolio_decision: { minScoreToAutoPublish: 80, allowManualPublishBelowThreshold: true, artifactType: "code" },
      ...(overrides.instance || {}),
    },
    submission: { id: "sub-1" },
    rewardResult: { eloEntry: null, xpEntry: null, skillProgress: {} },
  }
}

function fakeDeps() {
  const calls = []
  const artifacts = {}
  const proofObjects = []
  return {
    deps: {
      getArtifactForAssessment: async (assessmentId) => { calls.push("getArtifactForAssessment"); return artifacts[assessmentId] || null },
      insertArtifact: async (row) => {
        calls.push("insertArtifact")
        const artifact = { id: "artifact-1", ...row }
        artifacts[row.assessmentId] = artifact
        return artifact
      },
      insertProofObject: async (proofObject) => {
        calls.push("insertProofObject")
        proofObjects.push(proofObject)
        return { id: `proof-${proofObjects.length}`, ...proofObject }
      },
    },
    calls,
    proofObjects,
  }
}

test("creates an auto-published artifact when the score meets the threshold", async () => {
  const { deps } = fakeDeps()
  const result = await recordPortfolioOutcome(domainEvent(), deps)
  assert.equal(result.decisionType, DECISION_TYPES.AUTO_PUBLISH)
  assert.ok(result.artifact)
  assert.equal(result.artifact.publishState, "auto_published")
  assert.equal(result.artifact.recruiterEvidence.verification, "Verified")
})

test("creates a not_published draft artifact when below threshold but manual publish is allowed", async () => {
  const { deps } = fakeDeps()
  const result = await recordPortfolioOutcome(domainEvent({ assessment: { final_score: 60 } }), deps)
  assert.equal(result.decisionType, DECISION_TYPES.PENDING_MANUAL)
  assert.equal(result.artifact.publishState, "not_published")
})

test("creates nothing for a common challenge", async () => {
  const { deps, calls } = fakeDeps()
  const result = await recordPortfolioOutcome(domainEvent({ instance: { challenge_type: "common" } }), deps)
  assert.equal(result.decisionType, DECISION_TYPES.NOT_ELIGIBLE)
  assert.equal(result.artifact, null)
  assert.equal(calls.includes("insertArtifact"), false)
})

test("creates nothing when below threshold and manual publish is disallowed", async () => {
  const { deps, calls } = fakeDeps()
  const event = domainEvent({
    assessment: { final_score: 60 },
    instance: { portfolio_decision: { minScoreToAutoPublish: 80, allowManualPublishBelowThreshold: false, artifactType: "code" } },
  })
  const result = await recordPortfolioOutcome(event, deps)
  assert.equal(result.decisionType, DECISION_TYPES.NOT_QUALIFYING)
  assert.equal(result.artifact, null)
  assert.equal(calls.includes("insertArtifact"), false)
})

// Phase 1A (Evidence System unification, 2026-07-20): every completed
// assessment now becomes a Proof Object regardless of portfolio
// eligibility — evidence existing is independent of whether it's ever
// visible on the portfolio/to recruiters.

test("still records a Proof Object for a common challenge, even though no legacy artifact is created", async () => {
  const { deps, calls, proofObjects } = fakeDeps()
  const result = await recordPortfolioOutcome(domainEvent({ instance: { challenge_type: "common" } }), deps)
  assert.equal(result.artifact, null) // legacy artifact behavior unchanged
  assert.equal(calls.includes("insertProofObject"), true)
  assert.equal(proofObjects.length, 1)
  assert.equal(proofObjects[0].publishState, "not_applicable")
  assert.equal(proofObjects[0].isPortfolioVisible, false)
})

test("still records a Proof Object when below threshold and manual publish is disallowed", async () => {
  const { deps, proofObjects } = fakeDeps()
  const event = domainEvent({
    assessment: { final_score: 60 },
    instance: { portfolio_decision: { minScoreToAutoPublish: 80, allowManualPublishBelowThreshold: false, artifactType: "code" } },
  })
  await recordPortfolioOutcome(event, deps)
  assert.equal(proofObjects.length, 1)
  assert.equal(proofObjects[0].publishState, "not_applicable")
})

test("Proof Object publishState is auto_published when the score meets the threshold", async () => {
  const { deps, proofObjects } = fakeDeps()
  await recordPortfolioOutcome(domainEvent(), deps)
  assert.equal(proofObjects.length, 1)
  assert.equal(proofObjects[0].publishState, "auto_published")
  assert.equal(proofObjects[0].isPortfolioVisible, true)
  assert.equal(proofObjects[0].isRecruiterVisible, true)
})

test("Proof Object publishState is not_published (draft) when below threshold but manual publish is allowed", async () => {
  const { deps, proofObjects } = fakeDeps()
  await recordPortfolioOutcome(domainEvent({ assessment: { final_score: 60 } }), deps)
  assert.equal(proofObjects.length, 1)
  assert.equal(proofObjects[0].publishState, "not_published")
  assert.equal(proofObjects[0].isPortfolioVisible, false)
})

test("a Proof Object write failure never fails the overall assessment-completed flow", async () => {
  const { deps } = fakeDeps()
  deps.insertProofObject = async () => { throw new Error("boom") }
  const result = await recordPortfolioOutcome(domainEvent(), deps)
  assert.equal(result.decisionType, DECISION_TYPES.AUTO_PUBLISH)
  assert.ok(result.artifact) // legacy artifact path still succeeds
})

test("IDEMPOTENCY: re-running for the same assessment does not create a second artifact", async () => {
  const { deps, calls } = fakeDeps()
  const first = await recordPortfolioOutcome(domainEvent(), deps)
  assert.equal(first.alreadyApplied, false)
  const second = await recordPortfolioOutcome(domainEvent(), deps)
  assert.equal(second.alreadyApplied, true)
  assert.equal(calls.filter((c) => c === "insertArtifact").length, 1)
})

test("throws if the event is missing required fields", async () => {
  const { deps } = fakeDeps()
  await assert.rejects(() => recordPortfolioOutcome({}, deps), PortfolioEngineError)
})

test("never calls anything reward-related — Reward Engine and Portfolio Decision are independent consumers of the same event", async () => {
  const { deps, calls } = fakeDeps()
  await recordPortfolioOutcome(domainEvent(), deps)
  // Updated for Phase 1A: calls now also legitimately include
  // "insertProofObject" (not reward-related), so the assertion checks for
  // the ABSENCE of reward-engine-shaped calls rather than requiring every
  // call name to contain "Artifact".
  assert.equal(calls.some((c) => /Elo|Xp|Reward/i.test(c)), false)
})
