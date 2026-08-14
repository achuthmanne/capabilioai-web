/**
 * engine.test.js — Milestone 3
 * Fully dependency-injected: no Supabase, no network, no live DB. Every test
 * supplies a fake `deps` object built from plain in-memory fixtures.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { selectAndGenerateChallenge, NoEligibleContentError, ChallengeEngineError } from "./engine.js"

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
    grantTrialDomainAccess: async () => {},
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

// CHANGED 2026-08-14 (product decision, see engine.js's entitlement-gate
// comment): a domain request with no active grant used to reject with
// EntitlementError outright. Since no self-serve way for a real user to
// ever get a grant existed, that meant every V1 domain moving onto V2 by
// default (V1 never gated this at all) permanently locked every real user
// out. Now it auto-provisions a 'trial' grant instead of rejecting — this
// test asserts THAT behavior: the request succeeds, and
// grantTrialDomainAccess was actually called. EntitlementError itself
// still exists and is still exported/tested-for-throwability elsewhere in
// this file isn't required here anymore, but the class stays intact for a
// real future payment-gated path to reuse.
test("selectAndGenerateChallenge auto-provisions a trial grant for a domain request with no active grant, rather than rejecting", async () => {
  let grantCalledFor = null
  const { payload } = await selectAndGenerateChallenge(
    { userId: "u1", challengeType: "domain", role: "Data Analyst" },
    makeDeps({
      hasActiveDomainGrant: async () => false,
      grantTrialDomainAccess: async (userId) => { grantCalledFor = userId },
    })
  )
  assert.equal(grantCalledFor, "u1")
  assert.ok(payload)
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

// ── AI-generated scenario overlay (additive, deps.generateAiScenario) ──────

test("selectAndGenerateChallenge overlays AI-generated content onto a real template's difficulty_variants when generation succeeds", async () => {
  const aiContent = { prompt: "A freshly generated mission.", ticket: { id: "GEN-1" } }
  const aiRubric = [{ key: "correctness", label: "Correctness", weight: 1 }]
  const { payload, meta } = await selectAndGenerateChallenge(
    { userId: "u1", challengeType: "domain", role: "Data Analyst", difficulty: "Medium" },
    makeDeps({ generateAiScenario: async () => ({ content: aiContent, rubric: aiRubric }) })
  )
  assert.equal(meta.aiGenerated, true)
  assert.deepEqual(payload.payload.prompt, "A freshly generated mission.")
  assert.deepEqual(payload.payload.ticket, { id: "GEN-1" })
  assert.deepEqual(payload.validator.config.rubric, aiRubric)
  // The real template's id/version are still what's used for FK purposes —
  // generation never invents a template, only overlays content onto a real one.
  assert.equal(payload.challengeTemplateId, domainTemplate.id)
  assert.equal(payload.challengeTemplateVersion, domainTemplateVersion.version)
})

test("selectAndGenerateChallenge falls back to the real static difficulty_variant content when AI generation returns null", async () => {
  const { payload, meta } = await selectAndGenerateChallenge(
    { userId: "u1", challengeType: "domain", role: "Data Analyst", difficulty: "Medium" },
    makeDeps({ generateAiScenario: async () => null })
  )
  assert.equal(meta.aiGenerated, false)
  // Medium's static difficulty_variant in this fixture is {} (empty object,
  // per domainTemplateVersion above) — confirms the untouched static path ran.
  assert.deepEqual(payload.payload.prompt, undefined)
  assert.equal(payload.challengeTemplateId, domainTemplate.id)
})

test("selectAndGenerateChallenge never calls generateAiScenario for Common Challenges (no role context)", async () => {
  let called = false
  await selectAndGenerateChallenge(
    { userId: "u1", challengeType: "common" },
    makeDeps({ generateAiScenario: async () => { called = true; return null } })
  )
  assert.equal(called, false)
})

test("selectAndGenerateChallenge behaves exactly as before when deps has no generateAiScenario key at all", async () => {
  // makeDeps() (no override) omits generateAiScenario entirely — the exact
  // shape every pre-existing test in this file already uses — confirming
  // the new branch is a true no-op for callers that don't opt in.
  const { payload, meta } = await selectAndGenerateChallenge(
    { userId: "u1", challengeType: "domain", role: "Data Analyst" },
    makeDeps()
  )
  assert.equal(meta.aiGenerated, false)
  assert.equal(payload.challengeTemplateId, domainTemplate.id)
})
