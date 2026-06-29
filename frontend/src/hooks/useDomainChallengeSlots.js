/**
 * useDomainChallengeSlots
 *
 * Manages 3 per-user, per-domain challenge slots with:
 *   • 24-hour cooldown after each completion
 *   • Smart rotation: avoids repeating the same category or challenge ID recently
 *   • Full-cycle reset: when all challenges in the domain are covered, starts over
 *   • Supabase persistence (arena_missions + profiles.domain_challenge_progress)
 *
 * Slot status lifecycle:
 *   "loading"  → being fetched / assigned
 *   "active"   → challenge ready, user can start
 *   "cooldown" → completed, locked for 24 hours (shows countdown)
 *   "empty"    → edge case / assignment failed
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "../lib/supabase"
import { getDomainChallenges } from "../config/domainChallenges"

// ── Constants ─────────────────────────────────────────────────────────────────
const COOLDOWN_MS     = 24 * 60 * 60 * 1000   // 24 hours
const SLOT_COUNT      = 3
const RECENT_MEMORY   = 3                       // avoid repeating last N challenge IDs
const CATEGORY_MEMORY = 4                       // avoid repeating last N categories

// ── Domain key resolution (mirrors useArenaMissions logic) ───────────────────
const DOMAIN_MAP = {
  "frontend":"frontend","react developer":"frontend","ui developer":"frontend",
  "backend":"backend","node.js":"backend","django":"backend","spring boot":"backend",
  "full stack":"fullstack","fullstack":"fullstack","mern":"fullstack",
  "software engineer":"swe","software developer":"swe","sde":"swe",
  "data analyst":"data","data analysis":"data","analytics":"data","business analyst":"data",
  "database administrator":"dba","dba":"dba","sql developer":"dba",
  "cybersecurity":"cyber","cyber security":"cyber","security analyst":"cyber",
  "devops":"devops","sre":"devops","kubernetes":"devops","docker":"devops",
  "aws":"aws","cloud engineer":"aws","azure":"azure","azure engineer":"azure",
  "medical coder":"medical","embedded":"ece","vhdl":"ece","fpga":"ece",
}

function resolveDomainKey(userData) {
  const explicit = userData?.domain || userData?.domain_key || userData?.arenaKey
  if (explicit) return explicit
  const kw = (userData?.keyword || userData?.job_role || userData?.target_role || "software engineer").toLowerCase()
  for (const [key, val] of Object.entries(DOMAIN_MAP)) {
    if (kw.includes(key)) return val
  }
  return "swe"
}

// ── Rotation algorithm ───────────────────────────────────────────────────────
/**
 * Pick the best next challenge for a slot, given what the user has already done.
 *
 * Priority order (highest to lowest):
 *   1. Not recently completed (not in recentIds) AND different category (not in recentCategories)
 *   2. Different category only
 *   3. Not recently completed only
 *   4. Any remaining challenge
 *   5. Full cycle reset → pick anything (cycle restarted)
 *
 * @param {object[]} allChallenges   - full domain challenge bank
 * @param {string[]} completedIds    - all-time completed challenge IDs
 * @param {string[]} recentIds       - last RECENT_MEMORY completed IDs
 * @param {string[]} recentCategories- last CATEGORY_MEMORY completed categories
 * @param {string[]} excludeIds      - IDs already assigned to other active slots (avoid duplicates)
 * @returns {object|null}            - selected challenge object
 */
