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
import { orgApi, collegeApi, collegeChatApi, nexusApi, jobsApi } from "../lib/api"
import { verificationLevel, VERIFICATION_LEVEL_LABEL } from "../lib/orgVerification"
import InstitutionPublicProfile from "./InstitutionPublicProfile"

// ─── Design Tokens — Futuristic dark theme (matches institution-path-prototype) ─
const T = {
  // accent palette
  sky:      "#74a8ff",
  skyL:     "rgba(116,168,255,0.10)",
  skyB:     "rgba(116,168,255,0.20)",
  skyDark:  "#5b93ff",
  green:    "#4fd4a3",
  greenL:   "rgba(79,212,163,0.10)",
  amber:    "#dc8b18",
  amberL:   "rgba(220,139,24,0.10)",
  gold:     "#f6c453",   // bright highlight gold
  goldL:    "rgba(246,196,83,0.10)",
  red:      "#ff8177",
  redL:     "rgba(255,129,119,0.10)",
  purple:   "#ab93ff",
  purpleL:  "rgba(171,147,255,0.10)",
  blue:     "#74a8ff",
  blueL:    "rgba(116,168,255,0.10)",
  teal:     "#34d4bf",
  tealL:    "rgba(52,212,191,0.10)",
  cyan:     "#54d9e0",
  pink:     "#ff8db1",
  // dark surface tokens
  ink:      "#f7f2ea",
  ink2:     "rgba(247,242,234,0.85)",
  ink3:     "rgba(247,242,234,0.68)",
  ink4:     "rgba(247,242,234,0.44)",
  ink5:     "rgba(247,242,234,0.30)",
  bg:       "#0b0a08",
  surface:  "rgba(255,255,255,0.048)",
  surface2: "rgba(255,255,255,0.028)",
  border:   "rgba(255,255,255,0.10)",
  borderM:  "rgba(255,255,255,0.16)",
  // sidebar tokens
  navBg:    "#0b0a08",
  navBg2:   "rgba(255,255,255,0.028)",
  navText:  "rgba(247,242,234,0.68)",
  navTextH: "#f7f2ea",
  navTextA: "#23170a",   // dark text on gold gradient
  navActiveGlow: "rgba(220,139,24,0.22)",
  navW:     246,
  tabH:     60,
  radius:   20,
  radiusS:  13,
  shadow:   "0 24px 70px rgba(0,0,0,0.48)",
  shadowM:  "0 14px 40px rgba(0,0,0,0.38)",
  shadowGlow: (color) => `0 0 0 1px ${color}28, 0 4px 20px ${color}22`,
}
const GRAD_ACTIVE = "linear-gradient(135deg,#dc8b18,#f6c453)"  // amber→gold nav active gradient
const FONT = "DM Sans, system-ui, sans-serif"
const FONT_SERIF = "'Instrument Serif', Georgia, serif"
const MONO = "'DM Mono', 'Fira Mono', monospace"

// ─── Nav structure (grouped) ──────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Visibility",
    items: [
      { id: "home",      label: "Institution home", badge: "Live", mobileShow: true },
      { id: "pubprofile",label: "Public Profile", mobileShow: true  },
      { id: "community", label: "Community",        mobileShow: false  },
      // 2026-07-31: "Posts" (id events) removed from nav — merged into
      // Community's Posts tab. PAGE_MAP still maps "events" so any stale
      // deep-link/state falls through gracefully rather than blank-screening.
      { id: "outcomes",  label: "Search presence",  mobileShow: false },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "people",    label: "Students",         badgeProp: "pendingMembers", mobileShow: true },
      { id: "tasks",     label: "Workflow queue",   badgeProp: "activeTasks",    mobileShow: true },
      { id: "cohorts",   label: "At-risk cases",    mobileShow: false },
      // 2026-08-02: was mislabeled "Document approvals" (stale copy-paste,
      // same class of bug as the "settings" mislabel above) — this id has
      // always opened the Groups page; label now says what it is.
      { id: "groups",    label: "Groups", mobileShow: false },
      // 2026-08-02: multi-campus support. Not added to ROLE_PAGES.placement/
      // recruiter/staff, so it's admin-only automatically (those roles use
      // an explicit allow-list that doesn't include "university").
      { id: "university", label: "Campuses", mobileShow: false },
      // 2026-08-03: colleges post job openings here (shared `jobs` table —
      // students already see these on Launchpad, no new student feed
      // needed). Also opens for org_type='company' accounts, showing their
      // own account-level postings instead — same nav slot, JobsPage
      // branches on isCollege internally.
      { id: "jobs", label: "Jobs", mobileShow: false },
      { id: "companies", label: "Recruiter NDAs",   mobileShow: false },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "intelligence", label: "Placement cell", mobileShow: true  },
      // 2026-08-01: dedicated sidebar entry for the coordination layer's
      // Team Chat — it was only reachable as a tab inside Placement cell
      // and users couldn't find it. Same IntelligencePage, opened directly
      // on the messages tab.
      { id: "chat",         label: "Team Chat",      mobileShow: true  },
      // 2026-08-01: was mislabeled "Student Readiness" — it always opened
      // the Settings page (id "settings"); label now says what it is.
      { id: "settings",     label: "Settings", mobileShow: false },
    ],
  },
]
// flat list for mobile tab bar
const NAV = NAV_GROUPS.flatMap(g => g.items)

// ─── Roles (UI-level scoping; enforce with Supabase RLS later) ─────────────────
const ROLES = [
  { id: "admin",     label: "Institution Admin", workspace: "Institution OS" },
  { id: "placement", label: "Placement Cell",    workspace: "Placement Cell" },
  { id: "recruiter", label: "Recruiter",         workspace: "Recruiter Portal" },
  // Not shown in the View-as dropdown (dropdownHidden) — assigned
  // automatically to channel-tier staff logins, never picked manually.
  { id: "staff",     label: "Staff",             workspace: "Staff Workspace", dropdownHidden: true },
]
// page ids each role may see (null ⇒ everything)
// 2026-07-31: removed "faculty"/Professor per explicit user direction — this
// org path has no professor role/workspace.
const ROLE_PAGES = {
  admin:     null,
  placement: ["home", "pubprofile", "people", "companies", "intelligence", "chat", "outcomes", "settings"],
  recruiter: ["pubprofile", "companies", "outcomes"],
  // Channel-tier staff logins (professor/dept_head/mentor created via Staff
  // Access): roster + team chat only — no placement cell, no recruiter data.
  staff:     ["home", "people", "chat"],
}
function roleAllows(role, pageId) {
  const allow = ROLE_PAGES[role]
  return !allow || allow.includes(pageId)
}
function navGroupsForRole(role) {
  const allow = ROLE_PAGES[role]
  if (!allow) return NAV_GROUPS
  return NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(it => allow.includes(it.id)) }))
    .filter(g => g.items.length)
}

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

// ─── Canonical College Path roster (institution_students, added 2026-07-31) ──
// Additive, parallel to the org_members hooks above — does not replace them.
// Resolves the signed-in user's institution via /college/institutions/mine
// (works whether they're the legacy admin_user_id or an institution_staff
// row), then pulls the live, auto-linked, FK-correct roster + stats. If the
// user has no institutions/institution_staff row at all (common today, since
// most colleges haven't been created under the new schema yet), this hook
// resolves to `institution: null` and every consumer below renders nothing
// extra — the existing org_members-driven UI is completely unaffected.
// 2026-08-02 (multi-campus support): remembers which campus institution a
// university-group admin last chose, per-browser, so a page refresh doesn't
// silently drop them back onto the auto-picked campus. Purely a UI
// convenience — every backend route still independently re-verifies the
// caller's institution_staff role on whatever id is requested, so a stale/
// tampered value here can never grant access to a campus the user isn't
// actually staff on.
const CAMPUS_PREF_KEY = "capabilio_active_campus_id"

function useCanonicalRoster() {
  const [institution, setInstitution] = useState(null)
  const [role, setRole]               = useState(null)
  const [students, setStudents]       = useState([])
  const [stats, setStats]             = useState(null)
  const [branches, setBranches]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [notLinked, setNotLinked]     = useState(false)
  const [filters, setFilters]         = useState({
    department: "", batch: "", status: "", search: "",
    role: "", minTasks: "", interviewStatus: "", shared: "", active: "",
  })
  // Multi-campus (2026-08-02): which campus is currently active, plus the
  // caller's university group (if any) and its member campuses — loaded
  // independently of the main roster so a 404 here (the common case: no
  // group exists yet) never blocks the rest of the dashboard.
  const [activeInstitutionId, setActiveInstitutionId] = useState(() => {
    try { return localStorage.getItem(CAMPUS_PREF_KEY) || null } catch (_) { return null }
  })
  const [universityGroup, setUniversityGroup] = useState(null)
  const [campuses, setCampuses]               = useState([])

  const loadRoster = useCallback(async (institutionId, activeFilters) => {
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(activeFilters || {}).filter(([, v]) => v)
      )
      const [studentsRes, statsRes, branchesRes] = await Promise.all([
        collegeApi.getStudents(institutionId, { pageSize: 100, ...cleanFilters }),
        collegeApi.getStats(institutionId),
        collegeApi.getBranches(institutionId),
      ])
      setStudents(studentsRes?.students || [])
      setStats(statsRes || null)
      setBranches(branchesRes?.branches || [])
    } catch (_) {
      // Roster fetch failing shouldn't take down the rest of the dashboard.
    }
  }, [])

  const loadUniversityGroup = useCallback(async () => {
    try {
      const res = await collegeApi.getMyUniversityGroup()
      setUniversityGroup(res?.group || null)
      setCampuses(res?.campuses || [])
    } catch (_) {
      // No group yet is the default/common case, not an error worth surfacing.
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // If the stored campus preference turns out to be one the caller no
      // longer has access to, myInstitution() 403s and we fall through to
      // the auto-picked institution below rather than getting stuck.
      let res
      try {
        res = await collegeApi.myInstitution(activeInstitutionId || undefined)
      } catch (err) {
        if (activeInstitutionId && err.status === 403) {
          res = await collegeApi.myInstitution()
        } else {
          throw err
        }
      }
      setInstitution(res.institution)
      setRole(res.role)
      setNotLinked(false)
      setActiveInstitutionId(res.institution.id)
      try { localStorage.setItem(CAMPUS_PREF_KEY, res.institution.id) } catch (_) {}
      await Promise.all([loadRoster(res.institution.id, filters), loadUniversityGroup()])
    } catch (err) {
      if (err.status === 404) setNotLinked(true)
      setInstitution(null)
    } finally {
      setLoading(false)
    }
  }, [loadRoster, loadUniversityGroup, filters, activeInstitutionId])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => {
    if (institution?.id) return loadRoster(institution.id, filters)
    return load()
  }, [institution, filters, loadRoster, load])

  // Switches the whole dashboard onto a different campus institution. The
  // backend re-checks institution_staff for this exact id independently, so
  // this can only ever succeed for a campus the user is actually staff on.
  const switchInstitution = useCallback((institutionId) => {
    if (!institutionId || institutionId === institution?.id) return
    setActiveInstitutionId(institutionId)
  }, [institution?.id])

  return {
    institution, role, students, stats, branches, loading, notLinked, filters, setFilters, reload,
    universityGroup, campuses, switchInstitution, reloadUniversityGroup: loadUniversityGroup,
  }
}

function useOrgPosts(orgId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from("org_events").select("*").eq("org_id", orgId).eq("type", "post")
      .order("created_at", { ascending: false })
    setLoading(false)
    if (err) setError(err.message)
    else { setData(rows || []); setError(null) }
  }, [orgId])
  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

async function uploadOrgPhoto(userId, file, type) {
  const ext = file.name.split(".").pop()
  const path = `${userId}/${type}_${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage.from("org-media").upload(path, file, { upsert: true })
  if (upErr) throw new Error(upErr.message)
  const { data: { publicUrl } } = supabase.storage.from("org-media").getPublicUrl(path)
  return publicUrl
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
      background: T.surface,
      border: `1px solid ${T.border}`,
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
    primary:  { background: GRAD_ACTIVE, color: "#23170a", fontWeight: 800, boxShadow: "0 8px 20px rgba(220,139,24,0.30)", fontFamily: MONO, letterSpacing: "0.04em", fontSize: 12 },
    outline:  { background: "rgba(255,255,255,0.04)", border: `1px solid ${T.borderM}`, color: T.ink2 },
    ghost:    { background: "transparent", border: "none", color: T.ink3 },
    danger:   { background: T.red,   color: "#fff" },
    success:  { background: T.green, color: "#fff", fontWeight: 700 },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
    >{children}</button>
  )
}

function SectionHead({ title, action, actionLabel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: 9.5, fontWeight: 800, color: T.ink4, textTransform: "uppercase", letterSpacing: "0.16em", whiteSpace: "nowrap", fontFamily: MONO }}>{title}</h3>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${T.borderM},transparent)`, minWidth: 20 }} />
      {action && <Btn variant="ghost" onClick={action} style={{ padding: "4px 10px", fontSize: 11, color: T.gold, flexShrink: 0 }}>{actionLabel || "See all →"}</Btn>}
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
        border: `3px solid rgba(246,196,83,0.15)`, borderTopColor: T.gold,
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
        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "rgba(255,255,255,0.05)", boxSizing: "border-box" }}
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
        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "rgba(255,255,255,0.05)" }}
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
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
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
      display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
      background: `${info.color}0f`, borderRadius: T.radius, marginBottom: 18,
      border: `1px solid ${info.color}28`,
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
  const c = color || T.gold
  const trendColor = trendDir === "up" ? T.green : trendDir === "down" ? T.red : T.amber
  const trendIcon  = trendDir === "up" ? "▲" : trendDir === "down" ? "▼" : "→"
  return (
    <div onClick={onClick} style={{
      flex: 1, minWidth: 130, padding: "18px 20px",
      background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))",
      borderRadius: T.radius,
      border: `1px solid ${T.border}`,
      boxShadow: "0 4px 24px rgba(0,0,0,0.32)",
      cursor: onClick ? "pointer" : "default",
      transition: "transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.18s, border-color 0.18s",
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(246,196,83,0.32)"; e.currentTarget.style.boxShadow = "0 14px 40px rgba(0,0,0,0.48)" }}}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.32)" }}}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 800, color: c, lineHeight: 1, letterSpacing: "-0.04em" }}>{value}</div>
        {trend && (
          <span style={{ fontSize: 10, fontWeight: 700, color: trendColor, background: `${trendColor}10`, padding: "2px 7px", borderRadius: 6, marginTop: 4, fontFamily: MONO }}>
            {trendIcon} {trend}
          </span>
        )}
      </div>
      <div style={{ fontSize: 9, fontWeight: 800, color: T.ink5, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 4, fontFamily: MONO }}>{label}</div>
      {context && <div style={{ fontSize: 11, color: T.ink4, lineHeight: 1.4, fontWeight: 500 }}>{context}</div>}
      {action && <div style={{ fontSize: 11, color: c, fontWeight: 700, marginTop: 6, fontFamily: MONO }}>{action}</div>}
    </div>
  )
}

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────
function InstSidebar({ active, onNav, userData, members, tasks, role = "admin", onRole, roleLocked = false }) {
  const orgName = userData?.org_name || "Your Institution"
  const groups = navGroupsForRole(role)
  const roleMeta = ROLES.find(r => r.id === role) || ROLES[0]
  const pendingCount = (members || []).filter(m => m.status === "pending" || m.status === "invited").length
  const taskCount    = (tasks   || []).filter(t => t.status === "active").length

  const getBadge = (item) => {
    if (item.badge) return item.badge
    if (item.badgeProp === "pendingMembers" && pendingCount > 0) return pendingCount
    if (item.badgeProp === "activeTasks"    && taskCount    > 0) return taskCount
    return null
  }

  return (
    <div style={{
      width: T.navW, minWidth: T.navW, height: "100%",
      background: "linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.008))",
      display: "flex", flexDirection: "column", flexShrink: 0,
      borderRight: `1px solid ${T.border}`,
    }}>
      {/* Header card */}
      <div style={{ padding: "18px 16px 14px" }}>
        {/* Org dot + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12, flexShrink: 0,
            background: GRAD_ACTIVE, border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: "#23170a",
            boxShadow: "0 0 22px rgba(246,196,83,0.25), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}>
            {orgName.charAt(0)}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orgName}</div>
            <div style={{ fontSize: 10, color: T.ink5, fontFamily: MONO, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>
              {roleMeta.workspace}
            </div>
          </div>
        </div>
        {/* Role switcher — hidden entirely for real staff logins, whose role
            is locked server-side (Staff Access, 2026-08-01): a placement-team
            login must not be able to "view as" Institution Admin. */}
        {!roleLocked && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: T.ink5, fontFamily: MONO, marginBottom: 5 }}>View as</div>
            <select value={role} onChange={e => onRole && onRole(e.target.value)}
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${T.borderM}`, borderRadius: 10, color: T.ink, fontSize: 12, fontWeight: 700, fontFamily: FONT, padding: "8px 10px", cursor: "pointer" }}>
              {ROLES.filter(r => !r.dropdownHidden).map(r => <option key={r.id} value={r.id} style={{ background: T.bg }}>{r.label}</option>)}
            </select>
          </div>
        )}
        {/* Divider */}
        <div style={{ height: 1, background: T.border }} />
      </div>

      {/* Grouped nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px" }}>
        <style>{`
          .inst-nav-link { transition: background 0.12s, color 0.12s; }
          .inst-nav-link:hover:not(.inst-nav-link-active) { background: rgba(255,255,255,0.055) !important; color: #f7f2ea !important; }
        `}</style>
        {groups.map(group => (
          <div key={group.label} style={{ marginTop: 20 }}>
            <div style={{ padding: "0 8px 6px", fontSize: 9.5, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: T.ink5, fontFamily: MONO }}>
              {group.label}
            </div>
            {group.items.map(item => {
              const isActive = active === item.id
              const badge = getBadge(item)
              return (
                <button key={item.id} onClick={() => onNav(item.id)}
                  className={`inst-nav-link${isActive ? " inst-nav-link-active" : ""}`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 10, width: "100%", padding: "9px 10px", borderRadius: 12,
                    border: `1px solid transparent`,
                    background: isActive ? GRAD_ACTIVE : "transparent",
                    color: isActive ? T.navTextA : T.navText,
                    boxShadow: isActive ? "0 4px 18px rgba(220,139,24,0.22)" : "none",
                    fontSize: 12.5, fontWeight: isActive ? 800 : 600, fontFamily: FONT,
                    cursor: "pointer", marginBottom: 2, textAlign: "left",
                  }}
                >
                  <span>{item.label}</span>
                  {badge && (
                    <span style={{
                      padding: "2px 7px", fontSize: 8.5, fontWeight: 900,
                      borderRadius: 999,
                      color: isActive ? "#23170a" : "#fff",
                      background: isActive ? "rgba(0,0,0,0.22)" : T.red,
                      fontFamily: MONO,
                      boxShadow: isActive ? "none" : `0 2px 6px rgba(255,129,119,0.4)`,
                    }}>{badge}</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 16px 18px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: GRAD_ACTIVE, border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 900, color: "#23170a",
          }}>
            {(userData?.name || "A").charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{userData?.name || "Admin"}</div>
            <div style={{ fontSize: 10, color: T.ink5, fontFamily: MONO }}>Institution Admin</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab bar (mobile) ─────────────────────────────────────────────────────────
function InstTabBar({ active, onNav }) {
  return (
    <div style={{ height: T.tabH, borderTop: `1px solid ${T.border}`, background: "rgba(11,10,8,0.94)", backdropFilter: "blur(16px)", display: "flex", flexShrink: 0 }}>
      {NAV.filter(n => n.mobileShow).map(item => {
        const isActive = active === item.id
        return (
          <button key={item.id} onClick={() => onNav(item.id)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 2, border: "none",
            background: "transparent", cursor: "pointer",
            color: isActive ? T.gold : T.ink4, fontFamily: FONT,
            borderTop: isActive ? `2px solid ${T.gold}` : "2px solid transparent",
          }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, fontFamily: MONO }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function PageHeader({ title, sub, actions }) {
  const parts = String(title).split(" ")
  const last = parts.pop()
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
      <div>
        <h2 style={{
          margin: 0, fontFamily: FONT_SERIF,
          fontStyle: "italic", fontWeight: 400, fontSize: 40,
          letterSpacing: "-0.02em", lineHeight: 0.94, color: T.ink,
        }}>
          {parts.length > 0 && <>{parts.join(" ")} </>}
          <em style={{ color: T.gold, fontStyle: "inherit" }}>{last}</em>
        </h2>
        {sub && <p style={{ margin: "9px 0 0", fontSize: 13, color: T.ink3, letterSpacing: "0.01em", lineHeight: 1.65 }}>{sub}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{actions}</div>}
    </div>
  )
}

function PageShell({ children }) {
  return (
    <div style={{
      flex: 1, minHeight: 0, overflowY: "auto", padding: "28px 26px 40px", fontFamily: FONT,
      background: "radial-gradient(ellipse at top left,rgba(246,196,83,0.12),transparent 32%),radial-gradient(ellipse at top right,rgba(116,168,255,0.08),transparent 30%),linear-gradient(180deg,#120f0b,#0b0a08 60%)",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid ${T.gold}; outline-offset: 2px; border-radius: 4px; }
        input:focus, select:focus, textarea:focus { border-color: ${T.gold} !important; box-shadow: 0 0 0 3px rgba(246,196,83,0.14); }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.11); border-radius: 6px; }
        input, select, textarea { color-scheme: dark; }
      `}</style>
      {/* grid overlay */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.014) 1px,transparent 1px)",
        backgroundSize: "52px 52px",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}

