-- ============================================================
-- Capabilio Premium Profile System — Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. Extend profiles table with media + profile fields
-- ──────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url         TEXT,
  ADD COLUMN IF NOT EXISTS avatar_thumb_url   TEXT,
  ADD COLUMN IF NOT EXISTS cover_url          TEXT,
  ADD COLUMN IF NOT EXISTS cover_focal_x      FLOAT DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS cover_focal_y      FLOAT DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS cover_theme        TEXT,
  ADD COLUMN IF NOT EXISTS bio                TEXT CHECK (char_length(bio) <= 600),
  ADD COLUMN IF NOT EXISTS headline           TEXT CHECK (char_length(headline) <= 120),
  ADD COLUMN IF NOT EXISTS location           TEXT,
  ADD COLUMN IF NOT EXISTS availability       TEXT DEFAULT 'not_specified'
                                              CHECK (availability IN (
                                                'open_roles','open_freelance',
                                                'not_looking','exploring','not_specified'
                                              )),
  ADD COLUMN IF NOT EXISTS available_from     DATE,
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public'
                                              CHECK (profile_visibility IN (
                                                'public','recruiter','private'
                                              )),
  ADD COLUMN IF NOT EXISTS career_signals     JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMPTZ DEFAULT NOW();

-- ──────────────────────────────────────────────────────────
-- 2. user_skills table
-- ──────────────────────────────────────────────────────────

DROP TABLE IF EXISTS user_skills CASCADE;

CREATE TABLE user_skills (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identity
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL,
  group_type            TEXT NOT NULL CHECK (group_type IN (
                          'core','domain','proof','tool_stack',
                          'growth','verified_strength','career_signal'
                        )),
  domain                TEXT,
  sub_domain            TEXT,

  -- Level and scoring
  level                 TEXT CHECK (level IN (
                          'learning','beginner','developing','proficient',
                          'advanced','expert'
                        )),
  level_score           SMALLINT DEFAULT 0 CHECK (level_score BETWEEN 0 AND 100),
  self_rating           SMALLINT DEFAULT 0 CHECK (self_rating BETWEEN 0 AND 5),
  arena_score_avg       FLOAT,
  proof_count           SMALLINT DEFAULT 0,

  -- Endorsement (denormalized for fast reads)
  endorsement_score     INTEGER DEFAULT 0,
  peer_endorsement_count INTEGER DEFAULT 0,

  -- Display and ordering
  priority              SMALLINT DEFAULT 0,
  is_featured           BOOLEAN DEFAULT FALSE,
  verified              BOOLEAN DEFAULT FALSE,
  visibility            TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN (
                          'public','recruiter','private'
                        )),

  -- Tool stack fields
  tool_icon_url         TEXT,

  -- Growth skill fields
  growth_target         TEXT,
  growth_eta            DATE,
  growth_resource       TEXT CHECK (char_length(growth_resource) <= 200),

  -- System-generated fields (verified_strength, career_signal)
  confidence            FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  rationale             TEXT,
  is_system             BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  source                TEXT DEFAULT 'manual' CHECK (source IN (
                          'manual','arena_derived','cert_derived',
                          'ai_suggested','proof_derived'
                        ))
);

-- Unique: one record per user per skill per group
CREATE UNIQUE INDEX user_skills_unique_idx
  ON user_skills(user_id, slug, group_type);

-- Indexes
CREATE INDEX user_skills_user_id_idx    ON user_skills(user_id);
CREATE INDEX user_skills_group_idx      ON user_skills(user_id, group_type);
CREATE INDEX user_skills_domain_idx     ON user_skills(domain);
CREATE INDEX user_skills_visibility_idx ON user_skills(visibility);

-- RLS
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_skills" ON user_skills
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "public_read_public_skills" ON user_skills
  FOR SELECT USING (visibility = 'public');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_skills_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_skills_updated_at
  BEFORE UPDATE ON user_skills
  FOR EACH ROW EXECUTE FUNCTION update_user_skills_updated_at();

-- ──────────────────────────────────────────────────────────
-- 3. skill_endorsements table
-- ──────────────────────────────────────────────────────────

DROP TABLE IF EXISTS skill_endorsements CASCADE;

