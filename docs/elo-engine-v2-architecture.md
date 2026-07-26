# Capabilio Skill Rating (ELO) Engine v2 — Production Architecture

**Status:** Design — not yet implemented. This document supersedes the current
Professional ELO track for planning purposes; nothing described here has been
built. Existing tables/routes named below are real and were traced from the
live repository before writing this doc (see §N for exact file/table
inventory) — this is not a request to rip anything out today.

**Author context:** grounded in the actual live implementation as of
2026-07-26: `backend/server/lib/professionalElo/eloEngine.js`
(`professional_elo_state` / `professional_elo_events`), the legacy
profile-completeness fields on `profiles` (`role_elo`, `market_elo`,
`proof_elo`, `mobility_elo`, `elo_rating`, `aura_score` — computed by
`computeEloSignals()` in `professionalProfile.js`), the College Path ledger
(`institution_students.elo_current` / `elo_events`, single-writer via
`backend/server/lib/eloLedger.js`), and the EPFO verification flow already
live at `POST /api/pro/epfo/submit` / `GET /api/pro/epfo/status`.

---

## A. Core Scoring Philosophy

Capabilio's Skill Rating is not a wallet that fills up. It is a **live
estimate of current, verifiable capability**, re-derived continuously from
three independent layers rather than accumulated as one running total:

1. **Capability Layer** — what the user can demonstrate right now, evidenced
   by assessments, Arena challenges, AI interviews, and verified projects.
2. **Trust/Verification Layer** — how much of the user's evidence is
   independently verified (EPFO/UAN, certificate OCR + issuer check, GitHub
   activity, employer attestation) versus merely self-declared.
3. **Confidence/Freshness Layer** — how recently each skill was validated;
   evidence decays in influence, never in existence.

