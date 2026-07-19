/**
 * submission-validators/sqlEngine.js — Milestone 8
 * ---------------------------------------------------------------------------
 * Node-side sql.js loader for the Submission Engine's grading path. This is
 * the server-side counterpart to the frontend's `loadSqlJs`
 * (frontend/src/services/workstationEngine.js) — same library (sql.js,
 * SQLite compiled to WASM), different loading mechanism: the frontend
 * fetches the .wasm from a CDN into the browser; the backend imports the
 * `sql.js` npm package directly (added as a new dependency in this
 * milestone — see package.json and docs/future-improvements.md).
 *
 * WHY THE BACKEND RE-EXECUTES SQL AT ALL: 05-validators.md's contract for
 * `ground_truth_compare` is explicit — "Executes the ground-truth query
 * against the same seeded sql.js DB the student queried, compares published
 * result." Trusting a client-reported result would mean grading is only as
 * honest as whatever the browser sends, which violates "never trust client
 * input; validate everything." Building a fresh, server-side DB from the
 * SAME pinned `dataset_version.seed_sql` the student's workstation used, and
 * re-running the student's submitted SQL text against it here, is the only
 * way grading is actually authoritative rather than a rubber stamp on
 * client-supplied numbers.
 *
 * A fresh in-memory DB is built per grading call rather than cached/reused —
 * grading is infrequent (once per submission, not per keystroke) and this
 * guarantees zero state leakage between attempts or students.
 */
import initSqlJs from "sql.js"

let sqlJsPromise = null

export function loadSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs().catch((e) => { sqlJsPromise = null; throw e })
  }
  return sqlJsPromise
}

export class SqlExecutionError extends Error {
  constructor(message, { sql } = {}) {
    super(message)
    this.name = "SqlExecutionError"
    this.sql = sql
  }
}

/**
 * Builds a fresh SQLite DB from a seed script and runs one query against it.
 * Throws SqlExecutionError (not a generic Error) if either the seed script
 * or the query itself fails — callers use this distinction to tell "the
 * student wrote invalid SQL" (expected, gradeable outcome) apart from "our
 * own ground-truth query is broken" (a content bug, should not be silently
 * scored as a student failure).
 */
export async function runSqlAgainstFreshDb(seedSql, query) {
  const SQL = await loadSqlJs()
  const db = new SQL.Database()
  try {
    if (seedSql) {
      try {
        db.run(seedSql)
      } catch (e) {
        throw new SqlExecutionError(`Failed to seed the grading database: ${e.message}`, { sql: seedSql })
      }
    }
    let raw
    try {
      raw = db.exec(query)
    } catch (e) {
      throw new SqlExecutionError(e.message || String(e), { sql: query })
    }
    return (raw || []).map((rs) => ({ columns: rs.columns, values: rs.values }))
  } finally {
    db.close()
  }
}
