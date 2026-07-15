/**
 * shared/validation.ts
 *
 * Common Zod schemas used by all MCP tool handlers.
 * Import individual schemas — do NOT import the whole module or you'll
 * pay the Zod parse cost on every other tool call.
 */

import { z } from "zod"

// ── Primitives ────────────────────────────────────────────────────────────────

export const JwtSchema = z.string().min(20, "Authorization JWT is required")

export const UidSchema = z
  .string()
  .uuid("uid must be a valid UUID (e.g. '3d8f7a2c-...')")

export const PositiveInt = z
  .number()
  .int()
  .positive()

// ── Pagination ────────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page:     z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
})
export type Pagination = z.infer<typeof PaginationSchema>

// ── Sorting ───────────────────────────────────────────────────────────────────

export const SortSchema = z.object({
  sortBy:  z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
})

// ── Date range ────────────────────────────────────────────────────────────────

/**
 * Plain ZodObject shape — use this (not DateRangeSchema) when merging into
 * another object schema via `.merge()` / `.extend()`. `.refine()` turns a
 * schema into a ZodEffects, which is not a ZodObject and cannot be merged.
 * Apply `dateRangeRefinement` (below) after merging if you need the
 * cross-field "from before to" check on the combined schema.
 */
export const DateRangeShape = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to:   z.string().datetime({ offset: true }).optional(),
})

/** Cross-field check: reusable so callers don't duplicate the comparison logic. */
export function dateRangeRefinement(d: { from?: string | undefined; to?: string | undefined }): boolean {
  if (!d.from || !d.to) return true
  return new Date(d.from) <= new Date(d.to)
}

export const DATE_RANGE_REFINEMENT_MESSAGE = "'from' must be before 'to'"

/**
 * Standalone, refined date-range schema — use this directly with `parse()`
 * when the tool input IS just a date range (no merging needed).
 */
export const DateRangeSchema = DateRangeShape.refine(dateRangeRefinement, {
  message: DATE_RANGE_REFINEMENT_MESSAGE,
})

// ── Auth header ───────────────────────────────────────────────────────────────

/**
 * Shared shape for every MCP tool input that requires authentication.
 * Merge with tool-specific fields:
 *
 *   const MyToolSchema = AuthSchema.extend({ myField: z.string() })
 */
export const AuthSchema = z.object({
  authorization: JwtSchema.describe(
    "Bearer JWT from Supabase Auth — passed through from the AI client"
  ),
})
export type Auth = z.infer<typeof AuthSchema>

// ── Profile / role inputs ─────────────────────────────────────────────────────

export const RoleHintSchema = z.string().min(1).optional().describe(
  "Optional role hint (e.g. 'frontend', 'ece_embedded'). " +
  "When omitted the server resolves role from the user's profile."
)

// ── Arena ─────────────────────────────────────────────────────────────────────

export const DifficultySchema = z.enum(["Easy", "Medium", "Hard"])

export const ArenaSubmitSchema = z.object({
  challengeId: z.string().uuid("challengeId must be a UUID"),
  code:        z.string().min(1).max(50_000, "code too large (max 50 kB)"),
  language:    z.string().min(1).max(30),
})

// ── Skill Studio ─────────────────────────────────────────────────────────────

export const LearningResourceTypeSchema = z.enum([
  "video", "article", "playground", "quiz", "exercise",
])

// ── Search / filter ───────────────────────────────────────────────────────────

export const SearchQuerySchema = z.string().min(1).max(300, "search query too long")

// ── ELO ──────────────────────────────────────────────────────────────────────

export const EloTimelineSchema = z.enum(["7d", "30d", "90d", "1y", "all"])

// ── Jobs / Launchpad ──────────────────────────────────────────────────────────

export const JobTypeSchema = z.enum([
  "full-time", "part-time", "internship", "contract", "freelance",
])

export const WorkModeSchema = z.enum(["remote", "onsite", "hybrid"])

// ── Vault / Proof of Work ────────────────────────────────────────────────────

export const VaultArtifactTypeSchema = z.enum([
  "project", "certification", "article", "open_source", "competition", "hackathon",
])

// ── Interview ─────────────────────────────────────────────────────────────────

export const InterviewAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().min(1),
  answer:    z.string().min(1).max(10_000, "answer too long"),
})

// ── Recruiter / Nexus ─────────────────────────────────────────────────────────

export const CandidateSearchSchema = z.object({
  skills:    z.array(z.string().min(1)).min(1).max(10),
  stream:    z.string().optional(),
  minElo:    z.number().int().min(0).max(3000).optional(),
  maxElo:    z.number().int().min(0).max(3000).optional(),
  location:  z.string().optional(),
  ...PaginationSchema.shape,
})

// ── Analytics ─────────────────────────────────────────────────────────────────

export const AnalyticsGranularitySchema = z.enum(["day", "week", "month"])

export const CollegeCodeSchema = z
  .string()
  .min(2)
  .max(20)
  .regex(/^[A-Z0-9_-]+$/, "collegeCode must be uppercase alphanumeric/dash/underscore")

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Parse-and-throw helper so tools can write:
 *   const input = parse(MySchema, rawArgs)
 * and get a clean, typed object or an McpError.
 */
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"

export function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw)
  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ")
    throw new McpError(ErrorCode.InvalidParams, `Validation failed — ${msg}`)
  }
  return result.data
}
