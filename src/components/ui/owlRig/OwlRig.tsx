// File: src/components/ui/owlRig/OwlRig.tsx
//
// The animated owl, in its two forms from the owl icon studio:
//   - variant "full": the whole bird (body, wings, feet), for scenes and cards
//   - variant "icon": a round portrait with the wings and little reactions
//     (stars, question mark, z's) peeking past the circle, for avatars/badges
// Both play the same ten emotions and can talk (beak moves while `talking`).
//
// Several of these can share a page: every SVG id is prefixed per instance, and
// one shared animation loop drives them all (see owlEngine.ts). An owl scrolled out
// of view stops being animated until it comes back.
//
// Use <Owl> (../Owl.tsx) for ordinary call sites; it picks this up for you.
import { useEffect, useId, useMemo, useRef, useSyncExternalStore } from 'react'
import { owlFullMarkup, owlPortraitMarkup } from './owlMarkup'
import { createOwlRig, owlTicker, type OwlEmotion, type OwlRig as Rig } from './owlEngine'

export type { OwlEmotion }

export type OwlRigProps = {
    emotion?: OwlEmotion
    variant?: 'full' | 'icon'
    /** Width and height in px. */
    size?: number
    /** Move the beak as if speaking. */
    talking?: boolean
    /** Breathing, blinking and small idle movement. Always off under reduced motion. */
    idle?: boolean
    /** 1 = normal. */
    speed?: number
    className?: string
    /** Accessible name; the owl is decorative (hidden from screen readers) when omitted. */
    label?: string
    /** Icon only: what sits behind the owl inside the circle. "transparent" (default)
     *  shows whatever the page has behind it; "filled" is the pale green disc. */
    background?: 'transparent' | 'filled'
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
function subscribeReduced(onChange: () => void) {
    const query = window.matchMedia(REDUCED_QUERY)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
}
const reducedNow = () => window.matchMedia(REDUCED_QUERY).matches

export function OwlRig({
    emotion = 'neutral',
    variant = 'full',
    size = 64,
    talking = false,
    idle = true,
    speed = 1,
    className = '',
    label,
    background = 'transparent',
}: OwlRigProps) {
    // A valid, unique id prefix (useId's colons are not safe inside url(#...)).
    const prefix = 'owl' + useId().replace(/[^a-zA-Z0-9]/g, '') + '-'
    const reduced = useSyncExternalStore(subscribeReduced, reducedNow, () => false)
    const small = size < 128

    // The artwork never changes for a given instance; it is drawn in the effect below.
    const html = useMemo(() => {
        const full = `<svg viewBox="0 0 1280 1320" width="100%" height="100%" style="overflow:visible;${variant === 'icon' ? 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none' : 'display:block'}" aria-hidden="true">${owlFullMarkup(prefix)}</svg>`
        if (variant === 'full') return full
        const portrait = `<svg viewBox="-110 -120 1220 1240" width="100%" height="100%" style="display:block;overflow:visible" aria-hidden="true">${background === 'transparent' ? owlPortraitMarkup(prefix).replace('fill="#eaf5db"', 'fill="none"') : owlPortraitMarkup(prefix)}</svg>`
        // The portrait borrows the full owl's head and wings, so both are drawn.
        return full + portrait
    }, [prefix, variant, background])

    const rootRef = useRef<HTMLSpanElement>(null)
    const rigRef = useRef<Rig | null>(null)
    // Latest values for the rig, read when it is created and by the effects below.
    const settings = useRef({ speed, reduced, idle, talking, small, emotion })
    useEffect(() => {
        settings.current = { speed, reduced, idle, talking, small, emotion }
    })

    useEffect(() => {
        const root = rootRef.current
        if (!root) return
        // The artwork is drawn here, once, rather than through dangerouslySetInnerHTML:
        // React would rewrite it on a re-render and leave the animation holding
        // elements that are no longer on the page.
        root.innerHTML = html
        const s = settings.current
        const rig = createOwlRig(root, { speed: s.speed, reduced: s.reduced, idle: s.idle, talking: s.talking, small: s.small }, s.emotion)
        rigRef.current = rig
        rig.step(performance.now())
        let running = false
        const run = (on: boolean) => {
            if (on === running) return
            running = on
            if (on) owlTicker.add(rig.step)
            else owlTicker.remove(rig.step)
        }
        run(true)
        // Skip owls that are scrolled out of view.
        const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => run(entries[entries.length - 1].isIntersecting))
        observer?.observe(root)
        return () => {
            observer?.disconnect()
            run(false)
            rigRef.current = null
            root.innerHTML = ''
        }
    }, [html])

    useEffect(() => {
        rigRef.current?.setOptions({ speed, reduced, idle, talking, small })
    }, [speed, reduced, idle, talking, small])

    useEffect(() => {
        rigRef.current?.setEmotion(emotion)
    }, [emotion])

    return (
        <span
            ref={rootRef}
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            className={`select-none ${className}`}
            style={{
                display: 'inline-block',
                position: 'relative',
                verticalAlign: 'middle',
                width: size,
                height: size,
                filter: variant === 'icon' ? `drop-shadow(0 ${size * 0.025}px ${size * 0.04}px rgba(21,75,73,.125))` : undefined,
            }}
        />
    )
}

export default OwlRig
