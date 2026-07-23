/**
 * Mixed Traffic — Production Readiness Gate
 *
 * This is the most important test. Instead of hammering one endpoint,
 * it simulates what Capabilio will actually see when a college uses it:
 *
 *   35% Aura Dashboard   (students checking their score + jobs)
 *   25% Arena            (students submitting challenges)
 *   15% Skill Studio     (students in weak-skill loop)
 *   10% Jobs Launchpad   (students browsing jobs)
 *    5% Pulse            (community feed)
 *    5% Portfolio/Nexus  (profile browsing)
 *    3% AI Interview     (premium feature)
 *    2% Recruiter        (companies browsing candidates)
 *
 * All 8 student streams are represented proportionally in the VU pool.
 *
 * Gate: Run this at each scale stage. Only advance to the next stage when
 * ALL thresholds pass. The stage where you first see a threshold breach is
 * your current capacity ceiling — fix the bottleneck before going further.
 *
 * Run (college-pilot first, then advance):
 *   k6 run --env TARGET=https://capabilio-server.onrender.com \
 *          --env JWT=<token> \
 *          --env UID=<student_uuid> \
 *          --env STAGE=college-pilot \
 *          mixed-traffic.js
 *
 *   # After college-pilot passes all thresholds:
 *   k6 run ... --env STAGE=department mixed-traffic.js
 *   k6 run ... --env STAGE=college    mixed-traffic.js
 *   # etc. — don't skip stages
 */

import http  from "k6/http"
import { check, sleep, group } from "k6"
import { Trend, Rate, Counter } from "k6/metrics"
import { BASE, authHeaders, anonHeaders, STAGES, COMMON_THRESHOLDS, UID, pickRole } from "./config.js"

// ── Metrics ───────────────────────────────────────────────────────────────────
const gradingLatency   = new Trend("mixed_grading_ms",   true)
const catalogLatency   = new Trend("mixed_catalog_ms",   true)
const lessonLatency    = new Trend("mixed_lesson_ms",    true)
const totalErrors      = new Rate("mixed_total_errors")
const aiRateLimits     = new Counter("mixed_ai_rate_limits")

const stage = __ENV.STAGE || "college-pilot"

// ── Traffic distribution via k6 scenarios ────────────────────────────────────
// VU counts per scenario reflect real traffic percentages at each scale stage.
// Adjust these numbers when running at higher stages by passing --env STAGE=...
// The STAGES object in config.js drives ramp-up — scenarios inherit the same
// VU profile proportionally.

function vuShare(total, pct) { return Math.max(1, Math.round(total * pct)) }

// Peak VU count at this stage (used to proportion scenarios)
const PEAK = {
  smoke:           1,
  dev:            20,
  "college-pilot": 100,
  department:      500,
  college:        2000,
  "multi-college": 5000,
  target:        10000,
  stress:        20000,
  breakpoint:    50000,
}[stage] || 100

