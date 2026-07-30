# Skill Studio → AI Career Learning Engine
### Redesign specification — grounded in the live Capabilio codebase
### 2026-07-30

---

## 0. Reality check first

Before anything else: this doc audits what Skill Studio V2 **actually does today**, because the vision below assumes capabilities (AI avatar video, full RAG document ingestion, vector DB memory) that do not exist yet. Promising them without saying so would violate the one rule that matters most on a scoring/evidence system — never let the roadmap quietly become the changelog.

**What's real right now** (verified against the live code, not the old spec):

| Layer | Current implementation | File |
|---|---|---|
| Lesson generation | Gemini → Groq fallback, returns **structured JSON text blocks** (overview, explanation, example, cheat sheet) — no video, no avatar, no TTS | `backend/server/lib/skillStudio/contentGenerator.js` |
| Lesson rendering | Text/code blocks in `AIExplainPanel.jsx`, static "no diagram yet" placeholder in the removed Visual tab | `frontend/src/skillStudio/*.jsx` |
| Module runtime | Learn → Tutor → Quiz → Interview tabs (Visual/Playground/Memory/Arena/Evidence removed 2026-07-30 — placeholders, not working features) | `ModuleRuntime.jsx` |
| Journeys | `skill_journeys` + `skill_graph_nodes`, seeded from `roleConfig.auraSkills` × live `skill_graph` scores | `roleGapSeeder.js`, `journeyPlanner.js` |
| Verification | Quiz-gated (`QuizPanel.jsx`), 70% pass threshold, no 80% gate today | `journeyPlanner.js` / `skillStudioV2.js` |
| Arena bridge | Exists (`arenaBridge.js`, `evidenceBridge.js`) — module completion can hand off to Arena, writes `proof_objects` | `lib/skillStudio/` |
| Memory/decay | Spaced-repetition confidence decay exists (`getDueReviews`) — this is real, not aspirational | `skillStudioV2.js` |
| Document ingestion | **Does not exist.** No PDF/PPT/repo upload path anywhere in the codebase. | — |
| AI video/avatar | **Does not exist.** No Remotion, no TTS, no avatar pipeline, no video storage. | — |
| Gamification (streaks/XP/skill coins/boss battles/seasons) | Only ELO + Arena streaks exist (`arena_streak`, `streak_events`). No XP, coins, seasons, skill trees. | `arenaV2.js` |
| Recruiter verification | Partial — `proof_objects`/`proof_artifacts` + `ArenaV2RecruiterView.jsx` already do "no fake certificate" evidence-linking. Extend, don't rebuild. | `arena-v2/proofObjects/` |

**Conclusion:** the pipeline philosophy (assessment → gap → generate → teach → practice → verify → Arena → portfolio → ELO) is already the system's actual shape — that part of the vision is correct and should be preserved exactly. The gap is entirely in **content richness** (text-only, not video) and **two subsystems that don't exist yet** (document ingestion, deep gamification). This spec treats those as the two real workstreams, phased, instead of a single "redesign everything" sprint.

---

## 1. Non-negotiable design constraint

Per standing project rules: **skill-first evaluation, ELO-based scoring, real-time assessment are the core business logic.** Nothing in this redesign may:
- introduce a second ELO/scoring formula (there are already 4 unified formulas — see `capabilio-elo-cap-2026-07-27` — a 5th one for "video lesson XP" is not acceptable),
- let AI-generated content award ELO/skill-graph credit directly (AI output must stay probabilistic input to Arena grading, never a scoring authority itself),
- bypass RLS or the `protect_profile_entitlements` trigger for any new gamification column (XP, skill coins, seasons must be service-role-written only, same as `arena_streak`/`elo_rating` today).

---

## 2. The learning loop, mapped to real tables

```
Assessment (assessment.js) → skill_graph (score per skill)
        ↓
roleGapSeeder.syncMissingJourneys → skill_journeys (one per role skill, priority-ranked by weakest-first)
        ↓
ModuleRuntime → contentGenerator.getOrCreateModule → modules + module_content_blocks
        ↓
Learn (AIExplainPanel) → Tutor (chat) → Quiz (QuizPanel, gated) → Interview (InterviewGatePanel)
        ↓
Quiz ≥ threshold → skillStudioV2Api.completeModule → evidenceBridge → proof_objects
        ↓
arenaBridge.checkReadiness/handoff → Arena mission in the SAME skill
        ↓
Arena grading (grading-worker.js / arena.js review) → apply_arena_result RPC → elo_rating, skill_graph, streak_events
        ↓
Aura radar (GET /api/arena/skill-graph) re-reads skill_graph fresh → Strengths/Areas to Improve update automatically
```

