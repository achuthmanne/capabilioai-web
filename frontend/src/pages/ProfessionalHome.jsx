/**
 * ProfessionalHome.jsx — Professional Path Command Center
 * Design matches landing page ProfessionalOrbitPreview / PathCard aesthetic:
 *   • White background, subtle purple glow
 *   • 'DM Sans' serif for hero headings
 *   • 'DM Mono' for all numbers, labels, badges
 *   • #8B5CF6 purple accent, #FAFAF8 stat cells, 28px card radius
 */
import { useEffect, useState, useCallback } from "react"
import { weeklyCheckApi } from "../lib/api"
import { userDoc } from "../lib/db"
import { OrbitDash } from "./Orbit"

// ─── Design tokens — mirrors landing page exactly ──────────────────────────────
const P   = "#8B5CF6"   // purple accent
const INK = "#1A1714"   // primary text
const INK2= "#3D3935"   // secondary text
const MUT = "#6B6560"   // muted text
const BG  = "#FAFAFA"   // page background
const SURF= "#FFFFFF"   // card surface
const CELL= "#FAFAF8"   // inner stat cell
const BDR = "rgba(17,24,39,0.08)"    // default border
const PBDR= "rgba(139,92,246,0.14)"  // purple card border
const PBDR2="rgba(139,92,246,0.22)"  // hover
const SHD = "0 18px 40px rgba(139,92,246,0.08)"
const SHD2= "0 10px 24px rgba(17,24,39,0.05)"
const r28 = 28, r22 = 22, r18 = 18, r14 = 14, r12 = 12, r999 = 999

const SERIF = "'DM Sans', Georgia, serif"
const MONO  = "'DM Mono', 'Fira Mono', monospace"
const BODY  = "DM Sans, system-ui, sans-serif"

// ─── Atoms ────────────────────────────────────────────────────────────────────
function MonoLabel({ children, color = MUT, size = 10 }) {
  return (
    <div style={{ fontSize: size, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color, fontFamily: MONO, marginBottom: 8 }}>
      {children}
    </div>
  )
}

function Badge({ children, color = P, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: r999,
      background: bg || `${color}10`, color,
      border: `1px solid ${color}26`, fontFamily: MONO,
      letterSpacing: "0.06em",
    }}>{children}</span>
  )
}

function StatusChip({ type, children }) {
  const map = {
    good: { color: "#16A34A", bg: "#F0FDF4", border: "rgba(22,163,74,0.16)" },
    warn: { color: "#D97706", bg: "#FFF7E8", border: "rgba(217,119,6,0.16)" },
    bad:  { color: "#DC2626", bg: "#FEF2F2", border: "rgba(220,38,38,0.16)" },
    info: { color: "#3B82F6", bg: "#EFF6FF", border: "rgba(59,130,246,0.16)" },
    gray: { color: MUT,       bg: "#FAF7F2", border: BDR },
  }
  const s = map[type] || map.gray
  return (
    <span style={{
      fontSize: 10, fontWeight: 900, padding: "4px 9px", borderRadius: r999,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontFamily: MONO, letterSpacing: "0.06em",
    }}>{children}</span>
  )
}

function Card({ children, style = {}, purple = false }) {
  return (
    <div style={{
      background: SURF,
      border: `1px solid ${purple ? PBDR : BDR}`,
      borderRadius: r28, padding: 24,
      boxShadow: purple ? SHD : SHD2,
      ...style,
    }}>{children}</div>
  )
}

function StatCell({ label, value, sub, color = INK }) {
  return (
    <div style={{ background: CELL, border: `1px solid rgba(17,24,39,0.06)`, borderRadius: r14, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 800, color, marginBottom: 3, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 9, color: MUT, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: MONO }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: MUT, marginTop: 3, fontFamily: BODY }}>{sub}</div>}
    </div>
  )
}

