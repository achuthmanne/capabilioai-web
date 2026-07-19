/**
 * pgliteSupabaseAdapter.js — TEST-ONLY
 * ---------------------------------------------------------------------------
 * A minimal stand-in for @supabase/supabase-js's fluent query builder,
 * backed by a real embedded Postgres (pglite) instead of a real Supabase
 * project's PostgREST layer. This exists so the ACTUAL, unmodified
 * repository.js files across arena-v2 can be exercised against a real
 * relational database (real FKs, CHECK constraints, UNIQUE constraints,
 * RLS-bypassing superuser) in an integration test, without needing docker
 * or a hosted Supabase branch (branching requires the Pro plan, unavailable
 * on this project).
 *
 * Implements ONLY the exact chain surface every arena-v2 repository.js
 * actually calls (inventoried directly from the 8 repository.js files):
 *   from, select, insert, update, upsert, delete,
 *   eq, neq, in, is, lt, order, limit, single, maybeSingle,
 *   select(..., { count: "exact", head: true })
 * No .rpc() is used anywhere in these files, so none is implemented here.
 */
const JSONB_COLUMNS = new Set([
  "payload", "validator", "assessment_rules", "submission_rules",
  "progression_rules", "reward_rules", "portfolio_decision", "feedback",
  "code_quality_notes", "recruiter_evidence", "validator_result",
  "submission_data", "cooldowns", "event_data", "payload_snapshot",
  "graph", "scenarios", "schema", "difficulty_variants",
])
const ARRAY_COLUMNS = new Set([
  "workstations", "validators", "ui_modules", "role_families", "unlocked_skills",
])
// NUMERIC(p,s) columns — node-postgres/pglite return these as JS strings by
// default (to avoid float precision loss over the wire), but real Supabase's
// PostgREST layer serializes a Postgres row to JSON via row_to_json-style
// conversion, which produces a genuine JSON *number* for a NUMERIC column,
// not a quoted string. Every arena-v2 module (e.g. reward-engine/engine.js's
// `typeof assessment.final_score !== "number"` check) is written against
// that real, production behavior — so this adapter converts these specific
// columns back to real JS numbers after every query, to faithfully match
// what the app actually receives in production rather than a raw-driver
// artifact of this adapter's own transport choice.
const NUMERIC_COLUMNS = new Set([
  "validator_score", "rubric_score", "ai_review_score", "ai_review_weight",
  "timing_modifier", "final_score", "best_score",
])

function castFor(col) {
  if (JSONB_COLUMNS.has(col)) return "::jsonb"
  if (ARRAY_COLUMNS.has(col)) return "::text[]"
  return ""
}
function encodeVal(col, val) {
  if (JSONB_COLUMNS.has(col) && val !== null && typeof val === "object") return JSON.stringify(val)
  return val
}
function coerceRow(row) {
  if (!row) return row
  for (const col of Object.keys(row)) {
    if (NUMERIC_COLUMNS.has(col) && row[col] !== null && typeof row[col] === "string") {
      row[col] = Number(row[col])
    }
  }
  return row
}
function coerceRows(rows) { return (rows || []).map(coerceRow) }

class QueryBuilder {
  constructor(db, table) {
    this.db = db
    this.table = table
    this.op = null
    this.payload = null
    this.onConflict = null
    this.filters = []
    this.selectCols = "*"
    this.countMode = false
    this.orderBy = null
    this.limitN = null
    this.singleMode = null // 'single' | 'maybeSingle' | null
    this.wantsReturning = false
  }

  select(cols = "*", opts = {}) {
    this.selectCols = cols
    if (this.op === null) this.op = "select"
    if (opts.count === "exact" && opts.head) this.countMode = true
    if (this.op === "insert" || this.op === "update" || this.op === "upsert") this.wantsReturning = true
    return this
  }
  insert(payload) { this.op = "insert"; this.payload = payload; return this }
  update(payload) { this.op = "update"; this.payload = payload; return this }
  upsert(payload, opts = {}) { this.op = "upsert"; this.payload = payload; this.onConflict = opts.onConflict; return this }
  delete() { this.op = "delete"; return this }

  eq(col, val)  { this.filters.push({ op: "=",  col, val }); return this }
  neq(col, val) { this.filters.push({ op: "!=", col, val }); return this }
  lt(col, val)  { this.filters.push({ op: "<",  col, val }); return this }
  is(col, val)  { this.filters.push({ op: "is", col, val }); return this }
  in(col, arr)  { this.filters.push({ op: "in", col, val: arr }); return this }

  order(col, { ascending = true } = {}) { this.orderBy = { col, ascending }; return this }
  limit(n) { this.limitN = n; return this }
  single() { this.singleMode = "single"; return this._exec() }
  maybeSingle() { this.singleMode = "maybeSingle"; return this._exec() }

  // Thenable — supabase-js query builders are awaited directly without an
  // explicit terminal call in some code paths (e.g. `.delete().eq(...)`,
  // `await q` after incremental building with no .single()).
  then(resolve, reject) { return this._exec().then(resolve, reject) }

  _buildWhere(params) {
    if (this.filters.length === 0) return ""
    const clauses = this.filters.map((f) => {
      if (f.op === "is") {
        params.push(f.val)
        return `${f.col} IS NOT DISTINCT FROM $${params.length}`
      }
      if (f.op === "in") {
        params.push(f.val)
        return `${f.col} = ANY($${params.length})`
      }
      params.push(f.val)
      return `${f.col} ${f.op} $${params.length}`
    })
    return " WHERE " + clauses.join(" AND ")
  }

