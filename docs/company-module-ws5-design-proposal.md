# Company Module — Workstream 5 Design Proposal (core only, no migrations yet)

Status: **v2 — approved with required revisions, 2026-07-24.** v1 (below) is kept for history;
this revision applies five required changes: (1) naming aligned exactly with
`Capabilio_Career_OS_Production_Blueprint.md` §12, with the relationship between the blueprint's
richer `company_link_state` model and WS5's narrower rollout documented explicitly; (2)
`company_memberships` expanded with employment-context fields; (3) `company_name_aliases` locked
down to service-role-only, no public read policy; (4) the backward-compatible rollout plan
reconfirmed unchanged; (5) scope reconfirmed limited to core/linkage/reconciliation/Overview
shell/privacy, excluding reviews/anonymity/moderation/aggregate publication (WS6). Still **nothing
applied** — no migrations run, no routes built, no feature flag created. See
`docs/company-module-ws5-migration-plan.md`, the schema SQL draft, RLS plan, API contract, and
rollout checklist (all draft-only, not applied) for the implementation-prep artifacts requested
alongside this revision.

## Blueprint alignment (required revision 1)

`Capabilio_Career_OS_Production_Blueprint.md` §12.1 already specifies concrete names for this
exact module:

```
profiles  (extend, additive columns only)
  + company_id uuid null fk companies.id
  + company_link_state enum(joined_via_capabilio, linked_independently,
                             unemployed, employer_not_partner, employer_verified_partner)

companies
  id uuid pk, name, domain, is_verified_partner bool, industry, size_band, hq_location, created_at

company_memberships
  id, user_id fk, company_id fk, role_title, department, join_date,
  exit_date null, verification_status enum(self_claimed, employer_verified, epfo_verified),
  manager_user_id null, created_at
```

**This revision adopts the blueprint's exact identifiers** — `profiles.company_id`,
`profiles.company_link_state`, `company_memberships` with `role_title`, `department`,
`join_date`, `exit_date`, `verification_status`, `manager_user_id` — replacing the v1 draft's
looser/invented names (`canonical_name`→`name`, `sector`→`industry`, `verified`→
`is_verified_partner`, `hq_country`→`hq_location`, and the missing `company_memberships`
employment-context fields, added now).

**The relationship between the blueprint's richer `company_link_state` and WS5's narrower
rollout, documented explicitly (this was the specific gap flagged):**

The blueprint's five enum values (`joined_via_capabilio`, `linked_independently`, `unemployed`,
`employer_not_partner`, `employer_verified_partner`) describe a *steady-state relationship type* —
what kind of relationship, if any, a user currently has with a company. This is a different axis
from *how a specific link claim got established or confirmed*, which is a workflow/provenance
concern, not a relationship-type concern. Conflating the two (as v1 did, by putting
workflow-progress values like `system_suggested`/`user_confirmed` directly into
`profiles.company_link_state`) was the actual design gap.

**Resolution:** `profiles.company_link_state` holds ONLY the blueprint's five values, always —
this is the one true column exposed to UI/API per the blueprint's spec, and its `CHECK` constraint
includes all five values from day one (no future migration needed to add a value). The
link-confirmation *workflow* (system-suggested vs. user-confirmed vs. user-rejected vs.
admin-confirmed) lives entirely on the separate `company_employment_links.link_state` column
(unchanged from v1, this is WS5-internal machinery, not a blueprint-specified field) and is what
*drives* transitions of `profiles.company_link_state`, never a value stored in it directly.

**WS5 ships a subset of the five blueprint states as reachable; the other two are reserved,
present in the schema, but not yet reachable by any code path in this workstream:**
- `unemployed` — default value, real, reachable (no confirmed link exists).
- `linked_independently` — real, reachable: set once a `company_employment_links` row reaches
  `user_confirmed` (self-service confirmation, no employer/partner relationship implied).
- `employer_not_partner` — real, reachable: set when a user confirms a link to a `companies` row
  that exists but has `is_verified_partner = false` (the common case for most companies at launch,
  since verification is a separate, not-yet-built process).
