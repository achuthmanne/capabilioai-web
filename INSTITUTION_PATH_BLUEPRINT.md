# Capabilio Institution Path — Production Blueprint
## Full Product + Systems + Implementation Architecture

> Version 1.0 · June 2026 · Confidential — Internal Product Document

---

# SECTION 1 — EXECUTIVE SUMMARY

The current Institution Path is a thin onboarding shell masquerading as an operating system. It captures org type, admin name, and a plan selection — then drops the user into a sparse dashboard with no real workflow, no live data, no task engine, no student loop, and no institutional intelligence. Every card is static. Every number is a placeholder. The social layer does not exist. The verification system does not exist. The student connection is conceptual, not functional.

This blueprint is the complete correction.

The redesigned Institution Path is a campus operating system — a single application that runs the full lifecycle of an Indian institution from student enrollment through placement, professional transition, and EPFO verification. It is not a dashboard. It is not an admin panel. It is the nerve center of the institution's relationship with its students, faculty, recruiters, alumni, and the broader Capabilio network.

**What this blueprint delivers:**
- 12 production-grade pages with full tab architecture
- A closed institution → student → placement → professional loop
- A multi-step institution verification system with trust badges
- A task propagation engine connecting faculty to student accounts
- A campus social network with Pulse integration
- An intelligence layer with contextual, actionable analytics
- A complete React codebase architecture with entities, contracts, and routing
- A prioritized 10-sprint implementation roadmap

**Design principle that governs everything:** Every screen must answer a question a real TPO, dean, professor, or admin would ask at 9am on a Monday. If it doesn't answer a real operational question, it doesn't belong.

---

# SECTION 2 — INSTITUTION PATH PRODUCT THESIS

## What It Is
The Institution Path is Capabilio's B2B2C surface. The institution is the customer. The students are the beneficiaries. The outcome is verified placements and professional identity continuity.

## What It Is Not
- It is not a Learning Management System (Moodle, Canvas). It does not deliver course content.
- It is not an ERP (SAP, Oracle). It does not manage fees, timetables, or HR.
- It is not a job board. It does not post jobs.
- It is not a clone of LinkedIn for colleges.

## The Unique Proposition
Capabilio does one thing that no other platform does: it creates a **verified skill identity** for every student, tracks that identity through tasks and ELO, connects it to placement outcomes, and carries that identity forward into the Professional Path with full continuity. The Institution Path is the institutional wrapper around this student identity loop.

## Core Product Bets
1. **Proof over promises** — Every student metric shown to institutions is ELO-backed and verifiable, not self-reported.
2. **Live loops over reports** — Placement data, task completion, and ELO movement update in real time. No weekly exports.
3. **Intervention over observation** — The system recommends actions. The TPO or professor can act from the same surface.
4. **Connected identity** — Student accounts are not isolated. Faculty tasks reach them. Institution updates reach their Pulse. Their placement triggers a professional upgrade prompt.
5. **Trust architecture** — Institution accounts are verified. Student institution linkages are verified. Placement outcomes are verified. Nothing is self-declared.

---

# SECTION 3 — CORE CONNECTED LOOP ARCHITECTURE

## The Full Loop

```
INSTITUTION ADMIN/FACULTY
        ↓
  Creates Tasks / Cohorts / Events
        ↓
  Assigns to Students (by dept / batch / skill gap)
        ↓
STUDENT ACCOUNT (Student Path)
  Receives institution tasks in their Arena/task feed
  Can still do self-driven Arena missions
  Follows institution page → gets updates in Pulse
        ↓
  Completes task → ELO updates → Institution sees it
        ↓
INSTITUTION INTELLIGENCE
  Sees ELO movement, completion rates, skill gaps
  Sees which cohorts are at risk
  Intervention recommended → faculty reassigns or escalates
        ↓
  Student applies for opportunity (campus drive / job)
        ↓
PLACEMENT OUTCOME
  Student marks placed / institution TPO confirms
  Institution Outcomes page updates
        ↓
PROFESSIONAL UPGRADE
  Student prompted to upgrade to Professional Path
  Identity / proof / timeline carries forward
        ↓
2-MONTH EPFO/UAN VERIFICATION WINDOW
  Student verifies employment
  Institution sees high-level verified outcome (privacy-bounded)
        ↓
PULSE + COMMUNITY
  Institution publishes placement milestone to Pulse
  Students who follow see it
  Recruiter visibility increases
```

## Data Flow Contracts

### Institution → Student (Task Push)
```
InstitutionTask {
  task_id, institution_id, created_by (faculty_id),
  title, description, type, difficulty,
  target_audience: { cohort_ids[], dept_ids[], batch_ids[], skill_gap_tags[] },
  due_date, published_at, status: draft|published|closed,
  submission_type: text|code|link|file,
  review_mode: auto|manual|peer
}
→ Propagates as StudentTask in student accounts matching target_audience
→ StudentTask inherits task_id, adds: student_id, assigned_at, status, submission, elo_delta
```

### Student → Institution (ELO/Outcome Push)
```
StudentELOEvent { student_id, institution_id, elo_before, elo_after, delta, source, timestamp }
StudentPlacementEvent { student_id, institution_id, company, role, ctc, offer_date, status: confirmed|pending }
StudentTransitionEvent { student_id, institution_id, transition_type: professional_upgrade, timestamp }
```

### Institution → Pulse (Social Push)
```
PulseEvent { source: institution, institution_id, content_id, type: announcement|placement_milestone|event|task_launch, audience: followers|public }
```

---

# SECTION 4 — INSTITUTION VERIFICATION SYSTEM

## Why This Cannot Be Skipped
Anyone can sign up as "IIT Delhi Placement Cell" today. Without verification, the entire trust model of Capabilio collapses. Recruiters receiving applications from "IIT Delhi" students need to know the institution account is legitimate before they trust the ELO scores attached to it.

## Verification Levels and Trust Badges

| Level | Badge | Unlocks |
|-------|-------|---------|
| 0 — Unverified | ⚠️ Unverified | Basic account only. Cannot invite students. Shown with warning banner. |
| 1 — Email Verified | ✉️ Email Verified | Can invite students with institutional email domain. Limited community posting. |
| 2 — Domain Verified | 🌐 Domain Verified | Can post to Pulse. Recruiter portal visible. |
| 3 — Document Verified | 📄 Document Verified | Full platform access. NAAC/UGC badge shown on profile. |
| 4 — Fully Verified | ✅ Capabilio Verified Institution | Priority placement portal. Trust seal shown to students and recruiters. Verified label in search. |

**Under Review:** 🔍 Review In Progress — all actions restricted until cleared.
**Suspended:** 🚫 Account Under Investigation — account blocked, banner shown to followers.

## Step-by-Step Verification Flow

### Step 1 — Official Email Domain Verification
- Admin provides official institution email (e.g. tpo@iitdelhi.ac.in).
- Capabilio sends a 6-digit OTP to that address.
- Admin enters OTP. Domain is recorded and locked to this account.
- Effect: Badge → Email Verified. Student invitations now require matching `@institutionname.ac.in` emails.
- **Failure path:** Admin cannot access official email → skip to document verification, flag for manual review.

### Step 2 — Website / Domain Verification (Two Methods)
**Method A — DNS TXT Record:**
- Capabilio generates a unique TXT token: `capabilio-verify=abc123xyz`.
- Admin adds it to their DNS. Capabilio polls every 30 minutes for 72 hours.
- On detection: Domain Verified badge granted automatically.

**Method B — HTML File Upload:**
- Capabilio provides a file: `capabilio-verification.html` with a unique token.
- Admin uploads it to their domain root. Capabilio fetches `https://institutionname.ac.in/capabilio-verification.html`.
- On successful fetch: Domain Verified.

**Method C — Manual URL Match (fallback for institutions without DNS access):**
- Admin submits official website URL. Capabilio team manually verifies domain ownership matches registered institution name.
- 24–48 hour SLA for manual check.

### Step 3 — Accreditation / Registration Document Upload
Required: At least one of:
- NAAC Accreditation Certificate (PDF)
- UGC Recognition Letter (PDF)
- AICTE Approval (PDF)
- Trust/Society Registration Certificate (PDF)
- Company Incorporation Certificate (for corporate institutions / training companies)

Upload flow:
- Drag-and-drop PDF upload with document type selector.
- File stored encrypted. Accessible only to Capabilio review team.
- Status: Under Document Review.
- SLA: 48–72 business hours.
- On approval: Document Verified badge.
- On rejection: Reason shown, re-upload allowed with notes.

### Step 4 — Admin Identity Verification
- Admin submits Aadhaar number (last 4 digits for display) or PAN.
- DigiLocker integration preferred for seamless KYC (future phase).
- Current fallback: admin uploads government photo ID + selfie.
- Automated face match (future) / manual review (current).
- On success: Fully Verified Institution badge.

### Claim Flow (Real Institution Claiming a Fake Page)
- Real institution detects an impersonating account.
- Submits "Claim this Institution" request from their own verified account.
- Provides: verification documents, admin identity, and domain proof.
- Capabilio review team investigates and either transfers ownership or suspends the fraudulent account.
- Claiming institution notified within 72 hours.

