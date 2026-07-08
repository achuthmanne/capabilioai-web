-- ══════════════════════════════════════════════════════════════════════════════
-- Integrity Warning System — run this in Supabase SQL Editor (production)
-- Project: eybchcqwbizjmzyrviri (capabilio-web production)
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Audit log — one row per integrity violation
CREATE TABLE IF NOT EXISTS integrity_warnings (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  uid            TEXT        NOT NULL,
  mission_id     TEXT,
  mission_title  TEXT,
  flags          JSONB,                        -- array of { code, msg } from detectIntegrity
  verdict        TEXT,                         -- "definite_paste" | "suspicious"
  elo_penalty    INT         DEFAULT -10,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_warnings_uid ON integrity_warnings (uid);
CREATE INDEX IF NOT EXISTS idx_integrity_warnings_created ON integrity_warnings (created_at DESC);

-- 2. Add warning tracking columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS integrity_warning_count INT          DEFAULT 0,
  ADD COLUMN IF NOT EXISTS integrity_banned_until  TIMESTAMPTZ;

-- 3. Enable Row Level Security on the audit table
--    Admins (service_role) can read everything; users cannot read others' records.
ALTER TABLE integrity_warnings ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (backend uses service_role key)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'integrity_warnings' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY "service_role_all" ON integrity_warnings
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Users can only read their own warning records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'integrity_warnings' AND policyname = 'users_read_own'
  ) THEN
    CREATE POLICY "users_read_own" ON integrity_warnings
      FOR SELECT TO authenticated USING (uid = auth.uid()::TEXT);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- Verification queries — run after migration to confirm
-- ══════════════════════════════════════════════════════════════════════════════
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE 'integrity%';
-- SELECT COUNT(*) FROM integrity_warnings;
