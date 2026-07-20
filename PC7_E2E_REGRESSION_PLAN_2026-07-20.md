# PC-7 — End-to-End Lifecycle Regression Plan

**Date:** 2026-07-20 · **Scope:** the full verification lifecycle across frontend, backend, and database — not just the DB trigger in isolation.
**Companion to:** `TRUST_VERIFICATION_TRACE_AND_ADR_2026-07-20.md`, `pc7_protect_profile_trust_fields_migration.sql`

Per review: the trigger itself is now verified (see the migration file's "VALIDATION PERFORMED" section — 7/7 scenarios independently re-confirmed against the live database, inside rolled-back transactions, with real role-switching and before/after field evidence). That validates the database layer. It does **not** validate the interaction between frontend, backend, and database — a trigger can be logically correct and still cause a route to 500 in a way the UI handles badly, or a legitimate backend flow can break because it was assumed to be `service_role` and turns out not to be. This plan closes that gap.

Each scenario is marked with how it was or can be validated:
- **✅ DB-verified** — validated in this session, directly, against the live database, with evidence (see migration file).
- **🔲 Needs staging** — requires a running application (frontend + backend) against a real or branched database; cannot be executed from this environment. Owner/QA to run, per this project's own `CERTIFICATION_FRAMEWORK.md` ownership model (QA/Owner owns staging + live validation; Engineering owns Code Complete).

---

## 1. Self-claim lifecycle (no verification involved)

| # | Scenario | Status | Notes |
|---|---|---|---|
| 1.1 | User adds a new self-claimed certification via `StudentCertificatesPanel` (no `verificationStatus` set at creation) | ✅ DB-verified | Migration test #3 — exact shape that panel produces (`{name, issuer, date, credentialId, url, skills}`, no verificationStatus key) writes cleanly under `authenticated` + matching `auth.uid()`. |
| 1.2 | User adds a new experience via `AddExperienceModal` (default `verificationStatus:"self-claimed"` explicitly set) | ✅ DB-verified | Migration test #4 — this is the exact case v1 of the trigger would have wrongly blocked; v2 confirmed to allow it. |
| 1.3 | User edits a self-claimed certification's fields (name, issuer, dates, tags) before any verification is requested | 🔲 Needs staging | DB-level equivalent not directly tested (only *adding* was tested), but the trigger's logic path is identical to 1.1 (entry not verified → any field writable except promoting `verificationStatus` to `'verified'`) — low risk, but the actual `StudentCertificatesPanel.save()` → `onSave()` → backend write path should be exercised once in staging to confirm the full round trip. |
| 1.4 | User deletes a self-claimed certification/experience | 🔲 Needs staging | Trigger has no logic specific to array shrinkage/deletion — deleting an entry doesn't touch verification-owned fields, so no trigger interaction expected, but not explicitly exercised. |

## 2. Verification promotion (backend-driven)

| # | Scenario | Status | Notes |
|---|---|---|---|
| 2.1 | Backend (`certification-file` route, via `supabase()`/`service_role`) promotes a certification to `verified` after a real OCR+LLM match | ✅ DB-verified (trigger side) / 🔲 Needs staging (route side) | Migration test #7 confirms the trigger's `service_role` bypass works for a scalar write; the *array*-write equivalent (service_role setting `certifications[i].verificationStatus='verified'`) uses the identical bypass branch (`current_user not in ('anon','authenticated')`), so the mechanism is proven, but the actual `routes/verify.js` handler hasn't been re-run against a trigger-enabled database. Needs one real staging call to `POST /api/verify/certification-file` with a real certificate file, confirming the response still returns `verified:true` and the resulting `profiles.certifications` row matches. |
| 2.2 | GitHub provider (`lib/verification/providers/github.js`) verifies a project via `POST /api/verification/verify` | 🔲 Needs staging | This path writes to `proof_objects.trust_level` via `runVerification()` → `proofRepo.updateTrustLevel()`, which is a **different table** than `profiles` — PC-7's trigger doesn't touch `proof_objects` at all (that table already has no client-write RLS policy, §2.1 of the trace). This scenario should be unaffected by PC-7, but should be exercised once in staging to confirm nothing else in Phase 1.5's consolidation work regresses it. Requires a real GitHub repo + real network call (or a recorded fixture). |
| 2.3 | Certificate-OCR provider (`lib/verification/providers/certificateOcr.js`) verifies via `POST /api/verification/verify` | 🔲 Needs staging | Same table (`proof_objects`) as 2.2 — same expectation (unaffected by PC-7), same need for one live confirmation. Requires a real certificate file + Groq/Gemini API access. |
| 2.4 | EPFO employer-matching (`routes/verify.js::/epfo/confirm`) updates `profiles.experiences[].verificationStatus` to `'verified'` | ✅ DB-verified (trigger side) / 🔲 Needs staging (route side) | Same mechanism as 2.1 but for `experiences` — trigger's service_role bypass covers it structurally; the actual `matchEpfoToExperiences` round trip through the route needs one staging run with a seeded profile to confirm end-to-end. |

## 3. Post-verification behavior

| # | Scenario | Status | Notes |
|---|---|---|---|
| 3.1 | User edits a **non-verification** field (title, dates, notes, tags) on an already-verified certification/experience | ✅ DB-verified | Migration test #5 — confirmed the `name` field changes while `verifiedAt` stays byte-identical. This is the exact "typo fix" case v1 broke and v2 fixes. |
| 3.2 | User (or a compromised/malicious client) attempts to directly modify `verificationStatus`, `verificationSource`, `verifiedAt`, `matchConfidence`, or `legalName` on an already-verified entry | ✅ DB-verified | Migration test #6 — confirmed blocked, field confirmed unchanged after the attempt. |
| 3.3 | Frontend behavior when a write is rejected by the trigger | 🔲 Needs staging | This is the most product-relevant untested gap. `frontend/src/lib/db.js`'s `userDoc.update()` — per the code read earlier in this session — logs a console error and returns `false` on a failed write, then the calling code (e.g. `Aura.jsx`'s `save()`) checks that return value and does **not** apply the optimistic local-state update if it's `false`. That's the intended behavior, but it has never been exercised against a write that fails specifically because of this new trigger (as opposed to a network error or a different rejection). Needs a staging run: attempt an edit that should be blocked, confirm the UI shows a sensible state (doesn't silently show a "saved" success state for a write that was actually rejected). |

## 4. Downstream surfaces

| # | Scenario | Status | Notes |
|---|---|---|---|
| 4.1 | Recruiter view of a candidate's profile after PC-7 is live | 🔲 Needs staging | PC-7 only affects **writes** to `profiles`; reads are untouched (no RLS SELECT policy change in this migration). Low risk, but recruiter-facing profile rendering should be spot-checked once in staging as a smoke test, not because the trigger should affect it, but because "should be unaffected" claims deserve one confirmation before Closed. |
| 4.2 | Portfolio page rendering (`routes/proofs.js`, reading `proof_objects`) | 🔲 Needs staging | Same reasoning as 4.1 — `proof_objects` isn't touched by this migration at all, so this should be a pure regression check, not a functional test of PC-7 itself. |
| 4.3 | `POST /api/pro/profile` (professionalProfile.js's generic upsert) with a payload that includes an untouched `certifications`/`experiences` array (i.e., the client round-trips the array back unchanged as part of a larger profile save) | 🔲 Needs staging | This is a realistic real-world case: if the frontend fetches a profile (including already-verified entries) and later saves an unrelated field (e.g. `bio`), does it resend `certifications` verbatim? If so, the trigger's field-level comparison should pass cleanly since nothing in the protected fields changed — but this depends on the frontend not silently re-serializing the JSONB in a way that changes key order or number formatting (e.g. `95` vs `95.0` for `matchConfidence`), which `is distinct from` would treat as a real difference. **This is the single highest-risk untested scenario** — worth prioritizing first in staging. |

---

## Suggested staging execution order

1. **4.3 first** — the round-trip-serialization risk is the one most likely to cause a false rejection of completely legitimate, unrelated profile saves in production. If JSON re-serialization changes numeric/key formatting, every save touching a profile with any verified entry could start failing.
2. **3.3** — confirms the failure mode is user-visible and non-silent, not just correct at the database layer.
3. **2.1, 2.4** — confirms the actual verification-granting routes still work with the trigger active.
4. **2.2, 2.3** — confirms `proof_objects`-based verification (a different table) is unaffected, as expected.
5. **4.1, 4.2** — pure regression smoke checks.

## State tracking (per `CERTIFICATION_FRAMEWORK.md`'s model)

| Item | Reported | Code Complete | Regression Tested (DB) | Staging Validated | Closed |
|---|:--:|:--:|:--:|:--:|:--:|
| PC-7 trigger logic | ✅ | ✅ | ✅ (this session, 7/7) | ❌ | ❌ |
| §1 self-claim lifecycle | ✅ | n/a | partial (1.1, 1.2) | ❌ | ❌ |
| §2 verification promotion | ✅ | n/a | partial (mechanism only) | ❌ | ❌ |
| §3 post-verification behavior | ✅ | ✅ | ✅ (3.1, 3.2) | ❌ (3.3) | ❌ |
| §4 downstream surfaces | ✅ | n/a | n/a | ❌ | ❌ |
| §4.3 round-trip serialization risk | ✅ (flagged) | n/a | ❌ | ❌ | ❌ |

**Owner:** QA/Owner for all "Needs staging" rows, per the existing ownership matrix — Engineering's part (the trigger itself) is Regression Tested; the migration should not be marked Closed until the staging rows above are run.
