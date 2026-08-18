// ─── Gemini AI client ─────────────────────────────────────────────────────────
// Handles:
//   1. Extraction — PDF/resume/LinkedIn parsing (multimodal, no search needed)
//   2. Market data — skill gap / job trend queries with Google Search grounding
// (Arena mission generation — DOMAIN_CONTEXT, resolveDomainContext,
// buildDomainPrompt, geminiGenerateMission — removed 2026-08-16 along with
// the rest of Arena, deleted for a from-scratch redesign. domainManifest.js
// was Arena-exclusive and has been deleted too.)

import { GoogleGenerativeAI } from "@google/generative-ai"
import { readFile } from "fs/promises"

const key = () => {
  const k = process.env.GEMINI_API_KEY
  if (!k || k === "your_gemini_key_here") throw new Error("GEMINI_API_KEY not set in .env")
  return k
}

const client = () => new GoogleGenerativeAI(key())

export const getGenModel = () => client().getGenerativeModel({ model: GEMINI_FLASH })

// ── Models ─────────────────────────────────────────────────────────────────────
const GEMINI_FLASH   = "gemini-2.5-flash"        // fast, free tier, supports search + PDF
const GEMINI_PRO     = "gemini-2.5-flash"        // use flash for everything on free tier

// ── 1. Plain text generation (no search) ──────────────────────────────────────
export async function gemini(prompt, {
  model      = GEMINI_FLASH,
  json       = false,
  maxTokens  = 2048,
} = {}) {
  const genai     = client()
  const genModel  = genai.getGenerativeModel({ model })
  const result    = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  })
  return result.response.text()
}

// ── 2. Live web search via Google Search grounding ────────────────────────────
// This is what replaces Perplexity — Gemini searches Google natively.
// Free tier: 1,500 requests/day, 15 rpm
export async function geminiSearch(prompt, { maxTokens = 2048 } = {}) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({
    model: GEMINI_FLASH,
    tools: [{ googleSearch: {} }],   // ← Google Search grounding
  })
  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens },
  })
  const text    = result.response.text()
  // Extract search grounding metadata if available
  const grounds = result.response.candidates?.[0]?.groundingMetadata?.searchEntryPoint
  return { text, sources: grounds || null }
}

// ── 3. PDF extraction (send file as base64) ───────────────────────────────────
// Gemini reads the actual PDF layout — columns, tables, logos — not just text.
export async function geminiExtractPDF(filePath, prompt) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_PRO })
  const fileData = await readFile(filePath)   // async — does not block event loop
  const base64   = fileData.toString("base64")

  const result = await genModel.generateContent({
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: "application/pdf", data: base64 } },
        { text: prompt },
      ],
    }],
    generationConfig: { maxOutputTokens: 4096, responseMimeType: "application/json" },
  })
  try { return JSON.parse(result.response.text()) }
  catch { return { raw: result.response.text() } }
}

// ── 4. Image/screenshot extraction ───────────────────────────────────────────
// gemini-2.5-flash supports PDF and image inline data — use it for both
export async function geminiExtractImage(base64Image, mimeType, prompt) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })
  const result   = await genModel.generateContent({
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt },
      ],
    }],
    generationConfig: { maxOutputTokens: 4096, responseMimeType: "application/json" },
  })
  try { return JSON.parse(result.response.text()) }
  catch { return { raw: result.response.text() } }
}


