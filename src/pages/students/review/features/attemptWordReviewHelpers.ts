// File: src/pages/students/review/features/attemptWordReviewHelpers.ts
//
// Plain (non-component) helpers shared between PassageCard and
// WordListCard: the error-type color map, the effective-error-type
// resolver, and the tooltip string builder. Kept out of
// AttemptWordReviewShared.tsx on purpose — mixing plain
// function/constant exports with component exports in one file breaks
// Fast Refresh (react-refresh/only-export-components).
import type { AttemptWord } from '../hooks'
import type { AttemptWordReviewStrings } from './attemptWordReviewStrings'

export const ERROR_TYPE_COLOR: Record<AttemptWord['error_type'], string> = {
    None: 'bg-gray-900/5 text-gray-600 dark:bg-gray-100/10 dark:text-gray-300',
    Omission: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    Insertion: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    Mispronunciation: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
}

// A teacher can manually reclassify a MISCUE word as Omission or
// Mispronunciation (see the type picker in WordListCard) — this
// resolves that override, falling back to whatever the system detected
// when there's no override yet. Insertion is never in the override map
// (the type picker doesn't offer it — an Insertion row represents an
// extra recognized word with no reference-word slot to reclassify), so
// it always just passes through as-is.
export function effectiveErrorType(
    w: AttemptWord,
    manualErrorType: Record<string, AttemptWord['error_type']>
): AttemptWord['error_type'] {
    return manualErrorType[w.id] ?? w.error_type
}

export function wordTooltip(w: AttemptWord, t: AttemptWordReviewStrings, errorType: AttemptWord['error_type']): string {
    const parts: string[] = [errorType]
    if (errorType === 'Insertion') {
        parts.push(t.inserted)
    } else if (w.recognized_word && w.recognized_word !== w.reference_word) {
        parts.push(t.recognizedAs(w.recognized_word))
    }
    if (w.accuracy_score != null) parts.push(`${Math.round(w.accuracy_score)}`)
    return parts.join(' · ')
}