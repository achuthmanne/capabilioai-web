/**
 * PythonEditor.jsx — Career Workspace refactor (2026-08-19).
 *
 * Thin CodeMirror 6 wrapper, same shape and reasoning as ../sql/SqlEditor.jsx
 * (CodeMirror over Monaco: pure ESM, no worker config, small bundle) — this
 * is that exact file with @codemirror/lang-python swapped in for
 * @codemirror/lang-sql. Owns no mission/submission state of its own.
 */
import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
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

export default function PythonEditor({ value, onChange, disabled, T, MONO, minHeight = "220px" }) {
  return (
    <CodeMirror
      value={value}
      height="auto"
      minHeight={minHeight}
      maxHeight="520px"
      editable={!disabled}
      extensions={[python(), buildTheme(T, MONO)]}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: false, tabSize: 4 }}
      onChange={(val) => onChange(val)}
      placeholder="# write your solution here"
    />
  )
}