// ── 6. Assessment MCQ generation ──────────────────────────────────────────────
// Replaces Groq (was 8,000 tokens on the big model — extremely wasteful).
// Sticky: generated once per assessment session, stored client-side until submitted.
// Returns { questions: [...] }
export async function geminiGenerateMCQ({ jobTitle, count, domainSkills, mix, summaryLine, contextLine }) {
  const genai    = client()
  // Use gemini-2.0-flash for MCQ — stable, available on v1beta, no thinking tokens.
  // gemini-2.5-flash is a thinking model: burns most of 8192 tokens internally,
  // leaving almost nothing for JSON output → truncation.
  // gemini-1.5-flash is not available on v1beta API → 404.
  const genModel = genai.getGenerativeModel({ model: "gemini-2.0-flash" })

  const prompt = `Generate exactly ${count} fresher-level multiple-choice questions for an Indian tech assessment (Wipro/TCS/Infosys campus level).

Role: "${jobTitle}"
Skills to cover (use EXACTLY as category name):
${domainSkills.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Each skill needs at least ${Math.max(1, Math.floor(count / domainSkills.length))} question(s).
Type mix: mcq:${mix.mcq}, code_output:${mix.code_output}, problem_solving:${mix.problem_solving}, scenario:${mix.scenario}, fill_blank:${mix.fill_blank}
${summaryLine || ""}
${contextLine || ""}

CRITICAL RULES — EVERY question MUST follow these or it will be discarded:
1. "options" MUST be an array of EXACTLY 4 non-empty strings. NEVER omit this field.
2. Do NOT prefix options with "A)", "B)", "1.", etc. — plain text only.
3. "correct" is the 0-based index of the right answer (0, 1, 2, or 3).
4. "category" must be one of the exact skill names listed above.

QUESTION PHRASING RULES:
- NEVER start a question with "Write a..." or "Create a..." — those are open-ended, not MCQ.
- For code/config topics, phrase as: "Which of the following correctly..." or "What is the output of..." or "Which command/syntax..."
- For code_output type: show a short code snippet (≤6 lines) in the "question" field and ask "What is the output?" — options are the 4 possible outputs.
- For fill_blank type: use "___" in the question text, options are 4 completions.

BAD example (never do this):
  question: "Write a Dockerfile for a Node.js app"
  options: [] ← WRONG, will be discarded

GOOD example:
  question: "Which of the following Dockerfiles correctly creates a Node.js application image?"
  options: ["FROM node:18\\nWORKDIR /app\\nCOPY . .\\nRUN npm install\\nCMD [\\"node\\", \\"server.js\\"]", "FROM node:18\\nRUN npm install\\nCMD node server.js", "COPY . /app\\nFROM node:18\\nCMD node server.js", "FROM ubuntu\\nRUN apt install nodejs\\nCMD node server.js"]
  correct: 0

Return ONLY this JSON (no markdown, no extra text):
{
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "category": "<exact skill from list>",
      "question": "<question text — never 'Write a...' or 'Create a...'>",
      "options": ["<option 1>", "<option 2>", "<option 3>", "<option 4>"],
      "correct": 0,
      "explanation": "<2 sentences why the correct answer is right>"
    }
  ]
}`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 8192, responseMimeType: "application/json" },
  })

  const raw = result.response.text()
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Attempt recovery from truncated JSON: find last complete question object
    const lastComma = raw.lastIndexOf("},")
    if (lastComma > 0) {
      try { parsed = JSON.parse(raw.slice(0, lastComma + 1) + "]}") } catch { parsed = {} }
    }
    if (!parsed?.questions?.length) throw new Error(`Gemini returned unparseable JSON (length ${raw.length})`)
    console.warn(`[gemini-mcq] Partial JSON recovery: salvaged ${parsed.questions.length} questions`)
  }
  const questions = Array.isArray(parsed) ? parsed : (parsed.questions || [])
  if (!questions.length) throw new Error("Gemini returned no MCQ questions")
  return { questions }
}

