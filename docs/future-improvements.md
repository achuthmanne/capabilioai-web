# Arena V2 — Future Improvements

Per instruction: ideas that come up during implementation land here, not in a redesign of the frozen spec. Nothing on this list blocks or changes Milestone 1.

## 43. The Milestone 1 schema had never actually been applied to the real Supabase project until this E2E test forced the question

`arena_v2_migration/001_schema.sql` and `002_admin_flag.sql` existed as files since Milestone 1/2, but `list_tables`/`list_migrations` against the real project (`capabilio`, ref `eybchcqwbizjmzyrviri`) showed zero `av2_` tables and no matching migration entry — every one of the 222 passing tests up to that point was a unit test against fully-faked dependencies, so this had no way of surfacing until an actual end-to-end test was attempted. **This is still true of the real production project as of this writing** — the E2E test in `backend/server/lib/arena-v2/__tests__/e2e/` runs against a disposable local Postgres (pglite), not the real Supabase project, because Supabase branching (the safe way to test against an isolated copy) requires the Pro plan, which this project is not on. Before any of this pipeline can serve real students, `001_schema.sql` and `002_admin_flag.sql` still need to be applied to the actual `capabilio` Supabase project — ideally reviewed once more given the time elapsed since they were written, then run via the Supabase SQL Editor or `apply_migration`.

## 44. E2E test infra (`__tests__/e2e/`) is a partial supabase-js reimplementation, not real PostgREST

`pgliteSupabaseAdapter.js` implements only the exact query-builder surface arena-v2's 8 repository.js files were inventoried as using (`from/select/insert/update/upsert/delete/eq/neq/in/is/lt/order/limit/single/maybeSingle`, plus `{count:"exact",head:true}`) — it is not a general-purpose Supabase client stand-in. If a future repository.js file (e.g. once more workstations/validators are built) uses a query pattern not in that list (`.rpc()`, `.gte()/.lte()`, batch array inserts, a different `.select()` count mode, etc.), the E2E test will fail with "unsupported op" or a similar adapter-level error rather than a real bug — extend the adapter's surface first, the same way this file's own header documents its scope.

Two adapter-specific fidelity fixes were needed to match real Supabase/PostgREST behavior rather than raw driver behavior: NUMERIC(p,s) columns (`final_score`, `validator_score`, etc.) are coerced from Postgres's default string representation back into JS numbers (`NUMERIC_COLUMNS` in the adapter), because PostgREST's JSON serialization returns genuine JSON numbers for these columns in production, while the raw pg/pglite wire protocol returns text by default. If a new NUMERIC/DECIMAL column is added to any av2_ table in a future migration, add it to `NUMERIC_COLUMNS` too, or a real repository function reading that column back will receive a string instead of a number in this test (as reward-engine/engine.js's own defensive `typeof !== "number"` check caught during this test's development).

## 45. E2E test is not wired into any CI pipeline — no CI config exists in this repo yet

`npm run test:arena-v2` runs the full arena-v2 suite (unit + the new end-to-end test) locally, but there is no `.github/workflows/` or equivalent CI configuration in this repository to run it automatically on push/PR. Until CI exists, this suite (222 tests as of Milestone 10 + the E2E pass) is only as good as remembering to run it by hand before merging arena-v2 changes.

## 38. Milestone 10 (`portfolio/recruiterEvidence.js`) — `skillsDemonstrated` is a single-element array, not a real multi-tag list

`buildRecruiterEvidence` returns `skillsDemonstrated: [instance.skill]` because `av2_challenge_templates` only has one `skill` TEXT column (Milestone 1) — there's no multi-tag column to draw from, even though the content spec's worked example implies a real skills list (e.g. a challenge that exercises both "SQL" and "Data Modeling"). Revisit once/if Challenge Templates grow a multi-tag skills column; `recruiterEvidence.js` itself would only need a one-line change (`instance.skillTags` instead of `[instance.skill]`), the artifact schema and `buildRecruiterEvidenceView` wouldn't need to change at all.

## 39. Milestone 10 — `scenario` field is the raw `scenario_id`, not a resolved Scenario Pack name

