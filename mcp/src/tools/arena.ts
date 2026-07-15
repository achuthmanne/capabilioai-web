/**
 * tools/arena.ts — Arena domain (5 core tools + 3 added)
 *
 * Tools:
 *   arena.getCatalog           — list challenges filtered by role/stream/difficulty
 *   arena.getChallenge         — get a single challenge by id
 *   arena.submitSolution       — submit code for grading (async job)
 *   arena.getSubmissionResult  — poll a grading job's result
 *   arena.getLeaderboard       — global/domain ELO leaderboard
 *   arena.getWorkbenchForRole  — resolve a role's IDE/workbench (code/firmware/HDL/circuit/etc.)
 *   arena.getMissionHistory    — 30-day submission stats + portfolio-visible artifacts
 *   arena.recommendNextChallenge — AI-reasoning tool: what should the student attempt next
 *
 * BACKEND WIRING NOTE (2026-07-14 fix): the previous version of this file called
 * /api/arena/catalog, /api/arena/challenge/:id, /api/arena/submit,
 * /api/arena/submission/:id, /api/arena/leaderboard — none of which exist.
 * The real Arena API is mounted at /api/arena/v2/* (backend/server/routes/arenaV2.js),
 * with a different path shape and an async job-queue submission model (submit
 * returns a job_id immediately; grading happens in a background worker).
 * All five tools below have been corrected to match the real routes.
 *
 * Security: every tool verifies JWT. Submission tools assert the uid in the
 * submission matches the authenticated user.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { verifyJWT, extractBearer } from "../shared/auth.js"
import { assertPermission } from "../shared/permissions.js"
import {
  parse, AuthSchema, PaginationSchema, DifficultySchema, RoleHintSchema,
} from "../shared/validation.js"
import { api } from "../shared/client.js"
import { createLogger, startTimer } from "../shared/logger.js"
import { resolveRole, getWorkbenchForRole as lookupWorkbench } from "../shared/registry.js"

export function registerArenaTools(server: McpServer): void {

  // ── arena.getCatalog ───────────────────────────────────────────────────────
  server.tool(
    "arena.getCatalog",
    "List Arena challenges. Filter by category, difficulty, or search term. Returns challenges relevant to the student's stream and role.",
    {
      authorization: z.string().describe("Bearer JWT"),
      category:    z.string().optional().describe("Problem category, e.g. 'DSA', 'ECE', 'SQL'"),
      difficulty:  DifficultySchema.optional(),
      search:      z.string().max(200).optional(),
      page:        z.number().int().min(1).default(1).optional(),
      pageSize:    z.number().int().min(1).max(50).default(20).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema).extend({
        category:   z.string().optional(),
        difficulty: DifficultySchema.optional(),
        search:     z.string().max(200).optional(),
      })
      const { authorization, category, difficulty, search, page, pageSize } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.getCatalog", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      try {
        // Real route: GET /api/arena/v2/catalog. It reads `domain` (not
        // `category`) and `limit` (not `pageSize`) — mapped below.
        const data = await api.get(authorization, `/api/arena/v2/catalog`, {
          domain: category, difficulty, search, page, limit: pageSize,
        })
        log.success(t, { category, difficulty })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── arena.getChallenge ─────────────────────────────────────────────────────
  server.tool(
    "arena.getChallenge",
    "Get a single Arena challenge by ID — problem statement, constraints, examples, starter code stubs.",
    {
      authorization: z.string().describe("Bearer JWT"),
      challengeId:   z.string().uuid("challengeId must be a UUID"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ challengeId: z.string().uuid() })
      const { authorization, challengeId } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.getChallenge", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      try {
        const data = await api.get(authorization, `/api/arena/v2/challenges/${challengeId}`)
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── arena.submitSolution ───────────────────────────────────────────────────
  server.tool(
    "arena.submitSolution",
    "Submit code to the Arena judge. Grading runs asynchronously in a background worker — this returns a jobId immediately. Poll arena.getSubmissionResult (with the same challengeId + the returned jobId) for the verdict.",
    {
      authorization: z.string().describe("Bearer JWT"),
      challengeId:   z.string().uuid("challengeId must be a UUID"),
      code:          z.string().min(1).max(50_000, "code too large (max 50 kB)"),
      language:      z.string().min(1).max(30).optional().describe(
        "Informational only — the grading worker infers language from the challenge, this field is not read by the backend today."
      ),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        challengeId: z.string().uuid(),
        code:        z.string().min(1).max(50_000),
        language:    z.string().min(1).max(30).optional(),
      })
      const { authorization, challengeId, code } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.submitSolution", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      try {
        // Real route: POST /api/arena/v2/challenges/:id/submit — challengeId
        // is a URL param, not a body field. Enqueues a background grading job
        // and returns { queued, job_id, message } immediately (~50ms), not a verdict.
        // uid is taken from the JWT by the backend — we never pass it from here.
        const data = await api.post(authorization, `/api/arena/v2/challenges/${challengeId}/submit`, {
          code,
          test_results: [],
          time_taken_secs: 0,
          is_timed_out: false,
        })
        log.success(t, { challengeId })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── arena.getSubmissionResult ──────────────────────────────────────────────
  server.tool(
    "arena.getSubmissionResult",
    "Poll the result of an Arena code submission's grading job. Returns status (queued/processing/done/failed) and, once done, the verdict, test case breakdown, and ELO delta.",
    {
      authorization: z.string().describe("Bearer JWT"),
      challengeId:   z.string().uuid("challengeId must be a UUID"),
      jobId:         z.string().min(1).describe("job_id returned by arena.submitSolution"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        challengeId: z.string().uuid(),
        jobId:       z.string().min(1),
      })
      const { authorization, challengeId, jobId } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.getSubmissionResult", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      try {
        // Real route: GET /api/arena/v2/challenges/:id/jobs/:job_id — both
        // challengeId and jobId are required URL params (no flat /submission/:id).
        const data = await api.get(authorization, `/api/arena/v2/challenges/${challengeId}/jobs/${jobId}`)
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── arena.getLeaderboard ───────────────────────────────────────────────────
  server.tool(
    "arena.getLeaderboard",
    "Get the Arena ELO leaderboard. Filter by stream/domain. NOTE: college-scoped leaderboards are not yet supported by the backend — collegeCode is currently ignored (tracked as follow-up work); only global and domain scopes exist today.",
    {
      authorization: z.string().describe("Bearer JWT"),
      stream:        z.string().optional().describe("Domain/stream filter — should be an arena domain key (e.g. from student.resolveRole's arenaKey), e.g. 'swe', 'ece_embedded'"),
      collegeCode:   z.string().optional().describe("NOT YET SUPPORTED by the backend — accepted for forward-compat but ignored"),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(100).default(50).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema).extend({
        stream:      z.string().optional(),
        collegeCode: z.string().optional(),
      })
      const { authorization, stream, collegeCode, page, pageSize } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.getLeaderboard", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      if (collegeCode) {
        log.warn("collegeCode requested but not supported by backend — ignoring", { collegeCode })
      }

      try {
        // Real route: GET /api/arena/v2/leaderboard, reads scope_type/scope_id/
        // metric/page/limit — no college scoping exists server-side.
        const data = await api.get(authorization, `/api/arena/v2/leaderboard`, {
          scope_type: stream ? "domain" : "global",
          scope_id:   stream ?? "all",
          metric:     "elo",
          page, limit: pageSize,
        })
        log.success(t, { stream })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── arena.getWorkbenchForRole ──────────────────────────────────────────────
  server.tool(
    "arena.getWorkbenchForRole",
    "Resolve the Arena workbench (IDE/renderer) for a role — code editor, firmware IDE, HDL IDE, circuit workbench, layout studio, engineering calculator, etc. Covers all streams (IT/ECE/EEE/Mech/Civil/etc.), driven entirely by the generated role/workbench registry — never hardcode a renderer per role.",
    {
      authorization: z.string().describe("Bearer JWT"),
      roleHint: z.string().min(1).describe(
        "Role identifier: roleId, keyword, or slug — same resolution as student.resolveRole"
      ),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ roleHint: z.string().min(1) })
      const { authorization, roleHint } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.getWorkbenchForRole", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      // Pure local lookup against the generated registry — no backend call,
      // no Supabase access. See shared/registry.ts.
      const workbench = lookupWorkbench(roleHint)
      if (!workbench) {
        log.failure(t, "NOT_FOUND", `No role/workbench matched hint: ${roleHint}`)
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "No workbench found for role", roleHint }) }],
          isError: true,
        }
      }

      log.success(t, { workbenchId: workbench.id })
      return { content: [{ type: "text", text: JSON.stringify(workbench) }] }
    }
  )

  // ── arena.getMissionHistory ────────────────────────────────────────────────
  server.tool(
    "arena.getMissionHistory",
    "Get the student's recent Arena activity: 30-day submission stats (avg score, pass rate, ELO delta, streak) plus portfolio-visible proof artifacts. NOTE: the backend has no per-submission audit-log endpoint today, so this is aggregate stats + notable artifacts, not a full attempt-by-attempt history (tracked as follow-up work).",
    {
      authorization: z.string().describe("Bearer JWT"),
    },
    async (args) => {
      const { authorization } = parse(AuthSchema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.getMissionHistory", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      try {
        const [stats, artifacts] = await Promise.all([
          api.get(authorization, `/api/arena/v2/stats/${user.id}`),
          api.get(authorization, `/api/arena/v2/proof-artifacts/${user.id}`),
        ])
        log.success(t)
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              stats_30d: stats,
              notable_artifacts: artifacts,
              note: "Aggregate stats + portfolio-visible artifacts only — no per-submission log exists in the backend yet.",
            }),
          }],
        }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── arena.recommendNextChallenge ───────────────────────────────────────────
  server.tool(
    "arena.recommendNextChallenge",
    "AI-reasoning tool: recommend what Arena challenge the student should attempt next. Composes today's role-appropriate daily assignment, weak-topic signals, and a catalog search filtered to the student's domain/ELO band — all read-only calls to existing backend routes, no new backend logic. Call this before answering 'what should I do next?'",
    {
      authorization: z.string().describe("Bearer JWT"),
      roleHint: RoleHintSchema,
    },
    async (args) => {
      const Schema = AuthSchema.extend({ roleHint: RoleHintSchema })
      const { authorization, roleHint } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.recommendNextChallenge", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      const role = roleHint ? resolveRole(roleHint) : undefined
      const domainKey = role?.arenaKey ?? "swe"
      const roleSlug   = role?.id ?? "swe"

      try {
        const eloData = await api.get<{ overall?: number }>(authorization, `/api/arena/v2/elo/${user.id}`)
        const elo = eloData?.overall ?? 800
        const difficultyBand = elo < 700 ? "Easy" : elo < 1100 ? "Medium" : "Hard"

        const [weakTopics, daily, catalog] = await Promise.all([
          api.get(authorization, `/api/arena/v2/weak-topics/${user.id}`),
          api.get(authorization, `/api/arena/v2/daily-assignment`, { role_slug: roleSlug, elo }),
          api.get(authorization, `/api/arena/v2/catalog`, {
            domain: domainKey, difficulty: difficultyBand, page: 1, limit: 5,
          }),
        ])

        log.success(t, { domainKey, difficultyBand })
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              reasoning: `Filtered to domain='${domainKey}', difficulty band='${difficultyBand}' (from current ELO ${elo}). Weak topics and today's role-matched daily assignment are surfaced separately so the AI can prioritize closing gaps over novelty.`,
              current_elo: elo,
              daily_assignment: daily,
              weak_topics: weakTopics,
              catalog_matches: catalog,
            }),
          }],
        }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )
}
