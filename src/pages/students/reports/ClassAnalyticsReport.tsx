// File: ClassAnalyticsReport.tsx
// File: src/pages/students/reports/ClassAnalyticsReport.tsx
//
// Report 2 — the teacher's whole roster at once: roster health, score
// distribution, class-wide error patterns, EN vs FIL comparison,
// remediation completion, and a static needs-attention snapshot.
// Backed by public.get_class_analytics_report (see
// supabase/migrations/20260909040000_create_progress_reports.sql).
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer, ArrowLeft, Flag, Sparkles, Users, Activity, MoonStar, Wand2 } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useProfile } from '../../../hooks/useProfile'
import { Skeleton } from '../../../components/ui/Skeleton'
import type { Lang } from '../../../components/buttons/LangToggle'
import { PeriodPicker } from './features/PeriodPicker'
import { ErrorBreakdownBars } from './features/ErrorBreakdownBars'
import {
    useGetClassAnalyticsReportQuery,
    periodFromPreset,
    SCORE_BANDS,
    type PeriodPreset,
    type ScoreBand,
} from './hooks'

const STRINGS: Record<Lang, {
    backToProgress: string
    title: string
    print: string
    loading: string
    errorGeneric: string
    periodCovered: (start: string, end: string) => string
    teacherLabel: string
    periodLabel: string
    last30: string
    last60: string
    last90: string
    custom: string
    startLabel: string
    endLabel: string
    rosterTitle: string
    totalPupils: string
    activePupils: string
    quietPupils: (days: number) => string
    distributionTitle: string
    english: string
    filipino: string
    noScoresYet: string
    avgAccuracy: string
    errorBreakdownTitle: string
    omission: string
    insertion: string
    mispronunciation: string
    noErrors: string
    remediationTitle: string
    remediationRate: (pct: number) => string
    remediationNone: string
    needsAttentionTitle: string
    needsAttentionSubtitle: string
    gradeLabel: (n: number) => string
    noSection: string
    flaggedWords: (n: number) => string
    needsPractice: string
    noAttemptsYet: string
    remediationRateTile: string
    colPupil: string
    colEnglish: string
    colFilipino: string
    colFlags: string
    noOneNeedsAttention: string
}> = {
    fil: {
        backToProgress: 'Bumalik sa Progreso',
        title: 'Ulat ng Analytics ng Klase',
        print: 'I-print',
        loading: 'Kinukuha ang ulat...',
        errorGeneric: 'May nangyaring mali. Subukan ulit.',
        periodCovered: (start, end) => `Sakop: ${start} – ${end}`,
        teacherLabel: 'Guro',
        periodLabel: 'Panahon',
        last30: 'Huling 30 araw',
        last60: 'Huling 60 araw',
        last90: 'Huling 90 araw',
        custom: 'Piliin ang saklaw',
        startLabel: 'Mula',
        endLabel: 'Hanggang',
        rosterTitle: 'Kalagayan ng Klase',
        totalPupils: 'Kabuuang estudyante',
        activePupils: 'May kamakailang aktibidad',
        quietPupils: (days) => `Walang aktibidad (${days}+ araw)`,
        distributionTitle: 'Pamamahagi ng Iskor',
        english: 'English',
        filipino: 'Filipino',
        noScoresYet: 'Walang iskor sa panahong ito.',
        avgAccuracy: 'Karaniwang katumpakan',
        errorBreakdownTitle: 'Karaniwang Uri ng Mali sa Buong Klase',
        omission: 'Nilaktawan',
        insertion: 'Idinagdag',
        mispronunciation: 'Mali sa bigkas',
        noErrors: 'Walang naitalang mali sa panahong ito.',
        remediationTitle: 'Remediation sa Buong Klase',
        remediationRate: (pct) => `${pct}% nagawang practice`,
        remediationNone: 'Walang remediation material na ginawa sa panahong ito.',
        needsAttentionTitle: 'Kailangan ng Pansin',
        needsAttentionSubtitle: 'Snapshot ng live na Progress dashboard sa oras ng ulat na ito.',
        gradeLabel: (n) => `Baitang ${n}`,
        noSection: 'Walang section',
        flaggedWords: (n) => `${n} naka-flag`,
        needsPractice: 'Kailangan ng practice',
        noAttemptsYet: 'Wala pang pagsusulit',
        remediationRateTile: 'Nagawang practice',
        colPupil: 'Estudyante',
        colEnglish: 'English',
        colFilipino: 'Filipino',
        colFlags: 'Naka-flag',
        noOneNeedsAttention: 'Walang estudyanteng kailangan ng agarang pansin.',
    },
    en: {
        backToProgress: 'Back to Progress',
        title: 'Class Analytics Report',
        print: 'Print',
        loading: 'Loading report...',
        errorGeneric: 'Something went wrong. Please try again.',
        periodCovered: (start, end) => `Covering: ${start} – ${end}`,
        teacherLabel: 'Teacher',
        periodLabel: 'Period',
        last30: 'Last 30 days',
        last60: 'Last 60 days',
        last90: 'Last 90 days',
        custom: 'Custom range',
        startLabel: 'From',
        endLabel: 'To',
        rosterTitle: 'Roster Health',
        totalPupils: 'Total pupils',
        activePupils: 'Recently active',
        quietPupils: (days) => `Gone quiet (${days}+ days)`,
        distributionTitle: 'Score Distribution',
        english: 'English',
        filipino: 'Filipino',
        noScoresYet: 'No scores in this period.',
        avgAccuracy: 'Average accuracy',
        errorBreakdownTitle: 'Class-wide Error Pattern',
        omission: 'Omissions',
        insertion: 'Insertions',
        mispronunciation: 'Mispronunciations',
        noErrors: 'No errors recorded in this period.',
        remediationTitle: 'Class-wide Remediation',
        remediationRate: (pct) => `${pct}% practiced`,
        remediationNone: 'No remediation material generated in this period.',
        needsAttentionTitle: 'Needs Attention',
        needsAttentionSubtitle: "Snapshot of the live Progress dashboard at the time this report was pulled.",
        gradeLabel: (n) => `Grade ${n}`,
        noSection: 'No section',
        flaggedWords: (n) => `${n} flagged`,
        needsPractice: 'Needs practice',
        noAttemptsYet: 'No attempts yet',
        remediationRateTile: 'Remediation practiced',
        colPupil: 'Pupil',
        colEnglish: 'English',
        colFilipino: 'Filipino',
        colFlags: 'Flags',
        noOneNeedsAttention: 'No pupils need urgent attention right now.',
    },
}

