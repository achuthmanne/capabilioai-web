-- ══════════════════════════════════════════════════════════════
-- CAPABILIO — Fix handle_new_user trigger
-- The old trigger seeds elo_rating=800 and path='professional'
-- for every new user regardless of their actual path.
-- This migration fixes the defaults to 400 + 'student'.
--
-- Run once in Supabase SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════

-- 1. Fix the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, created_at,
    onboarding_complete,
    elo_rating,
    path,
    subscription
  )
  VALUES (
    new.id,
    new.email,
    now(),
    false,
    400,        -- student base ELO (was wrongly 800)
    'student',  -- neutral default (was wrongly 'professional')
    'free'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Fix existing users who were wrongly seeded with elo_rating=800, path='professional'
--    but never completed onboarding (so they have onboarding_complete = false)
UPDATE profiles
SET
  elo_rating = 400,
  path       = 'student'
WHERE
  onboarding_complete = false
  AND elo_rating = 800
  AND path = 'professional';

-- 4. Also fix the arena ELO update function to use 400 as floor for students
--    (was COALESCE(elo_rating, 800) which defaulted to 800 for nulls)
CREATE OR REPLACE FUNCTION public.update_user_elo(uid uuid, delta integer)
RETURNS void AS $$
DECLARE
  current_elo integer;
  user_path   text;
  floor_elo   integer;
BEGIN
  SELECT elo_rating, path INTO current_elo, user_path FROM profiles WHERE id = uid;
  floor_elo := CASE WHEN user_path IN ('professional','authority') THEN 800 ELSE 400 END;
  UPDATE profiles
    SET elo_rating = GREATEST(floor_elo, COALESCE(current_elo, floor_elo) + delta)
    WHERE id = uid;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
