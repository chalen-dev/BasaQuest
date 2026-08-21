
-- Scanned/photographed parent consent forms for the fine-tuning roster.
-- One student can have up to 4 files (in case a form runs multiple pages,
-- or there's a supplementary document) and, per the recording plan, at
-- least 1 once consent_on_file is true — the "at least 1" part is a UI
-- nudge only (see FinetuneStudentList.tsx), not enforced here, since a
-- student can legitimately exist before their paperwork is scanned in.
create table public.finetune_student_consent_files (
                                                       id uuid primary key default gen_random_uuid(),
                                                       student_id uuid not null references public.finetune_students(id) on delete cascade,
                                                       storage_path text not null,       -- path inside the consent-files bucket, "<student_id>/<uuid>-<filename>"
                                                       original_filename text,
                                                       uploaded_by uuid references public.profiles(id) on delete set null,
                                                       created_at timestamptz not null default now()
);
comment on table public.finetune_student_consent_files is 'Up to 4 consent-form files per finetune_students row. Deliberately capped (see enforce_consent_file_limit trigger below) rather than left open-ended.';
create index if not exists finetune_student_consent_files_student_id_idx on public.finetune_student_consent_files (student_id);
alter table public.finetune_student_consent_files enable row level security;
create policy "Admins can manage consent files"
  on public.finetune_student_consent_files for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
grant select, insert, update, delete on table public.finetune_student_consent_files to authenticated;
-- Hard cap at 4 files per student, enforced at the DB level regardless of
-- what the UI does (a second admin tab, a retried request, etc. can't
-- sneak past a client-side-only check).
create or replace function public.check_consent_file_limit()
returns trigger as $$
begin
  if (select count(*) from public.finetune_student_consent_files where student_id = new.student_id) >= 4 then
    raise exception 'A student can have at most 4 consent files on file.';
end if;
return new;
end;
$$ language plpgsql;
create trigger enforce_consent_file_limit
    before insert on public.finetune_student_consent_files
    for each row execute function public.check_consent_file_limit();
-- Private bucket, admin-only end to end — this is more sensitive than the
-- recording audio (it's identifying paperwork), so unlike
-- student-recordings, teachers do NOT get read access here.
insert into storage.buckets (id, name, public)
values ('consent-files', 'consent-files', false)
    on conflict (id) do nothing;
create policy "Admins can upload consent files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'consent-files'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Admins can view consent files"
  on storage.objects for select
                                           to authenticated
                                           using (
                                           bucket_id = 'consent-files'
                                           and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
                                           );
create policy "Admins can delete consent files"
  on storage.objects for delete
to authenticated
  using (
    bucket_id = 'consent-files'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );