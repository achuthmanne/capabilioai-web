# Skill Studio V2 — Production Build Specification
**Capabilio AI Skill Operating System — Learning Engine Redesign**
Date: 2026-07-29 · Status: Draft for engineering review · Author: AI architecture pass (grounded in current repo state)

---

## 0. Grounding — what exists today (read this before anything else)

This spec **extends** real, already-shipped systems. It does not invent a parallel stack. Before proposing anything new, here is what was actually found in the repo:

| Concern | Reality today | File(s) |
|---|---|---|
| Skill Studio UI | A single 1,350-line React page. Computes gaps, decay, and recommendations **client-side** from Arena history + `user_skills`, heuristically (score thresholds, hardcoded weights). No persisted module/quiz/memory state. | `frontend/src/pages/SkillStudio.jsx` |
| Skill Studio backend | Two **stateless** AI-generation endpoints. No DB writes. Every call regenerates from scratch (marked "STICKY" in comments but nothing actually caches server-side — caching is a TODO, not built). | `backend/server/routes/skillStudio.js` (`/lesson`, `/learning-path`, `/youtube`, `/resources`) |
| "Skill graph" | **There is no graph.** A prior attempt at a `skill_graph` table was never migrated. `skillGraph.js` routes were retargeted onto the flat `user_skills` table (columns: `name`, `slug`, `group_type`, `confidence` 0–1, `level_score` 0–100, `verified`, `source`). This is documented in the route file itself as a "schema fork" correction. | `backend/server/routes/skillGraph.js` (comment block), `PROFESSIONAL_PATH_ARCHITECTURE.md` |
| Skill gaps vs. market | `POST /api/skill-gap` — Gemini + Google Search grounding, 6-hour in-memory cache per domain. Validates against placeholder patterns before trusting AI output. | `backend/server/routes/skillGap.js` |
| Evidence / proof | **`proof_objects`** table + builder already exists and is the real Evidence Artifact model — built for Arena V2, source-tagged (`source: "arena_v2"`), with `publish_state` (auto_published / not_published / not_applicable), `aiEvaluation`, `validatorResult`, `skillsDemonstrated`, `tags`. This is exactly the shape "evidence artifacts" need — it must be **reused with `source: "skill_studio"`**, not duplicated. | `backend/server/lib/arena-v2/proofObjects/{builder,repository,legacyBuilder,academicBuilder,domains}.js` |
| ELO | **Do not add a sixth ELO formula.** There is already a dedicated, tested, bounded engine: `professionalElo/eloEngine.js` (STARTING_ELO 800, MIN 400, MAX 2400, ±40 max per event, 14-day decay grace, capped catch-up). Four duplicate ELO formulas were already found uncapped and fixed on 2026-07-27 (see memory `capabilio-elo-cap-2026-07-27`). Arena V2 has its own `reward-engine/{eloFormula,xpFormula,skillProgress,engine}.js` for challenge-based ELO. Skill Studio must **call into these**, never reimplement. | `backend/server/lib/professionalElo/eloEngine.js`, `backend/server/lib/arena-v2/reward-engine/*` |
| Domain/role taxonomy | Already unified (2026-07-27) into `roleConfig.js` (`auraSkills`), plus `skillModules.js`, `skillGroups.js`, `arenaDomains.js`, `domainChallenges.js`. Three previously-divergent skill-name lists were the root cause of a radar-chart bug — **do not introduce a fourth.** | `frontend/src/config/{roleConfig,skillModules,skillGroups,arenaDomains,domainChallenges}.js` |
| Arena V2 pipeline | Real, tested: `challenge-engine`, `challenge-delivery`, `submission-engine`, `submission-validators`, `reward-engine`, `proofObjects`, `portfolio`, `workstation-router`, `events`. This is the validation endpoint Skill Studio must hand off to — not reinvent. | `backend/server/lib/arena-v2/*` |
| Mission generation | `missionCompiler.js` (parameterized template library) already generates simulation-backed Arena missions per stream (built 2026-07-20, memory `capabilio-mission-compiler`). Skill Studio's Arena unlock logic should call this, not a new generator. | `backend/server/lib/arena/missionCompiler.js` |
| AI routing | `groq.js` (fast, cheap, JSON mode), `gemini.js` (Flash, native JSON + Google Search grounding), `/api/chat` → Claude Haiku → Groq fallback for multi-turn tutor chat. This 3-provider routing pattern (cheap-first, capability-matched, hard fallback) is the house style and should be preserved, not replaced with a single-provider design. | `backend/server/lib/{groq,gemini}.js`, `backend/server/routes/chat.js` |
| MCP layer | Real SDK, auth, RBAC, tool registry already built (`mcp/src/tools`, `mcp/src/shared`). Gaps: tool-name mismatches, missing reasoning tools, and backend AI routes that bypass MCP entirely (memory `capabilio-mcp-layer-state`). New Skill Studio AI tools should register through this layer, not call `groq`/`gemini` directly from routes forever — but this is a phased migration, not a rewrite (Phase 5 below). | `mcp/src/tools/*` |
| Verification / RLS | `verification/`, `verification/providers/` for cert/EPFO verification; RLS is enforced on `user_skills`, `proof_objects`, and friends — confirmed via the 2026-07-16 certification audit that specifically hunted for anon-executable RPC backdoors and fixed them (memory `capabilio-cert-audit-2026-07-16`). Any new table **must** ship RLS from the first migration, no exceptions, no "add it later." | `backend/server/lib/verification/*`, `backend/migrations/2026-07-16_*` |

**Implication for this entire spec:** Skill Studio V2 is framed as (a) a new persistence layer that was genuinely missing, (b) a new orchestration layer over content generation that was genuinely missing, and (c) **wiring**, not replacement, everywhere Arena, ELO, proof, and role config already have a real answer. Every section below calls this out explicitly where it applies.

---

## 1. Product Principles

1. **Skill Studio has no "courses."** The unit of the product is the **Skill Journey** — a live, per-user, per-skill state machine, not a static content page. A journey is generated, not authored, and its state lives in Postgres, not in component state.
2. **Nothing is learned without being tested, and nothing is tested without producing evidence.** Every module ends in an assessment; every passed assessment writes a row to `proof_objects` (`source: "skill_studio"`). A module with no assessment is not shippable.
3. **Arena is the ground truth, Skill Studio is the runway.** Skill Studio never re-derives mastery independently of Arena outcomes — when Arena and Skill Studio disagree about a skill's confidence, Arena wins, because Arena is validated, adversarial, and unassisted while Skill Studio practice is scaffolded and hinted.
4. **Memory decays by default.** A skill that hasn't been touched (practiced, quizzed, or Arena-validated) in N days loses confidence on a schedule, and the system resurfaces it before the learner forgets, not after.
5. **AI output is never authoritative over scoring.** Generated lessons, quizzes, and explanations are probabilistic content. Grading logic for anything that moves ELO or `level_score` runs through deterministic validators or a rubric-scored, weight-capped AI review — identical posture to how Arena V2 already separates `validator_score` from `ai_review_score` with a bounded `ai_review_weight`.
6. **One skill taxonomy.** `roleConfig.js` + `skillGroups.js` are canonical. Skill Studio does not define its own skill names, slugs, or domain keys.
7. **Recruiter trust is a first-class rendering target, not an afterthought.** Every screen in the learner-facing product has a recruiter-readable counterpart already implied by its data — this spec is written so the Recruiter Evidence Model (§10) is a *read view* over the same rows, not a separate pipeline.
8. **Backward-compatible by default.** All new tables are additive. `user_skills` gains no breaking column changes. Existing `/api/skill-studio/*` routes keep working during migration (old client, if any external caller exists, does not 404).

---

## 2. Information Architecture

Top-level surfaces under `/skill-studio`:

