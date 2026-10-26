
-- SECURITY FIX: stop users from promoting themselves.
--
-- The profiles table lets every signed-in user update their own row
-- ("Users can update their own profile", using auth.uid() = id, with no
-- column limit and update granted on every column), and lets a teacher
-- update their pupils' rows. Nothing stopped either of them from writing
-- `role = 'admin'`: one PATCH request from the browser console turned any
-- student account into an admin, which then reads every recording and
-- consent file. (A teacher could also move a pupil to another teacher or
-- re-enable a pupil an admin had disabled.)
--
-- Row-level security can't limit WHICH columns change, so this trigger
-- does: role, teacher_id and is_disabled can only be changed by trusted
-- server-side callers — the service role (every edge function that creates
-- or manages accounts: create-student, toggle-student-status,
-- force-logout-student, ...) and the SQL editor / migrations (postgres).
-- Everything the app's own screens change from the browser (name, grade
-- level, section, non-reader flag, avatar) is untouched.
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
     or new.is_disabled is distinct from old.is_disabled then
    raise exception 'role, teacher_id and is_disabled can only be changed by the server'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();
