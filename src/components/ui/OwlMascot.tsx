// File: src/components/ui/OwlMascot.tsx
//
// The REAL animated owl from the "book tabletop" HTML/CSS/JS prototype
// (book-tabletop-theme-toggle_16.html), ported to React -- not the flat
// per-mood PNG in Owl.tsx. This is a dedicated component (Owl.tsx is
// left untouched) because Owl.tsx is also used by three unrelated
// screens (RemediationSession.tsx, RemediationSessionHeader.tsx,
// StudentRemediationDetail.tsx) that render small static/looping icons,
// sometimes several at once in a list -- this component's ids
// (#owl-mascot, #owl-breath, etc., same as the prototype) and its
// setInterval-driven idle-gesture loop are only safe with ONE instance
// mounted at a time, which is true for RemediationCoach.tsx's usage
// (only one of its three Owl call sites is ever rendered at once) but
// would NOT be true for a list of student cards.
//
// WHAT'S PORTED VERBATIM (mechanically extracted, attributes renamed for
// JSX only -- class->className, stroke-width->strokeWidth, clip-
// path->clipPath -- zero hand-retyped path data): the whole owl-mascot
// SVG group (feet/wings/body/head/eyes/beak), its gradients/clip-paths,
// and every one of the prototype's owl CSS rules/keyframes (breathe,
// sway, blink, double-blink, tilt, wave, the four talking keyframes,
// the night/day --owl-* variables, the reduced-motion overrides).
// Dropped on purpose: the notebook/companion-mode plumbing, the
// dashed focus-ring + button semantics (this mascot isn't clickable
// here), and the "glance" idle gesture (companion-mode-only) -- none of
// those apply to Reading Coach Mode.
//
// WHAT'S RE-DERIVED: the prototype drives everything off one global
// #owl-mascot element hand-wired to a mic/companion-toggle/dialogue
// system (setupOwl()/setupOwlSpeech() in the prototype's <script>
// blocks). This component re-expresses that as three small props
// instead: `listening` (mirrors the prototype's owl.dataset.listening,
// set from the mic's aria-pressed), `speakText` (mirrors
// showOwlMessage()'s data-state="talking" pulse -- same duration
// formula, `clamp(text.length*48, 1200, 5500)` ms, triggered here
// whenever the text changes instead of on every dialogue call), and
// `celebrate` (a one-off wing-wave gesture on a pass, using the same
// owl-wave class/keyframe the prototype's own random idle "wave"
// gesture uses). The random blink/tilt/wave idle-gesture scheduler
// (schedule()/tick() below) is copied over near verbatim from the
// prototype's setupOwl(), including its timing windows and its
// "only tilt/wave while data-state is idle" rule.
//
// VIEWBOX: the prototype nests this mascot inside a giant 1670x941
// scene via <g transform="translate(180 35) scale(.38)">, a placement
// transform for THAT scene, not part of the owl's own artwork. That
// wrapper is dropped here; viewBox="120 0 980 1200" is a tight-but-safe
// crop of the owl's own path data (its widest extent is the ellipse
// that was the prototype's focus ring, x:167-1081/y:23-1193) with a
// little headroom so the sway/tilt/wave animations never clip.
import { useEffect, useRef } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export type OwlMascotProps = {
    /** Rendered width in px; height follows the artwork's own aspect
     * ratio (980:1200) unless overridden by className (e.g. Tailwind's
     * `w-full h-auto`, same pattern the old Owl.tsx img relied on). */
    size?: number
    className?: string
    /** Owl leans in, eyes narrow, pupils shift toward the mic -- use
     * while the student is actively recording. Always wins over any
     * in-flight "talking" animation. */
    listening?: boolean
    /** The line currently shown in the speech bubble, if any. Whenever
     * this text changes (and `listening` is false), the beak/mouth/
     * head/body animate as if speaking it, for
     * clamp(text.length * 48, 1200, 5500) ms -- verbatim from the
     * prototype's showOwlMessage(). */
    speakText?: string | null
    /** Triggers one friendly wing-wave gesture on a rising edge
     * (false -> true) -- use for a pass/celebration moment. */
    celebrate?: boolean
    /** True to pause the owl entirely -- idle gestures (blink/tilt/wave)
     * stop scheduling and every in-progress animation freezes via CSS
     * (`#owl-mascot[data-paused="true"] * { animation-play-state: paused
     * }`, already present below). Mirrors the prototype's
     * window.suspendOwlCompanion()/resumeOwlCompanion() pair, used there
     * while the notebook companion is showing instead of the owl.
     * Doesn't unmount anything, so a CSS crossfade back to `paused=false`
     * resumes cleanly instead of restarting from a blank state. */
    paused?: boolean
    /** Accessible name; the SVG's internals are aria-hidden. */
    label?: string
}

