
-- Review tracking for the word pictures: the import scripts load hundreds of
-- pictures at once from ARASAAC / OpenMoji, and an admin needs a way to mark
-- which ones they've actually looked at (see admin Word Pictures screen).
-- Everything already imported starts as not reviewed; uploading or replacing
-- a picture by hand counts as reviewed. word_images already has admin-only
-- insert/update/delete policies, which cover these columns.
alter table public.word_images
  add column reviewed boolean not null default false,
  add column reviewed_at timestamptz;
