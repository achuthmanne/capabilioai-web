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

import express from "express"
import cors    from "cors"

// ─── Built-in rate limiter (no external package needed) ───────────────────────
function createRateLimiter(windowMs, max, message) {
  const store = new Map()
  // Clean up old entries every 5 minutes to prevent memory leak
  setInterval(() => {
    const cutoff = Date.now() - windowMs
    for (const [ip, timestamps] of store) {
      const fresh = timestamps.filter(t => t > cutoff)
      if (fresh.length === 0) store.delete(ip)
      else store.set(ip, fresh)
    }
  }, 5 * 60 * 1000)

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown"
    const now = Date.now()
    const cutoff = now - windowMs
    const hits = (store.get(ip) || []).filter(t => t > cutoff)
    hits.push(now)
    store.set(ip, hits)
    res.setHeader("X-RateLimit-Limit", max)
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - hits.length))
    if (hits.length > max) return res.status(429).json({ error: message })
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
app.use(express.json({ limit: "4mb" }))

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

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════╗`)
  console.log(`║   Capabilio Server v3.0  ·  port ${PORT}            ║`)
  console.log(`║   Arena: 15 roles · 14 workspaces · proof system  ║`)
  console.log(`╚══════════════════════════════════════════════════╝`)
  const ok  = (s) => `✅ ${s}`
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
