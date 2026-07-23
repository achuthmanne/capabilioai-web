-- ============================================================================
-- P0-5 ENFORCEMENT — freeze ELO columns on profiles  (DO NOT APPLY YET)
-- ============================================================================
-- BLOCKER: apply this ONLY after the client-side ELO-write removal (this mission's
-- code changes) is validated on staging. If applied before the frontend cutover
-- ships, the old client writes to elo_rating/arena_completed/arena_streak will
-- raise and break Arena for every role.
--
-- Pre-apply staging checklist (all must pass):
--   1. Deploy backend (authoritative /api/arena/review) + frontend (token on the
--      3 review callers, client ELO writes removed).
--   2. Complete one Arena task on EACH path — daily mission (useArenaMissions),
--      arena-state slot (useArenaState), and Common Challenges — and confirm:
--        • profiles.elo_rating changes by the expected delta exactly ONCE
--        • no console error / failed /api/arena/review request
--        • leaderboard + streak reflect the server values
--   3. Confirm the arenaV2 catalog /submit path still updates ELO (uses the
--      grading worker → apply_arena_result, unaffected).
--   4. Recompute/repair any inflated ELO from elo_events/arena_history first.
--
-- This extends the existing protect_profile_entitlements() trigger to also freeze
-- the ELO columns against non-service roles (service_role/backend still writes them
-- via apply_arena_result).

create or replace function public.protect_profile_entitlements()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;  -- backend (service_role) + DDL roles may change anything
  end if;
  if new.subscription     is distinct from old.subscription
     or new.verified         is distinct from old.verified
     or new.purchased_themes is distinct from old.purchased_themes
     or new.elo_rating       is distinct from old.elo_rating
     or new.arena_completed  is distinct from old.arena_completed
     or new.arena_streak     is distinct from old.arena_streak then
    raise exception 'profiles privileged column can only be modified server-side'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
-- Trigger trg_protect_profile_entitlements already exists from the entitlement
-- migration; replacing the function is sufficient.
