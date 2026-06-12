# Capabilio Arena — Production Architecture v2

> **System owner perspective**: Arena is the proof engine of Capabilio. Every component
> decision below is made as if this is shipping to 10,000 concurrent users across 200
> Indian colleges, 50 hiring companies, and an open professional pool.

---

## 1. Product Role in Capabilio

```
Pulse   = visibility layer       (who sees you)
Nexus   = network layer          (who you know)
Launchpad = opportunities layer  (what's available)
Arena   = evidence layer         (what you can actually do)
```

Hiring decisions in Capabilio depend on Arena proof + broader skill signals — not
editable resume claims. Arena generates cryptographically-signed proof artifacts that
recruiters can verify with a single URL.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React 18)                        │
│                                                                   │
│  Arena.jsx (4-tab shell)                                         │
│  ├── [Tasks] ArenaCatalog + MissionPanel + WorkstationRouter     │
│  ├── [History] HistoryPanel  ← reads arena_submissions (live)    │
│  ├── [Leaderboard] LeaderboardWidget ← reads arena_leaderboard   │
│  └── [Streaks] ArenaStreaks  ← reads streak_events + profiles    │
│                                                                   │
│  Supabase Realtime channels for live leaderboard + history       │
└──────────────────────┬──────────────────────────────────────────┘
                       │ REST + Supabase Realtime
┌──────────────────────▼──────────────────────────────────────────┐
│                    Express Backend (server.js)                    │
│                                                                   │
│  /api/arena/catalog          Challenge browser API               │
│  /api/arena/challenges/:id/start  Begin attempt                  │
│  /api/arena/challenges/:id/submit Submit + evaluate              │
│  /api/arena/run              Sandboxed code execution            │
│  /api/arena/review           AI grading (Claude Haiku)           │
│  /api/arena/hint             Contextual hint (Groq fast)         │
│  /api/arena/daily            AI mission generation               │
│  /api/arena/streaks/:uid     Streak heatmap + stats              │
│  /api/arena/leaderboard      Scoped leaderboard                  │
│                                                                   │
│  Background workers (node-cron):                                 │
│  - ELO snapshot every 6h                                         │
│  - Leaderboard recompute every 30min                             │
│  - Streak check-in aggregator nightly                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Supabase JS (service role)
┌──────────────────────▼──────────────────────────────────────────┐
│                      Supabase (PostgreSQL)                        │
│                                                                   │
│  Core tables:                                                     │
│  profiles, arena_submissions, arena_leaderboard, arena_missions   │
│                                                                   │
│  New v2 tables:                                                   │
│  challenges, challenge_attempts, streak_events,                   │
│  leaderboard_snapshots, elo_history, proof_artifacts,            │
│  company_challenge_targets, challenge_saves                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 3.1 challenges — The Challenge Catalog

