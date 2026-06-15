# Capabilio Professional Path — Complete Redesign Document
**Version 1.0 | Production-Grade Product & Design Systems Document**
**Audience: Product Design, Engineering, Growth**

---

## 0. HOW TO READ THIS DOCUMENT

This is not a mood board. Every recommendation is implementable, opinionated, and tied to a real user outcome or business outcome. Weak ideas are called out directly. Things that should be removed are removed. Nothing is kept for comfort.

Read sections in order the first time. After that, each section is self-contained for engineering handoff.

---

## 1. EXECUTIVE SUMMARY

### What Capabilio is

A career operating system for India. Skill-first, proof-driven, verification-led. The Professional Path serves working professionals and career-break returners — people who have real employment history, are evaluating moves, negotiating salaries, or rebuilding after a break.

### What is currently wrong with the Professional Path

**Structurally:**
- Orbit is doing too many jobs simultaneously (identity + scoring + intelligence + vault + settings all crammed in)
- Forge has no clear user trigger — professionals don't know when to use it or why
- Launchpad is mapped correctly (jobs) but has no India-specific job intelligence
- Pulse is undefined — without curation rules it will become noise
- Nexus exists but has no connection model that makes sense for Indian professionals
- Profile is functional but reads like a form, not a premium identity page

**On scoring:**
- "Role ELO", "Market ELO", "Proof ELO", "Mobility ELO" — this language is correct internally but wrong for users
- Professionals don't play games. They manage careers. Calling their professional standing "ELO" creates a credibility gap with the product's premium positioning
- The scores need new plain-language names with clear explanations of what moves them

**On pricing:**
- Orbit Pro / Orbit Elite names are too internally focused
- Charging professionals for Arena access is the wrong monetisation angle — professionals will not pay to grind daily coding tasks
- The actual value for professionals is leverage, intelligence, trust, and opportunity access — none of these are currently the pricing anchor
- India pricing must feel appropriate — ₹499–999/month is the correct Pro band

**On paywalls:**
- Currently scattered and inconsistent
- No clear upgrade narrative thread across the product
- Missing the key conversion moments: compensation data, recruiter visibility, AI strategy depth

### What this document fixes

All of it. End to end.

---

## 2. PROFESSIONAL PATH REDESIGN OVERVIEW

### Navigation Model (confirmed, do not change)

```
Layer 1 — Path Selector
  Student       → "Build me"
  Professional  → "Position me"
  Executive     → "Steer outcomes"
  Organization  → "Run the institution"

Layer 2 — Core Pages (Professional)
  Orbit         → Career Intelligence
  Forge         → Career Action Engine
  Launchpad     → Jobs
  Pulse         → Professional Feed
  Nexus         → Network & Opportunities
  Profile       → Identity & Proof Center
```

### Design Language

Use a system that feels like **Linear meets a premium Indian enterprise app.** Specific directives:

- **Typography:** One serif for headings (Playfair Display, already in use), one mono for data/labels (JetBrains Mono), one clean sans for body (Inter)
- **Color:** Deep navy/indigo primary, clean white surfaces, subtle warm off-white cards, one amber accent for warnings/alerts, one green for verified/positive states
- **Cards:** Slight elevation, 12–16px radius, no decorative gradients unless functional
- **Data:** Every number on screen must be real, labelled, and actionable. No placeholder bars.
- **States:** Every card must have: loaded, loading skeleton, empty with CTA, error with retry, and locked (paywall) states
- **Density:** Medium. Not as dense as Bloomberg. Not as sparse as a landing page. Closest reference: Linear's project view.

### Terminology rules

| Old term | New term | Why |
|---|---|---|
| Role ELO | Role Fit Score | Plain English. Professionals understand "fit". |
| Market ELO | Market Standing | Implies external positioning, not game rank |
| Proof ELO | Proof Strength | Emphasises credibility, not competition |
| Mobility ELO | Career Mobility | Clear action orientation |
| Arena | Arena (keep) | Arena stays for student path. Not the primary Professional frame. |
| Orbit Pro | Capabilio Pro | Decouples plan from single page name |
| Orbit Elite | Capabilio Elite | Same reason |
| Proof Vault | Vault | Simpler |
| Forge (module names) | See Forge section | Individual module names redesigned |

---

## 3. ORBIT REDESIGN

### Job to be done

**Answer three questions for the professional in under 60 seconds:**
1. Where do I actually stand right now?
2. What is hurting me the most?
3. What should I do first?

### Who uses Orbit most

- Professionals 2–10 years into their career evaluating a switch
- People recently promoted or laid off trying to understand market position
- Career-break returners needing a baseline re-entry read
- Anyone who just updated their resume / profile and wants to see impact

### What to remove from current Orbit

- Remove any Arena/task grind prompts — wrong audience frame
- Remove abstract animated score rings with no context
- Remove "your skills vs market" charts that have no salary or role anchor
- Remove any onboarding wizard that treats the professional like a student

### Tab Structure

#### Tab 1: Overview (default landing tab)

**Purpose:** Career health summary. Priority actions. Top signals.

**Sections:**

**Career Health Panel** (top of page, always visible)
- Four score tiles in a row: Role Fit · Market Standing · Proof Strength · Career Mobility
- Each tile: score (0–100), one-line label ("Strong match for Senior roles"), one traffic light (green/amber/red), one action link ("See what's lowering this →")
- FREE: All four tiles visible with scores
- PRO: Clicking any tile opens full breakdown with driver list
- ELITE: Tile includes AI recommendation ("Based on your current trajectory, your Market Standing will drop in 3 months without one of these three actions")

**Priority Actions card** (below health panel)
- Maximum 3 items at any time
- Each item: label, one sentence why, one CTA button
- Example items:
  - "Add employment dates to NHS England — missing dates reduce your Verification score by 22 points" → [Fix now]
  - "Your Proof Vault has 0 verified documents — recruiters in your field expect 2–3" → [Add proof]
  - "3 recruiters viewed your profile this week but you have no contact-open signal" → [Enable recruiter contact] (Pro)
- Empty state: "Your profile is in strong shape. Check Forge for your next career move." with Forge CTA
- FREE: Shows 1 priority action
- PRO: Shows all 3
- ELITE: Actions are AI-ranked by career impact

**Week-in-Review card** (right column or below on mobile)
- Profile views this week vs last week
- Recruiter views (Pro+)
- Applications status if any
- Skill match changes if job alerts exist
- Vault downloads (if shared)
- Empty state: "Start building your career signal — import your resume or connect LinkedIn"

**Recent Activity feed** (bottom)
- Compact timeline: last 5 actions in the product
- Import date, profile update, forge action completed, application submitted, skill added
- Not a social feed — this is a personal audit trail

---

#### Tab 2: Timeline

**Purpose:** Career history, employment gaps, verification status per role, date integrity.

**Keep from current:** The timeline visual with company avatars, role cards, date display.

**Remove:** The massive inflated skills list per experience (this is actively being fixed in the codebase).

**Redesign additions:**

Each experience card must show:
- Company name + role
- Dates with duration (handle "Date not set" gracefully — already done)
- Location
- Verification badge: VERIFIED / SELF-CLAIMED / PENDING
- Up to 6 role-specific skills (already fixed — see backend changes)
- EDIT / DEL buttons
- UAN/EPFO verification CTA if Indian employer and unverified (Pro)

**Verification flow (new):**
- SELF-CLAIMED entry → "Verify this role" button → opens Trust Forge
- PENDING → shows progress indicator with expected timeline
- VERIFIED → green badge, locked from editing without re-verification

**Empty state:** "Your career history starts here. Import your resume or add your first role manually."

**Add experience form improvements:**
- Industry dropdown (not free-text)
- Notice period field (Indian context)
- CTC range field (private by default, used for Compensation tab)
- Current role flag

**FREE:** View + edit timeline, max 5 experiences
**PRO:** Unlimited experiences, verification requests, employment gap analysis
**ELITE:** Automated EPFO/UAN verification, verification fast-track badge

---

#### Tab 3: Verification

**Purpose:** Trust layer. Shows what has been verified, what is pending, what is missing, and the business impact of each.

**Why this tab matters:** In India, employment verification is one of the most important recruiter actions before offer. Building this into the professional identity is a moat.

**Sections:**

**Trust Score card**
- Composite score (0–100) based on: employment verified, degree verified, skills assessed, proof documents submitted, identity confirmed
- Plain English label: "Trusted Professional" / "Partially Verified" / "Unverified" / "Verification in Progress"
- "Recruiters are X% more likely to contact verified profiles in your field" (data-backed copy once we have data)

**Verification checklist**
Each item shows: label, status, action, and business impact

| Item | Status | Action | Impact |
|---|---|---|---|
| Identity (Aadhaar-linked or email) | Complete | — | Unlocks all verification |
| Employment — Capabilio AI | Self-claimed | Verify via UAN | +18 pts trust |
| Employment — NHS England | Self-claimed | Verify via UAN | +18 pts trust |
| Degree — University of Hertfordshire | Unverified | Add documents | +12 pts trust |
| Skills — Cyber Security | 3 assessed via Arena | Complete Arena tasks | +8 pts trust |
| Proof documents | 0 uploaded | Add to Vault | +15 pts trust |

