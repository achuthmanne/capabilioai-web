/**
 * OrgSettings.jsx — Tenant-level controls: branding, integrations, access, billing
 */
import { useState } from "react"

const C = {
  teal: "#0F766E", tealL: "#F0FDFA",
  ink: "#FFFFFF", ink2: "#374151", ink3: "#6B7280", ink4: "#9CA3AF",
  border: "#E5E7EB", surface: "#fff", bg: "#F6F6F1",
  green: "#16A34A", greenL: "#F0FDF4",
  amber: "#D97706", amberL: "#FFFBEB",
  red: "#DC2626", redL: "#FEF2F2",
  blue: "#1D4ED8", blueL: "#EFF6FF",
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, background: value ? C.teal : "#E5E7EB", borderRadius: 99, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 22 : 3, width: 18, height: 18, background: "#FFFFFF", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
    </div>
  )
}

function SectionHead({ label }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: C.ink4, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 24, marginBottom: 10 }}>{label}</div>
}

function Row({ label, sub, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: C.ink4, marginTop: 1 }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

const INTEGRATIONS = [
  { name: "Greenhouse ATS",  icon: "🌿", status: "connected",     color: C.green },
  { name: "Lever",           icon: "⚡", status: "not connected", color: C.ink4  },
  { name: "Workday",         icon: "📋", status: "not connected", color: C.ink4  },
  { name: "LDAP / SSO",      icon: "🔐", status: "connected",     color: C.green },
  { name: "Slack Alerts",    icon: "💬", status: "connected",     color: C.green },
]

export default function OrgSettings({ user, userData }) {
  const [settings, setS] = useState({
    publicProfiles: true,
    allowRecruiterAccess: true,
    moderateContent: false,
    autoVerify: false,
    twoFactor: true,
    emailDomain: "@srmist.edu.in",
    orgName: "SRM Institute of Science and Technology",
    plan: "Institution Pro",
  })

  const set = (key, val) => setS(p => ({ ...p, [key]: val }))

  return (
    <div style={{ background: C.bg, flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 40px", fontFamily: "Inter, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');`}</style>

      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: C.ink, margin: "0 0 4px" }}>
        Settings <span style={{ color: C.teal, fontStyle: "italic" }}>& Controls</span>
      </h1>
      <p style={{ fontSize: 13, color: C.ink3, margin: "0 0 0" }}>Tenant configuration, integrations, and access policies.</p>

      {/* ── Organisation Identity ─────────────────────────────── */}
      <SectionHead label="Organisation Identity" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "0 16px" }}>
        <Row label="Organisation Name" sub={settings.orgName}>
          <button style={{ padding: "6px 14px", background: C.tealL, border: `1px solid ${C.teal}30`, borderRadius: 8, color: C.teal, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
        </Row>
        <Row label="Verified Email Domain" sub={settings.emailDomain}>
          <button style={{ padding: "6px 14px", background: C.tealL, border: `1px solid ${C.teal}30`, borderRadius: 8, color: C.teal, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Change</button>
        </Row>
        <Row label="Organisation Logo" sub="Shown on student profiles and certificates">
          <button style={{ padding: "6px 14px", background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 8, color: C.ink3, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Upload</button>
        </Row>
        <Row label="UAN / GST / CIN" sub="Legal identity for verified badges">
          <button style={{ padding: "6px 14px", background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 8, color: C.ink3, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Add</button>
        </Row>
      </div>

      {/* ── Access & Visibility ───────────────────────────────── */}
      <SectionHead label="Access & Visibility" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "0 16px" }}>
        <Row label="Public Student Profiles" sub="Recruiters can view verified profiles">
          <Toggle value={settings.publicProfiles} onChange={v => set("publicProfiles", v)} />
        </Row>
        <Row label="Recruiter Portal Access" sub="Allow external recruiters to request access">
          <Toggle value={settings.allowRecruiterAccess} onChange={v => set("allowRecruiterAccess", v)} />
        </Row>
        <Row label="Auto-Verify Email Domain" sub="Auto-approve joins from @srmist.edu.in">
          <Toggle value={settings.autoVerify} onChange={v => set("autoVerify", v)} />
        </Row>
        <Row label="Content Moderation" sub="Review student posts before publishing">
          <Toggle value={settings.moderateContent} onChange={v => set("moderateContent", v)} />
        </Row>
        <Row label="Two-Factor for Admins" sub="Require 2FA for all admin actions">
          <Toggle value={settings.twoFactor} onChange={v => set("twoFactor", v)} />
        </Row>
      </div>

      {/* ── Integrations ─────────────────────────────────────── */}
      <SectionHead label="Integrations" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "0 16px" }}>
        {INTEGRATIONS.map((intg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: i < INTEGRATIONS.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{intg.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{intg.name}</div>
                <div style={{ fontSize: 12, color: intg.color, fontWeight: 600, marginTop: 1 }}>{intg.status === "connected" ? "● Connected" : "○ Not connected"}</div>
              </div>
            </div>
            <button style={{ padding: "6px 14px", background: intg.status === "connected" ? C.redL : C.tealL, border: `1px solid ${intg.status === "connected" ? C.red : C.teal}30`, borderRadius: 8, color: intg.status === "connected" ? C.red : C.teal, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {intg.status === "connected" ? "Disconnect" : "Connect"}
            </button>
          </div>
        ))}
      </div>

      {/* ── Billing ──────────────────────────────────────────── */}
      <SectionHead label="Billing & Plan" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "0 16px" }}>
        <Row label="Current Plan" sub={settings.plan}>
          <span style={{ padding: "4px 10px", background: C.tealL, color: C.teal, borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Active</span>
        </Row>
        <Row label="Billing Cycle" sub="Annual — renews Jan 2027">
          <button style={{ padding: "6px 14px", background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 8, color: C.ink3, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Manage</button>
        </Row>
        <Row label="Invoices & Contracts" sub="Download tax invoices">
          <button style={{ padding: "6px 14px", background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 8, color: C.ink3, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>View</button>
        </Row>
      </div>

      {/* ── Danger Zone ──────────────────────────────────────── */}
      <SectionHead label="Danger Zone" />
      <div style={{ background: C.redL, border: `1px solid ${C.red}30`, borderRadius: 16, padding: "0 16px" }}>
        <Row label="Export All Data" sub="Download full org data archive">
          <button style={{ padding: "6px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.ink3, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Export</button>
        </Row>
        <Row label="Delete Organisation" sub="Permanently remove all data and members">
          <button style={{ padding: "6px 14px", background: C.redL, border: `1px solid ${C.red}40`, borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
        </Row>
      </div>
    </div>
  )
}
