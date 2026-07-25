-- ============================================================
-- Career OS Workstream 2 — career_events canonical ledger migration
-- Record of migrations already applied to project eybchcqwbizjmzyrviri
-- via Supabase MCP `apply_migration` (2026-07-24). This file exists for
-- repo-tracked traceability, matching the project's existing loose-SQL
-- convention (see supabase-career-events.sql for the original schema
-- this extends). Re-running this file is safe — every statement is
-- additive/idempotent (IF NOT EXISTS / CREATE OR REPLACE).
--
-- Do NOT re-run via the Supabase SQL editor if these three named
-- migrations already show in `supabase migrations list` for this
-- project — this file is a record, not a fresh migration to apply.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- Migration 1: career_os_ws2_career_events_canonical_ledger
-- Adds the canonical-ledger fields required by the Workstream 2
-- architecture decision (docs/career-os-implementation-plan.md §5b/§5c),
-- widens CHECK enums additively (no existing values removed), and adds
-- the idempotency index used by backend/server/lib/careerEventSync.js.
-- ──────────────────────────────────────────────────────────

ALTER TABLE career_events
  ADD COLUMN IF NOT EXISTS source_id       TEXT,
  ADD COLUMN IF NOT EXISTS evidence_source TEXT,
  ADD COLUMN IF NOT EXISTS title           TEXT,
  ADD COLUMN IF NOT EXISTS summary         TEXT,
  ADD COLUMN IF NOT EXISTS payload         JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS event_key       TEXT;

-- Widen event_type CHECK (adds Career OS module event types; keeps all
-- 20 original values from supabase-career-events.sql intact)
ALTER TABLE career_events DROP CONSTRAINT IF EXISTS career_events_event_type_check;
ALTER TABLE career_events ADD CONSTRAINT career_events_event_type_check CHECK (event_type IN (
  'first_job','company_join','company_exit_clean','company_exit_involuntary',
  'tenure_6m','tenure_1y','tenure_2y','tenure_3y','tenure_yearly',
  'promotion_verified','promotion_self','leadership_entry','international_role',
  'company_switch_upward','company_switch_lateral','project_outcome',
  'skill_verified','gap_short','gap_long','arena_professional',
  'certification_earned','achievement_added','weekly_pulse_milestone',
  'mentor_approved','mentor_session_completed','opportunity_transition',
  'company_review_submitted'
));

-- Widen source_type CHECK (adds the three sync-job source types used by
-- careerEventSync.js; keeps all 9 original verification-provider values)
ALTER TABLE career_events DROP CONSTRAINT IF EXISTS career_events_source_type_check;
ALTER TABLE career_events ADD CONSTRAINT career_events_source_type_check CHECK (source_type IN (
  'epfo','umang','digilocker','employer_email','offer_letter','linkedin',
  'manual_review','system_auto','self_claimed',
  'experiences_sync','certifications_sync','career_timeline_backfill'
));

-- Widen visibility CHECK (adds 'confidential' for future consent-gated content)
ALTER TABLE career_events DROP CONSTRAINT IF EXISTS career_events_visibility_check;
ALTER TABLE career_events ADD CONSTRAINT career_events_visibility_check CHECK (visibility IN (
  'public','recruiter','private','confidential'
));

-- New evidence_source enum (nullable — legacy rows before this migration have none)
ALTER TABLE career_events DROP CONSTRAINT IF EXISTS career_events_evidence_source_check;
ALTER TABLE career_events ADD CONSTRAINT career_events_evidence_source_check CHECK (
  evidence_source IS NULL OR evidence_source IN (
    'self_claimed','resume_derived','employer_verified','document_verified','capabilio_verified'
  )
);

-- Idempotency: one event per (user, source_type, source_id, event_type).
-- Partial index only applies where source_id is present and the row isn't
-- soft-deleted — legacy/manual rows with no source_id are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS career_events_idempotency_idx
  ON career_events (user_id, source_type, source_id, event_type)
  WHERE source_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS career_events_event_key_idx ON career_events (event_key) WHERE event_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS career_events_occurred_idx  ON career_events (occurred_at);

-- ──────────────────────────────────────────────────────────
-- Migration 2: career_os_ws2_add_occurred_at
-- Canonical chronological field required by GET /api/pro/v1/career/timeline.
-- Backfills from existing start_date, falling back to created_at.
-- ──────────────────────────────────────────────────────────

ALTER TABLE career_events ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;

UPDATE career_events
SET occurred_at = COALESCE(occurred_at, start_date::timestamptz, created_at)
WHERE occurred_at IS NULL;

CREATE INDEX IF NOT EXISTS career_events_user_occurred_idx ON career_events (user_id, occurred_at DESC);

