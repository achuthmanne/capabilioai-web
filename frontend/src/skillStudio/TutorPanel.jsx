/**
 * TutorPanel — multi-turn AI tutor chat, scoped to this module's content.
 * Routes through the EXISTING /api/chat (Claude Haiku -> Groq fallback) —
 * no second chat pipeline (spec §18).
 */
import { useState } from "react"
import { chatApi } from "../lib/api"
import { D, sectionLabel } from "./tokens"

export default function TutorPanel({ skillLabel, moduleOverview }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!input.trim()) return
    const userMsg = { role: "user", content: input }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput("")
    setLoading(true)
    try {
      const system = `You are an AI tutor inside Capabilio Skill Studio, helping a learner with "${skillLabel}". Module context: ${moduleOverview?.objective || "general concepts"}. Be concise and concrete.`
      const { text } = await chatApi.send([...next], system)
      setMessages([...next, { role: "assistant", content: text }])
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry, I couldn't respond just now — try again in a moment." }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 340 }}>
      <div style={{ ...sectionLabel, marginBottom: 10 }}>AI Tutor</div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {messages.length === 0 && <div style={{ fontSize: 12, color: D.muted }}>Ask anything about {skillLabel} — this tutor knows what you&apos;re studying right now.</div>}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "85%", padding: "8px 12px", borderRadius: 12,
            background: m.role === "user" ? D.indigo + "15" : D.glass,
            fontSize: 12, color: D.text1, whiteSpace: "pre-wrap",
          }}>{m.content}</div>
        ))}
        {loading && <div style={{ fontSize: 11, color: D.muted }}>Thinking…</div>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask the tutor…" style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${D.border}`, fontFamily: "inherit", fontSize: 12 }} />
        <button onClick={send} disabled={loading} style={{
          padding: "8px 14px", borderRadius: 10, border: "none", background: D.indigo, color: "#fff",
          fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>Send</button>
      </div>
    </div>
  )
}
