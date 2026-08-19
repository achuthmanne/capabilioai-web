/**
 * prompts/skillStudio.js — Phase 2.7 Batch 2.
 *
 * Prompt text is the canonical (Gemini) wording from each feature's
 * primary path in lib/gemini.js — used for BOTH providers via
 * retryManager's cross-provider fallback (provider: "gemini",
 * fallbackProvider: "groq"), replacing each function's old manual
 * try/catch gemini-then-groq chain. Deliberate simplification, disclosed:
 * the old Groq fallback path used its own, slightly differently-worded
 * prompt asking for the same JSON schema — no test asserts on exact
 * wording (only on behavior: which path fired, response shape), so
 * unifying to one prompt text is safe and avoids doubling every entry.
 */
import { registerPrompt } from "./registry.js"
import { z } from "../responseValidator.js"

const DIAGRAM_SPEC_SCHEMA = z.object({
  type: z.string(),
  nodes: z.array(z.object({ id: z.string(), label: z.string() })),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional() })).optional(),
  steps: z.array(z.string()).optional(),
}).optional()

registerPrompt({
  id: "skillStudio.generateLesson",
  version: 1,
  owner: "skill-studio",
  description: "Full structured micro-lesson for a module (hook/sections/worked example/common mistake/checkpoint/diagram/quiz). Prompt text: lib/gemini.js's geminiGenerateLesson, the primary/canonical path.",
  variables: ["topic", "jobTitle", "skillLevel", "duration", "remedial", "missedTopics"],
  expectedOutputFormat: "JSON: {title, objective, hook?, sections[], worked_example?, common_mistake?, checkpoint_question?, diagram_spec?, keyPoints[], quiz[], practiceTask, nextTopics[]}",
  buildMessages: (v) => {
    const remedialNote = v.remedial
      ? `\n\nThis is a REMEDIAL re-teach — the learner just failed a verification quiz on: ${(v.missedTopics || []).join(", ") || "this topic"}. Do not repeat the same explanation. Focus the "hook", "worked_example", and "common_mistake" specifically on why those exact points are commonly misunderstood, with one additional fully-worked numeric example.`
      : ""
    return [{
      role: "user",
      content: `Generate a ${v.duration}-minute structured micro-lesson on "${v.topic}" for a ${v.skillLevel} ${v.jobTitle} in the Indian tech industry.${remedialNote}

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

diagram_spec must be small (max 6 nodes, max 4 steps) and directly illustrate the core concept — omit it only if the topic has no natural visual structure.`,
    }]
  },
  responseSchema: z.object({
    title: z.string(), objective: z.string(),
    hook: z.string().optional(),
    sections: z.array(z.object({ heading: z.string(), content: z.string(), codeExample: z.string().optional() })),
    worked_example: z.object({ company: z.string(), scenario: z.string(), walkthrough: z.string() }).optional(),
    common_mistake: z.object({ wrong: z.string(), correct: z.string(), why: z.string() }).optional(),
    checkpoint_question: z.object({ prompt: z.string(), answer: z.string() }).optional(),
    diagram_spec: DIAGRAM_SPEC_SCHEMA,
    keyPoints: z.array(z.string()),
    quiz: z.array(z.object({ question: z.string(), options: z.array(z.string()), correct: z.number(), explanation: z.string() })),
    practiceTask: z.string().nullable(),
    nextTopics: z.array(z.string()),
  }),
  defaultOpts: { capability: "generateText", provider: "gemini", fallbackProvider: "groq", maxTokens: 4200, json: true },
})

registerPrompt({
  id: "skillStudio.remedialSupplement",
  version: 1,
  owner: "skill-studio",
  description: "One extra targeted worked example after a learner fails a module quiz. Never persisted (per-learner, ephemeral). Prompt text: lib/gemini.js's geminiGenerateRemedialSupplement.",
  variables: ["topic", "jobTitle", "skillLevel", "missedTopics"],
  expectedOutputFormat: "JSON: {extra_explanation, extra_example: {scenario, walkthrough}}",
  buildMessages: (v) => [{
    role: "user",
    content: `A ${v.skillLevel} ${v.jobTitle} just failed a quiz on "${v.topic}", missing: ${(v.missedTopics || []).join(", ") || v.topic}.
Give them ONE more targeted, fully-worked example plus a short plain-language explanation that directly addresses those gaps — do not repeat generic background they already saw.

Return JSON:
{ "extra_explanation": "2-4 sentences, plain language, targeted at the missed points", "extra_example": { "scenario": "...", "walkthrough": "step-by-step, ending in a concrete result" } }`,
  }],
  responseSchema: z.object({
    extra_explanation: z.string(),
    extra_example: z.object({ scenario: z.string(), walkthrough: z.string() }),
  }),
  defaultOpts: { capability: "generateText", provider: "gemini", fallbackProvider: "groq", maxTokens: 700, json: true },
})

