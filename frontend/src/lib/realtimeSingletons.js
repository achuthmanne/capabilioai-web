/**
 * Realtime Singletons
 *
 * Each logical table+filter combination gets ONE Supabase channel, shared
 * across all consumers via a callback registry.  Multiple hooks/components
 * calling subscribe() for the same uid receive the same updates through a
 * single WebSocket multiplexed channel instead of creating N connections.
 *
 * Channel budget (per active user):
 *   Before:  ~8 channels   (4× profiles, 2× arena_history, 1× pulse, 1× leaderboard)
 *   After:   3 channels max (1× profiles, 1× arena_history, 1× pulse)
 *   Leaderboard: replaced with 30s polling — real-time not needed there.
 */

import { supabase } from './supabase'

// ─── Generic singleton factory ────────────────────────────────────────────────
function makeTableSingleton(buildChannel) {
  const _registry = new Map()   // key → { channel, callbacks: Set }

  return {
    subscribe(key, callback) {
      if (!_registry.has(key)) {
        const callbacks = new Set()
        const channel = buildChannel(key, callbacks)
        _registry.set(key, { channel, callbacks })
      }
      _registry.get(key).callbacks.add(callback)

      // Return an unsubscribe function
      return () => {
        const entry = _registry.get(key)
        if (!entry) return
        entry.callbacks.delete(callback)
        if (entry.callbacks.size === 0) {
          supabase.removeChannel(entry.channel)
          _registry.delete(key)
        }
      }
    },
  }
}

// ─── Profile watcher — one channel per uid ────────────────────────────────────
// Replaces: profile-${uid}-${Date.now()}, arenastate-profile-${uid},
//           arena-profile-${uid}, orbit-${uid}
export const profileRealtime = makeTableSingleton((uid, callbacks) =>
  supabase
    .channel(`profile-${uid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
      (payload) => { if (payload.new) callbacks.forEach(cb => cb(payload.new)) }
    )
    .subscribe()
)

// ─── Arena history watcher — one channel per uid ──────────────────────────────
// Replaces: arena-history-${uid}-${Date.now()}, completed-${uid}
export const arenaHistoryRealtime = makeTableSingleton((uid, callbacks) =>
  supabase
    .channel(`arena-history-${uid}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'arena_history', filter: `user_id=eq.${uid}` },
      (payload) => { callbacks.forEach(cb => cb(payload)) }
    )
    .subscribe()
)
