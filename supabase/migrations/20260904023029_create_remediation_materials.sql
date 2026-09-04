
--
-- Persisted output of the new "Generate Remediation Material" button on
-- AttemptResults.tsx (Results tab, next to the existing Insights
-- section) — turns that page's already-computed dominant-weakness/
-- flagged-word data into an actual saved artifact a teacher can come
-- back to later, rather than something that only ever existed live on
-- one attempt's results page.
--
-- SNAPSHOT, NOT A REFERENCE: passage_title/language/dominant_error_type/
-- words are all captured AT GENERATION TIME, not recomputed from
-- assessment_attempt_words on read. Same reasoning as
-- assessment_attempts.passage_text snapshotting its passage rather than
-- pointing at a passages table (see 20260812060319) — this needs to
-- survive the source attempt later being discarded (its words deleted)
-- or its recording purged, and must NOT silently change if the teacher
-- later reopens and re-reviews that same attempt. attempt_id is kept
-- (on delete set null, not cascade) purely as a "generated from" link
-- for the UI to show/navigate to, never as the source of truth for the
-- content itself.
--
-- MULTIPLE MATERIALS PER ATTEMPT ARE ALLOWED, ON PURPOSE: generating
-- twice from the same attempt (e.g. after reopening and fixing a
-- miscue) creates a second row rather than overwriting the first — a
-- teacher who already handed out drill material shouldn't have it
-- silently rewritten out from under them. There is deliberately no
-- unique constraint on attempt_id here.
--
-- TEACHER-ONLY, V1: no policy here grants a pupil (role = 'student')
-- access at all — this is teacher tooling only for now, matching how
-- Insights/verdicts are teacher-facing today too. Loosening this later
-- (a pupil viewing their own remediation list) is a small additive
-- policy, not a schema change, so this isn't a design dead-end.
create table public.remediation_materials (
                                              id uuid primary key default gen_random_uuid(),
                                              attempt_id uuid references public.assessment_attempts(id) on delete set null,
                                              student_id uuid not null references public.profiles(id) on delete cascade,
                                              teacher_id uuid references public.profiles(id) on delete set null,
                                              language text not null check (language in ('en', 'fil')),
    passage_title text,
    -- Snapshot of computeDominantWeakness()'s own result at generation
    -- time (AttemptResults.tsx) — null only if that attempt somehow had
    -- zero flagged words, though the Generate button is hidden in that
    -- case, so this should never actually happen in practice.
    dominant_error_type text,
    word_count integer not null default 0,
    -- Array of { word, errorType, count } — tallied by (reference word,
    -- effective error type) pair from the source attempt's flagged
    -- words. See buildRemediationWordEntries() in AttemptResults.tsx.
    words jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);
comment on table public.remediation_materials is 'Teacher-generated, per-attempt snapshots of a pupil''s flagged words — created via the Generate Remediation Material button on AttemptResults.tsx. See that file and this migration''s own comments for why this snapshots rather than references live attempt data, and why multiple rows per attempt are allowed.';
create index remediation_materials_student_id_idx on public.remediation_materials (student_id);
create index remediation_materials_teacher_id_idx on public.remediation_materials (teacher_id);
create index remediation_materials_attempt_id_idx on public.remediation_materials (attempt_id);
alter table public.remediation_materials enable row level security;
-- Same "teacher owns this pupil" shape used throughout
-- assessment_attempts/assessment_attempt_words (e.g. 20260812060319,
-- 20260827022815) — either the teacher who generated it, or the
-- pupil's currently-assigned teacher, can see it.
create policy "Teachers can view their pupils' remediation material"
  on public.remediation_materials
  for select
                 using (
                 teacher_id = auth.uid()
                 or exists (
                 select 1 from public.profiles
                 where profiles.id = remediation_materials.student_id
                 and profiles.teacher_id = auth.uid()
                 )
                 );
-- Generating material always attributes it to the calling teacher
-- (teacher_id must equal auth.uid()), and only for one of their own
-- pupils.
create policy "Teachers can generate remediation material for their pupils"
  on public.remediation_materials
  for insert
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = remediation_materials.student_id
        and profiles.teacher_id = auth.uid()
    )
  );
-- Lets a teacher remove a piece of material they no longer want
-- showing in a pupil's list (e.g. generated by mistake). Same
-- ownership shape as select.
create policy "Teachers can delete their pupils' remediation material"
  on public.remediation_materials
  for delete
using (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = remediation_materials.student_id
        and profiles.teacher_id = auth.uid()
    )
  );
-- Raw-SQL-created tables need explicit grants — RLS above narrows
-- rows, not base table access (see the recurring comment on this
-- throughout the migration history, e.g. 20260822033840).
grant select, insert, delete on public.remediation_materials to authenticated;
grant select, insert, update, delete on public.remediation_materials to service_role;