**UAN/EPFO verification flow (India-specific, Pro):**
- User enters UAN number
- System queries EPFO public data
- Matches employer and employment dates
- Marks entry as VERIFIED with green badge
- Caveat: International employment (NHS England) gets separate flow — letter of reference upload or email verification via domain

**FREE:** See verification status, manual self-claim only
**PRO:** UAN verification, degree document upload, verification requests sent to employers
**ELITE:** Fast-track queue, third-party verification partnerships, physical/digital reference verification

---

#### Tab 4: Proof Vault

**Purpose:** Store, organise, and selectively share verified proof of professional work.

**What belongs here:** Documents that prove capability or employment — NOT general file storage.

Valid proof types:
- Work certificate / relieving letter
- Payslip (redacted CTC, date verified)
- Project completion certificate
- Offer letter (verifies employer, role, date)
- Client testimonial / reference letter
- Publication / paper / article
- Patent
- Award / recognition document
- Performance review excerpt (with employer consent)

**What does NOT belong here:** Random files, personal documents, PDFs with no professional context.

**Card design:**
- File name + type badge
- Upload date
- Verified / Unverified status
- Visibility: Private / Recruiter-only / Public
- Linked experience (which role this proves)
- Preview / Download / Share link controls

**Visibility model:**
- Private: only you
- Recruiter-only: visible when recruiter views your profile (requires Pro)
- Public: anyone with your profile link

**Empty state:** "Your Vault is empty. Proof documents increase your trust score and recruiter confidence. Start by uploading your most recent employment letter or a project certificate."

**Upload flow:** Drag and drop → auto-categorise by file type → link to experience → set visibility → AI extracts date and employer name for verification cross-check

**FREE:** 2 documents, private only
**PRO:** 15 documents, recruiter-visible control
**ELITE:** Unlimited documents, public shareable vault link, recruiter download analytics, document expiry alerts

---

#### Tab 5: Compensation

**Purpose:** Real market rate intelligence for Indian professionals in their specific role, city, and experience band.

**This is a Pro-gating anchor — the single highest-conversion feature for professionals considering an upgrade.**

**Sections:**

**Your Compensation Position card**
- Current CTC (from profile, private)
- Market median for your role + city + experience (PRO)
- Where you sit: "Below market", "At market", "Above market", "Top 20%"
- Gap in rupees: "The median for Senior Cyber Security Analyst in Hyderabad is ₹18.2L. You are at ₹14.5L — ₹3.7L below market."
- Trend arrow: Is the market for your role going up or down in India?

**Salary bands by company type card** (PRO)
- Product company vs service company breakdown
- MNC vs Indian startup vs enterprise
- Senior vs Staff vs Lead progression in your field
- Source: aggregated from job postings + verified salary data + Arena user submissions (anonymised)

**Switch uplift calculator** (PRO)
- "If you switch now, the typical uplift for your profile in Hyderabad is 18–28%"
- "Highest paying cities for your role: Bangalore (₹22.1L median) > Hyderabad (₹18.2L) > Pune (₹16.8L)"

**Notice period impact** (India-specific, PRO)
- "Your current notice period (90 days) reduces recruiter shortlist probability by 31% for startups. Consider negotiating buyout terms."
- "Companies currently offering notice period buyout: list of companies actively hiring in your space"

**Negotiation prep kit** (ELITE)
- AI-generated talking points for salary negotiation based on your profile vs market
- "Your 3 strongest leverage points: NHS England verification, SIEM expertise, MSc Cyber Security"
- "Comparable offers in your market right now: ₹17–21L for your profile type"

**FREE:** Completely locked. Show blurred card with "Understand your market value → Upgrade to Pro" CTA
**PRO:** Full compensation intelligence, salary bands, city comparison, switch uplift
**ELITE:** Negotiation kit, AI-driven compensation strategy, offer comparison tool

**Locked state copy:** "You're flying blind on salary. 73% of professionals who negotiate using market data get offers 15–25% higher. This data is yours — unlock it." [Upgrade to Pro — ₹499/month]

---

#### Tab 6: Readiness

**Purpose:** Role-fit readiness score for a specific target role. Answers "am I ready to apply for X right now, and if not, what's the 30-day path to being ready?"

**Sections:**

**Target Role selector**
- Type a role title or select from suggestions
- System pulls job requirements from Launchpad's active listings for that role
- Calculates gap between user profile and role requirements

**Readiness Report card**
- Overall fit: 73% match for Senior Cyber Security Analyst
- Skills match (verified vs required)
- Experience match (years, seniority, industry)
- Proof match (does your vault prove you can do this?)
- Verification match (how trusted is your profile?)
- Each dimension shows: current vs required, gap, and one action to close it

**30-Day readiness plan** (ELITE)
- AI-generated weekly milestones to hit target role requirements
- Linked to Forge modules for action
- Progress tracking

**Interview readiness indicator**
- Based on your Arena history (if any), forge usage, proof documents
- "You are not interview-ready for this role yet. Your weakest signal is proof documentation."

**FREE:** One target role, overview readiness score only
**PRO:** Three target roles, full gap analysis per dimension
**ELITE:** Unlimited target roles, 30-day readiness plans, AI interview prep linked to specific role

---

## 4. FORGE REDESIGN

### Job to be done

Help professionals take a specific career action with guided workflow support. **Not a list of features. A set of workflows that solve real career problems with clear inputs, steps, outputs, and outcomes.**

### Who uses Forge

- Someone about to negotiate salary (Comp Forge)
- Someone planning a company switch (Switch Forge)
- Someone returning after a 2-year gap (Return Forge)
- Someone trying to get promoted internally (Promotion Forge)
- Someone rebuilding their professional reputation with verified proof (Proof Forge)
- Someone preparing for interviews (Interview Forge)
- Someone who needs a trusted, verifiable professional identity for the first time (Trust Forge)

### Design model

Forge is a **guided workflow launcher.** The home screen shows all available modules as large cards. Clicking a module opens a step-by-step guided workflow — not a settings page, not a form dump, a genuine multi-step workflow with AI assistance at each step.

Each module has: a status (not started / in progress / completed), an estimated time to complete, and a result artifact (PDF, plan, report, or score update).

---

### Module 1: Proof Forge

**Job to be done:** Build and publish 1–3 verified proof artifacts that demonstrate real professional capability.

**Who:** Anyone whose profile says "self-claimed" everywhere. Especially professionals who have never documented their work publicly.

**Steps:**
1. Select role to build proof for
2. Choose proof type (project, impact statement, work certificate, client result)
3. Guided input: What did you do? What was the outcome? What can you verify?
4. AI refines the proof statement into professional format
5. Link supporting document (optional)
6. Set visibility (private / recruiter / public)
7. Vault entry created, Proof Strength score updated

**Output artifact:** Verified proof card (visual, shareable link) + Vault entry

**FREE:** 1 proof forge per month, private only
**PRO:** Unlimited, recruiter-visible
**ELITE:** Public shareable proof card with analytics

---

### Module 2: Switch Forge

**Job to be done:** Plan a role or company switch strategically — not reactively.

**Who:** Professional with 3+ years experience considering a move in the next 3–12 months.

**Steps:**
1. Define current state: role, company, CTC, location, notice period
2. Define target state: role type, company type, city, CTC expectation, timeline
3. Gap analysis: what's missing between current profile and target role market demand
4. Market read: how many active openings exist for target role right now
5. Switch readiness score: percentage ready today vs 90-day target
6. Action plan: top 5 things to do before applying
7. Alert setup: notify when target role opens at specific companies

**Output artifact:** Switch Plan PDF (branded, shareable with trusted contacts)

**FREE:** Can open Switch Forge, see step 1 only
**PRO:** Full workflow, gap analysis, market read, alert setup
**ELITE:** AI strategy session, personalised company hit list, referral path suggestions

---

### Module 3: Comp Forge

**Job to be done:** Prepare for a salary negotiation with data-backed arguments.

**Who:** Professional who received an offer, is in final round, or is preparing for annual appraisal.

**Steps:**
1. Enter current CTC, role, years experience, city
2. Enter negotiation context: new offer / appraisal / counter-offer / promotion
3. System pulls market data for role + city + experience band
4. AI generates 3–5 negotiation talking points specific to this user's profile
5. Generates competing offer range ("Jobs currently open for your profile are offering ₹X–Y")
6. Role-play option: practice negotiation script with AI

**Output artifact:** Negotiation brief (private PDF with talking points, market data, profile strengths)

**FREE:** Locked
**PRO:** Full workflow, market data, talking points
**ELITE:** AI role-play, offer comparison, counter-offer calculator

---

### Module 4: Return Forge

**Job to be done:** Re-enter the job market confidently after a career break.

