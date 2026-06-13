# Capabilio Employment Verification & Career-Path Transition System
## Complete Production Specification

**Version:** 1.0  
**Status:** Ready for Engineering  
**Scope:** EPFO/UAN verification, automatic path transition, Professional ELO, Aura sync, UI switching

---

## 0. Design Philosophy

Capabilio's central claim is that proof beats claims. The path transition system
enforces this rigorously: **a user does not become a Professional because they say
so — they become one because their employment is verified.**

The three non-negotiable rules of this system:

1. **Self-claimed employment is always labeled self-claimed.** It cannot wear a verified badge.
2. **Path transition is irreversible once confirmed.** A Professional cannot revert to Student to hide career history.
3. **Every ELO delta has a source.** No score changes without a traceable, auditable event.

---

## 1. System Architecture Overview

```
                    ┌─────────────────────────────────────────────┐
                    │         VERIFICATION INGESTION LAYER        │
                    │                                             │
                    │  EPFO/UAN API  │  Employer OTP  │  Manual  │
                    └──────────────────────┬──────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────┐
                    │         CAREER EVENT PROCESSOR              │
                    │                                             │
                    │  Classify event → Verify source →           │
                    │  Compute ELO delta → Write career_events    │
                    └──────────────────────┬──────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────┐
                    │         PATH TRANSITION ENGINE              │
                    │                                             │
                    │  Evaluate transition criteria →             │
                    │  Write path_transitions →                   │
                    │  Update profiles.path                       │
                    └──────────────────────┬──────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────┐
                    │         SYNCHRONIZATION LAYER               │
                    │                                             │
                    │  Aura Dashboard  │  Portfolio  │  Timeline  │
                    │  Skill Graph     │  Recruiter  │  ELO Score │
                    └─────────────────────────────────────────────┘
```

---

## 2. Verification Sources

### 2.1 EPFO / UAN (India — Primary Source)

