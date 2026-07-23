/**
 * Journey 3: Campus Placement Rush (Spike Test)
 *
 * Simulates what happens when a college announces placements and 200+ students
 * simultaneously open the platform for the first time.
 *
 * Concurrently exercises:
 *   A. New students hitting onboarding endpoints (role search, profile save)
 *   B. Returning students doing Arena runs
 *   C. Recruiters browsing the candidate pool
 *   D. Background: Jobs Launchpad polling
 *
 * Scenario uses k6 scenarios (not stages) so all four user types are concurrent.
 *
 * Run:
 *   k6 run --env TARGET=https://capabilio-server.onrender.com \
 *          --env JWT=<token> \
 *          journey-placement-rush.js
 *
 * Expected result at 200 VU peak:
 *   - HTTP error rate < 1%
 *   - p95 non-AI endpoints < 2000ms
 *   - p95 grading endpoint < 10000ms (LLM under load)
 *   - No OOM / process crash on the Node server
 */

import http  from "k6/http"
import { check, sleep, group } from "k6"
import { Trend, Rate, Counter } from "k6/metrics"
import { BASE, authHeaders, anonHeaders } from "./config.js"

// ── Metrics ───────────────────────────────────────────────────────────────────
const arenaGradingP95   = new Trend("rush_grading_ms",    true)
const catalogHits       = new Counter("rush_catalog_hits")
const recruiterHits     = new Counter("rush_recruiter_hits")
const onboardingErrors  = new Rate("rush_onboarding_errors")
const arenaErrors       = new Rate("rush_arena_errors")

// ── Options ───────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // A: New students — onboarding surge (100 VUs for 5 min)
    new_students: {
      executor:          "ramping-vus",
      startVUs:          0,
      stages: [
        { duration: "1m",  target: 50  },
        { duration: "3m",  target: 100 },
        { duration: "1m",  target: 0   },
      ],
      exec:             "newStudentJourney",
      gracefulRampDown: "30s",
    },
    // B: Returning students — Arena runs (80 VUs sustained)
    arena_runners: {
      executor:          "ramping-vus",
      startVUs:          0,
      stages: [
        { duration: "30s", target: 20  },
        { duration: "4m",  target: 80  },
        { duration: "30s", target: 0   },
      ],
      exec:             "arenaJourney",
      gracefulRampDown: "30s",
    },
    // C: Recruiters browsing candidates (20 VUs, steady)
    recruiters: {
      executor:          "constant-vus",
      vus:               20,
      duration:          "5m",
      exec:             "recruiterJourney",
    },
    // D: Background jobs polling (lightweight, simulates frontend's 30s interval)
    jobs_polling: {
      executor:          "constant-arrival-rate",
      rate:              10,          // 10 requests/sec = 30 concurrent tabs refreshing
      timeUnit:          "1s",
      duration:          "5m",
      preAllocatedVUs:   5,
      maxVUs:            20,
      exec:             "jobsPolling",
    },
  },

  thresholds: {
    http_req_failed:             ["rate<0.01"],
    http_req_duration:           ["p(95)<2000"],
    "rush_grading_ms":           ["p(95)<10000"],
    "rush_onboarding_errors":    ["rate<0.02"],
    "rush_arena_errors":         ["rate<0.02"],
  },
}

// ── Test data ─────────────────────────────────────────────────────────────────
const ALL_ROLES = [
  "Software Development", "Data Science", "Machine Learning", "DevOps Engineering",
  "Backend Development", "Frontend Development", "Full Stack Development",
  "Embedded Systems", "VLSI Design", "RF Engineering",
  "Power Systems", "Electrical Machines",
  "Mechanical Engineering", "Thermal Engineering",
  "Civil Engineering", "Structural Engineering",
  "IoT Engineering",
  "Pharmaceutical Sciences", "Clinical Pharmacy",
  "Business Management", "Marketing Management",
  "Medical Coding",
]

const SOLUTION_STUB = `def solution(arr):\n    return sorted(set(arr))`

