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
    /** Which way the owl faces. 'auto' (default) faces front, and turns to run when loading. */
    direction?: OwlDirection
}
export type OwlDirection = 'auto' | 'front' | 'front-right' | 'right' | 'back-right' | 'back' | 'back-left' | 'left' | 'front-left'

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
    loading: pose({ left: 0.15, right: 0.15, tilt: -3, lean: 5, gazeX: 10, lift: 0, flap: 1 }),
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

    // The turned views of the owl (front-right and the other directions) and the jog
    // used while loading, ported from the prototype's renderDirection().
     function renderDirection(c: Pose, reduced: boolean, idle: boolean, stride: number, runBounce: number, jawOpening: number, blinking: number) {
          const direction = (opts.direction ?? 'auto') === 'auto' ? (state === 'loading' ? 'front-right' : 'front') : opts.direction ?? 'auto';
          const active = direction !== 'front';
          const mirrored = direction.endsWith('left') || direction === 'left';
          const quarter = direction.startsWith('front-');
          const rearQuarter = direction.startsWith('back-');
          const rear = direction === 'back';
          const showFace = !rear && !rearQuarter;
          attr('character', 'opacity', active ? 0 : 1);
          attr('directionalCharacter', 'opacity', active ? 1 : 0);
          attr('directionalEffects', 'opacity', active ? 1 : 0);
          attr('directionalFacing', 'transform', mirrored ? 'translate(1240 0) scale(-1 1)' : 'translate(0 0)');
          const bob = runBounce + (idle ? Math.sin(clock * 1.8) * 3 : 0);
          attr('directionalMotion', 'transform', `translate(0 ${-bob + c.sleep * 65}) rotate(${c.flap * 7} 620 1040)`);
          attr('directionalBody', 'transform', `translate(620 1000) scale(${rear ? 1.12 : 1} ${1 - c.sleep * .12}) translate(-620 -1000)`);
          attr('directionalHead', 'transform', `rotate(${c.tilt * .6} 620 640)`);
          attr('directionalHeadOutline', 'd', rear
            ? 'M453 194 C516 155 573 150 622 174 C682 146 748 161 797 202 C865 258 894 359 878 459 C864 568 808 652 726 676 C654 699 557 694 482 660 C392 618 354 524 362 418 C368 310 396 236 453 194 Z'
            : 'M504 178 C567 136 663 132 748 177 C852 230 891 336 881 451 C874 561 829 646 751 671 C666 705 554 690 468 643 C363 586 344 470 371 358 C391 274 439 220 504 178 Z');
          attr('directionalNearEar', 'd', rear
            ? 'M466 233 Q415 214 412 182 L437 186 Q398 132 416 91 Q428 72 450 86 Q511 117 541 175 L556 224 Z'
            : 'M466 233 Q424 208 428 177 Q447 175 467 186 Q409 133 445 74 Q459 56 487 76 Q555 118 573 178 Q609 143 635 153 Q662 171 641 202 Q601 239 559 243 Z');
          attr('directionalFarEar', 'd', rear
            ? 'M774 233 Q825 214 828 182 L803 186 Q842 132 824 91 Q812 72 790 86 Q729 117 699 175 L684 224 Z'
            : 'M649 192 Q661 82 722 95 Q771 133 746 213 Z');
          attr('directionalEarShade', 'opacity', rear ? 0 : 1);
          attr('directionalTail', 'transform', rear ? 'translate(180 85)' : 'translate(0 0)');

          attr('directionalBelly', 'opacity', rear || rearQuarter ? 0 : 1);
          attr('directionalBelly', 'transform', quarter ? 'translate(-210 0) translate(745 834) scale(1.8 1) translate(-745 -834)' : 'translate(0 0)');
          attr('directionalMask', 'd', quarter
            ? 'M705 300 C662 232 587 219 536 260 C475 306 474 437 508 505 C542 575 630 597 703 565 C762 591 831 566 858 513 C885 459 880 333 848 282 C811 227 748 239 705 300 Z'
            : 'M791 229 C731 222 681 291 676 387 C670 472 697 562 750 579 C803 600 851 551 866 478 C887 387 862 261 817 238 Z');
          attr('directionalMask', 'opacity', showFace ? 1 : 0);
          attr('directionalEye', 'opacity', showFace ? 1 : 0);
          attr('directionalEye', 'transform', quarter ? 'translate(-156 0) translate(779 382) scale(1.18 1) translate(-779 -382)' : 'translate(0 0)');
          attr('directionalFarEye', 'opacity', quarter ? 1 : 0);
          attr('directionalCheek', 'opacity', showFace ? 1 : 0);
          attr('directionalCheek', 'transform', quarter ? 'translate(-175 0)' : 'translate(0 0)');
          attr('directionalBeak', 'opacity', rear ? 0 : 1);
          attr('directionalBeak', 'transform', quarter ? 'translate(-145 0)' : 'translate(0 0)');
          const eyelid = Math.max(c.lidL, c.lidR);
          const top = 265 + eyelid * 220;
          const lid = top + (410 - top) * blinking;
          const bottom = 505 - 95 * blinking;
          attr('directionalLid', 'd', `M700 260 H860 V${lid} Q780 ${lid + 10} 700 ${lid - 6} Z M700 520 H860 V${bottom} H700 Z`);
          attr('directionalLash', 'd', `M700 ${lid - 6} Q780 ${lid + 10} 860 ${lid}`);
          attr('directionalLash', 'opacity', Math.min(1, (eyelid + blinking) * 8));
          attr('directionalFarLid', 'd', `M770 280 H885 V${lid} H770 Z M770 490 H885 V${bottom} H770 Z`);
          attr('directionalPupil', 'opacity', 1 - c.happy);
          attr('directionalFarPupil', 'opacity', 1 - c.happy);
          attr('directionalSmile', 'd', 'M727 399 Q780 325 831 399');
          attr('directionalFarSmile', 'd', 'M792 393 Q827 335 860 393');
          attr('directionalSmile', 'opacity', c.happy);
          attr('directionalFarSmile', 'opacity', c.happy);
          attr('directionalBrow', 'd', `M736 ${259 - c.surprise * 20} Q779 ${242 - c.question * 14} 811 260`);
          attr('directionalBrow', 'opacity', c.brow);
          attr('directionalJaw', 'd', `M868 472 L925 480 Q906 ${508 + jawOpening * 49} 874 ${506 + jawOpening * 34} Z`);
          const wingSwing = stride * 26;
          const wingLift = c.happy * -70 + c.spark * (1 - c.proud) * -50 - c.listen * 80 + c.question * -48;
          attr('directionalNearWing', 'transform', `rotate(${wingSwing + wingLift} 570 685)`);
          attr('directionalFarWing', 'opacity', quarter || rear || rearQuarter ? 1 : .35);
          attr('directionalFarWing', 'transform', `rotate(${-wingSwing - wingLift * .5} 738 680)`);
          attr('directionalNearFoot', 'transform', `translate(${stride * 39} ${-Math.max(0, stride) * 55}) rotate(${-stride * 24} 650 1050)`);
          attr('directionalFarFoot', 'transform', `translate(${-stride * 39} ${-Math.max(0, -stride) * 55}) rotate(${stride * 24} 605 1050)`);
          if (el('portraitInside')) {
            for (const id of ['portraitInside', 'portraitOutside', 'portraitRestFrame']) attr(id, 'opacity', active ? 0 : 1);
            attr('directionalPortraitBody', 'opacity', active ? 1 : 0);
            attr('directionalPortraitUpper', 'opacity', active ? 1 : 0);
            const frame = `translate(-91 ${-25 - bob + c.sleep * 30}) scale(.95)`;
            attr('directionalPortraitBody', 'transform', frame);
            attr('directionalPortraitUpper', 'transform', frame);
            for (const id of ['directionalPortraitBodyFacing', 'directionalPortraitUpperFacing']) attr(id, 'transform', mirrored ? 'translate(1240 0) scale(-1 1)' : 'translate(0 0)');
          }
          // Dedicated artwork traced against the front-right panel of the turnaround.
          const referenceView = quarter;
          attr('referenceQuarter', 'opacity', referenceView ? 1 : 0);
          if (referenceView) attr('directionalCharacter', 'opacity', 0);
          attr('quarterFacing', 'transform', mirrored ? 'translate(1240 0) scale(-1 1)' : 'translate(0 0)');
          const referenceBounce = reduced ? 0 : runBounce * .65;
          attr('quarterMotion', 'transform', `translate(0 ${105*c.flap-referenceBounce})`);
          attr('quarterFeet', 'transform', `translate(0 ${referenceBounce/2.65})`);
          attr('quarterHead', 'transform', `rotate(${c.tilt*.35} 155 235)`);
          attr('quarterFarEye', 'transform', 'translate(-6 3) translate(246 141) scale(1.12 1.02) translate(-246 -141)');
          attr('quarterNearEye', 'transform', 'translate(151 146) scale(.96 .97) translate(-151 -146)');
          attr('quarterNearWing', 'transform', `rotate(${stride*9-c.happy*65-c.listen*60-c.question*42} 113 233)`);
          attr('quarterFarWing', 'transform', `rotate(${-stride*9+c.happy*35} 235 234)`);
          attr('quarterFootNear', 'transform', `translate(${stride*9} ${-Math.max(0,stride)*15}) rotate(${-Math.max(0,stride)*16} 122 369)`);
          attr('quarterFootFar', 'transform', `translate(${-stride*9} ${-Math.max(0,-stride)*15}) rotate(${-Math.max(0,-stride)*16} 192 369)`);
          for (const [prefix, cx, cy, rx, ry] of [['Near', 151, 146, 46, 53], ['Far', 246, 141, 20, 40]] as const) {
            const restTop=cy-ry+Math.max(c.lidL,c.lidR)*ry*2;
            const lidY=restTop+(cy+ry*.18-restTop)*blinking;
            const bottom=cy+ry-(ry*.82)*blinking;
            attr('quarter'+prefix+'Lid','d',`M${cx-rx-2} ${cy-ry-3} H${cx+rx+2} V${lidY} Q${cx} ${lidY+4} ${cx-rx-2} ${lidY}Z M${cx-rx-2} ${cy+ry+3} H${cx+rx+2} V${bottom} H${cx-rx-2}Z`);
            attr('quarter'+prefix+'Lash','d',`M${cx-rx-2} ${lidY} Q${cx} ${lidY+4} ${cx+rx+2} ${lidY}`);
            attr('quarter'+prefix+'Lash','opacity',Math.min(1,(Math.max(c.lidL,c.lidR)+blinking)*8));
            attr('quarter'+prefix+'Pupil','opacity',1-c.happy);
            attr('quarter'+prefix+'Smile','d',`M${cx-rx*.7} ${cy+8} Q${cx} ${cy-ry*.65} ${cx+rx*.7} ${cy+8}`);
            attr('quarter'+prefix+'Smile','opacity',c.happy);
          }
          attr('quarterBrows','opacity',c.brow);
          attr('quarterJaw','d',`M194 178 Q213 ${211+jawOpening*17} 234 180 Z`);
          attr('quarterJaw','fill',jawOpening>.3?'#951e24':'url(#gold)');
          if (el('portraitInside')) {
            if(referenceView){attr('directionalPortraitBody','opacity',0);attr('directionalPortraitUpper','opacity',0);}
            for(const id of ['quarterPortraitBody','quarterPortraitUpper'])attr(id,'opacity',referenceView?1:0);
            const portraitFrame=`translate(-146 ${48-referenceBounce}) scale(1.04)`;
            for(const id of ['quarterPortraitBody','quarterPortraitUpper'])attr(id,'transform',portraitFrame);
            for(const id of ['quarterPortraitBodyFacing','quarterPortraitUpperFacing'])attr(id,'transform',mirrored?'translate(1240 0) scale(-1 1)':'translate(0 0)');
          }

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
        // The loading weight also controls the turn, so it blends with every emotion.
        const turn = 0
        attr('turnedFace', 'transform', `translate(${82 * turn} 0) translate(622 430) scale(${1 - 0.12 * turn} 1) translate(-622 -430)`)
        const farEyeTurn = `translate(785 399) scale(${1 - 0.22 * turn} ${1 - 0.07 * turn}) translate(-785 -399)`
        for (const id of ['farEyeWhite', 'farEyePupil', 'farEyeLid']) attr(id, 'transform', farEyeTurn)
        attr('turnedBeak', 'transform', `translate(${30 * turn} 0) translate(621 500) scale(${1 - 0.08 * turn} 1) translate(-621 -500)`)
        attr('turnedBelly', 'transform', `translate(${48 * turn} 0) translate(622 830) scale(${1 - 0.18 * turn} 1) translate(-622 -830)`)
        // Loading: a jog. Opposite feet and wings swing together, the body bobs twice a stride.
        const runPhase = clock * 9
        const stride = reduced ? 0 : Math.sin(runPhase) * c.flap
        const runBounce = reduced ? 0 : (1 - Math.cos(runPhase * 2)) * 7 * c.flap
        const jump = entry * (state === 'celebrating' ? 65 : state === 'surprised' ? 30 : state === 'happy' ? 19 : 0)
        const hover = runBounce

        attr('character', 'transform', `translate(622 1135) rotate(${c.lean}) scale(1 ${1 - c.squat}) translate(-622 -1135) translate(0 ${-breath * (3 + 5 * c.sleep) - jump - c.lift - hover})`)
        const nod = idle ? Math.sin(clock * 2) * 1.8 * (state === 'encouraging' ? 1 : 0) : 0
        attr('head', 'transform', `translate(0 ${c.sleep * 125}) rotate(${c.tilt + breath * 0.2 + nod} 622 655) translate(622 430) scale(${1 - 0.06 * turn} 1) translate(-622 -430)`)
        attr('bodyRig', 'transform', `translate(622 1035) scale(${1 + c.sleep * 0.08 - 0.08 * turn} ${1 - c.sleep * 0.22}) translate(-622 -1035)`)
        attr('earLeft', 'transform', `rotate(${-c.sleep * 39} 360 210)`)
        attr('earRight', 'transform', `rotate(${c.sleep * 39} 890 210) translate(890 210) scale(${1 - 0.18 * turn} ${1 - 0.08 * turn}) translate(-890 -210)`)

        const l = numbers(wingPath(wingA, wingB, c.left))
        const r = numbers(wingPath(wingA, wingC, c.right))
        const wl = numbers(wingPath(l, wingP, c.proud))
        const wr = numbers(wingPath(r, wingP, c.proud))
        attr('leftWing', 'd', wingPath(wl, wingP, c.flap))
        attr('rightWing', 'd', wingPath(numbers(wingPath(wr, wingP, c.flap)), wingSpread, c.question))
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
        attr('leftWing', 'transform', `rotate(${(idle ? Math.sin(clock * 5) * 3 * c.left * (1 - c.flap) : 0) + stride * 19} 398 653)`)
        attr('rightWing', 'transform', `translate(847 653) scale(${1 - 0.25 * turn} ${1 - 0.12 * turn}) translate(-847 -653) translate(1245 0) scale(-1 1) rotate(${-c.tilt * 0.8 - stride * 19} 398 653)`)
        attr('frontWing', 'd', FRONT_PATH)
        attr('frontWing', 'opacity', c.front)
        attr('frontWing', 'transform', `translate(${c.question * -400} ${c.question * -60}) rotate(${-c.question * 20} 900 800)`)
        attr('feetRig', 'transform', `translate(622 1070) rotate(${-c.lean}) scale(${1 + c.spark * 0.06} 1) translate(-622 -1070)`)
        // Opposite foot phases give a planted step followed by a lifted recovery.
        attr('runningFootL', 'transform', `translate(${stride * 20} ${-Math.max(0, stride) * 48}) rotate(${-stride * 18 + 8 * turn} 490 1040)`)
        attr('runningFootR', 'transform', `translate(${-stride * 20} ${-Math.max(0, -stride) * 48}) rotate(${stride * 18 + 10 * turn} 760 1040) translate(760 1040) scale(${1 - 0.18 * turn} ${1 - 0.08 * turn}) translate(-760 -1040)`)
        attr('runMotion', 'opacity', reduced ? 0 : c.flap * 0.65)
        attr('runMotion', 'transform', `translate(${-12 * (1 + Math.sin(runPhase))} 0)`)

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
        if (el('portraitInside')) {
        const celebration = clamp(c.spark - c.proud)
        const encouragement = c.front
        const small = opts.small
        const portraitBob = reduced ? 0 : breath * (2 + c.sleep * 2) + entry * (9 * c.happy - 8 * c.surprise + 15 * celebration) + runBounce
        const portraitTransform = `translate(-91 ${-25 - portraitBob}) scale(.95) rotate(${c.lean} 622 650)`
        for (const id of ['portraitInside', 'portraitOutside', 'portraitRestFrame']) attr(id, 'transform', portraitTransform)
        attr('portraitWingL', 'd', read('leftWing', 'd'))
        attr('portraitWingR', 'd', read('rightWing', 'd'))
        const wave = !reduced && gesture < 2.2 ? Math.sin(gesture * 10) * 8 * Math.sin((Math.PI * gesture) / 2.2) * c.happy * (1 - celebration) : 0
        const flap = stride * 19
        attr('portraitWingL', 'transform', `rotate(${wave + flap} 398 653)`)
        attr('portraitWingR', 'transform', `translate(847 653) scale(${1 - 0.25 * turn} ${1 - 0.12 * turn}) translate(-847 -653) translate(1245 0) scale(-1 1) rotate(${-c.tilt * 0.8 - flap} 398 653)`)
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
        attr('portraitLoading', 'transform', `rotate(${reduced ? 0 : clock * 85} 500 500)`)
        }
        renderDirection(c, reduced, idle, stride, runBounce, jawOpening, blinking)
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
