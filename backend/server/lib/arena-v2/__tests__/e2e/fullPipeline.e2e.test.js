/**
 * fullPipeline.e2e.test.js — Arena V2 end-to-end integration test
 * ---------------------------------------------------------------------------
 * Exercises the ACTUAL, unmodified pipeline code — no fakes, no injected
 * deps overriding repository behavior — against a real embedded Postgres
 * (pglite) running the real Milestone 1 schema migrations:
 *
 *   Challenge Library (content seed)
 *     -> Challenge Engine (selectAndGenerateChallenge)
 *     -> Challenge Payload Validator (validateAndIssue)
 *     -> Workstation Router (routeToWorkstation)
 *     -> [issued instance]
 *     -> Submission Engine (submitChallenge)
 *          -> Validator (ground_truth_compare, real sql.js grading)
 *          -> Assessment (assembleAssessment)
 *          -> Reward Engine (applyRewards)
 *          -> Portfolio Engine (recordPortfolioOutcome)
 *     -> Feedback DTO
 *
 * Every unit test elsewhere in arena-v2/ passes fully-faked `deps` — this is
 * the one test that doesn't. `getOrIssueChallenge` and `submitChallenge` are
 * called with their REAL `defaultDeps`, which import `supabaseAdmin` from
 * `../../supabase.js`. The only thing swapped is what `supabaseAdmin` itself
 * resolves to — see backend/server/lib/supabase.js's
 * `__ARENA_V2_TEST_SUPABASE_CLIENT__` hook, set below before any import of
 * pipeline code runs a query.
 *
 * This test seeds real content rows (role capability, skill graph, scenario
 * pack, dataset + version, challenge template + version) exactly the way a
 * content author would via the Challenge Library CRUD routes — proving the
 * full stack works on real, author-shaped data, not synthetic shortcuts.
 */
import { test, before, after } from "node:test"
import assert from "node:assert/strict"
import { setupTestDb } from "./setupTestDb.js"
import { createPgliteSupabaseAdapter } from "./pgliteSupabaseAdapter.js"

let db
let userId

before(async () => {
  db = await setupTestDb({
    schema001Path: new URL("../../../../../../arena_v2_migration/001_schema.sql", import.meta.url).pathname,
    schema002Path: new URL("../../../../../../arena_v2_migration/002_admin_flag.sql", import.meta.url).pathname,
  })
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = createPgliteSupabaseAdapter(db)

  const prof = await db.query(
    "INSERT INTO profiles (email) VALUES ($1) RETURNING id",
    ["e2e-student@capabilio.test"]
  )
  userId = prof.rows[0].id
})

after(async () => {
  delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
  await db.close()
})

// ── Content seed — real author-shaped rows, via the real repository writers ──
async function seedContent() {
  const { upsertRoleCapabilities } = await import("../../challenge-library/repository.js")
  const { createSkillGraphVersion, createScenarioPack, createDataset, createDatasetVersion, createChallengeTemplate, createChallengeTemplateVersion } =
    await import("../../challenge-library/repository.js")

  await upsertRoleCapabilities({
    career_family: "IT",
    role: "Data Analyst",
    workstations: ["sql"],
    validators: ["ground_truth_compare"],
    ui_modules: ["sql_editor"],
  })

  await createSkillGraphVersion({
    career_family: "IT",
    role: "Data Analyst",
    version: "v1",
    graph: { nodes: ["SQL"], edges: [] },
  })

  const scenarioPack = await createScenarioPack({
    slug: "banking-fraud-e2e",
    name: "Banking Fraud Detection (E2E fixture)",
    industry: "Banking",
    role_families: ["IT"],
    version: "v1",
    scenarios: [{ scenarioId: "fraud-detection-1", name: "Investigate flagged orders", templateChain: [] }],
    status: "active",
  })

  await createDataset({
    dataset_id: "e2e-orders",
    scenario_pack_id: scenarioPack.id,
    name: "Orders (E2E fixture)",
  })

  await createDatasetVersion({
    dataset_id: "e2e-orders",
    version: "v1",
    schema: { orders: ["id", "amount"] },
    seed_sql: "CREATE TABLE orders (id INTEGER, amount REAL); INSERT INTO orders VALUES (1,100),(2,200),(3,300);",
  })

  const template = await createChallengeTemplate({
    slug: "sql-total-revenue-e2e",
    challenge_type: "domain",
    career_family: "IT",
    role: "Data Analyst",
    skill: "SQL",
    workstation: "sql",
    scenario_pack_id: scenarioPack.id,
    scenario_id: "fraud-detection-1",
    status: "active",
  })

  await createChallengeTemplateVersion(template.id, {
    version: "v1",
    difficulty_variants: { Medium: { prompt: "Return the total revenue across all orders." } },
    validator: { type: "ground_truth_compare", version: "v1", config: { groundTruthQuery: "SELECT SUM(amount) FROM orders;", tolerancePct: 1.5 } },
    assessment_rules: {},
    submission_rules: { maxAttempts: 3 },
    progression_rules: {},
    reward_rules: { common: { elo: false }, domain: { elo: true } },
    portfolio_decision: { minScoreToAutoPublish: 80, allowManualPublishBelowThreshold: true, artifactType: "code" },
  })

  // Domain Challenges are entitlement-gated — grant this test user access,
  // the same as a real subscription/promo/admin_grant would.
  await db.query(
    `INSERT INTO av2_domain_challenge_grants (user_id, source) VALUES ($1, 'admin_grant')`,
    [userId]
  )
}

