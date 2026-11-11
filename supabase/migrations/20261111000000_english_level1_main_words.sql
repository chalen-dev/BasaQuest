-- English Level 1: new main (position 0) objects on six letters of the SHARED default set.
-- e: elephant, i: insect, m: moon, n: nose, o: octopus, r: rainbow. The old main word
-- becomes the second object. Teacher copies (owner_id not null) are left as they are.
update public.foundational_cards c
set position = case
    when c.word in ('elephant', 'insect', 'moon', 'nose', 'octopus', 'rainbow') then 0
    else 1
  end
from public.foundational_sets s
where c.set_id = s.id
  and s.level_key = 'letters-en'
  and s.owner_id is null
  and c.letter in ('e', 'i', 'm', 'n', 'o', 'r')
  and c.word in ('egg', 'elephant', 'ink', 'insect', 'mango', 'moon', 'nest', 'nose', 'ox', 'octopus', 'rice', 'rainbow');

-- x: x-ray becomes the main word (it starts with the letter itself); box and fox follow.
update public.foundational_cards c
set position = c.position + 1
from public.foundational_sets s
where c.set_id = s.id and s.level_key = 'letters-en' and s.owner_id is null and c.letter = 'x';

insert into public.foundational_cards (set_id, letter, position, word, emoji)
select s.id, 'x', 0, 'x-ray', '🩻'
from public.foundational_sets s
where s.level_key = 'letters-en' and s.owner_id is null;
