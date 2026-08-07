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
import { canonicalElo, resolveCareerBySlug, resolveCareerName, performanceTier } from "../lib/orgStudentVisibility.js"

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function slugifyInstitutionName(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "institution"
}

// Lazily creates the missing `institutions` row for a legacy
// profiles.org_type='college' admin the first time they resolve
// GET /institutions/mine — see the call site for the full rationale.
// Read-only against `profiles` (never writes back to it); only ever
// inserts into `institutions`, and only when no institutions/institution_staff
// row already exists for this user (call site guarantees that ordering).
async function bootstrapInstitutionFromProfile(userId) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("org_type, org_name, org_inst_type, org_website, org_location")
    .eq("id", userId)
    .maybeSingle()

  if (!profile || profile.org_type !== "college" || !profile.org_name?.trim()) return null

  const type = /university/i.test(profile.org_inst_type || "") ? "university" : "college"
  const baseSlug = slugifyInstitutionName(profile.org_name)

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
    const { data: inserted, error } = await supabaseAdmin
      .from("institutions")
      .insert({
        name: profile.org_name.trim(),
        slug,
        type,
        admin_user_id: userId,
        website: profile.org_website || null,
        address: profile.org_location ? { raw: profile.org_location } : {},
      })
      .select("id, name, slug, type, email_domain, website, verification_level, status, plan, created_at")
      .single()
    if (!error) return inserted
    if (error.code !== "23505") { // unique_violation on slug — retry with a suffix; anything else, give up
      console.error("[college] bootstrapInstitutionFromProfile", error)
      return null
    }
  }
  return null
}

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

// Added 2026-08-03 (Jobs tab). Stricter than requireInstitutionAdmin() —
// that one also passes placement_officer, but per explicit product decision
// job posting is college_admin only (placement officers can still see jobs
// via the GET route below, gated by requireInstitutionStaff, just not
// create/edit them).
function requireCollegeAdminOnly() {
  return async (req, res, next) => {
    try {
      const institutionId = req.params.id || req.params.institutionId
      const role = await getStaffRole(institutionId, req.user.id)
      if (role !== "college_admin") {
        return res.status(403).json({ error: "Requires college_admin role" })
      }
      req.institutionRole = role
      next()
    } catch (err) {
      console.error("[college] requireCollegeAdminOnly", err)
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

// Added 2026-07-31 (Phase 3 — recruiter discovery). A "recruiter" here is
// any authenticated user whose profile is org_type='company' — the same
// account model orgCompanyLinks.js already uses to identify companies, kept
// consistent rather than inventing a second recruiter-identity concept.
function requireRecruiter() {
  return async (req, res, next) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("org_type")
      .eq("id", req.user.id)
      .maybeSingle()
    if (profile?.org_type !== "company") {
      return res.status(403).json({ error: "Requires a company/recruiter account" })
    }
    next()
  }
}

// Notifies every active placement-cell member (college_admin + the legacy
// single admin_user_id + placement_officer staff) for an institution — the
// "CC to placement cell" behavior requested for recruiter invites/interviews.
// Best-effort: a notification failure never blocks the action that triggered it.
async function notifyPlacementCell(institutionId, { type, title, body, actorId, entityId, entityType }) {
  try {
    const { data: inst } = await supabaseAdmin.from("institutions").select("admin_user_id").eq("id", institutionId).single()
    const { data: staff } = await supabaseAdmin
      .from("institution_staff")
      .select("user_id")
      .eq("institution_id", institutionId)
      .eq("status", "active")
      .in("role", ["college_admin", "placement_officer"])
    const recipients = new Set([inst?.admin_user_id, ...(staff || []).map((s) => s.user_id)].filter(Boolean))
    if (recipients.size === 0) return
    await supabaseAdmin.from("notifications").insert(
      [...recipients].map((userId) => ({
        user_id: userId, type, title, body,
        actor_id: actorId || null, entity_id: entityId || null, entity_type: entityType || null,
        category: "placement_cell",
      }))
    )
  } catch (err) {
    console.error("[college] notifyPlacementCell", err)
  }
}

// ── GET /recruiter/search — cross-college candidate discovery ────────────────
// Recruiter-only (requireRecruiter). Only ever returns students the college
// has explicitly opted into recruiter visibility for
// (shared_with_recruiters=true) and who are in an active-family status —
// the placement cell's share/approve controls (Phase 2) are the only gate
// here, there is no separate recruiter-side override. Same non-PII allowlist
// as the roster endpoint; adds the institution's public name (not private
// data) so a recruiter can tell which college a result belongs to.
router.get("/recruiter/search", requireAuth, requireRecruiter(), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabaseAdmin
    .from("institution_students")
    // student_user_id fetched only to join non-PII profile aggregates below
    // (career role) — stripped before the response is built, same PII
    // discipline as the roster endpoint.
    .select("id, institution_id, student_user_id, department, batch, roll_number, elo_current, job_readiness_score, status", { count: "exact" })
    .eq("shared_with_recruiters", true)
    .in("status", ACTIVE_STATUSES)

  if (req.query.collegeId) {
    const collegeId = UUID_RE.test(req.query.collegeId) ? req.query.collegeId : null
    if (collegeId) {
      query = query.eq("institution_id", collegeId)
    } else {
      const { data: inst } = await supabaseAdmin.from("institutions").select("id").ilike("slug", req.query.collegeId).maybeSingle()
      if (!inst) return res.status(200).json({ students: [], page, pageSize, total: 0 })
      query = query.eq("institution_id", inst.id)
    }
  }
  if (req.query.branch) query = query.eq("department", req.query.branch)
  if (req.query.minElo) query = query.gte("elo_current", parseFloat(req.query.minElo))
  if (req.query.minReadiness) query = query.gte("job_readiness_score", parseFloat(req.query.minReadiness))

  const { data, error, count } = await query.order("elo_current", { ascending: false }).range(from, to)
  if (error) return res.status(500).json({ error: error.message })

  const institutionIds = [...new Set(data.map((s) => s.institution_id))]
  const userIds = data.map((s) => s.student_user_id).filter(Boolean)
  const [{ data: institutions }, { data: profileRows }] = await Promise.all([
    institutionIds.length ? supabaseAdmin.from("institutions").select("id, name").in("id", institutionIds) : Promise.resolve({ data: [] }),
    userIds.length ? supabaseAdmin.from("profiles").select("id, job_role, target_role").in("id", userIds) : Promise.resolve({ data: [] }),
  ])
  const instNameById = Object.fromEntries((institutions || []).map((i) => [i.id, i.name]))

  // req.query.role is a post-filter (same "no cheap FK-embed across to
  // profiles" limitation documented on the roster endpoint) — applied after
  // the DB page is fetched, which is an acceptable trade-off at this
  // platform's current scale for a recruiter-facing search.
  const profileById = Object.fromEntries((profileRows || []).map((p) => [p.id, p]))
  const roleQuery = (req.query.role || "").trim().toLowerCase()
  let results = data.map((s) => {
    const careerRole = profileById[s.student_user_id]?.job_role || profileById[s.student_user_id]?.target_role || null
    return {
      id: s.id,
      collegeId: s.institution_id,
      collegeName: instNameById[s.institution_id] || "Unknown institution",
      department: s.department,
      batch: s.batch,
      elo: s.elo_current,
      jobReadiness: s.job_readiness_score,
      careerRole,
      // matchScore: a transparent, deterministic 0-100 illustrative sort
      // signal built ONLY from data already on this row — 60% normalized
      // ELO (against a 1500 ceiling — Expert-tier ELO per elo_events'
      // grading bands) + 30% job-readiness score + a flat 10pt bonus for an
      // exact role-query match. This is explicitly NOT a second scoring
      // system or a prediction of hire likelihood — it never gets written
      // anywhere, it exists only to help a recruiter sort this one response.
      matchScore: Math.round(
        Math.min(100, (Number(s.elo_current) || 0) / 15) * 0.6 +
        Math.min(100, Number(s.job_readiness_score) || 0) * 0.3 +
        (roleQuery && careerRole && careerRole.toLowerCase().includes(roleQuery) ? 10 : 0)
      ),
    }
  })
  if (roleQuery) {
    results = results.filter((r) => (r.careerRole || "").toLowerCase().includes(roleQuery))
  }
  results.sort((a, b) => b.matchScore - a.matchScore)

  res.status(200).json({ students: results, page, pageSize, total: count })
})

// ── POST /institutions/:id/students/:studentId/invite — recruiter invite ─────
// Requires the student to already be shared_with_recruiters=true (placement
// cell's own gate, re-checked here — never trust that a recruiter only calls
// this after a legitimate /recruiter/search result). CCs the placement cell
// via notifyPlacementCell so this satisfies "placement cell visibility",
// not just a private recruiter<->student channel.
router.post("/institutions/:id/students/:studentId/invite", requireAuth, requireRecruiter(), async (req, res) => {
  const { id: institutionId, studentId } = req.params
  const { type = "profile_view" } = req.body || {}
  if (!["profile_view", "challenge", "interview"].includes(type)) {
    return res.status(400).json({ error: "type must be one of profile_view, challenge, interview" })
  }

  const { data: student } = await supabaseAdmin
    .from("institution_students")
    .select("id, student_user_id, shared_with_recruiters, status")
    .eq("id", studentId)
    .eq("institution_id", institutionId)
    .maybeSingle()
  if (!student) return res.status(404).json({ error: "Student not found" })
  if (!student.shared_with_recruiters) return res.status(403).json({ error: "This student is not shared with recruiters" })

  const { data: invite, error } = await supabaseAdmin
    .from("recruiter_invites")
    .insert({ institution_id: institutionId, recruiter_id: req.user.id, student_id: studentId, type, status: "sent" })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })

  const { data: recruiterProfile } = await supabaseAdmin.from("profiles").select("org_name, name").eq("id", req.user.id).single()
  const recruiterName = recruiterProfile?.org_name || recruiterProfile?.name || "A recruiter"

  if (student.student_user_id) {
    await supabaseAdmin.from("notifications").insert({
      user_id: student.student_user_id, type: "recruiter_invite",
      title: "A recruiter is interested in your profile",
      body: `${recruiterName} sent a ${type.replace("_", " ")} invite`,
      actor_id: req.user.id, entity_id: invite.id, entity_type: "recruiter_invites",
      category: "recruiter",
    }).catch(() => {})
  }
  await notifyPlacementCell(institutionId, {
    type: "recruiter_invite", title: "Recruiter invite sent to a student",
    body: `${recruiterName} sent a ${type.replace("_", " ")} invite to a student in your roster`,
    actorId: req.user.id, entityId: invite.id, entityType: "recruiter_invites",
  })

  res.status(200).json({ invite })
})

// ── GET /institutions/:id/recruiter-invites — placement cell visibility ──────
router.get("/institutions/:id/recruiter-invites", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params
  const { data, error } = await supabaseAdmin
    .from("recruiter_invites")
    .select("id, recruiter_id, student_id, type, status, created_at")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ invites: data || [] })
})