function pickNextChallenge(allChallenges, completedIds, recentIds, recentCategories, excludeIds = []) {
  const exclude = new Set([...recentIds, ...excludeIds])
  const recentCatSet = new Set(recentCategories)

  // Pool: everything not assigned to another active slot right now
  let pool = allChallenges.filter(c => !excludeIds.includes(c.id))

  if (pool.length === 0) pool = [...allChallenges] // fallback: ignore excludeIds

  // Track whether we're in a fresh cycle (all challenges completed)
  const allDone = allChallenges.every(c => completedIds.includes(c.id))

  // On full cycle: clear recent memory so all categories are available again
  const effectiveExclude  = allDone ? new Set(excludeIds) : exclude
  const effectiveCatExcl  = allDone ? new Set() : recentCatSet

  const freshBoth    = pool.filter(c => !effectiveExclude.has(c.id)  && !effectiveCatExcl.has(c.category))
  const freshCatOnly = pool.filter(c => !effectiveCatExcl.has(c.category))
  const freshIdOnly  = pool.filter(c => !effectiveExclude.has(c.id))

  const candidates =
    freshBoth.length    > 0 ? freshBoth    :
    freshCatOnly.length > 0 ? freshCatOnly :
    freshIdOnly.length  > 0 ? freshIdOnly  :
    pool

  return candidates[Math.floor(Math.random() * candidates.length)] || null
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
function slotRowId(uid, domainKey, slotIdx) {
  return `${uid}_dcslot_${domainKey}_${slotIdx}`
}

async function loadSlotRows(uid, domainKey) {
  const { data } = await supabase
    .from("arena_missions")
    .select("*")
    .in("id", [0, 1, 2].map(i => slotRowId(uid, domainKey, i)))
  const map = {}
  ;(data || []).forEach(row => { map[row.slot_index] = row.slot_data })
  return map   // { 0: slotData, 1: slotData, 2: slotData }
}

async function saveSlot(uid, domainKey, slotIdx, slotData) {
  await supabase.from("arena_missions").upsert({
    id:         slotRowId(uid, domainKey, slotIdx),
    user_id:    uid,
    slot_index: slotIdx,
    slot_data:  slotData,
    updated_at: new Date().toISOString(),
  })
}

async function loadProgress(uid, domainKey) {
  const { data } = await supabase
    .from("profiles")
    .select("domain_challenge_progress")
    .eq("id", uid)
    .single()
  const all = data?.domain_challenge_progress || {}
  return all[domainKey] || { completed_ids: [], recent_ids: [], recent_categories: [] }
}

async function saveProgress(uid, domainKey, progress) {
  const { data } = await supabase
    .from("profiles")
    .select("domain_challenge_progress")
    .eq("id", uid)
    .single()
  const all = data?.domain_challenge_progress || {}
  await supabase.from("profiles").update({
    domain_challenge_progress: { ...all, [domainKey]: progress }
  }).eq("id", uid)
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useDomainChallengeSlots(userData) {
  const domainKey      = resolveDomainKey(userData)
  const allChallenges  = getDomainChallenges(domainKey)

  const [user, setUser]           = useState(null)
  const [slots, setSlots]         = useState(() =>
    Array.from({ length: SLOT_COUNT }, (_, i) => ({ index: i, status: "loading", challenge: null, cooldownUntil: null }))
  )
  const [progress, setProgress]   = useState({ completed_ids: [], recent_ids: [], recent_categories: [] })
  const [loadingSlots, setLoading] = useState(true)
  const initDone                  = useRef(false)

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || initDone.current) return
    initDone.current = true
    reconcile(user)
  }, [user, domainKey]) // eslint-disable-line

  // ── Reconcile: load saved slots, expire cooldowns, fill empties ───────────
  const reconcile = useCallback(async (u) => {
    setLoading(true)
    try {
      const [savedSlots, prog] = await Promise.all([
        loadSlotRows(u.id, domainKey),
        loadProgress(u.id, domainKey),
      ])
      setProgress(prog)

      const now = Date.now()
      // IDs already assigned to active slots (avoid same challenge in multiple slots)
      const activeIds = []
      Object.values(savedSlots).forEach(s => {
        if (s?.status === "active" && s?.challenge?.id) activeIds.push(s.challenge.id)
      })

      // ── SEQUENTIAL (not concurrent) — so activeIds accumulates correctly ──
      // Promise.all caused all empty slots to see activeIds=[] and pick the same challenge.
      const resolved = []
      for (let idx = 0; idx < SLOT_COUNT; idx++) {
        const saved = savedSlots[idx]

        // Cooldown expired → assign fresh challenge
        if (saved?.status === "cooldown" && saved.cooldownUntil && now >= saved.cooldownUntil) {
          resolved.push(await _assignSlot(u.id, idx, prog, activeIds, saved.completedChallengeId))
          continue
        }

        // Still in cooldown → keep as-is
        if (saved?.status === "cooldown") {
          resolved.push({
            index:         idx,
            status:        "cooldown",
            challenge:     saved.challenge || null,
            cooldownUntil: saved.cooldownUntil,
            completedAt:   saved.completedAt,
          })
          continue
        }

        // Existing active slot with a valid challenge → keep
        if (saved?.status === "active" && saved?.challenge?.id) {
          const exists = allChallenges.find(c => c.id === saved.challenge.id)
          if (exists) {
            if (!activeIds.includes(exists.id)) activeIds.push(exists.id)
            resolved.push({ index: idx, status: "active", challenge: exists })
            continue
          }
        }

        // Empty or stale → assign fresh (activeIds is updated inside _assignSlot)
        resolved.push(await _assignSlot(u.id, idx, prog, activeIds, null))
      }

      setSlots(resolved)
    } finally {
      setLoading(false)
    }
  }, [domainKey]) // eslint-disable-line

  // ── Internal: pick + persist a new challenge for a slot ──────────────────
  const _assignSlot = useCallback(async (uid, slotIdx, prog, activeIds, lastCompletedId) => {
    // Build the recent list including the just-completed challenge
    const recentIds = lastCompletedId
      ? [lastCompletedId, ...(prog.recent_ids || [])].slice(0, RECENT_MEMORY)
      : prog.recent_ids || []

    const challenge = pickNextChallenge(
      allChallenges,
      prog.completed_ids || [],
      recentIds,
      prog.recent_categories || [],
      activeIds,
    )

    if (!challenge) return { index: slotIdx, status: "empty", challenge: null }

    // Track this slot's ID so siblings don't also pick it
    if (!activeIds.includes(challenge.id)) activeIds.push(challenge.id)

    const slotData = {
      status:      "active",
      challenge,
      assignedAt:  new Date().toISOString(),
    }
    await saveSlot(uid, domainKey, slotIdx, slotData)

    return { index: slotIdx, status: "active", challenge }
  }, [allChallenges, domainKey])

  // ── Public: called by Arena after a challenge submission is accepted ──────
  const markCompleted = useCallback(async (slotIndex, challengeId) => {
    if (!user) return

    const slot = slots[slotIndex]
    const now  = new Date().toISOString()
    const cooldownUntil = Date.now() + COOLDOWN_MS

    // Optimistic UI: lock the slot immediately
    setSlots(prev => prev.map((s, i) => i === slotIndex
      ? { ...s, status: "cooldown", cooldownUntil, completedAt: now }
      : s
    ))

    // Build new progress state
    const newCompleted = [...new Set([...(progress.completed_ids || []), challengeId])]
    const newRecentIds = [challengeId, ...(progress.recent_ids || [])].slice(0, RECENT_MEMORY)
    const newRecentCats = [
      slot?.challenge?.category,
      ...(progress.recent_categories || [])
    ].filter(Boolean).slice(0, CATEGORY_MEMORY)

    const newProgress = {
      completed_ids:     newCompleted,
      recent_ids:        newRecentIds,
      recent_categories: newRecentCats,
    }
    setProgress(newProgress)

    // Persist: cooldown slot + progress
    await Promise.all([
      saveSlot(user.id, domainKey, slotIndex, {
        status:               "cooldown",
        challenge:            slot?.challenge || null,
        cooldownUntil,
        completedAt:          now,
        completedChallengeId: challengeId,
      }),
      saveProgress(user.id, domainKey, newProgress),
    ])
  }, [user, slots, progress, domainKey])

  // ── Public: manually refresh a single slot (e.g. error recovery) ─────────
  const refreshSlot = useCallback(async (slotIndex) => {
    if (!user) return
    setSlots(prev => prev.map((s, i) => i === slotIndex ? { ...s, status: "loading" } : s))

    const activeIds = slots
      .filter((s, i) => i !== slotIndex && s.status === "active" && s.challenge?.id)
      .map(s => s.challenge.id)

    const slot = await _assignSlot(user.id, slotIndex, progress, activeIds, null)
    setSlots(prev => prev.map((s, i) => i === slotIndex ? slot : s))
  }, [user, slots, progress, _assignSlot])

  return {
    slots,
    loadingSlots,
    domainKey,
    progress,
    allChallenges,
    markCompleted,
    refreshSlot,
  }
}
