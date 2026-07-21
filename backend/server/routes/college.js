/**
 * routes/college.js — College Path: institution-admin operational API
 * ---------------------------------------------------------------------------
 * This is the backend surface the 5 previously-NOT_IMPLEMENTED
 * mcp/src/tools/college.ts tools now call into (per the MCP architecture
 * rule: MCP tools never touch Supabase directly, everything goes through
 * this REST layer — see mcp/src/shared/client.ts).
 *
 *   GET  /api/college/institutions/:id                       — institution summary + verification state
 *   POST /api/college/institutions/:id/roster/import          — bulk CSV roster import (chunked, idempotent)
 *   GET  /api/college/institutions/:id/students                — paginated roster           (college.getStudentRoster)
 *   GET  /api/college/institutions/:id/leaderboard              — department ELO leaderboard  (college.getDepartmentLeaderboard)
 *   GET  /api/college/institutions/:id/stats                     — institution-wide aggregate stats (college.getCollegeStats)
 *   GET  /api/college/institutions/:id/branches                   — per-department breakdown    (college.getBranchBreakdown)
 *   GET  /api/college/institutions/:id/export                      — CSV export, PII-excluded    (college.exportReport)
 *   POST /api/college/institutions/:id/placements/:placementId/confirm — TPO placement confirmation
 *
 * SECURITY (defense in depth — RLS in the migration is the source of truth,
 * this is the second, independent layer, per the project's "never rely on a
 * single check" instruction):
 *   - requireAuth verifies the JWT.
 *   - requireInstitutionStaff / requireInstitutionAdmin re-check role
 *     membership against institution_staff using the SERVICE ROLE client,
 *     because supabaseAdmin bypasses RLS — the app-layer check here is not
 *     redundant, it's the only check that applies when using the service key.
 *   - Aggregate/roster/leaderboard/export endpoints NEVER select email,
 *     phone, or DOB — enforced by an explicit column allowlist, not a
 *     blocklist, so a future column addition can't accidentally leak PII.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { recordEloEvent } from "../lib/eloLedger.js"

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The MCP tool contract (mcp/src/tools/college.ts) identifies a college by a
// human-readable `collegeCode` (e.g. "VITU"), matching institutions.slug —
// not the internal UUID. Every :id route param below is resolved through
// this middleware so callers can pass either the UUID or the slug.
router.param("id", async (req, res, next, value) => {
  if (UUID_RE.test(value)) {
    req.params.id = value
    return next()
  }
  const { data, error } = await supabaseAdmin
    .from("institutions")
    .select("id")
    .ilike("slug", value)
    .maybeSingle()
  if (error || !data) return res.status(404).json({ error: `No institution found for code '${value}'` })
  req.params.id = data.id
  next()
})

// ── Role gate helpers ─────────────────────────────────────────────────────────

async function getStaffRole(institutionId, userId) {
  // Original single admin_user_id still counts as college_admin (back-compat
  // with the pre-institution_staff era).
  const { data: inst } = await supabaseAdmin
    .from("institutions")
    .select("admin_user_id")
    .eq("id", institutionId)
    .single()
  if (inst && inst.admin_user_id === userId) return "college_admin"

  const { data: staff } = await supabaseAdmin
    .from("institution_staff")
    .select("role")
    .eq("institution_id", institutionId)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("role", { ascending: true }) // deterministic; not a priority sort, just stable
  if (!staff || staff.length === 0) return null
  // Prefer the highest-privilege role if the staff member has multiple rows.
  const priority = ["college_admin", "placement_officer", "dept_head", "professor", "mentor"]
  return priority.find((r) => staff.some((s) => s.role === r)) || staff[0].role
}

function requireInstitutionStaff() {
  return async (req, res, next) => {
    try {
      const institutionId = req.params.id || req.params.institutionId
      const role = await getStaffRole(institutionId, req.user.id)
      if (!role) return res.status(403).json({ error: "Not a staff member of this institution" })
      req.institutionRole = role
      next()
    } catch (err) {
      console.error("[college] requireInstitutionStaff", err)
      res.status(500).json({ error: "Internal error checking institution access" })
    }
  }
}

function requireInstitutionAdmin() {
  return async (req, res, next) => {
    try {
      const institutionId = req.params.id || req.params.institutionId
      const role = await getStaffRole(institutionId, req.user.id)
      if (!role || !["college_admin", "placement_officer"].includes(role)) {
        return res.status(403).json({ error: "Requires college_admin or placement_officer role" })
      }
      req.institutionRole = role
      next()
    } catch (err) {
      console.error("[college] requireInstitutionAdmin", err)
      res.status(500).json({ error: "Internal error checking institution access" })
    }
  }
}

// ── Dependency-free CSV parser (small file sizes only — roster CSVs, not GB data) ──
function parseCsv(text) {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const splitLine = (line) => {
    const out = []
    let cur = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = !inQuotes }
      } else if (ch === "," && !inQuotes) {
        out.push(cur); cur = ""
      } else {
        cur += ch
      }
    }
    out.push(cur)
    return out.map((v) => v.trim())
  }
  const headers = splitLine(lines[0]).map((h) => h.toLowerCase())
  const rows = lines.slice(1).map((line) => {
    const values = splitLine(line)
    const row = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? "" })
    return row
  })
  return { headers, rows }
}

// ── GET /institutions/:id ──────────────────────────────────────────────────────
router.get("/institutions/:id", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id } = req.params
  const { data: institution, error } = await supabaseAdmin
    .from("institutions")
    .select("id, name, slug, type, email_domain, website, verification_level, status, plan, created_at")
    .eq("id", id)
    .single()
  if (error || !institution) return res.status(404).json({ error: "Institution not found" })

  const { data: verification } = await supabaseAdmin
    .from("institution_verification")
    .select("*")
    .eq("institution_id", id)
    .maybeSingle()

  res.status(200).json({ institution, verification: verification || null, role: req.institutionRole })
})

// ── POST /institutions/:id/roster/import ───────────────────────────────────────
// Chunked + idempotent: upserts on (institution_id, student roll_number is not
// a unique DB key by itself, so we key the upsert on institution_id + the
// student's linked auth user — created lazily if the email doesn't yet have
// an account). This endpoint intentionally never creates a *second*
// auth.users row for an email that already has one (duplicate-profile
// guardrail from the system design — §9.4).
router.post("/institutions/:id/roster/import", requireAuth, requireInstitutionAdmin(), async (req, res) => {
  const { id: institutionId } = req.params
  const { csv, enforceDomainMatch = false } = req.body || {}
  if (!csv || typeof csv !== "string") {
    return res.status(400).json({ error: "Body must include { csv: string }" })
  }

  const { headers, rows } = parseCsv(csv)
  const required = ["email", "name", "department", "batch"]
  const missing = required.filter((h) => !headers.includes(h))
  if (missing.length > 0) {
    return res.status(400).json({ error: `CSV missing required column(s): ${missing.join(", ")}` })
  }
  if (rows.length > 5000) {
    return res.status(400).json({ error: "Roster import capped at 5000 rows per request — split the file" })
  }

  const { data: institution } = await supabaseAdmin
    .from("institutions")
    .select("email_domain")
    .eq("id", institutionId)
    .single()

  const results = { imported: 0, skipped: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const email = (row.email || "").toLowerCase().trim()
    const rollNumber = row.roll_number || row.roll || ""
    if (!email || !email.includes("@")) {
      results.errors.push({ row: i + 2, reason: "Missing/invalid email" })
      continue
    }
    if (enforceDomainMatch && institution?.email_domain && !email.endsWith(`@${institution.email_domain}`)) {
      results.errors.push({ row: i + 2, reason: `Email domain does not match ${institution.email_domain}` })
      continue
    }

    // Look up an existing auth user by email — never create a duplicate.
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1, email })
    let userId = existingUsers?.users?.[0]?.id

    if (!userId) {
      // Invite-only: create the auth user in an unconfirmed state; they set
      // their password via the invite email. This does not silently log
      // anyone in and does not fabricate a password.
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { source: "college_roster_import", institution_id: institutionId },
      })
      if (createErr) {
        results.errors.push({ row: i + 2, reason: `Could not create account: ${createErr.message}` })
        continue
      }
      userId = created.user.id
    }

    const { error: upsertErr } = await supabaseAdmin
      .from("institution_students")
      .upsert(
        {
          institution_id: institutionId,
          student_user_id: userId,
          link_method: "invite_code",
          status: "pending_admin",
          department: row.department,
          batch: row.batch,
          roll_number: rollNumber || null,
        },
        { onConflict: "institution_id,student_user_id" }
      )

    if (upsertErr) {
      results.errors.push({ row: i + 2, reason: upsertErr.message })
      continue
    }
    results.imported += 1
  }

  await supabaseAdmin.from("activity_logs").insert({
    institution_id: institutionId,
    actor_id: req.user.id,
    action_code: "roster.import",
    entity_type: "institution",
    entity_id: institutionId,
    details: { rows: rows.length, imported: results.imported, errors: results.errors.length },
  })

  res.status(200).json(results)
})

// ── GET /institutions/:id/students — college.getStudentRoster ─────────────────
router.get("/institutions/:id/students", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 50))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabaseAdmin
    .from("institution_students")
    // Explicit allowlist — no email/phone/DOB. This is the PII boundary.
    .select("id, department, batch, roll_number, status, elo_current, job_readiness_score, linked_at", {
      count: "exact",
    })
    .eq("institution_id", institutionId)

  if (req.query.department) query = query.eq("department", req.query.department)
  if (req.query.batch) query = query.eq("batch", req.query.batch)
  if (req.query.status) query = query.eq("status", req.query.status)
  // Roll-number search only — name search would require a join against
  // profiles (which holds PII) and is intentionally not implemented here.
  if (req.query.search) query = query.ilike("roll_number", `%${req.query.search}%`)
  // Faculty scoped to their own department can't page through other departments.
  if (req.institutionRole === "professor" || req.institutionRole === "mentor") {
    const { data: staffRow } = await supabaseAdmin
      .from("institution_staff")
      .select("department, scope")
      .eq("institution_id", institutionId)
      .eq("user_id", req.user.id)
      .eq("status", "active")
      .maybeSingle()
    if (staffRow?.scope === "own_department" && staffRow.department) {
      query = query.eq("department", staffRow.department)
    }
  }

  const { data, error, count } = await query
    .order("elo_current", { ascending: false })
    .range(from, to)

  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ students: data, page, pageSize, total: count })
})

// ── GET /institutions/:id/leaderboard — college.getDepartmentLeaderboard ─────
router.get("/institutions/:id/leaderboard", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params
  const branch = req.query.branch
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 50))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabaseAdmin
    .from("institution_students")
    .select("id, department, batch, elo_current, job_readiness_score, status", { count: "exact" })
    .eq("institution_id", institutionId)

  if (branch) query = query.eq("department", branch)

  const { data, error, count } = await query
    .order("elo_current", { ascending: false })
    .range(from, to)

  if (error) return res.status(500).json({ error: error.message })

  const leaderboard = data.map((row, idx) => ({
    rank: from + idx + 1,
    studentId: row.id,
    department: row.department,
    batch: row.batch,
    elo: row.elo_current,
    jobReadiness: row.job_readiness_score,
    status: row.status,
  }))

  res.status(200).json({ leaderboard, page, pageSize, total: count })
})

// ── GET /institutions/:id/stats — college.getCollegeStats ─────────────────────
router.get("/institutions/:id/stats", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params

  const { data: students, error } = await supabaseAdmin
    .from("institution_students")
    .select("elo_current, job_readiness_score, status, department")
    .eq("institution_id", institutionId)

  if (error) return res.status(500).json({ error: error.message })

  const total = students.length
  const avgElo = total ? students.reduce((s, r) => s + (Number(r.elo_current) || 0), 0) / total : 0
  const avgJobReadiness = total
    ? students.reduce((s, r) => s + (Number(r.job_readiness_score) || 0), 0) / total
    : 0
  const statusCounts = students.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  const { count: confirmedPlacements } = await supabaseAdmin
    .from("institution_placements")
    .select("id", { count: "exact", head: true })
    .eq("institution_id", institutionId)
    .eq("confirmation_status", "tpo_confirmed")

  res.status(200).json({
    totalStudents: total,
    avgElo: Math.round(avgElo),
    avgJobReadiness: Math.round(avgJobReadiness * 10) / 10,
    statusCounts,
    confirmedPlacements: confirmedPlacements || 0,
    placementRate: total ? Math.round(((confirmedPlacements || 0) / total) * 1000) / 10 : 0,
  })
})

// ── GET /institutions/:id/branches — college.getBranchBreakdown ──────────────
router.get("/institutions/:id/branches", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params

  const { data: students, error } = await supabaseAdmin
    .from("institution_students")
    .select("department, elo_current, job_readiness_score, status")
    .eq("institution_id", institutionId)

  if (error) return res.status(500).json({ error: error.message })

  const byDept = {}
  for (const s of students) {
    const key = s.department || "Unassigned"
    if (!byDept[key]) byDept[key] = { department: key, count: 0, eloSum: 0, jobReadySum: 0, placed: 0 }
    byDept[key].count += 1
    byDept[key].eloSum += Number(s.elo_current) || 0
    byDept[key].jobReadySum += Number(s.job_readiness_score) || 0
    if (s.status === "placed" || s.status === "transitioning" || s.status === "professional_active") {
      byDept[key].placed += 1
    }
  }

  const branches = Object.values(byDept).map((d) => ({
    department: d.department,
    students: d.count,
    avgElo: d.count ? Math.round(d.eloSum / d.count) : 0,
    avgJobReadiness: d.count ? Math.round((d.jobReadySum / d.count) * 10) / 10 : 0,
    placedPct: d.count ? Math.round((d.placed / d.count) * 1000) / 10 : 0,
  }))

  res.status(200).json({ branches })
})

// ── GET /institutions/:id/export — college.exportReport ───────────────────────
router.get("/institutions/:id/export", requireAuth, requireInstitutionAdmin(), async (req, res) => {
  const { id: institutionId } = req.params
  const format = req.query.format === "csv" ? "csv" : "json"

  const { data: students, error } = await supabaseAdmin
    .from("institution_students")
    .select("id, department, batch, roll_number, status, elo_current, job_readiness_score")
    .eq("institution_id", institutionId)
    .order("department", { ascending: true })

  if (error) return res.status(500).json({ error: error.message })

  await supabaseAdmin.from("activity_logs").insert({
    institution_id: institutionId,
    actor_id: req.user.id,
    action_code: "report.exported",
    entity_type: "institution",
    entity_id: institutionId,
    details: { format, rowCount: students.length },
  })

  if (format === "csv") {
    const header = "roll_number,department,batch,status,elo,job_readiness\n"
    const body = students
      .map((s) => [s.roll_number || "", s.department || "", s.batch || "", s.status, s.elo_current, s.job_readiness_score].join(","))
      .join("\n")
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename="institution-${institutionId}-report.csv"`)
    return res.status(200).send(header + body)
  }

  res.status(200).json({ students })
})

// ── POST /institutions/:id/placements/:placementId/confirm ────────────────────
// TPO/college_admin-only. This is the gate described in the design doc §9.8 —
// a placement is not "real" for reporting purposes until this fires.
router.post(
  "/institutions/:id/placements/:placementId/confirm",
  requireAuth,
  requireInstitutionAdmin(),
  async (req, res) => {
    const { id: institutionId, placementId } = req.params

    const { data: placement, error: fetchErr } = await supabaseAdmin
      .from("institution_placements")
      .select("id, student_id, institution_id, confirmation_status")
      .eq("id", placementId)
      .eq("institution_id", institutionId)
      .single()

    if (fetchErr || !placement) return res.status(404).json({ error: "Placement not found" })
    if (placement.confirmation_status === "tpo_confirmed") {
      return res.status(200).json({ placement, message: "Already confirmed" })
    }

    const { data: student } = await supabaseAdmin
      .from("institution_students")
      .select("elo_current")
      .eq("id", placement.student_id)
      .single()

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("institution_placements")
      .update({
        confirmation_status: "tpo_confirmed",
        confirmed_by: req.user.id,
        confirmed_at: new Date().toISOString(),
        elo_at_placement: student?.elo_current ?? null,
      })
      .eq("id", placementId)
      .select()
      .single()

    if (updateErr) return res.status(500).json({ error: updateErr.message })

    await supabaseAdmin
      .from("institution_students")
      .update({ status: "placed" })
      .eq("id", placement.student_id)

    await supabaseAdmin.from("activity_logs").insert({
      institution_id: institutionId,
      actor_id: req.user.id,
      action_code: "placement.confirmed",
      entity_type: "institution_placements",
      entity_id: placementId,
      severity: "warning", // placement confirmations are reporting-sensitive — surfaced in audit review
      details: { studentId: placement.student_id },
    })

    res.status(200).json({ placement: updated })
  }
)

// ── POST /institutions/:id/students/:studentId/elo-adjustment ────────────────
// The ONLY route allowed to move ELO outside an automated grader — requires
// two-person review (a reviewerId distinct from the actor is enforced by the
// elo_events_manual_adjustment_needs_reviewer DB constraint AND re-checked
// here so the error is a clean 400, not a raw Postgres constraint violation).
router.post(
  "/institutions/:id/students/:studentId/elo-adjustment",
  requireAuth,
  requireInstitutionAdmin(),
  async (req, res) => {
    const { studentId } = req.params
    const { delta, reason, reviewerId } = req.body || {}

    if (typeof delta !== "number" || !Number.isFinite(delta)) {
      return res.status(400).json({ error: "delta must be a finite number" })
    }
    if (!reviewerId || reviewerId === req.user.id) {
      return res.status(400).json({ error: "reviewerId is required and must differ from the requesting admin (two-person review)" })
    }
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ error: "reason is required (min 5 characters) — this is an audited action" })
    }

    try {
      const event = await recordEloEvent({
        studentId,
        source: "manual_admin_adjustment",
        delta,
        reviewerId,
      })
      await supabaseAdmin.from("activity_logs").insert({
        institution_id: req.params.id,
        actor_id: req.user.id,
        action_code: "elo.manual_adjustment",
        entity_type: "institution_students",
        entity_id: studentId,
        severity: "critical",
        details: { delta, reason, reviewerId, eventId: event.id },
      })
      res.status(200).json({ event })
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  }
)

export default router
