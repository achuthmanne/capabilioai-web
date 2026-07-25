/**
 * portfolioPublic.test.js — regression test for CAREER OS TRANCHE 6 /
 * PRIORITY 6A privacy fix.
 * ---------------------------------------------------------------------------
 * Root cause this replaces (see routes/portfolioPublic.js header for the
 * full writeup): Portfolio.jsx used to run `supabase.from("profiles")
 * .select("*")` directly from the browser. Because the `profiles` RLS SELECT
 * policy is row-level only, that leaked every column — including `email`
 * and `uan_number` (a government ID) — to any authenticated viewer of any
 * verified profile.
 *
 * This test builds a real Express app around the actual, unmodified
 * portfolioPublic.js route module (same "real app, fake DB" pattern as
 * questionBankAdminRouting.test.js), and asserts three things that were
 * never true before this fix:
 *   1. A non-owner viewer never receives `email` or `uan_number` in the
 *      response body, even though the fake DB row has both set.
 *   2. An unverified profile is not readable by a non-owner (404) but IS
 *      readable by its own owner (verified-gate correctly bypassed for self).
 *   3. `cert_visible: false` hides certificates from non-owners but not from
 *      the owner.
 */
import { test, before, after } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import express from "express"

const OWNER_ID    = "33333333-3333-3333-3333-333333333333"
const OTHER_ID    = "44444444-4444-4444-4444-444444444444"
const OWNER_TOKEN = "fake-owner-token"
const OTHER_TOKEN = "fake-other-token"

function makeFakeSupabase() {
  const profiles = {
    [OWNER_ID]: {
      id: OWNER_ID,
      username: "verified-user",
      display_name: "Verified User",
      verified: true,
      email: "verified-user@real-address.example",   // must NEVER appear in a response
      uan_number: "123456789012",                     // must NEVER appear in a response
      certificates: ["AWS Certified"],
      cert_visible: false, // even so, owner should still see their own certs
    },
    [OTHER_ID]: {
      id: OTHER_ID,
      username: "unverified-user",
      display_name: "Unverified User",
      verified: false,
      email: "unverified-user@real-address.example",
      uan_number: "987654321098",
      certificates: ["Some Cert"],
      cert_visible: true,
    },
  }
  const users = {
    [OWNER_TOKEN]: { id: OWNER_ID, email: "verified-user@real-address.example", user_metadata: {} },
    [OTHER_TOKEN]: { id: OTHER_ID, email: "unverified-user@real-address.example", user_metadata: {} },
  }

  function chain(table) {
    const state = { table, filters: {}, ilike: null }
    const api = {
      select() { return api },
      eq(col, val) { state.filters[col] = val; return api },
      ilike(col, val) { state.ilike = { col, val }; return api },
      limit() { return api },
      async maybeSingle() {
        if (table !== "profiles") return { data: null, error: null }
        if (state.filters.id) return { data: profiles[state.filters.id] || null, error: null }
        if (state.filters.username) {
          const row = Object.values(profiles).find(p => p.username === state.filters.username)
          return { data: row || null, error: null }
        }
        return { data: null, error: null }
      },
      then(resolve) {
        // ilike-based fallback strategies (2/3) — not exercised by the
        // direct-UUID-lookup tests below, but must resolve rather than hang.
        return resolve({ data: [], error: null })
      },
    }
    return api
  }

  return {
    from: (table) => chain(table),
    auth: {
      async getUser(token) {
        const user = users[token]
        return { data: { user: user || null } }
      },
    },
  }
}

let server
let baseUrl

before(async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase()
  const portfolioPublicRoutes = (await import("../portfolioPublic.js")).default
  const app = express()
  app.use(express.json())
  app.use("/api", portfolioPublicRoutes)
  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
  await new Promise((resolve) => server.close(resolve))
})

test("anonymous viewer of a verified profile never receives email or uan_number", async () => {
  const res = await fetch(`${baseUrl}/api/portfolio/lookup/${OWNER_ID}`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.profile.id, OWNER_ID)
  assert.equal("email" in body.profile, false, "email must not be present in the response at all")
  assert.equal("uan_number" in body.profile, false, "uan_number must not be present in the response at all")
})

test("anonymous viewer of an UNVERIFIED profile gets 404 (not silently exposed)", async () => {
  const res = await fetch(`${baseUrl}/api/portfolio/lookup/${OTHER_ID}`)
  assert.equal(res.status, 404)
})

test("owner viewing their own UNVERIFIED-equivalent... (owner bypass) still works for their own profile", async () => {
  // OTHER_ID's own profile is unverified — its owner must still be able to see it.
  const res = await fetch(`${baseUrl}/api/portfolio/lookup/${OTHER_ID}`, {
    headers: { Authorization: `Bearer ${OTHER_TOKEN}` },
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.profile.id, OTHER_ID)
})

test("cert_visible:false hides certificates from a non-owner but not from the owner", async () => {
  const asStranger = await fetch(`${baseUrl}/api/portfolio/lookup/${OWNER_ID}`, {
    headers: { Authorization: `Bearer ${OTHER_TOKEN}` },
  })
  const strangerBody = await asStranger.json()
  assert.equal(strangerBody.profile.certificates, null)

  const asOwner = await fetch(`${baseUrl}/api/portfolio/lookup/${OWNER_ID}`, {
    headers: { Authorization: `Bearer ${OWNER_TOKEN}` },
  })
  const ownerBody = await asOwner.json()
  assert.deepEqual(ownerBody.profile.certificates, ["AWS Certified"])
})