```sql
CREATE TABLE challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  type            TEXT NOT NULL,   -- dsa|sql|frontend|backend|fullstack|debugging|
                                   -- system_design|data_analyst|case_study|devops|
                                   -- cybersecurity|sap|finance|hr|product|ops
  domain          TEXT NOT NULL,   -- swe|frontend|backend|data|dba|cyber|devops|...
  difficulty      TEXT NOT NULL,   -- Easy|Medium|Hard|Expert
  estimated_mins  INT NOT NULL DEFAULT 30,
  elo_impact      INT NOT NULL DEFAULT 20,  -- ELO points at stake
  technologies    TEXT[] DEFAULT '{}',      -- ['React','TypeScript','PostgreSQL']
  skills          TEXT[] DEFAULT '{}',      -- ['Recursion','Binary Search']
  sandbox_type    TEXT NOT NULL,   -- code|sql|react|notebook|terminal|markdown|diagram
  language        TEXT,            -- TypeScript|Python|Java|Go|SQL|etc
  starter_code    TEXT,
  test_cases      JSONB DEFAULT '[]',       -- [{input,expected,description,hidden}]
  dataset_url     TEXT,            -- S3 URL for data challenges
  dataset_schema  JSONB,           -- column names/types for SQL challenges

  -- Company & visibility
  company_id      UUID REFERENCES companies(id),
  company_name    TEXT,
  company_logo    TEXT,
  is_company_sponsored BOOLEAN DEFAULT false,
  is_recruiter_visible BOOLEAN DEFAULT true,
  proof_type      TEXT DEFAULT 'code',  -- code|artifact|report|live_demo
  role_relevance  TEXT[],          -- ['SDE-2','Backend Engineer']

  -- Catalog metadata
  participation_count INT DEFAULT 0,
  solve_count    INT DEFAULT 0,
  status         TEXT DEFAULT 'active',  -- active|draft|archived|contest
  is_daily       BOOLEAN DEFAULT false,
  is_contest     BOOLEAN DEFAULT false,
  contest_end    TIMESTAMPTZ,
  deadline       TIMESTAMPTZ,
  source         TEXT DEFAULT 'capabilio', -- capabilio|company|college|community
  college_ids    TEXT[] DEFAULT '{}',  -- restricted to specific colleges
  tags           TEXT[] DEFAULT '{}',

  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_challenges_type     ON challenges(type);
CREATE INDEX idx_challenges_domain   ON challenges(domain);
CREATE INDEX idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX idx_challenges_status   ON challenges(status);
CREATE INDEX idx_challenges_company  ON challenges(company_id);
CREATE INDEX idx_challenges_elo      ON challenges(elo_impact DESC);
```

### 3.2 challenge_attempts — Per-Attempt Tracking

```sql
CREATE TABLE challenge_attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id),
  challenge_id     UUID NOT NULL REFERENCES challenges(id),

  -- Attempt lifecycle
  status           TEXT DEFAULT 'in_progress',  -- in_progress|submitted|evaluated|failed
  attempt_number   INT DEFAULT 1,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  submitted_at     TIMESTAMPTZ,
  evaluated_at     TIMESTAMPTZ,

  -- Submission content
  code_snapshot    TEXT,           -- final submitted code
  code_history     JSONB DEFAULT '[]', -- [{ts, content}] autosave snapshots
  proof_artifacts  JSONB DEFAULT '[]', -- [{type, url, name, size}]

  -- Evaluation results
  score            INT,            -- 0-100
  elo_delta        INT DEFAULT 0,
  execution_result JSONB,          -- {passed, total, runtime_ms, memory_kb, outputs:[]}
  test_results     JSONB,          -- [{case_id, passed, actual, expected}]
  feedback         JSONB,          -- {summary, strengths:[], improvements:[], rubric:[]}
  grade            TEXT,           -- A+|A|B+|B|C|D

  -- Context
  time_taken_secs  INT,
  is_timed_out     BOOLEAN DEFAULT false,
  recruiter_visible BOOLEAN DEFAULT true,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attempts_user      ON challenge_attempts(user_id, created_at DESC);
CREATE INDEX idx_attempts_challenge ON challenge_attempts(challenge_id);
CREATE INDEX idx_attempts_status    ON challenge_attempts(status);
```

### 3.3 streak_events — Daily Activity for Heatmap

```sql
CREATE TABLE streak_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  event_date      DATE NOT NULL,
  challenge_count INT DEFAULT 0,
  domains         TEXT[] DEFAULT '{}',  -- which domain types completed
  elo_gained      INT DEFAULT 0,
  is_freeze_used  BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, event_date)
);

CREATE INDEX idx_streak_user_date ON streak_events(user_id, event_date DESC);
```

### 3.4 elo_history — Full ELO Audit Trail

```sql
CREATE TABLE elo_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id),
  attempt_id   UUID REFERENCES challenge_attempts(id),
  elo_before   INT NOT NULL,
  elo_after    INT NOT NULL,
  delta        INT NOT NULL,
  dimension    TEXT NOT NULL DEFAULT 'overall',
  -- 'overall' | 'coding' | 'domain' | 'tech:react' | 'company:google' | 'contest'
  reason       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_elo_history_user ON elo_history(user_id, created_at DESC);
CREATE INDEX idx_elo_history_dim  ON elo_history(user_id, dimension);
```

