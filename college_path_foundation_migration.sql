-- ============================================================================
-- Capabilio · College Path — Foundation Migration
-- Run in: Supabase → SQL Editor → New Query → Run  (or: supabase db push)
-- Idempotent: safe to run multiple times (CREATE TABLE IF NOT EXISTS,
-- ADD COLUMN IF NOT EXISTS, CREATE POLICY guarded by DROP POLICY IF EXISTS).
--
-- WHY THIS FILE EXISTS:
-- The `institutions` table is already live in production but has never had a
-- tracked migration — 7+ other tables FK against a table with no schema
-- history. This file is that missing migration (guarded with IF NOT EXISTS
-- so it is a no-op against the live table's existing columns) plus every
-- net-new table needed to move the College Path off the two conflicting
-- legacy schemas (`org_*` with no FK integrity, and the partial
-- `institution_*` set) onto one canonical, FK-correct schema.
--
-- Legacy `org_*` tables (institution-migration.sql,
-- supabase-institution-os-migration.sql) are NOT touched or dropped here.
-- They are frozen going forward — no new columns/tables should be added to
-- that family. A follow-up backfill migration maps org_members rows into
-- institution_staff / institution_students; that is a separate, reviewed
-- data-migration script, not part of this schema migration.
-- ============================================================================

-- ─── 0. Extensions ─────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─── 1. institutions (tracked for the first time) ───────────────────────────
create table if not exists public.institutions (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text unique not null,
  type                text not null default 'college'
                         check (type in ('university','college','training','corporate')),
  admin_user_id       uuid not null references auth.users(id),
  email_domain        text,
  enforce_domain_match boolean not null default false,
  website             text,
  address             jsonb not null default '{}',
  established_year    int,
  accreditation       jsonb not null default '{}',
  logo_url            text,
  cover_url           text,
  description         text,
  verification_level  int not null default 0 check (verification_level between 0 and 4),
  status              text not null default 'unverified'
                         check (status in ('unverified','under_review','verified','suspended','archived')),
  plan                text not null default 'trial',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_institutions_slug   on public.institutions (slug);
create index if not exists idx_institutions_admin  on public.institutions (admin_user_id);
create index if not exists idx_institutions_status on public.institutions (status);

-- ─── 2. institution_verification (step-by-step trust state) ─────────────────
create table if not exists public.institution_verification (
  institution_id            uuid primary key references public.institutions(id) on delete cascade,
  email_verified            boolean not null default false,
  email_verified_at         timestamptz,
  domain_verified           boolean not null default false,
  domain_method             text check (domain_method in ('dns','html','manual')),
  domain_verified_at        timestamptz,
  document_status           text not null default 'not_submitted'
                               check (document_status in ('not_submitted','under_review','approved','rejected')),
  document_rejection_reason text,
  document_reviewed_at      timestamptz,
  admin_identity_status     text not null default 'not_submitted'
                               check (admin_identity_status in ('not_submitted','under_review','approved','rejected')),
  fully_verified_at         timestamptz,
  updated_at                timestamptz not null default now()
);

-- ─── 3. institution_staff (multi-admin + role model, replaces single admin_user_id bottleneck) ──
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
  created_at      timestamptz not null default now(),
  unique (institution_id, user_id, role)
);

create index if not exists idx_inst_staff_institution on public.institution_staff (institution_id);
create index if not exists idx_inst_staff_user         on public.institution_staff (user_id);

-- ─── 4. departments / batches / sections (taxonomy) ──────────────────────────
create table if not exists public.departments (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  code            text not null,
  name            text,
  created_at      timestamptz not null default now(),
  unique (institution_id, code)
);

create table if not exists public.batches (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  department_id   uuid references public.departments(id) on delete set null,
  label           text not null,
  year            int,
  created_at      timestamptz not null default now()
);

create table if not exists public.sections (
  id         uuid primary key default gen_random_uuid(),
  batch_id   uuid not null references public.batches(id) on delete cascade,
  label      text not null,
  created_at timestamptz not null default now()
);

-- ─── 5. institution_students (canonical linkage — extend if it already exists) ──
create table if not exists public.institution_students (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete cascade,
  student_user_id   uuid not null references auth.users(id) on delete cascade,
  link_method       text not null default 'invite_code'
                       check (link_method in ('email_domain','invite_code','self_declared')),
  status            text not null default 'active'
                       check (status in ('pending_admin','active','drifting','at_risk','placed',
                                          'transitioning','professional_active','graduated',
                                          'rejected','alumni','withdrawn')),
  department        text,
  batch             text,
  section_id        uuid references public.sections(id),
  roll_number       text,
  elo_current       numeric not null default 0,
  elo_at_enrollment numeric,
  job_readiness_score numeric,
  linked_at         timestamptz not null default now(),
  approved_at       timestamptz,
  withdrawn_at      timestamptz,
  unique (institution_id, student_user_id)
);

create index if not exists idx_inst_students_institution on public.institution_students (institution_id);
create index if not exists idx_inst_students_user         on public.institution_students (student_user_id);
create index if not exists idx_inst_students_dept_batch   on public.institution_students (institution_id, department, batch);
create index if not exists idx_inst_students_elo          on public.institution_students (institution_id, elo_current desc);

-- Backfill columns onto a pre-existing institution_students table from an
-- earlier partial migration, without clobbering data.
alter table public.institution_students
  add column if not exists section_id uuid references public.sections(id),
  add column if not exists elo_current numeric not null default 0,
  add column if not exists elo_at_enrollment numeric,
  add column if not exists job_readiness_score numeric;

-- ─── 6. mentor_groups ─────────────────────────────────────────────────────
create table if not exists public.mentor_groups (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  mentor_user_id  uuid not null references auth.users(id),
  name            text not null,
  created_at      timestamptz not null default now()
);

create table if not exists public.mentor_group_members (
  group_id   uuid not null references public.mentor_groups(id) on delete cascade,
  student_id uuid not null references public.institution_students(id) on delete cascade,
  primary key (group_id, student_id)
);

-- ─── 7. notes / announcements ─────────────────────────────────────────────
create table if not exists public.notes (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  author_id       uuid not null references auth.users(id),
  scope           jsonb not null default '{}',
  title           text not null,
  body            text,
  attachments     jsonb not null default '[]',
  visibility      text not null default 'scope' check (visibility in ('scope','institution','public')),
  created_at      timestamptz not null default now()
);

create table if not exists public.announcements (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete cascade,
  author_id         uuid not null references auth.users(id),
  type              text not null check (type in
                       ('announcement','placement_milestone','event','achievement','alert')),
  title             text not null,
  body              text,
  audience          jsonb not null default '{"all": true}',
  publish_to_pulse  boolean not null default false,
  published_at      timestamptz,
  created_at        timestamptz not null default now()
);

-- ─── 8. institution_cohorts ────────────────────────────────────────────────
create table if not exists public.institution_cohorts (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  name            text not null,
  type            text check (type in ('skill','intervention','placement','domain','custom')),
  owner_staff_id  uuid references public.institution_staff(id),
  goal            jsonb not null default '{}',
  status          text not null default 'draft' check (status in ('draft','active','completed','archived')),
  start_date      date,
  end_date        date,
  created_at      timestamptz not null default now()
);

create table if not exists public.institution_cohort_members (
  cohort_id  uuid not null references public.institution_cohorts(id) on delete cascade,
  student_id uuid not null references public.institution_students(id) on delete cascade,
  primary key (cohort_id, student_id)
);

-- ─── 9. assessments / challenge_assignments / challenge_submissions ─────────
create table if not exists public.assessments (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid references public.institutions(id) on delete cascade,
  created_by      uuid not null references auth.users(id),
  title           text not null,
  description     text,
  type            text check (type in ('dsa','sql','aptitude','communication','project','custom')),
  difficulty      text check (difficulty in ('easy','medium','hard','expert')),
  submission_type text check (submission_type in ('code','file','text','link')),
  review_mode     text not null default 'auto' check (review_mode in ('auto','manual','peer')),
  target_audience jsonb not null default '{}',
  status          text not null default 'draft' check (status in ('draft','published','closed')),
  due_date        timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists public.challenge_assignments (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id    uuid not null references public.institution_students(id) on delete cascade,
  source        text not null check (source in ('institution','recruiter')),
  source_id     uuid,
  due_at        timestamptz,
  status        text not null default 'assigned'
                   check (status in ('assigned','in_progress','submitted','graded','expired')),
  created_at    timestamptz not null default now(),
  unique (assessment_id, student_id)
);

create table if not exists public.challenge_submissions (
  id                uuid primary key default gen_random_uuid(),
  assignment_id     uuid not null references public.challenge_assignments(id) on delete cascade,
  payload           jsonb not null,
  execution_result  jsonb,
  score             numeric,
  elo_delta         numeric,
  integrity_flags   jsonb not null default '[]',
  submitted_at      timestamptz not null default now(),
  graded_at         timestamptz
);

create index if not exists idx_challenge_assignments_student on public.challenge_assignments (student_id);
create index if not exists idx_challenge_submissions_assignment on public.challenge_submissions (assignment_id);

-- ─── 10. interviews / transcripts ────────────────────────────────────────────
create table if not exists public.interviews (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid references public.institutions(id),
  recruiter_id      uuid references auth.users(id),
  student_id        uuid not null references public.institution_students(id),
  mode              text not null check (mode in ('ai','human','hybrid')),
  scheduled_at      timestamptz,
  consent_given_at  timestamptz,
  status            text not null default 'scheduled'
                       check (status in ('scheduled','consent_pending','live','completed','cancelled')),
  recording_url     text,
  created_at        timestamptz not null default now(),
  -- Hard gate: a recording cannot be attached before consent is recorded.
  constraint interviews_consent_before_recording
    check (recording_url is null or consent_given_at is not null)
);

create table if not exists public.transcripts (
  id            uuid primary key default gen_random_uuid(),
  interview_id  uuid not null references public.interviews(id) on delete cascade,
  content       text,
  summary       jsonb,
  status        text not null default 'processing' check (status in ('processing','ready','failed')),
  generated_at  timestamptz
);

-- ─── 11. offers / institution_placements ─────────────────────────────────────
create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.institution_students(id),
  institution_id  uuid not null references public.institutions(id),
  recruiter_id    uuid references auth.users(id),
  company         text not null,
  role            text,
  ctc_lpa         numeric,
  offer_date      date,
  status          text not null default 'offered' check (status in ('offered','accepted','declined','rescinded')),
  created_at      timestamptz not null default now()
);

create table if not exists public.institution_placements (
  id                          uuid primary key default gen_random_uuid(),
  offer_id                    uuid references public.offers(id),
  student_id                  uuid not null references public.institution_students(id),
  institution_id              uuid not null references public.institutions(id),
  company                     text not null,
  role                        text,
  ctc_lpa                     numeric,
  joining_date                date,
  elo_at_placement            numeric,
  confirmation_status         text not null default 'unconfirmed'
                                 check (confirmation_status in ('unconfirmed','tpo_confirmed','disputed')),
  confirmed_by                uuid references auth.users(id),
  confirmed_at                timestamptz,
  visible_on_placement_wall   boolean not null default false,
  created_at                  timestamptz not null default now()
);

create index if not exists idx_placements_institution on public.institution_placements (institution_id, confirmation_status);
create index if not exists idx_placements_student      on public.institution_placements (student_id);

-- ─── 12. recruiter_invites / company_connections ─────────────────────────────
create table if not exists public.recruiter_invites (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id),
  recruiter_id    uuid not null references auth.users(id),
  student_id      uuid not null references public.institution_students(id),
  type            text check (type in ('profile_view','challenge','interview')),
  status          text not null default 'sent' check (status in ('sent','viewed','accepted','declined')),
  created_at      timestamptz not null default now()
);

