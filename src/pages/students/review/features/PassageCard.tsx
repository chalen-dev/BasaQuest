// File: PassageCard.tsx
// File: src/pages/students/review/features/PassageCard.tsx
//
// Passage-text-only panel of AttemptWordReview. id="passage-card" is
// load-bearing: the parent uses it as the IntersectionObserver target
// for the mobile "Back to Passage" button. lg:h-full lg:min-h-0 means
// this always fills whatever height its wrapper div hands it — that
// wrapper is now a plain flex-1 sibling of ResultsSummaryCard's own
// wrapper in AttemptWordReview.tsx's draggable-divider layout, so this
// component itself needs no resize-related props at all; it just fills
// whatever space it's given, same as it always has.
//
// LEGEND: includes the Omission/Mispronunciation corner-icon meanings
// via ErrorTypeIcon with literal 'Omission'/'Mispronunciation' — same
// untranslated labels WordListCard's own type-picker buttons use. The
// "tap a word to add it here" hint pill that used to sit at the right
// of this row has been removed per request — the legend row is now
// just the legend, left-aligned.
import type { AttemptWord, Verdict } from '../hooks'
import type { AttemptWordReviewStrings } from './attemptWordReviewStrings'
import { effectiveErrorType, wordTooltip } from './attemptWordReviewHelpers'
import { ErrorTypeIcon, LegendSwatch } from './AttemptWordReviewShared'
type PassageCardProps = {
    words: AttemptWord[]
    verdicts: Record<string, Verdict>
    manualFlags: Record<string, boolean>
    manualErrorType: Record<string, AttemptWord['error_type']>
    selectedWordIds?: string[]
    t: AttemptWordReviewStrings
    onWordClick: (wordId: string) => void
}
export function PassageCard({
                                words,
                                verdicts,
                                manualFlags,
                                manualErrorType,
                                selectedWordIds = [],
                                t,
                                onWordClick,
                            }: PassageCardProps) {
    const isFlagged = (w: AttemptWord) => w.confidence === 'low' || !!manualFlags[w.id]
    return (
        <section
            id="passage-card"
            className="relative flex flex-col overflow-hidden rounded-3xl border border-gray-900/5 shadow-sm transition-colors duration-300 dark:border-gray-100/10 lg:h-full lg:min-h-0"
        >
            <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
            <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
            {words.length === 0 ? (
                <p className="relative m-6 rounded-2xl border border-dashed border-gray-900/15 px-4 py-6 text-center text-sm font-semibold text-gray-500 dark:border-gray-100/15 dark:text-gray-400 sm:m-8">
                    {t.emptyWords}
                </p>
            ) : (
                <>
                    <div className="relative shrink-0 px-6 pt-6 sm:px-8 sm:pt-8">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-dashed border-gray-900/10 pb-4 dark:border-gray-100/10">
                            <LegendSwatch colorClass="bg-green-500" label={t.legendCorrect} />
                            <LegendSwatch colorClass="bg-rose-500" label={t.legendMiscue} />
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                <span className="inline-block h-3 w-5 rounded-full border-2 border-dashed border-amber-500 dark:border-amber-400" />
                                {t.legendInserted}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                <span className="inline-block h-3 w-3 rounded-full bg-gray-300 ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:bg-gray-600 dark:ring-amber-300 dark:ring-offset-gray-900" />
                                {t.legendLowConfidence}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                <ErrorTypeIcon errorType="Omission" />
                                Omission
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                <ErrorTypeIcon errorType="Mispronunciation" />
                                Mispronunciation
                            </span>
                        </div>
                    </div>
                    <div className="review-scroll relative px-6 pb-6 pt-4 sm:px-8 sm:pb-8 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-4">
                        <p className="text-lg font-medium leading-[2.1] tracking-wide text-gray-800 dark:text-gray-200" style={{ wordSpacing: '0.1em' }}>
                            {words.map((w) => {
                                const verdict = verdicts[w.id] ?? w.system_verdict
                                const isInsertion = w.error_type === 'Insertion'
                                const displayWord = isInsertion ? w.recognized_word : w.reference_word
                                const flagged = isFlagged(w)
                                const inStack = selectedWordIds.includes(w.id)
                                const errorType = effectiveErrorType(w, manualErrorType)
                                const hasTypeIcon = errorType === 'Omission' || errorType === 'Mispronunciation'
                                return (
                                    <span key={w.id}>
                                        <span className="relative inline-block">
                                            <span
                                                onClick={() => onWordClick(w.id)}
                                                title={wordTooltip(w, t, errorType)}
                                                className={`cursor-pointer rounded-[4px] px-1 py-0.5 font-bold transition-colors duration-150 ${
                                                    verdict === 'correct'
                                                        ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60'
                                                        : 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600'
                                                } ${isInsertion ? 'border-b-2 border-dashed border-amber-500 dark:border-amber-300' : ''} ${
                                                    flagged ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-amber-300 dark:ring-offset-gray-900' : ''
                                                } ${
                                                    inStack ? 'ring-4 ring-sky-500 dark:ring-sky-400' : ''
                                                }`}
                                            >
                                                {displayWord}
                                            </span>
                                            {hasTypeIcon && (
                                                <span className="absolute -right-2 -top-2 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-gray-700 shadow ring-1 ring-gray-900/10 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-100/10">
                                                    <ErrorTypeIcon errorType={errorType} />
                                                </span>
                                            )}
                                        </span>
                                        {' '}
                                    </span>
                                )
                            })}
                        </p>
                    </div>
                </>
            )}
        </section>
    )
}