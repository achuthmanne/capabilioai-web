# Partner Bridge — capabilio-recruiter integration spec

**Status:** capabilio-web side implemented 2026-08-06. capabilio-recruiter side
NOT YET implemented — this doc is the contract for whoever builds it.

## Why this exists

capabilio-web (Institution Path) and capabilio-recruiter (Recruiter Path) are
two separate codebases, two separate Vercel/Render deployments, and **two
separate Supabase projects with separate auth**. A recruiter account has no
profile row and no session in capabilio-web's database, and vice versa.

The Institution "Talent Network" page (`frontend/src/pages/InstitutionOS.jsx`
→ `+ Invite Company`) writes a row to capabilio-web's `org_company_links`
table. Before this change, that invite could only ever be accepted by a user
who *also* had a `profiles` row in capabilio-web's own DB with
`org_type = 'company'` — which no real capabilio-recruiter user has. That's
why "College Connections" on recruiter.capabilio.online showed "No
institutions in the directory yet" no matter how many invites the college
sent: there was no data path between the two products at all.

This bridge closes that gap with three new endpoints, service-to-service,
authenticated by a shared secret — never a per-user session or JWT crossing
between the two apps.

## Base URL & auth

All routes are on **capabilio-web's backend**, mounted at `/api/partner`.

Every request must include:

```
x-partner-secret: <PARTNER_BRIDGE_SECRET>
```

This value is an operator-provisioned string, identical in both apps' env
(capabilio-web's Vercel env and capabilio-recruiter's Render/Vercel env). It
is never sent to a browser on either side — only server calls server. If the
header is missing or wrong, capabilio-web returns `401`. If capabilio-web's
own env doesn't have `PARTNER_BRIDGE_SECRET` set, every call 503s.

## Endpoints capabilio-recruiter's backend should call

### 1. `GET /api/partner/company-invites?email=<recruiter's company contact email>`

Call this from capabilio-recruiter's backend when a recruiter user opens
"College Connections" — proxy it, don't expose capabilio-web's URL/secret to
the recruiter's browser directly.

- `email` — required. Match against whatever contact email the institution
  typed when inviting (case-insensitive exact match, not fuzzy). This is
  almost certainly the email on the recruiter's own company/org record in
  capabilio-recruiter's DB, not the individual logged-in user's email.
- `limit` — optional, default 50, max 100.

**Response 200:**
```json
{
  "invites": [
    {
      "id": "uuid",
      "institution_org_id": "uuid",
      "institution_name": "DVR & Dr. HS MIC College of Technology",
      "company_name": "Capabilio ventures Private Limited",
      "company_email": "founder@capabilio.online",
      "company_website": "https://www.capabilio.online/",
      "company_address": "",
      "company_size": "",
      "industry": "",
      "notes": "",
      "status": "invited",
      "visibility": "roster",
      "created_at": "2026-08-06T...",
      "linked_at": null,
      "accepted_via": null
    }
  ]
}
```

`status` is one of `invited | active | paused | rejected`. Render `invited`
rows as pending requests (this is what should populate the "College
Connections" list instead of the current empty state), `active` as already
connected, `rejected` as declined. There is no `paused` path reachable from
this bridge yet (that's a same-DB college-side action).

### 2. `POST /api/partner/company-invites/:id/accept`

Call when the recruiter clicks "Accept" on a pending invite. `:id` is the
invite's `id` from the list above.

**Body:**
```json
{
  "partnerCompanyId": "<capabilio-recruiter's own company/org id>",
  "acceptedByEmail": "<the recruiter user's email, for audit display only>"
}
```

`partnerCompanyId` is required and is treated as an opaque string — store
whatever capabilio-recruiter uses internally to identify the company (its own
UUID, not a capabilio-web id).

**Response 200:** `{ "success": true, "link": { ...updated row... } }`
**Response 409:** invite was already accepted/declined by someone (either
through this bridge or through capabilio-web's own same-DB flow) — refetch
the list and show current status rather than retrying blindly.
**Response 404:** invite id doesn't exist.

### 3. `POST /api/partner/company-invites/:id/decline`

Same shape, no body required. `{ "success": true }` on success, same 409/404
semantics as accept.

## What this bridge deliberately does NOT do

- **No PII.** Institution names and the company's own contact info are all
  this exposes — never a student's email, phone, or resume. Student roster
  data (once a link is `active`) is a *separate, still same-DB-only*
  endpoint (`GET /api/org/company-links/:id/students` in capabilio-web) that
  is not yet bridged. If capabilio-recruiter needs roster data after
  accepting an invite, that's a follow-up endpoint, not built here — flag
  before assuming it exists.
- **No reverse flow.** A recruiter cannot yet *initiate* a request to a
  college that hasn't invited them — only accept/decline what the college
  already sent. Building that requires new UI on the institution side to
  action incoming requests, which doesn't exist in capabilio-web's frontend
  yet.
- **No polling/webhook push.** capabilio-recruiter must poll
  `GET /company-invites` (e.g. on page load) — capabilio-web does not push
  new-invite notifications to it.

## Operator checklist before this works end-to-end

1. Generate one secret, set `PARTNER_BRIDGE_SECRET` in capabilio-web's Vercel
   env (see `server.env.example`).
2. Set the same value in capabilio-recruiter's Render env under whatever name
   its backend expects (e.g. `CAPABILIO_WEB_PARTNER_SECRET`) — that's outside
   this repo, someone with access to that deployment must do it.
3. Run `org_company_links_partner_bridge_migration.sql` against capabilio-web's
   Supabase project (adds `partner_company_ref`, `partner_accepted_by`,
   `accepted_via` columns — idempotent, safe to re-run).
4. Redeploy capabilio-web's backend so `partnerBridge.js`'s new routes go live.
5. Build/point capabilio-recruiter's "College Connections" page at these three
   endpoints, proxied through its own backend (not called directly from its
   browser — the shared secret must never reach a browser).
