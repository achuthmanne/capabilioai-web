# Trust & Verification System — Full Trace + ADR

**Date:** 2026-07-20 · **Author:** Engineering (traced live against the `capabilio` Supabase project, ref `eybchcqwbizjmzyrviri`, and the current `backend/server` + `frontend/src` trees)
**Companion to:** `CERTIFICATION_FRAMEWORK.md` (Phase B / PC-5), `CERTIFICATION_AUDIT_2026-07-16.md`

This is a trace, not a proposal. Every claim below was verified by reading the actual route/lib file or querying the live database schema (`information_schema`, `pg_policies`, `pg_proc`) — nothing here is inferred from naming conventions or specs. Where a finding contradicts what a spec document implies, the code/DB wins and the discrepancy is called out explicitly.

---

## 0. Headline finding, stated up front

**There is no single "Trust & Verification System" today. There are four parallel, disconnected systems that all touch verification-adjacent state, none of which unify into the badge/history/explainability model in the roadmap.** Building Phase 2 UI against any one of them in isolation will either show incomplete data or silently contradict one of the others. This is the central fact the ADR (§9) is built around.

The four systems:

| # | System | Files | Writes to | Status |
|---|--------|-------|-----------|--------|
| 1 | **New Trust & Verification Center** (the framework named in code comments as "Phase 1") | `routes/verification.js`, `lib/verification/*` | `verification_audit_log`, `proof_objects.trust_level` | Real, hash-chained, auth-safe. Only 2 of 9 providers actually verify anything. |
| 2 | **Legacy stub verify routes** | `routes/verify.js` | `profiles.certifications[].verificationStatus`, `profiles.experiences[].verificationStatus`, `profiles.epfo_verified` | Auth-safe (post PC-5a fix) but DigiLocker/EPFO-OTP are hardcoded stubs. Certificate-file upload does real OCR+LLM matching. |
| 3 | **Professional-profile EPFO + ELO/Aura recompute** | `routes/professionalProfile.js` | `epfo_verifications` (table does not exist — see §1.3), `profiles.verification_state`, `profiles.role_elo/market_elo/proof_elo/mobility_elo/aura_score` | `/pro/epfo/submit` is **broken at runtime** (inserts into a non-existent table). ELO recompute is real code but is a market-employability score, not a verification-explainability score. |
| 4 | **Direct client writes to `profiles`** | `frontend/src/lib/db.js` (`userDoc.set`), several hooks | `profiles.certifications`, `profiles.experiences`, `profiles.education`, etc., straight from the browser | **RLS does not block this.** See §2.4 — this is the most serious open finding in this trace. |

None of these four know about each other. A certificate verified via system #2 does not appear in system #1's audit log. A proof object's `trust_level` in system #1 has no relationship to `certifications[].verificationStatus` in system #2. Vault documents (a fifth, adjacent system, §3) aren't linked to any of them by foreign key.

---

## 1. Backend — routes, pipeline, providers, audit log

### 1.1 Route inventory and classification

| Route | File | Auth | Classification | Notes |
|---|---|---|---|---|
| `GET /api/verification/providers` | `routes/verification.js` | public | **Production Ready** | Honest listing — returns `capability:'unsupported'` for anything not real. |
| `GET /api/verification/integrity` | `routes/verification.js` | public | **Production Ready** | Recomputes the whole hash chain on demand; returns first broken link if any. |
| `GET /api/verification/audit/mine` | `routes/verification.js` | `requireAuth` | **Production Ready** | Returns caller's own audit rows only (RLS + explicit `user_id` filter). |
| `POST /api/verification/verify` | `routes/verification.js` | `requireAuth`, `uid` from JWT | **Partial** | Route itself is solid; only 2/9 registered providers (`github`, `certificate_ocr`) do real work — the other 7 throw a clean 4xx by design (`PROVIDER_UNSUPPORTED`). |
| `POST /api/verify/digilocker/init` `/confirm` | `routes/verify.js` | `requireAuth` | **Stub** | Any OTP ≠ `"000000"` passes. No real DigiLocker call anywhere in the codebase. |
| `POST /api/verify/epfo/init` | `routes/verify.js` | `requireAuth` | **Stub** | OTP trigger only, no real UAN lookup. |
| `POST /api/verify/epfo/confirm` | `routes/verify.js` | `requireAuth`, `uid` from JWT | **Partial** | The employer-name **matching logic** (`matchEpfoToExperiences`) is real and does genuine fuzzy-matching against the user's own `profiles.experiences`; the **EPFO data itself is synthetically generated from the user's own claimed employers** (`toLegalName()` reformats what the user already typed), so it can never actually catch a false claim — it can only confirm internal consistency. This is a materially different (weaker) guarantee than "confirmed with EPFO." |
| `POST /api/verify/certification` | `routes/verify.js` | `requireAuth` | **Stub** | Any non-empty `certId` passes. |
| `POST /api/verify/certification-file` | `routes/verify.js` | `requireAuth` | **Production Ready (for what it claims)** | Real PDF/image text extraction (pdf-parse / Gemini) + Groq LLM match against the claimed name/issuer. Explicitly documented in its own header comment as OCR/text-match, **not** a cryptographic or issuer-API check — this honesty is already in the code and should be preserved verbatim in any Phase 2 copy. This is the **same logic** now duplicated as `lib/verification/providers/certificateOcr.js` — see §1.4 for the duplication risk. |
| `POST /api/pro/epfo/submit` | `routes/professionalProfile.js` | `requireAuth` | **Stub / Broken** | Inserts into `epfo_verifications`, a table that **does not exist** in the live database (`information_schema` query returned zero rows). This route will throw a 500 on first real call. It is dead/unfinished code, not a working parallel path — see §7 for whether to delete or finish it. |
| `GET /api/pro/epfo/status` | `routes/professionalProfile.js` | `requireAuth` | **Broken** | Same reason — queries a table that isn't there; always falls through to the catch and returns `{status:"none"}`, silently. |
| `POST /api/pro/elo/recompute`, `POST /api/pro/profile` (ELO side-effect) | `routes/professionalProfile.js` | `requireAuth` | **Production Ready (as an ELO score)**, **not a verification mechanism** | See §5. |

### 1.2 Provider registry (`lib/verification/providers/registry.js`)

Flat map pattern, same shape as `arena-v2/workstation-router`. Adding a provider = one file + one entry in `PROVIDER_MODULES`. This part of the architecture is genuinely good and should be preserved and extended, not replaced.

| Provider id | `capability` | Real or stub | Mechanism |
|---|---|---|---|
| `github` | `api` | **Real** | GitHub REST API `GET /repos/{owner}/{repo}`, checks existence + owner match. Honest 100%/90%/0 confidence tiers. |
| `certificate_ocr` | `manual_review` | **Real, but bounded** | pdf-parse / Gemini image OCR → Groq LLM asked "does this text match the claim." Explicitly documented as not cryptographic. |
| `aws`, `microsoft`, `cisco`, `digilocker`, `employer_epfo`, `university`, `employer` | `unsupported` | **Honest stub** | `verify()` always throws; `pipeline.js` intercepts capability `'unsupported'` before even calling it, so this can never silently produce a false "verified." This fail-fast-at-the-boundary design is correct and worth keeping. |

### 1.3 Verification pipeline (`lib/verification/pipeline.js`)

