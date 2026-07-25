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

## 5c. Workstream 2: Timeline and Career Event Ownership Audit

Ground truth queried directly against Supabase project `eybchcqwbizjmzyrviri` —
nothing in this section is inferred from code comments alone.

### Column-level schema

**`career_events`** (24 columns): `id uuid pk default gen_random_uuid()`,
`user_id uuid not null fk→profiles`, `event_type text not null` (CHECK-enum,
see below), `source_type text not null` (CHECK-enum), `company_id uuid
fk→companies`, `company_name text`, `role_title text`, `department text`,
`seniority_level text` (CHECK-enum), `start_date date`, `end_date date`,
`is_current boolean default false`, `verification_status text not null
default 'pending'` (CHECK-enum), `verification_level smallint default 0`
(CHECK 0-4), `verified_at timestamptz`, `verifier_ref text`, `elo_delta
integer default 0`, `elo_applied boolean default false`, `elo_applied_at
timestamptz`, `impact_summary text`, `visibility text not null default
'recruiter'` (CHECK-enum: public/recruiter/private), `tags text[] default
'{}'`, `timeline_category text` (CHECK-enum, only 4 values — see gaps),
`raw_source_data jsonb`, `created_at`/`updated_at timestamptz default now()`.

**`career_timeline`** (24 columns): `id uuid pk`, `user_id uuid not null
fk→profiles`, `category text not null` (CHECK-enum: education,
academic_project, internship, professional_experience, personal_project,
arena_challenge, certification), `title text not null`, `role text`,
`company text`, `company_domain text`, `institution text`, `domain text`,
`sub_type text`, `start_date date not null`, `end_date date`, `is_current
boolean`, `status text not null default 'draft'` (CHECK-enum:
active/completed/draft/needs_proof/expired/disputed/archived), `source text
not null default 'manual'` (CHECK-enum: manual/linkedin_import/
github_import/arena_auto), `verification_level smallint not null default 0`
(CHECK 0-4), `verifier_source text`, `verified_at timestamptz`, `visibility
text not null default 'private'` (CHECK-enum: public/recruiter/private),
`description text`, `impact_summary text`, `responsibilities text[]`,
`achievements text[]`, `tech_stack text[]`, `tags text[]`, `proof_links
jsonb default '[]'`, `is_featured/is_highlighted boolean`,
`affects_skill_graph boolean default true`, `aura_contribution integer
default 0`, `created_at`/`updated_at timestamptz`.

### Keys, indexes, RLS, triggers

- **PK/FK:** both tables PK on `id`; both FK `user_id → profiles.id`;
  `career_events` additionally FKs `company_id → companies.id`.
- **Indexes:** `career_events` has `user_id`, `event_type`,
  `verification_status`, `company_id`, and a composite `(user_id, start_date,
  end_date)` index — **no unique index for idempotency exists on either
  table today.** `career_timeline` has `user_id`, `(user_id, category)`,
  `verification_level`, `visibility`.
- **RLS (both tables, RLS enabled):** owner has full `ALL` access via `auth.uid()
  = user_id`; a second policy exposes rows with `visibility = 'public'` to
  anyone with no further check. **No policy grants `recruiter`-visibility
  rows to anyone other than the owner** — meaning "employer-visible" access
  is fail-closed today (functionally inert, not a security hole) since no
  consent mechanism exists yet to gate it. `career_timeline` additionally
  blocks writes to `arena_auto`-sourced rows even from the owner
  (`source <> 'arena_auto'` in the insert/update/delete policies).
- **Triggers — `career_events` only, both real and consequential:**
  - `career_events_updated_at` (BEFORE UPDATE) — trivial timestamp bump.
  - `career_event_elo_apply` (BEFORE UPDATE, function
    `apply_career_event_elo()`) — **fires on UPDATE only, never INSERT.**
    When `elo_delta ≠ 0`, `elo_applied = false`, and `verification_level ≥
    2`, it mutates `profiles.professional_elo`/`profiles.blended_elo` and
    writes an audit row to `professional_elo_history`. **Critical
    implication for Workstream 2: any backfill/sync must write via INSERT
    with `elo_applied` left at its default, and must never subsequently
    UPDATE a row in a way that flips `elo_delta` from 0 to non-zero with
    `verification_level ≥ 2`**, or it will silently move a real user's ELO
    as a side effect of a data-sync job. The sync code below uses
    `elo_delta: 0` on every synced row for this reason — ELO application
    stays fully out of scope for Workstream 2, to be revisited deliberately
    if/when a real "verified milestone → ELO" feature is scheduled.
  - `career_transition_check` (AFTER INSERT AND UPDATE, function
    `evaluate_path_transition()`) — fires on **every** insert. It only
    takes action if `event_type = 'first_job'` with `verification_level ≥
    3` (flips `profiles.path_status` to `'professional'` and logs a
    `path_transitions` row), or if cumulative `source_type IN
    ('epfo','umang','digilocker')` date-ranges sum to ≥90 days. **Sync code
    must never emit `event_type: 'first_job'` for a synced/backfilled
    experience** — that event type is reserved for the real first-job
    detection flow (not built yet) — a synced "career_join" style event
    below intentionally does not use `'first_job'`.
  - `career_timeline` has only the trivial `updated_at` trigger — no side
    effects.
- **CHECK-enum gaps relative to the blueprint's requirements (real, found
  by inspecting `pg_get_constraintdef`):**
  - `event_type` enum has 20 values, all oriented around employment/tenure/
    promotion/ELO milestones (`first_job`, `company_join`,
    `company_exit_clean/involuntary`, `tenure_*`, `promotion_verified/self`,
    `leadership_entry`, `international_role`, `company_switch_upward/
    lateral`, `project_outcome`, `skill_verified`, `gap_short/long`,
    `arena_professional`) — **no achievement, certification, weekly-pulse,
    mentor, or opportunity-transition event types exist.** Gap confirmed,
    additive migration required (§5c Deliverable 1).
  - `source_type` enum (9 values: epfo/umang/digilocker/employer_email/
    offer_letter/linkedin/manual_review/system_auto/self_claimed) describes
    *verification provenance*, not the blueprint's 5-value evidence-source
    taxonomy (self-claimed/resume-derived/employer-verified/
    document-verified/Capabilio-verified) — **no `evidence_source` column
    exists at all.** Gap confirmed.
  - No `source_id`, `payload`, `title`, `summary`, or `deleted_at` columns
    exist on `career_events` — all required by the blueprint's minimum
    field list. Gap confirmed.
  - `visibility` enum lacks a `confidential` state (blueprint requires
    private/employer-visible/public-portfolio/confidential). Gap confirmed
    — mapped as `private`→private, `recruiter`→employer-visible (closest
    existing semantic match, kept rather than renamed to avoid touching the
    two live RLS policies mid-workstream), `public`→public-portfolio, plus a
    net-new `confidential` value.

### Record counts and data quality (queried directly, not estimated)

| Metric | Value |
|---|---|
| `career_timeline` rows | **0** |
| `career_events` rows | **0** |
| `profiles` rows (total users) | 3 |
| Profiles with ≥1 `experiences` entry | 1 |
| Total `experiences` entries across all profiles | 1 |
| Profiles with ≥1 `certifications` entry | 1 |
| `proof_objects` rows | 0 |
| `professional_profiles` rows | 0 |
| `user_skills` rows | 9 |
| `weekly_pulses` rows (0 completed) | 1 |

