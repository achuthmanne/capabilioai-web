// ─── AI Model Router ──────────────────────────────────────────────────────────
// Single source of truth for which model handles which task.
// Import the right client and call it — routes never hardcode models.
//
// Decision tree:
//   User sees the output directly + quality matters  → Claude
//   Need live web/job market data                   → Gemini + Google Search
//   Need to read a file (PDF/image)                 → Gemini multimodal
//   Fast generation, structured data, low cost      → Groq
//
// Path-specific escalation:
//   student      → Groq for generation, Claude Haiku for grading
//   professional → Claude Haiku for Forge grading, Claude Sonnet for analysis
//   executive    → Claude Sonnet for all content
//   institution  → Groq for bulk analytics, Claude Haiku for reports

import { groq, GROQ_BIG, GROQ_FAST }    from "./groq.js"
import { claude, CLAUDE_HAIKU, CLAUDE_SONNET, gradeSubmission, analyzeCareer } from "./claude.js"
import { gemini, geminiSearch, geminiExtractPDF } from "./gemini.js"

// ── Task routing map ──────────────────────────────────────────────────────────
export const TASK_MODEL = {
  // Extraction (reads files / web structure)
  "resume-extract":          "gemini-multimodal",
  "linkedin-normalize":      "gemini-text",
  "github-summarize":        "groq-70b",

  // Fast generation (user doesn't directly read AI output)
  "arena-task-generate":     "groq-70b",
  "forge-task-generate":     "groq-8b",
  "interview-question":      "groq-70b",
  "hint":                    "groq-8b",
  "job-match-score":         "groq-70b",
  "org-cohort-report":       "groq-70b",
  "mcq-generate":            "groq-70b",

  // Grading (user reads, quality matters)
  "arena-grade":             "claude-haiku",
  "forge-grade":             "claude-haiku",
  "interview-evaluate":      "claude-haiku",
  "professional-grade":      "claude-haiku",

  // Analysis (career intelligence, user pays for this)
  "career-analysis":         "claude-sonnet",
  "skill-gap-analysis":      "gemini-search",   // live Google Search grounding
  "market-signal":           "gemini-search",   // live job market data
  "orbit-intelligence":      "claude-sonnet",
  "exec-content":            "claude-sonnet",
  "resume-profile-analysis": "claude-sonnet",
}

// ── Unified call function ─────────────────────────────────────────────────────
export async function ai(taskType, payload) {
  const model = TASK_MODEL[taskType] || "groq-70b"

  switch (model) {
    case "groq-70b":
      return groq(payload.messages, { model: GROQ_BIG, ...payload.opts })

    case "groq-8b":
      return groq(payload.messages, { model: GROQ_FAST, max_tokens: 300, ...payload.opts })

    case "claude-haiku":
      return claude(payload.messages, { model: CLAUDE_HAIKU, ...payload.opts })

    case "claude-sonnet":
      return claude(payload.messages, { model: CLAUDE_SONNET, ...payload.opts })

    case "gemini-text":
      return gemini(payload.prompt, payload.opts)

    case "gemini-search":
      return geminiSearch(payload.prompt, payload.opts)

    case "gemini-multimodal":
      return geminiExtractPDF(payload.filePath, payload.prompt)

    default:
      return groq(payload.messages, { model: GROQ_BIG })
  }
}

// ── Named task helpers (used directly in routes) ──────────────────────────────
export { gradeSubmission, analyzeCareer, geminiSearch, geminiExtractPDF }
