# Capabilio Career Timeline Architecture
## Complete Product Specification

**Version:** 1.0  
**Status:** Approved for Implementation  
**Scope:** Timeline data model, UI structure, onboarding flow, portfolio classification, verification system

---

## 0. Core Philosophy

Capabilio is a skill-first, resume-free career OS. The career timeline is not a
resume. It is a **structured proof history** — every item classified by source,
verified by evidence, and displayed with honest context.

**The three non-negotiable rules:**
1. College projects never appear inside Professional Experience.
2. Arena challenges never claim to be employment.
3. Self-claimed items are always visually distinct from verified ones.

Recruiters who view a Capabilio portfolio can trust the provenance of every item
because the system enforces honest classification from the moment of entry.

---

## 1. The Seven Timeline Tracks

| # | Track | Source Type | Honest Label |
|---|-------|-------------|--------------|
| 1 | Education | Institutional | "Studied at" |
| 2 | Academic Projects | Student work | "Built during studies" |
| 3 | Internships | Role-based, time-limited | "Interned at" |
| 4 | Professional Experience | Employment | "Worked at" |
| 5 | Personal Projects | Self-initiated | "Built independently" |
| 6 | Arena / Challenge Proof | Capabilio-native | "Verified challenge" |
| 7 | Verified Skills & Certifications | Assessment / Badge | "Certified / Assessed" |

These tracks are never merged in display. They render as distinct sections with
different visual treatments, labels, and verification requirements.

---

## 2. Track Definitions

---

### Track 1 — Education

**What belongs here:**
- Undergraduate and postgraduate degrees (B.Tech, MBA, MSc, etc.)
- Diploma and polytechnic programs
- Bootcamps and intensive programs (8+ weeks, structured curriculum)
- MOOCs from accredited platforms (Coursera, edX, NPTEL) — with certificate

**What does NOT belong here:**
- YouTube tutorials or self-study without certificate
- Short online courses < 4 weeks
- Project work (goes to Academic Projects)

**Fields:**
```
institution_name     — required
degree / program     — required
field_of_study       — required
start_date           — required
end_date             — required (or "Present")
grade / CGPA         — optional
description          — optional, max 280 chars
proof_link           — marksheet / degree cert URL or upload
verification_level   — V0 (self-claimed) to V2 (document upload)
visibility           — public | recruiter | private
```

**Verification rules:**
- V0: Entered manually, no document
- V1: Degree certificate or marksheet uploaded
- V2: LinkedIn education section linked (cross-verified)

**Aura Dashboard impact:** ✅ Yes  
- Active study: +8 pts (recency bonus for students)
- Completed degree: +12 pts, weighted by institution tier (configurable)
- Verified > unverified: +4 pts premium

**Portfolio display:** ✅ Public + Recruiter  
Shown in "Education" section. Never in Professional Experience.

**UI badge:** `🎓 Education` — Slate blue, serif institution name

---

### Track 2 — Academic Projects

**What belongs here:**
- Final year projects / capstone projects
- Semester projects submitted for academic credit
- Research papers or thesis work
- Hackathon projects built while a student (labeled as hackathon)
- Lab assignments that became real projects

**What does NOT belong here:**
- Any project with a paid client (→ Personal Projects / Freelance)
- Open source contributions maintained post-graduation (→ Personal Projects)
- Projects built as part of an internship (→ Internship track)

**Fields:**
```
title                — required
institution          — required (must match an Education entry)
course / subject     — optional
team_size            — optional (solo / 2-4 / 5+)
role_in_team         — optional
start_date           — required
end_date             — required or "Ongoing"
description          — required, max 500 chars
tech_stack[]         — required
github_url           — optional
live_url             — optional
demo_video_url       — optional
grade_received       — optional
proof_type           — [github_commit, demo_video, report_pdf, live_url, none]
verification_level   — V0–V2
visibility           — public | recruiter | private
impact_summary       — optional ("Scored 95/100", "2000 GitHub stars", etc.)
tags[]               — optional
```

**Verification rules:**
- V0: Self-described, no proof
- V1: GitHub repo link or demo video attached
- V2: Course grade documented OR institution confirms via email

