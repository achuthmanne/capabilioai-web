-- Run in Supabase SQL Editor → New query → Run
-- Creates a profile row automatically when a user signs up via auth.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, onboarding_complete, elo_rating, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    false,
    400,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop and recreate trigger to avoid duplicates
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Back-fill any existing auth users who are missing a profiles row
insert into public.profiles (id, display_name, onboarding_complete, elo_rating, created_at)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', email),
  false,
  400,
  created_at
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;