### Reporting Flow
- Any user can report an institution account with reason dropdown: Impersonation / Fake Institution / Misleading Information / Other.
- Report triggers review queue. Account moves to "Under Review" state if multiple reports or high-confidence flag.
- Under Review state: no new student invitations, no Pulse publishing, banner shown to followers.

## UI States for Verification

### Verified Institution Profile Header
```
[Institution Logo] IIT Delhi                    ✅ Capabilio Verified Institution
                   Placement Cell · New Delhi   Domain: iitdelhi.ac.in
                   NAAC A++ · Est. 1950         Verified since Jan 2025
```

### Unverified Institution Banner (shown on all pages)
```
⚠️ Your institution account is unverified.
Students cannot be invited, and your profile is not visible to recruiters.
[Complete Verification →]
```

### Partial Verification Progress Bar (in Settings > Verification)
```
Email Verified ✓  →  Domain Verified ✓  →  Documents (In Review)  →  Admin Identity (Pending)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━○━━━━━━━━━━━━━━━━○
                                   60%
```

---

# SECTION 5 — FULL PAGE ARCHITECTURE

## Navigation Structure

```
Institution Path — Layer 2 Navigation (left sidebar)
├── 🏠 Home                  (Command Center)
├── 📊 Intelligence          (Analytics Engine)
├── ✅ Tasks                 (Intervention Engine)
├── 👥 People                (Roster + Roles)
├── 📣 Community             (Campus Social)
├── 🗂️ Groups               (Collaboration Spaces)
├── 🎯 Cohorts               (Structured Programs)
├── 📅 Events                (Sessions + Drives)
├── 💼 Opportunities         (Placements + Internships)
├── 🏆 Outcomes              (Results + Transitions)
└── ⚙️  Settings             (Config + Integrations)
```

## Page Access by Role

| Page | Admin | TPO | Faculty | Mentor | Recruiter (guest) |
|------|-------|-----|---------|--------|-------------------|
| Home | Full | Full | Limited | Read | — |
| Intelligence | Full | Full | Dept-only | — | Aggregate |
| Tasks | Full | View | Full (own) | — | — |
| People | Full | Full | Dept-only | Own | — |
| Community | Full | Full | Full | Full | Limited |
| Groups | Full | Full | Full | Full | — |
| Cohorts | Full | Full | Own | Own | — |
| Events | Full | Full | Full | Own | Register |
| Opportunities | Full | Full | View | — | Full |
| Outcomes | Full | Full | View | — | Aggregate |
| Settings | Admin only | Billing | — | — | — |

---

# SECTION 6 — HOME PAGE REDESIGN

## Remove
- Static KPI tiles with no context or trend
- Generic "Welcome back" hero
- Empty activity feed placeholders

## Rename
- "Dashboard" → "Home"

## What Home Must Be
The Home page is the **Monday Morning Briefing** — operational, alive, prioritized. It answers: "What needs my attention right now?"

## Layout Architecture

### Zone 1 — Alert Bar (top, dismissible)
High-priority items requiring action. Never more than 5. Auto-dismissed when resolved.
```
🔴 3 students haven't submitted the DSA Task assigned 5 days ago — Due tomorrow [Review →]
🟡 Accenture has requested campus access — Pending approval since 2 days [Review →]
🟢 12 new students joined via invite link today [View →]
```

### Zone 2 — Pulse Cards (horizontal scroll, 4 cards)
Live operational metrics with trend and action. Not static numbers.

**Card: Cohort Health**
```
Cohort Health          🔴 Needs Attention
4 of 7 cohorts on track
2 cohorts below 60% completion  ↓ from last week
1 cohort at risk of falling behind deadline
[View at-risk cohorts →]
```

**Card: ELO Movement (7-day)**
```
Student ELO (7 days)   🟢 Improving
Avg ELO: 547  +18 pts
Top mover: Priya S. (CS-B) +89 pts
Bottom quartile still flat — 34 students
[Launch intervention →]
```

**Card: Placement Pipeline**
```
Placement Pipeline     🟡 Active
6 drives this month · 3 upcoming
14 offers received · 8 accepted
2 students declined — follow-up needed
[View pipeline →]
```

**Card: Task Completion**
```
Task Completion        🟡 Behind
3 active tasks · 847 assigned
Avg completion: 58%  ↓ from 71%
Critical: "SQL Lab 3" — 38% done, due Friday
[Review tasks →]
```

### Zone 3 — Activity Feed (chronological, left column 60%)
Live feed of institution events. Not generic "someone liked your post." Real operational events.
```
[2m ago]  Rohan M. (MCA-A) submitted "System Design Task" — awaiting review
[14m ago] Infosys confirmed campus drive for Oct 22 — 180 seats available
[1h ago]  Prof. Kumar published new task to "Low ELO Intervention" cohort (42 students)
[2h ago]  Divya K. accepted offer from Wipro ₹6.2L — marked placed
[3h ago]  5 students joined via faculty invite link (Dept: ECE)
[Yesterday] Cohort "Placement Ready Batch A" reached 80% ELO target
```

### Zone 4 — Upcoming (right column 40%)
```
UPCOMING THIS WEEK
─────────────────────────────────────
📅 Today 3pm    Mock Interview Drive — CS Dept  [12 registered]
📅 Tomorrow     Accenture Pre-Placement Talk     [Confirm venue →]
📅 Thu Oct 17   SQL Assessment Deadline          [47 not submitted]
📅 Fri Oct 18   Faculty Review: ELO Cohort B     [Schedule →]
─────────────────────────────────────
RECOMMENDED INTERVENTIONS
─────────────────────────────────────
⚡ 34 students in ELO 300–450 range — no active cohort assigned
   → Suggested: Assign to "DSA Bootcamp" cohort  [Do it →]
⚡ ECE dept has 0 placement drives this semester
   → Suggested: Invite domain-specific recruiters [Explore →]
⚡ 5 students placed last month — none upgraded to Professional Path
   → Reminder sent? [Send upgrade prompt →]
```

### Zone 5 — Quick Actions (bottom strip)
```
[+ Invite Students]  [+ Create Task]  [+ Launch Cohort]  [+ Post to Community]  [+ Add Event]
```

## Empty State (New Institution)
```
🎓 Your institution is set up. Let's activate it.

Step 1: [Verify your institution →]
Step 2: [Invite your first students →]
Step 3: [Create your first task →]
Step 4: [Set up a placement drive →]

Estimated time: 20 minutes to a live institution loop.
```

---

# SECTION 7 — INTELLIGENCE PAGE REDESIGN

## Remove
- Any static bar charts with no contextual narrative
- Charts that don't answer "what do I do about this"
- Separate "Reports" concept — merge into Intelligence

## What Intelligence Must Be
The Intelligence page is the **Placement Cell's war room** — every number has a story, every trend has a recommended action, every at-risk segment has an intervention button.

## Tab Structure

### Tab 1 — Overview
The 10,000-foot view. Answers "How is my institution performing right now?"

**ELO Distribution Card**
```
Student ELO Distribution           Last updated: 10 mins ago
─────────────────────────────────────────────────────────────
Elite (750+)  ████ 4%    (42 students)
Strong (600-749) ████████ 18%
Average (450-599) ████████████████ 39%
Developing (300-449) ████████████ 28%   ← intervention zone
Low (<300) ████ 11%                     ← critical zone

Average: 547 ELO  (+12 from last month)
↑ Top 10% improved significantly after DSA Cohort launch
↓ Bottom 11% unchanged — no active intervention assigned

[View at-risk students →]  [Launch cohort for bottom 11% →]
```

**Job Readiness Card**
```
Job Readiness Index                 Composite of ELO + tasks + profile
─────────────────────────────────────────────────────────────
Ready (80%+)     ██ 12%   (126 students)
Near-ready (60-79%) ████████ 23%
Developing (40-59%) ████████████ 31%
Not ready (<40%)  ██████████████ 34%  ← 357 students

Lowest signals: Communication (avg 38%), DSA (avg 44%)
Best performing: Mathematics (avg 71%)

[Drill into skill gaps →]  [Create targeted cohort →]
```

### Tab 2 — Placement Funnel
Visual funnel + contextual narrative.
```
Placement Funnel — Batch 2024-25
─────────────────────────────────────────────────────────────
Total Eligible Students: 1,048
         ↓
Registered for Drives: 634   (60.5%)  ← 38% not registered
         ↓
Appeared for Interviews: 521
         ↓
Cleared First Round: 312    (59.9% of appeared)
         ↓
Received Offers: 187
         ↓
Accepted Offers: 156        (83.4% acceptance rate)
         ↓
Joined Companies: 134       (verified via Capabilio)

Bottleneck 1: Registration gap — 414 students never registered
  → Possible cause: Low job readiness (<50 ELO score)
  → Action: [Run job-readiness assessment for unregistered students →]

Bottleneck 2: First-round failure (40.1%)
  → Possible cause: Communication + aptitude gaps
  → Action: [Assign communication cohort to failed-first-round students →]
```

### Tab 3 — Department Performance
Comparative table with trend indicators.

