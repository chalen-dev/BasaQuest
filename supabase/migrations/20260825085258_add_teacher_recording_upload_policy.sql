-- The original assessment-recordings bucket policies (in
-- 20260812060319_create_assessment_attempts.sql) only ever covered a
-- student uploading their own recording — there was no policy letting a
-- teacher upload into a pupil's folder, which the "Start Now" one-device
-- flow (teacher stays authenticated as themselves, uploads to
-- "<student_id>/<attempt_id>.ext" on the pupil's behalf) actually needs.
-- Mirrors the shape of "Teachers can read their pupils' recordings" from
-- that same migration, just for insert instead of select.
create policy "Teachers can upload recordings for their pupils"
  on storage.objects
  for insert
  with check (
    bucket_id = 'assessment-recordings'
    and exists (
      select 1 from public.profiles
      where profiles.id::text = (storage.foldername(name))[1]
        and profiles.teacher_id = auth.uid()
    )
  );