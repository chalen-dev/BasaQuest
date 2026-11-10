// File: AttemptWordReviewShared.tsx
// File: src/pages/proficiency/review/features/AttemptWordReviewShared.tsx
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
import { Tooltip } from '../../../../components/ui/Tooltip'
// `estimated` marks a score we worked out ourselves (a Filipino reading's pronunciation and
// fluency) rather than one Azure measured: shown with a ~ and an explanatory note in the hint.
export function ScorePill({
    label,
    value,
    hint,
    estimated = false,
    estimatedNote,
}: {
    label: string
    value: number | null
    hint?: string
    estimated?: boolean
    estimatedNote?: string
}) {
    if (value == null) return null
    const pill = (
        <span
            tabIndex={hint ? 0 : undefined}
            className={`rounded-full bg-gray-900/5 px-3 py-1 text-xs font-bold text-gray-700 dark:bg-gray-100/10 dark:text-gray-300 ${hint ? 'cursor-help transition-colors duration-150 hover:bg-teal-500/20 dark:hover:bg-teal-400/20' : ''}`}
        >
            {label}: {estimated ? '~' : ''}{Math.round(value)}
        </span>
    )
    const fullHint = estimated && estimatedNote ? (hint ? `${hint} ${estimatedNote}` : estimatedNote) : hint
    // A short explanation of what the score measures, on hover or keyboard focus.
    return fullHint ? (
        <Tooltip label={fullHint} position="bottom" wide>
            {pill}
        </Tooltip>
    ) : (
        pill
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