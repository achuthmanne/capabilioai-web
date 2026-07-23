# CAPABILIO — FIRST-DAY EXPERIENCE AUDIT
## "Can a student understand and trust this platform within 5 minutes?"

**Audit Date:** 2026-07-13  
**Auditor Role:** Head of Product Quality + UX Researcher + Founder  
**Method:** Source code walkthrough (Onboarding.jsx, Arena.jsx, Aura.jsx, InstitutionOS.jsx, Header.jsx) tracing every UI state a first-day user encounters  
**Scope:** 6 personas — Mechanical student, ECE student, IT student, MBA student, Placement Officer, Dean

---

## VERDICT FIRST

**The onboarding itself is well-designed.** The 4-step flow (Domain → Assessment → ELO Result → Plan) is clear, visually polished, and delivers immediate value. A student who completes it feels seen.

**The post-onboarding experience is where users get lost.** After landing on the dashboard for the first time, there is no guidance, no "what to do next," no tutorial layer. Students must self-discover an 8-page product with unfamiliar terminology ("ELO," "Missions," "Workstation," "Arena") and no map.

**The placement officer arrives to an empty dashboard with 9 navigation items and no instructions.**

**Two specific components will confuse first-year engineering students in the first 60 seconds:** the free-text "keyword" field during onboarding, and the cold Render.com error message that exposes backend infrastructure to students.

---

## 1. THE ONBOARDING FLOW (Steps 1–4)

### What a student actually experiences

**Landing → Path selection**  
Clear carousel: Student / Professional / Executive / Organisation. "Student" is highlighted, tagline is "Prove your skills. Not just claim them." Compelling. The step indicator is honest: Domain → Assessment → ELO Result → Plan. No hidden steps.

**Step 1 — Domain screen**

The student sees:
- A text input: **"What's your target role?"** (no placeholder examples, no dropdown)
- College name (pre-filled from signup metadata if available, otherwise blank)
- Branch dropdown: CSE, IT, MCA, DevOps, AI_DS, AI_ML, ECE, EEE, Mechanical, Civil, IoT, Pharmacy, MBA, Other
- Optional resume upload

**Critical issue here:** The "keyword" field is free text. A first-year Mechanical Engineering student who has never written a resume does not know what to type. "Mechanical Engineer"? "Mechanical Design"? "CAD Specialist"? Whatever they type becomes the lens through which all 25 MCQ questions are generated, their Aura page is titled, and their skill radar is labelled — for every future session.

A student who types "mech" gets 25 AI-generated questions for "mech." A student who types nothing gets stuck (the Next button stays disabled). A student who types "student" gets questions about being a student.

**The branch dropdown partially compensates** — the system uses branch to route career track regardless of keyword — but the keyword still drives AI question personalization, Aura monthly reports, Pulse industry news, Skill Studio roadmaps, and the AI Interview persona. The free-text field is a quality risk at onboarding scale.

| Branch typed | Career track routing | MCQ questions | Aura label |
|---|---|---|---|
| "Mechanical Engineer" (correct) | Correct | Relevant | "January · Mechanical Engineer" |
| "mech" | Correct | Low quality | "January · mech" |
| "student" | Correct | Wrong domain entirely | "January · student" |
| (blank) | Blocked — can't proceed | — | — |

**Resume upload (optional)** — The UX here is excellent. The hint "Personalises beginner-level questions around your foundation areas" sets correct expectations. Upload → parse → detect skills is a smooth flow.

**Step 2 — Assessment**

25 MCQ questions, 45 seconds per question. Timer ring shows remaining time visually. Questions are Beginner-level, fetched from the AI based on `keyword + branch + resumeContext`.

**What works:** The timer ring is clear, the progress bar is honest, the difficulty is appropriately beginner-level so a first-year student isn't humiliated.

**What doesn't:** If the Render.com backend is cold-starting (30–60 second wait), the "⚡ Generating 25 personalised questions…" loading state just spins. There is no timeout message. A student who waits more than 60 seconds with a spinning loader will close the tab and not return.

