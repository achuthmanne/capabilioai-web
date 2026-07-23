/**
 * Journey: Complete Onboarding
 *
 * Every college rollout begins here. If this fails under load, nothing else
 * matters — students can't reach Arena, Aura, or Skill Studio.
 *
 * Flow simulated:
 *   1. GET  /api/health                   — server warm?
 *   2. POST /api/assessment/resolve-role  — role search (typeahead AI fallback)
 *   3. POST /api/assessment/generate-mcq  — 10-question MCQ assessment
 *   4. POST /api/assessment/analyse-assessment — submit answers, get profile
 *   5. GET  /api/jobs/list                — first jobs page (Launchpad preview)
 *   6. GET  /api/arena/v2/catalog         — first challenge page (Aura preview)
 *
 * Steps 3 and 4 call Groq LLM — they get a relaxed latency budget.
 *
 * Run:
 *   k6 run --env TARGET=https://capabilio-server.onrender.com \
 *          --env JWT=<token> \
 *          --env STAGE=college-pilot \
 *          journey-onboarding.js
 */

import http  from "k6/http"
import { check, sleep, group } from "k6"
import { Trend, Rate } from "k6/metrics"
import { BASE, authHeaders, anonHeaders, STAGES, COMMON_THRESHOLDS, AI_THRESHOLDS, pickRole } from "./config.js"

const mcqLatency      = new Trend("onboard_mcq_latency_ms",      true)
const analyseLatency  = new Trend("onboard_analyse_latency_ms",  true)
const onboardErrors   = new Rate("onboard_errors")

const stage = __ENV.STAGE || "college-pilot"

export const options = {
  stages: STAGES[stage],
  thresholds: {
    ...COMMON_THRESHOLDS,
    "onboard_mcq_latency_ms":     ["p(95)<6000"],   // LLM-backed MCQ gen
    "onboard_analyse_latency_ms": ["p(95)<6000"],   // LLM-backed analysis
    "onboard_errors":             ["rate<0.02"],
    "http_req_duration{name:health}":       ["p(95)<500"],
    "http_req_duration{name:resolve_role}": ["p(95)<3000"],
    "http_req_duration{name:jobs_preview}": ["p(95)<1500"],
    "http_req_duration{name:catalog_preview}": ["p(95)<2000"],
  },
}

// Simulated MCQ responses — representative wrong + right answers across streams
const MCQ_ANSWERS = [
  { questionIndex: 0, selectedOption: "B" },
  { questionIndex: 1, selectedOption: "A" },
  { questionIndex: 2, selectedOption: "C" },
  { questionIndex: 3, selectedOption: "B" },
  { questionIndex: 4, selectedOption: "D" },
  { questionIndex: 5, selectedOption: "A" },
  { questionIndex: 6, selectedOption: "C" },
  { questionIndex: 7, selectedOption: "B" },
  { questionIndex: 8, selectedOption: "A" },
  { questionIndex: 9, selectedOption: "C" },
]

export default function () {
  const role    = pickRole(__VU)
  const auth    = authHeaders()
  const anon    = anonHeaders()

  // 1 — Health (confirms no cold-start)
  group("1_health", () => {
    const res = http.get(`${BASE}/api/health`, { headers: anon, tags: { name: "health" } })
    check(res, { "health 200": r => r.status === 200 })
  })

  sleep(0.5)

  // 2 — Role resolution (typeahead AI fallback path)
  let resolvedRole = role.keyword
  group("2_resolve_role", () => {
    const res = http.post(
      `${BASE}/api/assessment/resolve-role`,
      JSON.stringify({ query: role.keyword }),
      { headers: auth, tags: { name: "resolve_role" } }
    )
    check(res, {
      "resolve_role 200":    r => r.status === 200,
      "resolve_role no 500": r => r.status !== 500,
    })
    try {
      const b = JSON.parse(res.body)
      resolvedRole = b.role || b.keyword || role.keyword
    } catch {}
  })

  sleep(1 + Math.random() * 2)  // student reads role suggestion

  // 3 — MCQ assessment generation (LLM)
  let questions = []
  group("3_generate_mcq", () => {
    const start = Date.now()
    const res = http.post(
      `${BASE}/api/assessment/generate-mcq`,
      JSON.stringify({
        role:     resolvedRole,
        branch:   role.slug,
        level:    "fresher",
        count:    10,
      }),
      { headers: auth, tags: { name: "ai_lesson" } }  // shares AI budget tag
    )
    mcqLatency.add(Date.now() - start)
    const ok = check(res, {
      "mcq 200":         r => r.status === 200,
      "mcq has questions": r => {
        try { const b = JSON.parse(r.body); questions = b.questions || []; return questions.length > 0 } catch { return false }
      },
    })
    onboardErrors.add(!ok)
  })

  sleep(60 + Math.random() * 120)  // student takes assessment: 1–3 min

  // 4 — Submit assessment + get profile analysis (LLM)
  group("4_analyse_assessment", () => {
    const start = Date.now()
    const res = http.post(
      `${BASE}/api/assessment/analyse-assessment`,
      JSON.stringify({
        role:      resolvedRole,
        branch:    role.slug,
        answers:   MCQ_ANSWERS,
        questions: questions.slice(0, 10),
        eloRating: role.elo,
      }),
      { headers: auth, tags: { name: "ai_grading" } }
    )
    analyseLatency.add(Date.now() - start)
    const ok = check(res, {
      "analyse 200":       r => r.status === 200,
      "analyse has score": r => {
        try { const b = JSON.parse(r.body); return b.score !== undefined || b.analysis !== undefined } catch { return false }
      },
    })
    onboardErrors.add(!ok)
  })

  sleep(2 + Math.random() * 3)  // student reads result

  // 5 — Jobs Launchpad preview (first thing they see after profile created)
  group("5_jobs_preview", () => {
    const res = http.get(
      `${BASE}/api/jobs/list?page=1&search=${encodeURIComponent(role.keyword)}&limit=10`,
      { headers: auth, tags: { name: "jobs_preview" } }
    )
    check(res, { "jobs 200": r => r.status === 200 })
  })

  sleep(0.5)

  // 6 — Catalog preview (what Arena will show them)
  group("6_catalog_preview", () => {
    const res = http.get(
      `${BASE}/api/arena/v2/catalog?career_track_slug=${role.slug}&page=1&limit=10`,
      { headers: auth, tags: { name: "catalog_preview" } }
    )
    check(res, {
      "catalog 200":      r => r.status === 200,
      "catalog no crash": r => r.status !== 500,
    })
  })

  sleep(3 + Math.random() * 5)
}