registerPrompt({
  id: "skillStudio.revisionContent",
  version: 1,
  owner: "skill-studio",
  description: "Flashcards/cheat-sheet/interview-questions revision bundle, cached per module. Prompt text: lib/gemini.js's geminiGenerateRevisionContent.",
  variables: ["topic", "jobTitle", "skillLevel"],
  expectedOutputFormat: "JSON: {flashcards[], cheat_sheet[], interview_qs[]}",
  buildMessages: (v) => [{
    role: "user",
    content: `Create revision material for "${v.topic}" for a ${v.skillLevel} ${v.jobTitle}.

Return JSON:
{
  "flashcards": [ { "front": "short question/term", "back": "short answer" } ] (5-8 items),
  "cheat_sheet": ["short punchy fact/formula/syntax line", "..."] (5-10 items),
  "interview_qs": [ { "question": "...", "answer_outline": "2-3 sentence model answer outline" } ] (3-5 items)
}`,
  }],
  responseSchema: z.object({
    flashcards: z.array(z.object({ front: z.string(), back: z.string() })),
    cheat_sheet: z.array(z.string()),
    interview_qs: z.array(z.object({ question: z.string(), answer_outline: z.string() })),
  }),
  defaultOpts: { capability: "generateText", provider: "gemini", fallbackProvider: "groq", maxTokens: 1400, json: true },
})

registerPrompt({
  id: "skillStudio.narrationScript",
  version: 1,
  owner: "skill-studio",
  description: "Spoken-narration script rephrasing an already-generated lesson's content for the 'Watch' tab. Prompt text: lib/gemini.js's geminiGenerateNarrationScript.",
  variables: ["topic", "jobTitle", "skillLevel", "lessonSummary", "diagramSteps"],
  expectedOutputFormat: "JSON: {segments: [{text, tiedToStep}]}",
  buildMessages: (v) => [{
    role: "user",
    content: `You are narrating an existing lesson on "${v.topic}" for a ${v.skillLevel} ${v.jobTitle}, out loud, as a short spoken walkthrough (not reading text verbatim — natural spoken phrasing, contractions ok, second person "you").

Lesson content already written (do not invent new facts beyond this):
${v.lessonSummary}

${(v.diagramSteps || []).length > 0 ? `The lesson has an animated diagram with these steps, in order: ${v.diagramSteps.map((s, i) => `(${i}) ${s}`).join(" | ")}` : "This lesson has no animated diagram."}

Return JSON:
{
  "segments": [
    { "text": "1-2 short spoken sentences, under 350 characters", "tiedToStep": "<diagram step index this segment narrates, or null if not tied to a diagram step>" }
  ]
}
Rules: first segment is a short spoken hook/intro (tiedToStep null). ${(v.diagramSteps || []).length > 0 ? "Include exactly one segment per diagram step, tiedToStep matching that step's index, in the same order." : ""} Last segment is a short spoken wrap-up (tiedToStep null). 6-8 segments total.`,
  }],
  responseSchema: z.object({
    segments: z.array(z.object({ text: z.string(), tiedToStep: z.number().nullable() })),
  }),
  defaultOpts: { capability: "generateText", provider: "gemini", fallbackProvider: "groq", maxTokens: 900, json: true },
})

