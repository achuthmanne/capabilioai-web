/**
 * VisualLearningPanel — renders visual/example content blocks. Falls back
 * gracefully when a module has no dedicated "visual" block yet (spec §21:
 * runtime must degrade, never show a dead "requires a visual" error).
 */
import { D, sectionLabel } from "./tokens"

function blockContent(contentBlocks, type) {
  return contentBlocks?.find((b) => b.block_type === type)?.content
}

export default function VisualLearningPanel({ contentBlocks = [] }) {
  const visual = blockContent(contentBlocks, "visual")
  const example = blockContent(contentBlocks, "example")
  const cheatSheet = blockContent(contentBlocks, "cheat_sheet")

  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 10 }}>Visual Learning</div>

      {visual?.diagram ? (
        <div style={{ padding: 12, border: `1px solid ${D.border}`, borderRadius: 12, marginBottom: 12 }}>{visual.diagram}</div>
      ) : (
        <div style={{ fontSize: 12, color: D.muted, marginBottom: 12 }}>No dedicated diagram for this module yet — see the code examples below.</div>
      )}

      {example?.codeExamples?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {example.codeExamples.map((c, i) => (
            <pre key={i} style={{ background: "#0F172A", color: "#E2E8F0", padding: 12, borderRadius: 10, fontSize: 11, overflowX: "auto" }}>{c}</pre>
          ))}
        </div>
      )}

      {cheatSheet?.keyPoints?.length > 0 && (
        <div>
          <div style={{ ...sectionLabel, marginBottom: 6 }}>Cheat Sheet</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {cheatSheet.keyPoints.map((k, i) => <li key={i} style={{ fontSize: 12, color: D.text2, marginBottom: 4 }}>{k}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
