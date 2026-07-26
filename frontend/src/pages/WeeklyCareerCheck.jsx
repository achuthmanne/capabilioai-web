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
import { useEffect, useState, useCallback } from "react"
import { weeklyCheckApi } from "../lib/api"

// Keyboard support (Career OS Workstream 3, Part D): arrows navigate,
// 1-4 select an option, Enter submits/advances. Mirrors
// backend/server/lib/skillPulseV2/pulseProgress.js's mapKeyToIntent — kept
// as a small local copy since frontend (Vite) and backend (Node) build
// separately and can't share a module across that boundary directly.
function mapKeyToIntent(key, optionCount) {
  if (key === "Enter") return { type: "submit" }
  if (key === "ArrowRight") return { type: "next" }
  if (key === "ArrowLeft") return { type: "prev" }
  const n = Number(key)
  if (Number.isInteger(n) && n >= 1 && n <= optionCount) return { type: "select", optionIndex: n - 1 }
  return null
}

const QUESTION_SECONDS = 45 // realistic lockdown scope: visible countdown + auto-lock, not OS-level enforcement

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
  // Purely decorative — the actual "Question N of total" text lives right
  // below this in real DOM text, so hide the dots from screen readers
  // instead of announcing a row of unlabeled divs (Tranche E, 2026-07-25).
  return (
    <div aria-hidden="true" style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 18 }}>
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
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS)
  const [timedOut, setTimedOut]   = useState(false)

  useEffect(() => { load() }, [])

  // ── 45s-per-question timer (product requirement) ───────────────────────────
  // Realistic scope: a visible countdown that auto-locks the question at
  // zero. This cannot and does not claim to prevent someone from looking up
  // an answer off-screen — see the anti-cheat event logging below for what
  // IS realistically detectable from the browser.
  useEffect(() => {
    if (state !== "active") return
    setSecondsLeft(QUESTION_SECONDS)
    setTimedOut(false)
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(interval)
          handleTimeout()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, idx])

  async function handleTimeout() {
    if (!pulse || !questions[idx]) return
    setTimedOut(true)
    try {
      const res = await weeklyCheckApi.timeout(pulse.id, questions[idx].id)
      setLastResult(res)
      setState("feedback")
    } catch (e) {
      // Even if the timeout call fails, still advance the user rather than
      // stranding them on a dead countdown.
      setLastResult({ is_correct: false, explanation: "Time's up for this question." })
      setState("feedback")
    }
  }

  // ── Anti-cheat event logging (2026-07-26) ───────────────────────────────────
  // Realistic, honestly-scoped browser-level protections: block copy/paste/
  // cut/right-click and discourage text selection on the question surface,
  // and log (not silently ignore) tab-switch/window-blur as suspicious
  // activity persisted server-side. This does NOT and CANNOT prevent
  // screenshots or a second device — that limitation is real and stated here
  // rather than pretended away.
  const logSuspicious = useCallback((type) => {
    if (!pulse?.id) return
    weeklyCheckApi.flagSuspicious(pulse.id, type).catch(() => {})
  }, [pulse])

  useEffect(() => {
    if (state !== "active" && state !== "feedback") return
    const block = (e) => { e.preventDefault(); return false }
    const onCopy = (e) => { block(e); logSuspicious("copy_attempt") }
    const onPaste = (e) => { block(e); logSuspicious("paste_attempt") }
    const onCut = (e) => { block(e); logSuspicious("cut_attempt") }
    const onContextMenu = (e) => { block(e); logSuspicious("context_menu") }
    const onVisibility = () => { if (document.hidden) logSuspicious("visibility_hidden") }
    const onBlur = () => logSuspicious("tab_blur")

    document.addEventListener("copy", onCopy)
    document.addEventListener("paste", onPaste)
    document.addEventListener("cut", onCut)
    document.addEventListener("contextmenu", onContextMenu)
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", onBlur)
    return () => {
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("paste", onPaste)
      document.removeEventListener("cut", onCut)
      document.removeEventListener("contextmenu", onContextMenu)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", onBlur)
    }
  }, [state, logSuspicious])

  async function load() {
    setState("loading")
    try {
      // Career OS Workstream 3: always go through the coverage-gated v2
      // generate endpoint first (idempotent — returns the existing pulse for
      // this week if one's already there). The server decides v1 vs v2
      // here; if the user's domain doesn't have approved question-bank
      // coverage yet (true for every real user today), it transparently
      // builds the same 5-question v1 flow this page has always shown — no
      // behavior change for anyone until real bank content exists.
      try { await weeklyCheckApi.v2Generate() } catch { /* honest empty state (no skills yet) surfaces via current() below */ }

      const res = await weeklyCheckApi.current()
      if (!res.available) { setState("unavailable"); return }
      setPulse(res.pulse)
      setQuestions(res.questions || [])
      const firstUnanswered = (res.questions || []).findIndex(q => !q.answered)
      if (res.pulse.status === "completed" || firstUnanswered === -1) {
        setState("done")
        // Reloading a pulse that finished in a prior session only has the
        // tally, not the full skills_refreshed/skills_to_revisit breakdown
        // (that's returned once, at complete() time, by design — it's not
        // persisted separately). That's fine: the summary still shows the
        // honest score; the richer breakdown only shows right after finishing.
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
        setSummary({
          correct: res.correct_count, total: res.question_count,
          skillsRefreshed: res.skills_refreshed || [],
          skillsToRevisit: res.skills_to_revisit || [],
          professionalElo: res.professional_elo || null,
        })
        setState("done")
      } catch (e) {
        setErrorMsg(e.message || "Couldn't finish this week's Career Check")
        setState("error")
      }
    }
  }

  const q = questions[idx]

  // Keyboard support (Career OS Workstream 3, Part D): 1-4 select an option,
  // Enter submits the answer (when active) or advances (when showing
  // feedback), arrows step between options. Only wired up during the
  // active/feedback question states — everywhere else keyboard input falls
  // through to normal browser behavior.
  const handleKey = useCallback((e) => {
    if (state !== "active" && state !== "feedback") return
    const intent = mapKeyToIntent(e.key, q?.options?.length || 0)
    if (!intent) return
    e.preventDefault()
    if (state === "active") {
      if (intent.type === "select") setSelected(q.options[intent.optionIndex]?.id)
      else if (intent.type === "submit") submitAnswer()
      else if (intent.type === "next" || intent.type === "prev") {
        const dir = intent.type === "next" ? 1 : -1
        const curIdx = (q.options || []).findIndex(o => o.id === selected)
        const nextIdx = Math.max(0, Math.min((q.options || []).length - 1, (curIdx === -1 ? 0 : curIdx) + dir))
        setSelected(q.options[nextIdx]?.id)
      }
    } else if (state === "feedback" && intent.type === "submit") {
      next()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, q, selected])

  useEffect(() => {
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [handleKey])

  return (
    <div style={{
      flex: 1, minHeight: 0, overflowY: "auto",
      background: `radial-gradient(ellipse at 50% 0%, ${P}0D 0%, transparent 46%), ${BG}`,
      fontFamily: BODY, color: INK,
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
        .wcc-option { position: relative; width: 100%; text-align: left; padding: 16px 18px; border-radius: 16px; border: 1.5px solid ${BDR}; background: ${SURF}; cursor: pointer; font-family: ${BODY}; font-size: 14px; color: ${INK2}; transition: all 150ms; margin-bottom: 10px; }
        .wcc-option:focus-visible { outline: 2px solid ${P}; outline-offset: 2px; }
        .wcc-option:hover { border-color: ${P}55; }
        .wcc-option.picked { border-color: ${P}; background: ${P}0D; color: ${INK}; font-weight: 600; }
        .wcc-option.correct { border-color: ${GOOD}; background: #F0FDF4; color: ${GOOD}; font-weight: 700; }
        .wcc-option.wrong { border-color: ${BAD}; background: #FEF2F2; color: ${BAD}; font-weight: 700; }
        .wcc-lockdown { user-select: none; -webkit-user-select: none; }
        .wcc-lockdown * { user-select: none; -webkit-user-select: none; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 460, padding: "28px 20px 60px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: P, fontFamily: MONO }}>Weekly Career Check</div>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, color: INK, marginTop: 4 }}>5-minute refresh</div>
          </div>
          <button onClick={() => onNavigate?.("orbit")} aria-label="Close and return to Orbit" style={{ background: "none", border: "none", color: MUT, fontSize: 20, cursor: "pointer" }}>✕</button>
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
          <div className="wcc-lockdown" style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 20, padding: 22 }}>
            <ProgressDots total={questions.length} current={idx} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUT, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: MONO }}>
                Question {idx + 1} of {questions.length}
              </div>
              {state === "active" && (
                <div aria-live="polite" style={{
                  fontFamily: MONO, fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
                  color: secondsLeft <= 10 ? BAD : P, background: secondsLeft <= 10 ? "#FEF2F2" : `${P}10`,
                  border: `1px solid ${secondsLeft <= 10 ? "rgba(220,38,38,0.25)" : `${P}25`}`,
                }}>
                  ⏱ {secondsLeft}s
                </div>
              )}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: INK, lineHeight: 1.5, marginBottom: 18 }}>
              {q.prompt}
            </div>

            <div aria-label={`Answer options for question ${idx + 1}`}>
              {(q.options || []).map(opt => {
                let cls = "wcc-option"
                let srSuffix = ""
                if (state === "feedback") {
                  if (opt.id === lastResult?.correct_option_id) { cls += " correct"; srSuffix = " (correct answer)" }
                  else if (opt.id === selected) { cls += " wrong"; srSuffix = " (your answer, incorrect)" }
                } else if (opt.id === selected) cls += " picked"
                return (
                  <button
                    key={opt.id}
                    className={cls}
                    disabled={state === "feedback"}
                    onClick={() => setSelected(opt.id)}
                    aria-pressed={state === "active" ? opt.id === selected : undefined}
                  >
                    {opt.text}
                    {srSuffix && <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>{srSuffix}</span>}
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
                <div role="status" aria-live="polite" style={{
                  padding: "12px 14px", borderRadius: 14, marginBottom: 14,
                  background: lastResult?.is_correct ? "#F0FDF4" : "#FEF2F2",
                  border: `1px solid ${lastResult?.is_correct ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
                }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: lastResult?.is_correct ? GOOD : BAD, marginBottom: 4 }}>
                    {timedOut ? "Time's up — locked as incorrect" : lastResult?.is_correct ? "Correct" : "Not quite"}
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

            {/* Career OS Workstream 3, Part D results requirements: skills
                refreshed, skills to revisit, with visible bounded math
                (never just a final number) — renders only when the
                complete() response actually included this breakdown. */}
            {!!(summary.skillsRefreshed?.length) && (
              <div style={{ textAlign: "left", marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: GOOD, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: MONO, marginBottom: 8 }}>Skills refreshed</div>
                {summary.skillsRefreshed.map(s => (
                  <div key={s.skill_id} style={{ fontSize: 12, color: INK2, marginBottom: 4 }}>
                    {s.skill_name || "Skill"} <span style={{ color: GOOD, fontWeight: 700 }}>+{s.delta}</span>
                  </div>
                ))}
              </div>
            )}
            {!!(summary.skillsToRevisit?.length) && (
              <div style={{ textAlign: "left", marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: MUT, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: MONO, marginBottom: 8 }}>Skills to revisit</div>
                {summary.skillsToRevisit.map(s => (
                  <div key={s.skill_id} style={{ fontSize: 12, color: INK2, marginBottom: 4 }}>
                    {s.skill_name || "Skill"} <span style={{ color: BAD, fontWeight: 700 }}>{s.delta}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Professional ELO delta from THIS check-in — this is the exact
                number that previously moved silently on the backend with no
                visible confirmation on this screen. Shown honestly in both
                directions (can go up or down), never hidden when negative. */}
            {summary.professionalElo && summary.professionalElo.delta !== 0 && (
              <div style={{
                textAlign: "left", marginBottom: 14, padding: "10px 14px", borderRadius: 14,
                background: summary.professionalElo.delta > 0 ? "#F0FDF4" : "#FEF2F2",
                border: `1px solid ${summary.professionalElo.delta > 0 ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: MONO, color: summary.professionalElo.delta > 0 ? GOOD : BAD, marginBottom: 4 }}>
                  Professional ELO {summary.professionalElo.delta > 0 ? "+" : ""}{summary.professionalElo.delta}
                </div>
                <div style={{ fontSize: 12, color: INK2 }}>{summary.professionalElo.reason}</div>
              </div>
            )}

            <button onClick={() => onNavigate?.("orbit")} style={{ background: P, color: "#fff", border: "none", borderRadius: 14, padding: "12px 20px", fontWeight: 800, cursor: "pointer", fontSize: 12, fontFamily: MONO, letterSpacing: "0.04em", textTransform: "uppercase", width: "100%", marginBottom: 10 }}>
              See updated skill scores →
            </button>
            <button onClick={() => onNavigate?.("orbit")} style={{ background: "none", border: `1px solid ${BDR}`, borderRadius: 14, padding: "12px 20px", fontWeight: 700, cursor: "pointer", fontSize: 12, color: MUT, width: "100%" }}>
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
