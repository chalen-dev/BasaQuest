// File: PassageCard.tsx
// File: PassageCard.tsx
// File: src/pages/students/review/features/PassageCard.tsx
//
// Passage-text-only panel of AttemptWordReview — just the color legend,
// the tap hint, and the passage itself as flowing colored text. Used to
// also hold the header/recording/scores block, but that moved out into
// its own ResultsSummaryCard.tsx per explicit ask: the passage panel
// should hold ONLY the passage, with results/recording info living in a
// separate visual container. Shared identically by the editable flow
// (AttemptWordReview.tsx) and the read-only results flow
// (AttemptResults.tsx) — no readOnly prop needed, since there's nothing
// conditionally hidden here.
//
// id="passage-card" on the outer section is load-bearing: the parent
// uses it both as the IntersectionObserver target (to know when to show
// the "Back to Passage" floating button, mobile-only — see
// AttemptWordReview.tsx) and as the scroll target that button jumps
// back to.
//
// FIXED LEGEND HEADER + SCROLLING BODY (this pass): the legend/tap-hint
// block used to just flow together with the passage text as one
// scrolling unit (AttemptWordReview.tsx's wrapper div around this
// component owned the scrolling). Per explicit ask ("make the legend
// fixed like SelectedWordsCard's header"), this component now owns its
// OWN internal scroll instead, split the same way
// SelectedWordsCard.tsx's header/body already are: the legend+hint
// block is a plain (non-sticky, non-positioned) shrink-0 first child,
// structurally OUTSIDE the scrolling passage-text body below it — see
// SelectedWordsCard.tsx's own HEADER PLACEMENT comment for why plain
// sibling-splitting was used instead of position:sticky (three earlier
// sticky attempts elsewhere in this app all let content visually bleed
// in front of a sticky header during scroll; a true sibling split
// guarantees nothing that scrolls ever shares a box with it). The
// outer <section> is now `flex flex-col lg:h-full lg:min-h-0` so it
// fills whatever height AttemptWordReview.tsx's wrapper gives it, the
// header keeps its natural size (shrink-0), and the passage body takes
// the rest (lg:flex-1 lg:min-h-0 lg:overflow-y-auto — the same fixed-
// header/scrollable-body flex combination used everywhere else in this
// review UI). Below lg this produces no scrolling of its own — the
// whole grid scrolls as one unit instead (see
// AttemptWordReview.tsx's MOBILE SCROLL FIX comment) — so the
// header/body split there is just plain stacked layout with no
// functional difference from before.
//
// .review-scroll (defined in AttemptWordReview.tsx, a global class, not
// scoped to that file) gives the passage body the same visible themed
// scrollbar as every other scroll region in this review UI, including
// the dark-mode color override.
//
// SELECTED-WORDS RING: any word whose id is in selectedWordIds (the
// stack shown in SelectedWordsCard, on the editable flow only) gets a
// sky-blue ring so it's clear which words are currently in the working
// set. selectedWordIds is optional and defaults to empty, so the
// read-only AttemptResults.tsx page (which never passes it) renders
// with no ring logic at all. The corner error-type badge carries an
// explicit z-index — without one, a neighboring word's background
// (later in the DOM, tightly packed inline) painted over it.
//
// Verdict backgrounds use the -600 shade (not -500) and stay fully
// OPAQUE — an earlier version tried a translucent /70 background to
// look "less vibrant", but the page background bled through it and
// washed out the white text's contrast. -600 solid reads as calmer
// than the neon -500 while keeping the white text crisp regardless of
// what's behind the card.
//
// The error-type corner icon reflects the EFFECTIVE type (system
// detection, or a teacher's manual Omission/Mispronunciation override
// from SelectedWordsCard's type picker) via effectiveErrorType(), not
// the raw system value — so overriding a word's type updates its icon
// in the passage too.
import type { AttemptWord, Verdict } from '../hooks'
import type { AttemptWordReviewStrings } from './attemptWordReviewStrings'
import { effectiveErrorType, wordTooltip } from './attemptWordReviewHelpers'
import { ErrorTypeIcon, LegendSwatch } from './AttemptWordReviewShared'
type PassageCardProps = {
    words: AttemptWord[]
    verdicts: Record<string, Verdict>
    manualFlags: Record<string, boolean>
    manualErrorType: Record<string, AttemptWord['error_type']>
    // Ids currently stacked in SelectedWordsCard (AttemptWordReview's
    // editable flow only) — every matching word gets a highlight ring.
    // Omitted/undefined on the read-only AttemptResults.tsx page, where
    // there's no such concept.
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
                    {/* FIXED HEADER — legend + tap hint, now sharing one
                    row (per explicit ask) instead of hint sitting on its
                    own line below. shrink-0, a true sibling of the
                    scrolling body below rather than sharing a box with
                    it — see this file's header comment for why.
                    justify-between + flex-wrap lets the hint drop to
                    its own line only when the legend swatches don't
                    leave room for it, rather than ever overlapping. */}
                    <div className="relative shrink-0 px-6 pt-6 sm:px-8 sm:pt-8">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-dashed border-gray-900/10 pb-4 dark:border-gray-100/10">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
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
                            </div>
                            {/* Dashed-outline pill, same "dashed border
                            = affordance/instruction" visual language
                            this file already uses (the Inserted-word
                            swatch above, and SelectedWordsCard's own
                            dashed-border empty-state box) — reads as a
                            hint rather than plain caption text now. */}
                            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-teal-500/50 px-3 py-1 text-xs font-semibold text-teal-700 dark:border-teal-400/40 dark:text-teal-300">
                                {t.tapHint}
                            </span>
                        </div>
                    </div>
                    {/* SCROLLING BODY — just the passage text. lg:flex-1
                    lg:min-h-0 lg:overflow-y-auto is the same fixed-
                    header/scrollable-body combination
                    AttemptWordReview.tsx's "left" column and
                    SelectedWordsCard.tsx both use. review-scroll gives
                    it the shared visible/theme-aware scrollbar (defined
                    in AttemptWordReview.tsx). Below lg this is a plain
                    block with no scroll of its own — the whole grid
                    scrolls as one unit there instead. */}
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
                                                        ? 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
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
                                                // h-[18px]/w-[18px] and the -2 offsets (up from h-4/w-4 and
                                                // -1.5) give the now-slightly-bigger ErrorTypeIcon (size 13,
                                                // up from 10) enough breathing room inside the circle
                                                // instead of touching its edges.
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