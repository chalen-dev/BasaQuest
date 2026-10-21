// File: src/components/buttons/HomeButton.tsx
import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLang } from '../../contexts/LangContext'
import type { Lang } from './LangToggle'

// Shared "back to home" pill, used at the top of every non-home page
// (MaterialSelection, StudentList, Dashboard, and anywhere else that
// needs it). Pulled out into one component so the style only has to be
// fixed in one place — previously each page had its own copy, and a
// couple of them (Dashboard, StudentList) still had the old
// border-dashed/no-background treatment that let the animated cloud
// backdrop show straight through, even after MaterialSelection's copy
// was fixed. Solid bg-white/dark:bg-gray-900 keeps it legible everywhere.
const LABEL: Record<Lang, string> = {
    fil: 'Tahanan',
    en: 'Home',
}

interface HomeButtonProps {
    className?: string
    // Opt-in larger rendering for StudentsSubNav, whose pills grew to
    // px-5 py-2/text-base to fill the sub-nav pages' wider max-w-[1350px]
    // container — every other caller (MaterialSelection, AttemptResultsSubNav,
    // AdminSubNav) keeps the original 'sm' size so they're unaffected.
    size?: 'sm' | 'md'
}

export const HomeButton: React.FC<HomeButtonProps> = ({ className = '', size = 'sm' }) => {
    const { lang } = useLang()
    return (
        <Link
            to="/home"
            className={`inline-flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10 ${
                size === 'md' ? 'gap-2 px-5 py-2 text-base' : 'px-4 py-1.5 text-sm'
            } ${className}`}
        >
            <ArrowLeft size={size === 'md' ? 18 : 16} />
            {LABEL[lang]}
        </Link>
    )
}

export default HomeButton