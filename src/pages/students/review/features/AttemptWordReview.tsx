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
// LAYOUT (mobile, below lg): plain stacked grid, one column — order is
// summary+passage ("left"), buttons, then the selected-words stack
// ("wordselect") — unbounded height, the page just flows and grows
// normally, same as any other page.
//
// LAYOUT (lg and up): a HEIGHT-BOUNDED two-column grid —
// height: calc(100vh - 200px) — with "left" (summary+passage) spanning
// both rows in column 1, "wordselect" in column 1 of row 1... sorry,
// column 2 row 1, and "buttons" in column 2 row 2, sized to its own
// content (grid-template-rows: minmax(0,1fr) auto). Both "left" and
// "wordselect" get their own lg:overflow-y-auto so a long passage or a
// long selected-words stack scrolls WITHIN its own column, instead of
// growing the whole layout taller than its bounded height.
//
// WHY BOUNDED AT ALL: ProtectedLayout.tsx's <main> is `overflow-hidden`
// and effectively pinned to viewport height (fixed header, flex-1 in a
// min-h-screen column) — there is NO page-level scrollbar anywhere in
// this app shell. Anything taller than <main>'s box doesn't scroll, it
// just gets silently clipped and becomes unreachable. That's exactly
// what was happening to the Save Draft/Confirm Results buttons once the
// passage or the selected-words stack got tall enough. The 200px in the
// calc() above is the exact sum of every fixed vertical space this page
// spends before AttemptWordReview even starts rendering: <main>'s own
// lg:pt-20 (80px) + its p-4-derived bottom padding (16px) +
// TeacherReviewAttempt's wrapper pt-2/pb-12 (8px + 48px) + its back
// button's own height plus mb-4 (48px) = 200px. If any of those
// classNames change on TeacherReviewAttempt.tsx or its back button, this
// number needs to change with them — it is NOT a guess, it's a direct
// sum of those exact Tailwind values, so keep it in sync rather than
// re-guessing it.
//
// This fix is intentionally scoped to THIS page only — ProtectedLayout's
// shared <main> was left untouched (it affects every page in the app),
// per explicit decision to avoid touching shared layout for a problem
// that, so far, has only been reported here.
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
// Tapping any word in the passage adds it to selectedWordIds (most-
// recently-tapped first) and smooth-scrolls SelectedWordsCard into
// view; tapping a word that's already in the stack just moves it back
// to the top instead of adding a duplicate. Each stacked word gets its
// own full Correct/Miscue/Needs-Attention controls right there in the
// card. Clearing the stack (SelectedWordsCard's Clear All button) only
// clears which words are being actively worked on — it does NOT touch
// any verdict/flag/override already set on them.
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
}
export const AttemptWordReview = forwardRef<AttemptWordReviewHandle, AttemptWordReviewProps>(function AttemptWordReview(
    { attempt, words, onConfirm, confirming, onSaveDraft, savingDraft, studentName },
    ref
) {
    const { lang } = useLang()
    const { theme } = useTheme()
    const t = STRINGS[lang]
    const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({})
    const [manualFlags, setManualFlags] = useState<Record<string, boolean>>({})
    const [manualErrorType, setManualErrorType] = useState<Record<string, AttemptWord['error_type']>>({})
    // Words currently stacked in SelectedWordsCard, most-recently-tapped
    // first. See handleWordClick below for the add/move-to-top logic.
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
    // Passage-side word click: adds the word to the top of the stack, or
    // — if it's already stacked — moves it back to the top instead of
    // duplicating it. Then scrolls SelectedWordsCard into view. No
    // confirmation dialog: this isn't destructive, just a small card
    // updating.
    const handleWordClick = (wordId: string) => {
        setSelectedWordIds((prev) => [wordId, ...prev.filter((id) => id !== wordId)])
        document.getElementById('selected-words-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
                // name below. See this file's header comment for the
                // full explanation of the height budget and why each
                // column needs its own overflow-y-auto.
                <style>{`
                    .attempt-word-review-grid {
                        display: grid;
                        gap: 1.5rem;
                        grid-template-areas: "left" "buttons" "wordselect";
                    }
                    @media (min-width: 1024px) {
                        .attempt-word-review-grid {
                            grid-template-columns: 1.3fr 1fr;
                            grid-template-rows: minmax(0, 1fr) auto;
                            align-items: stretch;
                            grid-template-areas: "left wordselect" "left buttons";
                            height: calc(100vh - 200px);
                        }
                    }
                `}</style>
            )}
            <div className={hasWords ? 'attempt-word-review-grid' : 'flex flex-col gap-6'}>
                <div
                    style={{ gridArea: hasWords ? 'left' : undefined }}
                    className="flex flex-col gap-6 lg:min-h-0 lg:overflow-y-auto lg:pr-1"
                >
                    <ResultsSummaryCard
                        attempt={attempt}
                        studentName={studentName}
                        words={words}
                        manualFlags={manualFlags}
                        t={t}
                        audioUrl={audioUrlQuery.data ?? null}
                    />
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
                {hasWords && (
                    <div style={{ gridArea: 'wordselect' }} className="lg:min-h-0">
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
                    never part of the scrolling 1fr row, so it's always
                    inside the bounded height above. */}
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