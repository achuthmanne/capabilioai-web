/**
 * narrationEngine.test.js — Phase 2a (2026-07-30) narrated visual walkthrough.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { summarizeContentBlocks, buildScript, getOrCreateNarration, NARRATION_BUCKET } from "./narrationEngine.js"

test("summarizeContentBlocks pulls hook/sections/worked_example/common_mistake into one summary and caps diagram steps at 4", () => {
  const blocks = [
    { block_type: "hook", content: { hook: "Why this matters." } },
    { block_type: "overview", content: { title: "T", objective: "O" } },
    { block_type: "ai_explanation", content: { sections: [{ heading: "H1", content: "C1" }] } },
    { block_type: "worked_example", content: { company: "Acme", scenario: "S", walkthrough: "W" } },
    { block_type: "common_mistake", content: { wrong: "w", correct: "c", why: "y" } },
    { block_type: "diagram_spec", content: { steps: ["s1", "s2", "s3", "s4", "s5"] } },
  ]
  const { lessonSummary, diagramSteps } = summarizeContentBlocks(blocks)
  assert.ok(lessonSummary.includes("Why this matters."))
  assert.ok(lessonSummary.includes("Acme"))
  assert.ok(lessonSummary.includes("Common mistake"))
  assert.equal(diagramSteps.length, 4, "diagram steps must be capped at MAX_STEPS(4) to match DiagramSpecView")
})

test("summarizeContentBlocks returns an empty summary and no steps for a module with no content blocks", () => {
  const { lessonSummary, diagramSteps } = summarizeContentBlocks([])
  assert.equal(lessonSummary, "")
  assert.deepEqual(diagramSteps, [])
})

// 2026-08-19 (Phase 2.7 Batch 2): buildScript no longer calls Gemini/Groq
// directly — it calls deps.aiService.executePrompt(...), and the
// gemini-then-groq fallback mechanics moved into aiService/retryManager
// (see lib/ai/retryManager.test.js for that coverage). buildScript now
// returns {segments, provider} instead of a bare array, so generated_by
// can reflect the real serving provider instead of a hardcoded guess.

test("buildScript sanitizes the AI response: caps segment count, trims overlong text, drops empty segments", async () => {
  const longText = "x".repeat(1000)
  const raw = {
    segments: [
      ...Array.from({ length: 12 }, (_, i) => ({ text: `seg ${i}`, tiedToStep: i })),
      { text: "", tiedToStep: null }, // empty — must be dropped
      { text: longText, tiedToStep: null }, // overlong — must be trimmed
    ],
  }
  const deps = { aiService: { executePrompt: async () => ({ data: raw, provider: "gemini", model: "gemini-2.5-flash" }) } }
  const { segments } = await buildScript({ topic: "React Hooks", level: "intermediate", lessonSummary: "s", diagramSteps: [] }, deps)
  assert.ok(segments.length <= 8, "must cap at MAX_SEGMENTS(8)")
  assert.ok(segments.every((s) => s.text.length <= 400), "must cap segment text length")
  assert.ok(segments.every((s) => s.text.length > 0), "must drop empty-text segments")
})

test("buildScript returns the real serving provider, and wraps any executePrompt failure as generation_failed", async () => {
  const okDeps = {
    aiService: { executePrompt: async () => ({ data: { segments: [{ text: "hi", tiedToStep: null }] }, provider: "groq", model: "openai/gpt-oss-20b" }) },
  }
  const { segments, provider } = await buildScript({ topic: "T", level: "intermediate", lessonSummary: "s", diagramSteps: [] }, okDeps)
  assert.equal(segments.length, 1)
  assert.equal(provider, "groq")

  const failDeps = { aiService: { executePrompt: async () => { throw new Error("all providers exhausted") } } }
  await assert.rejects(
    () => buildScript({ topic: "T", level: "intermediate", lessonSummary: "s", diagramSteps: [] }, failDeps),
    (err) => err.code === "generation_failed"
  )
})

test("getOrCreateNarration returns the cached row on a hit without generating or synthesizing anything", async () => {
  const calls = []
  const deps = {
    supabaseAdmin: {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "n1", module_id: "mod-1", script: [] }, error: null }) }) }) }),
    },
    aiService: { executePrompt: async () => { calls.push("aiService"); return { data: {}, provider: "gemini", model: "gemini-2.5-flash" } } },
    synthesizeSpeech: async () => { calls.push("tts"); return { audioBuffer: Buffer.from(""), contentType: "audio/mpeg" } },
  }
  const { narration, cached } = await getOrCreateNarration({ moduleId: "mod-1", topic: "React Hooks", contentBlocks: [{ block_type: "hook", content: { hook: "h" } }] }, deps)
  assert.equal(cached, true)
  assert.equal(narration.id, "n1")
  assert.equal(calls.length, 0, "a cache hit must not call any AI/TTS provider")
})

test("getOrCreateNarration throws no_content (not generation_failed) when the module has no lesson content yet", async () => {
  const deps = {
    supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) },
    aiService: { executePrompt: async () => ({ data: {}, provider: "gemini", model: "gemini-2.5-flash" }) },
    synthesizeSpeech: async () => ({ audioBuffer: Buffer.from(""), contentType: "audio/mpeg" }),
  }
  await assert.rejects(
    () => getOrCreateNarration({ moduleId: "mod-2", topic: "React Hooks", contentBlocks: [] }, deps),
    (err) => err.code === "no_content"
  )
})

test("getOrCreateNarration drops a single failing segment but still succeeds if others synthesize, uploads to NARRATION_BUCKET, and persists", async () => {
  const inserted = []
  const uploaded = []
  const deps = {
    supabaseAdmin: {
      from: (table) => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        insert: (row) => {
          inserted.push([table, row])
          return { select: () => ({ single: async () => ({ data: { id: "n3", ...row }, error: null }) }) }
        },
      }),
      storage: {
        from: (bucket) => ({
          upload: async (path, buf, opts) => { uploaded.push({ bucket, path, opts }); return { error: null } },
          getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.test/${bucket}/${path}` } }),
        }),
      },
    },
    aiService: { executePrompt: async () => ({ data: { segments: [{ text: "seg A", tiedToStep: 0 }, { text: "seg B", tiedToStep: 1 }] }, provider: "gemini", model: "gemini-2.5-flash" }) },
    synthesizeSpeech: async (text) => {
      if (text === "seg B") throw new Error("deepgram flaked on this one segment")
      return { audioBuffer: Buffer.from("fake-mp3-bytes"), contentType: "audio/mpeg" }
    },
  }
  const { narration, cached } = await getOrCreateNarration(
    { moduleId: "mod-3", topic: "React Hooks", contentBlocks: [{ block_type: "hook", content: { hook: "h" } }] },
    deps
  )
  assert.equal(cached, false)
  assert.equal(uploaded.length, 1, "only the successfully-synthesized segment should be uploaded")
  assert.equal(uploaded[0].bucket, NARRATION_BUCKET)
  assert.equal(inserted[0][1].script.length, 1)
  assert.equal(inserted[0][1].script[0].text, "seg A")
  assert.ok(inserted[0][1].script[0].audioUrl.includes(NARRATION_BUCKET))
})

test("getOrCreateNarration throws generation_failed when every segment fails TTS synthesis (e.g. Deepgram unreachable)", async () => {
  const deps = {
    supabaseAdmin: {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    },
    aiService: { executePrompt: async () => ({ data: { segments: [{ text: "seg A", tiedToStep: 0 }] }, provider: "gemini", model: "gemini-2.5-flash" }) },
    synthesizeSpeech: async () => { throw new Error("DEEPGRAM_API_KEY not set") },
  }
  await assert.rejects(
    () => getOrCreateNarration({ moduleId: "mod-4", topic: "React Hooks", contentBlocks: [{ block_type: "hook", content: { hook: "h" } }] }, deps),
    (err) => err.code === "generation_failed"
  )
})
