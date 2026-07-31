# Capabilio Organisation Path — Coordination Layer Design

**Status:** Design proposal (not yet implemented beyond what's marked "EXISTING")
**Scope:** Organisation Path only (college/university admin, placement cell, recruiters connected to that institution). Not applicable to Student, Professional, or Executive/Authority paths.
**Author context:** Grounded directly in the live Supabase schema (project `eybchcqwbizjmzyrviri`) as of 2026-07-31, not a greenfield sketch — every entity below is checked against what's actually in production.

---

## 0. What already exists (don't rebuild this)

Before proposing anything, here's the real current state, traced end to end:

- **`institutions`** — one row per college/university. `admin_user_id` is the account owner.
- **`institution_staff`** — role-based staff roster. Real `role` values in prod: `college_admin`, `placement_officer`, `professor`, `dept_head`, `mentor`. `department`, `scope` (`own_department` / `all_departments`), `status` (`invited`/`active`/`revoked`).
- **`institution_students`** — the canonical student roster, FK-correct, with `elo_current`, `job_readiness_score`, `department`, `batch`, `shared_with_recruiters`, `status`.
- **`institution_chat_threads` / `institution_chat_messages`** — **already built and live** (this session). Two thread kinds by `recruiter_id`: channels (`NULL`, open to all active staff roles) and recruiter threads (placement-tier staff + the specific recruiter only). RLS + backend tier checks in lockstep. Messages append-only (audit trail by design).
- **`recruiter_invites`**, **`interviews`**, **`offers`**, **`institution_placements`** — the placement pipeline: recruiter discovers a student → invites/interview → offer → student responds → placement record. All live, all wired to real routes in `college.js`.
- **`company_connections`** — institution ↔ recruiter-org relationship (NDA/partnership status).
- **`notifications`** — single shared notification store, already read by the student bell, the institution Notification Center, and chat message alerts.
- **`org_join_links`** — legacy self-serve join-link system (separate from the canonical schema above, still live, out of scope here).
- **`jobs`** — company-wide job board (`company_id`/`startup_id` scoped). **Not** campus-specific — confirmed no `institution_id` column. This means "job drive" / "placement campaign" genuinely does not exist as an entity yet.

**Implication for this design:** the messaging substrate (threads, messages, RLS, tiered access, notifications) is done. What's missing is the *coordination* layer on top — linking a conversation to a workflow object, turning a message into a task/approval, and structured routing. That's the actual gap, and it's what this document scopes.

---

## 1. Summary of the coordination layer

Capabilio's Organisation Path coordination layer is **not a chat app bolted onto the platform — it's a thin, structured layer that makes every conversation accountable to a real placement-operations object** (a student, a recruiter relationship, an interview, an offer, a drive, an approval). The existing channel/thread system (built this session) is the messaging substrate; this design adds **context binding**, **status tracking**, **task/approval conversion**, and **routing** on top of it, without introducing a second messaging system, a second ELO system, or a second notification store.

Three design commitments carried through every section below:
1. **One thread model, tagged by context** — not five different chat systems for five different use cases. A "drive room" and a "student support thread" are the same `institution_chat_threads` row with a different `context_type`/`context_id`, not a new table.
2. **Messages are evidence, not just conversation** — every thread ties to something with a lifecycle (offer status, interview status, approval status), so "who said what, when, about what" is always answerable — this is what "accountability" concretely means here, and it's also what keeps this from becoming a generic social chat feature.
3. **Additive only** — every new table below has a nullable FK back into existing tables; nothing here requires touching `institution_chat_threads`' existing columns destructively, and no existing screen (roster, offers, interviews, recruiter search) changes behavior.

---

## 2. Role-based workflow map

| Role | Source of truth | Channels (internal) | Recruiter threads | Drive rooms | Approvals | Notes |
|---|---|---|---|---|---|---|
| **Institution admin** (`institutions.admin_user_id`) | `institutions` | Full — create/archive any | Full | Full — create/manage | Approve/reject any | Superset of every other role |
| **College admin** (`institution_staff.role='college_admin'`) | `institution_staff` | Full | Full | Full | Approve/reject | Placement-tier |
| **Placement officer** (`role='placement_officer'`) | `institution_staff` | Full | Full | Full | Approve/reject (scoped to placement) | Placement-tier — same tier as college_admin for chat, per existing RLS |
| **Professor / Dept head / Mentor** (`role in ('professor','dept_head','mentor')`) | `institution_staff` | Channels only, no recruiter threads | ❌ (read-only visibility if @mentioned into a channel, never into recruiter threads) | Read-only unless assigned | Can *request* (e.g. "verify this student"), cannot approve recruiter-facing items | Channel-only tier — matches the live RLS split already shipped |
| **Recruiter** (connected via `company_connections`) | `company_connections` + `institution_staff`-equivalent recruiter identity | ❌ never | Only their own thread(s) | Only drives they're invited to | Can request (e.g. interview slot), cannot approve institution-internal items | Never sees channels — mirrors existing `canAccessThread` logic |
| **Student** | `institution_students` | ❌ | ❌ (one-way: receives offer/interview notifications, does not get thread access) | ❌ | Responds to their own offer only (`offers.status`) | Deliberately **not** a chat participant — see Risks §7 for why |

This table is the direct extension of the tiered access model already live in `collegeChat.js` (`PLACEMENT_ROLES` / `CHANNEL_ONLY_ROLES`) — no new tier concept, just applying it to drives and approvals too.

---

## 3. Required data objects

Legend: 🟢 EXISTING (live, unchanged) · 🆕 NEW (proposed)

### 🟢 `institution_chat_threads` (existing — gets 3 additive columns)
```
+ context_type   text   null   -- 'student' | 'recruiter_relationship' | 'interview' | 'offer' | 'approval' | 'drive' | null (general channel)
+ context_id     uuid   null   -- FK target depends on context_type (enforced in app layer, not a DB FK, since it's polymorphic)
+ status_tag     text   null   -- 'pending' | 'reviewed' | 'approved' | 'shortlisted' | 'selected' | 'offer_sent' | null
```
Why additive columns and not a new table: a drive room *is* a channel with `context_type='drive'`. Reusing the existing table means the RLS policies, notification fan-out, and UI already built this session keep working unchanged — new context is metadata, not a new object.

### 🆕 `placement_drives` (campaigns / job-drive rooms)
```
id                uuid pk
institution_id    uuid fk -> institutions
company_id        uuid fk -> profiles (recruiter org) / company_connections
title             text        -- "TCS Campus Drive — Aug 2026"
job_id            uuid fk -> jobs (nullable — a drive can exist before a jobs row does)
eligible_branches jsonb       -- department filter, mirrors institution_students.department values
min_elo           numeric
status            text        -- 'planned' | 'active' | 'closed'
created_by        uuid fk -> auth.users
created_at        timestamptz
```
A drive is the missing entity identified in §0 — `jobs` is company-wide, not campus-specific. This is the one genuinely new "business object," everything else is coordination scaffolding around existing objects.

### 🆕 `chat_followups` (chat-to-task conversion)
```
id             uuid pk
thread_id      uuid fk -> institution_chat_threads
message_id     uuid fk -> institution_chat_messages (nullable — a followup can be created without pinning to one message)
created_by     uuid fk -> auth.users
assigned_to    uuid fk -> auth.users (nullable — unassigned = institution-wide)
title          text
due_at         timestamptz null
status         text        -- 'open' | 'done' | 'dismissed'
created_at     timestamptz
```
Deliberately its own lightweight table, **not** a reuse of `org_tasks` (that table is the legacy professor-assignment/Arena-task system — semantically a different concept; reusing it would silently couple chat follow-ups to Arena task-completion logic and its ELO-adjacent side effects, which is exactly the "hidden side effect" risk your own standing instructions flag).

### 🆕 `chat_approvals` (chat-to-approval conversion)
```
id             uuid pk
thread_id      uuid fk -> institution_chat_threads
message_id     uuid fk -> institution_chat_messages (nullable)
requested_by   uuid fk -> auth.users
approver_id    uuid fk -> auth.users (nullable until claimed)
subject        text
context_type   text        -- same enum as thread context_type
context_id     uuid null
status         text        -- 'pending' | 'approved' | 'rejected'
decided_at     timestamptz null
decided_by     uuid fk -> auth.users null
created_at     timestamptz
```
Kept separate from `chat_followups` (not a generic "action item" union type) because approvals need a decision-audit shape (who approved, when, against what) that a followup doesn't — collapsing them would either bloat followups with unused approval columns or blur the audit trail your own standing instructions require for sensitive actions.

### 🆕 `thread_participants` (explicit membership, CC-style visibility)
```
thread_id   uuid fk -> institution_chat_threads
user_id     uuid fk -> auth.users
role_in_thread text  -- 'owner' | 'member' | 'cc' | 'mentioned'
added_at    timestamptz
primary key (thread_id, user_id)
```
Currently, "who can see a thread" is computed live from `institution_staff`/`company_connections` on every request (see `getInstitutionAccess`). That's correct for *role-based* visibility (channels, recruiter threads) but can't express "this one specific professor was CC'd into this one specific recruiter conversation for this one case" — the private/shared/CC-style requirement in your spec needs explicit per-thread membership, not just role inference. This table is additive: role-based access still works exactly as today when a thread has no explicit participants row; explicit rows only *add* visibility, never subtract it.

### No new table needed for:
- **@mentions** — store as `chat_followups`/`thread_participants` rows created when a message body matches `@user`; the message text itself is already persisted in `institution_chat_messages.body`, no separate mentions table required for MVP.
- **Read receipts** — a `chat_read_state (thread_id, user_id, last_read_at)` upsert table, small and mechanical; listed here for completeness but not detailed since it's a standard pattern with no design risk.
- **File attachments** — `institution_chat_messages` gets a nullable `attachment_url`/`attachment_meta jsonb` pair, using whatever object storage the rest of the app already uses (resume uploads, etc.) rather than a new storage integration.

---

## 4. UI/UX surfaces

All of these extend `InstitutionOS.jsx`'s existing `IntelligencePage` → "Team Chat" tab (already shipped this session) — no new top-level page, no new nav item beyond what's there.

1. **Channel/thread list (existing, extend)** — add a context badge next to each thread (e.g. "🎓 Student: Priya S." / "🏢 TCS Drive" / "📋 Approval pending") driven by the new `context_type`/`status_tag` columns. Zero layout change, just richer row rendering.
2. **Drive room view (new)** — a dedicated view under Placement Cell → "Drives" (new sub-tab), each drive backed by a `placement_drives` row + its linked channel thread. Shows: eligible student count (computed from `eligible_branches` + `min_elo` against `institution_students`, read-only, same query shape as the existing recruiter-search matcher), drive status, and the thread inline.
3. **Context-linked thread launcher** — "Message about this" buttons added to: the student roster row (Live Roster panel), the offer detail (Offers panel), the interview row (Recruiter Activity panel). Each opens/creates a thread pre-filled with `context_type`+`context_id`, reusing the existing `startThread` API with two new optional params — no new modal system, extends the one that exists.
4. **Message → Task/Approval affordance** — a small "→ Task" / "→ Approval" action on message hover (institution staff only), writing to `chat_followups`/`chat_approvals`. Surfaces as a checklist strip above the composer, same visual language as the existing status chips already used in `InstitutionOS.jsx` (`Chip` component).
5. **Approvals inbox (new sub-tab)** — flat list of `chat_approvals` where `approver_id IS NULL OR approver_id = me`, with Approve/Reject buttons — mirrors the existing "Needs Confirmation" pattern already built for placements (`CanonicalOffersPanel`), same visual pattern, new data source.
6. **Notification Center (existing, extend)** — already reads the shared `notifications` table; new notification `type` values (`followup_assigned`, `approval_requested`, `approval_decided`, `drive_created`) slot in with zero UI change, same as chat notifications did this session.

---

## 5. Advanced capabilities (post-MVP, explicitly sequenced after §6 Phase 1–2)

Ranked by value-to-risk, not by the order listed in the original spec:

- **Smart routing** — rule-based first (e.g. "message mentions 'offer' + 'reject'" → suggest the Offers thread type; "student roll number pattern" → suggest that student's context), not ML-based initially. A routing model needs training data this product doesn't have yet; a keyword/entity-extraction heuristic against already-structured data (student roll numbers, company names in `company_connections`) delivers most of the value with none of the "AI decision in critical path" risk your standing instructions flag.
- **Auto-tagging** — same rationale: derive `context_type` automatically when a thread is started from a context-aware launcher (§4.3) — this is mechanical, not AI, and should ship in Phase 1, not "advanced."
- **Chat-to-task / chat-to-approval** — listed as "advanced" in the spec but scoped into Phase 2 here (§6) because the schema for it is cheap and it's core to "coordination, not messaging" — deferring it further would leave the MVP feeling like plain chat, contradicting the product intent.
- **Conversation summaries** — AI-generated, but explicitly **display-only, non-authoritative**: a summary is a UI convenience shown above a long thread, never written back into `offers`/`interviews`/`institution_placements` status. This satisfies "treat AI outputs as probabilistic, not authoritative" directly — the underlying data never changes because of a summary.
- **AI-assisted reply drafting** — same posture: drafts into the compose box, never auto-sends, always human-confirmed before `POST /threads/:id/messages`. No new AI-to-database write path.
- **Cross-campus support** — only relevant once an institution can have >1 `institutions` row under one umbrella account, which doesn't exist in the schema today (each `institutions` row stands alone with one `admin_user_id`). Flagged as **blocked on a separate schema decision** (multi-campus institution hierarchy), not something this coordination layer can silently assume — recommend treating as its own future design doc rather than bundling here.

---

## 6. Implementation phases

**Phase 1 — Context binding (smallest safe slice)**
- Add `context_type`/`context_id`/`status_tag` columns to `institution_chat_threads` (nullable, backward-compatible — every existing thread just has them null).
- Add "Message about this" launchers on roster/offer/interview rows (§4.3).
- Auto-tag `context_type` when threads are started from those launchers.
- No new tables yet. Ships the "workflow-linked conversations" requirement with the least schema risk.

**Phase 2 — Task & approval conversion**
- `chat_followups`, `chat_approvals` tables + RLS (mirroring the existing tiered-access pattern from `institution_chat_threads`).
- Message-hover "→ Task"/"→ Approval" UI (§4.4) and the Approvals inbox sub-tab (§4.5).
- New `notifications.type` values, reusing the existing notification pipe — no new delivery mechanism.

**Phase 3 — Drive rooms**
- `placement_drives` table.
- Drive sub-tab UI (§4.2), drive-scoped channel creation.
- Eligible-student count reuses the existing recruiter-match query shape (`elo_current`, `job_readiness_score`, `department` filtering) already in `college.js` — no new matching logic invented.

**Phase 4 — Explicit participants / CC visibility**
- `thread_participants` table, feature-flagged (`ENABLE_THREAD_EXPLICIT_PARTICIPANTS`) since it changes who can see a thread beyond role inference — the one change in this whole design with real access-control blast radius, so it ships gated and gets a manual RLS review before the flag flips on, per your standing instruction to flag anything that risks the existing workflow.

**Phase 5 — Read receipts, attachments, mentions surfacing**
- Mechanical, low-risk, no ordering dependency on anything above — can be pulled forward or slotted in parallel with Phase 2–4 engineering capacity permitting.

**Deferred, not scheduled:** conversation summaries, AI reply drafting, smart routing beyond keyword rules, cross-campus. All explicitly gated behind product demand, same posture as the third-party integrations decision from earlier this session — build when something concrete asks for it, not speculatively.

---

## 7. Risks and assumptions

- **Students are intentionally excluded from threads in this design.** The spec says "student support threads" and "students receiving interview/offer updates" — those are two different things. Students already receive offer/interview updates via `notifications` (one-way, correct). Giving students two-way thread access into placement-cell coordination space is a materially different feature (support ticketing) with its own moderation/spam/scale concerns for a "1000 students/college" system — recommend treating "student support threads" as a **separate, smaller feature** (a lightweight student→placement-cell inbox, one-way-initiated) rather than folding students into the same `institution_chat_threads` access model built for staff/recruiters. Flagging this now rather than silently scoping it in.
- **`placement_drives.company_id` assumes a stable recruiter-org identity.** Today, `company_connections.recruiter_org_id` is the closest concept; needs confirming against how recruiter accounts are actually modeled in `profiles` before Phase 3 schema is finalized — noted as an open question, not assumed.
- **Polymorphic `context_id` has no DB-level FK.** This is a deliberate trade-off (same one already accepted for `notifications.entity_id`/`entity_type` in the existing schema) — application-layer validation only. Acceptable because it matches an existing, working pattern in this codebase, not a new risk class.
- **`thread_participants` is the one component with real access-control risk** (§6 Phase 4) — everything else in this design only *adds* new optional metadata or new tables with their own independent RLS; this one can change who sees an existing thread. Feature-flagged for that reason.
- **AI features (summaries, drafting, smart routing) are scoped to never write back into placement-of-record data** (`offers`, `interviews`, `institution_placements`, ELO). This is a hard line, not a soft preference — matches your standing instruction that AI outputs must never enter scoring/assessment logic without safeguards.
- **This design does not touch `org_join_links` or the legacy `org_members`/`org_tasks` system.** Those remain a separate, pre-existing track (flagged in earlier work this session) — out of scope here, not silently merged in.
