-- Add arena_decay_applied_at column to profiles table
-- This is the single ELO decay cursor shared by Arena and Aura.
-- Run this in eybchcqwbizjmzyrviri → SQL Editor BEFORE deploying the updated frontend.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS arena_decay_applied_at TIMESTAMPTZ DEFAULT NULL;

-- Index for the decay check query (Arena reads this on every page load)
CREATE INDEX IF NOT EXISTS idx_profiles_arena_decay_applied_at
  ON profiles (id, arena_decay_applied_at);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'arena_decay_applied_at';
