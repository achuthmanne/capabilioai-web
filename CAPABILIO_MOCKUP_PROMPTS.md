# Capabilio — Screen-by-Screen Mockup Prompts

**Version:** 1.0  
**Purpose:** Use each prompt below to:
  1. Generate AI mockup images (Midjourney, DALL·E, Firefly, or similar)
  2. Brief a UI/UX designer for high-fidelity Figma screens
  3. Generate HTML wireframes using AI coding tools
  4. Create a design deck or investor presentation

Each entry includes:
- **Design Brief** — Layout, hierarchy, key elements
- **AI Image Prompt** — Ready to paste into Midjourney / DALL·E / Firefly
- **Figma Brief** — For a human designer
- **Color & Type** — Exact tokens from Capabilio design system

---

## Design System Reference

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#F6F6F1` | Page background (warm off-white) |
| Surface | `#FFFFFF` | Card backgrounds |
| Ink (primary) | `#1A1A18` | Headlines, primary text |
| Ink2 | `#3A3A38` | Body text |
| Ink3 | `#6B6B68` | Captions, secondary text |
| Ink4 | `#9A9A97` | Placeholders |
| Indigo (primary) | `#3D4EAC` | Buttons, links, active states |
| Green | `#1A7A4A` | Success, "You Have" column |
| Amber | `#B8620A` | Warning, "Learn Soon" column |
| Red | `#C0392B` | Error, "Critical Gaps" column |
| Border | `rgba(26,26,24,0.09)` | Card borders |

**Typography:**
- Headlines: Playfair Display (serif), 700–800 weight
- Body: Inter, 400–600 weight
- Numbers/Code: JetBrains Mono, 600–800 weight

---

## Screen 1 — Landing Page / Hero

### Design Brief

Full-screen hero section with animated headline, product value statement, and dual CTA.

**Layout:**
- Minimal navigation: logo left, "Sign In" + "Get Started" right
- Large centered hero block: eyebrow label + H1 headline + subheading + 2 CTAs
- Background: warm cream `#F6F6F1` with subtle grain texture
- Hero image right side: Aura profile card mockup (floating, slight rotation)
- Social proof strip below fold: "8,400 students · 340 companies · 127k proofs generated"

**Key copy:**
- Eyebrow: `AI CAREER OS — BUILT FOR INDIA`
- H1: `Your skills speak for themselves. Finally.`
- Sub: `Arena challenges prove what you can do. Aura shows it to the world.`
- CTA1: `Start Building Proof →` (indigo filled)
- CTA2: `I'm a Recruiter →` (indigo outline)

---

### AI Image Prompt (Midjourney / DALL·E)

```
Clean, modern SaaS product landing page design for an AI career platform called Capabilio. 
Warm off-white background (#F6F6F1), professional but approachable. 
Left side: large bold serif headline "Your skills speak for themselves. Finally." 
Subheading in clean sans-serif. Two buttons: one indigo filled, one outlined. 
Right side: floating UI card mockup showing a skill profile with ELO number badge "ELO 634", 
skill bars for SQL (87%), Python (92%), Data Visualization (79%), and 3 proof artifact cards with scores. 
Card has subtle drop shadow, rounded corners. 
Overall: premium fintech/edtech aesthetic, India-first, not American startup cliché. 
No stock photos of people. Typography-driven. 16:9 aspect ratio. Ultra clean.
```

### Figma Brief

- Frame: 1440×900
- Nav height: 64px, border-bottom: 1px solid `rgba(26,26,24,0.09)`
- Hero padding: 96px top, 80px sides
- H1: Playfair Display 72px Bold, color `#1A1A18`
- Sub: Inter 18px Regular, color `#6B6B68`, max-width 520px
- CTA1 button: height 52px, padding 0 32px, background `#3D4EAC`, border-radius 12px
- Hero card: width 380px, rotate(-2deg), box-shadow `0 24px 64px rgba(0,0,0,0.12)`
- Social proof strip: background `#EFEFE9`, 48px height, Inter 13px Medium

---

## Screen 2 — Path Selector / Onboarding Step 1

### Design Brief

Full-screen onboarding step. Users choose their path. Warm, welcoming, zero distraction.

