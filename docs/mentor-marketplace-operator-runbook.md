# Mentor Marketplace — Operator Runbook

Status: written during the Workstream 4 release-verification pass, 2026-07-24. The feature is
**flag-gated off** (`mentor_marketplace_v1` = `false` in both frontend and backend) — nothing below
is live for any real user today. This runbook exists so that whoever eventually operates this
feature (support, an admin, an on-call engineer) has concrete steps instead of having to read the
route/library source under time pressure during an incident.

Every action below either uses the admin routes in `backend/server/routes/mentorMarketplaceAdmin.js`
(requires `requireAuth` + `requireAdmin`, i.e. `profiles.is_admin = true`) or direct SQL via the
Supabase dashboard/MCP against project `eybchcqwbizjmzyrviri`. There is no admin UI for any of this
yet — every action is API-only or SQL-only.

---

## 1. Booking stuck in `pending_payment`

**Symptom:** a `mentor_bookings` row has been `pending_payment` for longer than the reservation hold
window (15 minutes, `MENTOR_MARKETPLACE_POLICY.reservation.holdMinutes` in `refundPolicy.js`) and the
mentee is asking why their slot disappeared or why checkout never confirmed.

**Check:**
```sql
SELECT b.id, b.status, b.mentee_id, b.mentor_id, b.slot_id, b.created_at,
       s.slot_status, s.reservation_expires_at
FROM mentor_bookings b JOIN mentor_availability_slots s ON s.id = b.slot_id
WHERE b.id = '<booking_id>';
```
Also check for a webhook event that might have arrived but failed to match:
```sql
SELECT * FROM mentor_payment_webhook_events
WHERE payload->'payload'->'payment'->'entity'->'notes'->>'mentor_booking_id' = '<booking_id>'
ORDER BY created_at DESC;
```

**Resolution:**
- If `reservation_expires_at` has passed and no webhook shows a captured payment: run
  `node scripts/mentorReconciliation.mjs --commit` (sweep 1 releases it: booking → `failed`, slot →
  `available`). The mentee can then re-book if they still want the slot.
- If a webhook row exists with `processing_result` starting `confirm_failed:` or
  `release_failed:`: the RPC call itself errored (check the `error` suffix). This needs manual
  investigation — call `mentor_confirm_booking`/`mentor_release_booking` directly via SQL once you've
  understood why the RPC failed the first time (most likely: booking already in a terminal state, or
  the booking id in the webhook payload doesn't match any row).
- If neither applies and it's genuinely still within the hold window: this is not stuck, just early —
  do nothing.

---

## 2. Duplicate webhook

**Symptom:** Razorpay dashboard shows a webhook was retried, or you want to confirm a specific
delivery wasn't double-processed.

**Check:**
```sql
SELECT razorpay_event_id, event_type, signature_valid, processing_result, seen_count, first_seen_at, last_seen_at
FROM mentor_payment_webhook_events WHERE razorpay_event_id = '<event_id>';
```
`seen_count > 1` confirms Razorpay redelivered it. `processing_result` reflects only the FIRST
processing attempt's outcome — every redelivery after that is a safe no-op by design (see
`webhook.js`'s `recordWebhookEvent`: a second insert with the same `razorpay_event_id` either finds
the existing row and bumps `seen_count`, or hits the `UNIQUE(razorpay_event_id)` constraint directly
— either path returns `{ duplicate: true }` and the booking-state-transition logic never runs twice).

**Resolution:** nothing to do — this is expected, correct behavior. If you see the SAME booking with
TWO different state transitions logged in `mentor_audit_log` for what should be one payment, that
indicates a real bug (the dedup gate failed) — escalate, do not attempt to manually undo a state
transition without understanding why dedup didn't hold.

---

## 3. Refund request

**Symptom:** a mentee (or mentor, for a mentor-initiated cancellation) wants a refund, or a dispute
resolved in the mentee's favor requires one.

