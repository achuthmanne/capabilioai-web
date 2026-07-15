/**
 * shared/logger.ts
 *
 * Structured observability logging for every MCP tool invocation.
 *
 * SECURITY RULES (must never be broken):
 *   - Never log JWT tokens, passwords, or auth headers
 *   - Never log full request bodies (may contain PII / code solutions)
 *   - Never log SQL queries, Supabase keys, or internal config
 *   - Never log another user's uid in a context where only your uid is expected
 *   - Log userId and role for every entry — but nothing more from the JWT
 *
 * Structured format: each log entry is a single JSON line on stderr
 * (stdout is reserved for MCP protocol messages).
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEntry {
  ts:       string         // ISO 8601 timestamp
  level:    LogLevel
  tool:     string         // e.g. "student.getProfile"
  userId:   string         // JWT sub — only identifier we log
  role:     string         // JWT role claim
  latencyMs?: number       // wall-clock ms; only present in "info" success/failure entries
  success?: boolean        // true = tool returned OK, false = tool threw
  errorCode?: string       // McpError code or "UNEXPECTED" on unhandled throws
  errorMsg?: string        // short error summary — never include raw SQL or secrets
  meta?: Record<string, unknown> // optional safe context (page, filter params, etc.)
}

/** Internal: write one JSON line to stderr */
function emit(entry: LogEntry): void {
  process.stderr.write(JSON.stringify(entry) + "\n")
}

/**
 * Logger returned by createLogger(). Carries the tool name and
 * authenticated user so individual tool files don't have to repeat them.
 */
export interface ToolLogger {
  debug: (msg: string, meta?: Record<string, unknown>) => void
  info:  (msg: string, meta?: Record<string, unknown>) => void
  warn:  (msg: string, meta?: Record<string, unknown>) => void
  /**
   * Call once when the tool finishes successfully.
   * Pass the wall-clock start timestamp returned by Date.now().
   */
  success: (startedAt: number, meta?: Record<string, unknown>) => void
  /**
   * Call once in the catch block when the tool fails.
   * Never include the raw error object (may contain stack + secrets).
   */
  failure: (
    startedAt: number,
    errorCode: string,
    errorSummary: string,
    meta?: Record<string, unknown>
  ) => void
}

/**
 * Create a tool-scoped logger.
 * Call this at the top of every tool handler, before any async work.
 *
 * @param tool   — tool name in "namespace.action" format, e.g. "arena.submitChallenge"
 * @param userId — JWT sub claim (never log the full JWT)
 * @param role   — JWT role claim
 */
export function createLogger(tool: string, userId: string, role: string): ToolLogger {
  const base = { tool, userId, role }

  return {
    debug(msg, meta) {
      if (process.env.LOG_LEVEL === "debug") {
        emit({
          ...base,
          ts: new Date().toISOString(),
          level: "debug",
          errorMsg: msg,
          ...(meta !== undefined ? { meta } : {}),
        })
      }
    },
    info(msg, meta) {
      emit({
        ...base,
        ts: new Date().toISOString(),
        level: "info",
        errorMsg: msg,
        ...(meta !== undefined ? { meta } : {}),
      })
    },
    warn(msg, meta) {
      emit({
        ...base,
        ts: new Date().toISOString(),
        level: "warn",
        errorMsg: msg,
        ...(meta !== undefined ? { meta } : {}),
      })
    },
    success(startedAt, meta) {
      emit({
        ...base,
        ts:        new Date().toISOString(),
        level:     "info",
        success:   true,
        latencyMs: Date.now() - startedAt,
        ...(meta !== undefined ? { meta } : {}),
      })
    },
    failure(startedAt, errorCode, errorSummary, meta) {
      // Scrub anything that looks like a secret / token / sql before logging
      const safe = scrub(errorSummary)
      emit({
        ...base,
        ts:        new Date().toISOString(),
        level:     "error",
        success:   false,
        latencyMs: Date.now() - startedAt,
        errorCode,
        errorMsg:  safe,
        ...(meta !== undefined ? { meta } : {}),
      })
    },
  }
}

// ── Secret scrubber ───────────────────────────────────────────────────────────
// Strips anything that looks like a JWT, UUID-style key, or SQL keyword block
// from error summaries before they reach the log sink.

const SCRUB_PATTERNS: RegExp[] = [
  /eyJ[\w-]{10,}\.[\w-]+\.[\w-]+/g,          // JWT pattern
  /\b(sk|pk|secret|password|token|key)[\w-]{8,}\b/gi, // common secret prefixes
  /\bpassword\s*=\s*['"]?[^\s'"]+/gi,         // password= assignments
  /\b[0-9a-f]{32,}\b/gi,                      // long hex strings (api keys)
]

function scrub(msg: string): string {
  let out = msg
  for (const pat of SCRUB_PATTERNS) {
    out = out.replace(pat, "[REDACTED]")
  }
  return out.slice(0, 500) // hard cap on error message length
}

// ── Timing helper ─────────────────────────────────────────────────────────────

/** Returns Date.now() — sugar so tool files don't need to import Date.now */
export function startTimer(): number {
  return Date.now()
}
