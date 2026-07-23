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

  const runSql = useCallback(() => {
    if (!db || !code.trim()) return
    setRunning(true)
    setRunError(null)
    try {
      const raw = db.exec(code)
      const resultSets = (raw || []).map((rs) => ({
        columns: rs.columns,
        values: rs.values,
        rowCount: rs.values.length,
      }))
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

      {result && result.map((rs, i) => (
        <div key={i} style={{ overflow: "auto" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>{rs.rowCount} row(s)</div>
          <ResultTable rs={rs} />
        </div>
      ))}

      <div style={{ fontSize: 12, color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: 10 }}>
        This is a real SQLite database seeded from the challenge's dataset — your queries genuinely execute
        against it. Use Run Query to explore, then Submit when ready — grading re-executes your query
        server-side against the same seed and compares it to the ground truth for real (see the feedback
        panel below once graded).
      </div>
    </div>
  )
}