// ── Scenario A: New student onboarding ───────────────────────────────────────
export function newStudentJourney() {
  const role    = ALL_ROLES[Math.floor(Math.random() * ALL_ROLES.length)]
  const headers = authHeaders()

  group("onboard_search_role", () => {
    // Simulates the RoleSearchPicker typeahead (stage 1 local, this hits the
    // AI fallback endpoint if no local match — we test the AI path explicitly)
    const res = http.post(
      `${BASE}/api/arena/daily`,
      JSON.stringify({
        keyword:    role,
        eloRating:  800,
        skillGraph: [],
        weakAreas:  [],
        path:       "student",
        completedTopics: [],
      }),
      { headers, tags: { name: "onboard_daily" } }
    )
    const ok = check(res, {
      "onboard daily 200": r => r.status === 200,
      "onboard has slots": r => {
        try { return JSON.parse(r.body).challenges?.length > 0 } catch { return false }
      },
    })
    onboardingErrors.add(!ok)
  })

  sleep(2 + Math.random() * 3)

  group("onboard_jobs_browse", () => {
    const res = http.get(
      `${BASE}/api/jobs/list?page=1&search=${encodeURIComponent(role)}&limit=10`,
      { headers, tags: { name: "onboard_jobs" } }
    )
    check(res, { "jobs 200": r => r.status === 200 })
  })

  sleep(1 + Math.random() * 2)
}

// ── Scenario B: Returning student Arena run ───────────────────────────────────
export function arenaJourney() {
  const role    = ALL_ROLES[__VU % ALL_ROLES.length]
  const elo     = 800 + (__VU % 10) * 80      // spread ELO 800–1600
  const headers = authHeaders()

  // Fetch slots
  let challenge = null
  group("arena_daily", () => {
    const res = http.post(
      `${BASE}/api/arena/daily`,
      JSON.stringify({ keyword: role, eloRating: elo, skillGraph: [], weakAreas: [], path: "student", completedTopics: [] }),
      { headers, tags: { name: "rush_daily" } }
    )
    check(res, { "daily 200": r => r.status === 200 })
    sleep(10 + Math.random() * 20)   // student reads: 10–30s
  })

  // Fetch challenge
  group("arena_challenge", () => {
    const res = http.post(
      `${BASE}/api/arena/challenge`,
      JSON.stringify({ keyword: role, eloRating: elo, taskIndex: Math.floor(Math.random() * 3) }),
      { headers, tags: { name: "rush_challenge" } }
    )
    try { challenge = JSON.parse(res.body) } catch {}
    check(res, { "challenge 200": r => r.status === 200 })
    sleep(20 + Math.random() * 40)   // student codes: 20–60s
  })

  // Submit
  group("arena_submit", () => {
    const start = Date.now()
    const res = http.post(
      `${BASE}/api/arena/review`,
      JSON.stringify({
        keyword:         role,
        eloRating:       elo,
        path:            "student",
        taskTitle:       challenge?.title       || "Sample Task",
        taskType:        challenge?.type        || "code",
        lang:            challenge?.lang        || "python",
        difficulty:      challenge?.difficulty  || "Medium",
        userAnswer:      SOLUTION_STUB,
        taskDescription: challenge?.description || "Implement the function.",
        testCases:       challenge?.testCases   || [],
        timeSpent:       Math.floor(30 + Math.random() * 270),
      }),
      { headers, tags: { name: "rush_review" } }
    )
    const elapsed = Date.now() - start
    arenaGradingP95.add(elapsed)

    const ok = check(res, {
      "review 200":       r => r.status === 200,
      "review has score": r => {
        try { return typeof JSON.parse(r.body).feedback?.score === "number" } catch { return false }
      },
    })
    arenaErrors.add(!ok)
  })

  sleep(3 + Math.random() * 5)
}

// ── Scenario C: Recruiter browses candidates ──────────────────────────────────
export function recruiterJourney() {
  const headers = authHeaders()

  group("recruiter_candidates", () => {
    const role = ALL_ROLES[Math.floor(Math.random() * ALL_ROLES.length)]
    const res = http.get(
      `${BASE}/api/arena/v2/recruiter/candidates?keyword=${encodeURIComponent(role)}&min_elo=800&limit=20`,
      { headers, tags: { name: "recruiter_candidates" } }
    )
    recruiterHits.add(1)
    check(res, {
      "recruiter 200 or 401": r => [200, 401, 403].includes(r.status),
      "recruiter no crash":   r => r.status !== 500,
    })
  })

  sleep(5 + Math.random() * 10)  // recruiters read profiles: 5–15s between pages
}

// ── Scenario D: Background jobs polling ──────────────────────────────────────
export function jobsPolling() {
  const headers = anonHeaders()
  const roles   = ["Software Development", "Data Science", "Civil Engineering", "Pharmacy"]
  const role    = roles[Math.floor(Math.random() * roles.length)]

  const res = http.get(
    `${BASE}/api/jobs/list?page=1&search=${encodeURIComponent(role)}`,
    { headers, tags: { name: "jobs_poll" } }
  )
  catalogHits.add(1)
  check(res, { "jobs poll 200": r => r.status === 200 })
  // no sleep — arrival-rate executor controls pacing
}
