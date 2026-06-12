-- ══════════════════════════════════════════════════════════════════
-- CAPABILIO — Pulse tables SAFE FIX migration
-- Handles tables that exist with missing columns, or don't exist yet.
-- Also adds missing snake_case columns to profiles (the original
-- migration used camelCase; professional-path adds snake_case).
-- Supabase Dashboard → SQL Editor → paste → Run
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- STEP 0 — Add missing snake_case columns to profiles
--          Original migration used camelCase ("avatarUrl" etc).
--          pulseNexus queries need these snake_case equivalents.
-- ─────────────────────────────────────────────────────────────────
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN profile_photo_url    text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN cover_photo_url      text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN display_name         text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN username             text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN elo_rating           integer     DEFAULT 400;        EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN verification_state   text        DEFAULT 'unverified'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN headline             text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN profile_summary      text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN current_company      text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN current_role_title   text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN location             text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN linkedin_url         text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN github_url           text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN skill_graph          jsonb       DEFAULT '[]';       EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN experiences          jsonb       DEFAULT '[]';       EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN certifications       jsonb       DEFAULT '[]';       EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN education            jsonb       DEFAULT '[]';       EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN aura_score           integer     DEFAULT 0;          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN role_elo             integer     DEFAULT 400;        EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN market_elo           integer     DEFAULT 400;        EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN proof_elo            integer     DEFAULT 400;        EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN is_mentor            boolean     DEFAULT false;      EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN years_of_experience  integer     DEFAULT 0;          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN onboarding_complete  boolean     DEFAULT false;      EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN path                 text        DEFAULT 'student';  EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN job_role             text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN target_role          text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN arena_completed      integer     DEFAULT 0;          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN arena_streak         integer     DEFAULT 0;          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN last_arena_date      text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN arena_last_active    timestamptz;                    EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN skill_coverage       jsonb       DEFAULT '{}';       EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN recent_skills        jsonb       DEFAULT '[]';       EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN domain_key           text;                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN visibility_mode      text        DEFAULT 'public';   EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN subscription_plan    text        DEFAULT 'free';     EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Backfill snake_case from existing camelCase values.
-- Wrapped in EXECUTE so PostgreSQL resolves column names at runtime
-- (after the ALTER TABLE above has already added them), not at parse time.
DO $$
BEGIN
  EXECUTE '
    UPDATE profiles SET
      display_name        = COALESCE(display_name,        "displayName"),
      profile_photo_url   = COALESCE(profile_photo_url,   "avatarUrl"),
      elo_rating          = COALESCE(elo_rating,           CAST("eloRating" AS integer), 400),
      onboarding_complete = COALESCE(onboarding_complete,  "onboardingComplete", false)
    WHERE display_name IS NULL
       OR profile_photo_url IS NULL
       OR elo_rating IS NULL
  ';
END $$;

