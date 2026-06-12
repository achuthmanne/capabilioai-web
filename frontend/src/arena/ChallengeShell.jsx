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

const SERVER = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

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
      if (/^`.+`$/.test(p)) return <code key={j} style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: 3, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{p.slice(1, -1)}</code>
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
                  ? <pre style={{ margin: 0, padding: "12px 16px", background: T.slate, color: "#E2E8F0", fontFamily: "'DM Mono',monospace", fontSize: 11.5, lineHeight: 1.6, overflow: "auto", maxHeight: 320 }}>{a.content}</pre>
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
function SubmitConfirm({ mission, meta, validation, hintsUsed, isPractice, onConfirm, onCancel }) {
  const real = (validation || []).filter(v => !v.info)
  const passed = real.filter(v => v.passed).length
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 960, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: 420, padding: "22px 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: T.ink, marginBottom: 4 }}>{meta.actions.submit}?</div>
        <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.6, marginBottom: 14 }}>
          Submitting freezes this attempt permanently — your work and its outputs become an immutable proof record. You cannot edit it afterwards.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
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
            <span style={{ color: T.ink3 }}>ELO at stake</span>
            <span style={{ fontWeight: 800, color: isPractice ? T.ink4 : T.green, fontFamily: "'DM Mono',monospace" }}>
              {isPractice ? "unranked practice" : `+${mission.eloGain || mission.eloReward || 12} on strong solve`}
            </span>
          </div>
        </div>
        {real.length > 0 && passed < real.length && (
          <div style={{ fontSize: 11, color: T.amber, background: T.amberBg, border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 11px", marginBottom: 14, lineHeight: 1.5 }}>
            ⚠️ {real.length - passed} check{real.length - passed === 1 ? "" : "s"} still failing. You can submit anyway — the score will reflect it.
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
            <span style={{ marginLeft: "auto", fontSize: 10, color: T.ink4 }}>{new Date(d.createdAt || d.created_at || Date.now()).toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
            <span style={{ color: (d.score ?? 0) >= 70 ? T.green : T.amber, fontWeight: 800 }}>score {d.score ?? "—"}</span>
            <span style={{ color: T.green }}>+{d.eloGain ?? d.elo_gain ?? 0} ELO</span>
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

  // ── behavioral tracking (consumed by Arena.handleSubmit) ──
  const pasteRef = useRef(0), keysRef = useRef(0), startRef = useRef(Date.now())
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

  const handleCodeChange = v => { keysRef.current += 1; onCodeChange(v) }

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

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: T.bg, fontFamily: "'DM Sans',sans-serif" }}>

      {/* ══ TOP BAR · 48px ══ */}
      <div style={{ height: 48, background: "#fff", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", flexShrink: 0, zIndex: 20 }}>
        <button onClick={onClear} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "none", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: T.ink3, cursor: "pointer", fontFamily: "inherit" }}>←</button>
        <div style={{ fontSize: 11, color: T.ink4, display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          <span>Arena</span><span>▸</span>
          <span style={{ color: domain.color, fontWeight: 700 }}>{domain.label}</span><span>▸</span>
          <span style={{ color: T.ink, fontWeight: 800, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 280 }}>{mission.title}</span>
        </div>
        {mission.difficulty && <Pill color={diffColor(mission.difficulty)} bg={diffBg(mission.difficulty)}>{mission.difficulty}</Pill>}
        <WorkstationBadge meta={meta} />
        <Pill color={source.hue} bg={`${source.hue}12`}>{source.label}</Pill>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {timeStr && (
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 800, color: isDanger ? T.red : isWarn ? T.amber : T.ink4, animation: isDanger ? "shimmer 1s ease-in-out infinite" : "none" }}>⏱ {timeStr}</span>
          )}
          <span style={{ fontSize: 11, fontWeight: 800, color: isPractice ? T.ink4 : T.green }}>{isPractice ? "unranked" : `+${eloGain} ELO`}</span>
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
          <div style={{ width: 320, flexShrink: 0, background: "#fff", borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
          <button onClick={() => setLeftOpen(true)} title="Expand brief  [" style={{ width: 34, flexShrink: 0, background: "#fff", border: "none", borderRight: `1px solid ${T.border}`, cursor: "pointer", color: T.ink4, fontSize: 13, writingMode: "vertical-rl" }}>⟩ Brief</button>
        )}

        {/* ── CENTER: WORKSTATION RENDERER SLOT ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, background: T.bg }}
          onPaste={() => { pasteRef.current += 1 }}>
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
          <div style={{ width: 300, flexShrink: 0, background: "#fff", borderLeft: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: T.ink3, textTransform: "uppercase", letterSpacing: 0.8 }}>Mission Control</span>
              <button onClick={() => setRightOpen(false)} title="Collapse  ]" style={{ marginLeft: "auto", border: "none", background: "none", color: T.ink4, cursor: "pointer", fontSize: 13 }}>⟩</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px" }}>

              {/* Live checklist */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: T.ink3, textTransform: "uppercase", letterSpacing: 0.7 }}>Live checklist</span>
                  {validation && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: passCount === realChecks.length ? T.green : T.amber }}>{passCount}/{realChecks.length}</span>}
                </div>
                {checklist.length === 0 && <EmptyDirective icon="✓" label={`Run ${meta.actions.validate} to see how your work measures up — it's free, unlimited, and never affects ELO.`} />}
                {checklist.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", padding: "6px 8px", borderRadius: 7, marginBottom: 4, background: c.pending ? T.bg : c.info ? T.bg : c.passed ? T.greenBg : T.redBg }}>
                    <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>{c.pending ? "○" : c.info ? "◌" : c.passed ? "✅" : "❌"}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: c.pending || c.info ? T.ink3 : c.passed ? "#15803D" : T.red, lineHeight: 1.45, fontWeight: c.pending ? 400 : 600 }}>{c.input}</div>
                      {!c.pending && c.actual && <div style={{ fontSize: 9.5, color: T.ink4, marginTop: 1 }}>{c.actual}</div>}
                    </div>
                  </div>
                ))}
                {!validation && checklist.length > 0 && (
                  <div style={{ fontSize: 9.5, color: T.ink4, marginTop: 6, lineHeight: 1.5 }}>Steps from the brief. {meta.actions.validate} turns this into live pass/fail state.</div>
                )}
              </div>

              {/* Proof preview card (spec §4.6) */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.ink3, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Proof preview</div>
                <button onClick={handlePreview} style={{ width: "100%", textAlign: "left", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "12px 13px", cursor: "pointer", fontFamily: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                    <span style={{ fontSize: 14 }}>{meta.icon}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: T.ink }}>{mission.title}</span>
                  </div>
                  <div style={{ fontSize: 10, color: T.ink4, lineHeight: 1.5 }}>
                    Click to see exactly what {meta.actions.submit.toLowerCase()} will freeze into your recruiter-visible proof — before you commit it.
                  </div>
                </button>
              </div>

              {/* Rubric — what's scored at submission */}
              {(domain.rubric || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.ink3, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Scored at submission</div>
                  {(domain.rubric || []).map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 7, alignItems: "center", padding: "4px 2px", fontSize: 11, color: T.ink3 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.hue, flexShrink: 0 }} />
                      {r.criterion}
                    </div>
                  ))}
                  <div style={{ fontSize: 9.5, color: T.ink4, marginTop: 6, lineHeight: 1.5 }}>AI-evaluated dimensions are scored only when you submit — validation can't pre-check judgment quality.</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button onClick={() => setRightOpen(true)} title="Expand  ]" style={{ width: 34, flexShrink: 0, background: "#fff", border: "none", borderLeft: `1px solid ${T.border}`, cursor: "pointer", color: T.ink4, fontSize: 13, writingMode: "vertical-rl" }}>⟨ Checks</button>
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
      <div style={{ height: 56, background: T.slate2, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8, padding: "0 14px", flexShrink: 0 }}>
        {showRunSlot && (
          <button onClick={handleRun} disabled={running}
            style={{ padding: "8px 16px", background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 7, color: running ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700, cursor: running ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            {running ? <><Spinner color="rgba(255,255,255,0.4)" size={11} /> Running…</> : meta.actions.run}
          </button>
        )}
        <button onClick={handleValidate} disabled={validating}
          style={{ padding: "8px 16px", background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 7, color: validating ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700, cursor: validating ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          {validating ? <><Spinner color="rgba(255,255,255,0.4)" size={11} /> Validating…</> : meta.actions.validate}
          {validation && !validating && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: passCount === realChecks.length ? "#4ADE80" : "#FBBF24" }}>{passCount}/{realChecks.length}</span>}
        </button>
        <button onClick={handlePreview}
          style={{ padding: "8px 16px", background: "none", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 7, color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {meta.actions.preview}
        </button>
        {runFeedback && <span style={{ fontSize: 10.5, color: "#F87171" }}>{runFeedback}</span>}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>{saveState === "saving" ? "Saving…" : "Draft saved ✓"}</span>
          <button onClick={() => setConfirming(true)} disabled={submitting || !code?.trim()}
            style={{ padding: "9px 22px", background: (submitting || !code?.trim()) ? "#4B5563" : meta.hue, border: "none", borderRadius: 7, color: "#fff", fontSize: 12.5, fontWeight: 800, cursor: (submitting || !code?.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
            {submitting ? <><Spinner color="#fff" size={11} /> Freezing & scoring…</> : meta.actions.submit}
          </button>
        </div>
      </div>

      {/* overlays */}
      {proofDraft && <ProofOverlay draft={proofDraft} mission={mission} meta={meta} validation={validation} onClose={() => setProofDraft(null)} />}
      {confirming && (
        <SubmitConfirm mission={mission} meta={meta} validation={validation} hintsUsed={revealedHints} isPractice={isPractice}
          onConfirm={() => { setConfirming(false); onSubmit() }}
          onCancel={() => setConfirming(false)} />
      )}
    </div>
  )
}
