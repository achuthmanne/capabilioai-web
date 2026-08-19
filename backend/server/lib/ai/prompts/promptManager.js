/**
 * prompts/promptManager.js — Phase 2.7 (Enterprise AI Engine), Tasks 5 + 6.
 * Renamed from registry.js in the architecture refinement pass
 * (Requirement 2: PromptManager is one of 7 clearly-separated, named
 * components) — API unchanged, file name only.
 *
 * Every AI prompt in Capabilio lives here — one place, no prompt strings
 * inside routes/components. Each entry carries id/version/owner/
 * description/variables/expected-output-format, so future prompt tuning
 * is "find the id in this registry," never "grep the codebase."
 *
 * This file only holds the registration mechanism. Real prompt entries
 * are added per feature area in sibling files (prompts/arena.js,
 * prompts/skillStudio.js, ...) as each migration batch actually moves a
 * call site.
 *
 * Designed so prompts could later move to Markdown/YAML without touching
 * business logic (Requirement 3): AIService only ever calls
 * `entry.buildMessages(vars)` polymorphically — it has no idea whether
 * that function interpolates a JS template literal (today's reality) or
 * renders a YAML-stored template string through a generic renderer (a
 * later evolution). The abstraction boundary is already `buildMessages`/
 * `buildExtraction`, not this file — moving prompt *content* to a data
 * format is a change to individual prompts/*.js files, never to
 * promptManager.js or aiService.js.
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
  if (!entry) throw new Error(`No prompt registered with id "${id}" — check prompts/promptManager.js and its feature files`)
  return entry
}

export function listPrompts() {
  return [...PROMPT_REGISTRY.values()].map(({ id, version, owner, description }) => ({ id, version, owner, description }))
}

// Feature prompt files (arena.js, ...) import registerPrompt/getPrompt
// FROM this file — they must never be imported back INTO this file (a
// promptManager.js -> arena.js -> promptManager.js cycle breaks the
// module's own PROMPT_REGISTRY const, which isn't hoisted the way the
// exported functions above are). See index.js for where feature files
// are actually aggregated — that file depends on this one, never the
// reverse.
