# Capabilio — Production Certification Audit (Pass 1)

**Date:** 2026-07-16
**Scope of this pass:** P0/P1 production blockers — auth/RLS security boundaries, ELO/scoring integrity, payments, AI-output validation, and the exposed DB surface. Traced end-to-end: UI → API → business logic → DB → background jobs.
**Method:** Static trace of `backend/`, `frontend/src/`, `mcp/`, live Supabase security/RLS advisors, and live inspection of DB grants/policies on project `eybchcqwbizjmzyrviri` (capabilio, ACTIVE_HEALTHY, ap-northeast-2).

## Verdict: **NO-GO for production** (pre-fix)

Five independent P0 vulnerabilities let any signed-in (and in some cases anonymous) user forge ELO/leaderboard standing, forge recruiter-visible "proof", grant themselves paid subscriptions with no payment, and mark themselves "verified." For a skill-first, ELO-based assessment product these break the core trust guarantee, not just a feature.

**3 of the 5 P0s were remediated inline this pass** (safe, backward-compatible, verified). The remaining 2 P0s require a coupled frontend+backend change and are specified below. Re-audit required before certification.

---

## Findings register

| ID | Severity | Area | Title | Status |
|----|----------|------|-------|--------|
| P0-1 | P0 | DB / RLS | `update_user_elo(uuid,int)` RPC executable by anon/authenticated → arbitrary ELO write for any user | **FIXED (migration)** |
| P0-2 | P0 | DB / Arena | `queue_send/read/ack/archive_grading` RPCs executable by anon/authenticated → forge grading jobs (arbitrary score/proof/ELO) + drain queue | **FIXED (migration)** |
| P0-3 | P0 | DB / Payments / ELO | `profiles` UPDATE RLS has no column guard → client can write `subscription`, `verified`, `purchased_themes`, `elo_rating` directly | **PARTIALLY FIXED** — entitlement cols frozen; ELO cols pending coupled fix (see P0-5) |
| P0-4 | P0 | Payments | `/verify-payment` grants plan from client `planId`/`uid`; signature not bound to plan/amount → plan escalation + one-payment-to-many-accounts | **FIXED (backend)** |
| P0-5 | P0 | Arena / ELO integrity | Client computes and writes its own `elo_rating` (`useArenaState`, `useArenaMissions`) → leaderboard/recruiter forgery by design | **OPEN — coupled fix specified** |
| P1-1 | P1 | Arena / concurrency | Grading worker read-modify-write on `elo_rating` from submit-time snapshot → lost updates / corruption under cluster + concurrent submits | OPEN |
| P1-2 | P1 | Arena | Infinite ELO farming — same challenge re-submittable, `+3` floor per attempt, no per-challenge best-score cap | OPEN |
| P1-3 | P1 | AI grading | Client-supplied `test_results` drive score in the AI-failure fallback; no server-side execution of submissions | OPEN |
| P1-4 | P1 | DB / privacy | `get_copilot_history(p_user_id)` anon-executable → read any user's Copilot chat history (IDOR) | **FIXED (migration)** |
| P2-1 | P2 | Arena | `/challenges/:id/jobs/:job_id` does not enforce `job.user_id === req.user.id` (comment claims it does) | OPEN |
| P2-2 | P2 | DB | 26 functions with mutable `search_path`; `notifications`/`referral_codes` permissive RLS; `org-media` public bucket allows listing | OPEN |
| P3-1 | P3 | Auth | JWT verified without `algorithms`/`aud` pinning; leaked-password protection disabled | OPEN |
| P3-2 | P3 | Repo hygiene | ~90 `vite.config.js.timestamp-*.mjs` artifacts and `.env`/`.env.local` present in working tree | OPEN |

---

## Architecture (as traced)

