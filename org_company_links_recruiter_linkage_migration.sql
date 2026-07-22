-- ─────────────────────────────────────────────────────────────────────────────
-- org_company_links — recruiter account linkage
-- Connects a college's Talent Network invite to a REAL company org account on
-- Capabilio (profiles.org_type = 'company'), instead of being an inert CRM
-- record. Lets the invited company log into their own Organisation Workspace
-- and see "who invited us" / accept an NDA before any student data unlocks.
--
-- Idempotent: safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.org_company_links
  ADD COLUMN IF NOT EXISTS company_user_id UUID DEFAULT NULL,  -- matched company org account's profiles.id, once linked
  ADD COLUMN IF NOT EXISTS nda_signed_at   TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nda_signed_by   UUID DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_org_company_links_company_user
  ON public.org_company_links (company_user_id);

-- A company account can see the institution links pointed at it (their
-- "Recruiter Network" inbox). Writes for this side (accept NDA / decline) go
-- through the backend (supabaseAdmin) — see backend/server/routes/
-- orgCompanyLinks.js — not through RLS, so no company-side UPDATE policy is
-- added here (mirrors the org_join_links "no public write via RLS" convention).
DROP POLICY IF EXISTS "org_company_links_company_read" ON public.org_company_links;
CREATE POLICY "org_company_links_company_read" ON public.org_company_links
  FOR SELECT USING (company_user_id = auth.uid());

DO $$ BEGIN RAISE NOTICE '✅ org_company_links recruiter linkage columns added.'; END $$;
