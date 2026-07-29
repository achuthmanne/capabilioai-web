/**
 * PlaygroundPanel — interactive practice surface. Persists to
 * module_state.playground_state on a debounce (2.5s idle), per spec §15 —
 * NOT on every keystroke. Generic free-form workspace in this pass (a
 * type-specific sub-renderer — code editor / SQL console / slider sim — is
 * the natural Phase 2 extension once modules carry a real
 * `playground_config` content block; contentGenerator.js doesn't emit one
 * yet, so this degrades to a single generic text workspace rather than
 * showing a dead "requires a simulation" error, per spec §21).
 */
import { useState, useRef, useEffect, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, sectionLabel } from "./tokens"

const DEBOUNCE_MS = 2500

export default function PlaygroundPanel({ moduleId, initialState = {} }) {
  const [value, setValue] = useState(initialState?.notes || "")
  const [saveState, setSaveState] = useState("idle") // idle | pending | saved | error
  const timerRef = useRef(null)

  const persist = useCallback(async (next) => {
    setSaveState("pending")
    try {
      await skillStudioV2Api.savePlaygroundState(moduleId, { notes: next })
      setSaveState("saved")
    } catch {
      setSaveState("error")
    }
  }, [moduleId])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  function onChange(e) {
    const next = e.target.value
    setValue(next)
    setSaveState("pending")
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => persist(next), DEBOUNCE_MS)
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={sectionLabel}>Practice Workspace</span>
        <span style={{ fontSize: 10, color: saveState === "error" ? D.rose : D.muted }}>
          {saveState === "pending" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed — retrying next edit" : ""}
        </span>
      </div>
      <textarea value={value} onChange={onChange} rows={10} placeholder="Work through the practice task here — it's saved automatically."
        style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${D.border}`, fontFamily: "'DM Mono', monospace", fontSize: 12, resize: "vertical" }} />
    </div>
  )
}
