// File: src/pages/auth/Login.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { Password } from '../../components/input/Password.tsx'
import { Text } from '../../components/input/Text.tsx'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { useTheme } from '../../contexts/ThemeContext.tsx'
import { AuthHeaderBanner } from './components/AuthHeaderBanner.tsx'
import { AuthTabs } from './components/AuthTabs.tsx'

type Lang = 'fil' | 'en'

const STRINGS: Record<Lang, {
    welcome: string
    tagline: string
    login: string
    register: string
    username: string
    usernamePh: string
    password: string
    submit: string
    submitting: string
    noAccount: string
    demoHint: string
}> = {
    fil: {
        welcome: 'Maligayang pagdating!',
        tagline: 'Mag-login o gumawa ng account para magsimula.',
        login: 'Mag-login',
        register: 'Gumawa ng account',
        username: 'Username',
        usernamePh: 'hal. maria',
        password: 'Password',
        submit: 'Mag-login',
        submitting: 'Nagla-login...',
        noAccount: 'Walang account? Gumawa ng bago',
        demoHint: 'Demo: guro · ella · jose — password: basaquest',
    },
    en: {
        welcome: 'Welcome back!',
        tagline: 'Log in or create an account to get started.',
        login: 'Log in',
        register: 'Create account',
        username: 'Username',
        usernamePh: 'e.g. maria',
        password: 'Password',
        submit: 'Log in',
        submitting: 'Logging in...',
        noAccount: "Don't have an account? Create one",
        demoHint: 'Demo: guro · ella · jose — password: basaquest',
    },
}

export default function Login() {
    const { login } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [lang, setLang] = useState<Lang>('fil')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const t = STRINGS[lang]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)
        try {
            await login(username, password)
            navigate('/dashboard')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="relative flex min-h-dvh items-center justify-center bg-orange-50 px-4 py-6 transition-colors duration-300 dark:bg-gray-950">
            {/* theme toggle, top-left */}
            <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-gray-900/10 bg-gray-900/5 text-gray-700 transition-colors duration-300 hover:bg-gray-900/10 dark:border-gray-100/10 dark:bg-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/20"
            >
                <span className="transition-transform duration-300 ease-in-out" style={{ transform: theme === 'dark' ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </span>
            </button>

            {/* language toggle, top-right */}
            <div className="absolute right-4 top-4 flex rounded-full border border-gray-900/10 bg-gray-900/5 p-1 transition-colors duration-300 dark:border-gray-100/10 dark:bg-gray-100/10">
                <button
                    type="button"
                    onClick={() => setLang('fil')}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors duration-300 ${
                        lang === 'fil' ? 'bg-teal-500 text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}
                >
                    Fil
                </button>
                <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors duration-300 ${
                        lang === 'en' ? 'bg-teal-500 text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}
                >
                    Eng
                </button>
            </div>

            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-900/5 bg-white shadow-xl transition-colors duration-300 dark:border-gray-100/10 dark:bg-gray-900">
                <AuthHeaderBanner />

                <div className="px-6 pb-6 pt-5">
                    <h1 className="mb-1 text-xl font-extrabold text-gray-900 transition-colors duration-300 dark:text-gray-50">{t.welcome}</h1>
                    <p className="mb-5 text-sm font-medium text-gray-500 transition-colors duration-300 dark:text-gray-400">{t.tagline}</p>

                    <AuthTabs active="login" labels={{ login: t.login, register: t.register }} />

                    <form onSubmit={handleSubmit}>
                        <Text
                            name="username"
                            label={t.username}
                            placeholder={t.usernamePh}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="mb-4"
                            inputClassName="px-4 py-3 rounded-xl transition-colors duration-300"
                        />
                        <Password
                            name="password"
                            label={t.password}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            error={error}
                            className="mb-5"
                            inputClassName="px-4 py-3 pr-11 rounded-xl transition-colors duration-300"
                        />

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-full bg-orange-500 px-4 py-3.5 text-base font-bold text-white shadow-[0_4px_0_0_#c2410c] transition-[background-color,box-shadow,transform] duration-300 active:translate-y-1 active:shadow-[0_1px_0_0_#c2410c] disabled:opacity-60 dark:bg-orange-600 dark:shadow-[0_4px_0_0_#9a3412]"
                        >
                            {submitting ? t.submitting : t.submit}
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={() => navigate('/register')}
                        className="mt-4 w-full text-center text-sm font-bold text-sky-600 transition-colors duration-300 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                        {t.noAccount}
                    </button>

                    <div className="mt-4 rounded-2xl border-2 border-dashed border-gray-300 px-3 py-2.5 text-center text-xs font-semibold text-gray-500 transition-colors duration-300 dark:border-gray-700 dark:text-gray-400">
                        {t.demoHint}
                    </div>
                </div>
            </div>
        </div>
    )
}