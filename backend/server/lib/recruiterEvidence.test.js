import { test } from "node:test"
import assert from "node:assert/strict"
import { buildRecruiterEvidence, buildRecruiterEvidenceView, buildRecruiterEvidenceViewFromProof } from "./recruiterEvidence.js"

test("builds the recruiter evidence shape matching the spec's worked example fields", () => {
  const evidence = buildRecruiterEvidence({
    instance: { skill: "SQL", difficulty: "Hard", industry: "Banking", scenario_id: "fraud-detection" },
    assessment: { final_score: 92 },
    verification: "Verified",
  })
  assert.deepEqual(evidence, {
    skill: "SQL", status: "Completed", scorePct: 92, verification: "Verified",
    difficulty: "Hard", industry: "Banking", scenario: "fraud-detection", skillsDemonstrated: ["SQL"],
  })
})

test("handles null industry/scenario gracefully", () => {
  const evidence = buildRecruiterEvidence({
    instance: { skill: "SQL", difficulty: "Easy", industry: null, scenario_id: null },
    assessment: { final_score: 100 },
    verification: "Verified",
  })
  assert.equal(evidence.industry, null)
  assert.equal(evidence.scenario, null)
})

test("status is always 'Completed' — no artifact is ever created for an in-progress attempt", () => {
  const evidence = buildRecruiterEvidence({ instance: { skill: "SQL", difficulty: "Easy" }, assessment: { final_score: 10 }, verification: "Self-Selected" })
  assert.equal(evidence.status, "Completed")
})

test("buildRecruiterEvidenceView surfaces recruiter_evidence plus artifact-level metadata, not raw column names", () => {
  const artifact = {
    recruiter_evidence: { skill: "SQL", status: "Completed", scorePct: 92, verification: "Verified", difficulty: "Hard", industry: "Banking", scenario: "fraud-detection", skillsDemonstrated: ["SQL"] },
    artifact_type: "code", publish_state: "auto_published", created_at: "2026-01-01T00:00:00Z",
    id: "artifact-1", user_id: "user-1", assessment_id: "assess-1",
  }
  const view = buildRecruiterEvidenceView(artifact)
  assert.equal(view.skill, "SQL")
  assert.equal(view.artifactType, "code")
  assert.equal(view.publishState, "auto_published")
  assert.equal(view.createdAt, "2026-01-01T00:00:00Z")
  assert.equal("user_id" in view, false)
})

test("buildRecruiterEvidenceViewFromProof surfaces AI reviewer evidence (strengths/suggestions/readiness), not just a completion flag", () => {
  const proof = {
    skill: "Machine Learning", score: 82, publish_state: "auto_published",
    difficulty: "Medium", industry: "E-Commerce", skills_demonstrated: ["Python", "Pandas"],
    challenge_type: "domain", completed_at: "2026-07-28T00:00:00Z",
    role: "ML Engineer", title: "ML Engineer — Machine Learning",
    elo_delta: 12, time_taken_secs: 1840,
    validator_result: {
      metadata: {
        strengths: ["Real feature engineering", "Model trained cleanly"],
        suggestions: ["Add a train/test split"],
        taskQuality: "Solid first-pass model.",
        recruiterReadiness: "Recruiter-ready",
        recruiterReadinessNote: "Demonstrates end-to-end ML workflow.",
        criteriaScores: { correctness: 85 },
      },
    },
  }
  const view = buildRecruiterEvidenceViewFromProof(proof)
  assert.equal(view.eloDelta, 12)
  assert.equal(view.timeTakenSecs, 1840)
  assert.deepEqual(view.strengths, ["Real feature engineering", "Model trained cleanly"])
  assert.deepEqual(view.suggestions, ["Add a train/test split"])
  assert.equal(view.recruiterReadiness, "Recruiter-ready")
  assert.equal(view.criteriaScores.correctness, 85)
})

test("buildRecruiterEvidenceViewFromProof degrades gracefully when validator_result has no AI metadata (e.g. ground_truth_compare proofs)", () => {
  const proof = { skill: "SQL", score: 100, publish_state: "auto_published", difficulty: "Medium", skills_demonstrated: ["SQL"], challenge_type: "domain", completed_at: "2026-01-01T00:00:00Z" }
  const view = buildRecruiterEvidenceViewFromProof(proof)
  assert.deepEqual(view.strengths, [])
  assert.equal(view.recruiterReadiness, null)
  assert.equal(view.eloDelta, null)
})
