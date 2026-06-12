-- ══════════════════════════════════════════════════════════════
-- CAPABILIO — FINAL PROFILES MIGRATION
-- Run once in Supabase SQL Editor → New query → Run
-- Safe to re-run (uses IF NOT EXISTS)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE profiles
  -- Identity & display
  ADD COLUMN IF NOT EXISTS "displayName"            text,
  ADD COLUMN IF NOT EXISTS "username"               text,
  ADD COLUMN IF NOT EXISTS "name"                   text,
  ADD COLUMN IF NOT EXISTS "avatarUrl"              text,
  ADD COLUMN IF NOT EXISTS "coverPosition"          text,

  -- Path & domain
  ADD COLUMN IF NOT EXISTS "path"                   text        DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS "keyword"                text,
  ADD COLUMN IF NOT EXISTS "accountType"            text,

  -- ELO
  ADD COLUMN IF NOT EXISTS "eloRating"              integer     DEFAULT 400,
  ADD COLUMN IF NOT EXISTS "baseElo"                integer     DEFAULT 400,
  ADD COLUMN IF NOT EXISTS "initialElo"             integer     DEFAULT 400,
  ADD COLUMN IF NOT EXISTS "eloHistory"             jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "eloDecayDate"           text,
  ADD COLUMN IF NOT EXISTS "eloDecayToday"          integer     DEFAULT 0,

  -- Onboarding
  ADD COLUMN IF NOT EXISTS "onboardingComplete"     boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS "createdAt"              text,

  -- Assessment
  ADD COLUMN IF NOT EXISTS "assessmentType"         text,
  ADD COLUMN IF NOT EXISTS "assessmentScore"        integer,
  ADD COLUMN IF NOT EXISTS "assessmentTotal"        integer,
  ADD COLUMN IF NOT EXISTS "score"                  text,
  ADD COLUMN IF NOT EXISTS "jobReadiness"           integer     DEFAULT 0,

  -- Skills & profile
  ADD COLUMN IF NOT EXISTS "skillGraph"             jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "skills"                 jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "strengths"              jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "weakAreas"              jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "profileSummary"         text,
  ADD COLUMN IF NOT EXISTS "recommendedTasks"       jsonb       DEFAULT '[]',

  -- Aura / Orbit profile score
  ADD COLUMN IF NOT EXISTS "auraScore"              integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "auraScoreBreakdown"     jsonb       DEFAULT '{}',

  -- Experiences & projects
  ADD COLUMN IF NOT EXISTS "experiences"            jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "resumeProjects"         jsonb       DEFAULT '[]',

  -- Vault & resume
  ADD COLUMN IF NOT EXISTS "vaultFiles"             jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "resumeFileName"         text,
  ADD COLUMN IF NOT EXISTS "resumeUploadedAt"       text,

  -- GitHub & LinkedIn
  ADD COLUMN IF NOT EXISTS "githubUsername"         text,
  ADD COLUMN IF NOT EXISTS "githubUrl"              text,
  ADD COLUMN IF NOT EXISTS "githubData"             jsonb       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "linkedinUrl"            text,
  ADD COLUMN IF NOT EXISTS "codeDNA"                jsonb       DEFAULT '{}',

  -- Arena
  ADD COLUMN IF NOT EXISTS "arenaCompleted"         integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "arenaStreak"            integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "arenaLastActive"        text,
  ADD COLUMN IF NOT EXISTS "arenaHistory"           jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "arenaSubmissions"       jsonb       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "completedTopics"        jsonb       DEFAULT '[]',

  -- SkillStudio
  ADD COLUMN IF NOT EXISTS "skillStudioXP"                integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "skillStudioStreak"            integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "skillStudioCompletedActions"  jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "lastLearned"                  text,
  ADD COLUMN IF NOT EXISTS "learningHistory"              jsonb       DEFAULT '[]',

  -- Subscription
  ADD COLUMN IF NOT EXISTS "subscription"           text        DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS "subscriptionCycleStart" text,

  -- Reports & interviews
  ADD COLUMN IF NOT EXISTS "marketReports"          jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "interviewTranscripts"   jsonb       DEFAULT '[]',

  -- Other
  ADD COLUMN IF NOT EXISTS "personalInfo"           jsonb       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "page_visibility"        jsonb       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "vault_files"            jsonb       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "activePortfolioTheme"   text,
  ADD COLUMN IF NOT EXISTS "activePortfolioTemplate" text,
  ADD COLUMN IF NOT EXISTS "purchasedTemplates"     jsonb       DEFAULT '{}';

-- Ensure trigger exists for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, "onboardingComplete", "eloRating", "path")
  VALUES (new.id, new.email, now(), false, 400, 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
