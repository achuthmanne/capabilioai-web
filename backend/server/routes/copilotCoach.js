// ─── Route: POST /api/copilot/coach ────────────────────────────────────────
// Pilot: tool-augmented answers for Capi's career-coach intent only
// ("what should I do today/next", "am I ready", etc.) — everything else in
// Capi (general chat, streaming, tier limits, off-topic blocking) is
// untouched and keeps calling Groq directly from the browser as before.
//
// This is the first user-facing feature that actually routes through the MCP
// layer: AI (Claude, with tool-use) → MCP tool → mcp/shared/client.ts →
// this backend's own REST API → Supabase. The model never sees the caller's
// JWT as a tool argument it can edit — this route injects it on every call.
//
// Only tools with real, verified backend support are exposed here:
//   - arena.recommendNextChallenge
//   - elo.getScore
//   - student.getCurrentRole
//   - student.getWeakSkills
// recommendCourse / getLearningProgress / getComparison / anything
// NOT_IMPLEMENTED are deliberately excluded — giving Claude a tool that
// always throws would make failures look like a broken feature instead of
// a known gap.

import { Router } from "express"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "../lib/auth.js"
import { callMcpTool } from "../lib/mcpClient.js"

const router = Router()

const CLAUDE_HAIKU = "claude-haiku-4-5"
const MAX_TOOL_ITERATIONS = 4 // hard cap — never let the loop run away

function client() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key === "your_anthropic_key_here") throw new Error("ANTHROPIC_API_KEY not set")
  return new Anthropic({ apiKey: key })
}

// ── Tool schemas exposed to Claude ──────────────────────────────────────────
// Note: no `authorization`/`targetUid` params here — the model never handles
// auth. Each handler below injects the caller's own JWT and never allows a
// targetUid, keeping this endpoint strictly self-service.
const TOOLS = [
  {
    name: "recommendNextChallenge",
    description: "Recommend the next Arena challenge for the student to attempt, based on their current ELO, weak topics, and role. Call this for 'what should I do next/today' style questions.",
    input_schema: {
      type: "object",
      properties: {
        roleHint: { type: "string", description: "Optional role hint, e.g. 'frontend', 'ece_embedded'. Omit to use the student's own profile role." },
      },
    },
  },
  {
    name: "getCurrentElo",
    description: "Get the student's current ELO score, tier, and global rank.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "getCurrentRole",
    description: "Get the student's current role, stream, and career track, resolved from their profile.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "getWeakSkills",
    description: "Get the student's weak-topic signals (topics with a low pass rate in recent Arena submissions).",
    input_schema: { type: "object", properties: {} },
  },
]

