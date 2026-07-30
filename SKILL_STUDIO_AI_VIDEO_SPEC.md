# Skill Studio — AI Video / Visual-Narration Spec (Phase 2)

**Status:** proposal, not yet built. Grounded in what actually exists in this codebase today — no code has been written against this spec yet.

**Goal stated by stakeholder:** learners disengage from text-only lessons; add AI video/visual explanation to Skill Studio skills and modules to increase concentration and engagement.

---

## 1. What already exists that this must build on (not duplicate)

Before proposing anything new, here is the real, already-shipped video/audio capability in this codebase — found by tracing the actual files, not assumed:

**EchoPitch / `CareerVideoGenerator.jsx`** (1,331 lines, live in production today, gated to Elite-plan professional users):
- Renders 9 hand-coded Canvas2D "slides" of a user's career stats (`renderIntro`, `renderStats`, `renderSkills`, etc.)
- Narration script generated once via Claude, read aloud with **real synthesized audio** via Deepgram Aura-2 TTS (`POST /api/tts/speak` → `backend/server/lib/deepgram.js`)
- Audio is mixed into the recording using `AudioContext` + `canvas.captureStream(30)` + `MediaRecorder` — genuinely produces a downloadable `.webm` file with real narration audio, not a silent screen capture
- **No caching** — every "Generate" click reruns Claude + Deepgram + the full real-time recording pass. That's acceptable there because it's a personalized one-off per user; it would NOT be acceptable for Skill Studio, where the same lesson is viewed by thousands of learners (see §3).
- **No server-side storage** — output is a local browser download only, nothing is uploaded or cached.
- Deepgram Aura-2 has **no Indian-English voice** (only American/British/Australian/Filipino) — an honest, already-documented limitation, not something this spec can silently fix.

**What does NOT exist anywhere in this codebase:** any true generative video model (no Veo, Sora-class, Runway, HeyGen, D-ID, Synthesia integration), any image-generation model (no Imagen/DALL-E/Stable Diffusion), any server-side video composition (no ffmpeg, no headless-browser render farm). Supabase Storage buckets DO already exist and are used elsewhere (`org-media`, `task-attachments`, a documents vault bucket) — so adding a new bucket for cached learning-video assets is a proven, low-risk pattern, not new infrastructure category.

**What Phase 1 (already shipped) gives us for free:** every module already has a `diagram_spec` (nodes/edges/steps, rendered today as an animated SVG via `DiagramSpecView.jsx`), a `hook`, a `worked_example`, a `common_mistake`, and lesson `sections` — i.e., a full script's worth of real content already sitting in `module_content_blocks`, cached per (skill, level, mode) tuple. This is the raw material for narration — it doesn't need to be regenerated.

---

## 2. The real constraint that shapes every option below

Skill Studio's entire economics depend on one rule, stated in `contentGenerator.js`'s own header comment: **generation cost scales with distinct (skill, level, mode) tuples, not with learner count.** A lesson is generated once and served to every learner who studies that tuple. EchoPitch's model — regenerate live, every click, in-browser — is the opposite of this and would be financially unworkable applied directly to Skill Studio (Deepgram TTS + script-generation cost multiplied by every learner opening every lesson, not by distinct lessons).

So the central design question for AI video in Skill Studio is not "can we generate a video" — EchoPitch already proves that's possible — it's **"can we generate it once and cache it,"** the same discipline already applied to lessons, remedial content, and revision bundles in Phase 1.

---

## 3. Three real options, honestly compared

### Option A — Narrated Visual Walkthrough (recommended Phase 2 MVP)
Generate a **timed narration script + real TTS audio**, synced to the visuals Phase 1 already built (`DiagramSpecView`, worked example, hook, sections) via timestamps. The learner gets a played-back, audio-narrated, animated walkthrough with play/pause/scrub — a genuine video-like experience — without literally producing a video file.