const VIEWBOX_WIDTH = 980
const VIEWBOX_HEIGHT = 1200

export function OwlMascot({
                              size = 64,
                              className = '',
                              listening = false,
                              speakText,
                              celebrate = false,
                              paused: pausedProp = false,
                              label = 'BasaQuest owl mascot',
                          }: OwlMascotProps) {
    const { theme } = useTheme()
    const isNight = theme === 'dark'

    const mascotRef = useRef<SVGGElement>(null)
    const talkTimeoutRef = useRef<number | null>(null)
    const prevSpeakTextRef = useRef<string | null>(null)
    const prevCelebrateRef = useRef(false)
    // Read by the idle-gesture scheduler below (mount-only effect, so it
    // can't close over the `pausedProp` value directly) and updated by
    // the small effect right after it whenever the prop changes.
    const pausedPropRef = useRef(pausedProp)
    // Lets the "paused prop turned false" effect below resume the
    // scheduler without duplicating its resetSchedule()/schedule() logic
    // -- set once the scheduler effect mounts, cleared on unmount.
    const resumeSchedulerRef = useRef<(() => void) | null>(null)

    // The prototype's setupOwl() idle-gesture scheduler, ported near
    // verbatim: random blink (with a 20% chance of a double-blink)
    // every 3-7s, and tilt/wave gestures that only fire while the owl
    // is otherwise idle (never mid-"talking"/"listening"), on their own
    // 9-28s windows. Pauses while the tab is hidden or the user prefers
    // reduced motion.
    useEffect(() => {
        const mascot = mascotRef.current
        if (!mascot) return
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
        const random = (min: number, max: number) => min + Math.random() * (max - min)
        const next = { blink: 0, tilt: 0, wave: 0 }
        let timer: number | undefined

        const resetSchedule = () => {
            const now = performance.now()
            next.blink = now + random(3000, 7000)
            next.tilt = now + random(9000, 16000)
            next.wave = now + random(15000, 24000)
        }
        const paused = () => document.hidden || reduced.matches || pausedPropRef.current
        const schedule = () => {
            window.clearTimeout(timer)
            if (paused()) return
            const due = Math.min(next.blink, next.tilt, next.wave)
            timer = window.setTimeout(tick, Math.max(30, due - performance.now()))
        }
        const tick = () => {
            if (paused()) return
            const now = performance.now()
            if (now >= next.blink) {
                mascot.classList.add(Math.random() < 0.2 ? 'owl-double-blink' : 'owl-blink')
                next.blink = now + random(3000, 7000)
            }
            if (now >= next.tilt) {
                if (mascot.dataset.state === 'idle') mascot.classList.add('owl-tilt')
                next.tilt = now + random(10000, 18000)
            }
            if (now >= next.wave) {
                if (mascot.dataset.state === 'idle') mascot.classList.add('owl-wave')
                next.wave = now + random(18000, 28000)
            }
            schedule()
        }
        const handleAnimationEnd = (e: AnimationEvent) => {
            const classesByAnimation: Record<string, string[]> = {
                'owl-blink': ['owl-blink', 'owl-double-blink'],
                'owl-tilt': ['owl-tilt'],
                'owl-wave': ['owl-wave'],
            }
            for (const name of classesByAnimation[e.animationName] ?? []) mascot.classList.remove(name)
        }
        const sync = () => {
            window.clearTimeout(timer)
            if (paused()) return
            resetSchedule()
            schedule()
        }

        mascot.addEventListener('animationend', handleAnimationEnd)
        document.addEventListener('visibilitychange', sync)
        reduced.addEventListener('change', sync)
        resumeSchedulerRef.current = sync
        resetSchedule()
        schedule()

        return () => {
            window.clearTimeout(timer)
            mascot.removeEventListener('animationend', handleAnimationEnd)
            document.removeEventListener('visibilitychange', sync)
            reduced.removeEventListener('change', sync)
            resumeSchedulerRef.current = null
        }
    }, [])

    // Mirrors the mount effect's own `sync()` reaction to
    // visibilitychange/reduced-motion, but for the `paused` prop: keeps
    // the scheduler's own paused() check current every render, sets the
    // CSS `data-paused` attribute the stylesheet below already freezes
    // every animation on, and -- only when the prop just turned false --
    // resumes the scheduler (mirrors the prototype's
    // resumeOwlCompanion()).
    useEffect(() => {
        pausedPropRef.current = pausedProp
        const mascot = mascotRef.current
        if (mascot) mascot.dataset.paused = String(pausedProp)
        if (!pausedProp) resumeSchedulerRef.current?.()
    }, [pausedProp])

    // `listening` always wins -- mirrors the prototype's setOwlState(),
    // which only ever lands on 'listening'/'talking'/'idle' and treats
    // listening as the highest-priority state.
    useEffect(() => {
        const mascot = mascotRef.current
        if (!mascot) return
        if (listening) {
            if (talkTimeoutRef.current !== null) {
                window.clearTimeout(talkTimeoutRef.current)
                talkTimeoutRef.current = null
            }
            mascot.dataset.state = 'listening'
            mascot.dataset.listening = 'true'
        } else {
            mascot.dataset.listening = 'false'
            if (mascot.dataset.state === 'listening') mascot.dataset.state = 'idle'
        }
    }, [listening])

    // Speaking pulse -- verbatim duration formula from the prototype's
    // showOwlMessage(): clamp(text.length * 48, 1200, 5500) ms. Only
    // retriggers when the text actually changes, so this doesn't reset
    // mid-animation on an unrelated re-render.
    useEffect(() => {
        const mascot = mascotRef.current
        if (!mascot) return
        const text = speakText?.trim() || null
        if (listening) {
            prevSpeakTextRef.current = text
            return
        }
        if (text && text !== prevSpeakTextRef.current) {
            prevSpeakTextRef.current = text
            if (talkTimeoutRef.current !== null) window.clearTimeout(talkTimeoutRef.current)
            mascot.dataset.state = 'talking'
            const talkFor = Math.max(1200, Math.min(5500, text.length * 48))
            talkTimeoutRef.current = window.setTimeout(() => {
                if (mascot.dataset.state === 'talking') mascot.dataset.state = 'idle'
                talkTimeoutRef.current = null
            }, talkFor)
        } else if (!text) {
            prevSpeakTextRef.current = null
        }
    }, [speakText, listening])

    // One-off wing-wave on a rising edge -- same class/keyframe the
    // idle-loop's own random "wave" gesture uses, just triggered
    // explicitly instead of on a random timer.
    useEffect(() => {
        const mascot = mascotRef.current
        if (mascot && celebrate && !prevCelebrateRef.current) {
            mascot.classList.add('owl-wave')
        }
        prevCelebrateRef.current = celebrate
    }, [celebrate])

    return (
        <svg
            viewBox={`120 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={Math.round((size * VIEWBOX_HEIGHT) / VIEWBOX_WIDTH)}
            role="img"
            aria-label={label}
            className={`owlmascot ${className}`}
            data-theme={isNight ? 'night' : 'day'}
        >
            <style>{`
                .owlmascot { --owl-outline: #006369; --owl-rim: #62e5cd; --owl-shadow: #803d13; display: block; transition: filter 220ms ease; }
                .owlmascot[data-theme="night"] { --owl-outline: #00596d; --owl-rim: #aaa4ff; --owl-shadow: #111340; }
                /* Hover highlight -- not clickable yet (see header comment),
                but a hover glow using the prototype's own --owl-rim color
                (the same color its dashed keyboard focus-ring uses) gives
                the owl a "highlighted" state without inventing a new visual
                language for it. */
                .owlmascot:hover { filter: drop-shadow(0 0 22px var(--owl-rim)); }
                #owl-glow { opacity: 0; transition: opacity 300ms ease; }
                .owlmascot[data-theme="night"] #owl-glow { opacity: 1; }
                #owl-mascot path, #owl-ground-shadow { transition: stroke 300ms ease, fill 300ms ease; }
                #owl-breath { transform-origin: 624px 1015px; animation: owl-breathe 3.8s ease-in-out -.9s infinite; }
                #owl-sway { transform-origin: 624px 1015px; animation: owl-sway 6.7s ease-in-out -2.2s infinite; }
                #owl-listening-lean { transform-origin: 624px 1015px; transition: transform 400ms ease; }
                #owl-head-tilt { transform-origin: 624px 625px; }
                #owl-right-wing { transform-origin: 865px 675px; }
                #owl-eyes-focus { transform-origin: 624px 400px; transition: transform 350ms ease; }
                .owl-eye-blink { transform-box: fill-box; transform-origin: center; }
                .owl-pupil { transition: transform 280ms ease; }
                #owl-eyelids { opacity: 0; }
                #owl-mascot[data-listening="true"] #owl-listening-lean { transform: rotate(1deg); }
                #owl-mascot[data-listening="true"] #owl-eyes-focus { transform: scale(1.025); }
                #owl-mascot[data-listening="true"] .owl-pupil { transform: translate(9px, 1px); }
                .owl-blink .owl-eye-blink { animation: owl-blink 180ms ease-in-out; }
                .owl-blink #owl-eyelids { animation: owl-lids 180ms ease-in-out; }
                .owl-double-blink .owl-eye-blink { animation: owl-blink 180ms ease-in-out 2; }
                .owl-double-blink #owl-eyelids { animation: owl-lids 180ms ease-in-out 2; }
                .owl-tilt #owl-head-tilt { animation: owl-tilt 1.8s ease-in-out; }
                .owl-wave #owl-right-wing { animation: owl-wave 1.4s ease-in-out; }
                @keyframes owl-breathe { 50% { transform: translateY(-3px) scaleY(1.004); } }
                @keyframes owl-sway { 0%,100% { transform: rotate(-.6deg); } 50% { transform: rotate(.6deg); } }
                @keyframes owl-blink { 0%,100% { transform: scaleY(1); } 45%,55% { transform: scaleY(.045); } }
                @keyframes owl-lids { 0%,30%,75%,100% { opacity: 0; } 45%,55% { opacity: 1; } }
                @keyframes owl-tilt { 0%,100% { transform: rotate(0); } 40%,65% { transform: rotate(2deg); } }
                @keyframes owl-wave { 0%,100% { transform: rotate(0); } 35%,65% { transform: rotate(-9deg); } }
                #owl-mascot[data-paused="true"] * { animation-play-state: paused !important; }
                #owl-mouth-opening { opacity: 0; transform-origin: 622px 523px; }
                #owl-lower-beak { transform-origin: 622px 504px; }
                #owl-mascot[data-state="talking"] #owl-lower-beak { animation: owl-speak-beak 460ms ease-in-out infinite; }
                #owl-mascot[data-state="talking"] #owl-mouth-opening { animation: owl-speak-mouth 460ms ease-in-out infinite; }
                #owl-mascot[data-state="talking"] #owl-head { animation: owl-speak-bob 1100ms ease-in-out infinite; }
                #owl-mascot[data-state="talking"] #owl-body { animation: owl-speak-bounce 1400ms ease-in-out infinite; }
                #owl-mascot[data-state="talking"] .owl-idle-loop { animation-play-state: paused; }
                @keyframes owl-speak-beak { 0%,100% { transform: translateY(0); } 40%,60% { transform: translateY(8px); } }
                @keyframes owl-speak-mouth { 0%,100% { opacity: 0; transform: scaleY(.3); } 40%,60% { opacity: 1; transform: scaleY(1); } }
                @keyframes owl-speak-bob { 50% { transform: translateY(-2px); } }
                @keyframes owl-speak-bounce { 50% { transform: translateY(-1.5px); } }
                @media (prefers-reduced-motion: reduce) {
                    #owl-mascot *, #owl-mascot[data-listening="true"] * { animation: none !important; transition: none !important; }
                    #owl-listening-lean, #owl-eyes-focus, .owl-pupil { transform: none !important; }
                    #owl-mascot[data-state="talking"] * { animation: none !important; }
                    .owlmascot { transition: none; }
                }
            `}</style>
            <defs>
                <linearGradient id="owl-teal" x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#00c2bb"/><stop offset="1" stopColor="#00b4ad"/></linearGradient>
                <linearGradient id="owl-cream" x2=".8" y2="1"><stop stopColor="#ffe68b"/><stop offset=".5" stopColor="#ffed9e"/><stop offset="1" stopColor="#ffe582"/></linearGradient>
                <linearGradient id="owl-orange" x2=".7" y2="1"><stop stopColor="#ffb800"/><stop offset="1" stopColor="#ffa600"/></linearGradient>
                <linearGradient id="owl-wing-paint" x2="1" y2="1"><stop stopColor="#00a6a5"/><stop offset="1" stopColor="#009b9e"/></linearGradient>
                <radialGradient id="owl-night-glow"><stop stopColor="#8f8aff" stopOpacity=".24"/><stop offset="1" stopColor="#706bff" stopOpacity="0"/></radialGradient>
                <clipPath id="owl-eye-left-clip"><ellipse cx="460" cy="399" rx="116" ry="120"/></clipPath>
                <clipPath id="owl-eye-right-clip"><ellipse cx="785" cy="399" rx="114" ry="120"/></clipPath>
            </defs>
            <g ref={mascotRef} id="owl-mascot" data-state="idle" data-listening="false" aria-hidden="true">
                <ellipse id="owl-ground-shadow" cx="624" cy="1130" rx="325" ry="35" fill="var(--owl-shadow)" opacity=".2"/>
                <ellipse id="owl-glow" cx="625" cy="600" rx="530" ry="590" fill="url(#owl-night-glow)"/>
                <g id="owl-feet" fill="url(#owl-orange)" stroke="#c36105" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M457 995 L450 1034 C396 1048 363 1073 365 1108 C366 1138 397 1145 420 1126 C422 1158 463 1162 494 1131 C519 1161 557 1146 578 1119 C604 1084 578 1051 552 1035 L550 995Z"/>
                    <path d="M704 995 L700 1037 C667 1058 654 1083 670 1117 C685 1147 723 1159 751 1131 C780 1162 823 1157 829 1127 C858 1148 887 1133 887 1109 C887 1074 851 1047 803 1034 L794 995Z"/>
                    <path d="M420 1126 Q421 1091 448 1075 M494 1131 Q492 1102 511 1082 M751 1131 Q755 1101 739 1082 M829 1127 Q825 1095 804 1077" fill="none" strokeWidth="11"/>
                </g>
                <g id="owl-listening-lean">
                    <g id="owl-sway" className="owl-idle-loop">
                        <g id="owl-breath" className="owl-idle-loop">
                            <g id="owl-left-wing" fill="url(#owl-wing-paint)" stroke="var(--owl-outline)" strokeWidth="19" strokeLinejoin="round">
                                <path d="M372 652 C310 688 239 754 216 828 C198 877 218 895 250 858 C228 919 247 973 276 960 C288 955 297 937 301 917 C303 969 330 1012 356 982 C382 953 388 900 401 846 L438 693Z"/>
                            </g>
                            <g id="owl-right-wing" fill="url(#owl-wing-paint)" stroke="var(--owl-outline)" strokeWidth="19" strokeLinejoin="round">
                                <path d="M877 652 C940 688 1010 754 1034 828 C1052 877 1031 895 1000 858 C1022 919 1003 973 974 960 C962 955 953 937 949 917 C947 969 920 1012 894 982 C868 953 862 900 849 846 L812 693Z"/>
                            </g>
                            <g id="owl-body">
                                <path d="M423 643 C378 700 342 774 348 842 C350 952 416 1024 514 1028 Q556 1031 592 1010 Q625 1018 658 1010 Q701 1036 746 1025 C845 1010 899 938 907 845 C917 770 880 693 833 642Z" fill="url(#owl-teal)" stroke="var(--owl-outline)" strokeWidth="19"/>
                                <path d="M492 677 C440 712 404 771 406 837 C408 935 493 988 621 990 C749 991 837 938 841 837 C844 773 807 711 749 677 Q623 720 492 677Z" fill="url(#owl-cream)"/>
                                <g id="owl-belly-feathers" fill="#ffc63c">
                                    <path d="M489 737 Q522 767 559 739 C550 794 497 795 489 737Z M585 748 Q621 780 656 745 C653 801 598 808 585 748Z M684 741 Q720 768 753 736 C750 791 698 799 684 741Z M449 798 Q479 829 514 808 C503 859 456 859 449 798Z M538 819 Q570 845 605 819 C598 871 552 878 538 819Z M638 820 Q670 846 704 820 C696 871 650 879 638 820Z M736 808 Q770 834 802 798 C800 851 752 866 736 808Z M489 880 Q520 912 556 890 C548 937 501 940 489 880Z M585 896 Q620 926 656 894 C651 946 597 953 585 896Z M685 890 Q721 914 754 882 C751 934 701 948 685 890Z"/>
                                </g>
                            </g>
                            <g id="owl-head-tilt">
                                <g id="owl-head">
                                    <path d="M322 242 C281 232 246 201 252 169 Q254 146 286 153 C259 125 247 84 266 62 C294 33 392 96 439 168 Q508 133 575 130 C558 99 568 58 593 59 C625 56 679 98 697 136 Q758 140 812 167 C859 107 949 50 981 59 C1009 69 994 126 971 151 C1018 138 1012 186 979 209 Q960 227 935 234 C989 299 1022 397 1016 482 C1011 597 947 641 856 668 C790 691 699 699 620 689 C535 704 447 688 391 667 C291 642 233 586 236 474 C237 389 269 302 322 242Z" fill="url(#owl-teal)" stroke="var(--owl-outline)" strokeWidth="20" strokeLinejoin="round"/>
                                    <g id="owl-head-feathers" fill="#008b90">
                                        <path d="M333 179 Q364 194 403 188 L354 222 Q329 233 324 236 L326 214 Q346 215 359 206 Q339 195 333 179Z M850 188 Q889 195 920 178 Q915 199 894 208 Q912 220 932 216 L928 236Z M574 129 C527 132 514 181 561 194 C531 171 548 136 594 144Z"/>
                                    </g>
                                    <path id="owl-face" d="M622 311 C569 248 520 219 467 229 C362 235 301 331 298 433 C292 546 347 601 448 626 Q537 649 618 618 Q704 647 791 626 C895 604 952 547 947 434 C944 331 887 235 786 229 C727 218 675 250 622 311Z" fill="url(#owl-cream)"/>
                                    <g id="owl-eyes-focus">
                                        <g id="owl-left-eye" className="owl-eye-blink">
                                            <ellipse cx="460" cy="399" rx="117" ry="121" fill="#fffdfd"/>
                                            <g clipPath="url(#owl-eye-left-clip)"><g id="owl-left-pupil" className="owl-pupil"><ellipse cx="472" cy="415" rx="82" ry="85" fill="#2b2035"/><g id="owl-left-eye-highlights" fill="#fff"><circle cx="494" cy="376" r="25"/><circle cx="515" cy="416" r="10"/></g></g></g>
                                        </g>
                                        <g id="owl-right-eye" className="owl-eye-blink">
                                            <ellipse cx="785" cy="399" rx="114" ry="121" fill="#fffdfd"/>
                                            <g clipPath="url(#owl-eye-right-clip)"><g id="owl-right-pupil" className="owl-pupil"><ellipse cx="773" cy="416" rx="81" ry="85" fill="#2b2035"/><g id="owl-right-eye-highlights" fill="#fff"><circle cx="793" cy="376" r="25"/><circle cx="813" cy="416" r="10"/></g></g></g>
                                        </g>
                                        <g id="owl-eyelids" fill="none" stroke="#00656c" strokeWidth="11" strokeLinecap="round"><path d="M366 403 Q459 433 554 403 M694 403 Q784 433 877 403"/></g>
                                    </g>
                                    <g id="owl-cheek-blush" fill="#ff9650"><ellipse cx="389" cy="535" rx="53" ry="40" transform="rotate(18 389 535)"/><ellipse cx="849" cy="537" rx="55" ry="40" transform="rotate(-23 849 537)"/></g>
                                    <g id="owl-beak" fill="url(#owl-orange)" stroke="#bf5700" strokeWidth="11" strokeLinejoin="round">
                                        <path id="owl-lower-beak" d="M566 504 Q579 554 616 564 Q651 570 674 505Z"/>
                                        <ellipse id="owl-mouth-opening" cx="622" cy="531" rx="34" ry="12" fill="#78300d" stroke="none"/>
                                        <path d="M559 495 C574 465 597 447 621 447 C648 446 673 467 683 494 Q686 501 674 508 Q622 554 564 509 Q554 503 559 495Z"/>
                                        <ellipse cx="609" cy="468" rx="13" ry="7" transform="rotate(-25 609 468)" fill="#ffe482" stroke="none"/>
                                    </g>
                                    <path id="owl-rim-light" d="M266 85 Q261 120 288 143 M257 476 C256 561 287 609 340 631 M978 324 Q1004 387 1002 458" fill="none" stroke="var(--owl-rim)" strokeWidth="10" strokeLinecap="round" opacity=".38"/>
                                </g>
                            </g>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    )
}

export default OwlMascot