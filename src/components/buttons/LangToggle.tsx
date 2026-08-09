import React from 'react'

export type Lang = 'fil' | 'en'

interface LangToggleProps {
    lang: Lang
    onChange: (lang: Lang) => void
    className?: string
}

export const LangToggle: React.FC<LangToggleProps> = ({ lang, onChange, className = '' }) => {
    return (
        <div className={`flex rounded-full border border-gray-900/10 bg-gray-900/5 p-1 transition-colors duration-300 dark:border-gray-100/10 dark:bg-gray-100/10 ${className}`}>
            <button
                type="button"
                onClick={() => onChange('fil')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors duration-300 ${
                    lang === 'fil' ? 'bg-teal-500 text-white' : 'text-gray-600 dark:text-gray-300'
                }`}
            >
                Fil
            </button>
            <button
                type="button"
                onClick={() => onChange('en')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors duration-300 ${
                    lang === 'en' ? 'bg-teal-500 text-white' : 'text-gray-600 dark:text-gray-300'
                }`}
            >
                Eng
            </button>
        </div>
    )
}

export default LangToggle