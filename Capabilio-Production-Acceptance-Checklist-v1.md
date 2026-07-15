# Capabilio Production Acceptance Checklist v1.0

Every release — bug fix, new Arena domain, new AI feature — should pass this before it reaches students. Supersedes the earlier `AI-Coach-Production-Validation-Checklist.md`, which is now folded in as Section 3.

**Before you run this:** two sections below (4 and 5) surface real gaps found while grounding this document in the actual codebase, not hypothetical risks. Read those callouts before scheduling a college rollout — they change what "pass" can honestly mean right now.

---

## 1. End-to-end Student Journey

Real routes/pages as they exist today (no react-router — `App.jsx` does manual `window.location.pathname` + `currentPage` state routing):

| Step | Real page/component | Route |
|---|---|---|
| Landing → role selection | `LandingPage.jsx` → `AccountType.jsx` | `/` |
| Signup | `AuthModal` (in `App.jsx`) | — |
| Onboarding | `Onboarding.jsx` | — |
| Aura (skill graph) | `pages/Aura.jsx` | `currentPage=aura` |
| Arena | `pages/Arena.jsx` | `currentPage=arena`/`challenges` |
| Skill Studio | `pages/SkillStudio.jsx` | `currentPage=skillstudio` |
| AI Coach / Copilot | `Orbit.jsx` + `CopilotWidget.jsx` | `currentPage=orbit` |
| Launchpad | `pages/Launchpad.jsx` | `currentPage=launchpad`/`timemarket` |
| Public profile | `pages/Portfolio.jsx` | `/portfolio/:username` |

**Known gap — flag, don't skip:** there is no dedicated frontend page for **AI Interview** (it's backend-only, `backend/server/routes/aiInterview.js`, with no `Interview.jsx`) and no **Vault** page/component anywhere in `frontend/src/pages`. If the journey is supposed to include those as named steps, they either need a UI built or need to be struck from this checklist until they exist — don't sign off on a step that has no page to click through.

For every remaining step, record: page load time, console errors (must be zero), network/API failures, mobile responsiveness (if the page is meant to support it).

---

## 2. Arena Validation

Run per real stream category (from `frontend/src/config/roleConfig.js`, 30 role_ids grouped into 8 stream categories — **use this list, not a generic one**): IT, Medical, ECE, EEE, Mechanical, Civil, Pharmacy, MBA.

Pick one representative role_id per stream (e.g. `frontend` for IT, `embedded` for ECE, `power_engineer` for EEE, `mechanical_design` for Mechanical, `structural_engineer` for Civil, `pharmacy`, `mba`, `medical`) and verify per role:

- Correct Arena domain/workbench loads (`arena.getWorkbenchForRole` — already a verified MCP tool)
- Correct challenge pool for that domain
- Challenge submission works (`POST /api/arena/v2/challenges/:id/submit`)
- ELO updates (`GET /api/arena/v2/elo/:uid` reflects the new submission)
- Proof artifact generated
- Aura updated

**Note:** Vault update can't be checked as a UI step (see Section 1 gap) — check it at the data layer (`GET /api/arena/v2/proof-artifacts/:uid`) until a Vault page exists.

---

## 3. AI Coach Validation (from the earlier pilot doc, unchanged)

**3a. Correctness** — ask each real test account: "What should I practice next?", "Why is my ELO [real number]?", "What are my weakest skills?", "Recommend my next Arena challenge." Falsify by diffing every number Capi states against the student's real Arena/ELO dashboard in a second tab. Any mismatch is P0.

**3b. Cross-role** — repeat 3a for one account per real stream (IT, Medical, ECE, EEE, Mechanical, Civil, Pharmacy, MBA — corrected list, see Section 2). Watch specifically for non-IT streams getting IT-flavored advice — the platform's history skews IT-first.

