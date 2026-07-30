/**
 * RevisePanel — flashcards / cheat sheet / interview questions surface
 * (Skill Studio Phase 1 part B, 2026-07-30). Backed by
 * GET /skill-studio/modules/:id/revision, which itself is backed by the
 * module_revision_content cache table (getOrCreateRevisionContent in
 * contentGenerator.js) — fetched once per module and cached server-side, so
 * revisiting this tab is a cheap cache read, not a fresh AI generation.
 */
import { useState, useEffect, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, sectionLabel } from "./tokens"

export default function RevisePanel({ moduleId, skillLabel, jobTitle, level }) {
  const [revision, setRevision] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const load = useCallback(async () => {
    if (!moduleId) return
    setLoading(true); setError(null)
    try {
      const { revision } = await skillStudioV2Api.moduleRevision(moduleId)
      setRevision(revision)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [moduleId])

  useEffect(() => { load() }, [load])

  if (loading && !revision) {
    return <div style={{ padding: 20, textAlign: "center", color: D.muted, fontSize: 13 }}>Preparing revision content…</div>
  }
  if (error && !revision) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ color: D.rose, fontSize: 12, marginBottom: 10 }}>{error}</div>
        <button onClick={load} style={retryBtn}>Retry</button>
      </div>
    )
  }

  const content = revision?.content || {}
  const flashcards = Array.isArray(content.flashcards) ? content.flashcards : []
  const cheatSheet = Array.isArray(content.cheat_sheet) ? content.cheat_sheet : []
  const interviewQs = Array.isArray(content.interview_qs) ? content.interview_qs : []
  const card = flashcards[flashcardIndex]

  return (
    <div>
      {flashcards.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...sectionLabel, marginBottom: 8 }}>Flashcards</div>
          <div
            onClick={() => setFlipped((f) => !f)}
            style={{
              cursor: "pointer", borderRadius: 14, border: `1px solid ${D.border}`, background: D.float,
              padding: "28px 20px", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center",
              textAlign: "center", fontSize: 14, fontWeight: 600, color: D.text1,
            }}
          >
            {flipped ? card?.back : card?.front}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <button
              onClick={() => { setFlashcardIndex((i) => Math.max(0, i - 1)); setFlipped(false) }}
              disabled={flashcardIndex === 0} style={navBtn}
            >‹ Prev</button>
            <span style={{ fontSize: 11, color: D.muted }}>
              {flashcardIndex + 1}/{flashcards.length} · tap card to {flipped ? "hide" : "reveal"} answer
            </span>
            <button
              onClick={() => { setFlashcardIndex((i) => Math.min(flashcards.length - 1, i + 1)); setFlipped(false) }}
              disabled={flashcardIndex >= flashcards.length - 1} style={navBtn}
            >Next ›</button>
          </div>
        </div>
      )}

      {cheatSheet.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...sectionLabel, marginBottom: 8 }}>Cheat sheet</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {cheatSheet.map((point, i) => (
              <li key={i} style={{ fontSize: 12, color: D.text2, marginBottom: 6, lineHeight: 1.5 }}>
                {typeof point === "string" ? point : point.point || JSON.stringify(point)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {interviewQs.length > 0 && (
        <div>
          <div style={{ ...sectionLabel, marginBottom: 8 }}>Interview questions</div>
          {interviewQs.map((q, i) => (
            <div key={i} style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: D.glass, border: `1px solid ${D.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: D.text1, marginBottom: 4 }}>{q.question}</div>
              {q.answer_outline && <div style={{ fontSize: 12, color: D.text2, lineHeight: 1.5 }}>{q.answer_outline}</div>}
            </div>
          ))}
        </div>
      )}

      {flashcards.length === 0 && cheatSheet.length === 0 && interviewQs.length === 0 && (
        <div style={{ padding: 20, textAlign: "center", color: D.muted, fontSize: 12 }}>No revision content yet for this module.</div>
      )}
    </div>
  )
}

const retryBtn = {
  padding: "8px 16px", borderRadius: 10, border: `1px solid ${D.border}`,
  background: D.glass, cursor: "pointer", fontFamily: "inherit", fontSize: 12,
}
const navBtn = {
  padding: "5px 10px", borderRadius: 8, border: `1px solid ${D.border}`,
  background: D.void, cursor: "pointer", fontFamily: "inherit", fontSize: 11,
}
