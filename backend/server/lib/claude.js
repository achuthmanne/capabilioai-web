// ─── AI client (Groq-backed) ───────────────────────────────────────────────
// Historically backed by the Anthropic SDK; switched to Groq (2026-08-13) at
// the account owner's explicit request — this Capabilio deployment has Groq
// credits, not Anthropic credits, and Arena V2 grading was hard-failing in
// production on every submission (score 0 + a real ELO penalty) because the
// Anthropic account had run out of credit. See groq.js for the underlying
// client (model fallback chain on 429, native JSON mode) — already used
// successfully across a dozen other routes in this codebase.
//
// Every existing caller of claude() / gradeSubmission() / analyzeCareer()
// keeps working with ZERO changes to their own code — same function names,
// same call signature, same return contract (string, or a parsed object
// when json:true). Only the transport underneath changed.
//
// CLAUDE_HAIKU / CLAUDE_SONNET are kept as exported constants (many callers
// pass them as the `model` option) but no longer name real Claude models —
// they're semantic labels now mapped to Groq's top-quality model
// (llama-3.3-70b-versatile), not the fast/cheap 8B tier, so grading and
// analysis quality isn't silently downgraded just because a label still
// says "Haiku".
import { groq, GROQ_BIG } from "./groq.js"

// ── Models ─────────────────────────────────────────────────────────────────────
export const CLAUDE_HAIKU  = GROQ_BIG   // grading — kept as the highest-quality Groq model, not the fast tier
export const CLAUDE_SONNET = GROQ_BIG   // analysis — same model; Groq has no higher public tier today

// ── Core call ─────────────────────────────────────────────────────────────────
export async function claude(messages, {
  model      = CLAUDE_HAIKU,
  maxTokens  = 1024,
  system     = null,
  json       = false,
} = {}) {
  // Anthropic's Messages API takes `system` as a separate top-level field;
  // Groq's OpenAI-compatible endpoint expects it as a leading `system` role
  // message instead — this is the one real shape difference between the two
  // providers that callers here don't need to know about.
  const groqMessages = system ? [{ role: "system", content: system }, ...messages] : messages
  const text = await groq(groqMessages, { model, max_tokens: maxTokens, json })
  if (json) {
    // Groq's native json_object response_format is more reliable than
    // Claude's used to be, but keep the same defensive markdown-fence
    // stripping as before in case a model still wraps its output.
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
    try { return JSON.parse(match?.[1] || text) }
    catch { return { raw: text } }
  }
  return text
}

// ── Grading helper — structured rubric output ─────────────────────────────────
// Used by arena.js and forge routes. Returns the same shape as before so no
// caller (frontend included) needs to change.
export async function gradeSubmission({
  challengeTitle,
  scenario,
  expectedOutput,
  candidateAnswer,
  eloRating = 1000,
  taskType  = "technical",   // "technical" | "design" | "debug" | "quiz"
  fast      = false,         // kept for call-site compatibility; both paths use the same top-tier Groq model now
}) {
  const model = fast ? CLAUDE_HAIKU : CLAUDE_HAIKU  // always the top-tier model for grading

  const systemPrompt = `You are a senior engineer grading a technical submission.
Be direct, specific, and actionable. Never be vague.
The candidate's ELO rating is ${eloRating} — calibrate expectations accordingly.
Return ONLY valid JSON matching the exact schema requested.`

  const userPrompt = `Grade this ${taskType} submission:

CHALLENGE: ${challengeTitle}
SCENARIO: ${(scenario || "").slice(0, 800)}
EXPECTED: ${(expectedOutput || "").slice(0, 400)}
CANDIDATE ELO: ${eloRating}

ANSWER:
${(candidateAnswer || "").slice(0, 3000)}

Return this exact JSON (no markdown, no explanation outside the JSON):
{
  "score": <0-100 integer>,
  "eloGained": <0 if score<40, else 5-60 based on score and difficulty>,
  "passed": <true if score>=50>,
  "summary": "<2-3 sentence assessment of what they demonstrated>",
  "strength": "<one specific thing they did well>",
  "improve": "<one specific thing to fix, with example>",
  "codeQuality": <0-100>,
  "correctness": <0-100>,
  "efficiency": <0-100>,
  "suggestions": ["<actionable tip 1>", "<actionable tip 2>"],
  "nextChallenge": "<specific next challenge or topic they should tackle>"
}`

  return claude(
    [{ role: "user", content: userPrompt }],
    { model, maxTokens: 600, system: systemPrompt, json: true }
  )
}

// ── Career analysis helper ────────────────────────────────────────────────────
export async function analyzeCareer({ profile, submissions, domain, elo }) {
  return claude(
    [{
      role: "user",
      content: `Analyze this professional's career profile and provide strategic intelligence.

DOMAIN: ${domain}
ELO: ${elo}
RECENT SUBMISSIONS: ${submissions?.length || 0} arena challenges
PROFILE: ${JSON.stringify(profile || {}).slice(0, 1000)}

Return JSON:
{
  "marketValue": {"lo": <LPA>, "hi": <LPA>, "currency": "INR"},
  "layoffRisk": "low|medium|high",
  "layoffRiskReason": "<specific reason>",
  "topStrengths": ["<strength1>", "<strength2>", "<strength3>"],
  "criticalGaps": ["<gap1>", "<gap2>"],
  "nextAction": "<single most impactful action this week>",
  "careerStage": "junior|mid|senior|staff|principal",
  "sixMonthOutlook": "<2 sentence forward-looking statement>"
}`
    }],
    { model: CLAUDE_SONNET, maxTokens: 800, json: true }
  )
}
