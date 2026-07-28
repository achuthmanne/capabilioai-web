// ─── SettingsPanel.jsx ────────────────────────────────────────────────────────
// Comprehensive settings control center for Capabilio Aura.
// Rendered inside the "settings" tab of Aura.jsx.
//
// Props:
//   userData       — profile object from Supabase (profiles row)
//   user           — Supabase auth user object
//   save           — async (patch) => void — writes patch to Supabase profiles
//   setUserData    — optimistic React state setter (d => {...d, ...patch})
//   path           — userData.path shortcut
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { getPlan } from "../config/plans"

// ── Design tokens (mirrors Aura.jsx T) ───────────────────────────────────────
const T = {
  cream:   "#FAF7F2",
  cream2:  "#FFFFFF",
  cream3:  "rgba(0,0,0,0.05)",
  ink:     "#1A1714",
  ink2:    "#475569",
  ink3:    "#A8A29E",
  ink4:    "#6B6560",
  indigo:  "#6366F1",
  indigo2: "#818CF8",
  indigo3: "rgba(99,102,241,0.12)",
  green:   "#10B981",
  green2:  "rgba(16,185,129,0.12)",
  amber:   "#F59E0B",
  amber2:  "rgba(245,158,11,0.12)",
  red:     "#F43F5E",
  red2:    "rgba(244,63,94,0.12)",
  blue:    "#3B82F6",
  blue2:   "rgba(59,130,246,0.12)",
  border:  "rgba(0,0,0,0.07)",
  shadow:  "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  shadow2: "0 4px 16px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.05)",
}

// ── ELO tiers (mirrors Arena / Aura) ─────────────────────────────────────────
const ELO_TIERS = [
  { min:0,    max:600,  label:"Rookie",       color:"#A8A29E", icon:"🌱" },
  { min:600,  max:800,  label:"Apprentice",   color:"#22C55E", icon:"⚡" },
  { min:800,  max:1000, label:"Practitioner", color:"#3B82F6", icon:"🔵" },
  { min:1000, max:1200, label:"Expert",       color:"#8B5CF6", icon:"💜" },
  { min:1200, max:1500, label:"Master",       color:"#F59E0B", icon:"🏆" },
  { min:1500, max:9999, label:"Elite",        color:"#EF4444", icon:"🔥" },
]
const getTier = elo => ELO_TIERS.find(t => elo >= t.min && elo < t.max) || ELO_TIERS[0]

// ── Path colors ───────────────────────────────────────────────────────────────
const PATH_META = {
  student:      { label:"Student",      color:"#FF5701", bg:"rgba(255,87,1,0.1)",   icon:"🎓" },
  professional: { label:"Professional", color:"#6D28D9", bg:"rgba(109,40,217,0.1)", icon:"💼" },
  authority:    { label:"Authority",    color:"#1D4ED8", bg:"rgba(29,78,216,0.1)",  icon:"🏛️" },
  institution:  { label:"Institution",  color:"#0F766E", bg:"rgba(15,118,110,0.1)", icon:"🏫" },
}

// ── Nav sections ──────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Identity",
    items: [
      { id:"profile",      icon:"👤", label:"Profile",         desc:"Name, photo, bio" },
      { id:"account",      icon:"🔑", label:"Account",         desc:"Email, plan, username" },
    ],
  },
  {
    label: "Career",
    items: [
      { id:"path",         icon:"🧭", label:"Path & Roles",    desc:"Career path, keywords" },
      { id:"arena",        icon:"⚔️", label:"Arena Prefs",     desc:"Domain, difficulty" },
      { id:"employment",   icon:"🏛️", label:"Employment Verify",desc:"UAN / EPFO verification" },
    ],
  },
  {
    label: "Visibility",
    items: [
      { id:"privacy",      icon:"🔒", label:"Privacy",         desc:"Page & search visibility" },
      { id:"proof",        icon:"🔗", label:"Proof & Portfolio",desc:"Links & certifications" },
    ],
  },
  {
    label: "Notifications",
    items: [
      { id:"notifications",icon:"🔔", label:"Notifications",   desc:"Alerts & digests" },
    ],
  },
  {
    label: "Personalization",
    items: [
      { id:"appearance",   icon:"🎨", label:"Appearance",      desc:"Theme & display" },
      { id:"ai",           icon:"🤖", label:"AI Preferences",  desc:"Tone & language" },
    ],
  },
  {
    label: "Data",
    items: [
      { id:"data",         icon:"📦", label:"Data & Export",   desc:"Download your data" },
      { id:"security",     icon:"🛡️", label:"Security",        desc:"Sessions & auth" },
    ],
  },
  {
    label: "Info",
    items: [
      { id:"help",         icon:"💬", label:"Help & Support",  desc:"Docs & contact" },
      { id:"about",        icon:"ℹ️",  label:"About",           desc:"Version & changelog" },
      { id:"policies",     icon:"📜", label:"Policies",        desc:"Terms & privacy" },
      { id:"advanced",     icon:"⚙️", label:"Advanced",        desc:"Danger zone" },
    ],
  },
]

// ── Profile completeness scoring ──────────────────────────────────────────────
function calcCompleteness(ud) {
  if (!ud) return { score: 0, items: [] }
  const items = [
    { label:"Display name",   done: !!(ud.displayName && ud.displayName !== "Anonymous"), pts:15 },
    { label:"Headline / bio", done: !!(ud.bio || ud.headline),                            pts:15 },
    { label:"Profile photo",  done: !!(ud.avatarUrl || ud.avatar_url),                   pts:10 },
    { label:"Username set",   done: !!(ud.username),                                     pts:10 },
    { label:"LinkedIn URL",   done: !!(ud.linkedinUrl || ud.linkedin_url),               pts:10 },
    { label:"GitHub URL",     done: !!(ud.githubUrl   || ud.github_url),                 pts:10 },
    { label:"Skills added",   done: !!(ud.skill_graph?.length > 0 || ud.skillGraph?.length > 0), pts:15 },
    { label:"Arena challenge",done: !!(ud.eloRating > 500),                              pts:15 },
  ]
  const score = items.filter(i => i.done).reduce((s, i) => s + i.pts, 0)
  return { score, items }
}

// ── Primitive components ───────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${T.border}`,
      borderRadius: 14, boxShadow: T.shadow, padding: "20px 22px", ...style
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display:"flex", alignItems:"center", gap: 9 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: T.ink, margin: 0 }}>{title}</h3>
      </div>
      {subtitle && <p style={{ fontSize: 12, color: T.ink3, margin:"5px 0 0 29px" }}>{subtitle}</p>}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: T.ink4,
      textTransform:"uppercase", letterSpacing:"0.07em", marginBottom: 6
    }}>{children}</div>
  )
}

function Input({ value, onChange, placeholder, type="text", disabled=false, monospace=false }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width:"100%", padding:"9px 12px", borderRadius:9,
        border:`1.5px solid ${focused ? T.indigo : T.border}`,
        fontSize:13, color: disabled ? T.ink4 : T.ink,
        fontFamily: monospace ? "'DM Mono',monospace" : "inherit",
        background: disabled ? T.cream : "#fff",
        outline:"none", transition:"border 0.15s", boxSizing:"border-box",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows=3 }) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width:"100%", padding:"9px 12px", borderRadius:9,
        border:`1.5px solid ${focused ? T.indigo : T.border}`,
        fontSize:13, color:T.ink, fontFamily:"inherit",
        outline:"none", resize:"vertical", transition:"border 0.15s",
        boxSizing:"border-box", lineHeight:1.55,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function Toggle({ value, onChange, label, desc, disabled=false }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:14,
      padding:"13px 16px", background:"#fff",
      border:`1px solid ${T.border}`, borderRadius:11,
      boxShadow:T.shadow, opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{label}</div>
        {desc && <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>{desc}</div>}
      </div>
      <div
        onClick={() => !disabled && onChange(!value)}
        style={{
          width:42, height:23, borderRadius:12, cursor: disabled?"not-allowed":"pointer",
          background: value ? T.indigo : T.cream3,
          border:`1.5px solid ${value ? "rgba(99,102,241,0.4)" : T.border}`,
          position:"relative", transition:"all 0.2s", flexShrink:0,
        }}
      >
        <div style={{
          position:"absolute", top:2, left: value ? 20 : 2,
          width:15, height:15, borderRadius:"50%",
          background: value ? "#fff" : T.ink4,
          transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)",
        }}/>
      </div>
    </div>
  )
}

// BUG FIX (2026-07-25, Career OS Tranche 3): every section's handleSave used
// to call save(patch) and unconditionally show "✓ Saved" right after,
// without checking the return value — save() (userDoc.update) returns false
// on a real DB write failure rather than throwing, so a rejected write (e.g.
// the searchable/certVisible/vaultVisible column-mismatch bug fixed in this
// same pass) still showed a success state with the data never actually
// persisted. `error` is optional and additive — sections that don't pass it
// keep their exact previous behavior.
function SaveBtn({ onClick, saved, loading, error }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding:"10px 24px", background: error ? T.red : saved ? T.green : T.indigo,
      border:"none", borderRadius:9, color:"#fff",
      fontSize:13, fontWeight:700, cursor: loading?"wait":"pointer",
      transition:"background 0.25s", display:"flex", alignItems:"center", gap:7,
    }}>
      {loading ? "Saving…" : error ? "⚠ Save failed — try again" : saved ? "✓ Saved" : "Save Changes"}
    </button>
  )
}