-- ─────────────────────────────────────────────────────────────────
-- STEP 1 — Drop and rebuild RLS policies that reference author_id
--          (do this first so we don't hit the column-not-found error)
-- ─────────────────────────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS "Authors manage own posts"    ON pulse_posts;    EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Authors manage own comments" ON post_comments;  EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Public posts readable by all" ON pulse_posts;   EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Anyone reads public posts"    ON pulse_posts;   EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Anyone reads comments"        ON post_comments; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────
-- STEP 2 — Create tables (IF NOT EXISTS = safe if already there)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pulse_posts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  post_type         text        NOT NULL DEFAULT 'text',
  content           text        NOT NULL,
  media_urls        jsonb       NOT NULL DEFAULT '[]',
  poll_data         jsonb,
  event_data        jsonb,
  tech_tags         jsonb       NOT NULL DEFAULT '[]',
  role_tags         jsonb       NOT NULL DEFAULT '[]',
  visibility        text        NOT NULL DEFAULT 'public',
  acknowledge_count integer     NOT NULL DEFAULT 0,
  signal_count      integer     NOT NULL DEFAULT 0,
  comment_count     integer     NOT NULL DEFAULT 0,
  repost_count      integer     NOT NULL DEFAULT 0,
  save_count        integer     NOT NULL DEFAULT 0,
  is_pinned         boolean     NOT NULL DEFAULT false,
  is_moderated      boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_interactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        REFERENCES pulse_posts(id) ON DELETE CASCADE,
  user_id    uuid        REFERENCES profiles(id)    ON DELETE CASCADE,
  action     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, action)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        REFERENCES pulse_posts(id) ON DELETE CASCADE,
  author_id  uuid        REFERENCES profiles(id)    ON DELETE CASCADE,
  parent_id  uuid        REFERENCES post_comments(id) ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connections (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending',
  message      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS follows (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL DEFAULT 'info',
  actor_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  entity_id   uuid,
  entity_type text,
  message     text,
  is_read     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────
-- STEP 3 — Add missing columns to existing tables
--          Each block catches duplicate_column so it's re-run safe
-- ─────────────────────────────────────────────────────────────────

-- pulse_posts missing columns
-- user_id: old schema used this; make it nullable so new inserts using author_id don't fail
DO $$ BEGIN ALTER TABLE pulse_posts ALTER COLUMN user_id DROP NOT NULL;                                                          EXCEPTION WHEN undefined_column THEN NULL; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN author_id         uuid        REFERENCES profiles(id) ON DELETE CASCADE;          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN post_type         text        NOT NULL DEFAULT 'text';                             EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN media_urls        jsonb       NOT NULL DEFAULT '[]';                               EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN poll_data         jsonb;                                                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN event_data        jsonb;                                                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN tech_tags         jsonb       NOT NULL DEFAULT '[]';                               EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN role_tags         jsonb       NOT NULL DEFAULT '[]';                               EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN visibility        text        NOT NULL DEFAULT 'public';                           EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN acknowledge_count integer     NOT NULL DEFAULT 0;                                  EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN signal_count      integer     NOT NULL DEFAULT 0;                                  EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN comment_count     integer     NOT NULL DEFAULT 0;                                  EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN repost_count      integer     NOT NULL DEFAULT 0;                                  EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN save_count        integer     NOT NULL DEFAULT 0;                                  EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN is_pinned         boolean     NOT NULL DEFAULT false;                              EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN is_moderated      boolean     NOT NULL DEFAULT false;                              EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pulse_posts ADD COLUMN updated_at        timestamptz NOT NULL DEFAULT now();                              EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- post_comments missing columns
DO $$ BEGIN ALTER TABLE post_comments ADD COLUMN author_id  uuid REFERENCES profiles(id)    ON DELETE CASCADE;  EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE post_comments ADD COLUMN parent_id  uuid REFERENCES post_comments(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- post_interactions missing columns
DO $$ BEGIN ALTER TABLE post_interactions ADD COLUMN user_id uuid REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- connections missing columns
DO $$ BEGIN ALTER TABLE connections ADD COLUMN message    text;                              EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE connections ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(); EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- notifications missing columns
DO $$ BEGIN ALTER TABLE notifications ADD COLUMN actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notifications ADD COLUMN entity_id   uuid;                                             EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notifications ADD COLUMN entity_type text;                                             EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notifications ADD COLUMN message     text;                                             EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notifications ADD COLUMN is_read     boolean NOT NULL DEFAULT false;                   EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────
-- STEP 4 — Indexes (IF NOT EXISTS = safe)
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pulse_posts_author        ON pulse_posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_posts_feed          ON pulse_posts(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_posts_signal        ON pulse_posts(signal_count DESC);
CREATE INDEX IF NOT EXISTS idx_post_interactions_post    ON post_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_interactions_user    ON post_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post        ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_connections_requester     ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_addressee     ON connections(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_follows_follower          ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following         ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user        ON notifications(user_id, is_read, created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- STEP 5 — Enable RLS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE pulse_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────
-- STEP 6 — Re-create policies (author_id now guaranteed to exist)
-- ─────────────────────────────────────────────────────────────────

-- pulse_posts
DO $$ BEGIN
  CREATE POLICY "Public posts readable by all" ON pulse_posts
    FOR SELECT USING (visibility = 'public' AND is_moderated = false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authors manage own posts" ON pulse_posts
    USING  (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- post_interactions
DO $$ BEGIN
  CREATE POLICY "Users manage own interactions" ON post_interactions
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone reads interactions" ON post_interactions
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- post_comments
DO $$ BEGIN
  CREATE POLICY "Anyone reads comments" ON post_comments
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authors manage own comments" ON post_comments
    USING  (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- connections
DO $$ BEGIN
  CREATE POLICY "Users see own connections" ON connections
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own connection requests" ON connections
    USING  (auth.uid() = requester_id OR auth.uid() = addressee_id)
    WITH CHECK (auth.uid() = requester_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- follows
DO $$ BEGIN
  CREATE POLICY "Anyone reads follows" ON follows
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own follows" ON follows
    USING  (auth.uid() = follower_id)
    WITH CHECK (auth.uid() = follower_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- notifications
DO $$ BEGIN
  CREATE POLICY "Users see own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "System inserts notifications" ON notifications
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────
-- STEP 7 — updated_at trigger for pulse_posts
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER pulse_posts_updated_at
    BEFORE UPDATE ON pulse_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
