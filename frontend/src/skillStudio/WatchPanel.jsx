/**
 * WatchPanel — Skill Studio Phase 2a "Watch" tab: narrated visual walkthrough.
 * ---------------------------------------------------------------------------
 * Plays the module's cached narration (GET /skill-studio/modules/:id/narration
 * → narrationEngine.getOrCreateNarration) as a sequential audio queue — one
 * real Deepgram Aura-2 TTS clip per segment (same voice/provider EchoPitch
 * already uses in production) — and drives DiagramSpecView's animation off
 * "which segment is currently playing" via its controlledStep prop, instead
 * of needing precise audio-duration timestamps. Captions render directly
 * from the segment text (free accessibility win — no separate transcript
 * generation needed).
 *
 * Honest about what this is: real narration audio over the SAME deterministic
 * diagram the Learn tab already shows — not a produced video file, not an AI
 * avatar. See SKILL_STUDIO_AI_VIDEO_SPEC.md §3 Option A for why this is the
 * Phase 2a scope rather than Option B/C.
 */
import { useState, useEffect, useRef, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, sectionLabel } from "./tokens"
import DiagramSpecView from "./DiagramSpecView"

export default function WatchPanel({ moduleId, diagramSpec }) {
  const [narration, setNarration] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [segmentIndex, setSegmentIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  const load = useCallback(async () => {
    if (!moduleId) return
    setLoading(true); setError(null)
    try {
      const { narration } = await skillStudioV2Api.moduleNarration(moduleId)
      setNarration(narration)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [moduleId])

  useEffect(() => { load() }, [load])
  useEffect(() => { setSegmentIndex(0); setPlaying(false) }, [narration])

  const segments = narration?.script || []
  const current = segments[segmentIndex]

  // controlledStep for DiagramSpecView: the diagram step tied to the CURRENT
  // segment, or the last-seen tied step if this segment doesn't narrate a
  // specific step (hook/wrap-up segments) — so the diagram doesn't blank out
  // between tied segments.
  const controlledStep = (() => {
    if (current?.tiedToStep != null) return current.tiedToStep
    for (let i = segmentIndex - 1; i >= 0; i--) {
      if (segments[i]?.tiedToStep != null) return segments[i].tiedToStep
    }
    return 0
  })()

  function play() {
    if (!current?.audioUrl || !audioRef.current) return
    audioRef.current.play().catch(() => {})
    setPlaying(true)
  }
  function pause() {
    audioRef.current?.pause()
    setPlaying(false)
  }
  function handleEnded() {
    if (segmentIndex < segments.length - 1) {
      setSegmentIndex((i) => i + 1)
    } else {
      setPlaying(false)
    }
  }
  function jumpTo(i) {
    setSegmentIndex(i)
    setPlaying(false)
  }

  // Auto-advance to the next segment's audio once its src is loaded.
  useEffect(() => {
    if (playing && audioRef.current && current?.audioUrl) {
      audioRef.current.play().catch(() => {})
    }
  }, [segmentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div style={{ padding: 20, textAlign: "center", color: D.muted, fontSize: 13 }}>Preparing narration…</div>

  if (error) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ color: D.rose, fontSize: 12, marginBottom: 10 }}>{error}</div>
        <button onClick={load} style={retryBtn}>Retry</button>
      </div>
    )
  }

  if (segments.length === 0) {
    return <div style={{ padding: 20, textAlign: "center", color: D.muted, fontSize: 12 }}>No narration available for this module yet.</div>
  }

  return (
    <div>
      {diagramSpec ? (
        <DiagramSpecView diagramSpec={diagramSpec} controlledStep={controlledStep} />
      ) : (
        <div style={{ marginBottom: 16, padding: 16, borderRadius: 14, background: D.float, border: `1px solid ${D.border}`, textAlign: "center", color: D.muted, fontSize: 12 }}>
          This lesson has no animated diagram — narration plays as audio + captions only.
        </div>
      )}

      <audio ref={audioRef} src={current?.audioUrl} onEnded={handleEnded} style={{ display: "none" }} />

      {/* Captions — the segment text itself, doubling as a free transcript */}
      <div style={{ minHeight: 44, padding: "10px 14px", borderRadius: 10, background: D.glass, border: `1px solid ${D.border}`, marginBottom: 12, fontSize: 13, color: D.text1, lineHeight: 1.5 }}>
        {current?.text}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button onClick={playing ? pause : play} style={playBtn}>{playing ? "Pause" : "Play"}</button>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {segments.map((_, i) => (
            <button
              key={i}
              onClick={() => jumpTo(i)}
              title={`Segment ${i + 1}`}
              style={{
                flex: 1, height: 6, borderRadius: 3, border: "none", cursor: "pointer", padding: 0,
                background: i === segmentIndex ? D.indigo : i < segmentIndex ? D.indigo + "50" : D.border,
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 10, color: D.muted, flexShrink: 0 }}>{segmentIndex + 1}/{segments.length}</span>
      </div>

      <div style={{ ...sectionLabel, fontSize: 9 }}>
        Narrated audio walkthrough — Deepgram Aura-2 voice (American English)
      </div>
    </div>
  )
}

const playBtn = {
  padding: "8px 18px", borderRadius: 10, border: "none", background: D.indigo, color: "#fff",
  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
}
const retryBtn = {
  padding: "8px 16px", borderRadius: 10, border: `1px solid ${D.border}`,
  background: D.glass, cursor: "pointer", fontFamily: "inherit", fontSize: 12,
}
