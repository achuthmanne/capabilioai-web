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
      ], { max_tokens: 2000, json: true })
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

/**
 * getOrCreateModule — the real cache-or-generate check. Returns
 * { module, blocks, cached: boolean }.
 */
export async function getOrCreateModule({ skillSlug, skillGraphNodeId, skillJourneyId, jobTitle, level = "intermediate", teachingMode = "intermediate", duration = 15 }) {
  const cacheKey = contentCacheKey(skillSlug, level, teachingMode)

  const { data: existingModule, error: findErr } = await supabaseAdmin
    .from(MODULES).select("*").eq("content_cache_key", cacheKey).eq("version", 1).maybeSingle()
  if (findErr) throw findErr

  if (existingModule) {
    const { data: blocks, error: blocksErr } = await supabaseAdmin
      .from(BLOCKS).select("*").eq("module_id", existingModule.id).order("ordinal", { ascending: true })
    if (blocksErr) throw blocksErr
    if (blocks && blocks.length > 0) {
      // Link this journey to the shared module if not already linked (a
      // module can be reused across journeys; skill_journey_id on the row
      // reflects the FIRST journey that generated it, purely informational).
      return { module: existingModule, blocks, cached: true }
    }
  }

  const { lesson, generatedBy } = await generateLesson({ topic: skillSlug, jobTitle, level, duration })

  const moduleRow = existingModule || (await supabaseAdmin
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

  const rows = blocksFromLesson(lesson).map(b => ({ ...b, module_id: moduleRow.id, generated_by: generatedBy, source_citations: [] }))
  const { data: insertedBlocks, error: insertErr } = await supabaseAdmin.from(BLOCKS).insert(rows).select()
  if (insertErr) throw insertErr

  return { module: moduleRow, blocks: insertedBlocks, cached: false, quiz: lesson.quiz || [] }
}

export { BLOCK_TYPES }
