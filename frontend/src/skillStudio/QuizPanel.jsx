/**
 * QuizPanel — adaptive quiz UI. Deterministic types (mcq/fill_blank) are
 * scored server-side with zero AI involvement in pass/fail (spec §22);
 * this component just renders whatever question shape comes back and
 * submits the answer, it never scores anything itself.
 */
import { useState, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, sectionLabel } from "./tokens"

const QUESTIONS_PER_SESSION = 3

export default function QuizPanel({ skillGraphNodeId, skillLabel, moduleId, onSessionComplete }) {
  const [sessionId, setSessionId] = useState(null)
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState("")
  const [feedback, setFeedback] = useState(null)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const start = useCallback(async () => {
    setLoading(true); setError(null); setFeedback(null)
    try {
      const { sessionId, firstQuestion } = await skillStudioV2Api.quizStart({ skillGraphNodeId, skillLabel, moduleId })
      setSessionId(sessionId); setQuestion(firstQuestion); setAnswer("")
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [skillGraphNodeId, skillLabel, moduleId])

  async function submit() {
    if (!answer) return
    setLoading(true)
    try {
      const result = await skillStudioV2Api.quizAnswer(sessionId, { questionId: question.id, answer, skillGraphNodeId })
      setFeedback(result)
      const nextAnswered = answeredCount + 1
      const nextCorrect = correctCount + (result.correct ? 1 : 0)
      setAnsweredCount(nextAnswered); setCorrectCount(nextCorrect)

      if (nextAnswered >= QUESTIONS_PER_SESSION) {
        const score = Math.round((nextCorrect / nextAnswered) * 100)
        onSessionComplete?.({ score, passed: score >= 70 })
      } else {
        const { firstQuestion } = await skillStudioV2Api.quizStart({ skillGraphNodeId, skillLabel, moduleId })
        setQuestion(firstQuestion); setAnswer("")
      }
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  if (!sessionId) {
    return (
      <div>
        <div style={{ ...sectionLabel, marginBottom: 10 }}>Adaptive Quiz</div>
        <button onClick={start} disabled={loading} style={primaryBtn}>
          {loading ? "Preparing…" : `Start ${QUESTIONS_PER_SESSION}-question check`}
        </button>
        {error && <div style={{ fontSize: 11, color: D.rose, marginTop: 8 }}>{error}</div>}
      </div>
    )
  }

  if (answeredCount >= QUESTIONS_PER_SESSION) {
    const score = Math.round((correctCount / answeredCount) * 100)
    return (
      <div>
        <div style={{ ...sectionLabel, marginBottom: 10 }}>Quiz Complete</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: score >= 70 ? D.emerald : D.rose }}>{score}%</div>
        <div style={{ fontSize: 11, color: D.muted, marginTop: 4 }}>{correctCount}/{answeredCount} correct</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={sectionLabel}>Question {answeredCount + 1} of {QUESTIONS_PER_SESSION}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: D.text1, marginBottom: 10 }}>{question?.prompt}</div>

      {question?.options ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {question.options.map((opt) => (
            <button key={opt} onClick={() => setAnswer(opt)} style={{
              textAlign: "left", padding: "8px 12px", borderRadius: 10,
              border: `1px solid ${answer === opt ? D.indigo : D.border}`,
              background: answer === opt ? D.indigo + "15" : D.glass, cursor: "pointer", fontFamily: "inherit", fontSize: 12,
            }}>{opt}</button>
          ))}
        </div>
      ) : (
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${D.border}`, fontFamily: "inherit", fontSize: 12, marginBottom: 10 }} />
      )}

      {feedback && (
        <div style={{ fontSize: 11, color: feedback.correct ? D.emerald : D.rose, marginBottom: 8 }}>
          {feedback.correct ? "Correct." : "Not quite."} {feedback.explanation}
        </div>
      )}

      <button onClick={submit} disabled={loading || !answer} style={primaryBtn}>
        {loading ? "Scoring…" : "Submit answer"}
      </button>
      {error && <div style={{ fontSize: 11, color: D.rose, marginTop: 8 }}>{error}</div>}
    </div>
  )
}

const primaryBtn = {
  padding: "8px 16px", borderRadius: 10, border: "none", background: D.indigo, color: "#fff",
  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
}