create table if not exists public.company_connections (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id),
  recruiter_org_id  uuid not null,
  status            text not null default 'pending' check (status in ('pending','active','expired','revoked')),
  scope             jsonb not null default '{}',
  signed_at         timestamptz,
  created_at        timestamptz not null default now()
);

-- ─── 13. professional_profiles / epf_records / salary_updates ───────────────
create table if not exists public.professional_profiles (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null unique references auth.users(id),
  origin_institution_id    uuid references public.institutions(id),
  origin_placement_id      uuid references public.institution_placements(id),
  upgraded_at              timestamptz not null default now(),
  current_company          text,
  current_role             text
);

create table if not exists public.epf_records (
  id                        uuid primary key default gen_random_uuid(),
  professional_profile_id   uuid not null references public.professional_profiles(id) on delete cascade,
  uan                       text,
  verification_status       text not null default 'not_started'
                               check (verification_status in ('not_started','in_progress','verified','expired','failed')),
  verification_deadline     timestamptz,
  verified_at               timestamptz,
  source                    text check (source in ('epfo_api','digilocker','manual_document')),
  created_at                timestamptz not null default now()
);

create table if not exists public.salary_updates (
  id                        uuid primary key default gen_random_uuid(),
  professional_profile_id   uuid not null references public.professional_profiles(id) on delete cascade,
  amount_monthly            numeric,
  effective_from            date,
  verified                  boolean not null default false,
  source                    text,
  created_at                timestamptz not null default now()
);

