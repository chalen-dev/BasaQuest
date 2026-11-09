// File: src/pages/proficiency/foundational/data/types.ts
// Shapes for the Foundational Words & Sounds content. Content lives in the
// per-language folders next to this file (en/level1.ts ... en/level5.ts); the
// UI only reads it through levels.ts, so a new level or language is a new data
// file plus one line in levels.ts.

export type FoundationalLanguage = 'en' | 'fil'

export type FoundationalWord = {
    id: string
    language: FoundationalLanguage
    level: number
    word: string
    // e.g. "short a", "sh", "silent e", "sight word"
    phonics_focus: string
    // An emoji for now; can become an image path later without changing the shape.
    image: string
    // Path to a recorded clip. Empty until audio exists; the UI must tolerate ''.
    audio: string
    example_sentence: string
    // 2-3 wrong choices for matching / "pick the right word" exercises.
    distractors: string[]
}

// Level 1 entries are one per letter: the usual word fields describe the
// first-sound word, plus the letter itself.
export type FoundationalLetter = FoundationalWord & {
    upper: string
    lower: string
    letter_name: string
    letter_sound: string
    // More objects for the same letter (the scene shows them when the pupil
    // taps the picture). A word with no drawing in the scene shows its emoji,
    // so adding one here needs no artwork.
    extra_words?: { word: string; image: string }[]
}

export type FoundationalSentence = {
    id: string
    language: FoundationalLanguage
    level: number
    text: string
    phonics_focus: string
    image: string
    audio: string
}

export type FoundationalLevel = {
    // Route id: /reading/proficiency/foundational/:id
    id: string
    language: FoundationalLanguage
    level: number
    title: string
    subtitle: string
    // One-line description of what the level teaches.
    summary: string
    words: FoundationalWord[]
    letters?: FoundationalLetter[]
    sentences?: FoundationalSentence[]
}

// Compact row used by the data files: [word, phonics_focus, image, example_sentence, distractors]
export type WordRow = [string, string, string, string, string[]]

export function wordsFromRows(language: FoundationalLanguage, level: number, rows: WordRow[]): FoundationalWord[] {
    return rows.map(([word, phonics_focus, image, example_sentence, distractors]) => ({
        id: `${language}-l${level}-${word.toLowerCase().replace(/[^a-z]+/g, '-')}`,
        language,
        level,
        word,
        phonics_focus,
        image,
        audio: '',
        example_sentence,
        distractors,
    }))
}