**Layout:**
- No navigation (onboarding context)
- Logo centered top
- Progress indicator: `Step 1 of 3` (dots or line)
- H2: `Which best describes you?`
- 2×2 card grid (responsive → 1-column on mobile)
- Each card: large emoji icon + bold label + 1-line description
- Hover: border glows indigo, slight scale-up
- Selected: filled indigo border, check icon top-right
- CTA: `Continue →` (enabled after selection)

**4 cards:**
1. 🎓 Student — "I'm building my career from scratch"
2. 💼 Professional — "I'm repositioning for a new role or company"
3. 🏆 Executive — "I lead teams and drive business outcomes"
4. 🏢 Organization — "I hire or manage talent at an institution"

---

### AI Image Prompt

```
Clean SaaS onboarding screen with 4 selection cards arranged in a 2x2 grid. 
Warm off-white background. Centered layout. 
Top: small logo "Capabilio AI" with sparkle icon, progress dots showing step 1 of 3.
Title text "Which best describes you?" in large bold serif font.
4 rounded white cards with subtle borders, each containing: 
  emoji icon (large, 48px), bold card title, short description text in grey.
Cards: Student (graduation cap), Professional (briefcase), Executive (trophy), Organization (building).
Hover state on "Student" card shows indigo border glow and slight elevation.
Below grid: indigo "Continue →" button, disabled until selection.
Minimal, premium, no illustrations or stock art. 16:9.
```

### Figma Brief

- Frame: 1440×900, background `#F6F6F1`
- Grid: 2 columns, 480px wide each, gap 20px, centered
- Card: background white, border `1.5px solid rgba(26,26,24,0.09)`, radius 20px, padding 32px
- Card hover: border `1.5px solid #3D4EAC`, transform scale(1.02), transition 0.2s
- Card selected: border `2px solid #3D4EAC`, top-right checkmark `#3D4EAC`
- Emoji: 48×48px rendered as emoji, not icon
- Card title: Inter 18px 700
- Card description: Inter 14px 400, color `#6B6B68`
- Continue button: same as CTA style above, centered, 48px height

---

## Screen 3 — Onboarding Step 2 — Domain Selection

### Design Brief

Step 2: User types their job role. AI suggests canonical domains.

**Layout:**
- Same framing as Step 1
- H2: `What role are you targeting?`
- Large text input field: placeholder `e.g. "Data Analyst", "React Developer", "DevOps Engineer"`
- Below input: suggested chips (auto-suggest as user types)
- Suggestions: `Data Analyst · Frontend Developer · Backend Developer · DevOps · Data Engineer · ML Engineer`
- Selected state: chip turns indigo filled
- Below: `Or browse all domains →` text link

---

### AI Image Prompt

```
Clean onboarding form step on warm off-white background.
Center-aligned layout. Logo at top.
Headline "What role are you targeting?" in large bold serif.
Below: a wide search/input field with rounded corners, light border, placeholder text.
Below the input field: 6 tag chips in a row — "Data Analyst", "Frontend Developer", "Backend Dev", 
"DevOps", "Data Engineer", "ML Engineer". First chip is indigo-filled (selected state). 
Others are white with light border. Clean type.
Indigo "Continue →" button below.
Minimal, no illustrations. Same premium aesthetic as previous screen.
```

---

## Screen 4 — Student Home Dashboard

### Design Brief

The first screen a student sees after onboarding. Mobile-friendly, card-based, action-oriented.

**Layout — top to bottom:**
1. Greeting block: "Good morning, Riya 👋" + italic serif headline "What's your move today?"
2. Stat row (3 cards): ELO counter | Streak fire | Tier badge
3. Today's Goal CTA card: gradient orange, progress bar, "Go →" button
4. Recommended Next Skill card: blue-tinted, "Start" button
5. Recent Portfolio Proof: 2–3 compact proof cards
6. Quick Actions grid: 4 buttons (Arena / Pulse / Aura / Community)

**Key UI details:**
- ELO card: JetBrains Mono 26px bold, orange color, small "▲ 34 this week" subtitle
- Streak card: fire emoji 🔥, amber number
- Goal card: gradient `linear-gradient(135deg, #FF5701, #FF7A35)`, white text, progress bar
- Proof cards: subtle border, hover lift, score in JetBrains Mono right-aligned

---

### AI Image Prompt