// ── POST /institutions/:id/students/:studentId/interview — recruiter-requested interview ──
router.post("/institutions/:id/students/:studentId/interview", requireAuth, requireRecruiter(), async (req, res) => {
  const { id: institutionId, studentId } = req.params
  const { mode = "human", scheduledAt = null } = req.body || {}
  if (!["ai", "human", "hybrid"].includes(mode)) {
    return res.status(400).json({ error: "mode must be one of ai, human, hybrid" })
  }

  const { data: student } = await supabaseAdmin
    .from("institution_students")
    .select("id, student_user_id, shared_with_recruiters")
    .eq("id", studentId)
    .eq("institution_id", institutionId)
    .maybeSingle()
  if (!student) return res.status(404).json({ error: "Student not found" })
  if (!student.shared_with_recruiters) return res.status(403).json({ error: "This student is not shared with recruiters" })

  const { data: interview, error } = await supabaseAdmin
    .from("interviews")
    .insert({
      institution_id: institutionId, recruiter_id: req.user.id, student_id: studentId,
      mode, scheduled_at: scheduledAt, status: scheduledAt ? "scheduled" : "consent_pending",
    })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })

  const { data: recruiterProfile } = await supabaseAdmin.from("profiles").select("org_name, name").eq("id", req.user.id).single()
  const recruiterName = recruiterProfile?.org_name || recruiterProfile?.name || "A recruiter"

  if (student.student_user_id) {
    await supabaseAdmin.from("notifications").insert({
      user_id: student.student_user_id, type: "interview_requested",
      title: "Interview requested",
      body: `${recruiterName} requested an interview${scheduledAt ? ` for ${new Date(scheduledAt).toLocaleDateString("en-IN")}` : ""}`,
      actor_id: req.user.id, entity_id: interview.id, entity_type: "interviews",
      category: "recruiter",
    }).catch(() => {})
  }
  await notifyPlacementCell(institutionId, {
    type: "interview_requested", title: "Recruiter requested a student interview",
    body: `${recruiterName} requested an interview with a student in your roster`,
    actorId: req.user.id, entityId: interview.id, entityType: "interviews",
  })

  res.status(200).json({ interview })
})

// ── GET /institutions/:id/interviews — placement cell pipeline visibility ────
router.get("/institutions/:id/interviews", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params
  const { data, error } = await supabaseAdmin
    .from("interviews")
    .select("id, recruiter_id, student_id, mode, status, scheduled_at, consent_given_at, created_at")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ interviews: data || [] })
})

// ── PATCH /institutions/:id/interviews/:interviewId — placement cell pipeline management ──
// Admin-only status transitions (cancel/complete) — consent_given_at is
// deliberately NOT settable here (that's the student's own action, out of
// this pass's scope) which keeps the interviews_consent_before_recording
// DB constraint meaningful rather than something this route could bypass.
router.patch(
  "/institutions/:id/interviews/:interviewId",
  requireAuth,
  requireInstitutionAdmin(),
  async (req, res) => {
    const { id: institutionId, interviewId } = req.params
    const { status } = req.body || {}
    if (!["scheduled", "live", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" })
    }
    const { data: updated, error } = await supabaseAdmin
      .from("interviews")
      .update({ status })
      .eq("id", interviewId)
      .eq("institution_id", institutionId)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(200).json({ interview: updated })
  }
)

// ── POST /institutions/:id/students/:studentId/offer — recruiter sends an offer ──
// Added 2026-07-31 (Phase 4). Same shared_with_recruiters re-check as
// invite/interview (Phase 3) — a recruiter can only offer a student the
// college has explicitly made visible. Writes the real `offers` table (not
// the incompatible schema recruiterComms.js assumes — see the Phase 3
// summary for that pre-existing, separate bug). Notifies the student (their
// inbox — GET /api/nexus/notifications, already built and already rendered
// in OrbitDashboard.jsx, reused as-is rather than building a second inbox)
// and CCs the placement cell.
router.post("/institutions/:id/students/:studentId/offer", requireAuth, requireRecruiter(), async (req, res) => {
  const { id: institutionId, studentId } = req.params
  const { company, role = null, ctcLpa = null, offerDate = null, driveId = null } = req.body || {}
  if (!company || !company.trim()) return res.status(400).json({ error: "company is required" })

  const { data: student } = await supabaseAdmin
    .from("institution_students")
    .select("id, student_user_id, shared_with_recruiters")
    .eq("id", studentId)
    .eq("institution_id", institutionId)
    .maybeSingle()
  if (!student) return res.status(404).json({ error: "Student not found" })
  if (!student.shared_with_recruiters) return res.status(403).json({ error: "This student is not shared with recruiters" })

  // 2026-08-02: optional drive linkage, feeds drive-vs-drive comparison
  // analytics (GET /institutions/:id/drives). Verified to actually belong to
  // this institution before trusting it, same as every other cross-entity id.
  let linkedDriveId = null
  if (driveId) {
    const { data: drive } = await supabaseAdmin
      .from("placement_drives").select("id").eq("id", driveId).eq("institution_id", institutionId).maybeSingle()
    linkedDriveId = drive?.id || null
  }

  const { data: offer, error } = await supabaseAdmin
    .from("offers")
    .insert({
      student_id: studentId, institution_id: institutionId, recruiter_id: req.user.id,
      company: company.trim(), role, ctc_lpa: ctcLpa, offer_date: offerDate, status: "offered",
      drive_id: linkedDriveId,
    })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })

  const { data: recruiterProfile } = await supabaseAdmin.from("profiles").select("org_name, name").eq("id", req.user.id).single()
  const recruiterName = recruiterProfile?.org_name || recruiterProfile?.name || "A recruiter"

  if (student.student_user_id) {
    await supabaseAdmin.from("notifications").insert({
      user_id: student.student_user_id, type: "offer_received",
      title: "Offer Letter Received",
      body: `${recruiterName} sent you an offer${role ? ` for ${role}` : ""} at ${company.trim()}`,
      actor_id: req.user.id, entity_id: offer.id, entity_type: "offers",
      category: "recruiter", urgency: "important",
    }).catch(() => {})
  }
  await notifyPlacementCell(institutionId, {
    type: "offer_sent", title: "Recruiter sent an offer to a student",
    body: `${recruiterName} offered a student in your roster a role at ${company.trim()}`,
    actorId: req.user.id, entityId: offer.id, entityType: "offers",
  })

  res.status(200).json({ offer })
})

// ── GET /institutions/:id/offers — placement cell visibility ─────────────────
router.get("/institutions/:id/offers", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params
  const { data, error } = await supabaseAdmin
    .from("offers")
    .select("id, student_id, recruiter_id, company, role, ctc_lpa, offer_date, status, created_at")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ offers: data || [] })
})

// ── GET /institutions/:id/placements — placement-cell confirmation queue ─────
// Added 2026-07-31 (Phase 4). Lists institution_placements rows so the
// placement cell can see (and confirm) the records POST /offers/:id/respond
// creates on acceptance. This is the list-side counterpart to the existing
// POST .../placements/:placementId/confirm route (Phase-1 era) — that route
// could already confirm a placement, but nothing could tell an admin which
// placementId to confirm until now.
router.get("/institutions/:id/placements", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params
  let query = supabaseAdmin
    .from("institution_placements")
    .select("id, student_id, offer_id, company, role, ctc_lpa, joining_date, elo_at_placement, confirmation_status, confirmed_at, visible_on_placement_wall, created_at")
    .eq("institution_id", institutionId)
  if (req.query.status) query = query.eq("confirmation_status", req.query.status)
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ placements: data || [] })
})

// ── POST /offers/:offerId/respond — student accepts/declines their own offer ──
// Student-only: ownership is verified against institution_students.student_user_id
// (never trusts a student_id in the request body), matching this project's
// "never trust client input" rule the same way self-link does. On accept,
// this auto-creates the institution_placements row that
// POST /institutions/:id/placements/:placementId/confirm (already built,
// Phase 1-era) expects to exist — closing the loop from "student accepted an
// offer" to "placement cell can TPO-confirm it" without a manual placement-
// cell data-entry step. institution_students.status is deliberately NOT
// changed here — it only becomes 'placed' via the existing TPO-confirm gate,
// so acceptance alone can never silently count as a confirmed placement in
// any stats/leaderboard endpoint.
router.post("/offers/:offerId/respond", requireAuth, async (req, res) => {
  const { offerId } = req.params
  const { response } = req.body || {} // "accepted" | "declined"
  if (!["accepted", "declined"].includes(response)) {
    return res.status(400).json({ error: "response must be 'accepted' or 'declined'" })
  }

  const { data: offer, error: fetchErr } = await supabaseAdmin
    .from("offers")
    .select("id, student_id, institution_id, recruiter_id, company, role, ctc_lpa, status")
    .eq("id", offerId)
    .single()
  if (fetchErr || !offer) return res.status(404).json({ error: "Offer not found" })
  if (offer.status !== "offered") {
    return res.status(409).json({ error: `Cannot respond — offer status is already '${offer.status}'` })
  }

  const { data: student } = await supabaseAdmin
    .from("institution_students")
    .select("id, student_user_id, elo_current")
    .eq("id", offer.student_id)
    .single()
  if (!student || student.student_user_id !== req.user.id) {
    return res.status(403).json({ error: "This offer does not belong to you" })
  }

  const { data: updatedOffer, error: updateErr } = await supabaseAdmin
    .from("offers")
    .update({ status: response })
    .eq("id", offerId)
    .select()
    .single()
  if (updateErr) return res.status(500).json({ error: updateErr.message })

  let placement = null
  if (response === "accepted") {
    const { data: createdPlacement, error: placementErr } = await supabaseAdmin
      .from("institution_placements")
      .insert({
        offer_id: offerId, student_id: offer.student_id, institution_id: offer.institution_id,
        company: offer.company, role: offer.role, ctc_lpa: offer.ctc_lpa,
        elo_at_placement: student.elo_current, confirmation_status: "unconfirmed",
      })
      .select()
      .single()
    if (placementErr) return res.status(500).json({ error: placementErr.message })
    placement = createdPlacement
  }

  if (offer.recruiter_id) {
    await supabaseAdmin.from("notifications").insert({
      user_id: offer.recruiter_id, type: "offer_response",
      title: `Offer ${response === "accepted" ? "Accepted" : "Declined"}`,
      body: `The candidate ${response} your offer at ${offer.company}`,
      actor_id: req.user.id, entity_id: offerId, entity_type: "offers",
      category: "recruiter",
    }).catch(() => {})
  }
  await notifyPlacementCell(offer.institution_id, {
    type: response === "accepted" ? "offer_accepted" : "offer_declined",
    title: response === "accepted" ? "Student accepted an offer — needs confirmation" : "Student declined an offer",
    body: `A student in your roster ${response} an offer at ${offer.company}` +
      (response === "accepted" ? " — confirm it in Placements to finalize." : ""),
    actorId: req.user.id, entityId: offerId, entityType: "offers",
  })

  res.status(200).json({ offer: updatedOffer, placement })
})

// ── GET /me/tasks — student-facing task inbox (2026-08-02) ─────────────────
// Closes a real gap: org_tasks previously had ZERO student-facing reader
// anywhere in the app — professors/admins could publish a task and target it
// at a batch, department, or (as of the Groups feature) a specific group, but
// no student could ever see it. Self-scoped (requireAuth only, no institution
// middleware) — a student reads only their own inbox, resolved from their own
// identity, never from a client-supplied id.
//
// Bridges two parallel "who is this student" tables that this codebase still
// has (a pre-existing split, not something this route invents — see the
// College Path schema-conflict note): org_tasks/assigned_to_label was built
// against the legacy `org_members` (org_id/department/batch, populated by the
// join-link flow), while the newer Groups feature targets the canonical
// `institution_students` roster (populated by roster import / self-link).
// A real student is very often present in both, so this checks both signals
// rather than picking one and silently missing tasks assigned via the other.
router.get("/me/tasks", requireAuth, async (req, res) => {
  const userId = req.user.id

  const { data: memberships } = await supabaseAdmin
    .from("org_members")
    .select("org_id, department, batch, role")
    .eq("user_id", userId)

  if (!memberships || memberships.length === 0) {
    return res.status(200).json({ linked: false, tasks: [] })
  }

  // Group membership (canonical institution_students roster) — may be none
  // if this student was never imported/self-linked into that table yet.
  const { data: studentRow } = await supabaseAdmin
    .from("institution_students")
    .select("id")
    .eq("student_user_id", userId)
    .maybeSingle()

  let myGroupIds = []
  if (studentRow) {
    const { data: groupRows } = await supabaseAdmin
      .from("institution_group_members")
      .select("group_id")
      .eq("student_id", studentRow.id)
    myGroupIds = (groupRows || []).map((g) => g.group_id)
  }

  const orgIds = [...new Set(memberships.map((m) => m.org_id).filter(Boolean))]
  const { data: allTasks, error } = await supabaseAdmin
    .from("org_tasks")
    .select("id, org_id, title, description, type, subject, assigned_to_label, assigned_to_group_id, due_date, priority, status, attachment_url, attachment_name, published_by_name, created_at")
    .in("org_id", orgIds)
    .eq("status", "active")
    .order("due_date", { ascending: true, nullsFirst: false })
  if (error) return res.status(500).json({ error: error.message })

  // Filter in-process (not worth a per-row OR-clause query — task volume per
  // org is small, and this keeps the "does this task target me" logic in one
  // readable place instead of split across SQL and JS).
  const membershipByOrg = Object.fromEntries(memberships.map((m) => [m.org_id, m]))
  const CATCH_ALL = new Set(["All Students", "All Faculty", "All Members"])
  const myTasks = (allTasks || []).filter((t) => {
    const m = membershipByOrg[t.org_id]
    if (t.assigned_to_group_id) return myGroupIds.includes(t.assigned_to_group_id)
    if (!t.assigned_to_label) return true
    if (CATCH_ALL.has(t.assigned_to_label)) return true
    if (m && (t.assigned_to_label === m.batch || t.assigned_to_label === m.department)) return true
    return false
  })

  res.status(200).json({ linked: true, tasks: myTasks })
})

