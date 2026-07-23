# Capabilio Code DNA v2 — Multi-Layer Forensic Report

**Method note before anything else:** what follows is not 18 independently-running software tools — it's one analyst (me) applying 18 distinct *lenses* to the same evidence base (full git history, full file tree, and direct reading of source files), because that's what's actually available in this environment. I have no network access to diff against public GitHub, so Similarity Analysis is explicitly bounded. Every score below is traceable to a specific observation in this document, not a black-box number.

---

## 1. Executive Summary

**Verdict: Mostly Original, single-author, actively-developed product codebase, with disclosed AI-assisted components integrated into (not parallel to) the existing architecture.**

The strongest evidence isn't any single metric — it's the *combination* of: a 141-commit, 34-day, single-author git history with technically specific bug-fix messages; a traceable multi-step architectural refactor (hardcoded role logic → centralized config → formal registry) visible across five consecutive commits; a hand-tuned ELO algorithm duplicated across two files with a comment that *admits* the duplication ("mirrors arenaV2.js") rather than hiding it; and zero test coverage / zero CI/CD, which is a real engineering-maturity gap, not something a report should soften.

---

## 2. Repository Overview

- 141 commits, single author (`Venkata Kopuri <vgckopuri@gmail.com>`; a `venkatakopuri1995` name variant on 4 commits shares the same email — not a second contributor).
- Active date range: 2026-06-12 → 2026-07-15 (34 calendar days), commits spread across at least 15 distinct days (2–18 commits/day), not clustered into one burst.
- Stack: React 18 + Vite frontend, Express backend, Supabase/Postgres, a hand-built TypeScript MCP tool server, multiple AI provider SDKs (Anthropic, Groq via REST, Google Generative AI, Deepgram).
- No CI/CD directory (`.github/` absent), no Dockerfile, no test framework config (no Jest/Vitest in either `package.json`) — deployment is Vercel (frontend) + a separately-hosted Node backend (Render, per code references).
- `README.md` is the **unedited default Vite scaffold README** ("This template provides a minimal setup...") — confirms `npm create vite@latest` origin, has zero bearing on application-code originality.

---

## 3. Architecture DNA

**Score: 87/100**

The Role→Skill→Mission→Workbench→Renderer registry (`roleConfig.js`, `WORKBENCH_REGISTRY`, generated `role-registry.generated.json` / `arena-domains.generated.json` consumed by the MCP layer) maps 30 role_ids across 8 streams (IT, Medical, ECE, EEE, Mechanical, Civil, Pharmacy, MBA) to challenge pools, skill graphs, and UI renderers — a custom abstraction, not a framework default. The MCP layer enforces a deliberate one-directional boundary (AI → MCP tool → backend service → Supabase, with JWT verification + ownership assertion per tool) rather than letting the AI layer touch the database directly.

*Judging engineering, not framework choice, per the brief*: the registry pattern is the standout piece — it's the kind of abstraction you only build after noticing the same "if role === X" branch repeated in five places (which the commit history shows happening, see Section 6). Consistency deduction: no shared component library exists (see Section 8/Function DNA), so UI-layer modularity lags behind the backend/registry layer's modularity.

---

## 4. Business Logic DNA

**Score: 90/100** — weighted highest per the brief, and the strongest evidence category.

**ELO scoring** (`arenaV2.js:36`, duplicated at `grading-worker.js:28`):
```js
function computeEloUpdate({ userElo, difficulty, score, attempts, timeTakenSecs, estimatedSecs }) {
  const challengeElo = CHALLENGE_ELO[difficulty] || 1100
  const expected     = 1 / (1 + Math.pow(10, (challengeElo - userElo) / 400))
  const actual       = Math.max(0, Math.min(1, score / 100))
  const K            = userElo < 800 ? 48 : userElo < 1100 ? 36 : userElo < 1400 ? 28 : 20
  const attemptMult  = Math.max(0.4, 1 - (Math.max(1, attempts) - 1) * 0.15)
  const timeRatio    = estimatedSecs > 0 ? timeTakenSecs / estimatedSecs : 1
  const timeBonus    = timeRatio < 0.5 ? 1.10 : timeRatio < 0.75 ? 1.05 : 1.00
  let   delta        = Math.round(K * (actual - expected) * attemptMult * timeBonus)
  if (actual >= 0.7 && delta < 3) delta = 3
  if (delta < -30) delta = -30
  return { delta, newElo: Math.max(100, userElo + delta) }
}
```
This is the standard chess-ELO expected-score formula (`1/(1+10^((opponent-self)/400))`) — that base formula itself is a public-domain statistical method, not proprietary to anyone, so its presence is *not* an originality signal either way. What **is** original: the variable K-factor banded by rating tier (48/36/28/20), the attempt-count penalty (`attemptMult`), and the time-based bonus multiplier — none of that is part of the standard ELO formula; it's product-specific tuning layered on top of a known method. This is exactly the "adapted algorithm with custom business rules" pattern that should score well on originality without pretending the base formula itself was invented here.

