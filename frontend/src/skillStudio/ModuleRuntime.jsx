/**
 * ModuleRuntime — the module experience (spec §21). Composes: overview + AI
 * explanation, visuals, playground, tutor, adaptive quiz, memory touchpoint,
 * Arena gate, interview gate, evidence summary, next-step CTA.
 *
 * props:
 *   moduleRequest: { skillGraphNodeId, skillJourneyId, skillName, skillLabel,
 *                    domainKey, jobTitle, level }
 *   onArenaGo(result), onExitToJourney()
 */
import { useState, useEffect, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, cardStyle } from "./tokens"
import AIExplainPanel from "./AIExplainPanel"
import TutorPanel from "./TutorPanel"
import QuizPanel from "./QuizPanel"
import InterviewGatePanel from "./InterviewGatePanel"
import NextSkillPanel from "./NextSkillPanel"

// Visual, Playground, Memory, Arena, and Evidence tabs removed 2026-07-30 —
// Visual had no real diagram generation (static "no diagram yet" placeholder
// for every module), and the other three weren't delivering working content
// either. Kept: Learn, Tutor, Quiz, Interview. If any of these are rebuilt
// with real functioning content later, re-add the tab entry + panel import.
const TABS = [
  { id: "learn", label: "Learn" },
  { id: "tutor", label: "Tutor" },
  { id: "quiz", label: "Quiz" },
  { id: "interview", label: "Interview" },
]

export default function ModuleRuntime({ moduleRequest, onArenaGo, onExitToJourney, recommendations = [] }) {
  const [level, setLevel] = useState(moduleRequest.level || "intermediate")
  const [mode, setMode] = useState("intermediate")
  const [module, setModule] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [activeTab, setActiveTab] = useState("learn")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quizPassed, setQuizPassed] = useState(null)
  const [completed, setCompleted] = useState(false)

  const generate = useCallback(async (nextLevel, nextMode) => {
    setLoading(true); setError(null)
    try {
      const result = await skillStudioV2Api.generateModule({
        skillName: moduleRequest.skillName,
        skillGraphNodeId: moduleRequest.skillGraphNodeId,
        skillJourneyId: moduleRequest.skillJourneyId,
        jobTitle: moduleRequest.jobTitle,
        level: nextLevel, teachingMode: nextMode,
      })
      setModule(result.module)
      setBlocks(result.blocks || [])
      await skillStudioV2Api.startModule(result.module.id)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [moduleRequest.skillName, moduleRequest.skillGraphNodeId, moduleRequest.skillJourneyId, moduleRequest.jobTitle])

  useEffect(() => { generate(level, mode) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function changeMode(nextMode) {
    setMode(nextMode)
    generate(level, nextMode)
  }

  async function completeModule() {
    if (!module) return
    const score = quizPassed?.score ?? 0
    const passed = quizPassed?.passed ?? false
    try {
      await skillStudioV2Api.completeModule(module.id, { quizScore: score, passed })
      // Evidence tab was removed (2026-07-30) — there's nowhere left to route
      // to, so just surface a completion banner in place instead of switching
      // to a tab that no longer renders anything.
      setCompleted(true)
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading && !module) {
    return <div style={{ padding: 40, textAlign: "center", color: D.muted, fontSize: 13 }}>Assembling your module…</div>
  }

  if (error && !module) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ color: D.rose, fontSize: 13, marginBottom: 10 }}>Couldn&apos;t generate this module: {error}</div>
        <button onClick={() => generate(level, mode)} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${D.border}`, background: D.glass, cursor: "pointer", fontFamily: "inherit" }}>Retry</button>
      </div>
    )
  }

  const skillLabel = moduleRequest.skillLabel || moduleRequest.skillName

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <button onClick={onExitToJourney} style={{ fontSize: 11, color: D.muted, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 4 }}>← Back to journey</button>
          <div style={{ fontSize: 20, fontWeight: 900, color: D.text1 }}>{skillLabel}</div>
        </div>
        <select value={level} onChange={(e) => { setLevel(e.target.value); generate(e.target.value, mode) }} style={{ padding: "6px 10px", borderRadius: 10, border: `1px solid ${D.border}`, fontSize: 11, fontFamily: "inherit" }}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap", background: D.glass, borderRadius: 12, padding: 4 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "7px 12px", borderRadius: 9, border: "none",
            background: activeTab === t.id ? D.indigo + "20" : "transparent",
            color: activeTab === t.id ? D.indigo : D.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 20, minHeight: 260 }}>
        {activeTab === "learn" && <AIExplainPanel contentBlocks={blocks} mode={mode} onModeChange={changeMode} />}
        {activeTab === "tutor" && <TutorPanel skillLabel={skillLabel} moduleOverview={blocks.find((b) => b.block_type === "overview")?.content} />}
        {activeTab === "quiz" && (
          <QuizPanel skillGraphNodeId={moduleRequest.skillGraphNodeId} skillLabel={skillLabel} moduleId={module.id}
            onSessionComplete={(result) => { setQuizPassed(result); if (result.passed) completeModule() }} />
        )}
        {activeTab === "interview" && <InterviewGatePanel moduleId={module.id} skillLabel={skillLabel} domainKey={moduleRequest.domainKey} />}
      </div>

      {completed && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: D.indigo + "12", color: D.indigo, fontSize: 12, fontWeight: 700 }}>
          ✓ Module completed — quiz score {quizPassed?.score ?? 0}%.
        </div>
      )}

      {quizPassed && !quizPassed.passed && (
        <div style={{ marginTop: 12, fontSize: 12, color: D.amber }}>
          Quiz score was below 70% — revisit the explanation before retrying, rather than repeating the quiz cold.
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <NextSkillPanel recommendations={recommendations} title="What's Next" />
      </div>
    </div>
  )
}