// ── GET /me/drives — student-facing view of their institution's active,
// proctored drives (2026-08-02). Self-scoped like /me/tasks. Deliberately a
// narrow field set — students never see min_elo/eligible_branches/recruiter
// internals here, just what they need to start a proctored attempt.
router.get("/me/drives", requireAuth, async (req, res) => {
  const { data: student } = await supabaseAdmin
    .from("institution_students")
    .select("id, institution_id")
    .eq("student_user_id", req.user.id)
    .maybeSingle()
  if (!student) return res.status(200).json({ linked: false, drives: [] })

  const { data: drives, error } = await supabaseAdmin
    .from("placement_drives")
    .select("id, title, status, proctoring_enabled, assessment_url, assessment_instructions, assessment_duration_minutes")
    .eq("institution_id", student.institution_id)
    .eq("proctoring_enabled", true)
    .in("status", ["planned", "active"])
    .order("created_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })

  // Attach this student's own session (if any) so the UI can show
  // resume/completed state instead of always offering "Start".
  const driveIds = (drives || []).map((d) => d.id)
  let mySessions = {}
  if (driveIds.length) {
    const { data: sessions } = await supabaseAdmin
      .from("drive_assessment_sessions")
      .select("id, drive_id, status, violation_count")
      .eq("student_id", student.id).in("drive_id", driveIds)
    mySessions = Object.fromEntries((sessions || []).map((s) => [s.drive_id, s]))
  }

  res.status(200).json({
    linked: true,
    institutionId: student.institution_id,
    drives: (drives || []).map((d) => ({ ...d, mySession: mySessions[d.id] || null })),
  })
})

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

// ── GET /institutions/mine — resolve the caller's own institution ────────────
// Added 2026-07-31 (College Path enhancement pass). Registered BEFORE
// /institutions/:id so Express's literal-path match wins over the :id param
// route for the exact segment "mine" — router.param("id", ...) never fires
// for this route since its path has no :id token.
// Lets a staff member's dashboard resolve "which institution am I looking
// at" without already knowing the institution's UUID/slug, which the old
// org_members-based dashboard never needed (org_id was just req.user.id).
// Added 2026-08-02 (multi-campus support). If ?institutionId= is supplied
// AND the caller has an active institution_staff role (or owner/admin_user_id
// match) for that specific institution, resolve that one explicitly instead
// of the auto-picked institution below. This is what lets a university-group
// admin managing several campuses switch which campus their dashboard is
// scoped to. No param = fully unchanged existing behavior for every
// single-institution admin, so this is purely additive.
router.get("/institutions/mine", requireAuth, async (req, res) => {
  const userId = req.user.id
  const requestedId = typeof req.query.institutionId === "string" && UUID_RE.test(req.query.institutionId)
    ? req.query.institutionId
    : null

  if (requestedId) {
    const role = await getStaffRole(requestedId, userId)
    if (!role) return res.status(403).json({ error: "Not a staff member of this institution" })
    const { data: institution, error } = await supabaseAdmin
      .from("institutions")
      .select("id, name, slug, type, email_domain, website, verification_level, status, plan, created_at, university_group_id")
      .eq("id", requestedId)
      .single()
    if (error || !institution) return res.status(404).json({ error: "Institution not found" })
    const { data: verification } = await supabaseAdmin
      .from("institution_verification")
      .select("*")
      .eq("institution_id", institution.id)
      .maybeSingle()
    return res.status(200).json({ institution, verification: verification || null, role })
  }

  const { data: ownedInstitution } = await supabaseAdmin
    .from("institutions")
    .select("id, name, slug, type, email_domain, website, verification_level, status, plan, created_at")
    .eq("admin_user_id", userId)
    .maybeSingle()

  if (ownedInstitution) {
    const { data: verification } = await supabaseAdmin
      .from("institution_verification")
      .select("*")
      .eq("institution_id", ownedInstitution.id)
      .maybeSingle()
    return res.status(200).json({ institution: ownedInstitution, verification: verification || null, role: "college_admin" })
  }

  const { data: staffRow } = await supabaseAdmin
    .from("institution_staff")
    .select("institution_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("role", { ascending: true })
  if (!staffRow || staffRow.length === 0) {
    // Lazy bootstrap: every college admin who signed up before this
    // migration exists only as profiles.org_type='college' (the legacy
    // org_* signup path) — there is currently zero backfill from that row
    // into `institutions`, so without this every such admin would 404 here
    // forever and never see canonical data, no matter what the dashboard
    // reads. This creates exactly one institutions row, once, from data the
    // admin already entered at signup — it does not touch or migrate
    // org_members/org_tasks/org_events, and existing legacy screens keep
    // working unchanged either way.
    const bootstrapped = await bootstrapInstitutionFromProfile(userId)
    if (bootstrapped) {
      return res.status(200).json({ institution: bootstrapped, verification: null, role: "college_admin", bootstrapped: true })
    }
    return res.status(404).json({ error: "Not a staff member of any institution" })
  }
  const priority = ["college_admin", "placement_officer", "dept_head", "professor", "mentor"]
  const bestRole = priority.find((r) => staffRow.some((s) => s.role === r)) || staffRow[0].role
  const institutionId = staffRow.find((s) => s.role === bestRole)?.institution_id || staffRow[0].institution_id

  const { data: institution, error } = await supabaseAdmin
    .from("institutions")
    .select("id, name, slug, type, email_domain, website, verification_level, status, plan, created_at")
    .eq("id", institutionId)
    .single()
  if (error || !institution) return res.status(404).json({ error: "Institution not found" })

  const { data: verification } = await supabaseAdmin
    .from("institution_verification")
    .select("*")
    .eq("institution_id", institution.id)
    .maybeSingle()

  res.status(200).json({ institution, verification: verification || null, role: bestRole })
})

// ── POST /self-link — student auto-alignment to their declared college ───────
// Added 2026-07-31. Called (best-effort, non-blocking) by the frontend once
// after a student completes onboarding with a `college` value on their
// profile. Deliberately NOT a client-side write to institution_students —
// that table's RLS is scoped to institution staff, and per this project's
// "never trust client input" rule a student's own session must never be able
// to assert its own institution membership directly. This endpoint is the
// single, server-verified path: it re-reads the student's own profile.college
// (never trusts a value passed in the request body), matches it against
// registered institutions.name, and only links on a single unambiguous match.
// New rows land as status='pending_admin' (link_method='self_declared') so
// they surface in the placement cell's existing workflow-queue pattern for
// approval rather than silently appearing as an active/counted student.
// Idempotent: never overwrites an existing institution_students row (in
// particular never downgrades a row that's already active/placed/etc.).
function escapeIlike(input) {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

router.post("/self-link", requireAuth, async (req, res) => {
  const userId = req.user.id

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("college, branch")
    .eq("id", userId)
    .maybeSingle()
  if (profileErr) return res.status(500).json({ error: profileErr.message })

  const collegeText = (profile?.college || "").trim()
  if (!collegeText) {
    return res.status(200).json({ linked: false, reason: "no_college_on_profile" })
  }

  const { data: existingLink } = await supabaseAdmin
    .from("institution_students")
    .select("id, institution_id, status")
    .eq("student_user_id", userId)
    .maybeSingle()
  if (existingLink) {
    return res.status(200).json({ linked: true, alreadyLinked: true, institutionId: existingLink.institution_id, status: existingLink.status })
  }

  const term = escapeIlike(collegeText)
  const { data: matches, error: matchErr } = await supabaseAdmin
    .from("institutions")
    .select("id, name")
    .ilike("name", `%${term}%`)
    .limit(2) // only need to know "exactly one" vs "ambiguous"
  if (matchErr) return res.status(500).json({ error: matchErr.message })

  if (!matches || matches.length !== 1) {
    return res.status(200).json({
      linked: false,
      reason: matches && matches.length > 1 ? "ambiguous_match" : "no_registered_institution",
    })
  }

  const institutionId = matches[0].id
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("institution_students")
    .insert({
      institution_id: institutionId,
      student_user_id: userId,
      link_method: "self_declared",
      status: "pending_admin",
      department: profile?.branch || null,
    })
    .select("id, status")
    .single()

  if (insertErr) {
    // Unique-constraint race (two calls in flight) is not an error condition.
    if (insertErr.code === "23505") {
      return res.status(200).json({ linked: true, alreadyLinked: true, institutionId })
    }
    return res.status(500).json({ error: insertErr.message })
  }

  await supabaseAdmin.from("activity_logs").insert({
    institution_id: institutionId,
    actor_id: userId,
    action_code: "student.self_linked",
    entity_type: "institution_students",
    entity_id: inserted.id,
    details: { matchedName: matches[0].name, declaredCollege: collegeText },
  })

  res.status(200).json({ linked: true, institutionId, status: inserted.status })
})

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

// Status buckets used by the "active"/"inactive" filter — kept as a named
// constant so the workflow-queue panel and this filter can't silently drift
// apart on what "active" means.
const ACTIVE_STATUSES = ["active", "placed", "transitioning", "professional_active"]

// 2026-08-07: shared by the aggregate reporting routes below (stats,
// branches) — batch-resolves the REAL per-student ELO via canonicalElo()
// instead of trusting institution_students.elo_current, which is a cached
// column that isn't reliably kept in sync with the student's actual
// profiles data (confirmed: a real test student had elo_current="0" while
// their profiles.elo_rating was 456). Falls back to elo_current only if a
// student has no profiles row at all (shouldn't happen, but keeps this from
// ever turning a present number into a missing one).
async function realEloByStudent(institutionStudents) {
  const userIds = (institutionStudents || []).map((s) => s.student_user_id).filter(Boolean)
  if (!userIds.length) return {}
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, path_type, elo_rating, role_elo, professional_elo, aura_score")
    .in("id", userIds)
  return Object.fromEntries((profiles || []).map((p) => [p.id, canonicalElo(p)]))
}

// ── GET /institutions/:id/students — college.getStudentRoster ─────────────────
// Extended 2026-07-31 (Phase 2 — placement-cell advanced filters) with role,
// task-count, interview-status, share-status and active/inactive filtering.
// department/batch/status/shared/active/search filter at the DB level (fast,
// paginated correctly). role/minTasks/interviewStatus require data that only
// lives in `profiles` and `interview_sessions` — there is no FK-embeddable
// relationship from institution_students to either (student_user_id points
// at auth.users, and PostgREST can't embed across that), so when any of
// those three filters is present this falls back to fetching a larger
// DB-filtered candidate batch (capped at 500 — generous for any single
// institution at this platform's current scale) and filtering/paginating in
// memory. This is a documented, honest trade-off, not a fully indexed
// query — worth revisiting with a materialized view if a single
// institution's roster grows past a few thousand.
router.get("/institutions/:id/students", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 50))

  const needsEnrichedFilter = !!(req.query.role || req.query.minTasks || req.query.interviewStatus)
  const from = needsEnrichedFilter ? 0 : (page - 1) * pageSize
  const to = needsEnrichedFilter ? 499 : from + pageSize - 1

  let query = supabaseAdmin
    .from("institution_students")
    // Explicit allowlist — no email/phone/DOB. This is the PII boundary.
    // student_user_id is included only to join non-PII profile/interview
    // aggregates below — it is stripped from every response before sending.
    .select(
      "id, student_user_id, department, batch, roll_number, status, elo_current, job_readiness_score, linked_at, shared_with_recruiters",
      { count: "exact" }
    )
    .eq("institution_id", institutionId)

  if (req.query.department) query = query.eq("department", req.query.department)
  if (req.query.batch) query = query.eq("batch", req.query.batch)
  if (req.query.status) query = query.eq("status", req.query.status)
  if (req.query.shared === "true") query = query.eq("shared_with_recruiters", true)
  if (req.query.shared === "false") query = query.eq("shared_with_recruiters", false)
  if (req.query.active === "true") query = query.in("status", ACTIVE_STATUSES)
  if (req.query.active === "false") query = query.not("status", "in", `(${ACTIVE_STATUSES.join(",")})`)
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

  // Enrich with non-PII, aggregate-only profile/interview data — same
  // allowlist discipline as the base select, no email/phone/DOB pulled in.
  // Always computed (not just when filtering on it) so the roster UI can
  // show career role / task count / AI interview count columns on every
  // page, not just filtered ones.
  //
  // 2026-08-07 bug fix: this previously trusted institution_students.
  // elo_current directly, and resolved career role from only job_role/
  // target_role. For a real test student both were wrong/empty — elo_current
  // sat at its unsynced default "0" while the student's own Aura dashboard
  // (profiles.elo_rating) showed 456, and job_role/target_role were both
  // null while their real chosen role lived in profiles.keyword. Same root
  // cause class as the recruiter-facing roster fix in orgStudentVisibility.js
  // (org_members.elo_rating there, institution_students.elo_current here —
  // two different stale/unsynced columns, same fix: read the real profiles
  // columns via the shared canonicalElo()/resolveCareerName() helpers so
  // every audience — student, recruiter, institution admin — sees the same
  // real number and role for a given candidate.
  const userIds = data.map((s) => s.student_user_id).filter(Boolean)
  const [{ data: profileRows }, { data: interviewRows }] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from("profiles").select(
          "id, job_role, target_role, arena_completed, elo_rating, role_elo, professional_elo, aura_score, path_type, career_track_slug, keyword, domain"
        ).in("id", userIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabaseAdmin.from("interview_sessions").select("user_id").in("user_id", userIds).not("completed_at", "is", null)
      : Promise.resolve({ data: [] }),
  ])
  const profileById = Object.fromEntries((profileRows || []).map((p) => [p.id, p]))
  const interviewCountById = {}
  for (const row of interviewRows || []) {
    interviewCountById[row.user_id] = (interviewCountById[row.user_id] || 0) + 1
  }
  const trackNameBySlug = await resolveCareerBySlug((profileRows || []).map((p) => p.career_track_slug))

  let enriched = data.map(({ student_user_id, elo_current, ...rest }) => {
    const profile = profileById[student_user_id] || {}
    const elo = profile.id ? canonicalElo(profile) : (elo_current || 0)
    return {
      ...rest,
      studentUserId: student_user_id || null,
      elo_current: elo,
      performanceTier: performanceTier(elo),
      careerRole: profile.id ? (resolveCareerName(profile, trackNameBySlug) || profile.job_role) : (rest.careerRole || null),
      taskCount: profile.arena_completed || 0,
      aiInterviewCount: interviewCountById[student_user_id] || 0,
    }
  })

  if (!needsEnrichedFilter) {
    return res.status(200).json({ students: enriched, page, pageSize, total: count })
  }

  const roleFilter = (req.query.role || "").trim().toLowerCase()
  const minTasks = req.query.minTasks ? parseInt(req.query.minTasks, 10) : null
  const interviewStatusFilter = req.query.interviewStatus // "none" | "attempted"

  if (roleFilter) enriched = enriched.filter((s) => (s.careerRole || "").toLowerCase().includes(roleFilter))
  if (minTasks != null && Number.isFinite(minTasks)) enriched = enriched.filter((s) => s.taskCount >= minTasks)
  if (interviewStatusFilter === "none") enriched = enriched.filter((s) => s.aiInterviewCount === 0)
  if (interviewStatusFilter === "attempted") enriched = enriched.filter((s) => s.aiInterviewCount > 0)

  const filteredTotal = enriched.length
  const pageStart = (page - 1) * pageSize
  const paged = enriched.slice(pageStart, pageStart + pageSize)

  res.status(200).json({ students: paged, page, pageSize, total: filteredTotal, filteredInMemory: true })
})

