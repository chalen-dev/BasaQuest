// File: src/pages/students/components/StudentsSubNav.tsx
import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import type { Lang } from '../../../components/buttons/LangToggle'

const STRINGS: Record<Lang, { dashboard: string; list: string }> = {
    fil: { dashboard: 'Dashboard', list: 'Listahan' },
    en: { dashboard: 'Dashboard', list: 'Student List' },
}

export const StudentsSubNav: React.FC = () => {
    const { lang } = useLang()
    const t = STRINGS[lang]

    const tabClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-colors duration-300 ${
            isActive
                ? 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900'
                : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
        }`

    return (
        <nav className="mb-6 flex flex-wrap gap-2">
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