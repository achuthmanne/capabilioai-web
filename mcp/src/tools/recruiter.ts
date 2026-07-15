/**
 * tools/recruiter.ts — Recruiter / Nexus domain (5 tools)
 *
 * Tools:
 *   recruiter.searchCandidates   — search students by name/role/domain
 *   recruiter.getCandidateProfile — full public profile of a candidate
 *   recruiter.getCandidateElo    — ELO + breakdown for a candidate
 *   recruiter.getCandidateVault  — public Vault artifacts for a candidate
 *   recruiter.sendNexusRequest   — send a connection request via Nexus
 *
 * BACKEND WIRING NOTE (2026-07-14 fix): searchCandidates's path/verb were
 * already correct (/api/nexus/search) but the backend only reads q/role/domain
 * /page/limit — it does NOT support skills-array, ELO-range, or location
 * filtering (there IS a separate /api/arena/v2/recruiter/candidates endpoint
 * that filters by proof-artifact score/challenge_type, but its own min_elo/
 * domain query params are dead code in the backend itself, so switching to it
 * would trade one set of unsupported filters for another — left on
 * /api/nexus/search as the more honestly-documented option).
 * getCandidateProfile/getCandidateElo/getCandidateVault/sendNexusRequest all
 * had wrong paths — corrected to /api/nexus/profile/:uid,
 * /api/arena/v2/elo/:uid, /api/arena/v2/recruiter/proof/:uid, and
 * /api/nexus/connect respectively.
 *
 * Security: ALL tools in this file require role=recruiter or admin.
 * Students cannot call these tools. Data returned is scoped to the
 * student's PUBLIC-flagged information only — enforced by the backend.
 *
 * PRIVACY: We never return another student's private data (email, phone,
 * address, raw assessment scores). The backend enforces this via RLS.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { verifyJWT, extractBearer, type CapabilioUser } from "../shared/auth.js"
import { assertPermission, canViewCandidates } from "../shared/permissions.js"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import {
  parse, AuthSchema, UidSchema, PaginationSchema, CandidateSearchSchema,
} from "../shared/validation.js"
import { api } from "../shared/client.js"
import { createLogger, startTimer } from "../shared/logger.js"

// Fixed 2026-07-14: was a narrowed { id, role } fake of CapabilioUser, which
// broke `tsc`/`npm run build` at every call site (a full CapabilioUser was
// always what's actually passed in, and forwarded to canViewCandidates()
// which requires the full type). Widened to the real shared type — no
// behavior change, purely a type-annotation fix.
function assertRecruiter(user: CapabilioUser): void {
  if (!canViewCandidates(user)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Only recruiters and institution admins may access candidate data"
    )
  }
}

export function registerRecruiterTools(server: McpServer): void {

  // ── recruiter.searchCandidates ─────────────────────────────────────────────
  server.tool(
    "recruiter.searchCandidates",
    "Search student candidates by free-text query and role/domain. Returns public profile summaries. Requires recruiter or institution_admin role. NOTE: the backend does not support ELO-range, location, or multi-skill filtering today — minElo/maxElo/location are accepted for forward-compat but ignored; skills are folded into the free-text query as a best effort.",
    {
      authorization: z.string().describe("Bearer JWT"),
      skills:        z.array(z.string().min(1)).min(1).max(10).describe("Required skills"),
      stream:        z.string().optional().describe("e.g. 'IT', 'ECE', 'Mechanical'"),
      minElo:        z.number().int().min(0).max(3000).optional(),
      maxElo:        z.number().int().min(0).max(3000).optional(),
      location:      z.string().max(100).optional(),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(50).default(20).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(CandidateSearchSchema)
      const { authorization, ...searchParams } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("recruiter.searchCandidates", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "recruiter")
      assertRecruiter(user)

      if (searchParams.minElo || searchParams.maxElo || searchParams.location) {
        log.warn("minElo/maxElo/location requested but not supported by backend — ignoring")
      }

      try {
        // Real route reads q/role/domain/page/limit — no skills array, no
        // ELO range, no location filter server-side.
        const data = await api.get(authorization, `/api/nexus/search`, {
          q: searchParams.skills.join(" "),
          domain: searchParams.stream,
          page: searchParams.page,
          limit: searchParams.pageSize,
        })
        log.success(t, { stream: searchParams.stream })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── recruiter.getCandidateProfile ──────────────────────────────────────────
  server.tool(
    "recruiter.getCandidateProfile",
    "Get a candidate's full public profile — role, stream, skills, ELO rank, top achievements. Private fields are excluded.",
    {
      authorization: z.string().describe("Bearer JWT"),
      candidateUid:  UidSchema.describe("UID of the student candidate"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ candidateUid: UidSchema })
      const { authorization, candidateUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("recruiter.getCandidateProfile", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "recruiter")
      assertRecruiter(user)

      try {
        const data = await api.get(authorization, `/api/nexus/profile/${candidateUid}`)
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── recruiter.getCandidateElo ──────────────────────────────────────────────
  server.tool(
    "recruiter.getCandidateElo",
    "Get a candidate's ELO score, rank, percentile, and domain breakdown (Arena, Interview, Skills). Returns only public ELO data.",
    {
      authorization: z.string().describe("Bearer JWT"),
      candidateUid:  UidSchema.describe("UID of the student candidate"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ candidateUid: UidSchema })
      const { authorization, candidateUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("recruiter.getCandidateElo", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "recruiter")
      assertRecruiter(user)

      try {
        const data = await api.get(authorization, `/api/arena/v2/elo/${candidateUid}`)
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── recruiter.getCandidateVault ────────────────────────────────────────────
  server.tool(
    "recruiter.getCandidateVault",
    "Get the public Vault artifacts for a candidate — projects, certifications, open source contributions (recruiter-visible-flagged only). NOTE: the backend returns the full list unpaginated — page/pageSize are accepted for forward-compat but ignored.",
    {
      authorization: z.string().describe("Bearer JWT"),
      candidateUid:  UidSchema.describe("UID of the student candidate"),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(30).default(10).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema).extend({ candidateUid: UidSchema })
      const { authorization, candidateUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("recruiter.getCandidateVault", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "recruiter")
      assertRecruiter(user)

      try {
        // Real route: GET /api/arena/v2/recruiter/proof/:uid — returns only
        // is_recruiter_visible=true artifacts, no pagination support.
        const data = await api.get(authorization, `/api/arena/v2/recruiter/proof/${candidateUid}`)
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── recruiter.sendNexusRequest ─────────────────────────────────────────────
  server.tool(
    "recruiter.sendNexusRequest",
    "Send a Nexus connection request to a candidate. The student receives it in their Nexus inbox. NOTE: the backend only supports a single generic connection type today — 'opportunity'/'internship' are accepted for forward-compat but sent as a plain connection request.",
    {
      authorization: z.string().describe("Bearer JWT"),
      candidateUid:  UidSchema.describe("UID of the student candidate"),
      message:       z.string().min(20).max(1000).describe("Personalised message to the candidate"),
      type:          z.enum(["connection", "opportunity", "internship"]).default("connection"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        candidateUid: UidSchema,
        message:      z.string().min(20).max(1000),
        type:         z.enum(["connection", "opportunity", "internship"]).default("connection"),
      })
      const { authorization, candidateUid, message, type } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("recruiter.sendNexusRequest", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "recruiter")
      assertRecruiter(user)

      if (type !== "connection") {
        log.warn("connection type requested but backend only supports generic connections — sending as plain connection", { type })
      }

      try {
        // Real route: POST /api/nexus/connect — reads addressee_id/message only.
        const data = await api.post(authorization, `/api/nexus/connect`, {
          addressee_id: candidateUid, message,
        })
        log.success(t, { type })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )
}