function SkillBar({ label, value, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: INK2, fontWeight: 600, fontFamily: BODY }}>{label}</span>
        <span style={{ fontSize: 11, color, fontWeight: 800, fontFamily: MONO }}>{value}% fresh</span>
      </div>
      <div style={{ height: 7, borderRadius: r999, background: "#F3F4F6", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, borderRadius: r999, background: color, transition: "width .5s ease" }} />
      </div>
    </div>
  )
}

function Btn({ children, onClick, primary, outline, small, style = {} }) {
  const base = {
    border: "none", cursor: "pointer", fontFamily: MONO,
    fontWeight: 800, letterSpacing: "0.06em", borderRadius: r14,
    padding: small ? "8px 12px" : "11px 18px",
    fontSize: small ? 10 : 11, transition: "all 180ms cubic-bezier(0.16,1,0.3,1)",
    textTransform: "uppercase",
  }
  if (primary) return (
    <button onClick={onClick} style={{ ...base, background: P, color: "#fff", boxShadow: `0 8px 22px ${P}30`, ...style }}>{children}</button>
  )
  if (outline) return (
    <button onClick={onClick} style={{ ...base, background: SURF, border: `1px solid ${BDR}`, color: INK2, boxShadow: SHD2, ...style }}>{children}</button>
  )
  return (
    <button onClick={onClick} style={{ ...base, background: `${P}10`, border: `1px solid ${P}26`, color: P, ...style }}>{children}</button>
  )
}

