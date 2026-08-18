/**
 * aiProvider.js — Phase 2.6 (Arena Architecture Upgrade), Task 6:
 * Provider Abstraction.
 *
 * A clean, swappable seam around the one AI call Domain Role makes
 * (generateAiFeedback's coaching note) — no migration today, only a
 * stable interface so a second provider could be added later without
 * touching the call site in routes/arenaDomainRole.js.
 *
 * One real implementation: groqProvider, wrapping lib/groq.js's shared
 * groq() client unchanged. Per this project's standing "abstract after
 * the second/third real implementation" rule, no other provider (Bedrock,
 * Claude, Nova, OpenAI, Gemini, local LLM) gets a stub here — a named-but-
 * unimplemented provider isn't a real interface, it's dead code with a
 * false promise (same reasoning as every other registry this phase).
 *
 * Deliberately scoped to Domain Role only. lib/groq.js itself is shared
 * by ~28 other backend files and is NOT touched — a codebase-wide
 * provider abstraction is unrequested scope far beyond what this call
 * site needs.
 *
 * Interface: generateText(messages, opts) -> Promise<string> — matches
 * groq()'s own existing return contract exactly (always a string, never
 * throws in the normal path; the caller here still does its own
 * try/catch + null-on-empty, unchanged).
 */
import { groq, GROQ_FAST } from "../groq.js"

export const groqProvider = {
  name: "groq",
  generateText: (messages, opts) => groq(messages, { model: GROQ_FAST, ...opts }),
}

// The provider currently wired into Domain Role's AI feedback. Swapping
// providers later means pointing this constant at a different object
// implementing the same generateText(messages, opts) shape — no other
// file changes.
export const domainRoleAIProvider = groqProvider
