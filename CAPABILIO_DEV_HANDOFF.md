# Capabilio — Developer Handoff Document

**Version:** 1.0  
**Purpose:** Implementation-ready specification. Each section maps to shippable work. Read this before writing a line of code.  
**Companion docs:** `CAPABILIO_ARCHITECTURE.md` (full context) · `CAPABILIO_NOTION.md` (team wiki)

---

## How to Use This Document

1. Pick a Phase (bottom of doc) to know what to build next
2. Find the relevant Module section for specs
3. Each section has: **What to build → Contract → Acceptance Criteria → Edge Cases**
4. When in doubt, check `CAPABILIO_ARCHITECTURE.md` for deeper context

---

## Part 1 — Component Contracts

### 1.1 `<Header />`

**File:** `frontend/src/components/Header.jsx`

**Props:**
```js
{
  user: object,           // Supabase auth user
  userData: object,       // Supabase profiles row
  activePath: string,     // "aura" | "arena" | "pulse" | "skillstudio" | "launchpad"
  onNavigate: fn(page),   // called with page name string
}
```

**Renders:**
- Logo left
- Path tabs center: Aura · Arena · Pulse · Skill Studio · Launchpad
- ELO badge right: `ELO {userData.eloRating}` — animates on change
- Avatar + name + sign-out right

**ELO badge behavior:**
- Subscribes to `profiles` Realtime channel for `elo_rating` changes
- On change: number animates from old → new using `requestAnimationFrame` count-up
- Color: amber (400–549), blue (550–649), green (650–749), purple (750+)

**Acceptance criteria:**
- [ ] ELO updates within 1s of arena submission without page reload
- [ ] Active path tab is visually distinct (border-bottom or background)
- [ ] Mobile: collapses to bottom nav bar with 5 icons
- [ ] Sign-out calls `supabase.auth.signOut()` and redirects to `/`

---

### 1.2 `<ArenaWorkstation type="sql" />` (SQL Lab)

**File:** `frontend/src/arena/ArenaWorkstations.jsx`

**Critical requirement:** Uses `sql.js` (SQLite WASM). Real execution. Never fake output.

**Initialization:**
```js
import initSqlJs from 'sql.js'

const SQL = await initSqlJs({ locateFile: file => `/sql-wasm/${file}` })
const db = new SQL.Database()
// Seed with challenge dataset
db.run(mission.schemaSQL)
```

**Query execution:**
```js
const runQuery = (sql) => {
  try {
    const results = db.exec(sql)
    // results = [{ columns: [...], values: [[...], ...] }]
    return { success: true, rows: formatResults(results) }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
```

**UI contract:**
```
Left panel (40%): Mission brief + schema reference + hints
Right panel (60%): Monaco editor (SQL) + Results grid + Run / Submit buttons
```

**Acceptance criteria:**
- [ ] sql.js loads via WASM, runs real SQLite queries
- [ ] Query errors display inline (not page crash)
- [ ] Results render in a scrollable table grid
- [ ] Submit disabled until user has run at least 1 query
- [ ] Timer counts down visually; on expiry: auto-submit with current code
- [ ] Schema sidebar shows table names + column types for the challenge dataset

---

### 1.3 `<ArenaWorkstation type="notebook" />` (Pyodide Notebook)

**File:** `frontend/src/arena/ArenaWorkstations.jsx`

**Critical requirement:** Uses `Pyodide` (Python WASM). Real Python execution.

**Initialization:**
```js
const pyodide = await loadPyodide()
await pyodide.loadPackagesFromImports(starterCode) // auto-loads numpy, pandas, etc.
```

**Cell execution:**
```js
const runCell = async (code) => {
  try {
    const result = await pyodide.runPythonAsync(code)
    return { output: String(result ?? ""), error: null }
  } catch (e) {
    return { output: null, error: e.message }
  }
}
```

**UI contract:**
```
Cell-based editor (like Jupyter): code block + output block pairs
Run Cell button per cell
Add Cell / Delete Cell controls
Matplotlib output: rendered as PNG via pyodide canvas → displayed inline
```

**Acceptance criteria:**
- [ ] Pyodide loads once and is reused across cells (not re-initialized per run)
- [ ] `pandas`, `numpy`, `matplotlib` available without manual pip install
- [ ] Matplotlib figures render inline as images
- [ ] Print output captured and displayed below cell
- [ ] Exceptions show traceback in red below cell, do not crash workstation

---

### 1.4 `<ChallengeShell />`