```
Mobile-first student dashboard UI for an AI career platform.
Warm off-white background. Top: greeting "Good morning, Riya 👋" + large serif italic headline.
Row of 3 mini stat cards: ELO "524" in bold orange mono font, fire emoji streak "7", "Building Tier" badge.
Below: a prominent orange gradient card "Today's Goal: Complete 1 Arena challenge" with a progress bar and white "Go →" button.
Below: a clean white recommendation card with blue accent "Advanced SQL — Next Skill".
Below: 2 compact "proof artifact" rows showing challenge titles, company names, scores like "88/100", ELO gains "+16 ELO".
Bottom: 2×2 grid of quick action buttons (sword icon Arena, signal icon Pulse, star icon Aura, people icon Community).
Clean, modern, warm design. Not cluttered. White cards on #F6F6F1 background. 390px mobile width simulation.
```

### Figma Brief

- Frame: 390×844 (iPhone 14 size) — design mobile-first
- Padding: 16px sides, 20px top
- Greeting: Inter 13px 500, name bold; H1 Playfair Display 26px 800, "today?" in italic orange
- Stat row: 3 equal cards, border-radius 16px, height 88px
- ELO number: JetBrains Mono 26px 800, color `#FF5701`
- Goal card: border-radius 18px, gradient background, padding 18px 20px
- Proof cards: border-radius 14px, white bg, 1px border, padding 14px 16px

---

## Screen 5 — Arena Homepage

### Design Brief

The command center for daily challenge activity. High energy but organized.

**Layout:**
- Header row: "⚔️ ARENA" + domain badge + ELO + streak + "Generate New" button
- Mission cards row: 3 cards (Easy / Medium / Hard) side by side
- Progress bar: "This week: 4/5 challenges"
- Proof History list: last 5 submissions with score, company, ELO
- Daily reset countdown: "Resets in 11h 14m"

**Mission card anatomy:**
- Colored top border (green/amber/red by difficulty)
- Difficulty badge
- Company name (bold)
- Challenge title (2 lines max)
- Workstation type (SQL Lab, Notebook, etc.)
- Time limit + ELO gain
- "Start →" button

---

### AI Image Prompt

```
Arena dashboard screen for an AI career platform. Dark-accent header bar "⚔️ ARENA" 
with ELO badge "634" and streak badge "🔥 7".
Below: 3 side-by-side mission cards with colored top borders — green, amber, red.
Each card: company name (Zepto, Swiggy, CRED), challenge title (2 lines), 
workstation type, time limit, ELO gain, "Start →" button.
Cards are white, rounded, elevated shadows.
Below cards: progress bar "4/5 challenges this week".
Below: list of 5 past proof artifacts showing ✅ score, challenge name, company, ELO gained, timestamp.
One row shows ❌ failed challenge with "Retry" button.
Warm cream background, indigo/orange/green accents. Premium, not gamified. 1440px wide.
```

### Figma Brief

- Frame: 1440×900
- Mission cards: 3 columns, gap 16px, max-width 1100px centered
- Card: border-radius 18px, padding 20px 22px, border-top 3px colored
- Card title: Inter 15px 700
- Company: Inter 12px 600, `#6B6B68`
- ELO gain badge: JetBrains Mono 12px, background tinted card color
- History list: left icon (✅/❌) + challenge name + score right-aligned + ELO delta

---

## Screen 6 — Challenge Workspace: SQL Lab

### Design Brief

Split-panel professional coding environment. Focused, distraction-free.

**Layout (desktop 1440px):**
- Fixed top bar: challenge title + difficulty + company + timer countdown (red when < 5min)
- Left panel (40%): Mission brief tabs [Brief | Schema | Hints]
  - Brief: scenario text + task description + expected output
  - Schema: table names + column types (code-style)
  - Hints: 2 collapsible hints
- Right panel (60%): Monaco SQL editor (dark theme) + tabbed output area
  - Tab 1: Results grid (columns, rows, scrollable)
  - Tab 2: Query execution plan (text)
  - Tab 3: Console (errors)
- Bottom bar: "▶ Run Query" (green) + "✅ Submit" (indigo) + word count / line count

---

### AI Image Prompt

