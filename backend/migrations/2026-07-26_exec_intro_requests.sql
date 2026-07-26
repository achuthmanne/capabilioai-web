-- 2026-07-26_exec_intro_requests.sql
--
-- Executive Path — real warm-introduction request system.
-- Replaces the honest-but-unbuilt "Introductions" tab EmptyState in
-- ExecutiveNetwork.jsx (previously: "needs a dedicated table to track who's
-- introducing whom — not built yet"). This IS that table.
--
-- Distinct from the existing `connections` table (generic connect/accept —
-- already real, powers Peer Circles + ExecutiveHome's pending-requests card):
-- an intro request carries an explicit REASON (why you want to reach this
-- person) so both sides know what the ask is before accepting, matching the
-- "structured, not noisy" principle for the Executive path.
--
-- Additive only. RLS enabled on creation per project standard.

create table if not exists exec_intro_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  target_id uuid not null references profiles(id) on delete cascade,
  reason text not null check (reason in ('funding','mentorship','partnership','hiring','customer','other')),
  message text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  constraint exec_intro_requests_no_self check (requester_id <> target_id)
);

create index if not exists idx_exec_intro_requests_target_pending
  on exec_intro_requests(target_id, status, created_at desc);
create index if not exists idx_exec_intro_requests_requester
  on exec_intro_requests(requester_id, created_at desc);

alter table exec_intro_requests enable row level security;

-- Server-side (service_role) writes and reads only, same pattern as
-- `connections`/`notifications` elsewhere in this codebase — all access goes
-- through requireAuth-gated Express routes (backend/server/routes/execIntros.js),
-- never directly from the browser. RLS still enabled as defense-in-depth in
-- case a future client-side query path is ever added.
create policy exec_intro_requests_service_role_all
  on exec_intro_requests for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table exec_intro_requests is
  'Executive Path warm-introduction requests — requester asks target for an intro/conversation with an explicit reason. See backend/server/routes/execIntros.js.';
