# Capabilio Executive — Technical Architecture Blueprint

Converts the five finalized design specs (`STARTUP_WORKSPACE_DESIGN_SPEC.md`, `FUNDING_HUB_DESIGN_SPEC.md`, `EXECUTIVE_INTELLIGENCE_LAYER_DESIGN_SPEC.md`, `ECOSYSTEM_LAYER_DESIGN_SPEC.md`, `IDENTITY_INTELLIGENCE_LAYER_DESIGN_SPEC.md`) into an engineering blueprint. No product scope is redefined here.

**Read this before the sections below.** The brief asks this document to plan for "millions of users" with microservices, GraphQL, Kafka-style event streaming, and multi-region infrastructure. Capabilio's actual deployed system today is a single Express + Vite monorepo (`package.json` — one app, one deploy target, `capabilio-web.onrender.com`), Supabase Postgres/Auth/Storage/Realtime as the entire data+auth+realtime layer, no message queue product (a hand-rolled in-process `queue.js`/`grading-worker.js`), no Redis, no Kafka, no GraphQL, no mobile app, no admin app, and Pinecone already integrated for vector search. Recommending a microservices/Kafka/multi-region architecture for a pre-scale platform would be over-engineering against the user's own standing instruction to prefer scalable-but-not-over-engineered patterns. Every section below is written for what Capabilio actually is, with an explicit upgrade trigger noted for when the heavier pattern becomes justified — not designed as if that scale already exists.

## 1. System Architecture

**Today, right-sized:**

