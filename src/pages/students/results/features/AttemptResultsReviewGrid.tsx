// File: src/pages/students/results/features/AttemptResultsReviewGrid.tsx
//
// The Review-tab layout for AttemptResults.tsx — split out once that
// file grew too large. Owns everything specific to rendering the
// word-by-word review grid: the bounded-height CSS grid (copied from
// AttemptWordReview.tsx — duplicated rather than shared, since this
// page doesn't import that file and factoring it out into a shared
// component is a bigger refactor than duplicating ~80 already-proven
// lines), the draggable divider between ResultsSummaryCard and
// PassageCard (also duplicated, same reason), and the "no word data"
// plain fallback layout for an attempt with zero words. AttemptResults.tsx
// just renders <AttemptResultsReviewGrid .../> when its tab is 'review'
// and hands this component everything it needs as props — this
// component owns none of the data fetching.
//
// DIVIDER LOGIC KEPT HERE, NOT A SEPARATE HOOK: the draggable-divider
// state/refs/handlers only ever have one consumer (this component), so
// splitting them into their own hook file would add indirection with
// no real reuse benefit.
import React, { useEffect, useRef, useState } from 'react'
import { GripHorizontal, Pencil } from 'lucide-react'
import type { AttemptDetail, AttemptWord, Verdict } from '../../review/hooks'
import type { AttemptWordReviewStrings } from '../../review/features/attemptWordReviewStrings'
import { ResultsSummaryCard } from '../../review/features/ResultsSummaryCard'
import { PassageCard } from '../../review/features/PassageCard'
import { SelectedWordsCard } from '../../review/features/SelectedWordsCard'
// Reused directly from TeacherReviewAttempt.tsx's own AttemptWordReview
// heightBudget prop, since both pages share the same ProtectedLayout
// chrome and a near-identical amount of fixed content above the grid.
const REVIEW_HEIGHT_BUDGET = { base: 232, lg: 200 }
// DRAGGABLE DIVIDER constants — duplicated verbatim from
// AttemptWordReview.tsx.
const MIN_SUMMARY_HEIGHT_PX = 92
const MIN_PASSAGE_HEIGHT_PX = 180
const DIVIDER_ROW_HEIGHT_PX = 28
const LEFT_COLUMN_GAP_PX = 12 // matches the gap-3 class on the "left" column
const SUMMARY_CARD_BOTTOM_PADDING_PX = 12
type AttemptResultsReviewGridProps = {
    attempt: AttemptDetail
    studentName: string
    wordList: AttemptWord[]
    verdicts: Record<string, Verdict>
    manualFlags: Record<string, boolean>
    manualErrorType: Record<string, AttemptWord['error_type']>
    selectedWordIds: string[]
    onWordClick: (wordId: string) => void
    onClearSelectedWords: () => void
    audioUrl: string | null
    reviewT: AttemptWordReviewStrings
    editButtonLabel: string
    onEditResults: () => void
    isReopening: boolean
}
export const AttemptResultsReviewGrid: React.FC<AttemptResultsReviewGridProps> = ({
                                                                                      attempt,
                                                                                      studentName,
                                                                                      wordList,
                                                                                      verdicts,
                                                                                      manualFlags,
                                                                                      manualErrorType,
                                                                                      selectedWordIds,
                                                                                      onWordClick,
                                                                                      onClearSelectedWords,
                                                                                      audioUrl,
                                                                                      reviewT,
                                                                                      editButtonLabel,
                                                                                      onEditResults,
                                                                                      isReopening,
                                                                                  }) => {
    const [summaryHeight, setSummaryHeight] = useState<number | null>(null)
    const [isDraggingDivider, setIsDraggingDivider] = useState(false)
    const [minSummaryHeight, setMinSummaryHeight] = useState<number>(MIN_SUMMARY_HEIGHT_PX)
    const leftColumnRef = useRef<HTMLDivElement>(null)
    const summaryWrapperRef = useRef<HTMLDivElement>(null)
    const summaryContentRef = useRef<HTMLDivElement>(null)
    const headerRowRef = useRef<HTMLDivElement>(null)
    const naturalSummaryHeightRef = useRef<number>(0)
    const dragStartRef = useRef<{ startY: number; startHeight: number; leftColumnHeight: number; naturalHeight: number } | null>(null)
    const hasWords = wordList.length > 0
    // A different attempt loading in starts back at the default split
    // rather than carrying over a size dragged for a PREVIOUS attempt.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSummaryHeight(null)
    }, [attempt.id])
    // MEASURED MINIMUM — see AttemptWordReview.tsx's own comment for the
    // full reasoning; identical logic here. This component only ever
    // mounts while the Review tab is active (AttemptResults.tsx doesn't
    // render it otherwise), so there's no stuck-at-0 first-mount case
    // to guard against here.
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
    }, [attempt.id])
    // MEASURED NATURAL MAXIMUM — same reasoning as AttemptWordReview.tsx.
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
    }, [attempt.id])
    useEffect(() => {
        if (!isDraggingDivider) return
        const prev = document.body.style.userSelect
        document.body.style.userSelect = 'none'
        return () => {
            document.body.style.userSelect = prev
        }
    }, [isDraggingDivider])
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
    const editBar = (
        <div className="flex flex-col gap-2 rounded-3xl border border-gray-900/5 bg-white/60 p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-900/40">
            <button
                onClick={onEditResults}
                disabled={isReopening}
                className={`flex items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59] ${
                    isReopening ? 'cursor-not-allowed opacity-60 hover:translate-y-0' : 'cursor-pointer'
                }`}
            >
                <Pencil size={17} />
                {editButtonLabel}
            </button>
        </div>
    )
    if (!hasWords) {
        return (
            <div className="flex flex-col gap-6">
                <ResultsSummaryCard
                    attempt={attempt}
                    studentName={studentName}
                    words={wordList}
                    manualFlags={manualFlags}
                    t={reviewT}
                    audioUrl={audioUrl}
                    showScores={false}
                />
                <PassageCard
                    words={wordList}
                    verdicts={verdicts}
                    manualFlags={manualFlags}
                    manualErrorType={manualErrorType}
                    selectedWordIds={selectedWordIds}
                    t={reviewT}
                    onWordClick={onWordClick}
                />
                {editBar}
            </div>
        )
    }
    return (
        <>
            <style>{`
                .attempt-word-review-grid {
                    display: grid;
                    gap: 1.5rem;
                    grid-template-areas: "left" "buttons" "wordselect";
                }
                @media (max-width: 1023px) {
                    .attempt-word-review-grid {
                        height: calc(100vh - ${REVIEW_HEIGHT_BUDGET.base}px);
                        overflow-y: auto;
                    }
                }
                @media (min-width: 1024px) {
                    .attempt-word-review-grid {
                        grid-template-columns: 1.3fr 1fr;
                        grid-template-rows: minmax(0, 1fr) auto;
                        align-items: stretch;
                        grid-template-areas: "left wordselect" "left buttons";
                        height: calc(100vh - ${REVIEW_HEIGHT_BUDGET.lg}px);
                    }
                    .attempt-word-review-left {
                        height: calc(100vh - ${REVIEW_HEIGHT_BUDGET.lg}px);
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
            <div className="attempt-word-review-grid review-scroll">
                <div
                    ref={leftColumnRef}
                    style={{ gridArea: 'left' }}
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
                                words={wordList}
                                manualFlags={manualFlags}
                                t={reviewT}
                                audioUrl={audioUrl}
                                showScores={false}
                                headerRef={headerRowRef}
                            />
                        </div>
                    </div>
                    {/* DRAGGABLE DIVIDER — lg only. Double-click resets
                    to the default split. */}
                    <div
                        onPointerDown={handleDividerPointerDown}
                        onPointerMove={handleDividerPointerMove}
                        onPointerUp={handleDividerPointerUp}
                        onDoubleClick={() => setSummaryHeight(null)}
                        title={reviewT.dividerHint}
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
                    {/* Just sizing here — PassageCard owns its own
                    internal header/scroll split. */}
                    <div className="lg:min-h-0 lg:flex-1">
                        <PassageCard
                            words={wordList}
                            verdicts={verdicts}
                            manualFlags={manualFlags}
                            manualErrorType={manualErrorType}
                            selectedWordIds={selectedWordIds}
                            t={reviewT}
                            onWordClick={onWordClick}
                        />
                    </div>
                </div>
                <div style={{ gridArea: 'wordselect' }} className="review-scroll lg:min-h-0 lg:overflow-y-auto">
                    <SelectedWordsCard
                        words={wordList}
                        selectedWordIds={selectedWordIds}
                        verdicts={verdicts}
                        manualFlags={manualFlags}
                        manualErrorType={manualErrorType}
                        t={reviewT}
                        onClearAll={onClearSelectedWords}
                        onWordClick={onWordClick}
                        readOnly
                    />
                </div>
                <div style={{ gridArea: 'buttons' }}>
                    {editBar}
                </div>
            </div>
        </>
    )
}
export default AttemptResultsReviewGrid