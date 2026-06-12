-- ══════════════════════════════════════════════════════════════════
-- CAPABILIO — Pulse & Nexus tables migration
-- Run in: Supabase Dashboard → SQL Editor → paste → Run
-- Safe to re-run: all statements use IF NOT EXISTS / DO $$ blocks
-- ══════════════════════════════════════════════════════════════════

-- ── 1. pulse_posts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pulse_posts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_pulse_posts_author   ON pulse_posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_posts_feed     ON pulse_posts(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_posts_signal   ON pulse_posts(signal_count DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_posts_comment  ON pulse_posts(comment_count DESC);

ALTER TABLE pulse_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public posts readable by all"
    ON pulse_posts FOR SELECT
    USING (visibility = 'public' AND is_moderated = false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authors manage own posts"
    ON pulse_posts
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. post_interactions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_interactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES pulse_posts(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  action     text        NOT NULL,  -- acknowledge | signal | save | repost
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, action)
);

CREATE INDEX IF NOT EXISTS idx_post_interactions_post ON post_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_interactions_user ON post_interactions(user_id);

ALTER TABLE post_interactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own interactions"
    ON post_interactions
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone reads interactions"
    ON post_interactions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. post_comments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES pulse_posts(id)   ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  parent_id  uuid        REFERENCES post_comments(id)          ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post   ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_author ON post_comments(author_id);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone reads comments"
    ON post_comments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authors manage own comments"
    ON post_comments
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. connections ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connections (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected
  message      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_addressee ON connections(addressee_id, status);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users see own connections"
    ON connections FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own connection requests"
    ON connections
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
    WITH CHECK (auth.uid() = requester_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. follows ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone reads follows"
    ON follows FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own follows"
    ON follows
    USING (auth.uid() = follower_id)
    WITH CHECK (auth.uid() = follower_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 6. notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL,   -- connection_request | post_reaction | comment | follow
  actor_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  entity_id   uuid,                   -- post_id / comment_id / connection_id
  entity_type text,                   -- post | comment | connection
  message     text,
  is_read     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users see own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "System inserts notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 7. updated_at trigger for pulse_posts ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER pulse_posts_updated_at
    BEFORE UPDATE ON pulse_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
