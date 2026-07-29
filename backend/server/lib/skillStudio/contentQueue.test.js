import { test } from "node:test"
import assert from "node:assert/strict"
import {
  requestModuleGeneration, listJobs, getJob, approveJob, rejectJob, editJob, regenerateJob,
} from "./contentQueue.js"

/**
 * Generic fake Supabase client: each table has a FIFO queue of canned
 * { data, error } responses. Every terminal call (.single()/.maybeSingle()/
 * awaiting the chain directly via .then) pops the next queued response for
 * that table — mirrors the same style of fake used in arenaIngestion.test.js,
 * generalized because contentQueue.js's call shapes vary more (insert vs
 * update vs select-only, with or without a terminal .single()).
 */
function fakeSupabase(responses = {}) {
  const calls = []
  const queues = {}
  for (const [t, arr] of Object.entries(responses)) queues[t] = [...arr]
  function nextFor(table) {
    const q = queues[table]
    if (!q || q.length === 0) return { data: null, error: null }
    return q.shift()
  }
  const chain = (table) => {
    const self = {
      insert: (row) => { calls.push(["insert", table, row]); return self },
      update: (patch) => { calls.push(["update", table, patch]); return self },
      select: (...a) => { calls.push(["select", table, a]); return self },
      eq: (...a) => { calls.push(["eq", table, a]); return self },
      order: (...a) => { calls.push(["order", table, a]); return self },
      range: (...a) => { calls.push(["range", table, a]); return self },
      limit: (...a) => { calls.push(["limit", table, a]); return self },
      single: async () => nextFor(table),
      maybeSingle: async () => nextFor(table),
      then: (resolve) => resolve(nextFor(table)),
    }
    return self
  }
  return { supabaseAdmin: { from: chain }, calls }
}

function baseLesson(overrides = {}) {
  return {
    title: "React Hooks", objective: "Understand hooks", sections: [{ heading: "useState", content: "...", codeExample: "useState(0)" }],
    keyPoints: ["hooks are functions"], quiz: [], practiceTask: "build a counter", nextTopics: ["useEffect"], ...overrides,
  }
}
function baseBlocks() {
  return [{ block_type: "overview", ordinal: 0, content: {} }, { block_type: "ai_explanation", ordinal: 1, content: {} }]
}

function baseDeps(overrides = {}) {
  const { supabaseAdmin, calls } = fakeSupabase(overrides.sb || {})
  return {
    supabaseAdmin,
    slugify: overrides.slugify || ((s) => s.toLowerCase().replace(/\s+/g, "-")),
    ensureSkillNode: overrides.ensureSkillNode || (async ({ slug, label }) => { calls.push(["ensureSkillNode", slug]); return { id: "node-1", slug, label } }),
    getNodeBySlug: overrides.getNodeBySlug || (async () => null),
    generateLesson: overrides.generateLesson || (async () => ({ lesson: baseLesson(), generatedBy: "gemini" })),
    blocksFromLesson: overrides.blocksFromLesson || (() => baseBlocks()),
    contentCacheKey: overrides.contentCacheKey || (() => "cachekey123"),
    _calls: calls,
  }
}

test("requestModuleGeneration: happy path moves a job from running to pending_review with quality flags computed", async () => {
  const deps = baseDeps({
    sb: {
      generation_jobs: [
        { data: { id: "job-1", status: "running" }, error: null }, // initial insert
        { data: { id: "job-1", status: "pending_review", quality_flags: [] }, error: null }, // update after generation
      ],
    },
  })
  const job = await requestModuleGeneration({ requestedBy: "admin-1", skillName: "React Hooks", jobTitle: "Frontend Engineer" }, deps)
  assert.equal(job.status, "pending_review")
})

test("requestModuleGeneration: a generation failure marks the job failed and rethrows with code=generation_failed + jobId", async () => {
  const deps = baseDeps({
    generateLesson: async () => { throw new Error("gemini and groq both down") },
    sb: { generation_jobs: [{ data: { id: "job-2", status: "running" }, error: null }] },
  })
  await assert.rejects(
    () => requestModuleGeneration({ requestedBy: "admin-1", skillName: "React Hooks" }, deps),
    (err) => {
      assert.match(err.message, /gemini and groq both down/)
      assert.equal(err.code, "generation_failed")
      assert.equal(err.jobId, "job-2")
      return true
    },
  )
  const failedUpdate = deps._calls.find((c) => c[0] === "update" && c[1] === "generation_jobs")
  assert.ok(failedUpdate, "expected the job to be marked failed")
  assert.equal(failedUpdate[2].status, "failed")
})

test("listJobs: applies status/jobType filters and returns the raw rows", async () => {
  const deps = baseDeps({ sb: { generation_jobs: [{ data: [{ id: "job-1" }, { id: "job-2" }], error: null }] } })
  const jobs = await listJobs({ status: "pending_review", jobType: "module" }, deps)
  assert.equal(jobs.length, 2)
  assert.ok(deps._calls.some((c) => c[0] === "eq" && c[2][0] === "status" && c[2][1] === "pending_review"))
  assert.ok(deps._calls.some((c) => c[0] === "eq" && c[2][0] === "job_type" && c[2][1] === "module"))
})

test("getJob: returns null for a missing job instead of throwing", async () => {
  const deps = baseDeps({ sb: { generation_jobs: [{ data: null, error: null }] } })
  const job = await getJob("missing-id", deps)
  assert.equal(job, null)
})

