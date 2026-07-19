/**
 * EngineeringProofsPanel.jsx — the "Proof Object" system's flagship UI.
 *
 * Grouped-by-domain view of a candidate's completed challenges, each backed
 * by a real proof_objects row (see backend/server/lib/arena-v2/proofObjects/
 * and backend/server/routes/proofs.js). Every challenge listed here is a real,
 * AI/pipeline-graded artifact — this is the "every claim must be backed by
 * evidence" section of the portfolio, not a résumé list.
 *
 * Self-contained: takes only a userId, fetches its own data, and reuses the
 * same GenZ-dark design tokens as Portfolio.jsx (duplicated here rather than
 * imported, to keep this component independently reusable — e.g. from Aura's
 * Vault later — without pulling in all of Portfolio.jsx).
 */
import { useEffect, useState, useMemo } from "react"

const C = {
  bg: "#07080F", bgCard: "rgba(255,255,255,0.04)", bgCard2: "rgba(255,255,255,0.07)",
  bgInner: "rgba(0,0,0,0.3)", ink: "#F4F1FF", ink2: "#C8C4D8", ink3: "#7E7A8F", ink4: "#4A4658",
  border: "rgba(255,255,255,0.08)", border2: "rgba(255,255,255,0.14)",
  blue: "#4F8EF7", blue3: "rgba(79,142,247,0.14)",
  teal: "#00D4FF", teal3: "rgba(0,212,255,0.12)",
  green: "#00E5A0", green2: "rgba(0,229,160,0.12)",
  amber: "#FFB800", amber2: "rgba(255,184,0,0.12)",
  red: "#FF4757", red2: "rgba(255,71,87,0.12)",
  purple: "#A855F7", purple2: "rgba(168,85,247,0.14)",
  brand: "#7C3AED", brand2: "rgba(124,58,237,0.15)",
}

const API = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

const DIFFICULTY_COLOR = { easy: C.green, medium: C.amber, hard: C.red, expert: C.purple }