// ── 7. Skill Studio lesson generation ─────────────────────────────────────────
// Sticky: generated once per topic, stored in frontend state / Supabase until
// the user marks the module complete.
// Skill Studio Phase 1 (2026-07-30) — richer lesson schema. Additive: every
// field from the original schema (title/objective/sections/keyPoints/quiz/
// practiceTask/nextTopics) is unchanged, so any code still reading only
// those fields keeps working. New fields (hook, worked_example,
// common_mistake, checkpoint_question, diagram_spec) are optional in every
// consumer (contentGenerator.blocksFromLesson, AIExplainPanel) — a provider
// that omits them degrades to the old lesson shape instead of breaking.
export async function geminiGenerateLesson({ topic, jobTitle, skillLevel, duration, remedial = false, missedTopics = [] }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const remedialNote = remedial
    ? `\n\nThis is a REMEDIAL re-teach — the learner just failed a verification quiz on: ${missedTopics.join(", ") || "this topic"}. Do not repeat the same explanation. Focus the "hook", "worked_example", and "common_mistake" specifically on why those exact points are commonly misunderstood, with one additional fully-worked numeric example.`
    : ""

  const prompt = `Generate a ${duration}-minute structured micro-lesson on "${topic}" for a ${skillLevel} ${jobTitle} in the Indian tech industry.${remedialNote}

Return JSON:
{
  "title": "...",
  "objective": "1 sentence learning goal",
  "hook": "1-2 sentences — why this matters, a real business reason, said conversationally",
  "sections": [
    { "heading": "...", "content": "2-3 paragraphs", "codeExample": "// code if relevant, else omit" }
  ],
  "worked_example": {
    "company": "a real, plausible Indian company (e.g. Swiggy, Zomato, Flipkart, Razorpay)",
    "scenario": "1-2 sentence real business scenario using this skill",
    "walkthrough": "step-by-step solution, numbered, ending in a concrete numeric/factual result"
  },
  "common_mistake": {
    "wrong": "a realistic wrong approach/code/answer a learner would actually write",
    "correct": "the corrected version",
    "why": "1-2 sentences on why the wrong version fails"
  },
  "checkpoint_question": { "prompt": "one quick comprehension check tied directly to the hook/example above", "answer": "short correct answer" },
  "diagram_spec": {
    "type": "flow | merge | comparison | hierarchy",
    "nodes": [ { "id": "n1", "label": "..." } ],
    "edges": [ { "from": "n1", "to": "n2", "label": "optional" } ],
    "steps": [ "1-4 short strings, each describing what becomes visible/highlighted at that reveal step" ]
  },
  "keyPoints": ["...", "..."],
  "quiz": [
    { "question": "...", "options": ["a","b","c","d"], "correct": 0, "explanation": "..." }
  ],
  "practiceTask": "1 hands-on exercise",
  "nextTopics": ["...", "..."]
}

diagram_spec must be small (max 6 nodes, max 4 steps) and directly illustrate the core concept — omit it only if the topic has no natural visual structure.`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2600, responseMimeType: "application/json" },
  })

  const parsed = JSON.parse(result.response.text())
  if (!parsed?.title) throw new Error("Gemini returned invalid lesson structure")
  return parsed
}

// Lightweight follow-up call for a remedial supplement ONLY — used when a
// learner fails the module quiz (see quizEngine.MODULE_PASS_THRESHOLD) and
// needs one more targeted example, not a full lesson regeneration. Kept
// separate from geminiGenerateLesson's remedial mode above so the "just give
// me one more example" path is fast/cheap and never touches the shared
// content cache (this content is per-learner, never persisted to the shared
// modules/module_content_blocks tables).
export async function geminiGenerateRemedialSupplement({ topic, jobTitle, skillLevel, missedTopics }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const prompt = `A ${skillLevel} ${jobTitle} just failed a quiz on "${topic}", missing: ${missedTopics.join(", ") || topic}.
Give them ONE more targeted, fully-worked example plus a short plain-language explanation that directly addresses those gaps — do not repeat generic background they already saw.

Return JSON:
{ "extra_explanation": "2-4 sentences, plain language, targeted at the missed points", "extra_example": { "scenario": "...", "walkthrough": "step-by-step, ending in a concrete result" } }`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 700, responseMimeType: "application/json" },
  })
  return JSON.parse(result.response.text())
}

