# Career OS Implementation Plan

Source of truth: `Capabilio_Career_OS_Production_Blueprint.md` (repo root). This
document is the living execution plan against that blueprint — audit, exact
file/DB changes, flags, tests, rollback, and a running log of what's actually
shipped. Updated at the end of every workstream, not written once and left stale.

---

## 1. Current-State Audit

### 1.1 Stack (confirmed by direct inspection, not assumed)

- **Frontend:** Vite 5 + React 18, no client-side router (`react-router-dom` is
  a listed dependency but unused — navigation is 100% `currentPage`/`activeTab`
  state in `frontend/src/App.jsx`, passed down as props). Build: `vite build`,
  lint: `eslint frontend/src backend/server`.
- **Entry points:** `frontend/index.html` → `frontend/src/main.jsx` → `App.jsx`.
  `App.jsx` owns `currentPage`, `activeNavItem`, `activeTab`, `navPath`
  (student/professional/authority/institution) and renders one page component
  per `currentPage` value via a long `{currentPage === "x" && <X/>}` chain.
- **Backend:** Node/Express, single `backend/server.js` mounting ~35 routers
  from `backend/server/routes/*.js`. No formal migrations folder — schema
  changes exist as loose `.sql` files in the repo root (`supabase-*.sql`,
  `*_migration.sql`) applied manually/ad hoc. `supabase/functions/verify-uan`
  is the one Supabase Edge Function in the repo.
- **Database:** Supabase/PostgreSQL, project `eybchcqwbizjmzyrviri`. RLS is
  enabled on every one of the ~110 public tables (confirmed via
  `list_tables`) — good baseline, but policy *content* was not re-audited
  table-by-table in this pass; that remains a standing risk (see §1.4).
- **Auth:** Supabase Auth (JWT), `requireAuth`-style middleware on backend
  routes, bearer token attached client-side via `supabase.auth.getSession()`.
- **AI integrations:** Groq (`GROQ_BIG`/`GROQ_FAST`, resume parsing + Weekly
  Pulse question generation), Gemini (multimodal fallback, currently blocked
  by depleted account credits — billing issue, not code), Anthropic SDK
  present as a dependency (usage not audited this pass).
- **Payments:** Razorpay (`razorpay` npm package, `RAZORPAY_KEY_ID`/
  `RAZORPAY_KEY_SECRET`/`VITE_RAZORPAY_KEY_ID` env vars present) — wired for
  at least one existing flow (`backend/server/routes/payments.js`); mentor
  payouts are net-new work (Razorpay Route), not yet implemented.
