# Capabilio Production Readiness Suite — k6

A complete load-testing suite that tells you whether Capabilio can handle 10,000
students across multiple colleges — not just whether a single journey works at 150 VUs.

---

## Files

| File | What it tests | VU budget |
|------|--------------|-----------|
| `config.js` | Shared config, scale stages, SLOs | — |
| `journey-arena.js` | Arena session (daily → challenge → run → submit) | up to 20,000 |
| `journey-dashboard.js` | Aura dashboard (health → jobs → leaderboard → catalog → ELO) | up to 20,000 |
| `journey-onboarding.js` | Full onboarding (role search → MCQ → assessment → launchpad) | up to 20,000 |
| `journey-skill-studio.js` | Skill Studio (resources → YouTube → AI lesson → roadmap → Arena) | up to 20,000 |
| `journey-ai-interview.js` | AI Interview (start → questions → answers × 5 → complete) | **dev/college-pilot only** |
| `journey-recruiter.js` | Recruiter (candidate list × 2 pages → proof → profile → ELO) | up to 20,000 |
| `journey-placement-officer.js` | TPO workflow (leaderboard → catalog × branches → jobs → search) | up to 20,000 |
| `mixed-traffic.js` | **The gate** — realistic traffic mix across all 8 user types | up to 50,000 |
| `resilience.js` | Failure injection (cold start, expired JWT, malformed body, duplicates, rate limits) | fixed VUs |

---

## Scale stages

Never jump stages. Each stage is a gate. Only advance when **all thresholds pass**.

| Stage | Peak VUs | Purpose |
|-------|----------|---------|
| `smoke` | 1 | Sanity check after every deploy |
| `dev` | 20 | Developer testing on local/staging |
| `college-pilot` | 100 | Single lab or classroom |
| `department` | 500 | One department |
| `college` | 2,000 | Entire college session |
| `multi-college` | 5,000 | 3–4 colleges simultaneously |
| `target` | 10,000 | Expected peak rollout |
| `stress` | 20,000 | 2× target — find first crack |
| `breakpoint` | 50,000 | Infrastructure ceiling |

The stage where you first see a threshold breach **is your current ceiling**.
Fix that bottleneck before moving to the next stage. Do not claim 10,000-user
readiness until `mixed-traffic.js` at STAGE=target passes cleanly.

---

## Prerequisites

```bash
brew install k6
# or: https://k6.io/docs/getting-started/installation/
```

Get a JWT:
```js
const { data } = await supabase.auth.signInWithPassword({ email, password })
console.log(data.session.access_token)
```

---

## Recommended test order

### 1. Smoke — after every deploy
```bash
k6 run --env TARGET=https://capabilio-server.onrender.com \
       --env JWT=<token> --env STAGE=smoke \
       load-tests/k6/journey-dashboard.js
```

### 2. Individual journeys at college-pilot
Run each journey separately to isolate bottlenecks before mixing traffic:

```bash
for script in journey-onboarding journey-dashboard journey-arena journey-skill-studio journey-recruiter journey-placement-officer; do
  k6 run --env TARGET=https://capabilio-server.onrender.com \
         --env JWT=<token> --env UID=<uid> --env STAGE=college-pilot \
         load-tests/k6/$script.js
done
```

AI Interview separately (LLM concurrency is different):
```bash
k6 run --env TARGET=... --env JWT=<token> --env STAGE=dev \
       load-tests/k6/journey-ai-interview.js
```

### 3. Resilience (always before a college goes live)
```bash
k6 run --env TARGET=https://capabilio-server.onrender.com \
       --env JWT=<token> --env EXPIRED_JWT=<old_token> \
       load-tests/k6/resilience.js
```

### 4. Mixed traffic — the gate (advance stage by stage)
```bash
# Start here:
k6 run --env TARGET=... --env JWT=<token> --env UID=<uid> \
       --env STAGE=college-pilot load-tests/k6/mixed-traffic.js

# If all thresholds pass, advance:
k6 run ... --env STAGE=department ...
k6 run ... --env STAGE=college ...
# Stop when you see the first breach — that's your ceiling.
```

---

## SLOs (pass/fail thresholds)

| Metric | Threshold | Notes |
|--------|-----------|-------|
| HTTP error rate | < 1% | All endpoints |
| p95 latency — non-AI | < 2,000 ms | |
| p95 latency — AI grading | < 8,000 ms | `/api/arena/review` |
| p95 latency — AI lesson | < 6,000 ms | `/api/skill-studio/lesson` |
| p95 latency — AI interview | < 8,000 ms | `/api/pro/interview/:id/answer` |
| p95 latency — cold start | < 65,000 ms | Render dyno wake |
| p95 latency — leaderboard | < 1,500 ms | |
| p95 latency — catalog | < 2,000 ms | JOIN-heavy |
| p95 latency — health | < 500 ms | |
| Resilience unexpected 500s | < 5 total | |
| AI rate limit hits | < 5 at college-pilot | Expected to grow at college+ |

k6 exits with code 99 on any threshold breach — safe to wire into CI.

---

## What to monitor during every test

Don't just read k6's summary. Open these dashboards simultaneously:

| System | What to watch |
|--------|--------------|
| Render dashboard | CPU %, memory, request queue depth, response time |
| Supabase dashboard | DB CPU, slow queries (> 100ms), connection count, query volume |
| Supabase logs | Error logs, RLS policy hits, timeout errors |
| Upstash Redis | Rate limiter hit count, memory usage |
| Groq/Claude console | Request count, rate limit errors, latency histogram |
| k6 terminal | p95/p99 per endpoint, error rate, VU count |

**If you don't have these dashboards open, you won't know WHY performance degrades.**
You'll only know that it did.

---

## Common failure patterns and fixes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `catalog_latency` breaches 2s above 500 VUs | Missing index on `(career_track_slug, difficulty)` in `problems` | Add composite index |
| `ai_rate_limits` counter spikes | Groq free tier (30 req/min) | Upgrade to paid tier or add queue |
| `mixed_total_errors` rate climbs above 1% | Node.js clustering not distributing correctly | Check `server.js` cluster config |
| `cold_start` > 65s | Render dyno sleeping | Add keep-alive cron (GitHub Actions ping every 14 min) |
| `recruiter_list` breaches 2s | No index on `profiles(keyword, elo_rating)` | Add index from migration P2-1 |
| 429s on Arena submit | Rate limiter too aggressive | Tune per-user rate limit in Upstash config |

---

## Streams covered

All 8 student populations represented in every test:
IT · ECE · EEE · Mechanical · Civil · IoT · Pharmacy · MBA · Medical Coding

---

## Claiming 10,000-user readiness

You can claim it when **all three** of these are true:

1. `mixed-traffic.js` at `STAGE=target` (10,000 VUs) passes all thresholds
2. No bottleneck observed in DB CPU, Render CPU, or AI rate limits during that run
3. `resilience.js` passes (unexpected 500s < 5, cold start recovered within 65s)

Until then, you have evidence that **specific journeys work at specific concurrency levels**
— which is valuable, but not the same claim.
