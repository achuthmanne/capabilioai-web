/**
 * engine.test.js — Milestone 3
 * Fully dependency-injected: no Supabase, no network, no live DB. Every test
 * supplies a fake `deps` object built from plain in-memory fixtures.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { selectAndGenerateChallenge, EntitlementError, NoEligibleContentError, ChallengeEngineError } from "./engine.js"

const domainTemplate = {
  id: "tmpl-sql-1", slug: "sql-joins", challenge_type: "domain",
  role: "Data Analyst", skill: "SQL", workstation: "sql", scenario_pack_id: "pack-1",
}
const domainTemplateVersion = {
  version: "v1",
  difficulty_variants: { Easy: {}, Medium: {}, Hard: {} },
  validator: { type: "ground_truth_compare", version: "v1", config: {} },
  reward_rules: { common: { elo: false }, domain: { elo: true, baseEloGain: 20 } },
  portfolio_decision: { artifactType: "code" },
}
const commonTemplate = {
  id: "tmpl-sql-common", slug: "sql-practice", challenge_type: "common",
  role: null, skill: "SQL", workstation: "sql", scenario_pack_id: null,
}
const commonTemplateVersion = {
  version: "v1",
  difficulty_variants: { Easy: {} },
  validator: { type: "ground_truth_compare", version: "v1", config: {} },
  reward_rules: { common: { elo: false }, domain: { elo: true } },
  portfolio_decision: {},
}

function makeDeps(overrides = {}) {
  return {
    listChallengeTemplates: async ({ challengeType }) =>
      challengeType === "domain" ? [domainTemplate] : [commonTemplate],
    getActiveChallengeTemplateVersion: async (id) =>
      id === domainTemplate.id ? domainTemplateVersion : commonTemplateVersion,
    getActiveSkillGraph: async () => ({ version: "graph-v1" }),
    getScenarioPackById: async () => ({ id: "pack-1", version: "v1", scenarios: [{ scenarioId: "customer-orders", name: "Customer Orders" }] }),
    getDatasetForScenarioPack: async () => ({ dataset_id: "amazon-orders" }),
    getActiveDatasetVersion: async () => ({ dataset_id: "amazon-orders", version: "v2", schema: {}, seed_sql: "..." }),
    getSkillProgress: async () => [],
    hasActiveDomainGrant: async () => true,
    getRecentTemplateIdsForSkill: async () => [],
    ...overrides,
  }
}

test("selectAndGenerateChallenge assembles a full domain payload with scenario + dataset resolved", async () => {
  const { payload, meta } = await selectAndGenerateChallenge(
    { userId: "u1", challengeType: "domain", role: "Data Analyst" },
    makeDeps()
  )
  assert.equal(payload.role, "Data Analyst")
  assert.equal(payload.scenarioPackId, "pack-1")
  assert.equal(payload.scenarioId, "customer-orders")
  assert.equal(payload.datasetId, "amazon-orders")
  assert.equal(payload.datasetVersion, "v2")
  assert.equal(payload.skillGraphVersion, "graph-v1")
  assert.equal(payload.rewardRules.domain.elo, true)
  assert.equal(meta.resolvedSkill, "SQL")
})

test("selectAndGenerateChallenge leaves scenario/dataset/skillGraph null for Common Challenges", async () => {
  const { payload } = await selectAndGenerateChallenge(
    { userId: "u1", challengeType: "common" },
    makeDeps()
  )
  assert.equal(payload.scenarioPackId, null)
  assert.equal(payload.datasetId, null)
  assert.equal(payload.skillGraphVersion, null)
})

test("selectAndGenerateChallenge rejects a domain request with no active grant", async () => {
  await assert.rejects(
    () => selectAndGenerateChallenge(
      { userId: "u1", challengeType: "domain", role: "Data Analyst" },
      makeDeps({ hasActiveDomainGrant: async () => false })
    ),
    EntitlementError
  )
})

test("selectAndGenerateChallenge never grant-checks Common Challenges", async () => {
  let called = false
  await selectAndGenerateChallenge(
    { userId: "u1", challengeType: "common" },
    makeDeps({ hasActiveDomainGrant: async () => { called = true; return false } })
  )
  assert.equal(called, false)
})

test("selectAndGenerateChallenge requires role for domain challenges", async () => {
  await assert.rejects(
    () => selectAndGenerateChallenge({ userId: "u1", challengeType: "domain" }, makeDeps()),
    ChallengeEngineError
  )
})

test("selectAndGenerateChallenge surfaces NoEligibleContentError when no templates exist for the role", async () => {
  await assert.rejects(
    () => selectAndGenerateChallenge(
      { userId: "u1", challengeType: "domain", role: "Data Analyst" },
      makeDeps({ listChallengeTemplates: async () => [] })
    ),
    NoEligibleContentError
  )
})

test("selectAndGenerateChallenge picks difficulty from mastery state when the student has a progress row", async () => {
  const { payload } = await selectAndGenerateChallenge(
    { userId: "u1", challengeType: "domain", role: "Data Analyst" },
    makeDeps({ getSkillProgress: async () => [{ skill: "SQL", mastery_state: "proficient" }] })
  )
  assert.equal(payload.difficulty, "Hard")
})

test("selectAndGenerateChallenge honors an explicit difficulty request when declared", async () => {
  const { payload } = await selectAndGenerateChallenge(
    { userId: "u1", challengeType: "domain", role: "Data Analyst", difficulty: "Medium" },
    makeDeps()
  )
  assert.equal(payload.difficulty, "Medium")
})

test("selectAndGenerateChallenge stamps a workstationVersion for every payload", async () => {
  const { payload } = await selectAndGenerateChallenge(
    { userId: "u1", challengeType: "common" },
    makeDeps()
  )
  assert.equal(payload.workstationVersion, "v1")
})
