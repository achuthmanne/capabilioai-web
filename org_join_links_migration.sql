-- ─────────────────────────────────────────────────────────────────────────────
-- org_join_links — migration
-- Lets an institution admin/professor generate a shareable link that students
-- self-register through, instead of the admin typing each of ~1000 students
-- into the "+ Invite" modal one at a time (frontend/src/pages/InstitutionOS.jsx,
-- People page, handleInvite()).
--
-- Deliberately scoped to the LIVE org_members table/org_* family (org_id =
-- institution admin's profiles.id, no FK — matching institution-migration.sql's
-- existing convention), NOT the institution_students/institution_invite_codes
-- tables from supabase-institution-invite-codes.sql — those were never applied
-- to production (confirmed via information_schema.tables) and are dead code
-- referenced only by the also-unwired JoinPage.jsx. Building on them would
-- create a third, still-disconnected schema family. See memory:
-- capabilio-college-path-schema-conflict for the full org_* vs institution_*
-- reconciliation context — out of scope for this fix.
--
-- Idempotent: safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.org_join_links (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL,             -- institution admin's profiles.id
  token        TEXT        NOT NULL,             -- URL-safe random slug, e.g. "a1b2c3d4"
  label        TEXT        DEFAULT '',           -- e.g. "CSE 2026 Batch"
  role         TEXT        NOT NULL DEFAULT 'student',
  department   TEXT        DEFAULT '',
  batch        TEXT        DEFAULT '',
  max_uses     INTEGER     DEFAULT NULL,         -- NULL = unlimited
  uses_count   INTEGER     NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ DEFAULT NULL,          -- NULL = never expires
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_by   UUID        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_join_links_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_org_join_links_org_id ON public.org_join_links (org_id);
CREATE INDEX IF NOT EXISTS idx_org_join_links_token_active
  ON public.org_join_links (token) WHERE is_active = true;

-- Prevent a student from ending up with two org_members rows in the same org
-- (e.g. clicking the same join link twice, or a race between two tabs).
-- Partial index: only enforced once user_id is actually set (admin-created
-- "invited" placeholder rows with user_id still NULL are unaffected).
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_org_user_unique
  ON public.org_members (org_id, user_id) WHERE user_id IS NOT NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────
-- No public SELECT policy: link resolution/joining goes through the backend
-- (supabaseAdmin, bypasses RLS) exclusively — see backend/server/routes/
-- orgJoinLinks.js. This keeps validation (expiry, max_uses, atomic increment)
-- server-side and out of client reach, consistent with the PC-5/PC-7
-- conventions already used elsewhere (verify.js, orgVerification.js).
ALTER TABLE public.org_join_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_join_links_org_admin" ON public.org_join_links;
CREATE POLICY "org_join_links_org_admin" ON public.org_join_links
  FOR ALL USING (org_id = auth.uid());

DO $$ BEGIN RAISE NOTICE '✅ org_join_links table created.'; END $$;
