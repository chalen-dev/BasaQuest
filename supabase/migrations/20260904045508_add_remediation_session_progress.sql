
-- Supports the new teacher-led "Start Remediation" session
-- (RemediationSession.tsx) — a focused, stripped-header page (same
-- pattern as AssessmentSessionLayout) where a teacher steps through one
-- piece of remediation_materials' word list with the pupil and marks
-- each word practiced or not.
--
-- PROGRESS LIVES INSIDE THE EXISTING words JSONB, NOT A NEW TABLE: each
-- entry already has the shape { word, errorType, count } — this just
-- adds a `practiced: boolean` field to that same shape client-side (see
-- remediation/hooks.ts's RemediationWordEntry type). No schema change
-- is needed for that part since jsonb has no fixed shape; older rows
-- generated before this feature simply have entries without a
-- `practiced` key, which the client treats as false. What DOES need a
-- migration is:
--   1. last_practiced_at — a single timestamp so RemediationList.tsx /
--      StudentRemediationDetail.tsx can eventually show "last practiced
--      3 days ago" without inspecting every word in every material.
--      Updated any time a teacher saves progress from a session,
--      regardless of whether every word ended up marked practiced.
--   2. An UPDATE policy + grant — remediation_materials was only ever
--      given select/insert/delete (see its original migration's own
--      comment on why: it was designed as an immutable snapshot).
--      Persisting per-word practiced toggles means this table is no
--      longer write-once, so this adds the missing UPDATE path with
--      the same "teacher owns this pupil" ownership shape every other
--      policy on this table already uses.
alter table public.remediation_materials
    add column last_practiced_at timestamptz;
comment on column public.remediation_materials.last_practiced_at is 'Set whenever a teacher saves progress from a remediation session (RemediationSession.tsx) against this material — either finishing the session or exiting early still updates this, since even partial practice is worth surfacing in the list views. Null until the first session touches this material.';
create policy "Teachers can update their pupils' remediation material"
  on public.remediation_materials
  for update
                         using (
                         teacher_id = auth.uid()
                         or exists (
                         select 1 from public.profiles
                         where profiles.id = remediation_materials.student_id
                         and profiles.teacher_id = auth.uid()
                         )
                         )
      with check (
                         teacher_id = auth.uid()
                         or exists (
                         select 1 from public.profiles
                         where profiles.id = remediation_materials.student_id
                         and profiles.teacher_id = auth.uid()
                         )
                         );
grant update on public.remediation_materials to authenticated;