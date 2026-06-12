/**
 * arenaSkillEngine — ELO calculation, multi-skill weighted updates,
 * skill decay recovery, and Aura Dashboard sync.
 *
 * ✅ MIGRATED: Firebase/Firestore → Supabase
 * Called by useArenaMissions.markCompleted after every Arena submission.
 */
import { supabase } from "../lib/supabase"

// ─────────────────────────────────────────────────────────────────────────────
// ELO ENGINE
// ─────────────────────────────────────────────────────────────────────────────

const K = (elo) => {
  if (elo < 800)  return 40
  if (elo < 1000) return 32
  if (elo < 1200) return 24
  if (elo < 1500) return 18
  return 14
}

export function calcEloDelta({ score, eloRating, difficulty, streak = 0, eloDelta: serverDelta }) {
  if (typeof serverDelta === "number" && serverDelta !== 0) return serverDelta
  const k           = K(eloRating)
  const opponentElo = difficulty === "Hard" ? eloRating + 200 : difficulty === "Easy" ? eloRating - 150 : eloRating
  const expected    = 1 / (1 + Math.pow(10, (opponentElo - eloRating) / 400))
  const actual      = score / 100
  const streakBonus = streak > 2 ? Math.floor(streak * 0.5) : 0
  const delta       = Math.round(k * (actual - expected)) + streakBonus
  return Math.max(-20, Math.min(50, delta))
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL WEIGHT MAP
// ─────────────────────────────────────────────────────────────────────────────
const SKILL_WEIGHTS = {
  swe:      { "Problem Solving":0.4, "Code Quality":0.35, "System Design":0.15, "Communication":0.10 },
  frontend: { "UI Development":0.35, "Component Design":0.25, "Accessibility":0.20, "Performance":0.20 },
  notebook: { "Data Analysis":0.40, "Python":0.25, "Visualization":0.20, "Statistics":0.15 },
  data:     { "SQL":0.45, "Data Modeling":0.25, "Performance":0.20, "Data Quality":0.10 },
  terminal: { "DevOps":0.40, "Scripting":0.30, "System Admin":0.20, "Automation":0.10 },
  api:      { "API Design":0.40, "Backend":0.30, "Testing":0.20, "Documentation":0.10 },
  iac:      { "Infrastructure":0.45, "DevOps":0.30, "Cloud":0.15, "Security":0.10 },
  cyber:    { "Threat Analysis":0.40, "Incident Response":0.30, "Communication":0.20, "Tools":0.10 },
  markdown: { "Communication":0.40, "Technical Writing":0.35, "Clarity":0.25 },
}

function scoreToSkillDelta(score) {
  if (score >= 90) return 15
  if (score >= 80) return 10
  if (score >= 70) return  6
  if (score >= 60) return  3
  if (score >= 50) return  1
  return -3
}

function updateSkillGraph(currentGraph = [], task, score) {
  const sandboxType = task?.sandbox || "swe"
  const weights     = SKILL_WEIGHTS[sandboxType] || SKILL_WEIGHTS.swe
  const skillTags   = task?.skillTags || [task?.category].filter(Boolean)
  const delta       = scoreToSkillDelta(score)
  const graph       = currentGraph.map(n => ({ ...n }))
  const baseline    = Math.max(5, Math.round(score / 2))

  const bump = (label, weight) => {
    const impact   = Math.round(delta * weight)
    const existing = graph.find(n => n.label?.toLowerCase() === label.toLowerCase())
    if (existing) {
      existing.value = Math.max(0, Math.min(100, (existing.value || baseline) + impact))
    } else {
      graph.push({ label, value: Math.min(100, Math.max(0, baseline + impact)) })
    }
  }

  Object.entries(weights).forEach(([label, w]) => bump(label, w))
  skillTags.forEach(tag => bump(tag, 0.25))
  return graph
}

function updateSkillGaps(currentGaps = [], task, score) {
  const tags = task?.skillTags || [task?.category].filter(Boolean)
  if (score < 70 || tags.length === 0) return currentGaps
  return currentGaps.filter(g =>
    !tags.some(t => t.toLowerCase().includes(g.toLowerCase()) || g.toLowerCase().includes(t.toLowerCase()))
  )
}

function computeStreak(currentStreak, lastArenaDate) {
  const today     = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (lastArenaDate === today)     return currentStreak || 1
  if (lastArenaDate === yesterday) return (currentStreak || 0) + 1
  return 1
}

function mergeTopN(existing = [], incoming = [], n = 5) {
  const combined = [...incoming, ...existing.filter(e => !incoming.includes(e))]
  return combined.slice(0, n)
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export async function applySkillUpdates({ uid, userData, task, review }) {
  if (!uid) return

  const score    = Number(review?.score || 0)
  const eloDelta = calcEloDelta({
    score,
    eloRating:  userData?.elo_rating  || userData?.eloRating  || 800,
    difficulty: task?.difficulty || "Medium",
    streak:     userData?.arena_streak || userData?.arenaStreak || 0,
    eloDelta:   review?.eloDelta,
  })

  const today = new Date().toISOString().slice(0, 10)

  try {
    const { data: current } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single()

    const profile = current || {}

    const currentElo    = Number(profile.elo_rating || 800)
    const newElo        = Math.max(400, currentElo + eloDelta)
    const newStreak     = computeStreak(profile.arena_streak || 0, profile.last_arena_date || "")
    const newSkillGraph = updateSkillGraph(profile.skill_graph || [], task, score)
    const newSkillGaps  = updateSkillGaps(profile.skill_gaps  || [], task, score)
    const newStrengths  = mergeTopN(profile.strengths  || [], review?.strengths    || [], 5)
    const newWeakAreas  = score < 60
      ? mergeTopN(profile.weak_areas || [], review?.improvements || [], 5)
      : (profile.weak_areas || [])

    const currentHistory = profile.elo_history || []
    const alreadyToday   = currentHistory.some(h => h.date === today)
    const newEloHistory  = alreadyToday
      ? currentHistory.map(h => h.date === today ? { ...h, elo: newElo, delta: eloDelta } : h)
      : [...currentHistory.slice(-59), { date: today, elo: newElo, delta: eloDelta }]

    await supabase.from("profiles").update({
      elo_rating:        newElo,
      elo_history:       newEloHistory,
      arena_streak:      newStreak,
      last_arena_date:   today,
      arena_completed:   (profile.arena_completed || 0) + 1,
      skill_graph:       newSkillGraph,
      skill_gaps:        newSkillGaps,
      strengths:         newStrengths,
      weak_areas:        newWeakAreas,
      last_arena_update: new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    }).eq("id", uid)

    // Daily snapshot for Aura ELO graph
    await supabase.from("arena_snapshots").upsert({
      id:          `${uid}_${today}`,
      user_id:     uid,
      date:        today,
      elo:         newElo,
      elo_delta:   eloDelta,
      streak:      newStreak,
      skill_graph: newSkillGraph,
      updated_at:  new Date().toISOString(),
    })

    return { newElo, eloDelta, newStreak, newSkillGraph }
  } catch (err) {
    console.error("arenaSkillEngine error:", err.message)
    return null
  }
}

export async function getArenaSnapshot(uid) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from("arena_snapshots")
      .select("*")
      .eq("user_id", uid)
      .eq("date", today)
      .single()
    return data || null
  } catch { return null }
}
