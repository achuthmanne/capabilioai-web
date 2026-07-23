/**
 * Growth.jsx — Sprint 6a of EXECUTIVE_TECHNICAL_BLUEPRINT.md §14
 *
 * Per EXECUTIVE_PATH_INFORMATION_ARCHITECTURE.md, Growth covers Sales/
 * Marketing/Retention/Expansion. There is no marketing or revenue-tracking
 * data model in Capabilio at all — so this does NOT invent MRR, churn, or
 * campaign numbers. What IS real: startup_customers (added in Sprint 3,
 * StartupWorkspace.jsx → Customers tab) already tracks a lead→meeting→
 * contract→customer funnel with an optional deal value per row, across all
 * of a founder's startups. This page is that same data, rolled up across
 * every startup the founder owns, framed as the real slice of "Growth" that
 * exists today — a sales funnel, not a growth-marketing suite.
 */
import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { EXEC_COLORS as C, Card, SectionHead, EmptyState, StatusPill } from "../components/ExecutiveUI"

const STAGES = ["lead", "meeting", "contract", "customer"]
const STAGE_LABEL = { lead: "Lead", meeting: "Meeting", contract: "Contract", customer: "Customer" }
const HEALTH_TONE = { good: "positive", ok: "warning", at_risk: "critical" }

function useGrowthData(founderId) {
  const [startups, setStartups]   = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    if (!founderId) { setLoading(false); return }
    setLoading(true)
    const { data: sRows } = await supabase
      .from("startups").select("id,name").eq("founder_id", founderId).is("deleted_at", null)
    setStartups(sRows || [])
    const ids = (sRows || []).map(s => s.id)
    if (ids.length === 0) { setCustomers([]); setLoading(false); return }
    const { data: cRows } = await supabase
      .from("startup_customers").select("*").in("startup_id", ids).is("deleted_at", null)
      .order("created_at", { ascending: false })
    setCustomers(cRows || [])
    setLoading(false)
  }, [founderId])

  useEffect(() => { load() }, [load])
  return { startups, customers, loading, reload: load }
}

export default function Growth({ user, userData }) {
  const founderId = user?.id || user?.uid
  const { startups, customers, loading } = useGrowthData(founderId)

  const startupName = (id) => startups.find(s => s.id === id)?.name || "—"
  const byStage = (stage) => customers.filter(c => c.stage === stage)
  const closedValue = customers.filter(c => c.stage === "customer").reduce((sum, c) => sum + (Number(c.value) || 0), 0)
  const pipelineValue = customers.filter(c => c.stage !== "customer").reduce((sum, c) => sum + (Number(c.value) || 0), 0)

  return (
    <div style={{ background: "#F6F6F1", flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 32px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: C.ink3, margin: 0, fontWeight: 500 }}>Executive</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: "4px 0 0" }}>Growth</h1>
        <p style={{ fontSize: 12, color: C.ink3, margin: "4px 0 0" }}>
          Sales funnel across all your startups — the real slice of Growth today. Marketing/Retention/Expansion need their own data model first (not built yet).
        </p>
      </div>

      {loading ? null : startups.length === 0 ? (
        <EmptyState icon="↗" title="No startups yet" sub="Create a startup in Startup Workspace first — Growth rolls up its Customers data." />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <Card style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: C.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Closed deal value</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 800, color: C.green, marginTop: 4 }}>₹{closedValue.toLocaleString("en-IN")}</div>
            </Card>
            <Card style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: C.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Open pipeline value</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 800, color: C.gold, marginTop: 4 }}>₹{pipelineValue.toLocaleString("en-IN")}</div>
            </Card>
          </div>

          <SectionHead title="Funnel" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
            {STAGES.map(stage => (
              <Card key={stage} style={{ padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 800, color: C.ink }}>{byStage(stage).length}</div>
                <div style={{ fontSize: 10.5, color: C.ink3, fontWeight: 600, marginTop: 2 }}>{STAGE_LABEL[stage]}</div>
              </Card>
            ))}
          </div>

          <SectionHead title="Customers" />
          {customers.length === 0 ? (
            <EmptyState icon="↗" title="No customers logged yet" sub="Add customers from Startup Workspace → Customers tab." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {customers.map(c => (
                <Card key={c.id} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: C.ink3 }}>{startups.length > 1 ? startupName(c.startup_id) + " · " : ""}{STAGE_LABEL[c.stage] || c.stage}</div>
                  </div>
                  {c.value != null && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: C.ink2 }}>₹{Number(c.value).toLocaleString("en-IN")}</span>}
                  {c.health && <StatusPill tone={HEALTH_TONE[c.health] || "neutral"}>{c.health.replace("_", " ")}</StatusPill>}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
