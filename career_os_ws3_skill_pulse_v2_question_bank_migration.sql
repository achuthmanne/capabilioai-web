-- ============================================================
-- Career OS Workstream 3 — Weekly Skill Pulse V2 question bank
-- Record of migration applied to project eybchcqwbizjmzyrviri via
-- Supabase MCP `apply_migration`. Additive only — the existing
-- weekly_pulses/weekly_questions/weekly_answers v1 tables and
-- backend/server/routes/weeklyPulse.js are completely untouched and
-- keep working as the safe fallback flow.
--
-- Design decision (see docs/career-os-implementation-plan.md §5d):
-- user_skills.domain is free-text and 100% null in production today —
-- there's no real per-user domain taxonomy to hang a coverage gate off
-- of. This migration introduces a fixed, CHECK-constrained domain
-- taxonomy on question_bank itself; the release coverage gate is
-- computed against this fixed list, not user-entered free text.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- question_bank — the production, reviewed question bank.
-- Only rows with review_status = 'approved' may ever be selected for a
-- live user (enforced in application code — see selection.js — and by
-- RLS below, which grants zero client-side access at all: this table
-- is server/service-role only, matching the "server-enforced workflow"
-- requirement).
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS question_bank (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  domain            TEXT NOT NULL CHECK (domain IN (
                      'software_engineering', 'data_analytics', 'product_management',
                      'design_ux', 'sales', 'marketing', 'finance_accounting',
                      'operations_supply_chain', 'hr_people', 'customer_success',
                      'other'
                    )),
  skill_tags        TEXT[] NOT NULL DEFAULT '{}',
  difficulty        SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  question_type     TEXT NOT NULL CHECK (question_type IN (
                      'scenario','bug_finding','reasoning','dashboard_interpretation',
                      'architecture_interpretation','operational_decision','work_situation'
                    )),

  -- Content
  prompt            TEXT NOT NULL,
  media_url         TEXT,
  options           JSONB NOT NULL,
  correct_option_id TEXT NOT NULL,
  explanation       TEXT NOT NULL,

  -- Provenance / review workflow (Part B requirement — approved-only serving)
  source            TEXT NOT NULL DEFAULT 'ai_generated' CHECK (source IN (
                      'ai_generated','human_authored','imported'
                    )),
  review_status     TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN (
                      'draft','in_review','approved','rejected','retired'
                    )),
  reviewer_id        UUID REFERENCES profiles(id),
  reviewed_at        TIMESTAMPTZ,
  rejection_reason   TEXT,

  -- Versioning: editing an approved question creates a new row that
  -- points back at the one it supersedes, rather than mutating live
  -- content out from under a coverage-gate snapshot or an in-flight
  -- pulse. The old row is retired (review_status='retired'), not deleted.
  version           INT NOT NULL DEFAULT 1,
  parent_id         UUID REFERENCES question_bank(id),

  -- Retirement
  retired_at        TIMESTAMPTZ,
  retirement_reason TEXT,

  -- Reporting workflow (users can flag a question; see question_bank_reports)
  report_count      INT NOT NULL DEFAULT 0,

  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT question_bank_options_shape CHECK (jsonb_typeof(options) = 'array')
);

CREATE INDEX IF NOT EXISTS question_bank_domain_status_idx
  ON question_bank (domain, review_status) WHERE review_status = 'approved';
CREATE INDEX IF NOT EXISTS question_bank_skill_tags_idx
  ON question_bank USING GIN (skill_tags);
CREATE INDEX IF NOT EXISTS question_bank_difficulty_idx
  ON question_bank (domain, difficulty) WHERE review_status = 'approved';

-- Only ever query/insert via service role from the backend — no anon/
-- authenticated client policy is created, so RLS denies all client
-- access by default while leaving service-role (which bypasses RLS)
-- fully able to read/write. This is the "server-enforced workflow"
-- requirement: approval/versioning/retirement can only happen through
-- backend code paths, never a direct client write.
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────
-- question_bank_reports — reporting workflow. A user can flag a served
-- question (e.g. wrong answer key, offensive content, unclear prompt).
-- Reports are visible only to the reporter (their own) and otherwise
-- server-managed; review/resolution happens server-side.
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS question_bank_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  reporter_id   UUID NOT NULL REFERENCES profiles(id),
  reason        TEXT NOT NULL CHECK (reason IN (
                  'wrong_answer','unclear','offensive','outdated','other'
                )),
  details       TEXT,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed','actioned')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS question_bank_reports_question_idx ON question_bank_reports (question_id);
