/**
 * Portfolio.jsx — Role-Aware Professional Portfolio
 *
 * Archetype-driven rendering: each role (Frontend, Backend, DevOps, Data,
 * Designer, PM, Founder, Student, Full Stack, Mobile) gets a distinct
 * visual identity, section order, proof emphasis, and recruiter summary.
 *
 * Archetype detection: userData.archetype > path > keyword/job_role > ELO
 */

import { useEffect, useState, useRef } from "react"
import { getPortfolioConfig, ARCHETYPES } from "../config/portfolioArchetypes"
import { userDoc } from "../lib/db"
import { supabase } from "../lib/supabase"
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, Area, AreaChart,
} from "recharts"

// ─── Design tokens — full dark mode ────────────────────────────────────────────
const C = {
  bg:      "#0A0F1E",           // page background — deep navy
  surface: "#111827",           // card surface — dark
  surface2:"#1E293B",           // elevated card / inner panel
  ink:     "#F1F5F9",           // primary text
  ink2:    "#CBD5E1",           // secondary text
  ink3:    "#94A3B8",           // muted text
  ink4:    "#64748B",           // very muted
  border:  "rgba(255,255,255,0.07)", // subtle card border
  border2: "rgba(255,255,255,0.12)", // slightly more visible
  blue:    "#3B82F6",
  blue2:   "#60A5FA",
  blue3:   "rgba(59,130,246,0.12)",
  teal:    "#14B8A6",
  teal2:   "#2DD4BF",
  teal3:   "rgba(20,184,166,0.12)",
  green:   "#22C55E",
  green2:  "rgba(34,197,94,0.12)",
  amber:   "#F59E0B",
  amber2:  "rgba(245,158,11,0.12)",
  red:     "#EF4444",
  red2:    "rgba(239,68,68,0.12)",
  purple:  "#A78BFA",
  purple2: "rgba(167,139,250,0.12)",
  shadow:  "0 1px 4px rgba(0,0,0,0.4)",
  shadow2: "0 8px 32px rgba(0,0,0,0.5)",
}

const PATH_CONFIG = {
  student:      { label:"Student",      icon:"🎓", heroBg:"linear-gradient(135deg,#1E3A8A 0%,#1D4ED8 55%,#0F766E 100%)" },
  professional: { label:"Professional", icon:"💼", heroBg:"linear-gradient(135deg,#0F172A 0%,#0F766E 60%,#14B8A6 100%)" },
  authority:    { label:"Expert",       icon:"⭐", heroBg:"linear-gradient(135deg,#1E1B4B 0%,#2D1B69 50%,#0F766E 100%)" },
}

const ELO_TIERS = [
  { min:0,    max:500,  label:"Beginner",    color:"#64748B" },
  { min:500,  max:800,  label:"Developing",  color:"#D97706" },
  { min:800,  max:1100, label:"Proficient",  color:"#2563EB" },
  { min:1100, max:1500, label:"Advanced",    color:"#7C3AED" },
  { min:1500, max:9999, label:"Elite",       color:"#DC2626" },
]
const getTier = elo => ELO_TIERS.find(t => elo >= t.min && elo < t.max) || ELO_TIERS[0]

const DIFF = {
  Easy:   { color:C.green,  bg:C.green2 },
  Medium: { color:C.amber,  bg:C.amber2 },
  Hard:   { color:C.red,    bg:C.red2   },
  Expert: { color:C.purple, bg:C.purple2},
}

const fmt     = iso => { if(!iso) return ""; const d=new Date(iso); return d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) }
const fmtFull = iso => { if(!iso) return ""; const d=new Date(iso); return d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})+" · "+d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) }
const gradeFor = s => s>=90?"A+":s>=80?"A":s>=70?"B+":s>=60?"B":s>=50?"C":"D"
const scoreColor = s => s>=80?C.green:s>=60?C.amber:s>=40?C.red:C.ink4

// ─── Reusable components ───────────────────────────────────────────────────────

function Avatar({ name, url, size=80, fontSize=28 }) {
  if (url) return <img src={url} alt={name} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
  const initials = (name||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"linear-gradient(135deg,#2563EB,#0F766E)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize, fontWeight:800, color:"#fff", flexShrink:0 }}>
      {initials}
    </div>
  )
}

function DiffBadge({ diff }) {
  const d = DIFF[diff] || DIFF.Medium
  return <span style={{ fontSize:11, fontWeight:700, color:d.color, background:d.bg, padding:"2px 8px", borderRadius:99 }}>{diff}</span>
}

function ScoreRing({ score, size=48 }) {
  const r = (size-8)/2, circ = 2*Math.PI*r, fill=(score/100)*circ, col=scoreColor(score)
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={4}
          strokeDasharray={`${fill} ${circ-fill}`} strokeLinecap="round" />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:12, fontWeight:800, color:col }}>
        {score}
      </div>
    </div>
  )
}

function Card({ children, style={}, accent=null }) {
  return (
    <div style={{
      background:C.surface, borderRadius:20,
      border:`1px solid ${C.border}`,
      boxShadow:C.shadow2,
      padding:"28px 32px",
      position:"relative",
      overflow:"hidden",
      ...(accent ? { borderTop:`2.5px solid ${accent}` } : {}),
      ...style,
    }}>
      {/* subtle inner glow from accent */}
      {accent && <div style={{
        position:"absolute", top:0, left:0, right:0, height:80,
        background:`linear-gradient(180deg, ${accent}08 0%, transparent 100%)`,
        pointerEvents:"none",
      }}/>}
      {children}
    </div>
  )
}

function SectionTitle({ icon, title, sub, accent=C.blue }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
        <div style={{ width:4, height:22, borderRadius:99, background:accent }} />
        <span style={{ fontSize:11, fontWeight:800, color:accent, letterSpacing:2, textTransform:"uppercase" }}>
          {icon} {title}
        </span>
      </div>
      {sub && <p style={{ margin:"4px 0 0 14px", fontSize:13, color:C.ink4, lineHeight:1.5 }}>{sub}</p>}
    </div>
  )
}

function StatChip({ icon, value, label, color=C.blue }) {
  return (
    <div style={{
      textAlign:"center", padding:"18px 22px",
      background:C.surface2,
      borderRadius:16,
      border:`1px solid ${C.border2}`,
      boxShadow:C.shadow,
      minWidth:92,
      position:"relative", overflow:"hidden",
    }}>
      <div style={{
        position:"absolute", inset:0,
        background:`radial-gradient(circle at 50% 0%, ${color}12 0%, transparent 70%)`,
        pointerEvents:"none",
      }}/>
      <div style={{ fontSize:20, marginBottom:5 }}>{icon}</div>
      <div style={{ fontSize:20, fontWeight:900, color, fontFamily:"'JetBrains Mono',monospace", lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:C.ink4, marginTop:5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8 }}>{label}</div>
    </div>
  )
}

function SkillBar({ label, pct, color=C.blue }) {
  const p = Math.min(100, Math.max(0, pct))
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ fontSize:13, fontWeight:600, color:C.ink2 }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:800, color, fontFamily:"monospace" }}>{p}%</span>
      </div>
      <div style={{ height:6, background:C.surface2, borderRadius:99 }}>
        <div style={{
          height:"100%", width:`${p}%`,
          background:`linear-gradient(90deg, ${color}aa, ${color})`,
          borderRadius:99,
          boxShadow:`0 0 8px ${color}44`,
        }} />
      </div>
    </div>
  )
}

function TLine({ icon, title, sub, score, time, meta, last }) {
  return (
    <div style={{ display:"flex", gap:14, position:"relative" }}>
      {!last && <div style={{ position:"absolute", left:19, top:40, bottom:0, width:2, background:C.border2, zIndex:0 }} />}
      <div style={{ width:40, height:40, borderRadius:12, background:C.surface2, border:`1px solid ${C.border2}`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, zIndex:1 }}>
        {icon}
      </div>
      <div style={{ flex:1, paddingBottom: last?0:20, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:14, fontWeight:700, color:C.ink, flex:1 }}>{title}</span>
          {score!=null && <ScoreRing score={score} size={44} />}
        </div>
        {sub && <div style={{ fontSize:13, color:C.ink3, marginTop:4, lineHeight:1.6 }}>{sub}</div>}
        <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:6, flexWrap:"wrap" }}>
          {meta}
          {time && <span style={{ fontSize:11, color:C.ink4 }}>📅 {fmt(time)}</span>}
        </div>
      </div>
    </div>
  )
}