// ── GET /institutions/:id/students/:studentUserId — full student detail ────
// Added 2026-08-07 for the roster "click a row → open their full profile"
// drilldown (previously didn't exist anywhere on the institution side — the
// roster only returned an allowlisted summary, and student_user_id itself
// wasn't even present in the list response for a UI to act on). Verifies
// the student actually has an institution_students row for THIS institution
// before returning anything, so a stale/foreign id can't pull an unrelated
// student's record. Shape mirrors partnerBridge.js's GET /candidates/:id
// (same skills/career-timeline/interviews/certifications/portfolio fields)
// — an institution admin is not a more-privileged viewer than the public
// Portfolio page or a recruiter, so Arena history still respects
// visible_in_portfolio the same way.
router.get("/institutions/:id/students/:studentUserId", requireAuth, requireInstitutionStaff(), async (req, res) => {
  try {
    const { id: institutionId, studentUserId } = req.params

    const { data: link } = await supabaseAdmin
      .from("institution_students")
      .select("id, department, batch, roll_number, status, job_readiness_score, shared_with_recruiters, linked_at")
      .eq("institution_id", institutionId)
      .eq("student_user_id", studentUserId)
      .maybeSingle()
    if (!link) return res.status(404).json({ error: "This student isn't on your roster." })

    // Same own-department scoping as the roster list route above.
    if (req.institutionRole === "professor" || req.institutionRole === "mentor") {
      const { data: staffRow } = await supabaseAdmin
        .from("institution_staff")
        .select("department, scope")
        .eq("institution_id", institutionId).eq("user_id", req.user.id).eq("status", "active").maybeSingle()
      if (staffRow?.scope === "own_department" && staffRow.department && staffRow.department !== link.department) {
        return res.status(403).json({ error: "This student is outside your assigned department." })
      }
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, username, avatar_url, headline, current_role_title, current_company, domain, target_role, path_type, location, role_elo, professional_elo, aura_score, elo_rating, keyword, career_track_slug, uan_verified, education_verified")
      .eq("id", studentUserId)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!profile) return res.status(404).json({ error: "Student profile not found." })

    const [{ data: skills }, { data: arenaRows }, { data: interviewRows }, { data: certRows }, { data: artifactRows }, trackNameBySlug] = await Promise.all([
      supabaseAdmin.from("skill_graph").select("skill_name, domain, elo_value, verification_state, last_proof_date")
        .eq("user_id", studentUserId).eq("is_current", true).order("elo_value", { ascending: false }),
      supabaseAdmin.from("arena_history").select("id, title, domain, skill_name, difficulty, score, elo_delta, type, challenge_type, summary, completed_at")
        .eq("user_id", studentUserId).eq("visible_in_portfolio", true).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(50),
      supabaseAdmin.from("interview_sessions").select("id, module_id, mode, completed_at")
        .eq("user_id", studentUserId).not("completed_at", "is", null).order("completed_at", { ascending: false }),
      supabaseAdmin.from("professional_certifications").select("cert_name, cert_type, issuer, verification_status, verified_at")
        .eq("user_id", studentUserId).eq("verification_status", "verified").order("verified_at", { ascending: false }),
      supabaseAdmin.from("av2_portfolio_artifacts").select("id, artifact_type, storage_url, created_at")
        .eq("user_id", studentUserId).eq("publish_state", "published").order("created_at", { ascending: false }),
      resolveCareerBySlug([profile.career_track_slug]),
    ])

    const elo = canonicalElo(profile)
    res.json({
      student: link,
      candidate: { ...profile, elo, performance_tier: performanceTier(elo), career: resolveCareerName(profile, trackNameBySlug) },
      skills: skills || [],
      careerTimeline: arenaRows || [],
      interviewsCompleted: interviewRows || [],
      certifications: certRows || [],
      portfolioArtifacts: artifactRows || [],
    })
  } catch (err) {
    console.error("[college/institutions/:id/students/:studentUserId]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── PATCH /institutions/:id/students/:studentId/share — placement-cell share control ──
// Added 2026-07-31. Placement-officer-or-admin-only, matching every other
// state-changing route in this file. This is the "share status" control the
// filters above read from — flipping it to false hides a student from any
// recruiter-facing roster query without changing their institution_students
// status (a student can be active but not yet shared, e.g. pending a
// placement-cell review).
router.patch(
  "/institutions/:id/students/:studentId/share",
  requireAuth,
  requireInstitutionAdmin(),
  async (req, res) => {
    const { id: institutionId, studentId } = req.params
    const { shared } = req.body || {}
    if (typeof shared !== "boolean") return res.status(400).json({ error: "Body must include { shared: boolean }" })

    const { data: updated, error } = await supabaseAdmin
      .from("institution_students")
      .update({ shared_with_recruiters: shared })
      .eq("id", studentId)
      .eq("institution_id", institutionId)
      .select("id, shared_with_recruiters")
      .single()
    if (error) return res.status(500).json({ error: error.message })

    await supabaseAdmin.from("activity_logs").insert({
      institution_id: institutionId,
      actor_id: req.user.id,
      action_code: shared ? "student.shared" : "student.unshared",
      entity_type: "institution_students",
      entity_id: studentId,
    })

    res.status(200).json({ student: updated })
  }
)

// ─────────────────────────────────────────────────────────────────────────
// Staff access management (2026-08-01): the college admin creates real
// login credentials for staff (placement team etc.). The created account
// logs in normally through the org path; /institutions/mine resolves their
// institution via institution_staff, and the frontend locks their view to
// their role's pages (ROLE_PAGES in InstitutionOS.jsx). college_admin ONLY
// — a placement officer must not be able to mint more credentials
// (requireInstitutionAdmin also passes placement_officer, so this uses a
// stricter inline check).
// ─────────────────────────────────────────────────────────────────────────

const STAFF_CREATABLE_ROLES = ["placement_officer", "professor", "dept_head", "mentor"]

router.post("/institutions/:id/staff", requireAuth, async (req, res) => {
  const institutionId = req.params.id
  const callerRole = await getStaffRole(institutionId, req.user.id)
  if (callerRole !== "college_admin") return res.status(403).json({ error: "Only the college admin can create staff logins" })

  const { email, password, name, role = "placement_officer", department = "" } = req.body || {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "A valid email is required" })
  if (!password || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" })
  if (!STAFF_CREATABLE_ROLES.includes(role)) return res.status(400).json({ error: `role must be one of: ${STAFF_CREATABLE_ROLES.join(", ")}` })

  // 1) Create (or find) the auth user. email_confirm:true — the admin is
  // vouching for this address; no confirmation email round-trip needed.
  let userId
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: name || "", created_by_institution: institutionId },
  })
  if (createErr) {
    // Existing account with this email — do NOT reset their password or
    // attach them silently; that would let an admin hijack an arbitrary
    // existing Capabilio account by knowing its email.
    return res.status(409).json({ error: `An account with this email already exists. Ask them to log in, or use a different email. (${createErr.message})` })
  }
  userId = created.user.id

  // 2) Minimal profile so the app treats them as an institution-path user.
  const { data: inst } = await supabaseAdmin.from("institutions").select("name").eq("id", institutionId).single()
  await supabaseAdmin.from("profiles").upsert({
    id: userId, email, name: name || email.split("@")[0],
    path: "institution", org_type: "college", org_name: inst?.name || "",
    onboarding_complete: true, // staff logins skip the org-creation wizard — their institution already exists
  }, { onConflict: "id" })

  // 3) The staff row — this is what /institutions/mine resolves through.
  const { error: staffErr } = await supabaseAdmin.from("institution_staff").insert({
    institution_id: institutionId, user_id: userId, role,
    department: department || null, scope: "all_departments", status: "active",
    invited_by: req.user.id,
  })
  if (staffErr) return res.status(500).json({ error: staffErr.message })

  await supabaseAdmin.from("activity_logs").insert({
    institution_id: institutionId, actor_id: req.user.id,
    action_code: "staff.credentials_created", entity_type: "institution_staff", entity_id: userId,
    severity: "warning", details: { email, role },
  })

  res.status(200).json({ success: true, staff: { userId, email, role, name: name || "" } })
})

router.get("/institutions/:id/staff", requireAuth, requireInstitutionAdmin(), async (req, res) => {
  const { data: staff, error } = await supabaseAdmin
    .from("institution_staff")
    .select("id, user_id, role, department, status, created_at")
    .eq("institution_id", req.params.id)
    .order("created_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })

  const userIds = (staff || []).map((s) => s.user_id)
  const { data: profiles } = userIds.length
    ? await supabaseAdmin.from("profiles").select("id, name, email").in("id", userIds)
    : { data: [] }
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  res.status(200).json({
    staff: (staff || []).map((s) => ({ ...s, name: byId[s.user_id]?.name || "", email: byId[s.user_id]?.email || "" })),
  })
})

// ── GET /institutions/:id/staff/roster — @-mention list for Team Chat ─────
// Deliberately separate from GET /staff above: that route is college_admin-
// only and returns management-grade detail (department, status, created_at).
// Any active staff member needs to see who they can @-mention in the shared
// channel, so this is gated by requireInstitutionStaff() (not admin-only)
// and returns just id/name/role — no email, no department.
router.get("/institutions/:id/staff/roster", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const institutionId = req.params.id
  const { data: inst } = await supabaseAdmin.from("institutions").select("admin_user_id, name").eq("id", institutionId).maybeSingle()
  const { data: staff } = await supabaseAdmin
    .from("institution_staff")
    .select("user_id, role")
    .eq("institution_id", institutionId)
    .eq("status", "active")

  const userIds = [...new Set([inst?.admin_user_id, ...(staff || []).map(s => s.user_id)].filter(Boolean))]
  const { data: profiles } = userIds.length
    ? await supabaseAdmin.from("profiles").select("id, name").in("id", userIds)
    : { data: [] }
  const nameById = Object.fromEntries((profiles || []).map(p => [p.id, p.name]))

  const roster = []
  if (inst?.admin_user_id) roster.push({ user_id: inst.admin_user_id, role: "college_admin", name: nameById[inst.admin_user_id] || "Admin" })
  for (const s of staff || []) {
    if (s.user_id === inst?.admin_user_id) continue // don't duplicate the admin
    roster.push({ user_id: s.user_id, role: s.role, name: nameById[s.user_id] || "Staff member" })
  }
  res.status(200).json({ roster })
})

router.patch("/institutions/:id/staff/:staffId/revoke", requireAuth, async (req, res) => {
  const callerRole = await getStaffRole(req.params.id, req.user.id)
  if (callerRole !== "college_admin") return res.status(403).json({ error: "Only the college admin can revoke staff access" })

  const { error } = await supabaseAdmin
    .from("institution_staff")
    .update({ status: "revoked" })
    .eq("id", req.params.staffId)
    .eq("institution_id", req.params.id)
  if (error) return res.status(500).json({ error: error.message })

  await supabaseAdmin.from("activity_logs").insert({
    institution_id: req.params.id, actor_id: req.user.id,
    action_code: "staff.access_revoked", entity_type: "institution_staff", entity_id: req.params.staffId,
    severity: "warning",
  })
  res.status(200).json({ success: true })
})

// ── PATCH /institutions/:id/students/:studentId — edit roster fields ──────
// 2026-08-01: admin-editable roster metadata only (department/batch/roll
// number). Deliberately NOT elo_current/job_readiness_score — those are
// score-of-record fields, only movable via the audited elo-adjustment route.
router.patch(
  "/institutions/:id/students/:studentId",
  requireAuth,
  requireInstitutionAdmin(),
  async (req, res) => {
    const { id: institutionId, studentId } = req.params
    const { department, batch, rollNumber } = req.body || {}
    const patch = {}
    if (department !== undefined) patch.department = String(department || "").trim()
    if (batch !== undefined) patch.batch = String(batch || "").trim()
    if (rollNumber !== undefined) patch.roll_number = String(rollNumber || "").trim()
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Nothing to update" })

    const { data: updated, error } = await supabaseAdmin
      .from("institution_students")
      .update(patch)
      .eq("id", studentId)
      .eq("institution_id", institutionId)
      .select("id, department, batch, roll_number")
      .single()
    if (error) return res.status(500).json({ error: error.message })

    await supabaseAdmin.from("activity_logs").insert({
      institution_id: institutionId, actor_id: req.user.id,
      action_code: "student.updated", entity_type: "institution_students", entity_id: studentId,
      details: patch,
    })
    res.status(200).json({ student: updated })
  }
)

// ── DELETE /institutions/:id/students/:studentId — remove from roster ─────
// Removes the LINK row only — never touches the student's own account,
// profile, ELO, or history. They can re-link later via onboarding/import.
router.delete(
  "/institutions/:id/students/:studentId",
  requireAuth,
  requireInstitutionAdmin(),
  async (req, res) => {
    const { id: institutionId, studentId } = req.params
    const { error } = await supabaseAdmin
      .from("institution_students")
      .delete()
      .eq("id", studentId)
      .eq("institution_id", institutionId)
    if (error) return res.status(500).json({ error: error.message })

    await supabaseAdmin.from("activity_logs").insert({
      institution_id: institutionId, actor_id: req.user.id,
      action_code: "student.removed", entity_type: "institution_students", entity_id: studentId,
      severity: "warning",
    })
    res.status(200).json({ success: true })
  }
)

// ── POST /institutions/:id/students/:studentId/approve — workflow-queue action ──
// Added 2026-07-31. Flips a self-linked or roster-imported student from
// 'pending_admin' to 'active' — the missing other half of self-link's
// "land pending, surface in the workflow queue" design. Placement-officer-
// or college-admin-only (requireInstitutionAdmin), matching every other
// state-changing route in this file.
router.post(
  "/institutions/:id/students/:studentId/approve",
  requireAuth,
  requireInstitutionAdmin(),
  async (req, res) => {
    const { id: institutionId, studentId } = req.params
    const { data: student, error: fetchErr } = await supabaseAdmin
      .from("institution_students")
      .select("id, institution_id, status")
      .eq("id", studentId)
      .eq("institution_id", institutionId)
      .single()
    if (fetchErr || !student) return res.status(404).json({ error: "Student not found" })
    if (student.status !== "pending_admin") {
      return res.status(409).json({ error: `Cannot approve — student status is '${student.status}', not 'pending_admin'` })
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("institution_students")
      .update({ status: "active", approved_at: new Date().toISOString() })
      .eq("id", studentId)
      .select()
      .single()
    if (updateErr) return res.status(500).json({ error: updateErr.message })

    await supabaseAdmin.from("activity_logs").insert({
      institution_id: institutionId,
      actor_id: req.user.id,
      action_code: "student.approved",
      entity_type: "institution_students",
      entity_id: studentId,
    })

    res.status(200).json({ student: updated })
  }
)

// ── POST /institutions/:id/students/:studentId/reject — workflow-queue action ──
router.post(
  "/institutions/:id/students/:studentId/reject",
  requireAuth,
  requireInstitutionAdmin(),
  async (req, res) => {
    const { id: institutionId, studentId } = req.params
    const { data: student, error: fetchErr } = await supabaseAdmin
      .from("institution_students")
      .select("id, institution_id, status")
      .eq("id", studentId)
      .eq("institution_id", institutionId)
      .single()
    if (fetchErr || !student) return res.status(404).json({ error: "Student not found" })
    if (student.status !== "pending_admin") {
      return res.status(409).json({ error: `Cannot reject — student status is '${student.status}', not 'pending_admin'` })
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("institution_students")
      .update({ status: "rejected" })
      .eq("id", studentId)
      .select()
      .single()
    if (updateErr) return res.status(500).json({ error: updateErr.message })

    await supabaseAdmin.from("activity_logs").insert({
      institution_id: institutionId,
      actor_id: req.user.id,
      action_code: "student.rejected",
      entity_type: "institution_students",
      entity_id: studentId,
      severity: "warning",
    })

    res.status(200).json({ student: updated })
  }
)

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
// 2026-08-07: avgElo previously trusted institution_students.elo_current
// directly, same stale/unsynced-column bug as the roster route above (see
// its header comment) — a college with real, active students could still
// show "avg ELO 0" if that cached column was never updated. Now resolves
// the real per-student ELO via canonicalElo() the same way.
router.get("/institutions/:id/stats", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params

  const { data: students, error } = await supabaseAdmin
    .from("institution_students")
    .select("student_user_id, elo_current, job_readiness_score, status, department")
    .eq("institution_id", institutionId)

  if (error) return res.status(500).json({ error: error.message })

  const realEloById = await realEloByStudent(students)
  const total = students.length
  const avgElo = total ? students.reduce((s, r) => s + (realEloById[r.student_user_id] ?? (Number(r.elo_current) || 0)), 0) / total : 0
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
// 2026-08-07: same elo_current staleness fix as /stats above.
router.get("/institutions/:id/branches", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params

  const { data: students, error } = await supabaseAdmin
    .from("institution_students")
    .select("student_user_id, department, elo_current, job_readiness_score, status")
    .eq("institution_id", institutionId)

  if (error) return res.status(500).json({ error: error.message })

  const realEloById = await realEloByStudent(students)
  const byDept = {}
  for (const s of students) {
    const key = s.department || "Unassigned"
    if (!byDept[key]) byDept[key] = { department: key, count: 0, eloSum: 0, jobReadySum: 0, placed: 0 }
    byDept[key].count += 1
    byDept[key].eloSum += realEloById[s.student_user_id] ?? (Number(s.elo_current) || 0)
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

// ── Student outcomes (higher studies / entrepreneurship) — feeds the NAAC
// report below. Placement itself is NOT recorded here — institution_placements
// (TPO-confirmed) is the only source of truth for "placed", per the existing
// gate at POST /placements/:placementId/confirm. This only fills the two
// outcome types NAAC Criterion 5.2 needs that nothing else tracks. (2026-08-02)
const OUTCOME_TYPES = ["higher_studies", "entrepreneurship"]

router.post("/institutions/:id/outcomes", requireAuth, requireInstitutionAdmin(), async (req, res) => {
  const { id: institutionId } = req.params
  const { studentId, academicYear, outcomeType, details = {} } = req.body || {}
  if (!studentId) return res.status(400).json({ error: "studentId is required" })
  if (!academicYear || !/^\d{4}-\d{2,4}$/.test(academicYear)) return res.status(400).json({ error: "academicYear is required, format e.g. 2025-26" })
  if (!OUTCOME_TYPES.includes(outcomeType)) return res.status(400).json({ error: `outcomeType must be one of: ${OUTCOME_TYPES.join(", ")}` })

  // Ownership check — never trust studentId belongs to this institution.
  const { data: student } = await supabaseAdmin
    .from("institution_students")
    .select("id")
    .eq("id", studentId)
    .eq("institution_id", institutionId)
    .maybeSingle()
  if (!student) return res.status(404).json({ error: "Student not found in this institution" })

  const { data: outcome, error } = await supabaseAdmin
    .from("institution_student_outcomes")
    .upsert(
      { institution_id: institutionId, student_id: studentId, academic_year: academicYear, outcome_type: outcomeType, details, recorded_by: req.user.id },
      { onConflict: "student_id,academic_year,outcome_type" }
    )
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })

  await supabaseAdmin.from("activity_logs").insert({
    institution_id: institutionId, actor_id: req.user.id,
    action_code: "outcome.recorded", entity_type: "institution_student_outcomes", entity_id: outcome.id,
    details: { studentId, academicYear, outcomeType },
  }).catch(() => {})

  res.status(200).json({ outcome })
})

router.get("/institutions/:id/outcomes", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params
  let query = supabaseAdmin
    .from("institution_student_outcomes")
    .select("id, student_id, academic_year, outcome_type, details, created_at")
    .eq("institution_id", institutionId)
  if (req.query.academicYear) query = query.eq("academic_year", req.query.academicYear)
  const { data, error } = await query.order("created_at", { ascending: false }).limit(500)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ outcomes: data || [] })
})

router.delete("/institutions/:id/outcomes/:outcomeId", requireAuth, requireInstitutionAdmin(), async (req, res) => {
  const { id: institutionId, outcomeId } = req.params
  const { error } = await supabaseAdmin
    .from("institution_student_outcomes")
    .delete()
    .eq("id", outcomeId)
    .eq("institution_id", institutionId)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ ok: true })
})

