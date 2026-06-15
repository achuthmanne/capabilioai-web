/**
 * ProfessionalHome.jsx — Professional command center
 * "What needs attention in my career this week?"
 */
import { useState } from "react"

const C = {
  purple:  "#8B5CF6",
  purpleL: "rgba(139,92,246,0.12)",
  purpleB: "rgba(139,92,246,0.28)",
  ink:     "#0F172A",
  ink2:    "#475569",
  ink3:    "#94A3B8",
  ink4:    "#64748B",
  border:  "rgba(0,0,0,0.05)",
  surface: "#FFFFFF",
  bg:      "#FFFFFF",
  green:   "#10B981",
  greenL:  "rgba(16,185,129,0.12)",
  blue:    "#3B82F6",
  blueL:   "rgba(59,130,246,0.12)",
  amber:   "#F59E0B",
  amberL:  "rgba(245,158,11,0.12)",
  red:     "#F43F5E",
  redL:    "rgba(244,63,94,0.12)",
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 20,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.3)",
      ...style,
    }}>{children}</div>
  )
}

function Label({ children, color = C.purple, bg = C.purpleL }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 100,
      background: bg, color, fontSize: 11, fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em",
      textTransform: "uppercase",
    }}>{children}</span>
  )
}

function HalfLifeBar({ skill, percent, risk }) {
  const color = risk === "high" ? C.red : risk === "medium" ? C.amber : C.green
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{skill}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>
          {risk === "high" ? "⚠ Decaying" : risk === "medium" ? "~ Aging" : "✓ Fresh"}
        </span>
      </div>
      <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99 }}>
        <div style={{ width: `${percent}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.4s" }} />
      </div>
    </div>
  )
}

export default function ProfessionalHome({ user, userData, onNavigate, onNavigatePricing }) {
  const name      = userData?.name || user?.displayName || "Professional"
  const firstName = name.split(" ")[0]
  const elo       = userData?.eloRating || 1200
  const eloTrend  = +15

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const skills = [
    { skill: "React / Frontend",    percent: 38, risk: "high"   },
    { skill: "System Design",       percent: 71, risk: "medium" },
    { skill: "Node.js / Backend",   percent: 85, risk: "low"    },
    { skill: "SQL & Databases",     percent: 52, risk: "medium" },
  ]

  const isOnFreePlan = !userData?.subscription || userData?.subscription === "free"

  const roleMatch = {
    title: "Senior Software Engineer",
    company: "Series B SaaS",
    fit: 87,
    location: "Remote · ₹28–38 LPA",
  }

  const alerts = [
    { icon: "🔴", text: "React skill half-life critical — 1 Forge task can fix it", action: "forge"   },
    { icon: "📈", text: "Backend Java roles now require Kafka + Docker",            action: "pulse"   },
    { icon: "👁️", text: "3 recruiters viewed your Orbit profile this week",         action: "orbit"   },
  ]

  return (
    <div style={{ background: `radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.12) 0%, transparent 55%), #FFFFFF`, flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 24px", fontFamily: "Inter, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');`}</style>

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: C.ink3, margin: 0, fontWeight: 500 }}>{greeting}, {firstName}</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: C.ink, margin: "4px 0 0", lineHeight: 1.2 }}>
          What needs <span style={{ color: C.purple, fontStyle: "italic" }}>attention</span> this week?
        </h1>
      </div>

      {/* ── ELO + status row ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Card style={{ flex: 1, padding: 16, textAlign: "center" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700, color: C.purple }}>{elo.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: C.ink4, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>ELO</div>
          <div style={{ fontSize: 12, color: eloTrend > 0 ? C.green : C.red, fontWeight: 700, marginTop: 4 }}>
            {eloTrend > 0 ? "▲" : "▼"} {Math.abs(eloTrend)} this week
          </div>
        </Card>
        <Card style={{ flex: 1, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.red, fontFamily: "'Playfair Display', serif" }}>2</div>
          <div style={{ fontSize: 11, color: C.ink4, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>At-Risk Skills</div>
          <div style={{ fontSize: 12, color: C.red, marginTop: 4 }}>Needs Forge</div>
        </Card>
        <Card style={{ flex: 1, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.green, fontFamily: "'Playfair Display', serif" }}>Active</div>
          <div style={{ fontSize: 11, color: C.ink4, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>Continuity</div>
          <div style={{ fontSize: 12, color: C.green, marginTop: 4 }}>14-day streak</div>
        </Card>
      </div>

      {/* ── Priority alert — one-click Forge ─────────────────── */}
      <Card style={{ marginBottom: 16, background: C.purple, border: "none" }}>
        <Label color="#fff" bg="rgba(239,68,68,0.1)">Action Required</Label>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginTop: 10, fontFamily: "'Playfair Display', serif" }}>
          React skill is decaying. 5-min Forge task available now.
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 4, marginBottom: 12 }}>
          Prevent ELO erosion before recruiter season peaks this week.
        </div>
        <button
          onClick={() => onNavigate("forge")}
          style={{ padding: "10px 20px", background: "#FFFFFF", border: "none", borderRadius: 12, color: C.purple, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >Open Forge →</button>
      </Card>

      {/* ── Skill half-life ──────────────────────────────────── */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>Skill Freshness</div>
          <button onClick={() => onNavigate("orbit")} style={{ fontSize: 12, color: C.purple, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>See Orbit →</button>
        </div>
        {skills.map((s, i) => <HalfLifeBar key={i} {...s} />)}
      </Card>

      {/* ── Best role match ──────────────────────────────────── */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Label>Best Match This Week</Label>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginTop: 8, fontFamily: "'Playfair Display', serif" }}>{roleMatch.title}</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{roleMatch.company} · {roleMatch.location}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: C.green }}>{roleMatch.fit}%</div>
            <div style={{ fontSize: 11, color: C.ink4 }}>Role Fit</div>
          </div>
        </div>
        <button
          onClick={() => onNavigate("orbit")}
          style={{ marginTop: 12, width: "100%", padding: "10px", background: C.purpleL, border: `1px solid ${C.purple}30`, borderRadius: 10, color: C.purple, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >View full match in Orbit</button>
      </Card>

      {/* ── Career alerts ────────────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2, marginBottom: 10 }}>Career Alerts</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((a, i) => (
            <div
              key={i}
              onClick={() => onNavigate(a.action)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer" }}
            >
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <span style={{ fontSize: 13, color: C.ink2, flex: 1, fontWeight: 500 }}>{a.text}</span>
              <span style={{ color: C.ink4, fontSize: 16 }}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Upgrade banner — only for free plan ──────────────── */}
      {isOnFreePlan && (
        <div style={{ margin: "20px 0 0", padding: "20px 18px", background: "linear-gradient(135deg, #4C1D95, #6D28D9)", borderRadius: 20, position: "relative", overflow: "hidden" }}>
          {/* glow */}
          <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: "rgba(0,0,0,0.03)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, background: "rgba(0,0,0,0.02)", borderRadius: "50%" }} />

          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Free Plan</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6, lineHeight: 1.25 }}>
            Unlock your full career OS
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", marginBottom: 16, lineHeight: 1.55 }}>
            Capabilio Pro gives you compensation intelligence, unlimited Forge, layoff shield score, peer benchmarking, and gap narrative — starting at <strong style={{ color: "#fff" }}>₹499/month</strong>.
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {["Compensation Intel", "Unlimited Forge", "Layoff Shield", "Peer Benchmarks", "3 Market Reports/mo"].map(f => (
              <span key={f} style={{ padding: "3px 10px", background: "rgba(0,0,0,0.08)", borderRadius: 100, fontSize: 11, color: "#fff", fontWeight: 600 }}>✓ {f}</span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => (onNavigatePricing || onNavigate)("pricing")}
              style={{ flex: 1, padding: "12px", background: "#FFFFFF", border: "none", borderRadius: 12, color: "#6D28D9", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "'Playfair Display', serif" }}
            >
              Upgrade to Capabilio Pro →
            </button>
            <button
              onClick={() => onNavigate("orbit")}
              style={{ padding: "12px 16px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 12, color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              See Orbit
            </button>
          </div>
        </div>
      )}

      {/* ── Already upgraded confirmation ────────────────────── */}
      {!isOnFreePlan && (
        <div style={{ margin: "20px 0 0", padding: "14px 16px", background: C.greenL, border: `1px solid ${C.green}30`, borderRadius: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>You're on {userData.subscription === "orbit_elite" ? "Capabilio Elite" : "Capabilio Pro"}</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 1 }}>All career intelligence features unlocked.</div>
          </div>
        </div>
      )}
    </div>
  )
}