function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' }).format(new Date(iso))
}

type TileColor = 'slate' | 'teal' | 'rose' | 'amber'
const TILE_COLOR_CLASSES: Record<TileColor, { bg: string; icon: string }> = {
    slate: { bg: 'bg-slate-500/15', icon: 'text-slate-600 dark:text-slate-300' },
    teal: { bg: 'bg-teal-500/15', icon: 'text-teal-600 dark:text-teal-400' },
    rose: { bg: 'bg-rose-500/15', icon: 'text-rose-600 dark:text-rose-400' },
    amber: { bg: 'bg-amber-500/15', icon: 'text-amber-600 dark:text-amber-400' },
}

// KPI tile — same shape as Dashboard.tsx's own stat cards (icon chip,
// big number, uppercase label), reused here so the two "at a glance"
// screens in this app read as one visual language instead of two.
function StatTile({ icon: Icon, value, label, color }: { icon: typeof Users; value: string; label: string; color: TileColor }) {
    const colors = TILE_COLOR_CLASSES[color]
    return (
        <div className="rounded-2xl border-2 border-gray-900/5 bg-white p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 print:border-gray-300 print:bg-white">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg} ${colors.icon} print:bg-transparent`}>
                <Icon size={18} />
            </span>
            <div className="mt-3 text-2xl font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">{value}</div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 print:text-gray-600">{label}</div>
        </div>
    )
}

const BAND_MAX: Record<ScoreBand, number> = { '0-59': 0, '60-69': 0, '70-79': 0, '80-89': 0, '90-100': 0 }

// Grouped bar chart, English vs Filipino side by side per score band.
// Colors (teal #14b8a6 light / #0d9488 dark for English, indigo #6366f1
// for Filipino) were run through the dataviz skill's validate_palette.js
// — both the CVD-separation and normal-vision-floor checks failed for
// the app's own teal+sky pairing (too visually similar even for full
// color vision), so this uses teal+indigo instead, which passes clean
// in both themes. The contrast-vs-surface check still WARNs (teal is
// light), which is why every bar gets a direct value label rather than
// relying on the fill color alone to convey magnitude — the skill's
// "relief required" rule for that WARN.
function ScoreDistributionChart({
    en,
    fil,
    avgEn,
    avgFil,
    t,
}: {
    en: Partial<Record<ScoreBand, number>>
    fil: Partial<Record<ScoreBand, number>>
    avgEn: number | null
    avgFil: number | null
    t: (typeof STRINGS)[Lang]
}) {
    const enCounts = { ...BAND_MAX, ...en }
    const filCounts = { ...BAND_MAX, ...fil }
    const total = SCORE_BANDS.reduce((s, b) => s + (enCounts[b] ?? 0) + (filCounts[b] ?? 0), 0)

    if (total === 0) {
        return <p className="text-sm font-medium text-gray-500 dark:text-gray-400 print:text-gray-600">{t.noScoresYet}</p>
    }

    const max = Math.max(1, ...SCORE_BANDS.map((b) => Math.max(enCounts[b] ?? 0, filCounts[b] ?? 0)))
    const W = 640
    const H = 220
    const padTop = 22
    const padBottom = 34
    const padSide = 6
    const chartH = H - padTop - padBottom
    const groupW = (W - padSide * 2) / SCORE_BANDS.length
    const barW = groupW * 0.3
    const gap = groupW * 0.08
    const baseY = H - padBottom
    const scaleH = (v: number) => (v / (max * 1.15)) * chartH

    return (
        <div>
            {/* Legend — required whenever a chart has 2+ series (see
                dataviz skill's final accessibility pass) so identity
                never rests on color alone. */}
            <div className="mb-1 flex flex-wrap items-center gap-4 text-xs font-bold text-gray-700 dark:text-gray-200 print:text-gray-800">
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-500 dark:bg-teal-600 print:bg-gray-700" />
                    {t.english}
                    {avgEn != null && <span className="font-semibold text-gray-500 dark:text-gray-400 print:text-gray-600"> · {t.avgAccuracy} {avgEn}%</span>}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 print:bg-gray-400" />
                    {t.filipino}
                    {avgFil != null && <span className="font-semibold text-gray-500 dark:text-gray-400 print:text-gray-600"> · {t.avgAccuracy} {avgFil}%</span>}
                </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${t.distributionTitle}: ${t.english} vs ${t.filipino}`}>
                <line x1={padSide} y1={baseY} x2={W - padSide} y2={baseY} className="stroke-gray-900/10 dark:stroke-gray-100/15 print:stroke-gray-300" strokeWidth={1} />
                {SCORE_BANDS.map((band, i) => {
                    const groupX = padSide + i * groupW
                    const enV = enCounts[band] ?? 0
                    const filV = filCounts[band] ?? 0
                    const enH = scaleH(enV)
                    const filH = scaleH(filV)
                    const enX = groupX + groupW / 2 - barW - gap / 2
                    const filX = groupX + groupW / 2 + gap / 2
                    return (
                        <g key={band}>
                            <title>{`${band}%: ${t.english} ${enV}, ${t.filipino} ${filV}`}</title>
                            <rect x={enX} y={baseY - enH} width={barW} height={enH} rx={3} className="fill-teal-500 dark:fill-teal-600 print:fill-gray-700" />
                            <rect x={filX} y={baseY - filH} width={barW} height={filH} rx={3} className="fill-indigo-500 print:fill-gray-400" />
                            {enV > 0 && (
                                <text x={enX + barW / 2} y={baseY - enH - 6} textAnchor="middle" className="fill-gray-700 dark:fill-gray-200 print:fill-gray-800" style={{ fontSize: 11, fontWeight: 700 }}>
                                    {enV}
                                </text>
                            )}
                            {filV > 0 && (
                                <text x={filX + barW / 2} y={baseY - filH - 6} textAnchor="middle" className="fill-gray-700 dark:fill-gray-200 print:fill-gray-800" style={{ fontSize: 11, fontWeight: 700 }}>
                                    {filV}
                                </text>
                            )}
                            <text x={groupX + groupW / 2} y={baseY + 18} textAnchor="middle" className="fill-gray-500 dark:fill-gray-400 print:fill-gray-600" style={{ fontSize: 10, fontWeight: 600 }}>
                                {band}
                            </text>
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}

export const ClassAnalyticsReport: React.FC = () => {
    const navigate = useNavigate()
    const { lang } = useLang()
    const { profile } = useProfile()
    const t = STRINGS[lang]

    const [preset, setPreset] = useState<PeriodPreset>('30')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')
    // Memoized — see PupilProgressReport.tsx's identical comment:
    // periodFromPreset() calls `new Date()` internally, so an unmemoized
    // call here would change the query key (and refetch) on every render.
    const { start, end } = useMemo(() => periodFromPreset(preset, customStart, customEnd), [preset, customStart, customEnd])

    const { data: report, isLoading, error } = useGetClassAnalyticsReportQuery(profile?.id, start, end)
    const remediationRate = report && report.remediation.generated_count > 0
        ? Math.round((report.remediation.practiced_count / report.remediation.generated_count) * 100)
        : null

    return (
        <div className="w-full px-6 pb-12 pt-4 sm:px-8">
            {/* Just a back button here, not the full StudentsSubNav — this
                is a focused report screen someone lands on to read/print,
                not a place to jump to Review/Results/Remediation from. */}
            <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
                <button
                    onClick={() => navigate('/students/progress')}
                    className="flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10"
                >
                    <ArrowLeft size={15} />
                    {t.backToProgress}
                </button>
                {/* Period picker lives next to Print, not on its own row —
                    both are "controls for this report", while Back is a
                    navigation action, hence the two groupings on opposite
                    ends of the same row. */}
                <div className="flex flex-wrap items-end gap-3">
                    <PeriodPicker
                        t={t}
                        preset={preset}
                        onPresetChange={setPreset}
                        customStart={customStart}
                        customEnd={customEnd}
                        onCustomStartChange={setCustomStart}
                        onCustomEndChange={setCustomEnd}
                    />
                    <button
                        onClick={() => window.print()}
                        disabled={!report}
                        className="flex items-center gap-1.5 rounded-full bg-teal-500 px-4 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 active:translate-y-1 active:shadow-[0_1px_0_0_#0f766e] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                    >
                        <Printer size={15} />
                        {t.print}
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col gap-3" role="status" aria-busy="true">
                    <span className="sr-only">{t.loading}</span>
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-40 w-full rounded-2xl" />
                    <Skeleton className="h-40 w-full rounded-2xl" />
                </div>
            ) : error ? (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                    {error instanceof Error ? error.message : t.errorGeneric}
                </div>
            ) : report ? (
                <div className="print-area">
                    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                            <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">{t.title}</h1>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 print:text-gray-600">
                                {t.teacherLabel}: {report.teacher_name || '—'} &nbsp;·&nbsp; {t.periodCovered(formatDate(report.period_start), formatDate(report.period_end))}
                            </p>
                        </div>
                    </div>

                    {/* KPI row — same stat-tile language as Dashboard.tsx,
                        so the roster-health numbers read at a glance
                        instead of being buried in a paragraph. */}
                    <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatTile icon={Users} value={String(report.roster.total_pupils)} label={t.totalPupils} color="slate" />
                        <StatTile icon={Activity} value={String(report.roster.active_pupils)} label={t.activePupils} color="teal" />
                        <StatTile icon={MoonStar} value={String(report.roster.quiet_pupils)} label={t.quietPupils(report.roster.quiet_threshold_days)} color="rose" />
                        <StatTile
                            icon={Wand2}
                            value={remediationRate != null ? `${remediationRate}%` : '—'}
                            label={t.remediationRateTile}
                            color="amber"
                        />
                    </div>

                    {/* Two analysis cards side by side now that the page
                        isn't width-capped — score distribution (wider,
                        it already holds two histograms) next to the
                        class-wide error pattern (narrower, vertical
                        bars only). */}
                    <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
                        <section className="rounded-2xl border-2 border-gray-900/5 bg-white p-5 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 print:border-gray-300 print:bg-white xl:col-span-7">
                            <h3 className="mb-3 text-base font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">{t.distributionTitle}</h3>
                            <ScoreDistributionChart
                                en={report.score_distribution.en ?? {}}
                                fil={report.score_distribution.fil ?? {}}
                                avgEn={report.language_average_accuracy.en ?? null}
                                avgFil={report.language_average_accuracy.fil ?? null}
                                t={t}
                            />
                        </section>

                        <section className="rounded-2xl border-2 border-gray-900/5 bg-white p-5 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 print:border-gray-300 print:bg-white xl:col-span-5">
                            <h3 className="mb-3 text-base font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">{t.errorBreakdownTitle}</h3>
                            <ErrorBreakdownBars breakdown={report.error_breakdown} total={report.total_errors} t={t} />
                            <div className="mt-5 border-t border-gray-900/5 pt-4 dark:border-gray-100/10 print:border-gray-300">
                                <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 print:text-gray-600">{t.remediationTitle}</h4>
                                {report.remediation.generated_count === 0 ? (
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 print:text-gray-600">{t.remediationNone}</p>
                                ) : (
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 print:text-gray-800">
                                        {report.remediation.generated_count} generated · {remediationRate != null ? t.remediationRate(remediationRate) : ''}
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Needs Attention — a real table now that there's
                        room for actual columns, instead of the cramped
                        inline-badge row this used to be. Wrapped in its
                        own overflow-x-auto so a very narrow viewport
                        scrolls the table, never the page. */}
                    <section className="rounded-2xl border-2 border-gray-900/5 bg-white p-5 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 print:border-gray-300 print:bg-white">
                        <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-50 print:text-gray-900">{t.needsAttentionTitle}</h3>
                        <p className="mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 print:text-gray-600">{t.needsAttentionSubtitle}</p>
                        {report.needs_attention.length === 0 ? (
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 print:text-gray-600">{t.noOneNeedsAttention}</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-900/10 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:border-gray-100/10 dark:text-gray-400 print:text-gray-600">
                                            <th className="py-2 pr-3 font-bold">{t.colPupil}</th>
                                            <th className="py-2 pr-3 font-bold">{t.colEnglish}</th>
                                            <th className="py-2 pr-3 font-bold">{t.colFilipino}</th>
                                            <th className="py-2 pr-3 font-bold">{t.colFlags}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.needs_attention.map((row) => (
                                            <tr key={row.student_id} className="border-b border-gray-900/5 last:border-0 dark:border-gray-100/5 print:border-gray-200">
                                                <td className="py-2.5 pr-3">
                                                    <span className="font-bold text-gray-900 dark:text-gray-50 print:text-gray-900">
                                                        {row.full_name || row.username}
                                                    </span>
                                                    {row.grade_level != null && (
                                                        <span className="ml-2 text-xs font-semibold text-gray-500 dark:text-gray-400 print:text-gray-600">
                                                            {t.gradeLabel(row.grade_level)} · {row.section || t.noSection}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 pr-3 font-semibold text-gray-700 dark:text-gray-200 print:text-gray-800">
                                                    {row.en_latest_accuracy != null ? `${Math.round(row.en_latest_accuracy)}%` : '—'}
                                                </td>
                                                <td className="py-2.5 pr-3 font-semibold text-gray-700 dark:text-gray-200 print:text-gray-800">
                                                    {row.fil_latest_accuracy != null ? `${Math.round(row.fil_latest_accuracy)}%` : '—'}
                                                </td>
                                                <td className="py-2.5 pr-3">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {row.pending_flagged_word_count > 0 && (
                                                            <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400 print:border print:border-gray-300 print:bg-white print:text-gray-800">
                                                                <Flag size={11} />
                                                                {t.flaggedWords(row.pending_flagged_word_count)}
                                                            </span>
                                                        )}
                                                        {row.has_stale_remediation && (
                                                            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 print:border print:border-gray-300 print:bg-white print:text-gray-800">
                                                                <Sparkles size={11} />
                                                                {t.needsPractice}
                                                            </span>
                                                        )}
                                                        {row.en_latest_accuracy == null && row.fil_latest_accuracy == null && (
                                                            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 print:text-gray-500">{t.noAttemptsYet}</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            ) : null}
        </div>
    )
}

export default ClassAnalyticsReport
