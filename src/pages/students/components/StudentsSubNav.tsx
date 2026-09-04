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
import { LayoutDashboard, Users, ClipboardCheck, ListChecks, Sparkles } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useProfile } from '../../../hooks/useProfile'
import type { Lang } from '../../../components/buttons/LangToggle'
import { HomeButton } from '../../../components/buttons/HomeButton'
import { usePendingReviewCountQuery } from '../review/hooks'
const STRINGS: Record<Lang, { dashboard: string; list: string; review: string; results: string; remediation: string }> = {
    fil: { dashboard: 'Dashboard', list: 'Listahan', review: 'Suriin', results: 'Resulta', remediation: 'Remediation' },
    en: { dashboard: 'Dashboard', list: 'Student List', review: 'Review', results: 'Results', remediation: 'Remediation' },
}
export const StudentsSubNav: React.FC = () => {
    const { lang } = useLang()
    const { profile } = useProfile()
    const t = STRINGS[lang]
    const { data: pendingCount } = usePendingReviewCountQuery(profile?.id)
    // Inactive pills used to be border-only with a near-invisible hover
    // tint, so the animated backdrop showed straight through them. Gave
    // the inactive state a solid white/gray-900 background (matching the
    // active pill's already-solid look) so it stays legible over the
    // cloud layer at all times, not just on hover.
    const tabClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold shadow-sm transition-colors duration-300 ${
            isActive
                ? 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900'
                : 'border border-gray-900/10 bg-white text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10'
        }`
    return (
        <nav className="mb-6 flex flex-wrap items-center gap-2">
            {/* Reusing the shared HomeButton here instead of a lookalike —
                it used to sit on its own line above this row (extra
                vertical space); folding it in as the first pill removes
                that gap while keeping a single source of truth for the
                "back to home" styling. */}
            <HomeButton />
            <span className="h-5 w-px bg-gray-900/10 dark:bg-gray-100/10" aria-hidden="true" />
            <NavLink to="/dashboard" end className={tabClass}>
                <LayoutDashboard size={15} />
                {t.dashboard}
            </NavLink>
            <NavLink to="/students" end className={tabClass}>
                <Users size={15} />
                {t.list}
            </NavLink>
            {/* Badge mirrors ProtectedHeader's "Students" pill badge —
                same usePendingReviewCountQuery hook, so the two never
                drift out of sync. Shown here specifically (rather than
                on Dashboard/List too) since this tab is the actual
                destination for those pending attempts. */}
            <div className="relative">
                <NavLink to="/students/review" className={tabClass}>
                    <ClipboardCheck size={15} />
                    {t.review}
                </NavLink>
                {!!pendingCount && pendingCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                )}
            </div>
            {/* Results — the counterpart to Review: everything a teacher
                has ALREADY confirmed, browsable after the fact. No badge
                here (nothing is "pending" about a finished result). */}
            <NavLink to="/students/results" className={tabClass}>
                <ListChecks size={15} />
                {t.results}
            </NavLink>
            {/* Remediation — pupils with generated remediation material
                (see remediation/hooks.ts). Uses the "/students/remediation"
                prefix so both the list and the per-pupil detail page
                (/students/remediation/:studentId) keep this pill active. */}
            <NavLink to="/students/remediation" className={tabClass}>
                <Sparkles size={15} />
                {t.remediation}
            </NavLink>
        </nav>
    )
}
export default StudentsSubNav