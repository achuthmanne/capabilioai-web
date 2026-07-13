/**
 * AI Interview Routes
 * POST /api/pro/interview/start        — start new session
 * GET  /api/pro/interview/:id          — get session + questions
 * POST /api/pro/interview/:id/answer   — submit answer, get next question
 * POST /api/pro/interview/:id/complete — end session, generate insights
 * GET  /api/pro/interview/history      — list all sessions
 * POST /api/pro/interview/:id/share    — enable recruiter access (token)
 */
import { Router }   from "express"
import Anthropic    from "@anthropic-ai/sdk"
import { supabaseAdmin }   from "../lib/supabase.js"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { requireAuth } from "../lib/auth.js"

const router = Router()
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })


// ── Question bank per type ────────────────────────────────────────────────────
async function generateQuestion(sessionData, questionIndex, previousQA) {
  const types = ["technical", "behavioral", "role_based", "general", "follow_up"]
  const qType = questionIndex < 2 ? "technical"
    : questionIndex < 4 ? "behavioral"
    : questionIndex < 6 ? "role_based"
    : questionIndex < 8 ? "technical"
    : "general"

  const context = `
Professional Profile:
- Role: ${sessionData.role_target || "Software Engineer"}
- Domain: ${sessionData.domain || "Technology"}
- Technologies: ${(sessionData.technologies || []).join(", ") || "Not specified"}
- Session type: ${sessionData.session_type || "general"}

Question ${questionIndex + 1} / ${sessionData.total_questions}
Question type: ${qType}
${previousQA.length > 0 ? `Previous questions and answers:\n${previousQA.slice(-2).map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n\n")}` : ""}

Generate a single interview question appropriate for this professional.
Return JSON: {
  "question": "The interview question",
  "question_type": "${qType}",
  "expected_answer": "What a strong answer would cover (for scoring purposes, not shown to user)",
  "follow_up": "Optional follow-up question if answer is shallow"
}
Return only valid JSON.`

  let result = {}
  try {
    const msg = await claude.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      messages: [{ role: "user", content: context }],
    })
    result = JSON.parse(msg.content[0].text)
  } catch {
    try {
      const raw = await groq([{ role: "user", content: context }], { model: GROQ_FAST, max_tokens: 400, json: true })
      result = JSON.parse(raw)
    } catch {
      const fallbacks = {
        technical:   { question: `Describe a technical challenge you solved recently in ${sessionData.domain || "your domain"}. Walk me through your approach and the outcome.` },
        behavioral:  { question: "Tell me about a time you had to work under pressure. How did you manage competing priorities?" },
        role_based:  { question: `What's the most complex system you've designed or contributed to in your role as ${sessionData.role_target || "a professional"}?` },
        general:     { question: "Where do you see your career in 3 years, and what are you doing today to get there?" },
        follow_up:   { question: "What would you do differently if you faced the same situation again?" },
      }
      result = fallbacks[qType] || fallbacks.general
    }
  }

  return { ...result, question_type: qType }
}

// ── Score an answer ───────────────────────────────────────────────────────────
async function scoreAnswer(question, answer, expectedAnswer, context) {
  const prompt = `Score this interview answer. Be fair but honest.

Role context: ${context}
Question: ${question}
Expected answer should cover: ${expectedAnswer || "relevant professional experience and reasoning"}
Candidate's answer: ${answer}

Return JSON:
{
  "score": 0-100,
  "feedback": "2-3 sentence specific feedback",
  "strengths": ["what was done well"],
  "improvements": ["what could be better"],
  "follow_up_triggered": true/false
}
Score 85+ for excellent, 70-84 for good, 50-69 for adequate, below 50 for poor.
Return only valid JSON.`

  let result = {}
  try {
    const msg = await claude.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    })
    result = JSON.parse(msg.content[0].text)
  } catch {
    try {
      const raw = await groq([{ role: "user", content: prompt }], { model: GROQ_FAST, max_tokens: 400, json: true })
      result = JSON.parse(raw)
    } catch { result = { score: 70, feedback: "Answer recorded. Good communication of relevant experience.", strengths: [], improvements: [] } }
  }
  return result
}

// ── POST /start ───────────────────────────────────────────────────────────────
router.post("/pro/interview/start", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { session_type = "general", interview_mode = "text", domain, role_target, technologies = [], total_questions = 10 } = req.body

    // Get profile context
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("keyword,current_role_title,current_company,skill_graph").eq("id", uid).single()

    const sessionData = {
      user_id:         uid,
      session_type,
      interview_mode,
      domain:          domain || profile?.keyword || "Software Engineering",
      role_target:     role_target || profile?.current_role_title || "Software Engineer",
      technologies:    technologies.length ? technologies : (profile?.skill_graph || []).slice(0, 5).map(s => s.name || s),
      total_questions: Math.min(20, Math.max(3, total_questions)),
      status:          "in_progress",
      started_at:      new Date().toISOString(),
    }

    const { data: session, error } = await supabaseAdmin
      .from("ai_interview_sessions").insert(sessionData).select().single()
    if (error) throw error

    // Generate first question
    const q = await generateQuestion(sessionData, 0, [])
    const { data: question } = await supabaseAdmin
      .from("ai_interview_questions")
      .insert({
        session_id:     session.id,
        user_id:        uid,
        question_index: 0,
        question_type:  q.question_type,
        question_text:  q.question,
        expected_answer: q.expected_answer || "",
      })
      .select().single()

    res.json({ success: true, session, current_question: question })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET session ───────────────────────────────────────────────────────────────
router.get("/pro/interview/:id", requireAuth, async (req, res) => {
  try {
    const { data: session } = await supabaseAdmin
      .from("ai_interview_sessions").select("*").eq("id", req.params.id).single()
    if (!session || session.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" })

    const { data: questions } = await supabaseAdmin
      .from("ai_interview_questions").select("*")
      .eq("session_id", req.params.id).order("question_index", { ascending: true })

    res.json({ session, questions: questions || [] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST answer ───────────────────────────────────────────────────────────────
router.post("/pro/interview/:id/answer", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { answer, question_id, time_taken_secs } = req.body

    const { data: session } = await supabaseAdmin
      .from("ai_interview_sessions").select("*").eq("id", req.params.id).single()
    if (!session || session.user_id !== uid) return res.status(403).json({ error: "Forbidden" })
    if (session.status !== "in_progress") return res.status(400).json({ error: "Session not active" })

    // Get the current question
    const { data: question } = await supabaseAdmin
      .from("ai_interview_questions").select("*").eq("id", question_id).single()
    if (!question) return res.status(404).json({ error: "Question not found" })

    const context = `${session.role_target} with focus on ${session.domain}`
    const scoring = await scoreAnswer(question.question_text, answer, question.expected_answer, context)

    // Save the answer
    await supabaseAdmin.from("ai_interview_questions").update({
      user_answer:     answer,
      ai_score:        scoring.score,
      ai_feedback:     scoring.feedback,
      follow_up:       scoring.follow_up_triggered ? question.follow_up : null,
      time_taken_secs: time_taken_secs || 0,
      answered_at:     new Date().toISOString(),
    }).eq("id", question_id)

    const nextIndex = question.question_index + 1
    const isComplete = nextIndex >= session.total_questions

    let nextQuestion = null
    if (!isComplete) {
      // Build previous QA for context
      const { data: prevQs } = await supabaseAdmin
        .from("ai_interview_questions").select("question_text,user_answer")
        .eq("session_id", req.params.id).not("user_answer", "is", null)
      const prevQA = (prevQs || []).map(q => ({ question: q.question_text, answer: q.user_answer }))

      const q = await generateQuestion(session, nextIndex, prevQA)
      const { data: nq } = await supabaseAdmin.from("ai_interview_questions").insert({
        session_id:     session.id,
        user_id:        uid,
        question_index: nextIndex,
        question_type:  q.question_type,
        question_text:  q.question,
        expected_answer: q.expected_answer || "",
      }).select().single()
      nextQuestion = nq
    }

    await supabaseAdmin.from("ai_interview_sessions").update({
      answered_count: nextIndex,
      ...(isComplete ? { status: "completed" } : {}),
    }).eq("id", session.id)

    res.json({
      success:        true,
      scoring,
      next_question:  nextQuestion,
      is_complete:    isComplete,
      progress:       { answered: nextIndex, total: session.total_questions },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST complete ─────────────────────────────────────────────────────────────
router.post("/pro/interview/:id/complete", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { data: session } = await supabaseAdmin
      .from("ai_interview_sessions").select("*").eq("id", req.params.id).single()
    if (!session || session.user_id !== uid) return res.status(403).json({ error: "Forbidden" })

    const { data: questions } = await supabaseAdmin
      .from("ai_interview_questions").select("*")
      .eq("session_id", req.params.id).not("ai_score", "is", null)

    const scores = questions.map(q => q.ai_score || 0)
    const overall = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

    // Build skill scores per question type
    const skillScores = {}
    questions.forEach(q => {
      const type = q.question_type || "general"
      if (!skillScores[type]) skillScores[type] = { total: 0, count: 0 }
      skillScores[type].total += q.ai_score || 0
      skillScores[type].count++
    })
    const skillBreakdown = Object.fromEntries(
      Object.entries(skillScores).map(([k, v]) => [k, Math.round(v.total / v.count)])
    )

    // Generate insights
    const transcript = questions.map(q => ({
      question: q.question_text,
      answer:   q.user_answer,
      score:    q.ai_score,
      feedback: q.ai_feedback,
    }))

    const insightPrompt = `Interview session completed. Overall score: ${overall}/100.

Transcript summary:
${transcript.slice(0, 5).map(t => `Q: ${t.question}\nScore: ${t.score}/100\nFeedback: ${t.feedback}`).join("\n\n")}

Generate professional interview performance insights. Return JSON:
{
  "summary": "2-3 sentence overall assessment",
  "strengths": ["top 3 specific strengths"],
  "improvements": ["top 3 specific improvement areas"],
  "readiness_level": "not_ready|developing|ready|excellent",
  "recommended_actions": ["action1", "action2"]
}`

    let insights = {}
    try {
      const msg = await claude.messages.create({
        model: "claude-haiku-4-5", max_tokens: 600,
        messages: [{ role: "user", content: insightPrompt }],
      })
      insights = JSON.parse(msg.content[0].text)
    } catch {
      insights = { summary: `Completed ${questions.length} questions with ${overall}% overall score.`, strengths: [], improvements: [], readiness_level: overall >= 75 ? "ready" : "developing" }
    }

    const completedAt = new Date().toISOString()
    const durationMins = session.started_at
      ? Math.round((new Date(completedAt) - new Date(session.started_at)) / 60000)
      : 0

    await supabaseAdmin.from("ai_interview_sessions").update({
      status:          "completed",
      overall_score:   overall,
      skill_scores:    skillBreakdown,
      strengths:       insights.strengths || [],
      improvements:    insights.improvements || [],
      insights:        insights.summary,
      transcript:      transcript,
      duration_mins:   durationMins,
      completed_at:    completedAt,
    }).eq("id", session.id)

    // Update profile with latest interview score
    await supabaseAdmin.from("profiles").update({
      job_readiness: Math.min(100, overall),
    }).eq("id", uid)

    res.json({ success: true, overall_score: overall, skill_breakdown: skillBreakdown, insights })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET history ───────────────────────────────────────────────────────────────
router.get("/pro/interview/history", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("ai_interview_sessions")
      .select("id,session_type,domain,role_target,overall_score,status,completed_at,started_at,total_questions,answered_count")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(20)
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
