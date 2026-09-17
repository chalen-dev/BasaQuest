// File: src/pages/students/reports/features/ErrorBreakdownBars.tsx
//
// Renders the Omission/Insertion/Mispronunciation % breakdown as three
// horizontal bars. Shared between both reports — Report 1 shows one of
// these per language, Report 2 shows one combined across the whole
// class (see get_class_analytics_report's own header comment for why
// that one's combined rather than split).
import React from 'react'
import type { ErrorBreakdown, ErrorType } from '../hooks'

const ERROR_TYPES: ErrorType[] = ['Omission', 'Insertion', 'Mispronunciation']

const BAR_COLOR: Record<ErrorType, string> = {
    Omission: '#e11d48',
    Insertion: '#f59e0b',
    Mispronunciation: '#f97316',
}

export type ErrorBreakdownStrings = {
    omission: string
    insertion: string
    mispronunciation: string
    noErrors: string
}

interface ErrorBreakdownBarsProps {
    breakdown: ErrorBreakdown
    total: number
    t: ErrorBreakdownStrings
}

const LABEL_KEY: Record<ErrorType, keyof ErrorBreakdownStrings> = {
    Omission: 'omission',
    Insertion: 'insertion',
    Mispronunciation: 'mispronunciation',
}

export const ErrorBreakdownBars: React.FC<ErrorBreakdownBarsProps> = ({ breakdown, total, t }) => {
    if (total === 0) {
        return <p className="text-sm font-medium text-gray-500 dark:text-gray-400 print:text-gray-600">{t.noErrors}</p>
    }
    return (
        <div className="flex flex-col gap-2">
            {ERROR_TYPES.map((type) => {
                const count = breakdown[type] ?? 0
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                    <div key={type} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 text-xs font-semibold text-gray-600 dark:text-gray-300 print:text-gray-700">
                            {t[LABEL_KEY[type]]}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-900/5 dark:bg-gray-100/10 print:bg-gray-200">
                            <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: BAR_COLOR[type] }}
                            />
                        </div>
                        <span className="w-14 shrink-0 text-right text-xs font-bold text-gray-800 dark:text-gray-100 print:text-gray-900">
                            {pct}% ({count})
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

export default ErrorBreakdownBars
