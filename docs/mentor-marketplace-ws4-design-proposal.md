# Mentor Marketplace — Workstream 4 Design Proposal (v2 — implemented)

Status: **v2, implemented and applied to production** (2026-07-24). v1 (below the line marked
"v1 audit findings", kept verbatim for history) was proposal-only. This revision reflects what was
actually built: the migration is applied to `eybchcqwbizjmzyrviri`, RLS is enabled + policy-tested
via advisors, the reservation/idempotency/webhook/reconciliation/payout logic is real code with
`node:test` coverage, and the `mentor_marketplace_v1` feature flag exists in both frontend and
backend, defaulting `false`. See `docs/career-os-implementation-plan.md`'s Workstream 4 section for
exact test counts, build output, and the honest 9-gate status table (some gates are unit-tested
only, not live-verified — that document says exactly which).

## What changed from v1 to v2 (the mandatory design deltas)

1. **Booking is a reservation, not an instant booking.** `mentor_availability_slots.slot_status`
   (`available`|`reserved`|`booked`) + `reservation_expires_at` replace the v1 `is_booked` boolean.
   Reserving a slot and creating the `pending_payment` booking happen inside one
   `SELECT ... FOR UPDATE`-locked Postgres function (`mentor_reserve_slot`, SECURITY DEFINER,
   `service_role`-only execute), because Supabase's REST API is stateless per request and cannot
   hold a row lock open across two separate `supabase-js` calls — the lock and the state
   transition have to live inside a single function body. A losing concurrent request gets a clean
   `409 slot_no_longer_available`, never a double booking.
2. **Idempotency is a real persisted table, not a debounce.** `mentor_idempotency_keys`
   (`UNIQUE(idempotency_key, endpoint, user_id)`) stores the request hash and the full response
   payload. A valid retry replays the stored response; the same key with a different
   body/endpoint/user is a `409`, not silently processed. Enforced in
   `backend/server/lib/mentorMarketplace/idempotency.js`, wired into every mutating route in
   `mentorMarketplace.js` via a `withIdempotency()` wrapper that requires the `Idempotency-Key`
   header on every POST.
3. **A real webhook exists.** `backend/server/routes/mentorMarketplaceWebhook.js`, mounted with
   `express.raw({ type: 'application/json' })` scoped to exactly that path in `server.js`, BEFORE
   the global `express.json()` parser. Signature verification
   (`backend/server/lib/mentorMarketplace/webhook.js`) is HMAC-SHA256 over the raw body against a
   NEW `RAZORPAY_WEBHOOK_SECRET` env var — a completely separate code path and secret from the
   existing checkout signature check in `payments.js` (which HMACs `order_id|payment_id` against
   `RAZORPAY_KEY_SECRET`). Dedup is `UNIQUE(razorpay_event_id)` on `mentor_payment_webhook_events`,
   which stores the payload, `signature_valid`, `processing_result`, and `seen_count`/
   `first_seen_at`/`last_seen_at` retry metadata.
4. **Reconciliation is mandatory and built.** `backend/server/lib/mentorMarketplace/reconciliation.js`
   (importable functions) + `scripts/mentorReconciliation.mjs` (CLI, dry-run by default, `--commit`
   to write) run three sweeps: release stale reservations, recover missed webhooks (against a
   **stubbed** Razorpay order-status check — no live account in this environment, explicitly
   documented, never silently skipped), and auto-complete eligible bookings. Auto-completion is
   implemented as part of this reconciliation sweep, not a separate cron — this codebase has no
   scheduler infrastructure today, and the sweep already needs to run periodically for the other
   two jobs.
5. **Payouts are admin-triggered BATCHES, explicitly not automated.** No Razorpay Route
   integration — this sandbox cannot confirm Route capability or KYC/linked-account prerequisites,
   so that remains an explicit open item. `mentor_payouts` (batch) + `mentor_payout_line_items`
   (per-booking, `UNIQUE(booking_id)` so a booking can only ever appear in one batch, ever) record
   platform fee %, gross/fee/net amounts, a `transfer_reference` (filled in manually after the
   admin does the actual transfer outside this system), and `tax_invoice_number`/
   `tax_invoice_required` placeholder fields. Nothing in code, comments, or field names calls this
   "automated" — see `backend/server/lib/mentorMarketplace/payouts.js`'s header.
