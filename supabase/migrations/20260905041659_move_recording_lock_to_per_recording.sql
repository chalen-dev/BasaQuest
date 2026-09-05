-- File: supabase/migrations/20260905041659_move_recording_lock_to_per_recording.sql
-- Moves the "finalize" lock from the whole student
-- (finetune_students.recording_locked) down to a single recording
-- (student_recordings.locked). An admin asked for this explicitly:
-- locking one bad/good take shouldn't freeze every other recording that
-- student has on file.
--
-- ORDERING MATTERS HERE: every policy that references
-- finetune_students.recording_locked — on finetune_students itself, AND
-- on student_recordings / student_recording_word_flags via a join — has
-- to be dropped BEFORE the column drop below, or Postgres refuses with
-- "cannot drop column ... because other objects depend on it"
-- (SQLSTATE 2BP01). Don't reorder these blocks.

-- 1. Old per-student lock RPC — replaced by set_student_recording_lock below.
drop function if exists public.set_finetune_student_recording_lock(uuid, boolean);

-- 2. Drop every policy that depends on finetune_students.recording_locked,
--    on every table, before touching the column itself.
drop policy if exists "Admins can view finetune students" on public.finetune_students;
drop policy if exists "Admins can insert finetune students" on public.finetune_students;
drop policy if exists "Admins can update unlocked finetune students" on public.finetune_students;
drop policy if exists "Admins can delete unlocked finetune students" on public.finetune_students;

drop policy if exists "Admins can insert recordings" on public.student_recordings;
drop policy if exists "Admins can update recordings" on public.student_recordings;
drop policy if exists "Admins can delete recordings" on public.student_recordings;

drop policy if exists "Admins can view recording word flags" on public.student_recording_word_flags;
drop policy if exists "Admins can insert recording word flags" on public.student_recording_word_flags;
drop policy if exists "Admins can update recording word flags" on public.student_recording_word_flags;
drop policy if exists "Admins can delete recording word flags" on public.student_recording_word_flags;

-- 3. Now safe to drop the column — nothing references it anymore.
alter table public.finetune_students drop column recording_locked;

-- 4. finetune_students no longer has a lock concept at all, so it just
--    gets one plain admin-can-do-everything policy back.
create policy "Admins can manage finetune students"
  on public.finetune_students for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 5. The new per-recording lock column.
alter table public.student_recordings
    add column locked boolean not null default false;
comment on column public.student_recordings.locked is
  'Set only via set_student_recording_lock(), never a plain UPDATE. Once true, this ONE recording cannot be deleted or replaced (re-recording that sentence in RecordSession.tsx is blocked) by any admin, including whoever locked it, until explicitly unlocked again. Does not affect any other recording belonging to the same student.';

-- 6. Lock/unlock RPC, keyed by recording id instead of student id.
--    SECURITY DEFINER so it can flip `locked` on a row that RLS itself
--    would otherwise refuse to update once locked (see policies below).
create or replace function public.set_student_recording_lock(p_id uuid, p_locked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only admins can lock or unlock a recording.';
end if;
update public.student_recordings set locked = p_locked where id = p_id;
end;
$$;
grant execute on function public.set_student_recording_lock(uuid, boolean) to authenticated;

-- 7. student_recordings: update/delete now check the row's own `locked`
--    column directly, no join needed.
create policy "Admins can insert recordings"
  on public.student_recordings for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and (recorded_by is null or recorded_by = auth.uid())
  );

create policy "Admins can update recordings"
  on public.student_recordings for update
                                                                                                                using (
                                                                                                                exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                                                                                                and not locked
                                                                                                                )
                                   with check (
                                                                                                                exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                                                                                                and not locked
                                                                                                                );

create policy "Admins can delete recordings"
  on public.student_recordings for delete
using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and not locked
  );

-- 8. student_recording_word_flags: join to student_recordings.locked
--    instead of finetune_students.recording_locked.
create policy "Admins can view recording word flags"
  on public.student_recording_word_flags for select
                                                        using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert recording word flags"
  on public.student_recording_word_flags for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and not exists (
      select 1 from public.student_recordings sr
      where sr.id = student_recording_word_flags.recording_id and sr.locked
    )
  );

create policy "Admins can update recording word flags"
  on public.student_recording_word_flags for update
                                                               using (
                                                               exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                                               and not exists (
                                                               select 1 from public.student_recordings sr
                                                               where sr.id = student_recording_word_flags.recording_id and sr.locked
                                                               )
                                                               );

create policy "Admins can delete recording word flags"
  on public.student_recording_word_flags for delete
using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and not exists (
      select 1 from public.student_recordings sr
      where sr.id = student_recording_word_flags.recording_id and sr.locked
    )
  );