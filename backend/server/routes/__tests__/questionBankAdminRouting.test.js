/**
 * questionBankAdminRouting.test.js — regression test for the 2026-07-24
 * path-prefix-shadowing hotfix.
 * ---------------------------------------------------------------------------
 * Root cause (see routes/questionBankAdmin.js header + server.js mount
 * comment for the full writeup): questionBankAdmin.js's router-level
 * `router.use(requireAuth, requireAdmin)` has no path argument, so Express
 * treats it as match-all for every request handed to that router. The
 * router used to be mounted at bare "/api" in server.js, which meant Express
 * handed it EVERY request under /api — not just ones actually destined for
 * an /admin/question-bank route — so any unrelated route mounted after it
 * (forge, aiInterview, recruiterComms, pulseNexus, orbitPlans,
 * hardwareChallenges, mentor marketplace, etc.) got its requests
 * intercepted by this admin gate first. A logged-in non-admin user hitting
 * e.g. POST /api/jobs got wrongly 403'd.
 *
 * Fix: questionBankAdmin.js's internal routes were made relative ("/",
 * "/coverage", "/:id", ...) and it is now mounted at the dedicated
 * "/api/admin/question-bank" namespace in server.js instead of bare "/api".
 * External URLs are unchanged. Because the router is now mounted at a path
 * more specific than "/api", Express only ever routes requests into it that
 * already start with /api/admin/question-bank — the match-all admin gate
 * can no longer see, let alone intercept, requests for other routes,
 * regardless of mount order.
 *
 * This test builds a real Express app importing the ACTUAL, unmodified
 * route modules (questionBankAdmin.js, recruiterComms.js,
 * mentorMarketplace.js) and mounts them the same way server.js does after
 * the fix, then drives it with real HTTP requests (Node's built-in fetch
 * against an ephemeral-port http server — supertest is not a project
 * dependency, and this avoids adding one for a single test file).
 *
 * Auth is exercised for real too: requireAuth's fast path
 * (backend/server/lib/auth.js) verifies a locally-signed HS256 JWT via
 * SUPABASE_JWT_SECRET, so this test sets that env var and signs real tokens
 * with `jsonwebtoken` — no network call, no mocking of requireAuth itself.
 * requireAdmin (backend/server/lib/arena-v2/requireAdmin.js) reads
 * `profiles.is_admin` via supabaseAdmin — for that one lookup this test uses
 * the existing, already-established `__ARENA_V2_TEST_SUPABASE_CLIENT__` test
 * hook (backend/server/lib/supabase.js) with a tiny in-memory fake, the same
 * mechanism the arena-v2 e2e suite uses to swap in a real Postgres — here
 * swapped for a plain in-memory map since these tests only need a single
 * `profiles.is_admin` lookup, not full relational behavior.
 */
import { test, before, after } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import jwt from "jsonwebtoken"
import express from "express"

const JWT_SECRET = "test-only-secret-not-real"
const ADMIN_ID = "11111111-1111-1111-1111-111111111111"
const NON_ADMIN_ID = "22222222-2222-2222-2222-222222222222"

function signToken(userId) {
  return jwt.sign({ sub: userId, email: `${userId}@test.local`, role: "authenticated" }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
  })
}

// Minimal fake supabaseAdmin, installed via the existing test-only hook in
// backend/server/lib/supabase.js. Only implements what the routes under
// test actually call: profiles.is_admin lookup (requireAdmin) and enough of
// the question_bank / jobs chains to let the handlers return a response
// instead of throwing.
function makeFakeSupabase() {
  const profiles = {
    [ADMIN_ID]: { id: ADMIN_ID, is_admin: true },
    [NON_ADMIN_ID]: { id: NON_ADMIN_ID, is_admin: false },
  }

  function chain(table) {
    const state = { table, filters: {} }
    const api = {
      select() { return api },
      insert(payload) { state.insertPayload = payload; return api },
      eq(col, val) { state.filters[col] = val; return api },
      order() { return api },
      range() { return api },
      contains() { return api },
      limit() { return api },
      async maybeSingle() {
        if (table === "profiles") {
          const row = profiles[state.filters.id] || null
          return { data: row, error: null }
        }
        return { data: null, error: null }
      },
      async single() {
        if (table === "question_bank") {
          return { data: { id: "q1", review_status: "draft" }, error: null }
        }
        return { data: null, error: null }
      },
      then(resolve) {
        if (table === "question_bank" && state.insertPayload) {
          return resolve({ data: { id: "new-q", ...state.insertPayload }, error: null, count: 1 })
        }
        return resolve({ data: [], error: null, count: 0 })
      },
    }
    return api
  }

  return { from: (table) => chain(table) }
}

