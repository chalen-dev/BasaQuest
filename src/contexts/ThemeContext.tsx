// File: src/contexts/ThemeContext.tsx
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextType = {
    theme: Theme
    skyProgress: number
    reducedMotion: boolean
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getInitialTheme(): Theme {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(getInitialTheme)

    const [skyProgress, setSkyProgress] = useState(() => theme === 'dark' ? 1 : 0)
    const progressRef = useRef(skyProgress)
    const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

    useEffect(() => {
        const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
        const update = () => setReducedMotion(preference.matches)
        preference.addEventListener('change', update)
        return () => preference.removeEventListener('change', update)
    }, [])

    useEffect(() => {
        localStorage.setItem('theme', theme)
        const target = theme === 'dark' ? 1 : 0
        const from = progressRef.current
        if (from === target) return
        const duration = (reducedMotion ? 180 : 3000) * Math.abs(target - from)
        const started = performance.now()
        let frame: number
        const tick = (now: number) => {
            const elapsed = Math.min(1, (now - started) / duration)
            const progress = from + (target - from) * elapsed
            progressRef.current = progress
            setSkyProgress(progress)
            if (elapsed < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        // A second click reverses from the current position, without a jump.
        return () => cancelAnimationFrame(frame)
    }, [theme, reducedMotion])

    const darkSurface = skyProgress >= 0.5
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkSurface)
    }, [darkSurface])

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    }

    return (
        <ThemeContext.Provider value={{ theme, skyProgress, reducedMotion, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
    return ctx
}