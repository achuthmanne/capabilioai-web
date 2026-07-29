-- 2026-07-29_skill_studio_v2.sql
--
-- Skill Studio V2 — persistence layer for the "skill journey" redesign
-- (docs/skill-studio-v2-production-spec-2026-07-29.md).
--
-- Additive only. Nothing here alters an existing column's type or drops
-- anything. The one change to a pre-existing table (proof_objects) only
-- widens a CHECK constraint's allowed value set — every existing row keeps
-- validating, no existing query's result set changes.
--
-- Verified against the LIVE schema (via Supabase MCP execute_sql) before
-- writing this file, not assumed from repo state, because proof_objects and
-- user_skills were both created directly against Supabase with no tracked
-- migration (same untracked-schema pattern already flagged in memory for
-- `institutions` — see docs referenced there). Confirmed live:
--   * user_skills.user_id  references profiles(id) on delete cascade
--   * proof_objects.user_id references profiles(id) on delete cascade
--   * proof_objects_source_check currently allows only
--     ('arena_v1','arena_v2','manual')
--   * av2_challenge_instances exists (Arena V2's own instance table) — used
--     as the FK target for arena_handoffs.arena_instance_id
-- So every new table below FKs user_id -> profiles(id) on delete cascade,
-- matching the two tables Skill Studio V2 joins against most.

-- ── 1. Catalog layer (shared, versioned — NOT per-user) ─────────────────────
create table if not exists skill_graph_nodes (
  id          uuid primary key default gen_random_uuid(),
  node_type   text not null check (node_type in ('skill','concept')),
  slug        text not null,
  label       text not null,
  domain_key  text,                -- arenaDomains.js / roleConfig.js key
  metadata    jsonb not null default '{}'::jsonb,   -- job/salary relevance, default difficulty, etc.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (node_type, slug)
);
create index if not exists idx_skill_graph_nodes_domain on skill_graph_nodes(domain_key);

create table if not exists skill_graph_edges (
  id            uuid primary key default gen_random_uuid(),
  from_node_id  uuid not null references skill_graph_nodes(id) on delete cascade,
  to_node_id    uuid not null references skill_graph_nodes(id) on delete cascade,
  edge_type     text not null check (edge_type in (
                  'PREREQUISITE_OF','REQUIRES','REINFORCES','VALIDATES',
                  'PRODUCES_EVIDENCE','UNLOCKS','PREPARES_FOR','RELATED_TO',
                  'WEAKENS','RECOVERS','RECOMMENDS_NEXT'
                )),
  weight        numeric not null default 1.0,
  threshold     numeric,             -- used by PREREQUISITE_OF gating (default level_score gate = 60 in app code)
  created_at    timestamptz not null default now(),
  unique (from_node_id, to_node_id, edge_type)
);
create index if not exists idx_skill_graph_edges_from on skill_graph_edges(from_node_id, edge_type);
create index if not exists idx_skill_graph_edges_to   on skill_graph_edges(to_node_id, edge_type);

-- ── 2. Per-user journey/module layer ────────────────────────────────────────
create table if not exists skill_journeys (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles(id) on delete cascade,
  skill_graph_node_id   uuid not null references skill_graph_nodes(id) on delete restrict,
  target_role           text,
  status                text not null default 'active' check (status in ('active','completed','archived')),
  priority_rank         integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, skill_graph_node_id, status) deferrable initially deferred
);
create index if not exists idx_skill_journeys_user_status on skill_journeys(user_id, status);

create table if not exists modules (
  id                  uuid primary key default gen_random_uuid(),
  skill_journey_id    uuid references skill_journeys(id) on delete set null,
  skill_graph_node_id uuid not null references skill_graph_nodes(id) on delete restrict,
  teaching_mode       text not null default 'intermediate',
  level               text not null default 'intermediate' check (level in ('beginner','intermediate','advanced')),
  content_cache_key   text not null,   -- hash of (skill_slug, level, teaching_mode) — real sticky-cache key
  version             integer not null default 1,
  created_at          timestamptz not null default now(),
  unique (content_cache_key, version)
);
create index if not exists idx_modules_journey on modules(skill_journey_id);
create index if not exists idx_modules_cache_key on modules(content_cache_key);

