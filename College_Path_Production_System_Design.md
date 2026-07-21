# Capabilio College Path — Production System Design
### Version 1.0 · Prepared 2026-07-22 · Engineering Reference Document

> Scope discipline: this document covers **only** the College Path (college onboarding → placement cell → professor/mentor → student → recruiter → offer → EPFO → professional transition). No Organisation/company/government/NGO route logic is introduced here.

---

## 0. Grounding — What Already Exists (read before building)

Per architecture-first requirement, the current repo state was audited before writing this design. Three load-bearing facts change how the remaining sections must be implemented:

**0.1 — Two parallel schemas already exist for the same domain, and they are not reconciled.**

| Schema family | Files | Key/FK style | Status |
|---|---|---|---|
| `org_*` (`org_members`, `org_tasks`, `org_events`, `org_opportunities`, `org_audit_log`, `org_departments`, `org_groups`, `org_cases`, `org_workflow_queue`, `org_doc_approvals`, `org_routing_rules`, `org_escalation_policies`, `org_permission_grants`, `org_recruiter_ndas`) | `institution-migration.sql`, `supabase-institution-os-migration.sql` | `org_id uuid` — **not** a foreign key to any table. `org_id` is documented as "the institution admin's `profiles.id`." Role model: 7 roles incl. `dept_head`, stored as free-text in `org_members.role`. | Live; has `org_member_role()` / `is_org_staff()` SECURITY DEFINER helpers and RLS. |
| `institution_*` (`institutions`, `institution_students`, `institution_invite_codes`) | `supabase-institution-invite-codes.sql` | `institution_id uuid references institutions(id)` — real FK. `profiles.institution_id` added as FK to `institutions(id)`. | Live; RLS keyed on `institutions.admin_user_id = auth.uid()`, a single-admin model (no multi-admin/TPO/faculty role table). |
| Frontend/UI blueprint | `INSTITUTION_PATH_BLUEPRINT.md` (1,906 lines, already in repo) | Assumes a *third*, cleaner naming scheme: `institutions`, `institution_students`, `institution_tasks`, `institution_cohorts`, `institution_cohort_members`, `institution_events`, `institution_placements`, `institution_verification`, `institution_audit_log`, `pulse_posts`. | **Design doc only — not implemented.** No migration file in the repo creates `institution_tasks`, `institution_cohorts`, `institution_events`, `institution_placements`, or `institution_verification`. |

There is no `CREATE TABLE public.institutions` in any tracked migration file — the base `institutions` table exists in the live database but was created out-of-band (dashboard or ad-hoc `execute_sql`), which is itself a compliance gap (schema drift, no migration history for a table that seven other tables now FK against).

**Directive for this design:** the College Path must standardize on the `institution_*` FK-based family (it is the only one with real referential integrity) and treat `org_*` as **legacy-frozen** — read-compatible via a view/adapter layer during migration, never extended with new columns. Section 4 gives the reconciliation plan. This is a P0 architectural decision, not a naming preference: `org_id` with no FK means an institution row can be deleted while 8 dependent tables silently orphan, which is unacceptable for a system that produces NAAC placement reports and recruiter-facing ELO data.

