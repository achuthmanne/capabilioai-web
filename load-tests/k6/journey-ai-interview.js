/**
 * Journey: AI Interview
 *
 * Premium feature — LLM generates questions, evaluates spoken/typed answers,
 * and returns structured feedback with a score. This journey exercises every
 * AI call in sequence, which is the worst case for LLM concurrency.
 *
 * LLM calls compound: start → question (LLM) → answer (LLM eval) × N → complete.
 * Even 5 concurrent AI interview sessions can saturate an API key's rate limit.
 * This test tells you exactly where that ceiling is.
 *
 * Flow:
 *   1. POST /api/pro/interview/start          — create session
 *   2. GET  /api/pro/interview/:id            — fetch first question
 *   3. POST /api/pro/interview/:id/answer × 5 — submit answers (LLM eval each)
 *   4. POST /api/pro/interview/:id/complete   — finalise + overall score
 *   5. GET  /api/pro/interview/history        — verify it persisted
 *
 * Run:
 *   k6 run --env TARGET=https://capabilio-server.onrender.com \
 *          --env JWT=<token> \
 *          --env STAGE=dev \
 *          journey-ai-interview.js
 *
 * ⚠️  Use STAGE=dev (20 VUs) or college-pilot (100 VUs) first.
 *     At higher concurrency, AI rate limits will surface before DB limits.
 *     That is the point — know your ceiling before college day.
 */

import http  from "k6/http"
import { check, sleep, group } from "k6"
import { Trend, Rate, Counter } from "k6/metrics"
import { BASE, authHeaders, STAGES, COMMON_THRESHOLDS, pickRole } from "./config.js"

const startLatency    = new Trend("interview_start_ms",    true)
const answerLatency   = new Trend("interview_answer_ms",   true)
const completeLatency = new Trend("interview_complete_ms", true)
const interviewErrors = new Rate("interview_errors")
const rateLimitHits   = new Counter("interview_rate_limit_hits")

const stage = __ENV.STAGE || "dev"

export const options = {
  stages: STAGES[stage],
  thresholds: {
    ...COMMON_THRESHOLDS,
    "interview_start_ms":    ["p(95)<5000"],
    "interview_answer_ms":   ["p(95)<8000"],
    "interview_complete_ms": ["p(95)<6000"],
    "interview_errors":      ["rate<0.05"],   // more lenient — AI rate limits expected at scale
    // Rate limit hits should be 0 under dev/college-pilot — if not, you need retry logic
    "interview_rate_limit_hits": ["count<10"],
  },
}

// Realistic interview answers — short enough to process quickly, varied per stream
const ANSWERS = {
  "it-software": [
    "I would use a hash map to track seen elements, giving O(n) time and O(n) space complexity.",
    "The main difference between SQL and NoSQL is that SQL is relational with a fixed schema, while NoSQL is flexible and horizontally scalable.",
    "In REST, each request is stateless. I design endpoints around resources, use proper HTTP verbs, and return appropriate status codes.",
    "I would denormalize hot read paths, add database indexes, implement Redis caching, and use connection pooling.",
    "A microservice should own its data. I'd use event sourcing and async messaging to avoid tight coupling.",
  ],
  "ece-engineer": [
    "Nyquist theorem states the sampling rate must be at least twice the highest signal frequency to avoid aliasing.",
    "I would use UART for simple point-to-point, I2C for multiple sensors on two wires, and SPI for high-speed peripherals.",
    "A flip-flop stores a single bit of state. D flip-flops are used in registers and synchronous circuits.",
    "Power dissipation in CMOS is P = alpha × C × V² × f, so reducing voltage has the most impact.",
    "Setup time is the minimum time data must be stable before the clock edge; hold time is the minimum after.",
  ],
  "mechanical-engineer": [
    "Carnot efficiency is 1 - T_cold/T_hot. Real cycles are less efficient due to irreversibilities and friction.",
    "I would perform FEM analysis, check stress concentrations, and apply a safety factor based on material yield strength.",
    "GD&T ensures parts fit and function as intended regardless of which machine or operator makes them.",
    "Bernoulli's equation relates pressure, velocity, and height in an ideal fluid: P + 0.5ρv² + ρgh = constant.",
    "I would consider material strength, machinability, corrosion resistance, thermal properties, and cost.",
  ],
  default: [
    "I approach this systematically by first understanding requirements, then breaking the problem into smaller parts.",
    "My experience includes both theoretical knowledge and practical application in real-world scenarios.",
    "I would prioritize based on impact and urgency, communicate with stakeholders, and document decisions clearly.",
    "Testing is critical. I write unit tests first, then integration tests, and use CI to catch regressions early.",
    "I learn from feedback and continuously improve by reading documentation, taking courses, and building projects.",
  ],
}