`buildRecruiterEvidence` sets `scenario: instance.scenario_id ?? null` verbatim rather than looking up the human-readable scenario name from `av2_scenario_packs`. Resolving it would require Portfolio's recruiterEvidence module to depend on challenge-library repository code, which was deliberately avoided to keep Portfolio Decision's dependency surface small (same "consume only what's handed to you" discipline as every other module boundary in this build). If recruiter-facing readability of the raw slug turns out to matter, the cleanest fix is threading the resolved scenario name onto the challenge instance itself at issuance time (Milestone 3/4's job), not adding a new cross-module read here.

## 40. Milestone 10 — `storage_url` is never populated; no blob storage integration exists

`av2_portfolio_artifacts.storage_url` (Milestone 1's schema) is always `null` from `insertArtifact` — nothing in Milestone 10 generates or stores an actual artifact file (e.g. a rendered PDF/screenshot of the submission). The `recruiter_evidence` JSONB is the entire artifact today; `storage_url` exists in the schema for a future rich-artifact format (rendered proof, exported query + result set, etc.) that isn't built yet.

## 41. Milestone 10 — no dedicated recruiter-role/auth model for the recruiter-facing route

`routes/arenaV2Portfolio.js`'s `GET /candidates/:userId/evidence` is gated by `requireAuth` only (any authenticated user), because no recruiter-role/permission system exists anywhere in this codebase yet (same gap #4 flagged for admin — this is the recruiter-side equivalent). The blast radius is bounded today — the endpoint only ever returns artifacts the student already chose to make public (`auto_published` or `self_selected`; drafts are always excluded by `listPublishedArtifactsForUser`) — but it is not actually recruiter-restricted. Revisit once Capabilio has a real recruiter-role concept; until then this is a read of public data by any logged-in user, not a data leak of private submissions.

## 42. Milestone 10 — Portfolio Artifact idempotency guard is check-then-insert, not transactional

`portfolio/engine.js`'s `recordPortfolioOutcome` checks `getArtifactForAssessment(assessmentId)` before calling `insertArtifact`, exactly the same accepted trade-off as Reward Engine's ELO/XP ledgers (#31) — no `UNIQUE (assessment_id)` constraint exists on `av2_portfolio_artifacts` today, so a genuine concurrent double-call on the same assessment could theoretically both pass the check before either insert lands. Same low-probability window as #31 (assessments are created once per submission, submissions are already attempt-guarded by a real DB constraint), and the same fix if it ever matters: add `UNIQUE (assessment_id)` to `av2_portfolio_artifacts`.

## 26. ELO formula omits Arena V1's attempt-decay and time-bonus multipliers — narrower by design

`reward-engine/eloFormula.js` reimplements the same standard expected-score/K-factor shape as Arena V1's `computeEloUpdate`, but deliberately drops V1's attempt-count decay and time-taken bonus multipliers, because those need submission-level metadata (`attempt_number`, `time_taken_secs`) that this milestone's Reward Engine does not accept as input — it only receives `{ assessment, instance }`, matching your diagram (`Result -> Reward Engine`) literally. If attempt/time-based ELO adjustments turn out to matter in practice, they'd need to be threaded through as fields on Assessment's own Result (not read directly from `submission` by the Reward Engine, which would reopen the boundary this milestone was asked to protect) — e.g. Assessment could expose a generic `attemptNumber`/`timingModifier`-shaped field the Reward Engine consumes without knowing what produced it.

## 27. XP base values (`XP_BASE_BY_DIFFICULTY`) are a first, undata-driven pass

`10/20/35/50` for Easy/Medium/Hard/Expert were chosen as a reasonable starting shape, not derived from any existing Arena V1 constant (V1's XP-equivalent path used the ambiguous `elo_gained` column on `streak_events`, already flagged as a naming hazard in #2 — there was nothing clean to port forward). Revisit once there's real usage data on how fast students level up.

## 28. Streak tracking (`streak_counted`) is a simplified proxy, not real calendar-day tracking — partially closes #2 / #5

`reward-engine/engine.js` sets `streakCounted: !assessment.is_zero_effort && assessment.final_score > 0` — honestly "was this a genuine, non-zero-effort completion," not an actual consecutive-day streak. Real streak tracking needs its own per-user daily-completion state (a dedicated table or reused `streak_events`, per #2's still-open question) that doesn't exist yet. This closes the *wiring* gap (#5 — "streak tracking wiring, deferred") enough that `av2_xp_ledger.streak_counted` is no longer always `false`, but the underlying streak *logic* is still a placeholder.

## 29. Skill mastery state is score-derived only — not trend-aware or recency-weighted

`reward-engine/skillProgress.js`'s `computeMasteryState` looks only at `best_score` (monotonically increasing) and `attempts_count` — a single strong attempt immediately registers as `proficient`/`mastered`, and a later weak attempt never downgrades it. This is a deliberately simple placeholder (same honesty as Milestone 3's selection.js note about Skill Engine being a placeholder) — a more sophisticated model might weight recent attempts more heavily, or require sustained performance across multiple attempts before calling a skill "mastered." Revisit once there's a real Skill Engine milestone.

## 30. Reward-posting failures propagate as an error rather than degrading gracefully

If `applyRewards` throws after `assembleAssessment` already succeeded, `submission-engine/service.js` lets the error propagate — the student sees an error even though their submission WAS genuinely graded and the assessment row is durably persisted. This was a deliberate choice (fail loudly rather than silently produce a "graded but unrewarded" state that nothing surfaces), but it means a transient reward-engine hiccup (e.g. a DB blip) costs the student a visible error on an otherwise-successful grading. A more resilient design would decouple reward-posting into its own retryable step (e.g. an outbox pattern keyed by `assessment_id`, which is already unique) so a reward-posting retry doesn't require a whole new submission attempt. Not built now — real infra (a queue or scheduled sweep) beyond this milestone's scope.

## 31. Idempotency guard is a practical safeguard, not a transactional guarantee

`applyRewards` checks for an existing `av2_elo_ledger`/`av2_xp_ledger` row keyed by `assessment_id` before writing, and short-circuits if found (`engine.test.js`'s IDEMPOTENCY tests cover this). This protects against the same assessment being rewarded twice by a direct retry of `applyRewards`, but it's a check-then-insert, not an atomic transaction — a genuine concurrent double-call (two requests racing on the exact same assessment at the exact same instant) could still theoretically both pass the check before either insert lands. No unique DB constraint enforces this today (unlike `av2_submissions`' `UNIQUE (instance_id, attempt_number)`, Milestone 8's actual concurrency guard). Given assessments are created once per submission and submissions are already attempt-guarded, this is a low-probability window, not a currently-observed bug — but a `UNIQUE (assessment_id)` constraint on both ledger tables would close it properly if it ever matters.

## 32. Portfolio Decision is explicitly out of scope for Milestone 9

Your diagram's last box (`Skill Progress -> Portfolio Decision`) is Milestone 10's job ("Portfolio & Recruiter Evidence"), not this one. `reward-engine/engine.js` never reads `instance.portfolio_decision` and never writes to `av2_portfolio_artifacts` — `engine.test.js` has an explicit test asserting no portfolio-related repository call happens. Flagging this now so it isn't mistaken for an oversight when Milestone 10 starts.

## 1. Portfolio artifact table consolidation (`av2_portfolio_artifacts` vs. legacy `proof_artifacts`)

Milestone 1 created `av2_portfolio_artifacts` as a new table rather than reusing Arena V1's `proof_artifacts`. Reason: `proof_artifacts.attempt_id` and `.challenge_id` are foreign keys into legacy `challenge_attempts`/`challenges`, not into `av2_submissions`/`av2_challenge_templates` — reusing the table as-is would mean either nullable dangling legacy FKs or a schema change to a table Arena V1 still writes to, both of which risk the frozen "don't modify Arena V1" constraint.

Once Arena V1 is fully retired (blueprint's stated end-state — "only after Arena V2 is fully working will we remove Arena V1"), consider migrating `av2_portfolio_artifacts` rows into `proof_artifacts` (or vice versa) so recruiters only ever query one table. Not a Milestone 1-4 decision — revisit at V1 sunset.

## 2. XP ledger vs. legacy `streak_events.elo_gained` column

Arena V1's `streak_events` table has a column literally named `elo_gained`, used for any challenge completion regardless of type. Reusing it for Arena V2 Common Challenges' XP path (which must never be ELO, per the frozen ELO/XP split) would mean writing XP values into a column named for ELO — confusing at best, a real bug risk at worst if some future query sums `elo_gained` expecting only ELO. Milestone 1 instead created a distinct `av2_xp_ledger`.

Worth deciding at Phase 2 (Common Challenge engine): does Arena V2 streak tracking reuse `streak_events` structurally (new row, same table, ignore the confusing column name) or get its own `av2_streaks` table? Leaning toward the latter for the same reason as #1 — but flagging rather than deciding now, since it doesn't block schema work.

## 3. Scenario Pack versioning as append-only rows vs. a dedicated `_versions` table

`av2_scenario_packs` versions by inserting a new row with the same `slug` and a bumped `version`, rather than a separate `av2_scenario_pack_versions` table (unlike Challenge Templates, which do get a dedicated `_versions` table). Chosen because a Scenario Pack version bump is just "the `scenarios` JSONB array changed," not a distinct sub-entity with its own lifecycle. If Scenario Packs grow additional versioned sub-fields beyond the scenario list, revisit whether they need the same two-table pattern as Challenge Templates.

## 4. Minimal admin model (`profiles.is_admin`)

Milestone 2 (Challenge Library CRUD) needed a write gate stronger than "any authenticated user," but the codebase has no admin/role system anywhere today — no `is_admin` column, no `requireRole`/`requireAdmin` helper existed before this milestone. Rather than block content-authoring APIs on designing a full roles/permissions system (out of scope for the frozen spec), added the smallest primitive that closes the gap: one boolean column (`arena_v2_migration/002_admin_flag.sql`, additive, defaults false) and a single `requireAdmin` middleware (`backend/server/lib/arena-v2/requireAdmin.js`).

This is a binary admin/not-admin split — no distinction between "content author" and "full admin," no audit log of who authored which template version. Fine for a small internal content team standing up Phases 2-4; revisit if Capabilio ever opens Challenge Library authoring to external partners or a larger team where a real roles/permissions model and an authorship audit trail become necessary.

## 5. Streak tracking wiring, deferred past Milestone 2

Milestone 2 built CRUD for content tables only. `av2_xp_ledger.streak_counted` still isn't wired to any aggregation logic. Correcting my own earlier note here: that's not Challenge Engine's job either (Milestone 3 only selects and assembles a payload — it never sees a submission). It belongs to whichever future milestone builds the Submission Engine / Assessment layer, where XP actually gets posted after a real, graded submission. Re-flagging so that milestone doesn't skip it.

## 6. Skill Engine / Challenge Progression are placeholder logic inside Challenge Engine, not real modules yet

The frozen blueprint assigns "next best skill" reasoning to Skill Engine and "unlock/cooldown/industry-rotation" reasoning to Challenge Progression — neither is scheduled as its own milestone in the current M1-M5 list. Milestone 3's `selection.js` implements a minimal default for both (weak-skill-first / round-robin for skill choice, mastery-state-to-tier mapping for difficulty, last-3-instances anti-repetition) directly inside Challenge Engine, behind the same function signatures (`pickNextSkill`, `pickDifficulty`, `pickTemplate`) that a real Skill Engine/Progression module would eventually own. When those modules get built, swap the implementation, not the call sites in `engine.js`. Not a spec contradiction — just sequencing; flagging so it isn't mistaken for the final word on progression logic (no cooldowns, no industry rotation are implemented yet — only anti-repetition on the last 3 instances per skill).

## 7. Instance persistence intentionally deferred to Milestone 4 — RESOLVED

Milestone 3's `selectAndGenerateChallenge` returned an in-memory Challenge Payload only. Milestone 4's `validator.js` now calls Milestone 3's exported `insertChallengeInstance` after both gates pass, closing this loop exactly as planned. Leaving this entry as a record of the handoff rather than deleting it.

## 9. No API route exposed for the Validator (or the Engine) yet

Milestones 3 and 4 are library-only — no Express route calls `selectAndGenerateChallenge` or `validateAndIssue` yet, matching your own milestone template for both (neither listed "APIs" as a deliverable; M2 was the only one that did). The natural place to expose the student-facing "give me my next challenge" endpoint is once Workstation Router (Milestone 5) exists, since that's the module that actually hands a Workstation-ready response back to the frontend — wiring a route now would mean either a route with no workstation to route to, or building Workstation Router's job early. Flagging so it isn't mistaken for an oversight.

## 10. Rejection-logging failures aren't isolated from the validation result

In `validator.js`, `repo_log()` awaits `logRejection` then `emitAnalyticsEvent` before the `PayloadRejectedError` is thrown. If the logging/analytics write itself fails (e.g. DB hiccup), that error propagates instead of the original `PayloadRejectedError` — the caller would see a generic DB error rather than a clean rejection with `gate`/`issues`. Currently intentional (fail loudly rather than silently drop a rejection record), but worth revisiting once there's real production traffic: consider wrapping the logging calls in their own try/catch that logs-and-swallows, so a logging outage never masks the actual validation outcome.

## 11. No API route exposed for the Workstation Router either — this is where student-facing serving actually belongs — RESOLVED

Milestone 6 (Challenge Delivery API) built exactly this: `POST /api/av2/challenges/next` runs Engine → Validator → Router in one request via `challenge-delivery/service.js`, with resume-vs-issue semantics (an in-progress, non-expired instance is reused rather than regenerated). Leaving this entry as a record rather than deleting it.

## 13. `GET /active` duplicates a few lines of `service.js`'s resume path

`arenaV2Delivery.js`'s `GET /active` handler re-implements "fetch active instance → check expiry → route it" inline rather than calling `getOrIssueChallenge` in some kind of "peek, don't issue" mode, because `service.js` doesn't have a peek-only entry point — it always falls through to issuing if nothing active is found. This is a few lines of duplication (fetch + expiry-check + route), not a correctness risk, since both paths call the same underlying `isInstanceExpired`/`routeToWorkstation` functions. Worth a small refactor (e.g. a `peekActiveChallenge` export from `service.js`) if this drifts further, but not worth blocking Milestone 6 on.

## 14. No scheduler wired up for `expire-sweep`

`POST /api/av2/challenges/expire-sweep` (admin-only) exists and does a real bulk update, but nothing calls it automatically — no cron job, no scheduled task. Until then, `getOrIssueChallenge`'s lazy check-on-read expiry (an instance is only marked `expired` when a student's next `/next` call happens to touch it) is the only expiry mechanism actually running. That's sufficient for correctness (a student can never act on an expired instance) but means the DB can accumulate stale `issued`/`in_progress` rows for abandoned challenges indefinitely until swept. Wire a real schedule (e.g. hourly) once there's an actual task scheduler in the infra — not a Milestone 6 concern.

## 15. `validator` is now a permanent DTO exclusion — flagging as an invariant to protect, not a TODO

Not a deferred item, but worth recording prominently since it's a security decision rather than an implementation detail: `buildChallengeResponseDto` (`challenge-delivery/dto.js`) must never include the `validator` field, because several validator configs carry the grading answer key itself (`ground_truth_compare`'s `groundTruthQuery`, for one). `dto.test.js` asserts this by string-searching the serialized DTO for known-secret substrings. Any future change to `dto.js` should keep that test passing rather than relaxing it.

## 12. `componentKey` values are a naming convention only, not verified against real frontend components

`registry.js` invents component key strings (`"SqlWorkstation"`, `"ReactFrontendWorkstation"`, etc.) for the frontend to eventually map to real React components. Milestone 5 has no visibility into `frontend/src/pages/ArenaWorkstations.jsx` (Arena V1's real, working workstation components) — whether these keys should instead reuse Arena V1's existing component names, or whether Arena V2's frontend will be new components entirely, is a frontend-milestone decision, not a backend one. Worth deciding explicitly whenever frontend work starts, so the naming isn't invented twice.

## 8. Workstation versioning is a static placeholder map

`engine.js`'s `WORKSTATION_VERSIONS` hardcodes every workstation to `"v1"` — there's no Milestone 1 table tracking workstation versions (the blueprint's Phase 1 DB list doesn't include one; versioning for workstations was likely intended to live with Workstation Router, Milestone 5). Revisit there rather than growing ad hoc version logic inside Challenge Engine.

## 16. Milestone 7 ships exactly 1 of 13 workstations — 12 are deliberate placeholders, not a hidden gap

`FRONTEND_WORKSTATION_REGISTRY` (`frontend/src/arena-v2/workstationRegistry.js`) lists all 13 `componentKey` values from the backend's Workstation Router registry, but only `SqlWorkstation` is marked `"ready"`. The other 12 (`CodeWorkstation`, `NotebookWorkstation`, `ReactFrontendWorkstation`, `ApiWorkstation`, `TerminalWorkstation`, `ExcelWorkstation`, `DashboardWorkstation`, `ReportWorkstation`, `SystemDesignWorkstation`, `EmbeddedWorkstation`, `CalculatorWorkstation`, `FullStackWorkstation`) are `"not_integrated"` — `ArenaV2ChallengeShell.jsx` renders an honest "not wired up yet" notice for any of them rather than crashing or faking a render. This is the explicit scope boundary of this milestone (one real, working workstation end-to-end), not an oversight. Each subsequent workstation should be added the same way: implement the component, flip its registry entry to `{status: "ready", importPath: ...}`, add it to `loadWorkstationComponent`'s switch in the shell.

## 17. `SqlWorkstationV2.jsx`'s payload field names are inferred, not yet confirmed against the Challenge Engine's payload generator

The component reads `payload.prompt`, `payload.datasetSchemaDescription`, `payload.datasetSeedSql`, and `payload.starterQuery` for SQL-workstation challenges. These names were inferred from the Arena V2 content spec's SQL contract rather than cross-checked line-by-line against `challenge-engine/payloadGenerator.js`'s SQL branch (Milestone 3). Before this workstation goes in front of real students, verify the exact field names match what the backend actually puts on the payload for `workstation: "sql"` challenges — a name mismatch here would silently show "no datasetSeedSql" errors rather than a wrong-but-working query, so it should surface immediately in manual testing, but it's worth a deliberate confirmation pass rather than relying on that.

## 19. `sql.js` added as a real backend (Node) dependency — Milestone 8

05-validators.md's `ground_truth_compare` contract is explicit: "Executes the ground-truth query against the same seeded sql.js DB the student queried." Trusting a client-reported result instead would mean grading is only as honest as whatever the browser sends — a direct violation of "never trust client input." So the backend now builds its own fresh sql.js database per grading call, from the same pinned `dataset_version.seed_sql` the student's workstation used, and re-executes both the student's submitted SQL and the ground-truth query server-side (`submission-validators/sqlEngine.js`). Confirmed `sql.js` runs under plain Node with zero CDN/locateFile config (unlike the frontend's CDN-loaded copy) — added to `package.json` pinned to `^1.10.3`, matching the frontend's CDN version, so the two execution contexts stay on the same SQLite build even though they load it differently. Run `npm install` before deploying this milestone.

## 20. Only `ground_truth_compare` has a real submission-validator — the other 10 types throw `NotImplementedValidatorError`

Mirrors Milestone 7's own honest-placeholder discipline for workstations: `submission-validators/registry.js` only implements `ground_truth_compare`, because it's the only validator type the one wired-up workstation (SqlWorkstation) needs. The other 10 (`test_case_judge`, `published_result_compare`, `live_render_probe`, `http_assertion`, `command_output_match`, `formula_result_check`, `kpi_compare`, `rubric_review`, `numeric_tolerance`, `register_match`) throw a typed, loggable error rather than a fake "always passes" stub — a stub would be a scoring-integrity bug (free credit for ungraded work), not a shortcut. As each additional workstation from Milestone 7's remaining 12 gets built, implement its validator type here the same way `groundTruthCompare.js` was added.

## 21. Assessment's rubric/AI-supplement/timing-modifier fields are threaded through but not yet populated by anything real

`assessment/scoring.js`'s `computeFinalScore` accepts `rubricScore`, `aiReviewScore`, `aiReviewWeight`, and `timingModifier` as real parameters — the *shape* of Assessment ("validator + rubric + capped AI supplement + timing + code quality — never AI-only," per the `av2_assessments` schema comment) is correct now, but `assessment/engine.js` always passes `null`/`0` for all of them today, since `ground_truth_compare` never produces a rubric score or an AI review. Once `rubric_review` gets a real submission-validator implementation (which explicitly involves a capped AI supplement per 05-validators.md), wire its output into these parameters — the combination math in `scoring.js` doesn't need to change, only `engine.js`'s inputs. `computeTimingModifier()` is a literal placeholder returning `0` — there's no signal yet to compute a graduated bonus/penalty from; only the binary timeout flag exists today, handled separately via the zero-effort cap.

## 22. Grading is synchronous in this milestone — no queue/worker

`submission-engine/service.js` runs the Validator and Assessment stages inline within the `POST /api/av2/submissions` request, unlike Arena V1's async `grading-worker.js` job-queue pattern. This is fine for `ground_truth_compare` (a sql.js query typically grades in well under a second — see the test suite's own timings). If a future validator type is genuinely slow (e.g. a Pyodide-based Python grader, or an AI-review call with real network latency), revisit whether it needs to queue rather than block the request — the schema's `av2_submissions.status` enum already includes `'queued'`/`'running'` for exactly this, unused today because nothing needs it yet.

## 23. ELO/XP/Skill Progression are explicitly NOT written by this milestone

`assessment/engine.js` writes only to `av2_assessments`. It does not read or write `av2_elo_ledger`, `av2_xp_ledger`, or `av2_skill_progress` — those are your own Milestone 9 ("ELO/XP/Skill Progression"), not part of this one. `engine.test.js` includes an explicit test asserting no other repository function is called besides `insertAssessment`, so this boundary doesn't quietly erode as Milestone 9 gets built alongside it.

## 24. Concurrent double-submission is handled, but only at the database-constraint level

`av2_submissions` has `UNIQUE (instance_id, attempt_number)`. `submission-engine/repository.js`'s `insertSubmission` catches Postgres's `23505` (unique_violation) and maps it to a typed `ConcurrentSubmissionError`, which the route maps to `409 Conflict` rather than a raw `500`. This covers the literal race (e.g. a double-click or a retry-on-timeout resending the same attempt), but there's no application-level idempotency key — a client that legitimately wants to retry a *failed network call* (not a duplicate click) has no way to signal "this is the same attempt, don't count it twice." Worth an idempotency-key parameter on the Submission API if retry-driven duplicate attempts turn out to be common in practice.

## 25. `arenaV2Client.js` — shared fetch/auth/timeout base extracted between the Delivery and Submission clients

When `arenaV2Submission.js` (this milestone) needed the exact same `requestJson`/`authHeaders` logic `arenaV2Delivery.js` already had, it was extracted into `arenaV2Client.js` rather than duplicated a second time — the same "centralize auth/retries/error-handling in one place" principle you specified for workstations-vs-Submission-Client, applied one layer down between the two API client files themselves. `arenaV2Delivery.js`'s external exports are unchanged; only its internals now import from the shared base.

## 18. sql.js loader (`loadSqlJs`) is shared, unmodified, between Arena V1 and Arena V2

`SqlWorkstationV2.jsx` imports `loadSqlJs` from the existing `frontend/src/services/workstationEngine.js` rather than duplicating the CDN-load logic — that function only does "load sql.js from CDN and return the SQL constructor," with no mission-specific or Arena-V1-specific logic in it, so sharing it doesn't couple V2 to V1's data model. Everything V1-specific (`buildDataset`, `getMissionDb`, the synthetic scenario generator) was deliberately NOT reused — V2 seeds its database from the real `payload.datasetSeedSql` instead. If `workstationEngine.js` is ever split apart during Arena V1's eventual retirement, `loadSqlJs` should be extracted into a shared, Arena-version-agnostic module first so V2 doesn't lose it.