**IMPORTANT — known gap:** this codebase computes the refund percentage/amount
(`refundPolicy.js`'s `resolveRefundPct`) and records it on `mentor_bookings.refund_amount` at
cancellation/dispute-resolution time, but **does not call the Razorpay refund API**. There is no
`razorpay().payments.refund()` call anywhere in this codebase. The recorded refund amount is a
statement of what's OWED, not evidence that money has moved.

**Check:**
```sql
SELECT id, status, refund_amount, currency, price_amount, cancelled_by, cancelled_at
FROM mentor_bookings WHERE id = '<booking_id>';
```

**Resolution (manual, until the Razorpay refund API is wired in):**
1. Confirm the booking's `status` is `cancelled_by_mentee` / `cancelled_by_mentor` /
   `refunded`-pending-dispute-resolution, and `refund_amount` is populated and correct per
   `refundPolicy.js`'s tiers (>24h full, 6-24h 50%, <6h none; mentor-initiated/mentor-no-show always
   full).
2. Go to the Razorpay dashboard directly (not this codebase) and issue the refund manually against
   the original `mentor_payments.razorpay_payment_id` for that booking, for the `refund_amount`.
3. Once done, manually update the booking to reflect the real-world state:
   ```sql
   UPDATE mentor_bookings SET status = 'refunded' WHERE id = '<booking_id>';
   INSERT INTO mentor_audit_log (entity_type, entity_id, actor_id, action, to_status, note)
   VALUES ('mentor_booking', '<booking_id>', '<admin_profile_id>', 'manual_refund_recorded', 'refunded',
     'Refund issued manually via Razorpay dashboard, ref: <razorpay refund id>');
   ```
4. Before this feature is ever exposed to real users, wiring a real
   `razorpay().payments.refund()` call into the cancellation/dispute-resolution code path (using the
   same `razorpay.js` client `payments.js` already uses) should be a release-blocking follow-up — see
   `docs/career-os-implementation-plan.md`'s Workstream 4 gate table.

---

## 4. Mentor no-show

**Symptom:** mentee reports the mentor never joined the session.

**Route:** no dedicated admin route currently exists for no-show reporting distinct from dispute
handling — this flows through the same booking-status update path an admin uses for disputes. Until
a dedicated route exists, resolve via SQL:

**Check window:** `isWithinNoShowReportingWindow` allows reporting up to 48h after `scheduled_end`
(`MENTOR_MARKETPLACE_POLICY.noShow.reportingWindowHours`).
```sql
SELECT id, status, scheduled_end, no_show_reported_by FROM mentor_bookings WHERE id = '<booking_id>';
```
**Resolution:**
```sql
UPDATE mentor_bookings SET status = 'no_show_mentor', no_show_reported_by = '<mentee_profile_id>',
  refund_amount = price_amount  -- mentor no-show = full refund per policy
WHERE id = '<booking_id>';
INSERT INTO mentor_audit_log (entity_type, entity_id, actor_id, action, to_status, note)
VALUES ('mentor_booking', '<booking_id>', '<admin_profile_id>', 'no_show_recorded_mentor', 'no_show_mentor', '<note>');
```
Then follow the Refund Request runbook above (manual Razorpay refund + status update to `refunded`).

---

## 5. Mentee no-show

**Symptom:** mentor reports the mentee never joined.

**Resolution:** per policy, mentee no-show = **no refund**, and the mentor remains payout-eligible
(`MENTOR_MARKETPLACE_POLICY.noShow.menteeNoShowMentorPayoutEligible = true`).
```sql
UPDATE mentor_bookings SET status = 'no_show_mentee', no_show_reported_by = '<mentor_profile_id>',
  refund_amount = 0
WHERE id = '<booking_id>';
INSERT INTO mentor_audit_log (entity_type, entity_id, actor_id, action, to_status, note)
VALUES ('mentor_booking', '<booking_id>', '<admin_profile_id>', 'no_show_recorded_mentee', 'no_show_mentee', '<note>');
```
No refund action needed. This booking IS eligible for the mentor's next payout batch (confirmed in
this verification pass — a `completed`/non-excluded-status booking is included by
`findEligibleBookings`; `no_show_mentee` is not in `MENTOR_MARKETPLACE_POLICY.payout.excludedStatuses`
today — if the intent is that no-show-mentee bookings SHOULD still pay the mentor, this is already
correct; if it's not obviously right for your business rule, review before the flag ever goes on).

