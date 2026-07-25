# Company Module WS5 — Migration Plan (draft, not applied)

Companion to `career_os_ws5_company_module_migration.sql` (draft schema, not applied),
`docs/company-module-ws5-rls-plan.md`, and `docs/company-module-ws5-api-contract.md`.

## Apply order (single migration, applied atomically via Supabase MCP `apply_migration`)

1. `companies` (no FK dependencies on other new tables).
2. `company_name_aliases` (FK → `companies`).
3. `company_memberships` (FK → `companies`, `auth.users`).
4. `company_employment_links` (FK → `companies`, `auth.users`).
5. `profiles` extension columns (FK → `companies`).
6. `ENABLE ROW LEVEL SECURITY` on all four new tables.
7. RLS policies per `docs/company-module-ws5-rls-plan.md` (written as a second, immediately
   following statement in the same migration — not a separate later migration, learning from the
   mentor-marketplace advisor-driven fix where a follow-up privilege correction was needed; the plan
   here is to get the `EXECUTE`/policy grants right in the first pass and verify via `get_advisors`
   before considering the migration done, not after).
8. `company_confirm_employment_link` SECURITY DEFINER function + explicit
   `REVOKE EXECUTE FROM PUBLIC` + `GRANT EXECUTE TO authenticated` (in that order, in the same
   migration, verified via `get_advisors` immediately after apply).

## Backfill (separate step, after schema is applied, dry-run first)

A new script, `scripts/companyBackfill.mjs` (not yet written), following the same dry-run-by-
default/`--commit`-to-write pattern as `scripts/importQuestionBank.mjs` and
`scripts/mentorReconciliation.mjs`:

1. **Enumerate real existing free-text company strings** from `jobs.company`, `offers.company`,
   and `employment_history.employer_name` — this must be run against the actual live data, not
   assumed empty (unlike the dead `companies`/`company_ratings` scaffolding, `jobs`/`offers` may
   have real rows).
2. For each distinct normalized string: check `company_name_aliases` for an existing match; if
   none, create a new `companies` row (`source='system_seeded'`) + alias row.
3. For `employment_history` rows specifically, additionally run the confidence-scored matching
   (§4 of the design proposal) and create `company_employment_links` rows at the appropriate
   `link_state` per the confidence rules — never auto-advancing `profiles.company_link_state` past
   `unemployed` during backfill, since backfill-created links start at `system_suggested` same as
   any real-time match, requiring the same user-confirmation step before becoming a real link.
4. Dry-run output must report: distinct company names found, how many new `companies` rows would
   be created, how many alias rows would be created, and — critically — a sample of the highest-risk
   fuzzy matches (lowest confidence scores that still cleared the auto-suggest threshold) for manual
   spot-check before `--commit`, since false-positive company merges are the main risk in this step.
5. Idempotent and re-runnable: `company_name_aliases.normalized_alias` uniqueness prevents
   duplicate rows if the script runs again after new jobs/offers are created.

## Staging validation

Same standing constraint as every prior workstream: no Supabase branching available on this
project's plan. Staging validation substitute: apply the migration, immediately run
`get_advisors` (security type), and — since this migration is purely additive with no data
transformation in the DDL itself (backfill is a separate, later, reversible step) — the main risk
surface is RLS/grant correctness, which `get_advisors` plus the RLS test plan (§ RLS plan doc)
covers without needing an isolated environment. This is documented as a gap, not silently worked
around, consistent with WS2/WS3/WS4's handling of the same constraint.

## Rollback plan

- **Flag-off rollback** (primary): `company_module_v1` off hides all new routes/UI immediately;
  the new tables/columns sit unused since nothing else in the codebase reads
  `profiles.company_id`/`company_link_state`/`company_visibility_public` today.
- **Schema teardown** (secondary, for a genuine unwind): reverse-dependency-order `DROP`:
  `company_employment_links`, `company_memberships`, `company_name_aliases`, `companies`, then
  `ALTER TABLE profiles DROP COLUMN company_id, DROP COLUMN company_link_state, DROP COLUMN
  company_visibility_public`. Written as a separate, clearly-labeled, NOT-applied teardown SQL file
  before implementation ships (same pattern as the mentor-marketplace teardown script), validated
  via `BEGIN;...;ROLLBACK;` against the real schema without committing anything.
- **Backfill rollback**: since backfill only ever creates NEW rows (never modifies `jobs`/`offers`/
  `employment_history`), rolling back backfill is simply deleting the `companies`/
  `company_name_aliases`/`company_employment_links` rows created by it (the script should tag its
  own inserts with a `source`/`batch_id` marker to make this precise, not a blanket delete).

## Explicit non-negotiables restated

- `jobs.company` / `offers.company` are never altered by this migration or backfill.
- The normalization side-effect on job/offer creation (once built, post-migration) must be
  provably non-blocking — any failure there must never fail the parent write. This is an
  implementation-time acceptance test, not just a design intent, before this workstream is
  considered done.
- No migration is applied until this plan, the schema draft, the RLS plan, and the API contract
  are all explicitly approved.
