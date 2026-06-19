-- ============================================================================
-- Capabilio · Institution OS — operational schema + RLS
-- Phase 1 of the live Institution Path redesign.
--
-- Conventions (match existing org_* tables):
--   • An institution == a profiles row; org_id = the admin's auth user id.
--   • RLS: institution owner (auth.uid() = org_id) gets full access.
--   • Scoped staff (professor / placement_cell / dept_head / mentor) get
--     read access to operational tables via the org_member_role() helper.
--   • 7-role model lives in org_members.role:
--       institution_admin | placement_cell | professor | mentor
--       | dept_head | recruiter | student
--
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ─── Role helper functions (SECURITY DEFINER so policies can read org_members) ─
create or replace function public.org_member_role(p_org uuid)
returns text language sql stable security definer set search_path = public as $$
  select role
  from public.org_members
  where org_id = p_org and user_id = auth.uid() and status = 'active'
  limit 1
$$;

create or replace function public.is_org_staff(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org and user_id = auth.uid() and status = 'active'
      and role in ('placement_cell','professor','mentor','dept_head')
  )
$$;

-- ─── 1. Departments (master data) ────────────────────────────────────────────
create table if not exists public.org_departments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  code        text not null,
  name        text,
  students    integer default 0,
  faculty     integer default 0,
  avg_elo     integer,
  created_at  timestamptz default now()
);

-- ─── 2. Groups (subject / cohort / prep / mentorship / remedial) ─────────────
create table if not exists public.org_groups (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  name          text not null,
  type          text default 'subject',
  owner_id      uuid,
  owner_name    text,
  member_count  integer default 0,
  description   text,
  created_at    timestamptz default now()
);

-- ─── 3. At-risk student cases ────────────────────────────────────────────────
create table if not exists public.org_cases (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  member_id     uuid,
  student_name  text,
  branch        text,
  reason        text,
  stage         text default 'Open',     -- Open|Investigating|Intervention|Monitoring|Closed
  owner_id      uuid,
  owner_name    text,
  sla           text,
  severity      text default 'High',     -- High|Med|Low
  outcome       text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── 4. Workflow queue (approvals / overrides / access / cases) ───────────────
create table if not exists public.org_workflow_queue (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  item        text not null,
  type        text,                      -- Approval|Override|Access|Document|Case
  owner_id    uuid,
  owner_name  text,
  sla         text,
  sla_state   text default 'ok',         -- ok|soon|breach
  state       text default 'New',        -- New|In Review|Escalated|Resolved
  priority    text default 'Med',        -- High|Med|Low
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── 5. Document approval chains ─────────────────────────────────────────────
create table if not exists public.org_doc_approvals (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null,
  title              text not null,
  submitted_by       uuid,
  submitted_by_name  text,
  steps              jsonb default '[]'::jsonb,  -- ordered approver labels
  current_step       integer default 0,
  status             text default 'Pending',     -- Pending|Approved|Rejected
  doc_url            text,
  created_at         timestamptz default now()
);

-- ─── 6. Approval routing rules ───────────────────────────────────────────────
create table if not exists public.org_routing_rules (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  condition   text not null,
  chain       jsonb default '[]'::jsonb,  -- ordered approver chain
  enabled     boolean default true,
  created_at  timestamptz default now()
);

-- ─── 7. Escalation policies ──────────────────────────────────────────────────
create table if not exists public.org_escalation_policies (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  trigger       text not null,
  sla           text,
  escalate_to   text,
  remind        text,
  reassign      text,
  enabled       boolean default true,
  created_at    timestamptz default now()
);

-- ─── 8. Permission grant matrix (action × role) ──────────────────────────────
create table if not exists public.org_permission_grants (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  action      text not null,            -- e.g. "Students · Approve"
  role        text not null,            -- placement_cell | professor | ...
  level       integer default 0,        -- 0 none | 1 full | 2 own-only
  created_at  timestamptz default now(),
  unique (org_id, action, role)
);

-- ─── 9. Recruiter NDA / access agreements ────────────────────────────────────
create table if not exists public.org_recruiter_ndas (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null,
  recruiter_name      text not null,
  recruiter_user_id   uuid,
  status              text default 'Pending',  -- Pending|Signed|Expired
  scope               text,
  signed_at           timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz default now()
);

-- ─── Indexes (org_id is the hot path on every table) ─────────────────────────
create index if not exists idx_org_departments_org on public.org_departments(org_id);
create index if not exists idx_org_groups_org       on public.org_groups(org_id);
create index if not exists idx_org_cases_org        on public.org_cases(org_id);
create index if not exists idx_org_queue_org        on public.org_workflow_queue(org_id);
create index if not exists idx_org_docs_org         on public.org_doc_approvals(org_id);
create index if not exists idx_org_routing_org      on public.org_routing_rules(org_id);
create index if not exists idx_org_escal_org        on public.org_escalation_policies(org_id);
create index if not exists idx_org_perms_org        on public.org_permission_grants(org_id);
create index if not exists idx_org_ndas_org         on public.org_recruiter_ndas(org_id);

-- ─── Enable RLS on all new tables ────────────────────────────────────────────
alter table public.org_departments        enable row level security;
alter table public.org_groups             enable row level security;
alter table public.org_cases              enable row level security;
alter table public.org_workflow_queue     enable row level security;
alter table public.org_doc_approvals      enable row level security;
alter table public.org_routing_rules      enable row level security;
alter table public.org_escalation_policies enable row level security;
alter table public.org_permission_grants  enable row level security;
alter table public.org_recruiter_ndas     enable row level security;

-- ─── Policies: owner full access (auth.uid() = org_id) on every table ─────────
do $$
declare t text;
begin
  foreach t in array array[
    'org_departments','org_groups','org_cases','org_workflow_queue',
    'org_doc_approvals','org_routing_rules','org_escalation_policies',
    'org_permission_grants','org_recruiter_ndas'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t||'_owner', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (org_id = auth.uid()) with check (org_id = auth.uid())',
      t||'_owner', t);
  end loop;
end $$;

-- ─── Policies: scoped staff read on operational tables ───────────────────────
-- (professor / placement_cell / dept_head / mentor may SELECT; writes stay owner-only
--  until role-specific write rules are added in a later phase.)
do $$
declare t text;
begin
  foreach t in array array[
    'org_groups','org_cases','org_workflow_queue','org_doc_approvals'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t||'_staff_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_org_staff(org_id))',
      t||'_staff_read', t);
  end loop;
end $$;

-- ============================================================================
-- NOTE: pre-existing table public.problems has RLS DISABLED (flagged by the
-- Supabase advisor). This migration does NOT change it. Decide separately
-- whether to: ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY; + add a
-- read policy (it is reference data, 298 rows).
-- ============================================================================
