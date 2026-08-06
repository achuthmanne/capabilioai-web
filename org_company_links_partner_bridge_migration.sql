-- ─────────────────────────────────────────────────────────────────────────────
-- org_company_links — partner-bridge linkage (capabilio-recruiter)
-- FIXES: an institution's "Invite Company" invite (Talent Network page) can
-- never be accepted by a real capabilio-recruiter user, because that product
-- lives in a completely separate Supabase project/auth system (see
-- backend/server/routes/partnerBridge.js header comment). The existing
-- company_user_id column only matches a profiles.id IN THIS Supabase project
-- (profiles.org_type = 'company') — it can never point at a
-- capabilio-recruiter account.
--
-- This adds a second, parallel "who accepted" pointer for links accepted via
-- the service-to-service partner bridge instead of this app's own
-- /company-invite/:token flow. The two acceptance paths are mutually
-- exclusive per row (a link is claimed by exactly one side, first to accept
-- wins — enforced in application code, see backend/server/routes/
-- partnerBridge.js's /company-invites/:id/accept handler).
--
-- Idempotent: safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.org_company_links
  ADD COLUMN IF NOT EXISTS partner_company_ref TEXT DEFAULT NULL,
    -- capabilio-recruiter's own company id, opaque to this app — set only by
    -- the partner-bridge accept route (service_role), never client-writable.
  ADD COLUMN IF NOT EXISTS partner_accepted_by TEXT DEFAULT NULL,
    -- capabilio-recruiter's own user id/email for the person who accepted,
    -- for audit/display only — not used for any access-control decision here.
  ADD COLUMN IF NOT EXISTS accepted_via TEXT DEFAULT NULL;
    -- 'token' (existing same-DB company account flow) | 'partner_bridge'
    -- NULL until the link is actually accepted either way.

-- Partner bridge looks up pending invites by company_email — this is the
-- lookup pattern GET /api/partner/company-invites uses, so it needs its own
-- index rather than relying on the existing (institution_org_id, status) one.
CREATE INDEX IF NOT EXISTS idx_org_company_links_email_status
  ON public.org_company_links (company_email, status);

-- Extend the consent-field protection trigger (org_company_links_consent_
-- trigger_migration.sql / org_company_links_token_consent_migration.sql) to
-- also cover the three new columns — same rule as status/nda_*: only
-- service_role (supabaseAdmin, i.e. this app's backend or the partner-bridge
-- route running in this same backend) may write them, never a direct client
-- session on either side.
CREATE OR REPLACE FUNCTION public.protect_company_link_consent_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.nda_signed_at IS DISTINCT FROM OLD.nda_signed_at
     OR NEW.nda_signed_by IS DISTINCT FROM OLD.nda_signed_by
     OR NEW.company_user_id IS DISTINCT FROM OLD.company_user_id
     OR NEW.partner_company_ref IS DISTINCT FROM OLD.partner_company_ref
     OR NEW.partner_accepted_by IS DISTINCT FROM OLD.partner_accepted_by
     OR NEW.accepted_via IS DISTINCT FROM OLD.accepted_via THEN
    RAISE EXCEPTION 'org_company_links consent fields can only be modified server-side (company must accept via the invite link or the partner bridge)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;
-- (trigger itself already exists from earlier migrations — function body
-- swap above takes effect immediately, no need to re-create the trigger.)

DO $$ BEGIN RAISE NOTICE '✅ org_company_links partner-bridge linkage columns added.'; END $$;
