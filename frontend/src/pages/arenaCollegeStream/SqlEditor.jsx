/**
 * SqlEditor.jsx — Phase 2, 2026-08-18.
 *
 * Thin CodeMirror 6 wrapper replacing the bare <textarea> the Domain Role
 * SQL workspace used before. Owns no mission/submission state of its own —
 * ArenaCollegeStream.jsx still owns `sql`/`setSql` exactly as it did with
 * the textarea; this component only renders and edits that string.
 *
 * CodeMirror 6 (via @uiw/react-codemirror) over Monaco: pure ESM, no
 * special Vite plugin/worker config needed, small bundle footprint, ships
 * a real SQL language mode (@codemirror/lang-sql) — sufficient for syntax
 * highlighting without pulling in a full IDE-grade editor for a five-line
 * practice query.
 */
import CodeMirror from "@uiw/react-codemirror"
import { sql } from "@codemirror/lang-sql"
import { EditorView } from "@codemirror/view"

// Theme built from the page's own T-token palette (frontend/src/pages/
// arenaCollegeStream/ArenaCollegeStream.jsx) rather than one of
// CodeMirror's canned dark themes — keeps the editor visually inside the
// same cream/indigo product, not a bolted-on IDE widget.
function buildTheme(T, MONO) {
  return EditorView.theme({
    "&": { fontFamily: MONO, fontSize: "13px", backgroundColor: T.cream2, borderRadius: "10px", border: `1px solid ${T.border}` },
    "&.cm-focused": { outline: `2px solid ${T.indigo3}`, outlineOffset: "1px" },
    ".cm-content": { padding: "12px 14px", caretColor: T.ink },
    ".cm-gutters": { backgroundColor: T.cream, color: T.ink3, border: "none", borderRadius: "10px 0 0 10px" },
    ".cm-activeLine": { backgroundColor: "rgba(99,102,241,0.05)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(99,102,241,0.08)" },
    ".cm-scroller": { fontFamily: MONO },
  }, { dark: false })
}

export default function SqlEditor({ value, onChange, disabled, T, MONO, minHeight = "120px" }) {
  return (
    <CodeMirror
      value={value}
      height="auto"
      minHeight={minHeight}
      maxHeight="360px"
      editable={!disabled}
      extensions={[sql(), buildTheme(T, MONO)]}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true, autocompletion: false }}
      onChange={(val) => onChange(val)}
      placeholder="SELECT …"
    />
  )
}
