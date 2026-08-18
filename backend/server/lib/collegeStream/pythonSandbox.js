/**
 * pythonSandbox.js — Common Challenge Framework, "Notebook" workspace
 * ---------------------------------------------------------------------------
 * Runs a student's submitted Python source in a fresh `python3` subprocess
 * and captures stdout for comparison against an expected value.
 *
 * SECURITY MODEL — read before touching this file.
 * -----------------------------------------------------------------------
 * This is process-level isolation, NOT container/VM-level isolation. It
 * mitigates:
 *   - Runaway CPU/wall-clock (hard timeout, SIGKILL on expiry)
 *   - Runaway memory (ulimit -v)
 *   - Fork bombs (ulimit -u caps the student's process count)
 *   - Credential leakage (the subprocess gets a stripped env — PATH only,
 *     never the real process.env, which holds SUPABASE_SERVICE_ROLE_KEY,
 *     GROQ_API_KEY, RAZORPAY_KEY_SECRET, JWT secrets, etc.)
 *   - Output-based DoS (stdout is capped and the process is killed if it
 *     exceeds the cap)
 *
 * It does NOT provide:
 *   - Filesystem isolation — the subprocess runs with the same filesystem
 *     permissions as the Node process (inside whatever container/host that
 *     is). A sufficiently motivated submission could still read files the
 *     OS user can read.
 *   - Network isolation — Node's child_process has no way to block
 *     outbound network calls from a spawned process without OS-level
 *     firewalling or container network policy, neither of which this repo
 *     controls from application code.
 *
 * This was an explicit, informed trade-off (see the Common Challenge
 * Framework roadmap doc) — full container/VM isolation (gVisor, Firecracker,
 * a dedicated execution microservice) is the correct long-term answer and
 * is flagged as follow-up work, not silently deferred.
 *
 * The DANGEROUS_IMPORTS scan below is best-effort defense-in-depth, NOT a
 * security boundary — it can be bypassed by a determined attacker (e.g.
 * dynamic `__import__` tricks). Real safety here comes from the process
 * limits above, not from pattern-matching source code.
 */
import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

export class PythonSandboxError extends Error {}

// Thrown when the server-wide concurrency cap is already at capacity —
// distinct from PythonSandboxError so the route can map it to 503
// (transient capacity issue) instead of 500 (bug/misconfiguration).
export class PythonSandboxBusyError extends Error {}

const MAX_CODE_LENGTH = 20_000
const MAX_STDOUT_BYTES = 64 * 1024
const DEFAULT_TIMEOUT_MS = 5_000
const MEMORY_LIMIT_KB = 256 * 1024 // 256 MB address space
const CPU_LIMIT_SECONDS = 5
const MAX_PROCESSES = 16 // caps fork bombs; student code doesn't need more than the interpreter itself

// Server-wide concurrency cap on simultaneous python3 subprocesses. This
// Node process also serves the entire Capabilio platform (recruiter, jobs,
// everything) — nothing here bounds how many requests can arrive at once,
// so this cap is what stops a burst of code submissions from spawning
// unbounded subprocesses and starving the shared server's CPU/memory.
// Deliberately fails fast (503) rather than queueing: an unbounded queue
// just moves the pileup from "processes" to "pending promises" behind the
// same 35s request timeout in server.js, which is worse for debugging.
// ASSUMPTION (flagged for review): 4 is a conservative starting point for
// a small Render instance — tune upward with real capacity numbers once
// this is observed in production.
const MAX_CONCURRENT_EXECUTIONS = 4
let activeExecutions = 0