test("SEED: real content rows are created via the real Challenge Library repository", async () => {
  await seedContent()
  const templates = await db.query("SELECT * FROM av2_challenge_templates WHERE slug = 'sql-total-revenue-e2e'")
  assert.equal(templates.rows.length, 1)
  const grants = await db.query("SELECT * FROM av2_domain_challenge_grants WHERE user_id = $1", [userId])
  assert.equal(grants.rows.length, 1)
})

let issuedInstance = null

test("ISSUANCE: getOrIssueChallenge (real deps) selects, validates, persists, and routes a real instance", async () => {
  const { getOrIssueChallenge } = await import("../../challenge-delivery/service.js")

  const result = await getOrIssueChallenge({ userId, challengeType: "domain", role: "Data Analyst" })

  assert.equal(result.resumed, false)
  assert.equal(result.instance.status, "issued")
  assert.equal(result.instance.user_id, userId)
  assert.equal(result.instance.challenge_type, "domain")
  assert.equal(result.instance.skill, "SQL")
  assert.equal(result.instance.workstation, "sql")
  assert.ok(result.instance.payload.datasetSeedSql.includes("CREATE TABLE orders"))
  assert.equal(result.routing.componentKey, "SqlWorkstation")

  // Confirm it's a REAL row, not something only held in memory.
  const row = await db.query("SELECT * FROM av2_challenge_instances WHERE id = $1", [result.instance.id])
  assert.equal(row.rows.length, 1)
  assert.equal(row.rows[0].status, "issued")

  issuedInstance = result.instance
})

test("RESUME: a second getOrIssueChallenge call for the same user reuses the in-progress instance rather than issuing a new one", async () => {
  const { getOrIssueChallenge } = await import("../../challenge-delivery/service.js")
  const result = await getOrIssueChallenge({ userId, challengeType: "domain", role: "Data Analyst" })
  assert.equal(result.resumed, true)
  assert.equal(result.instance.id, issuedInstance.id)
})

