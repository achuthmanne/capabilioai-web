#!/usr/bin/env node
/**
 * verify-college-stream-e2e.mjs — production verification pass, NOT content
 * generation. Submits one real experiment's reference_solution for each of
 * Civil/EEE/ECE/MBA through the ACTUAL, running HTTP route
 * (POST /api/arena/college-stream/experiments/:id/submit) — never calls
 * pythonSandbox.js or evaluator.js directly. Uses the existing dedicated
 * e2e test user (arena.e2e@capabilio.test, see e2e-verify-real-supabase.mjs)
 * with its password reset via the admin API so a real Supabase session JWT
 * can be obtained and sent as a normal Bearer token, exactly like a browser
 * client would.
 *
 * PREREQUISITE: the backend server must already be running (this script
 * does not start it) — confirmed via `curl localhost:4000/...` before use.
 *
 * RUN: node scripts/verify-college-stream-e2e.mjs
 */
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { createClient } from "@supabase/supabase-js"
import WsWebSocket from "ws"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "..", ".env") })

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:4000"
// The dedicated test user from e2e-verify-real-supabase.mjs
// (arena.e2e@capabilio.test) was deleted per that script's own documented
// cleanup step (cascade-delete verification) — confirmed via "User not
// found" on this run. A fresh dedicated verification user is created here
// instead (findOrCreate — safe to re-run).
const TEST_USER_EMAIL = "collegestream.verify@capabilio.test"
const TEMP_PASSWORD = `Verify-${Date.now()}-Xk9!`

const { supabaseAdmin } = await import("../backend/server/lib/supabase.js")

function log(msg) { console.log(msg) }
function section(msg) { console.log(`\n${"=".repeat(70)}\n${msg}\n${"=".repeat(70)}`) }

async function getAccessToken() {
  let userId
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: TEST_USER_EMAIL, password: TEMP_PASSWORD, email_confirm: true,
  })
  if (createErr) {
    if (!/already.*registered|already exists/i.test(createErr.message)) throw new Error(`Failed to create test user: ${createErr.message}`)
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
    if (listErr) throw listErr
    const existing = list.users.find(u => u.email === TEST_USER_EMAIL)
    if (!existing) throw new Error(`createUser said "already exists" but couldn't find ${TEST_USER_EMAIL} via listUsers`)
    userId = existing.id
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: TEMP_PASSWORD })
    if (updateErr) throw new Error(`Failed to reset existing test user's password: ${updateErr.message}`)
  } else {
    userId = created.user.id
  }

  // Confirm the on_auth_user_created trigger produced a profiles row (FK
  // target for college_submissions/arena_history) — fail loudly if not,
  // rather than let every subsequent insert fail with an opaque FK error.
  const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("id", userId).maybeSingle()
  if (!profile) throw new Error(`No profiles row for ${userId} after user creation — on_auth_user_created trigger did not fire as expected`)

  const anonClient = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    realtime: { transport: typeof globalThis.WebSocket === "undefined" ? WsWebSocket : undefined },
  })
  const { data, error } = await anonClient.auth.signInWithPassword({ email: TEST_USER_EMAIL, password: TEMP_PASSWORD })
  if (error) throw new Error(`Sign-in failed: ${error.message}`)
  return { token: data.session.access_token, userId }
}

async function pickExperimentForStream(slug) {
  const { data: stream } = await supabaseAdmin.from("streams").select("id, name, slug").eq("slug", slug).single()
  const { data: semesters } = await supabaseAdmin.from("semesters").select("id").eq("stream_id", stream.id)
  const { data: links } = await supabaseAdmin.from("semester_subjects").select("subject_id").in("semester_id", semesters.map(s => s.id))
  const { data: units } = await supabaseAdmin.from("units").select("id, title").in("subject_id", links.map(l => l.subject_id))
  const { data: experiments } = await supabaseAdmin
    .from("experiments")
    .select("id, title, difficulty, prompt, rubric, reference_solution, elo_reward")
    .in("unit_id", units.map(u => u.id))
    .eq("difficulty", "easy")
    .order("created_at")
    .limit(1)
  if (!experiments?.length) throw new Error(`No "easy" experiment found for stream "${slug}"`)
  return { stream, experiment: experiments[0] }
}

