/**
 * Question Bank Admin — Career OS Workstream 3 content-ops deliverable.
 *
 * INTERNAL ONLY. Every route here requires requireAuth + requireAdmin
 * (backend/server/lib/arena-v2/requireAdmin.js — the existing
 * `profiles.is_admin` gate built for Arena V2 content authoring; reused
 * here rather than inventing a second admin model). None of these routes
 * are linked from any ordinary-user-facing page or nav — there is no
 * frontend UI for this in this pass, only the API surface an internal
 * admin tool/script can call. This is the "server-enforced workflow"
 * requirement from Workstream 3 Part B, extended: not just "only approved
 * questions get served" but "only an admin, through these specific state
 * transitions, can ever make a question approved."
 *
 * Workflow: draft -> in_review -> approved | rejected  (approved can also
 * go -> retired later). Editing an approved question does NOT mutate it in
 * place — it creates a new draft row with parent_id pointing at the
 * approved one, and the approved one keeps serving until the new version
 * is itself approved and the old one is explicitly retired. This protects
 * any in-flight pulse that already selected the old version's id.
 *
 * 2026-07-24 ROUTING FIX: this router used to be mounted at bare "/api" in
 * server.js with its own internal paths carrying the "/admin/question-bank"
 * prefix. Because `router.use(requireAuth, requireAdmin)` below has no path
 * argument, Express treats it as match-all for every request Express hands
 * to this router — and since the router was mounted at bare "/api", Express
 * handed it EVERY request under /api, not just ones actually matching an
 * "/admin/question-bank..." route. Any unrelated route mounted after this
 * one in server.js (forge, aiInterview, recruiterComms, pulseNexus,
 * orbitPlans, hardwareChallenges, the mentor marketplace routes, etc.) got
 * its requests intercepted by this admin gate first, so a logged-in
 * non-admin user calling e.g. POST /api/jobs got wrongly 403'd. Fixed by
 * mounting this router at the dedicated "/api/admin/question-bank"
 * namespace in server.js and stripping that prefix from the routes below
 * (external URLs are unchanged) — Express now only ever hands this router
 * requests that already start with /api/admin/question-bank, so the
 * match-all requireAuth/requireAdmin middleware can no longer shadow
 * anything outside that namespace, regardless of mount order.
 *
 * GET    /api/admin/question-bank                — list/filter (review queue)
 * GET    /api/admin/question-bank/coverage        — coverage report
 * GET    /api/admin/question-bank/reports         — open user reports
 * POST   /api/admin/question-bank/reports/:id/resolve
 * GET    /api/admin/question-bank/:id             — single question + audit trail + versions
 * POST   /api/admin/question-bank                 — create a draft
 * PUT    /api/admin/question-bank/:id              — edit a draft (blocked once approved — see edit rule below)
 * POST   /api/admin/question-bank/:id/validate     — dry-run validation, no state change
 * POST   /api/admin/question-bank/:id/submit-for-review  — draft -> in_review
 * POST   /api/admin/question-bank/:id/approve      — in_review -> approved (validated first, server-enforced)
 * POST   /api/admin/question-bank/:id/reject       — in_review -> rejected (requires a reason)
 * POST   /api/admin/question-bank/:id/retire       — approved -> retired (requires a reason)
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { requireAdmin } from "../lib/arena-v2/requireAdmin.js"
import { validateQuestionForApproval, TOP_10_DOMAINS } from "../lib/skillPulseV2/questionBankGate.js"

const router = Router()
router.use(requireAuth, requireAdmin)

async function logAudit({ questionId, actorId, action, fromStatus, toStatus, note }) {
  await supabaseAdmin.from("question_bank_audit_log").insert({
    question_id: questionId, actor_id: actorId, action,
    from_status: fromStatus || null, to_status: toStatus || null, note: note || null,
  })
}

// ── List / review queue ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { review_status, domain, skill_tag, limit = 50, offset = 0 } = req.query
    let q = supabaseAdmin.from("question_bank").select("*", { count: "exact" })
    if (review_status) q = q.eq("review_status", review_status)
    if (domain) q = q.eq("domain", domain)
    if (skill_tag) q = q.contains("skill_tags", [skill_tag])
    q = q.order("created_at", { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1)
    const { data, error, count } = await q
    if (error) throw error
    res.json({ questions: data, total: count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Coverage report ───────────────────────────────────────────────────────
router.get("/coverage", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("question_bank").select("domain,skill_tags,difficulty,question_type,review_status")
    if (error) throw error

    const byDomainStatus = {}
    const byDomainDifficulty = {}
    const byDomainType = {}
    const bySkill = {}
    for (const row of data || []) {
      byDomainStatus[row.domain] = byDomainStatus[row.domain] || {}
      byDomainStatus[row.domain][row.review_status] = (byDomainStatus[row.domain][row.review_status] || 0) + 1

      byDomainDifficulty[row.domain] = byDomainDifficulty[row.domain] || {}
      byDomainDifficulty[row.domain][row.difficulty] = (byDomainDifficulty[row.domain][row.difficulty] || 0) + 1

      byDomainType[row.domain] = byDomainType[row.domain] || {}
      byDomainType[row.domain][row.question_type] = (byDomainType[row.domain][row.question_type] || 0) + 1

      for (const tag of row.skill_tags || []) {
        bySkill[tag] = bySkill[tag] || {}
        bySkill[tag][row.review_status] = (bySkill[tag][row.review_status] || 0) + 1
      }
    }

    const domainSummary = TOP_10_DOMAINS.map(domain => ({
      domain,
      approved: byDomainStatus[domain]?.approved || 0,
      draft: byDomainStatus[domain]?.draft || 0,
      in_review: byDomainStatus[domain]?.in_review || 0,
      rejected: byDomainStatus[domain]?.rejected || 0,
      retired: byDomainStatus[domain]?.retired || 0,
      meetsReleaseGate: (byDomainStatus[domain]?.approved || 0) >= 30,
    }))

    res.json({
      generated_at: new Date().toISOString(),
      domainSummary,
      byDomainDifficulty,
      byDomainType,
      bySkill,
      globalGateMet: domainSummary.every(d => d.meetsReleaseGate),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Reports (Part B reporting workflow) ──────────────────────────────────
router.get("/reports", async (req, res) => {
  try {
    const { status = "open" } = req.query
    const { data, error } = await supabaseAdmin
      .from("question_bank_reports").select("*, question_bank(prompt,domain)").eq("status", status)
      .order("created_at", { ascending: false })
    if (error) throw error
    res.json({ reports: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/reports/:id/resolve", async (req, res) => {
  try {
    const { status, note } = req.body // status: reviewed | dismissed | actioned
    if (!["reviewed", "dismissed", "actioned"].includes(status)) {
      return res.status(400).json({ error: "status must be reviewed, dismissed, or actioned" })
    }
    const { data: report, error } = await supabaseAdmin
      .from("question_bank_reports")
      .update({ status, resolved_at: new Date().toISOString(), resolved_by: req.user.id })
      .eq("id", req.params.id).select().single()
    if (error) throw error
    await logAudit({ questionId: report.question_id, actorId: req.user.id, action: "report_resolved", note })
    res.json({ success: true, report })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Single question + audit trail + version chain ────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { data: question, error } = await supabaseAdmin
      .from("question_bank").select("*").eq("id", req.params.id).single()
    if (error) throw error

    const [{ data: auditTrail }, { data: reports }] = await Promise.all([
      supabaseAdmin.from("question_bank_audit_log").select("*").eq("question_id", req.params.id).order("created_at", { ascending: false }),
      supabaseAdmin.from("question_bank_reports").select("*").eq("question_id", req.params.id).order("created_at", { ascending: false }),
    ])

    // Version chain: walk parent_id backward, and check for any child that supersedes this one.
    const versions = [question]
    let cursor = question
    while (cursor.parent_id) {
      const { data: parent } = await supabaseAdmin.from("question_bank").select("*").eq("id", cursor.parent_id).maybeSingle()
      if (!parent) break
      versions.push(parent)
      cursor = parent
    }
    const { data: children } = await supabaseAdmin.from("question_bank").select("*").eq("parent_id", question.id)

    res.json({ question, auditTrail: auditTrail || [], reports: reports || [], versions, supersededBy: children || [] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Create a draft ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const body = req.body
    const row = {
      domain: body.domain,
      skill_tags: body.skill_tags || [],
      difficulty: body.difficulty,
      question_type: body.question_type,
      prompt: body.prompt,
      media_url: body.media_url || null,
      options: body.options,
      correct_option_id: body.correct_option_id,
      explanation: body.explanation,
      source: body.source || "ai_generated",
      review_status: "draft", // never accept a client-supplied review_status here — drafts only
      created_by: req.user.id,
    }
    const { data, error } = await supabaseAdmin.from("question_bank").insert(row).select().single()
    if (error) throw error
    await logAudit({ questionId: data.id, actorId: req.user.id, action: "created", toStatus: "draft" })
    res.json({ success: true, question: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Edit a draft (blocked once approved/retired — must version instead) ──
router.put("/:id", async (req, res) => {
  try {
    const { data: existing, error: getErr } = await supabaseAdmin
      .from("question_bank").select("*").eq("id", req.params.id).single()
    if (getErr) throw getErr

    if (["approved", "retired"].includes(existing.review_status)) {
      // Create a new draft version instead of mutating live/retired content.
      const { data: version, error: vErr } = await supabaseAdmin.from("question_bank").insert({
        domain: req.body.domain ?? existing.domain,
        skill_tags: req.body.skill_tags ?? existing.skill_tags,
        difficulty: req.body.difficulty ?? existing.difficulty,
        question_type: req.body.question_type ?? existing.question_type,
        prompt: req.body.prompt ?? existing.prompt,
        media_url: req.body.media_url ?? existing.media_url,
        options: req.body.options ?? existing.options,
        correct_option_id: req.body.correct_option_id ?? existing.correct_option_id,
        explanation: req.body.explanation ?? existing.explanation,
        source: existing.source,
        review_status: "draft",
        version: (existing.version || 1) + 1,
        parent_id: existing.id,
        created_by: req.user.id,
      }).select().single()
      if (vErr) throw vErr
      await logAudit({ questionId: version.id, actorId: req.user.id, action: "versioned", note: `New version of ${existing.id}` })
      return res.json({ success: true, question: version, versioned: true, supersedes: existing.id })
    }

    const patch = { updated_at: new Date().toISOString() }
    for (const field of ["domain", "skill_tags", "difficulty", "question_type", "prompt", "media_url", "options", "correct_option_id", "explanation"]) {
      if (req.body[field] !== undefined) patch[field] = req.body[field]
    }
    const { data, error } = await supabaseAdmin.from("question_bank").update(patch).eq("id", req.params.id).select().single()
    if (error) throw error
    await logAudit({ questionId: data.id, actorId: req.user.id, action: "edited" })
    res.json({ success: true, question: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Validate (dry run — no state change) ─────────────────────────────────
router.post("/:id/validate", async (req, res) => {
  try {
    const { data: question, error } = await supabaseAdmin.from("question_bank").select("*").eq("id", req.params.id).single()
    if (error) throw error
    const result = validateQuestionForApproval(question)
    await logAudit({ questionId: question.id, actorId: req.user.id, action: "validated", note: result.valid ? "valid" : result.errors.join("; ") })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Bulk submit for review: draft -> in_review, many at once ─────────────
// Tranche B (2026-07-25): with content generated in batches (e.g. 30
// drafts/domain from a single content-ops run), moving each one to
// in_review individually via the API is the actual operational bottleneck
// — not the review judgment itself. This route only advances the workflow
// stage (draft -> in_review); it does NOT approve anything and does not
// touch review_status='approved' under any circumstance, so it cannot be
// used to fake coverage or bypass the human review step required by
// POST /:id/approve (which still re-validates every question server-side,
// one at a time, before it can ever become 'approved').
router.post("/bulk-submit-for-review", async (req, res) => {
  try {
    const { ids, domain } = req.body
    if (!Array.isArray(ids) && !domain) {
      return res.status(400).json({ error: "Provide either ids: [...] or domain: '...'" })
    }

    let q = supabaseAdmin.from("question_bank").select("id,review_status").eq("review_status", "draft")
    if (Array.isArray(ids) && ids.length) q = q.in("id", ids)
    if (domain) q = q.eq("domain", domain)
    const { data: candidates, error: selErr } = await q
    if (selErr) throw selErr

    if (!candidates?.length) return res.json({ success: true, submitted: 0, skipped: 0, results: [] })

    const results = []
    for (const row of candidates) {
      const { error: updErr } = await supabaseAdmin
        .from("question_bank")
        .update({ review_status: "in_review", updated_at: new Date().toISOString() })
        .eq("id", row.id).eq("review_status", "draft") // re-check status at write time (race safety)
      if (updErr) { results.push({ id: row.id, ok: false, error: updErr.message }); continue }
      await logAudit({ questionId: row.id, actorId: req.user.id, action: "edited", fromStatus: "draft", toStatus: "in_review", note: "bulk-submit-for-review" })
      results.push({ id: row.id, ok: true })
    }
    const submitted = results.filter(r => r.ok).length
    res.json({ success: true, submitted, skipped: results.length - submitted, results })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Submit for review: draft -> in_review ────────────────────────────────
router.post("/:id/submit-for-review", async (req, res) => {
  try {
    const { data: existing, error: getErr } = await supabaseAdmin.from("question_bank").select("*").eq("id", req.params.id).single()
    if (getErr) throw getErr
    if (existing.review_status !== "draft") return res.status(400).json({ error: `Cannot submit a question in status '${existing.review_status}' for review` })
    const { data, error } = await supabaseAdmin.from("question_bank")
      .update({ review_status: "in_review", updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single()
    if (error) throw error
    await logAudit({ questionId: data.id, actorId: req.user.id, action: "edited", fromStatus: "draft", toStatus: "in_review" })
    res.json({ success: true, question: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Approve: in_review -> approved (server-enforced validation gate) ────
router.post("/:id/approve", async (req, res) => {
  try {
    const { data: existing, error: getErr } = await supabaseAdmin.from("question_bank").select("*").eq("id", req.params.id).single()
    if (getErr) throw getErr
    if (existing.review_status !== "in_review") {
      return res.status(400).json({ error: `Only an 'in_review' question can be approved (current: '${existing.review_status}')` })
    }

    // Hard server-side gate — a client cannot bypass this by calling
    // approve directly on a malformed question. This is what makes the
    // workflow "server-enforced" rather than a UI-only convention.
    const validation = validateQuestionForApproval(existing)
    if (!validation.valid) {
      return res.status(422).json({ error: "Question fails validation and cannot be approved", validation })
    }

    const { data, error } = await supabaseAdmin.from("question_bank").update({
      review_status: "approved", reviewer_id: req.user.id, reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", req.params.id).select().single()
    if (error) throw error
    await logAudit({ questionId: data.id, actorId: req.user.id, action: "approved", fromStatus: "in_review", toStatus: "approved" })
    res.json({ success: true, question: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Reject: in_review -> rejected (reason required) ──────────────────────
router.post("/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason?.trim()) return res.status(400).json({ error: "reason is required to reject a question" })
    const { data: existing, error: getErr } = await supabaseAdmin.from("question_bank").select("review_status").eq("id", req.params.id).single()
    if (getErr) throw getErr
    if (existing.review_status !== "in_review") {
      return res.status(400).json({ error: `Only an 'in_review' question can be rejected (current: '${existing.review_status}')` })
    }
    const { data, error } = await supabaseAdmin.from("question_bank").update({
      review_status: "rejected", rejection_reason: reason, reviewer_id: req.user.id, reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", req.params.id).select().single()
    if (error) throw error
    await logAudit({ questionId: data.id, actorId: req.user.id, action: "rejected", fromStatus: "in_review", toStatus: "rejected", note: reason })
    res.json({ success: true, question: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Retire: approved -> retired (reason required) ────────────────────────
router.post("/:id/retire", async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason?.trim()) return res.status(400).json({ error: "reason is required to retire a question" })
    const { data: existing, error: getErr } = await supabaseAdmin.from("question_bank").select("review_status").eq("id", req.params.id).single()
    if (getErr) throw getErr
    if (existing.review_status !== "approved") {
      return res.status(400).json({ error: `Only an 'approved' question can be retired (current: '${existing.review_status}')` })
    }
    const { data, error } = await supabaseAdmin.from("question_bank").update({
      review_status: "retired", retired_at: new Date().toISOString(), retirement_reason: reason, updated_at: new Date().toISOString(),
    }).eq("id", req.params.id).select().single()
    if (error) throw error
    await logAudit({ questionId: data.id, actorId: req.user.id, action: "retired", fromStatus: "approved", toStatus: "retired", note: reason })
    res.json({ success: true, question: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
