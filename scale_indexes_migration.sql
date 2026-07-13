-- ═══════════════════════════════════════════════════════════════════════════
-- scale_indexes_migration.sql  (v3 — safe conditional creation)
-- Performance indexes for 50k+ concurrent users
-- Run in Supabase SQL editor (production project eybchcqwbizjmzyrviri)
-- Each index is created only if the table exists — safe to run multiple times
-- even if some tables are not yet in production.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN

  -- ── arena_history ───────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='arena_history') THEN

    -- "show me this user's arena history" — most common query
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_arena_history_user
               ON arena_history (user_id, completed_at DESC)';

    -- "filter by domain" — used in domain-specific leaderboards & history
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_arena_history_user_domain
               ON arena_history (user_id, domain, completed_at DESC)';

    -- duplicate-attempt guard: has user already attempted task X?
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_arena_history_user_task
               ON arena_history (user_id, task_id)';

  END IF;

  -- ── arena_state ─────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='arena_state') THEN

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_arena_state_user_domain
               ON arena_state (user_id, domain_key)';

  END IF;

  -- ── elo_events ──────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='elo_events') THEN

    -- /elo/:uid ordered history
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_elo_events_user_date
               ON elo_events (user_id, created_at DESC)';

    -- domain-level ELO history
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_elo_events_user_domain
               ON elo_events (user_id, domain, created_at DESC)';

  END IF;

  -- ── skill_graph ─────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='skill_graph') THEN

    -- per-user skill lookup
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_skill_graph_user
               ON skill_graph (user_id)';

    -- recruiter: top candidates in a domain sorted by ELO
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_skill_graph_domain_elo
               ON skill_graph (domain, elo_value DESC)';

    -- filter by verification state
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_skill_graph_user_verification
               ON skill_graph (user_id, verification_state)';

  END IF;

  -- ── problems ────────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='problems') THEN

    -- catalog filtered by category
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_problems_category
               ON problems (category)';

    -- catalog filtered by category + difficulty
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_problems_category_difficulty
               ON problems (category, difficulty)';

  END IF;

  -- ── profiles ────────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN

    -- recruiter: candidates filtered by domain keyword, sorted by ELO
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_keyword_elo
               ON profiles (keyword, elo_rating DESC)';

    -- global leaderboard by ELO
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_elo
               ON profiles (elo_rating DESC)';

    -- Aura leaderboard
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_aura_score
               ON profiles (aura_score DESC)';

  END IF;

  -- ── forge_submissions ───────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='forge_submissions') THEN

    -- user's own submission list + status filter
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_forge_submissions_user_status
               ON forge_submissions (user_id, status, created_at DESC)';

    -- reviewer queue: all submissions for a forge item by status
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_forge_submissions_item
               ON forge_submissions (forge_item_id, status)';

  END IF;

  -- ── pulse_posts ─────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pulse_posts') THEN

    -- feed sorted by recency
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_pulse_posts_date
               ON pulse_posts (created_at DESC)';

    -- author''s own posts page
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_pulse_posts_author_date
               ON pulse_posts (author_id, created_at DESC)';

  END IF;

  -- ── recruiter_messages ──────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='recruiter_messages') THEN

    -- inbox: unread messages to user
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_recruiter_messages_to_user
               ON recruiter_messages (to_user_id, is_read, created_at DESC)';

    -- sent messages
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_recruiter_messages_from_user
               ON recruiter_messages (from_user_id, created_at DESC)';

  END IF;

  -- ── notifications ───────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='notifications' AND column_name='user_id') THEN

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_date
               ON notifications (user_id, created_at DESC)';

  END IF;

  RAISE NOTICE 'scale_indexes_migration v3 complete';

END $$;

-- ── Verify — show all custom indexes and their sizes ──────────────────────────
SELECT
  i.tablename,
  i.indexname,
  pg_size_pretty(pg_relation_size(c.oid)) AS index_size
FROM pg_indexes i
JOIN pg_class c ON c.relname = i.indexname
WHERE i.schemaname = 'public'
  AND i.indexname LIKE 'idx_%'
ORDER BY i.tablename, i.indexname;
