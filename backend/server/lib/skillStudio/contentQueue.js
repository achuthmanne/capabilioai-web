/**
 * contentQueue.js — the content/admin review queue (spec §19/§25).
 * ---------------------------------------------------------------------------
 * Generated module drafts (and, structurally, quiz/visual/explanation drafts
 * — same generation_jobs table, different job_type) sit in `pending_review`
 * until an admin approves them. Reuses:
 *   - contentGenerator.js's generateLesson()/blocksFromLesson() for the
 *     actual generation call (no second gemini/groq prompt path),
 *   - graphService.js's ensureSkillNode/getNodeBySlug (no second taxonomy),
 *   - modules/module_content_blocks (no second content table) as the
 *     PUBLISH target once a job is approved.
 *
 * A draft never touches modules/module_content_blocks until approved — that
 * table only ever holds reviewed/live content, exactly the same guarantee
 * the spec makes for mentor/creator-sourced material ("always lands in
 * pending_review before it's visible to any learner").
 *
 * Versioning: approving an edited/regenerated job for a (skill, level, mode)
 * tuple that already has a live module INSERTS A NEW VERSION rather than
 * mutating the existing one in place — a learner mid-module never has
 * content rewritten under them (spec §13).
 */
import { supabaseAdmin } from "../supabase.js"
import { slugify, ensureSkillNode, getNodeBySlug } from "./graphService.js"
import { generateLesson, blocksFromLesson, contentCacheKey } from "./contentGenerator.js"

const JOBS = "generation_jobs"
const REVIEWS = "generation_job_reviews"
const SOURCES = "content_sources"
const MODULES = "modules"
const BLOCKS = "module_content_blocks"

/**
 * Same DI shape as arenaIngestion.js's defaultDeps — every exported function
 * below takes an optional `deps` last-argument (defaulting to the real
 * modules) so unit tests can inject a fake supabaseAdmin/generateLesson
 * without hitting the live DB or calling gemini/groq for real.
 */
export const defaultDeps = { supabaseAdmin, slugify, ensureSkillNode, getNodeBySlug, generateLesson, blocksFromLesson, contentCacheKey }

/** Simple, real quality heuristics — not a rubric-scored AI review (spec
 *  §22 philosophy applied here too: a structural check should be
 *  deterministic where it can be, not another AI call judging AI output). */
function computeQualityFlags(lesson) {
  const flags = []
  if (!lesson?.sections || lesson.sections.length === 0) flags.push("empty_sections")
  if (!lesson?.objective) flags.push("missing_objective")
  if (!(lesson?.sections || []).some((s) => s.codeExample)) flags.push("no_code_example")
  if ((lesson?.keyPoints || []).length === 0) flags.push("no_key_points")
  return flags
}

export async function createContentSource({ uploadedBy, sourceType = "manual", fileRef = null, extractedText = null }, deps = defaultDeps) {
  const { data, error } = await deps.supabaseAdmin
    .from(SOURCES)
    .insert({ uploaded_by: uploadedBy, source_type: sourceType, file_ref: fileRef, extracted_text: extractedText, status: extractedText ? "parsed" : "pending" })
    .select().single()
  if (error) throw error
  return data
}

/**
 * requestModuleGeneration — creates a generation_jobs row and runs the
 * generation SYNCHRONOUSLY to a draft (`pending_review`). No queue/worker
 * infra exists yet in this codebase for async job processing (checked —
 * simplest production-safe path per the engineering constraints), so this
 * mirrors the same synchronous-grading choice submission-engine/service.js
 * already made ("this milestone grades synchronously... a future async
 * path isn't used as a distinct step here").
 */
export async function requestModuleGeneration({ requestedBy, contentSourceId = null, skillName, jobTitle, level = "intermediate", teachingMode = "intermediate" }, deps = defaultDeps) {
  const { data: job, error: insertErr } = await deps.supabaseAdmin
    .from(JOBS)
    .insert({
      job_type: "module", content_source_id: contentSourceId, requested_by: requestedBy,
      input_ref: { skillName, jobTitle, level, teachingMode }, status: "running",
    })
    .select().single()
  if (insertErr) throw insertErr

  try {
    const { lesson, generatedBy } = await deps.generateLesson({ topic: skillName, jobTitle, level })
    const outputRef = { skillName, level, teachingMode, generatedBy, lesson, blocks: deps.blocksFromLesson(lesson) }
    const qualityFlags = computeQualityFlags(lesson)

    const { data: updated, error: updateErr } = await deps.supabaseAdmin
      .from(JOBS)
      .update({ status: "pending_review", output_ref: outputRef, quality_flags: qualityFlags, updated_at: new Date().toISOString() })
      .eq("id", job.id).select().single()
    if (updateErr) throw updateErr
    return updated
  } catch (e) {
    await deps.supabaseAdmin.from(JOBS).update({ status: "failed", error: e.message, updated_at: new Date().toISOString() }).eq("id", job.id)
    const err = new Error(e.message)
    err.code = "generation_failed"
    err.jobId = job.id
    throw err
  }
}

export async function listJobs({ status = null, jobType = null, limit = 50, offset = 0 } = {}, deps = defaultDeps) {
  let q = deps.supabaseAdmin.from(JOBS).select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1)
  if (status) q = q.eq("status", status)
  if (jobType) q = q.eq("job_type", jobType)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getJob(jobId, deps = defaultDeps) {
  const { data: job, error } = await deps.supabaseAdmin.from(JOBS).select("*").eq("id", jobId).maybeSingle()
  if (error) throw error
  if (!job) return null
  const { data: reviews, error: reviewErr } = await deps.supabaseAdmin
    .from(REVIEWS).select("*").eq("generation_job_id", jobId).order("created_at", { ascending: true })
  if (reviewErr) throw reviewErr
  return { ...job, reviews: reviews || [] }
}

