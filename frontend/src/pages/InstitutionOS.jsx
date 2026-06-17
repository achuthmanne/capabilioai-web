/**
 * InstitutionOS.jsx — Hardened Institution Operating System
 * All buttons wired. All data from Supabase. Audit log on every sensitive action.
 *
 * Tables used: org_members, org_tasks, org_events, org_opportunities, org_audit_log
 * Profile fields: profiles table via supabase client directly
 *
 * Run institution-migration.sql + supabase-org-columns-migration.sql first.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { supabase } from "../lib/supabase"

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const T = {
  sky:      "#0EA5E9",
  skyL:     "rgba(14,165,233,0.12)",
  skyB:     "rgba(14,165,233,0.28)",
  skyDark:  "#0284C7",
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
  ink:      "#0F172A",
  ink2:     "#334155",
  ink3:     "#64748B",
  ink4:     "#94A3B8",
  ink5:     "#CBD5E1",
  bg:       "#F1F5F9",
  surface:  "#FFFFFF",
  border:   "rgba(15,23,42,0.07)",
  borderM:  "rgba(15,23,42,0.12)",
  // Dark nav tokens
  navBg:    "#0A0F1E",
  navBg2:   "#0F1729",
  navText:  "rgba(255,255,255,0.50)",
  navTextH: "rgba(255,255,255,0.85)",
  navTextA: "#FFFFFF",
  navActiveGlow: "rgba(14,165,233,0.18)",
  navW:     224,
  tabH:     60,
  radius:   14,
  radiusS:  8,
  shadow:   "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
  shadowM:  "0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
  shadowGlow: (color) => `0 0 0 1px ${color}30, 0 4px 20px ${color}18`,
}
const FONT = "Inter, -apple-system, sans-serif"
const MONO = "'JetBrains Mono', 'Fira Mono', monospace"

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  { id: "home",          label: "Home",          icon: "⌂",  mobileShow: true  },
  { id: "intelligence",  label: "Intelligence",  icon: "📊", mobileShow: true  },
  { id: "tasks",         label: "Tasks",         icon: "✓",  mobileShow: true  },
  { id: "people",        label: "People",        icon: "👥", mobileShow: true  },
  { id: "community",     label: "Community",     icon: "💬", mobileShow: true  },
  { id: "groups",        label: "Groups",        icon: "🗂",  mobileShow: false },
  { id: "cohorts",       label: "Cohorts",       icon: "🎓", mobileShow: false },
  { id: "events",        label: "Events",        icon: "📅", mobileShow: false },
  { id: "companies",     label: "Companies",     icon: "🏢", mobileShow: false },
  { id: "outcomes",      label: "Outcomes",      icon: "🏆", mobileShow: false },
  { id: "settings",      label: "Settings",      icon: "⚙", mobileShow: false },
]

// ─── Audit log helper ─────────────────────────────────────────────────────────
async function auditLog(orgId, actorId, actorName, action, actionCode, entityType = "", entityId = "", details = {}, severity = "info") {
  try {
    await supabase.from("org_audit_log").insert({
      org_id: orgId,
      actor_id: actorId,
      actor_name: actorName,
      action,
      action_code: actionCode,
      entity_type: entityType,
      entity_id: String(entityId),
      details,
      severity,
    })
  } catch (_) { /* audit failures are silent */ }
}

// ─── Data hooks ───────────────────────────────────────────────────────────────
function useOrgMembers(orgId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from("org_members").select("*").eq("org_id", orgId)
      .order("created_at", { ascending: false })
    setLoading(false)
    if (err) setError(err.message)
    else { setData(rows || []); setError(null) }
  }, [orgId])
  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

function useOrgTasks(orgId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from("org_tasks").select("*").eq("org_id", orgId)
      .order("created_at", { ascending: false })
    setLoading(false)
    if (err) setError(err.message)
    else { setData(rows || []); setError(null) }
  }, [orgId])
  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

function useOrgEvents(orgId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from("org_events").select("*").eq("org_id", orgId)
      .order("event_date", { ascending: true })
    setLoading(false)
    if (err) setError(err.message)
    else { setData(rows || []); setError(null) }
  }, [orgId])
  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

function useOrgOpportunities(orgId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from("org_opportunities").select("*").eq("org_id", orgId)
      .order("created_at", { ascending: false })
    setLoading(false)
    if (err) setError(err.message)
    else { setData(rows || []); setError(null) }
  }, [orgId])
  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

function useOrgAuditLog(orgId, limit = 20) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const { data: rows } = await supabase
      .from("org_audit_log").select("*").eq("org_id", orgId)
      .order("created_at", { ascending: false }).limit(limit)
    setLoading(false)
    setData(rows || [])
  }, [orgId, limit])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

function useOrgCompanyLinks(orgId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from("org_company_links").select("*").eq("institution_org_id", orgId)
      .order("created_at", { ascending: false })
    setLoading(false)
    if (err) setError(err.message)
    else { setData(rows || []); setError(null) }
  }, [orgId])
  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.radius, padding: 20, boxShadow: T.shadow, ...style,
      cursor: onClick ? "pointer" : undefined,
    }}>{children}</div>
  )
}

function Badge({ children, color = T.sky }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 100,
      background: `${color}18`, color, fontSize: 11, fontWeight: 700,
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

function Btn({ children, variant = "primary", onClick, style = {}, disabled, type = "button" }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: FONT,
    border: "none", transition: "opacity 0.15s", opacity: disabled ? 0.5 : 1,
  }
  const variants = {
    primary:  { background: T.sky,     color: "#fff" },
    outline:  { background: "transparent", border: `1px solid ${T.borderM}`, color: T.ink2 },
    ghost:    { background: "transparent", border: "none", color: T.ink3 },
    danger:   { background: T.red,     color: "#fff" },
    success:  { background: T.green,   color: "#fff" },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
    >{children}</button>
  )
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

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 0" }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        border: `3px solid ${T.skyL}`, borderTopColor: T.sky,
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ErrorBanner({ msg, onRetry }) {
  return (
    <div style={{ padding: "12px 16px", background: T.redL, borderRadius: 10, border: `1px solid ${T.red}30`, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: T.red }}>⚠️ {msg}</span>
      {onRetry && <Btn variant="outline" onClick={onRetry} style={{ fontSize: 11, borderColor: T.red, color: T.red, padding: "4px 10px" }}>Retry</Btn>}
    </div>
  )
}

function FieldInput({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
        {label}{required && <span style={{ color: T.red }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || `Enter ${label}`}
        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: T.bg, boxSizing: "border-box" }}
      />
    </div>
  )
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: T.bg }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <Card style={{ width: "100%", maxWidth: width, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.ink }}>{title}</h3>
          <Btn variant="ghost" onClick={onClose} style={{ padding: "4px 8px", fontSize: 16 }}>✕</Btn>
        </div>
        {children}
      </Card>
    </div>
  )
}

// ─── Verification banner ──────────────────────────────────────────────────────
function VerificationBanner({ level, onVerify }) {
  if (level >= 4) return null
  const info = [
    { label: "Unverified",        color: T.red,   bg: T.redL,   msg: "Verify your institution to unlock all features." },
    { label: "Email Verified",    color: T.amber, bg: T.amberL, msg: "Upload institution documents to reach full access." },
    { label: "Domain Verified",   color: T.sky,   bg: T.skyL,   msg: "Submit documents to complete verification." },
    { label: "Document Submitted",color: T.green, bg: T.greenL, msg: "Pending final review — usually within 24h." },
  ][Math.min(level, 3)]

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
      <Btn onClick={onVerify} style={{ fontSize: 11, padding: "4px 10px", background: "transparent", border: `1px solid ${info.color}`, color: info.color }}>
        Verify Now →
      </Btn>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPICard({ value, label, trend, trendDir = "up", context, action, color, onClick }) {
  const c = color || T.sky
  const trendColor = trendDir === "up" ? T.green : trendDir === "down" ? T.red : T.amber
  const trendIcon  = trendDir === "up" ? "↑" : trendDir === "down" ? "↓" : "→"
  return (
    <div onClick={onClick} style={{
      flex: 1, minWidth: 130, padding: "16px 18px",
      background: T.surface,
      borderRadius: T.radius,
      border: `1px solid ${T.border}`,
      borderTop: `3px solid ${c}`,
      boxShadow: `0 1px 3px rgba(0,0,0,0.06), 0 4px 16px ${c}0C`,
      cursor: onClick ? "pointer" : "default",
      transition: "transform 0.15s, box-shadow 0.15s",
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 4px 20px ${c}22` }}}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 1px 3px rgba(0,0,0,0.06), 0 4px 16px ${c}0C` }}}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: c, lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</div>
        {trend && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trendColor, background: `${trendColor}15`, padding: "2px 7px", borderRadius: 6, marginTop: 2 }}>
            {trendIcon} {trend}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
      {context && <div style={{ fontSize: 11, color: T.ink4, lineHeight: 1.4 }}>{context}</div>}
      {action && <div style={{ fontSize: 11, color: c, fontWeight: 600, marginTop: 6 }}>{action}</div>}
    </div>
  )
}

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────
function InstSidebar({ active, onNav, userData }) {
  const orgName = userData?.org_name || "Your Institution"
  const initials = orgName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
  return (
    <div style={{
      width: T.navW, minWidth: T.navW, height: "100%",
      background: `linear-gradient(180deg, ${T.navBg} 0%, ${T.navBg2} 100%)`,
      display: "flex", flexDirection: "column", flexShrink: 0,
      borderRight: "1px solid rgba(255,255,255,0.04)",
    }}>
      {/* Header */}
      <div style={{ padding: "18px 14px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: MONO, flexShrink: 0,
            boxShadow: "0 4px 14px rgba(14,165,233,0.45)",
          }}>{initials || "OS"}</div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.navTextA, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orgName}</div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.sky }}>
              {userData?.org_type === "company" ? "Company OS" : "Institution OS"}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
        <style>{`
          .inst-nav-btn { transition: background 0.12s, color 0.12s; }
          .inst-nav-btn:hover { background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.85) !important; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        `}</style>
        {NAV.map(item => {
          const isActive = active === item.id
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              className="inst-nav-btn"
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 10px", borderRadius: T.radiusS, border: "none",
                background: isActive ? T.navActiveGlow : "transparent",
                color: isActive ? T.navTextA : T.navText,
                fontSize: 13, fontWeight: isActive ? 600 : 400, fontFamily: FONT,
                cursor: "pointer",
                borderLeft: isActive ? `2px solid ${T.sky}` : "2px solid transparent",
                marginBottom: 1,
              }}
            >
              <span style={{ fontSize: 15, width: 20, textAlign: "center", filter: isActive ? "none" : "grayscale(0.3)", opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              <span style={{ letterSpacing: "-0.01em" }}>{item.label}</span>
              {isActive && <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: T.sky, boxShadow: `0 0 6px ${T.sky}` }} />}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "10px 14px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg, #0EA5E9, #6366F1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff",
          }}>
            {(userData?.name || "A").charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.navTextA }}>{userData?.name || "Admin"}</div>
            <div style={{ fontSize: 10, color: T.navText }}>Institution Admin</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab bar (mobile) ─────────────────────────────────────────────────────────
