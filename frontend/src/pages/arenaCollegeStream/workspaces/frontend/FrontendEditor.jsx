/**
 * FrontendEditor.jsx — Vision Reset (2026-08-20). Same shape as
 * ../node/NodeEditor.jsx with @codemirror/lang-css swapped in.
 */
import CodeMirror from "@uiw/react-codemirror"
import { css as cssLang } from "@codemirror/lang-css"
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

export default function FrontendEditor({ value, onChange, disabled, T, MONO, minHeight = "220px" }) {
  return (
    <CodeMirror
      value={value}
      height="auto"
      minHeight={minHeight}
      maxHeight="420px"
      editable={!disabled}
      extensions={[cssLang(), buildTheme(T, MONO)]}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: false, tabSize: 2 }}
      onChange={(val) => onChange(val)}
      placeholder="/* fix the CSS here */"
    />
  )
}