/**
 * approveJob — publishes the draft to the REAL modules/module_content_blocks
 * tables (the same tables the learner-triggered path in contentGenerator.js
 * writes to), versioned if a live module for this (skill, level, mode)
 * tuple already exists.
 */
export async function approveJob(jobId, { reviewerId, notes = null } = {}, deps = defaultDeps) {
  const job = await getJob(jobId, deps)
  if (!job) throw new Error("Job not found")
  if (!["pending_review"].includes(job.status)) {
    const err = new Error(`Cannot approve a job in status '${job.status}' — must be pending_review`)
    err.code = "invalid_transition"
    throw err
  }

  let publishedModuleId = null
  if (job.job_type === "module" && job.output_ref?.blocks) {
    const { skillName, level, teachingMode, blocks } = job.output_ref
    const slug = deps.slugify(skillName)
    let node = await deps.getNodeBySlug(slug, "skill")
    if (!node) node = await deps.ensureSkillNode({ slug, label: skillName })

    const cacheKey = deps.contentCacheKey(slug, level, teachingMode)
    const { data: existing } = await deps.supabaseAdmin
      .from(MODULES).select("id, version").eq("content_cache_key", cacheKey).order("version", { ascending: false }).limit(1).maybeSingle()
    const nextVersion = (existing?.version || 0) + 1

    const { data: moduleRow, error: modErr } = await deps.supabaseAdmin
      .from(MODULES)
      .insert({ skill_graph_node_id: node.id, teaching_mode: teachingMode, level, content_cache_key: cacheKey, version: nextVersion })
      .select().single()
    if (modErr) throw modErr

    const rows = blocks.map((b) => ({ ...b, module_id: moduleRow.id, generated_by: "human_reviewed", source_citations: [] }))
    const { error: blockErr } = await deps.supabaseAdmin.from(BLOCKS).insert(rows)
    if (blockErr) throw blockErr
    publishedModuleId = moduleRow.id
  }

  const { data: updated, error: updateErr } = await deps.supabaseAdmin
    .from(JOBS)
    .update({ status: "approved", module_id: publishedModuleId || job.module_id, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", jobId).select().single()
  if (updateErr) throw updateErr

  await deps.supabaseAdmin.from(REVIEWS).insert({ generation_job_id: jobId, reviewer_id: reviewerId, decision: "approved", notes })

  return { job: updated, publishedModuleId }
}

export async function rejectJob(jobId, { reviewerId, notes }, deps = defaultDeps) {
  if (!notes) throw new Error("A rejection reason is required")
  const { data: updated, error } = await deps.supabaseAdmin
    .from(JOBS).update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", jobId).select().maybeSingle()
  if (error) throw error
  if (!updated) throw new Error("Job not found")
  await deps.supabaseAdmin.from(REVIEWS).insert({ generation_job_id: jobId, reviewer_id: reviewerId, decision: "rejected", notes })
  return updated
}

/** Human edit of the draft output — stays in pending_review so it can still
 *  be approved/rejected afterward, version bumped for audit history. */
export async function editJob(jobId, { reviewerId, editedOutput, notes = null }, deps = defaultDeps) {
  const { data: job, error: fetchErr } = await deps.supabaseAdmin.from(JOBS).select("*").eq("id", jobId).maybeSingle()
  if (fetchErr) throw fetchErr
  if (!job) throw new Error("Job not found")

  const { data: updated, error } = await deps.supabaseAdmin
    .from(JOBS)
    .update({ output_ref: editedOutput, version: job.version + 1, status: "pending_review", updated_at: new Date().toISOString() })
    .eq("id", jobId).select().single()
  if (error) throw error
  await deps.supabaseAdmin.from(REVIEWS).insert({ generation_job_id: jobId, reviewer_id: reviewerId, decision: "edited", edited_output: editedOutput, notes })
  return updated
}

/** Re-runs generation from the job's original input_ref, replacing the draft. */
export async function regenerateJob(jobId, { reviewerId, notes = null } = {}, deps = defaultDeps) {
  const { data: job, error: fetchErr } = await deps.supabaseAdmin.from(JOBS).select("*").eq("id", jobId).maybeSingle()
  if (fetchErr) throw fetchErr
  if (!job) throw new Error("Job not found")

  await deps.supabaseAdmin.from(REVIEWS).insert({ generation_job_id: jobId, reviewer_id: reviewerId, decision: "regenerate_requested", notes })
  await deps.supabaseAdmin.from(JOBS).update({ status: "running", version: job.version + 1, updated_at: new Date().toISOString() }).eq("id", jobId)

  try {
    const { skillName, jobTitle, level, teachingMode } = job.input_ref || {}
    const { lesson, generatedBy } = await deps.generateLesson({ topic: skillName, jobTitle, level })
    const outputRef = { skillName, level, teachingMode, generatedBy, lesson, blocks: deps.blocksFromLesson(lesson) }
    const qualityFlags = computeQualityFlags(lesson)
    const { data: updated, error } = await deps.supabaseAdmin
      .from(JOBS).update({ status: "pending_review", output_ref: outputRef, quality_flags: qualityFlags, updated_at: new Date().toISOString() })
      .eq("id", jobId).select().single()
    if (error) throw error
    return updated
  } catch (e) {
    await deps.supabaseAdmin.from(JOBS).update({ status: "failed", error: e.message, updated_at: new Date().toISOString() }).eq("id", jobId)
    throw e
  }
}
