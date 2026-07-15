/**
 * shared/permissions.ts
 *
 * Role-based access control for MCP tools.
 * Maps Capabilio roles → permitted tool namespaces + actions.
 *
 * Roles (from Supabase app_metadata.role):
 *   student           — default for all registered students
 *   recruiter         — hiring companies browsing candidates
 *   institution_admin — college TPO / placement officer
 *   admin             — Capabilio internal admin
 */

import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import type { CapabilioUser } from "./auth.js"

// ─── Permission map ────────────────────────────────────────────────────────────
// Each entry is "can this role call this tool namespace?"
// Finer-grained checks (e.g. "recruiter can only see public data") are enforced
// inside the tool handler by comparing uid in the request to the JWT sub.

type Role     = "student" | "recruiter" | "institution_admin" | "admin"
type Namespace = "student" | "arena" | "skillStudio" | "elo" | "vault" |
                 "launchpad" | "interview" | "recruiter" | "college" | "analytics"

const PERMISSIONS: Record<Role, Set<Namespace>> = {
  student: new Set([
    "student", "arena", "skillStudio", "elo", "vault", "launchpad", "interview",
  ]),
  recruiter: new Set([
    "recruiter", "student",  // recruiter can read public student profile
  ]),
  institution_admin: new Set([
    "college", "student", "analytics",
  ]),
  admin: new Set([
    "student", "arena", "skillStudio", "elo", "vault", "launchpad",
    "interview", "recruiter", "college", "analytics",
  ]),
}

/**
 * Asserts that the authenticated user may access the given tool namespace.
 * Throws McpError(InvalidRequest) if permission is denied.
 */
export function assertPermission(user: CapabilioUser, namespace: Namespace): void {
  const role = (user.role ?? "student") as Role
  const allowed = PERMISSIONS[role] ?? PERMISSIONS.student

  if (!allowed.has(namespace)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Role '${role}' is not permitted to use the '${namespace}' tool namespace`
    )
  }
}

/**
 * Asserts that the requesting user owns the resource they're accessing.
 * Recruiter / institution_admin exceptions: they may view public-flagged data.
 *
 * @param user       — authenticated user from JWT
 * @param resourceUid — uid of the resource being accessed
 * @param publicOk   — if true, recruiters/admins may access without ownership
 */
export function assertOwnership(
  user: CapabilioUser,
  resourceUid: string,
  publicOk = false
): void {
  const role = (user.role ?? "student") as Role
  if (role === "admin") return                         // admin sees all
  if (publicOk && (role === "recruiter" || role === "institution_admin")) return
  if (user.id !== resourceUid) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Access denied: you can only access your own data"
    )
  }
}

/**
 * Returns true if this user is a recruiter or institution admin
 * (allowed to view public candidate/student data).
 */
export function canViewCandidates(user: CapabilioUser): boolean {
  const r = user.role as Role
  return r === "recruiter" || r === "institution_admin" || r === "admin"
}

/**
 * Returns true if this user is an institution admin or platform admin
 * (allowed to view department / college analytics).
 */
export function canViewCollegeAnalytics(user: CapabilioUser): boolean {
  const r = user.role as Role
  return r === "institution_admin" || r === "admin"
}

/**
 * Returns true if this user is a platform admin
 * (allowed to view platform-wide analytics).
 */
export function isAdmin(user: CapabilioUser): boolean {
  return (user.role as Role) === "admin"
}