create table if not exists module_content_blocks (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references modules(id) on delete cascade,
  block_type       text not null check (block_type in (
                     'overview','ai_explanation','visual','playground_config',
                     'example','cheat_sheet','summary','common_mistakes'
                   )),
  ordinal          integer not null default 0,
  content          jsonb not null default '{}'::jsonb,
  generated_by     text,             -- 'gemini' | 'groq' | 'claude' | 'human'
  source_citations jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists idx_module_content_blocks_module on module_content_blocks(module_id, ordinal);

create table if not exists module_state (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  module_id         uuid not null references modules(id) on delete cascade,
  status            text not null default 'draft' check (status in ('draft','in_progress','completed')),
  playground_state  jsonb not null default '{}'::jsonb,
  started_at        timestamptz,
  completed_at      timestamptz,
  updated_at        timestamptz not null default now(),
  unique (user_id, module_id)
);
create index if not exists idx_module_state_user on module_state(user_id, status);

create table if not exists practice_tasks (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  skill_graph_node_id uuid not null references skill_graph_nodes(id) on delete cascade,
  task_payload        jsonb not null default '{}'::jsonb,
  difficulty          text,
  completed_at        timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists idx_practice_tasks_user on practice_tasks(user_id, skill_graph_node_id);

-- ── 3. Assessment layer ─────────────────────────────────────────────────────
create table if not exists quiz_questions (
  id                  uuid primary key default gen_random_uuid(),
  module_id           uuid references modules(id) on delete cascade,   -- nullable: practice/revision-only questions
  skill_graph_node_id uuid not null references skill_graph_nodes(id) on delete cascade,
  question_type       text not null check (question_type in (
                        'mcq','fill_blank','scenario','debugging','coding',
                        'architecture','business_judgment','voice','image','simulation','case_study'
                      )),
  payload             jsonb not null default '{}'::jsonb,   -- prompt, options, rubric, answer key
  difficulty          text not null default 'intermediate',
  generated_by        text,
  created_at          timestamptz not null default now()
);
create index if not exists idx_quiz_questions_node on quiz_questions(skill_graph_node_id, difficulty);

create table if not exists quiz_attempts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  session_id          uuid not null,
  quiz_question_id    uuid not null references quiz_questions(id) on delete cascade,
  answer              jsonb,
  correct             boolean,
  confidence_reported numeric,
  hint_used           boolean not null default false,
  response_ms         integer,
  created_at          timestamptz not null default now()
);
create index if not exists idx_quiz_attempts_user_session on quiz_attempts(user_id, session_id);
create index if not exists idx_quiz_attempts_question on quiz_attempts(quiz_question_id);

-- ── 4. Memory / decay layer ──────────────────────────────────────────────────
create table if not exists memory_states (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  skill_graph_node_id uuid not null references skill_graph_nodes(id) on delete cascade,
  confidence          numeric not null default 0.5 check (confidence >= 0 and confidence <= 1),
  ease_factor         numeric not null default 2.5,
  review_count        integer not null default 0,
  last_reinforced_at  timestamptz,
  next_review_due_at  timestamptz,
  updated_at          timestamptz not null default now(),
  unique (user_id, skill_graph_node_id)
);
create index if not exists idx_memory_states_due on memory_states(user_id, next_review_due_at);

create table if not exists decay_events (
  id               uuid primary key default gen_random_uuid(),
  memory_state_id  uuid not null references memory_states(id) on delete cascade,
  from_band        text,
  to_band          text,
  occurred_at      timestamptz not null default now()
);
create index if not exists idx_decay_events_state on decay_events(memory_state_id, occurred_at);

create table if not exists mistake_patterns (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  skill_graph_node_id uuid not null references skill_graph_nodes(id) on delete cascade,
  pattern_key         text not null,
  severity            integer not null default 1 check (severity between 1 and 5),
  source              text not null check (source in ('quiz','practice','arena','interview')),
  first_seen_at       timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),
  occurrence_count    integer not null default 1,
  unique (user_id, skill_graph_node_id, pattern_key)
);
create index if not exists idx_mistake_patterns_user on mistake_patterns(user_id, skill_graph_node_id);