- **Client**: one React 18 + Vite SPA (`frontend/`), React Router for navigation, no separate mobile/admin client. Admin functions are gated views inside the same SPA (`profiles.is_admin`), not a separate app — right, given current team size and one shared codebase to maintain.
- **API layer**: one Express app (`backend/server.js` + `backend/server/routes/*.js`), REST, JWT-based (Supabase Auth tokens verified server-side, see `lib/auth.js`).
- **AI services**: a provider-abstraction layer already exists (`lib/claude.js`, `lib/groq.js`, `lib/gemini.js`, `lib/openai.js`, `lib/deepgram.js` for voice) fronted by a proxy pattern (`routes/groqProxy.js`) so API keys never reach the client — this is the correct pattern and should be the template for every new AI feature across the five specs, not a new architecture.
- **Search**: Postgres full-text (`tsvector`) for structured entity search (profiles, jobs, problems) is sufficient at current data volumes; Pinecone (already a dependency: `@modelcontextprotocol/sdk` ecosystem + existing `lib/pinecone.js`) is the right home for semantic/vector search (Universal Search's AI summaries, Venture Intelligence comparisons) — reuse it, don't stand up a second vector store.
- **Recommendation/Matching/Analytics/Workflow "engines"**: at this stage these are backend modules/functions inside the existing Express app (a `lib/matching/`, `lib/recommendations/`, `lib/workflows/` folder structure), not separate services. Splitting them into standalone microservices before there's real load to justify the operational overhead (separate deploys, service discovery, network calls replacing function calls) would slow delivery without a corresponding benefit.
- **Storage**: Supabase Postgres (relational data), Supabase Storage (documents, media — already used, e.g. `org-media` bucket), no separate object storage/CDN layer needed beyond what Supabase Storage + its CDN already provides.
- **Queue**: the existing `lib/queue.js` + `lib/grading-worker.js` pattern (in-process, polling-based) is adequate for current job volumes (Arena grading). New async work from these specs (AI review generation, venture report generation, notification digests, content-calendar publishing) should extend this same queue rather than introducing a new job system — the upgrade trigger to a real broker (e.g. a managed Redis/queue service) is sustained job backlog or multi-instance workers needing coordination, neither of which exists today.
- **Monitoring/Logging**: PostHog (already a dependency) covers product analytics; structured server logging should be added to the existing Express app (a logging middleware) before reaching for a dedicated observability stack.
- **External integrations**: Razorpay (payments, already integrated), Resend (email, already integrated per the recent invite-email fix), and the calendar/social-publishing integrations flagged as gaps in the Ecosystem and Identity specs.

**Upgrade triggers** (when to revisit this section): sustained CPU/memory pressure on the single Express instance under real concurrent load → horizontal scaling (§9); a single AI feature dominating compute cost or needing independent scaling/on-call ownership → carve that one feature into its own service, not all of them at once; queue backlog growing faster than workers can drain → move to a managed queue.

## 2. Database Architecture

All net-new tables required across the five specs are already enumerated per-spec (see each spec's §0.2 "data reality check"). This section defines the cross-cutting conventions every one of those tables must follow, rather than re-listing them.

**Conventions for every new table:**
- `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()` (trigger-maintained).
- Soft deletes via `deleted_at timestamptz null` on any table a user can delete meaningful history from (documents, posts, ideas) — hard deletes only for genuinely ephemeral rows (notifications, session tokens).
- Every FK to `profiles(id)` uses `on delete cascade` only where the child row is meaningless without the parent (e.g. `community_members`); uses `on delete set null` or a restrict pattern where the row should survive (e.g. a document uploaded by a founder who later leaves a startup).
- RLS enabled on every table without exception (matches the existing project-wide convention — every table in the current schema already has `rls_enabled: true`). Policy pattern to reuse: `org_id = auth.uid()` style ownership checks already used by `org_events`, generalized to `owner_id = auth.uid()` or a `startup_team_members`/`community_members` membership subquery for shared-access tables.
- Versioning: for documents specifically (Deal Room, Documents Center), a `document_versions` child table (document_id, version_number, storage_path, uploaded_by, created_at) rather than overwriting files in place — required given Deal Room's legal/financial sensitivity.
- Indexes: every FK column gets a btree index by default; add a GIN index on any `jsonb`/array column used in filtering (e.g. `tags[]`, `role_tags[]`, `content jsonb`) and a `tsvector` generated column + GIN index on any table entering Universal Search.

**Entity relationship shape** (how the five specs' tables connect): `profiles` is the root identity node for every person-shaped entity (founder, mentor, investor-if-modeled-as-a-user, reviewer). `startups` is the root node for everything in Startup Workspace and most of Funding Hub (`funding_rounds`, `pitch_rooms`, `investor_pipeline` all FK to `startup_id`). `communities`, `events` (extended `org_events`), and `partners` are peer root nodes in the Ecosystem layer, each with their own membership/participation join tables. This keeps the graph shallow (profiles → startups → everything-else) rather than a tangle of cross-references, which matters for RLS policy simplicity as much as for query performance.

## 3. API Design

REST, matching the existing codebase (no GraphQL layer exists or is warranted at current scope — GraphQL earns its complexity when clients need to compose many nested resources in one round trip across many teams/consumers; here there's one client and route-level REST already works). Conventions:

- Versioning: prefix new route groups `/api/v2/...` only when a breaking change to an existing v1 shape is unavoidable; additive fields never need a version bump (matches how `org_events.category` was added without breaking `useOrgPosts`).
- Auth: Supabase JWT in `Authorization: Bearer`, verified server-side per the existing `lib/auth.js` pattern — never trust a client-supplied user id.
- Authorization: route-level middleware checking role/permission (see §5) before any handler runs; RLS as the second, non-bypassable layer underneath — defense in depth, not either/or.
- Pagination: cursor-based (`?after=<id>&limit=20`) for feed-like endpoints (Executive Feed, Notifications, Inbox) where new rows arrive continuously and offset pagination would skip/duplicate; offset pagination (`?page=&limit=`) is fine for stable lists (Marketplace providers, Partner directory).
- Filtering/Sorting: query-param based, allowlisted per endpoint (never pass raw filter objects through to the query builder) to avoid the exact class of bug already fixed once in this codebase (anon-executable RPC backdoors, per the 2026-07-16 certification audit).
- Rate limiting: per-user token bucket on write endpoints and all AI-proxy endpoints specifically (cost control, not just abuse prevention) — extend the existing groqProxy pattern with a rate-limit middleware rather than building a new gateway.
- Error handling: consistent `{ error: { code, message } }` shape across all routes; never leak raw Postgres/Supabase error text to the client (matches existing security posture).

## 4. AI Architecture

Every AI feature across the five specs (Idea Review AI, Venture Intelligence AI, Funding Assistant, Content Assistant, Recommendation Engine, Opportunity Radar, Investor/Mentor Matching, Search AI, Analytics AI, Notification Intelligence) should be built as a **prompt pipeline module** behind the existing provider-abstraction layer, not as separate bespoke integrations:

- **Inputs**: always structured, never a raw dump of unrelated user data — each pipeline declares exactly which real tables it reads (e.g. Idea Review AI reads only `startup_ideas` + the founder's `profiles` domain fields, not the founder's entire activity history).
- **Outputs**: structured JSON matching a defined schema per pipeline (not freeform text parsed with regex) — validate the model's output against that schema server-side before it ever reaches a table or the client, given the standing principle that AI output is probabilistic and must be sanitized before use in the system.
- **Model selection**: Groq (fast/cheap, already proxied) for high-frequency, low-stakes generation (content drafts, suggested replies, hashtag suggestions); Claude (already integrated via `@anthropic-ai/sdk`) for higher-stakes reasoning (Venture Intelligence Report synthesis, Due Diligence gap analysis) where quality matters more than latency/cost; this tiering already exists implicitly in the codebase's multi-provider setup and should be made an explicit, documented routing rule rather than ad hoc per feature.
- **Memory strategy**: per-conversation context only (existing `copilot_conversations`/`copilot_sessions` tables) for the Copilot; every other pipeline is stateless per-invocation with explicit inputs — no hidden cross-request memory, which keeps outputs auditable.
- **Safety**: every AI-generated field that reaches a user-facing surface carries the "AI-generated — verify independently" convention already established in the Venture Intelligence Report and Funding Assistant specs; no AI output is ever auto-published (posts, replies, updates) without an explicit human confirm step.
- **Fallbacks**: if the primary provider errors/times out, fall back to the secondary provider already configured in the multi-provider setup before failing the request outright; if all providers fail, the feature degrades to its honest empty state (per every spec's "never fabricate" principle) rather than retrying indefinitely.
- **Cost optimization**: cache deterministic-enough outputs (e.g. a Venture Intelligence Report doesn't need regenerating on every view, only on new review data), and rate-limit/tier AI feature access by subscription plan (`config/plans.js` already exists as the right place to encode this).

## 5. Permission Model

RBAC as the base layer (roles: Founder, Co-founder, Employee, Investor, Mentor, Advisor, Reviewer, Accelerator, Incubator, Government, University, Recruiter, Administrator, Super Admin), ABAC as the refinement layer for resource-scoped access (e.g. a Co-founder has Founder-equivalent permissions but only within their own `startup_id`; an Investor only sees Deal Room documents they've been explicitly granted access to via `deal_room_permissions`, independent of their role).

| Module | Founder/Co-founder | Employee | Investor | Mentor/Advisor | Reviewer | Recruiter | Admin |
|---|---|---|---|---|---|---|---|
| Startup Workspace | Full | Scoped by `startup_team_members.permission_level` | None | View if granted | None | None | Support access, audited |
| Funding Hub (own round) | Full | View-only unless granted | View own pipeline stage + granted Deal Room docs | None | None | None | Support access, audited |
| Idea Lab / Review Cycle | Full (own ideas) | None | Review-only if invited as reviewer type | Review-only if invited | Score/comment only, no edit rights on the idea | None | Full, audited |
| Communities/Events | Full within joined communities | Same as founder | Same | Same | Same | Same | Moderation override |
| Hiring | Full | Post/review if granted | None | None | None | Full within own postings | Full |
| Documents/Deal Room | Full | Scoped by permission_level | Read-only, per-document grant | Read-only, per-grant | None | None | Full, audited |
| Executive Profile/Brand Studio | Full, own profile only | N/A | N/A | N/A | N/A | N/A | Moderation override |

Super Admin is distinct from Administrator: Administrator operates within the standard permission model with elevated read/support access (audited); Super Admin is the small internal set (`profiles.is_admin`, already real) with schema/config-level access, not a role granted through the product's own permission tables.

## 6. Workflow Engine

Given the current stage (§1), "workflow engine" means explicit state-machine columns + status-transition functions inside the existing Express app, not a standalone orchestration product (e.g. Temporal) — that becomes justified once workflows need cross-service coordination or long-running (multi-day) durability guarantees beyond what a status column + scheduled job can provide, which the Review Cycle workflow below is the closest candidate for revisiting first.

**Idea → Funding lifecycle** (the brief's example): `startup_ideas.status` (draft → submitted) → AI Initial Review pipeline runs synchronously on submit → founder starts a `review_cycles` row (status: open) → `review_assignments` created + notifications sent → as `idea_reviews` rows arrive, cycle progress updates → on `closes_at`, a scheduled job (extending the existing queue) generates the `venture_intelligence_reports` row → founder can then initiate `investor_matches` (once Funding Hub's investor data exists) → accepted matches create `investor_pipeline` rows → pipeline stage reaching "Committed"/"Closed" creates/updates `funding_rounds` and eventually `cap_table_entries` → Portfolio module activates.

**Hiring**: `jobs` (extended with `startup_id`) status flow reuses the existing recruiter hiring pipeline already built for the Institution/Company path — do not build a second hiring state machine, extend the existing one with startup scoping.

**Events**: RSVP (pending→confirmed→attended→no-show) drives `event_attendance`, which feeds the Journey Trail and Executive Analytics — a simple status column, no separate engine needed.

**Communities/Marketplace/Documents/Notifications**: each is a straightforward CRUD + status-column lifecycle (post: draft/published/archived; booking: requested/confirmed/completed/cancelled; document: current/superseded via `document_versions`; notification: unread/read/archived) — none of these need a dedicated workflow engine, just consistent status enums and the transition-validation discipline already required by the standing "idempotency for scoring/submissions" principle (a status transition should be validated server-side, never trusted from client input).

## 7. Search & Recommendations

- **Global/Universal Search**: Postgres `tsvector` + GIN index across `profiles`, `pulse_posts`, `jobs`, `problems`, and each new spec's primary entity tables (`startups`, `startup_ideas`, `investors`, `communities`, `events`, `partners`, `marketplace_providers`, `knowledge_resources`) — one federated query fanning out to each table's tsvector index, results merged and ranked by relevance + recency. This is sufficient at current and near-term scale; the upgrade trigger to a dedicated search product (e.g. Meilisearch/Typesense) is query latency degrading as row counts grow into the millions, not a default starting choice.
- **Semantic/Vector search**: Pinecone (already integrated) for anything needing "similar meaning, not exact keyword" — Venture Intelligence's "Comparison with Similar Startups," Knowledge Center's related-resource suggestions, and Investor Discovery's thesis-matching all embed their target text (via the existing AI provider layer) into the same Pinecone index, namespaced per entity type.
- **Recommendation Engine / Opportunity Radar / Investor-Mentor-Grant-Partnership Discovery**: all of these are the same underlying pattern — a scored-candidate-list generator combining (a) rule-based filters (industry/stage/region match, hard constraints) with (b) an AI-scored relevance pass (soft signal, the compatibility/confidence scores shown across every spec) — implemented as one shared `lib/matching/` module parameterized by entity-pair type, not fourteen separate matching implementations (this directly mirrors the Intelligence Layer spec's recommendation to generalize `investor_matches` into one `intelligence_matches` table — the backend implementation should generalize the same way).

## 8. Security

- **Authentication**: Supabase Auth (already in place) — email/password + OAuth (Google, per existing patterns); SSO (SAML/OIDC for university/government/enterprise partners) is a real future need given the Ecosystem spec's audience but should be scoped as its own project once a specific institutional partner requires it, not built speculatively.
- **2FA**: delegated to the identity provider today (documented in `SettingsPanel.jsx` already) — building first-party TOTP 2FA is a reasonable near-term addition given the sensitivity of Deal Room/Funding data, and should be prioritized ahead of SSO.
- **Encryption**: TLS in transit (already true via Render/Supabase defaults); at-rest encryption is handled by Supabase's managed Postgres — no additional application-layer encryption needed except for a specific case: Deal Room documents (NDA, cap table, financials) may warrant field/file-level encryption before storage given their sensitivity, worth a dedicated security review before that module is built (already flagged in the Funding Hub spec).
- **Secrets management**: environment variables via Render's dashboard (current pattern, already fixed once for the Resend API key) — sufficient at current team size; a dedicated secrets manager (e.g. Doppler/Vault) becomes worth the operational overhead once secret count/rotation frequency grows meaningfully.
- **Audit logs**: `org_audit_log` already exists for institution actions — generalize its pattern (not necessarily the same table) to cover Deal Room access, cap table changes, and permission grants across the Executive path, since those are exactly the actions a founder or investor would need to audit later.
- **Data privacy/compliance**: profile visibility controls (`profile_visibility`, already real) plus explicit per-document Deal Room permissions are the core privacy mechanism; formal compliance posture (SOC 2, GDPR-equivalent data subject requests) is a business decision to make explicitly once the platform handles real investor/financial data at scale, not an engineering afterthought bolted on later — flag to product/leadership now given Funding Hub's data sensitivity, don't silently defer it.
- **Rate limiting & security monitoring**: extend the API-layer rate limiting from §3 to auth endpoints specifically (brute-force protection); reuse PostHog/server logs for anomaly signals before reaching for a dedicated security monitoring product.

## 9. Scalability

Right-sized for current stage, with explicit upgrade triggers rather than pre-built for hypothetical scale:

| Concern | Today's answer | Upgrade trigger |
|---|---|---|
| Horizontal scaling | Single Render service instance | Sustained CPU/memory saturation under real concurrent load → Render's built-in horizontal scaling (multiple instances behind its load balancer) before anything more exotic |
| Caching | None beyond Supabase/Postgres query performance + PostHog client-side | Repeated expensive queries (e.g. recomputed Analytics aggregates) hitting real user-perceptible latency → add a Redis cache layer for those specific hot paths, not a blanket caching layer |
| CDN | Supabase Storage's built-in CDN for documents/media; Render/Vite's static asset serving for the SPA bundle | Only revisit if global latency to Supabase's region becomes a measured problem for a specific user geography |
| Background jobs/queues | Existing `queue.js`/`grading-worker.js` pattern, extended for new async AI/report generation work | Job backlog growing faster than a single worker process can drain → move to a managed queue (e.g. Supabase's pg-based queue extension, or a managed Redis queue) |
| Microservices | Not warranted — one team, one deploy, low operational maturity cost today | A specific feature (e.g. AI Venture Report generation) needing independent scaling, its own on-call rotation, or a different release cadence than the rest of the app |
| Database scaling | Single Supabase Postgres instance | Read-heavy contention on specific tables (Executive Feed, Notifications at high volume) → Supabase read replicas, targeted at those specific read paths, not the whole database |
| Event streaming | Not needed — current async needs are met by the queue pattern above | Multiple independent services needing to react to the same event (e.g. three different modules all needing to know "a milestone was reached") → that's the actual signal for introducing a lightweight event bus, and even then, Supabase Realtime (already available, unused for this purpose) may be sufficient before reaching for Kafka |

## 10. DevOps

- **CI/CD**: none exists today (no `.github/` workflows found) — this is a genuine, immediate gap worth closing before this much new surface area ships: a GitHub Actions pipeline running the existing `npm run test:arena-v2` plus a new lint/build check on every PR, deploying to Render on merge to main, is the right first step — not a multi-stage enterprise pipeline on day one.
- **Environments**: Development (local, `npm run dev:all`), Staging (a second Render service + a Supabase branch, using the already-available `create_branch`/`merge_branch` Supabase MCP tooling rather than a second manually-managed project), Production (current live service).
- **Infrastructure as code**: not currently in place; worth introducing once staging exists, so environment parity is enforced rather than manually recreated.
- **Monitoring/Logging**: PostHog for product analytics (real, in place); add structured request logging + error tracking (e.g. Sentry) to the Express app before this much new feature surface ships, since debugging five new modules' worth of issues via `console.log` and Render's raw log tail (the current pattern, per the email-config debugging session) won't scale even at current team size.
- **Backups/Disaster recovery**: Supabase's managed backup/point-in-time-recovery is the current safety net — verify it's actually enabled at the appropriate tier for this project (a five-minute check, not a project) before Deal Room/financial data goes live, given what's at stake if that data is ever lost.

## 11. Frontend Architecture

- **Folder structure**: extend the existing `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/config/`, `frontend/src/api/` convention — each new module gets its own page file(s) under `pages/`, shared cross-module components (Journey Trail, match-score card, empty-state block) go in `components/`, matching how `CopilotWidget.jsx` already lives at that shared level.
- **Component hierarchy**: page-level components own data-fetching (matching the existing `useOrgPosts`-style hook pattern seen in `InstitutionOS.jsx`), presentational sub-components stay props-only — continue this pattern rather than introducing a new architecture (e.g. a heavier component-library abstraction) for the new modules.
- **Routing**: React Router, extending the existing `currentPage`/`setCurrentPage` navigation pattern already used in `App.jsx` — introducing real URL-based routes (`/executive/startup-workspace/idea-lab`) for the new modules is worth doing now rather than perpetuating the single-page state-driven navigation pattern, since these modules are numerous enough and deep-linkable enough (Journey Trail entries, shared Pitch Room links) to need real URLs.
- **State management**: local component state + the existing `userDoc`/Supabase-hook pattern is sufficient — do not introduce Redux/Zustand for this; the existing pattern has scaled to the app's current size without one.
- **Data fetching**: continue the direct-Supabase-client-in-hooks pattern already established (`useOrgPosts`, `useExecFeed`) for straightforward reads; use the existing Express API routes for anything requiring server-side logic (AI calls, payment processing, cross-table transactions) — this split already exists in the codebase and should stay consistent.
- **Caching**: React Query is worth introducing now, specifically for the new modules — the current codebase re-fetches on every mount with manual loading states (as seen in `ExecutiveHome.jsx`'s hooks); that pattern is fine at current scale but will get repetitive across sixteen new modules, and React Query's cache/refetch conventions would reduce that duplication without requiring a rewrite of existing pages.
- **Forms/Validation**: no form library currently in use (manual state per field, as seen throughout `Onboarding.jsx`) — continue this for consistency rather than introducing a new dependency mid-project; add basic shared validation helpers (email, required-field, currency) to `lib/` if duplication becomes a real problem.
- **Accessibility/Internationalization**: accessibility conventions are defined once in `STARTUP_WORKSPACE_DESIGN_SPEC.md` §1 and should be enforced via a lightweight lint rule (`eslint-plugin-jsx-a11y`) rather than manual review alone; internationalization is not currently implemented anywhere in the app and is out of scope for this blueprint unless a specific market requirement (e.g. a non-English-speaking government partner) makes it real.
- **Theme management**: the app is light-mode-only today, consistent DM Sans/DM Mono + per-path accent-color tokens (already established per path in `Onboarding.jsx`'s `PATH_THEME`) — dark mode is a genuine gap for a "premium, Arc-Browser-like" product positioning and worth scoping as its own project rather than bolted on ad hoc per new module.

## 12. Design System

Already substantially defined across the five specs (colors, typography, spacing, card/empty-state/loading-state conventions in `STARTUP_WORKSPACE_DESIGN_SPEC.md` §1, chart conventions in `IDENTITY_INTELLIGENCE_LAYER_DESIGN_SPEC.md` §3). Engineering task here is to **codify what's already specified** into a real shared component library (`components/ExecutiveUI/`: `Card`, `Label`, `SectionHead`, `EmptyState`, `MatchScoreBar`, `StatusPill`) rather than each new page reimplementing these inline (the current pattern — every page today, including the just-shipped `ExecutiveHome.jsx`, defines its own local `Card`/`Label` components with near-identical styles). This is the single highest-leverage frontend engineering task before building any of the sixteen new modules: build the shared component set once, from the conventions already written down, then every module consumes it.

## 13. Engineering Standards

- **Naming conventions**: continue existing patterns — snake_case for database columns (with the known legacy camelCase columns on `profiles` as technical debt, not a model to replicate going forward), camelCase for JS/React, PascalCase for components.
- **Code style**: no linter/formatter config currently enforced project-wide — introduce ESLint + Prettier now, before sixteen new modules add enough surface area that style drift becomes costly to fix retroactively.
- **Testing strategy**: `npm run test:arena-v2` is the only existing test suite (Node's built-in test runner, `arena-v2` lib only). Extend this same lightweight pattern to the new modules' business logic (matching scores, workflow state transitions, permission checks) — full E2E coverage is aspirational at this stage; unit-test the parts where a bug would corrupt data or violate a permission boundary first (matching the standing principle to protect scoring/assessment integrity above all else).
- **Documentation standards**: this blueprint + the five design specs are the living reference; each new backend module should get a short header comment (matching the convention already used in `ExecutiveHome.jsx`'s file-level docstring) stating what it reads/writes and why, rather than a separate wiki that drifts out of sync.
- **Git strategy/branching/review/deployment**: given the current single-maintainer-plus-agent workflow and the recurring sandbox git-lock friction already encountered this session, the pragmatic near-term standard is: feature branches per module, PR review before merge to main once more than one person is contributing, direct-to-main commits acceptable solo but should still pass the CI check introduced in §10 before merge.

## 14. Implementation Roadmap

Sequenced from the five specs' own per-module phasing (each spec's final section), merged into one cross-cutting order, front-loading foundational engineering work (component library, CI, React Query, real routing) ahead of feature sprints so later sprints move faster rather than repeating setup costs each time.

- **Sprint 0 — Foundations**: shared `ExecutiveUI` component library (§12); ESLint/Prettier + first GitHub Actions CI pipeline (§10/§13); React Router URL-based routes for the Executive path (§11); React Query introduced for new-module data fetching.
- **Sprint 1**: Executive Profile rebuild (fixes the broken `AuthorityProfile.jsx`) + Notifications extension + Executive Settings extension — all low-schema-cost, high-urgency, per the Identity spec's own phasing.
- **Sprint 2**: Startup Workspace foundation — `startups` + `startup_ideas` + Idea Lab create/list flow + Startup Timeline.
- **Sprint 3**: Startup Workspace continued — Team, Documents/Hiring (additive columns on existing tables), Customers.
- **Sprint 4**: Executive Feed as a themed view over existing `pulse_posts` + Following (person-only) + Universal Search scoped to existing tables — the Intelligence Layer's cheapest, highest-leverage items.
- **Sprint 5**: Events (extends real `org_events`) + Knowledge Center (evaluate `studio_modules` reuse first).
- **Sprint 6**: Review Cycle + Review Metrics (`idea_reviews`, `review_cycles`, `review_assignments`) — meaningfully more complex, needs reviewer-facing surface + notification logic.
- **Sprint 7**: Venture Intelligence Report — depends on Sprint 6 producing real review data; the AI Architecture (§4) safety/schema-validation work should be built out here first, since this is the highest-stakes AI output shipped so far.
- **Sprint 8**: Investor Discovery + Investor Profile (seed `investors` manually) + Pitch Room + visit analytics — Funding Hub's lowest-risk entry point.
- **Sprint 9**: Investor CRM + Investor Interactions panel + Communities (`community_posts` as `pulse_posts` + `community_id`).
- **Sprint 10**: AI Matchmaking, generalized `intelligence_matches` table (reconciling Funding Hub's investor-specific matching with the Intelligence Layer's cross-entity version per both specs' own recommendation) + Opportunity Radar full screen.
- **Sprint 11**: Brand Studio (Compose + Executive Feed publishing only) + Executive Analytics Reach band + Influence Index formula definition (a written, reviewed decision, not an implementation detail).
- **Sprint 12**: Partner Hub + Marketplace (after resolving the shared `org_opportunities` reuse question across all three specs that referenced it).
- **Sprint 13 — highest scrutiny, sequenced last deliberately**: Deal Room + Cap Table + permissions model, with its own dedicated security review (§8) before any UI work starts; Inbox (`conversations`/`messages` + Realtime), the largest net-new build with no partial-reuse path.
- **Sprint 14**: Portfolio + Investor Updates (only meaningful once Sprint 13 has produced at least one real Closed round) + Journey Trail extended across every module shipped so far, making the full "join a community → meet an investor → raise → hire → grow" narrative real and traceable rather than aspirational.

**Critical path**: Sprint 0 blocks everything (component/routing/tooling debt compounds otherwise); Sprint 2 blocks Sprints 3, 6, 7 (everything downstream of an idea needs `startups`/`startup_ideas` to exist); Sprint 6 blocks Sprint 7 (no real reviews, no honest Venture Intelligence Report); Sprint 8 blocks Sprints 9–10 (no investors, no CRM or matching); Sprint 13's security review should start in parallel with Sprint 8–12, not after, given how long a proper review of financial/legal document permissions should reasonably take.
