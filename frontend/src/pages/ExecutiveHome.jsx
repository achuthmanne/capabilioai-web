/**
 * ExecutiveHome.jsx — Executive "CEO Command Center"
 *
 * Rebuilt 2026-07-23 to replace the previous fully-hardcoded version.
 * Every widget here is wired to a real Supabase table (profiles, org_events,
 * connections, follows, notifications, jobs). Modules with no backing table
 * yet (Startup Workspace, Idea Lab, Venture Intelligence, Funding Hub, etc.)
 * are shown as honest "Coming soon" roadmap cards — never fabricated numbers.
 * See EXECUTIVE_PATH_DESIGN_SYSTEM.md for the full module-by-module spec.
 */
import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"

const C = {
  gold:    "#F59E0B",
  goldD:   "#D97706",
  goldL:   "rgba(245,158,11,0.12)",
  goldB:   "rgba(245,158,11,0.28)",
  ink:     "#1A1714",
  ink2:    "#475569",
  ink3:    "#A8A29E",
  ink4:    "#6B6560",
  border:  "rgba(0,0,0,0.06)",
  surface: "#FFFFFF",
  green:   "#10B981",
  greenL:  "rgba(16,185,129,0.12)",
  blue:    "#3B82F6",
  blueL:   "rgba(59,130,246,0.12)",
  red:     "#F43F5E",
  redL:    "rgba(244,63,94,0.10)",
}

const POST_CATEGORIES = ["Insight", "Milestone", "Announcement", "Ask"]
const CATEGORY_ICON = { Insight: "💡", Milestone: "🚀", Announcement: "📢", Ask: "🤝" }

const ROADMAP_MODULES = [
  { icon: "🧭", title: "Startup Workspace",     desc: "One place for your startup's identity, team, and links. Needs a dedicated table — not started." },
  { icon: "💡", title: "Idea Lab",               desc: "Private space to shape ideas before they become a startup. Not started." },
  { icon: "📡", title: "Venture Intelligence",   desc: "Market and competitor signal, on demand. Needs its own data design — not started." },
  { icon: "💰", title: "Funding Hub",            desc: "Round tracking and investor interest. Highest scrutiny — will not ship with any invented numbers." },
  { icon: "🤝", title: "Partner Hub",            desc: "Partnership pipeline. May reuse the existing (currently unused) org_opportunities table." },
  { icon: "🛍️", title: "Marketplace",            desc: "Scope not yet defined." },
  { icon: "📊", title: "Executive Analytics",    desc: "Will aggregate real feed + network numbers once there's enough activity to show." },
  { icon: "🎨", title: "Brand Studio",           desc: "Cover, tagline, brand color for your profile. Smallest lift of the unbuilt modules." },
]

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 20,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      ...style,
    }}>{children}</div>
  )
}

function Label({ children, color = C.gold, bg = C.goldL }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 100,
      background: bg, color, fontSize: 11, fontWeight: 700,
      fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em",
      textTransform: "uppercase",
    }}>{children}</span>
  )
}

function SectionHead({ title, action, onAction }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>{title}</div>
      {action && (
        <button onClick={onAction} style={{ fontSize: 12, color: C.goldD, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>{action}</button>
      )}
    </div>
  )
}

function EmptyState({ icon = "✦", title, sub }) {
  return (
    <Card style={{ textAlign: "center", padding: "28px 20px" }}>
      <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.6 }}>{sub}</div>}
    </Card>
  )
}

// ─── Data hooks (all real Supabase queries) ─────────────────────────────────

function useExecFeed(userId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    const { data: rows } = await supabase
      .from("org_events").select("*").eq("org_id", userId).eq("type", "post")
      .order("created_at", { ascending: false }).limit(10)
    setData(rows || []); setLoading(false)
  }, [userId])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

function useConnections(userId) {
  const [pending, setPending]         = useState([])
  const [connectionCount, setConnCnt] = useState(0)
  const [followerCount, setFollCnt]   = useState(0)
  const [loading, setLoading]         = useState(true)

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    const [{ data: pendingRows }, { count: connCount }, { count: follCount }] = await Promise.all([
      supabase.from("connections").select("*").eq("addressee_id", userId).eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("connections").select("id", { count: "exact", head: true }).eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
    ])
    let rows = pendingRows || []
    if (rows.length) {
      const ids = [...new Set(rows.map(r => r.requester_id))]
      const { data: profs } = await supabase.from("profiles").select("id,display_name,name,avatar_url,current_role_title,role").in("id", ids)
      const byId = Object.fromEntries((profs || []).map(p => [p.id, p]))
      rows = rows.map(r => ({ ...r, requester: byId[r.requester_id] }))
    }
    setPending(rows)
    setConnCnt(connCount || 0)
    setFollCnt(follCount || 0)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const respond = async (connId, accept) => {
    await supabase.from("connections").update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() }).eq("id", connId)
    load()
  }

  return { pending, connectionCount, followerCount, loading, respond, reload: load }
}

