/**
 * ExecutiveNetwork.jsx — Curated executive peer graph
 *
 * Rebuilt for Sprint 4 of EXECUTIVE_TECHNICAL_BLUEPRINT.md §14. The previous
 * version was 100% hardcoded arrays (PEERS, VENTURE_SIGNALS, BOARD_OPPS,
 * introductions) with zero backend calls — flagged in
 * EXECUTIVE_PATH_DESIGN_SYSTEM.md's audit.
 *
 * Peer Circles is now real: search uses the existing /nexus/search endpoint
 * (already backing the professional-network search elsewhere in the app),
 * Connect/Connected uses the real nexusApi.connect()/connections() calls.
 * Venture Radar, Board Seats, and Introductions have no backing data source
 * at all yet (no deal-matching, board-opportunity, or introduction tables
 * exist) — per EXECUTIVE_INTELLIGENCE_LAYER_DESIGN_SPEC.md and
 * ECOSYSTEM_LAYER_DESIGN_SPEC.md, those need real tables before they can be
 * anything but a fabricated screen, so they render an honest "Coming soon"
 * state instead of fake rows.
 */
import { useState, useEffect, useCallback } from "react"
import { nexusApi } from "../lib/api"
import { EXEC_COLORS as C, Card, EmptyState, StatusPill } from "../components/ExecutiveUI"

const TABS = ["Peer Circles", "Venture Radar", "Board Seats", "Introductions"]

function useConnections() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try { setData((await nexusApi.connections()) || []) } catch (e) { console.error(e) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export default function ExecutiveNetwork({ user, userData }) {
  const [tab, setTab]           = useState("Peer Circles")
  const [query, setQuery]       = useState("")
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const connections = useConnections()

  const acceptedCount = connections.data.filter(c => c.status === "accepted").length
  const pendingCount  = connections.data.filter(c => c.status === "pending").length

  useEffect(() => {
    let cancelled = false
    setSearching(true)
    nexusApi.search({ q: query }).then(r => { if (!cancelled) setResults(r?.profiles || []) })
      .catch(() => {}).finally(() => { if (!cancelled) setSearching(false) })
    return () => { cancelled = true }
  }, [query])

  const connectionStatusFor = (uid) => {
    const c = connections.data.find(c => c.requester_id === uid || c.addressee_id === uid)
    return c?.status || null
  }

  const handleConnect = async (uid) => {
    try { await nexusApi.connect(uid) } catch (e) { console.error(e) }
    await connections.reload()
  }

  return (
    <div style={{ background: "#F6F6F1", flex: 1, minHeight: 0, overflowY: "auto", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500;600&display=swap');`}</style>

      <div style={{ padding: "20px 16px 0" }}>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 26, fontWeight: 800, color: C.ink, margin: 0 }}>
          Network <span style={{ color: C.gold, fontStyle: "italic" }}>Graph</span>
        </h1>
        <p style={{ fontSize: 13, color: C.ink3, margin: "4px 0 16px" }}>Your executive circle, real connections only.</p>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { val: acceptedCount, label: "Connected",     color: C.gold  },
            { val: pendingCount,  label: "Pending",        color: C.blue  },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: C.ink4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, overflowX: "auto", background: "#fff", padding: "0 16px" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "12px 14px", border: "none", borderBottom: tab === t ? `2px solid ${C.gold}` : "2px solid transparent", background: "transparent", color: tab === t ? C.gold : C.ink3, fontSize: 13, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 16px 24px" }}>
        {tab === "Peer Circles" && (
          <div>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search founders, mentors, investors by name, role, or domain..."
              style={{ width: "100%", padding: "12px 16px", background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 13, marginBottom: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            {searching ? null : results.length === 0 ? (
              <EmptyState icon="🌐" title="No one found" sub="Try a different name, role, or domain keyword." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {results.filter(p => p.id !== (user?.id || user?.uid)).map(p => {
                  const status = connectionStatusFor(p.id)
                  return (
                    <Card key={p.id} style={{ padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: C.gold, flexShrink: 0 }}>
                          {(p.display_name || p.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{p.display_name || p.name}</span>
                            {p.verification_state === "verified" && <span style={{ fontSize: 11, color: C.gold }}>✓</span>}
                          </div>
                          <div style={{ fontSize: 12, color: C.ink3 }}>{p.current_role_title || p.headline || "—"}{p.current_company ? ` · ${p.current_company}` : ""}</div>
                        </div>
                        <button onClick={() => !status && handleConnect(p.id)} disabled={!!status}
                          style={{ padding: "7px 14px", background: status === "accepted" ? C.greenL : status === "pending" ? "#F3F1EC" : C.goldL, border: `1px solid ${status === "accepted" ? C.green : status === "pending" ? C.border : C.goldB}`, borderRadius: 10, color: status === "accepted" ? C.green : status === "pending" ? C.ink3 : C.goldD, fontSize: 12, fontWeight: 700, cursor: status ? "default" : "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                          {status === "accepted" ? "Connected" : status === "pending" ? "Pending" : "Connect"}
                        </button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === "Venture Radar" && (
          <EmptyState icon="🔭" title="Venture Radar isn't wired up yet"
            sub="Deal-matching between founders and investors needs the investor_matches system from FUNDING_HUB_DESIGN_SPEC.md — no fake deal signals shown here in the meantime." />
        )}

        {tab === "Board Seats" && (
          <EmptyState icon="🪑" title="Board Seats isn't wired up yet"
            sub="No board-opportunity table exists yet — this needs its own data source before it can show real postings." />
        )}

        {tab === "Introductions" && (
          <EmptyState icon="🤝" title="Introductions isn't wired up yet"
            sub="Warm-introduction requests need a dedicated table to track who's introducing whom — not built yet, so nothing fabricated is shown here." />
        )}
      </div>
    </div>
  )
}
