// File: src/lib/pictureSense.ts
// Choosing the right picture when a word has several meanings or sits inside a
// phrase. Pure functions only (no database), so they can be tested alone; the
// lookup that uses them is src/hooks/useWordImage.ts.

// Same normalization pronounce-word's slugify() uses, so a passage token
// like "mangga," finds the stored "mangga".
export function normalizeImageWord(word: string): string {
    return word
        .toLowerCase()
        .replace(/[^\p{L}\p{N}']/gu, '')
        .replace(/'/g, '')
        .trim()
}

// Longest phrase looked for around the tapped word, and how many words either
// side count as "near" for cue words.
const MAX_PHRASE_WORDS = 4
const CUE_WINDOW = 10

// What surrounds the tapped word in the page: every phrase (2 to 4 words)
// that contains it, longest first, and the set of words near it. Phrases are
// the normalized words joined by single spaces, as the bank stores them.
export function contextAround(key: string, context: string[] | undefined) {
    const tokens = (context ?? []).map(normalizeImageWord).filter(Boolean)
    const phrases = new Set<string>()
    const nearby = new Set<string>()
    tokens.forEach((token, i) => {
        if (token !== key) return
        for (let from = Math.max(0, i - MAX_PHRASE_WORDS + 1); from <= i; from++) {
            for (let to = Math.max(i, from + 1); to < Math.min(tokens.length, from + MAX_PHRASE_WORDS); to++) {
                phrases.add(tokens.slice(from, to + 1).join(' '))
            }
        }
        for (let j = Math.max(0, i - CUE_WINDOW); j <= Math.min(tokens.length - 1, i + CUE_WINDOW); j++) {
            if (j !== i) nearby.add(tokens[j])
        }
    })
    const byLength = (a: string, b: string) => b.split(' ').length - a.split(' ').length
    return { phrases: [...phrases].sort(byLength), nearby: [...nearby] }
}

// One row: use it. Several: the sense with the most cue words nearby, then the
// one marked default, otherwise none (a wrong picture is worse than no picture).
export function pickPicture<T extends { cues: string[]; is_default: boolean }>(rows: T[], nearby: string[]): T | null {
    return explainPick(rows, nearby).pick
}

export type PickReason = 'only' | 'cues' | 'default' | 'none'

// Same choice as pickPicture, plus why: which cue words each row matched. The
// admin cue-word tester shows this so a wrong pick can be traced to its cues.
export function explainPick<T extends { cues: string[]; is_default: boolean }>(
    rows: T[],
    nearby: string[],
): { pick: T | null; reason: PickReason; matches: { row: T; matched: string[] }[] } {
    const near = new Set(nearby)
    const matches = rows.map((row) => ({ row, matched: row.cues.filter((cue) => near.has(cue)) }))
    if (rows.length === 0) return { pick: null, reason: 'none', matches }
    if (rows.length === 1) return { pick: rows[0], reason: 'only', matches }
    let best: T | null = null
    let bestScore = 0
    for (const { row, matched } of matches) {
        const score = matched.length
        if (score > bestScore || (score > 0 && score === bestScore && row.is_default && !best?.is_default)) {
            best = row
            bestScore = score
        }
    }
    if (best) return { pick: best, reason: 'cues', matches }
    const fallback = rows.find((row) => row.is_default) ?? null
    return { pick: fallback, reason: fallback ? 'default' : 'none', matches }
}