registerPrompt({
  id: "skillStudio.quizQuestion",
  version: 1,
  owner: "skill-studio",
  description: "One quiz question (mcq/fill_blank/free-text) for a skill node, cached in quiz_questions after first generation. Groq-only in the original (no Gemini path) — preserved. Prompt text: quizEngine.js's getOrGenerateQuestion.",
  variables: ["skillLabel", "difficulty", "questionType"],
  expectedOutputFormat: 'JSON: {prompt, options? (mcq only), answer, explanation, rubric}',
  buildMessages: (v) => [{
    role: "user",
    content: `Generate one ${v.questionType} question about "${v.skillLabel}" at ${v.difficulty} difficulty for a technical assessment.\nReturn JSON only: {"prompt":"...","options":["a","b","c","d"] (omit for non-mcq),"answer":"<correct option text or short answer key>","explanation":"...","rubric":"<what a correct free-text answer must cover, for non-deterministic types>"}`,
  }],
  // Shape genuinely varies by question type (options present only for mcq) —
  // preserved as a loose-but-real schema rather than a no-op null, matching
  // the original's own minimal validation (JSON.parse succeeding was the
  // only check quizEngine.js did before this migration).
  responseSchema: z.object({
    prompt: z.string(),
    options: z.array(z.string()).optional(),
    answer: z.string(),
    explanation: z.string().optional(),
    rubric: z.string().optional(),
  }),
  defaultOpts: { capability: "generateText", provider: "groq", maxTokens: 500, json: true },
})

registerPrompt({
  id: "skillStudio.rubricScore",
  version: 1,
  owner: "skill-studio",
  description: "Bounded AI-rubric review for non-deterministic quiz question types (free-text/scenario) — the score is capped/blended toward neutral in quizEngine.js's aiRubricScore, never fully AI-authoritative. Prompt text: quizEngine.js's aiRubricScore.",
  variables: ["questionPrompt", "rubric", "answer"],
  expectedOutputFormat: "JSON: {score: number between 0.0 and 1.0}",
  buildMessages: (v) => [{
    role: "user",
    content: `Question: ${v.questionPrompt}\nRubric (what a correct answer must cover): ${v.rubric || "reasonable, technically correct explanation"}\nLearner answer: ${v.answer}\n\nScore 0.0-1.0 how well the answer meets the rubric. Return JSON only: {"score": 0.0}`,
  }],
  responseSchema: z.object({ score: z.number() }),
  defaultOpts: { capability: "generateText", provider: "groq", maxTokens: 100, json: true },
})

// ─── routes/skillStudio.js (V1) ────────────────────────────────────────────
// A confirmed parallel/drifting duplicate of skillStudio.generateLesson
// above (simpler schema — no hook/worked_example/common_mistake/
// checkpoint_question/diagram_spec). Kept as its own separate prompt
// entry rather than unified with the V2 one: forcing this route onto the
// richer schema would change its actual response shape, a real behavior
// change beyond what this migration batch does. Unifying these two lesson
// schemas is a genuine product decision, flagged, not made silently here.

registerPrompt({
  id: "skillStudio.legacyLesson",
  version: 1,
  owner: "skill-studio",
  description: "routes/skillStudio.js (V1) POST /lesson — simpler lesson schema than skillStudio.generateLesson. A known duplicate, preserved as-is rather than unified (see comment above).",
  variables: ["topic", "jobTitle", "skillLevel", "duration"],
  expectedOutputFormat: "JSON: {title, objective, sections[], keyPoints[], quiz[], practiceTask, nextTopics[]}",
  buildMessages: (v) => [
    { role: "system", content: "Generate structured micro-lessons for Indian tech professionals. Return ONLY valid JSON." },
    { role: "user", content: `${v.duration}-min lesson on "${v.topic}" for ${v.skillLevel} ${v.jobTitle}.\nReturn JSON: {"title":"...","objective":"...","sections":[{"heading":"...","content":"...","codeExample":"..."}],"keyPoints":["..."],"quiz":[{"question":"...","options":["a","b","c","d"],"correct":0,"explanation":"..."}],"practiceTask":"...","nextTopics":["..."]}` },
  ],
  responseSchema: z.object({
    title: z.string(), objective: z.string(),
    sections: z.array(z.object({ heading: z.string(), content: z.string(), codeExample: z.string().optional() })),
    keyPoints: z.array(z.string()),
    quiz: z.array(z.object({ question: z.string(), options: z.array(z.string()), correct: z.number(), explanation: z.string() })),
    practiceTask: z.string(),
    nextTopics: z.array(z.string()),
  }),
  defaultOpts: { capability: "generateText", provider: "gemini", fallbackProvider: "groq", maxTokens: 2000, json: true },
})