**3c. Failure-mode** — set `ENABLE_MCP_COACH=false` in the real environment, ask a coach question from a live logged-in browser session, confirm a clean Groq-backed answer with no visible error. Already verified at the code level (503 in ~40ms, zero Claude/MCP calls attempted when disabled); this step confirms the frontend fallback fires in a real browser, which the sandbox couldn't test.

**3d. Logging** — `/coach` now emits a `coach_invocation` log line per call (userId, role, prompt preview, toolsUsed, latency, success, fallbackOccurred). Confirm these are actually visible in your log viewer and spot-check a few against real Capi transcripts.

---

## 4. Recruiter Validation — **currently BLOCKED, not just unverified**

Real pages: `pages/Nexus.jsx` (candidate directory), `pages/RecruiterDashboard.jsx`, `pages/HiringPipeline.jsx`, `pages/JobPostings.jsx`.

This is not a "run the checklist and see" section — I checked the actual component and found a real gap: **`HiringPipeline.jsx` (lines ~53-90) renders from a hardcoded `ALL_CANDIDATES` array of fictional names, not live Supabase data.** There is also no candidate-comparison or proof/vault-view component anywhere in `frontend/src/pages` — the backend tools for it exist (`recruiter.getCandidateVault` in the MCP layer, wired to the real `/api/arena/v2/recruiter/proof/:uid` route), but nothing in the frontend calls them yet.

**What this means for rollout:** recruiter-facing candidate profile/comparison/proof views are not production-ready — a recruiter using `HiringPipeline.jsx` today would see fake candidates, not real ones. Search (`Nexus.jsx`) may be real (queries `/api/nexus/search`) — verify that specifically, separately from the pipeline view.

**Recommendation:** don't include recruiter candidate-pipeline validation in a college go/no-go gate until `HiringPipeline.jsx` is rewired to real data. Flagging this now rather than writing a checklist item that implies it's already checkable.

---

## 5. College Validation — **currently BLOCKED, not just unverified**

Real pages: `pages/InstitutionOS.jsx` (shell — genuinely queries Supabase tables `org_members`/`org_tasks`/`org_events`/`org_opportunities`/`org_audit_log`) and `pages/OrgIntelligence.jsx` (the placement-officer analytics screen it routes into).

**`OrgIntelligence.jsx` is entirely hardcoded fake data** — `DEPARTMENTS`, `TOP_STUDENTS`, `PLACEMENT_FUNNEL` arrays and literal KPI strings (e.g. "924" avg ELO, "38%" job ready, "67" placements, "1,200" total students), with zero fetch/query calls. A placement officer opening this screen today sees numbers that have nothing to do with their actual college's students.

**What this means for rollout:** student counts, department analytics, leaderboards, and placement-readiness numbers are not real yet. This is squarely the "Group B" work already scoped out of the MCP pass (college/analytics tools were deliberately left `NOT_IMPLEMENTED` because no aggregate backend exists) — this finding confirms the frontend has the same gap, not just the MCP layer.

**Recommendation:** do not demo `OrgIntelligence.jsx` to a real placement officer as-is — it will show fabricated numbers as if they were real. Either build the real aggregate backend + wire the page, or clearly label the screen as a preview/mockup until then.

---

## 6. Load & Performance

Real limits already enforced in `backend/server.js`:

```
generalLimiter: 100 req/min  → all /api/*
aiLimiter:       20 req/min  → /api/arena, /api/arena/v2, /api/skill-studio,
                                /api/chat, /api/voice, /api/copilot, /api/groq
strictLimiter:   10 req/min  → /api/verify
```

Design load tests around these, not against them: e.g. "50 AI Coach requests" needs to be spread across enough distinct users/time to stay under 20/min per source if the limiter keys by IP/user — confirm the limiter's keying strategy before concluding a load test failure is a capacity problem rather than the rate limiter correctly doing its job.

