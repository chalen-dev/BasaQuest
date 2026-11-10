// File: ReviewList.tsx
// File: ReviewList.tsx
// File: src/pages/proficiency/review/ReviewListPage.tsx
//
// "Send"-mode review inbox — attempts that finished scoring but haven't
// been confirmed by the teacher yet ("Now"-mode attempts are reviewed
// inline right after the session instead, see AssessmentSession.tsx, so
// they never linger here for long, but they CAN still show up if a
// teacher exits before confirming). Routed at /students/review, third
// tab in StudentsSubNav.
//
// SUBMITTED-AT TIMESTAMP: each row shows when the reading was actually
// recorded (attempt.created_at — the same column the list is now sorted
// by, see hooks.ts), formatted in Philippine time (Asia/Manila) via
// formatPHTime() below rather than the browser's local timezone. This
// app's whole userbase is assumed to be in the Philippines regardless of
// what timezone a teacher's device happens to be set to, so a fixed
// timeZone in the Intl.DateTimeFormat call is deliberate — NOT a bug to
// "fix" by dropping it and letting the browser localize automatically.
//
// DAYS-LEFT BADGE: recordings are deleted 7 days after the attempt was
// created (attempt.purge_after — see the purge-expired-recordings Edge
// Function + its pg_cron job), whether or not the review has been
// confirmed by then, and that deadline never resets once it has been.
// Deliberately made bigger/bolder than the rest of the row (not just
// another gray meta pill) so a teacher scanning this list can spot
// "about to expire" readings at a glance — see daysLeftBadge() below.
//
// LOADING STATE: skeleton rows (see components/ui/Skeleton.tsx) instead
// of a centered OwlLoader spinner — 5 placeholder rows shaped like the
// real ones below (icon chip, name+badge line, subtitle line, timestamp
// line, trailing arrow) so the list's eventual shape is visible while
// it's still fetching, rather than an unrelated spinner card.
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Mic, ArrowRight, Clock, Loader2, RotateCcw, TimerReset, TriangleAlert } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useProfile } from '../../../hooks/useProfile'
import { Pagination } from '../../../components/ui/Pagination'
import { Skeleton } from '../../../components/ui/Skeleton'
import { SourceBadge } from '../../../components/ui/SourceBadge'
import { DifficultyStars } from '../../../components/ui/DifficultyStars'
import type { Lang } from '../../../components/buttons/LangToggle'
import { useRetryScoring } from '../pre_assessment/assessment_session/features/useSubmitAttempt'
import { REVIEW_PAGE_SIZE, SCORING_STUCK_MINUTES, useNow, usePendingReviewAttemptsQuery, useScoringInProgressQuery } from './hooks'
type ReviewFilter = 'all' | 'scoring' | 'notScored' | 'scored'
const STRINGS: Record<Lang, {
    title: string
    subtitle: string
    loading: string
    emptyTitle: string
    emptyDesc: string
    resultsCount: (n: number) => string
    gradeLabel: (n: number) => string
    filipinoLabel: string
    englishLabel: string
    reviewButton: string
    unnamedStudent: string
    daysLeft: (n: number) => string
    dayLeft: string
    dueToday: string
    expired: string
    scoringFailed: string
    scoringInProgress: string
    scoringSectionTitle: string
    scoringSectionDesc: string
    scoringStuck: string
    failedSectionTitle: string
    failedSectionDesc: string
    retryButton: string
    retryingLabel: string
    filterAll: string
    filterScoring: string
    filterNotScored: string
    filterScored: string
    filterEmpty: string
}> = {
    fil: {
        title: 'Naghihintay ng Review',
        subtitle: 'Mga pagbasang naisumite at nasuri na ng sistema, hinihintay ang iyong kumpirmasyon.',
        loading: 'Kinukuha ang listahan...',
        emptyTitle: 'Walang naghihintay na review.',
        emptyDesc: 'Lahat ng nasuring pagbasa ay nakumpirma na.',
        resultsCount: (n) => `${n} naghihintay`,
        gradeLabel: (n) => `Baitang ${n}`,
        filipinoLabel: 'Filipino',
        englishLabel: 'English',
        reviewButton: 'Suriin',
        unnamedStudent: 'Estudyante',
        daysLeft: (n) => `${n} araw na lang`,
        dayLeft: '1 araw na lang',
        dueToday: 'Mawawala ngayon',
        expired: 'Nawala na',
        scoringFailed: 'Hindi nasuri',
        scoringInProgress: 'Sinusuri pa...',
        scoringSectionTitle: 'Sinusuri pa',
        scoringSectionDesc: 'Lalabas dito ang mga pagbasang ito pagkatapos masuri. Hindi mo kailangang hintayin.',
        scoringStuck: 'Matagal na ito. Buksan para subukan muli.',
        failedSectionTitle: 'Hindi nasuri',
        failedSectionDesc: 'Naka-save ang recording. Subukan muli para masuri ulit.',
        retryButton: 'Subukan muli',
        retryingLabel: 'Sinusubukan...',
        filterAll: 'Lahat',
        filterScoring: 'Sinusuri pa',
        filterNotScored: 'Hindi nasuri',
        filterScored: 'Nasuri na',
        filterEmpty: 'Wala pa rito ngayon.',
    },
    en: {
        title: 'Pending Review',
        subtitle: "Readings that finished scoring and are waiting on your confirmation.",
        loading: 'Loading...',
        emptyTitle: 'Nothing waiting for review.',
        emptyDesc: 'Every scored reading has been confirmed.',
        resultsCount: (n) => `${n} pending`,
        gradeLabel: (n) => `Grade ${n}`,
        filipinoLabel: 'Filipino',
        englishLabel: 'English',
        reviewButton: 'Review',
        unnamedStudent: 'Student',
        daysLeft: (n) => `${n} days left`,
        dayLeft: '1 day left',
        dueToday: 'Deletes today',
        expired: 'Recording gone',
        scoringFailed: "Couldn't score",
        scoringInProgress: 'Scoring in progress...',
        scoringSectionTitle: 'Being scored',
        scoringSectionDesc: "These readings join the list below as soon as they're scored. You don't need to wait.",
        scoringStuck: 'Taking longer than usual. Open it to retry.',
        failedSectionTitle: "Couldn't be scored",
        failedSectionDesc: 'The recording is saved. Retry to score it again.',
        retryButton: 'Retry',
        retryingLabel: 'Retrying...',
        filterAll: 'All',
        filterScoring: 'Being scored',
        filterNotScored: 'Not scored',
        filterScored: 'Scored',
        filterEmpty: 'Nothing here right now.',
    },
}
// Fixed to Asia/Manila regardless of the viewing device's own timezone —
// see this file's header comment for why that's deliberate, not a bug.
function formatPHTime(isoString: string): string {
    return new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(isoString))
}
type DaysLeftTone = 'safe' | 'soon' | 'urgent' | 'gone'
function daysLeftInfo(purgeAfter: string, t: (typeof STRINGS)['en']): { label: string; tone: DaysLeftTone } {
    const msLeft = new Date(purgeAfter).getTime() - Date.now()
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000))
    if (daysLeft <= 0) return { label: t.expired, tone: 'gone' }
    if (daysLeft === 1) return { label: t.dayLeft, tone: 'urgent' }
    if (daysLeft <= 2) return { label: t.daysLeft(daysLeft), tone: 'urgent' }
    if (daysLeft <= 3) return { label: t.daysLeft(daysLeft), tone: 'soon' }
    return { label: t.daysLeft(daysLeft), tone: 'safe' }
}
const TONE_CLASSES: Record<DaysLeftTone, string> = {
    safe: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
    soon: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    urgent: 'bg-red-500/15 text-red-700 dark:text-red-300',
    gone: 'bg-gray-500/15 text-gray-500 dark:text-gray-400',
}
// Deliberately bigger/bolder than the other meta pills on the row (see
// this file's header comment) — text-sm + font-extrabold instead of the
// text-xs/font-semibold used for grade/language pills, plus an icon, so
// it reads as "pay attention to this" rather than blending into the rest
// of the row's metadata.
function DaysLeftBadge({ purgeAfter, t }: { purgeAfter: string; t: (typeof STRINGS)['en'] }) {
    const { label, tone } = daysLeftInfo(purgeAfter, t)
    return (
        <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-base font-extrabold ${TONE_CLASSES[tone]}`}>
            <TimerReset size={17} />
            {label}
        </span>
    )
}
export const ReviewListPage: React.FC = () => {
    const { lang } = useLang()
    const { profile } = useProfile()
    const navigate = useNavigate()
    const t = STRINGS[lang]
    const [page, setPage] = useState(0)
    const { data, isPending: isLoading, error } = usePendingReviewAttemptsQuery({ teacherId: profile?.id, page })
    const attempts = data?.attempts ?? []
    const queryClient = useQueryClient()
    const { data: inProgressData } = useScoringInProgressQuery(profile?.id)
    const attention = inProgressData ?? []
    const inProgress = attention.filter((a) => a.status !== 'failed')
    const failed = attention.filter((a) => a.status === 'failed')
    const now = useNow()
    // Filter by where a reading is: being scored (something is working on it), not
    // scored (failed, or waiting so long that nothing is working on it) or scored.
    const [filter, setFilter] = useState<ReviewFilter>('all')
    const chooseFilter = (next: ReviewFilter) => {
        setFilter(next)
        setPage(0)
    }
    const isStuck = (a: { created_at: string }) => now - new Date(a.created_at).getTime() > SCORING_STUCK_MINUTES * 60_000
    const scoringNow = inProgress.filter((a) => !isStuck(a))
    const stuckList = inProgress.filter(isStuck)
    const scoredTotal = data?.total ?? 0
    const showFailed = failed.length > 0 && (filter === 'all' || filter === 'notScored')
    const inProgressShown = filter === 'all' ? inProgress : filter === 'scoring' ? scoringNow : filter === 'notScored' ? stuckList : []
    const showScored = filter === 'all' || filter === 'scored'
    const filterCounts: Record<ReviewFilter, number> = {
        all: scoredTotal + attention.length,
        scoring: scoringNow.length,
        notScored: failed.length + stuckList.length,
        scored: scoredTotal,
    }
    const nothingToShow = !showFailed && inProgressShown.length === 0 && (!showScored || attempts.length === 0)
    // Retrying holds until scoring ends, so the row shows a spinner of its own meanwhile.
    const retryScoring = useRetryScoring()
    const [retrying, setRetrying] = useState<string[]>([])
    const handleRetry = async (attempt: { id: string; language: 'en' | 'fil'; passage_text: string }) => {
        setRetrying((ids) => [...ids, attempt.id])
        // Check in shortly after it starts: the row then moves to "being scored".
        const early = window.setTimeout(() => void queryClient.invalidateQueries({ queryKey: ['pending-review-attempts'] }), 1500)
        try {
            await retryScoring.mutateAsync({ attemptId: attempt.id, language: attempt.language, passageText: attempt.passage_text })
        } catch (err) {
            console.error('ReviewList: retry scoring failed', err)
        } finally {
            window.clearTimeout(early)
            setRetrying((ids) => ids.filter((id) => id !== attempt.id))
            void queryClient.invalidateQueries({ queryKey: ['pending-review-attempts'] })
            void queryClient.invalidateQueries({ queryKey: ['pending-review-count'] })
        }
    }
    // When a reading finishes scoring it leaves the section above: refresh the list
    // and the count so it shows up below (and in the header badge) right away.
    const previousInProgress = useRef(0)
    useEffect(() => {
        if (inProgress.length < previousInProgress.current) {
            void queryClient.invalidateQueries({ queryKey: ['pending-review-attempts'] })
            void queryClient.invalidateQueries({ queryKey: ['pending-review-count'] })
        }
        previousInProgress.current = inProgress.length
    }, [inProgress.length, queryClient])
    const total = scoredTotal + attention.length
    // Pages hold scored readings only, which is all the query pages through.
    const pageCount = Math.max(1, Math.ceil(scoredTotal / REVIEW_PAGE_SIZE))
    return (
        <>
            <section className="relative mb-6 overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
                <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
                <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
                <div
                    className="pointer-events-none absolute inset-0 dark:hidden"
                    style={{ background: 'radial-gradient(circle at 88% -20%, rgba(255,198,75,0.4), transparent 55%)' }}
                />
                <div
                    className="pointer-events-none absolute inset-0 hidden dark:block"
                    style={{ background: 'radial-gradient(circle at 88% -20%, rgba(45,212,191,0.28), transparent 55%)' }}
                />
                <div className="relative">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h1>
                    <p className="mt-1.5 text-base font-medium text-gray-600 dark:text-gray-400">{t.subtitle}</p>
                    {!isLoading && !error && total > 0 && (
                        <p className="mt-3.5 text-base font-semibold text-gray-500 dark:text-gray-400">{t.resultsCount(total)}</p>
                    )}
                </div>
            </section>
            {isLoading ? (
                <div role="status" aria-busy="true" className="flex flex-col gap-3.5">
                    <span className="sr-only">{t.loading}</span>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-5 rounded-2xl border-2 border-gray-900/5 bg-white p-5 dark:border-gray-100/10 dark:bg-gray-900"
                        >
                            <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2.5">
                                    <Skeleton className="h-4 w-40 rounded-full" />
                                    <Skeleton className="h-3.5 w-16 rounded-full" />
                                </div>
                                <Skeleton className="mt-2.5 h-3.5 w-48 rounded-full" />
                                <Skeleton className="mt-2.5 h-3 w-28 rounded-full" />
                            </div>
                            <Skeleton className="h-9 w-28 shrink-0 rounded-full" />
                            <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-7 text-base font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                    {error instanceof Error ? error.message : String(error)}
                </div>
            ) : attempts.length === 0 && attention.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-12 text-center dark:border-gray-100/10 dark:bg-gray-900">
                    <p className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.emptyTitle}</p>
                    <p className="mt-1.5 text-base font-medium text-gray-500 dark:text-gray-300">{t.emptyDesc}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3.5">
                    <div role="group" aria-label="Filter" className="mb-1 flex flex-wrap items-center gap-2.5">
                        {(
                            [
                                ['all', t.filterAll],
                                ['scoring', t.filterScoring],
                                ['notScored', t.filterNotScored],
                                ['scored', t.filterScored],
                            ] as const
                        ).map(([value, label]) => {
                            const selected = filter === value
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => chooseFilter(value)}
                                    aria-pressed={selected}
                                    className={`flex cursor-pointer items-center gap-2 rounded-full border-2 px-4 py-2 text-base font-bold transition-colors duration-150 ${
                                        selected
                                            ? 'border-teal-500 bg-teal-500 text-white shadow-[0_3px_0_0_#0f766e] dark:border-teal-600 dark:bg-teal-600 dark:shadow-[0_3px_0_0_#115e59]'
                                            : 'border-gray-900/10 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    {label}
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-sm font-extrabold ${
                                            selected ? 'bg-white/25 text-white' : 'bg-gray-900/10 text-gray-600 dark:bg-gray-100/10 dark:text-gray-300'
                                        }`}
                                    >
                                        {filterCounts[value]}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                    {nothingToShow && (
                        <div className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-8 text-center text-base font-bold text-gray-500 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300">
                            {t.filterEmpty}
                        </div>
                    )}
                    {showFailed && (
                        <section role="alert" aria-label={t.failedSectionTitle} className="mb-2 flex flex-col gap-3 rounded-3xl border-2 border-rose-500/50 bg-rose-50 p-4 dark:border-rose-400/40 dark:bg-gray-950">
                            <div className="flex items-start gap-3 px-2">
                                <TriangleAlert size={22} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                                <div>
                                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">
                                        {t.failedSectionTitle} ({failed.length})
                                    </h2>
                                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t.failedSectionDesc}</p>
                                </div>
                            </div>
                            {failed.map((attempt) => {
                                const name = attempt.student?.full_name || attempt.student?.username || t.unnamedStudent
                                const isRetrying = retrying.includes(attempt.id)
                                return (
                                    <div
                                        key={attempt.id}
                                        className="flex items-center gap-3 rounded-2xl border-2 border-gray-900/5 bg-white p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-900"
                                    >
                                        <button
                                            onClick={() => navigate(`/students/review/${attempt.id}`)}
                                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left"
                                        >
                                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                                <TriangleAlert size={22} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{name}</span>
                                                    <span className="rounded-full bg-gray-900/5 px-3 py-1 text-sm font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                                        {attempt.language === 'fil' ? t.filipinoLabel : t.englishLabel}
                                                    </span>
                                                    <span className="rounded-full bg-rose-500/15 px-3 py-1 text-sm font-bold text-rose-700 dark:bg-rose-400/15 dark:text-rose-300">
                                                        {t.scoringFailed}
                                                    </span>
                                                </span>
                                                {attempt.passage_title && (
                                                    <span className="mt-1 block truncate text-base font-semibold text-gray-500 dark:text-gray-400">{attempt.passage_title}</span>
                                                )}
                                                {attempt.error_message && (
                                                    <span className="mt-0.5 block truncate text-xs font-semibold text-gray-400 dark:text-gray-500">{attempt.error_message}</span>
                                                )}
                                                <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-400 dark:text-gray-500">
                                                    <Clock size={13} />
                                                    {formatPHTime(attempt.created_at)}
                                                </span>
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => void handleRetry(attempt)}
                                            disabled={isRetrying}
                                            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                                        >
                                            {isRetrying ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <RotateCcw size={16} />}
                                            {isRetrying ? t.retryingLabel : t.retryButton}
                                        </button>
                                    </div>
                                )
                            })}
                        </section>
                    )}
                    {inProgressShown.length > 0 && (
                        <section aria-label={t.scoringSectionTitle} className="mb-2 flex flex-col gap-3 rounded-3xl border-2 border-dashed border-amber-500/50 bg-amber-50 p-4 dark:border-amber-400/40 dark:bg-gray-950">
                            <div className="px-2">
                                <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.scoringSectionTitle}</h2>
                                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t.scoringSectionDesc}</p>
                            </div>
                            {inProgressShown.map((attempt) => {
                                const name = attempt.student?.full_name || attempt.student?.username || t.unnamedStudent
                                const stuck = now - new Date(attempt.created_at).getTime() > SCORING_STUCK_MINUTES * 60_000
                                return (
                                    <button
                                        key={attempt.id}
                                        onClick={() => navigate(`/students/review/${attempt.id}`)}
                                        className="group flex cursor-pointer items-center gap-5 rounded-2xl border-2 border-gray-900/5 bg-white p-5 text-left shadow-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-100/10 dark:bg-gray-900"
                                    >
                                        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${stuck ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                                            {stuck ? <TriangleAlert size={24} /> : <Loader2 size={24} className="animate-spin motion-reduce:animate-none" />}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <span className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{name}</span>
                                                <span className="rounded-full bg-gray-900/5 px-3 py-1 text-sm font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                                    {attempt.language === 'fil' ? t.filipinoLabel : t.englishLabel}
                                                </span>
                                                <span className={`rounded-full px-3 py-1 text-sm font-bold ${stuck ? 'bg-rose-500/15 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300' : 'bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300'}`}>
                                                    {stuck ? t.scoringStuck : t.scoringInProgress}
                                                </span>
                                            </div>
                                            {attempt.passage_title && (
                                                <div className="mt-1 truncate text-base font-semibold text-gray-500 dark:text-gray-400">{attempt.passage_title}</div>
                                            )}
                                            <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-400 dark:text-gray-500">
                                                <Clock size={13} />
                                                {formatPHTime(attempt.created_at)}
                                            </div>
                                        </div>
                                        <ArrowRight size={20} className="shrink-0 text-gray-400 dark:text-gray-500" />
                                    </button>
                                )
                            })}
                        </section>
                    )}
                    {showScored && attempts.map((attempt) => {
                        const name = attempt.student?.full_name || attempt.student?.username || t.unnamedStudent
                        return (
                            <button
                                key={attempt.id}
                                onClick={() => navigate(`/students/review/${attempt.id}`)}
                                className="group flex cursor-pointer items-center gap-5 rounded-2xl border-2 border-gray-900/5 bg-white p-6 text-left shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-amber-100 dark:hover:bg-amber-950 hover:shadow-lg hover:shadow-amber-500/15 active:translate-y-0 active:scale-[0.99] active:shadow-sm dark:border-gray-100/10 dark:bg-gray-900 dark:hover:border-amber-400/60"
                            >
                                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
                                    <Mic size={26} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <span className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{name}</span>
                                        {attempt.student?.grade_level != null && (
                                            <span className="rounded-full bg-gray-900/5 px-3.5 py-1.5 text-base font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                                {t.gradeLabel(attempt.student.grade_level)}
                                            </span>
                                        )}
                                        <span className="rounded-full bg-gray-900/5 px-3.5 py-1.5 text-base font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                            {attempt.language === 'fil' ? t.filipinoLabel : t.englishLabel}
                                        </span>
                                        <SourceBadge source="fluent_reading" />
                                        <DifficultyStars text={attempt.passage_text} language={attempt.language} size={16} className="!px-3.5 !py-2" />
                                        {attempt.status === 'processing' && (
                                            <span className="rounded-full bg-amber-500/15 px-3.5 py-1.5 text-base font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                                                {t.scoringInProgress}
                                            </span>
                                        )}
                                        {attempt.status === 'failed' && (
                                            <span className="rounded-full bg-rose-500/15 px-3.5 py-1.5 text-base font-bold text-rose-700 dark:bg-rose-400/15 dark:text-rose-300">
                                                {t.scoringFailed}
                                            </span>
                                        )}
                                    </div>
                                    {attempt.passage_title && (
                                        <div className="mt-1 truncate text-base font-semibold text-gray-500 dark:text-gray-400">
                                            {attempt.passage_title}
                                            {attempt.accuracy_score != null ? ` · ${Math.round(attempt.accuracy_score)}%` : ''}
                                        </div>
                                    )}
                                    <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-400 dark:text-gray-500">
                                        <Clock size={13} />
                                        {formatPHTime(attempt.created_at)}
                                    </div>
                                </div>
                                <DaysLeftBadge purgeAfter={attempt.purge_after} t={t} />
                                <ArrowRight size={22} className="shrink-0 text-gray-400 transition-[transform,color] duration-150 group-hover:translate-x-1 group-hover:text-amber-500 dark:text-gray-500 dark:group-hover:text-amber-400" />
                            </button>
                        )
                    })}
                </div>
            )}
            {showScored && <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="mt-5" />}
        </>
    )
}
export default ReviewListPage