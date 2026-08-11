// File: src/hooks/useDocumentTitle.ts
import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

// Keeps the browser tab title in sync with who's logged in —
// "{username} · BasaQuest" while authenticated, plain "BasaQuest" for
// guests (or while the profile is still loading and no username is known
// yet). Mounted once, globally, in App.tsx alongside useSessionPresence —
// applies across every route without each page needing its own title
// logic. index.html's static <title>BasaQuest</title> is just the
// pre-mount fallback; this takes over once React renders.
export function useDocumentTitle() {
    const { user } = useAuth()
    const { profile } = useProfile()

    useEffect(() => {
        if (!user) {
            document.title = 'BasaQuest'
            return
        }
        const displayName =
            profile?.username ||
            (user.user_metadata?.username as string | undefined) ||
            user.email?.split('@')[0] ||
            null
        document.title = displayName ? `${displayName} · BasaQuest` : 'BasaQuest'
    }, [user, profile])
}