-- File: supabase/migrations/20261109000000_create_foundational_cards.sql
--
-- Editable cards for Foundational Words & Sounds (Level 1, Letters & Sounds).
--
-- A SET is one version of a level's cards. There is one shared DEFAULT set per
-- level (owner_id is null, seeded below from the built-in data in
-- src/pages/proficiency/foundational/data/en/level1.ts) and a teacher may make
-- ONE set of their own per level. A pupil sees their teacher's set if the
-- teacher made one, and the default otherwise; a teacher sees their own; an
-- admin edits the default. The app falls back to the built-in data when no
-- set can be read, so the page keeps working before this is applied.
--
-- A CARD is one object on a letter: position 0 is the letter's main word, the
-- rest are the extra objects shown when a pupil taps the picture. The picture
-- itself is the drawing the scene has for the word, else the Word Pictures
-- library image for the word, else the emoji stored here.
create table public.foundational_sets (
  id uuid primary key default gen_random_uuid(),
  level_key text not null,
  owner_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index foundational_sets_one_default_per_level
  on public.foundational_sets (level_key) where owner_id is null;
create unique index foundational_sets_one_per_owner_and_level
  on public.foundational_sets (owner_id, level_key) where owner_id is not null;

create table public.foundational_cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.foundational_sets(id) on delete cascade,
  letter text not null check (letter ~ '^[a-z]$'),
  position integer not null default 0,
  word text not null check (char_length(btrim(word)) between 1 and 40),
  emoji text not null default '' check (char_length(emoji) <= 16),
  created_at timestamptz not null default now()
);

create index foundational_cards_set_letter_idx
  on public.foundational_cards (set_id, letter, position);

alter table public.foundational_sets enable row level security;
alter table public.foundational_cards enable row level security;

-- SETS: readable when it is the default, your own, or your teacher's.
create policy "Read default, own and teacher's foundational sets"
  on public.foundational_sets for select
  to authenticated
  using (
    owner_id is null
    or owner_id = auth.uid()
    or owner_id = (select teacher_id from public.profiles where id = auth.uid())
  );

create policy "Teachers make their own set, admins the default"
  on public.foundational_sets for insert
  to authenticated
  with check (
    (owner_id = auth.uid()
      and exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin')))
    or (owner_id is null
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

create policy "Delete your own set, admins the default"
  on public.foundational_sets for delete
  to authenticated
  using (
    (owner_id = auth.uid()
      and exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin')))
    or (owner_id is null
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

-- CARDS: readable when their set is readable (the set policy above applies
-- inside this sub-select), writable by whoever may edit that set.
create policy "Read cards of readable sets"
  on public.foundational_cards for select
  to authenticated
  using (exists (select 1 from public.foundational_sets s where s.id = set_id));

create policy "Insert cards into your own set, admins the default"
  on public.foundational_cards for insert
  to authenticated
  with check (exists (
    select 1 from public.foundational_sets s
    where s.id = set_id
      and (
        (s.owner_id = auth.uid()
          and exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin')))
        or (s.owner_id is null
          and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
      )
  ));

create policy "Update cards of your own set, admins the default"
  on public.foundational_cards for update
  to authenticated
  using (exists (
    select 1 from public.foundational_sets s
    where s.id = set_id
      and (
        (s.owner_id = auth.uid()
          and exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin')))
        or (s.owner_id is null
          and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
      )
  ))
  with check (exists (
    select 1 from public.foundational_sets s
    where s.id = set_id
      and (
        (s.owner_id = auth.uid()
          and exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin')))
        or (s.owner_id is null
          and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
      )
  ));

create policy "Delete cards of your own set, admins the default"
  on public.foundational_cards for delete
  to authenticated
  using (exists (
    select 1 from public.foundational_sets s
    where s.id = set_id
      and (
        (s.owner_id = auth.uid()
          and exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin')))
        or (s.owner_id is null
          and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
      )
  ));

grant select, insert, update, delete on table public.foundational_sets to authenticated;
grant select, insert, update, delete on table public.foundational_cards to authenticated;
grant select, insert, update, delete on table public.foundational_sets to service_role;
grant select, insert, update, delete on table public.foundational_cards to service_role;

-- SEED: the shared default set for English Level 1 (50 cards).
with s as (
  insert into public.foundational_sets (level_key) values ('letters-en') returning id
)
insert into public.foundational_cards (set_id, letter, position, word, emoji)
select s.id, v.letter, v.position, v.word, v.emoji
from s, (values
    ('a', 0, 'apple', '🍎'),
    ('a', 1, 'ant', '🐜'),
    ('b', 0, 'banana', '🍌'),
    ('b', 1, 'ball', '⚽'),
    ('c', 0, 'carabao', '🐃'),
    ('c', 1, 'cat', '🐱'),
    ('d', 0, 'duck', '🦆'),
    ('d', 1, 'dog', '🐶'),
    ('e', 0, 'egg', '🥚'),
    ('e', 1, 'elephant', '🐘'),
    ('f', 0, 'fish', '🐟'),
    ('f', 1, 'fork', '🍴'),
    ('g', 0, 'goat', '🐐'),
    ('g', 1, 'guitar', '🎸'),
    ('h', 0, 'hen', '🐔'),
    ('h', 1, 'hat', '🎩'),
    ('i', 0, 'ink', '🖋️'),
    ('i', 1, 'insect', '🐛'),
    ('j', 0, 'jeepney', '🚌'),
    ('j', 1, 'jacket', '🧥'),
    ('k', 0, 'kite', '🪁'),
    ('k', 1, 'key', '🔑'),
    ('l', 0, 'lemon', '🍋'),
    ('l', 1, 'leaf', '🍃'),
    ('m', 0, 'mango', '🥭'),
    ('m', 1, 'moon', '🌙'),
    ('n', 0, 'nest', '🪺'),
    ('n', 1, 'nose', '👃'),
    ('o', 0, 'ox', '🐂'),
    ('o', 1, 'octopus', '🐙'),
    ('p', 0, 'papaya', '🧡'),
    ('p', 1, 'pig', '🐷'),
    ('q', 0, 'queen', '👑'),
    ('r', 0, 'rice', '🍚'),
    ('r', 1, 'rainbow', '🌈'),
    ('s', 0, 'sun', '☀️'),
    ('s', 1, 'sock', '🧦'),
    ('t', 0, 'tiger', '🐯'),
    ('t', 1, 'turtle', '🐢'),
    ('u', 0, 'umbrella', '☂️'),
    ('v', 0, 'van', '🚐'),
    ('v', 1, 'volcano', '🌋'),
    ('w', 0, 'watermelon', '🍉'),
    ('w', 1, 'watch', '⌚'),
    ('x', 0, 'box', '📦'),
    ('x', 1, 'fox', '🦊'),
    ('y', 0, 'yo-yo', '🪀'),
    ('y', 1, 'yam', '🍠'),
    ('z', 0, 'zebra', '🦓'),
    ('z', 1, 'zero', '0️⃣')
) as v(letter, position, word, emoji);
