import { test } from "node:test"
import assert from "node:assert/strict"
import { buildRecruiterEvidence, buildRecruiterEvidenceView } from "./recruiterEvidence.js"

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
