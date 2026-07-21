/**
 * tools/college.ts — College / Institution Admin domain (5 tools)
 *
 * Tools:
 *   college.getDepartmentLeaderboard — real (backend/server/routes/college.js)
 *   college.getStudentRoster         — real
 *   college.getCollegeStats          — real
 *   college.getBranchBreakdown       — real
 *   college.exportReport             — real for reportType='full_roster';
 *                                       other report types honestly declared
 *                                       NOT_IMPLEMENTED rather than silently
 *                                       returning the wrong data.
 *
 * IMPLEMENTED 2026-07-22: backend/server/routes/college.js now exists
 * (mounted at /api/college in backend/server.js) backed by the canonical
 * College Path schema (college_path_foundation_migration.sql — institutions,
 * institution_staff, institution_students, elo_events, activity_logs, etc.).
 * Closes the gap this file previously documented ("no institution-admin
 * analytics backend of any kind exists").
 *
 * `collegeCode` (this tool's public contract) maps to institutions.slug —
 * the backend's `router.param("id", ...)` accepts either the UUID or the
 * slug, so no schema change was needed here to wire this up.
 *
 * Security: all tools require institution_admin role (or admin) —
 * assertCollegeAdmin. The backend independently re-checks institution_staff
 * membership (see requireInstitutionStaff/requireInstitutionAdmin in
 * college.js) — this tool's permission check does not replace that, it's
 * the first of two independent layers.
 * Never returns individual private student data (email, phone, DOB) — the
 * backend enforces this via an explicit column allowlist, not a blocklist.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { verifyJWT, extractBearer, type CapabilioUser } from "../shared/auth.js"
import { assertPermission, canViewCollegeAnalytics } from "../shared/permissions.js"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import {
  parse, AuthSchema, PaginationSchema, CollegeCodeSchema,
  DateRangeShape, dateRangeRefinement, DATE_RANGE_REFINEMENT_MESSAGE,
} from "../shared/validation.js"
import { api } from "../shared/client.js"
import { createLogger, startTimer } from "../shared/logger.js"

function assertCollegeAdmin(user: CapabilioUser): void {
  if (!canViewCollegeAnalytics(user)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Only institution admins and platform admins may access college analytics"
    )
  }
}

export function registerCollegeTools(server: McpServer): void {

  // ── college.getDepartmentLeaderboard ───────────────────────────────────────
  server.tool(
    "college.getDepartmentLeaderboard",
    "Get the ELO leaderboard for a department/branch within a college. Useful for placement cell views and counselling sessions.",
    {
      authorization: z.string().describe("Bearer JWT"),
      collegeCode:   CollegeCodeSchema.describe("College identifier (institutions.slug, e.g. 'vitu' or 'bits-hyd')"),
      branch:        z.string().optional().describe("Branch filter, e.g. 'CSE', 'ECE', 'MECH'"),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(100).default(50).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema).extend({
        collegeCode: CollegeCodeSchema,
        branch:      z.string().optional(),
      })
      const { authorization, collegeCode, branch, page, pageSize } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("college.getDepartmentLeaderboard", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "college")
      assertCollegeAdmin(user)

      try {
        const data = await api.get(
          authorization,
          `/api/college/institutions/${encodeURIComponent(collegeCode)}/leaderboard`,
          { branch, page, pageSize }
        )
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        log.failure(t, "API_ERROR", msg, { collegeCode, branch })
        throw e
      }
    }
  )

  // ── college.getStudentRoster ───────────────────────────────────────────────
  server.tool(
    "college.getStudentRoster",
    "Get a paginated roster of students enrolled in a college. Returns institution-scoped summaries (department, batch, roll number, ELO, job-readiness, status). No private PII (no email/phone/DOB — enforced server-side by an explicit column allowlist).",
    {
      authorization: z.string().describe("Bearer JWT"),
      collegeCode:   CollegeCodeSchema,
      branch:        z.string().optional(),
      search:        z.string().max(200).optional().describe("Search by roll number (name search requires a profile join — not yet supported)"),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(100).default(50).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema).extend({
        collegeCode: CollegeCodeSchema,
        branch:      z.string().optional(),
        search:      z.string().max(200).optional(),
      })
      const { authorization, collegeCode, branch, search, page, pageSize } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("college.getStudentRoster", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "college")
      assertCollegeAdmin(user)

      try {
        const data = await api.get(
          authorization,
          `/api/college/institutions/${encodeURIComponent(collegeCode)}/students`,
          { department: branch, search, page, pageSize }
        )
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        log.failure(t, "API_ERROR", msg, { collegeCode, branch })
        throw e
      }
    }
  )

  // ── college.getCollegeStats ────────────────────────────────────────────────
  server.tool(
    "college.getCollegeStats",
    "Get college-level engagement and performance statistics: total students, average ELO, average job readiness, status breakdown, confirmed placement rate.",
    {
      authorization: z.string().describe("Bearer JWT"),
      collegeCode:   CollegeCodeSchema,
      from:          z.string().datetime({ offset: true }).optional().describe("Not yet used server-side — stats are current-state, not historical range (tracked follow-up)"),
      to:            z.string().datetime({ offset: true }).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(DateRangeShape).extend({
        collegeCode: CollegeCodeSchema,
      }).refine(dateRangeRefinement, {
        message: DATE_RANGE_REFINEMENT_MESSAGE,
      })
      const { authorization, collegeCode } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("college.getCollegeStats", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "college")
      assertCollegeAdmin(user)

      try {
        const data = await api.get(
          authorization,
          `/api/college/institutions/${encodeURIComponent(collegeCode)}/stats`
        )
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        log.failure(t, "API_ERROR", msg, { collegeCode })
        throw e
      }
    }
  )

  // ── college.getBranchBreakdown ─────────────────────────────────────────────
  server.tool(
    "college.getBranchBreakdown",
    "Get per-branch/department performance breakdown for a college — student count, average ELO, average job-readiness, placed % per department.",
    {
      authorization: z.string().describe("Bearer JWT"),
      collegeCode:   CollegeCodeSchema,
    },
    async (args) => {
      const Schema = AuthSchema.extend({ collegeCode: CollegeCodeSchema })
      const { authorization, collegeCode } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("college.getBranchBreakdown", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "college")
      assertCollegeAdmin(user)

      try {
        const data = await api.get(
          authorization,
          `/api/college/institutions/${encodeURIComponent(collegeCode)}/branches`
        )
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        log.failure(t, "API_ERROR", msg, { collegeCode })
        throw e
      }
    }
  )

  // ── college.exportReport ───────────────────────────────────────────────────
  server.tool(
    "college.exportReport",
    "Export a college analytics report. Only reportType='full_roster' is implemented today (CSV or JSON, PII-excluded). Other report types (placement_readiness, elo_distribution, skill_gap, branch_summary) throw a clear NOT_IMPLEMENTED error instead of returning incorrect data — tracked as follow-up work, same honesty-first pattern used elsewhere in this codebase (e.g. verification.js's provider registry).",
    {
      authorization: z.string().describe("Bearer JWT"),
      collegeCode:   CollegeCodeSchema,
      reportType:    z.enum([
        "placement_readiness", "elo_distribution", "skill_gap",
        "full_roster", "branch_summary",
      ]),
      format:        z.enum(["csv", "pdf"]).default("csv"),
      from:          z.string().datetime({ offset: true }).optional(),
      to:            z.string().datetime({ offset: true }).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(DateRangeShape).extend({
        collegeCode: CollegeCodeSchema,
        reportType:  z.enum([
          "placement_readiness", "elo_distribution", "skill_gap",
          "full_roster", "branch_summary",
        ]),
        format: z.enum(["csv", "pdf"]).default("csv"),
      }).refine(dateRangeRefinement, {
        message: DATE_RANGE_REFINEMENT_MESSAGE,
      })
      const { authorization, collegeCode, reportType, format } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("college.exportReport", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "college")
      assertCollegeAdmin(user)

      if (reportType !== "full_roster") {
        log.failure(t, "NOT_IMPLEMENTED", `reportType '${reportType}' has no backend implementation yet`, { collegeCode })
        throw new McpError(
          ErrorCode.MethodNotFound,
          `college.exportReport(reportType='${reportType}') has no backend implementation yet. Only 'full_roster' is implemented. Tracked as follow-up work.`
        )
      }
      if (format === "pdf") {
        log.failure(t, "NOT_IMPLEMENTED", "PDF export not implemented — CSV/JSON only", { collegeCode })
        throw new McpError(
          ErrorCode.MethodNotFound,
          "college.exportReport(format='pdf') has no backend implementation yet. Use format='csv'. Tracked as follow-up work."
        )
      }

      try {
        // shared/client.ts's call() always does res.json() — it cannot parse
        // the backend's text/csv response, so this always requests the JSON
        // form regardless of the caller's `format` arg. CSV download is
        // available directly from the backend (?format=csv) for the admin
        // web UI, which fetches it outside the MCP relay.
        const data = await api.get(
          authorization,
          `/api/college/institutions/${encodeURIComponent(collegeCode)}/export`
        )
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        log.failure(t, "API_ERROR", msg, { collegeCode, reportType, format })
        throw e
      }
    }
  )
}
