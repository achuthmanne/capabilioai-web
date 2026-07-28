// TerminalWorkstationV2.jsx — Arena V2, third role workspace (Cybersecurity / SOC Analyst)
// ---------------------------------------------------------------------------
// A SOC investigation desk, deliberately nothing like the ML notebook or the
// Software IDE: SIEM alert queue, log analyzer, PCAP viewer, incident
// timeline, MITRE ATT&CK mapping, and a simulated (per the spec's own
// allowance for this workstation — "can be simulated if needed, but must
// feel real") Kali-style terminal that runs a small, safe command set for
// real over the mission's actual seeded alerts/logs/PCAP/IOC data. Unlike
// NotebookWorkstationV2 (Pyodide) or CodeWorkstationV2 (Web Worker JS
// execution), there is no arbitrary code execution here on purpose — a
// security lab's terminal is a constrained investigation tool, not a
// general-purpose sandbox, and the spec explicitly scopes it to
// "mission-relevant commands only."
//
// Same layering discipline as every other workstation: only calls the
// `onSubmit` prop from ArenaV2ChallengeShell.jsx; never imports
// arenaV2Submission.js directly. Submission sends `answer` (the written
// incident report — rubricReview.js accepts this as an alias for `code`)
// plus `investigationLog` (the real terminal command history, used by the
// AI reviewer as process evidence — see rubricReview.js's additive support
// for both).
//
// ANTI-PASTE RULE, same honesty note as the other two workstations: paste is
// blocked only on the incident-report textarea, not globally.
import { useCallback, useMemo, useState } from "react"

const SEVERITY_COLOR = { Critical: "#f87171", High: "#fb923c", Medium: "#fbbf24", Low: "#60a5fa", Informational: "#94a3b8" }

function SeverityBadge({ severity }) {
  const color = SEVERITY_COLOR[severity] || "#94a3b8"
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: `${color}22`, color, border: `1px solid ${color}55` }}>
      {severity}
    </span>
  )
}