- **Frontend:** Vite + React 18 SPA (`frontend/src`), talks to Supabase directly with the **anon** key (`frontend/src/lib/supabase.js`) for most reads/writes, and to the Express backend (`frontend/src/lib/api.js`, Bearer JWT) for AI and privileged operations.
- **Backend:** Express (`backend/server.js`), cluster-per-core in prod, rate limiters, 35s request timeout. All DB access uses the Supabase **service_role** key (`backend/server/lib/supabase.js`) → **RLS is bypassed on the backend**, so every backend route must enforce ownership in code (`requireAuth` + `req.user.id`).
- **Auth:** `backend/server/lib/auth.js` verifies Supabase JWTs locally with `SUPABASE_JWT_SECRET`.
- **Arena grading:** `submit` enqueues to Supabase pgmq (`queue.js`), `grading-worker.js` polls, grades via Claude/Groq (`claude.js`), writes `arena_history` + `profiles.elo_rating` + `proof_artifacts`.
- **The trust split is the root of most findings:** the anon client is a first-class writer to `profiles` and to several `SECURITY DEFINER` RPCs, but the column/EXECUTE boundaries needed to make that safe were missing.

---

## P0-1 — Arbitrary ELO write RPC (FIXED)

**Evidence:** Supabase security advisor + `pg_proc.proacl` showed `public.update_user_elo(uuid, integer)` had `EXECUTE` for `PUBLIC`, `anon`, `authenticated`. The anon key ships in the frontend bundle. Grep of `backend/`, `frontend/src/`, `mcp/` → **zero callers**; it is dead code that exists only as an attack surface.
**Impact:** `POST /rest/v1/rpc/update_user_elo {uid, delta}` from anyone sets any user's ELO by any delta — instant #1 leaderboard, top recruiter ranking, no arena activity.
**Root cause:** `SECURITY DEFINER` function left with default `EXECUTE TO PUBLIC`.
**Fix applied (migration `lock_down_security_definer_rpcs`):** `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated; GRANT … TO service_role`. Verified `has_function_privilege` → anon/auth `false`, service_role `true`.

## P0-2 — Grading-queue RPCs open to clients (FIXED)

**Evidence:** `queue_send_grading(jsonb)`, `queue_read_grading(int)`, `queue_ack_grading(bigint)`, `queue_archive_grading(bigint)` all EXECUTE-able by anon/authenticated. Only caller is the backend worker via service_role (`backend/server/lib/queue.js`).
**Impact:** A client could `queue_send_grading` a hand-crafted payload; the worker (`grading-worker.js`) trusts the payload's `userId`, `challenge`, `test_results`, `userElo` and writes an arbitrary `score`, `elo_delta`, and a recruiter-visible `proof_artifacts` row for **any** user. They could also `queue_read/ack/archive` to drain or DoS the real grading queue.
**Root cause:** same default-grant issue on `SECURITY DEFINER` queue wrappers.
**Fix applied:** revoked from anon/authenticated, granted to service_role only (same migration). Backend worker unaffected (uses service_role).

## P0-4 — Payment plan/entitlement not bound to the order (FIXED)

**Evidence:** `backend/server/routes/payments.js` `/verify-payment` (pre-fix): took `planId` and `uid` from `req.body`; the HMAC signature covers only `order_id|payment_id`, not plan or amount; then `profiles.update({subscription: planId}).eq('id', uid)`. No auth. `/theme/create-order` took `amount` from the client.
**Impact:**
- **Plan escalation:** pay for `pro` (₹299), call verify with `planId:"legacy"` (₹7,999) / `university` (₹6,999) — signature still valid → top plan for the cheapest price.
- **Replay / grant-to-anyone:** the same valid `{order_id, payment_id, signature}` re-POSTed with different `uid` upgrades unlimited accounts from one payment.
- **Themes:** client sets its own `amount` → pay ₹1 for any theme.
**Root cause:** entitlement derived from client input instead of the server-created order + captured payment.
**Fix applied (backend, non-breaking):** `/verify-payment` now re-fetches the order (`razorpay.orders.fetch`), reads `planId`/`uid` from `order.notes` (which the server itself stamped in `create-order`), fetches the payment, and requires `payment.order_id === order_id`, status `captured`/`authorized`, and `payment.amount === PLAN_PRICES[planId].amount` before granting. `/theme/verify-payment` now binds `uid` to `order.notes` and requires a captured payment matching `order.amount`. Redundant client-side `subscription` write removed from `Pricing.jsx`. (Syntax + import checked.)
**Follow-up (P1):** add a Razorpay **webhook** (`payment.captured`) as the source of truth and a `payment_events` ledger keyed by `razorpay_payment_id` for true idempotency; move theme prices to a server-side map.

