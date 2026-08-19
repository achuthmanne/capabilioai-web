/**
 * retryManager.js — Phase 2.7 (Enterprise AI Engine), Task 8.
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
 */
export async function executeWithRetry(attemptFn, { maxRetries = 2, timeoutMs = 20000, fallbackProvider = null } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(attemptFn(), timeoutMs)
    } catch (err) {
      lastErr = err
      if (!isRetryable(err) || attempt === maxRetries) break
      await sleep(500 * Math.pow(3, attempt)) // 500ms, 1500ms, 4500ms...
    }
  }

  if (fallbackProvider) {
    try {
      return await withTimeout(attemptFn(fallbackProvider), timeoutMs)
    } catch (fallbackErr) {
      lastErr = fallbackErr
    }
  }

  throw lastErr
}
