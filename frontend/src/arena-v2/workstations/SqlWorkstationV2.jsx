// SqlWorkstationV2.jsx — Arena V2, Milestones 7 & 8
// ---------------------------------------------------------------------------
// The one real, working workstation for this milestone. Reuses the proven
// sql.js (SQLite-in-WASM) loader from Arena V1's shared engine module
// (frontend/src/services/workstationEngine.js: loadSqlJs, exported there and
// unchanged) rather than re-implementing CDN loading — that loader is
// mission-agnostic already (just "get me a sql.js SQL constructor"), so it's
// safe to share across V1 and V2 rather than duplicating it.
//
// Everything ELSE here is new: instead of V1's synthetic mission-based
// dataset generator, this component seeds the database from
// `payload.datasetSeedSql` — a real SQL script (CREATE TABLE + INSERT
// statements) that the backend Challenge Engine attaches to the payload for
// sql-workstation challenges. This component does not know or care how that
// SQL was chosen (dataset versioning, scenario pack selection, etc. are all
// backend concerns) — it only knows how to execute it.
//
// ASSUMPTION FLAGGED: the exact payload field names for SQL challenges
// (`datasetSeedSql`, `datasetSchemaDescription`, `prompt`, `starterQuery`)
// are inferred from the Arena V2 content spec's SQL workstation contract.
// Confirm these against challenge-engine/payloadGenerator.js's SQL branch
// before wider rollout — logged to docs/future-improvements.md.
//
// MILESTONE 8: this workstation calls `onSubmit` (a prop handed down by
// ArenaV2ChallengeShell.jsx) — it does NOT import arenaV2Submission.js and
// does NOT call the Submission API itself. The shell owns auth, the
// network call, timing, and the graded-feedback lifecycle; this component's
// only job is to hand its query text up when the student clicks Submit and
// disable the button while `isSubmitting` is true.
import { useCallback, useEffect, useRef, useState } from "react"
import { loadSqlJs } from "../../services/workstationEngine.js"
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"

