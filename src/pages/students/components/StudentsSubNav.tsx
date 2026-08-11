// File: src/pages/students/components/StudentsSubNav.tsx
import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import type { Lang } from '../../../components/buttons/LangToggle'
import { HomeButton } from '../../../components/buttons/HomeButton'

const STRINGS: Record<Lang, { dashboard: string; list: string }> = {
    fil: { dashboard: 'Dashboard', list: 'Listahan' },
    en: { dashboard: 'Dashboard', list: 'Student List' },
}

export const StudentsSubNav: React.FC = () => {
    const { lang } = useLang()
    const t = STRINGS[lang]

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
            <NavLink to="/students" className={tabClass}>
                <Users size={15} />
                {t.list}
            </NavLink>
        </nav>
    )
}

export default StudentsSubNav