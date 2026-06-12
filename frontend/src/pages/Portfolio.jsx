/**
 * Portfolio.jsx — Universal Professional Portfolio
 *
 * One design for all users. Path-specific section ordering and emphasis.
 * Sections: Hero → Stats → Skills → Strengths/Weaknesses → Challenges Timeline
 *           → Interview Sessions → Experience/Projects (professionals)
 *
 * No themes, no purchases — one clean, cinematic layout.
 */

import { useEffect, useState, useRef } from "react"
import { userDoc } from "../lib/db"
import { supabase } from "../lib/supabase"
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip,
} from "recharts"

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#0F172A",
  surface: "#FFFFFF",
  ink:     "#0F172A",
  ink2:    "#334155",
  ink3:    "#64748B",
  ink4:    "#94A3B8",
  border:  "#E2E8F0",
  blue:    "#2563EB",
  blue2:   "#3B82F6",
  blue3:   "#EFF6FF",
  teal:    "#0F766E",
  teal2:   "#14B8A6",
  teal3:   "#F0FDFA",
  green:   "#16A34A",
  green2:  "#DCFCE7",
  amber:   "#D97706",
  amber2:  "#FEF9C3",
  red:     "#DC2626",
  red2:    "#FEE2E2",
  purple:  "#7C3AED",
  purple2: "#EDE9FE",
  shadow:  "0 1px 3px rgba(0,0,0,0.07),0 1px 2px rgba(0,0,0,0.04)",
  shadow2: "0 4px 16px rgba(0,0,0,0.08)",
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

function Card({ children, style={} }) {
  return (
    <div style={{ background:C.surface, borderRadius:20, border:`1px solid ${C.border}`,
      boxShadow:C.shadow, padding:"28px 32px", ...style }}>
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
      {sub && <p style={{ margin:"4px 0 0 14px", fontSize:13, color:C.ink3, lineHeight:1.5 }}>{sub}</p>}
    </div>
  )
}

function StatChip({ icon, value, label, color=C.blue }) {
  return (
    <div style={{ textAlign:"center", padding:"16px 22px", background:C.surface,
      borderRadius:16, border:`1px solid ${C.border}`, boxShadow:C.shadow, minWidth:88 }}>
      <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
      <div style={{ fontSize:20, fontWeight:900, color, fontFamily:"'JetBrains Mono',monospace", lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:C.ink4, marginTop:4, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8 }}>{label}</div>
    </div>
  )
}

function SkillBar({ label, pct, color=C.blue }) {
  const p = Math.min(100, Math.max(0, pct))
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontSize:13, fontWeight:600, color:C.ink2 }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color, fontFamily:"monospace" }}>{p}%</span>
      </div>
      <div style={{ height:5, background:C.border, borderRadius:99 }}>
        <div style={{ height:"100%", width:`${p}%`, background:color, borderRadius:99 }} />
      </div>
    </div>
  )
}

// Timeline entry with connecting line
// Simple timeline row (for experience/education)
function TLine({ icon, title, sub, score, time, meta, last }) {
  return (
    <div style={{ display:"flex", gap:14, position:"relative" }}>
      {!last && <div style={{ position:"absolute", left:19, top:40, bottom:0, width:2, background:C.border, zIndex:0 }} />}
      <div style={{ width:40, height:40, borderRadius:12, background:C.blue3, border:`2px solid ${C.border}`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, zIndex:1 }}>
        {icon}
      </div>
      <div style={{ flex:1, paddingBottom: last?0:20, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:14, fontWeight:700, color:C.ink, flex:1 }}>{title}</span>
          {score!=null && <ScoreRing score={score} size={44} />}
        </div>
        {sub && <div style={{ fontSize:12, color:C.ink3, marginTop:3, lineHeight:1.55 }}>{sub}</div>}
        <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:6, flexWrap:"wrap" }}>
          {meta}
          {time && <span style={{ fontSize:11, color:C.ink4 }}>📅 {fmt(time)}</span>}
        </div>
      </div>
    </div>
  )
}

