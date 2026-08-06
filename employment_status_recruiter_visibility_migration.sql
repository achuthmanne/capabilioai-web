-- ─────────────────────────────────────────────────────────────────────────────
-- profiles.employment_status — mandatory second gate on recruiter visibility
-- FIXES: the product rule "actively-employed professionals must never be
-- visible to recruiters" had NO enforcement mechanism at all.
-- profiles.recruiter_discoverable (recruiter_discoverable_opt_in migration,
-- 2026-08-05) is a one-time manual privacy toggle with no connection to
-- whether the person is actually employed — once flipped on, a professional
-- stays visible in recruiter search indefinitely, even if they're not
-- looking and never touch the setting again.
--
-- This adds a second column that must ALSO be set (to 'notice_period' or
-- 'discoverable') for a profile to appear in recruiter search —
-- recruiter_discoverable alone is no longer sufficient. Defaults to the
-- safest state ('active_hidden') for every existing row, so this migration
-- is a deliberate TIGHTENING: professionals who previously had
-- recruiter_discoverable=true will disappear from recruiter search results
-- immediately after this runs, until they explicitly set their employment
-- status in Settings. That's the intended fix, not a side effect — see
-- backend/server/routes/recruiterSearch.js and partnerBridge.js, both
-- updated in the same change to require this column.
--
-- Idempotent: safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT 'active_hidden',
  ADD COLUMN IF NOT EXISTS notice_period_ends_at DATE DEFAULT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_employment_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_employment_status_check
      CHECK (employment_status IN ('active_hidden', 'notice_period', 'discoverable'));
  END IF;
END $$;

-- Recruiter search always filters on (recruiter_discoverable = true AND
-- employment_status <> 'active_hidden') together — index both so that
-- combined filter stays a single index scan rather than a full table scan
-- + filter as the profiles table grows.
CREATE INDEX IF NOT EXISTS idx_profiles_recruiter_visibility
  ON public.profiles (recruiter_discoverable, employment_status)
  WHERE recruiter_discoverable = true;

DO $$ BEGIN RAISE NOTICE '✅ profiles.employment_status column + index added.'; END $$;
