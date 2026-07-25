# Company Module WS5 — RLS Plan (draft, not applied)

Companion to `career_os_ws5_company_module_migration.sql` (draft schema, not applied) and
`docs/company-module-ws5-design-proposal.md` (v2). This document specifies the exact RLS policies
to be added when the migration is applied — no policy here has been created yet.

## `companies`

| Policy | Role | Using / With Check |
|---|---|---|
| `companies_select_public` | `anon`, `authenticated` | `USING (true)` — directory data, not sensitive |
| `companies_insert_system` | `service_role` | full access (system-seeded/admin-created rows, and the controlled "create new company" RPC runs as service role after server-side dedup checks) |
| `companies_update_admin` | `service_role` | admin-only updates (merge, verification flag) go through backend, not direct client `UPDATE` |

No direct client `INSERT`/`UPDATE` policy — company creation from a user's "none of these match"
path goes through a server-side RPC that enforces the confidence-threshold precondition before
inserting, never a raw client-side table insert.

## `company_name_aliases` — required revision 3: no client policies at all

| Policy | Role | Using / With Check |
|---|---|---|
| (none) | `anon`, `authenticated` | RLS enabled, zero policies defined for these roles → default-deny on all operations |
| full access | `service_role` | implicit (service role bypasses RLS) |

Client-facing search is served exclusively by `GET /api/company/search` (see API contract),
which runs server-side against this table and returns only `{company_id, name, logo_url}`.

## `company_memberships`

| Policy | Role | Using / With Check |
|---|---|---|
| `memberships_select_own` | `authenticated` | `USING (user_id = auth.uid())` |
| `memberships_select_roster` | `authenticated` | `USING (EXISTS (SELECT 1 FROM company_memberships m2 WHERE m2.company_id = company_memberships.company_id AND m2.user_id = auth.uid() AND m2.status = 'active' AND m2.role IN ('admin','owner')))` — an active admin/owner can see their own company's full roster, not other companies' |
| `memberships_update_admin_only` | `authenticated` | `USING`/`WITH CHECK` same admin/owner-of-this-company condition as above, scoped to `role`/`status` columns only (application-layer enforces which columns an admin may change; RLS gates the row, not individual columns — column-level enforcement happens in the route handler) |
| `memberships_insert_self_pending` | `authenticated` | `WITH CHECK (user_id = auth.uid() AND status = 'pending')` — a user can request membership in a company (self-claim), always starting `pending`, never `active` |
| full access | `service_role` | implicit |

## `company_employment_links`

| Policy | Role | Using / With Check |
|---|---|---|
| `links_select_own` | `authenticated` | `USING (user_id = auth.uid())` |
| `links_update_own` | `authenticated` | `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND link_state IN ('user_confirmed','user_rejected'))` — a user may only ever set their own row to `user_confirmed`/`user_rejected`, never `system_suggested`/`admin_confirmed` (those two are service-role/admin-only transitions) |
| `links_select_employer_aggregate` | none at the table level | Employer aggregate counts ("142 confirmed employees") are served through a separate narrow view/RPC that returns only a count, never row-level access to this table for non-owners — see the view definition below |
| full access | `service_role` | implicit |

**`company_confirmed_link_counts` (view, not a table, read-only, security-invoker off / defined as
security-definer-safe aggregate)**: `SELECT company_id, count(*) AS confirmed_count FROM
company_employment_links WHERE link_state IN ('user_confirmed','admin_confirmed') GROUP BY
company_id`. Grant `SELECT` on this view to `authenticated`, scoped further at the route layer to
only return the row for a company the requester has an active membership in — the view itself
does the aggregation so no policy can accidentally leak a row-level join back to individual users.

## `profiles.company_id` / `company_link_state` / `company_visibility_public`

These are columns on the existing `profiles` table, governed by whatever RLS policy already exists
on `profiles` (owner-can-update-own, already in place) — no new policy needed for the `UPDATE` path
itself. What's new: a narrower **read** path for `company_id`/`company_link_state` when accessed by
someone other than the row's own user — this requires either (a) a Postgres column-level `SELECT`
grant differentiation (harder to do cleanly with RLS, which is row-level not column-level), or (b)
a public-safe view (`profiles_public_company_view`) that only exposes `company_id`/
`company_link_state` for rows where `company_visibility_public = true`, and is what any
company-facing or public profile-lookup code queries instead of the base `profiles` table directly.
**Recommendation: option (b)**, consistent with the "no client-authored, no accidental leak via app
bug" principle already established for mentor marketplace's booking/payment tables — the view, not
application-code discipline, is the actual security boundary.

## SECURITY DEFINER functions (if any needed)

Unlike mentor marketplace, WS5 core doesn't need a row-locked reservation-style function — company
creation and membership requests don't have the same concurrency/race requirements as slot booking.
The one function worth having is `company_confirm_employment_link(link_id uuid, confirm boolean)`,
`SECURITY DEFINER`, callable by `authenticated` (grant EXECUTE explicitly — and, learning from the
mentor-marketplace advisor finding, explicitly `REVOKE EXECUTE FROM PUBLIC` then re-`GRANT` only to
`authenticated`, verified via `get_advisors` after migration, not assumed), which: validates the
row belongs to the caller, sets `link_state` to `user_confirmed`/`user_rejected`, and — only on
confirm — updates `profiles.company_id`/`company_link_state` atomically in the same transaction.
This keeps the "user confirms → profile updates" step atomic without needing two separate
client-side calls that could race or partially fail.

## Testing plan (to run for real once applied, matching the mentor-marketplace verification
## discipline — not skipped this time)

- `SET ROLE`/JWT-claim simulation across owner/non-owner/anon/admin contexts for every table above,
  same technique already proven out in the mentor-marketplace release-verification pass.
- Explicit test that `company_name_aliases` returns zero rows to `anon`/`authenticated` under any
  query shape.
- Explicit test that the `SECURITY DEFINER` function's `EXECUTE` grant survives a fresh migration
  apply (Supabase auto-grants new functions to `anon`/`authenticated` by default — the mentor
  marketplace pass caught this the hard way, do not repeat that mistake silently here).
