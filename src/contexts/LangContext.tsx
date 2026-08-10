import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Lang } from '../components/buttons/LangToggle'

type LangContextType = {
    lang: Lang
    setLang: (lang: Lang) => void
}

const LangContext = createContext<LangContextType | undefined>(undefined)

function getInitialLang(): Lang {
    const stored = localStorage.getItem('lang')
    if (stored === 'fil' || stored === 'en') return stored
    return 'fil'
}

export function LangProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(getInitialLang)

    const setLang = (next: Lang) => {
        setLangState(next)
        localStorage.setItem('lang', next)
    }

    return (
        <LangContext.Provider value={{ lang, setLang }}>
            {children}
        </LangContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang() {
    const ctx = useContext(LangContext)
    if (!ctx) throw new Error('useLang must be used within LangProvider')
    return ctx
}