**Who:** Professionals returning after 6+ months away — parental leave, health, personal, or geographical relocation (very relevant for Indian professionals returning from abroad).

**Steps:**
1. Declare break: start date, end date, type (personal / parental / health / study / geography)
2. "What did you do during this period?" — optional input (freelance, upskilling, caregiving, etc.)
3. Profile gap analysis: what has changed in your field while you were away
4. Skills currency check: which of your skills are still current, which need refresh
5. Re-entry positioning: AI drafts how to frame your break professionally on your profile
6. Re-entry action plan: 30-day checklist to re-activate job-search readiness

**Output artifact:** Return narrative (2–3 sentences, verified, added to profile summary)

**Important for India:** Returning from abroad (Gulf, UK, US) with foreign experience is a specific use case — module must handle international experience repatriation positioning.

**FREE:** Can start, see steps 1–2
**PRO:** Full workflow, skills currency check, re-entry narrative
**ELITE:** Targeted re-entry job list, mentor connection for your sector, AI-coached return narrative

---

### Module 5: Promotion Forge

**Job to be done:** Build an evidence-backed case for internal promotion.

**Who:** Professional 2–5 years into a role who is preparing for promotion cycle.

**Steps:**
1. Current role and target level
2. Company type (startup / enterprise / MNC / government / PSU)
3. "What have you delivered in the last 12 months?" — structured input prompts
4. Impact quantification: AI helps translate vague achievements into numbers
5. Proof linking: connect vault documents to achievements
6. Peer comparison: how does your profile compare to others at your target level (market data)
7. Promotion brief: structured document formatted for a conversation with your manager

**Output artifact:** Promotion brief (private, 1-page structured PDF) — not for public, for internal use

**FREE:** Steps 1–2 only
**PRO:** Full workflow, impact quantification, brief generation
**ELITE:** Level-by-level market benchmarking, AI brief optimization, skip-level positioning guidance

---

### Module 6: Trust Forge

**Job to be done:** Build a verified, trustworthy professional identity from scratch or improve an existing one.

**Who:** New users, professionals who have never had a verified profile anywhere, anyone who just uploaded a resume and wants to get verified fast.

**Steps:**
1. Profile audit: what's missing, what's self-claimed, what's verified
2. Verification priority list: which items give the most trust score increase
3. Guided verification: step-by-step for each item (UAN entry, degree upload, skills assessment)
4. Proof document prompts: "Do you have a relieving letter from your last employer? Upload it here."
5. Trust score trajectory: projected trust score after completing all recommended steps
6. Public trust badge unlock: "Trusted Professional" badge for profile

**Output artifact:** Trust audit report + completed verifications

**This module should be the default entry point for new professional users.**

**FREE:** Profile audit visible, 1 verification action
**PRO:** Full verification workflow, UAN/EPFO check, degree verification
**ELITE:** Fast-track queue, third-party verification partnership, physical reference letter verification

---

### Module 7: Interview Forge

**Job to be done:** Practice and prepare for a specific upcoming interview with AI.

**Who:** Professional who has a screening or technical interview in the next 1–7 days.

**Steps:**
1. Enter interview details: company, role, interview type (HR / technical / case / panel)
2. System pulls known interview patterns for that company (if in database) or for that role type
3. AI generates role-specific question bank (20–30 questions at right seniority level)
4. Practice session: AI asks questions, user answers (text or voice), AI gives feedback
5. Weak area identification: where did you struggle? What should you revise?
6. Company culture brief: what to know about this company before you walk in

**Output artifact:** Interview prep report (private)

**This is the primary ELITE hook. Nothing demonstrates value faster than AI interview practice.**

**FREE:** Locked
**PRO:** Question bank only, no practice session
**ELITE:** Full AI practice session with feedback, company brief, unlimited sessions

---

## 5. LAUNCHPAD REDESIGN

### Job to be done

Help professionals find the right jobs, apply intelligently, and track outcomes — with India-specific intelligence built in.

### What to remove

- Remove any job board that shows listings with no match context
- Remove any "apply" flow that doesn't include application readiness context
- Remove generic search with no salary context

### Tab Structure

---

#### Tab 1: Recommended

**Purpose:** AI-curated job matches based on the user's full profile — not just keyword matching.

**Match logic considers:**
- Role Fit Score against the job's requirements
- Current CTC vs job's offered CTC band
- City preference (remote / hybrid / on-site / specific city)
- Notice period vs job urgency
- Verified skills match vs required skills
- Product vs service company preference
- Company type preference (startup / MNC / enterprise)

**Card design per job:**
- Company name + logo
- Role title + seniority
- Location + work model (remote / hybrid / on-site)
- CTC range (displayed as ₹X–Y LPA)
- Match score: "89% match" with breakdown on hover
- Top 3 matching signals: "Your SIEM experience matches · Verified employment · Location match"
- Missing signals: "Lacks: cloud security certification"
- Posted date + application deadline
- Company type badge: Product / Service / MNC / Startup / Government
- Verified company badge (if verified recruiter posted this)
- [Apply] / [Save] / [See Full Match] buttons

**India-specific fields required on every job card:**
- Expected CTC range (not optional — if not present, flag to recruiter)
- Notice period accepted
- Work location / city
- Whether the company is product or service company

**Empty state:** "No recommendations yet. Complete your profile to at least 60% to unlock personalised job matches."

**FREE:** 3 recommended jobs visible, no match score breakdown
**PRO:** Full feed, match score + breakdown, apply with Pro badge
**ELITE:** Priority application (your application shown first to recruiter), match explanation, AI cover note generation

---

#### Tab 2: Search

**Purpose:** Manual job discovery with smart filters.

**Filters:**
- Role title (with suggestions)
- Seniority level
- City / remote
- CTC range (₹ LPA)
- Company type (product / service / MNC / startup)
- Notice period accepted
- Posted in last: 24h / 7 days / 30 days
- Verified companies only (toggle)
- Actively hiring (toggle)

**No free-text keyword spam.** Filters are structured. This keeps result quality high.

**FREE:** Search available, no salary filter, no company type filter
**PRO:** Full filter set
**ELITE:** Saved search alerts, recruiter-confirmed active listings

---

#### Tab 3: Applied

**Purpose:** Track all applications with status, timeline, and next action.

**Columns:**
- Job title + company
- Applied date
- Application status: Submitted / Viewed / Shortlisted / Interview scheduled / Rejected / Offer / Withdrawn
- Days since last update
- Next action (if any): "Follow up" / "Prepare for interview" / "Respond to offer"
- Match score at time of application

**Empty state:** "No applications yet. Browse Recommended to find your first match."

**FREE:** Track up to 5 applications
**PRO:** Unlimited, status notifications, interview calendar sync
**ELITE:** AI follow-up draft, outcome prediction

---

#### Tab 4: Saved

**Purpose:** Bookmarked jobs. Simple. No intelligence needed here — just a clean list with remove + apply options.

**Show:** Job title, company, saved date, CTC, status (still open / expired / filled), and match score.

**Expiry alerts:** "This job closed 3 days ago" — don't let saved lists fill with dead listings.

**FREE + PRO + ELITE:** Fully available. No gate on saving jobs. Saving is discovery, not a premium action.

---

#### Tab 5: Recruiter Interest

**Purpose:** Show when recruiters have viewed your profile, what they saw, and whether you can respond.

**This is a Pro anchor feature. Convert free users who see "3 recruiters viewed your profile this week" but can't see who.**

**Cards show:**
- "A recruiter from [Company] viewed your profile"
- If Pro: company name, recruiter name (if they opted in), role they're hiring for
- If free: blurred, "Upgrade to see who is interested in your profile"
- Time since view
- [Open to contact] toggle — enable recruiters to message you directly

**FREE:** Count only ("3 recruiter views this week"), no identity
**PRO:** Company name, role context, open-to-contact signal
**ELITE:** Direct recruiter message, guaranteed 48-hour recruiter response SLA for Elite profiles

---

#### Tab 6: Interview Pipeline

**Purpose:** Track active interviews across companies.

**Stages:** Applied → Screening → Technical / Assessment → Panel → Final → Offer / Rejected

**Per company card:**
- Role + company
- Current stage
- Last activity date
- Interviews scheduled (with dates + prep links)
- Offer details (if reached)
- Notes field (private)
- Interview Forge shortcut: "Prepare for your [Company] interview" → opens Interview Forge

**FREE:** Track 2 active pipelines
**PRO:** Unlimited, calendar integration, prep reminders
**ELITE:** AI outcome prediction, interview debrief after each stage

---

## 6. PULSE REDESIGN

### Job to be done

Surface career-relevant signals, market intelligence, and professional insights that are genuinely useful to this specific professional — without becoming a social media noise machine.

### The rule that must be enforced from day one

**Every piece of content in Pulse must pass this filter:** "Does knowing this help this professional make a better career decision, identify an opportunity, or stay current in their field?"

If it doesn't pass: it doesn't appear. Not decorative content, not viral professional motivational posts, not general news.

