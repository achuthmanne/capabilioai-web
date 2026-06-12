/**
 * arenaV2.js — Arena v2 extended routes
 *
 * Mounted at /api/arena/v2 in server.js
 *
 * New endpoints:
 *   GET  /catalog                     — challenge catalog with full filters
 *   GET  /challenges/:id              — challenge detail + user status
 *   POST /challenges/:id/save         — toggle save
 *   POST /challenges/:id/start        — begin attempt (create record)
 *   POST /challenges/:id/submit       — submit solution, trigger eval pipeline
 *   GET  /streaks/:uid                — streak heatmap + milestones
 *   POST /streaks/record-activity     — called internally after submission
 *   GET  /leaderboard                 — multi-scope leaderboard
 *   GET  /elo/:uid                    — full ELO breakdown + history
 *   GET  /recruiter/candidates        — filtered candidate pool for recruiters
 *   GET  /recruiter/proof/:uid        — all public proof artifacts for a user
 */

import { Router }  from "express"
import { supabase } from "../lib/supabase.js"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { gradeSubmission } from "../lib/claude.js"

const router = Router()

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10)

// ELO formula (same as frontend — single source of truth in constants)
const CHALLENGE_ELO = { Easy: 800, Medium: 1100, Hard: 1400, Expert: 1700 }

function computeEloUpdate({ userElo, difficulty, score, attempts, timeTakenSecs, estimatedSecs }) {
  const challengeElo = CHALLENGE_ELO[difficulty] || 1100
  const expected     = 1 / (1 + Math.pow(10, (challengeElo - userElo) / 400))
  const actual       = Math.max(0, Math.min(1, score / 100))
  const K            = userElo < 800 ? 48 : userElo < 1100 ? 36 : userElo < 1400 ? 28 : 20
  const attemptMult  = Math.max(0.4, 1 - (Math.max(1, attempts) - 1) * 0.15)
  const timeRatio    = estimatedSecs > 0 ? timeTakenSecs / estimatedSecs : 1
  const timeBonus    = timeRatio < 0.5 ? 1.10 : timeRatio < 0.75 ? 1.05 : 1.00
  let   delta        = Math.round(K * (actual - expected) * attemptMult * timeBonus)
  if (actual >= 0.7 && delta < 3) delta = 3
  if (delta < -30) delta = -30
  return { delta, newElo: Math.max(100, userElo + delta) }
}

// Auth guard — extract user_id from Supabase JWT
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "Authentication required" })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: "Invalid token" })
  req.user = user
  next()
}

