-- Auto-saved, in-progress state for RemediationPassagePreview.tsx (the
-- teacher's "review the passages before saving" screen) — see that
-- file's own header comment. Exists so leaving and coming back to the
-- same attempt's preview shows exactly what was there before, instead
-- of spending a fresh Gemini call every time the teacher merely
-- navigates away and back.
--
-- A SEPARATE TABLE, NOT A status/is_draft COLUMN ON remediation_materials:
-- Reading Coach Mode, the flashcard session, and the student's
-- remediation list all only ever query remediation_materials — a draft
-- here physically cannot leak into anything a pupil can see, since
-- there's no filter to remember (and possibly forget) to add everywhere
-- else that table is read.
--
-- ONE ROW PER ATTEMPT: attempt_id is UNIQUE, and the client always
-- upserts on it (see remediation/hooks.ts's useSaveRemediationDraftMutation)
-- rather than inserting a fresh row per edit — so repeated discard/
-- regenerate/Start Over cycles on the same attempt never accumulate
-- rows. `on delete cascade` (unlike remediation_materials' own `on
-- delete set null`) since a draft has no reason to survive its source
-- attempt being discarded — it was never a durable artifact, unlike a
-- CONFIRMED material, which deliberately snapshots and outlives its
-- attempt.
--
-- Deleted the moment the teacher actually saves (see
-- RemediationPassagePreview.tsx's handleSave) — its only remaining
-- lifetime after that is "abandoned, teacher never came back," which at
-- this app's scale is a handful of small JSON rows at worst, not worth
-- a cleanup job for now.
create table public.remediation_material_drafts (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid not null unique references public.assessment_attempts(id) on delete cascade,
    student_id uuid not null references public.profiles(id) on delete cascade,
    teacher_id uuid not null references public.profiles(id) on delete cascade,
    language text not null check (language in ('en', 'fil')),
    passage_title text,
    dominant_error_type text,
    word_count integer not null default 0,
    -- Same shape as remediation_materials.words — see that migration's
    -- own comment.
    words jsonb not null default '[]'::jsonb,
    -- Same shape as remediation_materials.passages — null while
    -- generation hasn't succeeded yet (or errored), an array (possibly
    -- empty, if every passage has been discarded) once it has.
    passages jsonb,
    updated_at timestamptz not null default now()
);
comment on table public.remediation_material_drafts is 'Auto-saved in-progress state for the remediation-passage review screen (RemediationPassagePreview.tsx) — one row per attempt, upserted on every generate/discard/regenerate, deleted once the teacher actually confirms via Save. Never read by Reading Coach Mode, the flashcard session, or any pupil-facing screen.';
create index remediation_material_drafts_student_id_idx on public.remediation_material_drafts (student_id);
create index remediation_material_drafts_teacher_id_idx on public.remediation_material_drafts (teacher_id);
alter table public.remediation_material_drafts enable row level security;

-- Same "teacher owns this pupil" shape as remediation_materials' own
-- policies (20260904023029).
create policy "Teachers can view their pupils' remediation drafts"
  on public.remediation_material_drafts
  for select
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = remediation_material_drafts.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

create policy "Teachers can create remediation drafts for their pupils"
  on public.remediation_material_drafts
  for insert
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = remediation_material_drafts.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

-- Needed alongside insert for upsert() (INSERT ... ON CONFLICT DO
-- UPDATE) to work through RLS regardless of which branch it takes.
create policy "Teachers can update their pupils' remediation drafts"
  on public.remediation_material_drafts
  for update
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = remediation_material_drafts.student_id
        and profiles.teacher_id = auth.uid()
    )
  )
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = remediation_material_drafts.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

create policy "Teachers can delete their pupils' remediation drafts"
  on public.remediation_material_drafts
  for delete
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = remediation_material_drafts.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

-- Raw-SQL-created tables need explicit grants — RLS above narrows rows,
-- not base table access (same recurring note as remediation_materials'
-- own migration).
grant select, insert, update, delete on public.remediation_material_drafts to authenticated;
grant select, insert, update, delete on public.remediation_material_drafts to service_role;