**Aura Dashboard impact:** ✅ Yes (weighted lower than professional experience)
- Each project: +5 pts base
- With GitHub proof: +3 pts bonus
- With live demo: +2 pts bonus
- Cap: 25 pts total from this track (prevents gaming)

**Portfolio display:** ✅ Public + Recruiter  
Shown under a clearly labeled "Academic Projects" section.  
Recruiter view shows: title, institution, tech stack, proof links.  
**Never shown under "Work Experience" or "Projects" without category label.**

**UI badge:** `📚 Academic` — Indigo badge, "During [institution]" sub-label

---

### Track 3 — Internships

**What belongs here:**
- Paid or unpaid internships at companies
- Externships and co-op programs
- Research internships (IISER, ISRO, startup lab, etc.)
- Remote internships with verifiable company

**What does NOT belong here:**
- Freelance work with one client (→ Personal Projects)
- Full-time employment, even short duration (→ Professional Experience)
- College lab assistant roles (→ Academic Projects)

**Fields:**
```
company_name         — required
company_domain       — optional (verified via email domain)
role / designation   — required
team / department    — optional
start_date           — required
end_date             — required
duration_months      — computed
location             — optional (Remote / City, Country)
stipend_type         — [paid, unpaid, prefer_not_to_say]
description          — required, max 500 chars
skills_used[]        — required
proof_type           — [offer_letter, completion_cert, linkedin, email_domain, none]
proof_links[]        — optional
verification_level   — V0–V3
impact_summary       — optional ("Shipped feature used by 10k users")
visibility           — public | recruiter | private
tags[]               — optional
```

**Verification rules:**
- V0: Self-entered only
- V1: Offer letter or completion certificate uploaded
- V2: LinkedIn work history cross-references this entry
- V3: Company email (.company.com) confirmed via OTP during onboarding

**Aura Dashboard impact:** ✅ Yes (medium weight)
- Each internship: +10 pts base
- Verified (V2+): +5 pts bonus
- Duration > 3 months: +4 pts
- Cap: 40 pts total from this track

**Portfolio display:** ✅ Public + Recruiter  
Shown under "Internships" — never merged with Professional Experience.  
Label always says "Internship" to preserve honesty.

**UI badge:** `🏢 Internship` — Teal, company logo if available, duration pill

---

### Track 4 — Professional Experience

**What belongs here:**
- Full-time employment (FTE)
- Part-time employment with defined role and company
- Contract work with a single employer (not freelance)
- Consulting engagements with defined SOW and company

**What does NOT belong here:**
- Internships (→ Track 3)
- Freelance projects with multiple clients (→ Personal Projects)
- College work or assistantships (→ Academic Projects)

**Fields:**
```
company_name         — required
company_domain       — optional
role / designation   — required
seniority_level      — [IC, Senior, Lead, Staff, Principal, Manager, Director, VP, C-Suite]
team / department    — optional
employment_type      — [full_time, part_time, contract, consulting]
start_date           — required
end_date             — required or "Present"
location             — optional
description          — required, max 800 chars
responsibilities[]   — optional, max 5 bullets
achievements[]       — optional, max 5 bullets
skills_used[]        — required
proof_type           — [offer_letter, payslip, linkedin, company_email, reference, none]
proof_links[]        — optional
verification_level   — V0–V4
impact_summary       — optional
visibility           — public | recruiter | private
tags[]               — optional
is_current           — boolean
```

**Verification rules:**
- V0: Self-entered only (shown with ⚠ Self-claimed label)
- V1: LinkedIn work history linked (most common)
- V2: Company email OTP verified
- V3: Offer letter or payslip uploaded
- V4: Reference contact added AND confirms via Capabilio link

**Aura Dashboard impact:** ✅ Yes (highest weight in Authority path)
- Each role: +15 pts base
- Verified V2+: +8 pts bonus
- YOE contribution: +2 pts per year (cap 20 pts)
- Current role: +5 pts recency bonus

**Portfolio display:** ✅ Public + Recruiter (can be set private per role)  
Primary section for professionals. Shows company, role, duration, skills, achievements.  
Verified items get a "✓ Verified" badge.