// ── Full-screen detail modal for a completed challenge ───────────────────────
function ChallengeDetailModal({ t, onClose }) {
  const col = scoreColor(t.score)
  // close on backdrop click or Escape
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const answerStr = t.userAnswer
    ? (typeof t.userAnswer === "object" ? JSON.stringify(t.userAnswer, null, 2) : t.userAnswer)
    : null

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans',sans-serif" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:C.bg, border:`1px solid ${C.border2}`, borderRadius:20,
          width:"100%", maxWidth:760, maxHeight:"92vh", overflowY:"auto",
          boxShadow:"0 40px 120px rgba(0,0,0,0.7)", display:"flex", flexDirection:"column" }}
      >
        {/* ── Modal header ── */}
        <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"flex-start", gap:16, flexShrink:0 }}>
          <ScoreRing score={t.score} size={56} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:17, fontWeight:800, color:C.ink, marginBottom:5, lineHeight:1.3 }}>{t.title}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              <DiffBadge diff={t.difficulty} />
              {t.domain && t.domain !== "dsa" && (
                <span style={{ fontSize:11, color:C.teal, fontWeight:700, background:C.teal3, padding:"2px 8px", borderRadius:99 }}>{t.domain}</span>
              )}
              {t.attempts > 1 && (
                <span style={{ fontSize:11, color:C.amber, fontWeight:700, background:C.amber2, padding:"2px 8px", borderRadius:99 }}>🔁 {t.attempts} attempt{t.attempts>1?"s":""}</span>
              )}
              {t.completedAt && <span style={{ fontSize:11, color:C.ink4 }}>📅 {fmtFull(t.completedAt)}</span>}
            </div>
          </div>
          {/* Score + ELO + Close */}
          <div style={{ display:"flex", gap:10, alignItems:"center", flexShrink:0 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:26, fontWeight:900, color:col, fontFamily:"monospace", lineHeight:1 }}>{gradeFor(t.score)}</div>
              <div style={{ fontSize:11, color:col, fontWeight:700, marginTop:1 }}>{t.score}/100</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:900, color:C.blue, fontFamily:"monospace", lineHeight:1 }}>+{t.eloDelta}</div>
              <div style={{ fontSize:9, color:C.ink4, fontWeight:700, letterSpacing:0.5, marginTop:1 }}>ELO</div>
            </div>
            <button onClick={onClose}
              style={{ width:32, height:32, borderRadius:"50%", background:C.surface2, border:`1px solid ${C.border2}`,
                color:C.ink3, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"inherit", marginLeft:4 }}>×</button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:20 }}>

          {/* Scenario */}
          {t.scenario && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:C.teal, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>📋 Challenge Scenario</div>
              <div style={{ fontSize:13, color:C.ink2, lineHeight:1.8, background:C.surface, padding:"14px 18px",
                borderRadius:12, border:`1px solid ${C.border}`, whiteSpace:"pre-wrap" }}>
                {t.scenario}
              </div>
            </div>
          )}

          {/* Objective */}
          {t.objective && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:C.amber, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>🎯 Objective</div>
              <div style={{ fontSize:13, color:C.ink2, lineHeight:1.8, background:C.surface, padding:"14px 18px",
                borderRadius:12, border:`1px solid ${C.border}` }}>
                {t.objective}
              </div>
            </div>
          )}

          {/* Submitted Solution — FULL, no truncation */}
          {answerStr && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:C.blue2, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>
                💻 Submitted Solution <span style={{ fontSize:9, color:C.ink4, fontWeight:600, textTransform:"none", letterSpacing:0 }}>({answerStr.length.toLocaleString()} characters)</span>
              </div>
              <pre style={{ margin:0, fontSize:11.5, color:"#E2E8F0", background:"#0B1120",
                padding:"16px 18px", borderRadius:12, border:`1px solid ${C.border2}`,
                whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily:"'JetBrains Mono','DM Mono',monospace",
                lineHeight:1.65, maxHeight:380, overflowY:"auto" }}>
                {answerStr}
              </pre>
            </div>
          )}

          {/* Expected output (if any) */}
          {t.expectedOutput && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:C.green, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>✅ Expected Output</div>
              <pre style={{ margin:0, fontSize:11.5, color:C.ink2, background:C.green2,
                padding:"14px 18px", borderRadius:12, border:`1px solid rgba(34,197,94,0.2)`,
                whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily:"'JetBrains Mono','DM Mono',monospace",
                lineHeight:1.65, maxHeight:200, overflowY:"auto" }}>
                {t.expectedOutput}
              </pre>
            </div>
          )}

          {/* AI Feedback */}
          {t.feedback && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:C.purple, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>🤖 AI Feedback</div>
              <div style={{ fontSize:13, color:C.ink2, lineHeight:1.8, background:C.purple2,
                padding:"14px 18px", borderRadius:12, border:`1px solid rgba(167,139,250,0.2)`,
                borderLeft:`3px solid ${C.purple}` }}>
                {t.feedback}
              </div>
            </div>
          )}

          {/* Full stats row */}
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:C.ink4, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>📊 Result Summary</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
              {[
                { label:"Score",    value:`${t.score}/100`,  color:col      },
                { label:"Grade",    value:gradeFor(t.score), color:col      },
                { label:"ELO Earned",value:`+${t.eloDelta}`, color:C.blue   },
                { label:"Attempts", value: String(t.attempts||1),  color:C.amber  },
                { label:"Completed",value:fmt(t.completedAt), color:C.ink3  },
              ].filter(s=>s.value).map((s,i)=>(
                <div key={i} style={{ padding:"10px 8px", background:C.surface2, borderRadius:10,
                  border:`1px solid ${C.border}`, textAlign:"center" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:s.color, fontFamily:"monospace" }}>{s.value}</div>
                  <div style={{ fontSize:9, color:C.ink4, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:0.8, marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact challenge card — click "View Details" to open full modal
function ChallengeCard({ t, last }) {
  const [showModal, setShowModal] = useState(false)
  const col = scoreColor(t.score)
  return (
    <div style={{ position:"relative" }}>
      {!last && <div style={{ position:"absolute", left:19, top:52, bottom:0, width:2,
        background:C.border2, zIndex:0 }} />}
      <div style={{ border:`1px solid ${C.border2}`, borderRadius:14, overflow:"hidden",
        background:C.surface2, boxShadow:C.shadow, marginBottom: last?0:16, position:"relative", zIndex:1 }}>

        {/* Header row */}
        <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:12 }}>
          <ScoreRing score={t.score} size={48} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:3 }}>{t.title}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              <DiffBadge diff={t.difficulty} />
              {t.domain && t.domain !== "dsa" && (
                <span style={{ fontSize:11, color:C.teal, fontWeight:700, background:C.teal3,
                  padding:"2px 8px", borderRadius:99 }}>{t.domain}</span>
              )}
              {t.attempts > 1 && (
                <span style={{ fontSize:11, color:C.amber, fontWeight:700, background:C.amber2,
                  padding:"2px 8px", borderRadius:99 }}>🔁 {t.attempts} attempt{t.attempts>1?"s":""}</span>
              )}
              {t.completedAt && <span style={{ fontSize:11, color:C.ink4 }}>📅 {fmt(t.completedAt)}</span>}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <span style={{ fontSize:22, fontWeight:900, color:col, fontFamily:"monospace" }}>{gradeFor(t.score)}</span>
              <span style={{ fontSize:12, color:col, fontWeight:700 }}>{t.score}/100</span>
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:C.blue }}>+{t.eloDelta} ELO</div>
            <button onClick={() => setShowModal(true)}
              style={{ padding:"4px 12px", background:"transparent", border:`1px solid ${C.border2}`,
                borderRadius:6, color:C.ink3, fontSize:10, fontWeight:700, cursor:"pointer",
                fontFamily:"inherit", transition:"all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.color = C.ink }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.ink3 }}>
              View Details →
            </button>
          </div>
        </div>

        {/* Compact preview of scenario */}
        {t.scenario && (
          <div style={{ padding:"0 18px 14px" }}>
            <div style={{ fontSize:11, color:C.ink4, lineHeight:1.6,
              background:C.surface, padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`,
              overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
              {t.scenario}
            </div>
          </div>
        )}
      </div>

      {showModal && <ChallengeDetailModal t={t} onClose={() => setShowModal(false)} />}
    </div>
  )
}

// Interview card with expandable detail
function InterviewCard({ iv }) {
  const [open, setOpen] = useState(false)
  const score = iv.overall_score || 0
  return (
    <div style={{ border:`1px solid ${C.border2}`, borderRadius:14, overflow:"hidden", background:C.surface2, boxShadow:C.shadow }}>
      <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer" }}
        onClick={() => setOpen(o=>!o)}>
        <ScoreRing score={score} size={52} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:3 }}>
            {iv.role_target || iv.domain || "Interview Session"}
          </div>
          <div style={{ fontSize:12, color:C.ink3 }}>
            {iv.interview_mode && <span style={{ marginRight:8 }}>{iv.interview_mode}</span>}
            {iv.total_questions && <span>{iv.answered_count||0}/{iv.total_questions} Qs</span>}
            {iv.duration_mins && <span style={{ marginLeft:8 }}>· {iv.duration_mins} min</span>}
          </div>
          <div style={{ fontSize:11, color:C.ink4, marginTop:2 }}>📅 {fmtFull(iv.completed_at||iv.started_at)}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:22, fontWeight:900, color:scoreColor(score), fontFamily:"monospace" }}>{gradeFor(score)}</div>
          <div style={{ fontSize:11, color:C.ink4 }}>{open?"▲ Hide":"▼ View"}</div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop:`1px solid ${C.border2}`, padding:"18px 20px", background:C.bg }}>
          {iv.strengths?.length>0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.green, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>✓ Strengths</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {iv.strengths.map((s,i)=><span key={i} style={{ fontSize:12, color:C.green, background:C.green2, padding:"3px 10px", borderRadius:99 }}>{s}</span>)}
              </div>
            </div>
          )}
          {iv.improvements?.length>0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.amber, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>△ To Improve</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {iv.improvements.map((s,i)=><span key={i} style={{ fontSize:12, color:C.amber, background:C.amber2, padding:"3px 10px", borderRadius:99 }}>{s}</span>)}
              </div>
            </div>
          )}
          {iv.insights && (
            <div style={{ fontSize:13, color:C.ink2, lineHeight:1.7, background:C.blue3, padding:"12px 14px", borderRadius:10, borderLeft:`3px solid ${C.blue}` }}>
              {iv.insights}
            </div>
          )}
          {iv.skill_scores && Object.keys(iv.skill_scores).length>0 && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.ink3, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Skill Scores</div>
              {Object.entries(iv.skill_scores).map(([sk,v])=>(
                <SkillBar key={sk} label={sk} pct={typeof v==="number"?v:(v.score||0)} color={C.purple} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────
function ActivityHeatmap({ tasks, streak }) {
  const DAYS = 91
  const today = new Date(); today.setHours(0,0,0,0)
  const countMap = {}
  tasks.forEach(t => {
    if(!t.completedAt) return
    const d = new Date(t.completedAt); d.setHours(0,0,0,0)
    const key = d.toISOString().slice(0,10)
    countMap[key] = (countMap[key]||0) + 1
  })
  const cells = []
  for(let i=DAYS-1; i>=0; i--) {
    const d = new Date(today); d.setDate(today.getDate()-i)
    const key = d.toISOString().slice(0,10)
    cells.push({ date:key, count:countMap[key]||0, dayOfWeek:d.getDay() })
  }
  const firstDay = cells[0]?.dayOfWeek || 0
  const padded   = [...Array(firstDay).fill(null), ...cells]
  const cols     = Math.ceil(padded.length/7)
  const today0   = today.toISOString().slice(0,10)

  // Streak calculations from actual data
  let cs=0
  for(let i=cells.length-1; i>=0; i--) { if(cells[i].count>0) cs++; else break }
  let bs=0, cur=0
  cells.forEach(c => { if(c.count>0){cur++;bs=Math.max(bs,cur)}else cur=0 })
  const currentStreak  = cs||streak||0
  const bestStreak     = bs
  const activeDays     = cells.filter(c=>c.count>0).length
  const consistency    = Math.round((activeDays/DAYS)*100)
  const totalChallenges= cells.reduce((s,c)=>s+c.count,0)

  const cellColor = n => n===0?C.border:n===1?"#BFDBFE":n===2?"#60A5FA":"#2563EB"

  // Month labels
  const months=[], seen=new Set()
  cells.forEach((c,i) => {
    const m=new Date(c.date).getMonth()
    if(!seen.has(m)){ seen.add(m); months.push({label:new Date(c.date).toLocaleString("en-IN",{month:"short"}),col:Math.floor((firstDay+i)/7)}) }
  })

  return (
    <div>
      {/* Stats */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        {[
          {icon:"🔥",label:"Current Streak",value:`${currentStreak}d`,color:C.amber},
          {icon:"🏆",label:"Best Streak",   value:`${bestStreak}d`,  color:C.blue},
          {icon:"📅",label:"Active Days",   value:`${activeDays}/90`,color:C.teal},
          {icon:"📊",label:"Consistency",   value:`${consistency}%`, color:consistency>=70?C.green:consistency>=40?C.amber:C.red},
          {icon:"✅",label:"Solved (90d)",  value:totalChallenges,   color:C.ink2},
        ].map((s,i)=>(
          <div key={i} style={{padding:"10px 14px",background:C.surface,borderRadius:12,
            border:`1px solid ${C.border}`,boxShadow:C.shadow,textAlign:"center",minWidth:75}}>
            <div style={{fontSize:16,marginBottom:2}}>{s.icon}</div>
            <div style={{fontSize:17,fontWeight:900,color:s.color,fontFamily:"monospace",lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:10,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.7,marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{overflowX:"auto"}}>
        <div style={{display:"inline-block"}}>
          {/* Month labels */}
          <div style={{display:"flex",marginBottom:4,paddingLeft:24}}>
            {Array.from({length:cols},(_,ci)=>{
              const ml=months.find(m=>m.col===ci)
              return <div key={ci} style={{width:13,marginRight:3,fontSize:9,color:C.ink4,fontWeight:600,whiteSpace:"nowrap"}}>{ml?.label||""}</div>
            })}
          </div>
          <div style={{display:"flex",gap:0}}>
            {/* Day labels */}
            <div style={{display:"flex",flexDirection:"column",gap:3,marginRight:6}}>
              {["","M","","W","","F",""].map((d,i)=>(
                <div key={i} style={{height:13,fontSize:9,color:C.ink4,lineHeight:"13px",width:16,textAlign:"right"}}>{d}</div>
              ))}
            </div>
            {/* Cells */}
            {Array.from({length:cols},(_,ci)=>(
              <div key={ci} style={{display:"flex",flexDirection:"column",gap:3,marginRight:3}}>
                {Array.from({length:7},(_,ri)=>{
                  const cell=padded[ci*7+ri]
                  if(!cell) return <div key={ri} style={{width:13,height:13}}/>
                  return (
                    <div key={ri}
                      title={`${cell.date}: ${cell.count} challenge${cell.count!==1?"s":""}`}
                      style={{width:13,height:13,borderRadius:3,background:cellColor(cell.count),
                        border:cell.date===today0?`1.5px solid ${C.blue}`:"none",
                        cursor:cell.count>0?"pointer":"default",transition:"transform 0.1s"}}
                      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.4)"}
                      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                    />
                  )
                })}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div style={{display:"flex",alignItems:"center",gap:4,marginTop:8,justifyContent:"flex-end"}}>
            <span style={{fontSize:10,color:C.ink4,marginRight:2}}>Less</span>
            {[0,1,2,3].map(n=><div key={n} style={{width:12,height:12,borderRadius:2,background:cellColor(n)}}/>)}
            <span style={{fontSize:10,color:C.ink4,marginLeft:2}}>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Performance Summary ──────────────────────────────────────────────────────
function PerformanceSummary({ ud, skills, tasks, interviews, accent }) {
  const tier      = getTier(ud.eloRating)
  const avgScore  = tasks.length ? Math.round(tasks.reduce((s,t)=>s+t.score,0)/tasks.length) : 0
  const best      = tasks.reduce((b,t)=>t.score>b?t.score:b,0)
  const hardCount = tasks.filter(t=>t.difficulty==="Hard"||t.difficulty==="Expert").length
  const passCount = tasks.filter(t=>t.score>=80).length
  const passRate  = tasks.length ? Math.round((passCount/tasks.length)*100) : 0
  const avgIv     = interviews.length ? Math.round(interviews.reduce((s,iv)=>s+(iv.overall_score||0),0)/interviews.length) : 0
  const topSkill  = skills[0]
  const tierNext  = ELO_TIERS.find(t=>t.min>ud.eloRating)
  const tierProg  = tierNext ? Math.round(((ud.eloRating-tier.min)/(tierNext.min-tier.min))*100) : 100

  return (
    <Card accent={accent||C.blue}>
      <SectionTitle icon="📊" title="Performance Summary" accent={accent||C.blue}
        sub="ELO rating, challenge scores, and growth trajectory"/>

      {/* Score metrics — large dark metric cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[
          {icon:"⚡",label:"ELO Rating", value:ud.eloRating,sub:tier.label,     color:tier.color,  bar:Math.min((ud.eloRating/1500)*100,100)},
          {icon:"🎯",label:"Avg Score",  value:`${avgScore}/100`,sub:`${passRate}% pass rate`,color:scoreColor(avgScore),bar:avgScore},
          {icon:"🏆",label:"Best Score", value:best>0?`${best}/100`:"–",sub:best>=90?"Excellent":best>=80?"Strong":best>=60?"Good":"No data",color:scoreColor(best),bar:best},
        ].map((m,i)=>(
          <div key={i} style={{
            padding:"18px 14px",background:C.surface2,borderRadius:14,
            border:`1px solid ${C.border2}`,textAlign:"center",
            position:"relative",overflow:"hidden",
          }}>
            <div style={{
              position:"absolute",inset:0,
              background:`radial-gradient(circle at 50% 0%, ${m.color}10 0%, transparent 70%)`,
              pointerEvents:"none",
            }}/>
            <div style={{fontSize:20,marginBottom:6}}>{m.icon}</div>
            <div style={{fontSize:22,fontWeight:900,color:m.color,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{m.value}</div>
            <div style={{fontSize:11,color:C.ink4,marginTop:4,fontWeight:500}}>{m.sub}</div>
            <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:99,marginTop:10}}>
              <div style={{height:"100%",width:`${m.bar}%`,background:m.color,borderRadius:99,boxShadow:`0 0 6px ${m.color}66`}}/>
            </div>
            <div style={{fontSize:9,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginTop:5}}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Highlight chips */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
        {[
          hardCount>0&&{icon:"💪",text:`${hardCount} Hard/Expert solved`,color:C.red},
          tasks.length>0&&{icon:"✅",text:`${tasks.length} challenges total`,color:C.green},
          topSkill&&{icon:"🧠",text:`Top: ${topSkill.skill} ${topSkill.percentage}%`,color:C.teal},
          interviews.length>0&&{icon:"🎤",text:`${interviews.length} interviews · avg ${avgIv}/100`,color:C.purple},
          ud.arenaStreak>0&&{icon:"🔥",text:`${ud.arenaStreak}-day streak`,color:C.amber},
        ].filter(Boolean).map((h,i)=>(
          <div key={i} style={{
            display:"flex",alignItems:"center",gap:7,padding:"7px 14px",
            background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:99,
          }}>
            <span style={{fontSize:13}}>{h.icon}</span>
            <span style={{fontSize:12,color:C.ink2,fontWeight:500}}>{h.text}</span>
          </div>
        ))}
      </div>

      {/* ELO progress to next tier */}
      {tierNext && (
        <div style={{padding:"16px 18px",background:C.surface2,borderRadius:14,border:`1px solid ${C.border2}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,color:tier.color}}>● {tier.label} · {ud.eloRating}</span>
            <span style={{fontSize:12,color:C.ink4}}>{tierNext.min-ud.eloRating} ELO to <strong style={{color:tierNext.color}}>{tierNext.label}</strong></span>
          </div>
          <div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${tierProg}%`,
              background:`linear-gradient(90deg,${tier.color},${tierNext.color})`,
              borderRadius:99,transition:"width 1.2s ease",
              boxShadow:`0 0 10px ${tier.color}55`}}/>
          </div>
          <div style={{fontSize:11,color:C.ink4,marginTop:6,textAlign:"center"}}>{tierProg}% progress to {tierNext.label}</div>
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export default function Portfolio({ username: usernameProp }) {
  // Accept username as prop (from App.jsx router) or derive from URL path
  const username = usernameProp || window.location.pathname.replace("/portfolio/","").split("/")[0]

  const [pd,          setPd]          = useState(null)
  const [interviews,  setInterviews]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState("")
  const [summary,     setSummary]     = useState("")
  const [scrolled,    setScrolled]    = useState(false)
  const [currentUid,  setCurrentUid]  = useState(null)

  const refs = { overview:useRef(), summary:useRef(), activity:useRef(), skills:useRef(), challenges:useRef(), interviews:useRef(), experience:useRef() }

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      if(data?.session?.user?.id) setCurrentUid(data.session.user.id)
    })
    const onScroll=()=>setScrolled(window.scrollY>70)
    window.addEventListener("scroll",onScroll)
    return ()=>window.removeEventListener("scroll",onScroll)
  },[])

  useEffect(()=>{ if(username) load() },[username])

  // PDF export
  useEffect(()=>{
    const p=new URLSearchParams(window.location.search)
    if(p.get("pdf")==="1"&&!loading) { const t=setTimeout(()=>window.print(),1200); return ()=>clearTimeout(t) }
  },[loading])

  function buildProfessionalSummary(ud, skills, tasks) {
    const tier      = getTier(ud.eloRating)
    const avgScore  = tasks.length ? Math.round(tasks.reduce((s,t)=>s+t.score,0)/tasks.length) : 0
    const hardCount = tasks.filter(t=>t.difficulty==="Hard"||t.difficulty==="Expert").length
    const topSkills = skills.slice(0,3).map(s=>s.skill).join(", ")
    const name      = ud.displayName !== "Anonymous" ? ud.displayName : "This professional"
    const domain    = ud.keyword || "technology"
    const pathLabel = ud.path === "authority" ? "expert" : ud.path || "professional"

    // Sentence 1 — identity + tier
    let s1 = `${name} is a ${tier.label.toLowerCase()} ${pathLabel} in ${domain} with an ELO rating of ${ud.eloRating}, placing them in the ${tier.label} tier on Capabilio.`

    // Sentence 2 — performance record
    if(tasks.length === 0) {
      s1 = `${name} is a ${pathLabel} in ${domain} who has joined Capabilio to build and validate their technical skills.`
      return `${s1} Their Arena journey is just beginning — check back as they complete challenges and grow their rating.`
    }
    const hardStr = hardCount > 0 ? `, including ${hardCount} Hard or Expert-level challenge${hardCount>1?"s":""}` : ""
    const s2 = `They have completed ${tasks.length} Arena challenge${tasks.length>1?"s":""}${hardStr} with an average score of ${avgScore}/100.`

    // Sentence 3 — skills + streak
    const skillStr = topSkills ? `Their strongest areas include ${topSkills}.` : ""
    const streakStr = ud.arenaStreak >= 3 ? ` Maintaining a ${ud.arenaStreak}-day streak demonstrates consistent daily practice.` : ""
    const s3 = (skillStr + streakStr).trim() || `They are actively building expertise through structured, performance-tracked challenges.`

    return `${s1} ${s2} ${s3}`
  }

  // Legacy stub — kept so any stale references don't crash (unused)
  async function genSummary(ud, skills, tasks) {
    // replaced by buildProfessionalSummary — no-op
    void ud; void skills; void tasks
  }

  async function load() {
    setLoading(true); setError("")
    try {
      const raw   = username.trim()
      const lower = raw.toLowerCase()
      const mkSlug = s => (s||"").toLowerCase().trim()
        .replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)

      let row = null

      // Fetch auth session once upfront — used for name fallback and ownership check
      const { data:{ session: authSession } } = await supabase.auth.getSession()
      const authMeta = authSession?.user?.user_metadata || {}

      // 0. UUID in URL — direct ID lookup (most reliable, used when no username set)
      if(isUUID) {
        const {data:byId} = await supabase.from("profiles").select("*").eq("id", raw).maybeSingle()
        if(byId) row = byId
      }

      // 1. Exact username column match
      if(!row) {
        const {data:byUser} = await supabase.from("profiles").select("*")
          .eq("username", lower).maybeSingle()
        if(byUser) row = byUser
      }

      // 2. display_name slug match  ("venkata-kopuri" → search "venkata kopuri")
      if(!row) {
        const nameQuery = lower.replace(/-/g," ")
        const {data:byName,error:nameErr} = await supabase.from("profiles").select("*")
          .ilike("display_name", `%${nameQuery}%`).limit(20)
        if(!nameErr && byName?.length) {
          row = byName.find(p => mkSlug(p.display_name||"") === lower)
               || (byName.length === 1 ? byName[0] : null)
        }
      }

      // 3. Also try each word individually (handles partial name matches)
      if(!row) {
        const words = lower.split("-").filter(w => w.length > 2)
        for(const word of words) {
          const {data:w} = await supabase.from("profiles").select("*")
            .ilike("display_name", `%${word}%`).limit(30)
          if(w?.length) {
            const match = w.find(p => mkSlug(p.display_name||"") === lower)
            if(match) { row = match; break }
          }
        }
      }

      // 4. Auth session fallback — covers camelCase-only profiles
      if(!row && authSession?.user?.id) {
        const {data:bySession} = await supabase.from("profiles").select("*")
          .eq("id", authSession.user.id).maybeSingle()
        if(bySession) {
          const allNames = [
            bySession.display_name, bySession.displayName,
            bySession.username, bySession.name,
            authMeta.full_name, authMeta.name, authMeta.display_name,
          ].filter(Boolean)
          const slugs = allNames.map(mkSlug)
          const firstWord = lower.split("-")[0]
          const nameMatch = slugs.some(s => s === lower)
            || allNames.some(n => (n||"").toLowerCase().startsWith(firstWord))
          if(nameMatch || lower === authSession.user.id) row = bySession
        }
      }

      // 5. Last resort — session user's own portfolio
      if(!row && authSession?.user?.id) {
        const {data:mine} = await supabase.from("profiles").select("*")
          .eq("id", authSession.user.id).maybeSingle()
        if(mine) {
          const email = mine.email || authSession.user.email || ""
          const emailUser = mkSlug(email.split("@")[0])
          const possibleSlugs = [
            mkSlug(mine.display_name||""), mkSlug(mine.displayName||""),
            mkSlug(mine.username||""), emailUser, mine.id,
            mkSlug(authMeta.full_name||""), mkSlug(authMeta.name||""),
          ].filter(Boolean)
          if(possibleSlugs.some(s => lower.includes(s.slice(0,5)) || s.includes(lower.slice(0,5)))) {
            row = mine
          }
        }
      }

      if(!row) {
        setError("Portfolio not found.")
        setLoading(false)
        return
      }

      const ud={
        uid:           row.id,
        displayName:   row.display_name   ||row.displayName    ||row.full_name||row.name
                     ||authMeta.full_name||authMeta.name      ||authSession?.user?.email?.split("@")[0]
                     ||"Anonymous",
        email:         row.email          ||"",
        username:      row.username       ||"",
        path:          row.path           ||"student",
        keyword:       row.keyword        ||"",
        // Prefer snake_case (Supabase Arena writes) then camelCase (onboarding writes)
        eloRating:     row.elo_rating     ??row.eloRating      ??400,
        arenaStreak:   row.arena_streak   ??row.arenaStreak    ??0,
        arenaCompleted:row.arena_completed??row.arenaCompleted  ??0,
        jobReadiness:  row.job_readiness  ??row.jobReadiness   ??0,
        skillGraph:    row.skill_graph    ||row.skillGraph     ||[],
        strengths:     row.strengths      ||[],
        weakAreas:     row.weak_areas     ||row.weakAreas      ||[],
        profileSummary:row.profile_summary||row.profileSummary ||"",
        experiences:   row.experiences   ||[],
        resumeProjects:row.resumeProjects||row.resume_projects ||[],
        education:     row.education     ||[],
        githubUsername:row.githubUsername||row.github_username ||"",
        linkedInUrl:   row.linkedInUrl   ||row.linkedin_url    ||"",
        githubUrl:     row.githubUrl     ||row.github_url      ||"",
        avatarUrl:     row.profilePhotoURL||row.profile_photo_url||row.avatarUrl||"",
        createdAt:     row.createdAt     ||row.created_at      ||"",
      }

      const skills=(ud.skillGraph)
        .filter(s=>{const l=s.label||s.skill||"";return l&&l!=="undefined"&&l.trim()})
        .map(s=>({skill:s.label||s.skill||"Skill",percentage:s.value??s.percentage??s.score??0}))
        .filter(s=>s.percentage>0).sort((a,b)=>b.percentage-a.percentage).slice(0,12)

      let tasks=[]
      try{
        const{data:h}=await supabase.from("arena_history").select("*").eq("user_id",row.id)
          .order("completed_at",{ascending:false}).limit(200)
        // Group by task_id to count attempts
        const attemptMap = {}
        h.forEach(r => {
          const key = r.task_id || r.title || r.id
          attemptMap[key] = (attemptMap[key] || 0) + 1
        })
        // Only keep latest attempt per challenge (first in desc order = latest)
        const seen = new Set()
        tasks = h.filter(r => {
          const key = r.task_id || r.title || r.id
          if(seen.has(key)) return false
          seen.add(key); return true
        }).map((r,i)=>({
          id:             r.task_id||String(i),
          title:          r.title||"Arena Challenge",
          difficulty:     r.difficulty||"Medium",
          domain:         r.domain||r.type||"dsa",
          type:           r.type||r.domain||"dsa",
          score:          r.score??0,
          eloDelta:       r.elo_delta??0,
          feedback:       r.feedback||"",
          scenario:       r.scenario||"",
          objective:      r.objective||"",
          expectedOutput: r.expected_output||"",
          userAnswer:     r.user_answer||"",
          completedAt:    r.completed_at||"",
          attempts:       attemptMap[r.task_id||r.title||r.id] || 1,
        }))
      } catch {}

      let ivs=[]
      try{
        const{data:iv}=await supabase.from("ai_interview_sessions").select("*")
          .eq("user_id",row.id).eq("status","completed")
          .order("completed_at",{ascending:false}).limit(20)
        if(iv?.length) ivs=iv
      } catch {}

      setPd({ud,skills,tasks})
      setInterviews(ivs)
      // Always generate a deterministic LinkedIn-style summary — no API dependency
      const autoSummary = buildProfessionalSummary(ud, skills, tasks)
      setSummary(ud.profileSummary || autoSummary)
    } catch(e){
      console.error("Portfolio error:",e)
      setError("Failed to load portfolio.")
    }
    setLoading(false)
  }

  const scrollTo=(k)=>refs[k]?.current?.scrollIntoView({behavior:"smooth",block:"start"})

  // ─── Loading ──────────────────────────────────────────────────────────────
  if(loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');body{background:${C.bg}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:48,height:48,border:`3px solid ${C.border2}`,borderTopColor:C.blue,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
      <p style={{color:C.ink4,fontSize:14,margin:0,fontWeight:500}}>Loading portfolio…</p>
    </div>
  )

  if(error||!pd) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
      <style>{`body{background:${C.bg}}`}</style>
      <div style={{fontSize:52}}>🔒</div>
      <p style={{color:C.red,fontSize:16,fontWeight:700,margin:0}}>{error||"Portfolio not found"}</p>
      <p style={{color:C.ink4,fontSize:13,margin:0}}>This profile may be private or the username doesn't exist.</p>
    </div>
  )

  const {ud,skills,tasks}=pd
  const pc    = PATH_CONFIG[ud.path]||PATH_CONFIG.student
  const tier  = getTier(ud.eloRating)
  const isOwner = !!(ud.uid&&currentUid&&currentUid===ud.uid)
  const isPro   = ud.path==="professional"||ud.path==="authority"

  // ── Archetype detection ────────────────────────────────────────────────────
  const { archetype, seniority, config: aConfig } = getPortfolioConfig(ud)

  // Archetype-aware hero background — override PATH_CONFIG heroBg
  const heroBg = aConfig?.palette?.hero || pc.heroBg

  // Role-specific recruiter summary (only if no custom profileSummary)
  const archetypeSummary = (aConfig && tasks.length > 0)
    ? aConfig.recruiterSummary(ud, tier, tasks.length)
    : null

  // challenge_type: "dsa"/"common" = algorithm/DSA challenge, "domain" = role-specific
  const isCommonTask = t => {
    const ct = (t.challenge_type || "").toLowerCase()
    if (ct === "dsa" || ct === "common" || ct === "common_challenge") return true
    if (ct === "domain") return false
    return ["dsa","algorithm","common_challenge"].includes((t.domain||"").toLowerCase())
  }
  const commonTasks = tasks.filter(isCommonTask)
  const domainTasks = tasks.filter(t => !isCommonTask(t))

  const radarData = skills.slice(0,8).map(s=>({
    subject:s.skill.length>10?s.skill.slice(0,10)+"…":s.skill,
    score:s.percentage, fullMark:100,
  }))

  const avgScore = tasks.length ? Math.round(tasks.reduce((s,t)=>s+t.score,0)/tasks.length) : 0

  return (
    <div style={{fontFamily:"Inter,system-ui,sans-serif",background:C.bg,minHeight:"100vh",color:C.ink}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
        *{box-sizing:border-box}
        body{background:${C.bg}}
        ::selection{background:rgba(59,130,246,0.35)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .ps{animation:fadeUp 0.5s ease both}
        @media print{.np{display:none!important}}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.border2};border-radius:99px}
      `}</style>

      {/* ── Sticky nav ─────────────────────────────────────────────────────── */}
      <nav className="np" style={{
        position:"sticky",top:0,zIndex:100,
        background:scrolled?"rgba(10,15,30,0.92)":"transparent",
        backdropFilter:scrolled?"blur(20px)":"none",
        borderBottom:scrolled?`1px solid ${C.border}`:"none",
        transition:"all 0.3s",
        padding:scrolled?"10px 32px":"14px 32px",
        display:"flex",alignItems:"center",gap:16,
      }}>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:10}}>
          {scrolled&&<><Avatar name={ud.displayName} url={ud.avatarUrl} size={30} fontSize={11}/><span style={{fontSize:14,fontWeight:700,color:C.ink}}>{ud.displayName}</span></>}
        </div>
        <div style={{display:"flex",gap:4}}>
          {[
            {k:"overview",   l:"Overview"},
            {k:"summary",    l:"Summary"},
            tasks.length>0&&{k:"activity",   l:"Activity"},
            skills.length>0&&{k:"skills",    l:"Skills"},
            tasks.length>0&&{k:"challenges", l:"Challenges"},
            interviews.length>0&&{k:"interviews",l:"Interviews"},
            (isPro&&(ud.experiences?.length>0||ud.resumeProjects?.length>0))&&{k:"experience",l:"Experience"},
          ].filter(Boolean).map(({k,l})=>(
            <button key={k} onClick={()=>scrollTo(k)}
              style={{padding:"6px 14px",borderRadius:99,border:"none",background:"transparent",
                color:C.ink3,fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {l}
            </button>
          ))}
        </div>
        {isOwner&&(
          <button onClick={()=>window.print()} className="np"
            style={{padding:"7px 16px",borderRadius:99,border:`1px solid ${C.border2}`,
              background:C.surface2,color:C.ink3,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            ⬇ PDF
          </button>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div ref={refs.overview}>
        {/* ── CINEMATIC HERO ──────────────────────────────────────────────── */}
        <div style={{background:heroBg,padding:"72px 32px 80px",position:"relative",overflow:"hidden",minHeight:380}}>
          {/* Mesh dot pattern */}
          <div style={{position:"absolute",inset:0,opacity:0.06,
            backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"24px 24px"}}/>
          {/* Large background glow using archetype accent */}
          <div style={{
            position:"absolute",top:-200,right:-200,width:600,height:600,
            background:aConfig?.palette?.accent||"rgba(255,255,255,0.05)",
            borderRadius:"50%",filter:"blur(100px)",opacity:0.18,
          }}/>
          <div style={{
            position:"absolute",bottom:-100,left:-100,width:400,height:400,
            background:"rgba(255,255,255,0.03)",
            borderRadius:"50%",filter:"blur(80px)",
          }}/>

          <div style={{position:"relative",maxWidth:900,margin:"0 auto"}}>

            {/* Top: archetype tagline — the lead copy */}
            {aConfig?.heroTagline&&(
              <div style={{
                display:"inline-flex",alignItems:"center",gap:8,
                marginBottom:24,
                background:"rgba(255,255,255,0.05)",
                backdropFilter:"blur(12px)",
                padding:"6px 18px",borderRadius:99,
                border:"1px solid rgba(255,255,255,0.12)",
              }}>
                <span style={{fontSize:13}}>{aConfig.icon}</span>
                <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.8)",letterSpacing:0.4,fontStyle:"italic"}}>
                  {aConfig.heroTagline}
                </span>
              </div>
            )}

            <div style={{display:"flex",gap:32,alignItems:"flex-start",flexWrap:"wrap"}}>
              {/* Avatar — larger, with glowing ring */}
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{
                  width:120,height:120,borderRadius:"50%",padding:3,
                  background:`linear-gradient(135deg, ${aConfig?.palette?.accent||"#3B82F6"}, rgba(255,255,255,0.2))`,
                  boxShadow:`0 0 40px ${aConfig?.palette?.accent||"#3B82F6"}55`,
                }}>
                  <Avatar name={ud.displayName} url={ud.avatarUrl} size={114} fontSize={36}/>
                </div>
                <div style={{
                  position:"absolute",bottom:4,right:4,
                  background:tier.color,color:"#fff",fontSize:9,fontWeight:900,
                  padding:"3px 8px",borderRadius:99,
                  border:"2px solid rgba(0,0,0,0.4)",
                  whiteSpace:"nowrap",letterSpacing:0.5,textTransform:"uppercase",
                }}>
                  {tier.label}
                </div>
              </div>

              {/* Identity block */}
              <div style={{flex:1,minWidth:240}}>
                <h1 style={{
                  fontSize:52,fontWeight:900,color:"#fff",margin:"0 0 8px",
                  letterSpacing:"-0.04em",lineHeight:1.0,
                  textShadow:"0 2px 20px rgba(0,0,0,0.4)",
                }}>
                  {ud.displayName}
                </h1>
                {ud.keyword&&(
                  <p style={{
                    fontSize:17,color:"rgba(255,255,255,0.65)",
                    margin:"0 0 16px",fontWeight:500,letterSpacing:0.2,
                  }}>
                    {ud.keyword}
                    {aConfig&&(
                      <span style={{
                        marginLeft:10,fontSize:12,fontWeight:700,
                        color:aConfig.palette.accent,
                        background:`${aConfig.palette.accent}20`,
                        padding:"2px 10px",borderRadius:99,
                        border:`1px solid ${aConfig.palette.accent}40`,
                      }}>
                        {aConfig.name}
                      </span>
                    )}
                  </p>
                )}

                {/* Summary text */}
                <p style={{
                  fontSize:14,color:"rgba(255,255,255,0.55)",
                  lineHeight:1.8,maxWidth:540,margin:"0 0 24px",
                }}>
                  {summary||archetypeSummary||`${pc.label} building career on Capabilio.`}
                </p>

                {/* Action links + ELO pill */}
                <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                  {ud.linkedInUrl&&(
                    <a href={ud.linkedInUrl} target="_blank" rel="noreferrer"
                      style={{
                        display:"inline-flex",alignItems:"center",gap:6,
                        padding:"9px 18px",borderRadius:99,
                        background:"rgba(255,255,255,0.08)",
                        border:"1px solid rgba(255,255,255,0.18)",
                        color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none",
                        backdropFilter:"blur(8px)",
                        transition:"background 0.2s",
                      }}>
                      in LinkedIn ↗
                    </a>
                  )}
                  {(ud.githubUrl||ud.githubUsername)&&(
                    <a href={ud.githubUrl||`https://github.com/${ud.githubUsername}`} target="_blank" rel="noreferrer"
                      style={{
                        display:"inline-flex",alignItems:"center",gap:6,
                        padding:"9px 18px",borderRadius:99,
                        background:"rgba(255,255,255,0.08)",
                        border:"1px solid rgba(255,255,255,0.18)",
                        color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none",
                        backdropFilter:"blur(8px)",
                      }}>
                      ⌥ GitHub ↗
                    </a>
                  )}
                  {/* ELO pill — styled with tier color */}
                  <div style={{
                    display:"inline-flex",alignItems:"center",gap:7,
                    padding:"9px 18px",borderRadius:99,
                    background:`${tier.color}22`,
                    border:`1px solid ${tier.color}55`,
                    color:tier.color,fontSize:13,fontWeight:800,
                  }}>
                    ⚡ {ud.eloRating} ELO · {tier.label}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── STATS BAR ───────────────────────────────────────────────────── */}
        <div style={{
          background:`linear-gradient(180deg, ${C.bg} 0%, ${C.surface} 100%)`,
          borderBottom:`1px solid ${C.border}`,
          padding:"24px 32px",
        }}>
          <div style={{maxWidth:900,margin:"0 auto",display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
            <StatChip icon="⚡" value={ud.eloRating} label="ELO Score" color={tier.color}/>
            <StatChip icon="✅" value={tasks.length} label="Challenges" color={C.green}/>
            <StatChip icon="🔥" value={ud.arenaStreak||0} label="Day Streak" color={C.amber}/>
            {interviews.length>0&&<StatChip icon="🎤" value={interviews.length} label="Interviews" color={C.purple}/>}
            {skills.length>0&&<StatChip icon="🧠" value={`${Math.round(skills.reduce((s,k)=>s+k.percentage,0)/skills.length)}%`} label="Avg Skill" color={C.teal}/>}
            {avgScore>0&&<StatChip icon="📊" value={`${avgScore}`} label="Avg Score" color={aConfig?.palette?.accent||C.blue}/>}
            {ud.jobReadiness>0&&<StatChip icon="🚀" value={`${ud.jobReadiness}%`} label="Job Ready" color={C.blue2}/>}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div style={{maxWidth:900,margin:"36px auto",padding:"0 24px 80px",display:"flex",flexDirection:"column",gap:24}}>

        {/* ══ ARCHETYPE ROLE CONTEXT BANNER ══════════════════════════════════ */}
        {aConfig&&(
          <div className="ps" style={{
            background:`linear-gradient(135deg, ${C.surface} 0%, ${C.surface2} 100%)`,
            borderRadius:20,
            border:`1px solid ${C.border}`,
            borderLeft:`4px solid ${aConfig.palette.accent}`,
            boxShadow:C.shadow2,
            overflow:"hidden",
            position:"relative",
          }}>
            {/* Accent glow */}
            <div style={{
              position:"absolute", top:0, left:0, width:300, height:"100%",
              background:`linear-gradient(90deg, ${aConfig.palette.accent}0a 0%, transparent 100%)`,
              pointerEvents:"none",
            }}/>
            <div style={{
              padding:"24px 28px",
              display:"flex", alignItems:"stretch", gap:0, flexWrap:"wrap",
              position:"relative",
            }}>
              {/* Left: Archetype identity */}
              <div style={{display:"flex",alignItems:"center",gap:18,flex:1,minWidth:260,paddingRight:28,borderRight:`1px solid ${C.border}`}}>
                <div style={{
                  width:56, height:56, borderRadius:16,
                  background:`${aConfig.palette.accent}18`,
                  border:`1px solid ${aConfig.palette.accent}30`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:26, flexShrink:0,
                }}>
                  {aConfig.icon}
                </div>
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:aConfig.palette.accent,textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>
                    Portfolio Archetype
                  </div>
                  <div style={{fontSize:18,fontWeight:800,color:C.ink,lineHeight:1.1,marginBottom:4}}>
                    {aConfig.name}
                  </div>
                  <div style={{fontSize:12,color:C.ink4,fontStyle:"italic",lineHeight:1.5}}>
                    {aConfig.tagline}
                  </div>
                </div>
              </div>
              {/* Right: Proof signal chips */}
              <div style={{
                flex:1, minWidth:240,
                paddingLeft:28,
                display:"flex", flexDirection:"column", justifyContent:"center", gap:10,
              }}>
                <div style={{fontSize:10,fontWeight:700,color:C.ink4,textTransform:"uppercase",letterSpacing:1.5}}>
                  Key Proof Signals
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {aConfig.proofElements.slice(0,4).map((pe,i)=>(
                    <div key={i} style={{
                      padding:"5px 13px",
                      background:C.surface2,
                      border:`1px solid ${C.border2}`,
                      borderRadius:99,
                      fontSize:11, fontWeight:600,
                      color:i===0?aConfig.palette.accent:C.ink3,
                    }}>
                      {pe.replace(/_/g," ")}
                    </div>
                  ))}
                </div>
                {/* Seniority indicator */}
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:C.ink4}}>Seniority:</span>
                  <span style={{
                    fontSize:11,fontWeight:800,
                    color:seniority==="senior"?C.purple:seniority==="mid"?C.blue:C.amber,
                    textTransform:"capitalize",
                  }}>
                    {seniority} level
                  </span>
                  <span style={{fontSize:11,color:C.ink4}}>·</span>
                  <span style={{fontSize:11,color:C.ink3}}>ELO {ud.eloRating} · {tier.label}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ PERFORMANCE SUMMARY ═════════════════════════════════════════════ */}
        <div ref={refs.summary} className="ps">
          <PerformanceSummary
            ud={ud} skills={skills} tasks={tasks}
            interviews={interviews}
            accent={aConfig?.palette?.accent}
          />
        </div>

        {/* ══ ACTIVITY HEATMAP ════════════════════════════════════════════════ */}
        {tasks.length>0&&(
          <div ref={refs.activity} className="ps">
            <Card accent={C.amber}>
              <SectionTitle icon="📅" title="Activity & Streak Consistency" accent={C.amber}
                sub="90-day challenge activity — hover a square to see the date"/>
              <ActivityHeatmap tasks={tasks} streak={ud.arenaStreak||0}/>
            </Card>
          </div>
        )}

        {/* ══ ELO JOURNEY SPARKLINE (all archetypes) ══════════════════════════ */}
        {tasks.length>=2&&(()=>{
          const sorted=[...tasks].sort((a,b)=>new Date(a.completedAt)-new Date(b.completedAt))
          let runningElo=Math.max(400,ud.eloRating-sorted.reduce((s,t)=>s+(t.eloDelta||0),0))
          const eloData=sorted.map((t,i)=>{
            runningElo=runningElo+(t.eloDelta||0)
            return { i:i+1, elo:runningElo, label:fmt(t.completedAt) }
          })
          const accent=aConfig?.palette?.accent||C.blue
          const minElo=Math.min(...eloData.map(d=>d.elo))-20
          const maxElo=Math.max(...eloData.map(d=>d.elo))+20
          return (
            <div className="ps">
              <Card accent={accent}>
                <SectionTitle icon="📈" title="ELO Journey" accent={accent}
                  sub={`From ${eloData[0]?.elo} → ${ud.eloRating} ELO across ${tasks.length} challenges`}/>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={eloData} margin={{top:8,right:12,left:-10,bottom:0}}>
                    <defs>
                      <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accent} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={accent} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="i" tick={{fill:C.ink4,fontSize:10}} tickLine={false} axisLine={false}
                      label={{value:"Challenge #",position:"insideBottom",fill:C.ink4,fontSize:10,offset:-2}}/>
                    <YAxis domain={[minElo,maxElo]} tick={{fill:C.ink4,fontSize:10}} tickLine={false} axisLine={false}/>
                    <Tooltip
                      contentStyle={{background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:10,fontSize:12,color:C.ink}}
                      formatter={(v)=>[`${v} ELO`,"Rating"]}
                      labelFormatter={i=>`Challenge #${i}`}
                    />
                    <Area type="monotone" dataKey="elo" stroke={accent} strokeWidth={2.5}
                      fill="url(#eloGrad)" dot={false} activeDot={{r:5,fill:accent,strokeWidth:0}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )
        })()}

        {/* ══ SKILLS ══════════════════════════════════════════════════════════ */}
        {skills.length>0&&(
          <div ref={refs.skills} className="ps">
            <Card accent={aConfig?.palette?.accent||C.teal}>
              <SectionTitle icon="🧠" title="Skills & Expertise" accent={aConfig?.palette?.accent||C.teal}
                sub={`${skills.length} skills tracked from Arena challenges and assessments`}/>
              <div style={{display:"grid",gridTemplateColumns:radarData.length>=3?"1fr 1fr":"1fr",gap:32,alignItems:"start"}}>
                {radarData.length>=3&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:C.ink4,textTransform:"uppercase",letterSpacing:1.2,marginBottom:14}}>Skill Radar</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke={C.border2}/>
                        <PolarAngleAxis dataKey="subject" tick={{fill:C.ink3,fontSize:11}}/>
                        <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
                        <Radar name="Score" dataKey="score"
                          stroke={aConfig?.palette?.accent||C.teal}
                          fill={aConfig?.palette?.accent||C.teal}
                          fillOpacity={0.15} strokeWidth={2.5}/>
                        <Tooltip
                          contentStyle={{background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:10,fontSize:12,color:C.ink}}
                          formatter={v=>[`${v}%`,"Score"]}/>
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:C.ink4,textTransform:"uppercase",letterSpacing:1.2,marginBottom:14}}>Skill Levels</div>
                  {skills.slice(0,9).map((s,i)=>(
                    <SkillBar key={i} label={s.skill} pct={s.percentage}
                      color={i%2===0?(aConfig?.palette?.accent||C.blue):(aConfig?.palette?.tag||C.teal)}/>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ══ STRENGTHS & WEAKNESSES ══════════════════════════════════════════ */}
        {(ud.strengths?.length>0||ud.weakAreas?.length>0)&&(
          <div className="ps">
            <Card accent={aConfig?.palette?.accent}>
              <SectionTitle icon="⚖️" title="Strengths & Focus Areas" accent={aConfig?.palette?.accent||C.blue}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                {ud.strengths?.length>0&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:800,color:C.green,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>✓ Strengths</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {ud.strengths.map((s,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                          padding:"10px 14px",background:C.green2,borderRadius:10,
                          border:`1px solid rgba(22,163,74,0.15)`}}>
                          <span style={{color:C.green,fontSize:15}}>✓</span>
                          <span style={{fontSize:13,color:C.ink2,fontWeight:500}}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {ud.weakAreas?.length>0&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:800,color:C.amber,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>△ Focus Areas</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {ud.weakAreas.map((s,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                          padding:"10px 14px",background:C.amber2,borderRadius:10,
                          border:`1px solid rgba(217,119,6,0.15)`}}>
                          <span style={{color:C.amber,fontSize:15}}>△</span>
                          <span style={{fontSize:13,color:C.ink2,fontWeight:500}}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ══ CHALLENGES ══════════════════════════════════════════════════════ */}
        {tasks.length>0&&(
          <div ref={refs.challenges} className="ps">
            <Card accent={aConfig?.palette?.accent||C.blue}>
              <SectionTitle icon="⚔️"
                title={aConfig?.proofBadgeLabel ? `Arena Challenges · ${aConfig.proofBadgeLabel}` : "Arena Challenges"}
                accent={aConfig?.palette?.accent||C.blue}
                sub={`${tasks.length} challenges completed · avg score ${avgScore}/100`}/>

              {/* Difficulty summary */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:28}}>
                {["Easy","Medium","Hard","Expert"].map(d=>{
                  const n=tasks.filter(t=>t.difficulty===d).length
                  if(!n) return null
                  const dc=DIFF[d]||DIFF.Medium
                  return <div key={d} style={{padding:"5px 14px",background:dc.bg,border:`1px solid ${dc.color}33`,borderRadius:99,fontSize:12,fontWeight:700,color:dc.color}}>{n} {d}</div>
                })}
              </div>

              {/* Common challenges */}
              {commonTasks.length>0&&(
                <div style={{marginBottom:32}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                    <div style={{width:3,height:18,background:C.blue,borderRadius:99}}/>
                    <span style={{fontSize:13,fontWeight:700,color:C.ink2}}>Common Challenges — DSA / Algorithms</span>
                    <span style={{fontSize:12,color:C.ink4}}>· {commonTasks.length} solved</span>
                  </div>
                  {commonTasks.map((t,i)=>(
                    <ChallengeCard key={t.id+i} t={t} last={i===commonTasks.length-1} />
                  ))}
                </div>
              )}

              {/* Domain challenges */}
              {domainTasks.length>0&&(
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                    <div style={{width:3,height:18,background:C.teal,borderRadius:99}}/>
                    <span style={{fontSize:13,fontWeight:700,color:C.ink2}}>Domain Challenges</span>
                    <span style={{fontSize:12,color:C.ink4}}>· {domainTasks.length} solved</span>
                  </div>
                  {domainTasks.map((t,i)=>(
                    <ChallengeCard key={t.id+i+"d"} t={t} last={i===domainTasks.length-1} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ══ INTERVIEW SESSIONS ══════════════════════════════════════════════ */}
        {interviews.length>0&&(
          <div ref={refs.interviews} className="ps">
            <Card accent={C.purple}>
              <SectionTitle icon="🎤" title="Interview Sessions" accent={C.purple}
                sub={`${interviews.length} sessions completed — click any card to expand feedback`}/>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {interviews.map((iv,i)=><InterviewCard key={iv.id||i} iv={iv}/>)}
              </div>
            </Card>
          </div>
        )}

        {/* ══ EXPERIENCE — professionals & authority + project-heavy archetypes */}
        {(isPro||[ARCHETYPES.CRAFTSMAN,ARCHETYPES.FULLSTACK,ARCHETYPES.MOBILE,ARCHETYPES.ARCHITECT].includes(archetype))&&(ud.experiences?.length>0||ud.resumeProjects?.length>0)&&(
          <div ref={refs.experience} className="ps">
            <Card accent={aConfig?.palette?.accent}>
              <SectionTitle icon="💼"
                title={
                  archetype===ARCHETYPES.MOBILE?"Published Apps & Experience":
                  archetype===ARCHETYPES.CRAFTSMAN?"Built Projects & Work History":
                  archetype===ARCHETYPES.ANALYST?"Analytics Projects & Case Studies":
                  archetype===ARCHETYPES.DESIGNER?"Case Studies & Work History":
                  archetype===ARCHETYPES.PM?"Product Work & Outcomes":
                  "Experience & Projects"
                }
                accent={aConfig?.palette?.accent||C.teal}/>
              {ud.experiences?.length>0&&(
                <div style={{marginBottom:ud.resumeProjects?.length>0?28:0}}>
                  <div style={{fontSize:11,fontWeight:800,color:C.ink4,textTransform:"uppercase",letterSpacing:1,marginBottom:16}}>Work History</div>
                  {ud.experiences.map((e,i)=>(
                    <TLine key={i}
                      icon="🏢"
                      title={`${e.role||e.title||"Role"} — ${e.company||"Company"}`}
                      sub={e.description||e.summary||""}
                      time={e.startDate||e.start_date}
                      last={i===ud.experiences.length-1}
                      meta={<span style={{fontSize:12,color:C.ink4}}>{e.startDate||e.start_date||""}{(e.endDate||e.end_date)?` – ${e.endDate||e.end_date}`:" – Present"}</span>}
                    />
                  ))}
                </div>
              )}
              {ud.resumeProjects?.length>0&&(
                <div>
                  <div style={{fontSize:11,fontWeight:800,color:C.ink4,textTransform:"uppercase",letterSpacing:1,marginBottom:16}}>Projects</div>
                  {ud.resumeProjects.map((p,i)=>(
                    <TLine key={i}
                      icon="🔧"
                      title={p.name||p.title||"Project"}
                      sub={p.description||p.summary||""}
                      last={i===ud.resumeProjects.length-1}
                      meta={(p.technologies||p.tech||[]).slice(0,4).map((t,j)=>(
                        <span key={j} style={{fontSize:11,color:C.blue,background:C.blue3,padding:"2px 8px",borderRadius:99}}>{t}</span>
                      ))}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ══ EDUCATION — students ════════════════════════════════════════════ */}
        {ud.path==="student"&&ud.education?.length>0&&(
          <div className="ps">
            <Card>
              <SectionTitle icon="🎓" title="Education" accent={C.blue}/>
              {ud.education.map((e,i)=>(
                <TLine key={i}
                  icon="🏫"
                  title={`${e.degree||e.course||"Degree"} — ${e.institution||e.school||"Institution"}`}
                  sub={e.field||e.specialization||""}
                  time={e.endDate||e.end_date||e.year}
                  last={i===ud.education.length-1}
                  meta={<span style={{fontSize:12,color:C.ink4}}>{e.year||e.endDate||e.end_date||""}</span>}
                />
              ))}
            </Card>
          </div>
        )}

        {/* ══ EMPTY STATE (no activity yet) ═══════════════════════════════════ */}
        {tasks.length===0&&interviews.length===0&&skills.length===0&&(
          <Card style={{textAlign:"center",padding:"48px 32px"}}>
            <div style={{fontSize:48,marginBottom:12}}>🚀</div>
            <div style={{fontSize:16,fontWeight:700,color:C.ink,marginBottom:8}}>Portfolio in progress</div>
            <div style={{fontSize:13,color:C.ink3}}>
              {isOwner
                ?"Complete Arena challenges and interview sessions to build your portfolio."
                :"This user hasn't completed any Arena activity yet."}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div style={{textAlign:"center",padding:"20px 0",borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:12,color:C.ink4}}>
            Powered by{" "}
            <a href="https://capabilio.online" target="_blank" rel="noreferrer"
              style={{color:C.blue,fontWeight:700,textDecoration:"none"}}>
              Capabilio AI
            </a>
            {ud.createdAt&&<span style={{marginLeft:10}}>· Member since {fmt(ud.createdAt)}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
