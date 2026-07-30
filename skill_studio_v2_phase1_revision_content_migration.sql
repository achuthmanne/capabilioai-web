-- Skill Studio Phase 1 (2026-07-30) — revision content cache.
-- Applied live via Supabase MCP (migration name:
-- skill_studio_v2_phase1_revision_content). Saved here for repo history,
-- matching this project's existing *_migration.sql convention.
--
-- Same trust pattern as modules/module_content_blocks/quiz_questions:
-- public SELECT (shared cache, read by any authenticated learner), writes
-- only via service_role (backend uses supabaseAdmin, never the browser
-- client) — no INSERT/UPDATE policy for anon/authenticated at all.
create table if not exists module_revision_content (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  content_type text not null default 'revision_bundle'
    check (content_type in ('revision_bundle','flashcard','cheat_sheet','mindmap','interview_qs')),
  content jsonb not null,
  generated_by text,
  created_at timestamptz not null default now(),
  unique (module_id, content_type)
);

alter table module_revision_content enable row level security;

do $$ begin
  create policy "module revision content public read"
    on module_revision_content for select using (true);
exception when duplicate_object then null; end $$;

create index if not exists idx_module_revision_content_module on module_revision_content(module_id);
