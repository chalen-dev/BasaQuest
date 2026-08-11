// File: src/pages/auth/Login.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Password } from '../../components/input/Password.tsx'
import { Text } from '../../components/input/Text.tsx'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { useTheme } from '../../contexts/ThemeContext.tsx'
import { useLang } from '../../contexts/LangContext.tsx'
import { supabase } from '../../lib/supabaseClient.ts'
import { AuthHeaderBanner } from './components/AuthHeaderBanner.tsx'
import { AuthTabs } from './components/AuthTabs.tsx'
import type { Lang } from '../../components/buttons/LangToggle.tsx'
import { showToast } from '../../helpers/swalHelpers.ts'
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
    demoHintTeacher: string
    demoHintStudent: string
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
        demoHintTeacher: 'Guro: guro — password: basaquest',
        demoHintStudent: 'Estudyante: ella — password: basaquest',
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
        demoHintTeacher: 'Teacher: guro — password: basaquest',
        demoHintStudent: 'Student: ella — password: basaquest',
    },
}
export default function Login() {
    const { login } = useAuth()
    const { theme } = useTheme()
    const { lang } = useLang()
    const navigate = useNavigate()
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
            // If this account has a pending teacher-assigned check-in
            // (see PreAssessment.tsx's teacher-side student picker), route
            // straight into that session with the assigned language
            // instead of Home — and consume the assignment immediately so
            // it only ever fires once. Wrapped in its own try/catch so any
            // hiccup here just falls back to the normal Home redirect
            // rather than blocking login entirely.
            //
            // Default redirect is '/home' (not '/dashboard') for both
            // roles — Home.tsx already branches its content by role,
            // showing a teacher-only dashboard-link section, so it's the
            // correct shared landing page after login.
            let redirectTo = '/home'
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: assignment } = await supabase
                        .from('assigned_assessments')
                        .select('id, lang')
                        .eq('student_id', user.id)
                        .order('created_at', { ascending: true })
                        .limit(1)
                        .maybeSingle()
                    if (assignment) {
                        await supabase.from('assigned_assessments').delete().eq('id', assignment.id)
                        redirectTo = `/reading/proficiency/assessment/session?lang=${assignment.lang}`
                    }
                }
            } catch (assignmentErr) {
                console.error('Login: failed to check for a pending assessment assignment', assignmentErr)
            }
            // Combined bilingual welcome — shown regardless of the app's
            // language toggle, and closable (×) since a toast that
            // auto-dismisses right as the page navigates away can
            // otherwise vanish before it's been read.
            const displayName = username.trim() || (lang === 'fil' ? 'kaibigan' : 'friend')
            showToast(
                `Maligayang pagbabalik, ${displayName}!<br/>Welcome back, ${displayName}!`,
                'success',
                theme === 'dark',
                { closable: true, timer: 4000 }
            )
            navigate(redirectTo)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed')
        } finally {
            setSubmitting(false)
        }
    }
    const goToRegister = () => {
        navigate('/register', { state: { fromAuthSwitch: true } })
    }
    return (
        <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-6">
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-gray-900/5 bg-white shadow-xl transition-colors duration-300 dark:border-gray-100/10 dark:bg-gray-900">
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
                        onClick={goToRegister}
                        className="mt-4 w-full text-center text-sm font-bold text-sky-600 transition-colors duration-300 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                        {t.noAccount}
                    </button>
                    <div className="mt-4 space-y-1 rounded-2xl border-2 border-dashed border-gray-300 px-3 py-2.5 text-center text-xs font-semibold text-gray-500 transition-colors duration-300 dark:border-gray-700 dark:text-gray-400">
                        <div>{t.demoHintTeacher}</div>
                        <div>{t.demoHintStudent}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}