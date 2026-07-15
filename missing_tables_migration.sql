-- ============================================================
-- CAPABILIO — Missing Tables Migration
-- Generated: 2026-07-13
-- Run this in the Supabase SQL editor on the PRODUCTION project.
--
-- Tables created:
--   1. proof_artifacts      — Arena completion proof records
--   2. streak_events        — Daily activity for heatmap
--   3. arena_grading_jobs   — Async grading queue job tracker
--
-- Column fix:
--   4. profiles.last_arena_date — add alias column (DB has last_arena_day;
--      arenaV2.js reads last_arena_date)
-- ============================================================


-- ─── 1. proof_artifacts ───────────────────────────────────────────────────────
-- Source of truth for verified career proofs.
-- Consumed by:
--   POST /api/arena/proof-artifacts  (Arena.jsx → after grading)
--   GET  /api/arena/proof-artifacts/:uid  (Portfolio page)
--   GET  /api/arena/recruiter/proof/:uid  (Recruiter Dashboard)
--   GET  /api/arena/recruiter/candidates  (Recruiter search)
--   grading-worker.js                    (async path insert)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proof_artifacts (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_id        UUID,                          -- FK to arena_history.id (nullable — set after insert)
  challenge_id         TEXT,                          -- challenge slug or id
  workspace_type       TEXT,                          -- code | sql | notebook | react | terminal
  artifact_type        TEXT        DEFAULT 'arena_submission',
  title                TEXT,
  description          TEXT,
  artifact_url         TEXT,                          -- optional: link to live demo / notebook
  thumbnail_url        TEXT,
  domain               TEXT,                          -- swe | data | devops | ece | civil | etc.
  difficulty           TEXT,                          -- Easy | Medium | Hard | Expert
  challenge_type       TEXT,                          -- dsa | frontend | backend | sql | etc.
  score                INTEGER     DEFAULT 0,
  hidden_score         INTEGER     DEFAULT 0,         -- internal score (not shown to student)
  grade                TEXT,                          -- A+ | A | B+ | B | C | D
  elo_delta            INTEGER     DEFAULT 0,
  badges               JSONB       DEFAULT '[]',      -- ["top_score", "strong", ...]
  technologies_used    JSONB       DEFAULT '[]',      -- ["Python", "SQL", ...]
  skills_demonstrated  JSONB       DEFAULT '[]',      -- ["Binary Search", "Dynamic Programming"]
  trust_level          TEXT        DEFAULT 'verified', -- verified | self_reported | inferred
  is_portfolio_visible BOOLEAN     DEFAULT FALSE,     -- score >= 70
  is_recruiter_visible BOOLEAN     DEFAULT FALSE,     -- score >= 60
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- Indexes for the three main access patterns
CREATE INDEX IF NOT EXISTS idx_proof_artifacts_user
  ON proof_artifacts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proof_artifacts_recruiter
  ON proof_artifacts(is_recruiter_visible, score DESC)
  WHERE is_recruiter_visible = TRUE;

CREATE INDEX IF NOT EXISTS idx_proof_artifacts_portfolio
  ON proof_artifacts(user_id, is_portfolio_visible)
  WHERE is_portfolio_visible = TRUE;

-- RLS: users see only their own proofs; recruiter/public reads handled by API
ALTER TABLE proof_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own proof_artifacts"
  ON proof_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proof_artifacts"
  ON proof_artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role (backend) bypasses RLS automatically


-- ─── 2. streak_events ─────────────────────────────────────────────────────────
-- One row per user per active day. Source for:
--   GET /api/arena/streaks/:uid  →  heatmap + longest streak + milestones
--   grading-worker.js UPSERT     →  written on every Arena completion
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streak_events (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_date      DATE    NOT NULL,
  challenge_count INTEGER DEFAULT 1,       -- number of challenges completed on this day
  domains         TEXT[]  DEFAULT '{}',    -- array of domain slugs active that day
  elo_gained      INTEGER DEFAULT 0,       -- sum of positive ELO deltas for the day
  is_freeze_used  BOOLEAN DEFAULT FALSE,   -- streak freeze was applied to keep streak alive
  updated_at      TIMESTAMPTZ DEFAULT now(),

  -- Composite unique constraint required for UPSERT onConflict: "user_id,event_date"
  CONSTRAINT streak_events_user_date_unique UNIQUE (user_id, event_date)
);

CREATE INDEX IF NOT EXISTS idx_streak_events_user_date
  ON streak_events(user_id, event_date DESC);

ALTER TABLE streak_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own streak_events"
  ON streak_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own streak_events"
  ON streak_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak_events"
  ON streak_events FOR UPDATE
  USING (auth.uid() = user_id);


-- ─── 3. arena_grading_jobs ────────────────────────────────────────────────────
-- Job tracking table for the async grading queue (pgmq + grading-worker.js).
-- Written by: queue.js enqueueGrading()
-- Read by:    grading-worker.js processJob(), GET /challenges/:id/jobs/:job_id
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arena_grading_jobs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'queued',  -- queued | processing | done | failed
  result       JSONB,                                  -- full grading result when done
  error_msg    TEXT,                                   -- error message when failed
  created_at   TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_arena_grading_jobs_user
  ON arena_grading_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_arena_grading_jobs_status
  ON arena_grading_jobs(status)
  WHERE status IN ('queued', 'processing');

-- RLS: users can only see their own jobs
ALTER TABLE arena_grading_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own grading jobs"
  ON arena_grading_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own grading jobs"
  ON arena_grading_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ─── 4. Fix: profiles.last_arena_date column alias ───────────────────────────
-- The DB has `last_arena_day` (text) but arenaV2.js reads/writes `last_arena_date`.
-- Add the missing column. The grading worker (arena.js path) also writes
-- `last_arena_date` via profiles UPDATE.
-- Note: last_arena_day stays to avoid breaking frontend (useArenaState.js, db.js).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_arena_date TEXT;

-- Back-fill from existing last_arena_day for current users
UPDATE profiles
SET last_arena_date = last_arena_day
WHERE last_arena_day IS NOT NULL
  AND last_arena_date IS NULL;


-- ─── 5. arena_history: add missing columns used by grading-worker ─────────────
-- The worker writes: challenge_type, submitted_answer — verify they exist.
-- arena_history already has these per DB audit, but add IF NOT EXISTS as safety.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE arena_history
  ADD COLUMN IF NOT EXISTS challenge_type    TEXT,
  ADD COLUMN IF NOT EXISTS submitted_answer  TEXT,
  ADD COLUMN IF NOT EXISTS summary           TEXT,
  ADD COLUMN IF NOT EXISTS grade             TEXT;


-- ─── 6. arena_leaderboard ────────────────────────────────────────────────────
-- Per-domain leaderboard. db.js upserts here after every Arena completion,
-- with a graceful fallback to profiles.elo_rating ordering if table missing.
-- Creating the table activates the fast per-domain leaderboard path.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arena_leaderboard (
  id              TEXT        PRIMARY KEY,  -- "{uid}_{domainKey}"
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain          TEXT        NOT NULL,
  display_name    TEXT,
  username        TEXT,
  elo_rating      INTEGER     DEFAULT 800,
  arena_completed INTEGER     DEFAULT 0,
  arena_streak    INTEGER     DEFAULT 0,
  last_active     TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arena_leaderboard_domain_elo
  ON arena_leaderboard(domain, elo_rating DESC);

ALTER TABLE arena_leaderboard ENABLE ROW LEVEL SECURITY;

-- Leaderboard is public read (ELO rankings are not private)
CREATE POLICY "Public read arena_leaderboard"
  ON arena_leaderboard FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can upsert own leaderboard entry"
  ON arena_leaderboard FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leaderboard entry"
  ON arena_leaderboard FOR UPDATE
  USING (auth.uid() = user_id);