// ─── GET /catalog ─────────────────────────────────────────────────────────────
// Paginated challenge browser with full filter support.
// Falls back to seeded data if challenges table is empty (dev convenience).
router.get("/catalog", async (req, res) => {
  try {
    const {
      type, domain, difficulty, company_name, status = "active",
      source, is_company_sponsored, is_recruiter_visible,
      has_dataset, is_contest, search, sort_by = "freshness",
      page = 1, limit = 20,
      min_elo_impact, max_elo_impact,
    } = req.query

    let q = supabase
      .from("challenges")
      .select("*", { count: "exact" })
      .eq("status", status)

    if (type)                  q = q.eq("type", type)
    if (domain)                q = q.eq("domain", domain)
    if (difficulty)            q = q.eq("difficulty", difficulty)
    if (company_name)          q = q.ilike("company_name", `%${company_name}%`)
    if (source)                q = q.eq("source", source)
    if (is_company_sponsored !== undefined) q = q.eq("is_company_sponsored", is_company_sponsored === "true")
    if (is_recruiter_visible !== undefined) q = q.eq("is_recruiter_visible", is_recruiter_visible === "true")
    if (has_dataset === "true") q = q.not("dataset_url", "is", null)
    if (is_contest === "true")  q = q.eq("is_contest", true)
    if (min_elo_impact)        q = q.gte("elo_impact", parseInt(min_elo_impact))
    if (max_elo_impact)        q = q.lte("elo_impact", parseInt(max_elo_impact))
    if (search)                q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`)

    // Sort
    if (sort_by === "elo")        q = q.order("elo_impact", { ascending: false })
    else if (sort_by === "popular") q = q.order("participation_count", { ascending: false })
    else                          q = q.order("created_at", { ascending: false })  // freshness

    // Pagination
    const pageNum  = Math.max(1, parseInt(page))
    const pageSize = Math.min(50, Math.max(1, parseInt(limit)))
    q = q.range((pageNum - 1) * pageSize, pageNum * pageSize - 1)

    const { data, error, count } = await q
    if (error) throw error

    // If table is empty (fresh install), return static fallback set
    if (!data || data.length === 0) {
      return res.json({ challenges: FALLBACK_CHALLENGES, total: FALLBACK_CHALLENGES.length, page: 1, is_fallback: true })
    }

    return res.json({ challenges: data, total: count || data.length, page: pageNum })
  } catch (e) {
    console.error("[arenaV2/catalog]", e.message)
    // Always return something — never 500 on catalog
    return res.json({ challenges: FALLBACK_CHALLENGES, total: FALLBACK_CHALLENGES.length, page: 1, is_fallback: true })
  }
})

// ─── GET /challenges/:id ──────────────────────────────────────────────────────
router.get("/challenges/:id", async (req, res) => {
  try {
    const { id } = req.params
    const token   = req.headers.authorization?.replace("Bearer ", "")
    let userId    = null
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id
    }

    const { data: challenge, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", id)
      .eq("status", "active")
      .single()

    if (error || !challenge) return res.status(404).json({ error: "Challenge not found" })

    // Fetch user's attempt status + save status
    let userStatus = { attempted: false, best_score: null, attempts: 0, saved: false }
    if (userId) {
      const [attemptsResult, saveResult] = await Promise.all([
        supabase.from("challenge_attempts")
          .select("id, score, status, submitted_at")
          .eq("user_id", userId)
          .eq("challenge_id", id)
          .order("created_at", { ascending: false }),
        supabase.from("challenge_saves")
          .select("id")
          .eq("user_id", userId)
          .eq("challenge_id", id)
          .maybeSingle(),
      ])
      const attempts = attemptsResult.data || []
      const best     = attempts.filter(a => a.score != null).sort((a,b) => b.score - a.score)[0]
      userStatus = {
        attempted:  attempts.length > 0,
        best_score: best?.score || null,
        attempts:   attempts.length,
        saved:      !!saveResult.data,
      }
    }

    return res.json({ challenge, user_status: userStatus })
  } catch (e) {
    console.error("[arenaV2/challenges/:id]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /challenges/:id/save ────────────────────────────────────────────────
router.post("/challenges/:id/save", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const userId  = req.user.id

    // Toggle: check if exists
    const { data: existing } = await supabase
      .from("challenge_saves")
      .select("id")
      .eq("user_id", userId)
      .eq("challenge_id", id)
      .maybeSingle()

    if (existing) {
      await supabase.from("challenge_saves")
        .delete().eq("user_id", userId).eq("challenge_id", id)
      return res.json({ saved: false })
    } else {
      await supabase.from("challenge_saves")
        .insert({ user_id: userId, challenge_id: id })
      return res.json({ saved: true })
    }
  } catch (e) {
    console.error("[arenaV2/save]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /challenges/:id/start ───────────────────────────────────────────────
// Creates an in_progress attempt record and increments participation count.
router.post("/challenges/:id/start", requireAuth, async (req, res) => {
  try {
    const { id }  = req.params
    const userId   = req.user.id

    // Get challenge to validate it exists
    const { data: challenge, error: cErr } = await supabase
      .from("challenges")
      .select("id, difficulty, estimated_mins")
      .eq("id", id)
      .single()
    if (cErr || !challenge) return res.status(404).json({ error: "Challenge not found" })

    // Count existing attempts for this user+challenge (for attempt_number)
    const { count: existingAttempts } = await supabase
      .from("challenge_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("challenge_id", id)

    // Create attempt record
    const { data: attempt, error: aErr } = await supabase
      .from("challenge_attempts")
      .insert({
        user_id:        userId,
        challenge_id:   id,
        status:         "in_progress",
        attempt_number: (existingAttempts || 0) + 1,
      })
      .select()
      .single()

    if (aErr) throw aErr

    // Increment participation count (fire-and-forget)
    supabase.rpc("increment_challenge_participation", { p_challenge_id: id }).catch(() => {})

    return res.json({ attempt_id: attempt.id, attempt_number: attempt.attempt_number })
  } catch (e) {
    console.error("[arenaV2/start]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /challenges/:id/submit ─────────────────────────────────────────────
// Submit solution, trigger AI evaluation, update ELO, record proof artifact.
router.post("/challenges/:id/submit", requireAuth, async (req, res) => {
  try {
    const { id }   = req.params
    const userId    = req.user.id
    const {
      attempt_id,
      code,
      test_results = [],   // [{passed, actual, expected}] from client-side run
      time_taken_secs = 0,
      is_timed_out = false,
    } = req.body

    // Fetch challenge
    const { data: challenge } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", id)
      .single()
    if (!challenge) return res.status(404).json({ error: "Challenge not found" })

    // Fetch user ELO
    const { data: profile } = await supabase
      .from("profiles")
      .select("elo_rating, arena_completed, arena_streak, last_arena_date")
      .eq("id", userId)
      .single()
    const userElo = profile?.elo_rating || 800

    // AI evaluation (non-blocking fallback if fails)
    let aiReview = null
    if (!is_timed_out && code?.trim().length > 10) {
      try {
        aiReview = await gradeSubmission({
          challengeTitle:  challenge.title,
          scenario:        challenge.description,
          expectedOutput:  challenge.test_cases?.[0]?.expected || "",
          candidateAnswer: String(code).slice(0, 3500),
          eloRating:       userElo,
        })
      } catch (e) {
        // Fallback: rule-based score from test pass rate
        console.warn("[arenaV2/submit] AI grading failed:", e.message)
        const passed = test_results.filter(t => t.passed).length
        const total  = test_results.length || 1
        aiReview = {
          score:    Math.round((passed / total) * 100),
          summary:  `${passed}/${total} test cases passed.`,
          strengths: [],
          improvements: ["Graded by test results — AI review unavailable."],
          grade: passed === total ? "B" : "C",
        }
      }
    }

    const finalScore = is_timed_out ? Math.min(30, aiReview?.score || 0) : (aiReview?.score || 0)

    // Attempt count for ELO penalty
    const { count: attempts } = await supabase
      .from("challenge_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("challenge_id", id)

    // ELO computation
    const { delta, newElo } = computeEloUpdate({
      userElo,
      difficulty:     challenge.difficulty,
      score:          finalScore,
      attempts:       attempts || 1,
      timeTakenSecs:  time_taken_secs,
      estimatedSecs:  (challenge.estimated_mins || 30) * 60,
    })

    const grade = finalScore >= 90 ? "A+" : finalScore >= 80 ? "A" : finalScore >= 70 ? "B+" : finalScore >= 60 ? "B" : finalScore >= 50 ? "C" : "D"

    const feedbackPayload = {
      summary:      aiReview?.summary      || "Evaluation complete.",
      strengths:    aiReview?.strengths    || [],
      improvements: aiReview?.improvements || [],
      grade,
    }

    // Update attempt record
    const updateData = {
      status:          "evaluated",
      submitted_at:    new Date().toISOString(),
      evaluated_at:    new Date().toISOString(),
      code_snapshot:   String(code || "").slice(0, 20000),
      test_results:    test_results,
      score:           finalScore,
      elo_delta:       delta,
      feedback:        feedbackPayload,
      grade,
      time_taken_secs,
      is_timed_out,
    }

    if (attempt_id) {
      await supabase.from("challenge_attempts")
        .update(updateData)
        .eq("id", attempt_id)
        .eq("user_id", userId)
    } else {
      const { data: newAttempt } = await supabase
        .from("challenge_attempts")
        .insert({ user_id: userId, challenge_id: id, ...updateData })
        .select("id")
        .single()
      updateData.id = newAttempt?.id
    }

    // ELO history record
    await supabase.from("elo_history").insert({
      user_id:    userId,
      attempt_id: attempt_id || updateData.id,
      elo_before: userElo,
      elo_after:  newElo,
      delta,
      dimension:  "overall",
      reason:     `${challenge.title} (${challenge.difficulty}) — score ${finalScore}`,
    }).catch(() => {})

    // Proof artifact record
    if (finalScore >= 50) {
      await supabase.from("proof_artifacts").insert({
        user_id:              userId,
        attempt_id:           attempt_id || updateData.id,
        challenge_id:         id,
        artifact_type:        "code",
        storage_url:          `arena://challenge/${id}/attempt/${attempt_id}`,
        challenge_title:      challenge.title,
        challenge_type:       challenge.type,
        skills_demonstrated:  challenge.skills || [],
        technologies_used:    challenge.technologies || [],
        score:                finalScore,
        elo_change:           delta,
        time_taken_secs,
        attempts_count:       attempts || 1,
        trust_level:          test_results.length > 0 ? "verified" : "ai_graded",
        is_recruiter_visible: challenge.is_recruiter_visible,
      }).catch(() => {})
    }

    // Streak event
    supabase.rpc("upsert_streak_event", {
      p_user_id:    userId,
      p_date:       today(),
      p_domains:    [challenge.domain],
      p_elo_gained: Math.max(0, delta),
    }).catch(() => {})

    // Update profile ELO + solve count + streak
    const lastDate    = profile?.last_arena_date || ""
    const yesterday   = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const todayDate   = today()
    const newStreak   = lastDate === todayDate
      ? (profile?.arena_streak || 1)
      : lastDate === yesterday
        ? (profile?.arena_streak || 0) + 1
        : 1

    await supabase.from("profiles").update({
      elo_rating:       newElo,
      arena_completed:  (profile?.arena_completed || 0) + 1,
      arena_streak:     newStreak,
      last_arena_date:  todayDate,
      arena_last_active: new Date().toISOString(),
    }).eq("id", userId).catch(() => {})

    // Leaderboard upsert
    await supabase.from("arena_leaderboard").upsert({
      id:         `${userId}_overall`,
      user_id:    userId,
      domain_key: "overall",
      elo:        newElo,
      tasks_done: (profile?.arena_completed || 0) + 1,
      updated_at: new Date().toISOString(),
    }).catch(() => {})

    return res.json({
      score:        finalScore,
      elo_delta:    delta,
      new_elo:      newElo,
      grade,
      feedback:     feedbackPayload,
      new_streak:   newStreak,
      proof_created: finalScore >= 50,
    })
  } catch (e) {
    console.error("[arenaV2/submit]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── GET /streaks/:uid ────────────────────────────────────────────────────────
// Streak heatmap + stats. Returns 52 weeks of activity data.
router.get("/streaks/:uid", async (req, res) => {
  try {
    const { uid } = req.params

    // Profile streak data
    const { data: profile } = await supabase
      .from("profiles")
      .select("arena_streak, last_arena_date, arena_completed")
      .eq("id", uid)
      .single()

    // 52 weeks of streak events (heatmap source)
    const fromDate = new Date(Date.now() - 364 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { data: events } = await supabase
      .from("streak_events")
      .select("event_date, challenge_count, domains, elo_gained, is_freeze_used")
      .eq("user_id", uid)
      .gte("event_date", fromDate)
      .order("event_date", { ascending: false })

    // Compute longest streak from events
    const dateSet = new Set((events || []).map(e => e.event_date))
    let longestStreak = 0, curRun = 0
    const todayDate = today()
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      if (dateSet.has(d)) {
        curRun++
        if (curRun > longestStreak) longestStreak = curRun
      } else {
        curRun = 0
      }
    }

    // Domain-specific streaks
    const domainEvents = (events || []).reduce((acc, e) => {
      (e.domains || []).forEach(d => {
        if (!acc[d]) acc[d] = new Set()
        acc[d].add(e.event_date)
      })
      return acc
    }, {})
    const codingDomains = new Set(["swe","frontend","backend","fullstack","cyber","devops"])
    const codingDays = new Set([
      ...Object.entries(domainEvents)
        .filter(([d]) => codingDomains.has(d))
        .flatMap(([,days]) => [...days])
    ])
    const domainDays = new Set([
      ...Object.entries(domainEvents)
        .filter(([d]) => !codingDomains.has(d))
        .flatMap(([,days]) => [...days])
    ])

    // Build coding streak
    let codingStreak = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      if (codingDays.has(d)) codingStreak++
      else break
    }

    // Build domain streak
    let domainStreak = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      if (domainDays.has(d)) domainStreak++
      else break
    }

    // Milestones
    const currentStreak = profile?.arena_streak || 0
    const MILESTONES = [
      { days: 3,   label: "Ignition",       icon: "🔥", description: "3-day streak" },
      { days: 7,   label: "Weekly Warrior", icon: "⚔️",  description: "7-day streak" },
      { days: 14,  label: "Fortnight Focus",icon: "💎", description: "14-day streak" },
      { days: 30,  label: "Monthly Master", icon: "🏆", description: "30-day streak" },
      { days: 60,  label: "Iron Streak",    icon: "🦾", description: "60-day streak" },
      { days: 100, label: "Century Club",   icon: "💯", description: "100-day streak" },
    ]
    const milestones = MILESTONES.map(m => ({
      ...m,
      reached:    longestStreak >= m.days,
      is_next:    longestStreak < m.days && longestStreak >= (MILESTONES[MILESTONES.indexOf(m) - 1]?.days || 0),
      progress:   Math.min(100, Math.round((currentStreak / m.days) * 100)),
    }))

    return res.json({
      current_streak:     currentStreak,
      longest_streak:     longestStreak,
      last_active_date:   profile?.last_arena_date || null,
      total_active_days:  (events || []).length,
      total_submissions:  profile?.arena_completed || 0,
      freeze_available:   2,   // TODO: compute from plan
      freeze_used_count:  (events || []).filter(e => e.is_freeze_used).length,
      coding_streak:      codingStreak,
      domain_streak:      domainStreak,
      heatmap:            (events || []).map(e => ({
        date:            e.event_date,
        count:           e.challenge_count,
        elo_gained:      e.elo_gained,
        domains:         e.domains || [],
        is_freeze_used:  e.is_freeze_used,
      })),
      milestones,
    })
  } catch (e) {
    console.error("[arenaV2/streaks]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── GET /leaderboard ─────────────────────────────────────────────────────────
router.get("/leaderboard", async (req, res) => {
  try {
    const {
      scope_type = "global",
      scope_id   = "all",
      metric     = "elo",
      page       = 1,
      limit      = 50,
    } = req.query

    const pageNum  = Math.max(1, parseInt(page))
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)))

    // Try leaderboard_snapshots first (pre-computed, fast)
    const todayDate = today()
    const { data: snapshot } = await supabase
      .from("leaderboard_snapshots")
      .select("*, profiles(id, displayName, avatarUrl, path_type, elo_rating, arena_streak, keyword)")
      .eq("scope_type", scope_type)
      .eq("scope_id", scope_id)
      .eq("snapshot_date", todayDate)
      .order("rank", { ascending: true })
      .range((pageNum - 1) * pageSize, pageNum * pageSize - 1)

    if (snapshot && snapshot.length > 0) {
      return res.json({ entries: snapshot, scope_type, scope_id, from_snapshot: true })
    }

    // Fallback: compute live from arena_leaderboard (domain leaderboard)
    let q = supabase
      .from("arena_leaderboard")
      .select("*, profiles(id, displayName, avatarUrl, path_type, keyword, arena_streak)")

    if (scope_type === "domain" && scope_id !== "all") {
      q = q.eq("domain_key", scope_id)
    } else {
      q = q.eq("domain_key", "overall")
    }

    if (metric === "elo")        q = q.order("elo", { ascending: false })
    else if (metric === "tasks") q = q.order("tasks_done", { ascending: false })

    q = q.range((pageNum - 1) * pageSize, pageNum * pageSize - 1)
    const { data: liveData } = await q

    const entries = (liveData || []).map((row, i) => ({
      rank:        (pageNum - 1) * pageSize + i + 1,
      user_id:     row.user_id,
      elo:         row.elo,
      solve_count: row.tasks_done || 0,
      streak_score: row.profiles?.arena_streak || 0,
      display_name: row.profiles?.displayName || "Anonymous",
      avatar_url:   row.profiles?.avatarUrl,
      path_type:    row.profiles?.path_type,
      keyword:      row.profiles?.keyword,
    }))

    return res.json({ entries, scope_type, scope_id, from_snapshot: false })
  } catch (e) {
    console.error("[arenaV2/leaderboard]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── GET /elo/:uid ────────────────────────────────────────────────────────────
router.get("/elo/:uid", async (req, res) => {
  try {
    const { uid } = req.params

    const [profileRes, historyRes] = await Promise.all([
      supabase.from("profiles")
        .select("elo_rating, arena_completed, arena_streak, keyword")
        .eq("id", uid)
        .single(),
      supabase.from("elo_history")
        .select("elo_before, elo_after, delta, dimension, reason, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(90),
    ])

    const elo     = profileRes.data?.elo_rating || 800
    const history = historyRes.data || []

    // Tier computation
    const ELO_TIERS = [
      { min:0,    max:600,  label:"Rookie",       color:"#94A3B8", icon:"🌱" },
      { min:600,  max:800,  label:"Apprentice",   color:"#22C55E", icon:"⚡" },
      { min:800,  max:1000, label:"Practitioner", color:"#3B82F6", icon:"🔵" },
      { min:1000, max:1200, label:"Expert",       color:"#8B5CF6", icon:"💜" },
      { min:1200, max:1500, label:"Master",       color:"#F59E0B", icon:"🏆" },
      { min:1500, max:9999, label:"Elite",        color:"#EF4444", icon:"🔥" },
    ]
    const tier = ELO_TIERS.find(t => elo >= t.min && elo < t.max) || ELO_TIERS[0]

    // Per-dimension ELO (from history)
    const byDimension = history.reduce((acc, h) => {
      if (!acc[h.dimension]) acc[h.dimension] = h.elo_after
      return acc
    }, { overall: elo })

    // Global rank
    const { count: aboveCount } = await supabase
      .from("arena_leaderboard")
      .select("id", { count: "exact", head: true })
      .eq("domain_key", "overall")
      .gt("elo", elo)
    const globalRank = (aboveCount || 0) + 1

    return res.json({
      overall:       elo,
      by_dimension:  byDimension,
      tier,
      global_rank:   globalRank,
      total_solved:  profileRes.data?.arena_completed || 0,
      history:       history.map(h => ({
        date:      h.created_at?.slice(0, 10),
        elo:       h.elo_after,
        delta:     h.delta,
        dimension: h.dimension,
        reason:    h.reason,
      })),
    })
  } catch (e) {
    console.error("[arenaV2/elo]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── GET /recruiter/proof/:uid ────────────────────────────────────────────────
router.get("/recruiter/proof/:uid", async (req, res) => {
  try {
    const { uid } = req.params
    const { data: artifacts } = await supabase
      .from("proof_artifacts")
      .select("*")
      .eq("user_id", uid)
      .eq("is_recruiter_visible", true)
      .order("created_at", { ascending: false })
    return res.json({ artifacts: artifacts || [] })
  } catch (e) {
    console.error("[arenaV2/recruiter/proof]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── GET /recruiter/candidates ────────────────────────────────────────────────
router.get("/recruiter/candidates", async (req, res) => {
  try {
    const {
      challenge_type, min_score = 60, domain,
      min_elo = 700, college_id, limit = 50,
    } = req.query

    let q = supabase
      .from("proof_artifacts")
      .select("user_id, score, challenge_type, technologies_used, skills_demonstrated, trust_level, created_at, profiles(displayName, elo_rating, keyword, path_type)")
      .eq("is_recruiter_visible", true)
      .gte("score", parseInt(min_score))

    if (challenge_type) q = q.eq("challenge_type", challenge_type)
    q = q.order("score", { ascending: false }).limit(parseInt(limit))

    const { data } = await q
    return res.json({ candidates: data || [] })
  } catch (e) {
    console.error("[arenaV2/recruiter/candidates]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── FALLBACK CHALLENGES (when DB table is empty / unreachable) ───────────────
// These are real challenges with real structure — not placeholders.
// The frontend will show these while the DB is being populated.
const FALLBACK_CHALLENGES = [
  { id: "fb-1", slug: "two-sum", title: "Two Sum", description: "Return indices of two numbers that add up to target.", type: "dsa", domain: "swe", difficulty: "Easy", estimated_mins: 25, elo_impact: 15, technologies: ["Python","Java","JavaScript"], skills: ["Hash Map","Array Traversal"], sandbox_type: "code", language: "Python", company_name: "Capabilio", is_company_sponsored: false, is_recruiter_visible: true, proof_type: "code", participation_count: 4821, solve_count: 3241, tags: ["arrays","hashmap"], source: "capabilio", status: "active" },
  { id: "fb-2", slug: "customer-revenue-analysis", title: "Customer Revenue Analysis — Razorpay", description: "Write SQL to find top 10 merchants by revenue for Q1 2026, broken down by payment method.", type: "sql", domain: "dba", difficulty: "Medium", estimated_mins: 30, elo_impact: 22, technologies: ["PostgreSQL","SQL","CTEs"], skills: ["GROUP BY","JOIN","CTE","Aggregations"], sandbox_type: "sql", language: "SQL", company_name: "Razorpay", is_company_sponsored: true, is_recruiter_visible: true, proof_type: "code", participation_count: 1247, solve_count: 612, tags: ["sql","analytics","fintech"], source: "capabilio", status: "active" },
  { id: "fb-3", slug: "react-virtual-scroll-list", title: "Build a Virtualized List — CRED", description: "Build a high-performance virtualized list component that renders 10,000+ items without lag.", type: "frontend", domain: "frontend", difficulty: "Hard", estimated_mins: 60, elo_impact: 35, technologies: ["React","TypeScript","DOM APIs"], skills: ["Virtualization","Performance","React Hooks"], sandbox_type: "react", language: "TypeScript", company_name: "CRED", is_company_sponsored: true, is_recruiter_visible: true, proof_type: "live_demo", participation_count: 387, solve_count: 89, tags: ["react","performance","hard"], source: "capabilio", status: "active" },
  { id: "fb-4", slug: "sliding-window-rate-limiter", title: "Sliding Window Rate Limiter — PhonePe", description: "Implement a thread-safe sliding window rate limiter that handles burst traffic correctly.", type: "backend", domain: "backend", difficulty: "Hard", estimated_mins: 50, elo_impact: 32, technologies: ["TypeScript","Node.js","Algorithms"], skills: ["Sliding Window","Rate Limiting","Data Structures"], sandbox_type: "code", language: "TypeScript", company_name: "PhonePe", is_company_sponsored: true, is_recruiter_visible: true, proof_type: "code", participation_count: 892, solve_count: 201, tags: ["backend","algorithms","hard"], source: "capabilio", status: "active" },
  { id: "fb-5", slug: "ecommerce-data-cleaning", title: "Clean Flipkart Order Dataset", description: "Clean a messy CSV, handle nulls and outliers, produce a summary report with key metrics.", type: "data_analyst", domain: "data", difficulty: "Medium", estimated_mins: 40, elo_impact: 20, technologies: ["Python","Pandas","NumPy","Matplotlib"], skills: ["Data Cleaning","EDA","Pandas"], sandbox_type: "notebook", language: "Python", company_name: "Flipkart", is_company_sponsored: true, is_recruiter_visible: true, proof_type: "report", participation_count: 2103, solve_count: 1456, tags: ["data-cleaning","pandas","analytics"], source: "capabilio", status: "active" },
  { id: "fb-6", slug: "design-url-shortener", title: "Design a URL Shortening Service", description: "System design for 100M URLs and 1B redirects/day. Capacity estimates, API design, and architecture.", type: "system_design", domain: "swe", difficulty: "Medium", estimated_mins: 45, elo_impact: 28, technologies: ["System Design","PostgreSQL","Redis","CDN"], skills: ["Capacity Estimation","API Design","Sharding","Caching"], sandbox_type: "diagram", language: "Markdown", company_name: "Capabilio", is_company_sponsored: false, is_recruiter_visible: true, proof_type: "report", participation_count: 3201, solve_count: 1987, tags: ["system-design","distributed","medium"], source: "capabilio", status: "active" },
  { id: "fb-7", slug: "debug-node-memory-leak", title: "Debug the Node.js Memory Leak — Swiggy", description: "A microservice crashes every 6h with OOM. Find all memory leaks in the provided code and fix them.", type: "debugging", domain: "backend", difficulty: "Hard", estimated_mins: 40, elo_impact: 30, technologies: ["Node.js","JavaScript","Memory Profiling"], skills: ["Memory Leak Detection","Event Loop","Closures","WeakMap"], sandbox_type: "code", language: "JavaScript", company_name: "Swiggy", is_company_sponsored: true, is_recruiter_visible: true, proof_type: "code", participation_count: 1028, solve_count: 312, tags: ["debugging","nodejs","memory-leak"], source: "capabilio", status: "active" },
  { id: "fb-8", slug: "security-log-analysis", title: "Investigate the Security Incident — Zepto", description: "Analyze 3 days of Apache logs from a compromised server. Find the attacker, attack vector, and write an incident report.", type: "cybersecurity", domain: "cyber", difficulty: "Medium", estimated_mins: 35, elo_impact: 22, technologies: ["Linux","Bash","Python","Log Analysis"], skills: ["Log Analysis","SQL Injection Detection","OWASP","Incident Response"], sandbox_type: "terminal", language: "Bash", company_name: "Zepto", is_company_sponsored: true, is_recruiter_visible: true, proof_type: "report", participation_count: 718, solve_count: 289, tags: ["cybersecurity","log-analysis","incident-response"], source: "capabilio", status: "active" },
  { id: "fb-9", slug: "github-actions-pipeline", title: "Build a Production CI/CD Pipeline — Ola", description: "Complete GitHub Actions pipeline: lint → test → security scan → Docker build → staging → prod with manual approval.", type: "devops", domain: "devops", difficulty: "Medium", estimated_mins: 45, elo_impact: 25, technologies: ["GitHub Actions","Docker","YAML","Shell"], skills: ["CI/CD","Docker","GitHub Actions","Security Scanning"], sandbox_type: "code", language: "YAML", company_name: "Ola", is_company_sponsored: true, is_recruiter_visible: true, proof_type: "code", participation_count: 1542, solve_count: 743, tags: ["devops","cicd","github-actions"], source: "capabilio", status: "active" },
  { id: "fb-10", slug: "dcf-valuation-model", title: "DCF Valuation Model — Zerodha", description: "Build a Python DCF model for an Indian IT company. Project 5-year free cash flow and compute intrinsic value per share.", type: "finance", domain: "data", difficulty: "Medium", estimated_mins: 40, elo_impact: 20, technologies: ["Python","Pandas","NumPy","Finance"], skills: ["DCF Valuation","WACC","Terminal Value","Financial Modeling"], sandbox_type: "notebook", language: "Python", company_name: "Zerodha", is_company_sponsored: true, is_recruiter_visible: true, proof_type: "report", participation_count: 832, solve_count: 441, tags: ["finance","dcf","python","modeling"], source: "capabilio", status: "active" },
  { id: "fb-11", slug: "write-prd-feature", title: "Write a PRD — Meesho Cart Abandonment", description: "Write a complete Product Requirements Document for a cart abandonment recovery system with push, email, and WhatsApp nudges.", type: "product", domain: "data", difficulty: "Medium", estimated_mins: 45, elo_impact: 18, technologies: ["Product Management","PRD Writing"], skills: ["PRD","Product Strategy","A/B Testing","Metrics"], sandbox_type: "markdown", language: "Markdown", company_name: "Meesho", is_company_sponsored: true, is_recruiter_visible: true, proof_type: "report", participation_count: 1203, solve_count: 678, tags: ["product","prd","strategy"], source: "capabilio", status: "active" },
  { id: "fb-12", slug: "fullstack-auth-system", title: "Build a Secure Auth System — Groww", description: "Complete auth: email/password, Google OAuth, JWT with refresh tokens, rate limiting, forgot-password flow. Backend + frontend.", type: "fullstack", domain: "fullstack", difficulty: "Hard", estimated_mins: 75, elo_impact: 38, technologies: ["Node.js","React","TypeScript","PostgreSQL","JWT","Redis"], skills: ["Authentication","OAuth 2.0","JWT","Session Management","Security"], sandbox_type: "code", language: "TypeScript", company_name: "Groww", is_company_sponsored: true, is_recruiter_visible: true, proof_type: "code", participation_count: 643, solve_count: 127, tags: ["fullstack","authentication","security","hard"], source: "capabilio", status: "active" },
]

// ─────────────────────────────────────────────────────────────────────────────
// ARENA V3 ROUTES — role system, daily assignment, proof artifacts, weak topics
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /roles ─ list all 15 production roles ─────────────────────────────────
const ARENA_ROLES = [
  { slug:"frontend",     label:"Frontend Developer",      family:"Engineering", workspaces:["frontend_sandbox","code_ide"],   color:"#F59E0B" },
  { slug:"backend",      label:"Backend Developer",       family:"Engineering", workspaces:["api_workstation","code_ide"],    color:"#3B82F6" },
  { slug:"fullstack",    label:"Fullstack Developer",     family:"Engineering", workspaces:["fullstack_ws","code_ide"],       color:"#8B5CF6" },
  { slug:"swe",          label:"Software Eng / DSA",      family:"Engineering", workspaces:["code_ide"],                     color:"#1A1A18" },
  { slug:"data",         label:"Data Analyst",            family:"Data",        workspaces:["notebook_lab","sql_lab"],        color:"#0EA5E9" },
  { slug:"bi_analyst",   label:"BI Analyst",              family:"Data",        workspaces:["bi_dashboard","sql_lab"],        color:"#8B5CF6" },
  { slug:"data_engineer",label:"Data Engineer",           family:"Data",        workspaces:["data_pipeline","sql_lab"],       color:"#059669" },
  { slug:"dba",          label:"DBA / Database Engineer", family:"Data",        workspaces:["sql_lab","code_ide"],            color:"#DC2626" },
  { slug:"devops",       label:"DevOps Engineer",         family:"Platform",    workspaces:["infra_terminal","code_ide"],     color:"#F59E0B" },
  { slug:"aws",          label:"Cloud Engineer (AWS)",    family:"Platform",    workspaces:["cloud_arch_lab","infra_terminal"],color:"#EA580C" },
  { slug:"azure",        label:"Cloud Engineer (Azure)",  family:"Platform",    workspaces:["cloud_arch_lab","infra_terminal"],color:"#0078D4" },
  { slug:"sre",          label:"SRE / Platform Engineer", family:"Platform",    workspaces:["sre_console","infra_terminal"],  color:"#0EA5E9" },
  { slug:"cyber",        label:"Cybersecurity Analyst",   family:"Security",    workspaces:["security_console","code_ide"],   color:"#DC2626" },
  { slug:"soc",          label:"SOC Analyst / IR",        family:"Security",    workspaces:["soc_console","security_console"],color:"#B91C1C" },
  { slug:"qa",           label:"QA / Test Automation",    family:"Quality",     workspaces:["qa_lab","code_ide"],             color:"#7C3AED" },
  { slug:"ba_product",   label:"BA / Product Analyst",    family:"Business",    workspaces:["business_analysis","sql_lab"],   color:"#D97706" },
]

router.get("/roles", (req, res) => {
  res.json({ roles: ARENA_ROLES })
})

// ── GET /daily-assignment ─ today's challenge per active role ─────────────────
router.get("/daily-assignment", async (req, res) => {
  try {
    const { role_slug = "swe", elo = 600 } = req.query
    const tier  = elo < 600 ? 1 : elo < 800 ? 2 : elo < 1000 ? 3 : elo < 1200 ? 4 : 5
    const today = new Date().toISOString().slice(0, 10)

    // Try Supabase daily_challenge_assignments table first
    const { data: assigned } = await supabase
      .from("daily_challenge_assignments")
      .select("*, challenges(*)")
      .eq("date", today)
      .eq("role_slug", role_slug)
      .eq("elo_tier", tier)
      .maybeSingle()

    if (assigned?.challenges) {
      return res.json({ daily: assigned.challenges, date: today, source: "db" })
    }

    // Fallback: pick a random eligible challenge from the catalog
    const { data: pool } = await supabase
      .from("challenges")
      .select("*")
      .eq("status", "active")
      .contains("tags", [role_slug])
      .limit(20)

    if (pool?.length) {
      // Deterministic pick based on date + role so all users in cohort get same challenge
      const seed = today.replace(/-/g, "") + role_slug
      const idx  = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % pool.length
      return res.json({ daily: pool[idx], date: today, source: "pool_fallback" })
    }

    // Final fallback: serve a featured challenge matching the role
    const fallback = FEATURED_CHALLENGES.find(c =>
      c.domain === role_slug || (role_slug === "swe" && c.type?.includes("algo"))
    ) || FEATURED_CHALLENGES[0]
    res.json({ daily: fallback, date: today, source: "featured_fallback" })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /proof-artifacts ─ create a proof artifact after submission ───────────
router.post("/proof-artifacts", requireAuth, async (req, res) => {
  try {
    const {
      submission_id, challenge_id, workspace_type, title,
      artifact_type, artifact_url, thumbnail_url, badges,
      score, hidden_score, description
    } = req.body

    const { data, error } = await supabase
      .from("proof_artifacts")
      .insert({
        user_id:          req.user.id,
        submission_id,
        challenge_id,
        workspace_type,
        artifact_type:    artifact_type || "submission",
        title:            title || "Arena Submission",
        description:      description || "",
        artifact_url:     artifact_url || null,
        thumbnail_url:    thumbnail_url || null,
        badges:           badges || [],
        score:            score || 0,
        hidden_score:     hidden_score || 0,
        is_portfolio_visible: (score || 0) >= 70,
        is_recruiter_visible: (score || 0) >= 60,
        created_at:       new Date().toISOString(),
      })
      .select().single()

    if (error) throw error
    res.json({ artifact: data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /proof-artifacts/:uid ─ user's portfolio-visible proof artifacts ────────
router.get("/proof-artifacts/:uid", async (req, res) => {
  try {
    const { uid } = req.params
    const { data, error } = await supabase
      .from("proof_artifacts")
      .select("*")
      .eq("user_id", uid)
      .eq("is_portfolio_visible", true)
      .order("created_at", { ascending: false })
      .limit(20)
    if (error) throw error
    res.json({ artifacts: data || [] })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /weak-topics/:uid ─ user's weak topic signals (< 50% pass rate) ────────
router.get("/weak-topics/:uid", async (req, res) => {
  try {
    const { uid } = req.params

    // Aggregate topic pass rates from last 14 days of submissions
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: subs } = await supabase
      .from("challenge_submissions")
      .select("score, challenge_id, challenges(topic_tags)")
      .eq("user_id", uid)
      .gte("submitted_at", cutoff)
      .order("submitted_at", { ascending: false })
      .limit(50)

    const topicMap = {}
    ;(subs || []).forEach(s => {
      const tags = s.challenges?.topic_tags || []
      tags.forEach(tag => {
        if (!topicMap[tag]) topicMap[tag] = { pass: 0, total: 0 }
        topicMap[tag].total++
        if ((s.score || 0) >= 60) topicMap[tag].pass++
      })
    })

    const weakTopics = Object.entries(topicMap)
      .filter(([, v]) => v.total >= 2 && v.pass / v.total < 0.5)
      .map(([tag, v]) => ({ topic: tag, pass_rate: Math.round((v.pass / v.total) * 100), attempts: v.total }))
      .sort((a, b) => a.pass_rate - b.pass_rate)
      .slice(0, 5)

    res.json({ weak_topics: weakTopics, since: cutoff })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /sub-elo/:uid ─ full sub-ELO breakdown by workspace ───────────────────
router.get("/sub-elo/:uid", async (req, res) => {
  try {
    const { uid } = req.params
    const { data, error } = await supabase
      .from("elo_tracks")
      .select("*")
      .eq("user_id", uid)
    if (error) throw error

    // If no elo_tracks table yet, compute from submissions
    if (!data?.length) {
      const { data: subs } = await supabase
        .from("challenge_submissions")
        .select("workspace_type, elo_delta, elo_after")
        .eq("user_id", uid)
        .not("elo_delta", "is", null)

      const tracks = {}
      ;(subs || []).forEach(s => {
        const ws = s.workspace_type || "code_ide"
        if (!tracks[ws]) tracks[ws] = { track: ws, current_elo: 600, submission_count: 0 }
        tracks[ws].current_elo = s.elo_after || tracks[ws].current_elo
        tracks[ws].submission_count++
      })
      return res.json({ tracks: Object.values(tracks) })
    }

    res.json({ tracks: data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /assignment-queue ─ next 3 recommended challenges ─────────────────────
router.get("/assignment-queue", requireAuth, async (req, res) => {
  try {
    const { role_slug = "swe", elo = 600 } = req.query
    const uid = req.user.id

    // Get seen history
    const { data: seen } = await supabase
      .from("challenge_seen_history")
      .select("challenge_id")
      .eq("user_id", uid)

    const seenIds = (seen || []).map(s => s.challenge_id)

    let q = supabase
      .from("challenges")
      .select("*")
      .eq("status", "active")
      .gte("elo_min", Math.max(100, Number(elo) - 150))
      .lte("elo_max", Number(elo) + 150)
      .limit(10)

    if (seenIds.length > 0) q = q.not("id", "in", `(${seenIds.slice(0, 50).map(id => `'${id}'`).join(",")})`)

    const { data: pool } = await q
    const queue = (pool || []).slice(0, 3)

    // Fallback to featured if pool empty
    if (!queue.length) {
      return res.json({ queue: FEATURED_CHALLENGES.slice(0, 3) })
    }

    res.json({ queue })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /stats/:uid ─ comprehensive Arena stats for profile display ────────────
router.get("/stats/:uid", async (req, res) => {
  try {
    const { uid } = req.params
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: subs }, { data: streak }] = await Promise.all([
      supabase.from("challenge_submissions").select("score, workspace_type, submitted_at, elo_delta").eq("user_id", uid).gte("submitted_at", cutoff30).order("submitted_at", { ascending: false }),
      supabase.from("arena_streaks").select("*").eq("user_id", uid).maybeSingle(),
    ])

    const submissions = subs || []
    const avgScore    = submissions.length ? Math.round(submissions.reduce((a, s) => a + (s.score || 0), 0) / submissions.length) : 0
    const passRate    = submissions.length ? Math.round(submissions.filter(s => s.score >= 60).length / submissions.length * 100) : 0
    const eloDelta30  = submissions.reduce((a, s) => a + (s.elo_delta || 0), 0)

    const wsFreq = {}
    submissions.forEach(s => { wsFreq[s.workspace_type || "code_ide"] = (wsFreq[s.workspace_type || "code_ide"] || 0) + 1 })
    const topWorkspace = Object.entries(wsFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || "code_ide"

    res.json({
      total_submissions: submissions.length,
      avg_score:         avgScore,
      pass_rate:         passRate,
      elo_delta_30d:     eloDelta30,
      top_workspace:     topWorkspace,
      current_streak:    streak?.current_streak || 0,
      longest_streak:    streak?.longest_streak || 0,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
