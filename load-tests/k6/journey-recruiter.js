/**
 * Journey: Recruiter
 *
 * Recruiter queries are often more expensive than student traffic because they
 * join across many student profiles with dynamic filters (ELO range, stream,
 * college, skills). A single recruiter browsing 10 pages of candidates runs
 * 10 expensive JOINs — often heavier than 50 students reading their own dashboard.
 *
 * Flow:
 *   1. GET /api/arena/v2/recruiter/candidates  — filtered candidate list (page 1)
 *   2. GET /api/arena/v2/recruiter/candidates  — page 2 (simulates scrolling)
 *   3. GET /api/arena/v2/recruiter/proof/:uid  — open a candidate's proof page
 *   4. GET /api/pro/profile/:uid               — full professional profile
 *   5. GET /api/nexus/profile/:uid             — Nexus social profile
 *   6. GET /api/arena/v2/elo/:uid              — ELO breakdown
 *
 * Run:
 *   k6 run --env TARGET=https://capabilio-server.onrender.com \
 *          --env JWT=<token> \
 *          --env UID=<any_student_uuid> \
 *          --env STAGE=college-pilot \
 *          journey-recruiter.js
 */

import http  from "k6/http"
import { check, sleep, group } from "k6"
import { Trend, Rate } from "k6/metrics"
import { BASE, authHeaders, STAGES, COMMON_THRESHOLDS, UID, pickRole } from "./config.js"

const candidateListLatency = new Trend("recruiter_list_ms",    true)
const proofLatency         = new Trend("recruiter_proof_ms",   true)
const profileLatency       = new Trend("recruiter_profile_ms", true)
const recruiterErrors      = new Rate("recruiter_errors")

const stage = __ENV.STAGE || "college-pilot"

export const options = {
  stages: STAGES[stage],
  thresholds: {
    ...COMMON_THRESHOLDS,
    "recruiter_list_ms":    ["p(95)<2000"],  // candidate list JOIN is expensive
    "recruiter_proof_ms":   ["p(95)<1500"],
    "recruiter_profile_ms": ["p(95)<1500"],
    "recruiter_errors":     ["rate<0.02"],
  },
}

// Realistic recruiter search filters — different companies look for different things
const SEARCH_FILTERS = [
  { keyword: "Software Development",    min_elo: 900,  max_elo: 1500, branch: "IT"         },
  { keyword: "Data Science",            min_elo: 950,  max_elo: 1400, branch: "IT"         },
  { keyword: "Machine Learning",        min_elo: 1000, max_elo: 1600, branch: "IT"         },
  { keyword: "Embedded Systems",        min_elo: 850,  max_elo: 1300, branch: "ECE"        },
  { keyword: "VLSI Design",             min_elo: 900,  max_elo: 1400, branch: "ECE"        },
  { keyword: "Power Systems",           min_elo: 800,  max_elo: 1200, branch: "EEE"        },
  { keyword: "Mechanical Engineering",  min_elo: 800,  max_elo: 1200, branch: "Mechanical" },
  { keyword: "Civil Engineering",       min_elo: 800,  max_elo: 1200, branch: "Civil"      },
  { keyword: "IoT Engineering",         min_elo: 850,  max_elo: 1300, branch: "IoT"        },
  { keyword: "Pharmaceutical Sciences", min_elo: 820,  max_elo: 1200, branch: "Pharmacy"   },
  { keyword: "Business Management",     min_elo: 850,  max_elo: 1300, branch: "MBA"        },
]

export default function () {
  const auth    = authHeaders()
  const filter  = SEARCH_FILTERS[__VU % SEARCH_FILTERS.length]
  const uid     = UID   // in real tests, use SharedArray with multiple student UIDs

  // 1 — Candidate list page 1
  group("1_candidate_list_p1", () => {
    const start = Date.now()
    const url = `${BASE}/api/arena/v2/recruiter/candidates` +
      `?keyword=${encodeURIComponent(filter.keyword)}` +
      `&min_elo=${filter.min_elo}&max_elo=${filter.max_elo}` +
      `&limit=20&page=1`
    const res = http.get(url, { headers: auth, tags: { name: "recruiter_list" } })
    candidateListLatency.add(Date.now() - start)
    const ok = check(res, {
      "list p1 200 or 401": r => [200, 401, 403].includes(r.status),
      "list p1 no crash":   r => r.status !== 500,
    })
    recruiterErrors.add(!ok)
  })

  sleep(8 + Math.random() * 12)  // recruiter scans page: 8–20s

  // 2 — Page 2 (recruiter scrolls)
  group("2_candidate_list_p2", () => {
    const start = Date.now()
    const url = `${BASE}/api/arena/v2/recruiter/candidates` +
      `?keyword=${encodeURIComponent(filter.keyword)}` +
      `&min_elo=${filter.min_elo}&limit=20&page=2`
    const res = http.get(url, { headers: auth, tags: { name: "recruiter_list" } })
    candidateListLatency.add(Date.now() - start)
    check(res, { "list p2 no crash": r => r.status !== 500 })
  })

  sleep(5 + Math.random() * 10)  // recruiter picks a candidate

  // 3 — Open candidate proof page
  group("3_proof_artifacts", () => {
    const start = Date.now()
    const res = http.get(
      `${BASE}/api/arena/v2/recruiter/proof/${uid}`,
      { headers: auth, tags: { name: "recruiter_proof" } }
    )
    proofLatency.add(Date.now() - start)
    check(res, {
      "proof 200 or 404": r => [200, 404].includes(r.status),
      "proof no crash":   r => r.status !== 500,
    })
  })

  sleep(15 + Math.random() * 30)  // recruiter reads proof: 15–45s

  // 4 — Full professional profile
  group("4_pro_profile", () => {
    const start = Date.now()
    const res = http.get(
      `${BASE}/api/pro/profile/${uid}`,
      { headers: auth, tags: { name: "recruiter_profile" } }
    )
    profileLatency.add(Date.now() - start)
    check(res, {
      "profile 200 or 404": r => [200, 404].includes(r.status),
      "profile no crash":   r => r.status !== 500,
    })
  })

  sleep(10 + Math.random() * 20)

  // 5 — Nexus social profile (portfolio, posts, connections)
  group("5_nexus_profile", () => {
    const res = http.get(
      `${BASE}/api/nexus/profile/${uid}`,
      { headers: auth, tags: { name: "nexus_profile" } }
    )
    check(res, { "nexus 200 or 404": r => [200, 404].includes(r.status) })
  })

  sleep(5 + Math.random() * 10)

  // 6 — ELO breakdown (verifies arena performance)
  group("6_elo_breakdown", () => {
    const res = http.get(
      `${BASE}/api/arena/v2/elo/${uid}`,
      { headers: auth, tags: { name: "elo_breakdown" } }
    )
    check(res, { "elo 200 or 404": r => [200, 404].includes(r.status) })
  })

  sleep(10 + Math.random() * 20)  // recruiter compares, takes notes
}
