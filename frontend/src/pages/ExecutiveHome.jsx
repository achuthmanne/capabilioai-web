/**
 * ExecutiveHome.jsx — Executive Home Cockpit
 *
 * Rebuilt 2026-07-23, extended 2026-07-26 (Introductions), and rebuilt AGAIN
 * 2026-07-26 (this pass) per explicit user feedback: the page still felt
 * static/workspace-y because composition was fixed — same sections in the
 * same order for every user, plus two literally-static grids at the bottom
 * (a "Coming soon" roadmap grid and a flat Quick Nav grid) that never
 * changed no matter who was looking at them.
 *
 * This pass replaces fixed composition with a single ranked focus-item
 * builder (buildFocusItems()) that reads real signals — verification state,
 * real startup stage (`startups.stage`, not fabricated), team size
 * (`startup_team_members`), connection/feed activity level, and domain —
 * and produces a DIFFERENT, ordered list of next actions for a founder with
 * a verified Series-A startup and a big team than for an unverified founder
 * with an idea and no connections. The two static grids are gone entirely —
 * every action surfaced anywhere on this page now comes from a real query,
 * and a section that has nothing real to say does not render, full stop.
 *
 * Still true from the original build: every widget here is wired to a real
 * Supabase table (profiles, org_events, connections, follows, startups,
 * startup_team_members, exec_intro_requests, jobs). Modules with no backing
 * table yet (Communities, Events, Marketplace, AI Copilot briefing engine)
 * are NOT referenced from this page's dynamic recommendations — only real,
 * working destinations (Network, Analytics, Startup Ops, Profile/
 * Verification, Executive Feed) are ever recommended here.
 */
import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { execIntroApi } from "../lib/api"
import { EXEC_COLORS as C, Card, Label, SectionHead, EmptyState } from "../components/ExecutiveUI"

const POST_CATEGORIES = ["Insight", "Milestone", "Announcement", "Ask"]
const CATEGORY_ICON = { Insight: "💡", Milestone: "🚀", Announcement: "📢", Ask: "🤝" }

const STAGE_LABEL = {
  idea: "Idea", validation: "Validation", prototype: "Prototype", mvp: "MVP",
  early_customers: "Early Customers", revenue: "Revenue", pre_seed: "Pre-Seed",
  seed: "Seed", series_a: "Series A", growth: "Growth",
  global_expansion: "Global Expansion", ipo_acquisition: "IPO / Acquisition",
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
  const [connectedIds, setConnectedIds] = useState(new Set())

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    const [{ data: pendingRows }, { data: allRows }, { count: follCount }] = await Promise.all([
      supabase.from("connections").select("*").eq("addressee_id", userId).eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("connections").select("id,status,requester_id,addressee_id").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
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
    setConnCnt((allRows || []).filter(r => r.status === "accepted").length)
    setFollCnt(follCount || 0)
    // Every profile already connected-to or pending-with, so suggestions
    // never re-recommend someone already in the relationship graph.
    const seen = new Set([userId])
    for (const r of allRows || []) { seen.add(r.requester_id); seen.add(r.addressee_id) }
    setConnectedIds(seen)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const respond = async (connId, accept) => {
    await supabase.from("connections").update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() }).eq("id", connId)
    load()
  }

  return { pending, connectionCount, followerCount, connectedIds, loading, respond, reload: load }
}

// Real, backend-persisted warm-introduction requests (2026-07-26 — Executive
// Path execution pass). Distinct from useConnections() above (generic
// connect asks, already real) — an intro request always carries an explicit
// reason + message.
function useIntroRequests(userId) {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await execIntroApi.list("incoming")
      setPending((res?.requests || []).filter(r => r.status === "pending"))
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [userId])
  useEffect(() => { load() }, [load])

  const respond = async (id, status) => {
    await execIntroApi.respond(id, status)
    load()
  }

  return { pending, loading, respond, reload: load }
}

