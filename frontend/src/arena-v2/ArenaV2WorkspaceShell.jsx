// ArenaV2WorkspaceShell.jsx — Arena V2, shared mission-workspace chrome
// ---------------------------------------------------------------------------
// Extracted after the third role workspace (Cybersecurity Analyst) shipped
// and made the duplication impossible to ignore: NotebookWorkstationV2.jsx,
// CodeWorkstationV2.jsx, and TerminalWorkstationV2.jsx each independently
// re-implemented the same header line ("Skill: X · Difficulty: Y ·
// Resuming…"), the same ticket badge, the same prompt box, a byte-for-byte
// (ML/SWE) or near-identical (Cyber) MissionChecklist, and the same AI
// review / rewards / skills-radar / recruiter-link chrome that used to live
// partly in ArenaV2ChallengeShell.jsx's FeedbackPanel and partly in
// RolePilotShell.jsx's own SkillsRadar fetch. This file is the single home
// for all of that now.
//
// SCOPE DECISION, stated explicitly rather than left implicit: the Submit
// button and the paste-blocked answer editor(s) stay inside each
// workstation component, not here. Per the instruction, "the shell should
// provide the editor hook/boundary, but the specific editor implementation
// remains in the role workspace" — and the exact shape of "what counts as a
// valid, submittable answer" genuinely differs per role (SWE folds in real
// test results, Cyber folds in the MITRE selection and investigation log,
// ML is just code+notes). Moving that assembly logic into this shell would
// mean re-touching three already-tested submission call sites in one pass
// for a purely cosmetic win — the header/checklist/review/evidence chrome
// below is where the real duplication was, and extracting only that keeps
// this refactor additive and low-risk rather than a rewrite.
//
// This shell owns:
//   - the top mission bar (role/skill/difficulty/resumed/timer/status),
//   - the left brief panel (ticket + prompt),
//   - the right mission-control panel (checklist/acceptance criteria +,
//     once graded, the AI review summary),
//   - the bottom evidence area (rewards, the graded-criteria table, the
//     Career Skills radar, and the recruiter-evidence link).
// It does NOT own the center panel — that is always `children`, supplied
// by ArenaV2ChallengeShell.jsx as whichever workstation component matches
// the issued challenge's componentKey. This shell never branches on role or
// componentKey itself, matching the same discipline as the backend's
// Workstation Router (router.js) never branching on role.
import { useEffect, useState } from "react"
import { fetchSkillGraph, fetchMyProgress } from "../api/arenaV2Library.js"
import { formatEloDelta } from "./evidenceFormatting.js"
import ArenaCopilotPanel from "./ArenaCopilotPanel.jsx"

const STATUS_BADGE = {
  idle: { label: "In progress", color: "#94a3b8" },
  submitting: { label: "Grading…", color: "#fbbf24" },
  done: { label: "Graded", color: "#4ade80" },
  error: { label: "Submission failed", color: "#f87171" },
}

// Honest bucketing of the real finalScore into a label — a deterministic
// function of a real number, not a fabricated category. Thresholds match
// the same "Excellent/Good/Fair/Needs work" language already used in
// ArenaV2RecruiterView.jsx for consistency.
function scoreLabel(score) {
  if (score >= 90) return { label: "Excellent", color: "#4ade80" }
  if (score >= 75) return { label: "Good", color: "#60a5fa" }
  if (score >= 60) return { label: "Fair", color: "#fbbf24" }
  return { label: "Needs work", color: "#f87171" }
}

function ScoreRing({ score }) {
  const sl = scoreLabel(score)
  const pct = Math.max(0, Math.min(100, score))
  const circumference = 2 * Math.PI * 34
  const offset = circumference * (1 - pct / 100)
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="40" cy="40" r="34" fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle cx="40" cy="40" r="34" fill="none" stroke={sl.color} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#e2e8f0" }}>
          {score}
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: sl.color }}>{sl.label}</div>
    </div>
  )
}

