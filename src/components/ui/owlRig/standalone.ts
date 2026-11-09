// File: src/components/ui/owlRig/standalone.ts
//
// Entry point for public/owl-rig.js, a self-contained copy of the owl for pages
// that live outside React, such as the word practice scene
// (public/remediation-practice.html, which runs in an iframe). It exposes
// window.BasaOwl.mountOwl(container, { variant, emotion }).
//
// Rebuild after changing the owl:  npm run build:owl
import { createOwlRig, owlTicker, type OwlEmotion } from './owlEngine'
import { owlFullMarkup, owlPortraitMarkup } from './owlMarkup'

let count = 0

export type MountedOwl = {
    setEmotion: (name: OwlEmotion) => void
    setTalking: (on: boolean) => void
    destroy: () => void
}

export function mountOwl(
    container: HTMLElement,
    options: { variant?: 'full' | 'icon'; emotion?: OwlEmotion } = {},
): MountedOwl {
    const variant = options.variant ?? 'full'
    const prefix = `bo${++count}-`
    const full = `<svg viewBox="0 0 1280 1320" width="100%" height="100%" style="overflow:visible;${variant === 'icon' ? 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none' : 'display:block'}" aria-hidden="true">${owlFullMarkup(prefix)}</svg>`
    const portrait = variant === 'icon'
        ? `<svg viewBox="-110 -120 1220 1240" width="100%" height="100%" style="display:block;overflow:visible" aria-hidden="true">${owlPortraitMarkup(prefix)}</svg>`
        : ''
    const root = document.createElement('span')
    root.style.cssText = 'display:block;position:relative;width:100%;height:100%'
    root.innerHTML = full + portrait
    container.append(root)

    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const rig = createOwlRig(
        root,
        { speed: 1, reduced: query.matches, idle: true, talking: false, small: false },
        options.emotion ?? 'neutral',
    )
    const onMotionChange = () => rig.setOptions({ reduced: query.matches })
    query.addEventListener('change', onMotionChange)
    rig.step(performance.now())
    owlTicker.add(rig.step)

    return {
        setEmotion: rig.setEmotion,
        setTalking: (on) => rig.setOptions({ talking: on }),
        destroy() {
            owlTicker.remove(rig.step)
            query.removeEventListener('change', onMotionChange)
            root.remove()
        },
    }
}

;(window as unknown as { BasaOwl: { mountOwl: typeof mountOwl } }).BasaOwl = { mountOwl }