Also test: **100 concurrent students**, **300 concurrent Arena submissions** (watch grading-worker/queue throughput, not just the API layer), **recruiter searches during load**. Additional constraint specific to this pilot: the MCP bridge (`backend/server/lib/mcpClient.js`) is a single spawned child process per backend instance — concurrent coach requests serialize through one stdio client. If backend instances scale horizontally this is fine (each gets its own MCP process); if there's only one instance, this is a real concurrency ceiling worth load-testing specifically.

Monitor: API latency, DB CPU, Render CPU, error rate, queue depth.

---

## 7. Security

- JWT required everywhere sensitive — `requireAuth` confirmed on `/api/copilot/coach`; spot-check other sensitive routes the same way rather than assuming.
- Role-based authorization — MCP layer's `assertPermission`/`assertOwnership` confirmed present; verify equivalent checks exist on any non-MCP route serving student-specific data.
- No client-side API keys — **confirmed fixed** this pass (Groq key moved server-side via `backend/server/routes/groqProxy.js`; verified absent from the compiled bundle).
- Rate limiting — **confirmed real and applied** (see Section 6 for exact limits).
- RLS enforcement — not independently verified in this pass; check Supabase policies directly, don't assume from application-layer checks alone.
- No cross-user data leaks — the ownership-check pattern in the MCP layer (`assertOwnership(user, uid, publicOk)`) is real; verify it's actually enforced by testing with two real accounts (account A cannot fetch account B's ELO/weak-skills/profile via any route).

---

## 8. Observability

Can you answer these from logs today?

| Question | Answerable now? |
|---|---|
| How many students used Arena today? | Only by log-scraping `arenaV2.js` request logs — no aggregate endpoint |
| Most-used Arena domains? | Same — no aggregate endpoint |
| MCP failure rate? | **Yes** — `coach_invocation` log's `success`/`fallbackOccurred` fields, added this pass |
| Average AI response time? | **Yes** — `coach_invocation` log's `latencyMs` |
| Most common AI Coach questions? | **Yes** — `promptPreview` field, added this pass |
| Top recruiter searches? | Not currently logged anywhere |

Honest state: the AI Coach pilot now has real per-invocation observability. Arena-wide and recruiter-search analytics do not exist yet — same underlying gap as Sections 4 and 5 (no aggregate analytics backend). Don't claim full observability readiness until that's built or you accept log-scraping as the interim method.

---

## Release Gates

| Gate | Pass Requirement | Current real status |
|---|---|---|
| Student Journey | 100% successful completion across all 8 real streams | Not yet run against real accounts |
| Arena | 0 failed submissions in validation run, across all 8 streams | Not yet run |
| MCP Coach | 100% tool correctness, 0 hallucinated ELO/skill values | Code-level checks pass; real-data validation pending (Section 3) |
| Recruiter | Candidate search and proof views working on real data | **HOLD — `HiringPipeline.jsx` uses fake hardcoded candidates; no comparison/proof-view UI exists** |
| College | Placement-officer analytics reflect real Supabase data | **HOLD — `OrgIntelligence.jsx` is 100% hardcoded fake data** |
| Security | No critical vulnerabilities | Groq key exposure resolved; RLS not independently re-verified this pass |
| Performance | p95 within target thresholds, load tests respect rate-limit design | Not yet run |
| Logging | All required events visible | Coach pilot: yes. Platform-wide Arena/recruiter analytics: no |
| **Rollout Decision** | | **HOLD — do not demo Recruiter or College dashboards to real users until Sections 4 and 5 are addressed; AI Coach + Arena + student journey are the parts actually ready to validate for a first cohort** |

---

## What changed from the original AI-Coach-only doc

The two most consequential differences from a generic checklist template: Recruiter and College sections are not "run this and see" — they're pre-flagged as blocked based on reading the actual components, because presenting a checklist item that implies working data exists (when it's fabricated arrays) would be worse than no checklist at all. Everything else (student journey, Arena, AI Coach, security, load, observability) is grounded in real route names, real rate limits, and the real 8-stream/30-role_id registry rather than an assumed generic list.
