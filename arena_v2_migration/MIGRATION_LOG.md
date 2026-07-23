# Arena V2 Migration Log

Record of when each migration file was actually applied to which environment, so every environment can be confirmed to be running the exact same SQL.

| Migration file | Applied via | Applied to | Applied at | Result |
|---|---|---|---|---|
| `001_schema.sql` | Supabase MCP `apply_migration` (name: `arena_v2_milestone1_schema`) | `capabilio` (project ref `eybchcqwbizjmzyrviri`) | 2026-07-18 01:38 UTC | Success — 18 `av2_*` tables created, all RLS-enabled, all indexes/policies created. Verified via `list_tables` and `information_schema` queries. |
| `002_admin_flag.sql` | Supabase MCP `apply_migration` (name: `arena_v2_milestone2_admin_flag`) | `capabilio` (project ref `eybchcqwbizjmzyrviri`) | 2026-07-18 01:39 UTC | Success — `profiles.is_admin` (boolean, not null, default false) + `idx_profiles_is_admin` created. |

**Pre-migration safety steps performed** (see `docs/backups/pre-arena-v2-migration-checksums.json`):
- Independent line-by-line SQL audit of both files confirming zero destructive statements and zero non-additive changes to any Arena V1 table.
- Row-count + MD5 checksum fingerprint of every non-empty Arena V1 table, taken immediately before applying either migration.

**Post-migration verification performed:**
- `list_tables` confirms exactly 18 new `av2_*` tables, all with `rls_enabled: true`, all with `rows: 0` (correctly empty — no content seeded yet).
- `profiles.is_admin` confirmed present with the expected type/nullability/default.
- Checksums of `arena_submissions`, `jobs`, and `problems` re-taken post-migration and confirmed byte-for-byte unchanged. `profiles`' checksum changed only in the expected way (every row gained the new `is_admin` column).
- Supabase's security advisor (`get_advisors`, type `security`) run post-migration: the only two new findings are both `INFO`-level "RLS enabled, no policy" on `av2_challenge_analytics_events` and `av2_challenge_payload_rejections` — this is intentional (service-role-only access, per the migration's own design comment), not a gap. No new `WARN`-level finding is related to this migration.

| `fix_referral_codes_missing_unique_user_id` (ad hoc, not an Arena V2 migration file) | Supabase MCP `apply_migration` | `capabilio` (project ref `eybchcqwbizjmzyrviri`) | 2026-07-18 20:12 UTC | Success — P0 fix, unrelated to Arena V2. See below. |

## P0 finding: new user signups were broken platform-wide (discovered while creating the Arena V2 E2E test user)

While attempting to create a dedicated test user (`arena.e2e@capabilio.test`) via the Dashboard for Arena V2 end-to-end verification, user creation failed with a generic "Database error creating new user." The real error, pulled from `get_logs(service=auth)`, was:

```
ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification (SQLSTATE 42P10)
```

Root cause: the `on_auth_user_created_referral` trigger on `auth.users` calls `create_referral_code_for_new_user()`, which runs `INSERT INTO public.referral_codes (user_id, ...) ... ON CONFLICT (user_id) DO NOTHING`. `referral_codes` had `UNIQUE(code)` and `PRIMARY KEY(id)` but **no unique constraint on `user_id`** — so the `ON CONFLICT (user_id)` clause was invalid SQL from Postgres's perspective, and every signup attempt (real users included, not just this test) failed at the database layer.

This is entirely unrelated to Arena V2 — the trigger and table predate this work and neither migration file touches `referral_codes`. Confirmed via `get_logs(auth)` that real signup attempts were failing before this fix. Confirmed zero existing duplicate `user_id` rows in `referral_codes` before applying the fix (so the new constraint applies cleanly with no data conflicts). Fixed with a one-line additive migration: `ALTER TABLE public.referral_codes ADD CONSTRAINT referral_codes_user_id_key UNIQUE (user_id);`

## Dedicated E2E test user + minimal content seed (2026-07-18)

- Test user created via Supabase Dashboard: `arena.e2e@capabilio.test`, id `f5c8f809-9ef3-47e6-855b-7ae7d41f0d9a`. Confirmed `profiles` row auto-created correctly by the `handle_new_user()` trigger.
- Minimal real content seeded via SQL (same shape `challenge-library/repository.js`'s `createX()` functions produce): one `av2_role_capabilities` row (Data Analyst / IT), one `av2_skill_dependency_graphs` row (SQL), one `av2_scenario_packs` row (`banking-fraud-detection`), one `av2_datasets` + `av2_dataset_versions` row (`orders-v1`), one `av2_challenge_templates` + `av2_challenge_template_versions` row (`sql-total-revenue`, domain, ELO-eligible), and one `av2_domain_challenge_grants` row for the test user.
- **Not yet run**: the actual end-to-end pipeline code (`getOrIssueChallenge`, `submitChallenge`) against this real project. The sandbox this codebase was built in has outbound network access to `*.supabase.co` blocked by its own allowlist (confirmed via direct `curl` — `403 blocked-by-allowlist`), so the real repository.js files (which call this project over that exact path) cannot execute from there. Two scripts are provided to run from a machine with real network access:
  - `scripts/e2e-verify-real-supabase.mjs` — runs the real pipeline (issuance -> submission -> assessment -> reward -> portfolio) against this project using the test user above, asserting the same checks the local pglite E2E test covers.
  - `scripts/e2e-verify-cascade-delete.mjs` — run after deleting the test auth user via the Dashboard, confirms every `av2_*`/`referral_codes` row tied to that user was actually removed by the `ON DELETE CASCADE` chain.

## Deployment Status

✅ Arena V2 schema applied
✅ Production migration verified
✅ Existing Arena V1 data verified unchanged
✅ Production signup issue fixed
✅ Dedicated E2E user created
✅ Minimal seed content loaded
⬜ Execute real network-backed E2E pipeline
⬜ Verify cascade deletion
⬜ Remove E2E user (after verification)