```
Split-panel professional coding workspace for a SQL challenge.
Left panel (40%): white background, challenge brief showing company "Swiggy", 
scenario text, task description, expected output table description.
Tabs at top: "Brief | Schema | Hints".
Right panel (60%): dark code editor with SQL syntax highlighting, showing a 
SELECT query with window functions. 
Below the editor: results grid table with columns "cohort, 30d_retention, 60d_retention, 90d_retention" 
and percentage values in cells.
Top bar: challenge title "Cohort Retention Analysis", difficulty badge "Medium", 
timer countdown "31:22" in red, submit button indigo.
Bottom: green "▶ Run Query" button, indigo "✅ Submit" button.
Clean, professional developer IDE aesthetic. Warm cream left panel, dark editor right panel.
```

### Figma Brief

- Top bar: height 56px, background white, border-bottom, timer in JetBrains Mono
- Timer: green when > 10min, amber 5–10min, red < 5min
- Left panel: background white, padding 20px 24px
- Right panel: background `#1E1E2E` (dark editor)
- Editor font: JetBrains Mono 14px
- SQL keywords: `#569CD6` (blue), strings `#CE9178` (orange), comments `#6A9955` (green)
- Results grid: white bg, 1px borders, Inter 13px, alternating row background
- Run button: `#1A7A4A` green, height 40px, border-radius 10px
- Submit button: `#3D4EAC` indigo, height 40px

---

## Screen 7 — Challenge Workspace: Notebook Lab (Pyodide)

### Design Brief

Jupyter-style notebook for Python data analysis challenges.

**Layout:**
- Same top bar as SQL Lab (title, timer, submit)
- Left panel: mission brief (same as SQL)
- Right panel: notebook cell view
  - Cell: dark-bg code area (Python) + "▶ Run Cell" button right
  - Output area: below cell, shows print output OR matplotlib chart as image
  - "+ Add Cell" button between cells
  - Cell numbering [1], [2], etc. left side

---

### AI Image Prompt

```
Jupyter-style Python notebook coding workspace split panel.
Left: challenge brief panel, white background, showing company "Razorpay", 
task about customer segmentation using RFM analysis.
Right: dark notebook with 2 Python cells. 
Cell 1: import pandas as pd, import matplotlib, data loading code. 
Cell output: printed DataFrame head showing columns "user_id, recency, frequency, monetary".
Cell 2: RFM scoring code with partial implementation.
Each cell has a "▶ Run" button on the right edge.
Between cells: subtle "+ Add Cell" button.
A matplotlib bar chart rendered as inline image output below cell 1.
Top bar identical to SQL Lab: company, timer "38:14", submit button.
Professional Jupyter aesthetic adapted for a product UI.
```

---

## Screen 8 — Aura Profile — Skills Tab

### Design Brief

The user's skill identity visualized. Radar chart + skill bars + assessment triggers.

**Layout:**
- Tab row at top: [Dashboard | Career & Vault | Skills | AI Interview | Skill Gaps | Resilience | Code DNA]
- Left block (45%): Radar/spider chart — 8 skills as axes, filled polygon, indigo color
- Right block (55%): Vertical list of skill cards
  - Each skill: name + score bar + source badge (arena/assessment/manual) + "Re-assess" link
  - Score bar: colored by score (green ≥ 70, amber 40–70, red < 40)
  - ELO trendline below radar chart (sparkline, 30 days)

---

### AI Image Prompt

```
Skill identity profile screen for an AI career platform.
Top: horizontal tab navigation showing "Dashboard | Career & Vault | Skills (active) | AI Interview | ...".
Left side (45%): octagonal radar/spider chart with 8 axes labeled with skills:
SQL (87%), Python (92%), Data Cleaning (74%), Data Visualization (79%), 
Statistical Analysis (61%), A/B Testing (48%), Dashboard Design (100%), Storytelling (55%).
Filled indigo polygon, grey grid lines, axis labels.
Below radar: small ELO sparkline "ELO trend: 400 → 524" (30 day line chart).
Right side (55%): vertical list of skill cards.
Each card: skill name left, colored progress bar, percentage, source badge ("arena" / "assessment" / "manual"), 
small grey "Re-assess →" link right.
Bars: green for >70%, amber for 40-70%, red for <40%.
White cards on warm off-white page background. Professional, data-dense but clean.
```

### Figma Brief