**File:** `frontend/src/arena/ChallengeShell.jsx`

**Wraps every workstation. Owns: timer, submission state, score display.**

**State machine:**
```
idle → active (on "Start Challenge") → submitted → scored
```

**Timer logic:**
```js
const [timeLeft, setTimeLeft] = useState(mission.timeLimit * 60) // seconds
useEffect(() => {
  if (status !== 'active') return
  const interval = setInterval(() => {
    setTimeLeft(t => {
      if (t <= 1) { autoSubmit(); return 0 }
      return t - 1
    })
  }, 1000)
  return () => clearInterval(interval)
}, [status])
```

**Submission flow:**
```js
const handleSubmit = async (code) => {
  setStatus('submitted')
  const result = await fetch('/api/arena/submit', {
    method: 'POST',
    body: JSON.stringify({ missionId, code, userId, domain, workstation })
  }).then(r => r.json())
  setScore(result.score)
  setFeedback(result.feedback)
  setEloGain(result.eloGain)
  setStatus('scored')
  // Trigger ELO animation in header via Supabase Realtime (auto-fires from DB update)
}
```

**Score display (post-submission):**
```
Score: 88/100
ELO gained: +16
Feedback: "Strong window function usage. Minor: missing NULL handling."
[Back to Arena]  [Retry]  [View Proof]
```

**Acceptance criteria:**
- [ ] Timer visible at all times during active challenge
- [ ] Auto-submit fires if timer hits 0
- [ ] Submit button disabled after first submission
- [ ] Score display animates in (count-up from 0 to final score)
- [ ] "View Proof" links to proof artifact in Aura

---

### 1.5 `fetchSkillGap()` — Skill Gap Function

**File:** `frontend/src/pages/Aura.jsx`

**Contract: this function must produce valid, user-accurate data in ALL network conditions.**

```js
const fetchSkillGap = async () => {
  // 1. Always generate localBase first (instant, no network, always accurate)
  const localBase = generateMockSkillGap()

  // 2. Build user score lookup from skillGraph (NOT from localBase.urgentGaps)
  const sgMap = {}
  rawSG.forEach(s => { sgMap[key(s)] = s.value || s.score || 0 })
  const getScore = (skillName) => { /* fuzzy match against sgMap */ }

  // 3. Try live API
  try {
    const liveData = await fetch('/api/skill-gap', ...).then(r => r.json())

    // 4. Validate: filter out "Not provided" / empty / placeholder names
    const isValid = (g) => g?.skill?.trim().length > 1
      && g.skill !== "Not provided" && !g.skill.startsWith("<")
    const validGaps = (liveData.gaps || []).filter(isValid)

    if (validGaps.length) {
      // 5. Compute user scores from skillGraph directly
      const urgentGaps = validGaps
        .map(g => ({ ...g, userScore: getScore(g.skill), weeksToLearn: g.weeks || 4 }))
        .filter(g => g.userScore < 70)
        .sort((a, b) => (b.pct || 0) - (a.pct || 0))

      // 6. Recompute topAction and competitiveIn from actual urgentGaps
      const finalUrgent = urgentGaps.length ? urgentGaps : localBase.urgentGaps
      const topGap = finalUrgent[0]

      setSkillGapData({
        ...localBase,      // youHave and _meta always from local (user-profile-aware)
        urgentGaps: finalUrgent,
        emerging: validEmerging.map(g => ({ ...g, userScore: getScore(g.skill) })),
        competitiveIn: finalUrgent.length > 0 ? (topGap.weeksToLearn + finalUrgent.length * 2) : 4,
        topAction: `Bridge ${topGap.skill} — ${topGap.userScore}% → 81% in ${topGap.weeksToLearn}w`,
        marketDemand: buildMarketDemandStr(liveData, role, rawSG.length),
        _meta: { ...localBase._meta, live: true }
      })
      return
    }
  } catch (e) { /* silent fallback */ }

  // 7. Fallback: localBase is always correct
  setSkillGapData(localBase)
}
```

**Acceptance criteria:**
- [ ] Renders within 100ms (localBase is synchronous)
- [ ] "Not provided" skill names NEVER appear in the UI
- [ ] user scores correctly reflect skillGraph (Python 100% appears in "You Have")
- [ ] topAction references the top skill in the visible urgentGaps column
- [ ] API failure falls back to localBase silently (no error state shown to user)
- [ ] Auto-triggers when `activeTab === "skillgap"` changes to true

---

## Part 2 — API Contracts

