// File: SelectedWordsCard.tsx
// File: SelectedWordsCard.tsx
// File: SelectedWordsCard.tsx
// File: src/pages/students/review/features/SelectedWordsCard.tsx
//
// RIGHT card of AttemptWordReview during the EDITABLE review flow.
// Supersedes both the old scrollable full-word list (WordListCard.tsx —
// still used as-is by the read-only AttemptResults.tsx page, unchanged)
// AND the single-word inspector from an earlier iteration (deleted).
// Every word a teacher taps in the passage gets ADDED to a stack here
// (most recently tapped on top), each with its own full Correct/
// Miscue/Needs-Attention controls and type picker.
//
// id="selected-words-card" is the scroll target AttemptWordReview.tsx's
// handleWordClick smooth-scrolls to on each tap.
//
// HEADER PLACEMENT: the kicker + Clear All row is a plain (non-sticky,
// non-positioned) first child, structurally OUTSIDE the scrolling body
// below it — see the inner div's own comment. Three earlier attempts at
// `position: sticky` (negative-margin flush trick, then z-index, then an
// isolated stacking context) all still let list entries visually bleed
// in front of it during scroll. Splitting header and scrolling body into
// true siblings is what actually guarantees it: nothing that scrolls
// shares a box with it, so nothing can ever render above it.
//
// HEIGHT: this card no longer caps itself at a fixed max-height
// (lg:max-h-[42rem], used in an earlier pass). It now fills whatever
// height its parent gives it (lg:h-full lg:min-h-0), because
// AttemptWordReview.tsx's outer layout is itself now height-bounded
// (calc(100vh - 200px), see that file's comment) to keep the Save
// Draft/Confirm Results buttons from ever being pushed past the edge of
// ProtectedLayout's <main>, which clips overflow instead of scrolling
// it. A fixed 42rem cap here could still be taller than the space
// actually left for it once that budget is spent elsewhere, which would
// reproduce the exact clipped-buttons bug this whole change fixes — so
// the height has to come from the parent, not a constant.
//
// SIZING: text and buttons here are a size up from the rest of the
// review UI (word title, verdict/flag buttons, Clear All) — this card
// is where a teacher actually taps repeatedly while going through
// flagged words, so the tap targets and labels read clearly at a
// glance rather than blending into smaller secondary UI.
//
// CLEAR ALL: the one bulk action here — empties the whole stack. There's
// no per-word remove button (not asked for); tapping the word again in
// the passage just re-surfaces it at the top rather than duplicating,
// so the stack self-manages without needing individual dismiss
// controls.
//
// EMPTY STATE: before any word has been tapped (fresh page load, or
// right after switching attempts resets the stack), this shows a plain
// hint instead of the Clear button or any word cards.
import { Check, Flag, Trash2, X } from 'lucide-react'
import type { AttemptWord, Verdict } from '../hooks'
import type { AttemptWordReviewStrings } from './attemptWordReviewStrings'
import { effectiveErrorType, ERROR_TYPE_COLOR } from './attemptWordReviewHelpers'
import { ErrorTypeIcon } from './AttemptWordReviewShared'
type SelectedWordsCardProps = {
    words: AttemptWord[]
    // Ordered most-recently-tapped first — see AttemptWordReview.tsx's
    // handleWordClick for how entries get pushed to the front / moved
    // up on re-tap.
    selectedWordIds: string[]
    verdicts: Record<string, Verdict>
    manualFlags: Record<string, boolean>
    manualErrorType: Record<string, AttemptWord['error_type']>
    t: AttemptWordReviewStrings
    onSetVerdict: (wordId: string, verdict: Verdict) => void
    onToggleManualFlag: (wordId: string) => void
    onSetErrorType: (wordId: string, errorType: 'Omission' | 'Mispronunciation') => void
    onClearAll: () => void
}
export function SelectedWordsCard({
                                      words,
                                      selectedWordIds,
                                      verdicts,
                                      manualFlags,
                                      manualErrorType,
                                      t,
                                      onSetVerdict,
                                      onToggleManualFlag,
                                      onSetErrorType,
                                      onClearAll,
                                  }: SelectedWordsCardProps) {
    const wordsById = new Map(words.map((w) => [w.id, w]))
    const stack = selectedWordIds.map((id) => wordsById.get(id)).filter((w): w is AttemptWord => !!w)
    return (
        <section
            id="selected-words-card"
            className="flex flex-col overflow-hidden rounded-3xl border-2 border-gray-900/10 bg-gray-50 shadow-sm dark:border-gray-100/10 dark:bg-gray-950 lg:h-full lg:min-h-0"
        >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-900/10 px-4 py-4 dark:border-gray-100/10 sm:px-5 sm:py-5">
                <span className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t.selectedWordsKicker}</span>
                {stack.length > 0 && (
                    <button
                        onClick={onClearAll}
                        className="flex items-center gap-1.5 rounded-full border border-gray-900/10 px-4 py-1.5 text-sm font-bold text-gray-600 transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10"
                    >
                        <Trash2 size={14} />
                        {t.clearAllLabel}
                    </button>
                )}
            </div>
            {/* The actual scrolling region — sized to fill whatever's left
            of the card after the header above (which is shrink-0 and
            therefore untouched by this). lg:min-h-0 overrides the
            default min-height:auto flex items get, which would otherwise
            silently stop this from ever actually shrinking/scrolling
            inside its allotted space. */}
            <div className="flex flex-col gap-3 p-4 sm:p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                {stack.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-gray-900/10 px-4 py-8 text-center dark:border-gray-100/10">
                        <p className="text-base font-extrabold text-gray-700 dark:text-gray-200">{t.selectedWordsEmptyTitle}</p>
                        <p className="max-w-xs text-sm font-medium text-gray-500 dark:text-gray-400">{t.selectedWordsEmptyHint}</p>
                    </div>
                ) : (
                    stack.map((w) => {
                        const verdict = verdicts[w.id] ?? w.system_verdict
                        const isInsertion = w.error_type === 'Insertion'
                        const flagged = w.confidence === 'low' || !!manualFlags[w.id]
                        const errorType = effectiveErrorType(w, manualErrorType)
                        const showTypePicker = verdict === 'miscue' && !isInsertion
                        return (
                            <div
                                key={w.id}
                                className={`flex flex-col gap-3 rounded-2xl border-2 bg-white p-4 shadow-sm dark:bg-gray-900 ${
                                    flagged ? 'border-amber-500/40 dark:border-amber-400/40' : 'border-gray-900/5 dark:border-gray-100/10'
                                }`}
                            >
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xl font-extrabold text-gray-900 dark:text-gray-50">
                                            {isInsertion ? w.recognized_word : w.reference_word}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${ERROR_TYPE_COLOR[errorType]}`}>
                                            <ErrorTypeIcon errorType={errorType} />
                                            {errorType}
                                        </span>
                                        {w.accuracy_score != null && (
                                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                                {Math.round(w.accuracy_score)}
                                            </span>
                                        )}
                                    </div>
                                    {!isInsertion && w.recognized_word && w.recognized_word !== w.reference_word && (
                                        <div className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {t.recognizedAs(w.recognized_word)}
                                        </div>
                                    )}
                                    {isInsertion && (
                                        <div className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">{t.inserted}</div>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => onSetVerdict(w.id, 'correct')}
                                        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors duration-150 ${
                                            verdict === 'correct'
                                                ? 'bg-green-500 text-white dark:bg-green-600'
                                                : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                        }`}
                                    >
                                        <Check size={16} />
                                        {t.legendCorrect}
                                    </button>
                                    <button
                                        onClick={() => onSetVerdict(w.id, 'miscue')}
                                        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors duration-150 ${
                                            verdict === 'miscue'
                                                ? 'bg-rose-500 text-white dark:bg-rose-600'
                                                : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                        }`}
                                    >
                                        <X size={16} />
                                        {t.legendMiscue}
                                    </button>
                                    <button
                                        onClick={() => onToggleManualFlag(w.id)}
                                        title={t.legendLowConfidence}
                                        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors duration-150 ${
                                            manualFlags[w.id]
                                                ? 'bg-amber-500 text-white dark:bg-amber-500'
                                                : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                        }`}
                                    >
                                        <Flag size={16} />
                                        {t.flagLabel}
                                    </button>
                                </div>
                                {showTypePicker && (
                                    <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-gray-900/10 pt-3 dark:border-gray-100/10">
                                        <span className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                            {t.typeLabel}
                                        </span>
                                        <button
                                            onClick={() => onSetErrorType(w.id, 'Omission')}
                                            className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors duration-150 ${
                                                errorType === 'Omission'
                                                    ? 'bg-rose-500 text-white dark:bg-rose-600'
                                                    : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                            }`}
                                        >
                                            Omission
                                        </button>
                                        <button
                                            onClick={() => onSetErrorType(w.id, 'Mispronunciation')}
                                            className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors duration-150 ${
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
                    })
                )}
            </div>
        </section>
    )
}