-- ══════════════════════════════════════════════════════════════════════════════
-- CAPABILIO PROFESSIONAL PATH — COMPLETE MIGRATION
-- Run once in Supabase SQL Editor (safe to re-run, all IF NOT EXISTS)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Extend profiles table ─────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS name                    text,
  ADD COLUMN IF NOT EXISTS headline                text,
  ADD COLUMN IF NOT EXISTS location                text,
  ADD COLUMN IF NOT EXISTS phone                   text,
  ADD COLUMN IF NOT EXISTS profile_photo_url       text,
  ADD COLUMN IF NOT EXISTS cover_photo_url         text,
  ADD COLUMN IF NOT EXISTS linkedin_url            text,
  ADD COLUMN IF NOT EXISTS github_url              text,
  ADD COLUMN IF NOT EXISTS github_username         text,
  ADD COLUMN IF NOT EXISTS github_data             jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resume_file_name        text,
  ADD COLUMN IF NOT EXISTS resume_uploaded_at      timestamptz,
  ADD COLUMN IF NOT EXISTS resume_storage_path     text,
  ADD COLUMN IF NOT EXISTS personal_info           jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS education               jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS resume_projects         jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS current_company         text,
  ADD COLUMN IF NOT EXISTS current_role_title      text,
  ADD COLUMN IF NOT EXISTS years_of_experience     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_role             text,
  ADD COLUMN IF NOT EXISTS target_companies        jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS notice_period_days      integer,
  ADD COLUMN IF NOT EXISTS expected_salary_lpa     numeric,
  ADD COLUMN IF NOT EXISTS current_salary_lpa      numeric,
  ADD COLUMN IF NOT EXISTS verification_state      text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS epfo_verified           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS epfo_uan                text,
  ADD COLUMN IF NOT EXISTS epfo_verified_at        timestamptz,
  ADD COLUMN IF NOT EXISTS identity_verified       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility_mode         text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS open_to_work            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS open_to_roles           jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS role_elo                integer DEFAULT 800,
  ADD COLUMN IF NOT EXISTS market_elo              integer DEFAULT 600,
  ADD COLUMN IF NOT EXISTS proof_elo               integer DEFAULT 400,
  ADD COLUMN IF NOT EXISTS mobility_elo            integer DEFAULT 500,
  ADD COLUMN IF NOT EXISTS aura_score              integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aura_score_breakdown    jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS job_readiness           integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_completeness    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS market_reports          jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS interview_transcripts   jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS comp_intelligence       jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS layoff_risk_score       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS career_resilience_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_mentor               boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS mentor_hourly_rate      numeric,
  ADD COLUMN IF NOT EXISTS mentor_payout_cycle     text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS subscription_plan       text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_order_id   text;

