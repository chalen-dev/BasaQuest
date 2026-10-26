-- Test data tag. A profile with is_test = true is a test account (or a pupil
-- of one); everything a pupil owns (attempts, recordings, assignments,
-- reports) hangs off the pupil's profile, so tagging the profile tags it all.
-- It lets test accounts live in the same database as real ones, be spotted
-- at a glance, and be removed cleanly (npm run unseed:testdata) before real
-- classes start.
--
-- This only labels data. It does NOT yet hide test data from real accounts;
-- that is a separate step (see the "Known gaps" part of docs/DEPLOYMENT.md).
alter table public.profiles
  add column if not exists is_test boolean not null default false;

create index if not exists profiles_is_test_idx on public.profiles (is_test) where is_test;

-- A pupil always belongs to the same group as its teacher: whoever creates a
-- pupil (a test teacher in the app, or a seeder) gets that pupil tagged to
-- match without having to remember to. Named zz_ so it runs after
-- protect_profile_columns, which already blocks non-server callers from
-- changing teacher_id.
create or replace function public.inherit_profile_test_flag()
returns trigger
language plpgsql
as $$
declare
  teacher_is_test boolean;
begin
  if new.teacher_id is not null then
    select is_test into teacher_is_test from public.profiles where id = new.teacher_id;
    if teacher_is_test is not null then
      new.is_test := teacher_is_test;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists zz_inherit_profile_test_flag on public.profiles;
create trigger zz_inherit_profile_test_flag
  before insert or update of teacher_id, is_test on public.profiles
  for each row execute function public.inherit_profile_test_flag();

-- is_test is also server-only: nobody can flip their own account in or out of
-- the test group from the browser.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.teacher_id is distinct from old.teacher_id
     or new.is_disabled is distinct from old.is_disabled
     or new.is_test is distinct from old.is_test then
    raise exception 'role, teacher_id, is_disabled and is_test can only be changed by the server'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
