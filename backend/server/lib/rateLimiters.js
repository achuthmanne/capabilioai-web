/**
 * rateLimiters.js — shared rate-limiter instances + factory.
 * ---------------------------------------------------------------------------
 * PRODUCTION INCIDENT (2026-07-30): this file didn't exist until today —
 * createRateLimiter() and its instances (generalLimiter/aiLimiter/
 * strictLimiter) used to be defined inline in server.js and mounted via
 * `app.use(pathPrefix, aiLimiter)` on an entire family of path prefixes:
 * /api/arena, /api/arena/v2, /api/skill-studio, /api/chat, /api/voice,
 * /api/tts, /api/copilot, /api/groq, plus a few individual AI-backed routes.
 *
 * Because `aiLimiter` was the SAME middleware closure (same in-memory Map)
 * reused across every one of those `app.use()` calls, ALL of those route
 * groups shared one combined 20-requests/minute-per-IP budget — a request to
 * /api/skill-studio/home and a request to /api/arena/daily from the same IP
 * decremented the exact same counter. That was fine when Skill Studio's
 * surface only fired 1-2 requests per page load. Skill Studio V2's Mission
 * Control dashboard (2026-07-30) legitimately fires several parallel
 * READ-ONLY requests on mount (home, memory/due, arena/ingestion, an Arena
 * Readiness check per active journey) — none of which call an AI provider —
 * and that alone was often enough to exhaust the shared 20/min bucket before
 * a single generation request even happened, surfacing as "AI rate limit
 * reached" on routes that never touch Gemini/Groq/Deepgram at all.
 *
 * Fix: split into two concerns that were wrongly conflated —
 *   - `aiLimiter` (unchanged: 20/min) now applies ONLY to routes that
 *     actually spend AI-provider tokens (kept at the original arena/chat/
 *     voice/tts/copilot/groq path-prefixes in server.js, PLUS applied at the
 *     route level inside skillStudioV2.js/skillStudio.js on the specific
 *     endpoints that generate new content: /modules/generate, /quiz/start,
 *     /modules/:id/remedial, /modules/:id/revision, /modules/:id/narration,
 *     /interview/generate, /lesson, /learning-path).
 *   - `skillStudioLimiter` (new, 60/min, its OWN separate bucket) covers the
 *     entire /api/skill-studio prefix as the outer layer — generous enough
 *     for a dashboard that fires several read-only requests per page load,
 *     while the AI-cost routes underneath it get double-covered by the
 *     stricter aiLimiter too (same layering pattern generalLimiter+aiLimiter
 *     already used before this fix).
 */

// Sliding-window counter per IP. Stores only the window-start timestamp +
// count (not an array of timestamps) — O(1) memory per IP, O(1) per request.
// Works correctly behind Vercel/Render reverse proxies via X-Forwarded-For.
// Note: in a multi-process cluster each worker has its own store. At 50k
// users this is intentional — it provides per-worker limits which still
// throttle individual IPs effectively without needing Redis. For strict
// global limits, swap the store for an Upstash Redis client (see SCALE.md).
export function createRateLimiter(windowMs, max, message) {
  // Map<ip, { count, windowStart }>
  const store = new Map()

  // Prune expired windows every windowMs to prevent unbounded memory growth
  setInterval(() => {
    const cutoff = Date.now() - windowMs
    for (const [ip, entry] of store) {
      if (entry.windowStart < cutoff) store.delete(ip)
    }
  }, windowMs).unref() // .unref() — don't block process exit

  return (req, res, next) => {
    // TEMP DIAGNOSTIC (2026-07-29) — logs every /api request that reaches
    // this app, plus the status code actually sent back. Added to find out
    // whether the pulse/*+nexus/* 403s seen in the browser originate in this
    // app or upstream of it (Render's edge/proxy), since none of this app's
    // route handlers issue a 403 for those paths. Pure logging, no behavior
    // change — safe to remove once the 403 source is confirmed.
    res.on("finish", () => {
      console.log(`[req] ${req.method} ${req.originalUrl} -> ${res.statusCode}`)
    })
    // Trust X-Forwarded-For set by Vercel/Render proxy (first IP is the real client)
    const forwarded = req.headers["x-forwarded-for"]
    const ip = (forwarded ? forwarded.split(",")[0].trim() : null)
      || req.socket?.remoteAddress
      || "unknown"

    const now    = Date.now()
    const entry  = store.get(ip)
    let count

    if (!entry || now - entry.windowStart >= windowMs) {
      // New window
      count = 1
      store.set(ip, { count: 1, windowStart: now })
    } else {
      count = entry.count + 1
      entry.count = count
    }

    res.setHeader("X-RateLimit-Limit",     max)
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count))
    res.setHeader("X-RateLimit-Reset",     Math.ceil(((entry?.windowStart || now) + windowMs) / 1000))

    if (count > max) {
      res.setHeader("Retry-After", Math.ceil(windowMs / 1000))
      return res.status(429).json({ error: message })
    }
    next()
  }
}

export const generalLimiter = createRateLimiter(60_000, 100, "Too many requests, please try again in a minute.")
// True AI-provider-cost routes (arena missions, chat, voice/TTS, groq proxy,
// copilot, and — applied at route level, not prefix level — Skill Studio's
// specific generation endpoints). Unchanged threshold.
export const aiLimiter      = createRateLimiter(60_000,  20, "AI rate limit reached. Please wait a moment.")
export const strictLimiter  = createRateLimiter(60_000,  10, "Too many attempts. Please wait before trying again.")
// Skill Studio's own dedicated bucket (2026-07-30 fix) — covers the WHOLE
// /api/skill-studio prefix, sized for a dashboard that fires several
// parallel read-only requests per page load (home, memory/due,
// arena/ingestion, per-journey readiness checks). Separate store from
// aiLimiter so Skill Studio's read traffic can no longer exhaust the same
// budget Arena/chat/voice/TTS/Groq share.
export const skillStudioLimiter = createRateLimiter(60_000, 60, "Skill Studio is receiving a lot of requests right now. Please wait a moment.")

// College Stream experiment submissions (2026-08-16) — applied at the
// specific POST /experiments/:id/submit route only, not the whole
// /api/arena/college-stream prefix (that prefix also serves read-only
// curriculum browsing — all-experiments, streams list, history — which a
// student's normal navigation hits far more often than submit, and which
// shouldn't share this stricter budget; same reasoning as the
// skillStudioLimiter split above). Sized well above legitimate use (a
// student submitting an answer every few seconds) but well below what
// would let a burst of requests spawn unbounded python3 subprocesses —
// the sandbox's own MAX_CONCURRENT_EXECUTIONS cap
// (pythonSandbox.js) is the hard backstop; this is the first line of
// defense that keeps requests from piling up against that cap at all.
export const codeExecutionLimiter = createRateLimiter(60_000, 20, "Too many submissions right now. Please wait a moment before trying again.")
