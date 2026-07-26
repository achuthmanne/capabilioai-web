/**
 * ExecutiveNetwork.jsx — Curated executive peer graph
 *
 * Rebuilt for Sprint 4 of EXECUTIVE_TECHNICAL_BLUEPRINT.md §14. The previous
 * version was 100% hardcoded arrays (PEERS, VENTURE_SIGNALS, BOARD_OPPS,
 * introductions) with zero backend calls — flagged in
 * EXECUTIVE_PATH_DESIGN_SYSTEM.md's audit.
 *
 * Peer Circles is real: search uses the existing /nexus/search endpoint
 * (already backing the professional-network search elsewhere in the app),
 * Connect/Connected uses the real nexusApi.connect()/connections() calls.
 *
 * Introductions is now ALSO real (2026-07-26 — Executive Path execution
 * pass): backed by the new exec_intro_requests table + execIntros.js routes.
 * Distinct from a plain Connect: a warm-intro request always carries an
 * explicit reason (funding/mentorship/partnership/hiring/customer/other)
 * and a message, so the recipient knows what the ask is before deciding —
 * matching the "structured, not noisy" principle for this path.
 *
 * Venture Radar and Board Seats still have no backing data source (no
 * deal-matching or board-opportunity tables exist) — per
 * EXECUTIVE_INTELLIGENCE_LAYER_DESIGN_SPEC.md and
 * ECOSYSTEM_LAYER_DESIGN_SPEC.md, those need real tables before they can be
 * anything but a fabricated screen, so they still render an honest "Coming
 * soon" state instead of fake rows.
 */
import { useState, useEffect, useCallback } from "react"
import { nexusApi, execIntroApi } from "../lib/api"
import { EXEC_COLORS as C, Card, EmptyState, StatusPill } from "../components/ExecutiveUI"

const TABS = ["Peer Circles", "Venture Radar", "Board Seats", "Introductions"]

const INTRO_REASONS = [
  { val: "funding",     label: "Funding" },
  { val: "mentorship",  label: "Mentorship" },
  { val: "partnership", label: "Partnership" },
  { val: "hiring",      label: "Hiring" },
  { val: "customer",    label: "Customer intro" },
  { val: "other",       label: "Other" },
]

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

// Real data source for the Introductions tab — exec_intro_requests via
// execIntroApi. Loads both directions so incoming (needs my response) and
// outgoing (what I've asked for) can be shown as sub-tabs.
function useIntroRequests() {
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const [inc, out] = await Promise.all([
        execIntroApi.list("incoming"),
        execIntroApi.list("outgoing"),
      ])
      setIncoming(inc?.requests || [])
      setOutgoing(out?.requests || [])
    } catch (e) {
      setError(e.message || "Couldn't load introduction requests.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const respond = async (id, status) => {
    await execIntroApi.respond(id, status)
    await load()
  }

  return { incoming, outgoing, loading, error, respond, reload: load }
}