The number shown to a user (`overall_elo`) is **derived**, not stored as the
source of truth. The source of truth is an append-only event ledger per
skill, per layer. This mirrors a pattern already proven in this codebase
(`eloLedger.js`'s single-writer `recordEloEvent()` for the College Path) —
v2 generalizes that pattern platform-wide instead of leaving three
parallel, inconsistent ELO systems (see §N).

**Hard rule, enforced in code, not convention:** profile CRUD (editing a
headline, uploading a resume, pasting experience, adding an unverified
certificate) may write to `claimed_*` tables. It may **never** call any
function that mutates a `*_elo_state` row or inserts an ELO event. The two
write paths are physically separate modules with no shared function — this
is the same isolation strategy already used for the current Professional ELO
track (`eloEngine.js` is never imported by `professionalProfile.js`), just
extended to every other capability source instead of only weekly pulses.

---

## B. Rating Model

### B.1 Baselines and bounds

| Path | Base ELO | Min | Max |
|---|---|---|---|
| Student | 400 | 400 | 2400 |
| Professional | 800 | 400 | 2400 |

Professional users receive the 800 base **at row-creation time** (signup),
unconditionally — this is identity/baseline, not an earned score. Every
subsequent contributor (experience, certs, assessments, Arena, interviews,
projects, community) is a **bounded modifier layered on top**, each with
its own cap, so no single signal can dominate the overall number.

### B.2 Formula shape

```
overall_elo = clamp(
  base_elo
  + capability_component      (assessments, Arena, AI interviews, projects — path-specific, see C/D)
  + verified_experience_bonus (EPFO-gated, capped at 150)
  + verified_cert_bonus       (verification-gated, capped at 80)
  + community_trust_component (capped ±60, see fraud penalties)
  - freshness_decay           (see I)
  , 400, 2400
)
```

This is intentionally **not** `sum(all_events)`. Each component above is
itself a bounded, decayable sub-score computed from its own event stream —
see §F for the exact aggregation function. The formula is a *display-time
projection* over the layered state, recomputed on read (cheap — O(1) lookup
of pre-aggregated per-layer values, not a full event replay every request;
see §F.3 for the incremental-update strategy that keeps this cheap at
scale).

### B.3 Why not pure ELO (chess-style) math

Classic ELO (expected-score vs. opponent rating) doesn't fit a
single-player skill-demonstration platform — there's no opponent rating to
compare against for "completed a project" or "verified 3 years at Infosys."
What we keep from ELO is the *philosophy*: a rating that moves based on
performance against expectation (e.g., an assessment's difficulty-weighted
delta, already implemented in `computePulseEloDelta()`), decays with
inactivity, and is bounded. We do not keep the two-player expected-value
formula itself. Calling it "Skill Rating" externally (already the product
convention per `weeklyPulse.js`'s naming rule) and "ELO" only internally
avoids overclaiming a formal ELO system we don't actually run.

---

## C. Student Path Design

### C.1 Signal sources (unchanged philosophy, restructured storage)

Student capability is built from, in order of platform maturity:

- **Onboarding assessment** — one-time, diminishing-returns bonus (guidance
  table below), applied once, not repeatable for the same assessment id.
- **Arena challenges** (existing `arena-v2` pipeline, `elo_events` /
  `institution_students.elo_current` today) — becomes the largest
  contributor to long-term capability growth, unchanged.
- **Hackathons / company challenges** — same ledger, higher per-event cap.
- **AI interviews** — new event type, feeds both Overall and the relevant
  skill-specific rating (e.g., a "System Design" AI interview feeds
  `skill_elo['system_design']` and `skill_elo['communication']`).
- **Verified projects** — GitHub-linked or instructor-reviewed; unverified
  self-reported projects appear in the profile as `claimed`, contribute 0.
- **Community trust** — mentoring, teaching, helping-flagged answers; capped
  and independently subject to abuse penalties (spam/fake-report deductions
  already anticipated in the guidance values, see §M).

### C.2 What does NOT change

Arena stays exactly what it is today as an event source — this design does
not touch the grading pipeline, mission compiler, or `arena-v2` package. It
only changes **where the resulting ELO delta lands**: instead of writing
straight to `institution_students.elo_current` (College Path only) or
`profiles.elo_rating` (general student path — the two are inconsistent
today, see §N.3), every Arena grading result calls a single new function,
`recordSkillEvent()` (§H), which is the v2 generalization of the existing
`recordEloEvent()`.

### C.3 Guidance table (Student — event → capability delta)

| Event | Delta |
|---|---|
| Onboarding assessment 90%+ | +50 |
| Onboarding assessment 80% | +40 |
| Onboarding assessment 70% | +30 |
| Onboarding assessment 60% | +20 |
| Onboarding assessment 50% | +10 |
| Arena Easy | +8 |
| Arena Medium | +15 |
| Arena Hard | +25 |
| Arena Expert | +40 |
| Arena Company Challenge | +60 |
| Arena Hackathon Winner | +100 |
| AI Interview: Poor | 0 |
| AI Interview: Average | +10 |
| AI Interview: Good | +20 |
| AI Interview: Excellent | +40 |
| AI Interview: Outstanding | +60 |
| Project: Completed | +10 |
| Project: Verified | +20 |
| Project: Industry Reviewed | +35 |
| Project: Open Source Popular | +50 |
| Project: Production | +70 |
| Community: Mentor | +15 |
| Community: Teaching | +10 |
| Community: Helping | +5 |
| Community: Winner | +20 |
| Community: Spam | -40 |
| Community: Fake Reports | -20 |

These are **per-event deltas into the relevant capability sub-component**,
not raw additions to `overall_elo`. Each sub-component (Arena, AI Interview,
Projects, Community) has its own running aggregate with diminishing
returns applied at the aggregation step (§F.2), so, e.g., a user's 50th
"Easy" Arena challenge contributes much less marginal capability than
their 5th — repetition of low-difficulty events plateaus rather than
compounding forever.

---

## D. Professional Path Design

### D.1 Non-negotiables (restated as implementation contracts)

1. `POST /api/professionals/register` (or wherever the professional user row
   is created) inserts `professional_elo_state` with `elo = 800` and
   `experience_bonus_elo = 0`, `cert_bonus_elo = 0` — always, no conditional
   path that skips this.
2. **No code path outside `verifiedExperienceBonus.js` (new module) may set
   `experience_bonus_elo` to a nonzero value.** Resume parsing
   (`backend/server/routes/resume.js`), manual experience entry
   (`professionalProfile.js`'s `POST /pro/profile`), and any future
   LinkedIn-import feature write only to `claimed_experience` (new table,
   §G). They are structurally incapable of touching ELO because they never
   import or call the ELO module — same isolation pattern §A describes.
3. Certification bonus follows the identical isolation rule via
   `verifiedCertBonus.js`.
4. `computeEloSignals()` in `professionalProfile.js` (the legacy
   profile-completeness formula) is **frozen and marked deprecated** in v2 —
   it must not be extended, and its output (`role_elo`/`market_elo`/etc.)
   must not be relabeled as "Skill Rating" anywhere in the frontend. It may
   continue to exist as the "Profile Signals" secondary diagnostics (already
   demoted behind `SecondaryDiagnosticsPanel` per the 2026-07-26 UI redesign)
   until it is fully retired per the migration plan (§N).

### D.2 Capability component (Professional)

Same event types as Student where applicable (AI interviews, verified
projects), plus:

- **Onboarding/entry assessment** — same guidance table as C.3, applied once.
- **Weekly Skill Pulse** — the existing `computePulseEloDelta()` logic is
  kept nearly as-is (difficulty-weighted, capped ±40/pulse) but now writes
  into **skill-specific** components (per affected skill from the pulse's
  question bank tags) instead of only one overall number.
- **Role/domain skill validations** — any structured assessment tagged to a
  specific skill domain (e.g., a "Cloud Architecture" validation) feeds
  `skill_elo['cloud']` directly.

### D.3 Verified experience bonus (bounded modifier, EPFO-gated)

```
experience_bonus_elo = f(verified_years_of_experience), capped at 150
```

| Verified years | Bonus |
|---|---|
| 0 | 0 |
| 1 | +20 |
| 2 | +35 |
| 3 | +50 |
| 5 | +75 |
| 7 | +90 |
| 10 | +110 |
| 15 | +130 |
| 20+ | +150 |

`verified_years_of_experience` is computed **only** from
`verified_experience` rows (§G) whose `verification_status = 'verified'`
via the EPFO/UAN provider (or another explicitly whitelisted verified-
employment provider registered in `lib/verification/providers/registry.js`
— the registry pattern already exists for `declared.js`/`github.js`/
`certificateOcr.js`, so adding an EPFO provider here is additive, not a new
concept). Interpolation between table points uses linear interpolation
capped at the nearest lower/upper anchor — no smooth curve-fitting that
could produce unintended values outside the guidance table's intent.

This bonus is **recomputed**, not incrementally added, every time
verification status changes — it is a pure function of
`verified_years_of_experience`, so partial-verification edge cases (e.g., 2
of 3 claimed jobs verified) simply use the verified subset's total duration.

### D.4 Verified certification bonus (bounded modifier, verification-gated)

```
cert_bonus_elo = sum(cert_value for each verified certificate), capped at 80
```

| Certificate | Value |
|---|---|
| OSCP | 20 |
| AWS Professional | 18 |
| Google Professional Cloud | 18 |
| Azure Architect | 17 |
| CKA | 17 |
| RHCE | 16 |
| CEH | 10 |
| Coursera Professional | 5 |
| Udemy | 2 |
| Workshop | 1 |

Only rows in `verified_certifications` with `verification_status =
'verified'` count. `certificateOcr.js` (existing provider) is the primary
verification path; a manual-admin-review fallback exists for issuers OCR
can't confidently parse (goes through the same dispute/audit path as §M,
never a silent auto-approve).

### D.5 Profile CRUD isolation test (contract, not aspiration)

A CI-enforced regression test (same source-scan pattern already used
throughout this engagement, e.g. `professionalEloCanonical.test.js`) asserts:
`professionalProfile.js` and `resume.js` contain **zero** references to
`experience_bonus_elo`, `cert_bonus_elo`, `recordSkillEvent`, or any
`*_elo_state` table name. This is the automated version of non-negotiable
rule "Profile CRUD must never directly mutate ELO."

---

## E. Trust Gating and Pending Verification States

### E.1 State machine (shared vocabulary across experience and certifications)

```
claimed ──submit for verification──► pending_verification ──► verified
                                              │                    │
                                              ├──► rejected         └──(fraud detected later)──► suspended / fraud_flagged
                                              └──► suspended / fraud_flagged (auto, on fraud signal)
```

- **claimed** — user-entered, visible in profile, **0 ELO contribution**,
  labeled "Unverified — unlocks after verification."
- **pending_verification** — submitted to a provider (EPFO/UAN check,
  certificate OCR, manual review queue). Still 0 ELO. Labeled per source:
  "Pending EPFO verification" / "Pending certificate verification."
- **verified** — provider confirmed. Unlocks the bounded modifier (§D.3/D.4).
  Labeled "Verified and included in your Skill Rating."
- **rejected** — provider or reviewer explicitly rejected. 0 ELO,
  permanently distinct from `claimed` in the UI (shown as "Verification
  failed" with a reason and a re-submit path), and logged for pattern
  detection (repeated rejected submissions from one user raise fraud score,
  §M).
- **suspended / fraud_flagged** — set by the fraud engine (§M) or an admin.
  0 ELO, and if the item was previously `verified`, its bonus is
  immediately recomputed to exclude it (see D.3/D.4's recompute-not-add
  design — this is exactly why it must be a pure recompute).

This maps cleanly onto the status vocabulary already live in
`professionalProfile.js` (`not_started` / `in_progress` / `verified`) — v2
renames `in_progress` → `pending_verification` for clarity and adds
`rejected` / `suspended` as explicit terminal states that exist today only
implicitly (a failed EPFO check currently just... never becomes `verified`,
with no explicit rejected state surfaced to the user — a real gap this
design closes).

### E.2 Data separation (contract)

Four distinct tables, never conflated (§G has full DDL):

1. `claimed_experience` / `claimed_certifications` — anything the user
   entered, any status.
2. (state machine above lives as a `verification_status` column on those
   same rows — not a separate "pending" table, to avoid a sync-drift bug
   class between two tables representing the same entity)
3. `verified_experience_view` / `verified_certifications_view` — SQL views
   filtering to `verification_status = 'verified'`, the **only** thing the
   ELO bonus calculators are allowed to query.
4. Recruiter/company-facing API responses always partition by status
   explicitly (§L) — never a flat list that conflates verified and claimed.

---

## F. Skill ELO and Overall ELO Aggregation

### F.1 Skill domains (extensible enum, not hardcoded switch statements)

`Overall, Programming, AI, Cloud, Cybersecurity, Communication, Leadership,
Data, DevOps, Frontend, Backend, ...` — stored as rows in a
`skill_domains` lookup table (id, key, label, active), not an enum column,
so adding a new domain is an INSERT, not a migration. Every skill in
`user_skills` (existing table) maps to exactly one `skill_domains` row via
a `domain_id` FK (backfillable from the existing `domainForSkill()` mapping
already used in `Skills.jsx`).

### F.2 Per-domain rating

```
skill_elo[domain] = clamp(
  domain_base
  + weighted_sum(event.delta * freshness_weight(event.occurred_at) for event in events[domain])
  , 400, 2400
)
```

`freshness_weight()` is 1.0 for events inside the no-decay window (§I),
then linearly reduces toward a floor (never to 0 — a verified event that
happened once still counts for *something*, just much less over time
without reinforcement) as the event ages past the grace period. This is
computed at aggregation time from stored event timestamps — **events are
never deleted or mutated** to apply decay; decay is a read-time weighting
function over an immutable ledger, which is what makes the system
auditable (§M) and safely replayable if a bug is ever found in the
aggregation formula.

### F.3 Incremental aggregation (scale requirement)

Naively replaying every event on every read does not scale to millions of
users. Each domain maintains a **materialized rolling aggregate** row
(`user_skill_state`, §G) updated incrementally at write time:

```
new_aggregate = old_aggregate * freshness_decay_since_last_write + new_event.weighted_delta
```

This is the same incremental-decay trick already implemented for skill
confidence in `confidenceFeedback.js` (skill graph freshness) — v2 reuses
that proven pattern instead of inventing a new one, applied now to the ELO
domains instead of only the skill graph.

### F.4 Overall ELO

```
overall_elo = base_elo
  + Σ (skill_elo[domain] - domain_base) * skill_weight[domain]     // weighted contribution above baseline
  + experience_bonus_elo + cert_bonus_elo + community_trust_component
  - global_freshness_decay
```

`skill_weight[domain]` defaults to equal weighting across domains the user
has any activity in (normalized to sum to 1), with room for future
role/target-domain-aware reweighting (e.g., a "Backend Engineer" target
role weights Backend/Cloud/DevOps higher) — explicitly out of scope for v1
of this engine to avoid re-coupling ELO to `target_role`, which the
existing Professional ELO track deliberately avoids per prior product
decisions in this codebase.

---

## G. Database Schema

All new tables. Additive-only — nothing below alters or drops an existing
table. RLS enabled on every new table per this engagement's standing rule.

```sql
-- Lookup: extensible skill domains, not an enum
create table skill_domains (
  id            uuid primary key default gen_random_uuid(),
  key           text unique not null,        -- 'programming','ai','cloud',...
  label         text not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- One row per (user, domain) — the materialized rolling aggregate (§F.3)
create table user_skill_state (
  user_id           uuid not null references profiles(id) on delete cascade,
  domain_id         uuid not null references skill_domains(id),
  elo               numeric not null default 400,
  last_event_at     timestamptz,
  last_decay_applied_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, domain_id)
);

-- One row per user — overall state + bounded modifiers, replaces
-- professional_elo_state (see migration §N) and generalizes it to both paths
create table user_elo_state (
  user_id                 uuid primary key references profiles(id) on delete cascade,
  path                    text not null check (path in ('student','professional')),
  base_elo                numeric not null,
  overall_elo             numeric not null,
  experience_bonus_elo    numeric not null default 0,
  cert_bonus_elo          numeric not null default 0,
  community_trust_elo     numeric not null default 0,
  fraud_score             numeric not null default 0,
  last_activity_at        timestamptz,
  last_decay_applied_at   timestamptz,
  next_reminder_stage     text,              -- null | 'first' | 'second' | 'final'
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Append-only ledger — the single source of truth. Never updated, only inserted.
create table skill_rating_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  domain_id         uuid references skill_domains(id),   -- null = overall/cross-cutting (e.g. decay, community)
  event_type        text not null,   -- 'assessment','arena_challenge','ai_interview','project',
                                      -- 'community','experience_bonus_recompute','cert_bonus_recompute',
                                      -- 'decay','fraud_penalty','manual_admin_adjustment'
  source_id         text,            -- id of the pulse/challenge/interview/project/etc that caused this
  delta             numeric not null,
  elo_before        numeric not null,
  elo_after         numeric not null,
  reason            text not null,
  affected_skills   jsonb not null default '[]',
  reviewer_id       uuid references profiles(id),  -- required for manual_admin_adjustment
  created_at        timestamptz not null default now()
);

-- Claimed data — anything the user entered, regardless of status
create table claimed_experience (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references profiles(id) on delete cascade,
  company_name           text not null,
  role_title             text,
  start_date             date,
  end_date               date,
  source                 text not null,  -- 'manual','resume_upload','linkedin_import'
  verification_status    text not null default 'claimed'
                           check (verification_status in ('claimed','pending_verification','verified','rejected','suspended')),
  verification_provider  text,           -- 'epfo_uan', future providers
  verified_at            timestamptz,
  rejected_reason        text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table claimed_certifications (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references profiles(id) on delete cascade,
  cert_name              text not null,
  issuer                 text,
  cert_type              text,           -- maps to the bonus-value table in §D.4
  source                 text not null,  -- 'manual','resume_upload'
  verification_status    text not null default 'claimed'
                           check (verification_status in ('claimed','pending_verification','verified','rejected','suspended')),
  verification_provider  text,           -- 'certificate_ocr','manual_review'
  verified_at            timestamptz,
  rejected_reason        text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Fraud/dispute case tracking (§M)
create table skill_rating_fraud_cases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  case_type       text not null,  -- 'fake_certificate','copied_project','assessment_cheating','spam','fake_report'
  evidence        jsonb not null default '{}',
  penalty_applied numeric,
  status          text not null default 'open' check (status in ('open','upheld','dismissed','disputed')),
  reviewer_id     uuid references profiles(id),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

-- views — the ONLY read path for the bonus calculators (§D.3/D.4)
create view verified_experience_view as
  select * from claimed_experience where verification_status = 'verified';
create view verified_certifications_view as
  select * from claimed_certifications where verification_status = 'verified';
```

RLS: every table above gets `select` restricted to `user_id = auth.uid()`
for self-access, plus a service-role bypass for backend routes, plus an
explicit admin/recruiter-view policy on the two `verified_*` views only
(never on `claimed_*` directly — recruiters must not see raw claimed data
without the status partition, per §L).

---

## H. Event Processing Architecture

### H.1 Single writer function (generalizes `eloLedger.js` and `eloEngine.js`)

```js
// backend/server/lib/skillRating/recordSkillEvent.js
async function recordSkillEvent(db, {
  userId, domainKey, eventType, sourceId, delta, reason, affectedSkills, reviewerId,
}) {
  // 1. validate eventType against an allowlist (same discipline as
  //    eloLedger.js's VALID_SOURCES)
  // 2. require reviewerId when eventType === 'manual_admin_adjustment'
  // 3. look up (or lazily create) user_elo_state + user_skill_state rows
  // 4. apply the domain-specific cap (per-event and rolling caps, §F.2)
  // 5. insert into skill_rating_events (append-only)
  // 6. update user_skill_state[domain] and user_elo_state.overall_elo
  //    (both derived, both updated in the SAME transaction as the insert)
}
```

This is the **only** function anywhere in the codebase permitted to write
to `user_elo_state`, `user_skill_state`, or `skill_rating_events`. Every
call site (Arena grading, weekly pulse completion, AI interview scoring,
EPFO verification webhook, certificate OCR callback, admin dispute
resolution) calls this one function — never a direct `.update()` on the
state tables. This is enforced the same way `eloLedger.js`'s comment
already documents the intent for the College Path; v2 makes it the
platform-wide rule instead of one path's convention.

### H.2 Idempotency

Every caller passes a natural `sourceId` (pulse id, challenge submission
id, interview session id, verification request id). `recordSkillEvent()`
checks for an existing event with the same `(user_id, event_type,
source_id)` before inserting — replays (webhook retries, duplicate grading
calls) are no-ops, not double-counted. This closes a class of bug this
engagement has hit before (webhook idempotency work in the mentor/
subscription payment tranches) before it can recur here.

### H.3 Recompute vs. append

Two categories of write:
- **Additive events** (assessment result, Arena challenge, AI interview,
  project, community) — always append, never replace.
- **Bonus recomputes** (experience bonus, cert bonus) — triggered whenever
  a `claimed_experience`/`claimed_certifications` row's
  `verification_status` changes. These insert a `*_recompute` event whose
  `delta` is `new_bonus_total - old_bonus_total`, so the ledger stays
  append-only even though the bonus itself is a pure recomputed function,
  not an incremental add.

---

## I. Decay and Reminder Jobs

### I.1 Schedule (per user, tracked from `last_activity_at`)

| Day since last qualifying activity | Action |
|---|---|
| 1–9 | nothing |
| 10 | first reminder notification |
| 12 | second reminder notification |
| 14 | final reminder notification |
| 16+ | decay begins |
| 16–29 (first 2 weeks of decay) | -5 ELO/week |
| 30+ | -2 ELO/day until qualifying activity resumes |

Qualifying reset events: Arena challenge, assessment, AI interview,
verified project, learning module completion, coding challenge,
certification verification, weekly skill pulse, or any other event
inserted via `recordSkillEvent()` with `eventType` in an allowlisted
"freshness-resetting" set (explicitly not every event type — a fraud
penalty, for instance, must not reset the decay clock).

### I.2 Scheduler design

Two cron jobs (the current codebase deliberately has none for the existing
Professional ELO — decay is computed lazily at read time per
`eloEngine.js`'s own comment. v2 needs an actual scheduler because
reminders are push notifications, which cannot be lazy — a user who never
opens the app would never get reminded):

1. **`notification-scheduler`** (runs hourly): finds users crossing the
   10/12/14-day thresholds since `last_activity_at`, inserts a
   `notifications` row (existing table, already used by
   `nexus/notifications`) with type `skill_confidence_reminder` and a
   stage (`first`/`second`/`final`), and updates
   `user_elo_state.next_reminder_stage` so the same threshold never fires
   twice.
2. **`decay-scheduler`** (runs daily): for every user past day 16 with no
   qualifying event since, computes the bounded decay delta (mirrors
   `computeFreshnessDecay()`'s existing capped-catch-up logic, extended to
   the two-phase -5/week then -2/day schedule) and calls
   `recordSkillEvent()` with `eventType: 'decay'`. Also kept as a lazy
   read-time fallback (like today) for users who load their dashboard
   between cron runs, so the number is never stale by more than the cron
   interval.

Both jobs are plain Node scripts triggered by the existing infra's cron
mechanism (no new job-queue dependency introduced) — consistent with this
codebase not having a distributed task queue today; if Capabilio later
needs one for scale (§ scalability plan), these two functions are already
factored to be queue-worker-compatible (pure functions taking a user id,
no in-process global state).

### I.3 User-facing framing (product requirement, not just copy)

Every surface referencing decay uses "Skill Confidence" / "Freshness" /
"Recent verification status" language — never "penalty" or "point loss."
Concretely: `next_action` text on a decay event always reads like the
existing `eloEngine.js` decay reason string ("Take this week's Skill Pulse
to stop freshness decay and start recovering ELO") — that copy pattern is
kept, just generalized across all qualifying-activity types, not only
Skill Pulse.

---

## J. Backend APIs

All under a new `/api/skill-rating/*` namespace (mirrors the existing
`/api/pro/elo/professional` pattern but generalized to both paths):

| Method & path | Purpose |
|---|---|
| `GET /api/skill-rating/status` | Overall + per-domain ELO, latest event, next action, freshness state |
| `GET /api/skill-rating/history` | Paginated event ledger (own account) |
| `GET /api/skill-rating/domains` | Per-domain breakdown with freshness weight per domain |
| `POST /api/skill-rating/experience` | Add claimed experience (writes `claimed_experience`, status `claimed`) |
| `POST /api/skill-rating/experience/:id/verify` | Trigger EPFO/UAN verification (reuses existing `/pro/epfo/submit` flow under the hood) |
| `POST /api/skill-rating/certifications` | Add claimed certification |
| `POST /api/skill-rating/certifications/:id/verify` | Trigger certificate OCR/manual review |
| `GET /api/skill-rating/verification-status` | Combined pending/verified/rejected view for the profile UI |
| `POST /api/admin/skill-rating/dispute` | Admin: resolve a fraud case, `manual_admin_adjustment` event, two-person review enforced |
| `GET /api/recruiter/skill-rating/:userId` | Recruiter-facing view — verified-only by default, explicit flag to include pending (§L) |

Internal (never client-callable, service-role only):
`recordSkillEvent()`, `applyExperienceBonusRecompute()`,
`applyCertBonusRecompute()`, `runDecayScheduler()`,
`runNotificationScheduler()`.

---

## K. Frontend UX and Dashboard Surfaces

- **`ProfessionalScoreHero` / student equivalent** (already built in the
  2026-07-26 Professional UI redesign, `CareerOSUI.jsx`) becomes the
  canonical renderer for `overall_elo` — extended to show a compact
  per-domain strip (top 3 domains by recent activity) beneath the existing
  reason/next-action copy, rather than a new component.
- **Skill Rating history graph** — line chart over `skill_rating_events`,
  filterable by domain, annotated with verification-unlock moments (e.g., a
  visible step-change marker when EPFO verification completes) so users see
  *why* a jump happened, not just that it happened.
- **Experience/Certification cards** — each row shows one of the five
  states from §E.1 with the exact copy specified there ("Pending EPFO
  verification," "Unlocks after verification," "Verified and included in
  your Skill Rating," "Verification failed — resubmit").
- **Decay/freshness indicator** — reuses the existing `SkillStatusBadge`
  vocabulary (Fresh/Aging/At Risk/Decayed) already built for the skill
  graph, applied now to the overall rating too, instead of inventing a new
  badge system.

---

## L. Recruiter/Company-Facing Surfaces

Recruiter views (`portfolioPublic.js`, `company.js`, `employerMatch.js` —
all existing) must render three explicit buckets, never a merged list:

1. **Verified** — experience/certs with `verification_status = 'verified'`,
   shown with a trust badge and the verification provider/date.
2. **Pending verification** — shown separately, labeled as such, excluded
   from any score/ranking calculation a recruiter might see.
3. **Unverified/claimed** — shown only if the candidate's privacy settings
   allow it (existing `cert_visible`/consent columns), always labeled
   "self-reported, not verified," never counted toward Skill Rating.

The recruiter-facing Skill Rating number itself is always `overall_elo` as
computed above — recruiters never see a different, more-generous number
that includes unverified claims. This is the core trust promise of the
product and the reason the whole layered design exists.

---

## M. Fraud, Moderation, and Audit Model

### M.1 Penalties (bounded, auditable events — not unlimited stacking)

| Violation | Penalty |
|---|---|
| Fake certificate | -100 |
| Copied project | -150 |
| Assessment cheating | -200 |
| Repeat offender | account suspension (manual admin action, not automatic) |

Each penalty is a single `skill_rating_events` row with `event_type:
'fraud_penalty'`, tied to a `skill_rating_fraud_cases` row for the
underlying investigation. Penalties do not stack unboundedly within a
short window — a `fraud_score` accumulator on `user_elo_state` (capped, not
raw-summed into `overall_elo` directly) determines when "repeat offender"
suspension review is triggered, keeping the ELO number itself from being
driven arbitrarily negative by a burst of related violations from one
incident.

### M.2 Detection surface (v1 scope: human-reviewed, not fully automated)

v1 ships **detection signals + a moderation queue**, not an autonomous
fraud-decision engine — consistent with this engagement's standing rule
against fabricating AI-authoritative decisions in scoring paths. Signals
that open a `skill_rating_fraud_cases` row for review:
- Certificate OCR confidence below threshold + issuer mismatch.
- Duplicate project fingerprint (same repo/commit hash claimed by multiple
  users) — reuses the same GitHub verification provider already in
  `lib/verification/providers/github.js`.
- Statistically anomalous assessment completion time/accuracy pattern
  (flagged, not auto-penalized — human review required before any penalty
  event is recorded, since `manual_admin_adjustment`-style events already
  require `reviewerId` per the existing `eloLedger.js` convention).

### M.3 Dispute handling

A user whose claimed data is rejected or penalized can file a dispute
(`skill_rating_fraud_cases.status = 'disputed'`), reviewed by a second
admin (two-person rule, same as `manual_admin_adjustment` already
requires). Resolution always produces a new ledger event — a reversal is
never a silent delete of the penalty event, it's a new offsetting event
with `reason` explaining the reversal, so the audit trail never has gaps.

### M.4 Audit log

`skill_rating_events` **is** the audit log — every ELO-affecting action in
the system, human or automated, is a row there with `reason` and (where
applicable) `reviewer_id`. No separate audit table is needed because the
ledger was designed append-only from the start (§H.3).

---

## N. Migration Strategy from Current Implementation

### N.1 Exact current-state inventory (traced from the live repo)

| Current system | Tables/files | Fate under v2 |
|---|---|---|
| Legacy profile-completeness ELO | `profiles.role_elo/market_elo/proof_elo/mobility_elo/elo_rating/aura_score`, `computeEloSignals()` in `professionalProfile.js` | **Frozen, not deleted.** Continues to power "Profile Signals" (already demoted to a secondary, collapsed panel per the 2026-07-26 redesign). Never relabeled as Skill Rating. Backfill note: `profiles.elo_rating` is also read elsewhere (e.g. Pulse's `pulse/builders` ELO-window ranking) — those call sites are repointed to `user_elo_state.overall_elo` in the same PR that ships v2's read path, so there is exactly one "ELO used for ranking" meaning platform-wide, not two. |
| Professional ELO (current, real) | `professional_elo_state`, `professional_elo_events`, `eloEngine.js` | **Migrated forward, not replaced from scratch.** `professional_elo_state` rows become the seed for `user_elo_state` (`overall_elo` copied as-is, `base_elo` backfilled to 800, existing history preserved as historical events in `skill_rating_events` with `domain_id = null`). `computePulseEloDelta()`/`computeFreshnessDecay()` logic is kept and extended (per-skill tagging added), not rewritten from zero — it already embodies the right philosophy (bounded, decaying, assessment-driven). |
| College Path ledger | `institution_students.elo_current`, `elo_events`, `eloLedger.js` | `recordEloEvent()`'s discipline (single writer, validated source enum, two-person review for manual adjustments) is the direct template for v2's `recordSkillEvent()`. The College Path's own trigger-based sync (`trg_apply_elo_event`) is left in place initially (institution-facing surfaces keep working unchanged) while `elo_events` rows are also mirrored into `skill_rating_events` so institution students get unified Skill Rating history alongside their existing college-specific view. Full unification of the two ledgers is a Phase 2 item, not part of the initial cutover, to avoid touching institution-facing contracts in the same change that ships the new engine. |
| EPFO verification | `POST/GET /api/pro/epfo/*`, `profiles.epfo_verified` | Extended, not replaced: the existing submit/status routes gain a write into `claimed_experience.verification_status` alongside their current `profiles.epfo_verified` write (both kept in sync during migration so nothing reading the old column breaks), and a call into `applyExperienceBonusRecompute()` on success. |
| Certificate verification | `lib/verification/providers/certificateOcr.js` | Reused as-is as the provider for `claimed_certifications` verification — no changes to the OCR logic itself, only to what happens on its success/failure callback (now also fires `applyCertBonusRecompute()`). |

### N.2 Cutover sequence

1. Ship schema (§G) additive-only, empty tables, no reads yet — zero user-
   visible change.
2. Backfill job: `professional_elo_state` → `user_elo_state` +
   `skill_rating_events` (one-time script, idempotent, re-runnable).
3. Backfill job: `institution_students`/`profiles.elo_rating` student
   history → `user_skill_state`/`skill_rating_events` (best-effort;
   historical events before this migration are recorded as a single
   `event_type: 'legacy_import'` row per user so the ledger has *some*
   history entry rather than an unexplained starting balance).
4. Dual-write phase (behind `career_os_skill_rating_v2` flag, default OFF):
   every event source calls **both** the old path and `recordSkillEvent()`,
   but only the old path's result is shown to users. This is the
   verification window — compare v1 vs v2 numbers in the ops dashboard
   (extend `opsDashboard.js`, already has the pattern for this kind of
   cross-check) before trusting v2 output.
5. Flip the flag for an internal cohort, then a percentage rollout, per §O.
6. Old routes (`GET /api/pro/elo/professional`) become thin wrappers over
   the new `/api/skill-rating/*` responses, reshaped to the old contract,
   so existing frontend call sites don't all need to change in the same PR.
7. Frontend cutover to the new API shape happens in a follow-up PR once v2
   is fully live, not bundled into the backend migration PR.

### N.3 Known inconsistency this migration fixes

Today, "ELO" means at least three different numbers depending on which
table you read (`profiles.elo_rating` vs `professional_elo_state.elo` vs
`institution_students.elo_current`), with no single reconciled meaning.
`Pulse.jsx`'s `pulse/builders` ranking, for instance, currently orders by
`profiles.elo_rating`, which for a professional user reflects neither the
new Professional ELO track nor any verified-trust signal. v2's single
`user_elo_state.overall_elo` becomes the one number every ranking/matching
surface reads, closing this gap explicitly as part of the cutover (§N.1
row 1).

---

## O. Rollout and Feature Flags

| Flag | Default | Scope |
|---|---|---|
| `career_os_skill_rating_v2` | OFF | Master flag — gates whether `recordSkillEvent()` writes are trusted as the display source (dual-write always happens once schema ships, per §N.2 step 4) |
| `career_os_skill_rating_v2_experience_bonus` | OFF | Independently gates the EPFO-bonus recompute going live, so experience-bonus rollout can be sequenced after the base engine is validated |
| `career_os_skill_rating_v2_cert_bonus` | OFF | Same, for certification bonus |
| `career_os_skill_rating_v2_decay_scheduler` | OFF | Gates the new cron jobs (§I.2) so decay/reminders don't fire before the base numbers are trusted |

Rollout order: master flag → internal test accounts → 5% of new
professional signups → 100% of new signups → backfilled existing users
(last, since it's the highest-blast-radius group) → bonus flags → decay
scheduler flag. Each step gated on the ops-dashboard v1/v2 comparison
(§N.2 step 4) showing no unexplained divergence for a full week.

---

## P. Test Plan

1. **Unit tests** (mirrors existing `eloEngine.test.js` pattern): every pure
   function (`computeSkillEventDelta`, `computeFreshnessDecay`,
   `computeExperienceBonus`, `computeCertBonus`, aggregation formula) gets
   direct input/output tests including boundary cases (exactly at a cap,
   exactly at a decay threshold, verification status flipping mid-
   calculation).
2. **Isolation tests** (source-scan, same pattern as
   `professionalEloCanonical.test.js`): assert `professionalProfile.js` and
   `resume.js` never reference the new ELO write functions or tables.
3. **Idempotency tests**: replaying the same `sourceId` through
   `recordSkillEvent()` twice produces exactly one ledger row.
4. **Ledger integrity tests**: for a sequence of synthetic events, assert
   `sum(deltas) == overall_elo - base_elo` (modulo bounded-cap clamping,
   which is asserted separately) — catches any code path that mutates state
   without a corresponding ledger row.
5. **Fraud/dispute tests**: penalty application, dispute reversal produces
   an offsetting event (never a delete), two-person-review enforcement for
   manual adjustments.
6. **Decay scheduler tests**: given a synthetic `last_activity_at`, assert
   the exact reminder-day and decay-day math matches §I.1's table,
   including the two-phase (-5/week then -2/day) transition.
7. **Migration tests**: backfill script run twice is a no-op the second
   time (idempotent); dual-write comparison harness flags any v1/v2
   divergence beyond a defined tolerance.
8. **RLS tests**: verify a user cannot read another user's `claimed_*` rows
   or `skill_rating_events`, and that the recruiter-facing view never
   exposes `claimed`/`pending_verification` rows through the "verified-only"
   endpoint.
9. **Load/scale tests**: aggregation read path (`GET
   /api/skill-rating/status`) benchmarked at the materialized-aggregate
   read (§F.3), not a full ledger replay, confirmed O(1) regardless of a
   user's total historical event count.

---

## Scalability Notes (millions of users)

- Read path is always the materialized `user_elo_state`/`user_skill_state`
  rows — never a live replay of `skill_rating_events`, which can grow
  unbounded per user over years of activity. The ledger exists for audit/
  dispute/history-graph purposes, read with pagination and date-range
  filters, never in full on a hot path.
- Decay scheduler processes users in batches keyed by
  `last_activity_at` date buckets (indexed column), not a full-table scan
  every run.
- `skill_rating_events` is a natural candidate for partitioning by month
  once volume warrants it (standard Postgres range partitioning) — the
  schema's `created_at`-keyed access pattern supports this without any
  application-code change, so it's a pure ops decision deferred until
  actual volume requires it, not a day-one requirement.