| Department | Enrolled | Avg ELO | Job Ready % | Placed % | vs Last Year |
|-----------|----------|---------|-------------|----------|--------------|
| CS | 312 | 621 | 38% | 71% | +12% ↑ |
| ECE | 289 | 489 | 21% | 44% | -3% ↓ |
| Mech | 201 | 412 | 14% | 31% | +1% → |
| MBA | 156 | 534 | 29% | 68% | +8% ↑ |

Each department row is clickable → department drill-down with student list, ELO distribution, active cohorts, faculty owners, and recommended interventions.

### Tab 4 — Leaderboard
Top students by ELO within institution. Used by TPO for shortlisting.
- Filter by dept / batch / domain / ELO range
- Show: Name · Dept · ELO · Tasks Completed · Placement State · Last Active
- Export for recruiter shortlist
- Recruiter can be granted "view leaderboard" access

### Tab 5 — Faculty Impact
Which faculty interventions actually moved ELO?
```
Faculty Impact Report — Oct 2025
─────────────────────────────────────
Prof. Kumar  — Published 8 tasks  → Avg student ELO delta +34 pts
Prof. Sharma — Published 3 tasks  → Avg student ELO delta +12 pts
Prof. Reddy  — Published 12 tasks → Avg student ELO delta +8 pts
                                   (low delta despite high task count — review task quality)

[Send feedback to Prof. Reddy →]  [View Prof. Kumar's task designs →]
```

### Tab 6 — Recruiter Visibility
```
Recruiter Engagement — Last 30 days
─────────────────────────────────────
28 recruiters viewed institution profile
14 accessed student leaderboard
6 requested campus access
2 confirmed campus drives

Top searched domains: Full Stack (18), Data Analytics (11), DevOps (5)
Gap: No DevOps-focused cohort — 5 recruiters looking, 0 students tagged
[Launch DevOps cohort →]
```

---

# SECTION 8 — TASKS PAGE REDESIGN

## The Task Propagation Engine

This is the most technically critical page. Tasks created by faculty must appear in student accounts in real time.

## Tab Structure

### Tab 1 — Active Tasks
List of all published tasks with completion telemetry.

**Task Card (in list)**
```
[SQL Lab 3 — Advanced Joins]               Assigned to: CS-A, CS-B (234 students)
Type: Lab  |  Difficulty: Medium  |  Due: Oct 18  |  Created by: Prof. Kumar

Completion: ████████░░░░ 58%  (135/234 submitted)
Reviews pending: 23 (manual)   Overdue: 12 students
ELO impact: +24 avg for completers

[View submissions →]  [Send reminder →]  [Extend deadline →]  [Close task →]
```

### Tab 2 — Create Task
Full task builder. Must not feel like a form. Must feel like a workflow.

**Task Builder Fields:**
- Title, description, type (DSA / SQL / Aptitude / Communication / Project / Assessment / Interview Prep / Custom)
- Difficulty: Easy / Medium / Hard / Expert
- Submission type: Code Editor / File Upload / Text / Link / Presentation
- Review mode: Auto (ELO-scored) / Manual (faculty reviews) / Peer (students review each other)
- Target audience selector:
  - By cohort (multi-select existing cohorts)
  - By department + batch + year
  - By ELO range (e.g. only students ELO 300–500)
  - By skill gap tag (e.g. "weak in communication")
  - Custom student search + add
- Schedule: Publish now / Schedule for date-time
- Due date + grace period setting
- Scoring rubric builder (for manual review tasks)
- Attach resources: links, PDFs, starter code
- Follow-up: Auto-assign follow-up task on failure / Auto-add to intervention cohort on non-submission

**Preview before publish:** Shows exact list of students who will receive this task.

### Tab 3 — Submissions (Review Queue)
For manual-review tasks. Faculty sees student submission with:
- Student name, batch, current ELO
- Submission content (code, text, file)
- ELO delta recommendation (faculty approves)
- Rubric score fields
- Feedback text (sent back to student)
- Escalate to senior reviewer
- Approve / Reject / Request revision

### Tab 4 — Templates
Pre-built task templates curated by Capabilio and faculty:
- 50+ templates across DSA, SQL, Aptitude, Communication, Behavioral
- Each template shows: avg completion rate, avg ELO delta, difficulty rating
- One-click clone and customize

### Tab 5 — Archive
Closed tasks with outcome data. Used for trend analysis.

## Task Propagation Logic (Technical)

```
Faculty publishes InstitutionTask
    ↓
System evaluates target_audience criteria against InstitutionStudentRoster
    ↓
For each matching student_id:
  → Creates StudentTask record in student's account
  → Sends notification: "New task from [Institution Name]: [Task Title]"
  → Task appears in student's Arena/Task feed with institution badge
    ↓
Student submits → InstitutionTask.completions incremented
Student ELO updates → ELOEvent emitted → Institution Intelligence receives delta
    ↓
Faculty sees live completion % on task card
    ↓
On due date:
  → Non-submitters flagged in At-Risk list
  → Optional: auto-assign to intervention cohort
  → Optional: auto-send follow-up task
```

---

# SECTION 9 — PEOPLE PAGE REDESIGN

## Remove
- Simple table with name + email
- Static role badges

## Tab Structure

### Tab 1 — Students
Each student row is a live status object, not a static record.

**Student Row**
```
[Avatar] Priya Sharma                    CS-B  ·  Batch 2022-26  ·  ✅ Email Verified
         ELO: 623  ↑+34 (7d)             Cohorts: DSA Bootcamp, Placement Ready
         Tasks: 8/9 completed            Job Ready: 78%  ↑
         Status: 🟢 Active               Last active: 2 hours ago
         Placement: Interviewing at Infosys (confirmed by TPO)

[View Profile]  [Assign to Cohort]  [Send Task]  [Message]
```

Filters: Department / Batch / ELO Range / Placement State / Cohort / Last Active / Job Ready %

**Student States:**
- 🟢 Active — logged in recently, tasks on track
- 🟡 Drifting — inactive 7+ days, falling behind tasks
- 🔴 At Risk — ELO declining, 0 tasks completed this week
- 🔵 Placed — received and accepted offer
- 🔵 Transitioning — upgrading to Professional Path
- ⚫ Graduated — left institution loop

### Tab 2 — Faculty
Faculty row shows: Name · Dept · Tasks published · Avg student ELO delta · Cohorts owned · Last active · Invite status

**Faculty invite flow:**
- Admin enters email → invite sent with role assignment
- Faculty accepts → Capabilio account created or linked
- Faculty sees only their department's students/tasks by default
- Admin can grant broader access

### Tab 3 — Placement Staff (TPO)
TPO role has elevated access to: Opportunities, Outcomes, Recruiter contacts, Placement funnel, All student profiles
Each TPO row: Name · Drives managed · Students placed · Offers confirmed · Last active

### Tab 4 — Recruiters
Guest access tier. Recruiters invited by TPO.
Each row: Company name · Contact person · Campus access status · Drives confirmed · Last visited leaderboard

### Tab 5 — Alumni
Alumni who graduated and are in Professional Path but still connected to institution loop.
Each row: Name · Batch · Current company · ELO at graduation → current · Mentorship available?

### Tab 6 — Pending
All pending invitations with status. Resend / Revoke / Remind actions per row.

---

# SECTION 10 — COMMUNITY PAGE REDESIGN

## Remove
- Generic "feed" with no institutional context
- Copy of LinkedIn-style post cards

## What Community Must Be
The **campus notice board + department chat + alumni wall + placement cell updates** — all in one structured, moderated social layer. Not noisy. Not generic. Purpose-built for campus.

## Tab Structure

### Tab 1 — Institution Feed
Official posts from the institution account. All followers (students + external) see these in Pulse.
- Post types: Announcement / Placement Milestone / Event / Achievement / Alert
- Each post: rich text + image/link + audience selector (all / specific dept / batch)
- Reactions: 👏 Congratulations · 🔥 Impressive · 💡 Useful · ❓ Question
- Moderation: Admin can pin, feature, or remove posts
- Pulse sync: Posts tagged "Public" auto-publish to followers' Pulse feeds

### Tab 2 — Department Feeds
One feed per active department. Scoped to department members + admin/faculty.
- Faculty announcements, assignment updates, resources
- Students can post with faculty approval gate (configurable)

### Tab 3 — Discussions
Open forum for students. Topics, replies, reactions. Moderation by faculty/admin.
Categories: Career · Technical · Campus Life · Placements · Study Groups

### Tab 4 — Placement Wall
TPO-curated. Shows all confirmed placements with celebration posts.
```
🎉 Rohan Mehta — placed at Google as SWE ₹42L
   CS Dept · Batch 2024 · ELO at placement: 781
   [Congratulate →]
```
This data also feeds the Outcomes page.

### Tab 5 — Alumni Board
Alumni posts visible to current students. Mentorship offers, career advice, company insights.

## Moderation Model
- Institution admin = Super Moderator (delete, ban, pin anything)
- Faculty = Department Moderator (own department posts)
- TPO = Placement feed moderator
- Student posts: Configurable — free posting / approval gate / read-only
- Report flow: Any user can flag → auto-hide after 3 reports → moderator review queue

