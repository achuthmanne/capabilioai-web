/**
 * WeeklyCareerCheck.jsx — "Weekly Career Check" (Weekly Refresh Engine, frontend)
 *
 * NAMING RULE (product requirement): never say "assessment" anywhere in this
 * file's copy. Use "Career Check", "Skill Pulse", "5-minute refresh". Backend
 * routes/tables use "weekly_pulse" internally — that's fine, it's not
 * user-facing. See backend/server/routes/weeklyPulse.js header for full
 * rationale (confidence-feedback caps, anti-repetition, etc).
 *
 * Mobile-first: one question at a time, big tap targets, immediate feedback,
 * short — designed to be finished in under a minute on a phone.
 */
import { useEffect, useState } from "react"
import { weeklyCheckApi } from "../lib/api"

const P    = "#8B5CF6"
const INK  = "#1A1714"
const INK2 = "#3D3935"
const MUT  = "#6B6560"
const BG   = "#FAFAFA"
const SURF = "#FFFFFF"
const CELL = "#FAFAF8"
const BDR  = "rgba(17,24,39,0.08)"
const GOOD = "#16A34A"
const BAD  = "#DC2626"
const MONO = "'DM Mono', 'Fira Mono', monospace"
const SERIF= "'DM Sans', Georgia, serif"
const BODY = "DM Sans, system-ui, sans-serif"

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240 }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${P}22`, borderTopColor: P, borderRadius: "50%", animation: "wcc-spin 0.8s linear infinite" }} />
      <style>{`@keyframes wcc-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ProgressDots({ total, current }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 18 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 22 : 8, height: 8, borderRadius: 999,
          background: i < current ? GOOD : i === current ? P : "#E5E1DC",
          transition: "all 200ms ease",
        }} />
      ))}
    </div>
  )
}

