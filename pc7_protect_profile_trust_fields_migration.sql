-- ═══════════════════════════════════════════════════════════════════════════
-- PC-7 v2 — Protect trust/verification-adjacent columns on `profiles` from
-- client (anon/authenticated) writes.
--
-- STATUS: APPLIED to live project `capabilio` (eybchcqwbizjmzyrviri) on
-- 2026-07-20, as migration `pc7_protect_profile_trust_fields_v2`
-- (version 20260720033112). A follow-up migration,
-- `pc7_pin_search_path_on_helpers` (same day), pinned `search_path=public`
-- on both helper functions after `get_advisors` flagged them as
-- function_search_path_mutable immediately post-apply — the main trigger
-- function had this from the start, the two helpers it calls did not.
-- Confirmed live and enabled via pg_trigger (tgenabled='O') post-fix.
-- No staging branch was used: Supabase branching requires the Pro plan,
-- which this project is not on (create_branch failed with
-- PaymentRequiredException before any cost was incurred). Applied directly
-- to `main` on the strength of the DB-layer validation in this file plus
-- explicit owner sign-off — see TRUST_VERIFICATION_TRACE_AND_ADR_2026-07-20.md,
-- Revisions 3-5. The end-to-end lifecycle items in
-- PC7_E2E_REGRESSION_PLAN_2026-07-20.md remain open follow-up validation,
-- not a pre-apply gate that was skipped silently.
-- Revision history:
--   v1 (2026-07-20) — whole-element JSONB equality on certifications/
--                      experiences. Reviewed and NOT approved — see "v1 → v2
--                      changes" below.
--   v2 (2026-07-20) — this version. Addresses all four review requirements. APPLIED.
--
-- TRANSITIONAL NOTE — READ THIS FIRST
-- ────────────────────────────────────
-- This trigger is a TRANSITIONAL safeguard, not a permanent architecture
-- decision. The trace (TRUST_VERIFICATION_TRACE_AND_ADR_2026-07-20.md, §7)
-- already concludes that `profiles.certifications` and `profiles.experiences`
-- are structurally inconsistent with the newer evidence model — they should
-- eventually be migrated to canonical `proof_objects` rows, which already
-- have no client-writable RLS policy at all (§2.1) and would make this
-- trigger unnecessary. Until that migration happens (out of scope for
-- Phase 1.5 — it's a data-model change, not a guard-rail), this trigger is
-- the interim protection. When certifications/experiences move to
-- proof_objects, DROP this trigger as part of that migration rather than
-- letting it linger as dead protection for columns nothing writes to anymore.
--
-- CONTEXT
-- ───────
-- Traced 2026-07-20 (see TRUST_VERIFICATION_TRACE_AND_ADR_2026-07-20.md, §2.4
-- and its correction): only `subscription`, `verified`, `purchased_themes`
-- are protected today (protect_profile_entitlements, P0-3, already Closed).
-- Everything else trust-adjacent is client-writable, and one path is
-- confirmed exploitable in shipped code: frontend/src/pages/Aura.jsx's
-- VerificationSection calls POST /api/verify/certification (a stub that
-- returns verified:true for any non-empty certId), then assembles a
-- certification object CLIENT-SIDE with verificationStatus:"verified" and
-- persists it via userDoc.update().
--
-- This migration is a DEFENSE-IN-DEPTH BACKSTOP, not the primary fix. The
-- primary fix (Phase 1.5) is migrating verify.js's certification-by-ID and
-- EPFO flows onto lib/verification/pipeline.js's runVerification(), so
-- "verified" can only ever be produced by the pipeline. This trigger protects
-- (a) write paths not yet migrated, and (b) any future direct Supabase-client
-- write that never goes through a backend route at all.
--
-- v1 → v2 CHANGES (per review, all four requested revisions addressed)
-- ───────────────────────────────────────────────────────────────────
-- 1. Maintenance/drift: `SCALAR_COLS` remains the single, centralized list of
--    protected scalar columns (see the array below) — there is exactly one
--    place to edit. Documented explicitly: any new verification-related
--    scalar column added to `profiles` in the future MUST be added to this
--    array in the same change, and cross-referenced in the ADR's column
--    inventory (§2.4). This is a process requirement, not something SQL can
--    enforce by itself — flagged here so it isn't missed.
-- 2. Whole-element equality REPLACED with field-level protection. v1 rejected
--    ANY edit to an already-verified certification/experience (e.g. fixing a
--    typo in the company name), which is more restrictive than needed and
--    was flagged as an open product question rather than shipped as-is. v2
--    protects only the verification-owned fields:
--      certifications: verificationStatus, verificationSource, verifiedAt, matchConfidence
--      experiences:    verificationStatus, verificationSource, verifiedAt, matchConfidence, legalName
--    Once an entry's verificationStatus is 'verified', those specific fields
--    must stay byte-identical to what they were — everything else on that
--    entry (name, title, dates, tags, notes, etc.) remains freely editable.
--    For an entry that is NOT currently verified, the client may write
--    anything EXCEPT setting verificationStatus to 'verified' itself (this
--    also correctly allows AddExperienceModal's default
--    `verificationStatus:"self-claimed"` on new entries — v1's naive "any
--    difference from OLD is blocked" rule would actually have wrongly broken
--    that legitimate self-claim path, since a brand-new entry always
--    "differs" from a nonexistent OLD entry; v2 does not have this bug).
--    Entries are matched between OLD and NEW by `id` when the element has
--    one (experiences always get one client-side — see AddExperienceModal),
--    falling back to positional index otherwise (certifications have no id
--    field anywhere in the codebase today — both the frontend
--    StudentCertificatesPanel and the backend certification-file route
--    address entries by array index/`certIndex`, so positional matching here
--    matches the app's own existing identity model for that array, not a new
--    assumption).
-- 3. Explicit transitional-safeguard note added — see top of file.
-- 4. Function/trigger names versioned: `_pc7_v1` in the name, so a future
--    revision can coexist during rollout or be swapped cleanly.
-- Logging of rejected attempts (review item 5) is included via RAISE WARNING
-- (see "AUDIT VISIBILITY" note below) rather than a new table — see rationale.
-- Service-role bypass assumption (review item 6) reaffirmed below, unchanged.
--
-- AUDIT VISIBILITY FOR BLOCKED ATTEMPTS
-- ──────────────────────────────────────
-- A durable, queryable violations table would need an autonomous transaction
-- (e.g. via the `dblink` extension) to survive the exception's rollback —
-- RAISE EXCEPTION aborts the current transaction, so a plain INSERT into a
-- log table in the same function body would be rolled back along with it.
-- Adding `dblink` is a real new dependency (new extension, its own security
-- surface) and is NOT included in this v2 — it would need its own review.
-- Instead, v2 emits a RAISE WARNING with structured detail (user id, table,
-- field, current_user) immediately before each RAISE EXCEPTION. WARNING
-- messages are written to the Postgres/Supabase log stream synchronously and
-- are NOT rolled back with the transaction, so every blocked attempt is
-- visible in log-based monitoring (e.g. `get_advisors`/log export) without a
-- new schema object. If queryable, alertable violation records are needed
-- later, that's a follow-up (dblink-based autonomous insert, or a Supabase
-- Edge Function log-drain), flagged here rather than silently deferred.
--
-- SAFETY CONFIRMED BEFORE DRAFTING THIS
-- ──────────────────────────────────────
-- backend/server/lib/supabase.js: `supabase()` and `supabaseAdmin` are the
-- SAME client, built with SUPABASE_SERVICE_KEY (service_role) — there is no
-- separate anon-key backend client anywhere in this codebase, so no
-- legitimate backend write path is affected by this trigger's exemption
-- check. REVISIT THIS ASSUMPTION if the architecture ever introduces an
-- additional backend role (e.g. a limited-privilege service account,
-- a separate reporting/read-replica role that also happens to write, or a
-- future microservice using its own Postgres role) — the bypass condition
-- below (`current_user not in ('anon','authenticated')`) is an allow-list-by-
-- exclusion, so any new role is exempted from this trigger by default unless
-- explicitly re-evaluated. That is the correct default for "don't break an
-- unknown future backend role," but it means this trigger's protection
-- silently narrows if a new role is introduced without revisiting this file.
--
-- ROLLBACK
-- ────────
-- drop trigger if exists pc7_v1_protect_profile_trust_fields on public.profiles;
-- drop function if exists public.protect_profile_trust_fields_pc7_v1();
-- drop function if exists public._pc7_check_trust_fields(text, jsonb, jsonb, text[]);
-- drop function if exists public._pc7_find_matching_element(jsonb, jsonb, int);
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Helper: find the OLD element matching a NEW element, by `id` if present,
--    else by positional index. Returns NULL if no match (new entry). ────────
create or replace function public._pc7_find_matching_element(arr jsonb, elem jsonb, idx int)
returns jsonb
language sql
immutable
as $$
  select case
    when elem ? 'id' then (
      select e from jsonb_array_elements(coalesce(arr, '[]'::jsonb)) e
      where e ->> 'id' = elem ->> 'id'
      limit 1
    )
    else coalesce(arr, '[]'::jsonb) -> idx
  end
