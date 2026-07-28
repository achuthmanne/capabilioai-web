// ─── Arena daily mission quota — server-side mirror ──────────────────────────
// The real source of truth for plan quotas is frontend/src/config/plans.js's
// STUDENT_PLANS (arenaTasks: 1/3/6 for free/pro/elite). That file can't be
// imported here (it lives in the frontend build, not the backend), so this
// is a deliberately small, manually-kept-in-sync mirror — update both files
// together if the quota numbers ever change.
//
// USE: /api/arena/review (2026-07-28) — until now, the daily mission-slot
// limit was UI-only (frontend/src/hooks/useDomainChallengeSlots.js only ever
// generated as many slots as the plan allowed). Nothing stopped a
// technically inclined free-tier user from POSTing directly to /review for
// a 4th/5th/6th mission and still getting a real, server-written ELO
// delta — the "locked" UI state was cosmetic, not enforced. This module is
// the real gate: /review now checks it before writing any ELO.
const STUDENT_ARENA_QUOTA = { free: 1, pro: 3, elite: 6 }

export function getArenaTaskQuota(subscriptionId) {
  return STUDENT_ARENA_QUOTA[subscriptionId] ?? STUDENT_ARENA_QUOTA.free
}

// Counts how many domain-challenge slots this user has already completed
// today, across all domains — matches how useDomainChallengeSlots.js writes
// completions (arena_missions row per slot, slot_data.status flips to
// "cooldown" with slot_data.completedAt set, and updated_at touched at the
// same moment). Fails OPEN (returns 0) on a read error — a bug in this
// quota check must never block a legitimate submission.
export async function countTodaysDomainMissionCompletions(db, uid) {
  try {
    const startOfToday = new Date()
    startOfToday.setUTCHours(0, 0, 0, 0)
    const { data, error } = await db
      .from("arena_missions")
      .select("slot_data, updated_at")
      .eq("user_id", uid)
      .gte("updated_at", startOfToday.toISOString())
    if (error) return 0
    return (data || []).filter(r => r?.slot_data?.status === "cooldown").length
  } catch {
    return 0
  }
}