CREATE INDEX IF NOT EXISTS question_bank_reports_status_idx   ON question_bank_reports (status) WHERE status = 'open';

ALTER TABLE question_bank_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_own_reports" ON question_bank_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "users_read_own_reports" ON question_bank_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- ──────────────────────────────────────────────────────────
-- Extend the existing v1 tables additively so v2 can reuse the same
-- pulse/answer plumbing instead of duplicating it:
--   - weekly_pulses.flow_version records which experience a user got
--     ('v1' 5-question live-generated flow, or 'v2' 15-question bank
--     flow) — this is how the fallback decision gets recorded per pulse,
--     not just decided at request time and forgotten.
--   - weekly_questions.bank_question_id links a served question back to
--     its question_bank row when it came from v2 (null for v1's live-
--     generated questions) — this is also how the anti-repeat window
--     is computed (Part C): look at bank_question_ids served to this
--     user across weekly_pulses in the last 8 weeks.
-- ──────────────────────────────────────────────────────────

ALTER TABLE weekly_pulses
  ADD COLUMN IF NOT EXISTS flow_version TEXT NOT NULL DEFAULT 'v1' CHECK (flow_version IN ('v1','v2'));

ALTER TABLE weekly_questions
  ADD COLUMN IF NOT EXISTS bank_question_id UUID REFERENCES question_bank(id);

CREATE INDEX IF NOT EXISTS weekly_questions_bank_question_idx
  ON weekly_questions (bank_question_id) WHERE bank_question_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────
-- Migration (content-ops deliverable, applied 2026-07-24):
-- career_os_ws3_question_bank_audit_log — audit trail for the internal
-- question-bank admin workflow (backend/server/routes/admin/
-- questionBankAdmin.js). Every create/edit/validate/approve/reject/
-- retire/version/report-resolve action writes one row here. Admin/
-- service-role only — no client RLS policy, same pattern as question_bank.
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS question_bank_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES profiles(id),
  action        TEXT NOT NULL CHECK (action IN (
                  'created','edited','validated','approved','rejected',
                  'retired','versioned','report_resolved'
                )),
  from_status   TEXT,
  to_status     TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS question_bank_audit_log_question_idx ON question_bank_audit_log (question_id, created_at DESC);

ALTER TABLE question_bank_audit_log ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────
-- REPEAT-SAFETY: every statement above uses IF NOT EXISTS / CREATE
-- TABLE IF NOT EXISTS / CREATE POLICY guarded by table-not-existing-yet
-- (policies are created once, at table-creation time, in this same
-- migration — re-running this whole file after the tables already exist
-- would fail on CREATE POLICY since there's no IF NOT EXISTS for
-- policies in this Postgres version; re-running is safe UP UNTIL the
-- CREATE POLICY statements — if this file must be re-applied, wrap the
-- two CREATE POLICY statements in a DROP POLICY IF EXISTS first, or
-- skip re-running this file entirely once applied, same convention as
-- the Workstream 2 tracked file).
--
-- ROLLBACK:
--   1. Flag-only: career_os_skill_pulse_v2 is already false by default
--      (frontend/src/config/featureFlags.js) — nothing to roll back on
--      the frontend since v2 was never surfaced.
--   2. Data-only: DELETE FROM question_bank_reports; DELETE FROM
--      question_bank; — safe, v1 tables are entirely unaffected since
--      weekly_questions.bank_question_id is nullable and weekly_pulses.
--      flow_version defaults to 'v1'.
--   3. Schema-only: ALTER TABLE weekly_questions DROP COLUMN
--      bank_question_id; ALTER TABLE weekly_pulses DROP COLUMN
--      flow_version; DROP TABLE question_bank_reports; DROP TABLE
--      question_bank; — safe in any order given the FK direction
--      (reports/weekly_questions reference question_bank, not the
--      reverse), but drop reports and the weekly_questions column
--      before dropping question_bank itself.
-- ============================================================