// ── CRUD statement detection ────────────────────────────────────────────────
// sql.js's exec() (SQLite) returns an empty result-set array for any
// statement that doesn't SELECT rows back (CREATE/INSERT/UPDATE/DELETE/
// ALTER/DROP) — so a student who successfully creates or modifies a table
// previously saw *nothing* happen, with no confirmation their statement even
// ran. This regex classifies the FIRST statement's verb (good enough for
// this pilot editor — students write one statement at a time, same
// assumption the rest of this component already makes) and pulls out the
// table name it touched, so runSql() below can show a real confirmation
// plus an auto-preview of that table's current state.
const CRUD_PATTERN = /^\s*(CREATE|INSERT|UPDATE|DELETE|ALTER|DROP)\s+(?:TABLE\s+)?(?:INTO\s+)?(?:FROM\s+)?(?:IF\s+(?:NOT\s+)?EXISTS\s+)?["`[]?(\w+)["`\]]?/i

function classifyStatement(sql) {
  const match = CRUD_PATTERN.exec(sql)
  if (!match) return null
  const verb = match[1].toUpperCase()
  // For ALTER TABLE the table name comes right after TABLE, which the
  // pattern above already captures via its optional TABLE group; for
  // INSERT INTO / DELETE FROM it's captured via the INTO/FROM groups.
  const table = match[2]
  return { verb, table }
}

const VERB_LABELS = {
  CREATE: (table) => `Table "${table}" created.`,
  INSERT: (table, n) => `${n} row${n === 1 ? "" : "s"} inserted into "${table}".`,
  UPDATE: (table, n) => `${n} row${n === 1 ? "" : "s"} updated in "${table}".`,
  DELETE: (table, n) => `${n} row${n === 1 ? "" : "s"} deleted from "${table}".`,
  ALTER:  (table) => `Table "${table}" altered.`,
  DROP:   (table) => `Table "${table}" dropped.`,
}

// ── Chart-shaped result detection ───────────────────────────────────────────
// Chartable when there's a label column (first column, any type) plus at
// least one other column that's numeric across every row — e.g. "region,
// total_revenue" or "month, orders, revenue". Anything else (a single
// scalar, all-text columns, etc.) stays table-only — never force a chart
// onto data that isn't shaped for one.
function isChartable(rs) {
  if (!rs || rs.columns.length < 2 || rs.values.length === 0 || rs.values.length > 200) return false
  const numericCols = []
  for (let ci = 1; ci < rs.columns.length; ci++) {
    const allNumeric = rs.values.every((row) => typeof row[ci] === "number" || (row[ci] !== null && !Number.isNaN(parseFloat(row[ci]))))
    if (allNumeric) numericCols.push(ci)
  }
  return numericCols.length > 0 ? numericCols : null
}

const CHART_COLORS = ["#4ade80", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa", "#34d399"]

function toChartData(rs, numericCols) {
  return rs.values.map((row) => {
    const point = { label: String(row[0]) }
    numericCols.forEach((ci) => {
      point[rs.columns[ci]] = typeof row[ci] === "number" ? row[ci] : parseFloat(row[ci])
    })
    return point
  })
}

function ResultChart({ rs, numericCols, chartType }) {
  const data = toChartData(rs, numericCols)
  const seriesKeys = numericCols.map((ci) => rs.columns[ci])

  if (chartType === "pie") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey={seriesKeys[0]} nameKey="label" outerRadius={90} label>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  const Chart = chartType === "line" ? LineChart : BarChart
  return (
    <ResponsiveContainer width="100%" height={260}>
      <Chart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 12 }} />
        {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {seriesKeys.map((key, i) => (
          chartType === "line"
            ? <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            : <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </Chart>
    </ResponsiveContainer>
  )
}

function formatCell(v) {
  if (v === null || v === undefined) return "NULL"
  if (typeof v === "number" && !Number.isInteger(v)) return (Math.round(v * 100) / 100).toLocaleString("en-IN")
  if (typeof v === "number") return v.toLocaleString("en-IN")
  return String(v)
}

function ResultTable({ rs }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          {rs.columns.map((c) => (
            <th key={c} style={{ padding: "4px 8px", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #334155" }}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rs.values.map((row, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: "3px 8px", color: cell === null ? "#f87171" : undefined, fontWeight: cell === null ? 700 : 400 }}>
                {formatCell(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function useSeededDatabase(datasetSeedSql) {
  const [db, setDb] = useState(null)
  const [error, setError] = useState(null)
  const dbRef = useRef(null)

  useEffect(() => {
    let alive = true
    setDb(null)
    setError(null)
    if (!datasetSeedSql) {
      setError(new Error("This challenge payload has no datasetSeedSql — cannot seed a database."))
      return
    }
    loadSqlJs()
      .then((SQL) => {
        if (!alive) return
        const instance = new SQL.Database()
        try {
          instance.run(datasetSeedSql)
        } catch (e) {
          throw new Error(`Failed to seed the challenge database: ${e.message}`)
        }
        dbRef.current = instance
        setDb(instance)
      })
      .catch((e) => { if (alive) setError(e) })
    return () => {
      alive = false
      dbRef.current?.close?.()
    }
  }, [datasetSeedSql])

  return { db, error }
}

/**
 * @param {{ challengeInstanceId: string, skill?: string, difficulty?: string,
 *           payload: { prompt?: string, datasetSchemaDescription?: string,
 *                      datasetSeedSql?: string, starterQuery?: string },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 */
export default function SqlWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const { db, error: dbError } = useSeededDatabase(payload?.datasetSeedSql)
  const [code, setCode] = useState(payload?.starterQuery || "")
  const [result, setResult] = useState(null)
  const [runError, setRunError] = useState(null)
  const [running, setRunning] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [chartModes, setChartModes] = useState({}) // resultSet index -> "table" | "bar" | "line" | "pie"

  const runSql = useCallback(() => {
    if (!db || !code.trim()) return
    setRunning(true)
    setRunError(null)
    setConfirmation(null)
    setChartModes({})
    try {
      const statement = classifyStatement(code)
      const raw = db.exec(code)
      let resultSets = (raw || []).map((rs) => ({
        columns: rs.columns,
        values: rs.values,
        rowCount: rs.values.length,
      }))

      if (statement && resultSets.length === 0) {
        // A CREATE/INSERT/UPDATE/DELETE/ALTER/DROP statement returns no
        // result set from SQLite by design — without this, the student sees
        // a blank Results panel with no sign their statement did anything.
        const rowsAffected = db.getRowsModified()
        const label = VERB_LABELS[statement.verb]?.(statement.table, rowsAffected) || "Statement executed."
        setConfirmation({ verb: statement.verb, table: statement.table, label })

        if (statement.verb !== "DROP") {
          // Auto-preview the table's real current state so "did my CREATE/
          // UPDATE actually work" has a visible answer, not just a success
          // toast — real query, same seeded db, not a canned message.
          try {
            const preview = db.exec(`SELECT * FROM "${statement.table}" LIMIT 50;`)
            resultSets = (preview || []).map((rs) => ({ columns: rs.columns, values: rs.values, rowCount: rs.values.length }))
          } catch {
            // Table may legitimately have 0 columns visible this way in rare
            // edge cases (e.g. a CREATE TABLE with no rows yet is fine and
            // still previews correctly) — a genuine preview failure just
            // means we fall back to showing the confirmation alone.
          }
        }
      }

      setResult(resultSets)
    } catch (e) {
      setResult(null)
      setRunError(e.message || String(e))
    }
    setRunning(false)
  }, [db, code])

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runSql() }
  }

  // Hands the query text up to the shell as `submissionData` — the exact
  // shape the backend's ground_truth_compare validator expects
  // (submission-validators/groundTruthCompare.js reads `submissionData.query`).
  // This component has no idea what happens after that; it just calls the
  // callback it was given.
  const handleSubmit = useCallback(() => {
    if (!code.trim() || isSubmitting) return
    onSubmit?.({ query: code })
  }, [code, isSubmitting, onSubmit])

  if (dbError) {
    return (
      <div style={{ padding: 24, color: "#f87171" }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Couldn't load this challenge's database</div>
        <div style={{ fontSize: 13 }}>{dbError.message}</div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#94a3b8" }}>
        {skill ? `Skill: ${skill}` : null} {difficulty ? ` · Difficulty: ${difficulty}` : null}
        {resumed ? " · Resuming your in-progress attempt" : null}
      </div>

      {payload?.prompt && (
        <div style={{ padding: 12, background: "#0f172a", borderRadius: 8, fontSize: 14 }}>{payload.prompt}</div>
      )}

      {payload?.datasetSchemaDescription && (
        <details style={{ fontSize: 12, color: "#94a3b8" }}>
          <summary style={{ cursor: "pointer" }}>Dataset schema</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>{payload.datasetSchemaDescription}</pre>
        </details>
      )}

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={!db}
        placeholder={db ? "Write your SQL query here… (Cmd/Ctrl+Enter to run)" : "Loading database…"}
        style={{ width: "100%", minHeight: 140, fontFamily: "monospace", fontSize: 13, padding: 10, borderRadius: 8 }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={runSql} disabled={!db || running || !code.trim()} style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700 }}>
          {running ? "Running…" : "▶ Run Query"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!db || !code.trim() || isSubmitting}
          style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700, background: "#4ade80", color: "#0f172a", border: "none" }}
        >
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>
      </div>

      {runError && (
        <div style={{ padding: 10, background: "#450a0a", color: "#fca5a5", borderRadius: 6, fontSize: 13 }}>{runError}</div>
      )}

      {confirmation && (
        <div style={{ padding: 10, background: "#052e16", color: "#86efac", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
          ✓ {confirmation.label}
          {confirmation.verb !== "DROP" && <span style={{ fontWeight: 400, color: "#4ade80" }}> Showing the table&apos;s current state below.</span>}
        </div>
      )}

      {result && result.map((rs, i) => {
        const numericCols = isChartable(rs)
        const mode = chartModes[i] || "table"
        return (
          <div key={i} style={{ overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{rs.rowCount} row(s)</div>
              {numericCols && (
                <div style={{ display: "flex", gap: 4 }}>
                  {["table", "bar", "line", "pie"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setChartModes((prev) => ({ ...prev, [i]: m }))}
                      style={{
                        fontSize: 11, padding: "3px 9px", borderRadius: 4, textTransform: "capitalize",
                        background: mode === m ? "#4ade80" : "transparent",
                        color: mode === m ? "#0f172a" : "#94a3b8",
                        border: "1px solid #334155", fontWeight: mode === m ? 700 : 400,
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {mode === "table" || !numericCols ? (
              <ResultTable rs={rs} />
            ) : (
              <ResultChart rs={rs} numericCols={numericCols} chartType={mode} />
            )}
          </div>
        )
      })}

      <div style={{ fontSize: 12, color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: 10 }}>
        This is a real SQLite database seeded from the challenge's dataset — your queries genuinely execute
        against it. Use Run Query to explore, then Submit when ready — grading re-executes your query
        server-side against the same seed and compares it to the ground truth for real (see the feedback
        panel below once graded).
      </div>
    </div>
  )
}
