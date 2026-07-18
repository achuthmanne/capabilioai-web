/**
 * ChallengeShell.jsx — the Universal Challenge Shell (spec §4 + §7).
 *
 * One shell for all 18 domains:
 *   top bar · left prompt rail (Brief/Hints/History) · center workstation
 *   renderer slot · right context rail (checklist + proof preview) ·
 *   four-slot action bar with workstation-correct verbs · proof preview
 *   overlay · validation drawer · autosaved drafts.
 *
 * The center slot is the ONLY region whose contents change per challenge —
 * everything else is persistent product chrome.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { WorkstationRouter, resolveWorkstationType } from "../pages/ArenaWorkstations"
import {
  runActiveValidator, runActiveRunner, hasActiveRunner,
  buildProofDraft, genericCompletenessChecks,
} from "../services/workstationEngine"
import { getWorkstationMeta, SOURCE_META } from "./workstationMeta"
import { T, Spinner, Pill, WorkstationBadge, diffColor, diffBg, fmtClock, EmptyDirective } from "./arenaUi"
import { arenaDb } from "../lib/db"
import useAntiCheat from "./useAntiCheat"
import ArenaWatermark from "./ArenaWatermark"

const SERVER = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

// ── Deterministic "ticket" context synthesizer ───────────────────────────────
// Real companies never hand an engineer a bare problem statement — they hand
// a ticket with a company, project, team, sprint, priority, and an assignee.
// We don't have that data authored per-challenge across all 18 domains yet,
// so this derives a STABLE (same mission -> same ticket every time, not
// randomized per render) synthetic ticket from the mission's own id/domain,
// via a small seeded hash. Any challenge that DOES carry a real `mission.ticket`
// object (future content) is used as-is and this is skipped entirely.
function _hashSeed(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0 }
  return Math.abs(h)
}
const TICKET_POOLS = {
  ece:       { companies: ["Bosch Automotive", "Texas Instruments", "STMicroelectronics", "NXP Semiconductors"], projects: ["Battery Monitoring Unit", "Sensor Fusion Board", "Motor Control Firmware", "Power Management IC"], teams: ["Hardware Design", "Embedded Firmware", "Signal Integrity"] },
  mech:      { companies: ["Tata Motors", "Mahindra Engineering", "L&T Heavy Industries", "Caterpillar"], projects: ["Drivetrain Redesign", "Thermal Systems Upgrade", "Chassis Load Analysis", "HVAC Efficiency Program"], teams: ["Mechanical Design", "Structural Analysis", "Product Engineering"] },
  civil:     { companies: ["Larsen & Toubro", "Shapoorji Pallonji", "AECOM", "Arup"], projects: ["Metro Corridor Extension", "Highway Overpass Retrofit", "Commercial Tower Foundation", "Flood Defense Upgrade"], teams: ["Structural Engineering", "Geotechnical", "Site Engineering"] },
  swe:       { companies: ["Razorpay", "Freshworks", "Atlassian", "Stripe"], projects: ["Payments Reconciliation Service", "Internal Developer Platform", "Checkout API v3", "Fraud Signals Pipeline"], teams: ["Platform Engineering", "Backend Services", "Core Infra"] },
  data:      { companies: ["Flipkart", "Swiggy", "Zomato", "Myntra"], projects: ["Demand Forecasting Model", "Churn Prediction Pipeline", "Realtime Analytics Warehouse", "Pricing Engine Revamp"], teams: ["Data Platform", "Analytics Engineering", "ML Infra"] },
  default:   { companies: ["Capabilio Client Co.", "Northwind Industries", "Vertex Systems", "Meridian Labs"], projects: ["Q3 Platform Initiative", "Reliability Workstream", "Customer-Facing Revamp", "Core Systems Modernization"], teams: ["Engineering", "Product Engineering", "Systems Team"] },
}
const PRIORITIES   = ["P1", "P2", "P3"]
const ASSIGNERS    = ["Senior Hardware Engineer", "Engineering Manager", "Staff Engineer", "Tech Lead", "Principal Engineer"]
function synthesizeTicket(mission, domain) {
  if (mission.ticket && typeof mission.ticket === "object") return mission.ticket
  const seedKey = String(mission.id || mission.title || "mission")
  const seed = _hashSeed(seedKey)
  const domainKey = /circuit|embedded|ece|eee/i.test(domain?.label || "") ? "ece"
    : /mech/i.test(domain?.label || "") ? "mech"
    : /civil/i.test(domain?.label || "") ? "civil"
    : /data|analy/i.test(domain?.label || "") ? "data"
    : /swe|software|dsa|backend|full.?stack/i.test(domain?.label || "") ? "swe"
    : "default"
  const pool = TICKET_POOLS[domainKey]
  const issuePrefix = domainKey === "ece" ? "HW" : domainKey === "mech" ? "MECH" : domainKey === "civil" ? "CE" : domainKey === "data" ? "DATA" : "ENG"
  return {
    company:    pool.companies[seed % pool.companies.length],
    project:    pool.projects[(seed >> 3) % pool.projects.length],
    team:       pool.teams[(seed >> 6) % pool.teams.length],
    sprint:     `Sprint ${(seed % 24) + 1}`,
    priority:   PRIORITIES[(seed >> 9) % PRIORITIES.length],
    assignedBy: ASSIGNERS[(seed >> 12) % ASSIGNERS.length],
    issueId:    `${issuePrefix}-${1000 + (seed % 9000)}`,
  }
}
function TicketHeader({ mission, domain }) {
  const t = synthesizeTicket(mission, domain)
  const Field = ({ label, value }) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, color: T.ink4, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.ink2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  )
  return (
    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px" }}>
      <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <span style={{ fontSize: 9.5, fontWeight: 900, color: "#fff", background: t.priority === "P1" ? T.red : t.priority === "P2" ? T.amber : T.ink4, padding: "1.5px 6px", borderRadius: 4 }}>{t.priority}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: T.ink3, fontFamily: "'DM Mono',monospace" }}>{t.issueId}</span>
      </div>
      <Field label="Company" value={t.company} />
      <Field label="Project" value={t.project} />
      <Field label="Team" value={t.team} />
      <Field label="Sprint" value={t.sprint} />
      <div style={{ gridColumn: "1 / -1" }}>
        <Field label="Assigned by" value={t.assignedBy} />
      </div>
    </div>
  )
}

// ── Lightweight markdown (briefs) ────────────────────────────────────────────
function Md({ text }) {
  if (!text) return null
  return text.split("\n").map((line, i) => {
    if (/^### /.test(line)) return <h3 key={i} style={{ fontSize: 13, fontWeight: 800, color: T.ink, margin: "14px 0 5px" }}>{line.slice(4)}</h3>
    if (/^## /.test(line))  return <h2 key={i} style={{ fontSize: 14, fontWeight: 800, color: T.ink, margin: "16px 0 6px" }}>{line.slice(3)}</h2>
    if (/^# /.test(line))   return <h1 key={i} style={{ fontSize: 16, fontWeight: 800, color: T.ink, margin: "8px 0" }}>{line.slice(2)}</h1>
    if (!line.trim())       return <div key={i} style={{ height: 8 }} />
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, j) => {
      if (/^\*\*.+\*\*$/.test(p)) return <strong key={j}>{p.slice(2, -2)}</strong>
      if (/^`.+`$/.test(p)) return <code key={j} style={{ background: "#F2EDE4", padding: "1px 5px", borderRadius: 3, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{p.slice(1, -1)}</code>
      return p
    })
    return <p key={i} style={{ margin: "0 0 8px", fontSize: 13.5, color: T.ink2, lineHeight: 1.7 }}>{parts}</p>
  })
}

// ── Proof preview overlay (DRAFT watermark) ──────────────────────────────────
function ProofOverlay({ draft, mission, meta, validation, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 950, background: "rgba(15,23,42,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "min(880px, 92vw)", maxHeight: "88vh", overflow: "auto", position: "relative", boxShadow: "0 32px 80px rgba(0,0,0,0.35)" }}>
        {/* DRAFT watermark */}
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: "#FFFBEB", borderBottom: "1px solid #FDE68A", padding: "9px 22px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 2, color: "#B45309", border: "1.5px dashed #D97706", padding: "2px 10px", borderRadius: 5 }}>DRAFT</span>
          <span style={{ fontSize: 11, color: "#92400E" }}>This is exactly what submission will freeze into your proof — it is not submitted yet.</span>
          <button onClick={onClose} style={{ marginLeft: "auto", fontSize: 18, border: "none", background: "none", cursor: "pointer", color: "#B45309", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "22px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <WorkstationBadge meta={meta} size={10} />
            {mission.difficulty && <Pill color={diffColor(mission.difficulty)} bg={diffBg(mission.difficulty)}>{mission.difficulty}</Pill>}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: T.ink, marginBottom: 2 }}>{draft.headline || mission.title}</div>
          <div style={{ fontSize: 11, color: T.ink4, marginBottom: 18 }}>Proof artifact preview · {new Date().toLocaleString()}</div>

          {(draft.artifacts || []).map((a, i) => (
            <div key={i} style={{ marginBottom: 16, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "7px 14px", background: T.bg, borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 800, color: T.ink3, textTransform: "uppercase", letterSpacing: 0.7 }}>
                {a.type === "code" ? "⌨️" : a.type === "image" ? "🖼" : a.type === "report" ? "📋" : a.type === "narrative" ? "✍️" : "📌"} {a.label}
              </div>
              {a.type === "image"
                ? <img src={a.content} alt={a.label} style={{ display: "block", maxWidth: "100%" }} />
                : a.type === "code"
                  ? <pre style={{ margin: 0, padding: "12px 16px", background: T.bg2, color: T.ink, fontFamily: "'DM Mono',monospace", fontSize: 11.5, lineHeight: 1.6, overflow: "auto", maxHeight: 320 }}>{a.content}</pre>
                  : <pre style={{ margin: 0, padding: "12px 16px", fontFamily: a.type === "narrative" ? "inherit" : "'DM Mono',monospace", fontSize: 12, color: T.ink2, whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{a.content}</pre>}
            </div>
          ))}

          {validation?.length > 0 && (
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.ink3, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>🎯 Validation state at preview</div>
              {validation.map((v, i) => (
                <div key={i} style={{ fontSize: 11.5, color: v.info ? T.ink4 : v.passed ? T.green : T.red, marginBottom: 4 }}>
                  {v.info ? "○" : v.passed ? "✅" : "❌"} {v.input}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Submit confirmation (spec §8.3 — shows what is at stake) ─────────────────
function SubmitConfirm({ mission, meta, validation, hintsUsed, isPractice, pasteDetected, onConfirm, onCancel }) {
  const real   = (validation || []).filter(v => !v.info)
  const passed = real.filter(v => v.passed).length
  const failed = real.filter(v => !v.passed)
  // Dynamic ELO estimate based on validation pass rate
  const maxElo = mission.eloGain || mission.eloReward || 12
  const estimatedScore = real.length > 0 ? Math.round((passed / real.length) * 100) : null
  const estimatedElo = isPractice ? 0
    : estimatedScore === null ? maxElo                          // no validation → full stake
    : estimatedScore >= 80   ? maxElo
    : estimatedScore >= 60   ? Math.round(maxElo * 0.5)
    : estimatedScore >= 40   ? Math.round(maxElo * 0.2)
    : 3
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 960, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: 440, padding: "22px 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: T.ink, marginBottom: 4 }}>{meta.actions.submit}?</div>
        <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.6, marginBottom: 14 }}>
          Submitting freezes this attempt permanently — your work and its outputs become an immutable proof record. You cannot edit it afterwards.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: T.ink3 }}>Validation checks</span>
            <span style={{ fontWeight: 800, color: real.length === 0 ? T.ink4 : passed === real.length ? T.green : T.amber, fontFamily: "'DM Mono',monospace" }}>
              {real.length === 0 ? "not run" : `${passed}/${real.length} passing`}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: T.ink3 }}>Hints used (recorded on proof)</span>
            <span style={{ fontWeight: 800, color: T.ink2, fontFamily: "'DM Mono',monospace" }}>{hintsUsed}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: T.ink3 }}>Estimated ELO change</span>
            <span style={{ fontWeight: 800, color: isPractice ? T.ink4 : estimatedElo > 0 ? T.green : T.red, fontFamily: "'DM Mono',monospace" }}>
              {isPractice ? "unranked practice"
                : estimatedScore === null ? `up to +${maxElo} (run Validate first)`
                : `+${estimatedElo} pts (based on ${passed}/${real.length} checks)`}
            </span>
          </div>
        </div>
        {/* Show which specific checks are failing */}
        {failed.length > 0 && (
          <div style={{ fontSize: 11, color: T.red, background: T.redBg, border: `1px solid #FECACA`, borderRadius: 8, padding: "10px 12px", marginBottom: 14, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>❌ {failed.length} check{failed.length === 1 ? "" : "s"} failing — score will reflect this:</div>
            {failed.map((f, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:5, marginBottom:3 }}>
                <span style={{ flexShrink:0 }}>·</span>
                <span><strong>{f.input}</strong>{f.actual ? ` — ${String(f.actual).slice(0,100)}` : ""}</span>
              </div>
            ))}
          </div>
        )}
        {real.length > 0 && passed === real.length && !pasteDetected && (
          <div style={{ fontSize: 11, color: T.green, background: T.greenBg, border: `1px solid #BBF7D0`, borderRadius: 8, padding: "8px 11px", marginBottom: 14, lineHeight: 1.5 }}>
            ✅ All {real.length} checks passing — strong solve!
          </div>
        )}
        {/* ── Paste integrity warning ── */}
        {pasteDetected && (
          <div style={{ fontSize: 11, color: "#7C2D12", background: "#FFF7ED", border: "1px solid #FDBA74", borderRadius: 8, padding: "10px 12px", marginBottom: 14, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>⚠️ Paste detected — this submission will be flagged</div>
            <div>AI-generated or copied solutions earn <strong>0 ELO</strong> and are marked <strong>VOID</strong> on your proof record. Recruiters can see this.</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", fontSize: 12, fontWeight: 700, color: T.ink3, cursor: "pointer", fontFamily: "inherit" }}>Keep working</button>
          <button onClick={onConfirm} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: meta.hue, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{meta.actions.submit}</button>
        </div>
      </div>
    </div>
  )
}

// ── Paste intervention modal (anti-cheat UX — fires in real-time on paste) ───
function PasteInterventionModal({ chars, onClear, onDismiss }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 970, background: "rgba(15,23,42,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: 480, padding: "24px 26px", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, marginTop: 1 }}>⚠️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#DC2626", marginBottom: 3 }}>Large paste detected</div>
            <div style={{ fontSize: 11.5, color: T.ink3, lineHeight: 1.5 }}>{chars.toLocaleString()} characters appeared in a single action — consistent with AI-generated or copied code.</div>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.75, marginBottom: 14 }}>
          Capabilio's integrity system will flag this submission as AI-assisted.<br />
          <strong>Result: 0 ELO, VOID grade</strong> — permanently visible on your recruiter-facing proof record.
        </div>
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, padding: "10px 13px", marginBottom: 18, display: "flex", gap: 9, alignItems: "flex-start" }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
          <span style={{ fontSize: 11.5, color: "#92400E", lineHeight: 1.6 }}>
            Recruiters use your proof to assess real-world thinking — a flagged submission signals AI-dependency, not skill. Clear and work through it to earn genuine ELO.
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClear}
            style={{ flex: 1, padding: "11px 14px", borderRadius: 9, border: "none", background: "#16A34A", color: "#fff", fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            🗑️ Clear &amp; solve myself
          </button>
          <button onClick={onDismiss}
            style={{ padding: "11px 16px", borderRadius: 9, border: `1px solid ${T.border}`, background: "#fff", fontSize: 11.5, fontWeight: 700, color: T.ink3, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Keep it (0 ELO)
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Per-challenge attempt history (frozen records — spec §4.7) ───────────────
function AttemptHistory({ uid, mission }) {
  const [docs, setDocs] = useState(null)
  useEffect(() => {
    if (!uid) { setDocs([]); return }
    let unsub
    try {
      unsub = arenaDb.subscribeHistory(uid, all => {
        const mine = (all || []).filter(d =>
          d.missionId === mission.id || d.mission_id === mission.id ||
          (d.title || d.missionTitle || d.mission_title) === mission.title)
        setDocs(mine)
      })
    } catch { setDocs([]) }
    return () => { try { unsub?.() } catch { /* noop */ } }
  }, [uid, mission])

  if (docs === null) return <div style={{ padding: 18 }}><Spinner /></div>
  if (!docs.length) return (
    <div style={{ padding: 18 }}>
      <EmptyDirective icon="🧊" height={120} label="No frozen attempts yet. Submitting freezes your work — with its outputs — into a permanent record that appears here." />
    </div>
  )
  return (
    <div style={{ padding: "14px 16px" }}>
      {docs.map((d, i) => (
        <div key={d.id || i} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 13px", marginBottom: 8, background: "#FCFCFA" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11 }}>🧊</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: T.ink2 }}>Attempt · frozen</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: T.ink4 }}>{new Date(d.completedAt || d.completed_at || Date.now()).toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
            <span style={{ color: (d.score ?? 0) >= 70 ? T.green : T.amber, fontWeight: 800 }}>score {d.score ?? "—"}</span>
            <span style={{ color: T.green }}>+{d.eloDelta ?? d.elo_delta ?? 0} ELO</span>
            {d.grade && <span style={{ color: T.ink3 }}>grade {d.grade}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// THE SHELL
// ─────────────────────────────────────────────────────────────────────────────
export default function ChallengeShell({
  mission, domain, domainKey, code, onCodeChange, onSubmit, submitting,
  onClear, timeLeft, CodeEditor, uid,
}) {
  const wsType = resolveWorkstationType(mission)
  const meta   = getWorkstationMeta(wsType)
  const source = SOURCE_META[mission.__source] || SOURCE_META.library
  const isPractice = !!mission._practice

  // ── rails ──
  const [leftOpen, setLeftOpen]   = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [leftTab, setLeftTab]     = useState("brief")

  // ── live state ──
  const [validation, setValidation]   = useState(null)
  const [validating, setValidating]   = useState(false)
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [proofDraft, setProofDraft]   = useState(null)
  const [confirming, setConfirming]   = useState(false)
  const [running, setRunning]         = useState(false)
  const [runFeedback, setRunFeedback] = useState(null)
  const [revealedHints, setRevealedHints] = useState(0)
  const [draftBanner, setDraftBanner] = useState(null)
  const [saveState, setSaveState]     = useState("saved")

  // ── paste intervention ──
  const [pasteWarning, setPasteWarning] = useState(null) // { chars: N } — triggers modal
  const prevLenRef = useRef((mission.starterCode || "").length)

  // ── anti-cheat ──
  const [tabHidden, setTabHidden]         = useState(false)
  const [screenShareAlert, setScreenShareAlert] = useState(false)

  // Activate protection for ranked (non-practice) submissions
  useAntiCheat({ uid, enabled: !isPractice })

  useEffect(() => {
    if (isPractice) return
    const onVis = (e) => setTabHidden(e.detail?.hidden || false)
    const onSS  = ()  => setScreenShareAlert(true)
    window.addEventListener("capabilio:visibility_change",  onVis)
    window.addEventListener("capabilio:screenshare_detected", onSS)
    return () => {
      window.removeEventListener("capabilio:visibility_change",  onVis)
      window.removeEventListener("capabilio:screenshare_detected", onSS)
    }
  }, [isPractice])

  // ── behavioral tracking (consumed by Arena.handleSubmit) ──
  const pasteRef = useRef(0), keysRef = useRef(0), startRef = useRef(Date.now())
  // Set by the real onPaste DOM handler right before its onChange fires — lets
  // handleCodeChange tell an actual OS paste apart from a workstation writing
  // a computed summary (slider readings, MCQ answer, etc.) in one onCodeChange
  // call. See BUG FIX note in handleCodeChange below.
  const justPastedRef = useRef(false)
  const starterLenRef = useRef((mission.starterCode || "").length)
  const validationsRef = useRef(0)
  mission.__behavioral = {
    get pasteCount() { return pasteRef.current },
    get keystrokeCount() { return keysRef.current },
    get timeOnTaskSecs() { return Math.round((Date.now() - startRef.current) / 1000) },
    get starterLen() { return starterLenRef.current },
    get hintsUsed() { return revealedHints },
    get validationsRun() { return validationsRef.current },
  }

  const handleCodeChange = v => {
    const delta = v.length - prevLenRef.current
    prevLenRef.current = v.length
    keysRef.current += 1
    // BUG FIX (2026-07-18): this used to flag ANY onCodeChange call with a
    // >80 char delta as "Large paste detected" — regardless of source. But
    // many workstations (Circuit Lab, Excel, Dashboard, Report, etc.) write
    // a full computed summary/export string in ONE onCodeChange call as a
    // normal result of clicking a button or dragging a slider — that's real,
    // honest work, not a paste, and was being wrongly flagged as "0 ELO,
    // VOID grade — AI-assisted". Only treat it as a paste if it's actually
    // preceded by a real OS paste event (justPastedRef, set by the onPaste
    // DOM handler on the workstation container, which always fires before
    // this onChange for a genuine paste into a text field).
    if (delta > 80 && !isPractice && justPastedRef.current) setPasteWarning({ chars: delta })
    justPastedRef.current = false
    onCodeChange(v)
  }

  // ── autosave drafts (spec §4.4) ──
  const draftKey = `arena_draft_${mission.id || mission.title}`
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null")
      if (saved?.code && saved.code !== code && saved.code !== (mission.starterCode || "")) {
        setDraftBanner(saved)
      }
    } catch { /* noop */ }
  }, []) // eslint-disable-line
  useEffect(() => {
    setSaveState("saving")
    const id = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify({ code, at: Date.now() })) } catch { /* noop */ }
      setSaveState("saved")
    }, 900)
    return () => clearTimeout(id)
  }, [code, draftKey])

  // ── actions ──
  const handleValidate = useCallback(async () => {
    if (validating) return
    setValidating(true)
    validationsRef.current += 1
    let results = null
    try { results = await runActiveValidator() } catch (e) { results = [{ passed: false, input: "Validator error", actual: e.message }] }
    if (!results || results.error) {
      results = genericCompletenessChecks({ code, mission })
      if (wsType === "dashboard") {
        results.unshift({ passed: false, input: "Publish results to validate metrics", expected: "KPI / Trend / Breakdown published in Build tab", actual: "nothing published yet" })
      }
    }
    setValidation(results)
    setDrawerOpen(true)
    setValidating(false)
  }, [code, mission, validating, wsType])

  const handleRun = useCallback(async () => {
    if (running) return
    // Code IDE with server-judged test cases keeps its harness
    const testCases = mission.testCases || mission.test_cases || []
    if (wsType === "code" && testCases.length) {
      setRunning(true); setRunFeedback(null)
      try {
        const res = await fetch(`${SERVER}/api/arena/run-tests`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language: mission.lang || "javascript", challenge: mission, testCases }),
        })
        const data = await res.json()
        const results = (data.results || []).map(r => ({ passed: r.passed, input: `case: ${String(r.input).slice(0, 40)}`, expected: String(r.expected).slice(0, 40), actual: String(r.actual ?? "").slice(0, 40) }))
        setValidation(results.length ? results : [{ passed: false, input: "No results returned", actual: data.error || "server error" }])
        setDrawerOpen(true)
      } catch { setRunFeedback("Judge unreachable — check connection") }
      setRunning(false)
      return
    }
    if (hasActiveRunner()) {
      setRunning(true)
      try { await runActiveRunner() } catch { /* renderer shows its own errors */ }
      setRunning(false)
    }
  }, [code, mission, running, wsType])

  const handlePreview = useCallback(() => {
    setProofDraft(buildProofDraft({ mission, code, validation }))
  }, [mission, code, validation])

  // ── keyboard map (spec §7.4) ──
  useEffect(() => {
    const onKey = e => {
      if (e.key === "[" && !e.metaKey && !e.ctrlKey && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") { setLeftOpen(o => !o) }
      if (e.key === "]" && !e.metaKey && !e.ctrlKey && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") { setRightOpen(o => !o) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // ── derived ──
  const eloGain  = mission.eloGain || mission.eloReward || mission.elo_impact || 12
  const timeStr  = fmtClock(timeLeft)
  const isDanger = timeLeft != null && timeLeft <= 60
  const isWarn   = timeLeft != null && timeLeft > 60 && timeLeft <= 300
  const hints    = mission.hints || []
  const steps    = mission.steps || []
  const realChecks = (validation || []).filter(v => !v.info)
  const passCount  = realChecks.filter(v => v.passed).length

  const showRunSlot = (wsType === "code" && (mission.testCases || mission.test_cases || []).length > 0) || (!meta.hideRun && hasActiveRunner())

  const checklist = useMemo(() => {
    if (validation) return validation
    return steps.map(s => ({ pending: true, input: s }))
  }, [validation, steps])

  // User info for watermark — pulled from uid prop (email preferred)
  const userLabel = typeof uid === "string" && uid.includes("@") ? uid : (uid ? `uid:${uid.slice(0,8)}` : "capabilio")

  return (
    <div className={!isPractice ? "arena-protected" : undefined}
      style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: T.bg, fontFamily: "'DM Sans',sans-serif", position: "relative" }}>

      {/* ── Tiled user watermark (always visible in screenshots) ── */}
      {!isPractice && <ArenaWatermark userEmail={userLabel} userId={uid} />}

      {/* ── Tab-hidden blur overlay ── */}
      {tabHidden && !isPractice && (
        <div style={{ position: "absolute", inset: 0, zIndex: 900, backdropFilter: "blur(18px)", background: "rgba(15,23,42,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Workstation Paused</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", maxWidth: 280, textAlign: "center", lineHeight: 1.6 }}>
            Return to this tab to resume. Tab-switching is logged and affects your submission integrity score.
          </div>
        </div>
      )}

      {/* ── Screen-share warning banner ── */}
      {screenShareAlert && !isPractice && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 800, background: "#DC2626", padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 13 }}>🚨</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", flex: 1 }}>
            Screen sharing detected. Your session is watermarked with your user ID. Sharing Arena content violates the Honor Code.
          </span>
          <button onClick={() => setScreenShareAlert(false)} style={{ fontSize: 13, background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ══ TOP BAR · 58px — mission identity bar ══ */}
      <div style={{ height: 58, background: "#fff", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", flexShrink: 0, zIndex: 20 }}>

        {/* Back */}
        <button onClick={onClear} title="Back to Arena" style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 11, fontWeight: 700, color: T.ink3, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
          ← Arena
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: T.border, flexShrink: 0 }} />

        {/* Mission identity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {/* Domain badge */}
            <span style={{ fontSize: 10, fontWeight: 800, color: domain.color || meta.hue, background: `${domain.color || meta.hue}12`, border: `1px solid ${domain.color || meta.hue}28`, padding: "2px 8px", borderRadius: 5, textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap", flexShrink: 0 }}>
              {domain.label}
            </span>
            {/* Workstation type */}
            <WorkstationBadge meta={meta} />
            {/* Difficulty */}
            {mission.difficulty && (
              <Pill color={diffColor(mission.difficulty)} bg={diffBg(mission.difficulty)}>{mission.difficulty}</Pill>
            )}
            {/* Source */}
            <Pill color={source.hue} bg={`${source.hue}12`}>{source.label}</Pill>
          </div>
          {/* Mission title */}
          <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
            {mission.title}
          </div>
        </div>

        {/* Right cluster — timer + ELO */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
          {timeStr && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, background: isDanger ? "#FEF2F2" : isWarn ? "#FFFBEB" : T.bg, border: `1px solid ${isDanger ? "#FECACA" : isWarn ? "#FDE68A" : T.border}` }}>
              <span style={{ fontSize: 10 }}>⏱</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 800, color: isDanger ? T.red : isWarn ? T.amber : T.ink3, animation: isDanger ? "shimmer 1s ease-in-out infinite" : "none" }}>{timeStr}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, background: isPractice ? T.bg : "#F0FDF4", border: `1px solid ${isPractice ? T.border : "#BBF7D0"}` }}>
            {!isPractice && <span style={{ fontSize: 10 }}>⚡</span>}
            <span style={{ fontSize: 11, fontWeight: 800, color: isPractice ? T.ink4 : "#16A34A", fontFamily: "'DM Mono',monospace" }}>
              {isPractice ? "Practice" : `+${eloGain} ELO`}
            </span>
          </div>
        </div>
      </div>

      {/* ── draft restore banner ── */}
      {draftBanner && (
        <div style={{ background: T.blueBg, borderBottom: "1px solid #BFDBFE", padding: "7px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 11.5, color: "#1D4ED8", flexShrink: 0 }}>
          💾 A saved draft from {new Date(draftBanner.at).toLocaleString()} exists for this challenge.
          <button onClick={() => { onCodeChange(draftBanner.code); setDraftBanner(null) }} style={{ padding: "3px 10px", borderRadius: 5, border: "1px solid #93C5FD", background: "#fff", color: "#1D4ED8", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Restore draft</button>
          <button onClick={() => setDraftBanner(null)} style={{ padding: "3px 10px", borderRadius: 5, border: "none", background: "none", color: "#60A5FA", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Dismiss</button>
        </div>
      )}

      {/* ══ THREE-REGION BODY ══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── LEFT PROMPT RAIL ── */}
        {leftOpen ? (
          <div key="left-open" style={{ width: 320, flexShrink: 0, background: "#fff", borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              {[["brief", "Brief"], ...(hints.length ? [["hints", `Hints (${hints.length})`]] : []), ["history", "History"]].map(([id, label]) => (
                <button key={id} onClick={() => setLeftTab(id)}
                  style={{ padding: "0 14px", height: 42, border: "none", background: "none", fontFamily: "inherit", fontSize: 12, fontWeight: leftTab === id ? 800 : 500, color: leftTab === id ? T.ink : T.ink4, borderBottom: leftTab === id ? `2px solid ${meta.hue}` : "2px solid transparent", cursor: "pointer" }}>
                  {label}
                </button>
              ))}
              <button onClick={() => setLeftOpen(false)} title="Collapse  [" style={{ marginLeft: "auto", border: "none", background: "none", color: T.ink4, cursor: "pointer", padding: "0 12px", fontSize: 13 }}>⟨</button>
            </div>

            {leftTab === "brief" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
                {!isPractice && <TicketHeader mission={mission} domain={domain} />}
                <h1 style={{ fontSize: 17, fontWeight: 900, color: T.ink, margin: "0 0 8px", lineHeight: 1.25 }}>{mission.title}</h1>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                  {(mission.tags || mission.skillTags || []).map((t, i) => <Pill key={i}>{t}</Pill>)}
                </div>
                <Md text={mission.description || mission.scenario || ""} />
                {mission.objective && (
                  <div style={{ margin: "14px 0" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.ink, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>Objective</div>
                    <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.65 }}>{mission.objective}</div>
                  </div>
                )}
                {steps.length > 0 && (
                  <div style={{ margin: "14px 0" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.ink, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Steps</div>
                    {steps.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 7 }}>
                        <span style={{ width: 19, height: 19, borderRadius: "50%", background: `${meta.hue}18`, color: meta.hue, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                        <span style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.55 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
                {mission.constraints && (
                  <div style={{ margin: "14px 0" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.ink, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>Constraints</div>
                    <pre style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, color: T.ink2, margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6, background: T.bg, padding: "10px 13px", borderRadius: 8, border: `1px solid ${T.border}` }}>
                      {String(mission.constraints).split("|").map(c => c.trim()).join("\n")}
                    </pre>
                  </div>
                )}
                {(mission.tools || []).length > 0 && (
                  <div style={{ margin: "14px 0" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.ink, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>Tools in this workstation</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {mission.tools.map(t => <Pill key={t} color={meta.hue} bg={`${meta.hue}10`} border={`${meta.hue}28`}>{t}</Pill>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {leftTab === "hints" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: T.ink4, marginBottom: 12, lineHeight: 1.55 }}>
                  Hints reveal progressively. Usage is recorded on your attempt — honest proof reads better to recruiters than inflated proof.
                </div>
                {hints.map((h, i) => i < revealedHints ? (
                  <div key={i} style={{ background: T.amberBg, border: "1px solid #FDE68A", borderRadius: 9, padding: "11px 13px", marginBottom: 9 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.amber, marginBottom: 4 }}>Hint {i + 1}</div>
                    <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.6 }}>{h}</div>
                  </div>
                ) : (
                  <button key={i} disabled={i > revealedHints} onClick={() => setRevealedHints(n => n + 1)}
                    style={{ width: "100%", textAlign: "left", background: i === revealedHints ? "#fff" : T.bg, border: `1.5px dashed ${T.border}`, borderRadius: 9, padding: "11px 13px", marginBottom: 9, cursor: i === revealedHints ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: i === revealedHints ? 1 : 0.55 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.ink3 }}>🔒 Hint {i + 1} — {i === revealedHints ? "click to reveal" : `reveal hint ${i} first`}</div>
                  </button>
                ))}
                {!hints.length && <EmptyDirective icon="💡" label="No hints for this challenge — the brief and validation checks are your guide." />}
              </div>
            )}

            {leftTab === "history" && <div style={{ flex: 1, overflowY: "auto" }}><AttemptHistory uid={uid} mission={mission} /></div>}
          </div>
        ) : (
          <button key="left-closed" onClick={() => setLeftOpen(true)} title="Expand brief  [" style={{ width: 34, flexShrink: 0, background: "#fff", border: "none", borderRight: `1px solid ${T.border}`, cursor: "pointer", color: T.ink4, fontSize: 13, writingMode: "vertical-rl" }}>⟩ Brief</button>
        )}

        {/* ── CENTER: WORKSTATION RENDERER SLOT ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, background: T.bg }}
          onPaste={() => { pasteRef.current += 1; justPastedRef.current = true }}
          onContextMenu={!isPractice ? (e) => e.preventDefault() : undefined}>
          <WorkstationRouter
            mission={mission}
            domain={domain}
            domainKey={domainKey}
            moduleSandbox={wsType}
            code={code}
            onCodeChange={handleCodeChange}
            CodeEditor={CodeEditor}
          />
        </div>

        {/* ── RIGHT CONTEXT RAIL ── */}
        {rightOpen ? (
          <div key="right-open" style={{ width: 300, flexShrink: 0, background: "#FAFAFA", borderLeft: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Rail header */}
            <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${T.border}`, background: "#fff", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: meta.hue }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: T.ink2, textTransform: "uppercase", letterSpacing: 0.8 }}>Mission Control</span>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                {validation && (
                  <span style={{ fontSize: 10, fontWeight: 800, fontFamily: "'DM Mono',monospace",
                    color: passCount === realChecks.length ? T.green : T.amber,
                    background: passCount === realChecks.length ? T.greenBg : T.amberBg,
                    padding: "2px 7px", borderRadius: 99 }}>
                    {passCount}/{realChecks.length} pass
                  </span>
                )}
                <button onClick={() => setRightOpen(false)} title="Collapse" style={{ border: "none", background: "none", color: T.ink4, cursor: "pointer", fontSize: 13 }}>⟩</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>

              {/* ── STEP CHECKLIST — job cards with status + dependency lines ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: T.ink4, textTransform: "uppercase", letterSpacing: 1 }}>Validation Steps</span>
                  {!validation && <span style={{ fontSize: 9, color: T.ink4, marginLeft: "auto" }}>run checks to activate</span>}
                </div>

                {checklist.length === 0 && (
                  <EmptyDirective icon="✓" label={`Run ${meta.actions.validate} to see how your work measures up — free, unlimited, never affects ELO.`} />
                )}

                {checklist.map((c, i) => {
                  const isPass    = c.passed && !c.pending && !c.info
                  const isFail    = !c.passed && !c.pending && !c.info
                  const isPending = c.pending || c.info
                  const dotColor  = isPending ? "#D6D0C8" : isPass ? "#22C55E" : "#EF4444"
                  const cardBg    = isPending ? "#fff" : isPass ? "#F0FDF4" : "#FFF5F5"
                  const cardBorder= isPending ? T.border : isPass ? "#BBF7D0" : "#FECACA"
                  return (
                    <div key={i} style={{ position: "relative", marginBottom: 6 }}>
                      {/* Dependency line */}
                      {i < checklist.length - 1 && (
                        <div style={{ position: "absolute", left: 10, top: "100%", width: 1, height: 6, background: dotColor, opacity: 0.4, zIndex: 0 }} />
                      )}
                      <div style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "8px 10px", borderRadius: 9, background: cardBg, border: `1px solid ${cardBorder}`, position: "relative", zIndex: 1 }}>
                        {/* Status dot */}
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: dotColor + "22", border: `2px solid ${dotColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          <span style={{ fontSize: 9 }}>{isPending ? "·" : isPass ? "✓" : "✕"}</span>
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: isPending ? 500 : 700, color: isPending ? T.ink3 : isPass ? "#15803D" : "#DC2626", lineHeight: 1.4 }}>
                            {c.input}
                          </div>
                          {!isPending && c.actual && (
                            <div style={{ fontSize: 9.5, color: T.ink4, marginTop: 2, fontFamily: "'DM Mono',monospace" }}>{c.actual}</div>
                          )}
                        </div>
                        {/* Pass/fail pill */}
                        {!isPending && (
                          <span style={{ fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 99, background: isPass ? "#DCFCE7" : "#FEE2E2", color: isPass ? "#15803D" : "#DC2626", flexShrink: 0, marginTop: 2 }}>
                            {isPass ? "PASS" : "FAIL"}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── PROOF TIMELINE ── */}
              <div style={{ marginBottom: 16, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 11, padding: "11px 12px" }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: T.ink4, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Proof Timeline</div>
                {[
                  { label: "Draft",            desc: "Work in progress",                  done: !!code?.trim(),  active: !!code?.trim() && !validation },
                  { label: "Validated",         desc: `${passCount}/${realChecks.length} checks`,  done: validation && passCount > 0, active: validation && passCount < realChecks.length },
                  { label: "Submitted",         desc: "Locked into proof",                done: false,           active: false },
                  { label: "Recruiter-visible", desc: "Live on your profile",             done: false,           active: false },
                ].map((step, i, arr) => {
                  const dotC = step.done ? "#22C55E" : step.active ? meta.hue : "#D6D0C8"
                  return (
                    <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: i < arr.length - 1 ? 0 : 0 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", background: dotC, border: `2px solid ${step.done ? "#22C55E" : step.active ? meta.hue : "#E8E3DA"}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {step.done && <span style={{ fontSize: 7, color: "#fff" }}>✓</span>}
                        </div>
                        {i < arr.length - 1 && <div style={{ width: 1, height: 18, background: step.done ? "#22C55E40" : "#E8E3DA" }} />}
                      </div>
                      <div style={{ paddingBottom: i < arr.length - 1 ? 4 : 0 }}>
                        <div style={{ fontSize: 11, fontWeight: step.done || step.active ? 700 : 500, color: step.done ? "#15803D" : step.active ? T.ink : T.ink4 }}>{step.label}</div>
                        <div style={{ fontSize: 9.5, color: T.ink4 }}>{step.desc}</div>
                      </div>
                    </div>
                  )
                })}
                <button onClick={handlePreview} style={{ marginTop: 10, width: "100%", padding: "7px 10px", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 12 }}>{meta.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.ink2 }}>Preview proof →</span>
                </button>
              </div>

              {/* ── SCORED AT SUBMISSION — grouped by category ── */}
              {(domain.rubric || []).length > 0 && (
                <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 11, padding: "11px 12px" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: T.ink4, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Scored at Submission</div>
                  {(domain.rubric || []).map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 8px", borderRadius: 7, marginBottom: 4, background: T.bg }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: meta.hue, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: T.ink2, fontWeight: 500 }}>{r.criterion}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 9.5, color: T.ink4, marginTop: 8, lineHeight: 1.5, padding: "0 4px" }}>
                    AI-evaluated at submission only — validation can't pre-check judgment quality.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button key="right-closed" onClick={() => setRightOpen(true)} title="Expand" style={{ width: 34, flexShrink: 0, background: "#fff", border: "none", borderLeft: `1px solid ${T.border}`, cursor: "pointer", color: T.ink4, fontSize: 13, writingMode: "vertical-rl" }}>⟨ Checks</button>
        )}
      </div>

      {/* ── VALIDATION DRAWER ── */}
      {drawerOpen && validation && (
        <div style={{ background: "#0D1B2A", borderTop: "1px solid rgba(255,255,255,0.07)", maxHeight: 170, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ padding: "7px 14px 4px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, background: "#0D1B2A" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Validation</span>
            <span style={{ fontSize: 10, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: passCount === realChecks.length ? "#4ADE80" : "#FBBF24" }}>{passCount}/{realChecks.length} passing</span>
            <span style={{ fontSize: 9.5, color: "rgba(0,0,0,0.12)" }}>validation is formative — it never affects ELO</span>
            <button onClick={() => setDrawerOpen(false)} style={{ marginLeft: "auto", fontSize: 16, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
          {validation.map((v, i) => (
            <div key={i} style={{ padding: "4px 14px", borderTop: "1px solid rgba(0,0,0,0.02)", display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, flexShrink: 0 }}>{v.info ? "◌" : v.passed ? "✅" : "❌"}</span>
              <div style={{ flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 10, color: v.info ? "rgba(255,255,255,0.35)" : v.passed ? "#4ADE80" : "#F87171", lineHeight: 1.5 }}>
                {v.input}
                {v.expected && <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>expected: {v.expected}</span>}
                {v.actual && <span style={{ marginLeft: 8 }}>· {v.actual}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ ACTION BAR · 56px · four fixed slots ══ */}
      <div style={{ height: 56, background: T.bg2, borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", flexShrink: 0 }}>
        {showRunSlot && (
          <button onClick={handleRun} disabled={running}
            style={{ padding: "8px 16px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, color: running ? T.ink3 : T.ink2, fontSize: 12, fontWeight: 700, cursor: running ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            {/* Use sibling slots instead of Fragment-vs-string to avoid fiber type mismatch */}
            {running && <Spinner color={T.ink3} size={11} />}
            {running ? " Running…" : meta.actions.run}
          </button>
        )}
        <button onClick={handleValidate} disabled={validating}
          style={{ padding: "8px 16px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, color: validating ? T.ink3 : T.ink2, fontSize: 12, fontWeight: 700, cursor: validating ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          {validating && <Spinner color={T.ink3} size={11} />}
          {validating ? " Validating…" : meta.actions.validate}
          {validation && !validating && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: passCount === realChecks.length ? "#16A34A" : "#D97706" }}>{passCount}/{realChecks.length}</span>}
        </button>
        <button onClick={handlePreview}
          style={{ padding: "8px 16px", background: "none", border: `1px solid ${T.border}`, borderRadius: 7, color: T.ink3, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {meta.actions.preview}
        </button>
        {runFeedback && <span style={{ fontSize: 10.5, color: T.red }}>{runFeedback}</span>}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 10, color: T.ink3 }}>{saveState === "saving" ? "Saving…" : "Draft saved ✓"}</span>
          <button onClick={() => setConfirming(true)} disabled={submitting || !code?.trim()}
            style={{ padding: "9px 22px", background: (submitting || !code?.trim()) ? "#4B5563" : meta.hue, border: "none", borderRadius: 7, color: "#fff", fontSize: 12.5, fontWeight: 800, cursor: (submitting || !code?.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
            {submitting && <Spinner color="#fff" size={11} />}
            {submitting ? " Freezing & scoring…" : meta.actions.submit}
          </button>
        </div>
      </div>

      {/* overlays */}
      {proofDraft && <ProofOverlay draft={proofDraft} mission={mission} meta={meta} validation={validation} onClose={() => setProofDraft(null)} />}
      {/* ── Paste intervention — fires immediately on large paste ── */}
      {pasteWarning && !isPractice && (
        <PasteInterventionModal
          chars={pasteWarning.chars}
          onClear={() => {
            onCodeChange("")
            prevLenRef.current = 0
            pasteRef.current = 0
            keysRef.current = 0
            setPasteWarning(null)
          }}
          onDismiss={() => setPasteWarning(null)}
        />
      )}
      {confirming && (
        <SubmitConfirm mission={mission} meta={meta} validation={validation} hintsUsed={revealedHints} isPractice={isPractice}
          pasteDetected={pasteRef.current > 0}
          onConfirm={() => { setConfirming(false); onSubmit({ validation, passCount, totalChecks: realChecks.length, hintsUsed: revealedHints, validationsRun }) }}
          onCancel={() => setConfirming(false)} />
      )}
    </div>
  )
}