## P0-3 — `profiles` column-level write bypass (PARTIALLY FIXED)

**Evidence:** live policy dump — `profiles` UPDATE policy is `USING (auth.uid() = id)` with **no `WITH CHECK` and no column restriction**. RLS restricts the *row*, not the *columns*. Frontend writes `profiles` directly with the anon client in many places (`frontend/src/lib/db.js`, `frontend/src/hooks/*`), and `Pricing.jsx:274` wrote `subscription` from the client.
**Impact (any authenticated user, via anon client):** set own `subscription` (paywall bypass), `verified:true` (fake vetting / recruiter visibility via the "Verified profiles visible to all" policy), `purchased_themes` (free cosmetics), and — see P0-5 — `elo_rating`.
**Root cause:** privileged columns are writable by the `authenticated` role.
**Fix applied (migration `freeze_entitlement_columns_on_profiles`):** BEFORE UPDATE trigger `protect_profile_entitlements()` raises `insufficient_privilege` if a non-service role changes `subscription`, `verified`, or `purchased_themes`; service_role (backend) and DDL roles bypass. Verified in a rolled-back probe under `SET ROLE authenticated`: `subscription_blocked=t`, benign column update `allowed=t`.
**Not yet frozen:** `elo_rating`, `arena_completed`, `arena_streak` — see P0-5.

## P0-5 — Client-authored ELO (OPEN, coupled fix)

**Evidence:** `frontend/src/hooks/useArenaState.js:166` and `frontend/src/hooks/useArenaMissions.js:366` compute `newElo` in the browser and `supabase.from("profiles").update({ elo_rating: newElo, ... })` directly with the anon client. This is a **second, parallel ELO path** independent of the server grading worker.
**Impact:** ELO — the product's core signal, shown on leaderboards and to recruiters — is client-authored and trivially forgeable (edit the number, or call the update directly). Freezing `elo_rating` at the DB level right now would silently break daily-mission/arena-state ELO progression, so it cannot be done in isolation.
**Root cause:** an assessment-integrity-critical write lives on the client.
**Proposed fix (scalable, the correct end state):**
1. Route these two hooks through the existing server path (`POST /api/arena/v2/challenges/:id/submit` → grading worker), which already writes ELO via service_role, OR add a dedicated authenticated server endpoint for mission completion that computes ELO server-side.
2. Then extend the `protect_profile_entitlements()` trigger to also freeze `elo_rating`, `arena_completed`, `arena_streak` (one-line addition; migration is ready).
3. Recompute/repair any ELO already inflated via the client path before freeze.

---

## P1 — integrity issues in the server grading path (`grading-worker.js`)

- **P1-1 Lost-update race:** the worker reads `userElo`/`arena_completed` from the submit-time snapshot and writes the *absolute* `elo_rating = userElo + delta`. Two concurrent submissions (cluster mode, or a user submitting again before the first job finishes) both read the same stale value; the second overwrites the first. **Fix:** apply the delta atomically in one statement (secured `update_user_elo` RPC used with `.rpc()` under service_role, or `elo_rating = elo_rating + :delta` via an RPC / `SELECT … FOR UPDATE`), instead of read-modify-write in JS.
- **P1-2 ELO farming:** `computeEloUpdate` floors `delta` to `+3` whenever `actual >= 0.7`, and nothing prevents re-submitting an already-solved challenge. A user farms unlimited ELO by resubmitting one easy solved task. **Fix:** award ELO only on first solve or on best-score improvement; enforce a uniqueness/idempotency key on `(user_id, task_id)` and cap repeat gains.
- **P1-3 Untrusted grading inputs:** in the AI-failure fallback the score is `passed/total` computed from **client-supplied** `test_results`; submissions are never executed server-side (execution is client-side sql.js/Pyodide per design). **Fix:** never derive score from client `test_results`; on AI failure, re-run in a server/isolated sandbox or fail closed (queue for re-grade) rather than trusting the client.

## P1-4 — Copilot history IDOR (FIXED)
`get_copilot_history(p_user_id, …)` was anon-executable and takes an arbitrary user id → read anyone's chat history. Locked to service_role in the same RPC migration.

---

## P2 / P3 (hardening — after P0/P1)

