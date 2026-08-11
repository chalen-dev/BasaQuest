// File: src/hooks/useAuthEntryHint.ts
import { useEffect, useState } from 'react'

const HINT_VISIBLE_MS = 12000

/**
 * Decides whether the "here's what these buttons do" onboarding hints
 * should show on an auth page (Login/Register), and exposes a way to
 * dismiss them early via a close button.
 *
 * Shows on any "fresh" arrival — direct visit, refresh, or landing here
 * right after logout — but NOT when the user got here by clicking the
 * "switch to login/register" link on the other auth page, since that's
 * still the same auth session, not a fresh visit.
 *
 * `cameFromSwitch` is passed in by the page, derived from React Router's
 * `location.state` (set by the page's own "switch to login/register"
 * handler via `navigate(..., { state: { fromAuthSwitch: true } })`).
 *
 * This replaces an earlier sessionStorage-flag version that had a real
 * bug: React's Strict Mode double-invokes effects in development, so an
 * effect that both read AND deleted a one-shot sessionStorage flag would
 * have the flag already consumed by the throwaway first invocation,
 * making the hint reappear on the "real" second invocation even right
 * after a switch-navigation. location.state has no such issue since
 * it's plain data read during render, not a destructive side effect
 * tied to effect timing.
 */
export function useAuthEntryHint(cameFromSwitch: boolean) {
    const [showHint, setShowHint] = useState(!cameFromSwitch)

    useEffect(() => {
        if (cameFromSwitch) return
        const timer = setTimeout(() => setShowHint(false), HINT_VISIBLE_MS)
        return () => clearTimeout(timer)
    }, [cameFromSwitch])

    const dismissHint = () => setShowHint(false)

    return { showHint, dismissHint }
}