/**
 * prompts/registry.js — Phase 2.7 (Enterprise AI Engine), Tasks 5 + 6.
 *
 * Every AI prompt in Capabilio lives here — one place, no prompt strings
 * inside routes/components. Each entry carries id/version/owner/
 * description/variables/expected-output-format, so future prompt tuning
 * is "find the id in this registry," never "grep the codebase."
 *
 * This file only holds the registration mechanism. Real prompt entries
 * are added per feature area in sibling files (prompts/arena.js,
 * prompts/skillStudio.js, ...) as each migration batch actually moves a
 * call site — Batch 0 (infrastructure) intentionally registers zero real
 * prompts, per "no speculative implementations."
 */
const PROMPT_REGISTRY = new Map()

/**
 * @param {{
 *   id: string, version: number, owner: string, description: string,
 *   variables: string[], expectedOutputFormat: string,
 *   buildMessages?: (vars: object) => Array<{role: string, content: string}>,
 *   buildExtraction?: (vars: object) => {base64Image: string, mimeType: string, prompt: string},
 *   responseSchema?: import("zod").ZodType | null,
 *   defaultOpts: {capability: "generateText"|"extractFromImage"|"callWithTools", maxTokens?: number, temperature?: number, json?: boolean},
 * }} entry
 */
export function registerPrompt(entry) {
  const required = ["id", "version", "owner", "description", "variables", "expectedOutputFormat", "defaultOpts"]
  for (const field of required) {
    if (entry[field] === undefined) throw new Error(`Prompt registry entry missing required field "${field}"`)
  }
  if (!entry.buildMessages && !entry.buildExtraction) {
    throw new Error(`Prompt "${entry.id}" must provide buildMessages or buildExtraction`)
  }
  if (PROMPT_REGISTRY.has(entry.id)) {
    throw new Error(`Prompt id "${entry.id}" is already registered — ids must be unique (bump version on the existing entry instead of adding a duplicate id)`)
  }
  PROMPT_REGISTRY.set(entry.id, entry)
}

export function getPrompt(id) {
  const entry = PROMPT_REGISTRY.get(id)
  if (!entry) throw new Error(`No prompt registered with id "${id}" — check prompts/registry.js and its feature files`)
  return entry
}

export function listPrompts() {
  return [...PROMPT_REGISTRY.values()].map(({ id, version, owner, description }) => ({ id, version, owner, description }))
}

// Feature prompt files import registerPrompt and call it at module load —
// this aggregator imports each one so those registrations actually run.
// Empty in Batch 0; each migration batch adds its import here.