- Frame: 1440×900
- Tab row: Inter 13px 600, active tab: border-bottom 2px `#3D4EAC`, color `#3D4EAC`
- Radar chart: SVG, 320×320px, indigo fill `rgba(61,78,172,0.15)`, stroke `#3D4EAC`
- Skill bars: height 6px, border-radius 999px, green/amber/red based on value
- Source badge: 10px, fontFamily JetBrains Mono, background tinted per source
- "Re-assess" link: Inter 11px, color `#3D4EAC`, hover underline

---

## Screen 9 — Aura Profile — Skill Gaps Tab

### Design Brief

The market intelligence view. Most important data for career-action decisions.

**Layout:**
- Page header: "Skill Gap Analysis" + subtitle + "Refresh" button
- Market Overview card: full-width, market narrative text + readiness progress bar + threshold marker
- "Competitive in Xw" chip + "Top Action This Week" card (side by side)
- 3-column grid: Critical Gaps | Learn Soon | You Have
  - Each card: colored top border, skill items with surge badge + bars + gap indicator

---

### AI Image Prompt

```
Skill gap analysis dashboard for an AI career platform.
Top: page title "Skill Gap Analysis" + subtitle "Your profile vs live market demand for Data Analyst".
Below: wide card showing "Live market data" paragraph and a progress bar:
Red bar showing "17%" label, grey bar background, black vertical line marker at 81% labeled "Market threshold".
Text below: "17% market-ready · 5 skills below market threshold".
Side by side: a small indigo card "8w TO BE COMPETITIVE" and an amber card "🎯 Top Action This Week: 
Bridge dbt gap — you're at 0%, market needs 81%".
Below: 3 equal columns:
  Left (red top border) "🔴 Critical Gaps": skill cards showing "dbt" with +67% SURGE badge, 
    two thin progress bars (You 0% vs Market 81%), "Gap: 81 pts —4w to close".
  Middle (amber top border) "🟡 Learn Soon": similar cards, amber color.
  Right (green top border) "🟢 You Have": cards showing Python 100% and Dashboard Design 100%, 
    green bars, "Above 40% threshold ✅".
Data-dense, professional, warm background.
```

### Figma Brief

- Readiness bar: height 8px, `#C0392B` fill, background `#E8E8E1`, threshold marker: 2px wide black line
- 3-column grid: gap 16px, each card border-top 3px colored
- Surge badge: `#C0392B` text, `rgba(192,57,43,0.08)` background, JetBrains Mono 11px
- Gap bars: height 5px, colored fill, background `#E8E8E1`
- Gap label: JetBrains Mono 10px, colored text

---

## Screen 10 — Recruiter Dashboard

### Design Brief

Professional B2B search interface. Recruiter's primary workspace.

**Layout:**
- Left sidebar (280px): Filter panel
  - Role input, ELO range slider, skill checkboxes, city dropdown, availability toggle
- Main area: results grid + pagination
  - Each candidate card: avatar placeholder + name + ELO badge + top 3 skill bars + proof count + last active
  - Hover: card lifts, "View Profile" and "+Add to Pipeline" buttons appear
- Right drawer (optional, overlay): pipeline manager
  - Active pipeline: "Junior DA Role — 3 in Round 1, 1 in Round 2"

---

### AI Image Prompt

```
B2B recruiter search dashboard for a talent platform.
Left sidebar: filter panel with inputs — "Role: Data Analyst", "Min ELO: 500" slider,
skill checkboxes (SQL checked, Python checked, Tableau unchecked), 
city dropdown "Bengaluru", toggle "Open to opportunities only" enabled.
Main area: grid of candidate cards (2 per row).
Each card: small circle avatar, candidate name "Priya Sharma", ELO badge "524", 
3 skill bars (SQL 74%, Python 68%, Data Visualization 71%), "14 proofs" counter, 
"last active 3 days ago" timestamp, "View Profile" button and "+ Add" button on hover.
One card has a slight blue hover glow state.
Professional, clean SaaS design. Indigo accents, white cards, warm background.
Similar aesthetic to LinkedIn Recruiter but warmer, more modern. 1440×900.
```

### Figma Brief

