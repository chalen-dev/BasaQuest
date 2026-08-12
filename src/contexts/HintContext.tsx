// File: src/contexts/HintContext.tsx
// Global registry for the small onboarding "coach mark" hint bubbles used
// across the app (see components/ui/Hint.tsx for the bubble itself). This
// replaces the auth-only useAuthEntryHint.ts, which held ONE shared
// showHint boolean for every hint on the page — so closing any single
// hint (the theme-toggle one, say) flipped that one flag and silently
// closed every other hint too (the language-toggle one), since they were
// all reading the exact same piece of state. Here, dismissal is tracked
// per hint ID in a Set, so closing "guest-theme-toggle" has no effect on
// "guest-lang-toggle" or anything else — each Hint instance only cares
// about its own id.
//
// Two dismissal lifetimes, controlled per-hint by the `persist` flag a
// <Hint> is given (see Hint.tsx):
//   - persist=false: dismissal only lives in this in-memory Set, which is
//     recreated fresh every time the app boots (full page load/refresh).
//     This is what the auth-page hints use, matching their original
//     product behavior of reappearing on every fresh visit rather than
//     being gone forever after the first time.
//   - persist=true: dismissal is ALSO written to localStorage under
//     `hint-dismissed:<id>`, so once a pupil has seen (or closed) that
//     hint once, it's gone for good, across reloads and future visits —
//     the right behavior for one-time "here's how this works" coach
//     marks, e.g. in the assessment session.
// localStorage-persisted dismissals are read back in on provider mount,
// so a permanently-dismissed hint stays hidden from the very first render
// rather than flashing on then immediately disappearing.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
const STORAGE_PREFIX = 'hint-dismissed:'
type HintContextType = {
    isDismissed: (id: string) => boolean
    dismiss: (id: string, persist: boolean) => void
}
const HintContext = createContext<HintContextType | undefined>(undefined)
function readPersistedDismissedIds(): Set<string> {
    const ids = new Set<string>()
    if (typeof localStorage === 'undefined') return ids
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(STORAGE_PREFIX)) {
            ids.add(key.slice(STORAGE_PREFIX.length))
        }
    }
    return ids
}
export function HintProvider({ children }: { children: ReactNode }) {
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => readPersistedDismissedIds())
    const isDismissed = useCallback((id: string) => dismissedIds.has(id), [dismissedIds])
    const dismiss = useCallback((id: string, persist: boolean) => {
        setDismissedIds((prev) => {
            if (prev.has(id)) return prev
            const next = new Set(prev)
            next.add(id)
            return next
        })
        if (persist) {
            localStorage.setItem(`${STORAGE_PREFIX}${id}`, '1')
        }
    }, [])
    return (
        <HintContext.Provider value={{ isDismissed, dismiss }}>
            {children}
        </HintContext.Provider>
    )
}
// eslint-disable-next-line react-refresh/only-export-components
export function useHintContext() {
    const ctx = useContext(HintContext)
    if (!ctx) throw new Error('useHintContext must be used within HintProvider')
    return ctx
}