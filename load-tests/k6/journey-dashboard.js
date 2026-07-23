/**
 * Journey 2: Aura Dashboard Load
 *
 * Simulates a student opening their Aura dashboard:
 *   1. Health check                        GET  /api/health
 *   2. Jobs Launchpad                      GET  /api/jobs/list
 *   3. Leaderboard                         GET  /api/arena/v2/leaderboard
 *   4. Career catalog (ArenaCatalog)       GET  /api/arena/v2/catalog
 *   5. ELO history                         GET  /api/arena/v2/elo/:uid
 *
 * These are all read-only, mostly DB-backed with cache headers.
 * Under load, the catalog endpoint is the highest-risk (large JOIN query).
 *
 * Run:
 *   k6 run --env TARGET=https://capabilio-server.onrender.com \
 *          --env JWT=<token> \
 *          --env UID=<supabase_user_uuid> \
 *          --env STAGE=load \
 *          journey-dashboard.js
 */

import http  from "k6/http"
import { check, sleep, group } from "k6"
import { Trend } from "k6/metrics"
import { BASE, authHeaders, anonHeaders, STAGES, COMMON_THRESHOLDS } from "./config.js"

const catalogLatency     = new Trend("dashboard_catalog_latency_ms",     true)
const leaderboardLatency = new Trend("dashboard_leaderboard_latency_ms",  true)
const eloLatency         = new Trend("dashboard_elo_latency_ms",          true)

const stage = __ENV.STAGE || "load"
const UID   = __ENV.UID   || "00000000-0000-0000-0000-000000000000"

export const options = {
  stages: STAGES[stage],
  thresholds: {
    ...COMMON_THRESHOLDS,
    "dashboard_catalog_latency_ms":     ["p(95)<2000"],
    "dashboard_leaderboard_latency_ms": ["p(95)<1500"],
    "dashboard_elo_latency_ms":         ["p(95)<1000"],
    // health + jobs must be fast
    "http_req_duration{name:health}": ["p(95)<500"],
    "http_req_duration{name:jobs}":   ["p(95)<1500"],
  },
}

// Cover all career track slugs (all 8 streams)
const CAREER_SLUGS = [
  "it-software", "aiml-engineer", "mca-professional",
  "ece-engineer", "eee-engineer", "iot-engineer",
  "mechanical-engineer", "civil-engineer",
  "pharma-professional", "mba-professional",
  "medical-coding-specialist",
]

const STREAM_ROLES = [
  // IT
  { keyword: "Software Development", branch: "IT" },
  { keyword: "Machine Learning",     branch: "IT" },
  { keyword: "DevOps Engineering",   branch: "IT" },
  // ECE/EEE/Mech/Civil/IoT
  { keyword: "Embedded Systems",        branch: "ECE" },
  { keyword: "Power Systems",           branch: "EEE" },
  { keyword: "Mechanical Engineering",  branch: "Mech" },
  { keyword: "Civil Engineering",       branch: "Civil" },
  { keyword: "IoT Engineering",         branch: "IoT" },
  // Pharmacy + MBA
  { keyword: "Pharmaceutical Sciences", branch: "Pharmacy" },
  { keyword: "Business Management",     branch: "MBA" },
]

export default function () {
  const auth   = authHeaders()
  const anon   = anonHeaders()
  const role   = STREAM_ROLES[__VU % STREAM_ROLES.length]
  const slug   = CAREER_SLUGS[__VU % CAREER_SLUGS.length]

  // 1 — Health check (cold-start detection)
  group("1_health", () => {
    const res = http.get(`${BASE}/api/health`, { headers: anon, tags: { name: "health" } })
    check(res, { "health 200": r => r.status === 200 })
  })

  sleep(0.5)

  // 2 — Jobs list (paginated, filtered by stream keyword)
  group("2_jobs", () => {
    const url = `${BASE}/api/jobs/list?page=1&search=${encodeURIComponent(role.keyword)}`
    const res = http.get(url, { headers: auth, tags: { name: "jobs" } })
    check(res, {
      "jobs 200":      r => r.status === 200,
      "jobs has data": r => {
        try { const b = JSON.parse(r.body); return Array.isArray(b.jobs) } catch { return false }
      },
    })
  })

  sleep(0.5 + Math.random())

  // 3 — Leaderboard (30s cache in production after polling migration)
  group("3_leaderboard", () => {
    const start = Date.now()
    const res = http.get(
      `${BASE}/api/arena/v2/leaderboard?scope=global&limit=20`,
      { headers: auth, tags: { name: "leaderboard" } }
    )
    leaderboardLatency.add(Date.now() - start)
    check(res, {
      "leaderboard 200":      r => r.status === 200,
      "leaderboard is array": r => {
        try { return Array.isArray(JSON.parse(r.body)) || Array.isArray(JSON.parse(r.body).data) } catch { return false }
      },
    })
  })

  sleep(0.5)

  // 4 — Arena catalog (most expensive read: joins problems + career_tracks)
  group("4_catalog", () => {
    const start = Date.now()
    const res = http.get(
      `${BASE}/api/arena/v2/catalog?career_track_slug=${slug}&page=1&limit=20`,
      { headers: auth, tags: { name: "catalog" } }
    )
    catalogLatency.add(Date.now() - start)
    check(res, {
      "catalog 200":      r => r.status === 200,
      "catalog no crash": r => r.status !== 500,
      "catalog has problems": r => {
        try {
          const b = JSON.parse(r.body)
          return Array.isArray(b.problems || b.data || b)
        } catch { return false }
      },
    })
  })

  sleep(0.5)

  // 5 — ELO breakdown for the user
  group("5_elo", () => {
    const start = Date.now()
    const res = http.get(
      `${BASE}/api/arena/v2/elo/${UID}`,
      { headers: auth, tags: { name: "elo" } }
    )
    eloLatency.add(Date.now() - start)
    check(res, {
      "elo 200 or 404": r => [200, 404].includes(r.status),
      "elo no crash":   r => r.status !== 500,
    })
  })

  sleep(2 + Math.random() * 3)
}
