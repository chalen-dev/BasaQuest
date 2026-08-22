
-- Word-level ground-truth miscue labels for student_recordings, added
-- specifically to feed the Filipino miscue-detection model's evaluation
-- pipeline (Phase 5 in basaquest-filipino-miscue-detection/ROADMAP.md):
-- comparing the GOP scorer's predicted per-word verdicts against real
-- human judgment needs real labeled examples, which the underlying
-- speech corpus doesn't have ("no labeled mispronunciation examples for
-- calibration" per that project's ROADMAP). A clean recording (no rows
-- here) is exactly the shape Phase 3.5-style continued fine-tuning needs
-- (audio + the reference sentence's own G2P phonemes as the label,
-- per that notebook's "Next steps" #3); a recording WITH rows here is
-- instead evaluation ground truth, not a training pair, since the audio
-- no longer matches the reference sentence's phonemes 1:1.
--
-- Deliberately mirrors assessment_attempt_words' shape (word_index as
-- numeric so an inserted word can sit at a fractional index with no
-- fixed reference position, error_type check constraint) for
-- consistency with the pattern already used for the live
-- pupil-assessment feature, rather than inventing a new one.
create table public.student_recording_word_flags (
                                                     id uuid primary key default gen_random_uuid(),
                                                     recording_id uuid not null references public.student_recordings(id) on delete cascade,
                                                     word_index numeric not null,       -- position within sentence_text; fractional for an inserted word (no fixed reference position)
                                                     word_text text,                    -- the reference word; null only for an insertion (there's no reference word to attach to)
                                                     error_type text not null check (error_type in ('omission', 'insertion', 'mispronunciation')),
                                                     notes text,
                                                     created_at timestamptz not null default now(),
                                                     constraint student_recording_word_flags_word_text_check
                                                         check (error_type = 'insertion' or word_text is not null)
);
comment on table public.student_recording_word_flags is 'Word-level ground-truth miscue labels, tagged by an admin immediately after recording a take. Existence of any row for a recording is what distinguishes student_recordings.status = evaluation (labeled ground truth for the GOP scorer''s Phase 5 accuracy evaluation) from fine_tuning (clean reading, directly usable as an (audio, reference-phonemes) training pair).';
create index if not exists student_recording_word_flags_recording_id_idx on public.student_recording_word_flags (recording_id);
alter table public.student_recording_word_flags enable row level security;
-- Same admin-only shape as student_recordings itself.
create policy "Admins can manage recording word flags"
  on public.student_recording_word_flags for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
grant select, insert, update, delete on table public.student_recording_word_flags to authenticated;