// ─── Request Intro modal ─────────────────────────────────────────────────────
function RequestIntroModal({ target, onClose, onSent }) {
  const [reason, setReason]   = useState("partnership")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState("")

  const submit = async () => {
    if (!message.trim() || sending) return
    setSending(true); setError("")
    try {
      await execIntroApi.request(target.id, reason, message.trim())
      onSent()
      onClose()
    } catch (e) {
      setError(e.message || "Couldn't send this request — try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(26,26,24,0.5)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>Request an introduction to {target.display_name || target.name}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.ink3, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>What's this about?</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {INTRO_REASONS.map(r => (
              <button key={r.val} onClick={() => setReason(r.val)}
                style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${reason === r.val ? C.goldB : C.border}`, background: reason === r.val ? C.goldL : "transparent", color: reason === r.val ? C.goldD : C.ink3, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {r.label}
              </button>
            ))}
          </div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} maxLength={500}
            placeholder="A short note on why you'd like to connect — this is what they'll see before deciding."
            style={{ width: "100%", padding: "10px 14px", background: "#F9F8F6", border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.ink, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
          <div style={{ fontSize: 11, color: C.ink4, marginTop: 4, textAlign: "right" }}>{message.length}/500</div>
          {error && <div style={{ fontSize: 12, color: C.red, marginTop: 8 }}>{error}</div>}
        </div>
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={submit} disabled={!message.trim() || sending}
            style={{ width: "100%", padding: 13, background: message.trim() ? C.gold : "#F3F1EC", border: "none", borderRadius: 12, color: message.trim() ? "#fff" : C.ink3, fontSize: 13, fontWeight: 800, cursor: message.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            {sending ? "Sending..." : "Send Request"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReasonPill({ reason }) {
  const label = INTRO_REASONS.find(r => r.val === reason)?.label || reason
  return <span style={{ fontSize: 10, fontWeight: 800, color: C.goldD, background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 20, padding: "3px 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
}

function IntroRequestCard({ req, direction, onRespond }) {
  const person = direction === "incoming" ? req.requester : req.target
  const isPending = req.status === "pending"
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: C.gold, flexShrink: 0 }}>
          {(person?.display_name || person?.name || "?").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{person?.display_name || person?.name || "Someone"}</span>
            <ReasonPill reason={req.reason} />
            {!isPending && (
              <StatusPill tone={req.status === "accepted" ? "positive" : req.status === "declined" ? "critical" : "neutral"}>
                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
              </StatusPill>
            )}
          </div>
          <div style={{ fontSize: 12, color: C.ink3, marginBottom: 6 }}>{person?.current_role_title || person?.headline || "—"}{person?.current_company ? ` · ${person.current_company}` : ""}</div>
          <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.6, background: "#F9F8F6", borderRadius: 10, padding: "8px 12px" }}>{req.message}</div>
          {direction === "incoming" && isPending && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => onRespond(req.id, "accepted")} style={{ padding: "6px 14px", background: C.greenL, border: "none", borderRadius: 8, color: C.green, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Accept</button>
              <button onClick={() => onRespond(req.id, "declined")} style={{ padding: "6px 14px", background: C.redL, border: "none", borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Decline</button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function ExecutiveNetwork({ user, userData }) {
  const [tab, setTab]           = useState("Peer Circles")
  const [query, setQuery]       = useState("")
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [introTarget, setIntroTarget] = useState(null) // profile being requested, opens modal
  const [introSubTab, setIntroSubTab] = useState("incoming")
  const connections = useConnections()
  const intros       = useIntroRequests()

  const acceptedCount = connections.data.filter(c => c.status === "accepted").length
  const pendingCount  = connections.data.filter(c => c.status === "pending").length
  const incomingPendingIntros = intros.incoming.filter(r => r.status === "pending").length

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

      {introTarget && (
        <RequestIntroModal
          target={introTarget}
          onClose={() => setIntroTarget(null)}
          onSent={() => intros.reload()}
        />
      )}

      <div style={{ padding: "20px 16px 0" }}>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 26, fontWeight: 800, color: C.ink, margin: 0 }}>
          Network <span style={{ color: C.gold, fontStyle: "italic" }}>Graph</span>
        </h1>
        <p style={{ fontSize: 13, color: C.ink3, margin: "4px 0 16px" }}>Your executive circle, real connections only.</p>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { val: acceptedCount, label: "Connected",     color: C.gold  },
            { val: pendingCount,  label: "Pending",        color: C.blue  },
            { val: incomingPendingIntros, label: "Intro asks", color: C.red },
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
            {t}{t === "Introductions" && incomingPendingIntros > 0 ? ` (${incomingPendingIntros})` : ""}
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
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => setIntroTarget(p)}
                            style={{ padding: "7px 12px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, color: C.ink2, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                            Request Intro
                          </button>
                          <button onClick={() => !status && handleConnect(p.id)} disabled={!!status}
                            style={{ padding: "7px 14px", background: status === "accepted" ? C.greenL : status === "pending" ? "#F3F1EC" : C.goldL, border: `1px solid ${status === "accepted" ? C.green : status === "pending" ? C.border : C.goldB}`, borderRadius: 10, color: status === "accepted" ? C.green : status === "pending" ? C.ink3 : C.goldD, fontSize: 12, fontWeight: 700, cursor: status ? "default" : "pointer", fontFamily: "inherit" }}>
                            {status === "accepted" ? "Connected" : status === "pending" ? "Pending" : "Connect"}
                          </button>
                        </div>
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
          <div>
            <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 4, width: "fit-content" }}>
              {[
                { val: "incoming", label: `Incoming${incomingPendingIntros > 0 ? ` (${incomingPendingIntros})` : ""}` },
                { val: "outgoing", label: "Sent" },
              ].map(s => (
                <button key={s.val} onClick={() => setIntroSubTab(s.val)}
                  style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: introSubTab === s.val ? C.goldL : "transparent", color: introSubTab === s.val ? C.goldD : C.ink3, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {s.label}
                </button>
              ))}
            </div>

            {intros.loading ? null : intros.error ? (
              <EmptyState icon="⚠️" title="Couldn't load introductions" sub={intros.error} />
            ) : introSubTab === "incoming" ? (
              intros.incoming.length === 0 ? (
                <EmptyState icon="🤝" title="No introduction requests yet" sub="When someone requests an introduction to you, it'll show up here with their reason and a message — accept or decline." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {intros.incoming.map(r => <IntroRequestCard key={r.id} req={r} direction="incoming" onRespond={intros.respond} />)}
                </div>
              )
            ) : (
              intros.outgoing.length === 0 ? (
                <EmptyState icon="🤝" title="You haven't requested any introductions" sub="Use 'Request Intro' on a profile in Peer Circles to ask for a warm introduction, with a reason and message." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {intros.outgoing.map(r => <IntroRequestCard key={r.id} req={r} direction="outgoing" onRespond={intros.respond} />)}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
