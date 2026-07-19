import { test } from "node:test"
import assert from "node:assert/strict"
import { generateChallengePayload } from "./payloadGenerator.js"

const baseTemplate = {
  id: "tmpl-1",
  skill: "SQL",
  workstation: "sql",
}
const baseVersion = {
  version: "v1",
  difficulty_variants: { Easy: { prompt: "2 tables, INNER JOIN" }, Hard: { prompt: "adds window functions" } },
  validator: { type: "ground_truth_compare", version: "v1", config: { tolerancePct: 1 } },
  assessment_rules: { rubric: [] },
  submission_rules: { timeLimitSecs: 1800 },
  progression_rules: { prerequisiteSkills: [] },
  reward_rules: {
    common: { xp: 10, streak: true, skillMastery: true, elo: false },
    domain: { xp: 10, streak: true, skillMastery: true, elo: true, baseEloGain: 20 },
  },
  portfolio_decision: { eligibleFor: "domain only", minScoreToAutoPublish: 80, artifactType: "code" },
}

test("generateChallengePayload produces every field the frozen schema requires", () => {
  const { payload } = { payload: generateChallengePayload({
    userId: "u1", challengeType: "domain", role: "Data Analyst", industry: "E-Commerce",
    template: baseTemplate, templateVersion: baseVersion, difficulty: "Easy",
    skillGraphVersion: "v1", workstationVersion: "v1",
  }) }

  assert.ok(payload.challengeInstanceId)
  assert.equal(payload.challengeType, "domain")
  assert.equal(payload.careerFamily, "IT")
  assert.equal(payload.role, "Data Analyst")
  assert.equal(payload.challengeTemplateId, "tmpl-1")
  assert.equal(payload.challengeTemplateVersion, "v1")
  assert.equal(payload.skill, "SQL")
  assert.equal(payload.workstation, "sql")
  assert.equal(payload.workstationVersion, "v1")
  assert.equal(payload.difficulty, "Easy")
  assert.deepEqual(payload.payload, { prompt: "2 tables, INNER JOIN" })
  assert.equal(payload.validator.type, "ground_truth_compare")
  assert.equal(payload.rewardRules.common.elo, false)
  assert.equal(payload.rewardRules.domain.elo, true)
  assert.equal(payload.portfolioDecision.recruiterEvidence, null)
})

test("generateChallengePayload merges dataset info into payload and validator config when a dataset version is resolved", () => {
  const payload = generateChallengePayload({
    userId: "u1", challengeType: "domain", role: "Data Analyst",
    template: baseTemplate, templateVersion: baseVersion, difficulty: "Easy",
    datasetVersion: {
      dataset_id: "amazon-orders", version: "v2",
      schema: { tables: ["orders"] }, seed_sql: "CREATE TABLE orders (...);",
    },
  })

  assert.equal(payload.datasetId, "amazon-orders")
  assert.equal(payload.datasetVersion, "v2")
  assert.equal(payload.payload.datasetSeedSql, "CREATE TABLE orders (...);")
  assert.equal(payload.validator.config.seedDatasetId, "amazon-orders")
  // original config keys are preserved alongside the merged one
  assert.equal(payload.validator.config.tolerancePct, 1)
})

test("generateChallengePayload leaves scenario/scenarioPack fields null for Common Challenges", () => {
  const payload = generateChallengePayload({
    userId: "u1", challengeType: "common", role: null,
    template: baseTemplate, templateVersion: baseVersion, difficulty: "Easy",
  })
  assert.equal(payload.scenarioPackId, null)
  assert.equal(payload.scenarioPackVersion, null)
  assert.equal(payload.scenarioId, null)
  assert.equal(payload.skillGraphVersion, null)
})

test("generateChallengePayload throws without a template, version, or difficulty", () => {
  assert.throws(() => generateChallengePayload({ templateVersion: baseVersion, difficulty: "Easy" }))
  assert.throws(() => generateChallengePayload({ template: baseTemplate, difficulty: "Easy" }))
  assert.throws(() => generateChallengePayload({ template: baseTemplate, templateVersion: baseVersion }))
})

test("generateChallengePayload issues a fresh challengeInstanceId on every call", () => {
  const p1 = generateChallengePayload({ challengeType: "common", template: baseTemplate, templateVersion: baseVersion, difficulty: "Easy" })
  const p2 = generateChallengePayload({ challengeType: "common", template: baseTemplate, templateVersion: baseVersion, difficulty: "Easy" })
  assert.notEqual(p1.challengeInstanceId, p2.challengeInstanceId)
})