### Tab Structure

---

#### Tab 1: For You

**Purpose:** Personalised career signal feed. The most useful tab in Pulse.

**Content types (in order of priority):**
1. Hiring signals: companies in your field currently hiring actively
2. Salary movement: "Senior Cyber Security Analyst salaries in Bangalore increased 12% this quarter"
3. Skill demand shifts: "SIEM experience demand up 34% in job postings this month"
4. Company movement: "TCS opened a new Cyber Security CoE in Pune — 80 roles incoming"
5. Your field news: "NHS UK issued new cybersecurity compliance mandate — here's what it means for jobs"
6. Proof-backed posts: "A verified Cyber Security Analyst shared how they closed a ₹6L salary gap" (user-generated, requires verified profile to post)
7. Career transitions: "This security professional returned after a 2-year break and landed ₹20L — here's how"

**Content model:** Each post is structured — not a free-text stream. Structured posts have: headline, one paragraph, data source or author credential, and a relevant action link.

**NOT in For You:** Motivational quotes, generic LinkedIn-style posts, humblebrags, irrelevant company announcements.

**FREE:** 5 posts per day, curated
**PRO:** Full feed, filter controls, alert setup
**ELITE:** Personalised briefing summary — one daily digest card at the top: "Today in your career: 3 signals worth your attention"

---

#### Tab 2: Industry

**Purpose:** Sector-level news and market movement for the professional's specific industry.

**For a Cyber Security professional:**
- CERT-In advisories and new Indian cybersecurity regulations
- New threat landscape signals
- MNC security team expansions in India
- Government cyber policy changes
- Major data breach news (professional context, not tabloid)
- Emerging specialisations: cloud security, OT security, etc.

**Curated, not algorithmic.** Editors + AI choose. This is not a scraper feed.

**FREE:** 3 posts/day
**PRO:** Full feed

---

#### Tab 3: Hiring

**Purpose:** Hiring intelligence — which companies are actively hiring in your field, who is freezing, who just got funded and will hire.

**Cards:**
- Company name + recent hiring activity: "Opened 12 Senior Security roles in last 30 days"
- Hiring trend: expanding / stable / contracting
- Cities where they're hiring
- Role types most open
- Estimated timeline: "Batch hiring expected Q4 2026"
- [Notify me when they post] button

**India-specific:** Include Tier 2 city hiring signals separately — many professionals in Hyderabad, Pune, Chennai want to know when top companies open offices locally.

**FREE:** 3 companies visible
**PRO:** Full list, hiring alerts

---

#### Tab 4: Skills

**Purpose:** Market demand data for skills in the professional's field.

**Not a course marketplace. A market intelligence panel.**

**Content:**
- "Most demanded skills for Cyber Security in India this month — ranked"
- "Skills with fastest-growing demand: OT Security (+67%), Cloud Security (+44%), Zero Trust (+38%)"
- "Skills you have that are high demand: SIEM (+28%), Pen Testing (+19%)"
- "Skills you don't have that are trending: Cloud Security Architecture — consider adding"
- Skill half-life indicator: "Traditional network security skills are declining in demand — consider specialising in cloud or OT"

**Action:** "Add this skill to your profile" / "Find learning resource" — **no forced course upsell. Show the signal. Let the user decide.**

**FREE:** Top 5 skills visible
**PRO:** Full skill demand view, personalised gap analysis

---

#### Tab 5: Companies

**Purpose:** A curated watchlist of companies the professional has saved or that are relevant to their job search.

**Each company card:**
- Company name + type (product/service/MNC/startup)
- Open roles count
- Recent news (funding, expansion, layoffs, policy change)
- Culture signals from verified employee posts (if data available)
- Salary range for your role at this company
- [Follow] / [Set alert]

**Follows from:** Saving a company in Launchpad, or manually following.

**FREE:** 3 company watches
**PRO:** Unlimited, alerts, salary data
**ELITE:** Insider hiring signals, direct recruiter contact when company is actively hiring for your role

---

#### Tab 6: Mentors

**Purpose:** Surface expert perspectives and enable mentor discovery.

**Content types:**
1. Expert posts: verified senior professionals sharing field-specific insights (verified profile badge required)
2. Mentor availability: "3 senior Cyber Security professionals are open to mentoring in your field this month"
3. Career path stories: structured case studies from verified professionals who made transitions relevant to the user

**Mentor matching (ELITE):**
- Browse verified mentors by field, seniority, company background
- Request 1:1 session (async text or 30-min video)
- Structured session agenda (what you want help with, what the mentor needs to know)
- Session summary stored in your profile (private)

**This is not a therapy service or a coffee chat platform. It is structured, time-bounded, goal-oriented mentoring.**

**FREE:** Read expert posts, no mentor contact
**PRO:** Mentor discovery, 1 mentor request per month
**ELITE:** Unlimited mentor sessions, priority matching with senior mentors, mentor-verified endorsement badge

---

## 7. NEXUS REDESIGN

### Job to be done

Help the professional build a trusted professional network that is directly useful to career advancement — not a vanity follower count.

### Critical design principle

**Nexus must solve connection quality, not connection quantity.** The Indian professional networking problem is not "I don't know enough people." It's "I don't know the right people at the right moment."

Nexus should focus on:
1. Recruiter access — who can actually put you in front of an opportunity
2. Peer intelligence — what are people in your role doing, moving to, earning
3. Referral paths — who can refer you into a company you want to join
4. Mentor access — who can give you strategic guidance
5. Alumni signals — where are people from your company/college now

### Tab Structure

---

#### Tab 1: My Network

**Purpose:** View and manage existing connections on Capabilio.

**Connection types:** Recruiter / Peer Professional / Mentor / Alumni / Followed Expert

**Filter by type.** Show last interaction date. Show career relevance ("This person works at a company you've saved in Launchpad").

**Connection card:**
- Name + role + company
- Connection type badge
- Shared context: "You both worked in Cyber Security in London"
- Last interaction
- Quick action: message / view profile / see their open roles (if recruiter)

**FREE:** See network list, no messaging
**PRO:** Direct message, connection request, network analytics ("Your network has 0 senior professionals in Bangalore — here's who to connect with")
**ELITE:** Network strength report, warm introduction requests, recruiter network priority

---

#### Tab 2: Recruiters

**Purpose:** Manage recruiter connections and inbound recruiter interest.

**This is the most commercially valuable tab in Nexus for both users and Capabilio (B2B recruiter side).**

**Sections:**
- Recruiters who viewed you (from Launchpad Recruiter Interest, surfaced here too)
- Recruiters you've connected with
- Verified recruiters active in your field right now
- [Open to work] signal: visible to recruiters, private from your employer

**Recruiter card:**
- Name + company + verified badge
- Recent activity: "Posted 3 Cyber Security roles in the last 2 weeks"
- Fit note: "2 of their active roles match your profile"
- [Connect] / [View roles]

**Open to work (India-specific nuance):** Must be invisible to current employer by default. Make this explicit in the UI. "Your open-to-work signal is visible to recruiters only — not to companies that employ you."

**FREE:** See recruiter count, no identity
**PRO:** Full recruiter list, connect, message
**ELITE:** Priority profile surfacing to verified recruiters in your field, guaranteed response from Capabilio-verified recruiter network

---

#### Tab 3: Mentors

*(Linked to Pulse Mentors — same data, different context)*

Pulse shows mentor content. Nexus shows mentor connections and your personal mentor relationship management.

**FREE:** Browse mentors, no contact
**PRO:** 1 active mentor relationship, structured session flow
**ELITE:** Unlimited mentor relationships, endorsed by mentor badge on profile

---

#### Tab 4: Referrals

**Purpose:** See warm introduction paths into companies you want to join.

**How it works:**
- User saves a target company in Launchpad
- Nexus maps: "2 people in your network work at this company" or "You have a 2nd-degree connection at this company through [person]"
- If direct connection: [Ask for referral] → structured referral request template
- If 2nd degree: shows path through mutual connection

**Referral request flow:**
- Select target role at target company
- Choose connection to ask
- AI drafts a referral request: personalised, professional, brief
- User edits and sends through platform

**This is a powerful Pro feature. Referrals are the most effective job-finding method in India — the product must support it explicitly.**

**FREE:** See if referral paths exist (count only)
**PRO:** See who the paths go through, send referral requests
**ELITE:** Referral response tracker, thank-you follow-up automation, referral outcome tracking

---

#### Tab 5: Alumni

**Purpose:** See where alumni from your companies and university have ended up. Use it to discover new paths and connections.

**Alumni source data:**
- Companies listed in your Career Timeline
- Educational institutions in your profile

**Cards show:**
- Name (if public profile) or anonymised: "A Cyber Security professional from NHS England is now at..."
- Company they moved to
- Role they moved to
- Approximate salary band (if shared)
- "Connect" if they're open to connection

**This is a discovery tool, not a contacts database. Users opt in to alumni visibility in their profile settings.**

