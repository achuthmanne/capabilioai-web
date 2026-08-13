// ─── Route: POST /api/copilot/coach ────────────────────────────────────────
// Pilot: tool-augmented answers for Capi's career-coach intent only
// ("what should I do today/next", "am I ready", etc.) — everything else in
// Capi (general chat, streaming, tier limits, off-topic blocking) is
// untouched and keeps calling Groq directly from the browser as before.
//
// This is the first user-facing feature that actually routes through the MCP
// layer: AI (Groq, with tool-use) → MCP tool → mcp/shared/client.ts →
// this backend's own REST API → Supabase. The model never sees the caller's
// JWT as a tool argument it can edit — this route injects it on every call.
//
// Switched from Anthropic's native tool-use to Groq's OpenAI-style function
// calling (2026-08-13, account owner request — no Anthropic credits, Groq
// credits available). Shape differences from the old Anthropic version:
//   - tool schemas use `parameters` (JSON Schema), not `input_schema`, and
//     are wrapped in `{ type: "function", function: {...} }`.
//   - a tool-call turn is detected via `finishReason === "tool_calls"`
//     (Anthropic: `stop_reason === "tool_use"`).
//   - each tool call's arguments arrive as a JSON *string* that must be
//     parsed (Anthropic: already a parsed object).
//   - tool results are appended as one `{ role: "tool", tool_call_id,
//     content }` message per call (Anthropic: one batched user turn with
//     multiple tool_result blocks).
// See groq.js's groqTools() for the underlying client.
//
// Only tools with real, verified backend support are exposed here:
//   - arena.recommendNextChallenge
//   - elo.getScore
//   - student.getCurrentRole
//   - student.getWeakSkills
// recommendCourse / getLearningProgress / getComparison / anything
// NOT_IMPLEMENTED are deliberately excluded — giving the model a tool that
// always throws would make failures look like a broken feature instead of
// a known gap.

import { Router } from "express"
import { groqTools, GROQ_BIG } from "../lib/groq.js"
import { requireAuth } from "../lib/auth.js"
import { callMcpTool } from "../lib/mcpClient.js"

const router = Router()

const MAX_TOOL_ITERATIONS = 4 // hard cap — never let the loop run away

// ── Tool schemas exposed to the model (Groq/OpenAI function-calling shape)
// Note: no `authorization`/`targetUid` params here — the model never handles
// auth. Each handler below injects the caller's own JWT and never allows a
// targetUid, keeping this endpoint strictly self-service.
const TOOLS = [
  {
    type: "function",
    function: {
      name: "recommendNextChallenge",
      description: "Recommend the next Arena challenge for the student to attempt, based on their current ELO, weak topics, and role. Call this for 'what should I do next/today' style questions.",
      parameters: {
        type: "object",
        properties: {
          roleHint: { type: "string", description: "Optional role hint, e.g. 'frontend', 'ece_embedded'. Omit to use the student's own profile role." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCurrentElo",
      description: "Get the student's current ELO score, tier, and global rank.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getCurrentRole",
      description: "Get the student's current role, stream, and career track, resolved from their profile.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getWeakSkills",
      description: "Get the student's weak-topic signals (topics with a low pass rate in recent Arena submissions).",
      parameters: { type: "object", properties: {} },
    },
  },
]

// Maps the tool name the model sees to the real MCP tool name + how to build its arguments.
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
// Returns fast — before touching Groq or spawning the MCP process — so a
// demo can recover from an MCP/auth/Groq-availability issue instantly.
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
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message },
    ]

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const { message: assistantMsg, finishReason } = await groqTools(messages, {
        model: GROQ_BIG,
        max_tokens: 500,
        tools: TOOLS,
      })

      if (finishReason !== "tool_calls" || !assistantMsg.tool_calls?.length) {
        const text = assistantMsg.content || ""
        logCoachInvocation({
          userId, role, prompt: message, toolsUsed,
          latencyMs: Date.now() - startedAt, success: true, fallbackOccurred: false,
        })
        return res.json({ text, toolCallsUsed: messages.length > 2 })
      }

      // Execute every tool call in this turn, feed results back — Groq/
      // OpenAI convention: the assistant turn carries `tool_calls`, and each
      // result is its own `{ role: "tool", tool_call_id, content }` message
      // (not one batched turn like Anthropic's tool_result blocks).
      messages.push({ role: "assistant", content: assistantMsg.content || null, tool_calls: assistantMsg.tool_calls })

      for (const call of assistantMsg.tool_calls) {
        toolsUsed.push(call.function?.name)
        let content
        try {
          // Groq/OpenAI sends arguments as a JSON string, unlike Anthropic's
          // already-parsed `input` object — never trust it blindly.
          let args = {}
          try { args = call.function?.arguments ? JSON.parse(call.function.arguments) : {} } catch { args = {} }
          const result = await mcpCallFor(call.function?.name, args, authorization)
          content = JSON.stringify(result).slice(0, 4000) // cap payload back to the model
        } catch (e) {
          content = `Error: ${e.message || "tool call failed"}`
        }
        messages.push({ role: "tool", tool_call_id: call.id, content })
      }
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
