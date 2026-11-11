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
