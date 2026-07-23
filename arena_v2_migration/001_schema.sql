-- ══════════════════════════════════════════════════════════════════════════════
-- CAPABILIO ARENA V2 — MILESTONE 1: DATABASE SCHEMA
-- Spec: arena_v2_blueprint.md (FROZEN v1.1) + arena_content_spec/ (10 packages)
-- Run once in Supabase SQL Editor (safe to re-run — all IF NOT EXISTS / guarded)
--
-- NAMING: every new table is prefixed `av2_` to guarantee zero collision with
-- legacy Arena V1 tables (`challenges`, `challenge_attempts`, `streak_events`,
-- `elo_history`, `leaderboard_snapshots`, `proof_artifacts`) which remain
-- untouched — Arena V1 stays frozen and running exactly as it does today.
--
-- TABLE MAP vs. the blueprint's Phase 1 DB list ("challenge_templates,
-- challenge_template_versions, scenario_packs, datasets, dataset_versions,
-- skill_graphs, challenge_analytics_events, domain_challenge_grants,
-- role_capabilities"):
--   av2_challenge_templates          <- challenge_templates
--   av2_challenge_template_versions  <- challenge_template_versions
--   av2_scenario_packs               <- scenario_packs
--   av2_datasets                     <- datasets
--   av2_dataset_versions             <- dataset_versions
--   av2_skill_dependency_graphs      <- skill_graphs (renamed only to avoid a
--                                        real collision with the existing
--                                        per-user `skill_graph` table from
--                                        supabase-professional-path.sql, which
--                                        is a different feature — general
--                                        profile skill tracking, not Arena's
--                                        static per-role prerequisite graph)
--   av2_challenge_analytics_events   <- challenge_analytics_events
--   av2_domain_challenge_grants      <- domain_challenge_grants
--   av2_role_capabilities            <- role_capabilities (Capability Registry, v1.1)
--
-- ADDITIONAL TABLES not explicitly named in the blueprint's list, but required
-- to make the pipeline executable at all (the blueprint's diagram references
-- these stages; a stage needs a place to persist its state):
--   av2_challenge_instances   — the actual issued Challenge Payload snapshot
--                               per attempt (challengeInstanceId + every pinned
--                               version field) — this IS the mechanism the
--                               versioning model (00-conventions-and-versioning.md)
--                               depends on; without it "pin to the version you
--                               started" has nowhere to be recorded.
--   av2_submissions           — Submission Engine's queue/worker state
--   av2_assessments           — Assessment layer's combined result
--   av2_portfolio_artifacts   — Portfolio Decision + Recruiter Skill Evidence
--                               (kept separate from legacy `proof_artifacts`
--                               because that table's FKs point at legacy
--                               `challenge_attempts`, not `av2_submissions` —
--                               see docs/future-improvements.md #1)
--   av2_xp_ledger             — Common Challenges' XP+streak+mastery reward
--                               path (kept separate from `elo_history` because
--                               that table conflates its column name with ELO —
--                               see docs/future-improvements.md #2)
--   av2_elo_ledger            — Domain Challenges' ELO reward path, the only
--                               writer per blueprint §1 (ELO/XP Engine)
--   av2_skill_progress        — Skill Engine's mastery/weak/unattempted signal
--   av2_challenge_progression_state — Challenge Progression's per-user-per-role
--                               unlock/cooldown/industry-rotation state
--   av2_challenge_payload_rejections — Challenge Payload Validator's two-gate
--                               rejection log (schema-shape vs. Capability
--                               Registry), feeds av2_challenge_analytics_events
--
-- This is implementation of the frozen spec, not new architecture: every table
-- below is a direct, literal reading of the blueprint's pipeline diagram and
-- the content spec's schema. Nothing here changes what was signed off.
-- ══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — CONTENT TABLES (Arena Content, per blueprint §1.2)
-- Authored by content team / seed scripts, not by students. Read-heavy,
-- versioned, RLS = read-only for authenticated users, write = service role only.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 Capability Registry (blueprint §1.1) — per-role allow-list of
--     workstations/validators/UI modules. The Challenge Payload Validator's
--     second gate reads this table.
CREATE TABLE IF NOT EXISTS av2_role_capabilities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_family  TEXT NOT NULL DEFAULT 'IT',
  role           TEXT NOT NULL,
  workstations   TEXT[] NOT NULL DEFAULT '{}',
  validators     TEXT[] NOT NULL DEFAULT '{}',
  ui_modules     TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (career_family, role)
);
CREATE INDEX IF NOT EXISTS idx_av2_role_capabilities_role ON av2_role_capabilities(career_family, role);

-- 1.2 Skill Dependency Graphs (content_spec/03-learning-paths.md), versioned.
--     is_active marks the graph version new unlocks resolve against; older
--     versions stay queryable so an already-unlocked student's evaluation
--     stays reproducible (00-conventions-and-versioning.md).
CREATE TABLE IF NOT EXISTS av2_skill_dependency_graphs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_family  TEXT NOT NULL DEFAULT 'IT',
  role           TEXT NOT NULL,
  version        TEXT NOT NULL,
  graph          JSONB NOT NULL,       -- { nodes: [...], edges: [{from, to}] }
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (career_family, role, version)
);
CREATE INDEX IF NOT EXISTS idx_av2_skill_graphs_active ON av2_skill_dependency_graphs(career_family, role) WHERE is_active;

