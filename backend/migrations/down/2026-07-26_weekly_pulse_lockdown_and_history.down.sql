-- Down migration for 2026-07-26_weekly_pulse_lockdown_and_history.sql
drop index if exists idx_weekly_pulses_user_completed;

alter table weekly_pulses
  drop column if exists suspicious_events,
  drop column if exists timed_out_count;
