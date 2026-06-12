-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  CAPABILIO — Problems Table Schema                                  ║
-- ║  Run this FIRST before any seed files.                              ║
-- ╚══════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS problems (
  id               uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  title            text         NOT NULL,
  slug             text         UNIQUE NOT NULL,
  difficulty       text         CHECK (difficulty IN ('Easy','Medium','Hard')),
  category         text         CHECK (category IN ('DSA','SQL','System Design')),
  sub_category     text,        -- 'Arrays', 'Trees', 'DP', 'Graphs', etc.
  tags             text[],
  statement        text,        -- markdown
  constraints      text,        -- markdown
  examples         jsonb,       -- [{input, output, explanation}]
  test_cases       jsonb,       -- [{input, expected_output, is_hidden}]
  editorial        text,        -- markdown with code
  hint             text,        -- optional nudge (no spoilers)
  languages        text[],
  acceptance_rate  float        DEFAULT 0,
  solve_count      int          DEFAULT 0,
  created_at       timestamptz  DEFAULT now()
);

-- Indexes for catalog filtering
CREATE INDEX IF NOT EXISTS idx_problems_difficulty   ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_category     ON problems(category);
CREATE INDEX IF NOT EXISTS idx_problems_sub_category ON problems(sub_category);
CREATE INDEX IF NOT EXISTS idx_problems_tags         ON problems USING gin(tags);

-- Full-text search on title + statement
CREATE INDEX IF NOT EXISTS idx_problems_fts ON problems
  USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(statement,'')));

-- RLS: readable by all authenticated users
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "problems_read" ON problems;
CREATE POLICY "problems_read" ON problems
  FOR SELECT TO authenticated USING (true);

-- Admins can write (service role bypasses RLS)

DO $$ BEGIN RAISE NOTICE '✅ problems table created.'; END $$;