export const options = {
  scenarios: {
    // 35% — Aura Dashboard
    dashboard: {
      executor:          "ramping-vus",
      startVUs:          0,
      stages:            STAGES[stage],
      exec:             "dashboardUser",
      gracefulRampDown: "30s",
      env:              { SCENARIO_VUS: String(vuShare(PEAK, 0.35)) },
    },
    // 25% — Arena
    arena: {
      executor:          "ramping-vus",
      startVUs:          0,
      stages:            STAGES[stage].map(s => ({ ...s, target: vuShare(s.target, 0.25) })),
      exec:             "arenaUser",
      gracefulRampDown: "30s",
    },
    // 15% — Skill Studio
    skill_studio: {
      executor:          "ramping-vus",
      startVUs:          0,
      stages:            STAGES[stage].map(s => ({ ...s, target: vuShare(s.target, 0.15) })),
      exec:             "skillStudioUser",
      gracefulRampDown: "30s",
    },
    // 10% — Jobs Launchpad (background polling pattern)
    jobs_launchpad: {
      executor:          "constant-arrival-rate",
      rate:              Math.max(1, Math.round(PEAK * 0.10 / 30)),  // ~1 req/s per 30 VUs
      timeUnit:          "1s",
      duration:          STAGES[stage].reduce((sum, s) => sum + parseInt(s.duration), 0) + "s",
      preAllocatedVUs:   vuShare(PEAK, 0.10),
      exec:             "jobsUser",
    },
    // 5% — Pulse (community feed)
    pulse: {
      executor:          "ramping-vus",
      startVUs:          0,
      stages:            STAGES[stage].map(s => ({ ...s, target: vuShare(s.target, 0.05) })),
      exec:             "pulseUser",
      gracefulRampDown: "30s",
    },
    // 5% — Nexus/Portfolio
    nexus: {
      executor:          "ramping-vus",
      startVUs:          0,
      stages:            STAGES[stage].map(s => ({ ...s, target: vuShare(s.target, 0.05) })),
      exec:             "nexusUser",
      gracefulRampDown: "30s",
    },
    // 3% — AI Interview (premium)
    ai_interview: {
      executor:          "ramping-vus",
      startVUs:          0,
      stages:            STAGES[stage].map(s => ({ ...s, target: vuShare(s.target, 0.03) })),
      exec:             "aiInterviewUser",
      gracefulRampDown: "60s",   // longer — AI sessions take more time to drain
    },
    // 2% — Recruiter
    recruiter: {
      executor:          "ramping-vus",
      startVUs:          0,
      stages:            STAGES[stage].map(s => ({ ...s, target: vuShare(s.target, 0.02) })),
      exec:             "recruiterUser",
      gracefulRampDown: "30s",
    },
  },

  thresholds: {
    // Global SLOs — all traffic combined
    http_req_failed:   ["rate<0.01"],        // <1% errors across all scenarios
    http_req_duration: ["p(95)<2000"],       // p95 < 2s (all non-AI)
    "mixed_grading_ms":  ["p(95)<8000"],    // AI grading p95 < 8s
    "mixed_catalog_ms":  ["p(95)<2000"],    // catalog JOIN p95 < 2s
    "mixed_lesson_ms":   ["p(95)<6000"],    // AI lesson p95 < 6s
    "mixed_total_errors": ["rate<0.01"],
    // AI rate limit hits — should be 0 at college-pilot; expected at college+
    "mixed_ai_rate_limits": stage === "college-pilot" ? ["count<5"] : ["count<50"],
    // Per-scenario latency gates
    "http_req_duration{exec:dashboardUser}":   ["p(95)<1500"],
    "http_req_duration{exec:jobsUser}":        ["p(95)<1500"],
    "http_req_duration{exec:pulseUser}":       ["p(95)<2000"],
    "http_req_duration{exec:nexusUser}":       ["p(95)<2000"],
    "http_req_duration{exec:recruiterUser}":   ["p(95)<2500"],  // JOIN-heavy
    "http_req_duration{exec:aiInterviewUser}": ["p(95)<10000"], // LLM
  },
}

// ── Sample code solution shared across all Arena VUs ─────────────────────────
const ARENA_SOLUTION = `def solution(nums):\n    seen = set()\n    for n in nums:\n        if n in seen: return True\n        seen.add(n)\n    return False`

// ── Scenario functions ────────────────────────────────────────────────────────

// 35% — Dashboard
export function dashboardUser() {
  const role = pickRole(__VU)
  const auth = authHeaders()
  const responses = http.batch([
    ["GET", `${BASE}/api/arena/v2/leaderboard?scope=global&limit=20`,                          null, { headers: auth }],
    ["GET", `${BASE}/api/jobs/list?page=1&search=${encodeURIComponent(role.keyword)}&limit=10`, null, { headers: auth }],
    ["GET", `${BASE}/api/arena/v2/catalog?career_track_slug=${role.slug}&page=1&limit=10`,      null, { headers: auth }],
  ])
  for (const res of responses) {
    const ok = check(res, { "dashboard batch no 500": r => r.status !== 500 })
    totalErrors.add(!ok)
  }
  const start = Date.now()
  const cat = http.get(`${BASE}/api/arena/v2/catalog?career_track_slug=${role.slug}&page=1`, { headers: auth })
  catalogLatency.add(Date.now() - start)
  sleep(20 + Math.random() * 40)  // student reads dashboard: 20–60s
}

// 25% — Arena
export function arenaUser() {
  const role = pickRole(__VU)
  const auth = authHeaders()
  let challenge = null

  http.post(`${BASE}/api/arena/daily`,
    JSON.stringify({ keyword: role.keyword, eloRating: role.elo, skillGraph: [], weakAreas: [], path: "student", completedTopics: [] }),
    { headers: auth }
  )
  sleep(15 + Math.random() * 30)

  const cr = http.post(`${BASE}/api/arena/challenge`,
    JSON.stringify({ keyword: role.keyword, eloRating: role.elo, taskIndex: Math.floor(Math.random() * 3) }),
    { headers: auth }
  )
  try { challenge = JSON.parse(cr.body) } catch {}
  sleep(20 + Math.random() * 40)

  const start = Date.now()
  const res = http.post(`${BASE}/api/arena/review`,
    JSON.stringify({
      keyword: role.keyword, eloRating: role.elo, path: "student",
      taskTitle: challenge?.title || "Task", taskType: challenge?.type || "code",
      lang: challenge?.lang || "python", difficulty: challenge?.difficulty || "Medium",
      userAnswer: ARENA_SOLUTION, taskDescription: challenge?.description || "Solve it.",
      testCases: challenge?.testCases || [], timeSpent: Math.floor(30 + Math.random() * 270),
    }),
    { headers: auth, tags: { name: "ai_grading" } }
  )
  gradingLatency.add(Date.now() - start)
  if (res.status === 429) aiRateLimits.add(1)
  const ok = check(res, { "arena submit not 500": r => r.status !== 500 })
  totalErrors.add(!ok)
  sleep(5 + Math.random() * 10)
}