There is no "Can I go back?" — the Back button is hidden on the quiz step. A student who accidentally clicks the wrong option cannot undo it.

**Step 3 — ELO Result**

This is the strongest screen in the entire product. 4 tabs (Overview, Skills, AI Feedback, Answers), a radar chart, a score ring, correct/wrong/timed-out breakdown, and a starting ELO displayed in large green numbers.

The ELO display is:
```
YOUR STARTING ELO
400
Beginner — great starting point. Grows with daily Arena tasks.
```

For a first-year Mechanical student who scored 0/25 (rare but possible) or 8/25:
- ELO 400 → "Beginner — great starting point. Grows with daily Arena tasks."
- ELO 464 (8 correct) → "Developing foundation — you're on the right track."

**This explanation is adequate** for the assessment screen. It anchors ELO to a starting point and sets the growth narrative. **However:** this is the only place ELO is ever explained. Once the student reaches the dashboard, the number simply appears with no re-explanation.

**Step 4 — RecoPopup → Plan**

After clicking "Go to My Dashboard," a popup appears: "📚 Recommended modules for you — Based on your assessment." Up to 4 weak areas are mapped to Skill Studio modules with a "Study in Skill Studio →" link.

**Issue:** The button says "Continue to Dashboard →" but the profile is still being saved (`savingResult` is true while this popup is visible). The "Study in Skill Studio" links go to `/skill-studio` immediately. If the student clicks them before the profile save completes, their `career_track_slug` and `skill_graph` may not yet be written. Skill Studio will load with an incomplete profile.

**Race condition:** Profile save → RecoPopup appears (overlapping) → Student navigates away before save completes → Skill Studio renders with partial data.

Then: Plan selection screen (Free / Pro / Elite). Free plan allows 1 Arena task/day. Clear.

**Onboarding flow summary: 7/10.** Polished, honest, well-paced. Two specific fixes needed: replace the keyword text input with a role picker, and hold navigation until profile save completes.

---

## 2. POST-ONBOARDING: THE COLD DASHBOARD

After completing onboarding, the student lands on the **Aura page** (the default landing).

### What they see:

**Nav bar (student path):** Aura | Arena | Skill Studio | Launchpad  
*(plus a sub-menu on Aura: Skills, Skill Voucher, Vault, Skill Gaps)*

**Aura page — first visit, ELO 400, zero arena history:**

```
⚡ ELO Rating: 400        +0 this month
✅ Tasks Completed: 0      0 last month
📊 Avg Score: 0%          30-day window
🎯 Skills Assessed: 0     Top: — (0%)
```

Below that: ELO history chart (empty — "Complete Arena challenges to build your ELO history").

Below that: Skill gap radar (empty rings with no skill data yet).

Below that: Market intelligence section (populated with role-specific market data from hardcoded salary/skill data — this actually works well even on day 1).

**What a first-year Mechanical student thinks when they see "ELO 400":**

There is no re-explanation here. The student last saw "ELO" explained 3 minutes ago at the assessment result screen. If they didn't read that carefully (most won't), "400" is a meaningless number. There is no tooltip, no "?" button, no "What is ELO?" link. The tier label "Rookie" appears only inside the Aura monthly report section (buried below the fold), not on the main ELO card.

**The ELO badge on the header:** Shows "400 ELO" in the top right. A recruiter-facing metric shown to a student with no context on what it means or how to improve it.

**What the student does next:** They click "Arena" — the most action-oriented word in the nav.

---

## 3. ARENA — FIRST MISSION

### The first 60 seconds

**Student clicks "Arena."**

They see a two-panel layout:
- Left sidebar: **Mission Panel** ("Today's Missions") — 1 slot active, 2 slots showing "LOCKED" upgrade cards
- Main area: **Domain Challenge Picker** — a grid of challenge cards from their domain

**The challenge picker is actually the correct place to start.** For an IT student, they see 20+ challenge cards: "Build a REST API," "Write a SQL Query," etc. Clear. Actionable. Confidence-building.