function fmtClock(iso) {
  if (!iso) return null
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) } catch { return null }
}

// Real events only — no fabricated "data loaded" / "feature engineering
// completed" steps, since this shell has no signal for those. Extending
// this to a richer timeline needs real lifecycle events emitted by the
// workstation/backend first (tracked separately, not faked here).
function MissionTimeline({ dto, submissionState }) {
  const started = fmtClock(dto?.startedAt)
  const graded = submissionState.status === "done" ? fmtClock(submissionState.feedback?.gradedAt) : null
  if (!started) return null
  return (
    <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Proof timeline</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12 }}>
          <span style={{ color: "#64748b", fontFamily: "monospace", minWidth: 52 }}>{started}</span>
          <span style={{ color: "#cbd5e1" }}>Mission started</span>
        </div>
        {submissionState.status === "submitting" && (
          <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12 }}>
            <span style={{ color: "#64748b", fontFamily: "monospace", minWidth: 52 }}>now</span>
            <span style={{ color: "#fbbf24" }}>Submitted — AI grading in progress…</span>
          </div>
        )}
        {graded && (
          <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12 }}>
            <span style={{ color: "#64748b", fontFamily: "monospace", minWidth: 52 }}>{graded}</span>
            <span style={{ color: "#4ade80" }}>Graded — score recorded</span>
          </div>
        )}
      </div>
    </div>
  )
}

function useElapsedTimer(startedAt, stoppedAt) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (stoppedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [stoppedAt])
  if (!startedAt) return null
  const end = stoppedAt ? new Date(stoppedAt).getTime() : now
  const secs = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000))
  const m = Math.floor(secs / 60), s = secs % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function TopMissionBar({ role, skill, difficulty, resumed, dto, submissionState }) {
  const graded = submissionState.status === "done"
  const elapsed = useElapsedTimer(dto?.startedAt, graded ? submissionState.feedback?.gradedAt : null)
  const badge = STATUS_BADGE[submissionState.status] || STATUS_BADGE.idle
  const eloDelta = submissionState.feedback?.rewards?.elo?.delta

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #1e293b", flexWrap: "wrap", gap: 8 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12, color: "#94a3b8" }}>
        {role && <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{role}</span>}
        {skill && <span>{skill}</span>}
        {difficulty && <span>{difficulty}</span>}
        {resumed && <span style={{ color: "#60a5fa" }}>Resuming your in-progress attempt</span>}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12 }}>
        {elapsed && <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>⏱ {elapsed}</span>}
        {typeof eloDelta === "number" && (
          <span style={{ color: eloDelta >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>{formatEloDelta(eloDelta)} ELO</span>
        )}
        <span style={{ padding: "2px 8px", borderRadius: 999, background: `${badge.color}22`, color: badge.color, fontWeight: 700 }}>{badge.label}</span>
      </div>
    </div>
  )
}

function LeftBriefPanel({ ticket, prompt }) {
  if (!ticket && !prompt) return null
  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {ticket && (
        <div style={{ padding: 10, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: 0.5, marginBottom: 4 }}>COMPANY TICKET</div>
          <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{ticket.id}</div>
          <div style={{ color: "#94a3b8", marginTop: 2 }}>{ticket.title}</div>
          {ticket.priority && (
            <div style={{ marginTop: 6, display: "inline-block", color: "#fbbf24", background: "#78350f33", fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 999 }}>{ticket.priority}</div>
          )}
        </div>
      )}
      {prompt && (
        <div style={{ padding: 12, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 13, lineHeight: 1.5, color: "#cbd5e1" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: 0.5, marginBottom: 6 }}>PROBLEM STATEMENT</div>
          {prompt}
        </div>
      )}
    </div>
  )
}