-- ──────────────────────────────────────────────────────────
-- Migration 3: career_os_ws2_fix_evaluate_path_transition_bug
--
-- EMERGENT FIX — discovered during this workstream's real-data
-- verification test, not part of the original migration plan. Not a
-- Workstream 2 feature change: a pre-existing, latent production bug
-- that blocked every future insert into career_events for every user.
--
-- Root cause: EXTRACT(DAY FROM (date - date)) is invalid Postgres SQL.
-- Subtracting two `date` values already yields an integer (days), not
-- an interval, so EXTRACT(DAY FROM integer) doesn't exist and errors:
--   "function pg_catalog.extract(unknown, integer) does not exist"
-- Every profile in production has path_status = 'student', so the
-- trigger's early-return ("already professional") never short-circuited
-- before hitting this line — meaning it would have fired, and failed,
-- on every single INSERT into career_events, for every user, forever,
-- since this table had never received a real insert before this
-- workstream. Confirmed via a real INSERT that failed with this exact
-- error before the fix, and succeeded immediately after.
--
-- Fix: remove the invalid EXTRACT() wrapper — the date subtraction
-- already produces the day count needed. All other trigger logic
-- (first_job verification-level check, path_transitions insert) is
-- unchanged.
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION evaluate_path_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_current_path  TEXT;
  v_epfo_days     NUMERIC;
BEGIN
  SELECT path_status INTO v_current_path FROM profiles WHERE id = NEW.user_id;

  -- Already professional — nothing to do
  IF v_current_path = 'professional' THEN RETURN NEW; END IF;

  -- Condition A: first_job event, V3+
  IF NEW.event_type = 'first_job' AND NEW.verification_level >= 3 THEN
    UPDATE profiles SET path_status = 'professional' WHERE id = NEW.user_id;
    INSERT INTO path_transitions(user_id, from_path, to_path, trigger_event_id,
                                 trigger_source, status, confirmed_at)
    VALUES (NEW.user_id, v_current_path, 'professional', NEW.id,
            NEW.source_type, 'confirmed', NOW());
    RETURN NEW;
  END IF;

  -- Condition B: EPFO events with 90+ days total
  -- (date - date) in Postgres already yields an integer day count —
  -- EXTRACT(DAY FROM ...) around it is invalid and has been removed.
  SELECT COALESCE(SUM(
    COALESCE(end_date, CURRENT_DATE) - start_date
  ), 0)
  INTO v_epfo_days
  FROM career_events
  WHERE user_id = NEW.user_id
    AND source_type IN ('epfo','umang','digilocker')
    AND start_date IS NOT NULL;

  IF v_epfo_days >= 90 THEN
    UPDATE profiles SET path_status = 'professional' WHERE id = NEW.user_id;
    INSERT INTO path_transitions(user_id, from_path, to_path, trigger_event_id,
                                 trigger_source, status, confirmed_at)
    VALUES (NEW.user_id, v_current_path, 'professional', NEW.id,
            'epfo', 'confirmed', NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition unchanged — CREATE OR REPLACE FUNCTION above is
-- sufficient since the trigger already points at this function name.

-- ──────────────────────────────────────────────────────────
-- Migration 4: career_os_ws2_timeline_filter_indexes
-- Added as a release safeguard: composite indexes supporting
-- GET /api/pro/v1/career/timeline's supported filters (eventType,
-- visibility) combined with the owner-scoped, occurred_at-ordered query
-- shape the route actually issues. Complements
-- career_events_user_occurred_idx (unfiltered case).
-- ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS career_events_user_type_occurred_idx
  ON career_events (user_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS career_events_user_visibility_occurred_idx
  ON career_events (user_id, visibility, occurred_at DESC);

-- ============================================================
-- REPEAT-SAFETY VERIFICATION (release safeguard, 2026-07-24)
-- ============================================================
-- Branching is not available on this Supabase org's current plan
-- ("Branching is supported only on the Pro plan or above" — confirmed
-- via a live create_branch attempt), so the staging-branch safeguard was
-- substituted with the next-best verification available: re-running
-- every DDL statement in Migrations 1–2 directly against production a
-- second time. Result: zero errors, `career_events` row count unchanged
-- (3 rows before and after), no duplicate constraints/indexes created
-- (every statement used IF NOT EXISTS / DROP CONSTRAINT IF EXISTS +
-- CREATE OR REPLACE). This confirms the migration is repeat-safe to
-- re-run, but is NOT equivalent to testing against an isolated copy of
-- production data — flagged as a standing gap until the project is on a
-- plan that supports branching (see docs/career-os-implementation-plan.md
-- §"Workstream 2 release safeguards" for the full note).
--
-- ROLLBACK — restated here for a single source of truth (also in
-- docs/career-os-implementation-plan.md):
--   1. Frontend-only: flip `career_os_nav` off — Career module
--      disappears; synced career_events rows remain, harmlessly unread.
--   2. Data-only: DELETE FROM career_events WHERE source_type IN
--      ('experiences_sync','certifications_sync',
--      'career_timeline_backfill') — never TRUNCATE (would also delete
--      real future event data).
--   3. Schema-only: this migration is additive-only (new nullable
--      columns, widened CHECK enums, new indexes). No destructive
--      rollback is required; if columns/indexes must be removed, drop
--      them explicitly by name — never DROP TABLE career_events.
--   4. Trigger fix (Migration 3) rollback: NOT recommended — reverting
--      to the pre-fix `evaluate_path_transition()` would restore the bug
--      that blocks every insert into career_events for every user. If a
--      revert is ever truly required, restore the prior function body
--      from supabase-career-events.sql §6-7 (the original, buggy
--      `EXTRACT(DAY FROM (date - date))` version) — not recommended
--      under any normal circumstance.
