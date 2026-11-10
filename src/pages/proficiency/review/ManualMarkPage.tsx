// File: src/pages/proficiency/review/ManualMarkPage.tsx
//
// Mark the words by hand for a reading the scorer has not finished, or could not score.
// Laid out like the real review: the summary and recording on the left with the passage
// under it, the Selected Words stack and the buttons on the right.
//
// Tapping a word in the passage marks it as "said differently"; its card on the right
// switches it to "skipped" or takes it off. The marks are saved on the attempt itself
// (assessment_attempts.manual_marks). Two ways to finish:
//   - Confirm Marks: keep them and go back; they are laid onto the word rows whenever
//     scoring does finish.
//   - Confirm & Send for Scoring: keep them and ask the scorer for the automatic values
//     (accuracy and the rest) again; the marks are applied when those arrive.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, GripHorizontal, Loader2, Save, Send } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { OwlLoader } from '../../../components/ui/OwlLoader'
import { Owl } from '../../../components/ui/Owl'
import { showToast } from '../../../helpers/swalHelpers'
import type { Lang } from '../../../components/buttons/LangToggle'
import {
    useAttemptAudioUrlQuery,
    useAttemptQuery,
    useManualMarksQuery,
    useSaveManualMarksMutation,
    useStudentProfileQuery,
    type AttemptWord,
    type ManualMarks,
    type ManualMarkType,
    type Verdict,
} from './hooks'
import { STRINGS as REVIEW_STRINGS } from './features/attemptWordReviewStrings'
import { PassageCard } from './features/PassageCard'
import { ResultsSummaryCard } from './features/ResultsSummaryCard'
import { SelectedWordsCard } from './features/SelectedWordsCard'
import { useRetryScoring } from '../pre_assessment/assessment_session/features/useSubmitAttempt'

const STRINGS: Record<Lang, {
    back: string
    title: string
    desc: string
    fine: string
    said: string
    skipped: string
    marked: (n: number) => string
    saving: string
    saved: string
    saveFailed: string
    confirm: string
    confirmSend: string
    sending: string
    notFound: string
    marksSavedToast: string
    sendFailedToast: string
}> = {
    fil: {
        back: 'Bumalik sa Review',
        title: 'Markahan ang mga salita',
        desc: 'Pindutin ang salita sa talata para markahan ito, pagkatapos piliin sa kanan kung iba ang bigkas o nalaktawan. Idinadagdag ang mga marka sa resulta kapag tapos nang suriin ng sistema.',
        fine: 'Tama',
        said: 'Iba ang bigkas',
        skipped: 'Nalaktawan',
        marked: (n) => (n === 1 ? '1 salitang minarkahan' : `${n} salitang minarkahan`),
        saving: 'Sine-save...',
        saved: 'Na-save',
        saveFailed: 'Hindi na-save. Subukan muli.',
        confirm: 'Kumpirmahin ang Marka',
        confirmSend: 'Kumpirmahin at Ipasuri',
        sending: 'Ipinapasuri...',
        notFound: 'Hindi na available ang pagbasang ito.',
        marksSavedToast: 'Na-save ang mga marka.',
        sendFailedToast: 'Hindi maipasuri ngayon. Pakisubukang muli.',
    },
    en: {
        back: 'Back to Review',
        title: 'Mark the words',
        desc: 'Tap a word in the passage to mark it, then choose on the right whether it was said differently or skipped. Your marks are added to the results when the scorer finishes.',
        fine: 'Fine',
        said: 'Said differently',
        skipped: 'Skipped',
        marked: (n) => (n === 1 ? '1 word marked' : `${n} words marked`),
        saving: 'Saving...',
        saved: 'Saved',
        saveFailed: "Couldn't save. Try again.",
        confirm: 'Confirm Marks',
        confirmSend: 'Confirm & Send for Scoring',
        sending: 'Sending...',
        notFound: "This reading isn't available anymore.",
        marksSavedToast: 'Marks saved.',
        sendFailedToast: "Couldn't send it for scoring right now. Please try again.",
    },
}

// The drag bar between the summary and the passage works as it does in the review: dragging
// resizes the summary (the passage takes the rest), within a measured minimum and maximum;
// a double-click puts it back.
const MIN_PASSAGE_HEIGHT_PX = 180
const DIVIDER_ROW_HEIGHT_PX = 28
const LEFT_COLUMN_GAP_PX = 12
const SUMMARY_CARD_BOTTOM_PADDING_PX = 12

