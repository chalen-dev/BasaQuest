// File: ProgressDashboard.tsx
// File: src/pages/students/progress/ProgressDashboard.tsx
//
// "Progress" tab — a single screen consolidating every pupil's progress
// across tracks, so a teacher can see who's improving and who needs
// attention without opening each pupil's attempt history one at a time.
// Backed by public.teacher_dashboard_summary (see
// supabase/migrations/20260909020000_create_teacher_dashboard_summary.sql),
// which pre-aggregates the per-pupil numbers server-side rather than this
// page fetching every attempt and reducing client-side.
//
// Reading Comprehension and History Module show a "Coming soon" badge —
// see ProgressRow.tsx's ComingSoonBadge — because no comprehension- or
// history_sessions-specific tables exist yet. Never fabricate a number for
// those two tracks BY DEFAULT.
//
// devFlags.ts's SHOW_MOCK_COMPREHENSION_HISTORY is the one sanctioned
// exception: flip it on to fill those two columns with clearly-labeled
// (amber "Example" tag, see ProgressRow.tsx's MockScoreCell) fabricated
// numbers for a presentation screenshot, then flip it back off. It
// defaults false, so a real teacher session never shows it unasked.
//
// DEFAULT SORT IS "NEEDS ATTENTION", NOT ALPHABETICAL: opens tiered by
// (unresolved flagged words, then longest since last attempt, then lowest
// current score) — see hooks.ts's useTeacherDashboardSummaryQuery for why
// that's three plain ORDER BY columns rather than one blended score. A
// teacher can switch to Name/Grade/Section from the sort control below.
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListFilter, FileBarChart } from 'lucide-react'
import { SHOW_MOCK_COMPREHENSION_HISTORY } from '../../../../devFlags'
import { useLang } from '../../../contexts/LangContext'
import { useProfile } from '../../../hooks/useProfile'
import { Select } from '../../../components/input/Select'
import { Skeleton } from '../../../components/ui/Skeleton'
import type { Lang } from '../../../components/buttons/LangToggle'
import { StudentsSubNav } from '../components/StudentsSubNav'
import { ProgressRow } from './features/ProgressRow'
import { useTeacherDashboardSummaryQuery, type ProgressSort } from './hooks'

const STRINGS: Record<Lang, {
    title: string
    subtitle: string
    loading: string
    emptyTitle: string
    emptyDesc: string
    resultsCount: (n: number) => string
    sortLabel: string
    sortAttention: string
    sortNameAsc: string
    sortGradeAsc: string
    sortSectionAsc: string
    colEnglish: string
    colFilipino: string
    colComprehension: string
    colHistory: string
    colAccuracySubLabel: string
    colExampleSubLabel: string
    gradeLabel: (n: number) => string
    noSection: string
    comingSoon: string
    noAttemptsYet: string
    flaggedWords: (n: number) => string
    needsPractice: string
    viewReportAria: string
    exampleLabel: string
    classReport: string
    trendUpAria: string
    trendDownAria: string
    trendFlatAria: string
    errorGeneric: string
}> = {
    fil: {
        title: 'Progreso ng mga Estudyante',
        subtitle: 'Lahat ng estudyanteng nakatalaga sa iyo, sa isang tingin — kung sino ang umaangat at kung sino ang kailangan ng tulong.',
        loading: 'Kinukuha ang progreso...',
        emptyTitle: 'Wala ka pang estudyante.',
        emptyDesc: 'Lalabas dito ang progreso ng bawat estudyanteng nakatalaga sa iyo.',
        resultsCount: (n) => `${n} estudyante`,
        sortLabel: 'Ayusin ayon sa',
        sortAttention: 'Kailangan ng pansin (default)',
        sortNameAsc: 'Pangalan (A–Z)',
        sortGradeAsc: 'Baitang',
        sortSectionAsc: 'Section',
        colEnglish: 'English',
        colFilipino: 'Filipino',
        colComprehension: 'Comprehension',
        colHistory: 'History',
        colAccuracySubLabel: 'Katumpakan',
        colExampleSubLabel: 'Halimbawa',
        gradeLabel: (n) => `Baitang ${n}`,
        noSection: 'Walang section',
        comingSoon: 'Malapit na',
        noAttemptsYet: 'Wala pang pagsusulit',
        flaggedWords: (n) => `${n} salitang naka-flag`,
        needsPractice: 'Kailangan ng practice',
        viewReportAria: 'Tingnan ang ulat ng progreso',
        exampleLabel: 'Halimbawa',
        classReport: 'Ulat ng Klase',
        trendUpAria: 'Umaangat',
        trendDownAria: 'Bumababa',
        trendFlatAria: 'Walang pagbabago',
        errorGeneric: 'May nangyaring mali. Subukan ulit.',
    },
    en: {
        title: 'Student Progress',
        subtitle: "Every pupil assigned to you, at a glance — who's improving and who needs attention.",
        loading: 'Loading progress...',
        emptyTitle: "You don't have any students yet.",
        emptyDesc: "Once you have pupils assigned, their progress will show up here.",
        resultsCount: (n) => `${n} student${n === 1 ? '' : 's'}`,
        sortLabel: 'Sort by',
        sortAttention: 'Needs attention (default)',
        sortNameAsc: 'Name (A–Z)',
        sortGradeAsc: 'Grade',
        sortSectionAsc: 'Section',
        colEnglish: 'English',
        colFilipino: 'Filipino',
        colComprehension: 'Comprehension',
        colHistory: 'History',
        colAccuracySubLabel: 'Accuracy',
        colExampleSubLabel: 'Example',
        gradeLabel: (n) => `Grade ${n}`,
        noSection: 'No section',
        comingSoon: 'Coming soon',
        noAttemptsYet: 'No attempts yet',
        flaggedWords: (n) => `${n} flagged word${n === 1 ? '' : 's'}`,
        needsPractice: 'Needs practice',
        viewReportAria: 'View progress report',
        exampleLabel: 'Example',
        classReport: 'Class Report',
        trendUpAria: 'Improving',
        trendDownAria: 'Declining',
        trendFlatAria: 'No change',
        errorGeneric: 'Something went wrong. Please try again.',
    },
}

