import { test } from "node:test"
import assert from "node:assert/strict"
import { buildChallengeResponseDto, CHALLENGE_DTO_SCHEMA_VERSION } from "./dto.js"

const instance = {
  id: "inst-1",
  status: "issued",
  challenge_type: "domain",
  career_family: "IT",
  role: "Data Analyst",
  industry: "Banking",
  difficulty: "Hard",
  skill: "SQL",
  scenario_pack_id: "pack-1",
  scenario_id: "fraud-review",
  assessment_rules: { rubric: [] },
  submission_rules: { timeLimitSecs: 1800 },
  reward_rules: { common: { elo: false }, domain: { elo: true, baseEloGain: 20 } },
  portfolio_decision: { recruiterEvidence: null },
  started_at: "2026-07-17T12:00:00Z",
  expires_at: "2026-07-17T12:30:00Z",
  // The dangerous field — must never leak into the DTO.
  validator: { type: "ground_truth_compare", version: "v1", config: { groundTruthQuery: "SELECT the_answer FROM secret_table" } },
}

const routing = {
  workstation: "sql",
  componentKey: "SqlWorkstation",
  uiModules: ["sql_editor", "console_output"],
  artifactType: "code",
  payload: { prompt: "find fraudulent transactions" },
}

test("buildChallengeResponseDto NEVER includes the validator field", () => {
  const dto = buildChallengeResponseDto({ instance, routing, resumed: false })
  assert.equal("validator" in dto, false)
  assert.equal(JSON.stringify(dto).includes("groundTruthQuery"), false)
  assert.equal(JSON.stringify(dto).includes("secret_table"), false)
})

test("buildChallengeResponseDto stamps a schemaVersion the frontend can check before rendering", () => {
  const dto = buildChallengeResponseDto({ instance, routing, resumed: false })
  assert.equal(dto.schemaVersion, CHALLENGE_DTO_SCHEMA_VERSION)
  assert.equal(dto.schemaVersion, "v1")
})

test("buildChallengeResponseDto includes everything the workstation and student actually need", () => {
  const dto = buildChallengeResponseDto({ instance, routing, resumed: true })
  assert.equal(dto.challengeInstanceId, "inst-1")
  assert.equal(dto.resumed, true)
  assert.equal(dto.role, "Data Analyst")
  assert.equal(dto.difficulty, "Hard")
  assert.equal(dto.workstation, "sql")
  assert.equal(dto.componentKey, "SqlWorkstation")
  assert.deepEqual(dto.payload, { prompt: "find fraudulent transactions" })
  assert.deepEqual(dto.submissionRules, { timeLimitSecs: 1800 })
  assert.equal(dto.rewardRules.domain.elo, true)
})

test("buildChallengeResponseDto defaults resumed to false when omitted", () => {
  const dto = buildChallengeResponseDto({ instance, routing })
  assert.equal(dto.resumed, false)
})
