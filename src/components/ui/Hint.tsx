// File: src/components/ui/Hint.tsx
// Global, reusable onboarding "coach mark" speech-bubble — successor to
// the old auth-only AuthHint.tsx. Renders absolutely inside whatever
// `relative`-positioned wrapper it's placed in, pointing a little tail at
// the element it's meant to be explaining. Used for the theme/language
// toggle hints on the auth pages (see GuestHeader.tsx) and for the
// mic-button / Clear Highlights / page-navigation hints in the assessment
// session (see RecorderPanel.tsx / PassagePanel.tsx).
//
// IMPORTANT: this bubble is `absolute` with no explicit width, so without
// `w-max` the browser's shrink-to-fit algorithm bases its width on the
// nearest positioned ancestor (often a tiny per-button wrapper) instead of
// on its own text content, causing severe word-per-line wrapping. `w-max`
// forces it to size off its own content instead, with `max-w-[220px]`
// still capping it so long strings wrap sanely rather than forming one
// long line.
//
// Visibility has two layers, kept deliberately separate:
//   - `show` (a prop from the caller) is an external GATE — e.g. "only
//     while the recorder is idle," or "only once there's an actual
//     highlighted word." The hint can never appear while this is false,
//     but flipping it false and true again does NOT bring back a hint the
//     pupil already dismissed.
//   - Dismissal (via the X button, the `autoHideMs` auto-hide timer, or —
//     when `markSeenOnShow` is true, the default — the instant the hint
//     first actually appears) is tracked once per `id` in HintContext, so
//     dismissing THIS hint can never affect any other hint on screen (the
//     bug the old shared-boolean version had). Once dismissed, whether
//     that sticks forever (`persist`) or only until the next full page
//     reload depends on the `persist` prop — see HintContext.tsx.
//
// `markSeenOnShow` defaults to true because these are meant to be
// one-glance coach marks: a pupil who never touches the X and never waits
// out the auto-hide timer shouldn't get the exact same hint again next
// time just because they didn't interact with it. The CURRENTLY visible
// bubble is unaffected by this — it's governed by local `closed` state,
// not by a live "is this id dismissed" read — so marking it seen doesn't
// make it flicker away the moment it appears.
import React, { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useHintContext } from '../../contexts/HintContext.tsx'
type HintPlacement = 'top' | 'bottom'
type HintAlign = 'start' | 'center' | 'end'
interface HintProps {
    /** Stable, unique-per-purpose id, e.g. "assessment-mic-button". */
    id: string
    text: string
    /** Which side of the anchor the bubble opens toward. Default 'bottom'. */
    placement?: HintPlacement
    /** Horizontal alignment relative to the anchor. Default 'center'. */
    align?: HintAlign
    /** External gating condition — the hint can only show while this is true. Default true. */
    show?: boolean
    /** Auto-close after this many ms, or null to never auto-close. Default 12000. */
    autoHideMs?: number | null
    /** Whether dismissal survives a page reload (localStorage) or only this app session (in-memory). Default true. */
    persist?: boolean
    /** Mark the hint dismissed the instant it's shown, not just on close/timeout. Default true. */
    markSeenOnShow?: boolean
    className?: string
}
const PLACEMENT_CLASS: Record<HintPlacement, string> = {
    bottom: 'top-full mt-2',
    top: 'bottom-full mb-2',
}
const ALIGN_CLASS: Record<HintAlign, string> = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
}
const TAIL_PLACEMENT_CLASS: Record<HintPlacement, string> = {
    bottom: '-top-[7px] border-l-2 border-t-2',
    top: '-bottom-[7px] border-r-2 border-b-2',
}
const TAIL_ALIGN_CLASS: Record<HintAlign, string> = {
    start: 'left-3',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-5',
}
export const Hint: React.FC<HintProps> = ({
                                              id,
                                              text,
                                              placement = 'bottom',
                                              align = 'center',
                                              show = true,
                                              autoHideMs = 12000,
                                              persist = true,
                                              markSeenOnShow = true,
                                              className = '',
                                          }) => {
    const { isDismissed, dismiss } = useHintContext()
    // Captured once, at mount — see the header comment on why `visible`
    // below is NOT derived from a live isDismissed(id) read.
    const [wasDismissedAtMount] = useState(() => isDismissed(id))
    const [closed, setClosed] = useState(false)
    const visible = show && !wasDismissedAtMount && !closed
    const close = useCallback(() => {
        setClosed(true)
        dismiss(id, persist)
    }, [dismiss, id, persist])
    useEffect(() => {
        if (visible && markSeenOnShow) {
            dismiss(id, persist)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible])
    useEffect(() => {
        if (!visible || autoHideMs == null) return
        const timer = setTimeout(close, autoHideMs)
        return () => clearTimeout(timer)
    }, [visible, autoHideMs, close])
    if (!visible) return null
    return (
        <div
            className={`absolute z-20 w-max max-w-[220px] animate-hint-pop ${PLACEMENT_CLASS[placement]} ${ALIGN_CLASS[align]} ${className}`}
        >
            <div className="relative animate-hint-wiggle rounded-2xl border-2 border-orange-200 bg-white py-3 pl-4 pr-8 font-kid text-[15px] font-semibold leading-snug text-orange-700 shadow-lg transition-colors duration-300 dark:border-amber-400 dark:bg-slate-800 dark:text-amber-200">
                {text}
                <button
                    type="button"
                    onClick={close}
                    aria-label="Close hint"
                    className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-orange-400 transition-colors duration-200 hover:bg-orange-100 hover:text-orange-600 dark:text-amber-300 dark:hover:bg-slate-700 dark:hover:text-amber-100"
                >
                    <X size={13} strokeWidth={3} />
                </button>
                <span
                    className={`absolute h-3.5 w-3.5 rotate-45 rounded-sm border-orange-200 bg-white transition-colors duration-300 dark:border-amber-400 dark:bg-slate-800 ${TAIL_PLACEMENT_CLASS[placement]} ${TAIL_ALIGN_CLASS[align]}`}
                />
            </div>
        </div>
    )
}
export default Hint