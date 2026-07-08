-- ============================================================
-- CAPABILIO ARENA: Schema Migration
-- Run this FIRST in your Supabase SQL editor
-- Project: eybchcqwbizjmzyrviri (capabilio)
-- ============================================================

-- Step 1: Add new columns to problems table
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS mechanic text,
  ADD COLUMN IF NOT EXISTS track text,
  ADD COLUMN IF NOT EXISTS interaction_type text NOT NULL DEFAULT 'code',
  ADD COLUMN IF NOT EXISTS options jsonb,
  ADD COLUMN IF NOT EXISTS assets jsonb;

-- Step 2: Add constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'problems_interaction_type_check'
  ) THEN
    ALTER TABLE problems ADD CONSTRAINT problems_interaction_type_check
      CHECK (interaction_type IN ('code','calculator','multiple_choice','sequence','diagram_click'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'problems_mechanic_check'
  ) THEN
    ALTER TABLE problems ADD CONSTRAINT problems_mechanic_check
      CHECK (mechanic IS NULL OR mechanic IN (
        'calculate','predict','diagnose','interpret','select',
        'complete','sequence','compare','optimise','inspect','design_lite','troubleshoot'));
  END IF;
END $$;

-- Step 3: Backfill existing calculator-type problems
UPDATE problems
  SET interaction_type = 'calculator'
  WHERE 'calculator' = ANY(languages)
    AND interaction_type = 'code';

-- Step 4: Indexes for arena query performance
CREATE INDEX IF NOT EXISTS idx_problems_interaction_type ON problems(interaction_type);
CREATE INDEX IF NOT EXISTS idx_problems_track ON problems(track);
CREATE INDEX IF NOT EXISTS idx_problems_mechanic ON problems(mechanic);
CREATE INDEX IF NOT EXISTS idx_problems_source_interaction ON problems(source, interaction_type);
CREATE INDEX IF NOT EXISTS idx_problems_category_source ON problems(category, source);

-- ============================================================
-- Verification: run after migration
-- ============================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'problems'
-- ORDER BY ordinal_position;
