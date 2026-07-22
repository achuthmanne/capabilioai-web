-- ─────────────────────────────────────────────────────────────────────────────
-- org_company_links — consent-field protection trigger (PC-7 style)
-- The frontend UI now hides the college-side "Activate" button once a link is
-- matched to a real company account (company_user_id is set) — but that's
-- only a UX guard. The college's own Supabase session still has RLS INSERT/
-- UPDATE/DELETE permission on org_company_links (org_company_links_org_admin:
-- institution_org_id = auth.uid(), FOR ALL), so a modified client could still
-- write status='active' directly, bypassing the company's actual NDA consent
-- recorded via backend/server/routes/orgCompanyLinks.js's accept-nda route.
-- This trigger closes that gap server-side, the same way PC-7 protects
-- profiles.verificationStatus.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.protect_company_link_consent_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- service_role (the backend, via supabaseAdmin) is exempt — this is the
  -- only intended writer of consent state.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  -- Once a link is matched to a real company account, status/NDA fields can
  -- only change via the company's own accept-nda/decline backend routes
  -- (service_role), never a direct client write from either side's session.
  IF OLD.company_user_id IS NOT NULL THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.nda_signed_at IS DISTINCT FROM OLD.nda_signed_at
       OR NEW.nda_signed_by IS DISTINCT FROM OLD.nda_signed_by
       OR NEW.company_user_id IS DISTINCT FROM OLD.company_user_id THEN
      RAISE EXCEPTION 'org_company_links consent fields can only be modified server-side once linked to a real account'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_company_link_consent ON public.org_company_links;
CREATE TRIGGER trg_protect_company_link_consent
  BEFORE UPDATE ON public.org_company_links
  FOR EACH ROW EXECUTE FUNCTION public.protect_company_link_consent_fields();

DO $$ BEGIN RAISE NOTICE '✅ org_company_links consent-field trigger installed.'; END $$;
