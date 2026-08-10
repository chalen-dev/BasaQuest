// File: src/hooks/useAuthEntryHint.ts
import { useEffect, useState } from 'react'

const SWITCH_FLAG_KEY = 'bq_auth_switch_nav'
const HINT_VISIBLE_MS = 12000

/**
 * Decides whether the "here's what these buttons do" onboarding hints
 * should show on an auth page (Login/Register). Shows on any "fresh"
 * arrival — direct visit, refresh, or landing here right after logout —
 * but NOT when the user got here by clicking the "switch to login/register"
 * link on the other auth page, since that's still the same auth session,
 * not a fresh visit.
 *
 * How it works: `markAuthSwitchNavigation()` stamps a one-shot
 * sessionStorage flag right before navigating between Login <-> Register.
 * Whichever auth page mounts next checks for that flag — if present, it
 * consumes (removes) it and stays quiet; if absent, it shows the hints
 * (auto-hiding again after HINT_VISIBLE_MS).
 */
export function useAuthEntryHint(): boolean {
    const [showHint, setShowHint] = useState(false)

    useEffect(() => {
        const cameFromSwitch = sessionStorage.getItem(SWITCH_FLAG_KEY)
        if (cameFromSwitch) {
            sessionStorage.removeItem(SWITCH_FLAG_KEY)
            return
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowHint(true)
        const timer = setTimeout(() => setShowHint(false), HINT_VISIBLE_MS)
        return () => clearTimeout(timer)
    }, [])

    return showHint
}

/** Call this right before navigating from Login -> Register or Register -> Login. */
export function markAuthSwitchNavigation() {
    sessionStorage.setItem(SWITCH_FLAG_KEY, '1')
}