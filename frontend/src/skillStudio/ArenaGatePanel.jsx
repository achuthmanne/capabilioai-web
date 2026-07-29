/**
 * ArenaGatePanel — the explicit "you are ready" handoff (spec §7). Readiness
 * is ALWAYS re-verified server-side on handoff (never trusts this component's
 * own display state) — this panel only shows what the server already
 * computed and lets the learner request the handoff.
 */
import { useState, useEffect, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, sectionLabel } from "./tokens"

const REASON_LABEL = {
  memory_confidence_below_threshold: "Memory confidence still below target",
  quiz_pass_rate_below_threshold: "Quiz pass rate not yet consistent enough",
  unresolved_high_severity_mistakes: "Unresolved recurring mistakes on this skill",
}

export default function ArenaGatePanel({ skillJourneyId, skillGraphNodeId, domainKey, onArenaGo }) {
  const [readiness, setReadiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [requesting, setRequesting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await skillStudioV2Api.arenaReadiness(skillGraphNodeId)
      setReadiness(r)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [skillGraphNodeId])

  useEffect(() => { load() }, [load])

  async function requestHandoff() {
    setRequesting(true); setError(null)
    try {
      const result = await skillStudioV2Api.arenaHandoff({ skillJourneyId, skillGraphNodeId, domainKey })
      onArenaGo?.(result)
    } catch (e) {
      setError(e.message)
      await load() // re-sync display with server truth after a rejected handoff
    }
    setRequesting(false)
  }

  if (loading) return <div style={{ fontSize: 12, color: D.muted }}>Checking Arena readiness…</div>

  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 10 }}>Arena Readiness</div>
      {readiness?.ready ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: D.emerald, marginBottom: 8 }}>Ready to prove this in Arena.</div>
          <button onClick={requestHandoff} disabled={requesting} style={{
            padding: "9px 18px", borderRadius: 10, border: "none", background: D.emerald, color: "#fff",
            fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          }}>{requesting ? "Handing off…" : "Take it to Arena"}</button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 12, color: D.muted, marginBottom: 8 }}>Not ready yet — here&apos;s what&apos;s left:</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {(readiness?.unmet || []).map((u, i) => (
              <li key={i} style={{ fontSize: 12, color: D.text2, marginBottom: 4 }}>
                {REASON_LABEL[u.reason] || u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <div style={{ fontSize: 11, color: D.rose, marginTop: 8 }}>{error}</div>}
    </div>
  )
}
