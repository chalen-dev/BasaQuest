// File: src/pages/proficiency/foundational/data/en/level2.ts
// English Level 2: first words, then short-vowel (CVC) words in WORD FAMILIES.
//  - first words: the little words every sentence needs (a, I, is, it, in, on, and, can, see, has),
//    learned by sight so the CVC sentences below can be read
//  - CVC words: one short vowel at a time (a, then e, i, o, u), and inside each vowel the words
//    come in families that end the same way (cat, hat, bat, rat / dot, pot, hot). The child learns
//    the ending once and swaps the first sound. `phonics_focus` names the vowel and the family.
//    Distractors change only the vowel (cat -> cot, cut) so the child must look at the middle.
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

    // short a: -at, -ag, -ap
    ['cat', 'short a · -at family', '🐱', 'The cat is on the bed.', ['cot', 'cut']],
    ['hat', 'short a · -at family', '🎩', 'The hat is on the cat.', ['hit', 'hot']],
    ['bat', 'short a · -at family', '🦇', 'The bat is on the hat.', ['bit', 'but']],
    ['rat', 'short a · -at family', '🐀', 'The rat is in the bag.', ['rot', 'rut']],
    ['bag', 'short a · -ag family', '👜', 'My bag is red.', ['big', 'bug']],
    ['tag', 'short a · -ag family', '🏷️', 'The tag is on the bag.', ['tug', 'tip']],
    ['rag', 'short a · -ag family', '🧽', 'The rag is in the bag.', ['rug', 'rig']],
    ['map', 'short a · -ap family', '🗺️', 'I see a map.', ['mop', 'mud']],
    ['cap', 'short a · -ap family', '🧢', 'My cap is in the bag.', ['cup', 'cop']],
    ['tap', 'short a · -ap family', '🚰', 'The tap is on the box.', ['tip', 'top']],

    // short e: -en, -et, -ed, -eg
    ['pen', 'short e · -en family', '🖊️', 'The pen is in the bag.', ['pin', 'pan']],
    ['hen', 'short e · -en family', '🐔', 'The hen has a leg.', ['ham', 'hip']],
    ['ten', 'short e · -en family', '🔟', 'I see ten pens.', ['tin', 'tan']],
    ['net', 'short e · -et family', '🥅', 'The net is in the box.', ['nut', 'not']],
    ['pet', 'short e · -et family', '🐹', 'My pet is a hen.', ['pit', 'pot']],
    ['jet', 'short e · -et family', '✈️', 'I see a jet.', ['jot', 'jut']],
    ['bed', 'short e · -ed family', '🛏️', 'My bed is red.', ['bad', 'bud']],
    ['red', 'short e · -ed family', '🔴', 'I see a red hat.', ['rid', 'rod']],
    ['leg', 'short e · -eg family', '🦵', 'The pig has a leg.', ['log', 'lag']],
    ['peg', 'short e · -eg family', '🧷', 'The peg is on the bag.', ['pig', 'pug']],

    // short i: -in, -ig, -id, -ip, -ix
    ['pin', 'short i · -in family', '📌', 'The pin is in the box.', ['pen', 'pan']],
    ['bin', 'short i · -in family', '🗑️', 'The pen is in the bin.', ['bun', 'ban']],
    ['fin', 'short i · -in family', '🦈', 'I see a fin.', ['fun', 'fan']],
    ['pig', 'short i · -ig family', '🐷', 'The pig is in the mud.', ['pug', 'peg']],
    ['dig', 'short i · -ig family', '⛏️', 'The dog can dig in the mud.', ['dog', 'dug']],
    ['wig', 'short i · -ig family', '🧑‍🦱', 'The wig is on the bed.', ['wag', 'win']],
    ['kid', 'short i · -id family', '🧒', 'The kid has a cup.', ['kit', 'bid']],
    ['lid', 'short i · -id family', '🫙', 'The lid is on the pot.', ['lad', 'lip']],
    ['lip', 'short i · -ip family', '👄', 'My lip is red.', ['lap', 'lid']],
    ['zip', 'short i · -ip family', '🤐', 'I can zip the bag.', ['zap', 'zig']],
    ['six', 'short i · -ix family', '6️⃣', 'I see six pigs.', ['sit', 'sick']],
    ['fix', 'short i · -ix family', '🔧', 'I can fix the bed.', ['fox', 'fax']],
    ['mix', 'short i · -ix family', '🥣', 'I can mix the mud.', ['max', 'mess']],

    // short o: -ot, -og, -op, -ox
    ['dot', 'short o · -ot family', '⚫', 'I see a dot on the hat.', ['dig', 'dug']],
    ['pot', 'short o · -ot family', '🍲', 'The egg is in the pot.', ['pit', 'pat']],
    ['hot', 'short o · -ot family', '🔥', 'The pot is hot.', ['hat', 'hit']],
    ['dog', 'short o · -og family', '🐶', 'The dog is on the bed.', ['dig', 'dug']],
    ['log', 'short o · -og family', '🪵', 'The log is in the mud.', ['leg', 'lag']],
    ['fog', 'short o · -og family', '🌫️', 'I see fog on the log.', ['fig', 'fun']],
    ['mop', 'short o · -op family', '🧹', 'I see a mop and a pot.', ['map', 'mud']],
    ['top', 'short o · -op family', '🔝', 'The top is on the box.', ['tap', 'tip']],
    ['hop', 'short o · -op family', '🐇', 'The hen can hop.', ['hip', 'hug']],
    ['box', 'short o · -ox family', '📦', 'The cat is in the box.', ['bag', 'fox']],
    ['fox', 'short o · -ox family', '🦊', 'The fox is on the log.', ['box', 'fix']],

    // short u: -ug, -un, -ut, -up, -ud, bus
    ['bug', 'short u · -ug family', '🐛', 'A bug is on the log.', ['bag', 'big']],
    ['mug', 'short u · -ug family', '☕', 'I see a mug.', ['mad', 'mud']],
    ['rug', 'short u · -ug family', '🧶', 'The rug is on the bed.', ['rag', 'rig']],
    ['sun', 'short u · -un family', '☀️', 'I see the sun and a kite.', ['son', 'sin']],
    ['bun', 'short u · -un family', '🥯', 'The bun is in the bag.', ['ban', 'bin']],
    ['fun', 'short u · -un family', '🎉', 'It is fun in the sun.', ['fan', 'fin']],
    ['nut', 'short u · -ut family', '🥜', 'The nut is in the cup.', ['net', 'not']],
    ['hut', 'short u · -ut family', '🛖', 'I see a hut and a pig.', ['hat', 'hit']],
    ['cut', 'short u · -ut family', '✂️', 'I can cut the rug.', ['cat', 'cot']],
    ['cup', 'short u · -up family', '🥤', 'I see a cup and an egg.', ['cap', 'cop']],
    ['pup', 'short u · -up family', '🐕', 'The pup is in the box.', ['pip', 'pop']],
    ['mud', 'short u · -ud family', '🟤', 'The pig is in the mud.', ['mad', 'mug']],
    ['bud', 'short u · -ud family', '🌱', 'The bud is on the rug.', ['bed', 'bad']],
    ['bus', 'short u · -us family', '🚌', 'I see a bus and a jeepney.', ['bun', 'bug']],
]

export const EN_LEVEL_2: FoundationalLevel = {
    id: 'english-2',
    language: 'en',
    level: 2,
    title: 'First Words & Short Vowels',
    subtitle: 'English · Level 2',
    summary: 'Learn the first little words (a, I, is, it), then read short word families like cat, hat, bat and dot, pot, hot, one vowel at a time.',
    words: wordsFromRows('en', 2, ROWS),
}
