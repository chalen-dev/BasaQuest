// File: AttemptWordReview.tsx
// File: AttemptWordReview.tsx
// File: src/pages/students/review/features/AttemptWordReview.tsx
//
// Orchestrator for the shared word-by-word review UI — used both
// inline, right after a "Now" mode session (from AssessmentSession.tsx),
// and standalone on the "Send"-mode review page (TeacherReviewAttempt.tsx).
// Holds all the local state (verdicts, manual flags, manual error-type
// overrides, the stack of tapped words, passage visibility) and hands it
// down to four independent panels — ResultsSummaryCard, PassageCard,
// SelectedWordsCard, and its own Save Draft/Confirm Results buttons
// container — arranged by the responsive grid below. Kept as one
// component tree specifically so both flows produce identical review
// data instead of two implementations quietly drifting apart.
//
// LAYOUT (below lg — see MOBILE SCROLL FIX below): a HEIGHT-BOUNDED
// single-column stack — height: calc(100vh - heightBudget.base px) —
// with grid-template-areas: "left" "buttons" "wordselect", and
// overflow-y: auto on the GRID ITSELF (not a per-column scroll — there's
// only one column here, so the whole stack — summary, passage, the
// Save Draft/Confirm Results buttons, AND the selected-words card —
// scrolls together as one unit).
//
// LAYOUT (lg and up): a HEIGHT-BOUNDED two-column grid —
// height: calc(100vh - heightBudget.lg px) — with "left" (summary+
// passage) spanning both rows in column 1, "wordselect" in column 2 row
// 1, and "buttons" in column 2 row 2, sized to its own content
// (grid-template-rows: minmax(0,1fr) auto).
//
// "LEFT" COLUMN INTERNAL LAYOUT (fixed this round — see below): "left"
// used to just be `overflow-y-auto` and rely on the grid's row-span
// math to hand it a bounded height indirectly, with ResultsSummaryCard
// and PassageCard as two plain flex children inside it. That was
// fragile in a way that produced exactly the bug reported (audio
// player squished/cut off, passage text abruptly cut with NO
// scrollbar): a flex container's children can get shrunk/clipped
// instead of the container ever actually overflowing, so overflow-y-
// auto never got a chance to kick in, and the "left" box's real height
// depended on grid-span inheritance instead of being stated directly.
//
// Fixed by giving "left" an EXPLICIT height of its own at lg (the
// .attempt-word-review-left rule below, same calc(100vh - heightBudget.lg
// px) total as the grid), and splitting its two children with the
// standard fixed-header/scrollable-body flex pattern: the results
// summary wrapper is `shrink-0` (never compressible — this alone is
// what stops the audio player from being squeezed), and the passage
// wrapper is `flex-1 min-h-0 overflow-y-auto` (the one combination that
// reliably turns overflow into a real, working scrollbar instead of
// silent clipping). This only changes lg — below lg, "left" has no
// explicit height of its own and both children just stack normally,
// since the MOBILE SCROLL FIX below already makes the whole grid one
// scrollable unit.
//
// WHY BOUNDED AT ALL: ProtectedLayout.tsx's <main> (and
// AssessmentSessionLayout.tsx's own <main>, for the inline "Now" mode
// host) is `overflow-hidden` and effectively pinned to viewport height
// (fixed header, flex-1 in a min-h-screen column) — there is NO
// page-level scrollbar anywhere in this app shell, at ANY viewport
// width. Anything taller than <main>'s box doesn't scroll, it just gets
// silently clipped and becomes unreachable.
//
// MOBILE SCROLL FIX: this used to be a documented gap — the below-lg
// layout was "just stacked, unbounded height, the page flows normally
// like any other page," which is WRONG for this specific app shell:
// there is no page-level scroll to flow into, so on a narrow viewport a
// long passage (or a long selected-words stack) got hard-clipped by
// <main>'s overflow-hidden with no way to reach the rest of it or even
// the Save Draft/Confirm Results buttons below it. Fixed by giving the
// below-lg case the same bounded-height-plus-overflow-y-auto treatment
// lg already had, just scoped to the whole grid as one scrollable unit
// (since mobile has only one column, there's no per-panel split to
// make).
//
// VISIBLE SCROLLBAR (.review-scroll): every scrollable region here used
// to rely on the OS/browser's own overflow-y-auto scrollbar, which on
// several platforms (macOS trackpad settings, Chrome's overlay
// scrollbars) is invisible until actively scrolling — giving no visual
// hint there's more content below the fold. .review-scroll forces a
// thin, always-visible (on hover/scroll — see scrollbar-width: thin)
// teal-tinted scrollbar via both the standard scrollbar-width/-color
// properties (Firefox) and the -webkit-scrollbar-* pseudo-elements
// (Chrome/Edge/Safari). Applied to the mobile whole-grid scroll and
// "wordselect" below — the passage's own scroll region no longer lives
// here, it moved INTO PassageCard.tsx itself (still using this same
// .review-scroll class, since the class is global CSS, not scoped to
// this file) so its legend could get a fixed header the same way
// SelectedWordsCard.tsx's does — see PassageCard.tsx's own header
// comment.
//
// THEME-AWARE: the `.dark .review-scroll` overrides below switch the
// thumb from teal-500 to the lighter teal-400 for contrast against dark
// backgrounds — same ".dark <descendant>" selector pattern index.css
// already relies on for the page-level scrollbar (`.dark
// *::-webkit-scrollbar-thumb`), which works because the 'dark' class
// sits on <html> and every element in the tree is its descendant. No
// JS/theme-context wiring needed for this — it's a plain CSS rule that
// reacts to the same class Tailwind's own dark: variant already reads.
//
// HEIGHT BUDGET AS A PROP: the "how much fixed chrome sits above this
// component" number differs by which page hosts it — TeacherReviewAttempt.tsx
// (Send mode, via ProtectedLayout) has a back button and different
// wrapper padding than AssessmentSession.tsx (Now mode, via
// AssessmentSessionLayout), and each layout's own <main> uses a
// different pt-* at each breakpoint. A single hardcoded number here
// used to be calibrated for ONE specific caller (TeacherReviewAttempt.tsx)
// and silently wrong for the other — heightBudget is now an explicit
// prop with a { base (below lg), lg } shape so each caller supplies its
// own real, directly-summed numbers instead of this file guessing.
// Defaults below match TeacherReviewAttempt.tsx's values exactly, so
// that caller keeps working even if it forgets to pass the prop — but
// it passes it explicitly anyway, for the same "don't guess, keep it in
// sync" reason the original number was a direct sum in the first place.
//
// Every word starts defaulted to whatever's already been PERSISTED for
// it — teacher_verdict/teacher_manual_flag/teacher_error_type_override
// when a prior Save Draft (or a completed review) already wrote them,
// falling back to the system's own verdict/no-flag/no-override when
// nothing's been saved yet. This is what makes "Save Draft" actually
// work as save-for-later: reopening the same attempt resumes from the
// last saved state instead of starting over.
//
// "Needs attention" combines TWO independent signals: system-flagged
// (confidence === 'low') and MANUALLY flagged (a teacher tapping the
// "Needs Attention" button on any word).
//
// manualErrorType lets a teacher reclassify a MISCUE word's error type
// (Omission vs. Mispronunciation) via SelectedWordsCard's type picker.
//
// SAVE DRAFT vs CONFIRM RESULTS: both build the exact same
// WordReviewOverride[] payload (verdict + manual flag + error-type
// override for every word — see buildOverrides below) and hand it to
// their respective callback prop. The only difference is what the
// PARENT does with it: useSaveDraftMutation just writes the per-word
// columns and leaves the attempt as still-pending-review;
// useSubmitReviewMutation does the same write and then also marks the
// attempt reviewed. Save Draft skips the "are you sure" confirmation —
// it's non-destructive and meant to be tapped freely while working,
// unlike Confirm Results which is a one-way door.
//
// IMPERATIVE HANDLE (forwardRef): AssessmentSession.tsx needs to trigger
// a draft save from OUTSIDE this component tree — specifically from
// AssessmentSessionHeader.tsx's Exit button, a sibling component
// reached through a layout, not a parent — when the teacher exits mid-
// review. Rather than lifting all of verdicts/manualFlags/
// manualErrorType up into AssessmentSession.tsx just for that one case,
// this exposes a single saveDraftNow() escape hatch via useImperativeHandle.
// TeacherReviewAttempt.tsx (the other consumer) never passes a ref,
// which is fine — forwardRef makes the ref entirely optional.
//
// SELECTED-WORDS STACK: there's no separate "select mode" toggle.
// Tapping a word in the passage TOGGLES it: not yet in the stack adds
// it to the top (most-recently-tapped first) and smooth-scrolls
// SelectedWordsCard into view; already in the stack removes it instead
// (deselecting it from the passage ring highlight and pulling its card
// out of SelectedWordsCard) — see handleWordClick below. This used to
// just move an already-stacked word back to the top on re-tap instead
// of removing it; changed per explicit ask, since re-tapping a word you
// were done with had no way to get it back out of the stack short of
// Clear All. Each stacked word gets its own full Correct/Miscue/Needs-
// Attention controls right there in the card. Clearing the stack
// (SelectedWordsCard's Clear All button) only clears which words are
// being actively worked on — it does NOT touch any verdict/flag/
// override already set on them.
//
// BACK TO PASSAGE: an IntersectionObserver watches the passage card
// (#passage-card, set in PassageCard.tsx). Once it scrolls out of view —
// which happens easily on a phone, since the passage itself can be long —
// a floating button appears to scroll back up to it. MOBILE-ONLY
// (lg:hidden below) — on desktop the passage panel scrolls within its
// own bounded column instead of the page moving it out of view, so the
// button would just be dead UI there. Re-attached whenever the attempt
// changes, since a different attempt's word count can change the
// page's scroll height.
//
// AUDIO PLAYBACK: fetched here (useAttemptAudioUrlQuery, keyed off
// attempt.audio_path) and handed down to ResultsSummaryCard as a plain
// URL string — that card just renders an <audio> tag, it doesn't know
// or care that the URL is a signed Supabase Storage URL underneath.
//
// Tapping "Confirm Results" fires a swal confirmation before actually
// submitting — this action can't be undone (it flips the attempt to
// reviewed and writes a teacher_verdict for every word), so it's always
// worth a pause.
//
// onConfirm/onSaveDraft both hand back an override for EVERY word, not
// just the changed ones — see useSubmitReviewMutation's own comment for
// why that matters (Cohen's kappa agreement-rate tracking needs
// agreement recorded too, not only disagreement). The selected-words
// stack is NOT part of that payload — it's a reviewing aid only,
// nothing to persist.
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { ArrowUp, Save, Send } from 'lucide-react'
import { useLang } from '../../../../contexts/LangContext'
import { useTheme } from '../../../../contexts/ThemeContext'
import { showConfirmation } from '../../../../helpers/swalHelpers'
import type { AttemptDetail, AttemptWord, Verdict, WordReviewOverride } from '../hooks'
import { useAttemptAudioUrlQuery } from '../hooks'
import { STRINGS } from './attemptWordReviewStrings'
import { ResultsSummaryCard } from './ResultsSummaryCard'
import { PassageCard } from './PassageCard'
import { SelectedWordsCard } from './SelectedWordsCard'
// What AssessmentSessionHeader.tsx's Exit button calls (via a ref)
// during an active review, instead of showing its usual confirm dialog.
export type AttemptWordReviewHandle = {
    saveDraftNow: () => Promise<void>
}
// See this file's HEIGHT BUDGET AS A PROP comment above. base = below
// lg (1024px), lg = at/above lg. Both are the number of PIXELS of fixed
// chrome the host page renders above this component at that breakpoint
// — a direct sum of that page's own header/wrapper/back-button
// dimensions, not a guess.
export type AttemptWordReviewHeightBudget = {
    base: number
    lg: number
}
// Matches TeacherReviewAttempt.tsx's own numbers exactly (see this
// file's header comment) — kept as the default so that caller works
// even without explicitly passing the prop, though it passes it anyway.
const DEFAULT_HEIGHT_BUDGET: AttemptWordReviewHeightBudget = { base: 232, lg: 200 }
type AttemptWordReviewProps = {
    attempt: AttemptDetail
    words: AttemptWord[]
    onConfirm: (overrides: WordReviewOverride[]) => void
    confirming: boolean
    // Typed to allow either a fire-and-forget void handler or an async
    // one — TeacherReviewAttempt.tsx and AssessmentSession.tsx both pass
    // async functions today, and saveDraftNow (below) awaits whatever
    // comes back so an exit-triggered save actually finishes before the
    // page navigates away.
    onSaveDraft: (overrides: WordReviewOverride[]) => void | Promise<void>
    savingDraft: boolean
    studentName?: string | null
    heightBudget?: AttemptWordReviewHeightBudget
}
export const AttemptWordReview = forwardRef<AttemptWordReviewHandle, AttemptWordReviewProps>(function AttemptWordReview(
    { attempt, words, onConfirm, confirming, onSaveDraft, savingDraft, studentName, heightBudget = DEFAULT_HEIGHT_BUDGET },
    ref
) {
    const { lang } = useLang()
    const { theme } = useTheme()
    const t = STRINGS[lang]
    const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({})
    const [manualFlags, setManualFlags] = useState<Record<string, boolean>>({})
    const [manualErrorType, setManualErrorType] = useState<Record<string, AttemptWord['error_type']>>({})
    // Words currently stacked in SelectedWordsCard, most-recently-tapped
    // first. See handleWordClick below for the add/remove toggle logic.
    const [selectedWordIds, setSelectedWordIds] = useState<string[]>([])
    const [passageVisible, setPassageVisible] = useState(true)
    const audioUrlQuery = useAttemptAudioUrlQuery(attempt.audio_path)
    // Seeds every word from whatever's already been PERSISTED
    // (teacher_verdict/teacher_manual_flag/teacher_error_type_override,
    // written by a prior Save Draft or a completed review), falling back
    // to the system's own defaults when nothing's been saved yet — and
    // clears the selected-words stack, since that never persists.
    // Re-keyed off attempt.id so switching to a different attempt (the
    // review list flow) resets local state instead of carrying over a
    // previous attempt's edits/flags/overrides/stack.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVerdicts(Object.fromEntries(words.map((w) => [w.id, w.teacher_verdict ?? w.system_verdict])))
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setManualFlags(Object.fromEntries(words.filter((w) => w.teacher_manual_flag).map((w) => [w.id, true])))
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setManualErrorType(
            Object.fromEntries(
                words
                    .filter((w) => w.teacher_error_type_override != null)
                    .map((w) => [w.id, w.teacher_error_type_override as AttemptWord['error_type']])
            )
        )
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedWordIds([])
    }, [attempt.id, words])
    // Watches the passage card's visibility so the "Back to Passage"
    // floating button only shows once it's actually scrolled off-screen.
    // Re-attached per attempt.id — a fresh AttemptWordReview mount (a
    // different attempt loaded) means the element it needs to observe
    // may not have existed yet on the very first render.
    useEffect(() => {
        const el = document.getElementById('passage-card')
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => setPassageVisible(entry.isIntersecting),
            { threshold: 0 }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [attempt.id])
    const setVerdict = (wordId: string, verdict: Verdict) => {
        setVerdicts((prev) => ({ ...prev, [wordId]: verdict }))
    }
    const toggleManualFlag = (wordId: string) => {
        setManualFlags((prev) => ({ ...prev, [wordId]: !prev[wordId] }))
    }
    // Toggle behavior: clicking the currently-active type again clears
    // the override (reverts the word to whatever the system detected).
    const setErrorType = (wordId: string, errorType: 'Omission' | 'Mispronunciation') => {
        setManualErrorType((prev) => {
            const next = { ...prev }
            if (next[wordId] === errorType) {
                delete next[wordId]
            } else {
                next[wordId] = errorType
            }
            return next
        })
    }
    // Passage-side word click: TOGGLES the word in the stack. Already
    // stacked (checked against the current selectedWordIds before the
    // state update, since setSelectedWordIds is async) → removed, and
    // no scroll happens since there's nothing new to reveal. Not yet
    // stacked → added to the top, then SelectedWordsCard is scrolled
    // into view so the newly-added card is visible. No confirmation
    // dialog either way: this isn't destructive, just a small card
    // appearing/disappearing.
    const handleWordClick = (wordId: string) => {
        const alreadySelected = selectedWordIds.includes(wordId)
        setSelectedWordIds((prev) =>
            alreadySelected ? prev.filter((id) => id !== wordId) : [wordId, ...prev]
        )
        if (!alreadySelected) {
            document.getElementById('selected-words-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }
    const clearSelectedWords = () => setSelectedWordIds([])
    const scrollToPassage = () => {
        document.getElementById('passage-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // Shared by handleConfirm, handleSaveDraft, and saveDraftNow below —
    // every word, every time, not just the ones actually changed (see
    // this file's header comment for why). manualErrorType only ever
    // holds 'Omission' or 'Mispronunciation' values (setErrorType's own
    // signature restricts it to those two), so the cast below just
    // narrows the type back down from the wider AttemptWord['error_type']
    // the state uses.
    const buildOverrides = (): WordReviewOverride[] =>
        words.map((w) => ({
            wordId: w.id,
            verdict: verdicts[w.id] ?? w.system_verdict,
            manualFlag: !!manualFlags[w.id],
            errorTypeOverride: (manualErrorType[w.id] as 'Omission' | 'Mispronunciation' | undefined) ?? null,
        }))
    const handleConfirm = async () => {
        const confirmed = await showConfirmation(
            t.confirmDialogTitle,
            t.confirmDialogText,
            theme === 'dark',
            'question',
            t.confirmDialogConfirmButton
        )
        if (!confirmed) return
        onConfirm(buildOverrides())
    }
    // No confirmation dialog — Save Draft is non-destructive (it never
    // marks the attempt reviewed) and meant to be tapped freely while
    // still working through a review, unlike Confirm Results.
    const handleSaveDraft = () => {
        onSaveDraft(buildOverrides())
    }
    // The escape hatch AssessmentSessionHeader.tsx's Exit button uses
    // (via a ref held by AssessmentSession.tsx) to save the in-progress
    // review before navigating away — see this file's header comment.
    useImperativeHandle(ref, () => ({
        saveDraftNow: async () => {
            await onSaveDraft(buildOverrides())
        },
    }))
    const hasWords = words.length > 0
    return (
        <div className="flex flex-col gap-6">
            {hasWords && (
                // Scoped by the unique .attempt-word-review-grid class
                // name and .review-scroll class below. See this file's
                // header comment for the full explanation of the height
                // budget, why below-lg now also gets a bounded height +
                // scroll, and why "left" now gets its OWN explicit
                // height + a fixed-header/scrollable-body flex split
                // instead of relying on the grid's row-span math.
                <style>{`
                    .attempt-word-review-grid {
                        display: grid;
                        gap: 1.5rem;
                        grid-template-areas: "left" "buttons" "wordselect";
                    }
                    @media (max-width: 1023px) {
                        .attempt-word-review-grid {
                            height: calc(100vh - ${heightBudget.base}px);
                            overflow-y: auto;
                        }
                    }
                    @media (min-width: 1024px) {
                        .attempt-word-review-grid {
                            grid-template-columns: 1.3fr 1fr;
                            grid-template-rows: minmax(0, 1fr) auto;
                            align-items: stretch;
                            grid-template-areas: "left wordselect" "left buttons";
                            height: calc(100vh - ${heightBudget.lg}px);
                        }
                        .attempt-word-review-left {
                            height: calc(100vh - ${heightBudget.lg}px);
                        }
                    }
                    .review-scroll {
                        scrollbar-width: thin;
                        scrollbar-color: rgba(20, 184, 166, 0.55) transparent;
                    }
                    .review-scroll::-webkit-scrollbar {
                        width: 8px;
                    }
                    .review-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .review-scroll::-webkit-scrollbar-thumb {
                        background-color: rgba(20, 184, 166, 0.55);
                        border-radius: 9999px;
                    }
                    .review-scroll::-webkit-scrollbar-thumb:hover {
                        background-color: rgba(20, 184, 166, 0.8);
                    }
                    /* Dark-mode thumb: same ".dark <descendant>" pattern
                    index.css already uses for the page-level scrollbar
                    (.dark *::-webkit-scrollbar-thumb) — the 'dark' class
                    lives on <html>, so every element including this one
                    is a match for ".dark .review-scroll". Shifted to
                    teal-400 (lighter/more saturated) instead of teal-500,
                    for contrast against dark backgrounds. */
                    .dark .review-scroll {
                        scrollbar-color: rgba(45, 212, 191, 0.55) transparent;
                    }
                    .dark .review-scroll::-webkit-scrollbar-thumb {
                        background-color: rgba(45, 212, 191, 0.55);
                    }
                    .dark .review-scroll::-webkit-scrollbar-thumb:hover {
                        background-color: rgba(45, 212, 191, 0.8);
                    }
                `}</style>
            )}
            <div className={hasWords ? 'attempt-word-review-grid review-scroll' : 'flex flex-col gap-6'}>
                <div
                    style={{ gridArea: hasWords ? 'left' : undefined }}
                    className="attempt-word-review-left flex flex-col gap-6 lg:min-h-0"
                >
                    {/* Never compressible — this is what stops the
                    audio player (inside ResultsSummaryCard) from being
                    squeezed/cut off. A plain flex child would otherwise
                    shrink below its natural size to help "left" fit,
                    instead of the passage wrapper below giving up its
                    own space first. */}
                    <div className="shrink-0">
                        <ResultsSummaryCard
                            attempt={attempt}
                            studentName={studentName}
                            words={words}
                            manualFlags={manualFlags}
                            t={t}
                            audioUrl={audioUrlQuery.data ?? null}
                        />
                    </div>
                    {/* Just sizing here now — flex-1 lets this wrapper
                    take whatever's left after the results card above,
                    min-h-0 overrides the default min-height:auto that
                    would otherwise let it grow past that space. The
                    ACTUAL scrolling (and its own fixed legend header)
                    now lives inside PassageCard.tsx itself — see that
                    file's own header comment — mirroring
                    SelectedWordsCard.tsx's header/scrolling-body split,
                    per explicit ask to make the legend behave the same
                    way. lg-only: below lg the whole grid scrolls as one
                    unit instead (see MOBILE SCROLL FIX above), so this
                    stays a plain block there and PassageCard's own
                    header/body split just lays out normally with no
                    internal scroll of its own. */}
                    <div className="lg:min-h-0 lg:flex-1">
                        <PassageCard
                            words={words}
                            verdicts={verdicts}
                            manualFlags={manualFlags}
                            manualErrorType={manualErrorType}
                            selectedWordIds={selectedWordIds}
                            t={t}
                            onWordClick={handleWordClick}
                        />
                    </div>
                </div>
                {hasWords && (
                    <div style={{ gridArea: 'wordselect' }} className="review-scroll lg:min-h-0 lg:overflow-y-auto">
                        <SelectedWordsCard
                            words={words}
                            selectedWordIds={selectedWordIds}
                            verdicts={verdicts}
                            manualFlags={manualFlags}
                            manualErrorType={manualErrorType}
                            t={t}
                            onSetVerdict={setVerdict}
                            onToggleManualFlag={toggleManualFlag}
                            onSetErrorType={setErrorType}
                            onClearAll={clearSelectedWords}
                        />
                    </div>
                )}
                <div style={{ gridArea: hasWords ? 'buttons' : undefined }}>
                    {/* Its own bordered/shadowed container, distinct from
                    the other panels, per explicit ask — these two
                    buttons act on the whole review, not on any one panel
                    alone. Sized to its own content (grid row is `auto`),
                    never part of the scrolling 1fr row at lg, and — post
                    MOBILE SCROLL FIX — reachable below lg by scrolling
                    the whole grid down to it, instead of being
                    unreachable past whatever got clipped above it. */}
                    <div className="flex flex-col gap-2 rounded-3xl border border-gray-900/5 bg-white/60 p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-900/40 sm:flex-row">
                        <button
                            onClick={handleSaveDraft}
                            disabled={savingDraft || !hasWords}
                            className={`flex items-center justify-center gap-2 rounded-full border-2 border-teal-500/40 px-5 py-3 text-sm font-bold text-teal-700 transition-colors duration-150 dark:border-teal-400/30 dark:text-teal-300 ${
                                savingDraft || !hasWords
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer hover:bg-teal-500/10 dark:hover:bg-teal-400/10'
                            }`}
                        >
                            <Save size={16} />
                            {savingDraft ? t.savingDraftLabel : t.saveDraftLabel}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={confirming || !hasWords}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59] ${
                                confirming || !hasWords ? 'cursor-not-allowed opacity-50 hover:translate-y-0' : 'cursor-pointer'
                            }`}
                        >
                            <Send size={17} />
                            {confirming ? t.confirming : t.confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
            {hasWords && !passageVisible && (
                <button
                    onClick={scrollToPassage}
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-teal-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform duration-150 hover:-translate-y-0.5 dark:bg-teal-600 lg:hidden"
                >
                    <ArrowUp size={16} />
                    {t.backToPassageLabel}
                </button>
            )}
        </div>
    )
})