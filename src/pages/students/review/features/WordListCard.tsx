// File: src/pages/students/review/features/WordListCard.tsx
//
// RIGHT card of AttemptWordReview: the detailed per-word list, its own
// separate container (own background, heavier border, scrollable),
// with the Correct/Miscue/Needs-Attention controls and — only in select
// mode — a read-only checkbox per row. All state lives in the parent
// (AttemptWordReview.tsx); this component just renders it.
//
// The row itself is the click target for selection when select mode is
// on (not the tiny checkbox) — every button in the row (including the
// new type-picker buttons below) calls stopPropagation so clicking them
// doesn't also toggle the row's selection.
//
// TYPE PICKER: once a word is marked Miscue, a second small row of
// Omission/Mispronunciation toggle chips appears underneath the main
// buttons, letting a teacher manually (re)classify the miscue type —
// not just flag that it's wrong, but say WHAT kind of wrong it is. Not
// shown for Insertion rows: an Insertion represents an extra recognized
// word with no reference-word slot, so there's nothing to reclassify.
// Clicking the currently-active type again clears the override back to
// whatever the system originally detected.
import { Check, Flag, X } from 'lucide-react'
import type { AttemptWord, Verdict } from '../hooks'
import type { AttemptWordReviewStrings } from './attemptWordReviewStrings'
import { effectiveErrorType, ERROR_TYPE_COLOR } from './attemptWordReviewHelpers'
import { ErrorTypeIcon } from './AttemptWordReviewShared'

type WordListCardProps = {
    words: AttemptWord[]
    verdicts: Record<string, Verdict>
    manualFlags: Record<string, boolean>
    manualErrorType: Record<string, AttemptWord['error_type']>
    selectedIds: Record<string, boolean>
    selectMode: boolean
    highlightedId: string | null
    t: AttemptWordReviewStrings
    onSetVerdict: (wordId: string, verdict: Verdict) => void
    onToggleManualFlag: (wordId: string) => void
    onSetErrorType: (wordId: string, errorType: 'Omission' | 'Mispronunciation') => void
    onRowClick: (wordId: string) => void
}

export function WordListCard({
                                 words,
                                 verdicts,
                                 manualFlags,
                                 manualErrorType,
                                 selectedIds,
                                 selectMode,
                                 highlightedId,
                                 t,
                                 onSetVerdict,
                                 onToggleManualFlag,
                                 onSetErrorType,
                                 onRowClick,
                             }: WordListCardProps) {
    const isFlagged = (w: AttemptWord) => w.confidence === 'low' || !!manualFlags[w.id]

    return (
        <section className="flex flex-col gap-2 rounded-3xl border-2 border-gray-900/10 bg-gray-50 p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-950 sm:p-5 lg:max-h-[42rem] lg:overflow-y-auto">
            {words.map((w) => {
                const verdict = verdicts[w.id] ?? w.system_verdict
                const isInsertion = w.error_type === 'Insertion'
                const flagged = isFlagged(w)
                const selected = !!selectedIds[w.id]
                const errorType = effectiveErrorType(w, manualErrorType)
                const showTypePicker = verdict === 'miscue' && !isInsertion
                return (
                    <div
                        key={w.id}
                        id={`word-row-${w.id}`}
                        onClick={() => onRowClick(w.id)}
                        className={`flex flex-wrap items-center gap-3 rounded-2xl border-2 bg-white p-3.5 shadow-sm transition-shadow duration-300 dark:bg-gray-900 ${
                            selectMode ? 'cursor-pointer' : ''
                        } ${
                            highlightedId === w.id ? 'ring-4 ring-teal-500/50 dark:ring-teal-400/50' : ''
                        } ${
                            selected
                                ? 'border-teal-500 ring-2 ring-teal-500/40 dark:border-teal-400 dark:ring-teal-400/30'
                                : flagged
                                    ? 'border-amber-500/40 dark:border-amber-400/40'
                                    : 'border-gray-900/5 dark:border-gray-100/10'
                        }`}
                    >
                        {selectMode && (
                            <input
                                type="checkbox"
                                checked={selected}
                                readOnly
                                className="pointer-events-none h-4 w-4 shrink-0 accent-teal-500"
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-extrabold text-gray-900 dark:text-gray-50">
                                    {isInsertion ? w.recognized_word : w.reference_word}
                                </span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ERROR_TYPE_COLOR[errorType]}`}>
                                    <ErrorTypeIcon errorType={errorType} />
                                    {errorType}
                                </span>
                                {w.accuracy_score != null && (
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        {Math.round(w.accuracy_score)}
                                    </span>
                                )}
                            </div>
                            {!isInsertion && w.recognized_word && w.recognized_word !== w.reference_word && (
                                <div className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {t.recognizedAs(w.recognized_word)}
                                </div>
                            )}
                            {isInsertion && (
                                <div className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t.inserted}</div>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSetVerdict(w.id, 'correct')
                                }}
                                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-150 ${
                                    verdict === 'correct'
                                        ? 'bg-green-500 text-white dark:bg-green-600'
                                        : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                }`}
                            >
                                <Check size={13} />
                                {t.legendCorrect}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSetVerdict(w.id, 'miscue')
                                }}
                                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-150 ${
                                    verdict === 'miscue'
                                        ? 'bg-rose-500 text-white dark:bg-rose-600'
                                        : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                }`}
                            >
                                <X size={13} />
                                {t.legendMiscue}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onToggleManualFlag(w.id)
                                }}
                                title={t.legendLowConfidence}
                                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-150 ${
                                    manualFlags[w.id]
                                        ? 'bg-amber-500 text-white dark:bg-amber-500'
                                        : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                }`}
                            >
                                <Flag size={13} />
                                {t.flagLabel}
                            </button>
                        </div>
                        {showTypePicker && (
                            <div className="flex w-full items-center gap-1.5">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                    {t.typeLabel}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onSetErrorType(w.id, 'Omission')
                                    }}
                                    className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors duration-150 ${
                                        errorType === 'Omission'
                                            ? 'bg-rose-500 text-white dark:bg-rose-600'
                                            : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                    }`}
                                >
                                    Omission
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onSetErrorType(w.id, 'Mispronunciation')
                                    }}
                                    className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors duration-150 ${
                                        errorType === 'Mispronunciation'
                                            ? 'bg-orange-500 text-white dark:bg-orange-600'
                                            : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                    }`}
                                >
                                    Mispronunciation
                                </button>
                            </div>
                        )}
                    </div>
                )
            })}
        </section>
    )
}