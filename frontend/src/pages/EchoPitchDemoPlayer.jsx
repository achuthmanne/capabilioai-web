import { useRef, useState, useCallback } from "react"

// ─── EchoPitch product demo player ───────────────────────────────────────────
// A real, generated video+audio walkthrough of "how EchoPitch works" for the
// Aura landing hero — not a canned/static video file, and not an AI avatar
// generated from a photo (that needs a third-party talking-avatar service
// this codebase doesn't have; user confirmed this scope explicitly).
//
// What's real here: Canvas2D scene rendering + MediaRecorder capture + real
// Deepgram TTS narration (backend/server/routes/tts.js — the same pipeline
// EchoPitch's own wizard uses), mixed into one playable video/audio file via
// Web Audio API. The user's own uploaded avatar photo (userData.avatarUrl —
// a real, already-existing profile field) is drawn as a static circular
// portrait in the intro scene when present; no talking/animated avatar is
// implied or faked.
//
// Narration voice: same Deepgram Aura-2 model as the main generator — real
// American-English TTS. Deepgram's catalog has no Indian-English voice today
// (checked 2026-07-28 against their docs), so this is not labeled as one.

const API = "https://capabilio-web.onrender.com"
const W = 1280, H = 720

const ACCENT = "#00D2FF", ACCENT2 = "#78FF9E", GOLD = "#F5C453", BG = "#050810", BG2 = "#0a1628"

const DEMO_SCENES = [
  {
    id: "intro", duration: 6,
    headline: "EchoPitch",
    subtext: "Your Career. Your Voice. Your Story.",
    narration: "Meet EchoPitch — a narrated video pitch built from your real Capabilio profile, not a template.",
  },
  {
    id: "analyse", duration: 5,
    headline: "1. Analyse Profile",
    subtext: "Reads your real Arena missions, ELO history and skills",
    narration: "First, EchoPitch reads your real Arena missions, ELO history, and skills — nothing invented.",
  },
  {
    id: "story", duration: 5,
    headline: "2. AI Story Writer",
    subtext: "Turns your evidence into a narrated script",
    narration: "An AI story writer turns that evidence into a short, confident narrated script.",
  },
  {
    id: "evidence", duration: 5,
    headline: "3. Selecting Evidence",
    subtext: "You choose which Arena tasks and roles appear",
    narration: "You choose exactly which Arena tasks and work experience appear in your story.",
  },
  {
    id: "voice", duration: 5,
    headline: "4. Choose Voice",
    subtext: "Real AI narration, baked into your downloaded video",
    narration: "Pick a narration voice — real AI audio, baked directly into your downloaded video file.",
  },
  {
    id: "theme", duration: 5,
    headline: "5. Choose Theme & Render",
    subtext: "Apple · Netflix · Minimal · LinkedIn · Startup",
    narration: "Pick a cinematic theme, hit generate, and download a video ready to share.",
  },
  {
    id: "outro", duration: 5,
    headline: "Try EchoPitch",
    subtext: "Built from your real evidence. Always.",
    narration: "That's EchoPitch — built entirely from your real evidence, every time.",
  },
]
const TOTAL = DEMO_SCENES.reduce((a, s) => a + s.duration, 0)

function drawScene(ctx, t, scene, avatarImg) {
  ctx.clearRect(0, 0, W, H)
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, BG2); grad.addColorStop(1, BG)
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)

  // soft glow accents
  ctx.save()
  ctx.globalAlpha = 0.14
  const g1 = ctx.createRadialGradient(W*0.15, H*0.15, 0, W*0.15, H*0.15, 380)
  g1.addColorStop(0, ACCENT); g1.addColorStop(1, "transparent")
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H)
  const g2 = ctx.createRadialGradient(W*0.85, H*0.85, 0, W*0.85, H*0.85, 340)
  g2.addColorStop(0, GOLD); g2.addColorStop(1, "transparent")
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H)
  ctx.restore()

  const enter = Math.min(1, t / 0.15), exit = Math.min(1, Math.max(0, (t - 0.85) / 0.15))
  const alpha = enter * (1 - exit)
  const rise = (1 - enter) * 24

  if (scene.id === "intro") {
    if (avatarImg) {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.beginPath(); ctx.arc(W/2, H*0.32, 78, 0, Math.PI*2); ctx.closePath()
      ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.stroke()
      ctx.clip()
      ctx.drawImage(avatarImg, W/2-78, H*0.32-78, 156, 156)
      ctx.restore()
    }
    ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = "center"
    ctx.font = "900 68px 'Syne',sans-serif"
    ctx.fillStyle = "#fff"
    ctx.fillText(scene.headline, W/2, (avatarImg ? H*0.32+150 : H*0.46) + rise)
    ctx.font = "600 24px 'DM Mono',monospace"
    ctx.fillStyle = ACCENT
    ctx.fillText(scene.subtext, W/2, (avatarImg ? H*0.32+195 : H*0.46+50) + rise)
    ctx.restore()
    return
  }

  // step scenes — badge + headline + subtext
  ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = "center"
  ctx.font = "800 13px 'DM Mono',monospace"
  ctx.fillStyle = GOLD
  ctx.fillText("HOW ECHOPITCH WORKS", W/2, H*0.32 - 40 + rise)
  ctx.font = "900 50px 'Syne',sans-serif"
  ctx.fillStyle = "#fff"
  ctx.fillText(scene.headline, W/2, H*0.32 + rise)
  ctx.font = "500 21px 'DM Mono',monospace"
  ctx.fillStyle = "rgba(240,246,255,0.65)"
  ctx.fillText(scene.subtext, W/2, H*0.32 + 46 + rise)
  ctx.restore()
}

