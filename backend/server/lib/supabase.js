// ─── Supabase server-side client (service_role — never expose to frontend) ───
// Scalability notes:
//  • Realtime disabled server-side — server doesn't need WebSocket subscriptions
//  • Singleton per process — one client reused across all requests
//  • 10s global fetch timeout — prevents slow Supabase queries hanging connections
//  • auth.persistSession:false — no local session storage overhead
import { createClient } from "@supabase/supabase-js"

// Global fetch with 10-second timeout — prevents slow DB queries tying up workers
function fetchWithTimeout(url, options = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer))
}

const getClient = () => {
  return createClient(
    process.env.SUPABASE_URL         || "",
    process.env.SUPABASE_SERVICE_KEY || "",
    {
      auth:   { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetchWithTimeout },
      // Realtime intentionally disabled on server side — no WS connections needed
      realtime: { enabled: false },
    }
  )
}

// Singleton — one client per worker process
let _client = null
const client = () => {
  if (!_client) _client = getClient()
  return _client
}

// Legacy export (existing routes)
export function supabase() { return client() }

// Named export used by Professional Path route modules
export const supabaseAdmin = (() => {
  let _admin = null
  const handler = {
    get(_, prop) {
      if (!_admin) _admin = getClient()
      const val = _admin[prop]
      if (typeof val === "function") return val.bind(_admin)
      return val
    }
  }
  return new Proxy({}, handler)
})()
