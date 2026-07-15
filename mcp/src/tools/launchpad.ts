/**
 * tools/launchpad.ts — Launchpad / Jobs domain (4 tools)
 *
 * Tools:
 *   launchpad.searchJobs         — search job listings filtered by role/skills/location
 *   launchpad.getJobDetails      — get a single job posting
 *   launchpad.trackApplication   — log a job application
 *   launchpad.getApplications    — list the student's tracked applications
 *
 * BACKEND WIRING NOTE (2026-07-14 fix): there is no /api/launchpad/* route
 * prefix anywhere in the backend. Real routes live under /api/jobs/* — split
 * across jobs.js (list/:id, JSearch-backed) and recruiterComms.js (:id/apply,
 * requireAuth). Note also that /api/jobs/list, /api/jobs/applications, and
 * /api/jobs/saved are each registered by BOTH jobs.js and recruiterComms.js;
 * because jobs.js mounts first in server.js, its (unauthenticated, degrade-
 * gracefully) handlers win for those exact paths — recruiterComms's versions
 * of those three are dead code today. Only /:id/apply is uniquely served by
 * recruiterComms.js. skills/stream/location/pagination filters and
 * status-tagged application tracking are NOT supported server-side — noted below.
 *
 * Security: students access own applications only.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { verifyJWT, extractBearer } from "../shared/auth.js"
import { assertPermission } from "../shared/permissions.js"
import {
  parse, AuthSchema, PaginationSchema, SearchQuerySchema,
  JobTypeSchema, WorkModeSchema,
} from "../shared/validation.js"
import { api } from "../shared/client.js"
import { createLogger, startTimer } from "../shared/logger.js"

export function registerLaunchpadTools(server: McpServer): void {

  // ── launchpad.searchJobs ───────────────────────────────────────────────────
  server.tool(
    "launchpad.searchJobs",
    "Search job listings relevant to the authenticated student's role and skills. Filter by type, work mode, location, and keywords.",
    {
      authorization: z.string().describe("Bearer JWT"),
      query:         z.string().max(300).optional().describe("Free-text search (title, company, skills)"),
      skills:        z.array(z.string().min(1)).max(10).optional(),
      stream:        z.string().optional().describe("Stream filter, e.g. 'IT', 'ECE'"),
      jobType:       JobTypeSchema.optional(),
      workMode:      WorkModeSchema.optional(),
      location:      z.string().max(100).optional(),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(50).default(20).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema).extend({
        query:    z.string().max(300).optional(),
        skills:   z.array(z.string().min(1)).max(10).optional(),
        stream:   z.string().optional(),
        jobType:  JobTypeSchema.optional(),
        workMode: WorkModeSchema.optional(),
        location: z.string().max(100).optional(),
      })
      const { authorization, query, skills, stream, jobType, workMode, location, page, pageSize } =
        parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("launchpad.searchJobs", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "launchpad")

      if (skills?.length || stream || location) {
        log.warn("skills/stream/location filters requested but not supported by backend — ignoring", {
          hasSkills: !!skills?.length, hasStream: !!stream, hasLocation: !!location,
        })
      }

      try {
        // Real route: GET /api/jobs/list (jobs.js). Reads `search`/`work_mode`/
        // `job_type`/`page` only — skills/stream/location/pageSize have no
        // server-side support (JSearch-backed with a Supabase fallback).
        const data = await api.get(authorization, `/api/jobs/list`, {
          search: query, work_mode: workMode, job_type: jobType, page,
        })
        log.success(t, { jobType, workMode })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── launchpad.getJobDetails ────────────────────────────────────────────────
  server.tool(
    "launchpad.getJobDetails",
    "Get the full details of a single job posting including requirements, company info, and apply link.",
    {
      authorization: z.string().describe("Bearer JWT"),
      jobId:         z.string().min(1).describe("Job listing identifier"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ jobId: z.string().min(1) })
      const { authorization, jobId } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("launchpad.getJobDetails", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "launchpad")

      try {
        const data = await api.get(authorization, `/api/jobs/${jobId}`)
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── launchpad.trackApplication ─────────────────────────────────────────────
  server.tool(
    "launchpad.trackApplication",
    "Apply to a job on the student's behalf. NOTE: the backend only supports a one-shot 'apply' action — there is no status-lifecycle tracker (interview/offer/rejected/withdrawn), no notes field, and no backdating via appliedAt. status/notes/appliedAt are accepted for forward-compat but not honored server-side.",
    {
      authorization: z.string().describe("Bearer JWT"),
      jobId:         z.string().min(1).describe("Job listing identifier"),
      status:        z.enum(["applied", "interview", "offer", "rejected", "withdrawn"]).default("applied"),
      notes:         z.string().max(1000).optional(),
      appliedAt:     z.string().datetime({ offset: true }).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        jobId:     z.string().min(1),
        status:    z.enum(["applied", "interview", "offer", "rejected", "withdrawn"]).default("applied"),
        notes:     z.string().max(1000).optional(),
        appliedAt: z.string().datetime({ offset: true }).optional(),
      })
      const { authorization, jobId, status, notes, appliedAt } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("launchpad.trackApplication", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "launchpad")

      if (status !== "applied" || notes || appliedAt) {
        log.warn("status/notes/appliedAt requested but not supported by backend — apply is always status='applied'", { status })
      }

      try {
        // Real route: POST /api/jobs/:id/apply (recruiterComms.js, requireAuth).
        // jobId is a URL param; no body fields are read (status is hardcoded
        // "applied" server-side, uid comes from the JWT).
        const data = await api.post(authorization, `/api/jobs/${jobId}/apply`, {})
        log.success(t, { status: "applied" })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── launchpad.getApplications ──────────────────────────────────────────────
  server.tool(
    "launchpad.getApplications",
    "List the authenticated student's tracked job applications (most recent first, capped at 50). NOTE: status filtering and pagination are not supported server-side — status/page/pageSize are accepted for forward-compat but ignored.",
    {
      authorization: z.string().describe("Bearer JWT"),
      status:        z.enum(["applied", "interview", "offer", "rejected", "withdrawn"]).optional(),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(50).default(20).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema).extend({
        status: z.enum(["applied", "interview", "offer", "rejected", "withdrawn"]).optional(),
      })
      const { authorization, status, page, pageSize } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("launchpad.getApplications", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "launchpad")

      if (status) log.warn("status filter requested but not supported by backend — ignoring", { status })

      try {
        // Real route: GET /api/jobs/applications (jobs.js wins the mount race
        // over recruiterComms.js's version of the same path) — reads the JWT
        // manually, no query params honored, hardcoded limit(50).
        const data = await api.get(authorization, `/api/jobs/applications`)
        log.success(t, { status })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )
}
