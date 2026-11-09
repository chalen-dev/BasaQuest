// File: src/pages/proficiency/foundational/data/en/level3.ts
// English Level 3: blends and digraphs.
import { wordsFromRows, type FoundationalLevel, type WordRow } from '../types.ts'

const ROWS: WordRow[] = [
    ['ship', 'sh', '🚢', 'The ship is blue.', ['chip', 'sip']],
    ['shell', 'sh', '🐚', 'I see a shell in the mud.', ['bell', 'sell']],
    ['dish', 'sh', '🍽️', 'The fish is on the dish.', ['dig', 'wish']],
    ['shop', 'sh', '🏪', 'The kid is in the shop.', ['chop', 'stop']],
    ['chair', 'ch', '🪑', 'The cat is on the chair.', ['hair', 'stair']],
    ['chick', 'ch', '🐤', 'The chick is in the nest.', ['thick', 'click']],
    ['cherry', 'ch', '🍒', 'The cherry is red.', ['berry', 'merry']],
    ['thumb', 'th', '👍', 'The kid has a thumb.', ['thump', 'plumb']],
    ['bath', 'th', '🛁', 'The dog is in the bath.', ['math', 'path']],
    ['think', 'th', '💭', 'I think of a mango.', ['thank', 'thing']],
    ['star', 'st', '⭐', 'I see a star and a kite.', ['scar', 'stir']],
    ['stop', 'st', '🛑', 'The bus can stop.', ['shop', 'step']],
    ['stick', 'st', '🥢', 'The dog has a stick.', ['thick', 'click']],
    ['stamp', 'st', '📮', 'The stamp is on the box.', ['camp', 'lamp']],
    ['blue', 'bl', '🔵', 'My bag is blue.', ['glue', 'clue']],
    ['block', 'bl', '🧱', 'The block is on the bed.', ['clock', 'black']],
    ['black', 'bl', '⚫', 'The cat is black.', ['block', 'slack']],
    ['crab', 'cr', '🦀', 'The crab is in the shell.', ['grab', 'drab']],
    ['crown', 'cr', '👑', 'The queen has a crown.', ['clown', 'brown']],
    ['green', 'gr', '🟢', 'The grass is green.', ['queen', 'greet']],
    ['grass', 'gr', '🌱', 'The goat is on the grass.', ['glass', 'class']],
    ['flag', 'fl', '🚩', 'The flag is red.', ['flat', 'flap']],
    ['flower', 'fl', '🌸', 'The sampaguita is a flower.', ['flour', 'lower']],
    ['plant', 'pl', '🪴', 'The plant is in the pot.', ['plan', 'slant']],
    ['plug', 'pl', '🔌', 'The plug is in the box.', ['slug', 'plum']],
    ['snail', 'sn', '🐌', 'The snail is on the plant.', ['nail', 'sail']],
    ['spoon', 'sp', '🥄', 'The spoon is in the dish.', ['moon', 'soon']],
    ['spider', 'sp', '🕷️', 'The spider is in the box.', ['cider', 'slider']],
    ['truck', 'tr', '🚚', 'I see a truck and a bus.', ['track', 'trick']],
    ['drum', 'dr', '🥁', 'The kid has a drum.', ['drug', 'crumb']],
]

export const EN_LEVEL_3: FoundationalLevel = {
    id: 'english-3',
    language: 'en',
    level: 3,
    title: 'Blends & Digraphs',
    subtitle: 'English · Level 3',
    summary: 'Read words that start with sh, ch, th, st, bl, cr and other letter pairs.',
    words: wordsFromRows('en', 3, ROWS),
}
