// File: AttemptWordReviewShared.tsx
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
// Secondary cue for error type — deliberately NOT a color on the WORD's
// background (that's reserved for the verdict, correct/miscue), but the
// ICON ITSELF now carries its own explicit rose/orange color (matching
// ERROR_TYPE_COLOR's own Omission/Mispronunciation scheme in
// attemptWordReviewHelpers.ts) rather than just inheriting whatever
// text color happens to surround it via `currentColor`. That inherited
// approach worked by coincidence in SelectedWordsCard.tsx (its pill's
// text color already happened to be rose/orange from ERROR_TYPE_COLOR)
// but silently failed in PassageCard.tsx's corner badge, which wraps
// the icon in a neutral gray circle — both icons rendered the same
// gray there regardless of type. Giving the icon its own color fixes
// both call sites at once and stops future callers from needing to
// remember to wrap it in the "right" text color themselves. Insertion
// already has its own dashed-border cue elsewhere, so it's not given a
// color here (this component returns null for it, same as before).
export function ErrorTypeIcon({ errorType }: { errorType: AttemptWord['error_type'] }) {
    if (errorType === 'Omission') return <MinusCircle size={13} strokeWidth={2.5} className="text-rose-600 dark:text-rose-400" />
    if (errorType === 'Mispronunciation') return <Ear size={13} strokeWidth={2.5} className="text-orange-600 dark:text-orange-400" />
    return null
}