| Surface | Purpose | Primary actions | Data shown | Transitions |
|---|---|---|---|---|
| **Learning Home** | Daily entry point; "what should I do right now" | Resume journey, start recommended action, view streak | Active journeys, top 3 recommendations (from Recommendation Engine §5), decay alerts, ELO/mastery snapshot | → Skill Journey, → Memory Revision (if decay alert clicked) |
| **Skill Graph** | Visual map of the learner's skill space vs. target role | Filter by domain, click node → journey, see prerequisite chains | Nodes = skills (from `user_skills` + `skill_graph_nodes` catalog), edges = `skill_graph_edges`, color = mastery band | → Skill Journey Page |
| **Skill Journeys (list)** | All journeys, in-progress and completed | Start new journey, archive, reorder priority | `skill_journeys` rows with status, % complete, last activity | → Skill Journey Page |
| **Skill Journey Page** | The "course page" replacement — one skill's full lifecycle | Start module, view concept map, jump to Arena/Interview bridge | Journey metadata (objective, why-it-matters, job/salary relevance), module list with state, evidence trail | → Module Runtime, → Arena Bridge, → Interview Bridge |
| **Module Detail / Runtime** | Where actual learning happens | Switch teaching mode, use playground, take quiz, chat with tutor | Module content blocks, playground state, quiz progress | → Adaptive Quiz, → Memory Revision (post-completion), → next module |
| **Practice Lab** | Deliberate practice outside a specific module — freeform drills | Pick a weak skill, get infinite generated practice items | `practice_tasks` generated on demand, tied to `mistake_patterns` | → Adaptive Quiz (same engine, practice mode) |
| **Adaptive Quiz** | Assessment surface, reused by modules, practice lab, and memory revision | Answer, request hint (costs confidence), retry | `quiz_questions`, live-generated variants, adaptive difficulty | → Module completion, → Evidence write, → Arena/Interview gate check |
| **Memory Revision** | Spaced-repetition surface | Review resurfaced concepts, quick-drill | `memory_states` due for review, decay severity | → Adaptive Quiz (revision mode) → back to Home |
| **Arena Bridge** | Explicit "you are ready" handoff screen | Accept mission, view unlock criteria still unmet | Readiness score, unlock checklist, suggested `arena_missions` (via `missionCompiler.js`) | → Arena V2 (external surface) |
| **Interview Bridge** | Mock-interview generation grounded in the exact journey | Start mock interview, review past sessions | Grounded question set (module + mistakes + evidence + role target) | → Interview session (voice/live-coding), → Evidence write |
| **Evidence / Portfolio** | Recruiter-facing proof trail for this skill | Publish/unpublish artifact, view what recruiters see | `proof_objects` filtered `source IN ('skill_studio','arena_v2')`, publish_state | → Recruiter Proof Drawer (read-only) |
| **Progress / Mastery** | Cross-skill mastery dashboard | Compare vs. role target, see trend over time | `mastery_snapshots`, ELO deltas | (dashboard, few transitions out) |
| **Recommendations** | Full ranked list (Home only shows top 3) | Accept/dismiss/snooze a recommendation | `recommendation_snapshots` | → whatever surface the recommendation targets |
| **Saved / Drafts** | Bookmarked modules, in-progress generated content not yet started | Resume draft | `module_state` with `status = 'draft'` | → Module Runtime |
| **Mentor / Creator** | Human-authored or human-reviewed content entry point | Submit source material, review AI-generated draft before publish | `content_sources`, `generation_jobs` in `pending_review` | → Admin/Content Ops (for approval) |
| **Admin / Content Ops** | Content QA console | Approve/reject generated modules, edit generated content, monitor generation job health | `generation_jobs`, flagged content, quality metrics | (internal only) |

---

## 3. Data Model (conceptual)

```
User ──has many──> SkillJourney ──has many──> Module ──has many──> ModuleContentBlock
SkillJourney ──references──> SkillGraphNode (catalog, shared across users)
Module ──has one──> ModuleState (per-user runtime state)
Module ──has many──> PracticeTask
Module ──has many──> QuizAttempt ──has many──> QuizQuestion (instance, generated)
SkillGraphNode ──has many──> MemoryState (per-user)
MemoryState ──has many──> DecayEvent
Module (on completion) ──produces──> EvidenceArtifact (proof_objects row, source=skill_studio)
Module ──unlocks──> ArenaMission (via missionCompiler + readiness check)
Module ──unlocks──> InterviewSession
Module/EvidenceArtifact ──optionally exports to──> PulseExport
EvidenceArtifact ──read by──> RecruiterView
All user-facing actions ──emit──> LearningEvent (event stream, feeds analytics + recommendation engine)
```

The catalog layer (`SkillGraphNode`, `SkillGraphEdge`, module *templates*) is shared and versioned. The per-user layer (`ModuleState`, `MemoryState`, `QuizAttempt`) is instance data. This split is what makes content generation cacheable — a module template for "React useEffect, Intermediate, for Frontend Engineer" is generated once and reused across every learner who matches that (skill, level, role) tuple, while `module_state` tracks each learner's individual progress through it. This directly fixes the "STICKY" caching that today's `skillStudio.js` comments claim but never implement.

---

## 4. Knowledge Graph Architecture

### Node types
`Skill`, `Concept`, `Module`, `PracticeTask`, `Assessment`, `ArenaMission`, `InterviewBlock`, `EvidenceArtifact`, `Resource`, `MistakePattern`, `CareerGoal`, `JobRole`.

`Skill` nodes are **not** a new invention — they are backed by the existing skill taxonomy (`roleConfig.js` `auraSkills`, `skillGroups.js`). The catalog table `skill_graph_nodes` stores one row per canonical skill *and* per concept beneath it, with `node_type` discriminating `skill` vs `concept`. This is additive: `user_skills` remains the per-user mastery ledger; `skill_graph_nodes` is the new shared catalog it should have always pointed at. A migration step (§13) backfills `skill_graph_nodes` from the distinct `(name, slug, group_type)` tuples already present in `user_skills` plus `roleConfig.js`, so no learner's existing mastery data is orphaned.

### Edge types
`PREREQUISITE_OF`, `REQUIRES`, `REINFORCES`, `VALIDATES`, `PRODUCES_EVIDENCE`, `UNLOCKS`, `PREPARES_FOR`, `RELATED_TO`, `WEAKENS`, `RECOVERS`, `RECOMMENDS_NEXT`.

