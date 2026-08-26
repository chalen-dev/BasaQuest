// File: ReviewList.tsx
// File: ReviewList.tsx
// File: src/pages/students/review/ReviewList.tsx
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
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, ArrowRight, Clock } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useProfile } from '../../../hooks/useProfile'
import { Pagination } from '../../../components/ui/Pagination'
import { OwlLoader } from '../../../components/ui/OwlLoader'
import type { Lang } from '../../../components/buttons/LangToggle'
import { StudentsSubNav } from '../components/StudentsSubNav'
import { REVIEW_PAGE_SIZE, usePendingReviewAttemptsQuery } from './hooks'
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
export const ReviewList: React.FC = () => {
    const { lang } = useLang()
    const { profile } = useProfile()
    const navigate = useNavigate()
    const t = STRINGS[lang]
    const [page, setPage] = useState(0)
    const { data, isLoading, error } = usePendingReviewAttemptsQuery({ teacherId: profile?.id, page })
    const attempts = data?.attempts ?? []
    const total = data?.total ?? 0
    const pageCount = Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE))
    return (
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">
            <div className="mb-4">
                <StudentsSubNav />
            </div>
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
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h1>
                    <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{t.subtitle}</p>
                    {!isLoading && !error && total > 0 && (
                        <p className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400">{t.resultsCount(total)}</p>
                    )}
                </div>
            </section>
            {isLoading ? (
                <div className="flex justify-center py-10">
                    <OwlLoader message={t.loading} />
                </div>
            ) : error ? (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                    {error instanceof Error ? error.message : String(error)}
                </div>
            ) : attempts.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-10 text-center dark:border-gray-100/10 dark:bg-gray-900">
                    <p className="text-base font-extrabold text-gray-900 dark:text-gray-50">{t.emptyTitle}</p>
                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-300">{t.emptyDesc}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {attempts.map((attempt) => {
                        const name = attempt.student?.full_name || attempt.student?.username || t.unnamedStudent
                        return (
                            <button
                                key={attempt.id}
                                onClick={() => navigate(`/students/review/${attempt.id}`)}
                                className="flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-gray-900/5 bg-white p-4 text-left shadow-sm transition-colors duration-150 hover:border-teal-500/30 dark:border-gray-100/10 dark:bg-gray-900 dark:hover:border-teal-400/30"
                            >
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
                                    <Mic size={18} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-extrabold text-gray-900 dark:text-gray-50">{name}</span>
                                        {attempt.student?.grade_level != null && (
                                            <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                                {t.gradeLabel(attempt.student.grade_level)}
                                            </span>
                                        )}
                                        <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                            {attempt.language === 'fil' ? t.filipinoLabel : t.englishLabel}
                                        </span>
                                    </div>
                                    {attempt.passage_title && (
                                        <div className="mt-0.5 truncate text-xs font-semibold text-gray-500 dark:text-gray-400">
                                            {attempt.passage_title}
                                            {attempt.accuracy_score != null ? ` · ${Math.round(attempt.accuracy_score)}%` : ''}
                                        </div>
                                    )}
                                    <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                                        <Clock size={11} />
                                        {formatPHTime(attempt.created_at)}
                                    </div>
                                </div>
                                <ArrowRight size={16} className="shrink-0 text-gray-400 dark:text-gray-500" />
                            </button>
                        )
                    })}
                </div>
            )}
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="mt-5" />
        </div>
    )
}
export default ReviewList