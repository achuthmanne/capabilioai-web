// DbaWorkstationV2.jsx — Arena V2, fifth role workspace (Database Administrator)
// ---------------------------------------------------------------------------
// A database operations lab, deliberately nothing like the ML notebook, the
// Software IDE, the SOC desk, or the DevOps console: a schema explorer, an
// ER diagram, a query plan viewer (EXPLAIN ANALYZE-style, revealed on
// demand rather than a live database — same "simulated is fine, must feel
// real" allowance the Terminal/Console workstations used, applied here to
// database internals instead), an index manager where a candidate index can
// be simulated to see its effect, a before/after performance dashboard, and
// a SQL answer editor for the final recommendation. There is no live query
// execution here on purpose — a real EXPLAIN ANALYZE run is exactly the kind
// of thing this mission's payload pre-computes honestly (real numbers a DBA
// would actually see), not a fabricated "trust me" grade.
//
// Same layering discipline as every other workstation: only calls the
// `onSubmit` prop from ArenaV2ChallengeShell.jsx; never imports
// arenaV2Submission.js directly. Submission sends `answer` (the CREATE
// INDEX statement plus written reasoning — rubricReview.js already accepts
// this as an alias for `code`) plus `investigationLog` (the real sequence
// of investigation actions: which tables were inspected, whether EXPLAIN
// ANALYZE was run, which candidate index was simulated). This reuses
// rubricReview.js's existing generalized fields exactly as the
// Cybersecurity and DevOps phases did — this phase required ZERO backend
// code changes, only new content data.
//
// Center-panel-only component: the mission header, ticket box, prompt, and
// checklist all come from the shared ArenaV2WorkspaceShell (top bar / left
// brief panel / right mission-control panel). This component owns the lab
// itself: schema explorer, ER diagram, query plan viewer, index manager,
// performance dashboard, the SQL answer editor, and the Submit button.
//
// ANTI-PASTE RULE, same honesty note as the other four workstations: paste
// is blocked only on the SQL answer editor, not globally.
import { useCallback, useMemo, useState } from "react"

