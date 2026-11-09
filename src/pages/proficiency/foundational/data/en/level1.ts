// File: src/pages/proficiency/foundational/data/en/level1.ts
// English Level 1: Letters & Sounds. A-Z, each with a first-sound word a
// Filipino child knows.
import type { FoundationalLetter, FoundationalLevel } from '../types.ts'

// [lower letter, letter name, sound, word, emoji, distractors]
type LetterRow = [string, string, string, string, string, string[]]

const ROWS: LetterRow[] = [
    ['a', 'ay', '/a/', 'apple', '🍎', ['ball', 'cat']],
    ['b', 'bee', '/b/', 'banana', '🍌', ['apple', 'duck']],
    ['c', 'cee', '/k/', 'carabao', '🐃', ['banana', 'egg']],
    ['d', 'dee', '/d/', 'duck', '🦆', ['fish', 'goat']],
    ['e', 'ee', '/e/', 'egg', '🥚', ['duck', 'hen']],
    ['f', 'ef', '/f/', 'fish', '🐟', ['egg', 'goat']],
    ['g', 'jee', '/g/', 'goat', '🐐', ['fish', 'hen']],
    ['h', 'aitch', '/h/', 'hen', '🐔', ['goat', 'ice']],
    ['i', 'eye', '/i/', 'ice', '🧊', ['hen', 'jeepney']],
    ['j', 'jay', '/j/', 'jeepney', '🚌', ['ice', 'kite']],
    ['k', 'kay', '/k/', 'kite', '🪁', ['jeepney', 'lemon']],
    ['l', 'el', '/l/', 'lemon', '🍋', ['kite', 'mango']],
    ['m', 'em', '/m/', 'mango', '🥭', ['lemon', 'nest']],
    ['n', 'en', '/n/', 'nest', '🪺', ['mango', 'owl']],
    ['o', 'oh', '/o/', 'owl', '🦉', ['nest', 'papaya']],
    ['p', 'pee', '/p/', 'papaya', '🧡', ['owl', 'queen']],
    ['q', 'kyoo', '/kw/', 'queen', '👑', ['papaya', 'rice']],
    ['r', 'ar', '/r/', 'rice', '🍚', ['queen', 'sampaguita']],
    ['s', 'ess', '/s/', 'sampaguita', '🌼', ['rice', 'tricycle']],
    ['t', 'tee', '/t/', 'tricycle', '🛺', ['sampaguita', 'umbrella']],
    ['u', 'yoo', '/u/', 'umbrella', '☂️', ['tricycle', 'van']],
    ['v', 'vee', '/v/', 'van', '🚐', ['umbrella', 'watermelon']],
    ['w', 'double-yoo', '/w/', 'watermelon', '🍉', ['van', 'xylophone']],
    ['x', 'eks', '/ks/', 'xylophone', '🎶', ['watermelon', 'yo-yo']],
    ['y', 'wy', '/y/', 'yo-yo', '🪀', ['xylophone', 'zebra']],
    ['z', 'zee', '/z/', 'zebra', '🦓', ['yo-yo', 'apple']],
]

const letters: FoundationalLetter[] = ROWS.map(([lower, letter_name, letter_sound, word, image, distractors]) => ({
    id: `en-l1-${lower}`,
    language: 'en',
    level: 1,
    word,
    phonics_focus: `letter ${lower.toUpperCase()}`,
    image,
    audio: '',
    example_sentence: `${lower.toUpperCase()} is for ${word}.`,
    distractors,
    upper: lower.toUpperCase(),
    lower,
    letter_name,
    letter_sound,
}))

export const EN_LEVEL_1: FoundationalLevel = {
    id: 'letters-en',
    language: 'en',
    level: 1,
    title: 'Letters & Sounds',
    subtitle: 'English · Level 1',
    summary: 'Learn the 26 letters, their names and their sounds.',
    words: letters,
    letters,
}
