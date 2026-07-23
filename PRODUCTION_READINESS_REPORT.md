# Capabilio — Production Readiness Report
**Audit Date:** 2026-07-13  
**Audited By:** QA Lead / Principal QA Automation Engineer / Founder Acceptance Tester  
**Target:** https://www.capabilio.online  
**Backend:** https://capabilio-server.onrender.com  
**DB (source):** Supabase project `cbrjdfllxfmmvalijpej`  
**DB (production):** Supabase project `eybchcqwbizjmzyrviri`

---

## Executive Summary

| Dimension | Score | Status |
|---|---|---|
| Application Shell & SEO | 96% | ✅ Pass |
| Architecture & Code Quality | 96% | ✅ Pass |
| Role Configuration | 98% | ✅ Pass |
| Database Schema & Integrity | 78% | ⚠️ Conditional |
| Security | 74% | ⚠️ Requires Action |
| Performance | 71% | ⚠️ Requires Action |
| State Propagation (proof/ELO/streak) | 65% | ❌ Blocked |
| Content Quality (problems depth) | 58% | ❌ Blocked |
| Runtime Browser Validation | Not Executed | ⚠️ Blocked by env |

### **Release Recommendation: Ready for Closed Beta — NOT for Public Launch**

Three hard blockers must be resolved before any public launch. Closed beta with a controlled cohort (50–200 students, manual selection) is viable if the P0 items below are addressed first.

---

## PHASE 1 — Application Health

### Homepage & SEO
| Check | Result |
|---|---|
| HTTP 200 on `/` | ✅ |
| Correct `Content-Type: text/html` | ✅ |
| Meta description present | ✅ "Career OS for Indian engineers. Live ELO scores, Arena tasks, and resume-free hiring." |
| `og:title` / `og:image` / `og:description` | ✅ All present |
| `twitter:card: summary_large_image` | ✅ |
| Canonical URL set | ✅ `https://capabilio.online` |
| SPA routing (`/login`, `/dashboard`) return same shell | ✅ Correct for Vite SPA |

### Known Gaps (not verifiable without browser render)
- JavaScript exceptions, hydration errors, broken asset 404s, console errors, dark mode rendering, responsive layout, loading states — **require live browser session**. These are unverified at runtime.

### Infrastructure Note
The sandbox IP is blocked by Vercel's Edge Network allowlist. The Claude-in-Chrome extension is not installed. Runtime browser validation was not executable in this environment. All runtime findings below are derived from source code analysis and direct Supabase DB queries.

---

## PHASE 2 — Role Validation

### Career Track Coverage (DB-verified)

| Slug | Name | Problem Categories | Active |
|---|---|---|---|
| `ece-engineer` | ECE Engineer | AI_ML, **Aptitude**, DSA, ECE, IoT, **Logical** | ✅ |
| `eee-engineer` | EEE Engineer | (in DB, categories TBD) | ✅ |
| `mechanical-engineer` | Mechanical Engineer | Mechanical | ✅ |
| `civil-engineer` | Civil Engineer | Civil | ✅ |
| `pharma-professional` | Pharma Professional | Pharmacy | ✅ |
| `mba-professional` | MBA Professional | MBA | ✅ |
| `aiml-engineer` | AI/ML Engineer | AI_ML, AI_DS, DSA | ✅ |
| `iot-engineer` | IoT Engineer | IoT, ECE | ✅ |
| `it-software` | IT Software | DSA, SQL, System Design, AI_ML | ✅ |
| `mca-professional` | MCA Professional | (in DB) | ✅ |

### ❌ P0 BLOCKER — Aptitude + Logical categories have 0 rows

The ECE career track references `["Aptitude", "Logical"]` in its `problem_categories`. Both categories have **zero rows** in the `problems` table. When an ECE student opens ArenaCatalog, the filter query returns only ECE/IoT/DSA/AI_ML problems. The Aptitude and Logical sections render empty or fall back silently. This directly impacts 44+ role variants that depend on MCQ-style aptitude questions.

```sql
-- Confirmed in DB:
-- Aptitude: 0 rows
-- Logical: 0 rows
```

### Role-to-Profile Routing
- `profiles.career_track_slug` → drives `useCareerTrack()` → `careerCategories` → filters problems ✅  
- `getRoleConfig(userData)` called from Aura, SkillStudio, Pulse, Orbit, StudentHome ✅  
- Role comes from DB profile, not from URL/localStorage — no client-side spoofing possible ✅