**UI badge:** `💼 Experience` — Dark green/navy, company logo, seniority chip

---

### Track 5 — Personal Projects

**What belongs here:**
- Side projects and passion projects (any stage: idea / WIP / shipped)
- Open source contributions (maintainer, contributor, creator)
- Freelance work for multiple clients or self-initiated
- Products launched independently (SaaS, mobile app, tools)
- Hackathon projects built post-graduation or independently

**What does NOT belong here:**
- Projects built for academic credit (→ Academic Projects)
- Projects built during employment without personal ownership (→ Professional)

**Sub-types:**
```
personal_project | freelance | open_source | product | hackathon | research
```

**Fields:**
```
title                — required
sub_type             — required (from above)
status               — [idea, in_progress, shipped, archived, maintained]
start_date           — required
end_date             — optional (null = ongoing)
description          — required, max 600 chars
tech_stack[]         — required
github_url           — optional
live_url             — optional
product_url          — optional
app_store_url        — optional
play_store_url       — optional
impact_summary       — optional ("1.2k GitHub stars", "500 paying customers")
proof_links[]        — optional
verification_level   — V0–V2
visibility           — public | recruiter | private
tags[]               — optional
client_name          — for freelance only (optional, anonymizable)
```

**Verification rules:**
- V0: Description only
- V1: GitHub commits or live URL prove it exists
- V2: GitHub stars / downloads / revenue screenshots uploaded

**Aura Dashboard impact:** ✅ Yes (moderate weight)
- Each project: +7 pts base
- Shipped / live: +4 pts bonus
- Open source with stars: +1 pt per 100 stars (cap 10 pts)
- Cap: 35 pts total from this track

**Portfolio display:** ✅ Public + Recruiter  
Labeled as "Personal Projects" or sub-type label ("Open Source", "Products").  
Never shown as Employment.

**UI badge:** `⚡ Project` — Violet/orange by sub-type, status chip (🚀 Shipped, 🔨 WIP)

---

### Track 6 — Arena / Challenge Proof

**What belongs here:**
- All Capabilio Arena challenges completed
- Interview practice sessions (graded)
- Domain-specific skill challenges
- Mock assessments and scored tests

**What does NOT belong here:**
- External assessments (HackerRank, LeetCode) — those go to Track 7
- Self-rated skill claims — those go to Track 7

**Fields:**
```
challenge_id         — internal (auto-populated)
title                — auto-populated from Arena
difficulty           — [Easy, Medium, Hard, Expert]
domain               — auto-populated (DSA, Frontend, Backend, etc.)
score                — 0–100
grade                — A+, A, B+, B, C, D
elo_delta            — ELO change from this challenge
attempt_number       — which attempt (1st, 2nd, etc.)
completed_at         — auto-populated
feedback             — AI feedback auto-populated
verification_level   — V3 (always — Capabilio-native proof)
visibility           — public | recruiter | private
```

**Verification rules:**
- Always V3 — Capabilio-native, platform-signed, cannot be fabricated.
- The platform owns the verification chain for these items.

**Aura Dashboard impact:** ✅ Yes (highest weight per item)
- Each challenge: ELO delta applied directly
- Score ≥ 80: +8 pts to Aura
- Score 60–79: +4 pts
- Score < 60: +1 pt (participation)
- Hard/Expert bonus: +3 pts
- Cap: No hard cap — Arena is the primary proof engine

**Portfolio display:** ✅ Public + Recruiter  
Shown in "Arena Proof" section. Each card shows challenge title, difficulty, score, ELO delta.  
Expandable to show scenario, solution, AI feedback.  
This is Capabilio's unique differentiator — no other portfolio platform has this.

**UI badge:** `⚔️ Arena` — Blue gradient, difficulty chip, score ring, "Capabilio Verified" seal

---

### Track 7 — Verified Skills & Certifications

**What belongs here:**
- Industry certifications (AWS, GCP, CKA, PMP, CISSP, etc.)
- Platform badges (Google, Microsoft, Meta, Coursera certificates)
- External assessment results (HackerRank, Codility, TestGorilla)
- Language proficiency tests (IELTS, TOEFL, GRE, etc.)
- Skill endorsements from employers (not peer endorsements)

