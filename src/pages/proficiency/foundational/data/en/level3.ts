// File: src/pages/proficiency/foundational/data/en/level3.ts
// English Level 3: digraphs, then blends. Every word is decodable with the
// short vowels from Level 2 (no vowel teams or silent letters), so a child can
// sound it out.
//  - digraphs (sh, ch, th): two letters, ONE sound
//  - blends (st, fl, cr ...): two letters, TWO sounds said quickly together
// th words all use the unvoiced sound (bath, path, math, thin).
import { wordsFromRows, type FoundationalLevel, type WordRow } from '../types.ts'

const ROWS: WordRow[] = [
    // digraphs
    ['ship', 'sh digraph', '🚢', 'The ship is red.', ['chip', 'sip']],
    ['shop', 'sh digraph', '🏪', 'The kid is in the shop.', ['chop', 'stop']],
    ['shell', 'sh digraph', '🐚', 'I see a shell in the mud.', ['sell', 'bell']],
    ['dish', 'sh digraph', '🍽️', 'The fish is on the dish.', ['fish', 'wish']],
    ['chip', 'ch digraph', '🍟', 'The chip is in the dish.', ['ship', 'chop']],
    ['chick', 'ch digraph', '🐤', 'The chick is in the nest.', ['thick', 'click']],
    ['chat', 'ch digraph', '💬', 'The pig and the hen chat.', ['that', 'cat']],
    ['chop', 'ch digraph', '🪓', 'I can chop the log.', ['shop', 'chip']],
    ['bath', 'th digraph', '🛁', 'The dog is in the bath.', ['math', 'bat']],
    ['path', 'th digraph', '🛤️', 'The pig is on the path.', ['pat', 'math']],
    ['thin', 'th digraph', '📏', 'The pen is thin.', ['tin', 'thick']],
    ['math', 'th digraph', '🔢', 'My pen is for math.', ['bath', 'mat']],
    // blends
    ['stop', 'st blend', '🛑', 'The bus can stop.', ['shop', 'step']],
    ['step', 'st blend', '👣', 'The cat is on the step.', ['stop', 'stem']],
    ['stick', 'st blend', '🥢', 'The dog has a stick.', ['thick', 'stack']],
    ['stamp', 'st blend', '📮', 'The stamp is on the box.', ['stump', 'camp']],
    ['flag', 'fl blend', '🚩', 'The flag is red.', ['flap', 'flat']],
    ['plug', 'pl blend', '🔌', 'The plug is in the box.', ['plum', 'slug']],
    ['snack', 'sn blend', '🍿', 'The snack is in my bag.', ['snake', 'snap']],
    ['crab', 'cr blend', '🦀', 'The crab is in the shell.', ['grab', 'crib']],
    ['drum', 'dr blend', '🥁', 'The kid has a drum.', ['dram', 'crumb']],
    ['drip', 'dr blend', '💧', 'The cup can drip.', ['trip', 'drop']],
    ['frog', 'fr blend', '🐸', 'The frog is on the log.', ['from', 'flog']],
    ['grin', 'gr blend', '😁', 'The kid has a grin.', ['grip', 'green']],
    ['truck', 'tr blend', '🚚', 'I see a truck and a bus.', ['track', 'trick']],
    ['clap', 'cl blend', '👏', 'The kid can clap.', ['flap', 'clip']],
    ['clock', 'cl blend', '🕐', 'The clock is on the box.', ['block', 'click']],
    ['block', 'bl blend', '🧱', 'The block is on the bed.', ['clock', 'black']],
    ['black', 'bl blend', '⚫', 'The cat is black.', ['block', 'slack']],
    ['swim', 'sw blend', '🏊', 'The duck can swim.', ['slim', 'swam']],
]

export const EN_LEVEL_3: FoundationalLevel = {
    id: 'english-3',
    language: 'en',
    level: 3,
    title: 'Blends & Digraphs',
    subtitle: 'English · Level 3',
    summary: 'Read words with sh, ch and th (one sound), then st, fl, cr and other blends (two sounds).',
    words: wordsFromRows('en', 3, ROWS),
}
