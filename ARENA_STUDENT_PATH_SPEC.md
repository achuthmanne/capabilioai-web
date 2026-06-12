# Capabilio Arena — Student Path Redesign
## Product + UX + Technical Specification
**Version:** 1.0 | **Date:** June 2026 | **Audience:** Founder / Lead Developer

---

## Codebase Context (what already exists)

Before the spec: a snapshot of what you have that this document builds on.

- `Arena.jsx` — ELO tiers (Rookie→Elite), DomainLanding grid, AI Copilot, EloRing SVG, daily slot system
- `ArenaCatalog.jsx` — Supabase + inline challenge catalog with TYPE_CONFIG (dsa, sql, frontend, backend, system_design, data_analyst, product, etc.)
- `useArenaState.js` — Supabase Realtime profile listener, `markCompleted()` writes to `arena_submissions` and updates `profiles`
- `arenaDomains.js` — 12 domain registry with rubrics, modules, sandbox types, contextPanelSections
- `arenaApi.js` — `/api/arena/review`, `/api/arena/hint`, `/api/arena/daily` on Express server
- `profiles` table — `elo_rating`, `arena_streak`, `arena_completed`, `keyword`, `path_type`, `last_arena_date`
- `arena_submissions` table — `user_id`, `task_id`, `title`, `domain`, `difficulty`, `score`, `elo_delta`, `submitted_at`
- **Two Supabase clients**: main app + `problemsDb` (separate project for challenge content)

---

# 1. Product Decision

## Decision: One Arena, Two Challenge Modes, Unified Surface

**Recommendation: Keep Arena as a single product with a layered mode system.** Do not create two separate pages or nav items for "Coding Challenges" and "Domain Challenges". Students do not think in those categories — they think "I want to practice for my placement" or "I want to get better at SQL". The mode distinction is a *filter*, not a *product split*.

**Why this works:**

The existing `ArenaCatalog.jsx` already has `TYPE_CONFIG` with `dsa`, `sql`, `frontend`, `backend`, `system_design`, `data_analyst` etc. — the data model already treats these uniformly. The problem is the *UI presentation*, not the underlying architecture.

**The default experience for a new student:**

When a student arrives at Arena with no history:
1. Show the **"Today's Arena"** view — 3 AI-recommended challenge cards (mix of foundation + domain, chosen by ELO + declared interest)
2. Show a **"Build your path"** onboarding strip — a 3-question micro-survey: "What role are you targeting?", "What's your coding comfort level?", "What's your interview timeline?"
3. Store answers in `profiles.arena_preferences` (JSONB)
4. Use answers to weight the recommendation engine

**Why not force domain selection first (current DomainLanding screen):**

The current `DomainLanding` asks students to pick a professional workstation before they've done anything. A fresher doesn't know what "Database Administrator" vs "Full Stack Developer" means in practice. The DomainLanding grid is appropriate for professionals who already have a role — not for students. **Move DomainLanding to a secondary path** (accessible via "Explore Workstations" CTA), not the default entry point.

**The two challenge modes coexist as:**

| Mode | What it is | Tab chip label | Primary user goal |
|------|-----------|---------------|-------------------|
| **Foundation** | DSA, algorithms, data structures, core CS | `Foundation` | Crack placement rounds, FAANG interviews |
| **Domain** | Role-based challenges (SQL, React, System Design, etc.) | `Role Practice` | Build domain depth for first job |

Both modes live inside one Arena page. Switching between them is a **tab/filter action**, not a navigation action. ELO is shared. History is shared. Portfolio is shared.

---

# 2. Arena Information Architecture

## Top-Level Navigation (Student Path)

```
App Shell (Sidebar / Top Nav)
├── Home (Aura Dashboard)
├── Arena                          ← unified practice hub
├── Portfolio
├── Jobs / Opportunities
├── Profile
└── [Placement Detected] → Professional Path (post-transition)
```

## Arena Page Structure

```
/arena
├── [Header Strip]                  — ELO ring, streak, tier, daily goal
├── [Mode Tabs]                     — Today | Foundation | Role Practice | History | Leaderboard
│
├── Today (default tab)
│   ├── Next Best Action card       — single highest-priority recommended challenge
│   ├── Today's Set (3 cards)       — AI-curated mix, refreshes daily
│   └── Quick Jump (recent/resume)  — last attempted, not submitted
│
├── Foundation (DSA/Algorithms tab)
│   ├── Filter bar                  — difficulty, language, topic, status
│   ├── Topic Groups                — Arrays, Trees, DP, etc. with progress rings
│   └── Challenge grid / list       — cards with solve rate, ELO reward, company tags
│
├── Role Practice (Domain tab)
│   ├── Domain selector chips       — SQL · Python · System Design · Frontend · Backend · Product · DA
│   ├── Filter bar                  — difficulty, module, status
│   └── Challenge cards             — with workstation type badge, scenario preview
│
├── History
│   ├── Timeline view               — chronological, grouped by week
│   ├── Stats mini-bar              — total attempts, avg score, ELO trend sparkline
│   └── Entry cards                 — expandable, with AI feedback + portfolio export CTA
│
└── Leaderboard
    ├── Tier-filtered tabs          — All | My Tier | My College | Global
    └── Rank rows                   — rank, avatar, name, ELO, tier badge, streak
```

## Where History, Leaderboard, and Portfolio Trail fit

- **History** is a tab *inside* Arena (not a separate page). It shows everything the student has attempted in Arena.
- **Portfolio Trail** is a *page-level section* at `/portfolio` that pulls from history. It is also accessible via a CTA inside Arena History entries ("Add to Portfolio").
- **Leaderboard** is a tab inside Arena — not a separate top-nav item. It reduces cognitive load.
- **Aura Dashboard** (home page) shows the *summary* — ELO ring, tier, streak, last 7 day activity chart, and a link to Arena.

---

# 3. Student Arena Layout

## Header Strip (always visible inside Arena)

```
┌─────────────────────────────────────────────────────────────────────┐
│  [EloRing:elo=940]  Practitioner  ·  🔥 7-day streak               │
│  940 ELO            [████████░░] 60 pts to Expert                   │
│                                  [Practice Now →]                    │
└─────────────────────────────────────────────────────────────────────┘
```

- EloRing: existing SVG component. Keep it.
- Tier label + progress bar toward next tier (compute from existing `ELO_TIERS`)
- Streak dot with pulse animation (existing `Dot` component)
- "Practice Now" CTA scrolls to Today's Set or opens the next-best-action challenge

## Mode Tabs

```
[ Today ★ ]  [ Foundation ]  [ Role Practice ]  [ History ]  [ Leaderboard ]
```

- `Today ★` is the default tab (star connotes "recommended for you")
- Active tab has bottom border in `T.indigo`
- Tab bar is sticky on scroll

## Today Tab Layout

```
┌─── NEXT BEST ACTION ────────────────────────────────────────────────┐
│  [chip: RECOMMENDED]  [chip: +22 ELO]  [chip: DSA · Medium]        │
│  Merge Intervals                                                     │
│  "You've solved 4 array problems. This builds directly on that."    │
│  [Start Challenge →]                        [Skip, show another]    │
└─────────────────────────────────────────────────────────────────────┘

TODAY'S SET  (3 cards, refreshed daily at midnight IST)
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 🧩 Foundation│  │ 🗃️ SQL       │  │ 🏗️ System   │
│ Two Sum      │  │ Sales Funnel │  │ Design URL   │
│ Easy · 25m  │  │ Medium · 35m │  │ Hard · 60m  │
│ +15 ELO     │  │ +22 ELO      │  │ +35 ELO     │
│ [Start]     │  │ [Start]      │  │ [Start]     │
└──────────────┘  └──────────────┘  └──────────────┘

[Refresh Set ↻]   (available once per day; costs 0 ELO, resets cooldown)
```

