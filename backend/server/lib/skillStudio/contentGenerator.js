/**
 * contentGenerator.js — real "sticky" module generation + caching.
 * ---------------------------------------------------------------------------
 * This is the fix for the fake "STICKY" claim in the original
 * routes/skillStudio.js (comments claimed generate-once-cache-forever but no
 * DB write ever backed that up). Real cache key = hash(skillSlug, level,
 * teachingMode); modules/module_content_blocks are shared across ALL users
 * who study the same (skill, level, mode) tuple — so generation cost scales
 * with distinct tuples, not with user count (spec §20/§29).
 *
 * Reuses the EXISTING AI routing (gemini.js primary, groq.js fallback) —
 * same provider choice routes/skillStudio.js already made for /lesson. No
 * new provider, no new prompt philosophy, just persistence added on top.
 */
import crypto from "crypto"
import { supabaseAdmin } from "../supabase.js"
import { AIService } from "../ai/aiService.js"

const MODULES = "modules"
const BLOCKS = "module_content_blocks"
const REVISION = "module_revision_content"

// 2026-07-30 Phase 1: added "hook", "worked_example", "common_mistake",
// "checkpoint_question", "diagram_spec" — see blocksFromLesson below. Old
// block types are untouched so existing cached modules keep rendering.
const BLOCK_TYPES = ["overview", "ai_explanation", "visual", "playground_config", "example", "cheat_sheet", "summary", "common_mistakes",
  "hook", "worked_example", "common_mistake", "checkpoint_question", "diagram_spec"]

export function contentCacheKey(skillSlug, level, teachingMode) {
  return crypto.createHash("sha1").update(`${skillSlug}::${level}::${teachingMode}`).digest("hex")
}

/**
 * generateLesson — extracted from getOrCreateModule so the content review
 * queue (contentQueue.js) can produce a DRAFT using the exact same
 * generation call/fallback chain, instead of a second, drifting copy of the
 * same gemini->groq logic.
 */
export async function generateLesson({ topic, jobTitle, level = "intermediate", duration = 15, remedial = false, missedTopics = [] }) {
  // Phase 2.7 Batch 2: gemini->groq fallback is now handled by
  // AIService/retryManager (prompt "skillStudio.generateLesson" declares
  // provider:"gemini", fallbackProvider:"groq") instead of this function's
  // own try/catch. generatedBy is inferred from which model actually
  // served the request — same information callers/DB rows had before,
  // just sourced from the real response instead of which catch block ran.
  try {
    const { data: lesson, provider } = await AIService.executePrompt("skillStudio.generateLesson", { topic, jobTitle: jobTitle || "Professional", skillLevel: level, duration, remedial, missedTopics })
    return { lesson, generatedBy: provider }
  } catch (genErr) {
    const err = new Error(`Lesson generation failed for ${topic}/${level}: ${genErr.message}`)
    err.code = "generation_failed"
    throw err
  }
}

/**
 * generateRemedialSupplement — the "one more targeted example" a learner
 * gets after failing a module's verification quiz (see quizEngine's
 * MODULE_PASS_THRESHOLD). Deliberately NOT part of getOrCreateModule's
 * cache: this content is specific to one learner's specific missed topics,
 * so persisting it into the shared modules/module_content_blocks tables
 * would leak one user's wrong answers into content served to everyone else
 * studying the same skill. Ephemeral — generated on request, returned
 * directly, never written to the DB.
 */
export async function generateRemedialSupplement({ topic, jobTitle, level = "intermediate", missedTopics = [] }, deps = defaultDeps) {
  try {
    const { data } = await deps.aiService.executePrompt("skillStudio.remedialSupplement", { topic, jobTitle: jobTitle || "Professional", skillLevel: level, missedTopics })
    return data
  } catch (genErr) {
    const err = new Error(`Remedial generation failed for ${topic}: ${genErr.message}`)
    err.code = "generation_failed"
    throw err
  }
}

/**
 * getOrCreateRevisionContent — flashcards/cheat_sheet/interview_qs, cached
 * per module exactly like lesson blocks (shared across every learner on the
 * same module — see module_revision_content's unique(module_id) index).
 * Generated lazily on first request, not on every module generation, so a
 * learner who never opens the Revise tab never pays the extra AI call.
 */
export async function getOrCreateRevisionContent({ moduleId, topic, jobTitle, level = "intermediate" }, deps = defaultDeps) {
  const { data: existing, error: findErr } = await deps.supabaseAdmin
    .from(REVISION).select("*").eq("module_id", moduleId).eq("content_type", "revision_bundle").maybeSingle()
  if (findErr) throw findErr
  if (existing) return { revision: existing, cached: true }

  const { data: content, provider: generatedBy } = await deps.aiService.executePrompt("skillStudio.revisionContent", { topic, jobTitle: jobTitle || "Professional", skillLevel: level })

  const { data: inserted, error: insErr } = await deps.supabaseAdmin
    .from(REVISION)
    .insert({ module_id: moduleId, content_type: "revision_bundle", content, generated_by: generatedBy })
    .select().single()
  if (insErr) throw insErr
  return { revision: inserted, cached: false }
}

