// File: AttemptResultsSubNav.tsx
// File: src/pages/students/results/AttemptResultsSubNav.tsx
//
// Sub-nav for a single confirmed attempt's results page — styled and
// structured like StudentsSubNav.tsx's pill row (same shape/colors,
// back button folded in as the first pill with a divider, same as
// HomeButton does there), but scoped to just this one attempt rather
// than the top-level Dashboard/Student List/Review/Results switch.
//
// Extracted out of AttemptResults.tsx per explicit ask — the back
// button used to sit on its own line above a separate Review/Results
// tab row; this merges both into one component, matching how
// StudentsSubNav already does it.
//
// Back always goes to /students/results — that's this page's fixed
// destination regardless of tab, so it's handled internally here
// (useNavigate) rather than being passed in as a prop.
//
// tab/onTabChange are OPTIONAL: AttemptResults.tsx's loading/error/
// not-found states render this with neither, showing just the back
// button — a Review/Results tab switch doesn't mean anything before
// there's actual attempt data to switch between.
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList, ListChecks } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import type { Lang } from '../../../components/buttons/LangToggle'
export type AttemptResultsTab = 'review' | 'results'
const STRINGS: Record<Lang, { back: string; reviewTab: string; resultsTab: string }> = {
    fil: { back: 'Bumalik sa Resulta', reviewTab: 'Suriin', resultsTab: 'Mga Marka' },
    en: { back: 'Back to Results', reviewTab: 'Review', resultsTab: 'Results' },
}
type AttemptResultsSubNavProps = {
    tab?: AttemptResultsTab
    onTabChange?: (tab: AttemptResultsTab) => void
}
export const AttemptResultsSubNav: React.FC<AttemptResultsSubNavProps> = ({ tab, onTabChange }) => {
    const { lang } = useLang()
    const navigate = useNavigate()
    const t = STRINGS[lang]
    // Same shape/colors as StudentsSubNav.tsx's tabClass — kept
    // consistent on purpose rather than inventing a different pill
    // style for this one page.
    const tabPillClass = (active: boolean) =>
        `flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold shadow-sm transition-colors duration-300 ${
            active
                ? 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900'
                : 'border border-gray-900/10 bg-white text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10'
        }`
    const showTabs = tab != null && onTabChange != null
    return (
        <nav className="mb-6 flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={() => navigate('/students/results')}
                className="flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
            >
                <ArrowLeft size={16} />
                {t.back}
            </button>
            {showTabs && (
                <>
                    <span className="h-5 w-px bg-gray-900/10 dark:bg-gray-100/10" aria-hidden="true" />
                    <button type="button" onClick={() => onTabChange('review')} className={tabPillClass(tab === 'review')}>
                        <ClipboardList size={15} />
                        {t.reviewTab}
                    </button>
                    <button type="button" onClick={() => onTabChange('results')} className={tabPillClass(tab === 'results')}>
                        <ListChecks size={15} />
                        {t.resultsTab}
                    </button>
                </>
            )}
        </nav>
    )
}
export default AttemptResultsSubNav