### 3.5 leaderboard_snapshots — Multi-Scope Leaderboards

```sql
CREATE TABLE leaderboard_snapshots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type     TEXT NOT NULL,
  -- 'global'|'domain'|'college'|'batch'|'branch'|'company'|'contest'|'weekly'|'monthly'
  scope_id       TEXT NOT NULL,    -- domain key / college_id / company_id / etc
  user_id        UUID NOT NULL REFERENCES profiles(id),
  rank           INT NOT NULL,
  elo            INT NOT NULL,
  solve_count    INT DEFAULT 0,
  quality_score  NUMERIC(5,2) DEFAULT 0,
  streak_score   INT DEFAULT 0,
  momentum       NUMERIC(5,2) DEFAULT 0,
  proof_trust    NUMERIC(5,2) DEFAULT 0,
  snapshot_date  DATE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(scope_type, scope_id, user_id, snapshot_date)
);

CREATE INDEX idx_leaderboard_scope ON leaderboard_snapshots(scope_type, scope_id, snapshot_date, rank);
```

### 3.6 challenge_saves — Bookmarks

```sql
CREATE TABLE challenge_saves (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id),
  challenge_id UUID NOT NULL REFERENCES challenges(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);
```

### 3.7 proof_artifacts — Recruiter-Visible Proof

```sql
CREATE TABLE proof_artifacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id),
  attempt_id   UUID NOT NULL REFERENCES challenge_attempts(id),
  challenge_id UUID NOT NULL REFERENCES challenges(id),

  -- Artifact details
  artifact_type TEXT NOT NULL,  -- code|report|chart|sql_result|screenshot|video
  storage_url   TEXT NOT NULL,
  file_name     TEXT,
  file_size_kb  INT,
  mime_type     TEXT,

  -- Proof metadata
  challenge_title    TEXT,
  challenge_type     TEXT,
  skills_demonstrated TEXT[],
  technologies_used  TEXT[],
  score              INT,
  elo_change         INT,
  time_taken_secs    INT,
  attempts_count     INT,

  -- Trust & visibility
  is_recruiter_visible BOOLEAN DEFAULT true,
  trust_level         TEXT DEFAULT 'verified',  -- verified|ai_graded|self_reported
  public_proof_url    TEXT,  -- signed URL for sharing

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proof_user ON proof_artifacts(user_id, created_at DESC);
CREATE INDEX idx_proof_challenge ON proof_artifacts(challenge_id);
```

---

## 4. API Contract Map

### Challenge Catalog
```
GET  /api/arena/catalog
  Query: type, domain, difficulty, company_id, status, source,
         min_elo_impact, has_dataset, is_recruiter_visible, deadline_before,
         is_company_sponsored, sort_by[freshness|elo|popularity],
         page, limit, search
  Response: { challenges: Challenge[], total: number, page: number }

GET  /api/arena/challenges/:id
  Response: Challenge + test_cases (visible) + user_attempt_status

POST /api/arena/challenges/:id/save      -- toggle save
POST /api/arena/challenges/:id/start     -- create attempt record, return attempt_id
POST /api/arena/challenges/:id/submit    -- submit code, trigger evaluation pipeline
GET  /api/arena/challenges/:id/attempts  -- user's attempts for this challenge
```

### Code Execution
```
POST /api/arena/run
  Body: { code, language, test_cases, attempt_id }
  Response: { passed, total, results:[{case_id,passed,actual,expected,runtime_ms}], stdout, stderr }
  Notes: Calls Piston API (open source polyglot executor). Fallback: Judge0.
         30s timeout per execution. No filesystem writes allowed.
```

### History
```
GET  /api/arena/history
  Query: user_id, domain, type, difficulty, date_from, date_to, page, limit
  Response: { attempts: Attempt[], total: number }
```

