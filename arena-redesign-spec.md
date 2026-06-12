# Capabilio Arena — Redesign Specification
> Version 1.0 · June 2026 · Venkat Kopuri

---

## 1. Information Architecture

```
Arena
├── Home (dashboard)
├── Practice
│   ├── Student Challenges  ← 201 DSA problems (ELO-gated)
│   └── Domain Challenges
│       ├── SQL             (59 problems)
│       ├── System Design   (57 problems)
│       ├── Python / Pandas
│       ├── Backend
│       └── Product
├── My Progress
│   ├── History             ← timestamped attempt log, recruiter-visible
│   └── Leaderboard         ← ELO rankings, India-wide
└── Contests (upcoming)
```

**Design principle:** Student Challenges = ELO currency for students. Domain Challenges = proof of professional depth for recruiters. They share one ELO score but are filtered separately.

---

## 2. Page-by-Page Layouts

### 2.1 Arena Home

**Purpose:** Quick orientation, ELO pride moment, re-engagement hook.

```
[ELO Hero Card] — gradient, prominent 52px ELO number, tier badge, 6 inline stats
[Continue Card] — last attempted problem, one-click resume
[Quick-Start 2-col grid] — Student | Domain
[Recent Activity] — 3 rows, inline ELO delta, timestamps
```

**Primary action:** Resume last problem or start new challenge.
**Secondary:** See full history, check leaderboard rank.

---

### 2.2 Student Challenges

**Purpose:** Browse and filter 201 DSA problems, track personal progress.

```
[Section header + subtitle]
[Progress bar card] — 47/201, segmented: Solved / Attempted / Untouched
[Filters bar] — Search | All/Easy/Medium/Hard | Tags ▾ | Status ▾
[Problem table]
  # | Title | Difficulty | Acceptance Rate | Tags | Status
[Load more footer]
```

**Table behaviour:**
- Row click → navigate to Solve page
- Hover row → primary-bg highlight
- Solved rows show green ✓ badge
- Attempted rows show amber ○ badge

**Progress breakdown (from DB):**
- Easy: 93 problems
- Medium: 93 visible (of 255 total)
- Hard: 15 visible (of 54 total)
- Total visible: 201

---

### 2.3 Domain Challenges

**Purpose:** Role-based challenge catalog with category tabs.

```
[Section header]
[Category tabs] — SQL (59) | System Design (57) | Pandas | Backend | Product
[2-column card grid per tab]
  Card: icon · title · difficulty badge · time · +ELO
        description (2 lines)
        tags chips
        attempts + solve rate + [Start →] button
```

**Card hover state:** lift +1px, border turns primary, shadow deepens.

---

### 2.4 Problem Solving Page

**Purpose:** Focus-first coding experience. Minimise distraction. Maximise flow.

```
[Topbar] — problem title + difficulty badge + timer (right)
[Split Pane, 46% | 54%]
  LEFT PANEL (scrollable)
    [Problem tabs] — Description | Hints | Editorial | Submissions
    [Problem statement, examples, constraints]
    [Hint rows — collapsed by default]
  RIGHT PANEL (dark theme)
    [Editor toolbar] — Language selector | timer
    [Code area — dark #1E1E2E, JetBrains Mono]
    [Test results panel — dark, collapsible]
    [Footer] — Run Tests | ← Back | Submit →
```

**Key details:**
- Language selector: Python, Java, JavaScript, C++, Go (from `problems.languages[]`)
- Code template pre-filled from `problems.test_cases[0]` or domain skeleton
- Timer starts on page load, visible but not alarming
- Submit → calls judge → shows ELO delta inline
- Editorial unlocked only after first accepted submission

---

### 2.5 History Tab

**Purpose:** Timestamped activity log for students (self-review) and recruiters (signal).

```
[Section header] [Manage visibility button]
[Filter tabs] — All | ✓ Solved | ○ Attempted | 🧩 Student | 💼 Domain
[Date groups]
  ── June 9, 2026 ──
  [Timeline item]
    ● dot (green=solved, amber=attempted)
    Title · Difficulty badge · Type · ELO delta · Recruiter visible badge
    time (right)
```

