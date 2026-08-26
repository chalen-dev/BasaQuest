// File: Dashboard.tsx
// File: Dashboard.tsx
// File: src/pages/students/dashboard/Dashboard.tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Clock, Percent, Gauge, Mic, ArrowRight } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useProfile } from '../../../hooks/useProfile'
import type { Lang } from '../../../components/buttons/LangToggle'
import { StudentsSubNav } from '../components/StudentsSubNav'
import { usePendingReviewCountQuery } from '../review/hooks'
import { useDashboardStatsQuery, useRecentAttemptsQuery } from './hooks'
type StatColor = 'teal' | 'orange' | 'sky' | 'slate'
const STAT_COLOR_CLASSES: Record<StatColor, { bg: string; icon: string }> = {
    teal: { bg: 'bg-teal-500/15', icon: 'text-teal-600 dark:text-teal-400' },
    orange: { bg: 'bg-orange-500/15', icon: 'text-orange-600 dark:text-orange-400' },
    sky: { bg: 'bg-sky-500/15', icon: 'text-sky-600 dark:text-sky-400' },
    slate: { bg: 'bg-slate-500/15', icon: 'text-slate-600 dark:text-slate-300' },
}
const STRINGS: Record<Lang, {
    title: string
    subtitle: string
    statTotal: string
    statPending: string
    statAccuracy: string
    statWpm: string
    activityTitle: string
    activitySubtitle: string
    pendingChip: string
    doneChip: string
    emptyActivity: string
    unnamedStudent: string
    justNow: string
    minAgo: (n: number) => string
    hourAgo: (n: number) => string
    dayAgo: (n: number) => string
    gradeLabel: (n: number) => string
}> = {
    fil: {
        title: 'Dashboard ng mga Estudyante',
        subtitle: 'Bantayan ang progreso ng iyong mga mag-aaral.',
        statTotal: 'Kabuuang Estudyante',
        statPending: 'Naghihintay ng Review',
        statAccuracy: 'Karaniwang Katumpakan',
        statWpm: 'Karaniwang WPM',
        activityTitle: 'Kamakailang Aktibidad',
        activitySubtitle: 'Pinakahuling isinumite ng iyong mga estudyante.',
        pendingChip: '● Naghihintay',
        doneChip: '✓ Tapos na',
        emptyActivity: 'Wala pang aktibidad. Lalabas dito ang mga bagong isinumiteng pagbasa.',
        unnamedStudent: 'Estudyante',
        justNow: 'ngayon lang',
        minAgo: (n) => `${n} minuto ang nakalipas`,
        hourAgo: (n) => `${n} oras ang nakalipas`,
        dayAgo: (n) => `${n} araw ang nakalipas`,
        gradeLabel: (n) => `Baitang ${n}`,
    },
    en: {
        title: 'Student Dashboard',
        subtitle: "Track your students' progress.",
        statTotal: 'Total Students',
        statPending: 'Pending Review',
        statAccuracy: 'Average Accuracy',
        statWpm: 'Average WPM',
        activityTitle: 'Recent Activity',
        activitySubtitle: "Your students' latest submissions.",
        pendingChip: '● Pending',
        doneChip: '✓ Done',
        emptyActivity: "No activity yet. Newly submitted readings will show up here.",
        unnamedStudent: 'Student',
        justNow: 'just now',
        minAgo: (n) => `${n} min ago`,
        hourAgo: (n) => `${n} hour${n === 1 ? '' : 's'} ago`,
        dayAgo: (n) => `${n} day${n === 1 ? '' : 's'} ago`,
        gradeLabel: (n) => `Grade ${n}`,
    },
}
function formatRelativeTime(iso: string, t: (typeof STRINGS)[Lang]): string {
    const diffMs = Date.now() - new Date(iso).getTime()
    const diffMin = Math.max(0, Math.round(diffMs / 60000))
    if (diffMin < 1) return t.justNow
    if (diffMin < 60) return t.minAgo(diffMin)
    const diffHr = Math.round(diffMin / 60)
    if (diffHr < 24) return t.hourAgo(diffHr)
    const diffDay = Math.round(diffHr / 24)
    return t.dayAgo(diffDay)
}
export const Dashboard: React.FC = () => {
    const { lang } = useLang()
    const { profile } = useProfile()
    const navigate = useNavigate()
    const t = STRINGS[lang]
    const { data: dashboardStats } = useDashboardStatsQuery(profile?.id)
    const { data: pendingCount } = usePendingReviewCountQuery(profile?.id)
    const { data: recentAttempts } = useRecentAttemptsQuery(profile?.id)
    const stats: { label: string; value: string; icon: typeof Users; color: StatColor }[] = [
        { label: t.statTotal, value: dashboardStats ? String(dashboardStats.totalStudents) : '—', icon: Users, color: 'teal' },
        { label: t.statPending, value: pendingCount != null ? String(pendingCount) : '—', icon: Clock, color: 'orange' },
        { label: t.statAccuracy, value: dashboardStats?.avgAccuracy != null ? `${Math.round(dashboardStats.avgAccuracy)}%` : '—', icon: Percent, color: 'sky' },
        { label: t.statWpm, value: dashboardStats?.avgWpm != null ? String(Math.round(dashboardStats.avgWpm)) : '—', icon: Gauge, color: 'slate' },
    ]
    return (
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">
            <div className="mb-4">
                <StudentsSubNav />
            </div>
            {/* Hero card — same gradient treatment as Home/MaterialSelection,
                so the title/subtitle sit on a proper panel instead of
                floating bare over the night-sky backdrop. */}
            <section className="relative mb-8 overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
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
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h1>
                    <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{t.subtitle}</p>
                </div>
            </section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    const colors = STAT_COLOR_CLASSES[stat.color]
                    return (
                        <div
                            key={stat.label}
                            className="rounded-2xl border-2 border-gray-900/5 bg-white p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-900"
                        >
                            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg} ${colors.icon}`}>
                                <Icon size={18} />
                            </span>
                            <div className="mt-3 text-2xl font-extrabold text-gray-900 dark:text-gray-50">{stat.value}</div>
                            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{stat.label}</div>
                        </div>
                    )
                })}
            </div>
            <h2 className="mb-1 mt-8 text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.activityTitle}</h2>
            <p className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">{t.activitySubtitle}</p>
            {!recentAttempts || recentAttempts.length === 0 ? (
                <p className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-6 text-center text-sm font-semibold text-gray-500 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-400">
                    {t.emptyActivity}
                </p>
            ) : (
                <div className="flex flex-col gap-3">
                    {recentAttempts.map((attempt) => {
                        const name = attempt.student?.full_name || attempt.student?.username || t.unnamedStudent
                        const pending = attempt.reviewed_at == null
                        const accent = '#ff7a59'
                        return (
                            <button
                                key={attempt.id}
                                onClick={() => navigate(`/students/review/${attempt.id}`)}
                                style={{ borderLeftColor: accent, borderLeftWidth: 6 }}
                                className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 border-gray-900/5 bg-white p-4 text-left shadow-sm transition-colors duration-150 hover:border-teal-500/30 dark:border-gray-100/10 dark:bg-gray-900 dark:hover:border-teal-400/30"
                            >
                                <span
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                                    style={{ background: `${accent}22`, color: accent }}
                                >
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
                                        {pending ? (
                                            <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                                {t.pendingChip}
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
                                                {t.doneChip}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        {attempt.accuracy_score != null ? `${Math.round(attempt.accuracy_score)}%` : '—'}
                                    </div>
                                </div>
                                <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500">
                                    {attempt.scored_at ? formatRelativeTime(attempt.scored_at, t) : ''}
                                    <ArrowRight size={16} className="text-gray-400 dark:text-gray-500" />
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
export default Dashboard