- **Env vars (names confirmed via `.env`):** `ANTHROPIC_API_KEY`,
  `DEEPGRAM_API_KEY`, `ENRICHLAYER_API_KEY`, `FRONTEND_URL`, `GEMINI_API_KEY`,
  `GITHUB_TOKEN`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `PINECONE_API_KEY`,
  `PINECONE_HOST`, `PORT`, `PROXYCURL_API_KEY`, `RAPIDAPI_KEY`,
  `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_KEY`,
  `SUPABASE_URL`, `VITE_API_URL`, `VITE_POSTHOG_KEY`,
  `VITE_RAZORPAY_KEY_ID`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`,
  `YOUTUBE_API_KEY`. New Career OS flags use the `VITE_FF_*` prefix (§4).
- **Deployment:** Vercel (frontend, `vercel.json` + `.vercel/`), Render
  (backend, per prior-session Vercel deployment audits — not re-verified
  this pass).

### 1.2 Navigation architecture (as of start of this work)

- `App.jsx`'s `PROFESSIONAL_HEADER_NAV` was a 5-item array (Home / Launchpad
  / Pulse / Connect / Profile) — Career and Skills had been folded into
  Profile (`Aura.jsx`) tabs in an earlier session, then the user's new
  instruction explicitly reverses that: Career and Skills go back to being
  top-level modules, plus a new Company module.
- `PathNav.jsx` carries a parallel `professional` array for a bottom tab bar
  that **is not currently rendered** for the professional path (App.jsx
  suppresses it) but is kept in sync per existing repo convention.
- `Aura.jsx` (Profile, ~5800 lines) and `Orbit.jsx` (Career, ~1230 lines)
  both previously accepted `activeTab`/`setActiveTab` as props sourced from
  a **single global `useState` in `App.jsx`**, shared across every page that
  took those props. This was a confirmed, already-manifesting bug: a stale
  tab id set by one page (e.g. Profile leaving `activeTab="pro-skills"`)
  would arrive at another page (e.g. Career) that has no tab of that name,
  causing either leaked content (fixed for Aura in a prior session) or a
  blank body under a live tab bar (present, unfixed, in Orbit until this
  workstream — confirmed by code inspection: `tab==="pro-skills"` matches
  none of Orbit's four render conditions).
- `Skills.jsx` (top-level Skills page, already real — wraps the Weekly Pulse
  status banner and `SkillGraphView`) does not use the shared `activeTab`
  prop at all, so it was never affected by this bug; it also was not in the
  top-level nav prior to this workstream (reachable only by deep link).

### 1.3 Existing implementations to reuse (confirmed real, working)

| Blueprint concept | Existing implementation | Status |
|---|---|---|
| Weekly Skill Pulse | `weekly_pulses`/`weekly_questions`/`weekly_answers` tables (real, populated), `backend/server/routes/weeklyPulse.js`, `frontend/src/pages/WeeklyCareerCheck.jsx` | Real, 5 questions/week. Extend to 15 in Workstream 3, don't rebuild. |
| Skill Graph | `user_skills` table (real, 9 rows in current data), `backend/server/routes/skillGraph.js`, `frontend/src/components/SkillGraphView.jsx` | Real, fixed this session (field-name crash, auto gap-analysis, honest zero-skill state). |
| Career Timeline | `career_timeline` table (real but empty), `backend/server/routes/careerTimeline.js`, `frontend/src/components/CareerTimeline.jsx` | Real route exists; **not yet confirmed which UI actually renders from it** vs. `profiles.experiences` jsonb — see §1.4 open question. |
| Career health / signals | `computeSignals()` in `Orbit.jsx`, embedded in Home via `OrbitDash` | Real, but currently surfaces raw internal scores (ELO, Market Value, Layoff Shield, Career Velocity) — this is the Non-negotiable Rule #1 violation fixed for the Home hero row this workstream (§5). `OrbitDash`'s internal "4 ELO cards" were not touched this pass — flagged for Workstream 2 (Career Health). |
| Employment verification | EPFO/UAN flow, `backend/server/routes/verify.js`, `verification_audit_log` table | Real, untouched. |
| Resume ingestion | `backend/server/routes/resume.js`, Groq-based parsing, dual upload paths (Orbit + Aura) | Real, fixed this session (education mapping, cert shape, skill sync). |
| Proof/portfolio evidence | `proof_objects` table (real schema, rich fields incl. `is_portfolio_visible`/`is_recruiter_visible`/`trust_level`) | Real, more complete than the blueprint assumed — reuse directly for Career → Achievements/Projects rather than building a new `achievements` table from scratch. |
| Company reference data | `companies` table (real, 0 rows), `company_ratings` table (real, 0 rows, **no reviewer identity column at all** — not yet anonymity-safe), `company_connections` (real, institution↔recruiter linkage, unrelated to consumer reviews) | Partial. `company_ratings` is a useful starting schema but needs the full k-anonymity/aggregate-view architecture from the blueprint (§10) before it can be trusted for anonymous reviews — do not wire the UI directly to it as-is. |
| Compensation | `salary_updates` table (real: `professional_profile_id`, `amount_monthly`, `effective_from`, `verified`, `source`), `professional_profiles` table (real, separate from `profiles` — institution/placement upgrade record) | Real foundation for Career → Compensation; needs a `market_salary_bands` reference table for comparisons (net new). |
| Career events (rich) | `career_events` table (real: verification_status/level, elo_delta, visibility, tags, timeline_category) | Real and richer than `career_timeline` — **needs reconciliation**, see §1.4. |

### 1.4 Broken / stale / risk areas identified

1. **Two career-record tables with unclear ownership**: `career_timeline`
   (targeted by `careerTimeline.js`/`CareerTimeline.jsx`) and `career_events`
   (richer schema: verification level, ELO deltas, visibility, tags) both
   exist and both look like they're meant to be *the* canonical career
   record. Not resolved in this pass — flagged as a blocking question before
   Workstream 2 (Career module) touches either one. Do not add a third.
2. **`mentorHub.js` references tables that do not exist**: `mentor_bookings`,
   `mentor_payouts`, `mentor_profiles` are all absent from the live schema
   (confirmed via direct query — zero matches). This is a genuine dead route
   today; any request to it fails. Full rebuild required in Workstream 4, not
   a patch — confirmed, not just inherited assumption.
3. **`forge.js` references `forge_items`/`forge_submissions`** — also absent.
   Out of scope for Career OS but flagged as separate technical debt.
4. **`orbitPlans.js` references `career_reports`, `coupon_redemptions`,
   `coupons`, `skill_graph` (old name — superseded by `user_skills`),
   `user_subscriptions`** — all absent. Out of scope for Career OS; flagged
   separately. Do not let Career OS work silently depend on this router.
5. **No `consent`, `audit_log`, `achievements`, `compensation_history` (use
   `salary_updates` instead — see §1.3), `question_bank`, or company-review
   aggregate-view tables exist yet.** All net-new, additive migrations
   (§3).
6. **RLS is enabled on every table (confirmed), but per-policy correctness
   was not re-verified in this pass.** Before any new table goes live,
   `get_advisors(type: "security")` must be run and cleared — added to the
   test plan (§6) as a hard gate, not optional.
7. **The global `activeTab` leak (§1.2)** — fixed in Workstream 0 for
   `Aura.jsx` and `Orbit.jsx` (§5). `ProfessionalHome.jsx` also receives
   `activeTab`/`setActiveTab` props but never reads `activeTab` itself
   (only calls `setActiveTab` to request a deep link before navigating
   away) — no fix needed there beyond what Orbit/Aura already do on the
   receiving end.
8. **Raw internal scores on Professional Path screens** (Non-negotiable Rule
   #1 violation): `ProfessionalHome.jsx` hero row showed a raw ELO number
   badge and a "Market Value / Layoff Shield / Career Velocity" stat-cell
   row with no explanation. Fixed in Workstream 0 (§5). `Orbit.jsx`'s
   `OrbitDash`/`ReadinessTab` internals still show ELO-style cards — **not
   yet fixed**, explicitly deferred to Workstream 2 (Career Health) since
   that's the correct owning workstream per the implementation order.

---

## 2. File-Level Change Plan

### Workstream 1 (this pass)

| File | Change |
|---|---|
| `backend/server/lib/homePriority.js` (new) | Pure priority-ranking function, §5a. |
| `backend/server/lib/homePriority.test.js` (new) | 9 `node:test` cases. |
| `backend/server/routes/homeV1.js` (new) | `GET /api/pro/v1/home/priority`. |
| `backend/server.js` | Mounts `homeV1Routes` alongside existing `/api` routers. |
| `frontend/src/lib/api.js` | `homeApi.getPriority()`. |
| `frontend/src/pages/ProfessionalHome.jsx` | `TodaysPriorityCard` + `navigateToPriority`, flag-gated, error-boundary-wrapped. |
| `frontend/src/config/featureFlags.js` | `career_os_home` default → `true`. |

### Workstream 0

| File | Change |
|---|---|
| `frontend/src/config/featureFlags.js` (new) | 7 flags per blueprint §Workstream 0-C, env-overridable, safe defaults (nav on, everything unbuilt off). |
| `frontend/src/components/careeros/CareerOSUI.jsx` (new) | `OutcomeCard`, `EvidenceSourceBadge`, `SkillStatusBadge`, `OpportunityCard`, `MentorCard`, `ConsentModal`, `EmptyState`, `LoadingState`, `SectionErrorBoundary`. |
| `frontend/src/App.jsx` | `PROFESSIONAL_HEADER_NAV` now flag-aware: Career + Skills restored, Company defined but hidden behind `career_os_company` (off). Old 5-item array preserved as the instant-rollback path if `career_os_nav` is disabled. |
| `frontend/src/components/PathNav.jsx` | `professional` array updated to match (dead code today, kept in sync per repo convention). |
| `frontend/src/pages/Orbit.jsx` | Tab state made fully local (`ORBIT_TAB_IDS` set + one-shot deep-link consumption via `useRef`), fixing the blank-body bug. |
| `frontend/src/pages/Aura.jsx` | Same fix pattern applied on top of the prior session's partial fix — now truly local, not prop-aliased. |
| `frontend/src/pages/ProfessionalHome.jsx` | Raw ELO badge + Market Value/Layoff Shield/Career Velocity stat row replaced with `buildOutcomeSignals()` → 3 `OutcomeCard`s (Career momentum / Employment trust / Profile strength), all derived from real `userData` fields, no fabrication. Home sections (Weekly Check, OrbitDash embed, Action gaps) wrapped in `SectionErrorBoundary`. Dead `StatCell` helper removed. |
| `docs/career-os-implementation-plan.md` (this file) | Created per user's gate requirement. |

No backend files changed in Workstream 0 — it is frontend-only foundation work, matching the blueprint's own Workstream 0 scope (nav/tab-state/flags/shared UI/error containment).

---

## 3. Database Migration Plan (net-new tables, all additive)

None applied in Workstream 0 (no DB changes needed for nav/tab-state/flags).
Planned for later workstreams, in order:

| Workstream | New tables | Notes |
|---|---|---|
| 2 (Career) | `market_salary_bands`, `role_competencies` | Compensation and Promotions need reference data; `salary_updates`/`professional_profiles` already exist and are reused as-is. **Career-record reconciliation (career_timeline vs career_events) must be resolved before any new Career table is added** — see §1.4 item 1. |
| 3 (Skills v2) | `question_bank`, `question_report` | Additive; existing `weekly_questions`/`weekly_answers` keep working unchanged during rollout. |
| 4 (Mentor) | `mentor_profiles`, `mentor_availability`, `bookings`, `sessions`, `ratings`, `earnings`, `payouts`, `invoices` | Full rebuild, not a patch to `mentorHub.js`'s nonexistent-table references. |
| 5 (Company) | `company_memberships` (or extend `professional_profiles`/`career_events` — decide during that workstream once the career-record question is settled) | `companies` table already exists and is reused. |
| 6 (Company Reviews) | `company_reviews`, `company_review_identity` (restricted), `review_aggregates` (published-only, k≥5 view) | `company_ratings` schema is a useful reference but is missing a reviewer-identity separation entirely — new tables required, not an extension of `company_ratings`. |
| 8 (cross-cutting) | `consent`, `audit_log` | Needed before Workstream 4/5/6 go live (consent-gating and audit trail are hard requirements for all three). Build this in parallel with Workstream 3, ahead of Workstream 4, not as an afterthought. |

Every migration: additive only, RLS enabled + explicit policies before any
row is writable, indexed on `user_id`/foreign keys, `get_advisors` clean
before merge.

---

## 4. Feature Flag Plan

Implemented in `frontend/src/config/featureFlags.js`, env-overridable via
`VITE_FF_<NAME>`:

| Flag | Default | Turns on in |
|---|---|---|
| `career_os_nav` | **on** | Workstream 0 |
| `career_os_home` | **on** | Workstream 1 (this pass) — Today's Priority only; other Home sections land in later workstreams |
| `career_os_company` | off | Workstream 5 |
| `career_os_company_reviews` | off | Workstream 6 |
| `career_os_mentor_marketplace` | off | Workstream 4 |
| `career_os_career_replay` | off | Workstream 2 (sub-feature) |
| `career_os_skill_pulse_v2` | off | Workstream 3 |

Rollback for any flag: flip the env var, redeploy frontend only (no DB
rollback needed, matching the blueprint's rollback requirement). Backend
route-level flag checks will be added in the same workstream that adds each
backend surface (not needed yet — no new backend routes shipped this pass).

---

## 5. Workstream 0 — Completed

**Scope shipped:**
- Nav split: Career (`orbit`) and Skills (`skills`) restored to
  `PROFESSIONAL_HEADER_NAV`, gated behind `career_os_nav` (default on).
  Company entry defined, gated behind `career_os_company` (default off) —
  will not appear until Workstream 5 ships a real page behind it.
- Local tab state: `Orbit.jsx` and `Aura.jsx` no longer read a shared
  App.jsx-owned `activeTab` continuously — each owns local state, consuming
  an incoming `activeTab` prop only once as a one-shot deep-link request
  (via a `useRef`-tracked "last consumed" guard), then ignoring it. Fixes a
  confirmed blank-body bug in Orbit and hardens the prior partial fix in Aura.
- Feature flags: `frontend/src/config/featureFlags.js`, 7 flags, env-overridable.
- Shared UI primitives: `frontend/src/components/careeros/CareerOSUI.jsx` —
  `OutcomeCard` (structurally requires outcome/drivers/basis, no bare-score
  prop exists), `EvidenceSourceBadge`, `SkillStatusBadge`, `OpportunityCard`,
  `MentorCard`, `ConsentModal`, `EmptyState`, `LoadingState`,
  `SectionErrorBoundary`.
- Real integration (not just built-and-unused): `ProfessionalHome.jsx`'s
  hero row and outcome-signal row now use `OutcomeCard` instead of raw
  ELO/Market Value/Layoff Shield/Career Velocity — the first concrete
  enforcement of Non-negotiable Rule #1. Home's three heaviest sections
  (Weekly Check, embedded `OrbitDash`, Action gaps) wrapped in
  `SectionErrorBoundary` so a render failure in one can't blank the page.

**Migrations applied:** none (frontend-only workstream).

**Endpoints created:** none (frontend-only workstream).

**Tests run:**
- `eslint` on every changed/new file — zero errors in new code
  (`CareerOSUI.jsx`, `featureFlags.js`); zero *new* errors in edited files
  (confirmed via `git diff` hunk boundaries against the full lint report —
  all flagged errors in `Aura.jsx`/`Orbit.jsx`/`ProfessionalHome.jsx` sit
  outside the lines this workstream touched and pre-date it).
- `vite build` — succeeds, 858 modules transformed, no new warnings
  attributable to this workstream (one pre-existing dynamic/static import
  duplication warning for `lib/api.js`, unrelated).
- Manual code-path trace (not a running E2E env in this session): confirmed
  Orbit's previous `tab = activeTab || localTab` would resolve to a
  Profile-origin tab id like `"pro-skills"` and match none of its four
  render branches — reproducing the blank-body bug from first principles,
  not just by inspection of the prior Aura fix.

**Known limitations:**
- No automated test suite exists for frontend components in this repo yet
  (no Jest/Vitest/RTL configured) — the "tests run" above are lint + build +
  manual trace, not unit tests. Standing up a frontend test runner is
  recommended before Workstream 1 ships user-facing logic denser than nav/flags.
- `OrbitDash`'s internal ELO-styled cards (inside `Orbit.jsx`) are **not**
  fixed yet — correctly deferred to Workstream 2 (Career Health), not
  silently left as a loose end.
- Company nav entry is defined but flag-gated off; no Company page exists
  yet (correct — Workstream 5 owns that).

**Rollback instructions:**
- Set `VITE_FF_CAREER_OS_NAV=false` and redeploy the frontend to instantly
  revert to the 5-item nav (Home/Launchpad/Pulse/Connect/Profile). No DB
  changes were made, so no DB rollback is possible or necessary.
- The local-tab-state fix has no flag (it's a correctness fix, not a
  feature) — reverting it would mean reintroducing a known bug, so it is
  not flagged for rollback; revert via `git revert` on the specific commit
  if it somehow regresses something.

---

## 5a. Workstream 1 — Completed (Home command center: Today's Priority)

**Scope shipped:**
- `backend/server/lib/homePriority.js` — pure, dependency-free
  `computeTodayPriority(ctx)` scoring function implementing the required
  tier order (privacy/security → time-sensitive opportunities → Weekly Skill
  Pulse due → verification/profile gaps → promotion/compensation → mentor →
  company review). Only tiers 3 (Skill Pulse) and 4 (verification/profile
  gaps) currently ever produce a candidate — tiers 1/2/5/6/7 have zero real
  per-user backing data in this codebase today (no security-nudge tracking,
  no opportunity-matching engine, no promotion/compensation module, no
  mentor tables, no company-review tables), so the function deliberately
  emits nothing for them rather than a fabricated candidate. An activation
  candidate (upload resume) always wins if the user has no resume/timeline
  at all, since nothing else can be computed without one. If literally no
  candidate applies, an honest "You're all caught up" state is returned —
  never a filler action invented to occupy the slot.
- `backend/server/lib/homePriority.test.js` — 9 `node:test` cases covering
  tier ordering, the activation gate, the honest empty/caught-up state, and
  a full-contract check (every response has title/why/outcome/minutes/cta/
  target) run against every scenario.
- `backend/server/routes/homeV1.js` — `GET /api/pro/v1/home/priority`
  (`requireAuth`-protected), read-only: fetches `profiles`
  (target_role/keyword/experiences/vault_files/epfo_verified/verified/
  summary), a `user_skills` count, and this week's `weekly_pulses` row, maps
  them into the pure function's `ctx`, returns `{ priority }`. Deliberately
  never triggers pulse generation as a side effect of a Home page load — if
  no pulse row exists yet for the week, that's treated as `weeklyPulseStatus:
  "none"` (no tier-3 candidate), not a background AI call.
- Mounted in `backend/server.js` as `/api` + `/pro/v1/home/priority`,
  alongside the existing unversioned `/pro/*` routes (no existing route
  touched).
- `frontend/src/lib/api.js` — `homeApi.getPriority()`.
- `frontend/src/pages/ProfessionalHome.jsx` — `TodaysPriorityCard` (loading/
  error/ready states, single card, shows title/why-it-matters/expected-
  outcome/estimated-minutes/CTA), wired via a new `navigateToPriority({page,
  tab})` helper that reuses the same one-shot deep-link mechanism
  `onDashNav` already used (Workstream 0's local-tab-state fix) generalized
  to any destination, not just Career. Rendered behind `FLAGS.career_os_home`
  and wrapped in `SectionErrorBoundary` (Workstream 0's error-containment
  primitive) so a failed priority fetch can't blank the rest of Home.
- `frontend/src/config/featureFlags.js` — `career_os_home` default flipped
  to `true` (Today's Priority is real and shipping); comment updated to
  note the remaining Home sections (Promotion Readiness, Salary Position,
  Company Status, Mentor Area) are separate, not-yet-built pieces that will
  get their own gating as they land in Workstreams 2/4/5.

**Migrations applied:** none — this workstream only reads existing tables
(`profiles`, `user_skills`, `weekly_pulses`); no schema change needed.

**Endpoints created:** `GET /api/pro/v1/home/priority` (new, versioned,
additive — no existing endpoint modified).

**Tests run:**
- `node --test backend/server/lib/homePriority.test.js` — 9/9 pass.
- `node --check` on `backend/server.js`, `homeV1.js`, `homePriority.js` —
  all parse cleanly.
- `eslint` on every changed/new file — zero new errors (confirmed the 5
  errors/8 warnings reported for `ProfessionalHome.jsx` all sit in
  pre-existing dead code — `OrbitScores`/`SkillHalfLife`, both unused
  helpers untouched by this workstream — and a pre-existing escape-character
  line, none in `TodaysPriorityCard`/`navigateToPriority`).
- `vite build` — succeeds, no new warnings.
- Manual trace: verified the priority tier ordering by hand against the
  `homePriority.test.js` fixtures (verification gap before target-role gap
  before skills gap before summary gap, all beneath Skill-Pulse-due, all
  beneath the activation gate) — matches the required order exactly.

**Known limitations:**
- Tiers 1 (privacy/security), 2 (opportunities), 5 (promotion/compensation),
  6 (mentor), 7 (company review) are correctly unimplemented pass-throughs
  today — they will start producing real candidates only once their owning
  workstream (2/4/5/6/7) ships real per-user data. Do not backfill these
  with placeholder logic ahead of that.
- No frontend component test runner exists in this repo (same limitation
  noted in Workstream 0) — `TodaysPriorityCard`'s loading/error/ready states
  were verified by code inspection against the same patterns as the
  existing `WeeklyCheckCard`, not by an automated component test.

**Rollback instructions:**
- Set `VITE_FF_CAREER_OS_HOME=false` and redeploy the frontend — Today's
  Priority disappears from Home instantly, everything else on Home is
  unaffected (it's independently flagged and error-boundary-wrapped).
- The backend endpoint can stay mounted even with the flag off (it's inert
  if nothing calls it) or be unmounted by removing the two lines in
  `backend/server.js` if a full rollback of the route itself is ever needed.
- No DB changes were made, so no DB rollback applies.

---

## 5b. Workstream 2 — Architecture Decision (approved, not yet implemented)

Recorded ahead of implementation so Workstream 1 (and anything else touching
career data in the meantime) builds against the right target.

**Decision:** `career_events` is the canonical, append-only professional
career-event ledger. `career_timeline` becomes legacy read-model/compat only
— no new writes, not the long-term source of truth, existing data preserved.

**Rules locked in:**
1. `career_events` is the only canonical chronological source for: employment
   starts/exits, title/role changes, promotions, achievements, verified
   projects/proof milestones, certifications, skill-confidence milestones,
   Weekly Skill Pulse milestones, mentor approval/milestones, opportunity
   transitions, and company-review lifecycle events (where safe/private).
2. `career_timeline`: no new writes, not source of truth, all existing data
   preserved, idempotent backfill into `career_events` planned with an
   explicit source reference retained on migrated rows.
3. No duplicated truth: `experiences`, `proof_objects`, `certifications`,
   `achievements` (future), and other specialist tables stay authoritative
   for their own domain detail. `career_events` stores a normalized event
   reference + display snapshot only. Every row carries at minimum: `id`,
   `user_id`, `event_type`, `occurred_at`, `source_type`, `source_id`,
   `evidence_source`, `verification_status`, `visibility`, `payload`,
   `created_at`, `updated_at`, `deleted_at`. Uniqueness/idempotency enforced
   on `(user_id, source_type, source_id, event_type)` where applicable.
4. One server-side unified timeline endpoint serves both Career Timeline and
   Career Replay — frontend never combines tables itself. Cursor pagination,
   chronological sort, filters, evidence-source labels, visibility rules
   (private/employer-visible/public-portfolio) enforced server-side.
5. Historical data: audit exact schema/data in both tables, additive/
   reversible/staging-tested migration scripts, no legacy deletion, produce
   a reconciliation report (total legacy records, migrated, skipped,
   duplicates, failures) before this workstream is considered done.
6. Required tests before Workstream 2 ships: idempotent backfill (running it
   twice produces zero duplicate rows), no duplicate event creation from
   normal app writes, correct visibility enforcement, evidence-source
   rendering, timeline ordering, Career Replay rendering, owner-only vs.
   consent-based employer visibility.

**Open item carried over from the Workstream 0 audit (§1.4-1):** the actual
current schema of both `career_timeline` (real, currently empty in prod —
`careerTimeline.js`/`CareerTimeline.jsx`) and `career_events` (real, richer:
verification_status/level, elo_delta, visibility, tags, timeline_category —
owner/consumer not yet identified) needs a full column-level audit as the
*first* concrete step of Workstream 2, before any backfill script is written
against assumed shapes.

**Status:** decision approved and recorded. No migration, no backfill
script, and no new endpoint written yet — implementation starts when
Workstream 2 is picked up next.

---

## 6. Test Plan (applies going forward, per workstream)

- **Lint**: `npm run lint` — must be zero new errors introduced (existing
  pre-existing errors in untouched code are tracked as tech debt, not a
  gate on new work, since fixing 35 pre-existing repo-wide lint errors is
  out of scope for this initiative).
- **Build**: `npx vite build` — must succeed.
- **Backend**: `node --test backend/server/lib/arena-v2/*.test.js` (existing
  test runner) plus new `node --test` suites added alongside each new
  backend router as it ships (Workstream 3+).
- **RLS/security**: `get_advisors(type:"security")` via the Supabase MCP
  must be clean (or have zero *new* findings) before any new table's
  migration is considered done.
- **Manual regression checklist per workstream**: exercise every existing
  flow the workstream's files touch (e.g. Workstream 0 → open Profile, open
  Career, switch between them repeatedly, confirm no blank tab body and no
  stale content leak) before marking the workstream complete.

---

## 7. Rollback Plan (general)

- Every new *feature* (not correctness fix) ships behind a flag in §4 —
  flip the env var, redeploy frontend, no DB rollback.
- Every new table is additive; no existing table's schema is altered
  destructively. If a new table's migration itself is defective, its own
  down-migration is written and tested against a Supabase branch before the
  up-migration is applied to production (per blueprint §19/§20).
- Correctness fixes (like the tab-state fix) are not flag-gated since
  reverting them reintroduces a confirmed bug — rollback path is `git
  revert`, not a flag flip.

---

## 8. Implementation Order (tracking against the blueprint)

1. **Workstream 0 — Safe Foundation** — ✅ complete (§5).
2. **Workstream 1 — Home as Career Command Center** — ✅ Today's Priority
   complete (§5a). Remaining Home sections (Promotion Readiness, Salary
   Position, Company Status, Mentor Area) depend on Workstream 2/4/5 tables
   and are not yet built — correctly deferred, not stubbed.
3. **Workstream 2 — Career module** — architecture decided and recorded
   (§5b): `career_events` canonical, `career_timeline` legacy read-only.
   Implementation not started. First step when picked up: full column-level
   audit of both tables' real data (§1.4-1) before writing any backfill script.
4. **Workstream 3 — Skills + Weekly Skill Pulse V2** — not started.
5. **Workstream 4 — Connect + Mentor Marketplace** — not started. Requires
   full table rebuild (§1.4-2), not a patch.
6. **Workstream 5 — Company module** — not started. `companies` table
   already exists and is reusable; membership/linkage model still to design.
7. **Workstream 6 — Anonymous Company Reviews** — not started. `company_ratings`
   is not anonymity-safe as-is; new tables required.
8. **Workstream 7 — AI Coach** — not started.
9. **Workstream 8 — Database/RLS/APIs/Jobs/QA (cross-cutting)** — partially
   ongoing implicitly (RLS already enabled repo-wide); `consent`/`audit_log`
   tables should land ahead of Workstream 4, per §3.

Next up: Workstream 2 (Career module) — starting with the column-level audit
of `career_timeline` vs `career_events` (§1.4-1, §5b), then the additive
migration/backfill plan and the unified timeline endpoint.
