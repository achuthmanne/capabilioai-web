/**
 * tools/analytics.ts — Platform Analytics domain (5 tools, all not yet implemented)
 *
 * Tools:
 *   analytics.getPlatformOverview   — NOT_IMPLEMENTED
 *   analytics.getEngagementTrend    — NOT_IMPLEMENTED
 *   analytics.getSkillGapReport     — NOT_IMPLEMENTED (closest partial: POST /api/skill-gap, single-domain AI report, different verb/shape)
 *   analytics.getCollegeComparison  — NOT_IMPLEMENTED
 *   analytics.getStreamHealth       — NOT_IMPLEMENTED
 *
 * BACKEND WIRING NOTE (2026-07-14 fix): there is no /api/analytics/* route
 * prefix and no platform-analytics backend of any kind — same situation as
 * college.ts, a missing domain rather than a path/verb mismatch. All 5 tools
 * fail fast with a clear NOT_IMPLEMENTED error. Scoped as separate, dedicated
 * follow-up work requiring its own aggregation-query design pass.
 *
 * Security: ALL tools here require admin role.
 * institution_admin gets college-scoped analytics via the college.* tools instead.
 * These tools return aggregate data — no individual student PII is ever returned.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { verifyJWT, extractBearer, type CapabilioUser } from "../shared/auth.js"
import { assertPermission, isAdmin } from "../shared/permissions.js"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import {
  parse, AuthSchema, DateRangeShape, dateRangeRefinement, DATE_RANGE_REFINEMENT_MESSAGE,
  AnalyticsGranularitySchema,
} from "../shared/validation.js"
import { api } from "../shared/client.js"
import { createLogger, startTimer } from "../shared/logger.js"

// Fixed 2026-07-14: was a narrowed { id, role } fake of CapabilioUser, which
// broke `tsc`/`npm run build` at every call site. Widened to the real shared
// type — no behavior change, purely a type-annotation fix.
function assertAdmin(user: CapabilioUser): void {
  if (!isAdmin(user)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Only platform admins may access platform-wide analytics"
    )
  }
}

export function registerAnalyticsTools(server: McpServer): void {

  // ── analytics.getPlatformOverview ──────────────────────────────────────────
  server.tool(
    "analytics.getPlatformOverview",
    "Get platform-wide KPIs: total students, active colleges, average ELO, Arena completion rate, AI interview sessions. Admin only.",
    {
      authorization: z.string().describe("Bearer JWT"),
      from:          z.string().datetime({ offset: true }).optional(),
      to:            z.string().datetime({ offset: true }).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(DateRangeShape).refine(dateRangeRefinement, {
        message: DATE_RANGE_REFINEMENT_MESSAGE,
      })
      const { authorization, from, to } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("analytics.getPlatformOverview", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "analytics")
      assertAdmin(user)

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for platform overview KPIs", { from, to })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "analytics.getPlatformOverview has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )

  // ── analytics.getEngagementTrend ───────────────────────────────────────────
  server.tool(
    "analytics.getEngagementTrend",
    "Get DAU/WAU/MAU engagement trend data over a date range, with configurable granularity. Admin only.",
    {
      authorization: z.string().describe("Bearer JWT"),
      granularity:   AnalyticsGranularitySchema.default("day").optional(),
      from:          z.string().datetime({ offset: true }).optional(),
      to:            z.string().datetime({ offset: true }).optional(),
      stream:        z.string().optional().describe("Filter by stream, e.g. 'IT', 'ECE'"),
    },
    async (args) => {
      const Schema = AuthSchema.merge(DateRangeShape).extend({
        granularity: AnalyticsGranularitySchema.default("day").optional(),
        stream:      z.string().optional(),
      }).refine(dateRangeRefinement, {
        message: DATE_RANGE_REFINEMENT_MESSAGE,
      })
      const { authorization, granularity, from, to, stream } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("analytics.getEngagementTrend", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "analytics")
      assertAdmin(user)

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for engagement trends", { granularity, stream })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "analytics.getEngagementTrend has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )

  // ── analytics.getSkillGapReport ────────────────────────────────────────────
  server.tool(
    "analytics.getSkillGapReport",
    "Get a skill gap report. NOTE: there is no cross-stream/cross-college aggregation backend — a `stream` value is REQUIRED, and this calls the single-domain AI skill-gap generator (POST /api/skill-gap) for that one stream. Omitting `stream` fails fast rather than returning a fabricated aggregate. `topN` is accepted for forward-compat but not honored server-side.",
    {
      authorization: z.string().describe("Bearer JWT"),
      stream:        z.string().optional().describe("Required today — the backend only supports single-domain reports"),
      topN:          z.number().int().min(5).max(50).default(20).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        stream: z.string().optional(),
        topN:   z.number().int().min(5).max(50).default(20).optional(),
      })
      const { authorization, stream, topN } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("analytics.getSkillGapReport", user.id, user.role)
      const t    = startTimer()
      // institution_admin may view skill gap (scoped by backend); admin sees all
      assertPermission(user, "analytics")

      if (!stream) {
        log.failure(t, "NOT_IMPLEMENTED", "No aggregate skill-gap backend exists — stream is required for the single-domain fallback")
        throw new McpError(
          ErrorCode.InvalidParams,
          "analytics.getSkillGapReport requires `stream` — there is no cross-stream aggregation backend. Pass a single stream/domain to use the AI skill-gap generator instead."
        )
      }

      try {
        // Real route: POST /api/skill-gap (skillGap.js), body {domain,...} —
        // not GET /api/analytics/skill-gap. Single-domain only; topN unused.
        const data = await api.post(authorization, `/api/skill-gap`, { domain: stream })
        log.success(t, { stream })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── analytics.getCollegeComparison ─────────────────────────────────────────
  server.tool(
    "analytics.getCollegeComparison",
    "Compare colleges side-by-side on average ELO, placement readiness, Arena activity, and skill coverage. Admin only.",
    {
      authorization: z.string().describe("Bearer JWT"),
      collegeCodes:  z.array(z.string().min(1)).min(2).max(10).optional()
        .describe("Specific colleges to compare. Omit to compare all enrolled colleges."),
      sortBy:        z.enum(["avg_elo", "readiness", "arena_activity", "skill_coverage"])
        .default("avg_elo").optional(),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        collegeCodes: z.array(z.string().min(1)).min(2).max(10).optional(),
        sortBy: z.enum(["avg_elo", "readiness", "arena_activity", "skill_coverage"])
          .default("avg_elo").optional(),
      })
      const { authorization, collegeCodes, sortBy } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("analytics.getCollegeComparison", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "analytics")
      assertAdmin(user)

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for cross-college comparison")
      throw new McpError(
        ErrorCode.MethodNotFound,
        "analytics.getCollegeComparison has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )

  // ── analytics.getStreamHealth ──────────────────────────────────────────────
  server.tool(
    "analytics.getStreamHealth",
    "Get health metrics for each stream (IT, ECE, EEE, Mechanical, Civil, IoT, Pharmacy, MBA, Medical): student count, avg ELO, skill gap severity, content coverage score.",
    {
      authorization: z.string().describe("Bearer JWT"),
    },
    async (args) => {
      const { authorization } = parse(AuthSchema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("analytics.getStreamHealth", user.id, user.role)
      const t    = startTimer()
      // institution_admin can see this for their college; admin sees all
      assertPermission(user, "analytics")

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for stream health metrics")
      throw new McpError(
        ErrorCode.MethodNotFound,
        "analytics.getStreamHealth has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )
}
