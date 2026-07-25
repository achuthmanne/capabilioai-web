-- ============================================================================
-- Career OS Workstream 4 — Mentor Marketplace (v2 design, real implementation)
-- ============================================================================
-- ADDITIVE ONLY. No existing table is altered or dropped. Safe to run on the
-- live production database (eybchcqwbizjmzyrviri). Mirrors the audit-approved
-- design in docs/mentor-marketplace-ws4-design-proposal.md (v2).
--
-- Does NOT touch mentor_groups / mentor_group_members (unrelated InstitutionOS
-- feature) or any other existing table.
--
-- Contents:
--   1. Tables: mentor_applications, mentor_profiles, mentor_availability_slots,
--      mentor_bookings, mentor_payments, mentor_payment_webhook_events,
--      mentor_idempotency_keys, mentor_payouts, mentor_payout_line_items,
--      mentor_disputes, mentor_reviews, mentor_review_reports, mentor_audit_log
--   2. Indexes for the reconciliation sweep / lookup patterns
--   3. RLS enabled + policies on every table
--   4. SECURITY DEFINER Postgres functions for atomic slot reservation +
--      booking-status transitions (the actual "transaction + row lock" —
--      Supabase's REST API is stateless per-request, so the row lock has to
--      live inside a single plpgsql function body, not spread across two
--      separate supabase-js calls).
-- ============================================================================