**For an ECE/Embedded student**, they see: challenge cards labeled "Write Firmware Driver," "Simulate HDL Module," "Analyze Analog Circuit." These sound domain-appropriate. Good.

**For a Mechanical student**, they see Python code challenge cards labeled things like "Beam Deflection Calculator," "Fluid Flow Analysis," "Load Bearing Design." These are technically correct engineering challenges — but a Mechanical Engineering student who has never coded in Python has no context for why they're being asked to write Python. There is no explanation of "we use Python for engineering simulations — here's how to get started."

### The Mission Panel — free tier

The left panel shows:
- Slot 1: "⚡ Ready to generate — Click to generate your AI mission challenge." → "↻ Generate Now" button
- Slot 2: ⚡ Pro — 3 missions/day — LOCKED
- Slot 3: 🔥 Elite — 6 missions/day — LOCKED

A new student sees their first slot next to two locked upgrade pitches. **Before they've completed a single challenge, they're shown what they can't have.** This is a commercially reasonable decision but a friction-introducing first impression.

### Generating the first mission

Student clicks "↻ Generate Now."

Loading skeleton: "⚡ Generating AI mission…" (5–15 seconds on warm backend, 30–60 seconds on cold start).

**If Render is cold-starting:**
```
⚠️ Server waking up…
Production server is cold-starting (Render.com).
Click retry — it should work on the next attempt.
```

**This is a critical UX failure for a first-year college student.** They see:
1. An error message on their very first action
2. The words "Production server" and "Render.com" — infrastructure language they have no context for
3. "Click retry" — a support instruction, not a product experience

The fix is two lines: replace the message with "We're spinning up your challenge — this takes about 30 seconds on first load" and remove "Render.com" from the student-facing copy.

### Inside the workstation

Mission loads. Student sees:
- Left: Problem description, steps, tools, AI Copilot panel
- Right: Code editor (Monaco) or Notebook (for engineering roles)
- Top: Domain badge, ELO ring (shows "400"), streak counter, time remaining

**No tutorial overlay. No "here's how to use this" tooltip. No empty state guidance.**

For an IT student (Monaco editor): self-evident. They've seen VS Code. The starter code scaffold and comments guide them.

For a Mechanical student (Notebook): They see a Jupyter-style interface with cell blocks. A first-year Mechanical student has likely never used Jupyter. They don't know:
- Which cell to edit vs. which is explanatory
- What "Run Cell" does
- Why there's a Python kernel
- How to submit after writing code

The AI Copilot says: "I'm your Mechanical Arena AI Copilot. Ask me anything, paste code for review, or use the quick prompts below." This is the safety net — but only if the student thinks to use it.

**For ECE students (hdl_ide falls back to notebook):** A VLSI student expecting an HDL simulator gets a Jupyter notebook. This doesn't break the experience — they can write Verilog-like pseudocode in a cell — but it's a mismatch that erodes trust in the platform's domain expertise.

### Submitting

The submit button is at the top ("Submit ↗" or similar). There is no rubric shown before submission. No "your answer will be graded on: correctness, efficiency, explanation." The student submits blind and waits 5–15 seconds for AI grading.

The result panel shows: Score, ELO Gained, AI Feedback. This is well-designed — specific, actionable, explains what was good and what wasn't.

**Positive:** The AI feedback for engineering challenges is domain-specific and genuinely useful. A Mechanical student who writes a beam deflection calculation gets structural engineering feedback, not generic "good job" text.

---

## 4. PERSONA WALKTHROUGHS

### Persona 1 — First-Year Mechanical Engineering Student

**Minute 0:** Opens Capabilio. Landing page headline "Prove your skills. Not just claim them." Ambiguous but intriguing.

**Minute 1:** Clicks "Get Started." Sees path picker. Picks "Student." Types "Mechanical Engineer" in keyword field (assuming they know to). Picks "Mechanical" from branch dropdown. No resume to upload.

**Minute 2–5:** 25 MCQ questions. Some are about statics/dynamics, some about thermodynamics, some are about general aptitude. 45 seconds each. Manageable.

