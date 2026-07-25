/**
 * AdminQuestionBank.jsx — Career OS Tranche 4: internal-only review UI for
 * the Weekly Skill Pulse V2 question bank.
 *
 * Real gap this closes: backend/server/routes/questionBankAdmin.js has a
 * complete draft -> in_review -> approved|rejected workflow with a
 * server-enforced validation gate, but no frontend ever called it — the 300
 * real draft questions generated for content-ops had no human-usable way to
 * actually get reviewed. This page is that missing piece, nothing more: no
 * new business logic, no new schema, no new state machine — it's a thin
 * client over the existing, already-tested admin API.
 *
 * Reachability: NOT in any nav — reached only via the direct URL
 * /admin/question-bank (see App.jsx's pathname check, same pattern as
 * /career, /join/:code, /join-org/:token). The real access control is
 * server-side (requireAuth + requireAdmin on every route this page calls);
 * a non-admin landing here just sees every request fail with a 401/403,
 * which this page surfaces as an honest error state rather than crashing.
 */
import { useState, useEffect, useCallback } from "react"
import { questionBankAdminApi } from "../lib/api"

const INK = "#1A1714", MUT = "#6B6560", BG = "#FAFAFA", SURF = "#FFFFFF", BDR = "rgba(17,24,39,0.08)"
const GREEN = "#16A34A", AMBER = "#D97706", RED = "#DC2626", P = "#6366F1"
const MONO = "'DM Mono','Fira Mono',monospace"

const STATUS_COLOR = { draft: MUT, in_review: AMBER, approved: GREEN, rejected: RED, retired: MUT }

function Pill({ children, color = MUT }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color, background: `${color}18`, borderRadius: 999, padding: "3px 9px", fontFamily: MONO }}>
      {children}
    </span>
  )
}

function CoverageStrip({ coverage }) {
  if (!coverage) return null
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
      {coverage.domainSummary.map(d => (
        <div key={d.domain} style={{ padding: "8px 12px", borderRadius: 10, background: SURF, border: `1px solid ${d.meetsReleaseGate ? GREEN : BDR}` }}>
          <div style={{ fontSize: 10, color: MUT, fontFamily: MONO }}>{d.domain}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: d.meetsReleaseGate ? GREEN : INK }}>
            {d.approved} approved <span style={{ fontWeight: 500, color: MUT }}>/ {d.draft} draft</span>
          </div>
        </div>
      ))}
      <div style={{ padding: "8px 12px", borderRadius: 10, background: coverage.globalGateMet ? `${GREEN}18` : `${AMBER}18`, alignSelf: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: coverage.globalGateMet ? GREEN : AMBER }}>
          {coverage.globalGateMet ? "Global release gate: MET" : "Global release gate: not met yet"}
        </span>
      </div>
    </div>
  )
}

