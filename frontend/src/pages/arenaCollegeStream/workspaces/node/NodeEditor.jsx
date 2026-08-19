/**
 * NodeEditor.jsx — Phase 6 (Software Engineering roles). Same shape as
 * ../python/PythonEditor.jsx with @codemirror/lang-javascript swapped in —
 * deliberately kept as a near-duplicate rather than refactored into one
 * shared, language-parameterized component under time pressure on an
 * already-proven, live-verified file (PythonEditor.jsx). A real, noted
 * consolidation opportunity for later, not a design decision.
 */
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { EditorView } from "@codemirror/view"

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

export default function NodeEditor({ value, onChange, disabled, T, MONO, minHeight = "220px" }) {
  return (
    <CodeMirror
      value={value}
      height="auto"
      minHeight={minHeight}
      maxHeight="520px"
      editable={!disabled}
      extensions={[javascript(), buildTheme(T, MONO)]}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: false, tabSize: 2 }}
      onChange={(val) => onChange(val)}
      placeholder="// write your solution here"
    />
  )
}
