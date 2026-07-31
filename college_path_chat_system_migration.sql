-- ============================================================================
-- Capabilio · College Path — In-House Chat System (Phase 5)
-- Applied to production via Supabase migration 20260731111150
-- (college_path_chat_system) on 2026-07-31.
-- Idempotent: safe to run multiple times.
--
-- In-house chat between college admin/placement-cell staff and, optionally,
-- a connected recruiter. Distinct from routes/chat.js, which is a generic
-- AI career-coach endpoint, not human-to-human messaging.
--
-- Design: one thread type distinguished by recruiter_id being null
-- (internal admin/placement-cell thread) or set (a specific recruiter's
-- thread with this institution's placement cell). Messages are append-only
-- — no update/delete route is built on top of this — so the message
-- history itself IS the audit trail; no separate audit_log duplication.
--
-- Writes are service-role-only (no client INSERT/UPDATE policy) — same
-- posture as company_connections/professional_profiles/companies elsewhere
-- in this schema: every write goes through the backend
-- (routes/collegeChat.js) so message-send can enforce "does this user
-- actually belong to this thread" as a real application-layer check, not
-- just an RLS predicate.
-- ============================================================================

create table if not exists public.institution_chat_threads (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  recruiter_id    uuid references auth.users(id),
  subject         text,
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists idx_chat_threads_institution on public.institution_chat_threads (institution_id);
create index if not exists idx_chat_threads_recruiter    on public.institution_chat_threads (recruiter_id);

create table if not exists public.institution_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.institution_chat_threads(id) on delete cascade,
  sender_id   uuid not null references auth.users(id),
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);

create index if not exists idx_chat_messages_thread on public.institution_chat_messages (thread_id, created_at);

alter table public.institution_chat_threads  enable row level security;
alter table public.institution_chat_messages enable row level security;

drop policy if exists chat_threads_staff_read on public.institution_chat_threads;
create policy chat_threads_staff_read on public.institution_chat_threads
  for select using (
    exists (
      select 1 from public.institutions i
      where i.id = institution_chat_threads.institution_id and i.admin_user_id = auth.uid()
    )
    or exists (
      select 1 from public.institution_staff s
      where s.institution_id = institution_chat_threads.institution_id
        and s.user_id = auth.uid() and s.status = 'active'
        and s.role in ('college_admin','placement_officer')
    )
    or institution_chat_threads.recruiter_id = auth.uid()
  );

drop policy if exists chat_messages_participant_read on public.institution_chat_messages;
create policy chat_messages_participant_read on public.institution_chat_messages
  for select using (
    exists (
      select 1 from public.institution_chat_threads t
      where t.id = institution_chat_messages.thread_id
        and (
          exists (select 1 from public.institutions i where i.id = t.institution_id and i.admin_user_id = auth.uid())
          or exists (
            select 1 from public.institution_staff s
            where s.institution_id = t.institution_id and s.user_id = auth.uid()
              and s.status = 'active' and s.role in ('college_admin','placement_officer')
          )
          or t.recruiter_id = auth.uid()
        )
    )
  );