export default function WeeklyCareerCheck({ user, onNavigate }) {
  const [state, setState]         = useState("loading") // loading | unavailable | intro | active | feedback | done | error
  const [pulse, setPulse]         = useState(null)
  const [questions, setQuestions] = useState([])
  const [idx, setIdx]             = useState(0)
  const [selected, setSelected]   = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [summary, setSummary]     = useState(null)
  const [errorMsg, setErrorMsg]   = useState("")

  useEffect(() => { load() }, [])

  async function load() {
    setState("loading")
    try {
      const res = await weeklyCheckApi.current()
      if (!res.available) { setState("unavailable"); return }
      setPulse(res.pulse)
      setQuestions(res.questions || [])
      const firstUnanswered = (res.questions || []).findIndex(q => !q.answered)
      if (res.pulse.status === "completed" || firstUnanswered === -1) {
        setState("done")
        setSummary({ correct: res.pulse.correct_count, total: res.pulse.question_count })
      } else {
        setIdx(firstUnanswered)
        setState("intro")
      }
    } catch (e) {
      setErrorMsg(e.message || "Couldn't load this week's Career Check")
      setState("error")
    }
  }

  async function generate() {
    setState("loading")
    try {
      await weeklyCheckApi.generate()
      await load()
    } catch (e) {
      setErrorMsg(e.message || "Couldn't start this week's Career Check")
      setState("error")
    }
  }

  async function submitAnswer() {
    if (!selected) return
    const q = questions[idx]
    try {
      const res = await weeklyCheckApi.answer(pulse.id, {
        question_id: q.id,
        selected_option_id: selected,
        response_time_ms: null,
      })
      setLastResult(res)
      setState("feedback")
    } catch (e) {
      setErrorMsg(e.message || "Couldn't submit that answer")
      setState("error")
    }
  }

  async function next() {
    setSelected(null)
    setLastResult(null)
    if (idx + 1 < questions.length) {
      setIdx(idx + 1)
      setState("active")
    } else {
      setState("loading")
      try {
        const res = await weeklyCheckApi.complete(pulse.id)
        setSummary({ correct: res.correct_count, total: res.question_count })
        setState("done")
      } catch (e) {
        setErrorMsg(e.message || "Couldn't finish this week's Career Check")
        setState("error")
      }
    }
  }

  const q = questions[idx]

  return (
    <div style={{
      flex: 1, minHeight: 0, overflowY: "auto",
      background: `radial-gradient(ellipse at 50% 0%, ${P}0D 0%, transparent 46%), ${BG}`,
      fontFamily: BODY, color: INK,
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
        .wcc-option { width: 100%; text-align: left; padding: 16px 18px; border-radius: 16px; border: 1.5px solid ${BDR}; background: ${SURF}; cursor: pointer; font-family: ${BODY}; font-size: 14px; color: ${INK2}; transition: all 150ms; margin-bottom: 10px; }
        .wcc-option:hover { border-color: ${P}55; }
        .wcc-option.picked { border-color: ${P}; background: ${P}0D; color: ${INK}; font-weight: 600; }
        .wcc-option.correct { border-color: ${GOOD}; background: #F0FDF4; color: ${GOOD}; font-weight: 700; }
        .wcc-option.wrong { border-color: ${BAD}; background: #FEF2F2; color: ${BAD}; font-weight: 700; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 460, padding: "28px 20px 60px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: P, fontFamily: MONO }}>Weekly Career Check</div>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, color: INK, marginTop: 4 }}>5-minute refresh</div>
          </div>
          <button onClick={() => onNavigate?.("professionalHome")} style={{ background: "none", border: "none", color: MUT, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {state === "loading" && <Spinner />}

        {state === "error" && (
          <div style={{ background: SURF, border: `1px solid rgba(220,38,38,0.2)`, borderRadius: 18, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: BAD, marginBottom: 14 }}>{errorMsg}</div>
            <button onClick={load} style={{ background: P, color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}>Try again</button>
          </div>
        )}

        {state === "unavailable" && (
          <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 20, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🌱</div>
            <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: INK, marginBottom: 8 }}>Add a few skills first</div>
            <div style={{ fontSize: 13, color: MUT, lineHeight: 1.7, marginBottom: 18 }}>
              Your Weekly Career Check is built from your skill graph — add skills to your profile (or upload a resume) and this'll have something to check in on.
            </div>
            <button onClick={() => onNavigate?.("orbit")} style={{ background: P, color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}>Go to Orbit →</button>
          </div>
        )}

        {state === "intro" && (
          <div style={{ background: SURF, border: `1px solid rgba(139,92,246,0.16)`, borderRadius: 20, padding: 26, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>⚡</div>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 800, color: INK, marginBottom: 8 }}>This week's check-in is ready</div>
            <div style={{ fontSize: 13, color: MUT, lineHeight: 1.7, marginBottom: 8 }}>
              {questions.length} quick scenario questions, based on the skills on your profile. Real work situations, not textbook quizzes.
            </div>
            <div style={{ fontSize: 11, color: MUT, fontFamily: MONO, marginBottom: 20 }}>Takes about {Math.max(1, Math.round(questions.length * 0.6))} min</div>
            <button onClick={() => setState("active")} style={{ background: P, color: "#fff", border: "none", borderRadius: 14, padding: "13px 24px", fontWeight: 800, cursor: "pointer", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: MONO, width: "100%" }}>
              Start check-in →
            </button>
          </div>
        )}

        {(state === "active" || state === "feedback") && q && (
          <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 20, padding: 22 }}>
            <ProgressDots total={questions.length} current={idx} />
            <div style={{ fontSize: 10, fontWeight: 800, color: MUT, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: MONO, marginBottom: 8 }}>
              Question {idx + 1} of {questions.length}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: INK, lineHeight: 1.5, marginBottom: 18 }}>
              {q.prompt}
            </div>

            <div>
              {(q.options || []).map(opt => {
                let cls = "wcc-option"
                if (state === "feedback") {
                  if (opt.id === lastResult?.correct_option_id) cls += " correct"
                  else if (opt.id === selected) cls += " wrong"
                } else if (opt.id === selected) cls += " picked"
                return (
                  <button
                    key={opt.id}
                    className={cls}
                    disabled={state === "feedback"}
                    onClick={() => setSelected(opt.id)}
                  >
                    {opt.text}
                  </button>
                )
              })}
            </div>

            {state === "active" && (
              <button
                disabled={!selected}
                onClick={submitAnswer}
                style={{
                  width: "100%", marginTop: 8, padding: "13px 20px", borderRadius: 14, border: "none",
                  background: selected ? P : "#E5E1DC", color: "#fff", fontWeight: 800, fontSize: 13,
                  cursor: selected ? "pointer" : "not-allowed", fontFamily: MONO, letterSpacing: "0.04em", textTransform: "uppercase",
                }}
              >
                Submit answer
              </button>
            )}

            {state === "feedback" && (
              <div style={{ marginTop: 12 }}>
                <div style={{
                  padding: "12px 14px", borderRadius: 14, marginBottom: 14,
                  background: lastResult?.is_correct ? "#F0FDF4" : "#FEF2F2",
                  border: `1px solid ${lastResult?.is_correct ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
                }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: lastResult?.is_correct ? GOOD : BAD, marginBottom: 4 }}>
                    {lastResult?.is_correct ? "Correct" : "Not quite"}
                  </div>
                  <div style={{ fontSize: 12, color: INK2, lineHeight: 1.6 }}>{lastResult?.explanation}</div>
                </div>
                <button onClick={next} style={{ width: "100%", padding: "13px 20px", borderRadius: 14, border: "none", background: P, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: MONO, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {idx + 1 < questions.length ? "Next question →" : "Finish check-in →"}
                </button>
              </div>
            )}
          </div>
        )}

        {state === "done" && summary && (
          <div style={{ background: SURF, border: `1px solid rgba(22,163,74,0.2)`, borderRadius: 20, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 800, color: INK, marginBottom: 6 }}>Check-in complete</div>
            <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 800, color: GOOD, marginBottom: 4 }}>{summary.correct}/{summary.total}</div>
            <div style={{ fontSize: 12, color: MUT, marginBottom: 20, lineHeight: 1.6 }}>
              This nudges a few skill confidence scores — it's one signal among several, not the whole picture.
            </div>
            <button onClick={() => onNavigate?.("orbit")} style={{ background: P, color: "#fff", border: "none", borderRadius: 14, padding: "12px 20px", fontWeight: 800, cursor: "pointer", fontSize: 12, fontFamily: MONO, letterSpacing: "0.04em", textTransform: "uppercase", width: "100%", marginBottom: 10 }}>
              See updated skill scores →
            </button>
            <button onClick={() => onNavigate?.("professionalHome")} style={{ background: "none", border: `1px solid ${BDR}`, borderRadius: 14, padding: "12px 20px", fontWeight: 700, cursor: "pointer", fontSize: 12, color: MUT, width: "100%" }}>
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