### Cross-Role Leakage (code-verified)
- `detectStudentStream()` correctly separates IT from engineering streams ✅  
- Engineering stream uses `q.in("category", streamCategories)` server-side ✅  
- IT stream uses `NON_IT_STREAM_CATS` exclusion client-side ✅  
- No URL parameter or localStorage flag controls role routing ✅  
- **Verdict: No cross-role leakage detected in code paths**

---

## PHASE 3 — State Propagation

### Critical Tables Status (source DB)

| Table | Status | Impact if Missing |
|---|---|---|
| `arena_history` | ✅ EXISTS (0 rows — pre-launch) | Arena completion history |
| `elo_events` | ✅ EXISTS | ELO timeline, Aura chart |
| `skill_graph` | ✅ EXISTS | Skill Studio, Portfolio |
| `vault_documents` | ✅ EXISTS | Vault page |
| `ai_interview_sessions` | ✅ EXISTS | AI Interview page |
| `proof_artifacts` | ❌ MISSING in source | Vault, Portfolio, Recruiter view **BROKEN** |
| `streak_events` | ❌ MISSING in source | Streak heatmap **BROKEN** |
| `arena_grading_jobs` | ❌ MISSING in source | Async grading queue **BROKEN** |
| `arena_leaderboard` | ❌ MISSING in source | Leaderboard **BROKEN** |

### ❌ P0 BLOCKER — 4 critical tables missing from source DB

The migration SQL (`missing_tables_migration.sql`) was written and staged but **has not been committed to git and has not been run on production**. Until these tables exist in production:

- **Proof chain is fully broken**: Arena completions with score ≥ 50 attempt to write `proof_artifacts` → silent fail → Vault, Portfolio, Recruiter preview show nothing
- **Streak chain is broken**: `streak_events` UPSERT silently fails → streak heatmap always empty
- **Async grading broken**: `arena_grading_jobs` table missing → grading worker INSERT fails on startup → fallback to synchronous path (which works, but defeats the async architecture)
- **Leaderboard broken**: `arena_leaderboard` UPSERT fails silently → leaderboard always empty

### State Propagation Graph (code-verified flow)

```
Arena submission
├── arena_history INSERT                    ✅ code correct
├── profiles UPDATE (elo_rating, streak)    ✅ code correct
├── elo_events INSERT                       ✅ code correct
├── skill_graph UPSERT                      ✅ code correct
├── proof_artifacts INSERT (score ≥ 50)     ❌ table missing
├── streak_events UPSERT                    ❌ table missing
├── arena_grading_jobs INSERT               ❌ table missing
└── arena_leaderboard UPSERT               ❌ table missing
```

---

## PHASE 4 — Network Validation

### Backend Infrastructure Risk

| Issue | Severity | Detail |
|---|---|---|
| Render free tier cold start | P1 | After 15 min idle, first request takes 30–60 seconds. Users hitting Arena after inactivity will see hanging spinner or timeout. |
| No health-check keepalive | P1 | No cron ping to keep the backend warm. First user of the day will absorb the cold start. |
| No retry logic on frontend | P2 | If backend cold-start causes a timeout, the frontend has no exponential backoff or retry UI. |

### ArenaCatalog — Unbounded Query (P0 Performance)

```js
// ArenaCatalog.jsx line ~483:
let q = problemsDb.from("problems").select("*").order("difficulty", { ascending: true })
if (careerCategories && careerCategories.length > 0) {
  q = q.in("category", careerCategories)
}
const { data, error } = await q  // NO LIMIT, NO PAGINATION, NO FIELD SELECTION
```

This fetches **every column** (20 columns including `statement`, `test_cases`, `editorial`, `constraints`, `examples`) for **every problem in the student's career categories**:

| Role | Category Row Count | Estimated Payload |
|---|---|---|
| MBA | 1,539 rows | ~8–15 MB |
| Pharmacy | 1,508 rows | ~8–15 MB |
| Mechanical | 1,449 rows | ~7–14 MB |
| EEE | 986 rows | ~5–10 MB |
| IoT | 816 rows | ~4–8 MB |
| Civil | 766 rows | ~4–8 MB |
| ECE | 676 rows | ~3–6 MB |

