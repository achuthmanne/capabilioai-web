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
  code:    "#1E1E1E",
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVE WORKSTATION TYPE FROM MISSION
// ─────────────────────────────────────────────────────────────────────────────
export function resolveWorkstationType(mission) {
  if (!mission) return "code"

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
  if (sb === "sql"  || sb === "data")           return "sql"
  if (sb === "react"|| sb === "frontend")       return "frontend"
  if (sb === "terminal")                        return "terminal"
  if (sb === "notebook")                        return "notebook"
  if (sb === "markdown" || sb === "diagram")    return "markdown"
  if (sb === "excel"    || sb === "spreadsheet")return "excel"
  if (sb === "dashboard"|| sb === "powerbi")    return "dashboard"
  if (sb === "report")                          return "report"

  // Derive from title / category / description keywords
  const text = ((mission.title || "") + " " + (mission.category || "") + " " + (mission.description || "")).toLowerCase()
  if (/\bsql\b|query|select|insert|join|database/.test(text))         return "sql"
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
      background: T.code, color: "#D4D4D4",
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
    background: active ? (color || T.blue) + "18" : "#0F172A",
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
          <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 ? T.bg : "#0F172A" }}>
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

          <div style={{ flex: 1, borderTop: `1px solid ${T.border}`, overflow: "auto", background: "#0F172A" }}>
            <PanelHeader color={sqlError ? T.red : T.ink3}>
              {running ? "⟳ Executing…"
                : sqlError ? "✗ SQL Error"
                : results ? `✓ ${results.resultSets.length} result set${results.resultSets.length === 1 ? "" : "s"} — ${totalRows} rows in ${results.ms}ms`
                : "Results"}
            </PanelHeader>
            {sqlError && (
              <div style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: T.red, whiteSpace: "pre-wrap" }}>{sqlError}</div>
            )}
            {results && !running && results.resultSets.length === 0 && (
              <div style={{ padding: 16, color: T.ink3, fontSize: 11 }}>Statement executed — no rows returned.</div>
            )}
            {results && !running && results.resultSets.map((rs, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                {results.resultSets.length > 1 && (
                  <div style={{ padding: "4px 10px", fontSize: 9, fontWeight: 800, color: T.ink3, textTransform: "uppercase", letterSpacing: 0.6, background: T.bg }}>
                    Result {i + 1} — {rs.rowCount} rows{rs.truncated ? " (showing first 500)" : ""}
                  </div>
                )}
                <ResultTable rs={rs} />
              </div>
            ))}
            {!results && !sqlError && !running && (
              <div style={{ padding: 16, color: T.ink3, fontSize: 11 }}>Write SQL above and press ▶ Run Query — it executes for real against the seeded database.</div>
            )}
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
    setTimeout(() => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        time: `${Math.floor(Math.random() * 120 + 20)}ms`,
        headers: { "content-type": "application/json", "x-request-id": "abc123" },
        body: JSON.stringify(
          method === "GET"
            ? [{ id: 1, name: "Alice", email: "alice@example.com" }, { id: 2, name: "Bob", email: "bob@example.com" }]
            : { success: true, message: "Resource updated", id: 42 },
          null, 2
        ),
      }
      setResponse(mockResponse)
      setSending(false)
    }, 800)
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      {/* URL bar */}
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, background: T.bg2, display: "flex", gap: 8, flexShrink: 0 }}>
        <select value={method} onChange={e => setMethod(e.target.value)} style={{
          padding: "4px 8px", border: `1px solid ${T.border}`, borderRadius: 6,
          fontWeight: 800, fontSize: 11, color: methodColor[method] || T.ink,
          background: "#0F172A", cursor: "pointer",
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
          background: T.blue, color: "#0F172A", fontSize: 11, fontWeight: 700, cursor: "pointer",
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
              <div style={{ padding: "6px 12px", background: T.green2, borderBottom: `1px solid ${T.border}`, display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: T.green }}>✓ {response.status} {response.statusText}</span>
                <span style={{ fontSize: 10, color: T.ink3 }}>⏱ {response.time}</span>
              </div>
              <pre style={{ margin: 0, padding: "10px 14px", fontSize: 11, color: "#D4D4D4", background: T.code, overflow: "auto", flex: 1 }}>
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
              style={{ flex: 1, border: "none", background: "#0F172A" }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TERMINAL WORKSTATION
// ─────────────────────────────────────────────────────────────────────────────
const TERMINAL_RESPONSES = {
  ls:     "Desktop  Documents  Downloads  Projects  README.md",
  pwd:    "/home/user/workspace",
  whoami: "user",
  date:   () => new Date().toString(),
  echo:   (args) => args.join(" "),
  cat:    () => "# README\nThis is a simulated terminal environment.",
  mkdir:  (args) => `mkdir: created directory '${args[0] || "newdir"}'`,
  touch:  (args) => `touch: created '${args[0] || "file.txt"}'`,
  clear:  () => "__CLEAR__",
  help:   () => "Available: ls, pwd, whoami, date, echo, cat, mkdir, touch, clear, help, python3",
  python3: () => "Python 3.11.0 (simulated)\n>>> ",
}

function TerminalWorkstation({ mission, code, onCodeChange }) {
  const [history, setHistory] = useState([
    { type: "system", text: "🖥  Simulated Terminal — type 'help' for commands" },
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

    const parts = trimmed.split(/\s+/)
    const bin   = parts[0]
    const args  = parts.slice(1)

    let output = `bash: ${bin}: command not found`
    if (bin in TERMINAL_RESPONSES) {
      const resp = TERMINAL_RESPONSES[bin]
      const result = typeof resp === "function" ? resp(args) : resp
      if (result === "__CLEAR__") {
        setHistory([{ type: "system", text: "🖥  Terminal cleared" }])
        setInput("")
        return
      }
      output = result
    }

    setHistory(h => [
      ...h,
      { type: "input",  text: `$ ${trimmed}` },
      { type: "output", text: output },
    ])
    // Also append to the code editor so submission includes commands run
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
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 ? T.bg : "#0F172A" }}>
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
        <div style={{ flex: 1, borderTop: `1px solid ${T.border}`, overflow: "auto", background: "#0F172A" }}>
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
              style={{ background: "#1E1E2E" }}
            />
          </div>
        )}
        {previewVisible && (
          <div style={{ flex: 1, overflow: "auto", padding: "16px 20px", background: "#0F172A", fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.7, color: T.ink }}>
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
            <button onClick={removeDuplicates} style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#0F172A", fontSize: 10, fontWeight: 700, color: T.blue, cursor: "pointer", textAlign: "left" }}>🗑 Remove Duplicates</button>
            <button onClick={standardiseCase} style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#0F172A", fontSize: 10, fontWeight: 700, color: T.blue, cursor: "pointer", textAlign: "left" }}>Aa Standardise Casing</button>
            <button onClick={fixDates} style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#0F172A", fontSize: 10, fontWeight: 700, color: T.blue, cursor: "pointer", textAlign: "left" }}>📅 Fix Date Formats</button>
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
                <div style={{ padding: "2px 6px", border: `1px solid ${T.border}`, borderRadius: 3, fontSize: 10, fontWeight: 700, textAlign: "center", background: "#0F172A", color: T.green, whiteSpace: "nowrap" }}>
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
                    <th key={h} style={{ background: "#217346", color: "#0F172A", border: `1px solid #C8C8C8`, padding: "5px 10px", fontWeight: 700, fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const hasIssue = issueRowIdx.has(ri)
                  return (
                    <tr key={ri} style={{ background: hasIssue ? "#FFF8F0" : ri % 2 ? "#F8FBF8" : "#0F172A" }}>
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
                fontFamily: "Georgia, serif", color: T.ink, background: "#0F172A",
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
                <div key={kpi.label} style={{ background: "#0F172A", borderRadius: 10, padding: "12px 14px", border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
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
                    <tr style={{ background: "#217346", color: "#0F172A" }}>
                      {["Column","Count","Mean","Min","Max"].map(h => (
                        <th key={h} style={{ padding: "6px 12px", textAlign: "left", fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.numericCols.map((nc, i) => (
                      <tr key={nc.col} style={{ background: i % 2 ? "#F0F7F0" : "#0F172A", borderBottom: "1px solid #D0D0D0" }}>
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
                <text x={x + Math.max(8, slot - 12) / 2} y={124} textAnchor="middle" fontSize={8} fill="#94A3B8">{p.x.slice(0, 8)}</text>
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
                    <text x={x} y={124} textAnchor="middle" fontSize={8} fill="#94A3B8">{pts[i].x.slice(0, 8)}</text>
                  </g>
                ))}
              </>
            )
          })()
      }
      <line x1={10} y1={110} x2={W - 5} y2={110} stroke="#E5E7EB" strokeWidth={1} />
    </svg>
  )
}

const DONUT_COLORS = ["#2563EB", "#D97706", "#16A34A", "#9333EA", "#DC2626", "#0891B2", "#CA8A04", "#64748B"]

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
        <circle cx={70} cy={65} r={26} fill="#0F172A" />
      </svg>
      {rows.map((seg, i) => (
        <div key={i} style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 5 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: "#475569", flex: 1 }}>{seg.x}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A", fontVariantNumeric: "tabular-nums" }}>{Math.round((Math.max(0, seg.y) / total) * 100)}%</span>
        </div>
      ))}
    </>
  )
}

function EmptyChartState({ label }) {
  return (
    <div style={{ minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px dashed #D1D5DB", borderRadius: 8, padding: 14 }}>
      <span style={{ fontSize: 10.5, color: "#9CA3AF", textAlign: "center", lineHeight: 1.5 }}>{label}</span>
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

  const labelStyle = { fontSize: 9, fontWeight: 800, color: "#94A3B8", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 6 }
  const cardStyle  = { background: "#0F172A", borderRadius: 11, padding: "12px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }
  const sectionHdr = (label, icon) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#0F172A", letterSpacing: -0.2 }}>{label}</span>
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, fontFamily: "'DM Sans',sans-serif", background: "#F4F6FA" }}>

      {/* ── Workspace tab bar ── */}
      <div style={{ display: "flex", background: "#0F172A", borderBottom: "1px solid #E5E7EB", flexShrink: 0 }}>
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
              <div style={{ fontSize: 12, fontWeight: wsTab === t.id ? 800 : 500, color: wsTab === t.id ? "#2563EB" : "#475569" }}>{t.label}</div>
              <div style={{ fontSize: 9, color: "#9CA3AF", lineHeight: 1 }}>{t.hint}</div>
            </div>
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, paddingRight: 14 }}>
          {["kpi", "trend", "breakdown"].map(slot => (
            <span key={slot} style={{
              fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
              background: published[slot] ? "#DCFCE7" : "#F3F4F6",
              color: published[slot] ? "#15803D" : "#9CA3AF",
              border: `1px solid ${published[slot] ? "#BBF7D0" : "#E5E7EB"}`,
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
              {!schemaInfo && <div style={{ fontSize: 10, color: "#9CA3AF" }}>Loading database…</div>}
              {(schemaInfo || []).map(t => (
                <div key={t.table} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#1D4ED8", marginBottom: 3, fontFamily: "monospace" }}>
                    {t.table} <span style={{ color: "#9CA3AF", fontWeight: 400 }}>· {t.rowCount.toLocaleString()} rows</span>
                  </div>
                  {t.columns.map(c => (
                    <div key={c.name} style={{ fontSize: 10, paddingLeft: 8, color: "#94A3B8", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "monospace", color: "#475569" }}>{c.name}</span>
                      <span style={{ fontSize: 9, color: "#9CA3AF" }}>{c.type}</span>
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
                {!quality && <div style={{ fontSize: 10, color: "#9CA3AF" }}>Profiling data…</div>}
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
                        <th key={c} style={{ padding: "6px 10px", textAlign: "left", color: "#0F172A", fontWeight: 700, fontSize: 10, whiteSpace: "nowrap" }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.values.map((row, ri) => (
                      <tr key={ri} style={{ background: ri % 2 ? "#0F172A" : "#0F172A", borderBottom: "1px solid #F3F4F6" }}>
                        {row.map((cell, ci) => {
                          const isNull = cell === null
                          return (
                            <td key={ci} style={{
                              padding: "5px 10px", whiteSpace: "nowrap",
                              color: isNull ? "#DC2626" : "#1E293B", fontWeight: isNull ? 700 : 400,
                              background: isNull ? "#FEF2F2" : "inherit",
                            }}>{isNull ? "NULL ⚠" : formatCell(cell)}</td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!preview && <div style={{ fontSize: 11, color: "#9CA3AF", padding: 10 }}>Loading rows…</div>}
            </div>
            <div style={{ padding: "6px 10px", borderTop: "1px solid #F3F4F6", fontSize: 9, color: "#9CA3AF", background: "#0F172A" }}>
              This is a real SQLite database — query it from the Build tab. Quality issues above were computed from the actual rows.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB 2 — BUILD ══════════════ */}
      {wsTab === "build" && (
        <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden", minHeight: 0 }}>
          {/* Left: SQL editor + live results */}
          <div style={{ flex: 1.2, display: "flex", flexDirection: "column", borderRight: "1px solid #E5E7EB", overflow: "hidden" }}>
            <div style={{ padding: "7px 12px", background: "#0F172A", borderBottom: "1px solid rgba(0,0,0,0.03)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {["#EF4444", "#F59E0B", "#22C55E"].map((c, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />)}
              </div>
              <span style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace" }}>SQL — executes against the live database</span>
              <button onClick={() => setSqlCode(DASH_SQL_SCAFFOLD)} style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.03)", color: "rgba(255,255,255,0.45)", fontSize: 9, cursor: "pointer" }}>Load scaffold</button>
              <button onClick={runSql} disabled={sqlRunning} style={{ padding: "2px 12px", borderRadius: 4, border: "none", background: sqlRunning ? "#475569" : "#16A34A", color: "#0F172A", fontSize: 9, fontWeight: 700, cursor: sqlRunning ? "wait" : "pointer" }}>
                {sqlRunning ? "⟳ Running…" : "▶ Run SQL"}
              </button>
            </div>
            <textarea
              value={sqlCode}
              onChange={e => setSqlCode(e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runSql() } }}
              placeholder={"-- Write SQL and press ▶ Run SQL (or ⌘/Ctrl+Enter).\n-- It executes for real — wrong SQL gives a real error.\nSELECT * FROM orders LIMIT 10;"}
              spellCheck={false}
              style={{ flex: "0 0 45%", background: "#0F172A", color: "#E2E8F0", fontFamily: "'DM Mono',monospace", fontSize: 12, lineHeight: 1.65, padding: "10px 14px", border: "none", outline: "none", resize: "none", boxSizing: "border-box" }}
            />
            {/* Real results + publish controls */}
            <div style={{ flex: 1, overflow: "auto", background: "#0F172A", borderTop: "1px solid #E5E7EB" }}>
              <div style={{ padding: "5px 12px", fontSize: 9, fontWeight: 800, color: sqlErr ? "#DC2626" : "#94A3B8", textTransform: "uppercase", letterSpacing: 0.6, background: "#0F172A", borderBottom: "1px solid #F3F4F6", position: "sticky", top: 0 }}>
                {sqlErr ? "✗ SQL Error" : sqlOut ? `✓ ${sqlOut.resultSets.length} result set${sqlOut.resultSets.length === 1 ? "" : "s"} in ${sqlOut.ms}ms — publish them to your dashboard →` : "Results appear here after ▶ Run SQL"}
              </div>
              {sqlErr && <pre style={{ margin: 0, padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: "#DC2626", whiteSpace: "pre-wrap" }}>{sqlErr}</pre>}
              {sqlOut && sqlOut.resultSets.map((rs, i) => (
                <div key={i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "#0F172A" }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#475569" }}>Result {i + 1} · {rs.rowCount} rows</span>
                    <span style={{ fontSize: 9, color: "#9CA3AF", marginRight: "auto" }}>{rs.columns.join(", ").slice(0, 60)}</span>
                    {[["kpi", "📌 KPI"], ["trend", "📈 Trend"], ["breakdown", "🥧 Breakdown"]].map(([slot, lbl]) => (
                      <button key={slot} onClick={() => publish(slot, rs)} style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer",
                        border: `1px solid ${published[slot] === rs ? "#16A34A" : "#E5E7EB"}`,
                        background: published[slot] === rs ? "#DCFCE7" : "#0F172A",
                        color: published[slot] === rs ? "#15803D" : "#94A3B8",
                      }}>{published[slot] === rs ? "✓ " : ""}{lbl}</button>
                    ))}
                  </div>
                  <div style={{ maxHeight: 160, overflow: "auto" }}>
                    <table style={{ borderCollapse: "collapse", fontSize: 10.5, width: "100%" }}>
                      <thead>
                        <tr style={{ background: "#F1F5F9" }}>
                          {rs.columns.map(c => <th key={c} style={{ padding: "4px 9px", textAlign: "left", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{c}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {rs.values.slice(0, 50).map((row, ri) => (
                          <tr key={ri} style={{ borderTop: "1px solid #F3F4F6" }}>
                            {row.map((cell, ci) => <td key={ci} style={{ padding: "3px 9px", color: cell === null ? "#DC2626" : "#1E293B", whiteSpace: "nowrap" }}>{formatCell(cell)}</td>)}
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
            <div style={{ padding: "6px 12px", background: "#1E293B", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace" }}>Python — real pandas/matplotlib (Pyodide)</span>
              <button onClick={() => setPyCode(DASH_PY_SCAFFOLD)} style={{ marginLeft: "auto", padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.03)", color: "rgba(255,255,255,0.4)", fontSize: 9, cursor: "pointer" }}>Load scaffold</button>
              <button onClick={runPy} disabled={pyRunning} style={{ padding: "2px 12px", borderRadius: 4, border: "none", background: pyRunning ? "#475569" : "#2563EB", color: "#0F172A", fontSize: 9, fontWeight: 700, cursor: pyRunning ? "wait" : "pointer" }}>
                {pyRunning ? "⟳" : "▶ Run"}
              </button>
            </div>
            <textarea
              value={pyCode}
              onChange={e => setPyCode(e.target.value)}
              placeholder={"# Real Python — df preloaded from /data/orders.csv\n# First run downloads the runtime (~15 MB, cached after).\nprint(df.head())"}
              spellCheck={false}
              style={{ flex: "0 0 45%", background: "#1E293B", color: "#E2E8F0", fontFamily: "'DM Mono',monospace", fontSize: 11.5, lineHeight: 1.65, padding: "10px 14px", border: "none", outline: "none", resize: "none", boxSizing: "border-box" }}
            />
            <div style={{ flex: 1, overflow: "auto", background: "#0F172A", borderTop: "1px solid #E5E7EB" }}>
              <div style={{ padding: "5px 12px", fontSize: 9, fontWeight: 800, color: pyOut?.error ? "#DC2626" : "#94A3B8", textTransform: "uppercase", letterSpacing: 0.6, background: "#0F172A", borderBottom: "1px solid #F3F4F6" }}>
                {pyRunning ? (pyStatus || "⟳ Running…") : pyOut ? (pyOut.error ? "✗ Traceback" : "✓ Python output") : "Output"}
              </div>
              {pyOut && (
                <div style={{ padding: "8px 12px" }}>
                  {pyOut.stdout && <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 10.5, color: "#1E293B", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{pyOut.stdout}</pre>}
                  {pyOut.error && <pre style={{ margin: "6px 0 0", fontFamily: "monospace", fontSize: 10.5, color: "#DC2626", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{pyOut.error}</pre>}
                  {(pyOut.images || []).map((img, i) => (
                    <img key={i} src={`data:image/png;base64,${img}`} alt={`figure ${i + 1}`} style={{ maxWidth: "100%", marginTop: 8, border: "1px solid #E5E7EB", borderRadius: 6 }} />
                  ))}
                </div>
              )}
              {!pyOut && !pyRunning && (
                <div style={{ padding: "10px 12px", fontSize: 10, color: "#9CA3AF", lineHeight: 1.6 }}>
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
                  <div key={kpi.label} style={{ background: "#0F172A", borderRadius: 11, padding: "12px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, marginBottom: 5, fontFamily: "monospace" }}>{kpi.label}</div>
                    <div style={{ fontSize: 19, fontWeight: 900, color: "#0F172A", fontVariantNumeric: "tabular-nums" }}>{kpi.value}</div>
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
                    <strong style={{ color: "#0F172A" }}>{v.input}</strong>
                    <span style={{ color: "#94A3B8" }}> — expected ≈ {v.expected} · {v.actual}</span>
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
                  {published.trend && <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "monospace" }}>{published.trend.columns.join(" · ")}</div>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["bar", "line"].map(ct => (
                    <button key={ct} onClick={() => setChartType(ct)} style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${chartType === ct ? "#2563EB" : "#E5E7EB"}`, background: chartType === ct ? "#2563EB" : "#0F172A", color: chartType === ct ? "#0F172A" : "#94A3B8", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
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
          <div style={{ background: "#0F172A", borderRadius: 11, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={labelStyle}>✍️ Your Analysis & Insights</div>
                <div style={{ fontSize: 10, color: "#94A3B8" }}>Base these on the numbers you actually computed — the AI evaluator scores each field</div>
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
                <div key={field.key} style={{ background: "#0F172A", borderRadius: 8, padding: "10px 11px", border: "1px solid #E5E7EB" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 13 }}>{field.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#0F172A" }}>{field.label}</span>
                    <div style={{ marginLeft: "auto", fontSize: 8, color: "#9CA3AF", maxWidth: 140, textAlign: "right", lineHeight: 1.3 }}>{field.hint}</div>
                  </div>
                  <textarea
                    value={insights[field.key] || ""}
                    onChange={e => setInsights(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={`Write your ${field.label.toLowerCase()} insight based on your actual results…`}
                    style={{ width: "100%", minHeight: 64, border: "1px solid #E5E7EB", borderRadius: 6, padding: "6px 8px", fontSize: 11, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", color: "#0F172A", lineHeight: 1.65, background: "#0F172A" }}
                    onFocus={e => e.target.style.borderColor = "#2563EB"}
                    onBlur={e => e.target.style.borderColor = "#E5E7EB"}
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
            background: preview ? T.green : "#0F172A", color: preview ? "#0F172A" : T.ink2,
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
                fontFamily: "Georgia, serif", color: T.ink, background: "#0F172A",
              }}
            />
          </>
        ) : (
          <div style={{ flex: 1, overflow: "auto", padding: "20px 28px", background: "#0F172A", fontFamily: "Georgia, serif" }}>
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
                style={{ background:selectedAlert===alert?"#FEF2F2":"#0F172A", border:`1px solid ${selectedAlert===alert?"#DC262640":T.border}`, borderLeft:`3px solid ${SEV_COLORS[alert.severity]||"#94A3B8"}`, borderRadius:8, padding:"9px 12px", marginBottom:7, cursor:"pointer", transition:"all .12s" }}>
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
            <button onClick={runQuery} style={{ padding:"9px 20px", background:"#DC2626", border:"none", borderRadius:8, color:"#0F172A", fontSize:12, fontWeight:700, cursor:"pointer" }}>Run</button>
          </div>
          <div style={{ flex:1, background:"#0A0A10", borderRadius:8, padding:12, overflow:"auto" }}>
            {results.length === 0
              ? <div style={{ color:"#94A3B8", fontSize:11 }}>Run a query to see results. Try: leave empty and press Run to search all events.</div>
              : results.map((r,i) => (
                  <div key={i} style={{ borderBottom:"1px solid #1F2937", paddingBottom:8, marginBottom:8 }}>
                    <span style={{ color:SEV_COLORS[r.severity]||"#94A3B8", fontWeight:700, fontSize:10, marginRight:8 }}>{r.severity}</span>
                    <span style={{ color:"#22D3EE", fontSize:11 }}>{r.time}</span>
                    <span style={{ color:"#F59E0B", fontSize:11, margin:"0 8px" }}>{r.src} → {r.dst}</span>
                    <span style={{ color:"#D1D5DB", fontSize:11 }}>{r.event}: {r.detail}</span>
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
            style={{ flex:1, padding:14, background:"#0A0A10", color:"#E5E7EB", fontSize:12, fontFamily:"'DM Mono',monospace", border:`1px solid ${T.border}`, borderRadius:8, resize:"none", outline:"none", lineHeight:1.7 }}
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
        <div style={{ padding:"9px 16px", fontSize:10, color:"#94A3B8" }}>{alerts.filter(a=>a.assigned).length}/{alerts.length} assigned</div>
      </div>

      {tab==="queue" && (
        <div style={{ flex:1, overflowY:"auto", padding:12 }}>
          <div style={{ fontSize:10, color:T.ink4, marginBottom:10, letterSpacing:1 }}>LIVE ALERT QUEUE — TRIAGE REQUIRED</div>
          {alerts.map(al=>(
            <div key={al.id} style={{ background:al.assigned?"#F0FDF4":"#0F172A", border:`1px solid ${al.assigned?"#05966940":T.border}`, borderLeft:`3px solid ${SEV[al.severity]}`, borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:11, fontWeight:800, color:SEV[al.severity], background:SEV[al.severity]+"15", padding:"1px 8px", borderRadius:99 }}>{al.severity}</span>
                <span style={{ fontSize:10, color:T.ink4 }}>Source: {al.src}</span>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:T.ink, marginBottom:3 }}>{al.title}</div>
              <div style={{ fontSize:11, color:T.ink3, marginBottom:8 }}>{al.detail}</div>
              {!al.assigned
                ? <button onClick={()=>assign(al.id)} style={{ padding:"5px 14px", background:"#DC2626", border:"none", borderRadius:6, color:"#0F172A", fontSize:10, fontWeight:700, cursor:"pointer" }}>Assign & Respond →</button>
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
                    style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"9px 12px", background:checkedSteps[i]?"#F0FDF4":"#0F172A", border:`1px solid ${checkedSteps[i]?"#05966940":T.border}`, borderRadius:8, marginBottom:8, cursor:"pointer" }}>
                    <div style={{ width:20, height:20, borderRadius:4, border:`2px solid ${checkedSteps[i]?"#059669":"#D1D5DB"}`, background:checkedSteps[i]?"#059669":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:"#0F172A", fontSize:11 }}>
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
              ? <div style={{ color:"#94A3B8", fontSize:11 }}>Timeline entries appear as you work the incident.</div>
              : timeline.map((e,i)=>(
                  <div key={i} style={{ borderBottom:"1px solid #1F2937", paddingBottom:6, marginBottom:6 }}>
                    <span style={{ color:"#22D3EE", fontSize:10 }}>{e.time}</span>
                    <span style={{ color:"#D1D5DB", fontSize:11, marginLeft:10 }}>{e.action}</span>
                  </div>
                ))
            }
          </div>
          <textarea value={notes} onChange={e=>{setNotes(e.target.value);onCodeChange(e.target.value)}}
            style={{ marginTop:10, height:100, padding:10, background:"#0A0A10", color:"#E5E7EB", fontSize:11, fontFamily:"'DM Mono',monospace", border:`1px solid ${T.border}`, borderRadius:8, resize:"none", outline:"none" }}
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
          <button onClick={runSimulation} style={{ margin:"5px 10px", padding:"4px 14px", background:T.indigo, border:"none", borderRadius:6, color:"#0F172A", fontSize:11, fontWeight:700, cursor:"pointer" }}>▶ Run Tests</button>
        </div>

        {tab==="tests" && (
          <textarea value={testCode} onChange={e=>{setTestCode(e.target.value);onCodeChange(e.target.value)}}
            style={{ flex:1, padding:14, background:"#1A1A2E", color:"#E5E7EB", fontSize:12, fontFamily:"'DM Mono',monospace", border:"none", resize:"none", outline:"none", lineHeight:1.7 }} />
        )}
        {tab==="bugs" && (
          <textarea value={bugReport} onChange={e=>setBugReport(e.target.value)}
            style={{ flex:1, padding:14, background:"#1A1A2E", color:"#E5E7EB", fontSize:12, fontFamily:"'DM Mono',monospace", border:"none", resize:"none", outline:"none", lineHeight:1.7 }}
            placeholder={`Bug Report Template:\n\n## Bug #1\n**Title:** \n**Severity:** HIGH / MED / LOW\n**Steps to Reproduce:**\n1. \n**Expected:** \n**Actual:** \n**Screenshot/Evidence:** `} />
        )}
        {tab==="coverage" && (
          <div style={{ flex:1, overflow:"auto", padding:14, background:"#1A1A2E", color:"#E5E7EB", fontFamily:"'DM Mono',monospace", fontSize:11 }}>
            {testResults.length===0
              ? <div style={{ color:"#94A3B8" }}>Run tests to see coverage results.</div>
              : <>
                  <div style={{ marginBottom:12 }}>{runLog}</div>
                  {testResults.map((r,i) => (
                    <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
                      <span style={{ color: r.status==="PASS"?"#22C55E":"#EF4444", fontWeight:700 }}>{r.status==="PASS"?"✓":"✗"}</span>
                      <span style={{ color:"#D1D5DB" }}>{r.name}</span>
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
          style={{ flex:1, border:"none", background:"#0F172A" }}
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
          style={{ flex:1, padding:20, background:"#F8F9FA", color:T.ink, fontSize:13, fontFamily:"'DM Sans',sans-serif", border:"none", resize:"none", outline:"none", lineHeight:1.8 }}
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
              <div key={i} style={{ background:"#0F172A", border:`1px solid ${STATUS_COLORS[s.status]}40`, borderLeft:`3px solid ${STATUS_COLORS[s.status]}`, borderRadius:10, padding:"12px 14px" }}>
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
          <div style={{ flex:1, overflow:"auto", padding:"14px 16px", fontFamily:"'DM Mono',monospace", fontSize:11, color:"#E5E7EB", whiteSpace:"pre-wrap", lineHeight:1.6 }}>
            {termOutput}
          </div>
          <div style={{ display:"flex", gap:8, padding:"10px 14px", borderTop:"1px solid #1F2937" }}>
            <span style={{ color:"#22D3EE", fontSize:12, fontFamily:"'DM Mono',monospace", alignSelf:"center" }}>$</span>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&runCommand(input)}
              placeholder="kubectl get pods"
              style={{ flex:1, background:"transparent", border:"none", color:"#E5E7EB", fontSize:12, fontFamily:"'DM Mono',monospace", outline:"none" }} />
            <button onClick={()=>runCommand(input)} style={{ padding:"4px 12px", background:"#6366F1", border:"none", borderRadius:5, color:"#0F172A", fontSize:11, cursor:"pointer" }}>Run</button>
          </div>
        </div>
      )}

      {tab==="slo" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", padding:16 }}>
          <div style={{ fontSize:10, color:T.ink4, marginBottom:8, letterSpacing:1 }}>SLO DEFINITION & POSTMORTEM</div>
          <textarea value={sloText} onChange={e=>{setSloText(e.target.value);onCodeChange(e.target.value)}}
            style={{ flex:1, padding:14, background:"#F8F9FA", color:T.ink, fontSize:12, fontFamily:"'DM Mono',monospace", border:`1px solid ${T.border}`, borderRadius:8, resize:"none", outline:"none", lineHeight:1.7 }}
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
    { id:"notify",    x:600, y:80,  label:"Notify",     color:"#94A3B8", icon:"🔔" },
  ]

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, background:T.bg2 }}>
      <div style={{ display:"flex", gap:0, background:T.bg, borderBottom:`1px solid ${T.border}`, alignItems:"center" }}>
        {["code","dag","schema"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"9px 14px", background:"none", border:"none", borderBottom:`2px solid ${tab===t?T.indigo:"transparent"}`, color:tab===t?T.indigo:T.ink3, fontSize:11, fontWeight:tab===t?800:400, cursor:"pointer", textTransform:"uppercase", letterSpacing:1 }}>{t.toUpperCase()}</button>
        ))}
        <button onClick={runPipeline} disabled={runningPipe} style={{ marginLeft:"auto", marginRight:10, padding:"4px 14px", borderRadius:6, border:"none", background: runningPipe ? "#9CA3AF" : "#059669", color:"#0F172A", fontSize:11, fontWeight:700, cursor: runningPipe ? "wait" : "pointer" }}>
          {runningPipe ? (runStatus || "⟳ Running…") : "▶ Run Pipeline"}
        </button>
      </div>

      {tab==="code" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
          <textarea value={pipelineCode} onChange={e=>{setPipelineCode(e.target.value);onCodeChange(e.target.value)}}
            style={{ flex:1, padding:16, background:"#1A1A2E", color:"#E5E7EB", fontSize:12, fontFamily:"'DM Mono',monospace", border:"none", resize:"none", outline:"none", lineHeight:1.7 }} />
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
          <div style={{ position:"relative", height:180, background:"#0F172A", borderRadius:12, border:`1px solid ${T.border}` }}>
            <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
              {DAG_NODES.slice(0,-1).map((n,i) => {
                const next = DAG_NODES[i+1]
                return <line key={i} x1={n.x+54} y1={n.y+24} x2={next.x} y2={next.y+24} stroke="#D1D5DB" strokeWidth="2" markerEnd="url(#arrow)" />
              })}
              <defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#D1D5DB"/></marker></defs>
            </svg>
            {DAG_NODES.map(n=>(
              <div key={n.id} style={{ position:"absolute", left:n.x, top:n.y, width:108, padding:"10px 8px", background:"#0F172A", border:`2px solid ${n.color}40`, borderRadius:10, textAlign:"center", boxShadow:`0 2px 8px ${n.color}20` }}>
                <div style={{ fontSize:18, marginBottom:3 }}>{n.icon}</div>
                <div style={{ fontSize:11, fontWeight:800, color:n.color }}>{n.label}</div>
                <div style={{ fontSize:9, color: runOut ? (pipeHealthy ? "#059669" : "#DC2626") : "#9CA3AF", fontWeight:600 }}>
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
          <div style={{ background:"#0F172A", borderRadius:10, border:`1px solid ${T.border}`, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", background:T.indigo, padding:"8px 12px" }}>
              {["Column","Type","Nullable","Notes"].map(h=><div key={h} style={{ fontSize:11, fontWeight:700, color:"#0F172A" }}>{h}</div>)}
            </div>
            {[["order_id","TEXT","No","Has duplicates — dedupe!"],["customer_id","INTEGER","No","FK to customers"],["product_id","INTEGER","No","FK to products"],["order_date","TEXT","No","YYYY-MM-DD"],["quantity","INTEGER","No",""],["amount","REAL","Yes","Contains NULLs — handle them"],["category","TEXT","No",""],["status","TEXT","No","Delivered / Cancelled / Returned"],["city","TEXT","No","Inconsistent casing"]].map((r,i)=>(
              <div key={i} style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", padding:"7px 12px", background:i%2===0?"#F7F7F3":"#0F172A" }}>
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
    id: "client", label: "Client", color: "#64748B", bg: "#0F172A", border: "#475569",
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
  const inp = { padding:"4px 7px", border:"1px solid #E5E7EB", borderRadius:5, fontSize:11, fontFamily:"inherit", outline:"none", background:"#0F172A", color:"#0F172A", width:"100%", boxSizing:"border-box" }
  const METHOD_C = { GET:"#16A34A", POST:"#2563EB", PUT:"#D97706", PATCH:"#7C3AED", DELETE:"#DC2626" }

  return (
    <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0, fontFamily:"'DM Sans',sans-serif", background:"#F4F4F0" }}>
      <style>{`
        @keyframes sd-pulse {0%,100%{box-shadow:0 0 0 0 rgba(109,64,160,0.35)}50%{box-shadow:0 0 0 8px rgba(109,64,160,0)}}
        .sd-node-hover { transform: translateY(-1px); }
      `}</style>

      {/* ═══════════════ LEFT — prompt tabs ═══════════════ */}
      <div style={{ width:256, flexShrink:0, borderRight:"1px solid #E2E8F0", display:"flex", flexDirection:"column", background:"#0F172A", overflow:"hidden" }}>
        <div style={{ display:"flex", borderBottom:"1px solid #E2E8F0", background:"#FAFAFA", flexShrink:0 }}>
          {[{ id:"req",deliver:false, icon:"📋", label:"Prompt" },{ id:"deliver",deliver:true, icon:"📦", label:"Deliver" },{ id:"rubric",deliver:false, icon:"✅", label:"Rubric" }].map(t => (
            <button key={t.id} onClick={() => setLeftTab(t.id)} style={{ flex:1, padding:"9px 0", border:"none", background:"none", borderBottom: leftTab===t.id ? "2px solid #6D40A0" : "2px solid transparent", fontSize:10, fontWeight: leftTab===t.id ? 800 : 500, color: leftTab===t.id ? "#6D40A0" : "#94A3B8", cursor:"pointer", fontFamily:"inherit" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto" }}>
          {/* Prompt */}
          {leftTab === "req" && (
            <div style={{ padding:"14px" }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#0F172A", marginBottom:8, lineHeight:1.3 }}>{mission?.title || "System Design Challenge"}</div>
              <p style={{ margin:"0 0 12px", fontSize:12, color:"#4B5563", lineHeight:1.65 }}>{mission?.scenario || mission?.description || "Design a scalable system meeting the requirements below."}</p>

              <div style={{ fontSize:9, fontWeight:800, color:"#9CA3AF", letterSpacing:0.8, textTransform:"uppercase", marginBottom:6 }}>Steps</div>
              {(mission?.steps || ["Define requirements and capacity", "Draw architecture diagram", "Spec API endpoints", "Define data schema", "Calculate capacity", "Document trade-offs"]).map((s, i) => (
                <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:6 }}>
                  <div style={{ width:18, height:18, borderRadius:99, background:"#EDE9FE", color:"#6D40A0", fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>{i+1}</div>
                  <span style={{ fontSize:11, color:"#475569", lineHeight:1.5 }}>{s}</span>
                </div>
              ))}

              <div style={{ height:1, background:"#F3F4F6", margin:"12px 0" }} />
              <div style={{ fontSize:9, fontWeight:800, color:"#9CA3AF", letterSpacing:0.8, textTransform:"uppercase", marginBottom:7 }}>Non-Functional</div>
              {[{icon:"⚡",k:"Latency",   v: mission?.latency       || "p99 < 10ms"          },
                {icon:"☁️",k:"Scale",     v: mission?.scale         || "10B redirects / day"  },
                {icon:"✅",k:"Availability",v:mission?.availability || "99.99% uptime"        },
              ].map(r => (
                <div key={r.k} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, padding:"6px 8px", background:"#0F172A", borderRadius:7, border:"1px solid #E2E8F0" }}>
                  <span style={{ fontSize:13 }}>{r.icon}</span>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:"#94A3B8" }}>{r.k}</div>
                    <div style={{ fontSize:11, fontWeight:600, color:"#0F172A" }}>{r.v}</div>
                  </div>
                </div>
              ))}

              <div style={{ height:1, background:"#F3F4F6", margin:"12px 0" }} />
              <div style={{ fontSize:9, fontWeight:800, color:"#9CA3AF", letterSpacing:0.8, textTransform:"uppercase", marginBottom:5 }}>Assumptions</div>
              <textarea value={assumptions} onChange={e => persist({ assumptions: e.target.value })}
                placeholder={"e.g.\n– Read:Write ≈ 100:1\n– URLs globally unique\n– No real-time analytics"}
                style={{ ...inp, minHeight:80, fontSize:11, lineHeight:1.55, resize:"vertical", fontFamily:"inherit", border:"1px solid #E5E7EB", padding:"8px 10px" }} />
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
                <div key={d.title} style={{ padding:"10px 11px", background:"#0F172A", borderRadius:9, border:"1px solid #E2E8F0" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                    <span style={{ fontSize:16 }}>{d.icon}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"#0F172A" }}>{d.title}</span>
                  </div>
                  <p style={{ margin:0, fontSize:11, color:"#94A3B8", lineHeight:1.5 }}>{d.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Rubric */}
          {leftTab === "rubric" && (
            <div style={{ padding:"14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:800, color:"#475569" }}>Self-check</span>
                <span style={{ fontSize:13, fontWeight:900, color: rubricScore>=80 ? "#16A34A" : rubricScore>=50 ? "#D97706" : "#9CA3AF", fontVariantNumeric:"tabular-nums" }}>{rubricScore}%</span>
              </div>
              <div style={{ height:6, background:"#F3F4F6", borderRadius:3, overflow:"hidden", marginBottom:14 }}>
                <div style={{ height:"100%", width:`${rubricScore}%`, background: rubricScore>=80 ? "#16A34A" : "#6D40A0", borderRadius:3, transition:"width 0.35s" }} />
              </div>
              {SD_RUBRIC.map(r => {
                const on = rubricChecks[r.id]
                return (
                  <div key={r.id} onClick={() => setChecks(c => ({ ...c, [r.id]: !c[r.id] }))}
                    style={{ display:"flex", gap:9, alignItems:"center", padding:"8px 10px", borderRadius:8, marginBottom:5, border:`1.5px solid ${on ? "#BBF7D0" : "#E5E7EB"}`, background: on ? "#F0FDF4" : "#0F172A", cursor:"pointer", transition:"all 0.15s" }}>
                    <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${on ? "#16A34A" : "#D1D5DB"}`, background: on ? "#16A34A" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {on && <span style={{ fontSize:10, color:"#0F172A", lineHeight:1 }}>✓</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:600, color: on ? "#15803D" : "#475569" }}>{r.label}</div>
                      <div style={{ fontSize:9, color:"#9CA3AF" }}>{r.weight}% of score</div>
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
        <div style={{ background:"#0F172A", borderBottom:"1px solid #E2E8F0", flexShrink:0 }}>
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
                        onMouseEnter={e => { e.currentTarget.style.background = "#0F172A"; e.currentTarget.style.borderColor = layer.border; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.08)" }}
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
                <path d="M0,0 L10,4 L0,8 Z" fill="#94A3B8" />
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
                    stroke="#94A3B8" strokeWidth="1.8" fill="none" markerEnd="url(#sd-arrow)"
                    strokeDasharray="none" opacity="0.85" />
                  {/* Midpoint delete handle */}
                  <g style={{ cursor:"pointer" }} onClick={e => { e.stopPropagation(); setEdges(es => es.filter((_,i) => i !== ei)) }}>
                    <circle cx={mx} cy={my} r={8} fill="#0F172A" stroke="#E2E8F0" strokeWidth="1.5" />
                    <text x={mx} y={my+4} fontSize="9" fill="#9CA3AF" textAnchor="middle">✕</text>
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
                  background:"#0F172A",
                  borderRadius:12,
                  border:`2px solid ${isSrc ? "#7C3AED" : isSel ? node.color : isHov ? node.color + "60" : "#E2E8F0"}`,
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
                        style={{ width:22, height:22, borderRadius:99, background:"#6D40A0", border:"none", color:"#0F172A", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(109,64,160,0.4)" }}>
                        →
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); removeNode(node.uid) }}
                      title="Remove this component"
                      style={{ width:22, height:22, borderRadius:99, background:"#DC2626", border:"none", color:"#0F172A", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(220,38,38,0.3)" }}>
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
        <div style={{ borderTop:"1px solid #E2E8F0", background:"#0F172A", padding:"5px 16px", display:"flex", gap:16, alignItems:"center", flexShrink:0 }}>
          <span style={{ fontSize:10, color:"#94A3B8" }}>
            <strong style={{ color:"#64748B" }}>Click palette</strong> to add ·
            <strong style={{ color:"#64748B" }}> Drag</strong> to move ·
            <strong style={{ color:"#64748B" }}> Select → →</strong> to draw arrow ·
            <strong style={{ color:"#64748B" }}> ✕ on edge</strong> to remove
          </span>
          <div style={{ marginLeft:"auto", display:"flex", gap:10, fontSize:10, color:"#94A3B8" }}>
            <span>{nodes.length} components</span>
            <span>{edges.length} connections</span>
          </div>
        </div>
      </div>

      {/* ═══════════════ RIGHT — spec notes ═══════════════ */}
      <div style={{ width:264, flexShrink:0, borderLeft:"1px solid #E2E8F0", display:"flex", flexDirection:"column", background:"#0F172A", overflow:"hidden" }}>

        {/* Tab bar */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", borderBottom:"1px solid #E2E8F0", background:"#FAFAFA", flexShrink:0 }}>
          {[{ id:"api",icon:"🔌",label:"API" },{ id:"schema",icon:"🗃️",label:"Schema" },{ id:"capacity",icon:"📊",label:"Capacity" },{ id:"tradeoffs",icon:"⚖️",label:"Trade-offs" }].map(t => (
            <button key={t.id} onClick={() => setRightTab(t.id)} style={{ padding:"8px 0", border:"none", background:"none", borderBottom: rightTab===t.id ? "2px solid #1D4ED8" : "2px solid transparent", fontSize:9, fontWeight: rightTab===t.id ? 800 : 500, color: rightTab===t.id ? "#1D4ED8" : "#94A3B8", cursor:"pointer", fontFamily:"inherit", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
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
                <div key={i} style={{ marginBottom:8, padding:"9px 10px", background:"#0F172A", borderRadius:9, border:"1px solid #E2E8F0" }}>
                  <div style={{ display:"flex", gap:5, marginBottom:5, alignItems:"center" }}>
                    <select value={row.method} onChange={e => persist({ api: apiRows.map((r,j) => j===i ? {...r, method:e.target.value} : r) })}
                      style={{ padding:"3px 5px", border:"1px solid #E5E7EB", borderRadius:5, fontWeight:800, fontSize:10, color:METHOD_C[row.method]||"#475569", background:"#0F172A", cursor:"pointer", outline:"none" }}>
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
                style={{ width:"100%", padding:"5px 0", borderRadius:6, border:"1.5px dashed #D1D5DB", background:"transparent", fontSize:11, color:"#9CA3AF", cursor:"pointer", fontWeight:600 }}>+ Add endpoint</button>
            </div>
          )}

          {/* Schema tab */}
          {rightTab === "schema" && (
            <div style={{ padding:"10px" }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#475569", marginBottom:8 }}>Table Fields</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 60px", gap:3, marginBottom:5 }}>
                {["Field","Type","Notes"].map(h => <div key={h} style={{ fontSize:8.5, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:0.4 }}>{h}</div>)}
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
                style={{ width:"100%", marginTop:4, padding:"5px 0", borderRadius:6, border:"1.5px dashed #D1D5DB", background:"transparent", fontSize:11, color:"#9CA3AF", cursor:"pointer", fontWeight:600 }}>+ Add field</button>
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
                      placeholder="calculation" style={{ ...inp, fontFamily:"'DM Mono',monospace", fontSize:10, flex:1, background:"#0F172A" }} />
                    <span style={{ fontSize:11, color:"#60A5FA", fontWeight:700 }}>→</span>
                    <input value={row.result} onChange={e => persist({ capacity: capRows.map((r,j) => j===i ? {...r, result:e.target.value} : r) })}
                      placeholder="result" style={{ ...inp, width:68, fontWeight:800, color:"#1D4ED8", fontSize:10, background:"#0F172A" }} />
                  </div>
                </div>
              ))}
              <button onClick={() => persist({ capacity: [...capRows, { metric:"", formula:"", result:"" }] })}
                style={{ width:"100%", padding:"5px 0", borderRadius:6, border:"1.5px dashed #D1D5DB", background:"transparent", fontSize:11, color:"#9CA3AF", cursor:"pointer", fontWeight:600 }}>+ Add estimate</button>

              <div style={{ marginTop:12, borderTop:"1px solid #E2E8F0", paddingTop:10 }}>
                <div style={{ fontSize:9, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 }}>Formula cheatsheet</div>
                {[["QPS","daily ÷ 86,400"],["Storage/yr","rows × size × 365"],["Cache","traffic × 0.2"],["Bandwidth","QPS × resp_size"]].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid #F1F5F9" }}>
                    <span style={{ fontSize:10, fontWeight:600, color:"#475569" }}>{k}</span>
                    <span style={{ fontSize:9, color:"#94A3B8", fontFamily:"'DM Mono',monospace" }}>{v}</span>
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
                <div key={i} style={{ marginBottom:10, padding:"9px 10px", background:"#F8F9FA", borderRadius:9, border:"1px solid #E5E7EB" }}>
                  <input value={row.decision} onChange={e => persist({ tradeoffs: tradeRows.map((r,j) => j===i ? {...r, decision:e.target.value} : r) })}
                    placeholder="Decision (e.g. Redirect type)" style={{ ...inp, fontWeight:700, marginBottom:6 }} />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:8, fontWeight:700, color:"#9CA3AF", marginBottom:2 }}>OPTION A</div>
                      <input value={row.optionA} onChange={e => persist({ tradeoffs: tradeRows.map((r,j) => j===i ? {...r, optionA:e.target.value} : r) })}
                        placeholder="e.g. 301" style={{ ...inp, fontSize:10 }} />
                    </div>
                    <div>
                      <div style={{ fontSize:8, fontWeight:700, color:"#9CA3AF", marginBottom:2 }}>OPTION B</div>
                      <input value={row.optionB} onChange={e => persist({ tradeoffs: tradeRows.map((r,j) => j===i ? {...r, optionB:e.target.value} : r) })}
                        placeholder="e.g. 302" style={{ ...inp, fontSize:10 }} />
                    </div>
                  </div>
                  <div style={{ fontSize:8, fontWeight:700, color:"#9CA3AF", marginBottom:2 }}>CHOSEN — WHY?</div>
                  <input value={row.chosen} onChange={e => persist({ tradeoffs: tradeRows.map((r,j) => j===i ? {...r, chosen:e.target.value} : r) })}
                    placeholder="I chose … because …" style={inp} />
                </div>
              ))}
              <button onClick={() => persist({ tradeoffs: [...tradeRows, { decision:"", optionA:"", optionB:"", chosen:"" }] })}
                style={{ width:"100%", padding:"5px 0", borderRadius:6, border:"1.5px dashed #D1D5DB", background:"transparent", fontSize:11, color:"#9CA3AF", cursor:"pointer", fontWeight:600 }}>+ Add decision</button>
            </div>
          )}
        </div>
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
    default:
      return CodeEditor
        ? <CodeWorkstation code={code} onCodeChange={onCodeChange} sandbox={moduleSandbox} domainKey={domainKey} CodeEditor={CodeEditor} />
        : <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:T.ink3 }}>No workstation available</div>
  }
}

export default WorkstationRouter
