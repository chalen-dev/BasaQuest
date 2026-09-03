// File: AttemptWordReview.tsx
// File: AttemptWordReview.tsx
// File: AttemptWordReview.tsx
// File: AttemptWordReview.tsx
// File: src/pages/students/review/features/AttemptWordReview.tsx
//
// Orchestrator for the shared word-by-word review UI — used both
// inline, right after a "Now" mode session (from AssessmentSession.tsx),
// and standalone on the "Send"-mode review page (TeacherReviewAttempt.tsx).
//
// DRAGGABLE DIVIDER (this pass, replaces an earlier button-based
// expand/collapse toggle that didn't feel right): a full-width,
// clearly-visible horizontal drag bar sits between ResultsSummaryCard
// and PassageCard inside the "left" column, lg breakpoint only (below
// lg there's no fixed-height column to resize within — the whole grid
// scrolls as one unit, so a drag handle there wouldn't mean anything).
// Dragging it up/down resizes ResultsSummaryCard's wrapper directly via
// an explicit pixel height (`summaryHeight` state, null = natural/
// default size); PassageCard's wrapper is always flex-1, so it
// automatically fills whatever's left. Bounds:
//   - LOWER bound: the live-measured height needed to show EXACTLY
//     ResultsSummaryCard's title+student-name row and nothing past it
//     — see MEASURED MINIMUM below. Dragging down that far shows just
//     that row; the scores row and everything after it scrolls out of
//     view.
//   - UPPER bound: the SMALLER of (a) ResultsSummaryCard's own natural
//     full content height (its scrollHeight — so the bar can't be
//     dragged past the card's actual size into empty space) and (b)
//     whatever leaves PassageCard at least MIN_PASSAGE_HEIGHT_PX,
//     measured live against the "left" column's own actual height
//     (leftColumnRef) at drag-start time.
// Both bounds are measured fresh at drag-start, so this works
// correctly across different heightBudget values/screen sizes and
// different attempts (different score counts, flag badge text length,
// recording vs no-recording block, etc) without hardcoding a total.
// Double-clicking the divider resets to the natural default split
// (summaryHeight back to null). Neither card component needs to know
// any of this beyond ResultsSummaryCard forwarding one ref to its
// title/name row purely for measurement (see below) — its wrapper gets
// `overflow-y-auto` + the shared `.review-scroll` styling, so when
// dragged smaller than its natural content, it just becomes its own
// small internally-scrollable box rather than being clipped or needing
// a "collapsed" render mode.
//
// MEASURED MINIMUM (minSummaryHeight): NOT just the header row's own
// height — that alone would ignore the card's top padding above it,
// undershooting. Instead this measures the header row's position
// RELATIVE TO summaryContentRef (the direct wrapper around
// ResultsSummaryCard's rendered output, i.e. effectively the card's
// own top edge): topOffset (= card's top padding, since the header row
// is the card's first child) + the header row's own height + a bottom
// buffer approximating the card's bottom padding. This is deliberately
// NOT floored against any hardcoded constant — MIN_SUMMARY_HEIGHT_PX
// below is only the INITIAL state value used for the split second
// before the first real measurement lands, never a lower bound applied
// on top of a real measurement. Recomputed live any time the header
// row's size changes (student name appearing/disappearing, a long
// passage title wrapping, font load, viewport resize, etc), and nudges
// summaryHeight up if it's now below the freshly measured minimum so
// the row never gets clipped.
//
// MEASURED NATURAL MAXIMUM (naturalSummaryHeightRef): a second
// ResizeObserver watches the ResultsSummaryCard's own content element
// (summaryContentRef, the direct child of the scrollable wrapper) and
// keeps its natural scrollHeight in a ref, read at drag-start so the
// bar's upper bound never exceeds the card's real full size.
//
// LAYOUT (below lg — see MOBILE SCROLL FIX below): a HEIGHT-BOUNDED
// single-column stack — height: calc(100vh - heightBudget.base px) —
// with grid-template-areas: "left" "buttons" "wordselect", and
// overflow-y: auto on the GRID ITSELF.
//
// LAYOUT (lg and up): a HEIGHT-BOUNDED two-column grid —
// height: calc(100vh - heightBudget.lg px) — "left" spans both rows in
// column 1, "wordselect" in column 2 row 1, "buttons" in column 2 row 2.
//
// WHY BOUNDED AT ALL: ProtectedLayout.tsx's <main> (and
// AssessmentSessionLayout.tsx's own <main>) is `overflow-hidden` and
// effectively pinned to viewport height — there is NO page-level
// scrollbar anywhere in this app shell, at ANY viewport width.
//
// MOBILE SCROLL FIX: below-lg gets the same bounded-height +
// overflow-y-auto treatment lg has, scoped to the whole grid as one
// scrollable unit.
//
// VISIBLE SCROLLBAR (.review-scroll): forces a thin, always-visible
// teal-tinted scrollbar, with a dark-mode thumb override.
//
// HEIGHT BUDGET AS A PROP: TeacherReviewAttempt.tsx (Send mode) and
// AssessmentSession.tsx (Now mode) render different fixed chrome above
// this component, so heightBudget is an explicit { base, lg } prop.
//
// Every word starts defaulted to whatever's already been PERSISTED for
// it. "Needs attention" combines system-flagged (confidence === 'low')
// and MANUALLY flagged.
//
// CORRECT CLEARS THE MANUAL FLAG + TYPE OVERRIDE: setVerdict clears
// both whenever the new verdict is 'correct'.
//
// SAVE DRAFT vs CONFIRM RESULTS vs DISCARD: Save Draft and Confirm
// Results both build the same WordReviewOverride[] payload. DISCARD
// takes no payload — it permanently deletes the attempt, word rows,
// and recording.
//
// CTRL+S / CMD+S SAVE SHORTCUT, UNSAVED-CHANGES REMINDER TOAST, LAST
// SAVED LABEL, IMPERATIVE HANDLE, SELECTED-WORDS STACK, BACK TO
// PASSAGE, AUDIO PLAYBACK — all unchanged from before; see inline
// comments at each.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ArrowUp, GripHorizontal, Save, Send, Trash2 } from 'lucide-react'
import { useLang } from '../../../../contexts/LangContext'
import { useTheme } from '../../../../contexts/ThemeContext'
import { showConfirmation, showToast } from '../../../../helpers/swalHelpers'
import type { AttemptDetail, AttemptWord, Verdict, WordReviewOverride } from '../hooks'
import { useAttemptAudioUrlQuery } from '../hooks'
import { STRINGS, type AttemptWordReviewStrings } from './attemptWordReviewStrings'
import { ResultsSummaryCard } from './ResultsSummaryCard'
import { PassageCard } from './PassageCard'
import { SelectedWordsCard } from './SelectedWordsCard'
export type AttemptWordReviewHandle = {
    saveDraftNow: () => Promise<void>
}
export type AttemptWordReviewHeightBudget = {
    base: number
    lg: number
}
const DEFAULT_HEIGHT_BUDGET: AttemptWordReviewHeightBudget = { base: 232, lg: 200 }
const REMINDER_INTERVAL_MS = 4 * 60 * 1000
const LAST_SAVED_TICK_MS = 20 * 1000
const isMacPlatform = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
// DRAGGABLE DIVIDER constants — see this file's header comment.
// MIN_SUMMARY_HEIGHT_PX is ONLY the initial state value before the
// first live measurement lands — it is never applied as a floor on
// top of a real measurement (that was the bug: it used to win via
// Math.max, forcing the minimum taller than the header row actually
// needed and leaking the scores row into view even at "minimum").
const MIN_SUMMARY_HEIGHT_PX = 92
const MIN_PASSAGE_HEIGHT_PX = 180
const DIVIDER_ROW_HEIGHT_PX = 28
const LEFT_COLUMN_GAP_PX = 12 // matches the gap-3 class on the "left" column
// Approximates ResultsSummaryCard's own bottom padding (p-4 / sm:p-5)
// so the measured minimum includes room to breathe under the row,
// same as its natural padding would.
const SUMMARY_CARD_BOTTOM_PADDING_PX = 12
function latestTeacherReviewedAt(words: AttemptWord[]): Date | null {
    let latest: Date | null = null
    for (const w of words) {
        if (!w.teacher_reviewed_at) continue
        const d = new Date(w.teacher_reviewed_at)
        if (!latest || d > latest) latest = d
    }
    return latest
}
function formatLastSaved(lastSavedAt: Date | null, nowMs: number, t: AttemptWordReviewStrings): string {
    if (!lastSavedAt) return t.lastSavedNever
    const diffMs = nowMs - lastSavedAt.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    if (diffMinutes < 1) return t.lastSavedJustNow
    if (diffMinutes < 60) return t.lastSavedMinutesAgo(diffMinutes)
    return t.lastSavedHoursAgo(Math.floor(diffMinutes / 60))
}
type AttemptWordReviewProps = {
    attempt: AttemptDetail
    words: AttemptWord[]
    onConfirm: (overrides: WordReviewOverride[]) => void
    confirming: boolean
    onSaveDraft: (overrides: WordReviewOverride[]) => void | Promise<void>
    savingDraft: boolean
    onDiscard: () => void | Promise<void>
    discarding: boolean
    studentName?: string | null
    heightBudget?: AttemptWordReviewHeightBudget
}
export const AttemptWordReview = forwardRef<AttemptWordReviewHandle, AttemptWordReviewProps>(function AttemptWordReview(
    { attempt, words, onConfirm, confirming, onSaveDraft, savingDraft, onDiscard, discarding, studentName, heightBudget = DEFAULT_HEIGHT_BUDGET },
    ref
) {
    const { lang } = useLang()
    const { theme } = useTheme()
    const t = STRINGS[lang]
    const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({})
    const [manualFlags, setManualFlags] = useState<Record<string, boolean>>({})
    const [manualErrorType, setManualErrorType] = useState<Record<string, AttemptWord['error_type']>>({})
    const [selectedWordIds, setSelectedWordIds] = useState<string[]>([])
    const [passageVisible, setPassageVisible] = useState(true)
    const hasUnsavedChangesRef = useRef(false)
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
    const [lastSavedTick, setLastSavedTick] = useState(0)
    const audioUrlQuery = useAttemptAudioUrlQuery(attempt.audio_path)
    // DRAGGABLE DIVIDER state — see this file's header comment.
    // null = natural/default size for ResultsSummaryCard (today's
    // original always-full behavior); a number = an explicit pixel
    // height the teacher dragged it to.
    const [summaryHeight, setSummaryHeight] = useState<number | null>(null)
    const [isDraggingDivider, setIsDraggingDivider] = useState(false)
    // Live-measured "just the title+name row" height — see MEASURED
    // MINIMUM in this file's header comment.
    const [minSummaryHeight, setMinSummaryHeight] = useState<number>(MIN_SUMMARY_HEIGHT_PX)
    const leftColumnRef = useRef<HTMLDivElement>(null)
    const summaryWrapperRef = useRef<HTMLDivElement>(null)
    const summaryContentRef = useRef<HTMLDivElement>(null)
    const headerRowRef = useRef<HTMLDivElement>(null)
    // Live-measured natural full height of the summary card's content —
    // see MEASURED NATURAL MAXIMUM in this file's header comment. A ref
    // (not state) since it's only read at drag-start, not rendered.
    const naturalSummaryHeightRef = useRef<number>(0)
    const dragStartRef = useRef<{ startY: number; startHeight: number; leftColumnHeight: number; naturalHeight: number } | null>(null)
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
        hasUnsavedChangesRef.current = false
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLastSavedAt(latestTeacherReviewedAt(words))
        // A different attempt loading in starts back at the default
        // split rather than carrying over a size the teacher dragged
        // for the PREVIOUS attempt.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSummaryHeight(null)
    }, [attempt.id, words])
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
    useEffect(() => {
        const interval = setInterval(() => {
            if (!hasUnsavedChangesRef.current) return
            showToast(t.unsavedReminderToast, 'info', theme === 'dark', { timer: 5000 })
        }, REMINDER_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [attempt.id, t, theme])
    useEffect(() => {
        const interval = setInterval(() => setLastSavedTick((n) => n + 1), LAST_SAVED_TICK_MS)
        return () => clearInterval(interval)
    }, [])
    // MEASURED MINIMUM — see this file's header comment for why this is
    // topOffset + headerRow.height + bottom buffer, with NO floor
    // against MIN_SUMMARY_HEIGHT_PX.
    useEffect(() => {
        const headerEl = headerRowRef.current
        if (!headerEl || typeof ResizeObserver === 'undefined') return
        const recompute = () => {
            const headerRect = headerEl.getBoundingClientRect()
            const contentRect = summaryContentRef.current?.getBoundingClientRect()
            const topOffset = contentRect ? Math.max(0, headerRect.top - contentRect.top) : 0
            const next = Math.round(topOffset + headerRect.height + SUMMARY_CARD_BOTTOM_PADDING_PX)
            setMinSummaryHeight(next)
            setSummaryHeight((prev) => (prev != null && prev < next ? next : prev))
        }
        recompute()
        const observer = new ResizeObserver(recompute)
        observer.observe(headerEl)
        window.addEventListener('resize', recompute)
        return () => {
            observer.disconnect()
            window.removeEventListener('resize', recompute)
        }
    }, [attempt.id, studentName])
    // MEASURED NATURAL MAXIMUM — watches the summary card's own content
    // element (its true, un-clamped height) so the drag bar can never be
    // pulled past the card's real full size into dead empty space. Kept
    // in a ref (read at drag-start) rather than state, since it doesn't
    // need to trigger a re-render on its own.
    useEffect(() => {
        const contentEl = summaryContentRef.current
        if (!contentEl || typeof ResizeObserver === 'undefined') return
        const recompute = () => {
            naturalSummaryHeightRef.current = contentEl.getBoundingClientRect().height
        }
        recompute()
        const observer = new ResizeObserver(recompute)
        observer.observe(contentEl)
        return () => observer.disconnect()
    }, [attempt.id, studentName])
    // Prevents text-selection artifacts elsewhere on the page while
    // actively dragging the divider.
    useEffect(() => {
        if (!isDraggingDivider) return
        const prev = document.body.style.userSelect
        document.body.style.userSelect = 'none'
        return () => {
            document.body.style.userSelect = prev
        }
    }, [isDraggingDivider])
    const setVerdict = (wordId: string, verdict: Verdict) => {
        setVerdicts((prev) => ({ ...prev, [wordId]: verdict }))
        hasUnsavedChangesRef.current = true
        if (verdict === 'correct') {
            setManualFlags((prev) => {
                if (!prev[wordId]) return prev
                const next = { ...prev }
                delete next[wordId]
                return next
            })
            setManualErrorType((prev) => {
                if (!(wordId in prev)) return prev
                const next = { ...prev }
                delete next[wordId]
                return next
            })
        }
    }
    const toggleManualFlag = (wordId: string) => {
        setManualFlags((prev) => ({ ...prev, [wordId]: !prev[wordId] }))
        hasUnsavedChangesRef.current = true
    }
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
        hasUnsavedChangesRef.current = true
    }
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
        hasUnsavedChangesRef.current = false
        setLastSavedAt(new Date())
        onConfirm(buildOverrides())
    }
    const handleSaveDraft = () => {
        onSaveDraft(buildOverrides())
        hasUnsavedChangesRef.current = false
        setLastSavedAt(new Date())
    }
    const handleDiscard = async () => {
        const confirmed = await showConfirmation(
            t.discardDialogTitle,
            t.discardDialogText,
            theme === 'dark',
            'warning',
            t.discardDialogConfirmButton
        )
        if (!confirmed) return
        await onDiscard()
    }
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isSaveShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'
            if (!isSaveShortcut) return
            e.preventDefault()
            if (!hasWords || savingDraft) return
            handleSaveDraft()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    })
    useImperativeHandle(ref, () => ({
        saveDraftNow: async () => {
            hasUnsavedChangesRef.current = false
            setLastSavedAt(new Date())
            await onSaveDraft(buildOverrides())
        },
    }))
    // DRAGGABLE DIVIDER handlers — pointer capture (same pattern
    // AudioPlayer.tsx's own scrub track already uses in this codebase)
    // rather than window-level listeners, so dragging keeps tracking
    // even if the cursor slips off the thin handle mid-drag.
    const handleDividerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setIsDraggingDivider(true)
        dragStartRef.current = {
            startY: e.clientY,
            startHeight: summaryWrapperRef.current?.getBoundingClientRect().height ?? 0,
            leftColumnHeight: leftColumnRef.current?.getBoundingClientRect().height ?? 0,
            naturalHeight: naturalSummaryHeightRef.current,
        }
    }
    const handleDividerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingDivider || !dragStartRef.current) return
        const { startY, startHeight, leftColumnHeight, naturalHeight } = dragStartRef.current
        const delta = e.clientY - startY
        // Upper bound is the smaller of: what leaves the passage its
        // minimum, and the summary card's own real full-content height
        // (so you can't drag past its natural size into empty space).
        const spaceBasedMax = leftColumnHeight - MIN_PASSAGE_HEIGHT_PX - DIVIDER_ROW_HEIGHT_PX - LEFT_COLUMN_GAP_PX * 2
        const naturalBasedMax = naturalHeight > 0 ? naturalHeight : spaceBasedMax
        const maxHeight = Math.max(minSummaryHeight, Math.min(spaceBasedMax, naturalBasedMax))
        const next = Math.min(Math.max(startHeight + delta, minSummaryHeight), maxHeight)
        setSummaryHeight(next)
    }
    const handleDividerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingDivider) return
        e.currentTarget.releasePointerCapture(e.pointerId)
        setIsDraggingDivider(false)
        dragStartRef.current = null
    }
    const hasWords = words.length > 0
    const lastSavedLabel = formatLastSaved(lastSavedAt, Date.now() + lastSavedTick * 0, t)
    const anyActionInFlight = savingDraft || confirming || discarding
    return (
        <div className="flex flex-col gap-6">
            {hasWords && (
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
                    ref={leftColumnRef}
                    style={{ gridArea: hasWords ? 'left' : undefined }}
                    className="attempt-word-review-left flex flex-col gap-3 lg:min-h-0"
                >
                    <div
                        ref={summaryWrapperRef}
                        className="review-scroll shrink-0 overflow-y-auto rounded-3xl lg:min-h-0"
                        style={summaryHeight != null ? { height: `${summaryHeight}px` } : undefined}
                    >
                        <div ref={summaryContentRef}>
                            <ResultsSummaryCard
                                attempt={attempt}
                                studentName={studentName}
                                words={words}
                                manualFlags={manualFlags}
                                t={t}
                                audioUrl={audioUrlQuery.data ?? null}
                                headerRef={headerRowRef}
                            />
                        </div>
                    </div>
                    {/* DRAGGABLE DIVIDER — lg only, see this file's
                    header comment. Double-click resets to the default
                    split. A full-width, always-visible tinted bar (not
                    a small floating pill) so it reads as draggable at a
                    glance. */}
                    <div
                        onPointerDown={handleDividerPointerDown}
                        onPointerMove={handleDividerPointerMove}
                        onPointerUp={handleDividerPointerUp}
                        onDoubleClick={() => setSummaryHeight(null)}
                        title={t.dividerHint}
                        style={{ height: DIVIDER_ROW_HEIGHT_PX }}
                        className={`hidden shrink-0 touch-none cursor-row-resize items-center justify-center rounded-full border transition-colors duration-150 lg:flex ${
                            isDraggingDivider
                                ? 'border-teal-500 bg-teal-500/20 dark:border-teal-400 dark:bg-teal-400/20'
                                : 'border-gray-900/10 bg-gray-900/10 hover:border-teal-500/40 hover:bg-teal-500/15 dark:border-gray-100/10 dark:bg-gray-100/10 dark:hover:border-teal-400/40 dark:hover:bg-teal-400/15'
                        }`}
                    >
                        <GripHorizontal
                            size={16}
                            className={`transition-colors duration-150 ${
                                isDraggingDivider ? 'text-teal-600 dark:text-teal-300' : 'text-gray-500 dark:text-gray-400'
                            }`}
                        />
                    </div>
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
                            onWordClick={handleWordClick}
                        />
                    </div>
                )}
                <div style={{ gridArea: hasWords ? 'buttons' : undefined }} className="flex flex-col gap-1.5">
                    <p className="px-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 sm:text-left">
                        {lastSavedLabel}
                    </p>
                    <div className="flex flex-col gap-2 rounded-3xl border border-gray-900/5 bg-white/60 p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-900/40 sm:flex-row">
                        <button
                            onClick={handleDiscard}
                            disabled={anyActionInFlight}
                            className={`flex items-center justify-center gap-2 rounded-full border-2 border-rose-500/40 px-5 py-3 text-sm font-bold text-rose-600 transition-colors duration-150 dark:border-rose-400/30 dark:text-rose-400 ${
                                anyActionInFlight
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer hover:bg-rose-500/10 dark:hover:bg-rose-400/10'
                            }`}
                        >
                            <Trash2 size={16} />
                            {discarding ? t.discarding : t.discardLabel}
                        </button>
                        <button
                            onClick={handleSaveDraft}
                            disabled={anyActionInFlight || !hasWords}
                            className={`flex items-center justify-center gap-2 rounded-full border-2 border-teal-500/40 px-5 py-3 text-sm font-bold text-teal-700 transition-colors duration-150 dark:border-teal-400/30 dark:text-teal-300 ${
                                anyActionInFlight || !hasWords
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer hover:bg-teal-500/10 dark:hover:bg-teal-400/10'
                            }`}
                        >
                            <Save size={16} />
                            {savingDraft ? t.savingDraftLabel : t.saveDraftLabel}
                            {!savingDraft && (
                                <kbd className="hidden rounded-md border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300 sm:inline-block">
                                    {isMacPlatform ? '⌘S' : 'Ctrl+S'}
                                </kbd>
                            )}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={anyActionInFlight || !hasWords}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59] ${
                                anyActionInFlight || !hasWords ? 'cursor-not-allowed opacity-50 hover:translate-y-0' : 'cursor-pointer'
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