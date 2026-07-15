# AI Coach — Production Validation Checklist

**Scope:** validates the MCP-backed coach pilot (`POST /api/copilot/coach`, `arena.recommendNextChallenge`, `elo.getScore`, `student.getCurrentRole`, `student.getWeakSkills`) against real accounts before wider rollout. Everything below requires live Supabase JWTs, real Arena/ELO history, and real `ANTHROPIC_API_KEY` spend — none of it is sandbox-checkable, which is why this is a separate document from the code-level smoke tests already run.

Run this once per environment (staging first, then production) and before every college cohort onboarding until the coach path has a stable track record.

---

## 1. Student AI Coach — correctness

For each test account, ask all four prompts in the same session and record the response verbatim.

| Prompt | What to verify | Pass criteria |
|---|---|---|
| "What should I practice next?" | Role detected correctly; recommendation matches student's actual domain | Recommended challenge's domain/workbench matches the student's real stream, not a default |
| "Why is my ELO 487?" (use the student's real number) | ELO explanation reflects real `by_dimension` / `history` data, not a generic explanation | Response references the actual tier/rank/dimension breakdown returned by `elo.getScore`, not invented numbers |
| "What are my weakest skills?" | Weak-skill list matches real low-pass-rate topics from recent submissions | Topics named exist in the student's actual submission history — cross-check against `/api/arena/v2/weak-topics/:uid` directly |
| "Recommend my next Arena challenge." | Challenge recommendation is solvable at the student's current difficulty band | Challenge exists in the catalog, is unsolved, and its difficulty is within the student's ELO band |

**How to falsify:** open the student's real dashboard (Arena stats, ELO page) in a second tab and diff every number Capi states against what's actually displayed. Any mismatch is a P0 — it means a tool is returning stale/wrong data or the model is inventing numbers despite the system prompt's instruction not to.

---

## 2. Cross-role validation

Repeat prompt set #1 with one real (or realistic seeded) account per stream:

- Embedded Engineer (ECE)
- Analog Layout Engineer (ECE)
- Mechanical Engineer
- Civil Engineer
- MBA
- Pharmacy
- Data Analyst (IT)

For each: confirm `student.getCurrentRole` resolves the correct `roleConfig` entry, and that the recommended challenge/workbench belongs to that role's domain — not silently defaulting to an IT/software challenge. This is the single most likely failure mode given the platform's IT-first history: watch specifically for non-IT streams getting IT-flavored advice.

**Pass criteria:** all 7 streams get advice that is domain-appropriate and would not confuse a non-software student.

---

## 3. Failure-mode validation

1. Set `ENABLE_MCP_COACH=false` in the real environment (staging first).
2. Ask a coach-intent question ("what should I do next") from a real logged-in session in the actual browser (not curl).
3. Confirm: the widget shows a normal Groq-backed answer, no visible error, no blank/broken state, no console errors.
4. Flip back to `true`, confirm coach answers resume.

This exact flag/fallback plumbing was already verified at the code level in-sandbox (503 in ~40ms, zero Claude/MCP invocation attempted when disabled). What can only be confirmed in production is that `CopilotWidget.jsx`'s existing non-2xx-triggers-Groq-fallback logic actually fires correctly end-to-end in a live browser session — the sandbox test proved the backend half, not the frontend half.

---

## 4. Logging verification

The `/coach` route now emits one structured `coach_invocation` JSON log line per call (userId, role, prompt preview, toolsUsed, latencyMs, success, failureReason, fallbackOccurred) — no new DB table, ships to stdout so it's captured by whatever the host already collects (Render logs, etc.).

Before rollout, confirm:
- Log lines are actually showing up in your log viewer for real requests.
- `toolsUsed` reflects real tool names per request (spot-check a few against what Capi actually said).
- `fallbackOccurred: true` entries correlate with real widget-visible fallbacks (cross-check a few against the failure-mode test above).

Once confirmed, these lines are enough to derive: AI success rate, MCP failure rate, tool usage frequency, average latency, and the most common student questions — without building a dedicated analytics backend (which, per the earlier MCP audit, doesn't exist yet and is explicitly out of scope for this pass).

---

## 5. Operational readiness (before college rollout, not more AI features)

- **Load test**: simulate concurrent coach requests at realistic cohort size (hundreds, not thousands, for a first rollout) — watch for MCP child-process contention (the stdio bridge is a single spawned process per backend instance; concurrent tool calls queue through one client).
- **Monitoring**: alert on `ENABLE_MCP_COACH` failure-rate spikes and on the groq-proxy's `GROQ_API_KEY not configured` / 502 paths.
- **Backups**: confirm Supabase backup/point-in-time-recovery is configured — unrelated to this pilot, but a prerequisite for any real cohort.
- **Security**: confirm the existing `aiLimiter` rate limiter is actually applied to `/api/copilot` and `/api/groq` in production config (it's wired in `backend/server.js` — verify the limiter's thresholds are appropriate for coach traffic, not just copied from another route).
- **Beta**: run this whole checklist against one real class before opening to a full college.

---

## Sign-off

| Section | Verified by | Date | Result |
|---|---|---|---|
| 1. Coach correctness | | | |
| 2. Cross-role validation | | | |
| 3. Failure-mode / fallback | | | |
| 4. Logging | | | |
| 5. Operational readiness | | | |
