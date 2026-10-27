// File: ResultsList.tsx
// File: src/pages/students/results/ResultsListPage.tsx
//
// "Results" tab — every attempt this teacher has already reviewed and
// confirmed, most recently confirmed first. The counterpart to
// ReviewList.tsx (which shows what's still PENDING, and stays over in
// review/); this shows what's DONE. Each row links to AttemptResults.tsx
// (also in this folder), the same read-only results page a teacher
// lands on right after confirming — so browsing back to an old result
// and just having confirmed one look identical.
//
// DAYS-LEFT BADGE: recordings now survive review — deletion is anchored
// to attempt.purge_after (created_at + 7 days, never reset by review —
// see hooks.ts and the purge-expired-recordings Edge Function), not to
// when the review was confirmed. So a confirmed result can still have a
// recording attached for a little while, and this shows the same
// countdown badge ReviewList.tsx does, for the same reason: easy to spot
// at a glance which ones are about to lose their recording.
//
// Lives in its own results/ folder (sibling to dashboard/, list/,
// remediation/, review/) but still pulls REVIEW_PAGE_SIZE and
// useReviewedAttemptsQuery from review/hooks.ts, since that's the
// single shared data layer for both the pending-review and
// already-reviewed lists.
//
// Same list/pagination shape as ReviewList.tsx (REVIEW_PAGE_SIZE,
// Pagination component) — deliberately not sharing a single generic
// component between the two, since the query, empty-state copy, and
// timestamp shown (reviewed_at here vs. created_at there) all differ
// enough that a shared component would need more branching than it's
// worth for two lists this small. Same reasoning applies to the loading
// skeleton below — it's a near-duplicate of ReviewList.tsx's, not
// extracted into a shared component for the same reason.
//
// LOADING STATE: skeleton rows (see components/ui/Skeleton.tsx) instead
// of a centered OwlLoader spinner — 5 placeholder rows shaped like the
// real ones below.
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, ArrowRight, Clock, TimerReset } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useProfile } from '../../../hooks/useProfile'
import { Pagination } from '../../../components/ui/Pagination'
import { Skeleton } from '../../../components/ui/Skeleton'
import { DifficultyStars } from '../../../components/ui/DifficultyStars'
import type { Lang } from '../../../components/buttons/LangToggle'
import { REVIEW_PAGE_SIZE, useReviewedAttemptsQuery } from '../review/hooks'
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
    unnamedStudent: string
    daysLeft: (n: number) => string
    dayLeft: string
    dueToday: string
    expired: string
}> = {
    fil: {
        title: 'Mga Resulta',
        subtitle: 'Mga pagbasang nasuri at nakumpirma mo na.',
        loading: 'Kinukuha ang listahan...',
        emptyTitle: 'Wala pang nakumpirmang resulta.',
        emptyDesc: 'Lalabas dito ang bawat pagbasang nakumpirma mo na.',
        resultsCount: (n) => `${n} nakumpirma`,
        gradeLabel: (n) => `Baitang ${n}`,
        filipinoLabel: 'Filipino',
        englishLabel: 'English',
        unnamedStudent: 'Estudyante',
        daysLeft: (n) => `${n} araw na lang`,
        dayLeft: '1 araw na lang',
        dueToday: 'Mawawala ngayon',
        expired: 'Nawala na',
    },
    en: {
        title: 'Results',
        subtitle: "Readings you've already reviewed and confirmed.",
        loading: 'Loading...',
        emptyTitle: 'No confirmed results yet.',
        emptyDesc: "Every reading you've confirmed will show up here.",
        resultsCount: (n) => `${n} confirmed`,
        gradeLabel: (n) => `Grade ${n}`,
        filipinoLabel: 'Filipino',
        englishLabel: 'English',
        unnamedStudent: 'Student',
        daysLeft: (n) => `${n} days left`,
        dayLeft: '1 day left',
        dueToday: 'Deletes today',
        expired: 'Recording gone',
    },
}
// Fixed to Asia/Manila regardless of the viewing device's own timezone —
// same reasoning as ReviewList.tsx's own copy of this helper.
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
function DaysLeftBadge({ purgeAfter, t }: { purgeAfter: string; t: (typeof STRINGS)['en'] }) {
    const { label, tone } = daysLeftInfo(purgeAfter, t)
    return (
        <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-base font-extrabold ${TONE_CLASSES[tone]}`}>
            <TimerReset size={17} />
            {label}
        </span>
    )
}
export const ResultsListPage: React.FC = () => {
    const { lang } = useLang()
    const { profile } = useProfile()
    const navigate = useNavigate()
    const t = STRINGS[lang]
    const [page, setPage] = useState(0)
    const { data, isPending: isLoading, error } = useReviewedAttemptsQuery({ teacherId: profile?.id, page })
    const attempts = data?.attempts ?? []
    const total = data?.total ?? 0
    const pageCount = Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE))
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
            ) : attempts.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-12 text-center dark:border-gray-100/10 dark:bg-gray-900">
                    <p className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.emptyTitle}</p>
                    <p className="mt-1.5 text-base font-medium text-gray-500 dark:text-gray-300">{t.emptyDesc}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3.5">
                    {attempts.map((attempt) => {
                        const name = attempt.student?.full_name || attempt.student?.username || t.unnamedStudent
                        return (
                            <button
                                key={attempt.id}
                                onClick={() => navigate(`/students/review/${attempt.id}/results`)}
                                className="flex cursor-pointer items-center gap-5 rounded-2xl border-2 border-gray-900/5 bg-white p-6 text-left shadow-sm transition-colors duration-150 hover:border-teal-500/30 dark:border-gray-100/10 dark:bg-gray-900 dark:hover:border-teal-400/30"
                            >
                                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-green-500/15 text-green-600 dark:text-green-400">
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
                                        <DifficultyStars text={attempt.passage_text} language={attempt.language} size={16} className="!px-3.5 !py-2" />
                                    </div>
                                    {attempt.passage_title && (
                                        <div className="mt-1 truncate text-base font-semibold text-gray-500 dark:text-gray-400">
                                            {attempt.passage_title}
                                            {attempt.accuracy_score != null ? ` · ${Math.round(attempt.accuracy_score)}%` : ''}
                                        </div>
                                    )}
                                    <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-400 dark:text-gray-500">
                                        <Clock size={13} />
                                        {formatPHTime(attempt.reviewed_at)}
                                    </div>
                                </div>
                                <DaysLeftBadge purgeAfter={attempt.purge_after} t={t} />
                                <ArrowRight size={22} className="shrink-0 text-gray-400 dark:text-gray-500" />
                            </button>
                        )
                    })}
                </div>
            )}
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="mt-5" />
        </>
    )
}
export default ResultsListPage