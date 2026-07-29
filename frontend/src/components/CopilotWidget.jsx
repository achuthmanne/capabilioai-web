import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"
import {
  CLASSIFIER_SYSTEM_PROMPT,
  GROQ_MODELS,
  TIER_CONFIG,
  buildSystemPrompt,
  buildPolicyPrompt,
  buildContextPrompt,
  buildGroundingNote,
  buildConversationMessages,
  hasDrift,
  qualityCheck,
  getSuggestionChips,
  classifyBucket,
  isCareerFastPath,
  isCoachIntent,
  canSendMessage,
  getRemainingQuestions,
  shouldShowLimitWarning,
  getThinkingText,
  buildLimitHitResponse,
  FALLBACK_RESPONSE,
} from "../config/copilotConfig"

// ── Constants ────────────────────────────────────────────────
// P0 FIX (2026-07-14): Groq is no longer called directly from the browser —
// that exposed the API key in the client bundle (inspectable via devtools /
// network tab). Both callGroq (streaming) and classify (non-streaming) now
// go through a server-side proxy (backend/server/routes/groqProxy.js) that
// holds the real key. Request/response shape is unchanged — only the
// destination and the key moved.
const API = import.meta.env.VITE_API_URL || "https://capabilio-web.onrender.com"
const GROQ_PROXY = `${API}/api/groq/chat`

function sessionId() {
  const k = "capi_session_id"
  let s = sessionStorage.getItem(k)
  if (!s) { s = crypto.randomUUID(); sessionStorage.setItem(k, s) }
  return s
}

// ── Avatar ───────────────────────────────────────────────────
function CapiAvatar({ size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #FF5701 0%, #FF8C42 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, boxShadow: "0 2px 8px rgba(255,87,1,0.35)",
    }}>
      <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>✦</span>
    </div>
  )
}

