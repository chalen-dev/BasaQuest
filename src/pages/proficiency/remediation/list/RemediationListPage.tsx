// File: RemediationList.tsx
// File: src/pages/proficiency/remediation/RemediationList.tsx
//
// "Remediation" tab — every pupil who has at least one piece of
// generated remediation material (see remediation_materials, created
// via the Generate button on AttemptResults.tsx), most-recently
// generated first. Deliberately shaped like ResultsList.tsx (same
// header card, same row layout, same Pagination/Skeleton usage) rather
// than inventing a new list pattern, since this is the third list in
// this same family (Review / Results / Remediation) and consistency
// here means a teacher already knows how to use this page before ever
// opening it.
//
// Each row is a PUPIL, not a single piece of material — clicking one
// goes to StudentRemediationDetail.tsx, which shows every material
// entry ever generated for that pupil. This page itself never shows
// word-level content; it's purely "who has something, and how much."
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, Clock } from 'lucide-react'
import { useLang } from '../../../../contexts/LangContext.tsx'
import { useProfile } from '../../../../hooks/useProfile.ts'
import { Pagination } from '../../../../components/ui/Pagination.tsx'
import { Skeleton } from '../../../../components/ui/Skeleton.tsx'
import type { Lang } from '../../../../components/buttons/LangToggle.tsx'
import { REMEDIATION_PAGE_SIZE, useStudentsWithRemediationQuery } from '../hooks.ts'
const STRINGS: Record<Lang, {
    title: string
    subtitle: string
    loading: string
    emptyTitle: string
    emptyDesc: string
    resultsCount: (n: number) => string
    gradeLabel: (n: number) => string
    unnamedStudent: string
    materialsCount: (n: number) => string
    lastGenerated: string
}> = {
    fil: {
        title: 'Remediation',
        subtitle: 'Mga estudyanteng may nagawang remediation material.',
        loading: 'Kinukuha ang listahan...',
        emptyTitle: 'Wala pang nagawang remediation material.',
        emptyDesc: 'Gumawa ng remediation material mula sa resulta ng isang pagbasa para lumabas dito ang estudyante.',
        resultsCount: (n) => `${n} estudyante`,
        gradeLabel: (n) => `Baitang ${n}`,
        unnamedStudent: 'Estudyante',
        materialsCount: (n) => `${n} materyal`,
        lastGenerated: 'Huling nagawa',
    },
    en: {
        title: 'Remediation',
        subtitle: 'Pupils who have generated remediation material.',
        loading: 'Loading...',
        emptyTitle: 'No remediation material generated yet.',
        emptyDesc: "Generate material from a reading's results page to see the pupil show up here.",
        resultsCount: (n) => `${n} student${n === 1 ? '' : 's'}`,
        gradeLabel: (n) => `Grade ${n}`,
        unnamedStudent: 'Student',
        materialsCount: (n) => `${n} material${n === 1 ? '' : 's'}`,
        lastGenerated: 'Last generated',
    },
}
// Fixed to Asia/Manila regardless of the viewing device's own timezone —
// same reasoning as ReviewList.tsx/ResultsList.tsx's own copy of this
// helper.
function formatPHTime(isoString: string): string {
    return new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(isoString))
}
export const RemediationListPage: React.FC = () => {
    const { lang } = useLang()
    const { profile } = useProfile()
    const navigate = useNavigate()
    const t = STRINGS[lang]
    const [page, setPage] = useState(0)
    const { data, isPending: isLoading, error } = useStudentsWithRemediationQuery({ teacherId: profile?.id, page })
    const students = data?.students ?? []
    const total = data?.total ?? 0
    const pageCount = Math.max(1, Math.ceil(total / REMEDIATION_PAGE_SIZE))
    return (
        <>
            <section className="relative mb-6 overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
                <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fdf4ff 0%, #f3e8ff 100%)' }} />
                <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
                <div
                    className="pointer-events-none absolute inset-0 dark:hidden"
                    style={{ background: 'radial-gradient(circle at 88% -20%, rgba(168,85,247,0.35), transparent 55%)' }}
                />
                <div
                    className="pointer-events-none absolute inset-0 hidden dark:block"
                    style={{ background: 'radial-gradient(circle at 88% -20%, rgba(192,132,252,0.25), transparent 55%)' }}
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
                            </div>
                            <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
                            <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-7 text-base font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                    {error instanceof Error ? error.message : String(error)}
                </div>
            ) : students.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-12 text-center dark:border-gray-100/10 dark:bg-gray-900">
                    <p className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.emptyTitle}</p>
                    <p className="mt-1.5 text-base font-medium text-gray-500 dark:text-gray-300">{t.emptyDesc}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3.5">
                    {students.map((student) => {
                        const name = student.full_name || student.username || t.unnamedStudent
                        return (
                            <button
                                key={student.student_id}
                                onClick={() => navigate(`/students/remediation/${student.student_id}`)}
                                className="flex cursor-pointer items-center gap-5 rounded-2xl border-2 border-gray-900/5 bg-white p-6 text-left shadow-sm transition-colors duration-150 hover:border-purple-500/30 dark:border-gray-100/10 dark:bg-gray-900 dark:hover:border-purple-400/30"
                            >
                                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                                    <Sparkles size={26} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <span className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{name}</span>
                                        {student.grade_level != null && (
                                            <span className="rounded-full bg-gray-900/5 px-3.5 py-1.5 text-base font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                                {t.gradeLabel(student.grade_level)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-400 dark:text-gray-500">
                                        <Clock size={15} />
                                        {t.lastGenerated}: {formatPHTime(student.latest_created_at)}
                                    </div>
                                </div>
                                <span className="shrink-0 rounded-full bg-purple-500/15 px-5 py-2.5 text-lg font-extrabold text-purple-700 dark:text-purple-300">
                                    {t.materialsCount(student.material_count)}
                                </span>
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
export default RemediationListPage