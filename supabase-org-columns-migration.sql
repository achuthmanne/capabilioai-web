-- ─── Add missing columns to profiles ────────────────────────────────────────
-- Run this in your Supabase project → SQL Editor → New query → Run
--
-- Safe to run multiple times (IF NOT EXISTS guards every column).
-- Covers:
--   • Authority / institution onboarding fields
--   • New organisation onboarding fields (college + company)

ALTER TABLE public.profiles
  -- ── Authority / institution core ──────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS "authorityType"      TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS "company"            TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS "role"               TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS "bio"                TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS "website"            TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS "authorityEmail"     TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS "linkedInUrl"        TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS "verifiedAuthority"  BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT        DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "openTo"             JSONB       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "pageVisibility"     JSONB       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "onboarding_complete" BOOLEAN    DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "followers"          INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "following"          INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "posts"              INTEGER     DEFAULT 0,

  -- ── New org onboarding fields ──────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS org_type             TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_name             TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_admin_name       TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_admin_role       TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_inst_type        TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_location         TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_batch_size       TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_departments      TEXT[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS org_naac_grade       TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_website          TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_industry         TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_company_size     TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_hiring_volume    TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_current_ats      TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_key_roles        TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_gst_cin          TEXT        DEFAULT '';
