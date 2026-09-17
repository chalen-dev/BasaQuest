// File: PupilProgressReport.tsx
// File: src/pages/students/reports/PupilProgressReport.tsx
//
// Report 1 — one pupil's full picture over a period, printable/
// shareable with a parent. Backed by public.get_pupil_progress_report
// (see supabase/migrations/20260909040000_create_progress_reports.sql).
//
// Comprehension and History Module show "Coming soon" placeholders —
// same rule as everywhere else in this app that's honest about what's
// built vs. planned (see teacher_dashboard_summary's own comments):
// no comprehension- or history_sessions-specific tables exist yet, so
// this never fabricates a number for either.
import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Printer, ArrowLeft, TrendingUp, TrendingDown, Minus, Save } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { showToast } from '../../../helpers/swalHelpers'
import { Skeleton } from '../../../components/ui/Skeleton'
import { TextArea } from '../../../components/input/TextArea'
import type { Lang } from '../../../components/buttons/LangToggle'
import { StudentsSubNav } from '../components/StudentsSubNav'
import { PeriodPicker } from './features/PeriodPicker'
import { ErrorBreakdownBars } from './features/ErrorBreakdownBars'
import {
    useGetPupilProgressReportQuery,
    useUpsertPupilNoteMutation,
    periodFromPreset,
    dominantErrorType,
    NEXT_FOCUS_SUGGESTIONS,
    type PeriodPreset,
    type LanguageReport,
} from './hooks'

