/**
 * tools/college.ts — College / Institution Admin domain (5 tools, all not yet implemented)
 *
 * Tools:
 *   college.getDepartmentLeaderboard — NOT_IMPLEMENTED
 *   college.getStudentRoster         — NOT_IMPLEMENTED
 *   college.getCollegeStats          — NOT_IMPLEMENTED
 *   college.getBranchBreakdown       — NOT_IMPLEMENTED
 *   college.exportReport             — NOT_IMPLEMENTED
 *
 * BACKEND WIRING NOTE (2026-07-14 fix): there is no /api/college/* route
 * prefix, and no institution-admin analytics backend of any kind exists —
 * this isn't a path/verb mismatch, it's a whole missing domain (would need
 * new Supabase queries scoped by institution/college, new RLS policies, and
 * genuinely new aggregation logic). All 5 tools below fail fast with a clear
 * NOT_IMPLEMENTED error instead of calling nonexistent paths. Scoped as
 * separate, dedicated follow-up work — building this safely requires its own
 * schema/RLS design pass, not an inline fix alongside wiring corrections.
 *
 * Security: all tools require institution_admin role (or admin).
 * Never returns individual private student data (email, phone, DOB).
 * Aggregate analytics only except getStudentRoster which is institution-scoped.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { verifyJWT, extractBearer, type CapabilioUser } from "../shared/auth.js"
import { assertPermission, canViewCollegeAnalytics } from "../shared/permissions.js"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import {
  parse, AuthSchema, PaginationSchema, CollegeCodeSchema,
  AnalyticsGranularitySchema, DateRangeShape, dateRangeRefinement, DATE_RANGE_REFINEMENT_MESSAGE,
} from "../shared/validation.js"
import { createLogger, startTimer } from "../shared/logger.js"

// Fixed 2026-07-14: was a narrowed { id, role } fake of CapabilioUser, which
// broke `tsc`/`npm run build` at every call site. Widened to the real shared
// type — no behavior change, purely a type-annotation fix.
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
      collegeCode:   CollegeCodeSchema.describe("College identifier (e.g. 'VITU', 'BITS_HYD')"),
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

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for department leaderboards", { collegeCode, branch })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "college.getDepartmentLeaderboard has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )

  // ── college.getStudentRoster ───────────────────────────────────────────────
  server.tool(
    "college.getStudentRoster",
    "Get a paginated roster of students enrolled in a college. Returns public profile summaries (name, stream, ELO, top skills). No private PII.",
    {
      authorization: z.string().describe("Bearer JWT"),
      collegeCode:   CollegeCodeSchema,
      branch:        z.string().optional(),
      search:        z.string().max(200).optional().describe("Search by name or skill"),
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

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for the student roster", { collegeCode, branch })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "college.getStudentRoster has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )

  // ── college.getCollegeStats ────────────────────────────────────────────────
  server.tool(
    "college.getCollegeStats",
    "Get college-level engagement and performance statistics: active students, average ELO, Arena completion rate, interview readiness score.",
    {
      authorization: z.string().describe("Bearer JWT"),
      collegeCode:   CollegeCodeSchema,
      from:          z.string().datetime({ offset: true }).optional(),
      to:            z.string().datetime({ offset: true }).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(DateRangeShape).extend({
        collegeCode: CollegeCodeSchema,
      }).refine(dateRangeRefinement, {
        message: DATE_RANGE_REFINEMENT_MESSAGE,
      })
      const { authorization, collegeCode, from, to } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("college.getCollegeStats", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "college")
      assertCollegeAdmin(user)

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for college stats", { collegeCode })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "college.getCollegeStats has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )

  // ── college.getBranchBreakdown ─────────────────────────────────────────────
  server.tool(
    "college.getBranchBreakdown",
    "Get per-branch/stream performance breakdown for a college — average ELO, top skills, skill gaps, placement readiness scores per branch.",
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

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for branch breakdown", { collegeCode })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "college.getBranchBreakdown has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )

  // ── college.exportReport ───────────────────────────────────────────────────
  server.tool(
    "college.exportReport",
    "Trigger an async export of a college analytics report (CSV or PDF). Returns a jobId — poll for status via the backend export API.",
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
      const { authorization, collegeCode, reportType, format, from, to } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("college.exportReport", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "college")
      assertCollegeAdmin(user)

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for report export", { collegeCode, reportType, format })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "college.exportReport has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )
}
