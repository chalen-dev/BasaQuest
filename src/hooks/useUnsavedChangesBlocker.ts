// File: src/hooks/useUnsavedChangesBlocker.ts
//
// Wraps React Router's useBlocker (only available now that App.tsx uses
// a data router — see that file's own comment for why) to intercept ANY
// in-app navigation attempt — header nav links, browser back/forward,
// any programmatic navigate() call — while `hasUnsavedChanges` is true,
// plus a plain `beforeunload` listener for an actual tab close/refresh
// (a real browser event, not a react-router navigation, so useBlocker
// can't see it on its own).
//
// Two modes, chosen by `silent`:
//   - CONFIRM mode (silent: false, the default): calls the caller's own
//     `confirmLeave()` (a save/discard/cancel dialog) and waits for the
//     teacher's choice before proceeding with or cancelling the blocked
//     navigation. Used on TeacherReviewAttempt.tsx, which sits under the
//     full ProtectedHeader nav — a teacher could click Home/Students/etc.
//     by accident and previously lost their in-progress review with zero
//     warning.
//   - SILENT-SAVE mode (silent: true): saves a draft automatically and
//     proceeds, no dialog at all — matches AssessmentSessionHeader.tsx's
//     own existing Exit-button philosophy ("nothing here is actually
//     being lost, so nothing to confirm"). Used on AssessmentSession.tsx's
//     inline "Now"-mode review, so the browser's own back button behaves
//     the same way its dedicated Exit button already does.
import { useCallback, useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
export type UnsavedChangesConfirmChoice = 'save' | 'discard' | 'cancel'
type UseUnsavedChangesBlockerArgs = {
    hasUnsavedChanges: boolean
    onSaveDraft: () => Promise<void>
    // CONFIRM mode only — resolves to the teacher's choice from a dialog.
    confirmLeave?: () => Promise<UnsavedChangesConfirmChoice>
    // See this file's header comment. Defaults to false (CONFIRM mode).
    silent?: boolean
}
export function useUnsavedChangesBlocker({ hasUnsavedChanges, onSaveDraft, confirmLeave, silent = false }: UseUnsavedChangesBlockerArgs) {
    const blocker = useBlocker(
        useCallback(
            ({ currentLocation, nextLocation }) =>
                hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
            [hasUnsavedChanges]
        )
    )
    useEffect(() => {
        if (blocker.state !== 'blocked') return
        let cancelled = false
        const resolve = async () => {
            if (silent) {
                try {
                    await onSaveDraft()
                } catch (err) {
                    console.error('useUnsavedChangesBlocker: silent save-before-leaving failed', err)
                }
                if (!cancelled) blocker.proceed()
                return
            }
            const choice = (await confirmLeave?.()) ?? 'cancel'
            if (cancelled) return
            if (choice === 'cancel') {
                blocker.reset()
                return
            }
            if (choice === 'save') {
                try {
                    await onSaveDraft()
                } catch (err) {
                    console.error('useUnsavedChangesBlocker: save before leaving failed', err)
                }
            }
            blocker.proceed()
        }
        resolve()
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocker.state])
    // Real tab close/refresh — useBlocker never sees this, it's a
    // separate browser-level event. Modern browsers ignore any custom
    // message and just show their own generic "leave site?" prompt, but
    // preventDefault + setting returnValue is still what triggers it.
    useEffect(() => {
        if (!hasUnsavedChanges) return
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [hasUnsavedChanges])
}