const STRINGS: Record<Lang, {
    backToProgress: string
    title: string
    print: string
    loading: string
    errorGeneric: string
    grade: (n: number) => string
    noSection: string
    periodCovered: (start: string, end: string) => string
    teacherLabel: string
    periodLabel: string
    last30: string
    last60: string
    last90: string
    custom: string
    startLabel: string
    endLabel: string
    sectionEnglish: string
    sectionFilipino: string
    attempts: (n: number) => string
    noAttemptsInPeriod: string
    firstAttempt: string
    latestAttempt: string
    improvement: string
    noImprovementYet: string
    avgFluency: string
    avgProsody: string
    avgCompleteness: string
    notAvailable: string
    errorBreakdownTitle: string
    omission: string
    insertion: string
    mispronunciation: string
    noErrors: string
    topMissedWordsTitle: string
    noMissedWords: string
    remediationTitle: string
    remediationGenerated: (n: number) => string
    remediationPracticed: (n: number) => string
    remediationNone: string
    comprehensionTitle: string
    historyTitle: string
    comingSoon: string
    notesTitle: string
    notesPlaceholder: string
    saveNotes: string
    savingNotes: string
    notesSaved: string
    notesError: string
    nextFocusTitle: string
    nextFocusNone: string
}> = {
    fil: {
        backToProgress: 'Bumalik sa Progreso',
        title: 'Ulat ng Progreso ng Estudyante',
        print: 'I-print',
        loading: 'Kinukuha ang ulat...',
        errorGeneric: 'May nangyaring mali. Subukan ulit.',
        grade: (n) => `Baitang ${n}`,
        noSection: 'Walang section',
        periodCovered: (start, end) => `Sakop: ${start} – ${end}`,
        teacherLabel: 'Guro',
        periodLabel: 'Panahon',
        last30: 'Huling 30 araw',
        last60: 'Huling 60 araw',
        last90: 'Huling 90 araw',
        custom: 'Piliin ang saklaw',
        startLabel: 'Mula',
        endLabel: 'Hanggang',
        sectionEnglish: 'English',
        sectionFilipino: 'Filipino',
        attempts: (n) => `${n} pagsusulit sa panahong ito`,
        noAttemptsInPeriod: 'Walang pagsusulit sa panahong ito.',
        firstAttempt: 'Unang pagsusulit',
        latestAttempt: 'Pinakabago',
        improvement: 'Pagbabago',
        noImprovementYet: 'Isa pang pagsusulit ang kailangan para makita ang takbo.',
        avgFluency: 'Katatasan',
        avgProsody: 'Prosody',
        avgCompleteness: 'Pagkumpleto',
        notAvailable: '—',
        errorBreakdownTitle: 'Uri ng mga Mali',
        omission: 'Nilaktawan',
        insertion: 'Idinagdag',
        mispronunciation: 'Mali sa bigkas',
        noErrors: 'Walang naitalang mali sa panahong ito.',
        topMissedWordsTitle: 'Pinaka-Madalas na Nagkamalian',
        noMissedWords: 'Walang salitang nagkamalian sa panahong ito.',
        remediationTitle: 'Remediation',
        remediationGenerated: (n) => `${n} materyales na ginawa`,
        remediationPracticed: (n) => `${n} nagawang practice`,
        remediationNone: 'Walang remediation material sa panahong ito.',
        comprehensionTitle: 'Comprehension',
        historyTitle: 'History Module',
        comingSoon: 'Malapit na',
        notesTitle: "Tala ng Guro",
        notesPlaceholder: 'Magdagdag ng obserbasyon tungkol sa estudyanteng ito...',
        saveNotes: 'I-save ang Tala',
        savingNotes: 'Sine-save...',
        notesSaved: 'Na-save ang tala.',
        notesError: 'Hindi na-save ang tala. Subukan ulit.',
        nextFocusTitle: 'Mungkahing Susunod na Pokus',
        nextFocusNone: 'Hindi pa sapat ang datos para magmungkahi ng pokus.',
    },
    en: {
        backToProgress: 'Back to Progress',
        title: 'Individual Pupil Progress Report',
        print: 'Print',
        loading: 'Loading report...',
        errorGeneric: 'Something went wrong. Please try again.',
        grade: (n) => `Grade ${n}`,
        noSection: 'No section',
        periodCovered: (start, end) => `Covering: ${start} – ${end}`,
        teacherLabel: 'Teacher',
        periodLabel: 'Period',
        last30: 'Last 30 days',
        last60: 'Last 60 days',
        last90: 'Last 90 days',
        custom: 'Custom range',
        startLabel: 'From',
        endLabel: 'To',
        sectionEnglish: 'English',
        sectionFilipino: 'Filipino',
        attempts: (n) => `${n} attempt${n === 1 ? '' : 's'} in this period`,
        noAttemptsInPeriod: 'No attempts in this period.',
        firstAttempt: 'First attempt',
        latestAttempt: 'Most recent',
        improvement: 'Improvement',
        noImprovementYet: 'Needs one more attempt to show a trend.',
        avgFluency: 'Fluency',
        avgProsody: 'Prosody',
        avgCompleteness: 'Completeness',
        notAvailable: '—',
        errorBreakdownTitle: 'Error Type Breakdown',
        omission: 'Omissions',
        insertion: 'Insertions',
        mispronunciation: 'Mispronunciations',
        noErrors: 'No errors recorded in this period.',
        topMissedWordsTitle: 'Most Frequently Missed Words',
        noMissedWords: 'No missed words in this period.',
        remediationTitle: 'Remediation Engagement',
        remediationGenerated: (n) => `${n} material${n === 1 ? '' : 's'} generated`,
        remediationPracticed: (n) => `${n} practiced`,
        remediationNone: 'No remediation material generated in this period.',
        comprehensionTitle: 'Comprehension',
        historyTitle: 'History Module',
        comingSoon: 'Coming soon',
        notesTitle: "Teacher's Notes",
        notesPlaceholder: "Add qualitative context a number can't capture...",
        saveNotes: 'Save Notes',
        savingNotes: 'Saving...',
        notesSaved: 'Notes saved.',
        notesError: "Couldn't save notes. Please try again.",
        nextFocusTitle: 'Suggested Next Focus',
        nextFocusNone: 'Not enough data yet to suggest a focus.',
    },
}

function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' }).format(new Date(iso))
}

function TrendIcon({ delta }: { delta: number | null }) {
    if (delta == null) return null
    if (delta > 0) return <TrendingUp size={16} className="text-teal-600" />
    if (delta < 0) return <TrendingDown size={16} className="text-rose-600" />
    return <Minus size={16} className="text-gray-400" />
}

