-- ─────────────────────────────────────────────────────────────────────────────
-- org_company_links — migration
-- FIXES: "Could not find the table 'public.org_company_links' in the schema
-- cache" on the Institution OS "Talent Network" / "Recruiter NDAs" page
-- (frontend/src/pages/InstitutionOS.jsx, useOrgCompanyLinks hook + Talent
-- Network handlers). The frontend has always queried this table — it was
-- simply never migrated. Zero frontend changes needed; this closes the gap.
--
-- Columns match exactly what InstitutionOS.jsx already reads/writes
-- (institution_org_id, company_name, company_email, company_website,
-- company_size, industry, notes, status, visibility, invited_by, linked_at,
-- created_at) — see lines 269, 2010-2020, 2032, 2038, 2044.
--
-- Convention matches institution-migration.sql's existing org_* tables:
-- org_id-equivalent column = the institution admin's profiles.id (auth.uid()),
-- no FK (consistent with, not a fix for, the org_* family's existing
-- no-FK convention — see College_Path_Production_System_Design.md §0.1 for
-- why that's a separate, larger reconciliation effort, out of scope here).
--
-- Idempotent: safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.org_company_links (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_org_id  UUID        NOT NULL,   -- institution admin's profiles.id
  company_name        TEXT        NOT NULL DEFAULT '',
  company_email       TEXT        DEFAULT '',
  company_website     TEXT        DEFAULT '',
  company_size        TEXT        DEFAULT '',
  industry            TEXT        DEFAULT '',
  notes               TEXT        DEFAULT '',
  status              TEXT        NOT NULL DEFAULT 'invited',
    -- invited | active | paused | rejected
  visibility          TEXT        DEFAULT 'roster',
    -- roster | elo | placements | full
  invited_by          UUID,
  linked_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_company_links_org_id
  ON public.org_company_links (institution_org_id);

CREATE INDEX IF NOT EXISTS idx_org_company_links_status
  ON public.org_company_links (institution_org_id, status);

-- ── RLS — mirrors institution-migration.sql's existing org_* policy pattern ──
ALTER TABLE public.org_company_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_company_links_org_admin" ON public.org_company_links;
CREATE POLICY "org_company_links_org_admin" ON public.org_company_links
  FOR ALL USING (institution_org_id = auth.uid());

DO $$ BEGIN RAISE NOTICE '✅ org_company_links table created.'; END $$;
