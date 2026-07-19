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
      // TEST-ONLY HOOK: when an arena-v2 integration test sets this global to
      // a pglite-backed adapter (backend/server/lib/arena-v2/__tests__/e2e/
      // pgliteSupabaseAdapter.js), every repository.js file in arena-v2 talks
      // to a real embedded Postgres instead of a real Supabase project —
      // without any repository.js file itself being touched or aware of it.
      // Unset (the default, always true outside that one test file's process)
      // this is a complete no-op — zero behavior change, zero perf cost
      // beyond one property read, for every route in the entire codebase.
      const testClient = globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
      if (testClient) {
        const val = testClient[prop]
        return typeof val === "function" ? val.bind(testClient) : val
      }
      if (!_admin) _admin = getClient()
      const val = _admin[prop]
      if (typeof val === "function") return val.bind(_admin)
      return val
    }
  }
  return new Proxy({}, handler)
})()
