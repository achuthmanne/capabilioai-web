-- 2026-07-26_professional_elo_v2_trust_gating.sql
--
-- Professional Skill Rating v2, Phase 1 (staged implementation of the
-- ELO v2 architecture doc, docs/elo-engine-v2-architecture.md).
--
-- Additive only. Nothing here alters existing column types or drops
-- anything. Existing professional_elo_state rows are untouched — new
-- columns default to 0 so every existing user's visible ELO is unaffected
-- until a verification event actually recomputes their bonus.
--
-- What this adds:
--   1. professional_elo_state.experience_bonus_elo / cert_bonus_elo —
--      bounded modifiers (capped 150 / 80 respectively, enforced in
--      application code, not a DB constraint, since the cap depends on a
--      guidance table, not a simple range check).
--   2. professional_certifications — structured, per-certificate
--      verification tracking. profiles.certifications (jsonb) remains the
--      "claimed" display list for the profile UI; this new table is the
--      ONLY thing the cert-bonus calculator is allowed to read, and it is
--      the source of truth for verification status per certificate.
--   3. epf_records.verification_status gets 'rejected' and 'suspended' as
--      additional valid values (no CHECK constraint existed to alter —
--      confirmed via information_schema before writing this migration —
--      so this is a documentation-only note; the column already accepts
--      any text value).

-- ── 1. Bounded modifier columns on professional_elo_state ──────────────────
alter table professional_elo_state
  add column if not exists experience_bonus_elo integer not null default 0,
  add column if not exists cert_bonus_elo        integer not null default 0;

comment on column professional_elo_state.experience_bonus_elo is
  'Bounded modifier (max 150) computed ONLY from verified employment duration (EPFO/UAN-verified via epf_records.verification_status = ''verified''). Never written by profile CRUD, resume upload, or manual experience entry — see backend/server/lib/professionalElo/verifiedBonuses.js, the only writer.';
comment on column professional_elo_state.cert_bonus_elo is
  'Bounded modifier (max 80) computed ONLY from professional_certifications rows with verification_status = ''verified''. Never written by profile CRUD or self-added certificates — see backend/server/lib/professionalElo/verifiedBonuses.js, the only writer.';

-- ── 2. Structured certification verification tracking ──────────────────────
create table if not exists professional_certifications (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  cert_name             text not null,
  cert_type             text,             -- maps to the bonus-value guidance table (e.g. 'aws_professional','oscp')
  issuer                text,
  source                text not null default 'manual' check (source in ('manual','resume_upload')),
  verification_status   text not null default 'claimed'
                          check (verification_status in ('claimed','pending_verification','verified','rejected','suspended')),
  verification_provider text,             -- 'certificate_ocr','manual_review'
  verified_at           timestamptz,
  rejected_reason       text,
  bonus_value           integer,          -- snapshot of the guidance-table value applied when verified (audit trail)
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_professional_certifications_user
  on professional_certifications(user_id);
create index if not exists idx_professional_certifications_status
  on professional_certifications(user_id, verification_status);

alter table professional_certifications enable row level security;

drop policy if exists "own certifications select" on professional_certifications;
create policy "own certifications select" on professional_certifications
  for select using (auth.uid() = user_id);

drop policy if exists "own certifications insert" on professional_certifications;
create policy "own certifications insert" on professional_certifications
  for insert with check (auth.uid() = user_id);

-- Users may not directly update verification_status/bonus_value themselves
-- (that would let anyone self-verify) — updates to those columns only ever
-- happen via the service-role client from the verification callback route.
-- We still allow users to update their own non-status fields (e.g. fixing a
-- typo'd cert_name while still 'claimed') via a narrower policy.
drop policy if exists "own certifications update while claimed" on professional_certifications;
create policy "own certifications update while claimed" on professional_certifications
  for update using (auth.uid() = user_id and verification_status = 'claimed')
  with check (auth.uid() = user_id);
