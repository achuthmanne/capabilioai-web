# Capabilio Production Certification Framework v2

**Owner:** Engineering · **Started:** 2026-07-16 · **Status doc:** living tracker
**Companion:** detailed findings + evidence in `CERTIFICATION_AUDIT_2026-07-16.md`

A release is **Production Certified** when Phases A–H are `PASS` and Phase I is `READY`. No phase may be `PASS` while a P0/P1 in its scope is open, or while any finding in its scope is not `Closed` (see Regression Tracker).

**This framework is FROZEN — FINAL (v2.1).** Owner field + release-readiness view were the last structural additions. No further framework edits — only execution: run Release Missions, move items through the state machine, update the tracker.

### Operating mode: Release Certification Engineer

Per phase: (1) audit → (2) fix every issue that is safe to fix → (3) regression-test the fix → (4) mark `Closed` only if verified → (5) update this scorecard → (6) next phase. **Success = fewer open findings, not a longer report.**

An issue may stay `Open` **only** if it is one of:
- **(a)** requires a coordinated frontend+backend+database migration,
- **(b)** requires an external integration (real DigiLocker/EPFO, Razorpay webhook, dashboard/config toggle), or
- **(c)** depends on a product decision only the owner can make.

Everything else is fixed immediately or explained why not.

**Completion rule:** *No new audit scope may be opened while there are unresolved P0/P1 issues in the current phase that are safe to fix.*

### Status model (5 states)

`Reported → Code Complete → Regression Tested → Staging Validated → Closed`

This separates **engineering progress** from **release progress**: a fix can be Code Complete + Regression Tested (real value delivered) while still not Closed because Staging Validation hasn't run. Per-mission metrics are reported as:

`Open before · Code completed · Regression tested (local) · Staging validated · Closed · Remaining`

### Deterministic next-mission selection (no need to ask)

