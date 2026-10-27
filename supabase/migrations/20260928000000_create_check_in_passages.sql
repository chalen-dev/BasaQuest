-- Saved reading check-in passages for teacher-run ("Now") sessions.
--
-- A teacher picks a difficulty, generates a passage for a pupil, reads and
-- validates it, and only then records. That used to live in the browser tab's
-- session storage, so closing the tab (or using another computer) lost it and
-- the student picker could not show who already had a passage waiting. This
-- keeps it on the server: a pupil can have a passage prepared ahead of class
-- ("needs_validation"), validated ("approved"), and picked up from any device.
--
-- ONE ROW PER (pupil, language): saving again replaces it, so generating a
-- new passage never piles up rows. It expires after 7 days (reads ignore
-- expired rows and the next save overwrites them), so nobody is handed a
-- stale passage after the pupil's grade has changed. The row is deleted once
-- a reading has actually been submitted, as the passage is then stored with
-- the attempt itself (assessment_attempts.passage_text).
--
-- A pupil's own (non-assisted) session does not use this table; it keeps the
-- passage in the browser tab, and pupils have no policy here at all.
create table public.check_in_passages (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.profiles(id) on delete cascade,
    teacher_id uuid not null references public.profiles(id) on delete cascade,
    language text not null check (language in ('en', 'fil')),
    title text not null,
    passage text not null,
    -- The 1-5 difficulty the teacher asked for when generating (not the
    -- measured rating, which is worked out from the text when shown).
    difficulty smallint check (difficulty between 1 and 5),
    status text not null default 'needs_validation' check (status in ('needs_validation', 'approved')),
    approved_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    expires_at timestamptz not null default now() + interval '7 days',
    unique (student_id, language)
);
comment on table public.check_in_passages is 'A generated reading check-in passage saved for a pupil (one per pupil and language), waiting for the teacher to validate it or ready to record. Teacher-run sessions only; expires after 7 days.';
create index check_in_passages_teacher_id_idx on public.check_in_passages (teacher_id);
alter table public.check_in_passages enable row level security;

-- Same "teacher owns this pupil" shape as remediation_material_drafts.
create policy "Teachers can view their pupils' check-in passages"
  on public.check_in_passages
  for select
  to authenticated
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = check_in_passages.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

create policy "Teachers can save check-in passages for their pupils"
  on public.check_in_passages
  for insert
  to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = check_in_passages.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

-- Needed alongside insert for upsert() (INSERT ... ON CONFLICT DO UPDATE).
create policy "Teachers can update their pupils' check-in passages"
  on public.check_in_passages
  for update
  to authenticated
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = check_in_passages.student_id
        and profiles.teacher_id = auth.uid()
    )
  )
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = check_in_passages.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

create policy "Teachers can delete their pupils' check-in passages"
  on public.check_in_passages
  for delete
  to authenticated
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = check_in_passages.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

-- Raw-SQL-created tables need explicit grants: RLS narrows rows, not base
-- table access (same note as the other tables created in migrations).
grant select, insert, update, delete on public.check_in_passages to authenticated;
grant select, insert, update, delete on public.check_in_passages to service_role;
