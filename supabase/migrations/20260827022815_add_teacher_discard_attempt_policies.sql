
-- The new teacher-facing "Discard attempt" feature (permanently deletes an
-- assessment_attempts row and its assessment_attempt_words rows, plus the
-- recording from Storage) needs DELETE grants/policies that were never
-- added — every prior migration for these tables only ever covered
-- select/insert/update. Without this, the delete request 403s before RLS
-- is even evaluated (see comments in 20260822033840 and 20260821004447
-- about grants being a separate gate from RLS policies).
--
-- Mirrors the existing "teacher owns this pupil's attempt" shape used by
-- "Teachers can update their pupils' attempts" (assessment_attempts) and
-- "Teachers can override verdicts for their pupils' attempt words"
-- (assessment_attempt_words) — same using() logic, just for delete.

grant delete on public.assessment_attempts to authenticated;
grant delete on public.assessment_attempt_words to authenticated;

create policy "Teachers can delete their pupils' attempts"
  on public.assessment_attempts
  for delete
using (
    exists (
      select 1 from public.profiles
      where profiles.id = assessment_attempts.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

create policy "Teachers can delete their pupils' attempt words"
  on public.assessment_attempt_words
  for delete
using (
    exists (
      select 1 from public.assessment_attempts
      join public.profiles on profiles.id = assessment_attempts.student_id
      where assessment_attempts.id = assessment_attempt_words.attempt_id
        and (
          assessment_attempts.teacher_id = auth.uid()
          or profiles.teacher_id = auth.uid()
        )
    )
  );

-- Storage: the bucket policies from 20260812060319 only ever covered
-- insert (student upload) and select (student + teacher read) — deleting
-- the recording blob during a discard needs its own delete policy, same
-- shape as "Teachers can read their pupils' recordings".
create policy "Teachers can delete their pupils' recordings"
  on storage.objects
  for delete
using (
    bucket_id = 'assessment-recordings'
    and exists (
      select 1 from public.profiles
      where profiles.id::text = (storage.foldername(name))[1]
        and profiles.teacher_id = auth.uid()
    )
  );