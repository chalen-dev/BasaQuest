
-- student_recordings only ever got insert/select/update policies — the
-- new admin recordings-review page needs to delete individual rows too.
create policy "Admins can delete recordings"
  on public.student_recordings for delete
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
grant delete on table public.student_recordings to authenticated;