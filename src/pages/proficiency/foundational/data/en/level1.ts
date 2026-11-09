// File: src/pages/proficiency/foundational/data/en/level1.ts
// English Level 1: Letters & Sounds. A-Z in teaching order (high-use sounds
// first, look-alike letters kept apart), each with a first-sound word a
// Filipino child knows. Vowels use a SHORT-sound keyword (apple, egg, ink, ox,
// umbrella); x uses a word that ENDS in x, since x is rarely heard at
// the start of a word.
import type { FoundationalLetter, FoundationalLevel } from '../types.ts'

// [lower letter, letter name, sound, word, emoji]
type LetterRow = [string, string, string, string, string]

const ROWS: LetterRow[] = [
    ['s', 'ess', '/s/', 'sun', '☀️'],
    ['a', 'ay', '/a/', 'apple', '🍎'],
    ['t', 'tee', '/t/', 'tiger', '🐯'],
    ['i', 'eye', '/i/', 'ink', '🖋️'],
    ['p', 'pee', '/p/', 'papaya', '🧡'],
    ['n', 'en', '/n/', 'nest', '🪺'],
    ['m', 'em', '/m/', 'mango', '🥭'],
    ['d', 'dee', '/d/', 'duck', '🦆'],
    ['g', 'jee', '/g/', 'goat', '🐐'],
    ['o', 'oh', '/o/', 'ox', '🐂'],
    ['c', 'cee', '/k/', 'carabao', '🐃'],
    ['k', 'kay', '/k/', 'kite', '🪁'],
    ['e', 'ee', '/e/', 'egg', '🥚'],
    ['u', 'yoo', '/u/', 'umbrella', '☂️'],
    ['r', 'ar', '/r/', 'rice', '🍚'],
    ['h', 'aitch', '/h/', 'hen', '🐔'],
    ['b', 'bee', '/b/', 'banana', '🍌'],
    ['l', 'el', '/l/', 'lemon', '🍋'],
    ['f', 'ef', '/f/', 'fish', '🐟'],
    ['j', 'jay', '/j/', 'jeepney', '🚌'],
    ['v', 'vee', '/v/', 'van', '🚐'],
    ['w', 'double-yoo', '/w/', 'watermelon', '🍉'],
    ['x', 'eks', '/ks/', 'box', '📦'],
    ['y', 'wy', '/y/', 'yo-yo', '🪀'],
    ['z', 'zee', '/z/', 'zebra', '🦓'],
    ['q', 'kyoo', '/kw/', 'queen', '👑'],
]

// More objects per letter, shown when the pupil taps the picture. Same rules as
// the main word: it starts with the letter's sound (x: ends in x). Letters with
// none listed simply have one object. Add a line here to add an object; no art
// is needed (the scene falls back to the emoji).
const EXTRA_WORDS: Record<string, [string, string][]> = {
    a: [['ant', '🐜']],
    b: [['ball', '⚽']],
    c: [['cat', '🐱']],
    d: [['dog', '🐶']],
    e: [['elephant', '🐘']],
    f: [['fork', '🍴']],
    g: [['guitar', '🎸']],
    h: [['hat', '🎩']],
    i: [['insect', '🐛']],
    j: [['jacket', '🧥']],
    k: [['key', '🔑']],
    l: [['leaf', '🍃']],
    m: [['moon', '🌙']],
    n: [['nose', '👃']],
    o: [['octopus', '🐙']],
    p: [['pig', '🐷']],
    r: [['rainbow', '🌈']],
    s: [['sock', '🧦']],
    t: [['turtle', '🐢']],
    v: [['volcano', '🌋']],
    w: [['watch', '⌚']],
    x: [['fox', '🦊']],
    y: [['yam', '🍠']],
    z: [['zero', '0️⃣']],
}

// Wrong choices for "which picture starts with this sound": two words whose
// letters make a different sound, taken from further along the list so they
// are not look-alikes of the right answer.
function distractorsFor(index: number): string[] {
    const own = ROWS[index]
    const picked: string[] = []
    for (let step = 3; picked.length < 2 && step < ROWS.length; step += 1) {
        const other = ROWS[(index + step) % ROWS.length]
        if (other[2] !== own[2] && !picked.includes(other[3])) picked.push(other[3])
    }
    return picked
}

const letters: FoundationalLetter[] = ROWS.map(([lower, letter_name, letter_sound, word, image], index) => ({
    id: `en-l1-${lower}`,
    language: 'en',
    level: 1,
    word,
    phonics_focus: `letter ${lower.toUpperCase()}`,
    image,
    audio: '',
    example_sentence: lower === 'x' ? 'X is at the end of box.' : `${lower.toUpperCase()} is for ${word}.`,
    distractors: distractorsFor(index),
    upper: lower.toUpperCase(),
    lower,
    letter_name,
    letter_sound,
    extra_words: (EXTRA_WORDS[lower] ?? []).map(([extraWord, extraImage]) => ({ word: extraWord, image: extraImage })),
}))

export const EN_LEVEL_1: FoundationalLevel = {
    id: 'letters-en',
    language: 'en',
    level: 1,
    title: 'Letters & Sounds',
    subtitle: 'English · Level 1',
    summary: 'Learn the 26 letters, their sounds and their names.',
    words: letters,
    letters,
}