-- ── 5. Arena / interview bridge (thin — Arena V2 owns its own pipeline) ─────
create table if not exists arena_handoffs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  skill_journey_id    uuid not null references skill_journeys(id) on delete cascade,
  arena_instance_id   uuid references av2_challenge_instances(id) on delete set null,
  requested_at        timestamptz not null default now(),
  result_ingested_at  timestamptz
);
create index if not exists idx_arena_handoffs_user on arena_handoffs(user_id, skill_journey_id);

create table if not exists interview_sessions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references profiles(id) on delete cascade,
  module_id              uuid references modules(id) on delete set null,
  mode                   text not null default 'technical',
  questions              jsonb not null default '[]'::jsonb,
  answers                jsonb not null default '[]'::jsonb,
  scores                 jsonb not null default '{}'::jsonb,
  evidence_artifact_id   uuid,   -- references proof_objects(id); no FK (proof_objects is service-role-only, cross-schema timing)
  created_at             timestamptz not null default now(),
  completed_at           timestamptz
);
create index if not exists idx_interview_sessions_user on interview_sessions(user_id);

-- ── 6. Pulse export ──────────────────────────────────────────────────────────
create table if not exists pulse_exports (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  proof_object_id  uuid not null,   -- references proof_objects(id); see interview_sessions note above
  draft_content    jsonb not null default '{}'::jsonb,
  published        boolean not null default false,
  consent_at       timestamptz,     -- required non-null before publish when authored by a third party (mentor)
  created_at       timestamptz not null default now()
);
create index if not exists idx_pulse_exports_user on pulse_exports(user_id);

-- ── 7. Recommendation / mastery snapshots ───────────────────────────────────
create table if not exists recommendation_snapshots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  recommendations jsonb not null default '[]'::jsonb,
  generated_at    timestamptz not null default now(),
  expires_at      timestamptz
);
create index if not exists idx_recommendation_snapshots_user on recommendation_snapshots(user_id, generated_at desc);

create table if not exists mastery_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  skill_graph_node_id uuid not null references skill_graph_nodes(id) on delete cascade,
  level_score         numeric,
  confidence          numeric,
  taken_at            timestamptz not null default now()
);
create index if not exists idx_mastery_snapshots_user_node on mastery_snapshots(user_id, skill_graph_node_id, taken_at);

-- ── 8. Append-only event log ─────────────────────────────────────────────────
-- IMPORTANT: `learning_events` already exists live in Supabase (untracked —
-- same pre-existing-schema-fork pattern already seen with `institutions` and
-- the old `skill_graph` attempt) with shape (id, user_id, event_type,
-- skill_id, module_id, score, elo_delta, metadata jsonb, created_at) and RLS
-- already enabled. Confirmed via live introspection before writing this
-- migration — NOT recreated here, NOT altered. eventLogger.js (application
-- code) targets this real shape directly: event_type + skill_id (=
-- skill_graph_node_id) + module_id + metadata (jsonb payload) + created_at.
-- Only addition: an owner-read policy, since none existed (RLS was enabled
-- with zero policies, i.e. default-deny for anon/authenticated clients;
-- service-role writes from the backend already bypass RLS regardless).
drop policy if exists "own learning events" on learning_events;
create policy "own learning events" on learning_events for select using (auth.uid() = user_id);
create index if not exists idx_learning_events_user_type on learning_events(user_id, event_type, created_at);

-- ── 9. Widen proof_objects.source (the ONE existing-table change) ──────────
-- Additive: existing rows ('arena_v1'|'arena_v2'|'manual') keep validating.
-- New values let Skill Studio module/interview completions write proof
-- objects through the SAME table/builder pattern Arena V2 already uses,
-- instead of a second evidence table.
alter table proof_objects drop constraint if exists proof_objects_source_check;
alter table proof_objects add constraint proof_objects_source_check
  check (source = ANY (ARRAY['arena_v1','arena_v2','manual','skill_studio','skill_studio_interview']));

