// DevOpsConsoleWorkstationV2.jsx — Arena V2, fourth role workspace (DevOps Engineer)
// ---------------------------------------------------------------------------
// A cloud/infrastructure console, deliberately nothing like the ML notebook,
// the Software IDE, or the SOC investigation desk: deployment/cluster status,
// a CI/CD pipeline panel, health checks, Terraform plan drift, a rollout
// history + incident timeline, and a safe, real-data kubectl-style command
// investigation terminal — the same "simulated is fine, must feel real"
// allowance the Cybersecurity workstation used, applied here to
// infrastructure operations instead of a SOC. There is no arbitrary code
// execution here on purpose, same reasoning as TerminalWorkstationV2: an
// on-call console is a constrained operations tool, not a general-purpose
// sandbox.
//
// Same layering discipline as every other workstation: only calls the
// `onSubmit` prop from ArenaV2ChallengeShell.jsx; never imports
// arenaV2Submission.js directly. Submission sends `answer` (the written
// incident report + remediation/rollback plan — rubricReview.js already
// accepts this as an alias for `code`, added in the Cybersecurity phase)
// plus `investigationLog` (the real command history, used by the AI
// reviewer as process evidence). This reuses rubricReview.js's existing
// generalized fields (answer/investigationLog/groundTruth/answerLabel) —
// this phase required ZERO backend code changes, only new content data.
//
// Center-panel-only component: the mission header, ticket box, prompt, and
// checklist all come from the shared ArenaV2WorkspaceShell (top bar / left
// brief panel / right mission-control panel). This component owns the
// console itself: cluster/deployment status, pipeline, health checks,
// Terraform drift, rollout history, incident timeline, the investigation
// terminal, the incident-report editor, and the Submit button.
//
// ANTI-PASTE RULE, same honesty note as the other three workstations: paste
// is blocked only on the incident-report textarea, not globally.
import { useCallback, useState } from "react"

const STATUS_COLOR = {
  Running: "#4ade80", Healthy: "#4ade80", Ready: "#4ade80", pass: "#4ade80",
  Pending: "#fbbf24", Degraded: "#fbbf24", pending: "#64748b",
  CrashLoopBackOff: "#f87171", Failed: "#f87171", Unhealthy: "#f87171", fail: "#f87171",
}

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || "#94a3b8"
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: `${color}22`, color, border: `1px solid ${color}55` }}>
      {status}
    </span>
  )
}

