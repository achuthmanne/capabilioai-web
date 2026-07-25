# Career OS Workstream 2 — Sync Reconciliation Report

Run date: 2026-07-24
Project: `eybchcqwbizjmzyrviri` (production)
Scope: all 3 profiles in production, all sync sources (`profiles.experiences`,
`profiles.certifications`, `career_timeline` legacy rows).

This report satisfies the release safeguard requiring a reconciliation output
before Workstream 2 ships: legacy records scanned, events created, duplicates
skipped, invalid/unmappable records, and errors.

## Summary

| Metric | Count |
|---|---|
| Legacy `career_timeline` records scanned | 0 |
| Profile source records scanned (experiences + certifications, all users) | 2 |
| Events built by the pure mapper (`buildSyncRows`) | 3 |
| Events actually inserted (first sync run, 2026-07-24 ~11:28 UTC) | 3 |
| Duplicates skipped on repeat run (this report's run) | 3 |
| Invalid / unmappable records | 0 |
| Errors | 0 |

## Per-user detail

| user_id | experiences scanned | certifications scanned | events built | notes |
|---|---|---|---|---|
| `1fc23b97-71bf-4af5-95cb-a4c8f6d11d59` | 0 | 0 | 0 | empty profile, correctly produces zero events, not an error |
| `e5085089-f9af-432e-b0eb-56768e74db7e` | 0 | 0 | 0 | empty profile, correctly produces zero events, not an error |
| `5d2c40e9-b021-45e5-a792-a468e0a7093b` | 1 | 1 | 3 | 1 experience → `company_join` + `company_exit_clean`; 1 certification → `certification_earned` |

## Duplicate-prevention verification

Re-running the identical insert for user `5d2c40e9-b021-45e5-a792-a468e0a7093b`
a second time (this report's run) attempted 3 rows and inserted 0 — all 3 were
correctly skipped as duplicates via the partial unique index
`career_events_idempotency_idx` on `(user_id, source_type, source_id,
event_type)`. This confirms the sync is safe to re-run on every authenticated
read (`GET /api/pro/v1/career/timeline`'s sync-on-read design) without ever
creating duplicate ledger entries.

## Invalid / unmappable records

None encountered. `parseFlexibleDate` handled the real production date format
(`"08/2017"`, MM/YYYY) without error — this was the specific shape verified in
`careerEventSync.test.js`. No experience or certification entry in production
today lacks the minimum fields (`company`/`title`/`role` for experiences,
`name` for certifications) needed to map to an event; `mapExperienceToEvents`
and `mapCertificationToEvent` both return `[]`/`null` rather than throwing when
fields are missing, so future incomplete entries will show up here as
"invalid/unmappable" rather than crashing the sync.

## Errors

None. Zero exceptions thrown by `buildSyncRows` across all 3 profiles.

## How this report was generated

1. Queried `profiles.id, experiences, certifications` for all rows (3 profiles)
   and `career_timeline` (0 rows) directly from production via the Supabase
   MCP `execute_sql` tool.
2. Ran the pure, dependency-free `buildSyncRows()` function (no DB access)
   against that real data locally to get "records scanned" / "events built" /
   "invalid" counts without any side effects.
3. Re-ran the actual idempotent `INSERT ... ON CONFLICT ... DO NOTHING`
   statement against production to get real "duplicates skipped" / "inserted"
   counts, using a single SQL statement with a `WITH` CTE so the attempted vs.
   inserted counts come from the same atomic operation.

## Known limitation of this report

This is a **point-in-time, all-users snapshot**, not a running/scheduled
reconciliation job — appropriate given the current 3-user, 2-source-record
production volume (§ Workstream 2 audit, `career-os-implementation-plan.md`
§5c). The endpoint itself (`GET /api/pro/v1/career/timeline`) performs the
same per-user sync-on-read logic in production traffic and returns a `_sync`
debug block in non-production environments; a standalone, scheduled
reconciliation job generating a report like this one automatically is
deferred until the user base is large enough that manual/on-demand
reconciliation is no longer sufficient (tracked as a follow-up in
`career-os-implementation-plan.md`).
