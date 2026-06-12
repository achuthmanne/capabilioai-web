import { useState, useEffect } from "react"

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
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#landingEloGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="4.5" fill={color} />
    </svg>
  )
}

function PortfolioCard({ task }) {
  const [open, setOpen] = useState(false)
  const diffColor = { Easy: "#16A34A", Medium: "#D97706", Hard: "#DC2626" }[task.difficulty] || "#FF5701"
  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${open ? "rgba(255,87,1,0.22)" : "rgba(17,24,39,0.08)"}`, borderRadius: 22, overflow: "hidden", boxShadow: open ? "0 12px 26px rgba(255,87,1,0.08)" : "0 8px 24px rgba(17,24,39,0.05)", transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 42, height: 42, background: `${diffColor}15`, border: `1px solid ${diffColor}22`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{task.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#111827", lineHeight: 1.15, marginBottom: 6 }}>{task.title}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: diffColor, background: `${diffColor}10`, border: `1px solid ${diffColor}22`, borderRadius: 999, padding: "4px 8px", fontFamily: "'JetBrains Mono', monospace" }}>{task.difficulty}</span>
            <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "'JetBrains Mono', monospace" }}>{task.type} · {task.date}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800, color: diffColor, lineHeight: 1 }}>{task.score}</div>
          <div style={{ fontSize: 10, color: diffColor, opacity: 0.75, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>Score</div>
        </div>
        <span style={{ color: "#9CA3AF", fontSize: 12, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
      </div>
      {open && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid rgba(17,24,39,0.06)" }}>
          <div style={{ background: "rgba(255,87,1,0.04)", border: "1px solid rgba(255,87,1,0.10)", padding: "12px 14px", marginTop: 16, marginBottom: 12, borderRadius: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#FF5701", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>Scenario</div>
            <div style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.72 }}>{task.scenario}</div>
          </div>
          <div style={{ background: "#111827", borderRadius: 14, padding: "12px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#BBF7D0", marginBottom: 12, border: "1px solid rgba(255,255,255,0.06)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{task.code}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "rgba(22,163,74,0.05)", border: "1px solid rgba(22,163,74,0.12)", borderRadius: 14, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>Strength</div>
              <div style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.6 }}>{task.strength}</div>
            </div>
            <div style={{ background: "rgba(217,119,6,0.05)", border: "1px solid rgba(217,119,6,0.12)", borderRadius: 14, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>Improve</div>
              <div style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.6 }}>{task.improve}</div>
            </div>
          </div>
          {task.eloDelta > 0 && <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, marginTop: 12, fontFamily: "'JetBrains Mono', monospace" }}>+{task.eloDelta} ELO earned</div>}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#FFFFFF", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 999, padding: "8px 16px", marginBottom: 18, boxShadow: "0 4px 14px rgba(17,24,39,0.04)" }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF5701", boxShadow: "0 0 0 4px rgba(255,87,1,0.10)" }} />
      <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 700, letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>{children}</span>
    </div>
  )
}

function PrimaryButton({ children, onClick, white = false }) {
  return (
    <button onClick={onClick} style={{ padding: "14px 20px", borderRadius: 14, border: white ? "1px solid rgba(17,24,39,0.1)" : "1px solid #FF5701", background: white ? "#FFFFFF" : "#FF5701", color: white ? "#111827" : "#FFFFFF", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em", boxShadow: white ? "0 8px 24px rgba(17,24,39,0.05)" : "0 12px 26px rgba(255,87,1,0.18)", transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)" }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >{children}</button>
  )
}

function GhostButton({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "14px 20px", borderRadius: 14, border: "1px solid rgba(17,24,39,0.1)", background: "#FFFFFF", color: "#374151", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em", transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,87,1,0.20)"; e.currentTarget.style.color = "#FF5701" }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(17,24,39,0.1)"; e.currentTarget.style.color = "#374151" }}
    >{children}</button>
  )
}

function PathOptionCard({ item, isActive, onClick }) {
  const c = item.color || "#FF5701"
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
    return `${r},${g},${b}`
  }
  const rgb = hexToRgb(c)
  return (
    <button onClick={onClick} style={{
      textAlign: "left", padding: "16px 16px",
      background: isActive ? `rgba(${rgb},0.07)` : "#FFFFFF",
      border: `1px solid ${isActive ? `rgba(${rgb},0.28)` : "rgba(17,24,39,0.08)"}`,
      borderRadius: 16, cursor: "pointer",
      transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
      fontFamily: "inherit",
      boxShadow: isActive ? `0 10px 24px rgba(${rgb},0.10)` : "0 6px 18px rgba(17,24,39,0.04)"
    }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: isActive ? c : "#111827", marginBottom: 6, fontWeight: 700 }}>{item.label}</div>
      <div style={{ fontSize: 11, color: isActive ? `rgba(${rgb},0.7)` : "#6B7280", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{item.subtitle}</div>
    </button>
  )
}

function FeatureCard({ item }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 22, padding: 24, boxShadow: "0 10px 28px rgba(17,24,39,0.05)" }}>
      <div style={{ width: 46, height: 46, background: "#FFF1E8", border: "1px solid rgba(255,87,1,0.14)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>{item.icon}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{item.title}</div>
      <div style={{ fontSize: 15, color: "#4B5563", lineHeight: 1.75 }}>{item.desc}</div>
    </div>
  )
}

function PathCard({ icon, title, desc, badge, badgeColor = "#FF5701", featured, onClick }) {
  const badgeBg   = { "#FF5701": "#FFF1E8", purple: "#F4F0FF", green: "#F0FDF4", amber: "#FFF7E8" }
  const badgeText = { "#FF5701": "#FF5701", purple: "#8B5CF6", green: "#16A34A", amber: "#D97706" }
  const badgeBord = { "#FF5701": "rgba(255,87,1,0.18)", purple: "rgba(139,92,246,0.16)", green: "rgba(22,163,74,0.16)", amber: "rgba(217,119,6,0.16)" }
  return (
    <div onClick={onClick} style={{ background: "#FFFFFF", border: `1px solid ${featured ? "rgba(255,87,1,0.18)" : "rgba(17,24,39,0.08)"}`, borderRadius: 22, padding: 24, cursor: "pointer", boxShadow: featured ? "0 14px 30px rgba(255,87,1,0.10)" : "0 10px 24px rgba(17,24,39,0.05)", transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)", position: "relative" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,87,1,0.22)"; e.currentTarget.style.transform = "translateY(-2px)" }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = featured ? "rgba(255,87,1,0.18)" : "rgba(17,24,39,0.08)"; e.currentTarget.style.transform = "translateY(0)" }}
    >
      {featured && <div style={{ position: "absolute", top: 0, right: 20, background: "#FF5701", color: "#FFFFFF", fontSize: 10, fontWeight: 700, padding: "6px 10px", borderRadius: "0 0 10px 10px", letterSpacing: "0.12em", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>Popular</div>}
      <div style={{ width: 48, height: 48, background: "#FFF1E8", border: "1px solid rgba(255,87,1,0.14)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18 }}>{icon}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 15, color: "#4B5563", lineHeight: 1.75, marginBottom: 16 }}>{desc}</div>
      <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: badgeBg[badgeColor] || "#F9FAFB", color: badgeText[badgeColor] || "#FF5701", border: `1px solid ${badgeBord[badgeColor] || "#E5E7EB"}`, fontFamily: "'JetBrains Mono', monospace" }}>{badge}</span>
    </div>
  )
}

function NetworkCard({ item }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 20, padding: 18, boxShadow: "0 10px 24px rgba(17,24,39,0.05)" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${item.color}18`, border: `1px solid ${item.color}26`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontSize: 16, color: item.color, flexShrink: 0, fontWeight: 700 }}>{item.name[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>{item.role} · {item.co}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "#4F46E5", background: "#EEF2FF", border: "1px solid rgba(79,70,229,0.12)", borderRadius: 999, padding: "4px 8px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{item.type}</span>
        <span style={{ fontSize: 10, color: "#16A34A", background: "#F0FDF4", border: "1px solid rgba(22,163,74,0.12)", borderRadius: 999, padding: "4px 8px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>Verified</span>
      </div>
      <div style={{ display: "flex", borderTop: "1px solid rgba(17,24,39,0.06)", paddingTop: 12 }}>
        {[{ l: "Followers", v: item.followers }, { l: "Posts", v: item.posts }].map((s, j) => (
          <div key={j} style={{ flex: 1, textAlign: "center", borderRight: j === 0 ? "1px solid rgba(17,24,39,0.06)" : "none" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: "#111827" }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExecutivePreview() {
  const G = "#C9A84C", INK = "#0D0D1A"
  const metrics = [
    { label:"Influence Score", value:"9,240", sub:"Top 3% of executives" },
    { label:"Network Reach",   value:"12.4K", sub:"Followers & connections" },
    { label:"Mentees",         value:"47",    sub:"Active this quarter" },
  ]
  const activity = [
    { icon:"🏛", text:"Board seat at Fintech Series B secured" },
    { icon:"🎤", text:"Keynote confirmed — India SaaS Summit 2026" },
    { icon:"🤝", text:"3 mentorship requests this week" },
    { icon:"✦",  text:"Verified Authority badge active" },
  ]
  return (
    <div style={{ background:"#fff", border:"1px solid rgba(17,24,39,0.08)", borderRadius:28, padding:24, boxShadow:"0 18px 40px rgba(17,24,39,0.07)" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:14, marginBottom:20 }}>
        <div>
          <div style={{ fontSize:11, color:"#6B7280", fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:"'JetBrains Mono',monospace" }}>Executive Authority Profile</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:800, color:INK, marginBottom:4 }}>Arjun Mehta</div>
          <div style={{ fontSize:13, color:"#6B7280" }}>Founder & CEO · SaaS Advisor</div>
        </div>
        <div style={{ background:`${G}18`, border:`1.5px solid ${G}40`, borderRadius:16, padding:"12px 14px", textAlign:"center", flexShrink:0 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:13, fontWeight:800, color:G, lineHeight:1.2 }}>✦</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:G, letterSpacing:"0.12em", marginTop:5, fontWeight:800, textTransform:"uppercase" }}>Verified</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
        {metrics.map((m,i) => (
          <div key={i} style={{ background:"#FAFAF8", border:"1px solid rgba(17,24,39,0.06)", borderRadius:14, padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:800, color:INK, marginBottom:3 }}>{m.value}</div>
            <div style={{ fontSize:10, color:"#6B7280", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace" }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:11, color:"#6B7280", fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:10, fontFamily:"'JetBrains Mono',monospace" }}>Recent Activity</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {activity.map((a,i) => (
          <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"9px 12px", background:"#FAFAF8", border:"1px solid rgba(17,24,39,0.06)", borderRadius:12 }}>
            <span style={{ fontSize:14, flexShrink:0 }}>{a.icon}</span>
            <span style={{ fontSize:12, color:"#374151", lineHeight:1.5 }}>{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrgPreview() {
  const A = "#D97706", INK = "#0D0D1A"
  const cohorts = [
    { name:"Web Dev Batch 12",    students:48, avgElo:1240, topElo:1890 },
    { name:"Data Science — Jan",  students:34, avgElo:1080, topElo:1740 },
    { name:"Cybersecurity — Q2",  students:22, avgElo:1320, topElo:1960 },
  ]
  return (
    <div style={{ background:"#fff", border:"1px solid rgba(17,24,39,0.08)", borderRadius:28, padding:24, boxShadow:"0 18px 40px rgba(17,24,39,0.07)" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:14, marginBottom:20 }}>
        <div>
          <div style={{ fontSize:11, color:"#6B7280", fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:"'JetBrains Mono',monospace" }}>Institution Intelligence Hub</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:800, color:INK, marginBottom:4 }}>BITS Pilani</div>
          <div style={{ fontSize:13, color:"#6B7280" }}>Premier Institution · Est. 1964</div>
        </div>
        <div style={{ background:`${A}18`, border:`1.5px solid ${A}40`, borderRadius:16, padding:"10px 12px", textAlign:"center", flexShrink:0 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:800, color:A }}>45K</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:A, letterSpacing:"0.12em", marginTop:4, fontWeight:800, textTransform:"uppercase" }}>Followers</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
        {[{l:"Active Cohorts",v:"8"},{l:"Total Students",v:"1,240"},{l:"Hired this yr",v:"312"}].map((s,i)=>(
          <div key={i} style={{ background:"#FAFAF8", border:"1px solid rgba(17,24,39,0.06)", borderRadius:14, padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:800, color:INK, marginBottom:3 }}>{s.v}</div>
            <div style={{ fontSize:10, color:"#6B7280", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:11, color:"#6B7280", fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:10, fontFamily:"'JetBrains Mono',monospace" }}>Cohort ELO Leaderboard</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {cohorts.map((c,i)=>(
          <div key={i} style={{ padding:"10px 14px", background:"#FAFAF8", border:"1px solid rgba(17,24,39,0.06)", borderRadius:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:700, color:INK }}>{c.name}</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:A, fontWeight:800 }}>Top: {c.topElo}</span>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ flex:1, height:6, borderRadius:999, background:"rgba(17,24,39,0.07)", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.round(c.avgElo/2000*100)}%`, borderRadius:999, background:`linear-gradient(90deg,${A},#F59E0B)` }}/>
              </div>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"#6B7280", fontWeight:700, whiteSpace:"nowrap" }}>avg {c.avgElo}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfessionalOrbitPreview({ eloAnim }) {
  const P = "#8B5CF6"
  const skills = [
    { label: "Python",        value: 78, color: P },
    { label: "System Design", value: 84, color: "#FF5701" },
    { label: "SQL",           value: 71, color: "#3B82F6" },
    { label: "AWS",           value: 65, color: "#D97706" },
  ]
  const modules = ["Orbit","Signal","Forge","Nexus","Vault","Launchpad","Mentor Hub","Pulse"]
  const moduleColors = ["#FF5701","#3B82F6","#16A34A",P,"#D97706","#FF5701","#16A34A","#8B5CF6"]
  return (
    <div style={{ background:"#FFFFFF", border:"1px solid rgba(139,92,246,0.14)", borderRadius:28, padding:24, boxShadow:"0 18px 40px rgba(139,92,246,0.08)" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:18, marginBottom:18 }}>
        <div>
          <div style={{ fontSize:11, color:"#6B7280", fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:"'JetBrains Mono',monospace" }}>Career Intelligence — Orbit</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:800, color:"#111827", marginBottom:4 }}>Priya Nambiar</div>
          <div style={{ fontSize:13, color:"#6B7280" }}>Senior SDE · Verified ✓</div>
        </div>
        <div style={{ minWidth:112, background:`${P}0F`, border:`1.5px solid ${P}30`, borderRadius:18, padding:"12px 12px 10px", textAlign:"center" }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:30, fontWeight:800, color:P, lineHeight:1 }}>{eloAnim.toLocaleString()}</div>
          <div style={{ fontSize:9, color:P, letterSpacing:"0.12em", marginTop:5, textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace", fontWeight:800 }}>ELO Score</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:18 }}>
        {[{ l:"Market Value", v:"₹21.4L" },{ l:"Layoff Shield", v:"82/100" },{ l:"Career Velocity", v:"+14%" }].map((s,i) => (
          <div key={i} style={{ background:"#FAFAF8", border:"1px solid rgba(17,24,39,0.06)", borderRadius:14, padding:"10px 8px", textAlign:"center" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:i===0?14:16, fontWeight:800, color:"#111827", marginBottom:2, lineHeight:1.1 }}>{s.v}</div>
            <div style={{ fontSize:9, color:"#6B7280", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, color:"#6B7280", fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:10, fontFamily:"'JetBrains Mono',monospace" }}>Skill Half-Life Radar</div>
      <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:18 }}>
        {skills.map((sk,i) => (
          <div key={i}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:13, color:"#374151", fontWeight:600 }}>{sk.label}</span>
              <span style={{ fontSize:11, color:sk.color, fontWeight:800, fontFamily:"'JetBrains Mono',monospace" }}>{sk.value}% fresh</span>
            </div>
            <div style={{ height:7, borderRadius:999, background:"#F3F4F6", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${sk.value}%`, borderRadius:999, background:sk.color }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, color:"#6B7280", fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:"'JetBrains Mono',monospace" }}>Your modules</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {modules.map((m,i) => (
          <span key={i} style={{ fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:999, background:`${moduleColors[i]}10`, color:moduleColors[i], border:`1px solid ${moduleColors[i]}26`, fontFamily:"'JetBrains Mono',monospace" }}>{m}</span>
        ))}
      </div>
    </div>
  )
}

function AuraPreview({ eloAnim, skills }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 28, padding: 24, boxShadow: "0 18px 40px rgba(17,24,39,0.07)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>Live Aura Preview</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Rahul Sharma</div>
          <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>Professional · Full Stack Developer</div>
        </div>
        <div style={{ minWidth: 118, background: "#FFF1E8", border: "1px solid rgba(255,87,1,0.14)", borderRadius: 18, padding: "14px 14px 12px", textAlign: "center" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 800, color: "#FF5701", lineHeight: 1 }}>{eloAnim.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: "#FF5701", letterSpacing: "0.12em", marginTop: 6, textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>Live ELO</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 22 }}>
        {[{ label: "Streak", value: "12" }, { label: "Tasks", value: "94" }, { label: "Job ready", value: "87%" }].map(stat => (
          <div key={stat.label} style={{ background: "#FAFAF8", border: "1px solid rgba(17,24,39,0.06)", borderRadius: 16, padding: "14px 12px" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{stat.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>Skill graph</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {skills.map((skill, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, alignItems: "center" }}>
              <span style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>{skill.label}</span>
              <span style={{ fontSize: 12, color: skill.color || "#FF5701", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{skill.value}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "#F3F4F6", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${skill.value}%`, borderRadius: 999, background: skill.color || "linear-gradient(90deg, #FF5701, #FF8A4C)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage({ onGetStarted, onLogin }) {
  const [eloAnim, setEloAnim] = useState(800)
  const [activeFlow, setActiveFlow] = useState("student")
  const [pricingFlow, setPricingFlow] = useState("student")
  const [pricingKey, setPricingKey] = useState(0)

  const switchPricingFlow = (path) => {
    setPricingFlow(path)
    setPricingKey(k => k + 1)
  }

  useEffect(() => {
    const target = 1847; let cur = 800
    const t = setInterval(() => { cur = Math.min(cur + 18, target); setEloAnim(cur); if (cur >= target) clearInterval(t) }, 22)
    return () => clearInterval(t)
  }, [])

  const openPath = (path, source = "landing") => {
    try { localStorage.setItem("capabilio_selected_path", path) } catch {}
    if (typeof onGetStarted === "function") onGetStarted({ path, source })
  }

  const FLOWS = {
    student:      { color:"#FF5701", label:"Student",      cta:"Start as student",          subtitle:"ELO starts at 400" },
    professional: { color:"#8B5CF6", label:"Professional", cta:"Build your Orbit profile",  subtitle:"Verified career · ELO starts at 800" },
    executive:    { color:"#C9A84C", label:"Executive",    cta:"Request invite",             subtitle:"Invite-only · Verified authority · Time marketplace" },
    institution:  { color:"#D97706", label:"Organisation", cta:"Create institution profile", subtitle:"College · Company · Verified ecosystem" },
  }
  const flow = FLOWS[activeFlow]

  const HERO = {
    student: {
      sectionLabel: "India's first ELO-rated hiring platform",
      stats: [{val:eloAnim.toLocaleString(),lbl:"Live ELO"},{val:"94",lbl:"Tasks done"},{val:"Top 3%",lbl:"Full stack"},{val:"18+",lbl:"Domains"}],
      desc: "Anyone can write \"5 years experience.\" Nobody can fake an ELO of 1,847. Prove your skills through real daily challenges matched to your actual level.",
    },
    professional: {
      sectionLabel: "India's first verified professional network",
      stats: [{val:eloAnim.toLocaleString(),lbl:"Live ELO"},{val:"₹21L",lbl:"Avg market value"},{val:"82/100",lbl:"Layoff shield"},{val:"8",lbl:"Pro modules"}],
      desc: "Upload your resume or LinkedIn URL. AI extracts your career timeline, skills, and JDs. Verify via UAN — employment history cross-matched automatically. Unverified profiles never appear in anyone's feed.",
    },
    executive: {
      sectionLabel: "Invite-only · Verified authority network",
      stats: [{val:"₹2.8L",lbl:"Avg monthly earnings"},{val:"340+",lbl:"Board seats filled"},{val:"92%",lbl:"Session repeat rate"},{val:"Invite-only",lbl:"Access model"}],
      desc: "Founders, CEOs, and domain authorities — sell your time through the Time Market, build Peer Circles, open Signal Rooms, and match privately on Venture Radar. Every profile is invite-only and identity-verified. This is not LinkedIn.",
    },
    institution: {
      sectionLabel: "Verified campus + company intelligence",
      stats: [{val:"220+",lbl:"Institutions"},{val:"1,240",lbl:"Students tracked"},{val:"Anonymous",lbl:"Rating system"},{val:"Auto",lbl:"Path transitions"}],
      desc: "Colleges track cohort ELO, run professor-assigned tasks, and pipeline placements automatically. Companies post verified profiles, anonymous employee ratings build your Company ELO, and ATS integration connects to recruiter.capabilio.online.",
    },
  }
  const hero = HERO[activeFlow]

  const SKILLS = [
    { label: "Python",           value: 82 },
    { label: "SQL",              value: 74 },
    { label: "Machine learning", value: 61, color: "#8B5CF6" },
    { label: "Tableau",          value: 85 },
    { label: "Statistics",       value: 78 },
  ]
  const ELO_HISTORY = [400, 420, 450, 490, 560, 640, 750, 900, 1050, 1200, 1400, 1620, 1847]
  const PORTFOLIO_TASKS = [
    { icon: "🗃️", title: "Razorpay Payment Failure Analysis", difficulty: "Hard", type: "Data Analytics", date: "Apr 13, 2026", score: 92, eloDelta: 32, scenario: "Analyse transaction failure patterns across 20 merchants. Identify top 3 with highest failure rates and primary failure payment methods.", code: "failure = df[df['status']=='failed']\nresult = failure.groupby('merchant_name')\\\n  .agg({'txn_id':'count','amount':'sum'})\\\n  .sort_values('txn_id',ascending=False).head(3)", strength: "Efficient groupby aggregation. Correct failure rate methodology.", improve: "Add percentage calculation. Visualise with matplotlib." },
    { icon: "💻", title: "Swiggy Order Management API", difficulty: "Medium", type: "Software Engineering", date: "Apr 11, 2026", score: 85, eloDelta: 18, scenario: "Design a REST endpoint for Swiggy order management with paginated history, status and date range filtering.", code: "app.get('/orders/:id', async (req,res) => {\n  const {status,page=1} = req.query\n  const orders = await Order.find({customerId:req.params.id})\n    .skip((page-1)*20).limit(20)\n  res.json({orders})\n})", strength: "Clean pagination. Correct query structure.", improve: "Add input validation. Handle empty results." },
    { icon: "🔐", title: "Brute Force Attack Investigation", difficulty: "Hard", type: "Cyber Security", date: "Apr 9, 2026", score: 78, eloDelta: 14, scenario: "SOC alert: 847 failed login attempts from 192.168.1.45 in 3 minutes. Investigate and recommend mitigation.", code: "failed = logs[logs['status']=='FAILED_AUTH']\nattack_ip = failed.groupby('source_ip')['count'].sum()\nprint(f'Peak: {failed.resample(\"1T\").count().max()} req/min')", strength: "Correct pattern identification. Good timeline analysis.", improve: "Add SIEM query. Include MITRE ATT&CK reference." },
  ]
  const FEATURES = [
    { icon: "⚔️", title: "ARENA",          desc: "Daily real tasks from Indian companies. Python notebooks, SOC workstations, SQL editors. Every submission updates your ELO." },
    { icon: "✦",  title: "AURA DASHBOARD", desc: "Living skill graph. ELO history, radar chart, career momentum, verification badges. Your entire identity in one view." },
    { icon: "🎬", title: "BRANDING VIDEO", desc: "AI compiles your top Arena moments into a 53-second video. ELO animates, radar builds, portfolio plays. One click to share." },
    { icon: "📋", title: "PORTFOLIO",      desc: "Every task shows scenario, your actual code, AI review, and score. Recruiters see how you think — not what you claimed." },
    { icon: "🚀", title: "LAUNCHPAD",      desc: "Jobs matched by ELO, not keywords. Recruiters filter by real performance. You get found based on what you proved." },
    { icon: "📡", title: "PULSE",          desc: "Intelligence feed for your domain. GitHub trending, Reddit signals, authority drops — personalised to your ELO and keywords." },
  ]
  const PROFESSIONAL_FEATURES = [
    { icon: "🔆", title: "ORBIT",      desc: "Career Intelligence Dashboard. Career Health Score, Market Value, Layoff Shield, Skill Half-Life radar, and your auto-verified career timeline — all in one view." },
    { icon: "📶", title: "SIGNAL",     desc: "Market intelligence for your exact role. Live role demand trends, JD skill gap analysis, and compensation benchmarks updated weekly from real job postings." },
    { icon: "🔥", title: "FORGE",      desc: "Quiet Mode Challenges. 2–3 domain micro-questions, 5 minutes/week. Prevents skill ELO decay. Staying sharp, not being tested." },
    { icon: "🔗", title: "NEXUS",      desc: "Verified professional network. Connections, endorsements, and peer benchmarking — only with profiles that have passed UAN cross-match. No noise." },
    { icon: "🗃️", title: "VAULT",      desc: "Private store for credentials, offer letters, certs, and achievements. Share a custom link — recruiters see only what you unlock for them." },
    { icon: "🚀", title: "LAUNCHPAD",  desc: "Passive job matching. Opportunities find you by ELO + verified skills. You never upload a resume. Toggle: Open to work / Passive / Not looking." },
    { icon: "🎓", title: "MENTOR HUB", desc: "ELO 1400+ unlocks paid consultation listings. Set your rate and domains. Capabilio handles scheduling + payment. Revenue while employed." },
    { icon: "📡", title: "PULSE",      desc: "Verified-only professional newsfeed. Unverified profiles never appear. Industry signals, peer achievements, and domain insights — 100% real." },
  ]
  const EXECUTIVE_FEATURES = [
    { icon: "✦",  title: "LEGACY PROFILE",      desc: "Verified timeline of funding rounds, exits, board seats, patents, and keynotes. Cross-checked with news and company data. Not self-reported." },
    { icon: "⏱",  title: "TIME MARKET",         desc: "Sell 1:1 slots, group sessions, workshops, and async Q&A. Dynamic pricing. Capabilio handles booking and payment. Full earnings dashboard." },
    { icon: "🎙",  title: "SIGNAL ROOMS",        desc: "Live audio/video rooms for verified executives only. Scheduled, recorded, notified to followers. Every speaker is identity-verified." },
    { icon: "🃏",  title: "INSIGHT CARDS",       desc: "Structured short-form content: Problem → Insight → Lesson → Role verified. Forces quality over volume. Not tweets. Not LinkedIn posts." },
    { icon: "🔭",  title: "VENTURE RADAR",       desc: "Private signal matching for fundraising, co-founder search, and acqui-hire interest. Fully private until both sides match. Zero cold outreach." },
    { icon: "🪑",  title: "BOARD SEAT EXCHANGE", desc: "Companies post board seat openings. Executives apply with verified credentials. Capabilio verifies before match is shown. No LinkedIn DM spam." },
    { icon: "👥",  title: "PEER CIRCLE",         desc: "Private rooms of 5–15 verified executives at the same stage. Seed, Series A, IPO — curated by Capabilio. Safe space for board-level conversations." },
    { icon: "📊",  title: "INFLUENCE INDEX",     desc: "Executive ELO equivalent. Calculated from reach growth, session ratings, mentee outcomes, and verified achievements. Cannot be bought or inflated." },
    { icon: "🗺",  title: "DEAL ROOM",           desc: "Private encrypted workspace for pitch decks, term sheets, and cap tables. Shared with selected people only. Capabilio never reads the content." },
  ]
  const INSTITUTION_FEATURES = [
    { icon: "🏛️", title: "CAMPUS HUB",         desc: "Verified campus social layer. Only verified college email holders join. Posts, announcements, events, and student groups — all in one place." },
    { icon: "📋", title: "TASK ENGINE",         desc: "Professors assign custom Arena-style tasks to classes or batches. AI auto-grades. Results flow directly into student ELO and skill graph." },
    { icon: "📈", title: "COHORT INTELLIGENCE", desc: "Live ELO leaderboard per batch, department, campus. Placement team sees who is hire-ready. HOD sees department health. Principal sees institution-wide." },
    { icon: "💼", title: "PLACEMENT COMMAND",   desc: "Real-time: who got placed, what company, what package, which recruiter. In-campus offers auto-promote student to Professional path." },
    { icon: "🗂",  title: "PROJECT VAULT",       desc: "Final year projects and research papers auto-linked to student Aura portfolio. Professors endorse. Verified academic work, not self-claimed." },
    { icon: "🔗", title: "ALUMNI INTELLIGENCE", desc: "Graduates tracked on Capabilio. Institution sees alumni ELO growth as proof of education quality. A live, verifiable ranking signal." },
    { icon: "⭐", title: "ANONYMOUS RATINGS",   desc: "Day-30 onboarding + exit ratings. Company never knows who rated. Identity stripped. Min 5 ratings before company sees aggregated data." },
    { icon: "🧬", title: "COMPANY ELO",         desc: "Built from anonymous ratings + hire quality + retention data. Cannot be faked. Updated quarterly. A Glassdoor killer powered by verified timelines." },
    { icon: "🔌", title: "ATS INTEGRATION",     desc: "Sync with Workday, Greenhouse, Lever, Keka. Jobs posted here auto-sync to Launchpad. Webhook: 'Candidate X is now open to work.'" },
  ]
  const VERSUS_ROWS = [
    { old: '"5 yrs Python exp."',   new: "ELO 1,847 · 94 tasks"    },
    { old: '"ML Expert"',           new: "ML: 61% · Growing"        },
    { old: '"AWS Certified"',       new: "Arena: EC2 scored 89%"    },
    { old: '"Led eng team of 10"',  new: "12-day streak · Hard: 23" },
  ]
  const problemRows = [
    { icon: "🐍", claim: '"5 years Python experience"',  reality: "Can't explain list comprehensions" },
    { icon: "🤖", claim: '"Machine Learning Expert"',    reality: "Never trained an end-to-end model" },
    { icon: "👥", claim: '"Led team of 10 engineers"',   reality: "Was a member of a team of 10" },
    { icon: "📊", claim: '"Data-driven decision maker"', reality: "Used Excel once in 2019" },
    { icon: "☁️", claim: '"AWS Certified"',              reality: "Watched 3 YouTube videos" },
    { icon: "💬", claim: '"Strong communication skills"',reality: "Copied from the last resume" },
  ]
  const networkRows = [
    { name: "Rohan Mehta",     role: "Founder & CEO",       co: "PayStack India", followers: "12.4K", posts: 38, color: "#8B5CF6", type: "Founder"     },
    { name: "Dr. Priya Singh", role: "Professor",           co: "IIT Hyderabad",  followers: "8.2K",  posts: 24, color: "#FF5701", type: "Professor"   },
    { name: "Arjun Kapoor",    role: "CTO",                 co: "Razorpay",       followers: "19.1K", posts: 51, color: "#16A34A", type: "Executive"   },
    { name: "BITS Pilani",     role: "Premier Institution", co: "Est. 1964",      followers: "45K",   posts: 67, color: "#D97706", type: "Institution" },
  ]

  const PRICING = {
    student: {
      headline: <>Pick your pace.<br /><span style={{ color:"#FF5701", fontStyle:"italic" }}>Invest in your career.</span></>,
      sub: "ELO-ranked proof, AI interviews, and market intelligence — start free, no card needed.",
      note: "Monthly plans · Cancel anytime · Powered by Razorpay · Prices in INR",
      plans: [
        { label:"Free",  price:null,      accent:"#6B7280", featured:false, features:["1 Arena task every 15 days","Portfolio generation","Locked premium previews","Market reports at ₹49/report"], cta:"GET STARTED FREE →", ctaStyle:{ background:"#111827", color:"#fff" } },
        { label:"Pro",   price:"₹299/mo", sub:"Billed monthly", accent:"#3D4EAC", featured:false, features:["3 Arena tasks per day","3 AI Interview sessions/month","1 market report/month","Full Arena access","Portfolio generation"], cta:"START PRO →", ctaStyle:{ background:"#3D4EAC", color:"#fff" } },
        { label:"Elite", price:"₹599/mo", sub:"Best value",    accent:"#B8620A", featured:true,  features:["6 Arena tasks per day","5 AI Interview sessions/month","2 market reports/month","Personal branding video","Full advanced Arena","Portfolio generation"], cta:"GO ELITE →", ctaStyle:{ background:"#B8620A", color:"#fff" } },
      ],
    },
    professional: {
      headline: <>Career intelligence,<br /><span style={{ color:"#8B5CF6", fontStyle:"italic" }}>worth every rupee.</span></>,
      sub: "Compensation Intelligence alone can unlock a ₹2–5L salary bump. Mentor Hub earnings cover your plan in one session.",
      note: "Monthly plans · Cancel anytime · Powered by Razorpay · Prices in INR",
      plans: [
        { label:"Free",        price:null,      accent:"#6B7280", featured:false, features:["Basic Orbit dashboard","1 Forge challenge/week","Public verified profile","UAN verification"], cta:"START FREE →", ctaStyle:{ background:"#111827", color:"#fff" } },
        { label:"Orbit Pro",   price:"₹399/mo", sub:"₹3,999/yr — save 16%", accent:"#8B5CF6", featured:true,  features:["Full Orbit — all 4 career signals","Unlimited Forge challenges","Signal — 3 market reports/mo","Compensation Intelligence","Gap Mode + Gap Narrative Engine","Vault full verification","Nexus verified network"], cta:"GO ORBIT PRO →", ctaStyle:{ background:"#8B5CF6", color:"#fff" } },
        { label:"Orbit Elite", price:"₹799/mo", sub:"₹7,999/yr — save 17%", accent:"#4F46E5", featured:false, features:["Everything in Orbit Pro","AI Interview — 5 sessions/mo","Mentor Hub listing (15% commission)","Transition Tracks access","Return-Ready Sprint","Signal — unlimited reports","Priority Launchpad matching"], cta:"GO ORBIT ELITE →", ctaStyle:{ background:"#4F46E5", color:"#fff" } },
      ],
    },
    executive: {
      headline: <>Your plan lowers commission.<br /><span style={{ color:"#C9A84C", fontStyle:"italic" }}>One session pays for it.</span></>,
      sub: "Luminary vs Authority: upgrading saves ₹3,000/mo in commissions on ₹50K monthly sessions. The plan pays for itself.",
      note: "Invite-only · Annual pricing available · Powered by Razorpay · All prices in INR",
      plans: [
        { label:"Authority", price:"₹1,499/mo", sub:"₹14,999/yr — save 17%", accent:"#C9A84C", featured:false, features:["Verified Legacy Profile","Time Market — 18% commission","2 Signal Rooms/month","Insight Cards (unlimited)","Peer Circle access","Influence Index dashboard"], cta:"REQUEST INVITE →", ctaStyle:{ background:"#C9A84C", color:"#fff" } },
        { label:"Luminary",  price:"₹2,999/mo", sub:"₹29,999/yr — save 17%", accent:"#C9A84C", featured:true,  features:["Everything in Authority","Time Market — 12% commission","Unlimited Signal Rooms","Venture Radar — private matching","Board Seat Exchange","Deal Room (3 active)","Peer Circle hosting"], cta:"REQUEST INVITE →", ctaStyle:{ background:"#92680A", color:"#fff" } },
        { label:"Legacy",    price:"₹7,999/mo", sub:"Custom annual pricing",  accent:"#92680A", featured:false, features:["Everything in Luminary","Time Market — 8% commission","Unlimited Deal Rooms","Dedicated relationship manager","Co-hosted Signal Rooms","Priority cross-network promotion"], cta:"REQUEST INVITE →", ctaStyle:{ background:"#1A1200", color:"#C9A84C" } },
      ],
    },
    institution: {
      headline: <>One plan per campus.<br /><span style={{ color:"#D97706", fontStyle:"italic" }}>Unlimited ROI.</span></>,
      sub: "A bad hire costs ₹80,000+. One better placement decision pays for a year of Growth plan. Zero placement officer overhead.",
      note: "Annual contracts available · Powered by Razorpay · GST applicable · Prices in INR",
      plans: [
        { label:"Starter",              price:null,             sub:"Up to 50 students / 50 employees",    accent:"#6B7280", featured:false, features:["Verified profile + badge","Basic cohort / team view","Anonymous Rating System","3 job posts / month","Up to 2 admin accounts"], cta:"START FREE →", ctaStyle:{ background:"#111827", color:"#fff" } },
        { label:"Campus / Growth",      price:"₹2,499–3,999/mo",sub:"College ₹2,499 · Company ₹3,999",   accent:"#D97706", featured:true,  features:["Full cohort / team intelligence","Professor Task Engine (college)","Placement Command Center (college)","Culture DNA + ATS Integration (company)","Unlimited jobs · 500 students/employees","Alumni Intelligence (college)","Hiring Funnel Analytics (company)"], cta:"GET STARTED →", ctaStyle:{ background:"#D97706", color:"#fff" } },
        { label:"University / Enterprise",price:"Custom",        sub:"Annual contract · Unlimited",         accent:"#92580A", featured:false, features:["Everything in Campus/Growth","Unlimited students / employees","Multi-campus admin (college)","Dedicated account manager","Custom API access","SLA + white-glove onboarding","Priority ELO candidate pool"], cta:"TALK TO SALES →", ctaStyle:{ background:"#1D4ED8", color:"#fff" } },
      ],
    },
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top left, rgba(255,87,1,0.06), transparent 18%), linear-gradient(to bottom, #FFFFFF, #F6F6F1)", color: "#111827", overflowX: "hidden", fontFamily: "'Playfair Display', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        .lp-container { max-width: 1180px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }
        .lp-grid-hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 40px; align-items: center; }
        .lp-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
        .lp-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
        .lp-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
        .lp-fade-up   { animation: lpFadeUp 0.45s ease both; }
        .lp-fade-up-2 { animation: lpFadeUp 0.6s  ease both; }
        @keyframes lpFadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @media (max-width: 1024px) { .lp-grid-hero, .lp-grid-2, .lp-grid-3, .lp-grid-4 { grid-template-columns: 1fr; } }
        @media (max-width: 720px)  { .lp-container { padding-left: 18px; padding-right: 18px; } }
        .pricing-path-tile { cursor:pointer; border-radius:20px; padding:18px 16px; border:2px solid transparent; transition:all 240ms cubic-bezier(0.16,1,0.3,1); position:relative; overflow:hidden; }
        .pricing-path-tile:hover { transform:translateY(-3px) scale(1.02); }
        .pricing-path-tile.active { transform:translateY(-4px) scale(1.03); }
        @keyframes planIn { from { opacity:0; transform:translateY(28px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
        .plan-card-anim { animation: planIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .plan-card-anim:nth-child(1) { animation-delay: 0s; }
        .plan-card-anim:nth-child(2) { animation-delay: 0.08s; }
        .plan-card-anim:nth-child(3) { animation-delay: 0.16s; }
        .pricing-tiles-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:36px; }
        @media (max-width:880px) { .pricing-tiles-row { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:500px) { .pricing-tiles-row { grid-template-columns:1fr 1fr; gap:10px; } }
      `}</style>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(17,24,39,0.08)" }}>
        <div className="lp-container" style={{ minHeight: 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", paddingTop: 12, paddingBottom: 12 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>Capabilio AI</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <GhostButton onClick={onLogin}>SIGN IN</GhostButton>
            <PrimaryButton onClick={() => openPath(activeFlow, "nav")}>GET STARTED</PrimaryButton>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: "68px 0 88px" }}>
        <div className="lp-container">
          <div className="lp-grid-hero">
            <div className="lp-fade-up">
              <SectionLabel>{hero.sectionLabel}</SectionLabel>
              <h1 style={{ color:"#111827", marginBottom:20, fontSize:"clamp(40px, 6vw, 68px)", lineHeight:0.98, letterSpacing:"-0.05em", fontWeight:800 }}>
                {activeFlow === "student" ? (
                  <>Your resume lies.<br /><span style={{ color:"#FF5701", fontStyle:"italic" }}>Your ELO doesn&apos;t.</span></>
                ) : activeFlow === "professional" ? (
                  <>Your title is claimed.<br /><span style={{ color:"#8B5CF6", fontStyle:"italic" }}>Your career is proven.</span></>
                ) : activeFlow === "executive" ? (
                  <>Your authority is real.<br /><span style={{ color:"#C9A84C", fontStyle:"italic" }}>Now monetize it.</span></>
                ) : (
                  <>One platform.<br /><span style={{ color:"#D97706", fontStyle:"italic" }}>Two institution types.</span></>
                )}
              </h1>
              <p style={{ fontSize:18, color:"#4B5563", maxWidth:590, marginBottom:34, lineHeight:1.85, fontFamily:"Inter, sans-serif" }}>
                {hero.desc}
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:30 }}>
                {Object.entries(FLOWS).map(([key, f]) => (
                  <PathOptionCard key={key} item={f} isActive={activeFlow === key} onClick={() => setActiveFlow(key)} />
                ))}
              </div>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:34 }}>
                <PrimaryButton onClick={() => openPath(activeFlow, "hero")}>{flow.cta.toUpperCase()} →</PrimaryButton>
                <GhostButton onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior:"smooth" })}>SEE HOW IT WORKS</GhostButton>
              </div>
              <div style={{ display:"flex", gap:24, paddingTop:22, borderTop:"1px solid rgba(17,24,39,0.08)", flexWrap:"wrap" }}>
                {hero.stats.map((s,i) => (
                  <div key={i}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:24, color:flow.color, lineHeight:1, fontWeight:800 }}>{s.val}</div>
                    <div style={{ fontSize:10, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginTop:5, fontFamily:"'JetBrains Mono',monospace" }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lp-fade-up-2">
              {activeFlow === "executive"    ? <ExecutivePreview /> :
               activeFlow === "institution"  ? <OrgPreview /> :
               activeFlow === "professional" ? <ProfessionalOrbitPreview eloAnim={eloAnim} /> :
               <AuraPreview eloAnim={eloAnim} skills={SKILLS} />}
            </div>
          </div>
        </div>
      </section>

      {/* PATHS */}
      <section id="how-it-works" style={{ padding: "10px 0 88px" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <SectionLabel>Choose your path</SectionLabel>
            <h2 style={{ fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 1.05, letterSpacing: "-0.04em", color: "#111827", marginBottom: 14, fontWeight: 800 }}>One platform.<br /><span style={{ color: "#FF5701", fontStyle: "italic" }}>Four journeys.</span></h2>
            <p style={{ fontSize: 17, color: "#4B5563", maxWidth: 760, margin: "0 auto 10px", lineHeight: 1.85, fontFamily: "Inter, sans-serif" }}>Students prove readiness. Professionals maintain relevance. Organisations measure talent health. Executives monetize authority.</p>
            <p style={{ fontSize: 14, color: "#9CA3AF", maxWidth: 600, margin: "0 auto", lineHeight: 1.7, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>All powered by one trust-and-ELO backbone.</p>
          </div>
          <div className="lp-grid-2">
            <PathCard icon="🎓" title="Student"      desc="25 beginner MCQs calibrate your starting radar. ELO begins at 400 and compounds through daily Arena challenges." badge="ELO starts at 400" onClick={() => openPath("student", "path-card")} />
            <PathCard icon="💼" title="Professional" desc="Upload resume or LinkedIn URL. AI auto-builds your verified career timeline, Skill Half-Life radar, and compensation intelligence. UAN cross-match locks your history." badge="Verified network" badgeColor="purple" featured onClick={() => openPath("professional", "path-card")} />
            <PathCard icon="✦"  title="Executive"    desc="Invite-only. Founders and CEOs sell time via Time Market, host Signal Rooms, match privately on Venture Radar, and access the Board Seat Exchange. Verified legacy profile." badge="Invite-only" badgeColor="amber" onClick={() => openPath("executive", "path-card")} />
            <PathCard icon="🏛️" title="Organisation" desc="Colleges: Cohort ELO, professor tasks, auto placement pipeline, alumni intelligence. Companies: verified profile, anonymous rating system, Company ELO, ATS integration." badge="College · Company" badgeColor="amber" onClick={() => openPath("institution", "path-card")} />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section style={{ padding: "0 0 88px" }}>
        <div className="lp-container">
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 30, padding: "38px 26px", boxShadow: "0 18px 40px rgba(17,24,39,0.05)" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <SectionLabel>The problem nobody talks about</SectionLabel>
              <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.06, color: "#111827", marginBottom: 14, letterSpacing: "-0.04em", fontWeight: 800 }}>Resumes are the world&apos;s most<br /><span style={{ color: "#FF5701", fontStyle: "italic" }}>successful lie.</span></h2>
              <p style={{ fontSize: 16, color: "#4B5563", maxWidth: 680, margin: "0 auto", lineHeight: 1.8, fontFamily: "Inter, sans-serif" }}>Every hiring manager knows this. They spend 6 seconds on a resume and still can't tell who can actually do the job.</p>
            </div>
            <div className="lp-grid-3">
              {problemRows.map((r, i) => (
                <div key={i} style={{ background: "#FAFAF8", border: "1px solid rgba(17,24,39,0.06)", borderRadius: 20, padding: 20 }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{r.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 10, lineHeight: 1.45, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>{r.claim}</div>
                  <div style={{ height: 1, background: "rgba(220,38,38,0.16)", marginBottom: 10 }} />
                  <div style={{ fontSize: 13, color: "#DC2626", lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>Reality: {r.reality}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ELO */}
      <section style={{ padding: "0 0 88px" }}>
        <div className="lp-container">
          <div className="lp-grid-2" style={{ alignItems: "center" }}>
            <div>
              <SectionLabel>Live skill rating</SectionLabel>
              <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", lineHeight: 1.05, color: "#111827", marginBottom: 16, letterSpacing: "-0.04em", fontWeight: 800 }}>A number that<br /><span style={{ color: "#FF5701", fontStyle: "italic" }}>can&apos;t be faked.</span></h2>
              <p style={{ fontSize: 16, color: "#4B5563", marginBottom: 28, lineHeight: 1.85, fontFamily: "Inter, sans-serif" }}>Like chess.com — your ELO is earned through real performance. It rises when you solve hard problems, drops when you go inactive, and cannot be self-reported or inflated.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {["400+ Student", "800+ Professional", "1000+ Proficient", "1400+ Expert"].map((tier, i) => (
                  <span key={i} style={{ padding: "8px 12px", borderRadius: 999, fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", background: tier.includes("1000+") ? "#FFF1E8" : "#FFFFFF", color: tier.includes("1000+") ? "#FF5701" : "#6B7280", border: `1px solid ${tier.includes("1000+") ? "rgba(255,87,1,0.18)" : "rgba(17,24,39,0.08)"}` }}>{tier}</span>
                ))}
              </div>
              {["Goes up when you solve hard problems.", "Drops if you are inactive for 7+ days.", "Cannot be self-reported or inflated.", "Comparable across all users globally."].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", background: "#FFFFFF", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 16, marginBottom: 10, boxShadow: "0 6px 18px rgba(17,24,39,0.04)" }}>
                  <span style={{ fontSize: 15, color: "#FF5701" }}>✦</span>
                  <span style={{ fontSize: 14, color: "#4B5563", fontFamily: "Inter, sans-serif" }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 28, padding: 24, boxShadow: "0 18px 40px rgba(17,24,39,0.06)" }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 66, color: "#FF5701", lineHeight: 1, marginBottom: 6, fontWeight: 800 }}>1,847</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#6B7280", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>Proficient · Top 8%</div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 14 }}>
                  <span style={{ fontSize: 10, color: "#6B7280", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>ELO Growth</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#FF5701", fontWeight: 700 }}>400 → 1,847</span>
                </div>
                <EloSparkline points={ELO_HISTORY} width={380} height={70} />
              </div>
              <div style={{ border: "1px solid rgba(17,24,39,0.08)", borderRadius: 18, overflow: "hidden" }}>
                {VERSUS_ROWS.map((row, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: i !== VERSUS_ROWS.length - 1 ? "1px solid rgba(17,24,39,0.06)" : "none" }}>
                    <div style={{ padding: "12px 14px", background: "#FAFAF8", color: "#6B7280", fontSize: 13, lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>{row.old}</div>
                    <div style={{ padding: "12px 14px", background: "#FFF1E8", color: "#111827", fontSize: 13, lineHeight: 1.6, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{row.new}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "0 0 88px" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <SectionLabel>Platform modules</SectionLabel>
            {activeFlow === "professional" ? (
              <>
                <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", lineHeight: 1.05, color: "#111827", marginBottom: 14, letterSpacing: "-0.04em", fontWeight: 800 }}>Eight modules.<br /><span style={{ color: "#8B5CF6", fontStyle: "italic" }}>One verified career.</span></h2>
                <p style={{ fontSize: 16, color: "#4B5563", maxWidth: 700, margin: "0 auto", lineHeight: 1.85, fontFamily: "Inter, sans-serif" }}>Career intelligence, market signals, skill maintenance, and passive job matching — for professionals who are employed and want to stay ahead without grinding daily tasks.</p>
              </>
            ) : activeFlow === "executive" ? (
              <>
                <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", lineHeight: 1.05, color: "#111827", marginBottom: 14, letterSpacing: "-0.04em", fontWeight: 800 }}>Nine surfaces.<br /><span style={{ color: "#C9A84C", fontStyle: "italic" }}>One authority network.</span></h2>
                <p style={{ fontSize: 16, color: "#4B5563", maxWidth: 700, margin: "0 auto", lineHeight: 1.85, fontFamily: "Inter, sans-serif" }}>A premium verified network where founders, CEOs, and domain authorities monetize time, match privately, and build influence — with an integrity floor no other platform enforces.</p>
              </>
            ) : activeFlow === "institution" ? (
              <>
                <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", lineHeight: 1.05, color: "#111827", marginBottom: 14, letterSpacing: "-0.04em", fontWeight: 800 }}>Nine modules.<br /><span style={{ color: "#D97706", fontStyle: "italic" }}>One verified ecosystem.</span></h2>
                <p style={{ fontSize: 16, color: "#4B5563", maxWidth: 700, margin: "0 auto", lineHeight: 1.85, fontFamily: "Inter, sans-serif" }}>Colleges track cohort ELO and automate placements. Companies build verified profiles and earn trust through anonymous ratings. Both run on the same talent intelligence backbone.</p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", lineHeight: 1.05, color: "#111827", marginBottom: 14, letterSpacing: "-0.04em", fontWeight: 800 }}>Five modules.<br /><span style={{ color: "#FF5701", fontStyle: "italic" }}>Zero resumes.</span></h2>
                <p style={{ fontSize: 16, color: "#4B5563", maxWidth: 700, margin: "0 auto", lineHeight: 1.85, fontFamily: "Inter, sans-serif" }}>Interlocking modules replace your resume, cover letter, and LinkedIn with live, verifiable proof of work.</p>
              </>
            )}
          </div>
          {activeFlow === "professional" ? <div className="lp-grid-4">{PROFESSIONAL_FEATURES.map((f, i) => <FeatureCard key={i} item={f} />)}</div>
          : activeFlow === "executive"   ? <div className="lp-grid-3">{EXECUTIVE_FEATURES.map((f, i) => <FeatureCard key={i} item={f} />)}</div>
          : activeFlow === "institution" ? <div className="lp-grid-3">{INSTITUTION_FEATURES.map((f, i) => <FeatureCard key={i} item={f} />)}</div>
          : <div className="lp-grid-3">{FEATURES.map((f, i) => <FeatureCard key={i} item={f} />)}</div>}
        </div>
      </section>

      {/* PORTFOLIO / PATH-SPECIFIC PROOF */}
      <section style={{ padding: "0 0 88px" }}>
        <div className="lp-container">
          {activeFlow === "executive" ? (
            <div style={{ background: "linear-gradient(135deg, #FFFDF5, #FFF9E6)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 30, padding: "38px 26px", boxShadow: "0 18px 40px rgba(201,168,76,0.08)" }}>
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <SectionLabel>Verified legacy profile</SectionLabel>
                <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.06, color: "#111827", marginBottom: 14, letterSpacing: "-0.04em", fontWeight: 800 }}>Your authority timeline.<br /><span style={{ color: "#C9A84C", fontStyle: "italic" }}>Verified, not claimed.</span></h2>
                <p style={{ fontSize: 16, color: "#4B5563", maxWidth: 680, margin: "0 auto 28px", lineHeight: 1.8, fontFamily: "Inter, sans-serif" }}>Every funding round, board seat, exit, patent, and keynote — cross-verified with news sources and company data. Not self-reported. Your legacy profile is the single most credible executive record in India.</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 680, margin: "0 auto 28px" }}>
                {[
                  { icon:"📰", color:"#C9A84C", label:"Cross-verified with news sources",  desc:"Funding rounds, acquisitions, and keynotes are matched against public records. No fake claims." },
                  { icon:"⏱",  color:"#FF5701", label:"Time Market earnings tracked",      desc:"Session history, ratings, repeat client rate, and total earnings visible to you — private from others." },
                  { icon:"🔒", color:"#8B5CF6", label:"Invite-only access model",          desc:"You cannot self-onboard. Capabilio verifies every executive before their profile goes live." },
                  { icon:"📊", color:"#16A34A", label:"Influence Index replaces follower count", desc:"Calculated from mentee outcomes, session ratings, community engagement, and verified achievements." },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 18px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${row.color}12`, border: `1px solid ${row.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{row.icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 3 }}>{row.label}</div>
                      <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>{row.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center" }}><PrimaryButton onClick={() => openPath("executive", "exec-legacy-cta")}>REQUEST EXECUTIVE INVITE →</PrimaryButton></div>
            </div>
          ) : activeFlow === "institution" ? (
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(217,119,6,0.12)", borderRadius: 30, padding: "38px 26px", boxShadow: "0 18px 40px rgba(217,119,6,0.06)" }}>
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <SectionLabel>Cohort intelligence + company trust</SectionLabel>
                <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.06, color: "#111827", marginBottom: 14, letterSpacing: "-0.04em", fontWeight: 800 }}>Talent health, measured.<br /><span style={{ color: "#D97706", fontStyle: "italic" }}>Trust, built automatically.</span></h2>
                <p style={{ fontSize: 16, color: "#4B5563", maxWidth: 680, margin: "0 auto 28px", lineHeight: 1.8, fontFamily: "Inter, sans-serif" }}>Colleges see cohort ELO in real time. Students auto-transition to Professional path when placed. Companies earn a verified Company ELO from anonymous employee ratings — and it cannot be gamed.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 720, margin: "0 auto 28px" }}>
                {[
                  { icon:"📈", color:"#D97706", label:"Live Cohort ELO",     desc:"Placement team sees hire-ready students in real time. No manual reporting." },
                  { icon:"🔄", color:"#16A34A", label:"Auto path transitions",desc:"In-campus offer → Professional path. Graduate without offer → Student path. Fully automatic." },
                  { icon:"⭐", color:"#3B82F6", label:"Anonymous ratings",    desc:"Day-30 + exit ratings. Reviewer identity never disclosed. Min 5 ratings before company sees data." },
                  { icon:"🧬", color:"#FF5701", label:"Company ELO",          desc:"Built from hire quality + retention + ratings. Cannot be faked. Updated quarterly." },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", background: "#FAFAF8", border: "1px solid rgba(17,24,39,0.06)", borderRadius: 16 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${row.color}12`, border: `1px solid ${row.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{row.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 3 }}>{row.label}</div>
                      <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>{row.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center" }}><PrimaryButton onClick={() => openPath("institution", "org-cta")}>CREATE INSTITUTION PROFILE →</PrimaryButton></div>
            </div>
          ) : activeFlow === "professional" ? (
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(139,92,246,0.12)", borderRadius: 30, padding: "38px 26px", boxShadow: "0 18px 40px rgba(139,92,246,0.06)" }}>
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <SectionLabel>Auto-verified career timeline</SectionLabel>
                <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.06, color: "#111827", marginBottom: 14, letterSpacing: "-0.04em", fontWeight: 800 }}>Every career move.<br /><span style={{ color: "#8B5CF6", fontStyle: "italic" }}>Verified, not claimed.</span></h2>
                <p style={{ fontSize: 16, color: "#4B5563", maxWidth: 680, margin: "0 auto 28px", lineHeight: 1.8, fontFamily: "Inter, sans-serif" }}>When you join a new company through Capabilio, your timeline auto-updates with the JD, skills, and start date. When you're promoted, your recruiter updates it and a new branch appears. You never touch it. Anything you add yourself is flagged as self-claimed.</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 680, margin: "0 auto 28px" }}>
                {[
                  { icon:"✦", color:"#16A34A", label:"Verified via UAN",         desc:"Employment history cross-matched with EPFO records. Start and end dates locked." },
                  { icon:"⚡", color:"#8B5CF6", label:"Auto-updates on new role", desc:"JD, skills, salary band, and start date populate automatically. No form filling." },
                  { icon:"🌿", color:"#FF5701", label:"Promotion branches",       desc:"Role changes appear as a new branch on your timeline — set by your recruiter, never self-reported." },
                  { icon:"⚠", color:"#DC2626", label:"Self-claims flagged",       desc:"Anything entered manually is marked 'Self-claimed' in your public profile. Recruiters see the difference." },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 18px", background: "#FAFAF8", border: "1px solid rgba(17,24,39,0.06)", borderRadius: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${row.color}12`, border: `1px solid ${row.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{row.icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 3 }}>{row.label}</div>
                      <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>{row.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center" }}><PrimaryButton onClick={() => openPath("professional", "timeline-cta")}>BUILD YOUR VERIFIED TIMELINE →</PrimaryButton></div>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 34 }}>
                <SectionLabel>Public portfolio</SectionLabel>
                <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", lineHeight: 1.05, color: "#111827", marginBottom: 14, letterSpacing: "-0.04em", fontWeight: 800 }}>Show recruiters<br /><span style={{ color: "#FF5701", fontStyle: "italic" }}>how you think.</span></h2>
                <p style={{ fontSize: 16, color: "#4B5563", maxWidth: 700, margin: "0 auto", lineHeight: 1.85, fontFamily: "Inter, sans-serif" }}>Every Arena task builds your public portfolio. Recruiters see the actual problem, your solution, and the AI review.</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{PORTFOLIO_TASKS.map((t, i) => <PortfolioCard key={i} task={t} />)}</div>
              <div style={{ textAlign: "center", marginTop: 28 }}><PrimaryButton onClick={() => openPath(activeFlow, "portfolio-cta")}>START BUILDING YOUR PORTFOLIO →</PrimaryButton></div>
            </>
          )}
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "0 0 88px", background: "#F9F9F7" }}>
        <div className="lp-container">
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <SectionLabel>Pricing</SectionLabel>
            <h2 style={{ fontSize:"clamp(34px,5vw,54px)", lineHeight:1.05, color:"#111827", marginBottom:14, letterSpacing:"-0.04em", fontWeight:800 }}>Simple pricing.<br /><span style={{ color:"#FF5701", fontStyle:"italic" }}>Serious value.</span></h2>
            <p style={{ fontSize:16, color:"#4B5563", maxWidth:560, margin:"0 auto", lineHeight:1.85, fontFamily:"Inter, sans-serif" }}>Pick your path below. Every plan is designed so the value you get far exceeds what you pay.</p>
          </div>

          {/* 4 path selector tiles */}
          <div className="pricing-tiles-row">
            {[
              { key:"student",      icon:"🎓", label:"Student",      tagline:"Prove skill, get first job",      from:"Free – ₹599/mo",      color:"#FF5701", bg:"linear-gradient(135deg,#FFF1E8,#FFE8D6)", glow:"rgba(255,87,1,0.22)"  },
              { key:"professional", icon:"💼", label:"Professional",  tagline:"Maintain relevance, grow salary",  from:"Free – ₹799/mo",      color:"#8B5CF6", bg:"linear-gradient(135deg,#F4F0FF,#EDE8FF)", glow:"rgba(139,92,246,0.22)" },
              { key:"executive",    icon:"✦",  label:"Executive",     tagline:"Monetize authority & time",        from:"₹1,499 – ₹7,999/mo", color:"#C9A84C", bg:"linear-gradient(135deg,#FFFDF5,#FFF4CC)", glow:"rgba(201,168,76,0.28)"  },
              { key:"institution",  icon:"🏛️", label:"Organisation",  tagline:"College & company intelligence",   from:"Free – Custom",       color:"#D97706", bg:"linear-gradient(135deg,#FFF7E8,#FFECCC)", glow:"rgba(217,119,6,0.22)"  },
            ].map(tile => {
              const isActive = pricingFlow === tile.key
              return (
                <div key={tile.key}
                  className={`pricing-path-tile${isActive ? " active" : ""}`}
                  style={{ background: isActive ? tile.bg : "#FFFFFF", borderColor: isActive ? tile.color : "rgba(17,24,39,0.08)", boxShadow: isActive ? `0 16px 40px ${tile.glow}, 0 4px 12px rgba(17,24,39,0.06)` : "0 4px 14px rgba(17,24,39,0.05)" }}
                  onClick={() => switchPricingFlow(tile.key)}
                >
                  {isActive && <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:tile.color, borderRadius:"20px 20px 0 0" }} />}
                  <div style={{ fontSize:26, marginBottom:8 }}>{tile.icon}</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:800, color:"#111827", marginBottom:4 }}>{tile.label}</div>
                  <div style={{ fontSize:10, color:"#6B7280", lineHeight:1.5, fontFamily:"Inter,sans-serif", marginBottom:10 }}>{tile.tagline}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:800, color:tile.color, letterSpacing:"0.06em" }}>{tile.from}</div>
                  {isActive && (
                    <div style={{ position:"absolute", top:12, right:12, width:18, height:18, borderRadius:"50%", background:tile.color, display:"flex", alignItems:"center", justifyContent:"center" }}>
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
                  <h3 style={{ fontSize:"clamp(22px,3.5vw,36px)", lineHeight:1.1, color:"#111827", marginBottom:10, letterSpacing:"-0.03em", fontWeight:800 }}>{p.headline}</h3>
                  <p style={{ fontSize:15, color:"#6B7280", maxWidth:560, margin:"0 auto", lineHeight:1.8, fontFamily:"Inter, sans-serif" }}>{p.sub}</p>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:22, marginBottom:24 }}>
                  {p.plans.map((plan, i) => (
                    <div key={i} className="plan-card-anim" style={{ background:"#fff", borderRadius:22, border:`2px solid ${plan.featured ? plan.accent : "rgba(17,24,39,0.09)"}`, padding:"28px 24px", boxShadow: plan.featured ? `0 20px 48px ${plan.accent}30, 0 4px 12px rgba(17,24,39,0.06)` : "0 4px 20px rgba(17,24,39,0.06)", position:"relative", display:"flex", flexDirection:"column", transform: plan.featured ? "scale(1.03)" : "scale(1)" }}>
                      {plan.featured && (
                        <>
                          <div style={{ position:"absolute", top:0, left:0, right:0, height:4, background:`linear-gradient(90deg,${plan.accent},${plan.accent}88)`, borderRadius:"22px 22px 0 0" }} />
                          <div style={{ position:"absolute", top:0, right:20, background:plan.accent, color:"#fff", fontSize:10, fontWeight:800, padding:"6px 10px", borderRadius:"0 0 10px 10px", letterSpacing:"0.12em", fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase" }}>Recommended</div>
                        </>
                      )}
                      <div style={{ marginBottom:20 }}>
                        <div style={{ fontSize:11, fontWeight:800, color:plan.accent, letterSpacing:2, textTransform:"uppercase", marginBottom:8, fontFamily:"'JetBrains Mono',monospace" }}>{plan.label}</div>
                        <div style={{ fontSize: plan.price === "Custom" ? 28 : 40, fontWeight:900, color:"#111827", letterSpacing:-1, lineHeight:1 }}>{plan.price || "Free"}</div>
                        {plan.sub && <div style={{ fontSize:11, color:"#6B7280", marginTop:5, fontFamily:"'JetBrains Mono',monospace" }}>{plan.sub}</div>}
                      </div>
                      <div style={{ flex:1, marginBottom:24, display:"grid", gap:9 }}>
                        {plan.features.map((f, fi) => (
                          <div key={fi} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                            <span style={{ color: plan.featured ? plan.accent : "#1A7A4A", fontWeight:800, flexShrink:0, marginTop:1 }}>✓</span>
                            <span style={{ fontSize:13, color:"#374151", lineHeight:1.5, fontFamily:"Inter, sans-serif" }}>{f}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => openPath(pricingFlow, `pricing-${i}-cta`)}
                        style={{ width:"100%", padding:"14px", border:"none", borderRadius:12, fontSize:13, fontWeight:800, cursor:"pointer", letterSpacing:"0.04em", fontFamily:"'JetBrains Mono',monospace", transition:"all 180ms cubic-bezier(0.16,1,0.3,1)", ...plan.ctaStyle }}
                        onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.opacity="0.92" }}
                        onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.opacity="1" }}
                      >{plan.cta}</button>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign:"center", fontSize:11, color:"#9CA3AF", fontFamily:"'JetBrains Mono',monospace", lineHeight:1.8 }}>{p.note}</div>
              </div>
            )
          })()}
        </div>
      </section>

      {/* NETWORK */}
      <section style={{ padding: "0 0 88px" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <SectionLabel>Executive network</SectionLabel>
            <h2 style={{ fontSize: "clamp(34px, 5vw, 54px)", lineHeight: 1.05, color: "#111827", marginBottom: 14, letterSpacing: "-0.04em", fontWeight: 800 }}>Learn from people who<br /><span style={{ color: "#FF5701", fontStyle: "italic" }}>proved it.</span></h2>
            <p style={{ fontSize: 16, color: "#4B5563", maxWidth: 760, margin: "0 auto", lineHeight: 1.85, fontFamily: "Inter, sans-serif" }}>Founders, professors, experts, and institutions share knowledge and mentor learners through verified authority profiles.</p>
          </div>
          <div className="lp-grid-4">{networkRows.map((a, i) => <NetworkCard key={i} item={a} />)}</div>
          <div style={{ textAlign: "center", marginTop: 28 }}><GhostButton onClick={() => openPath("executive", "exec-cta")}>CREATE AUTHORITY PROFILE →</GhostButton></div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "0 0 88px" }}>
        <div className="lp-container">
          <div style={{ background: "linear-gradient(135deg, #0D0D1A, #1A1A2E)", borderRadius: 30, padding: "52px 28px", textAlign: "center", boxShadow: "0 22px 50px rgba(0,0,0,0.28)" }}>
            <div style={{ fontSize: 11, color: "#FF5701", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginBottom: 18 }}>One trust-and-ELO backbone</div>
            <h2 style={{ color: "#FFFFFF", marginBottom: 20, fontSize: "clamp(28px, 4vw, 46px)", lineHeight: 1.12, letterSpacing: "-0.03em", fontWeight: 800 }}>Students prove readiness.<br />Professionals maintain relevance.<br /><span style={{ color: "#FF5701", fontStyle: "italic" }}>Organisations measure talent health.<br />Executives monetize authority.</span></h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 34, lineHeight: 1.85, maxWidth: 640, marginLeft: "auto", marginRight: "auto", fontFamily: "Inter, sans-serif" }}>One verified intelligence network. No resumes exchanged at any point.</p>
            <PrimaryButton onClick={() => openPath(activeFlow, "final-cta")}>CHOOSE YOUR PATH →</PrimaryButton>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
              {["Free for candidates", "18+ domains", "UAN verified", "Built in India"].map((f, i) => (
                <span key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.02em" }}>✓ {f}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(17,24,39,0.08)", padding: "28px 0 44px" }}>
        <div className="lp-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#111827" }}>Capabilio AI</div>
          <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>
            Hiring team?{" "}
            <a href="https://recruiter.capabilio.online" target="_blank" rel="noopener noreferrer" style={{ color: "#FF5701", textDecoration: "none", fontWeight: 700 }}>
              Search verified talent by ELO at recruiter.capabilio.online
            </a>
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "'JetBrains Mono', monospace" }}>Amaravati, Andhra Pradesh ❤️ from India</div>
        </div>
      </footer>
    </div>
  )
}
