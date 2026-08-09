import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Text } from '../../components/input/Text';
import { Password } from '../../components/input/Password';
import { ThemeToggleButton } from '../../components/buttons/ThemeToggleButton';
import { AuthHeaderBanner } from './components/AuthHeaderBanner';
import { AuthTabs } from './components/AuthTabs';
import { LangToggle, type Lang } from '../../components/buttons/LangToggle';

const STRINGS: Record<Lang, {
    welcome: string
    tagline: string
    login: string
    register: string
    username: string
    email: string
    password: string
    confirmPassword: string
    submit: string
    submitting: string
    haveAccount: string
    mismatch: string
}> = {
    fil: {
        welcome: 'Gumawa ng account',
        tagline: 'Punan ang mga detalye para magsimula sa BasaQuest.',
        login: 'Mag-login',
        register: 'Gumawa ng account',
        username: 'Username',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Kumpirmahin ang Password',
        submit: 'Gumawa ng account',
        submitting: 'Ginagawa ang account...',
        haveAccount: 'May account na? Mag-login',
        mismatch: 'Hindi magkatugma ang password',
    },
    en: {
        welcome: 'Create your account',
        tagline: 'Fill in your details to get started with BasaQuest.',
        login: 'Log in',
        register: 'Create account',
        username: 'Username',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        submit: 'Create account',
        submitting: 'Creating account...',
        haveAccount: 'Already have an account? Log in',
        mismatch: 'Passwords do not match',
    },
}

export const Register: React.FC = () => {
    const { signUp } = useAuth();
    const navigate = useNavigate();
    const [lang, setLang] = useState<Lang>('fil');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const t = STRINGS[lang];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError(t.mismatch);
            return;
        }
        setSubmitting(true);
        try {
            await signUp(email, password, username);
            navigate('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="relative flex min-h-dvh items-center justify-center bg-orange-50 px-4 py-6 transition-colors duration-300 dark:bg-gray-950">
            <ThemeToggleButton className="absolute left-4 top-4" />
            <LangToggle lang={lang} onChange={setLang} className="absolute right-4 top-4" />

            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-900/5 bg-white shadow-xl transition-colors duration-300 dark:border-gray-100/10 dark:bg-gray-900">
                <AuthHeaderBanner />

                <div className="px-6 pb-6 pt-5">
                    <h1 className="mb-1 text-xl font-extrabold text-gray-900 transition-colors duration-300 dark:text-gray-50">{t.welcome}</h1>
                    <p className="mb-5 text-sm font-medium text-gray-500 transition-colors duration-300 dark:text-gray-400">{t.tagline}</p>

                    <AuthTabs active="register" labels={{ login: t.login, register: t.register }} />

                    <form onSubmit={handleSubmit}>
                        <Text
                            name="username"
                            label={t.username}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="mb-4"
                            inputClassName="px-4 py-3 rounded-xl transition-colors duration-300"
                        />
                        <Text
                            name="email"
                            type="email"
                            label={t.email}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                            className="mb-4"
                            inputClassName="px-4 py-3 pr-11 rounded-xl transition-colors duration-300"
                        />
                        <Password
                            name="confirmPassword"
                            label={t.confirmPassword}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                        onClick={() => navigate('/login')}
                        className="mt-4 w-full text-center text-sm font-bold text-sky-600 transition-colors duration-300 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                        {t.haveAccount}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Register;