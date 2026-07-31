-- ============================================================================
-- Capabilio · College Path — Placement Cell Advanced Filters (Phase 2)
-- Applied to production via Supabase migration 20260731104907
-- (college_path_placement_cell_filters) on 2026-07-31.
-- Idempotent: safe to run multiple times.
--
-- WHY: the placement-cell roster needs a per-student "shared with
-- recruiters" flag so admins can control who is visible to the Recruiter
-- Discovery search (Phase 3) and Talent Network, independent of the
-- student's institution_students.status. Additive-only, defaults true so
-- every existing row behaves exactly as it did before this migration.
-- ============================================================================

alter table public.institution_students
  add column if not exists shared_with_recruiters boolean not null default true;

create index if not exists idx_inst_students_shared
  on public.institution_students (institution_id, shared_with_recruiters);