- **P2-1** `arenaV2.js` job-poll endpoint returns any job by id without checking `job.user_id === req.user.id`, despite a comment claiming it does. Add the ownership check (job ids are UUIDs, so exposure is bounded, but the guarantee is stated and absent).
- **P2-2** DB advisors: 26 functions with mutable `search_path` (set `search_path = public`); `notifications` INSERT and `referral_codes` ALL use `WITH CHECK (true)`; `org-media` public bucket allows listing (scope the SELECT policy). Several tables have RLS enabled but **no policy** (`skills`, `companies`, `user_skill_scores`, `leaderboard_cache`, …) — harmless while only the backend reads them via service_role, but any intended anon read will silently fail; confirm intent per table.
- **P3-1** `auth.js` `jwt.verify(token, secret)` should pin `{ algorithms: ['HS256'], audience: 'authenticated' }`. Enable Supabase leaked-password protection.
- **P3-2** Repo hygiene: ~90 `vite.config.js.timestamp-*.mjs` files and committed `.env`/`.env.local` in the working tree — verify secrets were never committed and add to `.gitignore`.

---

## Changes applied in this pass

**Database (project `eybchcqwbizjmzyrviri`) — 2 migrations:**
1. `lock_down_security_definer_rpcs` — revoked anon/authenticated EXECUTE on `update_user_elo`, `queue_*_grading` (4), `get_copilot_history`, `increment_copilot_usage`, `get_monthly_question_count`; granted service_role. (Closes P0-1, P0-2, P1-4.)
2. `freeze_entitlement_columns_on_profiles` — BEFORE UPDATE trigger blocking non-service writes to `subscription`, `verified`, `purchased_themes`. (Closes the entitlement half of P0-3.)

Both are backward-compatible (backend uses service_role; frontend makes zero `.rpc()` calls and no longer needs the frozen client writes) and reversible.

**Code:**
- `backend/server/routes/payments.js` — `/verify-payment` and `/theme/verify-payment` rewritten to bind entitlement to the server-created Razorpay order + captured amount. (Closes P0-4.)
- `frontend/src/pages/Pricing.jsx` — removed redundant/blocked client-side `subscription` write.

## Update — P1-1 fixed; P0-5 cutover plan ready

**Applied since first draft (safe, server-only, verified):**
- Migration `atomic_apply_arena_result` — `public.apply_arena_result(uid, elo_delta, today)` applies ELO delta + streak + completed-count in one `UPDATE … RETURNING` (race-free), `service_role` only. Verified on a live row in a rolled-back tx (elo 400→417, completed→1, streak→1).
- `backend/server/lib/grading-worker.js` — the profile ELO write now calls `apply_arena_result` (atomic) instead of read-modify-write from a submit-time snapshot, with a fallback to the old path if the RPC errors. **Closes P1-1** (lost-update race under cluster/concurrent submits). Syntax verified.

### P0-5 cutover — making ELO server-owned (traced, ready, staging-gated)

Origin confirmed: the client hooks apply an ELO delta that the server *already* computes — `POST /api/arena/review` (`backend/server/routes/arena.js:230`) calls `gradeSubmission` which returns `eloGained` (`backend/server/lib/claude.js:76`). The endpoint is currently **unauthenticated** and does **not** write ELO; the client (`useArenaMissions.js:359`, `useArenaState.js:137`) takes the number and writes `profiles.elo_rating` itself. So the delta is server-computed but the *write* is client-owned — that is the whole defect.

