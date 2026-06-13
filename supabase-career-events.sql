-- ============================================================
-- Capabilio Employment Verification & Professional ELO
-- Run in Supabase SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. companies reference table
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  domain          TEXT,
  epfo_codes      TEXT[] DEFAULT '{}',
  tier            SMALLINT DEFAULT 3 CHECK (tier BETWEEN 1 AND 5),
  country         TEXT DEFAULT 'IN',
  sector          TEXT,
  logo_url        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS companies_normalized_idx ON companies(normalized_name);
CREATE INDEX IF NOT EXISTS companies_domain_idx     ON companies(domain);

-- ──────────────────────────────────────────────────────────
-- 2. career_events table
-- ──────────────────────────────────────────────────────────

DROP TABLE IF EXISTS career_events CASCADE;

CREATE TABLE career_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL CHECK (event_type IN (
                        'first_job','company_join','company_exit_clean',
                        'company_exit_involuntary',
                        'tenure_6m','tenure_1y','tenure_2y','tenure_3y','tenure_yearly',
                        'promotion_verified','promotion_self',
                        'leadership_entry','international_role',
                        'company_switch_upward','company_switch_lateral',
                        'project_outcome','skill_verified',
                        'gap_short','gap_long','arena_professional'
                      )),
  company_name        TEXT,
  company_id          UUID REFERENCES companies(id),
  role_title          TEXT,
  department          TEXT,
  seniority_level     TEXT CHECK (seniority_level IN (
                        'intern','junior','mid','senior','lead','staff',
                        'principal','manager','director','vp','c_suite'
                      )),
  start_date          DATE,
  end_date            DATE,
  is_current          BOOLEAN DEFAULT FALSE,

  -- Verification
  verification_status TEXT NOT NULL DEFAULT 'pending'
                      CHECK (verification_status IN (
                        'pending','verified','self_claimed','disputed','rejected'
                      )),
  verification_level  SMALLINT DEFAULT 0 CHECK (verification_level BETWEEN 0 AND 4),
  source_type         TEXT NOT NULL CHECK (source_type IN (
                        'epfo','umang','digilocker','employer_email',
                        'offer_letter','linkedin','manual_review',
                        'system_auto','self_claimed'
                      )),
  verified_at         TIMESTAMPTZ,
  verifier_ref        TEXT,

  -- ELO
  elo_delta           INTEGER DEFAULT 0,
  elo_applied         BOOLEAN DEFAULT FALSE,
  elo_applied_at      TIMESTAMPTZ,

  -- Content
  impact_summary      TEXT,
  visibility          TEXT NOT NULL DEFAULT 'recruiter'
                      CHECK (visibility IN ('public','recruiter','private')),
  tags                TEXT[] DEFAULT '{}',
  timeline_category   TEXT CHECK (timeline_category IN (
                        'professional_experience','internship',
                        'leadership','career_transition'
                      )),

  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  raw_source_data     JSONB        -- stores encrypted EPFO payload reference
);

CREATE INDEX career_events_user_id_idx      ON career_events(user_id);
CREATE INDEX career_events_type_idx         ON career_events(event_type);
CREATE INDEX career_events_verify_idx       ON career_events(verification_status);
CREATE INDEX career_events_company_idx      ON career_events(company_id);
CREATE INDEX career_events_dates_idx        ON career_events(user_id, start_date, end_date);

ALTER TABLE career_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_career_events" ON career_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "public_read_public_events" ON career_events
  FOR SELECT USING (visibility = 'public');

CREATE OR REPLACE FUNCTION update_career_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER career_events_updated_at
  BEFORE UPDATE ON career_events
  FOR EACH ROW EXECUTE FUNCTION update_career_events_updated_at();

-- ──────────────────────────────────────────────────────────
-- 3. path_transitions table
-- ──────────────────────────────────────────────────────────

DROP TABLE IF EXISTS path_transitions CASCADE;

CREATE TABLE path_transitions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_path         TEXT NOT NULL,
  to_path           TEXT NOT NULL,
  trigger_event_id  UUID REFERENCES career_events(id),
  trigger_source    TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','disputed','reverted')),
  confirmed_at      TIMESTAMPTZ,
  reverted_at       TIMESTAMPTZ,
  revert_reason     TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX path_transitions_user_id_idx ON path_transitions(user_id);

ALTER TABLE path_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_transitions" ON path_transitions
  FOR SELECT USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- 4. professional_elo_history table
-- ──────────────────────────────────────────────────────────

DROP TABLE IF EXISTS professional_elo_history CASCADE;

CREATE TABLE professional_elo_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES career_events(id),
  previous_elo      INTEGER NOT NULL,
  delta             INTEGER NOT NULL,
  new_elo           INTEGER NOT NULL,
  event_type        TEXT NOT NULL,
  verification_src  TEXT NOT NULL,
  reason            TEXT NOT NULL,
  affected_sections TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX prof_elo_history_user_idx     ON professional_elo_history(user_id);
CREATE INDEX prof_elo_history_created_idx  ON professional_elo_history(created_at DESC);

ALTER TABLE professional_elo_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_elo_history" ON professional_elo_history
  FOR SELECT USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- 5. Extend profiles table
