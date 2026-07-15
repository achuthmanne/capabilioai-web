/**
 * shared/registry.ts
 *
 * Role Registry bridge for the MCP layer.
 *
 * The canonical source of truth is:
 *   - frontend/src/config/roleConfig.js   (role → skills/tags/label registry)
 *   - frontend/src/config/arenaDomains.js (workbench registry + per-domain
 *                                          mission categories — the
 *                                          Role → Skill → Mission → Workbench
 *                                          architecture)
 *
 * This file does NOT hand-copy those registries. `mcp/` is a separate
 * Node/TS package from the Vite-built frontend, so it cannot `import` the
 * frontend source directly across the package boundary inside `tsc`'s
 * `rootDir`/`include` restrictions. Instead:
 *
 *   `scripts/generate-registry.js` imports roleConfig.js / arenaDomains.js
 *   directly (both are plain ESM with no JSX / import.meta.env / bundler
 *   syntax, so plain Node `import()` works) and snapshots them to:
 *
 *     src/shared/role-registry.generated.json
 *     src/shared/arena-domains.generated.json
 *
 *   That script runs automatically via the "prebuild" npm script (see
 *   mcp/package.json), so a stale snapshot can't silently ship with a build.
 *   Run `npm run generate-registry` manually during local dev after editing
 *   roleConfig.js / arenaDomains.js.
 *
 * DO NOT hand-edit the *.generated.json files — regenerate them instead.
 * Adding a role in roleConfig.js (or a workbench/mission in arenaDomains.js)
 * and re-running the generator is the *only* step needed for it to show up
 * here — no second manual edit of this file.
 */

import roleRegistrySnapshot from "./role-registry.generated.json" with { type: "json" }
import arenaDomainsSnapshot from "./arena-domains.generated.json" with { type: "json" }

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RoleConfig {
  id:                string    // roleId — matches frontend roleConfig.js `id`
  label:             string    // human-readable name
  slug:              string    // career_tracks.slug
  stream:            string    // broad stream (IT, ECE, EEE, ...)
  arenaKey:          string    // ARENA_DOMAINS key (workbench/mission lookup)
  challengeKey:      string    // getDomainChallenges() key (may differ from arenaKey)
  color:             string
  aliases:           string[]  // alternate job titles
  keywords:          string[]  // Arena/API search keywords
  auraSkills:        string[]  // skills shown on Aura dashboard
  assessmentSkills:  string[]  // MCQ generation topics
  streamCategories:  string[]  // problem categories for catalog filter
  launchpadTags:     string[]  // job search tags
  pulseTopics:       string[]  // feed topic filters
  interviewFocus:    string[]  // AI interview topic hints
  /** Default workbench id for this role's domain — see getWorkbenchForRole(). */
  workbench:         string
}

export interface WorkbenchConfig {
  id:       string
  label:    string
  renderer: string             // React renderer component name ("code", "notebook", ...)
  icon?:    string
  desc?:    string
  lang?:    string
  usedBy:   string[]           // domain/role keys (or "all")
  widgets:  string[]
}

export interface MissionCategory {
  id:         string
  label:      string
  icon?:      string
  lang?:      string
  /** Preferred: resolves through WORKBENCH_REGISTRY. */
  workbench?: string
  /** Legacy: some older missions declare a sandbox type directly. */
  sandbox?:   string
}

// ─── Raw snapshot types (as emitted by generate-registry.js) ────────────────

interface RawDomain {
  key:               string
  label:             string
  arenaKey:          string
  defaultModule:     string | null
  defaultSandbox:    string
  modules:           Array<{ id: string; label: string; icon?: string; desc?: string; sandbox?: string }>
  missionCategories: MissionCategory[]
}

const ROLE_SNAPSHOT = roleRegistrySnapshot as { roles: Omit<RoleConfig, "workbench">[] }
const ARENA_SNAPSHOT = arenaDomainsSnapshot as {
  workbenches: Record<string, WorkbenchConfig>
  domains:     Record<string, RawDomain>
}

const WORKBENCH_REGISTRY: Record<string, WorkbenchConfig> = ARENA_SNAPSHOT.workbenches
const ARENA_DOMAINS: Record<string, RawDomain> = ARENA_SNAPSHOT.domains

const DEFAULT_WORKBENCH_ID = "code_ide"

/**
 * Resolve the default workbench id for a domain (arenaKey), data-driven —
 * no per-role hardcoding:
 *
 *   1. First mission category in the domain that declares `workbench`.
 *   2. Otherwise, a WORKBENCH_REGISTRY entry whose renderer matches the
 *      domain's defaultSandbox and whose usedBy includes this domain
 *      (or "all").
 *   3. Otherwise, any WORKBENCH_REGISTRY entry whose usedBy includes this
 *      domain (or "all").
 *   4. Otherwise, fall back to "code_ide".
 */
function resolveDefaultWorkbenchId(arenaKey: string): string {
  const domain = ARENA_DOMAINS[arenaKey]
  if (!domain) return DEFAULT_WORKBENCH_ID

  const fromMissions = domain.missionCategories.find((m) => m.workbench)?.workbench
  if (fromMissions && WORKBENCH_REGISTRY[fromMissions]) return fromMissions

  const bySandboxAndUsage = Object.values(WORKBENCH_REGISTRY).find(
    (w) => w.renderer === domain.defaultSandbox && (w.usedBy.includes(arenaKey) || w.usedBy.includes("all"))
  )
  if (bySandboxAndUsage) return bySandboxAndUsage.id

  const byUsage = Object.values(WORKBENCH_REGISTRY).find(
    (w) => w.usedBy.includes(arenaKey) || w.usedBy.includes("all")
  )
  if (byUsage) return byUsage.id

  return DEFAULT_WORKBENCH_ID
}