// ── GET /institutions/:id/naac-report — real NAAC Criterion 5.2 style report ──
// Placement % + higher-studies % + entrepreneurship % + avg CTC, per
// department, per batch (and institution-wide totals). "Placed" is read from
// institution_placements where confirmation_status='tpo_confirmed' — the
// same authoritative gate every other placement stat in this file uses, not
// raw offer acceptance. Optional ?batch= scopes to one graduating cohort;
// omitted, the report groups every batch it finds separately so a TPO can
// pull a multi-year submission in one call.
router.get("/institutions/:id/naac-report", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params
  const { batch } = req.query

  let studentQuery = supabaseAdmin
    .from("institution_students")
    .select("id, department, batch, status")
    .eq("institution_id", institutionId)
    .in("status", ["active", "placed", "graduated"])
  if (batch) studentQuery = studentQuery.eq("batch", batch)
  const { data: students, error: studentErr } = await studentQuery
  if (studentErr) return res.status(500).json({ error: studentErr.message })
  if (!students || students.length === 0) return res.status(200).json({ batches: [] })

  const studentIds = students.map(s => s.id)
  const [{ data: placements }, { data: outcomes }] = await Promise.all([
    supabaseAdmin
      .from("institution_placements")
      .select("student_id, ctc_lpa, confirmation_status")
      .eq("institution_id", institutionId)
      .eq("confirmation_status", "tpo_confirmed")
      .in("student_id", studentIds),
    supabaseAdmin
      .from("institution_student_outcomes")
      .select("student_id, outcome_type")
      .eq("institution_id", institutionId)
      .in("student_id", studentIds),
  ])

  const placedByStudent = new Map((placements || []).map(p => [p.student_id, p.ctc_lpa]))
  const higherStudiesSet = new Set((outcomes || []).filter(o => o.outcome_type === "higher_studies").map(o => o.student_id))
  const entrepreneurshipSet = new Set((outcomes || []).filter(o => o.outcome_type === "entrepreneurship").map(o => o.student_id))

  // Group by batch, then department.
  const byBatch = {}
  for (const s of students) {
    const b = s.batch || "Unspecified batch"
    const d = s.department || "Unspecified department"
    byBatch[b] ??= {}
    byBatch[b][d] ??= { total: 0, placed: 0, higherStudies: 0, entrepreneurship: 0, ctcSum: 0, ctcCount: 0 }
    const row = byBatch[b][d]
    row.total++
    if (placedByStudent.has(s.id)) {
      row.placed++
      const ctc = placedByStudent.get(s.id)
      if (ctc != null) { row.ctcSum += Number(ctc); row.ctcCount++ }
    }
    if (higherStudiesSet.has(s.id)) row.higherStudies++
    if (entrepreneurshipSet.has(s.id)) row.entrepreneurship++
  }

  const pct = (n, total) => total > 0 ? Math.round((n / total) * 1000) / 10 : 0

  const batches = Object.entries(byBatch).map(([batchLabel, depts]) => {
    const departments = Object.entries(depts).map(([department, r]) => ({
      department, total: r.total,
      placed: r.placed, placedPct: pct(r.placed, r.total),
      higherStudies: r.higherStudies, higherStudiesPct: pct(r.higherStudies, r.total),
      entrepreneurship: r.entrepreneurship, entrepreneurshipPct: pct(r.entrepreneurship, r.total),
      avgCtcLpa: r.ctcCount > 0 ? Math.round((r.ctcSum / r.ctcCount) * 100) / 100 : null,
    }))
    const totals = departments.reduce((acc, d) => ({
      total: acc.total + d.total, placed: acc.placed + d.placed,
      higherStudies: acc.higherStudies + d.higherStudies, entrepreneurship: acc.entrepreneurship + d.entrepreneurship,
    }), { total: 0, placed: 0, higherStudies: 0, entrepreneurship: 0 })
    return {
      batch: batchLabel, departments,
      totals: {
        ...totals,
        placedPct: pct(totals.placed, totals.total),
        higherStudiesPct: pct(totals.higherStudies, totals.total),
        entrepreneurshipPct: pct(totals.entrepreneurship, totals.total),
      },
    }
  })

  res.status(200).json({ generatedAt: new Date().toISOString(), batches })
})

