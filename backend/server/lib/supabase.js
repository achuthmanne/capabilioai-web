// ─── Supabase server-side client (service_role — never expose to frontend) ───
// Node.js < 22 has no native WebSocket — supply the "ws" package as transport.
import { createClient } from "@supabase/supabase-js"
import ws from "ws"

const getClient = () => {
  return createClient(
    process.env.SUPABASE_URL         || "",
    process.env.SUPABASE_SERVICE_KEY || "",
    {
      auth:      { autoRefreshToken: false, persistSession: false },
      realtime:  { transport: ws },   // fix for Node.js 20 (no native WebSocket)
    }
  )
}

// Singleton
let _client = null
const client = () => {
  if (!_client) _client = getClient()
  return _client
}

// Legacy export (existing routes)
export function supabase() { return client() }

// Named export used by Professional Path route modules
// This creates a direct Supabase client instance
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
