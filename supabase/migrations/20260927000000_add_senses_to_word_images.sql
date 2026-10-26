-- Same word, different meaning (top = spinning toy / bottle cap / peak) and
-- phrases ("spinning top", "anak na babae").
--
-- Until now a word had exactly one picture. A word can now have several, one
-- per sense, and the coach chooses between them from the sentence:
--   1. a phrase row that matches the tapped word and its neighbours;
--   2. otherwise the sense whose cue words appear near the tapped word;
--   3. otherwise the sense marked is_default (or the only one);
--   4. otherwise no picture.
--
--   sense       short label shown to reviewers ("spinning toy"); '' = the ordinary,
--               single meaning every existing row already has
--   cues        words that, when they appear near the tapped word, point to this sense
--   is_default  the sense to show when no cue matches; at most one per word
--
-- A phrase is stored in `word` as its normalized words joined by single spaces
-- ("spinning top"). Normalized single words never contain a space, so a phrase
-- can never be mistaken for one.
alter table public.word_images
  add column if not exists sense text not null default '',
  add column if not exists cues text[] not null default '{}',
  add column if not exists is_default boolean not null default false;

-- One row per (language, word, sense) instead of per (language, word).
alter table public.word_images drop constraint if exists word_images_language_word_key;
alter table public.word_images
  add constraint word_images_language_word_sense_key unique (language, word, sense);

-- Only one default sense per word.
create unique index if not exists word_images_one_default_per_word
  on public.word_images (language, word) where is_default;
