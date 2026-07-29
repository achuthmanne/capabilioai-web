import { test } from "node:test"
import assert from "node:assert/strict"
import { contentCacheKey, getOrCreateModule } from "./contentGenerator.js"

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