### 2.1 `POST /api/arena/daily`

**Purpose:** Generate or return today's 3 missions for a user.

**Request:**
```json
{
  "userId": "uuid",
  "domain": "Data Analyst",
  "domainKey": "data",
  "keyword": "Data Analyst",
  "path": "student",
  "eloRating": 524
}
```

**Response:**
```json
{
  "missions": [
    { "id": "...", "difficulty": "Easy", "workstation": "sql", ... },
    { "id": "...", "difficulty": "Medium", "workstation": "notebook", ... },
    { "id": "...", "difficulty": "Hard", "workstation": "data_pipeline", ... }
  ],
  "cached": true
}
```

**Server logic:**
1. Query `arena_missions` WHERE `user_id = $1 AND status = 'pending' AND expires_at > NOW()`
2. If 3 missions found → return them (cached=true)
3. Else → call `geminiGenerateMission()` 3 times (Easy/Medium/Hard) in parallel
4. Insert into `arena_missions` with `expires_at = midnight IST`
5. Return new missions (cached=false)

**Edge cases:**
- Gemini fails for one difficulty → retry once; if still fails, return the 2 that succeeded
- User has no domain set → default to "software engineer"
- `eloRating = 0` → treat as 400

---

### 2.2 `POST /api/arena/submit`

**Request:**
```json
{
  "missionId": "arena-missions UUID",
  "code": "SELECT ...",
  "userId": "uuid",
  "domain": "data",
  "workstation": "sql"
}
```

**Response:**
```json
{
  "score": 88,
  "feedback": "Strong window function usage...",
  "eloGain": 16,
  "proofId": "arena-history UUID"
}
```

**Server logic:**
1. Fetch mission from `arena_missions` (validate ownership)
2. Build scoring prompt: `[mission brief] + [rubric] + [submitted code]`
3. Call Gemini for score + feedback
4. Compute ELO delta (see formula below)
5. `INSERT INTO arena_history (user_id, task_id, score, elo_delta, feedback, ...)`
6. `UPDATE profiles SET elo_rating = elo_rating + $delta, arena_completed = arena_completed + 1 WHERE id = $userId`
7. `UPDATE arena_missions SET status = 'completed', completed_at = NOW() WHERE id = $missionId`
8. Return score + feedback + eloGain

**ELO delta formula:**
```js
const multiplier = { Easy: 1.0, Medium: 1.5, Hard: 2.0 }[difficulty]
const base = Math.round(30 * multiplier * (score / 100))
const streak = userData.streak
const bonus = streak >= 30 ? 12 : streak >= 14 ? 8 : streak >= 7 ? 5 : 0
const delta = score >= 50 ? base + bonus : 0
```

**Acceptance criteria:**
- [ ] Score is always 0–100
- [ ] ELO never goes below role floor (400/600/800) due to any submission
- [ ] `arena_history` row is inserted even for score = 0
- [ ] `arena_missions` status updated to 'completed'
- [ ] Realtime subscription in frontend fires within 2s

---

### 2.3 `POST /api/skill-gap`

**Request:**
```json
{ "domain": "Data Analyst", "keyword": "Data Analyst", "elo": 524, "path": "student" }
```

**Response:**
```json
{
  "gaps": [
    {
      "skill": "dbt (Data Build Tool)", "demand": "High", "weeks": 4,
      "surge": true, "pct": 67,
      "reason": "dbt has become the industry standard for analytics engineering...",
      "whatYouNeed": "Proficient with models, tests, sources, and documentation",
      "interviewFocus": "Explain incremental models vs full-refresh"
    }
  ],
  "emerging": [ { "skill": "Apache Airflow", ... } ],
  "growth": "18%",
  "marketSignals": ["dbt adoption up 67% YoY", "..."],
  "topAction": "Start dbt fundamentals course on dbt Learn this week",
  "cached": false
}
```

**Validation before returning:**
```js
function hasValidSkills(data) {
  const validGaps = (data.gaps || []).filter(g => {
    const s = (g?.skill || "").trim()
    return s.length > 1 && !/^(<.*>|Not provided|string|undefined|null)$/i.test(s)
  })
  return validGaps.length >= 2
}
// If !hasValidSkills(data) → return 500
```

**Acceptance criteria:**
- [ ] Response contains ≥ 2 gaps with real skill names
- [ ] Cached responses return within 50ms
- [ ] Cache key = `${domainKey}_${path}`
- [ ] Cache TTL = 6 hours
- [ ] Returns 500 if Gemini + Groq both fail or return placeholders
- [ ] Never returns `"Not provided"`, `"<skill>"`, or empty skill names

