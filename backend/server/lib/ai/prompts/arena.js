/**
 * prompts/arena.js — Phase 2.7 Batch 1.
 *
 * Prompt text extracted VERBATIM from routes/arenaDomainRole.js's
 * generateAiFeedback() (unchanged since Phase 2.6) — not rewritten.
 * Retires Phase 2.6's local lib/domainRole/aiProvider.js seam onto the
 * platform-wide AIService, the first real migration proving the new
 * system end-to-end.
 */
import { registerPrompt } from "./promptManager.js"

registerPrompt({
  id: "arena.sqlFeedback",
  version: 1,
  owner: "arena-domain-role",
  description: "Best-effort AI *explanation* layered on top of an already-final, deterministic SQL mission score/passed/elo_delta — never decides the verdict itself. See routes/arenaDomainRole.js's evaluateMission/compareResults for the actual grading authority.",
  variables: ["prompt", "sql", "passed", "score", "reason", "actualSummary", "expectedSummary"],
  expectedOutputFormat: "Plain text, 2-3 short sentences — not JSON.",
  buildMessages: (vars) => [
    {
      role: "system",
      content: "You coach students on SQL mission attempts. In 2-3 short sentences, explain the result plainly — what their query did, and what values it actually returned vs. what was expected — using ONLY the facts given. Never invent a pass/fail verdict or a score; those are already decided and given to you as fact. If the result FAILED, your tone must be direct and unambiguous that it failed — never encouraging, never softened to sound like a near-success, never vague about whether it worked. If it PASSED, be genuinely positive and specific about what was done right.",
    },
    {
      role: "user",
      content: `Mission: ${vars.prompt}\nSubmitted SQL: ${vars.sql}\nResult: ${vars.passed ? "PASSED" : "FAILED"} (score ${vars.score}/100)\nDeterministic reason: ${vars.reason || "n/a"}\n${vars.actualSummary}\n${vars.expectedSummary}`,
    },
  ],
  responseSchema: null, // plain text, not JSON — nothing to validate against a schema
  // modelTier (not a raw model string) — see modelRegistry.js. This is
  // the exact bug the Phase 2.7 architecture refinement pass fixed: this
  // entry used to hardcode `model: GROQ_FAST` ("openai/gpt-oss-20b", a
  // Groq-specific ID) directly, which would have broken on any provider
  // other than Groq.
  defaultOpts: { capability: "generateText", modelTier: "fast", maxTokens: 150, temperature: 0.4, json: false },
})
