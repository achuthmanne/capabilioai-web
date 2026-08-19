import { test } from "node:test"
import assert from "node:assert/strict"
import { contentCacheKey, getOrCreateModule, blocksFromLesson, generateRemedialSupplement, getOrCreateRevisionContent } from "./contentGenerator.js"

/** Minimal fake Supabase client covering only the chains getOrCreateModule
 *  actually uses: a cache-miss lookup, an insert, and a blocks insert. */
function fakeDeps(overrides = {}) {
  const calls = []
  const chain = (table) => ({
    select: () => ({
      eq: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: overrides.existingModule ?? null, error: null }) }),
        order: () => ({ then: (resolve) => resolve({ data: [], error: null }) }),
      }),
    }),
    insert: (row) => {
      calls.push(["insert", table, row])
      return {
        select: () => ({ single: async () => ({ data: { id: `${table}-row`, ...row }, error: null }) }),
        then: (resolve) => resolve({ data: [{ id: "block-1" }], error: null }),
      }
    },
  })
  return {
    supabaseAdmin: { from: chain },
    generateLesson: overrides.generateLesson || (async ({ topic }) => {
      calls.push(["generateLesson", topic])
      return { lesson: { title: topic, sections: [], keyPoints: [], quiz: [] }, generatedBy: "gemini" }
    }),
    blocksFromLesson: () => [{ block_type: "overview", ordinal: 0, content: {} }],
    _calls: calls,
  }
}

test("contentCacheKey is deterministic for the same (skill, level, mode) tuple", () => {
  const a = contentCacheKey("react-hooks", "intermediate", "code")
  const b = contentCacheKey("react-hooks", "intermediate", "code")
  assert.equal(a, b, "same tuple must always hash to the same cache key — this IS the real sticky-cache mechanism")
})

test("contentCacheKey differs when any part of the tuple differs", () => {
  const base = contentCacheKey("react-hooks", "intermediate", "code")
  assert.notEqual(base, contentCacheKey("react-hooks", "advanced", "code"))
  assert.notEqual(base, contentCacheKey("react-hooks", "intermediate", "eli5"))
  assert.notEqual(base, contentCacheKey("system-design", "intermediate", "code"))
})

// ─── BUG FIX REGRESSION (2026-07-29) ────────────────────────────────────────
// A real production incident: getOrCreateModule used to pass the raw cache
// slug (e.g. "pytorch--tensorflow" — slugify() turns "PyTorch / TensorFlow"
// into a double-hyphen slug once "/" is stripped) into the AI prompt as the
// lesson topic, instead of the human-readable skill label. These tests lock
// in the fix: prefer skillLabel, only fall back to skillSlug if no label was
// ever resolved by the caller.

test("getOrCreateModule (cache miss) generates with the human skillLabel, not the raw slug", async () => {
  const deps = fakeDeps()
  await getOrCreateModule({ skillSlug: "pytorch--tensorflow", skillLabel: "PyTorch / TensorFlow", skillGraphNodeId: "node-1", level: "intermediate" }, deps)
  const genCall = deps._calls.find((c) => c[0] === "generateLesson")
  assert.equal(genCall[1], "PyTorch / TensorFlow")
})

test("getOrCreateModule falls back to skillSlug only when no skillLabel is provided at all", async () => {
  const deps = fakeDeps()
  await getOrCreateModule({ skillSlug: "pytorch--tensorflow", skillGraphNodeId: "node-1", level: "intermediate" }, deps)
  const genCall = deps._calls.find((c) => c[0] === "generateLesson")
  assert.equal(genCall[1], "pytorch--tensorflow")
})

test("getOrCreateModule tags newly-generated blocks with the module's real skill_graph_node_id", async () => {
  const deps = fakeDeps()
  await getOrCreateModule({ skillSlug: "react-hooks", skillLabel: "React Hooks", skillGraphNodeId: "node-42", level: "intermediate" }, deps)
  const insertCall = deps._calls.find((c) => c[0] === "insert" && c[1] === "modules")
  assert.equal(insertCall[2].skill_graph_node_id, "node-42")
})

// ─── PHASE 1 (2026-07-30): richer lesson JSON shape ────────────────────────

test("blocksFromLesson emits all Phase 1 blocks when the AI provider returns every optional field", () => {
  const lesson = {
    title: "T", objective: "O",
    hook: "Why this matters.",
    sections: [{ heading: "H", content: "C", codeExample: "code()" }],
    worked_example: { company: "Acme", scenario: "S", walkthrough: "W" },
    common_mistake: { wrong: "w", correct: "c", why: "y" },
    diagram_spec: { type: "flow", nodes: [{ id: "n1", label: "N1" }], edges: [], steps: ["s1"] },
    checkpoint_question: { prompt: "P?", answer: "A" },
    keyPoints: ["k1"],
    practiceTask: "do X",
    nextTopics: ["next1"],
  }
  const blocks = blocksFromLesson(lesson)
  const types = blocks.map((b) => b.block_type)
  for (const t of ["hook", "overview", "ai_explanation", "example", "worked_example", "common_mistake", "diagram_spec", "checkpoint_question", "cheat_sheet", "common_mistakes", "summary"]) {
    assert.ok(types.includes(t), `expected block_type "${t}" to be present`)
  }
  // hook must render first (ordinal 0) so it appears above the overview.
  assert.equal(blocks[0].block_type, "hook")
  assert.equal(blocks.find((b) => b.block_type === "diagram_spec").content.nodes.length, 1)
})

