-- Quick fix: make user_id nullable on pulse_posts
-- The table was created with user_id NOT NULL by an old migration,
-- but the app now uses author_id. This removes the blocking constraint.
ALTER TABLE pulse_posts ALTER COLUMN user_id DROP NOT NULL;

-- Also backfill user_id from author_id on any existing rows (safe no-op if empty)
UPDATE pulse_posts SET user_id = author_id WHERE user_id IS NULL AND author_id IS NOT NULL;
