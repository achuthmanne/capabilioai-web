-- ─────────────────────────────────────────────────────────────────────────────
-- org_company_links — token-based public consent + company address
-- FIXES: college could self-Activate an invite with zero real consent when
-- the company had no matching Capabilio account yet (the only case the
-- earlier consent trigger didn't cover, since it only guards rows where
-- company_user_id IS NOT NULL). Every invite now gets a random token; consent
-- always requires visiting /company-invite/:token and explicitly
-- accepting/declining — whether or not the company has an account yet.
--
-- Also adds company_address, requested by the college admin ("company
-- address, company details all should be included").
--
-- Idempotent: safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.org_company_links
  ADD COLUMN IF NOT EXISTS invite_token    TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS company_address TEXT DEFAULT '';

-- Backfill tokens for any rows created before this migration.
UPDATE public.org_company_links
SET invite_token = encode(gen_random_bytes(12), 'hex')
WHERE invite_token IS NULL;

ALTER TABLE public.org_company_links
  ALTER COLUMN invite_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_company_links_invite_token
  ON public.org_company_links (invite_token);

-- Tighten the consent trigger: it previously only protected rows once
-- company_user_id was set at invite time. Now that ALL invites require going
-- through the token-based accept/decline route (which runs as service_role),
-- block direct client writes to status/nda fields unconditionally, not just
-- when company_user_id was already set.
CREATE OR REPLACE FUNCTION public.protect_company_link_consent_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.nda_signed_at IS DISTINCT FROM OLD.nda_signed_at
     OR NEW.nda_signed_by IS DISTINCT FROM OLD.nda_signed_by
     OR NEW.company_user_id IS DISTINCT FROM OLD.company_user_id THEN
    RAISE EXCEPTION 'org_company_links consent fields can only be modified server-side (company must accept via the invite link)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;
-- (trigger itself already exists from the previous migration, function body
-- swap above takes effect immediately — no need to re-create the trigger.)

DO $$ BEGIN RAISE NOTICE '✅ org_company_links token consent + address columns added.'; END $$;
