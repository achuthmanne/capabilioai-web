// Routes: POST /api/skill-studio/lesson, /learning-path  |  GET /youtube, /resources
//
// API allocation:
//   /lesson        → Gemini Flash (STICKY: generated once, cached until module complete)
//   /learning-path → Gemini Flash (STICKY: generated once per user profile snapshot)
//   /youtube       → YouTube Data API (primary) → Groq Fast fallback
//   /resources     → Groq Fast (quick link suggestions, not sticky)
//
// The AI Tutor chat (multi-turn) is served by /api/chat → Claude Haiku → Groq Fast
import { Router } from "express"
import { groq, GROQ_FAST }                                    from "../lib/groq.js"
import { geminiGenerateLesson, geminiGenerateLearningPath }   from "../lib/gemini.js"

const router = Router()

// ─── Lesson ──────────────────────────────────────────────────────────────────
// STICKY — generated once per topic/module, persists until user completes it.
// Gemini Flash: native JSON mode, free tier more than sufficient.
router.post("/lesson", async (req, res) => {
  const { topic="Python", jobTitle="Software Developer", skillLevel="Intermediate", duration=15 } = req.body
  try {
    const lesson = await geminiGenerateLesson({ topic, jobTitle, skillLevel, duration })
    console.log(`[skill-studio/lesson] Gemini: "${topic}" for ${skillLevel} ${jobTitle}`)
    return res.json(lesson)
  } catch (geminiErr) {
    console.warn(`[skill-studio/lesson] Gemini failed (${geminiErr.message}), falling back to Groq…`)
    try {
      const raw = await groq([
        { role: "system", content: "Generate structured micro-lessons for Indian tech professionals. Return ONLY valid JSON." },
        { role: "user",   content: `${duration}-min lesson on "${topic}" for ${skillLevel} ${jobTitle}.\nReturn JSON: {"title":"...","objective":"...","sections":[{"heading":"...","content":"...","codeExample":"..."}],"keyPoints":["..."],"quiz":[{"question":"...","options":["a","b","c","d"],"correct":0,"explanation":"..."}],"practiceTask":"...","nextTopics":["..."]}` },
      ], { max_tokens: 2000, json: true })
      return res.json(JSON.parse(raw))
    } catch (groqErr) {
      console.error("[skill-studio/lesson]", groqErr.message)
      res.status(500).json({ error: groqErr.message })
    }
  }
})

// ─── Learning Path ────────────────────────────────────────────────────────────
// STICKY — generated once per user profile snapshot, cached until skills change.
// Gemini Flash: handles the structured multi-phase output cleanly.
router.post("/learning-path", async (req, res) => {
  const { jobTitle="Developer", skillGraph=[], weakAreas=[], eloRating=800 } = req.body
  try {
    const path = await geminiGenerateLearningPath({ jobTitle, skillGraph, weakAreas, eloRating })
    console.log(`[skill-studio/learning-path] Gemini: ${jobTitle} ELO:${eloRating}`)
    return res.json(path)
  } catch (geminiErr) {
    console.warn(`[skill-studio/learning-path] Gemini failed (${geminiErr.message}), falling back to Groq…`)
    try {
      const raw = await groq([
        { role: "system", content: "Build personalised learning paths for Indian tech professionals. Return ONLY valid JSON." },
        { role: "user",   content: `Learning path for ${jobTitle} ELO ${eloRating}.\nWeak: ${weakAreas.slice(0,5).join(", ")}\nSkills: ${skillGraph.slice(0,8).map(s=>`${s.label||s.skill}:${s.value||s.score}%`).join(", ")}\n\nReturn JSON: {"phases":[{"phase":1,"title":"...","duration":"...","focus":"...","skills":["..."],"actions":[{"type":"learn|practice|prove","skill":"...","title":"...","level":"Beginner|Intermediate|Advanced","xp":50}]}],"totalDuration":"...","expectedEloGain":150,"milestones":["..."]}` },
      ], { max_tokens: 2000, json: true })
      return res.json(JSON.parse(raw))
    } catch (groqErr) {
      console.error("[skill-studio/learning-path]", groqErr.message)
      res.status(500).json({ error: groqErr.message })
    }
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
    const raw = await groq([{ role: "user", content: `Suggest ${maxResults} real YouTube videos for "${topic}" ${level} for a ${jobTitle}. Use real channels: freeCodeCamp, Traversy Media, Corey Schafer, Tech With Tim, Kunal Kushwaha, Apna College.\nReturn JSON: {"videos":[{"id":"<yt-id>","title":"...","channel":"...","description":"...","url":"https://youtube.com/watch?v=<id>"}]}` }], { model: GROQ_FAST, max_tokens: 600, json: true })
    return res.json(JSON.parse(raw))
  } catch (e) { console.error("[skill-studio/youtube]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── Resources ────────────────────────────────────────────────────────────────
// Groq Fast — quick link suggestions, low token count, not sticky
router.get("/resources", async (req, res) => {
  const { topic="Python", jobTitle="Developer", level="intermediate" } = req.query
  try {
    const raw = await groq([{ role: "user", content: `Best learning resources for "${topic}" ${level} for a ${jobTitle}. Use real sites: MDN, official docs, freeCodeCamp, GeeksForGeeks, LeetCode, HackerRank, Coursera.\nReturn JSON: {"resources":[{"title":"...","url":"<actual url>","type":"Documentation|Article|Practice|Course","description":"...","free":true}]}` }], { model: GROQ_FAST, max_tokens: 700, json: true })
    return res.json(JSON.parse(raw))
  } catch (e) { console.error("[skill-studio/resources]", e.message); res.status(500).json({ error: e.message }) }
})

export default router
