// File: src/pages/students/review/features/AttemptWordReview.tsx
//
// Orchestrator for the shared word-by-word review UI — used both
// inline, right after a "Now" mode session (from AssessmentSession.tsx),
// and standalone on the "Send"-mode review page (TeacherReviewAttempt.tsx).
// Holds all the local state (verdicts, manual flags, manual error-type
// overrides, select mode, selection, jump-highlight, passage visibility)
// and hands it down to PassageCard (left) and WordListCard (right),
// which do the actual rendering — including the Confirm Results and
// Save Draft buttons, which live inside PassageCard now (below its
// select/action bar) rather than floating outside both cards. Kept as
// one component tree specifically so both flows produce identical
// review data instead of two implementations quietly drifting apart.
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
// (Omission vs. Mispronunciation) via WordListCard's type picker.
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
// SELECT MODE: off by default. PassageCard's bar starts as a single
// "Select Words" button; turning it on changes what a click does in
// both cards at once — passage words toggle selection instead of
// jumping to the list, list rows become clickable (not just their
// checkbox) to toggle selection, and the bar itself becomes the bulk
// Correct/Miscue/Clear/Done controls. See PassageCard.tsx and
// WordListCard.tsx for the click-handling details.
//
// JUMP CONFIRMATION: outside select mode, tapping a passage word jumps/
// scrolls to its row in the list. On a STACKED layout (below the `lg`
// breakpoint — the same 1024px cutoff the two-column grid below already
// switches on) the list sits below the passage, so jumping yanks the
// passage off-screen with no warning — that's when this asks first (the
// same showConfirmation swal used for Confirm Results), only jumping if
// confirmed. On a desktop/two-column layout both panels are already on
// screen at once, so jumping is just a scroll-into-view within the
// visible list — no disorientation, so it jumps immediately with no
// dialog. isDesktopLayout tracks that breakpoint live via matchMedia so
// it updates on resize/rotation, not just on initial mount.
// Select-mode's tap-to-select behavior is untouched either way, since
// that's a deliberate rapid-fire action, not a one-off navigation.
//
// BACK TO PASSAGE: an IntersectionObserver watches the passage card
// (#passage-card, set in PassageCard.tsx). Once it scrolls out of view —
// which happens easily on a phone, since jumping into a long list can
// leave the passage far above the fold — a floating button appears to
// scroll back up to it. Re-attached whenever the attempt changes, since
// a different attempt's word count can change the page's scroll height.
//
// AUDIO PLAYBACK: fetched here (useAttemptAudioUrlQuery, keyed off
// attempt.audio_path) and handed down to PassageCard as a plain URL
// string — PassageCard just renders an <audio> tag, it doesn't know or
// care that the URL is a signed Supabase Storage URL underneath.
//
// Tapping "Confirm Results" fires the same swal confirmation before
// actually submitting, regardless of layout — this action can't be
// undone (it flips the attempt to reviewed and writes a teacher_verdict
// for every word), so it's always worth a pause, desktop or not.
//
// onConfirm/onSaveDraft both hand back an override for EVERY word, not
// just the changed ones — see useSubmitReviewMutation's own comment for
// why that matters (Cohen's kappa agreement-rate tracking needs
// agreement recorded too, not only disagreement). Select-mode/selection
// state is NOT part of that payload — it's a reviewing aid only,
// nothing to persist.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useLang } from '../../../../contexts/LangContext'
import { useTheme } from '../../../../contexts/ThemeContext'
import { showConfirmation } from '../../../../helpers/swalHelpers'
import type { AttemptDetail, AttemptWord, Verdict, WordReviewOverride } from '../hooks'
import { useAttemptAudioUrlQuery } from '../hooks'
import { STRINGS } from './attemptWordReviewStrings'
import { PassageCard } from './PassageCard'
import { WordListCard } from './WordListCard'
// Same cutoff as the `lg:` breakpoint on the two-column grid below
// (Tailwind's default `lg` is 1024px) — kept as its own constant so the
// media query and the grid class can't silently drift out of sync if
// one gets tweaked and not the other.
const DESKTOP_LAYOUT_QUERY = '(min-width: 1024px)'
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
    const [selectMode, setSelectMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
    const [highlightedId, setHighlightedId] = useState<string | null>(null)
    const [passageVisible, setPassageVisible] = useState(true)
    // Initialized straight from matchMedia (not a default + effect) so
    // the very first render already knows the real layout instead of
    // guessing desktop and flickering into mobile behavior a tick later.
    const [isDesktopLayout, setIsDesktopLayout] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_LAYOUT_QUERY).matches
    )
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const audioUrlQuery = useAttemptAudioUrlQuery(attempt.audio_path)
    // Keeps isDesktopLayout live across resizes/rotation — a teacher
    // resizing a browser window or rotating a tablet mid-review should
    // immediately get the right jump behavior, not whatever was true at
    // mount. The listener callback runs outside React's render/effect
    // cycle (it's a DOM event, not a synchronous effect body), so this
    // setState doesn't need the set-state-in-effect suppression comment.
    useEffect(() => {
        const mql = window.matchMedia(DESKTOP_LAYOUT_QUERY)
        const handleChange = (e: MediaQueryListEvent) => setIsDesktopLayout(e.matches)
        mql.addEventListener('change', handleChange)
        return () => mql.removeEventListener('change', handleChange)
    }, [])
    // Seeds every word from whatever's already been PERSISTED
    // (teacher_verdict/teacher_manual_flag/teacher_error_type_override,
    // written by a prior Save Draft or a completed review), falling back
    // to the system's own defaults when nothing's been saved yet — and
    // clears select mode + the selection, since those never persist.
    // Re-keyed off attempt.id so switching to a different attempt (the
    // review list flow) resets local state instead of carrying over a
    // previous attempt's edits/flags/overrides/selection.
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
        setSelectMode(false)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedIds({})
    }, [attempt.id, words])
    useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current != null) clearTimeout(highlightTimeoutRef.current)
        }
    }, [])
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
    const toggleSelect = (wordId: string) => {
        setSelectedIds((prev) => ({ ...prev, [wordId]: !prev[wordId] }))
    }
    const clearSelection = () => setSelectedIds({})
    const enterSelectMode = () => setSelectMode(true)
    const exitSelectMode = () => {
        setSelectMode(false)
        clearSelection()
    }
    // Applies one verdict to every currently-selected word, then clears
    // the selection so the bar resets and the teacher can immediately
    // start a fresh selection for the next batch.
    const bulkSetVerdict = (verdict: Verdict) => {
        setVerdicts((prev) => {
            const next = { ...prev }
            for (const id of Object.keys(selectedIds)) {
                if (selectedIds[id]) next[id] = verdict
            }
            return next
        })
        clearSelection()
    }
    const jumpToWordRow = (wordId: string) => {
        if (highlightTimeoutRef.current != null) clearTimeout(highlightTimeoutRef.current)
        setHighlightedId(wordId)
        document.getElementById(`word-row-${wordId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        highlightTimeoutRef.current = setTimeout(() => setHighlightedId(null), 1600)
    }
    // Passage-side word click: in select mode it only toggles that
    // word's selection (no confirmation either way — that's a
    // deliberate rapid-fire action, not a one-off navigation). Outside
    // select mode, on a DESKTOP/two-column layout both the passage and
    // the list are already visible at once, so it just jumps straight
    // there — nothing disorienting to warn about. Only on a STACKED
    // layout (list below the passage) does it ask for confirmation
    // first, since that scroll can yank the passage off-screen with no
    // warning on a small screen.
    const handleWordClick = async (wordId: string) => {
        if (selectMode) {
            toggleSelect(wordId)
            return
        }
        if (isDesktopLayout) {
            jumpToWordRow(wordId)
            return
        }
        const word = words.find((w) => w.id === wordId)
        const label = (word ? (word.error_type === 'Insertion' ? word.recognized_word : word.reference_word) : '') ?? ''
        const confirmed = await showConfirmation(
            t.jumpDialogTitle(label),
            t.jumpDialogText,
            theme === 'dark',
            'question',
            t.jumpDialogConfirmButton
        )
        if (!confirmed) return
        jumpToWordRow(wordId)
    }
    // List-row click: only active in select mode (WordListCard's row
    // buttons stopPropagation so clicking them doesn't also toggle it).
    const handleRowClick = (wordId: string) => {
        if (selectMode) toggleSelect(wordId)
    }
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
    return (
        <div className="flex flex-col gap-6">
            <div className={words.length > 0 ? 'grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start' : ''}>
                <PassageCard
                    attempt={attempt}
                    studentName={studentName}
                    words={words}
                    verdicts={verdicts}
                    manualFlags={manualFlags}
                    manualErrorType={manualErrorType}
                    selectedIds={selectedIds}
                    selectMode={selectMode}
                    t={t}
                    confirming={confirming}
                    savingDraft={savingDraft}
                    audioUrl={audioUrlQuery.data ?? null}
                    onWordClick={handleWordClick}
                    onEnterSelectMode={enterSelectMode}
                    onExitSelectMode={exitSelectMode}
                    onBulkSetVerdict={bulkSetVerdict}
                    onClearSelection={clearSelection}
                    onConfirm={handleConfirm}
                    onSaveDraft={handleSaveDraft}
                />
                {words.length > 0 && (
                    <WordListCard
                        words={words}
                        verdicts={verdicts}
                        manualFlags={manualFlags}
                        manualErrorType={manualErrorType}
                        selectedIds={selectedIds}
                        selectMode={selectMode}
                        highlightedId={highlightedId}
                        t={t}
                        onSetVerdict={setVerdict}
                        onToggleManualFlag={toggleManualFlag}
                        onSetErrorType={setErrorType}
                        onRowClick={handleRowClick}
                    />
                )}
            </div>
            {words.length > 0 && !passageVisible && (
                <button
                    onClick={scrollToPassage}
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-teal-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform duration-150 hover:-translate-y-0.5 dark:bg-teal-600"
                >
                    <ArrowUp size={16} />
                    {t.backToPassageLabel}
                </button>
            )}
        </div>
    )
})