// The passage as the scorer reads it: split on whitespace, positions counted from 1.
function passageWordsOf(text: string): string[] {
    return text.split(/\s+/).filter(Boolean)
}

export const ManualMarkPage: React.FC = () => {
    const { attemptId } = useParams<{ attemptId: string }>()
    const navigate = useNavigate()
    const { lang } = useLang()
    const { theme } = useTheme()
    const t = STRINGS[lang]
    const reviewStrings = REVIEW_STRINGS[lang]
    const { data: attempt, isLoading: attemptLoading, error: attemptError } = useAttemptQuery(attemptId)
    const { data: student } = useStudentProfileQuery(attempt?.student_id)
    const audioUrlQuery = useAttemptAudioUrlQuery(attempt?.audio_path)
    const { data: saved, isSuccess: marksLoaded } = useManualMarksQuery(attemptId)
    const save = useSaveManualMarksMutation(attemptId)
    const retryScoring = useRetryScoring()
    const [sending, setSending] = useState(false)
    // Divider: null = the summary at its natural size, a number = the height it was dragged to.
    const [summaryHeight, setSummaryHeight] = useState<number | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [minSummaryHeight, setMinSummaryHeight] = useState(92)
    const leftColumnRef = useRef<HTMLDivElement>(null)
    const summaryWrapperRef = useRef<HTMLDivElement>(null)
    const summaryContentRef = useRef<HTMLDivElement>(null)
    const headerRowRef = useRef<HTMLDivElement>(null)
    const naturalSummaryHeightRef = useRef(0)
    const dragRef = useRef<{ startY: number; startHeight: number; leftColumnHeight: number; naturalHeight: number } | null>(null)

    // Which positions are marked, newest first (the order of the Selected Words stack), and how.
    const [order, setOrder] = useState<number[]>([])
    const [types, setTypes] = useState<ManualMarks>({})
    const loaded = useRef(false)
    const dirty = useRef(false)
    const typesRef = useRef<ManualMarks>({})
    const timer = useRef<number | null>(null)

    // The passage as word rows, so the review's own cards can show it.
    const words = useMemo<AttemptWord[]>(
        () =>
            passageWordsOf(attempt?.passage_text ?? '').map((word, i) => ({
                id: String(i + 1),
                attempt_id: attemptId ?? '',
                word_index: i + 1,
                reference_word: word,
                recognized_word: null,
                error_type: 'None',
                accuracy_score: null,
                system_verdict: 'correct',
                confidence: 'high',
                teacher_verdict: null,
                teacher_reviewed_at: null,
                teacher_reviewed_by: null,
                teacher_manual_flag: false,
                teacher_error_type_override: null,
            })),
        [attempt?.passage_text, attemptId]
    )

    // Start from what was saved before, once.
    useEffect(() => {
        if (marksLoaded && !loaded.current) {
            loaded.current = true
            const start = saved ?? {}
            typesRef.current = start
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTypes(start)
            setOrder(
                Object.keys(start)
                    .map(Number)
                    .sort((a, b) => b - a)
            )
        }
    }, [marksLoaded, saved])

    // Writes any pending change now; resolves once it is stored.
    const flush = async () => {
        if (timer.current !== null) window.clearTimeout(timer.current)
        timer.current = null
        if (!dirty.current) return
        dirty.current = false
        await save.mutateAsync(typesRef.current)
    }
    // Leaving the page right after a change still saves it.
    useEffect(() => {
        return () => {
            if (timer.current !== null) window.clearTimeout(timer.current)
            if (dirty.current) save.mutate(typesRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const commit = (next: ManualMarks) => {
        typesRef.current = next
        setTypes(next)
        dirty.current = true
        if (timer.current !== null) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => void flush().catch(() => undefined), 600)
    }
    // Tap in the passage (or a search result): mark as said differently, or take the mark off.
    const toggleWord = (wordId: string) => {
        if (!loaded.current) return
        const pos = Number(wordId)
        const next = { ...typesRef.current }
        if (next[wordId]) {
            delete next[wordId]
            setOrder((o) => o.filter((p) => p !== pos))
        } else {
            next[wordId] = 'Mispronunciation'
            setOrder((o) => [pos, ...o.filter((p) => p !== pos)])
        }
        commit(next)
    }
    const setType = (wordId: string, type: ManualMarkType) => commit({ ...typesRef.current, [wordId]: type })
    const clearAll = () => {
        setOrder([])
        commit({})
    }

    // The least the summary can shrink to: its title row and nothing under it.
    const attemptReady = !!attempt
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
    }, [attemptReady, student?.id])
    // The most it can grow to: its natural full height.
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
    }, [attemptReady, student?.id])
    useEffect(() => {
        if (!isDragging) return
        const prev = document.body.style.userSelect
        document.body.style.userSelect = 'none'
        return () => {
            document.body.style.userSelect = prev
        }
    }, [isDragging])
    const onDividerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setIsDragging(true)
        dragRef.current = {
            startY: e.clientY,
            startHeight: summaryWrapperRef.current?.getBoundingClientRect().height ?? 0,
            leftColumnHeight: leftColumnRef.current?.getBoundingClientRect().height ?? 0,
            naturalHeight: naturalSummaryHeightRef.current,
        }
    }
    const onDividerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging || !dragRef.current) return
        const { startY, startHeight, leftColumnHeight, naturalHeight } = dragRef.current
        const spaceMax = leftColumnHeight - MIN_PASSAGE_HEIGHT_PX - DIVIDER_ROW_HEIGHT_PX - LEFT_COLUMN_GAP_PX * 2
        const naturalMax = naturalHeight > 0 ? naturalHeight : spaceMax
        const maxHeight = Math.max(minSummaryHeight, Math.min(spaceMax, naturalMax))
        setSummaryHeight(Math.min(Math.max(startHeight + (e.clientY - startY), minSummaryHeight), maxHeight))
    }
    const onDividerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return
        e.currentTarget.releasePointerCapture(e.pointerId)
        setIsDragging(false)
        dragRef.current = null
    }

    const reviewPath = `/students/review/${attemptId}`
    const goBack = async () => {
        try {
            await flush()
        } catch {
            /* the unmount save tries once more */
        }
        navigate(reviewPath)
    }
    const handleConfirm = async () => {
        try {
            await flush()
            showToast(t.marksSavedToast, 'success', theme === 'dark')
            navigate(reviewPath)
        } catch {
            showToast(t.saveFailed, 'error', theme === 'dark')
        }
    }
    // Saves the marks, then asks the scorer for the automatic values again. The review page
    // follows it (polling) and lays the marks on the new word rows when it is done.
    const handleConfirmSend = async () => {
        if (!attempt) return
        setSending(true)
        try {
            await flush()
            void retryScoring
                .mutateAsync({ attemptId: attempt.id, language: attempt.language, passageText: attempt.passage_text })
                .catch((err) => console.error('ManualMark: scoring request failed', err))
            // Give the reset a moment to land, so the review page opens on "scoring in progress".
            await new Promise((resolve) => window.setTimeout(resolve, 1200))
            navigate(reviewPath)
        } catch {
            showToast(t.sendFailedToast, 'error', theme === 'dark')
            setSending(false)
        }
    }

    if (attemptLoading) return <OwlLoader className="py-32" />
    if (attemptError || !attempt) {
        return (
            <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
                <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-gray-900/5 bg-white p-8 text-center shadow-md dark:border-gray-100/10 dark:bg-gray-900">
                    <Owl mood="neutral" size={64} />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.notFound}</p>
                </section>
            </div>
        )
    }
    // A scored (or confirmed) reading has the normal review: marks are made there.
    if (attempt.status === 'scored' || attempt.reviewed_at) return <Navigate to={reviewPath} replace />

    const verdicts: Record<string, Verdict> = {}
    const flags: Record<string, boolean> = {}
    for (const id of Object.keys(types)) {
        verdicts[id] = 'miscue'
        flags[id] = true
    }
    const stackIds = order.map(String)
    const count = order.length
    const studentName = student?.full_name || student?.username || null
    const busy = sending || save.isPending
    return (
        <div className="mx-auto w-full max-w-[1350px] px-6 pb-12 pt-2 sm:px-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <button
                    onClick={goBack}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
                >
                    <ArrowLeft size={16} />
                    {t.back}
                </button>
            </div>
            <p className="mb-4 max-w-3xl text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="font-extrabold text-gray-900 dark:text-gray-50">{t.title}.</span> {t.desc}
            </p>
            <div className="grid gap-6 lg:h-[calc(100vh-14rem)] lg:min-h-[30rem] lg:grid-cols-[1.3fr_1fr]">
                <div ref={leftColumnRef} className="flex flex-col gap-3 lg:min-h-0">
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
                                manualFlags={flags}
                                t={reviewStrings}
                                audioUrl={audioUrlQuery.data ?? null}
                                showScores={false}
                                headerRef={headerRowRef}
                            />
                        </div>
                    </div>
                    {/* The drag bar (large screens): drag to resize, double-click to reset. */}
                    <div className="relative hidden shrink-0 lg:block">
                        <div
                            onPointerDown={onDividerDown}
                            onPointerMove={onDividerMove}
                            onPointerUp={onDividerUp}
                            onDoubleClick={() => setSummaryHeight(null)}
                            title={reviewStrings.dividerHint}
                            style={{ height: DIVIDER_ROW_HEIGHT_PX }}
                            className={`flex touch-none cursor-row-resize items-center justify-center rounded-full border transition-colors duration-150 ${
                                isDragging
                                    ? 'border-teal-500 bg-teal-500/20 dark:border-teal-400 dark:bg-teal-400/20'
                                    : 'border-gray-900/10 bg-gray-900/10 hover:border-teal-500/40 hover:bg-teal-500/15 dark:border-gray-100/10 dark:bg-gray-100/10 dark:hover:border-teal-400/40 dark:hover:bg-teal-400/15'
                            }`}
                        >
                            <GripHorizontal
                                size={16}
                                className={`transition-colors duration-150 ${isDragging ? 'text-teal-600 dark:text-teal-300' : 'text-gray-500 dark:text-gray-400'}`}
                            />
                        </div>
                    </div>
                    <div className="lg:min-h-0 lg:flex-1">
                        <PassageCard
                            words={words}
                            verdicts={verdicts}
                            manualFlags={{}}
                            manualErrorType={types as Record<string, AttemptWord['error_type']>}
                            selectedWordIds={stackIds}
                            t={reviewStrings}
                            onWordClick={toggleWord}
                            markLabels={{ correct: t.fine, said: t.said, skipped: t.skipped }}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-3 lg:min-h-0">
                    <div className="lg:min-h-0 lg:flex-1">
                        <SelectedWordsCard
                            words={words}
                            selectedWordIds={stackIds}
                            verdicts={verdicts}
                            manualFlags={{}}
                            manualErrorType={types as Record<string, AttemptWord['error_type']>}
                            t={reviewStrings}
                            onSetErrorType={(wordId, type) => setType(wordId, type)}
                            onClearAll={clearAll}
                            onWordClick={toggleWord}
                            markLabels={{ said: t.said, skipped: t.skipped }}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <p className="flex items-center gap-3 px-1 text-xs font-bold text-gray-700 dark:text-gray-300">
                            <span>{t.marked(count)}</span>
                            {save.isPending ? (
                                <span className="inline-flex items-center gap-1">
                                    <Loader2 size={14} className="animate-spin" />
                                    {t.saving}
                                </span>
                            ) : save.isError ? (
                                <span className="text-rose-600 dark:text-rose-400">{t.saveFailed}</span>
                            ) : save.isSuccess ? (
                                <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300">
                                    <Check size={14} />
                                    {t.saved}
                                </span>
                            ) : null}
                        </p>
                        <div className="flex flex-col gap-2 rounded-3xl border border-gray-900/5 bg-white/60 p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-900/40 sm:flex-row">
                            <button
                                onClick={handleConfirm}
                                disabled={busy}
                                className={`flex items-center justify-center gap-2 rounded-full border-2 border-teal-500/40 px-5 py-3 text-sm font-bold text-teal-700 transition-colors duration-150 dark:border-teal-400/30 dark:text-teal-300 ${
                                    busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-teal-500/10 dark:hover:bg-teal-400/10'
                                }`}
                            >
                                <Save size={16} />
                                {t.confirm}
                            </button>
                            <button
                                onClick={handleConfirmSend}
                                disabled={busy}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59] ${
                                    busy ? 'cursor-not-allowed opacity-50 hover:translate-y-0' : 'cursor-pointer'
                                }`}
                            >
                                <Send size={17} />
                                {sending ? t.sending : t.confirmSend}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ManualMarkPage