## Pulse Connection
```
Post created in Community → tagged "Publish to Pulse"?
  Yes → PulseEvent created → pushed to all institution followers' Pulse feeds
  No → Stays inside institution Community only
```

---

# SECTION 11 — GROUPS PAGE REDESIGN

## What Groups Are
Structured collaboration containers. Not a chat room. Not a WhatsApp group.
Each group has its own: feed, task list, members, files, sessions.

## Group Types
- **Class Group**: All students in a section (auto-created from roster)
- **Subject Group**: Faculty-created for a course or topic
- **Placement Prep Group**: DSA prep, mock interview, company-specific prep
- **Hackathon / Project Group**: Time-bounded team group
- **Mentor Circle**: Mentor + assigned mentees
- **Alumni Circle**: Department alumni community
- **Custom Group**: Faculty or admin creates any purpose

## Group Card
```
[Group Image] DSA Interview Bootcamp           🔒 Closed Group
              Faculty: Prof. Kumar  ·  47 members
              Active task: "Trees & Graphs Week 3"  (62% complete)
              Next session: Oct 18, 4pm (Google Meet)
              Group ELO avg: 578  ↑+41 this month

[Enter →]
```

## Inside a Group — Tabs
1. **Feed** — Group-specific posts, announcements, discussions
2. **Tasks** — Tasks assigned within this group specifically
3. **Members** — Roster with progress indicators
4. **Sessions** — Scheduled and past sessions, recordings, Q&A
5. **Resources** — Files, links, reference materials
6. **Analytics** — Group ELO movement, task completion, attendance

---

# SECTION 12 — COHORTS PAGE REDESIGN

## What Cohorts Are
Time-bounded, goal-oriented structured programs. Unlike groups (social), cohorts are **intervention machines** — they exist to move specific metrics (ELO, job readiness, placement rate) for a defined segment of students.

## Cohort Types
- **Skill Cohort**: DSA / SQL / Communication / Aptitude (move ELO in specific skill)
- **Intervention Cohort**: Low-ELO rescue / at-risk students / non-submitters
- **Placement Cohort**: Near-placed students, final interview prep, company-specific
- **Domain Cohort**: ML track / Frontend track / DevOps track (for recruiters to target)
- **Custom Cohort**: Admin-defined goal, any mix of students

## Cohort Card
```
[🎯] Placement Ready — CS Batch A                    Active · 42/60 students on track
     Goal: 80% ELO minimum, 3+ task completions, mock interview done
     Faculty: Prof. Sharma  |  Duration: 8 weeks (Week 4 of 8)
     Progress: ████████░░░░ 67%   Target ELO avg: 620  Current: 589  ↑+34

     ⚠️ 8 students below 50% — auto-alert sent to Prof. Sharma
     Next: Mock Interview Session — Oct 19, 3pm

[Enter Cohort →]  [View at-risk students →]  [Add students →]
```

## Inside a Cohort — Tabs
1. **Overview** — Goal progress, ELO movement chart, milestone tracker
2. **Students** — Roster with individual progress, ELO delta, task state
3. **Tasks** — Cohort-specific task assignments with completion
4. **Sessions** — Live sessions, recordings, Q&A threads
5. **Interventions** — Auto-flagged and manual intervention log
6. **Outcomes** — Post-cohort placement rate, ELO uplift (retrospective)

## Cohort Creation Wizard
Step 1: Name, goal, type, duration
Step 2: Add students (by dept / batch / ELO range / manual)
Step 3: Assign faculty owner + optional mentors
Step 4: Set milestone checklist (ELO target / tasks to complete / sessions to attend)
Step 5: Configure auto-alerts (student falls behind → notify faculty, add to intervention list)
Step 6: Publish → students notified → cohort appears in student's "My Programs" in their student account

---

# SECTION 13 — EVENTS / SESSIONS PAGE REDESIGN

## Tab Structure

### Tab 1 — Upcoming Events
Calendar + list toggle. Each event card:
```
[📅] Accenture Pre-Placement Talk         Oct 22 · 3:00pm–5:00pm
     Host: TPO Cell  ·  Guest: Pradeep K. (Accenture HR Head)
     Venue: Seminar Hall A  ·  Mode: Hybrid (Zoom link)
     Registered: 89/150  ·  Dept: CS, MCA                    [Register for student]
     Reminder set: 24h + 1h before
     Post-event: Follow-up task + feedback form auto-sent

[Edit]  [Send reminder]  [View registrations]  [Add to calendar]
```

### Tab 2 — Create Event
Event builder:
- Type: Lecture / Guest Talk / Mock Interview Drive / Campus Placement Drive / Webinar / Office Hours / Hackathon / Mentor Session
- Title, description, host, guest speakers, co-organizers
- Date + time + duration
- Mode: In-person / Online / Hybrid + platform link
- Capacity limit + registration form fields
- Target audience (all / dept / cohort / invite-only)
- Auto-reminders: 24h / 1h / 10min before
- Post-event: Auto-send recording link, resources, follow-up task, feedback form
- Optional: Register for drives (JD, eligibility criteria, CTC range)

### Tab 3 — Past Events
With analytics: Attendance %, feedback score, recording link, follow-up task completion rate.

### Tab 4 — Placement Drives
Specialized tab for company-specific placement events.
Each drive:
```
[🏢] Infosys Campus Drive                          Status: Registration Open
     Date: Oct 25 · Eligible: CS, MCA, IT (60%+, 2024 batch)
     Roles: System Engineer (₹4.5L) · Specialist Programmer (₹8L)
     Process: Aptitude → Technical → HR
     Registered: 234  ·  Eligible: 412  ·  Not registered: 178

[View registered students]  [Notify eligible unregistered →]  [Manage drive →]
```

---

# SECTION 14 — OPPORTUNITIES AND OUTCOMES

## Opportunities Page

### Tab 1 — Jobs & Internships
Job/internship listings posted by recruiters or added by TPO.
Each card:
- Company, role, CTC/stipend, location, type (FT/Internship)
- Eligibility: dept, batch, ELO minimum, CGPA minimum
- Application mode: Direct / Via Capabilio / Campus Drive
- Applied count / Matched students count
- [Notify eligible students →] [Post to Community →] [Archive →]

### Tab 2 — Campus Drives
All scheduled/confirmed campus hiring events. Links to Events page.

### Tab 3 — Hackathons / Certifications
External opportunities: Hackathons, NPTEL certs, GATE prep, scholarships.
Faculty can curate and assign to relevant students/cohorts.

### Tab 4 — Recruiter Pipeline
CRM-style view for TPO. Track each recruiter relationship:
- Company → Status: Exploring / In Discussion / Drive Confirmed / Past Partner
- Contact person, last communication, next action
- Historical: drives conducted, students placed, avg CTC

---

## Outcomes Page

### Tab 1 — Placed Students
```
All placed students this academic year
─────────────────────────────────────────────────────────────
Name           Dept  Company           Role           CTC      Date      Path
─────────────────────────────────────────────────────────────
Priya Sharma   CS    Google            SWE            ₹42L     Oct 5     → Pro (Verified)
Rohan Mehta    MCA   Infosys           STE            ₹4.5L    Sep 28    → Pro (Pending)
Divya K.       CS    Wipro             Analyst        ₹6.2L    Sep 20    → Pro (Not started)
─────────────────────────────────────────────────────────────
Total placed: 156  |  Avg CTC: ₹8.4L  |  Dept with most: CS (71)
```

### Tab 2 — Placement Statistics
Summary view for NAAC report / director presentation:
- Overall placement % by dept, by batch, by year
- Company-wise distribution
- Domain-wise distribution (Product / Service / Core / Research)
- CTC range distribution
- One-click "Generate NAAC Placement Report" → PDF export

### Tab 3 — Professional Transitions
Students who have moved to Professional Path:
- Name, placed at, transition date, verification status (Pending / Verified / Expired)
- Institution sees high-level status only. Detailed profile is private once Professional.

### Tab 4 — Verification Funnel
```
Professional Upgrade Funnel — Batch 2024
──────────────────────────────────────────
Placed students:         156
Received upgrade prompt: 156
Clicked upgrade:          98  (62.8%)
Completed Pro upgrade:    87  (88.8% of those who clicked)
Started UAN verification: 61  (70.1% of upgraded)
Verified:                 44  (72.1% of those who started)
Expired (2-month timeout): 17 ← follow-up recommended

[Send re-verification nudge to 17 students →]
```

---

# SECTION 15 — STUDENT-TO-PROFESSIONAL TRANSITION FLOW

## The Full State Machine

### Student States in Institution Context
```
enrolled → active → at_risk → placed → transitioning → professional_active → verified
                                      ↓
                               declined_upgrade → still_in_student_path
```

### Trigger: Student Placed

**Institution side (TPO confirms):**
1. TPO confirms offer in Outcomes tab (company, role, CTC, start date).
2. System marks student as `status: placed` in People tab.
3. Student ELO snapshot taken at placement date — stored as `elo_at_placement`.
4. Placement shown on Community > Placement Wall (if student consented).
5. Institution Outcomes stats update.

