// File: ProtectedHeader.tsx
import { NavLink, useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { useTheme } from '../../contexts/ThemeContext.tsx'
import { useLang } from '../../contexts/LangContext.tsx'
import { useProfile } from '../../hooks/useProfile.ts'
import { OWL_NEUTRAL_IMAGE } from '../../components/ui/Owl.tsx'
import { Tooltip } from '../../components/ui/Tooltip.tsx'
import { LangToggle, type Lang } from '../../components/buttons/LangToggle.tsx'
import { ThemeToggleButton } from '../../components/buttons/ThemeToggleButton.tsx'
import { showConfirmation, showToast } from '../../helpers/swalHelpers.ts'
import { usePendingReviewCountQuery } from '../../pages/students/review/hooks.ts'

type NavItem = { to: string; label: string; matchPrefixes?: string[]; badge?: number }

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

// The "Students" pill covers three real routes now (dashboard, roster/
// CRUD list, and the review inbox) — it should stay highlighted on any
// of them, not just /dashboard. "/students" as a prefix already covers
// both /students and /students/review via isNavItemActive's
// startsWith(`${p}/`) check, so no separate entry is needed for review.
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

    // Same usePendingReviewCountQuery hook StudentsSubNav's own badge and
    // Dashboard's stat card use — one source of truth, three places it
    // shows up. Only queried for teachers (students/admins never see
    // this pill at all).
    const { data: pendingReviewCount } = usePendingReviewCountQuery(isTeacher ? profile?.id : undefined)

    const navItems: NavItem[] = isTeacher
        ? [...NAV_ITEMS[lang], { to: '/dashboard', label: STUDENT_DASHBOARD_LABEL[lang], matchPrefixes: STUDENTS_MATCH_PREFIXES, badge: pendingReviewCount }]
        : isAdmin
            ? [...NAV_ITEMS[lang], { to: '/admin/recording', label: 'Record Students', matchPrefixes: ['/admin/recording', '/admin/students'] }]
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
                    {/* Brand mark uses the static neutral owl, not a mood
                        image — the header logo shouldn't shift expression
                        based on app state. */}
                    <img
                        src={OWL_NEUTRAL_IMAGE}
                        alt="BasaQuest owl mascot"
                        width={40}
                        height={40}
                        className="select-none"
                        draggable={false}
                    />
                    <div className="leading-tight">
                        <div className="text-lg font-extrabold text-gray-900 dark:text-gray-50">BasaQuest</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {TAGLINE[lang]}
                        </div>
                    </div>
                </NavLink>
                <nav className="hidden flex-1 items-center gap-2 pl-4 lg:flex">
                    {navItems.map((item) => (
                        <div key={item.to} className="relative">
                            <NavLink
                                to={item.to}
                                className={navLinkClass(isNavItemActive(item, location.pathname))}
                            >
                                {item.label}
                            </NavLink>
                            {!!item.badge && item.badge > 0 && (
                                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                                    {item.badge > 9 ? '9+' : item.badge}
                                </span>
                            )}
                        </div>
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
                    <div key={item.to} className="relative">
                        <NavLink
                            to={item.to}
                            className={navLinkClass(isNavItemActive(item, location.pathname))}
                        >
                            {item.label}
                        </NavLink>
                        {!!item.badge && item.badge > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                                {item.badge > 9 ? '9+' : item.badge}
                            </span>
                        )}
                    </div>
                ))}
            </nav>
        </header>
    )
}