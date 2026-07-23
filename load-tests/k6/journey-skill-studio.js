/**
 * Journey: Skill Studio
 *
 * Students spend significant time here after their first Arena session.
 * The weak-skill loop (lesson → quiz → Arena recommendation) is the core
 * retention mechanism — it must hold up under sustained concurrent load.
 *
 * Flow:
 *   1. GET  /api/skill-studio/resources   — resource feed for weak skill
 *   2. GET  /api/skill-studio/youtube     — video recommendations
 *   3. POST /api/skill-studio/lesson      — AI-generated lesson (LLM)
 *   4. POST /api/skill-studio/learning-path — full roadmap (LLM)
 *   5. GET  /api/arena/v2/catalog         — Arena recommendation after lesson
 *
 * Steps 3 and 4 are LLM-backed — they get relaxed latency budgets.
 * Steps 1, 2, and 5 must stay under 2s p95.
 *
 * Run:
 *   k6 run --env TARGET=https://capabilio-server.onrender.com \
 *          --env JWT=<token> \
 *          --env STAGE=college-pilot \
 *          journey-skill-studio.js
 */

import http  from "k6/http"
import { check, sleep, group } from "k6"
import { Trend, Rate } from "k6/metrics"
import { BASE, authHeaders, STAGES, COMMON_THRESHOLDS, pickRole } from "./config.js"

const lessonLatency    = new Trend("studio_lesson_latency_ms",     true)
const roadmapLatency   = new Trend("studio_roadmap_latency_ms",    true)
const studioErrors     = new Rate("studio_errors")

const stage = __ENV.STAGE || "college-pilot"

export const options = {
  stages: STAGES[stage],
  thresholds: {
    ...COMMON_THRESHOLDS,
    "studio_lesson_latency_ms":  ["p(95)<6000"],
    "studio_roadmap_latency_ms": ["p(95)<8000"],
    "studio_errors":             ["rate<0.02"],
    "http_req_duration{name:studio_resources}": ["p(95)<1500"],
    "http_req_duration{name:studio_youtube}":   ["p(95)<2000"],
    "http_req_duration{name:studio_catalog}":   ["p(95)<2000"],
  },
}

// Weak skills mapped per stream — reflects realistic skill gap patterns
const WEAK_SKILLS_BY_STREAM = {
  "it-software":              ["Dynamic Programming", "System Design", "Database Indexing"],
  "aiml-engineer":            ["Feature Engineering", "Model Evaluation", "Neural Networks"],
  "ece-engineer":             ["Signal Processing", "VLSI Design", "Embedded C"],
  "eee-engineer":             ["Power Factor Correction", "Transformer Design", "Motor Control"],
  "mechanical-engineer":      ["Thermodynamics", "Finite Element Analysis", "CNC Machining"],
  "civil-engineer":           ["Structural Analysis", "Soil Mechanics", "AutoCAD"],
  "iot-engineer":             ["MQTT Protocol", "Power Management", "Edge Computing"],
  "pharma-professional":      ["Pharmacokinetics", "Drug Formulation", "GMP Compliance"],
  "mba-professional":         ["Financial Modeling", "Supply Chain Optimization", "Business Analytics"],
  "medical-coding-specialist":["ICD-10-CM Coding", "CPT Codes", "DRG Assignment"],
}

export default function () {
  const role    = pickRole(__VU)
  const auth    = authHeaders()
  const skills  = WEAK_SKILLS_BY_STREAM[role.slug] || ["Data Structures", "Algorithms"]
  const skill   = skills[Math.floor(Math.random() * skills.length)]

  // 1 — Resource feed for weak skill
  group("1_resources", () => {
    const res = http.get(
      `${BASE}/api/skill-studio/resources?skill=${encodeURIComponent(skill)}&role=${encodeURIComponent(role.keyword)}`,
      { headers: auth, tags: { name: "studio_resources" } }
    )
    check(res, {
      "resources 200":      r => r.status === 200,
      "resources no crash": r => r.status !== 500,
    })
  })

  sleep(2 + Math.random() * 3)

  // 2 — YouTube recommendations
  group("2_youtube", () => {
    const res = http.get(
      `${BASE}/api/skill-studio/youtube?skill=${encodeURIComponent(skill)}&role=${encodeURIComponent(role.keyword)}`,
      { headers: auth, tags: { name: "studio_youtube" } }
    )
    check(res, {
      "youtube 200":      r => r.status === 200,
      "youtube no crash": r => r.status !== 500,
    })
  })

  sleep(1 + Math.random() * 2)

  // 3 — AI lesson (LLM generates structured lesson content)
  group("3_ai_lesson", () => {
    const start = Date.now()
    const res = http.post(
      `${BASE}/api/skill-studio/lesson`,
      JSON.stringify({
        skill:      skill,
        role:       role.keyword,
        eloRating:  role.elo,
        level:      role.elo < 900 ? "beginner" : role.elo < 1100 ? "intermediate" : "advanced",
      }),
      { headers: auth, tags: { name: "ai_lesson" } }
    )
    lessonLatency.add(Date.now() - start)
    const ok = check(res, {
      "lesson 200":        r => r.status === 200,
      "lesson has content": r => {
        try { const b = JSON.parse(r.body); return !!(b.content || b.lesson || b.sections) } catch { return false }
      },
    })
    studioErrors.add(!ok)
  })

  sleep(10 + Math.random() * 20)  // student reads lesson: 10–30s

  // 4 — Full learning roadmap (LLM — heaviest call in this journey)
  group("4_learning_path", () => {
    const start = Date.now()
    const res = http.post(
      `${BASE}/api/skill-studio/learning-path`,
      JSON.stringify({
        role:       role.keyword,
        eloRating:  role.elo,
        weakSkills: skills,
        targetRole: role.keyword,
      }),
      { headers: auth, tags: { name: "ai_lesson" } }
    )
    roadmapLatency.add(Date.now() - start)
    const ok = check(res, {
      "roadmap 200":        r => r.status === 200,
      "roadmap has phases": r => {
        try { const b = JSON.parse(r.body); return !!(b.phases || b.path || b.roadmap || b.weeks) } catch { return false }
      },
    })
    studioErrors.add(!ok)
  })

  sleep(5 + Math.random() * 10)  // student reviews roadmap

  // 5 — Arena catalog (recommended next step after lesson)
  group("5_arena_recommendation", () => {
    const res = http.get(
      `${BASE}/api/arena/v2/catalog?career_track_slug=${role.slug}&page=1&limit=5`,
      { headers: auth, tags: { name: "studio_catalog" } }
    )
    check(res, {
      "catalog 200":      r => r.status === 200,
      "catalog no crash": r => r.status !== 500,
    })
  })

  sleep(3 + Math.random() * 5)
}
