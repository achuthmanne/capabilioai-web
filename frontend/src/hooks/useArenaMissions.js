/**
 * useArenaMissions — Capabilio Arena sticky mission engine
 * ✅ MIGRATED: Firebase/Firestore → Supabase
 *
 * Changes from original:
 *  - firebase/auth  → supabase.auth.onAuthStateChange
 *  - firebase/firestore (all) → supabase.from() calls
 *  - process.env.REACT_APP_* → import.meta.env.VITE_*
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import { applySkillUpdates } from "../services/arenaSkillEngine"
import { getPlan, daysSinceLastArenaTask } from "../config/plans"

const SERVER_LOCAL = import.meta.env.VITE_API_URL || "http://localhost:4000"
const SERVER_PROD  = "https://capabilio-server.onrender.com"
// Try local first; fall back to production if local is unreachable
const SERVER = SERVER_LOCAL

const todayStr    = () => new Date().toISOString().slice(0, 10)
const nowMs       = () => Date.now()
const SLOT_COUNT  = 3
const COOLDOWN_MS = 24 * 60 * 60 * 1000

function unlockedSlots(userData) {
  const plan = getPlan(userData)
  return Math.min(plan.arenaTasks, SLOT_COUNT)
}

function isFreeTierLocked(userData) {
  const plan = getPlan(userData)
  if (plan.id !== "free") return false
  return daysSinceLastArenaTask(userData) < plan.arenaIntervalDays
}

// ── Domain resolution (unchanged from original) ───────────────────────────────
const ARENA_DOMAIN_KEYS = ["frontend","backend","fullstack","swe","data","dba","cyber","medical","ece","devops","aws","azure"]
const DOMAIN_MAP = {
  "frontend":"frontend","react developer":"frontend","ui developer":"frontend","angular":"frontend","vue":"frontend",
  "backend":"backend","node.js":"backend","django":"backend","spring boot":"backend",
  "full stack":"fullstack","fullstack":"fullstack","mern":"fullstack","mean":"fullstack",
  "software engineer":"swe","software developer":"swe","sde":"swe",
  "data analyst":"data","data analysis":"data","analytics":"data","business analyst":"data",
  "database administrator":"dba","dba":"dba","sql developer":"dba",
  "cybersecurity":"cyber","cyber security":"cyber","security analyst":"cyber","soc analyst":"cyber",
  "medical coder":"medical","medical coding":"medical","medical billing":"medical",
  "embedded":"ece","vhdl":"ece","fpga":"ece","electronics":"ece","firmware":"ece",
  "devops":"devops","sre":"devops","kubernetes":"devops","docker":"devops",
  "aws":"aws","cloud engineer":"aws","cloud architect":"aws",
  "azure":"azure","azure engineer":"azure","azure developer":"azure",
}

function resolveDomain(userData) {
  const explicit = userData?.domain || userData?.arenaKey || userData?.domain_key
  if (explicit && ARENA_DOMAIN_KEYS.includes(explicit)) return explicit
  const kw = (userData?.keyword || userData?.job_role || userData?.target_role || "software engineer").toLowerCase()
  for (const [key, val] of Object.entries(DOMAIN_MAP)) {
    if (kw.includes(key)) return val
  }
  return "swe"
}

// ── Supabase slot helpers (replaces Firestore subcollection) ───────────────────
async function loadAllSlots(uid) {
  const { data } = await supabase
    .from("arena_missions")
    .select("*")
    .eq("user_id", uid)
    .order("slot_index")
  if (!data) return [null, null, null]
  const map = {}
  data.forEach(row => { map[row.slot_index] = row.slot_data })
  return Array.from({ length: SLOT_COUNT }, (_, i) => map[i] || null)
}

async function persistSlot(uid, idx, slotData) {
  await supabase.from("arena_missions").upsert({
    id: `${uid}_slot_${idx}`,
    user_id: uid,
    slot_index: idx,
    slot_data: slotData,
    updated_at: new Date().toISOString(),
  })
}

async function deleteSlot(uid, idx) {
  await supabase.from("arena_missions").delete().eq("id", `${uid}_slot_${idx}`)
}

// ── Skill coverage / rotation (Supabase profiles json column) ─────────────────
async function loadSkillCoverage(uid) {
  const { data } = await supabase.from("profiles").select("skill_coverage").eq("id", uid).single()
  return data?.skill_coverage || {}
}

async function saveSkillCoverage(uid, coverage) {
  await supabase.from("profiles").update({ skill_coverage: coverage }).eq("id", uid)
}

async function loadRecentSkills(uid) {
  const { data } = await supabase.from("profiles").select("recent_skills").eq("id", uid).single()
  return data?.recent_skills || []
}

async function pushRecentSkills(uid, newTags = [], domainSkillCount = 20) {
  const existing = await loadRecentSkills(uid)
  const updated = [...new Set([...newTags, ...existing])].slice(0, 12)
  // Reset cycle after covering a wider window so skills repeat less often
  const cycleComplete = updated.length >= Math.min(domainSkillCount, 12)
  const final = cycleComplete ? [] : updated
  await supabase.from("profiles").update({ recent_skills: final }).eq("id", uid)
  return final
}

// ── Completed mission tracking — prevents ever repeating the same mission title ──
async function loadCompletedMissions(uid) {
  const { data } = await supabase.from("profiles").select("completed_mission_titles").eq("id", uid).single()
  return data?.completed_mission_titles || []
}

async function appendCompletedMission(uid, missionTitle) {
  if (!missionTitle) return
  const existing = await loadCompletedMissions(uid)
  // Deduplicate and keep last 60 titles (well beyond any role's skill set)
  const updated = [...new Set([missionTitle, ...existing])].slice(0, 60)
  await supabase.from("profiles").update({ completed_mission_titles: updated }).eq("id", uid)
}

function bumpCoverage(coverage, skillTags = []) {
  const updated = { ...coverage }
  skillTags.forEach(s => { updated[s] = (updated[s] || 0) + 1 })
  return updated
}

// ── Server fetch ───────────────────────────────────────────────────────────────
async function callDailyAPI(serverUrl, payload) {
  // Local server gets 15s; production (Render) gets 45s to survive cold-start
  const isLocal = serverUrl.includes("localhost") || serverUrl.includes("127.0.0.1")
  const timeoutMs = isLocal ? 15000 : 45000
  const res = await fetch(`${serverUrl}/api/arena/daily`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) {
    const errText = await res.text().catch(()=>"")
    throw new Error(`Server ${res.status}: ${errText.slice(0,120)}`)
  }
  const data = await res.json()
  // Server returns { tasks: [...] } — accept all common field names
  const list    = data.tasks || data.challenges || data.missions || []
  const mission = Array.isArray(list) ? list[0] : (Array.isArray(data) ? data[0] : null)
  if (mission && mission.title) return mission
  throw new Error("No valid mission in response")
}

async function fetchMissions({ keyword, domainKey, eloRating, skillGraph, weakAreas, path, skillCoverage, recentSkills, slotIndex, completedMissions }, retries = 1) {
  const safeGraph = (skillGraph || []).map(n => ({ label: String(n.label || ""), value: Number(n.value || 50) }))
  const payload   = {
    keyword:          keyword || "Software Development",
    domainKey:        domainKey || "swe",
    eloRating:        eloRating || 800,
    skillGraph:       safeGraph,
    weakAreas:        (weakAreas || []).map(String),
    path:             path || "student",
    completedTopics:  [],
    skillCoverage:    skillCoverage || {},
    recentSkills:     (recentSkills || []).map(String),
    // Send completed mission titles so the backend/AI avoids repeating them
    completedMissions: (completedMissions || []).slice(0, 30),
    requestedSlots:   1,
    slotIndex:        slotIndex ?? 0,
  }

  // Try local server first, then production fallback
  const servers = SERVER_LOCAL !== SERVER_PROD
    ? [SERVER_LOCAL, SERVER_PROD]
    : [SERVER_PROD]

  let lastError = null
  for (const serverUrl of servers) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const mission = await callDailyAPI(serverUrl, payload)
        console.log(`[Arena] Mission loaded from ${serverUrl}`)
        return { mission, error: null }
      } catch (err) {
        lastError = err
        const isLastServer  = serverUrl === servers[servers.length - 1]
        const isLastAttempt = attempt >= retries
        console.warn(`[Arena] ${serverUrl} slot ${slotIndex} attempt ${attempt+1}:`, err.message)
        if (!isLastAttempt) await new Promise(r => setTimeout(r, 1500))
        if (!isLastServer && isLastAttempt) console.log("[Arena] Trying production server fallback…")
      }
    }
  }
  return { mission: null, error: lastError?.message || "All servers unreachable" }
}

function makeEmptySlot(idx) {
  return { status: "empty", task: null, slotIndex: idx, createdAt: null, completedAt: null, cooldownUntil: null }
}

function checkCooldown(slot) {
  if (slot?.status === "cooldown" && slot.cooldownUntil) {
    const remaining = slot.cooldownUntil - nowMs()
    if (remaining <= 0) return { ...slot, status: "empty" }
    return { ...slot, cooldownHrs: Math.ceil(remaining / 3600000) }
  }
  return slot
}

// ── MAIN HOOK ──────────────────────────────────────────────────────────────────
export function useArenaMissions() {
  const [user, setUser]         = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [slots, setSlots]       = useState([makeEmptySlot(0), makeEmptySlot(1), makeEmptySlot(2)])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const initDoneRef   = useRef(false)
  const generatingRef = useRef(new Set())

  // ── Auth + profile listener ─────────────────────────────────────────────────
  useEffect(() => {
    let profileChannel = null

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user || null
      if (u) {
        setUser(u)
        // Subscribe to profile changes
        if (profileChannel) supabase.removeChannel(profileChannel)
        profileChannel = supabase
          .channel(`arena-profile-${u.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${u.id}` },
            (payload) => { if (payload.new) setUserData(payload.new) }
          )
          .subscribe()
        // Initial fetch
        const { data } = await supabase.from("profiles").select("*").eq("id", u.id).single()
        if (data) setUserData(data)
        setLoading(false)
      } else {
        setUser(null); setUserData(null); setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (profileChannel) supabase.removeChannel(profileChannel)
    }
  }, [])

  useEffect(() => {
    if (!user || !userData || initDoneRef.current) return
    initDoneRef.current = true
    reconcileSlots(user, userData)
  }, [user, userData]) // eslint-disable-line

  const reconcileSlots = useCallback(async (u, ud) => {
    setLoadingSlots(true)
    const maxSlots   = unlockedSlots(ud)
    const freeLocked = isFreeTierLocked(ud)
    try {
      const raw      = await loadAllSlots(u.id)
      const coverage = await loadSkillCoverage(u.id)
      const userDomain = resolveDomain(ud)

      const checked = raw.map((s, i) => {
        if (i >= maxSlots) return { ...makeEmptySlot(i), status: "upgrade" }
        if (freeLocked && getPlan(ud).id === "free") {
          const plan = getPlan(ud)
          const daysLeft = plan.arenaIntervalDays - daysSinceLastArenaTask(ud)
          return { ...makeEmptySlot(i), status: "cooldown", cooldownHrs: Math.ceil(daysLeft * 24), isPlanCooldown: true }
        }
        if (s?.status === "active" && s?.task) {
          const slotDomain = s.task.domainKey || s.task.domain || null
          if (slotDomain && slotDomain !== userDomain) {
            deleteSlot(u.id, i).catch(() => {})
            return makeEmptySlot(i)
          }
        }
        return checkCooldown(s || makeEmptySlot(i))
      })
      setSlots([...checked])

      const filled = [...checked]
      for (let idx = 0; idx < SLOT_COUNT; idx++) {
        if (filled[idx].status !== "empty") continue
        if (idx > 0) await new Promise(r => setTimeout(r, 800))
        const newSlot = await generateSlot(u, ud, idx, coverage)
        filled[idx] = newSlot
        setSlots([...filled])
        if (newSlot.status === "active" && !raw[idx]) persistSlot(u.id, idx, newSlot)
      }
    } finally {
      setLoadingSlots(false)
    }
  }, []) // eslint-disable-line

  const generateSlot = useCallback(async (u, ud, idx, coverage = {}) => {
    if (generatingRef.current.has(idx)) return makeEmptySlot(idx)
    generatingRef.current.add(idx)
    setSlots(prev => { const next = [...prev]; next[idx] = { ...makeEmptySlot(idx), status: "loading" }; return next })

    const keyword    = ud?.keyword || ud?.job_role || ud?.target_role || "Software Development"
    const domainKey  = resolveDomain(ud)
    const eloRating  = ud?.elo_rating || ud?.elo_score || 800
    const weakAreas  = ud?.skill_gaps || ud?.weak_areas || []
    const skillGraph = ud?.skill_graph || []
    const path       = ud?.path || ud?.path_type || "student"
    const recentSkills      = await loadRecentSkills(u.id)
    const completedMissions = await loadCompletedMissions(u.id)

    const { mission, error: fetchError } = await fetchMissions({ keyword, domainKey, eloRating, skillGraph, weakAreas, path, skillCoverage: coverage, recentSkills, slotIndex: idx, completedMissions })
    const slot = mission
      ? { status: "active", task: { ...mission, slotId: `slot_${idx}_${Date.now()}` }, slotIndex: idx, createdAt: new Date().toISOString(), completedAt: null, cooldownUntil: null }
      : { ...makeEmptySlot(idx), status: "error", errorMsg: fetchError || "Server unreachable" }

    if (slot.status === "active") persistSlot(u.id, idx, slot)
    generatingRef.current.delete(idx)
    return slot
  }, [])

  const markCompleted = useCallback(async (slotIndex, task, reviewResult) => {
    if (!user || !userData) return
    const now = new Date().toISOString()
    const cooldownUntil = nowMs() + COOLDOWN_MS

    setSlots(prev => {
      const next = [...prev]
      next[slotIndex] = { ...next[slotIndex], status: "cooldown", completedAt: now, cooldownUntil, cooldownHrs: 24, review: reviewResult }
      return next
    })

    await persistSlot(user.id, slotIndex, { status: "cooldown", completedAt: now, cooldownUntil, review: reviewResult })

    const historyId = `${Date.now()}`
    const completedSkillTags = task?.skillTags || [task?.category].filter(Boolean)

    // Save to arena_submissions table
    await supabase.from("arena_submissions").insert({
      user_id: user.id,
      slot_index: slotIndex,
      task_id: task?.slotId || `task_${Date.now()}`,
      title: task?.title || "Arena Mission",
      domain: task?.domainKey || "swe",
      category: task?.category || "",
      difficulty: task?.difficulty || "Medium",
      lang: task?.lang || "",
      skill_tags: completedSkillTags,
      scenario: task?.scenario || "",
      submitted_answer: String(reviewResult?.answer || "").slice(0, 3000),
      score: reviewResult?.score || 0,
      elo_delta: reviewResult?.eloDelta || 0,
      grade: reviewResult?.grade || "",
      summary: reviewResult?.summary || "",
      strengths: reviewResult?.strengths || [],
      improvements: reviewResult?.improvements || [],
      tip: reviewResult?.tip || "",
      submitted_at: now,
    })

    // Apply ELO + skill updates
    try {
      await applySkillUpdates({ uid: user.id, userData, task, review: reviewResult })
    } catch (e) { console.warn("Skill update failed:", e.message) }

    // Track completed mission title — prevents ever repeating the same mission
    await appendCompletedMission(user.id, task?.title || "").catch(() => {})

    // Update skill coverage + rotation
    const currentCoverage = await loadSkillCoverage(user.id)
    await saveSkillCoverage(user.id, bumpCoverage(currentCoverage, completedSkillTags))
    await pushRecentSkills(user.id, completedSkillTags, 20)

    // Update profile — ELO, streak, last active
    const currentElo = Number(userData?.elo_rating || 800)
    const eloDelta   = reviewResult?.eloDelta || 0
    const newElo     = Math.max(400, currentElo + eloDelta)
    const lastDate   = userData?.last_arena_date || ""
    const yesterday  = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const today      = todayStr()
    const newStreak  = lastDate === today ? (userData?.arena_streak || 1) : lastDate === yesterday ? (userData?.arena_streak || 0) + 1 : 1

    await supabase.from("profiles").update({
      elo_rating: newElo,
      arena_completed: (userData?.arena_completed || 0) + 1,
      arena_streak: newStreak,
      last_arena_date: today,
      arena_last_active: now,
      domain_key: resolveDomain(userData),
    }).eq("id", user.id)

    // Update leaderboard
    await supabase.from("arena_leaderboard").upsert({
      id: `${user.id}_${resolveDomain(userData)}`,
      user_id: user.id,
      domain_key: resolveDomain(userData),
      elo: newElo,
      tasks_done: (userData?.arena_completed || 0) + 1,
      updated_at: now,
    })
  }, [user, userData])

  const refreshSlot = useCallback(async (slotIndex) => {
    if (!user || !userData) return
    const coverage = await loadSkillCoverage(user.id)
    const newSlot = await generateSlot(user, userData, slotIndex, coverage)
    setSlots(prev => { const next = [...prev]; next[slotIndex] = newSlot; return next })
  }, [user, userData, generateSlot])

  const retrySlot = useCallback(async (slotIndex) => {
    if (!user || !userData) return
    setSlots(prev => { const next = [...prev]; next[slotIndex] = makeEmptySlot(slotIndex); return next })
    await new Promise(r => setTimeout(r, 100))
    const coverage = await loadSkillCoverage(user.id)
    const newSlot = await generateSlot(user, userData, slotIndex, coverage)
    setSlots(prev => { const next = [...prev]; next[slotIndex] = newSlot; return next })
    if (newSlot.status === "active") persistSlot(user.id, slotIndex, newSlot)
  }, [user, userData, generateSlot])

  return {
    user, userData, loading, loadingSlots, slots,
    domainKey: resolveDomain(userData),
    elo: userData?.elo_rating || 800,
    streak: userData?.arena_streak || 0,
    plan: getPlan(userData),
    maxSlots: unlockedSlots(userData),
    markCompleted, refreshSlot, retrySlot,
  }
}
