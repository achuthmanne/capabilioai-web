// ArenaCopilotPanel.jsx — Arena V2, embedded "Ask AI Copilot" chat panel
// ---------------------------------------------------------------------------
// Scope decision: this is a real Groq call grounded in this mission's real
// payload fields (ticket, prompt, checklist, dataset schema) — never a
// scripted/fake response. It reuses the exact same server-side proxy
// (POST /api/groq/chat, backend/server/routes/groqProxy.js) that
// CopilotWidget.jsx ("Capi") already uses, so the Groq API key never touches
// the client bundle here either — no new backend route needed, since that
// proxy is a thin, faithful passthrough of whatever `messages` array the
// client sends. What's new is only the system prompt (mission-grounded,
// not career-coaching) and this panel's embedded (not floating) chrome.
//
// Deliberately NOT wired to the student's live in-progress code yet — the
// code lives inside the workstation component (e.g. NotebookWorkstationV2),
// one layer below this shell, and threading it up here would mean a second
// prop-plumbing pass through every workstation for a v1. The system prompt
// says so explicitly to the model, so it never pretends to see code it
// hasn't been given. Fast-follow, not a blocker.
import { useCallback, useRef, useState } from "react"

const API = import.meta.env.VITE_API_URL || "https://capabilio-web.onrender.com"
const GROQ_PROXY = `${API}/api/groq/chat`
const MODEL = "llama-3.1-8b-instant"

function buildSystemPrompt({ role, skill, ticket, prompt, checklist, datasetSchemaDescription }) {
  const lines = [
    `You are the Arena Copilot, a hands-on technical mentor helping a ${role || "Capabilio"} learner work through a practice mission inside Capabilio Arena.`,
    `Answer the specific question asked. Give concrete, actionable guidance (syntax, approach, what to check next) — do not just restate the mission brief back at them.`,
    `Never write the full final solution for them outright; nudge and explain so they can write it themselves. Short answers (2-6 sentences, or a short code snippet) unless they ask for more detail.`,
    `You cannot see the student's current code or run results — if the question depends on that, ask them to paste the relevant snippet or error message.`,
  ]
  if (skill) lines.push(`Mission skill focus: ${skill}.`)
  if (ticket?.title) lines.push(`Ticket: ${ticket.title}${ticket.priority ? ` (${ticket.priority})` : ""}.`)
  if (prompt) lines.push(`Mission brief: ${prompt}`)
  if (Array.isArray(checklist) && checklist.length) lines.push(`Checklist: ${checklist.join(" | ")}`)
  if (datasetSchemaDescription) lines.push(`Dataset schema: ${datasetSchemaDescription}`)
  return lines.join("\n")
}

function Bubble({ role, content }) {
  const isUser = role === "user"
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 8 }}>
      <div style={{
        maxWidth: "88%", padding: "7px 11px", borderRadius: isUser ? "12px 12px 3px 12px" : "3px 12px 12px 12px",
        background: isUser ? "#4f46e5" : "#0f172a", border: isUser ? "none" : "1px solid #1e293b",
        color: isUser ? "#fff" : "#cbd5e1", fontSize: 12.5, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {content}
      </div>
    </div>
  )
}

/**
 * @param {{ role?: string, skill?: string, payload?: { ticket?: object, prompt?: string,
 *           checklist?: string[], datasetSchemaDescription?: string } }} props
 */
export default function ArenaCopilotPanel({ role, skill, payload = {} }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const listRef = useRef(null)

  const send = useCallback(async () => {
    const q = input.trim()
    if (!q || sending) return
    setInput("")
    setError(null)
    const nextMessages = [...messages, { role: "user", content: q }]
    setMessages(nextMessages)
    setSending(true)
    try {
      const systemPrompt = buildSystemPrompt({ role, skill, ...payload })
      const res = await fetch(GROQ_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.4,
          max_tokens: 400,
          stream: false,
          messages: [{ role: "system", content: systemPrompt }, ...nextMessages],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || data?.error || `Copilot request failed (${res.status})`)
      const reply = data?.choices?.[0]?.message?.content?.trim()
      if (!reply) throw new Error("Copilot returned an empty response")
      setMessages((m) => [...m, { role: "assistant", content: reply }])
    } catch (e) {
      setError(e.message || "Couldn't reach the Copilot — try again.")
    } finally {
      setSending(false)
      requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight })
    }
  }, [input, sending, messages, role, skill, payload])

  return (
    <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>AI Copilot</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", background: "#312e8122", padding: "1px 6px", borderRadius: 999 }}>BETA</span>
      </div>
      <div ref={listRef} style={{ padding: 10, maxHeight: 220, minHeight: 60, overflowY: "auto" }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 12, color: "#64748b" }}>Ask anything about this mission — a concept, a hint, or how to approach the next step.</div>
        )}
        {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
        {sending && <div style={{ fontSize: 12, color: "#64748b" }}>Thinking…</div>}
        {error && <div style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{error}</div>}
      </div>
      <div style={{ display: "flex", gap: 6, padding: 8, borderTop: "1px solid #1e293b" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask anything about this mission…"
          style={{ flex: 1, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "6px 10px", fontSize: 12.5, color: "#e2e8f0", outline: "none" }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          style={{ padding: "6px 12px", borderRadius: 8, fontWeight: 700, fontSize: 12, background: "#4f46e5", color: "#fff", border: "none", opacity: sending || !input.trim() ? 0.5 : 1, cursor: "pointer" }}
        >
          ➤
        </button>
      </div>
    </div>
  )
}
