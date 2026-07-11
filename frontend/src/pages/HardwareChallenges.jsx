/**
 * HardwareChallenges.jsx
 * PCB-community-style challenge page for ECE / IoT / Mechanical / Civil / EEE students.
 * Card grid → detail view → AI-graded submission → ELO reward.
 */
import { useState, useEffect, useCallback } from "react"
import { hardwareApi } from "../lib/api"

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg:      "#F7F5F2",
  surface: "#FFFFFF",
  border:  "#E8E3DA",
  ink:     "#1A1714",
  ink2:    "#3D3530",
  ink3:    "#6B5E57",
  ink4:    "#9E9189",
  accent:  "#FF5701",
  accent2: "rgba(255,87,1,0.08)",
  r:       "12px",
  shadow:  "0 1px 4px rgba(0,0,0,0.06)",
  shadowM: "0 4px 16px rgba(0,0,0,0.10)",
}

const STREAM_COLORS = {
  ECE:        { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  EEE:        { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
  IoT:        { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
  Mechanical: { bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE" },
  Civil:      { bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" },
}

const DIFF_COLORS = {
  Beginner:     { bg: "#F0FDF4", color: "#15803D" },
  Intermediate: { bg: "#FFF7ED", color: "#C2410C" },
  Advanced:     { bg: "#FEF2F2", color: "#B91C1C" },
}

const STREAM_EMOJI = { All: "🔧", ECE: "⚡", EEE: "🔌", IoT: "📡", Mechanical: "⚙️", Civil: "🏗️" }
const STREAMS = ["All", "ECE", "EEE", "IoT", "Mechanical", "Civil"]
const SORT_OPTIONS = ["Newest", "Popular", "Most Attempted", "ELO Reward"]

// ── Challenge Card ────────────────────────────────────────────────────────────
function ChallengeCard({ challenge, onClick }) {
  const sc = STREAM_COLORS[challenge.stream] || { bg: T.accent2, color: T.accent, border: T.border }
  const dc = DIFF_COLORS[challenge.difficulty] || DIFF_COLORS.Beginner
  const [imgErr, setImgErr] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.r,
        overflow: "hidden",
        cursor: "pointer",
        boxShadow: hovered ? T.shadowM : T.shadow,
        transform: hovered ? "translateY(-3px)" : "none",
        transition: "transform 0.18s, box-shadow 0.18s",
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", height: 160, background: `linear-gradient(135deg, ${sc.bg}, ${sc.border})`, overflow: "hidden" }}>
        {challenge.thumbnail && !imgErr ? (
          <img
            src={challenge.thumbnail}
            alt={challenge.title}
            onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>
            {STREAM_EMOJI[challenge.stream] || "🔧"}
          </div>
        )}
        {/* Stream + Difficulty badges */}
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 5 }}>
          <span style={{ padding: "2px 8px", background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 99, fontSize: 10, fontWeight: 800, color: sc.color, backdropFilter: "blur(4px)" }}>
            {challenge.stream}
          </span>
          <span style={{ padding: "2px 8px", background: dc.bg, borderRadius: 99, fontSize: 10, fontWeight: 700, color: dc.color }}>
            {challenge.difficulty}
          </span>
        </div>
        {/* ELO reward */}
        <div style={{ position: "absolute", top: 8, right: 8, padding: "3px 9px", background: "rgba(255,87,1,0.92)", borderRadius: 99, fontSize: 10, fontWeight: 800, color: "#fff" }}>
          +{challenge.elo_reward} ELO
        </div>
        {challenge.attempted && (
          <div style={{ position: "absolute", bottom: 8, right: 8, padding: "2px 8px", background: "#15803D", borderRadius: 99, fontSize: 10, fontWeight: 700, color: "#fff" }}>
            ✓ Attempted
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.ink4, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
          {challenge.category}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, lineHeight: 1.35, marginBottom: 6, minHeight: 38 }}>
          {challenge.title}
        </div>
        <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {challenge.description}
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
          {(challenge.tags || []).slice(0, 3).map((t, i) => (
            <span key={i} style={{ fontSize: 10, color: T.ink3, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 99, padding: "1px 7px" }}>
              {t}
            </span>
          ))}
        </div>

        {/* Stats footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, borderTop: `1px solid ${T.border}`, paddingTop: 9 }}>
          <span style={{ fontSize: 11, color: T.ink4 }}>👁 {(challenge.views || 0).toLocaleString()}</span>
          <span style={{ fontSize: 11, color: T.ink4 }}>✍️ {(challenge.attempts || 0).toLocaleString()}</span>
          <span style={{ fontSize: 11, color: T.ink4 }}>♥ {(challenge.likes || 0)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden" }}>
      <div style={{ height: 160, background: "#F3F4F6" }} />
      <div style={{ padding: 14 }}>
        <div style={{ height: 8, background: "#E5E7EB", borderRadius: 4, marginBottom: 10, width: "35%" }} />
        <div style={{ height: 14, background: "#E5E7EB", borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 10, background: "#F3F4F6", borderRadius: 4, width: "75%" }} />
      </div>
    </div>
  )
}

// ── Challenge Detail ──────────────────────────────────────────────────────────
function ChallengeDetail({ id, onBack }) {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [activeStep, setActiveStep] = useState(0)
  const [answer,     setAnswer]     = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [result,     setResult]     = useState(null)
  const [error,      setError]      = useState("")
  const [liked,      setLiked]      = useState(false)

  useEffect(() => {
    setLoading(true)
    hardwareApi.get(id)
      .then(d => {
        setData(d)
        if (d.submission?.feedback) setResult(d.submission.feedback)
      })
      .catch(() => setError("Could not load challenge. Please try again."))
      .finally(() => setLoading(false))
  }, [id])

  const submit = async () => {
    if (answer.trim().length < 50) { setError("Please write at least 50 characters explaining your solution."); return }
    setSubmitting(true); setError("")
    try {
      const res = await hardwareApi.attempt(id, answer)
      setResult(res.grade)
    } catch (e) {
      setError(e.message || "Submission failed. Please try again.")
    }
    setSubmitting(false)
  }

  const handleLike = () => {
    if (liked) return
    setLiked(true)
    hardwareApi.like(id).catch(() => {})
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 10, color: T.ink4 }}>
        <div style={{ width: 20, height: 20, border: `2px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        Loading challenge…
      </div>
    )
  }

  if (!data?.challenge) {
    return <div style={{ padding: 48, textAlign: "center", color: T.ink4 }}>{error || "Challenge not found."}</div>
  }

  const { challenge, submission } = data
  const sc = STREAM_COLORS[challenge.stream] || { bg: T.accent2, color: T.accent, border: T.border }
  const dc = DIFF_COLORS[challenge.difficulty] || DIFF_COLORS.Beginner
  const steps = challenge.steps || []

  const gradeEmoji = (score) => {
    if (score >= 80) return "🏆"
    if (score >= 60) return "✅"
    if (score >= 40) return "📝"
    return "📖"
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 0 56px" }}>
      {/* Back */}
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: T.ink3, fontSize: 13, fontWeight: 600, padding: "0 0 18px", marginLeft: -4 }}>
        ← Back to Challenges
      </button>

      {/* Hero card */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden", marginBottom: 20, boxShadow: T.shadow }}>
        {challenge.thumbnail && (
          <div style={{ height: 220, overflow: "hidden", position: "relative" }}>
            <img src={challenge.thumbnail} alt={challenge.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.82 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6))" }} />
          </div>
        )}
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ padding: "3px 10px", background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 99, fontSize: 11, fontWeight: 800, color: sc.color }}>{challenge.stream}</span>
            <span style={{ padding: "3px 10px", background: dc.bg, borderRadius: 99, fontSize: 11, fontWeight: 700, color: dc.color }}>{challenge.difficulty}</span>
            <span style={{ padding: "3px 10px", background: T.accent2, borderRadius: 99, fontSize: 11, fontWeight: 800, color: T.accent }}>+{challenge.elo_reward} ELO</span>
            <span style={{ padding: "3px 10px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 99, fontSize: 11, color: T.ink3 }}>{challenge.category}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: T.ink, margin: "0 0 10px", lineHeight: 1.3 }}>{challenge.title}</h1>
          <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.65, margin: "0 0 14px" }}>{challenge.description}</p>

          {/* Why This Matters */}
          <div style={{ background: "#FFFBF5", border: "1px solid #FED7AA", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#C2410C", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>📚 Why This Matters</div>
            <p style={{ fontSize: 13, color: T.ink2, margin: 0, lineHeight: 1.65 }}>{challenge.context}</p>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ fontSize: 12, color: T.ink4 }}>👁 {(challenge.views || 0).toLocaleString()} views</span>
            <span style={{ fontSize: 12, color: T.ink4 }}>✍️ {(challenge.attempts || 0).toLocaleString()} attempts</span>
            <button onClick={handleLike} style={{ marginLeft: "auto", padding: "5px 14px", background: liked ? "#FEF2F2" : T.bg, border: `1px solid ${liked ? "#FECACA" : T.border}`, borderRadius: 99, fontSize: 12, fontWeight: 600, color: liked ? "#B91C1C" : T.ink3, cursor: liked ? "default" : "pointer" }}>
              {liked ? "♥ Liked" : "♡ Like"}
            </button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        {/* Left: Steps + Submission */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Step-by-step accordion */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "20px 24px", boxShadow: T.shadow }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.ink4, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
              📋 Step-by-Step Guide ({steps.length} steps)
            </div>
            {steps.map((s, i) => (
              <div key={i} onClick={() => setActiveStep(i === activeStep ? -1 : i)}
                style={{ cursor: "pointer", borderBottom: i < steps.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: i === activeStep ? T.accent : T.bg,
                    border: `2px solid ${i === activeStep ? T.accent : T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: i === activeStep ? "#fff" : T.ink3,
                    transition: "all 0.15s",
                  }}>
                    {s.step}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: i === activeStep ? T.accent : T.ink }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 12, color: T.ink4 }}>{i === activeStep ? "▲" : "▼"}</div>
                </div>
                {i === activeStep && (
                  <div style={{ paddingLeft: 40, paddingBottom: 14 }}>
                    <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.7, background: T.bg, padding: "10px 14px", borderRadius: 8, borderLeft: `3px solid ${T.accent}` }}>
                      {s.instruction}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Result OR Submission form */}
          {result ? (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "20px 24px", boxShadow: T.shadow }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>{gradeEmoji(result.score)}</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: T.ink }}>{result.grade}</div>
                  <div style={{ fontSize: 12, color: T.ink3 }}>
                    Score: {result.score}/100 · {result.elo_awarded > 0 ? `+${result.elo_awarded} ELO awarded 🎉` : "No ELO this time — keep practising!"}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.65, padding: "12px 14px", background: T.bg, borderRadius: 8, marginBottom: 14, borderLeft: `3px solid ${result.score >= 80 ? "#15803D" : result.score >= 60 ? T.accent : "#D97706"}` }}>
                {result.verdict}
              </div>

              {result.strengths?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#15803D", letterSpacing: "0.06em", marginBottom: 6 }}>✓ STRENGTHS</div>
                  {result.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, color: T.ink2, marginBottom: 4, paddingLeft: 12 }}>• {s}</div>)}
                </div>
              )}

              {result.improvements?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#C2410C", letterSpacing: "0.06em", marginBottom: 6 }}>→ TO IMPROVE</div>
                  {result.improvements.map((s, i) => <div key={i} style={{ fontSize: 12, color: T.ink2, marginBottom: 4, paddingLeft: 12 }}>• {s}</div>)}
                </div>
              )}

              {result.model_insight && (
                <div style={{ background: "#FFFBF5", border: "1px solid #FED7AA", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400E", lineHeight: 1.6, marginBottom: 14 }}>
                  💡 <strong>Key insight:</strong> {result.model_insight}
                </div>
              )}

              <button onClick={() => { setResult(null); setAnswer("") }}
                style={{ padding: "8px 18px", background: T.accent2, border: "1px solid rgba(255,87,1,0.2)", borderRadius: 8, fontSize: 12, fontWeight: 700, color: T.accent, cursor: "pointer" }}>
                Try again with a better answer ↺
              </button>
            </div>
          ) : (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "20px 24px", boxShadow: T.shadow }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.ink4, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                ✍️ Your Solution
              </div>
              <p style={{ fontSize: 12, color: T.ink3, marginBottom: 12, lineHeight: 1.6 }}>
                Work through all {steps.length} steps above, then write your complete solution here. Show your calculations, explain your reasoning, and address every step. The AI will grade your answer.
              </p>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                disabled={submitting}
                placeholder={`Write your complete solution here — show calculations with units, explain the reasoning behind each step, name the components you'd use, and describe real-world application of your design...`}
                style={{
                  width: "100%", minHeight: 200, padding: "12px 14px",
                  border: `1.5px solid ${error ? "#FCA5A5" : T.border}`,
                  borderRadius: 10, fontSize: 13, color: T.ink, resize: "vertical",
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box", lineHeight: 1.65,
                }}
                onFocus={e => { e.target.style.borderColor = T.accent }}
                onBlur={e => { e.target.style.borderColor = error ? "#FCA5A5" : T.border }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                <span style={{ fontSize: 11, color: answer.length < 50 ? "#F87171" : "#15803D" }}>
                  {answer.length} chars {answer.length < 50 ? `· need ${50 - answer.length} more` : "· ready to submit ✓"}
                </span>
                <button
                  onClick={submit}
                  disabled={submitting || answer.trim().length < 50}
                  style={{
                    padding: "10px 24px", border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700,
                    background: (answer.trim().length >= 50 && !submitting) ? T.accent : "#D1D5DB",
                    cursor: (answer.trim().length >= 50 && !submitting) ? "pointer" : "default",
                  }}
                >
                  {submitting ? "AI Grading…" : "Submit for AI Grading →"}
                </button>
              </div>
              {error && <div style={{ marginTop: 8, fontSize: 12, color: "#B91C1C", background: "#FEF2F2", padding: "8px 12px", borderRadius: 6 }}>{error}</div>}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Challenge info */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 16, boxShadow: T.shadow }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.ink4, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Challenge Info</div>
            {[
              { label: "Stream",        value: `${STREAM_EMOJI[challenge.stream] || "🔧"} ${challenge.stream}` },
              { label: "Category",      value: challenge.category },
              { label: "Difficulty",    value: challenge.difficulty },
              { label: "ELO Reward",    value: `Up to +${challenge.elo_reward}` },
              { label: "Steps",         value: `${steps.length} guided steps` },
              { label: "Total Attempts",value: (challenge.attempts || 0).toLocaleString() },
            ].map((item, i, arr) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <span style={{ fontSize: 12, color: T.ink4 }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* ELO scoring guide */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 16, boxShadow: T.shadow }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.ink4, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>ELO Scoring</div>
            {[
              { range: "80–100", label: "Excellent", elo: `+${challenge.elo_reward}`,                           color: "#15803D", bg: "#F0FDF4" },
              { range: "60–79",  label: "Good",      elo: `+${Math.round(challenge.elo_reward * 0.75)}`,         color: T.accent,  bg: T.accent2 },
              { range: "40–59",  label: "Fair",      elo: `+${Math.round(challenge.elo_reward * 0.5)}`,          color: "#D97706", bg: "#FFFBEB" },
              { range: "0–39",   label: "Try again", elo: "+0",                                                  color: "#6B7280", bg: T.bg },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: 6, marginBottom: 4, background: s.bg }}>
                <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.range} — {s.label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: s.color }}>{s.elo}</span>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div style={{ background: "#FFFBF5", border: "1px solid #FED7AA", borderRadius: T.r, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#C2410C", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>💡 Score Higher</div>
            {[
              "Show all calculations with units",
              "Name every component you use",
              "Explain the 'why', not just the 'what'",
              "Address each of the steps",
              "Mention real-world applications",
            ].map((tip, i) => (
              <div key={i} style={{ fontSize: 12, color: "#92400E", marginBottom: 5, display: "flex", gap: 8 }}>
                <span style={{ flexShrink: 0, color: "#D97706" }}>✓</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>

          {/* Tags */}
          {(challenge.tags || []).length > 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 16, boxShadow: T.shadow }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.ink4, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Tags</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {challenge.tags.map((t, i) => (
                  <span key={i} style={{ fontSize: 11, color: T.ink3, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 99, padding: "2px 9px" }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HardwareChallenges({ user, userData }) {
  const [challenges,   setChallenges]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [activeStream, setActiveStream] = useState("All")
  const [search,       setSearch]       = useState("")
  const [searchInput,  setSearchInput]  = useState("")
  const [selectedId,   setSelectedId]   = useState(null)
  const [sortBy,       setSortBy]       = useState("Newest")

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const loadChallenges = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (activeStream !== "All") params.stream = activeStream
      if (search.trim()) params.search = search.trim()
      const data = await hardwareApi.list(params)
      setChallenges(Array.isArray(data) ? data : data.challenges || [])
    } catch {
      setChallenges([])
    }
    setLoading(false)
  }, [activeStream, search])

  useEffect(() => { loadChallenges() }, [loadChallenges])

  // Client-side sort
  const sorted = [...challenges].sort((a, b) => {
    if (sortBy === "Popular")        return (b.views     || 0) - (a.views     || 0)
    if (sortBy === "Most Attempted") return (b.attempts  || 0) - (a.attempts  || 0)
    if (sortBy === "ELO Reward")     return (b.elo_reward || 0) - (a.elo_reward || 0)
    return 0
  })

  if (selectedId) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, padding: "24px 16px" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <ChallengeDetail id={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Hero header ── */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", padding: "36px 24px 30px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 10 }}>
            Capabilio · Practical Engineering
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "#fff", margin: "0 0 10px", lineHeight: 1.2 }}>
            Hardware & Design Challenges
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.62)", margin: "0 0 22px", maxWidth: 540, lineHeight: 1.7 }}>
            Real-world engineering problems for ECE, EEE, IoT, Mechanical & Civil students.
            Work step-by-step, submit your solution, earn ELO from AI evaluation.
          </p>

          {/* Stream pills in hero */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {STREAMS.filter(s => s !== "All").map(s => (
              <button key={s} onClick={() => setActiveStream(s === activeStream ? "All" : s)}
                style={{
                  padding: "5px 14px", borderRadius: 99, cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: activeStream === s ? "#fff" : "rgba(255,255,255,0.1)",
                  border: `1.5px solid ${activeStream === s ? "#fff" : "rgba(255,255,255,0.2)"}`,
                  color: activeStream === s ? T.ink : "rgba(255,255,255,0.8)",
                  transition: "all 0.15s",
                }}>
                {STREAM_EMOJI[s]} {s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: 460 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.45 }}>🔍</span>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by topic, concept, or technique…"
              style={{
                width: "100%", padding: "11px 14px 11px 44px",
                background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.2)",
                borderRadius: 10, fontSize: 13, color: "#fff", fontFamily: "inherit",
                outline: "none", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(255,255,255,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.2)"}
            />
          </div>
        </div>
      </div>

      {/* ── Content area ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STREAMS.map(s => (
              <button key={s} onClick={() => setActiveStream(s)}
                style={{
                  padding: "6px 14px", borderRadius: 99, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
                  fontWeight: activeStream === s ? 700 : 500,
                  background: activeStream === s ? T.accent : T.surface,
                  border: `1.5px solid ${activeStream === s ? T.accent : T.border}`,
                  color: activeStream === s ? "#fff" : T.ink3,
                  transition: "all 0.15s",
                }}>
                {STREAM_EMOJI[s]} {s}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: T.ink4 }}>{sorted.length} challenge{sorted.length !== 1 ? "s" : ""}</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding: "6px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, color: T.ink, background: T.surface, cursor: "pointer", outline: "none" }}>
              {SORT_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Welcome banner for engineering students */}
        <div style={{ background: "linear-gradient(135deg, #EFF6FF, #F5F3FF)", border: "1px solid #BFDBFE", borderRadius: T.r, padding: "14px 18px", marginBottom: 22, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 28 }}>⚡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1D4ED8", marginBottom: 2 }}>Practical Engineering Challenges</div>
            <div style={{ fontSize: 12, color: "#3730A3", lineHeight: 1.5 }}>
              Each challenge comes with step-by-step guidance, context, and AI grading. Work through the steps, show your reasoning, and earn ELO for solid solutions.
            </div>
          </div>
        </div>

        {/* Challenge grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "72px 0", color: T.ink4 }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🔧</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.ink3, marginBottom: 8 }}>No challenges found</div>
            <div style={{ fontSize: 13 }}>
              {search ? `No results for "${search}"` : "Try selecting a different stream"}
            </div>
            {(activeStream !== "All" || search) && (
              <button onClick={() => { setActiveStream("All"); setSearchInput("") }}
                style={{ marginTop: 16, padding: "9px 20px", background: T.accent2, border: "1px solid rgba(255,87,1,0.2)", borderRadius: 9, fontSize: 13, fontWeight: 700, color: T.accent, cursor: "pointer" }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {sorted.map(c => (
              <ChallengeCard key={c.id} challenge={c} onClick={() => setSelectedId(c.id)} />
            ))}
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 40, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, color: T.ink4 }}>
              All solutions are AI-graded · ELO credited immediately · New challenges added weekly
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
