// File: src/pages/proficiency/foundational/data/fil/level1.ts
// Filipino Level 1: Mga Titik at Tunog. The Abakada, 20 letters in the usual
// order (A B K D E G H I L M N NG O P R S T U W Y), each with a first-sound word
// a Filipino child knows. NG is a letter of its own here and keeps its place
// between N and O. The borrowed letters of the 28-letter alphabet (C F J Ñ Q V X Z)
// are not part of this level; they can be added later as more rows.
import type { FoundationalLetter, FoundationalLevel } from '../types.ts'

// [lower letter, letter name, sound, word, emoji]
type LetterRow = [string, string, string, string, string]

const ROWS: LetterRow[] = [
    ['a', 'a', '/a/', 'aso', '🐶'],
    ['b', 'ba', '/b/', 'bola', '⚽'],
    ['k', 'ka', '/k/', 'kabayo', '🐴'],
    ['d', 'da', '/d/', 'dahon', '🍃'],
    ['e', 'e', '/e/', 'eroplano', '✈️'],
    ['g', 'ga', '/g/', 'gatas', '🥛'],
    ['h', 'ha', '/h/', 'hipon', '🦐'],
    ['i', 'i', '/i/', 'isda', '🐟'],
    ['l', 'la', '/l/', 'lobo', '🎈'],
    ['m', 'ma', '/m/', 'mangga', '🥭'],
    ['n', 'na', '/n/', 'niyog', '🥥'],
    ['ng', 'nga', '/ng/', 'ngipin', '🦷'],
    ['o', 'o', '/o/', 'orasan', '🕰️'],
    ['p', 'pa', '/p/', 'pusa', '🐱'],
    ['r', 'ra', '/r/', 'radyo', '📻'],
    ['s', 'sa', '/s/', 'saging', '🍌'],
    ['t', 'ta', '/t/', 'tubig', '💧'],
    ['u', 'u', '/u/', 'ulan', '🌧️'],
    ['w', 'wa', '/w/', 'walis', '🧹'],
    ['y', 'ya', '/y/', 'yelo', '🧊'],
]

// More objects per letter, shown when the pupil taps the picture. Same rule as the
// main word: it starts with the letter's sound. Add a line to add an object; no art
// is needed (the scene shows the Word Pictures image, else the emoji).
const EXTRA_WORDS: Record<string, [string, string][]> = {
    a: [['ahas', '🐍'], ['araw', '☀️']],
    b: [['bahay', '🏠'], ['baboy', '🐷'], ['bibe', '🦆']],
    k: [['kamote', '🍠'], ['kandila', '🕯️'], ['kuting', '🐈']],
    d: [['daga', '🐭'], ['damit', '👕'], ['dila', '👅']],
    e: [['elepante', '🐘'], ['eskwela', '🏫']],
    g: [['gitara', '🎸'], ['gunting', '✂️'], ['gagamba', '🕷️']],
    h: [['hari', '🤴'], ['hagdan', '🪜'], ['halaman', '🌱']],
    i: [['ibon', '🐦'], ['itlog', '🥚'], ['ilaw', '💡']],
    l: [['lapis', '✏️'], ['langgam', '🐜'], ['leon', '🦁']],
    m: [['manok', '🐔'], ['mata', '👁️'], ['mansanas', '🍎']],
    n: [['nanay', '👩'], ['nars', '🧑‍⚕️']],
    ng: [['ngiti', '😊']],
    o: [['oso', '🐻'], ['ospital', '🏥']],
    p: [['puso', '❤️'], ['payong', '☂️'], ['pato', '🦆']],
    r: [['rosas', '🌹'], ['relo', '⌚'], ['regalo', '🎁']],
    s: [['sapatos', '👟'], ['silya', '🪑'], ['susi', '🔑']],
    t: [['tinapay', '🍞'], ['tatay', '👨'], ['tuta', '🐕']],
    u: [['uod', '🐛'], ['unan', '🛏️']],
    w: [['watawat', '🇵🇭'], ['walo', '8️⃣']],
    y: [['yoyo', '🪀'], ['yakap', '🤗']],
}

// Wrong choices for "which picture starts with this sound": two words whose letters
// make a different sound, taken from further along the list.
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
    id: `fil-l1-${lower}`,
    language: 'fil',
    level: 1,
    word,
    phonics_focus: `titik ${lower.toUpperCase()}`,
    image,
    audio: '',
    example_sentence: `Ang ${lower.toUpperCase()} ay para sa ${word}.`,
    distractors: distractorsFor(index),
    upper: lower.toUpperCase(),
    lower,
    letter_name,
    letter_sound,
    extra_words: (EXTRA_WORDS[lower] ?? []).map(([extraWord, extraImage]) => ({ word: extraWord, image: extraImage })),
}))

export const FIL_LEVEL_1: FoundationalLevel = {
    id: 'letters-fil',
    language: 'fil',
    level: 1,
    title: 'Mga Titik at Tunog',
    subtitle: 'Filipino · Antas 1',
    summary: 'Alamin ang 20 titik ng Abakada at ang kanilang mga tunog.',
    words: letters,
    letters,
}
