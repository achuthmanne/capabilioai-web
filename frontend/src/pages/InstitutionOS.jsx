/**
 * InstitutionOS.jsx — Complete Institution Operating System
 * Self-contained sub-application with 11 internal pages.
 * Replaces OrgHome, OrgIntelligence, OrgTasks, OrgPeople, OrgSettings.
 *
 * Pages: Home · Intelligence · Tasks · People · Community ·
 *        Groups · Cohorts · Events · Opportunities · Outcomes · Settings
 */

import { useState, useEffect } from "react"

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  // Primary accent — Sky blue
  sky:      "#0EA5E9",
  skyL:     "rgba(14,165,233,0.12)",
  skyB:     "rgba(14,165,233,0.28)",
  skyDark:  "#0284C7",

  // Semantic colours
  green:    "#10B981",
  greenL:   "rgba(16,185,129,0.12)",
  amber:    "#F59E0B",
  amberL:   "rgba(245,158,11,0.12)",
  red:      "#F43F5E",
  redL:     "rgba(244,63,94,0.12)",
  purple:   "#8B5CF6",
  purpleL:  "rgba(139,92,246,0.12)",
  blue:     "#3B82F6",
  blueL:    "rgba(59,130,246,0.12)",
  teal:     "#14B8A6",
  tealL:    "rgba(20,184,166,0.12)",

  // Ink scale
  ink:      "#0F172A",
  ink2:     "#334155",
  ink3:     "#64748B",
  ink4:     "#94A3B8",
  ink5:     "#CBD5E1",

  // Surface
  bg:       "#F8FAFC",
  surface:  "#FFFFFF",
  border:   "rgba(15,23,42,0.07)",
  borderM:  "rgba(15,23,42,0.12)",

  // Layout
  navW:     220,
  tabH:     60,
  radius:   14,
  radiusS:  8,
  shadow:   "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
  shadowM:  "0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
}

const FONT = "Inter, -apple-system, sans-serif"
const MONO = "'JetBrains Mono', 'Fira Mono', monospace"

// ─── Nav items (11 pages) ─────────────────────────────────────────────────────
const NAV = [
  { id: "home",          label: "Home",          icon: "⌂",  mobileShow: true  },
  { id: "intelligence",  label: "Intelligence",  icon: "📊", mobileShow: true  },
  { id: "tasks",         label: "Tasks",         icon: "✓",  mobileShow: true  },
  { id: "people",        label: "People",        icon: "👥", mobileShow: true  },
  { id: "community",     label: "Community",     icon: "💬", mobileShow: true  },
  { id: "groups",        label: "Groups",        icon: "🗂",  mobileShow: false },
  { id: "cohorts",       label: "Cohorts",       icon: "🎓", mobileShow: false },
  { id: "events",        label: "Events",        icon: "📅", mobileShow: false },
  { id: "opportunities", label: "Opportunities", icon: "💼", mobileShow: false },
  { id: "outcomes",      label: "Outcomes",      icon: "🏆", mobileShow: false },
  { id: "settings",      label: "Settings",      icon: "⚙", mobileShow: false },
]

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: T.radius, padding: 20,
        boxShadow: T.shadow, ...style,
        cursor: onClick ? "pointer" : undefined,
      }}
    >{children}</div>
  )
}

function Badge({ children, color = T.sky, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 100,
      background: bg || `${color}18`, color, fontSize: 11, fontWeight: 700,
      fontFamily: MONO, letterSpacing: "0.06em", textTransform: "uppercase",
    }}>{children}</span>
  )
}

function Chip({ children, color = T.ink3, bg = T.bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 6,
      background: bg, color, fontSize: 11, fontWeight: 600,
    }}>{children}</span>
  )
}

function Btn({ children, variant = "primary", onClick, style = {}, disabled }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: FONT,
    border: "none", transition: "opacity 0.15s",
    opacity: disabled ? 0.5 : 1,
  }
  const variants = {
    primary:  { background: T.sky,     color: "#fff" },
    outline:  { background: "transparent", border: `1px solid ${T.borderM}`, color: T.ink2 },
    ghost:    { background: "transparent", border: "none", color: T.ink3 },
    danger:   { background: T.red,     color: "#fff" },
    success:  { background: T.green,   color: "#fff" },
  }
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>
}

function SectionHead({ title, action, actionLabel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.ink2 }}>{title}</h3>
      {action && <Btn variant="ghost" onClick={action} style={{ padding: "4px 8px", fontSize: 12 }}>{actionLabel || "See all →"}</Btn>}
    </div>
  )
}

function EmptyState({ icon = "🫙", title, sub, action, actionLabel }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: T.ink4 }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink3, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, marginBottom: 16 }}>{sub}</div>}
      {action && <Btn variant="outline" onClick={action}>{actionLabel}</Btn>}
    </div>
  )
}

function VerificationBanner({ level, orgName }) {
  const levels = [
    { label: "Unverified", color: T.red,   bg: T.redL,   msg: "Verify your institution to unlock all features." },
    { label: "Email Verified", color: T.amber, bg: T.amberL, msg: "Upload your institution documents to reach full access." },
    { label: "Domain Verified", color: T.sky, bg: T.skyL, msg: "Submit documents to complete verification." },
    { label: "Document Verified", color: T.green, bg: T.greenL, msg: "Pending final review — usually 24h." },
  ]
  const info = levels[Math.min(level, 3)]
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
      background: info.bg, borderRadius: 10, marginBottom: 16,
      border: `1px solid ${info.color}30`,
    }}>
      <span style={{ fontSize: 16 }}>🔐</span>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: info.color }}>{info.label}</span>
        <span style={{ fontSize: 12, color: T.ink3, marginLeft: 8 }}>{info.msg}</span>
      </div>
      <Btn variant="outline" style={{ fontSize: 11, padding: "4px 10px", borderColor: info.color, color: info.color }}>
        Verify Now →
      </Btn>
    </div>
  )
}