**Student side:**
1. Student receives notification: "🎉 Congratulations! Your placement has been confirmed by [Institution Name]. You're ready to upgrade to the Professional Path."
2. Upgrade prompt appears at top of student dashboard for 30 days.
3. Prompt shows: what carries forward (identity, ELO, projects, timeline), what's new (Professional Orbit, Vault, UAN verification).

### Upgrade Flow (Student Performs)
```
Step 1: Student clicks "Upgrade to Professional"
Step 2: Review what carries forward (read-only confirmation screen)
        - ELO history ✓
        - Projects / submissions ✓
        - Institution link (read-only from pro side) ✓
        - Arena history ✓
Step 3: Set professional profile context:
        - Current company, role, start date
        - Career goals
        - LinkedIn URL (optional)
Step 4: Account transitions to Professional Path
Step 5: 60-day UAN/EPFO verification window begins
        - Countdown timer shown in Professional Path
        - Reminder at 30 days, 50 days, 58 days
Step 6: Verification complete → "Verified Professional" badge
        OR
        Countdown expires → "Unverified" flag, verification still available but badge withheld
```

### Privacy Boundaries
- Institution can see: placed ✓, company name ✓, transition date ✓, verification status (pending/verified) ✓
- Institution cannot see: Professional Path ELO, new employer details beyond initial placement, detailed activity on Pro side
- Student can control: whether their placement is shown publicly on Placement Wall

### UAN/EPFO Verification Flow
1. Student enters UAN number (12-digit Universal Account Number from EPFO).
2. Capabilio calls EPFO API (or DigiLocker EPFO document) to pull employment record.
3. Match: employer name matches confirmed company → auto-verified.
4. No match / partial: Student uploads offer letter or payslip → manual review.
5. Review passes → badge granted.
6. Review fails → student can re-submit with different documents.

---

# SECTION 16 — SETTINGS / CONNECTIONS / INTEGRATIONS REDESIGN

## Remove
- "Integrations" as a single vague page with 3 logos
- Flat list of settings with no grouping

## Settings Architecture

### Section A — Institution Profile
- Name, logo, cover image, description, website, address
- Year founded, accreditation type, institution type (University / College / Training / Corporate)
- Public profile visibility settings

### Section B — Verification & Trust
- Full verification progress with step-by-step status
- Document uploads and resubmission
- Domain verification (DNS/HTML method)
- Admin identity verification
- Trust badge display settings

### Section C — Access & Roles
- Role management: Admin / TPO / Faculty / Moderator / Recruiter
- Invite admins/faculty with role assignment
- Permission matrix editor
- Single Sign-On (SSO) configuration (Google Workspace / Microsoft 365 / SAML)
- SCIM provisioning toggle (Enterprise)

### Section D — Internal Connections (Critical — currently missing)
```
Student Link Sync
─────────────────────────────────────
Method: Student ID + Institution Name matching
Status: 234 students linked · 12 pending approval · 3 mismatched
Domain gate: @collegename.ac.in required ✓
[Review pending links →]  [Export linked students →]

Task Sync
─────────────────────────────────────
Institution tasks → Student accounts: ✅ Active
Last sync: 2 minutes ago  ·  Tasks in flight: 8
Failed deliveries: 0
[View sync log →]

Pulse Connection
─────────────────────────────────────
Follower count: 312 students follow this institution on Pulse
Publishing: Enabled — posts tagged "Public" auto-push to Pulse
Last published: "Infosys Drive Confirmed" · 2 hours ago · Reached 287 followers
[Manage Pulse settings →]

Professional Transition Sync
─────────────────────────────────────
Students upgraded to Pro: 44
Verification received: 44 status updates from Pro system
Privacy: Institution receives aggregate only (no Pro-side detail)
```

### Section E — External Integrations

**Each integration row format:**
```
[Logo] Google Workspace          Status: ✅ Connected
       Synced data: Faculty emails, Calendar events, Drive files
       Last sync: 5 minutes ago  ·  Health: ✅ Healthy
       Owner: admin@college.ac.in  ·  Permissions: Read calendar, Read directory
       [View logs →]  [Manage permissions →]  [Disconnect →]
```

**Available integrations:**

| Integration | Purpose | Data synced |
|------------|---------|-------------|
| Google Workspace | SSO + Calendar + Drive | Login, events, files |
| Microsoft 365 | SSO + Teams + Calendar | Login, Teams meetings, calendar |
| Zoom | Live sessions | Meeting links, attendance |
| WhatsApp Business | Student notifications | Task alerts, event reminders |
| Email (SMTP) | Bulk communications | Digest emails, alerts |
| LMS (Moodle / Canvas) | Course sync | Enrollments, grades (inbound) |
| ERP / SIS (custom API) | Student data import | Enrollment, dept, batch data |
| ATS (Workday / Greenhouse / Keka) | Placement tracking | Offer status, joining status |
| Calendar (Google / Outlook) | Event sync | Events pushed to faculty/student calendars |
| Storage (Google Drive / OneDrive) | Resources | Group files, recording uploads |
| Capabilio API | Custom integrations | Webhooks for task events, ELO changes |

### Section F — Notifications & Communication
- Configure what triggers email / SMS / WhatsApp / in-app notification
- Per-role notification preferences
- Digest frequency settings

### Section G — Data & Exports
- Export student roster (CSV / Excel)
- Export placement data for NAAC report (PDF / Excel)
- Export ELO data (anonymous aggregate)
- GDPR/PDPB-compliant data deletion request flow
- Data retention policy settings

### Section H — Audit Logs
Immutable log of all admin actions:
- Student invitations sent/revoked
- Task published/deleted
- Role assignments changed
- Settings changed
- Verifications submitted/rejected
- Filter by: date / admin / action type

### Section I — Billing
- Current plan: Free Trial (full access)
- Usage: students linked, tasks published, storage used
- Upgrade CTA: "Paid plans launching soon — you'll be notified"
- Invoice history (future)

### Section J — Danger Zone
- Transfer institution ownership
- Merge with another institution account (admin request)
- Archive institution (suspends all activity, retains data)
- Delete institution (permanent, requires confirmation + admin ID verification)

---

# SECTION 17 — DESIGN SYSTEM UNIFICATION

## The Problem with the Current UI
The current institution screens use three conflicting visual languages:
1. Soft cream/beige cards from the student onboarding system
2. Dark analytics blocks that feel like copied Grafana widgets
3. Generic form components with no institutional identity

None of these feel like an enterprise SaaS built for Indian colleges.

## The Institution Design Language

### Color Palette
```
Primary:    #0F172A   (Slate 900 — text, headers)
Surface:    #FFFFFF   (pure white — main card bg)
Surface 2:  #F8FAFC   (Slate 50 — page bg, alternate rows)
Surface 3:  #F1F5F9   (Slate 100 — hover states, inset blocks)
Border:     #E2E8F0   (Slate 200 — card borders)
Border 2:   #CBD5E1   (Slate 300 — stronger dividers)

Accent:     #0EA5E9   (Sky 500 — institution teal/blue — CTAs, active states)
Accent D:   #0284C7   (Sky 600 — hover on accent)
Accent Bg:  #F0F9FF   (Sky 50 — accent surface)

Success:    #10B981   (Emerald 500)
Warning:    #F59E0B   (Amber 500)
Danger:     #EF4444   (Red 500)
Info:       #6366F1   (Indigo 500)

Text 1:     #0F172A   (primary text)
Text 2:     #334155   (body text)
Text 3:     #64748B   (secondary text, labels)
Text 4:     #94A3B8   (muted text, empty states)
```

### Typography
```
Font family: "Inter" (system), fallback: -apple-system
Sizes:
  Display: 28px / 700 weight  — page titles
  Heading: 20px / 700         — section titles
  Subhead: 16px / 600         — card titles
  Body: 14px / 400            — default text
  Caption: 12px / 500         — labels, metadata
  Mono: "JetBrains Mono" 13px — code, IDs, values

Line heights: display 1.2 / body 1.6 / caption 1.4
```

### Spacing System
```
4px grid
xs: 4px  sm: 8px  md: 12px  base: 16px
lg: 24px  xl: 32px  2xl: 48px  3xl: 64px
```

### Border Radius
```
sm: 6px   (inputs, chips, tags)
md: 10px  (cards, dropdowns)
lg: 16px  (modals, panels)
xl: 24px  (hero sections)
pill: 999px (badges, buttons)
```

### Component Standards

**KPI Card (alive format):**
```
┌─────────────────────────────────────────┐
│ Label              Status badge (color)  │
│ Primary Value     Trend arrow + delta    │
│ Context line (what changed, why)        │
│ ─────────────────────────────────────   │
│ Recommended action link →               │
└─────────────────────────────────────────┘
```

**Table Row:**
```
min-height: 52px
padding: 0 16px
hover: bg Surface 3
border-bottom: 1px solid Border
status dot: 8px circle, color-coded
actions: appear on hover (right-aligned)
```

**Tabs:**
```
Style: underline (not pill, not background-fill)
Active: border-bottom 2px Accent, text Text 1, weight 600
Inactive: text Text 3, weight 500
Gap: 24px between tabs
Height: 44px
No background color on tab bar
```

