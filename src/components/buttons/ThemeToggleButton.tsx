import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

interface ThemeToggleButtonProps {
    className?: string
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ className = '' }) => {
    const { theme, toggleTheme } = useTheme()

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-gray-900/10 bg-gray-900/5 text-gray-700 transition-colors duration-300 hover:bg-gray-900/10 dark:border-gray-100/10 dark:bg-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/20 ${className}`}
        >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
    )
}

export default ThemeToggleButton