function LanguageSection({
    label,
    data,
    t,
}: {
    label: string
    data: LanguageReport
    t: (typeof STRINGS)[Lang]
}) {
    return (
        <section className="mb-6 rounded-2xl border-2 border-gray-900/5 bg-white p-5 dark:border-gray-100/10 dark:bg-gray-900 print:border-gray-300 print:bg-white print:p-4">
            <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">{label}</h3>
            <p className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 print:text-gray-600">
                {t.attempts(data.attempt_count)}
            </p>

            {data.attempt_count === 0 ? (
                <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 print:text-gray-600">{t.noAttemptsInPeriod}</p>
            ) : (
                <>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <div>
                            <div className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400 print:text-gray-600">{t.firstAttempt}</div>
                            <div className="text-lg font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">
                                {data.first_accuracy != null ? `${Math.round(data.first_accuracy)}%` : t.notAvailable}
                            </div>
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400 print:text-gray-600">{t.latestAttempt}</div>
                            <div className="text-lg font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">
                                {data.latest_accuracy != null ? `${Math.round(data.latest_accuracy)}%` : t.notAvailable}
                            </div>
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400 print:text-gray-600">{t.improvement}</div>
                            {data.improvement_delta != null ? (
                                <div className="flex items-center gap-1 text-lg font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">
                                    {data.improvement_delta > 0 ? '+' : ''}
                                    {Math.round(data.improvement_delta)}%
                                    <TrendIcon delta={data.improvement_delta} />
                                </div>
                            ) : (
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 print:text-gray-600">{t.noImprovementYet}</div>
                            )}
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400 print:text-gray-600">{t.avgFluency}</div>
                            <div className="text-lg font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">
                                {data.avg_fluency != null ? Math.round(data.avg_fluency) : t.notAvailable}
                            </div>
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400 print:text-gray-600">{t.avgCompleteness}</div>
                            <div className="text-lg font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">
                                {data.avg_completeness != null ? Math.round(data.avg_completeness) : t.notAvailable}
                            </div>
                        </div>
                    </div>

                    <div className="mt-5">
                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 print:text-gray-700">
                            {t.errorBreakdownTitle}
                        </h4>
                        <ErrorBreakdownBars breakdown={data.error_breakdown} total={data.total_errors} t={t} />
                    </div>

                    <div className="mt-5">
                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 print:text-gray-700">
                            {t.topMissedWordsTitle}
                        </h4>
                        {data.top_missed_words.length === 0 ? (
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 print:text-gray-600">{t.noMissedWords}</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {data.top_missed_words.map((w) => (
                                    <span
                                        key={w.word}
                                        className="rounded-full bg-gray-900/5 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-100/10 dark:text-gray-200 print:border print:border-gray-300 print:bg-white print:text-gray-800"
                                    >
                                        {w.word} × {w.miss_count}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    )
}

function ComingSoonSection({ label, t }: { label: string; t: (typeof STRINGS)[Lang] }) {
    return (
        <section className="mb-6 rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-5 dark:border-gray-100/15 dark:bg-gray-900 print:border-gray-300 print:bg-white">
            <h3 className="text-base font-extrabold text-gray-400 dark:text-gray-500 print:text-gray-500">{label}</h3>
            <p className="mt-1 text-sm font-semibold text-gray-400 dark:text-gray-500 print:text-gray-500">{t.comingSoon}</p>
        </section>
    )
}

export const PupilProgressReport: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>()
    const navigate = useNavigate()
    const { lang } = useLang()
    const { theme } = useTheme()
    const t = STRINGS[lang]

    const [preset, setPreset] = useState<PeriodPreset>('30')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')
    // Memoized on the picker's own inputs only — periodFromPreset()
    // calls `new Date()` internally, so calling it unmemoized on every
    // render would mint a new `end` timestamp each time, changing
    // useGetPupilProgressReportQuery's queryKey every render and
    // refetching in an infinite loop.
    const { start, end } = useMemo(() => periodFromPreset(preset, customStart, customEnd), [preset, customStart, customEnd])

    const { data: report, isLoading, error } = useGetPupilProgressReportQuery(studentId, start, end)
    const [noteDraft, setNoteDraft] = useState<string | null>(null)
    const noteValue = noteDraft ?? report?.notes ?? ''
    const saveNoteMutation = useUpsertPupilNoteMutation(studentId)

    const handleSaveNotes = async () => {
        try {
            await saveNoteMutation.mutateAsync(noteValue)
            showToast(t.notesSaved, 'success', theme === 'dark')
        } catch (err) {
            showToast(err instanceof Error ? err.message : t.notesError, 'error', theme === 'dark')
        }
    }

    const focusType = report ? dominantErrorType(report.by_language) : null
    const focusSentence = focusType ? NEXT_FOCUS_SUGGESTIONS[lang][focusType] : null

    return (
        <div className="mx-auto max-w-4xl px-4 pb-12 pt-2">
            <div className="no-print">
                <StudentsSubNav />
            </div>

            <div className="no-print mb-4 flex items-center justify-between">
                <button
                    onClick={() => navigate('/students/progress')}
                    className="flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10"
                >
                    <ArrowLeft size={15} />
                    {t.backToProgress}
                </button>
                <button
                    onClick={() => window.print()}
                    disabled={!report}
                    className="flex items-center gap-1.5 rounded-full bg-teal-500 px-4 py-1.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 active:translate-y-1 active:shadow-[0_1px_0_0_#0f766e] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                >
                    <Printer size={15} />
                    {t.print}
                </button>
            </div>

            <div className="no-print mb-4">
                <PeriodPicker
                    t={t}
                    preset={preset}
                    onPresetChange={setPreset}
                    customStart={customStart}
                    customEnd={customEnd}
                    onCustomStartChange={setCustomStart}
                    onCustomEndChange={setCustomEnd}
                />
            </div>

            {isLoading ? (
                <div className="flex flex-col gap-3" role="status" aria-busy="true">
                    <span className="sr-only">{t.loading}</span>
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-48 w-full rounded-2xl" />
                    <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
            ) : error ? (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                    {error instanceof Error ? error.message : t.errorGeneric}
                </div>
            ) : report ? (
                <div className="print-area">
                    <section className="mb-6 rounded-2xl border-2 border-gray-900/5 bg-white p-5 dark:border-gray-100/10 dark:bg-gray-900 print:border-gray-300 print:bg-white">
                        <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">{t.title}</h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100 print:text-gray-800">
                            <span>{report.student.full_name || report.student.username}</span>
                            {report.student.grade_level != null && (
                                <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300 print:border print:border-gray-300 print:bg-white">
                                    {t.grade(report.student.grade_level)}
                                </span>
                            )}
                            <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300 print:border print:border-gray-300 print:bg-white">
                                {report.student.section || t.noSection}
                            </span>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400 print:text-gray-600">
                            {t.teacherLabel}: {report.teacher_name || t.notAvailable}
                        </p>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 print:text-gray-600">
                            {t.periodCovered(formatDate(report.period_start), formatDate(report.period_end))}
                        </p>
                    </section>

                    <LanguageSection label={t.sectionEnglish} data={report.by_language.en} t={t} />
                    <LanguageSection label={t.sectionFilipino} data={report.by_language.fil} t={t} />

                    <section className="mb-6 rounded-2xl border-2 border-gray-900/5 bg-white p-5 dark:border-gray-100/10 dark:bg-gray-900 print:border-gray-300 print:bg-white">
                        <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">{t.remediationTitle}</h3>
                        {report.remediation.generated_count === 0 ? (
                            <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400 print:text-gray-600">{t.remediationNone}</p>
                        ) : (
                            <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200 print:text-gray-800">
                                {t.remediationGenerated(report.remediation.generated_count)} · {t.remediationPracticed(report.remediation.practiced_count)}
                            </p>
                        )}
                    </section>

                    <ComingSoonSection label={t.comprehensionTitle} t={t} />
                    <ComingSoonSection label={t.historyTitle} t={t} />

                    <section className="mb-6 rounded-2xl border-2 border-teal-500/20 bg-teal-500/5 p-5 dark:border-teal-400/20 dark:bg-teal-400/5 print:border-gray-300 print:bg-white">
                        <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">{t.nextFocusTitle}</h3>
                        <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200 print:text-gray-800">
                            {focusSentence || t.nextFocusNone}
                        </p>
                    </section>

                    <section className="mb-6 rounded-2xl border-2 border-gray-900/5 bg-white p-5 dark:border-gray-100/10 dark:bg-gray-900 print:border-gray-300 print:bg-white">
                        <h3 className="mb-2 text-base font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">{t.notesTitle}</h3>
                        <div className="no-print">
                            <TextArea
                                name="teacher-notes"
                                label=""
                                value={noteValue}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                placeholder={t.notesPlaceholder}
                                rows={4}
                            />
                            <button
                                onClick={handleSaveNotes}
                                disabled={saveNoteMutation.isPending}
                                className="mt-2 flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-1.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900"
                            >
                                <Save size={14} />
                                {saveNoteMutation.isPending ? t.savingNotes : t.saveNotes}
                            </button>
                        </div>
                        <p className="hidden whitespace-pre-wrap text-sm font-medium text-gray-700 print:block print:text-gray-800">
                            {noteValue || t.notesPlaceholder}
                        </p>
                    </section>
                </div>
            ) : null}
        </div>
    )
}

export default PupilProgressReport
