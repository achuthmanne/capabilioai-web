// arenaV2Client.js — Arena V2, Milestone 8
// ---------------------------------------------------------------------------
// Shared fetch/auth/timeout plumbing for every Arena V2 frontend API client.
// Extracted from arenaV2Delivery.js (Milestone 6/7) now that a second client
// (arenaV2Submission.js, this milestone) needs the identical requestJson/
// authHeaders logic — duplicating it a second time would mean auth headers,
// timeouts, and error formatting could silently drift between the two
// clients. arenaV2Delivery.js's external exports are unchanged by this
// extraction; it now imports from here instead of declaring its own copies.
//
// This is exactly the same centralization principle as
// "workstations must never call the Submission API directly, only through
// the Submission Client" — applied one layer down: every Arena V2 API
// client shares one auth/retry/error-handling core rather than each
// reimplementing it.
import { supabase } from "../lib/supabase"

export const ARENA_V2_SERVER = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

export async function authHeaders() {
  const h = { "Content-Type": "application/json" }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) h["Authorization"] = `Bearer ${session.access_token}`
  } catch { /* no session — server will 401, surfaced to the caller as a normal fetch error */ }
  return h
}

export async function requestJson(path, { method = "GET", body, timeoutMs = 20000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res
  try {
    res = await fetch(`${ARENA_V2_SERVER}${path}`, {
      method,
      headers: await authHeaders(),
      signal: controller.signal,
      body: body ? JSON.stringify(body) : undefined,
    })
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 404) return null // caller decides what "not found" means per-endpoint
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    const err = new Error(`Arena V2 API ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`)
    err.status = res.status
    throw err
  }
  return res.json()
}