**0.2 — The MCP layer already has a `college.*` tool namespace, and it is a stub.** `mcp/src/tools/college.ts` defines `college.getDepartmentLeaderboard`, `getStudentRoster`, `getCollegeStats`, `getBranchBreakdown`, `exportReport` — all five explicitly `NOT_IMPLEMENTED` with a comment stating "no institution-admin analytics backend of any kind exists." This confirms Section 6 (API architecture) and Section 3 (module: recruiter search / analytics) are genuinely new backend surface, not a wiring fix. (Consistent with memory: MCP layer built with real SDK/auth/RBAC/registry, but backend AI routes and college analytics bypass or don't yet reach it.)

**0.3 — Client-authored ELO and grading-race risk are open items from the 2026-07-16 certification audit** (P0 anon-RPC backdoors and profiles entitlement-column freeze already fixed in production; client-authored ELO and grading/farming races are still open). Any College Path workflow that writes ELO (task completion, challenge submission, interview scoring) **must not** accept a client-supplied ELO delta. This constrains Section 5 (assessments/challenge engine) and Section 6 (challenge delivery API) below — every scoring path routes through a single server-side ELO service, never through a client PATCH.

Everything below is written to be consistent with these three facts.

---

## 1. End-to-End Production Workflows

### 1.1 College Onboarding → Verification
```
Admin signs up (email + institution name)
  → institutions row created, status='unverified', admin_user_id=auth.uid()
  → institution_verification row created (level=0)
  → Step 1: Institutional email OTP (tpo@college.ac.in) → level=1, email_domain locked
  → Step 2: Domain proof — DNS TXT (polled) | HTML file fetch | manual URL match (48h SLA)
            → level=2, Pulse publishing + recruiter visibility unlocked
  → Step 3: Accreditation doc (NAAC/UGC/AICTE/trust registration) → encrypted storage,
            Capabilio ops review queue, 48–72h SLA → level=3
  → Step 4: Admin identity (Aadhaar last-4 / PAN, DigiLocker future) → level=4, "Capabilio
            Verified Institution" badge, full platform + recruiter portal access
  → Any level < 2: student invitations blocked, recruiter search excludes the institution,
    unverified banner shown on every institution page.
```
State machine: `unverified → email_verified → domain_verified → document_review → admin_review → verified`, with side-branches `under_review` (reported/flagged, all writes frozen) and `suspended` (admin-initiated freeze, students see a banner, no new links accepted).

### 1.2 Cohort Import (Students + Roster)
```
Admin uploads roster CSV (roll_no, name, email, department, batch, section)
  OR shares an institution_invite_code (per-batch/section link, optional discount%, expiry, max_uses)
  → Bulk import job (server-side, chunked, idempotent on (institution_id, roll_number)):
      1. Validate email domain against institutions.email_domain (soft warning if mismatch,
         hard block only if institution has enforce_domain_match=true)
      2. Deduplicate against existing institution_students + global profiles (see 9.4)
      3. Create institution_students rows: status='pending_admin' | 'active' depending on
         admin_approval_required flag
      4. Send invite emails/links; on first login, link auth.users → institution_students
  → Cohort/department/batch/section become first-class filter dimensions used everywhere
    downstream (tasks, cohorts, recruiter search, analytics).
```
Failure modes handled explicitly: partial CSV failure (row-level error report, not all-or-nothing), re-upload with same roll numbers (upsert, not duplicate insert), student who already has a Capabilio account under a different email (manual merge queue, never silent auto-merge — see 9.4).

### 1.3 Professor / Mentor Onboarding
```
Admin invites professor by email + department + role (professor | dept_head | mentor)
  → org_members-equivalent row created in institution_staff (new table, see §4), status='invited'
  → Professor accepts → linked to auth.users, scoped by default to own department
    (institution_staff.scope: 'own_department' | 'all_departments', admin-grantable)
  → Professor can now: publish institution_tasks to their scope, create institution_cohorts,
    moderate their department community feed, view department-scoped intelligence only.
```

### 1.4 Student Onboarding
```
Student joins via invite link/code or institution-domain email match
  → institution_students row created (see 0.1 — canonical family)
  → profiles.institution_id set (FK)
  → Student's existing Student Path account (if any) is linked, not duplicated
  → Student now receives: institution-pushed tasks in their Arena/task feed, cohort
    assignments, event invites, and institution posts in Pulse (if following)
```

### 1.5 Academic & Skill Tracking (continuous)
```
Student activity (Arena missions, institution tasks, assessments, challenges)
  → ELO service (server-side only) computes delta → elo_events row (append-only ledger)
  → institution_students.elo_current updated via trigger/materialized view, never
    written directly by client
  → job_readiness_score recomputed nightly (batch) from: ELO percentile, task completion
    rate, profile completeness, mock-interview scores
  → Institution Intelligence reads only from these server-computed aggregates
```

### 1.6 Recruiter Search & Invite
```
Recruiter account (guest tier, invited by TPO or self-registers as "recruiter" role,
  requires company-domain email verification before any student PII is visible)
  → Search: by institution (only institutions at verification level ≥ 2), department,
    batch, ELO range, skill tags, job-readiness tier
  → Results: aggregate/leaderboard view by default (name + ELO + dept + top skills).
    Full profile (contact info, resume) requires: (a) recruiter NDA/access agreement
    signed for that institution, AND (b) student has enabled "visible to recruiters"
  → Recruiter sends invite/challenge → recruiter_invites row created, notification to
    student, institution TPO sees it in their Recruiter Pipeline (CRM) for oversight
```

### 1.7 Challenge Assignment → Submission
```
Recruiter (or institution) assigns a code/aptitude/behavioral challenge
  → challenge_assignments row (assignment_id, student_id, source: recruiter|institution,
    due_at, integrity_flags jsonb)
  → Student attempts in sandboxed runner (existing Arena execution engine: sql.js/Pyodide
    real execution, per memory constraint — no static dummy scoring)
  → challenge_submissions row (attempt payload, execution result, submitted_at)
  → Server-side grader computes score + ELO delta (never client-supplied) → elo_events
  → Recruiter sees result; institution sees aggregate only unless recruiter explicitly
    shares full result with TPO (consent-gated, see §9)
```

### 1.8 Interview Execution
```
Recruiter/institution schedules interview (AI-assisted or human-led + recorded)
  → interviews row: mode ('ai'|'human'|'hybrid'), scheduled_at, status
  → RECORDING CONSENT: student must explicitly accept a recording-consent screen before
    the session starts; consent_given_at is stored and is a hard gate — no recording
    starts without it (§9.1)
  → Session runs (existing AI interview pipeline: /api/pro/interview/* — start/submitAnswer/
    complete chain, 3–7 LLM calls per session, Claude/Groq/Gemini via lib/router.js)
  → On completion: transcripts row generated (async job, not inline — transcription/
    summarization can exceed request timeout), interviews.status='completed'
  → transcript_ready event fires → recruiter + candidate notified
```

### 1.9 Offer Issuance → Placement Sync
```
Recruiter/institution issues offer → offers row (company, role, ctc, offer_date, status)
  → Student accepts/declines (offers.status)
  → On accept: institution_placements row created/updated, elo_at_placement snapshot taken
  → TPO confirmation required before the placement is shown as "Confirmed" anywhere
    public (Placement Wall, NAAC export) — self-reported-only placements are marked
    "Unconfirmed" and excluded from official stats (prevents fake placement inflation)
  → placement_confirmed event → triggers professional-upgrade prompt to student
```

### 1.10 Professional Transition
```
Student clicks "Upgrade to Professional"
  → Read-only confirmation of what carries forward: ELO history, projects, Arena history,
    institution link (read-only on Pro side)
  → professional_profiles row created, profiles.path='professional'
  → institution_students.status='transitioning' → 'professional_active' after upgrade
  → 60-day EPFO/UAN verification window opens (countdown, reminders at 30/50/58 days)
  → epf_records: UAN submitted → EPFO/DigiLocker lookup attempted → match confirms
    employer → verified badge; no-match/partial → manual document upload → ops review
  → Institution receives aggregate-only status back (placed / verification pending /
    verified) — never Professional-Path ELO or new-employer detail beyond initial
    placement (privacy boundary, §9.2)
  → salary_updates: first verified salary event closes the placement-verification loop
    and is the definitive signal used for NAAC "verified placement" reporting
```

---

## 2. Role-Based Architecture

Seven operational roles plus platform super admin. This reconciles the two different role vocabularies currently in the codebase (`org_members.role` has `dept_head`; the blueprint's permission model does not) into one canonical set.

| Role | Scope | Can do | Cannot do |
|---|---|---|---|
| **super_admin** (Capabilio ops) | Platform-wide | Verify/suspend institutions, review flagged accounts, access audit logs across institutions, override in fraud investigations | Cannot silently edit student ELO or placement data — even ops actions are audit-logged and reversible via ledger, not destructive writes |
| **college_admin** | One institution | Full institution config, staff role assignment, billing, verification flow, danger-zone actions (transfer/archive/delete) | Cannot see another institution's data; cannot fabricate a "verified" placement without TPO confirmation record |
| **placement_officer (TPO)** | One institution | Manage Opportunities/Outcomes, confirm placements, manage recruiter relationships, department-crossing student view, publish to Placement Wall | Cannot alter a student's ELO directly; cannot approve their own institution's verification (must be college_admin or ops) |
| **professor / dept_head** | Own department (default), grantable to all-departments | Publish tasks, create cohorts, review manual-grade submissions, moderate own department feed, view own-department intelligence | Cannot view other departments' student PII by default; cannot issue offers or confirm placements |
| **mentor** | Assigned mentee group | View mentee profiles/progress, post in own groups, create sessions | Cannot publish institution-wide tasks; cannot see non-mentee student data |
| **student** | Own profile + institution-scoped feed | Complete tasks/challenges, control recruiter-visibility toggle, control Placement-Wall consent, upgrade to Professional | Cannot self-report a "confirmed" placement (self-reported placements are flagged Unconfirmed); cannot see other students' PII beyond public leaderboard fields |
| **recruiter** | Guest, per-institution NDA-scoped | Search/leaderboard view, send invites/challenges, schedule interviews, issue offers (within institutions they hold an access agreement for) | Cannot see student contact info without signed NDA + student opt-in; cannot see students at institutions below verification level 2 |

Permission checks are enforced at three layers (defense in depth, matching the existing MCP pattern in `shared/permissions.js`): (1) Postgres RLS as the source of truth, (2) MCP tool-level `assertPermission`/`assertCollegeAdmin`-style guards, (3) Express route middleware for any non-MCP backend path. No layer is allowed to be the *only* check — RLS must hold even if application code has a bug, per the existing "never bypass RLS" instruction.

---

## 3. Module Architecture

| Module | Responsibility | Depends on |
|---|---|---|
| **Institution Management** | Institution profile, verification state machine, staff roles, danger-zone ops | Auth, Storage (docs), Ops review queue |
| **User & Cohort Management** | Roster import, department/batch/section taxonomy, cohort builder, invite codes | Institution Management |
| **Communication & Announcements** | Institution feed, department feeds, Pulse publishing, moderation queue | Pulse (existing social layer) |
| **Mentor & Professor Tools** | Task builder, task propagation engine, cohort intervention tooling, manual-review queue | ELO Service, Notification Service |
| **Student Profile & Skill Intelligence** | ELO ledger read model, job-readiness scoring, skill-gap tagging | ELO Service (write-only owner), Career Timeline |
| **Assessments & Challenge Engine** | Code/aptitude/behavioral challenge delivery, sandboxed real execution (sql.js/Pyodide), server-side grading | Arena execution engine, ELO Service |
| **Recruiter Search & Invite** | Institution/department/ELO-range search, leaderboard export, NDA gating, invite/challenge dispatch | Institution Management, Verification |
| **Interview & Transcript Service** | Session orchestration (AI/human/hybrid), consent gate, recording storage, async transcript generation | AI Router (Claude/Groq/Gemini), Storage, Consent Ledger |
| **Offer & Joining Tracker** | Offer lifecycle, TPO confirmation, joining-status verification | Placement records, Notification Service |
| **Placement Analytics** | Funnel, department comparison, faculty impact, NAAC export | Read replicas / materialized views over ELO + placement data |
| **Professional Profile Engine** | Post-graduation identity, continuity of ELO/portfolio, EPFO/UAN verification | Career Timeline, EPFO integration |
| **Audit & Compliance Layer** | Immutable action log, GDPR/PDPB export & deletion requests, data retention | Every module (write-through) |

---

## 4. Data Model (Canonical, Reconciled)

This supersedes both existing partial schemas. `institution_*` naming is retained (real FKs); `org_*` tables are frozen and exposed only via compatibility views during migration (see 4.3).

### 4.1 Core entities (columns abbreviated to what's structurally significant)

```sql
-- Tracked migration for the table that currently has none.
create table if not exists public.institutions (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text unique not null,
  type              text not null default 'college'
                       check (type in ('university','college','training','corporate')),
  admin_user_id     uuid not null references auth.users(id),   -- primary admin
  email_domain      text,
  website           text,
  address           jsonb default '{}',
  established_year  int,
  accreditation     jsonb default '{}',                        -- {type, grade, year}
  verification_level int not null default 0 check (verification_level between 0 and 4),
  status            text not null default 'unverified'
                       check (status in ('unverified','under_review','verified','suspended','archived')),
  plan              text default 'trial',
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table if not exists public.institution_staff (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in
                    ('college_admin','placement_officer','professor','dept_head','mentor')),
  department      text,
  scope           text not null default 'own_department'
                    check (scope in ('own_department','all_departments')),
  status          text not null default 'invited'
                    check (status in ('invited','active','revoked')),
  invited_by      uuid references auth.users(id),
  created_at      timestamptz default now(),
  unique (institution_id, user_id, role)
);

create table if not exists public.departments (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  code            text not null,
  name            text,
  unique (institution_id, code)
);

create table if not exists public.batches (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  department_id   uuid references public.departments(id) on delete set null,
  label           text not null,        -- "2022-26"
  year            int
);

create table if not exists public.sections (
  id              uuid primary key default gen_random_uuid(),
  batch_id        uuid not null references public.batches(id) on delete cascade,
  label           text not null          -- "A", "B"
);

-- institution_students: canonical (keep as-is from supabase-institution-invite-codes.sql,
-- add columns needed by ELO/placement read model):
alter table public.institution_students
  add column if not exists section_id uuid references public.sections(id),
  add column if not exists elo_current int default 0,
  add column if not exists elo_at_enrollment int,
  add column if not exists job_readiness_score numeric,
  add column if not exists status text not null default 'active'
    check (status in ('active','drifting','at_risk','placed','transitioning',
                       'professional_active','graduated'));

create table if not exists public.mentor_groups (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  mentor_user_id  uuid not null references auth.users(id),
  name            text not null,
  created_at      timestamptz default now()
);

create table if not exists public.mentor_group_members (
  group_id        uuid not null references public.mentor_groups(id) on delete cascade,
  student_id      uuid not null references public.institution_students(id) on delete cascade,
  primary key (group_id, student_id)
);

create table if not exists public.notes (                       -- professor note sharing
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  author_id       uuid not null references auth.users(id),
  scope           jsonb not null default '{}',   -- {department_ids[], batch_ids[], cohort_ids[]}
  title           text not null,
  body            text,
  attachments     jsonb default '[]',
  visibility      text default 'scope' check (visibility in ('scope','institution','public')),
  created_at      timestamptz default now()
);

create table if not exists public.announcements (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  author_id       uuid not null references auth.users(id),
  type            text not null check (type in
                    ('announcement','placement_milestone','event','achievement','alert')),
  audience        jsonb not null default '{"all": true}',
  publish_to_pulse boolean default false,
  published_at    timestamptz,
  created_at      timestamptz default now()
);

create table if not exists public.institution_cohorts (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  name            text not null,
  type            text check (type in ('skill','intervention','placement','domain','custom')),
  owner_staff_id  uuid references public.institution_staff(id),
  goal            jsonb default '{}',
  status          text default 'draft' check (status in ('draft','active','completed','archived')),
  start_date      date, end_date date,
  created_at      timestamptz default now()
);

create table if not exists public.institution_cohort_members (
  cohort_id       uuid not null references public.institution_cohorts(id) on delete cascade,
  student_id      uuid not null references public.institution_students(id) on delete cascade,
  primary key (cohort_id, student_id)
);

create table if not exists public.assessments (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid references public.institutions(id) on delete cascade,   -- null = platform-wide
  created_by      uuid not null references auth.users(id),
  title           text not null,
  type            text check (type in ('dsa','sql','aptitude','communication','project','custom')),
  difficulty      text check (difficulty in ('easy','medium','hard','expert')),
  submission_type text check (submission_type in ('code','file','text','link')),
  review_mode     text check (review_mode in ('auto','manual','peer')),
  target_audience jsonb default '{}',   -- cohort_ids/department_ids/batch_ids/elo_range/tags
  status          text default 'draft' check (status in ('draft','published','closed')),
  due_date        timestamptz,
  created_at      timestamptz default now()
);

create table if not exists public.challenge_assignments (
  id              uuid primary key default gen_random_uuid(),
  assessment_id   uuid not null references public.assessments(id) on delete cascade,
  student_id      uuid not null references public.institution_students(id) on delete cascade,
  source          text not null check (source in ('institution','recruiter')),
  source_id       uuid,                 -- recruiter_invites.id when source='recruiter'
  due_at          timestamptz,
  status          text default 'assigned' check (status in
                    ('assigned','in_progress','submitted','graded','expired')),
  created_at      timestamptz default now(),
  unique (assessment_id, student_id)
);

create table if not exists public.challenge_submissions (
  id                uuid primary key default gen_random_uuid(),
  assignment_id     uuid not null references public.challenge_assignments(id) on delete cascade,
  payload           jsonb not null,       -- code/text/file refs, never trusted for scoring
  execution_result  jsonb,                -- real sandbox output (sql.js/Pyodide), not mocked
  score             numeric,              -- server-computed, immutable once set
  elo_delta         numeric,              -- server-computed, immutable once set
  integrity_flags   jsonb default '[]',   -- plagiarism/timing anomalies
  submitted_at      timestamptz default now(),
  graded_at         timestamptz
);

create table if not exists public.interviews (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid references public.institutions(id),
  recruiter_id    uuid references auth.users(id),
  student_id      uuid not null references public.institution_students(id),
  mode            text not null check (mode in ('ai','human','hybrid')),
  scheduled_at    timestamptz,
  consent_given_at timestamptz,          -- hard gate, see §9.1 — recording cannot start without this
  status          text default 'scheduled' check (status in
                    ('scheduled','consent_pending','live','completed','cancelled')),
  recording_url   text,
  created_at      timestamptz default now()
);

create table if not exists public.transcripts (
  id              uuid primary key default gen_random_uuid(),
  interview_id    uuid not null references public.interviews(id) on delete cascade,
  content         text,
  summary         jsonb,                 -- structured: strengths, gaps, scores
  generated_at    timestamptz,
  status          text default 'processing' check (status in ('processing','ready','failed'))
);

create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.institution_students(id),
  institution_id  uuid not null references public.institutions(id),
  recruiter_id    uuid references auth.users(id),
  company         text not null,
  role            text,
  ctc_lpa         numeric,
  offer_date      date,
  status          text default 'offered' check (status in
                    ('offered','accepted','declined','rescinded')),
  created_at      timestamptz default now()
);

create table if not exists public.institution_placements (
  id                    uuid primary key default gen_random_uuid(),
  offer_id              uuid references public.offers(id),
  student_id            uuid not null references public.institution_students(id),
  institution_id        uuid not null references public.institutions(id),
  company               text not null,
  role                  text,
  ctc_lpa               numeric,
  joining_date          date,
  elo_at_placement      int,
  confirmation_status   text default 'unconfirmed' check (confirmation_status in
                          ('unconfirmed','tpo_confirmed','disputed')),
  confirmed_by          uuid references auth.users(id),   -- must be placement_officer/college_admin
  confirmed_at          timestamptz,
  visible_on_placement_wall boolean default false,        -- student consent required
  created_at            timestamptz default now()
);

create table if not exists public.recruiter_invites (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id),
  recruiter_id    uuid not null references auth.users(id),
  student_id      uuid not null references public.institution_students(id),
  type            text check (type in ('profile_view','challenge','interview')),
  status          text default 'sent' check (status in ('sent','viewed','accepted','declined')),
  created_at      timestamptz default now()
);

create table if not exists public.company_connections (       -- recruiter NDA / access agreement
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id),
  recruiter_org_id  uuid not null,     -- references companies table in Organisation Path (read-only FK, no writes)
  status            text default 'pending' check (status in ('pending','active','expired','revoked')),
  scope             jsonb default '{}',
  signed_at         timestamptz
);

create table if not exists public.professional_profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references auth.users(id),
  origin_institution_id uuid references public.institutions(id),
  origin_placement_id   uuid references public.institution_placements(id),
  upgraded_at           timestamptz default now(),
  current_company       text,
  current_role          text
);

create table if not exists public.epf_records (
  id                    uuid primary key default gen_random_uuid(),
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  uan                   text,
  verification_status   text default 'not_started' check (verification_status in
                          ('not_started','in_progress','verified','expired','failed')),
  verification_deadline timestamptz,
  verified_at           timestamptz,
  source                text check (source in ('epfo_api','digilocker','manual_document'))
);

create table if not exists public.salary_updates (
  id                    uuid primary key default gen_random_uuid(),
  professional_profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  amount_monthly        numeric,
  effective_from        date,
  verified              boolean default false,
  source                text,
  created_at            timestamptz default now()
);

create table if not exists public.activity_logs (              -- immutable, append-only
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid references public.institutions(id),
  actor_id        uuid,
  action_code     text not null,     -- e.g. "task.published", "placement.confirmed"
  entity_type     text,
  entity_id       uuid,
  severity        text default 'info' check (severity in ('info','warning','critical')),
  details         jsonb default '{}',
  created_at      timestamptz default now()
);
```

### 4.2 ELO as an append-only ledger, not a mutable column
`institution_students.elo_current` is a **denormalized read cache**, refreshed only by a trigger on `elo_events` inserts. `elo_events` (already implied by existing certification-audit findings) is the single source of truth:

```sql
create table if not exists public.elo_events (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.institution_students(id),
  source        text not null check (source in
                  ('arena_mission','institution_task','challenge_submission','interview','manual_admin_adjustment')),
  source_id     uuid,
  delta         numeric not null,
  elo_before    numeric not null,
  elo_after     numeric not null,
  created_by    text not null default 'system',   -- 'system' for automated grading; a user_id only for manual_admin_adjustment, and that path requires two-person review
  created_at    timestamptz default now()
);
```
No API surface accepts a client-supplied `elo_after` or `delta` — every write path computes it server-side from `execution_result`/rubric score. This directly closes the "client-authored ELO" item flagged open in the 2026-07-16 audit, scoped specifically to College Path write paths.

### 4.3 Migration plan for `org_*` → canonical schema
1. Freeze `org_*` for new features immediately (no new columns, no new tables in that family).
2. Ship the canonical tables above alongside the existing ones (additive, zero downtime).
3. Backfill: `org_members → institution_staff` (for role ≠ student) and `→ institution_students` (for role = student), preserving `id` as a foreign key mapping table `legacy_org_member_map(org_member_id, canonical_id, canonical_table)` for traceability.
4. Cut over reads table-by-table behind a feature flag; keep dual-write for one release cycle; verify row-count and ELO-sum parity before dropping dual-write.
5. Do not drop `org_*` tables until an explicit sign-off — archive, don't delete, per the existing "backward-compatible unless explicitly instructed" rule.

---

## 5. API Architecture

Backend convention observed in `backend/server/routes/*.js` (Express) is per-domain route files; MCP tools in `mcp/src/tools/*.ts` wrap a subset of these for agent/LLM access. College Path adds routes following the same pattern — it does **not** invent a new backend framework.

| Domain | Route prefix (new) | Key endpoints | MCP tool(s) to implement |
|---|---|---|---|
| Onboarding & verification | `/api/college/institutions` | `POST /`, `POST /:id/verify/email`, `POST /:id/verify/domain`, `POST /:id/verify/documents`, `GET /:id/verification-status` | — (admin-web only, not agent-exposed) |
| Cohort sync | `/api/college/:institutionId/roster` | `POST /import` (chunked CSV job), `GET /import/:jobId/status`, `POST /invite-codes`, `GET /students` | `college.getStudentRoster` (implement — currently stub) |
| Student profile updates | `/api/college/:institutionId/students/:studentId` | `GET /`, `PATCH /department-batch-section`, `POST /visibility-toggle` | — |
| Professor communication | `/api/college/:institutionId/notes`, `/tasks` | `POST /notes`, `POST /tasks`, `POST /tasks/:id/publish`, `GET /tasks/:id/submissions` | — |
| Recruiter search | `/api/college/recruiter/search` | `GET /?dept=&eloMin=&eloMax=&skills=` (leaderboard, aggregate by default) | `college.getDepartmentLeaderboard`, `college.getBranchBreakdown` (implement — currently stub) |
| Challenge delivery | `/api/college/challenges` | `POST /assign`, `POST /:assignmentId/submit`, `GET /:assignmentId/result` | reuse existing Arena execution engine; no new sandbox |
| Interview recording | `/api/college/interviews` | `POST /schedule`, `POST /:id/consent`, `POST /:id/start`, existing `/api/pro/interview/*` chain for the actual Q&A | `interview.startSession` etc. (already implemented for Pro path — extend `source` field to allow `institution`) |
| Transcript retrieval | `/api/college/interviews/:id/transcript` | `GET /` (poll or webhook when `transcripts.status='ready'`) | — |
| Offer creation | `/api/college/offers` | `POST /`, `POST /:id/respond` (student accept/decline) | — |
| Placement dashboard sync | `/api/college/:institutionId/placements` | `GET /`, `POST /:id/confirm` (TPO-only, RLS-enforced), `GET /funnel`, `GET /naac-export` | `college.getCollegeStats`, `college.exportReport` (implement — currently stub) |
| Professional conversion | `/api/college/students/:studentId/upgrade` | `POST /` (idempotent — safe to retry), `GET /upgrade-status` | — |

**API-level invariants (non-negotiable, per production-stability requirement):**
- Every mutating endpoint validates JWT role via the same RLS-backed check used by Postgres, not just an app-layer `if (role === 'admin')` — belt and suspenders.
- Every scoring/ELO-affecting endpoint is idempotent on a client-supplied `idempotency_key` (submission retries, network blips during a challenge submit, must not double-score).
- Every endpoint that fans out to many students (task publish, invite send) runs as a background job with a job-status endpoint — never a synchronous request that times out at 300+ students.

---

## 6. Event-Driven System

Events are emitted from the write path (server-side, transactionally with the causing DB write — not fired-and-forgotten from the client) onto a durable queue. Given the existing stack has no message broker in evidence, the pragmatic production choice is **Postgres `LISTEN/NOTIFY` + a `domain_events` outbox table**, consumed by a lightweight worker, with Supabase Realtime used purely for pushing already-committed state to the frontend (which is the pattern the blueprint's "Realtime Subscriptions" section already assumes).

| Event | Producer | Consumers | Notes |
|---|---|---|---|
| `student.created` | Cohort import / self-join | Notification service, Analytics | Triggers welcome flow |
| `student.skill_updated` | ELO service (on `elo_events` insert) | Institution Intelligence cache, Career Timeline, Recruiter search index | Debounced — not fired per-point, batched per session |
| `recruiter.invite_sent` | Recruiter search/invite | Notification service, TPO pipeline view | TPO visibility is mandatory, not optional (oversight requirement) |
| `challenge.submitted` | Challenge engine | Grading worker, Integrity checker | Grading worker is the *only* writer of `score`/`elo_delta` |
| `interview.completed` | Interview service | Transcript generation worker | Async — never blocks the interview-end response |
| `transcript.ready` | Transcript worker | Recruiter, student, notification service | |
| `offer.accepted` | Offer service | Placement service (creates `institution_placements` in `unconfirmed` state) | Does NOT mark as confirmed — TPO gate required |
| `placement.confirmed` | TPO confirm action | Professional-upgrade prompt trigger, Outcomes analytics, Placement Wall (if consented) | |
| `student.professional_upgrade` | Upgrade endpoint | EPFO verification window starter, Institution aggregate-status sync | |
| `epf.verified` | EPFO/DigiLocker webhook or manual review approval | Professional profile badge, Institution aggregate-status sync | |
| `salary.first_verified` | Salary update service | NAAC "verified placement" report finalizer | Closes the placement-verification loop |
| `institution.verification_level_changed` | Verification service | Recruiter search index (re-include/exclude institution), UI banners | |

Every event row also writes to `activity_logs` — the event log and the audit log are the same underlying append-only store, viewed through different filters, so there is exactly one source of truth for "what happened and when" (avoids the drift risk of maintaining two logs).

---

## 7. Infrastructure Design

| Layer | Recommendation | Rationale (grounded in current stack) |
|---|---|---|
| Frontend | Existing Vite/React SPA, `frontend/src/paths/institution/` isolation (already scaffolded in the blueprint's Section 19) | Keep path-based code splitting; College Path ships as its own chunk, doesn't bloat Student/Professional bundles |
| Backend | Existing Node/Express (`backend/server/routes/*.js`), extended with a `college/` route group | Matches existing convention; no new framework introduced |
| Background jobs | Add a worker process (roster import, task fan-out, transcript generation, ELO recompute) reading from the `domain_events` outbox | These are exactly the operations flagged above as "must not be synchronous" |
| Auth | Existing Supabase Auth + JWT, extended `institution_staff` role claims | No change to auth provider; role resolution happens via the `org_member_role()`-style SECURITY DEFINER pattern, ported to `institution_staff` |
| Database | Supabase Postgres, single primary; add read replicas once Intelligence-page aggregate queries show p95 latency regression under real cohort sizes (1,000+ students/institution) | Materialized views (`mv_institution_elo_distribution`, `mv_placement_funnel`) refreshed on a schedule, not computed live on every dashboard load |
| Storage | Supabase Storage buckets: `institution-verification-docs` (encrypted, ops-only access), `interview-recordings` (student-owned RLS, time-limited signed URLs), `roster-imports` | Verification docs and recordings are the two categories requiring the strictest RLS — separate buckets, separate policies |
| Media handling | Interview recordings stored server-side immediately on session end, never client-uploaded raw (prevents tampering before grading) | |
| Transcript generation | Async worker, Claude via `lib/claude.js` (existing router) for summarization; raw ASR via whichever provider `lib/router.js` already routes voice to | Reuse existing AI router; do not add a fourth provider without justification |
| Search indexing | Postgres full-text + trigram indexes on `institution_students` (name, skill tags) scoped by `institution_id`; consider a dedicated search index (e.g., typesense/meilisearch) only if recruiter search query volume outgrows Postgres — not needed at launch scale | |
| Notifications | Existing notification service, extended with College Path event types from §6 | |
| Analytics | Materialized views + nightly batch job for `job_readiness_score`; do not compute this synchronously per page load | |
| Logging | Structured logs already used in MCP layer (`shared/logger.js` with `createLogger`/`startTimer`) — extend to new College Path routes for consistency | |
| Permissions | Three-layer enforcement per §2 | |
| Backups | Supabase automated backups; additionally, `elo_events` and `activity_logs` (append-only ledgers) should have point-in-time recovery verified specifically, since they are the audit trail | |
| Privacy | Field-level RLS for PII (email, phone, DOB never exposed via aggregate/leaderboard queries — confirmed as an existing constraint in `college.ts`'s own doc comment) | |
| Observability | Add alerting on: roster-import job failure rate, ELO-event write failures, transcript-generation queue depth, verification-review SLA breaches | |

---

## 8. Lifecycle Continuity

```
STUDENT ──────► CANDIDATE ──────► EMPLOYEE ──────► PROFESSIONAL ──────► JOB SWITCHER
(institution_    (recruiter        (offer accepted,  (professional_      (career timeline
 students row)    invite/challenge, TPO confirmed,     profiles row,       continues, ELO
                   interview)       institution_        EPFO verified)      history unbroken)
                                    placements row)
```

One `profiles.id` (the Supabase auth user) persists across the entire arc. What changes is which domain tables reference it and what's visible to whom:

- **Identity never forks.** `institution_students.student_user_id` and `professional_profiles.user_id` both point to the same `auth.users.id`. There is exactly one profile, never a "new account" created at upgrade time — this is enforced by the upgrade endpoint being an *update*, not an insert-and-relink.
- **ELO history is cumulative and immutable.** `elo_events` rows are never deleted or rewritten on transition; the Professional Path reads the same ledger, just adds new `source` types (e.g., `on_the_job_certification`).
- **Institution linkage becomes read-only, not deleted.** `professional_profiles.origin_institution_id` preserves provenance forever (needed for the institution's own NAAC historical reporting and for verified-alumni features), while write access to that student's record moves entirely to the Professional Path.
- **Verified history compounds.** Each stage adds a verification layer (institution-verified skill → TPO-confirmed placement → EPFO-verified employment → future employer-verified promotions/switches) rather than replacing the previous one, so a recruiter five years later can see an unbroken, verifiable chain rather than a self-reported resume.

---

## 9. Production Risks and Guardrails

| Risk | Guardrail |
|---|---|
| **9.1 Consent on interview recording** | Hard DB gate: `interviews.consent_given_at` must be non-null before `status` can transition to `live`; enforced by a Postgres check constraint / trigger, not just frontend logic, so no code path can start a recording without consent. Consent text must specify retention period and who can access the recording (recruiter, institution TPO if shared, Capabilio ops for disputes only). |
| **9.2 Student data privacy** | Aggregate-only views for institution recruiter-visibility and cross-institution comparisons; PII (email, phone, DOB) excluded from every leaderboard/analytics query by construction (view-level column exclusion, not just app-layer filtering) — matches the constraint already documented in `college.ts`. Professional-Path detail is never exposed back to the institution (§1.10). |
| **9.3 Recruiter abuse** | NDA/access-agreement gate before any full profile is visible; rate-limit invite/challenge sends per recruiter per day; institution TPO has mandatory visibility into every recruiter invite sent to their students (oversight, not silent recruiter-to-student channel); report/flag flow with auto-restriction after N reports, mirroring the institution-report flow already specced. |
| **9.4 Duplicate profiles** | Roster import never auto-creates a second `auth.users` row for an email that already has one — it links. Cross-institution duplicate detection (same name + phone/email fuzzy match across institutions) routes to a manual merge queue for ops review; automatic silent merges are explicitly disallowed because a wrong merge would corrupt someone else's ELO/placement history. |
| **9.5 Profile ownership** | A student's `auth.users` row is the sole owner of their profile; institution admins have *managed* access (can view, assign tasks, confirm placement) but never *unilateral write* access to ELO, personal details, or consent flags. Ownership transfer (e.g., institution account handover) requires the danger-zone flow with admin-identity re-verification, not a simple settings toggle. |
| **9.6 Audit trail** | Every state-changing action across all modules writes to `activity_logs` (§4.1) with actor, action_code, entity, and details — immutable, no UPDATE/DELETE permission granted to any application role, only INSERT. Manual ELO adjustments specifically require two-person review recorded in the same log (closes the open "client-authored ELO" / grading-race risk from the 2026-07-16 audit for this domain). |
| **9.7 College admin permissions** | Single-admin bottleneck in the current `institutions.admin_user_id` model is a production risk (no admin = no one can act). `institution_staff` (§4.1) allows multiple `college_admin` rows per institution; the danger-zone (delete/transfer) actions require confirmation from a second admin or ops for institutions above a size threshold, to prevent one compromised or disgruntled admin from unilaterally destroying institution data. |
| **9.8 Joining-status verification** | Placement is not "real" for reporting purposes until TPO-confirmed (`institution_placements.confirmation_status`); it is not "verified" for the professional profile until EPFO/UAN match or manual-document approval. Self-reported-only placements are visually and structurally distinguished (`unconfirmed`) everywhere, including NAAC exports, to prevent placement-rate inflation — a real institutional-trust risk given placement statistics are often audited externally. |

---

## 10. Immediate Next Actions (Sprint 0, before any UI work resumes)

1. Ship the canonical migration in §4.1–4.2 as a tracked, reviewed SQL migration (closing the "institutions table has no migration history" gap).
2. Freeze `org_*` tables; add the `legacy_org_member_map` bridge table.
3. Implement the five `college.*` MCP tools against the new schema (currently `NOT_IMPLEMENTED` stubs) — this is the fastest way to validate the schema against real read patterns before building UI on top of it.
4. Add the `elo_events` ledger and cut every existing ELO-writing path (Arena, challenges, interviews) over to it, removing any direct-write path to `elo_current`.
5. Only after 1–4 are in staging and RLS-verified via `get_advisors`, resume the `INSTITUTION_PATH_BLUEPRINT.md` Sprint 1+ UI roadmap — building the UI in Section 5–17 of that document on top of the reconciled schema, not the current dual-schema state.
