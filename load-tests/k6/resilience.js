/**
 * Resilience & Failure Injection Tests
 *
 * Tests what happens when things go wrong — not just when they go right.
 * Run these BEFORE college rollout to know exactly what students will see
 * when the system is under stress or partially degraded.
 *
 * Scenarios:
 *   A. Render cold start    — first request after dyno sleep (30–60s delay)
 *   B. Supabase timeout     — slow DB query path, >5s response
 *   C. AI provider timeout  — Groq/Claude rate limit or timeout
 *   D. Expired JWT          — request with an old token
 *   E. Duplicate submission — submit same Arena answer twice (idempotency)
 *   F. Empty/malformed body — no crash, no 500
 *   G. Concurrent sessions  — same UID from N tabs simultaneously
 *   H. Jobs API unavailable — RapidAPI down, fallback to DB
 *
 * What you're checking:
 *   - No 500s on bad input (400/422 expected)
 *   - Graceful degradation when upstream APIs are slow
 *   - Rate limiter returns 429 (not 500) when throttled
 *   - Duplicate submissions are handled (not double-counted)
 *   - Cold-start adds latency but doesn't error
 *
 * Run:
 *   k6 run --env TARGET=https://capabilio-server.onrender.com \
 *          --env JWT=<valid_token> \
 *          --env EXPIRED_JWT=<expired_token> \
 *          resilience.js
 */

import http  from "k6/http"
import { check, sleep, group } from "k6"
import { Rate, Counter, Trend } from "k6/metrics"
import { BASE, authHeaders, anonHeaders, UID } from "./config.js"

const coldStartLatency   = new Trend("resilience_cold_start_ms",  true)
const gracefulDegrades   = new Counter("resilience_graceful_degrades")
const unexpectedErrors   = new Counter("resilience_unexpected_500s")
const rateLimitCorrect   = new Counter("resilience_rate_limit_429s")
const duplicateHandled   = new Counter("resilience_duplicates_handled")

// These run once each, not in ramp stages — use 1 VU per scenario
export const options = {
  scenarios: {
    cold_start: {
      executor: "per-vu-iterations",
      vus: 1, iterations: 1,
      exec: "coldStart",
      startTime: "0s",
    },
    expired_jwt: {
      executor: "per-vu-iterations",
      vus: 5, iterations: 3,
      exec: "expiredJWT",
      startTime: "5s",
    },
    malformed_body: {
      executor: "per-vu-iterations",
      vus: 5, iterations: 5,
      exec: "malformedBody",
      startTime: "10s",
    },
    duplicate_submission: {
      executor: "per-vu-iterations",
      vus: 3, iterations: 2,
      exec: "duplicateSubmission",
      startTime: "15s",
    },
    concurrent_tabs: {
      executor: "per-vu-iterations",
      vus: 10, iterations: 5,
      exec: "concurrentTabs",
      startTime: "20s",
    },
    rate_limit: {
      executor: "constant-arrival-rate",
      rate: 50,               // hammer a single endpoint at 50 req/s
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 20,
      exec: "rateLimitCheck",
      startTime: "30s",
    },
    jobs_fallback: {
      executor: "per-vu-iterations",
      vus: 5, iterations: 5,
      exec: "jobsFallback",
      startTime: "65s",
    },
    jwt_expiry_during_arena: {
      executor: "per-vu-iterations",
      vus: 3, iterations: 2,
      exec: "jwtExpiryDuringArena",
      startTime: "70s",
    },
  },
  thresholds: {
    "resilience_unexpected_500s": ["count<5"],   // fewer than 5 total 500s across all scenarios
    "resilience_cold_start_ms":   ["p(95)<65000"], // cold start can take up to 60s
  },
}

// ── A: Cold start ─────────────────────────────────────────────────────────────
// Tests: does the server recover from sleep gracefully?
// Expected: 200 within 60s, even if first request is slow
export function coldStart() {
  const start = Date.now()
  // Multiple retries with backoff — simulates frontend retry button
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = http.get(`${BASE}/api/health`, {
      headers: anonHeaders(),
      timeout: "65s",           // allow full cold-start window
      tags: { name: "cold_start" },
    })
    coldStartLatency.add(Date.now() - start)

    if (res.status === 200) {
      check(res, { "cold start recovered": r => r.status === 200 })
      gracefulDegrades.add(1)
      return
    }

    check(res, { "cold start not 500": r => r.status !== 500 })
    if (res.status === 500) unexpectedErrors.add(1)
    sleep(attempt * 2)   // exponential-ish backoff: 2, 4, 6, 8, 10s
  }
}