---

### 2.4 `POST /api/assess/generate`

**Request:**
```json
{
  "jobTitle": "Data Analyst",
  "count": 20,
  "domainSkills": ["SQL", "Python", "Data Visualization", "Statistical Analysis"],
  "mix": { "mcq": 10, "code_output": 4, "problem_solving": 3, "scenario": 2, "fill_blank": 1 }
}
```

**Response:**
```json
{
  "questions": [
    {
      "id": 1, "type": "mcq", "category": "SQL",
      "question": "Which window function assigns consecutive ranks without gaps for ties?",
      "options": ["RANK()", "DENSE_RANK()", "ROW_NUMBER()", "NTILE(4)"],
      "correct": 1,
      "explanation": "DENSE_RANK assigns consecutive ranks — ties share a rank but the next rank is not skipped."
    }
  ]
}
```

**Rules enforced:**
- Every question has exactly 4 options (no "A)" prefixes — plain strings)
- `correct` is 0-based index
- `category` must match one of the `domainSkills` exactly
- `code` field only for `code_output` type
- Campus-interview level (Wipro/TCS/Infosys), not LeetCode-hard

**Acceptance criteria:**
- [ ] Returns exactly `count` questions
- [ ] Every skill in `domainSkills` appears as a category at least once
- [ ] No question has `correct` outside 0–3
- [ ] `code` field is absent on non-`code_output` questions
- [ ] Questions are randomized order each generation

---

## Part 3 — Database Operations

### 3.1 ELO Update (Atomic)

Always use a single `UPDATE` with arithmetic — never read-then-write:

```sql
UPDATE profiles
SET
  elo_rating = GREATEST(role_floor, elo_rating + $delta),
  arena_completed = arena_completed + 1,
  arena_last_active = NOW(),
  streak = CASE
    WHEN DATE(arena_last_active) = CURRENT_DATE - INTERVAL '1 day'
    THEN streak + 1
    ELSE 1
  END,
  updated_at = NOW()
WHERE id = $userId;
```

`role_floor` per path: student=400, professional=600, executive=800

### 3.2 Skill Graph Update

Never overwrite — weighted average:

```js
// Server-side helper
const updateSkillGraph = (existingGraph, skill, newScore, source) => {
  const existing = existingGraph.find(s =>
    s.label?.toLowerCase() === skill.toLowerCase()
  )
  if (!existing) {
    return [...existingGraph, { label: skill, skill, value: newScore, score: newScore, source }]
  }
  // Weight: arena submissions weighted at 70% new / 30% old
  const weighted = Math.round(newScore * 0.7 + existing.value * 0.3)
  return existingGraph.map(s =>
    s.label?.toLowerCase() === skill.toLowerCase()
      ? { ...s, value: weighted, score: weighted, source }
      : s
  )
}
```

### 3.3 Proof Artifact Query (Recruiter View)

```sql
SELECT
  ah.id, ah.title, ah.domain, ah.type, ah.score,
  ah.elo_delta, ah.feedback, ah.completed_at,
  ah.workstation
FROM arena_history ah
WHERE ah.user_id = $userId
  AND ah.score >= 40            -- only show passing proofs
ORDER BY ah.completed_at DESC
LIMIT 20;
```

### 3.4 Recruiter Search Query

```sql
SELECT
  p.id, p.name, p.username, p.keyword,
  p.elo_rating, p.skill_graph, p.personal_info,
  COUNT(ah.id) AS proof_count,
  MAX(ah.completed_at) AS last_active
FROM profiles p
LEFT JOIN arena_history ah ON ah.user_id = p.id
WHERE
  p.keyword ILIKE $role
  AND p.elo_rating >= $minElo
  AND p.personal_info->>'city' ILIKE $city
  AND (p.personal_info->>'openToOpportunities')::boolean = true
GROUP BY p.id
HAVING COUNT(ah.id) >= 3          -- minimum proof requirement
ORDER BY p.elo_rating DESC
LIMIT 50;
```

---

## Part 4 — Business Logic Rules

### 4.1 ELO Rules (non-negotiable)

| Rule | Value |
|------|-------|
| Student floor | 400 |
| Professional floor | 600 |
| Executive floor | 800 |
| Max decay per day | 5 pts |
| Decay grace period | 15 days |
| Decay never below | Role floor |
| Fail penalty | 0 (no punishment) |
| Streak bonus threshold | 7 / 14 / 30 days |

