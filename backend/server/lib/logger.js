/**
 * logger.js — minimal structured logging, no new dependency.
 * ---------------------------------------------------------------------------
 * The codebase has no winston/pino and this isn't the place to introduce
 * one wholesale (that's a real migration across ~100 files' worth of
 * scattered console.log/console.error calls — a separate, deliberate
 * effort, not something to bundle into an unrelated fix). What actually
 * blocks debugging production incidents right now is that error logs are
 * unstructured free text with no consistent fields — this gives every NEW
 * call site (the global error handler, process crash handlers, the Python
 * sandbox) a consistent, greppable, JSON-parseable shape, without adding a
 * package.json dependency or touching working code elsewhere.
 *
 * Each entry is a single-line JSON object on stdout/stderr — this is
 * exactly what every hosted-logging platform (Render's own log viewer,
 * Datadog, Better Stack, etc.) expects to ingest and index without extra
 * parsing config. Migrating the rest of the codebase's console.log calls to
 * this is legitimate follow-up work, not done here.
 */

function write(level, stream, message, context) {
  const entry = {
    level,
    time: new Date().toISOString(),
    pid: process.pid,
    message,
    ...(context && typeof context === "object" ? context : {}),
  }
  stream(JSON.stringify(entry))
}

export const logger = {
  info(message, context) { write("info", console.log, message, context) },
  warn(message, context) { write("warn", console.warn, message, context) },
  error(message, context) {
    // Error objects don't serialize usefully via plain spread (message/stack
    // are non-enumerable) — pull them out explicitly when present.
    const ctx = context && typeof context === "object" ? { ...context } : {}
    if (ctx.err instanceof Error) {
      ctx.err = { name: ctx.err.name, message: ctx.err.message, stack: ctx.err.stack }
    }
    write("error", console.error, message, ctx)
  },
}