-- ─── 14. elo_events — append-only ledger. THE ONLY writer of elo_current. ────
create table if not exists public.elo_events (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.institution_students(id) on delete cascade,
  source        text not null check (source in
                   ('arena_mission','institution_task','challenge_submission','interview','manual_admin_adjustment')),
  source_id     uuid,
  delta         numeric not null,
  elo_before    numeric not null,
  elo_after     numeric not null,
  created_by    text not null default 'system',
  reviewer_id   uuid references auth.users(id),  -- required (non-null) for manual_admin_adjustment, enforced below
  created_at    timestamptz not null default now(),
  constraint elo_events_manual_adjustment_needs_reviewer
    check (source <> 'manual_admin_adjustment' or reviewer_id is not null)
);

create index if not exists idx_elo_events_student on public.elo_events (student_id, created_at desc);

-- Trigger: keep institution_students.elo_current in sync with the ledger.
-- This is the ONLY code path allowed to write elo_current — no route, no MCP
-- tool, no trigger elsewhere should UPDATE institution_students.elo_current
-- directly. Client requests never carry an elo value; they carry the raw
-- submission, and a server-side grader computes delta before inserting here.
create or replace function public.apply_elo_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.institution_students
  set elo_current = new.elo_after
  where id = new.student_id;
  return new;