function SiemDashboard({ alerts = [] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>SIEM — Alert Queue</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {alerts.map((a) => (
          <div key={a.id} style={{ padding: 8, borderRadius: 6, background: "#0b1220", border: "1px solid #1e293b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }}>{a.id}</span>
              <SeverityBadge severity={a.severity} />
            </div>
            <div style={{ fontSize: 12, color: "#e2e8f0", marginBottom: 2 }}>{a.summary}</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>{a.timestamp} · src {a.sourceIp} · {a.status}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LogAnalyzer({ logs = {} }) {
  const sources = Object.keys(logs)
  const [source, setSource] = useState(sources[0] || "auth")
  const [filter, setFilter] = useState("")
  const rows = (logs[source] || []).filter((r) => !filter.trim() || JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()))
  const cols = rows.length ? Object.keys(rows[0]) : []

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>Log Analyzer</div>
        <div style={{ display: "flex", gap: 6 }}>
          {sources.map((s) => (
            <button key={s} onClick={() => setSource(s)} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: s === source ? "#1e293b" : "transparent", color: s === source ? "#e2e8f0" : "#64748b", border: "1px solid #334155" }}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by IP, user, event type…"
        style={{ width: "100%", fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "#0b1220", border: "1px solid #1e293b", color: "#e2e8f0", marginBottom: 6 }}
      />
      <div style={{ overflow: "auto", maxHeight: 180, border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>{cols.map((c) => <th key={c} style={{ padding: "4px 6px", textAlign: "left", background: "#0f172a", borderBottom: "1px solid #334155" }}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                {cols.map((c) => (
                  <td key={c} style={{ padding: "3px 6px", color: r.result === "failed" ? "#f87171" : undefined }}>{String(r[c])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div style={{ fontSize: 11, color: "#64748b", padding: 8 }}>No matching entries.</div>}
      </div>
    </div>
  )
}

function PcapViewer({ pcap = [] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>PCAP — Packet Summary</div>
      <div style={{ overflow: "auto", maxHeight: 150, border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["time", "srcIp", "dstIp", "proto", "port", "flag", "note"].map((c) => (
                <th key={c} style={{ padding: "4px 6px", textAlign: "left", background: "#0f172a", borderBottom: "1px solid #334155" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pcap.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "3px 6px" }}>{p.time}</td>
                <td style={{ padding: "3px 6px" }}>{p.srcIp}</td>
                <td style={{ padding: "3px 6px" }}>{p.dstIp}</td>
                <td style={{ padding: "3px 6px" }}>{p.proto}</td>
                <td style={{ padding: "3px 6px" }}>{p.port}</td>
                <td style={{ padding: "3px 6px", color: "#fbbf24" }}>{p.flag}</td>
                <td style={{ padding: "3px 6px", color: "#94a3b8" }}>{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function IncidentTimeline({ timeline = [] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Incident Timeline</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {timeline.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, padding: "4px 0", borderLeft: "2px solid #334155", paddingLeft: 10, marginLeft: 4 }}>
            <span style={{ color: "#64748b", fontFamily: "monospace" }}>{t.time}</span>
            <span style={{ color: "#cbd5e1" }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MitreMapping({ techniques = [], selected, onToggle }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>MITRE ATT&CK Mapping</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {techniques.map((t) => (
          <label key={t.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, cursor: "pointer" }}>
            <input type="checkbox" checked={selected.includes(t.id)} onChange={() => onToggle(t.id)} />
            <span style={{ fontFamily: "monospace", color: "#93c5fd" }}>{t.id}</span>
            <span style={{ color: "#cbd5e1" }}>{t.name}</span>
            <span style={{ color: "#64748b" }}>({t.tactic})</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Real command interpreter over the mission's own seeded data ────────────
// Not arbitrary code execution (see file header) — a fixed, safe command set
// that genuinely searches/filters the real alerts/logs/PCAP/IOC data handed
// to this component, exactly as a constrained SOC terminal would.
function runCommand(raw, { alerts, logs, pcap, iocDatabase, mitreReference, timeline }) {
  const [cmd, ...rest] = raw.trim().split(/\s+/)
  const arg = rest.join(" ")
  switch ((cmd || "").toLowerCase()) {
    case "help":
      return "Available commands: help, alerts, logs <auth|web> [filter], grep <term>, pcap, ioc <ip>, mitre [id], timeline, clear"
    case "alerts":
      return alerts.map((a) => `${a.id} [${a.severity}] ${a.summary} (src ${a.sourceIp}, ${a.status})`).join("\n") || "No alerts."
    case "logs": {
      const [src, ...filterParts] = rest
      const filter = filterParts.join(" ").toLowerCase()
      const rows = (logs[src] || [])
      if (!rows.length) return `No log source named "${src}". Try: ${Object.keys(logs).join(", ")}`
      const filtered = filter ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(filter)) : rows
      return filtered.map((r) => JSON.stringify(r)).join("\n") || "No matching entries."
    }
    case "grep": {
      if (!arg) return "usage: grep <term>"
      const term = arg.toLowerCase()
      const hits = []
      for (const [src, rows] of Object.entries(logs)) {
        for (const r of rows) if (JSON.stringify(r).toLowerCase().includes(term)) hits.push(`[${src}] ${JSON.stringify(r)}`)
      }
      for (const a of alerts) if (JSON.stringify(a).toLowerCase().includes(term)) hits.push(`[alert] ${a.id}: ${a.summary}`)
      return hits.length ? hits.join("\n") : `No matches for "${arg}".`
    }
    case "pcap":
      return pcap.map((p) => `${p.time} ${p.srcIp} -> ${p.dstIp} ${p.proto}:${p.port} [${p.flag}] ${p.note}`).join("\n") || "No PCAP data."
    case "ioc": {
      if (!arg) return "usage: ioc <ip>"
      const hit = iocDatabase.find((e) => e.ip === arg)
      return hit ? `${hit.ip} — ${hit.verdict}. ${hit.notes}` : `${arg} — not found in IOC database (no threat-intel match).`
    }
    case "mitre": {
      if (!arg) return mitreReference.map((t) => `${t.id} — ${t.name} (${t.tactic})`).join("\n")
      const hit = mitreReference.find((t) => t.id.toLowerCase() === arg.toLowerCase())
      return hit ? `${hit.id} — ${hit.name} (${hit.tactic})` : `Unknown technique id "${arg}".`
    }
    case "timeline":
      return timeline.map((t) => `${t.time} — ${t.label}`).join("\n") || "No timeline events."
    case "clear":
      return "__CLEAR__"
    case "":
      return ""
    default:
      return `Unknown command "${cmd}". Type "help" for the available command set.`
  }
}

/**
 * @param {{ challengeInstanceId: string, skill?: string, difficulty?: string,
 *           payload: { prompt?: string, ticket?: object, checklist?: string[],
 *                      acceptanceCriteria?: string[], alerts?: Array, logs?: object,
 *                      pcap?: Array, iocDatabase?: Array, mitreReference?: Array,
 *                      incidentTimeline?: Array },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 *
 * Center-panel-only component — the mission header, ticket box, and prompt
 * that used to live here now come from the shared ArenaV2WorkspaceShell.
 * This component owns the SOC desk itself: SIEM/logs/PCAP/timeline/MITRE,
 * the terminal, the incident-report editor, and the Submit button
 * (assembling `{answer, investigationLog}` is domain logic that stays here).
 */
export default function TerminalWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const alerts = payload?.alerts || []
  const logs = payload?.logs || {}
  const pcap = payload?.pcap || []
  const iocDatabase = payload?.iocDatabase || []
  const mitreReference = payload?.mitreReference || []
  const timeline = payload?.incidentTimeline || []

  const [termHistory, setTermHistory] = useState([{ type: "system", text: "SOC terminal ready. Type \"help\" for commands." }])
  const [termInput, setTermInput] = useState("")
  const [commandLog, setCommandLog] = useState([])
  const [selectedMitre, setSelectedMitre] = useState([])
  const [report, setReport] = useState("")

  const runInterpreter = useCallback((line) => {
    if (!line.trim()) return
    const output = runCommand(line, { alerts, logs, pcap, iocDatabase, mitreReference, timeline })
    setCommandLog((h) => [...h, line])
    if (output === "__CLEAR__") {
      setTermHistory([])
      return
    }
    setTermHistory((h) => [...h, { type: "input", text: `$ ${line}` }, { type: "output", text: output }])
  }, [alerts, logs, pcap, iocDatabase, mitreReference, timeline])

  const onTermKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      runInterpreter(termInput)
      setTermInput("")
    }
  }

  const toggleMitre = useCallback((id) => {
    setSelectedMitre((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }, [])

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const handleSubmit = useCallback(() => {
    if (!report.trim() || isSubmitting) return
    const mitreLine = selectedMitre.length ? `\n\nMITRE ATT&CK techniques mapped: ${selectedMitre.join(", ")}` : ""
    onSubmit?.({
      answer: report + mitreLine,
      investigationLog: commandLog,
    })
  }, [report, selectedMitre, commandLog, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, padding: 16 }}>
        <SiemDashboard alerts={alerts} />
        <LogAnalyzer logs={logs} />
        <PcapViewer pcap={pcap} />
        <IncidentTimeline timeline={timeline} />
        <MitreMapping techniques={mitreReference} selected={selectedMitre} onToggle={toggleMitre} />

        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Terminal (simulated, real data — safe command set)</div>
          <div style={{ background: "#000", borderRadius: 8, border: "1px solid #1e293b", padding: 10, fontFamily: "monospace", fontSize: 12 }}>
            <div style={{ maxHeight: 180, overflow: "auto", marginBottom: 6 }}>
              {termHistory.map((line, i) => (
                <div key={i} style={{ whiteSpace: "pre-wrap", color: line.type === "input" ? "#4ade80" : line.type === "system" ? "#64748b" : "#e2e8f0" }}>
                  {line.text}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ color: "#4ade80" }}>$</span>
              <input
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                onKeyDown={onTermKeyDown}
                placeholder="type a command, e.g. grep 203.0.113.77"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontFamily: "monospace", fontSize: 12 }}
              />
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
            Incident report (paste disabled in this pilot editor) — findings, MITRE mapping, and remediation
          </div>
          <textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            onPaste={blockPaste}
            onDrop={blockPaste}
            placeholder="e.g. 203.0.113.77 conducted a brute-force attack against admin@northwind.com, succeeding after 12 attempts, then exfiltrated billing data. Recommend: reset the account, block the IP, enforce MFA…"
            style={{ width: "100%", minHeight: 140, fontSize: 13, padding: 10, borderRadius: 8, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b" }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!report.trim() || isSubmitting}
          style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700, background: "#4ade80", color: "#0f172a", border: "none", alignSelf: "flex-start" }}
        >
          {isSubmitting ? "Submitting for AI review…" : "Submit Incident Report for AI Review"}
        </button>

        <div style={{ fontSize: 12, color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: 10 }}>
          Every terminal command genuinely searches this mission&apos;s real alert/log/PCAP/IOC data — nothing is a
          canned response. Your full command history is sent with your report as investigation evidence for the AI
          Reviewer, and Submit posts a real ELO update.
        </div>
    </div>
  )
}