-- 1.3 Scenario Packs (content_spec/06-scenario-packs-and-datasets.md), versioned
--     via an append-only row per version (mirrors challenge_template_versions'
--     pattern rather than a separate _versions table, since a Scenario Pack's
--     version bump is just "scenarios list changed," not a distinct entity).
CREATE TABLE IF NOT EXISTS av2_scenario_packs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT NOT NULL,
  name           TEXT NOT NULL,
  industry       TEXT,
  role_families  TEXT[] NOT NULL DEFAULT '{}',
  version        TEXT NOT NULL DEFAULT 'v1',
  scenarios      JSONB NOT NULL DEFAULT '[]',  -- [{ scenarioId, name, templateChain: [...] }]
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','archived')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (slug, version)
);
CREATE INDEX IF NOT EXISTS idx_av2_scenario_packs_industry ON av2_scenario_packs(industry);
CREATE INDEX IF NOT EXISTS idx_av2_scenario_packs_status   ON av2_scenario_packs(status);

-- 1.4 Datasets + Dataset Versions (content_spec/06-scenario-packs-and-datasets.md
--     "Dataset Versioning" — e.g. amazon-orders v1/v2/v3).
CREATE TABLE IF NOT EXISTS av2_datasets (
  dataset_id       TEXT PRIMARY KEY,          -- logical id, e.g. 'amazon-orders'
  scenario_pack_id UUID REFERENCES av2_scenario_packs(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS av2_dataset_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id   TEXT NOT NULL REFERENCES av2_datasets(dataset_id) ON DELETE CASCADE,
  version      TEXT NOT NULL,
  schema       JSONB NOT NULL DEFAULT '{}',   -- table/column definitions for sql.js seeding
  seed_sql     TEXT,                          -- SQL script that builds the sql.js WASM DB
  is_active    BOOLEAN NOT NULL DEFAULT true, -- latest version new challenge starts resolve to
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (dataset_id, version)
);
CREATE INDEX IF NOT EXISTS idx_av2_dataset_versions_active ON av2_dataset_versions(dataset_id) WHERE is_active;

-- 1.5 Challenge Templates + Versions (content_spec/08-challenge-templates-and-payload.md)
CREATE TABLE IF NOT EXISTS av2_challenge_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  challenge_type    TEXT NOT NULL CHECK (challenge_type IN ('common','domain')),
  career_family     TEXT NOT NULL DEFAULT 'IT',
  role              TEXT,                      -- NULL for Common Challenges (role-agnostic, skill-scoped)
  skill             TEXT NOT NULL,
  workstation       TEXT NOT NULL,             -- must resolve to av2_role_capabilities entry when role is set
  scenario_pack_id  UUID REFERENCES av2_scenario_packs(id) ON DELETE SET NULL,  -- domain only
  scenario_id       TEXT,                                                       -- domain only
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','archived')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_domain_has_role CHECK (challenge_type = 'common' OR role IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_av2_templates_type_role ON av2_challenge_templates(challenge_type, role);
CREATE INDEX IF NOT EXISTS idx_av2_templates_skill     ON av2_challenge_templates(skill);
CREATE INDEX IF NOT EXISTS idx_av2_templates_status    ON av2_challenge_templates(status);

CREATE TABLE IF NOT EXISTS av2_challenge_template_versions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_template_id UUID NOT NULL REFERENCES av2_challenge_templates(id) ON DELETE CASCADE,
  version               TEXT NOT NULL,
  difficulty_variants   JSONB NOT NULL DEFAULT '{}',  -- { Easy: {...}, Medium: {...}, Hard: {...}, Expert: {...} }
  validator             JSONB NOT NULL,               -- { type, version, config }
  assessment_rules      JSONB NOT NULL DEFAULT '{}',
  submission_rules      JSONB NOT NULL DEFAULT '{}',
  progression_rules     JSONB NOT NULL DEFAULT '{}',
  reward_rules          JSONB NOT NULL DEFAULT '{}',
  portfolio_decision    JSONB NOT NULL DEFAULT '{}',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (challenge_template_id, version)
);
CREATE INDEX IF NOT EXISTS idx_av2_template_versions_active ON av2_challenge_template_versions(challenge_template_id) WHERE is_active;

