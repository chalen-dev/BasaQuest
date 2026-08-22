
-- Cross-admin write locking for the recording pilot. Two independent
-- locks, both "locked for everyone, no owner exception" per product
-- decision:
--
-- 1. Per-student lock (finetune_students.recording_locked): an admin
--    explicitly presses "Finalize recording" on RecordingHistory.tsx once
--    they're done capturing a student's sentences. Before that flag is
--    set, the existing multi-sentence recording flow (RecordSession.tsx)
--    works exactly as it does today — an admin can come back any number
--    of times to add/replace individual sentences. Only once finalized
--    does editing the student's details, editing/deleting their existing
--    recordings, and starting a new recording session all become
--    impossible for every admin, including whoever finalized it.
--    Un-finalizing is a deliberate, separate action (the
--    set_finetune_student_recording_lock function below), not a normal
--    UPDATE, so it isn't silently reachable through the regular edit form.
--
-- 2. Per-script lock (implicit — any reading_sentence_sets row that has
--    at least one student_recordings row referencing its key): editing,
--    renaming, or deleting that script, or adding/editing/deleting/
--    reordering its sentences, is blocked the moment the first recording
--    against it exists — no finalize step needed here, since sentence
--    editing happens on a separate admin page (Sentence Scripts) that
--    isn't part of the live recording flow, so there's no in-progress
--    workflow to protect. The escape hatch is duplicating the script
--    (see duplicate_reading_sentence_set below) into a fresh, unlocked
--    copy.

alter table public.finetune_students
    add column recording_locked boolean not null default false;
comment on column public.finetune_students.recording_locked is 'Set only via set_finetune_student_recording_lock(), never a plain UPDATE. Once true, the student''s own details, their existing student_recordings rows, and starting a new recording session are all locked for every admin (no exception for whoever finalized it).';

-- Admin-only, bypasses the locked-row UPDATE restriction below by
-- design (SECURITY DEFINER) — this IS the unlock/lock toggle, so it has
-- to be reachable even when the row is currently locked. Deliberately
-- only ever touches this one column.
create or replace function public.set_finetune_student_recording_lock(p_id uuid, p_locked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only admins can lock or unlock a student''s recordings.';
end if;
update public.finetune_students set recording_locked = p_locked where id = p_id;
end;
$$;
grant execute on function public.set_finetune_student_recording_lock(uuid, boolean) to authenticated;

-- Replace the old single "for all" policy with per-command policies so
-- the lock only has to be threaded through update/delete, not select/insert.
drop policy "Admins can manage finetune students" on public.finetune_students;

create policy "Admins can view finetune students"
  on public.finetune_students for select
                                                                                                                      using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert finetune students"
  on public.finetune_students for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update unlocked finetune students"
  on public.finetune_students for update
                                                    using (
                                                    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                                    and not recording_locked
                                                    )
                                  with check (
                                                    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                                    and not recording_locked
                                                    );

create policy "Admins can delete unlocked finetune students"
  on public.finetune_students for delete
using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and not recording_locked
  );

-- student_recordings: once the owning student is finalized, no more
-- inserts (no new recording session), and the existing rows can't be
-- updated or deleted (recording history is frozen). Select is untouched
-- — a locked student's history should still be viewable.
drop policy "Admins can insert recordings" on public.student_recordings;
create policy "Admins can insert recordings"
  on public.student_recordings for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and (recorded_by is null or recorded_by = auth.uid())
    and not exists (
      select 1 from public.finetune_students fs
      where fs.id = student_recordings.student_id and fs.recording_locked
    )
  );

drop policy "Admins can update recordings" on public.student_recordings;
create policy "Admins can update recordings"
  on public.student_recordings for update
                                                               using (
                                                               exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                                               and not exists (
                                                               select 1 from public.finetune_students fs
                                                               where fs.id = student_recordings.student_id and fs.recording_locked
                                                               )
                                                               )
                                   with check (
                                                               exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                                               and not exists (
                                                               select 1 from public.finetune_students fs
                                                               where fs.id = student_recordings.student_id and fs.recording_locked
                                                               )
                                                               );

drop policy "Admins can delete recordings" on public.student_recordings;
create policy "Admins can delete recordings"
  on public.student_recordings for delete
using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and not exists (
      select 1 from public.finetune_students fs
      where fs.id = student_recordings.student_id and fs.recording_locked
    )
  );

-- student_recording_word_flags mirrors student_recordings' shape — lock
-- through the same join once the owning student is finalized. Select
-- stays open.
drop policy "Admins can manage recording word flags" on public.student_recording_word_flags;

create policy "Admins can view recording word flags"
  on public.student_recording_word_flags for select
                                                             using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert recording word flags"
  on public.student_recording_word_flags for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and not exists (
      select 1 from public.student_recordings sr
      join public.finetune_students fs on fs.id = sr.student_id
      where sr.id = student_recording_word_flags.recording_id and fs.recording_locked
    )
  );

