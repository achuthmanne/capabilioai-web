/**
 * tools/skillStudio.ts — Skill Studio domain (5 core tools + 2 added)
 *
 * Tools:
 *   skillStudio.getResources        — learning resources for a topic
 *   skillStudio.generateLesson      — AI lesson for a weak skill
 *   skillStudio.getLearningPath     — ordered learning roadmap for a role
 *   skillStudio.completeModule      — NOT_IMPLEMENTED (no backend route — Group-B follow-up)
 *   skillStudio.getRecommendations  — NOT_IMPLEMENTED (no backend route — Group-B follow-up)
 *   skillStudio.getCompletedModules — NOT_IMPLEMENTED (no backend route — Group-B follow-up)
 *   skillStudio.getLearningProgress — NOT_IMPLEMENTED (no backend route — Group-B follow-up)
 *
 * BACKEND WIRING NOTE (2026-07-14 fix): backend/server/routes/skillStudio.js
 * only implements POST /lesson, POST /learning-path, GET /youtube, GET /resources
 * — all AI-generated, "sticky" content, none of it persisted per-user. There is
 * no completion-tracking, progress, or recommendation-ranking backend at all.
 * getResources/generateLesson/getLearningPath below are corrected to the real
 * param names and verb (getLearningPath was calling GET on a POST-only route).
 * The remaining four tools fail fast with a clear NOT_IMPLEMENTED error instead
 * of calling a nonexistent path — building the persistence layer for module
 * completion/progress is real backend feature work, tracked separately.
 *
 * Security: all tools require student role. Completion events are tied
 * to the authenticated user's uid — never a passed-in uid.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import { verifyJWT, extractBearer } from "../shared/auth.js"
import { assertPermission } from "../shared/permissions.js"
import {
  parse, AuthSchema, PaginationSchema, RoleHintSchema, LearningResourceTypeSchema,
} from "../shared/validation.js"
import { api } from "../shared/client.js"
import { createLogger, startTimer } from "../shared/logger.js"

export function registerSkillStudioTools(server: McpServer): void {

  // ── skillStudio.getResources ───────────────────────────────────────────────
  server.tool(
    "skillStudio.getResources",
    "Get AI-suggested learning resources (docs, articles, practice sites) for a given skill topic. NOTE: the backend does not support resource-type filtering or pagination today — `type`/`page`/`pageSize` are accepted for forward-compat but not honored server-side.",
    {
      authorization: z.string().describe("Bearer JWT"),
      topic:         z.string().min(1).max(200).describe("Skill name or topic, e.g. 'React Hooks', 'Signal Processing'"),
      type:          LearningResourceTypeSchema.optional().describe("NOT YET SUPPORTED by the backend — ignored"),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(30).default(10).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema).extend({
        topic: z.string().min(1).max(200),
        type:  LearningResourceTypeSchema.optional(),
      })
      const { authorization, topic, type, page, pageSize } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("skillStudio.getResources", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "skillStudio")

      if (type) log.warn("resource type filter requested but not supported by backend — ignoring", { type })

      try {
        // Real route reads `topic`, `jobTitle`, `level` — not `type`/pagination.
        const data = await api.get(authorization, `/api/skill-studio/resources`, { topic })
        log.success(t, { topic })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── skillStudio.generateLesson ─────────────────────────────────────────────
  server.tool(
    "skillStudio.generateLesson",
    "Generate an AI-personalised lesson for a skill gap.",
    {
      authorization: z.string().describe("Bearer JWT"),
      skill:         z.string().min(1).max(200).describe("The skill to learn, e.g. 'Kubernetes Pod scheduling'"),
      roleHint:      RoleHintSchema,
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        skill:    z.string().min(1).max(200),
        roleHint: RoleHintSchema,
      })
      const { authorization, skill, roleHint } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("skillStudio.generateLesson", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "skillStudio")

      try {
        // Real route reads `topic`/`jobTitle`/`skillLevel`/`duration` — it never
        // read `skill`/`roleHint`, so those fields were silently discarded before.
        const data = await api.post(authorization, `/api/skill-studio/lesson`, {
          topic: skill,
          ...(roleHint ? { jobTitle: roleHint } : {}),
        })
        log.success(t, { skill })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── skillStudio.getLearningPath ────────────────────────────────────────────
  server.tool(
    "skillStudio.getLearningPath",
    "Get a structured, ordered learning roadmap for a role — phases, modules, estimated hours, and recommended actions.",
    {
      authorization: z.string().describe("Bearer JWT"),
      roleHint:      RoleHintSchema,
    },
    async (args) => {
      const Schema = AuthSchema.extend({ roleHint: RoleHintSchema })
      const { authorization, roleHint } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("skillStudio.getLearningPath", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "skillStudio")

      try {
        // Real route is POST (not GET) and reads jobTitle/skillGraph/weakAreas/
        // eloRating from the body — the old GET-with-query-param call 405'd.
        const data = await api.post(authorization, `/api/skill-studio/learning-path`, {
          ...(roleHint ? { jobTitle: roleHint } : {}),
        })
        log.success(t, { roleHint })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── skillStudio.completeModule ─────────────────────────────────────────────
  server.tool(
    "skillStudio.completeModule",
    "NOT YET IMPLEMENTED — there is no module-completion/progress-tracking backend today (Skill Studio content is AI-generated on the fly, not persisted per-user). Tracked as follow-up work; this tool fails fast rather than calling a nonexistent endpoint.",
    {
      authorization: z.string().describe("Bearer JWT"),
      moduleId:      z.string().min(1).describe("Module identifier from the learning path"),
      pathId:        z.string().min(1).optional().describe("Learning path the module belongs to"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        moduleId: z.string().min(1),
        pathId:   z.string().min(1).optional(),
      })
      const { authorization, moduleId, pathId } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("skillStudio.completeModule", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "skillStudio")

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for module completion", { moduleId, pathId })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "skillStudio.completeModule has no backend implementation yet — there is no completion/progress-tracking API route. This is tracked as follow-up work, not a transient failure."
      )
    }
  )

  // ── skillStudio.getRecommendations ─────────────────────────────────────────
  server.tool(
    "skillStudio.getRecommendations",
    "NOT YET IMPLEMENTED — there is no ranked skill-gap-recommendation endpoint. For a working alternative today, prefer skillStudio.getLearningPath (role-based roadmap) or skillStudio.getCompletedModules' sibling analytics.getSkillGapReport equivalent once built. Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      limit:         z.number().int().min(1).max(20).default(5).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        limit: z.number().int().min(1).max(20).default(5).optional(),
      })
      const { authorization, limit } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("skillStudio.getRecommendations", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "skillStudio")

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for ranked skill-gap recommendations", { limit })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "skillStudio.getRecommendations has no backend implementation yet. Use skillStudio.getLearningPath instead. Tracked as follow-up work."
      )
    }
  )

  // ── skillStudio.getCompletedModules ────────────────────────────────────────
  server.tool(
    "skillStudio.getCompletedModules",
    "NOT YET IMPLEMENTED — module completion is not persisted anywhere in the backend today, so there is nothing to read back. Tracked as follow-up work alongside skillStudio.completeModule.",
    {
      authorization: z.string().describe("Bearer JWT"),
    },
    async (args) => {
      const { authorization } = parse(AuthSchema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("skillStudio.getCompletedModules", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "skillStudio")

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for completed-module history")
      throw new McpError(
        ErrorCode.MethodNotFound,
        "skillStudio.getCompletedModules has no backend implementation yet — module completion is not persisted. Tracked as follow-up work."
      )
    }
  )

  // ── skillStudio.getLearningProgress ────────────────────────────────────────
  server.tool(
    "skillStudio.getLearningProgress",
    "NOT YET IMPLEMENTED — there is no per-user learning-progress tracking backend today. Tracked as follow-up work alongside skillStudio.completeModule / getCompletedModules.",
    {
      authorization: z.string().describe("Bearer JWT"),
    },
    async (args) => {
      const { authorization } = parse(AuthSchema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("skillStudio.getLearningProgress", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "skillStudio")

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for learning progress")
      throw new McpError(
        ErrorCode.MethodNotFound,
        "skillStudio.getLearningProgress has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )
}
