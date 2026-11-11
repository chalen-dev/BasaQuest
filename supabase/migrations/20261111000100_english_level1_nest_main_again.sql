-- English Level 1: N goes back to nest as its main word (nose stays as the second picture).
-- Shared default set only; teacher copies are left as they are.
update public.foundational_cards c
set position = case when c.word = 'nest' then 0 else 1 end
from public.foundational_sets s
where c.set_id = s.id
  and s.level_key = 'letters-en'
  and s.owner_id is null
  and c.letter = 'n'
  and c.word in ('nest', 'nose');
