-- Capabilio profiles migration #2 — add missing columns
-- Run in Supabase SQL Editor → New query → Run

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS "auraScore"           integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "auraScoreBreakdown"  jsonb       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "skills"              jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "recommendedTasks"    jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "githubData"          jsonb       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "githubUrl"           text,
  ADD COLUMN IF NOT EXISTS "linkedinUrl"         text,
  ADD COLUMN IF NOT EXISTS "personalInfo"        jsonb       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "interviewTranscripts" jsonb      DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "marketReports"       jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "subscriptionCycleStart" text,
  ADD COLUMN IF NOT EXISTS "eloHistory"          jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "codeDNA"             jsonb       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "page_visibility"     jsonb       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "vault_files"         jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "createdAt"           text,
  ADD COLUMN IF NOT EXISTS "onboardingComplete"  boolean     DEFAULT false;
