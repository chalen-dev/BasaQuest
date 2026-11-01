// File: src/components/routes/DesktopOnly.tsx
// Wraps a page that is only built for computer-sized screens (Coach Mode's
// table-and-book scene). On a narrower screen it shows a friendly note and a
// way back instead of the broken layout.
import { useSyncExternalStore, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Owl } from '../ui/Owl.tsx'
import { useLang } from '../../contexts/LangContext.tsx'

const QUERY = '(min-width: 1024px)'

function subscribe(callback: () => void) {
    const mq = window.matchMedia(QUERY)
    mq.addEventListener('change', callback)
    return () => mq.removeEventListener('change', callback)
}

const STRINGS = {
    fil: {
        title: 'Gamitin ang computer para dito',
        body: 'Ang pahinang ito ay para sa mas malaking screen. Buksan ito sa laptop o desktop, o palakihin ang window ng browser.',
        back: 'Bumalik',
    },
    en: {
        title: 'Please use a computer for this',
        body: 'This page is made for a bigger screen. Open it on a laptop or desktop, or make your browser window wider.',
        back: 'Go back',
    },
} as const

export function DesktopOnly({ children }: { children: ReactNode }) {
    const isWide = useSyncExternalStore(
        subscribe,
        () => window.matchMedia(QUERY).matches,
        () => true,
    )
    const navigate = useNavigate()
    const { lang } = useLang()
    const t = STRINGS[lang]
    if (isWide) return <>{children}</>
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-gray-50 px-8 text-center dark:bg-gray-950">
            <Owl size={120} />
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h1>
            <p className="max-w-sm text-base font-medium text-gray-600 dark:text-gray-300">{t.body}</p>
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="cursor-pointer rounded-full bg-teal-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_0_#0f766e] transition-colors duration-150 hover:bg-teal-600"
            >
                {t.back}
            </button>
        </div>
    )
}
