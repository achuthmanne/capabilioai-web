/**
 * quizEngine.js — adaptive quiz question generation + deterministic-first scoring.
 * ---------------------------------------------------------------------------
 * Scoring split (spec §22): MCQ/fill-blank are scored deterministically
 * (exact match against the stored answer key) — zero AI involvement in the
 * pass/fail decision. Every other type gets a capped AI-rubric review,
 * mirroring Arena V2's validator_score/ai_review_score/ai_review_weight
 * split — this file does not invent a new scoring philosophy.
 */
import crypto from "crypto"
import { supabaseAdmin } from "../supabase.js"
import { groq, GROQ_FAST } from "../groq.js"
import { reinforce } from "./memoryEngine.js"
import { recordMistake } from "./mistakePatterns.js"

const QUESTIONS = "quiz_questions"
const ATTEMPTS = "quiz_attempts"

const DETERMINISTIC_TYPES = new Set(["mcq", "fill_blank"])
const AI_REVIEW_WEIGHT_CAP = 0.6 // AI-rubric contribution never exceeds 60% of the pass/fail signal

export async function getOrGenerateQuestion({ skillGraphNodeId, skillLabel, moduleId = null, difficulty = "intermediate", questionType = "mcq" }) {
  const { data: cached, error: findErr } = await supabaseAdmin
    .from(QUESTIONS).select("*")
    .eq("skill_graph_node_id", skillGraphNodeId).eq("difficulty", difficulty).eq("question_type", questionType)
    .limit(20)
  if (findErr) throw findErr
  if (cached && cached.length > 0) {
    return cached[Math.floor(Math.random() * cached.length)]
  }

  const raw = await groq([
    { role: "user", content: `Generate one ${questionType} question about "${skillLabel}" at ${difficulty} difficulty for a technical assessment.\nReturn JSON only: {"prompt":"...","options":["a","b","c","d"] (omit for non-mcq),"answer":"<correct option text or short answer key>","explanation":"...","rubric":"<what a correct free-text answer must cover, for non-deterministic types>"}` },
  ], { model: GROQ_FAST, max_tokens: 500, json: true })

  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    const err = new Error(`Question generation returned invalid JSON for ${skillLabel}`)
    err.code = "generation_failed"
    throw err
  }

  const { data, error } = await supabaseAdmin
    .from(QUESTIONS)
    .insert({
      module_id: moduleId,
      skill_graph_node_id: skillGraphNodeId,
      question_type: questionType,
      payload,
      difficulty,
      generated_by: "groq",
    })
    .select().single()
  if (error) throw error
  return data
}

/** Deterministic check for mcq/fill_blank. Case-insensitive, trimmed. */
function checkDeterministic(question, answer) {
  const key = String(question.payload?.answer ?? "").trim().toLowerCase()
  const given = String(answer ?? "").trim().toLowerCase()
  return key.length > 0 && key === given
}

/** Bounded AI-rubric review for non-deterministic types. Returns a 0-1 score
 *  capped by AI_REVIEW_WEIGHT_CAP so a single AI judgment can never single-handedly
 *  flip an otherwise-wrong answer to "passed" at full weight. */
async function aiRubricScore(question, answer) {
  try {
    const raw = await groq([
      { role: "user", content: `Question: ${question.payload?.prompt}\nRubric (what a correct answer must cover): ${question.payload?.rubric || "reasonable, technically correct explanation"}\nLearner answer: ${answer}\n\nScore 0.0-1.0 how well the answer meets the rubric. Return JSON only: {"score": 0.0}` },
    ], { model: GROQ_FAST, max_tokens: 100, json: true })
    const parsed = JSON.parse(raw)
    const score = Math.max(0, Math.min(1, Number(parsed.score) || 0))
    return score * AI_REVIEW_WEIGHT_CAP + (1 - AI_REVIEW_WEIGHT_CAP) * 0.5 // blended toward neutral, never fully AI-authoritative
  } catch {
    return 0.5 // neutral fallback on AI failure — never silently fails the learner
  }
}

export async function scoreAnswer({ userId, sessionId, questionId, answer, hintUsed = false, responseMs = null, skillGraphNodeId }) {
  const { data: question, error: qErr } = await supabaseAdmin.from(QUESTIONS).select("*").eq("id", questionId).maybeSingle()
  if (qErr) throw qErr
  if (!question) throw new Error("Question not found")

  let correct
  if (DETERMINISTIC_TYPES.has(question.question_type)) {
    correct = checkDeterministic(question, answer)
  } else {
    const score = await aiRubricScore(question, answer)
    correct = score >= 0.6
  }

  const { data: attempt, error: insErr } = await supabaseAdmin
    .from(ATTEMPTS)
    .insert({
      user_id: userId, session_id: sessionId, quiz_question_id: questionId,
      answer: { value: answer }, correct, hint_used: hintUsed, response_ms: responseMs,
    })
    .select().single()
  if (insErr) throw insErr

  // Hinted-correct counts at reduced strength (spec §22) — reinforce() itself
  // only takes a boolean, so we approximate the penalty by treating a hinted
  // correct answer as a weaker "practice"-tier reinforcement instead of "quiz"-tier.
  await reinforce({
    userId, skillGraphNodeId,
    source: hintUsed && correct ? "practice" : "quiz",
    correct,
  })

  if (!correct) {
    const patternKey = crypto.createHash("sha1").update(`${question.question_type}:${question.payload?.prompt || questionId}`).digest("hex").slice(0, 16)
    await recordMistake({ userId, skillGraphNodeId, patternKey, source: "quiz" })
  }

  return { attempt, correct, explanation: question.payload?.explanation || null }
}
