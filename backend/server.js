/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║           CAPABILIO SERVER  —  server.js  (entry point)          ║
 * ║                                                                   ║
 * ║  DEV:   npm run dev:all   (React port 3000 + server port 4000)   ║
 * ║  PROD:  npm run build && npm start                                ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * Route modules live in server/routes/
 * Shared clients live in server/lib/
 */

// Load .env from project root regardless of which directory the server is started from
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../.env") })

// ─── Clustering — use all available CPU cores ─────────────────────────────────
// ES modules require all imports to be top-level, so we use an early-exit guard:
// the primary process forks workers and exits this module's execution context.
// Each forked worker re-imports this file and gets isPrimary=false, so it falls
// through to the Express setup below.
// On Render/Railway with 1 vCPU this is a no-op (1 worker = same as before).
// On 2+ cores: each core runs a full Express process sharing the same port.
import cluster from "cluster"
import { cpus } from "os"

if (cluster.isPrimary && process.env.NODE_ENV === "production") {
  const numCPUs = cpus().length
  console.log(`[cluster] Primary ${process.pid} — forking ${numCPUs} workers`)
  for (let i = 0; i < numCPUs; i++) cluster.fork()
  cluster.on("exit", (worker, code, signal) => {
    console.warn(`[cluster] Worker ${worker.process.pid} died (${signal || code}) — restarting`)
    cluster.fork()
  })
  // Primary exits here — all HTTP handled by workers
  process.exitCode = 0
}

// Workers (and dev mode) continue past this point
import express from "express"
import cors    from "cors"

// ─── Rate limiter ─────────────────────────────────────────────────────────────
// Sliding-window counter per IP. Stores only the window-start timestamp + count
// (not an array of timestamps) — O(1) memory per IP, O(1) per request.
// Works correctly behind Vercel/Render reverse proxies via X-Forwarded-For.
// Note: in a multi-process cluster each worker has its own store. At 50k users
// this is intentional — it provides per-worker limits which still throttle
// individual IPs effectively without needing Redis. For strict global limits,
// swap the store for an Upstash Redis client (see SCALE.md).
function createRateLimiter(windowMs, max, message) {
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

// ─── Route modules ────────────────────────────────────────────────────────────
import resumeRoutes           from "./server/routes/resume.js"
import assessmentRoutes       from "./server/routes/assessment.js"
import arenaRoutes            from "./server/routes/arena.js"
import arenaV2Routes          from "./server/routes/arenaV2.js"
import skillStudioRoutes      from "./server/routes/skillStudio.js"
import chatRoutes             from "./server/routes/chat.js"
import githubRoutes           from "./server/routes/github.js"
import jobRoutes              from "./server/routes/jobs.js"
import paymentRoutes          from "./server/routes/payments.js"
import referralRoutes         from "./server/routes/referral.js"
import verifyRoutes           from "./server/routes/verify.js"
import skillGapRoutes         from "./server/routes/skillGap.js"
import enrichRoutes           from "./server/routes/enrich.js"
import voiceRoutes            from "./server/routes/voice.js"
// ── Professional Path modules ─────────────────────────────────────────────────
import professionalProfileRoutes from "./server/routes/professionalProfile.js"
import careerTimelineRoutes      from "./server/routes/careerTimeline.js"
import skillGraphRoutes          from "./server/routes/skillGraph.js"
import forgeRoutes               from "./server/routes/forge.js"
import aiInterviewRoutes         from "./server/routes/aiInterview.js"
import recruiterCommsRoutes      from "./server/routes/recruiterComms.js"
import mentorHubRoutes           from "./server/routes/mentorHub.js"
import pulseNexusRoutes          from "./server/routes/pulseNexus.js"
import orbitPlansRoutes          from "./server/routes/orbitPlans.js"
import hardwareChallengesRoutes  from "./server/routes/hardwareChallenges.js"
import { startGradingWorker }    from "./server/lib/grading-worker.js"

// ─── App setup ────────────────────────────────────────────────────────────────
const app  = express()
const PORT = process.env.PORT || 4000

// ─── Rate limiters ────────────────────────────────────────────────────────────
const generalLimiter = createRateLimiter(60_000, 100, "Too many requests, please try again in a minute.")
const aiLimiter      = createRateLimiter(60_000,  20, "AI rate limit reached. Please wait a moment.")
const strictLimiter  = createRateLimiter(60_000,  10, "Too many attempts. Please wait before trying again.")

app.use("/api", generalLimiter)
app.use("/api/arena",        aiLimiter)
app.use("/api/arena/v2",     aiLimiter)
app.use("/api/skill-studio", aiLimiter)
app.use("/api/chat",         aiLimiter)
app.use("/api/voice",        aiLimiter)
app.use("/api/verify",       strictLimiter)

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "https://capabilio.online",
    "https://capabilio.online",
    "https://www.capabilio.online",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
  ],
  credentials: true,
}))
// 512kb global limit — prevents large-body DDOS. Routes that genuinely need
// more (PDF upload, resume extract) override locally with express.json({limit:"4mb"})
app.use(express.json({ limit: "512kb" }))

