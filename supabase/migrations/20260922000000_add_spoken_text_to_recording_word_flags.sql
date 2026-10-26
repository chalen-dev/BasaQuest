-- What the student actually said for a mispronounced word, typed by the
-- admin on the annotate page (src/pages/admin/recording/annotate). Only
-- meaningful for error_type = 'mispronunciation'; null for omissions
-- (nothing was said) and insertions (their text already lives in notes).
-- Gives the miscue-detection model's evaluation set the real heard form,
-- not just "this word was wrong".
alter table public.student_recording_word_flags
    add column if not exists spoken_text text;

comment on column public.student_recording_word_flags.spoken_text is 'For error_type = mispronunciation: what the student actually said, as typed by the annotating admin. Null otherwise.';
