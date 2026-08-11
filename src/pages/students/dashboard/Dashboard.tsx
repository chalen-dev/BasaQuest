// File: src/pages/students/dashboard/Dashboard.tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Clock, Percent, Gauge, Mic, BookOpen } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import type { Lang } from '../../../components/buttons/LangToggle'
import { StudentsSubNav } from '../components/StudentsSubNav'

type StatColor = 'teal' | 'orange' | 'sky' | 'slate'

const STAT_COLOR_CLASSES: Record<StatColor, { bg: string; icon: string }> = {
    teal: { bg: 'bg-teal-500/15', icon: 'text-teal-600 dark:text-teal-400' },
    orange: { bg: 'bg-orange-500/15', icon: 'text-orange-600 dark:text-orange-400' },
    sky: { bg: 'bg-sky-500/15', icon: 'text-sky-600 dark:text-sky-400' },
    slate: { bg: 'bg-slate-500/15', icon: 'text-slate-600 dark:text-slate-300' },
}

const DUMMY_ACTIVITY = [
    { name: 'Maria Elena', grade: 3, track: 'proficiency' as const, percent: 91, time: '4 min ago', timeFil: '4 minuto ang nakalipas', pending: true },
    { name: 'Jose Miguel', grade: 4, track: 'comprehension' as const, percent: 78, time: '1 hour ago', timeFil: '1 oras ang nakalipas', pending: true },
    { name: 'Ella Santos', grade: 3, track: 'proficiency' as const, percent: 85, time: '5 hours ago', timeFil: '5 oras ang nakalipas', pending: false },
    { name: 'Carlo Reyes', grade: 5, track: 'proficiency' as const, percent: 88, time: '1 day ago', timeFil: '1 araw ang nakalipas', pending: false },
]

const STRINGS: Record<Lang, {
    back: string
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
    dummyNote: string
    trackLabel: (track: 'proficiency' | 'comprehension') => string
    gradeLabel: (n: number) => string
}> = {
    fil: {
        back: '← Tahanan',
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
        dummyNote: 'Dummy data pa lang — magiging live kapag naka-connect na sa totoong records.',
        trackLabel: (track) => (track === 'proficiency' ? 'Bigkas' : 'Pag-unawa'),
        gradeLabel: (n) => `Baitang ${n}`,
    },
    en: {
        back: '← Home',
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
        dummyNote: "Dummy data for now — this'll go live once it's connected to real records.",
        trackLabel: (track) => (track === 'proficiency' ? 'Reading' : 'Comprehension'),
        gradeLabel: (n) => `Grade ${n}`,
    },
}

export const Dashboard: React.FC = () => {
    const navigate = useNavigate()
    const { lang } = useLang()
    const t = STRINGS[lang]

    const stats: { label: string; value: string; icon: typeof Users; color: StatColor }[] = [
        { label: t.statTotal, value: '18', icon: Users, color: 'teal' },
        { label: t.statPending, value: '9', icon: Clock, color: 'orange' },
        { label: t.statAccuracy, value: '87%', icon: Percent, color: 'sky' },
        { label: t.statWpm, value: '62', icon: Gauge, color: 'slate' },
    ]

    return (
        <div className="mx-auto max-w-4xl px-4 pb-12 pt-2">
            <button
                onClick={() => navigate('/home')}
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-dashed border-gray-900/20 px-4 py-1.5 text-sm font-bold text-gray-600 transition-colors duration-300 hover:bg-gray-900/5 dark:border-gray-100/20 dark:text-gray-300 dark:hover:bg-gray-100/10"
            >
                {t.back}
            </button>

            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h1>
            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{t.subtitle}</p>

            <div className="mt-4">
                <StudentsSubNav />
            </div>

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

            <div className="flex flex-col gap-3">
                {DUMMY_ACTIVITY.map((item, i) => {
                    const accent = item.track === 'proficiency' ? '#ff7a59' : '#5b8def'
                    const Icon = item.track === 'proficiency' ? Mic : BookOpen
                    return (
                        <div
                            key={i}
                            style={{ borderLeftColor: accent, borderLeftWidth: 6 }}
                            className="flex items-center gap-4 rounded-2xl border-2 border-gray-900/5 bg-white p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-900"
                        >
                            <span
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                                style={{ background: `${accent}22`, color: accent }}
                            >
                                <Icon size={18} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-extrabold text-gray-900 dark:text-gray-50">{item.name}</span>
                                    <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                        {t.gradeLabel(item.grade)}
                                    </span>
                                    {item.pending ? (
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
                                    {t.trackLabel(item.track)} · {item.percent}%
                                </div>
                            </div>
                            <span className="shrink-0 text-xs font-bold text-gray-400 dark:text-gray-500">
                                {lang === 'fil' ? item.timeFil : item.time}
                            </span>
                        </div>
                    )
                })}
            </div>

            <p className="mt-6 rounded-full border border-dashed border-gray-900/15 px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                {t.dummyNote}
            </p>
        </div>
    )
}

export default Dashboard