// ─── Build the RoleConfig registry (workbench field derived, not hand-copied) ─

const ROLE_REGISTRY: RoleConfig[] = ROLE_SNAPSHOT.roles.map((r) => ({
  ...r,
  workbench: resolveDefaultWorkbenchId(r.arenaKey),
}))

// ─── Lookup maps ──────────────────────────────────────────────────────────────

const BY_ID   = new Map<string, RoleConfig>(ROLE_REGISTRY.map((r) => [r.id, r]))
const BY_SLUG = new Map<string, RoleConfig>(ROLE_REGISTRY.map((r) => [r.slug, r]))

// keyword/alias → role, longest string first so specific keywords win over
// generic ones (mirrors roleConfig.js's getRoleConfig() matching order).
const KEYWORD_ENTRIES: Array<{ kw: string; role: RoleConfig }> = ROLE_REGISTRY.flatMap((role) =>
  [...role.keywords, ...role.aliases].map((kw) => ({ kw: kw.toLowerCase(), role }))
).sort((a, b) => b.kw.length - a.kw.length)

/**
 * Resolve a role config from any of: roleId, slug, or a keyword/alias
 * (exact match first, then substring match — same precedence as
 * roleConfig.js's getRoleConfig()). Returns undefined if no match — tools
 * should fall back gracefully.
 */
export function resolveRole(hint: string): RoleConfig | undefined {
  const lower = hint.toLowerCase().trim()
  if (!lower) return undefined

  const byId = BY_ID.get(lower)
  if (byId) return byId

  const bySlug = BY_SLUG.get(lower)
  if (bySlug) return bySlug

  for (const { kw, role } of KEYWORD_ENTRIES) {
    if (lower.includes(kw)) return role
  }

  return undefined
}

/**
 * Resolve role from a profile object (tries keyword, job_role, target_role,
 * career_track_slug). Falls back to a default SWE config so tools always
 * have something to work with.
 */
export function resolveRoleFromProfile(profile: Record<string, unknown>): RoleConfig {
  const candidates = [
    profile["roleId"],
    profile["keyword"],
    profile["job_role"],
    profile["target_role"],
    profile["career_track_slug"],
  ]
  for (const c of candidates) {
    if (typeof c === "string" && c) {
      const found = resolveRole(c)
      if (found) return found
    }
  }
  return BY_ID.get("swe")! // safe fallback — swe is always defined
}

// ─── Workbench / mission accessors ───────────────────────────────────────────
// Mirrors arenaDomains.js's "Role → Skill → Mission → Workbench → Renderer"
// architecture and arenaV2.js's data model (challenges belong to a
// `domain_key` == arenaKey; submissions record a `workspace_type` that
// corresponds to a workbench's `renderer`).

/**
 * Returns the full workbench config for a role's domain — this is what
 * MCP tool `getWorkbenchForRole` should return.
 */
export function getWorkbenchForRole(roleId: string): WorkbenchConfig | undefined {
  const role = resolveRole(roleId)
  if (!role) return undefined
  return WORKBENCH_REGISTRY[role.workbench] ?? WORKBENCH_REGISTRY[DEFAULT_WORKBENCH_ID]
}

/**
 * Returns the raw workbench registry (all workbenches), for tools that need
 * to enumerate every renderer/environment the Arena supports.
 */
export function getAllWorkbenches(): WorkbenchConfig[] {
  return Object.values(WORKBENCH_REGISTRY)
}

/**
 * Returns the mission categories for a role's domain (arenaKey), each
 * resolved to its full workbench config where available. This is the real
 * "mission" data model from arenaDomains.js — not a parallel invented one.
 * Falls back to the domain's `modules` (legacy per-domain workstation tabs)
 * if `missionCategories` is empty.
 */
export function getMissionsForRole(
  roleId: string
): Array<MissionCategory & { workbenchConfig?: WorkbenchConfig }> {
  const role = resolveRole(roleId)
  if (!role) return []

  const domain = ARENA_DOMAINS[role.arenaKey]
  if (!domain) return []

  // Normalize both shapes (missionCategories vs. legacy modules) into
  // MissionCategory before resolving workbenchConfig, so exactOptionalPropertyTypes
  // doesn't see two structurally different object shapes.
  const missions: MissionCategory[] = domain.missionCategories.length > 0
    ? domain.missionCategories
    : domain.modules.map((m): MissionCategory => ({
        id: m.id,
        label: m.label,
        ...(m.icon !== undefined ? { icon: m.icon } : {}),
        ...(m.sandbox !== undefined ? { sandbox: m.sandbox } : {}),
      }))

  return missions.map((m) => ({
    ...m,
    ...(m.workbench && WORKBENCH_REGISTRY[m.workbench]
      ? { workbenchConfig: WORKBENCH_REGISTRY[m.workbench] }
      : {}),
  }))
}

export { ROLE_REGISTRY, WORKBENCH_REGISTRY, ARENA_DOMAINS }
