create table public.student_recordings (
                                           id uuid primary key default gen_random_uuid(),
                                           student_id uuid not null references public.profiles(id) on delete cascade,
                                           recorded_by uuid references public.profiles(id) on delete set null,
                                           sentence_set text not null,       -- 'g1_2' or 'g3_4'
                                           sentence_number integer not null, -- 1-based position within that set
                                           sentence_text text not null,
                                           storage_path text not null,       -- path inside the student-recordings bucket
                                           duration_seconds numeric,
                                           status text not null default 'unreviewed', -- unreviewed | fine_tuning | evaluation | discarded
                                           notes text,
                                           created_at timestamptz not null default now()
);

comment on column public.student_recordings.sentence_set is 'Which reading script this clip came from — g1_2 (13 sentences) or g3_4 (9 sentences), matching the printed reading scripts.';
comment on column public.student_recordings.status is 'unreviewed until someone applies the fine-tuning eligibility checklist from the recording plan; then fine_tuning, evaluation, or discarded. No review UI is built yet — this just gives the column a sane default to filter on later.';

create index if not exists student_recordings_student_id_idx on public.student_recordings (student_id);
create index if not exists student_recordings_status_idx on public.student_recordings (status);

alter table public.student_recordings enable row level security;

-- Only admins can log a recording, and only as themselves (recorded_by
-- must match the caller — stops one admin's session from being used to
-- attribute a clip to a different admin).
create policy "Admins can insert recordings"
  on public.student_recordings for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and (recorded_by is null or recorded_by = auth.uid())
  );

-- Admins and teachers can both see the recording log (teachers may want to
-- know which of their pupils have been recorded already); only admins can
-- ever write to it.
create policy "Admins and teachers can view recordings"
  on public.student_recordings for select
                                                     using (
                                                     exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'teacher'))
                                                     );

-- Review/relabeling (unreviewed -> fine_tuning/evaluation/discarded) isn't
-- built yet, but admins should already be able to correct a mislabeled row
-- once that UI exists, so the policy is here now rather than as a second
-- migration later.
create policy "Admins can update recordings"
  on public.student_recordings for update
                                              using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
                                   with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

grant select, insert, update on table public.student_recordings to authenticated;

-- Private bucket for the actual audio blobs. Not public — access only
-- through the RLS policies below (which mirror the table policies).
insert into storage.buckets (id, name, public)
values ('student-recordings', 'student-recordings', false)
    on conflict (id) do nothing;

create policy "Admins can upload recordings"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'student-recordings'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins and teachers can view recording files"
  on storage.objects for select
                                           to authenticated
                                           using (
                                           bucket_id = 'student-recordings'
                                           and exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'teacher'))
                                           );