**Recommendation composition** (`arena.recommendNextChallenge`, built this session, verified by me directly): composes current ELO band + weak-topic detection + daily assignment + full catalog, filtered by resolved role — a genuine matching/recommendation workflow, not a lookup table.

**Role registry**: see Section 3 — same evidence applies to business-logic originality since the registry drives challenge/skill selection, not just UI rendering.

---

## 5. Algorithm DNA

**Score: 78/100**

The ELO algorithm (Section 4) is the primary algorithmic artifact. One concrete finding: **`computeEloUpdate` is duplicated byte-for-byte in two files** — `backend/server/routes/arenaV2.js:36` and `backend/server/lib/grading-worker.js:28`. This is not evidence of external copying (it's the same author's own function, reused because the grading worker runs as a separate process and can't easily import from the route file). It **is** a legitimate Code Reuse / Technical Debt finding: the second file's comment literally says `// ELO formula (mirrors arenaV2.js)` — the duplication is self-documented, not hidden. That's a meaningful distinction: an author who copies and disguises reuse writes no comment; an author who copies and admits it in a comment is managing debt consciously. Recommendation: extract to a shared module (`shared/elo.js`) — flagged under Improvement Opportunities, not Risk.

No other duplicated algorithmic logic was found in the areas inspected (weak-topic detection, recommendation composition).

---

## 6. Engineering DNA

**Score: 74/100**

- **Refactoring pattern (strong signal)**: five commits on 2026-07-13 show a textbook incremental-refactor progression: `9ab7c50` "eliminate all hardcoded role defaults... covers all 35+ roles" → `597b75e` "centralized Role Configuration System (roleConfig.js)" → `37b53c` "WORKBENCH_REGISTRY + mission-driven workbench architecture" → `ed7844f` "Role→Skill→Mission→Workbench→Renderer registry + widget layer". This sequence (patch symptoms → notice the pattern → centralize → formalize) is very hard to fabricate and inconsistent with a "copy once, edit cosmetically" origin.
- **Separation of concerns**: strong at the registry/MCP boundary (Section 3); weaker at the UI layer.
- **Technical debt (real, not hypothetical)**: zero test files anywhere in the repository (`*.test.js`, `*.spec.js`, `__tests__/` — none found); no CI/CD; small presentational components (`Card`, `Spinner`, `Badge`, `Chip`, `Btn`) are redefined locally in 3–13 different files each rather than shared from one component library. This inflates line count and creates drift risk (thirteen slightly-different `Card` implementations is a real maintainability cost), but it is an internal DRY/engineering-maturity issue, not an authorship or copying concern.
- **Documentation quality**: sparse but purposeful — comments are infrequent (~5 JSDoc-style lines/file average in backend routes) but where present, they explain *why*, not *what* (e.g., the `vite.config.js` manual-chunking comment explaining a specific production crash it prevents). Quality over quantity; still a real gap for onboarding a second engineer.

---

## 7. Git Evolution

**Score (Git Authenticity): 88/100**

- 141 commits / 34 days / 15+ distinct active days, 2–18 commits/day — no single-day anomaly beyond the expected initial import.
- Initial commit: 172 files, 77,767 insertions (2026-06-12) — normal for importing a pre-existing local project into git for the first time. Not, by itself, evidence of anything; what would be concerning is this pattern *repeating* with only cosmetic follow-up edits, which does not happen here.
- 140 subsequent commits carry specific, falsifiable technical descriptions tied to this codebase's actual identifiers and runtime errors: `fix: voucher tab infinite spinner — guard checked user.uid but Supabase uses user.id`, `fix: remove bare JS block in JSX ternary causing esbuild parse error`, `fix: keep React in main bundle to prevent useState undefined crash on load`. These are not reproducible without having run and debugged this specific application — a strong authenticity signal, distinct from mere commit *volume*.
- One recent large commit (`aac938a`, 2026-07-15, 34 files / 13,193 insertions) is this session's own MCP-layer work — the bulk of the line count is `mcp/package-lock.json` (auto-generated), with the remainder being genuinely new, reviewed-by-me source files. Flagged for transparency, not as an anomaly.

---

## 8. Function-Level Analysis

- `computeEloUpdate` — duplicated across 2 files, self-documented (Section 5). Signature and body are identical.
- Small presentational component functions (`Card`, `Spinner`, `Badge`, `SectionLabel`, `Chip`, `Btn`, `Modal`, `ChallengeCard`, `SkillBar`, `StatCard`, `SkeletonCard`) appear as **independently-defined local functions in 3–13 different files** — same *names*, but each is locally scoped and not imported from a shared module (confirmed: no `frontend/src/components/ui`-style shared kit exists — `components.json`/shadcn scaffold absent). This is convergent naming (developers reach for the same obvious names — "Card", "Badge" — independently), not evidence of copying between files; it's evidence of *not yet* extracting a shared UI kit.
- `optionalAuth` appears 3 times — a smaller, auth-adjacent helper repeated across route files; same category of finding as above (internal duplication, not external reuse).

---

## 9. Module-Level Analysis

- `mcp/` is a clean module boundary: `src/tools/*.ts` (10 domain files), `src/shared/*.ts` (auth, client, logger, permissions, registry, validation), `src/server.ts` — consistent internal structure, one tool-registration pattern (`server.tool(name, description, schema, handler)`) used uniformly across all 10 domain files (verified directly during this session's own work on this module).
- `backend/server/routes/*.js` — one route file per domain (arenaV2, professionalProfile, skillStudio, jobs, recruiterComms, aiInterview, pulseNexus, copilotCoach, groqProxy), consistent Express `Router()` pattern throughout.
- No circular-import smells observed in the files read this session; module boundaries track the product's domain boundaries (Arena, Aura, Skill Studio, Nexus/recruiter, Launchpad) rather than being organized by technical layer only — a design choice, not a default.

---

## 10. Similarity Analysis

**No internet access is available in this environment.** I cannot diff this repository's source against public GitHub repositories, tutorials, boilerplates, or SaaS templates. This is a hard limitation of the analysis, stated plainly rather than worked around — no matches are fabricated, and none are claimed.

What internal evidence *can* speak to (not a substitute for external diffing, but the closest available proxy): no known boilerplate fingerprints were found (no CRA/`react-scripts`, no T3-stack `trpc`/`next-auth`, no shadcn `components.json`, no SaaS-starter folder conventions). The dependency list (Razorpay, Deepgram, jsPDF/html2canvas, PostHog, alongside Supabase/Express/React) is a coherent, product-specific accumulation rather than a copied `package.json`.

---

## 11. AI Assistance Analysis

Classification: **Mixed — Human-primary with disclosed AI-assisted components.**

- **Known AI-assisted, disclosed directly (not inferred — I have first-hand knowledge)**: the entire `mcp/` TypeScript tool server, `backend/server/routes/copilotCoach.js`, `backend/server/routes/groqProxy.js`, `backend/server/lib/mcpClient.js`, and the current `frontend/public/favicon.svg` were built by me (Claude) across this and prior sessions in this conversation. This is Claude-generated code, integrated into the existing architecture's conventions (same Express `Router()` pattern, same `requireAuth` middleware, same route-mounting style in `server.js`) rather than dropped in as a stylistically foreign block.
- **Rest of the codebase**: no reliable way to fingerprint "written by ChatGPT/Copilot/Cursor/Windsurf/Lovable" from static inspection alone — these tools produce code stylistically similar to human-written code, especially once a human edits it afterward. I looked for the closest available proxy signals (unusually generic variable names, template-like repeated scaffolding, comment style inconsistency across files) and did not find a pattern strong enough to assert AI-generation for the pre-existing codebase one way or the other. Classification for that portion: **Unknown** — stated as a genuine unknown, not softened into a guess.

---

## 12. Reuse Classification

| Type | Evidence | Classification |
|---|---|---|
| Framework scaffold | Unedited Vite README | Legitimate |
| Open-source libraries | 26 deps (Supabase, Express, Recharts, Three.js, etc.) | Legitimate |
| AI-assisted, disclosed | `mcp/`, `copilotCoach.js`, `groqProxy.js`, `mcpClient.js`, `favicon.svg` | Legitimate — integrated, not parallel |
| Internal duplication | `computeEloUpdate` (2 files), small UI components (`Card`/`Badge`/etc., 3-13 files each) | Technical debt, not external reuse |
| Copied external code | None found | — |
| Template/SaaS boilerplate | None found (no CRA/T3/shadcn fingerprints) | — |

---

## 13. Risk Assessment

Nothing found rises to "needs manual investigation for copying." Real, non-authorship risks worth flagging:

- **Zero test coverage** — no automated regression protection for the ELO/scoring logic specifically called out as highest-value business logic in this analysis. Given the standing instruction that ELO/assessment correctness must never regress silently, this is the single highest-priority engineering gap in the repository.
- **No CI/CD** — nothing blocks a broken build from reaching `main`/production automatically; deploys rely on manual discipline.
- **Duplicated ELO function across 2 files** — a correctness risk (if one copy is tuned/fixed and the other isn't, ELO becomes inconsistent between the synchronous Arena submit path and the async grading-worker path), not an authorship risk.

---

## 14. Evidence Table

| Claim | Evidence | Type |
|---|---|---|
| Single author | `git log --format="%an <%ae>"` → 137+4 commits, one email | Observation |
| 34-day, 15+ active-day history | `git log --format=%ad --date=short` distribution | Observation |
| Traceable registry refactor | Commits `9ab7c50`, `597b75e`, `37b53c`, `ed7844f` (2026-07-13) | Observation |
| Vite scaffold origin | `README.md` content matches known Vite template text verbatim | Observation |
| No boilerplate fingerprints | Absence of `react-scripts`, `trpc`, `next-auth`, `components.json` in deps/tree | Observation |
| Duplicated ELO function | Identical `computeEloUpdate` body in `arenaV2.js:36` and `grading-worker.js:28`, self-commented as a mirror | Observation |
| Zero test files | `find` for `*.test.js`/`*.spec.js`/`__tests__` returned nothing | Observation |
| AI-assisted components | `mcp/`, `copilotCoach.js`, `groqProxy.js`, `mcpClient.js`, `favicon.svg` — first-hand knowledge, this conversation | Observation (direct, not inferred) |
| Commit messages are debugging-specific, not generic | Sampled messages referencing exact variable names (`user.uid` vs `user.id`) and exact error types (esbuild parse error) | Observation |
| No external repo comparison performed | No network access in this environment | Stated limitation |
| Pre-existing codebase's AI-authorship status | No reliable static fingerprint found either way | Explicit unknown |

---

## 15. Strengths

Custom, product-specific registry architecture (Role→Skill→Mission→Workbench) with a traceable refactor history proving it evolved from real pain points rather than being designed upfront and never touched. Business logic (ELO tuning, recommendation composition) reflects genuine domain modeling rather than a generic scoring library. Git history is dense with specific, falsifiable bug-fix descriptions consistent with real iterative development against a live application. AI-assisted additions this session were integrated into existing conventions rather than bolted on as a foreign subsystem.

## 16. Weaknesses

Zero automated test coverage anywhere, including for the ELO/scoring logic this report identifies as the highest-value business asset. No CI/CD. Duplicated ELO implementation across two files (self-documented but still a correctness-drift risk). No shared UI component library — thirteen independent `Card` implementations is real, avoidable duplication. Sparse documentation outside of the comments that do exist.

## 17. Improvement Opportunities

Extract `computeEloUpdate` into one shared module imported by both `arenaV2.js` and `grading-worker.js` — removes the drift risk directly, low effort. Add a minimal test suite starting with the ELO function specifically (it's pure, deterministic, and trivial to unit test — highest ROI test in the entire codebase). Introduce a shared `components/ui` kit to collapse the `Card`/`Badge`/`Spinner` duplication. Add a CI workflow that at minimum runs `npm run build` on PRs, catching the class of bug the commit history shows being fixed manually and reactively (esbuild parse errors, React bundle-splitting crashes).

---

## 18. Scoring Summary

| Category | Score |
|---|---:|
| Repository Originality | 82/100 |
| Architecture Originality | 87/100 |
| Business Logic Originality | 90/100 |
| Engineering Quality | 74/100 |
| Engineering Consistency | 80/100 |
| Code Reuse | Low (internal duplication only, no external reuse found) |
| AI Assistance | Mixed — disclosed AI-assisted subset + unknown status for the rest |
| Technical Debt | Moderate (untested ELO logic, duplicated function, no shared UI kit) |
| Maintainability | 68/100 |
| Scalability | 78/100 *(async grading via queue, CDN cache headers, code-split bundles — all present and deliberate)* |
| Git Authenticity | 88/100 |
| Documentation Quality | 55/100 |
| Testing Quality | 5/100 *(no test files found anywhere)* |
| Deployment Maturity | 45/100 *(no CI/CD, no Docker, manual deploy discipline only)* |
| **Overall Code DNA** | **78/100** |

---

## 19. Confidence & Final Verdict

**Confidence: Medium-High** for everything derived from internal evidence (git history, file tree, direct source reading — complete and unambiguous). **Low** specifically for any claim about the pre-existing codebase's AI-authorship status and for anything resembling external similarity — both are explicitly marked as unknown/unavailable above rather than estimated.

**Final Verdict: Mostly Original.** The evidence base — a single-author, 34-day commit history with technically specific and falsifiable bug-fix messages, a traceable multi-commit architectural refactor, and product-specific business logic (a tuned ELO variant, a custom role/skill/mission registry) — supports genuine iterative authorship rather than a copied-and-relabeled origin. The repository's real, disclosed weaknesses are engineering-maturity gaps (no tests, no CI/CD, one duplicated function, no shared UI kit), not authorship red flags, and this report treats them as exactly that rather than inflating them into originality concerns they aren't.
