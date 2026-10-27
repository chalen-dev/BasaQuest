// File: src/lib/passageDifficulty.ts
// A rough 1-5 difficulty rating for a reading passage, and whether it fits a
// pupil's grade. Pure functions, so the teacher's review screen can re-rate a
// passage live as it is edited.
//
// It is an ESTIMATE from two things: how long the sentences are, and how many
// long words there are. It cannot judge vocabulary or topic, so the teacher's
// own reading of the passage always has the last word. (The usual English
// readability formulas were tried first and rated ordinary Filipino text far
// too hard, because Filipino words are longer. Sentence length separates the
// grades cleanly in both languages, so it leads here, and "long" means a
// longer word for Filipino than for English.)

export type Difficulty = 1 | 2 | 3 | 4 | 5

type Lang = 'en' | 'fil'

const LONG_WORD_LETTERS: Record<Lang, number> = { en: 7, fil: 9 }

// Stars a passage is expected to land on for each grade, matching the word
// counts and sentence lengths generate-passage asks for.
const EXPECTED_STARS: Record<number, [Difficulty, Difficulty]> = {
    1: [1, 2],
    2: [1, 2],
    3: [2, 3],
    4: [2, 3],
    5: [3, 4],
    6: [3, 4],
}

const WORD = /[\p{L}\p{N}']+/gu

export function countWords(text: string): number {
    return (text.match(WORD) ?? []).length
}

// Average words per sentence plus a bonus for the share of long words.
export function complexityScore(text: string, lang: Lang): number {
    const words = text.match(WORD) ?? []
    if (words.length === 0) return 0
    const sentences = Math.max(1, text.split(/[.!?]+/).filter((s) => /[\p{L}\p{N}]/u.test(s)).length)
    const longShare = words.filter((w) => w.length >= LONG_WORD_LETTERS[lang]).length / words.length
    return words.length / sentences + 20 * longShare
}

export function rateDifficulty(text: string, lang: Lang): Difficulty {
    const score = complexityScore(text, lang)
    if (score < 8) return 1
    if (score < 12) return 2
    if (score < 16) return 3
    if (score < 20) return 4
    return 5
}

// The star level suggested when a teacher is asked to pick one for a pupil's
// grade: inside that grade's expected band (grades 1 and 2 differ so a Grade 2
// pupil isn't given a Grade 1 reading).
const SUGGESTED_STARS: Record<number, Difficulty> = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 4 }

export function suggestedStars(grade: number): Difficulty {
    return SUGGESTED_STARS[Math.min(6, Math.max(1, Math.round(grade)))]
}

export type GradeFit = 'easier' | 'fits' | 'harder'

// Whether a rating suits the pupil's grade: easier or harder than the usual
// band for it.
export function gradeFit(stars: Difficulty, grade: number): GradeFit {
    const [low, high] = EXPECTED_STARS[Math.min(6, Math.max(1, Math.round(grade)))]
    return stars < low ? 'easier' : stars > high ? 'harder' : 'fits'
}