// Best-effort, not a boundary — see file header.
const DANGEROUS_PATTERNS = [
  /\bimport\s+os\b/, /\bimport\s+sys\b/, /\bimport\s+subprocess\b/, /\bimport\s+socket\b/,
  /\bimport\s+shutil\b/, /\bimport\s+ctypes\b/, /\bimport\s+importlib\b/, /\bimport\s+multiprocessing\b/,
  /\b__import__\s*\(/, /\bopen\s*\(/, /\beval\s*\(/, /\bexec\s*\(/,
]

let availabilityCache = null

/**
 * Checks once (cached) whether python3 is actually reachable in this
 * environment. Callers MUST check this before treating a submission as
 * gradeable — if python3 isn't available, the honest answer is "this
 * challenge type can't be scored right now", not a silent fake pass.
 */
export function checkPythonAvailable() {
  if (availabilityCache !== null) return availabilityCache
  try {
    const result = spawnSync("python3", ["--version"], { timeout: 3000 })
    availabilityCache = result.status === 0
  } catch {
    availabilityCache = false
  }
  return availabilityCache
}

/**
 * @param {string} code - student-submitted Python source
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<{ stdout: string, stderr: string, timedOut: boolean, exitCode: number|null }>}
 */
export function runPython(code, opts = {}) {
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS

  if (typeof code !== "string" || !code.trim()) {
    throw new PythonSandboxError("Code is empty.")
  }
  if (code.length > MAX_CODE_LENGTH) {
    throw new PythonSandboxError(`Code exceeds the ${MAX_CODE_LENGTH}-character limit.`)
  }

  return new Promise((resolve, reject) => {
    let dir
    try {
      dir = mkdtempSync(path.join(tmpdir(), "capabilio-py-"))
    } catch (e) {
      reject(new PythonSandboxError(`Sandbox setup failed: ${e.message}`))
      return
    }

    const scriptPath = path.join(dir, "submission.py")
    try {
      writeFileSync(scriptPath, code, { mode: 0o400 })
    } catch (e) {
      rmSync(dir, { recursive: true, force: true })
      reject(new PythonSandboxError(`Sandbox setup failed: ${e.message}`))
      return
    }

    // ulimit flags are applied inside the shell wrapper, to the process
    // bash then execs python3 into — NOT interpolating student code into
    // the shell string (the code lives in a file we already wrote with
    // restrictive permissions; only the fixed script path is referenced).
    //
    // BUG FIX (production incident, 2026-08-16): these were joined with
    // `&&`, so a single unsupported ulimit flag aborted the whole chain
    // BEFORE python3 ever ran — every submission failed with "(no output)"
    // regardless of code correctness. `ulimit -v` (virtual memory /
    // RLIMIT_AS) specifically is not supported by macOS's bash at all
    // ("cannot modify limit: Invalid argument"), which is exactly what a
    // local dev server on a Mac hits. Fix: `;` instead of `&&` so each
    // ulimit is best-effort and independent, plus `2>/dev/null` so a
    // failed ulimit's own error text never leaks into the captured stderr
    // a student sees. Resource limiting degrades gracefully per-platform
    // (Linux/Render: all three enforced; macOS dev: -t/-u still enforced,
    // -v silently skipped) — the wall-clock timeout and stdout cap in this
    // file are platform-independent and still apply everywhere regardless.
    const shellCmd = [
      `ulimit -v ${MEMORY_LIMIT_KB} 2>/dev/null`,
      `ulimit -t ${CPU_LIMIT_SECONDS} 2>/dev/null`,
      `ulimit -u ${MAX_PROCESSES} 2>/dev/null`,
      `exec python3 -I -B "${scriptPath}"`,
    ].join("; ")

    const child = spawn("bash", ["-c", shellCmd], {
      cwd: dir,
      env: { PATH: process.env.PATH || "/usr/bin:/bin" }, // stripped — no app secrets reach the subprocess
      timeout: timeoutMs,
      killSignal: "SIGKILL",
    })

    let stdout = ""
    let stderr = ""
    let stdoutTruncated = false

    child.stdout.on("data", chunk => {
      if (stdout.length >= MAX_STDOUT_BYTES) {
        stdoutTruncated = true
        child.kill("SIGKILL")
        return
      }
      stdout += chunk.toString()
    })
    child.stderr.on("data", chunk => {
      if (stderr.length < MAX_STDOUT_BYTES) stderr += chunk.toString()
    })

    let timedOut = false
    child.on("error", err => {
      rmSync(dir, { recursive: true, force: true })
      reject(new PythonSandboxError(`Failed to start sandbox: ${err.message}`))
    })
    child.on("close", (exitCode, signal) => {
      rmSync(dir, { recursive: true, force: true })
      if (signal === "SIGTERM" || signal === "SIGKILL") timedOut = timedOut || exitCode === null
      resolve({
        stdout: stdout.slice(0, MAX_STDOUT_BYTES),
        stderr: stderr.slice(0, MAX_STDOUT_BYTES),
        timedOut: timedOut || stdoutTruncated,
        exitCode,
      })
    })

    // node's child_process `timeout` option (Node 15+) sends killSignal
    // automatically, but we track it explicitly too for a clean message.
    const killTimer = setTimeout(() => {
      timedOut = true
      child.kill("SIGKILL")
    }, timeoutMs + 200)
    child.on("close", () => clearTimeout(killTimer))
  })
}

/**
 * Best-effort static scan — flags obviously dangerous patterns before even
 * spawning a process, mainly to give students a clear, fast error message
 * rather than a generic timeout/crash. NOT a security control (see file
 * header) — the process limits are the real defense.
 */
export function scanForDangerousPatterns(code) {
  return DANGEROUS_PATTERNS.some(re => re.test(code))
}

/**
 * @param {object} rubric - { type: "python_stdout_match", expected_stdout, timeout_ms? }
 * @param {string} code - student-submitted Python source
 * @returns {Promise<{ score: number, passed: boolean, stdout: string, stderr: string, error: string|null }>}
 */
export async function evaluatePythonStdout(rubric, code) {
  if (typeof rubric.expected_stdout !== "string") {
    throw new PythonSandboxError("python_stdout_match rubric requires a string 'expected_stdout'")
  }
  if (!checkPythonAvailable()) {
    throw new PythonSandboxError("Python execution isn't available in this environment.")
  }
  if (scanForDangerousPatterns(code)) {
    return { score: 0, passed: false, stdout: "", stderr: "", error: "Submission uses a disallowed operation (file/network/system access). Solve it with plain computation and print()." }
  }

  if (activeExecutions >= MAX_CONCURRENT_EXECUTIONS) {
    throw new PythonSandboxBusyError("Code execution is at capacity right now — please try again in a few seconds.")
  }

  activeExecutions++
  let stdout, stderr, timedOut, exitCode
  try {
    ;({ stdout, stderr, timedOut, exitCode } = await runPython(code, { timeoutMs: rubric.timeout_ms }))
  } finally {
    activeExecutions--
  }

  if (timedOut) {
    return { score: 0, passed: false, stdout, stderr, error: "Execution timed out or exceeded resource limits." }
  }
  if (exitCode !== 0) {
    return { score: 0, passed: false, stdout, stderr, error: stderr.trim() || `Process exited with code ${exitCode}.` }
  }

  const normalize = s => s.trim().replace(/\r\n/g, "\n")
  const isMatch = normalize(stdout) === normalize(rubric.expected_stdout)
  return { score: isMatch ? 100 : 0, passed: isMatch, stdout, stderr, error: null }
}