$$;

-- ── Helper: check one jsonb array (certifications or experiences) for
--    client-side tampering with its verification-owned fields. Raises on
--    violation; returns void on success. Shared by both arrays so the rule
--    lives in exactly one place. ──────────────────────────────────────────
create or replace function public._pc7_check_trust_fields(
  arr_name       text,
  old_arr        jsonb,
  new_arr        jsonb,
  protected_keys text[],
  profile_id     uuid
)
returns void
language plpgsql
as $$
declare
  idx      int := 0;
  new_elem jsonb;
  old_elem jsonb;
  key      text;
begin
  for new_elem in select * from jsonb_array_elements(coalesce(new_arr, '[]'::jsonb))
  loop
    old_elem := public._pc7_find_matching_element(old_arr, new_elem, idx);

    if coalesce(old_elem ->> 'verificationStatus', '') = 'verified' then
      -- Already verified: verification-owned fields must stay byte-identical.
      -- Everything else on this entry (name, title, dates, tags, notes, ...)
      -- remains freely editable.
      foreach key in array protected_keys loop
        if (new_elem -> key) is distinct from (old_elem -> key) then
          raise warning 'PC-7 blocked: profile % attempted client-side edit of verification-owned field "%.%" on an already-verified entry (role=%)',
            profile_id, arr_name, key, current_user;
          raise exception 'profiles.%: field "%" is verification-owned and cannot be modified once this entry is verified',
            arr_name, key using errcode = 'insufficient_privilege';
        end if;
      end loop;
    else
      -- Not currently verified: client may write anything on this entry
      -- EXCEPT promoting verificationStatus to 'verified' itself. This
      -- intentionally allows legitimate self-claim defaults (e.g.
      -- AddExperienceModal's verificationStatus:"self-claimed") to pass.
      if (new_elem ->> 'verificationStatus') = 'verified' then
        raise warning 'PC-7 blocked: profile % attempted to client-side promote %[%] to verificationStatus=verified (role=%)',
          profile_id, arr_name, idx, current_user;
        raise exception 'profiles.%: verificationStatus may only be set to verified by the verification pipeline, not by a direct client write',
          arr_name using errcode = 'insufficient_privilege';
      end if;
    end if;

    idx := idx + 1;
  end loop;
end;
$$;

-- ── Main trigger function ──────────────────────────────────────────────────
-- NOT `security definer` — deliberate. This function's entire logic depends
-- on `current_user` reflecting the ACTUAL caller (anon/authenticated vs.
-- service_role). SECURITY DEFINER would make current_user resolve to this
-- function's owner for the duration of every call, permanently satisfying
-- `current_user not in ('anon','authenticated')` and silently disabling this
-- trigger for everyone, regardless of who actually issued the UPDATE. This
-- exact bug was introduced in an earlier draft and caught by the rolled-back
-- transaction test below (§ "VALIDATION PERFORMED") — all six protection
-- tests silently passed as no-ops until this was fixed. The existing
-- `protect_profile_entitlements` this pattern mirrors is also NOT security
-- definer (confirmed live: `prosecdef=false`) — invoker rights (the default,
-- i.e. omitting this clause) is correct and required here.
create or replace function public.protect_profile_trust_fields_pc7_v1()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  -- SINGLE SOURCE OF TRUTH for protected scalar columns. Any new
  -- verification-related scalar column added to `profiles` in the future
  -- MUST be added here in the same change (and noted in the ADR's §2.4
  -- column inventory) — there is no other enforcement mechanism for that
  -- requirement; it is a code-review checklist item, not something this
  -- trigger can self-discover.
  scalar_cols text[] := array[
    'education_verified', 'epfo_verified', 'verification_state', 'aura_score',
    'role_elo', 'market_elo', 'proof_elo', 'mobility_elo', 'professional_elo',
    'blended_elo', 'recruiter_trust_score', 'verificationStatus',
    'verifiedAuthority', 'company_email_verified', 'employment_self_confirmed',
    'uan_verified', 'uan_verified_at'
  ];
  col text;
begin
  -- Backend (service_role) and maintenance roles may change anything.
  -- See "SAFETY CONFIRMED" note above for why this is currently exhaustive,
  -- and what would need revisiting if that changes.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- ── Scalar trust/verification columns ──
  foreach col in array scalar_cols loop
    if (to_jsonb(new) -> col) is distinct from (to_jsonb(old) -> col) then
      raise warning 'PC-7 blocked: profile % attempted client-side write to profiles.% (role=%)',
        new.id, col, current_user;
      raise exception 'profiles.% can only be modified server-side', col
        using errcode = 'insufficient_privilege';
    end if;
  end loop;

  -- ── certifications (no stable id in this codebase — matched positionally,
  --    consistent with how the app itself addresses these entries) ──
  perform public._pc7_check_trust_fields(
    'certifications', old.certifications, new.certifications,
    array['verificationStatus', 'verificationSource', 'verifiedAt', 'matchConfidence'],
    new.id
  );

  -- ── experiences (has a stable id field — matched by id, falls back to
  --    positional for any legacy entry without one) ──
  perform public._pc7_check_trust_fields(
    'experiences', old.experiences, new.experiences,
    array['verificationStatus', 'verificationSource', 'verifiedAt', 'matchConfidence', 'legalName'],
    new.id
  );

  return new;
end;
$$;

create trigger pc7_v1_protect_profile_trust_fields
  before update on public.profiles
  for each row
  execute function public.protect_profile_trust_fields_pc7_v1();

-- ═══════════════════════════════════════════════════════════════════════════
-- VALIDATION PERFORMED (2026-07-20) — independently re-verified in a second
-- pass, against the live `capabilio` project, inside transactions that were
-- rolled back (BEGIN ... ROLLBACK) — zero risk to real data, nothing from
-- this section persists.
--
-- The original validation note here (now superseded) claimed all 7 tests
-- passed and attributed an earlier failure to a SECURITY DEFINER bug. That
-- SECURITY DEFINER finding is correct and independently reconfirmed —
-- `protect_profile_entitlements` really is `prosecdef=false` (checked
-- directly against pg_proc), and the reasoning (SECURITY DEFINER makes
-- current_user resolve to the function owner, not the caller, silently
-- disabling the `current_user not in ('anon','authenticated')` check for
-- everyone) is correct Postgres behavior — this file correctly omits
-- SECURITY DEFINER on protect_profile_trust_fields_pc7_v1.
--
-- However, reproducing the "all 7 passed" claim from scratch surfaced a real
-- testing gotcha worth recording here for whoever runs this suite next:
--
--   Attempt 1 — used `perform set_config('role', 'authenticated', true)` to
--   simulate the client role. This does NOT actually switch the executing
--   Postgres role the way `SET ROLE` does — every write still ran as the
--   original (superuser) role, so every "should be blocked" case falsely
--   showed as failing (nothing was ever blocked, because nothing was ever
--   really running as `authenticated`) — a false negative caused entirely by
--   the test harness, not the trigger.
--
--   Attempt 2 — switched to genuine `EXECUTE 'SET ROLE authenticated'`
--   (confirmed via `SELECT current_user`) — but without setting
--   `request.jwt.claim.sub`, `auth.uid()` returned NULL. Because `profiles`'
--   only UPDATE policy is `USING (auth.uid() = id)`, that made RLS silently
--   filter out the target row entirely — the UPDATE statements "succeeded"
--   (no exception) but affected ZERO rows, for every test including the ones
--   that should have failed. This produced misleading PASS results for the
--   wrong reason (nothing was written, not "the write was correctly
--   allowed") — caught only by explicitly checking before/after row state,
--   not by trusting the absence of an exception.
--
--   Attempt 3 (final) — set `request.jwt.claim.sub` to the test profile's own
--   id before switching role, so `auth.uid() = id` holds and RLS actually
--   lets the row through to the trigger, and verified every case by reading
--   back the actual before/after field values (not just catching/not-
--   catching an exception). Results, each confirmed by real data mutation
--   (or lack thereof), not just control flow:
--
--   1. scalar column write blocked ...................... PASS (no mutation)
--   2. forge new verified cert blocked .................. PASS (no mutation)
--   3. legit self-claim cert allowed .................... PASS (real mutation)
--   4. legit self-claimed experience default allowed .... PASS (real mutation)
--   5. name fix on already-verified cert allowed ........ PASS (name changed
--      "Certified Kubernetes Admin" → "...Administrator"; verifiedAt
--      unchanged at "2026-01-01T00:00:00Z" both before and after)
--   6. verifiedAt tampering on verified cert blocked .... PASS (exception
--      raised; verifiedAt confirmed unchanged)
--   7. service_role bypass unaffected .................... PASS (real
--      mutation while current_user='postgres', auth.uid()=NULL)
--
-- Net: the trigger logic in this file is correct and behaves exactly as
-- documented, for all 7 scenarios, verified with role- and RLS-accurate
-- tests. The lesson for whoever re-runs this (or a future revision) is:
-- always verify with `request.jwt.claim.sub` set and `auth.uid()` checked,
-- and always confirm PASS/FAIL by reading back actual row state — an
-- unraised exception on `profiles` can mean "the write was allowed" OR
-- "RLS silently discarded the row," and those are very different outcomes
-- that look identical if you only check for an exception.
--
-- NOT covered by this transactional test (needs a real staging deployment —
-- see the companion end-to-end lifecycle regression plan,
-- PC7_E2E_REGRESSION_PLAN_2026-07-20.md): the actual HTTP-level behavior of
-- routes/verify.js, routes/verification.js, and professionalProfile.js
-- against this trigger; GitHub/OCR provider round-trips; frontend rendering
-- after a blocked write (does the UI surface the error sensibly, or does it
-- fail silently the way userDoc.update already logs-but-continues on
-- rejection?); recruiter/portfolio views after the trigger is live.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SUGGESTED REGRESSION TESTS (run after approval, before marking Closed —
-- same state-machine discipline as CERTIFICATION_FRAMEWORK.md: Reported →
-- Fixed → Regression-Tested → Closed)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. As `authenticated`, attempt a scalar trust-column write:
--      update profiles set aura_score = 999 where id = <own id>;
--    Expect: exception, errcode 'insufficient_privilege'. A WARNING with the
--    profile id, column name, and role should appear in the log immediately
--    before the exception.
--
-- 2. As `authenticated`, attempt to fabricate a NEW verified certification:
--      update profiles
--      set certifications = certifications ||
--        jsonb_build_array(jsonb_build_object(
--          'name','AWS Certified Solutions Architect','verificationStatus','verified'
--        ))
--      where id = <own id>;
--    Expect: exception (verificationStatus promotion on a non-verified/new entry).
--
-- 3. As `authenticated`, attempt to add a NEW self-claimed certification with
--    no verificationStatus set at all (the real StudentCertificatesPanel flow):
--      update profiles
--      set certifications = certifications ||
--        jsonb_build_array(jsonb_build_object('name','Some Course','issuer','Coursera'))
--      where id = <own id>;
--    Expect: succeeds.
--
-- 4. As `authenticated`, attempt to add a NEW self-claimed EXPERIENCE with the
--    app's own default verificationStatus:"self-claimed" (AddExperienceModal's
--    actual default form state — this is the case v1 would have WRONGLY
--    blocked):
--      update profiles
--      set experiences = experiences ||
--        jsonb_build_array(jsonb_build_object(
--          'id', extract(epoch from now())::text, 'company','Acme Co',
--          'verificationStatus','self-claimed'
--        ))
--      where id = <own id>;
--    Expect: succeeds.
--
-- 5. Seed one already-verified certification at index 0 (as service_role),
--    then as `authenticated` attempt to fix a typo in its `name` field only,
--    leaving verificationStatus/verificationSource/verifiedAt/matchConfidence
--    untouched:
--      -- (as service_role) set certifications[0] = {..., verificationStatus:'verified', verifiedAt:'2026-01-01T00:00:00Z', ...}
--      -- (as authenticated) update the same entry's "name" field only
--    Expect: succeeds — this is the exact case v1 broke and v2 fixes.
--
-- 6. Same seed as test 5, but as `authenticated` attempt to change
--    `verifiedAt` or `verificationSource` on that already-verified entry
--    while leaving `name` alone:
--    Expect: exception — verification-owned fields remain immutable even
--    though other fields on the same entry are editable.
--
-- 7. As `service_role` (via supabaseAdmin / supabase()), repeat test 2's
--    update. Expect: succeeds — backend verification writes unaffected.
--
-- 8. Re-run `mcp__supabase__get_advisors` (security) after applying, to
--    confirm no new advisor warnings are introduced, and check log output
--    for the RAISE WARNING lines from tests 1/2 to confirm audit visibility
--    works as intended.
-- ═══════════════════════════════════════════════════════════════════════════