- **New generation, cached once per module:** a narration script (JSON: array of `{segment, text, startAt, tiedToBlock}`) + one TTS audio file per module (or per segment), generated via the exact Deepgram Aura-2 pipeline EchoPitch already uses (`synthesizeSpeech`), stored once in a new Supabase Storage bucket, served to everyone who opens that module.
- **Reuses ~90% of Phase 1's existing content and DiagramSpecView rendering** — no new visual-authoring system needed.
- **Cost:** Deepgram Aura-2 is ~$0.030–0.050 per 1,000 characters (order-of-magnitude; verify current pricing before committing budget) — a 2–3 minute narration script (~2,000–3,000 characters) costs roughly a few cents, generated **once per module**, not per learner. This is the same cache-amortization economics as the rest of Skill Studio.
- **Free accessibility win:** the narration script IS the caption/transcript text — auto-captions come for free.
- **Honest limitation:** this is not "AI generates video pixels." It's real audio narration over the same deterministic visual the learner would otherwise read — closer to a narrated slideshow than a produced video. Whether that satisfies "AI video" for engagement purposes is a real product judgment call, not a technical one — flagged here rather than assumed.

### Option B — Cached Exported Video File (Phase 2 stretch, same content, literal file)
Same script + audio as Option A, but additionally use the EchoPitch `captureStream()` + `MediaRecorder` technique to record the `DiagramSpecView` animation + narration into an actual `.webm` file — **once**, cached in Storage, served to every subsequent learner instead of re-rendering. Two ways to get that "once":
  - **B1 (opportunistic):** the first learner who opens a module triggers a background, muted recording pass in their own browser tab; on completion, upload the result to Storage and mark the module's video as cached. Zero new server infrastructure, but the first viewer's experience is slower and this depends on a real user's browser tab staying open — fragile.
  - **B2 (server-rendered):** a headless-browser render service (e.g. Playwright + a virtual display) runs the same canvas render + capture pipeline server-side, on-demand or as a background job, uploads the result to Storage. This is genuinely new infrastructure (a render worker, likely queued via a job table, with real latency — minutes, not seconds) and is the first point in this spec that needs its own follow-up design pass before being built.
- **Recommendation:** treat B as an enhancement on top of A once A is live and validated, using B2 (not B1 — too fragile for a production learning product) — not a Phase 2 launch requirement.

### Option C — True Generative AI Video / Talking Avatar (Phase 3, separate decision)
Integrate a third-party text-to-video or talking-avatar API (e.g. a Veo/Sora-class model, or a HeyGen/D-ID/Synthesia-style avatar service) to produce genuinely AI-generated visual footage or a talking presenter, not narration-over-diagrams.
- **This is the actual "AI video" most people picture**, and it's the one lever likely to move engagement the most — also the one with the least evidence in this codebase and the most risk:
  - **Cost:** these providers commonly charge **per minute of generated output**, materially higher than TTS-only (order of magnitude: low-to-several dollars per minute depending on provider/quality tier) — needs real vendor pricing pulled before any commitment, and the cache-once-per-module discipline matters even more here.
  - **Latency:** generation is typically async and can take minutes, not seconds — requires a job queue + status polling UI, not a synchronous request like today's lesson generation.
  - **New vendor dependency + moderation surface:** a new API key, new ToS/data-handling review, and new content-moderation responsibility (a generated talking-avatar video is a much bigger "what if this is wrong or inappropriate" surface than a text block).
  - **No existing integration to build on** — unlike Options A/B, there is nothing in this codebase to extend here; it would be a from-scratch vendor integration.
- **Recommendation:** don't build this until Option A ships and its engagement data (completion rate, time-on-lesson, retention) is measured — committing real per-minute vendor spend to Option C without that signal is a bet, not a data-backed decision. If the data says A isn't moving engagement enough, C becomes the next real conversation — with its own cost ceiling and provider selection as a dedicated design pass.

---

## 4. Recommended phasing