// ─── Section: Weekly Career Check entry point ─────────────────────────────────
// Never say "assessment" here — see WeeklyCareerCheck.jsx / weeklyPulse.js.
function WeeklyCheckCard({ onNavigate }) {
  const [state, setState] = useState("loading") // loading | none | due | in_progress | done | error

  useEffect(() => {
    let cancelled = false
    weeklyCheckApi.current()
      .then(res => {
        if (cancelled) return
        if (!res.available) { setState("none"); return }
        if (res.pulse.status === "completed") setState("done")
        else if (res.pulse.status === "in_progress") setState("in_progress")
        else setState("due")
      })
      .catch(() => !cancelled && setState("error"))
    return () => { cancelled = true }
  }, [])

  if (state === "loading" || state === "error") return null // fail quiet on Home — not critical path

  const copy = {
    none:        { title: "Set up your Weekly Career Check", desc: "Add a few skills to your profile and this'll come alive — a 5-minute check-in that keeps your skill scores current.", cta: "Add skills", page: "orbit", color: MUT },
    due:         { title: "This week's Career Check is ready", desc: "5 quick scenario questions based on your skills. Takes about a minute.", cta: "Start check-in", page: "weeklycheck", color: P },
    in_progress: { title: "Pick up where you left off", desc: "You started this week's Career Check — a couple questions left.", cta: "Continue", page: "weeklycheck", color: "#D97706" },
    done:        { title: "This week's Career Check is done", desc: "Nice — your skill confidence signals are current. Next check-in opens next week.", cta: "View skills", page: "orbit", color: GOOD_ALIAS },
  }[state]

  return (
    <div className="ph-card-hover" style={{
      padding: "18px 20px", background: SURF, border: `1.5px solid ${state === "done" ? "rgba(22,163,74,0.2)" : `${copy.color}30`}`,
      borderRadius: r18, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      transition: "all 180ms cubic-bezier(0.16,1,0.3,1)",
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${copy.color}12`, border: `1px solid ${copy.color}26`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>
        {state === "done" ? "✅" : state === "in_progress" ? "⏳" : "⚡"}
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <MonoLabel color={copy.color}>Weekly Career Check</MonoLabel>
        <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: INK, marginBottom: 3 }}>{copy.title}</div>
        <div style={{ fontSize: 12, color: MUT, lineHeight: 1.6, fontFamily: BODY }}>{copy.desc}</div>
      </div>
      <Btn primary={state !== "done"} outline={state === "done"} onClick={() => onNavigate(copy.page)}>{copy.cta} →</Btn>
    </div>
  )
}
const GOOD_ALIAS = "#16A34A"

// ─── Section: Career Timeline ─────────────────────────────────────────────────
function CareerTimeline({ experiences, onNavigate }) {
  const exps = experiences || []

  if (!exps.length) {
    return (
      <div style={{ padding: "32px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
        <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: INK, marginBottom: 8 }}>No timeline entries yet</div>
        <div style={{ fontSize: 13, color: MUT, maxWidth: 360, margin: "0 auto 20px", lineHeight: 1.7, fontFamily: BODY }}>
          Upload your resume in Vault — AI will parse your career history into a verified timeline automatically.
        </div>
        <Btn primary onClick={() => onNavigate("aura")}>Open Profile & Vault →</Btn>
      </div>
    )
  }

  return (
    <div style={{ position: "relative", paddingLeft: 36 }}>
      {/* timeline spine */}
      <div style={{ position: "absolute", left: 18, top: 0, bottom: 0, width: 2, background: `linear-gradient(180deg,${P}55,${P}0A)` }} />

      {exps.slice(0, 4).map((exp, i) => {
        const isCurrent = !exp.endDate || exp.endDate === "Present"
        return (
          <div key={i} style={{ position: "relative", marginBottom: i < exps.length - 1 ? 14 : 0 }}>
            {/* dot */}
            <div style={{
              position: "absolute", left: -24, top: 16,
              width: 12, height: 12, borderRadius: "50%",
              background: isCurrent ? P : SURF,
              border: `3px solid ${P}72`,
              boxShadow: isCurrent ? `0 0 0 5px ${P}14` : "0 0 0 5px rgba(139,92,246,0.06)",
            }} />
            <div style={{ background: CELL, border: `1px solid ${BDR}`, borderRadius: r18, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: INK, marginBottom: 2 }}>{exp.title || exp.role || "Role"}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: P, marginBottom: 2, fontFamily: BODY }}>{exp.company || exp.org}</div>
                  <div style={{ fontSize: 11, color: MUT, fontFamily: MONO }}>
                    {exp.startDate || "—"} – {exp.endDate || "Present"} · {exp.verified ? "Verified" : "Self-claimed"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
                  <StatusChip type={exp.verified ? "good" : "warn"}>{exp.verified ? "Verified" : "Pending"}</StatusChip>
                  {isCurrent && <StatusChip type="info">Current</StatusChip>}
                </div>
              </div>
              {exp.description && (
                <div style={{ fontSize: 12, color: INK2, marginTop: 10, lineHeight: 1.72, fontFamily: BODY }}>
                  {exp.description.slice(0, 160)}{exp.description.length > 160 ? "…" : ""}
                </div>
              )}
              {(exp.skills || exp.tags || []).length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {(exp.skills || exp.tags || []).slice(0, 5).map((t, j) => (
                    <Badge key={j} color={P}>{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {exps.length > 4 && (
        <div style={{ paddingTop: 12, textAlign: "center" }}>
          <button onClick={() => onNavigate("aura")} style={{ background: "none", border: "none", color: P, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: MONO, letterSpacing: "0.06em" }}>
            VIEW ALL {exps.length} ENTRIES →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Section: Vault docs ──────────────────────────────────────────────────────
function VaultRows({ files, onNavigate }) {
  const statusType = { Resume: "good", Experience: "good", Certificate: "good", Offer: "warn" }

  if (!files.length) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center" }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🔐</div>
        <div style={{ fontSize: 13, color: MUT, marginBottom: 14, fontFamily: BODY }}>No documents uploaded yet</div>
        <Btn primary onClick={() => onNavigate("aura")}>Upload first document →</Btn>
      </div>
    )
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {/* info note */}
      <div style={{ padding: "11px 14px", borderRadius: r12, border: "1px solid rgba(59,130,246,0.16)", background: "#EFF6FF", fontSize: 12, color: "#1D4ED8", lineHeight: 1.6, fontFamily: BODY, marginBottom: 4 }}>
        <strong>Flow:</strong> Upload resume → AI parses company, role, dates, skills → confirm once → timeline is canonical.
      </div>
      {files.slice(0, 5).map((f, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 14px", background: CELL, border: `1px solid ${BDR}`, borderRadius: r14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK, fontFamily: BODY }}>{f.name}</div>
            <div style={{ fontSize: 11, color: MUT, marginTop: 2, fontFamily: MONO }}>
              {f.category || "Document"}{f.size ? ` · ${Math.round(f.size / 1024)}KB` : ""}
            </div>
          </div>
          <StatusChip type={statusType[f.category] || "gray"}>{statusType[f.category] === "good" ? "In Vault" : "Pending"}</StatusChip>
        </div>
      ))}
      {files.length > 5 && (
        <button onClick={() => onNavigate("aura")} style={{ background: "none", border: "none", color: P, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: MONO, letterSpacing: "0.06em", textAlign: "center", padding: "6px 0" }}>
          VIEW ALL {files.length} DOCUMENTS →
        </button>
      )}
    </div>
  )
}

// ─── Section: Orbit scores ────────────────────────────────────────────────────
function OrbitScores({ elo, userData }) {
  const hasExp   = (userData?.experiences || []).length > 0
  const hasVault = (userData?.vaultFiles  || []).length > 0
  const hasVerif = !!(userData?.epfoVerified || userData?.verified)
  const hasSumm  = !!userData?.summary
  const eloN     = Math.min(elo, 1600)

  const scores = [
    { label: "Career Health",   value: Math.min(Math.round(eloN * .42 + (hasExp?200:0) + (hasVerif?180:0) + (hasSumm?120:0)), 1600), color: P,         max: 1600 },
    { label: "Role Fit",        value: Math.min(Math.round(eloN * .72),  1600), color: "#3B82F6", max: 1600 },
    { label: "Market Standing", value: Math.min(Math.round(eloN * .80),  1600), color: "#16A34A", max: 1600 },
    { label: "Proof Strength",  value: Math.min((hasVault?180:0)+(hasVerif?260:0)+(hasExp?140:0), 580),  color: "#D97706", max: 580  },
  ]

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
      {scores.map((s, i) => (
        <div key={i} style={{ background: CELL, border: `1px solid rgba(17,24,39,0.06)`, borderRadius: r14, padding: "14px 12px" }}>
          <MonoLabel color={MUT} children={s.label} />
          <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: "-.04em", lineHeight: 1 }}>
            {s.value.toLocaleString()}
          </div>
          <div style={{ marginTop: 10, height: 7, borderRadius: r999, background: "#F3F4F6", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round((s.value/s.max)*100)}%`, borderRadius: r999, background: s.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Section: Skill Half-Life ─────────────────────────────────────────────────
function SkillHalfLife({ userData }) {
  // Derive from skillGraph or use defaults with real freshness logic
  const graph = userData?.skillGraph || []
  const skills = graph.length > 0
    ? graph.slice(0, 4).map(s => ({
        label: s.label || s.skill || "Skill",
        value: Math.max(10, Math.min(99, s.freshness || s.value || 70)),
        color: (s.freshness || s.value || 70) < 40 ? "#DC2626" : (s.freshness || s.value || 70) < 65 ? "#D97706" : P,
      }))
    : [
        { label: "Primary stack",    value: 65, color: P         },
        { label: "System Design",    value: 72, color: "#16A34A" },
        { label: "Cloud / DevOps",   value: 48, color: "#D97706" },
        { label: "Domain knowledge", value: 81, color: "#3B82F6" },
      ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {skills.map((sk, i) => <SkillBar key={i} {...sk} />)}
      <div style={{ fontSize: 11, color: MUT, fontFamily: BODY, marginTop: 4, lineHeight: 1.6 }}>
        Skills below 50% freshness trigger Forge repair tasks automatically.
      </div>
    </div>
  )
}

// ─── Section: Action gap cards ────────────────────────────────────────────────
function ActionGaps({ userData, onNavigate }) {
  const hasVerif   = !!(userData?.epfoVerified || userData?.verified)
  const hasTarget  = !!userData?.targetRole
  const hasVault   = (userData?.vaultFiles || []).length > 0
  const hasExp     = (userData?.experiences || []).length > 0
  const hasSummary = !!userData?.summary

  const gaps = []
  if (!hasVerif)   gaps.push({ cap: "Critical gap",    title: "Employment verification missing", desc: "EPFO/UAN cross-match increases recruiter trust and unlocks proof strength score.", icon: "🔐", impact: "bad",  page: "aura",     btn: "Verify now" })
  if (!hasTarget)  gaps.push({ cap: "Signal gap",      title: "Target role not set",             desc: "Set a target role so Orbit can tune skill decay and weekly assessments correctly.",  icon: "🎯", impact: "warn", page: "orbit",    btn: "Set target" })
  if (!hasVault)   gaps.push({ cap: "Evidence gap",    title: "No resume uploaded",              desc: "Upload your resume to Vault — AI will parse it into your career timeline in seconds.", icon: "📄", impact: "info", page: "aura",     btn: "Open Vault" })
  if (!hasSummary) gaps.push({ cap: "Visibility gap",  title: "Profile summary missing",        desc: "A strong summary increases role fit score and recruiter profile views 3×.",           icon: "✍️", impact: "warn", page: "aura",     btn: "Add summary" })
  if (!hasExp)     gaps.push({ cap: "Profile gap",     title: "Timeline empty",                 desc: "Add career entries so your profile is visible to recruiters and Orbit can score it.",  icon: "📋", impact: "warn", page: "aura",     btn: "Add experience" })

  if (!gaps.length) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: "#16A34A" }}>Profile looking strong</div>
        <div style={{ fontSize: 12, color: MUT, marginTop: 6, fontFamily: BODY }}>Keep running weekly assessments to maintain your scores.</div>
      </div>
    )
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {gaps.slice(0, 3).map((g, i) => (
        <div key={i} style={{ padding: "14px 16px", background: CELL, border: `1px solid ${BDR}`, borderRadius: r18, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 38, height: 38, background: SURF, border: `1px solid ${BDR}`, borderRadius: r12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{g.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <MonoLabel children={g.cap} />
            <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: INK, marginBottom: 4 }}>{g.title}</div>
            <div style={{ fontSize: 12, color: MUT, lineHeight: 1.6, fontFamily: BODY, marginBottom: 10 }}>{g.desc}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <StatusChip type={g.impact}>{g.impact === "bad" ? "High impact" : g.impact === "warn" ? "Medium" : "Actionable"}</StatusChip>
              <Btn small onClick={() => onNavigate(g.page)}>{g.btn} →</Btn>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────
// Home is now the single command-center view for the Professional path — the
// old Orbit "Overview" dashboard (OrbitDash) is embedded directly below, and
// deep-dive tabs (Timeline/Verification/Compensation/Readiness) live on the
// "Career" nav item (same underlying Orbit.jsx page, just relabeled).
export default function ProfessionalHome({ user, userData, setUserData, activeTab, setActiveTab, onNavigate, onNavigatePricing }) {
  // BUG FIX: userData.name was never a real field (see lib/db.js — the actual
  // column/mapping is displayName←display_name), so this always fell through
  // to the literal string "Professional" no matter who was logged in. Fixed
  // to the same fallback chain App.jsx's header already uses correctly.
  const name        = userData?.displayName || userData?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Professional"
  const initials    = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  const firstName   = name.split(" ")[0]
  const elo         = userData?.eloRating || 1200
  const role        = userData?.keyword || userData?.targetRole || "Professional"
  const isFreePlan  = !userData?.subscription || userData?.subscription === "free"
  const isVerified  = !!(userData?.epfoVerified || userData?.verified)
  const experiences = userData?.experiences || []
  const vaultFiles  = userData?.vaultFiles  || []
  const coverURL    = userData?.coverPhotoURL || null
  const photoURL    = userData?.profilePhotoURL || null

  const uid = user?.id || user?.uid
  const onSave = useCallback(async updates => {
    if (!uid) return
    try {
      await userDoc.update(uid, updates)
      if (setUserData) setUserData(p => ({ ...p, ...updates }))
    } catch (e) { console.error(e) }
  }, [uid, setUserData])

  // OrbitDash's card actions call onNav with either a real page ("forge",
  // "launchpad", etc.) or one of Career's internal tabs ("timeline","vault",
  // "comp","readiness" — "orbit" is the legacy id for the now-removed
  // Overview tab, treated as "timeline"). Internal tabs route to the "orbit"
  // page (nav label "Career") on the right tab; everything else navigates directly.
  const CAREER_TABS = ["orbit", "timeline", "vault", "comp", "readiness"]
  const onDashNav = useCallback(target => {
    if (CAREER_TABS.includes(target)) {
      setActiveTab?.(target === "orbit" ? "timeline" : target)
      onNavigate("orbit")
    } else {
      onNavigate(target)
    }
  }, [onNavigate, setActiveTab])

  return (
    <div style={{
      flex: 1, minHeight: 0, overflowY: "auto",
      background: `radial-gradient(ellipse at 10% 0%, ${P}0D 0%, transparent 46%), ${BG}`,
      fontFamily: BODY, color: INK,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
        .ph-nav-tab { background: ${SURF}; border: 1px solid ${BDR}; color: ${MUT}; padding: 9px 14px; border-radius: ${r999}px; font-weight: 800; font-size: 11px; cursor: pointer; font-family: ${MONO}; letter-spacing: 0.06em; text-transform: uppercase; transition: all 150ms; }
        .ph-nav-tab:hover { border-color: ${P}40; color: ${P}; }
        .ph-nav-tab.active { background: ${P}; color: #fff; border-color: transparent; box-shadow: 0 8px 22px ${P}30; }
        .ph-sub-tab { background: none; border: 1px solid ${BDR}; color: ${MUT}; padding: 8px 14px; border-radius: ${r999}px; font-weight: 700; font-size: 11px; cursor: pointer; font-family: ${MONO}; letter-spacing: 0.06em; text-transform: uppercase; transition: all 150ms; }
        .ph-sub-tab:hover { color: ${P}; border-color: ${P}40; }
        .ph-sub-tab.on { background: ${P}10; color: ${P}; border-color: ${P}26; }
        .ph-action-card:hover { border-color: ${P}22 !important; transform: translateY(-1px); box-shadow: 0 12px 26px ${P}08; }
        .ph-card-hover:hover { border-color: rgba(139,92,246,0.22) !important; transform: translateY(-2px); }
      `}</style>

      {/* ── Page title strip (global nav already carries Home/Orbit/Forge/etc) ── */}
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: P, fontFamily: MONO }}>Professional Path · Home</div>
        <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 800, color: INK, marginTop: 4 }}>Welcome back, {firstName}</div>
      </div>

      {/* ── Hero card ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "20px 24px 0" }}>
        <div className="ph-card-hover" style={{
          background: SURF, border: `1px solid ${PBDR}`,
          borderRadius: r28, overflow: "hidden",
          boxShadow: SHD, transition: "all 180ms cubic-bezier(0.16,1,0.3,1)",
        }}>
          {/* cover — real cover photo if the user has uploaded one (Profile → edit), gradient fallback otherwise */}
          <div style={{
            height: 140, position: "relative",
            background: coverURL
              ? `url(${coverURL}) center/cover no-repeat`
              : `linear-gradient(120deg,#4C1D95,#7C3AED 45%,#A78BFA 80%,#C4B5FD)`,
          }}>
            {!coverURL && (
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 40%,rgba(255,255,255,0.18),transparent 40%),radial-gradient(circle at 80% 20%,rgba(255,255,255,0.12),transparent 30%)" }} />
            )}
            <button onClick={() => onNavigate("aura")} style={{
              position: "absolute", right: 14, bottom: 14,
              background: "rgba(0,0,0,0.4)", color: "#fff", border: "none",
              borderRadius: r999, padding: "6px 12px", fontSize: 11, fontWeight: 700,
              cursor: "pointer", fontFamily: BODY, backdropFilter: "blur(6px)",
            }}>📷 {coverURL ? "Change cover" : "Add cover photo"}</button>
          </div>

          <div style={{ padding: "0 24px 24px" }}>
            {/* avatar + identity row */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginTop: -44, marginBottom: 16, flexWrap: "wrap" }}>
              {/* avatar — real profile photo if set, initials fallback otherwise */}
              <div style={{
                width: 88, height: 88, borderRadius: 22, flexShrink: 0,
                background: photoURL ? `#fff` : `linear-gradient(135deg,${P},#A78BFA)`,
                border: "3px solid #fff",
                boxShadow: `0 8px 24px ${P}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: SERIF, fontSize: 32, fontWeight: 800, color: "#fff",
                overflow: "hidden",
              }}>
                {photoURL ? <img src={photoURL} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
              </div>

              {/* name block */}
              <div style={{ paddingBottom: 4, flex: 1, minWidth: 180 }}>
                <div style={{ fontFamily: SERIF, fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 800, color: INK, lineHeight: 1, marginBottom: 5 }}>
                  {name}
                </div>
                <div style={{ fontSize: 13, color: MUT, fontFamily: BODY }}>{role} {isVerified && <span style={{ color: "#16A34A", fontWeight: 700 }}>· Verified ✓</span>}</div>
              </div>

              {/* ELO badge */}
              <div style={{ background: `${P}0F`, border: `1.5px solid ${P}30`, borderRadius: r18, padding: "14px 16px 12px", textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 800, color: P, lineHeight: 1 }}>{elo.toLocaleString()}</div>
                <div style={{ fontSize: 9, color: P, letterSpacing: "0.12em", marginTop: 5, textTransform: "uppercase", fontFamily: MONO, fontWeight: 800 }}>ELO Score</div>
              </div>
            </div>

            {/* pills row */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              <Badge color={P}>Professional path</Badge>
              {isVerified && <Badge color="#16A34A" bg="#F0FDF4">Verified timeline</Badge>}
              {experiences.length > 0 && <Badge color="#3B82F6" bg="#EFF6FF">{experiences.length} career {experiences.length === 1 ? "entry" : "entries"}</Badge>}
              {vaultFiles.length > 0 && <Badge color="#D97706" bg="#FFF7E8">{vaultFiles.length} vault {vaultFiles.length === 1 ? "doc" : "docs"}</Badge>}
              {isFreePlan && <Badge color={MUT} bg="#FAF7F2">Free plan</Badge>}
            </div>

            {/* 3-col stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
              <StatCell label="Market Value" value="—" sub="Add timeline to unlock" color={INK} />
              <StatCell label="Layoff Shield" value={isVerified ? "Active" : "—"} sub={isVerified ? "Employment verified" : "Verify to unlock"} color={isVerified ? "#16A34A" : INK} />
              <StatCell label="Career Velocity" value={experiences.length > 0 ? "+ELO" : "—"} sub="Based on Career signals" color={P} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Body content ───────────────────────────────────────────────────── */}
      <div style={{ padding: "18px 24px 60px" }}>

        {/* Weekly Career Check entry point */}
        <div style={{ marginBottom: 18 }}>
          <WeeklyCheckCard onNavigate={onNavigate} />
        </div>

        {/* Embedded Career dashboard — formerly the standalone Orbit page's
            "Overview" tab. Career Health Score + 4 ELO cards + comp/gap/
            recruiter/risk/health/action/ROI + Elite row, all real. */}
        <div style={{ marginBottom: 18 }}>
          <OrbitDash ud={userData} user={user} onSave={onSave} onNav={onDashNav} onPricing={onNavigatePricing} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18, marginBottom: 18 }}>
          {/* Action gaps */}
          <Card>
            <div style={{ marginBottom: 18 }}>
              <MonoLabel>Action items</MonoLabel>
              <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: INK }}>Profile gaps</div>
              <div style={{ fontSize: 12, color: MUT, marginTop: 3, fontFamily: BODY }}>Resolve these to improve career scores.</div>
            </div>
            <ActionGaps userData={userData} onNavigate={onNavigate} />
          </Card>

          {/* Quick nav to the rest of the 7-module IA */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: "📈", label: "Career",    page: "orbit",     color: P         },
              { icon: "🧠", label: "Skills",    page: "skills",    color: "#D97706" },
              { icon: "📰", label: "Pulse",     page: "pulse",     color: "#16A34A" },
              { icon: "🚀", label: "Launchpad", page: "launchpad", color: "#3B82F6" },
            ].map((q, i) => (
              <div key={i} onClick={() => onNavigate(q.page)} className="ph-action-card" style={{
                padding: "14px 16px", background: CELL,
                border: `1px solid ${BDR}`, borderRadius: r18,
                cursor: "pointer", transition: "all 180ms cubic-bezier(0.16,1,0.3,1)",
              }}>
                <div style={{ width: 36, height: 36, background: `${q.color}12`, border: `1px solid ${q.color}22`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: 10 }}>{q.icon}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: q.color, letterSpacing: "0.1em", textTransform: "uppercase" }}>{q.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Upgrade / Pro banner ─────────────────────────────────────────── */}
        {isFreePlan && (
          <div style={{ marginTop: 18, padding: "22px 24px", borderRadius: r22, background: `linear-gradient(135deg,#4C1D95,#6D28D9)`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, background: "rgba(255,255,255,0.04)", borderRadius: "50%" }} />
            <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.55)", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: MONO, marginBottom: 8 }}>Free plan</div>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Unlock your full Career OS</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.65, fontFamily: BODY, marginBottom: 16 }}>
              Capabilio Pro gives you compensation intelligence, unlimited Forge, layoff shield score, peer benchmarking, and gap narrative — starting at <strong style={{ color: "#fff" }}>₹499/month</strong>.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {["Compensation Intel", "Unlimited Forge", "Layoff Shield", "Peer Benchmarks", "3 Market Reports/mo"].map(f => (
                <span key={f} style={{ padding: "4px 10px", background: "rgba(255,255,255,0.12)", borderRadius: r999, fontSize: 10, color: "#fff", fontWeight: 700, fontFamily: MONO }}>✓ {f}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => (onNavigatePricing || onNavigate)("pricing")} style={{
                flex: 1, padding: 14, background: "#fff", border: "none", borderRadius: r14,
                color: "#6D28D9", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: MONO,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>Upgrade to Capabilio Pro →</button>
              <button onClick={() => onNavigate("orbit")} style={{
                padding: "14px 18px", background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)",
                borderRadius: r14, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: MONO,
              }}>See Orbit</button>
            </div>
          </div>
        )}
        {!isFreePlan && (
          <div style={{ marginTop: 18, padding: "14px 18px", background: "#F0FDF4", border: "1px solid rgba(22,163,74,0.18)", borderRadius: r14, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A", fontFamily: BODY }}>You're on {userData?.subscription === "orbit_elite" ? "Capabilio Elite" : "Capabilio Pro"}</div>
              <div style={{ fontSize: 12, color: MUT, marginTop: 1, fontFamily: BODY }}>All career intelligence features unlocked.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