**FREE:** See alumni count per company, no identity
**PRO:** Full alumni list, connect
**ELITE:** Alumni career path heatmap — "Ex-NHS England professionals most commonly move to: [list of companies]"

---

## 8. PROFILE REDESIGN

### Job to be done

Make the professional's profile their most powerful career asset — a verified, proof-backed identity page that replaces the resume for recruiters.

### What to remove

- Remove any resume-style "list of keywords" format
- Remove vague summary placeholders
- Remove skill bars with no verification backing
- Remove any gamification elements that reduce credibility (badges for logging in, etc.)

### Profile must be two things simultaneously

1. **For the professional:** a command center they use to manage their public identity
2. **For the recruiter:** a trusted, structured professional record they can act on immediately

### Profile visibility model

| Section | Free Public | Recruiter-only (Pro) | Private |
|---|---|---|---|
| Name + role title | ✓ | ✓ | — |
| Location (city only) | ✓ | ✓ | — |
| Professional summary | ✓ | ✓ | — |
| Career timeline (companies + roles) | ✓ | ✓ | — |
| Employment dates | ✓ | ✓ | — |
| Verified skills | ✓ | ✓ | — |
| Trust score badge | ✓ | ✓ | — |
| Proof vault documents | User controls | User controls | User controls |
| Current CTC | ✗ | Optional (user sets) | Default |
| Expected CTC | ✗ | Optional | Default |
| Notice period | ✗ | Optional | Default |
| Open to work | ✗ | ✓ (if Pro) | — |
| Contact info | ✗ | ✓ (if Pro) | — |
| Portfolio projects | ✓ | ✓ | — |
| Education | ✓ | ✓ | — |
| Certifications | ✓ | ✓ | — |

### Tab Structure

---

#### Tab 1: Overview (public-facing)

**Purpose:** What a recruiter or peer sees when they visit your profile.

**Sections:**
- Header: Name, current role, company, city, trust badge, open-to-work signal (if enabled)
- Professional summary: 3–5 sentences. AI-assisted but user-written and user-approved.
- Quick stats row: Years of experience, verified roles, proof documents, skills assessed
- Featured proof: 1–3 pinned Vault items (project, certificate, or verified outcome)
- Skills overview: top 6 verified skills with assessment status
- Career snapshot: 3 most recent roles (mini timeline)
- Education: degrees only

**Profile completeness indicator** (internal, not shown to visitors):
- Shown to the user in an internal "Edit Profile" view
- "Your profile is 68% complete. Adding a verified proof document would increase recruiter views by an estimated 34%."

**Profile and cover image:**
- Cover image upgrade: free users get default gradient, Pro users can upload custom cover
- Profile photo: free and Pro

---

#### Tab 2: Career & Vault

*(This is where the current Career Timeline + Vault already lives — mapped correctly, keep this tab)*

**Improvements:**
- Sub-navigation within tab: Timeline / Vault / Projects
- Timeline: production-ready (already redesigned in Orbit section — same component reused)
- Vault: file management, visibility controls, link to proof
- Projects: separate section for portfolio/project work, distinct from employment history

**Projects section (separate from experience):**
- Academic projects should NOT be mixed with professional experience — this creates credibility confusion for recruiters
- Projects have: title, description, your role in it, tech/skills used, outcome, link (optional), status (completed/ongoing)
- Projects feed into Proof Strength score
- Projects are distinct from Vault documents — a project is a description, a Vault document is a file

---

#### Tab 3: Skills

**Purpose:** Skill intelligence page — what you know, how well, and how it's verified.

**Sections:**
- Skill radar: visualisation of top skills with scores (already built, keep)
- Skill verification status: assessed via Arena / self-claimed / peer-endorsed / certification-backed
- Skill demand signal: "This skill is currently high demand in your market" (from Pulse data)
- Add skill flow: self-claim → then prompted to verify (Arena task, certification upload, or proof link)

**Rule:** No skill should show as "verified" without one of: Arena score, uploaded certification, or linked Vault proof document.

**FREE:** See skills, add skills, self-claim
**PRO:** Skill demand signals, recruiter-visible skill profile
**ELITE:** Skill gap report vs target role requirements

---

#### Tab 4: Settings

**Purpose:** Profile visibility, recruiter preferences, notification settings, account management.

**Sections:**
- Visibility controls: each section toggle (public / recruiter-only / private)
- Recruiter preferences: open to work, preferred roles, city preferences, CTC expectations
- Notification settings: job alerts, recruiter views, Pulse alerts, Forge reminders
- Resume / LinkedIn sync
- Account: email, password, plan management, data export, account deletion

**This tab is functional infrastructure, not a product showcase. Keep it clean and fast.**

---

## 9. LABEL AND SCORING REDESIGN

### The Problem with Current Labels

"Role ELO", "Market ELO", "Proof ELO", "Mobility ELO" — these are internally logical but professionally unserious. A mid-career professional with 5 years of experience is not going to trust a platform that talks about their career standing with gaming terminology.

The scoring logic underneath can stay the same. The names must change.

### New Scoring System

---

#### Score 1: Role Fit Score
*(replaces Role ELO)*

**One-line definition:** How well your verified skills and experience match what employers in your target role are looking for right now.

**What increases it:**
- Verifying skills relevant to target role
- Adding proof documents that demonstrate target role capabilities
- Completing Arena tasks in target role's skill areas (if student path overlap)
- Having more experience years than the role requires

**What decreases it:**
- Skill gaps between your profile and active job requirements
- Unverified skills in key requirement areas
- Targeting a role 2+ seniority levels above your current profile
- Stale profile (not updated in 90+ days)

**Free or Premium:** Score is free. Breakdown of what's driving it (per-skill analysis) is Pro.

**User action:** "See what's lowering your Role Fit Score →" opens a gap analysis with specific skills to add or verify.

---

#### Score 2: Market Standing
*(replaces Market ELO)*

**One-line definition:** Where your professional profile ranks compared to others in your role, city, and experience band in India's job market right now.

**What increases it:**
- Higher verification level vs peers
- More proof documents vs peers
- Skills that are currently high demand
- Active recruiter interest signals
- Recent career progression (promotion, new role, new company)

**What decreases it:**
- Peers gaining verifications you haven't
- Skills in your profile that are declining in demand
- Profile staleness
- Zero recruiter activity over 90 days

**Free or Premium:** Score is free. Peer comparison breakdown is Pro.

**User action:** "See how you compare to similar profiles →" — opens market comparison panel (Pro).

---

#### Score 3: Proof Strength
*(replaces Proof ELO)*

**One-line definition:** How credible and verifiable your professional claims are — based on what you can actually prove.

**What increases it:**
- Employment verification (UAN/EPFO or letter of reference)
- Degree verification
- Vault documents linked to specific roles
- Certifications uploaded
- Arena assessments completed and linked to profile skills
- Peer endorsements from verified professionals

**What decreases it:**
- All experience entries self-claimed with no verification
- No proof documents in Vault
- Skills listed with no assessment or certification backing
- Long-unverified employment history

**Free or Premium:** Score visible free. Detailed proof gap report is Pro.

**User action:** "Strengthen your proof →" opens Trust Forge.

---

#### Score 4: Career Mobility
*(replaces Mobility ELO)*

**One-line definition:** How ready you are to make a career move — switch roles, change companies, or enter a new market — right now.

**What increases it:**
- High Role Fit Score for at least one target role
- Low notice period (or buyout option)
- Current CTC within expected market band
- Active job applications or saved jobs
- Proof documents ready
- Profile completeness > 80%

**What decreases it:**
- Long notice period (90+ days with no buyout discussion)
- CTC expectations far above market for your profile
- Profile incomplete
- No target role defined
- Large skill gaps vs target role

**Free or Premium:** Score visible free. Mobility plan (what to do to increase this score) is Pro.

**User action:** "Improve your career mobility →" opens Switch Forge or Return Forge based on profile state.

---

### Score Display Rules

- All four scores displayed on Orbit Overview as a row of tiles
- Each tile: score (0–100), plain English label, traffic light, one action link
- Scores update automatically when: profile is updated, verification status changes, market data refreshes (weekly)
- On Profile Overview page: show a single "Profile Strength" composite (average of all four), not all four separately — less overwhelming for recruiter view

---

## 10. PRICING STRATEGY REDESIGN

### Naming

| Old | New |
|---|---|
| Free | Free |
| Orbit Pro | Capabilio Pro |
| Orbit Elite | Capabilio Elite |

Rationale: "Orbit Pro" ties the plan name to a single page, which limits perceived value. "Capabilio Pro" communicates the entire platform.

---

### Free — "Build Your Foundation"

**Who it's for:** New professionals, students transitioning, anyone evaluating the product.

**What stays free (non-negotiable):**
- Complete profile setup
- Career timeline (up to 5 experiences)
- All four career scores (visible, no breakdown)
- 2 Vault documents (private only)
- 3 job recommendations per day (no match detail)
- 5 Pulse posts per day
- 1 Forge action per month (Trust Forge only)
- Basic skill graph
- AI Copilot: 5 messages per month

