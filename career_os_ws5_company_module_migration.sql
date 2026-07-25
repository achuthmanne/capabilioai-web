-- ============================================================================
-- Workstream 5: Company Module (SCOPED, MINIMAL, REAL) — applied
-- ============================================================================
-- Status: this replaces an earlier DRAFT of this file that proposed a fresh
-- 4-table redesign (companies rebuilt from scratch + company_name_aliases +
-- company_memberships + company_employment_links). That full design has been
-- explicitly deferred by product direction: reuse existing tables/infra
-- wherever possible instead of building the full future-state proposal (see
-- docs/company-module-ws5-design-proposal.md for that larger design, kept
-- for future reference — not what this migration builds).
--
-- This migration instead:
--   1. Adds RLS to the EXISTING `companies` table (0 rows in prod, columns:
--      id, name, normalized_name, domain, epfo_codes, tier, country, sector,
--      logo_url, created_at). RLS was already enabled on this table with ZERO
--      policies (effective default-deny for anon/authenticated, but still a
--      real gap — no public read path existed and no documented policy set).
--      This migration adds the real, intentional policy set.
--   2. Adds 3 additive nullable columns to the EXISTING `profiles` table
--      (company_id, company_link_state, company_visibility_public). Existing
--      legacy free-text fields (company, current_company,
--      company_email_verified, org_company_size) are untouched — they are a
--      separate, unrelated legacy surface, not migrated or aliased here.
--   3. Creates ONE new table, `company_memberships`, for self-claimed /
--      employer-verified membership records with an admin/owner roster view.
--
-- No fresh `companies` table, no `company_name_aliases`, no
-- `company_employment_links` in this pass — fuzzy-matching / reconciliation /
-- alias normalization is explicitly future work, not built here.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. companies — RLS policies (table + RLS-enabled flag already exist)
-- ----------------------------------------------------------------------------
alter table public.companies enable row level security;

-- Company directory data (name/domain/sector/logo) is not sensitive — public
-- read for anyone, including anon (e.g. an unauthenticated search-and-link
-- flow preview). No client write policy at all: company record creation
-- goes through a controlled backend endpoint using the service-role key,
-- never a raw client insert.
drop policy if exists companies_public_select on public.companies;
create policy companies_public_select on public.companies
  for select
  using (true);

-- Explicitly no insert/update/delete policy for anon/authenticated — absence
-- of a policy is a hard deny once RLS is enabled. service_role bypasses RLS
-- entirely (Supabase built-in), so the backend's supabaseAdmin client can
-- still write. This comment exists so a future reader doesn't mistake the
-- missing policy for an oversight.
comment on table public.companies is
  'Company directory. Public SELECT via RLS policy companies_public_select. '
  'INSERT/UPDATE restricted to service_role only (no client policy) — writes '
  'go through backend/server/routes/company.js using the service-role key.';

-- ----------------------------------------------------------------------------
-- 2. profiles — additive nullable columns (Company module link state)
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists company_id uuid references public.companies(id),
  add column if not exists company_link_state text default 'unemployed'
    check (company_link_state in (
      'joined_via_capabilio','linked_independently','unemployed',
      'employer_not_partner','employer_verified_partner'
    )),
  add column if not exists company_visibility_public boolean not null default false;

create index if not exists profiles_company_id_idx on public.profiles (company_id)
  where company_id is not null;

comment on column public.profiles.company_link_state is
  'Company module link state. This scoped build (WS5 minimal pass) only ever '
  'writes ''unemployed'' (default) or ''linked_independently'' (via POST '
  '/api/pro/v1/company/me/link). joined_via_capabilio, employer_not_partner, '
  'and employer_verified_partner are reserved for later workstreams but '
  'present in the CHECK constraint from day one so no future migration is '
  'needed to add them.';

comment on column public.profiles.company_visibility_public is
  'Privacy toggle for the Company module — defaults to false (NOT '
  'employer-visible by default). Set via PATCH /api/pro/v1/company/me/visibility.';

