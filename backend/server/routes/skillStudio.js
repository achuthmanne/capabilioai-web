// Routes: POST /api/skill-studio/lesson, /learning-path  |  GET /youtube, /resources
//
// API allocation:
//   /lesson        → Gemini Flash (STICKY: generated once, cached until module complete)
//   /learning-path → Gemini Flash (STICKY: generated once per user profile snapshot)
//   /youtube       → YouTube Data API (primary) → Groq Fast fallback
//   /resources     → Groq Fast (quick link suggestions, not sticky)
//
// The AI Tutor chat (multi-turn) is served by /api/chat → Claude Haiku → Groq Fast
//
// Phase 2.7 Batch 2: gemini->groq fallback for /lesson and /learning-path
// now handled by AIService/retryManager instead of this file's own
// try/catch (see prompts/skillStudio.js's skillStudio.legacyLesson and
// skillStudio.learningPath entries for the exact preserved prompt text).
import { Router } from "express"
import { AIService } from "../lib/ai/aiService.js"
// 2026-07-30 rate-limit incident fix: /api/skill-studio moved to the more
// generous skillStudioLimiter at the prefix level (server.js); these two
// routes actually spend AI-provider tokens, so they keep the stricter
// aiLimiter applied directly — see rateLimiters.js's header.
import { aiLimiter } from "../lib/rateLimiters.js"

const router = Router()

// ─── Lesson ──────────────────────────────────────────────────────────────────
// STICKY — generated once per topic/module, persists until user completes it.
router.post("/lesson", aiLimiter, async (req, res) => {
  const { topic="Python", jobTitle="Professional", skillLevel="Intermediate", duration=15 } = req.body
  try {
    const { data: lesson, provider } = await AIService.executePrompt("skillStudio.legacyLesson", { topic, jobTitle, skillLevel, duration })
    console.log(`[skill-studio/lesson] ${provider}: "${topic}" for ${skillLevel} ${jobTitle}`)
    return res.json(lesson)
  } catch (err) {
    console.error("[skill-studio/lesson]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Learning Path ────────────────────────────────────────────────────────────
// STICKY — generated once per user profile snapshot, cached until skills change.
router.post("/learning-path", aiLimiter, async (req, res) => {
  const { jobTitle="Developer", skillGraph=[], weakAreas=[], eloRating=800 } = req.body
  const skillsSummary = skillGraph.slice(0, 8).map(s => `${s.label || s.skill}:${s.value || s.score}%`).join(", ")
  const weakAreasSummary = weakAreas.slice(0, 5).join(", ")
  try {
    const { data: path, provider } = await AIService.executePrompt("skillStudio.learningPath", { jobTitle, skillsSummary, weakAreasSummary, eloRating })
    console.log(`[skill-studio/learning-path] ${provider}: ${jobTitle} ELO:${eloRating}`)
    return res.json(path)
  } catch (err) {
    console.error("[skill-studio/learning-path]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── YouTube Videos ───────────────────────────────────────────────────────────
// YouTube Data API (real results) → Groq Fast fallback (suggested IDs, not real search)
router.get("/youtube", async (req, res) => {
  const { topic="Python", jobTitle="Developer", level="intermediate", maxResults=4 } = req.query
  try {
    if (process.env.YOUTUBE_API_KEY) {
      const q     = encodeURIComponent(`${topic} ${jobTitle} ${level} tutorial India`)
      const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=${maxResults}&key=${process.env.YOUTUBE_API_KEY}&regionCode=IN&relevanceLanguage=en`)
      if (ytRes.ok) {
        const d = await ytRes.json()
        return res.json({ videos: (d.items||[]).map(i => ({ id: i.id.videoId, title: i.snippet.title, channel: i.snippet.channelTitle, thumbnail: i.snippet.thumbnails?.medium?.url||"", description: i.snippet.description?.slice(0,200)||"", url: `https://www.youtube.com/watch?v=${i.id.videoId}` })) })
      }
    }
    // Groq Fast fallback — generates plausible video suggestions
    const { data } = await AIService.executePrompt("skillStudio.youtubeSuggestions", { topic, level, jobTitle, maxResults })
    return res.json(data)
  } catch (e) { console.error("[skill-studio/youtube]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── Resources ────────────────────────────────────────────────────────────────
// Groq Fast — quick link suggestions, low token count, not sticky
router.get("/resources", async (req, res) => {
  const { topic="Python", jobTitle="Developer", level="intermediate" } = req.query
  try {
    const { data } = await AIService.executePrompt("skillStudio.resourceSuggestions", { topic, level, jobTitle })
    return res.json(data)
  } catch (e) { console.error("[skill-studio/resources]", e.message); res.status(500).json({ error: e.message }) }
})

export default router
