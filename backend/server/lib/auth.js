// ─── Shared auth middleware ───────────────────────────────────────────────────
// Validates Supabase JWTs LOCALLY using the JWT secret — zero network calls.
// Previously every route called supabase.auth.getUser(token) which made a
// live HTTP round-trip to Supabase Auth on every protected request.
// At 50k users this alone would saturate Supabase Auth throughput.
//
// Setup: add SUPABASE_JWT_SECRET to your .env
//   (Dashboard → Settings → API → JWT Secret — the LEGACY HS256 shared secret,
//   NOT the newer asymmetric "JWT Signing Keys" shown under Settings → JWT Keys)
//
// 2026-07-22 FIX: Supabase projects can be migrated to asymmetric JWT Signing
// Keys (ECC P-256 by default). Once migrated, newly issued session tokens are
// signed with the new key, not the legacy HS256 shared secret — so the local
// jwt.verify(..., { algorithms: ["HS256"] }) call below throws for every fresh
// token, even though the token is perfectly valid. Previously this hard-failed
// with 401 "Invalid token" instead of falling back, which silently broke every
// authenticated route the moment the project's JWT signing keys rotated.
// Fix: on local verification failure, fall back to the network-based check
// (supabaseAdmin.auth.getUser) instead of failing immediately. This costs one
// extra network round-trip only for tokens the local check can't validate —
// legacy-secret-signed tokens (until they expire) still take the fast path.
// Longer-term follow-up: verify against Supabase's JWKS endpoint
// (GET /auth/v1/.well-known/jwks.json) to support ES256 locally too, avoiding
// the network round-trip for the now-common case. Tracked separately —
// out of scope for this bugfix to keep the change minimal and low-risk.
import jwt from "jsonwebtoken"
import { supabaseAdmin } from "./supabase.js"

export async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  if (!token) return res.status(401).json({ error: "Unauthorized" })

  const secret = process.env.SUPABASE_JWT_SECRET

  if (secret) {
    // Fast path — local verification, no network call.
    // Pin the algorithm to HS256 (Supabase's legacy signing alg) so a token
    // can't be presented with an unexpected/"none" alg header.
    try {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] })
      // Supabase JWTs store user id in `sub`
      req.user = { id: payload.sub, email: payload.email, role: payload.role, ...payload }
      return next()
    } catch {
      // Falls through to the network-verified path below rather than 401ing
      // immediately — see 2026-07-22 fix note above.
    }
  }

  // Network-verified path — used when SUPABASE_JWT_SECRET is unset, OR as a
  // fallback when local HS256 verification fails (e.g. the token was signed
  // with the project's newer asymmetric JWT signing key instead).
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return res.status(401).json({ error: "Invalid token" })
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: "Auth service unavailable" })
  }
}