function InfoBox({ icon, text, color=T.blue, bg=T.blue2 }) {
  return (
    <div style={{
      display:"flex", alignItems:"flex-start", gap:10,
      padding:"12px 14px", background:bg, borderRadius:10,
      border:`1px solid ${color}22`, marginTop:14,
    }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <p style={{ fontSize:12, color:T.ink2, margin:0, lineHeight:1.6 }}>{text}</p>
    </div>
  )
}

// ── Section: Profile ──────────────────────────────────────────────────────────
function ProfileSection({ userData, save, setUserData }) {
  const [form, setForm] = useState({
    displayName: userData?.displayName || userData?.display_name || "",
    headline:    userData?.headline || "",
    bio:         userData?.bio || "",
    location:    userData?.location || "",
    website:     userData?.website || "",
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setLoading(true)
    try {
      const patch = {
        displayName: form.displayName,
        display_name: form.displayName,
        headline:    form.headline,
        bio:         form.bio,
        location:    form.location,
        website:     form.website,
      }
      if (save) await save(patch)
      if (setUserData) setUserData(d => ({ ...d, ...patch }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="👤" title="Profile" subtitle="Your public identity on Capabilio" />

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Display Name</FieldLabel>
        <Input value={form.displayName} onChange={f("displayName")} placeholder="Your full name" />
        <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>This is your name as it appears everywhere on Capabilio.</div>
      </Card>

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Professional Headline</FieldLabel>
        <Input value={form.headline} onChange={f("headline")} placeholder="e.g. Senior Software Engineer at Infosys" />
        <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>Shown below your name on your public profile and Portfolio.</div>
      </Card>

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Bio</FieldLabel>
        <Textarea value={form.bio} onChange={f("bio")} placeholder="Tell your professional story in 2–3 sentences…" rows={3} />
        <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>{form.bio.length}/300 characters</div>
      </Card>

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <FieldLabel>Location</FieldLabel>
            <Input value={form.location} onChange={f("location")} placeholder="City, State / Country" />
          </div>
          <div>
            <FieldLabel>Personal Website</FieldLabel>
            <Input value={form.website} onChange={f("website")} placeholder="https://yoursite.com" />
          </div>
        </div>
      </Card>

      <InfoBox
        icon="🖼️"
        text="To change your profile photo, go to the Aura Dashboard main page — the avatar upload button appears in your top profile banner."
      />

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: Account ──────────────────────────────────────────────────────────
function AccountSection({ userData, user, save, setUserData }) {
  const [username, setUsername] = useState(userData?.username || "")
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const plan = getPlan(userData)
  const email = user?.email || userData?.email || "—"

  const handleSave = async () => {
    const slug = username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    if (!slug) return
    setLoading(true)
    try {
      if (save) await save({ username: slug })
      if (setUserData) setUserData(d => ({ ...d, username: slug }))
      setUsername(slug)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  const portfolioUrl = `${window.location.origin}/portfolio/${username || "your-username"}`

  return (
    <div>
      <SectionTitle icon="🔑" title="Account" subtitle="Email, plan, and your unique Capabilio URL" />

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Email Address</FieldLabel>
        <Input value={email} onChange={() => {}} disabled={true} />
        <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>Email is managed by your sign-in provider (Google / GitHub). Contact support to change it.</div>
      </Card>

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Current Plan</FieldLabel>
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"12px 14px", background:T.indigo3, borderRadius:9,
        }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:T.indigo }}>{plan.label}</div>
            {plan.price > 0
              ? <div style={{ fontSize:11, color:T.ink3 }}>₹{plan.price}/month</div>
              : <div style={{ fontSize:11, color:T.ink3 }}>Free tier — upgrade for more features</div>
            }
          </div>
          <a href="/plans" style={{
            padding:"7px 14px", background:T.indigo, borderRadius:8,
            color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none",
          }}>
            {plan.price === 0 ? "Upgrade" : "Manage"}
          </a>
        </div>
        {plan.price === 0 && (
          <div style={{ marginTop:10, fontSize:11, color:T.ink3, lineHeight:1.6 }}>
            You're on the Free plan. Upgrade to Pro or Elite to unlock more Arena slots, AI interviews, and market reports.
          </div>
        )}
      </Card>

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Portfolio Username</FieldLabel>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{
            flex:1, display:"flex", alignItems:"center",
            border:`1.5px solid ${T.border}`, borderRadius:9, overflow:"hidden",
          }}>
            <span style={{
              padding:"9px 10px", background:T.cream, fontSize:11,
              color:T.ink4, whiteSpace:"nowrap", borderRight:`1px solid ${T.border}`, flexShrink:0,
            }}>
              {window.location.host}/portfolio/
            </span>
            <input
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="your-username"
              style={{
                flex:1, padding:"9px 10px", border:"none", fontSize:13,
                color:T.ink, fontFamily:"'DM Mono',monospace", outline:"none",
              }}
            />
          </div>
          <SaveBtn onClick={handleSave} saved={saved} loading={loading} />
        </div>
        <div style={{ marginTop:6, fontSize:11, color:T.ink4 }}>
          Lowercase letters, numbers, and hyphens only.
        </div>
        {username && (
          <div style={{
            marginTop:8, display:"flex", alignItems:"center", gap:6,
            fontSize:11, color:T.indigo,
          }}>
            <span>🔗</span>
            <span>{portfolioUrl}</span>
            <button onClick={() => navigator.clipboard.writeText(portfolioUrl)} style={{
              padding:"3px 8px", background:T.indigo3, border:"none",
              borderRadius:5, color:T.indigo, fontSize:10, fontWeight:700, cursor:"pointer",
            }}>Copy</button>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Section: Path & Roles ─────────────────────────────────────────────────────
function PathSection({ userData, save, setUserData, path }) {
  const [form, setForm] = useState({
    keyword:    userData?.keyword || userData?.job_role || "",
    targetRole: userData?.targetRole || userData?.target_role || "",
    yearsExp:   userData?.yearsExp || userData?.years_of_experience || "",
    targetComp: userData?.targetComp || "",
    arenaKey:   userData?.arenaKey || userData?.domain || "",
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }))
  const pm = PATH_META[path] || PATH_META.student

  const handleSave = async () => {
    setLoading(true)
    try {
      const patch = {
        keyword:    form.keyword,
        job_role:   form.keyword,
        targetRole: form.targetRole,
        target_role: form.targetRole,
        yearsExp:   form.yearsExp,
        years_of_experience: form.yearsExp,
        targetComp: form.targetComp,
        arenaKey:   form.arenaKey || undefined,
        domain:     form.arenaKey || undefined,
      }
      if (save) await save(patch)
      if (setUserData) setUserData(d => ({ ...d, ...patch }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="🧭" title="Path & Roles" subtitle="Your career focus and goals — this powers your Arena domain, Launchpad matches, and AI recommendations" />

      <Card style={{ marginBottom:14 }}>
        <div style={{
          display:"inline-flex", alignItems:"center", gap:8, padding:"5px 12px",
          background:pm.bg, borderRadius:20, marginBottom:14,
        }}>
          <span>{pm.icon}</span>
          <span style={{ fontSize:12, fontWeight:700, color:pm.color }}>{pm.label} Path</span>
        </div>
        <div style={{ fontSize:11, color:T.ink3, lineHeight:1.6 }}>
          Your career path shapes which features and plans are available to you. To switch paths, contact Capabilio support — path changes reset certain signals.
        </div>
      </Card>

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <FieldLabel>Current / Target Job Role</FieldLabel>
            <Input value={form.keyword} onChange={f("keyword")} placeholder="e.g. Full Stack Developer, Data Analyst, DevOps Engineer" />
            <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>Used to seed your Arena domain, Launchpad job feed, and skill graph.</div>
          </div>
          <div>
            <FieldLabel>Target Role (aspiration)</FieldLabel>
            <Input value={form.targetRole} onChange={f("targetRole")} placeholder="e.g. Senior Backend Engineer, Engineering Manager" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <FieldLabel>Years of Experience</FieldLabel>
              <select
                value={form.yearsExp}
                onChange={e => f("yearsExp")(e.target.value)}
                style={{
                  width:"100%", padding:"9px 12px", borderRadius:9,
                  border:`1.5px solid ${T.border}`, fontSize:13,
                  color:T.ink, background:"#fff", outline:"none",
                }}
              >
                <option value="">Select…</option>
                <option value="0">Fresher (0 years)</option>
                <option value="1">1 year</option>
                <option value="2">2 years</option>
                <option value="3">3 years</option>
                <option value="5">5 years</option>
                <option value="7">7+ years</option>
                <option value="10">10+ years</option>
                <option value="15">15+ years</option>
              </select>
            </div>
            <div>
              <FieldLabel>Target Company (optional)</FieldLabel>
              <Input value={form.targetComp} onChange={f("targetComp")} placeholder="e.g. Google, Infosys, Startup" />
            </div>
          </div>
          <div>
            <FieldLabel>Arena Domain Override (optional)</FieldLabel>
            <Input value={form.arenaKey} onChange={f("arenaKey")} placeholder="Leave blank to auto-detect from job role" monospace />
            <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>Override the domain key used for Arena challenges. Options: frontend, backend, fullstack, swe, data, devops, aws, cyber…</div>
          </div>
        </div>
      </Card>

      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: Privacy ──────────────────────────────────────────────────────────
function PrivacySection({ userData, save, setUserData, path }) {
  const pages = path === "professional" ? [
    { id:"forge",     icon:"⚒️", label:"Forge",       desc:"5-min skill maintenance tasks" },
    { id:"pulse",     icon:"📡", label:"Pulse",        desc:"Market signals and community feed" },
    { id:"arena",     icon:"⚔️", label:"Arena",        desc:"Full skill challenges for ELO" },
    { id:"launchpad", icon:"🚀", label:"Launchpad",    desc:"Job matches and applications" },
  ] : [
    { id:"arena",       icon:"⚔️", label:"Arena",        desc:"Daily skill challenges and ELO" },
    { id:"pulse",       icon:"📡", label:"Pulse",         desc:"Community feed and updates" },
    { id:"skillstudio", icon:"🎯", label:"Skill Studio",  desc:"Learning resources" },
    { id:"launchpad",   icon:"🚀", label:"Launchpad",     desc:"Job matches and applications" },
  ]

  const [vis, setVis] = useState(userData?.pageVisibility || {})
  const [searchable, setSearchable] = useState(userData?.searchable !== false)
  const [analyticsOn, setAnalyticsOn] = useState(userData?.analyticsEnabled !== false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const toggle = (id) => setVis(v => ({ ...v, [id]: !(v[id] !== false) }))

  const handleSave = async () => {
    setLoading(true)
    setError(false)
    try {
      const patch = { pageVisibility: vis, searchable, analyticsEnabled: analyticsOn }
      const ok = save ? await save(patch) : true
      if (ok === false) { setError(true); setTimeout(() => setError(false), 3500); return }
      if (setUserData) setUserData(d => ({ ...d, ...patch }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="🔒" title="Privacy" subtitle="Control what others see and how you appear on Capabilio" />

      <div style={{ marginBottom:14, fontSize:12, fontWeight:700, color:T.ink2 }}>Page Visibility</div>
      {pages.map(p => {
        const isOn = vis[p.id] !== false
        return (
          <div key={p.id} style={{ marginBottom:10 }}>
            <Toggle
              value={isOn}
              onChange={() => toggle(p.id)}
              label={`${p.icon} ${p.label}`}
              desc={p.desc}
            />
          </div>
        )
      })}

      <div style={{ marginTop:20, marginBottom:14, fontSize:12, fontWeight:700, color:T.ink2 }}>Discovery & Analytics</div>

      <div style={{ marginBottom:10 }}>
        <Toggle
          value={searchable}
          onChange={setSearchable}
          label="🔍 Appear in Capabilio search"
          desc="Allow other users and recruiters to find your profile"
        />
      </div>
      <div style={{ marginBottom:10 }}>
        <Toggle
          value={analyticsOn}
          onChange={setAnalyticsOn}
          label="📊 Profile view analytics"
          desc="Track who views your public portfolio page"
        />
      </div>

      <InfoBox icon="ℹ️" text="Aura Dashboard itself is always private to you. The toggles above control your public-facing pages only." />
      <InfoBox icon="🔒" text="Search visibility is enforced server-side in Connect search results — turning this off actually removes you from other users' search, not just hides a UI toggle." />

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} error={error} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: Proof & Portfolio ────────────────────────────────────────────────
function ProofSection({ userData, save, setUserData }) {
  const [form, setForm] = useState({
    linkedinUrl:  userData?.linkedinUrl   || userData?.linkedin_url  || "",
    githubUrl:    userData?.githubUrl     || userData?.github_url    || "",
    leetcodeUrl:  userData?.leetcodeUrl   || "",
    portfolioUrl: userData?.portfolioUrl  || "",
  })
  const [certVisible, setCertVisible] = useState(userData?.certVisible !== false)
  const [vaultVisible, setVaultVisible] = useState(userData?.vaultVisible !== false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setLoading(true)
    setError(false)
    try {
      const patch = {
        ...form,
        linkedin_url: form.linkedinUrl,
        github_url:   form.githubUrl,
        certVisible,
        vaultVisible,
      }
      const ok = save ? await save(patch) : true
      if (ok === false) { setError(true); setTimeout(() => setError(false), 3500); return }
      if (setUserData) setUserData(d => ({ ...d, ...patch }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="🔗" title="Proof & Portfolio" subtitle="External profiles and what's shown on your public Portfolio page" />

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <FieldLabel>LinkedIn URL</FieldLabel>
            <Input value={form.linkedinUrl} onChange={f("linkedinUrl")} placeholder="https://linkedin.com/in/your-profile" />
          </div>
          <div>
            <FieldLabel>GitHub URL</FieldLabel>
            <Input value={form.githubUrl} onChange={f("githubUrl")} placeholder="https://github.com/your-username" />
          </div>
          <div>
            <FieldLabel>LeetCode / HackerRank (optional)</FieldLabel>
            <Input value={form.leetcodeUrl} onChange={f("leetcodeUrl")} placeholder="https://leetcode.com/u/your-username" />
          </div>
          <div>
            <FieldLabel>Personal / Other Portfolio URL</FieldLabel>
            <Input value={form.portfolioUrl} onChange={f("portfolioUrl")} placeholder="https://yourportfolio.com" />
          </div>
        </div>
      </Card>

      <div style={{ marginBottom:14, fontSize:12, fontWeight:700, color:T.ink2 }}>Portfolio Visibility</div>
      <div style={{ marginBottom:10 }}>
        <Toggle
          value={certVisible}
          onChange={setCertVisible}
          label="🏅 Show Certifications"
          desc="Display your uploaded certifications on your public Portfolio"
        />
      </div>
      <div style={{ marginBottom:10 }}>
        <Toggle
          value={vaultVisible}
          onChange={setVaultVisible}
          label="🗄️ Show Vault Projects"
          desc="Display your Vault files and projects on your public Portfolio"
        />
      </div>
      <InfoBox icon="🔒" text="Enforced server-side on non-owner profile reads (GET /api/pro/profile/:uid) — turning these off actually removes the data from the response, not just hides it in the UI." />

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} error={error} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: UAN / EPFO Verification ─────────────────────────────────────────
// Calls verify-uan Edge Function → Eko Employee Details API
// (POST https://staging.eko.in:25004/ekoapi/v3/tools/kyc/advance-employment)
// Lookup is by phone number → returns uan_details[] + recent_employment_details
function UANVerificationSection({ userData, user, save, setUserData }) {
  const defaultPhone = user?.phone || userData?.phone || ""
  const [phone,  setPhone]  = useState(defaultPhone.replace(/^(\+91|91)/, ""))
  const [step,   setStep]   = useState(userData?.uan_verified ? "verified" : "form")
  const [result, setResult] = useState(null)   // { uan_details, recent_employment_details }
  const [error,  setError]  = useState(null)
  const [saving, setSaving] = useState(false)

  // ── Profile fields for comparison ─────────────────────────────────────────
  const profileName   = userData?.displayName || userData?.display_name || ""
  const profileGender = userData?.gender || ""
  const profileDob    = userData?.dob    || ""
  const profileUan    = userData?.uan_number || ""

  function matchIcon(a, b) {
    if (!a || !b) return { icon: "—", color: T.ink3 }
    return a.toLowerCase().trim() === b.toLowerCase().trim()
      ? { icon: "✓ Match",    color: T.green }
      : { icon: "≠ Mismatch", color: T.amber }
  }

  const fieldRow = (label, profileVal, epfoVal) => {
    const m = matchIcon(profileVal, epfoVal)
    return (
      <div key={label} style={{
        display:"grid", gridTemplateColumns:"110px 1fr 1fr 88px",
        gap:8, alignItems:"center", padding:"9px 0",
        borderBottom:`1px solid ${T.border}`, fontSize:12,
      }}>
        <span style={{ color:T.ink4, fontWeight:600 }}>{label}</span>
        <span style={{ color:T.ink2 }}>{profileVal || <em style={{color:T.ink3}}>—</em>}</span>
        <span style={{ color:T.indigo, fontWeight:700 }}>{epfoVal || <em style={{color:T.ink3}}>—</em>}</span>
        <span style={{ color:m.color, fontWeight:700, fontSize:10 }}>{m.icon}</span>
      </div>
    )
  }

  // ── Lookup via Edge Function ──────────────────────────────────────────────
  async function handleVerify() {
    setError(null)
    const cleaned = phone.replace(/\D/g,"").replace(/^91/,"")
    if (!/^\d{10}$/.test(cleaned)) {
      setError("Enter a valid 10-digit Indian mobile number.")
      return
    }
    setStep("loading")
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-uan`,
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ phone: cleaned, user_id: user.id }),
        }
      )
      const json = await res.json()
      if (!json.ok) { setError(json.error || "Verification failed."); setStep("form"); return }
      setResult(json)
      setStep("result")
    } catch (e) {
      setError(String(e))
      setStep("form")
    }
  }

  // ── Confirm: sync mismatches → mark verified ──────────────────────────────
  async function handleAccept() {
    if (!result) return
    setSaving(true)
    // Pick best UAN record (highest source_score)
    const best = (result.uan_details || []).sort((a, b) => (b.source_score||0) - (a.source_score||0))[0] || {}
    const patch = {
      uan_number:      best.uan          || profileUan,
      uan_verified:    true,
      uan_verified_at: new Date().toISOString(),
    }
    // Sync mismatches from EPFO → profile
    if (best.employee_name && profileName !== best.employee_name)
      patch.displayName = best.employee_name
    if (best.gender && profileGender !== best.gender)
      patch.gender = best.gender
    if (best.dob && profileDob !== best.dob)
      patch.dob = best.dob

    if (save) await save(patch)
    if (setUserData) setUserData(d => ({ ...d, ...patch }))
    setSaving(false)
    setStep("verified")
  }

  // ─── VERIFIED STATE ───────────────────────────────────────────────────────
  if (step === "verified") {
    const uanList  = userData?.epfo_raw?.uan_details  || result?.uan_details  || []
    const recent   = userData?.epfo_raw?.recent_employment_details || result?.recent_employment_details || {}
    const best     = uanList.sort((a, b) => (b.source_score||0) - (a.source_score||0))[0] || {}

    return (
      <div>
        <SectionTitle icon="🏛️" title="Employment Verification" subtitle="Identity confirmed via EPFO / Eko" />

        {/* Badge */}
        <div style={{
          background:"linear-gradient(135deg,#1A1714,#1A1714)", borderRadius:14,
          padding:"18px 22px", marginBottom:16, color:"#fff",
          display:"flex", alignItems:"center", gap:14,
        }}>
          <span style={{ fontSize:28 }}>✅</span>
          <div>
            <div style={{ fontSize:14, fontWeight:800 }}>EPFO Verified</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:3 }}>
              UAN {userData?.uan_number || best.uan || "—"} · Verified via Eko
            </div>
          </div>
          <span style={{
            marginLeft:"auto", fontSize:10, fontWeight:800, padding:"4px 12px",
            background:T.green, color:"#fff", borderRadius:99, letterSpacing:0.5,
          }}>EPFO VERIFIED</span>
        </div>

        {/* Best record summary */}
        {best.employee_name && (
          <Card style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:800, color:T.ink3, textTransform:"uppercase", letterSpacing:1.2, marginBottom:10 }}>
              EPFO Record
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                ["Name",   best.employee_name],
                ["Gender", best.gender],
                ["DOB",    best.dob],
                ["UAN",    best.uan],
              ].filter(([,v]) => v).map(([l,v]) => (
                <div key={l}>
                  <div style={{ fontSize:10, color:T.ink4, fontWeight:600 }}>{l}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.ink, marginTop:2 }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Current employer from recent_employment_details */}
        {recent.establishment_name && (
          <Card style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:800, color:T.ink3, textTransform:"uppercase", letterSpacing:1.2, marginBottom:10 }}>
              Recent Employer
            </div>
            <div style={{ fontWeight:800, fontSize:14, color:T.ink, marginBottom:6 }}>
              {recent.establishment_name}
            </div>
            <div style={{ fontSize:11, color:T.ink4, display:"flex", flexWrap:"wrap", gap:12 }}>
              {recent.joining_date && <span>Joined: {recent.joining_date}</span>}
              {recent.exit_date    && <span>Exit: {recent.exit_date}</span>}
              {recent.establishment_id && <span>Est. ID: {recent.establishment_id}</span>}
              <span style={{
                color: recent.employed ? T.green : T.ink4,
                fontWeight: 700,
              }}>
                {recent.employed ? "● Currently Employed" : "○ Not currently employed"}
              </span>
            </div>
          </Card>
        )}

        {/* All UAN records (employment history) */}
        {uanList.length > 0 && (
          <Card>
            <div style={{ fontSize:11, fontWeight:800, color:T.ink3, textTransform:"uppercase", letterSpacing:1.2, marginBottom:12 }}>
              All Employment Records ({uanList.length})
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {uanList.map((u, i) => (
                <div key={i} style={{
                  padding:"10px 14px", borderRadius:10,
                  background:`${T.indigo}06`, border:`1px solid ${T.indigo}14`,
                }}>
                  <div style={{ fontWeight:800, fontSize:13, color:T.ink }}>{u.employer_name || "—"}</div>
                  <div style={{ fontSize:11, color:T.ink4, marginTop:3, display:"flex", flexWrap:"wrap", gap:10 }}>
                    <span>UAN: {u.uan}</span>
                    {u.joining_date && <span>Joined: {u.joining_date}</span>}
                    {u.exit_date    && <span>Exit: {u.exit_date}</span>}
                    {u.member_id    && <span>Member ID: {u.member_id}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div style={{ marginTop:12 }}>
          <button onClick={() => { setStep("form"); setResult(null) }}
            style={{
              fontSize:11, color:T.ink4, background:"none",
              border:`1px solid ${T.border}`, borderRadius:8,
              padding:"5px 12px", cursor:"pointer",
            }}>
            Re-verify with a different number
          </button>
        </div>
      </div>
    )
  }

  // ─── LOADING ──────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div>
        <SectionTitle icon="🏛️" title="Employment Verification" subtitle="Querying EPFO records via Eko…" />
        <div style={{ padding:48, textAlign:"center", color:T.ink4, fontSize:13 }}>
          <div style={{ fontSize:30, marginBottom:12, animation:"spin 1.2s linear infinite", display:"inline-block" }}>⟳</div>
          <div style={{ fontWeight:600 }}>Contacting EPFO via Eko API…</div>
          <div style={{ fontSize:11, marginTop:6, color:T.ink3 }}>Usually takes 5–15 seconds</div>
        </div>
      </div>
    )
  }

  // ─── RESULT: field comparison ─────────────────────────────────────────────
  if (step === "result" && result) {
    const uanList = result.uan_details || []
    const recent  = result.recent_employment_details || {}
    const best    = [...uanList].sort((a,b) => (b.source_score||0)-(a.source_score||0))[0] || {}

    return (
      <div>
        <SectionTitle icon="🏛️" title="Employment Verification" subtitle="Review EPFO data before confirming" />

        <InfoBox icon="ℹ️" text={`Found ${uanList.length} EPFO record(s) linked to this number. Review each field — any mismatch will be corrected from the official EPFO data.`} />

        {/* Field comparison table */}
        <Card style={{ marginBottom:16 }}>
          <div style={{
            display:"grid", gridTemplateColumns:"110px 1fr 1fr 88px",
            gap:8, padding:"6px 0 10px", borderBottom:`1px solid ${T.border}`,
            fontSize:10, fontWeight:800, color:T.ink4, textTransform:"uppercase", letterSpacing:1,
          }}>
            <span>Field</span><span>Your Profile</span><span>EPFO (Best Match)</span><span>Status</span>
          </div>
          {fieldRow("Full Name",    profileName,   best.employee_name)}
          {fieldRow("Gender",       profileGender, best.gender)}
          {fieldRow("Date of Birth",profileDob,    best.dob)}
          {fieldRow("UAN",          profileUan,    best.uan)}
        </Card>

        {/* Recent employer */}
        {recent.establishment_name && (
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:800, color:T.ink3, textTransform:"uppercase", letterSpacing:1.2, marginBottom:8 }}>
              Recent Employer
            </div>
            <div style={{ fontWeight:800, fontSize:13, color:T.ink }}>{recent.establishment_name}</div>
            <div style={{ fontSize:11, color:T.ink4, marginTop:4, display:"flex", flexWrap:"wrap", gap:10 }}>
              {recent.joining_date && <span>Joined: {recent.joining_date}</span>}
              {recent.exit_date    && <span>Exit: {recent.exit_date}</span>}
              <span style={{ color: recent.employed ? T.green : T.ink4, fontWeight:600 }}>
                {recent.employed ? "Currently employed" : "No longer at this org"}
              </span>
            </div>
          </Card>
        )}

        {/* All records */}
        {uanList.length > 1 && (
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:800, color:T.ink3, textTransform:"uppercase", letterSpacing:1.2, marginBottom:10 }}>
              All Employers ({uanList.length} records)
            </div>
            {uanList.map((u, i) => (
              <div key={i} style={{
                padding:"8px 12px", borderRadius:8, marginBottom:6,
                background:`${T.indigo}05`, border:`1px solid ${T.indigo}12`,
              }}>
                <div style={{ fontWeight:700, fontSize:12, color:T.ink }}>{u.employer_name || "—"}</div>
                <div style={{ fontSize:11, color:T.ink4, marginTop:2 }}>
                  {u.joining_date || "?"} → {u.exit_date || "Present"}
                  {u.establishment_id ? ` · Est. ${u.establishment_id}` : ""}
                </div>
              </div>
            ))}
          </Card>
        )}

        <InfoBox icon="⚠️" text="Mismatched fields will be updated to match official EPFO data. Matching fields stay untouched." />

        <div style={{ display:"flex", gap:10, marginTop:16, justifyContent:"flex-end" }}>
          <button onClick={() => setStep("form")}
            style={{
              padding:"9px 18px", borderRadius:10, border:`1px solid ${T.border}`,
              background:"#fff", color:T.ink2, fontSize:13, cursor:"pointer",
            }}>
            Cancel
          </button>
          <button onClick={handleAccept} disabled={saving}
            style={{
              padding:"9px 24px", borderRadius:10, border:"none",
              background:T.green, color:"#fff", fontSize:13,
              fontWeight:700, cursor:saving ? "not-allowed" : "pointer", opacity:saving?0.7:1,
            }}>
            {saving ? "Saving…" : "✅ Confirm & Verify"}
          </button>
        </div>
      </div>
    )
  }

  // ─── FORM ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <SectionTitle icon="🏛️" title="Employment Verification" subtitle="Verify your identity & employment history via EPFO / Eko API" />

      <InfoBox icon="ℹ️" text="Enter your EPFO-registered mobile number. Eko will look up your UAN records from the government EPFO database and return your employment history." />

      {error && (
        <div style={{
          background:T.red2, border:`1px solid ${T.red}30`, borderRadius:10,
          padding:"10px 14px", color:T.red, fontSize:12, fontWeight:600, marginBottom:14,
        }}>
          {error}
        </div>
      )}

      <Card style={{ marginBottom:16 }}>
        <FieldLabel>Mobile Number (EPFO-registered)</FieldLabel>
        <Input
          value={phone}
          onChange={setPhone}
          placeholder="10-digit mobile number"
          type="tel"
          maxLength={10}
        />
        <div style={{ fontSize:10, color:T.ink4, marginTop:5 }}>
          This must be the mobile number linked to your EPFO / UAN account.
          Your UAN, name, gender, DOB, and employment history will be fetched via Eko.
        </div>
      </Card>

      {/* What gets verified */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.ink3, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>
          What we fetch from EPFO
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {["UAN","Employee Name","Gender","Date of Birth","Employer Name","Joining Date","Exit Date","Member ID","Confidence Score"].map(f => (
            <span key={f} style={{
              fontSize:11, padding:"4px 10px", borderRadius:20,
              background:T.indigo3, color:T.indigo, fontWeight:600,
            }}>{f}</span>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <button onClick={handleVerify}
          style={{
            padding:"10px 28px", borderRadius:10, border:"none",
            background:`linear-gradient(135deg,${T.indigo},${T.blue})`,
            color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer",
            boxShadow:`0 4px 14px ${T.indigo}38`,
          }}>
          🔍 Fetch EPFO Records
        </button>
      </div>
    </div>
  )
}

// ── Section: Arena Preferences ────────────────────────────────────────────────
function ArenaSection({ userData, save, setUserData }) {
  const [form, setForm] = useState({
    preferredDifficulty: userData?.arenaPrefs?.difficulty  || "auto",
    dailyGoal:           userData?.arenaPrefs?.dailyGoal   || "1",
    autoAdvance:         userData?.arenaPrefs?.autoAdvance !== false,
    showTimer:           userData?.arenaPrefs?.showTimer   !== false,
    eloDecayReminder:    userData?.arenaPrefs?.decayReminder !== false,
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const plan = getPlan(userData)

  const handleSave = async () => {
    setLoading(true)
    try {
      const patch = { arenaPrefs: { ...form } }
      if (save) await save(patch)
      if (setUserData) setUserData(d => ({ ...d, ...patch }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="⚔️" title="Arena Preferences" subtitle="Customise how your Arena experience works" />

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <FieldLabel>Preferred Difficulty</FieldLabel>
            <select
              value={form.preferredDifficulty}
              onChange={e => setForm(p => ({ ...p, preferredDifficulty: e.target.value }))}
              style={{
                width:"100%", padding:"9px 12px", borderRadius:9,
                border:`1.5px solid ${T.border}`, fontSize:13,
                color:T.ink, background:"#fff", outline:"none",
              }}
            >
              <option value="auto">Auto (based on ELO)</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
          <div>
            <FieldLabel>Daily Challenge Goal</FieldLabel>
            <select
              value={form.dailyGoal}
              onChange={e => setForm(p => ({ ...p, dailyGoal: e.target.value }))}
              style={{
                width:"100%", padding:"9px 12px", borderRadius:9,
                border:`1.5px solid ${T.border}`, fontSize:13,
                color:T.ink, background:"#fff", outline:"none",
              }}
            >
              <option value="1">1 challenge/day</option>
              <option value="2">2 challenges/day</option>
              <option value="3">3 challenges/day</option>
            </select>
          </div>
        </div>
      </Card>

      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
        <Toggle
          value={form.showTimer}
          onChange={v => setForm(p => ({ ...p, showTimer: v }))}
          label="⏱️ Show challenge timer"
          desc="Display a countdown during Arena challenges"
        />
        <Toggle
          value={form.autoAdvance}
          onChange={v => setForm(p => ({ ...p, autoAdvance: v }))}
          label="⏭️ Auto-advance after submission"
          desc="Automatically show your next slot after completing a challenge"
        />
        <Toggle
          value={form.eloDecayReminder}
          onChange={v => setForm(p => ({ ...p, eloDecayReminder: v }))}
          label="⚠️ ELO decay reminders"
          desc="Warn you when inactivity is approaching the 14-day decay threshold"
        />
      </div>

      <InfoBox
        icon="⚔️"
        text={`Your plan (${plan.label}) gives you ${plan.arenaTasks} Arena slot${plan.arenaTasks !== 1 ? "s" : ""} per day, each refreshing every 24 hours.`}
        color={T.indigo}
        bg={T.indigo3}
      />

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: Notifications ────────────────────────────────────────────────────
function NotificationsSection({ userData, save, setUserData }) {
  const [prefs, setPrefs] = useState({
    emailDigest:     userData?.notifPrefs?.emailDigest    !== false,
    achievementAlert: userData?.notifPrefs?.achievementAlert !== false,
    decayWarning:    userData?.notifPrefs?.decayWarning   !== false,
    missionReminder: userData?.notifPrefs?.missionReminder !== false,
    marketReport:    userData?.notifPrefs?.marketReport   !== false,
    launchpadMatch:  userData?.notifPrefs?.launchpadMatch !== false,
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const togglePref = (k) => setPrefs(p => ({ ...p, [k]: !p[k] }))

  const handleSave = async () => {
    setLoading(true)
    try {
      const patch = { notifPrefs: prefs }
      if (save) await save(patch)
      if (setUserData) setUserData(d => ({ ...d, ...patch }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  const items = [
    { key:"emailDigest",     icon:"📧", label:"Weekly email digest",          desc:"Summary of your ELO progress, completed challenges, and top news" },
    { key:"achievementAlert",icon:"🏆", label:"Achievement unlocks",          desc:"Notify when you hit a new ELO tier or earn a milestone" },
    { key:"decayWarning",    icon:"⚠️", label:"ELO decay warning",            desc:"Alert before the 14-day inactivity decay threshold" },
    { key:"missionReminder", icon:"⚔️", label:"Mission slot ready",           desc:"Notify when your 24-hour cooldown expires and a new slot is available" },
    { key:"marketReport",    icon:"📊", label:"New market report available",  desc:"Alert when a fresh market analysis report is ready" },
    { key:"launchpadMatch",  icon:"🚀", label:"New job matches",              desc:"Weekly digest of new Launchpad jobs matching your profile" },
  ]

  return (
    <div>
      <SectionTitle icon="🔔" title="Notifications" subtitle="Choose which alerts and digests you receive" />

      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
        {items.map(item => (
          <Toggle
            key={item.key}
            value={prefs[item.key]}
            onChange={() => togglePref(item.key)}
            label={`${item.icon} ${item.label}`}
            desc={item.desc}
          />
        ))}
      </div>

      <InfoBox icon="📭" text="Notification delivery is subject to your plan. Email digests require a verified email address." />

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: Appearance ───────────────────────────────────────────────────────
function AppearanceSection({ userData, save, setUserData, path }) {
  const [compactMode, setCompactMode] = useState(userData?.compactMode || false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const pm = PATH_META[path] || PATH_META.student

  const handleSave = async () => {
    setLoading(true)
    try {
      if (save) await save({ compactMode })
      if (setUserData) setUserData(d => ({ ...d, compactMode }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="🎨" title="Appearance" subtitle="Display preferences for your Capabilio experience" />

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Accent Color (Path-based)</FieldLabel>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:4 }}>
          {Object.entries(PATH_META).map(([key, meta]) => (
            <div key={key} style={{
              display:"flex", alignItems:"center", gap:7,
              padding:"7px 14px", borderRadius:20,
              background: key === path ? meta.bg : T.cream3,
              border:`1.5px solid ${key === path ? meta.color + "50" : "transparent"}`,
            }}>
              <div style={{ width:12, height:12, borderRadius:"50%", background:meta.color }} />
              <span style={{ fontSize:12, fontWeight:700, color: key === path ? meta.color : T.ink4 }}>{meta.label}</span>
              {key === path && <span style={{ fontSize:10, color:meta.color }}>● active</span>}
            </div>
          ))}
        </div>
        <div style={{ marginTop:8, fontSize:11, color:T.ink4 }}>
          Your accent color is automatically set by your career path ({pm.label}). It applies to navigation highlights, ELO badges, and active states throughout the app.
        </div>
      </Card>

      <div style={{ marginBottom:14 }}>
        <Toggle
          value={compactMode}
          onChange={setCompactMode}
          label="⚡ Compact mode"
          desc="Reduce padding and spacing across the Aura dashboard for a denser layout"
        />
      </div>

      <InfoBox icon="🌙" text="Dark mode is on the Capabilio roadmap. Follow our announcements to stay informed when it launches." color={T.amber} bg={T.amber2} />

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: AI Preferences ───────────────────────────────────────────────────
function AISection({ userData, save, setUserData }) {
  const [form, setForm] = useState({
    summaryTone:    userData?.aiPrefs?.summaryTone    || "professional",
    summaryLang:    userData?.aiPrefs?.summaryLang    || "en",
    feedbackStyle:  userData?.aiPrefs?.feedbackStyle  || "detailed",
    autoSummary:    userData?.aiPrefs?.autoSummary    !== false,
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      const patch = { aiPrefs: form }
      if (save) await save(patch)
      if (setUserData) setUserData(d => ({ ...d, ...patch }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="🤖" title="AI Preferences" subtitle="How Capabilio AI generates content for you" />

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <FieldLabel>Profile Summary Tone</FieldLabel>
            <select
              value={form.summaryTone}
              onChange={e => setForm(p => ({ ...p, summaryTone: e.target.value }))}
              style={{
                width:"100%", padding:"9px 12px", borderRadius:9,
                border:`1.5px solid ${T.border}`, fontSize:13,
                color:T.ink, background:"#fff", outline:"none",
              }}
            >
              <option value="professional">Professional & formal</option>
              <option value="conversational">Conversational & warm</option>
              <option value="achievement">Achievement-focused</option>
              <option value="concise">Concise & punchy</option>
            </select>
          </div>
          <div>
            <FieldLabel>Content Language</FieldLabel>
            <select
              value={form.summaryLang}
              onChange={e => setForm(p => ({ ...p, summaryLang: e.target.value }))}
              style={{
                width:"100%", padding:"9px 12px", borderRadius:9,
                border:`1.5px solid ${T.border}`, fontSize:13,
                color:T.ink, background:"#fff", outline:"none",
              }}
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
            </select>
          </div>
          <div>
            <FieldLabel>Arena Feedback Style</FieldLabel>
            <select
              value={form.feedbackStyle}
              onChange={e => setForm(p => ({ ...p, feedbackStyle: e.target.value }))}
              style={{
                width:"100%", padding:"9px 12px", borderRadius:9,
                border:`1.5px solid ${T.border}`, fontSize:13,
                color:T.ink, background:"#fff", outline:"none",
              }}
            >
              <option value="detailed">Detailed with examples</option>
              <option value="concise">Concise summary</option>
              <option value="mentor">Mentor-style coaching</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop:14 }}>
          <Toggle
            value={form.autoSummary}
            onChange={v => setForm(p => ({ ...p, autoSummary: v }))}
            label="✨ Auto-generate Portfolio summary"
            desc="Automatically build your professional summary from Arena performance data"
          />
        </div>
      </Card>

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: Security ─────────────────────────────────────────────────────────
function SecuritySection({ user }) {
  const providers = user?.app_metadata?.providers || [user?.app_metadata?.provider].filter(Boolean) || []
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("en-IN") : "—"
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-IN") : "—"

  return (
    <div>
      <SectionTitle icon="🛡️" title="Security" subtitle="Your authentication and session information" />

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Connected Sign-In Providers</FieldLabel>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:6 }}>
          {providers.length > 0 ? providers.map(p => (
            <div key={p} style={{
              display:"flex", alignItems:"center", gap:7, padding:"7px 14px",
              background:T.green2, borderRadius:20, border:`1px solid ${T.green}22`,
            }}>
              <span style={{ fontSize:14 }}>
                {p === "google" ? "🔵" : p === "github" ? "⚫" : p === "email" ? "📧" : "🔑"}
              </span>
              <span style={{ fontSize:12, fontWeight:700, color:T.green }}>
                {p.charAt(0).toUpperCase() + p.slice(1)} — Connected
              </span>
            </div>
          )) : (
            <div style={{ fontSize:12, color:T.ink4 }}>No providers detected.</div>
          )}
        </div>
      </Card>

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div>
            <FieldLabel>Account Created</FieldLabel>
            <div style={{ fontSize:13, color:T.ink, fontWeight:600 }}>{createdAt}</div>
          </div>
          <div>
            <FieldLabel>Last Sign In</FieldLabel>
            <div style={{ fontSize:13, color:T.ink, fontWeight:600 }}>{lastSignIn}</div>
          </div>
          <div>
            <FieldLabel>User ID</FieldLabel>
            <div style={{
              fontSize:11, color:T.ink4,
              fontFamily:"'DM Mono',monospace",
              wordBreak:"break-all",
            }}>{user?.id || "—"}</div>
          </div>
        </div>
      </Card>

      <InfoBox
        icon="🔐"
        text="Capabilio uses Supabase Auth for secure authentication. Password management, 2FA setup, and session revocation are available through your sign-in provider (e.g., Google Account settings)."
      />
    </div>
  )
}

// ── Section: Data & Export ────────────────────────────────────────────────────
function DataSection({ userData, user }) {
  const [exportLoading, setExportLoading] = useState(false)
  const [exportDone, setExportDone] = useState(false)

  const handleExport = async () => {
    setExportLoading(true)
    try {
      // Fetch full profile + arena history
      const uid = user?.id
      const [{ data: profile }, { data: history }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase.from("arena_history").select("*").eq("user_id", uid).order("completed_at", { ascending: false }),
      ])

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile,
        arenaHistory: history || [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type:"application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `capabilio-profile-${profile?.username || uid?.slice(0,8)}-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportDone(true)
      setTimeout(() => setExportDone(false), 3000)
    } catch (e) {
      console.error("Export failed:", e)
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="📦" title="Data & Export" subtitle="Download your Capabilio data" />

      <Card style={{ marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:6 }}>Export Profile Data</div>
        <div style={{ fontSize:12, color:T.ink3, marginBottom:16, lineHeight:1.6 }}>
          Download a complete JSON export of your Capabilio profile including: personal information, ELO history, Arena submission history, skill graph, certifications, and all settings.
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button
            onClick={handleExport}
            disabled={exportLoading}
            style={{
              padding:"10px 20px", background:exportDone ? T.green : T.indigo,
              border:"none", borderRadius:9, color:"#fff", fontSize:13,
              fontWeight:700, cursor: exportLoading ? "wait" : "pointer",
              display:"flex", alignItems:"center", gap:7, transition:"background 0.25s",
            }}
          >
            {exportLoading ? "⏳ Preparing…" : exportDone ? "✓ Downloaded" : "⬇️ Download JSON"}
          </button>
        </div>
      </Card>

      <InfoBox
        icon="🇮🇳"
        text="Under the Digital Personal Data Protection Act (DPDPA) 2023, you have the right to access and receive a copy of your personal data. Your export includes all data Capabilio holds about your account."
        color={T.green}
        bg={T.green2}
      />

      <Card style={{ marginTop:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:6 }}>Data Retention</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6, fontSize:12, color:T.ink3 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span>Profile data</span><span style={{ fontWeight:700, color:T.ink2 }}>Kept while account is active</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span>Arena history</span><span style={{ fontWeight:700, color:T.ink2 }}>Kept indefinitely</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span>Deleted account data</span><span style={{ fontWeight:700, color:T.ink2 }}>Purged within 30 days</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ── Section: Help & Support ───────────────────────────────────────────────────
function HelpSection() {
  const links = [
    { icon:"📖", label:"Documentation",       desc:"Guides for all Capabilio features",     href:"https://docs.capabilio.com",   color:T.blue },
    { icon:"💬", label:"Community Forum",     desc:"Questions, tips, and announcements",    href:"https://community.capabilio.com", color:T.indigo },
    { icon:"🐛", label:"Report a Bug",        desc:"Found something broken? Tell us",       href:"mailto:support@capabilio.com",  color:T.amber },
    { icon:"✉️", label:"Contact Support",     desc:"Get help from the Capabilio team",      href:"mailto:support@capabilio.com",  color:T.green },
    { icon:"🗺️", label:"Feature Roadmap",     desc:"See what's coming next on Capabilio",   href:"https://capabilio.com/roadmap", color:T.ink2 },
  ]

  return (
    <div>
      <SectionTitle icon="💬" title="Help & Support" subtitle="Resources, documentation, and ways to reach us" />

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {links.map(link => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration:"none" }}
          >
            <div style={{
              display:"flex", alignItems:"center", gap:14,
              padding:"14px 16px", background:"#fff",
              border:`1px solid ${T.border}`, borderRadius:12,
              boxShadow:T.shadow, cursor:"pointer", transition:"box-shadow 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = T.shadow2}
              onMouseLeave={e => e.currentTarget.style.boxShadow = T.shadow}
            >
              <div style={{
                width:38, height:38, borderRadius:10, display:"flex",
                alignItems:"center", justifyContent:"center",
                background:`${link.color}15`, fontSize:18,
              }}>{link.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{link.label}</div>
                <div style={{ fontSize:11, color:T.ink3 }}>{link.desc}</div>
              </div>
              <span style={{ fontSize:14, color:T.ink4 }}>→</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

// ── Section: About ────────────────────────────────────────────────────────────
function AboutSection() {
  return (
    <div>
      <SectionTitle icon="ℹ️" title="About Capabilio" subtitle="Version and platform information" />

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            { label:"Platform",          value:"Capabilio AI — Professional Growth Platform" },
            { label:"Version",           value:"2.1.0" },
            { label:"Build",             value:"React 18 + Vite 5 (Vercel)" },
            { label:"Auth Provider",     value:"Supabase Auth" },
            { label:"Arena Engine",      value:"Domain Challenge Slots v2 — 24hr cooldown" },
            { label:"ELO System",        value:"Custom ELO with decay (−5/day after 14-day grace)" },
          ].map(row => (
            <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${T.border}`, paddingBottom:10, gap:12 }}>
              <span style={{ fontSize:12, color:T.ink4, fontWeight:600 }}>{row.label}</span>
              <span style={{ fontSize:12, color:T.ink2, fontWeight:700, textAlign:"right" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <InfoBox
        icon="🇮🇳"
        text="Capabilio is built in India, for India. Our mission is to make talent provable, not just claimable — turning skills into verifiable, ranked credentials through real performance data."
        color={T.indigo}
        bg={T.indigo3}
      />
    </div>
  )
}

// ── Section: Policies ─────────────────────────────────────────────────────────
function PoliciesSection() {
  const docs = [
    { icon:"🔒", label:"Privacy Policy",       href:"https://capabilio.com/privacy",  updated:"Jan 2025" },
    { icon:"📜", label:"Terms of Service",     href:"https://capabilio.com/terms",    updated:"Jan 2025" },
    { icon:"🍪", label:"Cookie Policy",        href:"https://capabilio.com/cookies",  updated:"Jan 2025" },
    { icon:"🇮🇳", label:"DPDPA Compliance",    href:"https://capabilio.com/dpdpa",    updated:"Jan 2025" },
    { icon:"💳", label:"Refund Policy",        href:"https://capabilio.com/refunds",  updated:"Jan 2025" },
  ]

  return (
    <div>
      <SectionTitle icon="📜" title="Policies" subtitle="Legal documents governing your use of Capabilio" />

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {docs.map(doc => (
          <a
            key={doc.label}
            href={doc.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration:"none" }}
          >
            <div style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"13px 16px", background:"#fff",
              border:`1px solid ${T.border}`, borderRadius:11, boxShadow:T.shadow,
            }}>
              <span style={{ fontSize:20 }}>{doc.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{doc.label}</div>
                <div style={{ fontSize:11, color:T.ink4 }}>Last updated: {doc.updated}</div>
              </div>
              <span style={{ fontSize:11, color:T.indigo, fontWeight:700 }}>View →</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

// ── Section: Advanced ─────────────────────────────────────────────────────────
function AdvancedSection({ user, userData, save, setUserData }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return
    setDeleteLoading(true)
    try {
      // Mark account for deletion — actual purge handled server-side
      await supabase.from("profiles").update({
        deletion_requested_at: new Date().toISOString(),
        deletion_reason: "user_requested",
      }).eq("id", user?.id)
      await supabase.auth.signOut()
    } catch (e) {
      console.error("Delete request failed:", e)
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="⚙️" title="Advanced" subtitle="Power-user settings and danger zone" />

      <Card style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.ink2, marginBottom:10 }}>Debug Information</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {[
            { label:"User ID",       value: user?.id?.slice(0,16) + "…" || "—" },
            { label:"Path",          value: userData?.path || "—" },
            { label:"Plan",          value: userData?.subscription || "free" },
            { label:"ELO",           value: userData?.eloRating || 500 },
            { label:"Arena Streak",  value: userData?.arenaStreak || 0 },
          ].map(row => (
            <div key={row.label} style={{
              display:"flex", justifyContent:"space-between",
              fontSize:12, padding:"5px 0",
              borderBottom:`1px solid ${T.border}`,
            }}>
              <span style={{ color:T.ink4, fontWeight:600 }}>{row.label}</span>
              <span style={{ color:T.ink2, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{String(row.value)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Danger Zone */}
      <div style={{
        border:`2px solid ${T.red}33`, borderRadius:14,
        padding:"18px 20px", background:T.red2,
      }}>
        <div style={{ fontSize:12, fontWeight:800, color:T.red, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>
          ⚠️ Danger Zone
        </div>

        {!confirmDelete ? (
          <>
            <div style={{ fontSize:12, color:T.ink2, marginBottom:14, lineHeight:1.6 }}>
              Permanently delete your Capabilio account. This removes your profile, ELO history, Arena submissions, and all data. <strong>This cannot be undone.</strong>
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                padding:"9px 18px", background:"transparent",
                border:`1.5px solid ${T.red}`, borderRadius:8,
                color:T.red, fontSize:12, fontWeight:700, cursor:"pointer",
              }}
            >
              Delete Account…
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize:12, color:T.red, marginBottom:12, fontWeight:700 }}>
              Type DELETE to confirm permanent account deletion:
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder='Type "DELETE"'
                style={{
                  flex:1, padding:"9px 12px", borderRadius:8,
                  border:`1.5px solid ${T.red}`, fontSize:13,
                  color:T.ink, fontFamily:"'DM Mono',monospace",
                  outline:"none", background:"#fff",
                }}
              />
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "DELETE" || deleteLoading}
                style={{
                  padding:"9px 16px", background: deleteInput === "DELETE" ? T.red : T.cream3,
                  border:"none", borderRadius:8, color: deleteInput === "DELETE" ? "#fff" : T.ink4,
                  fontSize:12, fontWeight:700,
                  cursor: deleteInput === "DELETE" ? "pointer" : "not-allowed",
                }}
              >
                {deleteLoading ? "Deleting…" : "Confirm Delete"}
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteInput("") }}
                style={{
                  padding:"9px 16px", background:T.cream3,
                  border:"none", borderRadius:8, color:T.ink2,
                  fontSize:12, fontWeight:700, cursor:"pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Right Contextual Panel ────────────────────────────────────────────────────
function ContextPanel({ userData, activeSection, eloRating }) {
  const { score, items } = calcCompleteness(userData)
  // eloRating is passed down from SettingsPanel's own (now path-aware)
  // computation rather than recomputed here from userData.eloRating alone —
  // this panel used to independently derive its tier from the legacy field
  // even for professional users, so its "Your Standing" tier LABEL could
  // disagree with the identity-card badge above even after that badge was
  // fixed to use the real Professional ELO track. Falls back to the legacy
  // field only if the prop wasn't passed (defensive, shouldn't happen).
  const tier = getTier(eloRating ?? userData?.eloRating ?? 500)
  const pm = PATH_META[userData?.path] || PATH_META.student

  const tips = {
    profile: [
      "A professional headline increases profile views by 3×",
      "Profiles with photos get 21× more attention than those without",
      "Keep your bio under 200 characters for LinkedIn compatibility",
    ],
    account: [
      "Set a memorable username — it's your permanent Portfolio URL",
      "Your portfolio link works without logging in",
    ],
    path: [
      "Your job keyword directly seeds your Arena domain",
      "Accurate experience level improves Launchpad job relevance",
    ],
    privacy: [
      "Enabling search visibility can bring recruiter attention",
      "You can always re-enable hidden pages without losing data",
    ],
    proof: [
      "LinkedIn + GitHub boosts your trust score significantly",
      "Recruiters check certifications — keep them visible",
    ],
    employment: [
      "UAN verification adds an EPFO-verified badge to your profile",
      "Employment history from EPFO is trusted by recruiters as ground truth",
      "Mismatched details are automatically corrected to match EPFO records",
    ],
    arena: [
      "Consistent daily practice prevents ELO decay",
      "Hard/Expert challenges give the highest ELO gains",
    ],
    notifications: [
      "Mission ready alerts help you never waste a slot",
      "Weekly digest keeps you informed without noise",
    ],
    ai: [
      "Achievement-focused tone works best for job applications",
      "Auto-summary keeps your Portfolio always up-to-date",
    ],
    default: [
      "Your profile strength directly impacts Launchpad matches",
      "Complete your profile to unlock all Capabilio features",
    ],
  }

  const activeTips = tips[activeSection] || tips.default

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Profile Completeness */}
      <Card>
        <div style={{ fontSize:11, fontWeight:800, color:T.indigo, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>
          Profile Strength
        </div>
        <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
          <span style={{ fontSize:28, fontWeight:900, color: score >= 80 ? T.green : score >= 50 ? T.amber : T.red }}>{score}</span>
          <span style={{ fontSize:14, color:T.ink4 }}>/100</span>
          <span style={{
            marginLeft:"auto", fontSize:11, fontWeight:700,
            color: score >= 80 ? T.green : score >= 50 ? T.amber : T.red,
          }}>
            {score >= 80 ? "Strong ✓" : score >= 50 ? "Good" : "Needs work"}
          </span>
        </div>
        <div style={{
          height:6, background:T.cream3, borderRadius:99, overflow:"hidden", marginBottom:12,
        }}>
          <div style={{
            height:"100%", borderRadius:99, transition:"width 0.5s ease",
            width:`${score}%`,
            background: score >= 80 ? T.green : score >= 50 ? T.amber : T.red,
          }}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {items.map(item => (
            <div key={item.label} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ fontSize:11, color: item.done ? T.green : T.ink4 }}>
                {item.done ? "✓" : "○"}
              </span>
              <span style={{ fontSize:11, color: item.done ? T.ink2 : T.ink4, fontWeight: item.done ? 600 : 400 }}>
                {item.label}
              </span>
              <span style={{ marginLeft:"auto", fontSize:10, color:T.ink4 }}>+{item.pts}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Standing — Arena/ELO tier is a student-path concept (chess-style
          rating tied to daily missions). Professional/authority users don't
          engage with Arena the same way, so showing a bare "ELO 800" number
          here with no translation doesn't mean anything to them (Career OS
          Non-negotiable Rule #1: no bare score number ships without a
          plain-language translation). Student path keeps the full tier +
          number; professional/authority get the tier label only, framed as a
          plain sentence, no raw figure. */}
      <Card>
        <div style={{ fontSize:11, fontWeight:800, color:T.ink3, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>
          Your Standing
        </div>
        {(userData?.path === "professional" || userData?.path === "authority") ? (
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <span style={{ fontSize:24 }}>{tier.icon}</span>
            <div style={{ fontSize:12, color:T.ink3, lineHeight:1.5 }}>
              Your Arena skill tier is <strong style={{ color:tier.color }}>{tier.label}</strong>{userData?.eloRating ? " — recorded from your completed challenges." : ", based on your baseline assessment."}
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <span style={{ fontSize:24 }}>{tier.icon}</span>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:tier.color }}>{tier.label}</div>
              <div style={{ fontSize:11, color:T.ink4 }}>ELO {userData?.eloRating || 500}</div>
            </div>
          </div>
        )}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:6, padding:"5px 10px",
          background:pm.bg, borderRadius:20,
        }}>
          <span style={{ fontSize:12 }}>{pm.icon}</span>
          <span style={{ fontSize:11, fontWeight:700, color:pm.color }}>{pm.label} Path</span>
        </div>
      </Card>

      {/* Contextual Tips */}
      <Card>
        <div style={{ fontSize:11, fontWeight:800, color:T.amber, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>
          💡 Tips
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {activeTips.map((tip, i) => (
            <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
              <span style={{ fontSize:11, color:T.amber, marginTop:1 }}>▸</span>
              <span style={{ fontSize:11, color:T.ink3, lineHeight:1.55 }}>{tip}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Main SettingsPanel export ─────────────────────────────────────────────────
export default function SettingsPanel({ userData, user, save, setUserData, path }) {
  const [activeSection, setActiveSection] = useState("profile")
  const mainRef = useRef(null)

  const go = (id) => {
    setActiveSection(id)
    if (mainRef.current) mainRef.current.scrollTop = 0
  }

  const allSections = NAV_GROUPS.flatMap(g => g.items)
  const current = allSections.find(s => s.id === activeSection)

  // Mirrors App.jsx's top-nav ELO badge fix (2026-07-26) exactly — same
  // source, same "professional path uses the real Professional Skill Rating
  // track, everyone else keeps the legacy Arena/profile-completeness field"
  // logic, so this identity-card badge can never disagree with the number
  // right above it in the nav. This badge was previously reading
  // userData.eloRating unconditionally for every path, which is how it ended
  // up showing a different number ("1050") than the nav pill ("987") for the
  // same professional user at the same moment — two real ELO systems
  // (profiles.elo_rating vs professional_elo_state), read inconsistently.
  const effectivePath = path || userData?.path
  const [proElo, setProElo] = useState(null)
  useEffect(() => {
    if (effectivePath !== "professional") { setProElo(null); return }
    let cancelled = false
    import("../lib/api").then(({ professionalEloApi }) => {
      professionalEloApi.status()
        .then(res => { if (!cancelled) setProElo(res) })
        .catch(() => { if (!cancelled) setProElo(null) })
    })
    return () => { cancelled = true }
  }, [effectivePath])
  const eloRating = (effectivePath === "professional" && proElo != null)
    ? (proElo.overall_elo ?? proElo.elo ?? userData?.eloRating ?? 500)
    : (userData?.eloRating || 500)
  const tier = getTier(eloRating)
  const pm = PATH_META[path || userData?.path] || PATH_META.student
  const plan = getPlan(userData)
  const avatarUrl = userData?.avatarUrl || userData?.avatar_url
  const displayName = userData?.displayName || userData?.display_name || user?.user_metadata?.full_name || "User"
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()

  // Render active section
  const renderSection = () => {
    const props = { userData, user, save, setUserData, path: path || userData?.path }
    switch(activeSection) {
      case "profile":       return <ProfileSection {...props} />
      case "account":       return <AccountSection {...props} />
      case "path":          return <PathSection {...props} />
      case "arena":         return <ArenaSection {...props} />
      case "privacy":       return <PrivacySection {...props} />
      case "proof":         return <ProofSection {...props} />
      case "employment":    return <UANVerificationSection {...props} />
      case "notifications": return <NotificationsSection {...props} />
      case "appearance":    return <AppearanceSection {...props} />
      case "ai":            return <AISection {...props} />
      case "data":          return <DataSection {...props} />
      case "security":      return <SecuritySection {...props} />
      case "help":          return <HelpSection />
      case "about":         return <AboutSection />
      case "policies":      return <PoliciesSection />
      case "advanced":      return <AdvancedSection {...props} />
      default:              return <ProfileSection {...props} />
    }
  }

  return (
    <div style={{ animation:"fadeUp .3s ease both" }}>

      {/* ── Top Profile Identity Card ─────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #1A1714 0%, #1A1714 60%, #312e81 100%)",
        borderRadius: 16, padding:"22px 24px", marginBottom:20,
        boxShadow:"0 4px 20px rgba(0,0,0,0.15)", color:"#fff",
        display:"flex", alignItems:"center", gap:18, flexWrap:"wrap",
      }}>
        {/* Avatar */}
        <div style={{
          width:60, height:60, borderRadius:"50%",
          background: avatarUrl ? "transparent" : `linear-gradient(135deg,${pm.color},${T.indigo})`,
          border:"3px solid rgba(255,255,255,0.2)",
          overflow:"hidden", flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <span style={{ fontSize:22, fontWeight:900, color:"#fff" }}>{initials}</span>
          }
        </div>

        {/* Name + badges */}
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:6 }}>
            <h2 style={{ fontSize:18, fontWeight:900, color:"#fff", margin:0 }}>{displayName}</h2>
            {eloRating >= 800 && (
              <span style={{
                fontSize:10, fontWeight:800, padding:"3px 8px",
                background:"rgba(255,255,255,0.15)", borderRadius:99, letterSpacing:0.5,
              }}>✓ Verified</span>
            )}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <span style={{
              fontSize:11, fontWeight:700, padding:"3px 10px",
              background:pm.bg, color:pm.color, borderRadius:20,
            }}>{pm.icon} {pm.label}</span>
            <span style={{
              fontSize:11, fontWeight:700, padding:"3px 10px",
              background:`${tier.color}22`, color:tier.color, borderRadius:20,
            }}>{tier.icon} {tier.label} · {eloRating} ELO</span>
            <span style={{
              fontSize:11, fontWeight:700, padding:"3px 10px",
              background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.75)", borderRadius:20,
            }}>🎟️ {plan.label}</span>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {userData?.username && (
            <a
              href={`/portfolio/${userData.username}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding:"8px 14px", background:"rgba(255,255,255,0.12)",
                border:"1px solid rgba(255,255,255,0.2)", borderRadius:9,
                color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none",
                display:"flex", alignItems:"center", gap:5,
              }}
            >
              🔗 Portfolio
            </a>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(
              userData?.username ? `${window.location.origin}/portfolio/${userData.username}` : window.location.href
            )}
            style={{
              padding:"8px 14px", background:"rgba(255,255,255,0.12)",
              border:"1px solid rgba(255,255,255,0.2)", borderRadius:9,
              color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer",
            }}
          >
            📋 Copy Link
          </button>
        </div>
      </div>

      {/* ── Three-column layout ───────────────────────────────────────── */}
      <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>

        {/* Left Nav Rail */}
        <div style={{
          width:210, flexShrink:0,
          background:"#fff", border:`1px solid ${T.border}`,
          borderRadius:14, boxShadow:T.shadow, overflow:"hidden",
          position:"sticky", top:16,
        }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <div style={{
                fontSize:9, fontWeight:800, color:T.ink4,
                textTransform:"uppercase", letterSpacing:2,
                padding:"12px 14px 5px",
              }}>
                {group.label}
              </div>
              {group.items.map(item => {
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    style={{
                      width:"100%", display:"flex", alignItems:"center", gap:9,
                      padding:"9px 14px", border:"none", cursor:"pointer",
                      background: isActive ? T.indigo3 : "transparent",
                      borderLeft: isActive ? `3px solid ${T.indigo}` : "3px solid transparent",
                      transition:"all 0.15s", textAlign:"left",
                    }}
                  >
                    <span style={{ fontSize:14 }}>{item.icon}</span>
                    <span style={{
                      fontSize:12, fontWeight: isActive ? 700 : 500,
                      color: isActive ? T.indigo : T.ink2,
                    }}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Main Content Panel */}
        <div
          ref={mainRef}
          style={{
            flex:1, minWidth:0,
            background:"#fff", border:`1px solid ${T.border}`,
            borderRadius:14, boxShadow:T.shadow, padding:"22px 24px",
            maxHeight:"72vh", overflowY:"auto",
          }}
        >
          {/* Breadcrumb */}
          <div style={{
            fontSize:11, color:T.ink4, marginBottom:18,
            display:"flex", alignItems:"center", gap:6,
          }}>
            <span>Settings</span>
            <span>›</span>
            <span style={{ color:T.indigo, fontWeight:700 }}>{current?.label}</span>
          </div>

          {renderSection()}
        </div>

        {/* Right Contextual Panel */}
        <div style={{ width:240, flexShrink:0, position:"sticky", top:16 }}>
          <ContextPanel userData={userData} activeSection={activeSection} eloRating={eloRating} />
        </div>

      </div>
    </div>
  )
}
