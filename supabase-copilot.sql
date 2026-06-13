-- ============================================================
-- Capabilio AI Career Copilot — Database Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. copilot_usage — monthly question counter (free tier)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS copilot_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month           DATE NOT NULL,       -- first day of month e.g. 2026-06-01
  question_count  INTEGER NOT NULL DEFAULT 0,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, month)
);

CREATE INDEX IF NOT EXISTS copilot_usage_user_month_idx ON copilot_usage(user_id, month);

ALTER TABLE copilot_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_copilot_usage" ON copilot_usage
  FOR ALL USING (auth.uid() = user_id);

-- Function to increment usage count safely (upsert)
CREATE OR REPLACE FUNCTION increment_copilot_usage(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_month         DATE;
  v_new_count     INTEGER;
BEGIN
  v_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  INSERT INTO copilot_usage (user_id, month, question_count, last_used_at)
  VALUES (p_user_id, v_month, 1, NOW())
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    question_count = copilot_usage.question_count + 1,
    last_used_at   = NOW()
  RETURNING question_count INTO v_new_count;

  RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current month question count
CREATE OR REPLACE FUNCTION get_monthly_question_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(
    (SELECT question_count FROM copilot_usage
     WHERE user_id = p_user_id
       AND month = DATE_TRUNC('month', CURRENT_DATE)::DATE),
    0
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────
-- 2. copilot_conversations — full chat history
-- ──────────────────────────────────────────────────────────

DROP TABLE IF EXISTS copilot_conversations CASCADE;

CREATE TABLE copilot_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Session grouping (one session = one chat widget open period)
  session_id      TEXT NOT NULL,

  -- Message content
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,

  -- Classification metadata
  intent          TEXT CHECK (intent IN ('CAREER', 'BLOCKED')),
  bucket          TEXT,                         -- topic bucket slug
  was_blocked     BOOLEAN DEFAULT FALSE,

  -- Tier/model tracking
  tier_at_time    TEXT CHECK (tier_at_time IN ('free', 'pro', 'elite')),
  model_used      TEXT,
  tokens_used     INTEGER,
  latency_ms      INTEGER,

  -- Ordering within session
  sequence_num    INTEGER,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX copilot_conv_user_session_idx  ON copilot_conversations(user_id, session_id);
CREATE INDEX copilot_conv_user_created_idx  ON copilot_conversations(user_id, created_at DESC);
CREATE INDEX copilot_conv_session_seq_idx   ON copilot_conversations(session_id, sequence_num);

ALTER TABLE copilot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_conversations" ON copilot_conversations
  FOR ALL USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- 3. copilot_sessions — session metadata
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS copilot_sessions (
  id              TEXT PRIMARY KEY,             -- UUID string, same as session_id
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier_at_start   TEXT CHECK (tier_at_start IN ('free', 'pro', 'elite')),
  message_count   INTEGER DEFAULT 0,
  last_bucket     TEXT,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE INDEX copilot_sessions_user_idx ON copilot_sessions(user_id);
CREATE INDEX copilot_sessions_active_idx ON copilot_sessions(user_id, is_active);

ALTER TABLE copilot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_copilot_sessions" ON copilot_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Auto-increment session message count on new conversation row
CREATE OR REPLACE FUNCTION sync_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO copilot_sessions (id, user_id, tier_at_start, message_count, started_at)
  VALUES (NEW.session_id, NEW.user_id, NEW.tier_at_time, 1, NOW())
  ON CONFLICT (id) DO UPDATE SET
    message_count = copilot_sessions.message_count + 1,
    last_bucket   = COALESCE(NEW.bucket, copilot_sessions.last_bucket);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER copilot_session_sync
  AFTER INSERT ON copilot_conversations
  FOR EACH ROW EXECUTE FUNCTION sync_session_message_count();

-- ──────────────────────────────────────────────────────────
-- 4. Extend profiles table for copilot preferences
-- ──────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS copilot_enabled       BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS copilot_onboarded     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS copilot_last_seen_at  TIMESTAMPTZ;

-- ──────────────────────────────────────────────────────────
-- 5. View: copilot_user_stats (for admin / analytics)
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW copilot_user_stats AS
SELECT
  p.id                            AS user_id,
  p.name,
  p.subscription,
  p.copilot_last_seen_at,
  -- Monthly usage (current month)
  COALESCE(u.question_count, 0)   AS questions_this_month,
  -- All-time messages
  COALESCE(c.total_messages, 0)   AS total_messages,
  -- Sessions count
  COALESCE(s.session_count, 0)    AS total_sessions,
  -- Blocked rate
  COALESCE(c.blocked_count, 0)    AS blocked_messages,
  CASE WHEN COALESCE(c.total_messages, 0) > 0
    THEN ROUND(100.0 * c.blocked_count / c.total_messages, 1)
    ELSE 0
  END                             AS blocked_pct

FROM profiles p

LEFT JOIN copilot_usage u
  ON u.user_id = p.id
  AND u.month = DATE_TRUNC('month', CURRENT_DATE)::DATE

LEFT JOIN (
  SELECT
    user_id,
    COUNT(*) FILTER (WHERE role = 'user')                   AS total_messages,
    COUNT(*) FILTER (WHERE was_blocked = TRUE)              AS blocked_count
  FROM copilot_conversations
  GROUP BY user_id
) c ON c.user_id = p.id

LEFT JOIN (
  SELECT user_id, COUNT(*) AS session_count
  FROM copilot_sessions
  GROUP BY user_id
) s ON s.user_id = p.id;

-- ──────────────────────────────────────────────────────────
-- 6. Cleanup: auto-delete conversations older than 90 days
--    (optional — run as a scheduled Supabase job)
-- ──────────────────────────────────────────────────────────

-- To enable: create a pg_cron job in Supabase dashboard:
-- SELECT cron.schedule('copilot-cleanup', '0 3 * * 0',
--   $$DELETE FROM copilot_conversations WHERE created_at < NOW() - INTERVAL '90 days'$$);

-- ──────────────────────────────────────────────────────────
-- 7. Helper: get conversation history for context window
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_copilot_history(
  p_user_id   UUID,
  p_session_id TEXT,
  p_limit     INTEGER DEFAULT 20
)
RETURNS TABLE (
  role       TEXT,
  content    TEXT,
  created_at TIMESTAMPTZ
) AS $$
  SELECT role, content, created_at
  FROM copilot_conversations
  WHERE user_id   = p_user_id
    AND session_id = p_session_id
    AND was_blocked = FALSE
  ORDER BY created_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;