async function verifyStream(slug, token, userId) {
  const result = { slug, checks: {} }
  const { stream, experiment } = await pickExperimentForStream(slug)
  result.experimentId = experiment.id
  result.experimentTitle = experiment.title

  log(`\n--- ${stream.name} (${slug}) — experiment "${experiment.title}" (${experiment.id}) ---`)

  // 1) GET the experiment through the real route (confirms it loads, and
  // that reference_solution/rubric never leak to the client).
  const getRes = await fetch(`${BASE_URL}/api/arena/college-stream/experiments/${experiment.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const getBody = await getRes.json()
  result.checks.experimentLoads = getRes.status === 200 && getBody.experiment?.id === experiment.id
  result.checks.isCodeChallenge = getBody.experiment?.isCodeChallenge === true
  result.checks.rubricNotLeaked = getBody.experiment?.rubric === undefined && getBody.experiment?.reference_solution === undefined
  log(`GET /experiments/:id -> ${getRes.status} isCodeChallenge=${getBody.experiment?.isCodeChallenge} rubricLeaked=${!result.checks.rubricNotLeaked}`)

  // Snapshot ELO before submit.
  const { data: profileBefore } = await supabaseAdmin.from("profiles").select("elo_rating").eq("id", userId).single()

  // 2) POST the real reference_solution as the "student" answer — through
  // the real route, never pythonSandbox.js directly.
  const submitRes = await fetch(`${BASE_URL}/api/arena/college-stream/experiments/${experiment.id}/submit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ answer: experiment.reference_solution }),
  })
  const submitBody = await submitRes.json()
  result.submitStatus = submitRes.status
  result.submitBody = submitBody
  log(`POST /experiments/:id/submit -> ${submitRes.status} ${JSON.stringify(submitBody)}`)

  result.checks.authWorked = submitRes.status !== 401
  result.checks.sandboxExecuted = submitRes.status === 200 && submitBody.submission?.execution_output !== undefined
  result.checks.stdoutMatched = submitBody.submission?.passed === true
  result.checks.rubricPassed = submitBody.submission?.score === 100

  // 3) Verify college_submissions row actually persisted.
  const { data: subRow } = await supabaseAdmin
    .from("college_submissions").select("*").eq("id", submitBody.submission?.id).maybeSingle()
  result.checks.submissionStored = !!subRow && subRow.experiment_id === experiment.id && subRow.user_id === userId
  log(`college_submissions row: ${subRow ? "found" : "MISSING"} (passed=${subRow?.passed}, score=${subRow?.score}, elo_delta=${subRow?.elo_delta})`)

  // 4) Verify ELO — either incremented by elo_delta, or correctly capped
  // (0 delta) if this isn't the day's first passing submission — both are
  // "correct," per the PRODUCT RULE documented in arenaCollegeStream.js.
  const { data: profileAfter } = await supabaseAdmin.from("profiles").select("elo_rating").eq("id", userId).single()
  const actualDelta = (profileAfter?.elo_rating ?? 0) - (profileBefore?.elo_rating ?? 0)
  result.eloBefore = profileBefore?.elo_rating
  result.eloAfter = profileAfter?.elo_rating
  result.eloCapped = submitBody.submission?.elo_capped
  result.checks.eloCorrect = subRow?.passed
    ? (subRow.elo_delta === 0 ? actualDelta === 0 : actualDelta === subRow.elo_delta)
    : true
  log(`ELO: ${result.eloBefore} -> ${result.eloAfter} (delta ${actualDelta}, submission.elo_delta=${subRow?.elo_delta}, capped=${result.eloCapped})`)

  // 5) Verify arena_history row.
  const { data: histRow } = await supabaseAdmin
    .from("arena_history").select("*").eq("user_id", userId).eq("task_id", experiment.id).eq("type", "academic")
    .order("completed_at", { ascending: false }).limit(1).maybeSingle()
  result.checks.activityHistoryUpdated = !!histRow
  log(`arena_history row: ${histRow ? "found" : "MISSING"}`)

  // 6) skill_graph — confirmed not applicable to this branch (College Stream
  // submit route has no write path into skill_graph; that table belongs to
  // Skill Studio only). Not a defect — just out of scope for this branch.
  result.checks.skillUpdateNotApplicable = true

  result.allPassed = Object.values(result.checks).every(Boolean)
  return result
}

async function main() {
  section("SETUP — obtaining a real session token for the e2e test user")
  const { token, userId } = await getAccessToken()
  log(`Got real Supabase session token for ${TEST_USER_EMAIL} (userId ${userId}, token ${token.slice(0, 20)}...)`)

  const streams = ["civil", "eee", "ece", "mba"]
  const results = []
  for (const slug of streams) {
    section(`VERIFYING: ${slug}`)
    const result = await verifyStream(slug, token, userId)
    results.push(result)
  }

  section("SUMMARY")
  for (const r of results) {
    log(`\n${r.slug.toUpperCase()} — ${r.experimentTitle} (${r.experimentId})`)
    log(`  overall: ${r.allPassed ? "PASS" : "FAIL"}`)
    for (const [check, ok] of Object.entries(r.checks)) {
      log(`  ${ok ? "✓" : "✗"} ${check}`)
    }
  }

  const anyFailed = results.some(r => !r.allPassed)
  console.log("\n" + JSON.stringify({ results }, null, 2))
  process.exitCode = anyFailed ? 1 : 0
}

main().catch(err => {
  console.error("FATAL:", err)
  process.exitCode = 1
})