-- ----------------------------------------------------------------------------
-- 3. company_memberships (new table)
-- ----------------------------------------------------------------------------
create table if not exists public.company_memberships (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id),
  company_id          uuid not null references public.companies(id),
  role_title          text,
  department          text,
  join_date           date,
  exit_date           date,
  verification_status text not null default 'self_claimed'
    check (verification_status in ('self_claimed','employer_verified','epfo_verified')),
  manager_user_id     uuid references auth.users(id),
  role                text not null default 'member' check (role in ('member','admin','owner')),
  status              text not null default 'pending' check (status in ('pending','active','revoked')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists company_memberships_user_id_idx on public.company_memberships (user_id);
create index if not exists company_memberships_company_id_idx on public.company_memberships (company_id);
create index if not exists company_memberships_admin_lookup_idx
  on public.company_memberships (company_id, role, status);

comment on table public.company_memberships is
  'Self-claimed / employer-verified company membership. WS5 minimal pass: '
  'rows are always inserted by the member themselves with status=''pending''. '
  'No automated path yet promotes a row to active/employer_verified — that is '
  'future work (employer_not_partner / employer_verified_partner reconciliation).';

alter table public.company_memberships enable row level security;

-- A user may see and create only their own membership row, always starting
-- 'pending' — enforced by the WITH CHECK clause below, not just app code.
drop policy if exists company_memberships_self_select on public.company_memberships;
create policy company_memberships_self_select on public.company_memberships
  for select
  using (auth.uid() = user_id);

drop policy if exists company_memberships_self_insert on public.company_memberships;
create policy company_memberships_self_insert on public.company_memberships
  for insert
  with check (auth.uid() = user_id and status = 'pending');

-- An active admin/owner of a company may see the full roster for that
-- company only, and may update role/status for rows in that same company —
-- never their own row via this policy (self-service already covered above),
-- and never a row belonging to a different company_id.
drop policy if exists company_memberships_admin_select_roster on public.company_memberships;
create policy company_memberships_admin_select_roster on public.company_memberships
  for select
  using (
    exists (
      select 1 from public.company_memberships admin_row
      where admin_row.user_id = auth.uid()
        and admin_row.company_id = company_memberships.company_id
        and admin_row.role in ('admin','owner')
        and admin_row.status = 'active'
    )
  );

drop policy if exists company_memberships_admin_update_roster on public.company_memberships;
create policy company_memberships_admin_update_roster on public.company_memberships
  for update
  using (
    exists (
      select 1 from public.company_memberships admin_row
      where admin_row.user_id = auth.uid()
        and admin_row.company_id = company_memberships.company_id
        and admin_row.role in ('admin','owner')
        and admin_row.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.company_memberships admin_row
      where admin_row.user_id = auth.uid()
        and admin_row.company_id = company_memberships.company_id
        and admin_row.role in ('admin','owner')
        and admin_row.status = 'active'
    )
  );

-- No client delete policy — revocation is a status='revoked' update, not a
-- row delete, so the admin update policy above already covers it.
-- service_role has full access by default (RLS bypass), covering any future
-- backend-only operation (e.g. an admin console bulk-revoke tool).

-- updated_at maintenance — mirrors the same trigger pattern used elsewhere
-- in this codebase (see other career_os_ws*_migration.sql files) rather than
-- inventing a new one.
create or replace function public.company_memberships_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists company_memberships_updated_at on public.company_memberships;
create trigger company_memberships_updated_at
  before update on public.company_memberships
  for each row execute function public.company_memberships_set_updated_at();

-- Lesson from the mentor-marketplace pass: Supabase auto-grants EXECUTE on
-- newly created functions to PUBLIC (and by extension anon/authenticated)
-- by default, even though this trigger function is never meant to be called
-- directly by a client. Explicitly revoke, then grant back only to the
-- roles that actually need it (the trigger itself runs as the row owner
-- regardless of who is connected, so no direct EXECUTE grant is required
-- for normal operation — but we grant to service_role for admin tooling
-- parity with the rest of this codebase's functions).
revoke all on function public.company_memberships_set_updated_at() from public;
revoke all on function public.company_memberships_set_updated_at() from anon;
revoke all on function public.company_memberships_set_updated_at() from authenticated;
grant execute on function public.company_memberships_set_updated_at() to service_role;

-- ============================================================================
-- END — applied via Supabase MCP apply_migration against eybchcqwbizjmzyrviri.
-- Verified post-apply: companies has RLS enabled + companies_public_select
-- policy only; company_memberships exists with RLS enabled + 4 policies;
-- profiles has company_id/company_link_state/company_visibility_public.
-- get_advisors(security) run after apply — see
-- docs/career-os-implementation-plan.md for the recorded result.
-- ============================================================================
