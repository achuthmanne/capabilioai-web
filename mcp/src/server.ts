/**
 * mcp/src/server.ts — Capabilio MCP Server entry point
 *
 * Architecture:
 *   AI Client → MCP Server (this file) → tool handlers → client.ts → REST API → Supabase
 *
 * Every tool:
 *   1. Verifies JWT locally (no network call)
 *   2. Asserts role permission for the tool namespace
 *   3. Asserts ownership where applicable
 *   4. Proxies to https://capabilio-server.onrender.com/api/*
 *   5. Logs success/failure with structured JSON to stderr
 *
 * Transport: stdio (AI client spawns this process and speaks MCP over stdin/stdout)
 *
 * Tools registered (55 total across 10 domains — see 2026-07-14 wiring-fix
 * pass in each file's header comment for what's real vs. NOT_IMPLEMENTED):
 *   student       — 8 tools  (2 NOT_IMPLEMENTED: getOrbitStats, getActivityFeed; +2 added: getCurrentRole, getWeakSkills)
 *   arena         — 8 tools  (+3: getWorkbenchForRole, getMissionHistory, recommendNextChallenge)
 *   skillStudio   — 7 tools  (+2: getCompletedModules, getLearningProgress; 4 NOT_IMPLEMENTED total)
 *   elo           — 4 tools  (1 NOT_IMPLEMENTED: getComparison)
 *   vault         — 4 tools  (3 NOT_IMPLEMENTED: listArtifacts, addArtifact, updateArtifact)
 *   launchpad     — 4 tools
 *   interview     — 5 tools  (1 NOT_IMPLEMENTED/retired: getQuestion)
 *   recruiter     — 5 tools
 *   college       — 5 tools  (all 5 NOT_IMPLEMENTED — no backend domain exists)
 *   analytics     — 5 tools  (4 NOT_IMPLEMENTED; getSkillGapReport partially works if `stream` is passed)
 *
 * Environment variables required:
 *   SUPABASE_JWT_SECRET  — used for local JWT verification (never network)
 *
 * Optional:
 *   MCP_BACKEND_URL      — override backend URL (default: https://capabilio-server.onrender.com)
 *   LOG_LEVEL            — "debug" for verbose logging (default: info)
 *
 * Run:
 *   npm run dev       # tsx watch (development)
 *   npm run build     # compile TypeScript → dist/
 *   npm start         # node dist/server.js (production)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

// Tool domain registrars
import { registerStudentTools }     from "./tools/student.js"
import { registerArenaTools }       from "./tools/arena.js"
import { registerSkillStudioTools } from "./tools/skillStudio.js"
import { registerEloTools }         from "./tools/elo.js"
import { registerVaultTools }       from "./tools/vault.js"
import { registerLaunchpadTools }   from "./tools/launchpad.js"
import { registerInterviewTools }   from "./tools/interview.js"
import { registerRecruiterTools }   from "./tools/recruiter.js"
import { registerCollegeTools }     from "./tools/college.js"
import { registerAnalyticsTools }   from "./tools/analytics.js"

// ── Startup check ─────────────────────────────────────────────────────────────

if (!process.env.SUPABASE_JWT_SECRET) {
  process.stderr.write(
    JSON.stringify({
      ts:    new Date().toISOString(),
      level: "error",
      msg:   "SUPABASE_JWT_SECRET is not set. The MCP server cannot verify JWTs and will refuse all tool calls.",
    }) + "\n"
  )
  // Do NOT exit — the server must start so the AI client can receive a proper
  // McpError rather than a connection-refused error. Each tool will throw
  // McpError(InternalError) when it hits verifyJWT without the secret.
}

// ── Create server ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name:    "capabilio-mcp",
  version: "1.0.0",
})

// ── Register all tool domains ──────────────────────────────────────────────────

registerStudentTools(server)
registerArenaTools(server)
registerSkillStudioTools(server)
registerEloTools(server)
registerVaultTools(server)
registerLaunchpadTools(server)
registerInterviewTools(server)
registerRecruiterTools(server)
registerCollegeTools(server)
registerAnalyticsTools(server)

// ── Log tool count ────────────────────────────────────────────────────────────

process.stderr.write(
  JSON.stringify({
    ts:      new Date().toISOString(),
    level:   "info",
    msg:     "Capabilio MCP Server starting",
    backend: process.env.MCP_BACKEND_URL ?? "https://capabilio-server.onrender.com",
    domains: [
      "student(8)", "arena(8)", "skillStudio(7)", "elo(4)",
      "vault(4)", "launchpad(4)", "interview(5)",
      "recruiter(5)", "college(5)", "analytics(5)",
    ],
    totalTools: 55,
  }) + "\n"
)

// ── Connect transport and run ─────────────────────────────────────────────────

const transport = new StdioServerTransport()

server.connect(transport).then(() => {
  process.stderr.write(
    JSON.stringify({
      ts:    new Date().toISOString(),
      level: "info",
      msg:   "Capabilio MCP Server ready — listening on stdio",
    }) + "\n"
  )
}).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(
    JSON.stringify({
      ts:    new Date().toISOString(),
      level: "error",
      msg:   `Failed to connect MCP transport: ${msg}`,
    }) + "\n"
  )
  process.exit(1)
})

// ── Graceful shutdown ─────────────────────────────────────────────────────────

process.on("SIGTERM", () => {
  process.stderr.write(
    JSON.stringify({ ts: new Date().toISOString(), level: "info", msg: "SIGTERM — shutting down" }) + "\n"
  )
  process.exit(0)
})

process.on("SIGINT", () => {
  process.exit(0)
})
