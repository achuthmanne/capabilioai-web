// Route: POST /api/chat
// Claude Haiku → Groq fallback
// Claude gives more coherent multi-turn conversations for career coaching.

import { Router } from "express"
import { groq }   from "../lib/groq.js"
import { claude, CLAUDE_HAIKU } from "../lib/claude.js"

const router = Router()

router.post("/", async (req, res) => {
  const {
    prompt  = "",
    system  = "You are a helpful career AI assistant for Capabilio, India's ELO-based career platform. Be concise, practical, and specific to the Indian tech job market.",
    messages = null,
  } = req.body

  const msgs = messages || [{ role: "system", content: system }, { role: "user", content: prompt }]
  // Claude doesn't use system message the same way — separate it out
  const sysMsg  = msgs.find(m => m.role === "system")
  const userMsgs = msgs.filter(m => m.role !== "system")

  try {
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your_anthropic_key_here") {
      const text = await claude(userMsgs, {
        model:     CLAUDE_HAIKU,
        maxTokens: 1500,
        system:    sysMsg?.content || system,
      })
      return res.json({ text })
    }
  } catch (e) { console.warn("[chat] Claude failed, using Groq:", e.message) }

  // Groq fallback
  const text = await groq(msgs, { max_tokens: 1500 })
  return res.json({ text })
})

export default router
