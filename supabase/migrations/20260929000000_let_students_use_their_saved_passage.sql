-- A teacher can validate a check-in passage and then SEND it to the pupil's
-- own device (the "Send" choice on the passage check screen). For the pupil's
-- session to read that passage, and to clear it once the reading is turned
-- in, a pupil needs access to their OWN row, and only once the teacher has
-- approved it: a passage still waiting for validation must never reach them.
create policy "Students can view their own approved check-in passage"
  on public.check_in_passages
  for select
  to authenticated
  using (
    student_id = auth.uid()
    and status = 'approved'
    and expires_at > now()
  );

create policy "Students can delete their own check-in passage"
  on public.check_in_passages
  for delete
  to authenticated
  using (student_id = auth.uid());
