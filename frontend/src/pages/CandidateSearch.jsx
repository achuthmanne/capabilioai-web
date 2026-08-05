/**
 * CandidateSearch.jsx — Recruiter candidate discovery
 * ---------------------------------------------------------------------------
 * 2026-08-05: closes a real gap — recruiters previously had no way to find a
 * candidate they didn't already have a direct link to (see
 * backend/server/routes/recruiterSearch.js for the full design rationale).
 * This is the first recruiter-facing page in this codebase that hits a real
 * endpoint rather than rendering static mock data (RecruiterDashboard.jsx
 * and HiringPipeline.jsx are both still hardcoded arrays as of this date —
 * out of scope for this change, not touched here).
 *
 * Privacy: results only ever include profiles with recruiter_discoverable=true
 * (server-enforced, not a client-side filter) — see the Settings toggle in
 * SettingsPanel.jsx's ProofSection ("🎯 Discoverable to Recruiters").
 */
import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"

const API = import.meta.env.VITE_API_URL || "https://capabilio-web.onrender.com"

const C = {
  indigo: "#4F46E5", indigoL: "#EEF2FF", indigoB: "rgba(79,70,229,0.10)",
  green: "#16A34A", greenL: "#F0FDF4",
  amber: "#D97706", amberL: "#FFFBEB",
  red: "#DC2626", redL: "#FEF2F2",
  blue: "#1D4ED8", blueL: "#EFF6FF",
  ink: "#1A1714", ink2: "#3D3935", ink3: "#6B6560", ink4: "#A8A29E",
  border: "#E8E3DA", surface: "#FFFFFF", bg: "#F5F5F0",
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)", ...style,
    }}>
      {children}
    </div>
  )
}

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` }
}

export default function CandidateSearch({ user, userData, onNavigate }) {
  const [skill, setSkill] = useState("")
  const [domain, setDomain] = useState("")
  const [minElo, setMinElo] = useState("")
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const LIMIT = 20
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const runSearch = useCallback(async (nextOffset = 0) => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      if (skill.trim()) params.set("skill", skill.trim())
      if (domain.trim()) params.set("domain", domain.trim())
      if (minElo.trim()) params.set("minElo", minElo.trim())
      if (verifiedOnly) params.set("verifiedOnly", "true")
      params.set("limit", String(LIMIT))
      params.set("offset", String(nextOffset))

      const res = await fetch(`${API}/api/recruiter/search?${params.toString()}`, {
        headers: await authHeaders(),
      }).then(r => r.json())

      if (res.error) { setError(res.error); setCandidates([]); setTotal(0) }
      else {
        setCandidates(res.candidates || [])
        setTotal(res.total || 0)
        setOffset(nextOffset)
      }
    } catch {
      setError("Search failed — try again.")
    } finally {
      setLoading(false); setHasSearched(true)
    }
  }, [skill, domain, minElo, verifiedOnly])

  // Load an unfiltered first page on mount so the page never starts empty.
  useEffect(() => { runSearch(0) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const eloOf = (c) => c.professional_elo ?? c.role_elo ?? c.aura_score ?? null

  return (
    <div style={{ background: C.bg, flex: 1, minHeight: 0, overflowY: "auto", fontFamily: "DM Sans, system-ui, sans-serif" }}>
      <div style={{ padding: "24px 16px 40px", maxWidth: 720, margin: "0 auto" }}>

        <div style={{ marginBottom: 20 }}>
          <div
            onClick={() => onNavigate?.("recruiterHome")}
            style={{ fontSize: 12, color: C.indigo, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}
          >
            ← Dashboard
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: "-0.4px" }}>
            Find <span style={{ color: C.indigo }}>candidates</span>
          </h1>
          <div style={{ fontSize: 13, color: C.ink3, marginTop: 4 }}>
            Only candidates who've opted in to recruiter search appear here.
          </div>
        </div>

        <Card style={{ padding: 18, marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Skill</label>
              <input value={skill} onChange={e => setSkill(e.target.value)} placeholder="e.g. React, SQL, Circuit Design"
                style={{ width: "100%", marginTop: 5, padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Domain</label>
                <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. Backend, ECE"
                  style={{ width: "100%", marginTop: 5, padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ width: 130 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Min ELO</label>
                <input value={minElo} onChange={e => setMinElo(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 1200" inputMode="numeric"
                  style={{ width: "100%", marginTop: 5, padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.ink2, cursor: "pointer" }}>
              <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} />
              Verified employment or education only
            </label>
            <button onClick={() => runSearch(0)} disabled={loading}
              style={{
                padding: "11px 20px", borderRadius: 10, border: "none",
                background: C.indigo, color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              }}>
              {loading ? "Searching…" : "🔍 Search Candidates"}
            </button>
          </div>
        </Card>

        {error && (
          <div style={{ background: C.redL, border: `1px solid ${C.red}30`, borderRadius: 10, padding: "10px 14px", color: C.red, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {hasSearched && !loading && candidates.length === 0 && !error && (
          <Card style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>No candidates match yet</div>
            <div style={{ fontSize: 12, color: C.ink4, marginTop: 4 }}>
              Try a broader skill or domain — results are limited to candidates who've opted into recruiter search.
            </div>
          </Card>
        )}

        {candidates.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: C.ink3, marginBottom: 10 }}>{total} candidate{total !== 1 ? "s" : ""} found</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              {candidates.map(c => (
                <Card key={c.id} style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>
                        {c.display_name || c.username || "Candidate"}
                      </div>
                      <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
                        {c.current_role_title || c.target_role || "—"}{c.current_company ? ` at ${c.current_company}` : ""}
                      </div>
                      {(c.topSkills || []).length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {c.topSkills.map(s => (
                            <span key={s} style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: C.indigoL, color: C.indigo }}>{s}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        {c.uan_verified && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: C.greenL, color: C.green }}>✓ Employment Verified</span>}
                        {c.education_verified && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: C.greenL, color: C.green }}>✓ Education Verified</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {eloOf(c) != null && (
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 700, color: C.indigo }}>{eloOf(c)}</div>
                      )}
                      {c.username && (
                        <a href={`/portfolio/${c.username}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, fontWeight: 700, color: C.indigo, textDecoration: "none", display: "inline-block", marginTop: 6 }}>
                          View Portfolio →
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => runSearch(Math.max(0, offset - LIMIT))} disabled={offset === 0 || loading}
                style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.ink2, fontSize: 12, cursor: offset === 0 ? "not-allowed" : "pointer", opacity: offset === 0 ? 0.5 : 1 }}>
                ← Prev
              </button>
              <button onClick={() => runSearch(offset + LIMIT)} disabled={offset + LIMIT >= total || loading}
                style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.ink2, fontSize: 12, cursor: offset + LIMIT >= total ? "not-allowed" : "pointer", opacity: offset + LIMIT >= total ? 0.5 : 1 }}>
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
