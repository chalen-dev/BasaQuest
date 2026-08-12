-- Reading assessment attempts (English miscue-detection pipeline)
-- One row per submitted recording. Passage text is snapshotted onto the
-- attempt itself (rather than referencing a passages table) since passages
-- are generated on the fly (Gemini or placeholder) and are not persisted
-- elsewhere.

create table public.assessment_attempts (
                                            id uuid primary key default gen_random_uuid(),
                                            student_id uuid not null references public.profiles(id) on delete cascade,
                                            teacher_id uuid references public.profiles(id) on delete set null,

                                            language text not null check (language in ('en', 'fil')),
  passage_title text,
  passage_text text not null,
  grade_level text,

  -- Path inside the private "assessment-recordings" storage bucket,
  -- e.g. "<student_id>/<attempt_id>.webm"
  audio_path text not null,
  duration_seconds numeric,

  status text not null default 'pending'
    check (status in ('pending', 'processing', 'scored', 'failed')),
  error_message text,

  -- Utterance-level scores from Azure Pronunciation Assessment (0-100)
  accuracy_score numeric,
  fluency_score numeric,
  prosody_score numeric,
  completeness_score numeric,
  pron_score numeric,

  created_at timestamptz not null default now(),
  scored_at timestamptz,

  -- Data-retention support (manuscript: 7-day max retention or
  -- delete-after-teacher-review, whichever comes first). Not enforced yet,
  -- just tracked so a cleanup job can act on it later.
  reviewed_at timestamptz,
  purge_after timestamptz not null default (now() + interval '7 days')
);

create index assessment_attempts_student_id_idx on public.assessment_attempts(student_id);
create index assessment_attempts_teacher_id_idx on public.assessment_attempts(teacher_id);
create index assessment_attempts_status_idx on public.assessment_attempts(status);

alter table public.assessment_attempts enable row level security;

-- Students can see and create their own attempts.
create policy "Students can view their own attempts"
  on public.assessment_attempts
  for select
                 using (student_id = auth.uid());

create policy "Students can insert their own attempts"
  on public.assessment_attempts
  for insert
  with check (student_id = auth.uid());

-- Teachers can view attempts belonging to their own pupils, and attempts
-- they personally kicked off via the "Start Now" flow.
create policy "Teachers can view their pupils' attempts"
  on public.assessment_attempts
  for select
                        using (
                        teacher_id = auth.uid()
                        or exists (
                        select 1 from public.profiles
                        where profiles.id = assessment_attempts.student_id
                        and profiles.teacher_id = auth.uid()
                        )
                        );

-- Teachers starting a session on behalf of a pupil ("Start Now") insert the
-- attempt row themselves with student_id set to the pupil.
create policy "Teachers can insert attempts for their pupils"
  on public.assessment_attempts
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = assessment_attempts.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

create policy "Teachers can update their pupils' attempts"
  on public.assessment_attempts
  for update
                        using (
                        exists (
                        select 1 from public.profiles
                        where profiles.id = assessment_attempts.student_id
                        and profiles.teacher_id = auth.uid()
                        )
                        );

-- Raw-SQL-created tables need explicit grants; RLS above narrows rows, not
-- base table access.
grant select, insert, update, delete on public.assessment_attempts to service_role;
grant select, insert, update on public.assessment_attempts to authenticated;


-- Per-word miscue detection detail.
create table public.assessment_attempt_words (
                                                 id uuid primary key default gen_random_uuid(),
                                                 attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,

    -- Numeric, not int: an inserted word (extra word the pupil said that
    -- isn't in the passage) sits *between* two reference words and has no
    -- reference word of its own, so it gets a fractional index like 3.5
    -- between reference word 3 and reference word 4.
                                                 word_index numeric not null,

    -- Null only for Insertion rows (extra word not present in the passage).
                                                 reference_word text,
                                                 recognized_word text,

    -- Azure's own tag, when available (continuous-mode results may leave this
    -- null for words we had to align ourselves).
                                                 error_type text not null check (error_type in ('None', 'Omission', 'Insertion', 'Mispronunciation')),
                                                 accuracy_score numeric,

    -- System's own determination + how confident it is. Low-confidence rows
    -- are the ones the UI should surface to the teacher for review.
                                                 system_verdict text not null check (system_verdict in ('correct', 'miscue')),
                                                 confidence text not null check (confidence in ('high', 'low')),

                                                 constraint assessment_attempt_words_reference_word_check
                                                     check (error_type = 'Insertion' or reference_word is not null),

    -- Teacher's decision, stored separately from system_verdict so agreement
    -- rate (Cohen's kappa) can be computed later without losing either value.
                                                 teacher_verdict text check (teacher_verdict in ('correct', 'miscue')),
                                                 teacher_reviewed_at timestamptz,
                                                 teacher_reviewed_by uuid references public.profiles(id) on delete set null,

                                                 created_at timestamptz not null default now()
);

create index assessment_attempt_words_attempt_id_idx on public.assessment_attempt_words(attempt_id);
create unique index assessment_attempt_words_attempt_word_idx
    on public.assessment_attempt_words(attempt_id, word_index);

alter table public.assessment_attempt_words enable row level security;

create policy "Students can view their own attempt words"
  on public.assessment_attempt_words
  for select
                 using (
                 exists (
                 select 1 from public.assessment_attempts
                 where assessment_attempts.id = assessment_attempt_words.attempt_id
                 and assessment_attempts.student_id = auth.uid()
                 )
                 );

create policy "Teachers can view their pupils' attempt words"
  on public.assessment_attempt_words
  for select
                 using (
                 exists (
                 select 1 from public.assessment_attempts
                 join public.profiles on profiles.id = assessment_attempts.student_id
                 where assessment_attempts.id = assessment_attempt_words.attempt_id
                 and (
                 assessment_attempts.teacher_id = auth.uid()
                 or profiles.teacher_id = auth.uid()
                 )
                 )
                 );

create policy "Teachers can override verdicts for their pupils' attempt words"
  on public.assessment_attempt_words
  for update
                 using (
                 exists (
                 select 1 from public.assessment_attempts
                 join public.profiles on profiles.id = assessment_attempts.student_id
                 where assessment_attempts.id = assessment_attempt_words.attempt_id
                 and (
                 assessment_attempts.teacher_id = auth.uid()
                 or profiles.teacher_id = auth.uid()
                 )
                 )
                 );

grant select, insert, update, delete on public.assessment_attempt_words to service_role;
grant select, update on public.assessment_attempt_words to authenticated;


-- Private bucket for the raw recordings. Never public — only the scoring
-- service (service_role) and the owning student/teacher can read from it.
insert into storage.buckets (id, name, public)
values ('assessment-recordings', 'assessment-recordings', false)
    on conflict (id) do nothing;

create policy "Students can upload their own recordings"
  on storage.objects
  for insert
  with check (
    bucket_id = 'assessment-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students can read their own recordings"
  on storage.objects
  for select
                        using (
                        bucket_id = 'assessment-recordings'
                        and (storage.foldername(name))[1] = auth.uid()::text
                        );

create policy "Teachers can read their pupils' recordings"
  on storage.objects
  for select
                 using (
                 bucket_id = 'assessment-recordings'
                 and exists (
                 select 1 from public.profiles
                 where profiles.id::text = (storage.foldername(name))[1]
                 and profiles.teacher_id = auth.uid()
                 )
                 );