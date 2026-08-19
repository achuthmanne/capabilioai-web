/**
 * responseValidator.js — Phase 2.7 (Enterprise AI Engine), Task 7.
 *
 * Every AI response gets JSON.parse'd and checked against a zod schema
 * (zod: new, small, justified dependency — no existing schema-validation
 * library was found anywhere in the codebase) before it reaches business
 * code. A malformed or shape-mismatched response is rejected with a
 * typed ValidationError, never silently passed through.
 *
 * This directly replaces the inconsistent pattern Phase 2.7's research
 * found scattered across the 29 pre-migration call sites: some guard
 * JSON.parse in a try/catch with a sensible fallback, some don't guard it
 * at all (a malformed response throws a raw, uninformative SyntaxError),
 * and some silently return {} / a fake default with no error signaled at
 * all (e.g. orbitPlans.js's paid report, fixed as part of this
 * migration). One consistent, typed failure mode replaces all three.
 */
import { z } from "zod"

export class ValidationError extends Error {
  constructor(message, { raw, issues } = {}) {
    super(message)
    this.name = "ValidationError"
    this.raw = raw
    this.issues = issues
  }
}

/** Strips an optional ``` ... ``` fence — the one defensive step every
 * existing wrapper already does. Was `` ```(?:json)? ``, which only
 * matched the literal word "json" or no tag at all — a model that fences
 * its JSON response as ```js/```javascript/```python (observed live,
 * scripts/generateNodeDomainMissions.mjs's Node mission generation) fell
 * straight through to JSON.parse() on a string starting with "```js",
 * guaranteed to fail. `\w*` accepts any (or no) language tag — a strictly
 * wider match than before, never narrower, so every prompt that already
 * worked keeps working. */
function stripFence(text) {
  const fenced = text.match(/```\w*\s*([\s\S]*?)```/)
  return fenced ? fenced[1] : text
}

/**
 * @param {string} rawText — the provider's raw text response
 * @param {import("zod").ZodType} schema
 * @returns {any} the parsed, schema-validated object
 * @throws {ValidationError}
 */
export function validateJSON(rawText, schema) {
  let parsed
  try {
    parsed = JSON.parse(stripFence(rawText).trim())
  } catch (err) {
    throw new ValidationError(`AI response was not valid JSON: ${err.message}`, { raw: rawText })
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new ValidationError(
      `AI response failed schema validation: ${result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      { raw: rawText, issues: result.error.issues }
    )
  }
  return result.data
}

/** Already-parsed input (e.g. geminiAdapter.extractFromImage's result) — schema-check without a JSON.parse step. */
export function validateShape(parsedValue, schema) {
  const result = schema.safeParse(parsedValue)
  if (!result.success) {
    throw new ValidationError(
      `AI response failed schema validation: ${result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      { raw: parsedValue, issues: result.error.issues }
    )
  }
  return result.data
}

export { z }