Concretely:
- `Concept --PREREQUISITE_OF--> Concept` (or `Skill`) — hard gate, blocks module start until prerequisite `mastery >= threshold`.
- `Module --VALIDATES--> Skill` — completion + passing quiz moves `user_skills.confidence`/`level_score`.
- `Module --PRODUCES_EVIDENCE--> EvidenceArtifact` — always true on pass, never optional (Principle #2).
- `Assessment --UNLOCKS--> ArenaMission` — readiness criteria met (§7).
- `MistakePattern --WEAKENS--> Skill` — repeated errors decrement confidence beyond natural decay.
- `MemoryRevision --RECOVERS--> Skill` — successful spaced-repetition review restores confidence toward pre-decay level, never above it in one step.
- `Skill --RECOMMENDS_NEXT--> Skill` — output edge of the recommendation engine, cached as `recommendation_snapshots`, not recomputed synchronously on every page load.

### Traversal logic
Prerequisite gating is a topological check: a module cannot enter `available` state until every `PREREQUISITE_OF` in-edge's source node has `user_skills.level_score >= prerequisite_threshold` (default 60, overridable per edge). Recommendation traversal is a bounded best-first search from the learner's weakest `k` skills (by decayed confidence), scored by: job-role relevance weight (from target `JobRole` node) × urgency (decay severity) × unlock leverage (how many downstream nodes this skill unlocks) × recency of last Arena signal. This is a deterministic scoring function, not an LLM call — the LLM is only used to generate the human-readable "why" copy for a recommendation already selected algorithmically, never to select it (Principle #5 applies here too: don't let a probabilistic system make the prioritization decision).

---

## 5. Learning Engine Architecture

The Learning Engine is a backend service (`backend/server/lib/skillStudio/learningEngine/`) with four responsibilities, each independently testable:

1. **Journey Planner** — given `(userId, targetRole, currentSkillState)`, produces/updates the ordered `skill_journeys` + `modules` scaffold. Runs on: onboarding completion, role-target change, and weekly recompute job (not on every page load).
2. **Content Generator** — given a `(skill, concept, level, teaching_mode)` tuple, produces a module template (cached in `module_content_blocks`, keyed by that tuple hash) or returns the cached one. This is where `gemini.js`/`groq.js` calls actually happen, and where the fix for today's fake "STICKY" comment lives: a real cache-or-generate check against the DB, not a client-side assumption.
3. **Recommendation Engine** — the deterministic scorer from §4, run as a queued job (not inline per-request) that writes `recommendation_snapshots`, invalidated on: module completion, Arena result ingestion, memory decay event, or 24h TTL.
4. **Adaptive Difficulty Controller** — per active quiz/practice session, adjusts next-question difficulty based on rolling accuracy + response latency + hint usage, bounded so difficulty can move at most one band (Beginner→Intermediate, etc.) per 3 questions, preventing whiplash.

All four write to a single `learning_events` append-only log (§13), which is the substrate both the Memory Engine (§6) and analytics (§26) read from — one event stream, multiple consumers, no duplicated state.

---

## 6. Memory and Decay Architecture

`memory_states` holds one row per `(user_id, skill_graph_node_id)`: `confidence` (0–1), `last_reinforced_at`, `review_count`, `ease_factor` (SM-2-style spaced repetition multiplier), `next_review_due_at`.

**Decay rule:** confidence decays exponentially with a per-skill half-life derived from `ease_factor` — a skill reviewed successfully many times decays slower. Decay is computed **lazily** (on read, not via a cron writing every row every day) as `confidence_now = confidence_at_last_review * exp(-Δdays / half_life)`, and materialized into a `decay_events` row only when it crosses a threshold band (e.g., "high" confidence → "medium") so the memory panel has discrete, explainable transitions to show the learner rather than a silently sliding number.

**Reinforcement rule:** a correct quiz answer, a completed practice task, or a passed Arena mission on the same skill all call the same `reinforce(userId, skillNodeId, source, strength)` function. `strength` is source-weighted: Arena pass > quiz pass > practice completion > module read-through — mirroring Principle #3 (Arena outranks scaffolded practice).

**Resurfacing logic:** a nightly job (or on-demand at Learning Home load, capped to top 5) computes `next_review_due_at` per SM-2 scheduling and pushes due items into the Memory Revision surface. Critically, **the Recommendation Engine treats an overdue memory-review item as a higher-priority recommendation than starting a brand-new skill** once decay severity crosses "high" — this is the concrete mechanism for "bring back weak concepts before the learner forgets too much," not a vague aspiration.

**Recovery rule:** a successful revision review restores confidence toward (not to) its pre-decay value: `new_confidence = old_confidence + recovery_rate * (pre_decay_confidence - old_confidence)`, `recovery_rate` typically 0.6–0.8, so recovery is fast but a learner can't game full mastery back with a single lucky revision — full recovery still requires demonstrated performance, consistent with the "verification before evidence" rule.

---

## 7. Arena Integration Architecture

Skill Studio does not gate Arena access by opinion — it gates by a computed **readiness score** derived from: (a) module quiz pass rate on the target skill ≥ 70%, (b) at least one practice task completed with no unresolved `MistakePattern` flags above severity 2, (c) memory confidence ≥ 0.6 at time of check (not decayed below threshold since last practice).

**Unlock flow:**
1. Skill Journey Page computes readiness client-side from `module_state` + `memory_states` (cheap, no round trip) and shows the Arena Bridge CTA once all three conditions are true.
2. Arena Bridge calls `POST /api/skill-studio/arena/handoff` with `{ userId, skillNodeId }`. Backend re-verifies readiness server-side (never trust client-computed readiness for anything that unlocks Arena — Arena outcomes affect ELO, so this is a scoring-adjacent boundary and must be idempotent and server-validated per the standing backend rule).
3. On server confirmation, the handoff calls into `missionCompiler.js` with the skill/domain/stream context to select or generate a matched mission — **reusing the existing compiler**, not building a second mission selector.
4. Arena V2's own pipeline (`challenge-engine` → `submission-engine` → `reward-engine`) runs as it already does today, independent of Skill Studio.
5. **Result ingestion**: Arena V2 emits an `AssessmentCompletedEvent` (already defined at `arena-v2/events/assessmentCompletedEvent.js`); Skill Studio subscribes to this event (not polls) and on receipt: (a) calls `reinforce()` on the Memory Engine for the validated skill, (b) checks branch logic below.
6. **ELO update**: happens inside Arena V2's own `reward-engine/engine.js`, exactly as today. Skill Studio never writes ELO directly.
7. **Evidence generation**: already happens via `proofObjects/builder.js` on the Arena side. Skill Studio's contribution is only to **link** its own `module_state.id` into the proof object's `sourceRef` when the mission originated from a Skill Studio handoff, so the evidence trail can show "this was practiced in Skill Studio, then proven in Arena" — a `source_context` field addition to the existing builder, not a new evidence pipeline.
8. **Next-skill branching**: pass → Recommendation Engine reprioritizes (this skill drops in urgency, next prerequisite-unlocked skill rises). Fail → a `MistakePattern` is derived from the Arena submission's validator/rubric detail and written back, which the Recommendation Engine treats as a high-urgency "revisit this module" signal — this is the concrete mechanism making Arena feel like "the proof layer of the same journey" rather than a separate app.

---

## 8. Interview Integration Architecture

`interview_sessions` are generated grounded in three real inputs, never invented: (1) the exact `module_content_blocks` studied, (2) the exact `MistakePattern` rows accumulated for this skill, (3) the exact `proof_objects` evidence already produced, plus (4) the target `JobRole`.

Generation pipeline: a structured prompt template assembles these four inputs into context, calls the model (Claude Haiku via `/api/chat`'s existing routing for conversational/voice interview turns; Gemini/Groq for one-shot question-set generation, consistent with house AI routing), and returns a typed question set: `technical[]`, `debugging[]` (seeded directly from `MistakePattern` — if the learner made an off-by-one error twice, a debugging question reproduces that exact class of bug), `architecture[]`, `behavioral[]`.

**Scoring**: technical/debugging/architecture questions score via the same validator-first, AI-review-capped pattern as Arena (deterministic check where possible — code compiles/runs/passes tests — with AI rubric review bounded to a capped weight for subjective quality). Behavioral questions are AI-scored against a rubric only, clearly labeled as such, and explicitly **do not** move `level_score`/ELO — they inform recruiter-facing "communication" evidence only, never core skill mastery, to avoid an ungrounded AI judgment silently affecting a number that gates Arena/hiring signal.

**Feedback**: structured per-question, plus an aggregate session summary. **Mastery effect**: a passed interview session on a skill acts as a `reinforce()` call at "quiz-pass" strength (same tier as an adaptive quiz pass, below Arena) — interview prep is validation-adjacent but not adversarial/unassisted the way Arena is, so it sits between practice and Arena in the trust hierarchy.

A completed session (technical or full mock) also produces a `proof_objects` row (`source: "skill_studio_interview"`), gated by the same `publish_state` machinery as everything else — recruiters can optionally see "completed 3 mock interviews for this role, avg score 82%" if the learner chooses to publish it.

---

## 9. Pulse Integration Architecture

On module completion or Arena-validated project submission:
1. Learning Engine calls a **Pulse Export Composer**: extracts a summary (skill, what was built/learned, evidence link) from the `proof_objects` row just created.
2. **Public by default**: nothing. Every export requires explicit learner action — this is a hard product rule, not a UX nicety, because `proof_objects` may contain draft/failed attempts (`publish_state: not_published`), and auto-posting failure states to a public feed would be actively harmful to the learner.
3. **Auto-suggested, not auto-posted**: the composer pre-fills a draft Pulse post (title, artifact link, skill tags) and surfaces it as a one-tap "share to Pulse" prompt after a *passing* module/Arena result only (`publish_state IN ('auto_published')`).
4. **Proof posts vs. ordinary posts**: a `pulse_exports` row carries a `proof_object_id` FK; Pulse's rendering layer (already distinguishes verified content elsewhere per the Trust Center work — memory `capabilio-vault-trust-center-ui`) shows a distinct "Verified Proof" badge sourced from the linked `proof_objects.publish_state`, not from a client-side flag, so it can't be spoofed by editing a normal post to look verified.
5. **Approval requirement**: mentor/creator-authored content that references a learner's work (e.g., a mentor highlighting a student's project) requires the learner's explicit consent record before publish — a `pulse_exports.consent_at` timestamp, null blocks render.

---

## 10. Recruiter Evidence Architecture

This is a **read view**, not a new data pipeline. `RecruiterProofDrawer` (component, §16) queries:

```
proof_objects
  WHERE user_id = :learner
    AND publish_state IN ('auto_published')  -- never draft/not_applicable, enforced server-side
    AND (source IN ('arena_v2','skill_studio','skill_studio_interview'))
JOIN skill_graph_nodes ON proof_objects.skill -> node
JOIN memory_states ON (user_id, skill_graph_node_id) -- for recency/confidence display
```

Recruiter-answerable questions map directly to columns already in the proof object shape plus the memory join: *what was studied* → `title`/`problemStatement`; *how they practiced* → `sourceRef` + linked `module_state`; *how well they performed* → `aiEvaluation`/`validatorResult`; *how recent* → `created_at` + `memory_states.last_reinforced_at` (a stale-but-once-strong skill is flagged distinctly from a currently-strong one — recruiters see decay, they don't get a frozen snapshot pretending mastery is permanent); *how trustworthy* → `source` (Arena V2 unassisted > Skill Studio quiz > interview mock, surfaced as a trust tier, not hidden).

`recruiter_views` logs every drawer open (`recruiter_id`, `learner_id`, `viewed_at`, `sections_viewed[]`) — both for the learner-facing "who's looked at your proof" signal and for recruiter engagement analytics (§26). This table is append-only and RLS-scoped so a recruiter can only see their own view log, and a learner can only see aggregate counts, not individual recruiter identities, unless the recruiter's org has an explicit disclosure agreement (existing `orgVerification.js`/`company.js` permission boundary — reused, not reinvented).

---

## 11. Backend Architecture

New service directory: `backend/server/lib/skillStudio/`

```
skillStudio/
  learningEngine/
    journeyPlanner.js
    contentGenerator.js
    recommendationEngine.js
    difficultyController.js
  graphService/
    traversal.js        // prerequisite + recommendation graph walks
    catalogSync.js       // syncs skill_graph_nodes from roleConfig.js/skillGroups.js
  quizService/
    questionGenerator.js
    scorer.js
    hintEngine.js
  memoryService/
    decay.js
    reinforcement.js
    resurfacing.js
  evidenceBridge/
    moduleToProofObject.js   // thin adapter into arena-v2/proofObjects/builder.js
  arenaBridge/
    readinessCheck.js
    handoff.js               // calls missionCompiler.js
    resultIngestion.js        // subscribes to AssessmentCompletedEvent
  interviewBridge/
    questionGenerator.js
    scorer.js
  pulseBridge/
    exportComposer.js
  recruiterView/
    proofQuery.js
  analytics/
    eventLogger.js
  contentOps/
    generationJobRunner.js
    reviewQueue.js
```

**Communication pattern**: services communicate via direct function calls within the Node process for synchronous needs (readiness checks, quiz scoring — must respond in-request) and via the `learning_events` table + a lightweight polling/queue worker (reusing whatever job runner pattern `generation_jobs`/Arena V2 already uses — confirm and reuse, do not introduce a new queue technology like Redis/BullMQ unless one is already in the stack) for async needs (recommendation recompute, Pulse export composition, decay materialization). Arena result ingestion is event-driven off the existing `AssessmentCompletedEvent`, not polled.

---

## 12. API Architecture

All routes namespaced `/api/skill-studio/*`, additive to the existing two routes in `skillStudio.js` (kept working unchanged).

| Group | Method/Path | Purpose | Key request fields | Response shape | Errors |
|---|---|---|---|---|---|
| Home | `GET /skill-studio/home` | Dashboard payload | — (auth from session) | `{ activeJourneys[], topRecommendations[3], decayAlerts[], streak, masteryDelta }` | 401 if unauth; 200 with empty arrays if new user (never 500 on empty state) |
| Graph | `GET /skill-studio/graph?role=` | Node/edge payload for visualization | `role` (optional, defaults to profile target) | `{ nodes[], edges[] }` | 400 invalid role key (must be in `roleConfig.js` set) |
| Journeys | `POST /skill-studio/journeys` | Create/update a journey for a target skill | `{ skillSlug, targetRole }` | `{ journey }` | 409 if journey already active for that skill (returns existing, not an error to the caller) |
| Modules | `GET /skill-studio/modules/:moduleId` | Fetch module + cached content | — | `{ module, contentBlocks[], moduleState }` | 404; 202 + job id if content still generating |
| Modules | `POST /skill-studio/modules/:moduleId/generate` | Force (re)generation for a (skill, level, mode) tuple not yet cached | `{ teachingMode }` | `{ jobId }` (async) | 429 if generation already in-flight for this tuple (dedupe) |
| Practice | `POST /skill-studio/practice` | Generate a practice task | `{ skillSlug, difficulty }` | `{ task }` | — |
| Quiz | `POST /skill-studio/quiz/start` | Begin adaptive quiz session | `{ moduleId or skillSlug, mode: module\|practice\|revision }` | `{ sessionId, firstQuestion }` | — |
| Quiz | `POST /skill-studio/quiz/:sessionId/answer` | Submit answer, get next | `{ questionId, answer }` | `{ correct, feedback, hint?, nextQuestion?, sessionComplete? }` | 409 if session already completed (idempotent replay-safe) |
| Memory | `GET /skill-studio/memory/due` | Items due for revision | — | `{ items[] }` | — |
| Memory | `POST /skill-studio/memory/:skillId/review` | Submit a revision review result | `{ correct }` | `{ newConfidence, nextReviewDue }` | — |
| Arena | `POST /skill-studio/arena/readiness` | Server-side readiness re-check | `{ skillSlug }` | `{ ready, unmet[] }` | — |
| Arena | `POST /skill-studio/arena/handoff` | Confirm handoff, get mission | `{ skillSlug }` | `{ missionId, missionUrl }` | 403 if readiness re-check fails (never trust client) |
| Interview | `POST /skill-studio/interview/generate` | Generate grounded question set | `{ moduleId, mode }` | `{ sessionId, questions[] }` | — |
| Interview | `POST /skill-studio/interview/:sessionId/submit` | Submit answers | `{ answers[] }` | `{ scores, feedback, evidenceCreated }` | — |
| Evidence | `GET /skill-studio/evidence` | Learner's own evidence list (all states) | — | `{ artifacts[] }` | — |
| Evidence | `POST /skill-studio/evidence/:id/publish` | Publish/unpublish | `{ publish: bool }` | `{ artifact }` | 403 if artifact `publish_state` is `not_applicable` (can never be published, by design) |
| Recommendations | `GET /skill-studio/recommendations` | Full ranked list | — | `{ recommendations[] }` | — |
| Recommendations | `POST /skill-studio/recommendations/:id/dismiss` | Dismiss/snooze | `{ snoozeDays? }` | `{ ok }` | — |
| Admin | `GET /skill-studio/admin/generation-jobs` | Content ops queue | filters | `{ jobs[] }` | RBAC: admin/content-ops role only |
| Admin | `POST /skill-studio/admin/generation-jobs/:id/approve` | Approve generated content | `{ edits? }` | `{ ok }` | RBAC |
| Content | `POST /skill-studio/content/ingest` | Mentor/creator source upload | `{ sourceType, fileRef }` | `{ jobId }` | — |

All mutating endpoints are idempotent w.r.t. retries (client-generated `Idempotency-Key` header honored on quiz submission and Arena handoff specifically, since those are scoring-adjacent) and validate every input server-side regardless of what the client claims about readiness, mastery, or session state.

---

## 13. Database Schema

All new tables ship with RLS from the first migration (owner-scoped `user_id = auth.uid()` policies, plus explicit recruiter/admin read policies where needed) — non-negotiable per the standing Supabase rule and the lesson from the 2026-07-16 audit.

```sql
-- Catalog (shared, versioned)
skill_graph_nodes (
  id uuid pk,
  node_type text check in ('skill','concept'),      -- Skill vs Concept from §4
  slug text unique not null,                         -- must match roleConfig/skillGroups slug where node_type='skill'
  label text not null,
  domain_key text,                                    -- arenaDomains.js key
  metadata jsonb,                                     -- job/salary relevance, difficulty defaults
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
-- index: (node_type, domain_key)

skill_graph_edges (
  id uuid pk,
  from_node_id uuid references skill_graph_nodes,
  to_node_id uuid references skill_graph_nodes,
  edge_type text check in (11 types from §4),
  weight numeric default 1.0,                         -- for RECOMMENDS_NEXT scoring
  threshold numeric,                                   -- for PREREQUISITE_OF gating
  created_at timestamptz default now()
)
-- index: (from_node_id, edge_type), (to_node_id, edge_type)

skill_journeys (
  id uuid pk,
  user_id uuid references auth.users not null,
  skill_graph_node_id uuid references skill_graph_nodes not null,
  target_role text,
  status text check in ('active','completed','archived'),
  priority_rank int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
-- RLS: user_id = auth.uid()
-- index: (user_id, status)

modules (
  id uuid pk,
  skill_journey_id uuid references skill_journeys,
  skill_graph_node_id uuid references skill_graph_nodes not null,
  teaching_mode text,                                  -- Beginner/Interview/Code/etc from §"AI teaching modes"
  level text check in ('beginner','intermediate','advanced'),
  content_cache_key text,                              -- hash of (skill, concept, level, mode) — the real "sticky" cache key
  version int default 1,
  created_at timestamptz default now()
)
-- unique index: (content_cache_key, version) -- enables shared reuse across users

module_content_blocks (
  id uuid pk,
  module_id uuid references modules not null,
  block_type text check in ('overview','ai_explanation','visual','example','cheat_sheet','summary','common_mistakes'),
  ordinal int,
  content jsonb not null,
  generated_by text,                                    -- 'gemini'|'groq'|'claude'|'human'
  source_citations jsonb,                                -- grounding refs, may be empty
  created_at timestamptz default now()
)
-- index: (module_id, ordinal)

module_state (
  id uuid pk,
  user_id uuid references auth.users not null,
  module_id uuid references modules not null,
  status text check in ('draft','in_progress','completed'),
  playground_state jsonb,                               -- persisted between sessions
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz default now()
)
-- RLS: user_id = auth.uid()
-- unique index: (user_id, module_id)

practice_tasks (
  id uuid pk,
  user_id uuid references auth.users not null,
  skill_graph_node_id uuid references skill_graph_nodes not null,
  task_payload jsonb not null,
  difficulty text,
  completed_at timestamptz,
  created_at timestamptz default now()
)
-- RLS: user_id = auth.uid()

quiz_questions (
  id uuid pk,
  module_id uuid references modules,                    -- nullable (practice/revision-only questions)
  skill_graph_node_id uuid references skill_graph_nodes not null,
  question_type text check in (12 types from adaptive quiz spec),
  payload jsonb not null,                                -- prompt, options, rubric, correct answer/key
  difficulty text,
  generated_by text,
  created_at timestamptz default now()
)

quiz_attempts (
  id uuid pk,
  user_id uuid references auth.users not null,
  session_id uuid not null,
  quiz_question_id uuid references quiz_questions not null,
  answer jsonb,
  correct boolean,
  confidence_reported numeric,                            -- learner self-reported confidence, optional
  hint_used boolean default false,
  response_ms int,
  created_at timestamptz default now()
)
-- RLS: user_id = auth.uid()
-- index: (user_id, session_id), (user_id, quiz_question_id)

memory_states (
  id uuid pk,
  user_id uuid references auth.users not null,
  skill_graph_node_id uuid references skill_graph_nodes not null,
  confidence numeric check (confidence between 0 and 1),
  ease_factor numeric default 2.5,
  review_count int default 0,
  last_reinforced_at timestamptz,
  next_review_due_at timestamptz,
  updated_at timestamptz default now()
)
-- RLS: user_id = auth.uid()
-- unique index: (user_id, skill_graph_node_id)
-- index: (user_id, next_review_due_at) -- for due-item queries

decay_events (
  id uuid pk,
  memory_state_id uuid references memory_states not null,
  from_band text,
  to_band text,
  occurred_at timestamptz default now()
)
-- append-only, index: (memory_state_id, occurred_at)

mistake_patterns (
  id uuid pk,
  user_id uuid references auth.users not null,
  skill_graph_node_id uuid references skill_graph_nodes not null,
  pattern_key text,                                        -- normalized error signature
  severity int check (severity between 1 and 5),
  source text check in ('quiz','practice','arena','interview'),
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  occurrence_count int default 1
)
-- RLS: user_id = auth.uid()
-- unique index: (user_id, skill_graph_node_id, pattern_key)

-- Arena/Interview bridge tables are thin — Arena V2 owns its own arena_missions/
-- arena_submissions equivalents already (challenge-engine/submission-engine).
-- Skill Studio only needs a join table:
arena_handoffs (
  id uuid pk,
  user_id uuid references auth.users not null,
  skill_journey_id uuid references skill_journeys not null,
  arena_instance_id uuid,                                   -- FK into arena-v2's own instance table
  requested_at timestamptz default now(),
  result_ingested_at timestamptz
)
-- RLS: user_id = auth.uid()

interview_sessions (
  id uuid pk,
  user_id uuid references auth.users not null,
  module_id uuid references modules,
  mode text,
  questions jsonb not null,
  answers jsonb,
  scores jsonb,
  evidence_artifact_id uuid,                                 -- FK into proof_objects once created
  created_at timestamptz default now(),
  completed_at timestamptz
)
-- RLS: user_id = auth.uid()

-- Evidence: NO new table. proof_objects (existing, arena-v2/proofObjects) gets:
--   ALTER TABLE proof_objects ADD COLUMN source_context jsonb; -- links module_state/interview_session id when relevant
--   'source' enum extended additively: + 'skill_studio', 'skill_studio_interview'
-- This is the one schema change to an existing table in this entire spec, and it is
-- additive/nullable — no existing Arena V2 row or query is affected.

pulse_exports (
  id uuid pk,
  user_id uuid references auth.users not null,
  proof_object_id uuid not null,                              -- references proof_objects
  draft_content jsonb,
  published boolean default false,
  consent_at timestamptz,                                     -- required non-null if authored by a third party (mentor)
  created_at timestamptz default now()
)
-- RLS: user_id = auth.uid() for read/write of own; separate policy for mentor-authored rows requiring consent join

recruiter_views (
  id uuid pk,
  recruiter_id uuid references auth.users not null,
  learner_id uuid references auth.users not null,
  viewed_at timestamptz default now(),
  sections_viewed text[]
)
-- RLS: recruiter sees own rows only; learner sees aggregate via a view, not raw rows, unless disclosure agreement

learning_events (
  id uuid pk,
  user_id uuid references auth.users not null,
  event_type text not null,
  payload jsonb,
  occurred_at timestamptz default now()
)
-- append-only, partitioned by month for scale (§29), index: (user_id, event_type, occurred_at)

content_sources (
  id uuid pk,
  uploaded_by uuid references auth.users,
  source_type text check in ('pdf','doc','url','transcript'),
  file_ref text,
  extracted_text text,
  status text check in ('pending','parsed','failed'),
  created_at timestamptz default now()
)

generation_jobs (
  id uuid pk,
  job_type text,
  input_ref jsonb,
  status text check in ('queued','running','pending_review','approved','rejected','failed'),
  output_ref jsonb,
  error text,
  created_at timestamptz default now(),
  completed_at timestamptz
)
-- index: (status, job_type)

recommendation_snapshots (
  id uuid pk,
  user_id uuid references auth.users not null,
  recommendations jsonb not null,                              -- ranked array, denormalized snapshot
  generated_at timestamptz default now(),
  expires_at timestamptz
)
-- RLS: user_id = auth.uid()
-- index: (user_id, generated_at desc)

mastery_snapshots (
  id uuid pk,
  user_id uuid references auth.users not null,
  skill_graph_node_id uuid references skill_graph_nodes not null,
  level_score numeric,                                          -- mirrors user_skills.level_score at snapshot time
  confidence numeric,
  taken_at timestamptz default now()
)
-- RLS: user_id = auth.uid()
-- index: (user_id, skill_graph_node_id, taken_at) -- for trend charts
```

**Versioning/archival**: `modules`/`module_content_blocks` are versioned (`version` column) rather than mutated in place when regenerated, so a learner mid-module never has content silently rewritten under them; `skill_journeys`/`practice_tasks` use soft status transitions (`archived`) rather than deletes, preserving the evidence trail. `learning_events` and `decay_events` are append-only by design (audit trail for both analytics and dispute resolution — "the system said I was ready" needs to be reconstructable).

---

## 14. Frontend Architecture

`SkillStudioShell` becomes a real shell (nav + outlet), not a single 1,350-line page. The existing `SkillStudio.jsx` client-side heuristics (`buildGaps`, `computeDecay`, `buildRecommendations`) are **retired in favor of server-computed equivalents** from `/skill-studio/home` — the client should render, not compute mastery logic, once the backend exists. This is the single biggest refactor implied by this spec and should be called out to the team explicitly as a breaking internal change to `SkillStudio.jsx`, staged behind a feature flag (`featureFlags.js` already exists as the mechanism) so it can be rolled back to the current heuristic version if the new backend has issues at launch.

States to design for on every surface: loading (skeleton, not spinner-only, given content generation can take seconds), empty (new user, no journeys yet — must not show "no data" dead ends, must show a CTA into journey creation), error (AI generation failure — must show retry, never a raw error), progress (module in flight), preview (draft content not yet approved, content-ops only), module (the runtime states from §21), recruiter (read-only, no edit affordances rendered at all, not just disabled).

**Responsive**: desktop gets the full Skill Graph visualization + side-by-side module/tutor panels. Tablet collapses the graph to a filterable list view (graph rendering at that viewport is a maintenance cost with low value — don't force it). Mobile is module-runtime-first: one panel at a time (tabs: Learn / Practice / Quiz / Tutor), Skill Graph becomes a simplified "your skills" list, playground panel degrades gracefully (e.g., SQL console becomes a simpler input/output pair, full IDE-style panels are desktop-only where the input type genuinely requires a keyboard-heavy surface).

---

## 15. Component Architecture

| Component | Responsibilities | Key props | State | Children |
|---|---|---|---|---|
| `SkillStudioShell` | Nav, outlet, feature-flag routing between legacy/new home | `userId` | activeSurface | `LearningHome`, `SkillGraphView`, etc. |
| `LearningHome` | Renders `/home` payload | — | none (server state via query hook) | `RecommendationRail`, `DecayAlertBanner` |
| `SkillGraphView` | Renders node/edge graph, click-to-journey | `roleFilter` | selectedNode | `GraphInspector` |
| `SkillJourneyPage` | Journey lifecycle view | `journeyId` | activeModuleId | `ModuleList`, `EvidencePanel`, `NextSkillPanel` |
| `ModuleRuntime` | Orchestrates the module experience | `moduleId` | `activePanel` ('overview'\|'explain'\|'playground'\|'quiz'\|'tutor') | `ModuleOverview`, `AIExplainPanel`, `VisualLearningPanel`, `PlaygroundPanel`, `TutorPanel`, `QuizPanel` |
| `ModuleOverview` | Objective, why-it-matters, job/salary relevance, prerequisites | `module` | none | — |
| `AIExplainPanel` | Renders explanation content, teaching-mode switcher | `contentBlocks`, `mode` | selectedMode | — |
| `VisualLearningPanel` | Diagrams/charts tied to concept | `contentBlocks` | none | — |
| `PlaygroundPanel` | Interactive simulation surface (§ Interactive Playground) | `playgroundConfig`, `moduleStateId` | live playground state, debounced-persisted to `module_state.playground_state` | type-specific sub-renderers (`CodeEditorPanel`, `SqlConsolePanel`, `SliderSimPanel`, etc.) |
| `TutorPanel` | Multi-turn chat, routes through existing `/api/chat` | `moduleContext` | message history (session-scoped) | — |
| `QuizPanel` | Adaptive quiz UI | `sessionId` | current question, answer draft | question-type sub-renderers |
| `MemoryPanel` | Revision surface | — | due items | — |
| `ArenaGatePanel` | Readiness checklist + handoff CTA | `skillSlug` | readiness result | — |
| `InterviewGatePanel` | Interview unlock + session launcher | `moduleId` | — | — |
| `EvidencePanel` | This-skill evidence trail, publish toggle | `skillSlug` | — | — |
| `NextSkillPanel` | Recommendation-engine output for "what's next" | `journeyId` | — | — |
| `RecruiterProofDrawer` | Read-only recruiter view | `learnerId` | — | — |
| `ContentOpsConsole` | Admin review queue | — | filters | `GenerationJobRow` |
| `GraphInspector` | Node detail side panel | `nodeId` | — | — |
| `RecommendationRail` | Top-3 recommendation cards on Home | `recommendations` | — | — |

`PlaygroundPanel` is the one component genuinely worth over-specifying: it must persist state to `module_state.playground_state` on a debounce (not on every keystroke — 2–3s idle debounce), must validate output before it can count toward module completion (a code playground's "pass" state should run through the same validator pattern Arena V2 uses for submissions, not a client-side eyeball check), and must degrade its input surface per viewport as noted in §14.

---

## 16. Design System

Reuse the existing token set already in `SkillStudio.jsx` (`D` object: `void/base/raised/float/glass/border` neutrals, `indigo/gold/emerald/rose/violet/cyan/amber` accents, `text1/text2/muted`) and `DOMAIN_COLOR`/`DOMAIN_ICON` maps — **do not introduce a second color system**; promote the existing one into a shared `frontend/src/design/tokens.js` importable across all Skill Studio components instead of living inline in one page file. Typography: existing app font stack, weight scale limited to 2–3 steps for calm hierarchy (this is a stated design goal — "calm, precise" — which argues against introducing a display/serif pairing; keep one typeface family). Spacing: 4px base unit, existing `glass`/`glassH` treatment for card surfaces. Radius: consistent with existing card radius already used elsewhere in the app (check `careeros/` components for the established value rather than picking a new one). Shadows: minimal, single soft shadow tier — glassmorphic surfaces should imply depth through the existing `glass`/`glassH`/`border`/`borderH` layering already defined, not through added shadow tokens. State colors: `emerald` = mastered/pass, `amber`/`gold` = in-progress/at-risk, `rose` = decayed/failed, `indigo`/`violet` = neutral/informational, matching the existing domain accent usage pattern.

---

## 17. Interaction and Animation System

Subtle, meaningful, production-safe (no animation exceeding ~250ms for state transitions, ~400ms for celebratory moments; respect `prefers-reduced-motion`):

- **Module entry**: content blocks fade/slide in sequentially (staggered ~40ms), signaling "this was assembled for you," not a static page load.
- **Graph traversal**: clicking a node animates a camera/zoom transition to that node's journey, with connected edges highlighting briefly — spatial continuity, not a hard cut.
- **Confidence updates**: a memory/mastery number change animates as a counting tween (300ms) rather than snapping, with the delta briefly shown (+4) before settling.
- **Success state**: quiz/module pass gets a restrained checkmark-draw animation, not confetti — consistent with "premium, calm" over "generic gamification," which the product rules explicitly reject.
- **Unlock state** (Arena/Interview gate flips to available): the gate panel un-dims with a soft glow pulse once, drawing attention without being loud.
- **Decay warnings**: a memory item crossing into "high" decay severity gets a one-time subtle amber pulse on the Home decay alert, not a persistent blinking badge (avoid anxiety-inducing patterns per the wellbeing-conscious tone the rest of the product should have).
- **Revision resurfacing**: item entering the Memory Revision queue slides in from the direction of its origin skill node on the graph, reinforcing "this came from something you already know."
- **Arena handoff**: a deliberate, slightly slower (500ms) transition — this is a meaningful moment (proof-of-skill), it should feel like a threshold being crossed, not an instant page swap.
- **Evidence creation**: proof object write triggers a small "added to your evidence trail" toast with a link, not a full-page interrupt.
- **Recruiter review transitions**: no animation flourish at all in `RecruiterProofDrawer` — recruiter-facing surfaces should feel instant and information-dense, not playful.

---

## 18. AI Orchestration and Prompting Strategy

**Provider routing** (extends the existing house pattern, does not replace it):
- Module/lesson content generation: Gemini Flash primary (native JSON, cheap, good structured output — matches current `geminiGenerateLesson`), Groq Fast fallback on failure (existing pattern, keep).
- Quiz/question generation: Groq Fast primary (low latency needed for adaptive in-session generation), Gemini fallback.
- Multi-turn tutor chat: Claude Haiku primary via existing `/api/chat`, Groq Fast fallback (existing pattern, keep, do not fork a second chat pipeline for Skill Studio).
- Skill-gap/market grounding: Gemini + Google Search grounding (existing `skillGap.js` pattern, reused as-is for journey "why it matters"/salary relevance fields — do not re-implement grounding).
- Recommendation "why" copy: Groq Fast, given a pre-computed (deterministic) recommendation — the model explains a decision already made, never makes it (Principle #5, §5).
- Interview question generation: Gemini/Groq for one-shot sets; Claude Haiku for live conversational mock-interview turns (voice/behavioral).

**Prompt templates**: every generation call uses a versioned template stored in code (not DB, so it's reviewable in PR diffs) with explicit slots for grounding inputs (skill, level, role, mistake patterns, prior module content) — no free-text prompt concatenation without a named template, so prompt regressions are traceable to a diff.

**Retrieval/grounding strategy**: content generation is grounded in the learner's actual `user_skills`/`mistake_patterns`/`module_state` rows (retrieved and injected structured, not summarized by another LLM call first — avoid the failure mode of one model's lossy summary becoming another model's "ground truth"). Market-relevance fields (salary, job demand) are grounded via Gemini's Google Search tool exactly as `skillGap.js` already does, with the same placeholder-detection validation (`hasValidSkills`-style pattern) applied to every generated field that claims to be data-backed, extended to module content's "job relevance"/"salary relevance" fields specifically since those are exactly the kind of claim that must never be silently hallucinated.

**Hallucination prevention**: (1) structured JSON mode wherever the provider supports it (both Gemini and Groq already used this way), (2) schema validation on every parsed response before it's persisted — reject and retry-with-repair-prompt on schema mismatch, never persist malformed content, (3) placeholder-pattern rejection (reuse `skillGap.js`'s regex approach) for any field claiming to be a real resource/URL/statistic, (4) citation/source handling: fields grounded via Google Search retain the source URL in `source_citations` on the content block, rendered as a small attribution, not hidden.

**Fallback behavior**: on total generation failure (both primary and fallback provider), the module enters a `generation_failed` state with a visible retry CTA — it does not silently serve empty content, and it does not block the rest of the journey (other modules remain accessible).

---

## 19. Content Generation Pipeline

Upload ingestion → `content_sources` row (`status: pending`) → parsing worker (OCR for scanned docs, text extraction for structured docs/URLs) → `status: parsed`, `extracted_text` populated → topic extraction (LLM call, structured output: candidate skills/concepts + confidence) → outline creation (maps extracted topics onto existing `skill_graph_nodes` where a match exists above a similarity threshold, flags genuinely new nodes for content-ops review rather than auto-creating taxonomy — protects the "one skill taxonomy" principle) → module generation (Content Generator, §5) → flashcard/quiz/practice/Arena-task generation (parallel jobs, all referencing the same generated module content, all going through the same schema-validation gate from §18) → publish/review workflow: mentor/creator-sourced content always lands in `generation_jobs.status = pending_review` before it's visible to any learner; system-generated content from the standard Journey Planner flow (no external source) can auto-publish since it's already grounded in the learner's own verified data, not an uploaded document of unknown quality.

---

## 20. Module Generation Pipeline

Given `(skill_graph_node_id, level, teaching_mode)`: compute `content_cache_key` hash → check `modules` for existing matching row → if found, return cached `module_content_blocks` (this is the real fix for the fake "STICKY" claim in current `skillStudio.js`) → if not found, enqueue a `generation_jobs` row, run the Content Generator (§5) producing each `block_type` in sequence (overview → ai_explanation → visual → playground config → example → cheat_sheet → summary → common_mistakes), validate each block against its schema, persist to `module_content_blocks`, mark `modules` row ready, notify the waiting client (poll or short-lived websocket/SSE if already available in the stack — otherwise poll the job status endpoint, simplest option first per performance guidance in §29).

---

## 21. Module Runtime Behavior

A module in runtime always exposes: overview section (objective/why/relevance — static content, no interaction needed), AI explanation section (teaching-mode-switchable, re-render only, does not re-call the generator per switch — all modes are pre-generated together in §20's pipeline, since generating all teaching-mode variants once is cheaper than regenerating on demand and keeps the module immediately switchable), visual learning section, interactive playground (type-specific, persisted per §15), AI tutor (contextual chat scoped to this module's content, via `/api/chat`), adaptive quiz (via Quiz Service, §12 endpoints), practice tasks (optional deepening step before quiz), memory review touchpoint (a completed module immediately seeds a `memory_states` row rather than waiting for the next nightly job — instant reinforcement on first pass), Arena unlock gate (readiness-computed, §7), interview unlock gate (§8), evidence summary (what will/did get written to `proof_objects` on pass), next-step CTA (Recommendation Engine output, §5).

**Runtime support requirements**: infinite questions (Quiz Service generates fresh variants rather than cycling a fixed bank once the fixed bank is exhausted — `quiz_questions` rows are templates, `quiz_attempts` are instances, so "infinite" means infinite instances of a bounded but periodically-refreshed template set, not literally unbounded unique content forever, which would be an unbounded AI cost with no product benefit past a reasonable variety threshold); dynamic examples (regenerate the `example` content block on request, cheap single-block call, not a full module regeneration); difficulty adaptation (Adaptive Difficulty Controller, §5); modality switching (teaching-mode switch, pre-generated per above); persisted state between sessions (`module_state.playground_state` + quiz session resumability via `quiz_attempts` keyed by `session_id`).

---

## 22. Assessment and Validation Logic

Question types supported: MCQ, fill-in-the-blank, scenario reasoning, debugging, coding, architecture, business judgment, voice-based, image-based, simulation-based, case studies. Scoring split by determinism:

- **Deterministic** (MCQ, fill-in-blank, coding with test cases, SQL against a known result set, simulation-based with a computable target state): scored by exact/programmatic check, zero AI involvement in the pass/fail decision — fastest, cheapest, most trustworthy, used wherever the question type allows it.
- **AI-assisted, rubric-bounded** (scenario reasoning, debugging explanation quality, architecture judgment, business judgment, case studies, voice-based): scored against a structured rubric with a capped AI-review weight, mirroring Arena V2's `validator_score`/`ai_review_score`/`ai_review_weight` split exactly — this is not a new scoring philosophy, it is the existing one applied to Skill Studio's quiz engine.
- **Image-based**: deterministic where the image maps to a known-answer key (e.g., "identify the bug in this diagram" against an annotated ground truth); AI-assisted only where genuinely open-ended.

**Adaptation inputs**: prior errors (weighted toward recent), speed (response_ms distribution vs. skill/level norm), confidence (self-reported, used to detect overconfidence/underconfidence patterns rather than to directly grade), repeated mistakes (feeds `mistake_patterns` directly), mastery drift (comparison of `memory_states.confidence` trend vs. recent quiz accuracy — a divergence flags either stale memory data or a lucky/unlucky recent session, and either triggers a recalibration quiz).

**Hinting**: available on request, costs a fixed confidence penalty on that question's contribution to mastery update (hinted-correct counts less than unhinted-correct — consistent with "verification without shortcuts" spirit). **Retry logic**: failed questions can be retried with a fresh generated variant (not the identical question, to prevent pure memorization of the specific instance), capped at 3 retries per question-concept before the system routes the learner back to the module's explanation content instead of further quiz attempts (a retry loop with no comprehension is a signal to re-teach, not to keep testing).

---

## 23. ELO / Mastery Update Logic

**Hard rule, restated because it is the single most important constraint in this entire document**: Skill Studio does not implement a new ELO formula. It calls the existing engines.

- Arena-sourced mastery changes: entirely owned by `arena-v2/reward-engine/engine.js` (challenge ELO) and, where applicable to the professional track, `professionalElo/eloEngine.js`. Skill Studio's only job is to trigger the handoff (§7) and consume the result event.
- `user_skills.level_score`/`confidence` updates from Skill Studio's own activity (module completion, quiz pass, practice) are **not ELO** — they are the existing `level_score`/`confidence` fields on `user_skills`, updated via the Memory Service's `reinforce()` function (§6), bounded per-event (a single quiz pass moves confidence by a small fixed max delta, mirroring the existing "±15-per-skill cap philosophy" already established for skill confidence per `eloEngine.js`'s own comments) — same bounded, forward-only, no-silent-unbounded-jump discipline that was retrofitted onto the four duplicate ELO formulas on 2026-07-27 must be designed in from day one here, not retrofitted later.
- Skill Studio activity **never** writes to `professional_elo_state`/`professional_elo_events` directly — only a real assessment event (Arena, weekly pulse, or a future explicitly-approved product decision) does, per the existing architectural boundary documented in `eloEngine.js` itself ("ELO must move ONLY from real assessment performance and MUST NEVER change from profile CRUD"). Module/quiz completion is closer to "profile CRUD" than "real assessment performance" until it's been Arena-validated — so it updates `user_skills`, not ELO.

---

## 24. Evidence and Portfolio Model

Restated from §0/§10/§13: no new evidence table. `proof_objects` (existing) is extended with an additive `source_context jsonb` column and two new `source` enum values (`skill_studio`, `skill_studio_interview`). The **evidence build path** for Skill Studio-originated proof is a thin adapter (`evidenceBridge/moduleToProofObject.js`) that calls the *existing* `proofObjects/builder.js` logic (or a sibling function following its exact shape/contract) rather than duplicating field construction — same `publish_state` machinery, same `aiEvaluation`/`validatorResult` shape, same `tags`/`skillsDemonstrated` fields, so the Recruiter Evidence Model (§10) needs zero special-casing per source.

---

## 25. Admin and Content Operations Model

`ContentOpsConsole` surfaces `generation_jobs` filtered to `pending_review`, with a diff-style review UI (generated content vs. the source material it was derived from, for mentor/creator uploads) and one-click approve/reject/edit-then-approve. Rejected jobs record a reason (free text + optional structured tag: `factual_error`, `off_taxonomy`, `low_quality`, `duplicate`) feeding back into prompt-template quality tracking (§18's "prompt regressions traceable to a diff" — reject reasons are the empirical signal that a template needs revision). Admin RBAC reuses the existing role/permission model (whatever gates `questionBankAdmin.js`/`opsDashboard.js` today) rather than inventing a new admin role concept.

---

## 26. Observability and Analytics Model

Every learner action already emits a `learning_events` row (§13); analytics is built as read models over that stream plus the existing tables, not a separate tracking SDK:

- **Module completion / drop-off**: funnel from `module_state.status` transitions (`draft → in_progress → completed`) with drop-off points identifiable by which `block_type` panel was last active (requires the runtime to log a lightweight `learning_events` entry on panel focus change, cheap, debounced).
- **Quiz quality**: aggregate `quiz_attempts.correct` rate per `quiz_questions.id`, flag questions with pathological pass rates (near-0% = probably broken/mis-keyed, near-100% = probably trivial) into the content-ops review queue automatically.
- **Arena readiness / interview performance / retention decay**: direct queries over `arena_handoffs`, `interview_sessions`, `decay_events`.
- **Content quality**: generation job reject rate per prompt-template version (§25's feedback loop), plus flagged-question rate from the quiz-quality check above.
- **Evidence usage / recruiter engagement**: `recruiter_views` aggregates — views per artifact, section engagement, time-to-first-view after publish.
- **Learning velocity**: modules completed / week, mastery_snapshots trend slope per skill.

**Logging/tracing**: every AI generation call logs provider, template version, latency, and success/failure to a lightweight structured log (reuse whatever existing logging convention `skillGraph.js`/`skillGap.js` already use — `console.log`/`console.warn`/`console.error` with a bracketed tag prefix is the established house pattern; if a more structured logger already exists elsewhere in the stack, prefer it, but don't introduce a third logging convention). Operational monitoring: generation job failure rate and quiz-flag rate should have alert thresholds wired into whatever ops dashboard already exists (`opsDashboard.js`), not a new standalone monitoring surface.

---

## 27. Error Handling / Fallback Behavior

Every AI-dependent endpoint has a two-provider fallback (§18) and a final "generation_failed" state that is visible and retryable, never silent. Every scoring-adjacent endpoint (quiz submission, Arena handoff, interview submission) validates server-side regardless of client claims and is idempotent under retry (`Idempotency-Key`). Playground state persistence failures (network drop mid-debounce-save) must not lose more than the last ~2–3 seconds of unsynced local state — local optimistic state should be the source of truth until a save round-trip confirms, at which point the confirmed state becomes canonical (standard optimistic-UI discipline, called out explicitly because a playground losing work is a uniquely bad experience for a "practice" surface). Recommendation Engine failures (e.g., the async job errors) must not block Home from rendering — Home falls back to the last valid `recommendation_snapshots` row rather than showing an empty/broken rail.

---

## 28. Security and Permission Model

RBAC roles: `student`, `job_seeker`, `career_switcher`, `working_professional`, `mentor_creator`, `recruiter` (read-only, scoped to published evidence only, existing org-verification-gated), `admin_content_ops`. Same underlying data model across all persona modes (Principle-level requirement, §"Persona Variants") — mode changes ranking/emphasis in the Recommendation Engine and UI copy, not table access. Private vs. public evidence: governed entirely by `proof_objects.publish_state`, never a client-side flag; recruiter queries filter server-side, never trust a client-supplied "show me published only" parameter as the sole gate (it's a UX hint, the server enforces regardless). AI generation permissions: `content/ingest` (mentor/creator source upload) requires `mentor_creator` or `admin_content_ops` role; standard Journey Planner generation is available to any authenticated learner for their own data only. Data privacy: `mistake_patterns`, `memory_states`, `quiz_attempts` are learner-private by default (RLS `user_id = auth.uid()`), never recruiter-visible even in aggregate — recruiters see outcomes (`proof_objects`) and trend framing (via `mastery_snapshots` only in the shape already exposed through the evidence read view), never raw error/mistake data, which would be an inappropriate level of granularity to expose about someone's learning struggles.

---

## 29. Performance and Scaling Considerations

**Content generation caching** is the single highest-leverage scaling decision in this spec: because `modules`/`module_content_blocks` are keyed by `(skill, level, teaching_mode)` and shared across users (§3, §20), generation cost is O(distinct tuples), not O(users) — a thousand learners studying "React Hooks, Intermediate, Code mode" hit the cache after the first one generates it. **Graph traversal**: prerequisite/recommendation walks are bounded-depth (typically 2–3 hops) over a modestly-sized catalog graph (thousands of nodes, not millions) — no need for a dedicated graph database, Postgres recursive CTEs over `skill_graph_edges` are sufficient at this scale; revisit only if catalog size grows an order of magnitude. **Live quizzes**: question generation for adaptive sessions should pre-fetch the next question while the learner is answering the current one (predictive prefetch on the two most likely next-difficulty branches) to hide generation latency, rather than generating synchronously after each answer. **Evidence rendering**: `RecruiterProofDrawer` queries should be indexed (`proof_objects(user_id, publish_state)`, already implied by the existing table's usage patterns) and paginated, not full-table-scanned per view. **Caching/queueing/worker strategy**: reuse whatever job-queue mechanism already backs `generation_jobs`-shaped work elsewhere in the codebase (check Arena V2's own job/worker pattern before introducing a new one); `learning_events` should be partitioned by month once volume justifies it (thousands of users × dozens of events/day is not yet at that threshold, but the schema should not have to change to add partitioning later — an append-only, indexed-by-time table is already partition-friendly).

---

## 30. Implementation Roadmap

**Phase 0 — Foundation (dependencies: none)**
Scope: `skill_graph_nodes`/`skill_graph_edges` catalog tables + `catalogSync.js` backfill from `roleConfig.js`/`skillGroups.js`/`user_skills`; `skill_journeys`, `modules`, `module_content_blocks`, `module_state` tables with RLS; feature-flagged new `SkillStudioShell` route alongside existing `SkillStudio.jsx` (both live, flag-gated).
Risks: catalog backfill mismatching existing `user_skills` slugs (mitigate: dry-run reconciliation report before any write, same pattern as the 2026-07-22 College Path schema-conflict investigation — do not repeat that unreconciled-schema mistake here).
Validation: reconciliation report showing 100% of existing `user_skills` rows map to a `skill_graph_nodes` entry before Phase 1 starts.

**Phase 1 — Learning Graph + Content Generation (depends on Phase 0)**
Scope: Journey Planner, Content Generator with real caching, Module Runtime UI (overview/explain/visual/playground/tutor panels), `quiz_questions`/`quiz_attempts`, Adaptive Difficulty Controller.
Risks: AI generation cost/latency at scale before caching hit-rate stabilizes (mitigate: seed the cache for the top N most common (skill,level,mode) tuples via a backfill job before launch, don't rely purely on organic cache warming).
Validation: schema-validation pass rate on generated content ≥ a defined threshold (e.g., 98%) before enabling for all users.

**Phase 2 — Memory Engine (depends on Phase 1)**
Scope: `memory_states`, `decay_events`, `mistake_patterns`, decay/reinforcement/resurfacing logic, Memory Revision surface.
Risks: decay tuning (too aggressive = anxiety-inducing/annoying, too lax = doesn't achieve the retention goal) — mitigate with a tunable config, not hardcoded constants, and a soft launch to an internal cohort first.
Validation: spaced-repetition scheduling verified against known SM-2 reference behavior in unit tests before shipping to real users.

**Phase 3 — Arena Bridge (depends on Phase 1, Phase 2)**
Scope: readiness check, handoff via `missionCompiler.js`, `AssessmentCompletedEvent` subscription, result ingestion into Memory Service + `mistake_patterns`.
Risks: this phase touches the boundary with a live, scoring-critical system (Arena V2) — any bug here risks corrupting ELO-adjacent flows. Mitigate: read-only integration first (Skill Studio only *reads* Arena events, doesn't yet gate anything) before enabling the readiness-gated handoff for real users.
Validation: shadow-mode run (log what the readiness gate *would* decide without enforcing it) for at least one full learner cohort cycle before enforcing.

**Phase 4 — Interview Bridge + Evidence + Recruiter View (depends on Phase 3)**
Scope: interview generation/scoring, `proof_objects` extension (`source_context`, new source values), `RecruiterProofDrawer`, `recruiter_views`.
Risks: extending a live, already-relied-upon table (`proof_objects`) — must be additive-only, tested against existing Arena V2 proof-object consumers to confirm zero behavior change for `source: 'arena_v2'` rows.
Validation: full regression pass on existing Arena V2 proof/portfolio rendering after the schema change, before any Skill Studio row is written.

**Phase 5 — Pulse Export + Admin Tooling (depends on Phase 4)**
Scope: `pulse_exports`, share-to-Pulse flow, `ContentOpsConsole`, `content_sources`/`generation_jobs` ingestion pipeline for mentor/creator uploads.
Risks: consent handling for third-party-authored content referencing a learner (mitigate: hard block on publish without `consent_at`, tested explicitly, not just documented).
Validation: consent-gating tested with an adversarial case (mentor attempts to publish without learner consent — must fail).

**Phase 6 — Hardening + Production Launch (depends on all above)**
Scope: MCP-layer tool registration for the new AI orchestration points (§18) as a follow-up migration, not a blocker for the rest of this roadmap — routes can call `groq.js`/`gemini.js` directly initially, consistent with how the rest of the backend already works, with MCP wiring as a deliberate later-phase cleanup (per the existing MCP-layer gap noted in memory, this is a known, already-tracked debt item, not new debt introduced by this spec); load testing (`load-tests/k6` already exists — extend it to cover the new endpoints); full RLS audit pass on every new table (repeat the 2026-07-16 audit methodology specifically against this new surface before general availability).
Validation: RLS audit sign-off, load test results at target concurrency, feature-flag full rollout with a rollback path preserved (legacy `SkillStudio.jsx` heuristic path stays in the codebase, flag-reachable, for at least one release cycle post-launch).

---

## 31. Acceptance Criteria

- Skill Studio no longer computes mastery/gaps/decay client-side from raw Arena history — `SkillStudio.jsx`'s heuristic functions are retired and their outputs are server-computed, versioned, and testable.
- Every module a learner can start ends in an assessment, and every passed assessment produces a `proof_objects` row — no module exists that "completes" without evidence.
- Arena readiness is a named, server-verified, recruiter-inspectable state — not an implicit "click Arena whenever."
- A learner can see, on the Recruiter Evidence surface itself, exactly what a recruiter would see — no hidden asymmetry between learner-facing and recruiter-facing evidence rendering.
- A skill practiced once and never touched again visibly decays and gets resurfaced — retention is a mechanism, not a claim.
- Zero new ELO formulas exist anywhere in the Skill Studio codebase; all mastery-affecting logic traces to `eloEngine.js`, `reward-engine/*`, or the bounded `reinforce()`/decay functions specified here.
- `proof_objects` gains its new fields with a fully green regression suite on existing Arena V2 consumers — the single existing-table change in this spec introduces zero observable behavior change for pre-existing rows.
- Every new table passes an RLS audit before general availability, with no anon-executable backdoor of the kind found and fixed on 2026-07-16.
- The product, on first use, should not resemble a course catalog: there is no "browse all courses" grid anywhere in the new Learning Home — the default view is always personalized, ranked, and evidence-aware.

---

*This spec intentionally leaves the exact prompt template text, the full quiz-question JSON schemas, and the precise decay half-life tuning constants as engineering-team decisions to finalize during Phase 0/1/2 implementation — the architecture, data model, and integration boundaries above are the load-bearing decisions and are specified to build-ready precision; the tunable constants are deliberately left as configuration, not hardcoded in this document, so they can be adjusted from real usage data without a spec revision.*