// ── GET /institutions/:id/placement-trend — year-over-year, calendar-year ────
// Distinct from the NAAC report above (which groups by graduating batch):
// this groups TPO-confirmed placements by the calendar year they were
// confirmed in, for a "placements over time" trend line — the multi-year
// growth story a TPO/Principal wants to see, not tied to any one cohort.
router.get("/institutions/:id/placement-trend", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params
  const { data: placements, error } = await supabaseAdmin
    .from("institution_placements")
    .select("confirmed_at, ctc_lpa")
    .eq("institution_id", institutionId)
    .eq("confirmation_status", "tpo_confirmed")
    .not("confirmed_at", "is", null)
  if (error) return res.status(500).json({ error: error.message })

  const byYear = {}
  for (const p of placements || []) {
    const year = new Date(p.confirmed_at).getFullYear()
    byYear[year] ??= { count: 0, ctcSum: 0, ctcCount: 0 }
    byYear[year].count++
    if (p.ctc_lpa != null) { byYear[year].ctcSum += Number(p.ctc_lpa); byYear[year].ctcCount++ }
  }

  const years = Object.entries(byYear)
    .map(([year, r]) => ({
      year: Number(year), placements: r.count,
      avgCtcLpa: r.ctcCount > 0 ? Math.round((r.ctcSum / r.ctcCount) * 100) / 100 : null,
    }))
    .sort((a, b) => a.year - b.year)

  res.status(200).json({ years })
})

// ── Groups (2026-08-02) — cohort-based and interest-based groups, replacing
// the "coming soon" placeholder. Members can belong to multiple groups
// (plain many-to-many via institution_group_members). Wired into task
// assignment below via org_tasks.assigned_to_group_id — a real, queryable
// target instead of a free-text label match.
const GROUP_TYPES = ["cohort", "club", "study_group", "custom"]

router.post("/institutions/:id/groups", requireAuth, requireInstitutionAdmin(), async (req, res) => {
  const { id: institutionId } = req.params
  const { name, groupType = "custom", description = "" } = req.body || {}
  if (!name || !name.trim()) return res.status(400).json({ error: "name is required" })
  if (!GROUP_TYPES.includes(groupType)) return res.status(400).json({ error: `groupType must be one of: ${GROUP_TYPES.join(", ")}` })

  const { data: group, error } = await supabaseAdmin
    .from("institution_groups")
    .insert({ institution_id: institutionId, name: name.trim(), group_type: groupType, description, created_by: req.user.id })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })

  await supabaseAdmin.from("activity_logs").insert({
    institution_id: institutionId, actor_id: req.user.id,
    action_code: "group.created", entity_type: "institution_groups", entity_id: group.id, details: { name: group.name },
  }).catch(() => {})

  res.status(201).json({ group })
})

router.get("/institutions/:id/groups", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId } = req.params
  const { data: groups, error } = await supabaseAdmin
    .from("institution_groups")
    .select("id, name, group_type, description, archived, created_at")
    .eq("institution_id", institutionId)
    .eq("archived", false)
    .order("created_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  if (!groups || groups.length === 0) return res.status(200).json({ groups: [] })

  // Member count + avg ELO per group — one batched query, not N+1.
  const groupIds = groups.map(g => g.id)
  const { data: memberRows } = await supabaseAdmin
    .from("institution_group_members")
    .select("group_id, student_id, institution_students(elo_current)")
    .in("group_id", groupIds)

  const statsByGroup = {}
  for (const m of memberRows || []) {
    statsByGroup[m.group_id] ??= { count: 0, eloSum: 0 }
    statsByGroup[m.group_id].count++
    statsByGroup[m.group_id].eloSum += Number(m.institution_students?.elo_current) || 0
  }

  res.status(200).json({
    groups: groups.map(g => ({
      ...g,
      memberCount: statsByGroup[g.id]?.count || 0,
      avgElo: statsByGroup[g.id]?.count ? Math.round(statsByGroup[g.id].eloSum / statsByGroup[g.id].count) : null,
    })),
  })
})

router.patch("/institutions/:id/groups/:groupId", requireAuth, requireInstitutionAdmin(), async (req, res) => {
  const { id: institutionId, groupId } = req.params
  const { name, description, archived } = req.body || {}
  const patch = {}
  if (name !== undefined) patch.name = name.trim()
  if (description !== undefined) patch.description = description
  if (archived !== undefined) patch.archived = !!archived
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Nothing to update" })

  const { data: group, error } = await supabaseAdmin
    .from("institution_groups")
    .update(patch)
    .eq("id", groupId)
    .eq("institution_id", institutionId)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ group })
})

router.delete("/institutions/:id/groups/:groupId", requireAuth, requireInstitutionAdmin(), async (req, res) => {
  const { id: institutionId, groupId } = req.params
  const { error } = await supabaseAdmin
    .from("institution_groups")
    .delete()
    .eq("id", groupId)
    .eq("institution_id", institutionId)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ ok: true })
})

router.get("/institutions/:id/groups/:groupId/members", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { id: institutionId, groupId } = req.params
  // Ownership check — group must belong to this institution before listing.
  const { data: group } = await supabaseAdmin.from("institution_groups").select("id").eq("id", groupId).eq("institution_id", institutionId).maybeSingle()
  if (!group) return res.status(404).json({ error: "Group not found" })

  const { data, error } = await supabaseAdmin
    .from("institution_group_members")
    .select("student_id, added_at, institution_students(id, roll_number, department, batch, elo_current, status)")
    .eq("group_id", groupId)
    .order("added_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ members: (data || []).map(m => ({ ...m.institution_students, addedAt: m.added_at })).filter(Boolean) })
})

router.post("/institutions/:id/groups/:groupId/members", requireAuth, requireInstitutionAdmin(), async (req, res) => {
  const { id: institutionId, groupId } = req.params
  const { studentIds = [] } = req.body || {}
  if (!Array.isArray(studentIds) || studentIds.length === 0) return res.status(400).json({ error: "studentIds must be a non-empty array" })

  const { data: group } = await supabaseAdmin.from("institution_groups").select("id").eq("id", groupId).eq("institution_id", institutionId).maybeSingle()
  if (!group) return res.status(404).json({ error: "Group not found" })

  // Only students that actually belong to this institution — never trust
  // client-supplied IDs blindly, same pattern as the outcomes route above.
  const { data: validStudents } = await supabaseAdmin
    .from("institution_students")
    .select("id")
    .eq("institution_id", institutionId)
    .in("id", studentIds)
  const validIds = (validStudents || []).map(s => s.id)
  if (validIds.length === 0) return res.status(400).json({ error: "None of the given studentIds belong to this institution" })

  const { error } = await supabaseAdmin
    .from("institution_group_members")
    .upsert(validIds.map(studentId => ({ group_id: groupId, student_id: studentId, added_by: req.user.id })), { onConflict: "group_id,student_id", ignoreDuplicates: true })
  if (error) return res.status(500).json({ error: error.message })

  res.status(200).json({ added: validIds.length })
})

