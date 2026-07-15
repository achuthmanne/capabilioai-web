/**
 * tools/interview.ts — AI Interview domain (5 tools, 1 retired)
 *
 * Tools:
 *   interview.startSession      — create a new AI interview session
 *   interview.getQuestion       — RETIRED (no standalone endpoint — see note)
 *   interview.submitAnswer      — submit an answer, get AI feedback + next question
 *   interview.completeSession   — finalise session, get overall report
 *   interview.getHistory        — list past sessions + scores
 *
 * BACKEND WIRING NOTE (2026-07-14 fix): the real routes live at
 * /api/pro/interview/* (backend/server/routes/aiInterview.js), not
 * /api/ai-interview/*, and sessionId is a URL param (:id), not a body field.
 * There is also no standalone "get next question" endpoint — the first
 * question comes back from `start`, and every subsequent question comes back
 * embedded in the `answer` response's `next_question` field. getQuestion has
 * been changed to fail fast with a clear pointer to submitAnswer instead of
 * calling a path that never existed.
 *
 * Security: session ownership is tied to the JWT sub. A student cannot
 * submit answers to another student's session.
 *
 * NOTE: Each session involves 3–7 chained LLM calls on the backend.
 * Tools use a 60s timeout for question/answer calls to accommodate that.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import { verifyJWT, extractBearer } from "../shared/auth.js"
import { assertPermission } from "../shared/permissions.js"
import {
  parse, AuthSchema, UidSchema, PaginationSchema, RoleHintSchema,
} from "../shared/validation.js"
import { api, call } from "../shared/client.js"
import { createLogger, startTimer } from "../shared/logger.js"

const INTERVIEW_TIMEOUT_MS = 60_000 // LLM chains can be slow

export function registerInterviewTools(server: McpServer): void {

  // ── interview.startSession ─────────────────────────────────────────────────
  server.tool(
    "interview.startSession",
    "Start a new AI interview session for the authenticated student. Returns a sessionId to use in subsequent question/answer calls.",
    {
      authorization:    z.string().describe("Bearer JWT"),
      roleHint:         RoleHintSchema,
      interviewType:    z.enum(["technical", "behavioral", "mixed"]).default("mixed").optional(),
      targetQuestions:  z.number().int().min(3).max(20).default(7).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        roleHint:        RoleHintSchema,
        interviewType:   z.enum(["technical", "behavioral", "mixed"]).default("mixed").optional(),
        targetQuestions: z.number().int().min(3).max(20).default(7).optional(),
      })
      const { authorization, roleHint, interviewType, targetQuestions } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("interview.startSession", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "interview")

      try {
        // Real route: POST /api/pro/interview/start. Reads session_type,
        // interview_mode, domain, role_target, technologies, total_questions —
        // not roleHint/interviewType/targetQuestions. Mapped below.
        const data = await call(authorization, `/api/pro/interview/start`, {
          method: "POST",
          body: {
            session_type: interviewType,
            ...(roleHint ? { domain: roleHint, role_target: roleHint } : {}),
            total_questions: targetQuestions,
          },
          timeoutMs: INTERVIEW_TIMEOUT_MS,
        })
        log.success(t, { roleHint, interviewType })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── interview.getQuestion ──────────────────────────────────────────────────
  server.tool(
    "interview.getQuestion",
    "RETIRED — there is no standalone 'get next question' endpoint. The first question is returned by interview.startSession (as current_question); every subsequent question is returned by interview.submitAnswer (as next_question). Call one of those instead.",
    {
      authorization: z.string().describe("Bearer JWT"),
      sessionId:     z.string().uuid("sessionId must be a UUID"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ sessionId: z.string().uuid() })
      const { authorization, sessionId } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("interview.getQuestion", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "interview")

      log.failure(t, "NOT_IMPLEMENTED", "No standalone get-question endpoint exists", { sessionId })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "interview.getQuestion has no backend equivalent — use interview.startSession's current_question or interview.submitAnswer's next_question instead."
      )
    }
  )

  // ── interview.submitAnswer ─────────────────────────────────────────────────
  server.tool(
    "interview.submitAnswer",
    "Submit an answer to the current interview question. Returns AI feedback, score, and follow-up question hint.",
    {
      authorization: z.string().describe("Bearer JWT"),
      sessionId:     z.string().uuid("sessionId must be a UUID"),
      questionId:    z.string().min(1),
      answer:        z.string().min(1).max(10_000, "Answer too long — max 10,000 characters"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        sessionId:  z.string().uuid(),
        questionId: z.string().min(1),
        answer:     z.string().min(1).max(10_000),
      })
      const { authorization, sessionId, questionId, answer } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("interview.submitAnswer", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "interview")

      try {
        // Real route: POST /api/pro/interview/:id/answer — sessionId is a URL
        // param, not a body field. Reads answer/question_id/time_taken_secs.
        const data = await call(authorization, `/api/pro/interview/${sessionId}/answer`, {
          method: "POST",
          body: { answer, question_id: questionId },
          timeoutMs: INTERVIEW_TIMEOUT_MS,
        })
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── interview.completeSession ──────────────────────────────────────────────
  server.tool(
    "interview.completeSession",
    "Finalise an AI interview session. Returns an overall performance report, score, ELO delta, and improvement recommendations.",
    {
      authorization: z.string().describe("Bearer JWT"),
      sessionId:     z.string().uuid("sessionId must be a UUID"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ sessionId: z.string().uuid() })
      const { authorization, sessionId } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("interview.completeSession", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "interview")

      try {
        // Real route: POST /api/pro/interview/:id/complete — sessionId is a
        // URL param, not a body field.
        const data = await call(authorization, `/api/pro/interview/${sessionId}/complete`, {
          method: "POST",
          body: {},
          timeoutMs: INTERVIEW_TIMEOUT_MS,
        })
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── interview.getHistory ───────────────────────────────────────────────────
  server.tool(
    "interview.getHistory",
    "List past AI interview sessions for the authenticated student — dates, types, scores, and improvement trends. NOTE: the backend does not support pagination — it returns a fixed most-recent-20 list; page/pageSize are accepted for forward-compat but ignored.",
    {
      authorization: z.string().describe("Bearer JWT"),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(50).default(10).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema)
      const { authorization, page, pageSize } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("interview.getHistory", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "interview")

      try {
        // Real route: GET /api/pro/interview/history — no pagination params read.
        const data = await api.get(authorization, `/api/pro/interview/history`)
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )
}
