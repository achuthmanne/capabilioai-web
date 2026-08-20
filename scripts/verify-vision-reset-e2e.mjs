#!/usr/bin/env node
/**
 * verify-vision-reset-e2e.mjs — production/staging verification pass for
 * the Vision Reset (2026-08-20) ticket-style mission format, NOT content
 * generation. For each of swe/backend/fullstack/dba/frontend, submits the
 * REAL reference_solution for one mission through the ACTUAL running HTTP
 * route (POST /api/arena/domain-role/missions/:id/submit) — never calls
 * executeMission/evaluateMission directly. Same dedicated test-user +
 * password-reset + real Supabase session JWT pattern as
 * verify-college-stream-e2e.mjs.
 *
 * Confirms, for each role: GET exposes starter_code/starter_query/html/
 * requirements/acceptance_criteria (and never expected_stdout/
 * expected_result), the reference solution scores 100/passed, AI feedback
 * is generated, a domain_submissions row + arena_history row exist, and
 * ELO moved.
 *
 * PREREQUISITE: the backend server must already be running.
 * RUN: VERIFY_BASE_URL=http://localhost:4000 node scripts/verify-vision-reset-e2e.mjs
 */
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { createClient } from "@supabase/supabase-js"
import WsWebSocket from "ws"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "..", ".env") })

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:4000"
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
  const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("id", userId).maybeSingle()
  if (!profile) throw new Error(`No profiles row for ${userId} after user creation`)

  const anonClient = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    realtime: { transport: typeof globalThis.WebSocket === "undefined" ? WsWebSocket : undefined },
  })
  const { data, error } = await anonClient.auth.signInWithPassword({ email: TEST_USER_EMAIL, password: TEMP_PASSWORD })
  if (error) throw new Error(`Sign-in failed: ${error.message}`)
  return { token: data.session.access_token, userId }
}