**Recruiter visibility:**
- 👁 "Recruiter visible" badge (primary blue) = public
- 🔒 "Private" badge (grey) = hidden from profile
- Toggle per-item on the manage-visibility screen

**Data source:** `arena_history` + `elo_events` joined on `source_id`.

---

### 2.6 Leaderboard Tab

**Purpose:** Social proof, competitive motivation, recruiter signal of relative skill.

```
[Filter tabs] — All Time | This Week | This Month
[Region label] — 🇮🇳 India · 2,341 ranked students
[Leaderboard table]
  Rank (🥇🥈🥉 for top 3) | Student + College | ELO | Solved | Top Domain | 🔥 Streak
[Current user row highlighted] — primary-bg gradient
[Load more]
```

**Recruiter read-only view:** Same table, but with "Contact" CTA next to each row.

---

## 3. Component Breakdown

| Component | Reused In | Key Props |
|-----------|-----------|-----------|
| `ELOHero` | Home | elo, tier, delta, stats[] |
| `StatCard` | Home, Leaderboard | label, value, sub, delta |
| `ContinueCard` | Home | problem, lastAttemptedAt |
| `QuickStartCard` | Home | icon, title, desc, chips, count |
| `ActivityRow` | Home, History | title, diff, type, eloD, time |
| `ProgressBar` | Student | solved, total, segments |
| `FiltersBar` | Student, History, Leaderboard | filters[], activeFilter, onSearch |
| `ProblemRow` | Student | num, title, diff, acceptance, tags, status |
| `DomainCard` | Domain | title, diff, mins, elo, desc, tags, stats |
| `SolveLayout` | Solve | problem, onSubmit |
| `CodeEditor` | Solve | language, code, onChange |
| `TestPanel` | Solve | results[], status |
| `TimelineItem` | History | title, diff, type, status, eloD, time, visible |
| `LeaderboardRow` | Leaderboard | rank, user, elo, solved, domain, streak, isMe |
| `TierBadge` | Sidebar, Leaderboard | elo |
| `DifficultyBadge` | Everywhere | difficulty |
| `RecruiterBadge` | History | visible |

---

## 4. Visual Hierarchy

### Primary (must be seen immediately)
- ELO number on home
- Problem title on solve page
- Submit button on solve page
- Difficulty badge on every problem row

### Secondary (action-guiding)
- Stats row (solved count, streak, rank)
- Filters bar (active state clearly visible)
- Test result status (pass/fail colour)
- ELO delta on History rows

### Tertiary (contextual, scannable)
- Tags and chips
- Acceptance rate
- Timestamps
- College names on Leaderboard

---

## 5. Navigation Structure

```
Sidebar (240px, always visible on desktop)
├── Logo + "ARENA" badge
├── User card (avatar, name, ELO, tier)
├── [Practice]
│   ├── ⚡ Home             /arena
│   ├── 🧩 Student         /arena/student          badge: 201
│   └── 💼 Domain          /arena/domain
├── [My Progress]
│   ├── 📋 History          /arena/history
│   └── 🏆 Leaderboard     /arena/leaderboard
└── 🔥 Streak counter (bottom)

Topbar (50px, contextual)
- Shows page title
- Solve page: problem title + difficulty + timer + ← Back
- Other pages: quick-jump buttons to Student / Domain

Deep Link Pattern:
  /arena/student/{slug}   → Solve view for that problem
  /arena/domain/{tab}     → Domain tab pre-selected
```

---

## 6. Supabase Data Model

### Existing tables (already in DB)

**`problems`** — Student challenge catalog
```sql
id uuid PK
title text
slug text UNIQUE
difficulty text          -- 'Easy' | 'Medium' | 'Hard'
category text            -- 'DSA' | 'SQL' | 'System Design'
tags text[]
statement text
constraints text
examples jsonb           -- [{input, output, explanation}]
test_cases jsonb         -- [{input, expected}]
editorial text           -- locked until first AC
languages text[]         -- ['Python','Java','JavaScript','Go']
acceptance_rate float    -- computed, updated on submissions
created_at timestamptz
```

**`arena_history`** — Domain challenge completions
```sql
id uuid PK
user_id uuid → profiles
task_id text             -- domain challenge ID
title text
domain text
difficulty text
score integer
elo_delta integer
feedback text
user_answer text
expected_output text
visible_in_portfolio boolean DEFAULT true
type text DEFAULT 'arena'
completed_at timestamptz
```