-- 1.6 Domain Challenge Grants (subscription/entitlement gate for Domain
--     Challenges specifically — Common Challenges remain ungated per spec).
CREATE TABLE IF NOT EXISTS av2_domain_challenge_grants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source       TEXT NOT NULL DEFAULT 'subscription' CHECK (source IN ('subscription','promo','admin_grant','trial')),
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,                    -- NULL = no expiry
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_av2_grants_user_active ON av2_domain_challenge_grants(user_id) WHERE revoked_at IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — EXECUTION TABLES (Arena Engine runtime state, per blueprint §1)
-- Written by the pipeline as students actually play. RLS = own-row only.
-- ─────────────────────────────────────────────────────────────────────────────

-- 2.1 Challenge Instances — the issued Challenge Payload, one row per
--     challengeInstanceId, carrying every pinned version field. This is the
--     row that makes "in-progress students pinned to the version they
--     started" (00-conventions-and-versioning.md) a real, queryable fact
--     rather than an aspiration.
CREATE TABLE IF NOT EXISTS av2_challenge_instances (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- == challengeInstanceId
  user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_type              TEXT NOT NULL CHECK (challenge_type IN ('common','domain')),
  career_family               TEXT NOT NULL DEFAULT 'IT',
  role                        TEXT NOT NULL,
  industry                    TEXT,
  scenario_pack_id            UUID REFERENCES av2_scenario_packs(id),
  scenario_pack_version       TEXT,
  scenario_id                 TEXT,
  challenge_template_id       UUID NOT NULL REFERENCES av2_challenge_templates(id),
  challenge_template_version  TEXT NOT NULL,
  dataset_id                  TEXT REFERENCES av2_datasets(dataset_id),
  dataset_version             TEXT,
  difficulty                  TEXT NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard','Expert')),
  skill                       TEXT NOT NULL,
  skill_graph_version         TEXT,
  workstation                 TEXT NOT NULL,
  workstation_version         TEXT,
  payload                     JSONB NOT NULL,             -- resolved, workstation-specific
  validator                   JSONB NOT NULL,              -- { type, version, config } — pinned copy
  assessment_rules            JSONB NOT NULL DEFAULT '{}',
  submission_rules            JSONB NOT NULL DEFAULT '{}',
  progression_rules           JSONB NOT NULL DEFAULT '{}',
  reward_rules                JSONB NOT NULL DEFAULT '{}',
  portfolio_decision          JSONB NOT NULL DEFAULT '{}',
  status                      TEXT NOT NULL DEFAULT 'issued' CHECK (status IN
                                ('issued','in_progress','submitted','graded','expired','abandoned')),
  started_at                  TIMESTAMPTZ DEFAULT NOW(),
  expires_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_av2_instances_user       ON av2_challenge_instances(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_av2_instances_status     ON av2_challenge_instances(status);
CREATE INDEX IF NOT EXISTS idx_av2_instances_template   ON av2_challenge_instances(challenge_template_id);
CREATE INDEX IF NOT EXISTS idx_av2_instances_user_status ON av2_challenge_instances(user_id, status);

-- 2.2 Submissions — Submission Engine's queue/worker record, one per attempt
--     (an instance can have multiple submissions if maxAttempts > 1).
CREATE TABLE IF NOT EXISTS av2_submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id       UUID NOT NULL REFERENCES av2_challenge_instances(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_number    INT NOT NULL DEFAULT 1,
  submission_data   JSONB NOT NULL DEFAULT '{}',   -- workstation-specific student submission
  status            TEXT NOT NULL DEFAULT 'queued' CHECK (status IN
                       ('queued','running','validated','failed_to_validate')),
  validator_result  JSONB DEFAULT '[]',            -- the validator's detail[] shape (05-validators.md)
  is_timed_out      BOOLEAN NOT NULL DEFAULT false,
  time_taken_secs   INT,
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  validated_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (instance_id, attempt_number)
);
CREATE INDEX IF NOT EXISTS idx_av2_submissions_instance ON av2_submissions(instance_id);
CREATE INDEX IF NOT EXISTS idx_av2_submissions_user      ON av2_submissions(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_av2_submissions_status    ON av2_submissions(status);

-- 2.3 Assessments — Assessment layer's combined result (validator + rubric +
--     capped AI supplement + timing + code quality — never AI-only).
CREATE TABLE IF NOT EXISTS av2_assessments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id      UUID NOT NULL UNIQUE REFERENCES av2_submissions(id) ON DELETE CASCADE,
  instance_id        UUID NOT NULL REFERENCES av2_challenge_instances(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  validator_score    NUMERIC(5,2) NOT NULL,
  rubric_score       NUMERIC(5,2),
  ai_review_score    NUMERIC(5,2),
  ai_review_weight   NUMERIC(4,3) DEFAULT 0,        -- capped, supplement only — never sole authority
  timing_modifier    NUMERIC(4,3) DEFAULT 0,
  code_quality_notes JSONB DEFAULT '[]',
  final_score        NUMERIC(5,2) NOT NULL CHECK (final_score BETWEEN 0 AND 100),
  is_zero_effort     BOOLEAN NOT NULL DEFAULT false,  -- carries forward the Arena V1 timeout-exploit fix
  feedback           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_av2_assessments_user ON av2_assessments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_av2_assessments_instance ON av2_assessments(instance_id);

-- 2.4 Portfolio Artifacts — Portfolio Decision output + Recruiter Skill
--     Evidence (content_spec/10-portfolio-and-recruiter-evidence.md).
--     Kept separate from legacy `proof_artifacts` — see docs/future-improvements.md #1.
CREATE TABLE IF NOT EXISTS av2_portfolio_artifacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id         UUID NOT NULL REFERENCES av2_assessments(id) ON DELETE CASCADE,
  instance_id           UUID NOT NULL REFERENCES av2_challenge_instances(id) ON DELETE CASCADE,
  artifact_type         TEXT NOT NULL CHECK (artifact_type IN ('code','report','dashboard','design','diagram')),
  publish_state         TEXT NOT NULL CHECK (publish_state IN ('auto_published','self_selected','not_published')),
  recruiter_evidence     JSONB NOT NULL,   -- { skill, status, scorePct, verification, difficulty, industry, scenario, skillsDemonstrated }
  storage_url           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_av2_portfolio_user       ON av2_portfolio_artifacts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_av2_portfolio_published  ON av2_portfolio_artifacts(publish_state) WHERE publish_state != 'not_published';

-- 2.5 ELO Ledger — Domain Challenges only. The only ELO writer (blueprint §1).
CREATE TABLE IF NOT EXISTS av2_elo_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id  UUID NOT NULL REFERENCES av2_assessments(id) ON DELETE CASCADE,
  role           TEXT NOT NULL,
  elo_before     INT NOT NULL,
  elo_after      INT NOT NULL,
  delta          INT NOT NULL,
  reason         TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_av2_elo_user_role ON av2_elo_ledger(user_id, role, created_at DESC);

-- 2.6 XP Ledger — Common Challenges only (XP + streak + skill mastery, never
--     ELO). Kept distinct from av2_elo_ledger so the two reward paths can
--     never be conflated at the schema level, per the frozen ELO/XP split.
CREATE TABLE IF NOT EXISTS av2_xp_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id  UUID NOT NULL REFERENCES av2_assessments(id) ON DELETE CASCADE,
  skill          TEXT NOT NULL,
  xp_gained      INT NOT NULL DEFAULT 0,
  streak_counted BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_av2_xp_user_skill ON av2_xp_ledger(user_id, skill, created_at DESC);

-- 2.7 Skill Progress — Skill Engine's mastery/weak/unattempted signal, one
--     row per user per skill (content_spec/02-skills-and-capabilities.md).
CREATE TABLE IF NOT EXISTS av2_skill_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  career_family       TEXT NOT NULL DEFAULT 'IT',
  skill               TEXT NOT NULL,
  mastery_state       TEXT NOT NULL DEFAULT 'unattempted' CHECK (mastery_state IN
                        ('unattempted','attempted','weak','proficient','mastered')),
  attempts_count      INT NOT NULL DEFAULT 0,
  best_score          NUMERIC(5,2),
  last_attempted_at   TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, career_family, skill)
);
CREATE INDEX IF NOT EXISTS idx_av2_skill_progress_user ON av2_skill_progress(user_id);

-- 2.8 Challenge Progression State — per-user-per-role unlock/cooldown/
--     industry-rotation bookkeeping (content_spec/03-learning-paths.md unlock
--     rule: "all direct prerequisites attempted, not mastered").
CREATE TABLE IF NOT EXISTS av2_challenge_progression_state (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  career_family          TEXT NOT NULL DEFAULT 'IT',
  role                   TEXT NOT NULL,
  skill_graph_version    TEXT NOT NULL,       -- pinned to the graph version active when skills were unlocked
  unlocked_skills        TEXT[] NOT NULL DEFAULT '{}',
  last_industry          TEXT,                -- for industry rotation, avoid repeats
  cooldowns              JSONB NOT NULL DEFAULT '{}',   -- { skill: earliest_retry_at }
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, career_family, role)
);
CREATE INDEX IF NOT EXISTS idx_av2_progression_user ON av2_challenge_progression_state(user_id);