// ── Typing dots ──────────────────────────────────────────────
function TypingDots({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#FF5701",
            animation: `capiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      {label && <span style={{ fontSize: 11, color: "#A8A29E", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>}
    </div>
  )
}

// ── Message bubble ───────────────────────────────────────────
function Bubble({ role, content, isBlocked, groundingNote }) {
  const isUser = role === "user"
  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "flex-start",
      flexDirection: isUser ? "row-reverse" : "row",
      marginBottom: 12,
    }}>
      {!isUser && <CapiAvatar size={26} />}
      <div style={{ maxWidth: "80%" }}>
        <div style={{
          padding: "9px 13px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
          background: isUser
            ? "linear-gradient(135deg, #FF5701 0%, #FF8C42 100%)"
            : isBlocked ? "#FFF5F5" : "#FAF7F2",
          border: isBlocked ? "1px solid #FECACA" : isUser ? "none" : "1px solid #F3F4F6",
          color: isUser ? "#fff" : "#1A1714",
          fontSize: 13, lineHeight: 1.55,
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: isUser ? "0 2px 8px rgba(255,87,1,0.2)" : "none",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {content}
        </div>
        {/* CAREER OS TRANCHE 5: honest grounding strip — reflects the real
            profile fields that were actually included in this answer's
            context, not a model self-report. */}
        {!isUser && !isBlocked && groundingNote && (
          <div style={{
            fontSize: 10.5, color: "#9C9488", marginTop: 4, paddingLeft: 2,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {groundingNote}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Chip ─────────────────────────────────────────────────────
function Chip({ label, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={() => onClick(label)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "6px 11px", borderRadius: 99, border: "1px solid #E8E3DA",
        background: hov ? "#FFF1E8" : "#fff",
        borderColor: hov ? "#FF570150" : "#E8E3DA",
        color: hov ? "#FF5701" : "#3D3935",
        fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
        cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >{label}</button>
  )
}

// ── Main Widget ──────────────────────────────────────────────
export default function CopilotWidget({ user, userData }) {
  const [open,       setOpen]       = useState(false)
  const [messages,   setMessages]   = useState([])
  const [input,      setInput]      = useState("")
  const [loading,    setLoading]    = useState(false)
  const [thinkText,  setThinkText]  = useState("Thinking...")
  const [chips,      setChips]      = useState([])
  const [usage,      setUsage]      = useState(0)         // free questions used this month
  const [limitHit,   setLimitHit]   = useState(false)
  const [streamText, setStreamText] = useState("")
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const sid = useRef(sessionId())

  const tier = userData?.subscription || userData?.plan || "free"
  const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG.free
  const remaining = getRemainingQuestions(tier, usage)

  // Load monthly usage for free users
  useEffect(() => {
    if (!user?.id || tier !== "free") return
    const month = new Date().toISOString().slice(0, 7) + "-01"
    supabase
      .from("copilot_usage")
      .select("question_count")
      .eq("user_id", user.id)
      .eq("month", month)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setUsage(data.question_count)
        if (data?.question_count >= 5) setLimitHit(true)
      })
  }, [user?.id, tier])

  // Set suggestion chips from profile
  useEffect(() => {
    if (userData) setChips(getSuggestionChips({ ...userData, path_status: userData?.path || "student" }))
  }, [userData])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamText])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  // ── Groq call (via server-side proxy — see GROQ_PROXY comment above) ─────
  const callGroq = useCallback(async (msgs, model, maxTokens, temperature) => {
    const res = await fetch(GROQ_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        stream: true,
        messages: msgs,
      }),
    })
    if (!res.ok) throw new Error(`Groq error ${res.status}`)
    return res
  }, [])

  // ── Intent classifier ────────────────────────────────────────
  const classify = useCallback(async (message) => {
    // Fast-path: if the message clearly matches career keywords, skip the API call.
    // This prevents the small LLM from incorrectly blocking Capabilio-specific
    // terms like "Aura score", "ELO", "Arena", "Orbit", etc.
    if (isCareerFastPath(message)) return "CAREER"

    try {
      const res = await fetch(GROQ_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GROQ_MODELS.FAST,
          temperature: 0,
          max_tokens: 5,
          stream: false,
          messages: [
            { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
            { role: "user",   content: message },
          ],
        }),
      })
      const data = await res.json()
      const label = data.choices?.[0]?.message?.content?.trim().toUpperCase()
      return label === "BLOCKED" ? "BLOCKED" : "CAREER"
    } catch {
      return "CAREER"
    }
  }, [])

  // ── Increment usage in Supabase ──────────────────────────────
  const incrementUsage = useCallback(async () => {
    if (!user?.id || tier !== "free") return
    try {
      const month = new Date().toISOString().slice(0, 7) + "-01"
      const newCount = usage + 1
      await supabase.from("copilot_usage").upsert({
        user_id: user.id,
        month,
        question_count: newCount,
        last_used_at: new Date().toISOString(),
      }, { onConflict: "user_id,month" })
      setUsage(newCount)
      if (newCount >= 5) setLimitHit(true)
    } catch {}
  }, [user?.id, tier, usage])

  // ── Send message ─────────────────────────────────────────────
  const send = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput("")

    // Tier / limit check
    const { allowed } = canSendMessage(tier, usage)
    if (!allowed) { setLimitHit(true); return }

    // Add user message, remove the chip that was just clicked so it's not re-suggested
    setMessages(prev => [...prev, { role: "user", content: msg }])
    setChips(prev => prev.filter(c => c !== msg))
    setLoading(true)
    setStreamText("")

    try {
      // 1. Classify intent
      const intent = await classify(msg)
      const bucket = classifyBucket(msg)
      setThinkText(getThinkingText(tier, bucket))

      if (intent === "BLOCKED") {
        const suggestion = chips[0] || "Ask me about your career progress"
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `I'm your career copilot — that topic is outside what I can help with here.\n\nTry asking: "${suggestion}"`,
          isBlocked: true,
        }])
        setLoading(false)
        return
      }

      // CAREER OS TRANCHE 5 FIX: the real path field on userData is `.path`
      // (set in App.jsx: `const p = userData?.path || "student"`, checked
      // against "professional"/"authority"/"institution" throughout the app).
      // `.pathStatus`/`.path_status` are NOT real fields anywhere in this
      // codebase (confirmed via grep) — reading them here would have always
      // silently fallen back to "student", meaning every path-aware fix in
      // this file would never actually fire for real professional users.
      const path = userData?.path || "student"

      // 1b. Coach-intent pilot: "what should I do next" style questions go
      // through the MCP-backed /api/copilot/coach endpoint (real ELO/role/
      // weak-skills data via tool calls) instead of the direct-Groq path.
      // Falls through to the normal Groq flow below on ANY failure — this
      // must never be able to break the existing chat experience.
      //
      // CAREER OS TRANCHE 5: this endpoint's only tools (recommendNextChallenge,
      // getCurrentElo, getCurrentRole, getWeakSkills) are Arena/student-scoped —
      // getCurrentElo returns a raw ELO number and getWeakSkills is sourced from
      // Arena submissions. There is no professional-path equivalent yet, so
      // professional users must never be routed here (would both leak raw ELO
      // and recommend Arena challenges that don't apply to them). They fall
      // straight through to the Groq path below, which is now path-aware.
      if (isCoachIntent(msg) && path !== "professional") {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const jwt = session?.access_token
          if (jwt) {
            setThinkText(getThinkingText(tier, bucket))
            const res = await fetch(`${API}/api/copilot/coach`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jwt}` },
              body: JSON.stringify({ message: msg }),
            })
            if (res.ok) {
              const d = await res.json()
              if (d.text) {
                // This path calls real MCP tools server-side (current ELO,
                // role, weak skills, next-challenge recommendation) — the
                // grounding note here reflects that real tool use, not a
                // model self-report.
                setMessages(prev => [...prev, {
                  role: "assistant",
                  content: d.text,
                  groundingNote: "Based on: your live Arena ELO, role, and weak-skill signals (via Capabilio tools).",
                }])
                setLoading(false)
                await incrementUsage()
                setChips(getSuggestionChips({
                  ...userData,
                  path_status: path,
                  blended_elo: userData?.blended_elo || userData?.eloRating,
                }))
                return
              }
            }
            // Non-OK response or empty text — fall through to Groq below.
          }
        } catch {
          // Any error (network, auth, MCP unavailable) — fall through to the
          // existing Groq path so the user always gets an answer.
        }
      }

      // 2. Build prompts
      const systemP  = buildSystemPrompt()
      const policyP  = buildPolicyPrompt(tier, path)
      const contextP = buildContextPrompt({
        name:          userData?.name || userData?.displayName || user?.user_metadata?.full_name,
        job_role:      userData?.jobRole || userData?.job_role,
        domain:        userData?.domain,
        path_status:   path,
        plan:          tier,
        subscription:  tier,
        blended_elo:   userData?.blended_elo || userData?.eloRating || 600,
        aura_score:    userData?.auraScore || userData?.aura_score || 0,
        skills:        { core: userData?.skills || [] },
        timeline:      { personal_projects: userData?.projects || [] },
        career_events: userData?.careerEvents || [],
        arena_tasks:   userData?.arenaTasks || [],
        completeness_score: userData?.completeness_score || 0,
      })

      // 3. Build history (last N turns, exclude current user msg)
      const historyMsgs = messages
        .filter(m => !m.isBlocked)
        .slice(-tierCfg.historyTurns * 2)

      const groqMsgs = buildConversationMessages({
        systemPrompt:  systemP,
        policyPrompt:  policyP,
        contextPrompt: contextP,
        history:       historyMsgs,
        userMessage:   msg,
      })

      // 4. Call Groq (streaming)
      const res = await callGroq(
        groqMsgs,
        tierCfg.model,
        tierCfg.maxTokens,
        tierCfg.temperature
      )

      // 5. Stream response
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "))
        for (const line of lines) {
          const raw = line.slice(6)
          if (raw === "[DONE]") break
          try {
            const json = JSON.parse(raw)
            const token = json.choices?.[0]?.delta?.content || ""
            fullText += token
            setStreamText(fullText)
          } catch {}
        }
      }

      // 6. Post-filter
      let finalText = fullText
      if (!qualityCheck(finalText, tier) || hasDrift(finalText)) {
        finalText = FALLBACK_RESPONSE(userData?.name)
      }

      // Trim free tier to word limit
      if (tier === "free") {
        const words = finalText.split(" ")
        if (words.length > 130) {
          finalText = words.slice(0, 130).join(" ") + "…\n\n_Upgrade to Pro for the full picture._"
        }
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: finalText,
        groundingNote: buildGroundingNote({ ...userData, pathStatus: path }),
      }])
      setStreamText("")

      // 7. Increment usage
      await incrementUsage()

      // 8. Refresh chips
      setChips(getSuggestionChips({
        ...userData,
        path_status: path,
        blended_elo: userData?.blended_elo || userData?.eloRating,
      }))

    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Something went wrong. Please try again.",
      }])
      setStreamText("")
    } finally {
      setLoading(false)
    }
  }, [input, loading, tier, usage, chips, messages, userData, user, classify, callGroq, incrementUsage, tierCfg])

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isEmpty = messages.length === 0

  return (
    <>
      {/* Keyframe animation for dots */}
      <style>{`
        @keyframes capiDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes capiSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes capiSlideOut {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(100%); opacity: 0; }
        }
        @keyframes capiFadeIn {
          from { opacity: 0; transform: scale(0.92) translateY(6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Capi — Your Career Copilot"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9998,
          width: 52, height: 52, borderRadius: "50%",
          background: "linear-gradient(135deg, #FF5701 0%, #FF8C42 100%)",
          border: "none", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(255,87,1,0.45), 0 2px 8px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s, box-shadow 0.2s",
          transform: open ? "rotate(45deg) scale(0.95)" : "scale(1)",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = open ? "rotate(45deg) scale(1)" : "scale(1.08)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(255,87,1,0.55), 0 2px 10px rgba(0,0,0,0.18)" }}
        onMouseLeave={e => { e.currentTarget.style.transform = open ? "rotate(45deg) scale(0.95)" : "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(255,87,1,0.45), 0 2px 8px rgba(0,0,0,0.15)" }}
      >
        {open
          ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="white" strokeWidth="2.2" strokeLinecap="round"/></svg>
          : <span style={{ fontSize: 22, lineHeight: 1 }}>✦</span>
        }
      </button>

      {/* Chat drawer */}
      {open && (
        <div style={{
          position: "fixed", bottom: 88, right: 24, zIndex: 9997,
          width: 360, height: "min(560px, calc(100vh - 120px))",
          background: "#fff", borderRadius: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: "1px solid #F0F0F0",
          animation: "capiFadeIn 0.22s ease-out forwards",
        }}>

          {/* Header */}
          <div style={{
            padding: "13px 16px 12px",
            background: "linear-gradient(135deg, #FF5701 0%, #FF8C42 100%)",
            display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          }}>
            <CapiAvatar size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.2 }}>Capi</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontFamily: "'DM Sans', sans-serif" }}>Your Career Copilot</div>
            </div>
            {tier === "free" && !limitHit && (
              <div style={{
                background: "rgba(255,255,255,0.2)", borderRadius: 99,
                padding: "3px 9px", fontSize: 11, color: "#fff",
                fontFamily: "'DM Mono', monospace", fontWeight: 700,
              }}>
                {remaining}/5
              </div>
            )}
            {tier !== "free" && (
              <div style={{
                background: "rgba(255,255,255,0.2)", borderRadius: 99,
                padding: "3px 9px", fontSize: 11, color: "#fff",
                fontFamily: "'DM Mono', monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {tier}
              </div>
            )}
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0", scrollbarWidth: "thin", scrollbarColor: "#E8E3DA transparent" }}>

            {/* Welcome state */}
            {isEmpty && (
              <div style={{ animation: "capiFadeIn 0.3s ease-out" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
                  <CapiAvatar size={26} />
                  <div style={{
                    background: "#FAF7F2", border: "1px solid #F3F4F6",
                    borderRadius: "4px 16px 16px 16px", padding: "9px 13px",
                    fontSize: 13, lineHeight: 1.55, color: "#1A1714",
                    fontFamily: "'DM Sans', sans-serif", maxWidth: "80%",
                  }}>
                    Hi {userData?.name?.split(" ")[0] || "there"}! I know your Capabilio profile.
                    {userData?.path === "professional"
                      ? " Ask me anything about your career — skills, jobs, interviews, and more."
                      : " Ask me anything about your career — skills, jobs, ELO, interviews, and more."}
                  </div>
                </div>

                {/* Suggestion chips */}
                {chips.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, paddingLeft: 34 }}>
                    {chips.map((c, i) => <Chip key={i} label={c} onClick={send} />)}
                  </div>
                )}
              </div>
            )}

            {/* Conversation */}
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} isBlocked={m.isBlocked} groundingNote={m.groundingNote} />
            ))}

            {/* Streaming token */}
            {loading && !streamText && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
                <CapiAvatar size={26} />
                <div style={{ background: "#FAF7F2", border: "1px solid #F3F4F6", borderRadius: "4px 16px 16px 16px", padding: "10px 14px" }}>
                  <TypingDots label={thinkText} />
                </div>
              </div>
            )}
            {loading && streamText && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
                <CapiAvatar size={26} />
                <div style={{
                  background: "#FAF7F2", border: "1px solid #F3F4F6",
                  borderRadius: "4px 16px 16px 16px", padding: "9px 13px",
                  fontSize: 13, lineHeight: 1.55, color: "#1A1714",
                  fontFamily: "'DM Sans', sans-serif", maxWidth: "80%",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {streamText}
                  <span style={{ display: "inline-block", width: 2, height: 13, background: "#FF5701", marginLeft: 2, animation: "capiDot 0.8s ease-in-out infinite", borderRadius: 1, verticalAlign: "middle" }} />
                </div>
              </div>
            )}

            {/* Post-conversation chips (when not loading) */}
            {!loading && messages.length > 0 && chips.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, paddingLeft: 34 }}>
                {chips.map((c, i) => <Chip key={i} label={c} onClick={send} />)}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Limit hit state */}
          {limitHit ? (
            <div style={{ padding: "12px 14px 14px", borderTop: "1px solid #F3F4F6", flexShrink: 0, background: "#FFF8F5" }}>
              <div style={{ fontSize: 12, color: "#3D3935", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, marginBottom: 10 }}>
                <strong style={{ color: "#FF5701" }}>You've used all 5 free questions this month.</strong><br />
                Upgrade to Pro for unlimited career guidance.
              </div>
              <button
                onClick={() => {}} // wire to pricing page
                style={{
                  width: "100%", padding: "9px", borderRadius: 10,
                  background: "linear-gradient(135deg, #FF5701 0%, #FF8C42 100%)",
                  border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
                  fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(255,87,1,0.3)",
                }}
              >
                Upgrade to Pro →
              </button>
            </div>
          ) : (
            /* Input bar */
            <div style={{ padding: "10px 12px 12px", borderTop: "1px solid #F3F4F6", flexShrink: 0 }}>
              {tier === "free" && remaining === 1 && (
                <div style={{ fontSize: 11, color: "#EF4444", fontFamily: "'DM Sans', sans-serif", marginBottom: 6, paddingLeft: 2 }}>
                  1 question remaining this month
                </div>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading}
                  placeholder="Ask about your career..."
                  rows={1}
                  style={{
                    flex: 1, resize: "none", border: "1.5px solid #E8E3DA",
                    borderRadius: 12, padding: "9px 12px", fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif", color: "#1A1714",
                    outline: "none", lineHeight: 1.45, maxHeight: 96,
                    transition: "border-color 0.15s", background: loading ? "#FAF7F2" : "#fff",
                    overflow: "auto",
                  }}
                  onFocus={e => { e.target.style.borderColor = "#FF5701" }}
                  onBlur={e => { e.target.style.borderColor = "#E8E3DA" }}
                  onInput={e => {
                    e.target.style.height = "auto"
                    e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px"
                  }}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: "none",
                    background: (!input.trim() || loading)
                      ? "#F3F4F6"
                      : "linear-gradient(135deg, #FF5701 0%, #FF8C42 100%)",
                    color: (!input.trim() || loading) ? "#A8A29E" : "#fff",
                    cursor: (!input.trim() || loading) ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "all 0.15s",
                    boxShadow: (!input.trim() || loading) ? "none" : "0 2px 8px rgba(255,87,1,0.3)",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M13.5 7.5L1.5 1.5l2.5 6-2.5 6 12-6z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
              <div style={{ fontSize: 10, color: "#D6D0C8", textAlign: "center", marginTop: 7, fontFamily: "'DM Sans', sans-serif" }}>
                Career-scoped AI · Not a general assistant
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
