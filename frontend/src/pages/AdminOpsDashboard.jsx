/**
 * AdminOpsDashboard.jsx — Career OS Tranche D (2026-07-25): monitoring made
 * practically usable, not merely present in code.
 *
 * Real gap this closes: backend/server/routes/opsDashboard.js (Tranche 11)
 * has a complete, real read-only snapshot — API error rate/latency, Weekly
 * Skill Pulse completion, mentor funnel, payout health, moderation queue
 * depth, webhook health, consent-toggle counts, fired alerts — but no
 * frontend ever called it. An admin's only way to see it was `curl` or
 * Postman against a JSON endpoint. This page is that missing piece, nothing
 * more: no new business logic, no new schema, no new state machine — a thin
 * client over the existing, already-tested admin API.
 *
 * Reachability: NOT in any nav — reached only via the direct URL
 * /admin/ops-dashboard (see App.jsx's pathname check), same pattern as
 * /admin/question-bank. Access control is server-side (requireAuth +
 * requireAdmin on the one route this page calls); a non-admin landing here
 * just sees every request fail with 401/403, surfaced as an honest error
 * state.
 */
import { useState, useEffect, useCallback } from "react"
import { opsDashboardApi } from "../lib/api"

const INK = "#1A1714", MUT = "#6B6560", BG = "#FAFAFA", SURF = "#FFFFFF", BDR = "rgba(17,24,39,0.08)"
const GREEN = "#16A34A", AMBER = "#D97706", RED = "#DC2626", P = "#6366F1"
const MONO = "'DM Mono','Fira Mono',monospace"