**What is locked on Free:**
- Compensation intelligence (fully locked, highest conversion point)
- Recruiter identity (count only, no names)
- Match score breakdown
- Full Forge workflows
- AI Interview
- Mentor access
- Full Pulse feed
- Referral paths

**Philosophy:** Free must be good enough that a professional trusts the product. It must not be so good that there's no reason to upgrade.

---

### Capabilio Pro — "Full Career Intelligence"
**Price: ₹499/month or ₹3,999/year (save 33%)**
**Target:** Active professionals considering a switch, evaluating a raise, or rebuilding their professional identity

**What Pro unlocks:**
- Full compensation intelligence (salary bands, city comparison, switch uplift)
- Unlimited career timeline experiences
- Full match score + breakdown on all job recommendations
- Unlimited job applications with Pro badge
- Recruiter identity (who viewed you, company + role context)
- Open-to-work signal (recruiter-visible only)
- Full Pulse feed with alerts and filters
- Full Forge access (all 6 modules except Interview Forge)
- 15 Vault documents with recruiter-visible control
- UAN/EPFO employment verification
- Degree document verification
- Network: recruiter connect, referral paths, 1 mentor request/month
- AI Copilot: 100 messages per month
- Priority application badge on submissions
- Skill demand signals (Pulse Skills tab)

**Annual pricing**: ₹3,999/year = ₹333/month. Position this as the default. Monthly is for commitment-shy users.

---

### Capabilio Elite — "Career Acceleration"
**Price: ₹999/month or ₹7,999/year (save 33%)**
**Target:** Professionals making a serious career move in the next 90 days — switch, return, promotion, or salary negotiation

**What Elite adds on top of Pro:**
- AI Interview Forge (unlimited practice sessions with feedback)
- Mentor Hub: unlimited mentor relationships, session management, mentor-endorsed badge
- Priority job matching: your profile surfaced first to verified recruiters for relevant roles
- Negotiation brief from Comp Forge: full AI-generated negotiation document
- 30-day readiness plans from Readiness tab
- Daily Pulse briefing digest (one AI summary card per morning)
- Advanced career reports: annual career review, market position report, transition plan
- Unlimited Vault documents with public shareable link + download analytics
- Verification fast-track: priority queue for employment and degree verification
- Alumni career path heatmap (Nexus)
- Elite profile badge: visible to recruiters ("Elite Verified Professional")
- AI Copilot: unlimited messages
- Strategic career planning session: 1 AI-led deep strategy session per quarter (guided workflow, not live human)

