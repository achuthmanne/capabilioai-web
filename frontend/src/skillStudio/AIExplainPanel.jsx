/**
 * AIExplainPanel — overview + AI explanation content, teaching-mode
 * switcher. Switching mode re-requests module generation for the new
 * (skill, level, mode) tuple (parent handles the fetch — this component is
 * presentational plus the mode-select control).
 */
import { D, sectionLabel } from "./tokens"

const MODES = ["beginner", "intermediate", "advanced", "eli5", "interview", "code"]

function blockContent(contentBlocks, type) {
  return contentBlocks?.find((b) => b.block_type === type)?.content
}

export default function AIExplainPanel({ contentBlocks = [], mode, onModeChange }) {
  const overview = blockContent(contentBlocks, "overview")
  const explanation = blockContent(contentBlocks, "ai_explanation")
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

      {commonMistakes?.practiceTask && (
        <div style={{ ...sectionLabel, marginTop: 10, marginBottom: 4 }}>Practice task</div>
      )}
      {commonMistakes?.practiceTask && <div style={{ fontSize: 12, color: D.text2 }}>{commonMistakes.practiceTask}</div>}
    </div>
  )
}