registerPrompt({
  id: "skillStudio.learningPath",
  version: 1,
  owner: "skill-studio",
  description: "routes/skillStudio.js POST /learning-path — personalized multi-phase learning path. Prompt text: lib/gemini.js's geminiGenerateLearningPath.",
  variables: ["jobTitle", "skillsSummary", "weakAreasSummary", "eloRating"],
  expectedOutputFormat: "JSON: {phases[], totalDuration, expectedEloGain, milestones[]}",
  buildMessages: (v) => [{
    role: "user",
    content: `Build a personalised learning path for an Indian tech professional.

Role: ${v.jobTitle} | ELO: ${v.eloRating}
Weak areas: ${v.weakAreasSummary || "fundamentals"}
Current skills: ${v.skillsSummary || "not provided"}

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
}`,
  }],
  responseSchema: z.object({
    phases: z.array(z.object({
      phase: z.number(), title: z.string(), duration: z.string(), focus: z.string(),
      skills: z.array(z.string()),
      actions: z.array(z.object({ type: z.string(), skill: z.string(), title: z.string(), level: z.string(), xp: z.number() })),
    })),
    totalDuration: z.string(),
    expectedEloGain: z.number(),
    milestones: z.array(z.string()),
  }),
  defaultOpts: { capability: "generateText", provider: "gemini", fallbackProvider: "groq", maxTokens: 2000, json: true },
})

registerPrompt({
  id: "skillStudio.youtubeSuggestions",
  version: 1,
  owner: "skill-studio",
  description: "routes/skillStudio.js GET /youtube — Groq fallback used only when YOUTUBE_API_KEY is unset or the real YouTube Data API call fails. Generates plausible (not live-searched) video suggestions.",
  variables: ["topic", "level", "jobTitle", "maxResults"],
  expectedOutputFormat: "JSON: {videos: [{id, title, channel, description, url}]}",
  buildMessages: (v) => [{
    role: "user",
    content: `Suggest ${v.maxResults} real YouTube videos for "${v.topic}" ${v.level} for a ${v.jobTitle}. Use real channels: freeCodeCamp, Traversy Media, Corey Schafer, Tech With Tim, Kunal Kushwaha, Apna College.\nReturn JSON: {"videos":[{"id":"<yt-id>","title":"...","channel":"...","description":"...","url":"https://youtube.com/watch?v=<id>"}]}`,
  }],
  responseSchema: z.object({
    videos: z.array(z.object({ id: z.string(), title: z.string(), channel: z.string(), description: z.string(), url: z.string() })),
  }),
  defaultOpts: { capability: "generateText", provider: "groq", maxTokens: 600, json: true },
})

registerPrompt({
  id: "skillStudio.resourceSuggestions",
  version: 1,
  owner: "skill-studio",
  description: "routes/skillStudio.js GET /resources — learning resource link suggestions, not sticky/cached.",
  variables: ["topic", "level", "jobTitle"],
  expectedOutputFormat: "JSON: {resources: [{title, url, type, description, free}]}",
  buildMessages: (v) => [{
    role: "user",
    content: `Best learning resources for "${v.topic}" ${v.level} for a ${v.jobTitle}. Use real sites: MDN, official docs, freeCodeCamp, GeeksForGeeks, LeetCode, HackerRank, Coursera.\nReturn JSON: {"resources":[{"title":"...","url":"<actual url>","type":"Documentation|Article|Practice|Course","description":"...","free":true}]}`,
  }],
  responseSchema: z.object({
    resources: z.array(z.object({ title: z.string(), url: z.string(), type: z.string(), description: z.string(), free: z.boolean() })),
  }),
  defaultOpts: { capability: "generateText", provider: "groq", maxTokens: 700, json: true },
})

registerPrompt({
  id: "skillStudio.interviewQuestions",
  version: 1,
  owner: "skill-studio",
  description: "routes/skillStudioV2.js POST /interview/generate — 4-question mock-interview set grounded in a just-studied module/skill.",
  variables: ["mode", "skillLabel"],
  expectedOutputFormat: "JSON: {questions: [{type, prompt}]}",
  buildMessages: (v) => [{
    role: "user",
    content: `Generate a ${v.mode} mock-interview question set (4 questions) for a candidate who just studied "${v.skillLabel}".\nReturn JSON only: {"questions":[{"type":"technical|debugging|architecture|behavioral","prompt":"..."}]}`,
  }],
  responseSchema: z.object({
    questions: z.array(z.object({ type: z.string(), prompt: z.string() })),
  }),
  defaultOpts: { capability: "generateText", provider: "groq", maxTokens: 800, json: true },
})