**Quick Jump (below Today's Set):**
```
↩ Resume: "Binary Tree Level Order" · started 2h ago · [Continue]
```
- Query `challenge_attempts` for `status = 'in_progress'` and `user_id = auth.uid()`

## Foundation Tab Layout

```
Filter bar: [All Topics ▾]  [All Difficulty ▾]  [Language ▾]  [Status ▾]  [🔍 Search]

TOPIC GROUPS  (collapsible)
▼ Arrays & Hashing          ●●●●●○○○○○  12/28 solved
   [Two Sum ·Easy·✓]  [Best Time to Buy·Easy]  [Contains Duplicate·Easy·✓]  ...

▼ Two Pointers              ●●●○○○○○○○  6/18 solved
   [Valid Palindrome·Easy]  [3Sum·Medium]  ...

▼ Dynamic Programming       ●○○○○○○○○○  3/24 solved   [LOCKED until 20 solved in Arrays]
   ...
```

- Topic groups sourced from `challenges.topic_group` field
- Progress rings per group computed client-side from `challenge_attempts`
- Locked topics shown greyed with a lock icon and unlock requirement
- Each challenge card shows: title, difficulty badge, estimated_mins, ELO reward, solve rate (from `challenges.solve_count / challenges.participation_count`)

## Role Practice Tab Layout

```
Domain chips:  [SQL 🗃️]  [Python/Pandas 🐍]  [System Design 🏗️]  [Frontend 🖥️]
               [Backend ⚙️]  [Product 📱]  [Data Analyst 📊]  [DevOps 🚀]

(Chips map to existing TYPE_CONFIG in ArenaCatalog.jsx)

Filter bar: [All Difficulty ▾]  [Workstation ▾]  [Status ▾]

Challenge cards (grid, 2 columns on desktop, 1 on mobile):
┌──────────────────────────────────────────────────────────────┐
│ [SQL chip]  [Medium]  [🗃️ SQL Workstation]       +22 ELO    │
│ Sales Funnel Analysis                                         │
│ "Calculate conversion rates by stage for Q1..."              │
│ Skills: Window Functions · CTEs · Aggregation                │
│ 847 attempts · 61% solve rate · ~35 min                      │
│ [Start Challenge]                     [Preview Scenario]     │
└──────────────────────────────────────────────────────────────┘
```

- "Preview Scenario" opens a modal with the full description, no code editor — lets students browse without committing
- Domain chip selection filters `challenges.type` (maps to existing `TYPE_CONFIG` keys)

## History Tab Layout

```
Stats bar: 47 attempts · Avg score 78 · +340 ELO this month · 🔥 12-day streak best

[Week of Jun 2–8]
┌──────────────────────────────────────────────────────────────────────┐
│ ✓  Merge Intervals        · Foundation · Medium  · Score 88 · +18 ELO│
│    Jun 7, 2026 at 11:23am · 34 min               [View Feedback ▾]   │
└──────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│ ✓  Sales Funnel SQL       · Role: SQL   · Medium  · Score 72 · +14 ELO│
│    Jun 6, 2026 at 8:45pm  · 41 min               [View Feedback ▾]   │
└──────────────────────────────────────────────────────────────────────┘

Expanded (after clicking View Feedback):
  ├── AI Feedback (3–5 bullet points from review API)
  ├── Score breakdown (rubric criteria + weights)
  ├── Your submission snapshot (code/markdown preview, read-only)
  ├── ELO delta: +14  (940 → 954)
  └── [Add to Portfolio]  [Retry Challenge]  [Share]
```

## Challenge Type Chips (visual language)

| Type | Chip style | Workstation badge |
|------|-----------|-------------------|
| DSA / Foundation | Purple, `🧩 Foundation` | Code Editor |
| SQL | Blue, `🗃️ SQL` | SQL Studio |
| System Design | Dark violet, `🏗️ System Design` | Diagram Canvas |
| Frontend | Amber, `🖥️ Frontend` | React Preview |
| Backend | Green, `⚙️ Backend` | Code + Terminal |
| Data Analyst | Orange, `📊 Data Analyst` | Notebook |
| Product | Pink, `📱 Product` | Markdown |
| DevOps | Orange-red, `🚀 DevOps` | Terminal |

These map 1:1 to existing `TYPE_CONFIG` in `ArenaCatalog.jsx`. No new config needed.

---

# 4. Challenge Experience

## 4A. Foundation Coding Challenge View (DSA / Algorithm)

```
Layout: Two-panel (60/40 split, resizable)

LEFT PANEL — Problem Panel
┌────────────────────────────────────────────────┐
│ [🧩 Foundation]  [Medium]  [+22 ELO]          │
│ Merge Intervals                                │
│ ─────────────────────────────────────────────  │
│ SCENARIO                                       │
│ Given an array of intervals [start,end]...     │
│                                                │
│ OBJECTIVE                                      │
│ Merge all overlapping intervals.               │
│                                                │
│ EXAMPLES                                       │
│ Input: [[1,3],[2,6],[8,10]]                    │
│ Output: [[1,6],[8,10]]                         │
│                                                │
│ CONSTRAINTS                                    │
│ 1 ≤ intervals.length ≤ 10^4                   │
│                                                │
│ HINTS (collapsed by default)                   │
│ ▶ Hint 1  ▶ Hint 2  ▶ Hint 3                  │
│                                                │
│ RUBRIC                                         │
│ Correctness 40% · Complexity 20%              │
│ Space 15% · Clarity 15% · Edge Cases 10%      │
│                                                │
│ [AI Copilot]  [Discussion]  [Solutions]        │
└────────────────────────────────────────────────┘

RIGHT PANEL — Editor + Output
┌────────────────────────────────────────────────┐
│ Language: [Python ▾]  [TypeScript]  [Java]     │
│ ─────────────────────────────────────────────  │
│  (Monaco Editor — existing code workstation)   │
│                                                │
│  def merge(intervals):                         │
│    # TODO: implement                           │
│    pass                                        │
│                                                │
│ ─────────────────────────────────────────────  │
│ CONSOLE OUTPUT                                 │
│ [Run Tests ▶]    [Run All Cases ▶▶]            │
│                                                │
│ Test 1: ✓  Test 2: ✓  Test 3: ✗               │
│ Expected: [[1,6],[8,10]]                       │
│ Got:      [[1,3],[2,6],[8,10]]                 │
│                                                │
│ ─────────────────────────────────────────────  │
│ [Submit Solution]              [Save Draft]    │
│ Timer: 18:34                   Attempt #1      │
└────────────────────────────────────────────────┘
```

**Key behaviors:**
- Timer starts on first keystroke, not on page load (reduces anxiety)
- "Run Tests" runs visible test cases (free, fast). "Run All Cases" runs hidden cases (requires submission)
- Submit triggers `reviewAnswer()` in `arenaApi.js` → AI scores + rubric feedback
- After submit: show score breakdown overlay, ELO delta animation, then offer "Retry" or "Next Challenge"
- Hint reveals cost: Hint 1 = free, Hint 2 = -5 ELO impact on score (not on ELO), Hint 3 = -10 score impact

## 4B. Role/Domain Challenge View (SQL, System Design, Notebook, etc.)

```
Layout: Three-panel (35/40/25) for rich domain challenges

LEFT PANEL — Scenario Brief
┌──────────────────────────────────┐
│ [🗃️ SQL]  [Medium]  [+22 ELO]   │
│ Sales Funnel Analysis            │
│ ─────────────────────────────   │
│ CONTEXT                         │
│ You are a Data Analyst at a     │
│ B2B SaaS. The VP of Sales       │
│ wants a funnel report for Q1.   │
│                                  │
│ OBJECTIVE                       │
│ Calculate stage-by-stage        │
│ conversion rates and identify   │
│ the biggest drop-off point.     │
│                                  │
│ AVAILABLE TABLES                │
│ events(id, user_id, stage, ts)  │
│ users(id, signup_date, plan)    │
│                                  │
│ EXPECTED OUTPUT FORMAT          │
│ stage | count | conversion_rate │
│                                  │
│ RUBRIC                          │
│ Correctness 35% · Insight 25%   │
│ Presentation 20% · Method 10%   │
│ Code Quality 10%                │
│                                  │
│ ── DOMAIN QUICK REF ──          │
│ (existing contextPanelSections) │
│ Window functions · KPI formulas │
└──────────────────────────────────┘

CENTER PANEL — Workstation
(Determined by challenge.sandbox_type — existing WorkstationRouter)
┌──────────────────────────────────┐
│ SQL Studio / Notebook / Diagram  │
│ (existing sandbox components)    │
│                                  │
│ SELECT stage,                    │
│   COUNT(*) as count,             │
│   ROUND(COUNT(*) * 100.0 /       │
│     LAG(COUNT(*)) OVER           │
│     (ORDER BY stage_order),2)    │
│     AS conversion_rate           │
│ FROM events                      │
│ GROUP BY stage                   │
│ ORDER BY stage_order;            │
│                                  │
│ [Run Query ▶]    [Format SQL]    │
│ Results: 5 rows returned         │
│ stage | count | conversion_rate  │
│ ──────────────────────────────── │
│ [Submit for Review]  [Save Draft]│
└──────────────────────────────────┘

RIGHT PANEL — AI Copilot (existing AICopilotPanel)
┌──────────────────────────────────┐
│ 🤖 AI Copilot                   │
│ SQL specialist · ● online        │
│ ─────────────────────────────   │
│ Quick prompts:                  │
│ [Review my solution]            │
│ [Explain this approach]         │
│ [Find the bug]                  │
│ [Suggest improvement]           │
│                                  │
│ Chat thread...                   │
└──────────────────────────────────┘
```

**Key differences from Foundation view:**
- Left panel shows CONTEXT (real-world scenario) + AVAILABLE TABLES/DATA instead of examples+constraints
- Center panel uses the existing `WorkstationRouter` — no new workstation code needed
- Right panel is always the AI Copilot (same existing component)
- System Design challenges open the `diagram` sandbox (existing) with an "Architecture Checklist" in the left panel

**Shared product language across both views:**
- Same submit flow: `reviewAnswer()` → AI score → ELO delta → history write
- Same ELO ring in top header (reused from `EloRing` component)
- Same "Score Breakdown Overlay" post-submission
- Same "Add to Portfolio" CTA in the result state

**Post-Submission Overlay (shared):**
```
┌──────── YOUR RESULT ─────────────────────────────┐
│  Score: 82/100                                    │
│  ELO:  940 → 958  (+18)  🎉 New record!          │
│  Tier: Practitioner (unchanged)                   │
│                                                   │
│  RUBRIC BREAKDOWN                                 │
│  Correctness      ████████░░  32/40              │
│  Complexity       ██████░░░░  12/20              │
│  Code Clarity     ████████░░  12/15              │
│  Edge Cases       ██████████   8/10              │
│                                                   │
│  AI FEEDBACK                                      │
│  • Your sort step is correct but can be avoided   │
│    with a deque-based approach.                   │
│  • Edge case: empty array — handle explicitly.    │
│  • Time complexity is O(n log n). Target O(n)     │
│    with a monotonic stack for Expert tier.        │
│                                                   │
│  [Add to Portfolio]  [Retry]  [Next Challenge →]  │
└───────────────────────────────────────────────────┘
```

---

# 5. ELO System

## Current State

Your `useArenaState.js` already has basic ELO: `newElo = currentElo + eloDelta` with `eloDelta` from the AI review API. `ELO_TIERS` in `Arena.jsx` has 6 tiers. This section formalizes and extends that logic.

## Unified ELO Formula

ELO is a single number across both Foundation and Domain challenges. There is no separate "DSA ELO" and "Domain ELO" — this would fragment progress and confuse students. One number means one identity.

**Base delta formula (implemented in Edge Function `elo_engine`):**

```
K_factor = 
  difficulty === 'Easy'   → 20
  difficulty === 'Medium' → 32
  difficulty === 'Hard'   → 45
  difficulty === 'Expert' → 60

expected_score = 1 / (1 + 10^((opponent_elo - user_elo) / 400))
  where opponent_elo = difficulty baseline:
    Easy   → 600
    Medium → 900
    Hard   → 1150
    Expert → 1400

raw_delta = K_factor * (actual_score/100 - expected_score)
```

**Modifiers applied after raw_delta:**

| Modifier | Condition | Effect |
|----------|-----------|--------|
| Streak bonus | streak ≥ 3 days | +10% on positive delta |
| Streak bonus | streak ≥ 7 days | +20% on positive delta |
| First attempt | `attempt_number = 1` | no modifier |
| Retry penalty | `attempt_number = 2` | ×0.75 on positive delta |
| Retry penalty | `attempt_number ≥ 3` | ×0.50 on positive delta (floor, still improves ELO if genuinely better) |
| Hint used | 1 hint | ×0.90 on positive delta |
| Hint used | 2+ hints | ×0.75 on positive delta |
| Challenge mode weight | Foundation (DSA) | ×1.0 (full weight) |
| Challenge mode weight | Role/Domain | ×1.0 (full weight — no penalty for domain practice) |
| Recency cap | More than 3 same-topic submits in 24h | ×0.20 on delta (anti-grinding) |

**Floor / ceiling:**
- ELO floor: 400 (never goes below)
- ELO ceiling: effectively uncapped (Elite tier starts at 1500)
- Min delta per submission: -15 (failing hard doesn't crater you)
- Max negative delta: capped so a single bad submission never costs more than -20

## Streak Effects

```
// In useArenaState.markCompleted() — extend existing logic:
const streakMultiplier = streak >= 7 ? 1.20 : streak >= 3 ? 1.10 : 1.0
const adjustedDelta = rawDelta > 0 
  ? Math.round(rawDelta * streakMultiplier) 
  : rawDelta  // streaks don't amplify losses
```

## Aura Dashboard Display

The Aura dashboard (home page) gets ELO data from `profiles.elo_rating`. Display:

```
┌─── YOUR AURA ─────────────────────────────────────────────┐
│  [EloRing size=80]  Practitioner                          │
│  940 ELO            950 needed for Expert                 │
│                                                           │
│  ELO TREND (last 30 days — sparkline)                    │
│  ▁▂▃▃▄▅▅▆▆▇▇▇▇  +128 this month                         │
│                                                           │
│  SKILL RADAR (if ≥5 domain submissions)                  │
│  Foundation ████████░░ 82                                 │
│  SQL        ██████░░░░ 61                                 │
│  System Des ████░░░░░░ 40                                 │
│  Frontend   ███░░░░░░░ 30                                 │
│                                                           │
│  🔥 7-day streak · 47 total challenges                   │
└───────────────────────────────────────────────────────────┘
```

The skill radar reads from `elo_events` grouped by `challenge_type`. Each domain gets its own sub-score (average of all ELO events for that type). This is *displayed separately* on Aura but **not** a separate ELO number for recruiter display — recruiters see the single ELO + domain breakdown.

## ELO Events Table

Every ELO change writes an `elo_events` row (see data model section). This enables: audit trail, sparklines, skill radar, recruiter proof.

---

# 6. History and Portfolio

## What Gets Stored

Every challenge submission writes to **three places**:

1. `challenge_attempts` — mutable record of attempt state (in_progress / submitted / passed)
2. `history_entries` — append-only record (one per submission), the permanent ledger
3. `portfolio_entries` — created on "Add to Portfolio" action OR auto-added if score ≥ 75

### history_entries — full field list

```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id             uuid REFERENCES auth.users
attempt_id          uuid REFERENCES challenge_attempts(id)
challenge_id        uuid REFERENCES challenges(id)

-- Snapshot fields (denormalized — never rely on JOIN to challenge for display)
challenge_title     text NOT NULL
challenge_description_snapshot  text  -- full description at time of attempt
scenario_snapshot   text              -- scenario/context section
objective_snapshot  text

-- Result fields
score               numeric(5,2)
elo_before          integer
elo_after           integer
elo_delta           integer
ai_feedback         jsonb             -- {summary, bullets[], rubric_breakdown{}}
rubric_scores       jsonb             -- {criterion: score} per rubric item

-- Classification fields
challenge_type      text              -- 'foundation' | 'domain'
challenge_mode      text              -- 'dsa' | 'sql' | 'system_design' | etc.
difficulty          text
skills_demonstrated text[]            -- from challenge.skills array
topic_group         text              -- e.g. 'Arrays', 'SQL Window Functions'

-- Time fields
started_at          timestamptz
submitted_at        timestamptz NOT NULL DEFAULT now()
time_spent_seconds  integer

-- Meta fields
attempt_number      integer DEFAULT 1 -- retry count
hints_used          integer DEFAULT 0
language_used       text              -- e.g. 'Python', 'SQL'
sandbox_type        text              -- 'code' | 'sql' | 'diagram' etc.

-- Recruiter fields
is_recruiter_visible boolean DEFAULT true
portfolio_entry_id  uuid REFERENCES portfolio_entries(id) NULL
```

### Student view vs recruiter view

**Student sees:**
- Full history (all attempts, all scores)
- AI feedback bullets
- ELO delta per attempt
- Retry comparisons (attempt 1 vs attempt 2)
- "Add to Portfolio" action

**Recruiter sees (via public portfolio URL):**
- Only attempts where `is_recruiter_visible = true`
- For retried challenges: only the **best** submission per challenge
- challenge_title, challenge_description_snapshot, scenario_snapshot, objective_snapshot
- Score, rubric breakdown (visual bars), ai_feedback summary
- submitted_at timestamp (ISO 8601 — timestamped proof)
- skills_demonstrated chips
- ELO at time of submission (shows growth arc)
- **Does NOT see:** hints_used, other students' scores, internal IDs

## Snapshot vs Relational Storage

**Decision: Use snapshots for recruiter-facing fields.**

The challenge content lives in the `problemsDb` (separate Supabase project). If a challenge gets edited or deleted, you don't want portfolio entries to break. Store `challenge_title`, `challenge_description_snapshot`, `scenario_snapshot`, `objective_snapshot` as text columns directly on `history_entries` and `portfolio_entries` at write time.

For the student's own History tab, you can JOIN back to the challenges table for fresh metadata (difficulty, tags). But the snapshot fields are the source of truth for recruiter display.

## Portfolio Trail UI

```
/portfolio → "Trail" section

PORTFOLIO TRAIL  [Filter: All · Foundation · Domain · By Skill]

Jun 2026 ──────────────────────────────────────────────────
  [Challenge card]
  🏗️ System Design · Hard · Score 88
  "Design a URL Shortener — Designed a scalable URL shortening
   service with Redis caching, 100M URLs capacity..."
  Skills: System Design · Caching · Database Sharding
  Submitted: Jun 7, 2026 · 58 min · ELO at submission: 922
  [View Full Submission]  [⬛ Recruiter Visible]

  [Challenge card]
  🗃️ SQL · Medium · Score 72
  "Sales Funnel Analysis — Calculated stage-by-stage conversion..."
  Skills: Window Functions · CTEs · Aggregation
  Submitted: Jun 6, 2026 · 41 min
  [View Full Submission]  [⬛ Recruiter Visible]

May 2026 ──────────────────────────────────────────────────
  ...
```

**"Recruiter Visible" toggle:** Students can mark individual entries as hidden. Default is visible if score ≥ 75. Always visible if student explicitly adds to portfolio.

## Portfolio Public URL

```
capabilio.in/portfolio/{username}

Sections:
1. Profile header (name, college, target role, ELO badge)
2. Skills radar chart (from elo_events domain breakdown)
3. Portfolio Trail (recruiter-visible entries only)
4. Verification badge: "Verified on Capabilio Arena · All work timestamped"
```

---

# 7. Student-to-Professional Transition

## Trigger Events

A transition from Student Path to Professional Path is triggered by **any one** of:

1. **Student manually declares placement** — "I got a job!" flow in the app
2. **Recruiter marks placement** — recruiter on Capabilio marks a hire (from their side)
3. **OTP-verified email domain change** — student's new work email is verified (e.g., joining @infosys.com)

## Path Switch Logic

```
Transition event fires:
  1. Insert row in user_path_transitions
  2. Update profiles.path_type = 'professional'
  3. Insert row in job_profiles (job_title, company, joining_date, etc.)
  4. Set profiles.professional_since = now()
  5. Do NOT delete or modify any existing history_entries, elo_events, portfolio_entries
  6. Send welcome email: "Welcome to your Professional Path"
```

**Nothing is wiped.** All student history, ELO, portfolio entries are preserved. The professional path *adds a layer* on top.

## Onboarding Flow (post-transition, first login)

This is a modal wizard that shows once after transition. Do not make it a separate page.

```
Step 1 of 4 — Confirm Your Role
  Job title: [Software Engineer ___________]
  Company: [Infosys _____________________]
  Joining date: [July 1, 2026 ___________]
  [Next →]

Step 2 of 4 — Your Role Stack
  "What tech will you use daily?" (multi-select chips from arenaDomains)
  [React]  [Node.js]  [PostgreSQL]  [Docker]  [AWS]  + custom
  [Next →]

Step 3 of 4 — Your Goals
  What do you want to improve in your first 90 days?
  ○ Deepen backend skills  ○ Learn system design  ○ Get better at SQL
  ○ Improve code quality  ○ Prepare for L2 promotion  ● Custom: ______
  [Next →]

Step 4 of 4 — Your Path Unlocked
  "Your student history is saved. Professional Path adds:
   - Role-specific challenges for your stack
   - 90-day onboarding goals
   - Promotion readiness tracker
   - Verified work proof for your next job"
  [Go to My Professional Arena →]
```

## What Changes After Transition

| Feature | Student Path | Professional Path |
|---------|-------------|-------------------|
| Arena default tab | "Today" (curated mix) | "My Role" (job-title-filtered challenges) |
| Domain recommendation | Based on `profiles.keyword` | Based on `job_profiles.role_skills` |
| Portfolio header | "Aspiring [role]" | "Software Engineer @ Infosys" |
| ELO history | Preserved, shown as "student era" | Continuous — no reset |
| Leaderboard | Student leaderboard | Professional leaderboard (separate table) |
| New data unlocked | — | `job_profiles` record, onboarding goals, role progression |
| Challenges shown | All catalog | Role-filtered first, all available on browse |

## Login / Homepage After Transition

```
// In app router:
if (user.path_type === 'professional') {
  // Default redirect: /pro-arena (professional arena)
  // But /arena still works and shows student history
}
```

Professional Path homepage reads `job_profiles` and shows:
- "Day 23 at [Company]" counter
- Role skills progress vs peer benchmarks
- Next recommended challenge for their specific tech stack

The app shell adds a nav item: "Professional Arena" and keeps "Student History" accessible at `/arena/history`.

---

# 8. Supabase Data Model

## Schema Overview

```sql
-- ─── CORE USER TABLES ──────────────────────────────────────────────────────────

-- Extends auth.users (existing)
CREATE TABLE profiles (
  id                    uuid PRIMARY KEY REFERENCES auth.users,
  full_name             text,
  username              text UNIQUE,
  college               text,
  graduation_year       integer,
  keyword               text,        -- target role keyword (existing)
  path_type             text DEFAULT 'student' CHECK (path_type IN ('student','professional')),
  elo_rating            integer DEFAULT 800,
  arena_streak          integer DEFAULT 0,
  arena_completed       integer DEFAULT 0,
  last_arena_date       date,
  skill_graph           jsonb DEFAULT '[]',
  arena_preferences     jsonb DEFAULT '{}',  -- NEW: onboarding survey answers
  professional_since    timestamptz,          -- NEW: set on transition
  created_at            timestamptz DEFAULT now()
);

-- ─── PATH MANAGEMENT ───────────────────────────────────────────────────────────

CREATE TABLE user_path_transitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users NOT NULL,
  from_path       text NOT NULL,  -- 'student'
  to_path         text NOT NULL,  -- 'professional'
  trigger_type    text NOT NULL,  -- 'self_declared' | 'recruiter_placed' | 'email_verified'
  triggered_at    timestamptz DEFAULT now(),
  meta            jsonb DEFAULT '{}'  -- e.g. recruiter_id, placement_company
);

CREATE TABLE job_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users NOT NULL UNIQUE,
  job_title       text NOT NULL,
  company_name    text NOT NULL,
  joining_date    date,
  employment_type text DEFAULT 'full_time',
  role_skills     text[] DEFAULT '{}',     -- tech stack for this role
  job_description text,                    -- paste of JD for AI parsing
  onboarding_goals jsonb DEFAULT '[]',     -- [{goal, target_date, status}]
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── CHALLENGE CATALOG ─────────────────────────────────────────────────────────

-- This table lives in main Supabase (or can be in problemsDb — choose one)
CREATE TABLE challenges (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text UNIQUE NOT NULL,
  title                 text NOT NULL,
  description           text NOT NULL,
  scenario              text,
  objective             text,

  -- Classification
  type                  text NOT NULL,  -- maps to TYPE_CONFIG: 'dsa'|'sql'|'frontend'|etc.
  challenge_mode        text NOT NULL DEFAULT 'domain',  -- 'foundation' | 'domain'
  domain                text,                            -- maps to ARENA_DOMAINS key
  difficulty            text CHECK (difficulty IN ('Easy','Medium','Hard','Expert')),
  topic_group           text,            -- 'Arrays', 'SQL Window Functions', etc.
  skills                text[] DEFAULT '{}',
  tags                  text[] DEFAULT '{}',

  -- Workstation config
  sandbox_type          text DEFAULT 'code',
  language              text,
  workstation           text,

  -- ELO config
  elo_reward_base       integer DEFAULT 20,

  -- Stats
  participation_count   integer DEFAULT 0,
  solve_count           integer DEFAULT 0,

  -- Catalog meta
  estimated_mins        integer,
  company_name          text,
  is_company_sponsored  boolean DEFAULT false,
  is_recruiter_visible  boolean DEFAULT true,
  proof_type            text DEFAULT 'code',
  status                text DEFAULT 'active',

  created_at            timestamptz DEFAULT now()
);

-- ─── ATTEMPT + SUBMISSION TRACKING ────────────────────────────────────────────

CREATE TABLE challenge_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users NOT NULL,
  challenge_id    uuid REFERENCES challenges(id) NOT NULL,
  attempt_number  integer DEFAULT 1,
  status          text DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','passed','failed')),
  started_at      timestamptz DEFAULT now(),
  submitted_at    timestamptz,
  time_spent_secs integer,
  hints_used      integer DEFAULT 0,
  language_used   text,
  submission_content text,  -- code/markdown/SQL text (for snapshot)
  score           numeric(5,2),
  elo_delta       integer,
  ai_feedback     jsonb,
  rubric_scores   jsonb
);

CREATE INDEX idx_attempts_user ON challenge_attempts(user_id);
CREATE INDEX idx_attempts_challenge ON challenge_attempts(challenge_id);
CREATE UNIQUE INDEX idx_attempts_latest ON challenge_attempts(user_id, challenge_id, attempt_number);

-- ─── ELO AUDIT LOG ────────────────────────────────────────────────────────────

CREATE TABLE elo_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users NOT NULL,
  attempt_id      uuid REFERENCES challenge_attempts(id),
  elo_before      integer NOT NULL,
  elo_after       integer NOT NULL,
  delta           integer NOT NULL,
  challenge_type  text,   -- 'foundation' | 'domain' (for skill radar)
  challenge_mode  text,   -- 'dsa' | 'sql' | 'system_design' etc.
  difficulty      text,
  multipliers     jsonb DEFAULT '{}',  -- {streak: 1.2, retry: 0.75, hints: 0.9}
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_elo_user_time ON elo_events(user_id, created_at DESC);

-- ─── HISTORY LEDGER ───────────────────────────────────────────────────────────

CREATE TABLE history_entries (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid REFERENCES auth.users NOT NULL,
  attempt_id                  uuid REFERENCES challenge_attempts(id) NOT NULL,
  challenge_id                uuid REFERENCES challenges(id),  -- nullable (in case challenge deleted)

  -- Snapshot (denormalized — immutable after insert)
  challenge_title             text NOT NULL,
  challenge_description_snapshot text,
  scenario_snapshot           text,
  objective_snapshot          text,
  submission_snapshot         text,  -- code/SQL/markdown submitted

  -- Scores
  score                       numeric(5,2),
  elo_before                  integer,
  elo_after                   integer,
  elo_delta                   integer,
  ai_feedback                 jsonb,  -- {summary, bullets[], rubric_breakdown{}}
  rubric_scores               jsonb,

  -- Classification
  challenge_type              text,  -- 'foundation' | 'domain'
  challenge_mode              text,
  difficulty                  text,
  skills_demonstrated         text[],
  topic_group                 text,
  language_used               text,
  sandbox_type                text,

  -- Time
  started_at                  timestamptz,
  submitted_at                timestamptz NOT NULL DEFAULT now(),
  time_spent_seconds          integer,
  attempt_number              integer DEFAULT 1,
  hints_used                  integer DEFAULT 0,

  -- Visibility
  is_recruiter_visible        boolean DEFAULT true,
  portfolio_entry_id          uuid,  -- FK added after portfolio_entries insert

  created_at                  timestamptz DEFAULT now()
);

CREATE INDEX idx_history_user_time ON history_entries(user_id, submitted_at DESC);

-- ─── PORTFOLIO ENTRIES ─────────────────────────────────────────────────────────

CREATE TABLE portfolio_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users NOT NULL,
  history_entry_id  uuid REFERENCES history_entries(id),

  -- Denormalized for public display (no JOIN needed on public portfolio)
  challenge_title   text NOT NULL,
  challenge_description_snapshot text,
  scenario_snapshot text,
  objective_snapshot text,
  submission_snapshot text,
  ai_feedback_summary text,      -- condensed for portfolio (1–2 sentences)

  score             numeric(5,2),
  elo_at_submission integer,
  challenge_type    text,
  challenge_mode    text,
  difficulty        text,
  skills_demonstrated text[],

  submitted_at      timestamptz NOT NULL,
  time_spent_seconds integer,
  language_used     text,

  is_featured       boolean DEFAULT false,  -- pinned to top of portfolio
  sort_order        integer DEFAULT 0,

  created_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_portfolio_user ON portfolio_entries(user_id, sort_order);

-- ─── RECRUITER VISIBILITY ──────────────────────────────────────────────────────

-- Lightweight view — recruiters query this, not history_entries directly
CREATE VIEW recruiter_visible_records AS
SELECT
  pe.id,
  p.username,
  p.full_name,
  p.college,
  p.elo_rating,
  pe.challenge_title,
  pe.challenge_description_snapshot,
  pe.scenario_snapshot,
  pe.objective_snapshot,
  pe.ai_feedback_summary,
  pe.score,
  pe.elo_at_submission,
  pe.challenge_type,
  pe.challenge_mode,
  pe.difficulty,
  pe.skills_demonstrated,
  pe.submitted_at,
  pe.language_used,
  pe.is_featured
FROM portfolio_entries pe
JOIN profiles p ON p.id = pe.user_id
WHERE pe.is_featured = true OR pe.sort_order < 20;

-- ─── LEADERBOARD ──────────────────────────────────────────────────────────────

CREATE TABLE leaderboard_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users NOT NULL,
  elo_rating  integer NOT NULL,
  tier        text,
  rank_global integer,
  rank_college integer,
  streak      integer,
  snapshot_date date DEFAULT current_date,
  path_type   text DEFAULT 'student'
);

CREATE UNIQUE INDEX idx_lb_user_date ON leaderboard_snapshots(user_id, snapshot_date);

-- Leaderboard snapshot cron: daily at midnight IST via pg_cron or Edge Function
-- INSERT INTO leaderboard_snapshots SELECT id, elo_rating, ... FROM profiles
-- ON CONFLICT (user_id, snapshot_date) DO UPDATE SET ...
```

## Row-Level Security (RLS)

```sql
-- history_entries: user sees own, recruiters see via portfolio_entries
ALTER TABLE history_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own history" ON history_entries
  FOR ALL USING (auth.uid() = user_id);

-- portfolio_entries: owner full access, public read for portfolio URL
ALTER TABLE portfolio_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own portfolio full" ON portfolio_entries
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "public portfolio read" ON portfolio_entries
  FOR SELECT USING (true);  -- filtered by username in app logic

-- challenge_attempts: user sees own only
ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts" ON challenge_attempts
  FOR ALL USING (auth.uid() = user_id);

-- elo_events: user sees own only
ALTER TABLE elo_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own elo" ON elo_events
  FOR ALL USING (auth.uid() = user_id);

-- job_profiles: user sees own only
ALTER TABLE job_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own job profile" ON job_profiles
  FOR ALL USING (auth.uid() = user_id);
```

---

# 9. Backend Flow

## A. User Opens Arena (`/arena`)

```
1. Browser loads Arena.jsx
2. useArenaState() fires:
   a. supabase.auth.onAuthStateChange() → get session
   b. supabase.from('profiles').select('*').eq('id', uid) → userData
   c. Subscribe Realtime channel on profiles table (existing)
3. Check localStorage slot cache (existing SLOTS_CACHE_KEY logic)
4. If cache miss: POST /api/arena/daily → {keyword, eloRating, skillGraph, path}
   Server returns 3–5 challenge cards for Today tab
5. Parallel: supabase.from('challenge_attempts')
     .select('*').eq('user_id', uid).eq('status', 'in_progress').limit(1)
   → populate "Quick Jump / Resume" row
6. Render Today tab with slots + Resume row
```

## B. User Starts a Challenge

```
1. Student clicks [Start Challenge] on a card
2. App navigates to /arena/challenge/{challengeId} OR opens modal (your call)
3. On mount:
   a. Fetch challenge content:
      - If Foundation (catalog): problemsDb.from('challenges').select('*').eq('id', id)
      - If AI-generated slot: already in memory from step 4 above
   b. INSERT into challenge_attempts:
      { user_id, challenge_id, attempt_number, status: 'in_progress', started_at: now() }
      → get attempt.id back
   c. buildSkeleton(task, domainKey) → populate editor (existing logic)
4. Start timer (on first keystroke, not page load)
5. Render two or three panel layout based on challenge.sandbox_type
```

## C. User Submits

```
1. Student clicks [Submit Solution]
2. App calls reviewAnswer({ task, answer, output, testResults, userData }) → arenaApi.js
3. Express server at /api/arena/review:
   a. AI evaluates against rubric
   b. Returns { score, eloDelta, feedback: { summary, bullets, rubric_breakdown } }
4. On success response:
   a. Calculate final ELO:
      - Apply multipliers (streak, retry, hints) in Edge Function OR client-side
      - newElo = Math.max(400, currentElo + adjustedDelta)
   b. Supabase writes (in parallel):
      i.  UPDATE challenge_attempts SET status='submitted', score, elo_delta, 
              submitted_at=now(), time_spent_secs, submission_content, ai_feedback
      ii. INSERT elo_events { user_id, attempt_id, elo_before, elo_after, delta, 
              challenge_type, challenge_mode, difficulty, multipliers }
      iii. INSERT history_entries { all snapshot fields + scores }
      iv. UPDATE profiles SET elo_rating=newElo, arena_completed+1, 
              arena_streak=newStreak, last_arena_date=today
      v.  If score >= 75: INSERT portfolio_entries (auto-add to portfolio)
   c. Local state updates:
      - setSlots() removes completed slot
      - setCompleted() prepends result
      - updateSlotsCache() marks slot complete
5. Show Post-Submission Overlay with score, ELO delta animation, AI feedback
```

## D. ELO Updates

```
ELO update is synchronous with submission (not async/eventual):
  - Calculate in client or Edge Function, write to profiles in same transaction
  - profiles.elo_rating is the source of truth
  - elo_events is the audit log
  - Supabase Realtime broadcasts profiles change → useArenaState re-renders EloRing
    (existing profileChannelRef subscription handles this)
```

## E. History Updates

```
history_entries INSERT happens in the same batch as challenge_attempts UPDATE.
History tab reads: supabase.from('history_entries')
  .select('*').eq('user_id', uid).order('submitted_at', { ascending: false })
  .range(0, 49)  -- paginated, 50 per page
```

## F. Aura Dashboard Updates

```
Aura dashboard reads from profiles (already live via Realtime subscription).
ELO sparkline reads from elo_events:
  supabase.from('elo_events')
    .select('elo_after, created_at')
    .eq('user_id', uid)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at')
Skill radar reads from elo_events grouped by challenge_mode (client-side aggregation).
```

## G. Portfolio Snapshot Write

```
IF score >= 75 OR student clicks "Add to Portfolio":
  INSERT portfolio_entries {
    user_id,
    history_entry_id: history_entry.id,
    challenge_title: history_entry.challenge_title,
    challenge_description_snapshot,
    scenario_snapshot,
    objective_snapshot,
    submission_snapshot,
    ai_feedback_summary: feedback.summary,  -- 1-2 sentence condensed version
    score,
    elo_at_submission: elo_before + delta,
    challenge_type, challenge_mode, difficulty,
    skills_demonstrated,
    submitted_at
  }
  Then UPDATE history_entries SET portfolio_entry_id = new_portfolio_entry.id
```

## H. Recruiter-Facing Records

```
Recruiter views public portfolio at: /portfolio/{username}
App queries:
  supabase.from('portfolio_entries')
    .select(`*, profiles!inner(full_name, college, elo_rating, username)`)
    .eq('profiles.username', username)
    .order('is_featured', { ascending: false })
    .order('submitted_at', { ascending: false })
No auth required for this query (public RLS policy).
Recruiter sees: title, scenario, objective, score, rubric bars, ai_feedback_summary,
  submitted_at, skills_demonstrated, elo_at_submission.
Recruiter does NOT see: hints_used, attempt_number, other users' data.
```

## I. Path Transition

```
Trigger: Student submits "I got a job" form OR recruiter marks placement.

Edge Function: handle_path_transition(user_id, trigger_type, job_details)
  1. BEGIN transaction
  2. SELECT path_type FROM profiles WHERE id = user_id → verify is 'student'
  3. INSERT user_path_transitions { user_id, from='student', to='professional', trigger_type }
  4. UPDATE profiles SET path_type='professional', professional_since=now()
  5. INSERT job_profiles { user_id, job_title, company_name, joining_date, role_skills }
  6. COMMIT
  7. Send transactional email via Resend/SendGrid:
     "Welcome to your Professional Path at Capabilio 🎉"
  8. Client-side: clear localStorage slot cache (force new recommendation set)
  9. On next login: show onboarding modal wizard (4 steps described in section 7)
```

---

# 10. Frontend Architecture

## Page/Component Tree

```
src/
├── pages/
│   ├── Arena.jsx                   ← REFACTOR: remove DomainLanding as default entry
│   │   ├── ArenaHeader             ← ELO strip (extracted from Arena.jsx)
│   │   ├── ArenaTabs               ← Today | Foundation | Role Practice | History | Leaderboard
│   │   ├── TodayTab/
│   │   │   ├── NextBestAction      ← single recommended card
│   │   │   ├── TodaySet            ← 3 AI-curated cards
│   │   │   └── QuickJump           ← resume in-progress attempt
│   │   ├── FoundationTab/
│   │   │   ├── ChallengeFilterBar  ← difficulty, topic, language, status
│   │   │   ├── TopicGroupList      ← collapsible groups with progress rings
│   │   │   └── ChallengeCard       ← reusable (used in all tabs)
│   │   ├── RolePracticeTab/
│   │   │   ├── DomainChipBar       ← SQL · Python · System Design etc.
│   │   │   ├── ChallengeFilterBar  ← shared component
│   │   │   └── ChallengeCard       ← shared component
│   │   ├── HistoryTab/
│   │   │   ├── HistoryStatsBar     ← total attempts, avg score, ELO trend sparkline
│   │   │   ├── HistoryTimeline     ← grouped by week
│   │   │   └── HistoryEntryCard    ← expandable, with feedback + portfolio CTA
│   │   └── LeaderboardTab/
│   │       ├── LeaderboardTierFilter
│   │       └── LeaderboardRow
│   │
│   ├── ChallengeView.jsx           ← NEW: dedicated challenge solving page
│   │   ├── ChallengeProblemPanel   ← left panel (scenario, rubric, hints)
│   │   ├── ChallengeWorkstation    ← center (WorkstationRouter — existing)
│   │   ├── AICopilotPanel          ← right (existing)
│   │   └── PostSubmitOverlay       ← score breakdown, ELO animation, feedback
│   │
│   ├── Portfolio.jsx               ← EXTEND: add Portfolio Trail section
│   │   └── PortfolioTrail          ← pulls from portfolio_entries
│   │
│   └── ProArena.jsx                ← NEW (Phase 3): Professional Path Arena
│
├── hooks/
│   ├── useArenaState.js            ← EXTEND: add loadHistory(), addToPortfolio()
│   ├── useArenaMissions.js         ← keep as-is
│   ├── useChallengeAttempt.js      ← NEW: manages single attempt lifecycle
│   └── useEloHistory.js            ← NEW: loads elo_events for sparkline/radar
│
├── components/
│   ├── ChallengeCard.jsx           ← NEW: unified card for all tabs
│   ├── EloRing.jsx                 ← EXTRACT from Arena.jsx (currently inline)
│   ├── EloSparkline.jsx            ← NEW: 30-day ELO trend line
│   ├── SkillRadar.jsx              ← NEW: domain sub-scores radar chart
│   ├── RubricBreakdown.jsx         ← NEW: score bars (used in post-submit + history)
│   ├── ChipBar.jsx                 ← NEW: reusable filterable chip row
│   └── PathTransitionModal.jsx     ← NEW: 4-step wizard for professional onboarding
│
├── config/
│   ├── arenaDomains.js             ← keep, add challenge_mode field
│   └── eloConfig.js                ← NEW: K factors, difficulty baselines, multipliers
│
└── services/
    ├── arenaApi.js                 ← keep, add submitAttempt(), loadHistory()
    ├── eloEngine.js                ← NEW: client-side ELO calculation with multipliers
    └── portfolioService.js         ← NEW: addToPortfolio(), loadPortfolioTrail()
```

## Reusable Component List

| Component | Props | Used in |
|-----------|-------|---------|
| `ChallengeCard` | `challenge, attempt, onStart, variant` | Today, Foundation, RolePractice tabs |
| `EloRing` | `elo, size, color` | ArenaHeader, Aura dashboard |
| `EloSparkline` | `events[], width, height` | HistoryStatsBar, Aura dashboard |
| `SkillRadar` | `domainScores{}` | Aura dashboard, Portfolio header |
| `RubricBreakdown` | `rubricScores{}, criteria[]` | PostSubmitOverlay, HistoryEntryCard |
| `ChipBar` | `options[], value, onChange` | Foundation/RolePractice filter bars, DomainChipBar |
| `Badge` | `children, color, bg` | existing — keep |
| `Dot` | `color, pulse` | existing — keep |
| `DomainChipBar` | `selectedDomain, onSelect` | RolePractice tab |
| `PostSubmitOverlay` | `score, eloBefore, eloAfter, feedback, onRetry, onNext, onPortfolio` | ChallengeView |
| `PathTransitionModal` | `isOpen, onComplete` | triggered after placement detection |

## State Model

```javascript
// useArenaState (extend existing)
{
  user,              // auth.User
  userData,          // profiles row
  loading,
  initialized,
  slots,             // today's AI-generated challenges (existing)
  completed,         // today's completed slots (existing)
  streak,
  elo,
  tier,
  loadingSlots,

  // NEW:
  history,           // history_entries[] loaded on History tab open (lazy)
  historyLoading,
  eloEvents,         // elo_events[] for sparkline (lazy, last 30 days)
  portfolioEntries,  // portfolio_entries[] (lazy, loaded on Portfolio Trail open)
}

// useChallengeAttempt (new hook, per-challenge)
{
  attempt,           // current challenge_attempts row
  submission,        // user's current code/SQL/markdown
  testResults,       // run test results
  status,            // 'idle' | 'running' | 'submitting' | 'submitted'
  reviewResult,      // {score, eloDelta, feedback}
  hintsUsed,
  timerSeconds,

  // actions:
  startAttempt(),
  updateSubmission(content),
  runTests(),
  submitAttempt(),
  useHint(),
}
```

## Server-Side vs Client-Side

| Concern | Location | Rationale |
|---------|----------|-----------|
| Challenge catalog data | Supabase (problemsDb) | Static content, cacheable |
| Daily slot generation | Express server (`/api/arena/daily`) | AI-personalized, needs server |
| AI review / scoring | Express server (`/api/arena/review`) | LLM call, needs server |
| ELO calculation | Client-side (`eloEngine.js`) + verified in Edge Function | Fast UX, then server-verified write |
| History writes | Supabase client directly (RLS protected) | No server hop needed |
| Path transition | Supabase Edge Function | Transactional, multi-table, email send |
| Leaderboard snapshots | Supabase pg_cron or Edge Function cron | Daily batch job |
| Portfolio public reads | Supabase client (public RLS) | No auth required |

## React Folder Structure

```
src/
  pages/
    Arena/
      index.jsx           ← Arena.jsx (refactored entry, tab routing)
      TodayTab.jsx
      FoundationTab.jsx
      RolePracticeTab.jsx
      HistoryTab.jsx
      LeaderboardTab.jsx
    Challenge/
      index.jsx           ← ChallengeView (replaces inline workstation in Arena.jsx)
      ProblemPanel.jsx
      WorkstationWrapper.jsx
      PostSubmitOverlay.jsx
    Portfolio/
      index.jsx
      PortfolioTrail.jsx
  components/
    arena/
      ChallengeCard.jsx
      ChipBar.jsx
      DomainChipBar.jsx
      EloRing.jsx
      EloSparkline.jsx
      SkillRadar.jsx
      RubricBreakdown.jsx
    shared/
      Badge.jsx           ← extracted from Arena.jsx
      Dot.jsx
      Spinner.jsx
  hooks/
    useArenaState.js
    useChallengeAttempt.js
    useEloHistory.js
    useArenaMissions.js
  services/
    arenaApi.js
    eloEngine.js
    portfolioService.js
  config/
    arenaDomains.js
    eloConfig.js
    plans.js
```

---

# 11. UX Rules

## Primary vs Secondary

1. **Primary action per screen = one.** On Today tab: "Start [Next Best Challenge]". On Foundation tab: "Start [selected challenge]". Never two primary CTAs competing.
2. **ELO is primary identity signal.** Show it above the fold on every Arena view. Not the streak. Not the completion count. ELO first.
3. **Challenge type is secondary context.** The chip (`Foundation` / `SQL` / `System Design`) sits *on the card*, not as a nav decision. Students don't choose challenge types — they see them as flavoring on challenges.

## Reducing Overwhelm

4. **The Today tab is the default.** 3 curated challenges is enough. Don't show the full catalog by default. The catalog is one tab click away (Foundation / Role Practice).
5. **Lock advanced topics.** Foundation tab shows locked topic groups until prerequisites are met. This creates a learning path rather than an open bazaar.
6. **Filter bar defaults to "All" — never show zero results.** If a filter combination returns 0, show a "No challenges match — [clear filters]" state immediately.
7. **Progressive disclosure in challenge cards.** Card shows: title, type, difficulty, ELO reward, time estimate. Everything else (scenario, skills, rubric) is in the challenge view — not on the card.

## Showing Both Challenge Types Without Splitting Users

8. **On the Today tab, always mix.** The AI recommendation should include at least 1 Foundation challenge and 1 Domain challenge in every daily set. Never a 3/0 split.
9. **Domain chip bar, not domain landing.** In Role Practice tab, domain selection is a horizontal chip bar (SQL · Python · System Design · etc.) — not a 12-card grid. Chips are compact. Students stay in context.
10. **Shared vocabulary.** All challenges use the same word "Challenge" — not "Mission" vs "Problem" vs "Task". Consistent language reduces disorientation.

## What to Hide Until Relevant

11. **Hide DomainLanding (12-domain workstation grid) until "Explore Workstations" is clicked.** Move it behind a CTA, not as the default entry point.
12. **Hide portfolio toggle until score ≥ 50.** Below 50 points, don't surface "Add to Portfolio" — it's demoralizing.
13. **Hide leaderboard rank until 5+ challenges completed.** Show a placeholder: "Complete 5 challenges to unlock your rank." Prevents embarrassment for new users.
14. **Hide Professional Path options until placement event.** No "Upgrade to Pro" or "Add Job" UI in student path. The transition happens contextually.
15. **AI Copilot starts collapsed on mobile.** On desktop it's a permanent right panel. On mobile it's a floating button that opens a bottom sheet.

## Other Rules

16. **Retry is always available.** Never dead-end a student. After a failed attempt, always show "Retry" as a primary option.
17. **Score feedback before ELO feedback.** Show score (88/100) first, then ELO impact (+18). Students care about how they did before they care about the point system.
18. **Never show "0 ELO" on bad submissions.** Minimum visible message: "You gained +2 ELO for attempting." Effort is always recognized.

---

# 12. Copy Suggestions

## Tabs

| Element | Copy |
|---------|------|
| Tab 1 | `Today ★` |
| Tab 2 | `Foundation` |
| Tab 3 | `Role Practice` |
| Tab 4 | `History` |
| Tab 5 | `Leaderboard` |

## Challenge Type Chips

| Type | Chip label |
|------|-----------|
| DSA | `🧩 Foundation` |
| SQL | `🗃️ SQL` |
| System Design | `🏗️ System Design` |
| Frontend | `🖥️ Frontend` |
| Backend | `⚙️ Backend` |
| Data Analyst | `📊 Data Analyst` |
| Product | `📱 Product` |
| DevOps | `🚀 DevOps` |

## Empty States

| Screen | Empty state copy |
|--------|-----------------|
| Today tab, no slots loaded | "Setting up your session… ⚡" (spinner) |
| History tab, no history | "Your practice record starts here. Complete a challenge to see it." |
| Portfolio trail, no entries | "Complete challenges with a score ≥ 75 to build your portfolio. Recruiters can verify this work." |
| Leaderboard, < 5 challenges | "Complete 5 challenges to unlock your leaderboard rank." |
| Foundation, no results for filter | "No challenges match — try clearing filters." |
| Role Practice, domain selected, no challenges | "More [SQL] challenges coming soon. Try browsing [Foundation] for now." |

## CTA Buttons

| Action | Button copy |
|--------|------------|
| Start a new challenge | `Start Challenge` |
| Resume in-progress | `Resume →` |
| Submit solution | `Submit Solution` |
| Save progress | `Save Draft` |
| Request a hint | `Get a Hint (–5 pts)` |
| View AI feedback | `View Feedback ▾` |
| Add to portfolio | `Add to Portfolio` |
| View public portfolio | `View Public Profile →` |
| Retry a challenge | `Try Again` |
| Go to next challenge | `Next Challenge →` |
| Skip today's recommendation | `Show me a different one` |
| Refresh today's set | `Refresh Set ↻` |

## Recruiter Visibility Badges

| State | Badge copy |
|-------|-----------|
| Visible to recruiters | `⬛ Recruiter Visible` (solid badge, green) |
| Hidden from recruiters | `◻ Hidden` (ghost badge, grey) |
| Auto-added (score ≥ 75) | `✓ Added to Portfolio` |
| Verified submission | `🔒 Timestamped Proof` |

## Placement Transition Flow

| Step | Copy |
|------|------|
| CTA to start transition | `I got placed! 🎉` |
| Confirmation header | `Congratulations on your placement!` |
| Transition screen subhead | `Your student history, ELO, and portfolio are preserved.` |
| Step 1 header | `Tell us about your role` |
| Step 2 header | `What will you be working with?` |
| Step 3 header | `What are your 90-day goals?` |
| Step 4 header | `Your Professional Path is ready` |
| Step 4 subtext | `Everything you built as a student is still here. Now we'll tailor your growth to your role at [Company].` |
| Final CTA | `Go to My Professional Arena →` |

## Aura Dashboard

| Element | Copy |
|---------|------|
| Tier label progression | `Rookie → Apprentice → Practitioner → Expert → Master → Elite` |
| ELO progress bar tooltip | `[X] pts to [NextTier]` |
| Streak label | `🔥 [N]-day streak` |
| Skill radar empty state | `Attempt 5+ domain challenges to see your skill breakdown.` |

---

# 13. Implementation Plan

## Phase 1 — Student Arena MVP (Weeks 1–4)

**Goal:** One Arena page, two challenge modes, ELO writes, History tab functional.

### Database (Week 1)
- [ ] Add `challenge_mode` column to `challenges` table (backfill 'foundation' for DSA, 'domain' for rest)
- [ ] Create `history_entries` table (full schema from Section 8)
- [ ] Create `elo_events` table
- [ ] Create `portfolio_entries` table (simplified: no recruiter_visible_records view yet)
- [ ] Add `arena_preferences` JSONB column to `profiles`
- [ ] Apply RLS policies on all new tables
- [ ] Backfill existing `arena_submissions` data into `history_entries`

### Backend (Week 1–2)
- [ ] Extend `/api/arena/review` to return `rubric_breakdown` (object with criterion scores)
- [ ] Add `challenge_mode` and `challenge_type` to review response
- [ ] Add `/api/arena/daily` to return mixed Foundation + Domain set (already exists, add `challenge_mode` to each returned challenge)

### Frontend (Weeks 2–4)
- [ ] Refactor `Arena.jsx`: replace DomainLanding default with Today tab
- [ ] Build `ArenaTabs` component with Today | Foundation | Role Practice | History | Leaderboard
- [ ] Build `TodayTab` (NextBestAction card + TodaySet grid + QuickJump row)
- [ ] Build `FoundationTab` (filter bar + TopicGroupList using existing catalog data)
- [ ] Build `RolePracticeTab` (DomainChipBar + challenge grid)
- [ ] Extract `ChallengeCard` as shared component
- [ ] Build `HistoryTab` (timeline + HistoryEntryCard with expandable feedback)
- [ ] Extend `useArenaState.markCompleted()` to write `history_entries`, `elo_events`
- [ ] Build `PostSubmitOverlay` with RubricBreakdown
- [ ] Add `eloEngine.js` with multiplier logic (streak, retry, hints)

### Quality bar for Phase 1
- Student completes a Foundation challenge → appears in History tab ✓
- Student completes a Domain challenge → appears in History tab ✓
- ELO updates in real-time after submission ✓
- History entries have snapshot fields (not just IDs) ✓

---

## Phase 2 — Portfolio Trail + Recruiter Visibility (Weeks 5–8)

**Goal:** Portfolio trail built, public profile works, recruiter can trust the data.

### Database (Week 5)
- [ ] Create `recruiter_visible_records` VIEW
- [ ] Add `is_recruiter_visible` to `portfolio_entries`
- [ ] Create `leaderboard_snapshots` table
- [ ] Set up daily leaderboard snapshot Edge Function (or Supabase pg_cron)

### Frontend (Weeks 5–7)
- [ ] Build `PortfolioTrail` component in Portfolio page
- [ ] Build public portfolio page at `/portfolio/{username}` (no auth required)
- [ ] Add "Add to Portfolio" CTA to HistoryEntryCard and PostSubmitOverlay
- [ ] Auto-add to portfolio when score ≥ 75
- [ ] Build `EloSparkline` component (30-day trend)
- [ ] Build `SkillRadar` component (domain sub-scores from `elo_events`)
- [ ] Add `SkillRadar` to Aura dashboard
- [ ] Build `LeaderboardTab` with tier filtering and rank display
- [ ] Add "Recruiter Visible" toggle to portfolio entries

### Quality bar for Phase 2
- Public portfolio URL works without login ✓
- Recruiter sees timestamped proof with scenario + score + rubric ✓
- Leaderboard ranks visible after 5+ challenges ✓
- Skill radar appears on Aura after 5+ domain challenges ✓

---

## Phase 3 — Student-to-Professional Transition (Weeks 9–12)

**Goal:** Placement transition flow, Professional Path Arena, job profile onboarding.

### Database (Week 9)
- [ ] Create `user_path_transitions` table
- [ ] Create `job_profiles` table (job_title, company, joining_date, role_skills, onboarding_goals)
- [ ] Create Supabase Edge Function: `handle_path_transition`

### Backend (Week 9–10)
- [ ] Edge Function: validate transition, write 3 tables, send email
- [ ] Extend `/api/arena/daily` to accept `path_type='professional'` and filter by `role_skills`
- [ ] Add professional path AI recommendation weights (role-skill-biased)

### Frontend (Weeks 10–12)
- [ ] Build `PathTransitionModal` (4-step wizard)
- [ ] Add "I got placed!" CTA to student profile/settings page
- [ ] Build `ProArena.jsx` page (professional arena entry with role context strip)
- [ ] Update app router: if `path_type='professional'`, default to ProArena
- [ ] Keep `/arena` and `/arena/history` accessible from ProArena nav
- [ ] Update Portfolio header to show "Software Engineer @ Company" for professional path users
- [ ] Build 90-day onboarding goals tracker component in ProArena
- [ ] Add `professional_since` day counter to ProArena header

### Quality bar for Phase 3
- Student triggers placement → all student data preserved ✓
- Login redirects to ProArena ✓
- Job profile onboarding wizard completes cleanly ✓
- Arena recommendations filtered by role_skills ✓
- Student history visible at /arena/history from ProArena ✓

---

## Migration Notes for Existing Data

```sql
-- Migrate arena_submissions → history_entries (run once)
INSERT INTO history_entries (
  user_id, challenge_id, challenge_title, challenge_mode,
  challenge_type, difficulty, score, elo_delta, submitted_at, language_used
)
SELECT
  user_id,
  NULL as challenge_id,  -- no FK if challenges are in problemsDb
  title as challenge_title,
  CASE WHEN domain = 'swe' THEN 'foundation' ELSE 'domain' END as challenge_mode,
  domain as challenge_type,
  difficulty,
  score,
  elo_delta,
  submitted_at,
  lang as language_used
FROM arena_submissions;
```

---

## Tech Debt to Address in Phase 1

1. **Two Supabase clients** (`supabase` + `problemsDb`): this creates confusion. Decide: either migrate all challenges into main Supabase or keep them separate but make it explicit in a `db.js` abstraction file. Do not have two `createClient()` calls scattered across components.
2. **localStorage slot cache**: currently keyed by keyword only. Add `challenge_mode` to cache key so Foundation and Domain slots don't collide.
3. **`arena_submissions` table**: this will be superseded by `history_entries`. Keep it as a write target in Phase 1 (backward compat), deprecate in Phase 2.
4. **ELO tiers**: defined twice — in `Arena.jsx` (`ELO_TIERS`) and in `useArenaState.js` (inline string comparison). Extract to `eloConfig.js` and import from there.
5. **`profiles.keyword`**: a freetext field used for domain resolution. This is fragile. In Phase 2, add `profiles.primary_domain` (enum matching ARENA_DOMAINS keys) and populate via the onboarding micro-survey.
