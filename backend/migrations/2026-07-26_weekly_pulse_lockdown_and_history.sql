-- 2026-07-26_weekly_pulse_lockdown_and_history.sql
--
-- Weekly Skill Pulse: timer/anti-cheat event logging + history support.
-- Additive only — existing rows get safe defaults, nothing dropped/renamed.

alter table weekly_pulses
  add column if not exists suspicious_events jsonb not null default '[]'::jsonb,
  add column if not exists timed_out_count integer not null default 0;

comment on column weekly_pulses.suspicious_events is
  'Array of {type, at} events logged client-side during the test (tab_blur, visibility_hidden, copy_attempt, paste_attempt, context_menu, timeout) — real anti-cheat signal, not enforcement. See backend/server/routes/weeklyPulse.js POST /pro/weekly/:pulseId/flag-suspicious.';
comment on column weekly_pulses.timed_out_count is
  'Count of questions in this pulse that hit the 45s timer and were auto-submitted/auto-locked rather than answered.';

create index if not exists idx_weekly_pulses_user_completed
  on weekly_pulses(user_id, completed_at desc)
  where status = 'completed';