### Streaks
```
GET  /api/arena/streaks/:uid
  Response: {
    current_streak, longest_streak, last_active_date,
    total_active_days, freeze_available, freeze_used_count,
    coding_streak, domain_streak,
    heatmap: [{ date, count, elo_gained, domains }],  -- last 52 weeks
    milestones: [{ days, label, icon, reached, reached_at }]
  }

POST /api/arena/streaks/record-activity
  Body: { user_id, domains, elo_gained }
  Notes: Called internally after every submission. Upserts streak_events.
```

### ELO
```
GET  /api/arena/elo/:uid
  Response: {
    overall: number,
    by_dimension: { coding, domain, frontend, backend, ... },
    history: [{ date, elo, delta, reason }],  -- last 90 days
    tier: { label, color, icon },
    rank_global: number,
    percentile: number
  }
```

### Leaderboard
```
GET  /api/arena/leaderboard
  Query: scope_type, scope_id, period[weekly|monthly|all_time], metric[elo|solve_count|quality], page, limit
  Response: {
    entries: [{ rank, user, elo, solve_count, quality_score, streak_score, momentum }],
    user_entry: { rank, ... },   -- caller's own position
    total: number
  }
```

### Recruiter / Company
```
GET  /api/arena/recruiter/candidates    -- filter candidates by score + challenge type
GET  /api/arena/recruiter/proof/:uid    -- all recruiter-visible proof for a user
POST /api/arena/company/challenges      -- create company challenge
GET  /api/arena/company/submissions     -- all submissions for company's challenges
```

---

## 5. ELO Computation Model

```javascript
/**
 * Arena ELO is computed per-submission using a modified Elo formula.
 * Multiple ELO dimensions are maintained separately.
 */
function computeEloUpdate({ userElo, challengeElo, score, attempts, timeTakenSecs, estimatedSecs }) {
  // Elo expected score (probability current player wins)
  const expected = 1 / (1 + Math.pow(10, (challengeElo - userElo) / 400))

  // Actual performance (normalized 0–1)
  const actual = Math.max(0, Math.min(1, score / 100))

  // K-factor: higher for newer players (more volatile), lower for established
  const K = userElo < 800 ? 48 : userElo < 1100 ? 36 : userElo < 1400 ? 28 : 20

  // Attempt penalty: 15% reduction per retry beyond the first
  const attemptMultiplier = Math.max(0.4, 1 - (Math.max(1, attempts) - 1) * 0.15)

  // Time efficiency bonus: completing faster than estimated earns up to +10%
  const timeRatio = estimatedSecs > 0 ? timeTakenSecs / estimatedSecs : 1
  const timeBonus = timeRatio < 0.5 ? 1.10 : timeRatio < 0.75 ? 1.05 : 1.00

  // Raw delta
  let delta = Math.round(K * (actual - expected) * attemptMultiplier * timeBonus)

  // Floor: passing (score≥70) always earns at least +3 ELO
  if (actual >= 0.7 && delta < 3) delta = 3

  // Cap loss at -30 per submission to prevent cliff drops
  if (delta < -30) delta = -30

  return {
    delta,
    newElo: Math.max(100, userElo + delta),
    breakdown: { expected, actual, K, attemptMultiplier, timeBonus }
  }
}

// Challenge ELO is assigned by difficulty:
const CHALLENGE_ELO = { Easy: 800, Medium: 1100, Hard: 1400, Expert: 1700 }
```

**ELO Dimensions maintained:**
- `overall` — global Arena ELO (shown everywhere)
- `coding` — DSA + debugging + code challenges
- `domain` — business/domain challenges
- `tech:{name}` — per-technology (react, postgres, python…)
- `company:{slug}` — company track performance
- `contest` — contest-specific ELO

---

## 6. Streak Computation Model