EPFO (Employees' Provident Fund Organisation) service history is the gold standard
for employment verification in India. Every formal employee has a UAN (Universal
Account Number) linked to their PF contributions.

**What EPFO provides:**
- Employer name + establishment code
- Member join date (date PF contributions started)
- Exit date (date contributions stopped)
- Wage bracket (not exact salary — protects privacy)
- Member ID per employer

**EPFO API integration flow:**
```
Step 1 — User provides UAN + registered mobile
Step 2 — Capabilio sends OTP request to EPFO portal (passthrough)
Step 3 — User enters OTP (6-digit, 10-minute expiry)
Step 4 — Capabilio receives service history JSON
Step 5 — Parse: extract each employer as a career_event
Step 6 — Match employer names to known company database
Step 7 — Write verified career events with source = 'epfo'
Step 8 — Trigger path transition evaluation
```

**Data structure from EPFO:**
```json
{
  "uan": "100XXXXXXXXX",
  "member_name": "...",
  "service_history": [
    {
      "establishment_id": "MHBAN...",
      "employer_name": "Acme Technologies Pvt Ltd",
      "doj": "2023-06-01",
      "doe": "2024-11-30",
      "member_id": "MHBAN...",
      "exit_reason": "RESIGNATION"
    }
  ]
}
```

**Reliability level:** HIGH — government-issued, fraud-resistant.

---

### 2.2 Employer Email OTP (Secondary Source)

When a user adds a company email (e.g. name@acme.com), Capabilio sends a
verification OTP to that email.

- Verifies: current employment at that company domain
- Does not verify: start date, role, or title (those remain self-claimed)
- Verification level: V2 (Externally Linked)
- Upgrades the employment item from V0 to V2, not full V3

---

### 2.3 Offer Letter / Appointment Letter Upload (Tertiary)

- User uploads scanned PDF or image
- Capabilio extracts: company name, role, date (OCR via Supabase Edge Function)
- Human spot-check queue for flagged low-confidence extractions
- Verification level: V1 (Artifact-Backed)

---

### 2.4 LinkedIn Import (Supplemental)

- LinkedIn work history synced via OAuth
- Treated as V2 (cross-reference), not V3 (platform-verified)
- Never auto-triggers path transition on its own
- Combined with EPFO → can trigger transition

---

### 2.5 Manual Review (Fallback)

- Capabilio ops team reviews disputed or borderline cases
- Human-approved events get source = 'manual_review', verification_level = V3
- Reserved for edge cases: informal sector, international employment, govt contracts

---

### 2.6 Verification Levels in This Context

| Level | Source                         | Triggers Path Transition? |
|-------|--------------------------------|--------------------------|
| V0    | Self-claimed                   | ❌ Never                  |
| V1    | Offer letter uploaded           | ❌ No                     |
| V2    | Company email OTP              | ⚠ Conditionally (if + LinkedIn) |
| V3    | EPFO/UAN or Manual Review      | ✅ Yes                    |
| V4    | EPFO + Reference confirmed     | ✅ Yes (stronger signal)  |

---

## 3. Career Event Taxonomy

Every meaningful career event is stored as a `career_event` record.

### 3.1 Event Types

| Event Type                  | Code                    | ELO Delta | Verification Required |
|-----------------------------|-------------------------|-----------|----------------------|
| First verified job entry    | `first_job`             | +80       | V3                   |
| Company join                | `company_join`          | +40       | V3                   |
| Company exit (clean)        | `company_exit_clean`    | +10       | V3                   |
| Company exit (involuntary)  | `company_exit_involuntary` | 0      | V3                   |
| Tenure milestone — 6 months | `tenure_6m`             | +15       | V3 (auto-triggered)  |
| Tenure milestone — 1 year   | `tenure_1y`             | +25       | V3 (auto-triggered)  |
| Tenure milestone — 2 years  | `tenure_2y`             | +35       | V3 (auto-triggered)  |
| Tenure milestone — 3+ years | `tenure_3y_plus`        | +20/yr    | V3 (auto-triggered)  |
| Promotion (verified)        | `promotion_verified`    | +50       | V3                   |
| Promotion (self-claimed)    | `promotion_self`        | +10       | V0 (labeled clearly) |
| Company switch (lateral)    | `company_switch_lateral`| +20       | V3                   |
| Company switch (upward)     | `company_switch_upward` | +40       | V3                   |
| Verified project outcome    | `project_outcome`       | +20       | V1+                  |
| Trusted skill addition      | `skill_verified`        | +10       | V2+                  |
| Employment gap (< 3 months) | `gap_short`             | 0         | N/A                  |
| Employment gap (> 6 months) | `gap_long`              | -5        | N/A (auto-detected)  |
| Arena performance (relevant)| `arena_professional`    | +5 to +25 | V3 (platform)        |
| Leadership role entry       | `leadership_entry`      | +30       | V3                   |
| First international role    | `international_role`    | +25       | V3                   |

### 3.2 ELO Delta Computation Rules

Base formula per event:
```
elo_delta = base_delta × verification_multiplier × recency_multiplier

verification_multiplier:
  V3 = 1.0
  V2 = 0.6
  V1 = 0.3
  V0 = 0.0 (no ELO from unverified events)

recency_multiplier:
  event within 30 days of now = 1.0
  31–180 days              = 0.95
  181–365 days             = 0.90
  > 365 days               = 0.85 (historical events still count, slightly discounted)
```

**Promotion detection heuristic:**
- Same company, new `role_title` from EPFO record change
- OR: user submits new offer letter with higher grade band
- OR: LinkedIn shows title change at same company

**Company switch upward vs lateral:**
- Upward: new company's tier > previous (based on Capabilio's company tier database)
- Lateral: same tier or unknown tier

### 3.3 ELO Cap and Floor

- **Professional ELO** starts at 600 on first verified job (separate from Arena ELO)
- Floor: 400 (cannot go below)
- No hard ceiling — exceptional careers can reach 2000+
- **Blended ELO** shown on profile = weighted avg of Arena ELO (40%) + Professional ELO (60%)
  - For Student path: Arena ELO only
  - For Professional path: blended

---

## 4. Path Transition Engine

### 4.1 Transition Criteria

A user transitions from Student → Professional when **any** of these conditions are met:

```
CONDITION A (strongest): 
  At least 1 career_event with type = 'first_job' AND verification_level >= V3

CONDITION B (EPFO batch import):
  At least 1 EPFO service history record parsed successfully
  AND total verified employment duration >= 90 days

CONDITION C (composite signal):
  company_email_verified = true
  AND LinkedIn work history linked with 1+ role
  AND user has manually confirmed "I am currently employed"
  [This gives V2-grade transition — marked as 'transitioning', not 'confirmed']
```