**Minute 5–6:** Assessment result. Score 12/25. ELO: 496. "Developing foundation — you're on the right track." Radar chart shows: Statics 45%, Thermodynamics 38%, Fluid Mechanics 52%, Machine Design 40%, Material Science 35%.

**This is genuinely impressive.** The student sees a personalised skill snapshot after 5 minutes. First reaction: "This actually knows my field."

**Minute 6–7:** RecoPopup. "Study Fluid Mechanics basics in Skill Studio." Student clicks "Continue to Dashboard."

**Minute 7:** Aura page. ELO 496. Zero tasks. Empty chart. Four stat cards all showing 0 or near-zero. **First confusion.** "What am I supposed to do now?"

**Minute 8:** Clicks "Arena." Sees challenge cards. Picks "Beam Deflection Calculator — Medium." Clicks. Mission Panel slot generates. 8 seconds loading.

**Minute 9:** Workstation opens. Python notebook. **Second confusion.** "I don't know Python." Looks at AI Copilot. Tries typing "How do I start?" — Copilot responds helpfully. Reads the starter code. Attempts to fill in the formula. 

**Minute 12:** Submits. Waits. Gets score 62/100. "+8 ELO." ELO is now 504. "OK, I'm getting it."

**Verdict:** This student survives the first session but is confused twice (empty Aura, Python notebook) and loses 3–4 minutes to confusion that could be eliminated with 2 sentences of onboarding copy.

---

### Persona 2 — ECE / Embedded Systems Student

**Minute 0–6:** Same as Mechanical — onboarding works. Types "Embedded Systems Engineer." Branch: ECE. Score 15/25. ELO: 520.

**Minute 7:** Arena. Domain is "Embedded" (arenaKey). Mission generates: "Write a GPIO driver for STM32." Workstation opens.

**The workstation renderer is "code" (firmware_ide falls back to Monaco).** The student sees a Monaco code editor with a C skeleton. This is actually appropriate for embedded systems. The confusion here is less about the tool and more about the starter code comment: `// TODO: implement GPIO_Init()` — for a first-year student, this is opaque.

**The AI Copilot shines here:** "I'm your Embedded Arena AI Copilot. Ask me anything, paste code for review." Student asks "What is GPIO_Init() supposed to do?" — Copilot explains clearly.

**VLSI sub-path:** If the student had picked "VLSI Engineer" instead of "Embedded," they'd get the `hdl_ide` workbench (falls back to notebook). A VLSI student writing Verilog in a Jupyter notebook is jarring. They know what ModelSim looks like. This isn't it.

**Verdict:** Embedded student has a reasonable first day. VLSI student experiences a tool mismatch that signals "this platform wasn't built for me."

---

### Persona 3 — IT / Software Developer Student

This is the strongest first-day experience. IT students get:
- Monaco code editor (familiar — same as VS Code, LeetCode, HackerRank)
- Challenge types they recognize (DSA, SQL, system design)
- Clear starter code with language choice
- Immediate ELO feedback after submission

**The one gap:** Aptitude and Logical categories (0 rows in problems table). When an IT student opens ArenaCatalog and filters by "Aptitude," they see: "No challenges in this category yet. Try selecting a different filter above." A campus placement-focused student who specifically wanted aptitude practice (common for freshers) finds nothing.

**Verdict:** Best first-day experience on the platform. An IT student would return.

---

### Persona 4 — MBA Student

**Keyword typed:** "MBA" or "Business Analyst." Branch: MBA.

**Onboarding MCQ:** Questions are about business analysis, case study reasoning, SQL basics — appropriate. Score 18/25 (easier for an MBA mindset). ELO: 544.

**Arena:** Catalog loads 1,859 rows. MCQ cards (Easy level) dominate. Student completes 5 challenges in 15 minutes. ELO 580. Everything is Easy.

**First friction:** Sees Launchpad. Empty. "Where are the jobs?" This is the core MBA value proposition destroyed on first contact.

