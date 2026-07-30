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
 * This module auto-creates journeys for a user's role skills, reusing:
 *   - roleConfig.js's `auraSkills` — the SAME single source of truth
 *     assessment.js and skillGraph.js's /pro/skills/gaps already resolve
 *     through (2026-07-27 taxonomy unification) — no second skill-name list.
 *   - the live `skill_graph` table — the SAME table arena.js's
 *     GET /api/arena/skill-graph reads for the Aura radar — no second
 *     per-skill score source.
 *   - createOrGetJourney() — the SAME journey-creation path the manual
 *     "Start a new skill journey" button already calls, already idempotent
 *     on (user, skill_graph_node_id) — no second journey-creation model.
 *
 * BEHAVIOR CHANGE (2026-07-30): this used to seed ONLY the 4 lowest-scoring
 * "critical" (<50%) skills, ONCE EVER (gated by hasAnyJourneyEver, never
 * revisited). That's why an 11-skill role like Data Analyst only ever
 * produced 4 Learning Home journeys, permanently — including for skills the
 * user later improved to 0% via Aura but never had a journey seeded because
 * their FIRST visit happened to have >4 skills below the threshold and only
 * the first 4 (by array order, all tied at a 0% score) won the slice. A
 * user complaint ("11 skills in Aura, only 4 modules in Skill Studio") is
 * the direct, correct symptom of that design. Fixed: every role skill gets
 * a journey (no cap, no <50% filter — a 100%-scored skill still gets a
 * lightweight journey so the user can keep sharpening it), and seeding now
 * runs as an idempotent SYNC on every /home load rather than a one-time
 * event, so it naturally catches skills added to a role's auraSkills list
 * later, or any skill that slipped through on a prior partial failure.
 * Journeys are still ordered lowest-score-first (priority_rank), so the
 * weakest skills surface at the top of Active Journeys / Next Best Skill
 * regardless of how many total journeys now exist.
 */
import { supabaseAdmin } from "../supabase.js"
import { getRoleConfig } from "../../../../frontend/src/config/roleConfig.js"
import { eloValueToRadarScore } from "../../routes/arena.js"
import { createOrGetJourney, hasAnyJourneyEver, listJourneysForUser } from "./journeyPlanner.js"

export const defaultDeps = { supabaseAdmin, getRoleConfig, eloValueToRadarScore, createOrGetJourney, hasAnyJourneyEver, listJourneysForUser }

const CRITICAL_THRESHOLD = 50

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
 *  (actual scores) and return ALL of them, sorted lowest-score-first, each
 *  tagged isCritical (<50%) for UI/prioritisation purposes only — no longer
 *  used to filter skills out of seeding (see 2026-07-30 note above). */
export function computeCriticalGaps(auraSkills, skillGraphRows, deps = defaultDeps) {
  const byName = new Map((skillGraphRows || []).map((r) => [String(r.skill_name).toLowerCase().trim(), r]))
  const gaps = (auraSkills || []).map((label) => {
    const row = byName.get(label.toLowerCase().trim())
    const score = row ? deps.eloValueToRadarScore(row.elo_value) : 0
    return { label, score, isCritical: score < CRITICAL_THRESHOLD }
  })
  gaps.sort((a, b) => a.score - b.score)
  return gaps
}

/**
 * seedJourneysFromRoleGaps — creates a journey for every one of the user's
 * resolved role skills that doesn't already have one. createOrGetJourney is
 * idempotent per (user, skill_graph_node_id), so calling this repeatedly
 * (see syncMissingJourneys below) never creates duplicates. Never throws —
 * a seeding failure should degrade to the pre-existing empty-state UI, not
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
    if (gaps.length === 0) return { seeded: [], reason: "no_gaps" }

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
 *  ran (so the caller knows to re-fetch journeys/recommendations).
 *  Kept for the one-time "brand new profile" bootstrap case; the /home
 *  route also calls syncMissingJourneys (below) on every load so a user
 *  is never permanently stuck with a partial set of journeys. */
export async function seedIfFirstVisit(userId, deps = defaultDeps) {
  const hasJourney = await deps.hasAnyJourneyEver(userId)
  if (hasJourney) return false
  await seedJourneysFromRoleGaps(userId, deps)
  return true
}

/**
 * syncMissingJourneys — always-safe-to-call sync: creates a journey for any
 * role skill the user doesn't yet have an ACTIVE journey for. Unlike
 * seedIfFirstVisit, this is NOT gated to "never had a journey before" — it
 * runs on every /home load so a role skill added later, or one that failed
 * to seed on a prior partial run, still eventually gets a journey. Cheap:
 * one profile read, one skill_graph read, one journeys-list read, then only
 * as many createOrGetJourney calls as there are still-missing skills (0 on
 * every visit after the first successful sync). Never throws.
 */
export async function syncMissingJourneys(userId, deps = defaultDeps) {
  try {
    const { data: profile, error: profileErr } = await deps.supabaseAdmin
      .from("profiles").select("target_role, keyword, experiences").eq("id", userId).maybeSingle()
    if (profileErr) throw profileErr

    const jobTitle = resolveJobTitle(profile)
    const role = deps.getRoleConfig(jobTitle)
    if (!role?.auraSkills?.length) return { seeded: [], reason: "role_has_no_aura_skills" }

    const [{ data: skillGraphRows, error: sgErr }, existingJourneys] = await Promise.all([
      deps.supabaseAdmin.from("skill_graph").select("skill_name, elo_value").eq("user_id", userId).eq("is_current", true),
      deps.listJourneysForUser(userId, "active"),
    ])
    if (sgErr) throw sgErr

    const existingLabels = new Set(
      existingJourneys.map((j) => String(j.skill_graph_nodes?.label || "").toLowerCase().trim()).filter(Boolean)
    )
    const gaps = computeCriticalGaps(role.auraSkills, skillGraphRows, deps)
      .filter((g) => !existingLabels.has(g.label.toLowerCase().trim()))
    if (gaps.length === 0) return { seeded: [], reason: "already_synced" }

    const seeded = []
    for (const gap of gaps) {
      const result = await deps.createOrGetJourney({
        userId, skillName: gap.label, domainKey: role.arenaKey || null, targetRole: role.label,
      })
      seeded.push({ skillName: gap.label, score: gap.score, journeyId: result.journey.id, created: result.created })
    }
    return { seeded, jobTitle, domainKey: role.arenaKey || null }
  } catch (e) {
    console.error("[skillStudio/roleGapSeeder] syncMissingJourneys failed:", e.message)
    return { seeded: [], error: e.message }
  }
}
