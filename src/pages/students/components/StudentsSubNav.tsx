// File: StudentsSubNav.tsx
// File: StudentsSubNav.tsx
// File: src/pages/students/components/StudentsSubNav.tsx
//
// REMEDIATION TAB (this pass): a 5th pill, after Results — the new
// per-pupil remediation material list (RemediationList.tsx). No badge
// here (unlike Review's pending-count badge) since "has remediation
// material" isn't a queue that needs clearing, just a browsable list.
import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, Users, ClipboardCheck, ListChecks, Sparkles } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useProfile } from '../../../hooks/useProfile'
import type { Lang } from '../../../components/buttons/LangToggle'
import { HomeButton } from '../../../components/buttons/HomeButton'
import { usePendingReviewCountQuery } from '../../proficiency/review/hooks'
import { subNavTabClass } from '../../_components/subNavTabClass'
const STRINGS: Record<Lang, { dashboard: string; progress: string; list: string; review: string; results: string; remediation: string }> = {
    fil: { dashboard: 'Dashboard', progress: 'Progreso', list: 'Listahan', review: 'Suriin', results: 'Resulta', remediation: 'Remediation' },
    en: { dashboard: 'Dashboard', progress: 'Progress', list: 'Student List', review: 'Review', results: 'Results', remediation: 'Remediation' },
}
export const StudentsSubNav: React.FC = () => {
    const { lang } = useLang()
    const { profile } = useProfile()
    const t = STRINGS[lang]
    const { data: pendingCount } = usePendingReviewCountQuery(profile?.id)
    const tabClass = subNavTabClass
    return (
        <nav className="mb-7 flex flex-wrap items-center gap-2.5">
            {/* Reusing the shared HomeButton here instead of a lookalike —
                it used to sit on its own line above this row (extra
                vertical space); folding it in as the first pill removes
                that gap while keeping a single source of truth for the
                "back to home" styling. */}
            <HomeButton size="md" />
            <span className="h-6 w-px bg-gray-900/10 dark:bg-gray-100/10" aria-hidden="true" />
            <NavLink to="/dashboard" end className={tabClass}>
                <LayoutDashboard size={18} />
                {t.dashboard}
            </NavLink>
            {/* Progress — per-pupil consolidated view across tracks (see
                progress/ProgressDashboard.tsx), distinct from Dashboard's
                teacher-wide totals + activity feed above. */}
            <NavLink to="/students/progress" className={tabClass}>
                <TrendingUp size={18} />
                {t.progress}
            </NavLink>
            <NavLink to="/students" end className={tabClass}>
                <Users size={18} />
                {t.list}
            </NavLink>
            {/* Badge mirrors ProtectedHeader's "Students" pill badge —
                same usePendingReviewCountQuery hook, so the two never
                drift out of sync. Shown here specifically (rather than
                on Dashboard/List too) since this tab is the actual
                destination for those pending attempts. */}
            <div className="relative">
                <NavLink to="/students/review" className={tabClass}>
                    <ClipboardCheck size={18} />
                    {t.review}
                </NavLink>
                {!!pendingCount && pendingCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white">
                        {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                )}
            </div>
            {/* Results — the counterpart to Review: everything a teacher
                has ALREADY confirmed, browsable after the fact. No badge
                here (nothing is "pending" about a finished result). */}
            <NavLink to="/students/results" className={tabClass}>
                <ListChecks size={18} />
                {t.results}
            </NavLink>
            {/* Remediation — pupils with generated remediation material
                (see remediation/hooks.ts). Uses the "/students/remediation"
                prefix so both the list and the per-pupil detail page
                (/students/remediation/:studentId) keep this pill active. */}
            <NavLink to="/students/remediation" className={tabClass}>
                <Sparkles size={18} />
                {t.remediation}
            </NavLink>
        </nav>
    )
}
export default StudentsSubNav