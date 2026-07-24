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

// PRODUCTION INCIDENT (this deploy): even after guarding app.listen() to
// workers-only and capping the worker count, the crash-loop continued —
// this time from a bind conflict BETWEEN workers themselves
// (node:internal/cluster/child, not the primary), meaning Node's cluster
// module isn't reliably handling port hand-off in Render's container
// networking. Rather than keep patching cluster internals we don't fully
// control, clustering is now opt-in only (ENABLE_CLUSTER=true) and OFF by
// default. Render scales by running multiple independent service instances,
// not by forking workers inside one process — intra-process clustering buys
// nothing on this platform except this exact failure mode. Single-process
// is simpler and was proven stable before clustering was added.
const IS_CLUSTER_PRIMARY = cluster.isPrimary && process.env.NODE_ENV === "production" && process.env.ENABLE_CLUSTER === "true"

if (IS_CLUSTER_PRIMARY) {
  // BUG FIX: os.cpus().length reads the HOST machine's core count, not the
  // vCPU share actually allocated to this container — on Render that can be
  // much higher than what you're paying for. Forking that many workers on a
  // resource-constrained instance is itself a problem; capped at 4.
  const numCPUs = Math.min(cpus().length, 4)
  console.log(`[cluster] Primary ${process.pid} — forking ${numCPUs} workers (host reports ${cpus().length} cores, capped at 4)`)
  for (let i = 0; i < numCPUs; i++) cluster.fork()

  // BUG FIX (critical): this handler used to call cluster.fork() unconditionally
  // on every worker exit, with no rate limit. Combined with the missing early
  // return below, the primary was ALSO calling app.listen(PORT) directly on the
  // same port its workers request via cluster's shared-handle IPC — a genuine
  // EADDRINUSE conflict every restart, which forked a new worker, which hit the
  // same conflict, forever (see production incident: "bind EADDRINUSE null:10000").
  // Crash-loop backoff: if workers are dying faster than once every 2s on
  // average, stop respawning — a live conflict won't resolve itself by retrying,
  // and an infinite fork loop just burns CPU/log volume without ever recovering.
  let recentExits = []
  cluster.on("exit", (worker, code, signal) => {
    console.warn(`[cluster] Worker ${worker.process.pid} died (${signal || code})`)
    const now = Date.now()
    recentExits = recentExits.filter(t => now - t < 30000)
    recentExits.push(now)
    if (recentExits.length > 15) {
      console.error(`[cluster] ${recentExits.length} worker deaths in the last 30s — not respawning further. This is a crash loop, not a transient failure; check the error above (commonly EADDRINUSE, a missing required env var, or an uncaught startup exception) rather than restarting again.`)
      return
    }
    console.warn(`[cluster] restarting worker...`)
    cluster.fork()
  })
}
// BUG FIX (critical): the primary MUST NOT fall through to the Express/
// app.listen() setup below — previously nothing stopped it from doing so
// (process.exitCode only sets the eventual exit code, it does not halt
// execution), so the primary bound the port directly while its workers
// simultaneously asked it to share that same port via cluster IPC. The guard
// on app.listen() further down is the actual fix; IS_CLUSTER_PRIMARY is
// checked there instead of using process.exit()/return here, because the
// primary process must stay alive to run the cluster.on("exit") respawn
// logic above.

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
import arenaV2LibraryRoutes   from "./server/routes/arenaV2Library.js"  // Arena V2 (real rebuild) Milestone 2 — Challenge Library CRUD, separate from legacy arena/v2 above
import arenaV2DeliveryRoutes  from "./server/routes/arenaV2Delivery.js" // Arena V2 rebuild, Milestone 6 — Challenge Delivery API (next/active/expire-sweep)
import arenaV2SubmissionRoutes from "./server/routes/arenaV2Submission.js" // Arena V2 rebuild, Milestone 8 — Submission API (the return path: Submission -> Submission Engine -> Validator -> Assessment -> Feedback DTO)
import arenaV2PortfolioRoutes  from "./server/routes/arenaV2Portfolio.js"  // Arena V2 rebuild, Milestone 10 — Portfolio & Recruiter Evidence API: GET /mine, POST /:id/publish, GET /candidates/:userId/evidence
import proofsRoutes           from "./server/routes/proofs.js"            // Portfolio redesign — public Engineering Proofs API: GET /:userId (grouped+filtered), GET /:userId/:proofId
import educationRoutes        from "./server/routes/education.js"        // Education redesign Phase 1 — GET /profile/:userId (public), POST /profile (auth, own profile only)
import verificationRoutes     from "./server/routes/verification.js"     // Trust & Verification Center Phase 1 — provider registry, hash-chained audit log, POST /verify
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
import weeklyPulseRoutes         from "./server/routes/weeklyPulse.js"
import homeV1Routes              from "./server/routes/homeV1.js" // Career OS Workstream 1 — pro/v1/home/*
import forgeRoutes               from "./server/routes/forge.js"
import aiInterviewRoutes         from "./server/routes/aiInterview.js"
import recruiterCommsRoutes      from "./server/routes/recruiterComms.js"
import mentorHubRoutes           from "./server/routes/mentorHub.js"
import pulseNexusRoutes          from "./server/routes/pulseNexus.js"
import orbitPlansRoutes          from "./server/routes/orbitPlans.js"
import hardwareChallengesRoutes  from "./server/routes/hardwareChallenges.js"
import copilotCoachRoutes        from "./server/routes/copilotCoach.js" // pilot: tool-augmented Capi coach intent, MCP-backed
import groqProxyRoutes           from "./server/routes/groqProxy.js"    // P0 fix: Capi's Groq calls, moved server-side off the client
import collegeRoutes             from "./server/routes/college.js"      // College Path — institution-admin operational API (roster, leaderboard, stats, branches, export, placement confirm, ELO ledger)
import orgVerificationRoutes     from "./server/routes/orgVerification.js" // Institution OS bugfix — server-side profiles.verificationStatus write (PC-7 compliant)
import orgJoinLinksRoutes        from "./server/routes/orgJoinLinks.js"    // Self-serve student join links — org_members, replaces one-by-one admin invite for ~1000-student rosters
import orgCompanyLinksRoutes     from "./server/routes/orgCompanyLinks.js" // Talent Network <-> real company org account linkage + NDA workflow
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
app.use("/api/copilot",      aiLimiter)
app.use("/api/groq",         aiLimiter)
// PC-3: these AI-backed endpoints were only under the general 100/min limit.
// Put them on the tighter AI limiter to blunt anonymous cost-abuse. (Requiring
// auth on them additionally needs the onboarding client to send its bearer token.)
app.use("/api/generate-mcq",                aiLimiter)
app.use("/api/analyse-assessment",          aiLimiter)
app.use("/api/analyse-professional-profile", aiLimiter)
app.use("/api/resolve-role",                aiLimiter)
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
// Roster CSV imports (college.js) need more than the 512kb default — override
// for that path specifically, before the general limit below. body-parser
// skips re-parsing a body that's already been parsed, so this is safe layering.
app.use("/api/college/institutions", express.json({ limit: "4mb" }))

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

