/**
 * opsMetrics.js — CAREER OS TRANCHE 11 (Monitoring / alerts readiness)
 *
 * In-process API error-rate/latency counters, grouped by endpoint group
 * (first two path segments, e.g. "/api/pro/v1/mentor", "/api/copilot").
 * This is deliberately NOT a new monitoring platform — there is no
 * Datadog/Sentry/Prometheus wired into this codebase (confirmed: no such
 * dependency in package.json, no existing metrics client anywhere in
 * backend/server/lib). This is the smallest real thing that fits what's
 * already here: a plain in-memory Map updated from a single Express
 * middleware, read by an admin-only endpoint (opsDashboard.js). It follows
 * the same "tagged console.error for anything alert-worthy" convention
 * already used throughout this codebase (e.g. "[mentorMarketplace:webhook]",
 * "[epfo async]", "[SectionErrorBoundary:...]").
 *
 * HONEST LIMITATION (stated here, not hidden): this is per-process,
 * in-memory state. It resets on every deploy/restart and does not aggregate
 * across multiple server instances/workers. That's a real gap for a
 * multi-instance production deployment — see the Tranche 11 report for what
 * a real fix (Redis-backed counters, or an actual APM) would require. This
 * module is honestly scoped as "good enough to see today's error rate on
 * this process without adding new infrastructure," not as a production-grade
 * metrics system.
 */

const WINDOW_MS = 15 * 60 * 1000 // 15-minute rolling window
const MAX_SAMPLES_PER_GROUP = 500 // cap memory — oldest samples drop off

// group -> array of { ts, status, durationMs }
const samples = new Map()

// Groups by the first 3 path segments (e.g. "/api/copilot/coach",
// "/api/admin/question-bank") — except this codebase's common
// "/api/<area>/v1/<module>/..." convention, where the version segment alone
// isn't a meaningful group (nearly every Career OS module uses "v1"), so one
// extra segment is included in that case (e.g. "/api/pro/v1/mentor" instead
// of just "/api/pro/v1").
function groupFor(path) {
  const parts = (path || "").split("/").filter(Boolean)
  if (parts.length === 0) return "/"
  let segCount = Math.min(parts.length, 3)
  if (parts.length > 3 && /^v\d+$/.test(parts[2] || "")) segCount = 4
  return "/" + parts.slice(0, segCount).join("/")
}

export function recordRequest(path, status, durationMs) {
  const group = groupFor(path)
  const list = samples.get(group) || []
  list.push({ ts: Date.now(), status, durationMs })
  if (list.length > MAX_SAMPLES_PER_GROUP) list.shift()
  samples.set(group, list)
}

/** Express middleware — wire once, near the top of the middleware chain. */
export function opsMetricsMiddleware(req, res, next) {
  const start = Date.now()
  res.on("finish", () => {
    recordRequest(req.path, res.statusCode, Date.now() - start)
  })
  next()
}

export function getMetricsSnapshot({ windowMs = WINDOW_MS } = {}) {
  const now = Date.now()
  const cutoff = now - windowMs
  const groups = []
  for (const [group, list] of samples.entries()) {
    const recent = list.filter(s => s.ts >= cutoff)
    if (recent.length === 0) continue
    const errorCount = recent.filter(s => s.status >= 500).length
    const clientErrorCount = recent.filter(s => s.status >= 400 && s.status < 500).length
    const durations = recent.map(s => s.durationMs).sort((a, b) => a - b)
    const p50 = durations[Math.floor(durations.length * 0.5)] || 0
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0
    groups.push({
      group,
      requestCount: recent.length,
      errorCount,
      errorRate: recent.length ? Number((errorCount / recent.length).toFixed(4)) : 0,
      clientErrorCount,
      latencyMsP50: p50,
      latencyMsP95: p95,
      latencyMsMax: durations[durations.length - 1] || 0,
    })
  }
  groups.sort((a, b) => b.requestCount - a.requestCount)
  return { windowMs, generatedAt: new Date(now).toISOString(), groups }
}

/**
 * Alert-worthy threshold check — logs a tagged, greppable line (the existing
 * codebase convention for anything that should page/notify someone watching
 * logs) rather than calling out to an external alerting service that
 * doesn't exist here. Intentionally simple and synchronous.
 */
export function checkAndLogAlerts(snapshot, { errorRateThreshold = 0.1, minRequests = 10 } = {}) {
  const fired = []
  for (const g of snapshot.groups) {
    if (g.requestCount >= minRequests && g.errorRate >= errorRateThreshold) {
      const line = `[ALERT:api_error_rate] group=${g.group} errorRate=${g.errorRate} requestCount=${g.requestCount} windowMs=${snapshot.windowMs}`
      console.error(line)
      fired.push({ type: "api_error_rate", group: g.group, errorRate: g.errorRate, requestCount: g.requestCount })
    }
  }
  return fired
}