router.delete("/institutions/:id/groups/:groupId/members/:studentId", requireAuth, requireInstitutionAdmin(), async (req, res) => {
  const { id: institutionId, groupId, studentId } = req.params
  const { data: group } = await supabaseAdmin.from("institution_groups").select("id").eq("id", groupId).eq("institution_id", institutionId).maybeSingle()
  if (!group) return res.status(404).json({ error: "Group not found" })

  const { error } = await supabaseAdmin
    .from("institution_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("student_id", studentId)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ ok: true })
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

// ─────────────────────────────────────────────────────────────────────────
// Coordination layer (2026-07-31): placement drives — the entity the
// design doc flagged as genuinely missing (jobs is company-wide, not
// campus-specific; company_connections is a standing relationship, not a
// time-boxed campaign). A drive optionally owns a linked chat channel
// (context_type='drive' in institution_chat_threads) via collegeChat.js —
// created here so the two stay in sync without collegeChat.js needing to
// know anything about placement_drives.
// ─────────────────────────────────────────────────────────────────────────

// ── POST /institutions/:id/drives — create a drive ────────────────────────
router.post("/institutions/:id/drives", requireAuth, requireInstitutionAdmin(), async (req, res) => {
  const institutionId = req.params.id
  const {
    title, recruiterId = null, jobId = null, eligibleBranches = [], minElo = null, createChannel = true,
    // Placement-day parity (2026-08-02) — optional proctoring config, set at
    // creation or later via PATCH.
    proctoringEnabled = false, assessmentUrl = null, assessmentInstructions = null, assessmentDurationMinutes = null,
  } = req.body || {}
  if (!title || !title.trim()) return res.status(400).json({ error: "title is required" })

  let threadId = null
  if (createChannel) {
    // Best-effort: a drive is still useful without its channel if this insert
    // fails for some reason (e.g. chat tables briefly unavailable) — never
    // block drive creation on chat infrastructure.
    try {
      const { data: thread } = await supabaseAdmin
        .from("institution_chat_threads")
        .insert({
          institution_id: institutionId, recruiter_id: recruiterId, subject: title.trim(),
          created_by: req.user.id, context_type: "drive",
        })
        .select("id").single()
      threadId = thread?.id || null
      if (threadId) {
        await supabaseAdmin.from("institution_chat_messages").insert({
          thread_id: threadId, sender_id: req.user.id,
          body: `Drive room created: ${title.trim()}`,
        })
      }
    } catch (err) {
      console.error("[college] drive channel create failed", err)
    }
  }

  const { data: drive, error } = await supabaseAdmin
    .from("placement_drives")
    .insert({
      institution_id: institutionId, recruiter_id: recruiterId, job_id: jobId, title: title.trim(),
      eligible_branches: eligibleBranches, min_elo: minElo, thread_id: threadId, created_by: req.user.id,
      proctoring_enabled: !!proctoringEnabled, assessment_url: assessmentUrl, assessment_instructions: assessmentInstructions,
      assessment_duration_minutes: assessmentDurationMinutes,
    })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })

  // Bind the channel's context_id back to the drive now that we have its id.
  if (threadId) {
    await supabaseAdmin.from("institution_chat_threads").update({ context_id: drive.id }).eq("id", threadId)
  }

  await notifyPlacementCell(institutionId, {
    type: "drive_created", title: "New placement drive", body: title.trim(),
    actorId: req.user.id, entityId: drive.id, entityType: "placement_drives",
  })

  res.status(200).json({ drive })
})

// ── GET /institutions/:id/drives — list drives for this institution ──────
// 2026-08-02: enriched with per-drive comparison stats (offersCount,
// avgCtcLpa, placedCount) — closes the "drive-vs-drive comparison" gap from
// the TapTap audit. Two batched queries (offers + confirmed placements),
// never N+1 per drive.
router.get("/institutions/:id/drives", requireAuth, requireInstitutionStaff(), async (req, res) => {
  let query = supabaseAdmin.from("placement_drives").select("*").eq("institution_id", req.params.id)
  if (req.query.status) query = query.eq("status", req.query.status)
  const { data, error } = await query.order("created_at", { ascending: false }).limit(100)
  if (error) return res.status(500).json({ error: error.message })
  const drives = data || []
  if (drives.length === 0) return res.status(200).json({ drives: [] })

  const driveIds = drives.map((d) => d.id)
  const { data: offerRows } = await supabaseAdmin
    .from("offers").select("id, drive_id, ctc_lpa, status")
    .in("drive_id", driveIds)

  // "Placed" for a drive means the same TPO-confirm gate every other
  // placement stat in the app uses — never raw offer acceptance.
  const offerIds = (offerRows || []).map((o) => o.id)
  let placedByOfferId = new Set()
  if (offerIds.length) {
    const { data: placementRows } = await supabaseAdmin
      .from("institution_placements").select("offer_id")
      .in("offer_id", offerIds).eq("confirmation_status", "tpo_confirmed")
    placedByOfferId = new Set((placementRows || []).map((p) => p.offer_id))
  }

  const statsByDrive = {}
  for (const o of offerRows || []) {
    statsByDrive[o.drive_id] ??= { offersCount: 0, ctcSum: 0, ctcCount: 0, placedCount: 0 }
    statsByDrive[o.drive_id].offersCount++
    if (o.ctc_lpa != null) { statsByDrive[o.drive_id].ctcSum += Number(o.ctc_lpa); statsByDrive[o.drive_id].ctcCount++ }
    if (placedByOfferId.has(o.id)) statsByDrive[o.drive_id].placedCount++
  }

  res.status(200).json({
    drives: drives.map((d) => {
      const s = statsByDrive[d.id]
      return {
        ...d,
        offersCount: s?.offersCount || 0,
        placedCount: s?.placedCount || 0,
        avgCtcLpa: s?.ctcCount ? Math.round((s.ctcSum / s.ctcCount) * 10) / 10 : null,
      }
    }),
  })
})

// ── PATCH /institutions/:id/drives/:driveId — update status/proctoring config ──
router.patch("/institutions/:id/drives/:driveId", requireAuth, requireInstitutionAdmin(), async (req, res) => {
  const { status, proctoringEnabled, assessmentUrl, assessmentInstructions, assessmentDurationMinutes } = req.body || {}
  const patch = {}
  if (status !== undefined) {
    if (!["planned", "active", "closed"].includes(status)) return res.status(400).json({ error: "Invalid status" })
    patch.status = status
  }
  if (proctoringEnabled !== undefined) patch.proctoring_enabled = !!proctoringEnabled
  if (assessmentUrl !== undefined) patch.assessment_url = assessmentUrl
  if (assessmentInstructions !== undefined) patch.assessment_instructions = assessmentInstructions
  if (assessmentDurationMinutes !== undefined) patch.assessment_duration_minutes = assessmentDurationMinutes
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Nothing to update" })

  const { data: drive, error } = await supabaseAdmin
    .from("placement_drives").update(patch)
    .eq("id", req.params.driveId).eq("institution_id", req.params.id)
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  if (!drive) return res.status(404).json({ error: "Drive not found" })
  res.status(200).json({ drive })
})

// ── Proctored/lockdown drive assessments (2026-08-02) ───────────────────────
// Honestly scoped as integrity monitoring — fullscreen-exit / tab-switch /
// copy-paste detection during a timed window — not live video invigilation
// (that needs a third-party service, not fabricated here). One row per
// student per drive (unique constraint), so re-entering an in-progress
// session resumes it rather than creating a duplicate.

// POST /institutions/:id/drives/:driveId/sessions — student starts a monitored attempt.
router.post("/institutions/:id/drives/:driveId/sessions", requireAuth, async (req, res) => {
  const { id: institutionId, driveId } = req.params
  const { data: drive } = await supabaseAdmin
    .from("placement_drives").select("id, proctoring_enabled").eq("id", driveId).eq("institution_id", institutionId).maybeSingle()
  if (!drive) return res.status(404).json({ error: "Drive not found" })
  if (!drive.proctoring_enabled) return res.status(400).json({ error: "This drive does not have a proctored assessment configured" })

  const { data: student } = await supabaseAdmin
    .from("institution_students").select("id").eq("institution_id", institutionId).eq("student_user_id", req.user.id).maybeSingle()
  if (!student) return res.status(403).json({ error: "You are not linked to this institution's roster" })

  const { data: session, error } = await supabaseAdmin
    .from("drive_assessment_sessions")
    .upsert(
      { drive_id: driveId, institution_id: institutionId, student_id: student.id, status: "in_progress" },
      { onConflict: "drive_id,student_id", ignoreDuplicates: false }
    )
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ session })
})

// POST /drive-sessions/:sessionId/violation — log one integrity event.
router.post("/drive-sessions/:sessionId/violation", requireAuth, async (req, res) => {
  const { type } = req.body || {}
  if (!type) return res.status(400).json({ error: "type is required" })

  const { data: session } = await supabaseAdmin
    .from("drive_assessment_sessions")
    .select("id, student_id, violations, violation_count, institution_students(student_user_id)")
    .eq("id", req.params.sessionId).maybeSingle()
  if (!session) return res.status(404).json({ error: "Session not found" })
  if (session.institution_students?.student_user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })

  const violations = [...(session.violations || []), { type, at: new Date().toISOString() }].slice(-200)
  const { data: updated, error } = await supabaseAdmin
    .from("drive_assessment_sessions")
    .update({ violations, violation_count: violations.length })
    .eq("id", session.id)
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ session: updated })
})

// POST /drive-sessions/:sessionId/end — student marks their attempt done.
router.post("/drive-sessions/:sessionId/end", requireAuth, async (req, res) => {
  const { status = "completed" } = req.body || {}
  if (!["completed", "abandoned"].includes(status)) return res.status(400).json({ error: "Invalid status" })

  const { data: session } = await supabaseAdmin
    .from("drive_assessment_sessions")
    .select("id, institution_students(student_user_id)")
    .eq("id", req.params.sessionId).maybeSingle()
  if (!session) return res.status(404).json({ error: "Session not found" })
  if (session.institution_students?.student_user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })

  const { data: updated, error } = await supabaseAdmin
    .from("drive_assessment_sessions")
    .update({ status, ended_at: new Date().toISOString() })
    .eq("id", session.id)
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ session: updated })
})

// GET /institutions/:id/drives/:driveId/sessions — placement cell integrity view.
router.get("/institutions/:id/drives/:driveId/sessions", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("drive_assessment_sessions")
    .select("id, status, violation_count, violations, started_at, ended_at, institution_students(id, roll_number, department, batch)")
    .eq("drive_id", req.params.driveId).eq("institution_id", req.params.id)
    .order("violation_count", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ sessions: data || [] })
})

// ── GET /institutions/:id/drives/:driveId/eligible-students ──────────────
// Same matching shape as /recruiter/search's non-authoritative sort signal,
// applied here as an eligibility count/list for the placement cell's own
// planning view (internal — does not require shared_with_recruiters, since
// this is the college looking at its own roster, not a recruiter query).
router.get("/institutions/:id/drives/:driveId/eligible-students", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { data: drive } = await supabaseAdmin
    .from("placement_drives").select("*").eq("id", req.params.driveId).eq("institution_id", req.params.id).maybeSingle()
  if (!drive) return res.status(404).json({ error: "Drive not found" })

  let query = supabaseAdmin
    .from("institution_students")
    .select("id, department, batch, roll_number, elo_current, job_readiness_score, status")
    .eq("institution_id", req.params.id)
    .in("status", ACTIVE_STATUSES)
  if (Array.isArray(drive.eligible_branches) && drive.eligible_branches.length > 0) {
    query = query.in("department", drive.eligible_branches)
  }
  if (drive.min_elo !== null) query = query.gte("elo_current", drive.min_elo)

  const { data, error } = await query.order("elo_current", { ascending: false }).limit(500)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ drive, students: data || [], count: (data || []).length })
})

