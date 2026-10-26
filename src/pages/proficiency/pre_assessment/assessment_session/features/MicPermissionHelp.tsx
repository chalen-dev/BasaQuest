// File: src/pages/proficiency/pre_assessment/assessment_session/features/MicPermissionHelp.tsx
// Helps a pupil (or teacher) get past the browser's microphone prompt. The
// recording screen asks for the mic as soon as it opens (see the PRE-WARM in
// RecorderPanel.tsx), and the browser's own prompt can be confusing, so while
// it is open this shows a small picture of that prompt with the right button
// ringed. If the mic was blocked earlier it explains how to unblock it.
//
// Permission state comes from the Permissions API and updates live when the
// pupil answers. Browsers that can't report it (older Safari) show nothing and
// the existing "microphone not available" fallback still applies.
import { useEffect, useState } from 'react'
import { Lock, Mic, MousePointerClick } from 'lucide-react'
import type { AssessmentStrings } from '../assessmentSessionStrings.ts'

type MicState = 'prompt' | 'granted' | 'denied' | 'unknown'

function useMicPermission(): MicState {
    const [state, setState] = useState<MicState>('unknown')
    useEffect(() => {
        let status: PermissionStatus | null = null
        let cancelled = false
        const update = () => status && !cancelled && setState(status.state as MicState)
        navigator.permissions
            ?.query({ name: 'microphone' as PermissionName })
            .then((s) => {
                status = s
                update()
                s.addEventListener('change', update)
            })
            .catch(() => {})
        return () => {
            cancelled = true
            status?.removeEventListener('change', update)
        }
    }, [])
    return state
}

// A look-alike of the browser's prompt, drawn in HTML so it follows the theme.
// Not the real prompt: only here to show which button to press.
function PromptPicture({ allowLabel }: { allowLabel: string }) {
    const button = 'rounded-full bg-sky-900/80 px-3 py-1.5 text-center text-xs font-bold text-sky-100'
    return (
        <div
            aria-hidden="true"
            className="mx-auto w-full max-w-[260px] rounded-2xl bg-slate-800 p-3 text-slate-100 shadow-md"
        >
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                <Mic size={14} /> Use available microphones
            </div>
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-slate-700 p-2">
                <Mic size={14} />
                <span className="h-1.5 flex-1 rounded-full bg-slate-600">
                    <span className="block h-full w-1/5 rounded-full bg-sky-300" />
                </span>
            </div>
            <div className="flex flex-col gap-1.5">
                <div className="relative">
                    <div className={`${button} ring-4 ring-amber-400`}>{allowLabel}</div>
                    <MousePointerClick
                        size={26}
                        className="absolute -bottom-3 right-2 animate-bounce text-amber-300 drop-shadow"
                    />
                </div>
                <div className={button}>Allow this time</div>
                <div className={button}>Never allow</div>
            </div>
        </div>
    )
}

export function MicPermissionHelp({ t, failed }: { t: AssessmentStrings; failed: boolean }) {
    const state = useMicPermission()
    // 'granted' with a failure means no mic device, which the existing
    // "microphone not available" fallback already covers.
    const blocked = state === 'denied' || (failed && state === 'unknown')
    if (!blocked && state !== 'prompt') return null

    return (
        <div className="flex w-full flex-col gap-3 rounded-2xl border-2 border-amber-400/60 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100">
            <p className="flex items-center gap-2 text-base font-extrabold">
                {blocked ? <Lock size={18} /> : <Mic size={18} />}
                {blocked ? t.micBlockedTitle : t.micAskTitle}
            </p>
            <p className="leading-snug">{blocked ? t.micBlockedBody : t.micAskBody}</p>
            {!blocked && <PromptPicture allowLabel={t.micAllowButton} />}
        </div>
    )
}
