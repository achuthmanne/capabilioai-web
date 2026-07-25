/**
 * Tranche B — bulk-submit-for-review regression tests.
 *
 * The one non-negotiable this route must never violate: it can move
 * question_bank rows from 'draft' -> 'in_review' in bulk, but it must NEVER
 * be able to set review_status='approved' — that stays a strict, individual,
 * server-validated action (POST /:id/approve). This test drives the real
 * route with a fake supabaseAdmin and inspects exactly what update patch
 * gets sent, so a future edit that "helpfully" makes this bulk-approve can't
 * slip through unnoticed.
 */
import { test, before, after } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import jwt from "jsonwebtoken"
import express from "express"

const JWT_SECRET = "test-only-secret-not-real"
const ADMIN_ID = "33333333-3333-3333-3333-333333333333"
const NON_ADMIN_ID = "44444444-4444-4444-4444-444444444444"

function signToken(userId) {
  return jwt.sign({ sub: userId, email: `${userId}@test.local`, role: "authenticated" }, JWT_SECRET, {
    algorithm: "HS256", expiresIn: "1h",
  })
}

function makeFakeSupabase({ draftRows }) {
  const profiles = {
    [ADMIN_ID]: { id: ADMIN_ID, is_admin: true },
    [NON_ADMIN_ID]: { id: NON_ADMIN_ID, is_admin: false },
  }
  const updatePatches = []

  function chain(table) {
    const s = { table, filters: {} }
    const api = {
      select() { return api },
      eq(col, val) { s.filters[col] = val; return api },
      in(col, vals) { s.filters[col] = vals; return api },
      order() { return api },
      limit() { return api },
      insert() { return { select: () => ({ single: async () => ({ data: { id: "audit-row" }, error: null }) }) } },
      update(patch) {
        updatePatches.push({ table, patch })
        return {
          eq(col, val) {
            return {
              eq() { return Promise.resolve({ data: null, error: null }) },
              then(resolve) { return resolve({ data: null, error: null }) },
            }
          },
        }
      },
      async maybeSingle() {
        if (table === "profiles") return { data: profiles[s.filters.id] || null, error: null }
        return { data: null, error: null }
      },
      then(resolve) {
        if (table === "question_bank" && s.filters.review_status === "draft") {
          let rows = draftRows
          if (s.filters.domain) rows = rows.filter(r => r.domain === s.filters.domain)
          return resolve({ data: rows, error: null })
        }
        if (table === "question_bank_audit_log") return resolve({ data: [], error: null })
        return resolve({ data: [], error: null })
      },
    }
    return api
  }
  return { from: (t) => chain(t), _updatePatches: updatePatches }
}

let server, baseUrl, fakeDb

before(async () => {
  process.env.SUPABASE_JWT_SECRET = JWT_SECRET
  fakeDb = makeFakeSupabase({
    draftRows: [
      { id: "q1", review_status: "draft", domain: "sales" },
      { id: "q2", review_status: "draft", domain: "sales" },
      { id: "q3", review_status: "draft", domain: "marketing" },
    ],
  })
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = fakeDb

  const questionBankAdminRoutes = (await import("../questionBankAdmin.js")).default
  const app = express()
  app.use(express.json())
  app.use("/api/admin/question-bank", questionBankAdminRoutes)

  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
  await new Promise((resolve) => server.close(resolve))
})

test("non-admin is blocked (403) from bulk-submit-for-review", async () => {
  const res = await fetch(`${baseUrl}/api/admin/question-bank/bulk-submit-for-review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${signToken(NON_ADMIN_ID)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ domain: "sales" }),
  })
  assert.equal(res.status, 403)
})

test("requires either ids or domain — 400 with neither", async () => {
  const res = await fetch(`${baseUrl}/api/admin/question-bank/bulk-submit-for-review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${signToken(ADMIN_ID)}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
  assert.equal(res.status, 400)
})

test("scoped by domain: submits only that domain's drafts, and every update patch sets in_review — never approved", async () => {
  const res = await fetch(`${baseUrl}/api/admin/question-bank/bulk-submit-for-review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${signToken(ADMIN_ID)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ domain: "sales" }),
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.submitted, 2) // q1, q2 only — not q3 (marketing)

  const questionBankUpdates = fakeDb._updatePatches.filter(p => p.table === "question_bank")
  assert.ok(questionBankUpdates.length > 0, "sanity: at least one update happened")
  for (const { patch } of questionBankUpdates) {
    assert.equal(patch.review_status, "in_review")
    assert.notEqual(patch.review_status, "approved")
  }
})
