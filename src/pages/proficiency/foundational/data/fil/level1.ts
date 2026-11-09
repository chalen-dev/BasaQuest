// File: src/pages/proficiency/foundational/data/fil/level1.ts
// Filipino Level 1: Mga Titik at Tunog. The 28-letter Filipino alphabet in order
// (A B C D E F G H I J K L M N Ñ NG O P Q R S T U V W X Y Z), each with a first-sound
// word a Filipino child knows. Ñ and NG are letters of their own. The borrowed letters
// (C F J Ñ Q V X Z) use common loanwords. Ñ is the one letter taught from INSIDE its
// word (piña), as X is in English, so its sentence says "nasa" instead of "para sa".
import type { FoundationalLetter, FoundationalLevel } from '../types.ts'

// [lower letter, letter name, sound, word, emoji]
type LetterRow = [string, string, string, string, string]

const ROWS: LetterRow[] = [
    ['a', 'ey', '/a/', 'aso', '🐶'],
    ['b', 'bi', '/b/', 'bola', '⚽'],
    ['c', 'si', '/k/', 'computer', '💻'],
    ['d', 'di', '/d/', 'dahon', '🍃'],
    ['e', 'i', '/e/', 'eroplano', '✈️'],
    ['f', 'ef', '/f/', 'fiesta', '🎉'],
    ['g', 'dyi', '/g/', 'gatas', '🥛'],
    ['h', 'eyts', '/h/', 'hipon', '🦐'],
    ['i', 'ay', '/i/', 'isda', '🐟'],
    ['j', 'dyey', '/j/', 'jeepney', '🚌'],
    ['k', 'key', '/k/', 'kabayo', '🐴'],
    ['l', 'el', '/l/', 'lobo', '🎈'],
    ['m', 'em', '/m/', 'mangga', '🥭'],
    ['n', 'en', '/n/', 'niyog', '🥥'],
    ['ñ', 'enye', '/ny/', 'piña', '🍍'],
    ['ng', 'enji', '/ng/', 'ngipin', '🦷'],
    ['o', 'o', '/o/', 'orasan', '🕰️'],
    ['p', 'pi', '/p/', 'pusa', '🐱'],
    ['q', 'kyu', '/k/', 'queso', '🧀'],
    ['r', 'ar', '/r/', 'radyo', '📻'],
    ['s', 'es', '/s/', 'saging', '🍌'],
    ['t', 'ti', '/t/', 'tubig', '💧'],
    ['u', 'yu', '/u/', 'ulan', '🌧️'],
    ['v', 'vi', '/v/', 'video', '📹'],
    ['w', 'dobolyu', '/w/', 'walis', '🧹'],
    ['x', 'eks', '/ks/', 'x-ray', '🩻'],
    ['y', 'way', '/y/', 'yelo', '🧊'],
    ['z', 'zi', '/z/', 'zebra', '🦓'],
]

// More objects per letter, shown when the pupil taps the picture. Same rule as the
// main word: it starts with the letter's sound. Add a line to add an object; no art
// is needed (the scene shows the Word Pictures image, else the emoji).
const EXTRA_WORDS: Record<string, [string, string][]> = {
    c: [['cake', '🎂']],
    f: [['flashlight', '🔦'], ['foto', '📷']],
    j: [['jacket', '🧥']],
    'ñ': [['niño', '👦'], ['señora', '👩']],
    v: [['van', '🚐'], ['violin', '🎻']],
    z: [['zero', '0️⃣']],
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
    example_sentence: word.startsWith(lower)
        ? `Ang ${lower.toUpperCase()} ay para sa ${word}.`
        : `Ang ${lower.toUpperCase()} ay nasa ${word}.`,
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
    summary: 'Alamin ang 28 titik ng alpabetong Filipino at ang kanilang mga tunog.',
    words: letters,
    letters,
}