-- ──────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS professional_elo        INTEGER DEFAULT 600,
  ADD COLUMN IF NOT EXISTS blended_elo             INTEGER,
  ADD COLUMN IF NOT EXISTS path_status             TEXT DEFAULT 'student'
                                                   CHECK (path_status IN (
                                                     'student','transitioning','professional'
                                                   )),
  ADD COLUMN IF NOT EXISTS uan_verified            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS uan_verified_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recruiter_trust_score   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_tenure_months  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_companies         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_company         TEXT,
  ADD COLUMN IF NOT EXISTS current_role_title      TEXT,
  ADD COLUMN IF NOT EXISTS career_started_at       DATE,
  ADD COLUMN IF NOT EXISTS company_email_verified  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS employment_self_confirmed BOOLEAN DEFAULT FALSE;

-- ──────────────────────────────────────────────────────────
-- 6. Trigger: apply ELO when career_event verified
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION apply_career_event_elo()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_elo      INTEGER;
  v_new_elo       INTEGER;
  v_blended_elo   INTEGER;
  v_arena_elo     INTEGER;
BEGIN
  -- Only process when elo_delta is set and not yet applied
  IF NEW.elo_delta = 0 OR NEW.elo_applied = TRUE THEN
    RETURN NEW;
  END IF;
  -- Only apply for sufficiently verified events
  IF NEW.verification_level < 2 THEN
    RETURN NEW;
  END IF;

  SELECT professional_elo, COALESCE(elo_rating, 600)
    INTO v_prev_elo, v_arena_elo
    FROM profiles WHERE id = NEW.user_id;

  v_new_elo := GREATEST(400, v_prev_elo + NEW.elo_delta);

  -- Compute blended ELO (arena 40% + professional 60%)
  v_blended_elo := ROUND(v_arena_elo * 0.40 + v_new_elo * 0.60);

  -- Update profiles
  UPDATE profiles
    SET professional_elo = v_new_elo,
        blended_elo      = v_blended_elo
  WHERE id = NEW.user_id;

  -- Write audit entry
  INSERT INTO professional_elo_history(
    user_id, event_id, previous_elo, delta, new_elo,
    event_type, verification_src, reason, affected_sections
  ) VALUES (
    NEW.user_id, NEW.id, v_prev_elo, NEW.elo_delta, v_new_elo,
    NEW.event_type, NEW.source_type,
    COALESCE(NEW.impact_summary, NEW.event_type || ' at ' || COALESCE(NEW.company_name, 'unknown')),
    ARRAY['aura_score','professional_elo','recruiter_trust']
  );

  -- Mark applied
  NEW.elo_applied    := TRUE;
  NEW.elo_applied_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER career_event_elo_apply
  BEFORE UPDATE OF verification_status ON career_events
  FOR EACH ROW
  WHEN (NEW.verification_status = 'verified' AND OLD.verification_status != 'verified')
  EXECUTE FUNCTION apply_career_event_elo();

-- ──────────────────────────────────────────────────────────
-- 7. Trigger: evaluate path transition on career_event insert/update
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION evaluate_path_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_current_path  TEXT;
  v_has_v3_job    BOOLEAN;
  v_epfo_days     NUMERIC;
BEGIN
  SELECT path_status INTO v_current_path FROM profiles WHERE id = NEW.user_id;

  -- Already professional — nothing to do
  IF v_current_path = 'professional' THEN RETURN NEW; END IF;

  -- Condition A: first_job event, V3+
  IF NEW.event_type = 'first_job' AND NEW.verification_level >= 3 THEN
    UPDATE profiles SET path_status = 'professional' WHERE id = NEW.user_id;
    INSERT INTO path_transitions(user_id, from_path, to_path, trigger_event_id,
                                 trigger_source, status, confirmed_at)
    VALUES (NEW.user_id, v_current_path, 'professional', NEW.id,
            NEW.source_type, 'confirmed', NOW());
    RETURN NEW;
  END IF;

  -- Condition B: EPFO events with 90+ days total
  SELECT COALESCE(SUM(
    EXTRACT(DAY FROM (COALESCE(end_date, CURRENT_DATE) - start_date))
  ), 0)
  INTO v_epfo_days
  FROM career_events
  WHERE user_id = NEW.user_id
    AND source_type IN ('epfo','umang','digilocker')
    AND start_date IS NOT NULL;

  IF v_epfo_days >= 90 THEN
    UPDATE profiles SET path_status = 'professional' WHERE id = NEW.user_id;
    INSERT INTO path_transitions(user_id, from_path, to_path, trigger_event_id,
                                 trigger_source, status, confirmed_at)
    VALUES (NEW.user_id, v_current_path, 'professional', NEW.id,
            'epfo', 'confirmed', NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER career_transition_check
  AFTER INSERT OR UPDATE OF verification_status ON career_events
  FOR EACH ROW EXECUTE FUNCTION evaluate_path_transition();

-- ──────────────────────────────────────────────────────────
-- 8. View: professional_career_summary
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW professional_career_summary AS
SELECT
  p.id                    AS user_id,
  p.name,
  p.path_status,
  p.uan_verified,
  p.professional_elo,
  p.blended_elo,
  p.recruiter_trust_score,
  p.verified_tenure_months,
  p.current_company,
  p.current_role_title,
  p.career_started_at,
  -- Verified event counts
  (SELECT COUNT(*) FROM career_events e
   WHERE e.user_id = p.id AND e.verification_level >= 3) AS verified_events,
  -- Self-claimed event counts
  (SELECT COUNT(*) FROM career_events e
   WHERE e.user_id = p.id AND e.source_type = 'self_claimed') AS self_claimed_events,
  -- Total companies
  (SELECT COUNT(DISTINCT company_name) FROM career_events e
   WHERE e.user_id = p.id
     AND e.event_type IN ('first_job','company_join')
     AND e.verification_level >= 3) AS verified_companies
FROM profiles p
WHERE p.path_status IN ('transitioning','professional');
