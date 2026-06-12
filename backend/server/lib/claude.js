// ─── Anthropic Claude client ──────────────────────────────────────────────────
// Use for tasks where output quality matters to the user directly:
//   - Arena / Forge submission grading  → claude-haiku-4-5 (fast, cheap, accurate)
//   - Career analysis, Orbit insights  → claude-sonnet-4-6 (best reasoning)
//   - Executive content generation     → claude-sonnet-4-6
//   - Professional profile analysis    → claude-sonnet-4-6

import Anthropic from "@anthropic-ai/sdk"

const client = () => {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key === "your_anthropic_key_here") throw new Error("ANTHROPIC_API_KEY not set in .env")
  return new Anthropic({ apiKey: key })
}

// ── Models ─────────────────────────────────────────────────────────────────────
export const CLAUDE_HAIKU  = "claude-haiku-4-5"        // grading: ~$0.00025/call
export const CLAUDE_SONNET = "claude-sonnet-4-6"       // analysis: ~$0.003/call

// ── Core call ─────────────────────────────────────────────────────────────────
export async function claude(messages, {
  model      = CLAUDE_HAIKU,
  maxTokens  = 1024,
  system     = null,
  json       = false,
} = {}) {
  const ai  = client()
  const res = await ai.messages.create({
    model,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages,
  })
  const text = res.content?.[0]?.text || ""
  if (json) {
    // Extract JSON from the response (Claude sometimes wraps in markdown)
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
    try { return JSON.parse(match?.[1] || text) }
    catch { return { raw: text } }
  }
  return text
}

// ── Grading helper — structured rubric output ─────────────────────────────────
// Used by arena.js and forge routes. Returns the same shape as the Groq grader
// so the frontend doesn't need to change.
export async function gradeSubmission({
  challengeTitle,
  scenario,
  expectedOutput,
  candidateAnswer,
  eloRating = 1000,
  taskType  = "technical",   // "technical" | "design" | "debug" | "quiz"
  fast      = false,         // true = use Haiku, false = use Haiku too (Sonnet for exec path)
}) {
  const model = fast ? CLAUDE_HAIKU : CLAUDE_HAIKU  // always Haiku for grading cost

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