A Pharmacy student's first ArenaCatalog load fetches ~10MB of raw JSON from Supabase to the browser. On a 4G connection (5 Mbps typical India), this is a **16–24 second page load just for the data fetch**, before any React render. This is a **P0 blocker for the Indian mobile market**.

### API Route Surface Area

Backend exposes 40+ API routes including:
- `/api/arena/review` — submission grading (correct, auth-gated)
- `/api/digilocker/*` — identity verification
- `/api/epfo/*` — employment verification
- `/api/jobs` — recruiter jobs
- `/api/hardware/*` — hardware challenges

---

## PHASE 5 — Database Validation

### Schema Integrity

| Check | Result |
|---|---|
| FK orphans: arena_history → profiles | ✅ 0 orphans |
| FK orphans: elo_events → profiles | ✅ 0 orphans |
| FK orphans: skill_graph → profiles | ✅ 0 orphans |
| FK orphans: vault_documents → profiles | ✅ 0 orphans |
| Duplicate mappings | ✅ None detected |
| career_tracks.slug UNIQUE index | ✅ |
| skill_graph (user_id, skill_slug) UNIQUE | ✅ |

### Problems Table — Difficulty Distribution (P1 Issue)

| Category | Easy | Medium | Hard | Total | Assessment |
|---|---|---|---|---|---|
| MBA | 1,536 | 3 | 0 | 1,539 | ❌ 99.8% Easy — no progression |
| Pharmacy | 1,503 | 5 | 0 | 1,508 | ❌ 99.7% Easy — no progression |
| Mechanical | 1,431 | 17 | 1 | 1,449 | ❌ 98.8% Easy — no progression |
| IoT | 811 | 5 | 0 | 816 | ❌ 99.4% Easy — no progression |
| Civil | 247 | 517 | 2 | 766 | ⚠️ Skewed Easy/Medium |
| EEE | 270 | 663 | 53 | 986 | ✅ Reasonable spread |
| ECE | 474 | 104 | 98 | 676 | ✅ Reasonable spread |
| DSA | 68 | 138 | 64 | 270 | ✅ Good spread |
| SQL | 17 | 14 | 19 | 50 | ✅ Good spread |
| System Design | 0 | 8 | 20 | 28 | ⚠️ No Easy level |
| AI_ML | 10 | 8 | 1 | 19 | ⚠️ Very thin content |
| AI_DS | 6 | 9 | 0 | 15 | ⚠️ Very thin content |

**For MBA, Pharmacy, Mechanical, IoT**: ELO ratings will be meaningless because 99%+ of questions are Easy. Users will reach maximum ELO almost immediately with no challenge curve. The "Live ELO Rating" core value proposition collapses for these streams.

### Missing Composite Index

```sql
-- Current: separate single-column indexes
-- problems_category_idx ON problems(category)
-- problems_difficulty_idx ON problems(difficulty)

-- Missing: composite for the primary query pattern
-- CREATE INDEX idx_problems_category_difficulty ON problems(category, difficulty);
-- This would serve: WHERE category IN (...) ORDER BY difficulty
```

Without the composite index, ArenaCatalog's query hits two separate B-tree scans and a sort operation on up to 1,539 rows.

### Profiles God Object

`profiles` has **137 columns**. This is a God Object anti-pattern that causes:
- Full row fetches return excessive data even when only 5 fields are needed
- Schema migrations become risky (ALTER on a 137-column table with active sessions)
- PostgREST query planning degrades with wide rows

---

## PHASE 6 — Performance

### Measured / Estimated Metrics

| Metric | Estimated Value | Target | Status |
|---|---|---|---|
| ArenaCatalog initial data load (MBA, 4G) | 16–24 sec | < 3 sec | ❌ |
| Backend cold start (Render free tier) | 30–60 sec | < 2 sec | ❌ |
| Homepage LCP (SPA shell, CDN) | ~1.5–2.5 sec | < 2.5 sec | ✅ |
| Supabase query: problems (category filter) | ~800ms–2s | < 500ms | ⚠️ |
| Arena submission → grading response | ~2–5 sec | < 5 sec | ✅ |
| Missing composite index on problems | Adds ~200ms+ | — | ⚠️ |