- Sidebar: background white, border-right `1px solid rgba(26,26,24,0.09)`, padding 20px
- Filter section: Inter 12px 700 uppercase label + input below, 16px gap between sections
- Candidate card: padding 18px 20px, radius 16px, 2-column grid, gap 16px
- ELO badge: JetBrains Mono 14px 800, background `#FFF1E8`, color `#FF5701`
- Skill bars: height 4px, green fill, 3 bars stacked
- Hover state: transform translateY(-3px), shadow deepens

---

## Screen 11 — Recruiter: Candidate Proof Profile

### Design Brief

The full view a recruiter sees when they open a candidate profile. Optimized for 2-minute decision.

**Layout:**
- Cover photo strip (gradient fallback if none)
- Avatar + name + role + ELO + tier + location
- Tab row: [Overview | Proof Portfolio | Skills | Experience | Assessments]
- Overview: positioning statement, top 3 stats (ELO / Proofs / Streak), match score
- Proof Portfolio tab: filterable list of proof artifacts with code view + feedback

---

### AI Image Prompt

```
Candidate profile page seen by a recruiter on a talent platform.
Top: wide cover banner in warm gradient. Below: circular avatar overlapping cover, 
candidate name "Priya Sharma", subtitle "Data Analyst · Bengaluru", 
ELO badge "ELO 524 · Rising Tier", location pin, "28 Proof Artifacts".
Buttons: "View Proof", "Contact", "Add to Pipeline".
Tab navigation: Overview | Proof Portfolio | Skills | Experience | Assessments.
Active tab: Proof Portfolio.
Below tabs: filter chips "All | SQL | Python | Data Viz" and a list of proof cards.
Each proof card: challenge title, company logo placeholder, score "88/100", 
ELO gained "+16 ELO", date "Jun 10", "View Code" and "View Feedback" buttons.
Professional, trustworthy design. Not a social profile — more like a work portfolio.
Warm background, white cards, indigo accents.
```

---

## Screen 12 — Skill Studio: Learning Path

### Design Brief

The guided learning experience. Phase-by-phase roadmap with lesson cards.

**Layout:**
- Header: "Your Learning Path — Data Analyst"
- Phase progress tabs: Phase 1 | Phase 2 | Phase 3 (progress dots)
- Active phase: Phase 1 — SQL Mastery — "3 weeks · Closes your biggest gap"
- Action list: vertical timeline with 3 action types
  - 📚 Learn: "Window Functions Explained" — 15 min — [Start Lesson]
  - 🏋️ Practice: "Ranking & Partitioning Exercises" — [Start Practice]
  - ⚔️ Prove: "Arena: Swiggy Retention Query" — [Go to Arena]
- Right sidebar: skills covered, ELO gain estimate, completion %

---

### AI Image Prompt

```
Personalized learning path screen for an AI career platform.
Top header "Your Learning Path — Data Analyst".
Phase progress bar showing Phase 1 (active, indigo), Phase 2, Phase 3 (grey dots).
Below: Phase 1 title "SQL Mastery" with duration badge "3 weeks" and focus text 
"Closes your biggest skill gap".
Vertical timeline of action cards:
  First card: 📚 book icon, "Learn: Window Functions Explained", "15 min", green "Start Lesson →" button.
  Second card: 🏋️ dumbbell icon, "Practice: Ranking & Partitioning", locked appearance.
  Third card: ⚔️ sword icon, "Prove: Swiggy Arena Challenge", locked appearance.
Right sidebar: "Skills you'll build" tags (SQL, Window Functions, CTEs), 
"Expected ELO gain: +45", progress ring showing 0% complete.
Clean, structured, not gamified. Professional learning platform aesthetic.
Warm background, white action cards, colored left borders by action type.
```

---

## Screen 13 — Skill Studio: Lesson View

### Design Brief

In-lesson reading and interaction view. Calm, focused, article-like.

**Layout:**
- Breadcrumb: Learning Path → Phase 1 → Window Functions
- Progress: "Lesson 1 of 4 · 12 min read"
- Article-style content: heading + body text + highlighted code block
- "Key Points" callout box (indigo left-border)
- Mini quiz (2 questions at end of section)
- Bottom: "Mark as Complete + Start Practice →"

---

### AI Image Prompt