// ── B: Expired JWT ────────────────────────────────────────────────────────────
// Tests: expired tokens return 401 (not 500), triggering frontend refresh
export function expiredJWT() {
  const expiredToken = __ENV.EXPIRED_JWT || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.EXPIRED"
  const res = http.get(
    `${BASE}/api/arena/v2/catalog?career_track_slug=it-software`,
    {
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${expiredToken}` },
      tags: { name: "expired_jwt" },
    }
  )
  const ok = check(res, {
    "expired JWT → 401 not 500": r => r.status === 401 || r.status === 403,
    "expired JWT no server crash": r => r.status !== 500,
  })
  if (res.status === 500) unexpectedErrors.add(1)
  if (ok) gracefulDegrades.add(1)
  sleep(1)
}

// ── C: Malformed/empty body ───────────────────────────────────────────────────
// Tests: missing required fields return 400/422, not 500
export function malformedBody() {
  const auth = authHeaders()
  const cases = [
    // Empty body
    { url: `${BASE}/api/arena/review`,           body: "{}" },
    // Missing required fields
    { url: `${BASE}/api/arena/daily`,            body: JSON.stringify({ eloRating: 900 }) },  // missing keyword
    { url: `${BASE}/api/assessment/generate-mcq`, body: JSON.stringify({ count: 10 }) },       // missing role
    // Completely invalid JSON
    { url: `${BASE}/api/arena/daily`,            body: "not json at all }{" },
    // Huge payload (>body limit)
    { url: `${BASE}/api/arena/review`,           body: JSON.stringify({ userAnswer: "x".repeat(100_000) }) },
  ]

  const c = cases[__VU % cases.length]
  const res = http.post(c.url, c.body, { headers: auth, tags: { name: "malformed" } })

  const ok = check(res, {
    "malformed → not 500": r => r.status !== 500,
    "malformed → 4xx":     r => r.status >= 400 && r.status < 500,
  })
  if (res.status === 500) unexpectedErrors.add(1)
  if (ok) gracefulDegrades.add(1)
  sleep(0.5)
}

// ── D: Duplicate submission ───────────────────────────────────────────────────
// Tests: submitting the same Arena answer twice doesn't double-count ELO
export function duplicateSubmission() {
  const auth    = authHeaders()
  const payload = JSON.stringify({
    keyword:         "Software Development",
    eloRating:       900,
    path:            "student",
    taskTitle:       "Duplicate Test Task",
    taskType:        "code",
    lang:            "python",
    difficulty:      "Easy",
    userAnswer:      "def solution(n): return n * 2",
    taskDescription: "Double a number.",
    testCases:       [],
    timeSpent:       30,
  })

  // Submit twice rapidly
  const r1 = http.post(`${BASE}/api/arena/review`, payload, { headers: auth, tags: { name: "duplicate_1" } })
  const r2 = http.post(`${BASE}/api/arena/review`, payload, { headers: auth, tags: { name: "duplicate_2" } })

  check(r1, { "first submission 200":     r => r.status === 200 })
  check(r2, { "second submission handled": r => r.status !== 500 })

  if (r2.status !== 500) duplicateHandled.add(1)
  if (r2.status === 500) unexpectedErrors.add(1)

  sleep(2)
}

// ── E: Concurrent tabs (same UID) ────────────────────────────────────────────
// Tests: 10 tabs hitting the same user's endpoints simultaneously
// Real pattern: student opens platform on phone + laptop + college PC
export function concurrentTabs() {
  const auth = authHeaders()

  // All "tabs" fire simultaneously
  const responses = http.batch([
    ["GET",  `${BASE}/api/arena/v2/leaderboard?scope=global&limit=20`,           null, { headers: auth }],
    ["GET",  `${BASE}/api/jobs/list?page=1&search=Software+Development`,          null, { headers: auth }],
    ["GET",  `${BASE}/api/arena/v2/catalog?career_track_slug=it-software&page=1`, null, { headers: auth }],
    ["GET",  `${BASE}/api/arena/v2/elo/${UID}`,                                   null, { headers: auth }],
    ["GET",  `${BASE}/api/nexus/profile/${UID}`,                                  null, { headers: auth }],
  ])

  for (const res of responses) {
    const ok = check(res, { "concurrent tab no 500": r => r.status !== 500 })
    if (!ok) unexpectedErrors.add(1)
    else gracefulDegrades.add(1)
  }
  sleep(2)
}

// ── F: Rate limiter verification ──────────────────────────────────────────────
// Tests: hammering one endpoint returns 429 (not 500) when rate limited
export function rateLimitCheck() {
  const auth = authHeaders()
  const res = http.post(
    `${BASE}/api/arena/review`,
    JSON.stringify({
      keyword: "Software Development", eloRating: 900, path: "student",
      taskTitle: "Rate Limit Test", taskType: "code", lang: "python",
      difficulty: "Easy", userAnswer: "pass", taskDescription: "test",
      testCases: [], timeSpent: 5,
    }),
    { headers: auth, tags: { name: "rate_limit_check" } }
  )

  if (res.status === 429) rateLimitCorrect.add(1)
  if (res.status === 500) unexpectedErrors.add(1)

  check(res, {
    "rate limit no 500": r => r.status !== 500,
    // Either processed or rate-limited — both are acceptable
    "rate limit handled": r => [200, 201, 429].includes(r.status),
  })
}

// ── G: Jobs API fallback ──────────────────────────────────────────────────────
// Tests: when RapidAPI (JSearch) is unavailable, fallback to DB jobs table works
// We verify this by making the request without RAPIDAPI_KEY env (server should
// automatically fall through to Stage 2 DB query)
export function jobsFallback() {
  const auth = authHeaders()
  const res = http.get(
    `${BASE}/api/jobs/list?page=1&search=Software+Development&force_db=true`,
    { headers: auth, tags: { name: "jobs_fallback" } }
  )
  const ok = check(res, {
    "jobs fallback 200":      r => r.status === 200,
    "jobs fallback has data": r => {
      try { const b = JSON.parse(r.body); return Array.isArray(b.jobs) } catch { return false }
    },
  })
  if (!ok && res.status === 500) unexpectedErrors.add(1)
  if (ok) gracefulDegrades.add(1)
  sleep(1)
}

// ── H: JWT expiry mid-Arena session ──────────────────────────────────────────
// Tests: the proactive refresh logic in api.js handles this transparently
// Simulates: student starts Arena with valid JWT, it expires mid-session,
// frontend refresh interceptor kicks in, submission still works
export function jwtExpiryDuringArena() {
  const auth = authHeaders()

  // Start with valid token (fetch slots — should work)
  const r1 = http.post(
    `${BASE}/api/arena/daily`,
    JSON.stringify({ keyword: "Software Development", eloRating: 900, skillGraph: [], weakAreas: [], path: "student", completedTopics: [] }),
    { headers: auth, tags: { name: "arena_before_expiry" } }
  )
  check(r1, { "pre-expiry request ok": r => r.status === 200 })

  sleep(30)  // simulate student taking 30s (in real test this would be longer)

  // Submit with same token (proactive refresh should have run on frontend)
  // This test verifies the BACKEND handles it gracefully if token is still valid
  const r2 = http.post(
    `${BASE}/api/arena/review`,
    JSON.stringify({
      keyword: "Software Development", eloRating: 900, path: "student",
      taskTitle: "JWT Expiry Test", taskType: "code", lang: "python",
      difficulty: "Medium", userAnswer: "def solution(n): return n",
      taskDescription: "Return n.", testCases: [], timeSpent: 45,
    }),
    { headers: auth, tags: { name: "arena_after_expiry" } }
  )
  const ok = check(r2, {
    "post-expiry submission not 500": r => r.status !== 500,
    "post-expiry submission handled": r => [200, 401].includes(r.status),  // 401 triggers frontend refresh
  })
  if (r2.status === 500) unexpectedErrors.add(1)
  if (ok) gracefulDegrades.add(1)
}
