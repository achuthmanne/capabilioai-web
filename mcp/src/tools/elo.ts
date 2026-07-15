/**
 * tools/elo.ts — ELO domain (4 tools, 1 not yet implemented)
 *
 * Tools:
 *   elo.getScore       — current ELO score + rank
 *   elo.getTimeline    — ELO history, client-filtered to a time window
 *   elo.getBreakdown   — per-dimension ELO breakdown (Arena, Quiz, Interview…)
 *   elo.getComparison  — NOT YET IMPLEMENTED (no percentile/histogram backend — Group-B follow-up)
 *
 * BACKEND WIRING NOTE (2026-07-14 fix): there is no /api/elo/* route prefix,
 * but a real, purpose-built endpoint exists at GET /api/arena/v2/elo/:uid
 * (arenaV2.js) returning { overall, by_dimension, tier, global_rank,
 * total_solved, history } — that single call now backs getScore/getBreakdown
 * directly, and getTimeline filters its `history` array (last 90 entries,
 * newest first) to the requested window client-side (pure computation, no
 * new backend logic). getComparison has no real backend equivalent at all —
 * no endpoint computes cross-student percentile/histogram data by stream or
 * college — left as a fail-fast NOT_IMPLEMENTED rather than a silent 404.
 *
 * Security: students may only view their own ELO.
 * Recruiters and institution_admins may view any candidate's ELO (publicOk).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { verifyJWT, extractBearer } from "../shared/auth.js"
import { assertPermission, canViewCandidates } from "../shared/permissions.js"
import {
  parse, AuthSchema, UidSchema, EloTimelineSchema,
} from "../shared/validation.js"
import { api } from "../shared/client.js"
import { createLogger, startTimer } from "../shared/logger.js"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"

export function registerEloTools(server: McpServer): void {

  // ── elo.getScore ───────────────────────────────────────────────────────────
  server.tool(
    "elo.getScore",
    "Get the current ELO score, rank, and percentile for the authenticated student (or a target candidate if the caller is a recruiter/admin).",
    {
      authorization: z.string().describe("Bearer JWT"),
      targetUid:     UidSchema.optional().describe(
        "UID of another user to view. Only recruiters and admins may pass this."
      ),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ targetUid: UidSchema.optional() })
      const { authorization, targetUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("elo.getScore", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "elo")

      // Recruiters/admins may query other users; students can only query self
      const uid = resolveTargetUid(user, targetUid)
      const log2 = createLogger("elo.getScore", user.id, user.role)

      try {
        const data = await api.get(authorization, `/api/arena/v2/elo/${uid}`)
        log2.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log2.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── elo.getTimeline ────────────────────────────────────────────────────────
  server.tool(
    "elo.getTimeline",
    "Get ELO history over a time window (7d / 30d / 90d / 1y / all). Returns data points for charting.",
    {
      authorization: z.string().describe("Bearer JWT"),
      window:        EloTimelineSchema.default("30d"),
      targetUid:     UidSchema.optional(),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        window:    EloTimelineSchema.default("30d"),
        targetUid: UidSchema.optional(),
      })
      const { authorization, window, targetUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("elo.getTimeline", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "elo")

      const uid = resolveTargetUid(user, targetUid)

      try {
        // Real endpoint has no window param — it always returns the last 90
        // elo_history rows. Filter client-side (pure computation, no new
        // backend logic) to approximate the requested window.
        const data = await api.get<{ history?: Array<{ date?: string }> }>(
          authorization, `/api/arena/v2/elo/${uid}`
        )
        const cutoff = windowToCutoff(window ?? "30d")
        const filteredHistory = cutoff
          ? (data.history ?? []).filter((h) => h.date && h.date >= cutoff)
          : (data.history ?? [])
        log.success(t, { window })
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ ...data, history: filteredHistory, window }),
          }],
        }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── elo.getBreakdown ───────────────────────────────────────────────────────
  server.tool(
    "elo.getBreakdown",
    "Get per-domain ELO breakdown: Arena coding, Quiz, AI Interview, Skill Studio, Certification. Shows contribution of each domain to the overall score.",
    {
      authorization: z.string().describe("Bearer JWT"),
      targetUid:     UidSchema.optional(),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ targetUid: UidSchema.optional() })
      const { authorization, targetUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("elo.getBreakdown", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "elo")

      const uid = resolveTargetUid(user, targetUid)

      try {
        // by_dimension on the same endpoint IS the per-dimension breakdown.
        const data = await api.get(authorization, `/api/arena/v2/elo/${uid}`)
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── elo.getComparison ──────────────────────────────────────────────────────
  server.tool(
    "elo.getComparison",
    "NOT YET IMPLEMENTED — no backend endpoint computes cross-student percentile/histogram data by stream or college. elo.getScore's global_rank field is the closest available signal (global rank only, no stream/college scoping or histogram). Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      stream:        z.string().optional().describe("Stream override; defaults to student's own stream"),
      collegeCode:   z.string().optional().describe("College scope; defaults to student's college"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        stream:      z.string().optional(),
        collegeCode: z.string().optional(),
      })
      const { authorization, stream, collegeCode } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("elo.getComparison", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "elo")

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for stream/college ELO comparison", { stream, collegeCode })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "elo.getComparison has no backend implementation yet — use elo.getScore's global_rank as a partial substitute. Tracked as follow-up work."
      )
    }
  )
}

// ── Helper ────────────────────────────────────────────────────────────────────

/** Converts a timeline window enum to an ISO date cutoff (YYYY-MM-DD), or
 * undefined for "all" (no filtering needed). */
function windowToCutoff(window: string): string | undefined {
  if (window === "all") return undefined
  const days = window === "7d" ? 7 : window === "30d" ? 30 : window === "90d" ? 90 : window === "1y" ? 365 : 30
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

// ── Helper ────────────────────────────────────────────────────────────────────

function resolveTargetUid(
  user: { id: string; role: string },
  targetUid: string | undefined
): string {
  if (!targetUid || targetUid === user.id) return user.id

  const isPrivileged =
    user.role === "recruiter" ||
    user.role === "institution_admin" ||
    user.role === "admin"

  if (!isPrivileged) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Students may only view their own ELO data"
    )
  }

  return targetUid
}
