// File: src/pages/students/review/features/AttemptWordReviewShared.tsx
//
// Small presentational COMPONENTS shared between PassageCard and
// WordListCard: a score pill, a legend swatch, and the
// Omission/Mispronunciation corner icon. This file exports components
// ONLY — the plain constant/function helpers (ERROR_TYPE_COLOR,
// wordTooltip) live in attemptWordReviewHelpers.ts instead, because
// mixing the two export kinds in one file breaks Fast Refresh
// (react-refresh/only-export-components).
import { Ear, MinusCircle } from 'lucide-react'
import type { AttemptWord } from '../hooks'

export function ScorePill({ label, value }: { label: string; value: number | null }) {
    if (value == null) return null
    return (
        <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-bold text-gray-700 dark:bg-gray-100/10 dark:text-gray-300">
            {label}: {Math.round(value)}
        </span>
    )
}

export function LegendSwatch({ colorClass, label }: { colorClass: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <span className={`inline-block h-3 w-3 rounded-full ${colorClass}`} />
            {label}
        </span>
    )
}

// Secondary cue for error type — deliberately NOT a color, since the
// word's background color is already reserved for the verdict
// (correct/miscue) and piling a third color meaning on top of that
// would make the background ambiguous. Insertion already has its own
// dashed-border cue, so it's not repeated here.
export function ErrorTypeIcon({ errorType }: { errorType: AttemptWord['error_type'] }) {
    if (errorType === 'Omission') return <MinusCircle size={10} strokeWidth={2.5} />
    if (errorType === 'Mispronunciation') return <Ear size={10} strokeWidth={2.5} />
    return null
}