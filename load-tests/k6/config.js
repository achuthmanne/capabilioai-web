/**
 * Shared config — Capabilio Production Readiness Suite
 *
 * Usage:
 *   k6 run --env TARGET=https://capabilio-server.onrender.com \
 *          --env JWT=<supabase_access_token> \
 *          --env UID=<supabase_user_uuid> \
 *          --env STAGE=college-pilot \
 *          journey-arena.js
 */

export const BASE = __ENV.TARGET || "https://capabilio-server.onrender.com"
export const JWT  = __ENV.JWT    || ""
export const UID  = __ENV.UID    || "00000000-0000-0000-0000-000000000000"

export function authHeaders() {
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${JWT}`,
  }
}
export function anonHeaders() {
  return { "Content-Type": "application/json" }
}

// ─── Scale stages — progressive evidence for 10k-user readiness ──────────────
//
// Don't claim 10k readiness until you've passed college (2000 VU) without
// breaching thresholds and identified the first bottleneck above that point.
//
// Stage          VUs     Purpose
// ─────────────────────────────────────────────────────────────────────────────
// smoke            1     Basic sanity — no regressions after deploy
// dev             20     Developer testing on local/staging
// college-pilot  100     Single lab or classroom rollout
// department     500     One college department
// college       2000     Entire college simultaneous session
// multi-college 5000     3–4 colleges in the same placement window
// target       10000     Expected peak rollout
// stress       20000     2× target — find the first crack
// breakpoint   50000     Capacity planning / infrastructure ceiling
//
export const STAGES = {
  smoke: [
    { duration: "1m", target: 1 },
  ],
  dev: [
    { duration: "1m",  target: 5  },
    { duration: "3m",  target: 20 },
    { duration: "1m",  target: 0  },
  ],
  "college-pilot": [
    { duration: "2m",  target: 50  },
    { duration: "5m",  target: 100 },
    { duration: "2m",  target: 0   },
  ],
  department: [
    { duration: "3m",  target: 100 },
    { duration: "6m",  target: 500 },
    { duration: "3m",  target: 0   },
  ],
  college: [
    { duration: "3m",  target: 500  },
    { duration: "8m",  target: 2000 },
    { duration: "3m",  target: 2000 },
    { duration: "2m",  target: 0    },
  ],
  "multi-college": [
    { duration: "4m",  target: 1000 },
    { duration: "8m",  target: 5000 },
    { duration: "4m",  target: 5000 },
    { duration: "2m",  target: 0    },
  ],
  target: [
    { duration: "5m",   target: 2000  },
    { duration: "10m",  target: 10000 },
    { duration: "5m",   target: 10000 },
    { duration: "3m",   target: 0     },
  ],
  stress: [
    { duration: "5m",   target: 5000  },
    { duration: "10m",  target: 20000 },
    { duration: "5m",   target: 20000 },
    { duration: "3m",   target: 0     },
  ],
  breakpoint: [
    { duration: "5m",   target: 10000 },
    { duration: "15m",  target: 50000 },  // hold until something breaks
    { duration: "5m",   target: 0     },
  ],
}

// ─── SLO thresholds ───────────────────────────────────────────────────────────
// These reflect the commitments in the Production Readiness Report.
// k6 exits with code 99 if any threshold is breached — wire into CI.
export const COMMON_THRESHOLDS = {
  http_req_failed:   ["rate<0.01"],    // <1% HTTP errors globally
  http_req_duration: ["p(95)<2000"],   // p95 < 2s (non-AI endpoints)
}

// AI endpoints get a separate, relaxed budget (Groq LLM latency varies).
export const AI_THRESHOLDS = {
  "http_req_duration{name:ai_grading}":   ["p(95)<8000"],
  "http_req_duration{name:ai_lesson}":    ["p(95)<6000"],
  "http_req_duration{name:ai_interview}": ["p(95)<8000"],
}

// ─── Shared test data ─────────────────────────────────────────────────────────
// All 8 streams — ensures every student population is represented in every test.
export const ALL_ROLES = [
  // IT
  { keyword: "Software Development",    slug: "it-software",     elo: 900  },
  { keyword: "Data Science",            slug: "aiml-engineer",   elo: 1050 },
  { keyword: "Machine Learning",        slug: "aiml-engineer",   elo: 950  },
  { keyword: "DevOps Engineering",      slug: "it-software",     elo: 1100 },
  { keyword: "Backend Development",     slug: "it-software",     elo: 980  },
  { keyword: "Frontend Development",    slug: "it-software",     elo: 870  },
  // ECE
  { keyword: "Embedded Systems",        slug: "ece-engineer",    elo: 850  },
  { keyword: "VLSI Design",             slug: "ece-engineer",    elo: 900  },
  // EEE
  { keyword: "Power Systems",           slug: "eee-engineer",    elo: 820  },
  // Mechanical
  { keyword: "Mechanical Engineering",  slug: "mechanical-engineer", elo: 800 },
  // Civil
  { keyword: "Civil Engineering",       slug: "civil-engineer",  elo: 810  },
  // IoT
  { keyword: "IoT Engineering",         slug: "iot-engineer",    elo: 880  },
  // Pharmacy
  { keyword: "Pharmaceutical Sciences", slug: "pharma-professional", elo: 830 },
  // MBA
  { keyword: "Business Management",     slug: "mba-professional", elo: 870 },
  // Medical
  { keyword: "Medical Coding",          slug: "medical-coding-specialist", elo: 820 },
]

export function pickRole(vuId) {
  return ALL_ROLES[vuId % ALL_ROLES.length]
}