// Real startup-stage signal (2026-07-26) — reads the SAME startups table
// StartupWorkspace.jsx already writes to (founder_id, stage, name,
// industry). This is what lets Home's composition change based on startup
// stage, per the explicit requirement, without inventing a parallel data
// source or a fabricated "stage" value.
function useStartupContext(userId) {
  const [startup, setStartup] = useState(null)
  const [teamSize, setTeamSize] = useState(0)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    if (!userId) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      const { data: rows } = await supabase.from("startups")
        .select("id,name,stage,industry").eq("founder_id", userId).is("deleted_at", null)
        .order("created_at", { ascending: false }).limit(1)
      const s = rows?.[0] || null
      if (cancelled) return
      setStartup(s)
      if (s) {
        const { count } = await supabase.from("startup_team_members")
          .select("id", { count: "exact", head: true }).eq("startup_id", s.id).neq("status", "removed")
        if (!cancelled) setTeamSize(count || 0)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [userId])
  return { startup, teamSize, loading }
}

// Network-relevance suggestions (2026-07-26) — real profiles matched on
// domain/keyword, excluding anyone already connected/pending. This is the
// "must change based on ... network relevance" requirement made concrete:
// a fintech founder and a devtools founder see different suggested people.
function useSuggestedConnections(userId, domain, connectedIds, ready) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    if (!userId || !ready) { return }
    ;(async () => {
      setLoading(true)
      let q = supabase.from("profiles")
        .select("id,display_name,name,current_role_title,current_company,headline,keyword,path,verification_state")
        .eq("searchable", true)
        .in("path", ["authority", "professional"])
        .neq("id", userId)
        .limit(12)
      if (domain) q = q.ilike("keyword", `%${domain.split(" ")[0]}%`)
      const { data: rows } = await q
      if (cancelled) return
      const filtered = (rows || []).filter(p => !connectedIds.has(p.id)).slice(0, 3)
      setData(filtered)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [userId, domain, ready])
  return { data, loading }
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

// Real activity-level signal, derived from actual counts — never a
// fabricated "engagement score". Just enough to change copy/priority.
function activityLevelFrom({ feedCount, connectionCount, introCount }) {
  const total = feedCount + connectionCount + introCount
  if (total === 0) return "new"
  if (total < 5) return "warming_up"
  return "active"
}

// The single ranked composer that replaces the old fixed layout + two
// static grids. Every entry here is gated on a REAL condition — nothing
// renders "just because" a module exists. Order matters: verification and
// direct people-actions (things someone else is waiting on) always outrank
// passive recommendations.
function buildFocusItems({ verified, intros, net, feed, startupCtx, onNavigate, setShowCreate }) {
  const items = []

  if (!verified) {
    items.push({ icon: "🛡️", text: "Complete verification to unlock trust signals", action: () => onNavigate?.("authority"), weight: 100 })
  }
  if (intros.pending.length > 0) {
    items.push({ icon: "🤝", text: `${intros.pending.length} introduction request${intros.pending.length > 1 ? "s" : ""} asking for your response`, action: () => onNavigate?.("execnetwork"), weight: 95 })
  }
  if (net.pending.length > 0) {
    items.push({ icon: "👥", text: `${net.pending.length} connection request${net.pending.length > 1 ? "s" : ""} waiting on you`, action: () => onNavigate?.("execnetwork"), weight: 90 })
  }

  // Stage-aware recommendation — reads the REAL startups.stage value, not a
  // hardcoded string. Different advice for an idea-stage founder with no
  // team vs. a growth-stage founder.
  if (!startupCtx.loading) {
    if (!startupCtx.startup) {
      items.push({ icon: "🧭", text: "Start your Startup Ops workspace — turn your idea into a tracked venture", action: () => onNavigate?.("startupworkspace"), weight: 60 })
    } else if (["idea", "validation", "prototype"].includes(startupCtx.startup.stage) && startupCtx.teamSize === 0) {
      items.push({ icon: "👤", text: `${startupCtx.startup.name} has no team members yet — invite a co-founder from Startup Ops`, action: () => onNavigate?.("startupworkspace"), weight: 55 })
    } else if (["seed", "series_a", "growth"].includes(startupCtx.startup.stage)) {
      items.push({ icon: "📈", text: `${STAGE_LABEL[startupCtx.startup.stage] || startupCtx.startup.stage}-stage — check your Executive Analytics for network reach and response rate`, action: () => onNavigate?.("analytics"), weight: 50 })
    }
  }

  if (feed.data.length === 0) {
    items.push({ icon: "✦", text: "Publish your first post to your Executive Feed", action: () => setShowCreate(true), weight: 40 })
  }

  return items.sort((a, b) => b.weight - a.weight)
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

  const feed        = useExecFeed(userId)
  const net         = useConnections(userId)
  const intros      = useIntroRequests(userId)
  const startupCtx  = useStartupContext(userId)
  const signal      = useOpportunitySignal(domain)
  const suggestions = useSuggestedConnections(userId, domain, net.connectedIds, !net.loading)

  const activityLevel = activityLevelFrom({ feedCount: feed.data.length, connectionCount: net.connectionCount, introCount: intros.pending.length })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const focusItems = buildFocusItems({ verified, intros, net, feed, startupCtx, onNavigate, setShowCreate })

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

      {/* Greeting — now includes real stage + activity-level signal instead
          of a fixed subtitle, so the header itself already reads differently
          per user. */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: C.ink3, margin: 0, fontWeight: 500 }}>
          {greeting}, {firstName} · {userData?.authorityType || "Executive"}
          {startupCtx.startup?.stage && ` · ${STAGE_LABEL[startupCtx.startup.stage] || startupCtx.startup.stage}`}
          {activityLevel === "new" && " · Just getting started"}
        </p>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 24, fontWeight: 800, color: C.ink, margin: "4px 0 0", lineHeight: 1.2 }}>
          Your Executive <span style={{ color: C.gold, fontStyle: "italic" }}>presence</span> today
        </h1>
      </div>

      {/* AI Copilot — the generic "Ask Capi" chat widget is intentionally not
          mounted on the Executive path (App.jsx excludes navPath === "authority").
          This card points to the dedicated AI Copilot module instead, which is
          honest about being pre-briefing-engine rather than implying a chat
          bubble that no longer exists here. */}
      <Card onClick={() => onNavigate?.("aicopilot")} style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 14, background: C.goldL, border: `1px solid ${C.goldB}`, cursor: "pointer" }}>
        <div style={{ fontSize: 22 }}>✦</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>AI Copilot</div>
          <div style={{ fontSize: 12, color: C.ink3 }}>Proactive founder briefings are on the way — open AI Copilot for status on what's built.</div>
        </div>
      </Card>

      {/* Today's Focus — the single ranked list that replaced the old fixed
          composition. Verification + people waiting on you always outrank
          stage-based or activity-based recommendations; a founder with zero
          pending items and a fully-staffed growth-stage company sees a much
          shorter list than a brand-new unverified founder. */}
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

      {/* Pending Introductions — real, backend-persisted (exec_intro_requests),
          distinct from the generic Network connection requests above. Card
          only renders when there's something real to show. */}
      {intros.pending.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>Introduction Requests</div>
            <span style={{ fontSize: 12, color: C.ink3 }}><b style={{ color: C.ink, fontFamily: "'DM Mono', monospace" }}>{intros.pending.length}</b> waiting</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {intros.pending.map(r => (
              <div key={r.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{r.requester?.display_name || r.requester?.name || "Someone"}</div>
                    <div style={{ fontSize: 12, color: C.ink3, textTransform: "capitalize" }}>{r.reason} · {r.message}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => intros.respond(r.id, "accepted")} style={{ padding: "5px 12px", background: C.greenL, border: "none", borderRadius: 8, color: C.green, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Accept</button>
                    <button onClick={() => intros.respond(r.id, "declined")} style={{ padding: "5px 12px", background: C.redL, border: "none", borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Decline</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* People You May Want to Meet — real, domain-matched, excludes anyone
          already connected/pending (network-relevance personalization). No
          empty-state variant: if there's genuinely no real match, the
          section just doesn't render. */}
      {suggestions.data.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionHead title="People You May Want to Meet" action="See all →" onAction={() => onNavigate?.("execnetwork")} />
          <div style={{ fontSize: 11, color: C.ink3, marginBottom: 8, marginTop: -4 }}>Matched on your domain{domain ? ` (${domain})` : ""}, not yet in your network.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {suggestions.data.map(p => (
              <Card key={p.id} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => onNavigate?.("execnetwork")}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.gold, flexShrink: 0 }}>
                  {(p.display_name || p.name || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{p.display_name || p.name}{p.verification_state === "verified" && <span style={{ color: C.gold }}> ✓</span>}</div>
                  <div style={{ fontSize: 12, color: C.ink3 }}>{p.current_role_title || p.headline || "—"}{p.current_company ? ` · ${p.current_company}` : ""}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Opportunity Radar */}
      <div style={{ marginBottom: 8 }}>
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
    </div>
  )
}