test("blocksFromLesson degrades gracefully when Phase 1 optional fields are absent (old cached-shape lesson)", () => {
  const legacyLesson = { title: "T", objective: "O", sections: [], keyPoints: [], practiceTask: null, nextTopics: [] }
  const blocks = blocksFromLesson(legacyLesson)
  const types = blocks.map((b) => b.block_type)
  assert.ok(!types.includes("hook"))
  assert.ok(!types.includes("worked_example"))
  assert.ok(!types.includes("common_mistake"))
  assert.ok(!types.includes("diagram_spec"))
  assert.ok(!types.includes("checkpoint_question"))
  // The original required blocks must still all be present — backward compatible.
  for (const t of ["overview", "ai_explanation", "example", "cheat_sheet", "common_mistakes", "summary"]) {
    assert.ok(types.includes(t))
  }
})

// ─── PHASE 1: remedial regeneration is ephemeral (never persisted) ────────

// 2026-08-19 (Phase 2.7 Batch 2): generateRemedialSupplement no longer
// calls Gemini/Groq directly — it calls deps.aiService.executePrompt(...),
// and the gemini-then-groq fallback mechanics moved into
// aiService/retryManager (see retryManager.test.js for that coverage).
// These tests now cover generateRemedialSupplement's own, narrower
// responsibility: pass through executePrompt's data on success, wrap any
// failure as a generation_failed error. They no longer need or reference
// two separate provider mocks.

test("generateRemedialSupplement never writes to the DB — no supabaseAdmin insert call", async () => {
  const calls = []
  const deps = {
    aiService: { executePrompt: async () => ({ data: { extra_explanation: "e", extra_example: { scenario: "s", walkthrough: "w" } }, provider: "gemini", model: "gemini-2.5-flash" }) },
    supabaseAdmin: { from: () => { calls.push("supabaseAdmin.from"); throw new Error("must not touch the DB") } },
  }
  const result = await generateRemedialSupplement({ topic: "React Hooks", jobTitle: "Frontend Engineer", level: "intermediate", missedTopics: ["useEffect cleanup"] }, deps)
  assert.equal(result.extra_explanation, "e")
  assert.equal(calls.includes("supabaseAdmin.from"), false, "remedial content must never be persisted")
})

test("generateRemedialSupplement wraps any executePrompt failure as generation_failed", async () => {
  const failDeps = {
    aiService: { executePrompt: async () => { throw new Error("all providers exhausted") } },
    supabaseAdmin: {},
  }
  await assert.rejects(
    () => generateRemedialSupplement({ topic: "React Hooks", level: "intermediate", missedTopics: [] }, failDeps),
    (err) => err.code === "generation_failed"
  )
})

// ─── PHASE 1: revision content is cached per module, shared across learners ─

test("getOrCreateRevisionContent returns the cached row on a hit without generating anything", async () => {
  const calls = []
  const deps = {
    supabaseAdmin: {
      from: (table) => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "rev-1", module_id: "mod-1", content: { flashcards: [] } }, error: null }) }) }) }),
      }),
    },
    aiService: { executePrompt: async () => { calls.push("aiService"); return { data: {}, provider: "gemini", model: "gemini-2.5-flash" } } },
  }
  const { revision, cached } = await getOrCreateRevisionContent({ moduleId: "mod-1", topic: "React Hooks", level: "intermediate" }, deps)
  assert.equal(cached, true)
  assert.equal(revision.id, "rev-1")
  assert.equal(calls.length, 0, "a cache hit must not call any AI provider")
})

test("getOrCreateRevisionContent generates and persists on a cache miss, keyed to content_type=revision_bundle and tagged with the real serving provider", async () => {
  const inserted = []
  const deps = {
    supabaseAdmin: {
      from: (table) => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
        insert: (row) => {
          inserted.push([table, row])
          return { select: () => ({ single: async () => ({ data: { id: "rev-2", ...row }, error: null }) }) }
        },
      }),
    },
    aiService: {
      executePrompt: async () => ({
        data: { flashcards: [{ front: "f", back: "b" }], cheat_sheet: ["pt"], interview_qs: [] },
        provider: "gemini", model: "gemini-2.5-flash",
      }),
    },
  }
  const { revision, cached } = await getOrCreateRevisionContent({ moduleId: "mod-2", topic: "React Hooks", level: "intermediate" }, deps)
  assert.equal(cached, false)
  assert.equal(revision.id, "rev-2")
  assert.equal(inserted.length, 1)
  assert.equal(inserted[0][1].content_type, "revision_bundle")
  assert.equal(inserted[0][1].module_id, "mod-2")
  assert.equal(inserted[0][1].generated_by, "gemini", "generated_by must reflect the real provider that served the request, not a hardcoded guess")
})
