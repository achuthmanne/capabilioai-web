# Company Module WS5 — API Contract (draft, not built)

Companion to the design proposal (v2) and RLS plan. All routes below are gated by a new
`company_module_v1` feature flag (default `false`, both frontend and backend) — none of this is
built yet; this is the contract to implement against. Route family: `/api/pro/v1/company/*`
(mirrors the mentor-marketplace naming convention already established).

## User-facing routes

### `GET /api/pro/v1/company/search?q=<text>`
Server-side search against `company_name_aliases`/`companies` (never exposes the alias table
directly to the client). Returns up to 20 matches: `[{ company_id, name, logo_url }]`. Used by the
"search for the correct company" UI and the manual company-picker.

### `GET /api/pro/v1/company/:id`
Company Overview read. Returns `{ id, name, domain, industry, size_band, hq_location, logo_url,
is_verified_partner }`. No review/rating data (WS6). Public within the flag (any authenticated
user), matching `companies`' public-read RLS policy.

### `GET /api/pro/v1/company/me/links`
Returns the caller's own `company_employment_links` rows still in `system_suggested` state (the
"is this your employer?" pending-confirmation queue), plus their current `profiles.company_id`/
`company_link_state`.

### `POST /api/pro/v1/company/me/links/:linkId/confirm`
Body: `{}`. Calls the `company_confirm_employment_link(link_id, confirm=true)` SECURITY DEFINER
function. Requires `Idempotency-Key` header (same discipline as mentor marketplace's mutating
routes) since this is a state-changing POST.

### `POST /api/pro/v1/company/me/links/:linkId/reject`
Body: `{}`. Calls `company_confirm_employment_link(link_id, confirm=false)`. Requires
`Idempotency-Key`.

### `POST /api/pro/v1/company/me/link`
Body: `{ company_id }` — manual "search and select the correct company" path, when no suggested
link exists or the user rejected the suggestion. Sets `profiles.company_id` directly and
`company_link_state` to `linked_independently`/`employer_not_partner` per the same rule as
confirmed suggestions. Requires `Idempotency-Key`.

### `POST /api/pro/v1/company/create`
Body: `{ name, domain?, industry?, hq_location? }` — the "none of these match, this is a new
company" path. Server-side precondition: only allowed if the search endpoint (called first by the
client) returned no match above the confidence threshold for the same normalized name — enforced
server-side, not trusted from the client. Creates a `companies` row with `source='user_created'`,
`is_verified_partner=false`. Requires `Idempotency-Key`.

### `PATCH /api/pro/v1/company/me/settings`
Body: `{ company_visibility_public: boolean }`. The privacy toggle from §5 of the design proposal.

### `GET /api/pro/v1/company/:id/insights` (stub only, WS5 scope)
Returns `{ available: false, reason: "coming_soon" }` unconditionally in WS5 — this is the
plumbing/entry-point only; WS6 will replace the body once aggregate review data exists. Building
the route now (rather than omitting it) lets the frontend ship the tab/card without a second
deploy once WS6 lands.

## Admin/company-staff routes (require an `active` `admin`/`owner` `company_memberships` row for
## the target `company_id`, or platform `profiles.is_admin`)

### `GET /api/pro/v1/company/:id/roster`
Returns the company's `company_memberships` rows (staff roster) — gated by the
`memberships_select_roster` RLS policy, double-checked at the route layer.

### `PATCH /api/pro/v1/company/:id/memberships/:membershipId`
Body: `{ role?, status? }` — approve a pending membership request, change a member's platform role,
or revoke access. Admin/owner only.

### `GET /api/pro/v1/company/:id/confirmed-employee-count`
Returns `{ confirmed_count }` from the `company_confirmed_link_counts` view (§ RLS plan) — the
aggregate-only, no-individual-identity path for employer-side visibility.

## Platform-admin routes (`profiles.is_admin`, reusing the existing `requireAdmin` middleware —
## mounted under `/api/admin/company`, NOT bare `/api`, learning directly from the
## questionBankAdmin routing-shadow hotfix)

### `POST /api/admin/company/:id/merge`
Body: `{ merge_into_id }` — non-destructive merge (§3 of the design proposal): re-points all
`company_name_aliases.company_id` rows from `:id` to `merge_into_id`, sets `:id`'s
`merged_into_id = merge_into_id`, never deletes the losing row.

### `POST /api/admin/company/:id/verify-partner`
Body: `{}` — sets `is_verified_partner = true`. This is the one lever that (eventually, once wired
elsewhere) enables the `employer_verified_partner` reserved state to become reachable — not built
in WS5, but this endpoint's existence is the natural seam for that later work.

## Explicitly not built in WS5

- Any review/rating submission or read endpoint (WS6).
- Any endpoint that returns individual identities behind the aggregate employee-count view.
- Canonical-company-based job search (jobs/offers stay free-text-searched, per the compatibility
  plan).
- Employer-side dashboard beyond the roster + aggregate-count endpoints above.