-- ─── 1. mentor_applications ─────────────────────────────────────────────────
create table if not exists public.mentor_applications (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  bio                text,
  expertise_tags     text[] default '{}',
  proposed_hourly_rate numeric(10,2),
  currency           text not null default 'INR',
  status             text not null default 'submitted'
                       check (status in ('draft','submitted','in_review','approved','rejected','needs_more_info')),
  reviewer_id        uuid references public.profiles(id),
  rejection_reason   text,
  submitted_at       timestamptz default now(),
  decided_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_mentor_applications_user on public.mentor_applications(user_id);
create index if not exists idx_mentor_applications_status on public.mentor_applications(status);

-- ─── 2. mentor_profiles ─────────────────────────────────────────────────────
create table if not exists public.mentor_profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references public.profiles(id) on delete cascade,
  application_id     uuid references public.mentor_applications(id),
  bio                text,
  expertise_tags     text[] default '{}',
  hourly_rate        numeric(10,2) not null,
  currency           text not null default 'INR',
  timezone           text default 'Asia/Kolkata',
  is_active          boolean not null default true,
  is_suspended       boolean not null default false,
  suspended_reason   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_mentor_profiles_active on public.mentor_profiles(is_active, is_suspended);

-- ─── 3. mentor_availability_slots ───────────────────────────────────────────
create table if not exists public.mentor_availability_slots (
  id                     uuid primary key default gen_random_uuid(),
  mentor_id              uuid not null references public.mentor_profiles(id) on delete cascade,
  start_at               timestamptz not null,
  end_at                 timestamptz not null,
  slot_status            text not null default 'available'
                           check (slot_status in ('available','reserved','booked')),
  reservation_expires_at timestamptz,
  reserved_by            uuid references public.profiles(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint chk_slot_time_order check (end_at > start_at)
);
create unique index if not exists uq_mentor_slot_start on public.mentor_availability_slots(mentor_id, start_at);
create index if not exists idx_mentor_slots_status_expiry on public.mentor_availability_slots(slot_status, reservation_expires_at);
create index if not exists idx_mentor_slots_mentor on public.mentor_availability_slots(mentor_id);

-- ─── 4. mentor_bookings ──────────────────────────────────────────────────────
create table if not exists public.mentor_bookings (
  id                  uuid primary key default gen_random_uuid(),
  mentor_id           uuid not null references public.mentor_profiles(id),
  mentee_id           uuid not null references public.profiles(id),
  slot_id             uuid not null unique references public.mentor_availability_slots(id),
  status              text not null default 'pending_payment'
                        check (status in (
                          'pending_payment','confirmed','completed',
                          'cancelled_by_mentee','cancelled_by_mentor',
                          'no_show_mentee','no_show_mentor',
                          'disputed','refunded','failed'
                        )),
  scheduled_start     timestamptz not null,
  scheduled_end       timestamptz not null,
  price_amount        numeric(10,2) not null,
  currency            text not null default 'INR',
  no_show_reported_by uuid references public.profiles(id),
  no_show_reported_at timestamptz,
  cancelled_by        uuid references public.profiles(id),
  cancelled_at        timestamptz,
  cancellation_reason text,
  refund_amount       numeric(10,2),
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Real DB-level uniqueness (not just idempotency-key softening): no two
  -- bookings for the same (mentor, mentee, scheduled_start).
  constraint uq_mentor_mentee_start unique (mentor_id, mentee_id, scheduled_start)
);
create index if not exists idx_mentor_bookings_mentor on public.mentor_bookings(mentor_id, status);
create index if not exists idx_mentor_bookings_mentee on public.mentor_bookings(mentee_id, status);
create index if not exists idx_mentor_bookings_status on public.mentor_bookings(status);
create index if not exists idx_mentor_bookings_scheduled_end on public.mentor_bookings(scheduled_end, status);

-- ─── 5. mentor_payments ──────────────────────────────────────────────────────
create table if not exists public.mentor_payments (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid not null references public.mentor_bookings(id) on delete cascade,
  razorpay_order_id    text unique,
  razorpay_payment_id  text,
  razorpay_signature   text,
  amount               numeric(10,2) not null,
  currency             text not null default 'INR',
  status               text not null default 'created'
                         check (status in ('created','authorized','captured','failed','refunded','partially_refunded')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_mentor_payments_booking on public.mentor_payments(booking_id);
create index if not exists idx_mentor_payments_status on public.mentor_payments(status);

-- ─── 6. mentor_payment_webhook_events ────────────────────────────────────────
create table if not exists public.mentor_payment_webhook_events (
  id                 uuid primary key default gen_random_uuid(),
  razorpay_event_id  text not null unique,
  event_type         text,
  payload            jsonb not null,
  signature_valid    boolean not null,
  processing_result  text,
  seen_count         integer not null default 1,
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  created_at         timestamptz not null default now()
);
create index if not exists idx_mentor_webhook_events_type on public.mentor_payment_webhook_events(event_type);

-- ─── 7. mentor_idempotency_keys ──────────────────────────────────────────────
create table if not exists public.mentor_idempotency_keys (
  id                uuid primary key default gen_random_uuid(),
  idempotency_key   text not null,
  user_id           uuid not null references public.profiles(id),
  endpoint          text not null,
  request_hash      text not null,
  response_status   integer,
  response_payload  jsonb,
  expires_at        timestamptz not null default (now() + interval '24 hours'),
  created_at        timestamptz not null default now(),
  constraint uq_mentor_idem_key unique (idempotency_key, endpoint, user_id)
);
create index if not exists idx_mentor_idem_expiry on public.mentor_idempotency_keys(expires_at);

-- ─── 8. mentor_payouts (admin-triggered payout BATCHES — never "automated") ─
create table if not exists public.mentor_payouts (
  id                     uuid primary key default gen_random_uuid(),
  mentor_id              uuid not null references public.mentor_profiles(id),
  period_start           date not null,
  period_end             date not null,
  status                 text not null default 'draft'
                           check (status in ('draft','finalized','paid','on_hold','failed')),
  platform_fee_pct       numeric(5,4) not null default 0.1500,
  gross_amount           numeric(12,2) not null default 0,
  platform_fee_amount    numeric(12,2) not null default 0,
  net_amount             numeric(12,2) not null default 0,
  currency               text not null default 'INR',
  transfer_reference     text,
  tax_invoice_number     text,
  tax_invoice_required   boolean not null default false,
  triggered_by_admin_id  uuid not null references public.profiles(id),
  created_at             timestamptz not null default now(),
  finalized_at           timestamptz,
  paid_at                timestamptz
);
create index if not exists idx_mentor_payouts_mentor on public.mentor_payouts(mentor_id, status);
create index if not exists idx_mentor_payouts_period on public.mentor_payouts(period_start, period_end);

-- ─── 9. mentor_payout_line_items ─────────────────────────────────────────────
create table if not exists public.mentor_payout_line_items (
  id          uuid primary key default gen_random_uuid(),
  payout_id   uuid not null references public.mentor_payouts(id) on delete cascade,
  booking_id  uuid not null references public.mentor_bookings(id),
  amount      numeric(10,2) not null,
  created_at  timestamptz not null default now(),
  -- A booking can only ever be paid out once, in exactly one batch.
  constraint uq_mentor_payout_booking unique (booking_id)
);
create index if not exists idx_mentor_payout_line_items_payout on public.mentor_payout_line_items(payout_id);

-- ─── 10. mentor_disputes ─────────────────────────────────────────────────────
create table if not exists public.mentor_disputes (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.mentor_bookings(id),
  raised_by_user_id   uuid not null references public.profiles(id),
  raised_by_role      text not null check (raised_by_role in ('mentee','mentor')),
  reason              text not null,
  status              text not null default 'open'
                        check (status in ('open','investigating','resolved_refund','resolved_partial_refund','resolved_no_refund')),
  resolved_by_admin_id uuid references public.profiles(id),
  resolution_notes    text,
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz
);
create index if not exists idx_mentor_disputes_booking on public.mentor_disputes(booking_id);
create index if not exists idx_mentor_disputes_status on public.mentor_disputes(status);

-- ─── 11. mentor_reviews ──────────────────────────────────────────────────────
create table if not exists public.mentor_reviews (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null unique references public.mentor_bookings(id),
  mentee_id          uuid not null references public.profiles(id),
  mentor_id          uuid not null references public.mentor_profiles(id),
  rating             integer not null check (rating between 1 and 5),
  comment            text,
  moderation_status  text not null default 'pending'
                       check (moderation_status in ('pending','approved','rejected')),
  moderated_by       uuid references public.profiles(id),
  moderated_at       timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists idx_mentor_reviews_mentor on public.mentor_reviews(mentor_id, moderation_status);

-- ─── 12. mentor_review_reports ───────────────────────────────────────────────
create table if not exists public.mentor_review_reports (
  id             uuid primary key default gen_random_uuid(),
  review_id      uuid not null references public.mentor_reviews(id) on delete cascade,
  reported_by    uuid not null references public.profiles(id),
  reason         text not null,
  status         text not null default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  resolved_by    uuid references public.profiles(id),
  resolved_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_mentor_review_reports_status on public.mentor_review_reports(status);

-- ─── 13. mentor_audit_log (append-only) ──────────────────────────────────────
create table if not exists public.mentor_audit_log (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,
  entity_id    uuid,
  actor_id     uuid references public.profiles(id),
  action       text not null,
  from_status  text,
  to_status    text,
  note         text,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_mentor_audit_log_entity on public.mentor_audit_log(entity_type, entity_id);
create index if not exists idx_mentor_audit_log_created on public.mentor_audit_log(created_at);

-- ============================================================================
-- RLS — enabled on every table above
-- ============================================================================
alter table public.mentor_applications         enable row level security;
alter table public.mentor_profiles             enable row level security;
alter table public.mentor_availability_slots   enable row level security;
alter table public.mentor_bookings             enable row level security;
alter table public.mentor_payments             enable row level security;
alter table public.mentor_payment_webhook_events enable row level security;
alter table public.mentor_idempotency_keys     enable row level security;
alter table public.mentor_payouts              enable row level security;
alter table public.mentor_payout_line_items    enable row level security;
alter table public.mentor_disputes             enable row level security;
alter table public.mentor_reviews              enable row level security;
alter table public.mentor_review_reports       enable row level security;
alter table public.mentor_audit_log            enable row level security;

-- Helper: is the current auth.uid() an admin? (mirrors profiles.is_admin gate)
create or replace function public.mentor_is_admin(p_uid uuid)
returns boolean language sql stable as $$
  select coalesce((select is_admin from public.profiles where id = p_uid), false)
$$;

-- mentor_applications: applicant owns own row; admin full access
drop policy if exists mentor_applications_select_own on public.mentor_applications;
create policy mentor_applications_select_own on public.mentor_applications
  for select using (user_id = auth.uid() or public.mentor_is_admin(auth.uid()));
drop policy if exists mentor_applications_insert_own on public.mentor_applications;
create policy mentor_applications_insert_own on public.mentor_applications
  for insert with check (user_id = auth.uid());
drop policy if exists mentor_applications_admin_update on public.mentor_applications;
create policy mentor_applications_admin_update on public.mentor_applications
  for update using (public.mentor_is_admin(auth.uid()));

-- mentor_profiles: public can see active+non-suspended; mentor can see/update own; admin full
drop policy if exists mentor_profiles_public_select on public.mentor_profiles;
create policy mentor_profiles_public_select on public.mentor_profiles
  for select using (is_active = true and is_suspended = false or user_id = auth.uid() or public.mentor_is_admin(auth.uid()));
drop policy if exists mentor_profiles_admin_write on public.mentor_profiles;
create policy mentor_profiles_admin_write on public.mentor_profiles
  for all using (public.mentor_is_admin(auth.uid())) with check (public.mentor_is_admin(auth.uid()));

-- mentor_availability_slots: public can see available slots of active mentors; admin/service full
drop policy if exists mentor_slots_public_select on public.mentor_availability_slots;
create policy mentor_slots_public_select on public.mentor_availability_slots
  for select using (
    slot_status = 'available'
    or reserved_by = auth.uid()
    or public.mentor_is_admin(auth.uid())
    or mentor_id in (select id from public.mentor_profiles where user_id = auth.uid())
  );
drop policy if exists mentor_slots_admin_write on public.mentor_availability_slots;
create policy mentor_slots_admin_write on public.mentor_availability_slots
  for all using (public.mentor_is_admin(auth.uid())) with check (public.mentor_is_admin(auth.uid()));

-- mentor_bookings: mentee/mentor see own; NO client insert/update policy at all
-- (state transitions only via SECURITY DEFINER functions / service-role backend).
drop policy if exists mentor_bookings_party_select on public.mentor_bookings;
create policy mentor_bookings_party_select on public.mentor_bookings
  for select using (
    mentee_id = auth.uid()
    or public.mentor_is_admin(auth.uid())
    or mentor_id in (select id from public.mentor_profiles where user_id = auth.uid())
  );

-- mentor_payments: mentee/mentor of the booking can select; no client insert/update
drop policy if exists mentor_payments_party_select on public.mentor_payments;
create policy mentor_payments_party_select on public.mentor_payments
  for select using (
    public.mentor_is_admin(auth.uid())
    or booking_id in (
      select id from public.mentor_bookings b
      where b.mentee_id = auth.uid()
         or b.mentor_id in (select id from public.mentor_profiles where user_id = auth.uid())
    )
  );

-- mentor_payment_webhook_events: service role / admin only
drop policy if exists mentor_webhook_events_admin_select on public.mentor_payment_webhook_events;
create policy mentor_webhook_events_admin_select on public.mentor_payment_webhook_events
  for select using (public.mentor_is_admin(auth.uid()));

-- mentor_idempotency_keys: no client access at all (service role only, bypasses RLS)
drop policy if exists mentor_idem_admin_select on public.mentor_idempotency_keys;
create policy mentor_idem_admin_select on public.mentor_idempotency_keys
  for select using (public.mentor_is_admin(auth.uid()));

-- mentor_payouts: mentor sees own; admin full; no client writes
drop policy if exists mentor_payouts_own_select on public.mentor_payouts;
create policy mentor_payouts_own_select on public.mentor_payouts
  for select using (
    public.mentor_is_admin(auth.uid())
    or mentor_id in (select id from public.mentor_profiles where user_id = auth.uid())
  );
drop policy if exists mentor_payouts_admin_write on public.mentor_payouts;
create policy mentor_payouts_admin_write on public.mentor_payouts
  for all using (public.mentor_is_admin(auth.uid())) with check (public.mentor_is_admin(auth.uid()));

-- mentor_payout_line_items: same visibility as parent payout
drop policy if exists mentor_payout_line_items_select on public.mentor_payout_line_items;
create policy mentor_payout_line_items_select on public.mentor_payout_line_items
  for select using (
    public.mentor_is_admin(auth.uid())
    or payout_id in (
      select id from public.mentor_payouts p
      where p.mentor_id in (select id from public.mentor_profiles where user_id = auth.uid())
    )
  );
drop policy if exists mentor_payout_line_items_admin_write on public.mentor_payout_line_items;
create policy mentor_payout_line_items_admin_write on public.mentor_payout_line_items
  for all using (public.mentor_is_admin(auth.uid())) with check (public.mentor_is_admin(auth.uid()));

-- mentor_disputes: party to booking can select/insert own; admin updates
drop policy if exists mentor_disputes_party_select on public.mentor_disputes;
create policy mentor_disputes_party_select on public.mentor_disputes
  for select using (
    raised_by_user_id = auth.uid()
    or public.mentor_is_admin(auth.uid())
    or booking_id in (
      select id from public.mentor_bookings b
      where b.mentee_id = auth.uid()
         or b.mentor_id in (select id from public.mentor_profiles where user_id = auth.uid())
    )
  );
drop policy if exists mentor_disputes_party_insert on public.mentor_disputes;
create policy mentor_disputes_party_insert on public.mentor_disputes
  for insert with check (raised_by_user_id = auth.uid());
drop policy if exists mentor_disputes_admin_update on public.mentor_disputes;
create policy mentor_disputes_admin_update on public.mentor_disputes
  for update using (public.mentor_is_admin(auth.uid()));

-- mentor_reviews: public sees approved only; mentee inserts own; admin moderates
drop policy if exists mentor_reviews_public_select on public.mentor_reviews;
create policy mentor_reviews_public_select on public.mentor_reviews
  for select using (
    moderation_status = 'approved'
    or mentee_id = auth.uid()
    or public.mentor_is_admin(auth.uid())
    or mentor_id in (select id from public.mentor_profiles where user_id = auth.uid())
  );
drop policy if exists mentor_reviews_mentee_insert on public.mentor_reviews;
create policy mentor_reviews_mentee_insert on public.mentor_reviews
  for insert with check (
    mentee_id = auth.uid()
    and booking_id in (select id from public.mentor_bookings where mentee_id = auth.uid() and status = 'completed')
  );
drop policy if exists mentor_reviews_admin_update on public.mentor_reviews;
create policy mentor_reviews_admin_update on public.mentor_reviews
  for update using (public.mentor_is_admin(auth.uid()));

-- mentor_review_reports: any authenticated user can report; admin resolves
drop policy if exists mentor_review_reports_insert on public.mentor_review_reports;
create policy mentor_review_reports_insert on public.mentor_review_reports
  for insert with check (reported_by = auth.uid());
drop policy if exists mentor_review_reports_select on public.mentor_review_reports;
create policy mentor_review_reports_select on public.mentor_review_reports
  for select using (reported_by = auth.uid() or public.mentor_is_admin(auth.uid()));
drop policy if exists mentor_review_reports_admin_update on public.mentor_review_reports;
create policy mentor_review_reports_admin_update on public.mentor_review_reports
  for update using (public.mentor_is_admin(auth.uid()));

-- mentor_audit_log: admin-only select, no client writes
drop policy if exists mentor_audit_log_admin_select on public.mentor_audit_log;
create policy mentor_audit_log_admin_select on public.mentor_audit_log
  for select using (public.mentor_is_admin(auth.uid()));

-- ============================================================================
-- SECURITY DEFINER functions — atomic slot reservation + status transitions.
-- Called only via supabaseAdmin.rpc() from the backend (service role).
-- Execute is revoked from anon/authenticated and granted only to
-- service_role, since these are internal server-orchestration primitives,
-- not directly client-callable endpoints.
-- ============================================================================

-- Reserve a slot + create a pending_payment booking in one locked transaction.
-- Returns jsonb: {success:true, booking_id} or {success:false, error:'...'}
create or replace function public.mentor_reserve_slot(
  p_slot_id uuid,
  p_mentor_id uuid,
  p_mentee_id uuid,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_price_amount numeric,
  p_currency text,
  p_hold_minutes integer default 15
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot record;
  v_booking_id uuid;
begin
  -- Row lock: only one concurrent caller proceeds past this point for this slot.
  select * into v_slot from public.mentor_availability_slots
    where id = p_slot_id and mentor_id = p_mentor_id
    for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'slot_not_found');
  end if;

  if v_slot.slot_status = 'booked' then
    return jsonb_build_object('success', false, 'error', 'slot_no_longer_available');
  end if;

  if v_slot.slot_status = 'reserved' and v_slot.reservation_expires_at is not null
     and v_slot.reservation_expires_at > now() then
    return jsonb_build_object('success', false, 'error', 'slot_no_longer_available');
  end if;

  update public.mentor_availability_slots
    set slot_status = 'reserved',
        reservation_expires_at = now() + make_interval(mins => p_hold_minutes),
        reserved_by = p_mentee_id,
        updated_at = now()
    where id = p_slot_id;

  insert into public.mentor_bookings (
    mentor_id, mentee_id, slot_id, status,
    scheduled_start, scheduled_end, price_amount, currency
  ) values (
    p_mentor_id, p_mentee_id, p_slot_id, 'pending_payment',
    p_scheduled_start, p_scheduled_end, p_price_amount, p_currency
  ) returning id into v_booking_id;

  insert into public.mentor_audit_log(entity_type, entity_id, actor_id, action, to_status, note)
    values ('mentor_booking', v_booking_id, p_mentee_id, 'reserved', 'pending_payment',
            format('slot %s reserved for %s minutes', p_slot_id, p_hold_minutes));

  return jsonb_build_object('success', true, 'booking_id', v_booking_id, 'slot_id', p_slot_id);
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'duplicate_booking');
end;
$$;

-- Confirm a booking on a verified captured payment: booking -> confirmed, slot -> booked.
create or replace function public.mentor_confirm_booking(p_booking_id uuid, p_actor_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
begin
  select * into v_booking from public.mentor_bookings where id = p_booking_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'booking_not_found');
  end if;
  if v_booking.status not in ('pending_payment') then
    return jsonb_build_object('success', false, 'error', 'invalid_state', 'current_status', v_booking.status);
  end if;

  update public.mentor_bookings set status = 'confirmed', updated_at = now() where id = p_booking_id;
  update public.mentor_availability_slots set slot_status = 'booked', reservation_expires_at = null, updated_at = now()
    where id = v_booking.slot_id;

  insert into public.mentor_audit_log(entity_type, entity_id, actor_id, action, from_status, to_status)
    values ('mentor_booking', p_booking_id, p_actor_id, 'payment_confirmed', 'pending_payment', 'confirmed');

  return jsonb_build_object('success', true, 'booking_id', p_booking_id);
end;
$$;

-- Release a slot back to available on failure/cancellation/expiry.
create or replace function public.mentor_release_booking(
  p_booking_id uuid,
  p_new_status text,
  p_actor_id uuid default null,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
begin
  select * into v_booking from public.mentor_bookings where id = p_booking_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'booking_not_found');
  end if;
  if v_booking.status in ('completed','refunded') then
    return jsonb_build_object('success', false, 'error', 'invalid_state', 'current_status', v_booking.status);
  end if;

  update public.mentor_bookings
    set status = p_new_status,
        cancelled_by = case when p_new_status like 'cancelled%' then p_actor_id else cancelled_by end,
        cancelled_at = case when p_new_status like 'cancelled%' then now() else cancelled_at end,
        cancellation_reason = coalesce(p_reason, cancellation_reason),
        updated_at = now()
    where id = p_booking_id;

  update public.mentor_availability_slots
    set slot_status = 'available', reservation_expires_at = null, reserved_by = null, updated_at = now()
    where id = v_booking.slot_id and slot_status <> 'booked';

  insert into public.mentor_audit_log(entity_type, entity_id, actor_id, action, from_status, to_status, note)
    values ('mentor_booking', p_booking_id, p_actor_id, 'released', v_booking.status, p_new_status, p_reason);

  return jsonb_build_object('success', true, 'booking_id', p_booking_id);
end;
$$;

revoke all on function public.mentor_reserve_slot(uuid,uuid,uuid,timestamptz,timestamptz,numeric,text,integer) from public;
revoke all on function public.mentor_confirm_booking(uuid,uuid) from public;
revoke all on function public.mentor_release_booking(uuid,text,uuid,text) from public;
grant execute on function public.mentor_reserve_slot(uuid,uuid,uuid,timestamptz,timestamptz,numeric,text,integer) to service_role;
grant execute on function public.mentor_confirm_booking(uuid,uuid) to service_role;
grant execute on function public.mentor_release_booking(uuid,text,uuid,text) to service_role;