Cutover (order matters — do NOT reorder; validate on staging/preview between steps 3 and 4):
1. **Backend** `/api/arena/review`: add `requireAuth`; ignore client `eloRating`/`uid`; after grading, call `apply_arena_result(req.user.id, serverDelta, today)` where `serverDelta` is derived from the graded score via the same `computeEloUpdate` formula the worker uses; return `{ ...review, eloDelta, newElo, newStreak }`. Move the `arena_leaderboard` / `arena_submissions` writes server-side too.
2. **Frontend token plumbing**: update `frontend/src/api/arenaApi.js` `reviewAnswer` and the `/api/arena/review` call sites in `ArenaCommonChallenges.jsx` to send `Authorization: Bearer <token>` (reuse the `getToken()` pattern from `frontend/src/lib/api.js`).
3. **Remove client ELO writes**: in `useArenaMissions.js` (the `profiles.update({elo_rating…})` + `arena_leaderboard` upsert) and `useArenaState.js` (`markCompleted`), stop writing `elo_rating`/`arena_completed`/`arena_streak`; use the `newElo`/`newStreak` returned by step 1 for UI only.
4. **Validate on staging** that every Arena entry point (daily mission, arena-state slot, common challenges, arenaV2 catalog) still records ELO through the server, then apply the enforcing migration:
   ```sql
   -- extend the existing entitlement trigger to also freeze ELO columns
   -- (only after step 3 ships, or daily-mission ELO breaks)
   -- add to protect_profile_entitlements(): raise if new.elo_rating / arena_completed /
   -- arena_streak is distinct from old for non-service roles.
   ```
5. **Data repair**: before/after freeze, recompute `elo_rating` from the authoritative `elo_events` / `arena_history` ledger for any accounts whose ELO was inflated via the old client path.

Why it is not applied in this pass: steps 1–3 are a coupled frontend+backend change and step 4 is a breaking DB change; applying the freeze before step 3 ships (or missing a token on any review call site in step 2) takes down Arena for **every role**. This must run through staging, which isn't available from this review environment.

### P1-2 / P1-3 — recommendations (product-behavior tradeoffs, not blind-patched)

- **P1-2 ELO farming:** award ELO only on a user's *first solve* of a task or when the new score beats their prior best for that task; enforce via a uniqueness/upsert key on `(user_id, task_id)` in `arena_history` and gate the `apply_arena_result` call on "is this an improvement." Needs a decision on whether repeat practice should yield diminishing (not zero) ELO.
- **P1-3 client `test_results` trust:** on AI-grade failure the worker currently derives score from client-supplied `test_results` (`grading-worker.js`). Options: (a) fail-closed → requeue for re-grade and write no score/ELO/proof until a real grade exists; (b) re-execute server-side. (a) is safe but degrades UX when AI is down; (b) needs a server sandbox. Pick per product tolerance — either way, client `test_results` must not drive positive ELO/proof.

## Product Certification — Pass 2 (functional; in progress)

Method: the live click-through was requested but the Claude-for-Chrome side-panel bridge would not connect from this environment, so this pass is a **static functional trace** (page → button → handler → API → DB write → loading/error/empty state). It feeds the same register the live pass will confirm. A full contract sweep (frontend `/api/...` calls vs mounted backend routes) was run to catch "button → 404" breaks.

### PC-1 (P1) — Vault upload is broken (Professional/Orbit)
`frontend/src/pages/Orbit.jsx:749` calls `POST ${API}/api/vault/upload`, but the backend route is `POST /api/pro/vault/upload` (`careerTimeline.js:189`) — **path mismatch → 404**. It is also sent as a raw `fetch` with only the form body and **no `Authorization` header**, while the route is `requireAuth` → **401** even if the path matched. Document upload to the career vault cannot succeed. Fix: call `/api/pro/vault/upload` and attach the bearer token (use the `upload()` helper in `frontend/src/lib/api.js`, which already sets auth headers).

### PC-2 (P1/P2) — Onboarding assessment is client-scored, answers shipped to client
`Onboarding.jsx`: `/api/generate-mcq` returns questions **including the `correct` field**, and the score is computed in the browser (`generateResult`, line 1816), then the initial ELO seed is written client-side (`getStudentDisplayElo(score/total)` → `userDoc.update({eloRating})`). A user can read the correct answers from the network response or post any score. This is the onboarding ELO seed specifically; it shares the root cause with **P0-5** (client-authored ELO) and should be folded into that cutover — grade the assessment server-side and seed ELO under service_role.

### PC-3 (P2) — Unauthenticated AI endpoints, not on the AI rate limiter
`/api/generate-mcq` and `/api/analyse-assessment` (`assessment.js`, `requireAuth:0`) are callable anonymously, and `server.js` only applies `aiLimiter` to `/api/arena`, `/skill-studio`, `/chat`, `/voice`, `/copilot`, `/groq` — **not** `/api/generate-mcq`/`/analyse-assessment`. So these Claude/Groq-backed endpoints have only the general 100/min/IP limit and no auth → AI cost-abuse / DoS vector. Fix: require auth (or a signed onboarding token) and add them to `aiLimiter`.

