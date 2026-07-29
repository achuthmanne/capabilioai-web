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
import { geminiGenerateLesson } from "../gemini.js"
import { groq } from "../groq.js"

const MODULES = "modules"
const BLOCKS = "module_content_blocks"

const BLOCK_TYPES = ["overview", "ai_explanation", "visual", "playground_config", "example", "cheat_sheet", "summary", "common_mistakes"]

export function contentCacheKey(skillSlug, level, teachingMode) {
  return crypto.createHash("sha1").update(`${skillSlug}::${level}::${teachingMode}`).digest("hex")
}

/**
 * generateLesson — extracted from getOrCreateModule so the content review
 * queue (contentQueue.js) can produce a DRAFT using the exact same
 * generation call/fallback chain, instead of a second, drifting copy of the
 * same gemini->groq logic.
 */
export async function generateLesson({ topic, jobTitle, level = "intermediate", duration = 15 }) {
  try {
    const lesson = await geminiGenerateLesson({ topic, jobTitle: jobTitle || "Professional", skillLevel: level, duration })
    return { lesson, generatedBy: "gemini" }
  } catch (geminiErr) {
    try {
      const raw = await groq([
        { role: "system", content: "Generate structured micro-lessons for Indian tech professionals. Return ONLY valid JSON." },
        { role: "user", content: `${duration}-min lesson on "${topic}" for ${level} ${jobTitle || "Professional"}.\nReturn JSON: {"title":"...","objective":"...","sections":[{"heading":"...","content":"...","codeExample":"..."}],"keyPoints":["..."],"quiz":[{"question":"...","options":["a","b","c","d"],"correct":0,"explanation":"..."}],"practiceTask":"...","nextTopics":["..."]}` },
      // BUG FIX (2026-07-29): 2000 tokens was too tight for this schema (title +
      // objective + 3 sections w/ code examples + 5 quiz questions w/ options/
      // explanations + keyPoints + practiceTask + nextTopics) — Groq was cutting
      // the response off mid-object, producing invalid JSON (json_validate_failed)
      // on a real, reproducible fraction of lessons rather than a rare edge case.
      ], { max_tokens: 3200, json: true })
      return { lesson: JSON.parse(raw), generatedBy: "groq" }
    } catch (groqErr) {
      const err = new Error(`Lesson generation failed for ${topic}/${level}: ${groqErr.message} (gemini: ${geminiErr.message})`)
      err.code = "generation_failed"
      throw err
    }
  }
}

export function blocksFromLesson(lesson) {
  const blocks = []
  blocks.push({ block_type: "overview", ordinal: 0, content: { title: lesson.title, objective: lesson.objective } })
  blocks.push({ block_type: "ai_explanation", ordinal: 1, content: { sections: lesson.sections || [] } })
  blocks.push({ block_type: "example", ordinal: 2, content: { codeExamples: (lesson.sections || []).map(s => s.codeExample).filter(Boolean) } })
  blocks.push({ block_type: "cheat_sheet", ordinal: 3, content: { keyPoints: lesson.keyPoints || [] } })
  blocks.push({ block_type: "common_mistakes", ordinal: 4, content: { practiceTask: lesson.practiceTask || null } })
  blocks.push({ block_type: "summary", ordinal: 5, content: { nextTopics: lesson.nextTopics || [] } })
  return blocks
}

// DI shape (same as arenaIngestion.js/contentQueue.js's defaultDeps) so
// getOrCreateModule's topic-selection logic — the exact thing that regressed
// to a raw slug — can be unit tested without a real Supabase/Gemini/Groq call.
export const defaultDeps = { supabaseAdmin, generateLesson, blocksFromLesson }

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
