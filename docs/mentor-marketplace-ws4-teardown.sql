-- Mentor Marketplace (Career OS Workstream 4) — CONTAINMENT / DOWN-MIGRATION script.
--
-- NOT APPLIED. This is a documented last-resort procedure, not something to run casually.
-- Flag-off (see docs/mentor-marketplace-operator-runbook.md §9) is almost always the correct
-- first response to any incident — it takes effect in one restart/rebuild cycle, is fully
-- reversible, and destroys no data. Only run this script if the schema itself (not just live
-- traffic to it) genuinely needs to be removed.
--
-- Validated for syntactic correctness on 2026-07-24 via `BEGIN; ...; ROLLBACK;` against the real
-- production schema (project eybchcqwbizjmzyrviri) during the Workstream 4 release-verification
-- pass — the DROP statements below executed without error and were then rolled back, so nothing
-- was actually removed. This file itself has never been run with COMMIT.
--
-- Order matters: tables are dropped in reverse dependency order (a table referencing another via
-- FK is dropped before the table it references). If you add IF NOT EXISTS foreign keys elsewhere
-- pointing INTO any of these tables in the future, re-check this order before running it — it will
-- fail loudly (not silently) if a live FK from OUTSIDE this list still points at one of these
-- tables, which is a safety feature, not a bug.
--
-- To actually run this: paste into the Supabase SQL editor (or `execute_sql`/`apply_migration` via
-- the Supabase MCP tools) WITHOUT the surrounding BEGIN/ROLLBACK below, replacing ROLLBACK with
-- COMMIT once you are certain. Take a schema/data backup first regardless.

BEGIN;

DROP TABLE IF EXISTS mentor_review_reports;
DROP TABLE IF EXISTS mentor_reviews;
DROP TABLE IF EXISTS mentor_disputes;
DROP TABLE IF EXISTS mentor_payout_line_items;
DROP TABLE IF EXISTS mentor_payouts;
DROP TABLE IF EXISTS mentor_payment_webhook_events;
DROP TABLE IF EXISTS mentor_idempotency_keys;
DROP TABLE IF EXISTS mentor_payments;
DROP TABLE IF EXISTS mentor_bookings;
DROP TABLE IF EXISTS mentor_availability_slots;
DROP TABLE IF EXISTS mentor_audit_log;
DROP TABLE IF EXISTS mentor_profiles;
DROP TABLE IF EXISTS mentor_applications;

DROP FUNCTION IF EXISTS mentor_reserve_slot(uuid, uuid, uuid, timestamptz, timestamptz, numeric, text, integer);
DROP FUNCTION IF EXISTS mentor_confirm_booking(uuid, uuid);
DROP FUNCTION IF EXISTS mentor_release_booking(uuid, text, uuid, text);
DROP FUNCTION IF EXISTS mentor_is_admin(uuid);

-- Change ROLLBACK to COMMIT to actually apply this. Left as ROLLBACK intentionally so this file
-- is inert if ever accidentally executed wholesale.
ROLLBACK;
