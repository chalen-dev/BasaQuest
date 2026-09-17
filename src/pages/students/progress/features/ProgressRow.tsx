// File: src/pages/students/progress/features/ProgressRow.tsx
//
// One pupil's row on the Progress dashboard. Deliberately NOT reusing
// StudentRow.tsx (list/features/) — that row's action buttons (edit,
// disable, force-logout, delete) are roster-management actions that don't
// belong here; this row is read-only and click-through-to-results only,
// closer in spirit to ResultsList.tsx's row.
import React from 'react'
import { TrendingUp, TrendingDown, Minus, Flag, Sparkles, Clock, UserRound, ChevronRight, FileText } from 'lucide-react'
import { SHOW_MOCK_COMPREHENSION_HISTORY } from '../../../../../devFlags'
import type { TeacherDashboardSummaryRow, Trend } from '../hooks'
import { computeTrend, mockTrackScore } from '../hooks'

export type ProgressRowStrings = {
    gradeLabel: (n: number) => string
    noSection: string
    comingSoon: string
    noAttemptsYet: string
    flaggedWords: (n: number) => string
    needsPractice: string
    viewReportAria: string
    exampleLabel: string
    trendUpAria: string
    trendDownAria: string
    trendFlatAria: string
}

function TrendIcon({ trend, t }: { trend: Trend; t: ProgressRowStrings }) {
    if (trend === 'up') return <TrendingUp size={14} className="text-teal-600 dark:text-teal-400" aria-label={t.trendUpAria} />
    if (trend === 'down') return <TrendingDown size={14} className="text-rose-600 dark:text-rose-400" aria-label={t.trendDownAria} />
    if (trend === 'flat') return <Minus size={14} className="text-gray-400 dark:text-gray-500" aria-label={t.trendFlatAria} />
    return null
}

function ScoreCell({ score, trend, t }: { score: number | null; trend: Trend; t: ProgressRowStrings }) {
    if (score == null) {
        return <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">—</span>
    }
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className="text-sm font-extrabold text-gray-900 dark:text-gray-50">{Math.round(score)}%</span>
            <TrendIcon trend={trend} t={t} />
        </span>
    )
}

function ComingSoonBadge({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-900/15 px-2.5 py-0.5 text-xs font-semibold text-gray-400 dark:border-gray-100/15 dark:text-gray-500">
            {label}
        </span>
    )
}

// DEMO-ONLY, behind SHOW_MOCK_COMPREHENSION_HISTORY — see devFlags.ts and
// mockTrackScore() in ../hooks.ts. Visually distinct from ScoreCell on
// purpose (amber "Example" tag under the number) so it can never be
// mistaken for a real score even in a rushed screenshot.
function MockScoreCell({ studentId, track, t }: { studentId: string; track: 'comprehension' | 'history'; t: ProgressRowStrings }) {
    const { score, trend } = mockTrackScore(studentId, track)
    return (
        <span className="inline-flex flex-col leading-tight">
            <span className="inline-flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-gray-900 dark:text-gray-50">{score}%</span>
                <TrendIcon trend={trend} t={t} />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">{t.exampleLabel}</span>
        </span>
    )
}

interface ProgressRowProps {
    row: TeacherDashboardSummaryRow
    t: ProgressRowStrings
    onSelect: () => void
    onViewReport: () => void
}

export const ProgressRow: React.FC<ProgressRowProps> = ({ row, t, onSelect, onViewReport }) => {
    const enTrend = computeTrend(row.en_latest_accuracy, row.en_prev_accuracy)
    const filTrend = computeTrend(row.fil_latest_accuracy, row.fil_prev_accuracy)
    const hasAnyAttempt = row.en_latest_attempt_id != null || row.fil_latest_attempt_id != null
    const clickable = hasAnyAttempt

    // Left accent + avatar color follows how urgently this pupil needs a
    // look: unresolved flagged words outrank a low score, which outranks
    // "nothing wrong, just doing fine" — same rose/amber/teal vocabulary
    // StudentRow.tsx and ResultsList.tsx already use for urgency elsewhere
    // on this app.
    const accent =
        row.pending_flagged_word_count > 0
            ? '#e11d48'
            : row.worst_recent_accuracy != null && row.worst_recent_accuracy < 70
                ? '#f59e0b'
                : '#14b8a6'

    return (
        <div
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? onSelect : undefined}
            onKeyDown={
                clickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') onSelect()
                    }
                    : undefined
            }
            style={{ borderLeftColor: accent, borderLeftWidth: 6 }}
            className={`flex w-full flex-col gap-3 rounded-2xl border-2 border-gray-900/5 bg-white p-4 text-left shadow-sm transition-all duration-200 dark:border-gray-100/10 dark:bg-gray-900 sm:flex-row sm:items-center sm:gap-4 ${
                clickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''
            }`}
        >
            <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold"
                style={{ background: `${accent}22`, color: accent }}
            >
                {row.full_name?.[0]?.toUpperCase() ?? row.username?.[0]?.toUpperCase() ?? <UserRound size={18} />}
            </span>

            <div className="min-w-0 sm:w-48 sm:shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-extrabold text-gray-900 dark:text-gray-50">
                        {row.full_name || row.username}
                    </span>
                    {row.grade_level != null && (
                        <span className="shrink-0 rounded-full bg-gray-900/5 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                            {t.gradeLabel(row.grade_level)}
                        </span>
                    )}
                </div>
                <div className="mt-0.5 truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                    {row.section || t.noSection}
                </div>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <ScoreCell score={row.en_latest_accuracy} trend={enTrend} t={t} />
                <ScoreCell score={row.fil_latest_accuracy} trend={filTrend} t={t} />
                {SHOW_MOCK_COMPREHENSION_HISTORY ? (
                    <MockScoreCell studentId={row.student_id} track="comprehension" t={t} />
                ) : (
                    <ComingSoonBadge label={t.comingSoon} />
                )}
                {SHOW_MOCK_COMPREHENSION_HISTORY ? (
                    <MockScoreCell studentId={row.student_id} track="history" t={t} />
                ) : (
                    <ComingSoonBadge label={t.comingSoon} />
                )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:w-40 sm:justify-end">
                {!hasAnyAttempt && (
                    <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-100/10 dark:text-gray-400">
                        {t.noAttemptsYet}
                    </span>
                )}
                {row.pending_flagged_word_count > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        <Flag size={12} />
                        {t.flaggedWords(row.pending_flagged_word_count)}
                    </span>
                )}
                {row.has_stale_remediation && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <Sparkles size={12} />
                        {t.needsPractice}
                    </span>
                )}
            </div>

            <button
                type="button"
                aria-label={t.viewReportAria}
                onClick={(e) => {
                    e.stopPropagation()
                    onViewReport()
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-teal-500/10 hover:text-teal-600 dark:text-gray-400 dark:hover:bg-teal-400/15 dark:hover:text-teal-400"
            >
                <FileText size={16} />
            </button>

            {clickable ? (
                <ChevronRight size={18} className="hidden shrink-0 text-gray-400 dark:text-gray-500 sm:block" />
            ) : (
                <Clock size={18} className="hidden shrink-0 text-gray-300 dark:text-gray-600 sm:block" />
            )}
        </div>
    )
}

export default ProgressRow
