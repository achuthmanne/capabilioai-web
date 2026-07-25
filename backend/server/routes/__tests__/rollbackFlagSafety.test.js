/**
 * rollbackFlagSafety.test.js — CAREER OS TRANCHE 10 (Rollback Rehearsal Support)
 * ---------------------------------------------------------------------------
 * Every Career OS surface built in this engagement ships behind a flag
 * specifically so it can be turned off instantly if it regresses something
 * live (see frontend/src/config/featureFlags.js header). That claim was
 * never actually verified end-to-end for the backend side — this test is
 * the rehearsal: it imports the REAL, unmodified route modules with their
 * gating env vars unset (the default/off state), drives them with real HTTP
 * requests, and asserts the gate actually holds. If any of these ever
 * regress to fail-open, this test catches it before a rollback is needed
 * for real.
 *
 * Deliberately does NOT test flag-ON behavior (that's each feature's own
 * test suite) — this file's only job is proving "flip it off, and the
 * surface is truly inert" for every flag-gated backend router in the repo.
 *
 * Env vars are read once at module-import time by each route file (e.g.
 * `export const COMPANY_MODULE_V1_ENABLED = process.env.COMPANY_MODULE_V1_ENABLED === "true"`),
 * so this test asserts the OFF state simply by never setting those env vars
 * before importing — the same as a real prod deploy with the flag untouched.
 */
import { test, describe, before, after } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import express from "express"

let server
let baseUrl

before(async () => {
  // Explicitly unset — belt-and-suspenders in case a prior test file in the
  // same run left one of these set (none currently do, but this guards
  // against that class of test-order flakiness).
  delete process.env.COMPANY_MODULE_V1_ENABLED
  delete process.env.MENTOR_MARKETPLACE_V1
  delete process.env.VITE_FF_MENTOR_MARKETPLACE_V1
  delete process.env.CAREER_OS_SKILL_PULSE_V2
  delete process.env.VITE_FF_CAREER_OS_SKILL_PULSE_V2

  const companyRoutes                 = (await import("../company.js")).default
  const mentorMarketplaceRoutes       = (await import("../mentorMarketplace.js")).default
  const mentorMarketplaceAdminRoutes  = (await import("../mentorMarketplaceAdmin.js")).default
  const mentorMarketplaceWebhookRoutes = (await import("../mentorMarketplaceWebhook.js")).default

  const app = express()
  // Mirrors server.js's exact mount order/scoping: the webhook path gets
  // express.raw() BEFORE the global express.json(), scoped to only that
  // path, so this test's body-parsing setup matches production.
  app.use("/api/pro/v1/mentor/webhook/razorpay", express.raw({ type: "application/json" }))
  app.use("/api", mentorMarketplaceWebhookRoutes)
  app.use(express.json())
  app.use("/api/pro/v1/company", companyRoutes)
  app.use("/api/pro/v1/mentor", mentorMarketplaceRoutes)
  app.use("/api", mentorMarketplaceAdminRoutes)

  server = http.createServer(app)
  await new Promise(resolve => server.listen(0, resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise(resolve => server.close(resolve))
})

describe("rollback rehearsal — flag OFF (default/prod state) truly disables each gated surface", () => {
  test("company.js: every route 404s with no auth required to reach the gate", async () => {
    const res = await fetch(`${baseUrl}/api/pro/v1/company/me`)
    assert.equal(res.status, 404)
    const body = await res.json()
    assert.equal(body.error, "not_found")
  })

  test("company.js: gate applies even to a request that WOULD be valid if the flag were on", async () => {
    const res = await fetch(`${baseUrl}/api/pro/v1/company/search?q=acme`)
    assert.equal(res.status, 404)
  })

  test("mentorMarketplace.js: every route 403s with no auth required to reach the gate", async () => {
    const res = await fetch(`${baseUrl}/api/pro/v1/mentor/me/bookings`)
    assert.equal(res.status, 403)
    const body = await res.json()
    assert.equal(body.error, "mentor_marketplace_v1 is disabled")
  })

  test("mentorMarketplaceAdmin.js: admin routes ALSO 403 (flag gate runs before requireAdmin)", async () => {
    const res = await fetch(`${baseUrl}/api/admin/mentor/reconciliation/run`, { method: "POST" })
    assert.equal(res.status, 403)
  })

  test("mentorMarketplaceWebhook.js: Razorpay webhook 404s (empty body) rather than attempting signature verification", async () => {
    const res = await fetch(`${baseUrl}/api/pro/v1/mentor/webhook/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "payment.captured" }),
    })
    assert.equal(res.status, 404)
  })
})

describe("rollback rehearsal — Weekly Skill Pulse V2 fails SAFE (silent fallback, not an error) when its flag is off", () => {
  test("decideFlowVersion returns v1 with reason 'flag_off', never touching the coverage-gate logic", async () => {
    const { decideFlowVersion } = await import("../../lib/skillPulseV2/questionBankGate.js")
    const decision = decideFlowVersion({
      v2FlagEnabled: false,
      // Deliberately pass data that WOULD pass every coverage gate if it were
      // ever checked — proves the flag is the first, non-bypassable check.
      approvedCountsByDomain: { software_engineering: 999 },
      relevantDomains: ["software_engineering"],
    })
    assert.equal(decision.flow_version, "v1")
    assert.equal(decision.reason, "flag_off")
    // No globalGate/userGate keys — confirms the function short-circuited
    // before even looking at coverage, i.e. rollback via this flag can never
    // be second-guessed by stale/good-looking coverage data.
    assert.equal(decision.globalGate, undefined)
  })
})