**`elo_events`** — Every ELO change
```sql
id uuid PK
user_id uuid → profiles
source text              -- 'arena_history' | 'challenge_submission' | 'contest'
source_id uuid           -- FK to the triggering row
domain text
delta integer
elo_before integer
elo_after integer
note text
created_at timestamptz
```

**`profiles`** — Denormalised ELO stats
```sql
elo_rating integer DEFAULT 800
arena_streak integer DEFAULT 0
arena_last_active timestamptz
arena_completed integer DEFAULT 0
arena_last_elo_delta integer DEFAULT 0
last_arena_day text
```

---

### New tables to add

**`challenge_submissions`** — Student DSA problem attempts
```sql
CREATE TABLE challenge_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  problem_id      uuid NOT NULL REFERENCES problems(id),
  status          text NOT NULL,        -- 'accepted' | 'wrong_answer' | 'tle' | 'runtime_error' | 'compile_error'
  language        text NOT NULL,
  code            text,
  runtime_ms      integer,
  memory_kb       integer,
  test_cases_total   integer,
  test_cases_passed  integer,
  elo_delta       integer DEFAULT 0,   -- populated after judge
  is_recruiter_visible boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX ON challenge_submissions(user_id, created_at DESC);
CREATE INDEX ON challenge_submissions(problem_id);
```

**ELO trigger on acceptance:**
```sql
CREATE OR REPLACE FUNCTION trigger_elo_on_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  v_elo_before integer;
  v_delta      integer;
  v_prob_diff  text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Only ELO on first acceptance
    IF EXISTS (
      SELECT 1 FROM challenge_submissions
      WHERE user_id = NEW.user_id AND problem_id = NEW.problem_id
        AND status = 'accepted' AND id != NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    SELECT difficulty INTO v_prob_diff FROM problems WHERE id = NEW.problem_id;
    v_delta := CASE v_prob_diff
      WHEN 'Easy'   THEN 15
      WHEN 'Medium' THEN 25
      WHEN 'Hard'   THEN 40
      ELSE 15
    END;

    SELECT elo_rating INTO v_elo_before FROM profiles WHERE id = NEW.user_id;

    -- Write ELO event
    INSERT INTO elo_events (user_id, source, source_id, domain, delta, elo_before, elo_after)
    VALUES (NEW.user_id, 'challenge_submission', NEW.id, 'DSA', v_delta,
            v_elo_before, v_elo_before + v_delta);

    -- Update profile
    UPDATE profiles
    SET elo_rating          = v_elo_before + v_delta,
        arena_completed     = arena_completed + 1,
        arena_last_active   = now(),
        arena_last_elo_delta = v_delta
    WHERE id = NEW.user_id;

    NEW.elo_delta := v_delta;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER elo_on_submission_accepted
  BEFORE UPDATE ON challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION trigger_elo_on_acceptance();
```

**`leaderboard_cache`** — Pre-computed rankings (refresh every 5 min via cron)
```sql
CREATE TABLE leaderboard_cache (
  user_id          uuid PRIMARY KEY REFERENCES profiles(id),
  rank_all_time    integer,
  rank_this_week   integer,
  rank_this_month  integer,
  total_solved     integer,
  top_domain       text,
  elo              integer,
  streak           integer,
  refreshed_at     timestamptz DEFAULT now()
);
```

**`problem_visibility`** — Per-user visibility controls for recruiter view
```sql
CREATE TABLE problem_visibility (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id),
  submission_id   uuid REFERENCES challenge_submissions(id),
  history_id      uuid REFERENCES arena_history(id),
  visible         boolean DEFAULT true,
  updated_at      timestamptz DEFAULT now(),
  CONSTRAINT one_source CHECK (
    (submission_id IS NOT NULL)::int + (history_id IS NOT NULL)::int = 1
  )
);
```