CREATE TABLE skill_endorsements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id          UUID NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,
  endorser_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  endorsement_type  TEXT NOT NULL CHECK (endorsement_type IN (
                      'arena_validated','cert_backed','employer_verified',
                      'peer','self_noted'
                    )),
  weight            SMALLINT NOT NULL CHECK (weight BETWEEN 0 AND 10),
  note              TEXT CHECK (char_length(note) <= 280),
  verified          BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX skill_endorsements_skill_id_idx
  ON skill_endorsements(skill_id);

ALTER TABLE skill_endorsements ENABLE ROW LEVEL SECURITY;

-- Anyone can read endorsements for public skills
CREATE POLICY "public_read_endorsements" ON skill_endorsements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_skills s
      WHERE s.id = skill_id AND s.visibility = 'public'
    )
  );

-- Authenticated users can add peer endorsements
CREATE POLICY "users_add_endorsements" ON skill_endorsements
  FOR INSERT WITH CHECK (
    auth.uid() = endorser_id
    AND endorsement_type = 'peer'
  );

-- Users can delete their own endorsements
CREATE POLICY "users_delete_own_endorsements" ON skill_endorsements
  FOR DELETE USING (auth.uid() = endorser_id);

-- ──────────────────────────────────────────────────────────
-- 4. Supabase Storage bucket for profile media
-- (run via Supabase dashboard Storage tab, or via Management API)
-- ──────────────────────────────────────────────────────────
-- Bucket name: profile-media
-- Public: true (for CDN delivery)
-- Allowed MIME types: image/webp, image/jpeg, image/png
-- Max file size: 5242880 (5 MB)

-- Storage RLS policies (Storage > profile-media > Policies):
--
-- SELECT (read): true  -- public CDN read
-- INSERT: auth.uid()::text = (storage.foldername(name))[1]
-- UPDATE: auth.uid()::text = (storage.foldername(name))[1]
-- DELETE: auth.uid()::text = (storage.foldername(name))[1]

-- ──────────────────────────────────────────────────────────
-- 5. Denormalization helper: update endorsement counts on skill
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_skill_endorsement_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_skills SET
    endorsement_score = (
      SELECT LEAST(COALESCE(SUM(weight), 0), 30)
      FROM skill_endorsements
      WHERE skill_id = COALESCE(NEW.skill_id, OLD.skill_id)
    ),
    peer_endorsement_count = (
      SELECT COUNT(*)::INTEGER
      FROM skill_endorsements
      WHERE skill_id = COALESCE(NEW.skill_id, OLD.skill_id)
        AND endorsement_type = 'peer'
    )
  WHERE id = COALESCE(NEW.skill_id, OLD.skill_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER skill_endorsement_counts_refresh
  AFTER INSERT OR DELETE ON skill_endorsements
  FOR EACH ROW EXECUTE FUNCTION refresh_skill_endorsement_counts();

-- ──────────────────────────────────────────────────────────
-- 6. View: profile_public — for portfolio / public pages
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW profile_public AS
SELECT
  p.id,
  p.name,
  p.headline,
  p.bio,
  p.avatar_url,
  p.avatar_thumb_url,
  p.cover_url,
  p.cover_focal_x,
  p.cover_focal_y,
  p.cover_theme,
  p.location,
  p.availability,
  p.profile_visibility,
  p.elo_rating,
  p.job_role,
  p.path,
  p.career_signals,
  p.profile_updated_at,
  -- Aggregated public skills (JSON array)
  (
    SELECT json_agg(s ORDER BY s.priority ASC, s.level_score DESC)
    FROM user_skills s
    WHERE s.user_id = p.id
      AND s.visibility = 'public'
      AND s.group_type IN ('core', 'domain', 'proof', 'verified_strength', 'career_signal')
  ) AS skills
FROM profiles p
WHERE p.profile_visibility = 'public';

-- ──────────────────────────────────────────────────────────
-- 7. Seed: default skill groups for existing users (optional)
-- Only run if you want to backfill empty skill records
-- ──────────────────────────────────────────────────────────
-- (intentionally left empty — skills should be entered by users,
--  not seeded with fabricated data)