- `joined_via_capabilio` — **reserved, not reachable in WS5.** This value implies the user's
  employment relationship was established *through* a Capabilio-mediated flow (e.g. accepting an
  offer via the recruiter/offers system with a verified company on the other end) — building that
  attribution requires reconciling with the live `offers`/`recruiterComms.js` flow, which is
  explicitly out of scope for WS5 core (noted as a natural WS5-adjacent follow-on in §5/§8 below,
  not silently dropped).
- `employer_verified_partner` — **reserved, not reachable in WS5.** Requires the
  `is_verified_partner` flag on `companies` to actually mean something (a real partner
  verification/claim process), which does not exist yet — `company_memberships.verification_status`
  (self_claimed/employer_verified/epfo_verified) is the membership-level building block for this,
  but the company-level partner-verification workflow itself is not part of WS5 core.

This keeps the enum forward-compatible (no schema change needed when `joined_via_capabilio`/
`employer_verified_partner` become reachable later) while being honest that WS5 only implements
three of the five states end-to-end.

---
## v1 (superseded sections below, kept for history — see blueprint-alignment revision above for
## the naming/state-model changes that actually apply; §2 and §6 below are updated in-place to the
## v2 field names since re-deriving the whole document would be more confusing than clearly noting
## the deltas at the point of change)
---

## 1. Current-state grounding (from the 2026-07-24 audit)

**Dead scaffolding — safe to ignore/replace:**
- `companies` (0 rows): `id, name, normalized_name, domain, epfo_codes[], tier, country, sector,
  logo_url, created_at`. No RLS policies. Zero code references anywhere.
- `company_ratings` (0 rows): no reviewer-identity column at all, one `INSERT`-only RLS policy, no
  read policy. Zero code references. This table belongs to WS6's scope, not this one — it is not
  reused here, and its "not anonymity-safe" gap (no cohort/threshold logic) is WS6's problem to
  solve, not WS5's.
- `company_connections` (0 rows): an earlier, superseded draft of the institution↔company
  handshake that `org_company_links` implemented for real. Zero code references.

**Live systems that must be preserved, untouched, and not conflated with this module:**
- **Institution/Org OS company-linking is a separate, working system.** `org_company_links`,
  `org_members`, `org_audit_log`, `org_events`, `org_join_links`, `org_opportunities`, `org_tasks`
  power a college's Talent Network invite to a recruiter/company *account* (`CompanyInvitePage.jsx`,
  `InstitutionOS.jsx`, `backend/server/routes/orgCompanyLinks.js`). This is an institution-to-org
  handshake with token-based consent — it has no independent "company entity" concept, just a
  free-text `company_name`/`company_email`/`company_website` blob per invite row. **This workstream
  does not touch, extend, or migrate any `org_*` table.** The new `companies` entity introduced here
  is a professional-career-graph concept (which employer does a candidate work for / has worked
  for), fundamentally different from "which recruiter org did a college invite." Any future
  reconciliation between the two is an explicit follow-up decision, not assumed here.