// ─── Alive KPI Card ───────────────────────────────────────────────────────────
function KPICard({ value, label, trend, trendDir = "up", context, action, color, onClick }) {
  const trendColor = trendDir === "up" ? T.green : trendDir === "down" ? T.red : T.amber
  const trendIcon  = trendDir === "up" ? "↑" : trendDir === "down" ? "↓" : "→"
  return (
    <Card onClick={onClick} style={{ flex: 1, minWidth: 140, padding: 16, cursor: onClick ? "pointer" : "default" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: color || T.sky, lineHeight: 1 }}>{value}</div>
        {trend && (
          <span style={{ fontSize: 12, fontWeight: 700, color: trendColor, background: `${trendColor}15`, padding: "2px 7px", borderRadius: 6 }}>
            {trendIcon} {trend}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      {context && <div style={{ fontSize: 11, color: T.ink4, lineHeight: 1.4 }}>{context}</div>}
      {action && <div style={{ fontSize: 11, color: T.sky, fontWeight: 600, marginTop: 6 }}>{action}</div>}
    </Card>
  )
}

// ─── Sidebar nav (desktop) ────────────────────────────────────────────────────
function InstSidebar({ active, onNav, userData }) {
  const orgName = userData?.org_name || "Your Institution"
  const initials = orgName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
  return (
    <div style={{
      width: T.navW, minWidth: T.navW, height: "100%",
      background: T.surface, borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      {/* Org branding */}
      <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: T.skyL,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: T.sky, fontFamily: MONO, flexShrink: 0,
          }}>{initials || "OS"}</div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orgName}</div>
            <div style={{ fontSize: 11, color: T.sky, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {userData?.org_type === "company" ? "Company" : "Institution"}
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
        {NAV.map(item => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 10px", borderRadius: T.radiusS, border: "none",
                background: isActive ? T.skyL : "transparent",
                color: isActive ? T.sky : T.ink3, fontSize: 13,
                fontWeight: isActive ? 700 : 500, fontFamily: FONT,
                cursor: "pointer", transition: "background 0.12s, color 0.12s",
                marginBottom: item.id === "community" ? 8 : 0, // divider before secondary
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = T.bg; e.currentTarget.style.color = T.ink2 }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.ink3 }}}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom admin badge */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.skyL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.sky }}>
            {(userData?.name || "A").charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{userData?.name || "Admin"}</div>
            <div style={{ fontSize: 10, color: T.ink4 }}>Admin</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Bottom tab bar (mobile) ──────────────────────────────────────────────────
function InstTabBar({ active, onNav }) {
  const mobileItems = NAV.filter(n => n.mobileShow)
  return (
    <div style={{
      height: T.tabH, borderTop: `1px solid ${T.border}`,
      background: T.surface, display: "flex", flexShrink: 0,
    }}>
      {mobileItems.map(item => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 2, border: "none",
              background: "transparent", cursor: "pointer",
              color: isActive ? T.sky : T.ink4, fontFamily: FONT,
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader({ title, sub, actions }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.ink, fontFamily: FONT }}>{title}</h2>
        {sub && <p style={{ margin: "3px 0 0", fontSize: 13, color: T.ink3 }}>{sub}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  )
}

// ─── Scrollable page wrapper ──────────────────────────────────────────────────
function PageShell({ children }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 18px 32px", fontFamily: FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid ${T.sky}; outline-offset: 2px; }
      `}</style>
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — HOME
// ═══════════════════════════════════════════════════════════════════════════════
function HomePage({ userData, user, onNav }) {
  const name    = userData?.name || user?.displayName || "Admin"
  const firstName = name.split(" ")[0]
  const isCollege = (userData?.org_type || "college") !== "company"

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const pulse = isCollege ? [
    { value: "924",  label: "Avg ELO",       trend: "+38",  trendDir: "up",   color: T.sky,   context: "Up from 886 last month",          action: "See cohort breakdown →" },
    { value: "38%",  label: "Job Ready",      trend: "+6%",  trendDir: "up",   color: T.green, context: "142 of 374 active students",      action: "View readiness map →" },
    { value: "67",   label: "Placements",     trend: "+12",  trendDir: "up",   color: T.amber, context: "This academic year",               action: "See all offers →" },
    { value: "142",  label: "Active Today",   trend: "-8",   trendDir: "down", color: T.purple, context: "vs 150 yesterday",               action: "Check engagement →" },
  ] : [
    { value: "312",  label: "Verified Devs",  trend: "+5",   trendDir: "up",   color: T.sky,   context: "Accepted into talent pool",       action: "View pipeline →" },
    { value: "18",   label: "Open Roles",     trend: "+3",   trendDir: "up",   color: T.green, context: "Across 4 departments",            action: "Manage postings →" },
    { value: "78%",  label: "Assessment Rate", trend: "-4%", trendDir: "down", color: T.amber, context: "React Native · 14 pending",       action: "Send reminders →" },
    { value: "23",   label: "Interviews",     trend: "+7",   trendDir: "up",   color: T.purple, context: "Scheduled this week",            action: "View calendar →" },
  ]

  const alerts = isCollege ? [
    { icon: "⚠️", color: T.amber, label: "Cohort ELO dropped 12% in DBMS",       sub: "Assign remedial tasks to 28 flagged students",  page: "tasks",        urgent: true  },
    { icon: "🎓", color: T.sky,   label: "14 new students joined B.Tech 2024",    sub: "Pending orientation task assignment",           page: "people",       urgent: false },
    { icon: "🏆", color: T.green, label: "3 placement offers accepted",            sub: "Amazon · Flipkart · Juspay",                   page: "outcomes",     urgent: false },
    { icon: "📋", color: T.blue,  label: "2 faculty tasks pending your review",    sub: "Algorithms Lab · SQL Basics",                   page: "tasks",        urgent: true  },
    { icon: "📅", color: T.purple, label: "Campus Drive next Tuesday",            sub: "TCS · 180 students eligible · Confirm list",   page: "events",       urgent: true  },
  ] : [
    { icon: "🔗", color: T.red,   label: "ATS sync issue — Greenhouse",            sub: "Last sync failed 6h ago · Check integration",  page: "settings",     urgent: true  },
    { icon: "📊", color: T.amber, label: "ELO threshold reached",                  sub: "Eligible for Verified Partner badge",          page: "intelligence", urgent: false },
    { icon: "👥", color: T.sky,   label: "5 new verified engineers",               sub: "Backend & DevOps · Ready for interviews",      page: "people",       urgent: false },
    { icon: "🧪", color: T.blue,  label: "Assessment completion 78%",              sub: "React Native · 14 engineers pending",          page: "tasks",        urgent: true  },
  ]

  const upcoming = isCollege ? [
    { icon: "📅", label: "TCS Campus Drive",    when: "Tue, 24 Jun",   detail: "180 eligible · Auditorium 1" },
    { icon: "🎓", label: "Semester Reviews",    when: "Thu, 26 Jun",   detail: "CSE Dept · 8 faculty panels" },
    { icon: "🏆", label: "Placement Season",    when: "Jul 2026",      detail: "Expected 200+ JD listings" },
  ] : [
    { icon: "📅", label: "Hiring Panel",       when: "Wed, 25 Jun",   detail: "Senior Backend · 6 candidates" },
    { icon: "🧪", label: "Skill Assessment",   when: "Fri, 27 Jun",   detail: "React Native · 14 engineers" },
    { icon: "📊", label: "Q2 Talent Review",   when: "Jul 1",         detail: "30-min · All hiring managers" },
  ]

  return (
    <PageShell>
      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 12, color: T.ink4, fontWeight: 500 }}>{greeting}, {firstName} · Admin Console</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: T.ink, lineHeight: 1.2 }}>
          What needs <span style={{ color: T.sky }}>attention</span> now?
        </h1>
      </div>

      {/* Verification banner if needed */}
      {(userData?.verificationStatus !== "verified") && (
        <VerificationBanner level={0} orgName={userData?.org_name} />
      )}

      {/* Pulse cards */}
      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, minWidth: 500 }}>
          {pulse.map((p, i) => (
            <KPICard key={i} {...p} onClick={() => onNav(i < 2 ? "intelligence" : "outcomes")} />
          ))}
        </div>
      </div>

      {/* Priority alerts */}
      <Card style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2 }}>Priority Alerts</div>
          <Badge color={T.red}>{alerts.filter(a => a.urgent).length} urgent</Badge>
        </div>
        {alerts.map((a, i) => (
          <div
            key={i}
            onClick={() => onNav(a.page)}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "13px 18px",
              borderBottom: i < alerts.length - 1 ? `1px solid ${T.border}` : "none",
              cursor: "pointer", transition: "background 0.1s",
              borderLeft: `3px solid ${a.color}`,
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.bg}
            onMouseLeave={e => e.currentTarget.style.background = T.surface}
          >
            <span style={{ fontSize: 18 }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{a.label}</span>
                {a.urgent && <Badge color={T.red}>Urgent</Badge>}
              </div>
              <div style={{ fontSize: 12, color: T.ink4, marginTop: 2 }}>{a.sub}</div>
            </div>
            <span style={{ color: T.ink4, fontSize: 18 }}>›</span>
          </div>
        ))}
      </Card>

      {/* Two-column lower zone */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Upcoming */}
        <Card>
          <SectionHead title="Upcoming" action={() => onNav("events")} actionLabel="All events →" />
          {upcoming.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < upcoming.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <span style={{ fontSize: 18 }}>{e.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{e.label}</div>
                <div style={{ fontSize: 11, color: T.sky, fontWeight: 600 }}>{e.when}</div>
                <div style={{ fontSize: 11, color: T.ink4 }}>{e.detail}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* Quick nav */}
        <Card>
          <SectionHead title="Quick Actions" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: "👥", label: "People",        page: "people"        },
              { icon: "📊", label: "Intelligence",  page: "intelligence"  },
              { icon: "✓",  label: "Tasks",         page: "tasks"         },
              { icon: "🎓", label: "Cohorts",        page: "cohorts"       },
              { icon: "💼", label: "Opportunities", page: "opportunities" },
              { icon: "⚙",  label: "Settings",      page: "settings"      },
            ].map(q => (
              <button
                key={q.page}
                onClick={() => onNav(q.page)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "10px 12px",
                  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
                  cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 600, color: T.ink2,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.sky; e.currentTarget.style.color = T.sky }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.ink2 }}
              >
                <span style={{ fontSize: 16 }}>{q.icon}</span> {q.label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════
function IntelligencePage({ userData }) {
  const [tab, setTab] = useState("pulse")
  const isCollege = (userData?.org_type || "college") !== "company"

  const tabs = isCollege
    ? ["pulse", "elo", "placement", "risk", "cohort"]
    : ["pulse", "elo", "pipeline", "skills", "retention"]
  const tabLabels = {
    pulse: "Live Pulse", elo: "ELO Trends", placement: "Placement", risk: "Risk",
    cohort: "Cohort Map", pipeline: "Pipeline", skills: "Skills", retention: "Retention",
  }

  const collegePulse = [
    { value: "924",  label: "Avg ELO",      trend: "+38",  trendDir: "up",  color: T.sky,    context: "Institution average this month"  },
    { value: "38%",  label: "Job Ready",    trend: "+6%",  trendDir: "up",  color: T.green,  context: "Exceeds national avg of 31%"     },
    { value: "67",   label: "Placed",       trend: "+12",  trendDir: "up",  color: T.amber,  context: "Academic year placements"        },
    { value: "3",    label: "At Risk",      trend: "+3",   trendDir: "down",color: T.red,    context: "Cohorts below ELO 750"           },
  ]

  const companyPulse = [
    { value: "312",  label: "Talent Pool",  trend: "+5",   trendDir: "up",  color: T.sky,    context: "Verified, active candidates"    },
    { value: "18",   label: "Open Roles",   trend: "+3",   trendDir: "up",  color: T.green,  context: "Across departments"             },
    { value: "4.2d", label: "Time to Hire", trend: "-0.8d",trendDir: "up",  color: T.amber,  context: "Down from 5.0d last quarter"    },
    { value: "82%",  label: "Offer Accept", trend: "+4%",  trendDir: "up",  color: T.purple, context: "Acceptance rate this quarter"   },
  ]

  const pulse = isCollege ? collegePulse : companyPulse

  const eloDistribution = [
    { range: "900–1000 (Expert)",     count: 28, pct: 8,  color: T.green  },
    { range: "800–899 (Advanced)",    count: 84, pct: 22, color: T.sky    },
    { range: "700–799 (Proficient)",  count: 142,pct: 38, color: T.blue   },
    { range: "600–699 (Developing)",  count: 88, pct: 24, color: T.amber  },
    { range: "< 600 (Beginner)",      count: 32, pct: 8,  color: T.red    },
  ]

  return (
    <PageShell>
      <PageHeader
        title="Intelligence"
        sub={isCollege ? "Live analytics for your institution" : "Talent & hiring analytics"}
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "7px 14px", borderRadius: 8, border: `1px solid ${tab === t ? T.sky : T.border}`,
              background: tab === t ? T.skyL : T.bg, color: tab === t ? T.sky : T.ink3,
              fontSize: 12, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap",
            }}
          >{tabLabels[t]}</button>
        ))}
      </div>

      {/* Live Pulse tab */}
      {tab === "pulse" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {pulse.map((p, i) => <KPICard key={i} {...p} />)}
          </div>
          <Card>
            <SectionHead title="Activity Feed (Last 24h)" />
            {[
              { time: "2m ago",  icon: "🟢", msg: isCollege ? "Ankit Sharma completed React Hooks challenge — ELO +18" : "Priya Nair passed React Native assessment — score 94%" },
              { time: "12m ago", icon: "📋", msg: isCollege ? "Prof. Ravi published new DSA task to B.Tech 2026 batch" : "New JD published: Senior Backend Engineer" },
              { time: "1h ago",  icon: "🏆", msg: isCollege ? "Placement offer confirmed — Neha Rao → Amazon (₹14L)" : "Interview scheduled: Arun Kumar → Backend Panel" },
              { time: "3h ago",  icon: "⚠️", msg: isCollege ? "DBMS cohort ELO dipped below threshold — intervention suggested" : "ATS sync failed — check Greenhouse integration" },
              { time: "6h ago",  icon: "👥", msg: isCollege ? "14 new students onboarded to B.Tech CSE 2024" : "5 engineers verified and added to talent pool" },
            ].map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < 4 ? `1px solid ${T.border}` : "none" }}>
                <span style={{ fontSize: 16, marginTop: 1 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.5 }}>{a.msg}</div>
                  <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* ELO tab */}
      {tab === "elo" && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <SectionHead title="ELO Score Distribution" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {eloDistribution.map((row, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: T.ink2 }}>{row.range}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: row.color }}>{row.count}</span>
                  </div>
                  <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${row.pct}%`, height: "100%", background: row.color, borderRadius: 4, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <KPICard value="924" label="Institution Avg" trend="+38" trendDir="up" color={T.sky} context="Up 4.3% this month" />
            <KPICard value="↑14%" label="ELO Growth" trend="+6%" trendDir="up" color={T.green} context="Month-over-month rate" />
          </div>
        </>
      )}

      {/* Placement / Pipeline tab */}
      {(tab === "placement" || tab === "pipeline") && (
        <Card>
          <SectionHead title={isCollege ? "Placement Funnel" : "Hiring Pipeline"} />
          {(isCollege ? [
            { stage: "Eligible Students",     count: 374, pct: 100 },
            { stage: "Profile Complete",       count: 312, pct: 83  },
            { stage: "Skills Verified",        count: 198, pct: 53  },
            { stage: "Applied to JDs",         count: 142, pct: 38  },
            { stage: "Interview Called",       count: 89,  pct: 24  },
            { stage: "Offer Received",         count: 67,  pct: 18  },
          ] : [
            { stage: "Applications",          count: 280, pct: 100 },
            { stage: "Screening Pass",         count: 186, pct: 66  },
            { stage: "Skill Assessed",         count: 124, pct: 44  },
            { stage: "Technical Interview",    count: 72,  pct: 26  },
            { stage: "Final Round",            count: 31,  pct: 11  },
            { stage: "Offer Extended",         count: 18,  pct: 6   },
          ]).map((row, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: i < 5 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: T.ink2, fontWeight: 500 }}>{row.stage}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: T.sky }}>{row.count}</span>
              </div>
              <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${row.pct}%`, height: "100%", background: `linear-gradient(90deg, ${T.sky}, ${T.skyDark})`, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Risk / Skills / Cohort / Retention tabs */}
      {(tab === "risk" || tab === "skills" || tab === "cohort" || tab === "retention") && (
        <EmptyState icon="📊" title="Full analytics coming soon" sub="This view is being built. Data pipelines connecting." />
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 3 — TASKS
// ═══════════════════════════════════════════════════════════════════════════════
function TasksPage({ userData, user }) {
  const [tab, setTab] = useState("active")
  const [showCreate, setShowCreate] = useState(false)
  const isCollege = (userData?.org_type || "college") !== "company"

  const tasks = isCollege ? [
    { id: 1, title: "DSA Problem Set — Week 7",     type: "Assignment", assignedTo: "B.Tech CSE 2026",  dueDate: "Jun 20",  status: "active",    submissions: "67/142",   priority: "high"   },
    { id: 2, title: "SQL Query Lab — Advanced",     type: "Lab",        assignedTo: "B.Tech CSE 2025",  dueDate: "Jun 22",  status: "active",    submissions: "12/89",    priority: "medium" },
    { id: 3, title: "React Hooks Project",          type: "Project",    assignedTo: "MCA 2025 Batch",   dueDate: "Jun 25",  status: "active",    submissions: "0/34",     priority: "low"    },
    { id: 4, title: "DBMS Remedial Task",           type: "Remedial",   assignedTo: "28 flagged studs", dueDate: "Jun 18",  status: "urgent",    submissions: "3/28",     priority: "urgent" },
    { id: 5, title: "Algorithms Lab — Week 4",      type: "Lab",        assignedTo: "B.Tech CSE 2026",  dueDate: "Jun 15",  status: "completed", submissions: "142/142",  priority: "done"   },
  ] : [
    { id: 1, title: "React Native Assessment",      type: "Assessment", assignedTo: "Mobile Pool",      dueDate: "Jun 22",  status: "active",    submissions: "8/22",     priority: "high"   },
    { id: 2, title: "Backend System Design",        type: "Challenge",  assignedTo: "Backend Pool",     dueDate: "Jun 25",  status: "active",    submissions: "5/14",     priority: "medium" },
    { id: 3, title: "DevOps Automation Task",       type: "Task",       assignedTo: "DevOps Pool",      dueDate: "Jun 28",  status: "active",    submissions: "0/8",      priority: "low"    },
    { id: 4, title: "Frontend Coding Round",        type: "Assessment", assignedTo: "Frontend Pool",    dueDate: "Jun 19",  status: "urgent",    submissions: "2/18",     priority: "urgent" },
    { id: 5, title: "Python Data Pipeline Task",    type: "Task",       assignedTo: "Data Pool",        dueDate: "Jun 10",  status: "completed", submissions: "12/12",    priority: "done"   },
  ]

  const activeFiltered = tasks.filter(t => tab === "active" ? t.status !== "completed" : t.status === "completed")

  const priorityColor = { urgent: T.red, high: T.amber, medium: T.sky, low: T.ink4, done: T.green }
  const typeColor     = { Assignment: T.blue, Lab: T.teal, Project: T.purple, Remedial: T.red, Assessment: T.sky, Challenge: T.amber, Task: T.green }

  return (
    <PageShell>
      <PageHeader
        title="Tasks"
        sub={isCollege ? "Publish and track institution tasks" : "Manage candidate assessments"}
        actions={[<Btn key="c" onClick={() => setShowCreate(true)}>+ Create Task</Btn>]}
      />

      {/* Stats row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto" }}>
        <KPICard value={tasks.filter(t => t.status === "urgent").length}  label="Urgent"    color={T.red}   context="Needs attention now"  />
        <KPICard value={tasks.filter(t => t.status === "active").length}  label="Active"    color={T.sky}   context="Ongoing tasks"        />
        <KPICard value={tasks.filter(t => t.status === "completed").length} label="Done"   color={T.green} context="Completed this week"  />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {["active", "completed"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 16px", borderRadius: 8, border: `1px solid ${tab === t ? T.sky : T.border}`,
            background: tab === t ? T.skyL : T.bg, color: tab === t ? T.sky : T.ink3,
            fontSize: 12, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontFamily: FONT, textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>

      {/* Task list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {activeFiltered.length === 0
          ? <EmptyState icon="✓" title="No tasks here" sub="Create a task to get started." action={() => setShowCreate(true)} actionLabel="Create Task" />
          : activeFiltered.map(task => (
            <Card key={task.id} style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{task.title}</span>
                    <Chip color={typeColor[task.type] || T.sky} bg={`${typeColor[task.type] || T.sky}15`}>{task.type}</Chip>
                    {task.priority === "urgent" && <Badge color={T.red}>URGENT</Badge>}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: T.ink4 }}>👥 {task.assignedTo}</span>
                    <span style={{ fontSize: 12, color: T.ink4 }}>📅 Due {task.dueDate}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: T.sky }}>
                      {task.submissions} submitted
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Btn variant="outline" style={{ fontSize: 11, padding: "5px 10px" }}>View</Btn>
                  {task.status !== "completed" && (
                    <Btn variant="outline" style={{ fontSize: 11, padding: "5px 10px" }}>Edit</Btn>
                  )}
                </div>
              </div>
              {/* Submission progress bar */}
              {task.status !== "completed" && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ height: 4, background: T.bg, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.round(parseInt(task.submissions.split("/")[0]) / parseInt(task.submissions.split("/")[1]) * 100)}%`,
                      height: "100%", background: task.priority === "urgent" ? T.red : T.sky, borderRadius: 2,
                    }} />
                  </div>
                </div>
              )}
            </Card>
          ))
        }
      </div>

      {/* Create task modal stub */}
      {showCreate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
        }}>
          <Card style={{ width: "100%", maxWidth: 480, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.ink }}>Create Task</h3>
              <Btn variant="ghost" onClick={() => setShowCreate(false)} style={{ padding: "4px 8px" }}>✕</Btn>
            </div>
            {["Task title", "Type (Assignment / Lab / Project / Remedial)", "Assign to (batch / cohort / group)", "Due date"].map((placeholder, i) => (
              <input
                key={i}
                placeholder={placeholder}
                style={{
                  width: "100%", padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 10,
                  fontSize: 13, color: T.ink, fontFamily: FONT, marginBottom: 10, outline: "none",
                  background: T.bg,
                }}
              />
            ))}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setShowCreate(false)}>Cancel</Btn>
              <Btn onClick={() => setShowCreate(false)}>Publish Task</Btn>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 4 — PEOPLE