function tabStyle(active) {
  return {
    padding: "8px 14px", borderRadius: 999,
    border: `1px solid ${active ? "transparent" : T.border}`,
    background: active ? GRAD_ACTIVE : "rgba(255,255,255,0.03)",
    color: active ? "#23170a" : T.ink4,
    fontSize: 11.5, fontWeight: active ? 700 : 700, cursor: "pointer", fontFamily: FONT,
    whiteSpace: "nowrap", letterSpacing: "0.01em",
    boxShadow: active ? "0 3px 12px rgba(220,139,24,0.22)" : "none",
    transition: "background 0.15s, color 0.15s",
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

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — HOME
// ═══════════════════════════════════════════════════════════════════════════════
function HomePage({ userData, user, onNav, members, tasks, events, auditLogs, auditLoading, onVerify, canonical }) {
  const isCollege = (userData?.org_type || "college") !== "company"
  const firstName = (userData?.name || user?.displayName || "Admin").split(" ")[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const vLevel = verificationLevel(userData)

  // Prefer the canonical institution_students-backed numbers when this
  // institution has been migrated onto the new schema (see
  // useCanonicalRoster above) — this is what actually fixes the "everything
  // shows 0" dashboard state for colleges whose students are auto-linking
  // via self-link/roster-import into institution_students but never wrote
  // to the legacy org_members table the KPIs below used to read exclusively.
  // Falls back to the original org_members computation untouched when there
  // is no canonical institution for this admin yet.
  const hasCanonical = !!canonical?.institution

  // Computed KPIs from real data (legacy org_members — unchanged fallback)
  const orgActiveMembers  = members.filter(m => m.status === "active").length
  const orgPendingMembers = members.filter(m => m.status === "pending" || m.status === "invited").length
  const orgPlacedMembers  = members.filter(m => m.placement_company).length
  const activeTasks     = tasks.filter(t => t.status === "active").length
  const urgentTasks     = tasks.filter(t => t.priority === "urgent" && t.status === "active").length
  const upcomingEvents  = events.filter(e => e.status === "upcoming").length

  const canonActiveMembers  = (canonical?.students || []).filter(s => s.status === "active" || s.status === "placed" || s.status === "transitioning" || s.status === "professional_active").length
  const canonPendingMembers = (canonical?.students || []).filter(s => s.status === "pending_admin").length
  const canonPlacedMembers  = canonical?.stats?.confirmedPlacements ?? 0

  const activeMembers  = hasCanonical ? canonActiveMembers  : orgActiveMembers
  const pendingMembers = hasCanonical ? canonPendingMembers : orgPendingMembers
  const placedMembers  = hasCanonical ? canonPlacedMembers  : orgPlacedMembers

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

  // At-risk cohort members
  const atRisk = members.filter(m => m.status === "active" && (m.elo_rating < 900 || m.placement_company === null))
    .slice(0, 5)

  // Recent queue tasks
  const queueItems = tasks.filter(t => t.status === "active").slice(0, 5)

  // Placement rate
  const placementRate = activeMembers > 0 ? Math.round((placedMembers / activeMembers) * 100) : 0

  return (
    <PageShell>
      {vLevel < 4 && <VerificationBanner level={vLevel} onVerify={onVerify} />}

      {/* dash-hero */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, color: T.ink5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>
          {greeting}, {firstName}
        </p>
        <h1 style={{
          margin: 0, fontFamily: FONT_SERIF,
          fontStyle: "italic", fontWeight: 400, fontSize: 40,
          letterSpacing: "-0.02em", lineHeight: 0.94, color: T.ink,
        }}>
          What needs <em style={{ color: T.gold, fontStyle: "inherit" }}>attention</em> now?
        </h1>
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: isCollege ? "Active Members" : "Active Devs", value: activeMembers || 0, sub: `${pendingMembers} pending`, nav: "people" },
          { label: "Workflow Queue",  value: activeTasks || 0,  sub: `${urgentTasks} urgent`, nav: "tasks" },
          { label: "Placements",      value: placedMembers || 0, sub: `${placementRate}% rate`, nav: "intelligence" },
          { label: "Events",          value: upcomingEvents || 0, sub: "upcoming",               nav: "events" },
        ].map((k, i) => (
          <div key={i} onClick={() => onNav(k.nav)} style={{
            background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))",
            border: `1px solid ${T.border}`,
            borderRadius: 18, padding: 16, minHeight: 110, cursor: "pointer",
            transition: "border-color .15s, transform .15s, box-shadow .15s",
            boxShadow: "0 4px 20px rgba(0,0,0,0.28)",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(246,196,83,0.32)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 40px rgba(0,0,0,0.48)" }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.28)" }}
          >
            <div style={{ fontSize: 11, color: T.ink4, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 700 }}>{k.label}</div>
            <div style={{ margin: "10px 0 4px", fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", color: T.ink, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: T.ink4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 2-column content grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* LEFT col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Workflow queue */}
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 22, background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))", padding: 18, boxShadow: "0 4px 20px rgba(0,0,0,0.28)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>Workflow queue</span>
              <button onClick={() => onNav("tasks")} style={{ fontSize: 11, fontWeight: 700, color: T.gold, background: "none", border: "none", cursor: "pointer", padding: 0 }}>View all →</button>
            </div>
            {queueItems.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: T.ink4, fontSize: 12 }}>No active tasks</div>
            ) : queueItems.map((t, i) => (
              <div key={t.id} style={{
                display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 12,
                padding: "14px 0", borderTop: i === 0 ? "none" : `1px solid ${T.border}`, alignItems: "center",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center",
                  background: "rgba(255,255,255,.05)", border: `1px solid ${T.border}`,
                  fontWeight: 900, fontSize: 14, color: T.gold,
                }}>
                  {(t.title || "T").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{t.title || "Untitled Task"}</div>
                  <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>
                    {t.assigned_to || "Unassigned"} · {timeSince(t.created_at)}
                  </div>
                </div>
                <span style={{
                  borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 800,
                  ...(t.priority === "urgent"
                    ? { color: T.red,   background: "rgba(255,129,119,.10)" }
                    : t.priority === "high"
                    ? { color: T.gold,  background: "rgba(246,196,83,0.13)" }
                    : { color: T.green, background: "rgba(79,212,163,.08)" }
                  ),
                }}>
                  {t.priority || "normal"}
                </span>
              </div>
            ))}
          </div>

          {/* Performance strip */}
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 22, background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))", padding: 18, boxShadow: "0 4px 20px rgba(0,0,0,0.28)" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 14 }}>Performance</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Submit rate", value: (() => { const tot = tasks.reduce((s,t)=>s+(t.total_assigned||0),0); const sub = tasks.reduce((s,t)=>s+(t.submission_count||0),0); return tot > 0 ? Math.round(sub/tot*100)+"%" : "—" })() },
                { label: "Placement rate", value: placementRate + "%" },
                { label: "Pending reviews", value: pendingMembers },
                { label: "Urgent tasks",   value: urgentTasks },
              ].map((s, i) => (
                <div key={i} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 12, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 10, color: T.ink4, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: T.ink, letterSpacing: "-0.03em", marginTop: 6 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* At-risk cases */}
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 22, background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))", padding: 18, boxShadow: "0 4px 20px rgba(0,0,0,0.28)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>At-risk cases</span>
              <button onClick={() => onNav("cohorts")} style={{ fontSize: 11, fontWeight: 700, color: T.gold, background: "none", border: "none", cursor: "pointer", padding: 0 }}>View all →</button>
            </div>
            {atRisk.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: T.ink4, fontSize: 12 }}>No at-risk members flagged</div>
            ) : atRisk.map((m, i) => (
              <div key={m.id} style={{
                display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 12,
                padding: "14px 0", borderTop: i === 0 ? "none" : `1px solid ${T.border}`, alignItems: "center",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center",
                  background: "rgba(255,255,255,.05)", border: `1px solid ${T.border}`,
                  fontWeight: 900, fontSize: 14, color: T.red,
                }}>
                  {(m.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{m.name || "Unknown"}</div>
                  <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>
                    ELO {m.elo_rating || "—"} · {m.placement_company ? "Placed" : "Unplaced"}
                  </div>
                </div>
                <span style={{
                  borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 800,
                  color: T.red, background: "rgba(255,129,119,.10)",
                }}>
                  at risk
                </span>
              </div>
            ))}
          </div>

          {/* Activity feed */}
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 22, background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))", padding: 18, boxShadow: "0 4px 20px rgba(0,0,0,0.28)" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 14 }}>Recent activity</div>
            {auditLoading ? <Spinner /> : auditItems.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: T.ink4, fontSize: 12 }}>No activity yet</div>
            ) : auditItems.map((a, i) => (
              <div key={a.id} style={{
                display: "grid", gridTemplateColumns: "40px 1fr", gap: 12,
                padding: "14px 0", borderTop: i === 0 ? "none" : `1px solid ${T.border}`, alignItems: "flex-start",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center",
                  background: "rgba(255,255,255,.05)", border: `1px solid ${T.border}`,
                  fontSize: 16,
                }}>
                  {actionIcon(a.action_code)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.35 }}>{a.action}</div>
                  <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>{a.actor_name} · {timeSince(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════
// ─── NAAC/NBA Report — real Criterion 5.2 style report (2026-08-02) ────────
// Placed % is read from institution_placements where confirmation_status=
// 'tpo_confirmed' (the same gate every other placement stat in this app
// uses — never raw offer acceptance). Higher-studies/entrepreneurship % come
// from institution_student_outcomes, recorded per-student from the roster's
// 🎓 button (see CanonicalRosterPanel). If those are empty, the report is
// honest about it rather than hiding the columns — a TPO needs to see "0
// recorded" to know they still need to fill it in, not think it's missing.
function NaacReportPanel({ canonical }) {
  const institutionId = canonical?.institution?.id
  const [batchFilter, setBatchFilter] = useState("")
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [trend, setTrend] = useState(null)

  const load = useCallback(async () => {
    if (!institutionId) { setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const res = await collegeApi.getNaacReport(institutionId, batchFilter.trim() || undefined)
      setReport(res)
    } catch (e) { setError(e.message || "Could not load report") }
    setLoading(false)
  }, [institutionId, batchFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!institutionId) return
    collegeApi.getPlacementTrend(institutionId).then(res => setTrend(res?.years || [])).catch(() => setTrend([]))
  }, [institutionId])

  function exportCsv() {
    if (!report?.batches?.length) return
    const rows = [["Batch", "Department", "Total", "Placed", "Placed %", "Higher Studies", "Higher Studies %", "Entrepreneurship", "Entrepreneurship %", "Avg CTC (LPA)"]]
    for (const b of report.batches) {
      for (const d of b.departments) {
        rows.push([b.batch, d.department, d.total, d.placed, d.placedPct, d.higherStudies, d.higherStudiesPct, d.entrepreneurship, d.entrepreneurshipPct, d.avgCtcLpa ?? ""])
      }
      rows.push([b.batch, "TOTAL", b.totals.total, b.totals.placed, b.totals.placedPct, b.totals.higherStudies, b.totals.higherStudiesPct, b.totals.entrepreneurship, b.totals.entrepreneurshipPct, ""])
    }
    const csv = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `naac-report-${canonical?.institution?.name || "institution"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!institutionId) return <EmptyState icon="🎓" title="Not connected yet" sub="The NAAC report appears here once your institution is linked." />

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
        <SectionHead title="NAAC / NBA Report" />
        <div style={{ display: "flex", gap: 8 }}>
          <input value={batchFilter} onChange={e => setBatchFilter(e.target.value)} placeholder="Filter one batch (optional)"
            style={{ padding: "6px 10px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 11.5, width: 170 }} />
          <Btn variant="outline" onClick={exportCsv} disabled={!report?.batches?.length} style={{ fontSize: 11, padding: "5px 10px" }}>Export CSV</Btn>
          <Btn variant="outline" onClick={() => window.print()} disabled={!report?.batches?.length} style={{ fontSize: 11, padding: "5px 10px" }}>Print / Save PDF</Btn>
        </div>
      </div>
      <div style={{ fontSize: 11, color: T.ink4, marginBottom: 14 }}>
        Placement % is TPO-confirmed only. Higher-studies and entrepreneurship % come from outcomes recorded on the roster (🎓 button per student) — record those before generating your submission copy.
      </div>

      {trend && trend.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 10 }}>Placements over time (year confirmed)</div>
          {(() => {
            const maxP = Math.max(...trend.map(y => y.placements), 1)
            return (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110 }}>
                {trend.map(y => (
                  <div key={y.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 11, color: T.ink4 }}>{y.placements}</div>
                    <div style={{ width: "70%", height: `${Math.max((y.placements / maxP) * 80, 4)}px`, background: T.sky, borderRadius: "4px 4px 0 0" }} />
                    <div style={{ fontSize: 10.5, color: T.ink3, fontWeight: 600 }}>{y.year}</div>
                    {y.avgCtcLpa != null && <div style={{ fontSize: 9.5, color: T.ink4 }}>{y.avgCtcLpa} LPA avg</div>}
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {loading ? <Spinner /> : error ? (
        <div style={{ padding: 16, color: T.red, fontSize: 13 }}>{error}</div>
      ) : !report?.batches?.length ? (
        <EmptyState icon="🎓" title="No students to report on yet" sub="Once students are linked to this institution, batch/department breakdowns appear here." />
      ) : (
        report.batches.map(b => (
          <div key={b.batch} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Batch: {b.batch}</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: T.ink4, borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ padding: "6px 8px" }}>Department</th>
                    <th style={{ padding: "6px 8px" }}>Total</th>
                    <th style={{ padding: "6px 8px" }}>Placed</th>
                    <th style={{ padding: "6px 8px" }}>Higher Studies</th>
                    <th style={{ padding: "6px 8px" }}>Entrepreneurship</th>
                    <th style={{ padding: "6px 8px" }}>Avg CTC (LPA)</th>
                  </tr>
                </thead>
                <tbody>
                  {b.departments.map(d => (
                    <tr key={d.department} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "8px" }}>{d.department}</td>
                      <td style={{ padding: "8px" }}>{d.total}</td>
                      <td style={{ padding: "8px", color: T.green, fontWeight: 600 }}>{d.placed} ({d.placedPct}%)</td>
                      <td style={{ padding: "8px", color: T.sky, fontWeight: 600 }}>{d.higherStudies} ({d.higherStudiesPct}%)</td>
                      <td style={{ padding: "8px", color: T.amber, fontWeight: 600 }}>{d.entrepreneurship} ({d.entrepreneurshipPct}%)</td>
                      <td style={{ padding: "8px" }}>{d.avgCtcLpa ?? "—"}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}>
                    <td style={{ padding: "8px" }}>Total</td>
                    <td style={{ padding: "8px" }}>{b.totals.total}</td>
                    <td style={{ padding: "8px", color: T.green }}>{b.totals.placed} ({b.totals.placedPct}%)</td>
                    <td style={{ padding: "8px", color: T.sky }}>{b.totals.higherStudies} ({b.totals.higherStudiesPct}%)</td>
                    <td style={{ padding: "8px", color: T.amber }}>{b.totals.entrepreneurship} ({b.totals.entrepreneurshipPct}%)</td>
                    <td style={{ padding: "8px" }}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </Card>
  )
}

// ─── Recruiter Activity — placement-cell visibility, added 2026-07-31 ──────
// Read-only view of recruiter_invites + interviews for this institution
// (Phase 3). A recruiter-facing search/invite UI is a separate surface
// (Recruiter portal) not built in this pass — this panel is specifically
// the "placement cell visibility" half of the requirement: what recruiters
// are doing with this college's shared students, visible to admins here.
function RecruiterActivityPanel({ canonical, openThreadFor }) {
  const [invites, setInvites]   = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading]   = useState(true)
  const [actionId, setActionId] = useState(null)
  const institutionId = canonical?.institution?.id

  const load = useCallback(async () => {
    if (!institutionId) { setLoading(false); return }
    setLoading(true)
    try {
      const [inv, iv] = await Promise.all([
        collegeApi.listRecruiterInvites(institutionId),
        collegeApi.listInterviews(institutionId),
      ])
      setInvites(inv?.invites || [])
      setInterviews(iv?.interviews || [])
    } catch (_) { /* panel degrades to empty state */ }
    setLoading(false)
  }, [institutionId])

  useEffect(() => { load() }, [load])

  async function setInterviewStatus(id, status) {
    setActionId(id + status)
    try { await collegeApi.updateInterviewStatus(institutionId, id, status); await load() }
    catch (_) {}
    setActionId(null)
  }

  if (!institutionId) {
    return <EmptyState icon="🤝" title="Not connected yet" sub="Recruiter activity appears here once your institution is linked (visit Institution Home first)." />
  }
  if (loading) return <Spinner />

  // Recruiter partnership CRM — a lightweight aggregation over data this
  // panel already fetched (invites + interviews), grouped by recruiter_id.
  // No new table: it's a read-side view, not a persisted CRM record.
  const recruiterActivity = {}
  for (const inv of invites) {
    recruiterActivity[inv.recruiter_id] = recruiterActivity[inv.recruiter_id] || { invites: 0, interviews: 0 }
    recruiterActivity[inv.recruiter_id].invites += 1
  }
  for (const iv of interviews) {
    recruiterActivity[iv.recruiter_id] = recruiterActivity[iv.recruiter_id] || { invites: 0, interviews: 0 }
    recruiterActivity[iv.recruiter_id].interviews += 1
  }
  const recruiterRows = Object.entries(recruiterActivity)

  return (
    <>
      {recruiterRows.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <SectionHead title="Recruiter Partners" />
          {recruiterRows.map(([recruiterId, activity], i) => (
            <div key={recruiterId} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < recruiterRows.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontSize: 12.5, color: T.ink2 }}>Recruiter {recruiterId.slice(0, 8)}…</div>
              <div style={{ fontSize: 11, color: T.ink4 }}>{activity.invites} invite{activity.invites !== 1 ? "s" : ""} · {activity.interviews} interview{activity.interviews !== 1 ? "s" : ""}</div>
            </div>
          ))}
        </Card>
      )}
      <Card style={{ marginBottom: 16 }}>
        <SectionHead title="Recruiter Invites" />
        {invites.length === 0 ? (
          <EmptyState icon="📨" title="No recruiter invites yet" sub="When a recruiter invites one of your shared students, it appears here." />
        ) : (
          invites.slice(0, 20).map((inv, i) => (
            <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < invites.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontSize: 12.5, color: T.ink2 }}>
                {inv.type.replace(/_/g, " ")} invite · student {inv.student_id.slice(0, 8)}…
              </div>
              <div style={{ fontSize: 11, color: T.ink4 }}>{inv.status} · {timeSince(inv.created_at)}</div>
            </div>
          ))
        )}
      </Card>
      <Card>
        <SectionHead title="Interview Pipeline" />
        {interviews.length === 0 ? (
          <EmptyState icon="🎤" title="No interviews yet" sub="Recruiter-requested interviews with your students appear here." />
        ) : (
          interviews.slice(0, 20).map((iv, i) => (
            <div key={iv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < interviews.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontSize: 12.5, color: T.ink2 }}>
                {iv.mode} interview · student {iv.student_id.slice(0, 8)}… · <span style={{ fontWeight: 600 }}>{iv.status.replace(/_/g, " ")}</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {["scheduled", "consent_pending", "live"].includes(iv.status) && (
                  <>
                    <Btn variant="outline" onClick={() => setInterviewStatus(iv.id, "completed")} disabled={actionId === iv.id + "completed"}
                      style={{ fontSize: 11, padding: "4px 9px" }}>Mark completed</Btn>
                    <Btn variant="outline" onClick={() => setInterviewStatus(iv.id, "cancelled")} disabled={actionId === iv.id + "cancelled"}
                      style={{ fontSize: 11, padding: "4px 9px", borderColor: T.red, color: T.red }}>Cancel</Btn>
                  </>
                )}
                {openThreadFor && (
                  <button
                    onClick={() => openThreadFor({ contextType: "interview", contextId: iv.id, recruiterId: iv.recruiter_id, subject: `Interview · student ${iv.student_id.slice(0, 8)}…` })}
                    title="Message about this interview"
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, opacity: 0.75 }}>
                    💬
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  )
}

// ─── In-house chat — added 2026-07-31 (Phase 5) ─────────────────────────────
// Internal admin<->placement-cell threads today (no recruiter picker UI yet
// — recruiter-initiated threads land here too once a recruiter starts one
// via the API, this view doesn't distinguish, it just shows whatever
// threads the caller can see for this institution). Messages are
// append-only — the thread itself is the audit trail requested for this
// feature, nothing here supports editing or deleting a sent message.
// Small icon + label for a thread's bound operational context — the
// coordination layer's core visual: every thread that isn't a plain
// channel says what it's actually about.
const CONTEXT_META = {
  student:               { icon: "🎓", label: "Student" },
  recruiter_relationship:{ icon: "🤝", label: "Recruiter" },
  interview:              { icon: "🎤", label: "Interview" },
  offer:                  { icon: "✉️", label: "Offer" },
  approval:               { icon: "📋", label: "Approval" },
  drive:                  { icon: "🏢", label: "Drive" },
}
const STATUS_TAG_COLOR = {
  pending: "#F5A623", reviewed: "#5B8DEF", approved: "#2ECC71",
  shortlisted: "#9B59B6", selected: "#16A085", offer_sent: "#16A085",
}
function ContextBadge({ contextType, statusTag }) {
  if (!contextType && !statusTag) return null
  const meta = CONTEXT_META[contextType]
  return (
    <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
      {meta && (
        <span style={{ fontSize: 9.5, fontWeight: 700, color: T.ink4, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "1px 6px" }}>
          {meta.icon} {meta.label}
        </span>
      )}
      {statusTag && (
        <span style={{ fontSize: 9.5, fontWeight: 700, color: STATUS_TAG_COLOR[statusTag] || T.ink4, background: `${STATUS_TAG_COLOR[statusTag] || T.ink4}18`, borderRadius: 6, padding: "1px 6px", textTransform: "capitalize" }}>
          {statusTag.replace(/_/g, " ")}
        </span>
      )}
    </div>
  )
}

function ChatPanel({ canonical, user, pendingThreadContext, onClearPendingThreadContext }) {
  const institutionId = canonical?.institution?.id
  const [threads, setThreads] = useState([])
  const [activeThreadId, setActiveThreadId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState("")
  const [newSubject, setNewSubject] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [taskDraftFor, setTaskDraftFor] = useState(null)     // message id currently showing the "-> Task" mini-form
  const [approvalDraftFor, setApprovalDraftFor] = useState(null)
  const [actionDraftText, setActionDraftText] = useState("")
  const [actionBusy, setActionBusy] = useState(false)

  // ── @-mentions (2026-08-02) ──────────────────────────────────────────────
  // Roster of everyone the admin can message: themselves plus any staff
  // logins they've created (placement_officer/professor/dept_head/mentor via
  // Staff Access). Names/roles only — the roster endpoint is intentionally
  // separate from the college_admin-only staff-management one.
  const [roster, setRoster] = useState([])
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")

  useEffect(() => {
    if (!institutionId) return
    collegeApi.getStaffRoster(institutionId).then(res => setRoster(res?.roster || [])).catch(() => {})
  }, [institutionId])

  const ROLE_LABEL = { college_admin: "Admin", placement_officer: "Placement", dept_head: "Dept Head", professor: "Professor", mentor: "Mentor" }
  const mentionMatches = mentionOpen
    ? roster.filter(r => r.user_id !== user?.id && r.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : []

  function onDraftChange(value) {
    setDraft(value)
    const m = value.match(/@([A-Za-z0-9._' -]{0,30})$/)
    if (m) { setMentionOpen(true); setMentionQuery(m[1]) }
    else setMentionOpen(false)
  }

  function pickMention(name) {
    setDraft(d => d.replace(/@([A-Za-z0-9._' -]{0,30})$/, `@${name} `))
    setMentionOpen(false)
  }

  // A pending context from a "Message about this" launcher pre-fills the
  // subject once, so the composer already reflects what this thread is
  // about before the first message is even sent.
  useEffect(() => {
    if (pendingThreadContext && !activeThreadId) setNewSubject(pendingThreadContext.subject || "")
  }, [pendingThreadContext, activeThreadId])

  const loadThreads = useCallback(async () => {
    if (!institutionId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await collegeChatApi.listThreads(institutionId)
      setThreads(res?.threads || [])
    } catch (_) { /* degrade to empty state */ }
    setLoading(false)
  }, [institutionId])

  useEffect(() => { loadThreads() }, [loadThreads])

  const loadMessages = useCallback(async (threadId) => {
    try {
      const res = await collegeChatApi.getMessages(threadId)
      setMessages(res?.messages || [])
    } catch (_) { setMessages([]) }
  }, [])

  useEffect(() => { if (activeThreadId) loadMessages(activeThreadId) }, [activeThreadId, loadMessages])

  async function startThread() {
    if (!draft.trim()) return
    setSending(true)
    try {
      const ctx = pendingThreadContext || {}
      const res = await collegeChatApi.startThread(institutionId, draft.trim(), {
        subject: newSubject.trim() || null,
        contextType: ctx.contextType || null, contextId: ctx.contextId || null,
        recruiterId: ctx.recruiterId || null,
      })
      setDraft(""); setNewSubject("")
      onClearPendingThreadContext && onClearPendingThreadContext()
      await loadThreads()
      if (res?.thread?.id) setActiveThreadId(res.thread.id)
    } catch (_) {}
    setSending(false)
  }

  async function sendMessage() {
    if (!draft.trim() || !activeThreadId) return
    setSending(true)
    try {
      await collegeChatApi.sendMessage(activeThreadId, draft.trim())
      setDraft("")
      await loadMessages(activeThreadId)
      await loadThreads()
    } catch (_) {}
    setSending(false)
  }

  async function submitTask(messageId) {
    if (!actionDraftText.trim()) return
    setActionBusy(true)
    try {
      await collegeChatApi.createFollowup(activeThreadId, { title: actionDraftText.trim(), messageId })
      setTaskDraftFor(null); setActionDraftText("")
    } catch (_) {}
    setActionBusy(false)
  }
  async function submitApproval(messageId) {
    if (!actionDraftText.trim()) return
    setActionBusy(true)
    try {
      const thread = threads.find((t) => t.id === activeThreadId)
      await collegeChatApi.createApproval(activeThreadId, {
        subject: actionDraftText.trim(), messageId, contextType: thread?.context_type || null, contextId: thread?.context_id || null,
      })
      setApprovalDraftFor(null); setActionDraftText("")
    } catch (_) {}
    setActionBusy(false)
  }

  if (!institutionId) {
    return <EmptyState icon="💬" title="Not connected yet" sub="Team chat appears here once your institution is linked (visit Institution Home first)." />
  }
  if (loading) return <Spinner />

  // Channels (internal, recruiter_id null — visible to all active staff:
  // admin, placement officers, professors, dept heads, mentors) vs recruiter
  // conversations (placement-cell <-> a specific recruiter). Grouped
  // separately in the sidebar, Teams-style, since they have different
  // audiences — see collegeChat.js's tiered access for the enforcement side.
  const channels          = threads.filter(t => !t.recruiter_id)
  const recruiterThreads  = threads.filter(t => t.recruiter_id)
  const activeThread      = threads.find((t) => t.id === activeThreadId)

  return (
    <div style={{ display: "flex", gap: 14, minHeight: 420 }}>
      <div style={{ width: 240, flexShrink: 0 }}>
        <Card style={{ marginBottom: 12 }}>
          <SectionHead title="Channels" />
          <div style={{ fontSize: 10.5, color: T.ink4, marginTop: -8, marginBottom: 10 }}>Your college's own in-house team chat</div>
          {channels.length === 0 ? (
            <div style={{ fontSize: 11.5, color: T.ink4, marginBottom: 8 }}>No channels yet — start one below (e.g. "General", "Placement Team").</div>
          ) : (
            channels.map((t) => (
              <div key={t.id} onClick={() => setActiveThreadId(t.id)}
                style={{
                  padding: "8px 6px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
                  background: activeThreadId === t.id ? T.skyL : "transparent",
                }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>
                  # {t.subject || "General"}
                </div>
                <ContextBadge contextType={t.context_type} statusTag={t.status_tag} />
                <div style={{ fontSize: 10.5, color: T.ink4, marginTop: 2 }}>{timeSince(t.last_message_at)}</div>
              </div>
            ))
          )}
          {recruiterThreads.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: T.ink4, margin: "12px 0 6px" }}>Recruiter conversations</div>
              {recruiterThreads.map((t) => (
                <div key={t.id} onClick={() => setActiveThreadId(t.id)}
                  style={{
                    padding: "8px 6px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
                    background: activeThreadId === t.id ? T.skyL : "transparent",
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>
                    {t.subject || "Recruiter thread"}
                  </div>
                  <ContextBadge contextType={t.context_type} statusTag={t.status_tag} />
                  <div style={{ fontSize: 10.5, color: T.ink4, marginTop: 2 }}>{timeSince(t.last_message_at)}</div>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!activeThreadId && pendingThreadContext && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.skyL, border: `1px solid ${T.sky}30`, borderRadius: 8, padding: "7px 11px", marginBottom: 8, fontSize: 11.5, color: T.ink2 }}>
            <span>{CONTEXT_META[pendingThreadContext.contextType]?.icon} Starting a thread about: <b>{pendingThreadContext.subject}</b></span>
            <button onClick={() => { onClearPendingThreadContext && onClearPendingThreadContext(); setNewSubject("") }}
              style={{ border: "none", background: "transparent", color: T.ink4, cursor: "pointer", fontSize: 13 }}>✕</button>
          </div>
        )}
        {activeThread && <ContextBadge contextType={activeThread.context_type} statusTag={activeThread.status_tag} />}
        <Card style={{ flex: 1, display: "flex", flexDirection: "column", marginBottom: 10, minHeight: 300, marginTop: activeThread ? 8 : 0 }}>
          {!activeThreadId ? (
            <EmptyState icon="✍️" title="Start a channel" sub="In-house team chat for your college's own staff — professors, placement officers, admins. Works only inside your institution's Capabilio workspace." />
          ) : (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.map((m) => (
                <div key={m.id} style={{ alignSelf: m.sender_id === user?.id ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                  <div style={{
                    background: m.sender_id === user?.id ? T.skyL : T.surface2,
                    border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 11px",
                  }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.gold }}>
                        {m.sender_id === user?.id ? "You" : (m.sender_name || "Someone")}
                      </span>
                      {m.sender_role && <span style={{ fontSize: 9.5, color: T.ink4 }}>{ROLE_LABEL[m.sender_role] || m.sender_role}</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: T.ink }}>{m.body}</div>
                    <div style={{ fontSize: 10, color: T.ink4, marginTop: 3 }}>{timeSince(m.created_at)}</div>
                  </div>
                  {/* Coordination layer: convert a message into a real tracked
                      task or approval — not just a UI label. */}
                  <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 10 }}>
                    <button onClick={() => { setTaskDraftFor(m.id); setApprovalDraftFor(null); setActionDraftText("") }}
                      style={{ border: "none", background: "transparent", color: T.ink4, cursor: "pointer" }}>→ Task</button>
                    <button onClick={() => { setApprovalDraftFor(m.id); setTaskDraftFor(null); setActionDraftText("") }}
                      style={{ border: "none", background: "transparent", color: T.ink4, cursor: "pointer" }}>→ Approval</button>
                  </div>
                  {taskDraftFor === m.id && (
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <input value={actionDraftText} onChange={(e) => setActionDraftText(e.target.value)} placeholder="Task title…"
                        style={{ flex: 1, padding: "5px 8px", borderRadius: 6, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 11 }} />
                      <Btn onClick={() => submitTask(m.id)} disabled={actionBusy || !actionDraftText.trim()} style={{ fontSize: 10.5, padding: "4px 8px" }}>Add</Btn>
                    </div>
                  )}
                  {approvalDraftFor === m.id && (
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <input value={actionDraftText} onChange={(e) => setActionDraftText(e.target.value)} placeholder="What needs approval?"
                        style={{ flex: 1, padding: "5px 8px", borderRadius: 6, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 11 }} />
                      <Btn onClick={() => submitApproval(m.id)} disabled={actionBusy || !actionDraftText.trim()} style={{ fontSize: 10.5, padding: "4px 8px" }}>Request</Btn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
        {!activeThreadId && (
          <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Channel name (e.g. General, Placement Team)"
            style={{ padding: "8px 12px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12, marginBottom: 8 }} />
        )}
        <div style={{ position: "relative" }}>
          {mentionOpen && mentionMatches.length > 0 && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 30,
              minWidth: 220, background: "#161310", border: `1px solid ${T.border}`,
              borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.45)", overflow: "hidden", padding: "4px 0",
            }}>
              {mentionMatches.map(r => (
                <button key={r.user_id} onClick={() => pickMention(r.name)} style={{
                  display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, textAlign: "left",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span style={{ fontSize: 12.5, color: T.ink }}>{r.name}</span>
                  <span style={{ fontSize: 10, color: T.ink4 }}>{ROLE_LABEL[r.role] || r.role}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input value={draft} onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !mentionOpen) activeThreadId ? sendMessage() : startThread() }}
              placeholder={activeThreadId ? "Write a message… (@ to mention someone)" : "First message to start this channel…"}
              style={{ flex: 1, padding: "9px 13px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 13 }} />
            <Btn onClick={activeThreadId ? sendMessage : startThread} disabled={sending || !draft.trim()}>
              {sending ? "…" : "Send"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Approvals inbox — coordination layer (2026-07-31) ──────────────────────
function ApprovalsPanel({ canonical, user }) {
  const institutionId = canonical?.institution?.id
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const load = useCallback(async () => {
    if (!institutionId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await collegeChatApi.listApprovals(institutionId, { status: "pending" })
      setApprovals(res?.approvals || [])
    } catch (_) {}
    setLoading(false)
  }, [institutionId])

  useEffect(() => { load() }, [load])

  async function decide(id, decision) {
    setActionId(id)
    try { await collegeChatApi.decideApproval(id, decision); await load() }
    catch (_) {}
    setActionId(null)
  }

  if (!institutionId) return <EmptyState icon="📋" title="Not connected yet" sub="Approvals appear here once your institution is linked." />
  if (loading) return <Spinner />

  return (
    <Card>
      <SectionHead title="Approvals Inbox" />
      {approvals.length === 0 ? (
        <EmptyState icon="✅" title="Nothing pending" sub="Approvals requested from chat threads (e.g. an offer or interview decision) show up here." />
      ) : (
        approvals.map((a, i) => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < approvals.length - 1 ? `1px solid ${T.border}` : "none" }}>
            <div>
              <div style={{ fontSize: 12.5, color: T.ink }}>{a.subject}</div>
              <ContextBadge contextType={a.context_type} statusTag={null} />
              <div style={{ fontSize: 10.5, color: T.ink4, marginTop: 2 }}>{timeSince(a.created_at)}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn onClick={() => decide(a.id, "approved")} disabled={actionId === a.id} style={{ fontSize: 11, padding: "4px 9px" }}>
                {actionId === a.id ? "…" : "Approve"}
              </Btn>
              <Btn variant="outline" onClick={() => decide(a.id, "rejected")} disabled={actionId === a.id}
                style={{ fontSize: 11, padding: "4px 9px", borderColor: T.red, color: T.red }}>Reject</Btn>
            </div>
          </div>
        ))
      )}
    </Card>
  )
}

// ─── Follow-up queue — coordination layer (2026-07-31) ──────────────────────
function FollowupsPanel({ canonical, user }) {
  const institutionId = canonical?.institution?.id
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const load = useCallback(async () => {
    if (!institutionId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await collegeChatApi.listFollowups(institutionId, { status: "open" })
      setFollowups(res?.followups || [])
    } catch (_) {}
    setLoading(false)
  }, [institutionId])

  useEffect(() => { load() }, [load])

  async function resolve(id, status) {
    setActionId(id)
    try { await collegeChatApi.updateFollowup(id, status); await load() }
    catch (_) {}
    setActionId(null)
  }

  if (!institutionId) return <EmptyState icon="📌" title="Not connected yet" sub="Follow-ups appear here once your institution is linked." />
  if (loading) return <Spinner />

  return (
    <Card>
      <SectionHead title="Follow-up Queue" />
      {followups.length === 0 ? (
        <EmptyState icon="🗒️" title="Nothing open" sub="Tasks created from chat threads (the '→ Task' action on any message) show up here." />
      ) : (
        followups.map((f, i) => (
          <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < followups.length - 1 ? `1px solid ${T.border}` : "none" }}>
            <div>
              <div style={{ fontSize: 12.5, color: T.ink }}>{f.title}</div>
              <div style={{ fontSize: 10.5, color: T.ink4, marginTop: 2 }}>
                {f.due_at ? `Due ${new Date(f.due_at).toLocaleDateString()} · ` : ""}{timeSince(f.created_at)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn onClick={() => resolve(f.id, "done")} disabled={actionId === f.id} style={{ fontSize: 11, padding: "4px 9px" }}>
                {actionId === f.id ? "…" : "Mark done"}
              </Btn>
              <Btn variant="outline" onClick={() => resolve(f.id, "dismissed")} disabled={actionId === f.id} style={{ fontSize: 11, padding: "4px 9px" }}>Dismiss</Btn>
            </div>
          </div>
        ))
      )}
    </Card>
  )
}

// ─── Drives / placement campaigns — coordination layer (2026-07-31) ────────
// Connects recruiters, placement cell, and eligible students. Each drive
// optionally owns a linked chat channel (context_type='drive'), created
// server-side in college.js's POST /drives.
function DrivesPanel({ canonical, openThreadFor }) {
  const institutionId = canonical?.institution?.id
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: "", eligibleBranches: "", minElo: "",
    proctoringEnabled: false, assessmentUrl: "", assessmentInstructions: "", assessmentDurationMinutes: "",
  })
  const [creating, setCreating] = useState(false)
  const [eligibleCounts, setEligibleCounts] = useState({})
  const [sessionsFor, setSessionsFor] = useState(null) // drive object being viewed
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!institutionId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await collegeApi.listDrives(institutionId)
      setDrives(res?.drives || [])
    } catch (_) {}
    setLoading(false)
  }, [institutionId])

  useEffect(() => { load() }, [load])

  async function create() {
    if (!form.title.trim()) return
    setCreating(true)
    try {
      await collegeApi.createDrive(institutionId, {
        title: form.title.trim(),
        eligibleBranches: form.eligibleBranches.trim() ? form.eligibleBranches.split(",").map((b) => b.trim()).filter(Boolean) : [],
        minElo: form.minElo.trim() ? Number(form.minElo) : null,
        proctoringEnabled: form.proctoringEnabled,
        assessmentUrl: form.assessmentUrl.trim() || null,
        assessmentInstructions: form.assessmentInstructions.trim() || null,
        assessmentDurationMinutes: form.assessmentDurationMinutes.trim() ? Number(form.assessmentDurationMinutes) : null,
      })
      setForm({ title: "", eligibleBranches: "", minElo: "", proctoringEnabled: false, assessmentUrl: "", assessmentInstructions: "", assessmentDurationMinutes: "" })
      setShowCreate(false)
      await load()
    } catch (_) {}
    setCreating(false)
  }

  async function checkEligible(driveId) {
    try {
      const res = await collegeApi.getDriveEligibleStudents(institutionId, driveId)
      setEligibleCounts((c) => ({ ...c, [driveId]: res?.count ?? 0 }))
    } catch (_) {}
  }

  async function openSessions(drive) {
    setSessionsFor(drive)
    setSessionsLoading(true)
    try {
      const res = await collegeApi.listDriveSessions(institutionId, drive.id)
      setSessions(res?.sessions || [])
    } catch (_) { setSessions([]) }
    setSessionsLoading(false)
  }

  if (!institutionId) return <EmptyState icon="🏢" title="Not connected yet" sub="Placement drives appear here once your institution is linked." />
  if (loading) return <Spinner />

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <SectionHead title="Placement Drives" />
        <Btn onClick={() => setShowCreate((s) => !s)} style={{ fontSize: 11, padding: "5px 10px" }}>{showCreate ? "Cancel" : "+ New Drive"}</Btn>
      </div>
      {showCreate && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, padding: 12, background: T.bg, borderRadius: 10, border: `1px solid ${T.border}` }}>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Drive title (e.g. TCS Campus Drive — Aug 2026)"
            style={{ padding: "8px 10px", borderRadius: 8, background: T.raised || T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12 }} />
          <input value={form.eligibleBranches} onChange={(e) => setForm((f) => ({ ...f, eligibleBranches: e.target.value }))} placeholder="Eligible branches, comma-separated (optional — blank = all)"
            style={{ padding: "8px 10px", borderRadius: 8, background: T.raised || T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12 }} />
          <input value={form.minElo} onChange={(e) => setForm((f) => ({ ...f, minElo: e.target.value }))} placeholder="Minimum ELO (optional)" type="number"
            style={{ padding: "8px 10px", borderRadius: 8, background: T.raised || T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12 }} />

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.ink3, marginTop: 4, cursor: "pointer" }}>
            <input type="checkbox" checked={form.proctoringEnabled} onChange={(e) => setForm((f) => ({ ...f, proctoringEnabled: e.target.checked }))} />
            Proctored assessment (fullscreen + tab-switch monitoring during attempt)
          </label>
          {form.proctoringEnabled && (
            <>
              <input value={form.assessmentUrl} onChange={(e) => setForm((f) => ({ ...f, assessmentUrl: e.target.value }))} placeholder="Assessment link (e.g. Arena challenge URL, Google Form)"
                style={{ padding: "8px 10px", borderRadius: 8, background: T.raised || T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12 }} />
              <input value={form.assessmentDurationMinutes} onChange={(e) => setForm((f) => ({ ...f, assessmentDurationMinutes: e.target.value }))} placeholder="Duration in minutes (optional)" type="number"
                style={{ padding: "8px 10px", borderRadius: 8, background: T.raised || T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12 }} />
              <textarea value={form.assessmentInstructions} onChange={(e) => setForm((f) => ({ ...f, assessmentInstructions: e.target.value }))} placeholder="Instructions shown to students before they start (optional)" rows={2}
                style={{ padding: "8px 10px", borderRadius: 8, background: T.raised || T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12, resize: "vertical" }} />
            </>
          )}

          <Btn onClick={create} disabled={creating || !form.title.trim()} style={{ fontSize: 12, padding: "7px 12px" }}>{creating ? "Creating…" : "Create Drive"}</Btn>
        </div>
      )}
      {drives.length === 0 ? (
        <EmptyState icon="🏢" title="No drives yet" sub="A drive connects a recruiter, eligible students, and a coordination channel in one place." />
      ) : (
        drives.map((d, i) => (
          <div key={d.id} style={{ padding: "10px 0", borderBottom: i < drives.length - 1 ? `1px solid ${T.border}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink }}>{d.title}{d.proctoring_enabled && <span title="Proctored assessment configured" style={{ marginLeft: 6 }}>🔒</span>}</div>
                <div style={{ fontSize: 10.5, color: T.ink4, marginTop: 2, textTransform: "capitalize" }}>
                  {d.status}{d.min_elo ? ` · min ELO ${d.min_elo}` : ""}{Array.isArray(d.eligible_branches) && d.eligible_branches.length ? ` · ${d.eligible_branches.join(", ")}` : " · all branches"}
                  {eligibleCounts[d.id] !== undefined ? ` · ${eligibleCounts[d.id]} eligible` : ""}
                </div>
                <div style={{ fontSize: 10.5, color: T.sky, marginTop: 2 }}>
                  {d.offersCount || 0} offer{d.offersCount === 1 ? "" : "s"} · {d.placedCount || 0} placed{d.avgCtcLpa != null ? ` · avg ₹${d.avgCtcLpa} LPA` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => checkEligible(d.id)} title="Count eligible students"
                  style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13 }}>👥</button>
                {d.proctoring_enabled && (
                  <button onClick={() => openSessions(d)} title="View proctoring sessions"
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13 }}>🔒</button>
                )}
                {d.thread_id && openThreadFor && (
                  <button onClick={() => openThreadFor({ contextType: "drive", contextId: d.id, subject: d.title })}
                    title="Open drive room" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13 }}>💬</button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {sessionsFor && (
        <Modal title={`Proctoring — ${sessionsFor.title}`} onClose={() => setSessionsFor(null)} width={520}>
          {sessionsLoading ? <Spinner /> : sessions.length === 0 ? (
            <EmptyState icon="🔒" title="No attempts yet" sub="Students who start this drive's proctored assessment will show up here with their integrity signal." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sessions.map((s) => (
                <div key={s.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`,
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{s.institution_students?.roll_number || "—"}</div>
                    <div style={{ fontSize: 10.5, color: T.ink4 }}>{s.institution_students?.department || "—"} · {s.status}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                    color: s.violation_count === 0 ? T.green : s.violation_count < 3 ? T.amber : T.red,
                    background: s.violation_count === 0 ? `${T.green}18` : s.violation_count < 3 ? `${T.amber}18` : `${T.red}18`,
                  }}>
                    {s.violation_count} violation{s.violation_count === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </Card>
  )
}

// ─── Notification Center — added 2026-07-31 (Phase 6) ──────────────────────
// Reuses the already-built GET /api/nexus/notifications (same source the
// student-facing OrbitDashboard/Nexus bell reads) rather than a second
// notification store — this is a "reminders and follow-ups" *view* for
// institution staff, not new infrastructure. Every notification this whole
// enhancement pass creates (offers, invites, interviews, chat) lands here.
function NotificationCenterPanel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await nexusApi.notifications()
      setItems(Array.isArray(res) ? res : [])
    } catch (_) { setItems([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />

  return (
    <Card>
      <SectionHead title="Notifications" />
      {items.length === 0 ? (
        <EmptyState icon="🔔" title="Nothing yet" sub="Offers, recruiter activity, and messages will show up here as they happen." />
      ) : (
        items.slice(0, 40).map((n, i) => (
          <div key={n.id} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: i < items.length - 1 ? `1px solid ${T.border}` : "none", opacity: n.is_read ? 0.6 : 1 }}>
            <span style={{ fontSize: 15, marginTop: 1 }}>{n.is_read ? "•" : "●"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: T.ink, fontWeight: n.is_read ? 400 : 700 }}>{n.title || n.message || n.type}</div>
              {n.body && <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 2 }}>{n.body}</div>}
              <div style={{ fontSize: 10.5, color: T.ink4, marginTop: 2 }}>{timeSince(n.created_at)}</div>
            </div>
          </div>
        ))
      )}
    </Card>
  )
}

function IntelligencePage({ userData, user, members, tasks, auditLogs, auditLoading, canonical, openThreadFor, pendingThreadContext, clearPendingThreadContext, initialTab = "pulse" }) {
  const [tab, setTab] = useState(initialTab)
  const isCollege = (userData?.org_type || "college") !== "company"

  // Coordination layer: a "Message about this" launcher elsewhere in
  // InstitutionOS jumps here and stashes pendingThreadContext — land
  // directly on Team Chat instead of making the user click the tab too.
  useEffect(() => { if (pendingThreadContext) setTab("messages") }, [pendingThreadContext])

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

  const tabs = ["pulse", "elo", "placement", ...(isCollege ? ["naac"] : []), "recruiters", "drives", "messages", "approvals", "followups", "notifications"]
  const tabLabels = {
    pulse: "Live Pulse", elo: "ELO Distribution", placement: isCollege ? "Placement Funnel" : "Hiring Funnel",
    naac: "NAAC Report",
    recruiters: "Recruiter Activity", drives: "Drives", messages: "Team Chat",
    approvals: "Approvals", followups: "Follow-ups", notifications: "Notifications",
  }

  // ELO histogram from real members
  const eloRanges = [
    { range: "900–1000 (Expert)",    min: 900, max: 1001, color: T.green  },
    { range: "800–899 (Advanced)",   min: 800, max: 900,  color: T.sky    },
    { range: "700–799 (Proficient)", min: 700, max: 800,  color: T.blue   },
    { range: "600–699 (Developing)", min: 600, max: 700,  color: T.amber  },
    { range: "400–599 (Beginner)",   min: 400, max: 600,  color: T.red    },
  ].map(r => ({
    ...r,
    // Students' ELO baseline is 400 (see arena/assessment ELO defaults) — a
    // missing elo_rating means "not yet rated, sitting at the floor", not 0.
    count: activeMembers.filter(m => (m.elo_rating || 400) >= r.min && (m.elo_rating || 400) < r.max).length,
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

      {tab === "elo" && canonical?.branches?.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <SectionHead title="Department Benchmark" />
          <div style={{ fontSize: 11, color: T.ink4, marginBottom: 10 }}>
            Live, from your canonical roster — ranked by placement rate. All-batch, all-time (see NAAC Report for a per-batch, per-year breakdown).
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, canonical.branches.length)}, 1fr)`, gap: 8 }}>
            {[...canonical.branches].sort((a, b) => (b.placedPct || 0) - (a.placedPct || 0)).map((b, i) => {
              const readiness = b.avgJobReadiness || 0
              const heat = readiness >= 70 ? T.green : readiness >= 40 ? T.amber : T.red
              return (
                <div key={b.department} style={{ position: "relative", border: `1px solid ${heat}40`, background: `${heat}14`, borderRadius: 12, padding: 12 }}>
                  <div style={{ position: "absolute", top: 8, right: 10, fontSize: 10, fontWeight: 800, color: T.ink4, fontFamily: MONO }}>#{i + 1}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, paddingRight: 20 }}>{b.department}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: heat, fontFamily: MONO, marginTop: 4 }}>{readiness}%</div>
                  <div style={{ fontSize: 10.5, color: T.ink4 }}>{b.students} students · {b.placedPct}% placed · ELO {b.avgElo}</div>
                </div>
              )
            })}
          </div>
        </Card>
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

      {tab === "naac" && <NaacReportPanel canonical={canonical} />}
      {tab === "recruiters" && <RecruiterActivityPanel canonical={canonical} openThreadFor={openThreadFor} />}
      {tab === "drives" && <DrivesPanel canonical={canonical} openThreadFor={openThreadFor} />}
      {tab === "messages" && (
        <ChatPanel canonical={canonical} user={user}
          pendingThreadContext={pendingThreadContext} onClearPendingThreadContext={clearPendingThreadContext} />
      )}
      {tab === "approvals" && <ApprovalsPanel canonical={canonical} user={user} />}
      {tab === "followups" && <FollowupsPanel canonical={canonical} user={user} />}
      {tab === "notifications" && <NotificationCenterPanel />}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 3 — TASKS
// ═══════════════════════════════════════════════════════════════════════════════
function TasksPage({ userData, user, tasks, tasksLoading, tasksError, reloadTasks, members, canonical }) {
  const [tab, setTab]         = useState("active")
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saveError, setSaveError] = useState(null)
  const isCollege = (userData?.org_type || "college") !== "company"

  const [form, setForm] = useState({ title: "", type: "assignment", subject: "", assignedTo: "All Students", dueDate: "", priority: "medium", description: "" })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [attachment, setAttachment]   = useState(null)   // File object
  const [uploadProgress, setUploadProgress] = useState("")

  // 2026-08-02: real Groups as a task-assignment target. org_tasks gained a
  // nullable assigned_to_group_id column (migration institution_groups) —
  // when a group is picked, we store the real FK instead of relying on
  // free-text label matching. NOTE (honest gap, unresolved): org_tasks has
  // no student-facing reader anywhere in the app yet, so this correctly
  // records who a task targets but does not yet deliver it to a student's
  // screen — same limitation as every other assign-to option here.
  const [groups, setGroups] = useState([])
  useEffect(() => {
    if (!isCollege || !canonical?.institution?.id) return
    collegeApi.listGroups(canonical.institution.id).then(res => setGroups(res?.groups || [])).catch(() => {})
  }, [isCollege, canonical?.institution?.id])

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
      ...groups.map(g   => ({ value: `group:${g.id}`, label: `🗂 ${g.name} (Group · ${g.memberCount} members)` })),
    ]
  }, [members, groups])

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

    // A "group:<uuid>" value means the picker selected a real Group — store
    // the FK (assigned_to_group_id) and keep assigned_to_label human-readable
    // for the existing display code, rather than parsing the prefix there too.
    const isGroupTarget = form.assignedTo?.startsWith("group:")
    const groupId = isGroupTarget ? form.assignedTo.slice("group:".length) : null
    const groupLabel = isGroupTarget ? assignOptions.find(o => o.value === form.assignedTo)?.label.replace(/^🗂 /, "").replace(/ \(Group.*\)$/, "") : null

    const { data: row, error } = await supabase.from("org_tasks").insert({
      org_id:              user.id,
      title:               form.title.trim(),
      description:         form.description,
      type:                form.type,
      subject:             form.subject.trim(),
      assigned_to_label:   isGroupTarget ? (groupLabel || "Group") : (form.assignedTo || "All Students"),
      assigned_to_group_id: groupId,
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
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}
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
// ─── Live Roster panel — canonical institution_students, added 2026-07-31 ──
// Renders only when this admin/staff member resolves to a real institutions
// row (useCanonicalRoster). Shows the auto-linked roster (self-link +
// roster-import) with a pending-admin approval queue, independent of and
// additive to the legacy org_members list below it.
function CanonicalRosterPanel({ canonical, openThreadFor }) {
  const { institution, students, stats, branches, loading, filters, setFilters, reload } = canonical
  const [actionId, setActionId] = useState(null)

  const statusColor = {
    pending_admin: T.amber, active: T.green, drifting: T.amber, at_risk: T.red,
    placed: T.sky, transitioning: T.sky, professional_active: T.green,
    graduated: T.ink4, rejected: T.red, alumni: T.ink4, withdrawn: T.ink4,
  }

  async function approve(studentId) {
    setActionId(studentId + "-approve")
    try { await collegeApi.approveStudent(institution.id, studentId); await reload() }
    catch (_) { /* surfaced via unchanged loading state; reload() no-ops on failure */ }
    setActionId(null)
  }
  async function reject(studentId) {
    setActionId(studentId + "-reject")
    try { await collegeApi.rejectStudent(institution.id, studentId); await reload() }
    catch (_) {}
    setActionId(null)
  }
  async function toggleShare(studentId, nextShared) {
    setActionId(studentId + "-share")
    try { await collegeApi.shareStudent(institution.id, studentId, nextShared); await reload() }
    catch (_) {}
    setActionId(null)
  }

  // 2026-08-01: roster edit/remove
  const [editingStudent, setEditingStudent] = useState(null)
  const [editStudentForm, setEditStudentForm] = useState({ department: "", batch: "", rollNumber: "" })
  function openStudentEdit(s) {
    setEditingStudent(s)
    setEditStudentForm({ department: s.department || "", batch: s.batch || "", rollNumber: s.roll_number || "" })
  }
  async function saveStudentEdit() {
    if (!editingStudent) return
    setActionId(editingStudent.id + "-edit")
    try {
      await collegeApi.updateStudent(institution.id, editingStudent.id, editStudentForm)
      setEditingStudent(null)
      await reload()
    } catch (_) {}
    setActionId(null)
  }
  async function removeStudent(s) {
    if (!window.confirm(`Remove ${s.roll_number || "this student"} from the roster? Their Capabilio account, ELO, and history are untouched — only the college link is removed.`)) return
    setActionId(s.id + "-remove")
    try { await collegeApi.removeStudent(institution.id, s.id); await reload() }
    catch (_) {}
    setActionId(null)
  }

  // 2026-08-02: outcome recording (higher studies / entrepreneurship) — feeds
  // the NAAC report. Placement itself is never edited here — that only ever
  // moves through the TPO-confirm gate on the offers/placements flow.
  const [outcomeStudent, setOutcomeStudent] = useState(null)
  const [outcomeForm, setOutcomeForm] = useState({ academicYear: "", outcomeType: "higher_studies", institutionName: "", program: "", ventureName: "", sector: "" })
  const [outcomeSaving, setOutcomeSaving] = useState(false)
  const [outcomeError, setOutcomeError] = useState(null)
  function openOutcome(s) {
    setOutcomeStudent(s)
    setOutcomeForm({ academicYear: "", outcomeType: "higher_studies", institutionName: "", program: "", ventureName: "", sector: "" })
    setOutcomeError(null)
  }
  async function saveOutcome() {
    if (!outcomeStudent) return
    if (!/^\d{4}-\d{2,4}$/.test(outcomeForm.academicYear)) { setOutcomeError("Academic year format: 2025-26"); return }
    setOutcomeSaving(true); setOutcomeError(null)
    try {
      const details = outcomeForm.outcomeType === "higher_studies"
        ? { institution: outcomeForm.institutionName, program: outcomeForm.program }
        : { venture_name: outcomeForm.ventureName, sector: outcomeForm.sector }
      await collegeApi.recordOutcome(institution.id, {
        studentId: outcomeStudent.id, academicYear: outcomeForm.academicYear,
        outcomeType: outcomeForm.outcomeType, details,
      })
      setOutcomeStudent(null)
    } catch (e) { setOutcomeError(e.message || "Could not save outcome") }
    setOutcomeSaving(false)
  }

  return (
    <div style={{
      background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))",
      border: `1px solid ${T.border}`, borderRadius: 18, padding: 18, marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Live Roster — {institution.name}</div>
          <div style={{ fontSize: 11, color: T.ink4 }}>
            Auto-linked via College Path · {stats ? `${stats.totalStudents} students · avg ELO ${stats.avgElo} · ${stats.placementRate}% placed` : "loading…"}
          </div>
        </div>
        <Btn variant="outline" onClick={reload} style={{ fontSize: 11, padding: "5px 10px" }}>Refresh</Btn>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        <select value={filters.department} onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}
          style={{ padding: "7px 10px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12 }}>
          <option value="">All branches</option>
          {branches.map(b => <option key={b.department} value={b.department}>{b.department} ({b.students})</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ padding: "7px 10px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12 }}>
          <option value="">All statuses</option>
          {Object.keys(statusColor).map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          placeholder="Search roll number…"
          style={{ padding: "7px 10px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12, minWidth: 140 }} />
        <input value={filters.role} onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
          placeholder="Career role…"
          style={{ padding: "7px 10px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12, minWidth: 130 }} />
        <input type="number" min="0" value={filters.minTasks} onChange={e => setFilters(f => ({ ...f, minTasks: e.target.value }))}
          placeholder="Min tasks"
          style={{ padding: "7px 10px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12, width: 90 }} />
        <select value={filters.interviewStatus} onChange={e => setFilters(f => ({ ...f, interviewStatus: e.target.value }))}
          style={{ padding: "7px 10px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12 }}>
          <option value="">Any interview status</option>
          <option value="attempted">AI interview attempted</option>
          <option value="none">No AI interview yet</option>
        </select>
        <select value={filters.shared} onChange={e => setFilters(f => ({ ...f, shared: e.target.value }))}
          style={{ padding: "7px 10px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12 }}>
          <option value="">Shared: any</option>
          <option value="true">Shared with recruiters</option>
          <option value="false">Hidden from recruiters</option>
        </select>
        <select value={filters.active} onChange={e => setFilters(f => ({ ...f, active: e.target.value }))}
          style={{ padding: "7px 10px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 12 }}>
          <option value="">Active/inactive: any</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: T.ink4, fontSize: 12 }}>Loading roster…</div>
      ) : students.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: T.ink4, fontSize: 12 }}>
          No students linked yet. Students auto-link when they enter this college name during onboarding, or via CSV roster import.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: "left", color: T.ink4, borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: "6px 8px" }}>Roll No.</th>
                <th style={{ padding: "6px 8px" }}>Branch</th>
                <th style={{ padding: "6px 8px" }}>Batch</th>
                <th style={{ padding: "6px 8px" }}>Career Role</th>
                <th style={{ padding: "6px 8px" }}>ELO</th>
                <th style={{ padding: "6px 8px" }}>Job Readiness</th>
                <th style={{ padding: "6px 8px" }}>Tasks</th>
                <th style={{ padding: "6px 8px" }}>AI Interviews</th>
                <th style={{ padding: "6px 8px" }}>Status</th>
                <th style={{ padding: "6px 8px" }}>Shared</th>
                <th style={{ padding: "6px 8px" }}></th>
                <th style={{ padding: "6px 8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "8px" }}>{s.roll_number || "—"}</td>
                  <td style={{ padding: "8px" }}>{s.department || "—"}</td>
                  <td style={{ padding: "8px" }}>{s.batch || "—"}</td>
                  <td style={{ padding: "8px" }}>{s.careerRole || "—"}</td>
                  <td style={{ padding: "8px" }}>{Math.round(s.elo_current || 0)}</td>
                  <td style={{ padding: "8px" }}>{s.job_readiness_score != null ? `${s.job_readiness_score}%` : "—"}</td>
                  <td style={{ padding: "8px" }}>{s.taskCount ?? 0}</td>
                  <td style={{ padding: "8px" }}>{s.aiInterviewCount ?? 0}</td>
                  <td style={{ padding: "8px" }}>
                    <span style={{ color: statusColor[s.status] || T.ink4, fontWeight: 600 }}>{(s.status || "").replace(/_/g, " ")}</span>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <button onClick={() => toggleShare(s.id, !s.shared_with_recruiters)} disabled={actionId === s.id + "-share"}
                      style={{
                        border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                        background: s.shared_with_recruiters ? T.greenL : T.ink5, color: s.shared_with_recruiters ? T.green : T.ink4,
                      }}>
                      {actionId === s.id + "-share" ? "…" : s.shared_with_recruiters ? "Shared" : "Hidden"}
                    </button>
                  </td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    {s.status === "pending_admin" && (
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Btn onClick={() => approve(s.id)} disabled={actionId === s.id + "-approve"} style={{ fontSize: 11, padding: "4px 9px" }}>
                          {actionId === s.id + "-approve" ? "…" : "Approve"}
                        </Btn>
                        <Btn variant="outline" onClick={() => reject(s.id)} disabled={actionId === s.id + "-reject"}
                          style={{ fontSize: 11, padding: "4px 9px", borderColor: T.red, color: T.red }}>
                          {actionId === s.id + "-reject" ? "…" : "Reject"}
                        </Btn>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {openThreadFor && (
                      <button
                        onClick={() => openThreadFor({ contextType: "student", contextId: s.id, subject: `Student: ${s.roll_number || s.id.slice(0, 8)}` })}
                        title="Message about this student"
                        style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, opacity: 0.75 }}>
                        💬
                      </button>
                    )}
                    <button onClick={() => openOutcome(s)} title="Record higher-studies / entrepreneurship outcome (NAAC)"
                      style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, opacity: 0.75, marginLeft: 4 }}>
                      🎓
                    </button>
                    <button onClick={() => openStudentEdit(s)} title="Edit roster details"
                      style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, opacity: 0.75, marginLeft: 4 }}>
                      ✏️
                    </button>
                    <button onClick={() => removeStudent(s)} title="Remove from roster" disabled={actionId === s.id + "-remove"}
                      style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, opacity: 0.75, marginLeft: 4 }}>
                      {actionId === s.id + "-remove" ? "…" : "🗑"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingStudent && (
        <Modal title={`Edit ${editingStudent.roll_number || "student"}`} onClose={() => setEditingStudent(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FieldInput label="Roll Number" value={editStudentForm.rollNumber} onChange={v => setEditStudentForm(f => ({ ...f, rollNumber: v }))} />
            <FieldInput label="Department / Branch" value={editStudentForm.department} onChange={v => setEditStudentForm(f => ({ ...f, department: v }))} placeholder="e.g. CSE" />
            <FieldInput label="Batch" value={editStudentForm.batch} onChange={v => setEditStudentForm(f => ({ ...f, batch: v }))} placeholder="e.g. B.tech 2026" />
            <div style={{ fontSize: 11, color: T.ink4 }}>ELO and readiness scores can't be edited here — they only move through audited scoring routes.</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Btn>
              <Btn onClick={saveStudentEdit} disabled={actionId === editingStudent.id + "-edit"}>
                {actionId === editingStudent.id + "-edit" ? "Saving…" : "Save"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {outcomeStudent && (
        <Modal title={`Record outcome — ${outcomeStudent.roll_number || "student"}`} onClose={() => setOutcomeStudent(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 11, color: T.ink4 }}>For NAAC/NBA reporting only — never affects placement status, which stays gated by the offer-confirmation flow.</div>
            <FieldInput label="Academic year (e.g. 2025-26)" value={outcomeForm.academicYear} onChange={v => setOutcomeForm(f => ({ ...f, academicYear: v }))} placeholder="2025-26" />
            <div>
              <div style={{ fontSize: 11.5, color: T.ink3, marginBottom: 4 }}>Outcome type</div>
              <select value={outcomeForm.outcomeType} onChange={e => setOutcomeForm(f => ({ ...f, outcomeType: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.ink, fontSize: 13 }}>
                <option value="higher_studies">Higher studies</option>
                <option value="entrepreneurship">Entrepreneurship</option>
              </select>
            </div>
            {outcomeForm.outcomeType === "higher_studies" ? (
              <>
                <FieldInput label="Institution" value={outcomeForm.institutionName} onChange={v => setOutcomeForm(f => ({ ...f, institutionName: v }))} placeholder="e.g. IIT Bombay" />
                <FieldInput label="Program" value={outcomeForm.program} onChange={v => setOutcomeForm(f => ({ ...f, program: v }))} placeholder="e.g. M.Tech CSE" />
              </>
            ) : (
              <>
                <FieldInput label="Venture name" value={outcomeForm.ventureName} onChange={v => setOutcomeForm(f => ({ ...f, ventureName: v }))} placeholder="e.g. Acme Labs" />
                <FieldInput label="Sector" value={outcomeForm.sector} onChange={v => setOutcomeForm(f => ({ ...f, sector: v }))} placeholder="e.g. Fintech" />
              </>
            )}
            {outcomeError && <div style={{ fontSize: 11.5, color: T.red }}>{outcomeError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="outline" onClick={() => setOutcomeStudent(null)}>Cancel</Btn>
              <Btn onClick={saveOutcome} disabled={outcomeSaving}>{outcomeSaving ? "Saving…" : "Save"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Staff Access — coordination/admin layer (2026-08-01) ───────────────────
// The college admin creates real login credentials for staff (placement
// team, professors, mentors). Those accounts log into the org path with
// their own email+password and get a role-locked view (see lockedRole in
// the root component): placement_officer → placement pages only,
// professor/dept_head/mentor → roster + team chat only. Only rendered for
// (and only usable by, backend-enforced) the college admin.
function StaffAccessPanel({ canonical }) {
  const institutionId = canonical?.institution?.id
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "placement_officer", department: "" })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [createdInfo, setCreatedInfo] = useState(null)
  const [actionId, setActionId] = useState(null)

  const ROLE_LABELS = {
    placement_officer: "Placement Team", professor: "Professor",
    dept_head: "Dept Head", mentor: "Mentor", college_admin: "College Admin",
  }

  const load = useCallback(async () => {
    if (!institutionId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await collegeApi.listStaff(institutionId)
      setStaff(res?.staff || [])
    } catch (_) {}
    setLoading(false)
  }, [institutionId])

  useEffect(() => { load() }, [load])

  async function create() {
    setCreating(true); setCreateError(null)
    try {
      const res = await collegeApi.createStaffLogin(institutionId, {
        name: form.name.trim(), email: form.email.trim(), password: form.password,
        role: form.role, department: form.department.trim(),
      })
      setCreatedInfo({ email: form.email.trim(), password: form.password, role: res?.staff?.role || form.role })
      setForm({ name: "", email: "", password: "", role: "placement_officer", department: "" })
      setShowCreate(false)
      await load()
    } catch (err) {
      setCreateError(err.message)
    }
    setCreating(false)
  }

  async function revoke(s) {
    if (!window.confirm(`Revoke access for ${s.email || s.name}? They won't be able to use the org portal until re-added.`)) return
    setActionId(s.id)
    try { await collegeApi.revokeStaff(institutionId, s.id); await load() }
    catch (_) {}
    setActionId(null)
  }

  if (!institutionId) return null
  if (loading) return null

  return (
    <Card style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionHead title="Staff Access" />
        <Btn onClick={() => { setShowCreate(s => !s); setCreateError(null) }} style={{ fontSize: 11, padding: "5px 10px" }}>
          {showCreate ? "Cancel" : "+ Create Staff Login"}
        </Btn>
      </div>
      <div style={{ fontSize: 11.5, color: T.ink4, marginTop: -6, marginBottom: 12 }}>
        Create login credentials for your placement team and staff. Each login sees only its role's pages — a Placement Team login gets the placement portal and recruiter tools, never institution admin settings.
      </div>

      {createdInfo && (
        <div style={{ padding: "12px 14px", background: T.greenL, border: `1px solid ${T.green}40`, borderRadius: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.green, marginBottom: 4 }}>✓ Login created — share these credentials securely (shown only once):</div>
          <div style={{ fontSize: 12.5, fontFamily: MONO, color: T.ink }}>Email: {createdInfo.email}</div>
          <div style={{ fontSize: 12.5, fontFamily: MONO, color: T.ink }}>Password: {createdInfo.password}</div>
          <div style={{ fontSize: 11, color: T.ink4, marginTop: 4 }}>They log in at capabilio.online with these — no signup needed. Access: {ROLE_LABELS[createdInfo.role] || createdInfo.role}.</div>
          <Btn variant="outline" onClick={() => setCreatedInfo(null)} style={{ fontSize: 10.5, padding: "3px 8px", marginTop: 8 }}>Dismiss</Btn>
        </div>
      )}

      {showCreate && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, padding: 12, background: T.bg, borderRadius: 10, border: `1px solid ${T.border}` }}>
          <FieldInput label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Placement Officer Ramesh" />
          <FieldInput label="Login Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="placement@yourcollege.edu" type="email" />
          <FieldInput label="Password (min 8 characters)" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} type="password" />
          <FieldSelect label="Access Level" value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} options={[
            { value: "placement_officer", label: "Placement Team — placement portal, recruiters, offers, drives" },
            { value: "professor",         label: "Professor — roster + team chat only" },
            { value: "dept_head",         label: "Dept Head — roster + team chat only" },
            { value: "mentor",            label: "Mentor — roster + team chat only" },
          ]} />
          <FieldInput label="Department (optional)" value={form.department} onChange={v => setForm(f => ({ ...f, department: v }))} placeholder="e.g. CSE" />
          {createError && <div style={{ fontSize: 12, color: T.red }}>{createError}</div>}
          <Btn onClick={create} disabled={creating || !form.email.trim() || form.password.length < 8}>
            {creating ? "Creating…" : "Create Login"}
          </Btn>
        </div>
      )}

      {staff.length === 0 ? (
        <div style={{ fontSize: 12, color: T.ink4, padding: "8px 0" }}>No staff logins yet.</div>
      ) : (
        staff.map((s, i) => (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < staff.length - 1 ? `1px solid ${T.border}` : "none" }}>
            <div>
              <div style={{ fontSize: 12.5, color: T.ink, fontWeight: 600 }}>
                {s.name || s.email || s.user_id.slice(0, 8)}
                <span style={{ fontSize: 10.5, color: T.ink4, fontWeight: 400, marginLeft: 8 }}>{ROLE_LABELS[s.role] || s.role}{s.department ? ` · ${s.department}` : ""}</span>
              </div>
              <div style={{ fontSize: 11, color: s.status === "active" ? T.green : T.ink4 }}>{s.email} · {s.status}</div>
            </div>
            {s.status === "active" && (
              <Btn variant="outline" onClick={() => revoke(s)} disabled={actionId === s.id}
                style={{ fontSize: 11, padding: "4px 9px", borderColor: T.red, color: T.red }}>
                {actionId === s.id ? "…" : "Revoke"}
              </Btn>
            )}
          </div>
        ))
      )}
    </Card>
  )
}

function PeoplePage({ userData, user, members, membersLoading, membersError, reloadMembers, canonical, openThreadFor }) {
  const [tab, setTab]         = useState("all")
  const [search, setSearch]   = useState("")
  const [showInvite, setShowInvite] = useState(false)
  const [inviting, setInviting]     = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [form, setForm]       = useState({ name: "", email: "", role: "student", department: "", batch: "" })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isCollege = (userData?.org_type || "college") !== "company"

  // Self-serve join link — lets a professor share one link instead of typing
  // every student (of ~1000) into the invite modal individually.
  const [showJoinLink, setShowJoinLink]   = useState(false)
  const [linkForm, setLinkForm]           = useState({ label: "", role: "student", department: "", batch: "" })
  const setLF = (k, v) => setLinkForm(f => ({ ...f, [k]: v }))
  const [linkCreating, setLinkCreating]   = useState(false)
  const [linkError, setLinkError]         = useState(null)
  const [createdLink, setCreatedLink]     = useState(null)
  const [linkCopied, setLinkCopied]       = useState(false)

  // Member edit modal (2026-08-01)
  const [editingMember, setEditingMember] = useState(null)
  const [editMemberForm, setEditMemberForm] = useState({ name: "", role: "student", department: "", batch: "" })
  const setEM = (k, v) => setEditMemberForm(f => ({ ...f, [k]: v }))
  const orgName = userData?.org_name || "your institution"
  function openMemberEdit(m) {
    setEditingMember(m)
    setEditMemberForm({ name: m.name || "", role: m.role || "student", department: m.department || "", batch: m.batch || "" })
  }

  async function handleCreateJoinLink() {
    setLinkCreating(true); setLinkError(null)
    try {
      const res = await orgApi.createJoinLink({
        label: linkForm.label.trim(),
        role: linkForm.role,
        department: linkForm.department.trim(),
        batch: linkForm.batch.trim(),
      })
      setCreatedLink(res.link ? { ...res.link, url: res.url } : null)
    } catch (err) {
      setLinkError(err.message)
    } finally {
      setLinkCreating(false)
    }
  }

  function copyLinkUrl() {
    if (!createdLink?.url) return
    navigator.clipboard?.writeText(createdLink.url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  function closeJoinLinkModal() {
    setShowJoinLink(false); setCreatedLink(null); setLinkError(null)
    setLinkForm({ label: "", role: "student", department: "", batch: "" })
  }

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

  // 2026-08-01: member edit/remove — same direct-supabase pattern as
  // approve/deny above (org_members writes from this page all go through
  // the client + audit log; consistent with the existing code, not a new path).
  async function handleRemove(member) {
    if (!window.confirm(`Remove ${member.name} from ${orgName}? They can rejoin via a new invite.`)) return
    setActionLoading(member.id + "-remove")
    const { error } = await supabase.from("org_members")
      .update({ status: "removed" }).eq("id", member.id)
    setActionLoading(null)
    if (!error) {
      await auditLog(user.id, user.id, userData?.name || "Admin",
        `Removed ${member.name} from the roster`, "member.removed", "member", member.id, {}, "warning")
      reloadMembers()
    }
  }

  async function handleMemberEditSave() {
    if (!editingMember) return
    setActionLoading(editingMember.id + "-edit")
    const { error } = await supabase.from("org_members")
      .update({
        name: editMemberForm.name.trim() || editingMember.name,
        role: editMemberForm.role,
        department: editMemberForm.department.trim(),
        batch: editMemberForm.batch.trim(),
      })
      .eq("id", editingMember.id)
    setActionLoading(null)
    if (!error) {
      await auditLog(user.id, user.id, userData?.name || "Admin",
        `Edited member ${editingMember.name}`, "member.updated", "member", editingMember.id, {})
      setEditingMember(null)
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
        actions={[
          <Btn key="l" variant="outline" onClick={() => setShowJoinLink(true)}>🔗 Get Invite Link</Btn>,
          <Btn key="i" onClick={() => setShowInvite(true)}>+ Invite</Btn>,
        ]}
      />

      {pendingCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.amberL, borderRadius: 10, marginBottom: 16, border: `1px solid ${T.amber}30` }}>
          <span>⏳</span>
          <span style={{ fontSize: 13, color: T.amber, fontWeight: 600 }}>{pendingCount} member{pendingCount > 1 ? "s" : ""} pending approval</span>
          <Btn variant="outline" onClick={() => setTab("pending")} style={{ marginLeft: "auto", fontSize: 11, borderColor: T.amber, color: T.amber, padding: "4px 10px" }}>Review</Btn>
        </div>
      )}

      {canonical?.institution && <CanonicalRosterPanel canonical={canonical} openThreadFor={openThreadFor} />}
      {/* Staff Access (creating staff logins) moved to Settings → Staff Access tab. */}

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
                      ) : m.status !== "removed" ? (
                        <>
                          <Btn variant="outline" style={{ fontSize: 11, padding: "5px 10px" }}
                            onClick={() => openMemberEdit(m)}>Edit</Btn>
                          <Btn variant="outline" style={{ fontSize: 11, padding: "5px 10px", borderColor: T.red, color: T.red }}
                            disabled={actionLoading === m.id + "-remove"}
                            onClick={() => handleRemove(m)}>
                            {actionLoading === m.id + "-remove" ? "…" : "Remove"}
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

      {editingMember && (
        <Modal title={`Edit ${editingMember.name}`} onClose={() => setEditingMember(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FieldInput label="Full Name" value={editMemberForm.name} onChange={v => setEM("name", v)} />
            <FieldSelect label="Role" value={editMemberForm.role} onChange={v => setEM("role", v)} options={[
              { value: "student",   label: "Student"    },
              { value: "faculty",   label: "Faculty"    },
              { value: "recruiter", label: "Recruiter"  },
              { value: "mentor",    label: "Mentor"     },
            ]} />
            <FieldInput label="Department" value={editMemberForm.department} onChange={v => setEM("department", v)} placeholder="e.g. CSE" />
            <FieldInput label="Batch" value={editMemberForm.batch} onChange={v => setEM("batch", v)} placeholder="e.g. B.tech 2026" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="outline" onClick={() => setEditingMember(null)}>Cancel</Btn>
              <Btn onClick={handleMemberEditSave} disabled={actionLoading === editingMember.id + "-edit"}>
                {actionLoading === editingMember.id + "-edit" ? "Saving…" : "Save"}
              </Btn>
            </div>
          </div>
        </Modal>
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

      {showJoinLink && (
        <Modal title="Get Invite Link" onClose={closeJoinLinkModal}>
          {!createdLink ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 12, color: T.ink4, lineHeight: 1.5 }}>
                Generate one link you can share with an entire batch — students who open it and sign up join automatically, no manual entry needed.
              </div>
              <FieldInput label="Label (optional)" value={linkForm.label} onChange={v => setLF("label", v)} placeholder="e.g. CSE 2026 Batch" />
              <FieldSelect label="Role" value={linkForm.role} onChange={v => setLF("role", v)} options={[
                { value: "student",   label: "Student"    },
                { value: "faculty",   label: "Faculty"    },
                { value: "recruiter", label: "Recruiter"  },
                { value: "mentor",    label: "Mentor"     },
              ]} />
              <FieldInput label="Department" value={linkForm.department} onChange={v => setLF("department", v)} placeholder="e.g. Computer Science" />
              {isCollege && <FieldInput label="Batch" value={linkForm.batch} onChange={v => setLF("batch", v)} placeholder="e.g. B.Tech CSE 2026" />}
              {linkError && <div style={{ fontSize: 12, color: T.red }}>{linkError}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn variant="outline" onClick={closeJoinLinkModal}>Cancel</Btn>
                <Btn onClick={handleCreateJoinLink} disabled={linkCreating}>{linkCreating ? "Creating…" : "Create Link"}</Btn>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: T.ink3 }}>Share this link — anyone who joins through it is added as <b>{createdLink.role}</b>{createdLink.department ? ` · ${createdLink.department}` : ""}{createdLink.batch ? ` · ${createdLink.batch}` : ""}.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input readOnly value={createdLink.url} onFocus={e => e.target.select()}
                  style={{ flex: 1, padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontFamily: MONO, color: T.ink, background: T.bg }} />
                <Btn onClick={copyLinkUrl}>{linkCopied ? "Copied ✓" : "Copy"}</Btn>
              </div>
              <div style={{ fontSize: 11, color: T.ink4 }}>This link doesn't expire and has unlimited uses unless you revoke it.</div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn variant="outline" onClick={closeJoinLinkModal}>Done</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 5 — COMMUNITY (beta gate on post creation)
// ═══════════════════════════════════════════════════════════════════════════════
function CommunityPage({ userData, user }) {
  const isCollege = (userData?.org_type || "college") !== "company"
  const [tab, setTab] = useState("posts")
  const orgId = user?.id
  const { data: posts, loading: postsLoading } = useOrgPosts(orgId)
  const { data: members } = useOrgMembers(orgId)

  const orgName     = userData?.org_name || (isCollege ? "Your Institution" : "Your Company")
  const orgLocation = userData?.org_location || ""
  const orgType     = isCollege ? (userData?.org_inst_type || "Institution") : (userData?.org_industry || "Company")
  const memberCount = members.filter(m => m.status === "active").length
  const coverPhoto  = userData?.org_cover_photo
  const profilePhoto= userData?.org_profile_photo
  const initials    = orgName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
  // College's third tab is an alumni directory; companies get a filtered
  // review feed instead (Company Review + Candidate Spotlight posts).
  const thirdTab      = isCollege ? "alumni" : "reviews"
  const thirdTabLabel = isCollege ? "Alumni" : "Reviews"
  const reviewPosts   = posts.filter(p => p.category === "Company Review" || p.category === "Candidate Spotlight")

  return (
    <div style={{ flex: 1, overflow: "auto", background: "transparent" }}>
      {/* Cover photo */}
      <div style={{
        width: "100%", height: 200, position: "relative",
        background: coverPhoto
          ? `url(${coverPhoto}) center/cover no-repeat`
          : "linear-gradient(135deg,rgba(220,139,24,.3),rgba(116,168,255,.2),rgba(11,10,8,1))",
        borderBottom: `1px solid ${T.border}`,
      }}>
        {/* Edit cover hint */}
        <button
          onClick={() => {}}
          style={{
            position: "absolute", bottom: 10, right: 14, padding: "6px 12px",
            background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)",
            border: `1px solid ${T.border}`, borderRadius: 10,
            color: T.ink3, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
          }}
        >
          ✏ Edit cover · go to Settings → Media
        </button>
      </div>

      {/* Profile strip */}
      <div style={{ padding: "0 24px 16px", borderBottom: `1px solid ${T.border}`, background: "rgba(255,255,255,.015)" }}>
        {/* Profile photo — overlaps cover */}
        <div style={{ marginTop: -44, marginBottom: 10, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{
            width: 88, height: 88, borderRadius: 20,
            background: profilePhoto ? "transparent" : "linear-gradient(135deg,#dc8b18,#f6c453)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 900, color: "#23170a",
            border: `3px solid #FFFFFF`, flexShrink: 0, overflow: "hidden",
            boxShadow: T.shadowM,
          }}>
            {profilePhoto
              ? <img src={profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials
            }
          </div>
          {/* 2026-07-31: removed the +Follow/Message buttons per product
              direction — this is the admin's own community view, following
              your own institution made no sense. */}
        </div>

        {/* Name + meta */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h2 style={{
              margin: 0, fontFamily: FONT_SERIF,
              fontStyle: "italic", fontWeight: 700, fontSize: 28,
              letterSpacing: "-0.02em", color: T.ink,
            }}>{orgName}</h2>
            {userData?.verified && (
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 20, height: 20, background: T.sky, borderRadius: "50%",
                fontSize: 11, color: "#fff", fontWeight: 900,
              }}>✓</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: T.ink3, marginBottom: 6 }}>
            {orgType}{orgLocation ? ` · ${orgLocation}` : ""}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: T.ink4 }}>
              <span style={{ fontWeight: 700, color: T.ink2 }}>{memberCount}</span> members
            </span>
            {userData?.org_website && (
              <a href={userData.org_website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.sky, textDecoration: "none" }}>
                🌐 {userData.org_website.replace(/https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border}`, padding: "0 24px", background: "rgba(255,255,255,.01)" }}>
        {[["posts", "Posts"], ["about", "About"], [thirdTab, thirdTabLabel]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "14px 16px 12px", background: "none", border: "none",
            fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
            color: tab === id ? T.ink : T.ink4,
            borderBottom: `2px solid ${tab === id ? T.gold : "transparent"}`,
            transition: "color .12s",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: "20px 24px", maxWidth: 680 }}>
        {/* 2026-07-31: the standalone sidebar "Posts" page is merged here —
            the Posts tab now hosts the full composer + feed (EventsPage in
            embedded mode) instead of a read-only mirror of it. */}
        {tab === "posts" && <EventsPage userData={userData} user={user} embedded />}

        {tab === "about" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(isCollege ? [
              { label: "Institution type", value: orgType },
              { label: "Location",         value: orgLocation || "—" },
              { label: "Website",          value: userData?.org_website || "—" },
              { label: "NAAC Grade",       value: userData?.org_naac_grade || "—" },
              { label: "Members",          value: memberCount },
            ] : [
              { label: "Industry",         value: orgType },
              { label: "Company size",     value: userData?.org_company_size || "—" },
              { label: "Website",          value: userData?.org_website || "—" },
              { label: "Hiring for",       value: (userData?.org_key_domains || []).join(", ") || "—" },
              { label: "Team members",     value: memberCount },
            ]).map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 12, color: T.ink4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>{r.label}</span>
                <span style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "alumni" && isCollege && (
          <div style={{ padding: "20px 0", textAlign: "center", color: T.ink4, fontSize: 13 }}>
            Alumni directory coming soon.
          </div>
        )}

        {tab === "reviews" && !isCollege && (
          postsLoading ? <Spinner /> : reviewPosts.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: T.ink4, fontSize: 13 }}>
              No reviews or candidate spotlights yet. Tag a post as <b style={{ color: T.gold }}>Company Review</b> or <b style={{ color: T.gold }}>Candidate Spotlight</b> from the Posts composer to have it show up here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {reviewPosts.map(post => { const b = POST_CATEGORY_BADGE[post.category]; return (
                <div key={post.id} style={{ border: `1px solid ${T.border}`, borderRadius: 22, background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))", padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ padding: "3px 9px", borderRadius: 999, border: `1px solid ${b.color}`, background: `${b.color}18`, color: b.color, fontSize: 10.5, fontWeight: 800 }}>{b.icon} {post.category}</span>
                    <span style={{ fontSize: 11, color: T.ink4 }}>{timeSince(post.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{post.title}</div>
                </div>
              )})}
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 6 — GROUPS (simplified for v1)
// ═══════════════════════════════════════════════════════════════════════════════
// 2026-08-02: real Groups feature, replacing the placeholder. Cohort/club/
// study-group membership is many-to-many (institution_group_members), so a
// student can sit in multiple groups at once — matches the original spec
// ("members can be tagged to multiple groups"). Groups are consumed by
// TasksPage as a real assignment target (assigned_to_group_id), not just a
// standalone directory — see the "→ Task" workflow note below.
const GROUP_TYPE_META = {
  cohort:      { label: "Cohort",      icon: "🎓", color: T.sky },
  club:        { label: "Club",        icon: "🏛", color: T.violet || T.gold },
  study_group: { label: "Study Group", icon: "📚", color: T.green },
  custom:      { label: "Custom",      icon: "🗂", color: T.ink4 },
}

function GroupsPage({ canonical, onNav }) {
  const institution = canonical?.institution
  const [groups, setGroups]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: "", groupType: "cohort", description: "" })
  const [creating, setCreating]   = useState(false)
  const [createError, setCreateError] = useState(null)
  const [openGroup, setOpenGroup] = useState(null) // group being viewed in detail

  const loadGroups = useCallback(async () => {
    if (!institution?.id) return
    setLoading(true)
    try {
      const res = await collegeApi.listGroups(institution.id)
      setGroups(res?.groups || [])
      setError(null)
    } catch (e) {
      setError(e.message || "Could not load groups")
    }
    setLoading(false)
  }, [institution?.id])

  useEffect(() => { loadGroups() }, [loadGroups])

  async function createGroup() {
    if (!createForm.name.trim()) { setCreateError("Name is required"); return }
    setCreating(true); setCreateError(null)
    try {
      await collegeApi.createGroup(institution.id, createForm)
      setShowCreate(false)
      setCreateForm({ name: "", groupType: "cohort", description: "" })
      await loadGroups()
    } catch (e) {
      setCreateError(e.message || "Could not create group")
    }
    setCreating(false)
  }

  async function archiveGroup(g) {
    if (!window.confirm(`Archive "${g.name}"? It will stop appearing here and in task assignment. Membership history is kept.`)) return
    try { await collegeApi.updateGroup(institution.id, g.id, { archived: true }); await loadGroups() }
    catch (_) {}
  }

  if (canonical?.loading && !institution) {
    return <PageShell><PageHeader title="Groups" sub="Manage cohorts, clubs, and study groups" /><EmptyState icon="⏳" title="Loading…" sub="" /></PageShell>
  }
  if (!institution) {
    return <PageShell><PageHeader title="Groups" sub="Manage cohorts, clubs, and study groups" /><EmptyState icon="🗂" title="No institution linked" sub="Groups become available once your institution workspace is set up." /></PageShell>
  }

  if (openGroup) {
    return (
      <GroupDetailPage
        institution={institution}
        group={openGroup}
        allStudents={canonical.students || []}
        onBack={() => { setOpenGroup(null); loadGroups() }}
        onGoToTasks={() => onNav && onNav("tasks")}
      />
    )
  }

  return (
    <PageShell>
      <PageHeader title="Groups" sub="Cohorts, clubs, and study groups — tag students into multiple groups and target tasks at them" />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Btn onClick={() => setShowCreate(true)} style={{ fontSize: 12, padding: "8px 16px" }}>+ New Group</Btn>
      </div>

      {error && <div style={{ color: T.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <EmptyState icon="⏳" title="Loading groups…" sub="" />
      ) : groups.length === 0 ? (
        <EmptyState icon="🗂" title="No groups yet" sub="Create a cohort, club, or study group, then add students to it. Groups can be selected as a task-assignment target." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {groups.map(g => {
            const meta = GROUP_TYPE_META[g.group_type] || GROUP_TYPE_META.custom
            return (
              <div key={g.id} onClick={() => setOpenGroup(g)} style={{
                background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))",
                border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 20 }}>{meta.icon}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: `${meta.color}18`, padding: "3px 8px", borderRadius: 999 }}>{meta.label}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginTop: 10 }}>{g.name}</div>
                {g.description && <div style={{ fontSize: 11, color: T.ink4, marginTop: 4 }}>{g.description}</div>}
                <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11, color: T.ink3 }}>
                  <span>{g.memberCount} member{g.memberCount === 1 ? "" : "s"}</span>
                  {g.avgElo != null && <span>avg ELO {g.avgElo}</span>}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <Btn variant="ghost" onClick={(e) => { e.stopPropagation(); archiveGroup(g) }} style={{ fontSize: 10, padding: "3px 8px", color: T.red }}>Archive</Btn>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <Modal title="New Group" onClose={() => { setShowCreate(false); setCreateError(null) }} width={420}>
          {/* 2026-08-02: solid (non-translucent) field backgrounds — the shared
              Modal/Card are deliberately semi-transparent everywhere else in
              the app, but that let the page content behind bleed through the
              input boxes here and made typed text hard to read. Scoped fix,
              this modal only — not touching the shared Modal/Card component. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Name <span style={{ color: T.red }}>*</span></label>
              <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Final Year CSE 2026" autoFocus
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Type</label>
              <select value={createForm.groupType} onChange={e => setCreateForm(f => ({ ...f, groupType: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box" }}>
                {Object.entries(GROUP_TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Description (optional)</label>
              <textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                rows={2} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            {createError && <div style={{ color: T.red, fontSize: 11 }}>{createError}</div>}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
              <Btn onClick={createGroup} disabled={creating} style={{ fontSize: 12, padding: "10px 32px" }}>
                {creating ? "Creating…" : "Create Group"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}

function GroupDetailPage({ institution, group, allStudents, onBack, onGoToTasks }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch]   = useState("")
  const [selected, setSelected] = useState([])
  const [adding, setAdding]   = useState(false)
  const [removingId, setRemovingId] = useState(null)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await collegeApi.listGroupMembers(institution.id, group.id)
      setMembers(res?.members || [])
      setError(null)
    } catch (e) { setError(e.message || "Could not load members") }
    setLoading(false)
  }, [institution.id, group.id])

  useEffect(() => { loadMembers() }, [loadMembers])

  const memberIds = new Set(members.map(m => m.id))
  const candidates = (allStudents || [])
    .filter(s => !memberIds.has(s.id))
    .filter(s => !search || `${s.roll_number || ""} ${s.department || ""}`.toLowerCase().includes(search.toLowerCase()))

  async function addSelected() {
    if (selected.length === 0) return
    setAdding(true)
    try {
      await collegeApi.addGroupMembers(institution.id, group.id, selected)
      setSelected([]); setShowAdd(false); setSearch("")
      await loadMembers()
    } catch (_) {}
    setAdding(false)
  }

  async function removeMember(studentId) {
    setRemovingId(studentId)
    try { await collegeApi.removeGroupMember(institution.id, group.id, studentId); await loadMembers() }
    catch (_) {}
    setRemovingId(null)
  }

  const meta = GROUP_TYPE_META[group.group_type] || GROUP_TYPE_META.custom

  return (
    <PageShell>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Btn variant="ghost" onClick={onBack} style={{ fontSize: 12, padding: "4px 8px" }}>← Groups</Btn>
      </div>
      <PageHeader title={`${meta.icon} ${group.name}`} sub={`${meta.label}${group.description ? " · " + group.description : ""}`} />

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))",
        border: `1px solid ${T.border}`, borderRadius: 14, padding: 14, marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, color: T.ink3 }}>
          {members.length} member{members.length === 1 ? "" : "s"} · this group can be selected as a target when creating a task in <b>Tasks</b>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="outline" onClick={onGoToTasks} style={{ fontSize: 11, padding: "6px 12px" }}>Assign a Task →</Btn>
          <Btn onClick={() => setShowAdd(true)} style={{ fontSize: 11, padding: "6px 12px" }}>+ Add Members</Btn>
        </div>
      </div>

      {error && <div style={{ color: T.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <EmptyState icon="⏳" title="Loading members…" sub="" />
      ) : members.length === 0 ? (
        <EmptyState icon="👥" title="No members yet" sub="Add students from your roster to this group." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map(m => (
            <div key={m.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px", borderRadius: 12, border: `1px solid ${T.border}`,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{m.roll_number || "—"}</div>
                <div style={{ fontSize: 11, color: T.ink4 }}>{m.department || "—"} · {m.batch || "—"} · ELO {m.elo_current ?? "—"}</div>
              </div>
              <Btn variant="ghost" onClick={() => removeMember(m.id)} disabled={removingId === m.id} style={{ fontSize: 10, padding: "4px 8px", color: T.red }}>
                {removingId === m.id ? "…" : "Remove"}
              </Btn>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title={`Add Members — ${group.name}`} onClose={() => { setShowAdd(false); setSelected([]); setSearch("") }} width={480}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roll number or department…"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box", marginBottom: 10 }} />
          <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {candidates.length === 0 && <div style={{ fontSize: 12, color: T.ink4, padding: 10 }}>No matching students outside this group.</div>}
            {candidates.map(s => {
              const checked = selected.includes(s.id)
              return (
                <label key={s.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  borderRadius: 10, border: `1px solid ${checked ? T.gold : T.border}`,
                  background: checked ? `${T.gold}12` : "transparent", cursor: "pointer",
                }}>
                  <input type="checkbox" checked={checked} onChange={() => {
                    setSelected(sel => checked ? sel.filter(id => id !== s.id) : [...sel, s.id])
                  }} />
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: T.ink }}>{s.roll_number || s.id}</div>
                    <div style={{ fontSize: 11, color: T.ink4 }}>{s.department || "—"} · {s.batch || "—"} · ELO {s.elo ?? "—"}</div>
                  </div>
                </label>
              )
            })}
          </div>
          <Btn onClick={addSelected} disabled={adding || selected.length === 0} style={{ fontSize: 12, padding: "9px 0", marginTop: 12, width: "100%" }}>
            {adding ? "Adding…" : `Add ${selected.length || ""} to Group`}
          </Btn>
        </Modal>
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE — JOBS (2026-08-03)
// Colleges post into the shared `jobs` table (institution_id-scoped) —
// Launchpad already reads every row there for the student feed, so a
// college's posting appears to students automatically, no separate feed to
// build. Company accounts (org_type='company') use the same nav slot but a
// different, account-scoped API (jobsApi.mine/create/update) since they
// have no institution_staff concept at all — just their own profile.
// ═══════════════════════════════════════════════════════════════════════════════
const JOB_TYPE_OPTIONS = ["Full-time", "Internship", "Part-time", "Contract"]
const WORK_MODE_OPTIONS = ["On-site", "Remote", "Hybrid"]

function JobsPage({ canonical, userData }) {
  const isCollege = (userData?.org_type || "college") !== "company"
  const institution = canonical?.institution
  // College side: only college_admin (never placement_officer) may post/edit —
  // matches the backend's requireCollegeAdminOnly() gate exactly. Staff below
  // that level still see the list (read-only) since the GET route allows any
  // active staff member.
  const canManage = isCollege ? canonical?.role === "college_admin" : true

  const [jobs, setJobs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [form, setForm] = useState({
    title: "", location: "", jobType: "Full-time", workMode: "On-site",
    salaryMin: "", salaryMax: "", jdSummary: "", jdFull: "",
  })
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState(null)

  const loadJobs = useCallback(async () => {
    if (isCollege && !institution?.id) return
    setLoading(true)
    try {
      const res = isCollege ? await collegeApi.listJobs(institution.id) : await jobsApi.mine()
      setJobs(res?.jobs || [])
      setError(null)
    } catch (e) {
      setError(e.message || "Could not load jobs")
    }
    setLoading(false)
  }, [isCollege, institution?.id])

  useEffect(() => { loadJobs() }, [loadJobs])

  function resetForm() {
    setForm({ title: "", location: "", jobType: "Full-time", workMode: "On-site", salaryMin: "", salaryMax: "", jdSummary: "", jdFull: "" })
    setEditingJob(null)
    setSaveError(null)
  }

  function openEdit(job) {
    setEditingJob(job)
    setForm({
      title: job.title || "", location: job.location || "",
      jobType: job.job_type || "Full-time", workMode: job.work_mode || "On-site",
      salaryMin: job.salary_min ?? "", salaryMax: job.salary_max ?? "",
      jdSummary: job.jd_summary || "", jdFull: job.jd_full || "",
    })
    setShowCreate(true)
  }

  async function saveJob() {
    if (!form.title.trim()) { setSaveError("Title is required"); return }
    setSaving(true); setSaveError(null)
    const payload = {
      title: form.title.trim(),
      location: form.location.trim() || null,
      job_type: form.jobType,
      work_mode: form.workMode,
      salary_min: form.salaryMin ? Number(form.salaryMin) : null,
      salary_max: form.salaryMax ? Number(form.salaryMax) : null,
      jd_summary: form.jdSummary.trim() || null,
      jd_full: form.jdFull.trim() || null,
    }
    try {
      if (editingJob) {
        if (isCollege) await collegeApi.updateJob(institution.id, editingJob.id, payload)
        else await jobsApi.update(editingJob.id, payload)
      } else {
        if (isCollege) await collegeApi.createJob(institution.id, payload)
        else await jobsApi.create(payload)
      }
      setShowCreate(false)
      resetForm()
      await loadJobs()
    } catch (e) {
      setSaveError(e.message || "Could not save job")
    }
    setSaving(false)
  }

  async function toggleActive(job) {
    try {
      if (isCollege) await collegeApi.updateJob(institution.id, job.id, { isActive: !job.is_active })
      else await jobsApi.update(job.id, { isActive: !job.is_active })
      await loadJobs()
    } catch (_) {}
  }

  if (isCollege && canonical?.loading && !institution) {
    return <PageShell><PageHeader title="Jobs" sub="Post job openings for your students" /><EmptyState icon="⏳" title="Loading…" sub="" /></PageShell>
  }
  if (isCollege && !institution) {
    return <PageShell><PageHeader title="Jobs" sub="Post job openings for your students" /><EmptyState icon="💼" title="No institution linked" sub="Jobs become available once your institution workspace is set up." /></PageShell>
  }

  return (
    <PageShell>
      <PageHeader
        title="Jobs"
        sub={isCollege ? "Post openings directly to your students — these appear in their job feed automatically" : "Manage your job postings"}
      />

      {canManage && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <Btn onClick={() => { resetForm(); setShowCreate(true) }} style={{ fontSize: 12, padding: "8px 16px" }}>+ Post Job</Btn>
        </div>
      )}
      {isCollege && !canManage && (
        <div style={{ fontSize: 11.5, color: T.ink4, marginBottom: 14 }}>Only the college admin can post or edit jobs — you can view what's live below.</div>
      )}

      {error && <div style={{ color: T.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <EmptyState icon="⏳" title="Loading jobs…" sub="" />
      ) : jobs.length === 0 ? (
        <EmptyState icon="💼" title="No jobs posted yet" sub={canManage ? "Post your first opening — students will see it in their job feed." : "Nothing posted yet."} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {jobs.map(j => (
            <div key={j.id} style={{
              background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))",
              border: `1px solid ${T.border}`, borderRadius: 16, padding: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{j.title}</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: j.is_active ? T.green : T.ink4, background: j.is_active ? `${T.green}18` : "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 999 }}>
                  {j.is_active ? "Live" : "Inactive"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T.ink4, marginTop: 4 }}>{[j.job_type, j.work_mode, j.location].filter(Boolean).join(" · ")}</div>
              {(j.salary_min || j.salary_max) && (
                <div style={{ fontSize: 11, color: T.ink3, marginTop: 6 }}>
                  ₹{j.salary_min ? `${j.salary_min}L` : "—"}{j.salary_max ? ` – ${j.salary_max}L` : ""}
                </div>
              )}
              {j.jd_summary && <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 8, lineHeight: 1.5 }}>{j.jd_summary}</div>}
              {canManage && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <Btn variant="ghost" onClick={() => openEdit(j)} style={{ fontSize: 10, padding: "3px 8px" }}>Edit</Btn>
                  <Btn variant="ghost" onClick={() => toggleActive(j)} style={{ fontSize: 10, padding: "3px 8px", color: j.is_active ? T.red : T.green }}>
                    {j.is_active ? "Deactivate" : "Reactivate"}
                  </Btn>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title={editingJob ? "Edit Job" : "Post Job"} onClose={() => { setShowCreate(false); resetForm() }} width={480}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Title <span style={{ color: T.red }}>*</span></label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Software Engineer Intern" autoFocus
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Job Type</label>
                <select value={form.jobType} onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box" }}>
                  {JOB_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Work Mode</label>
                <select value={form.workMode} onChange={e => setForm(f => ({ ...f, workMode: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box" }}>
                  {WORK_MODE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Bengaluru, India"
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Salary Min (LPA)</label>
                <input type="number" value={form.salaryMin} onChange={e => setForm(f => ({ ...f, salaryMin: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Salary Max (LPA)</label>
                <input type="number" value={form.salaryMax} onChange={e => setForm(f => ({ ...f, salaryMax: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Short Summary</label>
              <textarea value={form.jdSummary} onChange={e => setForm(f => ({ ...f, jdSummary: e.target.value }))}
                rows={2} placeholder="One or two lines students see on the job card"
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Full Description (optional)</label>
              <textarea value={form.jdFull} onChange={e => setForm(f => ({ ...f, jdFull: e.target.value }))}
                rows={4}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            {saveError && <div style={{ color: T.red, fontSize: 11 }}>{saveError}</div>}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
              <Btn onClick={saveJob} disabled={saving} style={{ fontSize: 12, padding: "10px 32px" }}>
                {saving ? "Saving…" : editingJob ? "Save Changes" : "Post Job"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE — UNIVERSITY / MULTI-CAMPUS (2026-08-02)
// institutions.id is unchanged everywhere else in the codebase — a
// university_groups row just clusters several existing campus institutions
// under one university-level admin. Attaching/creating a campus grants that
// admin an institution_staff row on it, so every other existing route works
// unmodified. See backend/server/routes/college.js for the full design note.
// ═══════════════════════════════════════════════════════════════════════════════
function UniversityPage({ canonical }) {
  const institution = canonical?.institution
  const universityGroup = canonical?.universityGroup
  const campuses = canonical?.campuses || []

  const [groupNameInput, setGroupNameInput] = useState("")
  const [creatingGroup, setCreatingGroup]   = useState(false)
  const [showAttach, setShowAttach]         = useState(false)
  const [attachMode, setAttachMode]         = useState("new") // "new" | "existing"
  const [attachForm, setAttachForm]         = useState({ name: "", type: "college", institutionId: "" })
  const [attaching, setAttaching]           = useState(false)
  const [formError, setFormError]           = useState(null)
  const [overview, setOverview]             = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(false)

  const loadOverview = useCallback(async (groupId) => {
    if (!groupId) return
    setOverviewLoading(true)
    try {
      const res = await collegeApi.getUniversityOverview(groupId)
      setOverview(res)
    } catch (_) {}
    setOverviewLoading(false)
  }, [])

  useEffect(() => { if (universityGroup?.id) loadOverview(universityGroup.id) }, [universityGroup?.id, loadOverview])

  async function createGroup() {
    if (!groupNameInput.trim()) return
    setCreatingGroup(true)
    try {
      await collegeApi.createUniversityGroup(groupNameInput.trim())
      await canonical.reloadUniversityGroup()
    } catch (e) {
      setFormError(e.message || "Could not create university group")
    }
    setCreatingGroup(false)
  }

  async function attachCampus() {
    setFormError(null)
    if (attachMode === "existing" && !attachForm.institutionId.trim()) {
      setFormError("Enter the campus's institution id or code")
      return
    }
    if (attachMode === "new" && !attachForm.name.trim()) {
      setFormError("Campus name is required")
      return
    }
    setAttaching(true)
    try {
      const opts = attachMode === "existing"
        ? { institutionId: attachForm.institutionId.trim() }
        : { name: attachForm.name.trim(), type: attachForm.type }
      await collegeApi.addCampusToGroup(universityGroup.id, opts)
      setShowAttach(false)
      setAttachForm({ name: "", type: "college", institutionId: "" })
      await canonical.reloadUniversityGroup()
      await loadOverview(universityGroup.id)
    } catch (e) {
      setFormError(e.message || "Could not attach campus")
    }
    setAttaching(false)
  }

  async function detachCampus(campus) {
    if (!window.confirm(`Remove "${campus.name}" from this university group? Its data (students, drives, placements) is untouched — it just stops appearing in the rollup here.`)) return
    try {
      await collegeApi.removeCampusFromGroup(universityGroup.id, campus.id)
      await canonical.reloadUniversityGroup()
      await loadOverview(universityGroup.id)
    } catch (_) {}
  }

  function switchTo(campus) {
    if (canonical?.switchInstitution) canonical.switchInstitution(campus.id)
  }

  if (canonical?.loading && !institution) {
    return <PageShell><PageHeader title="Campuses" sub="Manage multiple campuses under one university" /><EmptyState icon="⏳" title="Loading…" sub="" /></PageShell>
  }
  if (!institution) {
    return <PageShell><PageHeader title="Campuses" sub="Manage multiple campuses under one university" /><EmptyState icon="🏛" title="No institution linked" sub="Set up your institution workspace first." /></PageShell>
  }

  if (!universityGroup) {
    return (
      <PageShell>
        <PageHeader title="Campuses" sub="If your university has more than one campus, group them here to manage and compare them from one place" />
        <div style={{
          background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))",
          border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, maxWidth: 480,
        }}>
          <div style={{ fontSize: 13, color: T.ink3, marginBottom: 14 }}>
            This creates a university group with <strong style={{ color: T.ink }}>{institution.name}</strong> as its first campus.
            You can attach or create more campuses afterward. Existing single-campus institutions are unaffected unless you do this.
          </div>
          <input value={groupNameInput} onChange={e => setGroupNameInput(e.target.value)}
            placeholder="e.g. VIT University"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box", marginBottom: 12 }} />
          {formError && <div style={{ color: T.red, fontSize: 11, marginBottom: 10 }}>{formError}</div>}
          <Btn onClick={createGroup} disabled={creatingGroup} style={{ fontSize: 12, padding: "10px 24px" }}>
            {creatingGroup ? "Creating…" : "Create University Group"}
          </Btn>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader title={universityGroup.name} sub="Cross-campus rollup — switch which campus your dashboard is scoped to, or attach another campus" />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Btn onClick={() => setShowAttach(true)} style={{ fontSize: 12, padding: "8px 16px" }}>+ Attach Campus</Btn>
      </div>

      {overview && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
          {[
            ["Campuses", campuses.length],
            ["Total students", overview.totals.students],
            ["Total placed", overview.totals.placed],
            ["Avg ELO", overview.totals.avgElo],
          ].map(([label, value]) => (
            <div key={label} style={{
              background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))",
              border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.ink4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.ink, marginTop: 4, fontFamily: MONO }}>{value}</div>
            </div>
          ))}
        </div>
      )}
      {overviewLoading && !overview && <div style={{ fontSize: 12, color: T.ink4, marginBottom: 12 }}>Loading rollup…</div>}

      {campuses.length === 0 ? (
        <EmptyState icon="🏛" title="No campuses attached yet" sub="Attach an existing campus you already administer, or create a brand-new one." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {campuses.map(c => {
            const campusStats = overview?.campuses?.find(oc => oc.id === c.id)
            const isActive = c.id === institution.id
            return (
              <div key={c.id} style={{
                background: isActive ? "linear-gradient(180deg,rgba(246,196,83,0.10),rgba(246,196,83,0.03))" : "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))",
                border: `1px solid ${isActive ? "#f6c45355" : T.border}`, borderRadius: 16, padding: 16,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{c.name}</div>
                  {isActive && <span style={{ fontSize: 10, fontWeight: 700, color: "#f6c453", background: "#f6c45318", padding: "3px 8px", borderRadius: 999 }}>Active</span>}
                </div>
                <div style={{ fontSize: 11, color: T.ink4, marginTop: 4 }}>{c.type} · {c.verification_level || "unverified"}</div>
                {campusStats && (
                  <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11, color: T.ink3 }}>
                    <span>{campusStats.students} students</span>
                    <span>{campusStats.placed} placed</span>
                    <span>avg ELO {campusStats.avgElo}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                  {!isActive ? (
                    <Btn variant="ghost" onClick={() => switchTo(c)} style={{ fontSize: 10, padding: "3px 10px" }}>Switch to this campus</Btn>
                  ) : <span />}
                  <Btn variant="ghost" onClick={() => detachCampus(c)} style={{ fontSize: 10, padding: "3px 8px", color: T.red }}>Remove</Btn>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAttach && (
        <Modal title="Attach Campus" onClose={() => { setShowAttach(false); setFormError(null) }} width={440}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant={attachMode === "new" ? "primary" : "outline"} onClick={() => setAttachMode("new")} style={{ fontSize: 11, padding: "6px 12px", flex: 1 }}>Create new campus</Btn>
              <Btn variant={attachMode === "existing" ? "primary" : "outline"} onClick={() => setAttachMode("existing")} style={{ fontSize: 11, padding: "6px 12px", flex: 1 }}>Attach existing</Btn>
            </div>
            {attachMode === "new" ? (
              <>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Campus name <span style={{ color: T.red }}>*</span></label>
                  <input value={attachForm.name} onChange={e => setAttachForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. VIT Chennai" autoFocus
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Type</label>
                  <select value={attachForm.type} onChange={e => setAttachForm(f => ({ ...f, type: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box" }}>
                    <option value="college">College</option>
                    <option value="university">University</option>
                  </select>
                </div>
                <div style={{ fontSize: 11, color: T.ink4 }}>Creates a brand-new campus institution, owned by you, and attaches it immediately. You'll need to import its roster separately.</div>
              </>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Institution id or code <span style={{ color: T.red }}>*</span></label>
                  <input value={attachForm.institutionId} onChange={e => setAttachForm(f => ({ ...f, institutionId: e.target.value }))}
                    placeholder="Institution UUID" autoFocus
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.borderM}`, borderRadius: 10, fontSize: 13, color: T.ink, fontFamily: FONT, outline: "none", background: "#181510", boxSizing: "border-box" }} />
                </div>
                <div style={{ fontSize: 11, color: T.ink4 }}>You must already be an admin of that campus for this to work — it will not transfer a campus someone else administers.</div>
              </>
            )}
            {formError && <div style={{ color: T.red, fontSize: 11 }}>{formError}</div>}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
              <Btn onClick={attachCampus} disabled={attaching} style={{ fontSize: 12, padding: "10px 32px" }}>
                {attaching ? "Attaching…" : "Attach Campus"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
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
// PAGE 8 — POSTS (Institution LinkedIn-style feed)
// ═══════════════════════════════════════════════════════════════════════════════
const POST_CATEGORIES_COLLEGE = ["Update", "Achievement", "Placement News", "Event Recap"]
const POST_CATEGORIES_COMPANY = ["Update", "Company Insight", "Company Review", "Candidate Spotlight"]
const POST_CATEGORY_BADGE = {
  "Update":             { icon: "📝", color: "#6B7280" },
  "Achievement":        { icon: "🏆", color: "#D97706" },
  "Placement News":     { icon: "🎓", color: "#059669" },
  "Event Recap":        { icon: "📅", color: "#3D4EAC" },
  "Company Insight":    { icon: "💡", color: "#3D4EAC" },
  "Company Review":     { icon: "⭐", color: "#D97706" },
  "Candidate Spotlight":{ icon: "🌟", color: "#059669" },
}

// Stable no-op wrapper for embedded mode — must live at module level, NOT
// inside EventsPage (see the Wrap comment there for the focus-loss bug an
// inline definition caused).
const EmbedPassthrough = ({ children }) => <>{children}</>

// Per-post ⋯ menu (2026-08-02). Houses the actions that used to sit exposed
// under every post (Edit/Delete) plus a couple of genuinely useful,
// non-copied extras — inspired by, not cloned from, the LinkedIn-style
// reference the product ask pointed at. Module-level component (same
// stable-identity reasoning as EmbedPassthrough) since it's instantiated
// once per post in a list.
function PostThreeDotMenu({ onEdit, onDelete, onCopyLink }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const handle = e => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])
  const item = (label, fn, danger = false) => (
    <button
      onClick={() => { setOpen(false); fn() }}
      style={{
        display: "block", width: "100%", textAlign: "left", padding: "9px 14px",
        background: "none", border: "none", cursor: "pointer", fontFamily: FONT,
        fontSize: 12.5, color: danger ? T.red : T.ink2,
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
      onMouseLeave={e => e.currentTarget.style.background = "none"}
    >{label}</button>
  )
  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} title="Post options" style={{
        background: "none", border: "none", color: T.ink4, fontSize: 16,
        cursor: "pointer", padding: "2px 6px", borderRadius: 6, lineHeight: 1,
      }}
        onMouseEnter={e => e.currentTarget.style.color = T.ink}
        onMouseLeave={e => e.currentTarget.style.color = T.ink4}
      >⋯</button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 40,
          minWidth: 172, background: "#161310", border: `1px solid ${T.border}`,
          borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.45)", overflow: "hidden",
          padding: "4px 0",
        }}>
          {item("📋 Copy to share", onCopyLink)}
          <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
          {item("✏️ Edit post", onEdit)}
          {item("🗑 Delete post", onDelete, true)}
        </div>
      )}
    </div>
  )
}

// embedded=true (2026-07-31): renders composer+feed without its own
// PageShell/header so CommunityPage can host it as its Posts tab — the
// standalone sidebar "Posts" page was merged into Community per product
// direction. The component itself is unchanged otherwise.
function EventsPage({ userData, user, embedded = false }) {
  const orgId = user?.id
  const { data: posts, loading, error, reload } = useOrgPosts(orgId)
  const isCollege = (userData?.org_type || "college") !== "company"
  const categoryOptions = isCollege ? POST_CATEGORIES_COLLEGE : POST_CATEGORIES_COMPANY

  const [text, setText]             = useState("")
  const [category, setCategory]     = useState(categoryOptions[0])
  const [imgFile, setImgFile]       = useState(null)
  const [imgPreview, setImgPreview] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [pubError, setPubError]     = useState(null)
  const [editingPostId, setEditingPostId] = useState(null) // non-null = composer is editing this post
  const fileRef                     = useRef(null)

  const orgName  = userData?.org_name || "Your Institution"
  const initials = orgName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
  const profilePhoto = userData?.org_profile_photo

  function handleImagePick(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setImgFile(f)
    setImgPreview(URL.createObjectURL(f))
  }

  async function handlePublish() {
    if (!text.trim()) return
    setPublishing(true); setPubError(null)
    try {
      let imageUrl = null
      if (imgFile) {
        try { imageUrl = await uploadOrgPhoto(orgId, imgFile, "post") } catch (_) { /* skip image on failure */ }
      }
      if (editingPostId) {
        // Edit mode (2026-08-01): the composer updates the existing row.
        // Image only replaced if a new one was picked — otherwise untouched.
        const patch = { title: text.trim(), category }
        if (imageUrl) patch.description = imageUrl
        const { error: updateErr } = await supabase.from("org_events").update(patch).eq("id", editingPostId).eq("org_id", orgId)
        if (updateErr) throw new Error(updateErr.message)
        await auditLog(orgId, orgId, userData?.name || "Admin",
          `Edited a ${category.toLowerCase()} post`, "post.updated", "post", editingPostId, { category })
      } else {
        const today = new Date().toISOString().split("T")[0]
        const { error: insertErr } = await supabase.from("org_events").insert({
          org_id:      orgId,
          title:       text.trim(),
          description: imageUrl || "",
          type:        "post",
          category,
          event_date:  today,
          status:      "published",
          created_by:  orgId,
        })
        if (insertErr) throw new Error(insertErr.message)
        await auditLog(orgId, orgId, userData?.name || "Admin",
          `Published a ${category.toLowerCase()} post`, "post.created", "post", "", { category })
      }
      setText(""); setImgFile(null); setImgPreview(null); setCategory(categoryOptions[0]); setEditingPostId(null)
      reload()
    } catch (e) {
      setPubError(e.message)
    } finally {
      setPublishing(false)
    }
  }

  function startEdit(post) {
    setEditingPostId(post.id)
    setText(post.title || "")
    if (post.category && categoryOptions.includes(post.category)) setCategory(post.category)
    // Bring the user to the composer so it's obvious edit mode is active.
    try { window.scrollTo({ top: 0, behavior: "smooth" }) } catch {}
  }

  async function handleDelete(post) {
    await supabase.from("org_events").delete().eq("id", post.id)
    reload()
  }

  // ── Engagement row (2026-08-02) ─────────────────────────────────────────
  // Replaces the exposed Revise/Take-down row with a Like/Comment/Share-
  // shaped row using fresh terminology, backed by two small real tables
  // (org_event_acknowledgements, org_event_comments) — not faked counters.
  // Edit/Delete moved into PostThreeDotMenu above.
  const [ackState, setAckState]         = useState({})   // { [postId]: { count, mine } }
  const [discussOpenId, setDiscussOpenId] = useState(null)
  const [comments, setComments]         = useState({})   // { [postId]: [...] }
  const [commentDraft, setCommentDraft] = useState({})   // { [postId]: text }
  const [shareMsgId, setShareMsgId]     = useState(null)

  useEffect(() => {
    if (!posts || posts.length === 0) { setAckState({}); return }
    let cancelled = false
    ;(async () => {
      const ids = posts.map(p => p.id)
      const { data } = await supabase.from("org_event_acknowledgements").select("event_id, user_id").in("event_id", ids)
      if (cancelled) return
      const next = {}
      for (const id of ids) next[id] = { count: 0, mine: false }
      for (const row of data || []) {
        if (!next[row.event_id]) next[row.event_id] = { count: 0, mine: false }
        next[row.event_id].count += 1
        if (row.user_id === user?.id) next[row.event_id].mine = true
      }
      setAckState(next)
    })()
    return () => { cancelled = true }
  }, [posts, user?.id])

  async function toggleAck(post) {
    const cur = ackState[post.id] || { count: 0, mine: false }
    const nextMine = !cur.mine
    setAckState(s => ({ ...s, [post.id]: { count: cur.count + (nextMine ? 1 : -1), mine: nextMine } }))
    try {
      if (nextMine) {
        const { error } = await supabase.from("org_event_acknowledgements").insert({ event_id: post.id, user_id: user.id })
        if (error) throw error
      } else {
        const { error } = await supabase.from("org_event_acknowledgements").delete().eq("event_id", post.id).eq("user_id", user.id)
        if (error) throw error
      }
    } catch (_) {
      setAckState(s => ({ ...s, [post.id]: cur })) // revert on failure
    }
  }

  async function toggleDiscuss(post) {
    const willOpen = discussOpenId !== post.id
    setDiscussOpenId(willOpen ? post.id : null)
    if (willOpen && !comments[post.id]) {
      const { data } = await supabase
        .from("org_event_comments")
        .select("id, body, user_id, created_at, profiles:user_id(name)")
        .eq("event_id", post.id)
        .order("created_at", { ascending: true })
      setComments(c => ({ ...c, [post.id]: data || [] }))
    }
  }

  async function submitComment(post) {
    const body = (commentDraft[post.id] || "").trim()
    if (!body) return
    const { data, error } = await supabase
      .from("org_event_comments")
      .insert({ event_id: post.id, user_id: user.id, body })
      .select("id, body, user_id, created_at, profiles:user_id(name)")
      .single()
    if (!error && data) {
      setComments(c => ({ ...c, [post.id]: [...(c[post.id] || []), data] }))
      setCommentDraft(d => ({ ...d, [post.id]: "" }))
    }
  }

  // The app is a single-page, state-driven client with no per-institution
  // or per-post URL routing yet (no react-router), so there is no real,
  // externally-openable deep link to hand out. Rather than paste a URL that
  // silently 404s for whoever receives it, share the post content itself
  // plus the app's base URL — honest about what actually exists today.
  function copyPostLink(post) {
    const shareText = `${orgName} on Capabilio:\n\n${post.title || ""}\n\n${window.location.origin}`
    const done = () => { setShareMsgId(post.id); setTimeout(() => setShareMsgId(null), 2000) }
    if (navigator.share) {
      navigator.share({ title: orgName, text: shareText }).catch(() => {})
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(done).catch(() => {})
    }
  }

  // Wrapper must be a STABLE component type — defining it inline here
  // recreated it every render, remounting the whole subtree per keystroke
  // (textarea lost focus after every character). EmbedPassthrough is
  // module-level, so identity is stable across renders.
  const Wrap = embedded ? EmbedPassthrough : PageShell
  return (
    <Wrap>
      {!embedded && (
        <div style={{ marginBottom: 22 }}>
          <h1 style={{
            margin: 0, fontFamily: FONT_SERIF,
            fontStyle: "italic", fontWeight: 700, fontSize: 34,
            letterSpacing: "-0.02em", lineHeight: 1.05, color: T.ink,
          }}>
            Institution <span style={{ color: T.gold }}>posts</span>
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: T.ink4 }}>Visible to anyone who views your institution's public profile</p>
        </div>
      )}

      {/* Post composer */}
      <div style={{
        border: `1px solid ${T.border}`, borderRadius: 22,
        background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))",
        padding: 18, marginBottom: 20,
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: profilePhoto ? "transparent" : "linear-gradient(135deg,#dc8b18,#f6c453)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 900, color: "#23170a",
            overflow: "hidden", border: `1px solid ${T.border}`,
          }}>
            {profilePhoto ? <img src={profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
          </div>

          {/* Text area */}
          <div style={{ flex: 1 }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Share an update from ${orgName}…`}
              rows={3}
              style={{
                width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`,
                borderRadius: 14, fontSize: 13.5, fontFamily: FONT, outline: "none",
                background: "rgba(255,255,255,0.05)", resize: "none", color: T.ink,
                lineHeight: 1.55, boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = T.gold}
              onBlur={e => e.target.style.borderColor = T.border}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {categoryOptions.map(c => {
                const on = category === c
                const badge = POST_CATEGORY_BADGE[c]
                return (
                  <button key={c} type="button" onClick={() => setCategory(c)} style={{
                    padding: "5px 11px", borderRadius: 999,
                    border: `1px solid ${on ? badge.color : T.border}`,
                    background: on ? `${badge.color}22` : "transparent",
                    color: on ? badge.color : T.ink4,
                    fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                  }}>
                    {badge.icon} {c}
                  </button>
                )
              })}
            </div>

            {imgPreview && (
              <div style={{ position: "relative", marginTop: 10, display: "inline-block" }}>
                <img src={imgPreview} alt="preview" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 12, border: `1px solid ${T.border}` }} />
                <button onClick={() => { setImgFile(null); setImgPreview(null) }} style={{
                  position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.6)",
                  border: "none", borderRadius: "50%", width: 22, height: 22,
                  color: T.ink, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>✕</button>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImagePick} style={{ display: "none" }} />
                <button onClick={() => fileRef.current?.click()} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
                  border: `1px solid ${T.border}`, borderRadius: 10, background: "transparent",
                  color: T.ink4, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                }}
                  onMouseEnter={e => e.currentTarget.style.color = T.ink}
                  onMouseLeave={e => e.currentTarget.style.color = T.ink4}
                >
                  📷 Photo
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {pubError && <span style={{ fontSize: 11, color: T.red }}>{pubError}</span>}
                {editingPostId && (
                  <Btn variant="outline" onClick={() => { setEditingPostId(null); setText(""); setCategory(categoryOptions[0]) }} style={{ fontSize: 12 }}>
                    Cancel edit
                  </Btn>
                )}
                <Btn onClick={handlePublish} disabled={publishing || !text.trim()}>
                  {publishing ? (editingPostId ? "Saving…" : "Publishing…") : (editingPostId ? "Save changes" : "Publish post")}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts feed */}
      {loading ? <Spinner /> : error ? (
        <div style={{ padding: 16, color: T.red, fontSize: 13 }}>Failed to load posts: {error}</div>
      ) : posts.length === 0 ? (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 18, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✍️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>No posts yet</div>
          <div style={{ fontSize: 13, color: T.ink4 }}>Write your first post above. It'll appear on your public profile.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {posts.map(post => (
            <div key={post.id} style={{
              border: `1px solid ${T.border}`, borderRadius: 22,
              background: "linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.026))",
              padding: 18,
            }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: profilePhoto ? "transparent" : "linear-gradient(135deg,#dc8b18,#f6c453)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 900, color: "#23170a",
                  overflow: "hidden", border: `1px solid ${T.border}`,
                }}>
                  {profilePhoto ? <img src={profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>{orgName}</span>
                    {userData?.verified && <span style={{ fontSize: 11, color: T.sky }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 11, color: T.ink4 }}>{isCollege ? "Institution" : "Company"} · {timeSince(post.created_at)}</div>
                </div>
                {post.category && (
                  (() => { const b = POST_CATEGORY_BADGE[post.category] || POST_CATEGORY_BADGE["Update"]; return (
                    <span style={{ flexShrink: 0, padding: "3px 9px", borderRadius: 999, border: `1px solid ${b.color}`, background: `${b.color}18`, color: b.color, fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap" }}>
                      {b.icon} {post.category}
                    </span>
                  )})()
                )}
                <PostThreeDotMenu
                  onEdit={() => startEdit(post)}
                  onDelete={() => handleDelete(post)}
                  onCopyLink={() => copyPostLink(post)}
                />
              </div>

              <div style={{ marginTop: 14, fontSize: 13.5, color: T.ink2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {post.title}
              </div>

              {post.description && post.description.startsWith("http") && (
                <img src={post.description} alt="post" style={{
                  width: "100%", marginTop: 12, borderRadius: 14, objectFit: "cover", maxHeight: 320,
                  border: `1px solid ${T.border}`,
                }} />
              )}

              {/* 2026-08-02: real Like/Comment/Share-equivalent row — same
                  shape, fresh terminology, backed by real tables (no faked
                  counts). Edit/Delete live in the ⋯ menu above now. */}
              <div style={{ display: "flex", gap: 18, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`, position: "relative" }}>
                <button onClick={() => toggleAck(post)}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: ackState[post.id]?.mine ? T.gold : T.ink4, background: "none", border: "none", cursor: "pointer", fontFamily: FONT, padding: 0 }}>
                  🙌 Appreciate{ackState[post.id]?.count > 0 ? ` · ${ackState[post.id].count}` : ""}
                </button>
                <button onClick={() => toggleDiscuss(post)}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: discussOpenId === post.id ? T.gold : T.ink4, background: "none", border: "none", cursor: "pointer", fontFamily: FONT, padding: 0 }}>
                  💬 Discuss{comments[post.id]?.length > 0 ? ` · ${comments[post.id].length}` : ""}
                </button>
                <button onClick={() => copyPostLink(post)}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: T.ink4, background: "none", border: "none", cursor: "pointer", fontFamily: FONT, padding: 0 }}>
                  ↗️ Pass it on
                </button>
                {shareMsgId === post.id && (
                  <span style={{ fontSize: 11, color: T.green, marginLeft: "auto", alignSelf: "center" }}>Link copied</span>
                )}
              </div>

              {discussOpenId === post.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                  {(comments[post.id] || []).length === 0 && (
                    <div style={{ fontSize: 12, color: T.ink4, marginBottom: 10 }}>No replies yet — start the discussion.</div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                    {(comments[post.id] || []).map(c => (
                      <div key={c.id} style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 700, color: T.ink }}>{c.profiles?.name || (c.user_id === user?.id ? (userData?.name || "You") : "Member")}: </span>
                        {c.body}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={commentDraft[post.id] || ""}
                      onChange={e => setCommentDraft(d => ({ ...d, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") submitComment(post) }}
                      placeholder="Write a reply…"
                      style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.05)", color: T.ink, fontSize: 12.5, fontFamily: FONT, outline: "none" }}
                    />
                    <Btn onClick={() => submitComment(post)} disabled={!(commentDraft[post.id] || "").trim()} style={{ fontSize: 11.5, padding: "6px 14px" }}>Reply</Btn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Wrap>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 9 — COMPANIES (Partner Talent Network)
// ═══════════════════════════════════════════════════════════════════════════════
function CompaniesPage({ userData, user }) {
  const isCollege = (userData?.org_type || "college") !== "company"
  // Two entirely different UIs share this nav slot: a college invites
  // companies here; a company org account instead sees institutions that
  // invited THEM and an NDA accept/decline flow. Routing at this level (rather
  // than an early-return inside one function body) keeps each side's hooks
  // unconditional, per the Rules of Hooks.
  return isCollege ? <CollegeCompaniesPage userData={userData} user={user} /> : <RecruiterNetworkReceivedPage userData={userData} user={user} />
}

function CollegeCompaniesPage({ userData, user }) {
  const { data: companies, loading, error, reload } = useOrgCompanyLinks(user?.id)
  const [showInvite, setShowInvite]   = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState(null)
  const [tab, setTab]                 = useState("active")
  const [showAllModal, setShowAllModal] = useState(false)
  const [form, setForm]               = useState({ company_name: "", company_email: "", company_website: "", company_address: "", company_size: "", industry: "", notes: "" })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Edit / delete / resend
  const [editingLink, setEditingLink] = useState(null) // the company row being edited, or null
  const [editForm, setEditForm]       = useState({ company_name: "", company_email: "", company_website: "", company_address: "", company_size: "", industry: "", notes: "" })
  const setEF = (k, v) => setEditForm(f => ({ ...f, [k]: v }))
  const [editSaving, setEditSaving]   = useState(false)
  const [editError, setEditError]     = useState(null)
  const [deletingLink, setDeletingLink] = useState(null) // confirm-delete modal target, or null
  const [deleting, setDeleting]       = useState(false)
  const [rowActionId, setRowActionId] = useState(null)   // id + "-resend" | "-delete" while in flight
  const [rowMsg, setRowMsg]           = useState(null)   // { id, text } transient status per row

  function openEdit(c) {
    setEditingLink(c)
    setEditForm({
      company_name: c.company_name || "", company_email: c.company_email || "",
      company_website: c.company_website || "", company_address: c.company_address || "",
      company_size: c.company_size || "", industry: c.industry || "", notes: c.notes || "",
    })
    setEditError(null)
  }

  async function handleSaveEdit() {
    if (!editForm.company_name.trim()) { setEditError("Company name is required."); return }
    setEditSaving(true); setEditError(null)
    try {
      await orgApi.updateCompanyLink(editingLink.id, editForm)
      await auditLog(user.id, user.id, userData?.name || "Admin", `Updated details for ${editForm.company_name.trim()}`, "company.updated", "company", editingLink.id)
      setEditingLink(null)
      reload()
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleResend(c) {
    setRowActionId(c.id + "-resend"); setRowMsg(null)
    try {
      const res = await orgApi.resendCompanyInvite(c.id)
      setRowMsg({ id: c.id, text: res.emailSent ? "Invite resent ✓" : emailFailureText(res.emailReason) })
    } catch (err) {
      setRowMsg({ id: c.id, text: err.message })
    } finally {
      setRowActionId(null)
      setTimeout(() => setRowMsg(m => (m?.id === c.id ? null : m)), 6000)
    }
  }

  // Maps the backend's emailReason to accurate copy — "not_configured" means the
  // college's own email provider isn't set up yet, which has nothing to do with
  // whether the company's address is valid. Don't blame the address for that.
  function emailFailureText(reason) {
    switch (reason) {
      case "email_disabled_app_only": return "Invite sent. No email is sent — the company connects by accepting it inside their Capabilio Recruiter dashboard."
      case "not_configured": return "Invite saved, but email sending isn't set up yet — ask your Capabilio admin to configure the email provider."
      case "no_email_provided": return "This company has no contact email on file — add one to send an invite."
      case "provider_error": return "Invite saved, but the email provider rejected the send. Double-check the address, then try again."
      case "network_error": return "Invite saved, but the email couldn't be sent right now — try again in a moment."
      default: return "Invite saved, but the email didn't send. You can share the invite link directly instead."
    }
  }

  async function handleDeleteConfirmed() {
    setDeleting(true)
    try {
      await orgApi.deleteCompanyLink(deletingLink.id)
      await auditLog(user.id, user.id, userData?.name || "Admin", `Removed ${deletingLink.company_name} from talent network`, "company.deleted", "company", deletingLink.id)
      setDeletingLink(null)
      reload()
    } catch (err) {
      setRowMsg({ id: deletingLink.id, text: err.message })
      setDeletingLink(null)
    } finally {
      setDeleting(false)
    }
  }

  const filtered = companies.filter(c => tab === "active" ? c.status === "active" || c.status === "invited" : c.status === "paused" || c.status === "rejected")

  // Performance-only tiers — email/phone are never exposed at any level.
  // "Full access" means fuller performance data, not contact details.
  const visibilityLabel = { roster: "Roster (name, dept, batch)", elo: "Roster + skill scores", placements: "+ Placement outcomes", full: "Full performance profile" }
  // NOTE: these four are used as `${visibilityColor[vis]}15` to build a translucent
  // background (works for hex colors, e.g. "#74a8ff" -> "#74a8ff15"). ink3 is an
  // rgba(...) string, not hex -- appending "15" to it produced invalid CSS, so the
  // "roster" button silently fell back to the browser's default white button
  // background with near-white text on top of it (an invisible/blank-looking pill).
  // Fixed by using T.ink (the hex form of the same cream tone) instead of T.ink3.
  const visibilityColor = { roster: T.ink, elo: T.amber, placements: T.sky, full: T.green }
  const statusColor     = { invited: T.amber, active: T.green, paused: T.ink4, rejected: T.red }

  async function handleInvite() {
    if (!form.company_name.trim()) { setSaveError("Company name is required."); return }
    setSaving(true); setSaveError(null)
    try {
      const res = await orgApi.inviteCompany({
        company_name:    form.company_name.trim(),
        company_email:   form.company_email.trim(),
        company_website: form.company_website.trim(),
        company_address: form.company_address.trim(),
        company_size:    form.company_size,
        industry:        form.industry,
        notes:           form.notes,
      })
      await auditLog(user.id, user.id, userData?.name || "Admin",
        `Invited company "${form.company_name.trim()}" to talent network${res.emailSent ? " — invite email sent" : " — " + emailFailureText(res.emailReason)}`,
        "company.invited", "company", res.link.id, { company: form.company_name, matched: res.matchedExistingAccount, emailSent: res.emailSent, emailReason: res.emailReason })
      setShowInvite(false)
      setForm({ company_name: "", company_email: "", company_website: "", company_address: "", company_size: "", industry: "", notes: "" })
      if (!res.emailSent) setRowMsg({ id: res.link.id, text: emailFailureText(res.emailReason) })
      reload()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // There is intentionally NO college-side "Activate" action anymore. Every
  // invite — matched to an existing account or not — can only become active
  // by the company explicitly accepting via their emailed /company-invite/
  // :token link (backend/server/routes/orgCompanyLinks.js), and the DB
  // trigger (org_company_links_token_consent_migration.sql) blocks any direct
  // client write to status/NDA fields regardless. This closes the bug where a
  // college could self-activate an unmatched invite with zero real consent.

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
        <KPICard value={companies.length || "—"} label="Total Network" color={T.sky} context="All company links · click to view all" onClick={() => setShowAllModal(true)} />
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
                      {c.company_user_id ? (
                        <Chip color={T.sky} bg={`${T.sky}15`}>🔗 Linked to Capabilio account</Chip>
                      ) : c.status === "invited" && (
                        <Chip color={T.ink4} bg={`${T.ink4}15`}>No Capabilio account yet</Chip>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                      {c.industry && <span style={{ fontSize: 11, color: T.ink4 }}>🏭 {c.industry}</span>}
                      {c.company_size && <span style={{ fontSize: 11, color: T.ink4 }}>👥 {c.company_size}</span>}
                      {c.company_email && <span style={{ fontSize: 11, color: T.ink4 }}>✉️ {c.company_email}</span>}
                      {c.company_address && <span style={{ fontSize: 11, color: T.ink4 }}>📍 {c.company_address}</span>}
                      {c.company_website && <span style={{ fontSize: 11, color: T.ink4 }}>🔗 {c.company_website}</span>}
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
                      <>
                        <span style={{ fontSize: 10, color: T.ink4, fontStyle: "italic" }}>
                          {c.company_email ? "Awaiting company's response" : "No contact email — add one to send an invite"}
                        </span>
                        {c.company_email && (
                          <Btn variant="outline" disabled={rowActionId === c.id + "-resend"} onClick={() => handleResend(c)} style={{ fontSize: 11, padding: "5px 10px" }}>
                            {rowActionId === c.id + "-resend" ? "Sending…" : "Resend Invite"}
                          </Btn>
                        )}
                      </>
                    )}
                    {(c.status === "active" || c.status === "paused") && (
                      <Btn variant="outline" onClick={() => handlePause(c)} style={{ fontSize: 11, padding: "5px 10px" }}>
                        {c.status === "paused" ? "Resume" : "Pause"}
                      </Btn>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(c)} title="Edit details" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.ink4, padding: 2 }}>✏️ Edit</button>
                      <button onClick={() => setDeletingLink(c)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.red, padding: 2 }}>🗑 Delete</button>
                    </div>
                    {c.linked_at && (
                      <span style={{ fontSize: 10, color: T.ink4 }}>Linked {timeSince(c.linked_at)}</span>
                    )}
                    {rowMsg?.id === c.id && (
                      <span style={{ fontSize: 10, color: T.sky, fontWeight: 600 }}>{rowMsg.text}</span>
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
            🔔 The company will be emailed. They must accept an NDA before any access is granted. Student email and contact details are never shared at any access level — companies reach students only through you.
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
            <FieldInput label="Company Address" value={form.company_address} onChange={v => setF("company_address", v)} placeholder="e.g. HITEC City, Hyderabad" />
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

      {showAllModal && (
        <Modal title="All Companies — Full Network" onClose={() => setShowAllModal(false)} width={680}>
          {companies.length === 0 ? (
            <EmptyState icon="🏢" title="No companies yet" sub="Invite your first company partner." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 480, overflowY: "auto" }}>
              {companies.map(c => (
                <div key={c.id} style={{ padding: "12px 14px", border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{c.company_name}</span>
                      <Chip color={statusColor[c.status] || T.ink3} bg={`${statusColor[c.status] || T.ink3}15`}>
                        {c.status === "active" ? "✓ Active" : c.status === "invited" ? "⏳ Invited" : c.status === "paused" ? "⏸ Paused" : "✗ Rejected"}
                      </Chip>
                      {c.company_user_id && <Chip color={T.sky} bg={`${T.sky}15`}>🔗 Linked account</Chip>}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {c.status === "invited" && c.company_email && (
                        <button onClick={() => handleResend(c)} disabled={rowActionId === c.id + "-resend"} title="Resend invite" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.sky }}>
                          {rowActionId === c.id + "-resend" ? "…" : "↻ Resend"}
                        </button>
                      )}
                      <button onClick={() => openEdit(c)} title="Edit" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.ink4 }}>✏️</button>
                      <button onClick={() => setDeletingLink(c)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.red }}>🗑</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: T.ink4, lineHeight: 1.7 }}>
                    {c.industry && <div>🏭 Industry: {c.industry}</div>}
                    {c.company_size && <div>👥 Size: {c.company_size}</div>}
                    {c.company_email && <div>✉️ Email: {c.company_email}</div>}
                    {c.company_address && <div>📍 Address: {c.company_address}</div>}
                    {c.company_website && <div>🔗 Website: {c.company_website}</div>}
                    <div>🕓 Requested: {timeSince(c.created_at)}</div>
                    {c.linked_at && <div>✅ Accepted: {timeSince(c.linked_at)}</div>}
                    {c.status === "active" && <div>🔐 Data access: {visibilityLabel[c.visibility] || c.visibility}</div>}
                    {c.notes && <div>📝 {c.notes}</div>}
                    {rowMsg?.id === c.id && <div style={{ color: T.sky, fontWeight: 600 }}>{rowMsg.text}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {editingLink && (
        <Modal title={`Edit — ${editingLink.company_name}`} onClose={() => setEditingLink(null)} width={520}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {editingLink.status !== "invited" && (
              <div style={{ fontSize: 12, color: T.amber, padding: "8px 12px", background: T.amberL, borderRadius: 8 }}>
                This invite is already {editingLink.status} — editing contact details won't change the linked account or re-trigger consent.
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FieldInput label="Company Name *" value={editForm.company_name} onChange={v => setEF("company_name", v)} required />
              <FieldInput label="Contact Email" value={editForm.company_email} onChange={v => setEF("company_email", v)} placeholder="hr@company.com" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FieldInput label="Industry" value={editForm.industry} onChange={v => setEF("industry", v)} placeholder="IT / Manufacturing / Finance" />
              <FieldInput label="Company Size" value={editForm.company_size} onChange={v => setEF("company_size", v)} placeholder="e.g. 500–5000" />
            </div>
            <FieldInput label="Website" value={editForm.company_website} onChange={v => setEF("company_website", v)} placeholder="https://company.com" />
            <FieldInput label="Company Address" value={editForm.company_address} onChange={v => setEF("company_address", v)} placeholder="e.g. HITEC City, Hyderabad" />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Notes</label>
              <textarea value={editForm.notes} onChange={e => setEF("notes", e.target.value)} rows={2}
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontFamily: FONT, outline: "none", background: T.bg, resize: "vertical", color: T.ink }} />
            </div>
            {editError && <div style={{ fontSize: 12, color: T.red }}>{editError}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setEditingLink(null)}>Cancel</Btn>
              <Btn onClick={handleSaveEdit} disabled={editSaving}>{editSaving ? "Saving…" : "Save Changes"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {deletingLink && (
        <Modal title="Remove from Talent Network?" onClose={() => setDeletingLink(null)} width={420}>
          <div style={{ fontSize: 13, color: T.ink3, marginBottom: 16, lineHeight: 1.6 }}>
            This permanently removes <b>{deletingLink.company_name}</b> from your network.
            {deletingLink.status === "active" && " They will immediately lose access to your student data."}
            {" "}This can't be undone.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="outline" onClick={() => setDeletingLink(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={handleDeleteConfirmed} disabled={deleting}>{deleting ? "Removing…" : "Remove"}</Btn>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}

// ─── Recruiter Network — company-side view of institutions that invited them ──
// Symmetric counterpart to CollegeCompaniesPage: a company org account
// (userData.org_type === 'company') sees institutions that have linked them,
// and accepts/declines an NDA before their status flips to 'active'. Actual
// student-data browsing (scoped by the visibility level the college set) is
// a separate, not-yet-built increment — this closes the account-linkage +
// consent gap first.
function RecruiterNetworkReceivedPage({ user }) {
  const [links, setLinks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [viewingLink, setViewingLink] = useState(null)
  const [students, setStudents]       = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentsError, setStudentsError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await orgApi.listReceivedCompanyLinks()
      setLinks(res.links || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAccept(link) {
    setActionLoading(link.id + "-accept")
    try { await orgApi.acceptCompanyInvite(link.invite_token); await load() }
    catch (err) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  async function handleDecline(link) {
    setActionLoading(link.id + "-decline")
    try { await orgApi.declineCompanyInvite(link.invite_token); await load() }
    catch (err) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  async function handleViewStudents(link) {
    setViewingLink(link); setStudentsLoading(true); setStudentsError(null); setStudents([])
    try {
      const res = await orgApi.getCompanyLinkStudents(link.id)
      setStudents(res.students || [])
    } catch (err) {
      setStudentsError(err.message)
    } finally {
      setStudentsLoading(false)
    }
  }

  // Performance-only tiers — no tier ever includes email/phone/contact info.
  // Reaching a specific student always goes through the college, not directly.
  const visibilityLabel = { roster: "Roster (name, dept, batch)", elo: "Roster + skill scores", placements: "+ Placement outcomes", full: "Full performance profile" }
  const statusColor = { invited: T.amber, active: T.green, paused: T.ink4, rejected: T.red }
  const pendingCount = links.filter(l => l.status === "invited").length

  return (
    <PageShell>
      <PageHeader title="Recruiter Network" sub="Institutions that have invited you to their talent pool" />

      <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto" }}>
        <KPICard value={links.filter(l => l.status === "active").length || "—"} label="Active Partners" color={T.green} context="Institutions you can access" />
        <KPICard value={pendingCount || "—"} label="Pending NDA" color={T.amber} context="Awaiting your response" />
        <KPICard value={links.length || "—"} label="Total Invites" color={T.sky} context="All institution links" />
      </div>

      {loading ? <Spinner /> : error ? <ErrorBanner msg={error} onRetry={load} /> : (
        links.length === 0 ? (
          <EmptyState icon="🎓" title="No institution invites yet" sub="When a college or university adds your company to their Talent Network using this account's email, it will show up here." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {links.map(l => (
              <Card key={l.id} style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${T.sky}20, ${T.purple}20)`,
                    border: `1px solid ${T.sky}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800, color: T.sky,
                  }}>
                    {l.institution_name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{l.institution_name}</span>
                      <Chip color={statusColor[l.status] || T.ink3} bg={`${statusColor[l.status] || T.ink3}15`}>
                        {l.status === "active" ? "✓ Active" : l.status === "invited" ? "⏳ Awaiting your response" : l.status === "paused" ? "⏸ Paused" : "✗ Declined"}
                      </Chip>
                    </div>
                    {l.status === "active" && (
                      <div style={{ fontSize: 11, color: T.ink4 }}>Data access: <b style={{ color: T.ink3 }}>{visibilityLabel[l.visibility] || l.visibility}</b> · NDA signed {timeSince(l.nda_signed_at)} · No personal contact info is ever shared — reach students through the college.</div>
                    )}
                    {l.notes && <div style={{ fontSize: 11, color: T.ink4, marginTop: 6, fontStyle: "italic" }}>{l.notes}</div>}
                  </div>
                  {l.status === "invited" && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <Btn disabled={actionLoading === l.id + "-accept"} onClick={() => handleAccept(l)} style={{ fontSize: 11, padding: "5px 12px" }}>
                        {actionLoading === l.id + "-accept" ? "…" : "Accept NDA ✓"}
                      </Btn>
                      <Btn variant="outline" disabled={actionLoading === l.id + "-decline"} onClick={() => handleDecline(l)} style={{ fontSize: 11, padding: "5px 10px" }}>
                        Decline
                      </Btn>
                    </div>
                  )}
                  {l.status === "active" && (
                    <Btn variant="outline" onClick={() => handleViewStudents(l)} style={{ fontSize: 11, padding: "5px 10px", flexShrink: 0 }}>View Students</Btn>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {viewingLink && (
        <Modal title={`Students — ${viewingLink.institution_name}`} onClose={() => setViewingLink(null)} width={640}>
          <div style={{ fontSize: 11, color: T.ink4, marginBottom: 12 }}>
            Showing {visibilityLabel[viewingLink.visibility] || viewingLink.visibility}. No email, phone, or contact details are included at any access level.
          </div>
          {studentsLoading ? <Spinner /> : studentsError ? <ErrorBanner msg={studentsError} onRetry={() => handleViewStudents(viewingLink)} /> : (
            students.length === 0 ? (
              <EmptyState icon="🎓" title="No students visible yet" sub="This institution hasn't added students to their roster yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflowY: "auto" }}>
                {students.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.skyL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.sky, flexShrink: 0 }}>
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: T.ink4 }}>{s.department}{s.batch ? ` · ${s.batch}` : ""}{s.placement_company ? ` · Placed at ${s.placement_company}` : ""}</div>
                    </div>
                    {typeof s.elo_rating === "number" && s.elo_rating > 0 && (
                      <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: T.sky }}>ELO {s.elo_rating}</div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </Modal>
      )}
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 10 — OUTCOMES
// ═══════════════════════════════════════════════════════════════════════════════
// ─── Canonical Offers & Placement Confirmation — added 2026-07-31 (Phase 4) ──
// Offers/placements now flow through the real `offers` -> student-accept ->
// `institution_placements` (unconfirmed) -> TPO-confirm pipeline (the last
// step, POST .../placements/:id/confirm, already existed from Phase 1 — this
// is what finally gives it rows to act on). Additive to the legacy
// org_members-driven "Placement Records" list below, not a replacement.
function CanonicalOffersPanel({ canonical, openThreadFor }) {
  const institutionId = canonical?.institution?.id
  const [offers, setOffers] = useState([])
  const [unconfirmed, setUnconfirmed] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const load = useCallback(async () => {
    if (!institutionId) { setLoading(false); return }
    setLoading(true)
    try {
      const [offersRes, placementsRes] = await Promise.all([
        collegeApi.listOffers(institutionId),
        collegeApi.listPlacements(institutionId, { status: "unconfirmed" }),
      ])
      setOffers(offersRes?.offers || [])
      setUnconfirmed(placementsRes?.placements || [])
    } catch (_) { /* degrade to empty state */ }
    setLoading(false)
  }, [institutionId])

  useEffect(() => { load() }, [load])

  async function confirm(placementId) {
    setActionId(placementId)
    try { await collegeApi.confirmPlacement(institutionId, placementId); await load() }
    catch (_) {}
    setActionId(null)
  }

  if (!institutionId) return null
  if (loading) return <Spinner />

  return (
    <>
      {unconfirmed.length > 0 && (
        <Card style={{ marginBottom: 16, border: `1px solid ${T.amber}40` }}>
          <SectionHead title="Needs Confirmation" />
          <div style={{ fontSize: 11, color: T.ink4, marginBottom: 8 }}>
            A student accepted an offer — confirm it to record a real placement and update their status.
          </div>
          {unconfirmed.map((p, i) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < unconfirmed.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontSize: 12.5, color: T.ink2 }}>
                {p.role ? `${p.role} at ` : ""}{p.company}{p.ctc_lpa ? ` · ${p.ctc_lpa} LPA` : ""}
              </div>
              <Btn onClick={() => confirm(p.id)} disabled={actionId === p.id} style={{ fontSize: 11, padding: "4px 10px" }}>
                {actionId === p.id ? "…" : "Confirm Placement"}
              </Btn>
            </div>
          ))}
        </Card>
      )}
      {offers.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <SectionHead title="Placement Pipeline" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {["offered", "accepted", "declined", "rescinded"].map((status) => {
              const count = offers.filter((o) => o.status === status).length
              const color = status === "accepted" ? T.green : status === "declined" || status === "rescinded" ? T.red : T.amber
              return (
                <div key={status} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: MONO }}>{count}</div>
                  <div style={{ fontSize: 10.5, color: T.ink4, textTransform: "capitalize" }}>{status}</div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
      <Card style={{ marginBottom: 16 }}>
        <SectionHead title="Offers" />
        {offers.length === 0 ? (
          <EmptyState icon="✉️" title="No offers yet" sub="Offers recruiters send to your shared students appear here." />
        ) : (
          offers.slice(0, 20).map((o, i) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < offers.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontSize: 12.5, color: T.ink2 }}>
                {o.role ? `${o.role} at ` : ""}{o.company}{o.ctc_lpa ? ` · ${o.ctc_lpa} LPA` : ""}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 11, color: o.status === "accepted" ? T.green : o.status === "declined" ? T.red : T.ink4, fontWeight: 600 }}>
                  {o.status}
                </div>
                {openThreadFor && (
                  <button
                    onClick={() => openThreadFor({ contextType: "offer", contextId: o.id, subject: `Offer: ${o.role || "role"} at ${o.company}` })}
                    title="Message about this offer"
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, opacity: 0.75 }}>
                    💬
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  )
}

function OutcomesPage({ userData, members, canonical, openThreadFor }) {
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

      {canonical?.institution && <CanonicalOffersPanel canonical={canonical} openThreadFor={openThreadFor} />}

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
function MediaTab({ user, userData }) {
  const [profileUploading, setProfileUploading] = useState(false)
  const [coverUploading, setCoverUploading]     = useState(false)
  const [profileUrl, setProfileUrl]             = useState(userData?.org_profile_photo || "")
  const [coverUrl, setCoverUrl]                 = useState(userData?.org_cover_photo   || "")
  const [msg, setMsg]   = useState(null)
  const [err, setErr]   = useState(null)
  const profileRef = useRef(null)
  const coverRef   = useRef(null)

  async function handleUpload(file, type) {
    const setter = type === "profile" ? setProfileUploading : setCoverUploading
    setter(true); setMsg(null); setErr(null)
    try {
      const url = await uploadOrgPhoto(user.id, file, type)
      const field = type === "profile" ? "org_profile_photo" : "org_cover_photo"
      const { error: dbErr } = await supabase.from("profiles").update({ [field]: url }).eq("id", user.id)
      if (dbErr) throw new Error(dbErr.message)
      if (type === "profile") setProfileUrl(url)
      else setCoverUrl(url)
      setMsg(`✅ ${type === "profile" ? "Profile photo" : "Cover photo"} updated!`)
    } catch (e) {
      setErr(e.message.includes("bucket") ? "Storage not configured. Ask admin to create 'org-media' bucket in Supabase." : e.message)
    } finally {
      setter(false)
    }
  }

  const PhotoSlot = ({ label, sublabel, url, aspect, onPick, uploading, inputRef, accepts }) => (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden", marginBottom: 14 }}>
      {/* Preview */}
      <div style={{
        width: "100%", aspectRatio: aspect, background: url
          ? `url(${url}) center/cover no-repeat`
          : "linear-gradient(135deg,rgba(220,139,24,.15),rgba(116,168,255,.10))",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", minHeight: aspect === "4/1" ? 100 : 80,
      }}>
        {!url && <span style={{ fontSize: 12, color: T.ink4 }}>No photo set</span>}
        {uploading && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Spinner />
          </div>
        )}
      </div>
      {/* Controls */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.02)" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{label}</div>
          <div style={{ fontSize: 11, color: T.ink4, marginTop: 2 }}>{sublabel}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input ref={inputRef} type="file" accept={accepts || "image/*"} style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f) }} />
          <Btn onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload photo"}
          </Btn>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {msg && <div style={{ padding: "10px 14px", background: "rgba(79,212,163,.10)", border: `1px solid ${T.green}30`, borderRadius: 10, fontSize: 12, color: T.green, marginBottom: 14 }}>{msg}</div>}
      {err && <div style={{ padding: "10px 14px", background: "rgba(255,129,119,.10)", border: `1px solid ${T.red}30`, borderRadius: 10, fontSize: 12, color: T.red, marginBottom: 14 }}>{err}</div>}

      <PhotoSlot
        label="Profile photo" sublabel="Shown on your public page and sidebar · Square, min 200×200px"
        url={profileUrl} aspect="1/1" uploading={profileUploading} inputRef={profileRef}
        onPick={f => handleUpload(f, "profile")}
      />
      <PhotoSlot
        label="Cover photo" sublabel="Banner at top of your public profile · 1400×350px recommended"
        url={coverUrl} aspect="4/1" uploading={coverUploading} inputRef={coverRef}
        onPick={f => handleUpload(f, "cover")}
      />
    </div>
  )
}

function SettingsPage({ userData, user, initialTab = "profile", reloadAudit, auditLogs, auditLoading, canonical }) {
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
  const [docUploading, setDocUploading] = useState(false)
  const docInputRef = useRef(null)

  async function handleEmailVerify() {
    setVerifyMsg(null); setVerifyError(null)
    // profiles.verificationStatus is PC-7-protected (server-side only) — the
    // write now goes through the backend, not a direct client-side Supabase call.
    try {
      await orgApi.verifyEmail()
    } catch (err) {
      setVerifyError("Verification failed: " + err.message)
      return
    }
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

  // Level 3 — real self-serve upload, replacing the old email-only
  // instruction. Uploads straight to the same org-media Supabase Storage
  // bucket already used for profile/cover photos (uploadOrgPhoto, defined
  // above), then hands the resulting URL to the backend so it can record it
  // and advance verificationStatus server-side (PC-7 protected column).
  async function handleDocumentUpload(file) {
    setDocUploading(true); setVerifyMsg(null); setVerifyError(null)
    try {
      const url = await uploadOrgPhoto(user.id, file, "naac_cert")
      await orgApi.verifyDocument(url)
      await auditLog(user.id, user.id, userData?.name || "Admin",
        "Uploaded accreditation document (NAAC certificate)", "verification.document_submitted", "setting", "verification")
      setLocalVLevelBoost(3)
      setVerifyMsg("✅ Document uploaded! Level 3 complete — awaiting final review for Level 4.")
      reloadAudit()
    } catch (e) {
      setVerifyError(e.message.includes("bucket") ? "Storage not configured. Ask admin to create 'org-media' bucket in Supabase." : e.message)
    } finally {
      setDocUploading(false)
    }
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

  // Staff Access (creating placement_officer/professor/dept_head/mentor
  // logins) is a college_admin-only capability — only surface the tab for
  // that role, same gate the panel itself used when it lived on People.
  const canManageStaff = !!(canonical?.institution && canonical?.role === "college_admin")
  const settingsTabs = ["profile", "media", "verification", "integrations", ...(canManageStaff ? ["staff"] : []), "audit"]

  return (
    <PageShell>
      <PageHeader title="Settings" sub="Organisation profile, verification, and integrations" />

      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {settingsTabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>{t === "staff" ? "Staff Access" : t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === "media" && <MediaTab user={user} userData={userData} />}

      {tab === "staff" && canManageStaff && <StaffAccessPanel canonical={canonical} />}

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
              Verification Level: {vLevel}/4 — {VERIFICATION_LEVEL_LABEL[vLevel]}
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
                        Upload your NAAC certificate or accreditation / incorporation document (PDF, JPG, PNG).
                        {userData?.org_naac_cert_url && (
                          <> · <a href={userData.org_naac_cert_url} target="_blank" rel="noreferrer" style={{ color: T.sky }}>View uploaded document</a></>
                        )}
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
                  <>
                    {v.level === 3 && (
                      <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleDocumentUpload(f) }} />
                    )}
                    <Btn
                      style={{ fontSize: 11, padding: "5px 12px" }}
                      disabled={v.level === 3 && docUploading}
                      onClick={
                        v.level === 1 ? handleEmailVerify
                        : v.level === 2 ? handleDomainVerify
                        : v.level === 3 ? () => docInputRef.current?.click()
                        : undefined
                      }
                    >
                      {v.level === 1 ? "Verify Email →" : v.level === 2 ? "Request →" : v.level === 3 ? (docUploading ? "Uploading…" : "Upload Document →") : "Awaiting Review"}
                    </Btn>
                  </>
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
            🔌 Third-party sync (HRMS) launches in Q3 2026. Use the Capabilio API in the meantime — internal chat and team alerts are already built natively, see the Messages tab.
          </div>
          {/* 2026-07-31: removed "Greenhouse ATS" per explicit product direction —
              ATS (applicant tracking) is a company's internal hiring-pipeline
              tool; institutions don't run one for their own students, and
              Capabilio's live-profile/ELO model is a deliberate alternative to
              resume/ATS-centric hiring, not a feed into one. Listing it here
              was a copy-paste artifact, not a real institution-facing feature.
              Also removed "Google Workspace" and "Microsoft Teams" — explicit
              product direction is to build native in-house equivalents rather
              than third-party integrations (the Messages tab's team channels
              ARE the native Teams-equivalent; a native SSO/directory-sync
              equivalent isn't built yet and isn't promised here). Kept Slack
              and HRMS/ERP as still-relevant future third-party syncs. */}
          {[
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
// initialPage (added 2026-08-01, bugfix): optional, defaults to "home" so
// every existing call site behaves exactly as before. Lets a caller mount
// InstitutionOS directly onto one of its internal tabs (e.g. "settings")
// instead of always landing on Home — see App.jsx's top-nav Settings button,
// which previously routed institution accounts into the unrelated
// Executive Path (Aura.jsx's isExecutive flag treats path==="institution"
// the same as path==="authority", so any institution user who ended up on
// the shared "aura" page got handed to ExecutiveAura). The real bug was
// that button always set currentPage="aura" regardless of navPath; this
// prop is the institution-path side of the fix — App.jsx now sends
// institution users to currentPage="orgSettings" and passes
// initialPage="settings" through so they land on InstitutionOS's own
// Settings tab instead.
export default function InstitutionOS({ user, userData, onNavigate, initialPage = "home" }) {
  const [activePage, setActivePage] = useState(initialPage)
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768)
  const [settingsTab, setSettingsTab] = useState("profile")
  const [role, setRole]             = useState("admin")

  // Coordination layer (2026-07-31): "Message about this" launchers on the
  // roster/offers/interviews screens set this, then jump to the
  // Intelligence page's Team Chat tab, which reads it once to pre-bind a
  // new thread's context_type/context_id — see ChatPanel below. Cleared by
  // ChatPanel once consumed (either sent or dismissed) so it never leaks
  // into a later, unrelated thread.
  const [pendingThreadContext, setPendingThreadContext] = useState(null)
  function openThreadFor(ctx) {
    setPendingThreadContext(ctx)
    setActivePage("intelligence")
  }
  function clearPendingThreadContext() { setPendingThreadContext(null) }

  function onRole(r) {
    setRole(r)
    // if current page isn't allowed for the new role, jump to its first allowed page
    if (!roleAllows(r, activePage)) {
      const first = navGroupsForRole(r)[0]?.items[0]?.id || "home"
      setActivePage(first)
    }
  }


  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Auto-complete Level 1 (Email Verification) instead of making the admin
  // find Settings → Verification and click a button. A signed-in Supabase
  // session already proves the email was confirmed (Supabase gates session
  // issuance on email confirmation) — the manual click added no new
  // information, it just left honestly-already-verified accounts stuck
  // showing "pending" until someone happened to visit that tab. Fire-and-
  // forget: this is additive-only (never downgrades an existing higher level)
  // and the same PC-7-protected backend route already used by the manual button.
  useEffect(() => {
    if (verificationLevel(userData) < 1) {
      orgApi.verifyEmail().catch(() => {}) // silent — Settings tab still offers a manual retry
    }
  }, [user?.id, userData?.verificationStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch all org data at root level — shared across pages
  const { data: members,       loading: membersLoading,  error: membersError,  reload: reloadMembers  } = useOrgMembers(user?.id)
  const { data: tasks,         loading: tasksLoading,    error: tasksError,    reload: reloadTasks    } = useOrgTasks(user?.id)
  const { data: events,        loading: eventsLoading,   error: eventsError,   reload: reloadEvents   } = useOrgEvents(user?.id)
  const { data: auditLogs,     loading: auditLoading,    reload: reloadAudit   } = useOrgAuditLog(user?.id, 50)
  const canonical = useCanonicalRoster()

  // Staff Access (2026-08-01): real staff logins get their role LOCKED from
  // the server-resolved institution_staff row — the "View as" dropdown is a
  // convenience for the college admin only, never an escalation path for a
  // placement-team or professor login. The backend independently enforces
  // every route regardless (requireInstitutionAdmin etc.); this is the UI
  // half. canonical.role comes from GET /institutions/mine.
  const serverRole = canonical?.role
  const lockedRole =
    serverRole === "placement_officer" ? "placement"
    : ["professor", "dept_head", "mentor"].includes(serverRole) ? "staff"
    : null
  const roleLocked = !!lockedRole
  useEffect(() => {
    if (lockedRole && role !== lockedRole) onRole(lockedRole)
  }, [lockedRole]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const shared = { user, userData, onNav, members, membersLoading, membersError, reloadMembers, tasks, tasksLoading, tasksError, reloadTasks, events, eventsLoading, eventsError, reloadEvents, auditLogs, auditLoading, reloadAudit, canonical, openThreadFor, pendingThreadContext, clearPendingThreadContext }

  const PAGE_MAP = {
    home:          <HomePage          {...shared} onVerify={handleVerify} />,
    pubprofile:    <InstitutionPublicProfile onAction={(a)=>{ if(a==='back') setActivePage('home') }} onBack={()=>setActivePage('home')} userData={userData} members={members} />,
    intelligence:  <IntelligencePage  {...shared} />,
    // Same page as intelligence, mounted directly on the Team Chat tab.
    // Distinct key not needed: PAGE_MAP renders only one entry at a time,
    // so switching sidebar items remounts with the right initialTab.
    chat:          <IntelligencePage  key="chat-page" {...shared} initialTab="messages" />,
    tasks:         <TasksPage         {...shared} />,
    people:        <PeoplePage        {...shared} />,
    community:     <CommunityPage userData={userData} user={user} />,
    groups:        <GroupsPage canonical={canonical} onNav={onNav} />,
    university:    <UniversityPage    canonical={canonical} />,
    jobs:          <JobsPage          canonical={canonical} userData={userData} />,
    cohorts:       <CohortsPage       members={members} />,
    events:        <EventsPage        {...shared} />,
    companies:     <CompaniesPage     user={user} userData={userData} />,
    outcomes:      <OutcomesPage      userData={userData} members={members} canonical={canonical} openThreadFor={openThreadFor} />,
    settings:      <SettingsPage      user={user} userData={userData} initialTab={settingsTab} reloadAudit={reloadAudit} auditLogs={auditLogs} auditLoading={auditLoading} canonical={canonical} />,
  }

  return (
    <div style={{
      display: "flex", flexDirection: isMobile ? "column" : "row",
      height: "100%", width: "100%",
      background: "#0b0a08",
      overflow: "hidden", fontFamily: FONT,
    }}>
      {!isMobile && (
        <InstSidebar active={activePage} onNav={onNav} userData={userData} members={members} tasks={tasks} role={role} onRole={onRole} roleLocked={roleLocked} />
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
