/**
 * roleGapSeeder.js — bootstraps Skill Studio V2's Learning Home from a
 * user's EXISTING role-gap data, instead of leaving them at a permanently
 * blank "start a journey" screen (loop-closure follow-up, 2026-07-29).
 *
 * V2 shipped as an intentionally clean-slate journey system — skill_journeys
 * starts empty for every user, nothing pre-populated (see
 * docs/skill-studio-v2-production-spec-2026-07-29.md). That's correct for a
 * brand-new signup, but it meant a user with a fully assessed profile
 * (skill_graph rows, ELO, resolved role) also saw an empty Learning Home,
 * because /skill-studio/home only ever reads skill_journeys/
 * skill_recommendations — tables V2 never writes to on the user's behalf.
 *
 * This module runs ONCE per user (gated by journeyPlanner.hasAnyJourneyEver
 * — never re-seeds after someone deliberately archives everything) and
 * auto-creates journeys for their lowest-scoring role skills, reusing:
 *   - roleConfig.js's `auraSkills` — the SAME single source of truth
 *     assessment.js and skillGraph.js's /pro/skills/gaps already resolve
 *     through (2026-07-27 taxonomy unification) — no second skill-name list.
 *   - the live `skill_graph` table — the SAME table arena.js's
 *     GET /api/arena/skill-graph reads for the Aura radar — no second
 *     per-skill score source.
 *   - createOrGetJourney() — the SAME journey-creation path the manual
 *     "Start a new skill journey" button already calls, already idempotent
 *     on (user, skill_graph_node_id) — no second journey-creation model.
 */
import { supabaseAdmin } from "../supabase.js"
import { getRoleConfig } from "../../../../frontend/src/config/roleConfig.js"
import { eloValueToRadarScore } from "../../routes/arena.js"
import { createOrGetJourney, hasAnyJourneyEver } from "./journeyPlanner.js"

export const defaultDeps = { supabaseAdmin, getRoleConfig, eloValueToRadarScore, createOrGetJourney, hasAnyJourneyEver }

const CRITICAL_THRESHOLD = 50
const MAX_SEEDED_JOURNEYS = 4

/** Same role-resolution fallback chain skillGraph.js's /pro/skills/gaps
 *  already uses (target_role → keyword → most recent experience title →
 *  generic default) — kept identical so Skill Studio and the Aura gap
 *  view can never resolve a different role for the same user. */
export function resolveJobTitle(profile) {
  const exps = Array.isArray(profile?.experiences) ? profile.experiences : []
  const currentExp = exps.find((e) => e?.isCurrent || e?.current) || exps[0]
  return profile?.target_role || profile?.keyword || currentExp?.role || currentExp?.title || "Professional"
}

/** Merge role.auraSkills (target list) with the user's live skill_graph rows
 *  (actual scores) and return the lowest-scoring ones as candidate gaps —
 *  same "sort ascending, isCritical if < 50" shape as the legacy
 *  SkillStudio.jsx's client-side buildGaps(), just computed server-side
 *  from the real per-user table instead of a prop the caller had to fetch. */
export function computeCriticalGaps(auraSkills, skillGraphRows, deps = defaultDeps) {
  const byName = new Map((skillGraphRows || []).map((r) => [String(r.skill_name).toLowerCase().trim(), r]))
  const gaps = (auraSkills || []).map((label) => {
    const row = byName.get(label.toLowerCase().trim())
    const score = row ? deps.eloValueToRadarScore(row.elo_value) : 0
    return { label, score, isCritical: score < CRITICAL_THRESHOLD }
  })
  gaps.sort((a, b) => a.score - b.score)
  return gaps.filter((g) => g.isCritical).slice(0, MAX_SEEDED_JOURNEYS)
}

/**
 * seedJourneysFromRoleGaps — the entry point called from the /home route.
 * Idempotent at two levels: the caller only invokes this when
 * hasAnyJourneyEver(userId) is false, AND createOrGetJourney itself never
 * duplicates a journey for the same (user, skill) pair. Never throws — a
 * seeding failure should degrade to the pre-existing empty-state UI, not
 * break Learning Home entirely.
 */
export async function seedJourneysFromRoleGaps(userId, deps = defaultDeps) {
  try {
    const { data: profile, error: profileErr } = await deps.supabaseAdmin
      .from("profiles").select("target_role, keyword, experiences").eq("id", userId).maybeSingle()
    if (profileErr) throw profileErr

    const jobTitle = resolveJobTitle(profile)
    const role = deps.getRoleConfig(jobTitle)
    if (!role?.auraSkills?.length) return { seeded: [], reason: "role_has_no_aura_skills" }

    const { data: skillGraphRows, error: sgErr } = await deps.supabaseAdmin
      .from("skill_graph").select("skill_name, elo_value").eq("user_id", userId).eq("is_current", true)
    if (sgErr) throw sgErr

    const gaps = computeCriticalGaps(role.auraSkills, skillGraphRows, deps)
    if (gaps.length === 0) return { seeded: [], reason: "no_critical_gaps" }

    const seeded = []
    for (const gap of gaps) {
      const result = await deps.createOrGetJourney({
        userId, skillName: gap.label, domainKey: role.arenaKey || null, targetRole: role.label,
      })
      seeded.push({ skillName: gap.label, score: gap.score, journeyId: result.journey.id, created: result.created })
    }
    return { seeded, jobTitle, domainKey: role.arenaKey || null }
  } catch (e) {
    console.error("[skillStudio/roleGapSeeder] seeding failed, Learning Home falls back to empty state:", e.message)
    return { seeded: [], error: e.message }
  }
}

/** Convenience wrapper for the /home route: only seeds if this user has
 *  never had a journey, no-ops otherwise. Returns true if seeding actually
 *  ran (so the caller knows to re-fetch journeys/recommendations). */
export async function seedIfFirstVisit(userId, deps = defaultDeps) {
  const hasJourney = await deps.hasAnyJourneyEver(userId)
  if (hasJourney) return false
  await seedJourneysFromRoleGaps(userId, deps)
  return true
}