### 4.2 Transition States

```
student            →  transitioning  →  professional
   │                       │                 │
   │      Pending           │   Confirmed     │
   │      (V2 signals)      │   (V3 verified) │
```

| State           | Profile Display             | UI Mode        |
|-----------------|-----------------------------|----------------|
| `student`       | Student path indicators     | Student UI     |
| `transitioning` | "Verification in progress"  | Hybrid UI      |
| `professional`  | Professional path verified  | Professional UI|

The `transitioning` state exists to handle the gap between "user says they work
somewhere" and "EPFO confirms they work somewhere." It never shows as fully
professional to recruiters — it shows a pending verification banner.

### 4.3 Transition Event Sequence

```
1. Verification ingestion completes (EPFO OTP success)
2. career_event records written (source = 'epfo')
3. path_transitions record created (status = 'pending_confirmation')
4. Background job: evaluate transition criteria
5. If criteria met → update profiles.path = 'professional'
6. Write path_transitions.status = 'confirmed'
7. Trigger sync cascade:
   a. Aura Dashboard rebuild
   b. Portfolio archetype re-detection
   c. Timeline re-classification (internships confirmed, academic kept separate)
   d. Professional ELO initial calculation
   e. Skill graph re-weighting
   f. Recruiter trust score update
   g. Notification: "Your Professional Path has been activated"
8. UI switches on next page load (path stored in JWT claims or profile cache)
```

### 4.4 Irreversibility Rule

Once `professional` path is set:
- User **cannot** self-revert to `student`
- User **can** add new academic items (they go to Academic Projects track, never Professional)
- If EPFO verification is disputed/withdrawn: path stays `professional`, event is
  marked `disputed` — honesty requires showing the history, not erasing it
- Only Capabilio support can revert a path transition (via admin interface) with
  documented reason

---

## 5. Professional ELO Scoring Model

### 5.1 Initialization on First Transition

```
Professional ELO start = 600

Backfilled events on first EPFO import:
  For each historical employment record:
    1. Classify event type
    2. Compute elo_delta with historical recency_multiplier
    3. Accumulate total
    4. Cap any single import at +300 (prevents historical overstacking)

Starting ELO after backfill = 600 + min(accumulated_delta, 300)
```

### 5.2 Ongoing ELO Update Triggers

Events are evaluated and ELO updated by a Supabase Edge Function
(`update-professional-elo`) triggered on:

- New `career_event` inserted with `verification_level >= 2`
- Scheduled: daily midnight job checks for tenure milestones
- Arena challenge completion (if user is Professional + challenge domain matches role)

### 5.3 Tenure Milestone Auto-Trigger Logic

```
Daily job at midnight IST:

For each user with path = 'professional':
  For each active employment (no end_date or end_date in future):
    days_at_company = today - start_date
    
    Check milestones:
      [180 days, 365 days, 730 days, 1095 days, 1460 days, ...]
    
    For each milestone not yet triggered:
      if days_at_company >= milestone_days:
        Insert career_event(type = 'tenure_Xm', source = 'system_auto')
        Update professional_elo += milestone_delta
```

### 5.4 Blended ELO Formula

```
blended_elo = (arena_elo × 0.4) + (professional_elo × 0.6)

Shown on profile as a single score.
Tier labels apply to blended ELO (same tiers as Arena ELO).

Display:
  "ELO 1,284  •  Advanced"
  [i] "Blended from Arena (40%) + Career (60%)"
```

### 5.5 ELO Audit Trail

Every ELO change is stored in `professional_elo_history`:
```
{
  event_id:         career_event.id
  previous_elo:     1200
  delta:            +25
  new_elo:          1225
  event_type:       "tenure_1y"
  verification_src: "epfo"
  reason:           "1 year tenure at Acme Technologies"
  affected_sections: ["aura_score", "portfolio_trust", "recruiter_card"]
  created_at:       timestamp
}
```

---

## 6. UI Transition Flow

### 6.1 Student UI → Professional UI Changes

