/**
 * Journey: Placement Officer
 *
 * A placement officer's workload is different from students AND recruiters.
 * They do broad population queries — ELO distributions across departments,
 * readiness snapshots, student search — all at once, before placement season.
 * These are the queries most likely to cause table scans on a large dataset.
 *
 * Flow:
 *   1. GET /api/arena/v2/leaderboard         — college-wide ELO leaderboard
 *   2. GET /api/arena/v2/catalog × branches  — check coverage per stream
 *   3. GET /api/jobs/list × streams          — verify job relevance per stream
 *   4. GET /api/pulse/market-insights        — market readiness report
 *   5. GET /api/nexus/search                 — search students by skill
 *   6. GET /api/pro/profile/:uid × 3         — spot-check individual profiles
 *
 * Run:
 *   k6 run --env TARGET=https://capabilio-server.onrender.com \
 *          --env JWT=<token> \
 *          --env UID=<any_student_uuid> \
 *          --env STAGE=college-pilot \
 *          journey-placement-officer.js
 */

import http  from "k6/http"
import { check, sleep, group } from "k6"
import { Trend, Rate } from "k6/metrics"
import { BASE, authHeaders, STAGES, COMMON_THRESHOLDS, UID, ALL_ROLES } from "./config.js"

const leaderboardLatency = new Trend("tpo_leaderboard_ms", true)
const searchLatency      = new Trend("tpo_search_ms",      true)
const tpoErrors          = new Rate("tpo_errors")

const stage = __ENV.STAGE || "college-pilot"

export const options = {
  stages: STAGES[stage],
  thresholds: {
    ...COMMON_THRESHOLDS,
    "tpo_leaderboard_ms": ["p(95)<2000"],
    "tpo_search_ms":      ["p(95)<2000"],
    "tpo_errors":         ["rate<0.02"],
    "http_req_duration{name:tpo_catalog}":  ["p(95)<2000"],
    "http_req_duration{name:tpo_insights}": ["p(95)<3000"],
  },
}

const BRANCHES = [
  { slug: "it-software",              keyword: "Software Development" },
  { slug: "ece-engineer",             keyword: "Embedded Systems"     },
  { slug: "eee-engineer",             keyword: "Power Systems"        },
  { slug: "mechanical-engineer",      keyword: "Mechanical Engineering" },
  { slug: "civil-engineer",           keyword: "Civil Engineering"    },
  { slug: "iot-engineer",             keyword: "IoT Engineering"      },
  { slug: "pharma-professional",      keyword: "Pharmaceutical Sciences" },
  { slug: "mba-professional",         keyword: "Business Management"  },
]

const SEARCH_SKILLS = [
  "React", "Python", "SQL", "Machine Learning", "Embedded C",
  "AutoCAD", "Power Systems", "MQTT", "Pharmacokinetics", "Financial Modeling",
]

export default function () {
  const auth   = authHeaders()
  const branch = BRANCHES[__VU % BRANCHES.length]

  // 1 — College-wide leaderboard (most common TPO view)
  group("1_leaderboard", () => {
    const start = Date.now()
    const res = http.get(
      `${BASE}/api/arena/v2/leaderboard?scope=global&limit=50`,
      { headers: auth, tags: { name: "tpo_leaderboard" } }
    )
    leaderboardLatency.add(Date.now() - start)
    const ok = check(res, {
      "leaderboard 200":      r => r.status === 200,
      "leaderboard no crash": r => r.status !== 500,
    })
    tpoErrors.add(!ok)
  })

  sleep(10 + Math.random() * 20)  // officer reads the list

  // 2 — Catalog per branch (checking problem coverage for each department)
  //     TPO does this once per branch before confirming rollout
  for (const b of [branch, BRANCHES[(BRANCHES.indexOf(branch) + 1) % BRANCHES.length]]) {
    group(`2_catalog_${b.slug}`, () => {
      const res = http.get(
        `${BASE}/api/arena/v2/catalog?career_track_slug=${b.slug}&page=1&limit=20`,
        { headers: auth, tags: { name: "tpo_catalog" } }
      )
      check(res, {
        "catalog 200":      r => r.status === 200,
        "catalog no crash": r => r.status !== 500,
      })
    })
    sleep(3 + Math.random() * 5)
  }

  // 3 — Jobs list for the branch (confirming job relevance for students)
  group("3_jobs_relevance", () => {
    const res = http.get(
      `${BASE}/api/jobs/list?page=1&search=${encodeURIComponent(branch.keyword)}&limit=20`,
      { headers: auth, tags: { name: "tpo_jobs" } }
    )
    check(res, {
      "jobs 200":      r => r.status === 200,
      "jobs no crash": r => r.status !== 500,
    })
  })

  sleep(5 + Math.random() * 10)

  // 4 — Market insights (Pulse)
  group("4_market_insights", () => {
    const res = http.get(
      `${BASE}/api/pulse/market-insights?keyword=${encodeURIComponent(branch.keyword)}`,
      { headers: auth, tags: { name: "tpo_insights" } }
    )
    check(res, {
      "insights 200 or 404": r => [200, 404].includes(r.status),
      "insights no crash":   r => r.status !== 500,
    })
  })

  sleep(5 + Math.random() * 10)

  // 5 — Student search by skill (finding top performers to highlight to recruiters)
  group("5_nexus_search", () => {
    const skill = SEARCH_SKILLS[__VU % SEARCH_SKILLS.length]
    const start = Date.now()
    const res = http.get(
      `${BASE}/api/nexus/search?q=${encodeURIComponent(skill)}&limit=20`,
      { headers: auth, tags: { name: "tpo_search" } }
    )
    searchLatency.add(Date.now() - start)
    check(res, {
      "search 200 or 404": r => [200, 404].includes(r.status),
      "search no crash":   r => r.status !== 500,
    })
  })

  sleep(5 + Math.random() * 10)

  // 6 — Spot-check 2 individual student profiles
  for (let i = 0; i < 2; i++) {
    group(`6_spot_check_${i}`, () => {
      const res = http.get(
        `${BASE}/api/pro/profile/${UID}`,
        { headers: auth, tags: { name: "tpo_profile" } }
      )
      check(res, { "profile 200 or 404": r => [200, 404].includes(r.status) })
    })
    sleep(10 + Math.random() * 20)
  }

  sleep(5 + Math.random() * 10)
}
