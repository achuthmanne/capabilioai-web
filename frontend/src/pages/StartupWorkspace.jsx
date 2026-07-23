/**
 * StartupWorkspace.jsx — the center of the Executive Path.
 *
 * Sprint 2: real Idea Lab (create/list/promote/archive/delete) + real
 * Startup Timeline, wired to startups/startup_ideas/startup_milestones.
 * Sprint 3 (EXECUTIVE_TECHNICAL_BLUEPRINT.md §14): real Team
 * (startup_team_members), real Customers (startup_customers), and real
 * Hiring/Documents as scoped views over the *existing* jobs/vault_documents
 * tables (startup_id column added, not a parallel system) per
 * STARTUP_WORKSPACE_DESIGN_SPEC.md §11/§12.
 * Venture Intelligence still has no backing tables (needs the Review Cycle
 * system first) and stays an honest "not built" state.
 */
import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { vaultApi } from "../lib/api"
import { EXEC_COLORS as C, Card, Label, SectionHead, EmptyState, StatusPill } from "../components/ExecutiveUI"

const LIFECYCLE_STAGES = [
  { id: "idea",             label: "Idea" },
  { id: "validation",       label: "Validation" },
  { id: "prototype",        label: "Prototype" },
  { id: "mvp",              label: "MVP" },
  { id: "early_customers",  label: "Early Customers" },
  { id: "revenue",          label: "Revenue" },
  { id: "pre_seed",         label: "Pre-Seed" },
  { id: "seed",             label: "Seed" },
  { id: "series_a",         label: "Series A" },
  { id: "growth",           label: "Growth" },
  { id: "global_expansion", label: "Global Expansion" },
  { id: "ipo_acquisition",  label: "IPO / Acquisition" },
]

const WORKSPACE_TABS = [
  { id: "overview",  label: "Overview" },
  { id: "idealab",   label: "Idea Lab" },
  { id: "vi",        label: "Venture Intelligence" },
  { id: "timeline",  label: "Startup Timeline" },
  { id: "team",      label: "Team" },
  { id: "hiring",    label: "Hiring" },
  { id: "customers", label: "Customers" },
  { id: "documents", label: "Documents" },
]

const IDEA_STATUS_TONE = { draft: "neutral", submitted: "info", in_review: "warning", reviewed: "positive", archived: "neutral" }

// ─── Data hooks ───────────────────────────────────────────────────────────────

function useStartups(founderId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!founderId) { setLoading(false); return }
    setLoading(true)
    const { data: rows } = await supabase
      .from("startups").select("*").eq("founder_id", founderId).is("deleted_at", null)
      .order("created_at", { ascending: false })
    setData(rows || []); setLoading(false)
  }, [founderId])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

function useStartupIdeas(founderId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!founderId) { setLoading(false); return }
    setLoading(true)
    const { data: rows } = await supabase
      .from("startup_ideas").select("*").eq("founder_id", founderId).is("deleted_at", null)
      .order("created_at", { ascending: false })
    setData(rows || []); setLoading(false)
  }, [founderId])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

function useStartupMilestones(startupId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!startupId) { setData([]); setLoading(false); return }
    setLoading(true)
    const { data: rows } = await supabase
      .from("startup_milestones").select("*").eq("startup_id", startupId)
      .order("reached_at", { ascending: true })
    setData(rows || []); setLoading(false)
  }, [startupId])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

function useTeamMembers(startupId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!startupId) { setData([]); setLoading(false); return }
    setLoading(true)
    const { data: rows } = await supabase
      .from("startup_team_members").select("*").eq("startup_id", startupId).neq("status", "removed")
      .order("invited_at", { ascending: false })
    setData(rows || []); setLoading(false)
  }, [startupId])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

function useStartupCustomers(startupId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!startupId) { setData([]); setLoading(false); return }
    setLoading(true)
    const { data: rows } = await supabase
      .from("startup_customers").select("*").eq("startup_id", startupId).is("deleted_at", null)
      .order("created_at", { ascending: false })
    setData(rows || []); setLoading(false)
  }, [startupId])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

function useStartupJobs(startupId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!startupId) { setData([]); setLoading(false); return }
    setLoading(true)
    const { data: rows } = await supabase
      .from("jobs").select("*").eq("startup_id", startupId)
      .order("posted_at", { ascending: false })
    setData(rows || []); setLoading(false)
  }, [startupId])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

