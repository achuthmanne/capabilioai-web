import { useState, useEffect } from "react"
import EchoPitchDemoPlayer from "./EchoPitchDemoPlayer"

// ─── Design tokens ─────────────────────────────────────────────────────────
const D = {
  bg:         "#030308",
  glass:      "rgba(255,255,255,0.04)",
  glassHover: "rgba(255,255,255,0.07)",
  glassDeep:  "rgba(255,255,255,0.02)",
  border:     "rgba(255,255,255,0.08)",
  borderBright:"rgba(255,255,255,0.14)",
  text1:      "#F0EDE8",
  text2:      "rgba(240,237,232,0.72)",
  text3:      "rgba(240,237,232,0.48)",
  orange:     "#FF5701",
  orangeDim:  "rgba(255,87,1,0.12)",
  orangeMid:  "rgba(255,87,1,0.22)",
  orangeGlow: "rgba(255,87,1,0.35)",
  gold:       "#C9A84C",
  goldDim:    "rgba(201,168,76,0.12)",
  violet:     "#8B5CF6",
  violetDim:  "rgba(139,92,246,0.12)",
  amber:      "#D97706",
  amberDim:   "rgba(217,119,6,0.12)",
  green:      "#16A34A",
  blue:       "#3B82F6",
}

// ─── EloSparkline ──────────────────────────────────────────────────────────
function EloSparkline({ points, color = "#FF5701", width = 340, height = 78 }) {
  if (!points || points.length < 2) return null
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1
  const xs = points.map((_, i) => (i / (points.length - 1)) * width)
  const ys = points.map((v) => height - ((v - min) / range) * (height * 0.78) - height * 0.08)
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ")
  const fill = `${path} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", width: "100%" }}>
      <defs>
        <linearGradient id="landingEloGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#landingEloGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="4.5" fill={color} style={{ filter:`drop-shadow(0 0 6px ${color})` }} />
    </svg>
  )
}

// ─── PortfolioCard ─────────────────────────────────────────────────────────
function PortfolioCard({ task }) {
  const [open, setOpen] = useState(false)
  const diffColor = { Easy: D.green, Medium: D.amber, Hard: "#DC2626" }[task.difficulty] || D.orange
  return (
    <div style={{
      background: open ? "rgba(255,87,1,0.05)" : D.glass,
      border: `1px solid ${open ? D.orangeMid : D.border}`,
      borderRadius: 22, overflow: "hidden",
      boxShadow: open ? `0 12px 40px rgba(255,87,1,0.12), 0 0 0 1px ${D.orangeMid}` : `0 4px 24px rgba(0,0,0,0.4)`,
      backdropFilter: "blur(24px)",
      transition: "all 200ms cubic-bezier(0.16,1,0.3,1)"
    }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding:"18px 20px", cursor:"pointer", display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:42, height:42, background:`${diffColor}18`, border:`1px solid ${diffColor}30`, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{task.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:700, color:D.text1, lineHeight:1.15, marginBottom:5 }}>{task.title}</div>
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:diffColor, background:`${diffColor}14`, border:`1px solid ${diffColor}28`, borderRadius:999, padding:"4px 8px", fontFamily:"'DM Mono',monospace" }}>{task.difficulty}</span>
            <span style={{ fontSize:11, color:D.text3, fontFamily:"'DM Mono',monospace" }}>{task.type} · {task.date}</span>
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:24, fontWeight:800, color:diffColor, lineHeight:1 }}>{task.score}</div>
          <div style={{ fontSize:10, color:diffColor, opacity:0.7, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginTop:3 }}>Score</div>
        </div>
        <span style={{ color:D.text3, fontSize:11, transition:"transform 0.2s", display:"inline-block", transform:open?"rotate(180deg)":"rotate(0)" }}>▼</span>
      </div>
      {open && (
        <div style={{ padding:"0 20px 20px", borderTop:`1px solid ${D.border}` }}>
          <div style={{ background:"rgba(255,87,1,0.06)", border:"1px solid rgba(255,87,1,0.14)", padding:"12px 14px", marginTop:16, marginBottom:12, borderRadius:14 }}>
            <div style={{ fontSize:10, fontWeight:800, color:D.orange, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6, fontFamily:"'DM Mono',monospace" }}>Scenario</div>
            <div style={{ fontSize:13, color:D.text2, lineHeight:1.72 }}>{task.scenario}</div>
          </div>
          <div style={{ background:"#0D0D0D", borderRadius:14, padding:"12px 14px", fontFamily:"'DM Mono',monospace", fontSize:12, color:"#BBF7D0", marginBottom:12, border:`1px solid ${D.border}`, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{task.code}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ background:"rgba(22,163,74,0.07)", border:"1px solid rgba(22,163,74,0.16)", borderRadius:14, padding:"10px 12px" }}>
              <div style={{ fontSize:10, fontWeight:800, color:D.green, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:5, fontFamily:"'DM Mono',monospace" }}>Strength</div>
              <div style={{ fontSize:12, color:D.text2, lineHeight:1.6 }}>{task.strength}</div>
            </div>
            <div style={{ background:"rgba(217,119,6,0.07)", border:"1px solid rgba(217,119,6,0.16)", borderRadius:14, padding:"10px 12px" }}>
              <div style={{ fontSize:10, fontWeight:800, color:D.amber, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:5, fontFamily:"'DM Mono',monospace" }}>Improve</div>
              <div style={{ fontSize:12, color:D.text2, lineHeight:1.6 }}>{task.improve}</div>
            </div>
          </div>
          {task.eloDelta > 0 && <div style={{ fontSize:12, color:D.green, fontWeight:700, marginTop:12, fontFamily:"'DM Mono',monospace" }}>+{task.eloDelta} ELO earned</div>}
        </div>
      )}
    </div>
  )
}

// ─── SectionLabel ──────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:10, background:"rgba(255,87,1,0.1)", border:"1px solid rgba(255,87,1,0.22)", backdropFilter:"blur(12px)", borderRadius:999, padding:"8px 16px", marginBottom:18 }}>
      <div style={{ width:6, height:6, borderRadius:"50%", background:D.orange, boxShadow:`0 0 0 4px rgba(255,87,1,0.18), 0 0 12px ${D.orange}` }} />
      <span style={{ fontSize:11, color:D.orange, fontWeight:700, letterSpacing:"0.14em", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>{children}</span>
    </div>
  )
}

// ─── PrimaryButton ─────────────────────────────────────────────────────────
function PrimaryButton({ children, onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding:"14px 22px", borderRadius:14, border:"1px solid rgba(255,87,1,0.5)", background:"linear-gradient(135deg,#FF5701,#E04800)", color:"#FFFFFF", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", boxShadow:"0 8px 32px rgba(255,87,1,0.38), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)", transition:"all 200ms cubic-bezier(0.16,1,0.3,1)" }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 14px 40px rgba(255,87,1,0.5), 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)" }}
      onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(255,87,1,0.38), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)" }}
    >{children}</button>
  )
}

// ─── GhostButton ───────────────────────────────────────────────────────────
function GhostButton({ children, onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding:"14px 22px", borderRadius:14, border:`1px solid ${D.border}`, background:D.glass, backdropFilter:"blur(12px)", color:D.text2, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", transition:"all 200ms cubic-bezier(0.16,1,0.3,1)" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=D.orangeMid; e.currentTarget.style.color=D.orange; e.currentTarget.style.background="rgba(255,87,1,0.08)" }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=D.border; e.currentTarget.style.color=D.text2; e.currentTarget.style.background=D.glass }}
    >{children}</button>
  )
}

// ─── PathOptionCard ────────────────────────────────────────────────────────
function PathOptionCard({ item, isActive, onClick }) {
  const c = item.color || D.orange
  return (
    <button onClick={onClick} style={{
      textAlign:"left", padding:"14px 16px",
      background: isActive ? `${c}12` : D.glass,
      border:`1px solid ${isActive ? `${c}40` : D.border}`,
      borderRadius:16, cursor:"pointer",
      backdropFilter:"blur(16px)",
      transition:"all 200ms cubic-bezier(0.16,1,0.3,1)",
      fontFamily:"inherit",
      boxShadow: isActive ? `0 8px 28px ${c}25, inset 0 1px 0 rgba(255,255,255,0.08)` : `0 2px 12px rgba(0,0,0,0.3)`,
    }}>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, color:isActive ? c : D.text1, marginBottom:4, fontWeight:700 }}>{item.label}</div>
      <div style={{ fontSize:11, color:isActive ? `${c}AA` : D.text3, fontWeight:600, fontFamily:"'DM Mono',monospace" }}>{item.subtitle}</div>
    </button>
  )
}

// ─── FeatureCard ───────────────────────────────────────────────────────────
function FeatureCard({ item }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? D.glassHover : D.glass,
        border:`1px solid ${hov ? D.borderBright : D.border}`,
        borderRadius:22, padding:24,
        backdropFilter:"blur(24px)",
        boxShadow: hov ? `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${D.borderBright}, 0 0 40px rgba(255,87,1,0.08)` : `0 4px 24px rgba(0,0,0,0.3)`,
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        transition:"all 240ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div style={{ width:46, height:46, background:"rgba(255,87,1,0.12)", border:"1px solid rgba(255,87,1,0.22)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, marginBottom:16, boxShadow:"0 4px 16px rgba(255,87,1,0.12)" }}>{item.icon}</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:D.text1, marginBottom:8 }}>{item.title}</div>
      <div style={{ fontSize:14, color:D.text2, lineHeight:1.75 }}>{item.desc}</div>
    </div>
  )
}

// ─── PathCard ──────────────────────────────────────────────────────────────
function PathCard({ icon, title, desc, badge, badgeColor = "#FF5701", featured, onClick }) {
  const [hov, setHov] = useState(false)
  const bColors = { "#FF5701":D.orange, purple:D.violet, green:D.green, amber:D.amber }
  const bc = bColors[badgeColor] || D.orange
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? D.glassHover : D.glass,
        border:`1px solid ${hov || featured ? D.borderBright : D.border}`,
        borderRadius:22, padding:24, cursor:"pointer",
        backdropFilter:"blur(24px)",
        boxShadow: hov ? `0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,87,1,0.08)` : featured ? `0 12px 40px rgba(0,0,0,0.4), 0 0 24px rgba(255,87,1,0.06)` : `0 4px 24px rgba(0,0,0,0.3)`,
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition:"all 240ms cubic-bezier(0.16,1,0.3,1)", position:"relative"
      }}
    >
      {featured && <div style={{ position:"absolute", top:0, right:20, background:"linear-gradient(135deg,#FF5701,#E04800)", color:"#fff", fontSize:10, fontWeight:700, padding:"6px 10px", borderRadius:"0 0 10px 10px", letterSpacing:"0.12em", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", boxShadow:"0 4px 14px rgba(255,87,1,0.3)" }}>Popular</div>}
      {featured && <div style={{ position:"absolute", inset:0, borderRadius:22, background:"linear-gradient(135deg, rgba(255,87,1,0.06), transparent 60%)", pointerEvents:"none" }} />}
      <div style={{ width:48, height:48, background:D.orangeDim, border:"1px solid rgba(255,87,1,0.2)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, marginBottom:18 }}>{icon}</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:D.text1, marginBottom:10 }}>{title}</div>
      <div style={{ fontSize:14, color:D.text2, lineHeight:1.75, marginBottom:16 }}>{desc}</div>
      <span style={{ display:"inline-flex", alignItems:"center", fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:999, background:`${bc}14`, color:bc, border:`1px solid ${bc}30`, fontFamily:"'DM Mono',monospace" }}>{badge}</span>
    </div>
  )
}

// ─── NetworkCard ───────────────────────────────────────────────────────────
function NetworkCard({ item }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? D.glassHover : D.glass,
        border:`1px solid ${hov ? D.borderBright : D.border}`,
        borderRadius:20, padding:18,
        backdropFilter:"blur(20px)",
        boxShadow: hov ? `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${D.borderBright}` : `0 4px 20px rgba(0,0,0,0.3)`,
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition:"all 220ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div style={{ display:"flex", gap:10, marginBottom:14 }}>
        <div style={{ width:42, height:42, borderRadius:12, background:`${item.color}18`, border:`1px solid ${item.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", fontSize:16, color:item.color, flexShrink:0, fontWeight:700, boxShadow:`0 0 16px ${item.color}20` }}>{item.name[0]}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:D.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
          <div style={{ fontSize:12, color:D.text3, marginTop:3 }}>{item.role} · {item.co}</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        <span style={{ fontSize:10, color:D.violet, background:D.violetDim, border:`1px solid rgba(139,92,246,0.18)`, borderRadius:999, padding:"4px 8px", fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{item.type}</span>
        <span style={{ fontSize:10, color:D.green, background:"rgba(22,163,74,0.1)", border:"1px solid rgba(22,163,74,0.18)", borderRadius:999, padding:"4px 8px", fontWeight:700, fontFamily:"'DM Mono',monospace" }}>Verified</span>
      </div>
      <div style={{ display:"flex", borderTop:`1px solid ${D.border}`, paddingTop:12 }}>
        {[{ l:"Followers", v:item.followers },{ l:"Posts", v:item.posts }].map((s,j) => (
          <div key={j} style={{ flex:1, textAlign:"center", borderRight:j===0?`1px solid ${D.border}`:"none" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:800, color:D.text1 }}>{s.v}</div>
            <div style={{ fontSize:10, color:D.text3, textTransform:"uppercase", letterSpacing:"0.08em", marginTop:3, fontFamily:"'DM Mono',monospace" }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Preview cards ─────────────────────────────────────────────────────────
function ExecutivePreview() {
  const G = D.gold
  const metrics = [
    { label:"Influence Score", value:"9,240" },
    { label:"Network Reach",   value:"12.4K" },
    { label:"Mentees",         value:"47"    },
  ]
  const activity = [
    { icon:"🏛", text:"Board seat at Fintech Series B secured" },
    { icon:"🎤", text:"Keynote confirmed — India SaaS Summit 2026" },
    { icon:"🤝", text:"3 mentorship requests this week" },
    { icon:"✦",  text:"Verified Authority badge active" },
  ]
  return (
    <div style={{ background:D.glass, border:`1px solid rgba(201,168,76,0.22)`, borderRadius:28, padding:24, backdropFilter:"blur(24px)", boxShadow:`0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(201,168,76,0.08), inset 0 1px 0 rgba(255,255,255,0.06)` }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:14, marginBottom:20 }}>
        <div>
          <div style={{ fontSize:10, color:D.text3, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:"'DM Mono',monospace" }}>Executive Authority Profile</div>
          <div style={{ fontFamily:"'DM Sans',serif", fontSize:24, fontWeight:800, color:D.text1, marginBottom:4 }}>Arjun Mehta</div>
          <div style={{ fontSize:13, color:D.text2 }}>Founder & CEO · SaaS Advisor</div>
        </div>
        <div style={{ background:`${G}14`, border:`1.5px solid ${G}40`, borderRadius:16, padding:"12px 14px", textAlign:"center", flexShrink:0, boxShadow:`0 0 20px ${G}20` }}>
          <div style={{ fontFamily:"'DM Sans',serif", fontSize:13, fontWeight:800, color:G, lineHeight:1.2 }}>✦</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:G, letterSpacing:"0.12em", marginTop:5, fontWeight:800, textTransform:"uppercase" }}>Verified</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
        {metrics.map((m,i) => (
          <div key={i} style={{ background:D.glassDeep, border:`1px solid ${D.border}`, borderRadius:14, padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:18, fontWeight:800, color:G, marginBottom:3 }}>{m.value}</div>
            <div style={{ fontSize:9, color:D.text3, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, color:D.text3, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:10, fontFamily:"'DM Mono',monospace" }}>Recent Activity</div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {activity.map((a,i) => (
          <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"9px 12px", background:D.glassDeep, border:`1px solid ${D.border}`, borderRadius:12 }}>
            <span style={{ fontSize:14, flexShrink:0 }}>{a.icon}</span>
            <span style={{ fontSize:12, color:D.text2, lineHeight:1.5 }}>{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrgPreview() {
  const A = D.amber
  const cohorts = [
    { name:"Web Dev Batch 12",    avgElo:1240, topElo:1890 },
    { name:"Data Science — Jan",  avgElo:1080, topElo:1740 },
    { name:"Cybersecurity — Q2",  avgElo:1320, topElo:1960 },
  ]
  return (
    <div style={{ background:D.glass, border:`1px solid rgba(217,119,6,0.22)`, borderRadius:28, padding:24, backdropFilter:"blur(24px)", boxShadow:`0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(217,119,6,0.06), inset 0 1px 0 rgba(255,255,255,0.06)` }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:14, marginBottom:20 }}>
        <div>
          <div style={{ fontSize:10, color:D.text3, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:"'DM Mono',monospace" }}>Institution Intelligence Hub</div>
          <div style={{ fontFamily:"'DM Sans',serif", fontSize:24, fontWeight:800, color:D.text1, marginBottom:4 }}>BITS Pilani</div>
          <div style={{ fontSize:13, color:D.text2 }}>Premier Institution · Est. 1964</div>
        </div>
        <div style={{ background:`${A}14`, border:`1.5px solid ${A}40`, borderRadius:16, padding:"10px 12px", textAlign:"center", flexShrink:0, boxShadow:`0 0 20px ${A}18` }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:18, fontWeight:800, color:A }}>45K</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:A, letterSpacing:"0.12em", marginTop:4, fontWeight:800, textTransform:"uppercase" }}>Followers</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
        {[{l:"Active Cohorts",v:"8"},{l:"Total Students",v:"1,240"},{l:"Hired this yr",v:"312"}].map((s,i)=>(
          <div key={i} style={{ background:D.glassDeep, border:`1px solid ${D.border}`, borderRadius:14, padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:18, fontWeight:800, color:D.text1, marginBottom:3 }}>{s.v}</div>
            <div style={{ fontSize:9, color:D.text3, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, color:D.text3, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:10, fontFamily:"'DM Mono',monospace" }}>Cohort ELO Leaderboard</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {cohorts.map((c,i)=>(
          <div key={i} style={{ padding:"10px 14px", background:D.glassDeep, border:`1px solid ${D.border}`, borderRadius:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:700, color:D.text1 }}>{c.name}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:A, fontWeight:800 }}>Top: {c.topElo}</span>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ flex:1, height:6, borderRadius:999, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.round(c.avgElo/2000*100)}%`, borderRadius:999, background:`linear-gradient(90deg,${A},#F59E0B)`, boxShadow:`0 0 8px ${A}50` }}/>
              </div>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:D.text3, fontWeight:700, whiteSpace:"nowrap" }}>avg {c.avgElo}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfessionalOrbitPreview({ eloAnim }) {
  const P = D.violet
  const skills = [
    { label:"Python",        value:78, color:P },
    { label:"System Design", value:84, color:D.orange },
    { label:"SQL",           value:71, color:D.blue },
    { label:"AWS",           value:65, color:D.amber },
  ]
  const modules = ["Orbit","Signal","Forge","Nexus","Vault","Launchpad","Mentor Hub","Pulse"]
  const mColors = [D.orange,D.blue,D.green,P,D.amber,D.orange,D.green,D.violet]
  return (
    <div style={{ background:D.glass, border:`1px solid rgba(139,92,246,0.22)`, borderRadius:28, padding:24, backdropFilter:"blur(24px)", boxShadow:`0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(139,92,246,0.06), inset 0 1px 0 rgba(255,255,255,0.06)` }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:18, marginBottom:18 }}>
        <div>
          <div style={{ fontSize:10, color:D.text3, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:"'DM Mono',monospace" }}>Career Intelligence — Orbit</div>
          <div style={{ fontFamily:"'DM Sans',serif", fontSize:24, fontWeight:800, color:D.text1, marginBottom:4 }}>Priya Nambiar</div>
          <div style={{ fontSize:13, color:D.text2 }}>Senior SDE · Verified ✓</div>
        </div>
        <div style={{ minWidth:108, background:`${P}12`, border:`1.5px solid ${P}38`, borderRadius:18, padding:"12px 12px 10px", textAlign:"center", boxShadow:`0 0 24px ${P}20` }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:28, fontWeight:800, color:P, lineHeight:1 }}>{eloAnim.toLocaleString()}</div>
          <div style={{ fontSize:9, color:P, letterSpacing:"0.12em", marginTop:5, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", fontWeight:800 }}>ELO Score</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:18 }}>
        {[{ l:"Market Value", v:"₹21.4L" },{ l:"Layoff Shield", v:"82/100" },{ l:"Career Velocity", v:"+14%" }].map((s,i) => (
          <div key={i} style={{ background:D.glassDeep, border:`1px solid ${D.border}`, borderRadius:14, padding:"10px 8px", textAlign:"center" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:i===0?13:15, fontWeight:800, color:D.text1, marginBottom:2, lineHeight:1.1 }}>{s.v}</div>
            <div style={{ fontSize:9, color:D.text3, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, color:D.text3, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:10, fontFamily:"'DM Mono',monospace" }}>Skill Half-Life Radar</div>
      <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:16 }}>
        {skills.map((sk,i) => (
          <div key={i}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:13, color:D.text1, fontWeight:600 }}>{sk.label}</span>
              <span style={{ fontSize:11, color:sk.color, fontWeight:800, fontFamily:"'DM Mono',monospace" }}>{sk.value}% fresh</span>
            </div>
            <div style={{ height:6, borderRadius:999, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${sk.value}%`, borderRadius:999, background:sk.color, boxShadow:`0 0 8px ${sk.color}50` }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, color:D.text3, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:"'DM Mono',monospace" }}>Your modules</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {modules.map((m,i) => (
          <span key={i} style={{ fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:999, background:`${mColors[i]}12`, color:mColors[i], border:`1px solid ${mColors[i]}28`, fontFamily:"'DM Mono',monospace" }}>{m}</span>
        ))}
      </div>
    </div>
  )
}

function AuraPreview({ eloAnim, skills }) {
  return (
    <div style={{ background:D.glass, border:`1px solid rgba(255,87,1,0.22)`, borderRadius:28, padding:24, backdropFilter:"blur(24px)", boxShadow:`0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,87,1,0.08), inset 0 1px 0 rgba(255,255,255,0.06)` }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:18, marginBottom:20 }}>
        <div>
          <div style={{ fontSize:10, color:D.text3, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:"'DM Mono',monospace" }}>Live Aura Preview</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:700, color:D.text1, marginBottom:4 }}>Rahul Sharma</div>
          <div style={{ fontSize:13, color:D.text2, lineHeight:1.6 }}>Professional · Full Stack Developer</div>
        </div>
        <div style={{ minWidth:110, background:"rgba(255,87,1,0.12)", border:"1px solid rgba(255,87,1,0.28)", borderRadius:18, padding:"14px 14px 12px", textAlign:"center", boxShadow:"0 0 28px rgba(255,87,1,0.22)" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:30, fontWeight:800, color:D.orange, lineHeight:1 }}>{eloAnim.toLocaleString()}</div>
          <div style={{ fontSize:10, color:D.orange, letterSpacing:"0.12em", marginTop:6, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>Live ELO</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:22 }}>
        {[{ label:"Streak", value:"12" },{ label:"Tasks", value:"94" },{ label:"Job ready", value:"87%" }].map(stat => (
          <div key={stat.label} style={{ background:D.glassDeep, border:`1px solid ${D.border}`, borderRadius:16, padding:"14px 12px" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:20, fontWeight:800, color:D.text1, marginBottom:4 }}>{stat.value}</div>
            <div style={{ fontSize:10, color:D.text3, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>{stat.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:11, color:D.text3, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:12, fontFamily:"'DM Mono',monospace" }}>Skill graph</div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {skills.map((skill,i) => (
          <div key={i}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:12, marginBottom:5, alignItems:"center" }}>
              <span style={{ fontSize:13, color:D.text1, fontWeight:600 }}>{skill.label}</span>
              <span style={{ fontSize:12, color:skill.color||D.orange, fontWeight:800, fontFamily:"'DM Mono',monospace" }}>{skill.value}%</span>
            </div>
            <div style={{ height:7, borderRadius:999, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${skill.value}%`, borderRadius:999, background:skill.color||D.orange, boxShadow:`0 0 8px ${skill.color||D.orange}50` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted, onLogin }) {
  const [eloAnim,     setEloAnim]     = useState(800)
  const [activeFlow,  setActiveFlow]  = useState("student")
  const [pricingFlow, setPricingFlow] = useState("student")
  const [pricingKey,  setPricingKey]  = useState(0)

  // ── Live user counter ────────────────────────────────────────────
  const BASE_COUNT = 3000
  const getStoredCount = () => {
    try {
      const stored = localStorage.getItem("cap_user_count")
      const ts     = localStorage.getItem("cap_user_count_ts")
      if (!stored) return BASE_COUNT
      // Simulate growth even when away: +1 per 30s offline (max +200)
      const elapsed = ts ? Math.floor((Date.now() - Number(ts)) / 30000) : 0
      return Math.min(Number(stored) + Math.min(elapsed, 200), 99999)
    } catch { return BASE_COUNT }
  }
  const [liveCount, setLiveCount] = useState(getStoredCount)

  const switchPricingFlow = (path) => { setPricingFlow(path); setPricingKey(k => k+1) }

  useEffect(() => {
    const target=1847; let cur=800
    const t = setInterval(() => { cur=Math.min(cur+18,target); setEloAnim(cur); if(cur>=target) clearInterval(t) }, 22)
    return () => clearInterval(t)
  }, [])

  // Auto-increment live count while on page
  useEffect(() => {
    const tick = () => {
      setLiveCount(prev => {
        const next = prev + 1
        try {
          localStorage.setItem("cap_user_count", String(next))
          localStorage.setItem("cap_user_count_ts", String(Date.now()))
        } catch {}
        return next
      })
    }
    // Random interval 8–18s between each increment
    let timer
    const schedule = () => { timer = setTimeout(() => { tick(); schedule() }, 8000 + Math.random() * 10000) }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  const openPath = (path, source="landing") => {
    try { localStorage.setItem("capabilio_selected_path", path) } catch {}
    if (typeof onGetStarted === "function") onGetStarted({ path, source })
  }

  const FLOWS = {
    student:      { color:D.orange, label:"Student",      cta:"Start as student",          subtitle:"ELO starts at 400" },
    professional: { color:D.violet, label:"Professional", cta:"Build your Orbit profile",  subtitle:"Verified career · ELO starts at 800" },
    executive:    { color:D.gold,   label:"Executive",    cta:"Request invite",             subtitle:"Invite-only · Verified authority · Time marketplace" },
    institution:  { color:D.amber,  label:"Organisation", cta:"Create institution profile", subtitle:"College · Company · Verified ecosystem" },
  }
  const flow = FLOWS[activeFlow]

  const HERO = {
    student: {
      sectionLabel:"India's first ELO-rated hiring platform",
      stats:[{val:eloAnim.toLocaleString(),lbl:"Live ELO"},{val:"94",lbl:"Tasks done"},{val:"Top 3%",lbl:"Full stack"},{val:"18+",lbl:"Domains"}],
      desc:"Anyone can write \"5 years experience.\" Nobody can fake an ELO of 1,847. Prove your skills through real daily challenges matched to your actual level.",
    },
    professional: {
      sectionLabel:"India's first verified professional network",
      stats:[{val:eloAnim.toLocaleString(),lbl:"Live ELO"},{val:"₹21L",lbl:"Avg market value"},{val:"82/100",lbl:"Layoff shield"},{val:"8",lbl:"Pro modules"}],
      desc:"Upload your resume or LinkedIn URL. AI extracts your career timeline, skills, and JDs. Verify via UAN — employment history cross-matched automatically. Unverified profiles never appear in anyone's feed.",
    },
    executive: {
      sectionLabel:"Invite-only · Verified authority network",
      stats:[{val:"₹2.8L",lbl:"Avg monthly earnings"},{val:"340+",lbl:"Board seats filled"},{val:"92%",lbl:"Session repeat rate"},{val:"Invite-only",lbl:"Access model"}],
      desc:"Founders, CEOs, and domain authorities — sell your time through the Time Market, build Peer Circles, open Signal Rooms, and match privately on Venture Radar. Every profile is invite-only and identity-verified. This is not LinkedIn.",
    },
    institution: {
      sectionLabel:"Verified campus + company intelligence",
      stats:[{val:"220+",lbl:"Institutions"},{val:"1,240",lbl:"Students tracked"},{val:"Anonymous",lbl:"Rating system"},{val:"Auto",lbl:"Path transitions"}],
      desc:"Colleges track cohort ELO, run professor-assigned tasks, and pipeline placements automatically. Companies post verified profiles, anonymous employee ratings build your Company ELO, and ATS integration connects to recruiter.capabilio.online.",
    },
  }
  const hero = HERO[activeFlow]

  const SKILLS = [
    { label:"Python",           value:82 },
    { label:"SQL",              value:74 },
    { label:"Machine learning", value:61, color:D.violet },
    { label:"Tableau",          value:85 },
    { label:"Statistics",       value:78 },
  ]
  const ELO_HISTORY = [400,420,450,490,560,640,750,900,1050,1200,1400,1620,1847]
  const PORTFOLIO_TASKS = [
    { icon:"🗃️", title:"Razorpay Payment Failure Analysis", difficulty:"Hard",   type:"Data Analytics",      date:"Apr 13, 2026", score:92, eloDelta:32, scenario:"Analyse transaction failure patterns across 20 merchants. Identify top 3 with highest failure rates and primary failure payment methods.", code:"failure = df[df['status']=='failed']\nresult = failure.groupby('merchant_name')\\\n  .agg({'txn_id':'count','amount':'sum'})\\\n  .sort_values('txn_id',ascending=False).head(3)", strength:"Efficient groupby aggregation. Correct failure rate methodology.", improve:"Add percentage calculation. Visualise with matplotlib." },
    { icon:"💻", title:"Swiggy Order Management API",       difficulty:"Medium", type:"Software Engineering", date:"Apr 11, 2026", score:85, eloDelta:18, scenario:"Design a REST endpoint for Swiggy order management with paginated history, status and date range filtering.", code:"app.get('/orders/:id', async (req,res) => {\n  const {status,page=1} = req.query\n  const orders = await Order.find({customerId:req.params.id})\n    .skip((page-1)*20).limit(20)\n  res.json({orders})\n})", strength:"Clean pagination. Correct query structure.", improve:"Add input validation. Handle empty results." },
    { icon:"🔐", title:"Brute Force Attack Investigation",  difficulty:"Hard",   type:"Cyber Security",      date:"Apr 9, 2026",  score:78, eloDelta:14, scenario:"SOC alert: 847 failed login attempts from 192.168.1.45 in 3 minutes. Investigate and recommend mitigation.", code:"failed = logs[logs['status']=='FAILED_AUTH']\nattack_ip = failed.groupby('source_ip')['count'].sum()\nprint(f'Peak: {failed.resample(\"1T\").count().max()} req/min')", strength:"Correct pattern identification. Good timeline analysis.", improve:"Add SIEM query. Include MITRE ATT&CK reference." },
  ]
  const FEATURES = [
    { icon:"⚔️", title:"ARENA",          desc:"Daily real tasks from Indian companies. Python notebooks, SOC workstations, SQL editors. Every submission updates your ELO." },
    { icon:"✦",  title:"AURA DASHBOARD", desc:"Living skill graph. ELO history, radar chart, career momentum, verification badges. Your entire identity in one view." },
    { icon:"🎬", title:"BRANDING VIDEO", desc:"AI compiles your top Arena moments into a 53-second video. ELO animates, radar builds, portfolio plays. One click to share." },
    { icon:"📋", title:"PORTFOLIO",      desc:"Every task shows scenario, your actual code, AI review, and score. Recruiters see how you think — not what you claimed." },
    { icon:"🚀", title:"LAUNCHPAD",      desc:"Jobs matched by ELO, not keywords. Recruiters filter by real performance. You get found based on what you proved." },
    { icon:"📡", title:"PULSE",          desc:"Intelligence feed for your domain. GitHub trending, Reddit signals, authority drops — personalised to your ELO and keywords." },
  ]
  const PROFESSIONAL_FEATURES = [
    { icon:"🔆", title:"ORBIT",      desc:"Career Intelligence Dashboard. Career Health Score, Market Value, Layoff Shield, Skill Half-Life radar, and your auto-verified career timeline — all in one view." },
    { icon:"📶", title:"SIGNAL",     desc:"Market intelligence for your exact role. Live role demand trends, JD skill gap analysis, and compensation benchmarks updated weekly from real job postings." },
    { icon:"🔥", title:"FORGE",      desc:"Quiet Mode Challenges. 2–3 domain micro-questions, 5 minutes/week. Prevents skill ELO decay. Staying sharp, not being tested." },
    { icon:"🔗", title:"NEXUS",      desc:"Verified professional network. Connections, endorsements, and peer benchmarking — only with profiles that have passed UAN cross-match. No noise." },
    { icon:"🗃️", title:"VAULT",      desc:"Private store for credentials, offer letters, certs, and achievements. Share a custom link — recruiters see only what you unlock for them." },
    { icon:"🚀", title:"LAUNCHPAD",  desc:"Passive job matching. Opportunities find you by ELO + verified skills. You never upload a resume. Toggle: Open to work / Passive / Not looking." },
    { icon:"🎓", title:"MENTOR HUB", desc:"ELO 1400+ unlocks paid consultation listings. Set your rate and domains. Capabilio handles scheduling + payment. Revenue while employed." },
    { icon:"📡", title:"PULSE",      desc:"Verified-only professional newsfeed. Unverified profiles never appear. Industry signals, peer achievements, and domain insights — 100% real." },
  ]
  const EXECUTIVE_FEATURES = [
    { icon:"✦",  title:"LEGACY PROFILE",      desc:"Verified timeline of funding rounds, exits, board seats, patents, and keynotes. Cross-checked with news and company data. Not self-reported." },
    { icon:"⏱",  title:"TIME MARKET",         desc:"Sell 1:1 slots, group sessions, workshops, and async Q&A. Dynamic pricing. Capabilio handles booking and payment. Full earnings dashboard." },
    { icon:"🎙",  title:"SIGNAL ROOMS",        desc:"Live audio/video rooms for verified executives only. Scheduled, recorded, notified to followers. Every speaker is identity-verified." },
    { icon:"🃏",  title:"INSIGHT CARDS",       desc:"Structured short-form content: Problem → Insight → Lesson → Role verified. Forces quality over volume. Not tweets. Not LinkedIn posts." },
    { icon:"🔭",  title:"VENTURE RADAR",       desc:"Private signal matching for fundraising, co-founder search, and acqui-hire interest. Fully private until both sides match. Zero cold outreach." },
    { icon:"🪑",  title:"BOARD SEAT EXCHANGE", desc:"Companies post board seat openings. Executives apply with verified credentials. Capabilio verifies before match is shown. No LinkedIn DM spam." },
    { icon:"👥",  title:"PEER CIRCLE",         desc:"Private rooms of 5–15 verified executives at the same stage. Seed, Series A, IPO — curated by Capabilio. Safe space for board-level conversations." },
    { icon:"📊",  title:"INFLUENCE INDEX",     desc:"Executive ELO equivalent. Calculated from reach growth, session ratings, mentee outcomes, and verified achievements. Cannot be bought or inflated." },
    { icon:"🗺",  title:"DEAL ROOM",           desc:"Private encrypted workspace for pitch decks, term sheets, and cap tables. Shared with selected people only. Capabilio never reads the content." },
  ]
  const INSTITUTION_FEATURES = [
    { icon:"🏛️", title:"CAMPUS HUB",         desc:"Verified campus social layer. Only verified college email holders join. Posts, announcements, events, and student groups — all in one place." },
    { icon:"📋", title:"TASK ENGINE",         desc:"Professors assign custom Arena-style tasks to classes or batches. AI auto-grades. Results flow directly into student ELO and skill graph." },
    { icon:"📈", title:"COHORT INTELLIGENCE", desc:"Live ELO leaderboard per batch, department, campus. Placement team sees who is hire-ready. HOD sees department health. Principal sees institution-wide." },
    { icon:"💼", title:"PLACEMENT COMMAND",   desc:"Real-time: who got placed, what company, what package, which recruiter. In-campus offers auto-promote student to Professional path." },
    { icon:"🗂",  title:"PROJECT VAULT",       desc:"Final year projects and research papers auto-linked to student Aura portfolio. Professors endorse. Verified academic work, not self-claimed." },
    { icon:"🔗", title:"ALUMNI INTELLIGENCE", desc:"Graduates tracked on Capabilio. Institution sees alumni ELO growth as proof of education quality. A live, verifiable ranking signal." },
    { icon:"⭐", title:"ANONYMOUS RATINGS",   desc:"Day-30 onboarding + exit ratings. Company never knows who rated. Identity stripped. Min 5 ratings before company sees aggregated data." },
    { icon:"🧬", title:"COMPANY ELO",         desc:"Built from anonymous ratings + hire quality + retention data. Cannot be faked. Updated quarterly. A Glassdoor killer powered by verified timelines." },
    { icon:"🔌", title:"ATS INTEGRATION",     desc:"Sync with Workday, Greenhouse, Lever, Keka. Jobs posted here auto-sync to Launchpad. Webhook: 'Candidate X is now open to work.'" },
  ]
  const VERSUS_ROWS = [
    { old:'"5 yrs Python exp."',  new:"ELO 1,847 · 94 tasks"    },
    { old:'"ML Expert"',          new:"ML: 61% · Growing"        },
    { old:'"AWS Certified"',      new:"Arena: EC2 scored 89%"    },
    { old:'"Led eng team of 10"', new:"12-day streak · Hard: 23" },
  ]
  const problemRows = [
    { icon:"🐍", claim:'"5 years Python experience"',  reality:"Can't explain list comprehensions" },
    { icon:"🤖", claim:'"Machine Learning Expert"',    reality:"Never trained an end-to-end model" },
    { icon:"👥", claim:'"Led team of 10 engineers"',   reality:"Was a member of a team of 10" },
    { icon:"📊", claim:'"Data-driven decision maker"', reality:"Used Excel once in 2019" },
    { icon:"☁️", claim:'"AWS Certified"',              reality:"Watched 3 YouTube videos" },
    { icon:"💬", claim:'"Strong communication skills"',reality:"Copied from the last resume" },
  ]
  const networkRows = [
    { name:"Rohan Mehta",     role:"Founder & CEO",       co:"PayStack India", followers:"12.4K", posts:38, color:D.violet, type:"Founder"     },
    { name:"Dr. Priya Singh", role:"Professor",           co:"IIT Hyderabad",  followers:"8.2K",  posts:24, color:D.orange, type:"Professor"   },
    { name:"Arjun Kapoor",    role:"CTO",                 co:"Razorpay",       followers:"19.1K", posts:51, color:D.green,  type:"Executive"   },
    { name:"BITS Pilani",     role:"Premier Institution", co:"Est. 1964",      followers:"45K",   posts:67, color:D.amber,  type:"Institution" },
  ]

  const PRICING = {
    student: {
      headline: <>Pick your pace.<br /><span style={{ color:D.orange, fontStyle:"italic" }}>Invest in your career.</span></>,
      sub: "ELO-ranked proof, AI interviews, and market intelligence — start free, no card needed.",
      note: "Monthly plans · Cancel anytime · Powered by Razorpay · Prices in INR",
      plans: [
        { label:"Free",  price:null,      accent:"#6B6560", featured:false, features:["1 Arena task every 15 days","Portfolio generation","Locked premium previews","Market reports at ₹49/report"], cta:"GET STARTED FREE →", ctaStyle:{ background:D.glass, backdropFilter:"blur(12px)", color:D.text1, border:`1px solid ${D.border}` } },
        { label:"Pro",   price:"₹299/mo", sub:"Billed monthly", accent:"#3D4EAC", featured:false, features:["3 Arena tasks per day","3 AI Interview sessions/month","1 market report/month","Full Arena access","Portfolio generation"], cta:"START PRO →", ctaStyle:{ background:"#3D4EAC", color:"#fff" } },
        { label:"Elite", price:"₹599/mo", sub:"Best value",     accent:"#B8620A", featured:true,  features:["6 Arena tasks per day","5 AI Interview sessions/month","2 market reports/month","Personal branding video","Full advanced Arena","Portfolio generation"], cta:"GO ELITE →", ctaStyle:{ background:"linear-gradient(135deg,#FF5701,#B8620A)", color:"#fff", boxShadow:"0 8px 28px rgba(255,87,1,0.4)" } },
      ],
    },
    professional: {
      headline: <>Career intelligence,<br /><span style={{ color:D.violet, fontStyle:"italic" }}>worth every rupee.</span></>,
      sub: "Compensation Intelligence alone can unlock a ₹2–5L salary bump. Mentor Hub earnings cover your plan in one session.",
      note: "Monthly plans · Cancel anytime · Powered by Razorpay · Prices in INR",
      plans: [
        { label:"Free",            price:null,      accent:"#6B6560", featured:false, features:["Basic Orbit dashboard","1 Forge challenge/week","Public verified profile","UAN verification"], cta:"START FREE →", ctaStyle:{ background:D.glass, backdropFilter:"blur(12px)", color:D.text1, border:`1px solid ${D.border}` } },
        { label:"Capabilio Pro",   price:"₹499/mo", sub:"₹3,999/yr — save 33%", accent:D.violet, featured:true,  features:["Full Orbit — all 4 career signals","Unlimited Forge challenges","Signal — 3 market reports/mo","Compensation Intelligence","Gap Mode + Gap Narrative Engine","Vault full verification","Nexus verified network"], cta:"GO CAPABILIO PRO →", ctaStyle:{ background:`linear-gradient(135deg,${D.violet},#7C3AED)`, color:"#fff", boxShadow:"0 8px 28px rgba(139,92,246,0.4)" } },
        { label:"Capabilio Elite", price:"₹999/mo", sub:"₹7,999/yr — save 33%", accent:"#4F46E5", featured:false, features:["Everything in Capabilio Pro","AI Interview — 5 sessions/mo","Mentor Hub listing (15% commission)","Transition Tracks access","Return-Ready Sprint","Signal — unlimited reports","Priority Launchpad matching"], cta:"GO CAPABILIO ELITE →", ctaStyle:{ background:"#4F46E5", color:"#fff" } },
      ],
    },
    executive: {
      headline: <>Your plan lowers commission.<br /><span style={{ color:D.gold, fontStyle:"italic" }}>One session pays for it.</span></>,
      sub: "Luminary vs Authority: upgrading saves ₹3,000/mo in commissions on ₹50K monthly sessions. The plan pays for itself.",
      note: "Invite-only · Annual pricing available · Powered by Razorpay · All prices in INR",
      plans: [
        { label:"Authority", price:"₹1,499/mo", sub:"₹14,999/yr — save 17%", accent:D.gold, featured:false, features:["Verified Legacy Profile","Time Market — 18% commission","2 Signal Rooms/month","Insight Cards (unlimited)","Peer Circle access","Influence Index dashboard"], cta:"REQUEST INVITE →", ctaStyle:{ background:D.glass, backdropFilter:"blur(12px)", color:D.gold, border:`1px solid ${D.gold}40` } },
        { label:"Luminary",  price:"₹2,999/mo", sub:"₹29,999/yr — save 17%", accent:D.gold, featured:true,  features:["Everything in Authority","Time Market — 12% commission","Unlimited Signal Rooms","Venture Radar — private matching","Board Seat Exchange","Deal Room (3 active)","Peer Circle hosting"], cta:"REQUEST INVITE →", ctaStyle:{ background:`linear-gradient(135deg,${D.gold},#92680A)`, color:"#fff", boxShadow:`0 8px 28px rgba(201,168,76,0.4)` } },
        { label:"Legacy",    price:"₹7,999/mo", sub:"Custom annual pricing",  accent:"#92680A", featured:false, features:["Everything in Luminary","Time Market — 8% commission","Unlimited Deal Rooms","Dedicated relationship manager","Co-hosted Signal Rooms","Priority cross-network promotion"], cta:"REQUEST INVITE →", ctaStyle:{ background:D.glassDeep, backdropFilter:"blur(12px)", color:D.gold, border:`1px solid ${D.gold}30` } },
      ],
    },
    institution: {
      headline: <>One plan per campus.<br /><span style={{ color:D.amber, fontStyle:"italic" }}>Priced for your institution.</span></>,
      sub: "A bad hire costs ₹80,000+. One better placement decision pays for the year. Pricing is scoped to your student/employee count — talk to us.",
      note: "Annual contracts · Custom scoping per institution · Powered by Razorpay · GST applicable",
      // Deliberately no plan cards with numbers here (2026-08-02) — institution
      // pricing is negotiated per-college, not a fixed self-serve tier like the
      // other three paths. Showing a number here would undercut that negotiation
      // before a conversation even starts.
      plans: [],
    },
  }

  // ── Inline row list used in "Timeline" / "Institution" sections
  const proTimelineRows = [
    { icon:"✦", color:D.green,  label:"Verified via UAN",         desc:"Employment history cross-matched with EPFO records. Start and end dates locked." },
    { icon:"⚡", color:D.violet, label:"Auto-updates on new role", desc:"JD, skills, salary band, and start date populate automatically. No form filling." },
    { icon:"🌿", color:D.orange, label:"Promotion branches",       desc:"Role changes appear as a new branch on your timeline — set by your recruiter, never self-reported." },
    { icon:"⚠",  color:"#DC2626",label:"Self-claims flagged",       desc:"Anything entered manually is marked 'Self-claimed' in your public profile. Recruiters see the difference." },
  ]
  const execLegacyRows = [
    { icon:"📰", color:D.gold,   label:"Cross-verified with news sources",     desc:"Funding rounds, acquisitions, and keynotes are matched against public records. No fake claims." },
    { icon:"⏱",  color:D.orange, label:"Time Market earnings tracked",         desc:"Session history, ratings, repeat client rate, and total earnings visible to you — private from others." },
    { icon:"🔒", color:D.violet, label:"Invite-only access model",             desc:"You cannot self-onboard. Capabilio verifies every executive before their profile goes live." },
    { icon:"📊", color:D.green,  label:"Influence Index replaces follower count",desc:"Calculated from mentee outcomes, session ratings, community engagement, and verified achievements." },
  ]
  const orgRows = [
    { icon:"📈", color:D.amber,  label:"Live Cohort ELO",      desc:"Placement team sees hire-ready students in real time. No manual reporting." },
    { icon:"🔄", color:D.green,  label:"Auto path transitions", desc:"In-campus offer → Professional path. Graduate without offer → Student path. Fully automatic." },
    { icon:"⭐", color:D.blue,   label:"Anonymous ratings",     desc:"Day-30 + exit ratings. Reviewer identity never disclosed. Min 5 ratings before company sees data." },
    { icon:"🧬", color:D.orange, label:"Company ELO",           desc:"Built from hire quality + retention + ratings. Cannot be faked. Updated quarterly." },
  ]

  // ── Glass card helper for detail rows
  const DetailRow = ({ icon, color, label, desc }) => (
    <div style={{ display:"flex", gap:14, alignItems:"flex-start", padding:"14px 18px", background:D.glassDeep, border:`1px solid ${D.border}`, borderRadius:16, backdropFilter:"blur(12px)" }}>
      <div style={{ width:36, height:36, borderRadius:10, background:`${color}14`, border:`1px solid ${color}28`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, boxShadow:`0 0 12px ${color}18` }}>{icon}</div>
      <div>
        <div style={{ fontSize:14, fontWeight:700, color:D.text1, marginBottom:3 }}>{label}</div>
        <div style={{ fontSize:13, color:D.text2, lineHeight:1.6 }}>{desc}</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:"100vh", background:D.bg, color:D.text1, overflowX:"hidden", fontFamily:"'DM Sans',sans-serif", position:"relative" }}>

      {/* ── Global ambient glow orbs ───────────────────────────────── */}
      <div aria-hidden style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-20%", left:"-10%", width:"60vw", height:"60vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(255,87,1,0.09) 0%, transparent 70%)", filter:"blur(80px)" }} />
        <div style={{ position:"absolute", top:"30%",  right:"-15%", width:"50vw", height:"50vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)", filter:"blur(80px)" }} />
        <div style={{ position:"absolute", bottom:"-10%", left:"20%", width:"50vw", height:"50vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)", filter:"blur(80px)" }} />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing:border-box; }
        .lp-container { max-width:1180px; margin:0 auto; padding-left:24px; padding-right:24px; position:relative; z-index:1; }
        .lp-grid-hero { display:grid; grid-template-columns:1.05fr 0.95fr; gap:40px; align-items:center; }
        .lp-grid-2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; }
        .lp-grid-3 { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; }
        .lp-grid-4 { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; }
        .lp-fade-up   { animation:lpFadeUp 0.5s ease both; }
        .lp-fade-up-2 { animation:lpFadeUp 0.65s ease both; }
        @keyframes lpFadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @media (max-width:1024px) { .lp-grid-hero,.lp-grid-2,.lp-grid-3,.lp-grid-4 { grid-template-columns:1fr; } }
        @media (max-width:720px)  { .lp-container { padding-left:18px; padding-right:18px; } }

        .pricing-path-tile { cursor:pointer; border-radius:20px; padding:18px 16px; border:2px solid transparent; transition:all 240ms cubic-bezier(0.16,1,0.3,1); position:relative; overflow:hidden; backdrop-filter:blur(16px); }
        .pricing-path-tile:hover { transform:translateY(-3px) scale(1.02); }
        .pricing-path-tile.active { transform:translateY(-4px) scale(1.03); }

        @keyframes planIn { from { opacity:0; transform:translateY(28px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
        .plan-card-anim { animation:planIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .plan-card-anim:nth-child(1) { animation-delay:0s; }
        .plan-card-anim:nth-child(2) { animation-delay:0.08s; }
        .plan-card-anim:nth-child(3) { animation-delay:0.16s; }

        .pricing-tiles-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:36px; }
        @media (max-width:880px) { .pricing-tiles-row { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:500px) { .pricing-tiles-row { grid-template-columns:1fr 1fr; gap:10px; } }

        ::selection { background:rgba(255,87,1,0.25); }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background:rgba(255,87,1,0.3); border-radius:999px; }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        .live-dot { animation: pulse-dot 1.8s ease-in-out infinite; }
        @keyframes count-bump { 0%{transform:translateY(0)} 50%{transform:translateY(-3px)} 100%{transform:translateY(0)} }
        .count-bump { animation: count-bump 0.3s cubic-bezier(0.16,1,0.3,1); }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav style={{ position:"sticky", top:0, zIndex:50, background:"rgba(3,3,8,0.82)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderBottom:`1px solid ${D.border}` }}>
        <div className="lp-container" style={{ minHeight:68, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap", paddingTop:10, paddingBottom:10 }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:800, color:D.text1, letterSpacing:"-0.03em" }}>
            Capabilio <span style={{ color:D.orange }}>AI</span>
          </div>

          {/* ── Live user count pill ────────────── */}
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(22,163,74,0.08)", border:"1px solid rgba(22,163,74,0.22)", borderRadius:999, padding:"7px 14px", backdropFilter:"blur(12px)" }}>
            <span className="live-dot" style={{ width:7, height:7, borderRadius:"50%", background:"#22C55E", display:"inline-block", flexShrink:0, boxShadow:"0 0 8px #22C55E" }} />
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:800, color:"#22C55E", letterSpacing:"0.02em" }}>
              {liveCount.toLocaleString("en-IN")}
            </span>
            <span style={{ fontSize:11, color:"rgba(240,237,232,0.55)", fontFamily:"'DM Mono',monospace", fontWeight:600 }}>users online</span>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <GhostButton onClick={onLogin}>SIGN IN</GhostButton>
            <PrimaryButton onClick={() => openPath(activeFlow,"nav")}>GET STARTED</PrimaryButton>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{ padding:"72px 0 88px" }}>
        <div className="lp-container">
          <div className="lp-grid-hero">
            <div className="lp-fade-up">
              <SectionLabel>{hero.sectionLabel}</SectionLabel>
              <h1 style={{ color:D.text1, marginBottom:20, fontSize:"clamp(38px,6vw,66px)", lineHeight:0.98, letterSpacing:"-0.05em", fontWeight:800 }}>
                {activeFlow==="student" ? (
                  <>Your resume lies.<br /><span style={{ color:D.orange, fontStyle:"italic" }}>Your ELO doesn&apos;t.</span></>
                ) : activeFlow==="professional" ? (
                  <>Your title is claimed.<br /><span style={{ color:D.violet, fontStyle:"italic" }}>Your career is proven.</span></>
                ) : activeFlow==="executive" ? (
                  <>Your authority is real.<br /><span style={{ color:D.gold, fontStyle:"italic" }}>Now monetize it.</span></>
                ) : (
                  <>One platform.<br /><span style={{ color:D.amber, fontStyle:"italic" }}>Two institution types.</span></>
                )}
              </h1>
              <p style={{ fontSize:17, color:D.text2, maxWidth:560, marginBottom:32, lineHeight:1.85 }}>{hero.desc}</p>

              {/* Path selector */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:28 }}>
                {Object.entries(FLOWS).map(([key,f]) => (
                  <PathOptionCard key={key} item={f} isActive={activeFlow===key} onClick={() => setActiveFlow(key)} />
                ))}
              </div>

              {/* CTAs */}
              <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:32 }}>
                <PrimaryButton onClick={() => openPath(activeFlow,"hero")}>{flow.cta.toUpperCase()} →</PrimaryButton>
                <GhostButton onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior:"smooth" })}>SEE HOW IT WORKS</GhostButton>
              </div>

              {/* Stats bar */}
              <div style={{ display:"flex", gap:28, paddingTop:22, borderTop:`1px solid ${D.border}`, flexWrap:"wrap" }}>
                {hero.stats.map((s,i) => (
                  <div key={i}>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:22, color:flow.color, lineHeight:1, fontWeight:800, textShadow:`0 0 20px ${flow.color}50` }}>{s.val}</div>
                    <div style={{ fontSize:10, color:D.text3, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginTop:5, fontFamily:"'DM Mono',monospace" }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: preview card */}
            <div className="lp-fade-up-2">
              {activeFlow==="executive"   ? <ExecutivePreview /> :
               activeFlow==="institution" ? <OrgPreview /> :
               activeFlow==="professional"? <ProfessionalOrbitPreview eloAnim={eloAnim} /> :
               <AuraPreview eloAnim={eloAnim} skills={SKILLS} />}
            </div>
          </div>
        </div>
      </section>

      {/* ── PATHS ───────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding:"10px 0 88px" }}>
        <div className="lp-container">
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <SectionLabel>Choose your path</SectionLabel>
            <h2 style={{ fontSize:"clamp(32px,5vw,54px)", lineHeight:1.05, letterSpacing:"-0.04em", color:D.text1, marginBottom:14, fontWeight:800 }}>One platform.<br /><span style={{ color:D.orange, fontStyle:"italic" }}>Four journeys.</span></h2>
            <p style={{ fontSize:16, color:D.text2, maxWidth:760, margin:"0 auto 10px", lineHeight:1.85 }}>Students prove readiness. Professionals maintain relevance. Organisations measure talent health. Executives monetize authority.</p>
            <p style={{ fontSize:13, color:D.text3, maxWidth:600, margin:"0 auto", lineHeight:1.7, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>All powered by one trust-and-ELO backbone.</p>
          </div>
          <div className="lp-grid-2">
            <PathCard icon="🎓" title="Student"      desc="25 beginner MCQs calibrate your starting radar. ELO begins at 400 and compounds through daily Arena challenges." badge="ELO starts at 400" onClick={() => openPath("student","path-card")} />
            <PathCard icon="💼" title="Professional" desc="Upload resume or LinkedIn URL. AI auto-builds your verified career timeline, Skill Half-Life radar, and compensation intelligence. UAN cross-match locks your history." badge="Verified network" badgeColor="purple" featured onClick={() => openPath("professional","path-card")} />
            <PathCard icon="✦"  title="Executive"    desc="Invite-only. Founders and CEOs sell time via Time Market, host Signal Rooms, match privately on Venture Radar, and access the Board Seat Exchange. Verified legacy profile." badge="Invite-only" badgeColor="amber" onClick={() => openPath("executive","path-card")} />
            <PathCard icon="🏛️" title="Organisation" desc="Colleges: Cohort ELO, professor tasks, auto placement pipeline, alumni intelligence. Companies: verified profile, anonymous rating system, Company ELO, ATS integration." badge="College · Company" badgeColor="amber" onClick={() => openPath("institution","path-card")} />
          </div>
        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────────────────────────────── */}
      <section style={{ padding:"0 0 88px" }}>
        <div className="lp-container">
          <div style={{ background:D.glass, border:`1px solid ${D.border}`, borderRadius:30, padding:"38px 26px", backdropFilter:"blur(24px)", boxShadow:`0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)` }}>
            <div style={{ textAlign:"center", marginBottom:36 }}>
              <SectionLabel>The problem nobody talks about</SectionLabel>
              <h2 style={{ fontSize:"clamp(30px,5vw,50px)", lineHeight:1.06, color:D.text1, marginBottom:14, letterSpacing:"-0.04em", fontWeight:800 }}>Resumes are the world&apos;s most<br /><span style={{ color:D.orange, fontStyle:"italic" }}>successful lie.</span></h2>
              <p style={{ fontSize:15, color:D.text2, maxWidth:680, margin:"0 auto", lineHeight:1.8 }}>Every hiring manager knows this. They spend 6 seconds on a resume and still can't tell who can actually do the job.</p>
            </div>
            <div className="lp-grid-3">
              {problemRows.map((r,i) => (
                <div key={i} style={{ background:D.glassDeep, border:`1px solid ${D.border}`, borderRadius:20, padding:20 }}>
                  <div style={{ fontSize:26, marginBottom:12 }}>{r.icon}</div>
                  <div style={{ fontSize:15, fontWeight:700, color:D.text1, marginBottom:10, lineHeight:1.45, fontStyle:"italic" }}>{r.claim}</div>
                  <div style={{ height:1, background:"rgba(220,38,38,0.22)", marginBottom:10 }} />
                  <div style={{ fontSize:13, color:"#EF4444", lineHeight:1.6 }}>Reality: {r.reality}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ELO ─────────────────────────────────────────────────────── */}
      <section style={{ padding:"0 0 88px" }}>
        <div className="lp-container">
          <div className="lp-grid-2" style={{ alignItems:"center" }}>
            <div>
              <SectionLabel>Live skill rating</SectionLabel>
              <h2 style={{ fontSize:"clamp(32px,5vw,52px)", lineHeight:1.05, color:D.text1, marginBottom:16, letterSpacing:"-0.04em", fontWeight:800 }}>A number that<br /><span style={{ color:D.orange, fontStyle:"italic" }}>can&apos;t be faked.</span></h2>
              <p style={{ fontSize:15, color:D.text2, marginBottom:28, lineHeight:1.85 }}>Like chess.com — your ELO is earned through real performance. It rises when you solve hard problems, drops when you go inactive, and cannot be self-reported or inflated.</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
                {["400+ Student","800+ Professional","1000+ Proficient","1400+ Expert"].map((tier,i) => (
                  <span key={i} style={{ padding:"8px 12px", borderRadius:999, fontSize:10, letterSpacing:"0.10em", textTransform:"uppercase", fontWeight:800, fontFamily:"'DM Mono',monospace", background: tier.includes("1000+") ? "rgba(255,87,1,0.12)" : D.glass, color: tier.includes("1000+") ? D.orange : D.text2, border:`1px solid ${tier.includes("1000+") ? "rgba(255,87,1,0.28)" : D.border}`, backdropFilter:"blur(12px)" }}>{tier}</span>
                ))}
              </div>
              {["Goes up when you solve hard problems.","Drops if you are inactive for 7+ days.","Cannot be self-reported or inflated.","Comparable across all users globally."].map((t,i) => (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"12px 14px", background:D.glass, border:`1px solid ${D.border}`, borderRadius:16, marginBottom:10, backdropFilter:"blur(12px)" }}>
                  <span style={{ fontSize:14, color:D.orange }}>✦</span>
                  <span style={{ fontSize:14, color:D.text2 }}>{t}</span>
                </div>
              ))}
            </div>
            {/* ELO card */}
            <div style={{ background:D.glass, border:`1px solid rgba(255,87,1,0.22)`, borderRadius:28, padding:24, backdropFilter:"blur(24px)", boxShadow:`0 24px 60px rgba(0,0,0,0.5), 0 0 60px rgba(255,87,1,0.06), inset 0 1px 0 rgba(255,255,255,0.06)` }}>
              <div style={{ textAlign:"center", marginBottom:24 }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:66, color:D.orange, lineHeight:1, marginBottom:6, fontWeight:800, textShadow:`0 0 40px rgba(255,87,1,0.4)` }}>1,847</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:D.text3, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700 }}>Proficient · Top 8%</div>
              </div>
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, gap:14 }}>
                  <span style={{ fontSize:10, color:D.text3, letterSpacing:"0.10em", textTransform:"uppercase", fontWeight:700, fontFamily:"'DM Mono',monospace" }}>ELO Growth</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:D.orange, fontWeight:700 }}>400 → 1,847</span>
                </div>
                <EloSparkline points={ELO_HISTORY} width={380} height={70} />
              </div>
              <div style={{ border:`1px solid ${D.border}`, borderRadius:18, overflow:"hidden" }}>
                {VERSUS_ROWS.map((row,i) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:i!==VERSUS_ROWS.length-1?`1px solid ${D.border}`:"none" }}>
                    <div style={{ padding:"12px 14px", background:D.glassDeep, color:D.text3, fontSize:13, lineHeight:1.6 }}>{row.old}</div>
                    <div style={{ padding:"12px 14px", background:"rgba(255,87,1,0.06)", color:D.orange, fontSize:13, lineHeight:1.6, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{row.new}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section style={{ padding:"0 0 88px" }}>
        <div className="lp-container">
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <SectionLabel>Platform modules</SectionLabel>
            {activeFlow==="professional" ? (
              <>
                <h2 style={{ fontSize:"clamp(32px,5vw,52px)", lineHeight:1.05, color:D.text1, marginBottom:14, letterSpacing:"-0.04em", fontWeight:800 }}>Eight modules.<br /><span style={{ color:D.violet, fontStyle:"italic" }}>One verified career.</span></h2>
                <p style={{ fontSize:15, color:D.text2, maxWidth:700, margin:"0 auto", lineHeight:1.85 }}>Career intelligence, market signals, skill maintenance, and passive job matching — for professionals who are employed and want to stay ahead without grinding daily tasks.</p>
              </>
            ) : activeFlow==="executive" ? (
              <>
                <h2 style={{ fontSize:"clamp(32px,5vw,52px)", lineHeight:1.05, color:D.text1, marginBottom:14, letterSpacing:"-0.04em", fontWeight:800 }}>Nine surfaces.<br /><span style={{ color:D.gold, fontStyle:"italic" }}>One authority network.</span></h2>
                <p style={{ fontSize:15, color:D.text2, maxWidth:700, margin:"0 auto", lineHeight:1.85 }}>A premium verified network where founders, CEOs, and domain authorities monetize time, match privately, and build influence — with an integrity floor no other platform enforces.</p>
              </>
            ) : activeFlow==="institution" ? (
              <>
                <h2 style={{ fontSize:"clamp(32px,5vw,52px)", lineHeight:1.05, color:D.text1, marginBottom:14, letterSpacing:"-0.04em", fontWeight:800 }}>Nine modules.<br /><span style={{ color:D.amber, fontStyle:"italic" }}>One verified ecosystem.</span></h2>
                <p style={{ fontSize:15, color:D.text2, maxWidth:700, margin:"0 auto", lineHeight:1.85 }}>Colleges track cohort ELO and automate placements. Companies build verified profiles and earn trust through anonymous ratings. Both run on the same talent intelligence backbone.</p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize:"clamp(32px,5vw,52px)", lineHeight:1.05, color:D.text1, marginBottom:14, letterSpacing:"-0.04em", fontWeight:800 }}>Five modules.<br /><span style={{ color:D.orange, fontStyle:"italic" }}>Zero resumes.</span></h2>
                <p style={{ fontSize:15, color:D.text2, maxWidth:700, margin:"0 auto", lineHeight:1.85 }}>Interlocking modules replace your resume, cover letter, and LinkedIn with live, verifiable proof of work.</p>
              </>
            )}
          </div>
          {activeFlow==="professional" ? <div className="lp-grid-4">{PROFESSIONAL_FEATURES.map((f,i)=><FeatureCard key={i} item={f}/>)}</div>
          : activeFlow==="executive"   ? <div className="lp-grid-3">{EXECUTIVE_FEATURES.map((f,i)=><FeatureCard key={i} item={f}/>)}</div>
          : activeFlow==="institution" ? <div className="lp-grid-3">{INSTITUTION_FEATURES.map((f,i)=><FeatureCard key={i} item={f}/>)}</div>
          : <div className="lp-grid-3">{FEATURES.map((f,i)=><FeatureCard key={i} item={f}/>)}</div>}
        </div>
      </section>

      {/* ── ECHOPITCH ─────────────────────────────────────────────────
          Real, generated video+audio demo (Canvas + Deepgram TTS, the
          same engine EchoPitch itself uses) — not a static/uploaded
          video file. No user data is available on this public page, so
          the demo runs generic product narration with no profile photo
          (EchoPitchDemoPlayer only draws a portrait when avatarUrl is
          passed — see its header comment). */}
      <section style={{ padding:"0 0 88px" }}>
        <div className="lp-container">
          <div style={{ background:"radial-gradient(circle at 20% 15%, rgba(0,210,255,0.08), rgba(3,3,8,0) 55%)",
            border:"1px solid rgba(255,255,255,0.1)", borderRadius:30, padding:"44px 30px",
            backdropFilter:"blur(24px)", boxShadow:"0 24px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:36, alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ flex:"1 1 380px", minWidth:280 }}>
                <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:99,
                  background:"linear-gradient(135deg,#F5C453,#D89B2A)", color:"#1a1408", fontSize:10, fontWeight:900,
                  letterSpacing:1, marginBottom:14 }}>✦ ELITE EXCLUSIVE</span>
                <h2 style={{ fontSize:"clamp(30px,5vw,48px)", lineHeight:1.06, color:D.text1, marginBottom:12,
                  letterSpacing:"-0.04em", fontWeight:800 }}>
                  Introducing <span style={{ color:"#00D2FF", fontStyle:"italic" }}>EchoPitch</span>
                </h2>
                <p style={{ fontSize:15, color:D.text2, maxWidth:520, lineHeight:1.85, marginBottom:18 }}>
                  A cinematic, narrated video pitch built entirely from your real Capabilio evidence — Arena
                  missions, ELO growth, and skills. Real AI voiceover, baked into a video you download and share.
                  Not a template. Not a resume.
                </p>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <PrimaryButton onClick={() => openPath(activeFlow,"echopitch-cta")}>BUILD YOUR ECHOPITCH →</PrimaryButton>
                </div>
              </div>
              <div style={{ flex:"1 1 380px", minWidth:280, display:"flex", justifyContent:"center" }}>
                <EchoPitchDemoPlayer />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PORTFOLIO / PATH-SPECIFIC PROOF ─────────────────────────── */}
      <section style={{ padding:"0 0 88px" }}>
        <div className="lp-container">
          {activeFlow==="executive" ? (
            <div style={{ background:`linear-gradient(135deg, rgba(201,168,76,0.06), rgba(3,3,8,0) 60%)`, border:`1px solid rgba(201,168,76,0.2)`, borderRadius:30, padding:"38px 26px", backdropFilter:"blur(24px)", boxShadow:`0 24px 80px rgba(0,0,0,0.5), 0 0 60px rgba(201,168,76,0.06)` }}>
              <div style={{ textAlign:"center", marginBottom:36 }}>
                <SectionLabel>Verified legacy profile</SectionLabel>
                <h2 style={{ fontSize:"clamp(30px,5vw,50px)", lineHeight:1.06, color:D.text1, marginBottom:14, letterSpacing:"-0.04em", fontWeight:800 }}>Your authority timeline.<br /><span style={{ color:D.gold, fontStyle:"italic" }}>Verified, not claimed.</span></h2>
                <p style={{ fontSize:15, color:D.text2, maxWidth:680, margin:"0 auto 28px", lineHeight:1.8 }}>Every funding round, board seat, exit, patent, and keynote — cross-verified with news sources and company data. Not self-reported. Your legacy profile is the single most credible executive record in India.</p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:680, margin:"0 auto 28px" }}>
                {execLegacyRows.map((r,i) => <DetailRow key={i} {...r} />)}
              </div>
              <div style={{ textAlign:"center" }}><PrimaryButton onClick={() => openPath("executive","exec-legacy-cta")}>REQUEST EXECUTIVE INVITE →</PrimaryButton></div>
            </div>
          ) : activeFlow==="institution" ? (
            <div style={{ background:`linear-gradient(135deg, rgba(217,119,6,0.06), rgba(3,3,8,0) 60%)`, border:`1px solid rgba(217,119,6,0.2)`, borderRadius:30, padding:"38px 26px", backdropFilter:"blur(24px)", boxShadow:`0 24px 80px rgba(0,0,0,0.5), 0 0 60px rgba(217,119,6,0.04)` }}>
              <div style={{ textAlign:"center", marginBottom:36 }}>
                <SectionLabel>Cohort intelligence + company trust</SectionLabel>
                <h2 style={{ fontSize:"clamp(30px,5vw,50px)", lineHeight:1.06, color:D.text1, marginBottom:14, letterSpacing:"-0.04em", fontWeight:800 }}>Talent health, measured.<br /><span style={{ color:D.amber, fontStyle:"italic" }}>Trust, built automatically.</span></h2>
                <p style={{ fontSize:15, color:D.text2, maxWidth:680, margin:"0 auto 28px", lineHeight:1.8 }}>Colleges see cohort ELO in real time. Students auto-transition to Professional path when placed. Companies earn a verified Company ELO from anonymous employee ratings — and it cannot be gamed.</p>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, maxWidth:720, margin:"0 auto 28px" }}>
                {orgRows.map((r,i) => <DetailRow key={i} {...r} />)}
              </div>
              <div style={{ textAlign:"center" }}><PrimaryButton onClick={() => openPath("institution","org-cta")}>CREATE INSTITUTION PROFILE →</PrimaryButton></div>
            </div>
          ) : activeFlow==="professional" ? (
            <div style={{ background:`linear-gradient(135deg, rgba(139,92,246,0.06), rgba(3,3,8,0) 60%)`, border:`1px solid rgba(139,92,246,0.2)`, borderRadius:30, padding:"38px 26px", backdropFilter:"blur(24px)", boxShadow:`0 24px 80px rgba(0,0,0,0.5), 0 0 60px rgba(139,92,246,0.04)` }}>
              <div style={{ textAlign:"center", marginBottom:36 }}>
                <SectionLabel>Auto-verified career timeline</SectionLabel>
                <h2 style={{ fontSize:"clamp(30px,5vw,50px)", lineHeight:1.06, color:D.text1, marginBottom:14, letterSpacing:"-0.04em", fontWeight:800 }}>Every career move.<br /><span style={{ color:D.violet, fontStyle:"italic" }}>Verified, not claimed.</span></h2>
                <p style={{ fontSize:15, color:D.text2, maxWidth:680, margin:"0 auto 28px", lineHeight:1.8 }}>When you join a new company through Capabilio, your timeline auto-updates with the JD, skills, and start date. When you're promoted, your recruiter updates it and a new branch appears. You never touch it. Anything you add yourself is flagged as self-claimed.</p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:680, margin:"0 auto 28px" }}>
                {proTimelineRows.map((r,i) => <DetailRow key={i} {...r} />)}
              </div>
              <div style={{ textAlign:"center" }}><PrimaryButton onClick={() => openPath("professional","timeline-cta")}>BUILD YOUR VERIFIED TIMELINE →</PrimaryButton></div>
            </div>
          ) : (
            <>
              <div style={{ textAlign:"center", marginBottom:34 }}>
                <SectionLabel>Public portfolio</SectionLabel>
                <h2 style={{ fontSize:"clamp(32px,5vw,52px)", lineHeight:1.05, color:D.text1, marginBottom:14, letterSpacing:"-0.04em", fontWeight:800 }}>Show recruiters<br /><span style={{ color:D.orange, fontStyle:"italic" }}>how you think.</span></h2>
                <p style={{ fontSize:15, color:D.text2, maxWidth:700, margin:"0 auto", lineHeight:1.85 }}>Every Arena task builds your public portfolio. Recruiters see the actual problem, your solution, and the AI review.</p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>{PORTFOLIO_TASKS.map((t,i) => <PortfolioCard key={i} task={t}/>)}</div>
              <div style={{ textAlign:"center", marginTop:28 }}><PrimaryButton onClick={() => openPath(activeFlow,"portfolio-cta")}>START BUILDING YOUR PORTFOLIO →</PrimaryButton></div>
            </>
          )}
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────── */}
      <section style={{ padding:"0 0 88px" }}>
        <div className="lp-container">
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <SectionLabel>Pricing</SectionLabel>
            <h2 style={{ fontSize:"clamp(32px,5vw,52px)", lineHeight:1.05, color:D.text1, marginBottom:14, letterSpacing:"-0.04em", fontWeight:800 }}>Simple pricing.<br /><span style={{ color:D.orange, fontStyle:"italic" }}>Serious value.</span></h2>
            <p style={{ fontSize:15, color:D.text2, maxWidth:560, margin:"0 auto", lineHeight:1.85 }}>Pick your path below. Every plan is designed so the value you get far exceeds what you pay.</p>
          </div>

          {/* Path tiles */}
          <div className="pricing-tiles-row">
            {[
              { key:"student",      icon:"🎓", label:"Student",      tagline:"Prove skill, get first job",      from:"Free – ₹599/mo",      color:D.orange, glow:"rgba(255,87,1,0.22)"  },
              { key:"professional", icon:"💼", label:"Professional",  tagline:"Maintain relevance, grow salary",  from:"Free – ₹999/mo",      color:D.violet, glow:"rgba(139,92,246,0.22)" },
              { key:"executive",    icon:"✦",  label:"Executive",     tagline:"Monetize authority & time",        from:"₹1,499 – ₹7,999/mo", color:D.gold,   glow:"rgba(201,168,76,0.28)"  },
              { key:"institution",  icon:"🏛️", label:"Organisation",  tagline:"College & company intelligence",   from:"Custom pricing",       color:D.amber,  glow:"rgba(217,119,6,0.22)"  },
            ].map(tile => {
              const isActive = pricingFlow===tile.key
              return (
                <div key={tile.key}
                  className={`pricing-path-tile${isActive?" active":""}`}
                  style={{ background: isActive ? `${tile.color}12` : D.glass, borderColor: isActive ? `${tile.color}50` : D.border, boxShadow: isActive ? `0 16px 40px ${tile.glow}, 0 0 0 1px ${tile.color}30` : `0 4px 20px rgba(0,0,0,0.3)` }}
                  onClick={() => switchPricingFlow(tile.key)}
                >
                  {isActive && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:tile.color, borderRadius:"20px 20px 0 0", boxShadow:`0 0 12px ${tile.color}` }} />}
                  <div style={{ fontSize:24, marginBottom:8 }}>{tile.icon}</div>
                  <div style={{ fontSize:15, fontWeight:800, color:isActive?tile.color:D.text1, marginBottom:4 }}>{tile.label}</div>
                  <div style={{ fontSize:10, color:D.text3, lineHeight:1.5, marginBottom:10 }}>{tile.tagline}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:800, color:tile.color, letterSpacing:"0.06em" }}>{tile.from}</div>
                  {isActive && (
                    <div style={{ position:"absolute", top:12, right:12, width:18, height:18, borderRadius:"50%", background:tile.color, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 10px ${tile.color}` }}>
                      <span style={{ color:"#fff", fontSize:10, fontWeight:800 }}>✓</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Plan cards */}
          {(() => {
            const p = PRICING[pricingFlow]
            return (
              <div key={pricingKey}>
                <div style={{ textAlign:"center", marginBottom:32 }}>
                  <h3 style={{ fontSize:"clamp(20px,3.5vw,34px)", lineHeight:1.1, color:D.text1, marginBottom:10, letterSpacing:"-0.03em", fontWeight:800 }}>{p.headline}</h3>
                  <p style={{ fontSize:14, color:D.text2, maxWidth:560, margin:"0 auto", lineHeight:1.8 }}>{p.sub}</p>
                </div>
                {pricingFlow==="institution" ? (
                  <div style={{
                    maxWidth:560, margin:"0 auto 24px", textAlign:"center",
                    background:D.glass, backdropFilter:"blur(24px)",
                    border:`1px solid ${D.amber}40`, borderRadius:22, padding:"40px 32px",
                  }}>
                    <div style={{ fontSize:11, fontWeight:800, color:D.amber, letterSpacing:2, textTransform:"uppercase", marginBottom:10, fontFamily:"'DM Mono',monospace" }}>Organisation</div>
                    <div style={{ fontSize:28, fontWeight:900, color:D.text1, marginBottom:12 }}>Custom pricing</div>
                    <div style={{ fontSize:13.5, color:D.text2, lineHeight:1.7, marginBottom:26 }}>Scoped to your institution's size and needs. We'll walk your placement cell through a live demo on your own data before talking numbers.</div>
                    <button
                      onClick={() => openPath("institution","pricing-talk-to-us-cta")}
                      style={{ padding:"14px 32px", border:"none", borderRadius:12, fontSize:13, fontWeight:800, cursor:"pointer", letterSpacing:"0.04em", fontFamily:"'DM Mono',monospace", background:`linear-gradient(135deg,${D.amber},#92580A)`, color:"#fff", boxShadow:"0 8px 28px rgba(217,119,6,0.4)" }}
                    >TALK TO US →</button>
                  </div>
                ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:22, marginBottom:24 }}>
                  {p.plans.map((plan,i) => (
                    <div key={i} className="plan-card-anim" style={{
                      background: plan.featured ? `linear-gradient(135deg, ${plan.accent}0D, rgba(3,3,8,0.8))` : D.glass,
                      borderRadius:22, border:`${plan.featured?2:1}px solid ${plan.featured?plan.accent+"50":D.border}`,
                      padding:"28px 24px",
                      backdropFilter:"blur(24px)",
                      boxShadow: plan.featured ? `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${plan.accent}20, inset 0 1px 0 rgba(255,255,255,0.08)` : `0 4px 24px rgba(0,0,0,0.3)`,
                      position:"relative", display:"flex", flexDirection:"column",
                      transform: plan.featured?"scale(1.03)":"scale(1)"
                    }}>
                      {plan.featured && (
                        <>
                          <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${plan.accent},${plan.accent}88)`, borderRadius:"22px 22px 0 0", boxShadow:`0 0 16px ${plan.accent}` }} />
                          <div style={{ position:"absolute", top:0, right:20, background:plan.accent, color:"#fff", fontSize:10, fontWeight:800, padding:"6px 10px", borderRadius:"0 0 10px 10px", letterSpacing:"0.12em", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", boxShadow:`0 4px 14px ${plan.accent}50` }}>Recommended</div>
                        </>
                      )}
                      <div style={{ marginBottom:20 }}>
                        <div style={{ fontSize:11, fontWeight:800, color:plan.accent, letterSpacing:2, textTransform:"uppercase", marginBottom:8, fontFamily:"'DM Mono',monospace" }}>{plan.label}</div>
                        <div style={{ fontSize:plan.price==="Custom"?26:38, fontWeight:900, color:D.text1, letterSpacing:-1, lineHeight:1 }}>{plan.price||"Free"}</div>
                        {plan.sub && <div style={{ fontSize:11, color:D.text3, marginTop:5, fontFamily:"'DM Mono',monospace" }}>{plan.sub}</div>}
                      </div>
                      <div style={{ flex:1, marginBottom:24, display:"grid", gap:9 }}>
                        {plan.features.map((f,fi) => (
                          <div key={fi} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                            <span style={{ color:plan.featured?plan.accent:D.green, fontWeight:800, flexShrink:0, marginTop:1 }}>✓</span>
                            <span style={{ fontSize:13, color:D.text2, lineHeight:1.5 }}>{f}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => openPath(pricingFlow,`pricing-${i}-cta`)}
                        style={{ width:"100%", padding:"14px", border:"none", borderRadius:12, fontSize:13, fontWeight:800, cursor:"pointer", letterSpacing:"0.04em", fontFamily:"'DM Mono',monospace", transition:"all 180ms cubic-bezier(0.16,1,0.3,1)", ...plan.ctaStyle }}
                        onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.opacity="0.9" }}
                        onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.opacity="1" }}
                      >{plan.cta}</button>
                    </div>
                  ))}
                </div>
                )}
                <div style={{ textAlign:"center", fontSize:11, color:D.text3, fontFamily:"'DM Mono',monospace", lineHeight:1.8 }}>{p.note}</div>
              </div>
            )
          })()}
        </div>
      </section>

      {/* ── NETWORK ─────────────────────────────────────────────────── */}
      <section style={{ padding:"0 0 88px" }}>
        <div className="lp-container">
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <SectionLabel>Executive network</SectionLabel>
            <h2 style={{ fontSize:"clamp(32px,5vw,52px)", lineHeight:1.05, color:D.text1, marginBottom:14, letterSpacing:"-0.04em", fontWeight:800 }}>Learn from people who<br /><span style={{ color:D.orange, fontStyle:"italic" }}>proved it.</span></h2>
            <p style={{ fontSize:15, color:D.text2, maxWidth:760, margin:"0 auto", lineHeight:1.85 }}>Founders, professors, experts, and institutions share knowledge and mentor learners through verified authority profiles.</p>
          </div>
          <div className="lp-grid-4">{networkRows.map((a,i) => <NetworkCard key={i} item={a}/>)}</div>
          <div style={{ textAlign:"center", marginTop:28 }}><GhostButton onClick={() => openPath("executive","exec-cta")}>CREATE AUTHORITY PROFILE →</GhostButton></div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────── */}
      <section style={{ padding:"0 0 88px" }}>
        <div className="lp-container">
          <div style={{
            background:"linear-gradient(135deg, rgba(255,87,1,0.12), rgba(3,3,8,0.95) 50%, rgba(139,92,246,0.08))",
            border:`1px solid rgba(255,87,1,0.22)`,
            borderRadius:30, padding:"56px 32px", textAlign:"center",
            backdropFilter:"blur(24px)",
            boxShadow:"0 30px 80px rgba(0,0,0,0.6), 0 0 80px rgba(255,87,1,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
            position:"relative", overflow:"hidden"
          }}>
            {/* Glow blob */}
            <div aria-hidden style={{ position:"absolute", top:"-30%", left:"50%", transform:"translateX(-50%)", width:"60%", height:"200px", borderRadius:"50%", background:"radial-gradient(circle, rgba(255,87,1,0.18) 0%, transparent 70%)", filter:"blur(40px)", pointerEvents:"none" }} />
            <div style={{ fontSize:11, color:D.orange, fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:18 }}>One trust-and-ELO backbone</div>
            <h2 style={{ color:D.text1, marginBottom:20, fontSize:"clamp(26px,4vw,44px)", lineHeight:1.12, letterSpacing:"-0.03em", fontWeight:800 }}>
              Students prove readiness.<br />Professionals maintain relevance.<br />
              <span style={{ color:D.orange, fontStyle:"italic" }}>Organisations measure talent health.<br />Executives monetize authority.</span>
            </h2>
            <p style={{ fontSize:15, color:D.text2, marginBottom:34, lineHeight:1.85, maxWidth:640, marginLeft:"auto", marginRight:"auto" }}>One verified intelligence network. No resumes exchanged at any point.</p>
            <PrimaryButton onClick={() => openPath(activeFlow,"final-cta")}>CHOOSE YOUR PATH →</PrimaryButton>
            <div style={{ display:"flex", gap:24, justifyContent:"center", marginTop:24, flexWrap:"wrap" }}>
              {["Free for candidates","18+ domains","UAN verified","Built in India"].map((f,i) => (
                <span key={i} style={{ fontSize:12, color:D.text3, fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:"0.02em" }}>✓ {f}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{ borderTop:`1px solid ${D.border}`, padding:"28px 0 44px" }}>
        <div className="lp-container" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:D.text1 }}>Capabilio <span style={{ color:D.orange }}>AI</span></div>
          <div style={{ fontSize:12, color:D.text3, fontFamily:"'DM Mono',monospace", textAlign:"center" }}>
            Hiring team?{" "}
            <a href="https://recruiter.capabilio.online" target="_blank" rel="noopener noreferrer" style={{ color:D.orange, textDecoration:"none", fontWeight:700 }}>
              Search verified talent by ELO at recruiter.capabilio.online
            </a>
          </div>
          <div style={{ fontSize:12, color:D.text3, fontFamily:"'DM Mono',monospace" }}>Amaravati, Andhra Pradesh ❤️ from India</div>
        </div>
      </footer>
    </div>
  )
}