// Maps the tool name Claude sees to the real MCP tool name + how to build its arguments.
function mcpCallFor(toolName, input, authorization) {
  switch (toolName) {
    case "recommendNextChallenge":
      return callMcpTool("arena.recommendNextChallenge", {
        authorization,
        ...(input?.roleHint ? { roleHint: String(input.roleHint) } : {}),
      })
    case "getCurrentElo":
      return callMcpTool("elo.getScore", { authorization })
    case "getCurrentRole":
      return callMcpTool("student.getCurrentRole", { authorization })
    case "getWeakSkills":
      return callMcpTool("student.getWeakSkills", { authorization })
    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

const SYSTEM_PROMPT = `You are Capi, Capabilio's AI career copilot, answering a "what should I do next" style question.

Rules:
- Never invent the student's ELO, role, or weak skills — always call a tool to get real data before answering.
- Compose the tool results into one direct, specific, actionable answer (2-4 sentences).
- Do not repeat raw tool output verbatim; synthesize it into advice a senior colleague would give.
- If a tool call fails, acknowledge you couldn't fetch that specific data rather than guessing.
- Never start with "I" or "As an AI". Be direct and warm, not corporate.`

// ── Feature flag ────────────────────────────────────────────────────────────
// ENABLE_MCP_COACH=false (or unset in an env that explicitly sets it false)
// flips this off with a single env var, no redeploy/code change needed.
// Returns fast — before touching Claude or spawning the MCP process — so a
// demo can recover from an MCP/auth/Claude-availability issue instantly.
// The widget's existing fallback-to-Groq logic (any non-2xx response) is
// what makes this work with ZERO frontend changes: disabling the flag here
// is enough to route every coach question back through the stable path.
function mcpCoachEnabled() {
  return process.env.ENABLE_MCP_COACH !== "false"
}

// ── Structured invocation logging ───────────────────────────────────────────
// One JSON line per /coach call — role, prompt preview, which MCP tools were
// actually invoked, latency, and whether the widget will see a fallback
// (any non-2xx). Plain console.log (matches this backend's existing logging
// convention — no winston/pino dependency, no new DB table/schema). Ships to
// stdout, so Render/whatever host is already capturing it; wiring a real
// aggregator (Datadog, etc.) later just means parsing this line, no code
// change here needed. Deliberately does NOT log the full prompt (privacy —
// preview is enough to spot popular question patterns) and never logs tool
// *output* (that's the student's ELO/skill data, not just metadata).
function logCoachInvocation({ userId, role, prompt, toolsUsed, latencyMs, success, failureReason, fallbackOccurred }) {
  console.log(JSON.stringify({
    event: "coach_invocation",
    ts: new Date().toISOString(),
    userId,
    role,
    promptPreview: String(prompt || "").slice(0, 120),
    toolsUsed,
    latencyMs,
    success,
    failureReason: failureReason || null,
    fallbackOccurred: !!fallbackOccurred,
  }))
}

router.post("/coach", requireAuth, async (req, res) => {
  const startedAt = Date.now()
  const userId = req.user?.id
  const role = req.user?.role
  const { message = "" } = req.body

  if (!mcpCoachEnabled()) {
    logCoachInvocation({
      userId, role, prompt: message, toolsUsed: [],
      latencyMs: Date.now() - startedAt, success: false,
      failureReason: "disabled", fallbackOccurred: true,
    })
    return res.status(503).json({ error: "MCP coach path is disabled (ENABLE_MCP_COACH=false)" })
  }

  if (!message.trim()) {
    logCoachInvocation({
      userId, role, prompt: message, toolsUsed: [],
      latencyMs: Date.now() - startedAt, success: false,
      failureReason: "empty_message", fallbackOccurred: true,
    })
    return res.status(400).json({ error: "message is required" })
  }

  const authorization = req.headers.authorization // "Bearer <jwt>" — forwarded as-is, never modified
  const toolsUsed = []

  try {
    const ai = client()
    const messages = [{ role: "user", content: message }]

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await ai.messages.create({
        model: CLAUDE_HAIKU,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      })

      if (response.stop_reason !== "tool_use") {
        const text = response.content.find((b) => b.type === "text")?.text || ""
        logCoachInvocation({
          userId, role, prompt: message, toolsUsed,
          latencyMs: Date.now() - startedAt, success: true, fallbackOccurred: false,
        })
        return res.json({ text, toolCallsUsed: messages.length > 1 })
      }

      // Execute every tool_use block in this turn, feed results back.
      messages.push({ role: "assistant", content: response.content })

      const toolResults = []
      for (const block of response.content) {
        if (block.type !== "tool_use") continue
        toolsUsed.push(block.name)
        try {
          const result = await mcpCallFor(block.name, block.input, authorization)
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result).slice(0, 4000), // cap payload back to the model
          })
        } catch (e) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error: ${e.message || "tool call failed"}`,
            is_error: true,
          })
        }
      }
      messages.push({ role: "user", content: toolResults })
    }

    // Exhausted iterations without a final text answer — fail closed with a
    // clear signal so the widget falls back to its existing Groq path.
    logCoachInvocation({
      userId, role, prompt: message, toolsUsed,
      latencyMs: Date.now() - startedAt, success: false,
      failureReason: "tool_call_budget_exhausted", fallbackOccurred: true,
    })
    return res.status(502).json({ error: "Coach could not complete within the tool-call budget" })
  } catch (e) {
    console.error("[copilot/coach]", e.message)
    logCoachInvocation({
      userId, role, prompt: message, toolsUsed,
      latencyMs: Date.now() - startedAt, success: false,
      failureReason: e.message, fallbackOccurred: true,
    })
    return res.status(500).json({ error: e.message })
  }
})

export default router