| Element                  | Student UI                        | Professional UI                          |
|--------------------------|-----------------------------------|------------------------------------------|
| Hero section             | ELO + Arena stats                 | ELO + Career summary + Company badge     |
| Navigation               | Arena, Launchpad, Aura            | + Career Timeline, Company History       |
| Aura Dashboard headline  | "Your learning journey"           | "Your verified career"                   |
| Profile path badge       | 🎓 Student                        | 💼 Professional                          |
| Timeline default tab     | Academic Projects                 | Professional Experience                  |
| Portfolio archetype      | Student archetypes                | Professional archetypes (re-detected)    |
| Skills emphasis          | Arena + personal projects         | Verified work skills + career signals    |
| Trust banner             | "Build your proof with Arena"     | "✓ EPFO Verified · [Company] · [Years]"  |
| Recruiter CTA            | "View Arena performance"          | "View verified career history"           |
| Empty states             | Student onboarding prompts        | Professional workflow prompts            |
| Featured proof           | Arena challenges + projects       | Work impact + promotions + Arena         |

### 6.2 Transition Notification Flow

**In-app notification (immediate):**
```
┌────────────────────────────────────────────────────────────┐
│  🎯 Your Professional Path is now active                   │
│                                                            │
│  We verified your employment at Acme Technologies          │
│  via EPFO. Your profile has been updated.                  │
│                                                            │
│  ✓ 2 years of verified experience added                   │
│  ✓ Professional ELO: 820 (Advanced)                       │
│  ✓ Recruiter trust score: High                            │
│                                                            │
│  [View my professional profile]  [Dismiss]                 │
└────────────────────────────────────────────────────────────┘
```

**Email notification:**
- Subject: "Your Capabilio career is now EPFO verified"
- Body: summary of what changed, what to do next
- CTA: "Add your current role details"

### 6.3 Transition Page (One-time flow)

After path transition confirmed, show a single-page transition screen:

```
Step 1: "We verified your employment" — summary of what EPFO found
Step 2: "Review your career events" — user confirms/adjusts imported data
Step 3: "Add missing details" — role title, department, impact summary
Step 4: "Set visibility" — what to show publicly vs recruiter-only
Step 5: "Your professional profile is live" — confetti, share CTA
```

User can skip from Step 1 → Step 5. Steps 2–4 improve data quality but are optional.

### 6.4 Hybrid UI State (Transitioning)

While verification is pending (V2 signals, awaiting EPFO):

```
┌──────────────────────────────────────────────────────────┐
│  ⏳ Employment verification in progress                   │
│  We're confirming your employment at Acme Technologies.  │
│  This usually takes 24–48 hours.                         │
│  [Add UAN to speed this up]                              │
└──────────────────────────────────────────────────────────┘
```

- Student UI remains active
- A "Transitioning" badge replaces the Student badge
- Recruiter view shows "Verification pending" on work experience items

### 6.5 Academic Content After Transition

Academic Projects and Education entries do NOT disappear. They move to a
clearly-labeled "Academic History" section:

- Still visible on profile
- Still contribute to overall Aura score
- No longer shown as primary section (collapsed by default for senior professionals)
- Correctly labeled: "Built during studies at [Institution]"
- Recruiter can expand to see them

---

## 7. Aura Dashboard Synchronization

### 7.1 Professional Aura Dashboard Sections

After path transition, the Aura Dashboard shows:

```
┌─────────────────────────────────────────────────────────────┐
│  CAREER OVERVIEW CARD                                        │
│  ─────────────────────                                       │
│  Path: 💼 Professional    Trust: ✓ EPFO Verified            │
│  Blended ELO: 1,284 · Advanced                              │
│  Total verified experience: 4 years 2 months                │
│  Current company: Acme Technologies (1y 4m)                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  VERIFIED EMPLOYMENT TIMELINE                               │
│  ─────────────────────────────                              │
│  [Company A]  Jun 2022 – Nov 2023  ✓ EPFO Verified         │
│  [Company B]  Dec 2023 – Present   ✓ EPFO Verified         │
│  ← Chronological bar chart showing tenure at each company  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ELO TREND CHART                                            │
│  ────────────────                                           │
│  [Area chart of blended ELO over time]                     │
│  Key events annotated: "First job", "1yr milestone", etc.  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CAREER EVENTS FEED                                         │
│  ──────────────────                                         │
│  ✓ Tenure milestone: 1 year at Acme        +25 ELO  Today  │
│  ✓ Verified employment: Company B join     +40 ELO  6m ago │
│  ✓ First job verified                      +80 ELO  1y ago │
│  ⏳ Promotion (self-claimed, unverified)   +10 ELO  8m ago │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TRUST BREAKDOWN                                            │
│  ──────────────                                             │
│  EPFO Verified Items:      4     Verified bar ████████░░   │
│  Self-Claimed Items:       2     ⚠ These need proof         │
│  Pending Verification:     1     ⏳ Action required         │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Synchronization Data Flow

```
career_event inserted
     │
     ├──→ professional_elo_history updated
     │          └──→ profiles.professional_elo recalculated
     │                    └──→ blended_elo computed + stored
     │
     ├──→ career_timeline updated (if new employment record)
     │          └──→ portfolio.classifyForPortfolio() re-run
     │
     ├──→ user_skills.proof_count updated (if proof_derived skill)
     │          └──→ skill level_score recalculated
     │
     └──→ aura_score recomputed
               └──→ aura_history entry added
