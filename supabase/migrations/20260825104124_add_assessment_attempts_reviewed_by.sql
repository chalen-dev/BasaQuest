-- assessment_attempts already tracks WHEN a teacher confirmed an
-- attempt's results (reviewed_at, from 20260812060319), but not WHO —
-- needed now that the teacher review flow (word-level verdict overrides
-- + "Confirm results") actually exists and writes to this column, so
-- the review list / results screen can show who signed off, not just
-- when. Mirrors assessment_attempt_words.teacher_reviewed_by's shape
-- exactly, and reuses the same "Teachers can update their pupils'
-- attempts" UPDATE policy already in place — no new RLS needed, that
-- policy already covers writing reviewed_at/reviewed_by together.
alter table public.assessment_attempts
    add column reviewed_by uuid references public.profiles(id) on delete set null;

comment on column public.assessment_attempts.reviewed_by is 'The teacher who confirmed this attempt''s results (set together with reviewed_at by the review flow). Null until reviewed.';