**What Elite is NOT:**
- Not human career counselling (that's a separate service)
- Not guaranteed job placement
- Not a staffing agency

---

### Annual vs Monthly toggle

Show annual pricing as default with a "Save 33%" badge. Monthly as secondary option. Annual subscribers get 2 months free.

---

### What we are NOT charging professionals for

- Arena task grinding (wrong value proposition for professionals)
- Basic profile creation
- Reading the newsfeed
- Viewing job listings without detailed match

---

## 11. LANDING PAGE PRICING REDESIGN

### Section placement

Pricing section appears after: Hero → Feature highlights → Social proof / trust signals → **Pricing** → FAQs → Final CTA

### Headline

**Primary:** "Your career intelligence, fully unlocked."

**Subheadline:** "Stop guessing your market value. Stop missing recruiter interest. Stop applying blind. Capabilio Pro gives you the tools serious professionals need to make confident career moves."

---

### Plan display layout

Three columns. Pro is visually highlighted (darker background, "Most Popular" badge). Free is left, Elite is right.

---

#### Free column
**Label:** Free  
**Price:** ₹0 / month  
**Subtext:** Always free. No credit card required.  
**CTA:** Get started free  
**Feature highlights (5 max):**
- Career profile with timeline
- Career health scores (4 dimensions)
- 3 job recommendations per day
- 2 Vault documents
- AI Copilot (5 queries/month)

---

#### Pro column ← HIGHLIGHTED
**Label:** Capabilio Pro  
**Badge:** Most Popular  
**Price:** ₹499 / month  
**Annual price:** ₹3,999 / year · Save ₹2,000  
**Subtext:** For active professionals making their next move.  
**CTA:** Start Pro free for 7 days  
**Feature highlights (8 max):**
- ✓ Compensation intelligence — your actual market rate in India
- ✓ Recruiter visibility — see who is interested in your profile
- ✓ Full AI job matching with match score breakdown
- ✓ UAN/EPFO employment verification
- ✓ All 6 Forge career workflows
- ✓ Full newsfeed with hiring and skills intelligence
- ✓ Referral path discovery
- ✓ AI Copilot (100 queries/month)

**Supporting copy (below feature list):**
"Professionals on Pro see 3x more recruiter contact within 60 days. Average salary insight saves ₹2.3L in negotiation outcomes."
*(Use real data once available. Use estimated projections clearly labelled during early stage.)*

---

#### Elite column
**Label:** Capabilio Elite  
**Price:** ₹999 / month  
**Annual price:** ₹7,999 / year · Save ₹3,988  
**Subtext:** For professionals making a serious career move in 90 days.  
**CTA:** Start Elite free for 7 days  
**Feature highlights (6 max):**
- ✓ Everything in Pro
- ✓ AI Interview practice — unlimited sessions with feedback
- ✓ Mentor Hub — connect with senior professionals in your field
- ✓ Priority application — your profile surfaces first to recruiters
- ✓ Negotiation brief — AI-generated salary negotiation document
- ✓ Elite verified badge on your profile

**Supporting copy:**
"Elite users land offers 40% faster than the market average. Built for professionals with a 90-day deadline."
*(Same note: real data once available)*

---

### Positioning rules

- Pro must not look weak next to Elite. Rule: Elite adds AI Interview and Mentor Hub — both are genuinely additive, not things that make Pro look incomplete.
- Free should not look completely useless. Free must clearly show value (profile, timeline, scores) — it drives adoption.
- Annual pricing toggle: shown above the cards. Default: annual. Monthly as secondary. Badge: "Save 33%"

---

### Reassurance copy (below plan cards)

- 🔒 No credit card required for free plan
- 7-day free trial on Pro and Elite — cancel anytime
- No lock-in on monthly plans
- Your data is always yours — export anytime
- Secure payments via Razorpay (Indian payment gateway)

---

### Pricing FAQs (below plan cards)

**Q: Can I switch between plans?**  
A: Yes. Upgrade or downgrade anytime. If you downgrade, you keep Pro features until the end of your billing period.

**Q: Is my career data private?**  
A: By default, yes. You control exactly what recruiters can see and what stays private.

**Q: What is UAN verification? Do I need it?**  
A: UAN is your Universal Account Number from EPFO. Verification through UAN confirms your employment history with Indian employers — it makes your profile significantly more trusted by recruiters. It's optional but recommended.

**Q: Does Capabilio charge recruiters separately?**  
A: Yes. Recruiters pay separately to access the platform. Your Pro subscription does not fund recruiter access — it funds your career intelligence tools.

**Q: Is there a student plan?**  
A: Yes — students get a separate path with different pricing. This page is for the Professional path.

---

## 12. IN-PRODUCT UPSELL AND PAYWALL REDESIGN

### Design rules for all paywalls

1. **Never block core identity.** A professional must always be able to view and edit their profile.
2. **Show the value before the gate.** Every locked card shows a blurred or summarised version of what's behind it — not a blank card.
3. **One upgrade CTA per page maximum.** Don't scatter upgrade buttons everywhere.
4. **Use outcome-oriented copy, not feature-oriented copy.** "See your market rate" not "Unlock compensation module".
5. **Never use the word "Premium" in a locked state.** It sounds cheap. Use "Pro" or "Elite".
6. **Paywall cards must not break the page layout.** They must slot in where the real card would appear, with the same dimensions.

---

### Orbit Paywalls

**Compensation tab (entire tab locked for Free):**
Card shows: blurred salary range background with text overlay.
Copy: "Your market rate in [City] for [Role]: **Upgrade to see** — active professionals use this to negotiate ₹2–5L more."
CTA: [See my market rate → Capabilio Pro]
Trigger: User clicks Compensation tab.
Why here: Highest intent moment. User came to this tab specifically to understand salary.

**Priority Actions card (Free sees 1 of 3):**
Under the 2 hidden actions: "2 more priority actions hidden. Your biggest career risk might be in one of them."
CTA: [See all actions → Capabilio Pro]

**Readiness tab — 30-day plan section:**
Shows a blurred plan card with: "Your 30-day plan to be interview-ready for [Target Role] is ready."
CTA: [Unlock your plan → Capabilio Elite]

---

### Forge Paywalls

**Comp Forge, Interview Forge — locked for Free:**
Module card in the Forge home screen shows: greyed-out card with a lock icon.
Copy: "Comp Forge — Prepare for salary negotiation with data-backed arguments. Available on Capabilio Pro."
CTA: [Upgrade to access]

**Interview Forge — locked for Pro:**
Module card shows: purple/elite accent, lock icon.
Copy: "Interview Forge — AI-led practice sessions with feedback. Unlimited access on Capabilio Elite."
CTA: [Upgrade to Elite]

**Inline upsell within Switch Forge (step 3 — market read):**
Shows estimated number of open roles but blurs the company names and salary ranges.
Copy: "43 active openings for your target role in Bangalore. Salary range and company details visible on Pro."
CTA: [See full market read]

---

### Launchpad Paywalls

**Job match score breakdown (Free sees score only, not breakdown):**
Below the match score number: "Based on 7 factors. [See what's matching and what's missing → Pro]"

**Recruiter Interest tab — identity gate:**
Shows a count card: "3 recruiters from tech companies viewed your profile this week"
Below: A blurred section with recruiter card shapes
Copy: "You have recruiter interest. They can see your profile — can you see them?"
CTA: [See who's interested → Pro] — converts reliably because urgency is real

**Priority application upsell (inline, not a gate):**
On the Apply button for a Pro user applying to a competitive role:
"Want your application to appear first? [Apply with Priority → Elite]" — secondary option, not forced.

---

### Pulse Paywalls

**For You feed (Free sees 5 posts, then gate):**
After 5th post: soft gate card
"You're seeing 5 of 34 signals in your career feed today. Pro members see everything."
CTA: [Unlock full feed → Pro]

**Elite daily briefing digest (locked for Pro):**
At the top of For You tab: card with blurred content
"Your career briefing for today — 3 signals worth your attention"
Copy: "Elite members get a personalised daily summary. See yours."
CTA: [Unlock daily briefing → Elite]

---

### Nexus Paywalls

**Recruiter tab — identity gate:**
Same logic as Launchpad Recruiter Interest. Show count, blur identity.

**Referral paths — Pro gate:**
"You have a 2nd-degree connection at [Company] through someone in your network."
Shows blurred path diagram.
CTA: [See your referral path → Pro]

**Mentor access — Pro/Elite gate:**
Mentor discovery is Pro (browse). Mentor session booking is Elite.
Inline: "1 mentor in [Field] is available for a session this month." CTA: [Request a session → Elite]

---

### Profile Paywalls

**Recruiter-visible CTC/notice period controls:**
In Profile Settings, these fields are visible but locked:
"Recruiters can't see your expectations yet. Enable recruiter-visible profile → Pro"

**Cover image upload:**
Free: default gradient, "Customise your cover image → Pro" link below
Pro: upload enabled

**Vault document visibility — recruiter mode:**
Free Vault shows visibility toggles but recruiter-visible is locked.
"Control what recruiters see in your Vault. Available on Pro."

---

## 13. FINAL FEATURE MATRIX

| Feature | Free | Pro | Elite |
|---|---|---|---|
| **ORBIT** | | | |
| Career health scores (4 tiles) | ✓ visible | ✓ + breakdown | ✓ + AI insight |
| Priority actions | 1 of 3 | 3 of 3 | + AI-ranked |
| Career Timeline | Up to 5 entries | Unlimited | Unlimited |
| Employment gap analysis | — | ✓ | ✓ |
| Proof Vault | 2 docs, private | 15 docs, recruiter-visible | Unlimited, public link |
| Vault analytics (views, downloads) | — | — | ✓ |
| Compensation intelligence | — | ✓ Full | ✓ + negotiation kit |
| City salary comparison | — | ✓ | ✓ |
| Switch uplift estimate | — | ✓ | ✓ |
| Notice period impact analysis | — | ✓ | ✓ |
| UAN/EPFO verification | — | ✓ | ✓ + fast-track |
| Degree verification | — | ✓ | ✓ + fast-track |
| Readiness score | ✓ (1 role) | ✓ (3 roles) | Unlimited |
| 30-day readiness plan | — | — | ✓ |
| Week-in-review stats | Limited | Full | Full |
| **FORGE** | | | |
| Trust Forge | 1/month | Unlimited | Unlimited |
| Proof Forge | — | Unlimited | Unlimited |
| Switch Forge | Step 1 only | Full | Full + AI strategy |
| Comp Forge | — | Full | + AI negotiation kit |
| Return Forge | — | Full | Full + targeted jobs |
| Promotion Forge | — | Full | + benchmarking |
| Interview Forge | — | Question bank only | Full AI practice |
| **LAUNCHPAD** | | | |
| Job recommendations | 3/day | Unlimited | Unlimited + priority |
| Match score visible | Score only | Score + breakdown | Score + breakdown |
| Priority application badge | — | ✓ | ✓ first-in-queue |
| Salary filter in search | — | ✓ | ✓ |
| Company type filter | — | ✓ | ✓ |
| Recruiter interest — identity | Count only | Full name + company | + direct message |
| Application tracking | 5 apps | Unlimited | + AI debrief |
| Saved job alerts | — | ✓ | ✓ |
| Job alert automation | — | ✓ | ✓ with AI priority |
| Interview pipeline | 2 active | Unlimited | + AI outcome prediction |
| **PULSE** | | | |
| For You feed | 5 posts/day | Full | Full + daily briefing |
| Industry tab | 3 posts/day | Full | Full |
| Hiring tab | 3 companies | Full | + insider signals |
| Skills demand tab | Top 5 only | Full | Full |
| Companies watchlist | 3 companies | Unlimited | + salary data |
| Mentors tab — read | ✓ | ✓ | ✓ |
| Feed alerts / notifications | — | ✓ | ✓ |
| Daily career briefing (AI digest) | — | — | ✓ |
| **NEXUS** | | | |
| Network list | ✓ | ✓ | ✓ |
| Direct messaging | — | ✓ | ✓ |
| Recruiter identity | Count only | Full | Full + priority surfacing |
| Open to work signal | — | ✓ | ✓ |
| Referral path discovery | Count only | Full path | Full + warm intro |
| Referral request tool | — | ✓ | ✓ |
| Mentor browse | ✓ | ✓ | ✓ |
| Mentor session booking | — | 1/month | Unlimited |
| Mentor-endorsed badge | — | — | ✓ |
| Alumni map | Count only | Full list | + career path heatmap |
| Network strength analytics | — | ✓ | ✓ |
| **PROFILE** | | | |
| Profile completeness | ✓ | ✓ | ✓ |
| Professional summary | ✓ | ✓ | ✓ |
| Career timeline | ✓ | ✓ | ✓ |
| Projects section | ✓ | ✓ | ✓ |
| Skills radar | ✓ | ✓ | ✓ |
| Skills demand signal | — | ✓ | ✓ |
| Trust badge | ✓ | ✓ + verified | ✓ Elite badge |
| Proof Strength score | ✓ | ✓ | ✓ |
| Cover image upload | — | ✓ | ✓ |
| Recruiter-visible sections | — | User controls | User controls |
| CTC / notice period — recruiter visible | — | Optional | Optional |
| Portfolio / featured proof | ✓ | ✓ | ✓ |
| Public shareable profile link | ✓ | ✓ | ✓ |
| Profile analytics (who viewed) | Limited | Full | Full |
| **AI COPILOT** | | | |
| AI Copilot access | 5 queries/month | 100 queries/month | Unlimited |
| AI Copilot depth | Basic | Standard | Deep + strategic |
| **OTHER** | | | |
| AI Interview practice | — | Question bank | Unlimited sessions |
| Mentor Hub | — | 1 session/month | Unlimited |
| Priority recruiter surfacing | — | — | ✓ |
| Quarterly AI strategy session | — | — | ✓ |
| Annual career review report | — | — | ✓ |
| Data export | ✓ | ✓ | ✓ |
| 7-day free trial | — | ✓ | ✓ |

---

## 14. INDIA-SPECIFIC PRODUCT ADAPTATION

These are not optional additions. These are requirements for the product to be useful to Indian professionals.

### 1. UAN / EPFO Employment Verification

**What it is:** Universal Account Number — India's EPFO (Employees' Provident Fund Organisation) record for every formal employee. It proves dates of employment and employer name.

**Where it appears:** Orbit → Verification tab → "Verify this employment entry" flow. Also surfaces in Trust Forge.

**Implementation:** User enters UAN. Backend queries EPFO public API (or asks user to download and upload EPFO passbook). System cross-references employer name and employment dates against what's in their Timeline.

**Edge cases:**
- Not all Indian employers contribute to EPFO (small companies, contract roles) — fallback to letter upload
- Government employees have different verification (Form 16, service book) — support this
- International employment (NHS England) — fallback to offer letter / relieving letter upload or email domain verification

**Recruiter impact:** Indian recruiters consider EPFO-verified profiles significantly more credible. Make this benefit explicit in the UI copy.

---

### 2. Notice Period Intelligence

**Where it appears:** Orbit → Compensation tab. Launchpad — job cards and application flow. Switch Forge.

**India context:** 30/60/90-day notice periods are standard in India. Many companies (especially large IT) enforce 3-month notice. This actively reduces the candidate's ability to take fast opportunities.

**Product actions:**
- Show notice period impact on recruiter shortlisting: "Your 90-day notice reduces shortlist rate by 31% at startups"
- Show notice period buyout intelligence: "Companies in your field offering buyout to ₹X lakh"
- Show timeline calculator: "If you resign today, your last day would be [date]"
- In Launchpad job cards: show "Notice: 30 days accepted" or "Immediate joining preferred" as a filter and card attribute

---

### 3. CTC Intelligence (Current + Expected)

**India context:** Indian job market is highly CTC-transparent — candidates and recruiters both share CTC expectations early. The product must reflect this reality, not pretend it doesn't exist.

**Where it appears:** Orbit → Compensation tab. Launchpad → job match algorithm. Profile → recruiter-visible settings. Switch Forge.

**Fields required:**
- Current CTC (annual, in LPA — lakhs per annum)
- Expected CTC (range, in LPA)
- Variable/bonus component (optional)
- City (salary varies dramatically by city in India)

**Privacy:** Current CTC is never public. Never shown in profile to non-recruiters. User decides if recruiters can see it.

**Product use:** Current CTC feeds into compensation intelligence. Expected CTC feeds into job matching (don't show jobs 50% below expectation). Both feed into switch uplift calculation.

---

### 4. Product Company vs Service Company

**India context:** This is one of the most significant career identity questions in Indian tech. "Product company" (Flipkart, Razorpay, Zomato, Google India) vs "service company" (Infosys, TCS, Wipro) carries significant salary, culture, and career velocity differences.

**Where it appears:** Launchpad filters. Orbit → Compensation (different salary bands). Switch Forge (product vs service switch path). Pulse → Companies.

**Product action:** Every job card shows product/service/MNC/startup badge. Every company in Nexus and Pulse is tagged. Salary benchmarks are split by company type.

---

### 5. City-Based Opportunity Mapping

**India context:** Job markets are dramatically different across cities. Bangalore, Hyderabad, Pune are tier-1 tech hubs. Mumbai for finance. Delhi/NCR for enterprise. Tier-2 cities growing but with different salary bands.

**Where it appears:** Orbit → Compensation (city salary comparison). Launchpad → city filter is not optional, it's prominent. Pulse → Hiring tab shows city-level hiring signals. Switch Forge → city comparison in switch plan.

**Implementation:** Every job, every salary data point, every market trend is tagged with city. User sets preferred city in profile. Match algorithm weights city preference heavily.

**Tier-2 city support:** Don't treat tier-2 as an afterthought. Hyderabad, Pune, Chennai, Kolkata, Ahmedabad professionals are a significant addressable market. Separate salary benchmarks and hiring signals for tier-2.

---

### 6. Return-to-Work After Break

**India context:** Career breaks are common in India — especially for women (parental, relocating for spouse's job), professionals returning from abroad, or those who took a break for UPSC/GATE preparation.

**Product action:** Return Forge module is India-first in design. Must handle:
- Parental break (explain without stigma)
- Relocation from abroad (returning NRI — different positioning)
- Education break (PG degree, MBA, professional certification)
- Personal/health break (handled with maximum dignity and privacy)
- UPSC/competitive exam preparation break

The platform must never make career breaks feel like a liability. The Return Forge frames them as a defined chapter.

---

### 7. English Simplicity

**India context:** The product serves professionals across a wide English proficiency range. IIT/IIM graduates at one end, tier-2 college professionals at the other.

**Design rule:** All product copy must be readable at a 10th standard English level without losing professional credibility.

**Specific rules:**
- No jargon without inline explanation
- Score names must be plain English (already redesigned above)
- Error messages must say what went wrong and what to do, not just "Something went wrong"
- Empty states must guide the user with a clear next action
- AI-generated text shown to users must be reviewed for plain-English compliance

---

### 8. Mobile-First Practicality

**India context:** A significant portion of the Indian professional audience accesses career tools on mobile, especially for initial discovery, feed reading, and job browsing.

**Priority for mobile:**
- Orbit Overview: must be fully usable on mobile without horizontal scroll
- Launchpad: job cards must be swipeable, filters collapsible
- Pulse: feed must render fast on mobile data connections (lazy load)
- Profile: editing must be possible on mobile — don't lock editing to desktop

**Do not do:**
- Dense data tables that require desktop
- Horizontal scroll on core content
- Hover-only states for important information

---

## 15. PRIORITISED IMPLEMENTATION PLAN

### Priority framework

- **P0:** Core experience. Without this, the product doesn't work.
- **P1:** Primary conversion drivers. Directly drives Pro upgrades.
- **P2:** Retention and depth. Makes the product sticky.
- **P3:** Elite tier enablers. Required for Elite pricing to be credible.

---

### P0 — Foundation (Weeks 1–4)

1. **Score system rename** — Replace all instances of Role ELO / Market ELO / Proof ELO / Mobility ELO with new names in UI. Backend label change only, scoring logic stays.
2. **Fix experience skills per role** — Already in progress (backend `_toExp` fix + CareerTimeline display cap). Deploy and validate.
3. **Profile visibility model** — Implement public / recruiter-only / private toggle per section. This is the base for all Pro features.
4. **Career health panel (Orbit Overview)** — Four score tiles with traffic lights and one-action links. Replaces whatever is currently shown at top of Orbit.
5. **Priority actions card** — Rule-based engine: 3 maximum, ranked by impact, actionable CTAs.
6. **India-required fields on experiences** — Notice period, CTC fields, city — all private by default.

---

### P1 — Conversion Drivers (Weeks 5–10)

1. **Compensation tab (Orbit)** — Full locked state for Free, full view for Pro. This is the single highest-ROI upgrade trigger.
2. **Recruiter Identity gate (Launchpad + Nexus)** — Count for free, identity for Pro. Second highest-ROI upgrade trigger.
3. **Match score breakdown (Launchpad)** — Score visible free, breakdown Pro.
4. **Landing page pricing section redesign** — New copy, layout, annual/monthly toggle, FAQ section.
5. **Paywall cards** — Implement locked card design system (consistent across all gates).
6. **Forge home screen** — Module cards with status, time estimate, lock state.
7. **Trust Forge** — First forge module to ship: profile audit + UAN verification flow.

---

### P2 — Retention and Depth (Weeks 11–18)

1. **Pulse curation engine** — Content tagging, filter system, daily feed curation rules. Ship For You + Industry + Hiring tabs first.
2. **Switch Forge + Comp Forge** — Second and third most-requested forge workflows.
3. **Nexus — Recruiter tab + Referral paths** — Recruiter identity cards + referral path discovery.
4. **Verification tab (Orbit)** — Trust score composite, verification checklist, UAN verification flow (backend + UI).
5. **Launchpad — city / CTC / company type filters** — India-specific filters, not optional.
6. **Proof Vault — recruiter visibility controls** — Visibility toggles, recruiter preview mode.
7. **Readiness tab (Orbit)** — Target role selector + role-fit gap analysis.

---

### P3 — Elite Tier (Weeks 19–26)

1. **Interview Forge** — AI interview practice with feedback. This is the Elite anchor.
2. **Mentor Hub (Nexus + Pulse)** — Mentor discovery, session booking, session management.
3. **Comp Forge — negotiation brief** — AI-generated negotiation document.
4. **30-day readiness plan** — AI workflow linked to Readiness tab.
5. **Daily career briefing digest** — AI-generated Pulse summary card.
6. **Return Forge** — Full return-to-work workflow.
7. **Promotion Forge** — Internal promotion brief workflow.
8. **Alumni career path heatmap (Nexus)** — Visualise where professionals from your companies/college end up.
9. **Annual career review report** — End-of-year AI-generated career report for Elite users.

---

### What to remove immediately (not in backlog, not in roadmap)

- Arena task prompts inside Professional Path — wrong frame, removes credibility
- Abstract animated ELO ring displays — replace with score tiles (P0 fix)
- Generic "build your skills" CTAs that point to student path features
- Any student-path onboarding copy that appears in the Professional path
- Random profile badges for engagement (logging in streaks, etc.) — these undermine professional credibility
- Free-text keyword tags on experience cards with no limit — already fixed in code

---

### Metrics to track per phase

**P0 Phase metrics:**
- Profile completion rate (target: 70% of users reach 60%+ completion)
- Time to first verification action

**P1 Phase metrics:**
- Free → Pro conversion rate (target: 8–12%)
- Compensation tab views per session
- Recruiter interest tab clicks (locked state)

**P2 Phase metrics:**
- Daily active use rate (target: 3x/week for Pro users)
- Pulse posts per session
- Forge module start rate

**P3 Phase metrics:**
- Free → Elite conversion rate (target: 2–4% of free, 15–20% of Pro)
- Interview Forge session completion rate
- Mentor session booking rate

---

*End of document — Version 1.0*

*Next document: Component specification for Orbit Overview and Launchpad card system — ready for engineering handoff.*