### 4.2 Proof Visibility Rules

| Condition | Visible to Recruiter? |
|-----------|----------------------|
| Score ≥ 40 | ✅ Yes |
| Score < 40 | ❌ No (still stored, shown to user as "failed") |
| User open to opportunities = false | ❌ No profile in search |
| Less than 3 proofs | ❌ Not discoverable |

### 4.3 Skill Score Source Priority

Higher priority source overrides lower when same skill updated:

```
1. arena   (highest — proven in live execution)
2. assessment (formal MCQ test)
3. resume  (extracted from uploaded document)
4. manual  (self-reported)  ← lowest trust
```

### 4.4 Recruiter Discoverability Gates

All 3 must be true for a profile to appear in recruiter search:
1. `profile.personal_info.openToOpportunities === true`
2. `profile.elo_rating >= roleMinimumElo`
3. `COUNT(arena_history WHERE score >= 40) >= 3`

### 4.5 Mission Expiry

- Missions expire at midnight IST (23:59:59 IST)
- Expired missions → `status = 'expired'`
- New missions generated on next page load
- User cannot "carry over" yesterday's missions

---

## Part 5 — Frontend State Patterns

### 5.1 Profile State Sync

```js
// In Aura.jsx — single source of truth
const [localUserData, setLocalUserData] = useState(propUserData)

useEffect(() => {
  const uid = user.id
  const unsub = userDoc.subscribe(uid, (newData) => {
    setLocalUserData(newData)
    if (setUserData) setUserData(newData) // propagate to App.jsx
  })
  return () => unsub()
}, [user.id])
```

**Rule:** Never read ELO or skill graph from React state directly in computation functions. Always read from `localUserData` (which is Realtime-synced).

### 5.2 Arena History Loading

```js
// Load from Supabase, not from profile JSON
useEffect(() => {
  supabase
    .from("arena_history")
    .select("task_id, title, domain, score, elo_delta, completed_at, feedback")
    .eq("user_id", uid)
    .order("completed_at", { ascending: false })
    .limit(100)
    .then(({ data }) => setArenaHistRows(data || []))
}, [user?.id])
```

### 5.3 Loading States

Every AI-powered section must have 3 states:
```
1. loading: skeleton cards or spinner
2. data: rendered content
3. error: inline error message (never full page error)
```

```jsx
{loading && <SkeletonCard />}
{!loading && data && <ContentView data={data} />}
{!loading && error && <InlineError message={error} />}
{!loading && !data && !error && <EmptyState onAction={fetch} />}
```

---

## Part 6 — Performance Requirements

| Metric | Requirement |
|--------|------------|
| Time to interactive (home page) | < 3s on 4G |
| Arena mission load (cached) | < 500ms |
| Arena mission load (first gen) | < 8s (Gemini call) — show loading state |
| SQL Lab first query run | < 2s (sql.js init) |
| Notebook first cell run | < 10s (Pyodide init) — show "Loading Python..." |
| Skill gap (local fallback) | < 100ms |
| Skill gap (live API, cached) | < 500ms |
| Skill gap (live API, uncached) | < 6s — show "Scanning Job Market..." |
| ELO update reflection in header | < 2s post-submission |
| Resume extraction | < 15s — show step-by-step progress text |

---

## Part 7 — Security Requirements

### 7.1 Row Level Security (Supabase RLS)

```sql
-- Users can only read their own profile
CREATE POLICY "users_read_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "users_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- arena_history is insert-only for owner
CREATE POLICY "users_insert_own_history" ON arena_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No user can update or delete arena_history (immutable proofs)
-- Only service_role key can update arena_history (for elo_delta corrections)
```

### 7.2 API Rate Limiting

```js
import rateLimit from 'express-rate-limit'

const arenaLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,              // 10 arena requests per minute per IP
  message: { error: "Too many requests" }
})

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,               // 5 AI calls per minute per IP
})

app.use('/api/arena/submit', arenaLimiter)
app.use('/api/skill-gap', aiLimiter)
app.use('/api/assess/generate', aiLimiter)
```

### 7.3 Input Validation

Always validate body before processing:
```js
// arena/submit
if (!missionId || !code || !userId) return res.status(400).json({ error: "Missing fields" })
if (typeof code !== 'string' || code.length > 50000) return res.status(400).json({ error: "Invalid code" })
if (!['sql', 'notebook', 'frontend', 'backend', 'devops'].includes(workstation)) {
  return res.status(400).json({ error: "Invalid workstation" })
}
```

