// File: src/pages/proficiency/pre_assessment/assessment_session/features/useFillViewport.ts
// Gives an element exactly the height left between its own top edge and the
// bottom of the window, on large screens (lg and up). The passage step must fit
// on one screen with no page scroll, and the old fixed allowance
// (lg:h-[calc(100vh-14rem)]) was a guess at how tall the header, banner and
// padding above it are. That guess broke when the root font size changed, because
// those parts are sized in rem. Measuring the real position cannot drift.
// Writes the height straight to the element (no state), and re-measures when the
// window or the page above it changes size.
import { useEffect, useRef } from 'react'

const LG_QUERY = '(min-width: 1024px)'
// The page already pads below the columns (the wrapper's pb-6 and the main area's p-4);
// 40px of gap total keeps the whole page within one screen with no scrollbar.
const MIN_HEIGHT_PX = 420

export function useFillViewport<T extends HTMLElement>(active: boolean, bottomGapPx = 40) {
    const ref = useRef<T>(null)
    useEffect(() => {
        const el = ref.current
        if (!el || !active) return
        const query = window.matchMedia(LG_QUERY)
        const apply = () => {
            if (!query.matches) {
                el.style.height = ''
                return
            }
            const top = el.getBoundingClientRect().top + window.scrollY
            const next = `${Math.max(MIN_HEIGHT_PX, Math.round(window.innerHeight - top - bottomGapPx))}px`
            if (el.style.height !== next) el.style.height = next
        }
        apply()
        window.addEventListener('resize', apply)
        query.addEventListener('change', apply)
        const observer = new ResizeObserver(apply)
        observer.observe(document.body)
        return () => {
            window.removeEventListener('resize', apply)
            query.removeEventListener('change', apply)
            observer.disconnect()
            el.style.height = ''
        }
    }, [active, bottomGapPx])
    return ref
}