async function verifyRole(roleId, token, userId) {
  const result = { roleId, checks: {} }

  // Skip missions this test user already passed (locked, would 409) — pick
  // the first one that's still open rather than always index 0, so reruns
  // against an already-exercised test user still exercise a real, fresh
  // submission instead of just re-proving the lock works.
  const { data: candidateMissions, error: missionErr } = await supabaseAdmin
    .from("domain_missions")
    .select("id, title, panel_type, reference_solution, rubric")
    .eq("domain_role_id", roleId)
    .order("created_at")
  if (missionErr) throw missionErr
  const { data: passedRows } = await supabaseAdmin
    .from("domain_submissions").select("mission_id").eq("user_id", userId).eq("passed", true)
    .in("mission_id", (candidateMissions || []).map(m => m.id))
  const passedIds = new Set((passedRows || []).map(r => r.mission_id))
  const missionRow = (candidateMissions || []).find(m => !passedIds.has(m.id))
  if (!missionRow) { result.checks.missionExists = false; return result }
  result.checks.missionExists = true
  result.missionId = missionRow.id
  result.missionTitle = missionRow.title
  result.panelType = missionRow.panel_type

  log(`\n--- ${roleId} — mission "${missionRow.title}" (${missionRow.id}, ${missionRow.panel_type}) ---`)

  // 1) GET through the real route — confirm ticket context is exposed and
  // the grading answer never leaks.
  const getRes = await fetch(`${BASE_URL}/api/arena/domain-role/missions/${missionRow.id}`)
  const getBody = await getRes.json()
  const m = getBody.mission || {}
  result.checks.getLoads = getRes.status === 200 && m.id === missionRow.id
  result.checks.hasTicketContext = !!(m.requirements?.length && m.acceptance_criteria?.length)
  result.checks.hasStarterArtifact = !!(m.starter_code || m.starter_query)
  result.checks.answerNotLeaked = m.expected_stdout === undefined && m.expected_result === undefined
  log(`GET /missions/:id -> ${getRes.status} requirements=${m.requirements?.length ?? 0} acceptance=${m.acceptance_criteria?.length ?? 0} starter=${!!(m.starter_code || m.starter_query)} html=${!!m.html}`)

  const { data: profileBefore } = await supabaseAdmin.from("profiles").select("elo_rating").eq("id", userId).single()

  // 2) POST the real reference_solution through the real submit route.
  const submitRes = await fetch(`${BASE_URL}/api/arena/domain-role/missions/${missionRow.id}/submit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ code: missionRow.reference_solution }),
  })
  const submitBody = await submitRes.json()
  result.submitStatus = submitRes.status
  log(`POST /missions/:id/submit -> ${submitRes.status} passed=${submitBody.submission?.passed} score=${submitBody.submission?.score} elo_delta=${submitBody.submission?.elo_delta}`)
  log(`  ai_feedback: ${submitBody.submission?.ai_feedback ? submitBody.submission.ai_feedback.slice(0, 140) : "(none)"}`)

  result.checks.submitOk = submitRes.status === 200
  result.checks.passed = submitBody.submission?.passed === true
  result.checks.score100 = submitBody.submission?.score === 100
  result.checks.hasAiFeedback = !!submitBody.submission?.ai_feedback
  // checklist is null-by-design for stdout-match panel types (node_runner/
  // python_runner — see evaluateMission.js's evaluateStdoutMatch) — only
  // sql_runner/frontend_runner produce a real one. Not a defect either way.
  const CHECKLIST_PANEL_TYPES = new Set(["sql_runner", "frontend_runner"])
  result.checks.hasChecklist = CHECKLIST_PANEL_TYPES.has(missionRow.panel_type)
    ? Array.isArray(submitBody.submission?.checklist) && submitBody.submission.checklist.length > 0
    : true

  const { data: subRow } = await supabaseAdmin
    .from("domain_submissions").select("*").eq("id", submitBody.submission?.id).maybeSingle()
  result.checks.submissionStored = !!subRow && subRow.mission_id === missionRow.id && subRow.user_id === userId

  const { data: historyRow } = await supabaseAdmin
    .from("arena_history").select("*").eq("user_id", userId).eq("task_id", missionRow.id).maybeSingle()
  result.checks.historyStored = !!historyRow

  const { data: profileAfter } = await supabaseAdmin.from("profiles").select("elo_rating").eq("id", userId).single()
  result.eloBefore = profileBefore?.elo_rating
  result.eloAfter = profileAfter?.elo_rating
  result.checks.eloMoved = (profileAfter?.elo_rating ?? 0) !== (profileBefore?.elo_rating ?? 0)

  return result
}

async function main() {
  section("Vision Reset E2E Verification")
  log(`Base URL: ${BASE_URL}`)

  const { token, userId } = await getAccessToken()
  log(`Test user ready: ${TEST_USER_EMAIL} (${userId})`)

  const roles = String(process.env.TARGET_ROLES || "swe,backend,fullstack,dba,frontend").split(",").map(s => s.trim())
  const results = []
  for (const roleId of roles) {
    results.push(await verifyRole(roleId, token, userId))
  }

  section("SUMMARY")
  let allPassed = true
  for (const r of results) {
    const failedChecks = Object.entries(r.checks).filter(([, v]) => v === false).map(([k]) => k)
    const ok = r.checks.missionExists !== false && failedChecks.length === 0
    if (!ok) allPassed = false
    log(`${ok ? "✅" : "❌"} ${r.roleId}: ${r.checks.missionExists === false ? "NO MISSIONS FOUND" : failedChecks.length === 0 ? "all checks passed" : `FAILED: ${failedChecks.join(", ")}`}`)
  }
  log("\n" + (allPassed ? "ALL ROLES VERIFIED." : "SOME ROLES FAILED VERIFICATION — see above."))
  process.exit(allPassed ? 0 : 1)
}

main().catch(err => {
  console.error("[verify-vision-reset-e2e] FATAL:", err)
  process.exit(1)
})