// ── University Groups (multi-campus support) ──────────────────────────────
// Added 2026-08-02. Design note: institutions.id keeps meaning exactly what
// it always has everywhere else in the codebase (institution_students,
// institution_groups, placement_drives, offers, institution_staff,
// institution_chat_threads, institution_student_outcomes,
// drive_assessment_sessions, institution_placements all key off it
// unchanged). A university_groups row just clusters several existing
// `institutions` rows ("campuses") under one university-level admin.
// Per-campus dashboard access for that admin is granted via the SAME,
// already-tested institution_staff mechanism every other admin uses — no
// route above this section needed to change, and no new RLS bypass was
// introduced (see is_university_group_admin() + get_advisors clean run,
// 2026-08-02).
//
// Only the group's own admin_user_id can ever read/write it (RLS: three
// policies scoped to admin_user_id = auth.uid()) — this is intentionally a
// single-owner model, not a shared-team model, matching how institutions.
// admin_user_id already works for a single campus today.

router.post("/university-groups", requireAuth, async (req, res) => {
  const userId = req.user.id
  const name = (req.body?.name || "").trim()
  if (!name) return res.status(400).json({ error: "name is required" })

  // Idempotent: a user managing one university group is the practical model;
  // if they already have one, hand it back rather than creating a duplicate.
  const { data: existing } = await supabaseAdmin
    .from("university_groups")
    .select("id, name, created_at")
    .eq("admin_user_id", userId)
    .maybeSingle()
  if (existing) return res.status(200).json({ group: existing, alreadyExisted: true })

  const { data: group, error } = await supabaseAdmin
    .from("university_groups")
    .insert({ name, admin_user_id: userId })
    .select("id, name, created_at")
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ group, alreadyExisted: false })
})

router.get("/university-groups/mine", requireAuth, async (req, res) => {
  const userId = req.user.id
  const { data: group, error } = await supabaseAdmin
    .from("university_groups")
    .select("id, name, created_at")
    .eq("admin_user_id", userId)
    .maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  if (!group) return res.status(200).json({ group: null, campuses: [] })

  const { data: campuses, error: campusErr } = await supabaseAdmin
    .from("institutions")
    .select("id, name, slug, type, verification_level, status, created_at")
    .eq("university_group_id", group.id)
    .order("created_at", { ascending: true })
  if (campusErr) return res.status(500).json({ error: campusErr.message })

  res.status(200).json({ group, campuses: campuses || [] })
})

// Verifies the caller owns the given university group; used by all three
// campus-management routes below instead of a route-level middleware since
// the group id isn't an :id-style institution param the existing
// require* helpers understand.
async function requireGroupOwner(groupId, userId) {
  const { data } = await supabaseAdmin
    .from("university_groups")
    .select("id")
    .eq("id", groupId)
    .eq("admin_user_id", userId)
    .maybeSingle()
  return !!data
}

router.post("/university-groups/:groupId/campuses", requireAuth, async (req, res) => {
  const { groupId } = req.params
  const userId = req.user.id
  if (!UUID_RE.test(groupId)) return res.status(400).json({ error: "Invalid group id" })
  if (!(await requireGroupOwner(groupId, userId))) {
    return res.status(403).json({ error: "Not the admin of this university group" })
  }

  const { institutionId, name, type } = req.body || {}

  // Path A: attach an institution the caller already administers.
  if (institutionId) {
    if (!UUID_RE.test(institutionId)) return res.status(400).json({ error: "Invalid institutionId" })
    const role = await getStaffRole(institutionId, userId)
    if (!role || !["college_admin", "placement_officer"].includes(role)) {
      return res.status(403).json({ error: "You must already be an admin of this campus to attach it" })
    }
    const { data: updated, error } = await supabaseAdmin
      .from("institutions")
      .update({ university_group_id: groupId })
      .eq("id", institutionId)
      .select("id, name, slug, type, verification_level, status, created_at")
      .single()
    if (error) return res.status(500).json({ error: error.message })

    // Belt-and-suspenders: make sure the university admin also has an
    // explicit institution_staff row on this campus, so every existing
    // requireInstitutionStaff/requireInstitutionAdmin route keeps working
    // unmodified even if ownership of the campus later changes hands.
    await supabaseAdmin
      .from("institution_staff")
      .upsert(
        { institution_id: institutionId, user_id: userId, role: "college_admin", status: "active", scope: "all_departments" },
        { onConflict: "institution_id,user_id,role", ignoreDuplicates: true }
      )

    return res.status(200).json({ campus: updated, created: false })
  }

  // Path B: create a brand-new campus institution and attach it in one step.
  if (name && name.trim()) {
    const campusType = /university/i.test(type || "") ? "university" : "college"
    const baseSlug = slugifyInstitutionName(name)
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
      const { data: inserted, error } = await supabaseAdmin
        .from("institutions")
        .insert({ name: name.trim(), slug, type: campusType, admin_user_id: userId, university_group_id: groupId })
        .select("id, name, slug, type, verification_level, status, created_at")
        .single()
      if (!error) return res.status(201).json({ campus: inserted, created: true })
      if (error.code !== "23505") return res.status(500).json({ error: error.message })
    }
    return res.status(500).json({ error: "Could not allocate a unique campus slug, try a different name" })
  }

  res.status(400).json({ error: "Provide either institutionId (attach existing) or name (create new campus)" })
})

// Detach is non-destructive: the campus institution and all its data
// (students, drives, offers, placements...) are untouched, it just stops
// being grouped under this university admin's rollup view.
router.delete("/university-groups/:groupId/campuses/:institutionId", requireAuth, async (req, res) => {
  const { groupId, institutionId } = req.params
  const userId = req.user.id
  if (!(await requireGroupOwner(groupId, userId))) {
    return res.status(403).json({ error: "Not the admin of this university group" })
  }
  const { data: campus } = await supabaseAdmin
    .from("institutions")
    .select("id, university_group_id")
    .eq("id", institutionId)
    .maybeSingle()
  if (!campus || campus.university_group_id !== groupId) {
    return res.status(404).json({ error: "Campus is not part of this university group" })
  }
  const { error } = await supabaseAdmin
    .from("institutions")
    .update({ university_group_id: null })
    .eq("id", institutionId)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ detached: true })
})

// GET /university-groups/:groupId/overview — cross-campus rollup, batched
// (one query per stat across all campus ids, not N+1 per campus).
router.get("/university-groups/:groupId/overview", requireAuth, async (req, res) => {
  const { groupId } = req.params
  const userId = req.user.id
  if (!(await requireGroupOwner(groupId, userId))) {
    return res.status(403).json({ error: "Not the admin of this university group" })
  }

  const { data: campuses, error: campusErr } = await supabaseAdmin
    .from("institutions")
    .select("id, name, slug, type, verification_level, status")
    .eq("university_group_id", groupId)
  if (campusErr) return res.status(500).json({ error: campusErr.message })
  if (!campuses || campuses.length === 0) {
    return res.status(200).json({ campuses: [], totals: { students: 0, placed: 0, avgElo: 0 } })
  }
  const institutionIds = campuses.map((c) => c.id)

  const { data: students, error: studErr } = await supabaseAdmin
    .from("institution_students")
    .select("id, institution_id, elo_current")
    .in("institution_id", institutionIds)
    .in("status", ACTIVE_STATUSES)
  if (studErr) return res.status(500).json({ error: studErr.message })

  const { data: placements, error: placeErr } = await supabaseAdmin
    .from("institution_placements")
    .select("id, institution_id")
    .in("institution_id", institutionIds)
    .eq("confirmation_status", "tpo_confirmed")
  if (placeErr) return res.status(500).json({ error: placeErr.message })

  const byInstitution = Object.fromEntries(institutionIds.map((id) => [id, { students: 0, eloSum: 0, placed: 0 }]))
  for (const s of students || []) {
    const bucket = byInstitution[s.institution_id]
    if (!bucket) continue
    bucket.students += 1
    bucket.eloSum += s.elo_current || 0
  }
  for (const p of placements || []) {
    const bucket = byInstitution[p.institution_id]
    if (bucket) bucket.placed += 1
  }

  const perCampus = campuses.map((c) => {
    const b = byInstitution[c.id]
    return {
      ...c,
      students: b.students,
      placed: b.placed,
      avgElo: b.students > 0 ? Math.round(b.eloSum / b.students) : 0,
    }
  })

  const totalStudents = perCampus.reduce((sum, c) => sum + c.students, 0)
  const totalPlaced = perCampus.reduce((sum, c) => sum + c.placed, 0)
  const totalEloSum = perCampus.reduce((sum, c) => sum + c.avgElo * c.students, 0)

  res.status(200).json({
    campuses: perCampus,
    totals: {
      students: totalStudents,
      placed: totalPlaced,
      avgElo: totalStudents > 0 ? Math.round(totalEloSum / totalStudents) : 0,
    },
  })
})

// ── Jobs (2026-08-03) — colleges posting jobs into the shared `jobs` table ──
// Same table Launchpad already reads for the student job feed (see
// backend/server/routes/recruiterComms.js's GET /jobs/list) — a college
// posting here needs zero new student-facing feed work, it just appears
// there automatically via institution_id being set. Explicit field
// allowlist (never raw req.body), matching the same JOB_WRITABLE_FIELDS
// shape recruiterComms.js uses for the company side, kept as an independent
// local copy since institution_id must NEVER be settable by the generic
// company route — only derived here from the verified :id param.
const COLLEGE_JOB_WRITABLE_FIELDS = [
  "title", "company", "company_logo", "company_desc", "jd_full", "jd_summary", "jd_text",
  "required_skills", "essential_skills", "good_to_have", "technologies",
  "location", "job_type", "work_mode", "salary_min", "salary_max",
  "salary_currency", "experience_min", "experience_max", "domain", "skills", "min_elo",
]
function pickCollegeJobFields(body) {
  const out = {}
  for (const k of COLLEGE_JOB_WRITABLE_FIELDS) if (body?.[k] !== undefined) out[k] = body[k]
  return out
}

router.post("/institutions/:id/jobs", requireAuth, requireCollegeAdminOnly(), async (req, res) => {
  if (!req.body?.title?.trim()) return res.status(400).json({ error: "title is required" })
  const { data: institution } = await supabaseAdmin.from("institutions").select("name").eq("id", req.params.id).maybeSingle()
  const { data, error } = await supabaseAdmin.from("jobs").insert({
    ...pickCollegeJobFields(req.body),
    company: req.body.company?.trim() || institution?.name || "",
    institution_id: req.params.id,
    posted_by_user_id: req.user.id,
    // See recruiterComms.js's POST /jobs for why both booleans are set —
    // pre-existing schema duplication (active vs is_active), not introduced here.
    active: true, is_active: true,
    is_verified: false,
    posted_at: new Date().toISOString(),
  }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ job: data })
})

router.get("/institutions/:id/jobs", requireAuth, requireInstitutionStaff(), async (req, res) => {
  const { data, error } = await supabaseAdmin.from("jobs")
    .select("*")
    .eq("institution_id", req.params.id)
    .order("created_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ jobs: data || [] })
})

router.patch("/institutions/:id/jobs/:jobId", requireAuth, requireCollegeAdminOnly(), async (req, res) => {
  const { data: existing } = await supabaseAdmin.from("jobs").select("institution_id").eq("id", req.params.jobId).maybeSingle()
  if (!existing || existing.institution_id !== req.params.id) {
    return res.status(404).json({ error: "Job not found for this institution" })
  }
  const updates = pickCollegeJobFields(req.body)
  if (typeof req.body?.isActive === "boolean") { updates.active = req.body.isActive; updates.is_active = req.body.isActive }
  const { data, error } = await supabaseAdmin.from("jobs").update(updates).eq("id", req.params.jobId).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ job: data })
})

export default router
