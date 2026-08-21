
-- The original student-recordings bucket policies (in
-- 20260821004447_create_admin_role_and_recordings.sql) only covered
-- insert + select — deleting a finetune student now needs to also clean
-- up their recording audio blobs from Storage, which requires a delete
-- policy that never existed until now.
create policy "Admins can delete recording files"
  on storage.objects for delete
to authenticated
  using (
    bucket_id = 'student-recordings'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );