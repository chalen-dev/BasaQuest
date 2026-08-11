// File: src/components/buttons/ThemeToggleButton.tsx
import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

interface ThemeToggleButtonProps {
    className?: string
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ className = '' }) => {
    const { theme, toggleTheme } = useTheme()
    const isDark = theme === 'dark'
    return (
        <button
            type="button"
            onClick={toggleTheme}
            role="switch"
            aria-checked={isDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`relative flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors duration-300 ${
                isDark ? 'border-indigo-400/30 bg-indigo-950' : 'border-amber-300 bg-amber-100'
            } ${className}`}
        >
            {/* Dim hint icon on whichever side the thumb isn't currently
                covering — a preview of what tapping does. */}
            <Sun size={12} className={`absolute left-1.5 text-amber-400/70 transition-opacity duration-300 ${isDark ? 'opacity-100' : 'opacity-0'}`} />
            <Moon size={12} className={`absolute right-1.5 text-indigo-900/40 transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-100'}`} />
            <span
                className={`flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-transform duration-300 ${
                    isDark ? 'translate-x-7 bg-indigo-500 text-indigo-50' : 'translate-x-0 bg-white text-amber-500'
                }`}
            >
                {isDark ? <Moon size={13} /> : <Sun size={13} />}
            </span>
        </button>
    )
}

export default ThemeToggleButton