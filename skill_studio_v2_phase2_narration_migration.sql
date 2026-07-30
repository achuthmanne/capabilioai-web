-- Skill Studio V2 Phase 2a (2026-07-30) — narrated visual walkthrough.
-- Cache table mirrors module_revision_content's pattern exactly (public read,
-- service-role-only write, unique per module — one narration script shared
-- across every learner studying that module, same economics as the rest of
-- Skill Studio's content generation).
create table if not exists module_narration (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  script jsonb not null,
  generated_by text,
  created_at timestamptz not null default now(),
  unique (module_id)
);
alter table module_narration enable row level security;
do $$ begin
  create policy "module narration public read"
    on module_narration for select using (true);
exception when duplicate_object then null; end $$;
create index if not exists idx_module_narration_module on module_narration(module_id);

-- Storage bucket for cached per-segment TTS audio (Deepgram Aura-2 mp3s).
-- public:true (like profile-photos) rather than signed-URL private (like
-- vault-documents) — this is shared educational content, not per-user
-- private data, so a public bucket + getPublicUrl() keeps the client simple
-- and lets the browser cache the audio files natively.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('skill-studio-narration', 'skill-studio-narration', true, 8388608, array['audio/mpeg'])
on conflict (id) do nothing;
