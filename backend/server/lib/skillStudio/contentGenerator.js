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
import { geminiGenerateLesson, geminiGenerateRemedialSupplement, geminiGenerateRevisionContent } from "../gemini.js"
import { groq } from "../groq.js"

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
  try {
    const lesson = await geminiGenerateLesson({ topic, jobTitle: jobTitle || "Professional", skillLevel: level, duration, remedial, missedTopics })
    return { lesson, generatedBy: "gemini" }
  } catch (geminiErr) {
    try {
      const remedialNote = remedial
        ? ` This is a REMEDIAL re-teach after the learner failed a quiz on: ${missedTopics.join(", ") || topic}. Don't repeat the same explanation — go deeper on exactly those points with one more worked example.`
        : ""
      // 2026-07-30 Phase 1: Groq fallback now asks for the same richer schema
      // Gemini's primary path does (hook/worked_example/common_mistake/
      // checkpoint_question/diagram_spec) so a Gemini outage doesn't silently
      // degrade every lesson back to the old bare-bones shape.
      const raw = await groq([
        { role: "system", content: "Generate structured micro-lessons for Indian tech professionals. Return ONLY valid JSON." },
        { role: "user", content: `${duration}-min lesson on "${topic}" for ${level} ${jobTitle || "Professional"}.${remedialNote}
Return JSON: {"title":"...","objective":"...","hook":"1-2 sentences, why this matters","sections":[{"heading":"...","content":"...","codeExample":"..."}],"worked_example":{"company":"a real Indian company","scenario":"...","walkthrough":"step-by-step, ending in a concrete result"},"common_mistake":{"wrong":"...","correct":"...","why":"..."},"checkpoint_question":{"prompt":"...","answer":"..."},"diagram_spec":{"type":"flow|merge|comparison|hierarchy","nodes":[{"id":"n1","label":"..."}],"edges":[{"from":"n1","to":"n2","label":"optional"}],"steps":["...", "..."]},"keyPoints":["..."],"quiz":[{"question":"...","options":["a","b","c","d"],"correct":0,"explanation":"..."}],"practiceTask":"...","nextTopics":["..."]}` },
      // BUG FIX (2026-07-29): 2000 tokens was too tight for this schema (title +
      // objective + 3 sections w/ code examples + 5 quiz questions w/ options/
      // explanations + keyPoints + practiceTask + nextTopics) — Groq was cutting
      // the response off mid-object, producing invalid JSON (json_validate_failed)
      // on a real, reproducible fraction of lessons rather than a rare edge case.
      // 2026-07-30: bumped again (3200→4200) for the Phase 1 richer schema —
      // the same truncation failure mode would otherwise reappear immediately.
      ], { max_tokens: 4200, json: true })
      return { lesson: JSON.parse(raw), generatedBy: "groq" }
    } catch (groqErr) {
      const err = new Error(`Lesson generation failed for ${topic}/${level}: ${groqErr.message} (gemini: ${geminiErr.message})`)
      err.code = "generation_failed"
      throw err
    }
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
    return await deps.geminiGenerateRemedialSupplement({ topic, jobTitle: jobTitle || "Professional", skillLevel: level, missedTopics })
  } catch (geminiErr) {
    try {
      const raw = await deps.groq([
        { role: "user", content: `A ${level} ${jobTitle || "Professional"} just failed a quiz on "${topic}", missing: ${missedTopics.join(", ") || topic}. Give ONE more targeted worked example plus a short explanation addressing those gaps.
Return JSON: {"extra_explanation":"2-4 sentences","extra_example":{"scenario":"...","walkthrough":"step-by-step, ending in a concrete result"}}` },
      ], { max_tokens: 600, json: true })
      return JSON.parse(raw)
    } catch (groqErr) {
      const err = new Error(`Remedial generation failed for ${topic}: ${groqErr.message} (gemini: ${geminiErr.message})`)
      err.code = "generation_failed"
      throw err
    }
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

  let content
  let generatedBy = "gemini"
  try {
    content = await deps.geminiGenerateRevisionContent({ topic, jobTitle: jobTitle || "Professional", skillLevel: level })
  } catch (geminiErr) {
    generatedBy = "groq"
    const raw = await deps.groq([
      { role: "user", content: `Create revision material for "${topic}" for a ${level} ${jobTitle || "Professional"}.
Return JSON: {"flashcards":[{"front":"...","back":"..."}],"cheat_sheet":["..."],"interview_qs":[{"question":"...","answer_outline":"..."}]}` },
    ], { max_tokens: 1400, json: true })
    content = JSON.parse(raw)
  }

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
export const defaultDeps = { supabaseAdmin, generateLesson, blocksFromLesson, geminiGenerateRemedialSupplement, geminiGenerateRevisionContent, groq }

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