**What does NOT belong here:**
- Self-rated skill scores without any backing proof
- Linkedin skill endorsements from peers (too noisy, not honest)

**Fields:**
```
title                — required
issuer               — required (AWS, Google, Coursera, etc.)
category             — [cloud, security, frontend, backend, data, design, pm, language, other]
issued_date          — required
expiry_date          — optional
credential_id        — optional
credential_url       — optional (auto-verifiable URL)
score                — optional (e.g., IELTS 7.5)
proof_type           — [url, certificate_pdf, badge_url, screenshot]
proof_link           — optional
verification_level   — V0–V3
visibility           — public | recruiter | private
is_featured          — boolean (show prominently on portfolio)
```

**Verification rules:**
- V0: Self-claimed, no document
- V1: Certificate PDF or screenshot uploaded
- V2: Credential URL that Capabilio can auto-verify (Credly, Badgr, Accredible)
- V3: Auto-verified via issuer API (where available — AWS, Google Cloud)

**Aura Dashboard impact:** ✅ Yes
- Featured cert: +10 pts
- Verified V2+ cert: +6 pts
- Non-featured: +3 pts
- Cap: 30 pts total from this track

**Portfolio display:** ✅ Public + Recruiter  
Shown as a certification wall / badge grid. Verified items glow. Expired items shown in muted style.

**UI badge:** `🏅 Certified` — Gold for verified, gray for self-claimed. Issuer logo where available.

---

## 3. Verification Level System

| Level | Code | Label | Visual | Proof Required |
|-------|------|-------|--------|----------------|
| 0 | V0 | Self-claimed | ⚠ Gray outline | None |
| 1 | V1 | Artifact-backed | 📎 Blue badge | File upload or URL |
| 2 | V2 | Externally linked | 🔗 Teal badge | LinkedIn / GitHub / live URL |
| 3 | V3 | Platform-verified | ✓ Green seal | Capabilio-native or issuer API |
| 4 | V4 | Reference-confirmed | ⭐ Gold seal | Human reference confirmed |

**Display rule:** V3 and V4 items render with full visual weight.
V0 items always show the "Self-claimed" disclaimer. This is non-negotiable and cannot be hidden by users.

**Proof upgrade path:** Any item can move from V0 → V4 as the user adds evidence.
The system prompts users to upgrade proof when they add a new timeline item.

---

## 4. Data Schema (per timeline item)

```typescript
interface TimelineItem {
  // Identity
  id:                string            // UUID
  user_id:           string            // FK → profiles.id
  category:          TimelineCategory  // one of the 7 tracks

  // Core content
  title:             string            // required
  role:              string | null     // job title, student role, etc.
  sub_type:          string | null     // freelance | internship | open_source | etc.
  domain:            string | null     // frontend | backend | data | design | etc.
  institution:       string | null     // school/university name
  company:           string | null     // employer/client name
  company_domain:    string | null     // for email verification (e.g. "google.com")

  // Timeline
  start_date:        string            // ISO date
  end_date:          string | null     // null = "Present"
  is_current:        boolean

  // Proof
  proof_links:       ProofLink[]       // [{type, url, label}]
  verification_level:number            // 0–4
  verified_at:       string | null
  verifier_source:   string | null     // "linkedin" | "github" | "email_otp" | "capabilio"

  // Content
  description:       string | null     // max 800 chars
  impact_summary:    string | null     // key outcome or metric
  responsibilities:  string[]          // max 5 items
  achievements:      string[]          // max 5 items
  tech_stack:        string[]
  tags:              string[]

  // Visibility
  visibility:        "public" | "recruiter" | "private"
  is_highlighted:    boolean           // pinned to top of section
  is_featured:       boolean           // appears in portfolio hero

  // Aura / scoring
  aura_contribution: number            // points contributed to Aura score
  affects_skill_graph: boolean

  // Metadata
  created_at:        string
  updated_at:        string
  source:            "manual" | "linkedin_import" | "github_import" | "arena_auto"
}

type TimelineCategory =
  | "education"
  | "academic_project"
  | "internship"
  | "professional_experience"
  | "personal_project"
  | "arena_challenge"
  | "certification"

interface ProofLink {
  type:  "github" | "live_url" | "certificate" | "linkedin" | "video" | "document" | "other"
  url:   string
  label: string | null
}
```

