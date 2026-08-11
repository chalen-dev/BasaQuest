// File: src/components/buttons/LangToggle.tsx
import React from 'react'
import { Tooltip } from '../ui/Tooltip'

export type Lang = 'fil' | 'en'

interface LangToggleProps {
    lang: Lang
    onChange: (lang: Lang) => void
    className?: string
}

export const LangToggle: React.FC<LangToggleProps> = ({ lang, onChange, className = '' }) => {
    return (
        <div className={`flex rounded-full border border-gray-900/10 bg-gray-900/5 p-1 transition-colors duration-300 dark:border-gray-100/10 dark:bg-gray-100/10 ${className}`}>
            <Tooltip label="Filipino" position="bottom">
                <button
                    type="button"
                    onClick={() => onChange('fil')}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-colors duration-300 ${
                        lang === 'fil' ? 'bg-teal-500 text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}
                >
                    Fil
                </button>
            </Tooltip>
            <Tooltip label="English" position="bottom">
                <button
                    type="button"
                    onClick={() => onChange('en')}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-colors duration-300 ${
                        lang === 'en' ? 'bg-teal-500 text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}
                >
                    Eng
                </button>
            </Tooltip>
        </div>
    )
}

export default LangToggle