```javascript
/**
 * Streak rules:
 * - Active day = at least 1 submission on that calendar day (IST)
 * - Streak increments if today follows yesterday
 * - Freeze: user can freeze streak for 1 day (3 freezes/month on Pro)
 * - Recovery: if missed 1 day and has recovery token, restores streak
 */
function computeStreak(events, today, freezeCount) {
  if (!events.length) return { current: 0, longest: 0 }

  const sorted = [...events].sort((a,b) => new Date(b.date) - new Date(a.date))
  const dates = new Set(sorted.map(e => e.date))

  let current = 0, longest = 0, cursor = today

  for (let i = 0; i < 365; i++) {
    const d = offsetDate(cursor, -i)
    if (dates.has(d)) {
      current++
    } else if (i > 0 && freezeCount > 0) {
      // Allow 1-day gap if freeze available
      freezeCount--
      current++ // freeze consumed, streak preserved
    } else {
      break
    }
    if (current > longest) longest = current
  }

  return { current, longest }
}
```

**Streak Milestones:**
```
3 days   → Ignition 🔥
7 days   → Weekly Warrior ⚔️
14 days  → Fortnight Focus 💎
30 days  → Monthly Master 🏆
60 days  → Iron Streak 🦾
100 days → Century Club 💯
```

---

## 7. Execution Sandbox Model