**Badges:**
```
Verified: bg #ECFDF5, text #059669, border #A7F3D0  — "✅ Verified"
Pending:  bg #FFFBEB, text #D97706, border #FDE68A  — "⏳ Pending"
At Risk:  bg #FEF2F2, text #DC2626, border #FECACA  — "🔴 At Risk"
Active:   bg #F0F9FF, text #0284C7, border #BAE6FD  — "● Active"
```

**Empty State:**
```
Centered layout, max-width 380px
Icon: 48px, color Text 4
Heading: 18px / 600, Text 2
Body: 14px, Text 3, max 2 lines
CTA button: accent, clear action label
No decorative illustrations — use purposeful icons only
```

**Chart Language:**
```
All charts: white background, no dark mode flip mid-page
Bar charts: accent color family, rounded tops (border-radius 4px)
Line charts: smooth curve, filled area at 10% opacity
No pie charts for primary metrics — use bar or progress
Trend arrows: ↑ success green / ↓ danger red / → neutral gray
All charts have a "so what" caption below — never standalone
Grid lines: subtle (#F1F5F9), no axis lines
```

**Mobile Behavior:**
```
Sidebar collapses to bottom nav (5 items max) on mobile
Cards stack vertically, full width
Tables scroll horizontally with sticky first column
Modals full-screen on mobile
Charts: hide secondary series, show summary stat instead
```

---

# SECTION 18 — CARD AND MODULE REDESIGN PRINCIPLES

## The Core Rule
Every card must answer: **What changed? Why? What should I do?**
No card is allowed to exist as a static number with no context.

## The "Alive Card" Pattern

### Level 1 — Dead Card (current state)
```
┌──────────────────────┐
│ 38% Job Ready        │
└──────────────────────┘
```

### Level 2 — Contextualized Card (minimum bar)
```
┌──────────────────────────────────────────┐
│ Job Readiness         38%  ↑+4% (30d)    │
│ 126 of 1,048 students ready              │
└──────────────────────────────────────────┘
```

### Level 3 — Alive Card (target state)
```
┌──────────────────────────────────────────────────────────┐
│ Job Readiness                      38%  ↑+4% last month  │
│ ─────────────────────────────────────────────────────    │
│ 126 students ready · 357 students not ready              │
│ Weakest areas: Communication (avg 38%), DSA (avg 44%)    │
│ Improving: 2 active cohorts targeting this metric        │
│ Action needed: 34 at-risk students have no cohort        │
│ ─────────────────────────────────────────────────────    │
│ [View at-risk students →]  [Launch cohort →]             │
└──────────────────────────────────────────────────────────┘
```

## Application Examples

**ELO Card (Intelligence)**
- Don't say: "Avg ELO: 547"
- Say: "Avg ELO 547 (+12 from last month). Growth driven by DSA Cohort A (42 students). Bottom 11% (109 students) unchanged — no active intervention. Last similar improvement took 3 weeks with 1 targeted cohort."

**Placement Funnel Card**
- Don't say: "60% registered for drives"
- Say: "40% of eligible students never registered for any drive. Primary reason: ELO below 450 (recruiter minimum). Fast fix: 2 communication cohorts could move 80 of them above threshold in 4 weeks."

**Task Completion Card**
- Don't say: "58% completion rate"
- Say: "SQL Lab 3: 58% done, deadline Friday. 87 students haven't started. 23 of them are in at-risk cohort. Sending reminder now could recover 40–50 submissions based on historical patterns."

## Card Interaction Model
Every Level 3 card has three interaction layers:
1. **Scan** — at a glance: value + trend + urgency indicator
2. **Read** — expand for context (one click or hover)
3. **Act** — CTA button opens relevant workflow panel inline (no full navigation)

---

# SECTION 19 — CODEBASE / FOLDER ARCHITECTURE

## Monorepo Structure
```
capabilio-web/
├── frontend/
│   └── src/
│       ├── paths/                          ← path-wise code isolation
│       │   ├── student/
│       │   ├── professional/
│       │   ├── authority/
│       │   └── institution/               ← everything institution lives here
│       │       ├── pages/
│       │       │   ├── InstHome.jsx
│       │       │   ├── InstIntelligence.jsx
│       │       │   ├── InstTasks.jsx
│       │       │   ├── InstPeople.jsx
│       │       │   ├── InstCommunity.jsx
│       │       │   ├── InstGroups.jsx
│       │       │   ├── InstCohorts.jsx
│       │       │   ├── InstEvents.jsx
│       │       │   ├── InstOpportunities.jsx
│       │       │   ├── InstOutcomes.jsx
│       │       │   └── InstSettings.jsx
│       │       ├── components/
│       │       │   ├── shared/
│       │       │   │   ├── InstNav.jsx              ← left sidebar nav
│       │       │   │   ├── InstVerificationBanner.jsx
│       │       │   │   ├── InstAlertBar.jsx
│       │       │   │   ├── InstTabBar.jsx
│       │       │   │   ├── InstKPICard.jsx          ← alive card component
│       │       │   │   ├── InstStudentRow.jsx
│       │       │   │   ├── InstPersonRow.jsx
│       │       │   │   ├── InstTaskCard.jsx
│       │       │   │   ├── InstCohortCard.jsx
│       │       │   │   ├── InstEventCard.jsx
│       │       │   │   ├── InstBadge.jsx
│       │       │   │   ├── InstEmptyState.jsx
│       │       │   │   ├── InstModal.jsx
│       │       │   │   ├── InstSidePanel.jsx
│       │       │   │   └── InstTable.jsx
│       │       │   ├── home/
│       │       │   │   ├── HomeAlerts.jsx
│       │       │   │   ├── HomePulseCards.jsx
│       │       │   │   ├── HomeActivityFeed.jsx
│       │       │   │   └── HomeUpcoming.jsx
│       │       │   ├── intelligence/
│       │       │   │   ├── ELODistributionChart.jsx
│       │       │   │   ├── PlacementFunnelChart.jsx
│       │       │   │   ├── DeptPerformanceTable.jsx
│       │       │   │   ├── LeaderboardTable.jsx
│       │       │   │   ├── FacultyImpactTable.jsx
│       │       │   │   └── RecruiterVisibilityPanel.jsx
│       │       │   ├── tasks/
│       │       │   │   ├── TaskBuilder.jsx
│       │       │   │   ├── TaskAudienceSelector.jsx
│       │       │   │   ├── TaskSubmissionReview.jsx
│       │       │   │   ├── TaskCompletionBar.jsx
│       │       │   │   └── TaskTemplateGallery.jsx
│       │       │   ├── people/
│       │       │   │   ├── StudentRosterTable.jsx
│       │       │   │   ├── FacultyRosterTable.jsx
│       │       │   │   └── InviteFlow.jsx
│       │       │   ├── community/
│       │       │   │   ├── InstFeed.jsx
│       │       │   │   ├── PostComposer.jsx
│       │       │   │   ├── PostCard.jsx
│       │       │   │   └── ModerationQueue.jsx
│       │       │   ├── cohorts/
│       │       │   │   ├── CohortBuilder.jsx
│       │       │   │   ├── CohortCard.jsx
│       │       │   │   ├── CohortProgressPanel.jsx
│       │       │   │   └── CohortStudentTable.jsx
│       │       │   ├── events/
│       │       │   │   ├── EventBuilder.jsx
│       │       │   │   ├── EventCard.jsx
│       │       │   │   └── PlacementDriveCard.jsx
│       │       │   ├── outcomes/
│       │       │   │   ├── PlacedStudentTable.jsx
│       │       │   │   ├── PlacementStatsPanel.jsx
│       │       │   │   ├── TransitionFunnel.jsx
│       │       │   │   └── NAACReportExport.jsx
│       │       │   └── settings/
│       │       │       ├── VerificationFlow.jsx
│       │       │       ├── IntegrationRow.jsx
│       │       │       ├── RoleMatrix.jsx
│       │       │       └── AuditLogTable.jsx
│       │       ├── hooks/
│       │       │   ├── useInstitution.js       ← primary institution data hook
│       │       │   ├── useInstStudents.js
│       │       │   ├── useInstTasks.js
│       │       │   ├── useInstCohorts.js
│       │       │   ├── useInstEvents.js
│       │       │   ├── useInstIntelligence.js
│       │       │   ├── useInstVerification.js
│       │       │   └── useInstPermissions.js
│       │       ├── services/
│       │       │   ├── institutionService.js    ← Supabase CRUD wrappers
│       │       │   ├── taskPropagation.js       ← task push to student accounts
│       │       │   ├── eloSync.js               ← ELO event listener
│       │       │   ├── placementService.js
│       │       │   ├── verificationService.js
│       │       │   └── pulsePublisher.js        ← publish to Pulse
│       │       ├── store/
│       │       │   └── institutionStore.js      ← Zustand or Context store
│       │       ├── models/                      ← TypeScript interfaces or JSDoc types
│       │       │   ├── institution.js
│       │       │   ├── instStudent.js
│       │       │   ├── instTask.js
│       │       │   ├── instCohort.js
│       │       │   ├── instEvent.js
│       │       │   ├── instGroup.js
│       │       │   ├── instOutcome.js
│       │       │   ├── verification.js
│       │       │   └── transition.js
│       │       └── constants/
│       │           ├── instRoles.js
│       │           ├── instTaskTypes.js
│       │           └── instVerificationSteps.js
│       ├── shared/                              ← cross-path shared components
│       │   ├── components/
│       │   ├── hooks/
│       │   └── utils/
│       ├── lib/
│       │   └── db.js                           ← Supabase client
│       ├── config/
│       │   └── plans.js
│       └── App.jsx                             ← path router
```