This loop is real and already interlinked exactly the way the vision describes ("if A works, B works automatically"). The redesign's job is to make each node richer, not to build a new loop.

---

## 3. Content generation: phased, not a leap to video

**Phase 1 (next, achievable in the current stack) — rich text-native lessons, no video yet.**
- Extend `generateLesson()`'s prompt to emit the full block set the vision describes minus video: intro hook, animated-diagram *spec* (a structured JSON diagram description, rendered as an SVG/React animation client-side — cheap, fast, no render pipeline), real-company worked example (already partially done — the "Swiggy" flavor is already in `DOMAIN_CONTEXT`), common-mistake pair (wrong query / correct query / why), interactive checkpoint question gating scroll.
- Render diagrams with a small deterministic SVG animation library (Framer Motion, already in the stack) driven by the JSON spec — this gets "tables merge, rows animate" without touching a video pipeline at all.
- Add flashcards / cheat sheet / interview-question generation as an **extra API call on module completion**, cached same as lessons (skill+level keyed), shown in a new "Revise" tab.

**Phase 2 (video, real scope) — do NOT start until Phase 1 ships and is measured.**
- AI video generation (Remotion + TTS + optional avatar) is a genuinely large subsystem: render queue, storage (Supabase Storage or S3), CDN delivery, cost-per-lesson (TTS + render minutes are not free at scale), and a caching strategy identical to the text-lesson cache (skill+level+mode keyed, shared across users — never render the same lesson twice). Needs its own spec, its own budget line, and a kill-switch feature flag exactly like `VITE_FF_SKILL_STUDIO_V2`. Flagging this explicitly so it isn't silently scoped into a "quick redesign."

**AI Tutor** — already has a real chat endpoint (`TutorPanel.jsx`). Extend the system prompt with the "explain again / use a cricket analogy / slow down / go deeper" intent set as a small classifier prefix, not a new service.

---

## 4. Document ingestion (genuinely new — real design, Phase 2/3)

Not built anywhere today. Minimum viable version:

1. **Upload** — PDF/PPTX/DOCX/repo-URL → object storage (Supabase Storage bucket `ingested-documents`, RLS scoped to uploader + admin).
2. **Extract** — reuse the `pdf`/`pptx`/`docx` toolchain already used elsewhere in this environment for text extraction; chunk by heading/section (500–1000 tokens/chunk).
3. **Embed + index** — pgvector extension on Supabase (already Postgres — no new vector DB needed, avoid a second infra dependency). Table: `document_chunks(id, document_id, user_id, content, embedding vector(1536), source_page, created_at)`.
4. **Generate** — same `contentGenerator.js` pipeline, but the prompt's source material is retrieved chunks (RAG) instead of "general knowledge" — this reuses 90% of the existing lesson-generation code, it just swaps the context source.
5. **Route into** Skill Studio (as a user-scoped module) **and** Pulse (as a feed item) — both already read from shared content tables, so this is a routing decision, not two separate builds.

This is real, buildable on the current stack (Postgres + pgvector, no new service), and should be its own dedicated implementation pass — not bundled into a UI redesign PR.

---

## 5. Verification gate — tighten to match the vision, small and safe

Current: Quiz pass is scored server-side, `completeModule` requires `passed: true`. Vision asks for an explicit **80% floor** and **"repeat with more examples" on failure**, not just a retry.

Concrete, low-risk change: `QuizPanel`'s pass threshold moves from whatever it is today to a named constant `MODULE_PASS_THRESHOLD = 80`, and on failure, `generate()` is called again with a `remedial: true` flag that asks the content generator for **one additional worked example targeting the specific missed quiz topics** (pass the wrong-answer topics into the next generation call) rather than just re-showing the same lesson. This is a prompt-input change, not an architecture change.

---

## 6. Gamification — additive, not a rewrite

Real today: ELO, `arena_streak`, `streak_events`, milestones (`ArenaStreaks.jsx`).
Missing: XP, Skill Coins, Boss Battles, Seasons, Skill Trees, unlockable badges.

Recommend: **do not build all six.** XP/Coins are a second currency system next to ELO and risk exactly the "duplicate scoring system" trap the standing rules warn against. Minimal, safe additive set:
- **Badges** — derived, read-only, computed from existing `arena_streak`/`elo_rating`/`arena_completed` thresholds. No new writable column, no new economy.
- **Skill Trees** — a visual layer over the already-existing `skill_journeys` + `skill_graph_nodes` prerequisite structure. No new data model, just a new view.
- **Seasons/Boss Battles** — genuinely new (time-boxed leaderboard resets, special high-stakes Arena missions) — real feature, own spec, own migration, later phase.

