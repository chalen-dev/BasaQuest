// File: src/pages/proficiency/components/FluentReadingSubNav.tsx
// The teacher's sub-nav inside Fluent Reading: the check-in page plus Review,
// Results and Remediation for fluent-reading work only. (The Students tab keeps
// its own Review, Results and Remediation, which will list every activity type
// once comprehension exists.) The list pages are shared with Students; only the
// URL prefix differs, so each pill's active state follows the section the
// teacher is in.
import React from 'react'
import { NavLink } from 'react-router-dom'
import { ClipboardCheck, ListChecks, Sparkles, BookOpen } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useProfile } from '../../../hooks/useProfile'
import type { Lang } from '../../../components/buttons/LangToggle'
import { HomeButton } from '../../../components/buttons/HomeButton'
import { usePendingReviewCountQuery } from '../review/hooks'
import { subNavTabClass } from '../../_components/subNavTabClass'

const STRINGS: Record<Lang, { checkIn: string; review: string; results: string; remediation: string }> = {
    fil: { checkIn: 'Check-In', review: 'Suriin', results: 'Resulta', remediation: 'Remediation' },
    en: { checkIn: 'Check-In', review: 'Review', results: 'Results', remediation: 'Remediation' },
}

export const FLUENT_READING_TEACHER_BASE = '/reading/proficiency/teacher'

export const FluentReadingSubNav: React.FC = () => {
    const { lang } = useLang()
    const { profile } = useProfile()
    const t = STRINGS[lang]
    const { data: pendingCount } = usePendingReviewCountQuery(profile?.id)
    return (
        <nav className="mb-7 flex flex-wrap items-center gap-2.5">
            <HomeButton size="md" />
            <span className="h-6 w-px bg-gray-900/10 dark:bg-gray-100/10" aria-hidden="true" />
            <NavLink to="/reading/proficiency" end className={subNavTabClass}>
                <BookOpen size={18} />
                {t.checkIn}
            </NavLink>
            <div className="relative">
                <NavLink to={`${FLUENT_READING_TEACHER_BASE}/review`} className={subNavTabClass}>
                    <ClipboardCheck size={18} />
                    {t.review}
                </NavLink>
                {!!pendingCount && pendingCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white">
                        {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                )}
            </div>
            <NavLink to={`${FLUENT_READING_TEACHER_BASE}/results`} className={subNavTabClass}>
                <ListChecks size={18} />
                {t.results}
            </NavLink>
            <NavLink to={`${FLUENT_READING_TEACHER_BASE}/remediation`} className={subNavTabClass}>
                <Sparkles size={18} />
                {t.remediation}
            </NavLink>
        </nav>
    )
}

export default FluentReadingSubNav
