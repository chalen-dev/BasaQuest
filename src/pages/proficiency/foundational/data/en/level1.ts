// File: src/pages/proficiency/foundational/data/en/level1.ts
// English Level 1: Letters & Sounds. A-Z in teaching order (high-use sounds
// first, look-alike letters kept apart), each with a first-sound word a
// Filipino child knows. Vowels use a SHORT-sound keyword (apple, elephant, insect,
// octopus, umbrella); x uses x-ray, which starts with the letter itself (box and fox,
// which end in the x sound, are its extra objects).
import type { FoundationalLetter, FoundationalLevel } from '../types.ts'

// [lower letter, letter name, sound, word, emoji]
type LetterRow = [string, string, string, string, string]

const ROWS: LetterRow[] = [
    ['s', 'ess', '/s/', 'sun', '☀️'],
    ['a', 'ay', '/a/', 'apple', '🍎'],
    ['t', 'tee', '/t/', 'tiger', '🐯'],
    ['i', 'eye', '/i/', 'insect', '🐛'],
    ['p', 'pee', '/p/', 'papaya', '🧡'],
    ['n', 'en', '/n/', 'nest', '🪺'],
    ['m', 'em', '/m/', 'moon', '🌙'],
    ['d', 'dee', '/d/', 'duck', '🦆'],
    ['g', 'jee', '/g/', 'goat', '🐐'],
    ['o', 'oh', '/o/', 'octopus', '🐙'],
    ['c', 'cee', '/k/', 'carabao', '🐃'],
    ['k', 'kay', '/k/', 'kite', '🪁'],
    ['e', 'ee', '/e/', 'elephant', '🐘'],
    ['u', 'yoo', '/u/', 'umbrella', '☂️'],
    ['r', 'ar', '/r/', 'rainbow', '🌈'],
    ['h', 'aitch', '/h/', 'hen', '🐔'],
    ['b', 'bee', '/b/', 'banana', '🍌'],
    ['l', 'el', '/l/', 'lemon', '🍋'],
    ['f', 'ef', '/f/', 'fish', '🐟'],
    ['j', 'jay', '/j/', 'jeepney', '🚌'],
    ['v', 'vee', '/v/', 'van', '🚐'],
    ['w', 'double-yoo', '/w/', 'watermelon', '🍉'],
    ['x', 'eks', '/ks/', 'x-ray', '🩻'],
    ['y', 'wy', '/y/', 'yo-yo', '🪀'],
    ['z', 'zee', '/z/', 'zebra', '🦓'],
    ['q', 'kyoo', '/kw/', 'queen', '👑'],
]

// More objects per letter, shown when the pupil taps the picture. Same rules as
// the main word: it starts with the letter's sound (x: x-ray, then words that end in x). Letters with
// none listed simply have one object. Add a line here to add an object; no art
// is needed (the scene falls back to the emoji).
const EXTRA_WORDS: Record<string, [string, string][]> = {
    a: [['ant', '🐜']],
    b: [['ball', '⚽']],
    c: [['cat', '🐱']],
    d: [['dog', '🐶']],
    e: [['egg', '🥚']],
    f: [['fork', '🍴']],
    g: [['guitar', '🎸']],
    h: [['hat', '🎩']],
    i: [['ink', '🖋️']],
    j: [['jacket', '🧥']],
    k: [['key', '🔑']],
    l: [['leaf', '🍃']],
    m: [['mango', '🥭']],
    n: [['nose', '👃']],
    o: [['ox', '🐂']],
    p: [['pig', '🐷']],
    r: [['rice', '🍚']],
    s: [['sock', '🧦']],
    t: [['turtle', '🐢']],
    v: [['volcano', '🌋']],
    w: [['watch', '⌚']],
    x: [['box', '📦'], ['fox', '🦊']],
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
    example_sentence: `${lower.toUpperCase()} is for ${word}.`,
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
