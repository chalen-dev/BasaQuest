// File: src/components/partials/Header.tsx
import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useLang } from '../../contexts/LangContext'
import { Owl } from '../ui/Owl'
import { LangToggle, type Lang } from '../buttons/LangToggle'
import { ThemeToggleButton } from '../buttons/ThemeToggleButton'
import { showConfirmation, showToast } from '../../helpers/swalHelpers'
const NAV_ITEMS: Record<Lang, { to: string; label: string }[]> = {
    fil: [
        { to: '/home', label: 'Tahanan' },
        { to: '/history', label: 'Kasaysayan' },
        { to: '/reading/proficiency', label: 'Basa nang Malakas' },
        { to: '/reading/comprehension', label: 'Pag-unawa' },
    ],
    en: [
        { to: '/home', label: 'Home' },
        { to: '/history', label: 'History' },
        { to: '/reading/proficiency', label: 'Fluent Reading' },
        { to: '/reading/comprehension', label: 'Comprehension' },
    ],
}
const LOGOUT_STRINGS: Record<Lang, { title: string; text: string; confirm: string; toast: string }> = {
    fil: {
        title: 'Mag-logout?',
        text: 'Kailangan mong mag-login muli para bumalik dito.',
        confirm: 'Oo, mag-logout',
        toast: 'Na-logout ka na. Ingat!',
    },
    en: {
        title: 'Log out?',
        text: "You'll need to log in again to come back here.",
        confirm: 'Yes, log out',
        toast: "You've been logged out. See you soon!",
    },
}
export default function Header() {
    const { user, logout } = useAuth()
    const { theme } = useTheme()
    const { lang, setLang } = useLang()
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])
    const username = (user?.user_metadata?.username as string | undefined) ?? user?.email ?? 'Guest'
    const lt = LOGOUT_STRINGS[lang]
    const handleLogout = async () => {
        setOpen(false)
        const confirmed = await showConfirmation(lt.title, lt.text, theme === 'dark', 'warning', lt.confirm)
        if (confirmed) {
            await logout()
            showToast(lt.toast, 'success', theme === 'dark')
        }
    }
    return (
        <header className="sticky top-0 z-40 border-b border-gray-900/10 bg-orange-50/90 backdrop-blur-sm transition-colors duration-300 dark:border-gray-100/10 dark:bg-gray-950/90">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
                <NavLink to="/home" className="flex items-center gap-2">
                    <Owl mood="greeting" size={40} />
                    <div className="leading-tight">
                        <div className="text-lg font-extrabold text-gray-900 dark:text-gray-50">BasaQuest</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Plataporma ng Pagkatuto
                        </div>
                    </div>
                </NavLink>
                <nav className="hidden flex-1 items-center gap-2 pl-4 lg:flex">
                    {NAV_ITEMS[lang].map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `rounded-full px-4 py-1.5 text-sm font-bold transition-colors duration-300 ${
                                    isActive
                                        ? 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900'
                                        : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="flex-1 lg:hidden" />
                <LangToggle lang={lang} onChange={setLang} />
                <div className="hidden items-center gap-3 sm:flex">
                    <div className="text-right leading-tight">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-50">{username}</div>
                        <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Estudyante</div>
                    </div>
                </div>
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setOpen((prev) => !prev)}
                        aria-label="Account menu"
                        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-orange-500 font-bold text-white shadow-sm dark:border-gray-900"
                    >
                        {username[0]?.toUpperCase()}
                    </button>
                    {open && (
                        <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-gray-900/10 bg-white shadow-lg dark:border-gray-100/10 dark:bg-gray-800">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-900/5 dark:border-gray-100/10 dark:text-gray-400 sm:hidden">
                                {username}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 transition-colors duration-300 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
                <ThemeToggleButton />
            </div>
            <nav className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 pb-3 lg:hidden">
                {NAV_ITEMS[lang].map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `rounded-full px-4 py-1.5 text-sm font-bold transition-colors duration-300 ${
                                isActive
                                    ? 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900'
                                    : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                            }`
                        }
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </header>
    )
}