```
Micro-lesson reading view for an AI career platform learning module.
Clean article-style layout, warm off-white background.
Top: breadcrumb navigation "Learning Path → Phase 1 → Window Functions".
Progress indicator "Lesson 1 of 4 · Estimated 12 min".
Large section heading "What is a Window Function?" in bold serif.
Below: 2 paragraphs of body text in clean sans-serif.
Syntax-highlighted code block below text:
  SELECT user_id, RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rank
  FROM orders;
Code block: dark background, mono font, colored keywords.
Below code: "Key Points" callout box with indigo left border:
  • Window functions don't collapse rows like GROUP BY
  • PARTITION BY defines the window boundary
Bottom: indigo "Mark Complete + Continue →" button.
Clean, focused, distraction-free. Academic but modern.
```

---

## Screen 14 — Onboarding: Post-Assessment Results

### Design Brief

The moment after completing the initial skill assessment. ELO is revealed, gaps are shown, next step is clear.

**Layout:**
- Full screen, centered
- Animated ELO reveal: large number counts up from 0 to 412
- Tier label: "Learning Tier · You're in the bottom 40% for Data Analyst"
- Gap summary: 3 critical gap callouts (SQL 45% / dbt 0% / Python 30%)
- Next step card: "Your Learning Plan is ready" → [View Plan]
- Secondary: "Go straight to Arena →"

---

### AI Image Prompt

```
Assessment results reveal screen for an AI career platform.
Centered layout, warm off-white background.
Large animated ELO number "412" in bold orange monospace font, very prominent center.
Below ELO: tier badge "Learning Tier" with amber color and explanation text.
Below tier: 3 compact gap cards side by side:
  SQL: "45% · Gap: 36 pts", 
  dbt: "0% · Gap: 81 pts — biggest gap", 
  Python: "30% · Gap: 51 pts".
Below gaps: prominent indigo card "🎯 Your Learning Path is Ready" with subtitle 
"Personalized for Data Analyst — starts with SQL" and green "View My Plan →" button.
Secondary link below: "Or jump straight to Arena →" in smaller grey text.
Celebratory but not over-the-top. No confetti. Just clean clarity about what comes next.
```

---

## Screen 15 — Verification Flow

### Design Brief

Step-by-step trust-building wizard. Feels like a secure, bank-like verification process.

**Layout:**
- Progress steps: Experience (✅ done) → Certifications (▶ current) → Documents
- Cert provider grid: 5 logos (AWS / GCP / Microsoft / Salesforce / CompTIA)
- Selected provider: AWS (highlighted border)
- Certificate ID input + "Verify" button
- Success state: green banner "✅ AWS Solutions Architect — Associate · Issued Jan 2024"
- Badge preview: Gold ⭐ badge displayed on mini profile card

---

### AI Image Prompt

```
Certification verification flow screen for a professional platform.
Top: 3-step progress bar — "Experience ✅", "Certifications (active)", "Documents".
Below: section title "Add Your Certifications".
Grid of 5 certification provider cards: AWS (selected with blue border glow), 
Google Cloud, Microsoft, Salesforce, CompTIA. Each has provider logo and name.
Below grid: text input field labeled "Certificate ID" with placeholder text 
"e.g. AWS-SAA-C03-382919" and "Verify Certificate" button.
Below: success state banner in green showing:
  ✅ AWS Solutions Architect — Associate
  Issued: January 2024 · Valid until: January 2027
  "Gold badge added to your profile"
Right side: mini profile card preview showing the gold star badge appearing on the profile.
Clean, trust-building, bank-like verification aesthetic. Indigo + green accents.
```

---

## Screen 16 — Mobile: Arena Challenge (SQL Lab)

### Design Brief

Mobile-specific SQL challenge view. Optimized for 390px width.

**Layout:**
- Top bar: timer + "Submit" button, compact
- Tabs: [Brief] [Schema] [Code] [Results] — horizontal scrollable
- Code tab: full-width Monaco editor, dark theme, 14px mono
- Results tab: scrollable table
- Sticky bottom: "▶ Run" | "✅ Submit" button row

---

### AI Image Prompt

```
Mobile SQL coding challenge screen at 390px width.
Dark code editor taking 80% of screen height, SQL code with syntax highlighting.
Top bar (compact): "Swiggy · Cohort Analysis" title left, timer "31:22" amber right, small "Submit" button.
Horizontal tab pills below top bar: "Brief | Schema | Code (active) | Results".
Full-width dark editor below with SQL query.
Sticky bottom bar: green "▶ Run" button left (60% width), indigo "Submit" button right (40% width).
Touch-optimized, no hover states needed. Dark theme for code, warm light for brief tab.
iPhone 14 frame (optional). Mobile-first professional look.
```