## Routing Model

```jsx
// App.jsx — path-level routing
<Routes>
  <Route path="/institution/*" element={<InstitutionPathGuard />}>
    <Route index element={<InstHome />} />
    <Route path="intelligence" element={<InstIntelligence />} />
    <Route path="tasks" element={<InstTasks />} />
    <Route path="tasks/:taskId" element={<InstTaskDetail />} />
    <Route path="people" element={<InstPeople />} />
    <Route path="community" element={<InstCommunity />} />
    <Route path="groups" element={<InstGroups />} />
    <Route path="groups/:groupId" element={<InstGroupDetail />} />
    <Route path="cohorts" element={<InstCohorts />} />
    <Route path="cohorts/:cohortId" element={<InstCohortDetail />} />
    <Route path="events" element={<InstEvents />} />
    <Route path="events/:eventId" element={<InstEventDetail />} />
    <Route path="opportunities" element={<InstOpportunities />} />
    <Route path="outcomes" element={<InstOutcomes />} />
    <Route path="settings/*" element={<InstSettings />} />
  </Route>
</Routes>
```

## InstitutionPathGuard
```jsx
function InstitutionPathGuard() {
  const { userData, user } = useAuth()
  const { verificationStatus } = useInstVerification(userData?.institution_id)

  if (userData?.path !== "institution") return <Navigate to="/onboarding" />
  if (!userData?.onboarding_complete) return <Navigate to="/onboarding" />

  return (
    <div style={{ display: "flex" }}>
      <InstNav verificationStatus={verificationStatus} />
      <main style={{ flex: 1 }}>
        {verificationStatus === "unverified" && <InstVerificationBanner />}
        <Outlet />
      </main>
    </div>
  )
}
```

---

# SECTION 20 — ENTITY AND WORKFLOW MODELS

## Core Entities

### Institution
```js
Institution {
  id: uuid
  name: string
  slug: string                        // institution-name-slug
  type: "university" | "college" | "training" | "corporate"
  email_domain: string               // iitdelhi.ac.in
  website: string
  address: { city, state, pincode }
  established_year: number
  accreditation: { type, grade, year }  // NAAC A++
  logo_url: string
  cover_url: string
  description: string
  admin_ids: uuid[]
  verification_state: VerificationState
  plan: "org_trial" | string
  created_at: timestamp
  follower_count: number
  student_count: number
}
```

### VerificationState
```js
VerificationState {
  level: 0 | 1 | 2 | 3 | 4           // 0=none, 4=fully verified
  email_verified: boolean
  email_verified_at: timestamp
  domain_verified: boolean
  domain_method: "dns" | "html" | "manual"
  domain_verified_at: timestamp
  document_submitted: boolean
  document_status: "not_submitted" | "under_review" | "approved" | "rejected"
  document_rejection_reason: string
  admin_identity_verified: boolean
  admin_identity_status: "not_submitted" | "under_review" | "approved" | "rejected"
  under_review: boolean
  suspended: boolean
  fully_verified_at: timestamp
}
```

### InstitutionStudent
```js
InstitutionStudent {
  id: uuid
  institution_id: uuid
  student_user_id: uuid              // links to Supabase auth user
  student_id: string                 // roll number / student ID
  department: string
  batch: string                       // "2022-26"
  year: number
  email: string
  status: "active" | "drifting" | "at_risk" | "placed" | "transitioning" | "graduated"
  elo_current: number
  elo_at_enrollment: number
  elo_at_placement: number | null
  job_readiness_score: number        // 0–100
  cohort_ids: uuid[]
  tasks_assigned: number
  tasks_completed: number
  placement_state: PlacementState | null
  linked_at: timestamp
  last_active: timestamp
  verification_state: "pending" | "email_match" | "verified"
}
```

### PlacementState
```js
PlacementState {
  student_id: uuid
  institution_id: uuid
  company: string
  role: string
  ctc_lpa: number
  offer_date: date
  joining_date: date | null
  status: "offered" | "accepted" | "declined" | "joined" | "rescinded"
  confirmed_by: uuid                  // TPO user id
  confirmed_at: timestamp
  upgraded_to_professional: boolean
  professional_upgrade_date: timestamp | null
  uan_verification_status: "not_started" | "in_progress" | "verified" | "expired"
  uan_verification_deadline: timestamp | null
}
```

### InstitutionTask
```js
InstitutionTask {
  id: uuid
  institution_id: uuid
  created_by: uuid                   // faculty user id
  title: string
  description: string
  type: "dsa" | "sql" | "aptitude" | "communication" | "project" | "assessment" | "interview_prep" | "custom"
  difficulty: "easy" | "medium" | "hard" | "expert"
  submission_type: "code" | "file" | "text" | "link"
  review_mode: "auto" | "manual" | "peer"
  target_audience: {
    cohort_ids: uuid[]
    department_ids: string[]
    batch_ids: string[]
    elo_range: { min: number, max: number } | null
    skill_gap_tags: string[]
    custom_student_ids: uuid[]
  }
  resources: { type: "link" | "pdf" | "code", url: string, label: string }[]
  scoring_rubric: RubricItem[]
  follow_up: {
    on_non_submission: { action: "assign_task" | "add_cohort" | "notify_faculty", target_id: uuid }
    on_failure: { action: "assign_task" | "add_cohort", target_id: uuid }
  }
  status: "draft" | "published" | "closed"
  published_at: timestamp | null
  due_date: timestamp
  grace_period_hours: number
  created_at: timestamp
  // Computed fields:
  total_assigned: number
  total_submitted: number
  total_reviewed: number
  avg_elo_delta: number
}
```

### InstitutionCohort
```js
InstitutionCohort {
  id: uuid
  institution_id: uuid
  name: string
  type: "skill" | "intervention" | "placement" | "domain" | "custom"
  description: string
  faculty_owner_id: uuid
  mentor_ids: uuid[]
  student_ids: uuid[]
  goal: {
    elo_target: number | null
    tasks_target: number | null
    job_readiness_target: number | null
    custom_goal: string
  }
  milestones: Milestone[]
  duration_weeks: number
  start_date: date
  end_date: date
  status: "draft" | "active" | "completed" | "archived"
  auto_alert: {
    on_student_falling_behind: boolean
    alert_threshold_percent: number  // alert if <X% of goal met
    notify_faculty: boolean
    notify_admin: boolean
  }
  created_at: timestamp
  // Computed:
  avg_elo_start: number
  avg_elo_current: number
  elo_uplift: number
  completion_percent: number
  on_track_count: number
  at_risk_count: number
}
```

### InstitutionEvent
```js
InstitutionEvent {
  id: uuid
  institution_id: uuid
  type: "lecture" | "guest_talk" | "mock_interview" | "placement_drive" | "webinar" | "hackathon" | "office_hours" | "mentor_session"
  title: string
  description: string
  host_id: uuid
  guest_speakers: { name: string, designation: string, company: string, photo_url: string }[]
  date: timestamp
  duration_minutes: number
  venue: string | null
  mode: "in_person" | "online" | "hybrid"
  meeting_link: string | null
  capacity: number | null
  target_audience: { all: boolean, department_ids: string[], cohort_ids: uuid[] }
  registration_required: boolean
  registrations: { student_id: uuid, registered_at: timestamp }[]
  attendance: { student_id: uuid, attended: boolean }[]
  recording_url: string | null
  resources: { label: string, url: string }[]
  follow_up_task_id: uuid | null
  feedback_form_id: string | null
  status: "draft" | "published" | "live" | "completed" | "cancelled"
  // For placement drives:
  drive_details: {
    company: string
    roles: { title: string, ctc_lpa: number }[]
    eligibility: { departments: string[], min_elo: number, min_cgpa: number, batch: string }
    process: string[]   // ["Aptitude", "Technical", "HR"]
  } | null
}
```

### PulsePost (institution publishes to Pulse)
```js
PulsePost {
  id: uuid
  source_type: "institution"
  source_id: uuid                    // institution_id
  content_type: "announcement" | "placement_milestone" | "event" | "task_launch" | "achievement"
  title: string
  body: string
  media_url: string | null
  audience: "followers" | "public" | "institution_only"
  published_at: timestamp
  reach_count: number               // followers who saw it
  reaction_counts: { [key: string]: number }
}
```

## Permissions Model