export function blocksFromLesson(lesson) {
  const blocks = []
  // 2026-07-30 Phase 1: "hook" leads (ordinal 0) so it renders above the
  // title/objective overview — it's the "why this matters" opener the
  // spec asks for. Every new block below is only pushed when the provider
  // actually returned it (Groq's fallback or an older cached row may not
  // have it) — AIExplainPanel treats all of these as optional too, so a
  // lesson missing diagram_spec/worked_example/etc. just renders without
  // that section instead of showing broken UI.
  if (lesson.hook) blocks.push({ block_type: "hook", ordinal: 0, content: { hook: lesson.hook } })
  blocks.push({ block_type: "overview", ordinal: 1, content: { title: lesson.title, objective: lesson.objective } })
  blocks.push({ block_type: "ai_explanation", ordinal: 2, content: { sections: lesson.sections || [] } })
  blocks.push({ block_type: "example", ordinal: 3, content: { codeExamples: (lesson.sections || []).map(s => s.codeExample).filter(Boolean) } })
  if (lesson.worked_example) blocks.push({ block_type: "worked_example", ordinal: 4, content: lesson.worked_example })
  if (lesson.common_mistake) blocks.push({ block_type: "common_mistake", ordinal: 5, content: lesson.common_mistake })
  if (lesson.diagram_spec) blocks.push({ block_type: "diagram_spec", ordinal: 6, content: lesson.diagram_spec })
  if (lesson.checkpoint_question) blocks.push({ block_type: "checkpoint_question", ordinal: 7, content: lesson.checkpoint_question })
  blocks.push({ block_type: "cheat_sheet", ordinal: 8, content: { keyPoints: lesson.keyPoints || [] } })
  blocks.push({ block_type: "common_mistakes", ordinal: 9, content: { practiceTask: lesson.practiceTask || null } })
  blocks.push({ block_type: "summary", ordinal: 10, content: { nextTopics: lesson.nextTopics || [] } })
  return blocks
}

// DI shape (same as arenaIngestion.js/contentQueue.js's defaultDeps) so
// getOrCreateModule's topic-selection logic — the exact thing that regressed
// to a raw slug — can be unit tested without a real Supabase/Gemini/Groq call.
// 2026-07-30: geminiGenerateRemedialSupplement/geminiGenerateRevisionContent/
// groq added so generateRemedialSupplement/getOrCreateRevisionContent are
// equally testable without hitting a real AI provider.
// 2026-08-19 (Phase 2.7 Batch 2): those three raw-provider deps replaced by
// one `aiService` dep (defaults to the real AIService) — the functions now
// call deps.aiService.executePrompt(...) instead of a raw provider
// function directly, matching every other migrated call site in this
// batch. Tests inject a fake aiService with a matching executePrompt
// shape instead of mocking individual provider functions.
export const defaultDeps = { supabaseAdmin, generateLesson, blocksFromLesson, aiService: AIService }

/**
 * getOrCreateModule — the real cache-or-generate check. Returns
 * { module, blocks, cached: boolean }.
 */
export async function getOrCreateModule({ skillSlug, skillLabel, skillGraphNodeId, skillJourneyId, jobTitle, level = "intermediate", teachingMode = "intermediate", duration = 15 }, deps = defaultDeps) {
  const cacheKey = contentCacheKey(skillSlug, level, teachingMode)

  const { data: existingModule, error: findErr } = await deps.supabaseAdmin
    .from(MODULES).select("*").eq("content_cache_key", cacheKey).eq("version", 1).maybeSingle()
  if (findErr) throw findErr

  if (existingModule) {
    const { data: blocks, error: blocksErr } = await deps.supabaseAdmin
      .from(BLOCKS).select("*").eq("module_id", existingModule.id).order("ordinal", { ascending: true })
    if (blocksErr) throw blocksErr
    if (blocks && blocks.length > 0) {
      // Link this journey to the shared module if not already linked (a
      // module can be reused across journeys; skill_journey_id on the row
      // reflects the FIRST journey that generated it, purely informational).
      return { module: existingModule, blocks, cached: true }
    }
  }

  // BUG FIX (2026-07-29): this used to pass skillSlug (e.g. "pytorch--tensorflow"
  // — slugify() turns "PyTorch / TensorFlow" into a double-hyphen slug once the
  // "/" is stripped) straight into the AI prompt as the topic. skillSlug is a
  // cache key, not a human-readable label — falls back to it only if no real
  // label was ever resolved by the caller.
  const { lesson, generatedBy } = await deps.generateLesson({ topic: skillLabel || skillSlug, jobTitle, level, duration })

  const moduleRow = existingModule || (await deps.supabaseAdmin
    .from(MODULES)
    .insert({
      skill_journey_id: skillJourneyId || null,
      skill_graph_node_id: skillGraphNodeId,
      teaching_mode: teachingMode,
      level,
      content_cache_key: cacheKey,
      version: 1,
    })
    .select().single()).data

  const rows = deps.blocksFromLesson(lesson).map(b => ({ ...b, module_id: moduleRow.id, generated_by: generatedBy, source_citations: [] }))
  const { data: insertedBlocks, error: insertErr } = await deps.supabaseAdmin.from(BLOCKS).insert(rows).select()
  if (insertErr) throw insertErr

  return { module: moduleRow, blocks: insertedBlocks, cached: false, quiz: lesson.quiz || [] }
}

export { BLOCK_TYPES }