// Expandable challenge card — shows full scenario, feedback, ELO, attempts
function ChallengeCard({ t, last }) {
  const [open, setOpen] = useState(false)
  const col = scoreColor(t.score)
  return (
    <div style={{ position:"relative" }}>
      {!last && <div style={{ position:"absolute", left:19, top:52, bottom:0, width:2,
        background:C.border, zIndex:0 }} />}
      <div style={{ border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden",
        background:C.surface, boxShadow:C.shadow, marginBottom: last?0:16, position:"relative", zIndex:1 }}>

        {/* Header row */}
        <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:12,
          cursor:"pointer", userSelect:"none" }}
          onClick={() => setOpen(o=>!o)}>
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
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:20, fontWeight:900, color:col, fontFamily:"monospace" }}>
              {gradeFor(t.score)}
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:C.blue }}>
              +{t.eloDelta} ELO
            </div>
            <div style={{ fontSize:11, color:C.ink4, marginTop:2 }}>{open?"▲ Hide":"▼ Detail"}</div>
          </div>
        </div>

        {/* Expanded detail */}
        {open && (
          <div style={{ borderTop:`1px solid ${C.border}`, padding:"16px 18px",
            background:"#0F172A", display:"flex", flexDirection:"column", gap:14 }}>

            {/* Scenario */}
            {t.scenario && (
              <div>
                <div style={{ fontSize:11, fontWeight:800, color:C.ink3, textTransform:"uppercase",
                  letterSpacing:1, marginBottom:6 }}>📋 Scenario</div>
                <div style={{ fontSize:13, color:C.ink2, lineHeight:1.7, background:C.surface,
                  padding:"10px 14px", borderRadius:10, border:`1px solid ${C.border}` }}>
                  {t.scenario}
                </div>
              </div>
            )}

            {/* Objective */}
            {t.objective && (
              <div>
                <div style={{ fontSize:11, fontWeight:800, color:C.ink3, textTransform:"uppercase",
                  letterSpacing:1, marginBottom:6 }}>🎯 Objective</div>
                <div style={{ fontSize:13, color:C.ink2, lineHeight:1.7, background:C.surface,
                  padding:"10px 14px", borderRadius:10, border:`1px solid ${C.border}` }}>
                  {t.objective}
                </div>
              </div>
            )}

            {/* Two-col: Expected Output + User's Answer */}
            {(t.expectedOutput || t.userAnswer) && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {t.expectedOutput && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:800, color:C.green, textTransform:"uppercase",
                      letterSpacing:1, marginBottom:6 }}>✓ Expected Output</div>
                    <pre style={{ margin:0, fontSize:12, color:C.ink2, background:C.green2,
                      padding:"10px 12px", borderRadius:10, border:`1px solid rgba(22,163,74,0.15)`,
                      whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily:"'JetBrains Mono',monospace",
                      lineHeight:1.6, maxHeight:120, overflowY:"auto" }}>
                      {t.expectedOutput}
                    </pre>
                  </div>
                )}
                {t.userAnswer && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:800, color:C.blue, textTransform:"uppercase",
                      letterSpacing:1, marginBottom:6 }}>💻 Submitted Solution</div>
                    <pre style={{ margin:0, fontSize:11, color:C.ink2, background:C.blue3,
                      padding:"10px 12px", borderRadius:10, border:`1px solid rgba(37,99,235,0.12)`,
                      whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily:"'JetBrains Mono',monospace",
                      lineHeight:1.6, maxHeight:160, overflowY:"auto" }}>
                      {t.userAnswer.slice(0, 600)}{t.userAnswer.length > 600 ? "\n…" : ""}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* AI Feedback */}
            {t.feedback && (
              <div>
                <div style={{ fontSize:11, fontWeight:800, color:C.purple, textTransform:"uppercase",
                  letterSpacing:1, marginBottom:6 }}>🤖 AI Feedback</div>
                <div style={{ fontSize:13, color:C.ink2, lineHeight:1.7, background:C.purple2,
                  padding:"12px 14px", borderRadius:10, border:`1px solid rgba(124,58,237,0.12)`,
                  borderLeft:`3px solid ${C.purple}` }}>
                  {t.feedback}
                </div>
              </div>
            )}

            {/* Stats row */}
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {[
                { label:"Score",    value:`${t.score}/100`,          color:col           },
                { label:"Grade",    value:gradeFor(t.score),         color:col           },
                { label:"ELO Earned",value:`+${t.eloDelta}`,         color:C.indigo??C.blue },
                { label:"Attempts", value:t.attempts,                 color:C.amber       },
                { label:"Completed",value:fmt(t.completedAt),        color:C.ink3        },
              ].filter(s=>s.value).map((s,i)=>(
                <div key={i} style={{ padding:"8px 14px", background:C.surface, borderRadius:10,
                  border:`1px solid ${C.border}`, textAlign:"center" }}>
                  <div style={{ fontSize:14, fontWeight:800, color:s.color, fontFamily:"monospace" }}>{s.value}</div>
                  <div style={{ fontSize:10, color:C.ink4, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:0.8, marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Interview card with expandable detail
function InterviewCard({ iv }) {
  const [open, setOpen] = useState(false)
  const score = iv.overall_score || 0
  return (
    <div style={{ border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden", background:C.surface, boxShadow:C.shadow }}>
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
        <div style={{ borderTop:`1px solid ${C.border}`, padding:"18px 20px", background:C.bg }}>
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
function PerformanceSummary({ ud, skills, tasks, interviews }) {
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
    <Card>
      <SectionTitle icon="📊" title="Performance Summary" accent={C.blue}
        sub="ELO rating, challenge scores, and growth trajectory"/>

      {/* Score metrics */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[
          {icon:"⚡",label:"ELO Rating", value:ud.eloRating,sub:tier.label,     color:tier.color,  bar:Math.min((ud.eloRating/1500)*100,100)},
          {icon:"🎯",label:"Avg Score",  value:`${avgScore}/100`,sub:`${passRate}% pass rate`,color:scoreColor(avgScore),bar:avgScore},
          {icon:"🏆",label:"Best Score", value:best>0?`${best}/100`:"–",sub:best>=90?"Excellent":best>=80?"Strong":best>=60?"Good":"No data",color:scoreColor(best),bar:best},
        ].map((m,i)=>(
          <div key={i} style={{padding:"14px",background:C.bg,borderRadius:12,border:`1px solid ${C.border}`,textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:5}}>{m.icon}</div>
            <div style={{fontSize:18,fontWeight:900,color:m.color,fontFamily:"monospace",lineHeight:1}}>{m.value}</div>
            <div style={{fontSize:11,color:C.ink3,marginTop:3,fontWeight:500}}>{m.sub}</div>
            <div style={{height:4,background:C.border,borderRadius:99,marginTop:8}}>
              <div style={{height:"100%",width:`${m.bar}%`,background:m.color,borderRadius:99}}/>
            </div>
            <div style={{fontSize:10,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginTop:4}}>{m.label}</div>
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
          <div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 12px",
            background:C.surface,border:`1px solid ${C.border}`,borderRadius:99,boxShadow:C.shadow}}>
            <span style={{fontSize:13}}>{h.icon}</span>
            <span style={{fontSize:12,color:C.ink2,fontWeight:500}}>{h.text}</span>
          </div>
        ))}
      </div>

      {/* ELO progress to next tier */}
      {tierNext && (
        <div style={{padding:"14px 16px",background:C.bg,borderRadius:12,border:`1px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:700,color:tier.color}}>● {tier.label} · {ud.eloRating}</span>
            <span style={{fontSize:12,color:C.ink4}}>{tierNext.min-ud.eloRating} ELO to <strong style={{color:tierNext.color}}>{tierNext.label}</strong></span>
          </div>
          <div style={{height:8,background:C.border,borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${tierProg}%`,
              background:`linear-gradient(90deg,${tier.color},${tierNext.color})`,borderRadius:99,transition:"width 1.2s ease"}}/>
          </div>
          <div style={{fontSize:11,color:C.ink4,marginTop:5,textAlign:"center"}}>{tierProg}% progress to {tierNext.label}</div>
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
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:44,height:44,border:`3px solid ${C.border}`,borderTopColor:C.blue,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <p style={{color:C.ink3,fontSize:14,margin:0}}>Loading portfolio…</p>
    </div>
  )

  if(error||!pd) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{fontSize:48}}>🔒</div>
      <p style={{color:C.red,fontSize:16,fontWeight:700,margin:0}}>{error||"Portfolio not found"}</p>
      <p style={{color:C.ink4,fontSize:13,margin:0}}>This profile may be private or the username doesn't exist.</p>
    </div>
  )

  const {ud,skills,tasks}=pd
  const pc    = PATH_CONFIG[ud.path]||PATH_CONFIG.student
  const tier  = getTier(ud.eloRating)
  const isOwner = !!(ud.uid&&currentUid&&currentUid===ud.uid)
  const isPro   = ud.path==="professional"||ud.path==="authority"

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
        ::selection{background:#DBEAFE}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .ps{animation:fadeUp 0.45s ease both}
        @media print{.np{display:none!important}}
      `}</style>

      {/* ── Sticky nav ─────────────────────────────────────────────────────── */}
      <nav className="np" style={{
        position:"sticky",top:0,zIndex:100,
        background:scrolled?"rgba(255,255,255,0.95)":"transparent",
        backdropFilter:scrolled?"blur(14px)":"none",
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
            style={{padding:"6px 16px",borderRadius:99,border:`1.5px solid ${C.border}`,
              background:C.surface,color:C.ink3,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            ⬇ PDF
          </button>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div ref={refs.overview}>
        <div style={{background:pc.heroBg,padding:"56px 32px 72px",position:"relative",overflow:"hidden"}}>
          {/* Subtle dot overlay */}
          <div style={{position:"absolute",inset:0,opacity:0.04,
            backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"28px 28px"}}/>
          {/* Glow */}
          <div style={{position:"absolute",top:-120,right:-120,width:400,height:400,
            background:"rgba(0,0,0,0.02)",borderRadius:"50%",filter:"blur(60px)"}}/>

          <div style={{position:"relative",maxWidth:860,margin:"0 auto"}}>
            {/* Path badge */}
            <div style={{display:"inline-flex",alignItems:"center",gap:6,
              background:"rgba(0,0,0,0.07)",backdropFilter:"blur(8px)",
              padding:"4px 14px",borderRadius:99,marginBottom:28,
              border:"1px solid rgba(255,255,255,0.2)"}}>
              <span>{pc.icon}</span>
              <span style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.9)",textTransform:"uppercase",letterSpacing:1.5}}>
                {pc.label}
              </span>
            </div>

            <div style={{display:"flex",gap:28,alignItems:"flex-start",flexWrap:"wrap"}}>
              {/* Avatar with tier ring */}
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:108,height:108,borderRadius:"50%",padding:3,
                  background:"linear-gradient(135deg,rgba(255,255,255,0.5),rgba(0,0,0,0.05))"}}>
                  <Avatar name={ud.displayName} url={ud.avatarUrl} size={102} fontSize={34}/>
                </div>
                <div style={{position:"absolute",bottom:0,right:0,
                  background:tier.color,color:"#fff",fontSize:10,fontWeight:800,
                  padding:"3px 8px",borderRadius:99,border:"2px solid white",whiteSpace:"nowrap"}}>
                  {tier.label}
                </div>
              </div>

              {/* Identity block */}
              <div style={{flex:1,minWidth:220}}>
                <h1 style={{fontSize:38,fontWeight:900,color:"#fff",margin:"0 0 6px",
                  letterSpacing:"-0.03em",lineHeight:1.05}}>
                  {ud.displayName}
                </h1>
                {ud.keyword&&<p style={{fontSize:16,color:"rgba(255,255,255,0.7)",margin:"0 0 14px",fontWeight:500}}>{ud.keyword}</p>}

                <p style={{fontSize:14,color:"rgba(255,255,255,0.62)",lineHeight:1.75,maxWidth:520,margin:"0 0 20px"}}>
                  {summary||`${pc.label} building career on Capabilio.`}
                </p>

                {/* Links + ELO chip */}
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {ud.linkedInUrl&&(
                    <a href={ud.linkedInUrl} target="_blank" rel="noreferrer"
                      style={{display:"inline-flex",alignItems:"center",gap:5,
                        padding:"7px 16px",borderRadius:99,
                        background:"rgba(0,0,0,0.07)",border:"1px solid rgba(255,255,255,0.22)",
                        color:"rgba(255,255,255,0.9)",fontSize:12,fontWeight:700,textDecoration:"none"}}>
                      in LinkedIn
                    </a>
                  )}
                  {(ud.githubUrl||ud.githubUsername)&&(
                    <a href={ud.githubUrl||`https://github.com/${ud.githubUsername}`} target="_blank" rel="noreferrer"
                      style={{display:"inline-flex",alignItems:"center",gap:5,
                        padding:"7px 16px",borderRadius:99,
                        background:"rgba(0,0,0,0.07)",border:"1px solid rgba(255,255,255,0.22)",
                        color:"rgba(255,255,255,0.9)",fontSize:12,fontWeight:700,textDecoration:"none"}}>
                      ⌥ GitHub
                    </a>
                  )}
                  <div style={{display:"inline-flex",alignItems:"center",gap:6,
                    padding:"7px 16px",borderRadius:99,
                    background:"rgba(0,0,0,0.07)",border:"1px solid rgba(255,255,255,0.22)",
                    color:"rgba(255,255,255,0.9)",fontSize:12,fontWeight:700}}>
                    ⚡ {ud.eloRating} ELO
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"20px 32px"}}>
          <div style={{maxWidth:860,margin:"0 auto",display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
            <StatChip icon="⚡" value={ud.eloRating} label="ELO Score" color={tier.color}/>
            <StatChip icon="✅" value={tasks.length} label="Challenges" color={C.green}/>
            <StatChip icon="🔥" value={ud.arenaStreak||0} label="Day Streak" color={C.amber}/>
            {interviews.length>0&&<StatChip icon="🎤" value={interviews.length} label="Interviews" color={C.purple}/>}
            {skills.length>0&&<StatChip icon="🧠" value={`${Math.round(skills.reduce((s,k)=>s+k.percentage,0)/skills.length)}%`} label="Avg Skill" color={C.teal}/>}
            {avgScore>0&&<StatChip icon="📊" value={`${avgScore}`} label="Avg Score" color={C.blue}/>}
            {ud.jobReadiness>0&&<StatChip icon="🚀" value={`${ud.jobReadiness}%`} label="Job Ready" color={C.blue2}/>}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div style={{maxWidth:860,margin:"36px auto",padding:"0 24px 80px",display:"flex",flexDirection:"column",gap:28}}>

        {/* ══ PERFORMANCE SUMMARY ═════════════════════════════════════════════ */}
        <div ref={refs.summary} className="ps">
          <PerformanceSummary
            ud={ud} skills={skills} tasks={tasks}
            interviews={interviews}
          />
        </div>

        {/* ══ ACTIVITY HEATMAP ════════════════════════════════════════════════ */}
        {tasks.length>0&&(
          <div ref={refs.activity} className="ps">
            <Card>
              <SectionTitle icon="📅" title="Activity & Streak Consistency" accent={C.amber}
                sub="90-day challenge activity — hover a square to see the date"/>
              <ActivityHeatmap tasks={tasks} streak={ud.arenaStreak||0}/>
            </Card>
          </div>
        )}

        {/* ══ SKILLS ══════════════════════════════════════════════════════════ */}
        {skills.length>0&&(
          <div ref={refs.skills} className="ps">
            <Card>
              <SectionTitle icon="🧠" title="Skills & Expertise" accent={C.teal}
                sub={`${skills.length} skills tracked from Arena challenges and assessments`}/>
              <div style={{display:"grid",gridTemplateColumns:radarData.length>=3?"1fr 1fr":"1fr",gap:32,alignItems:"start"}}>
                {radarData.length>=3&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:800,color:C.ink4,textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Skill Radar</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke={C.border}/>
                        <PolarAngleAxis dataKey="subject" tick={{fill:C.ink3,fontSize:11}}/>
                        <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
                        <Radar name="Score" dataKey="score" stroke={C.teal} fill={C.teal} fillOpacity={0.12} strokeWidth={2.5}/>
                        <Tooltip formatter={v=>[`${v}%`,"Score"]}/>
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div>
                  <div style={{fontSize:11,fontWeight:800,color:C.ink4,textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Skill Levels</div>
                  {skills.slice(0,9).map((s,i)=>(
                    <SkillBar key={i} label={s.skill} pct={s.percentage} color={i%2===0?C.blue:C.teal}/>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ══ STRENGTHS & WEAKNESSES ══════════════════════════════════════════ */}
        {(ud.strengths?.length>0||ud.weakAreas?.length>0)&&(
          <div className="ps">
            <Card>
              <SectionTitle icon="⚖️" title="Strengths & Focus Areas" accent={C.blue}/>
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
            <Card>
              <SectionTitle icon="⚔️" title="Arena Challenges" accent={C.blue}
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
            <Card>
              <SectionTitle icon="🎤" title="Interview Sessions" accent={C.purple}
                sub={`${interviews.length} sessions completed — click any card to expand feedback`}/>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {interviews.map((iv,i)=><InterviewCard key={iv.id||i} iv={iv}/>)}
              </div>
            </Card>
          </div>
        )}

        {/* ══ EXPERIENCE — professionals & authority ══════════════════════════ */}
        {isPro&&(ud.experiences?.length>0||ud.resumeProjects?.length>0)&&(
          <div ref={refs.experience} className="ps">
            <Card>
              <SectionTitle icon="💼" title="Experience & Projects" accent={C.teal}/>
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
