-- ============================================================
-- CAPABILIO — Missing Tables Migration (idempotent v2)
-- Generated: 2026-07-13
-- Run in Supabase SQL editor on the PRODUCTION project.
--
-- Fully idempotent: safe to run multiple times.
-- Uses ADD COLUMN IF NOT EXISTS after CREATE TABLE IF NOT EXISTS
-- so partial prior runs are healed before indexes are created.
-- ============================================================


-- ─── 1. proof_artifacts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proof_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Add every column idempotently (safe if table already existed with missing cols)
ALTER TABLE proof_artifacts
  ADD COLUMN IF NOT EXISTS user_id              UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS submission_id        UUID,
  ADD COLUMN IF NOT EXISTS challenge_id         TEXT,
  ADD COLUMN IF NOT EXISTS workspace_type       TEXT,
  ADD COLUMN IF NOT EXISTS artifact_type        TEXT        DEFAULT 'arena_submission',
  ADD COLUMN IF NOT EXISTS title                TEXT,
  ADD COLUMN IF NOT EXISTS description          TEXT,
  ADD COLUMN IF NOT EXISTS artifact_url         TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url        TEXT,
  ADD COLUMN IF NOT EXISTS domain               TEXT,
  ADD COLUMN IF NOT EXISTS difficulty           TEXT,
  ADD COLUMN IF NOT EXISTS challenge_type       TEXT,
  ADD COLUMN IF NOT EXISTS score                INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hidden_score         INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grade                TEXT,
  ADD COLUMN IF NOT EXISTS elo_delta            INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badges               JSONB       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS technologies_used    JSONB       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS skills_demonstrated  JSONB       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS trust_level          TEXT        DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS is_portfolio_visible BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_recruiter_visible BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at           TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_proof_artifacts_user
  ON proof_artifacts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proof_artifacts_recruiter_score
  ON proof_artifacts(score DESC)
  WHERE is_recruiter_visible = TRUE;

CREATE INDEX IF NOT EXISTS idx_proof_artifacts_portfolio_user
  ON proof_artifacts(user_id)
  WHERE is_portfolio_visible = TRUE;

ALTER TABLE proof_artifacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "proof_artifacts_select_own"
    ON proof_artifacts FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "proof_artifacts_insert_own"
    ON proof_artifacts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── 2. streak_events ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streak_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE streak_events
  ADD COLUMN IF NOT EXISTS user_id         UUID    REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS event_date      DATE,
  ADD COLUMN IF NOT EXISTS challenge_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS domains         TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS elo_gained      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_freeze_used  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT now();

-- Unique constraint required for UPSERT onConflict:"user_id,event_date"
DO $$ BEGIN
  ALTER TABLE streak_events
    ADD CONSTRAINT streak_events_user_date_unique UNIQUE (user_id, event_date);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_streak_events_user_date
  ON streak_events(user_id, event_date DESC);

ALTER TABLE streak_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "streak_events_select_own"
    ON streak_events FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "streak_events_insert_own"
    ON streak_events FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "streak_events_update_own"
    ON streak_events FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── 3. arena_grading_jobs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arena_grading_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE arena_grading_jobs
  ADD COLUMN IF NOT EXISTS user_id         UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS challenge_id    TEXT,
  ADD COLUMN IF NOT EXISTS status          TEXT        DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS result          JSONB,
  ADD COLUMN IF NOT EXISTS error_msg       TEXT,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_arena_grading_jobs_user
  ON arena_grading_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_arena_grading_jobs_status
  ON arena_grading_jobs(status)
  WHERE status IN ('queued', 'processing');

ALTER TABLE arena_grading_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "grading_jobs_select_own"
    ON arena_grading_jobs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "grading_jobs_insert_own"
    ON arena_grading_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── 4. arena_leaderboard ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arena_leaderboard (
  id TEXT PRIMARY KEY
);

ALTER TABLE arena_leaderboard
  ADD COLUMN IF NOT EXISTS user_id         UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS domain          TEXT,
  ADD COLUMN IF NOT EXISTS display_name    TEXT,
  ADD COLUMN IF NOT EXISTS username        TEXT,
  ADD COLUMN IF NOT EXISTS elo_rating      INTEGER     DEFAULT 800,
  ADD COLUMN IF NOT EXISTS arena_completed INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arena_streak    INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active     TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_arena_leaderboard_domain_elo
  ON arena_leaderboard(domain, elo_rating DESC);

ALTER TABLE arena_leaderboard ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "leaderboard_public_read"
    ON arena_leaderboard FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "leaderboard_insert_own"
    ON arena_leaderboard FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "leaderboard_update_own"
    ON arena_leaderboard FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── 5. profiles: add last_arena_date alias ───────────────────────────────────
-- arenaV2.js writes last_arena_date; DB has last_arena_day (used by frontend).
-- Adding last_arena_date so both paths work.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_arena_date TEXT;

-- (no backfill needed — production already has last_arena_date)


-- ─── 6. arena_history: add columns written by grading-worker ─────────────────
ALTER TABLE arena_history
  ADD COLUMN IF NOT EXISTS challenge_type   TEXT,
  ADD COLUMN IF NOT EXISTS submitted_answer TEXT,
  ADD COLUMN IF NOT EXISTS summary          TEXT,
  ADD COLUMN IF NOT EXISTS grade            TEXT;
