-- ─── Capabilio Institution OS — Database Migration ──────────────────────────
-- Run in: Supabase → SQL Editor → New Query → Run
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS + ALTER ADD COLUMN IF NOT EXISTS)
--
-- Tables created:
--   org_members        — institution roster (students, faculty, admins, recruiters)
--   org_tasks          — tasks published by institution admins / faculty
--   org_events         — campus drives, seminars, hiring panels
--   org_opportunities  — job descriptions / JDs posted by institution or company
--   org_audit_log      — immutable log of sensitive admin actions

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ORG MEMBERS
--    Every person that belongs to an institution. org_id = institution admin's
--    auth user id (= profiles.id of the institution account).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_members (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID        NOT NULL,   -- institution's profiles.id
  user_id        UUID,                   -- linked Capabilio account (nullable until they join)
  name           TEXT        NOT NULL DEFAULT '',
  email          TEXT        NOT NULL DEFAULT '',
  role           TEXT        NOT NULL DEFAULT 'student',
    -- student | faculty | admin | recruiter | mentor | dept_head
  department     TEXT        DEFAULT '',
  batch          TEXT        DEFAULT '',          -- e.g. "B.Tech CSE 2026"
  status         TEXT        NOT NULL DEFAULT 'pending',
    -- invited | pending | active | suspended | removed
  elo_rating     INTEGER     DEFAULT 0,
  placement_company TEXT     DEFAULT '',          -- filled when placed
  placement_ctc  TEXT        DEFAULT '',
  joined_at      TIMESTAMPTZ DEFAULT now(),
  approved_at    TIMESTAMPTZ,
  approved_by    UUID,
  metadata       JSONB       DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id  ON public.org_members (org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members (user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_status  ON public.org_members (org_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ORG TASKS
--    Tasks created by institution admins / faculty, assigned to batches or all.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_tasks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL,
  title             TEXT        NOT NULL DEFAULT '',
  description       TEXT        DEFAULT '',
  type              TEXT        DEFAULT 'assignment',
    -- assignment | lab | project | remedial | assessment | challenge
  assigned_to_label TEXT        DEFAULT '',  -- human label: "B.Tech CSE 2026" / "All Students"
  due_date          DATE,
  published_by      UUID,                    -- profiles.id of faculty/admin who created
  published_by_name TEXT        DEFAULT '',
  status            TEXT        DEFAULT 'draft',
    -- draft | active | completed | archived
  priority          TEXT        DEFAULT 'medium',
    -- urgent | high | medium | low
  submission_count  INTEGER     DEFAULT 0,
  total_assigned    INTEGER     DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_tasks_org_id ON public.org_tasks (org_id);
CREATE INDEX IF NOT EXISTS idx_org_tasks_status ON public.org_tasks (org_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ORG EVENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID        NOT NULL,
  title          TEXT        NOT NULL DEFAULT '',
  type           TEXT        DEFAULT 'general',
    -- drive | review | lecture | assessment | seminar | general
  event_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  event_time     TEXT        DEFAULT '',
  venue          TEXT        DEFAULT '',
  description    TEXT        DEFAULT '',
  attendee_count INTEGER     DEFAULT 0,
  status         TEXT        DEFAULT 'upcoming',
    -- upcoming | ongoing | completed | cancelled
  created_by     UUID,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_events_org_id ON public.org_events (org_id);
CREATE INDEX IF NOT EXISTS idx_org_events_date   ON public.org_events (org_id, event_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ORG OPPORTUNITIES  (Job Descriptions)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_opportunities (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL,
  title            TEXT        NOT NULL DEFAULT '',
  company          TEXT        DEFAULT '',
  role_type        TEXT        DEFAULT 'fulltime',
    -- fulltime | internship | contract | parttime
  eligibility      TEXT        DEFAULT '',
  ctc              TEXT        DEFAULT '',
  deadline         DATE,
  description      TEXT        DEFAULT '',
  status           TEXT        DEFAULT 'active',
    -- active | closed | draft
  applicant_count  INTEGER     DEFAULT 0,
  created_by       UUID,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_opps_org_id ON public.org_opportunities (org_id);
CREATE INDEX IF NOT EXISTS idx_org_opps_status ON public.org_opportunities (org_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ORG AUDIT LOG  (immutable — never UPDATE or DELETE rows)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL,
  actor_id     UUID,
  actor_name   TEXT        DEFAULT '',
  action       TEXT        NOT NULL,      -- human-readable: "approved Ankit Sharma as Student"
  action_code  TEXT        DEFAULT '',    -- machine: member.approved | task.published | event.created
  severity     TEXT        DEFAULT 'info',  -- info | warning | critical
  entity_type  TEXT        DEFAULT '',    -- member | task | event | opportunity | setting
  entity_id    TEXT        DEFAULT '',
  details      JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_audit_org_id     ON public.org_audit_log (org_id);
CREATE INDEX IF NOT EXISTS idx_org_audit_created_at ON public.org_audit_log (org_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS POLICIES
--    Institution admin can read/write their own org's data.
--    Members can read (but not write) their own org's data.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE public.org_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_audit_log    ENABLE ROW LEVEL SECURITY;

-- Drop policies if re-running (idempotent)
DROP POLICY IF EXISTS "org_members_org_admin"   ON public.org_members;
DROP POLICY IF EXISTS "org_members_self"        ON public.org_members;
DROP POLICY IF EXISTS "org_tasks_org_admin"     ON public.org_tasks;
DROP POLICY IF EXISTS "org_events_org_admin"    ON public.org_events;
DROP POLICY IF EXISTS "org_opps_org_admin"      ON public.org_opportunities;
DROP POLICY IF EXISTS "org_audit_org_admin"     ON public.org_audit_log;

-- Institution admin: full access to their org's rows
CREATE POLICY "org_members_org_admin" ON public.org_members
  FOR ALL USING (org_id = auth.uid());

CREATE POLICY "org_tasks_org_admin" ON public.org_tasks
  FOR ALL USING (org_id = auth.uid());

CREATE POLICY "org_events_org_admin" ON public.org_events
  FOR ALL USING (org_id = auth.uid());

CREATE POLICY "org_opps_org_admin" ON public.org_opportunities
  FOR ALL USING (org_id = auth.uid());

CREATE POLICY "org_audit_org_admin" ON public.org_audit_log
  FOR ALL USING (org_id = auth.uid());

-- Members can see their own record
CREATE POLICY "org_members_self" ON public.org_members
  FOR SELECT USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. HELPER: updated_at auto-update trigger
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_org_members_updated_at
    BEFORE UPDATE ON public.org_members
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_org_tasks_updated_at
    BEFORE UPDATE ON public.org_tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_org_opps_updated_at
    BEFORE UPDATE ON public.org_opportunities
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