`runVerification()` does exactly three things, in order: (1) dispatch to the provider, (2) append a hash-chained audit entry regardless of outcome, (3) if and only if `result.status === 'verified'` **and** a `proofObjectId` was passed, promote that proof object's `trust_level` to `'verified'`. If the trust_level write fails, it's logged and swallowed — the audit entry (already written) is treated as the source of truth, and the trust_level become a "display-layer" reconciliation concern. This is a deliberate, reasonable design choice already documented in the code.

**Gap:** this pipeline only ever writes to `proof_objects.trust_level`. It has no awareness of `profiles.certifications`, `profiles.experiences`, `career_timeline.verification_state`, or `vault_documents` — so running a verification through this new framework does **not** update any of the older per-entity verification flags. A user could be "verified" in the audit log and still show as unverified everywhere else in the UI.

### 1.4 Duplication already present

`lib/verification/providers/certificateOcr.js` and `routes/verify.js`'s `certification-file` handler are two independent implementations of the same OCR+LLM-match logic (same pdf-parse call, same Gemini fallback, near-identical Groq prompt). The `routes/verification.js` file header even says this out loud: *"Migrating verify.js's certification-file route to call this pipeline instead of duplicating its own OCR logic is a natural follow-up, not done in this slice."* That follow-up has not happened yet — this is a concrete, already-acknowledged piece of technical debt, not a new observation.

### 1.5 Audit log (`lib/verification/auditLog.js`) + hash chain

- Table: `verification_audit_log`. PK is `seq` (bigint, auto-increment) — this, not `id`, is the append-order anchor the chain relies on.
- Each row stores `prev_hash` and `entry_hash`. `entry_hash = sha256(prev_hash + canonicalJSON(payload))`, where payload = `{user_id, proof_object_id, document_hash, provider_id, capability_used, result, confidence, details}`.
- `verifyChainIntegrity()` walks the **entire global chain** (not per-user) and recomputes every hash from scratch, returning the first broken link. This is genuinely the "Hash Anchored" mechanism the roadmap asked for — it already exists, is exposed publicly at `GET /api/verification/integrity`, and reveals no PII (pass/fail + row number only).
- **This satisfies the roadmap's "immutable, tamper-evident history" requirement already**, for the new framework's own writes. It does **not** cover writes made through systems #2–#4 above (verify.js, professionalProfile.js, direct client writes) — those leave no audit trail at all.
- No public blockchain anchoring exists, and the code's own comment explains this was a deliberate substitution ("same tamper-evidence property, no wallet, no gas, no new chain dependency") — worth preserving that framing if Phase 5 (external anchoring) is ever revisited.

---

## 2. Database — tables, keys, RLS, versioning

Traced directly against the live Supabase project (`list_migrations`, `information_schema`, `pg_policies`, `pg_proc`), not from local `.sql` files — **the local repo has no `supabase/migrations/` directory and no loose `.sql` file defines `proof_objects`, `education_profile`, or `verification_audit_log`.** These three tables exist only as migrations applied directly through the Supabase MCP (`20260719162511` through `20260719182329`). This is the exact "migration reconciliation" gap already flagged in `CERTIFICATION_FRAMEWORK.md` Phase F — confirmed here as still open. Anyone cloning this repo fresh cannot reconstruct current schema from the repo alone.

### 2.1 `proof_objects` (the canonical evidence table, Phase 1A unification)

- PK: `id` (uuid). FK: `user_id → profiles.id`. UNIQUE on the pair `(source, source_ref)` — idempotency key so a retried assessment/submission never double-inserts.
- `trust_level` (text, default `'self-claimed'`) is the **entire** verification-state surface on this table — no separate status/history columns.
- `publish_state`, `is_portfolio_visible`, `is_recruiter_visible` control where it surfaces — these are a **second, orthogonal** state machine from trust_level (publication vs. trustworthiness), correctly kept separate.
- **RLS: no client INSERT/UPDATE policy exists at all** — only two SELECT policies (owner, or portfolio-visible-to-authenticated). All writes are backend-only via `supabaseAdmin`, matching the code comments' claimed discipline. **Verified true, not just claimed.**
- No version history. No previous-trust_level retained. Overwritten in place by `updateTrustLevel()`. If the roadmap's "never overwrite, always version" principle is adopted, this table is the first place it needs to apply, and it's a genuine schema change (see §7, §8).

### 2.2 `verification_audit_log`