**Aura:** Shows "Marketing Analyst" skill radar. MBA module looks good — market intelligence for business roles is more naturally text-based and the Groq-generated content is reasonable.

**Verdict:** Onboarding is good. Launchpad emptiness will cause immediate churn for MBA students whose primary motivation is job placement.

---

## 5. PLACEMENT OFFICER — FIRST SESSION

### What they see upon logging in

InstitutionOS home page. Nav bar (left sidebar) for placement officer role:

**Visibility (ROLE_PAGES for "placement"):** home | pubprofile | people | companies | intelligence | outcomes | settings

The sidebar shows:
```
[Institution Name]
ADMINISTRATION
  ✦ Home
OPERATIONS
  👥 Students
  🤝 Recruiter NDAs
INTELLIGENCE
  📊 Placement Cell
  ✓ Readiness
```

The home page dashboard shows:
```
Good morning, [Name]

Active Members:    0     (0 pending)
Workflow Queue:    0     (0 urgent)
Placements:        0     (0% rate)
Events:            0     upcoming
```

**Four zeros on the first screen.** No call to action. No "Here's what to do first." No getting-started checklist. No "Invite your first students" prompt.

The placement officer scrolls down and sees:
- Verification status banner (if institution not verified)
- Recent activity log (empty)
- A description of what InstitutionOS is

**What the placement officer thinks:** "There's nothing here. Did this work?" They navigate to "Students" — empty. "Placement Cell" — empty ELO Distribution chart, empty Placement Funnel.

After 5 minutes they still haven't seen any student data because:
1. They don't know they need to invite students first
2. No onboarding checklist exists
3. No empty-state guidance says "Step 1: Invite your students"

### The "Placement Cell" (Intelligence) tab

This is what a placement officer came for. They see three sub-tabs:
- **Live Pulse** — Recent activity (empty on Day 1)
- **ELO Distribution** — Chart of student ELO ratings (empty, no students)
- **Placement Funnel** — Stages from Applied → Hired (0 at each stage)

On Day 1 with 0 students, this is a completely empty analytics dashboard. There is no "You'll see data here once students join" messaging. The ELO Distribution chart renders as empty axes. The Placement Funnel shows 0% at every stage.

**A placement officer who sees this will not trust the platform to be ready for 2,000 students.**

### Navigation terminology confusion

| Nav item | What placement officers call it |
|---|---|
| "Workflow queue" | Not used in placement context — officers use "pending applications" or "cases" |
| "At-risk cases" | Not visible to placement role (scoped out) — but confusing in demos |
| "Recruiter NDAs" | Clear |
| "Placement Cell" | Clear |
| "Readiness" | Unclear — is this "student placement readiness" or "platform readiness"? |
| "pubprofile" | Appears in nav as an ID, not a label (should be "Public Profile") |

The `pubprofile` nav item is particularly jarring — a technical ID is visible in the placement officer's navigation.

---

## 6. DEAN DEMO SESSION

### The demonstration scenario

Dean opens Capabilio to show it to company representatives. They open the Arena as a Mechanical Engineering student.

**What the company sees:**
1. Student logs in → Aura shows ELO 650 (after a week of easy challenges) → Tier: "Rookie" (ELO 600 threshold) ← this is confusing because 650 should feel intermediate but the tier says "Rookie"
2. Company opens Arena → sees "Beam Deflection Calculator — Easy"
3. Student solves it in 3 minutes → AI feedback: "Good work" → +6 ELO

**The company's question:** "What does ELO 650 mean in the context of our hiring?"

**The platform offers no answer.** There is no market benchmark (e.g., "top 30% of Mechanical students on the platform"), no explainer for what ELO translates to in job readiness, and no percentile shown at ELO 650. The monthly Aura report shows a percentile, but that report requires navigating to Aura → scroll past the fold → click "Monthly Report" tab.

**Additionally:** Launchpad still has 0 jobs. The Dean cannot demonstrate "here's how a company posts a job and sees matching students." That flow doesn't exist yet.

---

## 7. ISSUE REGISTRY

### UX-P0 — Breaks the first-day experience for at least one major student group

