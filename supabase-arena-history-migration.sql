-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  CAPABILIO — arena_history table                                ║
-- ║  Run this in: Supabase Dashboard → SQL Editor → Run             ║
-- ║  Target project: eybchcqwbizjmzyrviri (your MAIN app DB)        ║
-- ║  Safe to re-run (uses IF NOT EXISTS / IF NOT EXISTS policies)   ║
-- ╚═══════════════════════════════════════════════════════════════════╝

-- ─── 1. Create the table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arena_history (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id              TEXT,                         -- challenge id or slug
  title                TEXT        NOT NULL DEFAULT 'Arena Challenge',
  domain               TEXT        NOT NULL DEFAULT 'swe',
  skill_id             TEXT,
  skill_name           TEXT,
  skill_category       TEXT,
  workstation_type     TEXT,
  difficulty           TEXT        DEFAULT 'Medium',
  scenario             TEXT,
  objective            TEXT,
  expected_output      TEXT,
  user_answer          TEXT,
  feedback             TEXT,
  score                INTEGER     DEFAULT 0,
  elo_delta            INTEGER     DEFAULT 0,
  type                 TEXT        DEFAULT 'dsa',
  visible_in_portfolio BOOLEAN     DEFAULT true,
  visible_in_aura      BOOLEAN     DEFAULT true,
  completed_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_arena_history_user     ON arena_history(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_history_domain   ON arena_history(domain);
CREATE INDEX IF NOT EXISTS idx_arena_history_task     ON arena_history(task_id);
CREATE INDEX IF NOT EXISTS idx_arena_history_portfolio ON arena_history(user_id, visible_in_portfolio);

-- ─── 3. Row-Level Security ────────────────────────────────────────────────────
ALTER TABLE arena_history ENABLE ROW LEVEL SECURITY;

-- Drop first so re-running is idempotent
DROP POLICY IF EXISTS "arena_history_insert_own"   ON arena_history;
DROP POLICY IF EXISTS "arena_history_select_own"   ON arena_history;
DROP POLICY IF EXISTS "arena_history_select_public" ON arena_history;
DROP POLICY IF EXISTS "arena_history_manage_own"   ON arena_history;

-- Users can insert their own records
CREATE POLICY "arena_history_insert_own"
  ON arena_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own history
CREATE POLICY "arena_history_select_own"
  ON arena_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Public can read portfolio-visible records (for recruiter/portfolio views)
CREATE POLICY "arena_history_select_public"
  ON arena_history FOR SELECT TO authenticated
  USING (visible_in_portfolio = true);

-- Users can update/delete their own records
CREATE POLICY "arena_history_manage_own"
  ON arena_history FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 4. Verify ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  RAISE NOTICE '✅ arena_history table ready.';
END $$;