---

## Part 8 — Phase Checklist

Use this to track implementation progress:

### Phase 1: Infrastructure
- [ ] Supabase project: auth, profiles, arena_history, arena_missions tables created
- [ ] RLS policies applied
- [ ] Express backend: route scaffolding, env setup
- [ ] React frontend: Vite setup, auth gating, routing by path
- [ ] Header component with ELO badge (static value ok for now)
- [ ] Onboarding: path selector → domain input → profile creation
- [ ] Supabase Realtime subscription in Header for ELO

### Phase 2: Arena MVP
- [ ] `/api/arena/daily` — Gemini mission generation with DOMAIN_CONTEXT
- [ ] Mission stored in `arena_missions`, sticky until midnight IST
- [ ] ArenaWorkstations: SQL Lab (sql.js WASM)
- [ ] ArenaWorkstations: Code IDE (Monaco + Pyodide)
- [ ] ChallengeShell: timer, mission brief, submit
- [ ] `/api/arena/submit` — Gemini scoring, arena_history insert, ELO update
- [ ] ELO badge animates post-submission via Realtime
- [ ] Proof badge on submission screen

### Phase 3: Aura + Skill Graph
- [ ] `/api/profile/:userId` GET and PATCH
- [ ] `/api/extract-pdf` — Gemini multimodal, isProjectEntry() classification
- [ ] Aura.jsx: Career & Vault tab — experience timeline, vault
- [ ] Aura.jsx: Skills tab — skill graph radar, assessment trigger
- [ ] `/api/profile/public/:username` — no auth, recruiter-safe view
- [ ] Skill graph updates on arena submission (weighted avg)

### Phase 4: Assessment + Skill Gap
- [ ] `/api/assess/generate` — Gemini MCQ, 5 question types
- [ ] Assessment UI: question flow, timer, result with per-skill scores
- [ ] Skill graph update from assessment results
- [ ] `/api/skill-gap` — Gemini Search grounding, hasValidSkills() validation, 6h cache
- [ ] Skill Gap UI: 3-column layout, bars, topAction
- [ ] Auto-trigger on tab open, silent fallback to localBase

### Phase 5: Skill Studio
- [ ] `/api/studio/learning-path` — Gemini phased learning path
- [ ] `/api/studio/lesson` — Gemini micro-lesson
- [ ] Studio UI: phase nav, lesson viewer, quiz, practice task
- [ ] Lesson progress tracked in profile
- [ ] "Go to Skill Studio" CTA in Skill Gap tab → auto-selects first gap skill

### Phase 6: Launchpad
- [ ] Job listing data (seed or API)
- [ ] Matching algorithm: ELO + skill + domain
- [ ] Launchpad UI: readiness check, matched jobs, apply tracking
- [ ] "Open to opportunities" toggle
- [ ] `/api/recruiter/search` basic endpoint

### Phase 7: Recruiter & Org
- [ ] `org_profiles`, `hiring_pipelines` tables
- [ ] Org admin UI: team dashboard, challenge deployment
- [ ] Recruiter dashboard: search, filters, results grid
- [ ] Pipeline management: stages, notes, candidate cards
- [ ] Team ELO aggregate view

### Phase 8: Verification
- [ ] `certifications` table
- [ ] `/api/verify/cert` — per-provider cert ID check
- [ ] Verification badge UI (5 tiers)
- [ ] Document upload + AI extraction for experience verification

### Phase 9: AI Interview + Code DNA
- [ ] `/api/interview/start`, `/respond`, `/complete`
- [ ] Interview UI with voice (Deepgram) + TTS response (ElevenLabs)
- [ ] STAR analysis in post-interview report
- [ ] `/api/github/fingerprint` + Code DNA tab

### Phase 10: Scale & Polish
- [ ] Rate limiting on all AI endpoints
- [ ] Lazy-load workstations (code splitting)
- [ ] Mobile nav (bottom bar, responsive layouts)
- [ ] Analytics events (Mixpanel/Amplitude)
- [ ] Plan gating (Free vs Pro feature flags)
- [ ] Razorpay payment integration + webhook handler
- [ ] Error monitoring (Sentry)
- [ ] ELO decay moved to Supabase Edge Function cron

---

*Capabilio Dev Handoff v1.0 — Engineering Team*  
*Update this doc when contracts change. Never let the handoff go stale.*