export default function EchoPitchDemoPlayer({ avatarUrl }) {
  const canvasRef = useRef(), avatarImgRef = useRef(null)
  const [status, setStatus] = useState("idle") // idle | loading | ready | error
  const [statusText, setStatusText] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [showPlayer, setShowPlayer] = useState(false)

  const run = useCallback(async () => {
    setStatus("loading"); setShowPlayer(true); setStatusText("Preparing demo…")
    try {
      if (avatarUrl && !avatarImgRef.current) {
        avatarImgRef.current = await new Promise((resolve) => {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => resolve(img)
          img.onerror = () => resolve(null)
          img.src = avatarUrl
        })
      }

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      if (audioCtx.state === "suspended") await audioCtx.resume()
      const dest = audioCtx.createMediaStreamDestination()

      const buffers = []
      for (let i = 0; i < DEMO_SCENES.length; i++) {
        setStatusText(`Synthesizing narration ${i+1} of ${DEMO_SCENES.length}…`)
        try {
          const res = await fetch(`${API}/api/tts/speak`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: DEMO_SCENES[i].narration }),
          })
          if (!res.ok) throw new Error("tts failed")
          const buf = await audioCtx.decodeAudioData(await res.arrayBuffer())
          buffers.push(buf)
        } catch { buffers.push(null) }
      }

      setStatusText("Rendering…")
      const canvas = canvasRef.current
      const videoTrack = canvas.captureStream(30).getVideoTracks()[0]
      const hasAudio = buffers.some(Boolean)
      const audioTrack = hasAudio ? dest.stream.getAudioTracks()[0] : null
      const combined = new MediaStream(audioTrack ? [videoTrack, audioTrack] : [videoTrack])
      const mime = ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"]
        .find(m => MediaRecorder.isTypeSupported(m)) || "video/webm"
      const recorder = new MediaRecorder(combined, { mimeType: mime })
      const chunks = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      const stopped = new Promise(resolve => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" })
          setVideoUrl(URL.createObjectURL(blob)); resolve()
        }
      })
      recorder.start(100)

      const ctx = canvas.getContext("2d")
      for (let i = 0; i < DEMO_SCENES.length; i++) {
        const scene = DEMO_SCENES[i]
        if (buffers[i] && audioTrack) {
          const src = audioCtx.createBufferSource()
          src.buffer = buffers[i]; src.connect(dest); src.start()
        }
        const fps = 30, frames = scene.duration * fps, startMs = performance.now()
        for (let f = 0; f < frames; f++) {
          drawScene(ctx, f / frames, scene, avatarImgRef.current)
          const elapsed = performance.now() - startMs, expected = (f / fps) * 1000
          await new Promise(r => setTimeout(r, Math.max(0, expected - elapsed)))
        }
      }
      await new Promise(r => setTimeout(r, 350))
      recorder.stop()
      await stopped
      setStatus("ready")
    } catch {
      setStatus("error")
      setStatusText("Couldn't generate the demo right now — try again in a moment.")
    }
  }, [avatarUrl])

  return (
    <div>
      <canvas ref={canvasRef} width={W} height={H} style={{ display: "none" }} />
      {!showPlayer && (
        <button onClick={run} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px",
          borderRadius: 11, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)",
          color: "#f8fafc", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          ▶ Watch: How EchoPitch Works
        </button>
      )}
      {showPlayer && (
        <div style={{ marginTop: 12, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(0,0,0,0.3)", maxWidth: 480 }}>
          {status === "loading" && (
            <div style={{ aspectRatio: "16/9", display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 8 }}>
              <div style={{ width: 20, height: 20, border: "2px solid #00D2FF", borderTopColor: "transparent",
                borderRadius: "50%", animation: "spin .8s linear infinite" }} />
              <div style={{ fontSize: 11.5, color: "rgba(240,246,255,0.6)" }}>{statusText}</div>
            </div>
          )}
          {status === "ready" && (
            <video src={videoUrl} controls autoPlay style={{ width: "100%", display: "block" }} />
          )}
          {status === "error" && (
            <div style={{ padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 11.5, color: "#F5C453", marginBottom: 10 }}>{statusText}</div>
              <button onClick={run} style={{ padding: "8px 16px", borderRadius: 9, border: "1px solid rgba(245,196,83,0.4)",
                background: "rgba(245,196,83,0.08)", color: "#F5C453", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