function Card({ title, children, style = {} }) {
  return (
    <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 12, padding: 16, ...style }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: MUT, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Stat({ label, value, color = INK }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: MONO }}>{value}</div>
      <div style={{ fontSize: 11, color: MUT, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function pct(rate) {
  if (rate === null || rate === undefined) return "—"
  return `${(rate * 100).toFixed(1)}%`
}

export default function AdminOpsDashboard({ user }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastLoadedAt, setLastLoadedAt] = useState(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    opsDashboardApi.get()
      .then(res => { setData(res); setLastLoadedAt(new Date()) })
      .catch(e => setError(e.data?.error || e.message || "Failed to load — you may not have admin access"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (!user) {
    return <div style={{ padding: 40, textAlign: "center", color: MUT }}>Sign in as an admin to use this page.</div>
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "DM Sans, system-ui, sans-serif", padding: "24px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: P, fontFamily: MONO }}>Internal · Rollout Monitoring</div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 800, color: INK, margin: "4px 0 0" }}>Ops Dashboard</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {lastLoadedAt && <span style={{ fontSize: 11, color: MUT }}>Updated {lastLoadedAt.toLocaleTimeString()}</span>}
            <button onClick={load} disabled={loading} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${P}`, background: loading ? BDR : `${P}18`, color: P, fontSize: 12, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: `${RED}12`, border: `1px solid ${RED}44`, color: RED, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        {loading && !data && <div style={{ color: MUT, fontSize: 13 }}>Loading…</div>}

        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {data.alerts?.length > 0 && (
              <Card title="🔴 Active Alerts" style={{ borderColor: `${RED}55` }}>
                {data.alerts.map((a, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: RED, padding: "4px 0", fontFamily: MONO }}>
                    {a.type} — {JSON.stringify(a)}
                  </div>
                ))}
              </Card>
            )}
            {(!data.alerts || data.alerts.length === 0) && (
              <div style={{ fontSize: 12, color: GREEN, fontWeight: 700 }}>✓ No alerts fired this check</div>
            )}

            <Card title={`API Error Rate / Latency (in-process, ${Math.round((data.apiMetrics?.windowMs || 0) / 60000)}min window)`}>
              {(!data.apiMetrics?.groups || data.apiMetrics.groups.length === 0) && <div style={{ fontSize: 12, color: MUT }}>No requests recorded in this window yet (this process may have just started).</div>}
              {data.apiMetrics?.groups?.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: MUT, borderBottom: `1px solid ${BDR}` }}>
                        <th style={{ padding: "6px 8px" }}>Group</th>
                        <th style={{ padding: "6px 8px" }}>Requests</th>
                        <th style={{ padding: "6px 8px" }}>Error rate</th>
                        <th style={{ padding: "6px 8px" }}>p50 ms</th>
                        <th style={{ padding: "6px 8px" }}>p95 ms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.apiMetrics.groups.map(g => (
                        <tr key={g.group} style={{ borderBottom: `1px solid ${BDR}` }}>
                          <td style={{ padding: "6px 8px", fontFamily: MONO }}>{g.group}</td>
                          <td style={{ padding: "6px 8px" }}>{g.requestCount}</td>
                          <td style={{ padding: "6px 8px", color: g.errorRate >= 0.1 ? RED : INK, fontWeight: g.errorRate >= 0.1 ? 800 : 400 }}>{pct(g.errorRate)}</td>
                          <td style={{ padding: "6px 8px" }}>{g.latencyMsP50}</td>
                          <td style={{ padding: "6px 8px" }}>{g.latencyMsP95}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ fontSize: 10.5, color: MUT, marginTop: 8 }}>In-memory, per-process — resets on deploy/restart, does not aggregate across workers. See opsMetrics.js.</div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <Card title="Weekly Skill Pulse Completion">
                <div style={{ display: "flex", gap: 24 }}>
                  <Stat label="Last 7 days" value={pct(data.skillPulse?.last7Days?.rate)} />
                  <Stat label="Last 30 days" value={pct(data.skillPulse?.last30Days?.rate)} />
                </div>
              </Card>
              <Card title="Moderation Queue">
                <Stat label="Questions in review" value={data.moderationQueue?.inReviewCount ?? "—"} color={data.moderationQueue?.inReviewCount > 0 ? AMBER : INK} />
              </Card>
              <Card title="Mentor Webhook Health (24h)">
                <div style={{ display: "flex", gap: 20 }}>
                  <Stat label="Events" value={data.webhookHealth?.totalEvents ?? "—"} />
                  <Stat label="Failure rate" value={pct(data.webhookHealth?.failureRate)} color={data.webhookHealth?.failureRate >= 0.1 ? RED : GREEN} />
                </div>
              </Card>
              <Card title="Subscription Webhook (24h)">
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <Stat label="Events" value={data.subscriptionWebhookHealth?.totalEvents ?? "—"} />
                  <Stat label="Grant failed" value={data.subscriptionWebhookHealth?.grantFailedCount ?? "—"} color={data.subscriptionWebhookHealth?.grantFailedCount > 0 ? RED : INK} />
                  <Stat label="Stuck" value={data.subscriptionWebhookHealth?.nonTerminalStuckCount ?? "—"} color={data.subscriptionWebhookHealth?.nonTerminalStuckCount > 0 ? AMBER : INK} />
                </div>
                {data.subscriptionWebhookHealth?.note && <div style={{ fontSize: 10.5, color: MUT, marginTop: 8 }}>{data.subscriptionWebhookHealth.note}</div>}
              </Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Card title="Mentor Booking Funnel">
                {Object.keys(data.mentorFunnel || {}).length === 0
                  ? <div style={{ fontSize: 12, color: MUT }}>No bookings yet.</div>
                  : Object.entries(data.mentorFunnel).map(([status, count]) => (
                    <div key={status} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}>
                      <span style={{ color: MUT }}>{status}</span><span style={{ fontFamily: MONO, fontWeight: 700 }}>{count}</span>
                    </div>
                  ))}
              </Card>
              <Card title="Payout Health">
                {Object.keys(data.payoutHealth || {}).length === 0
                  ? <div style={{ fontSize: 12, color: MUT }}>No payouts yet.</div>
                  : Object.entries(data.payoutHealth).map(([status, count]) => (
                    <div key={status} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}>
                      <span style={{ color: MUT }}>{status}</span><span style={{ fontFamily: MONO, fontWeight: 700 }}>{count}</span>
                    </div>
                  ))}
              </Card>
            </div>

            <Card title="Consent / Privacy Signals">
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <Stat label="Profiles" value={data.consentToggles?.totalProfiles ?? "—"} />
                <Stat label="Not searchable" value={data.consentToggles?.searchableFalse ?? "—"} />
                <Stat label="Analytics off" value={data.consentToggles?.analyticsEnabledFalse ?? "—"} />
                <Stat label="Certs hidden" value={data.consentToggles?.certVisibleFalse ?? "—"} />
                <Stat label="Vault hidden" value={data.consentToggles?.vaultVisibleFalse ?? "—"} />
              </div>
              <div style={{ fontSize: 10.5, color: MUT, marginTop: 8 }}>{data.consentToggles?.note}</div>
            </Card>

            <Card title="RLS Signal" style={{ opacity: 0.85 }}>
              <div style={{ fontSize: 11.5, color: MUT, lineHeight: 1.6 }}>{data.rlsSignal?.note}</div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