end;
$$;

drop trigger if exists trg_apply_elo_event on public.elo_events;
create trigger trg_apply_elo_event
  after insert on public.elo_events
  for each row execute function public.apply_elo_event();

-- ─── 15. activity_logs — immutable event/audit ledger ────────────────────────
create table if not exists public.activity_logs (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid references public.institutions(id),
  actor_id        uuid,
  action_code     text not null,
  entity_type     text,
  entity_id       uuid,
  severity        text not null default 'info' check (severity in ('info','warning','critical')),
  details         jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists idx_activity_logs_institution on public.activity_logs (institution_id, created_at desc);

-- Belt-and-suspenders: revoke UPDATE/DELETE from normal roles on the two
-- append-only ledgers so no application bug can rewrite history.
revoke update, delete on public.activity_logs from authenticated, anon;
revoke update, delete on public.elo_events     from authenticated, anon;

-- ============================================================================
-- 16. Role-resolution helper (mirrors org_member_role() for the canonical
--     schema — SECURITY DEFINER so RLS policies can read institution_staff)
-- ============================================================================
create or replace function public.institution_staff_role(p_institution uuid)
returns text language sql stable security definer set search_path = public as $$
  select role
  from public.institution_staff
  where institution_id = p_institution and user_id = auth.uid() and status = 'active'
  order by case role
    when 'college_admin' then 1 when 'placement_officer' then 2
    when 'dept_head' then 3 when 'professor' then 4 else 5 end
  limit 1
$$;

create or replace function public.is_institution_staff(p_institution uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.institution_staff
    where institution_id = p_institution and user_id = auth.uid() and status = 'active'
  ) or exists (
    select 1 from public.institutions
    where id = p_institution and admin_user_id = auth.uid()
  )
$$;

create or replace function public.is_institution_admin(p_institution uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.institution_staff
    where institution_id = p_institution and user_id = auth.uid()
      and status = 'active' and role in ('college_admin','placement_officer')
  ) or exists (
    select 1 from public.institutions
    where id = p_institution and admin_user_id = auth.uid()
  )
$$;

-- ============================================================================
-- 17. Row Level Security — enable + policies on every new table
-- ============================================================================
alter table public.institutions               enable row level security;
alter table public.institution_verification    enable row level security;
alter table public.institution_staff           enable row level security;
alter table public.departments                 enable row level security;
alter table public.batches                     enable row level security;
alter table public.sections                    enable row level security;
alter table public.institution_students        enable row level security;
alter table public.mentor_groups               enable row level security;
alter table public.mentor_group_members        enable row level security;
alter table public.notes                       enable row level security;
alter table public.announcements               enable row level security;
alter table public.institution_cohorts         enable row level security;
alter table public.institution_cohort_members  enable row level security;
alter table public.assessments                 enable row level security;
alter table public.challenge_assignments       enable row level security;
alter table public.challenge_submissions       enable row level security;
alter table public.interviews                  enable row level security;
alter table public.transcripts                 enable row level security;
alter table public.offers                      enable row level security;
alter table public.institution_placements      enable row level security;
alter table public.recruiter_invites           enable row level security;
alter table public.company_connections         enable row level security;
alter table public.professional_profiles       enable row level security;
alter table public.epf_records                 enable row level security;
alter table public.salary_updates              enable row level security;
alter table public.elo_events                  enable row level security;
alter table public.activity_logs               enable row level security;

-- institutions: staff of the institution can read; only college_admin/
-- placement_officer (or the original admin_user_id) can write.
drop policy if exists institutions_staff_read on public.institutions;
create policy institutions_staff_read on public.institutions
  for select using (public.is_institution_staff(id));

drop policy if exists institutions_admin_write on public.institutions;
create policy institutions_admin_write on public.institutions
  for update using (public.is_institution_admin(id));

drop policy if exists institutions_self_insert on public.institutions;
create policy institutions_self_insert on public.institutions
  for insert with check (admin_user_id = auth.uid());

-- institution_students: student reads own row; staff read all rows in their
-- institution; only admin-tier staff can write.
drop policy if exists inst_students_self_read on public.institution_students;
create policy inst_students_self_read on public.institution_students
  for select using (student_user_id = auth.uid());

drop policy if exists inst_students_staff_read on public.institution_students;
create policy inst_students_staff_read on public.institution_students
  for select using (public.is_institution_staff(institution_id));

drop policy if exists inst_students_admin_write on public.institution_students;
create policy inst_students_admin_write on public.institution_students
  for update using (public.is_institution_admin(institution_id));

-- elo_events: student reads their own ledger; staff read their institution's
-- ledger; NO client role may INSERT directly — all writes happen through the
-- service-role backend (server/lib), never through an authenticated user's
-- own Supabase session. This is what closes the "client-authored ELO" risk.
drop policy if exists elo_events_self_read on public.elo_events;
create policy elo_events_self_read on public.elo_events
  for select using (
    student_id in (select id from public.institution_students where student_user_id = auth.uid())
  );

drop policy if exists elo_events_staff_read on public.elo_events;
create policy elo_events_staff_read on public.elo_events
  for select using (
    student_id in (
      select id from public.institution_students
      where public.is_institution_staff(institution_id)
    )
  );
-- Intentionally no INSERT/UPDATE/DELETE policy for authenticated/anon —
-- only the service_role key (used exclusively by backend/server/lib/supabase.js)
-- bypasses RLS to write here.

-- activity_logs: staff of the institution can read; no client-role writes
-- (service_role only), matching elo_events.
drop policy if exists activity_logs_staff_read on public.activity_logs;
create policy activity_logs_staff_read on public.activity_logs
  for select using (public.is_institution_staff(institution_id));

-- institution_placements: student reads own; staff reads institution's; only
-- placement_officer/college_admin can confirm (enforced again at the app
-- layer in routes/college.js, per defense-in-depth).
drop policy if exists placements_self_read on public.institution_placements;
create policy placements_self_read on public.institution_placements
  for select using (
    student_id in (select id from public.institution_students where student_user_id = auth.uid())
  );

drop policy if exists placements_staff_read on public.institution_placements;
create policy placements_staff_read on public.institution_placements
  for select using (public.is_institution_staff(institution_id));

drop policy if exists placements_admin_write on public.institution_placements;
create policy placements_admin_write on public.institution_placements
  for update using (public.is_institution_admin(institution_id));

-- Generic staff-scoped read policies for the remaining operational tables.
drop policy if exists departments_staff_read on public.departments;
create policy departments_staff_read on public.departments
  for select using (public.is_institution_staff(institution_id));

drop policy if exists cohorts_staff_read on public.institution_cohorts;
create policy cohorts_staff_read on public.institution_cohorts
  for select using (public.is_institution_staff(institution_id));

drop policy if exists cohorts_staff_write on public.institution_cohorts;
create policy cohorts_staff_write on public.institution_cohorts
  for all using (public.is_institution_staff(institution_id));

drop policy if exists assessments_staff_read on public.assessments;
create policy assessments_staff_read on public.assessments
  for select using (institution_id is null or public.is_institution_staff(institution_id));

drop policy if exists assessments_staff_write on public.assessments;
create policy assessments_staff_write on public.assessments
  for all using (institution_id is not null and public.is_institution_staff(institution_id));

drop policy if exists challenge_assignments_self_read on public.challenge_assignments;
create policy challenge_assignments_self_read on public.challenge_assignments
  for select using (
    student_id in (select id from public.institution_students where student_user_id = auth.uid())
  );

drop policy if exists announcements_staff_read on public.announcements;
create policy announcements_staff_read on public.announcements
  for select using (public.is_institution_staff(institution_id));

drop policy if exists announcements_staff_write on public.announcements;
create policy announcements_staff_write on public.announcements
  for all using (public.is_institution_staff(institution_id));

-- ============================================================================
-- End of migration.
-- ============================================================================