---

## 5. Onboarding Flow

### Step 1 — Path Selection

```
What best describes you right now?
  ○ Student / Still in college
  ○ Recent graduate (< 1 year out)
  ○ Working professional
  ○ Both (studying + working)
  ○ Exploring / Career transition
```

Path selection determines:
- Which timeline tracks are shown first
- What section ordering the portfolio uses
- Default visibility settings
- Which Aura score weights apply

---

### Step 2 — Add Your History (guided wizard, item by item)

For each item the user wants to add, ask in sequence:

**Q1: What are you adding?**
```
  ○ A degree or course I completed / am completing
  ○ A project I built during college
  ○ An internship I did
  ○ A full-time or part-time job
  ○ A personal project or side project
  ○ A freelance engagement
  ○ A certification or badge I earned
```

This question determines `category`. No free-form category entry — always forced classification.

---

**Q2 (academic project): Was this project built specifically for a class or college requirement?**
```
  ○ Yes — it was part of a course / final year project
  ○ No — I built it on my own time while in college
```

If "No" → routes to Personal Projects, not Academic Projects.

---

**Q3 (internship): Was this a paid or structured internship with a company?**
```
  ○ Yes — I had an offer letter or contract
  ○ No — it was more like freelance / ad hoc work
  ○ Prefer not to say
```

---

**Q4: What proof do you have for this item?**
```
  ☐ GitHub repository
  ☐ Live URL / deployed link
  ☐ Certificate / offer letter (can upload)
  ☐ LinkedIn work history (link your profile)
  ☐ Video demo
  ☐ No proof right now
```

This sets `verification_level` automatically. "No proof" → V0 with disclaimer shown.

---

**Q5: Who should see this?**
```
  ○ Public (anyone with the portfolio link)
  ○ Recruiter-visible (only when profile shared with recruiters)
  ○ Private (only you)
```

---

**Q6: Should this item update your career timeline and portfolio automatically?**
```
  ○ Yes — add it to my timeline and show it on my portfolio
  ○ Yes — add to timeline only (not portfolio)
  ○ No — just save it for my records
```

---

### Step 3 — Skill Graph Update Prompt

After adding a technical item:
```
"You added [React, Node.js, PostgreSQL] as tech on this project.
 Should these update your skill graph?
  ○ Yes — update my skills with these
  ○ Yes — but let me adjust the confidence levels first
  ○ No — don't add to skill graph"
```

---

### Step 4 — Timeline Preview

Show the user a preview of how their timeline looks segmented into tracks before saving. Lets them catch misclassification before it goes live.

---

## 6. UI Architecture

### 6.1 Multi-Track Timeline Layout

The timeline is **not** a single chronological list. It is a **categorized, sectioned view** with each track visually separated.

**Two display modes:**

**Mode A — Segmented (default):**
```
┌─────────────────────────────────────────┐
│ 💼 PROFESSIONAL EXPERIENCE              │ ← Section header with count
│   Google · Senior Frontend Engineer     │
│   Amazon · Software Engineer 2          │
├─────────────────────────────────────────┤
│ 🏢 INTERNSHIPS                          │
│   Razorpay · Frontend Intern            │
├─────────────────────────────────────────┤
│ 📚 ACADEMIC PROJECTS                    │
│   E-Commerce Platform · BITS Pilani     │
│   Smart Traffic System · Final Year     │
├─────────────────────────────────────────┤
│ ⚡ PERSONAL PROJECTS                    │
│   Capabilio · Full Stack SaaS           │
│   DevTools CLI · Open Source            │
├─────────────────────────────────────────┤
│ ⚔️ ARENA PROOF                          │
│   23 challenges · ELO 1180 · Proficient │
└─────────────────────────────────────────┘
```

**Mode B — Chronological (optional toggle):**
Same items, sorted by date, but each item retains its category badge so provenance is never lost.

---

### 6.2 Item Card Design