// ─── Request timeout middleware ───────────────────────────────────────────────
// AI routes can take 10–30s. Without a timeout, a stalled Groq/Claude call holds
// the connection open indefinitely, eventually exhausting the server's socket pool.
// Set a 35s server-side deadline — slightly longer than the slowest AI call.
app.use((req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({ error: "Request timed out — please try again." })
    }
  }, 35_000)
  // Clear the timer as soon as the response finishes (success or error)
  res.on("finish",  () => clearTimeout(timer))
  res.on("close",   () => clearTimeout(timer))
  next()
})

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/",       (_, res) => res.json({ status: "ok", service: "Capabilio Server", version: "3.0.0", arena: "15 roles · 14 workspaces · full proof pipeline" }))
app.get("/health", (_, res) => res.json({ status: "ok", ts: Date.now() }))

// ─── Mount routes ─────────────────────────────────────────────────────────────
app.use("/api",              resumeRoutes)       // extract-pdf, extract-linkedin
app.use("/api",              assessmentRoutes)   // generate-mcq, analyse-assessment, analyse-professional-profile
app.use("/api/arena",        arenaRoutes)        // daily, challenge, review, hint, run-tests
app.use("/api/arena/v2",    arenaV2Routes)      // catalog, submit, streaks, leaderboard, recruiter, roles, daily-assignment, proof-artifacts, weak-topics, sub-elo, stats
app.use("/api/skill-studio", skillStudioRoutes)  // lesson, learning-path, youtube, resources
app.use("/api/chat",         chatRoutes)         // chat
app.use("/api/github",       githubRoutes)       // analyze
app.use("/api",              jobRoutes)          // jobs, markets/india
app.use("/api",              paymentRoutes)      // create-order, verify-payment, theme/*, exec/thought-leadership
app.use("/api/referral",     referralRoutes)     // validate, apply, profile, leaderboard
app.use("/api/verify",       verifyRoutes)       // digilocker, epfo, certification
app.use("/api",              skillGapRoutes)     // skill-gap, market analysis — Gemini Search
app.use("/api/enrich",       enrichRoutes)       // stub — replaced by ProxyCurl
app.use("/api/voice",        voiceRoutes)        // transcribe — Deepgram nova-2 + Claude eval
// ── Professional Path ─────────────────────────────────────────────────────────
app.use("/api",              professionalProfileRoutes) // pro/profile, pro/epfo, pro/visibility
app.use("/api",              careerTimelineRoutes)      // pro/timeline, pro/vault
app.use("/api",              skillGraphRoutes)          // pro/skills
app.use("/api",              forgeRoutes)               // pro/forge
app.use("/api",              aiInterviewRoutes)         // pro/interview
app.use("/api",              recruiterCommsRoutes)      // jobs, recruiter/messages, offers
app.use("/api",              mentorHubRoutes)           // mentors, mentors/bookings
app.use("/api",              pulseNexusRoutes)          // pulse/feed, pulse/market-insights (Gemini Search), nexus/*
app.use("/api",              orbitPlansRoutes)          // orbit/plans, intel/report
app.use("/api",              hardwareChallengesRoutes)  // hardware/challenges, hardware/my-attempts

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  // Start background grading worker — polls pgmq queue every 2s
  // In cluster mode each worker runs its own poller; pgmq visibility timeout
  // ensures only one worker processes each message.
  startGradingWorker()
  const workerInfo = cluster.isWorker ? ` [worker ${process.pid}]` : ""
  console.log(`\n╔══════════════════════════════════════════════════╗`)
  console.log(`║   Capabilio Server v3.0  ·  port ${PORT}${workerInfo}`)
  console.log(`║   Arena: 15 roles · 14 workspaces · proof system  ║`)
  console.log(`╚══════════════════════════════════════════════════╝`)
  const ok   = (s) => `✅ ${s}`
  const warn = (s) => `⚠️  ${s}`
  const err  = (s) => `❌ ${s}`
  console.log(`  Groq        ${process.env.GROQ_API_KEY       ? ok("fast generation")              : err("MISSING")}`)
  console.log(`  Anthropic   ${process.env.ANTHROPIC_API_KEY  ? ok("grading + analysis (Claude)")  : warn("Groq fallback for grading")}`)
  console.log(`  Gemini      ${process.env.GEMINI_API_KEY     ? ok("PDF + live search grounding")  : warn("Groq fallback")}`)
  console.log(`  OpenAI      ${process.env.OPENAI_API_KEY     ? ok("GPT-4o + embeddings")          : warn("not set")}`)
  console.log(`  Deepgram    ${process.env.DEEPGRAM_API_KEY   ? ok("voice interview transcription"): warn("voice interview disabled")}`)
  console.log(`  Pinecone    ${process.env.PINECONE_API_KEY   ? ok("semantic job matching")        : warn("set PINECONE_HOST too")}`)
  console.log(`  Razorpay    ${process.env.RAZORPAY_KEY_ID    ? ok("payments")                     : err("MISSING")}`)
  console.log(`  Supabase    ${process.env.SUPABASE_URL       ? ok("database")                     : err("MISSING")}`)
  console.log(`  ProxyCurl   ${process.env.PROXYCURL_API_KEY  ? ok("LinkedIn extraction")          : warn("LinkedIn limited")}`)
  console.log(`  GitHub      ${process.env.GITHUB_TOKEN       ? ok("5000 req/hr")                  : warn("60 req/hr rate limit")}`)
  console.log(`  YouTube     ${process.env.YOUTUBE_API_KEY    ? ok("real videos")                  : warn("AI fallback")}`)
  console.log()
})
