/**
 * Journey 1: Arena Session
 *
 * Simulates a student completing a full Arena practice session:
 *   1. Load daily challenge slots        POST /api/arena/daily
 *   2. Fetch a single challenge           POST /api/arena/challenge
 *   3. Run test cases against solution    POST /api/arena/run-tests
 *   4. Submit final answer               POST /api/arena/review
 *
 * This is the hottest path on the platform — every active student hits it.
 * It calls Groq LLM for grading (step 4), so p95 budget is relaxed to 8s.
 *
 * Run:
 *   k6 run --env TARGET=https://capabilio-server.onrender.com \
 *          --env JWT=<token> \
 *          --env STAGE=load \
 *          journey-arena.js
 *
 *   STAGE options: smoke | load | stress  (default: load)
 */

import http    from "k6/http"
import { check, sleep, group } from "k6"
import { Trend, Rate } from "k6/metrics"
import { BASE, authHeaders, STAGES, COMMON_THRESHOLDS } from "./config.js"

// ── Custom metrics ────────────────────────────────────────────────────────────
const gradingLatency  = new Trend("arena_grading_latency_ms",  true)
const runTestsLatency = new Trend("arena_run_tests_latency_ms", true)
const submitErrors    = new Rate("arena_submit_errors")

// ── Options ───────────────────────────────────────────────────────────────────
const stage = __ENV.STAGE || "load"

export const options = {
  stages: STAGES[stage],
  thresholds: {
    ...COMMON_THRESHOLDS,
    // AI grading is LLM-backed — allow up to 8s p95
    "arena_grading_latency_ms":  ["p(95)<8000"],
    "arena_run_tests_latency_ms": ["p(95)<3000"],
    // Core API endpoints must stay < 2s p95
    "http_req_duration{name:daily}":     ["p(95)<2000"],
    "http_req_duration{name:challenge}": ["p(95)<2000"],
  },
}

// ── Test data — covers all 8 streams ─────────────────────────────────────────
const PERSONAS = [
  // IT
  { keyword: "Software Development",     eloRating: 900,  path: "student" },
  { keyword: "Data Science",             eloRating: 1050, path: "student" },
  { keyword: "DevOps Engineering",       eloRating: 1100, path: "student" },
  { keyword: "Machine Learning",         eloRating: 950,  path: "student" },
  // ECE
  { keyword: "Embedded Systems",         eloRating: 850,  path: "student" },
  { keyword: "VLSI Design",             eloRating: 900,  path: "student" },
  // EEE
  { keyword: "Power Systems",            eloRating: 820,  path: "student" },
  // Mechanical
  { keyword: "Mechanical Engineering",   eloRating: 800,  path: "student" },
  // Civil
  { keyword: "Civil Engineering",        eloRating: 810,  path: "student" },
  // IoT
  { keyword: "IoT Engineering",          eloRating: 880,  path: "student" },
  // Pharmacy
  { keyword: "Pharmaceutical Sciences",  eloRating: 830,  path: "student" },
  // MBA
  { keyword: "Business Management",      eloRating: 870,  path: "student" },
]

const SAMPLE_SOLUTIONS = {
  python: `def solution(nums):\n    seen = set()\n    for n in nums:\n        if n in seen:\n            return True\n        seen.add(n)\n    return False`,
  sql:    `SELECT id, name, score FROM leaderboard WHERE score > 0 ORDER BY score DESC LIMIT 10;`,
  text:   `The Carnot cycle achieves maximum theoretical efficiency between two heat reservoirs. Efficiency = 1 - (T_cold / T_hot). No real engine can exceed this limit due to irreversibilities.`,
}

// ── Main VU function ──────────────────────────────────────────────────────────
export default function () {
  const persona  = PERSONAS[__VU % PERSONAS.length]
  const headers  = authHeaders()

  // Step 1 — Load daily slots
  group("1_daily_slots", () => {
    const res = http.post(
      `${BASE}/api/arena/daily`,
      JSON.stringify({
        keyword:        persona.keyword,
        eloRating:      persona.eloRating,
        skillGraph:     [],
        weakAreas:      [],
        path:           persona.path,
        completedTopics: [],
      }),
      { headers, tags: { name: "daily" } }
    )

    check(res, {
      "daily 200":            r => r.status === 200,
      "daily has challenges": r => {
        try { return JSON.parse(r.body).challenges?.length > 0 } catch { return false }
      },
    })

    sleep(1 + Math.random() * 2)  // student reads the challenge: 1–3s
  })

  // Step 2 — Fetch a single challenge
  let challenge = null
  group("2_fetch_challenge", () => {
    const res = http.post(
      `${BASE}/api/arena/challenge`,
      JSON.stringify({
        keyword:    persona.keyword,
        eloRating:  persona.eloRating,
        taskIndex:  Math.floor(Math.random() * 3),
      }),
      { headers, tags: { name: "challenge" } }
    )

    check(res, {
      "challenge 200":       r => r.status === 200,
      "challenge has title": r => {
        try { const b = JSON.parse(r.body); challenge = b; return !!b.title } catch { return false }
      },
    })

    sleep(15 + Math.random() * 30)  // student spends 15–45s reading + thinking
  })

  // Step 3 — Run test cases (code challenges only)
  group("3_run_tests", () => {
    const lang   = challenge?.lang || "python"
    const solution = SAMPLE_SOLUTIONS[lang] || SAMPLE_SOLUTIONS.python
    const start = Date.now()
    const res = http.post(
      `${BASE}/api/arena/run-tests`,
      JSON.stringify({
        code:       solution,
        lang:       lang,
        testCases:  challenge?.testCases || [],
        challengeId: challenge?.id || "test-001",
      }),
      { headers, tags: { name: "run_tests" } }
    )
    runTestsLatency.add(Date.now() - start)

    check(res, {
      "run-tests 200":        r => r.status === 200,
      "run-tests no crash":   r => r.status !== 500,
    })

    sleep(5 + Math.random() * 10)   // student reviews output, tweaks code: 5–15s
  })

  // Step 4 — Submit for grading (hits Groq LLM)
  group("4_submit", () => {
    const lang     = challenge?.lang || "python"
    const solution = SAMPLE_SOLUTIONS[lang] || SAMPLE_SOLUTIONS.python
    const start    = Date.now()
    const res = http.post(
      `${BASE}/api/arena/review`,
      JSON.stringify({
        keyword:      persona.keyword,
        eloRating:    persona.eloRating,
        path:         persona.path,
        taskTitle:    challenge?.title  || "Sample Task",
        taskType:     challenge?.type   || "code",
        lang:         lang,
        difficulty:   challenge?.difficulty || "Medium",
        userAnswer:   solution,
        taskDescription: challenge?.description || "Implement the required function.",
        testCases:    challenge?.testCases || [],
        timeSpent:    Math.floor(20 + Math.random() * 300),  // 20–320s
      }),
      { headers, tags: { name: "review" } }
    )
    const elapsed = Date.now() - start
    gradingLatency.add(elapsed)

    const ok = check(res, {
      "review 200":         r => r.status === 200,
      "review has score":   r => {
        try { return typeof JSON.parse(r.body).feedback?.score === "number" } catch { return false }
      },
    })
    submitErrors.add(!ok)
  })

  sleep(2 + Math.random() * 3)  // cool-down between iterations
}