---

## 6. Dispute opened

**Route:** `GET /admin/mentor/disputes` (list), resolution is a direct update (check
`mentorMarketplaceAdmin.js` for the exact resolve route name/shape before using — read the file, do
not guess the payload shape from this runbook alone).

**Check:**
```sql
SELECT * FROM mentor_disputes WHERE booking_id = '<booking_id>' ORDER BY created_at DESC;
```
**While a dispute is `open` or `investigating`:** the booking is automatically excluded from any
payout batch (verified in this pass — `findEligibleBookings` checks `mentor_disputes.status IN
('open','investigating')` and excludes any matching `booking_id`, independent of the booking's own
`status` column). This is the "on_hold" state referenced in the design doc — it is not a
`mentor_bookings.status` value, it is derived from `mentor_disputes` at query time.

**Resolution:** update `mentor_disputes.status` to `resolved` (or your chosen terminal status) via
the admin route, which should also update `mentor_bookings.status` appropriately (refunded / stays
completed / etc, depending on the dispute outcome) and write to `mentor_audit_log`. Confirm the audit
row exists after resolving:
```sql
SELECT * FROM mentor_audit_log WHERE entity_type='mentor_dispute' AND entity_id='<dispute_id>' ORDER BY created_at DESC LIMIT 1;
```

---

## 7. Payout hold

**Symptom:** a mentor asks why a specific booking wasn't included in their payout batch.

