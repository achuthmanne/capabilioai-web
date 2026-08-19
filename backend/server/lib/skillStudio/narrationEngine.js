/**
 * narrationEngine.js — Skill Studio Phase 2a: narrated visual walkthrough.
 * ---------------------------------------------------------------------------
 * Generates a short spoken-narration script from a module's ALREADY-EXISTING
 * lesson content (hook/sections/worked_example/common_mistake/diagram_spec
 * steps — see contentGenerator.js's blocksFromLesson) and synthesizes real
 * TTS audio per segment via the SAME Deepgram Aura-2 pipeline EchoPitch
 * (CareerVideoGenerator.jsx) already uses in production
 * (backend/server/lib/deepgram.js#synthesizeSpeech).
 *
 * Key architectural difference from EchoPitch: EchoPitch regenerates script +
 * audio fresh on every click for one user's personal stats — acceptable
 * there because it's a one-off. Here, narration is generated ONCE per module
 * and cached (module_narration, unique on module_id; audio files cached in
 * the skill-studio-narration Storage bucket) — the exact same
 * generate-once/serve-to-everyone economics as modules/module_content_blocks
 * and module_revision_content. Cost scales with distinct modules, not with
 * learner count.
 *
 * Segments map 1:1 to diagram_spec steps (via tiedToStep) so the frontend
 * player can drive DiagramSpecView's animation off "which segment is
 * currently playing" rather than needing precise audio-duration timestamps —
 * simpler and more robust than time-coded sync.
 *
 * Narration is descriptive content only — never feeds quiz scoring,
 * MODULE_PASS_THRESHOLD, ELO, or any gating decision (same non-negotiable as
 * every other Phase 1/2 AI-generated surface in Skill Studio).
 */
import { supabaseAdmin } from "../supabase.js"
import { AIService } from "../ai/aiService.js"
import { synthesizeSpeech } from "../deepgram.js"

const NARRATION = "module_narration"
export const NARRATION_BUCKET = "skill-studio-narration"

const MAX_SEGMENTS = 8
const MAX_SEGMENT_CHARS = 400

/** Pull the plain-text lesson summary + ordered diagram steps out of a
 *  module's contentBlocks — the same rows blocksFromLesson() already wrote,
 *  no re-fetch of the raw lesson needed. */
export function summarizeContentBlocks(contentBlocks = []) {
  const byType = (t) => contentBlocks.find((b) => b.block_type === t)?.content
  const overview = byType("overview")
  const hook = byType("hook")
  const explanation = byType("ai_explanation")
  const workedExample = byType("worked_example")
  const commonMistake = byType("common_mistake")
  const diagramSpec = byType("diagram_spec")

  const parts = []
  if (hook?.hook) parts.push(`Hook: ${hook.hook}`)
  if (overview?.title) parts.push(`Title: ${overview.title}. Objective: ${overview.objective || ""}`)
  for (const s of explanation?.sections || []) {
    if (s?.heading || s?.content) parts.push(`Section "${s.heading || ""}": ${s.content || ""}`)
  }
  if (workedExample?.scenario) {
    parts.push(`Worked example (${workedExample.company || "a real company"}): ${workedExample.scenario}. ${workedExample.walkthrough || ""}`)
  }
  if (commonMistake?.wrong) {
    parts.push(`Common mistake — wrong: ${commonMistake.wrong}. Correct: ${commonMistake.correct}. Why: ${commonMistake.why || ""}`)
  }

  const diagramSteps = Array.isArray(diagramSpec?.steps) ? diagramSpec.steps.slice(0, 4) : []
  return { lessonSummary: parts.join("\n").slice(0, 6000), diagramSteps }
}

/** Sanitize/cap whatever the AI provider returned so a malformed response
 *  can't produce an unbounded number of TTS calls or oversized segments. */
