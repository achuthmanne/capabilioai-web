/**
 * shared/auth.ts
 *
 * JWT verification for MCP tools — mirrors backend/server/lib/auth.js but in TS.
 * Uses local SUPABASE_JWT_SECRET verification (zero network calls).
 * Falls back to Supabase network call if secret not configured.
 *
 * SECURITY: Never log the raw JWT. Only log userId and role.
 */

import jwt from "jsonwebtoken"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"

export interface CapabilioUser {
  id:    string
  email: string
  /** Supabase app_metadata role: 'student' | 'recruiter' | 'institution_admin' | 'admin' */
  role:  string
  /** Raw JWT claims */
  claims: Record<string, unknown>
}

interface JwtPayload {
  sub:              string
  email?:           string
  role?:            string
  app_metadata?:    { role?: string }
  user_metadata?:   Record<string, unknown>
  [key: string]:    unknown
}

/**
 * Verifies a Supabase JWT and returns the authenticated user.
 * Throws McpError(InvalidRequest) on failure so the MCP protocol
 * surfaces it correctly to the AI client.
 */
export function verifyJWT(token: string): CapabilioUser {
  if (!token || token.length < 20) {
    throw new McpError(ErrorCode.InvalidRequest, "Missing or malformed JWT")
  }

  const secret = process.env.SUPABASE_JWT_SECRET

  if (!secret) {
    throw new McpError(
      ErrorCode.InternalError,
      "MCP server is not configured: SUPABASE_JWT_SECRET missing"
    )
  }

  let payload: JwtPayload
  try {
    payload = jwt.verify(token, secret) as JwtPayload
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "JWT verification failed"
    throw new McpError(ErrorCode.InvalidRequest, `Unauthorized: ${msg}`)
  }

  if (!payload.sub) {
    throw new McpError(ErrorCode.InvalidRequest, "Unauthorized: JWT missing sub claim")
  }

  // Supabase stores the app role in app_metadata.role; fall back to top-level role claim
  const role =
    (payload.app_metadata?.role as string | undefined) ??
    payload.role ??
    "student"

  return {
    id:     payload.sub,
    email:  payload.email ?? "",
    role,
    claims: payload as Record<string, unknown>,
  }
}

/**
 * Extracts a Bearer JWT from the Authorization header string.
 * Returns empty string if not present (callee must handle).
 */
export function extractBearer(authHeader: string | undefined): string {
  if (!authHeader) return ""
  return authHeader.replace(/^Bearer\s+/i, "").trim()
}
