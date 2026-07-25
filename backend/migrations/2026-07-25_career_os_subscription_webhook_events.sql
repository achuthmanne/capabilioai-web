-- Tranche C (2026-07-25): subscription/plan Razorpay webhook safety net.
-- Mirrors mentor_payment_webhook_events (Workstream 4) for the general
-- /api/create-order + /api/verify-payment subscription path, which never
-- had a webhook — see backend/server/lib/payments/subscriptionWebhook.js
-- for why this closes a real gap (payment captured client-side but the
-- browser never completes /verify-payment => no entitlement, no recovery).

create table if not exists public.payment_webhook_events (
  id                 uuid primary key default gen_random_uuid(),
  razorpay_event_id  text unique not null,
  event_type         text,
  payload            jsonb not null default '{}'::jsonb,
  signature_valid    boolean not null default false,
  processing_result  text,
  seen_count         integer not null default 1,
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

create index if not exists payment_webhook_events_created_idx on public.payment_webhook_events (created_at desc);

alter table public.payment_webhook_events enable row level security;

-- Admin-only read (reuses the existing mentor_is_admin() helper — a plain
-- profiles.is_admin check with no mentor-specific meaning despite the name,
-- see mentor_payment_webhook_events for precedent). No INSERT/UPDATE policy
-- for any role: all writes go through supabaseAdmin (service role), which
-- bypasses RLS by design, same as every other webhook-event table here.
create policy payment_webhook_events_admin_select
  on public.payment_webhook_events
  for select
  using (mentor_is_admin(auth.uid()));
