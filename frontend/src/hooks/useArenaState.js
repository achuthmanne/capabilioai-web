/**
 * useArenaState — Arena state hook
 * ✅ MIGRATED: Firebase/Firestore → Supabase
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"

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
      eloReward: ch.eloReward || (ch.difficulty === "Hard" ? 30 : ch.difficulty === "Medium" ? 20 : 15),
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

  const profileChannelRef = useRef(null)

  // ── Auth + profile listener ──────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user || null
      if (u) {
        setUser(u)
        if (profileChannelRef.current) supabase.removeChannel(profileChannelRef.current)

        profileChannelRef.current = supabase
          .channel(`arenastate-profile-${u.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${u.id}` },
            (payload) => { if (payload.new) { setUserData(payload.new); setLoading(false); setInitialized(true) } }
          )
          .subscribe()

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
      if (profileChannelRef.current) supabase.removeChannel(profileChannelRef.current)
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
      const currentElo = Number(userData?.elo_rating || 800)
      const newElo     = Math.max(400, currentElo + eloDelta)
      const lastDate   = userData?.last_arena_date || ""
      const yesterday  = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const today      = todayStr()
      const newStreak  = lastDate === today ? (userData?.arena_streak || 1) : lastDate === yesterday ? (userData?.arena_streak || 0) + 1 : 1

      // Save submission
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

      // Update profile — snake_case only (toCompat in userDoc.subscribe handles read-side aliases)
      await supabase.from("profiles").update({
        elo_rating:       newElo,
        arena_completed:  (userData?.arena_completed || userData?.arenaCompleted || 0) + 1,
        arena_streak:     newStreak,
        arena_last_active: new Date().toISOString(),
        last_arena_day:   today,
        updated_at:       new Date().toISOString(),
      }).eq("id", user.id)

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