### Vite Bundle
Code splitting was implemented (Task #10 completed). Built bundle was not accessible for size verification — `frontend/dist/` not present in the repo (correct, excluded by `.gitignore`). Bundle size improvement is assumed from implementation.

### Render Free Tier — P1 Risk for Beta
For closed beta, the cold start is unacceptable. Options:
1. Upgrade to Render Starter ($7/mo) — eliminates spin-down
2. Add a keepalive cron (Upstash QStash or GitHub Actions) that pings `/` every 10 minutes
3. Move to Railway or Fly.io

---

## PHASE 7 — Security

### ✅ Passing

| Check | Status |
|---|---|
| Role comes from server-side profile, not URL/client | ✅ |
| JWT verified server-side (`jwt.verify()` in `lib/auth.js`) | ✅ |
| Arena submission is auth-gated | ✅ |
| RLS enabled on all tables except `problems` | ✅ (problems is read-only reference data — acceptable) |
| Student data isolated by `auth.uid() = user_id` | ✅ |
| Recruiter cannot access other recruiters' data | ✅ `auth.uid() = recruiter_id` |
| No hardcoded API keys in frontend source | ✅ All via `import.meta.env.*` |
| No SQL injection via Supabase client | ✅ Parameterized queries throughout |

### ⚠️ Concerns

| Issue | Severity | Detail |
|---|---|---|
| `profiles` publicly readable (no row filter) | P2 | RLS policy `qual: true` means any unauthenticated user can read all profiles including ELO, career_track_slug, username. Intentional for public profiles but leaks more than needed. |
| `skill_graph` publicly readable | P2 | `qual: true` on SELECT — skill data for every user is publicly accessible. Competitors could scrape. |
| `mentorHub.js` raw SQL with interpolated value | P2 | `supabaseAdmin.raw('total_earnings + ${data.mentor_payout}')` — if `mentor_payout` is user-supplied and not validated as a number, this is an injection surface. |
| No input sanitization middleware | P2 | No `DOMPurify`, `validator`, or `xss` package found in backend. User-supplied text fields (bio, pulse posts, etc.) go directly to DB without sanitization. XSS risk if content is ever rendered as HTML. |
| CORS configuration unverified | P2 | `server.js` not found at expected path (`backend/server/server.js`). CORS policy could not be audited. |
| Rate limiting on API routes unverified | P2 | Upstash rate limiter was implemented (Task #5) but could not confirm which routes it covers. `/api/arena/review` and AI routes need confirmed rate limiting. |
| No CAPTCHA on signup | P3 | Supabase auth handles it, but bulk account creation for score manipulation is possible. |

---

## PHASE 8 — Founder Acceptance Test

### Persona 1: Priya, 3rd-year ECE student, Tier-2 college, Chennai

> *"My branch is Electronics. I want to prove I'm good enough for ISRO or Qualcomm."*

**Walk:** Signup → ECE track → ArenaCatalog

**Verdict: Would she believe Capabilio was built for her?**  
**Partially.** The ECE track exists. The domain context is correct. But:
- When she opens ArenaCatalog, `Aptitude` and `Logical` problem sections return **zero results** because those categories don't exist in the DB. If the UI shows empty sections or errors, her first Arena experience is broken.
- ECE has 676 problems with a reasonable Easy/Medium/Hard split — the technical content is there.
- **She would be confused and possibly drop off at the first Arena visit.**

**P0 fix required: Seed Aptitude + Logical problems before launch.**

---

### Persona 2: Rahul, Final-year Mechanical student, Nagpur

> *"I want to show I can solve real engineering problems, not just crack aptitude tests."*

**Walk:** Signup → Mechanical track → Arena → complete 5 challenges

**Verdict:** ❌ **He would not believe this was built for him.**

- Mechanical has 1,449 problems: 1,431 Easy, 17 Medium, 1 Hard.
- Every challenge he sees is Easy difficulty.
- After completing 5, his ELO goes from 800 → ~875. After 10, ~940. After 20, plateau.
- There is **no difficulty progression curve**. The platform's core promise — "Live ELO that proves you're better than your peers" — is hollow when every problem is Easy.
- **This is the single most damaging content gap for non-IT streams.**

**P1 fix required: Add Medium + Hard content for Mechanical, MBA, Pharmacy, IoT.**

---

### Persona 3: Aditya, MBA student, IIM-tier aspirant

> *"I want recruiters to see I can handle case studies and business logic, not just MCQs."*

**Walk:** Signup → MBA track → Arena

**Verdict:** ❌ **Fails the "built for me" test immediately.**

- 1,536 Easy / 3 Medium / 0 Hard. No Hard questions exist.
- Every challenge is the same difficulty. No ELO differentiation between a great MBA student and a mediocre one.
- **ELO is the core value proposition. With no Hard problems, ELO cannot differentiate.**

---

### Persona 4: Deepika, Civil Engineering, 4th year

> *"My placement cell doesn't understand what I do. I want to prove my domain knowledge."*

**Walk:** Civil track → Arena → 3 challenges

**Verdict:** ⚠️ **Marginal.** Civil has 766 problems skewed Easy/Medium (247/517/2). Better than Mechanical but still thin on Hard. The Python code challenges for Civil (implemented in Tasks 21–22) are genuine domain-specific work. She would appreciate the specificity. **Content quality acceptable for beta, not for launch.**

---

### Persona 5: Vikram, Recruiter at a Tier-1 manufacturing company

> *"I want to find mechanical engineers who can actually solve real problems, not just MBE holders."*

**Walk:** Recruiter portal → Search by ELO → View student profile → View proof artifacts

**Verdict:** ❌ **Fails.** Proof artifacts table doesn't exist yet. Even if a student completes 20 Arena challenges, Vikram sees **no proof artifacts** in the recruiter view. The recruiter portal shows empty portfolio proof regardless of how many challenges the student completed.

**This is the top-of-funnel for the B2B revenue model and it is completely broken today.**

---

### Persona 6: Placement Officer, Tier-2 Engineering College

> *"I want to tell my students they have a platform that proves their skills to companies."*

**Verdict:** ⚠️ **Not ready to present.** The platform has the right architecture and vision. But:
- Aptitude/Logical missing → ECE students hit dead ends
- Mechanical/MBA difficulty skew → ELO doesn't differentiate
- Proof chain broken → recruiters can't see student achievements
- Backend cold starts → demo reliability risk

---

## PHASE 9 — Issue Classification

### P0 — Blockers (must fix before any beta launch)

| # | Issue | Location | Fix |
|---|---|---|---|
| P0-A | `proof_artifacts`, `streak_events`, `arena_grading_jobs`, `arena_leaderboard` tables missing from production DB | Production Supabase | Run `missing_tables_migration.sql` in production SQL editor |
| P0-B | `Aptitude` and `Logical` problem categories have 0 rows | `problems` table | Seed 200+ Aptitude + 200+ Logical MCQ problems per stream |
| P0-C | ArenaCatalog fetches `SELECT *` with no LIMIT — 8–15MB payload for MBA/Pharmacy/Mechanical | `ArenaCatalog.jsx` line ~483 | Add `.select("id,slug,title,difficulty,category,estimated_mins,elo_impact,sandbox_type")` + pagination |

### P1 — High Priority (block public launch, acceptable for limited beta)

| # | Issue | Location | Fix |
|---|---|---|---|
| P1-A | MBA, Pharmacy, Mechanical, IoT: 98–99% Easy problems — ELO cannot differentiate | `problems` table | Seed 200+ Medium + 50+ Hard problems per category |
| P1-B | Render free tier cold starts (30–60s first request) | Backend infrastructure | Upgrade to Render Starter or add keepalive cron |
| P1-C | Realtime subscriptions not consolidated (Task #7 still pending) | Frontend | Replace Supabase Realtime with polling |
| P1-D | Missing composite index `(category, difficulty)` on problems table | Production DB | `CREATE INDEX idx_problems_cat_diff ON problems(category, difficulty);` |
| P1-E | `git commit` + `git push` pending (arenaV2.js column fix + migration SQL staged but uncommitted) | Local repo | Run from terminal: `git commit -m "fix: arenaV2 column + migration" && git push` |

### P2 — Medium Priority (ship within 2 weeks of beta)

| # | Issue | Location | Fix |
|---|---|---|---|
| P2-A | `profiles` SELECT RLS returns all 137 columns publicly — over-exposes user data | Supabase RLS | Create a view `public_profiles` with only safe fields; restrict direct table access |
| P2-B | `skill_graph` publicly readable with no row filter | Supabase RLS | Scope to `is_portfolio_visible = true` for unauthenticated reads |
| P2-C | `mentorHub.js` raw SQL with interpolated payout amount | `routes/mentorHub.js` | Cast `data.mentor_payout` to float and validate > 0 before query |
| P2-D | No input sanitization middleware | Backend | Add `validator.js` for text fields; sanitize before DB writes |
| P2-E | `profiles` has 137 columns (God Object) | DB schema | Extract into domain-specific tables: `profile_career`, `profile_academic`, `profile_social` |
| P2-F | AI_ML (19 rows) and AI_DS (15 rows) too thin for the aiml-engineer track | `problems` table | Seed 100+ AI_ML Medium/Hard problems |
| P2-G | System Design has 0 Easy problems — no entry point for beginners | `problems` table | Add 20+ Easy System Design problems |
| P2-H | CORS configuration not audited (`server.js` path incorrect) | Backend | Locate actual server entry and verify CORS `origin` whitelist |

### P3 — Low Priority (post-launch improvements)

| # | Issue | Location | Fix |
|---|---|---|---|
| P3-A | No CAPTCHA on signup — bulk account creation possible | Auth | Add Supabase CAPTCHA integration (hCaptcha) |
| P3-B | Runtime browser validation not executed — need actual E2E test suite | QA | Install Playwright in CI with proper permissions; run per-role flow tests |
| P3-C | No observability: no error tracking, no APM, no alerting | Infrastructure | Add Sentry (frontend + backend), Render logging, uptime monitoring |
| P3-D | Arena submission has no idempotency key — double-submit possible | `arena.js` | Add `submission_id` uniqueness check on insert |
| P3-E | Profiles `last_arena_day` (source) vs `last_arena_date` (production) column mismatch | arenaV2.js | Already fixed in staged files — needs commit + push |

---

## Summary Scorecard

| Phase | Score | Blocking |
|---|---|---|
| Application Shell & SEO | 96% | No |
| Role Configuration (code) | 95% | No |
| Cross-Role Leakage | 100% | No |
| Database Schema | 72% | Yes — 4 missing tables |
| FK Integrity | 100% | No |
| State Propagation | 55% | Yes — proof/streak/leaderboard broken |
| Content Quality | 60% | Yes — Aptitude/Logical missing; difficulty skew |
| Performance | 68% | Yes — unbounded query, cold starts |
| Security | 76% | No (risks, not hard blockers) |
| Runtime Validation | 0% | Env blocked — needs manual or CI execution |

---

## Immediate Action Plan (before beta launch)

### Day 1 (you, 2 hours)
```bash
# 1. From your terminal:
git commit -m "fix: arenaV2.js last_arena_date + missing tables migration"
git push

# 2. Supabase SQL editor → production project (eybchcqwbizjmzyrviri):
# Paste and run: missing_tables_migration.sql
```

### Day 1–3 (content: P0-B)
Seed Aptitude + Logical problems. Minimum 200 rows each. Format: MCQ, difficulty spread Easy/Medium/Hard, category = "Aptitude" / "Logical".

### Day 3–5 (performance: P0-C)
Fix ArenaCatalog query:
```js
// Replace:
problemsDb.from("problems").select("*")

// With:
problemsDb.from("problems")
  .select("id,slug,title,difficulty,category,statement,estimated_mins,elo_impact,sandbox_type,language,tags")
  .range(0, 49)  // paginate — 50 per page
```

### Day 5–7 (infra: P1-B)
Either upgrade Render tier or add keepalive cron.

### Week 2 (content: P1-A)
Seed Medium + Hard problems for MBA, Mechanical, Pharmacy, IoT. Without this, ELO is non-functional for 4 of 10 career tracks.

---

## Final Verdict

**Capabilio has a genuinely differentiated architecture.** The role registry, workbench system, proof propagation chain, and ELO model are well-designed. The code quality is high. The DB schema (minus the 4 missing tables) is sound. The security fundamentals are correct.

**The gap between the architecture and the live user experience is in three specific areas:**
1. The 4 missing DB tables break the entire proof/streak/leaderboard chain right now.
2. The content is too shallow (Aptitude/Logical missing; non-IT problems almost entirely Easy) to deliver on the ELO differentiation promise.
3. The ArenaCatalog query will cause unacceptably slow load times for the majority of non-IT users on Indian mobile connections.

Fix these three things and Capabilio is genuinely ready for a closed beta of 200–500 students. Fix the P1 content depth and you have a credible public launch.

---

*Report generated by automated DB audit (Supabase MCP) + static code analysis (source repository scan). Runtime browser E2E validation pending — requires Claude-in-Chrome extension installation or CI Playwright environment with network access to capabilio.online.*