function fmtDate(iso) {
  if (!iso) return ""
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } catch { return "" }
}
function fmtDuration(secs) {
  if (!secs) return null
  const m = Math.round(secs / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function EngineeringProofsPanel({ userId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [domains, setDomains] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [expanded, setExpanded] = useState(() => new Set())
  const [query, setQuery] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [sort, setSort] = useState("newest")
  const [activeProof, setActiveProof] = useState(null) // summary row, opens the detail drawer
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    setLoading(true); setError("")
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (difficulty) params.set("difficulty", difficulty)
    if (sort) params.set("sort", sort)
    fetch(`${API}/api/proofs/${userId}?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setDomains(d.domains || [])
        setTotalCount(d.totalCount || 0)
        // Auto-expand the first (largest) domain group on first load
        setExpanded(prev => prev.size ? prev : new Set(d.domains?.[0] ? [d.domains[0].domain] : []))
      })
      .catch(e => setError(e.message || "Could not load proofs"))
      .finally(() => setLoading(false))
  }, [userId, query, difficulty, sort])

  const openProof = async (proof) => {
    setActiveProof(proof); setDetail(null); setDetailLoading(true)
    try {
      const d = await fetch(`${API}/api/proofs/${userId}/${proof.id}`).then(r => r.json())
      if (!d.error) setDetail(d)
    } catch {}
    setDetailLoading(false)
  }

  const toggleDomain = (domain) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(domain) ? next.delete(domain) : next.add(domain)
      return next
    })
  }

  const allDifficulties = useMemo(() => {
    const s = new Set()
    domains.forEach(g => g.proofs.forEach(p => p.difficulty && s.add(p.difficulty)))
    return Array.from(s)
  }, [domains])

  const inp = {
    padding: "9px 14px", borderRadius: 10, border: `1px solid ${C.border2}`,
    background: C.bgInner, color: C.ink, fontSize: 13, outline: "none",
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 40px 80px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: C.purple, marginBottom: 8 }}>
          🛡 Engineering Proofs
        </div>
        <h2 style={{ fontFamily: "'DM Sans',serif", fontSize: 28, fontWeight: 800, color: C.ink, margin: "0 0 8px" }}>
          {totalCount} verified proof{totalCount !== 1 ? "s" : ""} across {domains.length} domain{domains.length !== 1 ? "s" : ""}
        </h2>
        <p style={{ fontSize: 13.5, color: C.ink3, lineHeight: 1.6, maxWidth: 640, margin: 0 }}>
          Every entry here is a real, graded submission — not a claim. Each proof bundles the problem statement,
          the final submission, the AI evaluation, and the score it actually earned.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        <input style={{ ...inp, flex: "1 1 220px" }} placeholder="Search proofs by title, skill, or tag…"
          value={query} onChange={e => setQuery(e.target.value)} />
        <select style={inp} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
          <option value="">All difficulties</option>
          {allDifficulties.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select style={inp} value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="hardest">Hardest first</option>
          <option value="highest">Highest score</option>
        </select>
      </div>

      {loading && <div style={{ color: C.ink3, fontSize: 13, padding: "40px 0", textAlign: "center" }}>Loading proofs…</div>}
      {error && <div style={{ color: C.red, fontSize: 13, padding: "20px 0" }}>{error}</div>}

      {!loading && !error && domains.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px", background: C.bgCard, border: `1px dashed ${C.border2}`, borderRadius: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🛡</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 6 }}>No proofs yet</div>
          <div style={{ fontSize: 13, color: C.ink4 }}>Completed Arena challenges will appear here automatically, grouped by domain.</div>
        </div>
      )}

      {/* Domain groups — expandable panels, not a flat list */}
      {domains.map(group => {
        const isOpen = expanded.has(group.domain)
        return (
          <div key={group.domain} style={{
            marginBottom: 14, borderRadius: 16, border: `1px solid ${C.border}`,
            background: C.bgCard, overflow: "hidden",
          }}>
            <button onClick={() => toggleDomain(group.domain)} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18, color: C.ink3, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▸</span>
                <span style={{ fontFamily: "'DM Sans',serif", fontSize: 17, fontWeight: 700, color: C.ink }}>{group.domain}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.purple, background: C.purple2, padding: "4px 12px", borderRadius: 99 }}>
                {group.count} proof{group.count !== 1 ? "s" : ""}
              </span>
            </button>

            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 12px 14px" }}>
                {group.proofs.map(p => (
                  <button key={p.id} onClick={() => openProof(p)} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "12px 12px",
                    background: "transparent", border: "none", borderRadius: 10, cursor: "pointer", textAlign: "left",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgCard2}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: p.trustLevel === "verified" ? C.green2 : C.amber2, fontSize: 15,
                    }}>{p.trustLevel === "verified" ? "✓" : "◐"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                      <div style={{ fontSize: 11.5, color: C.ink4, marginTop: 2 }}>
                        {fmtDate(p.completedAt)}{p.difficulty ? ` · ${p.difficulty}` : ""}{fmtDuration(p.timeTakenSecs) ? ` · ${fmtDuration(p.timeTakenSecs)}` : ""}
                      </div>
                    </div>
                    {p.difficulty && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: DIFFICULTY_COLOR[p.difficulty?.toLowerCase()] || C.ink3,
                        background: `${DIFFICULTY_COLOR[p.difficulty?.toLowerCase()] || C.ink3}20`, padding: "3px 9px", borderRadius: 99, flexShrink: 0 }}>
                        {p.difficulty}
                      </span>
                    )}
                    {p.score != null && (
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.teal, flexShrink: 0, minWidth: 40, textAlign: "right" }}>{Math.round(p.score)}</span>
                    )}
                    {p.eloDelta ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: p.eloDelta > 0 ? C.green : C.red, flexShrink: 0, minWidth: 44, textAlign: "right" }}>
                        {p.eloDelta > 0 ? "+" : ""}{p.eloDelta} ELO
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Detail drawer — the individual challenge page, as an overlay drawer rather than navigation */}
      {activeProof && (
        <div onClick={() => setActiveProof(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          zIndex: 200, display: "flex", justifyContent: "flex-end",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "min(560px, 100%)", height: "100%", background: "#0B0D18", borderLeft: `1px solid ${C.border2}`,
            overflowY: "auto", padding: "28px 28px 60px", boxShadow: "-20px 0 60px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: C.purple, marginBottom: 6 }}>
                  {activeProof.domain}
                </div>
                <h3 style={{ fontFamily: "'DM Sans',serif", fontSize: 21, fontWeight: 800, color: C.ink, margin: 0 }}>{activeProof.title}</h3>
              </div>
              <button onClick={() => setActiveProof(null)} style={{
                background: C.bgCard2, border: `1px solid ${C.border2}`, borderRadius: 8, width: 30, height: 30,
                color: C.ink3, cursor: "pointer", fontSize: 14, flexShrink: 0,
              }}>✕</button>
            </div>

            {detailLoading && <div style={{ color: C.ink3, fontSize: 13 }}>Loading…</div>}

            {detail && (
              <>
                {/* Metadata row */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
                  {detail.score != null && <MetaChip label="Score" value={Math.round(detail.score)} color={C.teal} />}
                  {!!detail.eloDelta && <MetaChip label="ELO" value={`${detail.eloDelta > 0 ? "+" : ""}${detail.eloDelta}`} color={detail.eloDelta > 0 ? C.green : C.red} />}
                  {detail.difficulty && <MetaChip label="Difficulty" value={detail.difficulty} color={DIFFICULTY_COLOR[detail.difficulty?.toLowerCase()] || C.ink3} />}
                  {fmtDuration(detail.timeTakenSecs) && <MetaChip label="Time" value={fmtDuration(detail.timeTakenSecs)} color={C.blue} />}
                  <MetaChip label={detail.trustLevel === "verified" ? "✓ Verified" : "Self-claimed"} value="" color={detail.trustLevel === "verified" ? C.green : C.amber} />
                </div>

                {detail.problemStatement && (
                  <Section title="Problem Statement">
                    <p style={{ fontSize: 13, color: C.ink2, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{detail.problemStatement}</p>
                  </Section>
                )}

                {detail.finalSubmission?.answer && (
                  <Section title="Submission">
                    <pre style={{
                      fontSize: 12, color: C.teal, background: C.bgInner, border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: "14px 16px", overflowX: "auto", whiteSpace: "pre-wrap", fontFamily: "'DM Mono',monospace", lineHeight: 1.6,
                    }}>{detail.finalSubmission.answer}</pre>
                  </Section>
                )}

                {detail.aiEvaluation && (detail.aiEvaluation.summary || detail.aiEvaluation.feedback) && (
                  <Section title="AI Evaluation">
                    {detail.aiEvaluation.summary && <p style={{ fontSize: 13, color: C.ink2, lineHeight: 1.7 }}>{detail.aiEvaluation.summary}</p>}
                    {Array.isArray(detail.aiEvaluation.strengths) && detail.aiEvaluation.strengths.length > 0 && (
                      <TagList label="Strengths" items={detail.aiEvaluation.strengths} color={C.green} />
                    )}
                    {Array.isArray(detail.aiEvaluation.improvements) && detail.aiEvaluation.improvements.length > 0 && (
                      <TagList label="Areas to improve" items={detail.aiEvaluation.improvements} color={C.amber} />
                    )}
                  </Section>
                )}

                {detail.skillsDemonstrated?.length > 0 && (
                  <Section title="Related Skills">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {detail.skillsDemonstrated.map((s, i) => (
                        <span key={i} style={{ fontSize: 11.5, color: C.blue, background: C.blue3, padding: "4px 11px", borderRadius: 99, fontWeight: 600 }}>{s}</span>
                      ))}
                    </div>
                  </Section>
                )}

                {detail.snapshots?.length === 0 && (
                  <div style={{ fontSize: 11.5, color: C.ink4, fontStyle: "italic", marginTop: 10 }}>
                    Step-by-step replay (draft → final) isn't available for this proof yet.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MetaChip({ label, value, color }) {
  return (
    <div style={{ background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 10, padding: "6px 12px" }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: C.ink4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      {value !== "" && <div style={{ fontSize: 14, fontWeight: 800, color }}>{value}</div>}
    </div>
  )
}
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: C.ink4, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}
function TagList({ label, items, color }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {items.map((s, i) => <span key={i} style={{ fontSize: 11.5, color, background: `${color}18`, padding: "3px 10px", borderRadius: 99 }}>{s}</span>)}
      </div>
    </div>
  )
}
