# 🧠 Capabilio — Product & Architecture Wiki

> **What this is:** The complete internal knowledge base for Capabilio — product philosophy, system design, module specs, data models, and implementation logic. Built to be read in Notion. Every section links forward and back.

---

> 📌 **START HERE** — If you're new, read sections 1 → 3 → 5 → 8 in that order. That gives you the full mental model in ~20 minutes.

---

## 📚 Navigation

| # | Section | What It Covers |
|---|---------|----------------|
| 1 | [Product Overview](#1--product-overview) | What Capabilio is in one page |
| 2 | [Core Problem](#2--core-problem) | Why this product needs to exist |
| 3 | [Target Users](#3--target-users) | 4 paths, 4 personas |
| 4 | [Product Philosophy](#4--product-philosophy) | 6 principles that drive every decision |
| 5 | [Product Paths](#5--product-paths) | Student / Professional / Executive / Org |
| 6 | [Navigation Model](#6--navigation-model) | 3-layer nav, header structure |
| 7 | [Module Map](#7--module-map) | All modules at a glance |
| 8 | [Arena](#8--arena) | Execution engine — workstations, missions, scoring |
| 9 | [Aura](#9--aura) | Identity layer — skill graph, proof, gaps |
| 10 | [Skill Studio](#10--skill-studio) | Learning engine — paths, lessons, quizzes |
| 11 | [Launchpad](#11--launchpad) | Job matching and recruiter visibility |
| 12 | [Verification & Trust](#12--verification--trust) | 5-tier trust system |
| 13 | [Data Model](#13--data-model) | Core tables and relationships |
| 14 | [API Reference](#14--api-reference) | Every endpoint |
| 15 | [Event Flows](#15--event-flows) | How things connect end to end |
| 16 | [User Journeys](#16--user-journeys) | Riya (student) and Arjun (professional) |
| 17 | [Recruiter Journeys](#17--recruiter-journeys) | How recruiters use the platform |
| 18 | [Role & Skill System](#18--role--skill-system) | Domain map, normalization, skill lists |
| 19 | [ELO & Proof System](#19--elo--proof-system) | How ELO is computed, decays, and generates proof |
| 20 | [Recommendation Engine](#20--recommendation-engine) | Challenge, learning, and job recommendations |
| 21 | [Frontend Architecture](#21--frontend-architecture) | React structure, design system |
| 22 | [Backend Architecture](#22--backend-architecture) | Express, Gemini, Supabase |
| 23 | [Screen References](#23--screen-references) | Wireframe descriptions for every major screen |
| 24 | [Build Order](#24--build-order) | 10 phases, 20 weeks |
| 25 | [Risks & Extensions](#25--risks--extensions) | What to watch, what comes next |

---

## 1 · Product Overview

> 💡 **One-line definition:** Capabilio is an AI Career OS that replaces résumé-based hiring with live skill proof — timestamped, AI-scored, and recruiter-readable.

Capabilio is built for Indian talent. It is not a job board. Not a course platform. Not a résumé builder. It is the **infrastructure layer between a person's actual skills and the job market's perception of them**.

### The Platform at a Glance

| Layer | Module | Job |
|-------|--------|-----|
| Execution | **Arena** | Live challenges in real workspaces → Proof |
| Identity | **Aura** | Skill graph, ELO, vault, career profile |
| Learning | **Skill Studio** | AI-generated role-specific learning paths |
| Opportunity | **Launchpad** | Job matching, recruiter discoverability |
| Signal | **Pulse** | Market trends, ELO decay tracking |
| Trust | **Verification** | Cert validation, experience checks |
| Recruiter | **Org Tools** | Search, pipeline, team intelligence |

---

## 2 · Core Problem

> ⚠️ **The problem isn't that people lack skills. It's that the system can't see them.**

### From the candidate side
- Freshers with strong real skills get filtered by ATS before a human ever looks at them
- Professionals who upskilled outside formal jobs have no signal to show it
- Non-tier-1 college students are systematically deprioritized — by institution, not by ability
- Résumés describe what someone *claims*, not what they can *do*

### From the recruiter side
- 40–70% of screening time is spent on candidates who fail basic technical checks
- Skill assessment tools (HackerRank, LeetCode) measure algorithms, not job-function execution
- No standard signal exists for "this person can actually do the role"

### What exists today

| Product | What it does | What's missing |
|---------|-------------|----------------|
| Naukri, LinkedIn | Profile-based job matching | No proof layer |
| HackerRank, LeetCode | Algorithmic assessments | Not role-function specific |
| Coursera, Udemy | Certifications | Certificates ≠ execution proof |
| Canva/Zety | Better résumé formatting | Same unverifiable claims |

> 🚫 None of these create a **persistent, verifiable, role-specific skill identity** that updates continuously. Capabilio does.

---

## 3 · Target Users

### 🎓 Student Path — "Build Me"

| | |
|--|--|
| **Who** | Engineering students, bootcamp graduates, 0–2 year experience |
| **Pain** | No work experience → no interviews → no experience |
| **Need** | Proof-of-work portfolio before the job market |
| **Value** | Arena simulates real job tasks. Proof artifacts replace work experience. |
| **ELO start** | 400 |

### 💼 Professional Path — "Position Me"

| | |
|--|--|
| **Who** | Working professionals 2–10 years, role/company switchers |
| **Pain** | Résumé reflects past roles, not current capability |
| **Need** | Reposition for a new role with current-skill proof |
| **Value** | Skill Graph shows real domain strength. Launchpad surfaces matching jobs. |
| **ELO start** | 500–650 (resume-calibrated) |

### 🏆 Executive Path — "Steer Outcomes"

| | |
|--|--|
| **Who** | Senior professionals 10+ years, leads, CTOs, VPs |
| **Pain** | Standard tech assessments are irrelevant to their work |
| **Need** | Communicate strategic capability, not just technical skill |
| **Value** | Case Study Arenas, Authority Profile format, outcome-based proof |
| **ELO start** | 800+ |

### 🏢 Organization Path — "Run the Institution"

| | |
|--|--|
| **Who** | Hiring companies, universities, staffing firms |
| **Pain** | No unified way to assess, track, or benchmark skill at scale |
| **Need** | Internal skill mapping, hiring pipelines, cohort evaluation |
| **Value** | Org-level analytics, challenge deployment, team ELO benchmarking |

---

## 4 · Product Philosophy

> 🧭 These 6 principles override every design, architecture, and UX trade-off. When in doubt, come back here.

### ① Proof Over Claims
Every major feature must produce a verifiable artifact. A lesson is not a credential. A challenge *executed and scored* is. **The system rewards doing, not watching.**

### ② Role-First Identity
Capabilio does not build a generic "tech person." Every user is developing skill in a specific role context. The role shapes challenges, skill graph, gap analysis, and recommendations.

### ③ India-First Realism
Salary bands, company names, and market signals are India-specific. "Full stack at a startup" in Bengaluru ≠ the same in San Francisco. The system knows the difference.

### ④ ELO as Live Identity
ELO decays without activity, reflects actual performance, and is role-anchored. **ELO 780 for Data Analyst means something precise** — demonstrated through repeated AI-scored challenge execution.

### ⑤ Recruiter Trust by Design
Proof artifacts are designed to be readable by a recruiter **in under 2 minutes**, without requiring translation. They should see exactly what the person can do.

### ⑥ Zero-Friction Architecture
A student who lands on Capabilio should complete a meaningful challenge, generate a Proof artifact, and see their ELO update — **all within 20 minutes, on Day 1.**

---

## 5 · Product Paths

> 🗺️ Each path is a complete product experience. They share infrastructure (ELO, Proof, Arena, Aura) but differ in navigation, module emphasis, assessment types, and profile format.

### Path 1: Student — "Build Me"

```
Onboarding → select domain → Skill Studio gap suggestions
Arena → daily challenges → Proof generated
Aura → skill graph updates → ELO adjusts
Launchpad → role-readiness check → opportunity match
```

**ELO range:** 400–800 (pre-employment benchmark)
**Profile focus:** Proof artifacts, challenge history, skill graph, domain readiness

---

### Path 2: Professional — "Position Me"

```
Upload résumé → AI extracts experience + skills → Aura auto-builds
Skill Gap analysis → target role → Studio generates plan
Arena → execute challenges in target domain → Proof builds
Launchpad → set availability → recruiters can find profile
```

**ELO range:** 600–900+
**Profile focus:** Career trajectory, verified experience, current-skill proof

---

### Path 3: Executive — "Steer Outcomes"

```
Authority Profile format (different layout from standard)
Case Study Arenas, Strategic Design challenges
Signal Rooms, peer network, influence visibility
Senior role matching, board/advisory visibility
```

**ELO start:** 800+
**Profile focus:** Outcomes delivered, teams built, strategic decisions

---

### Path 4: Organization — "Run the Institution"

```
Org admin account → team onboarding
Deploy benchmark challenges to cohort
View aggregate ELO + proof data
Skill gap per team / per department
```

**Access model:** Org accounts are separate from personal. Org admin deploys challenges and views analytics.

---

## 6 · Navigation Model

> 🧭 3 layers, always visible, never lose your place.

```
LAYER 1: PATH SELECTOR (persistent top bar)
  Aura | Arena | Pulse | Skill Studio | Launchpad

LAYER 2: CORE PAGES (left nav or top tab row, path-specific)
  Example (Aura): Dashboard | Career & Vault | Skills | AI Interview | Skill Gaps | Resilience | Code DNA | Settings

LAYER 3: TABS (contextual inside each page)
  Example (Skills): Skill Graph | Assessments | Certifications | Learning Path
```

### Header Structure

```
[Capabilio AI logo]  [L1: Aura · Arena · Pulse · Studio · Launchpad]   [ELO badge]  [Avatar | Name]
────────────────────────────────────────────────────────────────────────────────────────────────────
[L2: Dashboard | Career & Vault | Skills | AI Interview | Skill Gaps | Resilience | Code DNA | Settings]
```

> 📌 **ELO badge is always visible in the header.** It updates in real time after challenge completions.

### Mobile Nav
- Layer 1 → bottom nav bar (5 icons max)
- Layer 2 → scrollable horizontal pill row
- Layer 3 → accordion

---

## 7 · Module Map

```
┌──────────────────────────────────────────────────────────────┐
│                      CAPABILIO PLATFORM                      │
├─────────┬──────────┬────────────┬─────────────────────────── ┤
│  ARENA  │   AURA   │   STUDIO   │       LAUNCHPAD            │
│         │          │            │                            │
│ 18      │ Skill    │ Lessons    │ Job matching               │
│ worksta │ Graph    │ Paths      │ Recruiter visibility       │
│ tions   │ Vault    │ Quizzes    │ Apply tracking             │
│ Missions│ Identity │ MCQs       │ Role readiness             │
│ ELO     │ Profile  │            │                            │
├─────────┴──────────┴────────────┴────────────────────────────┤
│                   SHARED INFRASTRUCTURE                      │
│   ELO Engine · Proof Store · Verification · AI Scoring       │
│   Skill Graph · Role System · Auth · Analytics               │
└──────────────────────────────────────────────────────────────┘
```

---

## 8 · Arena

> ⚔️ **Arena is where skill gets proven.** Not watched. Not claimed. Executed, scored, timestamped, and stored as Proof.

### What It Is
Real-time execution environment modeled on actual tasks at Indian tech companies (Swiggy, Razorpay, Zepto, PhonePe). Output is AI-scored, timestamped, and becomes a Proof Artifact on the Aura profile.

---

### 18 Workstations

| Workstation | Domain | Runtime |
|------------|--------|---------|
| Code IDE | SWE / General | Pyodide (Python) · Monaco editor |
| Frontend Sandbox | Frontend Dev | React live preview, CSS |
| API Workstation | Backend Dev | Mock server, request builder |
| **SQL Lab** | Data / DBA | **sql.js WASM (real SQLite in browser)** |
| **Notebook Lab** | Data Science | **Pyodide (real Python in browser)** |
| BI Dashboard Studio | BI Analyst | Charting primitives, SQL layer |
| Data Pipeline Studio | Data Engineering | DAG view, Python ETL |
| Infra Terminal | DevOps | Simulated bash, YAML editor |
| Cloud Arch Lab | Cloud Engineering | Architecture canvas, service cards |
| SRE Console | SRE / Platform | Prometheus-style metrics, SLO editor |
| Security Console | Cybersecurity | Log viewer, vulnerability simulation |
| SOC Console | SOC / IR | SIEM simulation, alert triage |
| QA Lab | QA Engineering | Playwright-style test editor |
| BA Board | Business Analysis | PRD template, user story builder |
| Product Strategy | Product Management | Roadmap canvas, RICE scoring |
| Mobile Studio | Mobile Dev | React Native preview, device frame |
| AI/LLM Studio | AI/ML Engineering | Prompt editor, token counter |
| System Design | Architecture | Canvas, component cards, flow arrows |

> ⚠️ **Critical rule:** All code-executing workstations must use real runtimes. SQL Lab uses `sql.js`. Notebook Lab uses `Pyodide`. **No faked or hardcoded output ever.**

---

### Mission Structure

```json
{
  "id": "sql-cohort-swiggy-q3",
  "title": "Cohort Retention Analysis",
  "company": "Swiggy",
  "difficulty": "Medium",
  "type": "Data Analysis",
  "scenario": "Swiggy's growth team noticed a 12% drop in 90-day retention...",
  "taskDescription": "Write a SQL cohort query for 30/60/90-day retention...",
  "workstation": "sql",
  "starterCode": "-- Dataset: swiggy_orders\nSELECT ...",
  "eloGain": 18,
  "timeLimit": 40,
  "rubric": {
    "correctOutput": 40, "queryEfficiency": 20,
    "codeStyle": 20, "explanation": 20
  }
}
```

---

### Mission Generation Flow

```
User opens Arena
    ↓
Check arena_missions for today's unfinished missions
    ↓
None exist → POST /api/arena/daily → Gemini generates Easy / Medium / Hard
    ↓
Missions stored in arena_missions table (sticky until midnight IST)
    ↓
Served to frontend
```

> 📌 Missions are **sticky** — generated once, not regenerated per visit. This prevents prompt waste and ensures consistency within a session.

---

### Submission & Scoring Flow

```
User submits solution
    ↓
POST /api/arena/submit
    ↓
AI Scoring (Gemini): correctness + efficiency + style + explanation
    ↓
Score (0–100) returned
    ↓
ELO delta computed → ELO updated
    ↓
arena_history row inserted (immutable)
    ↓
Proof artifact created
    ↓
Frontend: score + ELO animation + proof badge
```

---

### Scoring Rubric

| Category | Weight | What It Checks |
|----------|--------|----------------|
| Correctness | 40% | Output matches expected |
| Efficiency | 20% | Approach is appropriately optimal |
| Code Quality | 20% | Naming, structure, readability |
| Explanation | 20% | User can explain what they built |

---

## 9 · Aura

> ✦ **Aura is the user's persistent skill identity.** It's what a recruiter sees. It aggregates everything into one recruiter-readable profile.

### 7 Tabs

| Tab | Contents |
|-----|---------|
| **Dashboard** | ELO trend, positioning statement, top strengths, portfolio link |
| **Career & Vault** | Experience timeline, projects, uploaded documents |
| **Skills** | Skill graph radar, scores, sources, assessment trigger |
| **AI Interview** | Voice/text mock interview, STAR scoring, history |
| **Skill Gaps** | Market demand vs user skills, critical gaps, top action |
| **Resilience** | Failure résumé, recovery rate, resilience score |
| **Code DNA** | GitHub analysis, language breakdown, commit patterns |

---

### Skill Graph — Technical Detail

Stored as JSON in `profiles.skill_graph`:

```json
[
  { "label": "SQL", "value": 87, "source": "arena" },
  { "label": "Python", "value": 92, "source": "assessment" },
  { "label": "dbt", "value": 0, "source": "gap" },
  { "label": "Dashboard Design", "value": 100, "source": "arena" }
]
```

**Score update rules:**

| Event | Update Rule |
|-------|------------|
| Arena submission | Weighted avg of previous + new score |
| Assessment | Replace with assessment score |
| Manual entry | Set to 30 (self-claimed tier) |
| Resume extraction | Set to 30 (starting point) |
| 30+ days no activity | Decay 2pts/day (cap −30, floor 20) |

---

### Skill Gap Analysis — Data Flow

```
User opens Skill Gaps tab
    ↓
generateMockSkillGap() runs locally (instant, always works)
    → reads skillGraph → matches domain → computes gaps vs hardcoded market benchmarks
    ↓
Simultaneously: POST /api/skill-gap (Gemini + Google Search grounding)
    → returns live market data (real skill names, demand %, growth)
    ↓
Validate live data:
    → filter out "Not provided" / empty / placeholder skill names
    ↓
If valid:
    → build sgMap from skillGraph
    → getScore() fuzzy-matches each live skill → real user score
    → urgentGaps = live skills where userScore < 70
    → recompute topAction + competitiveIn from finalUrgent
    ↓
If invalid or API fails:
    → use localBase (always accurate, domain-specific)
    ↓
Render 3-column gap UI
```

---

## 10 · Skill Studio

> 📚 **Studio prepares users to succeed in Arena.** Arena asks "can you do this?" Studio says "here's how to get there."

### Learning Path Structure

```json
{
  "phases": [{
    "phase": 1, "title": "SQL Mastery", "duration": "3 weeks",
    "focus": "Close SQL gap — you're at 42%, market needs 81%",
    "actions": [
      { "type": "learn", "skill": "Window Functions", "xp": 30 },
      { "type": "practice", "skill": "Window Functions", "xp": 50 },
      { "type": "prove", "skill": "Window Functions", "xp": 80 }
    ]
  }],
  "totalDuration": "8 weeks",
  "expectedEloGain": 150
}
```

### Action Types

| Type | Description | Duration |
|------|-------------|----------|
| `learn` | AI-generated lesson (5–15 min) | ~1 week per skill |
| `practice` | Exercises + quizzes | ~1 week per skill |
| `prove` | Go do it in Arena | ~0.5 week |

### Lesson Structure

Each lesson is a micro-learning unit with:
- Objective (1 sentence)
- 2–4 content sections with code examples
- Key points callout
- Mini quiz (2–3 questions)
- Practice task
- "Next Topics" links

---

### MCQ Assessment — 5 Question Types

| Type | Description |
|------|-------------|
| `mcq` | Standard 4-option multiple choice |
| `code_output` | "What does this code print?" with short snippet |
| `problem_solving` | Scenario-based reasoning |
| `scenario` | Real-world situation analysis |
| `fill_blank` | Complete the code or sentence |

---

## 11 · Launchpad

> 🚀 **Launchpad connects skill identity to real opportunities.**

### Student View — Readiness Check

```
✅ ELO above 500 (minimum for entry-level)
✅ 5+ Proof Artifacts in target domain
⚠️  SQL score 42% — below 70% threshold for Data Analyst roles
✅ Portfolio URL generated and public
```

### Matching Logic

```
Step 1: Role eligibility
  ELO ≥ role minimum?
  3+ proof artifacts in domain?
  "Open to opportunities" enabled?

Step 2: Skill match score
  For each required skill:
    ≥ 70% → full match (1.0)
    40–70% → partial match (0.5)
    < 40% → no match (0.0)
  matchScore = (fullMatches × 1.0 + partialMatches × 0.5) / total

Step 3: Rank
  Sort by: matchScore × 0.6 + eloProximity × 0.4
```

### Recruiter Discoverability Conditions

> A candidate profile appears in recruiter search only if **all 3** are true:
> 1. "Open to opportunities" toggle is ON
> 2. ELO meets minimum threshold for the role
> 3. Profile has ≥ 3 Proof artifacts

---

## 12 · Verification & Trust

> 🔒 **Capabilio's value depends on trust.** The verification system makes skill claims credible.

### 5-Tier Trust System

| Tier | Label | How Achieved | Badge |
|------|-------|-------------|-------|
| 0 | Unverified | No action | — |
| 1 | Self-Claimed | User entered | Grey |
| 2 | Document-Verified | Doc uploaded + AI parsed | Blue |
| 3 | Cert-Verified | Cert ID checked vs issuer | Gold ⭐ |
| 4 | Arena-Proven | Live challenge execution | Orange 🔥 |
| 5 | Peer-Reviewed | Reviewed by verified professional | Purple 💎 |

### Certification Verification — Supported Providers

AWS · Google Cloud · Microsoft · Salesforce · CompTIA

### Proof Artifact Integrity — Non-Negotiables

> 🔒 Every Arena submission is:
> - **Timestamped server-side** (not client-side)
> - **Scored by AI** (not by the user)
> - **Stored in append-only** `arena_history` table
> - **Cannot be deleted or modified** by the user

---

## 13 · Data Model

> 🗄️ Core tables. Every entity below is referenced by multiple modules.

### Entity Relationship

```
profiles (1) ─── (N) arena_history
profiles (1) ─── (N) arena_missions
profiles (1) ─── (1) profiles.skill_graph [JSON]
profiles (1) ─── (N) certifications
profiles (1) ─── (N) assessment_results
org_profiles (1) ─── (N) hiring_pipelines
recruiters (1) ─── (N) candidate_shortlists
```

---

### `profiles` — Key Columns

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | = Supabase auth user ID |
| `path` | TEXT | student / professional / executive / org |
| `keyword` | TEXT | User's role: "Data Analyst" |
| `domain` | TEXT | Domain key: "data" |
| `elo_rating` | INT | Current ELO (default 400) |
| `elo_history` | JSONB | `[{date, elo}]` — last 30 entries |
| `skill_graph` | JSONB | `[{label, value, source}]` |
| `experiences` | JSONB | Professional history array |
| `vault_files` | JSONB | Uploaded documents |
| `plan` | TEXT | free / pro / team |

---

### `arena_history` — Key Columns

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID | FK → profiles |
| `task_id` | TEXT | Mission ID |
| `score` | INT | 0–100 |
| `elo_delta` | INT | ELO gained this submission |
| `feedback` | TEXT | AI-generated feedback |
| `completed_at` | TIMESTAMPTZ | Server-side timestamp — immutable |

---

### `arena_missions` — Key Columns

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID | FK → profiles |
| `mission_data` | JSONB | Full mission JSON |
| `status` | TEXT | pending / completed / skipped / expired |
| `expires_at` | TIMESTAMPTZ | Midnight IST |

---

## 14 · API Reference

### Authentication

```
POST  /auth/signup          { email, password }
POST  /auth/signin          { email, password }
GET   /auth/callback        OAuth handler
POST  /auth/signout
```

### Profile

```
GET    /api/profile/:userId
PATCH  /api/profile/:userId
POST   /api/extract-pdf          Resume → experience + skills (Gemini multimodal)
GET    /api/profile/public/:slug Read-only public profile (no auth)
```

### Arena

```
POST  /api/arena/daily           Generate today's 3 missions (Easy/Medium/Hard)
POST  /api/arena/submit          Submit solution → score + ELO + proof
GET   /api/arena/history/:userId Paginated challenge history
POST  /api/arena/hint            Get a hint for current mission
GET   /api/arena/leaderboard     Top ELO by domain
```

### Assessment

```
POST  /api/assess/generate    Generate MCQ assessment (Gemini)
POST  /api/assess/submit      Score assessment → skill graph update
```

### Skill Gap

```
POST  /api/skill-gap
  Body: { domain, keyword, elo, path }
  Response: {
    gaps: [{skill, demand, weeks, surge, pct, reason}],
    emerging: [...], growth, marketSignals, topAction,
    cached: true|false
  }
  Cache: 6 hours per domain
```

### AI Interview

```
POST  /api/interview/start      Initialize session
POST  /api/interview/respond    Submit answer → next question
POST  /api/interview/complete   End session → full STAR analysis
```

### Recruiter

```
GET   /api/recruiter/search
  ?role=data+analyst&minElo=500&skills=SQL,Python&city=Bengaluru
POST  /api/recruiter/shortlist  Add to pipeline
GET   /api/recruiter/pipeline/:id
```

### Skill Studio

```
POST  /api/studio/learning-path   Personalized path (Gemini)
POST  /api/studio/lesson          Micro-lesson on specific topic (Gemini)
```

### Verification

```
POST  /api/verify/cert        { provider, certId, userId }
POST  /api/verify/experience  { userId, document(base64), type }
```

---

## 15 · Event Flows

### Core Event Loop

```
USER ACTION
    ↓
Backend route handler
    ↓
Score / Validate / Extract
    ↓
Update DB (profile, history, certs)
    ↓
ELO recalculation
    ↓
Skill graph update (weighted avg)
    ↓
Proof artifact created (if arena)
    ↓
Supabase Realtime → frontend update
    ↓
UI animates: ELO counter, skill bar, proof badge
```

---

### ELO Decay Trigger

```
Any page load → check arena_last_active
    ↓
daysSince > 15?
    ↓
decayPts = min((daysSince - 14) × 5, currentElo - roleFloor)
    ↓
newElo = max(roleFloor, currentElo - decayPts)
    ↓
profiles.elo_rating updated + elo_decay_date = today
```

**Role floors:** Student = 400 · Professional = 600 · Executive = 800

---

### Resume Upload Flow

```
Upload PDF
    ↓
POST /api/extract-pdf (Gemini multimodal)
    ↓
Extracts: experience[], projects[], skills[], education[]
    ↓
Frontend classifies entries:
  isProjectEntry() → university/school name OR "project/capstone" title
  true → resumeProjects
  false → experiences (professional history)
    ↓
Profile updated:
  experiences ← new professional + existing from other resumes + manual
  skillGraph ← initial entries at score 30 (if graph was empty)
  vaultFiles ← resume entry added
```

---

## 16 · User Journeys

### Journey 1: Riya — Final Year CS Student → Data Analyst

> **Timeframe:** 8 weeks to job-ready

| Week | Activity | Outcome |
|------|----------|---------|
| 1 | Sign up, select domain, assessment | ELO 412, gaps identified |
| 2 | First Arena challenge (SQL cleaning) | Score 72, ELO 420, 1st Proof |
| 2–4 | 4–5 challenges/week, Skill Studio SQL path | ELO 480, SQL → 56% |
| 5–7 | Medium challenges, Python Notebook Lab | ELO 510, Python → 68% |
| 8 | SQL > 70%, 14 Proofs, Launchpad match | 3 recruiter views |

---

### Journey 2: Arjun — 4yr Backend Dev → Senior Role

> **Timeframe:** 3 months to market repositioning

| Month | Activity | Outcome |
|-------|----------|---------|
| 1 | Resume upload, gap analysis (System Design = 0%) | ELO 620 calibrated |
| 1–2 | System Design + Cloud challenges 3x/week | ELO 680 |
| 3 | AWS learning path + 2 cloud Arenas | ELO 740, 32 Proofs |
| 3 | Launchpad: Senior Backend match, ₹22–28 LPA band | Recruiter contact |

---

## 17 · Recruiter Journeys

### Journey 1: Hiring DA at Fintech

1. Search: Role=DA, MinELO=500, Skills=SQL>70%+Python>60%, City=Bengaluru → 34 results
2. Open Riya's profile → ELO 524, 14 proofs, cohort analysis scored 88
3. Click "View Code" → reads actual submitted SQL → satisfied
4. Add to pipeline → schedule AI interview through Capabilio

### Journey 2: CTO Evaluating Backend Team Health

1. Add 8 engineers to Org account
2. Deploy System Design benchmark to all 8
3. Dashboard: Team avg ELO 654, Cloud 38% ← below market 62%
4. Action: Deploy Cloud Architecture learning path via Skill Studio to team

---

## 18 · Role & Skill System

### Domain Map

| User Says | Canonical Domain | Domain Key |
|-----------|----------------|-----------|
| Data Analyst, BI Analyst | Data Analyst | `data` |
| Frontend Dev, React Dev | Frontend | `frontend` |
| Backend Dev, Node.js Dev | Backend | `backend` |
| Full-Stack Dev | Full-Stack | `fullstack` |
| DevOps, SRE, Platform Eng | DevOps | `devops` |
| Data Engineer, ETL Dev | Data Engineer | `data_engineer` |
| Machine Learning, AI/ML | ML Engineer | `ml` |
| Cloud Eng, AWS/Azure | Cloud | `aws` / `azure` |
| Cybersecurity, AppSec | Security | `cyber` |
| DBA, SQL DBA | DBA | `dba` |
| Medical Coder | Medical | `medical` |
| QA Engineer | QA | `qa` |
| Product Manager, BA | Product/BA | `ba_product` |

### Data Analyst Canonical Skills

```
SQL · Python · Data Cleaning · Exploratory Data Analysis
Data Visualization · Statistical Analysis · A/B Testing
Business Intelligence · Funnel Analysis · KPI Reporting
Dashboard Design · Storytelling with Data
```

---

## 19 · ELO & Proof System

### ELO Starting Points

| Path | ELO | Basis |
|------|-----|-------|
| Student | 400 | Base |
| Professional (résumé) | 500–650 | Experience years + skills |
| Executive | 800+ | Seniority floor |
| Post-assessment | ±adjusted | Assessment result recalibrates |

---

### ELO Delta Formula

```
baseGain = 30 × difficultyMultiplier
  Easy 1.0x → max 30
  Medium 1.5x → capped at 30 typical
  Hard 2.0x → up to 60

actualGain = round(baseGain × score / 100)

bonusStreak:
  streak ≥ 7:  +5
  streak ≥ 14: +8
  streak ≥ 30: +12

finalGain = actualGain + bonusStreak

Fail (score < 50): eloGain = 0 (no punishment for trying)
```

---

### ELO Tiers

| Tier | Range | Meaning |
|------|-------|---------|
| Beginner | 400–449 | Starting |
| Learning | 450–549 | Building fundamentals |
| Building | 550–649 | Intermediate, entry-job-ready |
| Rising | 650–749 | Strong junior/mid candidate |
| Advanced | 750–849 | Senior-track |
| Expert | 850+ | Top 5% in domain |

---

### Proof Artifact — Structure

```json
{
  "proofId": "arena-history-uuid",
  "title": "Cohort Retention Analysis",
  "company": "Swiggy",
  "domain": "data",
  "score": 88,
  "eloDelta": 16,
  "feedback": "Strong window functions. CTE clean. Missing NULL handling for inactive users.",
  "completedAt": "2024-06-10T14:32:00Z",
  "isPublic": true
}
```

> 🔒 **Immutable by design.** Users cannot edit or delete proof artifacts. Timestamps are server-side.

---

## 20 · Recommendation Engine

### Challenge Recommendations

```
if elo < 500:        serve Easy×2, Medium×1
if 500 ≤ elo < 650: serve Easy×1, Medium×1, Hard×1
if elo ≥ 650:        serve Medium×1, Hard×2

Weak areas → injected into Gemini prompt as focus skills
Recent skills → avoided (prompt instructs "don't repeat these")
```

### Learning Path Logic

```
gap > 50pts  → learn → practice → prove (3 steps)
gap 20–50pts → practice → prove (2 steps)
gap < 20pts  → prove only (go do it in Arena)
```

### Job Matching

```
matchScore = (fullMatches × 1.0 + partialMatches × 0.5) / total
ranking = matchScore × 0.6 + eloProximity × 0.4
```

---

## 21 · Frontend Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 (Vite) |
| Language | JSX (no TypeScript) |
| Styling | Inline styles with design token objects |
| State | `useState` + `useEffect` + Supabase Realtime |
| Auth | Supabase Auth via `@supabase/supabase-js` |
| Python runtime | Pyodide (WASM) |
| SQL runtime | sql.js (WASM) |

### Design Tokens

```js
const T = {
  cream: "#F6F6F1",     // page background
  ink: "#1A1A18",       // primary text
  indigo: "#3D4EAC",    // primary action
  green: "#1A7A4A",     // success
  amber: "#B8620A",     // warning
  red: "#C0392B",       // error / gap
}
// Typography: Playfair Display (headings) · Inter (body) · JetBrains Mono (code/numbers)
```

### Key Files

| File | Purpose |
|------|---------|
| `pages/Aura.jsx` | Full identity module (~4800 lines — needs splitting) |
| `pages/Arena.jsx` | Challenge execution + mission desk |
| `pages/ArenaWorkstations.jsx` | 18 live workstations |
| `arena/ChallengeShell.jsx` | Timer, mission brief, submit button |
| `arena/MissionDesk.jsx` | Mission selection UI |
| `lib/db.js` | `userDoc` + `arenaDb` Supabase wrappers |
| `config/arenaDomains.js` | Domain → workstation config |

---

## 22 · Backend Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Express.js |
| AI Primary | Gemini 2.5 Flash (`@google/generative-ai`) |
| AI Fallback | Groq (llama-3.1-8b-instant) |
| AI Voice | Deepgram (ASR) + ElevenLabs (TTS) |
| Database | Supabase (PostgreSQL) |
| Search | Gemini with `{ googleSearch: {} }` grounding |
| Payments | Razorpay |

### Caching Strategy

| Data | Cache | TTL |
|------|-------|-----|
| Skill gap market data | In-memory Map | 6 hours |
| Arena missions | Supabase DB | Until midnight IST |
| MCQ assessments | Client React state | Session |
| Lessons | Client React state | Module complete |
| Job listings | In-memory Map | 1 hour |

### Gemini Functions

```
gemini(prompt)                        → plain text generation
geminiSearch(prompt)                  → Google Search grounding (live market data)
geminiExtractPDF(filePath, prompt)    → multimodal PDF reading
geminiGenerateMission(params)         → domain-aware Arena challenge
geminiGenerateMCQ(params)             → fresher-level MCQ assessment
geminiGenerateLesson(params)          → micro-lesson JSON
geminiGenerateLearningPath(params)    → phased learning plan
```

---

## 23 · Screen References

> 📐 These are layout specs, not pixel-perfect designs. Use these to brief your designer or generate mockups.

See dedicated **[Screen References and Mockup Prompts]** document for detailed descriptions of:
- Path Selector / Onboarding
- Student Home Dashboard
- Arena Homepage
- Challenge Workspace (SQL Lab)
- Skill Gap Analysis
- Recruiter Dashboard
- Verification Flow

---

## 24 · Build Order

| Phase | Weeks | Deliverable |
|-------|-------|------------|
| 1 — Infrastructure | 1–2 | Auth, profiles, nav shell, onboarding |
| 2 — Arena MVP | 3–4 | Missions, SQL Lab, scoring, ELO |
| 3 — Aura + Skill Graph | 5–6 | Profile, resume upload, public profile |
| 4 — Assessment + Gaps | 7–8 | MCQs, skill gap analysis UI |
| 5 — Skill Studio | 9–10 | Lessons, learning paths, quizzes |
| 6 — Launchpad | 11–12 | Job matching, readiness, discoverability |
| 7 — Recruiter & Org | 13–14 | Search, pipeline, org dashboard |
| 8 — Verification | 15–16 | Cert verification, trust badges |
| 9 — AI Interview + DNA | 17–18 | Voice interview, GitHub analysis |
| 10 — Scale & Polish | 19–20 | Rate limits, mobile, payments, analytics |

---

## 25 · Risks & Extensions

### ⚠️ Key Risks

| Risk | Mitigation |
|------|-----------|
| AI scoring inconsistency | Rubric-first prompts, test suite of known submissions |
| ELO gaming (multi-accounts) | Device fingerprinting, IP rate limiting |
| WASM performance on mobile | Lazy-load workstations, server-side exec fallback |
| Gemini API cost at scale | Sticky missions, 6h skill-gap cache, Groq for extraction |
| Recruiter distrust of AI scores | Show raw code + rubric breakdown alongside score |

### 🔮 Top 5 Future Extensions

1. **Peer Review Layer** — Verified professionals (ELO 700+) annotate proofs → Tier 5 verification
2. **Company-Sponsored Challenges** — Companies deploy real hiring problems → direct pipeline interviews
3. **Skill Passport** — Exportable verifiable PDF with QR code → 90-day tamper-evident snapshot
4. **Semantic Skill Matching** — `pg_vector` embeddings replace string matching → "pandas" matches "data manipulation"
5. **Capabilio for Colleges** — Bulk onboarding, placement readiness dashboard, per-batch skill gap

### 🔧 Tech Debt to Address

1. `Aura.jsx` is ~4800 lines → split into SkillGapTab, CareerVaultTab, SkillsTab, ResilienceTab
2. `skillGraph` as JSON column → migrate to `skill_scores(user_id, skill, score, updated_at)` table
3. ELO decay on client-side → move to Supabase Edge Function cron (daily, 2am IST)
4. No search indexing on profiles → add PostgreSQL FTS + `pg_vector`

---

*Capabilio Internal Wiki · v1.0 · Last updated June 2026*
*Maintained by the Engineering & Product team — update this doc when specs change.*