```

### 7.3 Recruiter Trust Score

Derived metric shown on recruiter view:

```
recruiter_trust_score = (
  (verified_events / total_events) * 40 +      ← verification ratio
  (epfo_verified ? 30 : 0) +                    ← EPFO gold standard
  (min(verified_tenure_years, 5) * 4) +         ← tenure depth
  (blended_elo / 2000 * 30)                     ← ELO factor
)

Displayed as:  Low | Medium | High | Very High | Exceptional
Bands:
  0–39:   Low
  40–59:  Medium
  60–74:  High
  75–89:  Very High
  90+:    Exceptional
```

---

## 8. EPFO Integration Design

### 8.1 API Strategy

EPFO does not offer a public developer API. Integration options ranked by reliability:

**Option A — UMANG API (Recommended for production):**
- UMANG (Unified Mobile Application for New Governance) provides APIs for EPFO
- OAuth2-based, government-approved
- Endpoint: `https://apigw.umangapp.in/epfoServices/ws1/memberPassBook`
- Requires UMANG developer registration + Ministry of Electronics approval
- Latency: 2–8 seconds

**Option B — DigiLocker integration:**
- EPFO service history available as DigiLocker document
- User grants Capabilio read access via DigiLocker OAuth
- Capabilio parses the issued document
- Reliability: High (government-issued documents)

**Option C — UAN Portal scrape (Dev/Beta only):**
- User logs into passbook.epfindia.gov.in
- Capabilio parses the response HTML
- NOT recommended for production — fragile, may violate TOS

**Recommended implementation path:**
- Phase 1 (MVP): Offer letter upload + company email OTP (V1/V2)
- Phase 2: DigiLocker integration (V3, government-grade)
- Phase 3: UMANG API (V3, real-time)

### 8.2 UAN Verification Flow (Phase 3)

```
POST /api/verify/uan
Body: { uan: "100XXXXXXXXX", mobile: "+91XXXXXXXXXX" }

1. Capabilio calls UMANG API: request OTP to mobile
2. UMANG sends OTP to registered mobile
3. User enters OTP in Capabilio UI
POST /api/verify/uan/confirm
Body: { uan: "...", otp: "XXXXXX" }

4. Capabilio calls UMANG API: verify OTP + fetch service history
5. UMANG returns service history JSON
6. Capabilio processes:
   a. Parse each employment record
   b. Normalize company name (fuzzy match against company database)
   c. Compute event deltas
   d. Write to career_events
   e. Trigger path transition evaluation
7. Return success response to client
```

### 8.3 Error Handling

| Error                        | User Message                              | Action                        |
|------------------------------|-------------------------------------------|-------------------------------|
| UAN not found                | "UAN not found. Check the number."        | Allow retry                   |
| OTP expired                  | "OTP expired. Request a new one."         | Reset flow                    |
| Mobile mismatch              | "Mobile doesn't match UAN records."       | Suggest alternative (DigiLocker) |
| UMANG API timeout            | "Taking longer than expected. Retry?"     | Queue background retry         |
| Service history empty        | "No employment records found in EPFO."    | Suggest offer letter upload   |
| Partial data                 | Show pending status, continue with partial| Mark events as `pending`      |

---

## 9. Data Schema

### 9.1 career_events Table

