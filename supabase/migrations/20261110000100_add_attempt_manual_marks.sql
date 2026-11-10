-- Words a teacher marked by hand on a reading that the scorer has not finished yet.
-- Shape: { "<position of the word in the passage, counting from 1>": "Mispronunciation" | "Omission" }.
-- When scoring ends the marks are written onto the matching word rows as the teacher's
-- own flags, and this column is emptied again.
alter table public.assessment_attempts
    add column manual_marks jsonb not null default '{}'::jsonb;