-- ── 2. Career Timeline ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS career_timeline (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company         text NOT NULL,
  company_logo    text,
  company_desc    text,
  role_title      text NOT NULL,
  job_type        text DEFAULT 'full-time',
  location        text,
  work_mode       text DEFAULT 'office',
  start_date      date NOT NULL,
  end_date        date,
  is_current      boolean DEFAULT false,
  description     text,
  achievements    jsonb DEFAULT '[]',
  technologies    jsonb DEFAULT '[]',
  skills_used     jsonb DEFAULT '[]',
  projects        jsonb DEFAULT '[]',
  verification_state text DEFAULT 'unverified',
  verified_by     text,
  verified_at     timestamptz,
  source_tags     jsonb DEFAULT '[]',
  pending_changes jsonb DEFAULT '{}',
  version_history jsonb DEFAULT '[]',
  jd_summary      text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_career_timeline_user ON career_timeline(user_id);
ALTER TABLE career_timeline ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own timeline" ON career_timeline USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. EPFO Verifications ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS epfo_verifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  uan             text,
  submission_data jsonb DEFAULT '{}',
  status          text DEFAULT 'pending',
  matched_entries jsonb DEFAULT '[]',
  mismatches      jsonb DEFAULT '[]',
  verified_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE epfo_verifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own epfo" ON epfo_verifications USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. Vault Documents ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doc_type        text NOT NULL,
  file_name       text NOT NULL,
  storage_path    text NOT NULL,
  file_size       bigint,
  mime_type       text,
  tags            jsonb DEFAULT '[]',
  is_encrypted    boolean DEFAULT false,
  is_private      boolean DEFAULT false,
  password_hash   text,
  metadata        jsonb DEFAULT '{}',
  activity_log    jsonb DEFAULT '[]',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_user ON vault_documents(user_id);
ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own vault" ON vault_documents USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. Skill Graph ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_graph (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_name         text NOT NULL,
  skill_slug         text NOT NULL,
  category           text,
  domain             text,
  icon_url           text,
  color              text,
  verification_state text DEFAULT 'inferred',
  confidence_score   integer DEFAULT 50,
  elo_value          integer DEFAULT 400,
  last_proof_date    date,
  proof_source       text,
  proof_artifacts    jsonb DEFAULT '[]',
  years_used         numeric,
  is_current         boolean DEFAULT true,
  is_target          boolean DEFAULT false,
  companies_used     jsonb DEFAULT '[]',
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE(user_id, skill_slug)
);
CREATE INDEX IF NOT EXISTS idx_skill_graph_user ON skill_graph(user_id);
ALTER TABLE skill_graph ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own skills" ON skill_graph USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read skills" ON skill_graph FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 6. Forge Items ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forge_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track           text NOT NULL,
  title           text NOT NULL,
  purpose         text,
  required_proof  text,
  expected_output text,
  skill_tags      jsonb DEFAULT '[]',
  recruiter_relevance text,
  deadline        timestamptz,
  status          text DEFAULT 'not_started',
  proof_submitted_at  timestamptz,
  proof_reviewed_at   timestamptz,
  ai_evaluation   jsonb DEFAULT '{}',
  xp_reward       integer DEFAULT 0,
  order_index     integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, title)
);
CREATE INDEX IF NOT EXISTS idx_forge_user ON forge_items(user_id);
ALTER TABLE forge_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own forge" ON forge_items USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 7. Forge Submissions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forge_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forge_item_id   uuid NOT NULL REFERENCES forge_items(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_type text NOT NULL,
  content         text,
  file_url        text,
  repo_url        text,
  notes           text,
  ai_score        integer,
  ai_feedback     text,
  ai_signals      jsonb DEFAULT '{}',
  status          text DEFAULT 'pending_review',
  reviewer_notes  text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE forge_submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own submissions" ON forge_submissions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 8. AI Interview Sessions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_interview_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_type    text DEFAULT 'general',
  status          text DEFAULT 'scheduled',
  interview_mode  text DEFAULT 'text',
  domain          text,
  role_target     text,
  technologies    jsonb DEFAULT '[]',
  total_questions integer DEFAULT 0,
  answered_count  integer DEFAULT 0,
  overall_score   integer,
  skill_scores    jsonb DEFAULT '{}',
  strengths       jsonb DEFAULT '[]',
  improvements    jsonb DEFAULT '[]',
  insights        text,
  transcript      jsonb DEFAULT '[]',
  duration_mins   integer,
  scheduled_at    timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interview_user ON ai_interview_sessions(user_id);
ALTER TABLE ai_interview_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own interviews" ON ai_interview_sessions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 9. AI Interview Questions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_interview_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES ai_interview_sessions(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_index  integer NOT NULL,
  question_type   text,
  question_text   text NOT NULL,
  expected_answer text,
  user_answer     text,
  ai_score        integer,
  ai_feedback     text,
  time_taken_secs integer,
  follow_up       text,
  answered_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interview_q_session ON ai_interview_questions(session_id);
