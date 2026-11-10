// File: src/pages/proficiency/foundational/data/en/level2.ts
// English Level 2: first words, then short-vowel (CVC) words.
//  - first words: the little words every sentence needs (a, I, is, it, in, on, and, can, see, has),
//    learned by sight so the CVC sentences below can be read
//  - CVC words: one short vowel at a time (a, then e, i, o, u), so a child hears one new sound per block
import { wordsFromRows, type FoundationalLevel, type WordRow } from '../types.ts'

// First words have no picture, so they share one neutral emoji.
const FIRST = '🔤'

const ROWS: WordRow[] = [
    // first words
    ['a', 'first word', FIRST, 'I see a cat.', ['at', 'an']],
    ['I', 'first word', FIRST, 'I can see a pig.', ['it', 'is']],
    ['is', 'first word', FIRST, 'The cat is on the bed.', ['in', 'it']],
    ['it', 'first word', FIRST, 'It is a pig.', ['in', 'is']],
    ['in', 'first word', FIRST, 'The pen is in the bag.', ['it', 'on']],
    ['on', 'first word', FIRST, 'The hat is on the bed.', ['in', 'an']],
    ['and', 'first word', FIRST, 'The cat and the dog.', ['an', 'at']],
    ['can', 'first word', FIRST, 'I can see a pig.', ['cat', 'cap']],
    ['see', 'first word', FIRST, 'I see a pig.', ['sea', 'she']],
    ['has', 'first word', FIRST, 'The hen has a leg.', ['his', 'had']],
    // short a
    ['cat', 'short a', '🐱', 'The cat is on the bed.', ['cot', 'cut']],
    ['hat', 'short a', '🎩', 'The hat is on the cat.', ['hit', 'hot']],
    ['bag', 'short a', '👜', 'My bag is red.', ['big', 'bug']],
    ['map', 'short a', '🗺️', 'I see a map.', ['mop', 'mud']],
    ['cap', 'short a', '🧢', 'My cap is in the bag.', ['cup', 'cop']],
    // short e
    ['pen', 'short e', '🖊️', 'The pen is in the bag.', ['pin', 'pan']],
    ['net', 'short e', '🥅', 'The net is in the box.', ['nut', 'not']],
    ['hen', 'short e', '🐔', 'The hen is in the hut.', ['ham', 'hip']],
    ['bed', 'short e', '🛏️', 'My bed is red.', ['bad', 'bud']],
    ['red', 'short e', '🔴', 'I see a red hat.', ['rid', 'rod']],
    ['leg', 'short e', '🦵', 'The hen has a leg.', ['log', 'lag']],
    // short i
    ['pig', 'short i', '🐷', 'The pig is in the mud.', ['pug', 'peg']],
    ['pin', 'short i', '📌', 'The pin is in the box.', ['pen', 'pan']],
    ['lip', 'short i', '👄', 'My lip is red.', ['lap', 'lid']],
    ['kid', 'short i', '🧒', 'The kid has a cup.', ['kit', 'bid']],
    ['six', 'short i', '6️⃣', 'I see six pigs.', ['sit', 'sick']],
    ['dig', 'short i', '⛏️', 'The dog can dig in the mud.', ['dog', 'dug']],
    // short o
    ['dog', 'short o', '🐶', 'The dog is on the bed.', ['dig', 'dug']],
    ['pot', 'short o', '🍲', 'The egg is in the pot.', ['pit', 'pat']],
    ['mop', 'short o', '🧹', 'I see a mop and a pot.', ['map', 'mud']],
    ['box', 'short o', '📦', 'The cat is in the box.', ['bag', 'fox']],
    ['fox', 'short o', '🦊', 'The fox is on the log.', ['box', 'fix']],
    ['log', 'short o', '🪵', 'The log is in the mud.', ['leg', 'lag']],
    // short u
    ['sun', 'short u', '☀️', 'I see the sun and a kite.', ['son', 'sin']],
    ['bus', 'short u', '🚌', 'I see a bus and a jeepney.', ['bun', 'bug']],
    ['cup', 'short u', '🥤', 'I see a cup and an egg.', ['cap', 'cop']],
    ['nut', 'short u', '🥜', 'The nut is in the cup.', ['net', 'not']],
    ['bug', 'short u', '🐛', 'A bug is on the log.', ['bag', 'big']],
    ['mud', 'short u', '🟤', 'The pig is in the mud.', ['mad', 'mug']],
    ['hut', 'short u', '🛖', 'I see a hut and a pig.', ['hat', 'hit']],
]

export const EN_LEVEL_2: FoundationalLevel = {
    id: 'english-2',
    language: 'en',
    level: 2,
    title: 'First Words & Short Vowels',
    subtitle: 'English · Level 2',
    summary: 'Learn the first little words (a, I, is, it), then read short three-letter words like cat, pen, pig, dog and sun, one vowel at a time.',
    words: wordsFromRows('en', 2, ROWS),
}
