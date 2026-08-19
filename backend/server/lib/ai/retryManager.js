/**
 * retryManager.js — Phase 2.7 (Enterprise AI Engine), Task 8. Return
 * contract extended in the architecture refinement pass (Requirement 5:
 * every AI request needs a retryCount).
 *
 * Wraps a provider call with timeout, exponential-backoff retry, and
 * optional cross-provider fallback. This is a NEW, outer layer — not a
 * duplicate of lib/groq.js's existing internal 429 model-tier fallback
 * chain (GROQ_BIG -> GROQ_FAST), which stays exactly as-is and untouched.
 * That chain operates WITHIN Groq (same provider, cheaper model); this
 * layer operates ACROSS providers (e.g. Groq exhausted -> try OpenAI) and
 * adds a request-level timeout neither groq.js nor any other lib file has
 * today.
 *
 * Timeout value generalizes the two real timeout patterns found in this
 * codebase during Phase 2.7 research: hardwareChallenges.js's 15s and
 * pulseNexus.js's 12s Promise.race — 20s default sits above both as a
 * safe, real-precedent-backed number, not an arbitrary guess.
 *
 * Return shape: { result, retryCount, providerUsed, fallbackUsed }.
 * `result` is whatever attemptFn resolved to (a providerManager adapter
 * result, carrying its own `.provider`/`.model`). `retryCount` is EXTRA
 * attempts beyond the first — 0 on a clean first-try success, matching
 * the natural "how many times did we have to retry" reading for an ops
 * dashboard, not a raw 1-indexed attempt counter. `providerUsed` is read
 * straight off the successful result's own `.provider` field (set by
 * providerManager.js) rather than tracked independently here — this file
 * doesn't need to know provider names itself, just whether it fell back.
 *
 * Zero business-code callers — confirmed via a full-repo grep before this
 * change landed. Only aiService.js and this file's own test call
 * executeWithRetry, so this contract change is fully contained inside
 * lib/ai/.
 */
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

function isRetryable(err) {
  const status = err?.status
  if (status === 429) return true
  if (status >= 500 && status < 600) return true
  return /timeout|ECONNRESET|ETIMEDOUT|fetch failed/i.test(err?.message || "")
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`AI call timed out after ${timeoutMs}ms`)), timeoutMs)),
  ])
}

/**
 * @param {(providerOverride?: string) => Promise<any>} attemptFn — called
 *   with no args for the primary provider, or with a provider name string
 *   when falling back to a secondary provider.
 * @param {{maxRetries?: number, timeoutMs?: number, fallbackProvider?: string|null}} opts
 * @returns {Promise<{result: any, retryCount: number, providerUsed: string|null, fallbackUsed: boolean}>}
 */
export async function executeWithRetry(attemptFn, { maxRetries = 2, timeoutMs = 20000, fallbackProvider = null } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await withTimeout(attemptFn(), timeoutMs)
      return { result, retryCount: attempt, providerUsed: result?.provider ?? null, fallbackUsed: false }
    } catch (err) {
      lastErr = err
      if (!isRetryable(err) || attempt === maxRetries) break
      await sleep(500 * Math.pow(3, attempt)) // 500ms, 1500ms, 4500ms...
    }
  }

  if (fallbackProvider) {
    try {
      const result = await withTimeout(attemptFn(fallbackProvider), timeoutMs)
      return { result, retryCount: maxRetries, providerUsed: result?.provider ?? fallbackProvider, fallbackUsed: true }
    } catch (fallbackErr) {
      lastErr = fallbackErr
    }
  }

  throw lastErr
}