function useStartupDocuments(startupId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!startupId) { setData([]); setLoading(false); return }
    setLoading(true)
    try { setData((await vaultApi.list(startupId)) || []) } catch (e) { console.error(e) }
    setLoading(false)
  }, [startupId])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

// ─── Create / Edit Idea form ──────────────────────────────────────────────────

const IDEA_FIELDS = [
  { key: "title", label: "Idea Title", required: true },
  { key: "problem_statement", label: "Problem Statement", textarea: true },
  { key: "solution", label: "Solution", textarea: true },
  { key: "industry", label: "Industry" },
  { key: "target_audience", label: "Target Audience" },
  { key: "market_size", label: "Market Size" },
  { key: "business_model", label: "Business Model" },
  { key: "competitive_advantage", label: "Competitive Advantage", textarea: true },
  { key: "revenue_model", label: "Revenue Model" },
  { key: "patent_status", label: "Patent Status" },
  { key: "impact", label: "Impact", textarea: true },
]

function IdeaForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState(() => Object.fromEntries(IDEA_FIELDS.map(f => [f.key, initial?.[f.key] || ""])))
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inp = { width: "100%", padding: "10px 14px", background: "#F9F8F6", border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.ink, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }

  const save = async () => {
    if (!form.title.trim() || saving) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(26,26,24,0.5)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 560, maxHeight: "88vh", background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{initial ? "Edit Idea" : "Create Idea"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.ink3, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
          {IDEA_FIELDS.map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{f.label}{f.required && " *"}</div>
              {f.textarea ? (
                <textarea value={form[f.key]} onChange={e => set(f.key, e.target.value)} rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
              ) : (
                <input value={form[f.key]} onChange={e => set(f.key, e.target.value)} style={inp} />
              )}
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.ink3, background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 10, padding: "10px 12px", lineHeight: 1.6 }}>
            Deck/video/prototype uploads and AI Review aren't wired up yet — this form saves the structured idea record for real; those two pieces are next.
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={save} disabled={!form.title.trim() || saving}
            style={{ width: "100%", padding: 13, background: form.title.trim() ? C.gold : "#F3F1EC", border: "none", borderRadius: 12, color: form.title.trim() ? "#fff" : C.ink3, fontSize: 13, fontWeight: 800, cursor: form.title.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            {saving ? "Saving..." : initial ? "Save Changes" : "Create Idea"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Small shared modal shell + form field helpers ───────────────────────────

function ModalShell({ title, onClose, children, onSubmit, submitLabel, submitDisabled, submitting }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(26,26,24,0.5)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.ink3, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "18px 22px" }}>{children}</div>
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={onSubmit} disabled={submitDisabled || submitting}
            style={{ width: "100%", padding: 13, background: submitDisabled ? "#F3F1EC" : C.gold, border: "none", borderRadius: 12, color: submitDisabled ? C.ink3 : "#fff", fontSize: 13, fontWeight: 800, cursor: submitDisabled ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {submitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const fieldStyle = { width: "100%", padding: "10px 14px", background: "#F9F8F6", border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.ink, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", marginBottom: 12 }
function Field({ label, children }) {
  return <div><div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>{children}</div>
}

function InviteTeamModal({ onClose, onSave }) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("employee")
  const [permission, setPermission] = useState("viewer")
  const [saving, setSaving] = useState(false)
  return (
    <ModalShell title="Add a team member" onClose={onClose} submitLabel="Add" submitDisabled={!email.trim()} submitting={saving}
      onSubmit={async () => { setSaving(true); await onSave({ email: email.trim(), role, permission }); setSaving(false); onClose() }}>
      <Field label="Email"><input style={fieldStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" /></Field>
      <Field label="Role">
        <select style={fieldStyle} value={role} onChange={e => setRole(e.target.value)}>
          {["co_founder","employee","advisor","mentor","board_member"].map(r => <option key={r} value={r}>{r.replace("_"," ")}</option>)}
        </select>
      </Field>
      <Field label="Permission">
        <select style={{ ...fieldStyle, marginBottom: 0 }} value={permission} onChange={e => setPermission(e.target.value)}>
          {["admin","editor","viewer"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>
      <div style={{ fontSize: 11, color: C.ink3, marginTop: 10, lineHeight: 1.6 }}>This records real membership state now — sending an actual invite email isn't wired up yet, so let them know directly for the moment.</div>
    </ModalShell>
  )
}

function AddCustomerModal({ onClose, onSave }) {
  const [name, setName] = useState("")
  const [stage, setStage] = useState("lead")
  const [value, setValue] = useState("")
  const [saving, setSaving] = useState(false)
  return (
    <ModalShell title="Add a customer" onClose={onClose} submitLabel="Add" submitDisabled={!name.trim()} submitting={saving}
      onSubmit={async () => { setSaving(true); await onSave({ name: name.trim(), stage, value: value ? Number(value) : null }); setSaving(false); onClose() }}>
      <Field label="Name"><input style={fieldStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Company or contact name" /></Field>
      <Field label="Stage">
        <select style={fieldStyle} value={stage} onChange={e => setStage(e.target.value)}>
          {["lead","meeting","contract","customer"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Deal value (optional)"><input style={{ ...fieldStyle, marginBottom: 0 }} value={value} onChange={e => setValue(e.target.value)} placeholder="₹" type="number" /></Field>
    </ModalShell>
  )
}

function PostRoleModal({ onClose, onSave }) {
  const [title, setTitle] = useState("")
  const [jobType, setJobType] = useState("full_time")
  const [workMode, setWorkMode] = useState("remote")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  return (
    <ModalShell title="Post a role" onClose={onClose} submitLabel="Post" submitDisabled={!title.trim()} submitting={saving}
      onSubmit={async () => { setSaving(true); await onSave({ title: title.trim(), job_type: jobType, work_mode: workMode, jd_text: description.trim() }); setSaving(false); onClose() }}>
      <Field label="Title"><input style={fieldStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Founding Engineer" /></Field>
      <Field label="Type">
        <select style={fieldStyle} value={jobType} onChange={e => setJobType(e.target.value)}>
          {["full_time","part_time","internship","contract"].map(t => <option key={t} value={t}>{t.replace("_"," ")}</option>)}
        </select>
      </Field>
      <Field label="Work mode">
        <select style={fieldStyle} value={workMode} onChange={e => setWorkMode(e.target.value)}>
          {["remote","hybrid","onsite"].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="Description"><textarea style={{ ...fieldStyle, marginBottom: 0, resize: "vertical" }} rows={4} value={description} onChange={e => setDescription(e.target.value)} /></Field>
    </ModalShell>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function StartupWorkspace({ user, userData, onNavigate }) {
  const founderId = user?.id || user?.uid
  const [tab, setTab] = useState("overview")
  const [showIdeaForm, setShowIdeaForm] = useState(false)
  const [editingIdea, setEditingIdea] = useState(null)
  const [activeStartupId, setActiveStartupId] = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showPostRole, setShowPostRole] = useState(false)
  const [uploading, setUploading] = useState(false)

  const startups = useStartups(founderId)
  const ideas    = useStartupIdeas(founderId)

  const activeStartup = startups.data.find(s => s.id === activeStartupId) || startups.data[0] || null
  const milestones = useStartupMilestones(activeStartup?.id)
  const team       = useTeamMembers(activeStartup?.id)
  const customers  = useStartupCustomers(activeStartup?.id)
  const jobs       = useStartupJobs(activeStartup?.id)
  const documents  = useStartupDocuments(activeStartup?.id)

  const founderName = userData?.display_name || userData?.name || user?.displayName || "You"

  const inviteMember = async ({ email, role, permission }) => {
    await supabase.from("startup_team_members").insert({
      startup_id: activeStartup.id, invited_email: email, role,
      permission_level: permission, invited_by: founderId, status: "pending",
    })
    await team.reload()
  }
  const removeMember = async (m) => {
    await supabase.from("startup_team_members").update({ status: "removed" }).eq("id", m.id)
    await team.reload()
  }

  const addCustomer = async ({ name, stage, value }) => {
    await supabase.from("startup_customers").insert({ startup_id: activeStartup.id, name, stage, value, created_by: founderId })
    await customers.reload()
  }
  const advanceCustomer = async (c) => {
    const order = ["lead","meeting","contract","customer"]
    const next = order[Math.min(order.indexOf(c.stage) + 1, order.length - 1)]
    await supabase.from("startup_customers").update({ stage: next }).eq("id", c.id)
    await customers.reload()
  }

  const postRole = async ({ title, job_type, work_mode, jd_text }) => {
    await supabase.from("jobs").insert({
      startup_id: activeStartup.id, title, job_type, work_mode, jd_text,
      company: activeStartup.name, is_active: true, active: true, posted_at: new Date().toISOString(),
    })
    await jobs.reload()
  }

  const uploadDocument = async (file) => {
    if (!file || !activeStartup) return
    setUploading(true)
    try { await vaultApi.upload(file, "startup_document", [], false, activeStartup.id) } catch (e) { console.error(e) }
    setUploading(false)
    await documents.reload()
  }

  const saveIdea = async (form) => {
    if (editingIdea) {
      await supabase.from("startup_ideas").update(form).eq("id", editingIdea.id)
    } else {
      await supabase.from("startup_ideas").insert({ ...form, founder_id: founderId, status: "draft" })
    }
    setEditingIdea(null)
    await ideas.reload()
  }

  const archiveIdea = async (idea) => {
    await supabase.from("startup_ideas").update({ status: "archived" }).eq("id", idea.id)
    await ideas.reload()
  }

  const deleteIdea = async (idea) => {
    await supabase.from("startup_ideas").update({ deleted_at: new Date().toISOString() }).eq("id", idea.id)
    await ideas.reload()
  }

  const promoteIdea = async (idea) => {
    const { data: newStartup, error } = await supabase
      .from("startups")
      .insert({ founder_id: founderId, name: idea.title, one_liner: idea.solution?.slice(0, 140) || "", industry: idea.industry, stage: "idea" })
      .select().single()
    if (error) { console.error("Promote error:", error.message); return }
    await supabase.from("startup_ideas").update({ status: "reviewed", startup_id: newStartup.id }).eq("id", idea.id)
    await supabase.from("startup_milestones").insert({ startup_id: newStartup.id, stage: "idea", notes: `Promoted from idea: ${idea.title}` })
    await Promise.all([startups.reload(), ideas.reload()])
    setActiveStartupId(newStartup.id)
    setTab("timeline")
  }

  const logMilestone = async (stage) => {
    if (!activeStartup) return
    await supabase.from("startup_milestones").insert({ startup_id: activeStartup.id, stage })
    await supabase.from("startups").update({ stage }).eq("id", activeStartup.id)
    await Promise.all([milestones.reload(), startups.reload()])
  }

  const reachedStageIndex = activeStartup ? LIFECYCLE_STAGES.findIndex(s => s.id === activeStartup.stage) : -1

  return (
    <div style={{ background: `radial-gradient(ellipse at 50% 20%, rgba(245,158,11,0.08) 0%, transparent 55%), #FFFFFF`, flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 32px", fontFamily: "DM Sans, sans-serif" }}>
      {showIdeaForm && (
        <IdeaForm initial={editingIdea} onClose={() => { setShowIdeaForm(false); setEditingIdea(null) }} onSave={saveIdea} />
      )}
      {showInvite && <InviteTeamModal onClose={() => setShowInvite(false)} onSave={inviteMember} />}
      {showAddCustomer && <AddCustomerModal onClose={() => setShowAddCustomer(false)} onSave={addCustomer} />}
      {showPostRole && <PostRoleModal onClose={() => setShowPostRole(false)} onSave={postRole} />}

      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 13, color: C.ink3, margin: 0, fontWeight: 500 }}>Startup Workspace</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: "4px 0 0" }}>
          {activeStartup ? activeStartup.name : "Build your company here"}
        </h1>
        {activeStartup && <StatusPill tone="warning">{LIFECYCLE_STAGES[reachedStageIndex]?.label || activeStartup.stage}</StatusPill>}
      </div>

      {/* Startup switcher, only shown once a founder has more than one */}
      {startups.data.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {startups.data.map(s => (
            <button key={s.id} onClick={() => setActiveStartupId(s.id)}
              style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${s.id === activeStartup?.id ? C.goldB : C.border}`, background: s.id === activeStartup?.id ? C.goldL : "transparent", color: s.id === activeStartup?.id ? C.goldD : C.ink3, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "#F3F1EC", borderRadius: 12, padding: 4, overflowX: "auto" }}>
        {WORKSPACE_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 9, border: "none", cursor: "pointer", background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? C.goldD : C.ink3, fontSize: 12.5, fontWeight: 700, fontFamily: "inherit" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        !activeStartup ? (
          <EmptyState icon="🧭" title="No startup yet"
            sub="Startups here start as ideas. Head to Idea Lab, create your first idea, and promote it once you're ready."
            action="Go to Idea Lab" onAction={() => setTab("idealab")} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card><SectionHead title="Industry" /><div style={{ fontSize: 14, color: C.ink }}>{activeStartup.industry || "Not set"}</div></Card>
            <Card><SectionHead title="Stage" /><div style={{ fontSize: 14, color: C.ink }}>{LIFECYCLE_STAGES[reachedStageIndex]?.label}</div></Card>
            <Card style={{ gridColumn: "1 / -1" }}>
              <SectionHead title="One-liner" />
              <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.6 }}>{activeStartup.one_liner || "Not set yet."}</div>
            </Card>
            <Card><SectionHead title="Ideas" /><div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: C.ink }}>{ideas.data.filter(i => i.startup_id === activeStartup.id).length}</div></Card>
            <Card><SectionHead title="Milestones logged" /><div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: C.ink }}>{milestones.data.length}</div></Card>
          </div>
        )
      )}

      {/* IDEA LAB */}
      {tab === "idealab" && (
        <div>
          <SectionHead title="Idea Lab" action="+ Create Idea" onAction={() => setShowIdeaForm(true)} />
          {ideas.loading ? null : ideas.data.length === 0 ? (
            <EmptyState icon="💡" title="No ideas yet" sub="Create your first idea to start the Idea Lab flow." action="Create Idea" onAction={() => setShowIdeaForm(true)} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ideas.data.map(idea => (
                <Card key={idea.id} style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <StatusPill tone={IDEA_STATUS_TONE[idea.status] || "neutral"}>{idea.status}</StatusPill>
                        {idea.industry && <Label color={C.blue} bg={C.blueL}>{idea.industry}</Label>}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{idea.title}</div>
                      {idea.problem_statement && <div style={{ fontSize: 12.5, color: C.ink3, marginTop: 4, lineHeight: 1.6 }}>{idea.problem_statement}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button onClick={() => { setEditingIdea(idea); setShowIdeaForm(true) }} style={{ padding: "6px 12px", background: "#F3F1EC", border: "none", borderRadius: 8, color: C.ink2, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                    {!idea.startup_id && idea.status !== "archived" && (
                      <button onClick={() => promoteIdea(idea)} style={{ padding: "6px 12px", background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 8, color: C.goldD, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Move to Startup →</button>
                    )}
                    {idea.status !== "archived" && (
                      <button onClick={() => archiveIdea(idea)} style={{ padding: "6px 12px", background: "#F3F1EC", border: "none", borderRadius: 8, color: C.ink3, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Archive</button>
                    )}
                    <button onClick={() => deleteIdea(idea)} style={{ padding: "6px 12px", background: C.redL, border: "none", borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VENTURE INTELLIGENCE — no review-cycle/report tables yet (Sprint 6-7) */}
      {tab === "vi" && (
        <EmptyState icon="📡" title="Venture Intelligence isn't wired up yet"
          sub="This needs a review-cycle system (AI + community reviewers) before a real report can be generated — that's the next major slice, not a screen worth faking with sample data. See STARTUP_WORKSPACE_DESIGN_SPEC.md §4–6." />
      )}

      {/* STARTUP TIMELINE */}
      {tab === "timeline" && (
        !activeStartup ? (
          <EmptyState icon="🗺" title="No startup to show a timeline for yet" sub="Promote an idea from Idea Lab first." action="Go to Idea Lab" onAction={() => setTab("idealab")} />
        ) : (
          <div>
            <SectionHead title="Lifecycle" />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 20 }}>
              {LIFECYCLE_STAGES.map((s, i) => {
                const reached = i <= reachedStageIndex
                const current = i === reachedStageIndex
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: reached ? C.gold : "#E5E1D8", flexShrink: 0, opacity: current ? 1 : reached ? 0.7 : 1 }} />
                    <div style={{ fontSize: 13, fontWeight: current ? 800 : 600, color: reached ? C.ink : C.ink3, flex: 1 }}>{s.label}</div>
                    {!reached && i === reachedStageIndex + 1 && (
                      <button onClick={() => logMilestone(s.id)} style={{ padding: "5px 12px", background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 8, color: C.goldD, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Mark reached</button>
                    )}
                  </div>
                )
              })}
            </div>
            <SectionHead title="Milestone log" />
            {milestones.data.length === 0 ? (
              <EmptyState icon="✦" title="No milestones logged yet" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {milestones.data.map(m => (
                  <Card key={m.id} style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{LIFECYCLE_STAGES.find(s => s.id === m.stage)?.label || m.stage}</div>
                    <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{new Date(m.reached_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{m.notes ? ` · ${m.notes}` : ""}</div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* TEAM */}
      {tab === "team" && (
        !activeStartup ? (
          <EmptyState icon="🧭" title="No startup yet" sub="Promote an idea from Idea Lab first." action="Go to Idea Lab" onAction={() => setTab("idealab")} />
        ) : (
          <div>
            <SectionHead title="Team" action="+ Add member" onAction={() => setShowInvite(true)} />
            <Card style={{ marginBottom: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{founderName}</div>
                <div style={{ fontSize: 11, color: C.ink3 }}>Founder</div>
              </div>
              <StatusPill tone="positive">Owner</StatusPill>
            </Card>
            {team.data.length === 0 ? (
              <EmptyState icon="👥" title="No other team members yet" sub="Add a co-founder, employee, advisor, mentor, or board member." />
            ) : team.data.map(m => (
              <Card key={m.id} style={{ marginBottom: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{m.invited_email || m.user_id}</div>
                  <div style={{ fontSize: 11, color: C.ink3 }}>{m.role.replace("_", " ")} · {m.permission_level}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StatusPill tone={m.status === "active" ? "positive" : "warning"}>{m.status}</StatusPill>
                  <button onClick={() => removeMember(m)} style={{ padding: "5px 10px", background: C.redL, border: "none", borderRadius: 8, color: C.red, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Remove</button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* HIRING — reuses the real jobs table, scoped by startup_id */}
      {tab === "hiring" && (
        !activeStartup ? (
          <EmptyState icon="🧭" title="No startup yet" sub="Promote an idea from Idea Lab first." action="Go to Idea Lab" onAction={() => setTab("idealab")} />
        ) : (
          <div>
            <SectionHead title="Hiring" action="+ Post a Role" onAction={() => setShowPostRole(true)} />
            {jobs.data.length === 0 ? (
              <EmptyState icon="💼" title="No open roles yet" sub="Roles you post here appear on the real Capabilio jobs board, scoped to your startup." action="Post a Role" onAction={() => setShowPostRole(true)} />
            ) : jobs.data.map(j => (
              <Card key={j.id} style={{ marginBottom: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{j.title}</div>
                    <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{j.job_type?.replace("_", " ")} · {j.work_mode}</div>
                  </div>
                  <StatusPill tone={j.is_active ? "positive" : "neutral"}>{j.is_active ? "Open" : "Closed"}</StatusPill>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* CUSTOMERS */}
      {tab === "customers" && (
        !activeStartup ? (
          <EmptyState icon="🧭" title="No startup yet" sub="Promote an idea from Idea Lab first." action="Go to Idea Lab" onAction={() => setTab("idealab")} />
        ) : (
          <div>
            <SectionHead title="Customers" action="+ Add Customer" onAction={() => setShowAddCustomer(true)} />
            {customers.data.length === 0 ? (
              <EmptyState icon="📈" title="No customers logged yet" action="Add Customer" onAction={() => setShowAddCustomer(true)} />
            ) : customers.data.map(c => (
              <Card key={c.id} style={{ marginBottom: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{c.name}</div>
                  {c.value != null && <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>₹{Number(c.value).toLocaleString("en-IN")}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StatusPill tone={c.stage === "customer" ? "positive" : "info"}>{c.stage}</StatusPill>
                  {c.stage !== "customer" && (
                    <button onClick={() => advanceCustomer(c)} style={{ padding: "5px 10px", background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 8, color: C.goldD, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Advance →</button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* DOCUMENTS — reuses the real vault_documents table, scoped by startup_id */}
      {tab === "documents" && (
        !activeStartup ? (
          <EmptyState icon="🧭" title="No startup yet" sub="Promote an idea from Idea Lab first." action="Go to Idea Lab" onAction={() => setTab("idealab")} />
        ) : (
          <div>
            <SectionHead title="Documents" />
            <label style={{ display: "block", marginBottom: 14, padding: "14px 16px", background: "#F9F8F6", border: `2px dashed ${C.border}`, borderRadius: 12, textAlign: "center", fontSize: 12.5, fontWeight: 700, color: C.ink3, cursor: "pointer" }}>
              {uploading ? "Uploading..." : "Click to upload a document"}
              <input type="file" style={{ display: "none" }} disabled={uploading} onChange={e => e.target.files?.[0] && uploadDocument(e.target.files[0])} />
            </label>
            {documents.data.length === 0 ? (
              <EmptyState icon="📁" title="No documents yet" />
            ) : documents.data.map(d => (
              <Card key={d.id} style={{ marginBottom: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{d.file_name}</div>
                <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{d.doc_type} · {new Date(d.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}
