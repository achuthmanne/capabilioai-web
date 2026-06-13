-- ============================================================
-- Capabilio Career Timeline Migration (safe recreate)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop old table + dependent views/policies cleanly
DROP VIEW IF EXISTS career_timeline_public CASCADE;
DROP VIEW IF EXISTS career_timeline_recruiter CASCADE;
DROP TABLE IF EXISTS career_timeline CASCADE;

-- Career Timeline table
CREATE TABLE career_timeline (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category            TEXT NOT NULL CHECK (category IN (
                        'education',
                        'academic_project',
                        'internship',
                        'professional_experience',
                        'personal_project',
                        'arena_challenge',
                        'certification'
                      )),
  title               TEXT NOT NULL,
  role                TEXT,
  sub_type            TEXT,
  domain              TEXT,
  institution         TEXT,
  company             TEXT,
  company_domain      TEXT,
  start_date          DATE NOT NULL,
  end_date            DATE,
  is_current          BOOLEAN DEFAULT FALSE,

  -- Proof and verification
  proof_links         JSONB DEFAULT '[]'::jsonb,
  verification_level  SMALLINT NOT NULL DEFAULT 0 CHECK (verification_level BETWEEN 0 AND 4),
  verified_at         TIMESTAMPTZ,
  verifier_source     TEXT,

  -- Content
  description         TEXT,
  impact_summary      TEXT,
  responsibilities    TEXT[] DEFAULT '{}',
  achievements        TEXT[] DEFAULT '{}',
  tech_stack          TEXT[] DEFAULT '{}',
  tags                TEXT[] DEFAULT '{}',

  -- Visibility and display
  visibility          TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'recruiter', 'private')),
  is_highlighted      BOOLEAN DEFAULT FALSE,
  is_featured         BOOLEAN DEFAULT FALSE,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                        'active', 'completed', 'draft', 'needs_proof',
                        'expired', 'disputed', 'archived'
                      )),

  -- Aura integration
  aura_contribution   INTEGER DEFAULT 0,
  affects_skill_graph BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  source              TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
                        'manual', 'linkedin_import', 'github_import', 'arena_auto'
                      ))
);

-- Indexes
CREATE INDEX career_timeline_user_id_idx        ON career_timeline(user_id);
CREATE INDEX career_timeline_category_idx       ON career_timeline(category);
CREATE INDEX career_timeline_user_category_idx  ON career_timeline(user_id, category);
CREATE INDEX career_timeline_visibility_idx     ON career_timeline(visibility);
CREATE INDEX career_timeline_verification_idx   ON career_timeline(verification_level);

-- RLS
ALTER TABLE career_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_timeline" ON career_timeline
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_timeline" ON career_timeline
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND source != 'arena_auto'
  );

CREATE POLICY "users_update_own_timeline" ON career_timeline
  FOR UPDATE USING (
    auth.uid() = user_id
    AND source != 'arena_auto'
  );

CREATE POLICY "users_delete_own_timeline" ON career_timeline
  FOR DELETE USING (
    auth.uid() = user_id
    AND source != 'arena_auto'
  );

CREATE POLICY "public_read_public_timeline" ON career_timeline
  FOR SELECT USING (visibility = 'public');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_career_timeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER career_timeline_updated_at
  BEFORE UPDATE ON career_timeline
  FOR EACH ROW EXECUTE FUNCTION update_career_timeline_updated_at();

-- ============================================================
-- View: career_timeline_public
-- ============================================================
CREATE VIEW career_timeline_public AS
SELECT
  id, user_id, category, title, role, sub_type, domain,
  institution, company, start_date, end_date, is_current,
  proof_links, verification_level,
  description, impact_summary, tech_stack, tags,
  is_highlighted, is_featured, status, aura_contribution
FROM career_timeline
WHERE visibility = 'public'
  AND status NOT IN ('archived', 'disputed', 'draft');

-- ============================================================
-- View: career_timeline_recruiter
-- ============================================================
CREATE VIEW career_timeline_recruiter AS
SELECT
  id, user_id, category, title, role, sub_type, domain,
  institution, company, company_domain, start_date, end_date, is_current,
  proof_links, verification_level, verifier_source,
  description, impact_summary, responsibilities, achievements,
  tech_stack, tags, is_highlighted, is_featured, status, aura_contribution
FROM career_timeline
WHERE visibility IN ('public', 'recruiter')
  AND status NOT IN ('archived', 'disputed', 'draft');
