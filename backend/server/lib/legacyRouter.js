/**
 * legacyRouter.js
 * ---------------------------------------------------------------------------
 * Formerly router.js — a pre-Phase-2.7 "AI Model Router" (a TASK_MODEL
 * task->model-string dispatch table + an `ai(taskType, payload)` function).
 * Confirmed to have zero callers anywhere in this codebase before this
 * rename (checked via repo-wide grep for any import of this file, both
 * before Phase 2.7's lib/ai/ layer was built and again immediately before
 * this rename) — it was designed but never wired into any route.
 *
 * Superseded by backend/server/lib/ai/ (providerManager.js + modelRegistry.js
 * + promptManager.js + aiService.js), which does what this file's TASK_MODEL
 * map attempted but with two real fixes this file never had: (1) provider
 * selection and model selection are independent (this file's "groq-70b"/
 * "claude-haiku" strings conflate the two — an AIProviderManager-style
 * split wasn't possible here without a rewrite), and (2) config-driven
 * provider switching (one env var, not a code edit).
 *
 * Kept in place (not deleted) per explicit instruction, moved out of the
 * live import surface by name only — same "legacy" filename-prefix
 * convention already used by proofObjects/legacyBuilder.js elsewhere in
 * this codebase, rather than inventing a new legacy/ or archive/
 * directory structure this codebase doesn't otherwise have.
 */

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
