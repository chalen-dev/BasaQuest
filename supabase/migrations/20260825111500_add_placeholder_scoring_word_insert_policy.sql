-- Placeholder scoring (USE_PLACEHOLDER_SCORING in devFlags.ts) runs
-- entirely in the browser as the calling user, unlike the real
-- basaquest-scoring service, which authenticates as service_role (and so
-- was never blocked by RLS/grants). Two gaps that only matter because of
-- that:
--
-- 1. assessment_attempt_words only ever granted authenticated
--    select+update (20260812060319) — writing the fabricated per-word
--    rows needs insert too.
-- 2. assessment_attempts only ever let a TEACHER update an attempt row
--    ("Teachers can update their pupils' attempts", same migration) —
--    fine for the assisted/"Now" flow (the teacher IS the caller), but
--    the self-serve/non-assisted flow has the STUDENT calling
--    applyPlaceholderScoring on their own attempt, which that policy
--    doesn't cover. update grant to authenticated already exists; just
--    needed the matching RLS policy.
grant insert on public.assessment_attempt_words to authenticated;

create policy "Students and teachers can insert their own attempt words"
  on public.assessment_attempt_words
  for insert
  with check (
    exists (
      select 1 from public.assessment_attempts
      join public.profiles on profiles.id = assessment_attempts.student_id
      where assessment_attempts.id = assessment_attempt_words.attempt_id
        and (
          assessment_attempts.student_id = auth.uid()
          or assessment_attempts.teacher_id = auth.uid()
          or profiles.teacher_id = auth.uid()
        )
    )
  );

create policy "Students can update their own attempts"
  on public.assessment_attempts
  for update
                        using (student_id = auth.uid())
      with check (student_id = auth.uid());