### Coding Challenges
- **Executor**: [Piston API](https://github.com/engineer-man/piston) — open source, polyglot, sandboxed
- **Fallback**: Judge0 CE (self-hosted or API)
- **Timeout**: 10s per test case, 30s total per submission
- **Memory**: 256MB cap
- **Supported languages**: C, C++, Java, Python3, JavaScript/Node, Go, Rust, TypeScript, SQL, Bash
- **No filesystem writes** outside /tmp; no network access inside sandbox
- **stdin/stdout model**: each test case sends stdin, captures stdout, compares to expected

### SQL Challenges
- **Executor**: Supabase Edge Function with per-challenge Postgres schema
- **Isolation**: Each challenge runs in `challenge_{slug}` schema with read-only grants
- **Dataset**: Pre-loaded as seeded tables in isolated schemas

### Frontend/React Challenges
- **Model**: iframe sandbox with `srcdoc` injection + CSP
- **Preview**: React rendered via esm.sh CDN in the sandboxed iframe
- **Security**: `sandbox="allow-scripts"` only; parent PostMessage protocol

### Notebook/Python Challenges
- **Model**: Pyodide (Python in WebAssembly) for safe in-browser execution
- **Libraries available**: pandas, numpy, matplotlib (pure Python + WASM builds)
- **Output**: stdout captured, matplotlib figures as base64 PNG

---

## 8. Proof Model — Every Submission Creates a Proof Artifact

```
Challenge Completed
        │
        ▼
┌─────────────────────────────┐
│     proof_artifacts record  │
│                             │
│  challenge_title            │
│  challenge_type             │
│  skills_demonstrated[]      │
│  technologies_used[]        │
│  score (0-100)              │
│  elo_change                 │
│  time_taken_secs            │
│  attempts_count             │
│  trust_level: "verified"    │
│  public_proof_url (signed)  │
└─────────────────────────────┘
        │
        ▼
Recruiter sees it at:
/recruiter/candidates/:uid/proof
```

Trust levels:
- `verified` — passed hidden test cases (score ≥ 70 + hidden tests pass)
- `ai_graded` — AI evaluation only (no hidden tests)
- `self_reported` — user uploaded artifact, pending review

---

## 9. Leaderboard Computation Strategy

Leaderboards are NOT computed per-request. They are:
1. Snapshotted every 30 minutes by a background job (node-cron)
2. Stored in `leaderboard_snapshots` with composite scope key
3. Served from snapshot table with O(1) rank lookup
4. Real-time rank shown from snapshot + delta for current user

**Composite score for ranking:**
```
rank_score = (elo * 0.5) + (solve_count * 10 * 0.2) + (quality_avg * 3 * 0.2) + (streak_score * 0.1)
```

**Leaderboard Scopes:**
- `global` / all domains combined
- `domain:{key}` — domain-specific (frontend, backend, data…)
- `college:{id}` — restricted to college members
- `batch:{college_id}:{year}` — graduation year cohort
- `branch:{college_id}:{branch}` — e.g. CSE, ECE
- `company:{id}` — participants in company challenge
- `contest:{id}` — live contest
- `weekly` / `monthly` — rolling time window

---

## 10. College Analytics Model

For each college, Capabilio maintains:
```
/api/college/:id/arena-analytics
→ {
    active_students_7d,      -- students with ≥1 submission in last 7 days
    elo_distribution: {      -- histogram buckets
      "400-600": n, "600-800": n, ...
    },
    branch_readiness: [      -- per-branch averages
      { branch, avg_elo, avg_solve_count, job_ready_pct }
    ],
    skill_map: {             -- aggregated skill strengths
      strong: [skill],       -- avg score > 75
      weak:   [skill]        -- avg score < 50
    },
    company_track_readiness: [ -- readiness for active company challenges
      { company, track, ready_count, total }
    ],
    top_performers: [...],
    recruiter_ready_pool: [...],  -- students with ELO > threshold + proof
    participation_rate_7d: pct,
    weekly_trend: [{ week, active, completions, avg_elo }]
  }
```

---

## 11. Permissions Model

```
user role     → can: view own profile, submit challenges, view global leaderboard
recruiter     → can: view recruiter-visible proof, filter candidates, shortlist, schedule interviews
company_admin → can: create company challenges, set targeting, review submissions
college_admin → can: view college analytics, assign challenges to cohort, see batch leaderboard
platform_admin→ can: all
```

Row-Level Security on Supabase:
- `challenge_attempts` — `user_id = auth.uid()` for writes
- `proof_artifacts` — readable if `is_recruiter_visible = true` for recruiter role
- `challenges` — readable by all authenticated; writeable by company_admin/platform_admin
- `leaderboard_snapshots` — readable by all (public proof of rank)

---

## 12. Rate Limiting

```
POST /api/arena/run         → 30 req/min per user (execution is expensive)
POST /api/arena/daily       → 10 req/min per user
POST /api/arena/review      → 20 req/min per user
GET  /api/arena/catalog     → 100 req/min per user (cached, cheap)
GET  /api/arena/leaderboard → 60 req/min (served from snapshot, cheap)
```

Implemented via express-rate-limit middleware with Redis store in production.

---

## 13. Caching Strategy

```
challenge catalog           → Redis 5min TTL (invalidated on write)
leaderboard snapshots       → Redis 1min TTL (async recompute every 30min)
user ELO history (90 days) → Redis 2min TTL
challenge detail            → Redis 10min TTL (static content)
streak heatmap (past weeks) → Redis 15min TTL (current week invalidated on activity)
```

---

## 14. Failure Handling

| Failure | Handling |
|---------|----------|
| AI review API down | Fallback to rule-based scorer (line count + test pass %) |
| Piston executor timeout | Return partial results + timeout flag |
| Supabase write fails | Queue retry with exponential backoff (in-memory) |
| Leaderboard compute fails | Serve stale snapshot + show "Last updated Xm ago" |
| Challenge generation fails | Show 3 cached fallback challenges per domain |

---

## 15. Local Development

```bash
# 1. Backend
cd capabilio-web
cp server.env.example .env
# Set: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, ANTHROPIC_API_KEY
npm run dev:all    # starts React on :3000 + Express on :4000

# 2. Run Arena v2 migration
psql $DATABASE_URL < supabase-arena-v2-migration.sql
# Or paste into Supabase SQL editor

# 3. Seed challenge catalog (optional, backend auto-seeds if table empty)
psql $DATABASE_URL < arena-seed-challenges.sql
```

## 16. Production Deployment

```
Frontend: Vercel (vite build → static CDN)
Backend:  Render.com (server.js on Node 20)
Database: Supabase (managed PostgreSQL)
Media:    Supabase Storage (proof artifacts, datasets)
Execution: Piston API (self-hosted on Fly.io for cost control)
```

---

*Architecture v2 — Capabilio Arena. Last updated June 2026.*