// 15% — Skill Studio
export function skillStudioUser() {
  const role = pickRole(__VU)
  const auth = authHeaders()

  http.get(`${BASE}/api/skill-studio/resources?skill=Data+Structures&role=${encodeURIComponent(role.keyword)}`, { headers: auth })
  sleep(5 + Math.random() * 10)

  const start = Date.now()
  const res = http.post(`${BASE}/api/skill-studio/lesson`,
    JSON.stringify({ skill: "Data Structures", role: role.keyword, eloRating: role.elo, level: "intermediate" }),
    { headers: auth, tags: { name: "ai_lesson" } }
  )
  lessonLatency.add(Date.now() - start)
  if (res.status === 429) aiRateLimits.add(1)
  const ok = check(res, { "lesson not 500": r => r.status !== 500 })
  totalErrors.add(!ok)
  sleep(15 + Math.random() * 30)
}

// 10% — Jobs Launchpad
export function jobsUser() {
  const role = pickRole(__VU)
  const auth = authHeaders()
  const res = http.get(
    `${BASE}/api/jobs/list?page=1&search=${encodeURIComponent(role.keyword)}&limit=20`,
    { headers: auth }
  )
  const ok = check(res, { "jobs not 500": r => r.status !== 500 })
  totalErrors.add(!ok)
  // No sleep — controlled by arrival rate executor
}

// 5% — Pulse community feed
export function pulseUser() {
  const auth = authHeaders()
  const res = http.get(`${BASE}/api/pulse/feed?page=1&limit=20`, { headers: auth })
  check(res, { "pulse not 500": r => r.status !== 500 })
  sleep(10 + Math.random() * 30)
}

// 5% — Nexus / Portfolio
export function nexusUser() {
  const auth = authHeaders()
  const role = pickRole(__VU)
  http.get(`${BASE}/api/nexus/search?q=${encodeURIComponent(role.keyword)}&limit=10`, { headers: auth })
  sleep(3 + Math.random() * 7)
  http.get(`${BASE}/api/nexus/profile/${UID}`, { headers: auth })
  sleep(10 + Math.random() * 20)
}

// 3% — AI Interview (premium)
export function aiInterviewUser() {
  const role = pickRole(__VU)
  const auth = authHeaders()
  let sessionId = null

  const r1 = http.post(`${BASE}/api/pro/interview/start`,
    JSON.stringify({ role: role.keyword, eloRating: role.elo, mode: "practice", difficulty: "fresher", questionCount: 3 }),
    { headers: auth }
  )
  if (r1.status === 429) { aiRateLimits.add(1); return }
  try { sessionId = JSON.parse(r1.body)?.id } catch {}
  if (!sessionId) return

  for (let i = 0; i < 3; i++) {
    sleep(20 + Math.random() * 30)
    const r = http.post(`${BASE}/api/pro/interview/${sessionId}/answer`,
      JSON.stringify({ questionIndex: i, answer: "I approach this systematically.", timeTaken: 25 }),
      { headers: auth }
    )
    if (r.status === 429) aiRateLimits.add(1)
  }
  sleep(2)
  http.post(`${BASE}/api/pro/interview/${sessionId}/complete`, JSON.stringify({}), { headers: auth })
  sleep(5 + Math.random() * 10)
}

// 2% — Recruiter browsing
export function recruiterUser() {
  const role = pickRole(__VU)
  const auth = authHeaders()
  http.get(
    `${BASE}/api/arena/v2/recruiter/candidates?keyword=${encodeURIComponent(role.keyword)}&min_elo=800&limit=20`,
    { headers: auth }
  )
  sleep(8 + Math.random() * 15)
  http.get(`${BASE}/api/pro/profile/${UID}`, { headers: auth })
  sleep(15 + Math.random() * 30)
}