// Diagnostic-only — reports whether the email provider env vars are visible to
// THIS running process, with no secrets in the response. Added 2026-07-22 to
// stop guessing from Render dashboard screenshots whether a deploy actually
// picked up RESEND_API_KEY / RESEND_FROM_ADDRESS.
const __serverBootedAt = new Date().toISOString()
app.get("/api/_debug/email-config", (_, res) => res.json({
  hasResendApiKey: !!process.env.RESEND_API_KEY,
  resendApiKeyLength: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0,
  fromAddress: process.env.RESEND_FROM_ADDRESS || "Capabilio <onboarding@resend.dev> (default — RESEND_FROM_ADDRESS not set)",
  pid: process.pid,
  workerBootedAt: __serverBootedAt,
}))

// ─── Mount routes ─────────────────────────────────────────────────────────────
app.use("/api",              resumeRoutes)       // extract-pdf, extract-linkedin
app.use("/api",              assessmentRoutes)   // generate-mcq, analyse-assessment, analyse-professional-profile
app.use("/api/arena",        arenaRoutes)        // daily, challenge, review, hint, run-tests
app.use("/api/arena/v2",    arenaV2Routes)      // catalog, submit, streaks, leaderboard, recruiter, roles, daily-assignment, proof-artifacts, weak-topics, sub-elo, stats
app.use("/api/av2/library",  arenaV2LibraryRoutes) // Arena V2 rebuild, Milestone 2 — role-capabilities, skill-graphs, scenario-packs, datasets, challenge-templates CRUD
app.use("/api/av2/challenges", arenaV2DeliveryRoutes) // Arena V2 rebuild, Milestone 6 — Challenge Delivery API: POST /next, GET /active, POST /expire-sweep
app.use("/api/av2/submissions", arenaV2SubmissionRoutes) // Arena V2 rebuild, Milestone 8 — Submission API: POST / (submit an attempt, get back a graded Feedback DTO)
app.use("/api/av2/portfolio",   arenaV2PortfolioRoutes)  // Arena V2 rebuild, Milestone 10 — Portfolio & Recruiter Evidence API
app.use("/api/proofs",          proofsRoutes)            // Portfolio redesign — public Engineering Proofs API (no auth: portfolios are public pages)
app.use("/api/education",       educationRoutes)         // Education redesign Phase 1 — academic identity (education_profile) + achievements (proof_objects)
app.use("/api/verification",    verificationRoutes)      // Trust & Verification Center Phase 1 — provider registry, hash-chained audit log
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
app.use("/api",              weeklyPulseRoutes)         // pro/weekly — Weekly Career Check
app.use("/api",              homeV1Routes)              // pro/v1/home — Career OS Workstream 1 priority ranking
app.use("/api",              forgeRoutes)               // pro/forge
app.use("/api",              aiInterviewRoutes)         // pro/interview
app.use("/api",              recruiterCommsRoutes)      // jobs, recruiter/messages, offers
app.use("/api",              mentorHubRoutes)           // mentors, mentors/bookings
app.use("/api",              pulseNexusRoutes)          // pulse/feed, pulse/market-insights (Gemini Search), nexus/*
app.use("/api",              orbitPlansRoutes)          // orbit/plans, intel/report
app.use("/api",              hardwareChallengesRoutes)  // hardware/challenges, hardware/my-attempts
app.use("/api/copilot",       copilotCoachRoutes)       // coach — pilot MCP tool-use path for Capi's career-coach intent
app.use("/api/groq",          groqProxyRoutes)          // chat — server-side Groq proxy for Capi's general chat + classifier
// ── College Path ───────────────────────────────────────────────────────────────
app.use("/api/college",       collegeRoutes)            // institutions/:id/{roster,students,leaderboard,stats,branches,export,placements/:id/confirm,students/:id/elo-adjustment}
app.use("/api/org",           orgVerificationRoutes)    // verify-email — server-side PC-7-compliant write to profiles.verificationStatus
app.use("/api/org",           orgJoinLinksRoutes)       // join-links (CRUD), join/:token (resolve + claim) — self-serve student onboarding
app.use("/api/org",           orgCompanyLinksRoutes)    // company-links (invite w/ real-account matching), received, accept-nda, decline

// ─── Start ────────────────────────────────────────────────────────────────────
// BUG FIX (critical, see cluster block above): the primary process in a
// production cluster must never reach this call — only workers (and the
// single process in dev/non-clustered mode) should bind the port. Before
// this guard, the primary fell through unconditionally and directly bound
// PORT itself, which is what caused the "bind EADDRINUSE null:10000"
// crash loop — its own workers' cluster-IPC bind requests for the same
// port were racing against a bind the primary had no business making.
if (!IS_CLUSTER_PRIMARY) {
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
}