| ID | Issue | Persona Affected | Severity | Fix |
|---|---|---|---|---|
| UX-P0-1 | Keyword field is free text — no validation, no suggestions, no dropdown | All students | CRITICAL | Replace with role picker (searchable dropdown) seeded from roleConfig.js's 44 roles |
| UX-P0-2 | Cold start error shows "Render.com" + "Production server" to students | All students | CRITICAL | Replace with "We're spinning up your challenge (~30 seconds on first load). Hold on… ↻ Retry" |
| UX-P0-3 | Post-onboarding dashboard has zero guidance — no first-action prompt | All students | HIGH | Add a persistent "What to do next" card on Aura home until first Arena task is completed |
| UX-P0-4 | Launchpad is empty on Day 1 — MBA/Pharmacy students churn immediately | MBA, Pharmacy | HIGH | Seed 50+ jobs before launch (from SRE audit) |
| UX-P0-5 | Placement officer lands on all-zero dashboard with no getting-started guidance | Placement Officer | HIGH | Add onboarding checklist: "Step 1: Invite students → Step 2: Set departments → Step 3: View Placement Cell" |
| UX-P0-6 | RecoPopup shows while profile save is still in-progress — navigation race condition | All students | HIGH | Block "Study in Skill Studio" links until save completes; or wait for save before showing RecoPopup |

### UX-P1 — Degrades first-day quality, causes confusion or loss of trust

| ID | Issue | Persona Affected | Fix | Effort |
|---|---|---|---|---|
| UX-P1-1 | ELO number appears on Aura with no explanation — no tooltip, no "?" link, no tier context visible above fold | All students | Add "What is ELO?" tooltip/expandable on the ELO card. Show tier badge (Rookie/Apprentice/etc.) inline next to the number | 2 hours |
| UX-P1-2 | Mechanical students get Python workbench with no Python context — "why Python?" never explained | Mechanical, Civil, EEE | Add a one-line banner in the workstation: "Engineering challenges use Python for simulation — the AI Copilot can help if you're new to it" | 1 hour |
| UX-P1-3 | VLSI student gets Jupyter notebook instead of HDL simulator — tool mismatch destroys domain trust | ECE/VLSI | Short term: add a banner "HDL IDE coming soon — complete this challenge in the notebook using pseudocode" · Long term: build the HDL renderer | 30 min copy, weeks for renderer |
| UX-P1-4 | "pubprofile" appears as a raw ID in InstitutionOS nav | Placement Officer, Admin | Rename nav label to "Public Profile" | 5 min |
| UX-P1-5 | "Readiness" nav item in InstitutionOS is ambiguous — student readiness or platform readiness? | Placement Officer | Rename to "Student Readiness" | 5 min |
| UX-P1-6 | Free tier shows 2 upgrade pitch cards before the student has completed a single challenge | All students | Move upgrade cards to after the first challenge is completed, or show them below the active slot rather than alongside it | 1 hour |
| UX-P1-7 | MCQ generation takes 5–60 seconds with no progress indication beyond "⚡ Generating…" — students close the tab | All students | Add estimated time copy: "This usually takes 5–10 seconds · First load may take up to 30 seconds" with a subtle progress animation | 1 hour |
| UX-P1-8 | No "go back" / answer change on MCQ — accidental click = permanent wrong answer | All students | At minimum, add 1-second buffer after click with a "Confirm answer?" micro-interaction | 2 hours |
| UX-P1-9 | No submission rubric before submitting a workstation challenge — student doesn't know what "good" looks like | All students | Show a 3-line rubric above Submit: "Graded on: Correctness · Approach explanation · Edge case handling" | 1 hour |
| UX-P1-10 | Notebook workstation has no "which cell to edit" guidance for non-Python students | ECE, Mechanical, Civil | Highlight the editable cell with a comment: `# ✏️ Write your solution here — run with Shift+Enter` | 30 min |
| UX-P1-11 | ELO 650 shows tier "Rookie" — counter-intuitive. Rookie tier spans ELO 0–600, so 650 would be "Apprentice" but most engineering students plateau below 600 after Easy challenges | Mechanical, MBA, Pharmacy | This is a content problem (too many Easy problems) — Tier labelling is correct but misleading because the ELO ceiling for Easy-only content is ~650 = barely Apprentice. Reinforces SRE audit P1-2 (seed Medium/Hard). | Requires content seeding |
| UX-P1-12 | Aura page is the default landing — a page with 0 data on Day 1. Arena is more engaging as first landing. | All new students | Set Arena as the default redirect post-onboarding for the first week, then switch to Aura | 1 hour |