**This changes the risk profile significantly**: there is no legacy
production data in either table to migrate, so duplicate/orphan/null-date
auditing on existing rows is moot (there are no rows to audit) — the real
work is (a) widening `career_events`' schema to support the required event
taxonomy, and (b) building the *forward* sync from the tables that actually
hold real data today (`profiles.experiences`, `profiles.certifications`,
plus `career_timeline` for completeness even though it's currently empty)
into `career_events`, correctly and idempotently, rather than reconciling a
large or messy historical dataset. Migration risk: **low** for data
integrity (nothing to corrupt), **medium** for the trigger side-effect risk
above (mitigated by the INSERT-only, `elo_delta:0`, non-`first_job` rules).

### Ownership: who actually reads/writes each table today

- **`career_events`: zero application-code references, anywhere.** No
  backend route reads or writes it; no frontend code queries it. It exists
  purely as DB schema + triggers. Its full intended event taxonomy and
  ELO/path-transition model is, however, **real, deliberate, pre-existing
  design** — documented in `frontend/src/config/careerEvents.js`
  ("Capabilio Employment Verification & Professional ELO System"), just
  never wired to a live API or UI. Adopting it as canonical carries no risk
  of breaking anything live (nothing currently depends on it), but its
  ELO/path-transition triggers are real and must be respected (above).
- **`career_timeline`: has a complete, real, mounted CRUD API**
  (`backend/server/routes/careerTimeline.js` → `/api/pro/timeline`, used by
  `frontend/src/lib/api.js`'s `timelineApi`) **and a complete, real React
  component built against that API** (`frontend/src/components/
  CareerTimeline.jsx`, imported into `Aura.jsx` as `CareerTimelinePro`).
  **That import is never rendered anywhere** — confirmed via search, only
  the import line exists, no JSX usage. `professionalProfile.js` and
  `orbitPlans.js` also read from `career_timeline` in minor fallback paths.
- **The Timeline UI a user actually sees today** (in `Aura.jsx`'s Career &
  Vault tab and `ProfessionalHome.jsx`'s embedded dashboard) **is a
  locally-defined `CareerTimeline` function component in each file that
  renders directly from the `profiles.experiences` JSONB column** — neither
  `career_timeline` nor `career_events` is the live source of truth for
  what users currently see. This is the single most important ownership
  fact from this audit: Workstream 2 is not "migrate legacy data," it's
  "consolidate three parallel, mostly-disconnected implementations
  (`profiles.experiences` rendering, the unused `career_timeline` CRUD
  stack, and the unused `career_events` schema) into one real, live path."

### Deliverable 1 — Audit conclusions

1. **Recommendation confirmed**: `career_events` can be safely extended as
   canonical. It has zero live consumers today (no breakage risk), a richer
   verification/visibility model than `career_timeline`, and its only real
   risk (ELO/path-transition triggers) is fully containable with the
   INSERT-only + `elo_delta:0` + never-emit-`first_job` rules above.
   **Exact gaps to close** (additive migration, §"Migration Plan" below):
   add `source_id`, `evidence_source`, `title`, `summary`, `payload jsonb`,
   `deleted_at`, `event_key`; widen `event_type`/`source_type`/`visibility`
   enums; add a partial unique index for idempotency.
2. **`career_timeline`'s exact role going forward**: legacy compatibility
   surface only. Its API (`/api/pro/timeline`) and RLS stay untouched and
   fully functional (nothing forces removing working infrastructure just
   because it's not the new canonical source) but receive no new product
   surface area — Career Timeline/Replay read from `career_events`
   exclusively from this workstream onward.
3. **Data migration risk: low.** Zero legacy rows in either table; the
   "migration" is a forward sync job, not a historical reconciliation.

### Source → event_type mapping table (Deliverable 1, required before any migration)

| Source table | Source record type | `career_events.event_type` | Source reference | `occurred_at` source | `evidence_source` | Default `visibility` | Duplication prevention |
|---|---|---|---|---|---|---|---|
| `profiles.experiences[]` (start) | experience entry, join | `company_join` | `source_type='experiences_sync'`, `source_id='exp:{company}\|{startDate}'` (deterministic, no stable entry id in the jsonb shape) | `experience.startDate` | `resume_derived` if `entry._source==='resume'`, else `self_claimed` | `recruiter` (employer-visible tier) | Partial unique index on `(user_id, source_type, source_id, event_type)` |
| `profiles.experiences[]` (end, if not current) | experience entry, exit | `company_exit_clean` | same `source_id` root, `event_type` differs so the idempotency key differs | `experience.endDate` | same as join | `recruiter` | Same unique index |
| `profiles.certifications[]` | certification entry | `skill_verified` *(closest existing enum value pending the new `certification_earned` value being added — see migration)* → **migrated to the new `certification_earned` value in the same migration**, so sync code targets the new value directly | `source_type='certifications_sync'`, `source_id='cert:{name}\|{date}'` | `certification.date` or `created_at` fallback | `document_verified` if `verificationStatus==='verified'`, else `resume_derived` if `_source==='resume'`, else `self_claimed` | `private` (certs default private until user opts to share) | Same unique index |
| `career_timeline` rows (legacy, currently 0) | any `category` | mapped 1:1 by `category` where a reasonable `event_type` exists, else `project_outcome` as a safe catch-all | `source_type='career_timeline_backfill'`, `source_id=row.id` (real stable UUID) | `row.start_date` | `document_verified` if `verification_level>=3` else `resume_derived` if `source==='linkedin_import'`/`'github_import'` else `self_claimed` | mapped from `row.visibility` directly (already public/recruiter/private) | Same unique index |

### Backfill plan

- **Migration order**: (1) additive schema migration widening `career_events`
  (§"Migration Plan"); (2) deploy the sync module + new endpoint behind
  `career_os_nav` (already on) with no data written until first read touches
  it; (3) sync runs lazily on each authenticated `GET
  /api/pro/v1/career/timeline` call for that user only (pull-based,
  per-user, not a global batch job) — appropriate given the tiny current
  data volume (§ counts above) and avoids needing a one-off admin script for
  3 total users; a batch backfill script is documented (§"Deployment") for
  when the user base is large enough that pull-based sync-on-read is no
  longer acceptable.
- **Idempotency method**: `upsert(rows, { onConflict: 'user_id,source_type,
  source_id,event_type', ignoreDuplicates: true })` — re-running the sync
  for the same user is a no-op for already-synced rows; edits to source
  data (e.g. editing an experience's end date) are handled by the sync
  computing a fresh row and relying on the same idempotency key structure
  only if the key components didn't change — **known limitation**: editing
  a synced experience's dates does not currently update the corresponding
  `career_events` row (it would need an explicit update path, not just
  upsert-with-ignore) — documented as a known limitation, not silently
  broken (see §"Known limitations" in the completion log).
- **Rollback method**: the sync is additive-only and idempotent; rolling
  back means either (a) flipping `career_os_nav` off (Timeline/Career tabs
  disappear, `career_events` rows remain harmlessly unread), or (b) deleting
  only the rows this sync created (`source_type IN
  ('experiences_sync','certifications_sync','career_timeline_backfill')`)
  if a full data rollback is ever needed — never a blanket `TRUNCATE
  career_events`, which would also delete any future real event data.
- **Reconciliation method**: the new endpoint's response includes a
  `_sync` debug block (row counts by source_type synced this call) in
  non-production only, and the sync module returns a plain-object summary
  (`{inserted, skipped, errors}`) that the route logs — this doubles as the
  "reconciliation report" mechanism required for future batch runs; given
  the current 3-user/1-experience/1-certification data volume, a full
  standalone reconciliation report generator is deferred until the batch
  path (above) is actually needed, and is called out as a known limitation.
- **Staging validation method**: `career_events`' schema changes were
  applied directly via the Supabase MCP migration tool against the single
  live project (no separate staging branch exists for this project today —
  a gap noted in the original Workstream 0 audit, §1). Mitigated by the
  additive-only nature of the migration (new nullable columns, widened
  CHECK enums, new partial index — nothing destructive, nothing that can
  fail against the 0 existing rows) and by testing the sync/mapping logic
  as pure, dependency-free unit tests before it ever touches the live DB
  (§ tests below).

---

### Deliverable 2 — Implementation (completed 2026-07-24)

**Migrations applied** (via Supabase MCP `apply_migration` against project
`eybchcqwbizjmzyrviri`; recorded for repo traceability in
`career_os_ws2_career_events_ledger_migration.sql`, repo root):

1. `career_os_ws2_career_events_canonical_ledger` — added `source_id`,
   `evidence_source`, `title`, `summary`, `payload jsonb`, `deleted_at`,
   `event_key` to `career_events`; widened `event_type`/`source_type`/
   `visibility` CHECK constraints additively (no existing values removed);
   added `evidence_source` CHECK enum; added partial unique index
   `career_events_idempotency_idx` on `(user_id, source_type, source_id,
   event_type) WHERE source_id IS NOT NULL AND deleted_at IS NULL`.
2. `career_os_ws2_add_occurred_at` — added `occurred_at timestamptz`,
   backfilled from `start_date`/`created_at`, indexed.
3. `career_os_ws2_fix_evaluate_path_transition_bug` — **emergent fix, not
   planned work.** The pre-existing `evaluate_path_transition()` trigger
   (fires on every `career_events` insert) used
   `EXTRACT(DAY FROM (date - date))`, which is invalid Postgres — two
   `date` values subtracted already yield an integer, not an interval, so
   `EXTRACT(DAY FROM integer)` doesn't exist. Since every profile in
   production has `path_status='student'`, the trigger's early-return
   never short-circuited before hitting this line, meaning **every insert
   into `career_events`, for every user, would have failed** — the table
   had never received a real insert before this workstream, so the bug was
   latent and undetected. Found via a real-data verification INSERT (not
   a unit test — the unit tests use pure functions with no DB), which
   failed with `function pg_catalog.extract(unknown, integer) does not
   exist`. Fixed by removing the invalid `EXTRACT()` wrapper; all other
   trigger logic (first-job path-transition check, EPFO day-sum threshold,
   `path_transitions` audit insert) unchanged. Re-ran the same INSERT
   afterward — succeeded. This is the single most consequential finding of
   this workstream: without it, Career OS's entire event pipeline would
   have silently 500'd for every user, forever.

**Files created:**
- `backend/server/lib/careerEventSync.js` — pure mapping functions
  (`parseFlexibleDate`, `mapExperienceToEvents`, `mapCertificationToEvent`,
  `mapLegacyTimelineRowToEvent`, `buildSyncRows`), no Supabase dependency,
  enforcing the two hard rules from the trigger audit (`elo_delta:0`
  always; never emit `event_type:'first_job'`).
- `backend/server/lib/careerEventSync.test.js` — 19 tests, including a
  pinned regression for the real production date shape
  (`startDate:"08/2017"`, MM/YYYY — `new Date("08/2017")` is `Invalid
  Date` in Node and used to throw on `.toISOString()`; confirmed via
  direct query of live `profiles.experiences`).
- `backend/server/routes/careerEventsV1.js` — `GET
  /api/pro/v1/career/timeline`: `requireAuth`-protected; runs an idempotent
  sync-on-read (`syncUserCareerEvents(uid)`) before every query; cursor
  pagination (base64-encoded `occurred_at`); validated `eventType`/
  `visibility` filters (400 on invalid values); `DEFAULT_LIMIT=20`,
  `MAX_LIMIT=100`; response `{ events, pagination: { hasMore, nextCursor
  }, _sync }` (`_sync` dev-only).
- `career_os_ws2_career_events_ledger_migration.sql` — repo-tracked record
  of the three migrations above.

**Files modified:**
- `backend/server.js` — mounted `careerEventsV1Routes` at `/api` (additive,
  nothing existing removed).
- `frontend/src/lib/api.js` — added `careerEventsApi.getTimeline({ cursor,
  limit, eventType, visibility })`.
- `frontend/src/pages/Orbit.jsx` — `TABS` restructured to 10 entries:
  Overview (new), Timeline (new, `career_events`-backed), Employment
  (renamed from the old default "Timeline" tab — same `TimelineTab`
  component, unchanged content), Verification (unchanged), Promotions/
  Achievements/Reputation (honest "coming next" stubs — no fake data),
  Compensation (unchanged), Career Health (renamed from "Readiness" tab —
  unchanged content), Career Replay (new). Every tab wrapped in
  `SectionErrorBoundary`. Default landing tab changed from `timeline` to
  `overview`. **Company Reviews is not present as a tab at all** — per
  explicit instruction, its dedicated privacy architecture is out of
  scope for this workstream.

**Fully implemented tabs (real backend data, no fabrication):**
Overview (outcome-first cards via `OutcomeCard`, never raw ELO — plus
top-3 recent milestones from the canonical endpoint), Timeline (full
loading/ready/empty/error states, `EvidenceSourceBadge` per event, cursor
"Load more"), Employment (pre-existing, unchanged), Career Health
(pre-existing, unchanged), Career Replay (chronological narrative view,
same endpoint, oldest-first, no second data model).

**Stub tabs (honest "coming next", no fake scores):** Promotions,
Achievements, Reputation.

**Not touched (kept flagged off, per instruction):** Company Reviews.

**Test results:** `node --test backend/server/lib/homePriority.test.js
backend/server/lib/careerEventSync.test.js` → **28/28 passing**
(9 from Workstream 1 + 19 new). Additional real-data verification
(not unit tests — direct Supabase MCP execution against the live DB for
real user `5d2c40e9-b021-45e5-a792-a468e0a7093b`):
- Sync pipeline succeeds end-to-end against real production
  `profiles.experiences`/`profiles.certifications` (MM/YYYY dates,
  string-array certs) → 3 correctly-typed `career_events` rows.
- **Idempotency confirmed**: re-running the identical insert a second
  time returned 0 rows (partial unique index + `ON CONFLICT DO NOTHING`
  works as designed).
- **ELO hard rule held**: all rows `elo_delta:0, elo_applied:false` — no
  ELO side effect occurred from sync-generated events.
- **Path-transition hard rule held**: `profiles.path_status` remained
  `'student'` after both inserts — no incorrect professional-path flip.
- `mcp__supabase__get_advisors(type:"security")` shows no new advisories
  introduced by this workstream (all findings pre-exist across unrelated
  tables/functions).

**Build:** `npx vite build` — 858 modules transformed, all Career OS
bundles (including `Orbit-*.js`) built successfully with no errors.
(Note: this sandbox's `eslint.config.js` currently can't run —
`eslint-plugin-react-refresh` is referenced but not a listed
devDependency, and the version available requires `eslint ^9` while the
repo pins `eslint ^8`. This is a **pre-existing repo tooling gap**,
unrelated to this workstream's changes — not something introduced here.
The two JSX unescaped-entity issues this workstream's own new code could
have introduced were fixed and confirmed via `git diff` hunk-boundary
analysis before this pass; flagging the broken lint config itself as a
follow-up item.)

**Known limitations (carried forward from the audit, now confirmed in
production):**
- Visibility is owner-only in this workstream — no employer/public
  consumer of `/api/pro/v1/career/timeline` exists yet since no consent
  table exists (Workstream 8 scope).
- Editing a synced experience's dates does not update its existing
  `career_events` row (upsert-with-ignore, not upsert-with-update) — the
  idempotency key doesn't change, so it's silently stale rather than
  duplicated. Not corrupted, just not live-synced on edit.
- Cursor pagination uses a single `occurred_at`-based cursor, not a
  compound `occurred_at+id` keyset — a rare exact-timestamp collision at
  a page boundary could in theory skip or repeat one row. Acceptable at
  current volume; flagged for the batch-scale follow-up.

**Feature flags — status after this workstream:**
- `career_os_nav`: **on** (Career module gated behind this; unchanged).
- `career_os_home`: on (Workstream 1, unrelated).
- `career_os_company`: **must stay off** — not touched this workstream.
- `career_os_company_reviews`: **must stay off** — Company Reviews has no
  privacy architecture yet; explicitly out of scope per instruction.
- `career_os_mentor_marketplace`: **must stay off** — not touched.
- `career_os_skill_pulse_v2`: **must stay off** — not touched.
- `career_os_career_replay`: this flag exists in `featureFlags.js` but
  Career Replay was just implemented as a plain tab inside the
  `career_os_nav`-gated Career module, not gated by its own separate flag
  in the current Orbit.jsx wiring. **Decision needed before this ships
  broadly**: either (a) wire `CareerReplayTab`'s render behind
  `career_os_career_replay` explicitly so it can be toggled
  independently, or (b) formally retire that flag and let Career Replay
  ride on `career_os_nav` alone. Left as-is (option b, implicitly) for
  this workstream since Replay only reads from the same already-shipped
  endpoint and has no independent risk surface — flagging this
  explicitly rather than silently deciding it.

**Rollback:**
- Frontend-only rollback: flip `career_os_nav` off — the entire Career
  module (all tabs) disappears; `career_events` rows already synced
  remain in place, harmlessly unread.
- Partial rollback (keep Career module, drop just the new tabs): revert
  the `Orbit.jsx` tab-list/render changes only; `TimelineTab`
  (Employment) and `ReadinessTab` (Career Health) are unchanged and don't
  depend on the new endpoint.
- Data rollback (only if ever needed): `DELETE FROM career_events WHERE
  source_type IN ('experiences_sync','certifications_sync',
  'career_timeline_backfill')` — never a blanket truncate, which would
  also delete real future event data.
- Schema rollback: the migration is additive-only (new nullable columns,
  widened CHECK enums, new indexes) — no destructive rollback is required
  unless a future workstream needs the space back, in which case drop the
  named columns/indexes explicitly, never `DROP TABLE`.

**Safe commit** (explicit paths, not `git add -A`):

```bash
git add \
  docs/career-os-implementation-plan.md \
  career_os_ws2_career_events_ledger_migration.sql \
  backend/server.js \
  backend/server/lib/careerEventSync.js \
  backend/server/lib/careerEventSync.test.js \
  backend/server/routes/careerEventsV1.js \
  frontend/src/lib/api.js \
  frontend/src/pages/Orbit.jsx \
  .gitignore
git commit -m "Career OS Workstream 2: career_events canonical ledger + Career module (Overview/Timeline/Employment/Career Health/Replay)

- career_events extended as the canonical append-only event ledger
  (additive schema migration, idempotent sync-on-read from
  profiles.experiences/certifications + legacy career_timeline)
- Fixes a pre-existing production bug in evaluate_path_transition()
  (invalid EXTRACT(DAY FROM ...) on an already-integer date diff) that
  would have blocked every insert into career_events for every user
- New GET /api/pro/v1/career/timeline: auth-protected, cursor-paginated,
  filter-validated, owner-scoped visibility
- Orbit.jsx Career module: Overview/Timeline/Career Replay built on the
  new endpoint; Employment/Career Health renamed from existing tabs
  (unchanged content); Promotions/Achievements/Reputation as honest
  coming-next stubs; Company Reviews intentionally not exposed
- 28/28 tests passing (19 new), idempotency + ELO/path-transition
  safety verified against real production data, build verified clean"
```

(If Workstream 0/1 files are not yet committed from a prior pass, add
`frontend/src/config/featureFlags.js frontend/src/components/careeros/
CareerOSUI.jsx frontend/src/App.jsx frontend/src/components/PathNav.jsx
frontend/src/pages/Aura.jsx frontend/src/pages/ProfessionalHome.jsx
backend/server/lib/homePriority.js backend/server/lib/
homePriority.test.js backend/server/routes/homeV1.js` to the same `git
add` list, or commit them separately first — check `git status` before
running the command above.)

---

### Workstream 2 — Release safeguards (applied 2026-07-24, post-approval)

Six safeguards required before Workstream 2 could ship, each closed out:

1. **Trigger fix tracked in SQL, not just applied manually** — confirmed
   present as Migration 3 in `career_os_ws2_career_events_ledger_migration.sql`.
2. **Indexes** — confirmed/added: `career_events_user_occurred_idx
   (user_id, occurred_at DESC)` (Migration 2), `career_events_idempotency_idx`
   (Migration 1), `career_events_event_key_idx` (Migration 1), and net-new
   **Migration 4** `career_os_ws2_timeline_filter_indexes` adding
   `career_events_user_type_occurred_idx (user_id, event_type, occurred_at
   DESC)` and `career_events_user_visibility_occurred_idx (user_id,
   visibility, occurred_at DESC)` to support the endpoint's `eventType`/
   `visibility` filters. Applied live via `apply_migration` and recorded in
   the tracked SQL file.
3. **Repeat-safety + rollback** — confirmed by re-running every DDL
   statement from Migrations 1–2 against production a second time: zero
   errors, row count unchanged (3 before/after), no duplicate objects
   created. Rollback instructions consolidated in one place at the bottom
   of the tracked SQL file (frontend flag flip / data-only delete /
   schema-only / trigger-fix-revert-not-recommended).
4. **Staging/branch test before production** — attempted via
   `create_branch`; **blocked** — this Supabase org's plan does not
   support branching ("Branching is supported only on the Pro plan or
   above", confirmed via a live API call, not assumed). User was asked
   and chose to still attempt branch creation; since it's plan-gated and
   not something either of us can override without a plan upgrade, the
   substitute verification (safeguard 3, repeat-run-against-prod) was
   used instead and is explicitly flagged in the SQL file as **not
   equivalent to isolated-copy testing** — a standing gap, not a silently
   resolved one, until the project is upgraded to a plan that supports
   branching.
5. **Reconciliation output** — generated and saved to
   `docs/career-os-ws2-reconciliation-report-2026-07-24.md`: 0 legacy
   records, 2 profile source records scanned, 3 events built/inserted, 3
   duplicates correctly skipped on repeat, 0 invalid/unmappable, 0 errors.
6. **Company Reviews / non-backed tabs** — reconfirmed: Company Reviews is
   not present as an Orbit.jsx tab at all (not even flagged-off — fully
   absent from the tab list); Promotions/Achievements/Reputation render
   `ComingNextTab`, a shared honest-empty-state component, not fabricated
   data. This constraint carries forward as a standing rule for every
   future workstream's tabs, not just this one.

---

## 5d. Workstream 3: Skills and Weekly Skill Pulse V2 — Audit (completed before any coding, 2026-07-24)

### Tables (real column-level schema, confirmed via direct query, not assumed)

**`weekly_pulses`** — `id uuid pk`, `user_id uuid fk→profiles`, `week_of date`,
`status text` (CHECK: `pending|in_progress|completed|skipped`), `question_count
int default 5`, `correct_count int`, `due_at timestamptz`, `completed_at
timestamptz`, `created_at timestamptz`. **Unique constraint on `(user_id,
week_of)`** — one pulse per user per week is already enforced at the DB level,
not just in application code. Index: `(user_id, due_at)`.

**`weekly_questions`** — `id uuid pk`, `pulse_id uuid fk→weekly_pulses`,
`skill_id uuid fk→user_skills` (**not** a shared skill catalog — points at one
specific user's own `user_skills` row), `question_type text` (CHECK: `scenario
|bug_finding|reasoning|dashboard_interpretation|architecture_interpretation
|operational_decision|work_situation`), `difficulty int` (CHECK 1-5), `prompt
text`, `media_url text`, `options jsonb`, `correct_option_id text`,
`explanation text`, `generated_from text` (CHECK: `resume_skill|unused_skill
|weak_topic_signal|role_profile|recent_skill`), `created_at timestamptz`.
**No `review_status`, no versioning, no reviewer, no domain/skill-tag field
independent of a specific user's skill row, no retirement field — none of
Workstream 3's Part B requirements exist on this table today.**

**`weekly_answers`** — `id uuid pk`, `question_id uuid fk→weekly_questions`,
`user_id uuid fk→profiles`, `selected_option_id text`, `is_correct boolean`,
`response_time_ms int`, `answered_at timestamptz`. **Unique on `(question_id,
user_id)`** — a user can't double-answer the same question (upsert-based).

**`user_skills`** — real Skill Graph field names (confirmed via
`skillGraph.js`, which itself documents the retarget from a never-real
`skill_graph` table): `name`, `slug`, `group_type` (CHECK: `core|domain|proof
|tool_stack|growth|verified_strength|career_signal`), `domain` (free text,
**currently null on all 9 real rows** — nobody has ever set it), `level` (CHECK:
`learning|beginner|developing|proficient|advanced|expert`), `level_score`
(0-100), `confidence` (0-1), `verified` (bool), `source` (CHECK: `manual
|arena_derived|cert_derived|ai_suggested|proof_derived|resume_derived`),
`proof_count`, `proof_artifacts` (jsonb array), `is_current`, `updated_at`.
Unique on `(user_id, slug)` and `(user_id, slug, group_type)`.

**Data quality, confirmed by direct query**: 9 `user_skills` rows total (all
belonging to the one real user from the Workstream 2 audit), all `group_type
='core'`, all `domain IS NULL`. Real skill names: Microsoft Excel, SQL,
Python, VBA, Tableau, Power BI, Data Validation, Data Mining, Statistical Data
Analysis. `weekly_pulses`/`weekly_questions`/`weekly_answers` are all **0 rows
in production** — the Weekly Career Check feature has never actually been
completed by a real user yet, despite being live code (Workstream 24 in the
task log). This means Workstream 3's tests will necessarily run against
synthetic fixtures, not real usage data — there is no real usage data yet.

### Current question-generation path (traced in `backend/server/routes/weeklyPulse.js`)

100% live, per-request AI generation — there is no question bank today.
`buildPulseForWeek()` picks up to 5 skills via `prioritizeSkills()` (weights
unverified + zero-proof + low-level_score + is_current skills higher,
excluding skills used in the last 4 weeks via `recentlyUsedSkillIds()`), calls
Groq (`GROQ_FAST`) with a prompt demanding exactly 5 scenario/bug-finding MCQs
with 4 options each, and inserts the raw model output directly into
`weekly_questions` with no review step, no approval gate, no versioning —
**AI output is served to the user the moment it's generated, unreviewed.**
This is precisely the pattern Workstream 3 Part B (production question bank,
approved-only serving) must replace for the v2 flow, while the existing route
keeps running completely unchanged as the v1 fallback.

### Existing endpoints

`GET /api/pro/weekly/current` (generates on first request if due — returns
`{available:false, reason:"no_skills_yet"}` if the user has zero skills, an
honest empty state, not fabricated content), `POST /api/pro/weekly/generate`
(idempotent per week via the unique constraint), `POST
/api/pro/weekly/:id/answer` (per-question, upserts into `weekly_answers`,
returns correctness + explanation immediately), `POST
/api/pro/weekly/:id/complete` (tallies, applies the existing capped
confidence-feedback rule — **±15 total `level_score` movement per skill per
pulse, split across however many questions touched that skill, never per-
question** — and marks the pulse `completed`).

### Pause/resume behavior (frontend, `WeeklyCareerCheck.jsx`)

There's no explicit "pause" state field — resumability is implicit and works
today because every answer is persisted immediately (`weekly_answers` upsert)
and `GET /current` recomputes `firstUnanswered` on every load. Closing the app
mid-pulse and reopening it correctly resumes at the first unanswered question.
This pattern is worth preserving for v2 rather than inventing a separate
pause/resume mechanism. **Gap**: no keyboard support (arrows/1-4/Enter) exists
today — pure click/tap only.

### Scheduling / reminders

**None exist.** No cron job, no scheduled task, no notification trigger for
Weekly Pulse anywhere in the repo (confirmed via repo-wide search for
cron/schedule/reminder patterns — zero matches). `due_at` is computed and
stored but nothing reads it to send a reminder. This is a pre-existing gap,
not something Workstream 3 is scoped to fix (no reminder requirement in the
Workstream 3 instructions) — noted for a future workstream.

### Mentor data (relevant to Part D's "mentor suggestions only where real mentor data exists" rule)

Only `mentor_groups`/`mentor_group_members` tables exist — no
`mentor_profiles`, no matching/booking infrastructure, and
`career_os_mentor_marketplace` is flagged off with a code comment confirming
the referenced tables don't exist yet. **Conclusion: mentor suggestions in v2
results must render as absent/empty in the current state — there is no real
mentor data to suggest from today.** This will be revisited once Workstream 4
(if that's the mentor marketplace workstream) ships real mentor data.

### Skill domain taxonomy gap (blocks the "top 10 supported skill domains" coverage gate as literally stated)

`user_skills.domain` is a free-text nullable column that is null on every
real row today — there is no enforced, finite domain taxonomy anywhere in the
schema to hang a "top 10 domains" coverage gate off of. Workstream 3
introduces one: `question_bank.domain` (new table, Part B) will be a
CHECK-constrained enum of a fixed initial taxonomy (documented in the
migration), and the coverage gate is computed against *that* taxonomy, not
against whatever a user happened to type into their own free-text `domain`
field. This is a deliberate design decision, not an audit gap glossed over —
call it out explicitly since the instruction's wording ("their relevant
domain") could be misread as requiring per-user free-text domain matching,
which the current data can't support (100% null).

---

## 5e. Workstream 3 — Implementation (completed 2026-07-24): Weekly Skill Pulse V2

Audit is §5d above. This section is the Deliverable 2 implementation record.

### Migration applied

`career_os_ws3_skill_pulse_v2_question_bank` (Supabase MCP `apply_migration`,
recorded in tracked file `career_os_ws3_skill_pulse_v2_question_bank_migration.sql`):
new `question_bank` table (fixed 11-value domain taxonomy incl. `other`,
skill_tags, difficulty, question_type, prompt/options/correct_option_id/
explanation, source, review_status, reviewer_id/reviewed_at/rejection_reason,
version/parent_id, retired_at/retirement_reason, report_count) with RLS
enabled and **zero client policies** (service-role/backend-only access —
this is the "server-enforced workflow" requirement: approval, versioning,
and retirement can only happen through backend code, never a direct client
write); new `question_bank_reports` table (reporting workflow) with owner-
scoped insert/select RLS policies; additive columns on the existing v1
tables — `weekly_pulses.flow_version` ('v1'|'v2', default 'v1') and
`weekly_questions.bank_question_id` (nullable FK to `question_bank`) — so v2
reuses the existing pulse/answer/complete plumbing instead of duplicating it.
Repeat-safety, rollback, and the one caveat (CREATE POLICY isn't
IF-NOT-EXISTS-guarded, so re-running this exact file after first apply would
fail on the two policy statements) are documented at the bottom of the
tracked SQL file.

### Files created

- `backend/server/lib/skillPulseV2/decay.js` — Part E explainable decay
  state (`computeDecayState`), boundaries exactly as specified (Fresh <4wk,
  Aging 4-7wk, At Risk 8-15wk, Decayed 16+wk or no signal), always returns
  the driving signal explicitly (`driver: {type, label, occurred_at}` or
  `null` — never a bare score).
- `backend/server/lib/skillPulseV2/questionBankGate.js` — Part A coverage
  gate. `TOP_10_DOMAINS` (fixed taxonomy substitute for user_skills.domain,
  which is 100% null in production — see §5d), `checkGlobalCoverageGate`
  (all 10 domains need ≥30 approved — the release-wide master switch),
  `hasSufficientCoverageForUser` (per-pulse check against the specific
  user's relevant domains, generous 45-question minimum for real headroom),
  `decideFlowVersion` (combines both + the flag, fails safe to v1 on any
  doubt), `validateQuestionForApproval` (server-enforced approval
  validation — missing explanation/options/correct_option_id/domain/
  difficulty all block approval).
- `backend/server/lib/skillPulseV2/selection.js` — Part C deterministic
  selection engine. Seeded PRNG (mulberry32 + FNV-1a string hash — no
  external dependency), weighted sampling without replacement, max-3-per-
  skill enforcement, anti-repeat exclusion, at-risk/decayed/target-gap skill
  weighting, adaptive-but-floored difficulty balancing (always ≥2 easy AND
  ≥2 hard regardless of prior-accuracy bias), defense-in-depth
  `review_status==='approved' && !retired_at` filter even though the
  caller's query should already guarantee this.
- `backend/server/lib/skillPulseV2/confidenceFeedback.js` — Part D bounded,
  visible confidence math. Same ±15-per-skill-per-pulse cap as v1's
  original inline formula (verified identical), but returns every
  intermediate value (correct/total/ratio/rawDelta/cappedDelta/explanation
  string) instead of just a final delta.
- `backend/server/lib/skillPulseV2/pulseProgress.js` — Part D pause/resume
  (`resumeAt` — pure version of the "find first unanswered question"
  pattern v1's frontend already relied on implicitly) and keyboard-intent
  mapping (`mapKeyToIntent` — arrows/1-4/Enter).
- `backend/server/lib/skillPulseV2/domainInference.js` — keyword-based
  bridge from a free-text skill name to the fixed domain taxonomy (documented
  workaround for user_skills.domain being unpopulated — see §5d).
- `backend/server/lib/skillPulseV2/skillPulseV2.test.js` — 74 tests total in
  the combined suite (see Test results below); covers every item in the
  Workstream 3 Part F list.
- `backend/server/routes/skillPulseV2.js` — `GET /api/pro/weekly/v2/status`
  (read-only eligibility check) and `POST /api/pro/weekly/v2/generate`
  (idempotent per user/week — reuses the existing `weekly_pulses(user_id,
  week_of)` unique constraint; decides v1 vs v2 server-side via
  `decideFlowVersion`, ignoring anything the client claims; builds a v2
  pulse by gathering approved bank questions for the user's inferred
  domains + real decay signals from `weekly_answers`/`user_skills.
  proof_artifacts`/`career_events`, running `selectPulseQuestions`, and
  writing into the same `weekly_pulses`/`weekly_questions` tables v1 uses —
  falls back to v1's exact `buildPulseForWeek` if the gate says yes but the
  actual question pool can't fill a valid 15-question set for this user).
- `career_os_ws3_skill_pulse_v2_question_bank_migration.sql` — tracked
  migration record (see above).

### Files modified

- `backend/server.js` — mounted `skillPulseV2Routes` (additive).
- `backend/server/routes/weeklyPulse.js` — exported `currentWeekOf`,
  `dueAtFor`, `buildPulseForWeek` for v2 to reuse (no behavior change to any
  exported function); refactored the `/complete` route's confidence-feedback
  math to call the new tested `computeAllConfidenceChanges` module instead
  of an inline duplicate of the same formula (verified identical output —
  same ratio/cap/clamp logic), and added three purely additive response
  fields (`skills_refreshed`, `skills_to_revisit`, and a `explanation`
  string on each `feedback[]` entry) — every previously-existing field name
  and value is unchanged, so this is not a breaking change to the v1
  contract the frontend already depends on.
- `frontend/src/lib/api.js` — added `weeklyCheckApi.v2Status()` /
  `v2Generate()`.
- `frontend/src/pages/WeeklyCareerCheck.jsx` — `load()` now calls
  `v2Generate()` (idempotent, safe) before `current()`, so the server-side
  flow decision always happens at pulse-creation time rather than v1's GET
  route silently auto-building a v1 pulse first; added keyboard support
  (1-4 select, arrows move selection, Enter submits/advances) active only
  during the question states; "done" screen now renders `skills_refreshed`/
  `skills_to_revisit` when the `complete()` response includes them (v1
  pulses that don't touch any skill still show identical output to before —
  purely additive UI). "Question X of Y" progress and the resumability
  pattern were already generic over question count and needed no change to
  correctly show "of 15" once v2 pulses exist.

### Test results

`node --test backend/server/lib/homePriority.test.js backend/server/lib/
careerEventSync.test.js backend/server/lib/skillPulseV2/skillPulseV2.test.js`
→ **74/74 passing** (9 + 19 from prior workstreams + 46 new). The 46 new
tests cover every Part F requirement: approved-only selection, no-unreviewed-
leak (including a retired-but-formerly-approved row), anti-repeat window,
max-3-per-skill (including a forced-spread case with only 2 skills
available), difficulty floor under both high- and low-accuracy adaptive
bias, determinism for a fixed seed (and non-determinism across different
seeds), at-risk/decayed skill weighting, the full coverage-gate decision
matrix (flag off / gate not met / user-domain insufficient / eligible),
today's-real-coverage-always-falls-back case, question approval validation,
all four decay-state boundaries (exact-week edge cases, not just
midpoints), missing-signal → Decayed-with-null-driver, most-recent-signal
selection, invalid-date handling, confidence-cap clamping at both ends,
visible-bounded-math shape, pause/resume at various points, and keyboard
mapping. One-pulse-per-week and RLS/authorization are DB-level guarantees
(unique constraint + RLS/get_advisors, confirmed via schema inspection
during the audit) and are recorded as documented-not-unit-testable rather
than silently dropped from the visible test list.

### Build

`npx vite build` — 858→859 modules (WeeklyCareerCheck bundle rebuilt
successfully at `WeeklyCareerCheck-*.js`), no errors.

### Safe rollout confirmation (Part A, explicit)

- `career_os_skill_pulse_v2` frontend flag: **unchanged, still `false` by
  default** (`frontend/src/config/featureFlags.js` — not touched this
  workstream).
- Backend's own gate (`skillPulseV2.js`'s `V2_FLAG_ENABLED`) reads
  `CAREER_OS_SKILL_PULSE_V2`/`VITE_FF_CAREER_OS_SKILL_PULSE_V2` env vars,
  **defaults to `false`** when unset — a server restart without explicit
  config can never accidentally start serving v2.
- Even if both flags were flipped true today, `question_bank` has **0
  approved rows in production** (confirmed — the table was just created),
  so `checkGlobalCoverageGate` fails for every one of the 10 domains and
  every real pulse falls back to v1. This is proven by the "today's real
  production coverage... always falls back to v1" test, not just asserted.
- The existing 5-question v1 flow (`weeklyPulse.js`,
  `WeeklyCareerCheck.jsx`'s core question/answer/complete loop) is
  completely intact and is what every real user gets today, unchanged in
  substance (only additive response fields and an extra idempotent
  `v2Generate()` call were added, which returns/falls back to the exact
  same v1 pulse it always would have).

### Known limitations / follow-ups

- **Domain inference is a keyword heuristic**, not real per-user domain
  data (`domainInference.js`) — revisit once `user_skills.domain` is
  actually populated by product (e.g. a Skills page domain picker).
- **No scheduling/reminders** for either flow (confirmed pre-existing gap in
  the audit, not introduced or fixed here — out of Workstream 3's stated
  scope).
- **Mentor suggestions are entirely absent from results**, not stubbed —
  confirmed in the audit that no real mentor-matching data exists yet
  (`mentor_profiles`/booking tables don't exist); the product rule is
  "mentor suggestions only where real mentor data exists," so absence is
  the correct, honest behavior here, to be added once Workstream 4 (if
  that's the mentor marketplace workstream) ships real data.
- **Question bank is empty** — Workstream 3 built the schema, gate,
  selection engine, and review-validation logic, but did not (and was not
  asked to) author or import the ≥30-per-domain × 10-domains of actual
  approved question content. That's a content/ops task, not an engineering
  one, and is the actual reason v2 stays off in practice regardless of flag
  state.

### Feature flags — status after this workstream

- `career_os_skill_pulse_v2`: **must stay off** (already was; unchanged).
  Real activation requires both flipping this flag AND populating
  `question_bank` with ≥30 approved questions per top-10 domain — neither
  happened this workstream, by design.
- All other flags: unchanged from their Workstream 2 status (see §"Release
  safeguards" above).

### Rollback

1. **No rollback needed for the flag** — it was never turned on.
2. **Data-only**: `DELETE FROM question_bank_reports; DELETE FROM
   question_bank;` — v1 tables are completely unaffected (nullable
   `bank_question_id`, defaulted `flow_version`).
3. **Schema-only**: drop `weekly_questions.bank_question_id`, drop
   `weekly_pulses.flow_version`, drop `question_bank_reports`, drop
   `question_bank` (in that order) — see the tracked migration file's
   rollback section for the exact statements.
4. **Code-only**: unmounting `skillPulseV2Routes` from `server.js` and
   reverting `WeeklyCareerCheck.jsx`'s `load()` to skip the `v2Generate()`
   call would restore byte-for-byte v1-only behavior, though this is
   unnecessary given the flag/coverage gates already guarantee v1-only
   behavior in production today.

### Safe commit (explicit paths, not `git add -A`)

```bash
git add \
  docs/career-os-implementation-plan.md \
  career_os_ws3_skill_pulse_v2_question_bank_migration.sql \
  career_os_ws2_career_events_ledger_migration.sql \
  docs/career-os-ws2-reconciliation-report-2026-07-24.md \
  backend/server.js \
  backend/server/routes/weeklyPulse.js \
  backend/server/routes/skillPulseV2.js \
  backend/server/lib/skillPulseV2/decay.js \
  backend/server/lib/skillPulseV2/questionBankGate.js \
  backend/server/lib/skillPulseV2/selection.js \
  backend/server/lib/skillPulseV2/confidenceFeedback.js \
  backend/server/lib/skillPulseV2/pulseProgress.js \
  backend/server/lib/skillPulseV2/domainInference.js \
  backend/server/lib/skillPulseV2/skillPulseV2.test.js \
  frontend/src/lib/api.js \
  frontend/src/pages/WeeklyCareerCheck.jsx \
  .gitignore
git commit -m "Career OS Workstream 3: Weekly Skill Pulse V2 (coverage-gated, defaults to v1 fallback)

- Adds a production question_bank (approved/review workflow, versioning,
  retirement, reporting) behind RLS with zero client policies —
  server-enforced approval only
- Deterministic 15-question selection engine: seeded PRNG, max-3-per-skill,
  8-week anti-repeat, at-risk/decayed/target-gap weighting, floored
  difficulty balancing (never all-hard or all-easy)
- Explainable skill decay state (Fresh/Aging/At Risk/Decayed) with an
  explicit driving signal, never a bare score
- Coverage gate requires 30+ approved questions in every one of 10 fixed
  domains AND per-user relevant-domain coverage before v2 activates;
  today's real 0-row question_bank means every user gets v1 regardless of
  flag state, proven by a dedicated test
- v1 5-question flow (weeklyPulse.js, WeeklyCareerCheck.jsx) fully
  preserved as the always-available fallback; only additive response
  fields and one new idempotent generate call were added to it
- 74/74 tests passing (46 new), build verified clean,
  career_os_skill_pulse_v2 confirmed still off by default"
```

(Same note as Workstream 2's commit block: check `git status` first — if
Workstream 0/1/2 files aren't committed yet, include them or commit in
sequence.)

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
6. **Workstream 5 — Company module** — SCOPED MINIMAL PASS SHIPPED (real,
   flag-gated end-to-end). Deliberately not the full 4-table design from
   docs/company-module-ws5-design-proposal.md (deferred by product
   direction — reuse existing infra instead) — that doc's larger design
   (fresh `companies` rebuild, `company_name_aliases`,
   `company_employment_links`) is NOT what shipped. What shipped:
   - DB: RLS added to the existing (0-row) `companies` table (public
     SELECT, service_role-only writes); `profiles` got 3 additive columns
     (`company_id`, `company_link_state`, `company_visibility_public`); one
     new table, `company_memberships`, with self-claim + admin/owner-roster
     RLS. See `career_os_ws5_company_module_migration.sql` (applied, not a
     draft anymore) and `get_advisors` result (no new warnings from this
     pass; explicitly verified the new trigger function has no stray
     anon/authenticated EXECUTE grant, per the mentor-marketplace lesson).
   - Backend: `backend/server/routes/company.js`, mounted at
     `/api/pro/v1/company`, gated by `COMPANY_MODULE_V1_ENABLED` (default
     false, 404s while off). `GET /:id`, `GET /me`, `POST /me/link`
     (Idempotency-Key required — see
     `backend/server/lib/company/idempotency.js` header comment for why
     this is an in-memory scoped variant rather than a persisted table like
     mentor marketplace's), `PATCH /me/visibility`, `GET /search`.
   - Frontend: `frontend/src/pages/Company.jsx` (real Overview tab, local
     tab state, search-and-link empty state, visibility toggle,
     `SectionErrorBoundary`), wired into `App.jsx`'s `currentPage ===
     "company"` branch (previously missing entirely), `companyApi.*` added
     to `frontend/src/lib/api.js`. Still gated by the existing
     `career_os_company` flag (default false) on both the nav item and this
     page's data-fetching.
   - Still future work (not this pass): fuzzy-matching/reconciliation
     engine, alias table, employer verification promotion path
     (`employer_not_partner` / `employer_verified_partner` /
     `joined_via_capabilio` states are reachable in the CHECK constraint but
     nothing writes them yet), the My Team/Manager/Projects sub-tabs.
7. **Workstream 6 — Anonymous Company Reviews** — not started. `company_ratings`
   is not anonymity-safe as-is; new tables required.
8. **Workstream 7 — AI Coach** — not started.
9. **Workstream 8 — Database/RLS/APIs/Jobs/QA (cross-cutting)** — partially
   ongoing implicitly (RLS already enabled repo-wide); `consent`/`audit_log`
   tables should land ahead of Workstream 4, per §3.

Next up: Workstream 2 (Career module) — starting with the column-level audit
of `career_timeline` vs `career_events` (§1.4-1, §5b), then the additive
migration/backfill plan and the unified timeline endpoint.

---

## 5f. Content-Ops Deliverable (completed 2026-07-24): Question Bank Seeding, Admin Workflow, Coverage Gate

§5e closed out Workstream 3's engineering scope but left the question bank
empty, correctly flagging content authoring/review as a separate content-ops
task, not an engineering one. This section is that deliverable: the admin
workflow needed to review/approve content, the import tooling to get content
in, 300 draft questions actually generated and inserted, and an honest
accounting of what is and isn't ready for release.

### Admin question-bank workflow

`backend/server/routes/questionBankAdmin.js` (new route file) implements the
full lifecycle: draft creation, validation, a review queue, approve,
reject/request-changes, retire, version history, question reports, reviewer
attribution, and a full audit trail. Key design points:

- **Versioning is append-only.** History is tracked via `parent_id` +
  `version` columns; editing an existing question creates a new draft row
  rather than mutating an approved or retired row in place — the same
  server-enforced-workflow principle as §5e's zero-client-policy
  `question_bank` table.
- **Every state transition writes to `question_bank_audit_log`** — draft
  creation, approval, rejection, retirement, and edits are all recorded with
  reviewer attribution, not just the current row's `reviewer_id`/
  `reviewed_at` fields.
- **Gated by the existing admin model, not a new one.** Uses
  `backend/server/lib/arena-v2/requireAdmin.js` (checks `profiles.is_admin`)
  — no parallel admin/role system introduced.
- **Approval re-runs server-side validation as a hard gate.** The approve
  endpoint calls `validateQuestionForApproval()`
  (`backend/server/lib/skillPulseV2/questionBankGate.js`, from §5e) again on
  the server regardless of what the client sends, so a client can never
  bypass the missing-explanation/options/correct_option_id/domain/difficulty
  checks by crafting a request directly.

### Import tooling

- `backend/server/lib/skillPulseV2/questionImport.js` — CSV/JSON parsing and
  validation. `toQuestionBankRow()` hard-forces `review_status='draft'` on
  every imported row regardless of what the source file contains, so a bulk
  import can never smuggle in a pre-approved question.
- `backend/server/lib/skillPulseV2/questionImport.test.js` — 12 tests, all
  passing.
- `scripts/importQuestionBank.mjs` — CLI wrapper. Dry-run by default (parses
  and validates only); requires an explicit `--commit` flag to actually
  insert.
- `docs/question-bank-import-template.csv` and
  `docs/question-bank-import-template.json` — example templates for future
  content contributors.

### 300 draft questions generated

`scripts/generateQuestionBankDrafts.mjs` produced 300 scenario-style
questions — 30 per domain across all 10 supported domains
(`software_engineering`, `data_analytics`, `product_management`,
`design_ux`, `sales`, `marketing`, `finance_accounting`,
`operations_supply_chain`, `hr_people`, `customer_success`). Each question
has 4 options, one `correct_option_id`, an explanation, `skill_tags`,
`domain`, and a `question_type` (`scenario`/`reasoning`/`bug_finding`/
`dashboard_interpretation`/`operational_decision`/`work_situation`/
`architecture_interpretation`). `source='ai_generated'`,
`review_status='draft'` on every row — none auto-approved. Difficulty is
roughly balanced 1-5 (easy/medium/hard) per domain but not identical across
domains — `customer_success` skews easier (15 easy vs the 9-12 typical
elsewhere). Output written to `docs/question-bank-drafts-300.json` and
validated via the import CLI's dry-run mode: 300 valid, 0 invalid.

### Production insert

The sandbox environment has no network egress to Supabase —
`scripts/importQuestionBank.mjs --commit` fails here with `supabaseUrl is
required`. Because of that, the actual insert was done as 10 batched raw SQL
`INSERT` statements (30 rows each, one per domain) executed directly through
the Supabase MCP `execute_sql` tool against project `eybchcqwbizjmzyrviri`.
Post-insert verification query confirms: `total_rows=300`, `draft_rows=300`,
`ai_generated_rows=300`, `approved_rows=0`, `distinct_domains=10`.

### Coverage report and reviewer checklist

- `docs/question-bank-coverage-report-2026-07-24.md` — breakdown by
  domain/difficulty/approval-status, by `question_type`, and by `skill_tag`.
  All 30 skill tags have exactly 10 questions each. `question_type`
  distribution: `scenario`=90, `reasoning`=81, `operational_decision`=51,
  `dashboard_interpretation`=33, `work_situation`=30, `bug_finding`=12,
  `architecture_interpretation`=3 (all 3 in `software_engineering` only).
- `docs/question-bank-reviewer-checklist.md` — a 10-point per-question
  checklist (unambiguous correct answer, plausible distractors, no trick
  wording, real explanations, accurate difficulty/skill_tags/domain/
  question_type, no bias, no near-duplicates), plus workflow guidance
  (draft → in_review → approved/rejected, edits create a new version rather
  than mutating existing rows) and batch-specific notes for reviewers
  working through the 2026-07-24 300-question set.

### Release gate status (restated, unchanged)

- `career_os_skill_pulse_v2` remains **off** in both frontend
  (`frontend/src/config/featureFlags.js`, default `false`) and backend
  (`backend/server/lib/skillPulseV2/skillPulseV2.js`'s `V2_FLAG_ENABLED`,
  default `false`) — this deliverable did not touch either flag.
- `approved_rows=0` today, so `checkGlobalCoverageGate()`
  (`questionBankGate.js`, §5e) independently blocks v2 regardless of flag
  state — the release gate requires **≥30 approved (not draft) questions in
  every one of the 10 domains**, which has not been met by this work. 300
  drafts get the content pipeline started; they do not themselves clear the
  gate.
- **No auto-approval logic exists anywhere in the codebase.** Every row must
  go through a human reviewer with `profiles.is_admin=true` using the admin
  API in this section.

### Known limitations / gaps (flagged honestly)

- The 300 questions are **unreviewed AI-generated drafts**, not vetted
  content — real subject-matter-expert review is still required before any
  of them can count toward the release gate.
- Template-based generation means the 3 skill-tag variants within each
  domain share very similar phrasing/structure, since they're produced from
  the same 10 authoring "frames" per domain. Expected, but reviewers should
  be aware of it when checking for near-duplicates.
- `architecture_interpretation` coverage is thin — only 3 questions, all in
  `software_engineering`. Other domains have zero questions of this type.
- The sandbox's lack of Supabase network access means
  `scripts/importQuestionBank.mjs --commit` is **unverified end-to-end** in
  this environment — only the raw-SQL-via-MCP path was actually exercised
  for this batch. The `--commit` path should be tested in a real deployment
  environment before being relied upon for future imports.

## 5g. Workstream 4 — Mentor Marketplace (completed 2026-07-24): Real Implementation

Full real implementation of the mentor marketplace, replacing the dead
`mentorHub.js` scaffold. Design is documented in
`docs/mentor-marketplace-ws4-design-proposal.md` (revised to v2 in this same
pass — v1 audit findings kept verbatim at the bottom for history). This
section documents what was actually built, applied, and tested — see that
doc for the full design rationale.

### Files created

**Migration:**
- `career_os_ws4_mentor_marketplace_migration.sql` — 13 new tables
  (`mentor_applications`, `mentor_profiles`, `mentor_availability_slots`,
  `mentor_bookings`, `mentor_payments`, `mentor_payment_webhook_events`,
  `mentor_idempotency_keys`, `mentor_payouts`, `mentor_payout_line_items`,
  `mentor_disputes`, `mentor_reviews`, `mentor_review_reports`,
  `mentor_audit_log`), RLS enabled + policies on all 13, indexes for the
  mentor_id/mentee_id/status/slot-expiry lookup patterns, and three
  `SECURITY DEFINER` Postgres functions (`mentor_reserve_slot`,
  `mentor_confirm_booking`, `mentor_release_booking`) for the row-locked
  reservation/confirmation/release transactions.

**Backend library code** (`backend/server/lib/mentorMarketplace/`):
- `refundPolicy.js` + `refundPolicy.test.js` — single exported policy config
  (cancellation refund tiers, no-show/dispute windows, auto-completion
  threshold, payout exclusions, reservation hold length) + pure resolver
  functions.
- `idempotency.js` + `idempotency.test.js` — `mentor_idempotency_keys`-backed
  check/record cycle for the `Idempotency-Key` header contract.
- `slotReservation.js` + `slotReservation.test.js` — thin wrapper around the
  three RPC functions above; owns request shaping and error-to-HTTP-status
  mapping, not the locking itself.
- `webhook.js` + `webhook.test.js` — HMAC-SHA256 webhook signature
  verification (separate secret/construction from the existing checkout
  signature check in `payments.js`) + event-dedup + booking-state-transition
  orchestration.
- `reconciliation.js` + `reconciliation.test.js` — three importable sweeps
  (stale-reservation release, missed-webhook recovery via a stubbed
  Razorpay-status check, auto-completion) used by both the CLI script and
  (optionally) an admin API route.
- `payouts.js` + `payouts.test.js` — admin-triggered payout **batch**
  eligibility/creation/finalize/mark-paid logic. No automated disbursement
  anywhere in this file.

**Backend routes:**
- `backend/server/routes/mentorMarketplace.js` — user-facing, mounted at
  `/api/pro/v1/mentor`. Application submission, browse mentors/slots,
  reserve/checkout/cancel a booking, submit/report reviews, list own
  bookings. Exports `MENTOR_MARKETPLACE_V1_ENABLED` (backend flag).
- `backend/server/routes/mentorMarketplaceAdmin.js` — admin-only
  (`requireAuth` + `requireAdmin`), mounted at `/api`. Application
  review/approve/reject, dispute resolution, no-show reporting, review
  moderation + report resolution, payout batch create/finalize/mark-paid,
  reconciliation trigger.
- `backend/server/routes/mentorMarketplaceWebhook.js` — Razorpay webhook,
  mounted separately with `express.raw({ type: 'application/json' })`
  scoped to exactly `/api/pro/v1/mentor/webhook/razorpay`, wired in
  `server.js` BEFORE the global `express.json()` call.

**Script:**
- `scripts/mentorReconciliation.mjs` — CLI wrapper around
  `reconciliation.js`, dry-run by default, `--commit` to write changes
  (same convention as `scripts/importQuestionBank.mjs`).

**Modified:**
- `backend/server.js` — commented out the `mentorHubRoutes` import and its
  `app.use()` mount (file kept, not deleted — see comment in the import
  block), added imports/mounts for the three new route files, added the
  scoped `express.raw()` middleware for the webhook path before the global
  JSON parser.
- `frontend/src/config/featureFlags.js` — added `mentor_marketplace_v1`
  (`envFlag("MENTOR_MARKETPLACE_V1", false)`), same `VITE_FF_<NAME>`
  override convention as every other flag in that file. The pre-existing
  `career_os_mentor_marketplace` flag (added in an earlier pass, before this
  workstream's real schema existed) is left untouched — `mentor_marketplace_v1`
  is the flag this workstream's backend routes actually check.
- `server.env.example` — added `RAZORPAY_WEBHOOK_SECRET` (with a comment
  explaining it is a separate secret/construction from
  `RAZORPAY_KEY_SECRET`) and `MENTOR_MARKETPLACE_V1=false`.
- `.gitignore` — added `dist_ws4_check` (sandbox build-check output dir,
  same recurring pattern as `dist_ws0_check`/`dist_ws1_check`/etc — the real
  `dist/` is permission-locked in this sandbox).
- `docs/mentor-marketplace-ws4-design-proposal.md` — revised to v2 (see
  above), v1 audit findings preserved at the bottom.

### Migration application + advisor results

Applied via Supabase MCP `apply_migration` against project
`eybchcqwbizjmzyrviri` (two statements: the main migration, then a
follow-up `career_os_ws4_mentor_marketplace_rpc_lockdown` fixing an issue
the advisor caught — see below). Post-migration verification query
(`SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE
'mentor_%'`) confirms all 13 new tables exist with `rowsecurity = true`,
alongside the pre-existing unrelated `mentor_groups`/`mentor_group_members`
(also `rowsecurity = true`, untouched by this migration).

**Advisor finding caught and fixed in this pass:** the first `get_advisors`
(security) run after the initial migration showed the three new
`SECURITY DEFINER` RPC functions (`mentor_reserve_slot`,
`mentor_confirm_booking`, `mentor_release_booking`) as callable by both
`anon` and `authenticated` via `/rest/v1/rpc/...`, despite the migration
including `REVOKE ALL ... FROM PUBLIC` for each. Root cause: Supabase's
project template sets default privileges that explicitly grant `EXECUTE` on
new `public`-schema functions to the `anon`/`authenticated` roles — these
are separate explicit grants, not inherited via the `PUBLIC` pseudo-role, so
revoking from `PUBLIC` alone does not remove them. Fixed with a follow-up
migration that runs `REVOKE EXECUTE ... FROM anon, authenticated` explicitly
on all three functions, and re-runs `get_advisors` to confirm the three
`anon_security_definer_function_executable` /
`authenticated_security_definer_function_executable` warnings for these
specific functions are gone. The same follow-up also pinned `mentor_is_admin()`'s
previously-mutable `search_path` (a `WARN`-level `function_search_path_mutable`
finding), fixed with `SET search_path = public` + `security invoker`.

Remaining advisor output after the fix is entirely **pre-existing** findings
unrelated to this workstream (RLS-enabled-no-policy INFOs on other
features' tables, a `notifications`/`referral_codes` always-true policy
WARN, a public storage bucket listing WARN, other pre-existing
`SECURITY DEFINER` functions from InstitutionOS/Arena-V2, and the
account-level leaked-password-protection WARN) — none newly introduced by
this migration.

### Test results (`node --test`, exact counts)

| File | Tests | Pass | Fail |
|---|---|---|---|
| `refundPolicy.test.js` | 21 | 21 | 0 |
| `idempotency.test.js` | 8 | 8 | 0 |
| `slotReservation.test.js` | 8 | 8 | 0 |
| `webhook.test.js` | 10 | 10 | 0 |
| `reconciliation.test.js` | 12 | 12 | 0 |
| `payouts.test.js` | 9 | 9 | 0 |
| **Total** | **68** | **68** | **0** |

All new backend files also passed `node --check` (syntax-only) individually:
`backend/server.js`, `backend/server/routes/mentorMarketplace.js`,
`mentorMarketplaceAdmin.js`, `mentorMarketplaceWebhook.js`,
`scripts/mentorReconciliation.mjs`, all six `mentorMarketplace/*.js` library
files, and `frontend/src/config/featureFlags.js`.

**Important scope honesty note on what these tests actually prove:**
`slotReservation.test.js` and `reconciliation.test.js`'s "concurrent
reservation" and "missed webhook recovery" tests run against **hand-written
fake Supabase-client doubles** that mimic the real RPC/query semantics in
plain JS — they prove this codebase's JS wrapper/orchestration logic
produces the correct request shape and error mapping for every scenario
(clean 409 on a losing reservation, safe no-op on webhook redelivery,
correct transition on a mocked "actually captured, no webhook" recovery,
etc). They do **not** prove the real Postgres `SELECT ... FOR UPDATE` lock
in the applied migration is race-free under two genuinely simultaneous
database connections — that would require opening two live connections to
the Supabase Postgres instance, which is not possible through the MCP
tools available here (each call is a single request/response, not a
persistent connection). The row lock's correctness is a property of the
SQL function body (single statement, single transaction) rather than of any
JS code, and `webhook.test.js`'s signature tests are unit tests against a
fake `RAZORPAY_WEBHOOK_SECRET` test value, not a real Razorpay Test Mode
delivery — see the gate table below for the precise distinction.

### Build verification

`npx vite build --outDir dist_ws4_check --emptyOutDir` — **succeeded**, 858
modules transformed, built in 13.43s. Only pre-existing warnings (large
chunk sizes on `Arena`, `Aura`, `domainChallenges`, etc — unrelated to this
workstream, present before these changes) — no new errors or warnings
introduced by the mentor marketplace files. Did not touch the real `dist/`
directory (permission-locked in this sandbox per prior workstreams);
`dist_ws4_check` added to `.gitignore`.

### Feature flag confirmation

- Frontend: `frontend/src/config/featureFlags.js` — `mentor_marketplace_v1:
  envFlag("MENTOR_MARKETPLACE_V1", false)` → confirmed `false` with no env
  var set.
- Backend: `mentorMarketplace.js`'s exported `MENTOR_MARKETPLACE_V1_ENABLED
  = process.env.MENTOR_MARKETPLACE_V1 === "true" || process.env.VITE_FF_MENTOR_MARKETPLACE_V1
  === "true"` → confirmed `false` with no env var set (checked directly via
  a one-off `node -e` evaluation of the same expression). Every route in
  `mentorMarketplace.js`, `mentorMarketplaceAdmin.js`, and
  `mentorMarketplaceWebhook.js` checks this flag and 403s/404s while it is
  off, regardless of auth/admin state.
- Re-grepped `frontend/src` for `/api/mentors` and `mentorApi` immediately
  before editing `server.js` in this pass (not just relying on the prior
  audit) — zero matches for either, confirming it was still safe to unmount
  `mentorHubRoutes`.

### The 9 release gates — honest status

| Gate | Status | What was actually checked |
|---|---|---|
| (a) All migrations and RLS tests pass | **PARTIALLY VERIFIED.** Migration applied cleanly; `SELECT rowsecurity FROM pg_tables` confirms RLS enabled on all 13 tables; Supabase MCP `get_advisors` (security) run twice (before/after a fix) shows no new warnings attributable to this workstream. This is schema-level + linter verification, **not** a full RLS policy test suite exercising real `auth.uid()` sessions against every policy branch (mentee-vs-mentor-vs-admin-vs-anon on all 13 tables) — that would need real authenticated Supabase client sessions, not available via the MCP tools used here. |
| (b) Booking concurrency and idempotency tests pass | **PARTIALLY VERIFIED.** `idempotency.test.js` (8/8) and `slotReservation.test.js` (8/8) pass against fake-client doubles that correctly model the RPC's documented semantics. This proves the JS orchestration layer's behavior under those semantics; it does **not** prove the underlying Postgres row lock is race-free under genuinely concurrent live connections (not achievable in this sandbox — see test-file header comments). |
| (c) Razorpay Test Mode webhook signature verification passes | **PARTIALLY VERIFIED — and specifically NOT what the gate names.** `webhook.test.js` (10/10) proves `verifyWebhookSignature()` correctly accepts a validly-HMAC-signed payload and rejects a tampered payload/wrong secret, using a fake `RAZORPAY_WEBHOOK_SECRET` test value. This is a **signature-verification unit test**, not a real Razorpay Test Mode integration test — that requires a live Razorpay dashboard configured to actually deliver signed webhook events, which does not exist in this sandbox. |
| (d) Reconciliation passes missed-webhook tests | **PARTIALLY VERIFIED.** `reconciliation.test.js` includes the specifically-required scenario: a booking whose payment was "actually captured" per a mocked Razorpay order-status check but no webhook ever arrived is correctly transitioned to `confirmed` (not left stuck, not wrongly expired) — see the test named exactly that. The real Razorpay order-status lookup itself is a documented stub (`stubCheckRazorpayOrderStatus`) that throws — not wired to a live account. |
| (e) Refund/no-show/dispute tests pass | **PARTIALLY VERIFIED.** `refundPolicy.test.js` (21/21) covers every tier (>24h full refund, 6-24h 50%, <6h none, mentor-cancellation/no-show full refund, mentee no-show no-refund-but-mentor-payout-eligible, 48h no-show window, 7-day dispute window, 24h auto-completion) as pure-function unit tests. The admin dispute-resolution and no-show routes (`mentorMarketplaceAdmin.js`) call these functions correctly by code inspection but have no route-level integration test in this pass (would need a running Express server + live DB). |
| (f) Payout batch tests pass | **PARTIALLY VERIFIED.** `payouts.test.js` (9/9) covers eligibility filtering (excludes failed/refunded/on-hold-disputed, excludes already-paid bookings), gross/fee/net computation, and explicitly asserts the audit note never contains the word "automated." Unit-level against a fake DB double, not against the live migration's actual constraints (e.g. did not attempt a real duplicate-insert against `mentor_payout_line_items`' live `UNIQUE(booking_id)` to confirm the DB itself rejects it — the app-level test only proves the *query filter* excludes already-paid bookings). |
| (g) Moderation/admin tests pass | **NOT VERIFIABLE HERE.** No automated tests were written for `mentorMarketplaceAdmin.js`'s review-moderation or application-approval routes specifically (only their called library functions, e.g. `payouts.js`, are unit-tested). Route-level admin-gating (`requireAdmin` + flag check) was verified by code inspection only, not by an actual authenticated HTTP request in this sandbox. |
| (h) Production build passes | **FULLY VERIFIED.** `npx vite build --outDir dist_ws4_check --emptyOutDir` completed successfully, 858 modules transformed, no errors, no new warnings. |
| (i) A manual internal-only test booking is completed end-to-end | **NOT VERIFIABLE HERE.** Requires a deployed environment with a live Razorpay account, a real authenticated session, and an actual HTTP round trip through the deployed server — none of which exist in this sandbox. Not attempted, not claimed. |

**Conclusion: `mentor_marketplace_v1` must stay `false` in both frontend and backend until gates
(c), (g), and (i) get real (not stubbed/unit-level) verification in a live deployment, and until (a),
(b), (d), (e), (f) get integration-level (not just unit-level) verification against a real running
server + live DB connection.**

### What's explicitly NOT done in this pass (follow-up items)

- `mentorHub.js` is unmounted but **not deleted** — deletion is a follow-up cleanup commit, per
  instruction.
- No real Razorpay refund API call is issued anywhere (cancellation/dispute-resolution routes
  compute and record the refund amount but stop short of calling `razorpay().payments.refund()`)
  — no live Razorpay account in this sandbox to test against safely.
- No real Razorpay Route / automated payout integration — explicitly out of scope per the
  workstream's payout requirement; requires real account verification (Route capability + linked
  account KYC) before any future automation work.
- The reconciliation job's "live Razorpay order-status lookup" is a stub with a real, injectable
  interface (`checkRazorpayOrderStatus` parameter) — not wired to a real
  `razorpay().orders.fetch()`/`payments.fetch()` call.
- No frontend UI was built for any mentor marketplace surface in this pass (mirrors the
  `questionBankAdmin.js` precedent — internal/API-only, no nav-linked page yet). The
  `mentor_marketplace_v1` flag exists so a future UI pass can gate its rollout the same way.
- No true concurrent-connection database test of the `SELECT ... FOR UPDATE` row lock — see gate
  (b) above.
- No cron/scheduler was wired up to actually run `scripts/mentorReconciliation.mjs`
  periodically — running it is currently a manual/ops-triggered action (or a future admin API
  route calling the same `reconciliation.js` functions, which exist and are ready to be exposed
  that way).

## 5h. Workstream 4 — Mentor Marketplace: Release-Verification Pass (2026-07-24)

Test date: **2026-07-24**. This is a second, independent pass over the Workstream 4 work in §5g
above, specifically to upgrade as many of that section's "PARTIALLY VERIFIED" / "NOT VERIFIABLE
HERE" gates to real, DB-backed, or genuinely-concurrent evidence as this sandbox allows — and to be
completely honest about the gates that still can't be closed here. `mentor_marketplace_v1` was never
turned on in committed code; the flag defaults were flipped on only via a local, single-process env
var override for two specific local tests (described below), never persisted.

### Environment description and its specific limits

- **No network egress to `api.razorpay.com` or to `<project>.supabase.co` from this sandbox's
  bash/Node processes.** Confirmed directly: `curl` to both hosts returned `HTTP_CODE:000` (curl
  exit 56, connection failed) in this pass. This was already true in the prior pass; re-confirmed,
  not assumed.
- **`.env`'s `SUPABASE_SERVICE_KEY` is a placeholder** (`REPLACE_WITH_SERVICE_ROLE_KEY_FROM_...`),
  so even if network egress existed, a local Node script using `@supabase/supabase-js` against the
  real project would fail auth, independent of the network issue. The only path that reaches the
  real production database from this environment is the Supabase MCP tool (`execute_sql`,
  `get_advisors`, etc), which this pass used extensively.
- **`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` in `.env` are LIVE keys** (`rzp_live_...`), not Razorpay
  Test Mode keys — worth flagging explicitly: there is no sandbox/test Razorpay account configured
  for this project at all. Any future live-integration test must be done carefully against
  Razorpay's actual Test Mode (separate test API keys), not these live keys.
- **`RAZORPAY_WEBHOOK_SECRET` did not exist before this pass.** A value was generated externally and
  added to `.env` in this pass (`RAZORPAY_WEBHOOK_SECRET=...`, masked here). **This value has NOT
  been registered in the Razorpay dashboard's webhook configuration** — it is usable for local
  crypto/signature testing only until someone with dashboard access pastes the same value into
  Razorpay Dashboard → Settings → Webhooks for the relevant webhook URL. Until that happens, no real
  Razorpay-originated webhook delivery will verify against it, regardless of how correct the code is.

### What was actually tested and how

**1. Razorpay signature-verification crypto (real secrets, no live API calls):**
- Computed a real HMAC-SHA256 of a synthetic `order_id|payment_id` string using the actual
  `RAZORPAY_KEY_SECRET` read from `.env`, and confirmed the exact verification expression used in
  `backend/server/routes/payments.js` (lines 65-66) accepts the correctly-signed value and rejects a
  tampered signature, a tampered `payment_id`, and a wrong secret. 4/4 assertions passed.
- Imported the REAL `verifyWebhookSignature()` function from
  `backend/server/lib/mentorMarketplace/webhook.js` (not a reimplementation) and ran it against a
  synthetic Razorpay-shaped `payment.captured` payload, HMAC-signed with the real
  `RAZORPAY_WEBHOOK_SECRET`. Confirmed: correct signature accepted; tampered body rejected; tampered
  signature rejected; wrong secret rejected; missing signature header rejected; missing secret
  rejected. 6/6 assertions passed.
- **This proves the crypto is correct against the real secrets** — it does NOT prove a live
  Razorpay checkout or webhook delivery has ever succeeded end-to-end. No live order was created, no
  live payment was captured, no live webhook was delivered. Not attempted (would require live network
  egress, which does not exist here).

**2. Local backend + flag-off rollback rehearsal (real HTTP round trip):**
- Started the actual `backend/server.js` locally (`node backend/server.js`, matching the
  `npm start` script) with no `MENTOR_MARKETPLACE_V1` env var set (i.e., the real default/off
  state), and issued real `curl` requests against the running server.
- `GET /api/pro/v1/mentor/mentors` (no auth) → `401 {"error":"Unauthorized"}`.
  `GET /api/admin/mentor/applications` (no auth) → `401 {"error":"Unauthorized"}`.
  `POST /api/pro/v1/mentor/webhook/razorpay` → `404` (this route's own flag check runs before
  anything else and is not affected by the finding below, since it doesn't sit behind the same
  router chain).
- **The end-user-visible result (mentor routes are unreachable while the flag is off) is correct.**
  However, tracing this with a temporary `console.log` inside `mentorMarketplace.js`'s `requireFlag`
  middleware (added, verified, then reverted before finishing this pass — not a committed change)
  showed **the flag check itself never executes** for these requests. The 401 is coming from a
  different, pre-existing, unrelated router — see the critical finding below. Re-tested the SAME
  router in isolation (a minimal Express app mounting only `mentorMarketplace.js`'s router, nothing
  else from `server.js`) and confirmed `requireFlag` correctly returns `403 {"error":"mentor_marketplace_v1 is disabled"}` when isolated from the rest of the app. The flag logic itself is correct; it is being shadowed in the full app by the bug below.

**3. Concurrent booking race — genuinely concurrent, via two simultaneous Supabase MCP calls:**
- Seeded one test mentor profile + one fresh availability slot via `execute_sql` (test data prefixed
  `ZZTEST_WS4V`, all four synthetic identities backed by real `auth.users` + `profiles` rows since
  `mentor_profiles.user_id` has a live FK to `profiles`, which itself FKs to `auth.users`).
- Issued **two separate `execute_sql` tool calls in the same message** — two genuinely distinct
  database sessions — each calling `mentor_reserve_slot(...)` (the real, applied, `SECURITY DEFINER`
  RPC) against the SAME slot, for two different mentee identities.
- Result: one call succeeded (`{"success":true,"booking_id":"..."}`), the other failed cleanly with
  `{"error":"slot_no_longer_available","success":false}`. A follow-up `SELECT count(*) FROM
  mentor_bookings WHERE slot_id = ...` confirmed exactly **one** booking row was created, not two.
  **This is real evidence of the row-lock/status-check working under concurrent access**, upgrading
  §5g gate (b) from "unit-tested against fake doubles only" — though note two MCP tool calls in one
  message are not proven to land in the exact same PostgreSQL instant the way two raw concurrent
  `psql` connections holding a `BEGIN` open would; this is the closest approximation achievable with
  the tools available in this sandbox, not a formal transaction-isolation stress test.
- Expired-reservation release: set a slot's `reservation_expires_at` into the past, confirmed the
  exact SQL predicate `reconciliation.js`'s `releaseStaleReservations` uses
  (`slot_status='reserved' AND reservation_expires_at < now()`) correctly selects it, then called the
  real `mentor_release_booking` RPC (the same one the sweep calls) and confirmed the booking flipped
  to `failed` and the slot flipped to `available`.
- Idempotency: confirmed the real `mentor_idempotency_keys` table has a live
  `UNIQUE(idempotency_key, endpoint, user_id)` constraint (`uq_mentor_idem_key`) by inserting the same
  triple twice and getting a genuine `23505 duplicate key` Postgres error on the second attempt —
  this is the actual DB-level guarantee the app-level `idempotency.js` logic (already 8/8
  unit-tested against fake doubles in §5g) depends on, now confirmed to exist for real.
- All test rows (2 slots, 5 bookings across tests, 1 payout + line item, 1 review, 4 synthetic
  `auth.users`/`profiles` identities, `mentor_idempotency_keys` rows, `mentor_audit_log` rows,
  1 dispute) were deleted at the end of this pass; a final count query across every affected table
  confirmed **zero residual rows** and the temporary tracking table
  (`zztest_ws4v_ids`) was dropped.

**4. RLS and authorization — real `SET ROLE` + `request.jwt.claim.sub` simulation, per Supabase's
own documented RLS-testing pattern (`auth.uid()` reads `current_setting('request.jwt.claim.sub')`,
confirmed by reading `auth.uid()`'s actual function body via `execute_sql`):**
- `mentor_profiles`: an inactive/suspended test profile was visible to its owner (1 row) and to an
  admin context (1 row), and invisible to a non-owner authenticated user (0 rows) and to `anon`
  (0 rows) — all four contexts behaved exactly as the policy defines.
- `mentor_bookings`: a `completed` test booking was visible to the mentee party (1 row) and to admin
  (1 row), invisible to a non-party authenticated user (0 rows) and to `anon` (0 rows).
- **Direct client-side `INSERT` into `mentor_bookings` as `authenticated` (non-admin) was attempted
  and correctly REJECTED**: `ERROR: 42501: new row violates row-level security policy for table
  "mentor_bookings"`. This closes the specific residual-risk item §5g flagged ("did not attempt a
  real duplicate-insert... to confirm the DB itself rejects it") for the INSERT path specifically.
- SECURITY DEFINER function lockdown re-verified two ways: (a) `information_schema.routine_privileges`
  shows `mentor_reserve_slot`/`mentor_confirm_booking`/`mentor_release_booking` grants EXECUTE only to
  `postgres`/`service_role`, and (b) actually attempting `SELECT mentor_reserve_slot(...)` as both
  `authenticated` and `anon` roles returned `ERROR: 42501: permission denied for function
  mentor_reserve_slot` in both cases — a real rejection, not just a grants-table read.
- Payout-eligibility exclusion logic was replicated as a literal SQL query mirroring
  `payouts.js`'s `findEligibleBookings()` and run against 5 real seeded bookings in different
  states (`refunded`, `disputed`, `completed`-with-an-open-dispute ["on hold"], `completed`-clean,
  `failed`) — exactly and only the clean `completed` booking was eligible, matching the policy
  precisely.
- `mentor_payout_line_items.booking_id`'s live `UNIQUE(booking_id)` constraint
  (`uq_mentor_payout_booking`) was confirmed by attempting a duplicate insert for an
  already-paid-out booking — rejected with a real `23505` error. This closes the other specific
  residual-risk item §5g flagged for the payout table.
- Review moderation: a `pending` review was confirmed invisible under the exact
  `moderation_status='approved'` filter the public route uses, then flipped to `approved` and
  confirmed visible. (The reviewer-display-name transform itself has a real bug — see critical
  finding #2 below — so the "first-name + last-initial only" behavior could not be exercised
  end-to-end through the actual route; the moderation-status gating itself, which is independent of
  that bug, was confirmed directly against the table.)

- **Table-level grants finding (defense-in-depth gap, not exploitable given current RLS
  policies):** `information_schema.role_table_grants` shows `anon` and `authenticated` both hold raw
  `INSERT`/`UPDATE`/`DELETE` table-level privileges on `mentor_bookings` and `mentor_payments` —
  almost certainly inherited from Supabase's project-template default privileges (the same root
  cause already identified and partially fixed in §5g for the three RPC functions), never explicitly
  revoked for these two tables specifically. **This is not currently exploitable**: `pg_policies`
  confirms neither table has ANY `INSERT`/`UPDATE`/`DELETE` policy defined for any role, and RLS
  defaults to deny when enabled with no matching permissive policy — confirmed empirically above (the
  direct INSERT attempt was rejected). But it is one extra permissive policy away (added by a future
  developer who doesn't realize the underlying grant already exists) from becoming exploitable, and
  it is inconsistent with the "explicitly revoke unwanted default privileges" pattern the same
  workstream already applied to the RPC functions. **Recommended, not yet applied** (out of scope for
  this verification-only pass): `REVOKE INSERT, UPDATE, DELETE ON mentor_bookings, mentor_payments
  FROM anon, authenticated;`

### Critical findings (new in this pass)

**Finding 1 — pre-existing routing bug, NOT specific to mentor marketplace, affects several other
live route families.** `backend/server/routes/questionBankAdmin.js` line 42 registers
`router.use(requireAuth, requireAdmin)` with no path scoping, and this router is mounted at the bare
prefix `app.use("/api", questionBankAdminRoutes)` in `server.js` (line ~320). Because Express tries
mounted middleware in registration order regardless of path specificity, this unconditional
`requireAuth`/`requireAdmin` gate intercepts and terminates (401 if unauthenticated, 403 if
authenticated-but-not-admin) EVERY request to ANY `/api/*` path mounted AFTER this line in
`server.js` — including `forgeRoutes`, `aiInterviewRoutes`, `recruiterCommsRoutes`,
`mentorMarketplaceRoutes`, `mentorMarketplaceAdminRoutes`, `pulseNexusRoutes`, `orbitPlansRoutes`,
and `hardwareChallengesRoutes` — before those routers' OWN auth/flag logic ever runs, for any caller
who isn't a real admin. **Proven, not inferred:** a temporary debug log placed inside
`mentorMarketplace.js`'s own `requireFlag` middleware never fired for a request to
`/api/pro/v1/mentor/mentors`, while the same router mounted in isolation (no other `server.js`
routes present) handled the identical request correctly. Practical impact: **any logged-in,
non-admin user hitting `/api/pro/forge`, `/api/pulse/feed`, or any other route in the affected list
right now in production gets an incorrect `403 {"error":"Admin access required"}`** instead of that
route's actual intended behavior — this is unrelated to the mentor marketplace flag (which stays off
regardless) but is a real, currently-live bug affecting other shipped features. **Not fixed in this
pass** — out of this workstream's scope, and fixing routing order across several unrelated live
features carries its own regression risk that deserves its own dedicated, tested change, not a
drive-by edit during a mentor-marketplace verification pass. Recommended fix: either scope
`questionBankAdmin.js`'s `router.use()` to a specific path (e.g.
`router.use('/admin/question-bank', requireAuth, requireAdmin)`), or mount the whole router at the
more specific `/api/admin/question-bank` prefix instead of bare `/api` in `server.js`. **This should
be treated as a P0 fix independent of and prior to any further mentor-marketplace rollout work**,
since it currently degrades other already-shipped functionality for real users.

**Finding 2 — real bug in the mentor marketplace's own code, would 500 in production the first time
any mentor has an approved review.** `backend/server/routes/mentorMarketplace.js` line 269
(`GET /mentors/:mentorId/reviews`) runs `supabaseAdmin.from("profiles").select("id, full_name")` —
but `profiles` has no `full_name` column (confirmed directly: `SELECT full_name FROM profiles`
returns `ERROR: 42703: column "full_name" does not exist`; the real columns are `display_name` and
`name`). This endpoint is currently unreachable in production only because
`mentor_marketplace_v1` is off — but it will 500 for every request the moment the flag is flipped on
and at least one approved review exists. **Not fixed in this pass** (verification-only scope,
zero live impact today), but this is a release-blocking bug: fix `full_name` → `display_name` (or
whichever field the product intends to display) before ever enabling the flag anywhere real users
can reach it.

### Updated 9-gate table (supersedes §5g's table where a row differs)

| Gate | §5g status | Updated status (this pass) | What changed |
|---|---|---|---|
| (a) Migrations/RLS tests | Partially verified (schema+linter only) | **Upgraded — real `SET ROLE` simulation across owner/non-owner/anon/admin on `mentor_profiles` and `mentor_bookings`, plus a real rejected client INSERT.** Still not exhaustive across all 13 tables' every policy branch — extending the same pattern to the remaining 11 tables is straightforward but wasn't fully exhausted here for time. | Real session-simulated RLS tests, not just `pg_tables`/advisor output. |
| (b) Concurrency/idempotency | Partially verified (fake-double unit tests only) | **Upgraded — two genuinely separate DB sessions raced the real `mentor_reserve_slot` RPC; one won, one got a clean conflict, no double-booking committed. Real `UNIQUE` constraint on `mentor_idempotency_keys` confirmed via an actual duplicate-key rejection.** Still not a formal Postgres transaction-isolation stress test (see caveat above). | Real concurrent DB calls, not mocked. |
| (c) Webhook signature verification | Partially verified (fake test secret) | **Upgraded — the real `verifyWebhookSignature()` function tested against the actual `RAZORPAY_WEBHOOK_SECRET` now in `.env`.** Still NOT a live Razorpay Test Mode delivery — no live account exists, network egress doesn't exist here either. | Real function, real secret, still no live delivery. |
| (d) Reconciliation missed-webhook | Partially verified (mocked order-status check) | **Unchanged — still a documented stub.** Stale-reservation release (a different sweep in the same file) was verified against a real DB state transition in this pass. | No change to the specifically-stubbed part. |
| (e) Refund/no-show/dispute | Partially verified (pure-function units only) | **Unchanged for the policy math itself (already well-tested); newly confirmed the actual Razorpay refund API is never called anywhere in the codebase** — this was previously stated in prose but is now the explicit, verified, headline residual risk (see runbook §3). | Confirms a real gap, doesn't close it. |
| (f) Payout batch | Partially verified (fake DB double) | **Upgraded — real seeded bookings in 5 different states, real SQL replicating the exact exclusion logic, real `UNIQUE(booking_id)` constraint violation confirmed on a duplicate insert attempt, real `mentor_audit_log` row confirmed written for a batch-creation action.** | Real data, real constraint, real audit trail. |
| (g) Moderation/admin | Not verifiable here | **Partially upgraded — review moderation's `moderation_status` gating confirmed against real seeded/approved rows. Admin route auth-gating still not exercised via a real authenticated HTTP request (no real admin JWT available in this sandbox). A real bug was found in the review-listing route's name-formatting logic (Finding 2 above) that unit tests would not have caught since they mock the DB.** | Real DB-level moderation test; still no live admin HTTP round trip; found a real bug. |
| (h) Production build | Fully verified (§5g) | Unchanged — not re-run in this pass (no source changes were made to committed code). | — |
| (i) Manual E2E test booking | Not verifiable here | **Unchanged — still not verifiable here.** No live Razorpay account, no live network egress, no real user session. | — |

### Observability and alerting (no infrastructure exists yet — thresholds to configure once it does)

Checked first, not assumed: grepped the whole codebase for Sentry, Datadog, New Relic, or any APM
SDK (`package.json` dependencies + `backend/`, `frontend/src`) — **none exist**. The only logging
anywhere is `console.error`/`console.warn` to stdout, which on Render becomes plain log lines with no
alerting, aggregation, or threshold-based paging. This is true for the whole app, not just mentor
marketplace. Until a real monitoring system is chosen and wired in, the specific thresholds below are
a spec to implement against, not live alerts:

- **Webhook signature failures:** alert if `mentor_payment_webhook_events` gets more than 5 rows with
  `signature_valid = false` from the same source IP (would need IP capture added to that table —
  currently not stored) within a 10-minute window. Query shape once storage exists:
  `SELECT count(*) FROM mentor_payment_webhook_events WHERE signature_valid=false AND created_at > now() - interval '10 minutes'`.
  Even without IP-level granularity, alert if this simple count-only version exceeds 5 in 10 minutes
  — a real Razorpay account does not send invalid signatures; a nonzero, growing count indicates
  either a misconfigured `RAZORPAY_WEBHOOK_SECRET` or an active probing attempt.
- **Reconciliation mismatches:** alert if `scripts/mentorReconciliation.mjs`'s sweep 2 (missed-webhook
  recovery) reports ANY booking `flaggedForAdminReview` — threshold is `> 0`, not a tolerance band,
  since this specifically means "a payment may have been captured with no webhook ever received" and
  needs a human to check the Razorpay dashboard. Also alert if any `pending_payment` booking is found
  older than 1 hour with no matching `mentor_payment_webhook_events` row at all (a stronger signal
  than the reservation-expiry sweep alone, since that sweep only checks `reservation_expires_at`,
  which is 15 minutes — a booking survivor past 1 hour with zero webhook activity is a different,
  worse signal than a normal expired hold).
- **Payout failures:** alert if a `mentor_payouts` row sits in `finalized` status for more than 7 days
  without transitioning to `paid` (the manual-transfer step was likely forgotten) — query:
  `SELECT count(*) FROM mentor_payouts WHERE status='finalized' AND finalized_at < now() - interval '7 days'`,
  threshold `> 0`.
- **RLS violation attempts:** Postgres logs a `42501` (`insufficient_privilege`) error for every
  rejected RLS-blocked write or `permission denied for function` call on the locked-down RPCs — these
  surface in Supabase's project logs (`get_logs` via the MCP tool, or the dashboard's Postgres Logs
  tab) today, without any app-level code change needed. Alert if more than 10 such errors occur from
  requests attributable to the same `auth.uid()`/API key within 5 minutes — that volume is
  inconsistent with a client bug and consistent with active probing. This requires configuring a log-
  based alert in Supabase or forwarding those logs to whatever monitoring system gets adopted; no
  application code needs to change to make this data available, since Postgres already logs these
  errors on every occurrence.

### Known residual risks (explicit, specific)

1. **No live Razorpay round-trip has ever been tested against this code** — not order creation, not
   checkout completion, not webhook delivery, not a refund. Every test in both this pass and §5g that
   touches Razorpay is either a pure-crypto unit test against real secrets, or a fake/mocked
   integration. This is the single largest gap before real users can be exposed to this feature.
2. **The refund EXECUTION path does not exist** — only refund policy CALCULATION exists
   (`refundPolicy.js`). No `razorpay().payments.refund()` call is made anywhere. Every refund today
   would need the manual procedure in the operator runbook §3.
3. **Finding 1 (questionBankAdmin routing bug)** is live in production right now, affecting several
   already-shipped, non-mentor-marketplace features for non-admin authenticated users. Independent of
   the mentor marketplace flag, and should be prioritized as its own fix.
4. **Finding 2 (`profiles.full_name` bug in the review-listing route)** will 500 immediately upon
   flag-on if any mentor has an approved review. Zero live impact today only because the flag is off.
5. **Defense-in-depth grants gap** on `mentor_bookings`/`mentor_payments` (`anon`/`authenticated` hold
   raw table INSERT/UPDATE/DELETE grants that RLS currently blocks with no permissive policy) — not
   exploitable today, but should be explicitly revoked to match the same hardening already applied to
   the RPC functions.
6. **`RAZORPAY_WEBHOOK_SECRET` is not yet registered in the Razorpay dashboard** — even once code
   gates are cleared, no real webhook will verify until this is done outside this codebase.
7. **No admin exists in production today** (`SELECT * FROM profiles WHERE is_admin=true` returned zero
   rows before this pass's synthetic test admin, which was deleted afterward) — meaning even the
   already-built admin routes (`mentorMarketplaceAdmin.js`, `questionBankAdmin.js`) have no real
   operator who could currently use them. This blocks any real end-to-end admin-path testing until a
   real `profiles.is_admin=true` row exists for whoever will operate this.
8. Only three real user accounts exist in this Supabase project at all — this is a very early-stage
   production database, not a populated one. Load/scale behavior of any of this (RLS policy
   performance, concurrent-booking behavior under real traffic) is untested and untestable here.

### Go/No-Go recommendation

**NO-GO for any user-facing (even internal-only) exposure of `mentor_marketplace_v1` yet.**

Blocking items, in priority order:
1. Fix Finding 2 (`full_name` → real column name) — trivial, but would 500 in production the moment
   the flag goes on and a review is approved.
2. Fix or explicitly accept Finding 1 (questionBankAdmin routing bug) — recommended to fix regardless
   of mentor marketplace timing, since it affects other live features today.
3. Get a real Razorpay Test Mode account and run at least one genuine order-create → checkout →
   webhook-delivery → confirm round trip in a real (non-sandboxed) environment. Nothing in either
   verification pass substitutes for this.
4. Decide and implement the refund-execution path (real API call vs. permanently-manual procedure) —
   currently a completely manual runbook step; acceptable as a stated V1 limitation ONLY if that's a
   deliberate product decision, not an oversight.
5. Register `RAZORPAY_WEBHOOK_SECRET` in the Razorpair dashboard once ready for real testing.
6. Create at least one real `profiles.is_admin=true` operator account before any admin-path testing
   or real operational use.
7. Close the `mentor_bookings`/`mentor_payments` grants gap (low effort, defense-in-depth only, not
   blocking on its own).

None of items 1–6 are large — this is a short, concrete punch list, not a re-architecture. Once
cleared, the next verification pass should focus specifically on a real Razorpay Test Mode round
trip and a real authenticated-admin HTTP session, the two categories of evidence no sandbox pass can
produce.

## 5i-addendum. Flagged follow-up (not fixed, documented per scope-reset 2026-07-24)

`backend/server/routes/mentorMarketplaceAdmin.js` has the same unscoped `router.use()`-at-bare-`/api`
pattern that caused the `questionBankAdmin.js` shadowing bug fixed in §5i below, and is theoretically
capable of shadowing `pulseNexusRoutes`, `orbitPlansRoutes`, and `hardwareChallengesRoutes` the same
way. **Not fixed in this pass** — per the 2026-07-24 scope-reset instruction, bugs isolated to a
flagged, unreleased module (mentor marketplace sits behind `mentor_marketplace_v1`, default off, not
the active workstream) are documented and deferred rather than pulled into active work. Fix this
alongside the rest of the mentor-marketplace release-verification punch list (§5h) whenever that
workstream is reactivated, using the exact same `/api/admin/...`-namespace pattern established in §5i.

## 5i. Hotfix (2026-07-24): Finding 1 (questionBankAdmin routing bug) — fixed

Closes item 2 of §5h's Go/No-Go punch list and the P0 flagged in §5h's Finding 1. This is a
backend-routing-only change — no DB migration, no business-logic change, no mentor-marketplace
business-logic change.

### Root cause (restated precisely)

`backend/server/routes/questionBankAdmin.js` declared `router.use(requireAuth, requireAdmin)` with
no path argument, and `backend/server.js` mounted that router at the bare prefix `"/api"`
(`app.use("/api", questionBankAdminRoutes)`, line ~320, pre-fix). A `router.use()` call with no path
matches every request Express hands to that router — so mounting the whole router at bare `"/api"`
meant Express handed it every request under `/api`, not only ones actually destined for an
`/admin/question-bank/...` route. Since Express evaluates mounted middleware in registration order
regardless of path specificity, this unconditional admin gate intercepted and terminated (401
unauthenticated / 403 non-admin) requests for every route family mounted after it in `server.js` —
`forgeRoutes`, `aiInterviewRoutes`, `recruiterCommsRoutes`, `mentorMarketplaceRoutes`,
`mentorMarketplaceAdminRoutes`, `pulseNexusRoutes`, `orbitPlansRoutes`, `hardwareChallengesRoutes` —
before those routers' own auth/flag logic ever ran, for any caller who wasn't a real admin. This was
proven (not inferred) in the §5h pass via a temporary debug log in `mentorMarketplace.js`'s own
`requireFlag` middleware, which never fired for a request to `/api/pro/v1/mentor/mentors` while the
router mounted in isolation handled the identical request correctly; that debug log was added and
reverted, not left in place.

### The fix (exact diff description)

1. **`backend/server/routes/questionBankAdmin.js`** — every internal route path had its
   `/admin/question-bank` prefix stripped, since that prefix now lives in the mount point instead:
   `router.get("/admin/question-bank", ...)` → `router.get("/", ...)`,
   `router.get("/admin/question-bank/coverage", ...)` → `router.get("/coverage", ...)`,
   `router.get("/admin/question-bank/reports", ...)` → `router.get("/reports", ...)`,
   `router.post("/admin/question-bank/reports/:id/resolve", ...)` → `router.post("/reports/:id/resolve", ...)`,
   `router.get("/admin/question-bank/:id", ...)` → `router.get("/:id", ...)`,
   `router.post("/admin/question-bank", ...)` → `router.post("/", ...)`,
   `router.put("/admin/question-bank/:id", ...)` → `router.put("/:id", ...)`,
   and the same prefix-strip for `/:id/validate`, `/:id/submit-for-review`, `/:id/approve`,
   `/:id/reject`, `/:id/retire`. `router.use(requireAuth, requireAdmin)` itself is unchanged — the
   admin gate still runs, unconditionally, for every route in this file; only the router's mount
   point changed, not its protection. Added a dated header comment explaining the fix and root cause
   for future readers of this file.
2. **`backend/server.js`** — old mount: `app.use("/api", questionBankAdminRoutes)` (line ~320).
   New mount: `app.use("/api/admin/question-bank", questionBankAdminRoutes)`. Added an inline comment
   at the mount site pointing back to this section and to the file-header writeup.
3. **External URLs are unchanged.** `GET /api/admin/question-bank`, `GET
   /api/admin/question-bank/coverage`, `POST /api/admin/question-bank/:id/approve`, etc. all resolve
   to the exact same paths as before — only the internal split between "mount prefix" and "route
   path" changed. No API consumer (internal admin tool/script) needs any change.
4. **Why this eliminates the collision risk regardless of mount order** (per the task's requirement
   to double-check this, not just move the bug): Express only ever routes a request into a
   sub-router if the request path starts with that router's mount prefix. Because the mount prefix is
   now `/api/admin/question-bank` instead of bare `/api`, Express will never hand this router a
   request for `/api/jobs`, `/api/pro/v1/mentor/mentors`, `/api/pulse/feed`, etc. — the match-all
   `requireAuth`/`requireAdmin` middleware inside this router literally never executes for those
   paths anymore, independent of where this `app.use()` line sits relative to the others.

### Other routes checked for the same ambiguity (not modified)

Audited every other bare-`"/api"` mount in `server.js` for the identical "router-level `.use()` with
no path" pattern that caused Finding 1. `backend/server/routes/mentorMarketplaceAdmin.js` has the
same shape (`router.use(requireFlag, requireAuth, requireAdmin)` with no path, mounted at bare
`"/api"`) and mount order in `server.js` puts `pulseNexusRoutes`, `orbitPlansRoutes`, and
`hardwareChallengesRoutes` after it — meaning that router is theoretically capable of causing the
same class of shadowing bug for those three route families today. This is a distinct, pre-existing
issue in mentor-marketplace admin code, not questionBankAdmin, and per this hotfix's explicit
constraint (no mentor-marketplace business-logic or file changes beyond verifying/testing against
them), it was **not** fixed in this pass. Flagging it here as a known follow-up: the same fix pattern
(dedicated `/api/admin/mentor` mount instead of bare `/api`) would close it, but that edit touches
`mentorMarketplaceAdmin.js` and/or its mount line, which is out of scope for this hotfix. All other
route modules mounted at bare `"/api"` (`resumeRoutes`, `assessmentRoutes`, `jobRoutes`,
`paymentRoutes`, `skillGapRoutes`, `professionalProfileRoutes`, `careerTimelineRoutes`,
`skillGraphRoutes`, `weeklyPulseRoutes`, `homeV1Routes`, `careerEventsV1Routes`,
`skillPulseV2Routes`, `forgeRoutes`, `aiInterviewRoutes`, `recruiterCommsRoutes`, `pulseNexusRoutes`,
`orbitPlansRoutes`, `hardwareChallengesRoutes`) apply auth (if any) at the individual route level,
not via a router-wide `.use()` with no path, so none of them can shadow a sibling route the way
`questionBankAdmin.js` did.

### Regression tests added

New file: `backend/server/routes/__tests__/questionBankAdminRouting.test.js` (`node:test` convention,
run via `node --test`, matching the pattern in `backend/server/lib/skillPulseV2/*.test.js` and
`backend/server/lib/mentorMarketplace/*.test.js`). Builds a real Express app importing the actual,
unmodified `questionBankAdmin.js`, `recruiterComms.js`, and `mentorMarketplace.js` route modules,
mounted the same way `server.js` mounts them post-fix, and drives it with real HTTP requests via
Node's built-in `fetch` against an ephemeral-port `http` server (`supertest` is not a project
dependency — confirmed via `node_modules`/`package.json` — so no new dependency was added).
`requireAuth`'s local-JWT fast path is exercised for real (a locally-signed HS256 token against a
test-only `SUPABASE_JWT_SECRET`, no network call, no mock of `requireAuth` itself); `requireAdmin`'s
single `profiles.is_admin` lookup uses the existing `__ARENA_V2_TEST_SUPABASE_CLIENT__` test-only
hook already defined in `backend/server/lib/supabase.js` (the same mechanism the arena-v2 e2e suite
uses), backed here by a small in-memory fake rather than the full pglite/Postgres harness, since
these tests only need one `profiles.is_admin` lookup, not general relational behavior. Test names:

- `non-admin authenticated user is NOT shadowed by questionBankAdmin's gate on an unrelated route (POST /api/jobs)`
- `unauthenticated user still gets 401 on a route that requires auth (POST /api/jobs) — unchanged by the fix`
- `admin user can still reach question-bank admin routes under the new /api/admin/question-bank path`
- `non-admin authenticated user is correctly blocked (403) from the admin question-bank routes themselves`
- `unauthenticated request to the old bare-/api mount path no longer resolves to questionBankAdmin (no route there anymore)`
- `mentor marketplace user-facing routes (/api/pro/v1/mentor/*) are not intercepted by questionBankAdmin's gate`

The mentor-marketplace test above sets `process.env.MENTOR_MARKETPLACE_V1 = "true"` only inside this
test process (in a `before()` hook, unset in `after()`) so `mentorMarketplace.js`'s own `requireFlag`
gate doesn't itself 403 the request before the shadowing question can even be asked. This does not
touch `frontend/src/config/featureFlags.js`'s `mentor_marketplace_v1: envFlag("MENTOR_MARKETPLACE_V1",
false)` default or any backend default — both remain `false` after this pass, confirmed by grepping
both files and the project's `.env`/`.env.local` (neither sets `MENTOR_MARKETPLACE_V1`) after the
test run completed. No file under `backend/server/lib/mentorMarketplace/` or the
`mentorMarketplace*.js` route files themselves was modified — only imported and exercised read-only
by the new test.

### Full test-suite results

`node --test $(find backend -name "*.test.js")` — **387 tests, 387 pass, 0 fail, 0 cancelled, 0
skipped**, across 19 suites (all pre-existing arena-v2, skillPulseV2, mentorMarketplace, and
careerEventSync/homePriority suites, plus the 6 new tests above). No pre-existing test regressed.

### Build verification

`npx vite build --outDir dist_ws4_hotfix_check --emptyOutDir` — succeeded, 858 modules transformed,
`✓ built in 11.91s`. Only pre-existing warnings (a dynamic/static dual-import notice for
`frontend/src/lib/api.js` and a chunk-size-over-600kB notice for `Arena-*.js`, `Aura-*.js`,
`index-*.js`) — both predate this change and are unrelated to routing. The real `dist/` folder was
never touched; `dist_ws4_hotfix_check` was removed after the check and added to `.gitignore`
alongside the existing `dist_ws0_check`/`dist_ws1_check`/.../`dist_ws4_check` entries from prior
workstreams, in case a future sandbox run can't clean it up (the documented recurring sandbox quirk).

### mentor_marketplace_v1 flag confirmation

Unchanged, still `false` by default in both places:
- Backend: `backend/server/routes/mentorMarketplace.js` —
  `MENTOR_MARKETPLACE_V1_ENABLED = process.env.MENTOR_MARKETPLACE_V1 === "true" || process.env.VITE_FF_MENTOR_MARKETPLACE_V1 === "true"`,
  neither env var set in `.env`/`.env.local`.
- Frontend: `frontend/src/config/featureFlags.js` — `mentor_marketplace_v1: envFlag("MENTOR_MARKETPLACE_V1", false)`.

Only a process-scoped env var override (`process.env.MENTOR_MARKETPLACE_V1 = "true"`, set and unset
inside the new test file's `before`/`after` hooks) was used to exercise one test case; no committed
default changed.
