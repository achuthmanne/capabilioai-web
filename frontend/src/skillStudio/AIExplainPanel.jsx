/**
 * AIExplainPanel — overview + AI explanation content, teaching-mode
 * switcher. Switching mode re-requests module generation for the new
 * (skill, level, mode) tuple (parent handles the fetch — this component is
 * presentational plus the mode-select control).
 */
import { useState } from "react"
import { D, sectionLabel } from "./tokens"
import DiagramSpecView from "./DiagramSpecView"

const MODES = ["beginner", "intermediate", "advanced", "eli5", "interview", "code"]

function blockContent(contentBlocks, type) {
  return contentBlocks?.find((b) => b.block_type === type)?.content
}

export default function AIExplainPanel({ contentBlocks = [], mode, onModeChange }) {
  const hook = blockContent(contentBlocks, "hook")
  const overview = blockContent(contentBlocks, "overview")
  const explanation = blockContent(contentBlocks, "ai_explanation")
  const workedExample = blockContent(contentBlocks, "worked_example")
  const commonMistake = blockContent(contentBlocks, "common_mistake")
  const diagramSpec = blockContent(contentBlocks, "diagram_spec")
  const checkpoint = blockContent(contentBlocks, "checkpoint_question")
  const commonMistakes = blockContent(contentBlocks, "common_mistakes")

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {MODES.map((m) => (
          <button key={m} onClick={() => onModeChange?.(m)} style={{
            padding: "4px 10px", borderRadius: 99, border: `1px solid ${mode === m ? D.indigo : D.border}`,
            background: mode === m ? D.indigo + "15" : "transparent", color: mode === m ? D.indigo : D.muted,
            fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
          }}>{m}</button>
        ))}
      </div>

      {/* hook — a short "why this matters" line generated ahead of the
          formal overview (Phase 1 part A). Optional: older cached lessons
          generated before this field existed simply won't have this block. */}
      {hook?.hook && (
        <div style={{
          fontSize: 13, fontStyle: "italic", color: D.text1, marginBottom: 14,
          padding: "10px 12px", borderRadius: 10, background: D.indigo + "0d", borderLeft: `3px solid ${D.indigo}`,
        }}>{hook.hook}</div>
      )}

      {overview && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: D.text1, marginBottom: 4 }}>{overview.title}</div>
          <div style={{ fontSize: 13, color: D.text2 }}>{overview.objective}</div>
        </div>
      )}

      {explanation?.sections?.map((s, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: D.text1, marginBottom: 4 }}>{s.heading}</div>
          <div style={{ fontSize: 13, color: D.text2, lineHeight: 1.6 }}>{s.content}</div>
          {s.codeExample && (
            <pre style={{ background: "#0F172A", color: "#E2E8F0", padding: 12, borderRadius: 10, fontSize: 11, overflowX: "auto", marginTop: 6 }}>{s.codeExample}</pre>
          )}
        </div>
      ))}

      {diagramSpec && <DiagramSpecView diagramSpec={diagramSpec} />}

      {workedExample?.scenario && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...sectionLabel, marginBottom: 6 }}>
            Worked example{workedExample.company ? ` — ${workedExample.company}` : ""}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: D.text1, marginBottom: 4 }}>{workedExample.scenario}</div>
          {workedExample.walkthrough && (
            <div style={{ fontSize: 13, color: D.text2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{workedExample.walkthrough}</div>
          )}
        </div>
      )}

      {commonMistake?.wrong && (
        <div style={{ marginBottom: 16, borderRadius: 12, border: `1px solid ${D.border}`, overflow: "hidden" }}>
          <div style={{ ...sectionLabel, padding: "8px 12px", background: D.float }}>Common mistake</div>
          <div style={{ padding: "10px 12px" }}>
            <div style={{ fontSize: 12, color: D.rose, marginBottom: 6 }}><strong>Wrong:</strong> {commonMistake.wrong}</div>
            <div style={{ fontSize: 12, color: D.emerald, marginBottom: 6 }}><strong>Correct:</strong> {commonMistake.correct}</div>
            {commonMistake.why && <div style={{ fontSize: 12, color: D.text2 }}><strong>Why:</strong> {commonMistake.why}</div>}
          </div>
        </div>
      )}

      {checkpoint?.prompt && <CheckpointQuestion checkpoint={checkpoint} />}

      {commonMistakes?.practiceTask && (
        <div style={{ ...sectionLabel, marginTop: 10, marginBottom: 4 }}>Practice task</div>
      )}
      {commonMistakes?.practiceTask && <div style={{ fontSize: 12, color: D.text2 }}>{commonMistakes.practiceTask}</div>}
    </div>
  )
}

/**
 * CheckpointQuestion — a single self-check question surfaced inline with the
 * lesson (not a scored quiz question, not written to quiz_attempts, not part
 * of the pass/fail gate — purely a reflective prompt so the learner can
 * self-assess before moving to the real adaptive quiz). Reveal-on-click so
 * it doesn't spoil the answer before the learner attempts it.
 */
function CheckpointQuestion({ checkpoint }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, background: D.glass, border: `1px solid ${D.border}` }}>
      <div style={{ ...sectionLabel, marginBottom: 6 }}>Checkpoint</div>
      <div style={{ fontSize: 13, color: D.text1, marginBottom: 8 }}>{checkpoint.prompt}</div>
      {revealed ? (
        <div style={{ fontSize: 12, color: D.text2 }}>{checkpoint.answer}</div>
      ) : (
        <button onClick={() => setRevealed(true)} style={{
          fontSize: 11, fontWeight: 700, color: D.indigo, background: "transparent",
          border: `1px solid ${D.indigo}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit",
        }}>Reveal answer</button>
      )}
    </div>
  )
}
