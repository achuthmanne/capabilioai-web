# Company Module WS5 — Rollout Checklist (draft)

Pre-implementation checklist. Nothing below is checked off yet — this is the gate list to clear
before `company_module_v1` is ever flipped on for real users.

## Design / review
- [ ] Design proposal v2 (blueprint-aligned naming, expanded `company_memberships`, locked-down
      alias table) approved as final.
- [ ] Migration plan, schema SQL draft, RLS plan, and API contract all reviewed together (not in
      isolation — the naming/RLS/API pieces are cross-referential).

## Schema / migration
- [ ] Migration applied via Supabase MCP `apply_migration` against `eybchcqwbizjmzyrviri`.
- [ ] `get_advisors` (security) run immediately after apply; zero new warnings introduced by this
      migration (pre-existing unrelated warnings are out of scope).
- [ ] `company_confirm_employment_link`'s `EXECUTE` grant explicitly verified — not assumed — to be
      `authenticated`-only (revoked from `PUBLIC` first, granted second), matching the lesson from
      the mentor-marketplace migration.

## RLS verification (real tests, not just policy review — same discipline as the mentor-marketplace
## release-verification pass)
- [ ] Owner/non-owner/anon/admin `SET ROLE` simulation run for real against every new table.
- [ ] Confirmed `company_name_aliases` returns zero rows to `anon`/`authenticated` under any query.
- [ ] Confirmed a non-member cannot read another company's roster via `company_memberships`.
- [ ] Confirmed `company_confirm_employment_link` rejects a call for a `link_id` the caller doesn't
      own.

## Backend
- [ ] All routes in the API contract implemented, gated by `company_module_v1`.
- [ ] `Idempotency-Key` enforced on every mutating route (reusing the mentor-marketplace
      idempotency library if its shape fits, rather than reimplementing).
- [ ] Company-search endpoint proven to never leak raw `company_name_aliases` rows in its response
      shape.
- [ ] Company-creation endpoint's "no existing match above threshold" precondition proven
      server-side-enforced, not client-trusted (attempt to bypass it from a test client and confirm
      rejection).

## Backfill
- [ ] `scripts/companyBackfill.mjs` written, dry-run against real `jobs.company`/`offers.company`/
      `employment_history.employer_name` data.
- [ ] Dry-run output reviewed by a human: distinct-company count, alias count, and a manual
      spot-check of the lowest-confidence auto-suggested matches.
- [ ] `--commit` run only after the dry-run review above, not automatically chained.
- [ ] Confirmed zero rows in `jobs`/`offers`/`employment_history` were modified by the backfill
      (it only ever creates new `companies`/`company_name_aliases`/`company_employment_links` rows).

## Compatibility
- [ ] Confirmed existing job posting flow (`recruiterComms.js`) still writes/searches
      `jobs.company` exactly as before, with the new normalization side-effect attached but proven
      non-blocking (kill the normalization function in a test and confirm the parent job-post write
      still succeeds).
- [ ] Same non-blocking proof for the `offers.company` write path and its timeline auto-copy.

## Frontend
- [ ] Company Overview page, link-state "is this your employer?" prompt, manual search-and-select
      UI, privacy toggle, and the insights stub entry point all built, gated by `company_module_v1`.
- [ ] Confirmed the insights stub renders its "coming soon" state cleanly with no broken UI once
      WS6 doesn't yet exist.

## Feature flag / rollback
- [ ] `company_module_v1` added to `frontend/src/config/featureFlags.js`, default `false`.
- [ ] Backend equivalent flag added, default `false`, gating every new route (403/404 while off,
      verified by actually hitting the routes with the flag off, not just reading the code).
- [ ] Teardown SQL written and validated via `BEGIN;...;ROLLBACK;`, not applied.

## Documentation
- [ ] `docs/career-os-implementation-plan.md` updated with the WS5 implementation section (files
      created, migration result, test results, build result) once implementation actually happens.
- [ ] This checklist itself updated to reflect real (not assumed) completion of each item before
      `company_module_v1` is ever flipped on.

## Explicit scope boundary (do not let implementation drift past this)
- [ ] No review/rating/moderation code written under this workstream — confirmed via a final grep
      before considering WS5 done, mirroring the same "confirm nothing unrelated crept in" step
      used at the end of the mentor-marketplace and hotfix passes.