| Phase | Scope | New infra | Ships when |
|---|---|---|---|
| 2a | Option A — narrated visual walkthrough, cached per module, new "Watch" tab in `ModuleRuntime.jsx` alongside Learn/Tutor/Quiz/Revise/Interview | 1 new Storage bucket, 1 new cache table, reuses Deepgram TTS + DiagramSpecView | Can start immediately — no unresolved dependency |
| 2b | Option B2 — literal cached `.webm` per module via server-side headless render | Render worker + job queue (new) | After 2a ships and is validated; own design/review pass first |
| 3 | Option C — true generative video / talking avatar | New vendor integration, async job pipeline, moderation review | Only after 2a's engagement data justifies the spend; separate scoped proposal |

This mirrors exactly how Phase 1 was scoped and delivered — smallest safe increment first, instrumented, then escalate only if justified.

---

## 5. Architecture for Phase 2a (the part that's ready to build)

**Non-negotiables (same category as Phase 1's):**
- Narration is descriptive content only — **never** feeds quiz scoring, `MODULE_PASS_THRESHOLD`, ELO, or any gating decision. Purely additive to the Learn experience.
- Cached per `(skill, level, mode)` tuple exactly like `modules`/`module_content_blocks` — one generation serves every learner on that tuple, preserving Skill Studio's core cost model.
- Ships behind a feature flag, off by default (`skill_studio_video` or nested under the existing `skill_studio_v2` flag — needs a decision, see §7).
- No claim of an Indian-English voice unless we actually add a provider that has one (Deepgram doesn't) — must not repeat that mislabeling risk.
- RLS on the new table mirrors `module_revision_content`: public `SELECT`, service-role-only write.

**New DB table** (same shape as `module_revision_content`):
```sql
create table module_narration (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  script jsonb not null,        -- [{ segment, text, startAtMs, tiedToBlockType }]
  audio_storage_path text,      -- path in the new Storage bucket, one file per module (or per segment)
  duration_ms integer,
  generated_by text,
  created_at timestamptz not null default now(),
  unique (module_id)
);
alter table module_narration enable row level security;
create policy "module narration public read" on module_narration for select using (true);
```

**New Storage bucket:** `skill-studio-narration` (public-read or signed-URL, matching how `org-media`/`task-attachments` are already configured elsewhere in this codebase).

**Generation flow:** `getOrCreateNarration({ moduleId, contentBlocks })` — same shape as `getOrCreateRevisionContent` — checks the cache table first; on miss, builds a script from the module's existing `hook`/`sections`/`worked_example`/`diagram_spec.steps` (an LLM call to turn those into a natural narration script, timed against the diagram's existing step count), calls `synthesizeSpeech()` per segment (reusing `deepgram.js` as-is), uploads the audio to Storage, writes the cache row.

**Frontend:** a new "Watch" tab in `ModuleRuntime.jsx`, rendering `DiagramSpecView` (already built) driven by an audio-timeline instead of manual step buttons — audio `timeupdate` events advance the visual's `step` state to match `startAtMs`. Captions rendered directly from `script[].text`. No new visual-authoring system.

---

## 6. What I need a decision on before writing code

1. **Confirm Option A (narrated walkthrough) as the Phase 2a target**, not jumping straight to Option C — I've made the case above but this is your call given it's a real product-fit question, not just an engineering one.
2. **Voice:** ship with Deepgram's American-English `aura-2-luna-en` (same as EchoPitch, honestly labeled), or hold Phase 2a until an Indian-English-capable provider (e.g. Google Cloud TTS `en-IN`) is evaluated? This affects provider choice, not just cosmetics.
3. **Flag naming/placement:** new `skill_studio_video` flag, or nested under the existing `skill_studio_v2` flag? Nesting is simpler but means video can't be rolled back independently of the rest of V2 if it misbehaves.
4. **Budget ceiling for Phase 2a** — even at cents-per-module, I'd like an explicit "ok to generate narration for the top N most-used modules first" scope rather than backfilling every existing module at once.

I'll hold on writing any code until these are confirmed, consistent with how Phase 1 was scoped.