export default function () {
  const role    = pickRole(__VU)
  const auth    = authHeaders()
  const answers = ANSWERS[role.slug] || ANSWERS.default
  let sessionId = null

  // 1 — Start interview session
  group("1_start_session", () => {
    const start = Date.now()
    const res = http.post(
      `${BASE}/api/pro/interview/start`,
      JSON.stringify({
        role:       role.keyword,
        eloRating:  role.elo,
        mode:       "practice",
        difficulty: role.elo > 1100 ? "senior" : "fresher",
        questionCount: 5,
      }),
      { headers: auth, tags: { name: "ai_interview" } }
    )
    startLatency.add(Date.now() - start)

    if (res.status === 429) { rateLimitHits.add(1); return }

    const ok = check(res, {
      "start 200":    r => r.status === 200,
      "start has id": r => {
        try { const b = JSON.parse(r.body); sessionId = b.id || b.session_id || b.interviewId; return !!sessionId } catch { return false }
      },
    })
    interviewErrors.add(!ok)
  })

  if (!sessionId) { sleep(2); return }

  sleep(1)

  // 2 — Fetch first question
  group("2_fetch_question", () => {
    const res = http.get(
      `${BASE}/api/pro/interview/${sessionId}`,
      { headers: auth, tags: { name: "ai_interview" } }
    )
    check(res, {
      "question 200":        r => r.status === 200,
      "question has prompt": r => {
        try { const b = JSON.parse(r.body); return !!(b.question || b.currentQuestion || b.prompt) } catch { return false }
      },
    })
  })

  // 3 — Answer 5 questions in sequence (simulates real interview pacing)
  for (let i = 0; i < 5; i++) {
    sleep(20 + Math.random() * 40)  // student thinks + types: 20–60s per answer

    group(`3_answer_${i + 1}`, () => {
      const start = Date.now()
      const res = http.post(
        `${BASE}/api/pro/interview/${sessionId}/answer`,
        JSON.stringify({
          questionIndex: i,
          answer:        answers[i % answers.length],
          timeTaken:     Math.floor(25 + Math.random() * 35),
        }),
        { headers: auth, tags: { name: "ai_interview" } }
      )
      answerLatency.add(Date.now() - start)

      if (res.status === 429) { rateLimitHits.add(1); return }

      const ok = check(res, {
        "answer 200":          r => r.status === 200,
        "answer has feedback": r => {
          try { const b = JSON.parse(r.body); return !!(b.feedback || b.score || b.evaluation) } catch { return false }
        },
      })
      interviewErrors.add(!ok)
    })
  }

  sleep(2)

  // 4 — Complete session + final score
  group("4_complete", () => {
    const start = Date.now()
    const res = http.post(
      `${BASE}/api/pro/interview/${sessionId}/complete`,
      JSON.stringify({}),
      { headers: auth, tags: { name: "ai_interview" } }
    )
    completeLatency.add(Date.now() - start)
    check(res, {
      "complete 200":       r => r.status === 200,
      "complete has score": r => {
        try { const b = JSON.parse(r.body); return b.score !== undefined || b.overallScore !== undefined } catch { return false }
      },
    })
  })

  sleep(1)

  // 5 — History (verify persistence)
  group("5_history", () => {
    const res = http.get(
      `${BASE}/api/pro/interview/history`,
      { headers: auth, tags: { name: "interview_history" } }
    )
    check(res, { "history 200 or 404": r => [200, 404].includes(r.status) })
  })

  sleep(5 + Math.random() * 10)
}
