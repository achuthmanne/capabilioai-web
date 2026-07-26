-- Down migration for 2026-07-26_professional_elo_v2_trust_gating.sql
drop table if exists professional_certifications;

alter table professional_elo_state
  drop column if exists experience_bonus_elo,
  drop column if exists cert_bonus_elo;