```sql
CREATE TABLE career_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type        TEXT NOT NULL,     -- see CAREER_EVENT_TYPES enum
  company_name      TEXT,
  company_id        UUID,              -- FK to companies table (if matched)
  role_title        TEXT,
  department        TEXT,
  seniority_level   TEXT,
  start_date        DATE,
  end_date          DATE,              -- null = ongoing
  is_current        BOOLEAN DEFAULT FALSE,
  
  -- Verification
  verification_status TEXT NOT NULL DEFAULT 'pending'
                      CHECK (verification_status IN (
                        'pending','verified','self_claimed','disputed','rejected'
                      )),
  verification_level  SMALLINT DEFAULT 0 CHECK (verification_level BETWEEN 0 AND 4),
  source_type         TEXT NOT NULL CHECK (source_type IN (
                        'epfo','umang','digilocker','employer_email',
                        'offer_letter','linkedin','manual_review',
                        'system_auto','self_claimed'
                      )),
  verified_at         TIMESTAMPTZ,
  verifier_ref        TEXT,            -- EPFO establishment ID, OTP session ID, etc.
  
  -- ELO
  elo_delta           INTEGER DEFAULT 0,
  elo_applied         BOOLEAN DEFAULT FALSE,
  elo_applied_at      TIMESTAMPTZ,
  
  -- Content
  impact_summary      TEXT,
  visibility          TEXT NOT NULL DEFAULT 'recruiter'
                      CHECK (visibility IN ('public','recruiter','private')),
  tags                TEXT[] DEFAULT '{}',
  timeline_category   TEXT CHECK (timeline_category IN (
                        'professional_experience','internship',
                        'leadership','career_transition'
                      )),
  
  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  raw_source_data     JSONB            -- original parsed EPFO/UMANG payload (encrypted at rest)
);

CREATE INDEX career_events_user_id_idx       ON career_events(user_id);
CREATE INDEX career_events_type_idx          ON career_events(event_type);
CREATE INDEX career_events_verification_idx  ON career_events(verification_status);
CREATE INDEX career_events_company_idx       ON career_events(company_id);
CREATE INDEX career_events_dates_idx         ON career_events(start_date, end_date);
```

### 9.2 path_transitions Table

```sql
CREATE TABLE path_transitions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_path         TEXT NOT NULL,    -- 'student'
  to_path           TEXT NOT NULL,    -- 'professional' | 'transitioning'
  trigger_event_id  UUID REFERENCES career_events(id),
  trigger_source    TEXT,             -- 'epfo' | 'composite' | 'manual'
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','disputed','reverted')),
  confirmed_at      TIMESTAMPTZ,
  reverted_at       TIMESTAMPTZ,
  revert_reason     TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX path_transitions_user_id_idx ON path_transitions(user_id);
```

### 9.3 professional_elo_history Table

```sql
CREATE TABLE professional_elo_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES career_events(id),
  previous_elo      INTEGER NOT NULL,
  delta             INTEGER NOT NULL,
  new_elo           INTEGER NOT NULL,
  event_type        TEXT NOT NULL,
  verification_src  TEXT NOT NULL,
  reason            TEXT NOT NULL,
  affected_sections TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX prof_elo_history_user_id_idx ON professional_elo_history(user_id);
CREATE INDEX prof_elo_history_created_idx ON professional_elo_history(created_at DESC);
```

### 9.4 Extend profiles Table

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS professional_elo     INTEGER DEFAULT 600,
  ADD COLUMN IF NOT EXISTS blended_elo          INTEGER,  -- computed, stored for fast reads
  ADD COLUMN IF NOT EXISTS path_status          TEXT DEFAULT 'student'
                                                CHECK (path_status IN (
                                                  'student','transitioning','professional'
                                                )),
  ADD COLUMN IF NOT EXISTS uan_verified         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS uan_verified_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recruiter_trust_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_tenure_months INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_companies      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_company      TEXT,
  ADD COLUMN IF NOT EXISTS current_role         TEXT,
  ADD COLUMN IF NOT EXISTS career_started_at    DATE;
```

### 9.5 companies Table (Reference)

```sql
CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  normalized_name TEXT NOT NULL,    -- lowercase, no punctuation, for fuzzy match
  domain          TEXT,             -- email domain for OTP verification
  epfo_codes      TEXT[],           -- EPFO establishment codes
  tier            SMALLINT DEFAULT 2 CHECK (tier BETWEEN 1 AND 5),
                                    -- 1=top-tier, 5=unknown/startup
  country         TEXT DEFAULT 'IN',
  sector          TEXT,
  logo_url        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX companies_normalized_name_idx ON companies(normalized_name);
