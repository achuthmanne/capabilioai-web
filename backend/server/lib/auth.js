// ─── Shared auth middleware ───────────────────────────────────────────────────
// Validates Supabase JWTs LOCALLY using the JWT secret — zero network calls.
// Previously every route called supabase.auth.getUser(token) which made a
// live HTTP round-trip to Supabase Auth on every protected request.
// At 50k users this alone would saturate Supabase Auth throughput.
//
// Setup: add SUPABASE_JWT_SECRET to your .env
//   (Dashboard → Settings → API → JWT Secret)
//
// Fallback: if SUPABASE_JWT_SECRET is not set, falls back to the network call
//   so existing deployments don't break before the env var is added.
import jwt from "jsonwebtoken"
import { supabaseAdmin } from "./supabase.js"

export async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  if (!token) return res.status(401).json({ error: "Unauthorized" })

  const secret = process.env.SUPABASE_JWT_SECRET

  if (secret) {
    // Fast path — local verification, no network call
    try {
      const payload = jwt.verify(token, secret)
      // Supabase JWTs store user id in `sub`
      req.user = { id: payload.sub, email: payload.email, role: payload.role, ...payload }
      return next()
    } catch {
      return res.status(401).json({ error: "Invalid token" })
    }
  }

  // Fallback — network call (use until SUPABASE_JWT_SECRET is set in env)
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return res.status(401).json({ error: "Invalid token" })
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: "Auth service unavailable" })
  }
}