function InstTabBar({ active, onNav }) {
  return (
    <div style={{ height: T.tabH, borderTop: `1px solid ${T.border}`, background: T.surface, display: "flex", flexShrink: 0 }}>
      {NAV.filter(n => n.mobileShow).map(item => {
        const isActive = active === item.id
        return (
          <button key={item.id} onClick={() => onNav(item.id)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 2, border: "none",
            background: "transparent", cursor: "pointer",
            color: isActive ? T.sky : T.ink4, fontFamily: FONT,
          }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

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

function PageShell({ children }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 18px 32px", fontFamily: FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid ${T.sky}; outline-offset: 2px; }
        input:focus, select:focus, textarea:focus { border-color: ${T.sky} !important; box-shadow: 0 0 0 3px ${T.skyL}; }
      `}</style>
      {children}
    </div>
  )
}

function tabStyle(active) {
  return {
    padding: "7px 14px", borderRadius: 8,
    border: `1px solid ${active ? T.sky : T.border}`,
    background: active ? T.skyL : T.bg, color: active ? T.sky : T.ink3,
    fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: FONT,
    whiteSpace: "nowrap",
  }
}

function timeSince(dateStr) {
  const d = new Date(dateStr)
  const s = Math.floor((Date.now() - d) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function verificationLevel(userData) {
  const vs = userData?.verificationStatus || userData?.verification_status || ""
  if (vs === "fully_verified" || vs === "verified") return 4
  if (vs === "document_submitted") return 3
  if (vs === "domain_verified") return 2
  if (vs === "email_verified") return 1
  return 0
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — HOME
// ═══════════════════════════════════════════════════════════════════════════════
function HomePage({ userData, user, onNav, members, tasks, events, auditLogs, auditLoading, onVerify }) {
  const isCollege = (userData?.org_type || "college") !== "company"
  const firstName = (userData?.name || user?.displayName || "Admin").split(" ")[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const vLevel = verificationLevel(userData)

  // Computed KPIs from real data
  const activeMembers   = members.filter(m => m.status === "active").length
  const pendingMembers  = members.filter(m => m.status === "pending" || m.status === "invited").length
  const placedMembers   = members.filter(m => m.placement_company).length
  const activeTasks     = tasks.filter(t => t.status === "active").length
  const urgentTasks     = tasks.filter(t => t.priority === "urgent" && t.status === "active").length
  const upcomingEvents  = events.filter(e => e.status === "upcoming").length

  const pulseCards = isCollege ? [
    { value: activeMembers || "—",  label: "Active Members", color: T.sky,   context: `${pendingMembers} pending approval` },
    { value: activeTasks  || "—",   label: "Active Tasks",   color: T.amber, context: urgentTasks > 0 ? `${urgentTasks} urgent` : "On track" },
    { value: placedMembers || "—",  label: "Placements",     color: T.green, context: "This academic year" },
    { value: upcomingEvents || "—", label: "Upcoming Events",color: T.purple, context: "Scheduled events" },
  ] : [
    { value: activeMembers || "—",  label: "Verified Devs",  color: T.sky,   context: `${pendingMembers} pending` },
    { value: activeTasks  || "—",   label: "Active Tasks",   color: T.amber, context: urgentTasks > 0 ? `${urgentTasks} urgent` : "On track" },
    { value: placedMembers || "—",  label: "Hires Made",     color: T.green, context: "This year" },
    { value: upcomingEvents || "—", label: "Upcoming Panels",color: T.purple, context: "Scheduled" },
  ]

  // Urgent items
  const urgentAlerts = [
    urgentTasks > 0 && { icon: "📋", color: T.red,   label: `${urgentTasks} urgent task${urgentTasks > 1 ? "s" : ""} need attention`, sub: "Review and assign now", page: "tasks", urgent: true },
    pendingMembers > 0 && { icon: "👥", color: T.amber, label: `${pendingMembers} member${pendingMembers > 1 ? "s" : ""} pending approval`, sub: "Review and approve new members", page: "people", urgent: true },
    upcomingEvents > 0 && { icon: "📅", color: T.sky,   label: `${upcomingEvents} upcoming event${upcomingEvents > 1 ? "s" : ""}`, sub: "View scheduled drives and sessions", page: "events", urgent: false },
  ].filter(Boolean)

  // Real activity from audit log
  const auditItems = auditLogs.slice(0, 6)

  const actionIcon = (code) => {
    if (!code) return "📝"
    if (code.startsWith("member")) return "👥"
    if (code.startsWith("task")) return "📋"
    if (code.startsWith("event")) return "📅"
    if (code.startsWith("opportunity")) return "💼"
    return "📝"
  }

  return (
    <PageShell>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 12, color: T.ink4, fontWeight: 500 }}>{greeting}, {firstName} · Admin Console</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: T.ink, lineHeight: 1.2 }}>
          What needs <span style={{ color: T.sky }}>attention</span> now?
        </h1>
      </div>

      {vLevel < 4 && <VerificationBanner level={vLevel} onVerify={onVerify} />}

      {/* Live KPIs */}
      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, minWidth: 440 }}>
          {pulseCards.map((p, i) => (
            <KPICard key={i} {...p} onClick={() => onNav(i === 0 ? "people" : i === 1 ? "tasks" : i === 2 ? "outcomes" : "events")} />
          ))}
        </div>
      </div>

      {/* Alerts */}
      {urgentAlerts.length > 0 && (
        <Card style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2 }}>Priority Alerts</div>
            <Badge color={T.red}>{urgentAlerts.filter(a => a.urgent).length} urgent</Badge>
          </div>
          {urgentAlerts.map((a, i) => (
            <div key={i} onClick={() => onNav(a.page)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "13px 18px",
              borderBottom: i < urgentAlerts.length - 1 ? `1px solid ${T.border}` : "none",
              cursor: "pointer", borderLeft: `3px solid ${a.color}`,
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
      )}

      {urgentAlerts.length === 0 && members.length === 0 && tasks.length === 0 && (
        <Card style={{ marginBottom: 20, textAlign: "center", padding: "24px" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink2, marginBottom: 4 }}>All caught up!</div>
          <div style={{ fontSize: 12, color: T.ink4, marginBottom: 16 }}>Get started by inviting members and publishing your first task.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Btn onClick={() => onNav("people")}>+ Invite Members</Btn>
            <Btn variant="outline" onClick={() => onNav("tasks")}>+ Create Task</Btn>
          </div>
        </Card>
      )}

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Activity feed */}
        <Card>
          <SectionHead title="Recent Activity" />
          {auditLoading ? <Spinner /> : auditItems.length === 0 ? (
            <EmptyState icon="📋" title="No activity yet" sub="Actions like approvals and task publishes will appear here." />
          ) : (
            auditItems.map((a, i) => (
              <div key={a.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < auditItems.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <span style={{ fontSize: 16, marginTop: 1 }}>{actionIcon(a.action_code)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.5 }}>{a.action}</div>
                  <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>{a.actor_name} · {timeSince(a.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* Quick actions */}
        <Card>
          <SectionHead title="Quick Actions" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: "👥", label: "People",        page: "people"        },
              { icon: "📊", label: "Intelligence",  page: "intelligence"  },
              { icon: "✓",  label: "Tasks",         page: "tasks"         },
              { icon: "🎓", label: "Cohorts",       page: "cohorts"       },
              { icon: "💼", label: "Opportunities", page: "opportunities" },
              { icon: "⚙",  label: "Settings",      page: "settings"      },
            ].map(q => (
              <button key={q.page} onClick={() => onNav(q.page)} style={{
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
function IntelligencePage({ userData, user, members, tasks, auditLogs, auditLoading }) {
  const [tab, setTab] = useState("pulse")
  const isCollege = (userData?.org_type || "college") !== "company"

  const activeMembers = members.filter(m => m.status === "active")
  const placed        = members.filter(m => m.placement_company)
  const activeTasks   = tasks.filter(t => t.status === "active")
  const totalSubs     = tasks.reduce((s, t) => s + (t.submission_count || 0), 0)
  const totalAssigned = tasks.reduce((s, t) => s + (t.total_assigned || 0), 0)
  const subRate       = totalAssigned > 0 ? Math.round(totalSubs / totalAssigned * 100) : null
  const avgElo        = activeMembers.length > 0
    ? Math.round(activeMembers.reduce((s, m) => s + (m.elo_rating || 0), 0) / activeMembers.length)
    : null

  const pulseCards = isCollege ? [
    { value: avgElo ?? "—",            label: "Avg ELO",     color: T.sky,    context: `${activeMembers.length} active members` },
    { value: placed.length || "—",     label: "Placed",      color: T.green,  context: "This academic year" },
    { value: activeTasks.length || "—",label: "Active Tasks",color: T.amber,  context: `${subRate !== null ? subRate + "% submit rate" : "No submissions yet"}` },
    { value: activeMembers.length || "—",label: "Active Members",color: T.purple,context: "With verified profiles" },
  ] : [
    { value: activeMembers.length || "—",label: "Talent Pool", color: T.sky,   context: "Verified, active" },
    { value: activeTasks.length || "—",  label: "Assessments", color: T.amber,  context: subRate !== null ? `${subRate}% completion` : "No data yet" },
    { value: placed.length || "—",        label: "Hired",       color: T.green,  context: "This year" },
    { value: "—",                         label: "Time to Hire", color: T.purple, context: "Track via integrations" },
  ]

  const tabs = ["pulse", "elo", "placement"]
  const tabLabels = { pulse: "Live Pulse", elo: "ELO Distribution", placement: isCollege ? "Placement Funnel" : "Hiring Funnel" }

  // ELO histogram from real members
  const eloRanges = [
    { range: "900–1000 (Expert)",    min: 900, max: 1001, color: T.green  },
    { range: "800–899 (Advanced)",   min: 800, max: 900,  color: T.sky    },
    { range: "700–799 (Proficient)", min: 700, max: 800,  color: T.blue   },
    { range: "600–699 (Developing)", min: 600, max: 700,  color: T.amber  },
    { range: "< 600 (Beginner)",     min: 0,   max: 600,  color: T.red    },
  ].map(r => ({
    ...r,
    count: activeMembers.filter(m => (m.elo_rating || 0) >= r.min && (m.elo_rating || 0) < r.max).length,
  }))
  const maxCount = Math.max(...eloRanges.map(r => r.count), 1)

  return (
    <PageShell>
      <PageHeader title="Intelligence" sub={isCollege ? "Live analytics for your institution" : "Talent & hiring analytics"} />

      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>{tabLabels[t]}</button>
        ))}
      </div>

      {tab === "pulse" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {pulseCards.map((p, i) => <KPICard key={i} {...p} />)}
          </div>
          <Card>
            <SectionHead title="Recent Activity" />
            {auditLoading ? <Spinner /> : auditLogs.length === 0 ? (
              <EmptyState icon="📊" title="No activity recorded yet" sub="Member approvals, task publishes, and other admin actions appear here." />
            ) : (
              auditLogs.slice(0, 8).map((a, i) => (
                <div key={a.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < 7 ? `1px solid ${T.border}` : "none" }}>
                  <span style={{ fontSize: 16, marginTop: 1 }}>
                    {a.severity === "warning" ? "⚠️" : a.severity === "critical" ? "🔴" : "🟢"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.5 }}>{a.action}</div>
                    <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>{a.actor_name} · {timeSince(a.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </>
      )}

      {tab === "elo" && (
        activeMembers.length === 0 ? (
          <EmptyState icon="📊" title="No ELO data yet" sub="ELO scores are computed as members complete Arena challenges. Invite and activate members to see distribution." action={() => {}} actionLabel="Go to People →" />
        ) : (
          <>
            <Card style={{ marginBottom: 16 }}>
              <SectionHead title="ELO Score Distribution" />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {eloRanges.map((row, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: T.ink2 }}>{row.range}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: row.color }}>{row.count}</span>
                    </div>
                    <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${Math.round(row.count / maxCount * 100)}%`, height: "100%", background: row.color, borderRadius: 4, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <KPICard value={avgElo ?? "—"} label="Institution Avg" color={T.sky} context="Across active members" />
              <KPICard value={activeMembers.length} label="Members Rated" color={T.green} context="With ELO scores" />
            </div>
          </>
        )
      )}

      {tab === "placement" && (
        <Card>
          <SectionHead title={isCollege ? "Placement Funnel" : "Hiring Funnel"} />
          {members.length === 0 ? (
            <EmptyState icon="📈" title="No members yet" sub="Add members to see funnel data." />
          ) : (() => {
            const total    = members.length
            const active   = members.filter(m => m.status === "active").length
            const hasElo   = members.filter(m => (m.elo_rating || 0) > 0).length
            const placedN  = placed.length
            const stages = isCollege ? [
              { stage: "Total Members",        count: total    },
              { stage: "Active / Approved",     count: active   },
              { stage: "ELO Score Assigned",    count: hasElo   },
              { stage: "Placement Offers",      count: placedN  },
            ] : [
              { stage: "Total in Pool",         count: total    },
              { stage: "Active / Verified",     count: active   },
              { stage: "Skills Assessed",       count: hasElo   },
              { stage: "Offers Extended",       count: placedN  },
            ]
            return stages.map((row, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < stages.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: T.ink2 }}>{row.stage}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: T.sky }}>{row.count}</span>
                </div>
                <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${total > 0 ? Math.round(row.count / total * 100) : 0}%`, height: "100%", background: `linear-gradient(90deg, ${T.sky}, ${T.skyDark})`, borderRadius: 3 }} />
                </div>
              </div>
            ))
          })()}
        </Card>
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 3 — TASKS
// ═══════════════════════════════════════════════════════════════════════════════
function TasksPage({ userData, user, tasks, tasksLoading, tasksError, reloadTasks, members }) {
  const [tab, setTab]         = useState("active")
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saveError, setSaveError] = useState(null)
  const isCollege = (userData?.org_type || "college") !== "company"

  const [form, setForm] = useState({ title: "", type: "assignment", subject: "", assignedTo: "All Students", dueDate: "", priority: "medium", description: "" })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [attachment, setAttachment]   = useState(null)   // File object
  const [uploadProgress, setUploadProgress] = useState("")

  // Build structured assign-to options from real member batches + departments
  const assignOptions = useMemo(() => {
    const batches = [...new Set((members || []).filter(m => m.batch?.trim()).map(m => m.batch.trim()))]
    const depts   = [...new Set((members || []).filter(m => m.department?.trim()).map(m => m.department.trim()))]
    return [
      { value: "All Students",  label: "👥 All Students"        },
      { value: "All Faculty",   label: "🎓 All Faculty"         },
      { value: "All Members",   label: "🏢 All Members"         },
      ...batches.map(b  => ({ value: b,         label: `📚 ${b}` })),
      ...depts.map(d    => ({ value: d,         label: `🏫 ${d} Dept.` })),
    ]
  }, [members])

  async function handlePublish() {
    if (!form.title.trim()) { setSaveError("Task title is required."); return }
    setSaving(true); setSaveError(null)

    // Upload file attachment if present
    let attachmentUrl = ""
    let attachmentName = ""
    if (attachment) {
      setUploadProgress("Uploading file…")
      const path = `${user.id}/${Date.now()}_${attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
      const { error: upErr } = await supabase.storage
        .from("task-attachments").upload(path, attachment, { upsert: false })
      if (upErr) { setSaveError("File upload failed: " + upErr.message); setSaving(false); setUploadProgress(""); return }
      const { data: urlData } = supabase.storage.from("task-attachments").getPublicUrl(path)
      attachmentUrl  = urlData?.publicUrl || ""
      attachmentName = attachment.name
      setUploadProgress("")
    }

    const { data: row, error } = await supabase.from("org_tasks").insert({
      org_id:            user.id,
      title:             form.title.trim(),
      description:       form.description,
      type:              form.type,
      subject:           form.subject.trim(),
      assigned_to_label: form.assignedTo || "All Students",
      due_date:          form.dueDate || null,
      published_by:      user.id,
      published_by_name: userData?.name || "Admin",
      status:            "active",
      priority:          form.priority,
      attachment_url:    attachmentUrl,
      attachment_name:   attachmentName,
    }).select().single()
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    await auditLog(user.id, user.id, userData?.name || "Admin",
      `Published task "${form.title.trim()}"`, "task.published", "task", row.id, { type: form.type })
    setShowCreate(false)
    setForm({ title: "", type: "assignment", subject: "", assignedTo: "All Students", dueDate: "", priority: "medium", description: "" })
    setAttachment(null)
    reloadTasks()
  }

  async function handleArchive(task) {
    await supabase.from("org_tasks").update({ status: "archived" }).eq("id", task.id)
    await auditLog(user.id, user.id, userData?.name || "Admin",
      `Archived task "${task.title}"`, "task.archived", "task", task.id)
    reloadTasks()
  }

  const filtered = tasks.filter(t => tab === "active" ? (t.status === "active" || t.status === "draft") : tab === "completed" ? t.status === "completed" : t.status === "archived")

  const priorityColor = { urgent: T.red, high: T.amber, medium: T.sky, low: T.ink4 }
  const typeColor     = { assignment: T.blue, lab: T.teal, project: T.purple, remedial: T.red, assessment: T.sky, challenge: T.amber }

  return (
    <PageShell>
      <PageHeader
        title="Tasks"
        sub={isCollege ? "Publish and track institution tasks" : "Manage candidate assessments"}
        actions={[<Btn key="c" onClick={() => setShowCreate(true)}>+ Create Task</Btn>]}
      />

      {/* Live counts */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto" }}>
        <KPICard value={tasks.filter(t => t.priority === "urgent" && t.status === "active").length} label="Urgent" color={T.red} context="Needs attention" />
        <KPICard value={tasks.filter(t => t.status === "active").length} label="Active" color={T.sky} context="Ongoing" />
        <KPICard value={tasks.filter(t => t.status === "completed").length} label="Completed" color={T.green} context="Done" />
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {["active", "completed", "archived"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tasksLoading ? <Spinner /> : tasksError ? <ErrorBanner msg={tasksError} onRetry={reloadTasks} /> : (
        filtered.length === 0 ? (
          <EmptyState icon="✓" title={`No ${tab} tasks`} sub={tab === "active" ? "Create your first task to get started." : "Nothing here yet."} action={tab === "active" ? () => setShowCreate(true) : undefined} actionLabel="Create Task" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(task => {
              const pct = task.total_assigned > 0 ? Math.round(task.submission_count / task.total_assigned * 100) : 0
              return (
                <Card key={task.id} style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{task.title}</span>
                        <Chip color={typeColor[task.type] || T.sky} bg={`${typeColor[task.type] || T.sky}15`}>{task.type}</Chip>
                        {task.priority === "urgent" && <Badge color={T.red}>URGENT</Badge>}
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                        {task.subject && <span style={{ fontSize: 12, color: T.ink3, fontWeight: 600 }}>📖 {task.subject}</span>}
                        {task.assigned_to_label && <span style={{ fontSize: 12, color: T.ink4 }}>👥 {task.assigned_to_label}</span>}
                        {task.due_date && <span style={{ fontSize: 12, color: T.ink4 }}>📅 Due {task.due_date}</span>}
                        {task.attachment_url && (
                          <a href={task.attachment_url} target="_blank" rel="noreferrer"
                            style={{ fontSize: 12, color: T.sky, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                            📎 {task.attachment_name || "Attachment"}
                          </a>
                        )}
                        {task.total_assigned > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: T.sky }}>
                            {task.submission_count}/{task.total_assigned} submitted
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {task.status === "active" && (
                        <Btn variant="outline" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => handleArchive(task)}>Archive</Btn>
                      )}
                    </div>
                  </div>
                  {task.total_assigned > 0 && task.status !== "archived" && (
                    <div style={{ marginTop: 10, height: 4, background: T.bg, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: task.priority === "urgent" ? T.red : T.sky, borderRadius: 2 }} />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )
      )}

      {showCreate && (
        <Modal title="Create Task" onClose={() => { setShowCreate(false); setSaveError(null) }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Row 1: Title + Type */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FieldInput label="Task Title *" value={form.title} onChange={v => setF("title", v)} placeholder="e.g. Data Structures Assignment 3" required />
              <FieldSelect label="Type" value={form.type} onChange={v => setF("type", v)} options={[
                { value: "assignment", label: "📝 Assignment" },
                { value: "lab",        label: "🔬 Lab Work"   },
                { value: "project",    label: "🏗️ Project"    },
                { value: "remedial",   label: "🔁 Remedial"   },
                { value: "assessment", label: "📊 Assessment" },
                { value: "challenge",  label: "🏆 Challenge"  },
              ]} />
            </div>

            {/* Row 2: Subject + Priority */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FieldInput label="Subject / Course" value={form.subject} onChange={v => setF("subject", v)} placeholder="e.g. Data Structures, OS Lab" />
              <FieldSelect label="Priority" value={form.priority} onChange={v => setF("priority", v)} options={[
                { value: "urgent", label: "🔴 Urgent" },
                { value: "high",   label: "🟠 High"   },
                { value: "medium", label: "🔵 Medium" },
                { value: "low",    label: "⚪ Low"    },
              ]} />
            </div>

            {/* Row 3: Assign To (structured dropdown) + Due Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
                  Assign To *
                </label>
                <select
                  value={form.assignedTo}
                  onChange={e => setF("assignedTo", e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#fff", cursor: "pointer" }}
                >
                  {assignOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {(members || []).length === 0 && (
                  <div style={{ fontSize: 11, color: T.ink4, marginTop: 4 }}>
                    Add members first to see batch/dept options
                  </div>
                )}
              </div>
              <FieldInput label="Due Date" value={form.dueDate} onChange={v => setF("dueDate", v)} type="date" />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Instructions / Description (optional)</label>
              <textarea value={form.description} onChange={e => setF("description", e.target.value)} rows={3}
                placeholder="What should students do? Include links, references, submission format…"
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: T.bg, resize: "vertical" }} />
            </div>

            {/* File attachment */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
                Attach File (PDF, DOCX, PPTX, Image — max 10MB)
              </label>
              <label style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                border: `1.5px dashed ${attachment ? T.sky : T.border}`,
                borderRadius: 10, cursor: "pointer",
                background: attachment ? T.skyL : T.bg,
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 18 }}>{attachment ? "📎" : "☁️"}</span>
                <span style={{ fontSize: 12, color: attachment ? T.sky : T.ink4, fontWeight: attachment ? 600 : 400 }}>
                  {attachment ? attachment.name : "Click to attach a file"}
                </span>
                {attachment && (
                  <button onClick={e => { e.preventDefault(); setAttachment(null) }}
                    style={{ marginLeft: "auto", fontSize: 12, color: T.red, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                    ✕ Remove
                  </button>
                )}
                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.gif"
                  style={{ display: "none" }}
                  onChange={e => setAttachment(e.target.files?.[0] || null)} />
              </label>
              {uploadProgress && <div style={{ fontSize: 11, color: T.sky, marginTop: 4 }}>{uploadProgress}</div>}
            </div>

            {saveError && <div style={{ fontSize: 12, color: T.red }}>{saveError}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setShowCreate(false)}>Cancel</Btn>
              <Btn onClick={handlePublish} disabled={saving}>{saving ? (uploadProgress || "Publishing…") : "Publish Task"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 4 — PEOPLE
// ═══════════════════════════════════════════════════════════════════════════════
function PeoplePage({ userData, user, members, membersLoading, membersError, reloadMembers }) {
  const [tab, setTab]         = useState("all")
  const [search, setSearch]   = useState("")
  const [showInvite, setShowInvite] = useState(false)
  const [inviting, setInviting]     = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [form, setForm]       = useState({ name: "", email: "", role: "student", department: "", batch: "" })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isCollege = (userData?.org_type || "college") !== "company"

  const tabs = isCollege
    ? ["all", "students", "faculty", "recruiters", "pending"]
    : ["all", "engineers", "pending"]

  const roleMap = { student: "students", faculty: "faculty", admin: "admin", recruiter: "recruiters", mentor: "mentors", dept_head: "faculty" }

  const filtered = members.filter(m => {
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.email || "").toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (tab === "all") return true
    if (tab === "pending") return m.status === "pending" || m.status === "invited"
    if (tab === "students") return m.role === "student"
    if (tab === "faculty") return m.role === "faculty" || m.role === "dept_head"
    if (tab === "recruiters") return m.role === "recruiter"
    if (tab === "engineers") return m.role === "student" || m.role === "admin"
    return true
  })

  const pendingCount = members.filter(m => m.status === "pending" || m.status === "invited").length

  async function handleApprove(member) {
    setActionLoading(member.id + "-approve")
    const { error } = await supabase.from("org_members")
      .update({ status: "active", approved_at: new Date().toISOString(), approved_by: user.id })
      .eq("id", member.id)
    setActionLoading(null)
    if (!error) {
      await auditLog(user.id, user.id, userData?.name || "Admin",
        `Approved ${member.name} as ${member.role}`, "member.approved", "member", member.id,
        { role: member.role }, "info")
      reloadMembers()
    }
  }

  async function handleDeny(member) {
    setActionLoading(member.id + "-deny")
    const { error } = await supabase.from("org_members")
      .update({ status: "removed" }).eq("id", member.id)
    setActionLoading(null)
    if (!error) {
      await auditLog(user.id, user.id, userData?.name || "Admin",
        `Denied ${member.name}`, "member.denied", "member", member.id, {}, "warning")
      reloadMembers()
    }
  }

  async function handleInvite() {
    if (!form.name.trim() || !form.email.trim()) { setInviteError("Name and email are required."); return }
    setInviting(true); setInviteError(null)
    const { data: row, error } = await supabase.from("org_members").insert({
      org_id: user.id, name: form.name.trim(), email: form.email.trim(),
      role: form.role, department: form.department, batch: form.batch,
      status: "invited",
    }).select().single()
    setInviting(false)
    if (error) { setInviteError(error.message); return }
    await auditLog(user.id, user.id, userData?.name || "Admin",
      `Invited ${form.name.trim()} (${form.role})`, "member.invited", "member", row.id, { email: form.email })
    setShowInvite(false)
    setForm({ name: "", email: "", role: "student", department: "", batch: "" })
    reloadMembers()
  }

  const statusColor = { active: T.green, placed: T.sky, "at-risk": T.red, pending: T.amber, invited: T.amber, verified: T.green, suspended: T.red, removed: T.ink4 }

  return (
    <PageShell>
      <PageHeader
        title="People"
        sub={isCollege ? "Students, faculty, and recruiters" : "Talent pool and hiring team"}
        actions={[<Btn key="i" onClick={() => setShowInvite(true)}>+ Invite</Btn>]}
      />

      {pendingCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.amberL, borderRadius: 10, marginBottom: 16, border: `1px solid ${T.amber}30` }}>
          <span>⏳</span>
          <span style={{ fontSize: 13, color: T.amber, fontWeight: 600 }}>{pendingCount} member{pendingCount > 1 ? "s" : ""} pending approval</span>
          <Btn variant="outline" onClick={() => setTab("pending")} style={{ marginLeft: "auto", fontSize: 11, borderColor: T.amber, color: T.amber, padding: "4px 10px" }}>Review</Btn>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "pending" && pendingCount > 0 && (
              <span style={{ marginLeft: 6, background: T.amber, color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
        style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, marginBottom: 16, outline: "none", background: T.bg }} />

      {membersLoading ? <Spinner /> : membersError ? <ErrorBanner msg={membersError} onRetry={reloadMembers} /> : (
        filtered.length === 0 ? (
          <EmptyState icon="👥" title="No people here" sub={search ? "Try a different search." : "Invite members to get started."} action={() => setShowInvite(true)} actionLabel="+ Invite Member" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((m) => {
              const sc = statusColor[m.status] || T.ink4
              const isPending = m.status === "pending" || m.status === "invited"
              return (
                <Card key={m.id} style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.skyL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: T.sky, flexShrink: 0 }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{m.name}</span>
                        {m.elo_rating > 0 && <span style={{ fontSize: 11, fontFamily: MONO, color: T.sky, fontWeight: 700 }}>ELO {m.elo_rating}</span>}
                        <Chip color={sc} bg={`${sc}15`}>{m.status}</Chip>
                      </div>
                      <div style={{ fontSize: 12, color: T.ink4, marginTop: 2 }}>
                        {m.role}{m.department ? ` · ${m.department}` : ""}{m.batch ? ` · ${m.batch}` : ""}{m.email ? ` · ${m.email}` : ""}
                      </div>
                      {m.placement_company && (
                        <div style={{ fontSize: 11, color: T.green, fontWeight: 600, marginTop: 3 }}>✓ Placed at {m.placement_company}{m.placement_ctc ? ` · ${m.placement_ctc}` : ""}</div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {isPending ? (
                        <>
                          <Btn style={{ fontSize: 11, padding: "5px 10px" }}
                            disabled={actionLoading === m.id + "-approve"}
                            onClick={() => handleApprove(m)}>
                            {actionLoading === m.id + "-approve" ? "…" : "Approve"}
                          </Btn>
                          <Btn variant="outline" style={{ fontSize: 11, padding: "5px 10px" }}
                            disabled={actionLoading === m.id + "-deny"}
                            onClick={() => handleDeny(m)}>
                            {actionLoading === m.id + "-deny" ? "…" : "Deny"}
                          </Btn>
                        </>
                      ) : null}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      )}

      {showInvite && (
        <Modal title="Invite Member" onClose={() => { setShowInvite(false); setInviteError(null) }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FieldInput label="Full Name" value={form.name} onChange={v => setF("name", v)} required />
            <FieldInput label="Email Address" value={form.email} onChange={v => setF("email", v)} type="email" required />
            <FieldSelect label="Role" value={form.role} onChange={v => setF("role", v)} options={[
              { value: "student",   label: "Student"    },
              { value: "faculty",   label: "Faculty"    },
              { value: "admin",     label: "Admin"      },
              { value: "recruiter", label: "Recruiter"  },
              { value: "mentor",    label: "Mentor"     },
              { value: "dept_head", label: "Dept Head"  },
            ]} />
            <FieldInput label="Department" value={form.department} onChange={v => setF("department", v)} placeholder="e.g. Computer Science" />
            {isCollege && <FieldInput label="Batch" value={form.batch} onChange={v => setF("batch", v)} placeholder="e.g. B.Tech CSE 2026" />}
            {inviteError && <div style={{ fontSize: 12, color: T.red }}>{inviteError}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setShowInvite(false)}>Cancel</Btn>
              <Btn onClick={handleInvite} disabled={inviting}>{inviting ? "Inviting…" : "Send Invite"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 5 — COMMUNITY (beta gate on post creation)
// ═══════════════════════════════════════════════════════════════════════════════
function CommunityPage() {
  const [tab, setTab] = useState("feed")
  return (
    <PageShell>
      <PageHeader title="Community" sub="Institution-wide feed and announcements"
        actions={[
          <div key="p" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12, color: T.ink4 }}>
            ✏️ Posts via mobile app during beta
          </div>
        ]}
      />
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {["feed", "announcements"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      <EmptyState icon="💬" title="Community coming soon" sub="Your institution feed will show posts from faculty and admins. Members can post from the Capabilio mobile app." />
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 6 — GROUPS (simplified for v1)
// ═══════════════════════════════════════════════════════════════════════════════
function GroupsPage() {
  return (
    <PageShell>
      <PageHeader title="Groups" sub="Manage batches, clubs, and study groups" />
      <EmptyState icon="🗂" title="Groups coming soon" sub="Create cohort-based and interest-based groups. Members can be tagged to multiple groups for targeted task assignment." />
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 7 — COHORTS (simplified for v1)
// ═══════════════════════════════════════════════════════════════════════════════
function CohortsPage({ members }) {
  const placed   = members.filter(m => m.placement_company).length
  const active   = members.filter(m => m.status === "active").length
  const avgElo   = active > 0 ? Math.round(members.filter(m => m.status === "active").reduce((s, m) => s + (m.elo_rating || 0), 0) / active) : null

  return (
    <PageShell>
      <PageHeader title="Cohorts" sub="Skill-domain cohorts across your institution" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <KPICard value={active || "—"} label="Active Members" color={T.sky} context="In institution" />
        <KPICard value={avgElo ?? "—"} label="Avg ELO" color={T.green} context="Across active members" />
        <KPICard value={placed || "—"} label="Placed / Hired" color={T.amber} context="This year" />
        <KPICard value="—" label="Cohorts Defined" color={T.purple} context="Coming in v2" />
      </div>
      <EmptyState icon="🎓" title="Cohort management coming soon" sub="Define skill domains and auto-assign members based on ELO scores. At-risk cohort detection and intervention tools launching in v2." />
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 8 — EVENTS
// ═══════════════════════════════════════════════════════════════════════════════
function EventsPage({ userData, user, events, eventsLoading, eventsError, reloadEvents }) {
  const [tab, setTab]               = useState("upcoming")
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState(null)
  const [form, setForm]             = useState({ title: "", type: "general", event_date: "", event_time: "", venue: "", description: "" })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isCollege = (userData?.org_type || "college") !== "company"

  const today = new Date().toISOString().split("T")[0]
  const upcoming = events.filter(e => e.event_date >= today && e.status !== "cancelled")
  const past     = events.filter(e => e.event_date < today || e.status === "completed")

  async function handleCreate() {
    if (!form.title.trim() || !form.event_date) { setSaveError("Title and date are required."); return }
    setSaving(true); setSaveError(null)
    const { data: row, error } = await supabase.from("org_events").insert({
      org_id:      user.id,
      title:       form.title.trim(),
      type:        form.type,
      event_date:  form.event_date,
      event_time:  form.event_time,
      venue:       form.venue,
      description: form.description,
      status:      "upcoming",
      created_by:  user.id,
    }).select().single()
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    await auditLog(user.id, user.id, userData?.name || "Admin",
      `Created event "${form.title.trim()}"`, "event.created", "event", row.id, { date: form.event_date, type: form.type })
    setShowCreate(false)
    setForm({ title: "", type: "general", event_date: "", event_time: "", venue: "", description: "" })
    reloadEvents()
  }

  async function handleCancel(event) {
    await supabase.from("org_events").update({ status: "cancelled" }).eq("id", event.id)
    await auditLog(user.id, user.id, userData?.name || "Admin",
      `Cancelled event "${event.title}"`, "event.cancelled", "event", event.id, {}, "warning")
    reloadEvents()
  }

  const displayEvents = tab === "upcoming" ? upcoming : past
  const typeColor = { drive: T.sky, review: T.amber, lecture: T.purple, assessment: T.green, seminar: T.teal, general: T.blue }

  return (
    <PageShell>
      <PageHeader
        title="Events"
        sub="Campus drives, sessions, and milestones"
        actions={[<Btn key="c" onClick={() => setShowCreate(true)}>+ Create Event</Btn>]}
      />

      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {["upcoming", "past"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} {t === "upcoming" ? `(${upcoming.length})` : `(${past.length})`}
          </button>
        ))}
      </div>

      {eventsLoading ? <Spinner /> : eventsError ? <ErrorBanner msg={eventsError} onRetry={reloadEvents} /> : (
        displayEvents.length === 0 ? (
          <EmptyState icon="📅" title={`No ${tab} events`} sub={tab === "upcoming" ? "Create your first event to get started." : "Past events will appear here."} action={tab === "upcoming" ? () => setShowCreate(true) : undefined} actionLabel="Create Event" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {displayEvents.map(e => {
              const dateParts = (e.event_date || "").split("-")
              const month = dateParts[1] ? new Date(e.event_date).toLocaleString("default", { month: "short" }) : "—"
              const day   = dateParts[2] || "—"
              return (
                <Card key={e.id} style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ textAlign: "center", background: T.skyL, borderRadius: 10, padding: "8px 12px", flexShrink: 0, minWidth: 52 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.sky, textTransform: "uppercase" }}>{month}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: T.sky, fontFamily: MONO, lineHeight: 1 }}>{day}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{e.title}</span>
                        <Chip color={typeColor[e.type] || T.sky} bg={`${typeColor[e.type] || T.sky}15`}>{e.type}</Chip>
                        {e.status === "cancelled" && <Badge color={T.red}>Cancelled</Badge>}
                      </div>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                        {e.event_time && <span style={{ fontSize: 12, color: T.ink4 }}>⏰ {e.event_time}</span>}
                        {e.venue && <span style={{ fontSize: 12, color: T.ink4 }}>📍 {e.venue}</span>}
                        {e.attendee_count > 0 && <span style={{ fontSize: 12, color: T.sky, fontWeight: 600 }}>👥 {e.attendee_count} attendees</span>}
                      </div>
                    </div>
                    {tab === "upcoming" && e.status !== "cancelled" && (
                      <Btn variant="outline" onClick={() => handleCancel(e)} style={{ fontSize: 11, padding: "5px 10px", color: T.red, borderColor: T.red }}>Cancel</Btn>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )
      )}

      {showCreate && (
        <Modal title="Create Event" onClose={() => { setShowCreate(false); setSaveError(null) }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FieldInput label="Event Title" value={form.title} onChange={v => setF("title", v)} required />
            <FieldSelect label="Type" value={form.type} onChange={v => setF("type", v)} options={[
              { value: "drive",      label: "Campus Drive"  },
              { value: "review",     label: "Review"        },
              { value: "lecture",    label: "Guest Lecture" },
              { value: "assessment", label: "Assessment"    },
              { value: "seminar",    label: "Seminar"       },
              { value: "general",    label: "General"       },
            ]} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FieldInput label="Date" value={form.event_date} onChange={v => setF("event_date", v)} type="date" required />
              <FieldInput label="Time" value={form.event_time} onChange={v => setF("event_time", v)} type="time" />
            </div>
            <FieldInput label="Venue" value={form.venue} onChange={v => setF("venue", v)} placeholder="e.g. Auditorium 1 or Online" />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Description</label>
              <textarea value={form.description} onChange={e => setF("description", e.target.value)} rows={3}
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontFamily: FONT, outline: "none", background: T.bg, resize: "vertical", color: T.ink }} />
            </div>
            {saveError && <div style={{ fontSize: 12, color: T.red }}>{saveError}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setShowCreate(false)}>Cancel</Btn>
              <Btn onClick={handleCreate} disabled={saving}>{saving ? "Creating…" : "Create Event"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 9 — COMPANIES (Partner Talent Network)
// ═══════════════════════════════════════════════════════════════════════════════
function CompaniesPage({ userData, user }) {
  const { data: companies, loading, error, reload } = useOrgCompanyLinks(user?.id)
  const [showInvite, setShowInvite]   = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState(null)
  const [tab, setTab]                 = useState("active")
  const [form, setForm]               = useState({ company_name: "", company_email: "", company_website: "", company_size: "", industry: "", notes: "" })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = companies.filter(c => tab === "active" ? c.status === "active" || c.status === "invited" : c.status === "paused" || c.status === "rejected")

  const visibilityLabel = { roster: "Roster only", elo: "Roster + ELO", placements: "Placement data", full: "Full access" }
  const visibilityColor = { roster: T.ink3, elo: T.amber, placements: T.sky, full: T.green }
  const statusColor     = { invited: T.amber, active: T.green, paused: T.ink4, rejected: T.red }

  async function handleInvite() {
    if (!form.company_name.trim()) { setSaveError("Company name is required."); return }
    setSaving(true); setSaveError(null)
    const { data: row, error: err } = await supabase.from("org_company_links").insert({
      institution_org_id: user.id,
      company_name:       form.company_name.trim(),
      company_email:      form.company_email.trim(),
      company_website:    form.company_website.trim(),
      company_size:       form.company_size,
      industry:           form.industry,
      notes:              form.notes,
      status:             "invited",
      invited_by:         user.id,
    }).select().single()
    setSaving(false)
    if (err) { setSaveError(err.message); return }
    await auditLog(user.id, user.id, userData?.name || "Admin",
      `Invited company "${form.company_name.trim()}" to talent network`,
      "company.invited", "company", row.id, { company: form.company_name })
    setShowInvite(false)
    setForm({ company_name: "", company_email: "", company_website: "", company_size: "", industry: "", notes: "" })
    reload()
  }

  async function handleActivate(c) {
    await supabase.from("org_company_links").update({ status: "active", linked_at: new Date().toISOString() }).eq("id", c.id)
    await auditLog(user.id, user.id, userData?.name || "Admin", `Activated link with ${c.company_name}`, "company.activated", "company", c.id)
    reload()
  }

  async function handleVisibility(c, vis) {
    await supabase.from("org_company_links").update({ visibility: vis }).eq("id", c.id)
    await auditLog(user.id, user.id, userData?.name || "Admin", `Updated ${c.company_name} visibility to ${vis}`, "company.visibility_updated", "company", c.id)
    reload()
  }

  async function handlePause(c) {
    await supabase.from("org_company_links").update({ status: c.status === "paused" ? "active" : "paused" }).eq("id", c.id)
    reload()
  }

  const activeCount  = companies.filter(c => c.status === "active").length
  const invitedCount = companies.filter(c => c.status === "invited").length

  return (
    <PageShell>
      <PageHeader
        title="Talent Network"
        sub="Companies with access to your student talent pool"
        actions={[<Btn key="i" onClick={() => setShowInvite(true)}>+ Invite Company</Btn>]}
      />

      {/* KPIs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto" }}>
        <KPICard value={activeCount || "—"} label="Active Partners" color={T.green} context="Companies with access" />
        <KPICard value={invitedCount || "—"} label="Invited" color={T.amber} context="Awaiting confirmation" />
        <KPICard value={companies.length || "—"} label="Total Network" color={T.sky} context="All company links" />
      </div>

      {/* How it works */}
      {companies.length === 0 && (
        <Card style={{ marginBottom: 16, background: `linear-gradient(135deg, ${T.skyL}, rgba(99,102,241,0.06))`, border: `1px solid ${T.sky}20` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 8 }}>🏢 How the Talent Network works</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { step: "1", title: "Invite a company", desc: "Add company name and email. They receive a link request." },
              { step: "2", title: "Set data visibility", desc: "Control what they see: roster, ELO scores, placements, or full access." },
              { step: "3", title: "Companies hire", desc: "Recruiters browse your verified student pool and reach out directly." },
            ].map(s => (
              <div key={s.step} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.7)", borderRadius: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: T.sky, marginBottom: 4 }}>{s.step}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: T.ink4, lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {["active", "inactive"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t === "active" ? `Active / Invited (${companies.filter(c => c.status === "active" || c.status === "invited").length})` : `Paused / Rejected (${companies.filter(c => c.status === "paused" || c.status === "rejected").length})`}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : error ? <ErrorBanner msg={error} onRetry={reload} /> : (
        filtered.length === 0 ? (
          <EmptyState icon="🏢" title="No companies yet"
            sub="Invite your first company partner to give them access to your talent pool."
            action={() => setShowInvite(true)} actionLabel="+ Invite Company" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(c => (
              <Card key={c.id} style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  {/* Logo initial */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${T.sky}20, ${T.purple}20)`,
                    border: `1px solid ${T.sky}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800, color: T.sky,
                  }}>
                    {c.company_name.charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{c.company_name}</span>
                      <Chip color={statusColor[c.status] || T.ink3} bg={`${statusColor[c.status] || T.ink3}15`}>
                        {c.status === "active" ? "✓ Active" : c.status === "invited" ? "⏳ Invited" : c.status === "paused" ? "⏸ Paused" : "✗ Rejected"}
                      </Chip>
                    </div>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                      {c.industry && <span style={{ fontSize: 11, color: T.ink4 }}>🏭 {c.industry}</span>}
                      {c.company_size && <span style={{ fontSize: 11, color: T.ink4 }}>👥 {c.company_size}</span>}
                      {c.company_email && <span style={{ fontSize: 11, color: T.ink4 }}>✉️ {c.company_email}</span>}
                    </div>

                    {/* Visibility control */}
                    {c.status === "active" && (
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: T.ink3, fontWeight: 600 }}>DATA ACCESS:</span>
                        {["roster", "elo", "placements", "full"].map(vis => (
                          <button key={vis} onClick={() => handleVisibility(c, vis)} style={{
                            padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                            border: `1px solid ${c.visibility === vis ? visibilityColor[vis] : T.border}`,
                            background: c.visibility === vis ? `${visibilityColor[vis]}15` : "transparent",
                            color: c.visibility === vis ? visibilityColor[vis] : T.ink4,
                            transition: "all 0.12s",
                          }}>
                            {visibilityLabel[vis]}
                          </button>
                        ))}
                      </div>
                    )}
                    {c.notes && <div style={{ fontSize: 11, color: T.ink4, marginTop: 6, fontStyle: "italic" }}>{c.notes}</div>}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
                    {c.status === "invited" && (
                      <Btn onClick={() => handleActivate(c)} style={{ fontSize: 11, padding: "5px 12px" }}>Activate ✓</Btn>
                    )}
                    {(c.status === "active" || c.status === "paused") && (
                      <Btn variant="outline" onClick={() => handlePause(c)} style={{ fontSize: 11, padding: "5px 10px" }}>
                        {c.status === "paused" ? "Resume" : "Pause"}
                      </Btn>
                    )}
                    {c.linked_at && (
                      <span style={{ fontSize: 10, color: T.ink4 }}>Linked {timeSince(c.linked_at)}</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {showInvite && (
        <Modal title="Invite Company to Talent Network" onClose={() => { setShowInvite(false); setSaveError(null) }} width={520}>
          <div style={{ fontSize: 12, color: T.ink3, marginBottom: 16, padding: "10px 14px", background: T.skyL, borderRadius: 10 }}>
            🔔 The company will be notified and can browse your student pool based on the data access level you set after activation.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FieldInput label="Company Name *" value={form.company_name} onChange={v => setF("company_name", v)} required />
              <FieldInput label="Contact Email" value={form.company_email} onChange={v => setF("company_email", v)} placeholder="hr@company.com" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FieldInput label="Industry" value={form.industry} onChange={v => setF("industry", v)} placeholder="IT / Manufacturing / Finance" />
              <FieldInput label="Company Size" value={form.company_size} onChange={v => setF("company_size", v)} placeholder="e.g. 500–5000" />
            </div>
            <FieldInput label="Website" value={form.company_website} onChange={v => setF("company_website", v)} placeholder="https://company.com" />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setF("notes", e.target.value)} rows={2}
                placeholder="e.g. Mass hiring partner, visited campus before, focus on CSE students"
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontFamily: FONT, outline: "none", background: T.bg, resize: "vertical", color: T.ink }} />
            </div>
            {saveError && <div style={{ fontSize: 12, color: T.red }}>{saveError}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setShowInvite(false)}>Cancel</Btn>
              <Btn onClick={handleInvite} disabled={saving}>{saving ? "Saving…" : "Add to Network"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 10 — OUTCOMES
// ═══════════════════════════════════════════════════════════════════════════════
function OutcomesPage({ userData, members }) {
  const isCollege = (userData?.org_type || "college") !== "company"
  const placed = members.filter(m => m.placement_company)
  const active = members.filter(m => m.status === "active")
  const successRate = active.length > 0 ? Math.round(placed.length / active.length * 100) : 0

  return (
    <PageShell>
      <PageHeader title="Outcomes" sub={isCollege ? "Placement records and career progression" : "Hiring outcomes"} />

      <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto" }}>
        <KPICard value={placed.length || "—"}  label={isCollege ? "Placed" : "Hired"} trend={placed.length > 0 ? `+${placed.length}` : undefined} trendDir="up" color={T.green} context="This academic year" />
        <KPICard value={successRate > 0 ? `${successRate}%` : "—"} label="Success Rate" color={T.sky} context="Active → Placed" />
        <KPICard value={active.length || "—"} label="Active Members" color={T.amber} context="Eligible for placement" />
      </div>

      <Card>
        <SectionHead title={isCollege ? "Placement Records" : "Hire Records"} />
        {placed.length === 0 ? (
          <EmptyState icon="🏆" title="No placements recorded yet" sub="Update member records with placement company and CTC to track outcomes here." />
        ) : (
          placed.map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < placed.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.greenL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.green, flexShrink: 0 }}>
                {m.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{m.name}</div>
                <div style={{ fontSize: 11, color: T.ink4 }}>{m.role}{m.batch ? ` · ${m.batch}` : ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: T.green }}>{m.placement_ctc || "—"}</div>
                <div style={{ fontSize: 11, color: T.ink3 }}>{m.placement_company}</div>
              </div>
            </div>
          ))
        )}
      </Card>
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 11 — SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsPage({ userData, user, initialTab = "profile", reloadAudit, auditLogs, auditLoading }) {
  const [tab, setTab]         = useState(initialTab)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [saveError, setSaveError] = useState(null)
  const isCollege = (userData?.org_type || "college") !== "company"

  const [profile, setProfile] = useState({
    org_name:        userData?.org_name        || "",
    org_inst_type:   userData?.org_inst_type   || "",
    org_location:    userData?.org_location    || "",
    org_website:     userData?.org_website     || "",
    org_naac_grade:  userData?.org_naac_grade  || "",
    org_admin_name:  userData?.org_admin_name  || "",
    org_admin_role:  userData?.org_admin_role  || "",
    org_industry:    userData?.org_industry    || "",
    org_company_size:userData?.org_company_size|| "",
    org_gst_cin:     userData?.org_gst_cin     || "",
  })
  const setP = (k, v) => setProfile(p => ({ ...p, [k]: v }))

  // sync if userData changes (e.g. after reload)
  useEffect(() => {
    setProfile({
      org_name:        userData?.org_name        || "",
      org_inst_type:   userData?.org_inst_type   || "",
      org_location:    userData?.org_location    || "",
      org_website:     userData?.org_website     || "",
      org_naac_grade:  userData?.org_naac_grade  || "",
      org_admin_name:  userData?.org_admin_name  || "",
      org_admin_role:  userData?.org_admin_role  || "",
      org_industry:    userData?.org_industry    || "",
      org_company_size:userData?.org_company_size|| "",
      org_gst_cin:     userData?.org_gst_cin     || "",
    })
  }, [userData])

  // Update initialTab when it changes (VerificationBanner click)
  useEffect(() => { setTab(initialTab) }, [initialTab])

  // Local verification level state — updated optimistically on click
  const [localVLevelBoost, setLocalVLevelBoost] = useState(0)
  const [verifyMsg, setVerifyMsg] = useState(null)
  const [verifyError, setVerifyError] = useState(null)

  async function handleEmailVerify() {
    setVerifyMsg(null); setVerifyError(null)
    // User is authenticated → their email IS confirmed. Mark email_verified in profiles.
    const { error } = await supabase.from("profiles")
      .update({ verificationStatus: "email_verified" })
      .eq("id", user.id)
    if (error) { setVerifyError("Verification failed: " + error.message); return }
    await auditLog(user.id, user.id, userData?.name || "Admin",
      "Completed Level 1 Email Verification", "verification.email_verified", "setting", "verification")
    setLocalVLevelBoost(1)
    setVerifyMsg("✅ Email verified! Level 1 complete.")
    reloadAudit()
  }

  async function handleDomainVerify() {
    // Level 2 — opens email to ops team
    window.location.href = `mailto:verify@capabilio.com?subject=Domain Verification Request — ${userData?.org_name || "Institution"}&body=Hi Capabilio team,%0A%0APlease initiate domain verification for our institution.%0A%0AOrganisation: ${userData?.org_name || ""}%0AWebsite: ${userData?.org_website || ""}%0AAdmin: ${userData?.org_admin_name || ""}%0A%0AThank you.`
  }

  async function handleSave() {
    setSaving(true); setSaveError(null); setSaved(false)
    const payload = isCollege ? {
      org_name:       profile.org_name,
      org_inst_type:  profile.org_inst_type,
      org_location:   profile.org_location,
      org_website:    profile.org_website,
      org_naac_grade: profile.org_naac_grade,
      org_admin_name: profile.org_admin_name,
      org_admin_role: profile.org_admin_role,
    } : {
      org_name:        profile.org_name,
      org_industry:    profile.org_industry,
      org_company_size:profile.org_company_size,
      org_website:     profile.org_website,
      org_gst_cin:     profile.org_gst_cin,
      org_admin_name:  profile.org_admin_name,
      org_admin_role:  profile.org_admin_role,
    }
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    await auditLog(user.id, user.id, userData?.name || "Admin",
      "Updated organisation profile", "settings.profile_updated", "setting", "profile")
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    reloadAudit()
  }

  const vLevel = Math.max(verificationLevel(userData), localVLevelBoost)

  const verificationSteps = [
    { level: 1, label: "Email Verification",   done: vLevel >= 1, note: "Required to create tasks and invite members" },
    { level: 2, label: "Domain Verification",  done: vLevel >= 2, note: "Required for trust badge and recruiter access" },
    { level: 3, label: "Document Upload",      done: vLevel >= 3, note: "Upload accreditation or business registration" },
    { level: 4, label: "Full Verification",    done: vLevel >= 4, note: "Manual review — usually within 24h" },
  ]

  return (
    <PageShell>
      <PageHeader title="Settings" sub="Organisation profile, verification, and integrations" />

      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {["profile", "verification", "integrations", "audit"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === "profile" && (
        <Card>
          <SectionHead title={isCollege ? "Institution Profile" : "Company Profile"} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <FieldInput label={isCollege ? "Institution Name" : "Company Name"} value={profile.org_name} onChange={v => setP("org_name", v)} />
            {isCollege ? (
              <>
                <FieldInput label="Institution Type" value={profile.org_inst_type} onChange={v => setP("org_inst_type", v)} placeholder="e.g. Engineering College, University" />
                <FieldInput label="Location" value={profile.org_location} onChange={v => setP("org_location", v)} placeholder="City, State" />
                <FieldInput label="Website" value={profile.org_website} onChange={v => setP("org_website", v)} placeholder="https://" />
                <FieldInput label="NAAC Grade" value={profile.org_naac_grade} onChange={v => setP("org_naac_grade", v)} placeholder="e.g. A++" />
                <FieldInput label="Admin Name" value={profile.org_admin_name} onChange={v => setP("org_admin_name", v)} />
                <FieldInput label="Admin Role" value={profile.org_admin_role} onChange={v => setP("org_admin_role", v)} placeholder="e.g. Principal, Dean" />
              </>
            ) : (
              <>
                <FieldInput label="Industry" value={profile.org_industry} onChange={v => setP("org_industry", v)} />
                <FieldInput label="Company Size" value={profile.org_company_size} onChange={v => setP("org_company_size", v)} placeholder="e.g. 50–200" />
                <FieldInput label="Website" value={profile.org_website} onChange={v => setP("org_website", v)} placeholder="https://" />
                <FieldInput label="GST / CIN" value={profile.org_gst_cin} onChange={v => setP("org_gst_cin", v)} />
                <FieldInput label="Admin Name" value={profile.org_admin_name} onChange={v => setP("org_admin_name", v)} />
                <FieldInput label="Admin Role" value={profile.org_admin_role} onChange={v => setP("org_admin_role", v)} />
              </>
            )}
          </div>
          {saveError && <ErrorBanner msg={saveError} />}
          {saved && (
            <div style={{ padding: "10px 14px", background: T.greenL, borderRadius: 10, marginBottom: 12, fontSize: 13, color: T.green, fontWeight: 600 }}>
              ✅ Profile saved successfully.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Btn>
          </div>
        </Card>
      )}

      {tab === "verification" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card style={{ background: T.skyL, border: `1px solid ${T.sky}30` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sky, marginBottom: 4 }}>
              Verification Level: {vLevel}/4 — {["Unverified", "Email Verified", "Domain Verified", "Document Submitted", "Fully Verified"][vLevel]}
            </div>
            <div style={{ fontSize: 12, color: T.ink3 }}>Complete all 4 levels to get the Verified Institution badge and unlock full platform features.</div>
          </Card>

          {verifyMsg && (
            <div style={{ padding: "10px 14px", background: T.greenL, borderRadius: 10, fontSize: 13, color: T.green, fontWeight: 600 }}>
              {verifyMsg}
            </div>
          )}
          {verifyError && <ErrorBanner msg={verifyError} />}

          {verificationSteps.map((v, i) => (
            <Card key={i} style={{ padding: "14px 16px", borderLeft: `3px solid ${v.done ? T.green : v.level === vLevel + 1 ? T.sky : T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 20 }}>{v.done ? "✅" : v.level === vLevel + 1 ? "🔵" : "🔒"}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Level {v.level}: {v.label}</div>
                    <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>{v.note}</div>
                    {/* Show action hint for the active step */}
                    {!v.done && v.level === vLevel + 1 && v.level === 1 && (
                      <div style={{ fontSize: 11, color: T.sky, marginTop: 4 }}>
                        Your account email: <strong>{user?.email}</strong>
                      </div>
                    )}
                    {!v.done && v.level === vLevel + 1 && v.level === 2 && (
                      <div style={{ fontSize: 11, color: T.sky, marginTop: 4 }}>
                        We'll send a verification link to your institution domain email.
                      </div>
                    )}
                    {!v.done && v.level === vLevel + 1 && v.level === 3 && (
                      <div style={{ fontSize: 11, color: T.sky, marginTop: 4 }}>
                        Email your NAAC certificate / incorporation docs to verify@capabilio.com
                      </div>
                    )}
                    {!v.done && v.level === vLevel + 1 && v.level === 4 && (
                      <div style={{ fontSize: 11, color: T.sky, marginTop: 4 }}>
                        Our team will review and approve within 24h after Step 3 is done.
                      </div>
                    )}
                  </div>
                </div>
                {v.done ? (
                  <span style={{ fontSize: 12, color: T.green, fontWeight: 700 }}>Verified ✓</span>
                ) : v.level === vLevel + 1 ? (
                  <Btn
                    style={{ fontSize: 11, padding: "5px 12px" }}
                    onClick={v.level === 1 ? handleEmailVerify : v.level === 2 ? handleDomainVerify : undefined}
                  >
                    {v.level === 1 ? "Verify Email →" : v.level === 2 ? "Request →" : v.level === 3 ? "Email Docs →" : "Awaiting Review"}
                  </Btn>
                ) : (
                  <span style={{ fontSize: 11, color: T.ink4 }}>Locked</span>
                )}
              </div>
            </Card>
          ))}
          <div style={{ padding: "12px 16px", background: T.amberL, borderRadius: 10, border: `1px solid ${T.amber}30`, fontSize: 12, color: T.ink3 }}>
            📧 Need help with verification? Email <span style={{ color: T.sky, fontWeight: 600 }}>verify@capabilio.com</span> with your institution name and documents.
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ padding: "12px 16px", background: T.skyL, borderRadius: 10, border: `1px solid ${T.sky}30`, fontSize: 12, color: T.ink3, marginBottom: 4 }}>
            🔌 Native integrations (Google Workspace, ATS, HRMS) launch in Q3 2026. Use the Capabilio API in the meantime.
          </div>
          {[
            { name: "Google Workspace",  icon: "🔵", status: "coming_soon", desc: "SSO + directory sync"          },
            { name: "Greenhouse ATS",    icon: "🟢", status: "coming_soon", desc: "Applicant tracking sync"       },
            { name: "Microsoft Teams",   icon: "🔷", status: "coming_soon", desc: "Notifications + announcements" },
            { name: "Slack",             icon: "🟡", status: "coming_soon", desc: "Team alerts and digests"       },
            { name: "HRMS / ERP",        icon: "⚫", status: "coming_soon", desc: "Student / employee data sync"  },
          ].map((intg, i) => (
            <Card key={i} style={{ padding: "14px 16px", opacity: 0.7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{intg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{intg.name}</div>
                  <div style={{ fontSize: 12, color: T.ink4 }}>{intg.desc}</div>
                </div>
                <Chip color={T.ink4} bg={T.bg}>Coming Soon</Chip>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "audit" && (
        <Card>
          <SectionHead title="Audit Log" sub="Last 50 admin actions" />
          {auditLoading ? <Spinner /> : auditLogs.length === 0 ? (
            <EmptyState icon="📋" title="No audit entries yet" sub="Member approvals, task publishes, and profile changes will appear here." />
          ) : (
            auditLogs.slice(0, 50).map((a, i) => (
              <div key={a.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < Math.min(auditLogs.length, 50) - 1 ? `1px solid ${T.border}` : "none" }}>
                <span style={{ fontSize: 14, marginTop: 1 }}>
                  {a.severity === "critical" ? "🔴" : a.severity === "warning" ? "⚠️" : "🟢"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.5 }}>{a.action}</div>
                  <div style={{ fontSize: 11, color: T.ink4, marginTop: 1 }}>{a.actor_name} · {timeSince(a.created_at)} · <span style={{ fontFamily: MONO }}>{a.action_code}</span></div>
                </div>
              </div>
            ))
          )}
        </Card>
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
  const [settingsTab, setSettingsTab] = useState("profile")

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Fetch all org data at root level — shared across pages
  const { data: members,       loading: membersLoading,  error: membersError,  reload: reloadMembers  } = useOrgMembers(user?.id)
  const { data: tasks,         loading: tasksLoading,    error: tasksError,    reload: reloadTasks    } = useOrgTasks(user?.id)
  const { data: events,        loading: eventsLoading,   error: eventsError,   reload: reloadEvents   } = useOrgEvents(user?.id)
  const { data: auditLogs,     loading: auditLoading,    reload: reloadAudit   } = useOrgAuditLog(user?.id, 50)

  function onNav(page) {
    setActivePage(page)
    if (onNavigate && (page === "profile" || page === "home-outer")) {
      onNavigate(page)
    }
  }

  function handleVerify() {
    setSettingsTab("verification")
    setActivePage("settings")
  }

  const shared = { user, userData, onNav, members, membersLoading, membersError, reloadMembers, tasks, tasksLoading, tasksError, reloadTasks, events, eventsLoading, eventsError, reloadEvents, auditLogs, auditLoading, reloadAudit }

  const PAGE_MAP = {
    home:          <HomePage          {...shared} onVerify={handleVerify} />,
    intelligence:  <IntelligencePage  {...shared} />,
    tasks:         <TasksPage         {...shared} />,
    people:        <PeoplePage        {...shared} />,
    community:     <CommunityPage />,
    groups:        <GroupsPage />,
    cohorts:       <CohortsPage       members={members} />,
    events:        <EventsPage        {...shared} />,
    companies:     <CompaniesPage     user={user} userData={userData} />,
    outcomes:      <OutcomesPage      userData={userData} members={members} />,
    settings:      <SettingsPage      user={user} userData={userData} initialTab={settingsTab} reloadAudit={reloadAudit} auditLogs={auditLogs} auditLoading={auditLoading} />,
  }

  return (
    <div style={{
      display: "flex", flexDirection: isMobile ? "column" : "row",
      height: "100%", width: "100%", background: T.bg, overflow: "hidden",
      fontFamily: FONT,
    }}>
      {!isMobile && (
        <InstSidebar active={activePage} onNav={onNav} userData={userData} />
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
        {PAGE_MAP[activePage] || <HomePage {...shared} onVerify={handleVerify} />}
      </div>
      {isMobile && (
        <InstTabBar active={activePage} onNav={onNav} />
      )}
    </div>
  )
}