let server
let baseUrl

before(async () => {
  process.env.SUPABASE_JWT_SECRET = JWT_SECRET
  // Mentor marketplace routes 403 unconditionally unless this flag is set —
  // scoped to this test process only, never touching the committed default
  // (which stays "false" in both frontend and backend).
  process.env.MENTOR_MARKETPLACE_V1 = "true"
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase()

  const questionBankAdminRoutes = (await import("../questionBankAdmin.js")).default
  const recruiterCommsRoutes = (await import("../recruiterComms.js")).default
  const mentorMarketplaceRoutes = (await import("../mentorMarketplace.js")).default

  const app = express()
  app.use(express.json())

  // Mirrors backend/server.js's mount order after the 2026-07-24 fix.
  app.use("/api/admin/question-bank", questionBankAdminRoutes)
  app.use("/api", recruiterCommsRoutes)
  app.use("/api/pro/v1/mentor", mentorMarketplaceRoutes)

  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
  delete process.env.MENTOR_MARKETPLACE_V1
  await new Promise((resolve) => server.close(resolve))
})

test("non-admin authenticated user is NOT shadowed by questionBankAdmin's gate on an unrelated route (POST /api/jobs)", async () => {
  const res = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${signToken(NON_ADMIN_ID)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: "Test Job", company: "Acme" }),
  })
  // Old bug: this would have 403'd with "Admin access required" because
  // questionBankAdmin's match-all requireAdmin gate ran first. Fixed: the
  // request never reaches questionBankAdmin.js at all, so it succeeds
  // (or fails for reasons intrinsic to the route itself, never 403).
  assert.notEqual(res.status, 403)
  const body = await res.json()
  assert.equal(body.success, true)
})

test("unauthenticated user still gets 401 on a route that requires auth (POST /api/jobs) — unchanged by the fix", async () => {
  const res = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Test Job", company: "Acme" }),
  })
  assert.equal(res.status, 401)
})

test("admin user can still reach question-bank admin routes under the new /api/admin/question-bank path", async () => {
  const res = await fetch(`${baseUrl}/api/admin/question-bank`, {
    headers: { Authorization: `Bearer ${signToken(ADMIN_ID)}` },
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.ok("questions" in body)
})

test("non-admin authenticated user is correctly blocked (403) from the admin question-bank routes themselves", async () => {
  const res = await fetch(`${baseUrl}/api/admin/question-bank`, {
    headers: { Authorization: `Bearer ${signToken(NON_ADMIN_ID)}` },
  })
  assert.equal(res.status, 403)
})

test("unauthenticated request to the old bare-/api mount path no longer resolves to questionBankAdmin (no route there anymore)", async () => {
  // Before the fix, "/api/admin/question-bank" only worked because the
  // router was mounted at bare "/api" and its internal path carried the
  // "/admin/question-bank" prefix. Confirm the OLD internal path shape
  // (doubled prefix) is gone — i.e. the router's routes are relative now,
  // not that any URL changed for real clients.
  const res = await fetch(`${baseUrl}/api/admin/question-bank/admin/question-bank`, {
    headers: { Authorization: `Bearer ${signToken(ADMIN_ID)}` },
  })
  assert.equal(res.status, 404)
})

test("mentor marketplace user-facing routes (/api/pro/v1/mentor/*) are not intercepted by questionBankAdmin's gate", async () => {
  const res = await fetch(`${baseUrl}/api/pro/v1/mentor/mentors`, {
    headers: { Authorization: `Bearer ${signToken(NON_ADMIN_ID)}` },
  })
  // Reaches mentorMarketplace.js's own requireAuth (passes, any authed user)
  // rather than questionBankAdmin's requireAdmin (would have been 403).
  assert.notEqual(res.status, 403)
})