**Check (replicates `payouts.js`'s exact eligibility logic — verified against real seeded data in
this pass):**
```sql
SELECT b.id, b.status,
  b.status = ANY(ARRAY['failed','refunded','disputed','cancelled_by_mentee','cancelled_by_mentor']) AS excluded_by_status,
  EXISTS(SELECT 1 FROM mentor_payout_line_items li WHERE li.booking_id=b.id) AS already_paid,
  EXISTS(SELECT 1 FROM mentor_disputes d WHERE d.booking_id=b.id AND d.status IN ('open','investigating')) AS on_hold
FROM mentor_bookings b WHERE b.id = '<booking_id>';
```
Any of `excluded_by_status`, `already_paid`, or `on_hold` being `true` explains the exclusion. There
is no manual override route to force-include an excluded booking — if a booking should genuinely be
paid despite one of these (e.g. a dispute was resolved in the mentor's favor), resolve the underlying
condition (dispute status, booking status) first, then re-run batch creation; do not hand-edit
`mentor_payout_line_items` to bypass the exclusion logic.

---

## 8. Payout retry (failed/needs re-issuing)

**Symptom:** a `mentor_payouts` batch is stuck `finalized` (not yet `paid`) because the actual manual
bank transfer failed or hasn't happened yet, or was recorded with a wrong `transfer_reference`.

**Note:** there is no automated retry — payouts are admin-triggered manual-transfer batches, not a
Razorpay Route integration (explicitly out of scope, see design doc). "Retry" here means the admin
does the transfer again outside this system and records it.

**Check:**
```sql
SELECT id, status, gross_amount, net_amount, transfer_reference, paid_at FROM mentor_payouts WHERE id = '<payout_id>';
```
**Resolution:**
- If `status = 'finalized'` and no transfer has happened yet: perform the manual transfer, then call
  the mark-paid admin route (or, if that route doesn't exist yet, update directly):
  ```sql
  UPDATE mentor_payouts SET status='paid', paid_at=now(), transfer_reference='<new reference>' WHERE id='<payout_id>';
  INSERT INTO mentor_audit_log (entity_type, entity_id, actor_id, action, to_status, note)
  VALUES ('mentor_payout', '<payout_id>', '<admin_profile_id>', 'payout_batch_marked_paid_admin_triggered', 'paid', 'retry, ref=<new reference>');
  ```
- If `transfer_reference` was recorded wrong (typo, wrong bank ref): update it directly, and log the
  correction in `mentor_audit_log` (don't silently overwrite without an audit trail).
- A booking can never appear in two payout batches — `mentor_payout_line_items.booking_id` is
  `UNIQUE` at the DB level (verified in this pass: a duplicate insert attempt for an
  already-paid-out booking fails with `duplicate key value violates unique constraint
  "uq_mentor_payout_booking"`). If you need to re-pay a specific booking for any reason, you cannot
  do it through `createPayoutBatch` again — that requires a manual, audited, out-of-band correction.

---

## 9. Feature-flag emergency off (rollback)

**This is already the current production state** — `mentor_marketplace_v1` defaults `false` in both
`frontend/src/config/featureFlags.js` and the backend's `MENTOR_MARKETPLACE_V1_ENABLED` constant in
`backend/server/routes/mentorMarketplace.js`. This section is the procedure for the future moment
someone has turned it ON and needs it back OFF fast.

**Exact env vars:**
- Backend: `MENTOR_MARKETPLACE_V1` (checked as `=== "true"`, also accepts `VITE_FF_MENTOR_MARKETPLACE_V1`
  as a fallback — same var name convention as the frontend's, for deployment platforms that only let
  you set one set of env vars for both).
- Frontend (Vite build-time): `VITE_FF_MENTOR_MARKETPLACE_V1`.

**Procedure:**
1. Set `MENTOR_MARKETPLACE_V1=false` (or unset it — default is `false`) in the backend's environment
   (Render/Railway/whatever host — dashboard env var edit, not a code change).
2. **Restart required, backend:** yes. The flag is read once into a top-level `const` at module
   load time (`MENTOR_MARKETPLACE_V1_ENABLED` in `mentorMarketplace.js`), not re-evaluated per
   request. A running Node process will keep using whatever value was true at boot until it
   restarts. On Render this means triggering a redeploy/restart of the service — an env var change
   alone does not take effect until the process restarts.
3. **Frontend:** `VITE_FF_MENTOR_MARKETPLACE_V1=false` requires a **rebuild** (Vite bakes
   `import.meta.env` values in at build time) — not just a redeploy of already-built static assets.
   Trigger a new build.
4. **Time to take effect:** as fast as your host's restart/redeploy cycle — no DB migration, no data
   rollback, nothing destructive. This was the entire design point of gating behind a flag (see
   design doc's "Rollback plan" section).
5. **Verification after flipping off:** hit any mentor route with a valid session token and confirm
   403 for user-facing routes (`mentorMarketplace.js`) or 404 for the webhook
   (`mentorMarketplaceWebhook.js`). See §10 below for the one confounding issue found in this pass
   that can make this check misleading.

**Known confound when testing this locally (found in this verification pass, 2026-07-24):** see
`docs/career-os-implementation-plan.md`'s release-verification section for a critical, unrelated
pre-existing routing bug in `backend/server/routes/questionBankAdmin.js` that currently intercepts
`/api/pro/v1/mentor/*` requests before they reach this flag check, for any caller without a real
admin session token. **The end-user-visible outcome (mentor routes are unreachable) is still
correct today**, but it is achieved by the wrong mechanism for authenticated non-admin users, not by
this flag. Do not use this as evidence the flag mechanism itself works — verify via the isolated
router test described in that document instead, or fix the ordering bug first.

---

## 10. Containment / down-migration (last resort, NOT applied)

If the schema itself ever needs to be torn out (not just flag-disabled), a reverse-dependency-order
`DROP TABLE` script exists as a separate, clearly-labeled, NOT-applied file:
`docs/mentor-marketplace-ws4-teardown.sql` (see that file's header — it was validated for syntactic
correctness via `BEGIN; ...; ROLLBACK;` in this verification pass, never committed to the live
database). Flag-off is almost always the right first move; only use the teardown script if there is
a specific reason the tables themselves (not just traffic to them) must be removed.