ALTER TABLE ai_interview_questions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own questions" ON ai_interview_questions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 10. Jobs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  company           text NOT NULL,
  company_logo      text,
  company_desc      text,
  title             text NOT NULL,
  jd_full           text,
  jd_summary        text,
  required_skills   jsonb DEFAULT '[]',
  essential_skills  jsonb DEFAULT '[]',
  good_to_have      jsonb DEFAULT '[]',
  technologies      jsonb DEFAULT '[]',
  location          text,
  job_type          text DEFAULT 'full-time',
  work_mode         text DEFAULT 'hybrid',
  salary_min        numeric,
  salary_max        numeric,
  salary_currency   text DEFAULT 'INR',
  experience_min    integer,
  experience_max    integer,
  is_verified       boolean DEFAULT false,
  is_active         boolean DEFAULT true,
  source            text DEFAULT 'internal',
  external_url      text,
  metadata          jsonb DEFAULT '{}',
  posted_at         timestamptz DEFAULT now(),
  expires_at        timestamptz,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active, posted_at DESC);
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Anyone reads active jobs" ON jobs FOR SELECT USING (is_active = true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Recruiters manage own jobs" ON jobs USING (auth.uid() = posted_by) WITH CHECK (auth.uid() = posted_by); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 11. Saved Jobs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_jobs (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id   uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, job_id)
);
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage saved jobs" ON saved_jobs USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 12. Job Applications ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id          uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  recruiter_id    uuid REFERENCES profiles(id),
  status          text DEFAULT 'applied',
  stage           text DEFAULT 'applied',
  match_score     integer,
  fit_explanation text,
  missing_skills  jsonb DEFAULT '[]',
  matched_skills  jsonb DEFAULT '[]',
  applied_at      timestamptz DEFAULT now(),
  last_activity   timestamptz DEFAULT now(),
  stage_history   jsonb DEFAULT '[]',
  notes           text,
  recruiter_notes text,
  UNIQUE(user_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_applications_user ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job  ON job_applications(job_id);
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users see own applications" ON job_applications FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users create applications" ON job_applications FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users update own applications" ON job_applications FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Recruiters see their applications" ON job_applications FOR SELECT USING (auth.uid() = recruiter_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Recruiters update their applications" ON job_applications FOR UPDATE USING (auth.uid() = recruiter_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 13. Recruiter Messages ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recruiter_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid DEFAULT gen_random_uuid(),
  from_user_id    uuid NOT NULL REFERENCES profiles(id),
  to_user_id      uuid NOT NULL REFERENCES profiles(id),
  job_id          uuid REFERENCES jobs(id),
  application_id  uuid REFERENCES job_applications(id),
  message_type    text DEFAULT 'message',
  subject         text,
  body            text NOT NULL,
  attachments     jsonb DEFAULT '[]',
  is_read         boolean DEFAULT false,
  read_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_to   ON recruiter_messages(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from ON recruiter_messages(from_user_id, created_at DESC);
ALTER TABLE recruiter_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users read their messages" ON recruiter_messages FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users send messages" ON recruiter_messages FOR INSERT WITH CHECK (auth.uid() = from_user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 14. Interview Schedules ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid REFERENCES job_applications(id) ON DELETE CASCADE,
  candidate_id    uuid NOT NULL REFERENCES profiles(id),
  recruiter_id    uuid NOT NULL REFERENCES profiles(id),
  job_id          uuid REFERENCES jobs(id),
  interview_type  text DEFAULT 'video',
  stage           text,
  title           text,
  description     text,
  scheduled_at    timestamptz NOT NULL,
  duration_mins   integer DEFAULT 45,
  meeting_link    text,
  status          text DEFAULT 'scheduled',
  candidate_status text DEFAULT 'pending',
  notes           text,
  feedback        text,
  score           integer,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE interview_schedules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Participants see interview" ON interview_schedules FOR SELECT USING (auth.uid() = candidate_id OR auth.uid() = recruiter_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Recruiters create interviews" ON interview_schedules FOR INSERT WITH CHECK (auth.uid() = recruiter_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Participants update interviews" ON interview_schedules FOR UPDATE USING (auth.uid() = candidate_id OR auth.uid() = recruiter_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 15. Offers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid REFERENCES job_applications(id),
  candidate_id    uuid NOT NULL REFERENCES profiles(id),
  recruiter_id    uuid NOT NULL REFERENCES profiles(id),
  job_id          uuid REFERENCES jobs(id),
  company         text,
  role_title      text,
  salary_lpa      numeric,
  joining_date    date,
  offer_document_url text,
  offer_letter_path  text,
  status          text DEFAULT 'pending',
  candidate_response text,
  responded_at    timestamptz,
  expires_at      timestamptz,
  is_password_protected boolean DEFAULT false,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Candidate sees own offers" ON offers FOR SELECT USING (auth.uid() = candidate_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Recruiter manages offers" ON offers USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Candidate responds to offer" ON offers FOR UPDATE USING (auth.uid() = candidate_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 16. Mentor Profiles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_profiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  bio               text,
  expertise_areas   jsonb DEFAULT '[]',
  technologies      jsonb DEFAULT '[]',
  hourly_rate_inr   numeric NOT NULL DEFAULT 1500,
  session_types     jsonb DEFAULT '[]',
  availability      jsonb DEFAULT '{}',
  total_sessions    integer DEFAULT 0,
  total_earnings    numeric DEFAULT 0,
  rating            numeric DEFAULT 0,
  review_count      integer DEFAULT 0,
  payout_cycle      text DEFAULT 'monthly',
  payout_method     text DEFAULT 'upi',
  payout_details    jsonb DEFAULT '{}',
  is_active         boolean DEFAULT true,
  is_verified       boolean DEFAULT false,
  platform_fee_pct  numeric DEFAULT 20,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Anyone reads mentor profiles" ON mentor_profiles FOR SELECT USING (is_active = true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Mentor manages own" ON mentor_profiles USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 17. Mentor Bookings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id       uuid NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  mentee_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_type    text DEFAULT '1:1',
  title           text,
  description     text,
  scheduled_at    timestamptz NOT NULL,
  duration_mins   integer DEFAULT 60,
  amount_inr      numeric NOT NULL,
  platform_fee    numeric NOT NULL,
  mentor_payout   numeric NOT NULL,
  status          text DEFAULT 'requested',
  payment_status  text DEFAULT 'pending',
  payment_order_id text,
  meeting_link    text,
  notes           text,
  mentee_review   text,
  mentee_rating   integer,
  mentor_notes    text,
  invoice_url     text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_mentor ON mentor_bookings(mentor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_mentee ON mentor_bookings(mentee_id);
ALTER TABLE mentor_bookings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Participants see booking" ON mentor_bookings FOR SELECT USING (auth.uid() = mentee_id OR auth.uid() = (SELECT user_id FROM mentor_profiles WHERE id = mentor_id)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Mentee creates booking" ON mentor_bookings FOR INSERT WITH CHECK (auth.uid() = mentee_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Participants update booking" ON mentor_bookings FOR UPDATE USING (auth.uid() = mentee_id OR auth.uid() = (SELECT user_id FROM mentor_profiles WHERE id = mentor_id)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 18. Mentor Payouts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_payouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id       uuid NOT NULL REFERENCES mentor_profiles(id),
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  gross_amount    numeric NOT NULL,
  platform_fee    numeric NOT NULL,
  transaction_fee numeric NOT NULL DEFAULT 0,
  net_payout      numeric NOT NULL,
  session_count   integer DEFAULT 0,
  status          text DEFAULT 'pending',
  processed_at    timestamptz,
  invoice_url     text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE mentor_payouts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Mentor sees own payouts" ON mentor_payouts FOR SELECT USING (auth.uid() = (SELECT user_id FROM mentor_profiles WHERE id = mentor_id)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 19. Subscriptions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  plan            text NOT NULL DEFAULT 'free',
  billing_cycle   text DEFAULT 'monthly',
  amount_inr      numeric,
  razorpay_order_id    text,
  razorpay_payment_id  text,
  coupon_code     text,
  coupon_discount numeric DEFAULT 0,
  starts_at       timestamptz DEFAULT now(),
  expires_at      timestamptz,
  is_active       boolean DEFAULT true,
  auto_renew      boolean DEFAULT true,
  invoice_url     text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own sub" ON user_subscriptions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 20. Coupons ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  coupon_type     text DEFAULT 'single',
  discount_type   text DEFAULT 'percent',
  discount_value  numeric NOT NULL,
  max_uses        integer,
  used_count      integer DEFAULT 0,
  valid_from      timestamptz DEFAULT now(),
  valid_until     timestamptz,
  applicable_plans jsonb DEFAULT '[]',
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   uuid NOT NULL REFERENCES coupons(id),
  user_id     uuid NOT NULL REFERENCES profiles(id),
  redeemed_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users see own redemptions" ON coupon_redemptions FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 21. Career Reports ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS career_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type     text NOT NULL,
  title           text NOT NULL,
  summary         text,
  sections        jsonb DEFAULT '{}',
  risk_score      integer,
  resilience_score integer,
  action_items    jsonb DEFAULT '[]',
  raw_data        jsonb DEFAULT '{}',
  is_premium      boolean DEFAULT true,
  generated_at    timestamptz DEFAULT now(),
  expires_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_reports_user ON career_reports(user_id, generated_at DESC);
ALTER TABLE career_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users see own reports" ON career_reports FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users create reports" ON career_reports FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 22. Pulse Posts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pulse_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_type       text DEFAULT 'text',
  content         text NOT NULL,
  media_urls      jsonb DEFAULT '[]',
  poll_data       jsonb,
  event_data      jsonb,
  tech_tags       jsonb DEFAULT '[]',
  role_tags       jsonb DEFAULT '[]',
  visibility      text DEFAULT 'public',
  acknowledge_count integer DEFAULT 0,
  signal_count    integer DEFAULT 0,
  comment_count   integer DEFAULT 0,
  repost_count    integer DEFAULT 0,
  save_count      integer DEFAULT 0,
  is_pinned       boolean DEFAULT false,
  is_moderated    boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_author ON pulse_posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_feed   ON pulse_posts(visibility, created_at DESC);
ALTER TABLE pulse_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Anyone reads public posts" ON pulse_posts FOR SELECT USING (visibility = 'public' AND is_moderated = false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authors manage own posts" ON pulse_posts USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 23. Post Interactions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_interactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid NOT NULL REFERENCES pulse_posts(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action          text NOT NULL,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id, action)
);
CREATE INDEX IF NOT EXISTS idx_interactions_post ON post_interactions(post_id);
ALTER TABLE post_interactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own interactions" ON post_interactions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anyone reads interactions" ON post_interactions FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 24. Post Comments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid NOT NULL REFERENCES pulse_posts(id) ON DELETE CASCADE,
  author_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES post_comments(id),
  content         text NOT NULL,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(post_id);
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Anyone reads comments" ON post_comments FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authors manage own comments" ON post_comments USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 25. Connections ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          text DEFAULT 'pending',
  message         text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS idx_connections_req  ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_addr ON connections(addressee_id);
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users see own connections" ON connections FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users manage own connections" ON connections USING (auth.uid() = requester_id) WITH CHECK (auth.uid() = requester_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Addressee responds" ON connections FOR UPDATE USING (auth.uid() = addressee_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 26. Follows ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  follower_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  PRIMARY KEY(follower_id, following_id)
);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage follows" ON follows USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anyone reads follows" ON follows FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 27. Notifications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            text NOT NULL,
  title           text NOT NULL,
  body            text,
  action_url      text,
  actor_id        uuid REFERENCES profiles(id),
  reference_id    uuid,
  reference_type  text,
  is_read         boolean DEFAULT false,
  read_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "System creates notifications" ON notifications FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 28. Helpers & Triggers ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN CREATE TRIGGER career_timeline_updated_at BEFORE UPDATE ON career_timeline FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER vault_documents_updated_at  BEFORE UPDATE ON vault_documents  FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER skill_graph_updated_at      BEFORE UPDATE ON skill_graph      FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER profiles_updated_at         BEFORE UPDATE ON profiles         FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION increment_elo(uid uuid, delta integer)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET elo_rating = GREATEST(0, COALESCE(elo_rating, 800) + delta) WHERE id = uid;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 29. Auth trigger (professional path default) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, onboarding_complete, elo_rating, path, verification_state, visibility_mode, subscription_plan)
  VALUES (new.id, new.email, now(), false, 800, 'professional', 'unverified', 'private', 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 30. Storage buckets (run in dashboard if SQL fails) ──────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-photos', 'profile-photos', true,  5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('vault-documents','vault-documents', false, 20971520, ARRAY['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('resume-uploads', 'resume-uploads',  false, 10485760, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- ── 31. Seed coupons ─────────────────────────────────────────────────────────
INSERT INTO coupons (code, coupon_type, discount_type, discount_value, max_uses, applicable_plans, is_active)
VALUES
  ('LAUNCH50',  'single', 'percent', 50,  500,  '["pro","elite"]', true),
  ('ELITE30',   'single', 'percent', 30,  200,  '["elite"]',       true),
  ('PRO999',    'single', 'flat',    500, 100,  '["pro"]',         true),
  ('COUPLE2024','couple', 'percent', 40,  1000, '["pro","elite"]', true)
ON CONFLICT (code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- Run this against both Supabase projects if needed.
-- Your MCP-accessible project: https://cbrjdfllxfmmvalijpej.supabase.co
-- Your production project: update VITE_SUPABASE_URL in .env accordingly
-- ══════════════════════════════════════════════════════════════════════════════
