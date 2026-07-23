/**
 * e2e-verify-real-supabase.mjs
 * ---------------------------------------------------------------------------
 * Runs the ACTUAL, unmodified Arena V2 pipeline code — no fakes, no test
 * adapters — against your real Supabase project, using the dedicated test
 * user (arena.e2e@capabilio.test). This is the real-project counterpart to
 * backend/server/lib/arena-v2/__tests__/e2e/fullPipeline.e2e.test.js, which
 * proved the same code against a local disposable Postgres.
 *
 * WHY THIS RUNS ON YOUR MACHINE, NOT IN THE BUILD ENVIRONMENT: the sandbox
 * this pipeline was built and tested in has outbound network access to
 * *.supabase.co blocked by its own allowlist policy — confirmed directly
 * (curl to the real project returns 403 blocked-by-allowlist). Since
 * repository.js's real `supabaseAdmin` client talks over that exact blocked
 * path, this script has to run somewhere with real network access — your
 * machine, or CI.
 *
 * PREREQUISITES:
 *   - .env at repo root has SUPABASE_URL + SUPABASE_SERVICE_KEY set to the
 *     real capabilio project (already true if you've been running the app).
 *   - The dedicated test user already exists: arena.e2e@capabilio.test
 *     (id f5c8f809-9ef3-47e6-855b-7ae7d41f0d9a) — created via Supabase
 *     Dashboard, per the agreed plan.
 *   - Minimal content already seeded (role capability, skill graph, scenario
 *     pack, dataset, challenge template + version, domain grant) — already
 *     done via SQL against the real project; this script does not re-seed.
 *
 * RUN: node scripts/e2e-verify-real-supabase.mjs
 * (from the repo root, with real network access to Supabase)
 */
import dotenv from "dotenv"
dotenv.config({ path: "./.env" })

const TEST_USER_ID = "f5c8f809-9ef3-47e6-855b-7ae7d41f0d9a"

function assert(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); process.exitCode = 1; return false }
  console.log(`  ok — ${msg}`)
  return true
}

async function main() {
  const { getOrIssueChallenge } = await import("../backend/server/lib/arena-v2/challenge-delivery/service.js")
  const { submitChallenge } = await import("../backend/server/lib/arena-v2/submission-engine/service.js")
  const { supabaseAdmin } = await import("../backend/server/lib/supabase.js")

  console.log("\n1) ISSUANCE — getOrIssueChallenge (real deps, real project)")
  const issued = await getOrIssueChallenge({ userId: TEST_USER_ID, challengeType: "domain", role: "Data Analyst" })
  assert(issued.resumed === false, "first call issues a fresh instance, not a resume")
  assert(issued.instance.status === "issued", "instance status is 'issued'")
  assert(issued.instance.skill === "SQL", "instance skill is SQL")
  assert(issued.routing.componentKey === "SqlWorkstation", "routed to SqlWorkstation")
  assert(!!issued.instance.payload?.datasetSeedSql?.includes("CREATE TABLE orders"), "payload carries the real seed SQL")

  const { data: instanceRow } = await supabaseAdmin.from("av2_challenge_instances").select("*").eq("id", issued.instance.id).single()
  assert(instanceRow?.status === "issued", "instance row is real and persisted")

  console.log("\n2) SUBMISSION -> ASSESSMENT -> REWARD -> PORTFOLIO — a correct SQL submission")
  const dto = await submitChallenge({
    userId: TEST_USER_ID,
    instanceId: issued.instance.id,
    submissionData: { query: "SELECT SUM(amount) FROM orders;" },
  })
  assert(dto.passed === true, "submission passed")
  assert(dto.finalScore === 100, "final score is 100")
  assert(dto.rewards?.type === "elo", "domain challenge rewards as ELO, not XP")
  assert(dto.rewards?.elo?.after > dto.rewards?.elo?.before, "ELO increased")
  assert(dto.portfolio?.decisionType === "auto_publish", "100 >= minScoreToAutoPublish -> auto_publish")
  assert(dto.portfolio?.artifactCreated === true, "portfolio artifact was created")

  const { data: assessmentRows } = await supabaseAdmin.from("av2_assessments").select("*").eq("instance_id", issued.instance.id)
  assert(assessmentRows?.length === 1, "exactly one real assessment row")

  const { data: eloRows } = await supabaseAdmin.from("av2_elo_ledger").select("*").eq("user_id", TEST_USER_ID)
  assert(eloRows?.length >= 1, "at least one real ELO ledger row")

  const { data: artifactRows } = await supabaseAdmin.from("av2_portfolio_artifacts").select("*").eq("user_id", TEST_USER_ID)
  assert(artifactRows?.length >= 1, "at least one real portfolio artifact row")
  assert(artifactRows?.[0]?.publish_state === "auto_published", "artifact publish_state is auto_published")

  console.log("\n3) CASCADE-DELETE VERIFICATION SETUP")
  console.log("   Real rows now exist across av2_challenge_instances, av2_submissions,")
  console.log("   av2_assessments, av2_elo_ledger, av2_portfolio_artifacts, av2_skill_progress,")
  console.log("   av2_domain_challenge_grants, referral_codes — all keyed to user_id/instance_id")
  console.log("   chains rooted at profiles.id (which itself CASCADEs from auth.users.id).")
  console.log("\n   To verify the cascade behavior, delete the test auth user now via:")
  console.log("   Supabase Dashboard -> Authentication -> find arena.e2e@capabilio.test -> Delete user")
  console.log("   Then run: node scripts/e2e-verify-cascade-delete.mjs")
  console.log("   which confirms every av2_* row tied to this user is gone.")

  console.log(process.exitCode ? "\nSOME CHECKS FAILED — see FAIL lines above." : "\nALL CHECKS PASSED against the real Supabase project.")
}

main().catch((err) => {
  console.error("\nSCRIPT ERROR:", err)
  process.exitCode = 1
})
