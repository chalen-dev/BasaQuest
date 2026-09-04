// File: src/pages/students/results/features/attemptResultsHelpers.ts
//
// Plain (non-component) helpers for AttemptResults.tsx — pulled out
// once that file grew too large. No JSX in here on purpose (mirrors
// review/features/attemptWordReviewHelpers.ts's own separation from
// component files, for the same react-refresh/only-export-components
// reason) — the one icon-picking helper that needs JSX lives in
// AttemptInsights.tsx instead, since that's its only consumer.
import type { AttemptWord } from '../../review/hooks'
import { effectiveErrorType } from '../../review/features/attemptWordReviewHelpers'
import type { RemediationWordEntry } from '../../remediation/hooks'
// Tallies each word's EFFECTIVE error type (teacher override if set,
// else the system's own — same resolution used everywhere else via
// effectiveErrorType()) and returns whichever non-'None' type occurs
// most often, plus its count and the total error count. Returns null
// when there were no errors at all — AttemptInsights.tsx's cards and
// summary sentence both fall back to a plain "no errors" message
// rather than claiming a "dominant weakness" out of zero errors.
export function computeDominantWeakness(
    words: AttemptWord[],
    manualErrorType: Record<string, AttemptWord['error_type']>
): { type: string; count: number; total: number } | null {
    const counts: Record<string, number> = {}
    let total = 0
    for (const w of words) {
        const type = effectiveErrorType(w, manualErrorType)
        if (type === 'None') continue
        counts[type] = (counts[type] ?? 0) + 1
        total += 1
    }
    if (total === 0) return null
    let dominantType = ''
    let dominantCount = 0
    for (const [type, count] of Object.entries(counts)) {
        if (count > dominantCount) {
            dominantType = type
            dominantCount = count
        }
    }
    return { type: dominantType, count: dominantCount, total }
}
// Builds the { word, errorType, count } list that gets persisted into
// remediation_materials.words on Generate — tallies by (word text,
// effective error type) pair rather than by word_index, since the same
// word appearing at two different points in the passage with the same
// error type should collapse into one entry with count 2, not two
// separate entries. Deliberately reuses effectiveErrorType() and
// whatever wordList/manualErrorType AttemptResults.tsx already has
// loaded, so this can never disagree with computeDominantWeakness()
// above about what counts as an error. Sorted by count desc
// (most-repeated problem word first), then alphabetically.
export function buildRemediationWordEntries(
    words: AttemptWord[],
    manualErrorType: Record<string, AttemptWord['error_type']>
): { entries: RemediationWordEntry[]; total: number } {
    const tallies = new Map<string, RemediationWordEntry>()
    let total = 0
    for (const w of words) {
        const type = effectiveErrorType(w, manualErrorType)
        if (type === 'None') continue
        const wordText = w.reference_word ?? w.recognized_word ?? ''
        const key = `${wordText.toLowerCase()}::${type}`
        const existing = tallies.get(key)
        if (existing) {
            existing.count += 1
        } else {
            // practiced starts false — a freshly generated piece of
            // material has never been drilled yet.
            tallies.set(key, { word: wordText, errorType: type as RemediationWordEntry['errorType'], count: 1, practiced: false })
        }
        total += 1
    }
    const entries = Array.from(tallies.values()).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    return { entries, total }
}