
-- A student roster used ONLY for the child-recording/fine-tuning pilot —
-- deliberately separate from `profiles` (BasaQuest's real app accounts:
-- login credentials, teacher_id, grade_level for the reading app itself).
-- A fine-tuning subject doesn't need a login at all and may not even be a
-- BasaQuest app user, so this is its own lightweight table.
create table public.finetune_students (
                                          id uuid primary key default gen_random_uuid(),
                                          full_name text not null,
                                          grade_level integer,
                                          gender text,
                                          reading_tier text,       -- 'below' | 'on' | 'above', per the recording plan's teacher-assigned tiers
                                          consent_on_file boolean not null default false,
                                          notes text,
                                          created_by uuid references public.profiles(id) on delete set null,
                                          created_at timestamptz not null default now()
);

comment on table public.finetune_students is 'Roster for the child-recording pilot ONLY. Not app accounts, not linked to auth.users, and NOT the same list as profiles(role=student).';
comment on column public.finetune_students.consent_on_file is 'Per the recording plan: a clip cannot be recorded for a student without this being true first. The Record page enforces this client-side (disables the Record button); not yet enforced at the DB level.';

alter table public.finetune_students enable row level security;

create policy "Admins can manage finetune students"
  on public.finetune_students for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

grant select, insert, update, delete on table public.finetune_students to authenticated;

-- student_recordings.student_id currently points at profiles(id) — repoint
-- it at finetune_students now that recording subjects are a separate roster.
alter table public.student_recordings
drop constraint student_recordings_student_id_fkey;

alter table public.student_recordings
    add constraint student_recordings_student_id_fkey
        foreign key (student_id) references public.finetune_students(id) on delete cascade;