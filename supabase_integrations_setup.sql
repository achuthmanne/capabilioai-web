-- ═══════════════════════════════════════════════════════════════════════════
-- supabase_integrations_setup.sql
-- Run ONCE in Supabase SQL editor (production project eybchcqwbizjmzyrviri)
-- Sets up: pgmq queue · RPC wrappers · pg_cron jobs
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Create the arena grading queue ─────────────────────────────────────────
SELECT pgmq.create('arena_grading');

-- ── 2. Public RPC wrapper functions ───────────────────────────────────────────
-- These let the Node.js backend call pgmq via supabase.rpc() without needing
-- direct schema access. All are SECURITY DEFINER so the anon/service role
-- can reach the pgmq schema safely.

-- Send a grading job → returns msg_id (bigint)
CREATE OR REPLACE FUNCTION queue_send_grading(msg jsonb)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pgmq.send('arena_grading', msg);
$$;

-- Read next job (vt = visibility timeout in seconds) → returns one row or null
CREATE OR REPLACE FUNCTION queue_read_grading(vt int DEFAULT 90)
RETURNS SETOF pgmq.message_record
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM pgmq.read('arena_grading', vt, 1);
$$;

-- Acknowledge (delete) a processed job
CREATE OR REPLACE FUNCTION queue_ack_grading(msg_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pgmq.delete('arena_grading', msg_id);
$$;

-- Archive a failed job (keeps it for debugging)
CREATE OR REPLACE FUNCTION queue_archive_grading(msg_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pgmq.archive('arena_grading', msg_id);
$$;

-- ── 3. arena_grading_jobs table ───────────────────────────────────────────────
-- Tracks job status so the frontend can poll for results.
CREATE TABLE IF NOT EXISTS arena_grading_jobs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id  text        NOT NULL,
  attempt_id    uuid,
  msg_id        bigint,                    -- pgmq message id (for ack)
  status        text        NOT NULL DEFAULT 'queued'
                            CHECK (status IN ('queued','processing','done','failed')),
  result        jsonb,                     -- grading result written by worker
  error_msg     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_grading_jobs_user
  ON arena_grading_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_grading_jobs_status
  ON arena_grading_jobs (status)
  WHERE status IN ('queued', 'processing');

-- ── 4. pg_cron jobs ───────────────────────────────────────────────────────────
-- Requires pg_cron extension (Cron integration you installed).
-- Schedule reference: '*/5 * * * *' = every 5 min, '0 2 * * *' = 2am daily

-- 4a. ELO decay — runs at 2am UTC daily
--     Reduces ELO by 5 points for users inactive > 14 days (max -100 total decay)
SELECT cron.schedule(
  'arena-elo-decay',
  '0 2 * * *',
  $$
    UPDATE profiles
    SET elo_rating = GREATEST(100, elo_rating - 5)
    WHERE
      arena_last_active < now() - INTERVAL '14 days'
      AND elo_rating > 100
      AND (arena_decay_applied_at IS NULL OR arena_decay_applied_at < now() - INTERVAL '1 day');

    UPDATE profiles
    SET arena_decay_applied_at = now()
    WHERE
      arena_last_active < now() - INTERVAL '14 days'
      AND elo_rating > 100;
  $$
);

-- 4b. Leaderboard snapshot — runs every hour
--     Writes top 200 profiles per domain into a leaderboard_cache table
--     (create the cache table below, then enable this job)
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  domain        text        NOT NULL,
  rank          int         NOT NULL,
  user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name  text,
  elo_rating    int,
  arena_streak  int,
  arena_completed int,
  profile_photo_url text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (domain, rank)
);

SELECT cron.schedule(
  'leaderboard-snapshot',
  '0 * * * *',
  $$
    -- Overall leaderboard
    DELETE FROM leaderboard_cache WHERE domain = 'overall';
    INSERT INTO leaderboard_cache (domain, rank, user_id, display_name, elo_rating, arena_streak, arena_completed, profile_photo_url)
    SELECT
      'overall',
      ROW_NUMBER() OVER (ORDER BY elo_rating DESC),
      id,
      COALESCE(display_name, name, username, 'Anonymous'),
      elo_rating,
      arena_streak,
      arena_completed,
      profile_photo_url
    FROM profiles
    WHERE elo_rating IS NOT NULL
    ORDER BY elo_rating DESC
    LIMIT 200;

    -- Per-keyword (domain) leaderboard
    DELETE FROM leaderboard_cache WHERE domain != 'overall';
    INSERT INTO leaderboard_cache (domain, rank, user_id, display_name, elo_rating, arena_streak, arena_completed, profile_photo_url)
    SELECT
      keyword,
      ROW_NUMBER() OVER (PARTITION BY keyword ORDER BY elo_rating DESC),
      id,
      COALESCE(display_name, name, username, 'Anonymous'),
      elo_rating,
      arena_streak,
      arena_completed,
      profile_photo_url
    FROM profiles
    WHERE keyword IS NOT NULL AND elo_rating IS NOT NULL
    ORDER BY keyword, elo_rating DESC;
  $$
);

-- 4c. Stale job cleanup — runs at 3am UTC daily
--     Marks grading jobs stuck in 'processing' > 10 min as 'failed'
SELECT cron.schedule(
  'cleanup-stale-grading-jobs',
  '0 3 * * *',
  $$
    UPDATE arena_grading_jobs
    SET status = 'failed', error_msg = 'Timed out — worker did not complete within 10 minutes'
    WHERE status = 'processing'
      AND created_at < now() - INTERVAL '10 minutes';
  $$
);

-- ── 5. Verify setup ───────────────────────────────────────────────────────────
SELECT queue_name, is_partitioned, is_unlogged
FROM pgmq.list_queues();

SELECT jobid, jobname, schedule, active
FROM cron.job
ORDER BY jobid;
