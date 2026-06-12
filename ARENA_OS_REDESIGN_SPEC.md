# Capabilio Arena OS — Complete Product Redesign Specification

**Version 3.0 · Production design spec · Covers product concept, UX architecture, all 16 workstation families, 18-domain mapping, interaction model, screen-level layout specs, Next.js rendering architecture, and Supabase data model.**

---

# 1. Redesign Vision

## 1.1 The one-sentence reframe

Arena stops being "a place with challenges" and becomes **a challenge operating system: one shell, one assignment engine, one proof pipeline — and eighteen real work environments running inside it.**

The current product's root disease is that it inverted this. It built eighteen *labels* on top of one environment (a code editor with different headers), and a homepage that behaves like a filterable library. Users experience this immediately as fakeness: a system design task in a markdown box, a dashboard that only appears after submission, "Run Tests" on a business analysis task. Every one of the ten listed problems is a symptom of label-over-environment.

The redesign inverts it back:

- **One product** — single navigation, single ELO economy, single attempt/history/proof model, single visual language.
- **Many environments** — the center of the screen is a *workstation renderer slot*. What loads there is decided by `challenge.workspace`, never by CSS reskinning. A SQL Lab is not a themed textarea; it is a schema explorer, a query editor bound to a real embedded database, an EXPLAIN visualizer, and a result grid.

## 1.2 Operating metaphor: a mission desk, not a library

The homepage is redesigned around the metaphor of **reporting for duty**. A working analyst does not open their laptop to a card grid of 400 optional tasks; they open it to *what's assigned to them today, what's broken that they should fix, and the proof of what they've shipped*. Arena's homepage becomes exactly that:

1. **Your standing** (readiness strip — who you are, how strong, how consistent),
2. **Your missions** (daily challenge, adaptive repair, recruiter challenges, queued work),
3. **Your proof** (artifacts recruiters can see, ELO trajectory, frozen history),
4. and only then, **the library** (practice catalog, below the fold, deliberately demoted).

This single re-ordering fixes problems #1, #2, and #10 structurally rather than cosmetically: the page has a job (get you into today's mission within 10 seconds) instead of a mood (browse).

## 1.3 The three contracts the redesign enforces

Every design decision in this document descends from three contracts:

**Contract A — Environment Fidelity.** A challenge may only ship if its workstation contains the *tools the real role uses to do that task*. Frontend → live preview + console + a11y scanner. SOC → alert queue + enrichment + IR timeline. If the right workstation doesn't exist yet, the challenge waits. This is the quality gate that kills "generic editor with a different label" (problem #3, #4) permanently.

