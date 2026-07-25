/**
 * opsDashboardRouting.test.js — CAREER OS TRANCHE 11.
 *
 * Two things this proves with a real Express app + fake supabaseAdmin (same
 * pattern as questionBankAdminRouting.test.js):
 *   1. GET /api/admin/ops/dashboard requires auth + admin, same as every
 *      other internal admin route in this codebase.
 *   2. Mounting opsDashboardRoutes at the specific "/api/admin/ops"
 *      namespace (not the broader "/api/admin" or bare "/api") means it
 *      does NOT shadow mentorMarketplaceAdmin.js's "/admin/mentor/..."
 *      routes — regression-proofing the exact routing-shadow bug class
 *      already fixed once for questionBankAdmin.js (see that file's header
 *      for the original incident).
 */
import { test, before, after } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import jwt from "jsonwebtoken"
import express from "express"

const JWT_SECRET = "test-only-secret-not-real"
const ADMIN_ID = "55555555-5555-5555-5555-555555555555"
const NON_ADMIN_ID = "66666666-6666-6666-6666-666666666666"

function signToken(userId) {
  return jwt.sign({ sub: userId, email: `${userId}@test.local`, role: "authenticated" }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
  })
}

function makeFakeSupabase() {
  const profiles = {
    [ADMIN_ID]: { id: ADMIN_ID, is_admin: true },
    [NON_ADMIN_ID]: { id: NON_ADMIN_ID, is_admin: false },
  }
  function chain(table) {
    const state = { table, filters: {} }
    const api = {
      select() { return api },
      eq(col, val) { state.filters[col] = val; return api },
      gte() { return api },
      order() { return api },
      async maybeSingle() {
        if (table === "profiles") return { data: profiles[state.filters.id] || null, error: null }
        return { data: null, error: null }
      },
      then(resolve) {
        // Every other table read (weekly_pulses, mentor_bookings, mentor_payouts,
        // mentor_payment_webhook_events, profiles-for-consent) just needs to
        // resolve to an empty, error-free result for this routing test — the
        // dashboard's actual aggregation math is covered by opsMetrics.test.js.
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
  process.env.MENTOR_MARKETPLACE_V1 = "true" // so mentorMarketplaceAdmin's own flag gate doesn't mask the routing assertion
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase()

  const opsDashboardRoutes = (await import("../opsDashboard.js")).default
  const mentorMarketplaceAdminRoutes = (await import("../mentorMarketplaceAdmin.js")).default

  const app = express()
  app.use(express.json())
  // Mirrors backend/server.js's actual mount order/paths.
  app.use("/api/admin/ops", opsDashboardRoutes)
  app.use("/api", mentorMarketplaceAdminRoutes)

  server = http.createServer(app)
  await new Promise(resolve => server.listen(0, resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
  delete process.env.MENTOR_MARKETPLACE_V1
  await new Promise(resolve => server.close(resolve))
})

test("GET /api/admin/ops/dashboard with no auth is rejected (not a public endpoint)", async () => {
  const res = await fetch(`${baseUrl}/api/admin/ops/dashboard`)
  assert.equal(res.ok, false)
  assert.ok([401, 403].includes(res.status))
})

test("GET /api/admin/ops/dashboard with a non-admin token is rejected", async () => {
  const res = await fetch(`${baseUrl}/api/admin/ops/dashboard`, {
    headers: { Authorization: `Bearer ${signToken(NON_ADMIN_ID)}` },
  })
  assert.equal(res.status, 403)
})

test("GET /api/admin/ops/dashboard with an admin token succeeds and returns the expected shape", async () => {
  const res = await fetch(`${baseUrl}/api/admin/ops/dashboard`, {
    headers: { Authorization: `Bearer ${signToken(ADMIN_ID)}` },
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.ok("apiMetrics" in body)
  assert.ok("skillPulse" in body)
  assert.ok("mentorFunnel" in body)
  assert.ok("payoutHealth" in body)
  assert.ok("moderationQueue" in body)
  assert.ok("webhookHealth" in body)
  assert.ok("consentToggles" in body)
  assert.ok("rlsSignal" in body)
})

test("ROUTING SHADOW REGRESSION: mentorMarketplaceAdmin's /api/admin/mentor/... routes are handled by mentorMarketplaceAdmin.js itself, not intercepted by the ops-dashboard router", async () => {
  // Distinguishing signal: mentorMarketplaceAdmin.js's GET /admin/mentor/applications
  // handler returns `{ applications: [...] }` — a shape only that file's code
  // produces. If opsDashboardRoutes were ever mounted at the broader
  // "/api/admin" instead of the specific "/api/admin/ops", this request
  // would be swallowed by opsDashboard's router before ever reaching
  // mentorMarketplaceAdmin.js, and this response shape would be opsDashboard's
  // `{ apiMetrics, skillPulse, ... }` instead.
  const res = await fetch(`${baseUrl}/api/admin/mentor/applications`, {
    headers: { Authorization: `Bearer ${signToken(ADMIN_ID)}` },
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.ok("applications" in body, "response must be mentorMarketplaceAdmin.js's own shape")
  assert.ok(!("apiMetrics" in body), "response must NOT be opsDashboard's shape — that would mean the request was shadowed")
})
