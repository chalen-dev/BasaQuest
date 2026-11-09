// File: src/components/ui/owlRig/owlEngine.ts
//
// The owl's animation engine, ported from the owl icon studio prototype
// (owl-icon.html). Every emotion is a pose: a set of numbers (how far each wing
// is lifted, how open the beak is, where the eyes look...). Changing emotion
// glides from the current numbers to the new pose's numbers, so switching
// mid-motion looks natural instead of snapping. Each frame the numbers are
// written onto the SVG as transforms and path shapes.
//
// The numbers, the wing shapes and the maths are the prototype's, unchanged;
// what changed is only where it reads its settings from (an options object
// instead of the studio's checkboxes) and how it finds the artwork (data-r
// attributes inside one root element instead of global ids), so several owls
// can live on one page.
//
// Stepping is driven by one shared requestAnimationFrame loop for all owls
// (see owlTicker below), which pauses while the tab is hidden.

export type OwlEmotion =
    | 'neutral'
    | 'happy'
    | 'proud'
    | 'celebrating'
    | 'encouraging'
    | 'loading'
    | 'listening'
    | 'confused'
    | 'sleepy'
    | 'surprised'

export const OWL_EMOTIONS: OwlEmotion[] = [
    'neutral',
    'happy',
    'proud',
    'celebrating',
    'encouraging',
    'loading',
    'listening',
    'confused',
    'sleepy',
    'surprised',
]

export type OwlRigOptions = {
    /** 1 = normal; the studio offered 0.5 to 1.5. */
    speed: number
    /** Skip all motion and jump straight to each pose. */
    reduced: boolean
    /** Breathing, blinking and small idle movement. */
    idle: boolean
    /** Move the beak as if speaking. */
    talking: boolean
    /** Portrait only: drop the small decorations (stars, z's) at tiny sizes. */
    small: boolean
}

export type OwlRig = {
    setEmotion: (name: OwlEmotion) => void
    setOptions: (next: Partial<OwlRigOptions>) => void
    /** Advance one frame; called by the shared ticker. */
    step: (now: number) => void
}