test("getJob: attaches the review history to the job", async () => {
  const deps = baseDeps({
    sb: {
      generation_jobs: [{ data: { id: "job-1", status: "pending_review" }, error: null }],
      generation_job_reviews: [{ data: [{ id: "rev-1", decision: "edited" }], error: null }],
    },
  })
  const job = await getJob("job-1", deps)
  assert.equal(job.reviews.length, 1)
  assert.equal(job.reviews[0].decision, "edited")
})

test("approveJob: refuses to approve a job that is not pending_review (invalid_transition)", async () => {
  const deps = baseDeps({ sb: { generation_jobs: [{ data: { id: "job-1", status: "approved" }, error: null }] } })
  await assert.rejects(
    () => approveJob("job-1", { reviewerId: "admin-1" }, deps),
    (err) => { assert.equal(err.code, "invalid_transition"); return true },
  )
})

test("approveJob: publishes to modules/module_content_blocks (versioned) and records an 'approved' review", async () => {
  const deps = baseDeps({
    sb: {
      generation_jobs: [
        { data: { id: "job-1", status: "pending_review", job_type: "module", module_id: null, output_ref: { skillName: "React Hooks", level: "intermediate", teachingMode: "code", blocks: baseBlocks() } }, error: null }, // getJob
        { data: { id: "job-1", status: "approved" }, error: null }, // final update
      ],
      modules: [
        { data: null, error: null }, // no existing module -> version 1
        { data: { id: "mod-1" }, error: null }, // insert module
      ],
      module_content_blocks: [{ data: null, error: null }],
      generation_job_reviews: [{ data: [], error: null }, { data: null, error: null }], // [0] getJob's review-history fetch, [1] the final 'approved' review insert
    },
  })
  const result = await approveJob("job-1", { reviewerId: "admin-1", notes: "looks good" }, deps)
  assert.equal(result.publishedModuleId, "mod-1")
  assert.equal(result.job.status, "approved")
  const reviewInsert = deps._calls.find((c) => c[0] === "insert" && c[1] === "generation_job_reviews")
  assert.equal(reviewInsert[2].decision, "approved")
  const blockInsert = deps._calls.find((c) => c[0] === "insert" && c[1] === "module_content_blocks")
  assert.ok(blockInsert[2].every((b) => b.generated_by === "human_reviewed"), "published blocks must be tagged human_reviewed, not gemini/groq")
})

test("rejectJob: requires a rejection reason and never touches the DB without one", async () => {
  const deps = baseDeps()
  await assert.rejects(() => rejectJob("job-1", { reviewerId: "admin-1", notes: "" }, deps), /rejection reason is required/)
  assert.equal(deps._calls.length, 0, "must fail fast before any DB call")
})

test("rejectJob: marks the job rejected and records the reviewer's notes", async () => {
  const deps = baseDeps({ sb: { generation_jobs: [{ data: { id: "job-1", status: "rejected" }, error: null }] } })
  const job = await rejectJob("job-1", { reviewerId: "admin-1", notes: "hallucinated API" }, deps)
  assert.equal(job.status, "rejected")
  const review = deps._calls.find((c) => c[0] === "insert" && c[1] === "generation_job_reviews")
  assert.equal(review[2].notes, "hallucinated API")
  assert.equal(review[2].decision, "rejected")
})

test("editJob: bumps the version and keeps status pending_review so it can still be approved", async () => {
  const deps = baseDeps({
    sb: {
      generation_jobs: [
        { data: { id: "job-1", version: 1 }, error: null }, // fetch
        { data: { id: "job-1", version: 2, status: "pending_review" }, error: null }, // update
      ],
    },
  })
  const job = await editJob("job-1", { reviewerId: "admin-1", editedOutput: { lesson: baseLesson() }, notes: "fixed typo" }, deps)
  assert.equal(job.version, 2)
  assert.equal(job.status, "pending_review")
  const update = deps._calls.find((c) => c[0] === "update" && c[1] === "generation_jobs")
  assert.equal(update[2].version, 2)
})

test("regenerateJob: re-runs generation and lands back in pending_review with a fresh version", async () => {
  const deps = baseDeps({
    sb: {
      generation_jobs: [
        { data: { id: "job-1", version: 1, input_ref: { skillName: "React Hooks", level: "intermediate" } }, error: null }, // fetch
        { data: null, error: null }, // 'running' version-bump update (no select — return value unused)
        { data: { id: "job-1", version: 2, status: "pending_review" }, error: null }, // final update
      ],
      generation_job_reviews: [{ data: null, error: null }],
    },
  })
  const job = await regenerateJob("job-1", { reviewerId: "admin-1", notes: "try again" }, deps)
  assert.equal(job.status, "pending_review")
  const regenReview = deps._calls.find((c) => c[0] === "insert" && c[1] === "generation_job_reviews")
  assert.equal(regenReview[2].decision, "regenerate_requested")
})

test("regenerateJob: a second generation failure marks the job failed and rethrows", async () => {
  const deps = baseDeps({
    generateLesson: async () => { throw new Error("still down") },
    sb: {
      generation_jobs: [{ data: { id: "job-1", version: 1, input_ref: { skillName: "React Hooks" } }, error: null }],
      generation_job_reviews: [{ data: null, error: null }],
    },
  })
  await assert.rejects(() => regenerateJob("job-1", { reviewerId: "admin-1" }, deps), /still down/)
  const failedUpdate = deps._calls.filter((c) => c[0] === "update" && c[1] === "generation_jobs").pop()
  assert.equal(failedUpdate[2].status, "failed")
})