```js
INST_PERMISSIONS = {
  admin: ["*"],                      // full access
  tpo: [
    "home.view", "home.alert.dismiss",
    "intelligence.view",
    "tasks.view",
    "people.view", "people.student.edit", "people.recruiter.manage",
    "community.post", "community.moderate",
    "groups.view", "groups.create",
    "cohorts.view",
    "events.view", "events.create", "events.manage_drives",
    "opportunities.*",
    "outcomes.*",
    "settings.view",
  ],
  faculty: [
    "home.view",
    "intelligence.view.own_dept",
    "tasks.view", "tasks.create", "tasks.publish", "tasks.review",
    "people.view.own_dept",
    "community.post", "community.moderate.own_dept",
    "groups.view", "groups.create", "groups.manage.own",
    "cohorts.view", "cohorts.create", "cohorts.manage.own",
    "events.view", "events.create.own",
  ],
  mentor: [
    "home.view.limited",
    "people.view.mentees",
    "community.post",
    "groups.view.own",
    "cohorts.view.own",
    "events.view", "events.create.own",
  ],
  recruiter: [
    "intelligence.view.aggregate",
    "intelligence.leaderboard.view",
    "community.view.public",
    "events.view", "events.register",
    "opportunities.view", "opportunities.create",
  ],
}
```

---

# SECTION 21 — PRIORITIZED IMPLEMENTATION ROADMAP

## Sprint 0 (Week 1–2) — Foundation
Critical blocker: nothing else can be built without these.
- [ ] Supabase schema migration: all institution tables (institution, institution_students, institution_tasks, institution_cohorts, institution_events, placement_states, verification_states)
- [ ] `/paths/institution/` folder structure scaffolded
- [ ] `InstNav.jsx` with all 11 page links
- [ ] `InstitutionPathGuard.jsx` with role + verification checks
- [ ] `useInstitution.js` hook — loads institution data from Supabase
- [ ] `InstVerificationBanner.jsx` — unverified warning across all pages
- [ ] `institutionService.js` — CRUD wrappers for all tables

## Sprint 1 (Week 3–4) — Verification System
Blocks trust model and student invitations.
- [ ] Settings → Verification section with 4-step progress UI
- [ ] Email domain verification (OTP flow)
- [ ] DNS TXT / HTML file verification flow
- [ ] Document upload (Supabase Storage bucket, metadata table)
- [ ] Verification state machine in `verificationService.js`
- [ ] Trust badge component `InstBadge.jsx` (all 5 states)
- [ ] Manual review queue (Capabilio admin — basic webhook notification)

## Sprint 2 (Week 5–6) — People + Student Link
- [ ] People page: Students / Faculty / Pending tabs
- [ ] Student invitation flow (email domain gate)
- [ ] Student ↔ institution linking (`institution_students` record created)
- [ ] `InstStudentRow.jsx` alive component
- [ ] Faculty invite + role assignment flow
- [ ] `InstPersonRow.jsx` with all states (active, drifting, at-risk)
- [ ] Student ID + batch + department fields on student side

## Sprint 3 (Week 7–9) — Tasks Engine (most complex)
- [ ] Task builder UI (`TaskBuilder.jsx`) — full form with audience selector
- [ ] `TaskAudienceSelector.jsx` — by cohort/dept/ELO range/tags
- [ ] Task publish → `taskPropagation.js` creates StudentTask records
- [ ] Student side: institution tasks appear in student task feed with institution badge
- [ ] Task completion tracking — student submits → count updates on institution side
- [ ] Manual review queue for faculty (`TaskSubmissionReview.jsx`)
- [ ] Auto ELO delta after submission (for auto-review tasks)
- [ ] Task reminder flow (send notification to non-submitters)
- [ ] Task templates gallery

## Sprint 4 (Week 10–11) — Home + Intelligence
- [ ] `HomeAlerts.jsx` — alert bar with real data
- [ ] `HomePulseCards.jsx` — 4 alive KPI cards (cohort health, ELO, placement, tasks)
- [ ] `HomeActivityFeed.jsx` — real-time event stream from Supabase realtime
- [ ] `HomeUpcoming.jsx` — upcoming events + recommended interventions
- [ ] Intelligence: ELO distribution chart
- [ ] Intelligence: Placement funnel chart with bottleneck callouts
- [ ] Intelligence: Dept performance table
- [ ] Intelligence: Leaderboard (sortable, filterable, exportable)
- [ ] `InstKPICard.jsx` — alive card component (reusable across all pages)

## Sprint 5 (Week 12–13) — Cohorts
- [ ] Cohort builder wizard (5-step)
- [ ] Cohort cards with progress, ELO delta, at-risk count
- [ ] Cohort detail page: Overview / Students / Tasks / Sessions tabs
- [ ] Auto-alert system (student falls behind → notify faculty)
- [ ] Student side: cohort appears as "My Programs" in student account
- [ ] Cohort ELO uplift tracking (retrospective)

## Sprint 6 (Week 14–15) — Events + Opportunities
- [ ] Event builder with all event types
- [ ] Event registration flow
- [ ] Placement drive card with eligibility, roles, process
- [ ] Drive registration → notification to eligible students
- [ ] Opportunities page: Jobs / Internships / Hackathons / Recruiter CRM
- [ ] Recruiter pipeline CRM view for TPO

## Sprint 7 (Week 16–17) — Outcomes + Transitions
- [ ] Placed students table with TPO confirmation flow
- [ ] Placement state machine implementation
- [ ] NAAC report export (PDF via `pdf` skill)
- [ ] Student upgrade prompt (student side)
- [ ] Professional transition state tracking
- [ ] UAN/EPFO verification flow (manual document upload first, API later)
- [ ] Verification funnel in Outcomes tab

## Sprint 8 (Week 18–19) — Community + Groups
- [ ] Institution feed with post composer
- [ ] Post types: Announcement / Placement Milestone / Event
- [ ] Pulse publisher (`pulsePublisher.js` — push to follower feeds)
- [ ] Department feeds
- [ ] Placement Wall
- [ ] Groups: create / join / manage
- [ ] Group detail: Feed / Members / Tasks / Resources tabs
- [ ] Basic moderation (report, hide, review queue)

## Sprint 9 (Week 20–21) — Settings + Integrations
- [ ] Full Settings page with all 10 sections
- [ ] Internal connections panel with live sync status
- [ ] Integration rows (Google Workspace, Zoom — functional)
- [ ] Audit log viewer
- [ ] Role permission matrix UI
- [ ] Billing section (trial status, upgrade CTA)
- [ ] Data export (student roster CSV, placement report Excel)

## Sprint 10 (Week 22–23) — Polish + Performance
- [ ] Design system audit: all pages match token spec
- [ ] Mobile responsive pass (all pages)
- [ ] Empty states for all pages and tabs
- [ ] Loading skeleton states (not spinners) for all data fetches
- [ ] Error boundaries with retry mechanisms
- [ ] Supabase RLS policies for all institution tables
- [ ] Performance: paginate large tables (students, tasks, submissions)
- [ ] Analytics: integrate basic event tracking

---

## What to Cut from the Current Codebase

| Current Element | Decision | Reason |
|----------------|----------|--------|
| `authority` form inside Onboarding | **Keep + redirect** | Still used for executive path. Institution path now has its own flow. |
| Static KPI tiles in OrgHome.jsx | **Remove** | Replace entirely with Sprint 4 Home page |
| `authorityType` column usage | **Migrate** | Move to `institution_type` + `org_type` fields |
| The single "Setup" onboarding step | **Expand** | Replace with multi-step org onboarding already built (org-college / org-company screens) |
| Vague "Integrations" mention | **Replace** | Sprint 9 Settings with full integration architecture |
| Any hardcoded department lists | **Move to DB** | Departments should be configurable per institution |

---

## API Contract Summary

### Key Supabase Tables Required
```sql
institutions
institution_students
institution_tasks
institution_task_submissions
institution_cohorts
institution_cohort_members
institution_events
institution_event_registrations
institution_groups
institution_group_members
institution_placements
institution_verification
institution_audit_log
pulse_posts
student_tasks                    -- extends student path
```

### Key Realtime Subscriptions
```js
// Institution home page — live activity feed
supabase.channel('institution:${id}')
  .on('postgres_changes', { event: 'INSERT', table: 'institution_task_submissions' }, handler)
  .on('postgres_changes', { event: 'INSERT', table: 'institution_students' }, handler)
  .on('postgres_changes', { event: 'UPDATE', table: 'institution_placements' }, handler)
  .subscribe()
```

### Row Level Security Principles
```sql
-- Students can only see their own institution's data
CREATE POLICY "students_see_own_institution"
ON institution_tasks FOR SELECT
USING (
  institution_id IN (
    SELECT institution_id FROM institution_students
    WHERE student_user_id = auth.uid()
  )
);

-- Faculty can only manage tasks they created or in their department
CREATE POLICY "faculty_manage_own_tasks"
ON institution_tasks FOR ALL
USING (created_by = auth.uid() OR institution_id IN (
  SELECT institution_id FROM institution_admins WHERE user_id = auth.uid()
));
```

---

*End of Blueprint — Version 1.0*
*This document is intended for direct use by the engineering and design team building the Capabilio Institution Path.*
*All decisions in this document supersede the current OrgHome.jsx implementation.*
