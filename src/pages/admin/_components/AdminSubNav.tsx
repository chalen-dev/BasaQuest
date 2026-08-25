// File: src/pages/admin/components/AdminSubNav.tsx
import React from 'react'
import { NavLink } from 'react-router-dom'
import { Mic, Users, ScrollText } from 'lucide-react'
import { HomeButton } from '../../../components/buttons/HomeButton'
export const AdminSubNav: React.FC = () => {
    const tabClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold shadow-sm transition-colors duration-300 ${
            isActive
                ? 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900'
                : 'border border-gray-900/10 bg-white text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10'
        }`
    return (
        <nav className="mb-6 flex flex-wrap items-center gap-2">
            <HomeButton />
            <span className="h-5 w-px bg-gray-900/10 dark:bg-gray-100/10" aria-hidden="true" />
            {/* `end` is required here — without it, NavLink's default
            prefix matching means "/admin/recording" is considered active
            on ANY nested route (/admin/recording/scripts,
            /admin/recording/session, /admin/recording/history), so this
            tab was lighting up alongside whichever other tab was actually
            current. Sentence Scripts/Students don't need `end` since
            nothing is nested under their own paths. */}
            <NavLink to="/admin/recording" end className={tabClass}>
                <Mic size={15} />
                Select Student
            </NavLink>
            <NavLink to="/admin/recording/scripts" className={tabClass}>
                <ScrollText size={15} />
                Sentence Scripts
            </NavLink>
            <NavLink to="/admin/students" className={tabClass}>
                <Users size={15} />
                Students
            </NavLink>
        </nav>
    )
}
export default AdminSubNav