- `jobs.company` and `offers.company` (free-text columns) are live, actively written to
  (`recruiterComms.js`), searched (`jobs.js`'s `company.ilike` query), emailed, and auto-copied into
  candidate timelines on offer acceptance. These must keep working, unmodified in their existing
  behavior, for the duration of this rollout (see §3).
- `employment_history` (real schema, EPFO-sourced intent, currently 0 rows in prod but a real,
  wired route/spec exists) has `employer_name` (free text) and `establishment_id` (EPFO code), with
  no FK to any company entity today.

## 2. Canonical data model (v2 — blueprint-aligned names)

Four new tables plus the blueprint's two `profiles` extension columns, additive only, no existing
table altered:

**`companies`** — the canonical entity, field names matching blueprint §12.1 exactly, with
WS5-specific reconciliation-support columns added alongside (not instead of) the blueprint fields:
`id uuid PK, name text NOT NULL` (blueprint), `domain text` (blueprint), `is_verified_partner
boolean DEFAULT false` (blueprint — see the reserved-states note above: this flag exists from day
one but no WS5 code path sets it true yet, since the partner-verification workflow itself isn't
built here), `industry text` (blueprint's `industry`, WS5 v1 called this `sector`), `size_band
text` (blueprint), `hq_location text` (blueprint — WS5 v1 called this `hq_country`; a plain text
field for now, structured city/region/country breakdown is a later refinement, not required to
ship), `created_at` (blueprint). **Added alongside, not in the blueprint's list but required for
WS5's reconciliation machinery to function:** `normalized_name text NOT NULL` (indexed, lowercased/
punctuation-stripped, used for fuzzy matching), `epfo_establishment_ids text[] DEFAULT '{}'`,
`logo_url text`, `source text CHECK IN ('system_seeded','user_created','admin_created')`,
`merged_into_id uuid NULL FK -> companies.id` (non-destructive merge target, see §3), `updated_at`.
This is a fresh table — the dead 0-row `companies` scaffold is abandoned, not migrated from.

**`company_name_aliases`** — the normalization backbone (WS5-internal, not a blueprint entity).
`id uuid PK, company_id uuid NOT NULL FK -> companies.id, alias_text text NOT NULL,
normalized_alias text NOT NULL (indexed), alias_source text CHECK IN ('user_input',
'recruiter_job_post','offer','employment_history','admin_merge'), confidence real (0-1),
created_at`. Every distinct free-text company spelling ever seen anywhere in the system gets a row
here once normalized, pointing at one canonical `companies` row. **Required revision 3: this table
has NO public read policy** (see §6) — client-side company search goes through a controlled
server-side search endpoint, never a direct table `SELECT` against this table.

**`company_memberships`** — blueprint §12.1's exact shape, links a user to a company as
staff/employee-on-platform (distinct from `employment_history`, which is CV-style career history —
this is "who currently represents/works inside this company on Capabilio"). `id uuid PK, user_id
uuid NOT NULL FK -> auth.users` (blueprint), `company_id uuid NOT NULL FK -> companies.id`
(blueprint), `role_title text NULL` (blueprint — required revision 2: their job title at this
company, e.g. "Engineering Manager," distinct from platform-access `role` below), `department text
NULL` (blueprint, required revision 2), `join_date date NULL` (blueprint, required revision 2),
`exit_date date NULL` (blueprint, required revision 2 — null while currently employed there),
`verification_status text CHECK IN ('self_claimed','employer_verified','epfo_verified') DEFAULT
'self_claimed'` (blueprint, required revision 2 — replaces v1's placeholder boolean with the
blueprint's real three-tier model), `manager_user_id uuid NULL FK -> auth.users` (blueprint,
required revision 2 — this person's manager, if known/entered, supporting the future "My Team"/
manager-relationship direction called out in the revision), `created_at` (blueprint). **Added
alongside for platform-access purposes** (not in the blueprint's field list, but needed since
`company_memberships` is also this module's staff-access-control table, per WS5's original design):
`role text CHECK IN ('member','admin','owner') DEFAULT 'member'` (platform permission level within
the company, separate from `role_title`'s job-title meaning — deliberately different names to avoid
confusion), `status text CHECK IN ('pending','active','revoked') DEFAULT 'pending'`, `invited_by
uuid NULL`, `updated_at`, `UNIQUE(company_id, user_id)`.

**`company_employment_links`** — the employment-reconciliation join (WS5-internal workflow
tracking, not a blueprint entity — see the blueprint-alignment section above for why this is
deliberately separate from `profiles.company_link_state`). Unchanged from v1: `id uuid PK, user_id
uuid NOT NULL FK -> auth.users, company_id uuid NOT NULL FK -> companies.id, source_table text
CHECK IN ('employment_history','experiences'), source_row_id uuid NOT NULL, link_state text CHECK
IN ('system_suggested','user_confirmed','user_rejected','admin_confirmed') DEFAULT
'system_suggested', confidence real (0-1), matched_via text CHECK IN ('epfo_establishment_id',
'normalized_name_exact','normalized_name_fuzzy','domain_email','manual'), created_at, updated_at,
UNIQUE(user_id, source_table, source_row_id)`.

**`profiles` extensions — blueprint §12.1's exact two columns, no more:**
- `profiles.company_id uuid NULL FK -> companies.id` (blueprint) — the user's current primary
  company association.
- `profiles.company_link_state text NULL CHECK IN ('joined_via_capabilio','linked_independently',
  'unemployed','employer_not_partner','employer_verified_partner') DEFAULT 'unemployed'`
  (blueprint's exact five-value enum — see the blueprint-alignment section above for which three
  are reachable in WS5 and which two are reserved). This column is set/transitioned only by the
  backend, driven by `company_employment_links.link_state` reaching `user_confirmed`/
  `admin_confirmed` (never written directly by a client, and never holds a workflow-progress value
  itself).
- `profiles.company_visibility_public boolean NULL DEFAULT false` — not a blueprint field, WS5-only
  privacy toggle (unchanged from v1, see §5/§6).

Every new table gets RLS enabled + policies (§6), and standard indexes on every FK and on
`normalized_name`/`normalized_alias` (needed for the fuzzy-match lookups in §4).

## 3. Compatibility plan (free-text fields keep working, unmodified, throughout)

- **`jobs.company` and `offers.company` are not altered, not renamed, not backfilled with a FK in
  this workstream.** They stay exactly as they are — free text, searched via `ilike`, emailed as-is,
  copied into timelines as-is. No behavior change to any existing recruiter flow.
- **Normalization is additive and read-only from the job/offer side**: whenever a job is posted or
  an offer is created (existing write paths, untouched), a lightweight, best-effort, non-blocking
  side-effect looks up (or creates) a `company_name_aliases` row for that exact string and links it
  to a `companies` row (creating a new `companies` row if no match exists above a confidence
  threshold — see §4). If this side-effect fails for any reason, the job/offer write still succeeds
  unaffected — this is deliberately "fire and forget," never a blocking dependency of the existing
  flow. No dual-write to `jobs`/`offers` schema is needed or proposed; there is no new column on
  those tables in this workstream.
- **Search stays on the free-text column** for now (`jobs.company ilike`) — a canonical-company-based
  search (e.g. "show me all jobs at this exact company regardless of spelling") is a natural
  follow-on once `company_name_aliases` has real coverage, but is explicitly NOT required for WS5
  to ship, and is called out as a later enhancement, not a blocking dependency.
- **Backfill**: a one-time, idempotent, re-runnable script normalizes every distinct existing
  `jobs.company` / `offers.company` string (today, in prod, there may be real rows here — this must
  be checked before backfill, not assumed empty like the dead scaffolding tables) into
  `company_name_aliases` + `companies`, without ever touching the source rows. Same script handles
  `employment_history.employer_name` (see §4). Dry-run by default, `--commit` to write, same
  pattern already established for `scripts/importQuestionBank.mjs`.
- No alias table changes are ever destructive — merging two `companies` rows that turn out to be
  the same real company (e.g. "Acme Inc" vs "ACME INC.") is done by re-pointing
  `company_name_aliases.company_id` to the surviving row and marking the loser row inactive (a
  `companies.merged_into_id uuid NULL` column, added to the canonical table definition above),
  never by deleting a `companies` row that anything else might already reference.

## 4. Employment reconciliation

**Matching signals, in descending confidence order:**
1. `epfo_establishment_id` exact match against `companies.epfo_establishment_ids[]` — highest
   confidence (≈0.95+), since EPFO establishment codes are a government-verified identifier.
2. `normalized_name` exact match (case/punctuation/whitespace-normalized string equality) — high
   confidence (≈0.8), common for well-known employer names.
3. `normalized_name` fuzzy match (trigram similarity or similar, threshold TBD during
   implementation, likely ≥0.6 similarity score) — medium confidence (≈0.5-0.7), needs human
   confirmation before being treated as authoritative.
4. Recruiter/company email domain match (if a user's verified email domain matches a `companies.
   domain`) — supplementary signal, not sufring done alone.

**Confidence rules — auto-link vs. manual review:**
- Confidence ≥ 0.9 (EPFO match, or exact-name match against an `is_verified_partner=true` company):
  the `company_employment_links` row is created with `link_state='system_suggested'`, AND
  `profiles.company_id` is optimistically populated — but `profiles.company_link_state` is NOT
  advanced past `unemployed` until the user actually confirms (per the blueprint-alignment section
  above, `company_link_state` only ever holds the five blueprint relationship-type values, never a
  workflow-progress value, and a not-yet-confirmed suggestion isn't a real relationship yet). The UI
  must always show this as a suggestion the user can reject (see §5), never silently presented as
  fact. Once confirmed, `company_link_state` transitions to `linked_independently` (or
  `employer_not_partner` if the linked company's `is_verified_partner=false`, which is the common
  case at launch per the reserved-states note above).
- Confidence 0.5-0.9 (fuzzy match, unverified company): `link_state='system_suggested'` is created,
  but `profiles.company_id`/`company_link_state` are NOT updated until the user explicitly
  confirms — the suggestion sits in a pending-review UI surface only.
- Confidence < 0.5, or no match at all: no `company_employment_links` row is created; a NEW
  `companies` row is created instead (`source='user_created'`, `verified=false`) once the user
  explicitly confirms this is their real employer with no existing match (this is the path that
  grows the canonical company list organically from real user data).
- **User-controlled, always**: the user can reject any suggested link at any time
  (`link_state='user_rejected'`), can manually search for and pick the correct company themselves
  regardless of what the system suggested, and can request "no company" (clear `profiles.
  company_id`) at any time. The system never overwrites a `user_confirmed` or `user_rejected` state
  with a new automated suggestion — once a human has spoken, automation defers to them permanently
  for that specific `source_row_id`.
- **System-inferred, always**: the initial candidate match generation itself (matching + confidence
  scoring) is fully automated and re-runnable (e.g., if `companies.epfo_establishment_ids` grows
  over time, previously-unmatched rows can be re-scored) — but re-scoring only ever creates NEW
  suggestions for rows still in `system_suggested` state; it never touches a row a user already
  acted on.

## 5. API/UI contract for WS5 (in scope now vs. later)

**In scope now:**
- **Company Overview** (read-only page): canonical name, logo, sector, size band, verified badge
  if applicable. No reviews, no ratings, no aggregate scores anywhere on this page (WS6's job).
- **Link-state handling**: a "Is this your employer?" prompt surfaced wherever a
  `system_suggested` link exists and hasn't been acted on (e.g. on the user's Career/Profile page),
  with Confirm / Not my employer / Search for the correct company actions. A simple company
  search-and-select UI for the "search for the correct company" and "user_created" paths, backed by
  `normalized_name` prefix/fuzzy search against `companies`.
- **Company-specific insights entry point**: a placeholder/stub entry point only (e.g. a "Company
  Insights" tab or card on the Company Overview page) that is visibly present but explicitly says
  "coming soon" or is hidden entirely behind its own not-yet-created feature flag — this workstream
  builds the entry point's plumbing (the tab/route exists) but not the actual insights content,
  which depends on WS6's review data existing.
- **Privacy settings entry point**: a settings toggle for "let others see I work at [Company]" /
  "keep my employer private" (`profiles`-level visibility preference, a new nullable boolean column
  `profiles.company_visibility_public boolean NULL DEFAULT false` — additive). This workstream
  builds the toggle and enforces it in the owner-vs-employer-vs-public read paths (§6); it does not
  build any employer-side dashboard consuming this data yet (that's a natural WS5-adjacent
  follow-on, not required to ship WS5 core).

**Explicitly later (not in WS5 scope):**
- Aggregate company insights/scores content itself (WS6).
- Employer-side company dashboard (viewing your own employees' aggregated, privacy-respecting data).
- Canonical-company-based job search.
- Company claim/verification workflow for company-staff accounts beyond the basic
  `company_memberships` table existing (a full "prove you work here" verification flow, e.g. via
  work email domain confirmation, is a reasonable fast-follow but not required to ship core).

## 6. Authorization / consent / RLS

- **`companies`**: public `SELECT` (it's a directory — company names/logos are not sensitive); only
  `service_role`/admin `INSERT`/`UPDATE` for `system_seeded`/`admin_created` rows; a user can
  `INSERT` a `source='user_created'` row only via a controlled RPC (not raw table insert) that
  enforces the "no match found above threshold" precondition server-side, preventing spam/duplicate
  creation from the client.
- **`company_name_aliases`**: **required revision 3 — no public read policy, no client access of
  any kind.** RLS enabled with zero policies for `anon`/`authenticated` (default-deny); only
  `service_role` reads/writes it directly. Client-side company search-as-you-type is served by a
  controlled server-side search endpoint (`GET /api/company/search?q=...` in the API contract) that
  queries this table server-side and returns only the minimal `{company_id, name, logo_url}` shape
  needed for a picker UI — never exposing raw alias rows, confidence scores, or alias provenance to
  the client. This closes the v1 gap where the alias table itself was proposed as publicly
  readable.
- **`company_memberships`**: a user can `SELECT` their own membership rows; a company `admin`/`owner`
  member can `SELECT` all memberships for their own `company_id` (their staff roster) but not other
  companies'; only existing `admin`/`owner` members (or platform admin) can change `status`/`role`
  on a membership row — enforced via a policy checking the requester has an `active` `admin`/`owner`
  row for the same `company_id`, not client-trusted role claims.
- **`company_employment_links`**: **owner-visible only by default** — a user can `SELECT`/`UPDATE`
  (confirm/reject) only their own rows (`user_id = auth.uid()`). **Employer-visible path**: a
  company's `active` membership holders can see the *aggregate count* of confirmed links to their
  company (e.g. "142 confirmed alumni/employees on Capabilio") but explicitly canNOT see individual
  linked users' identities through this table unless that specific user has
  `profiles.company_visibility_public = true` — enforced as a second, narrower policy that joins
  through `profiles.company_visibility_public`, not a blanket employer-sees-everything grant. Platform
  admin sees everything (existing `profiles.is_admin` model, no new roles table, consistent with the
  hard constraint already established for mentor marketplace).
- **`profiles.company_id`/`company_link_state`/`company_visibility_public`**: owner can update their
  own; no other user can read another user's `company_id` unless `company_visibility_public=true`
  for that row (enforced via a view or column-level policy, not by trusting the client to only
  request public fields).
- **Consent checks**: no company ever sees a named individual's link without that individual's own
  `company_visibility_public` opt-in — there is no "employer requests access" override in this
  workstream. This is deliberately conservative; loosening it later (e.g. an explicit
  employee-grants-employer-access flow) is a future decision, not assumed here.
- **Migration approach**: strictly additive — four new tables, two new nullable `profiles` columns,
  one new nullable `profiles` column for visibility. No existing table is altered, no existing
  column is dropped or renamed, no existing RLS policy is touched.

## 7. Rollout plan

- **Feature flag**: `company_module_v1` (new), default `false` in both `frontend/src/config/
  featureFlags.js` and a backend equivalent (same pattern as `career_os_skill_pulse_v2` and
  `mentor_marketplace_v1`). Every new route and UI surface checks it.
- **Staging validation**: same standing constraint as every prior workstream on this project — this
  Supabase project has no branching available on its current plan, so "staging" means the same
  repeat-safe-migration-and-advisors-check substitute used for WS2/WS3/WS4, documented explicitly as
  a gap, not silently worked around.
- **Data backfill plan**: run the normalization backfill script (§3) in dry-run first against real
  `jobs.company`/`offers.company`/`employment_history.employer_name` data, review the output (how
  many distinct companies get created, how many aliases map together, spot-check a sample for
  false-positive fuzzy merges) before ever running `--commit`. Backfill is idempotent and re-runnable
  (safe to run again after new jobs/offers are created, since `company_name_aliases` uniqueness
  prevents duplicate rows for the same string).
- **Rollback-by-flag**: flipping `company_module_v1` off hides all new UI/routes immediately; the
  new tables/columns can remain in place unused (nothing else in the codebase reads
  `profiles.company_id` etc., so their mere existence doesn't affect any other feature). A
  reverse-dependency-order `DROP` script (companies last, after `company_memberships`,
  `company_employment_links`, `company_name_aliases`) will be written and validated via
  `BEGIN;...;ROLLBACK;` before implementation ships, same discipline as the mentor-marketplace
  teardown script.
- **No breaking change to existing jobs/offers flows**: explicitly re-stated as the top rollout
  acceptance criterion — the normalization side-effect must be provably non-blocking (wrapped so
  any failure there never fails the parent job/offer write) before this can be considered done.

## 8. Explicit exclusions (deferred, not built here)

- **Company Reviews, anonymity/cohort logic, moderation, aggregate rating publication** — all of
  WS6, entirely.
- **Mentor Marketplace** — unrelated, already implemented, stays behind its own flag
  (`mentor_marketplace_v1`), no work planned here per the current scope-reset instruction.
- **Professional ELO** — explicitly deferred post-production per standing instruction, not touched.
- **Assessment redesign** — explicitly deferred post-production per standing instruction, not touched.

**Awaiting review/approval of this design before any migration is written.**
