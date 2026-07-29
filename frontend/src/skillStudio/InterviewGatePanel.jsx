/**
 * InterviewGatePanel — mock-interview generation grounded in the exact
 * module studied (spec §8). Behavioral-style scoring here is AI-rubric only
 * and explicitly does not move mastery/ELO — informs recruiter evidence only.
 */
import { useState } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, sectionLabel } from "./tokens"

export default function InterviewGatePanel({ moduleId, skillLabel, domainKey, onInterviewComplete }) {
  const [session, setSession] = useState(null)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  async function generate() {
    setLoading(true); setError(null)
    try {
      const { sessionId, questions } = await skillStudioV2Api.interviewGenerate({ moduleId, skillLabel, mode: "technical" })
      setSession({ id: sessionId, questions })
      setAnswers(new Array(questions.length).fill(""))
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  async function submit() {
    setLoading(true); setError(null)
    try {
      const scores = await skillStudioV2Api.interviewSubmit(session.id, { answers, skillLabel, domainKey })
      setResult(scores)
      onInterviewComplete?.(scores)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  if (result) {
    return (
      <div>
        <div style={{ ...sectionLabel, marginBottom: 10 }}>Interview Recorded</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: D.text1 }}>{result.scores?.overall ?? "—"}%</div>
        <div style={{ fontSize: 11, color: D.muted, marginTop: 4 }}>{result.feedback}</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div>
        <div style={{ ...sectionLabel, marginBottom: 10 }}>Interview Prep</div>
        <button onClick={generate} disabled={loading} style={primaryBtn}>
          {loading ? "Generating…" : `Generate mock interview for ${skillLabel}`}
        </button>
        {error && <div style={{ fontSize: 11, color: D.rose, marginTop: 8 }}>{error}</div>}
      </div>
    )
  }

  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 10 }}>Mock Interview — {skillLabel}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {session.questions.map((q, i) => (
          <div key={i}>
            <div style={{ fontSize: 12, fontWeight: 700, color: D.text1, marginBottom: 4 }}>
              <span style={{ color: D.indigo, textTransform: "uppercase", fontSize: 9, fontWeight: 800 }}>{q.type}</span> — {q.prompt}
            </div>
            <textarea rows={2} value={answers[i]} onChange={(e) => {
              const next = [...answers]; next[i] = e.target.value; setAnswers(next)
            }} style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${D.border}`, fontFamily: "inherit", fontSize: 12 }} />
          </div>
        ))}
      </div>
      <button onClick={submit} disabled={loading} style={{ ...primaryBtn, marginTop: 12 }}>
        {loading ? "Submitting…" : "Submit interview"}
      </button>
      {error && <div style={{ fontSize: 11, color: D.rose, marginTop: 8 }}>{error}</div>}
    </div>
  )
}

const primaryBtn = {
  padding: "9px 18px", borderRadius: 10, border: "none", background: D.violet, color: "#fff",
  fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
}