-- 2.9 Challenge Payload Rejections — Challenge Payload Validator's two-gate
--     rejection log (schema-shape vs. Capability Registry), per blueprint §1.1.
CREATE TABLE IF NOT EXISTS av2_challenge_payload_rejections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_role  TEXT,
  gate            TEXT NOT NULL CHECK (gate IN ('schema_shape','capability_registry')),
  reason          TEXT NOT NULL,
  payload_snapshot JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_av2_rejections_gate ON av2_challenge_payload_rejections(gate, created_at DESC);

-- 2.10 Analytics Events — general telemetry collector (content_spec/09-analytics.md).
CREATE TABLE IF NOT EXISTS av2_challenge_analytics_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- nullable: some events (rejections) precede a user context
  instance_id     UUID REFERENCES av2_challenge_instances(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,   -- e.g. 'shown','started','hint_used','abandoned','submitted','validator_rejected'
  event_data      JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_av2_analytics_type      ON av2_challenge_analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_av2_analytics_instance  ON av2_challenge_analytics_events(instance_id);
CREATE INDEX IF NOT EXISTS idx_av2_analytics_user      ON av2_challenge_analytics_events(user_id, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — ROW-LEVEL SECURITY
-- Content tables: read-only for authenticated users on active/published rows;
-- no anon or authenticated write policy exists on any content table — all
-- authoring goes through the service role (server-side only), matching the
-- fix applied in the 2026-07-16 certification audit (no anon-executable RPCs).
-- Execution tables: strictly own-row for the student; service role (server)
-- does all inserts/updates via backend routes, never directly from the client
-- for scoring-relevant fields.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE av2_role_capabilities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_skill_dependency_graphs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_scenario_packs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_datasets                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_dataset_versions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_challenge_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_challenge_template_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_domain_challenge_grants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_challenge_instances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_submissions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_assessments                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_portfolio_artifacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_elo_ledger                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_xp_ledger                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_skill_progress               ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_challenge_progression_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_challenge_payload_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE av2_challenge_analytics_events   ENABLE ROW LEVEL SECURITY;

-- Content: read-only, active rows only
DO $$ BEGIN CREATE POLICY "av2_role_capabilities_read" ON av2_role_capabilities
  FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_skill_graphs_read" ON av2_skill_dependency_graphs
  FOR SELECT TO authenticated USING (is_active); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_scenario_packs_read" ON av2_scenario_packs
  FOR SELECT TO authenticated USING (status = 'active'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_datasets_read" ON av2_datasets
  FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_dataset_versions_read" ON av2_dataset_versions
  FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_templates_read" ON av2_challenge_templates
  FOR SELECT TO authenticated USING (status = 'active'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_template_versions_read" ON av2_challenge_template_versions
  FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Grants: users can read their own grant status (needed by frontend gating UI),
-- never write it themselves (that's the payment/subscription webhook's job,
-- server-side, matching the payment order-binding fix from the 2026-07-16 audit).
DO $$ BEGIN CREATE POLICY "av2_grants_read_own" ON av2_domain_challenge_grants
  FOR SELECT TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Execution tables: strictly own-row
DO $$ BEGIN CREATE POLICY "av2_instances_own" ON av2_challenge_instances
  FOR SELECT TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_submissions_own" ON av2_submissions
  FOR SELECT TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_assessments_own" ON av2_assessments
  FOR SELECT TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_portfolio_own_or_published" ON av2_portfolio_artifacts
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR publish_state != 'not_published');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_elo_ledger_own" ON av2_elo_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_xp_ledger_own" ON av2_xp_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_skill_progress_own" ON av2_skill_progress
  FOR SELECT TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "av2_progression_state_own" ON av2_challenge_progression_state
  FOR SELECT TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Rejections + analytics: no client read/write policy at all — service role
-- only (ops dashboard queries run server-side with the service key). This is
-- intentional: student-triggered rejections should never be readable by the
-- client that triggered them, to avoid leaking Capability Registry contents
-- as a discovery surface.

-- NOTE: no INSERT/UPDATE policies are defined for `authenticated` on ANY table
-- above. All writes (instance issuance, submission grading, ELO/XP posting,
-- portfolio publishing) go through backend routes using the service role key,
-- server-side, after validation — never a direct client write. This mirrors
-- the fix applied in the 2026-07-16 certification audit for anon-executable
-- RPC backdoors: nothing scoring-relevant is client-writable here.


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4 — VERIFICATION
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl_count INT;
BEGIN
  SELECT COUNT(*) INTO tbl_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name LIKE 'av2_%';

  IF tbl_count < 17 THEN
    RAISE EXCEPTION 'Arena V2 schema migration incomplete: expected >= 17 av2_ tables, found %', tbl_count;
  END IF;

  RAISE NOTICE '✅ Arena V2 Milestone 1 schema migration complete. % av2_ tables present.', tbl_count;
END $$;
