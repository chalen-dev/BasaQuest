-- File: supabase/migrations/20261109000200_seed_foundational_filipino_level1.sql
--
-- Filipino Level 1 (Mga Titik at Tunog) for the editable Foundational cards.
-- Two things:
--   1. A letter may now be two characters, because the Abakada has NG
--      (the first migration only allowed a single a-z letter).
--   2. The shared default set for 'letters-fil', seeded from the built-in data in
--      src/pages/proficiency/foundational/data/fil/level1.ts (71 cards, 20 letters).
-- Teachers copy and edit it the same way as the English set. The app falls back to
-- the built-in data when no set can be read, so the page works before this is applied.
alter table public.foundational_cards drop constraint foundational_cards_letter_check;
alter table public.foundational_cards
  add constraint foundational_cards_letter_check check (letter ~ '^[a-z]{1,2}$');

with s as (
  insert into public.foundational_sets (level_key) values ('letters-fil') returning id
)
insert into public.foundational_cards (set_id, letter, position, word, emoji)
select s.id, v.letter, v.position, v.word, v.emoji
from s, (values
    ('a', 0, 'aso', '🐶'),
    ('a', 1, 'ahas', '🐍'),
    ('a', 2, 'araw', '☀️'),
    ('b', 0, 'bola', '⚽'),
    ('b', 1, 'bahay', '🏠'),
    ('b', 2, 'baboy', '🐷'),
    ('b', 3, 'bibe', '🦆'),
    ('k', 0, 'kabayo', '🐴'),
    ('k', 1, 'kamote', '🍠'),
    ('k', 2, 'kandila', '🕯️'),
    ('k', 3, 'kuting', '🐈'),
    ('d', 0, 'dahon', '🍃'),
    ('d', 1, 'daga', '🐭'),
    ('d', 2, 'damit', '👕'),
    ('d', 3, 'dila', '👅'),
    ('e', 0, 'eroplano', '✈️'),
    ('e', 1, 'elepante', '🐘'),
    ('e', 2, 'eskwela', '🏫'),
    ('g', 0, 'gatas', '🥛'),
    ('g', 1, 'gitara', '🎸'),
    ('g', 2, 'gunting', '✂️'),
    ('g', 3, 'gagamba', '🕷️'),
    ('h', 0, 'hipon', '🦐'),
    ('h', 1, 'hari', '🤴'),
    ('h', 2, 'hagdan', '🪜'),
    ('h', 3, 'halaman', '🌱'),
    ('i', 0, 'isda', '🐟'),
    ('i', 1, 'ibon', '🐦'),
    ('i', 2, 'itlog', '🥚'),
    ('i', 3, 'ilaw', '💡'),
    ('l', 0, 'lobo', '🎈'),
    ('l', 1, 'lapis', '✏️'),
    ('l', 2, 'langgam', '🐜'),
    ('l', 3, 'leon', '🦁'),
    ('m', 0, 'mangga', '🥭'),
    ('m', 1, 'manok', '🐔'),
    ('m', 2, 'mata', '👁️'),
    ('m', 3, 'mansanas', '🍎'),
    ('n', 0, 'niyog', '🥥'),
    ('n', 1, 'nanay', '👩'),
    ('n', 2, 'nars', '🧑‍⚕️'),
    ('ng', 0, 'ngipin', '🦷'),
    ('ng', 1, 'ngiti', '😊'),
    ('o', 0, 'orasan', '🕰️'),
    ('o', 1, 'oso', '🐻'),
    ('o', 2, 'ospital', '🏥'),
    ('p', 0, 'pusa', '🐱'),
    ('p', 1, 'puso', '❤️'),
    ('p', 2, 'payong', '☂️'),
    ('p', 3, 'pato', '🦆'),
    ('r', 0, 'radyo', '📻'),
    ('r', 1, 'rosas', '🌹'),
    ('r', 2, 'relo', '⌚'),
    ('r', 3, 'regalo', '🎁'),
    ('s', 0, 'saging', '🍌'),
    ('s', 1, 'sapatos', '👟'),
    ('s', 2, 'silya', '🪑'),
    ('s', 3, 'susi', '🔑'),
    ('t', 0, 'tubig', '💧'),
    ('t', 1, 'tinapay', '🍞'),
    ('t', 2, 'tatay', '👨'),
    ('t', 3, 'tuta', '🐕'),
    ('u', 0, 'ulan', '🌧️'),
    ('u', 1, 'uod', '🐛'),
    ('u', 2, 'unan', '🛏️'),
    ('w', 0, 'walis', '🧹'),
    ('w', 1, 'watawat', '🇵🇭'),
    ('w', 2, 'walo', '8️⃣'),
    ('y', 0, 'yelo', '🧊'),
    ('y', 1, 'yoyo', '🪀'),
    ('y', 2, 'yakap', '🤗')
) as v(letter, position, word, emoji);