function QuestionDetail({ id, onClose, onChanged, onAdvance }) {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [reason, setReason] = useState("")
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: null }))
    questionBankAdminApi.get(id)
      .then(data => setState({ loading: false, error: null, data }))
      .catch(e => setState({ loading: false, error: e.message || "Failed to load question", data: null }))
  }, [id])

  useEffect(() => { load() }, [load])

  // Tranche 2 (2026-07-25): reviewing hundreds of questions one at a time
  // used to require open → act → close → find the next one by hand — the
  // real human-throughput bottleneck. Terminal actions (approve/reject) now
  // auto-advance to the next question in the current queue. The approval
  // rule itself is untouched: still one question, one explicit human action,
  // server-validated (POST /:id/approve re-validates server-side).
  const act = async (fn, { advance = false } = {}) => {
    setActing(true); setActionError(null)
    try {
      await fn()
      onChanged()
      if (advance && onAdvance) { setReason(""); onAdvance() } else load()
    } catch (e) {
      setActionError(e.data?.error || e.message || "Action failed")
    } finally {
      setActing(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "flex-end", zIndex: 200 }} onClick={onClose}>
      <div style={{ width: 560, maxWidth: "100%", height: "100%", background: BG, overflowY: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: MUT, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>← Close</button>

        {state.loading && <div style={{ color: MUT, fontSize: 13 }}>Loading…</div>}
        {state.error && <div style={{ color: RED, fontSize: 13 }}>{state.error}</div>}

        {state.data && (() => {
          const q = state.data.question
          return (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <Pill color={STATUS_COLOR[q.review_status]}>{q.review_status}</Pill>
                <Pill>{q.domain}</Pill>
                <Pill>difficulty {q.difficulty}</Pill>
                <Pill>{q.question_type}</Pill>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginBottom: 12, lineHeight: 1.5 }}>{q.prompt}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {(q.options || []).map(o => (
                  <div key={o.id} style={{ padding: "8px 12px", borderRadius: 8, background: SURF, border: `1.5px solid ${o.id === q.correct_option_id ? GREEN : BDR}`, fontSize: 13, color: INK }}>
                    {o.id === q.correct_option_id && <span style={{ color: GREEN, fontWeight: 800, marginRight: 6 }}>✓</span>}
                    {o.text || o.label || JSON.stringify(o)}
                  </div>
                ))}
              </div>
              {q.explanation && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: SURF, border: `1px solid ${BDR}`, fontSize: 12, color: MUT, marginBottom: 14 }}>
                  <b style={{ color: INK }}>Explanation: </b>{q.explanation}
                </div>
              )}
              {q.skill_tags?.length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
                  {q.skill_tags.map(t => <Pill key={t} color={P}>{t}</Pill>)}
                </div>
              )}

              {actionError && <div style={{ color: RED, fontSize: 12, marginBottom: 10 }}>{actionError}</div>}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {q.review_status === "draft" && (
                  <button disabled={acting} onClick={() => act(() => questionBankAdminApi.submitForReview(q.id))}
                    style={{ padding: "8px 16px", background: P, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    Submit for review
                  </button>
                )}
                {q.review_status === "in_review" && (
                  <>
                    <button disabled={acting} onClick={() => act(() => questionBankAdminApi.approve(q.id), { advance: true })}
                      style={{ padding: "8px 16px", background: GREEN, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      Approve & next
                    </button>
                    <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Rejection reason (required)"
                      style={{ flex: 1, minWidth: 160, padding: "8px 10px", borderRadius: 8, border: `1px solid ${BDR}`, fontSize: 12 }} />
                    <button disabled={acting || !reason.trim()} onClick={() => act(() => questionBankAdminApi.reject(q.id, reason), { advance: true })}
                      style={{ padding: "8px 16px", background: reason.trim() ? RED : `${RED}55`, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: reason.trim() ? "pointer" : "not-allowed" }}>
                      Reject & next
                    </button>
                  </>
                )}
                {["approved", "rejected"].includes(q.review_status) && (
                  <div style={{ fontSize: 12, color: MUT }}>
                    {q.review_status === "approved" ? "Approved" : `Rejected: ${q.rejection_reason || "no reason recorded"}`} — no further action available here.
                  </div>
                )}
              </div>

              {state.data.auditTrail?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: MUT, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Audit trail</div>
                  {state.data.auditTrail.map(a => (
                    <div key={a.id} style={{ fontSize: 11, color: MUT, marginBottom: 4 }}>
                      {new Date(a.created_at).toLocaleString()} — {a.action} {a.from_status ? `(${a.from_status} → ${a.to_status})` : ""} {a.note ? `— ${a.note}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default function AdminQuestionBank({ user }) {
  const [coverage, setCoverage] = useState(null)
  const [coverageError, setCoverageError] = useState(null)
  const [status, setStatus] = useState("draft")
  const [domain, setDomain] = useState("")
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkResult, setBulkResult] = useState(null)

  const loadCoverage = useCallback(() => {
    questionBankAdminApi.coverage()
      .then(setCoverage)
      .catch(e => setCoverageError(e.data?.error || e.message || "Failed to load coverage — you may not have admin access"))
  }, [])

  const loadList = useCallback(() => {
    setLoading(true)
    setListError(null)
    questionBankAdminApi.list({ review_status: status || undefined, domain: domain || undefined, limit: 50 })
      .then(res => { setRows(res.questions || []); setTotal(res.total || 0) })
      .catch(e => setListError(e.data?.error || e.message || "Failed to load questions"))
      .finally(() => setLoading(false))
  }, [status, domain])

  useEffect(() => { loadCoverage() }, [loadCoverage])
  useEffect(() => { loadList() }, [loadList])

  // Tranche B: the real operational bottleneck for getting V2 rollout-ready
  // is moving a batch of drafts to in_review, not the per-question approval
  // judgment itself (which stays strictly one-at-a-time via Approve below —
  // this button never approves anything). Requires a domain filter selected
  // so it's always a scoped, visible batch, not a blind "everything" action.
  const bulkSubmitDomain = () => {
    if (!domain) return
    setBulkBusy(true); setBulkResult(null)
    questionBankAdminApi.bulkSubmitForReview({ domain })
      .then(res => { setBulkResult(res); loadList(); loadCoverage() })
      .catch(e => setBulkResult({ success: false, error: e.data?.error || e.message }))
      .finally(() => setBulkBusy(false))
  }

  if (!user) {
    return <div style={{ padding: 40, textAlign: "center", color: MUT }}>Sign in as an admin to use this page.</div>
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "DM Sans, system-ui, sans-serif", padding: "24px 32px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: P, fontFamily: MONO }}>Internal · Weekly Skill Pulse V2</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 800, color: INK, margin: "4px 0 18px" }}>Question Bank Review</h1>

        {coverageError && (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: `${RED}12`, border: `1px solid ${RED}44`, color: RED, fontSize: 13, marginBottom: 16 }}>
            {coverageError}
          </div>
        )}
        <CoverageStrip coverage={coverage} />

        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BDR}`, fontSize: 13 }}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="in_review">In review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="retired">Retired</option>
          </select>
          <select value={domain} onChange={e => setDomain(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BDR}`, fontSize: 13 }}>
            <option value="">All domains</option>
            {(coverage?.domainSummary || []).map(d => <option key={d.domain} value={d.domain}>{d.domain}</option>)}
          </select>
          <div style={{ alignSelf: "center", fontSize: 12, color: MUT }}>{total} question{total !== 1 ? "s" : ""}</div>
          {status === "draft" && domain && (
            <button
              onClick={bulkSubmitDomain}
              disabled={bulkBusy}
              style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${P}`, background: bulkBusy ? BDR : `${P}18`, color: P, fontSize: 12, fontWeight: 700, cursor: bulkBusy ? "default" : "pointer" }}
            >
              {bulkBusy ? "Submitting…" : `Submit all draft "${domain}" questions for review`}
            </button>
          )}
        </div>

        {bulkResult && (
          <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 12.5,
            background: bulkResult.success === false ? `${RED}12` : `${P}12`,
            border: `1px solid ${bulkResult.success === false ? RED + "44" : P + "44"}`,
            color: bulkResult.success === false ? RED : INK }}>
            {bulkResult.success === false
              ? `Bulk submit failed: ${bulkResult.error}`
              : `Submitted ${bulkResult.submitted} question${bulkResult.submitted !== 1 ? "s" : ""} for review${bulkResult.skipped ? ` (${bulkResult.skipped} skipped)` : ""}. Each still needs individual Approve/Reject below — this only moved them into the review queue.`}
          </div>
        )}

        {listError && <div style={{ color: RED, fontSize: 13, marginBottom: 12 }}>{listError}</div>}
        {loading && <div style={{ color: MUT, fontSize: 13 }}>Loading…</div>}
        {!loading && !listError && rows.length === 0 && <div style={{ color: MUT, fontSize: 13 }}>No questions match this filter.</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map(q => (
            <button key={q.id} onClick={() => setOpenId(q.id)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, background: SURF, border: `1px solid ${BDR}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
              <Pill color={STATUS_COLOR[q.review_status]}>{q.review_status}</Pill>
              <span style={{ fontSize: 13, color: INK, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.prompt}</span>
              <span style={{ fontSize: 11, color: MUT, fontFamily: MONO }}>{q.domain} · d{q.difficulty}</span>
            </button>
          ))}
        </div>
      </div>

      {openId && (
        <QuestionDetail
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => { loadList(); loadCoverage() }}
          onAdvance={() => {
            // Advance to the next question in the currently-filtered list;
            // close the panel when the just-actioned one was the last.
            const i = rows.findIndex(r => r.id === openId)
            const next = rows[i + 1]
            if (next) setOpenId(next.id)
            else setOpenId(null)
          }}
        />
      )}
    </div>
  )
}