function DeploymentStatus({ deployments = [] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Deployments</div>
      <div style={{ overflow: "auto", border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["name", "namespace", "ready", "desired", "image", "status"].map((c) => (
                <th key={c} style={{ padding: "4px 6px", textAlign: "left", background: "#0f172a", borderBottom: "1px solid #334155" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deployments.map((d, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "3px 6px", fontWeight: 700, color: "#e2e8f0" }}>{d.name}</td>
                <td style={{ padding: "3px 6px", color: "#94a3b8" }}>{d.namespace}</td>
                <td style={{ padding: "3px 6px", color: d.ready < d.desired ? "#f87171" : "#4ade80" }}>{d.ready}/{d.desired}</td>
                <td style={{ padding: "3px 6px", color: "#94a3b8", fontFamily: "monospace" }}>{d.image}</td>
                <td style={{ padding: "3px 6px" }}><StatusBadge status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ClusterPods({ pods = [] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Cluster — Pods</div>
      <div style={{ overflow: "auto", maxHeight: 150, border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["pod", "status", "restarts", "node", "age"].map((c) => (
                <th key={c} style={{ padding: "4px 6px", textAlign: "left", background: "#0f172a", borderBottom: "1px solid #334155" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pods.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "3px 6px", fontFamily: "monospace" }}>{p.name}</td>
                <td style={{ padding: "3px 6px" }}><StatusBadge status={p.status} /></td>
                <td style={{ padding: "3px 6px", color: p.restarts > 3 ? "#f87171" : "#94a3b8" }}>{p.restarts}</td>
                <td style={{ padding: "3px 6px", color: "#94a3b8" }}>{p.node}</td>
                <td style={{ padding: "3px 6px", color: "#94a3b8" }}>{p.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PipelinePanel({ stages = [] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>CI/CD Pipeline</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {stages.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span style={{ color: STATUS_COLOR[s.status] || "#64748b", fontWeight: 700 }}>
              {s.status === "pass" ? "✓" : s.status === "fail" ? "✗" : "○"}
            </span>
            <span style={{ color: "#cbd5e1" }}>{s.stage}</span>
            {i < stages.length - 1 && <span style={{ color: "#334155" }}>→</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function HealthChecks({ checks = [] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Health Checks</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {checks.map((c, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 6px", background: "#0b1220", borderRadius: 4 }}>
            <span style={{ color: "#cbd5e1" }}>{c.type} · {c.target}</span>
            <span style={{ color: "#64748b" }}>{c.detail}</span>
            <StatusBadge status={c.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

function TerraformDrift({ resources = [] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Terraform Plan — Drift</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {resources.map((r, i) => (
          <div key={i} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 4, background: r.drift ? "rgba(248,113,113,0.08)" : "#0b1220", border: `1px solid ${r.drift ? "#7f1d1d" : "#1e293b"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "monospace", color: "#e2e8f0" }}>{r.resource}</span>
              {r.drift && <span style={{ color: "#f87171", fontWeight: 700 }}>DRIFT</span>}
            </div>
            {r.drift && (
              <div style={{ color: "#94a3b8", marginTop: 2 }}>
                planned: <span style={{ color: "#4ade80" }}>{r.planned}</span> · actual: <span style={{ color: "#f87171" }}>{r.actual}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function RolloutHistory({ history = [] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Rollout History</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {history.map((h, i) => (
          <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, padding: "4px 0", borderLeft: "2px solid #334155", paddingLeft: 10, marginLeft: 4 }}>
            <span style={{ color: "#64748b", fontFamily: "monospace" }}>rev {h.revision}</span>
            <span style={{ color: "#cbd5e1" }}>{h.image}</span>
            <StatusBadge status={h.status} />
          </div>
        ))}
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

// ── Real command interpreter over the mission's own seeded infra data ──────
// Not arbitrary code execution (see file header) — a fixed, safe kubectl/
// terraform-shaped command set that genuinely searches/filters the real
// deployments/pods/logs/events/drift data handed to this component.
function runCommand(raw, { deployments, pods, logs, events, terraformDrift, rolloutHistory }) {
  const [cmd, sub, ...rest] = raw.trim().split(/\s+/)
  const arg = rest.join(" ")
  const key = `${(cmd || "").toLowerCase()} ${(sub || "").toLowerCase()}`.trim()
  switch (key) {
    case "help":
    case "":
      return "Available commands: help, get pods, get deployments, get events, describe deployment <name>, logs <pod>, rollout history <name>, rollout status <name>, terraform plan, clear"
    case "get pods":
      return pods.map((p) => `${p.name}  ${p.status}  restarts=${p.restarts}  node=${p.node}  age=${p.age}`).join("\n") || "No pods."
    case "get deployments":
      return deployments.map((d) => `${d.name}  ${d.ready}/${d.desired}  ${d.image}  ${d.status}`).join("\n") || "No deployments."
    case "get events":
      return events.map((e) => `${e.time}  ${e.type}  ${e.reason}  ${e.object}: ${e.message}`).join("\n") || "No events."
    case "terraform plan":
      return terraformDrift.map((r) => r.drift ? `~ ${r.resource}  planned=${r.planned} actual=${r.actual}  [DRIFT]` : `  ${r.resource}  up to date`).join("\n") || "No resources tracked."
    case "clear":
      return "__CLEAR__"
    default:
      if (cmd?.toLowerCase() === "describe" && sub?.toLowerCase() === "deployment") {
        const name = rest.join(" ")
        const d = deployments.find((x) => x.name === name)
        return d ? `Name: ${d.name}\nNamespace: ${d.namespace}\nReady: ${d.ready}/${d.desired}\nImage: ${d.image}\nStatus: ${d.status}` : `deployment "${name}" not found`
      }
      if (cmd?.toLowerCase() === "logs") {
        const pod = sub || ""
        const rows = logs[pod] || []
        return rows.length ? rows.join("\n") : `No log entries for pod "${pod}". Try: ${Object.keys(logs).join(", ")}`
      }
      if (cmd?.toLowerCase() === "rollout" && sub?.toLowerCase() === "history") {
        return rolloutHistory.map((h) => `rev ${h.revision}  ${h.image}  ${h.status}  ${h.time}`).join("\n") || "No rollout history."
      }
      if (cmd?.toLowerCase() === "rollout" && sub?.toLowerCase() === "status") {
        const name = rest.join(" ")
        const d = deployments.find((x) => x.name === name)
        return d ? `deployment "${name}" — ${d.ready} of ${d.desired} updated replicas available (${d.status})` : `deployment "${name}" not found`
      }
      return `Unknown command "${raw}". Type "help" for the available command set.`
  }
}

/**
 * @param {{ challengeInstanceId: string, skill?: string, difficulty?: string,
 *           payload: { prompt?: string, ticket?: object, checklist?: string[],
 *                      acceptanceCriteria?: string[], deployments?: Array, pods?: Array,
 *                      pipeline?: Array, healthChecks?: Array, terraformDrift?: Array,
 *                      rolloutHistory?: Array, incidentTimeline?: Array, logs?: object,
 *                      events?: Array },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 */
export default function DevOpsConsoleWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const deployments = payload?.deployments || []
  const pods = payload?.pods || []
  const pipeline = payload?.pipeline || []
  const healthChecks = payload?.healthChecks || []
  const terraformDrift = payload?.terraformDrift || []
  const rolloutHistory = payload?.rolloutHistory || []
  const timeline = payload?.incidentTimeline || []
  const logs = payload?.logs || {}
  const events = payload?.events || []

  const [termHistory, setTermHistory] = useState([{ type: "system", text: "DevOps console ready. Type \"help\" for commands." }])
  const [termInput, setTermInput] = useState("")
  const [commandLog, setCommandLog] = useState([])
  const [report, setReport] = useState("")

  const runInterpreter = useCallback((line) => {
    if (!line.trim()) return
    const output = runCommand(line, { deployments, pods, logs, events, terraformDrift, rolloutHistory })
    setCommandLog((h) => [...h, line])
    if (output === "__CLEAR__") {
      setTermHistory([])
      return
    }
    setTermHistory((h) => [...h, { type: "input", text: `$ ${line}` }, { type: "output", text: output }])
  }, [deployments, pods, logs, events, terraformDrift, rolloutHistory])

  const onTermKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      runInterpreter(termInput)
      setTermInput("")
    }
  }

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const handleSubmit = useCallback(() => {
    if (!report.trim() || isSubmitting) return
    onSubmit?.({ answer: report, investigationLog: commandLog })
  }, [report, commandLog, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, padding: 16 }}>
      <DeploymentStatus deployments={deployments} />
      <ClusterPods pods={pods} />
      <PipelinePanel stages={pipeline} />
      <HealthChecks checks={healthChecks} />
      <TerraformDrift resources={terraformDrift} />
      <RolloutHistory history={rolloutHistory} />
      <IncidentTimeline timeline={timeline} />

      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Console (simulated, real cluster data — safe command set)</div>
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
              placeholder="type a command, e.g. describe deployment checkout-service"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontFamily: "monospace", fontSize: 12 }}
            />
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          Incident report (paste disabled in this pilot editor) — root cause, fix, and rollback/remediation plan
        </div>
        <textarea
          value={report}
          onChange={(e) => setReport(e.target.value)}
          onPaste={blockPaste}
          onDrop={blockPaste}
          placeholder="e.g. checkout-service rev 14 is CrashLoopBackOff because the new configmap dropped DB_POOL_SIZE, causing the pool init to throw on boot. Recommend: roll back to rev 13 immediately, fix the configmap key, redeploy behind a canary…"
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
        Every console command genuinely queries this mission&apos;s real deployment/pod/log/event/Terraform-plan data —
        nothing is a canned response. Your full command history is sent with your report as investigation evidence
        for the AI Reviewer, and Submit posts a real ELO update.
      </div>
    </div>
  )
}
