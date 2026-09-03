// File: SelectedWordsCard.tsx
// File: SelectedWordsCard.tsx
// File: SelectedWordsCard.tsx
// File: src/pages/students/review/features/SelectedWordsCard.tsx
//
// RIGHT card of AttemptWordReview during the EDITABLE review flow, AND
// (as of this pass) the read-only AttemptResults.tsx page too — see the
// `readOnly` prop below. Supersedes both the old scrollable full-word
// list (WordListCard.tsx — no longer used by AttemptResults.tsx either,
// now that this replaces it there) AND the single-word inspector from an
// earlier iteration (deleted). Every word tapped in the passage gets
// ADDED to a stack here (most recently tapped on top).
//
// HEADER ROW: kicker + search box + Clear All all live on ONE row
// (flex-wrap, search box is the flexible middle element). Clear All is
// ALWAYS rendered — disabled/greyed-out with nothing selected, red/
// danger-styled once there's something to clear — so the control has a
// stable position instead of popping in and out.
//
// WORD SEARCH MATCHING: a plain "contains anywhere" substring search
// was too noisy — one letter could match dozens of unrelated words
// (any word that happens to contain that letter). Now it's two-tiered:
// a PREFIX match (word starts with the typed text) always applies, no
// matter how short the query; a CONTAINS match (typed text appears
// anywhere in the word) only kicks in once the query is 3+ characters,
// to keep short queries tight and predictable. Prefix matches are also
// sorted ahead of contains-only matches so the most relevant results
// lead the list, with each tier keeping the passage's own original
// word order (stable sort).
//
// WORD SEARCH (general): typing in the search box searches the WHOLE
// passage's words (not just what's already in the stack) by their
// displayed text, case-insensitively — matches already in the stack
// are excluded (nothing to add twice). Each match renders as a row
// with two independent click targets: clicking the word/badge area
// calls onWordClick with that word's id (the SAME handler
// AttemptWordReview.tsx wires up to PassageCard's own onWordClick, so
// it pushes the word onto the stack exactly like tapping it in the
// passage would); clicking the small X on the right instead DISMISSES
// that one suggestion from the results list without adding it anywhere
// — dismissedSearchIds tracks this locally and is reset whenever the
// search text itself changes, so a dismissal only lasts for that one
// typed term. The search term itself is never auto-cleared after a
// click, so a teacher can keep tapping through several matches of, say,
// a commonly mispronounced word without retyping. onWordClick is
// optional (like the other mutating handlers here) since
// AttemptResults.tsx's read-only usage may have nothing to wire it to —
// when it's absent, both the search results and the stack's own remove
// buttons render inert/hidden rather than throwing.
//
// PER-WORD REMOVE: each card in the stack has a small X in its
// top-right corner. It calls the SAME onWordClick handler with that
// word's id — since the word is already selected at that point,
// AttemptWordReview.tsx's handleWordClick toggles it OFF (removes it
// from selectedWordIds, no scroll-into-view happens since that only
// fires on the add path), so no new prop was needed for this. Shown
// whenever onWordClick is wired, independent of readOnly — removing a
// word from this view doesn't mutate any actual review data any more
// than Clear All does.
//
// EMPTY STATE HINT IMAGE (this pass): the empty state ("No words
// selected yet") shows the title/hint text FIRST, then a small
// screenshot (/hints/select_word_card_hint.png, served from
// public/hints/) BELOW it, illustrating a word in the passage being
// tapped (cursor + highlight). The screenshot is rendered as a
// background-image (not a plain <img>) inside a fixed-size,
// overflow-hidden box so it can be "zoomed" — backgroundSize > 100% —
// to crop in on the highlighted word/cursor area specifically, without
// changing the box's own on-screen footprint. backgroundPosition is
// tuned to roughly center on where the highlighted word sits in the
// source screenshot; if the hint image is ever swapped for a different
// screenshot, that position will likely need re-tuning by eye. Purely
// decorative (aria-hidden) since the text above it already conveys the
// same instruction — this is just a visual aid, not new information a
// screen reader needs separately.
//
// READ-ONLY MODE: AttemptResults.tsx shows already-CONFIRMED attempts —
// nothing on that page can change a verdict, so passing readOnly hides
// the Correct/Miscue/Needs Attention buttons and the type picker
// entirely, leaving just the word, its (final, persisted) verdict badge,
// error-type badge, and score visible. Tapping words to stack them up
// and Clear All both still work in read-only mode — neither one
// mutates any actual review data, they only control what's currently
// shown in this card, so there's nothing unsafe about leaving them
// active. onSetVerdict/onToggleManualFlag/onSetErrorType are optional
// specifically so AttemptResults.tsx doesn't need to pass no-op
// handlers just to satisfy the type.
//
// id="selected-words-card" is the scroll target both consumers'
// handleWordClick (or equivalent) smooth-scrolls to on each tap.
//
// HEADER PLACEMENT: the kicker/search/Clear-All row is a plain
// (non-sticky, non-positioned) first child, structurally OUTSIDE the
// scrolling body below it — see the inner div's own comment. Three
// earlier attempts at `position: sticky` (negative-margin flush trick,
// then z-index, then an isolated stacking context) all still let list
// entries visually bleed in front of it during scroll. Splitting header
// and scrolling body into true siblings is what actually guarantees it:
// nothing that scrolls shares a box with it, so nothing can ever render
// above it.
//
// HEIGHT: this card fills whatever height its parent gives it
// (lg:h-full lg:min-h-0) rather than capping itself at a fixed value —
// on AttemptWordReview.tsx that parent is itself height-bounded (see
// that file's comment on why), so this card scrolls within a fixed
// budget there; on AttemptResults.tsx there's no such bound, so this
// card just sizes to its natural content height there, same as
// WordListCard did before it.
//
// SIZING: text and buttons here are a size up from the rest of the
// review UI (word title, verdict/flag buttons, Clear All) — this card
// is where a teacher actually taps repeatedly while going through
// flagged words, so the tap targets and labels read clearly at a
// glance rather than blending into smaller secondary UI.
import { useEffect, useState } from 'react'
import { Check, Flag, Search, Trash2, X } from 'lucide-react'
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
    onSetVerdict?: (wordId: string, verdict: Verdict) => void
    onToggleManualFlag?: (wordId: string) => void
    onSetErrorType?: (wordId: string, errorType: 'Omission' | 'Mispronunciation') => void
    onClearAll: () => void
    // WORD SEARCH / PER-WORD REMOVE — see this file's header comment.
    // Same handler drives both: clicking a search result ADDS that
    // word (toggles it on), clicking a stack card's X REMOVES it
    // (toggles it off) — both are just "toggle this word's selection"
    // from the caller's point of view. Optional so read-only callers
    // can leave it unwired (search still filters, but nothing is
    // clickable and stack cards show no X).
    onWordClick?: (wordId: string) => void
    // When true, hides every verdict/flag/type-changing control — used
    // by AttemptResults.tsx, where the attempt is already confirmed and
    // nothing here can actually be edited. Defaults to false so the
    // editable AttemptWordReview.tsx flow needs no changes.
    readOnly?: boolean
}
function wordDisplayText(w: AttemptWord): string {
    return (w.error_type === 'Insertion' ? w.recognized_word : w.reference_word) ?? ''
}
// WORD SEARCH MATCHING — see this file's header comment. 0 = prefix
// match (always eligible), 1 = contains-only match (eligible once the
// query is 3+ chars), null = no match at all.
const SEARCH_CONTAINS_MIN_LENGTH = 3
function searchMatchRank(displayTextLower: string, queryLower: string): 0 | 1 | null {
    if (displayTextLower.startsWith(queryLower)) return 0
    if (queryLower.length >= SEARCH_CONTAINS_MIN_LENGTH && displayTextLower.includes(queryLower)) return 1
    return null
}
// EMPTY STATE HINT IMAGE — see this file's header comment. backgroundSize
// zooms in (crops), backgroundPosition aims the crop at roughly where
// the highlighted word + cursor sit in the source screenshot.
const SELECTED_WORDS_HINT_IMAGE = '/hints/select_word_card_hint.png'
const SELECTED_WORDS_HINT_IMAGE_ZOOM = '190%'
const SELECTED_WORDS_HINT_IMAGE_POSITION = '48% 55%'
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
                                      onWordClick,
                                      readOnly = false,
                                  }: SelectedWordsCardProps) {
    const [searchTerm, setSearchTerm] = useState('')
    // Suggestions dismissed via the search result's own X — scoped to
    // the CURRENT search text; see this file's header comment.
    const [dismissedSearchIds, setDismissedSearchIds] = useState<Set<string>>(new Set())
    const wordsById = new Map(words.map((w) => [w.id, w]))
    const stack = selectedWordIds.map((id) => wordsById.get(id)).filter((w): w is AttemptWord => !!w)
    const trimmedSearch = searchTerm.trim().toLowerCase()
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDismissedSearchIds(new Set())
    }, [trimmedSearch])
    const searchMatches = trimmedSearch
        ? words
            .filter((w) => !selectedWordIds.includes(w.id) && !dismissedSearchIds.has(w.id))
            .map((w) => ({ w, rank: searchMatchRank(wordDisplayText(w).toLowerCase(), trimmedSearch) }))
            .filter((entry): entry is { w: AttemptWord; rank: 0 | 1 } => entry.rank !== null)
            .sort((a, b) => a.rank - b.rank)
            .map((entry) => entry.w)
        : []
    const dismissSearchMatch = (wordId: string) => {
        setDismissedSearchIds((prev) => {
            const next = new Set(prev)
            next.add(wordId)
            return next
        })
    }
    return (
        <section
            id="selected-words-card"
            className="flex flex-col overflow-hidden rounded-3xl border-2 border-gray-900/10 bg-gray-50 shadow-sm dark:border-gray-100/10 dark:bg-gray-950 lg:h-full lg:min-h-0"
        >
            {/* HEADER ROW — kicker + search box + Clear All, all one
            row. See this file's header comment for why Clear All is
            now always rendered (disabled vs danger-styled) instead of
            appearing/disappearing. */}
            <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-gray-900/10 px-4 py-4 dark:border-gray-100/10 sm:px-5 sm:py-5">
                <span className="shrink-0 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t.selectedWordsKicker}
                </span>
                <div className="relative min-w-[140px] flex-1">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t.searchPlaceholder}
                        className="w-full rounded-xl border border-gray-900/10 bg-white py-1.5 pl-8 pr-8 text-sm font-medium text-gray-900 outline-none transition-colors duration-150 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-teal-400/50 dark:focus:ring-teal-400/20"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                            aria-label="Clear search"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
                <button
                    onClick={onClearAll}
                    disabled={stack.length === 0}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-bold transition-colors duration-150 ${
                        stack.length === 0
                            ? 'cursor-not-allowed border-gray-900/10 text-gray-400 opacity-50 dark:border-gray-100/10 dark:text-gray-600'
                            : 'cursor-pointer border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:border-rose-400/30 dark:text-rose-400 dark:hover:bg-rose-400/10'
                    }`}
                >
                    <Trash2 size={14} />
                    {t.clearAllLabel}
                </button>
            </div>
            {/* The actual scrolling region — sized to fill whatever's left
            of the card after the header above (shrink-0, untouched by
            this). lg:min-h-0 overrides the default min-height:auto flex
            items get, which would otherwise silently stop this from
            ever actually shrinking/scrolling inside its allotted
            space. */}
            <div className="flex flex-col gap-3 p-4 sm:p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                {trimmedSearch && (
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            {t.searchResultsLabel(searchMatches.length)}
                        </span>
                        {searchMatches.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-gray-900/10 px-3 py-3 text-center text-sm font-medium text-gray-500 dark:border-gray-100/10 dark:text-gray-400">
                                {t.searchNoResults}
                            </p>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {searchMatches.map((w) => {
                                    const errorType = effectiveErrorType(w, manualErrorType)
                                    return (
                                        <div
                                            key={w.id}
                                            className={`flex items-center gap-1 rounded-xl border border-gray-900/10 bg-white py-1 pl-3 pr-1.5 transition-colors duration-150 dark:border-gray-100/10 dark:bg-gray-900 ${
                                                onWordClick ? 'hover:border-teal-500/40 hover:bg-teal-500/5 dark:hover:border-teal-400/40 dark:hover:bg-teal-400/5' : ''
                                            }`}
                                        >
                                            <button
                                                onClick={() => onWordClick?.(w.id)}
                                                disabled={!onWordClick}
                                                className={`flex flex-1 items-center justify-between gap-2 py-1 text-left ${onWordClick ? 'cursor-pointer' : 'cursor-default'}`}
                                            >
                                                <span className="font-bold text-gray-900 dark:text-gray-50">{wordDisplayText(w)}</span>
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${ERROR_TYPE_COLOR[errorType]}`}>
                                                    <ErrorTypeIcon errorType={errorType} />
                                                    {errorType}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => dismissSearchMatch(w.id)}
                                                className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors duration-150 hover:bg-gray-900/5 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-100/10 dark:hover:text-gray-200"
                                                aria-label="Dismiss search result"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        <div className="my-1 border-t border-dashed border-gray-900/10 dark:border-gray-100/10" />
                    </div>
                )}
                {stack.length === 0 ? (
                    !trimmedSearch && (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-900/10 px-4 py-6 text-center dark:border-gray-100/10">
                            <div>
                                <p className="text-base font-extrabold text-gray-700 dark:text-gray-200">{t.selectedWordsEmptyTitle}</p>
                                <p className="max-w-xs text-sm font-medium text-gray-500 dark:text-gray-400">{t.selectedWordsEmptyHint}</p>
                            </div>
                            <div
                                aria-hidden="true"
                                className="h-40 w-full max-w-xs overflow-hidden rounded-xl border border-gray-900/10 shadow-sm dark:border-gray-100/10"
                                style={{
                                    backgroundImage: `url(${SELECTED_WORDS_HINT_IMAGE})`,
                                    backgroundSize: SELECTED_WORDS_HINT_IMAGE_ZOOM,
                                    backgroundPosition: SELECTED_WORDS_HINT_IMAGE_POSITION,
                                    backgroundRepeat: 'no-repeat',
                                }}
                            />
                        </div>
                    )
                ) : (
                    stack.map((w) => {
                        const verdict = verdicts[w.id] ?? w.system_verdict
                        const isInsertion = w.error_type === 'Insertion'
                        const flagged = w.confidence === 'low' || !!manualFlags[w.id]
                        const errorType = effectiveErrorType(w, manualErrorType)
                        const showTypePicker = !readOnly && verdict === 'miscue' && !isInsertion
                        return (
                            <div
                                key={w.id}
                                className={`flex flex-col gap-3 rounded-2xl border-2 bg-white p-4 shadow-sm dark:bg-gray-900 ${
                                    flagged ? 'border-amber-500/40 dark:border-amber-400/40' : 'border-gray-900/5 dark:border-gray-100/10'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
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
                                    {onWordClick && (
                                        <button
                                            onClick={() => onWordClick(w.id)}
                                            className="shrink-0 rounded-full p-1 text-gray-400 transition-colors duration-150 hover:bg-gray-900/5 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-100/10 dark:hover:text-gray-200"
                                            aria-label="Remove from selected words"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                                <div>
                                    {!isInsertion && w.recognized_word && w.recognized_word !== w.reference_word && (
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {t.recognizedAs(w.recognized_word)}
                                        </div>
                                    )}
                                    {isInsertion && (
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.inserted}</div>
                                    )}
                                </div>
                                {!readOnly && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => onSetVerdict?.(w.id, 'correct')}
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
                                            onClick={() => onSetVerdict?.(w.id, 'miscue')}
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
                                            onClick={() => onToggleManualFlag?.(w.id)}
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
                                )}
                                {showTypePicker && (
                                    <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-gray-900/10 pt-3 dark:border-gray-100/10">
                                        <span className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                            {t.typeLabel}
                                        </span>
                                        <button
                                            onClick={() => onSetErrorType?.(w.id, 'Omission')}
                                            className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors duration-150 ${
                                                errorType === 'Omission'
                                                    ? 'bg-rose-500 text-white dark:bg-rose-600'
                                                    : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                            }`}
                                        >
                                            Omission
                                        </button>
                                        <button
                                            onClick={() => onSetErrorType?.(w.id, 'Mispronunciation')}
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