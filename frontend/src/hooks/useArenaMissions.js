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
import { profileRealtime } from "../lib/realtimeSingletons"
import { getPlan, daysSinceLastArenaTask } from "../config/plans"
import { resolveArenaKey } from "../config/roleConfig"

const SERVER_LOCAL = import.meta.env.VITE_API_URL || "http://localhost:4000"
const SERVER_PROD  = "https://capabilio-web.onrender.com"

const todayStr    = () => new Date().toISOString().slice(0, 10)
const nowMs       = () => Date.now()
const SLOT_COUNT  = 6 // matches Elite's arenaTasks:6 in plans.js — was 3, silently clipping Elite
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

// ── Domain resolution — delegates to centralized roleConfig ──────────────────
// resolveArenaKey() returns the arenaDomains.js key ("ece","swe","frontend", etc.)
function resolveDomain(userData) {
  return resolveArenaKey(userData)
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

async function fetchMissions({ keyword, domainKey, eloRating, skillGraph, weakAreas, path, studentStage, skillCoverage, recentSkills, slotIndex, completedMissions }, retries = 1) {
  const safeGraph = (skillGraph || []).map(n => ({ label: String(n.label || ""), value: Number(n.value || 50) }))
  const payload   = {
    keyword:          keyword || "Software Development",
    domainKey:        domainKey || "swe",
    eloRating:        eloRating || 800,
    skillGraph:       safeGraph,
    weakAreas:        (weakAreas || []).map(String),
    path:             path || "student",
    studentStage:     studentStage || null,
    completedTopics:  [],
    skillCoverage:    skillCoverage || {},
    recentSkills:     (recentSkills || []).map(String),
    // Send completed mission titles so the backend/AI avoids repeating them
    completedMissions: (completedMissions || []).slice(0, 30),
    requestedSlots:   1,
    slotIndex:        slotIndex ?? 0,
  }

  // 2026-07-29: only try the localhost dev server when this build is
  // actually running in dev mode (`npm run dev`). Previously this checked
  // `SERVER_LOCAL !== SERVER_PROD`, which is true in ANY production build
  // where VITE_API_URL wasn't set at Vercel build time — every visitor's
  // browser then wasted a guaranteed-to-fail connection attempt to
  // http://localhost:4000 (their own machine, nothing listening) on EVERY
  // slot generation before falling back to the real server, adding several
  // seconds of dead time per slot and making Render cold-start delays look
  // even worse than they already are.
  const servers = import.meta.env.DEV && SERVER_LOCAL !== SERVER_PROD
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

    let profileUnsub = null

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user || null
      if (u) {
        setUser(u)
        // Use shared singleton — no extra channel if useArenaState already watching this uid
        if (profileUnsub) profileUnsub()
        profileUnsub = profileRealtime.subscribe(u.id, (row) => setUserData(row))
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
      if (profileUnsub) profileUnsub()
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

      // 2026-07-28: slots beyond the plan's unlocked count are NOT gated off
      // here anymore — they're still generated with real AI content so
      // MissionDesk can render them as blurred upgrade-teaser cards (real
      // titles, not a placeholder). Plan gating now happens purely in
      // MissionDesk's render logic (its unlockedCount prop), same split as
      // useDomainChallengeSlots.js. The free-tier daily-interval cooldown
      // below still only applies to slots the user can actually act on.
      const checked = raw.map((s, i) => {
        if (i < maxSlots && freeLocked && getPlan(ud).id === "free") {
          const plan = getPlan(ud)
          const daysLeft = plan.arenaIntervalDays - daysSinceLastArenaTask(ud)
          // BUG FIX (2026-07-29): this used to set only cooldownHrs, never
          // cooldownUntil — MissionHero's countdown (CountdownDisplay) only
          // ever reads cooldownUntil, so every free-tier user in their daily
          // interval lockout saw a blank/broken timer instead of a real
          // countdown. Derive an actual future timestamp from the same
          // daysLeft math instead of a separate, incompatible field.
          const cooldownUntil = Date.now() + Math.max(0, daysLeft) * 86400000
          return { ...makeEmptySlot(i), status: "cooldown", cooldownHrs: Math.ceil(daysLeft * 24), cooldownUntil, isPlanCooldown: true }
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
    // 2026-08-03: Student/Job Seeker split — only meaningful when path is student.
    const studentStage = ud?.student_stage || ud?.studentStage || null
    const recentSkills      = await loadRecentSkills(u.id)
    const completedMissions = await loadCompletedMissions(u.id)

    const { mission, error: fetchError } = await fetchMissions({ keyword, domainKey, eloRating, skillGraph, weakAreas, path, studentStage, skillCoverage: coverage, recentSkills, slotIndex: idx, completedMissions })
    const slot = mission
      // domainKey MUST be stamped here — reconcileSlots' stale-domain check
      // (s.task.domainKey !== userDomain) reads this field to auto-invalidate
      // a slot when the student's role changes. Without it, mission.domainKey
      // is always undefined and a stored slot from a previous role/domain
      // (or from before a content-quality fix) never gets regenerated on its
      // own — it silently persists until the student happens to complete it.
      ? { status: "active", task: { ...mission, domainKey, slotId: `slot_${idx}_${Date.now()}` }, slotIndex: idx, createdAt: new Date().toISOString(), completedAt: null, cooldownUntil: null }
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

    const completedSkillTags = task?.skillTags || [task?.category].filter(Boolean)

    // BUG FIX (2026-07-18): removed two redundant, actively-harmful writes
    // that used to live here:
    //   1. An insert into `arena_submissions` — a write-only table nothing
    //      in the app ever reads (confirmed via grep). Arena.jsx's own
    //      handleSubmit already writes the canonical, actually-read history
    //      row to `arena_history`.
    //   2. A call to applySkillUpdates(), which writes profiles.elo_rating /
    //      arena_completed / skill_graph directly from the client — using a
    //      DIFFERENT ELO formula (calcEloDelta) than the one Arena.jsx's
    //      handleSubmit already computes and writes via userDoc.update().
    //      The comment a few lines below this (search "P0-5") already
    //      documents that ELO/streak/arena_completed were migrated to be
    //      server-authoritative and "the client no longer writes
    //      profiles.elo_rating" — this call was leftover, unmigrated code
    //      that kept doing exactly that. Net effect before this fix: every
    //      completed slotted mission double-counted arena_completed and
    //      raced two independently-computed ELO deltas against each other,
    //      with whichever write landed last silently winning.
    // markCompleted's real, unique job — slot cooldown/rotation bookkeeping
    // below this point — is untouched.

    // Track completed mission title — prevents ever repeating the same mission
    await appendCompletedMission(user.id, task?.title || "").catch(() => {})

    // Update skill coverage + rotation
    const currentCoverage = await loadSkillCoverage(user.id)
    await saveSkillCoverage(user.id, bumpCoverage(currentCoverage, completedSkillTags))
    await pushRecentSkills(user.id, completedSkillTags, 20)

    // P0-5: ELO / streak / arena_completed are now written SERVER-SIDE by
    // /api/arena/review (authoritative, service_role). The client no longer
    // writes profiles.elo_rating. Use the server-returned values for UI + the
    // (non-authoritative) leaderboard cache and domain hint.
    const newElo    = reviewResult?.newElo ?? Number(userData?.elo_rating || 800)
    const tasksDone = reviewResult?.arenaCompleted ?? ((userData?.arena_completed || 0) + 1)

    // Only the non-privileged domain hint remains a client write.
    await supabase.from("profiles").update({ domain_key: resolveDomain(userData) }).eq("id", user.id)

    // Update leaderboard cache with the server-authoritative ELO.
    await supabase.from("arena_leaderboard").upsert({
      id: `${user.id}_${resolveDomain(userData)}`,
      user_id: user.id,
      domain_key: resolveDomain(userData),
      elo: newElo,
      tasks_done: tasksDone,
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