function useOpportunitySignal(domain) {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      let q = supabase.from("jobs").select("id,title,company,location,work_mode").eq("is_active", true).order("posted_at", { ascending: false }).limit(4)
      if (domain) q = q.ilike("domain", `%${domain}%`)
      const { data } = await q
      if (!cancelled) { setJobs(data || []); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [domain])
  return { jobs, loading }
}

// ─── Create Post modal ───────────────────────────────────────────────────────

function CreatePostModal({ onClose, onSubmit }) {
  const [category, setCategory] = useState("Insight")
  const [title, setTitle]       = useState("")
  const [content, setContent]   = useState("")
  const [posting, setPosting]   = useState(false)

  const inp = { width: "100%", padding: "10px 14px", background: "#F9F8F6", border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.ink, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }

  const submit = async () => {
    if (!title.trim() || posting) return
    setPosting(true)
    await onSubmit({ category, title: title.trim(), content: content.trim() })
    setPosting(false)
    onClose()
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(26,26,24,0.5)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 520, background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>Share to your Executive Feed</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.ink3, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {POST_CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${category === c ? C.goldB : C.border}`, background: category === c ? C.goldL : "transparent", color: category === c ? C.goldD : C.ink3, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {CATEGORY_ICON[c]} {c}
              </button>
            ))}
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title..." style={{ ...inp, fontWeight: 700, fontSize: 14, marginBottom: 10 }} />
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Share the detail..." style={{ ...inp, resize: "vertical", lineHeight: 1.7 }} />
        </div>
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={submit} disabled={!title.trim() || posting}
            style={{ width: "100%", padding: 13, background: title.trim() ? C.gold : "#F3F1EC", border: "none", borderRadius: 12, color: title.trim() ? "#fff" : C.ink3, fontSize: 13, fontWeight: 800, cursor: title.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            {posting ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ExecutiveHome({ user, userData, onNavigate }) {
  const userId    = user?.id || user?.uid
  const name      = userData?.display_name || userData?.name || user?.displayName || "Executive"
  const firstName = name.split(" ")[0]
  const domain    = userData?.domain || userData?.keyword || ""
  const verified  = !!(userData?.verified || userData?.verification_state === "verified")
  const [showCreate, setShowCreate] = useState(false)

  const feed   = useExecFeed(userId)
  const net    = useConnections(userId)
  const signal = useOpportunitySignal(domain)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const focusItems = [
    !verified && { icon: "🛡️", text: "Complete verification to unlock trust signals", action: () => onNavigate?.("authority") },
    feed.data.length === 0 && { icon: "✦", text: "Publish your first post to your Executive Feed", action: () => setShowCreate(true) },
    net.pending.length > 0 && { icon: "👥", text: `${net.pending.length} connection request${net.pending.length > 1 ? "s" : ""} waiting on you`, action: () => onNavigate?.("execnetwork") },
  ].filter(Boolean)

  return (
    <div style={{ background: `radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.10) 0%, transparent 55%), #FFFFFF`, flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 24px", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500;600&display=swap');`}</style>

      {showCreate && (
        <CreatePostModal
          onClose={() => setShowCreate(false)}
          onSubmit={async ({ category, title, content }) => {
            await supabase.from("org_events").insert({ org_id: userId, type: "post", category, title, description: content, created_by: userId })
            feed.reload()
          }}
        />
      )}

      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: C.ink3, margin: 0, fontWeight: 500 }}>{greeting}, {firstName} · {userData?.authorityType || "Executive"}</p>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 24, fontWeight: 800, color: C.ink, margin: "4px 0 0", lineHeight: 1.2 }}>
          Your Executive <span style={{ color: C.gold, fontStyle: "italic" }}>presence</span> today
        </h1>
      </div>

      {/* Ask Capi */}
      <Card style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 14, background: C.goldL, border: `1px solid ${C.goldB}` }}>
        <div style={{ fontSize: 22 }}>✦</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Ask Capi</div>
          <div style={{ fontSize: 12, color: C.ink3 }}>Your AI assistant is available from the chat button in the corner — ask it anything about your profile or the platform.</div>
        </div>
      </Card>

      {/* Today's Focus */}
      {focusItems.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionHead title="Today's Focus" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {focusItems.map((f, i) => (
              <Card key={i} onClick={f.action} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: f.action ? "pointer" : "default" }}>
                <span style={{ fontSize: 16 }}>{f.icon}</span>
                <span style={{ fontSize: 13, color: C.ink2, fontWeight: 600, flex: 1 }}>{f.text}</span>
                <span style={{ color: C.goldD, fontSize: 12, fontWeight: 700 }}>→</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Executive Feed */}
      <div style={{ marginBottom: 16 }}>
        <SectionHead title="Executive Feed" action="+ Post" onAction={() => setShowCreate(true)} />
        {feed.loading ? null : feed.data.length === 0 ? (
          <EmptyState icon="✦" title="No posts yet" sub="Share an insight, milestone, or ask — it'll show up here." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {feed.data.map(p => (
              <Card key={p.id} style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Label>{CATEGORY_ICON[p.category] || "✦"} {p.category || "Update"}</Label>
                  <span style={{ fontSize: 11, color: C.ink3, marginLeft: "auto" }}>{new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: p.description ? 4 : 0 }}>{p.title}</div>
                {p.description && <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.6 }}>{p.description}</div>}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Network & Requests */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>Network</div>
          <div style={{ display: "flex", gap: 14 }}>
            <span style={{ fontSize: 12, color: C.ink3 }}><b style={{ color: C.ink, fontFamily: "'DM Mono', monospace" }}>{net.connectionCount}</b> connections</span>
            <span style={{ fontSize: 12, color: C.ink3 }}><b style={{ color: C.ink, fontFamily: "'DM Mono', monospace" }}>{net.followerCount}</b> followers</span>
          </div>
        </div>
        {net.pending.length === 0 ? (
          <div style={{ fontSize: 12, color: C.ink3, textAlign: "center", padding: "10px 0" }}>No pending requests.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {net.pending.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{r.requester?.display_name || r.requester?.name || "Someone"}</div>
                  <div style={{ fontSize: 12, color: C.ink3 }}>{r.requester?.current_role_title || r.requester?.role || r.message || "Wants to connect"}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => net.respond(r.id, true)} style={{ padding: "5px 12px", background: C.greenL, border: "none", borderRadius: 8, color: C.green, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Accept</button>
                  <button onClick={() => net.respond(r.id, false)} style={{ padding: "5px 12px", background: C.redL, border: "none", borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Opportunity Radar */}
      <div style={{ marginBottom: 16 }}>
        <SectionHead title="Opportunity Radar" action="Open Jobs →" onAction={() => onNavigate?.("timemarket")} />
        <div style={{ fontSize: 11, color: C.ink3, marginBottom: 8, marginTop: -4 }}>Live hiring signal from the jobs board{domain ? ` in ${domain}` : ""} — not deal-flow matching (that's on the roadmap).</div>
        {signal.loading ? null : signal.jobs.length === 0 ? (
          <EmptyState icon="📡" title="No matching roles right now" sub="Check back as the jobs board updates." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {signal.jobs.map(j => (
              <Card key={j.id} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{j.title}</div>
                  <div style={{ fontSize: 12, color: C.ink3 }}>{j.company}{j.location ? ` · ${j.location}` : ""}</div>
                </div>
                {j.work_mode && <Label color={C.blue} bg={C.blueL}>{j.work_mode}</Label>}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Roadmap modules */}
      <div style={{ marginBottom: 8 }}>
        <SectionHead title="Coming soon" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {ROADMAP_MODULES.map((m, i) => (
            <div key={i} style={{ background: "#F9F8F6", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", opacity: 0.85 }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>{m.icon}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2, marginBottom: 2 }}>{m.title}</div>
              <div style={{ fontSize: 11, color: C.ink3, lineHeight: 1.5 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick nav */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        {[
          { icon: "⏰", label: "Time Market (Jobs)", page: "timemarket" },
          { icon: "🎙️", label: "Signal Rooms",       page: "signalrooms" },
          { icon: "🌐", label: "Network",             page: "execnetwork" },
          { icon: "✦",  label: "My Profile",          page: "aura" },
        ].map(a => (
          <button key={a.page} onClick={() => onNavigate?.(a.page)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: C.ink2 }}
          ><span style={{ fontSize: 18 }}>{a.icon}</span>{a.label}</button>
        ))}
      </div>
    </div>
  )
}
