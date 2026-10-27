-- "Needs change" requests on word pictures. While reviewing, an admin can flag
-- a picture as wrong or unsuitable, say what should happen (replace it, fix
-- its words, delete it, other) and leave a note, e.g. "use a carabao plowing
-- instead of the machine". The flag stays on the picture until someone
-- resolves it (replacing the picture clears it automatically).
--
-- The columns sit on word_images itself, set on every row that shares the
-- picture (same convention as reviewed / sense / cues), so the existing admin
-- update policy already covers them: no new policies or grants are needed.
alter table public.word_images
  add column change_action text check (change_action in ('replace', 'fix_words', 'delete', 'other')),
  add column change_note text not null default '',
  add column change_requested_at timestamptz;

-- The flagged list is small next to 1,300+ rows; this keeps the filter cheap.
create index word_images_change_action_idx
  on public.word_images (change_action)
  where change_action is not null;
