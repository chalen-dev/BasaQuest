// File: src/components/partials/Header.tsx
import { NavLink, useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useLang } from '../../contexts/LangContext'
import { useProfile } from '../../hooks/useProfile'
import { Owl } from '../ui/Owl'
import { Tooltip } from '../ui/Tooltip'
import { LangToggle, type Lang } from '../buttons/LangToggle'
import { ThemeToggleButton } from '../buttons/ThemeToggleButton'
import { showConfirmation, showToast } from '../../helpers/swalHelpers'

type NavItem = { to: string; label: string; matchPrefixes?: string[] }

const NAV_ITEMS: Record<Lang, NavItem[]> = {
    fil: [
        { to: '/home', label: 'Tahanan' },
        { to: '/reading/proficiency', label: 'Basa nang Malakas' },
        { to: '/reading/comprehension', label: 'Pag-unawa' },
        { to: '/history', label: 'Kasaysayan' },
    ],
    en: [
        { to: '/home', label: 'Home' },
        { to: '/reading/proficiency', label: 'Fluent Reading' },
        { to: '/reading/comprehension', label: 'Comprehension' },
        { to: '/history', label: 'History' },
    ],
}

const STUDENT_DASHBOARD_LABEL: Record<Lang, string> = {
    fil: 'Estudyante',
    en: 'Students',
}

// The "Students" pill covers two real routes (the dashboard and the roster/
// CRUD list) — it should stay highlighted on either, not just /dashboard.
const STUDENTS_MATCH_PREFIXES = ['/dashboard', '/students']

const TAGLINE: Record<Lang, string> = {
    fil: 'Plataporma ng Pagkatuto',
    en: 'Learning Platform',
}

const HEADER_STRINGS: Record<Lang, {
    logoutTitle: string
    logoutText: string
    logoutConfirm: string
    logoutToast: string
    logoutLabel: string
    logoutTooltip: string
    themeToLight: string
    themeToDark: string
}> = {
    fil: {
        logoutTitle: 'Mag-logout?',
        logoutText: 'Kailangan mong mag-login muli para bumalik dito.',
        logoutConfirm: 'Oo, mag-logout',
        logoutToast: 'Na-logout ka na. Ingat!',
        logoutLabel: 'Logout',
        logoutTooltip: 'Mag-sign out sa iyong account',
        themeToLight: 'Lumipat sa araw',
        themeToDark: 'Lumipat sa gabi',
    },
    en: {
        logoutTitle: 'Log out?',
        logoutText: "You'll need to log in again to come back here.",
        logoutConfirm: 'Yes, log out',
        logoutToast: "You've been logged out. See you soon!",
        logoutLabel: 'Logout',
        logoutTooltip: 'Sign out of your account',
        themeToLight: 'Switch to light mode',
        themeToDark: 'Switch to dark mode',
    },
}

function isNavItemActive(item: NavItem, pathname: string) {
    const prefixes = item.matchPrefixes ?? [item.to]
    return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function navLinkClass(active: boolean) {
    return `whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold transition-colors duration-300 ${
        active
            ? 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900'
            : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
    }`
}

export default function ProtectedHeader() {
    const { user, logout } = useAuth()
    const { theme } = useTheme()
    const { lang, setLang } = useLang()
    const { profile } = useProfile()
    const location = useLocation()

    const username = (user?.user_metadata?.username as string | undefined) ?? user?.email ?? 'Guest'
    const t = HEADER_STRINGS[lang]
    const isTeacher = profile?.role === 'teacher'
    const isAdmin = profile?.role === 'admin'
    const navItems: NavItem[] = isTeacher
        ? [...NAV_ITEMS[lang], { to: '/dashboard', label: STUDENT_DASHBOARD_LABEL[lang], matchPrefixes: STUDENTS_MATCH_PREFIXES }]
        : isAdmin
            ? [...NAV_ITEMS[lang], { to: '/admin/recording', label: 'Record' }]
            : NAV_ITEMS[lang]

    const handleLogout = async () => {
        const confirmed = await showConfirmation(t.logoutTitle, t.logoutText, theme === 'dark', 'warning', t.logoutConfirm)
        if (confirmed) {
            await logout()
            showToast(t.logoutToast, 'success', theme === 'dark')
        }
    }

    return (
        <header className="fixed inset-x-0 top-0 z-40 border-b border-gray-900/10 bg-orange-50/30 backdrop-blur-sm transition-colors duration-300 dark:border-gray-100/10 dark:bg-gray-950/35">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
                <NavLink to="/home" className="flex shrink-0 items-center gap-2">
                    <Owl mood="greeting" size={40} />
                    <div className="leading-tight">
                        <div className="text-lg font-extrabold text-gray-900 dark:text-gray-50">BasaQuest</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {TAGLINE[lang]}
                        </div>
                    </div>
                </NavLink>
                <nav className="hidden flex-1 items-center gap-2 pl-4 lg:flex">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={navLinkClass(isNavItemActive(item, location.pathname))}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="flex-1 lg:hidden" />

                {/* Divider separating the nav pills from the trailing
                    utility cluster (theme, lang, profile, logout) — makes
                    it visually clear those buttons aren't more nav items. */}
                <span className="hidden h-8 w-px shrink-0 bg-gray-900/10 dark:bg-gray-100/10 lg:block" />

                {/* Trailing cluster, left to right: theme toggle, lang
                    toggle, profile, logout. Tooltips render below, not
                    above — this row sits right at the top of the
                    viewport, so an above-positioned tooltip gets clipped
                    off-screen. */}
                <Tooltip label={theme === 'dark' ? t.themeToLight : t.themeToDark} position="bottom">
                    <ThemeToggleButton />
                </Tooltip>
                <LangToggle lang={lang} onChange={setLang} />

                <Tooltip label={username} position="bottom">
                    <div className="flex shrink-0 items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-orange-500 font-bold text-white shadow-sm dark:border-gray-900">
                            {username[0]?.toUpperCase()}
                        </div>
                        <div className="hidden text-right leading-tight sm:block">
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-50">{username}</div>
                            <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Estudyante</div>
                        </div>
                    </div>
                </Tooltip>

                <Tooltip label={t.logoutTooltip} position="bottom">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-red-500/15 px-3.5 py-2 text-xs font-bold text-red-700 transition-colors duration-200 hover:bg-red-500/25 dark:text-red-300 dark:hover:bg-red-500/25"
                    >
                        <LogOut size={14} />
                        {t.logoutLabel}
                    </button>
                </Tooltip>
            </div>
            <nav className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pb-3 lg:hidden">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={navLinkClass(isNavItemActive(item, location.pathname))}
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </header>
    )
}