- PK: `seq` (bigint identity — the hash-chain's ordering anchor), plus a separate `id` (uuid). FK: `proof_object_id → proof_objects.id` (nullable — an audit entry can exist for a non-proof-object claim). `user_id` FK exists but resolves to `auth.users`, outside `public` schema.
- RLS: **SELECT-only, owner-scoped** (`auth.uid() = user_id`). No client insert/update policy — matches `auditLog.js`'s exclusive use of `supabaseAdmin`. **Verified true.**
- This table *is* the immutable history mechanism — append-only by construction (no UPDATE/DELETE policy, no code path that updates a row). It is not, however, linked to `vault_documents`, so an uploaded document and its resulting audit trail cannot currently be joined without going through `proof_object_id`, which is often null (e.g. certificate uploads via the old `verify.js` route never create a proof object at all).

### 2.3 `education_profile`

- One row per user (`user_id` UNIQUE). PK `id`. No FK target beyond `user_id` (no explicit FK constraint to `profiles` was found in this table specifically, unlike `proof_objects`).
- `field_sources` (jsonb) is **per-field provenance**, not a version history — it stores exactly one source label per field (`resume_import`, `institution_verified`, etc.), overwritten each time that field changes. This is the mechanism the roadmap's "Certificate V1 → V2 → Revoked → Renewed" concept is closest to today, but it tracks *who last touched a field*, not *the sequence of what happened to it*. There is no `education_versions` table anywhere in the schema — confirmed absent, not just undocumented.
- RLS: SELECT-only (owner, and a broad "readable by any authenticated user" policy — worth a product decision on whether education data should really be that open by default). No client write policy — writes are backend-only via `upsertProfile()`, matching the code's stated discipline.

### 2.4 `profiles` — the actual weak point

This is the pre-existing, organically-grown user table (200+ columns, heavy camelCase/snake_case duplication — e.g. both `vault_files` and `vaultFiles`, both `certifications` and no alias but both `experiences`/`education` in two casings elsewhere). Of direct relevance to trust/verification:

`verified`, `education_verified`, `uan_verified`, `company_email_verified`, `employment_self_confirmed`, `verification_state`, `verificationStatus`, `verifiedAuthority`, `epfo_verified`, `recruiter_trust_score`, `aura_score`, `role_elo`/`market_elo`/`proof_elo`/`mobility_elo`, `certifications` (jsonb array, each entry carries its own `verificationStatus`), `experiences` (jsonb array, same), `vault_files`.

**RLS on `profiles`:** one blanket `UPDATE` policy — `auth.uid() = id`, no column restriction — plus a trigger (`protect_profile_entitlements`) that blocks client writes to exactly **three** columns: `subscription`, `verified`, `purchased_themes`.

**Finding (new, not in `CERTIFICATION_AUDIT_2026-07-16.md`):** every other trust-adjacent column above — `certifications[].verificationStatus`, `experiences[].verificationStatus`, `education_verified`, `epfo_verified`, `verification_state`, `aura_score`, `recruiter_trust_score`, the ELO fields — is **fully client-writable today**, both in principle (RLS) and in practice: `frontend/src/lib/db.js`'s `userDoc.set(uid, payload)` does a direct `supabase.from('profiles').upsert(...)` from the browser and explicitly passes through `certifications`, `experiences`, `education` if present in `payload`. Several hooks (`useArenaMissions.js`, `SkillStudio.jsx`, `arenaSkillEngine.js`, `InstitutionOS.jsx`) also write directly to `profiles` from the client for other fields, confirming this is an established pattern in the codebase, not a one-off.

**Correction (2026-07-20, later pass):** the first version of this trace understated this — a live, shipped call site was found. `frontend/src/pages/Aura.jsx`'s `VerificationSection` (~line 769) calls `POST /api/verify/certification` (the stub in `routes/verify.js` that returns `verified:true` for any non-empty `certId`), and on a truthy response **constructs the certification object client-side including `verificationStatus:"verified"`, `verificationSource`, and `verifiedAt`** (not server-derived), then persists it via `onUpdate` → `userDoc.update()`. This is a different, more disciplined code path than the certificate-*file*-upload flow in the same file (whose own comment says "the client never sets verificationStatus itself" — that one is correct), but the ID-based cert flow does exactly what PC-7 warns about, already, in production code. This is not a theoretical RLS gap — it is a working feature that fabricates a "verified" badge from a stub that accepts any input. This is the same class of issue as PC-5a/PC-5b (already tracked) and P0-3 (partially closed) — logged as its own finding, **PC-7**, because it's a different column set than what P0-3 closed. **This is the single most important reason not to build a Phase 2 "explainable trust score" UI directly on top of `profiles` columns as they exist today** — any score computed from client-writable inputs is not trustworthy no matter how well the UI explains it, and at least one of those inputs is currently self-forgeable through a real, reachable UI flow, not just a permissive policy.

### 2.5 `vault_documents`

- PK `id` (uuid), FK `user_id → profiles.id` (implicit via RLS, not confirmed as a formal FK in the constraint query — worth confirming before Phase 2). Columns: `doc_type`, `file_name`, `storage_path`, `file_size`, `mime_type`, `tags` (text array), `is_private`, `activity_log` (jsonb array of `{action, at}` — currently only `"uploaded"` and `"downloaded"` events are ever pushed).
- **RLS: `ALL` for the owner** (`auth.uid() = user_id`, both `qual` and `with_check`). This is the one verification-adjacent table where the client can fully read/write/delete its own rows directly — appropriate for a personal document store, but means **no verification-status column should ever be added to this table directly** without moving it behind a backend-only write path, or it inherits the same problem as §2.4.
- No `trust_level`, no `verification_status`, no `proof_object_id` FK, no version column. A document uploaded here has **zero structural connection** to `verification_audit_log` or `proof_objects` today — confirmed by grepping all of `backend/server` for `vault_documents` usage: it appears only in `routes/careerTimeline.js`'s five vault endpoints, nowhere else.

---

## 3. Vault UI — upload, rendering, activity, versioning

Traced `frontend/src/components/VaultManager.jsx` (276 lines, read in full) plus its backend counterpart (`routes/careerTimeline.js` lines 171–259).

**What's real:**
- Upload → `POST /api/pro/vault/upload` → file goes to Supabase Storage bucket `vault-documents` at path `{uid}/{docType}/{timestamp}-{filename}`, then a `vault_documents` row is inserted. This actually happens; not a placeholder.
- List, filter (by `doc_type`), search (by filename), download (signed URL, 1hr expiry, appends a `"downloaded"` activity event), delete (removes both storage object and DB row) — all real, all wired to `requireAuth` + ownership checks server-side.
- Doc types supported: resume, offer letter, experience letter, certification, payslip, contract, invoice, other.

**What's placeholder or entirely absent (not "partial" — genuinely not built at all):**
- **No verification status is rendered anywhere in `VaultManager.jsx`.** No badge, no color, no icon tied to trust — the only status-like UI elements are `is_private` (🔒) and doc-type tag. A user can upload a "Certification" document here and nothing ever prompts them toward the actual verification flow (`/api/verification/verify` or `/api/verify/certification-file`), and nothing shows whether a given vault document has ever been verified.
- **No activity/lifecycle timeline beyond two event types** (`uploaded`, `downloaded`) — no "AI Extracted," "Verification Requested," "Verified," "Hash Anchored" stages exist in the data model or UI. The roadmap's lifecycle diagram (§2 of the original ask) describes a UI that does not exist in any form today, not even a stub.
- **No document versioning UI or data.** Re-uploading a file with the same `doc_type` creates a wholly independent new row (`upsert: false` on storage means even a same-named file would fail rather than version) — there is no concept of "Certificate V1 → V2" anywhere.
- **No verification queue** (Needs Review / Pending / Verified / Rejected / Expired / Revoked) — the only filter today is by document type.

**Conclusion for Vault UI:** this is a genuinely solid, secure, working document manager. It is 0% built toward the trust/verification roadmap — not partially, not as a stub — the concepts simply don't exist in this component or its API yet. Phase 2 work here is net-new UI + net-new linkage (vault_documents ↔ proof_objects/verification_audit_log), not a refactor of existing verification UI.

---

## 4. Portfolio integration — write paths

Traced `lib/arena-v2/portfolio/engine.js`, `lib/arena-v2/proofObjects/{repository,builder,academicBuilder}.js`, `routes/proofs.js`, `routes/education.js`.

The **Phase 1A "Evidence System unification"** (per code comments, dated 2026-07-20 — i.e. very recent, same day as this trace) made `proof_objects` the single canonical evidence table, replacing the older `av2_portfolio_artifacts` for the new Portfolio UI. Concretely:

| Portfolio surface | Write path | Trigger |
|---|---|---|
| Arena challenge completion → Proof | `portfolio/engine.js::recordPortfolioOutcome()` → `buildProofObjectFromAssessment()` → `proofRepo.insert()` | Every completed assessment event, **regardless of portfolio eligibility** — evidence existing is decoupled from evidence being visible (`publishState` controls that separately). |
| Legacy artifact write (`av2_portfolio_artifacts`) | Same `engine.js`, `insertArtifact()` | Still fires **only** for domain-eligible challenges — kept alive only because `arenaV2Portfolio.js` and the e2e suite still read it. This is a second, narrower, older write path running in parallel with proof_objects — explicitly flagged in the code as debt, not silently duplicated by accident. |
| Academic achievement (education route) | `routes/education.js` → `buildAcademicAchievementProofObject()` → `proofRepo.insert()` | User/institution submits an achievement via `POST /api/education/profile`. |
| Trust-level promotion | `verification/pipeline.js::runVerification()` → `proofRepo.updateTrustLevel()` | Only when a verification provider returns `status:'verified'` **and** a `proofObjectId` was supplied by the caller — most current verification call sites (`verify.js`'s stub routes) never pass one, so most verification activity today never touches `trust_level` at all. |
| Public portfolio read | `routes/proofs.js` — public, no auth, reads `proof_objects` filtered on `is_portfolio_visible=true` | No writes; this confirms `proof_objects` is genuinely the read model for the Portfolio page today. |

**Education / Experience / Skills / Certifications / Career Timeline**, specifically:
- **Education identity** (institution, degree, CGPA) → `education_profile` (backend-only writes, source-tagged).
- **Education achievements** (awards, olympiad, etc.) → `proof_objects` via `academicBuilder.js`.
- **Experience** and **Certifications** → still live as jsonb arrays on `profiles`, **not** on `proof_objects` or any dedicated table — and, per §2.4, client-writable. This is the biggest structural inconsistency: two different evidence categories (academic achievement vs. professional certification/experience) are modeled in two completely different ways with two completely different integrity guarantees.
- **Career Timeline** → its own dedicated table (`career_timeline`), with its own `verification_state` column and its own 3-state vocabulary (`unverified` / `employment_verified` / `fully_trusted`) — a **fourth** vocabulary, distinct from `proof_objects.trust_level`'s two-state model and `profiles.verificationStatus`'s.

---

## 5. Trust Score — does one exist?

**No production "Trust Score" as described in the roadmap (explainable, weighted, badge-driven) exists anywhere in this codebase.** Confirmed by an exhaustive grep for `trust_score`/`trustScore` across `backend/` and `frontend/` — zero matches.

What **does** exist, and is the closest analog:

`computeEloSignals()` in `routes/professionalProfile.js` (lines 23–64) computes four ELO-like numbers (`roleElo`, `marketElo`, `proofElo`, `mobilityElo`) plus an `auraScore` (0–100, sum of five weighted sub-scores) and a `profileCompleteness` percentage. Inputs: skill count, experience count, `vault.length` (i.e. `profiles.vault_files.length` — raw count of Vault uploads, **with no regard to whether any of them are verified**), `epfo_verified` boolean, certification count, weak-area count, job-readiness score. This runs on every `POST /api/pro/profile` and on `POST /api/pro/elo/recompute`.

Two things worth being explicit about:
1. This is a **market-employability heuristic**, not a trust/verification score. It answers "how strong does this profile look," not "how much of this is proven." Treating it as the roadmap's Trust Score would be a category error — same distinction the roadmap itself draws in point 5 ("Confidence ≠ Verification"), just applied one level up.
2. **`vault.length` directly inflates `marketElo`, `proofElo`, and `auraScore` for every document uploaded, verified or not.** Combined with §2.4's finding that vault/certification status fields are client-writable, this means the one numeric "trust-adjacent" score that does exist today can currently be inflated by uploading arbitrary unverified documents. This is a real, present product-integrity gap — not hypothetical — and should be weighed before any Phase 2 UI presents `aura_score` or `recruiter_trust_score` to a recruiter as evidence of anything.

`profiles.recruiter_trust_score` (integer, default 0) exists as a column but **no code path writes to it anywhere in the backend** (confirmed by grep) — it is a provisioned-but-unused column, not a working score.

**Conclusion:** if Phase 2 needs the "Explainable Trust" breakdown UI (identity/education/employment/projects/arena weighted contributions), that computation has to be designed and built new. It should not be built as a re-skin of `computeEloSignals()`, because that function's inputs are not verification-gated.

---

## 6. Verification Provider Matrix

| Provider | Capability (as coded) | Status | Verification method | Where |
|---|---|---|---|---|
| GitHub | `api` | **Production** | GitHub REST API — repo existence + owner match | `lib/verification/providers/github.js` |
| Certificate OCR (generic) | `manual_review` | **Production (bounded)** | pdf-parse/Gemini OCR → Groq LLM text-match against claim; explicitly not cryptographic | `lib/verification/providers/certificateOcr.js` (+ duplicate logic in `routes/verify.js`'s `certification-file`) |
| EPFO (employer matching) | n/a (not in new registry — lives in `verify.js`) | **Partial** | Real fuzzy-matching algorithm, but against synthetically-regenerated "EPFO" data derived from the user's own claims — cannot independently disconfirm a false claim | `routes/verify.js::/epfo/confirm`, `lib/employerMatch.js` |
| DigiLocker | `unsupported` (declared) / stub OTP exists separately | **Stub** | None — any OTP ≠ "000000" passes | `routes/verify.js::/digilocker/*`; honestly declared unsupported in `declared.js` |
| AWS | `unsupported` | **Stub / Planned** | None — AWS partner API or credential-ID lookup, not integrated | `lib/verification/providers/declared.js` |
| Microsoft | `unsupported` | **Stub / Planned** | None — Credly/Microsoft badge API, not integrated | same |
| Cisco | `unsupported` | **Stub / Planned** | None — Cisco credential portal API, not integrated | same |
| University / Institution | `unsupported` | **Stub / Planned** | None — no standard public API; needs per-institution partnership or DigiLocker academic records | same |
| Direct Employer | `unsupported` | **Stub / Planned** | None — no public API; would route through EPFO employer-matching path | same |

No provider exists yet for GitLab, Docker Hub, Kaggle, LeetCode, Codeforces, HackerRank, Stack Overflow, ISACA, ISC² — consistent with the roadmap's own framing that these are future "Trust Provider" candidates, not a gap in what was promised for today.

---

## 7. Gap Analysis

**Already Implemented (real, working, don't touch without reason):**
- Provider registry pattern (`registry.js`) — clean, extensible, worth reusing as-is for every new provider.
- Hash-chained, tamper-evident audit log (`verification_audit_log` + `verifyChainIntegrity()`) — already satisfies the roadmap's "hash anchored" and "audit entry" asks for anything that flows through the new pipeline.
- `proof_objects` as a backend-only-write, RLS-safe canonical evidence table.
- Vault document storage/retrieval (upload, signed download, delete, activity log for those two events) — solid, secure, ready to be extended rather than rebuilt.
- GitHub provider and Certificate-OCR provider — genuinely real verification signal, honestly capability-labeled.

**Partially Implemented:**
- EPFO employer-matching (real algorithm, weak data source).
- Verification pipeline's trust_level promotion (works, but only reachable from the new `/api/verification/verify` route, which almost nothing calls yet — the older, more-used `verify.js` routes bypass it entirely).
- Education profile provenance (`field_sources` tracks last-writer per field, but isn't a version history).

**Missing entirely (not stubbed, just absent):**
- Any 5-state badge vocabulary (Verified/Pending/Self-Claimed/Failed/Unsupported) — every existing status field is 2–3 states and they're all different from each other (see §4's "four vocabularies" finding).
- Verification UI of any kind inside Vault (badges, history timeline, detail drawer, queue).
- Document versioning (no `education_versions`, no vault_documents version column, no "revoked/renewed" states anywhere).
- Any linkage between `vault_documents` and `verification_audit_log`/`proof_objects` (no FK, no code path).
- An explainable, weighted Trust Score (only a market-ELO heuristic exists, and it's a different concept).
- `epfo_verifications` table (referenced by code, absent from the database — the referencing route is broken).
- Issuer/Trust-Provider registry surfaced anywhere in the frontend (the backend registry pattern exists; there's no admin/registry UI, and "provider" vs. the roadmap's "Trust Provider" renaming hasn't happened).

**Should Be Refactored (before or alongside Phase 2, not as part of it):**
- Consolidate `certificateOcr.js` and `verify.js`'s duplicate OCR logic into one implementation (already flagged in-code as a known follow-up).
- Route `verify.js`'s certification-file and EPFO-confirm flows through the new pipeline (`runVerification()`) so they produce audit-log entries and (where a proof object exists) `trust_level` updates, instead of writing directly to `profiles` with no audit trail.
- Either wire up or delete `epfo_verifications`/`/api/pro/epfo/*` — currently dead, broken code that will 500 on first use.
- Unify the four verification-state vocabularies (`proof_objects.trust_level`, `career_timeline.verification_state`, `profiles.verificationStatus`/`certifications[].verificationStatus`, `education_profile.field_sources`) behind one shared status enum before building a single Vault Trust Center UI on top of them — otherwise the UI has to special-case four different data shapes.

**Should Not Be Changed:**
- `proof_objects`, `education_profile`, `verification_audit_log` RLS (backend-write-only) — this is correct and should be the template for any new table, not something to loosen for frontend convenience.
- The provider registry's fail-fast-on-unsupported design.
- The hash-chain algorithm and its global (not per-user) integrity check.
- The certificate-OCR provider's explicit "this is not cryptographic proof" framing in its own code comments — any Phase 2 copy should say the same thing to users, not oversell it.

**New finding worth its own line item (PC-7, proposed):** `profiles` columns `certifications[].verificationStatus`, `experiences[].verificationStatus`, `education_verified`, `epfo_verified`, `verification_state`, `aura_score`, and the ELO fields are client-writable via RLS + a generic `userDoc.set()` upsert path in the frontend, protected only by a 3-column freeze trigger that doesn't cover any of them. This sits in the same family as PC-5a (fixed) and PC-5b (open) but on a different column set, and should be tracked/closed before any Phase 2 UI presents these values as trustworthy.

---

## 8. Phase 2 Plan (concrete, reuse-first)

Ordered by dependency — each step only reuses what's confirmed real above; nothing here assumes a system exists that wasn't verified in §1–§6.

1. **Close PC-7 first (prerequisite, not part of Phase 2 proper).** Extend `protect_profile_entitlements` (or add a sibling trigger) to also block client writes to `certifications`, `experiences`, `education_verified`, `epfo_verified`, `verification_state`, `aura_score`, and the ELO columns — mirroring the pattern already proven for `subscription`/`verified`/`purchased_themes`. This is a small, additive migration; it does not change any read path or existing API contract.
2. **Add a `verification_status` shared enum + link vault_documents → proof_objects/verification_audit_log.** Add `proof_object_id uuid null references proof_objects(id)` to `vault_documents` (nullable — most vault docs won't have one yet), and standardize a 5-value status (`unsupported | self_claimed | pending | verified | failed`) as a computed/derived read rather than a new independently-writable column, sourced from: no linked proof_object → `self_claimed`; linked proof_object with `trust_level='self-claimed'` → `self_claimed`; a `verification_audit_log` row exists for that proof_object with `result='verified'` → `verified`; `result` in `{'rejected','error'}` → `failed`; provider capability `unsupported` → `unsupported`. This reuses `proof_objects`/`verification_audit_log` exactly as they exist — no parallel trust table.
3. **Route `certification-file` (and, later, EPFO-confirm) through `runVerification()`** instead of writing directly to `profiles`, passing a `proofObjectId` so the existing pipeline's audit-log + trust_level promotion actually fires for the flows people use today. Retires the duplicate OCR implementation per §7.
4. **Vault Trust Center UI** (inside `VaultManager.jsx` or a new sibling panel): render the 5-state badge (§0's headline finding requires this to be computed server-side per step 2, not inferred client-side) on each `DocCard`; add a detail drawer showing method/verified-at/evidence/hash/audit-entry-id, sourced directly from `verification_audit_log` rows for that document's linked proof object.
5. **Verification History / Audit Timeline component**, reading `GET /api/verification/audit/mine` (already built, already returns the full hash-chained trail) — this is close to a pure frontend task; the backend contract already exists and doesn't need to change.
6. **Explainable Trust breakdown**, built as a *new* computation (not a reskin of `computeEloSignals`) that sums verified-only contributions per category (identity/education/employment/projects/arena), each traceable back to a specific `proof_objects` row or `verification_audit_log` entry — satisfying "every point should be explainable" by construction, since each point maps to a real row, not a heuristic weight.
7. **Provider Registry UI** (admin-facing, read from `GET /api/verification/providers` which already exists) — list capability/status/note per provider; rename user-facing label from "Provider" to "Trust Provider" as the roadmap requests (label-only change, no backend rename needed since `id` values stay stable).
8. **Document versioning** — genuinely new schema work (a `vault_document_versions` table or a `version`/`superseded_by` column pair on `vault_documents`), scoped as its own migration since it's the one piece here that doesn't reuse an existing structure. Flagged separately because it's the highest-risk item on this list from a migration-safety standpoint (touches a client-writable table).

Each step preserves the existing API contracts for `routes/proofs.js`, `routes/education.js`, and the current Vault endpoints — nothing above requires a breaking change to a route already in use.

---

## 9. Architecture Decision Record

**Title:** ADR-2026-07-20 — Trust & Verification Center, Phase 2 Foundation
**Status:** Proposed
**Context:**

Capabilio's trust/verification behavior is currently split across four independently-evolved systems (§0), sharing no common status vocabulary (§4, §7) and, in one specific column set, no protection against direct client forgery (§2.4, PC-7). The product goal — badges the recruiter trusts instantly, a full inspectable lifecycle per credential, and an explainable trust score — cannot be honestly built on top of this without first (a) closing the one open write-protection gap and (b) picking a single source of truth for "is this thing verified," because today that question has four different, sometimes contradictory, answers depending on which table you ask.

**Decision:**

1. `proof_objects.trust_level` + `verification_audit_log` (system #1, §1.1–1.5) become the single source of truth for verification status going forward. They are already backend-write-only, already hash-chained, and already have a working (if under-populated) pipeline — this is the strongest foundation of the four systems and the one to build on, not replace.
2. `vault_documents` gets a nullable FK to `proof_objects`, not a parallel status column — this keeps the write-only guarantee intact (§2.5's warning) by construction, since the vault table itself never gains a verification-writable field.
3. The three other systems (`verify.js` stubs, `professionalProfile.js` EPFO/ELO, direct `profiles` writes) are not deleted, but every verification-producing code path in them is migrated to call `runVerification()` so they feed the one audit log, per §8 step 3. `computeEloSignals()` is kept as-is for its actual purpose (market-employability heuristic) and explicitly not repurposed as the Trust Score.
4. PC-7 (client-writable verification-adjacent `profiles` columns) is closed before or alongside step 1 above — extending the existing, proven `protect_profile_entitlements` trigger pattern rather than introducing a new mechanism.
5. No new parallel "trust score" table or pipeline is introduced. The Explainable Trust breakdown is a read-side aggregation over `proof_objects`/`verification_audit_log`, computed on demand or cached, never an independently-writable score.

**Consequences:**
- *Reused:* provider registry, hash-chain audit log, `proof_objects` RLS discipline, Vault upload/storage/download mechanics, existing `/api/verification/*` and `/api/education/*` and `/api/proofs/*` contracts (no breaking changes).
- *New:* one migration adding `proof_object_id` to `vault_documents`; one migration/trigger extension closing PC-7; a versioning table/columns for vault documents (flagged as its own, higher-risk migration); new read-side aggregation logic for the trust breakdown; UI work in Vault and a new admin provider-registry view.
- *Deferred, by design, not by oversight:* real DigiLocker/EPFO/AWS/Microsoft/Cisco integrations remain `unsupported` until a real API/partnership exists — Phase 2 does not fake these into looking more complete than they are, consistent with the codebase's existing honesty discipline in `declared.js`.
- *Risk carried forward if this ADR is not followed:* building badge/history/explainability UI directly on `profiles` columns or on `computeEloSignals()` would ship a "trust" surface backed by client-writable data and a non-verification-gated score — the exact failure mode the roadmap's own "Confidence ≠ Verification" principle warns against, just one layer removed.

**Sign-off:** pending Engineering + Product review of PC-7 and the versioning migration scope (§8 step 8) before implementation begins.

---

## Revision 2 (2026-07-20, post-review) — Phase 1.5 inserted, terminology and architecture refined

Owner review of the original trace approved the ADR's core decision (§9.1: `proof_objects` + `verification_audit_log` as the single source of truth) with one sequencing change and several design refinements, adopted here as the plan of record. This section supersedes §8's ordering and extends §9's decision — §0–§7 (the trace itself) stand as originally written, with the one factual correction in §2.4 above.

### R2.1 — Phase 1.5 inserted before the Vault Trust Center UI

Original §8 went straight to UI work. That is now **Phase 2**, gated behind a new **Phase 1.5 (Consolidation)** that must close first:

1. Close **PC-7** — both layers, not one:
   - *Root cause:* migrate `routes/verify.js`'s `/certification` (ID-based) flow and `professionalProfile.js`'s EPFO paths to call `runVerification()` so a "verified" status can only ever originate from the pipeline, never from client-assembled JSON. This removes the actual exploitable path found in §2.4's correction, not just its symptom.
   - *Defense in depth:* the database trigger drafted separately (see the migration file referenced below) as a backstop for any write path not yet migrated, and against direct Supabase-client writes that never touch a route at all.
2. Consolidate every verification-producing code path behind `runVerification()` — `verify.js`'s certification-file and EPFO-confirm, `professionalProfile.js`'s EPFO submit (once `epfo_verifications` is either wired up or the route is deleted — a decision, not an engineering task, since the table doesn't exist today and nothing currently depends on it working).
3. Retire the duplicate OCR implementation (§7) — one implementation, in `lib/verification/providers/certificateOcr.js`, called by everything.
4. Confirm `proof_objects` + `verification_audit_log` are the *only* place verification state is written going forward — no new parallel table, per the original ADR decision, now treated as non-negotiable rather than a preference.

**Only after Phase 1.5 is closed does Phase 2 (Vault Trust Center UI, badges, audit history, document detail, vault↔proof_object linkage) begin**, so the UI is built against one consistent backend from day one instead of reconciling four data shapes later.

### R2.2 — Terminology split

The trace's §4 "four vocabularies" finding was actually hiding a deeper problem: several genuinely different concepts were being collapsed into one word ("verified") across the codebase. Per review, these become independent, separately-tracked fields on every evidence object going forward (naming is illustrative, exact column names TBD at implementation time):

| Concept | Question it answers | Where it already exists (even if incompletely) |
|---|---|---|
| **Source** | Where did this claim originate? (resume import, manual entry, institution, AI extraction) | `education_profile.field_sources`, `proof_objects.source` |
| **Verification Status** | Has an external check confirmed this? | `proof_objects.trust_level`, fragmented elsewhere per §4 |
| **Verification Method** | *How* was it checked? (API, manual OCR review, unsupported) | `verification_audit_log.capability_used`, provider registry's `capability` field |
| **Confidence** | How sure is the *check itself* (e.g. the OCR/LLM match), independent of whether it passed? | `verification_audit_log.confidence` — already a distinct column, already never conflated with "verified" in `pipeline.js`'s own logic (§0's "Confidence ≠ Verification" principle is already honored in this one table) |
| **Integrity** | Has this record been tampered with since it was written? | `verification_audit_log`'s hash chain — already exists, already answers this question and only this question |
| **Visibility** | Who can see it? (portfolio, recruiter, private) | `proof_objects.is_portfolio_visible` / `is_recruiter_visible` — already correctly separated from trust_level in the existing schema |
| **Version** | Which revision of this evidence is this? | Does not exist anywhere yet (§7, §8 step 8) |

Most of the right-hand column already shows these concepts partially exist and are partially already separated correctly (confidence and integrity, specifically, were never conflated in the new pipeline) — the fix is extending that existing discipline everywhere, not inventing it from scratch.

### R2.3 — Evidence Quality (new concept, distinct from trust)

Adopted as proposed: two verified pieces of evidence can differ in depth (a GitHub-verified repo with tests, a live demo, and a README vs. one with just a commit history) without differing in verification status. This is scoped as a **read-side, provider-specific scoring function** — e.g. the GitHub provider can already see `stars`, `forks`, `pushedAt`, presence of a description, etc. in its `details` payload (confirmed in `github.js`'s real response shape, §1.2) — Evidence Quality is a derived score computed from data the provider already returns, not a new write path or a new table. Scoped for Phase 3 (§R2.5), since it depends on Phase 2's badge/detail UI existing first to have somewhere to display it.

### R2.4 — Trust Provider Registry, extended shape

`listProviders()` (§1.2) currently returns `{id, name, capability, note}`. Extending to the requested shape is additive — every field below is either already present in a provider's own file or derivable from its existing `verify()` return shape, so this is a registry/route change, not a per-provider rewrite:

```
Trust Provider → Capability → Verification Method → Evidence Types Supported → Confidence Rules → Status
```

- `verificationMethod`: already implicit in each provider file's header comment (e.g. github.js: "GitHub's own public REST API") — needs to become a structured field rather than prose.
- `evidenceTypesSupported`: new, explicit field per provider (e.g. github → `["project","repository"]`) — informs which proof_object `domain`/`proof_type` values a provider is even eligible to verify, closing a gap where today nothing stops a caller from passing a GitHub claim to the certificate_ocr provider.
- `confidenceRules`: documents, per provider, what confidence bands mean (already partially done in code comments — e.g. github.js's 100/90/0 tiers — needs promoting to a queryable field).
- Rename user-facing label from "Provider" to "**Trust Provider**" (§8 step 7, unchanged) — the underlying `id` values and registry mechanism don't need to change, only the label and the new fields above.

### R2.5 — Verification Engine as a separate layer

Adopted: today, "evidence" (what `proof_objects` holds) and "verification" (what the pipeline does to it) are correctly separated at the data layer already (§1.3 — the pipeline reads/writes `proof_objects` but doesn't define what evidence *is*), but there is no separately-named "Verification Engine" concept in the code or docs — `lib/verification/pipeline.js` **is** this engine today, just not labeled or diagrammed as its own layer. Adopting the requested flow:

```
Vault Upload → AI Extraction → Verification Engine → Provider Registry → Verification Result → Evidence Engine (proof_objects) → Audit Log → Portfolio → Recruiter Dashboard
```

...is primarily a **naming and documentation exercise for Phase 1.5** (label `pipeline.js` as the Verification Engine in its own header comment, draw the diagram into this ADR permanently), plus **one real gap to close**: "AI Extraction" (OCR/text extraction) currently lives *inside* `certificateOcr.js` rather than as a separate, reusable pre-step the Verification Engine calls — meaning a future provider that also needs extraction (e.g. a transcript parser) would have to reimplement it rather than reuse a shared extraction step. Splitting extraction out from `certificateOcr.js` into its own module the Engine calls before dispatching to a provider is now in scope for Phase 1.5, not deferred.

### R2.6 — Evidence IDs

Adopted. `proof_objects.id` (uuid, already the PK, §2.1) already serves this exact purpose structurally — every proof object already has a stable, unique identifier that `verification_audit_log.proof_object_id` already references (§2.2). What's missing is a **human/recruiter-facing formatted form** (e.g. `CAP-EVD-00012345`) for display and reference purposes — this is a derived, cosmetic field (a formatted view of the existing uuid or a new sequential display column), not a new identity system. Scoped for Phase 2 (it's a UI/display concern, needs no new write path or migration beyond an optional display-sequence column).

### R2.7 — Revised roadmap (plan of record, supersedes original §8 ordering)

**Phase 1.5 — Consolidation (blocks all UI work):**
- Close PC-7 at the root (migrate `verify.js` cert-by-ID + EPFO flows, and `professionalProfile.js`'s EPFO submit, onto `runVerification()`) plus the DB-trigger backstop (drafted separately, pending review — see migration file).
- Retire the duplicate OCR implementation.
- Extract AI-extraction (OCR/text-extraction) out of `certificateOcr.js` into its own reusable step (R2.5).
- Decide and either finish or delete `epfo_verifications`/`/api/pro/epfo/*` (currently broken, §1.1).
- Label `pipeline.js` as the Verification Engine; adopt the terminology split (R2.2) in all new code from this point forward.

**Phase 2 — Vault Trust Center UI** (unchanged in substance from original §8 steps 2, 4, 5, 7; now correctly sequenced after Phase 1.5):
- Link `vault_documents` → `proof_objects` (nullable FK).
- Badges (5-state), audit-history timeline, document detail drawer — all reading from the now-single backend.
- Trust Provider Registry UI (R2.4) and Evidence IDs (R2.6) surfaced.

**Phase 3 — Explainable Trust Score + Evidence Quality:**
- Trust Score computed only from verified evidence in `proof_objects`/`verification_audit_log` (original §8 step 6, unchanged decision: never a reskin of `computeEloSignals()`).
- Evidence Quality (R2.3) as a per-provider derived score, surfaced alongside verification status but never merged into it.
- Provider integrations expanded one at a time through the now-extended registry shape (R2.4).

**Phase 4 — Lifecycle + enterprise:**
- Document versioning/lifecycle (original §8 step 8, unchanged — still flagged as the highest migration-risk item since it touches the client-writable `vault_documents` table).
- Periodic public blockchain anchoring — only if a real business/compliance requirement emerges; the existing hash-chain (§1.5) already provides tamper-evidence without it, per the original ADR's framing.

**Sign-off (updated):** approved by Engineering with the sequencing change above. Implementation begins with Phase 1.5, PC-7 first — migration SQL for PC-7's DB-trigger backstop drafted separately for review before being applied to the live project.

---

## Revision 3 (2026-07-20) — PC-7 migration reviewed: Approved with revisions, now incorporated

Owner review of the draft migration (`pc7_protect_profile_trust_fields_migration.sql`, v1) returned **Status: Approved with requested revisions**. All four were incorporated into v2 of that file:

1. **Field-level protection, not whole-object equality.** v1 rejected any edit to an already-verified certification/experience, including harmless corrections. v2 protects only the verification-owned fields (`verificationStatus`, `verificationSource`, `verifiedAt`, `matchConfidence`, plus `legalName` for experiences) once an entry is verified; everything else on that entry stays editable. This also fixed a real bug v1 had: `AddExperienceModal`'s own default form state sets `verificationStatus:"self-claimed"` on every new entry, which v1's naive "any difference from OLD is a violation" rule would have wrongly blocked outright — v2's regression test #4 exists specifically to catch this.
2. **Transitional-safeguard sentence added** at the top of the migration file — explicit that this trigger goes away once `certifications`/`experiences` migrate to `proof_objects`, not a permanent fixture.
3. **Maintenance requirement documented** — `scalar_cols` remains the one centralized list (no metadata table added; that would be over-engineering for 17 columns), with an explicit comment that any new verification-related scalar column must be added there in the same change and cross-referenced in this ADR's §2.4.
4. **Blocked-attempt visibility added** via `RAISE WARNING` immediately before each `RAISE EXCEPTION` (structured: profile id, field, role) — durable in Postgres/Supabase logs without a new schema object. A fully queryable violations table was considered and deliberately deferred: it would need an autonomous transaction (e.g. via the `dblink` extension) to survive the exception's rollback, which is a new dependency warranting its own review, not bundled into this pass.

Also renamed (`protect_profile_trust_fields_pc7_v1` / trigger `pc7_v1_protect_profile_trust_fields`) so a future revision can be swapped in cleanly, and the service-role bypass assumption was reaffirmed with an explicit note to revisit it if a new backend Postgres role is ever introduced.

**Status: ready to apply to Phase 1.5**, pending the owner's final read of v2 before it's run via `apply_migration`.

---

## Revision 4 (2026-07-20) — Owner approved for implementation; DB-layer independently re-validated; E2E plan added

Owner reviewed v2 and returned **Approved for implementation, subject to normal testing in a staging environment**, with one addition requested: a regression suite covering the full verification lifecycle (frontend + backend + database), not just the trigger SQL in isolation.

**DB-layer re-validation:** the migration file had accumulated a "VALIDATION PERFORMED" section (added outside this conversation) claiming 7/7 trigger tests passed, including a SECURITY DEFINER fix. Rather than accept that claim, it was independently reproduced this session. The SECURITY DEFINER finding held up (`protect_profile_entitlements` confirmed live at `prosecdef=false`; the reasoning that SECURITY DEFINER breaks the `current_user` check is correct). Reproducing the test suite itself took three attempts before the results were trustworthy — the first two attempts produced false positives/negatives from testing-harness bugs, not trigger bugs: attempt 1 used `set_config('role',...)` which doesn't actually switch the Postgres role; attempt 2 switched roles correctly but didn't set `request.jwt.claim.sub`, so RLS silently discarded every test write regardless of the trigger. Attempt 3 — real `SET ROLE`, `auth.uid()` matched to the test row, and before/after field values read back directly rather than trusting exception-catching alone — produced genuine, verifiable evidence for all 7 scenarios. Full detail and the exact queries are in the migration file's updated validation section. This is recorded not to relitigate the finding (it held up) but because the failure modes encountered are exactly the kind of thing worth documenting for whoever tests this trigger next.

**E2E lifecycle plan added:** `PC7_E2E_REGRESSION_PLAN_2026-07-20.md` covers the eight scenarios requested (self-claim add/edit, backend promotion to verified, non-verification-field edit, client tampering blocked, GitHub pipeline, OCR pipeline, recruiter/portfolio rendering) plus one risk surfaced while writing it that wasn't in the original request: **JSON round-trip serialization** — if the frontend ever resends an unchanged `certifications`/`experiences` array as part of an unrelated profile save (e.g. saving a new `bio` also resends the existing certifications verbatim), and re-serialization changes number/key formatting (e.g. `95` vs `95.0`), the trigger's exact-field comparison would treat that as a tampering attempt and block a completely unrelated, legitimate save. This is flagged as the highest-priority item for staging validation, ahead of the originally-requested scenarios.

**Status:** trigger logic is DB-layer Regression Tested (verified, not just claimed). Not yet Staging Validated or Closed — six categories of staging-only checks remain, tracked in the E2E plan's state table, owned by QA/Owner per the existing `CERTIFICATION_FRAMEWORK.md` model. No staging Supabase branch currently exists (`list_branches` returned only the default `main` branch) — creating one is a cost-bearing action requiring explicit owner confirmation, not done unilaterally in this session.

---

## Revision 5 (2026-07-20) — Applied to production; no staging branch was possible

Attempted to create a staging branch per Revision 4's plan: cost was fetched ($0.01344/hour), explicitly confirmed with the owner, and `create_branch` was called — it failed with `PaymentRequiredException`: **Supabase branching requires the Pro plan or above, which this project is not on.** No charge was incurred. Given no staging branch was available, the owner chose to apply the migration directly to `main` (production) on the strength of the DB-layer validation already completed, rather than upgrading the plan or holding off.

**Applied:** `pc7_protect_profile_trust_fields_v2` (migration version `20260720033112`) — the exact SQL from `pc7_protect_profile_trust_fields_migration.sql`, v2.

**Immediate post-apply finding:** `get_advisors` (security) flagged both new helper functions (`_pc7_find_matching_element`, `_pc7_check_trust_fields`) as `function_search_path_mutable` — the main trigger function had `set search_path = public`, the two helpers it calls did not. This is the same class of issue this project already closed for 26 other functions (`SEC-searchpath`). Fixed immediately with a follow-up migration, `pc7_pin_search_path_on_helpers`, pinning `search_path=public` on both. Re-ran `get_advisors` after: both warnings gone, no new findings introduced by this migration — remaining advisories are all pre-existing and already tracked (`notifications`/`referral_codes` permissive RLS = `SEC-permRLS`, `org-media` bucket listing = `SEC-bucket`, leaked-password protection = `P3-pwd`, assorted `rls_enabled_no_policy` INFO-level notices on unrelated tables).

**Confirmed live:** both `pc7_v1_protect_profile_trust_fields` and the pre-existing `trg_protect_profile_entitlements` exist as enabled (`tgenabled='O'`) BEFORE UPDATE row triggers on `public.profiles`, read directly from `pg_trigger` — not just assumed from the migration having reported success.

**What this does and doesn't mean:** the trigger is live and DB-layer Regression Tested (verified this session, not just claimed). It is **not yet Staging Validated** in the `CERTIFICATION_FRAMEWORK.md` sense — the six E2E categories in `PC7_E2E_REGRESSION_PLAN_2026-07-20.md` (most importantly §4.3's JSON round-trip serialization risk) were never exercised against a real running frontend/backend, because no staging environment existed to run them against. This is a known, explicit gap, not a silently skipped one — recorded here so it isn't mistaken for "fully validated" later. If the round-trip risk in §4.3 turns out to be real, the first symptom in production would be unrelated profile saves (e.g. editing a bio) failing for any user with a verified certification/experience — worth prioritizing that specific check first, per the E2E plan's suggested execution order.

---

## Revision 4 (2026-07-20) — SQL-level validation run; end-to-end lifecycle plan drafted

Per the owner's final approval ("Approved for implementation, subject to normal testing in a staging environment") and the request for an end-to-end lifecycle regression suite, the following was done before applying anything to production.

### R4.1 — Trigger logic validated via a rolled-back transaction (zero risk, no staging needed)

The migration's own 7-point SQL regression suite was actually executed against the live `capabilio` project, wrapped in `BEGIN ... ROLLBACK` — the functions and trigger were created, exercised, and then the entire transaction was discarded, so nothing persisted. **This caught a real bug before it went anywhere near staging or production:** the draft trigger function was marked `SECURITY DEFINER`, which makes `current_user` resolve to the function's *owner* for the duration of the call rather than the actual caller. Since the whole protection scheme is `current_user not in ('anon','authenticated')`, this silently defeated the trigger entirely — every one of the six protection assertions no-op'd on first run (writes that should have been blocked all succeeded). Fixed by removing `SECURITY DEFINER` (confirmed the existing, already-Closed `protect_profile_entitlements` trigger is *also* not security definer — `prosecdef=false`, checked live — so this brings the new trigger in line with the established, working pattern rather than deviating from it). Full re-run: 7/7 passed. Post-rollback, confirmed via a follow-up query that the trigger/function no longer exist and the test profile's data is bit-for-bit unchanged — no trace left in the live database. The migration file itself (`pc7_protect_profile_trust_fields_migration.sql`) now documents this fix and the validation results inline.

This is real evidence the *SQL logic* is correct. It is not evidence the *application* behaves correctly around it — that needs the end-to-end suite below, which requires an actual running deployment.

### R4.2 — End-to-end verification-lifecycle regression plan

Mapped each requested scenario to concrete steps. Columns show what's needed to execute it and whether it was covered by R4.1's SQL-only test.

| # | Scenario | Concrete test | Covered by R4.1? |
|---|---|---|---|
| 1 | User adds a new self-claimed certification | `StudentCertificatesPanel.save()` → whatever route/direct-write `onSave` resolves to, with no `verificationStatus` set | Yes, at the DB layer (test 3). Not yet at the HTTP/UI layer — needs a running frontend+backend to confirm the actual call path behaves the same as the raw SQL simulation. |
| 2 | User edits a self-claimed certification | Same flow, editing an existing non-verified entry's `name`/`issuer`/`date` | Implied safe by the trigger design (non-verified entries are unrestricted except promoting to `verified`), not explicitly run. |
| 3 | Backend verification promotes it to verified | `POST /api/verify/certification-file` (real OCR+LLM match, `routes/verify.js`) — confirm the resulting write (via `supabase()`, i.e. service_role) still succeeds post-trigger | Partially — test 7 confirms service_role bypass in general; the *specific* certification-file route wasn't exercised end-to-end. |
| 4 | User edits a non-verification field on that verified certification | Edit `name`/`issuer` on an entry with `verificationStatus:"verified"`, leaving trust fields untouched | Yes, at the DB layer (test 5) — this is the exact case the field-level rewrite (Revision 3) was built to fix. |
| 5 | User attempts to modify verification-owned fields from the client (should fail) | Attempt to change `verifiedAt`/`verificationSource`/`matchConfidence` on a verified entry | Yes, at the DB layer (test 6). |
| 6 | GitHub verification still succeeds through the pipeline | `POST /api/verification/verify` with `providerId:"github"` and a real `{owner,repo}` claim — confirm `verification_audit_log` gets a row and, if a `proofObjectId` was passed, `proof_objects.trust_level` promotes | Not covered — this path doesn't touch `profiles` at all (writes to `proof_objects`/`verification_audit_log`, both already backend-only RLS, §2.1/§2.2), so the new trigger can't affect it, but that assumption should be confirmed by actually running it, not just asserted from the trace. |
| 7 | OCR verification still succeeds through the pipeline | `POST /api/verification/verify` with `providerId:"certificate_ocr"` and a real certificate file | Same as #6 — architecturally unaffected by this trigger (different table), needs one real run to confirm rather than assume. |
| 8 | Existing recruiter views and portfolio rendering remain unaffected | `GET /api/proofs/:userId` and `EngineeringProofsPanel.jsx` rendering, plus `CareerTimeline.jsx`'s experience badges | Read-only paths, architecturally unaffected by an UPDATE trigger — lowest risk of the eight, but still worth one real pass since it's cheap to check. |

**Why #6–#8 can't be fully asserted from the trace alone:** they don't write to `profiles`, so the new trigger has no code path that touches them — but "the trigger doesn't touch this" is a claim about the code, and this entire exercise has already demonstrated (R4.1) that a plausible-looking claim about this trigger's behavior can be wrong until actually run. The same discipline applies here: architecturally sound reasoning, not yet run.

### R4.3 — Staging environment: gap identified, decision needed

`list_branches` on the live project shows exactly one branch (`main`, the production database itself — `is_default:true`) — **there is no separate staging environment today.** Running scenarios 1, 2, 3, 6, 7, 8 above for real requires either a Supabase preview branch (via `create_branch` — cost confirmed at $0.01344/hour, requires explicit cost confirmation before creation) with a backend instance pointed at it, or an equivalent staging setup the owner already has that wasn't visible in this trace. This is a decision for the owner, not something to default into given the (small but real) cost and infrastructure implications — surfaced separately rather than assumed.

**Status:** R4.1 (SQL-level validation) is done and passed. R4.2 (end-to-end plan) is written and ready to execute. R4.2's actual execution is blocked on R4.3's staging decision.
