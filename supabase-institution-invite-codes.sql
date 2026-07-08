-- ─────────────────────────────────────────────────────────────────────────────
-- institution_invite_codes — migration
-- Run this in Supabase SQL Editor (or via supabase db push)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Invite codes table
CREATE TABLE IF NOT EXISTS public.institution_invite_codes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   uuid        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  code             text        NOT NULL,           -- URL slug: "vit-2025", "srm-ece-b4"
  label            text,                           -- Human label shown on JoinPage
  discount_pct     integer     NOT NULL DEFAULT 50 CHECK (discount_pct BETWEEN 0 AND 100),
  max_uses         integer     DEFAULT NULL,       -- NULL = unlimited
  uses_count       integer     NOT NULL DEFAULT 0,
  expires_at       timestamptz DEFAULT NULL,       -- NULL = never expires
  cohort_id        uuid        DEFAULT NULL REFERENCES public.institution_cohorts(id),
  department       text        DEFAULT NULL,
  batch            text        DEFAULT NULL,       -- e.g. "2022-2026"
  is_active        boolean     NOT NULL DEFAULT true,
  created_by       uuid        NOT NULL REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT institution_invite_codes_code_unique UNIQUE (code)
);

-- Fast lookup on join page
CREATE INDEX IF NOT EXISTS idx_invite_codes_code_active
  ON public.institution_invite_codes (code)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_invite_codes_institution
  ON public.institution_invite_codes (institution_id);

-- 2. institution_students table (student ↔ institution linkage)
CREATE TABLE IF NOT EXISTS public.institution_students (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    uuid        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_method       text        NOT NULL DEFAULT 'invite_code'
                                CHECK (link_method IN ('email_domain', 'invite_code', 'self_declared')),
  invite_code_id    uuid        DEFAULT NULL REFERENCES public.institution_invite_codes(id),
  status            text        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('pending_admin', 'active', 'rejected', 'alumni', 'withdrawn')),
  department        text        DEFAULT NULL,
  batch             text        DEFAULT NULL,
  roll_number       text        DEFAULT NULL,
  cohort_ids        uuid[]      DEFAULT '{}',
  linked_at         timestamptz NOT NULL DEFAULT now(),
  approved_at       timestamptz DEFAULT NULL,
  withdrawn_at      timestamptz DEFAULT NULL,
  CONSTRAINT institution_students_unique UNIQUE (institution_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS idx_inst_students_institution
  ON public.institution_students (institution_id);

CREATE INDEX IF NOT EXISTS idx_inst_students_user
  ON public.institution_students (student_user_id);

-- 3. Add institution_id to profiles if not already present
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS institution_id uuid DEFAULT NULL REFERENCES public.institutions(id);

-- 4. RLS policies ──────────────────────────────────────────────────────────────

ALTER TABLE public.institution_invite_codes ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can read an active code to resolve a join link
CREATE POLICY "invite_codes_public_read" ON public.institution_invite_codes
  FOR SELECT USING (is_active = true);

-- Only institution admins can insert/update their own institution's codes
CREATE POLICY "invite_codes_admin_write" ON public.institution_invite_codes
  FOR ALL USING (
    institution_id IN (
      SELECT id FROM public.institutions
      WHERE admin_user_id = auth.uid()
    )
  );

ALTER TABLE public.institution_students ENABLE ROW LEVEL SECURITY;

-- Students can read their own linkage record
CREATE POLICY "inst_students_self_read" ON public.institution_students
  FOR SELECT USING (student_user_id = auth.uid());

-- Institution admins can read all students in their institution
CREATE POLICY "inst_students_admin_read" ON public.institution_students
  FOR SELECT USING (
    institution_id IN (
      SELECT id FROM public.institutions WHERE admin_user_id = auth.uid()
    )
  );

-- Students (and the system) can insert their own linkage (via invite)
CREATE POLICY "inst_students_self_insert" ON public.institution_students
  FOR INSERT WITH CHECK (student_user_id = auth.uid());

-- Institution admins can update status (approve / reject / alumni)
CREATE POLICY "inst_students_admin_update" ON public.institution_students
  FOR UPDATE USING (
    institution_id IN (
      SELECT id FROM public.institutions WHERE admin_user_id = auth.uid()
    )
  );

-- 5. Trigger: auto-increment uses_count when a student joins via invite code ──
CREATE OR REPLACE FUNCTION public.increment_invite_uses()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.invite_code_id IS NOT NULL THEN
    UPDATE public.institution_invite_codes
    SET uses_count = uses_count + 1
    WHERE id = NEW.invite_code_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_invite_uses ON public.institution_students;
CREATE TRIGGER trg_increment_invite_uses
  AFTER INSERT ON public.institution_students
  FOR EACH ROW EXECUTE FUNCTION public.increment_invite_uses();

-- 6. Trigger: sync institution_id to profiles when student is linked ──────────
CREATE OR REPLACE FUNCTION public.sync_institution_to_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.profiles
    SET institution_id = NEW.institution_id
    WHERE id = NEW.student_user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_institution_profile ON public.institution_students;
CREATE TRIGGER trg_sync_institution_profile
  AFTER INSERT OR UPDATE OF status ON public.institution_students
  FOR EACH ROW EXECUTE FUNCTION public.sync_institution_to_profile();