type Pose = {
    happy: number
    left: number
    right: number
    tilt: number
    gazeX: number
    gazeY: number
    open: number
    lidL: number
    lidR: number
    brow: number
    browL: number
    browR: number
    squat: number
    lift: number
    lean: number
    pupil: number
    spark: number
    question: number
    sleep: number
    surprise: number
    listen: number
    flap: number
    front: number
    proud: number
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

const PATHS = {
    down: 'M 398 653 C 335 669 244 750 218 828 C 199 876 223 885 247 853 C 221 905 240 955 270 957 C 289 958 300 934 304 914 C 300 960 329 995 350 982 C 377 963 374 931 378 908 C 407 841 428 746 398 653 Z',
    up: 'M 398 653 C 342 624 307 546 287 478 C 267 425 243 460 250 496 C 226 419 184 372 152 389 C 113 407 132 465 153 498 C 102 461 77 500 99 546 C 61 548 76 604 119 624 C 111 677 198 773 350 755 C 369 720 383 682 398 653 Z',
    listen: 'M 398 653 C 339 635 288 558 275 495 C 256 441 240 398 209 410 C 176 423 191 479 207 508 C 175 459 139 487 150 529 C 115 513 98 545 124 581 C 93 576 95 621 131 648 C 154 696 247 735 350 723 C 374 704 388 676 398 653 Z',
}
const FRONT_PATH =
    'M 874 891 C 807 877 776 796 811 766 C 829 748 850 761 862 779 C 833 725 862 695 891 719 C 912 738 928 767 934 788 C 923 740 957 739 979 773 C 997 805 997 849 981 877 C 973 912 947 938 928 913 C 912 934 888 922 874 891 Z'
const PROUD_PATH =
    'M 398 653 C 329 638 225 645 192 700 C 166 745 177 786 215 797 C 176 813 185 847 225 849 C 204 875 231 894 264 877 C 257 904 295 917 319 886 C 348 856 341 812 366 784 C 385 750 409 711 398 653 Z'
const SPREAD_PATH =
    'M 398 653 C 322 649 235 571 172 550 C 122 531 94 552 112 590 C 55 554 19 579 44 628 C 5 616 17 674 66 708 C 23 709 47 766 111 778 C 81 849 218 871 277 815 C 330 795 370 735 398 653 Z'
const SEATED_PATH =
    'M 398 653 C 315 675 243 771 228 864 C 213 908 215 959 245 968 C 250 1000 284 1014 307 983 C 317 1032 356 1034 373 995 C 412 1037 487 974 458 915 C 444 881 423 866 401 860 C 450 788 453 721 398 653 Z'
const CHEEK_PATH =
    'M 346 884 C 294 870 270 816 288 758 C 303 695 344 618 392 586 C 434 553 481 555 488 582 C 494 606 462 626 434 640 C 478 635 496 661 479 687 C 472 700 461 709 448 715 C 478 735 474 769 448 786 C 452 820 423 840 401 824 C 393 867 372 898 346 884 Z'

const NUMBER = /-?\d+(?:\.\d+)?/g
const numbers = (p: string): number[] => (p.match(NUMBER) ?? []).map(Number)
const wingA = numbers(PATHS.down)
const wingB = numbers(PATHS.up)
const wingC = numbers(PATHS.listen)
const wingP = numbers(PROUD_PATH)
const wingSpread = numbers(SPREAD_PATH)
const wingSeated = numbers(SEATED_PATH)
// Every wing shape has the same number of points, so a wing can be blended
// between any two of them by blending the numbers one by one.
function wingPath(a: number[], b: number[], t: number): string {
    let i = 0
    return PATHS.down.replace(NUMBER, () => {
        const k = i++
        return (a[k] + (b[k] - a[k]) * t).toFixed(2)
    })
}

const DEFAULTS: Pose = {
    happy: 0, left: 0, right: 0, tilt: 0, gazeX: 0, gazeY: 0, open: 0, lidL: 0, lidR: 0,
    brow: 0, browL: 0, browR: 0, squat: 0, lift: 0, lean: 0, pupil: 1, spark: 0, question: 0,
    sleep: 0, surprise: 0, listen: 0, flap: 0, front: 0, proud: 0,
}
const pose = (p: Partial<Pose>): Pose => ({ ...DEFAULTS, ...p })
const POSES: Record<OwlEmotion, Pose> = {
    neutral: pose({}),
    happy: pose({ happy: 1, left: 1, tilt: -3, open: 1 }),
    proud: pose({ left: 0.2, right: 0.2, lidL: 0.37, lidR: 0.37, brow: 1, browL: 12, browR: -12, lift: 9, spark: 1, proud: 1 }),
    celebrating: pose({ happy: 1, left: 1, right: 1, tilt: -6, open: 1, lift: 0, spark: 1, lean: -3 }),
    encouraging: pose({ left: 0.85, right: 0.3, tilt: 7, open: 0.65, brow: 1, browL: -8, browR: 8, front: 1 }),
    loading: pose({ left: 0.65, right: 0.65, lift: 42, flap: 1 }),
    listening: pose({ right: 1, tilt: 12, gazeX: 22, gazeY: -5, open: 0.2, brow: 1, listen: 1 }),
    confused: pose({ left: 0.2, right: 0.7, tilt: 12, gazeX: -10, gazeY: -8, open: 0.65, brow: 1, browL: -15, browR: 15, lidR: 0.3, question: 1, front: 0 }),
    sleepy: pose({ tilt: 8, lidL: 0.59, lidR: 0.64, brow: 1, browL: -5, browR: 5, squat: 0, sleep: 1, pupil: 1 }),
    surprised: pose({ left: 0.9, right: 0.9, tilt: -8, open: 1.5, gazeY: 6, pupil: 0.73, brow: 1, browL: -12, browR: 12, lift: 22, surprise: 1 }),
}
const KEYS = Object.keys(DEFAULTS) as (keyof Pose)[]

// Each entry sets the onset, duration and opening of one syllable.
const SYLLABLES: [number, number, number][] = [
    [0, 0.23, 0.78], [0.23, 0.16, 0.54], [0.41, 0.34, 1], [0.82, 0.22, 0.64],
    [1.39, 0.28, 0.88], [1.68, 0.16, 0.57], [1.86, 0.33, 1], [2.24, 0.23, 0.74],
]

/** Wires an owl's artwork (markup from owlMarkup.ts, already in the DOM under
 *  `root`) to the animation. Elements missing from `root` (the portrait parts,
 *  when only the full owl is drawn) are skipped. */
export function createOwlRig(root: Element, initial: OwlRigOptions, firstEmotion: OwlEmotion = 'neutral'): OwlRig {
    const opts: OwlRigOptions = { ...initial }
    const cache = new Map<string, Element | null>()
    const el = (id: string): Element | null => {
        if (!cache.has(id)) cache.set(id, root.querySelector(`[data-r="${id}"]`))
        return cache.get(id) ?? null
    }
    const attr = (id: string, k: string, v: string | number) => el(id)?.setAttribute(k, String(v))
    const read = (id: string, k: string) => el(id)?.getAttribute(k) ?? ''

    let state: OwlEmotion = firstEmotion
    let current: Pose = { ...POSES[firstEmotion] }
    let from: Pose = { ...current }
    let target: Pose = { ...current }
    let start = 0
    let duration = 680
    let transitioning = false
    let clock = 0
    let last = 0
    let gesture = 0
    let speechTime = 0
    let speechWeight = 0

    function setEmotion(name: OwlEmotion) {
        if (!POSES[name]) return
        state = name
        from = { ...current }
        target = { ...POSES[name] }
        start = performance.now()
        duration = (name === 'sleepy' ? 1100 : 680) / opts.speed
        transitioning = true
        gesture = 0
    }

    function speechOpening(rest: number, sleep: number, dt: number): number {
        const goal = opts.talking ? 1 : 0
        speechWeight += clamp(goal - speechWeight, -dt / 120, dt / 120)
        if (speechWeight === 0) {
            speechTime = 0
            return rest
        }
        if (opts.reduced) return opts.talking ? Math.max(rest, 0.45) : rest
        speechTime = (speechTime + dt * 0.001 * opts.speed * (1 - sleep * 0.25)) % 3.1
        let syllable = 0
        for (const [s, d, strength] of SYLLABLES) {
            const progress = (speechTime - s) / d
            if (progress >= 0 && progress < 1) {
                syllable = strength * Math.sin(Math.PI * progress)
                break
            }
        }
        const opening = 0.12 * rest + syllable * (1.27 - 0.36 * sleep)
        return rest + speechWeight * (opening - rest)
    }

    function step(now: number) {
        const dt = last ? Math.min(now - last, 50) : 0
        last = now
        const reduced = opts.reduced
        const idle = opts.idle && !reduced
        clock += (dt / 1000) * opts.speed
        gesture += (dt / 1000) * opts.speed

        if (transitioning) {
            const t = reduced ? 1 : clamp((now - start) / duration)
            const e = t * t * (3 - 2 * t)
            for (const k of KEYS) current[k] = from[k] + (target[k] - from[k]) * e
            if (t === 1) {
                current = { ...target }
                transitioning = false
            }
        }
        const c = current
        const breath = idle ? Math.sin(clock * (c.sleep ? 1.1 : 1.8)) : 0
        const entry = !reduced ? Math.sin(clamp(gesture / 1.2) * Math.PI) : 0
        const jump = entry * (state === 'celebrating' ? 65 : state === 'surprised' ? 30 : state === 'happy' ? 19 : 0)
        const hover = idle ? Math.sin(clock * 3) * 8 * c.flap : 0

        attr('character', 'transform', `translate(622 1135) rotate(${c.lean}) scale(1 ${1 - c.squat}) translate(-622 -1135) translate(0 ${-breath * (3 + 5 * c.sleep) - jump - c.lift - hover})`)
        const nod = idle ? Math.sin(clock * 2) * 1.8 * (state === 'encouraging' ? 1 : 0) : 0
        attr('head', 'transform', `translate(0 ${c.sleep * 125}) rotate(${c.tilt + breath * 0.2 + nod} 622 655)`)
        attr('bodyRig', 'transform', `translate(622 1035) scale(${1 + c.sleep * 0.08} ${1 - c.sleep * 0.22}) translate(-622 -1035)`)
        attr('earLeft', 'transform', `rotate(${-c.sleep * 39} 360 210)`)
        attr('earRight', 'transform', `rotate(${c.sleep * 39} 890 210)`)

        const l = numbers(wingPath(wingA, wingB, c.left))
        const r = numbers(wingPath(wingA, wingC, c.right))
        const wl = numbers(wingPath(l, wingP, c.proud))
        const wr = numbers(wingPath(r, wingP, c.proud))
        attr('leftWing', 'd', wingPath(wl, wingSpread, c.flap))
        attr('rightWing', 'd', wingPath(wr, wingSpread, Math.max(c.flap, c.question)))
        attr('leftWing', 'opacity', (1 - c.question) * (1 - c.sleep))
        attr('rightWing', 'opacity', 1 - c.sleep)
        attr('thinkingWing', 'd', CHEEK_PATH)
        attr('thinkingWing', 'opacity', c.question)
        attr('restWingL', 'd', wingPath(wingA, wingSeated, c.sleep))
        attr('restWingR', 'd', wingPath(wingA, wingSeated, c.sleep))
        attr('restWings', 'opacity', c.sleep)
        attr('restWings', 'transform', `translate(0 ${c.sleep * 18})`)
        attr('seatedFeet', 'opacity', c.sleep)
        attr('feetRig', 'opacity', 1 - c.sleep)
        attr('leftWing', 'transform', `rotate(${idle ? Math.sin(clock * (c.flap ? 10 : 5)) * (3 * c.left + 7 * c.flap) : 0} 398 653)`)
        attr('rightWing', 'transform', `translate(1245 0) scale(-1 1) rotate(${-c.tilt * 0.8 + (idle ? Math.sin(clock * 10) * 7 * c.flap : 0)} 398 653)`)
        attr('frontWing', 'd', FRONT_PATH)
        attr('frontWing', 'opacity', c.front)
        attr('frontWing', 'transform', `translate(${c.question * -400} ${c.question * -60}) rotate(${-c.question * 20} 900 800)`)
        attr('feetRig', 'transform', `translate(622 1070) rotate(${-c.lean}) scale(${1 + c.spark * 0.06} 1) translate(-622 -1070)`)

        // Blinks move opaque upper and lower eyelids over the complete eyes.
        const phase = clock % 4.8
        const blinking = idle && c.happy < 0.1 ? Math.max(0, 1 - Math.abs(phase - 4.5) / 0.16) : 0
        for (const [id, cx] of [['leftPupil', 471], ['rightPupil', 772]] as const) {
            attr(id, 'opacity', 1 - c.happy)
            attr(id, 'transform', `translate(${c.gazeX} ${c.gazeY}) translate(${cx} 414) scale(${c.pupil * (1 - c.happy * 0.3)} ${c.pupil * (1 - c.happy * 0.7)}) translate(${-cx} -414)`)
        }
        for (const [id, x, lid, angle] of [['lidL', 460, c.lidL, c.browL], ['lidR', 785, c.lidR, c.browR]] as const) {
            const resting = 270 + lid * 248
            const top = resting + (414 - resting) * blinking
            const bottom = 535 - (535 - 414) * blinking
            const slant = angle * (1 - blinking)
            const curve = 12 * (1 - blinking)
            attr(id, 'd', `M ${x - 140} 240 H ${x + 140} V ${top + slant} Q ${x} ${top + curve} ${x - 140} ${top - slant} Z M ${x - 140} 550 H ${x + 140} V ${bottom} Q ${x} ${bottom + curve} ${x - 140} ${bottom} Z`)
            attr(id, 'opacity', 1)
            attr(id, 'stroke', 'none')
            attr(id + 'Lash', 'd', `M ${x - 140} ${top - slant} Q ${x} ${top + curve} ${x + 140} ${top + slant}`)
            attr(id + 'Lash', 'opacity', clamp((lid + blinking) * 8))
        }
        attr('blink', 'opacity', 0)
        attr('smiles', 'opacity', c.happy)
        attr('brows', 'opacity', c.brow)
        attr('browL', 'd', `M407 ${264 - c.browL} Q448 ${251 - c.surprise * 26} 481 ${277 + c.browL}`)
        attr('browR', 'd', `M738 ${271 - c.browR} Q776 ${283 - c.surprise * 36} 811 ${271 + c.browR}`)
        attr('listenMarks', 'opacity', c.listen * 0.9)
        attr('sparkles', 'opacity', c.spark * (idle ? 0.8 + Math.sin(clock * 3) * 0.2 : 1))
        attr('question', 'opacity', c.question)
        attr('question', 'transform', `translate(60 ${-25 + (idle ? Math.sin(clock * 2) * 5 * c.question : 0)})`)
        attr('sleepMarks', 'opacity', c.sleep)
        attr('sleepMarks', 'transform', `translate(50 ${-20 + (idle ? -Math.sin(clock) * 12 * c.sleep : 0)})`)
        attr('surpriseMarks', 'opacity', c.surprise)

        const jawOpening = speechOpening(c.open, c.sleep, dt)
        const bottom = 565 + jawOpening * 52
        attr('lowerBeak', 'd', `M 569 497 C 575 ${bottom - 22} 599 ${bottom} 621 ${bottom} C 644 ${bottom} 670 ${bottom - 25} 675 497 Z`)
        const blend = clamp(jawOpening / 0.7)
        const mix = (a: number, b: number) => Math.round(a + (b - a) * blend)
        attr('lowerBeak', 'fill', `rgb(${mix(255, 145)},${mix(181, 29)},${mix(0, 34)})`)
        attr('tongue', 'opacity', clamp((jawOpening - 0.35) / 0.65))
        attr('tongue', 'transform', `translate(0 ${Math.max(0, jawOpening - 1) * 35})`)
        attr('shadow', 'rx', 255 - (jump + c.lift) * 0.8)

        // Portrait layers share one frame; the torso stays joined to the animated head.
        if (!el('portraitInside')) return
        const celebration = clamp(c.spark - c.proud)
        const encouragement = c.front
        const small = opts.small
        const portraitBob = reduced ? 0 : breath * (2 + c.sleep * 2) + entry * (9 * c.happy - 8 * c.surprise + 15 * celebration) + (idle ? Math.sin(clock * 3) * 7 * c.flap : 0)
        const portraitTransform = `translate(-91 ${-25 - portraitBob}) scale(.95)`
        for (const id of ['portraitInside', 'portraitOutside', 'portraitRestFrame']) attr(id, 'transform', portraitTransform)
        attr('portraitWingL', 'd', read('leftWing', 'd'))
        attr('portraitWingR', 'd', read('rightWing', 'd'))
        const wave = !reduced && gesture < 2.2 ? Math.sin(gesture * 10) * 8 * Math.sin((Math.PI * gesture) / 2.2) * c.happy * (1 - celebration) : 0
        const flap = idle ? Math.sin(clock * 8) * 7 * c.flap : 0
        attr('portraitWingL', 'transform', `rotate(${wave + flap} 398 653)`)
        attr('portraitWingR', 'transform', `translate(1245 0) scale(-1 1) rotate(${-c.tilt * 0.8 + flap} 398 653)`)
        const leftOut = Math.max(c.happy, c.surprise, c.proud, c.flap, encouragement) * (1 - c.question) * (1 - c.sleep)
        const rightOut = Math.max(celebration, c.surprise, c.proud, c.flap, c.listen, c.question) * (1 - c.sleep)
        attr('portraitWingL', 'opacity', leftOut)
        attr('portraitWingR', 'opacity', rightOut)
        for (const side of ['L', 'R']) {
            const outerId = 'portraitWing' + side
            attr('portraitInnerWing' + side, 'd', read(outerId, 'd'))
            attr('portraitInnerWing' + side, 'transform', read(outerId, 'transform'))
            const hidden = side === 'L' ? Math.max(c.sleep, c.question) : c.sleep
            attr('portraitInnerWing' + side, 'opacity', (1 - Number(read(outerId, 'opacity'))) * (1 - hidden))
        }
        const effectLife = reduced ? 1 : clamp((3.2 - gesture) / 0.7)
        const pop = reduced ? 1 : 1 + Math.sin(clamp(gesture / 0.5) * Math.PI) * 0.14
        attr('portraitExclamation', 'opacity', c.surprise * effectLife)
        attr('portraitExclamation', 'transform', `translate(985 165) scale(${pop}) translate(-985 -165)`)
        attr('portraitSpark', 'opacity', small ? 0 : Math.max(c.happy, c.spark) * effectLife)
        attr('portraitStars', 'opacity', small ? 0 : c.spark * effectLife)
        attr('portraitStars', 'transform', `translate(500 300) scale(${pop}) translate(-500 -300)`)
        attr('portraitQuestion', 'opacity', c.question)
        attr('portraitQuestion', 'transform', `translate(0 ${idle ? Math.sin(clock * 2) * 4 * c.question : 0})`)
        attr('portraitSleep', 'opacity', small ? 0 : c.sleep)
        attr('portraitSleep', 'transform', `translate(0 ${idle ? -Math.sin(clock) * 12 * c.sleep : 0})`)
        attr('portraitListen', 'opacity', small ? 0 : c.listen * effectLife)
        attr('portraitLoading', 'opacity', c.flap)
        attr('portraitLoading', 'transform', `rotate(${idle ? clock * 85 : 0} 500 500)`)
    }

    return {
        setEmotion,
        setOptions(next) {
            Object.assign(opts, next)
        },
        step,
    }
}

// One animation loop shared by every owl on the page, so ten owls cost one
// requestAnimationFrame, not ten. It sleeps when no owl is listening or the
// tab is hidden.
const subscribers = new Set<(now: number) => void>()
let frame = 0
function loop(now: number) {
    frame = 0
    if (subscribers.size === 0 || document.hidden) return
    for (const step of subscribers) step(now)
    frame = requestAnimationFrame(loop)
}
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !frame && subscribers.size > 0) frame = requestAnimationFrame(loop)
    })
}
export const owlTicker = {
    add(step: (now: number) => void) {
        subscribers.add(step)
        if (!frame && !document.hidden) frame = requestAnimationFrame(loop)
    },
    remove(step: (now: number) => void) {
        subscribers.delete(step)
    },
}