6. **A single server-owned policy config module.** `backend/server/lib/mentorMarketplace/refundPolicy.js`
   holds every refund tier, no-show/dispute window, auto-completion threshold, and payout-exclusion
   rule as one frozen object + pure functions — not scattered magic numbers.
7. **Reviews are moderated and one-per-booking.** `mentor_reviews.booking_id` is `UNIQUE`
   (DB-enforced, not just app logic); `moderation_status` defaults `pending`; only `approved`
   reviews are ever returned by the public read endpoint; the API returns first-name + last-initial
   only, never the mentee's full name. `mentor_review_reports` lets any user flag an existing review
   for re-review, mirroring `question_bank_reports`' shape. No mentor-to-mentee review path exists
   anywhere in the code — v1 does not support it, by design.
8. **`mentorHub.js` stays unmounted, not deleted.** Its `app.use()` line in `server.js` is
   commented out with an explanation; the file itself is untouched, pending a follow-up cleanup
   commit. Confirmed via grep (again, in this pass) that `frontend/src` has zero references to
   `/api/mentors...` paths or the `mentorApi` export.
9. **New route family:** `/api/pro/v1/mentor/*` — `mentorMarketplace.js` (user-facing),
   `mentorMarketplaceAdmin.js` (admin, `requireAdmin`-gated), `mentorMarketplaceWebhook.js`
   (Razorpay webhook). All three check `MENTOR_MARKETPLACE_V1_ENABLED` (backend flag, same
   env-var pattern as `skillPulseV2.js`'s `V2_FLAG_ENABLED`) and 403/404 while it's off.

## Schema (as actually applied — `career_os_ws4_mentor_marketplace_migration.sql`)

13 new tables, all additive, RLS enabled on every one, applied via Supabase MCP `apply_migration`
against `eybchcqwbizjmzyrviri`: `mentor_applications`, `mentor_profiles`,
`mentor_availability_slots` (with `slot_status` + `reservation_expires_at`), `mentor_bookings`
(with `UNIQUE(mentor_id, mentee_id, scheduled_start)` and `UNIQUE(slot_id)`), `mentor_payments`,
`mentor_payment_webhook_events` (`UNIQUE(razorpay_event_id)`), `mentor_idempotency_keys`
(`UNIQUE(idempotency_key, endpoint, user_id)`), `mentor_payouts`, `mentor_payout_line_items`
(`UNIQUE(booking_id)`), `mentor_disputes`, `mentor_reviews` (`UNIQUE(booking_id)`),
`mentor_review_reports`, `mentor_audit_log`. Plus three `SECURITY DEFINER` functions
(`mentor_reserve_slot`, `mentor_confirm_booking`, `mentor_release_booking`) whose `EXECUTE`
privilege is revoked from `anon`/`authenticated` and granted only to `service_role` — verified via
Supabase MCP `get_advisors` (security) both before and after that explicit revoke (Supabase's
default privileges auto-grant new public-schema functions to `anon`/`authenticated`, which a bare
`REVOKE ... FROM PUBLIC` does not undo — this was caught and fixed in this same pass, see the
implementation-plan doc for the before/after advisor diff).

## RLS policy design (as applied)

Unchanged in spirit from v1's design, tightened in one place: `mentor_bookings` and
`mentor_payments` have **no client INSERT/UPDATE policy at all** (not even a mentee-owns-row
policy) — all writes to those two tables happen exclusively through the three SECURITY DEFINER
functions above or the service-role backend, exactly per the "no client-authored status changes"
requirement. `mentor_reviews` insert policy additionally requires the booking to already be
`completed` and owned by the inserting mentee, enforced in the policy's `WITH CHECK`, not just
route-level app logic. Full policy list is in the migration file itself.

## State machines (as implemented)

**Application:** `submitted → in_review → approved` (creates `mentor_profiles`) `| rejected`.

**Booking:** `pending_payment` (created by `mentor_reserve_slot`) `→ confirmed` (webhook
`payment.captured` → `mentor_confirm_booking`, slot → `booked`) `→ completed` (reconciliation
auto-completion, 24h after `scheduled_end`, no open dispute/no-show) `| cancelled_by_mentee |
cancelled_by_mentor | no_show_mentee | no_show_mentor | disputed → resolved via mentor_disputes |
refunded | failed` (webhook `payment.failed`, or reservation-expiry with no captured payment, both
via `mentor_release_booking`).

**Payment:** `created → authorized → captured | failed | refunded | partially_refunded`.

**Payout (batch):** `draft` (created by an admin, line items attached) `→ finalized` (admin locks
it) `→ paid` (admin records `transfer_reference` after doing the manual transfer) `| on_hold`
(any booking in the batch has an open dispute — excluded from eligibility, not a batch-level state
in this implementation) `| failed`.

## Payment flow (as implemented)

1. `POST /api/pro/v1/mentor/bookings` (idempotent) reserves the slot via `mentor_reserve_slot` and
   creates the `pending_payment` booking, holding the slot `reserved` for
   `MENTOR_MARKETPLACE_POLICY.reservation.holdMinutes` (15 min default).
2. `POST /api/pro/v1/mentor/bookings/:id/checkout` (idempotent) creates a Razorpay order via the
   existing `razorpay.js` client, stamping `notes.mentor_booking_id` so the webhook can find the
   booking without trusting client-supplied IDs — same pattern as `payments.js`'s
   `notes.planId`/`notes.uid` binding.
3. Client completes checkout (existing Razorpay checkout flow, unchanged).
4. `POST /api/pro/v1/mentor/webhook/razorpay` verifies the webhook signature, dedupes by
   `x-razorpay-event-id`, and on `payment.captured` calls `mentor_confirm_booking`
   (`pending_payment → confirmed`, slot `→ booked`); on `payment.failed` calls
   `mentor_release_booking` (booking `→ failed`, slot `→ available`).
5. Reconciliation (`scripts/mentorReconciliation.mjs`) catches reservation timeouts and — via a
   **stubbed** Razorpay order-status check — missed webhooks. The stub is real code with a real
   interface (`checkRazorpayOrderStatus` is an injectable parameter), not a TODO comment; it throws
   with an explicit message when called, and any booking that would need it is flagged for admin
   review rather than silently resolved.
6. Refunds are computed by `refundPolicy.js` and recorded (`mentor_bookings.refund_amount`) at
   cancellation/dispute-resolution time; the actual Razorpay refund API call is NOT issued in this
   pass (no live account) — this is called out explicitly in the route code and in the
   implementation-plan doc's "not done" list, not silently omitted.
7. Payouts are admin-triggered batches only (`payouts.js`), never automated — see the mandatory
   design requirement above.

## Idempotency (as implemented)

`backend/server/lib/mentorMarketplace/idempotency.js` + `mentor_idempotency_keys` table. Every
mutating route in `mentorMarketplace.js` (`/application`, `/bookings`, `/bookings/:id/checkout`,
`/bookings/:id/cancel`, `/reviews`, `/reviews/:id/report`) requires `Idempotency-Key` and is wrapped
by `withIdempotency()`, which checks-then-executes-then-records in that order. 15 `node:test` cases
cover: fresh key proceeds, valid retry replays the exact stored response, conflicting body/endpoint
is a 409 (not silently processed), different users with the same key string are correctly treated
as distinct rows (scoped by `user_id`), and expired keys are not replayed.

## Rollback plan (unchanged from v1, still accurate)

All migrations are additive-only. `mentor_marketplace_v1` gates every route; rollback is flipping
the flag off in both frontend and backend env. `mentorHub.js` stays unmounted-but-present pending a
follow-up cleanup commit (see item 8 above). Reverse-dependency-order `DROP TABLE` sequence, if a
migration genuinely needs reverting: `mentor_review_reports, mentor_reviews, mentor_disputes,
mentor_payout_line_items, mentor_payouts, mentor_payment_webhook_events, mentor_idempotency_keys,
mentor_payments, mentor_bookings, mentor_availability_slots, mentor_audit_log, mentor_profiles,
mentor_applications` (plus dropping the three SECURITY DEFINER functions and `mentor_is_admin`).

## Gate before ANY user-facing exposure

See `docs/career-os-implementation-plan.md`'s Workstream 4 section for the full, honest 9-gate
table (FULLY VERIFIED / PARTIALLY VERIFIED / NOT VERIFIABLE HERE per gate, with what tool actually
proved each one). Short version: schema+RLS and unit-level concurrency/idempotency/webhook-signature
tests pass in this sandbox; live Razorpay Test Mode integration, a real manual end-to-end test
booking, and true concurrent-connection row-lock verification are NOT verifiable in this sandbox
and remain open before `mentor_marketplace_v1` can be flipped `true` anywhere real users can reach
it.

---

# v1 audit findings (kept verbatim for history — see above for what actually changed)

Status: **proposal only** (as of the v1 pass). Per explicit instruction, nothing in this document
had been applied to the database at that time. No migrations were written or run. No routes were
built. No feature flag existed yet.

## 1. Audit findings (summary — full detail available on request)

| Area | Finding | Verdict |
|---|---|---|
| `backend/server/routes/mentorHub.js` | Queries `mentor_profiles`, `mentor_bookings`, `mentor_payouts` — **none exist** in the live DB. Also calls `supabaseAdmin.raw(...)`, which isn't a real method on the client. Mounted in `server.js` but **zero call sites** in `frontend/src` (`mentorApi` in `frontend/src/lib/api.js` is defined but never imported anywhere). | Dead code / scaffold. Safe to delete and fully redesign. |
| Razorpay integration | `backend/server/lib/razorpay.js` (client) + `backend/server/routes/payments.js` (real, working checkout create-order/verify-payment flow with HMAC signature check) are real and shared infra. **No webhook handler exists anywhere in the repo.** `server.env.example` uses `rzp_live_` naming, implying production keys are the norm here, not sandbox. | Real and must be preserved/reused. Webhook layer is a genuine gap — must be built new. |
| Verification/KYC | `backend/server/routes/verification.js` + `backend/server/lib/verification/pipeline.js` + `providers/registry.js` + `auditLog.js` is a real, working document-upload + hash-chained audit-log pipeline (`verification_audit_log` table exists, 0 rows). `questionBankAdmin.js`'s review-queue pattern (draft/in_review/approved/rejected + audit log) is a proven, working template for an approval workflow. | Real and reusable — mentor verification and mentor-application review should be built on top of these two existing patterns, not from scratch. |
| Notifications / audit / admin roles | `notifications` table is real (0 rows, already used by `mentorHub.js` and `recruiterComms.js`). Admin gating is **only** `profiles.is_admin` (boolean) via `requireAdmin.js` — no roles/permissions table exists or is planned. No generic audit-log framework exists; each feature owns its own audit table (`question_bank_audit_log`, `verification_audit_log`, `org_audit_log`). | Notifications reusable as-is. Admin model is a hard constraint — design must work within a single boolean flag, not invent new RBAC. Mentor workstream needs its own audit table, following the existing per-feature pattern. |
| Booking/calendar | No booking, appointment, or calendar system exists anywhere in the repo for in-app scheduling. `recruiterComms.js` has an unrelated, similarly-dead reference to a non-existent `interview_schedules` table (separate bug, out of scope here, worth flagging to whoever owns that file). | Fully greenfield — nothing to reuse or preserve. |
| Existing mentor data | Live DB has only `mentor_groups` / `mentor_group_members` (InstitutionOS cohort feature, unrelated, both empty). No `mentor_profiles`/`mentor_bookings`/`mentor_payouts` tables exist at all — not empty, never created. | **No user data to preserve.** Full schema freedom. |

(Sections 2–9 of the original v1 proposal — schema sketch, RLS sketch, state machines, payment
flow, refund controls, idempotency, rollback plan, and the pre-implementation gate — have been
superseded by the "v2 — implemented" content above, which reflects what was actually built rather
than what was proposed.)