// Revision content — flashcards / cheat sheet / interview questions,
// generated once per module and cached (see module_revision_content in
// contentGenerator.js) exactly like the lesson itself: shared across every
// learner studying the same (skill, level) tuple, never per-user.
export async function geminiGenerateRevisionContent({ topic, jobTitle, skillLevel }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const prompt = `Create revision material for "${topic}" for a ${skillLevel} ${jobTitle}.

Return JSON:
{
  "flashcards": [ { "front": "short question/term", "back": "short answer" } ] (5-8 items),
  "cheat_sheet": ["short punchy fact/formula/syntax line", "..."] (5-10 items),
  "interview_qs": [ { "question": "...", "answer_outline": "2-3 sentence model answer outline" } ] (3-5 items)
}`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1400, responseMimeType: "application/json" },
  })
  return JSON.parse(result.response.text())
}

// Phase 2a narration script — turns a module's ALREADY-GENERATED lesson
// content (hook/sections/worked_example/common_mistake/diagram_spec steps)
// into a short, timed spoken-narration script for the "Watch" tab. This is
// NOT a second content-generation pass — no new facts/examples are invented
// here, it only rephrases existing lesson content into natural spoken form.
// Segments are capped (6-8) and short (TTS-friendly, <350 chars) — each maps
// 1:1 to a diagram_spec step when tiedToStep is set, so the client can drive
// DiagramSpecView's animation off the audio queue's current segment index
// instead of needing precise audio-duration timestamps.
export async function geminiGenerateNarrationScript({ topic, jobTitle, skillLevel, lessonSummary, diagramSteps = [] }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const prompt = `You are narrating an existing lesson on "${topic}" for a ${skillLevel} ${jobTitle}, out loud, as a short spoken walkthrough (not reading text verbatim — natural spoken phrasing, contractions ok, second person "you").

Lesson content already written (do not invent new facts beyond this):
${lessonSummary}

${diagramSteps.length > 0 ? `The lesson has an animated diagram with these steps, in order: ${diagramSteps.map((s, i) => `(${i}) ${s}`).join(" | ")}` : "This lesson has no animated diagram."}

Return JSON:
{
  "segments": [
    { "text": "1-2 short spoken sentences, under 350 characters", "tiedToStep": <diagram step index this segment narrates, or null if not tied to a diagram step> }
  ]
}
Rules: first segment is a short spoken hook/intro (tiedToStep null). ${diagramSteps.length > 0 ? "Include exactly one segment per diagram step, tiedToStep matching that step's index, in the same order." : ""} Last segment is a short spoken wrap-up (tiedToStep null). 6-8 segments total.`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 900, responseMimeType: "application/json" },
  })
  return JSON.parse(result.response.text())
}

// ── 8. Skill Studio learning path generation ───────────────────────────────────
// Sticky: generated once per user profile, cached until skills change significantly.
export async function geminiGenerateLearningPath({ jobTitle, skillGraph, weakAreas, eloRating }) {
  const genai    = client()
  const genModel = genai.getGenerativeModel({ model: GEMINI_FLASH })

  const skillsSummary = (skillGraph || []).slice(0, 8)
    .map(s => `${s.label || s.skill}: ${s.value || s.score}%`).join(", ")

  const prompt = `Build a personalised learning path for an Indian tech professional.

Role: ${jobTitle} | ELO: ${eloRating}
Weak areas: ${(weakAreas || []).slice(0, 5).join(", ") || "fundamentals"}
Current skills: ${skillsSummary || "not provided"}

Return JSON:
{
  "phases": [
    {
      "phase": 1,
      "title": "...",
      "duration": "X weeks",
      "focus": "...",
      "skills": ["..."],
      "actions": [
        { "type": "learn|practice|prove", "skill": "...", "title": "...", "level": "Beginner|Intermediate|Advanced", "xp": 50 }
      ]
    }
  ],
  "totalDuration": "X weeks",
  "expectedEloGain": 150,
  "milestones": ["...", "..."]
}`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2000, responseMimeType: "application/json" },
  })

  const parsed = JSON.parse(result.response.text())
  if (!parsed?.phases) throw new Error("Gemini returned invalid learning path structure")
  return parsed
}