const SORT_OPTIONS = (t: (typeof STRINGS)[Lang]) => [
    { value: 'attention', label: t.sortAttention },
    { value: 'name_asc', label: t.sortNameAsc },
    { value: 'grade_asc', label: t.sortGradeAsc },
    { value: 'section_asc', label: t.sortSectionAsc },
]

export const ProgressDashboard: React.FC = () => {
    const { lang } = useLang()
    const { profile } = useProfile()
    const navigate = useNavigate()
    const t = STRINGS[lang]
    const [sort, setSort] = useState<ProgressSort>('attention')
    const { data: rows, isLoading, error } = useTeacherDashboardSummaryQuery(profile?.id, sort)

    const goToPupil = (row: (typeof rows extends (infer R)[] | undefined ? R : never)) => {
        // Whichever language's latest scored attempt is more recent is
        // the one this pupil's row links to — last_attempt_at is exactly
        // that MAX(en_latest_attempt_at, fil_latest_attempt_at), computed
        // server-side (see the view's own comments on GREATEST/LEAST).
        const attemptId =
            row.en_latest_attempt_at != null && row.en_latest_attempt_at === row.last_attempt_at
                ? row.en_latest_attempt_id
                : row.fil_latest_attempt_id
        if (attemptId) navigate(`/students/review/${attemptId}/results`)
    }

    return (
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">
            <StudentsSubNav />
            <section className="relative mb-6 overflow-hidden rounded-3xl border border-gray-900/5 p-5 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-6">
                <div
                    className="absolute inset-0 dark:hidden"
                    style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }}
                />
                <div
                    className="absolute inset-0 hidden dark:block"
                    style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }}
                />
                <div
                    className="pointer-events-none absolute inset-0 dark:hidden"
                    style={{ background: 'radial-gradient(circle at 88% -20%, rgba(255,198,75,0.4), transparent 55%)' }}
                />
                <div
                    className="pointer-events-none absolute inset-0 hidden dark:block"
                    style={{ background: 'radial-gradient(circle at 88% -20%, rgba(45,212,191,0.28), transparent 55%)' }}
                />
                <div className="relative">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h1>
                            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">{t.subtitle}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => navigate('/students/progress/class-report')}
                                className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10"
                            >
                                <FileBarChart size={15} />
                                {t.classReport}
                            </button>
                            <div className="flex items-center gap-2 sm:w-56">
                                <ListFilter size={16} className="shrink-0 text-gray-500 dark:text-gray-400" />
                                <Select
                                    name="progress-sort"
                                    label={undefined}
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value as ProgressSort)}
                                    options={SORT_OPTIONS(t)}
                                    selectClassName="px-3 py-2 text-sm"
                                    className="flex-1"
                                />
                            </div>
                        </div>
                    </div>
                    {!isLoading && !error && rows && rows.length > 0 && (
                        <p className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400">{t.resultsCount(rows.length)}</p>
                    )}
                </div>
            </section>

            {/* Column headers for the track scores below — mirrors
                ProgressRow.tsx's own horizontal layout EXACTLY (same
                avatar/name/track-grid/flags/button/chevron widths and
                gaps) so each label sits directly above its column
                instead of floating disconnected inside the hero card
                above (where it used to live, right-aligned next to the
                student count — confusing, since it had nothing to do
                with that count). Hidden on mobile since rows themselves
                stack vertically there and these labels wouldn't line up
                with anything. */}
            {!isLoading && !error && rows && rows.length > 0 && (
                <div className="mb-3 hidden items-center gap-4 rounded-2xl border-2 border-gray-900/5 bg-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-500 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-400 sm:flex">
                    <span className="w-11 shrink-0" />
                    <span className="w-48 shrink-0" />
                    <span className="grid flex-1 grid-cols-4 gap-4">
                        {/* Sub-label clarifies WHICH number this column
                            shows — just "English"/"Filipino" alone left
                            teachers guessing whether it was accuracy,
                            fluency, or an overall grade. It's specifically
                            the pupil's latest assessment_attempts.accuracy_score,
                            nothing else, per language. */}
                        <span>
                            {t.colEnglish}
                            <span className="block text-[9px] font-semibold normal-case tracking-normal text-gray-400 dark:text-gray-500">
                                {t.colAccuracySubLabel}
                            </span>
                        </span>
                        <span>
                            {t.colFilipino}
                            <span className="block text-[9px] font-semibold normal-case tracking-normal text-gray-400 dark:text-gray-500">
                                {t.colAccuracySubLabel}
                            </span>
                        </span>
                        {/* Amber tint + "Example" sub-label ONLY when
                            SHOW_MOCK_COMPREHENSION_HISTORY is on — same
                            visual language as MockScoreCell in
                            ProgressRow.tsx, so a screenshot with the flag
                            on can never look like these are real numbers.
                            With the flag off (the real default), these
                            stay plain gray labels above the "Coming soon"
                            badges. */}
                        <span className={SHOW_MOCK_COMPREHENSION_HISTORY ? 'text-amber-600 dark:text-amber-400' : undefined}>
                            {t.colComprehension}
                            {SHOW_MOCK_COMPREHENSION_HISTORY && (
                                <span className="block text-[9px] font-semibold normal-case tracking-normal text-amber-500 dark:text-amber-400">
                                    {t.colExampleSubLabel}
                                </span>
                            )}
                        </span>
                        <span className={SHOW_MOCK_COMPREHENSION_HISTORY ? 'text-amber-600 dark:text-amber-400' : undefined}>
                            {t.colHistory}
                            {SHOW_MOCK_COMPREHENSION_HISTORY && (
                                <span className="block text-[9px] font-semibold normal-case tracking-normal text-amber-500 dark:text-amber-400">
                                    {t.colExampleSubLabel}
                                </span>
                            )}
                        </span>
                    </span>
                    <span className="w-40 shrink-0" />
                    <span className="w-9 shrink-0" />
                    <span className="w-[18px] shrink-0" />
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col gap-3" role="status" aria-busy="true">
                    <span className="sr-only">{t.loading}</span>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex w-full items-center gap-4 rounded-2xl border-2 border-gray-900/5 bg-white p-4 dark:border-gray-100/10 dark:bg-gray-900"
                        >
                            <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
                            <div className="w-48 shrink-0">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="mt-2 h-3 w-20" />
                            </div>
                            <div className="grid flex-1 grid-cols-4 gap-4">
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-4 w-16 rounded-full" />
                                <Skeleton className="h-4 w-16 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                    {error instanceof Error ? error.message : t.errorGeneric}
                </div>
            ) : !rows || rows.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-10 text-center dark:border-gray-100/10 dark:bg-gray-900">
                    <p className="text-base font-extrabold text-gray-900 dark:text-gray-50">{t.emptyTitle}</p>
                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-300">{t.emptyDesc}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {rows.map((row) => (
                        <ProgressRow
                            key={row.student_id}
                            row={row}
                            t={t}
                            onSelect={() => goToPupil(row)}
                            onViewReport={() => navigate(`/students/progress/${row.student_id}/report`)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default ProgressDashboard