**Professional Experience card:**
```
┌─────────────────────────────────────────┐
│ 💼 Experience  ✓ V2 Verified     [Edit] │
│                                          │
│  [Logo]  Senior Frontend Engineer        │
│          Google · Full-time              │
│          Jan 2022 – Present · 2y 4m      │
│                                          │
│  Led redesign of Ads dashboard, reducing │
│  P95 load time by 40%. Stack: React,     │
│  TypeScript, GraphQL, Golang.            │
│                                          │
│  [React] [TypeScript] [GraphQL] [+2]     │
│                                          │
│  📎 LinkedIn · 🔗 Company Email Verified │
└─────────────────────────────────────────┘
```

**Academic Project card:**
```
┌─────────────────────────────────────────┐
│ 📚 Academic Project  📎 V1 Artifact     │
│                                          │
│  Smart Traffic Control System            │
│  During: B.Tech CSE · BITS Pilani        │
│  Final Year Project · Team of 4          │
│  Aug 2021 – Apr 2022                     │
│                                          │
│  "Built during studies" ← always shown  │
│                                          │
│  IoT + ML based traffic signal optimizer │
│  Reduced avg wait time by 34% in sim.    │
│                                          │
│  [Python] [TensorFlow] [Arduino] [IoT]   │
│  [GitHub ↗] [Demo Video ↗]               │
└─────────────────────────────────────────┘
```

**Arena Proof card:**
```
┌─────────────────────────────────────────┐
│ ⚔️ Arena  ✓ V3 Capabilio Verified        │
│                                          │
│  System Design: Rate Limiter             │
│  Hard · Backend Domain                   │
│                                          │
│  Score: 88/100   Grade: A                │
│  ELO: +24        Attempt: 1st            │
│                                          │
│  [View Solution ↗] [AI Feedback ↗]       │
└─────────────────────────────────────────┘
```

---

### 6.3 Category Color + Badge System

| Track | Icon | Badge Color | Background Tint |
|-------|------|-------------|-----------------|
| Education | 🎓 | Slate blue | `#EFF6FF` |
| Academic Projects | 📚 | Indigo | `#EEF2FF` |
| Internships | 🏢 | Teal | `#F0FDFA` |
| Professional | 💼 | Emerald/Navy | `#ECFDF5` |
| Personal Projects | ⚡ | Violet | `#F5F3FF` |
| Arena | ⚔️ | Blue gradient | `#EFF6FF` |
| Certifications | 🏅 | Amber/Gold | `#FFFBEB` |

**Verification visual states:**
- V0: Gray outline + ⚠ "Self-claimed" text
- V1: Blue "📎 Artifact" chip
- V2: Teal "🔗 Linked" chip
- V3: Green "✓ Verified" seal (filled)
- V4: Gold "⭐ Reference Confirmed" seal

**Recruiter-only indicator:** 🔒 icon on items set to "recruiter" visibility  
**Private indicator:** Items hidden in recruiter/public view, shown only in edit mode

---

### 6.4 Portfolio Views

**Public View** (anyone with the link):
- Professional Experience (V2+ only shown; V0/V1 shown with disclaimer)
- Personal Projects (public items only)
- Certifications (featured ones)
- Arena Proof summary (total challenges, ELO, top scores)
- Education (degree + institution)
- Academic Projects (public items only, clearly labeled)

**Recruiter View** (unlocked when sharing profile):
- Everything in Public view
- + All experience including V0–V1 items (with honest labels)
- + Impact summaries and achievement bullets
- + Skill graph breakdown
- + Full Arena history
- + Internships
- + Verification status explicitly shown for all items

**Private/Owner View:**
- Everything above
- + Private items
- + Items pending proof (V0 with upgrade prompts)
- + Aura score contribution per item
- + Edit/delete controls

---

## 7. Aura Dashboard Score Integration

### Score Composition (100 points total)