**Recruiter query — timestamped activity view:**
```sql
-- Recruiters call this view for a candidate's public timeline
CREATE VIEW recruiter_activity AS
SELECT
  p.id           AS user_id,
  p.display_name,
  p.elo_rating,
  pr.title,
  pr.difficulty,
  pr.category,
  cs.status,
  cs.language,
  cs.created_at  AS attempted_at,
  cs.elo_delta
FROM challenge_submissions cs
JOIN profiles p ON p.id = cs.user_id
JOIN problems pr ON pr.id = cs.problem_id
WHERE cs.is_recruiter_visible = true
  AND cs.status = 'accepted'
ORDER BY cs.created_at DESC;
```

---

## 7. Style Direction

### Color Tokens
```
--primary:       #5B6AD2   (Capabilio indigo)
--primary-bg:    #EEF2FF
--primary-border:#C7D2FE
--green:         #16A34A   (solved / easy)
--amber:         #D97706   (attempted / medium)
--red:           #DC2626   (hard)
--purple:        #7C3AED   (expert / system design)
--surface:       #FFFFFF
--bg:            #F5F5F7
--border:        #E5E7EB
--text:          #0F172A
--text-muted:    #6B7280
--sidebar:       #0F172A
```

### ELO Tier Colors
| Tier | Range | Color |
|------|-------|-------|
| Rookie | 0–600 | #94A3B8 |
| Apprentice | 600–800 | #22C55E |
| Practitioner | 800–1000 | #3B82F6 |
| Expert | 1000–1200 | #8B5CF6 |
| Master | 1200–1500 | #F59E0B |
| Elite | 1500+ | #EF4444 |

### Typography
```
Body:     Inter 14px/400, line-height 1.5
Labels:   Inter 11px/600, uppercase, letter-spacing 0.06em
Headings: Inter 16–28px/700–800
Numbers:  JetBrains Mono (ELO, acceptance rates, code)
Code:     JetBrains Mono 13px
```

### Spacing
- Grid: 8px base unit
- Card padding: 18–24px
- Section gap: 20px
- Table row height: min 44px (touch-friendly)

### Cards
- Border: 1px solid #E5E7EB
- Border-radius: 12px
- Shadow: 0 1px 2px rgba(0,0,0,.05) default; deepen on hover
- Hover: border-color → primary, translateY(-1px)

### Active States
- Nav item: full primary-bg background, white text
- Filter button: primary-bg border + text
- Table row: primary-bg on hover, cursor pointer

---

## 8. Microcopy

### Buttons
| Action | Copy |
|--------|------|
| Start fresh problem | "Start →" |
| Resume problem | "Resume →" |
| Run test cases | "▶ Run Tests" |
| Submit solution | "Submit →" |
| View all history | "View all →" |
| Toggle recruiter view | "Manage visibility" |

### Empty States
| Screen | Title | Body | CTA |
|--------|-------|------|-----|
| Student (no results) | "No problems found" | "Try removing some filters." | "Clear filters" |
| History (empty) | "No activity yet" | "Solve your first challenge to start building your timeline." | "Browse Student Challenges" |
| Leaderboard (not ranked) | "You're not ranked yet" | "Solve at least 5 challenges to appear on the board." | "Start a Challenge" |
| Domain tab coming soon | "Coming Soon" | "This domain track is being prepared." | — |

### Status Labels
- After AC submission: "✓ Accepted — 25/25 passed · +20 ELO · Runtime 42ms (beats 87%)"
- After WA: "✗ Wrong Answer — 18/25 passed · Fix and resubmit"
- Recruiter visible: "👁 Recruiter visible"
- Private: "🔒 Private"

### ELO Delta (inline)
- Gain: "+20 ELO" in green bg
- Loss: "−8 ELO" in red bg
- Neutral: "0 ELO" in grey

---

## 9. Recruiter Experience Notes

Recruiters access a candidate's arena profile via `/profile/{username}/arena`. They see:

1. **ELO card** — rating, tier, India rank
2. **Summary stats** — total solved, domain breakdown
3. **Activity timeline** — only `is_recruiter_visible = true` rows, with timestamps
4. No code is shown by default; student can optionally share code per submission
5. Timestamp precision: shown as "Jun 7, 14:32 IST" for credibility

This makes the recruiter experience feel like a verifiable, timestamped portfolio — not a self-reported resume.

---

*Prototype file: `arena-redesign-prototype.html` (open in browser, fully interactive)*