create policy "Admins can update recording word flags"
  on public.student_recording_word_flags for update
                                                               using (
                                                               exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                                               and not exists (
                                                               select 1 from public.student_recordings sr
                                                               join public.finetune_students fs on fs.id = sr.student_id
                                                               where sr.id = student_recording_word_flags.recording_id and fs.recording_locked
                                                               )
                                                               );

create policy "Admins can delete recording word flags"
  on public.student_recording_word_flags for delete
using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and not exists (
      select 1 from public.student_recordings sr
      join public.finetune_students fs on fs.id = sr.student_id
      where sr.id = student_recording_word_flags.recording_id and fs.recording_locked
    )
  );

-- reading_sentence_sets: any set with at least one recording made
-- against its key is locked for rename/delete (but a brand-new set's
-- key never matches an existing recording, so create is unaffected).
drop policy "Admins can manage reading sentence sets" on public.reading_sentence_sets;

create policy "Admins can insert reading sentence sets"
  on public.reading_sentence_sets for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update unrecorded reading sentence sets"
  on public.reading_sentence_sets for update
                                                             using (
                                                             exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                                             and not exists (select 1 from public.student_recordings sr where sr.sentence_set = reading_sentence_sets.key)
                                                             )
                                      with check (
                                                             exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                                             and not exists (select 1 from public.student_recordings sr where sr.sentence_set = reading_sentence_sets.key)
                                                             );

create policy "Admins can delete unrecorded reading sentence sets"
  on public.reading_sentence_sets for delete
using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and not exists (select 1 from public.student_recordings sr where sr.sentence_set = reading_sentence_sets.key)
  );

-- reading_sentences: same rule, keyed off sentence_set (which never
-- changes on an existing row, so update's using/with check are
-- equivalent here).
drop policy "Admins can manage reading sentences" on public.reading_sentences;

create policy "Admins can insert reading sentences"
  on public.reading_sentences for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and not exists (select 1 from public.student_recordings sr where sr.sentence_set = reading_sentences.sentence_set)
  );

create policy "Admins can update unrecorded reading sentences"
  on public.reading_sentences for update
                                                         using (
                                                         exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                                         and not exists (select 1 from public.student_recordings sr where sr.sentence_set = reading_sentences.sentence_set)
                                                         )
                                  with check (
                                                         exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                                         and not exists (select 1 from public.student_recordings sr where sr.sentence_set = reading_sentences.sentence_set)
                                                         );

create policy "Admins can delete unrecorded reading sentences"
  on public.reading_sentences for delete
using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and not exists (select 1 from public.student_recordings sr where sr.sentence_set = reading_sentences.sentence_set)
  );

-- Duplicates a script (label suffixed "(copy)", a fresh slug via the
-- same collision-avoidance the client already does when creating a
-- set — see slugify() in useReadingSentences.ts) along with every one
-- of its sentences, as the escape hatch for editing a locked script:
-- the copy starts completely unlocked (a fresh key has no
-- student_recordings referencing it yet), and sentence_number for the
-- copied rows restarts at 1, same as any newly-created set, since the
-- old numbers' only job was linking to student_recordings on the
-- ORIGINAL set. SECURITY INVOKER (the default) — runs as the calling
-- admin, so it only succeeds at all if they'd already be allowed to
-- insert a set and its sentences per the policies above.
create or replace function public.duplicate_reading_sentence_set(p_source_key text)
returns text
language plpgsql
as $$
declare
v_source record;
  v_new_key text;
  v_new_label text;
  v_suffix int := 2;
  v_next_sort_order int;
begin
select key, label into v_source from public.reading_sentence_sets where key = p_source_key;
if not found then
    raise exception 'Script not found.';
end if;

  v_new_label := v_source.label || ' (copy)';
  v_new_key := v_source.key || '_copy';
  while exists (select 1 from public.reading_sentence_sets where key = v_new_key) loop
    v_new_key := v_source.key || '_copy_' || v_suffix;
    v_suffix := v_suffix + 1;
end loop;

select coalesce(max(sort_order), 0) + 1 into v_next_sort_order from public.reading_sentence_sets;

insert into public.reading_sentence_sets (key, label, sort_order)
values (v_new_key, v_new_label, v_next_sort_order);

insert into public.reading_sentences (sentence_set, sentence_number, display_order, text)
select v_new_key, row_number() over (order by display_order), row_number() over (order by display_order), text
from public.reading_sentences
where sentence_set = p_source_key
order by display_order;

return v_new_key;
end;
$$;
grant execute on function public.duplicate_reading_sentence_set(text) to authenticated;