function MissionControlPanel({ checklist = [], acceptanceCriteria = [], submissionState }) {
  const fb = submissionState.status === "done" ? submissionState.feedback : null
  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 14 }}>
      {checklist.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>Mission checklist</div>
            {fb?.passed && <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>{checklist.length}/{checklist.length}</span>}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 12, color: "#cbd5e1", display: "flex", flexDirection: "column", gap: 5 }}>
            {checklist.map((c, i) => (
              <li key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                {/* Only the overall pass/fail is a real signal — no per-item
                    completion exists in the payload, so every item shows
                    the same real state rather than fabricating which
                    specific step is "done". */}
                <span style={{ color: fb?.passed ? "#4ade80" : "#475569", flexShrink: 0 }}>{fb?.passed ? "✓" : "○"}</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {acceptanceCriteria.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Acceptance criteria</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4 }}>
            {acceptanceCriteria.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {submissionState.status === "submitting" && (
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Grading your submission…</div>
      )}
      {submissionState.status === "error" && (
        <div style={{ fontSize: 12, color: "#f87171" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Couldn&apos;t submit your attempt</div>
          {submissionState.error?.message}
        </div>
      )}

      {fb && (
        <div>
          {typeof fb.finalScore === "number" && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <ScoreRing score={fb.finalScore} />
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontWeight: 700, color: fb.passed ? "#4ade80" : "#f87171" }}>
              {fb.passed ? "✓ Passed" : "✗ Not yet"}
              {fb.isZeroEffort ? " (capped — late)" : ""}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 8 }}>{fb.feedback?.summary}</div>
          {fb.aiReview && (
            <div style={{ padding: 10, background: "#0f172a", borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
                AI Reviewer
                {fb.aiReview.recruiterReadiness && (
                  <span style={{ marginLeft: 8, fontWeight: 600, color: "#4ade80" }}>· {fb.aiReview.recruiterReadiness}</span>
                )}
              </div>
              {fb.aiReview.taskQuality && <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>{fb.aiReview.taskQuality}</div>}
              {fb.aiReview.strengths?.length > 0 && (
                <div style={{ fontSize: 12, marginBottom: 6 }}>
                  <div style={{ color: "#94a3b8" }}>Strengths</div>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 16, color: "#4ade80" }}>
                    {fb.aiReview.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {fb.aiReview.suggestions?.length > 0 && (
                <div style={{ fontSize: 12 }}>
                  {/* "Growth Areas" — kept identical to ArenaV2RecruiterView.jsx's
                      EvidenceCard heading for the same field (submissions
                      -> AI review -> suggestions). Previously said
                      "Suggestions" here and "Growth areas" there, the same
                      data under two different labels; unified during the
                      final consolidation pass. */}
                  <div style={{ color: "#94a3b8" }}>Growth Areas</div>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 16, color: "#fbbf24" }}>
                    {fb.aiReview.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SkillsRadar({ role, careerFamily, refetchToken }) {
  const [graph, setGraph] = useState(null)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!role) return
    let alive = true
    setError(null)
    Promise.all([fetchSkillGraph(role, careerFamily), fetchMyProgress({ role, careerFamily })])
      .then(([g, p]) => { if (alive) { setGraph(g); setProgress(p) } })
      .catch((e) => { if (alive) setError(e) })
    return () => { alive = false }
  }, [role, careerFamily, refetchToken])

  if (!role) return null
  if (error) return <div style={{ fontSize: 12, color: "#f87171" }}>Couldn&apos;t load skill graph: {error.message}</div>
  if (!graph) return <div style={{ fontSize: 12, color: "#94a3b8" }}>Loading Career Skills…</div>

  const bySkill = Object.fromEntries((progress?.skillProgress || []).map((s) => [s.skill, s]))

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Career Skills — {role} (ELO: {progress?.elo ?? "Not yet rated"})</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(graph.graph?.nodes || []).map((skillName) => {
          const p = bySkill[skillName]
          const state = p?.mastery_state || "unattempted"
          const color = state === "mastered" ? "#4ade80" : state === "proficient" ? "#60a5fa" : state === "unattempted" ? "#475569" : "#fbbf24"
          return (
            <span key={skillName} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: "#0f172a", border: `1px solid ${color}55`, color }}>
              {skillName}{p ? ` · ${state}` : ""}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function BottomEvidenceArea({ dto, submissionState, role, careerFamily, userId, onViewRecruiterEvidence }) {
  const fb = submissionState.status === "done" ? submissionState.feedback : null
  const payload = dto?.payload || {}
  return (
    <div style={{ padding: 12, borderTop: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <ArenaCopilotPanel role={role} skill={dto?.skill} payload={{ ticket: payload.ticket, prompt: payload.prompt, checklist: payload.checklist, datasetSchemaDescription: payload.datasetSchemaDescription }} />
        <MissionTimeline dto={dto} submissionState={submissionState} />
      </div>
      {fb?.rewards && (
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          {fb.rewards.type === "elo" && fb.rewards.elo && (
            <span>ELO {fb.rewards.elo.before} → {fb.rewards.elo.after} ({formatEloDelta(fb.rewards.elo.delta)}) </span>
          )}
          {fb.rewards.skill && <span>· Skill: {fb.rewards.skill.masteryState} (best {fb.rewards.skill.bestScore})</span>}
          {fb.portfolio && <span>· Portfolio: {fb.portfolio.artifactCreated ? (fb.portfolio.publishState || "recorded") : fb.portfolio.decisionType}</span>}
        </div>
      )}
      {fb?.feedback?.detail?.length > 0 && (
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <tbody>
            {fb.feedback.detail.map((d, i) => (
              <tr key={i} style={{ borderTop: "1px solid #1e293b" }}>
                <td style={{ padding: "4px 6px", color: d.passed ? "#4ade80" : "#f87171" }}>{d.passed ? "✓" : "✗"}</td>
                <td style={{ padding: "4px 6px" }}>{d.metric}</td>
                <td style={{ padding: "4px 6px", color: "#94a3b8" }}>expected {String(d.expected)}</td>
                <td style={{ padding: "4px 6px", color: "#94a3b8" }}>{String(d.actual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <SkillsRadar role={role} careerFamily={careerFamily} refetchToken={fb ? fb.submissionId : null} />
      {userId && onViewRecruiterEvidence && (
        <button
          onClick={() => onViewRecruiterEvidence(userId)}
          style={{ fontSize: 12, color: "#60a5fa", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", padding: 0, alignSelf: "flex-start" }}
        >
          View how recruiters see this proof →
        </button>
      )}
    </div>
  )
}

/**
 * @param {{ dto: object, submissionState: object, role?: string, careerFamily?: string,
 *           userId?: string, onViewRecruiterEvidence?: (userId: string) => void,
 *           children: React.ReactNode }} props
 *   `children` is always the resolved workstation component for `dto.componentKey`
 *   — this shell never decides which one to render, that stays
 *   ArenaV2ChallengeShell.jsx's job (unchanged).
 */
export default function ArenaV2WorkspaceShell({ dto, submissionState, role, careerFamily = "IT", userId, onViewRecruiterEvidence, children }) {
  const payload = dto?.payload || {}
  return (
    <div>
      <TopMissionBar role={role} skill={dto?.skill} difficulty={dto?.difficulty} resumed={dto?.resumed} dto={dto} submissionState={submissionState} />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 300px", gap: 0 }}>
        <div style={{ borderRight: "1px solid #1e293b" }}>
          <LeftBriefPanel ticket={payload.ticket} prompt={payload.prompt} />
        </div>
        <div style={{ minWidth: 0 }}>{children}</div>
        <div style={{ borderLeft: "1px solid #1e293b" }}>
          <MissionControlPanel checklist={payload.checklist} acceptanceCriteria={payload.acceptanceCriteria} submissionState={submissionState} />
        </div>
      </div>
      <BottomEvidenceArea dto={dto} submissionState={submissionState} role={role} careerFamily={careerFamily} userId={userId} onViewRecruiterEvidence={onViewRecruiterEvidence} />
    </div>
  )
}