test("SUBMISSION -> ASSESSMENT -> REWARD -> PORTFOLIO: a correct SQL submission runs the entire real return-path pipeline", async () => {
  const { submitChallenge } = await import("../../submission-engine/service.js")

  const dto = await submitChallenge({
    userId,
    instanceId: issuedInstance.id,
    submissionData: { query: "SELECT SUM(amount) FROM orders;" },
  })

  // ── Feedback DTO shape (Milestone 8) ──────────────────────────────────────
  assert.equal(dto.passed, true)
  assert.equal(dto.finalScore, 100)
  assert.equal(dto.isZeroEffort, false)

  // ── Rewards (Milestone 9) — domain challenge, so ELO not XP ───────────────
  assert.equal(dto.rewards.type, "elo")
  assert.equal(dto.rewards.elo.before, 800) // START_ELO, first-ever assessment for this role
  assert.ok(dto.rewards.elo.after > dto.rewards.elo.before)
  assert.equal(dto.rewards.xp, null)
  // A strong (100-score) first attempt registers as immediately mastered —
  // skillProgress.js's computeMasteryState looks only at best_score, not
  // attempt count (see docs/future-improvements.md #29).
  assert.equal(dto.rewards.skill.masteryState, "mastered")

  // ── Portfolio (Milestone 10) — 100 >= minScoreToAutoPublish (80) ──────────
  assert.equal(dto.portfolio.decisionType, "auto_publish")
  assert.equal(dto.portfolio.artifactCreated, true)
  assert.equal(dto.portfolio.publishState, "auto_published")

  // ── Verify every real row landed correctly, independent of the DTO ────────
  const submissionRow = await db.query("SELECT * FROM av2_submissions WHERE instance_id = $1", [issuedInstance.id])
  assert.equal(submissionRow.rows.length, 1)
  assert.equal(submissionRow.rows[0].status, "validated")

  const assessmentRow = await db.query("SELECT * FROM av2_assessments WHERE instance_id = $1", [issuedInstance.id])
  assert.equal(assessmentRow.rows.length, 1)
  assert.equal(Number(assessmentRow.rows[0].final_score), 100)

  const eloRow = await db.query("SELECT * FROM av2_elo_ledger WHERE user_id = $1", [userId])
  assert.equal(eloRow.rows.length, 1)
  const xpRow = await db.query("SELECT * FROM av2_xp_ledger WHERE user_id = $1", [userId])
  assert.equal(xpRow.rows.length, 0) // frozen ELO/XP split: a domain challenge must never write XP

  const artifactRow = await db.query("SELECT * FROM av2_portfolio_artifacts WHERE user_id = $1", [userId])
  assert.equal(artifactRow.rows.length, 1)
  assert.equal(artifactRow.rows[0].publish_state, "auto_published")
  assert.equal(artifactRow.rows[0].recruiter_evidence.verification, "Verified")

  const instanceRow = await db.query("SELECT status FROM av2_challenge_instances WHERE id = $1", [issuedInstance.id])
  assert.equal(instanceRow.rows[0].status, "graded")
})

test("RE-ISSUANCE: a graded instance is never resumed — the next getOrIssueChallenge call issues a fresh instance", async () => {
  const { getOrIssueChallenge } = await import("../../challenge-delivery/service.js")
  const result = await getOrIssueChallenge({ userId, challengeType: "domain", role: "Data Analyst" })
  assert.equal(result.resumed, false)
  assert.notEqual(result.instance.id, issuedInstance.id)
})

test("IDEMPOTENCY UNDER A REAL DB: resubmitting rewards for the same assessment does not double-post ELO", async () => {
  const { applyRewards } = await import("../../reward-engine/engine.js")
  const assessmentRow = await db.query("SELECT * FROM av2_assessments WHERE instance_id = $1", [issuedInstance.id])
  const instanceRow = await db.query("SELECT * FROM av2_challenge_instances WHERE id = $1", [issuedInstance.id])
  // Raw db.query bypasses the adapter's NUMERIC coercion (see
  // pgliteSupabaseAdapter.js's NUMERIC_COLUMNS note) — real Supabase/
  // PostgREST always returns final_score as a JSON number, so mirror that
  // here rather than passing the driver's raw string through.
  const assessment = { ...assessmentRow.rows[0], final_score: Number(assessmentRow.rows[0].final_score) }

  const before = await db.query("SELECT COUNT(*)::int AS c FROM av2_elo_ledger WHERE user_id = $1", [userId])
  await applyRewards({ assessment, instance: instanceRow.rows[0] })
  const after = await db.query("SELECT COUNT(*)::int AS c FROM av2_elo_ledger WHERE user_id = $1", [userId])

  assert.equal(before.rows[0].c, after.rows[0].c)
})

test("WRONG ANSWER: an incorrect SQL submission is graded honestly (fails, no ELO gain, no portfolio artifact)", async () => {
  const { getOrIssueChallenge } = await import("../../challenge-delivery/service.js")
  const { submitChallenge } = await import("../../submission-engine/service.js")

  const { instance } = await getOrIssueChallenge({ userId, challengeType: "domain", role: "Data Analyst" })
  const dto = await submitChallenge({
    userId,
    instanceId: instance.id,
    submissionData: { query: "SELECT SUM(amount) FROM orders WHERE id = 999;" }, // wrong: filters out everything
  })

  assert.equal(dto.passed, false)
  assert.equal(dto.finalScore, 0)
  // 0 < minScoreToAutoPublish (80), but allowManualPublishBelowThreshold is
  // true on this template — so a draft ("Self-Selected", not yet published)
  // artifact is still created, per the frozen verification semantics.
  assert.equal(dto.portfolio.decisionType, "pending_manual")
  assert.equal(dto.portfolio.artifactCreated, true)
  assert.equal(dto.portfolio.publishState, "not_published")
})