function SchemaExplorer({ tables = [], expanded, onToggle }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Schema Explorer</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tables.map((t) => (
          <div key={t.name} style={{ border: "1px solid #1e293b", borderRadius: 6, overflow: "hidden" }}>
            <div
              onClick={() => onToggle(t.name)}
              style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", cursor: "pointer", background: "#0f172a" }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{expanded === t.name ? "▾ " : "▸ "}{t.name}</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{t.rowCount.toLocaleString()} rows</span>
            </div>
            {expanded === t.name && (
              <div style={{ padding: 10, background: "#0b1220" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "3px 6px", color: "#64748b" }}>column</th>
                      <th style={{ textAlign: "left", padding: "3px 6px", color: "#64748b" }}>type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.columns.map((c) => (
                      <tr key={c.name}>
                        <td style={{ padding: "3px 6px", color: "#e2e8f0" }}>{c.name}</td>
                        <td style={{ padding: "3px 6px", color: "#94a3b8", fontFamily: "monospace" }}>{c.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  Existing indexes: {t.indexes.length ? t.indexes.map((ix) => ix.name).join(", ") : "none"}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ErDiagram({ tables = [], relationships = [] }) {
  const positions = useMemo(() => {
    const cols = 3
    const w = 190, h = 90, gapX = 40, gapY = 50
    const map = {}
    tables.forEach((t, i) => {
      map[t.name] = { x: 20 + (i % cols) * (w + gapX), y: 20 + Math.floor(i / cols) * (h + gapY), w, h }
    })
    return map
  }, [tables])

  const width = Math.max(...Object.values(positions).map((p) => p.x + p.w), 400) + 20
  const height = Math.max(...Object.values(positions).map((p) => p.y + p.h), 200) + 20

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>ER Diagram</div>
      <div style={{ border: "1px solid #1e293b", borderRadius: 6, overflow: "auto", background: "#0b1220" }}>
        <svg width={width} height={height}>
          {relationships.map((r, i) => {
            const a = positions[r.from.table], b = positions[r.to.table]
            if (!a || !b) return null
            const x1 = a.x + a.w / 2, y1 = a.y + a.h / 2, x2 = b.x + b.w / 2, y2 = b.y + b.h / 2
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth={1.5} />
          })}
          {tables.map((t) => {
            const p = positions[t.name]
            if (!p) return null
            return (
              <g key={t.name}>
                <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={6} fill="#0f172a" stroke="#334155" />
                <text x={p.x + 10} y={p.y + 18} fontSize={12} fontWeight={700} fill="#e2e8f0">{t.name}</text>
                {t.columns.slice(0, 4).map((c, ci) => (
                  <text key={c.name} x={p.x + 10} y={p.y + 34 + ci * 13} fontSize={10} fill="#94a3b8">{c.name}</text>
                ))}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function QueryPlanViewer({ sql, currentPlan, planRevealed, onReveal, afterPlan }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Query Plan Viewer</div>
      <pre style={{ fontSize: 11, fontFamily: "monospace", background: "#0b1220", border: "1px solid #1e293b", borderRadius: 6, padding: 10, margin: 0, whiteSpace: "pre-wrap", color: "#cbd5e1" }}>
        {sql}
      </pre>
      {!planRevealed ? (
        <button onClick={onReveal} style={{ marginTop: 8, padding: "6px 14px", borderRadius: 6, background: "transparent", color: "#94a3b8", border: "1px solid #334155" }}>
          ▶ Run EXPLAIN ANALYZE
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Before</div>
            <pre style={{ fontSize: 10.5, fontFamily: "monospace", background: "#0b1220", border: "1px solid #7f1d1d", borderRadius: 6, padding: 8, margin: 0, whiteSpace: "pre-wrap", color: "#fca5a5", maxHeight: 160, overflow: "auto" }}>
              {currentPlan.planText}
            </pre>
          </div>
          {afterPlan && (
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>After (simulated index)</div>
              <pre style={{ fontSize: 10.5, fontFamily: "monospace", background: "#0b1220", border: "1px solid #14532d", borderRadius: 6, padding: 8, margin: 0, whiteSpace: "pre-wrap", color: "#86efac", maxHeight: 160, overflow: "auto" }}>
                {afterPlan.planText}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IndexManager({ tables = [], candidates = [], simulatedId, onSimulate }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Index Manager</div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
        Existing: {tables.flatMap((t) => t.indexes.map((ix) => `${t.name}.${ix.name} (${ix.columns.join(", ")})`)).join("; ") || "none"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.map((c) => (
          <div key={c.id} style={{ padding: 8, borderRadius: 6, border: `1px solid ${simulatedId === c.id ? "#4ade80" : "#1e293b"}`, background: "#0b1220" }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", marginBottom: 4 }}>{c.ddl}</div>
            <button
              onClick={() => onSimulate(c)}
              disabled={simulatedId === c.id}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, background: simulatedId === c.id ? "#14532d" : "transparent", color: simulatedId === c.id ? "#4ade80" : "#94a3b8", border: "1px solid #334155" }}
            >
              {simulatedId === c.id ? "✓ Simulated" : "Simulate this index"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function PerformanceDashboard({ currentPlan, planRevealed, afterPlan }) {
  if (!planRevealed) {
    return <div style={{ fontSize: 11, color: "#64748b" }}>Run EXPLAIN ANALYZE to see baseline performance.</div>
  }
  const improvement = afterPlan
    ? Math.round(((currentPlan.executionTimeMs - afterPlan.executionTimeMs) / currentPlan.executionTimeMs) * 100)
    : null
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Performance Dashboard</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140, padding: 10, borderRadius: 6, background: "#0b1220", border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 10, color: "#64748b" }}>Before — rows scanned</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f87171" }}>{currentPlan.rowsScanned.toLocaleString()}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, padding: 10, borderRadius: 6, background: "#0b1220", border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 10, color: "#64748b" }}>Before — execution time</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f87171" }}>{currentPlan.executionTimeMs} ms</div>
        </div>
        {afterPlan && (
          <>
            <div style={{ flex: 1, minWidth: 140, padding: 10, borderRadius: 6, background: "#0b1220", border: "1px solid #14532d" }}>
              <div style={{ fontSize: 10, color: "#64748b" }}>After — rows scanned</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80" }}>{afterPlan.rowsScanned.toLocaleString()}</div>
            </div>
            <div style={{ flex: 1, minWidth: 140, padding: 10, borderRadius: 6, background: "#0b1220", border: "1px solid #14532d" }}>
              <div style={{ fontSize: 10, color: "#64748b" }}>After — execution time</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80" }}>{afterPlan.executionTimeMs} ms</div>
            </div>
            <div style={{ flex: 1, minWidth: 140, padding: 10, borderRadius: 6, background: "rgba(74,222,128,0.08)", border: "1px solid #14532d" }}>
              <div style={{ fontSize: 10, color: "#64748b" }}>Improvement</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80" }}>{improvement}% faster</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * @param {{ challengeInstanceId: string, skill?: string, difficulty?: string,
 *           payload: { prompt?: string, ticket?: object, checklist?: string[],
 *                      acceptanceCriteria?: string[], tables?: Array, relationships?: Array,
 *                      slowQuery?: { sql: string, currentPlan: object }, candidateIndexes?: Array },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 */
export default function DbaWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const tables = payload?.tables || []
  const relationships = payload?.relationships || []
  const slowQuery = payload?.slowQuery || { sql: "", currentPlan: { planText: "", rowsScanned: 0, executionTimeMs: 0 } }
  const candidates = payload?.candidateIndexes || []

  const [expandedTable, setExpandedTable] = useState(null)
  const [planRevealed, setPlanRevealed] = useState(false)
  const [simulated, setSimulated] = useState(null)
  const [actionLog, setActionLog] = useState([])
  const [sqlAnswer, setSqlAnswer] = useState("")

  const toggleTable = useCallback((name) => {
    setExpandedTable((prev) => {
      const next = prev === name ? null : name
      if (next) setActionLog((log) => [...log, `DESCRIBE ${name}`])
      return next
    })
  }, [])

  const revealPlan = useCallback(() => {
    setPlanRevealed(true)
    setActionLog((log) => [...log, `EXPLAIN ANALYZE ${slowQuery.sql.replace(/\s+/g, " ").trim()}`])
  }, [slowQuery])

  const simulateIndex = useCallback((candidate) => {
    setSimulated(candidate)
    setActionLog((log) => [...log, `SIMULATE ${candidate.ddl}`])
  }, [])

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const handleSubmit = useCallback(() => {
    if (!sqlAnswer.trim() || isSubmitting) return
    onSubmit?.({ answer: sqlAnswer, investigationLog: actionLog })
  }, [sqlAnswer, actionLog, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, padding: 16 }}>
      <SchemaExplorer tables={tables} expanded={expandedTable} onToggle={toggleTable} />
      <ErDiagram tables={tables} relationships={relationships} />
      <QueryPlanViewer
        sql={slowQuery.sql}
        currentPlan={slowQuery.currentPlan}
        planRevealed={planRevealed}
        onReveal={revealPlan}
        afterPlan={simulated?.estimated}
      />
      <IndexManager tables={tables} candidates={candidates} simulatedId={simulated?.id} onSimulate={simulateIndex} />
      <PerformanceDashboard currentPlan={slowQuery.currentPlan} planRevealed={planRevealed} afterPlan={simulated?.estimated} />

      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          SQL answer (paste disabled in this pilot editor) — your CREATE INDEX statement plus written reasoning
        </div>
        <textarea
          value={sqlAnswer}
          onChange={(e) => setSqlAnswer(e.target.value)}
          onPaste={blockPaste}
          onDrop={blockPaste}
          spellCheck={false}
          placeholder={"e.g. CREATE INDEX idx_orders_customer_created ON orders (customer_id, created_at DESC);\n\nThis composite index satisfies both the equality filter on customer_id and the range filter on created_at in a single index scan, and matches the ORDER BY so no extra sort is needed…"}
          style={{ width: "100%", minHeight: 140, fontFamily: "monospace", fontSize: 13, padding: 10, borderRadius: 8, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b" }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!sqlAnswer.trim() || isSubmitting}
        style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700, background: "#4ade80", color: "#0f172a", border: "none", alignSelf: "flex-start" }}
      >
        {isSubmitting ? "Submitting for AI review…" : "Submit Index Recommendation for AI Review"}
      </button>

      <div style={{ fontSize: 12, color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: 10 }}>
        The plan numbers above are the mission&apos;s real pre-computed EXPLAIN ANALYZE output for the current schema
        and each candidate index — nothing here is a canned pass/fail. Your investigation sequence (tables inspected,
        EXPLAIN run, index simulated) is sent with your answer as evidence for the AI Reviewer, and Submit posts a
        real ELO update.
      </div>
    </div>
  )
}