---

## 7. Dashboard — "Mission Control"

Replacing the module list is a frontend-only change if it reads from data that already exists:
- Today's Mission → existing Arena daily-mission logic.
- Critical Skills → `computeCriticalGaps` (already returns sorted, tagged gaps).
- Interview Readiness / Arena Readiness → `arenaBridge.checkReadiness`.
- Knowledge Retention → `getDueReviews` (decay engine already live).
- Job Readiness / Predicted Salary / Recruiter Demand → **new derived metrics, need explicit formulas defined and reviewed before shipping** — these are the kind of number that becomes a promise to a job-seeking user; do not ship a placeholder heuristic labeled as a real prediction.

---

## 8. Database schema additions (net-new only — nothing here touches existing scoring columns)

```sql
-- Phase 1: revision content cache (flashcards/cheat sheets), keyed same as modules
create table module_revision_content (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  content_type text not null check (content_type in ('flashcard','cheat_sheet','mindmap','interview_qs')),
  content jsonb not null,
  created_at timestamptz default now()
);

-- Phase 2/3: document ingestion
create extension if not exists vector;
create table ingested_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text, source_type text, storage_path text,
  status text default 'processing',
  created_at timestamptz default now()
);
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references ingested_documents(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  source_page int,
  created_at timestamptz default now()
);
create index on document_chunks using ivfflat (embedding vector_cosine_ops);

-- Badges: read-only derived, no writable "currency"
create table user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz default now(),
  unique(user_id, badge_key)
);
```
All writes to `user_badges`/`ingested_documents`/`document_chunks` are service-role only, same RLS pattern as every other trust-sensitive table in this app.

---

## 9. Prompt architecture (Phase 1)

Single system prompt family, versioned, cached by `(skill_slug, level, mode, prompt_version)` — never regenerate identical content for two users:

```
LESSON_PROMPT_V2 = """
You are teaching {skillLabel} to a {jobTitle} candidate at {level} level.
Return JSON: { hook, diagram_spec, worked_example (use a real company scenario),
  common_mistake { wrong, correct, why }, checkpoint_question, cheat_sheet[] }
Constraints: {level}-appropriate, no fluff, one real numeric example, diagram_spec
must be renderable as a simple SVG animation (nodes + edges + a 2-4 step reveal sequence).
"""
```
`diagram_spec` is the concrete unlock that gets "animated diagrams" without a video pipeline — a small, strict JSON schema a React/Framer Motion component renders deterministically.

---

## 10. Phasing (what ships when)

| Phase | Scope | Depends on |
|---|---|---|
| 1 | Richer text lessons (worked example, mistake pairs, checkpoint gate, diagram_spec animations), Revise tab (flashcards/cheat sheets), 80% quiz floor + remedial regeneration, Mission Control dashboard (data that already exists) | nothing new — current stack |
| 2 | Document ingestion (pgvector RAG), Badges, Skill Tree view | pgvector extension, storage bucket |
| 3 | AI video/avatar pipeline, Seasons/Boss Battles | dedicated infra + budget spec, own sign-off |

Each phase ships behind its own feature flag (same pattern as `VITE_FF_SKILL_STUDIO_V2`), independently rollback-able, and none of them touch `apply_arena_result`, the ELO formulas, or `protect_profile_entitlements` — the systems this whole platform's credibility rests on.

---

## 11. What I'd push back on directly

- **AI-generated video for every lesson** is not a UI decision, it's an infra + cost decision (render minutes, TTS minutes, storage, CDN). Scoping it as part of a "redesign" undersells the actual engineering lift. Recommend Phase 1 ships and is measured (does animated-SVG + tutor chat move completion/retention?) before committing to video infra.
- **XP + Skill Coins as a second currency** next to ELO is the single highest-risk item in this whole brief given this app's own standing rule against duplicate scoring systems — recommend badges (derived, non-writable) instead, covers the same dopamine-loop goal without a second ledger to keep consistent with ELO.
- **"Predicted salary increase" / "recruiter demand" metrics** on the dashboard need a defined, defensible formula before they ship — an undefined heuristic presented as a prediction to someone making career decisions is a real trust risk, not a cosmetic one.

---

*This spec is intentionally phased rather than a single build. Say the word on which phase to start implementing and I'll trace the exact files touched, write the migration, and ship it with tests — same process as every fix in this session.*