### PC-4 (P2) — Onboarding profile-save failure is silent
`handleGoToDashboard` wraps the profile save in `try { … } catch (err) { console.warn(...) }` and then proceeds to the plan step / dashboard regardless. If the save fails (network/RLS), the user lands on the dashboard with an incomplete profile and no error surfaced. Fix: surface a retryable error instead of swallowing it.

**Good (resilient) patterns observed:** `generateMCQs`/`analyse-assessment` have try/catch with a graceful client-side fallback and loading messages; `PrimaryBtn` has a proper disabled+loading state. (Minor UX: the assessment error string "Make sure your server is running" is developer-facing and should be user-friendly.)

### PC-5 (P1, arguably P0 for a college/recruiter rollout) — Identity/employment verification is stubbed and forgeable
`backend/server/routes/verify.js` (mounted at `/api/verify`, `requireAuth:0`) powers the "verified" badges Aura shows and that recruiters trust:
- `/digilocker/confirm` returns `verified: true` with **hardcoded fake data** (`institution: "Verified University", degree: "B.Tech", year: "2022"`) for **any** OTP except the literal `"000000"` — no real DigiLocker call.
- `/epfo/confirm` accepts any OTP except `"000000"`, then `UPDATE profiles SET epfo_verified = true, experiences = …` for the **`uid` taken from the request body**, with **no authentication**. `/certification` likewise returns `verified: true` with no real check.

Impact: anyone can call these endpoints (they're unauthenticated) with an arbitrary `uid` and stamp `epfo_verified: true` / inject a fake "Verified University / B.Tech" education onto any account. Because they run under service_role, they also bypass the `verified`-column freeze from P0-3. For a rollout that invites colleges and recruiters, forgeable "DigiLocker/EPFO verified" badges are a trust and liability problem. Two separable fixes: (1) require auth and derive `uid` from `req.user.id`, never the body; (2) treat these as **not production-verifications** until the real DigiLocker/EPFO integrations replace the stubs — don't render a "verified" badge off a stubbed endpoint. Confirm whether the stub is a known pre-integration placeholder.

### PC-6 (P2) — Launchpad shows hardcoded demo metrics as if real
`frontend/src/pages/Launchpad.jsx` loads real jobs (has `load()`, loading states, `jobs`/`userSkills`), but renders static placeholder arrays as data: `DEMOS = ["+18%","+12%",…]` and `SALARIES = ["₹12–28L",…]` are cycled per card rather than sourced from the job. Users see fabricated demand-growth % and salary bands. Fine for a demo; for a public rollout, source these from real data or label them clearly.

**Student surface coverage (static):** Onboarding/Assessment ✔ (PC-2/3/4), Aura/verification ✔ (PC-5), Arena/ELO ✔ (P0-5, P1-1/2/3 in the security pass), Skill Studio ✔ (thin error handling — `catch:3`, no auth headers on `/skill-studio/*`), Launchpad ✔ (PC-6), Workbench/ArenaWorkstations (sandbox — heavy `catch` coverage, low explicit loading states; best verified live), AI Coach/Copilot and Portfolio rendering — best verified live (runtime states). Cross-journey note: Aura's verification, chat, github-analyze, skill-gap and Skill Studio calls are all raw `fetch` with **no `Authorization` header** — the same unauth/cost-abuse pattern as PC-3, systemic across the pre-`api.js` fetch sites.

## Not yet audited (for pass 2 — transparency)

Executive / Organisation / College journeys and their org-tenant isolation; `recruiterComms`, `mentorHub`, `pulseNexus`, `orbitPlans`, `careerTimeline`, `professionalProfile`, `verify` (DigiLocker/EPFO), `referral` route-level IDOR; the MCP layer (`mcp/`) tool-name mismatch and backend AI routes bypassing MCP (per project memory); AI prompt-injection/output-sanitization across all AI routes; infrastructure (rate-limit store is per-worker in-memory, not global; no webhook/idempotency ledger). Infra work is deliberately deferred until the remaining product/architecture P0/P1s (P0-5, P1-1..3) are closed.