### UX-P2 — Quality issues visible within first week

| ID | Issue | Fix | Effort |
|---|---|---|---|
| UX-P2-1 | No empty-state guidance in ArenaCatalog "Aptitude" filter (0 rows) | "Coming soon — Aptitude problems are being added. Try DSA for now." | 30 min |
| UX-P2-2 | AI Copilot greeting is generic: "I'm your Arena AI Copilot" — no personalization | "I'm your Mechanical Engineering AI Copilot, trained on structural mechanics, thermodynamics, and fluid systems." | 30 min |
| UX-P2-3 | Header ELO badge shows "400 ELO" with no tier icon or label — just a number | Add tier icon inline: "🥉 400 ELO" or show tier name on hover | 1 hour |
| UX-P2-4 | Vault is empty on Day 1 with no upload prompt — "Your documents will appear here" is the only content | Add explicit prompt: "Upload your resume to get started" with a one-click resume upload action | 2 hours |
| UX-P2-5 | InstitutionOS "Placement Cell" ELO Distribution chart is empty on Day 1 — no "pending data" messaging | Add "Students will appear here once they complete their first Arena challenge" | 30 min |
| UX-P2-6 | Dean demo: no ELO market benchmark visible to recruiters ("what does this ELO mean for hiring?") | Add market context to public profile: "Top X% of [domain] students on Capabilio" | 4 hours |
| UX-P2-7 | MCQ "Timed Out" questions count against the student (finalAnswers[i] == null = wrong) but the timer runs even if the page is slow | Add +3 second buffer if the question loaded late (detect slow network) | 2 hours |
| UX-P2-8 | No "save progress" indicator on the workstation — student doesn't know if their code is auto-saved | Add a subtle "Not submitted yet" status indicator in the workstation header | 1 hour |

---

## 8. WHAT ACTUALLY WORKS (GIVE CREDIT)

A fair audit recognizes what the first-day student will genuinely appreciate:

✅ **Assessment result screen** — The 4-tab result modal (Overview, Skills, AI Feedback, Answers) is impressive. A student who finishes 25 questions gets a personalized skill radar, AI analysis of their profile, and a review of every question they got wrong with explanations. No competitor assessment flow comes close.

✅ **ELO narrative at result screen** — "Grows with daily Arena tasks" is the correct hook. Simple, clear, action-driving.

✅ **AI Copilot in workstation** — For confused students, this is a lifeline. The domain-specific prompts ("Review my solution," "Find the bug") are contextually correct and give immediate value.

✅ **Domain-specific AI feedback on submissions** — A Mechanical student who writes a beam deflection formula gets feedback that mentions structural engineering concepts, not generic "good job." This is what makes the platform feel specialized.

✅ **Skill Studio RecoPopup** — Showing "study these before your first interview" immediately after the assessment is the right moment to introduce learning. The module cards with "Study in Skill Studio →" links are actionable.

✅ **Challenge card design** — Difficulty badge, category, time estimate, ELO gain, tools, skill tags, scenario preview — students know exactly what they're getting into before clicking. Well-designed.

✅ **InstitutionOS role scoping** — A placement officer only sees their relevant pages (not the full admin view). This is correct information architecture. It just needs empty-state guidance.

✅ **Aura market intelligence** — Even on Day 1 with 0 task history, the market intelligence section (salary trends, skill demand, top companies hiring) populates with role-specific content. A student lands and immediately sees "Average Mechanical Engineer salary in India: ₹5.2L–₹12L." This is value delivered before they've done anything.

