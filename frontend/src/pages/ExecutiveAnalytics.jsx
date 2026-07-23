/**
 * ExecutiveAnalytics.jsx — Sprint 6a of EXECUTIVE_TECHNICAL_BLUEPRINT.md §14
 *
 * IDENTITY_INTELLIGENCE_LAYER_DESIGN_SPEC.md §3 designs cross-startup
 * analytics, but scoped it to needing Growth/Funding data first. What IS
 * buildable today without any new tables: a real rollup of everything
 * Startup Workspace, Network, and Executive Feed already track — startups,
 * milestones, team, customers/deal value, hiring, documents, connections,
 * and the founder's own feed engagement. No invented metrics (no "market
 * presence index", no fabricated trend lines) — just real counts and sums
 * across tables that already exist and are already written to elsewhere in
 * the app.
 */
import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { nexusApi } from "../lib/api"
import { EXEC_COLORS as C, Card, SectionHead, EmptyState } from "../components/ExecutiveUI"

function Stat({ label, value, color = C.ink }) {
  return (
    <Card style={{ padding: "14px 16px" }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: C.ink3, fontWeight: 600, marginTop: 4 }}>{label}</div>
    </Card>
  )
}

function useAnalytics(userId) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    try {
      const { data: startups } = await supabase
        .from("startups").select("id").eq("founder_id", userId).is("deleted_at", null)
      const ids = (startups || []).map(s => s.id)

      const [milestones, team, customers, jobs, docs, connections, myPosts] = await Promise.all([
        ids.length ? supabase.from("startup_milestones").select("id", { count: "exact", head: true }).in("startup_id", ids) : { count: 0 },
        ids.length ? supabase.from("startup_team_members").select("id", { count: "exact", head: true }).in("startup_id", ids).neq("status", "removed") : { count: 0 },
        ids.length ? supabase.from("startup_customers").select("value,stage").in("startup_id", ids).is("deleted_at", null) : { data: [] },
        ids.length ? supabase.from("jobs").select("id", { count: "exact", head: true }).in("startup_id", ids).eq("active", true) : { count: 0 },
        ids.length ? supabase.from("vault_documents").select("id", { count: "exact", head: true }).in("startup_id", ids) : { count: 0 },
        nexusApi.connections().catch(() => []),
        supabase.from("pulse_posts").select("acknowledge_count,signal_count,comment_count").eq("author_id", userId),
      ])

      const customerRows = customers.data || []
      const closedValue  = customerRows.filter(c => c.stage === "customer").reduce((s, c) => s + (Number(c.value) || 0), 0)
      const connectionRows = connections || []
      const postRows = myPosts.data || []
      const engagement = postRows.reduce((s, p) => s + (p.acknowledge_count || 0) + (p.signal_count || 0) + (p.comment_count || 0), 0)

      setData({
        startups: ids.length,
        milestones: milestones.count || 0,
        team: team.count || 0,
        customers: customerRows.length,
        closedValue,
        jobsPosted: jobs.count || 0,
        documents: docs.count || 0,
        connected: connectionRows.filter(c => c.status === "accepted").length,
        pending: connectionRows.filter(c => c.status === "pending").length,
        postsPublished: postRows.length,
        engagement,
      })
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export default function ExecutiveAnalytics({ user, userData }) {
  const userId = user?.id || user?.uid
  const { data, loading } = useAnalytics(userId)

  return (
    <div style={{ background: "#F6F6F1", flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 32px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: C.ink3, margin: 0, fontWeight: 500 }}>Executive</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: "4px 0 0" }}>Analytics</h1>
        <p style={{ fontSize: 12, color: C.ink3, margin: "4px 0 0" }}>
          A real rollup of what's already tracked across Startup Workspace, Network, and Executive Feed — no invented metrics.
        </p>
      </div>

      {loading || !data ? null : data.startups === 0 ? (
        <EmptyState icon="▲" title="Nothing to analyze yet" sub="Create a startup and start logging milestones, customers, and hiring — Analytics rolls up as you go." />
      ) : (
        <>
          <SectionHead title="Startup" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
            <Stat label="Startups" value={data.startups} />
            <Stat label="Milestones logged" value={data.milestones} />
            <Stat label="Team members" value={data.team} />
          </div>

          <SectionHead title="Growth" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
            <Stat label="Customers" value={data.customers} />
            <Stat label="Closed value" value={`₹${data.closedValue.toLocaleString("en-IN")}`} color={C.green} />
            <Stat label="Open roles" value={data.jobsPosted} />
          </div>

          <SectionHead title="Network & Presence" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 20 }}>
            <Stat label="Connections" value={data.connected} />
            <Stat label="Pending requests" value={data.pending} />
            <Stat label="Posts published" value={data.postsPublished} />
            <Stat label="Feed engagement" value={data.engagement} color={C.gold} />
          </div>

          <SectionHead title="Documents" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            <Stat label="Vault documents" value={data.documents} />
          </div>
        </>
      )}
    </div>
  )
}