// ═══════════════════════════════════════════════════════════════════════════════
function PeoplePage({ userData }) {
  const [tab, setTab]       = useState("students")
  const [search, setSearch] = useState("")
  const isCollege = (userData?.org_type || "college") !== "company"

  const tabs = isCollege ? ["students", "faculty", "recruiters", "approvals"] : ["engineers", "hiring", "approvals"]

  const people = isCollege ? {
    students: [
      { name: "Ankit Sharma",   role: "B.Tech CSE 2026",   elo: 943, status: "active",   badge: "Top 10%",  placement: null           },
      { name: "Priya Nair",     role: "B.Tech CSE 2025",   elo: 887, status: "active",   badge: null,       placement: null           },
      { name: "Rahul Gupta",    role: "MCA 2025",          elo: 821, status: "active",   badge: null,       placement: null           },
      { name: "Meera Rao",      role: "B.Tech CSE 2024",   elo: 962, status: "placed",   badge: "Placed",   placement: "Amazon ₹14L"  },
      { name: "Arjun Khanna",   role: "B.Tech ECE 2026",   elo: 634, status: "at-risk",  badge: "At Risk",  placement: null           },
    ],
    faculty: [
      { name: "Dr. Ramesh Kumar",   role: "CS Department · Professor",    elo: null, status: "verified", badge: "Verified",   placement: null },
      { name: "Prof. Anita Desai",  role: "Mathematics · Associate Prof", elo: null, status: "pending",  badge: "Pending",    placement: null },
    ],
    recruiters: [
      { name: "TCS Campus Team",    role: "External Recruiter",  elo: null, status: "active",   badge: "Active",   placement: null },
      { name: "InfoSys HR",         role: "External Recruiter",  elo: null, status: "active",   badge: "Active",   placement: null },
    ],
    approvals: [
      { name: "Dr. Ramesh Kumar",  role: "Professor · CS Department",  elo: null, status: "pending", badge: "Faculty",    placement: null },
      { name: "Anika Sharma",      role: "Student · B.Tech 2024",      elo: null, status: "pending", badge: "Student",    placement: null },
      { name: "InfoSys Campus",    role: "External Recruiter",          elo: null, status: "pending", badge: "Recruiter",  placement: null },
    ],
  } : {
    engineers: [
      { name: "Arjun Patel",    role: "Backend · Node.js, Go",      elo: 921, status: "active",  badge: "Top Match", placement: null },
      { name: "Sneha Iyer",     role: "Frontend · React, Next.js",  elo: 876, status: "active",  badge: null,        placement: null },
      { name: "Rohan Das",      role: "DevOps · K8s, AWS",          elo: 843, status: "active",  badge: null,        placement: null },
    ],
    hiring: [
      { name: "Priya Menon",    role: "Senior Backend Engineer",    elo: null, status: "interview", badge: "Interview", placement: null },
      { name: "Arun Kumar",     role: "Backend Panel",              elo: null, status: "scheduled", badge: "Scheduled", placement: null },
    ],
    approvals: [
      { name: "New Engineer 1", role: "Backend · Applied",           elo: null, status: "pending",  badge: "New",       placement: null },
    ],
  }

  const currentTab = people[tab] || []
  const filtered = currentTab.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = { active: T.green, placed: T.sky, "at-risk": T.red, pending: T.amber, verified: T.green, interview: T.purple, scheduled: T.sky }

  return (
    <PageShell>
      <PageHeader
        title="People"
        sub={isCollege ? "Students, faculty, and recruiters" : "Talent pool and hiring team"}
        actions={[<Btn key="i">+ Invite</Btn>]}
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 14px", borderRadius: 8, border: `1px solid ${tab === t ? T.sky : T.border}`,
            background: tab === t ? T.skyL : T.bg, color: tab === t ? T.sky : T.ink3,
            fontSize: 12, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontFamily: FONT,
            textTransform: "capitalize", whiteSpace: "nowrap",
          }}>{t}</button>
        ))}
      </div>

      {/* Search */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or role…"
        style={{
          width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 10,
          fontSize: 13, color: T.ink, fontFamily: FONT, marginBottom: 16, outline: "none", background: T.bg,
        }}
      />

      {/* People list */}
      {filtered.length === 0
        ? <EmptyState icon="👥" title="No people found" sub="Try a different search or tab." />
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((p, i) => {
              const statusC = statusColor[p.status] || T.ink4
              return (
                <Card key={i} style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", background: T.skyL,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15, fontWeight: 700, color: T.sky, flexShrink: 0,
                    }}>{p.name.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{p.name}</span>
                        {p.elo && <span style={{ fontSize: 11, fontFamily: MONO, color: T.sky, fontWeight: 700 }}>ELO {p.elo}</span>}
                        {p.badge && <Chip color={statusC} bg={`${statusC}15`}>{p.badge}</Chip>}
                      </div>
                      <div style={{ fontSize: 12, color: T.ink4, marginTop: 2 }}>{p.role}</div>
                      {p.placement && <div style={{ fontSize: 11, color: T.green, fontWeight: 600, marginTop: 3 }}>✓ {p.placement}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {p.status === "pending" ? (
                        <>
                          <Btn style={{ fontSize: 11, padding: "5px 10px" }}>Approve</Btn>
                          <Btn variant="outline" style={{ fontSize: 11, padding: "5px 10px" }}>Deny</Btn>
                        </>
                      ) : (
                        <Btn variant="outline" style={{ fontSize: 11, padding: "5px 10px" }}>View</Btn>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      }
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 5 — COMMUNITY
// ═══════════════════════════════════════════════════════════════════════════════
function CommunityPage({ userData }) {
  const [tab, setTab] = useState("feed")
  const isCollege = (userData?.org_type || "college") !== "company"

  const posts = [
    { author: "Dr. Ramesh Kumar",  role: "CS Professor",        time: "30m ago",  content: "Important: DSA lab submissions due by Friday midnight. Late submissions will not be evaluated.", likes: 14, comments: 3, pinned: true  },
    { author: "Placement Cell",    role: "Institution Admin",   time: "2h ago",   content: "TCS Campus Drive confirmed for Jun 24. All B.Tech CSE 2024 students must update their profiles by Jun 20.", likes: 89, comments: 21, pinned: true  },
    { author: "Ankit Sharma",      role: "Student · CSE 2026",  time: "4h ago",   content: "Just cleared the Amazon OA! Thanks to the DSA tasks assigned this month. Really helped.", likes: 42, comments: 8,  pinned: false },
    { author: "Prof. Anita Desai", role: "Mathematics",         time: "1d ago",   content: "Math for competitive programming session this Saturday 10am. Google Meet link in the group.", likes: 67, comments: 12, pinned: false },
  ]

  return (
    <PageShell>
      <PageHeader
        title="Community"
        sub="Institution-wide feed and announcements"
        actions={[<Btn key="p">+ Post</Btn>]}
      />

      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {["feed", "announcements", "qna"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 14px", borderRadius: 8, border: `1px solid ${tab === t ? T.sky : T.border}`,
            background: tab === t ? T.skyL : T.bg, color: tab === t ? T.sky : T.ink3,
            fontSize: 12, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontFamily: FONT,
            textTransform: "capitalize",
          }}>{t === "qna" ? "Q&A" : t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === "feed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {posts.map((post, i) => (
            <Card key={i} style={{ padding: "16px 18px", borderLeft: post.pinned ? `3px solid ${T.amber}` : `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.skyL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.sky, flexShrink: 0 }}>
                    {post.author.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{post.author}</div>
                    <div style={{ fontSize: 11, color: T.ink4 }}>{post.role} · {post.time}</div>
                  </div>
                </div>
                {post.pinned && <Chip color={T.amber} bg={T.amberL}>📌 Pinned</Chip>}
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>{post.content}</p>
              <div style={{ display: "flex", gap: 16 }}>
                <button style={{ border: "none", background: "transparent", fontSize: 12, color: T.ink4, cursor: "pointer", fontFamily: FONT }}>👍 {post.likes}</button>
                <button style={{ border: "none", background: "transparent", fontSize: 12, color: T.ink4, cursor: "pointer", fontFamily: FONT }}>💬 {post.comments}</button>
                <button style={{ border: "none", background: "transparent", fontSize: 12, color: T.ink4, cursor: "pointer", fontFamily: FONT }}>📤 Share</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(tab === "announcements" || tab === "qna") && (
        <EmptyState icon={tab === "qna" ? "❓" : "📢"} title={tab === "qna" ? "No questions yet" : "No announcements"} sub="This section will be populated as your community grows." />
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 6 — GROUPS
// ═══════════════════════════════════════════════════════════════════════════════
function GroupsPage({ userData }) {
  const [showCreate, setShowCreate] = useState(false)
  const groups = [
    { name: "B.Tech CSE 2026",       type: "Batch",       members: 142, tasks: 4, lead: "Dr. Ramesh Kumar"  },
    { name: "MCA 2025",              type: "Batch",       members: 34,  tasks: 2, lead: "Prof. Anita Desai" },
    { name: "Competitive Prog Club", type: "Club",        members: 28,  tasks: 1, lead: "Dr. Ramesh Kumar"  },
    { name: "Placement Prep Group",  type: "Study Group", members: 89,  tasks: 3, lead: "Placement Cell"    },
  ]
  return (
    <PageShell>
      <PageHeader title="Groups" sub="Manage batches, clubs, and study groups" actions={[<Btn key="c" onClick={() => setShowCreate(true)}>+ Create Group</Btn>]} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {groups.map((g, i) => (
          <Card key={i} style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{g.name}</span>
                  <Chip>{g.type}</Chip>
                </div>
                <div style={{ fontSize: 12, color: T.ink4 }}>👥 {g.members} members · 📋 {g.tasks} tasks · Led by {g.lead}</div>
              </div>
              <Btn variant="outline" style={{ fontSize: 11, padding: "5px 10px" }}>Manage →</Btn>
            </div>
          </Card>
        ))}
      </div>
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <Card style={{ width: "100%", maxWidth: 400, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.ink }}>Create Group</h3>
              <Btn variant="ghost" onClick={() => setShowCreate(false)}>✕</Btn>
            </div>
            {["Group name", "Type (Batch / Club / Study Group)", "Add members"].map((p, i) => (
              <input key={i} placeholder={p} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontFamily: FONT, marginBottom: 10, outline: "none", background: T.bg, color: T.ink }} />
            ))}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setShowCreate(false)}>Cancel</Btn>
              <Btn onClick={() => setShowCreate(false)}>Create</Btn>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 7 — COHORTS
// ═══════════════════════════════════════════════════════════════════════════════
function CohortsPage({ userData }) {
  const cohorts = [
    { name: "DSA Masters",         domain: "Data Structures",   members: 38,  avgElo: 921, trend: "+42", trendDir: "up",   status: "healthy"   },
    { name: "Frontend Builders",   domain: "React / Next.js",   members: 52,  avgElo: 887, trend: "+28", trendDir: "up",   status: "healthy"   },
    { name: "DBMS Advanced",       domain: "Database Design",   members: 28,  avgElo: 712, trend: "-34", trendDir: "down", status: "at-risk"   },
    { name: "Systems Programming", domain: "C++ / OS / Networks",members: 21, avgElo: 843, trend: "+18", trendDir: "up",   status: "healthy"   },
    { name: "ML Foundations",      domain: "Machine Learning",  members: 44,  avgElo: 776, trend: "+5",  trendDir: "up",   status: "watch"     },
  ]
  const statusColor = { healthy: T.green, "at-risk": T.red, watch: T.amber }
  return (
    <PageShell>
      <PageHeader title="Cohorts" sub="Skill-domain cohorts across your institution" actions={[<Btn key="c">+ Create Cohort</Btn>]} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {cohorts.map((c, i) => (
          <Card key={i} style={{ borderLeft: `3px solid ${statusColor[c.status]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 3 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: T.ink4 }}>{c.domain}</div>
              </div>
              <Chip color={statusColor[c.status]} bg={`${statusColor[c.status]}15`}>{c.status}</Chip>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: T.sky }}>{c.avgElo}</div>
                <div style={{ fontSize: 10, color: T.ink4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Avg ELO</div>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: T.ink2 }}>{c.members}</div>
                <div style={{ fontSize: 10, color: T.ink4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Members</div>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: c.trendDir === "up" ? T.green : T.red }}>
                  {c.trendDir === "up" ? "↑" : "↓"} {c.trend}
                </div>
                <div style={{ fontSize: 10, color: T.ink4, textTransform: "uppercase", letterSpacing: "0.05em" }}>ELO Trend</div>
              </div>
            </div>
            <Btn variant="outline" style={{ marginTop: 12, width: "100%", fontSize: 11, padding: "7px" }}>
              {c.status === "at-risk" ? "⚠️ Assign Intervention →" : "View Cohort →"}
            </Btn>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 8 — EVENTS
// ═══════════════════════════════════════════════════════════════════════════════
function EventsPage({ userData }) {
  const [tab, setTab] = useState("upcoming")
  const isCollege = (userData?.org_type || "college") !== "company"

  const events = {
    upcoming: [
      { title: isCollege ? "TCS Campus Drive" : "Hiring Panel — Backend",       date: "Jun 24, 2026",  time: "9:00 AM",  venue: isCollege ? "Auditorium 1" : "Conference Room A",  attendees: isCollege ? 180 : 6,   type: "Drive"     },
      { title: isCollege ? "Semester Reviews" : "React Native Assessment",      date: "Jun 26, 2026",  time: "10:00 AM", venue: isCollege ? "CS Block" : "Remote",                 attendees: isCollege ? 89 : 14,   type: "Review"    },
      { title: isCollege ? "Guest Lecture — ML" : "Q2 Talent Review",           date: "Jul 1, 2026",   time: "3:00 PM",  venue: isCollege ? "Seminar Hall" : "Board Room",         attendees: isCollege ? 200 : 12,  type: "Lecture"   },
    ],
    past: [
      { title: isCollege ? "Infosys Pool Drive" : "Spring Hiring Sprint",       date: "Jun 10, 2026",  time: "9:00 AM",  venue: isCollege ? "Auditorium 2" : "Zoom",               attendees: isCollege ? 220 : 18,  type: "Drive"     },
    ],
  }

  const typeColor = { Drive: T.sky, Review: T.amber, Lecture: T.purple, Assessment: T.green }

  return (
    <PageShell>
      <PageHeader title="Events" sub="Campus drives, sessions, and milestones" actions={[<Btn key="c">+ Create Event</Btn>]} />
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {["upcoming", "past"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 14px", borderRadius: 8, border: `1px solid ${tab === t ? T.sky : T.border}`,
            background: tab === t ? T.skyL : T.bg, color: tab === t ? T.sky : T.ink3,
            fontSize: 12, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontFamily: FONT, textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {events[tab].map((e, i) => (
          <Card key={i} style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ textAlign: "center", background: T.skyL, borderRadius: 10, padding: "8px 12px", flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.sky, textTransform: "uppercase" }}>{e.date.split(",")[0].split(" ")[0]}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.sky, fontFamily: MONO, lineHeight: 1 }}>{e.date.split(" ")[1].replace(",", "")}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{e.title}</span>
                  <Chip color={typeColor[e.type] || T.sky} bg={`${typeColor[e.type] || T.sky}15`}>{e.type}</Chip>
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: T.ink4 }}>⏰ {e.time}</span>
                  <span style={{ fontSize: 12, color: T.ink4 }}>📍 {e.venue}</span>
                  <span style={{ fontSize: 12, color: T.sky, fontWeight: 600 }}>👥 {e.attendees} attendees</span>
                </div>
              </div>
              <Btn variant="outline" style={{ fontSize: 11, padding: "6px 12px" }}>{tab === "upcoming" ? "Manage →" : "Report"}</Btn>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 9 — OPPORTUNITIES
// ═══════════════════════════════════════════════════════════════════════════════
function OpportunitiesPage({ userData }) {
  const [tab, setTab] = useState("active")
  const isCollege = (userData?.org_type || "college") !== "company"

  const jds = [
    { title: isCollege ? "Software Engineer — TCS" : "Senior Backend Engineer",         company: isCollege ? "TCS" : "Internal",  eligibility: isCollege ? "B.Tech CSE/IT, ELO ≥ 800" : "ELO ≥ 850, 3+ yrs",  ctc: isCollege ? "₹3.5L" : "₹18L",     deadline: "Jun 20", applicants: 89,  status: "active"  },
    { title: isCollege ? "Data Analyst — Juspay" : "Frontend Lead",                     company: isCollege ? "Juspay" : "Internal", eligibility: isCollege ? "B.Tech any, ELO ≥ 750" : "ELO ≥ 800, React expert", ctc: isCollege ? "₹8L" : "₹22L",      deadline: "Jun 25", applicants: 42,  status: "active"  },
    { title: isCollege ? "Backend Intern — Razorpay" : "DevOps Engineer",               company: isCollege ? "Razorpay" : "Internal", eligibility: isCollege ? "3rd/4th year, Go/Node" : "K8s + AWS certified", ctc: isCollege ? "₹25k/mo" : "₹16L", deadline: "Jul 1",  applicants: 18,  status: "active"  },
    { title: isCollege ? "SDE-1 — Amazon" : "Data Engineer",                             company: isCollege ? "Amazon" : "Internal", eligibility: isCollege ? "All batches, ELO ≥ 900" : "Python + Spark",       ctc: isCollege ? "₹14L" : "₹15L",     deadline: "Jun 18", applicants: 142, status: "closed"  },
  ]

  const activeJDs = jds.filter(j => tab === "active" ? j.status === "active" : j.status === "closed")

  return (
    <PageShell>
      <PageHeader
        title="Opportunities"
        sub={isCollege ? "Live job postings and internships" : "Open roles and JD management"}
        actions={[<Btn key="c">+ Post JD</Btn>]}
      />
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {["active", "closed"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 14px", borderRadius: 8, border: `1px solid ${tab === t ? T.sky : T.border}`,
            background: tab === t ? T.skyL : T.bg, color: tab === t ? T.sky : T.ink3,
            fontSize: 12, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontFamily: FONT, textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {activeJDs.map((jd, i) => (
          <Card key={i} style={{ padding: "15px 16px", opacity: jd.status === "closed" ? 0.7 : 1 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.skyL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.sky, flexShrink: 0 }}>
                {jd.company.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 3 }}>{jd.title}</div>
                <div style={{ fontSize: 12, color: T.sky, fontWeight: 600, marginBottom: 4 }}>{jd.company} · {jd.ctc}</div>
                <div style={{ fontSize: 11, color: T.ink4, marginBottom: 6 }}>{jd.eligibility}</div>
                <div style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 11, color: T.ink3 }}>📅 Deadline: {jd.deadline}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: MONO, color: T.sky }}>{jd.applicants} applied</span>
                </div>
              </div>
              <Btn variant="outline" style={{ fontSize: 11, padding: "5px 10px" }}>{jd.status === "closed" ? "View" : "Manage →"}</Btn>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 10 — OUTCOMES
// ═══════════════════════════════════════════════════════════════════════════════
function OutcomesPage({ userData }) {
  const isCollege = (userData?.org_type || "college") !== "company"

  const placed = isCollege ? [
    { name: "Meera Rao",     company: "Amazon",    role: "SDE-1",            ctc: "₹14L",   batch: "CSE 2024", date: "Jun 2, 2026"   },
    { name: "Kiran Patel",   company: "Flipkart",  role: "Backend Engineer", ctc: "₹10L",   batch: "CSE 2024", date: "Jun 5, 2026"   },
    { name: "Disha Nair",    company: "Juspay",    role: "Data Analyst",     ctc: "₹8L",    batch: "CSE 2025", date: "Jun 8, 2026"   },
    { name: "Rahul Joshi",   company: "TCS",       role: "Systems Engineer", ctc: "₹3.5L",  batch: "ECE 2024", date: "May 28, 2026"  },
    { name: "Priya Sharma",  company: "Wipro",     role: "Associate",        ctc: "₹3.5L",  batch: "IT 2024",  date: "May 25, 2026"  },
  ] : [
    { name: "Arjun Patel",   company: "Internal",  role: "Senior Backend",   ctc: "₹18L",   batch: "Hire 2026", date: "Jun 1, 2026"  },
    { name: "Sneha Iyer",    company: "Internal",  role: "Frontend Lead",    ctc: "₹22L",   batch: "Hire 2026", date: "Jun 6, 2026"  },
  ]

  return (
    <PageShell>
      <PageHeader title="Outcomes" sub={isCollege ? "Placement records and career progression" : "Hiring outcomes and retention"} />

      {/* Summary KPIs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto" }}>
        <KPICard value={isCollege ? "67" : "8"}     label="Placed / Hired"  trend="+12" trendDir="up" color={T.green}  context="This academic year" />
        <KPICard value={isCollege ? "₹8.2L" : "₹18L"} label="Avg CTC"      trend="+18%" trendDir="up" color={T.amber}  context="vs last year" />
        <KPICard value={isCollege ? "38%" : "76%"}  label="Success Rate"    trend="+6%"  trendDir="up" color={T.sky}    context="Eligible → Placed" />
      </div>

      {/* Placements table */}
      <Card>
        <SectionHead title={isCollege ? "Recent Placements" : "Recent Hires"} />
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {placed.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < placed.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.greenL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.green, flexShrink: 0 }}>
                {p.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{p.name}</div>
                <div style={{ fontSize: 11, color: T.ink4 }}>{p.role} · {p.company} · {p.batch}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: T.green }}>{p.ctc}</div>
                <div style={{ fontSize: 10, color: T.ink4 }}>{p.date}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 11 — SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsPage({ userData, user }) {
  const [tab, setTab] = useState("profile")
  const isCollege = (userData?.org_type || "college") !== "company"

  const profileFields = isCollege ? [
    { label: "Institution Name",    value: userData?.org_name        || "",  key: "org_name"       },
    { label: "Type",                value: userData?.org_inst_type   || "",  key: "org_inst_type"  },
    { label: "Location",            value: userData?.org_location    || "",  key: "org_location"   },
    { label: "Website",             value: userData?.org_website     || "",  key: "org_website"    },
    { label: "NAAC Grade",          value: userData?.org_naac_grade  || "",  key: "org_naac_grade" },
    { label: "Admin Name",          value: userData?.org_admin_name  || "",  key: "org_admin_name" },
    { label: "Admin Role",          value: userData?.org_admin_role  || "",  key: "org_admin_role" },
  ] : [
    { label: "Company Name",        value: userData?.org_name        || "",  key: "org_name"       },
    { label: "Industry",            value: userData?.org_industry    || "",  key: "org_industry"   },
    { label: "Company Size",        value: userData?.org_company_size|| "",  key: "org_company_size"},
    { label: "Website",             value: userData?.org_website     || "",  key: "org_website"    },
    { label: "GST / CIN",           value: userData?.org_gst_cin     || "",  key: "org_gst_cin"    },
    { label: "Admin Name",          value: userData?.org_admin_name  || "",  key: "org_admin_name" },
    { label: "Admin Role",          value: userData?.org_admin_role  || "",  key: "org_admin_role" },
  ]

  return (
    <PageShell>
      <PageHeader title="Settings" sub="Organisation profile, verification, and integrations" />

      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {["profile", "verification", "integrations", "notifications", "billing"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 14px", borderRadius: 8, border: `1px solid ${tab === t ? T.sky : T.border}`,
            background: tab === t ? T.skyL : T.bg, color: tab === t ? T.sky : T.ink3,
            fontSize: 12, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontFamily: FONT, textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>

      {tab === "profile" && (
        <Card>
          <SectionHead title={isCollege ? "Institution Profile" : "Company Profile"} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {profileFields.map((f, i) => (
              <div key={i}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>{f.label}</label>
                <input
                  defaultValue={f.value}
                  placeholder={`Enter ${f.label}`}
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: T.bg }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <Btn>Save Changes</Btn>
          </div>
        </Card>
      )}

      {tab === "verification" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { level: 1, label: "Email Verification",     done: true,  action: "Verified ✓"            },
            { level: 2, label: "Domain Verification",    done: false, action: "Verify Domain →"       },
            { level: 3, label: "Document Upload",        done: false, action: "Upload Documents →"    },
            { level: 4, label: "Full Verification",      done: false, action: "Pending review"        },
          ].map((v, i) => (
            <Card key={i} style={{ padding: "14px 16px", borderLeft: `3px solid ${v.done ? T.green : T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 20 }}>{v.done ? "✅" : "🔒"}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Level {v.level}: {v.label}</div>
                    <div style={{ fontSize: 11, color: T.ink4 }}>Required for {v.level < 3 ? "full feature access" : "verified badge"}</div>
                  </div>
                </div>
                <Btn variant={v.done ? "ghost" : "outline"} style={{ fontSize: 11, color: v.done ? T.green : T.sky, borderColor: v.done ? T.green : undefined }}>
                  {v.action}
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "integrations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { name: "Google Workspace",  icon: "🔵", status: "connected", desc: "SSO + directory sync"          },
            { name: "Greenhouse ATS",    icon: "🟢", status: "error",     desc: "Last sync failed 6h ago"       },
            { name: "Microsoft Teams",   icon: "🔷", status: "none",      desc: "Notifications + announcements" },
            { name: "Slack",             icon: "🟡", status: "none",      desc: "Team alerts and digests"       },
            { name: "HRMS / ERP",        icon: "⚫", status: "none",      desc: "Student / employee data sync"  },
          ].map((intg, i) => {
            const sc = { connected: T.green, error: T.red, none: T.ink4 }
            return (
              <Card key={i} style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{intg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{intg.name}</div>
                    <div style={{ fontSize: 12, color: T.ink4 }}>{intg.desc}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Chip color={sc[intg.status]} bg={`${sc[intg.status]}15`}>{intg.status}</Chip>
                    <Btn variant="outline" style={{ fontSize: 11, padding: "5px 10px" }}>
                      {intg.status === "connected" ? "Manage" : intg.status === "error" ? "Fix →" : "Connect"}
                    </Btn>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {(tab === "notifications" || tab === "billing") && (
        <EmptyState icon={tab === "billing" ? "💳" : "🔔"} title="Coming soon" sub="This section is being configured." />
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT — InstitutionOS
// ═══════════════════════════════════════════════════════════════════════════════
export default function InstitutionOS({ user, userData, onNavigate }) {
  const [activePage, setActivePage] = useState("home")
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  function onNav(page) {
    setActivePage(page)
    // Allow escape to outer app navigation if needed
    if (onNavigate && (page === "profile" || page === "home-outer")) {
      onNavigate(page)
    }
  }

  const pageProps = { user, userData, onNav }

  const PAGE_MAP = {
    home:          <HomePage          {...pageProps} />,
    intelligence:  <IntelligencePage  {...pageProps} />,
    tasks:         <TasksPage         {...pageProps} />,
    people:        <PeoplePage        {...pageProps} />,
    community:     <CommunityPage     {...pageProps} />,
    groups:        <GroupsPage        {...pageProps} />,
    cohorts:       <CohortsPage       {...pageProps} />,
    events:        <EventsPage        {...pageProps} />,
    opportunities: <OpportunitiesPage {...pageProps} />,
    outcomes:      <OutcomesPage      {...pageProps} />,
    settings:      <SettingsPage      {...pageProps} />,
  }

  return (
    <div style={{
      display: "flex", flexDirection: isMobile ? "column" : "row",
      height: "100%", width: "100%", background: T.bg, overflow: "hidden",
      fontFamily: FONT,
    }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <InstSidebar active={activePage} onNav={onNav} userData={userData} />
      )}

      {/* Main content area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
        {PAGE_MAP[activePage] || <HomePage {...pageProps} />}
      </div>

      {/* Mobile tab bar */}
      {isMobile && (
        <InstTabBar active={activePage} onNav={onNav} />
      )}
    </div>
  )
}