**Contract B — Live Truth.** *Run*, *Validate*, and *Preview* all operate on the live workspace, before submission, with real execution (WASM SQL/Python, sandboxed iframes, deterministic simulators). The user must never submit to see their own output (problems #5, #6, #7). Validation visibly mutates workspace state: checks flip, charts fill, gauges move.

**Contract C — Frozen Proof.** *Submit* is the only destructive-ish action: it freezes the attempt — code, queries, canvas, outputs, rendered artifact — into an immutable submission, scores it, and mints a recruiter-visible **ProofDoc**. The Submissions tab is an archive of frozen attempts, never the birthplace of output (problem #8).

## 1.4 Positioning statement

> **Capabilio Arena** is where Indian talent proves skill the way work actually happens: in the real tools of their role, on missions assigned by an engine that knows their gaps, producing portable, recruiter-verifiable proof — one ELO, one history, eighteen professions.

Competitive position: LeetCode proves you can pass interviews; Arena proves you can do the job. The proof artifact — not the score — is the product recruiters buy via Launchpad.

## 1.5 What explicitly dies in this redesign

- The library-first homepage (becomes a below-fold section).
- The universal dark code editor as the default center pane.
- "Run Tests" as a global verb.
- Output that first appears in the Submissions tab.
- Mock result generators of any kind — every workstation runs on the real execution engine (sql.js / Pyodide / sandboxed iframe / deterministic simulator), seeded per challenge.
- Empty screens without a next action. Every empty state in Arena names the action that fills it.

---

# 2. Arena Product Model

## 2.1 The four-layer architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  L4  PROOF PIPELINE                                              │
│      attempts → frozen submissions → scoring → ProofDocs →       │
│      portfolio / Launchpad / Aura readiness                      │
├──────────────────────────────────────────────────────────────────┤
│  L3  WORKSTATION RENDERERS  (16 families, lazy-loaded modules)   │
│      Code IDE · Frontend Sandbox · API Workstation · SQL Lab ·   │
│      Notebook Lab · BI Dashboard Studio · Pipeline Studio ·      │
│      Infra Terminal · Cloud Architecture Lab · SRE Console ·     │
│      Security Console · SOC IR Console · QA Test Lab ·           │
│      Analysis Board · Mobile Studio · AI/LLM Studio ·            │
│      (+ System Design Workspace as canvas-family sibling)        │
├──────────────────────────────────────────────────────────────────┤
│  L2  UNIVERSAL CHALLENGE SHELL                                   │
│      top bar · prompt rail · renderer slot · context rail ·      │
│      action bar · result overlay · history view · autosave       │
├──────────────────────────────────────────────────────────────────┤
│  L1  ARENA CORE                                                  │
│      assignment engine · challenge lifecycle state machine ·     │
│      ELO economy · streaks · datasets/seeds · execution engines  │
└──────────────────────────────────────────────────────────────────┘
```

One shell (L2), one engine (L1), one pipeline (L4), many renderers (L3). A new domain is added by writing one L3 module and content — L1/L2/L4 never fork. This is the "one Arena shell, one assignment engine, one challenge lifecycle, many workstation renderers" architecture made literal.

## 2.2 The identity model: role → track → stack → challenge

| Concept | Meaning | Example | UI surface |
|---|---|---|---|
| **Role** | Ownership model — what you'd be hired as. Carries its own ELO. | Data Analyst | Role switcher (header), readiness strip |
| **Track** | Specialization inside a role | Product Analytics vs. Reporting/BI | Track chips on profile + assignment engine input |
| **Stack variant** | Preferred tooling; changes starter scaffolds and tool labels, never the workstation | SQL+Pandas vs. SQL+Tableau-style config | Stack switcher (homepage + shell top bar) |
| **Challenge** | A role-relevant proof task bound to exactly one workstation type | "Q1 Revenue Dashboard" | Mission cards, challenge shell |

Rule: **role picks the workstation family; stack variant picks the flavor inside it.** A Backend role with a Python stack still gets the API Workstation — the editor language and scaffold change, the panels don't. This keeps "unified product" and "realistic environment" from fighting each other (problem #9).

## 2.3 The challenge lifecycle (single state machine, all domains)

```
ASSIGNED → OPENED → IN_PROGRESS ⇄ VALIDATED(n) → SUBMITTED → SCORED → PROOFED
                         │                            │
                     (autosave drafts)        (attempt frozen, immutable)
```

- **ASSIGNED**: the assignment engine placed it in your queue (daily, repair, recruiter, or self-picked from library — self-picks also become assignments, so there is *one* queue model).
- **OPENED**: shell loads, workstation renderer mounts, seed data provisions (DB seeded, FS mounted, simulator initialized). Timer starts here if timed.
- **IN_PROGRESS**: continuous autosave of the *draft* (code, queries, canvas JSON, published panels) every 5s of idle + on blur.
- **VALIDATED(n)**: user ran Validate; results are stored as validation events on the draft and *rendered into the live workspace* (checklist flips, dashboard updates, gauge moves). Unlimited, cheap, encouraged.
- **SUBMITTED**: draft is snapshotted into an immutable attempt: inputs + outputs + rendered artifact. Multiple attempts allowed per challenge policy; each is its own frozen record.
- **SCORED**: rubric scoring (deterministic checks + AI evaluation of free-text/insight/rationale), ELO delta applied to role ELO and global ELO.
- **PROOFED**: a ProofDoc is minted (see §16) and pushed to the proof portfolio; Aura readiness and Launchpad job-fit consume the update.

Every domain, every workstation, every challenge type runs this same machine. What differs per workstation is only *what Run/Validate/Preview mean* — defined per family in §5–§15.

## 2.4 The assignment engine (one queue, four sources)

The engine maintains a single ordered **Mission Queue** per user, fed by four generators:

1. **Daily Mission** — one per day per active role; difficulty banded to current ELO (target 60–75% expected success); streak-bearing.
2. **Adaptive Repair** — generated when Pulse/Aura detects a weak topic or a failed rubric dimension recurs (e.g., "joins under NULLs" failed twice → a SQL Lab repair mission appears, tagged with the Skill Studio lesson it pairs with).
3. **Recruiter Challenges** — pushed via Launchpad; carry employer branding, deadline, and "proof shared with recruiter on submit" disclosure.
4. **Self-queued** — anything added from the Practice Library lands at the bottom of the queue.

Queue ordering: recruiter (deadline asc) → daily → repair → self-queued. The homepage renders the queue, not a library — this is the heart of "assignment-first."

## 2.5 One ELO economy

- **Global ELO** = weighted blend of role ELOs (active role ×1.0, others ×0.3), shown next to role ELO everywhere.
- Tiers (existing, preserved): Rookie 0–600 → upward bands with icon/color; tier renders on readiness strip, result overlay, and ProofDocs.
- ELO delta preview is shown *before* starting (+25 on solve, −8 on abandon-after-open for ranked missions; practice library runs are unranked by default with a "Rank this attempt" toggle at open time).
- Validation never changes ELO. Only SCORED submissions do. This keeps Contract B psychologically safe: validating is how you work, not how you're judged.

## 2.6 Ecosystem contracts

| System | Arena → it | It → Arena |
|---|---|---|
| **Aura** | submission scores, rubric dimension vectors, ELO updates | readiness targets that tune assignment difficulty |
| **Skill Studio** | failed rubric dimensions ("weak: window functions") | repair lesson links embedded in result overlay + repair missions |
| **Launchpad** | ProofDocs, recruiter-challenge submissions | recruiter challenge definitions, job-fit requirements ("this role wants ≥1 API Workstation proof at 1400+") |
| **Proof Portfolio** | every ProofDoc with visibility controls | render surface recruiters browse |

---

# 3. Homepage Redesign

## 3.1 Page concept

Name on the tab: **Arena — Mission Desk.** The page answers, top to bottom: *How strong am I? What must I do now? What have I proven? What else could I train on?* Four questions, four bands. Total page height ≈ 2.5 viewports at 1440×900; everything mission-critical lives in viewport 1.

## 3.2 Exact page order and hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│ A. GLOBAL HEADER (64px, persistent app chrome)                          │
│    Capabilio nav · Arena active · [Role Switcher ▾] · [Stack ▾] · user  │
├─────────────────────────────────────────────────────────────────────────┤
│ B. READINESS STRIP (88px)                                               │
│    Role identity · Role ELO + tier ring · Global ELO · Rank percentile  │
│    · Streak flame · Readiness arc (from Aura) · [View full profile →]   │
├──────────────────────────────────────────────┬──────────────────────────┤
│ C. MISSION HERO (2/3 width, ~280px)          │ D. RIGHT RAIL (1/3)      │
│    C1 Daily Mission card (dominant)          │  D1 ELO trend sparkline  │
│    C2 Adaptive Repair card (if exists)       │     (30-day, role+global)│
│    C3 Recruiter Challenge card (if exists)   │  D2 Recent activity feed │
│                                              │  D3 Streak + badges      │
├──────────────────────────────────────────────┼──────────────────────────┤
│ E. MISSION QUEUE (table/list, 2/3)           │ F. PROOF SHELF (1/3)     │
│    ordered queue w/ workstation badges,      │    latest 3 ProofDocs as │
│    ELO preview, deadline chips, start CTAs   │    artifact cards +      │
│                                              │    [Open portfolio →]    │
├─────────────────────────────────────────────────────────────────────────┤
│ ──────────────────────── fold (~900px) ──────────────────────────────── │
├─────────────────────────────────────────────────────────────────────────┤
│ G. WORKSTATION QUICK ACCESS (icon row, 120px)                           │
│    your role's workstations as launchable tiles ("open SQL Lab free-    │
│    practice with seeded data, unranked")                                │
├─────────────────────────────────────────────────────────────────────────┤
│ H. ROLE TRENDING (160px) — "Data Analysts this week are attempting…"    │
│    3 cards w/ attempt counts + median ELO of solvers                    │
├─────────────────────────────────────────────────────────────────────────┤
│ I. PRACTICE LIBRARY (full catalog, filterable, deliberately last)       │
│    filters: workstation type · difficulty · topic · duration · ranked   │
│    cards → [+ Queue] or [Start now]                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3.3 Section-by-section purpose and interactions

**B — Readiness Strip.** Identity + stakes in one glance. Left: role icon, role name, track chip. Center-left: **Role ELO** as the big number (e.g., `1,247`) inside a tier-colored progress ring showing distance to next tier; Global ELO smaller beside it. Center-right: rank percentile ("Top 18% of Data Analysts"), streak flame with day count. Right: Aura readiness arc (0–100) with delta since last week. Interactions: hovering the ring shows exact points to next tier; clicking percentile opens the role leaderboard; the strip is *not* sticky (the shell has its own chrome).

**C1 — Daily Mission hero.** The single most visually dominant element on the page. Contents: workstation glyph + name ("BI Dashboard Studio"), challenge title, one-line scenario hook ("Your manager needs the Q1 revenue dashboard by 9 AM"), difficulty pill, est. duration, **ELO at stake (+25)**, streak note ("Day 12 — keep it alive"), and one primary CTA: **▶ Start Mission**. Secondary: "Swap mission" (one swap/day, pulls next eligible from the band). If today's is complete: the card flips to a compact "✓ Completed — +25 ELO" state and C2/C3 promote upward — the hero slot is never empty.

**C2 — Adaptive Repair.** Amber-accented card: "Repair: Window Functions — your last 2 SQL attempts lost points here," with the paired Skill Studio lesson link ("Review first · 8 min") and **Start Repair** (unranked by default, "+15 ELO if ranked" toggle). Appears only when the engine has a diagnosis; absent, the slot collapses (no placeholder).

**C3 — Recruiter Challenge.** Employer-branded edge (logo, deadline countdown chip, "Proof shared with Flipkart on submit" disclosure line). CTA: **Start Challenge**. If multiple, a stacked count ("2 more from recruiters") expands the band.

**E — Mission Queue.** A dense, scannable list (not cards): each row = workstation badge (icon+color), title, source chip (Daily/Repair/Recruiter/Queued), difficulty, est. time, ELO preview, deadline (if any), [Start] button. Drag to reorder self-queued items only. Empty state (rare by design — daily always exists): "Queue clear. The library is open →" with a one-click "Auto-fill 3 missions for my goals."

**F — Proof Shelf.** Three latest ProofDocs as miniature artifact cards — *the actual artifact thumbnail* (dashboard PNG, architecture diagram, passing-contract badge), not a text row: title, score, ELO at time, visibility toggle (Private/Recruiters/Public link). Purpose: makes proof a daily-visible asset, reinforcing why missions matter.

**G — Workstation Quick Access.** One tile per workstation in the active role's mapping (Data Analyst shows SQL Lab, Notebook Lab, BI Studio). Clicking opens **Free Practice mode**: the workstation with seeded data and no challenge — a sandbox to warm up. This converts "tools" from something hidden inside challenges into a felt product surface, and gives the homepage a power-user reason to return.

**I — Practice Library.** The old homepage, demoted to a section: full filterable catalog. Each card carries the workstation badge prominently (users learn to *see* environments, not just topics). Actions: **Start now** (opens immediately, becomes an assignment) or **+ Queue**. Sort default: "Recommended for your gaps" (engine-ordered), switchable to newest/difficulty/popularity.

**Role switcher (header).** Switching role hot-swaps B–I entirely (ELO, queue, workstation tiles, trending, library default filters) with a 200ms crossfade. Stack switcher only re-labels scaffolds/tool names — deliberately subtle, reinforcing that stack ≠ environment.

## 3.4 Above/below-fold rationale

Above the fold: standing (B), today's work (C), trajectory + proof presence (D, top of F). The user can start the daily mission without scrolling — measured target: **time-to-mission-start < 10s** for returning users. Below the fold: everything optional. Trending and library are intentionally last; they are pull surfaces, and placing them below proof teaches the loop *do missions → mint proof → then browse for more*.

---

# 4. Universal Challenge Shell

## 4.1 The shell frame (identical for all 18 domains)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR · 48px · persistent                                                  │
│ ← Back · Arena ▸ Data Analyst ▸ Q1 Revenue Dashboard   [🟠 Medium] [📊 BI    │
│ Dashboard Studio] [Daily] [Role: Data Analyst]   ⏱ 38:53   +25 ELO   ⋯ menu │
├────────────┬──────────────────────────────────────────────────┬──────────────┤
│ LEFT       │ CENTER                                           │ RIGHT        │
│ PROMPT     │ WORKSTATION RENDERER SLOT                        │ CONTEXT RAIL │
│ RAIL       │ (the only region whose contents change           │ 300px        │
│ 320px      │  per challenge.workspace)                        │ collapsible  │
│ collapsible│                                                  │              │
│            │                                                  │ · live       │
│ tabs:      │                                                  │   checklist  │
│ Brief ·    │                                                  │ · validation │
│ Data/Specs │                                                  │   results    │
│ · Hints ·  │                                                  │ · proof      │
│ History    │                                                  │   preview    │
│            │                                                  │ · resources  │
├────────────┴──────────────────────────────────────────────────┴──────────────┤
│ ACTION BAR · 56px · persistent slots, workstation-specific labels            │
│ [⚙ Primary Run]  [✓ Validate]  [👁 Preview Proof]      autosave ✓ · [Submit] │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Persistent vs. workstation-owned

**Persistent across every workspace (the shell owns these):**
- Top bar: back, breadcrumb (`Arena ▸ Role ▸ Challenge`), difficulty pill, **workspace badge** (icon + family name, tier-colored), challenge-type badge (Daily/Repair/Recruiter/Practice), role badge, timer (counts down if timed; counts up if untimed), ELO preview, overflow menu (report issue, keyboard map, abandon).
- Left prompt rail with four fixed tabs: **Brief** (scenario, objective, steps, constraints, rubric preview), **Data/Specs** (datasets, API contracts, design specs — content varies, surface doesn't), **Hints** (progressive disclosure: hint n+1 unlocks 90s after hint n is opened; ranked missions show "−2 ELO per hint" before unlock), **History** (this challenge's frozen attempts).
- Right context rail: **Live Checklist** (rubric-derived, flips as validation passes), **Last Validation** (timestamped results), **Proof Preview** (thumbnail of what submission will mint — see 4.6), **Resources** (role cheatsheets).
- Bottom action bar: four fixed slots — Primary Run · Validate · Preview · Submit — labels and icons per workstation (§7). Slots never move; muscle memory transfers across domains.
- Result overlay, submission history view, autosave system.

**Workstation-owned (everything inside the center slot):** panel arrangement, internal tabs, editors, canvases, terminals, grids, simulators, internal mini-toolbars. The shell imposes only the outer frame and the action contract.

## 4.3 Collapsible and resizable rules

- Left rail: collapsible to a 40px icon strip (`[` key); resizable 280–400px by drag handle.
- Right rail: collapsible (`]`); resizable 260–360px. Auto-collapses below 1280px viewport width.
- Center renderer: receives all reclaimed space; internal splits within the renderer are also draggable, with per-workstation min sizes (defined in §18); double-click any divider to reset to the family's default ratio.
- Layout state persists per user per workstation family (localStorage + profile sync).
- **Focus mode** (`⇧F`): collapses both rails, hides the top-bar breadcrumb to a back chevron, keeps timer + action bar. Made for the last ten minutes of a timed mission.

## 4.4 Autosave

- Draft = full workspace state: editors, canvas JSON, published panels, terminal history, simulator state vector.
- Cadence: 5s idle debounce + on panel blur + on tab switch + before Run/Validate. Indicator in action bar: `Saving… → Saved ✓ → Offline (retrying)`.
- Drafts are per-attempt; reopening a challenge restores the exact workspace, including last validation results rendered in place.
- Conflict rule (two tabs open): last-writer-wins with a toast offering "restore other session's draft."

## 4.5 Hints

Hints live in the left rail, never as modal interruptions. Each hint card shows its cost before opening. Opened hints are recorded on the attempt and visible in the ProofDoc metadata ("solved with 1 hint") — honest proof beats inflated proof, and recruiters told us they trust artifacts more when hint usage is disclosed.

## 4.6 Proof preview

The right rail's **Proof Preview** panel always shows a live thumbnail of the artifact that submission would freeze *right now*: the dashboard snapshot, the design diagram, the test-run report. Clicking it (or the Preview action) opens the full-size **Proof Preview overlay** — the exact ProofDoc layout (§16) marked `DRAFT — not yet submitted`. This is the single most important fix for problems #6/#7: the user always knows what their proof will look like before they commit it.

## 4.7 Result overlay and submission history

- **Result overlay** (after Submit → Scored): grade ring, score /100, ELO delta animating onto the readiness number, rubric bar-breakdown, AI evaluator narrative ("Your MoM calculation was correct; your concern insight didn't cite a number"), weak-dimension chips linking to Skill Studio, and two CTAs: **View ProofDoc** · **Next Mission** (queue-aware). Timed-out attempts get partial scoring with a distinct "Time's Up — Partial Review" header.
- **Submission history** (left rail History tab + full-screen from overflow): a vertical timeline of frozen attempts — each entry: timestamp, score, ELO delta, artifact thumbnail, and **Open frozen attempt** which loads the workstation in **read-only frozen mode** (banner: `Attempt #2 · Frozen · Mar 4, 19:42`) showing the work and outputs exactly as submitted. Charts, canvases and terminals render — frozen. History is an archive, never the first render surface for output (fixes #8).

---

# 5. Workstation Taxonomy

## 5.1 The sixteen families

Each family is a self-contained renderer module. "Execution" states how truth is produced: **client-wasm** (real engines in browser: sql.js, Pyodide), **client-sandbox** (sandboxed iframe / web worker), **simulated** (deterministic, seeded simulators with real state machines — not canned text), **server** (containerized; reserved for v2 where noted).

| # | Workstation | Purpose (one line) | Execution |
|---|---|---|---|
| W1 | **Code IDE** | Algorithmic + general programming with a test harness | client-wasm (JS worker; Pyodide for Python) |
| W2 | **Frontend Sandbox** | Build UI against a spec with live preview, console, a11y, visual diff | client-sandbox |
| W3 | **API Workstation** | Implement/fix endpoints; request tester, logs, latency, contract validation | client-sandbox (in-browser service-worker server) |
| W4 | **Fullstack Studio** | W2 + W3 composed; one feature across both | composite |
| W5 | **SQL Lab** | Query craft on a live schema with EXPLAIN and result diff | client-wasm (sql.js; Postgres-wasm v2) |
| W6 | **Notebook Lab** | Cell-based pandas/python analysis with figures | client-wasm (Pyodide) |
| W7 | **BI Dashboard Studio** | Data → Build → Present dashboard workflow with publish/validate | client-wasm |
| W8 | **Data Pipeline Studio** | ETL/ELT build with DAG, run console, quality gates | client-wasm |
| W9 | **Infra Terminal** | Terminal + config editing + CI pipeline simulation | simulated (virtual FS + command interpreter) |
| W10 | **Cloud Architecture Lab** | Cloud topology design with cost + policy validation | simulated (canvas + rules engine) |
| W11 | **SRE Platform Console** | Metrics, logs, alerts; diagnose + remediate live incidents | simulated (time-series scenario player) |
| W12 | **Security Console** | Artifact forensics (logs/pcap/configs), SIEM-style queries, findings | simulated + client-wasm (real query eval over seeded logs) |
| W13 | **SOC IR Console** | Alert triage, enrichment, playbook execution, incident report | simulated |
| W14 | **QA Test Lab** | App-under-test + test authoring + run matrix + bug reports | client-sandbox |
| W15 | **Analysis Board** | BA/Product: documents, process maps, requirement matrices, metric trees | client (structured editors) |
| W16 | **Mobile Studio** | Device-frame preview, RN-web execution, multi-device matrix | client-sandbox |
| W17 | **AI / LLM Studio** | Prompt/pipeline engineering with eval runs, budgets, guardrails | client + server-proxied model calls |
| W18 | **System Design Workspace** | Architecture canvas + API/schema/capacity/trade-off panels | client (canvas + completeness rules) |

W15 has two skins (Business Analysis Board, Product Strategy Board) sharing one renderer with different default panels — counted as one module, two presets. W10 and W18 share the canvas engine; different palettes and validators.

## 5.2 Per-family definition (purpose · domains · tools · layout · panels · actions · semantics · proof)

The full per-family deep specs live in §9–§15. The contract table that every family must fill:

| Field | Definition |
|---|---|
| Purpose | The real-work task this environment mirrors |
| Supported domains | Which of the 18 roles route here |
| Core tools | The 3–6 instruments that make it credible |
| Layout | Default panel arrangement + ratios |
| Key panels | Named regions inside the renderer |
| Action labels | The four action-bar verbs, localized |
| Validation means | What "Validate" actually checks and how it mutates live state |
| Preview means | What artifact draft is rendered |
| Submission means | Exactly what gets frozen |
| Proof artifact | What the ProofDoc contains |

---

# 6. 18 Domain Mapping

## 6.1 The routing table

Primary = default workstation for the role's missions. Secondary = used by specific challenge types within the role. Every challenge declares exactly one workstation; the role mapping governs what the assignment engine generates.

| # | Domain | Primary workstation | Secondary workstations | Typical stack variants |
|---|---|---|---|---|
| 1 | Software Engineer / DSA | W1 Code IDE | W18 System Design | Python · Java · C++ · JS |
| 2 | Frontend Developer | W2 Frontend Sandbox | W1 (JS fundamentals), W18 | React · Vue · vanilla |
| 3 | Backend Developer | W3 API Workstation | W5 SQL Lab, W18 | Node · Python · Java/Spring |
| 4 | Fullstack Developer | W4 Fullstack Studio | W2, W3, W5 | React+Node · React+Python |
| 5 | Data Analyst | W7 BI Dashboard Studio | W5 SQL Lab, W6 Notebook Lab | SQL+Pandas · SQL+chart-config |
| 6 | BI Analyst | W7 BI Dashboard Studio | W5 | SQL+semantic-model · DAX-style calc |
| 7 | Data Engineer | W8 Pipeline Studio | W5, W6, W9 | Pandas · PySpark-style · SQL/ELT |
| 8 | DBA / Database Engineer | W5 SQL Lab (DBA preset: EXPLAIN-first) | W9 (backup/restore drills) | Postgres-style · MySQL-style |
| 9 | DevOps Engineer | W9 Infra Terminal | W10, W14 (pipeline tests) | Docker+GH-Actions · K8s+ArgoCD-style |
| 10 | Cloud Engineer | W10 Cloud Architecture Lab | W9 | AWS-pattern · Azure-pattern |
| 11 | SRE / Platform Engineer | W11 SRE Console | W9, W10 | Prometheus-style · Datadog-style |
| 12 | Cybersecurity Analyst | W12 Security Console | W13, W9 | network-forensics · appsec |
| 13 | SOC Analyst / IR | W13 SOC IR Console | W12 | SIEM-query · playbook-driven |
| 14 | QA / Test Automation | W14 QA Test Lab | W1, W3 (API testing) | Playwright-style · API-test |
| 15 | Business Analyst | W15 Analysis Board (BA preset) | W5 (data pulls), W18 (process views) | BRD-first · process-first |
| 16 | Product Analyst | W15 Analysis Board (Product preset) | W5, W6, W7 | SQL+funnel · experiment-design |
| 17 | Mobile App Developer | W16 Mobile Studio | W1, W3 | React Native · Flutter-style |
| 18 | AI / LLM Engineer | W17 AI/LLM Studio | W6, W1 | prompt-eng · RAG-pipeline · eval-eng |

## 6.2 Migration note from current config

Current `arenaDomains.js` keys map as: `frontend→2, backend→3, fullstack→4, swe→1, data→5, dba→8, cyber→12, devops→9, aws/azure→10 (merged role, stack variants), bi_analyst→6, data_engineer→7, sre→11, soc→13, qa→14, ba_product→split into 15+16`. New roles to add: `mobile (17)`, `ai_llm (18)`. `medical` and `ece` fall outside the 18-domain scope and remain on the legacy path until their workstations are designed (do not fake them in a code editor — Contract A).

## 6.3 Why this mapping fixes tool-task mismatch

Every row above was chosen by asking "what does this person's screen look like at work?" — not "what editor can render this?" The two historic offenders are now structurally impossible: system design *cannot* open a markdown editor because challenge JSON validates `workspace ∈ allowed_workstations[role,type]` at authoring time (§19.4), and analyst output *cannot* hide until submission because W7's Present tab is part of the live workspace.

---

# 7. Interaction Model

## 7.1 The four-slot action contract

The bottom bar has four fixed slots. Every workstation must define all four (Preview may alias to a center-panel focus where the live surface *is* the preview, e.g., Frontend Sandbox).

| Slot | Semantic | ELO effect | Frequency |
|---|---|---|---|
| **Primary Run** | Execute work-in-progress in the environment | none | constant |
| **Validate** | Check WIP against challenge criteria; render results into live workspace | none | several per attempt |
| **Preview Proof** | Render the draft ProofDoc exactly as submission would freeze it | none | 1–3 per attempt |
| **Submit** | Freeze attempt → score → mint proof | yes | once per attempt |

## 7.2 Per-workstation action language (exact labels)

| Workstation | Primary Run | Validate | Preview | Submit |
|---|---|---|---|---|
| W1 Code IDE | ▶ Run Code | ✓ Run Test Suite | 👁 Preview Report | Submit Solution |
| W2 Frontend Sandbox | ↻ Refresh Preview (auto) | ✓ Run Checks (a11y · visual diff · console) | 👁 Preview Build Proof | Submit Build |
| W3 API Workstation | ▶ Start Server | ✓ Run Contract Tests | 👁 Preview API Proof | Submit API |
| W4 Fullstack Studio | ▶ Run App | ✓ Run E2E Checks | 👁 Preview Feature Proof | Submit Feature |
| W5 SQL Lab | ▶ Run Query | ✓ Validate Result | 👁 Preview Query Proof | Submit Query |
| W6 Notebook Lab | ▶ Run Cells | ✓ Validate Findings | 👁 Preview Analysis | Submit Analysis |
| W7 BI Dashboard Studio | ▶ Run Query / Run Python | ✓ Validate Metrics | 👁 Preview Dashboard | Submit Dashboard |
| W8 Pipeline Studio | ▶ Run Pipeline | ✓ Run Quality Gates | 👁 Preview Pipeline Proof | Submit Pipeline |
| W9 Infra Terminal | ▶ Execute / Apply Config | ✓ Verify State | 👁 Preview Runbook Proof | Submit Configuration |
| W10 Cloud Architecture Lab | ⟲ Simulate Traffic | ✓ Check Policy & Cost | 👁 Preview Architecture | Submit Architecture |
| W11 SRE Console | ⟲ Run Simulation | ✓ Validate Response | 👁 Preview Incident Report | Submit Incident Report |
| W12 Security Console | ▶ Run Query / Analyze | ✓ Validate Findings | 👁 Preview Findings Report | Submit Findings |
| W13 SOC IR Console | ⟲ Advance Scenario | ✓ Validate Response | 👁 Preview IR Report | Submit Incident Report |
| W14 QA Test Lab | ▶ Run Tests (here it IS correct) | ✓ Check Coverage & Repro | 👁 Preview Test Report | Submit Test Suite |
| W15 Analysis Board | — (structured editing; slot hidden) | ✓ Check Completeness | 👁 Preview Document | Submit Analysis |
| W16 Mobile Studio | ▶ Run on Device | ✓ Run Device Matrix | 👁 Preview App Proof | Submit App |
| W17 AI/LLM Studio | ▶ Run Prompt / Pipeline | ✓ Run Eval Set | 👁 Preview Eval Report | Submit Pipeline |
| W18 System Design | — (canvas is live; slot hidden) | ✓ Check Completeness | 👁 Preview Proof | Submit Design |

Two rules embedded here: (a) "Run Tests" exists only where running tests is the *job* (W14) or the universally-understood judge harness (W1); (b) workstations whose medium is direct manipulation (canvas, documents) hide the Run slot rather than inventing a fake one — an empty slot is more honest than a wrong verb.

## 7.3 Result feedback channels

- Run results → inside the renderer (console, result grid, preview, simulator state). Never a modal.
- Validate results → right-rail checklist flips + inline annotations in the renderer (failing a11y node highlighted in preview; failing metric card outlined red in Present tab; missing canvas connection pulsing).
- Preview → full-screen overlay of the ProofDoc draft with `DRAFT` watermark.
- Submit → blocking progress (freeze → score), then Result overlay (§4.7).

## 7.4 Keyboard map (global)

`⌘↵` Primary Run · `⌘⇧V` Validate · `⌘P` Preview Proof · `⌘⇧S` Submit (confirm dialog) · `[` `]` rails · `⇧F` focus mode · `⌘K` command palette (jump to panel, insert snippet, open hint).

---

# 8. Validation vs Submission Logic

## 8.1 The principle

**Validation is formative; submission is summative.** Validation answers "am I on track?" against the live draft and is unlimited, free, and state-mutating. Submission answers "judge this" against a frozen snapshot and is scarce, scored, and immutable. The current product's semantic breakage (problem #5) came from blurring these — e.g., Validate buttons that did nothing, and outputs that only materialized at submission.

## 8.2 Exact validation workflow (all workstations)

```
user clicks Validate
 → shell autosaves draft
 → renderer.collectValidatables() → {outputs, state}
 → validation engine runs challenge.validation rules:
     · deterministic checks (ground-truth compare, schema asserts,
       contract tests, policy rules, completeness rules)
     · NO AI calls at validate time (fast, free, repeatable)
 → ValidationReport {checks:[{id,label,pass,detail,target}], coverage%}
 → persisted as validation_event on the draft
 → UI: right-rail checklist updates · renderer inline annotations
   render at each check's target locus · action bar shows "7/10 checks"
```

Validation runs entirely client-side against seeded ground truth shipped (hashed/obfuscated) with the challenge bundle — sub-second, offline-tolerant. AI-scored dimensions (insight quality, rationale, report writing) are explicitly listed in the checklist as `scored at submission` so the user knows what validation can and cannot tell them.

## 8.3 Exact submission workflow

```
user clicks Submit → confirm dialog (shows checks passing, hints used,
                     attempt # of allowed, ELO at stake)
 → final autosave → renderer.freeze() returns AttemptSnapshot:
     inputs   (code, queries, canvas JSON, config files, cell sources)
     outputs  (result grids, rendered charts PNG/SVG, preview screenshot,
               terminal transcript, simulator end-state, eval tables)
     events   (validation history, hint usage, time spent)
 → snapshot written immutably (attempts table + storage bucket)
 → scoring: deterministic rubric portion from final ValidationReport
            + AI evaluation of free-text/rationale/insights
 → ELO applied → ProofDoc minted (§16) → Result overlay
```

After submit, the workspace remains open in **post-submission mode**: read-only banner with [Start new attempt] (if attempts remain) which clones nothing — new attempts start from the original scaffold (prevents trivially patching the previous answer; the brief says so up front).

## 8.4 The invariant table

| Question | Validate | Submit |
|---|---|---|
| Mutates ELO? | never | yes |
| Limited? | no | per-challenge attempt policy (default 3; recruiter often 1) |
| Output visible? | yes — rendered into live workspace | yes — frozen into attempt + proof |
| AI evaluation? | no | yes (free-text dimensions) |
| Creates history? | validation events on draft | immutable attempt + ProofDoc |
| Reversible? | n/a | no — frozen forever |

## 8.5 Where each problem dies

- #5 (broken semantics): every Validate now executes §8.2 — a renderer cannot ship without `collectValidatables()` implemented (§19.2 contract).
- #6/#7 (output only after submission): outputs are produced by Run, checked by Validate, composed by Preview — all pre-submission by construction.
- #8 (submissions tab as first output surface): submissions render *frozen snapshots* of things the user already saw live; the tab is labeled **History & Proof** to kill the old mental model.

---

# 9. Analyst Workspace Redesign (W7 BI Dashboard Studio · the mandatory fix)

## 9.1 Concept

The analyst's real day is a three-stage loop — *understand the data, build the numbers, present the story* — so the workstation is three tabs that mirror it exactly: **Data → Build → Present**. The dashboard is a live surface the analyst constructs during the attempt, not a reward unlocked by submitting.

## 9.2 Layout (default 1440×900)

```
┌─ center renderer ────────────────────────────────────────────────┐
│ [🗄 Data]  [🔧 Build]  [📊 Present]        KPI ✓ · TREND ✓ · BRK ○ │ ← publish chips
├──────────────────────────────────────────────────────────────────┤
│ DATA TAB                                                         │
│ ┌ left 260px ───────────┐ ┌ right flex ─────────────────────────┐│
│ │ Live schema            │ │ Sample rows (real, NULLs flagged)   ││
│ │ (tables, cols, counts) │ │ Profiling strip (distincts, nulls,  ││
│ │ Data dictionary        │ │  min/max per column)                ││
│ │ Quality issues         │ │                                     ││
│ │ (computed live)        │ │                                     ││
│ └────────────────────────┘ └─────────────────────────────────────┘│
│ BUILD TAB                                                        │
│ ┌ SQL editor + results 60% ───────┐ ┌ Python/chart-config 40% ──┐│
│ │ editor (top 45%)                 │ │ stack variant decides:    ││
│ │ result sets w/ [Publish as ▾     │ │  pandas cell + figures OR ││
│ │  KPI · Trend · Breakdown] (55%)  │ │  chart-config form        ││
│ └──────────────────────────────────┘ └───────────────────────────┘│
│ PRESENT TAB                                                      │
│ KPI cards row (from published KPI) → trend chart 2/3 + donut 1/3 │
│ (from published Trend/Breakdown) → insights grid (4 rubric       │
│ fields) → [✓ Validate Metrics] results inline                    │
└──────────────────────────────────────────────────────────────────┘
```

## 9.3 The mandated workflow, step by step

1. **Data tab** opens first. Schema, sample rows, profiling, dictionary, and *live-computed* quality issues (NULL counts, duplicate keys, casing drift) — all from the real seeded SQLite DB. Empty-state never exists here; data is provisioned at OPENED.
2. **Build tab**: SQL executes for real (`▶ Run Query`). Each result set carries **Publish as KPI / Trend / Breakdown** buttons. Publishing is the explicit bridge from computation to presentation — chips in the tab bar flip from ○ to ✓. The Python pane (stack-dependent) runs real pandas/matplotlib; figures render inline and can be **pinned to Present** as supplementary exhibits.
3. **Present tab**: the dashboard renders *from the user's published results only*. Unpublished slots show directive empty states ("Publish a monthly GROUP BY as 📈 Trend in Build"). Insight fields (Trend / Segment / Concern / Action) sit under the charts, each with a rubric hint.
4. **✓ Validate Metrics** (action bar): compares published numbers against ground truth computed from the same DB — per-metric pass/fail renders inline in Present *and* flips the right-rail checklist. A failing KPI card gets a red outline with "expected ≈ ₹27.8L". The dashboard preview thereby *updates as part of validation* — the literal requirement.
5. **👁 Preview Dashboard**: full ProofDoc draft — dashboard snapshot, SQL appendix, insights, validation status — watermarked DRAFT.
6. **Submit Analysis**: freezes dashboard PNG + all SQL + published result data + Python cells/figures + insight text + validation history into the attempt; mints the Dashboard ProofDoc.
7. **History tab** (left rail): previous frozen dashboards as thumbnails → open read-only. Charts appear here *last*, never first.

## 9.4 Extra-depth matrix (W7)

| Attribute | Spec |
|---|---|
| Desktop layout ratio | rails 320/300; Build tab internal 60/40; editor/results 45/55 |
| Min screen | 1280×768 (below: right rail auto-collapses; 1024 floor: tabs stack, Python pane behind a toggle) |
| Collapsible | both rails; Python pane; profiling strip |
| Empty state | Present slots show directive prompts naming the exact Build action; Data tab never empty |
| Loading | DB provisioning skeleton over Data tab ("Seeding your warehouse… ~2s"); Pyodide first-run banner with progress ("Loading Python runtime, ~15 MB, once") |
| Validation state | per-metric inline pass/fail on cards + checklist flips + "7/10" count in action bar |
| Submission state | freeze spinner → read-only banner; publish chips lock |
| Proof preview | full ProofDoc overlay: snapshot + SQL appendix + insights + checks |
| History state | thumbnail timeline; frozen open = read-only Present with frozen data |
| Mobile | review-only: Present tab + insights editable; Build/Data read-only with "continue on desktop" |
| Execution | client-wasm (sql.js + Pyodide); zero server cost per run |

Domains: Data Analyst (primary), BI Analyst (primary, semantic-model stack), Product Analyst (secondary).

---

# 10. System Design Workspace Redesign (W18 · the mandatory fix)

## 10.1 Concept

The canvas is the workspace; everything else orbits it. No markdown editor exists anywhere in this workstation. The rubric is visible from minute zero, and "Check Completeness" is the rubric made executable.

## 10.2 Layout

```
┌ left rail: Brief tab = prompt + functional/non-functional reqs +    │
│  explicit rubric weights (visible from the start)                   │
├ center 100% = ARCHITECTURE CANVAS ──────────────┬ right rail ───────┤
│  component palette (left edge strip, 56px,      │ tabbed:           │
│  layered: Client/Edge/App/Data/Infra)           │ · API Endpoints   │
│  drag → place → connect (typed edges:           │ · Data Schema     │
│  sync/async/replication); zoom/pan;             │ · Capacity Calc   │
│  per-node config popover (replicas, sharding,   │ · Trade-offs      │
│  cache TTL, consistency)                        │ (structured forms,│
│                                                 │  not free text)   │
├ bottom action bar: [—] [✓ Check Completeness] [👁 Preview Proof]    │
│                                              [Submit Design]        │
└──────────────────────────────────────────────────────────────────────┘
```

Right-rail panels are structured editors: API Endpoints = method/path/req/resp rows; Schema = table builder; Capacity = guided calculator (DAU → QPS → storage/bandwidth with arithmetic checked live); Trade-offs = decision cards (`chose X over Y because… · consequence…`).

## 10.3 Semantics

- **Check Completeness** runs the rubric as rules: ≥N components, no orphan nodes, required layers present for the prompt class (e.g., a URL-shortener must show a write path, a read path, and a cache), ≥2 endpoints, schema defined, capacity arithmetic consistent (QPS derived from stated DAU within tolerance), ≥1 trade-off referencing a canvas component. Failures annotate the canvas (orphan node pulses red; missing cache layer ghost-suggested) and flip the checklist.
- **Preview Proof** composes the artifact: auto-laid-out diagram render + endpoint table + schema + capacity sheet + trade-off cards. DRAFT watermark.
- **Submit Design** freezes canvas JSON + a rendered SVG/PNG + all panel content + completeness state; AI scores design judgment (bottleneck identification, consistency choices, failure-mode reasoning) on top of the deterministic completeness portion.

## 10.4 Extra-depth matrix (W18)

| Attribute | Spec |
|---|---|
| Desktop ratio | canvas gets all center; right rail 320px tabbed; palette strip 56px |
| Min screen | 1366×768 (canvas products need width; below this, read-only review) |
| Collapsible | both rails; palette collapses to icons |
| Empty state | canvas shows ghost starter pattern ("Most designs start with a Client → LB → Service spine — drag to begin") |
| Loading | instant (no engines); template fetch skeleton <300ms |
| Validation | canvas annotations + checklist; completeness % in action bar |
| Submission | freeze → diagram render progress → read-only |
| Proof preview | full design doc overlay |
| History | snapshot gallery of frozen designs; diff view v2 (overlay two attempts) |
| Mobile | view-only diagram + panels; no canvas editing |
| Execution | client; rules engine in worker |

Domains: SWE (senior bands), Backend, Cloud Engineer (shares engine with W10), BA (process-mapping preset).

---

# 11. Engineering Workspaces (W1–W5, W16)

## 11.1 W1 Code IDE

- **Purpose**: algorithms, data structures, general programming against a harness. **Domains**: SWE/DSA primary; QA, Mobile, AI secondary.
- **Core tools**: multi-file editor (Monaco), language runner (JS worker / Pyodide), test harness with case-level results, complexity hint meter (measured op-count growth on sized inputs — honest, labeled "empirical"), stdin/stdout console.
- **Layout**: editor 62% / right column 38% (problem examples ↑, console + test results ↓). 
- **Actions**: ▶ Run Code (custom input) · ✓ Run Test Suite (visible cases; hidden cases at submission) · 👁 Preview Report · Submit Solution.
- **Validation**: visible test cases + lint + complexity sanity. **Preview**: code + passing-matrix report. **Submission** freezes code, full case matrix (incl. hidden), runtime stats. **Proof**: solution report with case matrix, runtime percentile, and complexity evidence.
- **Matrix**: ratio 62/38; min 1280×720; collapsible right column; empty = scaffold with TODO; loading = runtime warm banner (Pyodide once); validation = case list with per-case diff; submission = hidden-case run progress; mobile = read + resubmit-view only; execution client-wasm.

## 11.2 W2 Frontend Sandbox

- **Purpose**: build UI to spec with the browser as ground truth. **Domains**: Frontend primary; Fullstack, Mobile-web secondary.
- **Core tools**: editor (HTML/CSS/JS/JSX, esbuild-wasm compile), **live preview iframe** (auto-refresh 400ms debounce), device-width toggles, **console capture** panel, **a11y scanner** (axe-core in iframe), **visual diff** (pixel-compare against target render with slider overlay), target spec viewer.
- **Layout**: editor 50% / preview 50% vertical split; bottom drawer 200px tabbed (Console · Checks · Visual Diff), collapsible.
- **Actions**: ↻ Refresh Preview · ✓ Run Checks · 👁 Preview Build Proof · Submit Build.
- **Validation = Run Checks**: a11y audit (violations listed, clicking highlights the node *in the preview*), visual diff score vs target (≥92% to pass by default), console-error count, required-DOM assertions. All annotate live.
- **Proof**: before/target/after screenshots, a11y score, diff %, code. 
- **Matrix**: ratio 50/50 + 200px drawer; min 1280×800; drawer + rails collapsible; empty = starter scaffold renders immediately (never blank preview); loading = compile spinner in preview corner; validation = badge row over preview (A11y 96 · Diff 94% · 0 console errors); submission freezes final screenshot at 3 widths; mobile = preview-only review; execution client-sandbox.

## 11.3 W3 API Workstation

- **Purpose**: implement/fix endpoints with a real request/response loop. **Domains**: Backend primary; Fullstack, QA-API secondary.
- **Core tools**: code editor (route handlers on a minimal framework shim), **in-browser server** (service-worker–backed; requests actually route through user code), **request tester** (method/URL/headers/body, cURL import), **structured log stream** (every request logs latency + status), **contract panel** (OpenAPI spec with per-endpoint pass state), seeded data layer (sql.js behind an ORM-lite).
- **Layout**: editor 55% / right 45% split into Request Tester (top 55%) and Logs (bottom 45%); contract panel lives in right rail.
- **Actions**: ▶ Start Server (boots SW runtime; status dot goes green) · ✓ Run Contract Tests (fires the spec's request matrix at the live server; per-endpoint ✓/✗ with diff of expected vs actual schema/status) · 👁 Preview API Proof · Submit API.
- **Proof**: contract matrix, sample request/response pairs, p50/p95 latency table, code.
- **Matrix**: ratio 55/45; min 1280×768; logs collapsible; empty = server stopped state with "Start Server" ghost button in tester; loading = server boot <1s; validation = contract panel flips per endpoint; submission = full matrix re-run on frozen code; mobile = read-only; execution client-sandbox (SW) — v2 server containers for JVM stacks.

## 11.4 W4 Fullstack Studio

Composite of W2+W3: tab strip `[Frontend] [API] [Database]` over the center; shared app state; ✓ Run E2E Checks executes scripted user flows against the composed app (SW server + iframe UI) and reports step-level pass/fail with screenshots per step. Submit Feature freezes all three layers + E2E report. Min screen 1366×800; execution composite; other states inherit from W2/W3.

## 11.5 W5 SQL Lab

- **Purpose**: query craft with engine feedback. **Domains**: DBA primary (EXPLAIN-first preset), Data Analyst/Backend/Product Analyst secondary.
- **Core tools**: schema explorer (live introspection + row counts + indexes), SQL editor (multi-statement), result grid (NULL-flagged), **EXPLAIN plan visualizer** (tree view with cost per node; index-use badges), **result diff** vs expected shape (on validate), seeded sql.js DB (DBA preset adds slow-query scenarios and index DDL rights).
- **Layout**: schema 220px | editor 55% over results 45%; EXPLAIN as a toggleable third pane replacing results (`⌘E`).
- **Actions**: ▶ Run Query · ✓ Validate Result (row/column/value compare vs ground truth, order-insensitive unless specified; DBA preset also asserts plan properties: "must use index scan") · 👁 Preview Query Proof · Submit Query.
- **Proof**: final query, result sample, EXPLAIN snapshot, validation matrix.
- **Matrix**: ratio 220/55/45; min 1280×720; schema collapsible; empty = directive placeholder w/ schema hint; loading = seed skeleton ~1s; validation = per-assert list + grid cell-level diff highlighting; submission re-runs frozen SQL; mobile = read-only + result view; execution client-wasm.

## 11.6 W16 Mobile Studio

- **Purpose**: mobile UI/logic in a device context. **Domains**: Mobile primary.
- **Core tools**: editor (React Native–web execution; Flutter-style variant compiles Dart→JS in v2, until then RN-web only — *do not fake Flutter*, Contract A), **device frame preview** (Pixel/iPhone frames, notch-safe areas), device matrix runner (3 sizes + dark mode snapshot grid), gesture simulator (tap/swipe targets logged), perf meter (frame-drop estimate on scripted scroll).
- **Layout**: editor 55% / device frame 45% (frame centered, matrix as bottom drawer).
- **Actions**: ▶ Run on Device · ✓ Run Device Matrix (renders 6 snapshot cells, asserts layout rules: no overflow, touch targets ≥44px, safe-area respect) · 👁 Preview App Proof · Submit App.
- **Proof**: snapshot grid, perf note, code. 
- **Matrix**: ratio 55/45; min 1366×800; matrix drawer collapsible; empty = scaffold app renders; loading = bundle compile spinner on frame; validation = matrix cells badge pass/fail; submission freezes grid; mobile (meta!) = actually good on tablet, phone read-only; execution client-sandbox.

---

# 12. Platform / Ops Workspaces (W8–W11)

## 12.1 W8 Data Pipeline Studio

- **Domains**: Data Engineer primary. **Core tools**: pipeline code editor (real Python via Pyodide; `/data/raw.csv` mounted), **DAG view** whose node states reflect *actual last run* (not decoration), run console (real stdout/traceback), **quality gates panel** (row-count deltas, null thresholds, dedupe asserts, schema conformance — each a rule evaluated on the real output file), output diff (raw vs processed sample).
- **Layout**: tabs `[Code] [DAG] [Output]`; Code = editor 65% over console 35%.
- **Actions**: ▶ Run Pipeline · ✓ Run Quality Gates · 👁 Preview Pipeline Proof · Submit Pipeline.
- **Validation**: gates evaluate `/data/processed.csv` for real; DAG nodes go green/red per stage (stage mapping via lightweight decorators in scaffold). **Proof**: DAG render, gate matrix, before/after data profile, code.
- **Matrix**: ratio 65/35; min 1280×768; console collapsible; empty = scaffold ETL skeleton; loading = Pyodide banner; validation = gate list + DAG recolor; submission = frozen run re-executed; mobile read-only; execution client-wasm.

## 12.2 W9 Infra Terminal

- **Domains**: DevOps primary; DBA-ops, Cloud, SRE secondary. **Core tools**: **terminal** (xterm.js on a deterministic virtual machine model: virtual FS, process table, service states; commands like `ls, cat, grep, systemctl, docker, kubectl, git` implemented against the model — a *simulator with real state*, not canned transcripts), config editor (YAML/Dockerfile with schema lint), **pipeline log viewer** (CI stages with expandable steps; stages re-evaluate when configs change and pipeline re-runs), state inspector (services, containers, ports).
- **Layout**: terminal 55% | right column 45% (config editor ↑ 60%, pipeline/state tabs ↓ 40%).
- **Actions**: ▶ Execute / Apply Config · ✓ Verify State (asserts on the VM model: "service nginx running", "image builds", "pipeline green", "port 8080 reachable") · 👁 Preview Runbook Proof · Submit Configuration.
- **Proof**: terminal transcript (curated), final configs, state assertions, pipeline result.
- **Matrix**: ratio 55/45; min 1280×768; right column collapsible; empty = MOTD + `cat /README` hint; loading = instant; validation = assertion list + state inspector badges; submission freezes transcript+configs+state vector; mobile read-only; execution simulated (worker-side VM model — deterministic, seeded).

## 12.3 W10 Cloud Architecture Lab

Shares canvas engine with W18; palette = cloud services (compute, LB, storage classes, queues, CDN, IAM); per-node config (instance class, AZ count, autoscaling). Unique tools: **cost estimator** (live monthly ₹ estimate recomputed on every change), **policy checker** (rules: no public DB subnet, multi-AZ for stated SLA, least-privilege IAM), **⟲ Simulate Traffic** (scenario player: traffic curve animates through the topology; undersized nodes glow amber/red; failover drill kills an AZ and reports recovery). Actions per §7.2. Proof: topology render + cost sheet + policy matrix + simulation outcomes. Matrix: canvas full-bleed, right rail 320 (Config/Cost/Policy tabs); min 1366×768; simulation results as overlay timeline; execution simulated; mobile view-only.

## 12.4 W11 SRE Platform Console

- **Domains**: SRE primary; DevOps secondary. **Concept**: a seeded **incident scenario player** — time-series data, logs, and alerts generated from a hidden fault model; the user diagnoses and remediates while the clock runs.
- **Core tools**: metrics grid (latency/error/saturation charts, zoom/brush), **log stream** (filterable, live-tailing at scenario speed), alert panel, **remediation actions** (rollback deploy, scale service, restart, flip flag — each *changes the fault model's trajectory*, visible in metrics within scenario-seconds), **incident timeline** (auto-logs user actions; user annotates), report composer (impact, root cause, resolution, follow-ups).
- **Layout**: metrics 55% ↑ / logs 45% ↓ on the left 65%; right 35% = alerts + timeline + actions.
- **Actions**: ⟲ Run Simulation (start/advance scenario) · ✓ Validate Response (asserts: correct root-cause service identified, MTTR under target, error budget math right, no harmful action taken) · 👁 Preview Incident Report · Submit Incident Report.
- **Proof**: incident report + timeline + metric snapshots at detection/mitigation/resolution + actions taken.
- **Matrix**: ratio 65/35; min 1366×800; timeline collapsible; empty = pre-incident calm dashboards ("all green — start the simulation"); loading = scenario seed <1s; validation = response checklist; submission freezes full scenario trace; mobile read-only; execution simulated.

---

# 13. Security / IR Workspaces (W12–W13)

## 13.1 W12 Security Console

- **Domains**: Cybersecurity Analyst primary. **Core tools**: **evidence locker** (auth logs, web logs, config files, pcap-summaries as structured tables), **SIEM-style query bar** (real filter/aggregate engine over seeded events — `src_ip=10.2.* AND action=failed | stats count by src_ip`), pattern annotator (flag rows/ranges as findings with MITRE ATT&CK technique tags), **findings composer** (finding = evidence refs + technique + severity + recommendation), IOC extractor side panel.
- **Layout**: evidence/query 65% | findings composer 35%.
- **Actions**: ▶ Run Query / Analyze · ✓ Validate Findings (asserts: the planted technique chain is identified — right events flagged, right technique tags, severity within band; partial credit per finding) · 👁 Preview Findings Report · Submit Findings.
- **Proof**: findings report with linked evidence excerpts, technique map, recommendations.
- **Matrix**: 65/35; min 1280×768; composer collapsible; empty = evidence loaded + "0 findings — query the logs"; loading = evidence index <1s; validation = per-finding verdicts; submission freezes queries+flags+report; mobile read-only; execution simulated + real query eval (client).

## 13.2 W13 SOC IR Console

- **Domains**: SOC/IR primary; Cyber secondary. **Concept**: live queue pressure — alerts arrive on scenario time; triage accuracy and speed both matter.
- **Core tools**: **alert queue** (severity, source, entity; SLA timers per alert), enrichment panel (click an entity → seeded threat-intel, asset criticality, user context), **triage verdict controls** (escalate / suppress / watch — each verdict scored against ground truth), **IR playbook runner** (checklist with action buttons: isolate host, reset creds, block IOC — actions mutate scenario state and can stop the attack progression), incident timeline, report composer.
- **Layout**: queue 30% | investigation center 45% | playbook+timeline 25%.
- **Actions**: ⟲ Advance Scenario · ✓ Validate Response (triage precision/recall vs planted truth, containment achieved before exfil-stage, playbook order sanity) · 👁 Preview IR Report · Submit Incident Report.
- **Proof**: IR report + triage scorecard + containment timeline.
- **Matrix**: 30/45/25; min 1366×800; playbook collapsible; empty n/a (queue seeds with 3 alerts); loading = scenario seed; validation = scorecard; submission freezes queue verdicts+actions+report; mobile read-only; execution simulated.

---

# 14. Business / Product Workspaces (W15 presets)

## 14.1 W15-BA Business Analysis Board

- **Domains**: Business Analyst. **Core tools**: **stakeholder brief pack** (emails, meeting notes, partial requirements — the messy inputs of real BA work), **requirements matrix builder** (structured rows: ID, requirement, type, priority/MoSCoW, source-trace link to brief), **process mapper** (BPMN-lite canvas: events, tasks, gateways, swimlanes — canvas engine reuse), gap/assumption log, acceptance-criteria editor (Given/When/Then rows).
- **Layout**: brief pack 30% | active artifact 70% (matrix/process/criteria as tabs).
- **Actions**: (Run hidden) · ✓ Check Completeness (every priority-1 requirement traces to a source; process map has no dangling gateways; ≥1 acceptance criterion per P1; assumptions logged for untraceable items) · 👁 Preview Document · Submit Analysis.
- **Proof**: BRD-style document: requirements matrix + process diagram + criteria + assumptions, with trace links.
- **Matrix**: 30/70; min 1280×768; brief pack collapsible; empty = matrix with one ghost row ("Extract your first requirement from the brief"); loading instant; validation = trace-coverage % + per-row flags; submission freezes doc; mobile = brief readable, matrix read-only; execution client.

## 14.2 W15-Product Product Strategy Board

- **Domains**: Product Analyst. **Core tools**: **metric explorer** (funnel + cohort charts over a seeded events dataset; real aggregation via the SQL engine under a friendly UI, with an "open as SQL" escape hatch to W5-style pane), **metric tree builder** (north star → drivers, canvas-lite), **experiment designer** (hypothesis, variant, success metric, sample-size calculator with checked arithmetic), recommendation memo composer (claims must cite explorer charts — citations are pinned chart refs).
- **Actions**: ▶ Run Analysis (recompute explorer) · ✓ Check Completeness (hypothesis references a real metric movement; sample size arithmetic valid; memo claims have pinned citations; funnel step identified correctly vs planted truth) · 👁 Preview Memo · Submit Analysis.
- **Proof**: strategy memo with embedded charts, metric tree, experiment card.
- **Matrix**: explorer 60% | composer 40%; min 1280×768; tree collapsible; empty = explorer pre-loaded with overview funnel; loading = dataset seed ~1s; validation = citation/arithmetic flags inline in memo; submission freezes memo+charts; mobile = memo readable; execution client-wasm under the hood.

---

# 15. Mobile + AI Workspaces

## 15.1 W16 Mobile Studio — specified in §11.6 (engineering family placement; listed here for the output-format contract).

## 15.2 W17 AI / LLM Studio

- **Domains**: AI/LLM Engineer primary. **Concept**: the job is *systematic* prompt/pipeline engineering — datasets, evals, budgets — not vibes. The workstation makes eval discipline the medium.
- **Core tools**: **pipeline editor** (prompt template(s) with variables; optional RAG step over a seeded document set with a real client-side embedding/match step; tool-call schema editor), **dataset panel** (eval set: input → expected properties), **eval runner** (executes the pipeline over the eval set via server-proxied model calls with per-challenge token budget; graders: exact/regex/JSON-schema/LLM-rubric), **results matrix** (per-case pass/fail, output diff viewer), **budget meter** (tokens + latency + ₹ cost per run, cumulative), guardrail tester (injection probes, refusal checks).
- **Layout**: pipeline editor 45% | eval matrix 55%; dataset + budget in right rail.
- **Actions**: ▶ Run Prompt / Pipeline (single case or full set) · ✓ Run Eval Set (official eval: scored set + guardrail probes; pass thresholds per metric) · 👁 Preview Eval Report · Submit Pipeline.
- **Validation**: eval pass-rate vs thresholds, budget compliance, guardrail survival — all rendered in the matrix live. **Proof**: eval report (pass-rate, cost/latency, guardrail results, before/after examples) + pipeline definition.
- **Matrix**: 45/55; min 1366×768; dataset rail collapsible; empty = one sample case pre-run; loading = model warm note; validation = matrix recolor + threshold gauges; submission = final eval re-run on frozen pipeline (server, budget-capped); mobile read-only; execution: pipeline client, model calls **server-proxied** (only workstation with per-run server cost — budget meter is also a cost-control instrument).

---

# 16. Proof and Submission Model

## 16.1 The ProofDoc — Arena's atomic product unit

Every scored submission mints exactly one **ProofDoc**: a portable, recruiter-renderable record. Structure:

```json
{
  "proof_id": "prf_8f2…",
  "user": { "handle": "venkata-k", "role": "data_analyst", "track": "product_analytics" },
  "challenge": { "id": "ch_q1_rev_dash", "title": "Q1 Revenue Dashboard",
                 "workstation": "bi_dashboard_studio", "difficulty": "medium",
                 "source": "daily", "version": 4 },
  "attempt": { "number": 2, "duration_sec": 2140, "hints_used": 1,
               "validations_run": 6, "submitted_at": "…" },
  "score": { "total": 84, "grade": "A",
             "rubric": [{ "dim": "metric_accuracy", "score": 92, "method": "deterministic" },
                        { "dim": "insight_quality", "score": 74, "method": "ai" }],
             "elo_before": 1222, "elo_after": 1247, "tier": "Contender" },
  "artifacts": [
    { "type": "snapshot",  "label": "Final dashboard", "url": "…png" },
    { "type": "code",      "label": "SQL queries", "lang": "sql", "url": "…" },
    { "type": "report",    "label": "Validation matrix", "data": { } },
    { "type": "narrative", "label": "Analyst insights", "text": "…" }
  ],
  "integrity": { "env_hash": "…", "dataset_seed": "m1:v4", "replayable": true },
  "visibility": "recruiters"
}
```

Design intents: (a) **artifact-first** — the thumbnail recruiters see is the dashboard/diagram/report, not a number; (b) **honest metadata** — hints, attempt number, validation count all disclosed; trust is the moat; (c) **replayable** — `dataset_seed` + frozen inputs allow deterministic re-execution for verification (anti-cheat + recruiter confidence); (d) **per-workstation artifact recipes** are defined in each family's renderer (`getProofArtifacts()`), so proof always matches the medium.

## 16.2 Per-workstation proof recipe summary

| Workstation | Headline artifact | Supporting artifacts |
|---|---|---|
| W1 | passing-case matrix card | code, runtime stats |
| W2 | final UI screenshot (vs target) | a11y score, diff %, code |
| W3 | contract matrix badge | req/resp samples, latency table, code |
| W5 | result grid + EXPLAIN snapshot | query, validation matrix |
| W6/W7 | dashboard / figure snapshot | SQL+cells, insights, metric checks |
| W8 | DAG run render | gate matrix, data profiles, code |
| W9 | state-assertion card | transcript, configs |
| W10/W18 | architecture diagram render | cost/policy or completeness sheets, trade-offs |
| W11/W13 | incident report | timeline, metric/queue snapshots |
| W12 | findings report | evidence excerpts, technique map |
| W14 | test report (coverage + repro) | suite code, bug tickets |
| W15 | BRD / strategy memo | matrices, process map, citations |
| W16 | device snapshot grid | perf note, code |
| W17 | eval report | pipeline def, budget sheet, guardrails |

## 16.3 Portfolio + Launchpad surfaces

- **Proof Portfolio** page: grid of ProofDoc cards filterable by role/workstation/score; each card = artifact thumbnail + title + score chip + tier-at-time + visibility toggle. Public link option renders a clean, Capabilio-branded share page.
- **Launchpad consumption**: job postings declare proof requirements ("≥1 API Workstation proof ≥1300 within 90 days"); the fit engine matches ProofDocs automatically; recruiter challenge submissions attach the ProofDoc to the application thread.
- **Aura consumption**: rubric dimension vectors feed readiness; weak dimensions feed Skill Studio repair generation — closing the loop that makes adaptive repair real rather than rule-of-thumb.

---

# 17. UI Rules and Design Language

## 17.1 Design tokens

- **Two-surface system**: Arena chrome (homepage, shell frame, rails) is **light** — warm paper neutrals (existing `#F8F7F4 / #F1EFE9` family, ink scale). Work surfaces inside renderers are **medium-dark slate** (`#0F172A / #1E293B`) *only where real tools are dark* (editors, terminals, consoles); data grids, canvases, and dashboards stay light. The contrast between chrome and tool is what makes the product read "professional instrument," and it prevents the everything-is-a-dark-editor monotony that caused problem #3's perception.
- **Type**: DM Sans (UI), DM Mono (code/data/numerals — all ELO and metrics in tabular-nums mono). Sizes: 22/16/13/11/10 with 9px micro-labels in caps +0.6 tracking for panel headers.
- **Color semantics, fixed platform-wide**: green = passed/healthy, amber = warning/repair, red = failed/incident, blue = informational/running, purple = recruiter, tier colors reserved for ELO surfaces only. Domain accent colors (existing per-domain hues) appear *only* in workstation badges and homepage tiles — never as full-surface themes.
- **Radius/elevation**: 10–12px cards, 6px controls; one shadow level for cards, one for overlays. No glassmorphism, no gradients on work surfaces.

## 17.2 The ten UX laws of Arena

1. **No dead buttons.** Every control mutates visible state in <300ms or shows progress. (Kills problem #5 culturally, not just technically.)
2. **Empty states command.** Every empty region names the exact action that fills it, with the verb of that workstation ("Publish a Trend in Build").
3. **Output lives where work happens.** Results render in the renderer; modals are reserved for Preview/Result/confirm only.
4. **Verbs match the profession.** Action labels per §7.2; copy review rejects any generic "Run Tests" outside W1/W14.
5. **Numbers are mono, deltas are signed, money is ₹-formatted** (Indian digit grouping: ₹3,27,840 / ₹27.8L).
6. **Hints cost, and costs are visible before clicks.** Same for ELO stakes and attempt limits — no surprise economics.
7. **Loading states name the work** ("Seeding your warehouse…", "Booting server…") and heavy loads state size + once-ness ("~15 MB, first run only").
8. **Frozen things look frozen**: history/read-only surfaces get a flat paper texture band + lock glyph + timestamp banner; nothing frozen is editable or re-runnable in place.
9. **One keyboard map everywhere** (§7.4); the command palette knows every panel of every workstation.
10. **Motion is meaning**: 150–200ms ease transitions only on state changes (check flips, chip fills, ELO count-up). No ambient animation in work areas.

## 17.3 Badge system (the unification glue)

Workstation badges (icon + family name + family hue) appear identically in: library cards, queue rows, shell top bar, ProofDocs, history entries. Users learn the 16 glyphs fast; the badge is how "many environments" reads as "one product."

---

# 18. Screen-by-Screen Breakdown (exact desktop specs)

Reference viewport **1440×900**; grid 12-col, 24px gutters, 32px page margin. Breakpoints: ≥1536 (rails grow), 1280–1440 (default), 1024–1280 (right rail auto-collapsed), <1024 (workstations read-only review; homepage stacks single-column).

## 18.1 Homepage

| Region | Size @1440 | Contents / CTAs | States |
|---|---|---|---|
| Header | 1440×64 | nav · Role Switcher (180px dropdown, search at >8 roles) · Stack chip (120px) | — |
| Readiness strip | 1376×88 card | tier ring 64px · role ELO 28px mono · global ELO 16px · percentile · streak · readiness arc 56px | loading: skeleton bars; new-user: "Calibration mission" CTA replaces percentile |
| Mission hero (C1) | 901×280 | workstation badge 28px · title 22px · scenario 14px · pills row · **▶ Start Mission** (primary, 44px h) · Swap (ghost) | done-state flips to ✓ summary 120px; C2/C3 promote |
| Repair card (C2) | 901×96 | amber left-border 3px · diagnosis line · lesson link · **Start Repair** | absent collapses (no placeholder) |
| Recruiter card (C3) | 901×96 | logo 32px · deadline chip (red <24h) · disclosure line · **Start Challenge** | stacked count if >1 |
| Right rail D | 443px col | D1 sparkline 132px h (role solid, global dotted) · D2 activity list 5 rows · D3 streak/badges 96px | activity empty: "Your first mission writes your story →" |
| Mission queue E | 901px, rows 56px | badge · title · source chip · difficulty · time · ELO · deadline · [Start 32px] | drag-handle on self-queued; empty: auto-fill CTA |
| Proof shelf F | 443px, 3 cards 128px | artifact thumbnail 64×64 · title · score chip · visibility toggle | empty: ghost ProofDoc anatomy ("This is what recruiters will see") |
| Quick access G | full-width row, tiles 200×104 | workstation glyph 32px · name · "Free practice" sub | hover: lift + "unranked" note |
| Trending H | 3 cards 437×140 | title · attempts count · median solver ELO · [Try it] | — |
| Library I | grid 3-col, cards 437×180 | badge · title · meta row · [Start now] [+ Queue] | filter bar sticky within section |

## 18.2 Challenge shell (chrome)

| Region | Size | Notes |
|---|---|---|
| Top bar | 1440×48 | breadcrumb truncates middle; timer right-aligned 13px mono, amber <25%, red <10% with 1Hz pulse |
| Left rail | 320px (280–400) | tab strip 36px; Brief default |
| Right rail | 300px (260–360) | checklist top, sticky |
| Center slot | flex (~772px at defaults) | renderer mounts here |
| Action bar | 1440×56 | slots at fixed x-positions: Run at 24px, Validate +12, Preview +12; Submit right-anchored 24px, 40px h, workstation accent; autosave indicator left of Submit |
| Result overlay | 560px modal | grade ring 88px · ELO count-up 600ms · rubric bars · CTA row |
| Proof preview overlay | 90vw×90vh | exact ProofDoc layout, DRAFT watermark 10% diagonal |
| History view | full center | vertical timeline 320px + frozen viewer flex |

## 18.3 Per-workstation center-slot specs (at 772×~700 default slot; renderers scale fluidly)

| W | Default internal split | Internal min sizes | Drawer/aux |
|---|---|---|---|
| W1 | editor 62% \| examples/console 38% | editor ≥480px w | console h 160–320px |
| W2 | editor 50% \| preview 50% | preview ≥360px w | bottom drawer 200px (Console/Checks/Diff) |
| W3 | editor 55% \| tester+logs 45% | tester ≥320px | contract panel in right rail |
| W4 | tabbed FE/API/DB full slot | per-tab = W2/W3 | E2E drawer 220px |
| W5 | schema 220px \| editor 55%/results 45% | grid ≥240px h | EXPLAIN toggle pane |
| W6 | cells column full, output inline | cell ≥120px h | dataset drawer 240px |
| W7 | tabbed Data/Build/Present | Build: 60/40 | publish chips in tab bar |
| W8 | tabbed Code/DAG/Output | console ≥180px h | gates panel right rail |
| W9 | terminal 55% \| config/pipeline 45% | terminal ≥80 cols | state inspector tab |
| W10/W18 | canvas full \| right tabs 320px | canvas ≥640px w | palette strip 56px |
| W11 | charts 55%/logs 45% in left 65% \| ops col 35% | chart ≥200px h | timeline collapsible |
| W12 | evidence+query 65% \| findings 35% | query bar fixed 44px | IOC side panel |
| W13 | queue 30% \| investigate 45% \| playbook 25% | queue ≥260px | timeline drawer |
| W14 | app-under-test 45% \| test editor 55% | AUT ≥360px | run-matrix drawer 220px |
| W15 | brief 30% \| artifact tabs 70% | matrix rows 44px | assumption log drawer |
| W16 | editor 55% \| device frame 45% | frame ≥320px | matrix drawer 240px |
| W17 | pipeline 45% \| eval matrix 55% | matrix ≥400px | budget meter right rail |

## 18.4 Canonical state walkthrough (one per archetype)

- **W7 BI Studio**: OPEN → Data tab with seeded grid (loading skeleton ≤2s) → Build: run → result card slides in 150ms → Publish chip fills → Present: charts assemble with 200ms stagger → Validate: cards outline green/red inline, checklist counter ticks → Preview: DRAFT overlay → Submit: freeze progress (snapshot render visible) → Result overlay → History gains thumbnail.
- **W18 System Design**: OPEN → ghost spine on canvas → drag components (snap 8px grid) → Check Completeness: orphan node pulses red 2×, checklist "9/12" → fill capacity panel (arithmetic checked on blur) → Preview: composed design doc → Submit Design → frozen snapshot in history gallery.
- **W11 SRE**: OPEN → calm dashboards → ⟲ Run Simulation → alert fires (audio tick optional) → user filters logs, scales service → metrics bend back within scenario-seconds → Validate Response: MTTR check passes → report composer pre-filled with timeline → Submit Incident Report.

## 18.5 Mobile behavior (global rule)

Phones get: homepage (full, single column), mission briefs, history, ProofDocs, insights/memo *text editing*, and notifications. All execution surfaces render read-only with a "Continue on desktop" handoff (push link). Tablet ≥1024 landscape: W5, W6, W15 editable; others read-only. This is honest scoping — a pcap triage on a 360px phone would violate Contract A.


---

# 19. Technical Rendering Model

## 19.1 Next.js application architecture

```
app/
├─ (arena)/
│  ├─ arena/page.tsx                    # Mission Desk (homepage) — RSC shell,
│  │                                    #   client islands: queue, sparkline, switchers
│  ├─ arena/library/page.tsx            # practice library (RSC list + client filters)
│  ├─ arena/proof/page.tsx              # proof portfolio
│  ├─ arena/proof/[proofId]/page.tsx    # public/recruiter ProofDoc render (RSC, OG image)
│  └─ arena/c/[challengeId]/
│     ├─ page.tsx                       # challenge shell (server: challenge fetch, auth,
│     │                                 #   attempt policy → client: ShellRoot)
│     └─ history/page.tsx               # frozen attempts viewer
├─ api/
│  ├─ attempts/route.ts                 # POST freeze (server-validates snapshot hash)
│  ├─ score/route.ts                    # scoring orchestration (deterministic + AI eval)
│  ├─ ai-eval/route.ts                  # Anthropic call, rubric-scoped, rate-limited
│  └─ llm-proxy/route.ts                # W17 model calls, per-attempt token budget
│
src/arena/
├─ shell/            # TopBar, PromptRail, ContextRail, ActionBar, ResultOverlay,
│                    # ProofPreviewOverlay, HistoryTimeline, AutosaveProvider,
│                    # LayoutPersistence, FocusMode, CommandPalette
├─ core/
│  ├─ lifecycle.ts                      # XState machine: ASSIGNED…PROOFED
│  ├─ assignment-engine.ts              # queue build (server) + client cache
│  ├─ validation-engine.ts             # rule runners (shared, workstation-agnostic core)
│  ├─ engines/
│  │  ├─ sqlEngine.ts                   # sql.js loader + seeded DB cache  (exists)
│  │  ├─ pyEngine.ts                    # Pyodide loader + FS mount        (exists)
│  │  ├─ sandboxHost.ts                 # iframe/service-worker host (W2/W3/W14/W16)
│  │  ├─ vmModel.ts                     # virtual machine model (W9)
│  │  └─ scenarioPlayer.ts              # seeded time-series/incident player (W11/W13, W10 sim)
│  └─ seeds/datasetFactory.ts           # deterministic per-mission data (exists, extended)
└─ workstations/
   ├─ registry.ts                       # id → dynamic(() => import(`./${id}/index`))
   ├─ contract.ts                       # WorkstationModule interface (below)
   ├─ code-ide/ frontend-sandbox/ api-workstation/ fullstack-studio/
   ├─ sql-lab/ notebook-lab/ bi-dashboard-studio/ pipeline-studio/
   ├─ infra-terminal/ cloud-arch-lab/ sre-console/ security-console/
   ├─ soc-ir-console/ qa-test-lab/ analysis-board/ mobile-studio/
   ├─ ai-llm-studio/ system-design/
   └─ shared/ (canvas-engine, result-grid, chart-kit, terminal-kit, diff-kit)
```

Rendering strategy: shell chrome and challenge metadata are server-rendered (fast first paint, SEO-irrelevant but TTI-relevant); the workstation module is a client component loaded via `next/dynamic` with the family's skeleton as fallback. Engines (sql.js/Pyodide/sandbox) lazy-init *after* renderer mount, with the §17.2-compliant loading copy.

## 19.2 The WorkstationModule contract (the heart of "many renderers, one shell")

```ts
export interface WorkstationModule {
  id: WorkstationId
  actionLabels: { run?: string; validate: string; preview: string; submit: string }
  minViewport: { w: number; h: number }
  Skeleton: React.FC                                    // loading state
  Renderer: React.FC<WorkstationProps>                  // the environment
  // lifecycle ----------------------------------------------------------------
  init(ctx: ChallengeContext): Promise<WorkspaceHandle> // provision engines/seed
  restore(handle: WorkspaceHandle, draft: Draft): void  // reopen with full state
  // actions (shell calls these; renderer renders their effects) --------------
  runPrimary?(handle): Promise<RunResult>
  collectValidatables(handle): Validatables             // §8.2 input
  applyValidation(handle, report: ValidationReport): void  // mutate live UI
  buildProofDraft(handle): ProofDraft                   // Preview overlay content
  freeze(handle): Promise<AttemptSnapshot>              // §8.3 — inputs+outputs+renders
  renderFrozen(snapshot): React.FC                      // read-only history mode
}
```

A workstation that cannot implement `collectValidatables` or `freeze` cannot register — Contracts B and C are enforced by the type system, not by review discipline.

## 19.3 Execution placement decisions

| Engine | Where | Why |
|---|---|---|
| SQL (sql.js) | client-wasm | zero marginal cost, offline-tolerant, already proven in current build |
| Python (Pyodide) | client-wasm | real pandas/matplotlib; 15 MB once; cache via service worker |
| Frontend/API/QA/Mobile sandboxes | client iframe + service worker | the browser *is* the target environment |
| Infra VM, SRE/SOC scenarios, cloud sim | client worker, deterministic seeded models | realism comes from stateful simulation, not real clouds; replayable for proof integrity |
| AI eval + W17 model calls | server | keys, budgets, abuse control |
| Submission freeze + scoring | server-verified | client builds snapshot; server re-runs deterministic checks on frozen inputs (anti-tamper) before scoring |

## 19.4 Challenge JSON schema (authoring format, versioned)

```jsonc
{
  "id": "ch_q1_rev_dash",
  "version": 4,
  "title": "Monthly Revenue Dashboard",
  "role": "data_analyst",                  // primary role key
  "tracks": ["product_analytics", "reporting"],
  "workstation": "bi_dashboard_studio",    // MUST ∈ role's allowed list (CI-validated)
  "stack_variants": {
    "sql_pandas":  { "scaffolds": { "sql": "…", "python": "…" } },
    "sql_chartcfg":{ "scaffolds": { "sql": "…", "chart_config": { } } }
  },
  "difficulty": "medium", "est_minutes": 40, "timed": true, "time_limit_sec": 2400,
  "attempt_policy": { "max_attempts": 3, "hint_costs": [2, 3, 5] },
  "elo": { "stake": 25, "band": [1100, 1500] },
  "brief": { "scenario": "…", "objective": "…", "steps": ["…"], "constraints": ["…"] },
  "environment": {
    "dataset_seed": "scenario:ecom|tables:orders,products,customers|quality:nulls,dups,casing",
    "mounts": ["/data/orders.csv"],
    "panels": { "data": true, "build": { "python": true }, "present": true }
  },
  "validation": {                            // deterministic, client-runnable
    "checks": [
      { "id": "kpi_revenue",  "type": "metric_match", "target": "gt:total_revenue", "tol_pct": 1.5, "locus": "present.kpi" },
      { "id": "trend_series", "type": "series_match", "target": "gt:monthly_revenue", "tol_pct": 2, "locus": "present.trend" },
      { "id": "null_handling","type": "sql_assert",   "assert": "excludes_null_amounts" }
    ],
    "ai_dimensions": [
      { "dim": "insight_quality", "weight": 25, "rubric": "cites numbers; names a risk; action is measurable" }
    ]
  },
  "proof_recipe": ["snapshot:present", "code:sql", "report:validation", "narrative:insights"],
  "ground_truth": { "ref": "gt_bundle_8a31.bin" }   // hashed bundle, computed from seed at build time
}
```

Authoring CI rejects: workstation/role mismatch (fixes system-design-in-markdown forever), checks whose `locus` doesn't exist in the declared panels, and any challenge without at least one deterministic check (no pure-vibes scoring).

## 19.5 Supabase data model

```sql
-- content
create table challenges (
  id text primary key, version int not null, role text not null,
  workstation text not null, difficulty text, elo_band int4range,
  spec jsonb not null,                       -- full §19.4 document
  ground_truth_path text, status text default 'published',
  unique (id, version)
);

-- assignment engine
create table assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users, challenge_id text, challenge_version int,
  source text check (source in ('daily','repair','recruiter','self')),
  recruiter_challenge_id uuid, deadline timestamptz,
  queue_rank int, state text default 'assigned',     -- lifecycle §2.3
  created_at timestamptz default now()
);
create table daily_missions (user_id uuid, mission_date date, assignment_id uuid,
  swapped boolean default false, primary key (user_id, mission_date));

-- work in progress
create table drafts (
  assignment_id uuid primary key references assignments,
  workspace_state jsonb not null,            -- renderer-owned blob
  layout_state jsonb, updated_at timestamptz
);
create table validation_events (
  id bigint generated always as identity primary key,
  assignment_id uuid, report jsonb not null, passed int, total int,
  created_at timestamptz default now()
);

-- frozen truth
create table attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid, attempt_no int,
  snapshot jsonb not null,                   -- inputs + outputs + events
  artifact_paths text[],                     -- storage bucket renders (png/svg/html)
  env_hash text, frozen_at timestamptz default now(),
  unique (assignment_id, attempt_no)
);
create table scores (
  attempt_id uuid primary key references attempts,
  total int, grade text, rubric jsonb, ai_narrative text,
  elo_before int, elo_after int, scored_at timestamptz
);
create table proofs (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts, user_id uuid,
  doc jsonb not null,                        -- §16.1 ProofDoc
  visibility text default 'private' check (visibility in ('private','recruiters','public')),
  public_slug text unique, created_at timestamptz default now()
);

-- economy
create table elo_history (user_id uuid, role text, elo int, delta int,
  attempt_id uuid, created_at timestamptz default now());
create table streaks (user_id uuid primary key, current int, best int,
  last_mission_date date);

-- recruiter pipeline
create table recruiter_challenges (
  id uuid primary key, company_id uuid, challenge_id text, challenge_version int,
  deadline timestamptz, max_attempts int default 1, brief_override jsonb,
  proof_shared boolean default true
);
create table recruiter_invites (recruiter_challenge_id uuid, user_id uuid,
  state text default 'sent', primary key (recruiter_challenge_id, user_id));
```

RLS sketch: drafts/validation_events/attempts owner-only; proofs readable by owner + (visibility='recruiters' ∧ requester is verified recruiter on a matching invite/posting) + (visibility='public'); challenges readable by all, writable by content role. Immutability: `attempts` and `scores` have no UPDATE policy at all — frozen means frozen at the database layer.

## 19.6 Performance budgets

Shell TTI < 1.5s (4G); renderer skeleton < 200ms after route; sql.js init < 1s; Pyodide first-load < 20s with progress, warm < 1s; validation round-trip < 800ms; freeze + artifact render < 4s with visible stages. Engines pre-warm in the background when a mission card is hovered ≥600ms on the homepage (intent prefetch).

---

# 20. Final Product Recommendations

## 20.1 Build order (sequenced for proof-of-concept density, not ease)

1. **Phase 1 — The spine (4–6 wks):** Universal shell + lifecycle machine + ProofDoc pipeline + redesigned homepage, shipping with the three workstations that already have real engines: **W7 BI Studio, W5 SQL Lab, W6 Notebook Lab** (current sql.js/Pyodide work slots straight into the module contract). This proves the whole thesis end-to-end for the analyst cluster (roles 5, 6, 8, 16 partially) — the segment with the worst current mismatch and the clearest proof artifacts.
2. **Phase 2 — Engineering cluster (4–6 wks):** W1, W2, W3 (+W4 composite), W18 canvas. Unlocks roles 1–4 with credible environments; W18 kills the markdown-system-design embarrassment.
3. **Phase 3 — Ops & simulation kit (6–8 wks):** build `vmModel` + `scenarioPlayer` once, then W9, W11, W13, W12, W10 are content-heavy but engine-light. Unlocks roles 9–13.
4. **Phase 4 — Long tail (4 wks):** W14, W15 (both presets), W16, W17, W8. Unlocks roles 7, 14–18.
5. **Continuous:** recruiter challenge pipeline from Phase 1 (it's the revenue story); mobile read-only views from Phase 1.

## 20.2 The five hardest risks and their mitigations

1. **Simulator credibility** (W9/W11/W13): a shallow simulator re-creates problem #3 in new clothes. Mitigation: every simulator is a *stateful model* with seeded fault injection, and SME review per scenario; ship fewer, deeper scenarios (5 great SRE incidents > 50 canned ones).
2. **Pyodide weight on Indian bandwidth**: 15 MB matters on metered connections. Mitigation: service-worker cache, hover-prefetch, "lite validation" path that runs SQL-only checks while Python loads, and explicit size disclosure (Law 7).
3. **AI-scoring trust**: free-text scores will be contested. Mitigation: deterministic floor (≥60% of rubric weight deterministic in v1), AI narrative always cites the evidence it scored, and a re-evaluation request flow (one per attempt).
4. **Content velocity**: 18 domains × banded difficulty is a content factory problem. Mitigation: the challenge JSON + seed factory makes variants cheap (same task, new seed = new numbers); authoring CI keeps quality floor; trending section tolerates a thin library early because the homepage is assignment-first, not shelf-first.
5. **Cheating / proof integrity**: proof is the product; fake proof is existential. Mitigation: seeded per-user datasets (answers don't transfer), paste-event telemetry on attempts (already partially present), server re-execution of deterministic checks on frozen inputs, `env_hash` replay, and honest-metadata disclosure rather than fragile proctoring.

## 20.3 The metrics that say it worked

- **Time-to-mission-start** (homepage load → OPENED) < 10s median.
- **Validate-before-submit rate** > 90% of attempts (proves Contract B is lived, not designed).
- **Pre-submission output views** = 100% by construction; watch its proxy — Preview usage > 60%.
- **Proof shares** (visibility flipped to recruiters/public) — the north-star conversion of the whole platform.
- **Workstation NPS asked in-context** ("Did this feel like real work?") per family, target ≥ 50.
- **Repair loop closure**: % of weak-dimension diagnoses that get a completed repair mission within 7 days.

## 20.4 Closing position

Arena's defensible asset is not the challenge library — anyone can write tasks. It is the **execution-environment layer plus the proof pipeline**: sixteen credible workstations behind one shell, every attempt ending in a replayable, recruiter-trusted artifact. That is expensive to copy, it compounds (every new workstation multiplies the assignment engine's reach), and it converts directly into Launchpad revenue. Build the spine first, never ship a domain before its workstation is real, and let the ProofDoc be the thing users brag about.