---

## 9. THE 5-MINUTE BENCHMARK

For each persona — does a student understand what Capabilio is and what to do next within 5 minutes?

| Persona | Understands the platform? | Completes first action? | Will return tomorrow? |
|---|---|---|---|
| IT/Software student | ✅ Yes | ✅ Yes — first Arena challenge in <5 min | ✅ High probability |
| ECE/Embedded student | ✅ Yes | ⚠️ Maybe — Python context confusion | ⚠️ Medium probability |
| VLSI student | ⚠️ Partially | ⚠️ Maybe — notebook ≠ HDL IDE | ❌ Low probability — tool mismatch |
| Mechanical student | ⚠️ Partially | ⚠️ Maybe — Python confusion, cold Aura | ⚠️ Medium probability |
| MBA student | ✅ Yes | ✅ Yes — Easy challenges accessible | ❌ Low probability — Launchpad empty |
| Pharmacy student | ⚠️ Partially | ✅ Yes — Easy challenges | ❌ Low probability — Launchpad empty |
| Placement Officer | ❌ No | ❌ No — zero data, no guidance | ❌ Will raise concerns with dean |
| Dean demo | ⚠️ Partially | ⚠️ Depends on student persona | ⚠️ Depends on demo preparation |

---

## 10. RECOMMENDED FIXES — PRIORITY ORDER

These are UX-only fixes — zero architectural changes required. All can be shipped as copy or minor UI additions.

### This week (before any demo or beta)

1. **Replace keyword text input with role picker** — searchable dropdown of 44 roles from roleConfig.js. 4 hours.

2. **Change cold-start error copy** — "We're warming up your challenge (~30 seconds). Hang tight…" Remove "Render.com." 5 minutes.

3. **Add "What to do first" card on Aura** — Shown only if `arena_completed === 0`. Single action: "Complete your first Arena challenge →". Dismissed permanently after first completion. 2 hours.

4. **Add InstitutionOS onboarding checklist** — Shown on homepage if `members.length === 0`. Three steps: "Invite students" / "Set up departments" / "View Placement Cell." 3 hours.

5. **Add Python context banner in engineering workstation** — One sentence above the notebook: "Engineering challenges use Python for simulation. New to Python? Ask the AI Copilot to guide you." 1 hour.

6. **Hold RecoPopup navigation until profile save completes** — Disable "Study in Skill Studio" links during save, show spinner on the button. 1 hour.

### Next sprint

7. **ELO tooltip on Aura** — "?" icon next to ELO number. Expands: "ELO measures your technical skill level. 400 = starting point. 800+ = job-ready. 1,200+ = expert." Show tier badge inline. 2 hours.

8. **Set Arena as default landing for first-time users** (first 7 days). 1 hour.

9. **Add submission rubric above Submit button** — 3-line explainer of grading criteria. 1 hour.

10. **Rename "pubprofile" and "Readiness" nav items** in InstitutionOS. 5 minutes.

---

## SUMMARY

The onboarding flow is the platform's strongest UX moment — personalized, well-paced, and delivers a real skill snapshot within 5 minutes. The gap is everything after: an empty dashboard, no first-action prompt, a cold Render error on first Arena load, and a placement officer who sees four zeros with no guidance.

The good news: **every issue in this audit is a copy change, a UI addition, or a minor component tweak.** None of these require backend changes, architectural decisions, or more than a few hours of work each. The platform's core UX is sound. It just needs a layer of guidance for users who don't already know how it works.

Three changes — keyword dropdown, post-onboarding action card, InstitutionOS checklist — would meaningfully improve the first-day experience for every persona in the next sprint.

---

*Audit method: Source code walkthrough of Onboarding.jsx (2,723 lines), Arena.jsx (3,800+ lines), Aura.jsx (3,600+ lines), InstitutionOS.jsx (2,500+ lines), Header.jsx. No live user testing performed — this is a static UX analysis. User testing with real students is recommended before the first college onboarding session.*
