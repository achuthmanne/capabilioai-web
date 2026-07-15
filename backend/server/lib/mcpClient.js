// ─── MCP client bridge ─────────────────────────────────────────────────────
// Lets backend routes call MCP tools through the real MCP protocol instead of
// duplicating the tool logic / REST-endpoint mapping. Spawns the built mcp/
// server (mcp/dist/server.js) as a persistent child process over stdio and
// keeps one long-lived client connection, reused across requests.
//
// Architecture this preserves: caller → this bridge → MCP tool handler →
// (mcp/shared/client.ts) → this same backend's REST API → Supabase. The MCP
// tool never sees Supabase directly; this bridge never re-implements a tool's
// logic — it only forwards { name, arguments } and returns the tool's result.
//
// SECURITY: the caller's JWT must be included by the route in `arguments.
// authorization` (e.g. "Bearer <jwt>") for every tool call — this bridge does
// not attach or fabricate credentials on its own.

import path from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MCP_SERVER_ENTRY = path.resolve(__dirname, "../../../mcp/dist/server.js")

let clientPromise = null

function buildEnv() {
  // Inherit the current process env (SUPABASE_JWT_SECRET, MCP_BACKEND_URL
  // override if set, ANTHROPIC_API_KEY not needed by mcp/ itself) rather than
  // hand-picking vars — this backend and the mcp/ server are the same
  // deployment's config, not two separately-configured services.
  return { ...process.env }
}

async function connect() {
  const transport = new StdioClientTransport({
    command: process.execPath, // same node binary running this backend
    args: [MCP_SERVER_ENTRY],
    env: buildEnv(),
  })

  const client = new Client(
    { name: "capabilio-backend-copilot", version: "1.0.0" },
    { capabilities: {} }
  )

  transport.onerror = (err) => {
    console.error("[mcpClient] transport error:", err?.message || err)
    clientPromise = null // force reconnect on next call
  }
  transport.onclose = () => {
    console.warn("[mcpClient] MCP server process closed — will respawn on next call")
    clientPromise = null
  }

  await client.connect(transport)
  return client
}

/** Returns a connected client, reusing the existing connection if healthy. */
function getClient() {
  if (!clientPromise) {
    clientPromise = connect().catch((err) => {
      clientPromise = null
      throw err
    })
  }
  return clientPromise
}

/**
 * Call an MCP tool by name and return its parsed result.
 *
 * @param {string} name — tool name, e.g. "arena.recommendNextChallenge"
 * @param {object} args — tool arguments, MUST include `authorization` for
 *   every tool that requires it (all of them do today)
 * @returns {Promise<unknown>} — parsed JSON from the tool's text content
 * @throws if the tool call fails or returns isError
 */
export async function callMcpTool(name, args) {
  const client = await getClient()
  const result = await client.callTool({ name, arguments: args })

  if (result.isError) {
    const msg = result.content?.[0]?.type === "text" ? result.content[0].text : "MCP tool returned an error"
    throw new Error(`MCP tool ${name} failed: ${msg}`)
  }

  const textBlock = result.content?.find((c) => c.type === "text")
  if (!textBlock) return result

  try {
    return JSON.parse(textBlock.text)
  } catch {
    return textBlock.text
  }
}
