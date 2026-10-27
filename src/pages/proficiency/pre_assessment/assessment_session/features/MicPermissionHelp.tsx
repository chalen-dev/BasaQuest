// File: src/pages/proficiency/pre_assessment/assessment_session/features/MicPermissionHelp.tsx
// Helps a pupil (or teacher) get past the browser's microphone prompt. The
// recording screen asks for the mic as soon as it opens (see the PRE-WARM in
// RecorderPanel.tsx), and the browser's own prompt can be confusing, so while
// it is open this floats over the page, near the top where the browser's
// prompt appears, with a small picture of that prompt and the right button
// ringed. It fades away on its own a few seconds after the pupil answers (or
// after a while, or with its close button). If the mic was blocked earlier it
// explains how to unblock it instead.
//
// Permission state comes from the Permissions API and updates live when the
// pupil answers. Browsers that can't report it (older Safari) show nothing and
// the existing "microphone not available" fallback still applies.
import { useEffect, useState } from 'react'
import { Lock, Mic, MousePointerClick, X } from 'lucide-react'
import type { AssessmentStrings } from '../assessmentSessionStrings.ts'

// 'checking' until the browser answers; 'unknown' when it can't say (the
// Permissions API is missing or refuses the question).
type MicState = 'checking' | 'prompt' | 'granted' | 'denied' | 'unknown'

// How long a help card stays up, in ms, before it fades on its own. The prompt
// card goes as soon as the pupil answers; the longer one is for "blocked".
const FADE_AFTER_PROMPT_MS = 20000
const FADE_AFTER_BLOCKED_MS = 30000
const FADE_DURATION_MS = 500

function useMicPermission(): MicState {
    const [state, setState] = useState<MicState>('checking')
    useEffect(() => {
        let status: PermissionStatus | null = null
        let cancelled = false
        const update = () => status && !cancelled && setState(status.state as MicState)
        if (!navigator.permissions) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setState('unknown')
            return
        }
        navigator.permissions
            .query({ name: 'microphone' as PermissionName })
            .then((s) => {
                status = s
                update()
                s.addEventListener('change', update)
            })
            .catch(() => {
                if (!cancelled) setState('unknown')
            })
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

export function MicPermissionHelp({
    t,
    failed,
    onActiveChange,
}: {
    t: AssessmentStrings
    failed: boolean
    // Tells the screen whether the microphone is still being sorted out, so
    // its one-time hints can wait: true while the browser is being asked or
    // while this card is showing.
    onActiveChange?: (active: boolean) => void
}) {
    const state = useMicPermission()
    // 'granted' with a failure means no mic device, which the existing
    // "microphone not available" fallback already covers.
    const blocked = state === 'denied' || (failed && state === 'unknown')
    const wanted = blocked || state === 'prompt'
    const kind = blocked ? 'blocked' : 'prompt'

    // Each kind of card (prompt, blocked) shows at most once: `seen` once it
    // first appears, `expired` when its timer runs out, `gone` once its fade
    // has finished, `dismissed` when closed by hand. It fades out when the
    // pupil answers (no longer wanted) or when it expires.
    const [seen, setSeen] = useState<string | null>(null)
    const [expired, setExpired] = useState<string | null>(null)
    const [gone, setGone] = useState<string | null>(null)
    const [dismissed, setDismissed] = useState<string | null>(null)
    if (wanted && seen !== kind) setSeen(kind)
    const leaving = seen === kind && (!wanted || expired === kind)

    useEffect(() => {
        if (!wanted) return
        const timer = setTimeout(() => setExpired(kind), blocked ? FADE_AFTER_BLOCKED_MS : FADE_AFTER_PROMPT_MS)
        return () => clearTimeout(timer)
    }, [wanted, blocked, kind])

    useEffect(() => {
        if (!leaving) return
        const timer = setTimeout(() => setGone(kind), FADE_DURATION_MS)
        return () => clearTimeout(timer)
    }, [leaving, kind])

    const visible = seen === kind && gone !== kind && dismissed !== kind

    useEffect(() => {
        onActiveChange?.(state === 'checking' || visible)
    }, [state, visible, onActiveChange])
    // Leaving the screen (recording starts, say) frees the hints again.
    useEffect(() => () => onActiveChange?.(false), [onActiveChange])

    if (!visible) return null

    return (
        <div
            role="status"
            className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4"
        >
            <div
                className={`pointer-events-auto relative flex w-full max-w-sm flex-col gap-3 rounded-2xl border-2 border-amber-400/70 bg-amber-50 p-4 pr-10 text-sm font-semibold text-amber-900 shadow-2xl transition-[opacity,transform] ease-out dark:border-amber-400/50 dark:bg-slate-900 dark:text-amber-100 ${
                    leaving ? 'translate-y-[-8px] opacity-0' : 'translate-y-0 animate-hint-pop opacity-100'
                }`}
                style={{ transitionDuration: `${FADE_DURATION_MS}ms` }}
            >
                <button
                    type="button"
                    onClick={() => setDismissed(kind)}
                    aria-label="Close hint"
                    className="absolute right-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-amber-700 hover:bg-amber-200/60 dark:text-amber-300 dark:hover:bg-slate-700"
                >
                    <X size={14} strokeWidth={3} />
                </button>
                <p className="flex items-center gap-2 text-base font-extrabold">
                    {blocked ? <Lock size={18} /> : <Mic size={18} />}
                    {blocked ? t.micBlockedTitle : t.micAskTitle}
                </p>
                <p className="leading-snug">{blocked ? t.micBlockedBody : t.micAskBody}</p>
                {!blocked && <PromptPicture allowLabel={t.micAllowButton} />}
            </div>
        </div>
    )
}
