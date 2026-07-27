/**
 * useArenaState — Arena state hook
 * ✅ MIGRATED: Firebase/Firestore → Supabase
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import { profileRealtime } from "../lib/realtimeSingletons"

const SERVER = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"
const todayStr = () => new Date().toISOString().slice(0, 10)

const SLOTS_CACHE_KEY = (uid, keyword) =>
  `arena_slots_v1_${uid || "g"}_${(keyword || "").toLowerCase().replace(/\s+/g, "_").slice(0, 24)}`

const loadSlotsCache = (uid, keyword) => {
  try {
    const raw = localStorage.getItem(SLOTS_CACHE_KEY(uid, keyword))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.date === todayStr() ? parsed : null
  } catch { return null }
}

const saveSlotsCache = (uid, keyword, data) => {
  try { localStorage.setItem(SLOTS_CACHE_KEY(uid, keyword), JSON.stringify({ ...data, date: todayStr() })) } catch {}
}

const fetchSlots = async ({ keyword, eloRating, skillGraph, path }) => {
  try {
    const res = await fetch(`${SERVER}/api/arena/daily`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: keyword || "Software Development", eloRating: eloRating || 1050, skillGraph: skillGraph || [], weakAreas: [], path: path || "student", completedTopics: [] }),
    })
    if (!res.ok) throw new Error(`Daily API ${res.status}`)
    const data = await res.json()
    return (data.challenges || []).map((ch, i) => ({
      ...ch,
      slotId: `slot_${i}_${todayStr()}`,
      completed: false,
      // 2026-07-27 P0 fix: fallback only fires if the server omits eloReward.
      // Kept in sync with the backend's MAX_POSITIVE_DELTA_BY_DIFFICULTY cap
      // (Easy 8 / Medium 12 / Hard 15) so this preview can never promise more
      // than what the server will actually award.
      eloReward: ch.eloReward || (ch.difficulty === "Hard" ? 15 : ch.difficulty === "Medium" ? 12 : 8),
    }))
  } catch (err) {
    console.warn("Arena daily fetch failed:", err.message)
    return null
  }
}

const fetchOneSlot = async ({ keyword, eloRating, taskIndex }) => {
  try {
    const res = await fetch(`${SERVER}/api/arena/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, eloRating: eloRating || 1050, taskIndex }),
    })
    if (!res.ok) throw new Error(`Challenge API ${res.status}`)
    const ch = await res.json()
    return { ...ch, slotId: `slot_${taskIndex}_${Date.now()}`, completed: false, eloReward: ch.eloReward || 15 }
  } catch { return null }
}

export function useArenaState() {
  const [user, setUser]         = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [slots, setSlots]       = useState([])
  const [completed, setCompleted] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const profileUnsubRef = useRef(null)

  // ── Auth + profile listener ──────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user || null
      if (u) {
        setUser(u)
        // Unsubscribe previous uid's callback if user switches
        if (profileUnsubRef.current) profileUnsubRef.current()

        // Shared singleton — no extra Supabase channel created if another hook
        // is already watching this uid's profiles row.
        profileUnsubRef.current = profileRealtime.subscribe(u.id, (row) => {
          setUserData(row); setLoading(false); setInitialized(true)
        })

        const { data } = await supabase.from("profiles").select("*").eq("id", u.id).single()
        if (data) setUserData(data)
        setLoading(false)
        setInitialized(true)
      } else {
        setUser(null); setUserData(null); setLoading(false); setInitialized(true)
      }
    })
    return () => {
      subscription.unsubscribe()
      if (profileUnsubRef.current) profileUnsubRef.current()
    }
  }, [])

  // ── Load slots ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized || !user || !userData) return
    const keyword   = userData.keyword || userData.job_role || userData.target_role || "Software Development"
    const eloRating = userData.elo_rating || userData.elo_score || 800
    const cached = loadSlotsCache(user.id, keyword)
    if (cached?.slots?.length) {
      setSlots(cached.slots.filter(s => !s.completed))
      setCompleted(cached.slots.filter(s => s.completed))
      return
    }
    setLoadingSlots(true)
    fetchSlots({ keyword, eloRating, skillGraph: userData.skill_graph || [], path: userData.path_type })
      .then(freshSlots => { if (freshSlots?.length) { setSlots(freshSlots); saveSlotsCache(user.id, keyword, { slots: freshSlots }) } })
      .finally(() => setLoadingSlots(false))
  }, [initialized, user, userData])

  const refreshSlot = useCallback(async (slot) => {
    if (!user || !userData) return
    const keyword   = userData.keyword || userData.job_role || "Software Development"
    const eloRating = userData.elo_rating || 800
    const idx = slots.findIndex(s => s.slotId === slot?.slotId)
    const fresh = await fetchOneSlot({ keyword, eloRating, taskIndex: idx >= 0 ? idx : 0 })
    if (!fresh) return
    setSlots(prev => {
      const next = [...prev]
      if (idx >= 0) next[idx] = fresh
      else next.push(fresh)
      saveSlotsCache(user.id, keyword, { slots: next })
      return next
    })
  }, [slots, user, userData])

  const markCompleted = useCallback(async (task, submissionData) => {
    if (!user) return
    const eloDelta = Number(submissionData?.feedback?.eloDelta ?? 0)
    const score    = Number(submissionData?.feedback?.score ?? 0)
    const now      = new Date().toISOString()

    setSlots(prev => prev.filter(s => s.slotId !== task?.slotId))
    setCompleted(prev => [{ ...task, completed: true, completedAt: now, feedback: submissionData?.feedback }, ...prev])

    try {
      // Save submission record (log only — not the authoritative ELO).
      await supabase.from("arena_submissions").insert({
        user_id: user.id,
        task_id: task?.slotId || task?.id || task?.title,
        title: task?.title || "Arena Task",
        domain: task?.domainKey || "swe",
        difficulty: task?.difficulty || "Medium",
        score, elo_delta: eloDelta,
        submitted_at: now,
        lang: task?.lang || "",
        category: task?.category || "",
      })

      // P0-5: profile ELO / streak / arena_completed are written SERVER-SIDE by
      // /api/arena/review (authoritative, service_role). The client no longer
      // writes profiles.elo_rating — that removes the client-authored-ELO hole.

      // Update cache
      const keyword = userData?.keyword || userData?.job_role || "Software Development"
      const cached = loadSlotsCache(user.id, keyword)
      if (cached?.slots) {
        const updatedSlots = cached.slots.map(s => s.slotId === task?.slotId ? { ...s, completed: true, feedback: submissionData?.feedback } : s)
        saveSlotsCache(user.id, keyword, { slots: updatedSlots })
      }
    } catch (err) { console.error("markCompleted error:", err) }
  }, [user, userData])

  const elo    = userData?.elo_rating || userData?.elo_score || 800
  const streak = userData?.arena_streak || 0
  const tier   = elo >= 1500 ? "Elite" : elo >= 1200 ? "Expert" : elo >= 1000 ? "Advanced" : elo >= 800 ? "Intermediate" : "Beginner"

  return { user, userData, loading, initialized, slots, completed, streak, elo, tier, loadingSlots, refreshSlot, markCompleted }
}