| Source | Max Points | Weight Logic |
|--------|-----------|--------------|
| Arena / ELO | 35 pts | (eloRating / 1500) × 35 |
| Professional Experience | 20 pts | Verified roles × tenure weight |
| Skills (verified) | 15 pts | Avg skill score × breadth |
| Portfolio completeness | 10 pts | Fields filled + proof attached |
| Certifications | 8 pts | Featured + verified certs |
| Internships | 7 pts | Count + duration + verification |
| Academic Projects | 5 pts | Count + proof level |

### Score Update Triggers

| Event | Score Update |
|-------|-------------|
| Arena challenge completed | Immediate, real-time |
| New professional role added | +15 pts queued, pending manual review |
| Verification level upgraded | Difference in tier points applied |
| Certificate verified via URL | +6 pts automatic |
| LinkedIn linked | Re-evaluates all V0 experience items |
| Skill graph updated from project | Recalculates skills score |

---

## 8. Separation Enforcement Rules

These rules are enforced at the data layer, not just UI:

1. `academic_project` items **must** have a matching `education` entry in the same user's timeline. If none exists, show a warning: "Please add your education entry first."

2. `internship` items **cannot** have `employment_type = full_time`. If a user tries to describe a 3-year role as an internship, the system flags it: "This duration suggests a full-time role. Would you like to categorize this as Professional Experience instead?"

3. `professional_experience` items **cannot** have a `is_college_project = true` flag. The flag is permanent once set on `academic_project`.

4. `arena_challenge` items are **system-generated only**. Users cannot manually create Arena items. They are always V3 verified.

5. Any item with `category = professional_experience` and `verification_level = 0` (V0) shows a persistent ⚠ warning in the recruiter view: "This item has not been verified. The employer or duration cannot be confirmed."

---

## 9. Recommended Statuses, Labels, and States

### Item Status States

| Status | Label | Meaning | Visual |
|--------|-------|---------|--------|
| `active` | Current | Ongoing (no end date) | Green dot |
| `completed` | Completed | Has end date, all good | Checkmark |
| `draft` | Draft | Saved but not published | Pencil icon |
| `needs_proof` | Needs Proof | V0 with prompt to upgrade | Orange warning |
| `expired` | Expired | Certification past expiry | Muted / gray |
| `disputed` | Disputed | Flagged by user or system | Red border |
| `archived` | Archived | Hidden from portfolio | Archive icon |

### Visibility States

| State | Who Sees It |
|-------|------------|
| `public` | Anyone with portfolio URL |
| `recruiter` | Only when recruiter link is used |
| `private` | Only the owner |

### Proof States (per item)

| State | Label | Meaning |
|-------|-------|---------|
| `no_proof` | Unverified | V0 — self-claimed only |
| `pending_review` | Pending | Proof uploaded, awaiting check |
| `artifact_added` | Artifact | V1 — document/URL added |
| `externally_linked` | Linked | V2 — LinkedIn/GitHub cross-ref |
| `platform_verified` | Capabilio Verified | V3 — Arena or issuer API |
| `reference_confirmed` | Reference Confirmed | V4 — human reference verified |

---

## 10. Implementation Phases

### Phase 1 — Data Model + Onboarding (Week 1–2)
- Supabase `career_timeline` table with full schema
- Onboarding wizard (6 questions) integrated into Aura profile setup
- Basic CRUD for all 7 categories
- Verification level display (V0–V3)

### Phase 2 — Portfolio Integration (Week 3)
- Multi-track timeline in Portfolio.jsx
- Separate sections per category, never merged
- Category badges and verification chips
- Public / Recruiter view modes

### Phase 3 — Verification Engine (Week 4)
- LinkedIn profile link → auto-populate V1/V2 experience
- GitHub link → auto-populate V1 for projects
- Credential URL validator (Credly, Badgr, etc.)
- Company email OTP verification for internships

### Phase 4 — Aura Integration (Week 5)
- Timeline items feed into Aura score
- Skill graph updates from project tech stacks
- Score recalculation on verification upgrade
- Dashboard widgets per category

### Phase 5 — Recruiter View (Week 6)
- Shareable recruiter profile link
- Filtered view (public vs. recruiter items)
- PDF export of recruiter-facing profile
- Comparison mode (candidate A vs. B for enterprise)

---

*Capabilio Career Timeline Spec v1.0 — Do not mix tracks. Trust is the product.*
