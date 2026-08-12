/**
 * homeV1.js — Career OS Workstream 1: Home command-center API.
 * docs/career-os-implementation-plan.md §Workstream 1.
 *
 * GET /api/pro/v1/home/priority — the single "Today's Priority" recommendation.
 * Versioned under /pro/v1/ per the blueprint's API-design section, without
 * touching any existing unversioned /pro/* route.
 *
 * This route only reads data (profiles, user_skills, weekly_pulses) — it
 * never triggers pulse generation or any other side effect, so loading Home
 * can't kick off background AI calls the user didn't ask for. If this
 * week's pulse hasn't been generated yet, that's surfaced honestly as "no
 * pulse this week yet" rather than silently generating one.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { computeTodayPriority } from "../lib/homePriority.js"

const router = Router()

// Monday of the current week, as YYYY-MM-DD — same definition as
// weeklyPulse.js's currentWeekOf(), duplicated here deliberately (tiny pure
// function) rather than importing a private helper across route files.
function currentWeekOf(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + diff)
  return date.toISOString().slice(0, 10)
}

router.get("/pro/v1/home/priority", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const weekOf = currentWeekOf()

    const [{ data: profile, error: profileErr }, { count: skillsCount }, { data: pulse }] = await Promise.all([
      supabaseAdmin.from("profiles")
        .select("target_role,keyword,experiences,vault_files,uan_verified,verified,profile_summary")
        .eq("id", uid).single(),
      supabaseAdmin.from("user_skills")
        .select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabaseAdmin.from("weekly_pulses")
        .select("status").eq("user_id", uid).eq("week_of", weekOf).maybeSingle(),
    ])

    // Don't silently treat a failed profile fetch as "no resume data" — that
    // previously masked a bug where an invalid .select() column list made
    // this query error on every request, permanently pinning the "upload
    // resume" banner regardless of actual profile content.
    if (profileErr) {
      console.error("[home/priority] profiles fetch failed", profileErr)
    }

    const experiences = Array.isArray(profile?.experiences) ? profile.experiences : []
    const vaultFiles  = Array.isArray(profile?.vault_files)  ? profile.vault_files  : []

    let weeklyPulseStatus = "none"
    if (pulse?.status === "completed") weeklyPulseStatus = "done"
    else if (pulse?.status === "in_progress") weeklyPulseStatus = "in_progress"
    else if (pulse?.status) weeklyPulseStatus = "due"

    const ctx = {
      hasResumeOrTimeline: experiences.length > 0 || vaultFiles.length > 0,
      weeklyPulseStatus,
      hasTargetRole: !!(profile?.target_role || profile?.keyword),
      isEmploymentVerified: !!(profile?.uan_verified || profile?.verified),
      skillsCount: skillsCount || 0,
      hasSummary: !!profile?.profile_summary,
    }

    const priority = computeTodayPriority(ctx)
    res.json({ priority })
  } catch (err) {
    console.error("[home/priority]", err)
    res.status(500).json({ error: "Failed to compute priority" })
  }
})

export default router
