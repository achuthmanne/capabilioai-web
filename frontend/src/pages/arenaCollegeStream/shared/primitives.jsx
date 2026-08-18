/**
 * shared/primitives.jsx — Phase 2.5.
 *
 * Genuinely cross-branch, cross-panel-type presentational components,
 * extracted unchanged out of ArenaCollegeStream.jsx. Verified by grep
 * before moving: every one of these already had real consumers outside
 * any SQL-specific context (HistoryRow, ActivitySection, the academic
 * Stream branch's own result panel) — this is not a speculative shared
 * layer, it's making an existing fact (these were always shared) visible
 * in the file structure. Any future Domain Role workspace (Python, Cyber,
 * SAP, ...) imports these same components rather than re-implementing
 * them.
 */
import { T, MONO } from "./tokens"

export function Eyebrow({ children, color }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: color || T.indigo, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
      {children}
    </div>
  )
}

export function LoadingRow() {
  return <div style={{ padding: 20, color: T.ink3, fontSize: 14 }}>Loading…</div>
}

export function StatChip({ label, value }) {
  return (
    <div style={{ padding: "10px 14px", background: T.cream, borderRadius: 10, minWidth: 90 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>{value}</div>
    </div>
  )
}

export function ResultTable({ columns, rows }) {
  if (!rows || rows.length === 0) {
    return <div style={{ padding: 12, color: T.ink3, fontSize: 13, fontFamily: MONO }}>(no rows)</div>
  }
  // Numeric columns right-align (spreadsheet convention, easier to scan
  // sums/counts) — determined per-column from the actual data, not guessed
  // from the column name.
  const isNumericCol = columns.map((_, j) => rows.every(r => r[j] === null || typeof r[j] === "number"))
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: 10, maxHeight: 360 }}>
      <table style={{ borderCollapse: "collapse", fontFamily: MONO, fontSize: 12, width: "100%" }}>
        <thead>
          <tr style={{ background: T.cream, position: "sticky", top: 0 }}>
            {columns.map((c, j) => (
              <th key={c} style={{ textAlign: isNumericCol[j] ? "right" : "left", padding: "6px 12px", borderBottom: `1px solid ${T.border}`, color: T.ink3, whiteSpace: "nowrap" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? T.cream : "transparent" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "6px 12px", borderBottom: `1px solid ${T.border}`, color: T.ink2, textAlign: isNumericCol[j] ? "right" : "left", fontVariantNumeric: "tabular-nums" }}>{String(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ChecklistPanel({ checklist }) {
  if (!checklist) return null
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {checklist.map(c => (
        <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ color: c.passed ? T.green : T.red, fontWeight: 800 }}>{c.passed ? "✓" : "✗"}</span>
          <span style={{ color: T.ink2 }}>{c.label}</span>
        </div>
      ))}
    </div>
  )
}
