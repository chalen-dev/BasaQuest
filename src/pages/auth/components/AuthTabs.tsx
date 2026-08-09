// File: src/components/auth/AuthTabs.tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'

interface AuthTabsProps {
    active: 'login' | 'register'
    labels: { login: string; register: string }
}

export const AuthTabs: React.FC<AuthTabsProps> = ({ active, labels }) => {
    const navigate = useNavigate()

    return (
        <div className="mb-6 flex gap-1.5 rounded-full bg-gray-100 p-1 dark:bg-gray-800">
            <button
                type="button"
                onClick={() => navigate('/login')}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${
                    active === 'login'
                        ? 'bg-gray-900 text-white dark:bg-gray-950'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
                {labels.login}
            </button>
            <button
                type="button"
                onClick={() => navigate('/register')}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${
                    active === 'register'
                        ? 'bg-gray-900 text-white dark:bg-gray-950'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
                {labels.register}
            </button>
        </div>
    )
}

export default AuthTabs