  async _exec() {
    try {
      if (this.op === "select" || this.op === null) return await this._execSelect()
      if (this.op === "insert") return await this._execInsert()
      if (this.op === "update") return await this._execUpdate()
      if (this.op === "upsert") return await this._execUpsert()
      if (this.op === "delete") return await this._execDelete()
      throw new Error(`pgliteSupabaseAdapter: unsupported op ${this.op}`)
    } catch (err) {
      return this._wrapError(err)
    }
  }

  _wrapError(err) {
    // Surface Postgres's error code (e.g. '23505' unique_violation) the same
    // way supabase-js does, since submission-engine/repository.js branches on
    // `error.code === "23505"`.
    const wrapped = { message: err.message, code: err.code || null, details: err.detail || null }
    return { data: null, error: wrapped, count: null }
  }

  async _execSelect() {
    const params = []
    let sql
    if (this.countMode) {
      sql = `SELECT COUNT(*)::int AS __count FROM ${this.table}`
    } else {
      sql = `SELECT ${this.selectCols} FROM ${this.table}`
    }
    sql += this._buildWhere(params)
    if (!this.countMode) {
      if (this.orderBy) sql += ` ORDER BY ${this.orderBy.col} ${this.orderBy.ascending ? "ASC" : "DESC"}`
      if (this.limitN != null) sql += ` LIMIT ${Number(this.limitN)}`
    }
    const res = await this.db.query(sql, params)
    if (this.countMode) {
      return { data: null, error: null, count: res.rows[0]?.__count ?? 0 }
    }
    const rows = coerceRows(res.rows)
    if (this.singleMode === "single") {
      if (rows.length !== 1) return { data: null, error: { message: `Expected 1 row, got ${rows.length}`, code: rows.length === 0 ? "PGRST116" : null }, count: null }
      return { data: rows[0], error: null, count: null }
    }
    if (this.singleMode === "maybeSingle") {
      if (rows.length > 1) return { data: null, error: { message: `Expected 0 or 1 row, got ${rows.length}` }, count: null }
      return { data: rows[0] || null, error: null, count: null }
    }
    return { data: rows, error: null, count: null }
  }

  async _execInsert() {
    const cols = Object.keys(this.payload)
    const params = cols.map((c) => encodeVal(c, this.payload[c]))
    const placeholders = cols.map((c, i) => `$${i + 1}${castFor(c)}`)
    let sql = `INSERT INTO ${this.table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`
    if (this.wantsReturning) sql += " RETURNING *"
    const res = await this.db.query(sql, params)
    if (!this.wantsReturning) return { data: null, error: null, count: null }
    const rows = coerceRows(res.rows)
    if (this.singleMode === "single") {
      if (rows.length !== 1) return { data: null, error: { message: `Expected 1 row, got ${rows.length}` }, count: null }
      return { data: rows[0], error: null, count: null }
    }
    return { data: rows, error: null, count: null }
  }

  async _execUpdate() {
    const cols = Object.keys(this.payload)
    const params = cols.map((c) => encodeVal(c, this.payload[c]))
    const setClause = cols.map((c, i) => `${c} = $${i + 1}${castFor(c)}`).join(", ")
    let sql = `UPDATE ${this.table} SET ${setClause}`
    sql += this._buildWhere(params)
    if (this.wantsReturning) sql += " RETURNING *"
    const res = await this.db.query(sql, params)
    if (!this.wantsReturning) return { data: null, error: null, count: null }
    const rows = coerceRows(res.rows)
    if (this.singleMode === "single") {
      if (rows.length !== 1) return { data: null, error: { message: `Expected 1 row, got ${rows.length}` }, count: null }
      return { data: rows[0], error: null, count: null }
    }
    return { data: rows, error: null, count: null }
  }

  async _execUpsert() {
    const cols = Object.keys(this.payload)
    const params = cols.map((c) => encodeVal(c, this.payload[c]))
    const placeholders = cols.map((c, i) => `$${i + 1}${castFor(c)}`)
    const conflictCols = this.onConflict.split(",").map((s) => s.trim())
    const updateSet = cols
      .filter((c) => !conflictCols.includes(c))
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(", ")
    let sql = `INSERT INTO ${this.table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`
    sql += ` ON CONFLICT (${conflictCols.join(", ")}) DO UPDATE SET ${updateSet}`
    if (this.wantsReturning) sql += " RETURNING *"
    const res = await this.db.query(sql, params)
    if (!this.wantsReturning) return { data: null, error: null, count: null }
    const rows = coerceRows(res.rows)
    if (this.singleMode === "single") {
      if (rows.length !== 1) return { data: null, error: { message: `Expected 1 row, got ${rows.length}` }, count: null }
      return { data: rows[0], error: null, count: null }
    }
    return { data: rows, error: null, count: null }
  }

  async _execDelete() {
    const params = []
    let sql = `DELETE FROM ${this.table}`
    sql += this._buildWhere(params)
    await this.db.query(sql, params)
    return { data: null, error: null, count: null }
  }
}

export function createPgliteSupabaseAdapter(db) {
  return {
    from(table) { return new QueryBuilder(db, table) },
  }
}