alter table proof_objects add column if not exists source_context jsonb not null default '{}'::jsonb;
comment on column proof_objects.source_context is
  'Skill Studio V2: links module_state.id / interview_sessions.id when this proof object originated from a Skill Studio handoff or interview session, so the evidence trail can show "practiced here, proven there." Empty for all pre-existing arena_v1/arena_v2/manual rows.';

-- ── 10. Row Level Security ───────────────────────────────────────────────────
-- Catalog tables are shared read-only content — public read, no client write
-- (only service-role writes, via catalogSync.js / content-ops approval).
alter table skill_graph_nodes enable row level security;
drop policy if exists "skill graph nodes public read" on skill_graph_nodes;
create policy "skill graph nodes public read" on skill_graph_nodes for select using (true);

alter table skill_graph_edges enable row level security;
drop policy if exists "skill graph edges public read" on skill_graph_edges;
create policy "skill graph edges public read" on skill_graph_edges for select using (true);

alter table modules enable row level security;
drop policy if exists "modules public read" on modules;
create policy "modules public read" on modules for select using (true);

alter table module_content_blocks enable row level security;
drop policy if exists "module content blocks public read" on module_content_blocks;
create policy "module content blocks public read" on module_content_blocks for select using (true);

alter table quiz_questions enable row level security;
drop policy if exists "quiz questions public read" on quiz_questions;
create policy "quiz questions public read" on quiz_questions for select using (true);

-- Per-user tables — owner-scoped, standard pattern already used by user_skills.
alter table skill_journeys enable row level security;
drop policy if exists "own journeys" on skill_journeys;
create policy "own journeys" on skill_journeys for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table module_state enable row level security;
drop policy if exists "own module state" on module_state;
create policy "own module state" on module_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table practice_tasks enable row level security;
drop policy if exists "own practice tasks" on practice_tasks;
create policy "own practice tasks" on practice_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table quiz_attempts enable row level security;
drop policy if exists "own quiz attempts" on quiz_attempts;
create policy "own quiz attempts" on quiz_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table memory_states enable row level security;
drop policy if exists "own memory states" on memory_states;
create policy "own memory states" on memory_states for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table decay_events enable row level security;
drop policy if exists "own decay events" on decay_events;
create policy "own decay events" on decay_events for select using (
  exists (select 1 from memory_states m where m.id = decay_events.memory_state_id and m.user_id = auth.uid())
);

alter table mistake_patterns enable row level security;
drop policy if exists "own mistake patterns" on mistake_patterns;
create policy "own mistake patterns" on mistake_patterns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table arena_handoffs enable row level security;
drop policy if exists "own arena handoffs" on arena_handoffs;
create policy "own arena handoffs" on arena_handoffs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table interview_sessions enable row level security;
drop policy if exists "own interview sessions" on interview_sessions;
create policy "own interview sessions" on interview_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table pulse_exports enable row level security;
drop policy if exists "own pulse exports" on pulse_exports;
create policy "own pulse exports" on pulse_exports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table recommendation_snapshots enable row level security;
drop policy if exists "own recommendation snapshots" on recommendation_snapshots;
create policy "own recommendation snapshots" on recommendation_snapshots for select using (auth.uid() = user_id);

alter table mastery_snapshots enable row level security;
drop policy if exists "own mastery snapshots" on mastery_snapshots;
create policy "own mastery snapshots" on mastery_snapshots for select using (auth.uid() = user_id);

-- learning_events RLS policy is applied in section 8 above (pre-existing table).

-- All per-user mutating tables above are written server-side via
-- supabaseAdmin (service role bypasses RLS) from backend/server/lib/skillStudio/*,
-- exactly like proof_objects/user_skills already are — the "all using
-- auth.uid()" policies exist so a client-side Supabase call (if ever added)
-- is safe by default, not because the client is expected to write directly.