function sanitizeScript(raw) {
  const segments = Array.isArray(raw?.segments) ? raw.segments : []
  return segments
    .filter((s) => typeof s?.text === "string" && s.text.trim().length > 0)
    .slice(0, MAX_SEGMENTS)
    .map((s) => ({
      text: s.text.trim().slice(0, MAX_SEGMENT_CHARS),
      tiedToStep: Number.isInteger(s.tiedToStep) ? s.tiedToStep : null,
    }))
}

/**
 * buildScript — gemini→groq fallback now handled by AIService/retryManager
 * (prompt "skillStudio.narrationScript"), same shape as
 * contentGenerator.js's generateLesson/generateRemedialSupplement. Never
 * invents new lesson facts — the prompt explicitly constrains the model to
 * the lessonSummary already generated in Phase 1.
 */
export async function buildScript({ topic, jobTitle, level, lessonSummary, diagramSteps }, deps = defaultDeps) {
  try {
    const { data, provider } = await deps.aiService.executePrompt("skillStudio.narrationScript", { topic, jobTitle: jobTitle || "Professional", skillLevel: level, lessonSummary, diagramSteps })
    return { segments: sanitizeScript(data), provider }
  } catch (genErr) {
    const err = new Error(`Narration script generation failed for ${topic}: ${genErr.message}`)
    err.code = "generation_failed"
    throw err
  }
}

/**
 * getOrCreateNarration — the cache-or-generate check for a module's
 * narrated walkthrough. Returns { narration: { id, script: [{text, tiedToStep, audioUrl}], ... }, cached }.
 */
export async function getOrCreateNarration({ moduleId, topic, jobTitle, level = "intermediate", contentBlocks = [] }, deps = defaultDeps) {
  const { data: existing, error: findErr } = await deps.supabaseAdmin
    .from(NARRATION).select("*").eq("module_id", moduleId).maybeSingle()
  if (findErr) throw findErr
  if (existing) return { narration: existing, cached: true }

  const { lessonSummary, diagramSteps } = summarizeContentBlocks(contentBlocks)
  if (!lessonSummary) {
    const err = new Error("No lesson content available to narrate for this module yet")
    err.code = "no_content"
    throw err
  }

  const { segments, provider } = await buildScript({ topic, jobTitle, level, lessonSummary, diagramSteps }, deps)
  if (segments.length === 0) {
    const err = new Error(`Narration script came back empty for ${topic}`)
    err.code = "generation_failed"
    throw err
  }

  // Synthesize + upload each segment's audio. One segment failing to
  // synthesize doesn't need to fail the whole module — we drop it and keep
  // going, so a single flaky TTS call doesn't block the whole walkthrough.
  const withAudio = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    try {
      const { audioBuffer, contentType } = await deps.synthesizeSpeech(seg.text)
      const path = `${moduleId}/segment-${i}.mp3`
      const { error: upErr } = await deps.supabaseAdmin.storage
        .from(NARRATION_BUCKET)
        .upload(path, audioBuffer, { contentType: contentType || "audio/mpeg", upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = deps.supabaseAdmin.storage.from(NARRATION_BUCKET).getPublicUrl(path)
      withAudio.push({ ...seg, audioUrl: publicUrl })
    } catch (segErr) {
      console.error(`[narrationEngine] segment ${i} TTS/upload failed for module ${moduleId}, dropping segment:`, segErr.message)
    }
  }

  if (withAudio.length === 0) {
    const err = new Error(`Every narration segment failed TTS synthesis for module ${moduleId} — Deepgram may be unreachable or unconfigured`)
    err.code = "generation_failed"
    throw err
  }

  const { data: inserted, error: insErr } = await deps.supabaseAdmin
    .from(NARRATION)
    .insert({ module_id: moduleId, script: withAudio, generated_by: `${provider || "unknown"}+deepgram` })
    .select().single()
  if (insErr) throw insErr
  return { narration: inserted, cached: false }
}

export const defaultDeps = { supabaseAdmin, aiService: AIService, synthesizeSpeech }