CREATE INDEX companies_domain_idx          ON companies(domain);
```

---

## 10. Supabase Edge Functions

### 10.1 `process-career-event` (triggered on career_events INSERT)

```typescript
// Runs on INSERT to career_events
// 1. Compute elo_delta if not set
// 2. Apply ELO to professional_elo_history + update profiles.professional_elo
// 3. Recompute blended_elo
// 4. Update profiles.recruiter_trust_score
// 5. Check and fire tenure milestone events
// 6. Evaluate path transition criteria
// 7. Update career_timeline if applicable
```

### 10.2 `tenure-milestone-checker` (scheduled: daily at 00:30 IST)

```typescript
// Runs daily
// For each active professional employment:
//   Check if any tenure milestone has been reached but not yet recorded
//   If yes: insert career_event(type = 'tenure_Xm', source = 'system_auto')
//   Edge function trigger handles the rest
```

### 10.3 `uan-verify` (HTTP endpoint: POST /functions/v1/uan-verify)

```typescript
// Accepts: { uan, mobile, otp }
// Calls UMANG API, parses service history
// Writes career_events
// Returns: { success, events_created, transition_triggered }
```

---

## 11. Component Structure

```
frontend/src/
├── pages/
│   └── CareerVerification.jsx      ← Verification wizard (/verify/employment)
├── components/career/
│   ├── VerificationWizard.jsx      ← Multi-step EPFO/UAN wizard
│   ├── UANInputForm.jsx            ← UAN + OTP entry
│   ├── CareerEventFeed.jsx         ← Aura Dashboard event list
│   ├── EmploymentTimeline.jsx      ← Visual company history bar
│   ├── PathTransitionBanner.jsx    ← "Transitioning" in-progress banner
│   ├── PathTransitionModal.jsx     ← One-time transition confirmation screen
│   ├── TrustScoreCard.jsx          ← Recruiter trust breakdown
│   ├── BlendedELOChart.jsx         ← ELO over time with event annotations
│   └── VerificationBadge.jsx      ← ✓ EPFO Verified chip
├── hooks/
│   ├── usePathTransition.js        ← Path state + transition events
│   ├── useCareerEvents.js          ← Career events CRUD + realtime sub
│   └── useProfessionalELO.js       ← ELO history + blended computation
└── config/
    └── careerEvents.js             ← Event types, ELO deltas, rules (see companion file)
```

---

## 12. Privacy and Data Security

- Raw EPFO payload stored encrypted at rest (Supabase column encryption)
- UAN number hashed before storage (SHA-256 + salt) — never stored in plaintext
- EPFO data used only for: employment verification, path transition, ELO
- User can delete verification data (keeps the verified badge but removes raw payload)
- Recruiter view: shows "EPFO Verified" badge, never exposes UAN or establishment codes
- Data retention: raw EPFO payload purged after 90 days; derived career_events kept permanently

---

## 13. Implementation Phases

### Phase 1 — Foundation (Week 1–2)
- `career_events` + `path_transitions` + `professional_elo_history` tables
- Manual entry: user adds employment, source = 'self_claimed'
- Basic path_status field in profiles
- PathTransitionBanner (pending state)

### Phase 2 — Email OTP Verification (Week 3)
- Company email OTP flow
- Upgrade self-claimed items to V2
- Composite condition for transitioning state
- Hybrid UI

### Phase 3 — Offer Letter / DigiLocker (Week 4–5)
- PDF upload + OCR extraction edge function
- DigiLocker OAuth integration
- V3 transitions from DigiLocker
- Full path transition flow + one-time transition modal

### Phase 4 — EPFO/UAN / UMANG (Week 6–8)
- UMANG API integration (pending Ministry approval)
- UAN OTP flow
- Service history parser + company normalizer
- Tenure milestone checker (scheduled edge function)
- Backfill ELO from historical EPFO records

### Phase 5 — Aura Dashboard Professional View (Week 9)
- Employment timeline visualization
- Blended ELO chart with event annotations
- Trust score card
- Career events feed with pending/verified distinction
- Recruiter trust score display

---

*Capabilio Employment Verification Spec v1.0 — Verification is the product. Trust is the differentiator.*