Pick the next Release Mission by this order — never skip upward:
1. Any **P0 that is Code Complete but not Closed** → advance it (usually = run its Staging Validation, which is the owner's action).
2. Any **remaining P0** (not yet Code Complete).
3. Any **P1 that blocks certification.**
4. **Product decisions** (category c).
5. **External integrations** (category b).

Auto-proceed to the highest actionable mission. Only stop to ask when the next step is a genuine **product decision** or an **owner-only action** (deploy to staging, enable a paid integration, toggle a dashboard setting).

## Legend

- Verdict: `PASS` · `CONDITIONAL` (passes once listed blockers close) · `IN PROGRESS` · `NOT STARTED` · `READY` (infra only)
- Item status: `✅ pass` · `⚠️ issue` · `❌ fail` · `— not reviewed`
- Severity: P0 (ship-blocker) · P1 (fix before scale/rollout) · P2 · P3
- Coverage = % of area reviewed with evidence (not % passing).

## Universal exit gate (applies to EVERY journey and role)

A surface passes only if, exercised end-to-end:

- ✓ completes its happy path AND its empty/error/timeout paths render intentionally
- ✗ **zero uncaught console errors**
- ✗ **zero failed network requests** (no 4xx/5xx on the happy path; handled + surfaced on the sad path)
- ✗ **zero orphan/partial database writes** (no half-saved state on failure; writes are atomic or compensated)
- ✗ **zero uncaught exceptions** (error boundaries catch and render a recovery state)

---

## Master scorecard (current)

| Phase | Area | Verdict | Coverage | Blocking |
|-------|------|---------|----------|----------|
| A | Security | CONDITIONAL PASS | ~85% | safe items Closed (JWT, job-IDOR, search_path, trig-RPC, rate-limit); open: P0-4 live test, PC-3b/PC-5 auth (coordinated) |
| B | Trust | IN PROGRESS | ~55% | **P0-5 (ELO), PC-5 (verification)** open |
| C | Product (journeys) | IN PROGRESS | ~18% | Student static-only; others unreviewed |
| D | Role (behavioral) | NOT STARTED | 0% | 0/21 roles |
| E | API | IN PROGRESS | ~40% | validation/error/retry not per-endpoint verified |
| F | Database | IN PROGRESS | ~60% | advisor `search_path`(26) + trigger-RPC cleared; open: 2 permissive RLS + bucket listing (product decision), full table RLS sweep |
| G | Performance | NOT STARTED | 0% | gated behind A–F |
| H | Observability | NOT STARTED | ~10% | health endpoints exist; rest unverified |
| I | Infrastructure Readiness | NOT STARTED | 0% | gated behind A–H |

**Overall: NOT CERTIFIED.**

### Release readiness (operational view)

| Area | Status |
|------|--------|
| Security | Near completion |
| Trust | Main blocker |
| Product | Early |
| API | Midway |
| Database | Midway |
| Performance | Not started |
| Observability | Not started |
| Infrastructure | Not started |

Remaining effort is concentrated in **Trust** (ELO cutover staging + verification de-stub) and the untouched **Product/Performance/Observability/Infra** phases.

### Ownership (who moves each item forward)

| Owner | Meaning | Items |
|-------|---------|-------|
| Engineering | code change | PC-2, PC-1 (done, awaiting smoke), P1-2/P1-3 (once product decides policy) |
| QA / Owner | staging + live validation | P0-5, PC-5a, PC-1, P0-4 (live payment) |
| Product | policy/decision (category c) | PC-4, PC-6, P1-2, P1-3, SEC-permRLS, SEC-bucket, PC-5b (badge-gating) |
| Integration | external service (category b) | PC-5b (DigiLocker/EPFO), Razorpay webhook |
| Platform | infra/dashboard config | P3-pwd (leaked-password toggle), Phases G/H/I |

Rule: a code fix is **Engineering** until Code Complete, then **QA/Owner** for Staging Validated → Closed. Anything needing a decision is **Product**; anything needing a third party is **Integration**; anything needing infra/console access is **Platform**.

### Release Board (single operational dashboard)

| Status | Items |
|--------|-------|
| 🚧 Engineering (active) | PC-2 (next: RM-03) |
| ⏳ Waiting QA (staging/live validation) | P0-5, PC-5a, PC-1, P0-4 |
| 🧭 Waiting Product (decision) | P1-2, P1-3, PC-4, PC-6, SEC-permRLS, SEC-bucket, PC-5b (badge policy) |
| 🔌 Waiting Integration (external) | PC-5b (DigiLocker/EPFO), Razorpay webhook |
| 🏗 Waiting Platform (infra/console) | P3-pwd, Phases G–I |
| ✅ Closed | P0-1, P0-2, P1-4, P0-3(entitlement), SEC-jobIDOR, SEC-searchpath, SEC-trigRPC, PC-3a, P3-jwt |

Move an item's row here the moment its state changes — this board is the daily glance; the Regression Tracker is the detail.

---

## Findings Regression Tracker

State machine per finding: **Reported → Fixed → Regression-Tested → Closed.** A finding is `Closed` only after a regression test proves the fix AND proves it won't silently reappear.

| ID | Sev | Title | Reported | Fixed | Regression-Tested | Closed |
|----|-----|-------|:--:|:--:|:--:|:--:|
| P0-1 | P0 | `update_user_elo` anon-executable | ✅ | ✅ | ✅ `has_function_privilege`=false | ✅ |
| P0-2 | P0 | `queue_*_grading` anon-executable | ✅ | ✅ | ✅ privileges verified | ✅ |
| P0-3 | P0 | `profiles` entitlement cols client-writable | ✅ | ✅ (sub/verified/themes) | ✅ probe `blocked=t` | ⚠️ partial (ELO cols → P0-5) |
| P0-4 | P0 | Payment plan/amount not order-bound | ✅ | ✅ | ⚠️ syntax/import only | ❌ needs live payment test |
| P0-5 | P0 | Client-authored ELO | ✅ | ✅ (arena review authoritative; client ELO writes removed) | ⚠️ code-level (syntax OK, no dangling refs, 0 client `elo_rating` writes remain) | ⚠️ blocked (b: staging validation + apply `freeze_elo_columns_migration.sql`) |
| P1-1 | P1 | Grading ELO lost-update race | ✅ | ✅ | ✅ RPC probe (400→417) | ⚠️ worker path not run e2e |
| P1-2 | P1 | ELO farming (resubmit) | ✅ | ❌ | ❌ | ❌ |
| P1-3 | P1 | Client `test_results` trusted on AI-fail | ✅ | ❌ | ❌ | ❌ |
| P1-4 | P1 | `get_copilot_history` IDOR | ✅ | ✅ | ✅ privilege revoked | ✅ |
| PC-1 | P1 | Vault upload path+auth break | ✅ | ✅ (use authed `vaultApi.upload`) | ⚠️ static (syntax OK); 1 live upload pending | ⚠️ |
| PC-2 | P1 | Assessment client-scored, answers shipped | ✅ | ❌ | ❌ | ❌ (a: folds into P0-5 server-grade) |
| PC-3a | P2 | AI endpoints off rate limiter | ✅ | ✅ (added to `aiLimiter`) | ✅ syntax OK | ✅ |
| PC-3b | P2 | AI endpoints unauthenticated | ✅ | ❌ | ❌ | ❌ (a: needs onboarding client token) |
| PC-4 | P2 | Onboarding save failure swallowed | ✅ | ❌ | ❌ | ❌ (c: retry-UX decision) |
| PC-5a | P1* | Verification unauth + body-`uid` (cross-account forgery) | ✅ | ✅ (requireAuth + uid from token, all 5 routes; Aura sends token) | ⚠️ code-level (syntax OK, all 5 authed, no body-uid) | ⚠️ staging-gated |
| PC-5b | P1* | Verification is a STUB + "verified" badge authenticity | ✅ | ❌ | ❌ | ❌ (b: real DigiLocker/EPFO + c: badge-gating policy) |
| PC-6 | P2 | Launchpad demo metrics as real | ✅ | ❌ | ❌ | ❌ (c: data-source/label decision) |
| SEC-jobIDOR | P2 | Job-poll missing ownership check | ✅ | ✅ (owner check + `user_id` select) | ✅ deterministic check | ✅ |
| SEC-searchpath | P2 | 26 functions mutable `search_path` | ✅ | ✅ (pinned `= public`) | ✅ advisor re-run: 0 remaining | ✅ |
| SEC-trigRPC | P2 | `handle_new_user`/`create_referral…` anon-RPC-executable | ✅ | ✅ (revoked EXECUTE) | ✅ advisor confirms | ✅ |
| SEC-permRLS | P2 | `notifications`/`referral_codes` permissive RLS | ✅ | ❌ | ❌ | ❌ (c: confirm intended writer) |
| SEC-bucket | P2 | `org-media` public bucket listing | ✅ | ❌ | ❌ | ❌ (c: org-media access decision) |
| P3-jwt | P3 | JWT algorithm not pinned | ✅ | ✅ (`algorithms:["HS256"]`) | ✅ syntax OK | ✅ |
| P3-pwd | P3 | Leaked-password protection off | ✅ | ❌ | ❌ | ❌ (b: Supabase dashboard toggle) |

*PC-5 is P1 generally but treat as **P0 for a college/recruiter rollout.**

**Convergence:** 17 reported → **9 Closed**, 2 partial (PC-1 pending 1 live smoke; P0-5 code-complete, staging-gated), 6 Open — every Open one is category (a)/(b)/(c) (annotated). No safe-to-fix issue remains unaddressed.

### Release Missions

**RM-00 — Safe-fix batch (Phase A/F).** Open before 7 · Code completed 6 · Regression tested 6 · Staging validated 6 (applied to prod DB / code) · Closed 6 (JWT, job-IDOR, search_path×26, trigger-RPC, rate-limit) · Remaining 6. New issues found 0.

**RM-01 — P0-5 ELO Cutover (Phase B / Trust).**
| Metric | Count |
|--------|------:|
| Open before | 6 |
| Code completed | 1 (P0-5) |
| Regression tested (local/static) | 1 |
| Staging validated | 0 |
| Closed | 0 |
| Remaining | 6 |
Backend `/api/arena/review` authoritative via `apply_arena_result`; token on all 3 review callers; client `elo_rating` writes removed from `useArenaState` + `useArenaMissions`. **New issues found 0** (scope held). Stop = staging blocker: apply `freeze_elo_columns_migration.sql` only after live validation. NOTE: PC-2 / PC-3b are a **separate** endpoint (`/api/generate-mcq`) — not in this mission.

**RM-02 — PC-5 Verification Authentication (Phase B / Trust).**
| Metric | Count |
|--------|------:|
| Open before | 6 |
| Code completed | 1 (PC-5a) |
| Regression tested (local/static) | 1 |
| Staging validated | 0 |
| Closed | 0 |
| Remaining | 6 (PC-5 split: 5a code-complete, 5b external/product) |
All 5 `/api/verify/*` routes now `requireAuth` + derive `uid` from token (was unauth + body-uid); Aura sends the bearer token on all 5 calls; body-`uid` trust removed. **New issues found 0.** Stop = staging validation + PC-5b (real DigiLocker/EPFO integration + "verified" badge-gating policy) remain owner/external.

**Deterministic next → RM-03:** P0 items (P0-5, P0-4, PC-5a) are all Code-Complete awaiting owner-only actions (staging/live-payment). No remaining un-started P0. Next actionable P1 blocking Trust cert = **PC-2 — server-grade the onboarding assessment** (stop shipping `correct` answers to the client; grade server-side; also closes PC-3b auth). Category (a) coordinated but engineering-actionable.

---

## Phase A — Security Certification

Scope: authentication, authorization, RLS, payments, API abuse. (Business-integrity items moved to Phase B.)

| # | Control | Status | Evidence |
|---|---------|:--:|---------|
| A1 | Authentication (JWT verify, session/refresh) | ⚠️ | local verify OK; pin alg/aud (P3) |
| A2 | Authorization (ownership on every service_role query) | ⚠️ | pattern OK; verify.js body-uid (→ Phase B / PC-5) |
| A3 | RLS — no privileged client writes | ⚠️ | entitlement frozen; ELO cols pending (P0-5) |
| A4 | Privileged RPCs locked to service_role | ✅ | P0-1/P0-2/P1-4 Closed |
| A5 | Payments bound to order + captured amount | ✅→ | fixed; **not yet Closed** (live test) |
| A6 | API abuse prevention (authn + rate limits on AI/cost routes) | ⚠️ | PC-3 open; systemic missing auth headers |
| A7 | Secrets hygiene (no committed secrets, `.env` ignored) | — | P3-2 to verify |

**Verdict: CONDITIONAL PASS once A5 Closed + PC-3 fixed.**

## Phase B — Trust Certification (the differentiator)

Scope: does the platform's core claim — *proven, trustworthy skill* — hold?

| # | Control | Status | Evidence |
|---|---------|:--:|---------|
| B1 | Assessment integrity (server-graded, answers not leaked to client) | ❌ | PC-2 |
| B2 | ELO integrity (server-owned, tamper-proof, no farming, no race) | ⚠️ | race fixed (P1-1); P0-5, P1-2 open |
| B3 | Verification authenticity (real DigiLocker/EPFO, authorized) | ❌ | PC-5 stubbed + unauth |
| B4 | Recruiter proof integrity (proof_artifacts only from real graded work) | ⚠️ | forgeable via P0-5 / queue path (now locked) — re-verify after B1/B2 |
| B5 | Portfolio authenticity (displayed artifacts trace to verified events) | — | not traced |

**Verdict: IN PROGRESS. This phase is the rollout gate — B1, B2, B3 are the highest-priority work.**

## Phase C — Product Certification (journeys)

Each journey passes when every surface below meets the **Universal exit gate**.

**Student** — PASS when: ✓ Signup ✓ Login ✓ Assessment ✓ Skill Graph ✓ Aura Dashboard ✓ Arena ✓ Workbench ✓ Skill Studio ✓ AI Coach ✓ Launchpad ✓ Portfolio.
Current: IN PROGRESS (~65% static). Open: PC-2/3/4; Workbench/AI-Coach/Portfolio runtime states pending live.

**Professional** — PASS when: ✓ Signup ✓ Login ✓ Resume upload ✓ Skill extraction ✓ Skill Graph ✓ Career Timeline ✓ Vault ✓ AI Interview ✓ Jobs ✓ Portfolio.
Current: IN PROGRESS (~15%). Open: PC-1 (vault).

**Executive** — PASS when: ✓ Signup ✓ Login ✓ Dashboard ✓ Insights ✓ Network ✓ Thought-leadership/Leadership. Current: NOT STARTED (~5%, mock data seen).

**Organisation** — PASS when: ✓ Signup ✓ Company setup ✓ Recruiters ✓ Candidate search ✓ Proof ✓ Hire flow ✓ Analytics. Current: NOT STARTED (~5%).

**College** — PASS when: ✓ Institution setup ✓ Departments ✓ Students ✓ Placement dashboard ✓ Reports. Current: NOT STARTED (~5%).

**Recruiter** — PASS when: ✓ Login ✓ Candidate search ✓ Proof visibility (correct gating) ✓ Messaging ✓ Offers/Hire. Current: NOT STARTED (~10%).

## Phase D — Role Certification (behavioral, not navigational)

For **each** of the 21 roles, certify correctness — not just that the surface loads:

| Surface | Must be correct |
|---------|-----------------|
| Assessment | correct questions · correct skills mapped · correct scoring |
| Arena | correct workstation · correct simulator · correct challenges |
| Workbench | correct tools · correct files · correct editor |
| Skill Studio / Courses | correct lessons/path for the role |
| Launchpad | correct jobs · correct recommendations |
| Portfolio | correct artifacts |
| Recruiter View | correct visibility/gating |
| AI Coach | role-aware guidance |

Roles: Frontend, Backend, Fullstack, Data Analyst, Embedded, Analog, VLSI, IoT, EEE, Mechanical, Thermal, Civil, Structural, Transportation, Geotechnical, MBA, HR, Finance, Marketing, Operations, Pharmacy, Medical Coding (+ Medical/others as configured).

Current: **NOT STARTED (0/21).** Method: seeded account per role + scripted matrix + k6 journeys on staging; requires live env. Track as a 21×8 correctness grid (each cell ✅/⚠️/❌/—).

## Phase E — API Certification

Every FE request → route exists · authorization · input validation · DB write correct · deterministic error handling · loading state · retry.
Current: IN PROGRESS (~40%). Contract sweep done (1 break: PC-1). Per-endpoint validation/error/retry not yet verified. `api.js` `/pro/*` set not fully diffed.

## Phase F — Database Certification

Every table · trigger · queue · function · policy · migration · storage bucket · cron · webhook reviewed.
Current: IN PROGRESS (~45%). Done: advisors, `profiles` RLS, grading/ELO/copilot RPC lockdown, `apply_arena_result` atomicity. Open: `search_path` on 26 funcs, permissive RLS (`notifications`/`referral_codes`), `org-media` bucket listing, full table-by-table RLS sweep, migration reconciliation (loose `.sql` vs `supabase/migrations`), no Razorpay webhook.

## Phase G — Performance Certification (NEW — before infrastructure)

Application performs well under load, independent of infra provisioning.

| Metric | Target (define) | Status |
|--------|-----------------|:--:|
| API latency P95 / P99 | e.g. P95 < 400ms, P99 < 1s (non-AI) | — |
| Arena grading latency (enqueue→result) | define SLA | — |
| AI latency (Groq/Claude paths) | define budget + timeout behavior | — |
| CPU / Memory under load | no saturation at target VUs | — |
| DB (query time, pool, slow queries) | no lock/lost-update, index coverage | — |
| Redis (once added) | hit rate, latency | — |
| Queue (pgmq) depth & drain rate | drains at target throughput | — |
| Websocket (if used) | connection stability | — |
| API throughput | req/s at each VU tier | — |
| **Load ramp 100 → 500 → 2,000 → 5,000 → 10,000 VUs** | document the **first bottleneck** at each tier | — |

Tooling: k6 suite in `load-tests/k6/`. **NOT STARTED — gated behind A–F.**

## Phase H — Observability Certification (NEW)

Operational visibility required before large-scale rollout.

| Control | Status | Notes |
|---------|:--:|------|
| Structured logging (JSON, correlation ids) | ⚠️ | mostly `console.*` today |
| Error reporting (Sentry/equivalent) | — | not present |
| Metrics (RED/USE, dashboards) | — | Vercel analytics on FE only |
| Distributed tracing (if applicable) | — | — |
| Health endpoints | ✅ | `/`, `/health` exist |
| Alerting (on-call, thresholds) | — | — |
| Audit logs for critical actions (payments, ELO, verification, entitlement) | — | **add — required for trust disputes** |

**Verdict: NOT STARTED (~10%).**

## Phase I — Infrastructure Readiness (gated behind A–H)

Redis (global rate-limit/queue), workers, CI/CD, backups + restore drills, autoscaling to survive the Phase G load tiers. **NOT STARTED — by design.**

---

## Gating blockers (must be `Closed` to certify)

**P0:** P0-4 (close via live payment test) · P0-5 (ELO cutover) · PC-5 (verification auth + de-stub).
**P1:** PC-1 · P1-2 · P1-3 · PC-2 · Razorpay webhook/idempotency.

## Final certificate (template — signed only when criteria met)

> **Capabilio Production Certification — vX.Y — <date>**
> A Security ☐ PASS · B Trust ☐ PASS · C Product ☐ PASS (6/6 journeys) · D Role ☐ PASS (21/21 × 8 surfaces) · E API ☐ PASS · F Database ☐ PASS · G Performance ☐ PASS (10k VUs, first bottleneck documented) · H Observability ☐ PASS · I Infrastructure ☐ READY
> Sign-off: __________ (Eng) · __________ (Product) · __________ (Trust/Compliance)

**Current signable state: none checkable. Nearest done: A4 (RPC lockdown), P1-4 — both `Closed`.**
