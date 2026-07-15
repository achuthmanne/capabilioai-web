/**
 * shared/client.ts
 *
 * Thin HTTP client that MCP tools use to call the Capabilio backend REST API.
 *
 * Architecture: MCP tools NEVER access Supabase directly.
 * All data flows through: AI → MCP tool → this client → backend REST → Supabase
 *
 * SECURITY:
 *   - The user's JWT is forwarded as-is in the Authorization header.
 *   - The client never stores credentials beyond the duration of one tool call.
 *   - Never log request/response bodies (may contain code solutions or PII).
 *   - Enforces a 30s timeout to prevent AI hangs when the backend is slow.
 *
 * Backend URL: https://capabilio-server.onrender.com
 *   Override with MCP_BACKEND_URL env var for local dev / staging.
 */

import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"

// ── Config ────────────────────────────────────────────────────────────────────

const BACKEND_URL =
  (process.env.MCP_BACKEND_URL ?? "https://capabilio-server.onrender.com").replace(
    /\/$/,
    ""
  )

const DEFAULT_TIMEOUT_MS = 30_000

// ── Types ─────────────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface ClientOptions {
  method?:       HttpMethod
  /** URL query-string params — appended to path */
  params?:       Record<string, string | number | boolean | undefined>
  /** Request body — serialized as JSON */
  body?:         unknown
  timeoutMs?:    number
}

export interface ClientResponse<T = unknown> {
  ok:     boolean
  status: number
  data:   T
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

/**
 * Make an authenticated call to the Capabilio backend.
 *
 * @param jwt    — Supabase JWT from the tool handler's verifyJWT() result
 * @param path   — API path starting with /api/... (e.g. "/api/profile")
 * @param opts   — method, params, body, timeoutMs
 * @throws McpError on network failure, 4xx, or 5xx
 */
export async function call<T = unknown>(
  jwt: string,
  path: string,
  opts: ClientOptions = {}
): Promise<T> {
  const { method = "GET", params, body, timeoutMs = DEFAULT_TIMEOUT_MS } = opts

  // Build URL with query params
  const url = new URL(BACKEND_URL + path)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${jwt}`,
    "X-Client":      "capabilio-mcp/1.0",
  }

  // Abort signal for timeout
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      signal: controller.signal,
      // exactOptionalPropertyTypes: RequestInit.body must be omitted entirely
      // (not set to `undefined`) when there is no body to send.
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch (err: unknown) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : "Network error"
    if (msg.includes("abort") || msg.includes("AbortError")) {
      throw new McpError(
        ErrorCode.InternalError,
        `Backend request timed out after ${timeoutMs}ms — ${path}`
      )
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Backend unreachable: ${msg}`
    )
  } finally {
    clearTimeout(timer)
  }

  // Parse body (backend always returns JSON)
  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new McpError(
      ErrorCode.InternalError,
      `Backend returned non-JSON response for ${path} (status ${res.status})`
    )
  }

  // Handle HTTP errors
  if (!res.ok) {
    const errMsg = extractErrorMessage(json)
    switch (true) {
      case res.status === 401:
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unauthorized: ${errMsg}`
        )
      case res.status === 403:
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Forbidden: ${errMsg}`
        )
      case res.status === 404:
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Not found: ${path} — ${errMsg}`
        )
      case res.status === 429:
        throw new McpError(
          ErrorCode.InternalError,
          `Rate limit exceeded — please wait before retrying`
        )
      case res.status >= 400 && res.status < 500:
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Bad request (${res.status}): ${errMsg}`
        )
      default:
        throw new McpError(
          ErrorCode.InternalError,
          `Backend error (${res.status}): ${errMsg}`
        )
    }
  }

  return json as T
}

// ── Convenience methods ───────────────────────────────────────────────────────

export const api = {
  get<T = unknown>(jwt: string, path: string, params?: ClientOptions["params"]) {
    return call<T>(jwt, path, { method: "GET", ...(params !== undefined ? { params } : {}) })
  },
  post<T = unknown>(jwt: string, path: string, body: unknown, params?: ClientOptions["params"]) {
    return call<T>(jwt, path, { method: "POST", body, ...(params !== undefined ? { params } : {}) })
  },
  put<T = unknown>(jwt: string, path: string, body: unknown) {
    return call<T>(jwt, path, { method: "PUT", body })
  },
  patch<T = unknown>(jwt: string, path: string, body: unknown) {
    return call<T>(jwt, path, { method: "PATCH", body })
  },
  delete<T = unknown>(jwt: string, path: string) {
    return call<T>(jwt, path, { method: "DELETE" })
  },
}

// ── Helper ────────────────────────────────────────────────────────────────────

function extractErrorMessage(body: unknown): string {
  if (typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>
    const candidate = b["message"] ?? b["error"] ?? b["msg"] ?? b["detail"]
    if (typeof candidate === "string") return candidate.slice(0, 300)
  }
  return "unknown error"
}