---

## Screen 17 — Organization Dashboard

### Design Brief

Team intelligence view for HR, L&D leads, and CTOs.

**Layout:**
- Header: org name + plan badge + "Invite Members" button
- 4 stat cards: Team Size / Avg ELO / Proof Count / Open Roles
- Skills heat map: team skill matrix (skill vs person, colored cells by score)
- Action row: "Deploy Challenge" | "View Pipeline" | "Export Report"
- Team member list: avatar + name + role + ELO + last active

---

### AI Image Prompt

```
Organization team intelligence dashboard for a B2B talent platform.
Top: org name "Fintech Startup" with "Pro Plan" badge, "Invite Members" button right.
Row of 4 stat cards: "8 Members", "Avg ELO 654", "127 Proofs", "2 Open Roles".
Below: skills heat map grid — left axis: 8 team members (names). 
Top axis: skills (SQL, Python, Cloud, System Design, APIs).
Cells are colored: dark green for high scores (80+), light green (60-80), amber (40-60), red (<40).
Team member "Arjun K." has red in "Cloud" column — visually flagged.
Below grid: 3 action buttons — "Deploy Challenge →", "View Pipeline →", "Export Report →".
Bottom: compact team member list showing avatar, name, ELO badge, "last active" text.
Professional B2B SaaS dashboard aesthetic. Indigo + green data visualization palette.
```

---

## Summary: Screen Inventory

| # | Screen | Path | Priority |
|---|--------|------|----------|
| 1 | Landing Page / Hero | Public | P0 |
| 2 | Path Selector (Onboarding S1) | All | P0 |
| 3 | Domain Selection (Onboarding S2) | All | P0 |
| 4 | Student Home Dashboard | Student | P0 |
| 5 | Arena Homepage | All | P0 |
| 6 | SQL Lab Workspace | All | P0 |
| 7 | Notebook Lab Workspace | All | P0 |
| 8 | Aura Skills Tab | All | P0 |
| 9 | Skill Gap Analysis | All | P0 |
| 10 | Recruiter Dashboard | Recruiter | P0 |
| 11 | Candidate Proof Profile | Recruiter | P0 |
| 12 | Skill Studio: Learning Path | All | P1 |
| 13 | Skill Studio: Lesson View | All | P1 |
| 14 | Post-Assessment Results | All | P1 |
| 15 | Verification Flow | Professional | P1 |
| 16 | Mobile: Arena Challenge | Mobile | P1 |
| 17 | Organization Dashboard | Org | P1 |

**P0 = Build first (MVP). P1 = Build in Phase 3–7.**

---

## How to Use These Prompts

### For AI Image Generation (Midjourney, DALL·E, Firefly)
1. Copy the "AI Image Prompt" block for a screen
2. Paste directly — prompts are written for these tools
3. Regenerate 4–8 variations, pick the best
4. Use consistent style seeds across all screens for visual cohesion
5. Suggested Midjourney suffix to add: `--ar 16:9 --style raw --v 6`

### For Figma Design
1. Read "Design Brief" + "Figma Brief" sections
2. Start with Frame at the specified dimensions
3. Apply design token colors from the table at the top of this document
4. Use component variants: Empty / Loading / Data / Error for every data card
5. Build a shared component library: Button, Card, Badge, SkillBar, ELO Badge, Proof Card

### For HTML Wireframe Generation
Use this system prompt with your AI tool:
```
Generate a single-file HTML+CSS wireframe for the following screen.
Use these design tokens: background #F6F6F1, cards white, primary #3D4EAC, 
success #1A7A4A, warning #B8620A, error #C0392B.
Typography: system-ui for body, monospace for numbers and code.
No external fonts or libraries. Inline CSS only. Semantic HTML.
Screen description: [paste Design Brief here]
```

---

*Capabilio Mockup Prompts v1.0 — Design & Engineering Team*  
*Use alongside CAPABILIO_NOTION.md and CAPABILIO_DEV_HANDOFF.md*
