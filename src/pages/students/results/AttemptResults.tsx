// File: AttemptResults.tsx
// File: src/pages/students/results/AttemptResults.tsx
//
// Read-only "here's how it went" page for a CONFIRMED attempt — reached
// after Confirm Results from either review flow (TeacherReviewAttempt.tsx
// for Send-mode, AssessmentSession.tsx for Now-mode), both of which now
// navigate here instead of straight back to their own list/picker
// screens. Deliberately a separate route/page rather than swapping the
// editable review UI out in place, per explicit product decision — keeps
// "reviewing" and "done reviewing" as two distinct URLs instead of one
// page silently changing modes underneath the teacher.
//
// SUB-NAV: the back button + Review/Results tab switcher both now live
// in AttemptResultsSubNav.tsx, a separate component styled like
// StudentsSubNav.tsx's pill row — extracted out of this file per
// explicit ask, matching how StudentsSubNav folds HomeButton in as its
// own first pill. Tab state (`tab`) still lives HERE, not in that
// component, since this file needs it to decide what to render below;
// the subnav is just a controlled view over it.
//
// DEFAULT TAB: starts on 'results', not 'review'. Landing here always
// means an attempt was JUST confirmed (or a teacher is revisiting an
// already-confirmed one from ResultsList.tsx) — either way, the scores
// themselves are what they came to see first. The word-by-word Review
// tab is still one click away for anyone who wants to dig into the
// passage/word detail, but it's no longer the first thing shown.
//
// LAYOUT (Review tab): rebuilt to match AttemptWordReview.tsx's own
// bounded-height grid + fixed-header/scrollable-body pattern instead of
// a plain flex/grid stack that just flowed with the page. Per explicit
// ask, this tab now reuses the SAME CSS (.attempt-word-review-grid /
// .review-scroll, copied verbatim from AttemptWordReview.tsx — these
// are plain global class names, not scoped/exported from that file, so
// duplicating the rule here is the straightforward way to reuse it
// without a shared component refactor) with its own height budget (see
// REVIEW_HEIGHT_BUDGET below): ResultsSummaryCard is the shrink-0 fixed
// block up top, PassageCard scrolls internally within its own bounded
// column (via its own internal header/body split — see that file's own
// comment), and SelectedWordsCard scrolls in the second column. The
// editBar (Edit Results button) now occupies the "buttons" grid area,
// same position Save Draft/Confirm Results occupy on the editable page,
// instead of trailing below SelectedWordsCard as a separate block.
//
// DRAGGABLE DIVIDER (this pass): the SAME draggable-divider system
// AttemptWordReview.tsx uses between its own ResultsSummaryCard and
// PassageCard is now duplicated here — same constants, same
// live-measured minimum (via ResultsSummaryCard's `headerRef`) and
// live-measured natural maximum, same pointer-capture drag handlers,
// same full-width visible drag bar. Copied rather than shared for the
// same reason the grid CSS above is copied: this page doesn't import
// AttemptWordReview.tsx, and factoring this out into a shared hook/
// component is a bigger refactor than duplicating ~80 lines that are
// already proven correct there. If the divider's sizing/behavior ever
// needs to change, remember to update BOTH copies.
//
// SELECTEDWORDSCARD WIRING (this pass): onWordClick is now passed
// through (previously omitted) — SelectedWordsCard's own per-word
// remove-X and its search-results' click-to-add both depend on it being
// wired, and having it absent silently left both inert. readOnly is
// still passed, since nothing about verdict/flag/type editing changes
// here — only the "which words are stacked in this view" state does,
// same as it never mutated anything on this read-only page. See
// SelectedWordsCard.tsx's own comments for why toggling that state is
// safe in read-only mode. handleWordClick below was previously a
// pure "add/reorder to front" — it never actually removed anything,
// which is why the remove-X wouldn't have worked here even once wired.
// It's now a real toggle (add if absent, remove if present), matching
// AttemptWordReview.tsx's own handleWordClick.
//
// REVIEW_HEIGHT_BUDGET: this page's own fixed chrome above the grid is
// AttemptResultsSubNav (mb-6, a ~40px pill row) versus TeacherReviewAttempt.tsx's
// plain back button (mb-4, ~36px) — close enough to TeacherReviewAttempt's
// own { base: 232, lg: 200 } that the same two numbers are reused
// directly rather than inventing new ones off a guess; ProtectedLayout.tsx's
// <main> padding (pt-28/lg:pt-20) is identical for both pages since both
// render under the same ProtectedLayout. If this ever reads as slightly
// too tall/short in practice, nudge these two numbers — they're a
// deliberately-reused approximation, not derived from a pixel-exact
// measurement of AttemptResultsSubNav specifically.
//
// wordList.length === 0 still falls back to the old plain flex-column
// stack (no grid, no bounded height, no divider) — there's no passage/
// word data to scroll through or divide in that case, so the bounded-
// grid machinery would just add complexity for a single short card +
// the edit button.
//
// RIGHT COLUMN HEIGHT: no longer a separate lg:h-[42rem] fixed value —
// SelectedWordsCard now fills whatever the shared grid's "wordselect"
// area hands it (lg:h-full lg:min-h-0, same as the editable flow), and
// the grid itself is what's height-bounded via REVIEW_HEIGHT_BUDGET.
//
// EDIT RESULTS: NOT a plain link anymore. Clicking it fires a swal
// confirmation first (this is a real, meaningful state change — the
// attempt genuinely leaves "confirmed" status), and on confirm calls
// useReopenAttemptMutation (hooks.ts), which clears reviewed_at/
// reviewed_by on the attempt back to null. That's what makes this
// attempt actually disappear from ResultsList.tsx and reappear in
// ReviewList.tsx — not a UI trick, the attempt is genuinely unreviewed
// again. Only once that write succeeds does this navigate away — to
// /students/review (the Pending Review LIST), not straight into this
// attempt's own edit screen, so the teacher lands wherever they'd
// naturally go to pick it back up whenever they're ready, rather than
// being dropped mid-edit right away. See TeacherReviewAttempt.tsx's own
// header comment for why that page no longer needs any special-casing
// for this — by the time it's opened again, reviewed_at is honestly
// null.
//
// INSIGHTS (in the "Results" tab, below the score pills): a first,
// deliberately modest cut at the manuscript's "Insight Generation"
// objective ("From the confirmed results, BasaQuest generates insights
// — a diagnostic summary of the pupil's dominant reading weaknesses").
// Two layers, both computed client-side from data this page already
// has loaded — nothing here needs a new table, a new query, or a cloud
// call:
//   - Three number cards: dominant weakness (tallies each word's
//     EFFECTIVE error type — teacher override if set, else the
//     system's own — via the same effectiveErrorType() resolution used
//     everywhere else, and names whichever non-'None' type occurs
//     most), words-correct-per-minute (correct-verdict word count over
//     attempt.duration_seconds/60 — the same figure Phil-IRI has a
//     teacher hand-time with a wristwatch), and system/teacher
//     agreement (among words the SYSTEM flagged low-confidence, how
//     many the teacher's final verdict agreed with — the same signal
//     useSubmitReviewMutation's own comment earmarks for the eventual
//     Cohen's kappa validation study).
//   - buildInsightSummary (inline below): a PLAIN TEMPLATE SENTENCE
//     stitched from those same three numbers — deliberately NOT an LLM
//     call. A template costs nothing, runs instantly, and can never
//     claim something the numbers don't support, at the cost of always
//     reading a little mail-merged rather than genuinely written. A
//     real generated version (matching how essay grading elsewhere in
//     this app already uses a cloud-hosted language model) is a
//     reasonable future iteration, not implemented here.
// All of this is placeholder-scoring-aware only in the sense that it
// doesn't pretend otherwise — while USE_PLACEHOLDER_SCORING is on (see
// placeholderScoring.ts), both the cards and the summary sentence
// reflect that file's random 85/8/7 weighting, not a real acoustic
// signal. Fine for exercising the UI; not evidence of anything yet.
//
// GUARD: if a teacher (or a stale bookmark) lands here for an attempt
// that ISN'T actually reviewed yet (reviewed_at still null — e.g.
// Confirm failed partway, someone navigated here by hand, or "Edit
// Results" was just used), this bounces to the real (editable) review
// page instead of rendering a results view for data that isn't final.
//
// AttemptResultsSubNav's back button always goes to /students/results
// (the confirmed-results list) — handled internally by that component,
// not passed in from here.
//
// NOTE: ResultsSummaryCard's own header still reads "Review" / "Review
// Each Word" (attemptWordReviewStrings.ts's kicker/title) even on this
// page's own "Results" tab, since it hasn't been given separate
// results-mode copy yet — a known simplification, not an oversight.
//
// LOADING STATE: the initial attemptLoading/wordsLoading wait now shows
// a skeleton (see components/ui/Skeleton.tsx) shaped like a score-pill
// row over a paragraph-of-lines card — the same shape TeacherReviewAttempt.tsx
// uses for its own equivalent wait — instead of a centered OwlLoader
// spinner.
import React, { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Ear, Gauge, GripHorizontal, MessageSquareText, MinusCircle, Pencil, ThumbsUp } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { useProfile } from '../../../hooks/useProfile'
import { showConfirmation } from '../../../helpers/swalHelpers'
import { Skeleton } from '../../../components/ui/Skeleton'
import { Owl } from '../../../components/ui/Owl'
import type { Lang } from '../../../components/buttons/LangToggle'
import type { AttemptWord } from '../review/hooks'
import {
    useAttemptAudioUrlQuery,
    useAttemptQuery,
    useAttemptWordsQuery,
    useReopenAttemptMutation,
    useStudentProfileQuery,
} from '../review/hooks'
import { STRINGS as REVIEW_STRINGS } from '../review/features/attemptWordReviewStrings'
import { effectiveErrorType } from '../review/features/attemptWordReviewHelpers'
import { ResultsSummaryCard } from '../review/features/ResultsSummaryCard'
import { PassageCard } from '../review/features/PassageCard'
import { SelectedWordsCard } from '../review/features/SelectedWordsCard'
import { ScorePill } from '../review/features/AttemptWordReviewShared'
import { AttemptResultsSubNav, type AttemptResultsTab } from './AttemptResultsSubNav'
// See this file's REVIEW_HEIGHT_BUDGET header comment above — reused
// directly from TeacherReviewAttempt.tsx's own AttemptWordReview
// heightBudget prop, since both pages share the same ProtectedLayout
// chrome and a near-identical amount of fixed content above the grid.
const REVIEW_HEIGHT_BUDGET = { base: 232, lg: 200 }
// DRAGGABLE DIVIDER constants — duplicated verbatim from
// AttemptWordReview.tsx; see this file's own header comment for why.
const MIN_SUMMARY_HEIGHT_PX = 92
const MIN_PASSAGE_HEIGHT_PX = 180
const DIVIDER_ROW_HEIGHT_PX = 28
const LEFT_COLUMN_GAP_PX = 12 // matches the gap-3 class on the "left" column
const SUMMARY_CARD_BOTTOM_PADDING_PX = 12
const STRINGS: Record<Lang, {
    loading: string
    notFoundTitle: string
    notFoundDesc: string
    unnamedStudent: string
    resultsTabTitle: string
    resultsTabSubtitle: string
    editButton: string
    editConfirmTitle: string
    editConfirmText: string
    editConfirmButton: string
    insightsTitle: string
    insightsSubtitle: string
    weaknessCardTitle: string
    weaknessCardDesc: (type: string, count: number, total: number) => string
    wcpmCardTitle: string
    wcpmUnit: string
    agreementCardTitle: string
    agreementCardDesc: (agreed: number, total: number) => string
    summaryNoErrors: (name: string) => string
    summaryWeakness: (name: string, type: string, count: number, total: number) => string
    summaryWcpm: (name: string, wcpm: number) => string
    summaryAgreement: (agreed: number, total: number) => string
}> = {
    fil: {
        loading: 'Kinukuha ang resulta...',
        notFoundTitle: 'Hindi Nahanap',
        notFoundDesc: 'Hindi na available ang pagbasang ito.',
        unnamedStudent: 'Estudyante',
        resultsTabTitle: 'Mga Marka',
        resultsTabSubtitle: 'Ang mga marka ng pagbasang ito sa bawat sukatan.',
        editButton: 'I-edit ang Resulta',
        editConfirmTitle: 'Buksan muli ang pagsusuring ito?',
        editConfirmText: 'Babalik ito sa Naghihintay ng Review at hindi na ito lalabas dito hangga\'t hindi mo ito muling kinukumpirma.',
        editConfirmButton: 'Oo, buksan muli',
        insightsTitle: 'Mga Insight',
        insightsSubtitle: 'Mabilisang buod ng mga pattern sa pagbasang ito.',
        weaknessCardTitle: 'Pangunahing Kahinaan',
        weaknessCardDesc: (type, count, total) => `${type} — ${count} sa ${total} salitang may mali`,
        wcpmCardTitle: 'Salitang Tama Kada Minuto',
        wcpmUnit: 'salita/min',
        agreementCardTitle: 'Pagkakasundo sa Sistema',
        agreementCardDesc: (agreed, total) => `Sumang-ayon ka sa ${agreed} sa ${total} salitang na-flag ng sistema`,
        summaryNoErrors: (name) => `Walang kapansin-pansing pagkakamali si ${name} sa pagbasang ito.`,
        summaryWeakness: (name, type, count, total) =>
            `Ang pinakamadalas na uri ng mali ni ${name} ay ${type}, na naganap sa ${count} sa ${total} salitang na-flag.`,
        summaryWcpm: (name, wcpm) => `Nakabasa si ${name} nang humigit-kumulang ${wcpm} tamang salita kada minuto.`,
        summaryAgreement: (agreed, total) =>
            `Sinang-ayunan mo ang ${agreed} sa ${total} salitang na-flag ng sistema bilang hindi sigurado.`,
    },
    en: {
        loading: 'Loading results...',
        notFoundTitle: 'Not Found',
        notFoundDesc: "This reading isn't available anymore.",
        unnamedStudent: 'Student',
        resultsTabTitle: 'Results',
        resultsTabSubtitle: "This reading's scores across every metric.",
        editButton: 'Edit Results',
        editConfirmTitle: 'Reopen this review?',
        editConfirmText: "This will move it back to Pending Review, and it won't show up here again until you confirm it again.",
        editConfirmButton: 'Yes, reopen it',
        insightsTitle: 'Insights',
        insightsSubtitle: 'A quick summary of the patterns in this reading.',
        weaknessCardTitle: 'Dominant Weakness',
        weaknessCardDesc: (type, count, total) => `${type} — ${count} of ${total} flagged words`,
        wcpmCardTitle: 'Words Correct Per Minute',
        wcpmUnit: 'words/min',
        agreementCardTitle: 'Agreement with System',
        agreementCardDesc: (agreed, total) => `You agreed with ${agreed} of ${total} system-flagged words`,
        summaryNoErrors: (name) => `${name} had no notable errors flagged in this reading.`,
        summaryWeakness: (name, type, count, total) =>
            `${name}'s most common error type was ${type}, occurring in ${count} of the ${total} flagged words.`,
        summaryWcpm: (name, wcpm) => `${name} read at approximately ${wcpm} correct words per minute.`,
        summaryAgreement: (agreed, total) =>
            `You agreed with ${agreed} of the ${total} words the system flagged as uncertain.`,
    },
}
// Tallies each word's EFFECTIVE error type (teacher override if set,
// else the system's own — same resolution used everywhere else via
// effectiveErrorType()) and returns whichever non-'None' type occurs
// most often, plus its count and the total error count. Returns null
// when there were no errors at all — both the card and the summary
// sentence that use this fall back to a plain "no errors" message
// rather than claiming a "dominant weakness" out of zero errors.
function computeDominantWeakness(
    words: AttemptWord[],
    manualErrorType: Record<string, AttemptWord['error_type']>
): { type: string; count: number; total: number } | null {
    const counts: Record<string, number> = {}
    let total = 0
    for (const w of words) {
        const type = effectiveErrorType(w, manualErrorType)
        if (type === 'None') continue
        counts[type] = (counts[type] ?? 0) + 1
        total += 1
    }
    if (total === 0) return null
    let dominantType = ''
    let dominantCount = 0
    for (const [type, count] of Object.entries(counts)) {
        if (count > dominantCount) {
            dominantType = type
            dominantCount = count
        }
    }
    return { type: dominantType, count: dominantCount, total }
}
// Small icon per dominant weakness type — Insertion doesn't have a
// dedicated icon elsewhere in this codebase (PassageCard/SelectedWordsCard
// mark it with a dashed border instead of a corner icon), so it falls
// back to the same MinusCircle used for Omission here rather than
// pulling in a fourth icon just for this one card.
function weaknessIcon(type: string) {
    if (type === 'Mispronunciation') return <Ear size={20} />
    return <MinusCircle size={20} />
}
export const AttemptResults: React.FC = () => {
    const { attemptId } = useParams<{ attemptId: string }>()
    const navigate = useNavigate()
    const { lang } = useLang()
    const { theme } = useTheme()
    const { profile } = useProfile()
    const t = STRINGS[lang]
    const reviewT = REVIEW_STRINGS[lang]
    const { data: attempt, isLoading: attemptLoading, error: attemptError } = useAttemptQuery(attemptId)
    const { data: words, isLoading: wordsLoading } = useAttemptWordsQuery(attemptId, attempt?.status === 'scored')
    const { data: student } = useStudentProfileQuery(attempt?.student_id)
    const audioUrlQuery = useAttemptAudioUrlQuery(attempt?.audio_path)
    const reopenAttempt = useReopenAttemptMutation(profile?.id)
    // Starts on 'results' — see this file's header comment. Was 'review'.
    const [tab, setTab] = useState<AttemptResultsTab>('results')
    // Same tap-to-stack behavior as AttemptWordReview.tsx's own
    // selectedWordIds/handleWordClick — most-recently-tapped first,
    // re-tapping an already-stacked word REMOVES it (toggle), matching
    // SelectedWordsCard's own remove-X and search-results expectations
    // — see this file's SELECTEDWORDSCARD WIRING header comment. Purely
    // local UI state: nothing here is saved, since this page has
    // nothing left to save.
    const [selectedWordIds, setSelectedWordIds] = useState<string[]>([])
    const handleWordClick = (wordId: string) => {
        const alreadySelected = selectedWordIds.includes(wordId)
        setSelectedWordIds((prev) => (alreadySelected ? prev.filter((id) => id !== wordId) : [wordId, ...prev]))
        if (!alreadySelected) {
            document.getElementById('selected-words-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }
    const clearSelectedWords = () => setSelectedWordIds([])
    // DRAGGABLE DIVIDER state/refs — duplicated from AttemptWordReview.tsx;
    // see this file's own header comment for why.
    const [summaryHeight, setSummaryHeight] = useState<number | null>(null)
    const [isDraggingDivider, setIsDraggingDivider] = useState(false)
    const [minSummaryHeight, setMinSummaryHeight] = useState<number>(MIN_SUMMARY_HEIGHT_PX)
    const leftColumnRef = useRef<HTMLDivElement>(null)
    const summaryWrapperRef = useRef<HTMLDivElement>(null)
    const summaryContentRef = useRef<HTMLDivElement>(null)
    const headerRowRef = useRef<HTMLDivElement>(null)
    const naturalSummaryHeightRef = useRef<number>(0)
    const dragStartRef = useRef<{ startY: number; startHeight: number; leftColumnHeight: number; naturalHeight: number } | null>(null)
    // A different attempt loading in starts back at the default split
    // rather than carrying over a size dragged for a PREVIOUS attempt.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSummaryHeight(null)
    }, [attempt?.id])
    // MEASURED MINIMUM — see AttemptWordReview.tsx's own comment for the
    // full reasoning; identical logic here.
    //
    // DEPS INCLUDE `tab`: unlike AttemptWordReview.tsx (where this grid
    // is always mounted), this page only renders the review grid —
    // and therefore headerRowRef/summaryContentRef — while
    // tab === 'review'. The page LOADS on the 'results' tab by
    // default, so on first mount both refs are still null and this
    // effect bails out immediately below. Without `tab` in the deps,
    // that early return was PERMANENT: attempt?.id never changes just
    // from clicking the Review tab, so the effect never re-ran once
    // the elements actually existed, naturalSummaryHeightRef.current
    // stayed stuck at its initial 0, and the drag's upper bound fell
    // back to the much larger space-based max — letting the divider
    // be dragged well past the card's real full-content size into
    // empty space even when it looked "fully expanded". Adding `tab`
    // here makes this effect re-subscribe (and immediately
    // recompute()) the moment the Review tab actually mounts these
    // elements.
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
    }, [attempt?.id, tab])
    // MEASURED NATURAL MAXIMUM — same reasoning as AttemptWordReview.tsx.
    // Same `tab` dependency fix as the MEASURED MINIMUM effect above,
    // and for the same reason — this is the effect whose stuck-at-0
    // ref value was the actual cause of the over-drag bug.
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
    }, [attempt?.id, tab])
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
    // Confirm → clear reviewed_at/reviewed_by (useReopenAttemptMutation)
    // → land on the Pending Review LIST, not this attempt's own edit
    // screen. See this file's header comment for the full reasoning.
    const handleEditResults = async () => {
        if (!attemptId) return
        const confirmed = await showConfirmation(
            t.editConfirmTitle,
            t.editConfirmText,
            theme === 'dark',
            'question',
            t.editConfirmButton
        )
        if (!confirmed) return
        try {
            await reopenAttempt.mutateAsync(attemptId)
            navigate('/students/review')
        } catch (err) {
            console.error('AttemptResults: failed to reopen attempt for editing', err)
        }
    }
    if (attemptLoading || (attempt?.status === 'scored' && wordsLoading)) {
        return (
            <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
                <AttemptResultsSubNav />
                <div role="status" aria-busy="true" className="flex flex-col gap-4 py-2">
                    <span className="sr-only">{t.loading}</span>
                    <div className="rounded-3xl border border-gray-900/5 p-6 shadow-sm dark:border-gray-100/10 sm:p-8">
                        <Skeleton className="h-3 w-20 rounded-full" />
                        <Skeleton className="mt-3 h-6 w-1/2 rounded-lg" />
                        <div className="mt-5 flex flex-wrap gap-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-9 w-20 rounded-full" />
                            ))}
                        </div>
                    </div>
                    <div className="rounded-3xl border border-gray-900/5 p-6 shadow-sm dark:border-gray-100/10 sm:p-8">
                        <Skeleton className="h-3 w-24 rounded-full" />
                        <div className="mt-4 flex flex-col gap-2.5">
                            <Skeleton className="h-3.5 w-full rounded-full" />
                            <Skeleton className="h-3.5 w-full rounded-full" />
                            <Skeleton className="h-3.5 w-11/12 rounded-full" />
                            <Skeleton className="h-3.5 w-4/5 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    if (attemptError || !attempt) {
        return (
            <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
                <AttemptResultsSubNav />
                <section className="flex flex-col items-center gap-3 rounded-3xl border border-gray-900/5 p-8 text-center shadow-sm dark:border-gray-100/10">
                    <Owl mood="neutral" size={64} />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.notFoundTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">{t.notFoundDesc}</p>
                </section>
            </div>
        )
    }
    // Not actually confirmed yet — bounce to the real (editable) review
    // page instead of rendering a results view for data that isn't
    // final. Covers a stale bookmark, a direct URL visit, Confirm having
    // failed partway through, or "Edit Results" having just cleared
    // reviewed_at moments ago.
    if (!attempt.reviewed_at) {
        return <Navigate to={`/students/review/${attemptId}`} replace />
    }
    const studentName = student?.full_name || student?.username || t.unnamedStudent
    const wordList = words ?? []
    // Built straight from each word's PERSISTED values — there's no
    // local edit state on this page, everything here is final (until
    // "Edit Results" is used to reopen the editable review page).
    const verdicts = Object.fromEntries(wordList.map((w) => [w.id, w.teacher_verdict ?? w.system_verdict]))
    const manualFlags = Object.fromEntries(wordList.filter((w) => w.teacher_manual_flag).map((w) => [w.id, true]))
    const manualErrorType = Object.fromEntries(
        wordList
            .filter((w) => w.teacher_error_type_override != null)
            .map((w) => [w.id, w.teacher_error_type_override as (typeof w)['error_type']])
    )
    // Insight #1: dominant weakness — see computeDominantWeakness's own
    // comment. null when there were no errors at all.
    const dominantWeakness = computeDominantWeakness(wordList, manualErrorType)
    // Insight #2: words-correct-per-minute — correct-verdict word count
    // over the recording's actual duration. Hidden when duration_seconds
    // is missing or zero (older attempts predating the column, or a
    // simulated take with no real recording).
    const correctCount = wordList.filter((w) => verdicts[w.id] === 'correct').length
    const wcpm = attempt.duration_seconds && attempt.duration_seconds > 0
        ? Math.round(correctCount / (attempt.duration_seconds / 60))
        : null
    // Insight #3: system/teacher agreement — among words the SYSTEM
    // flagged as low-confidence, how many the teacher's final verdict
    // (teacher_verdict, always set on a confirmed attempt) matched the
    // system's own original verdict. Hidden when the system didn't flag
    // anything here.
    const systemFlaggedWords = wordList.filter((w) => w.confidence === 'low')
    const agreementCount = systemFlaggedWords.filter((w) => w.teacher_verdict === w.system_verdict).length
    // The plain-template summary sentence — see this file's header
    // comment for why this is a template and not a cloud-generated
    // paragraph. Built as a list of independent sentences (each only
    // included when its underlying number is actually available), then
    // joined with spaces into one short paragraph. Order: weakness (or
    // its "no errors" fallback) first since that's the most actionable
    // line, then pace, then the agreement-rate line last since it's more
    // about the review itself than about the pupil's reading.
    const summarySentences: string[] = []
    if (dominantWeakness) {
        summarySentences.push(t.summaryWeakness(studentName, dominantWeakness.type, dominantWeakness.count, dominantWeakness.total))
    } else {
        summarySentences.push(t.summaryNoErrors(studentName))
    }
    if (wcpm != null) {
        summarySentences.push(t.summaryWcpm(studentName, wcpm))
    }
    if (systemFlaggedWords.length > 0) {
        summarySentences.push(t.summaryAgreement(agreementCount, systemFlaggedWords.length))
    }
    const insightSummary = summarySentences.join(' ')
    // The "Edit Results" bar. Occupies the shared grid's "buttons" area
    // when wordList.length > 0 (same position Save Draft/Confirm Results
    // hold on the editable page) — otherwise just a plain block under
    // the single-column fallback. No lg:shrink-0 needed here now that
    // it lives in the grid's own auto-sized "buttons" row rather than as
    // a flex sibling inside a manually-sized column.
    const editBar = (
        <div className="flex flex-col gap-2 rounded-3xl border border-gray-900/5 bg-white/60 p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-900/40">
            <button
                onClick={handleEditResults}
                disabled={reopenAttempt.isPending}
                className={`flex items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59] ${
                    reopenAttempt.isPending ? 'cursor-not-allowed opacity-60 hover:translate-y-0' : 'cursor-pointer'
                }`}
            >
                <Pencil size={17} />
                {t.editButton}
            </button>
        </div>
    )
    // Small self-contained insight card — label, big value, one line of
    // context underneath. Deliberately its own visual shape (not
    // ScorePill, which is a compact inline pill meant for the header
    // row) since these carry more explanatory text than a pill can hold.
    const insightCard = (icon: React.ReactNode, label: string, value: string, desc: string) => (
        <div className="flex flex-col gap-2 rounded-2xl border border-gray-900/5 bg-white/60 p-4 dark:border-gray-100/10 dark:bg-gray-900/40">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                {icon}
                <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
            </div>
            <span className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{value}</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{desc}</span>
        </div>
    )
    const hasAnyInsight = dominantWeakness != null || wcpm != null || systemFlaggedWords.length > 0
    const hasWords = wordList.length > 0
    return (
        <div className={hasWords ? 'mx-auto w-full max-w-[1350px] px-6 pb-12 pt-2 sm:px-10' : 'mx-auto max-w-3xl px-4 pb-12 pt-2'}>
            <AttemptResultsSubNav tab={tab} onTabChange={setTab} />
            {tab === 'review' ? (
                hasWords ? (
                    // Same CSS as AttemptWordReview.tsx's own grid — see
                    // this file's LAYOUT header comment for why it's
                    // duplicated here rather than shared, and
                    // REVIEW_HEIGHT_BUDGET for where these two numbers
                    // come from.
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
                                            audioUrl={audioUrlQuery.data ?? null}
                                            showScores={false}
                                            headerRef={headerRowRef}
                                        />
                                    </div>
                                </div>
                                {/* DRAGGABLE DIVIDER — lg only, duplicated
                                from AttemptWordReview.tsx; see this
                                file's header comment. Double-click
                                resets to the default split. */}
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
                                {/* Just sizing here — PassageCard owns
                                its own internal header/scroll split
                                (see that file's own comment). */}
                                <div className="lg:min-h-0 lg:flex-1">
                                    <PassageCard
                                        words={wordList}
                                        verdicts={verdicts}
                                        manualFlags={manualFlags}
                                        manualErrorType={manualErrorType}
                                        selectedWordIds={selectedWordIds}
                                        t={reviewT}
                                        onWordClick={handleWordClick}
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
                                    onClearAll={clearSelectedWords}
                                    onWordClick={handleWordClick}
                                    readOnly
                                />
                            </div>
                            <div style={{ gridArea: 'buttons' }}>
                                {editBar}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col gap-6">
                        <ResultsSummaryCard
                            attempt={attempt}
                            studentName={studentName}
                            words={wordList}
                            manualFlags={manualFlags}
                            t={reviewT}
                            audioUrl={audioUrlQuery.data ?? null}
                            showScores={false}
                        />
                        <PassageCard
                            words={wordList}
                            verdicts={verdicts}
                            manualFlags={manualFlags}
                            manualErrorType={manualErrorType}
                            selectedWordIds={selectedWordIds}
                            t={reviewT}
                            onWordClick={handleWordClick}
                        />
                        {editBar}
                    </div>
                )
            ) : (
                <section className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
                    <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
                    <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
                    <div className="relative">
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.resultsTabTitle}</h2>
                        <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{t.resultsTabSubtitle}</p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <ScorePill label={reviewT.accuracy} value={attempt.accuracy_score} />
                            <ScorePill label={reviewT.fluency} value={attempt.fluency_score} />
                            <ScorePill label={reviewT.completeness} value={attempt.completeness_score} />
                            <ScorePill label={reviewT.prosody} value={attempt.prosody_score} />
                            <ScorePill label={reviewT.pronunciation} value={attempt.pron_score} />
                        </div>
                        {hasAnyInsight && (
                            <div className="mt-8 border-t border-dashed border-gray-900/10 pt-6 dark:border-gray-100/10">
                                <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.insightsTitle}</h3>
                                <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{t.insightsSubtitle}</p>
                                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 dark:border-teal-400/20 dark:bg-teal-400/5">
                                    <MessageSquareText size={20} className="mt-0.5 shrink-0 text-teal-600 dark:text-teal-300" />
                                    <p className="text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-300">{insightSummary}</p>
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {dominantWeakness &&
                                        insightCard(
                                            weaknessIcon(dominantWeakness.type),
                                            t.weaknessCardTitle,
                                            dominantWeakness.type,
                                            t.weaknessCardDesc(dominantWeakness.type, dominantWeakness.count, dominantWeakness.total)
                                        )}
                                    {wcpm != null &&
                                        insightCard(<Gauge size={20} />, t.wcpmCardTitle, `${wcpm}`, t.wcpmUnit)}
                                    {systemFlaggedWords.length > 0 &&
                                        insightCard(
                                            <ThumbsUp size={20} />,
                                            t.agreementCardTitle,
                                            `${agreementCount}/${systemFlaggedWords.length}`,
                                            t.agreementCardDesc(agreementCount, systemFlaggedWords.length)
                                        )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    )
}
export default AttemptResults