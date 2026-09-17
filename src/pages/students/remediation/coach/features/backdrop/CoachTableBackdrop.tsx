// File: src/pages/students/remediation/coach/features/backdrop/CoachTableBackdrop.tsx
//
// Fixed fullscreen backdrop for Reading Coach Mode: a top-down wood study
// table with one open storybook page on the right half, plus the exact
// page-turn animation from the "book tabletop" HTML/CSS/JS prototype you
// supplied, ported to React/TypeScript and generalized from "10 fixed
// story pages" to "whichever sentence is currently active."
//
// This is the 4th of 4 files this component was split into, so fixes to
// the state machine / rendering wiring never require re-pasting the huge
// art SVGs or the pure-math geometry:
//   - ./coachPageGeometry.ts   -- page-bend math (SLICE_BASES, poseAt, smoothstep)
//   - ./coachStoryLayout.ts    -- word-wrap + <text> rendering (renderSentence)
//   - ./CoachTableBackdropArt.tsx -- the day/night wood-table + book SVG art
//   - ./CoachTableBackdrop.tsx (this file) -- refs, state machine, JSX, CSS
//
// SCOPE: per your original design, this component owns ONLY the table +
// book + page-turn animation + Previous/Next/Microphone buttons. The owl
// and the speech bubble are NOT here -- RemediationCoach.tsx renders
// those itself (using the real OwlMascot.tsx component, not prototype
// SVG art) as an absolutely-positioned overlay on top of this backdrop,
// passed in via `children`.
//
// FIX IN THIS FILE: the night-theme `--coach-story-ink` was `#d7d5ff`,
// almost identical to the night paper gradient, so the sentence text was
// nearly invisible ("the" fragment bug). Changed to a dark ink color
// (`#2a2154`) to match how the prototype itself does it (its own night
// `--story-ink` is `#39355f`, dark) -- restores real contrast in night mode.
//
// MICROPHONE: the prototype's own mic circle (matching its exact look --
// same gradients/pulse ring/beam) is drawn in here now, at the same
// translate(1228 674)-neighboring spot between Previous and Next. It's
// deliberately INERT right now (aria-disabled, no onClick/tabIndex,
// aria-pressed hardcoded "false") -- per the "take it slow" rebuild,
// recording isn't wired up yet. When it is, aria-disabled/aria-pressed/
// onClick should become props here, the same pattern previousDisabled/
// nextDisabled/onPrevious already use.
//
// WORD NOTEBOOK: the story words rendered by coachStoryLayout.ts's
// renderSentence() already come out as `<tspan class="coach-word"
// data-word="...">` per word -- that class/attribute already existed for
// verdict coloring, so making words tappable for the notebook didn't need
// any change there. This file adds one delegated click listener on
// #coach-stationary-story (added once, not per-word/per-render, since
// renderSentence tears down and rebuilds every word node on every
// turnTo/setCurrentContent call) that reads `data-word` off whatever
// `.coach-word` was clicked and calls the new `onWordSelect` prop --
// RemediationCoach.tsx owns what happens with that (opening its notebook
// panel). `selectedWord` is a second new prop purely for the matching
// visual feedback -- underlines/colors whichever currently-rendered word
// equals it, mirroring the prototype's `.passage-word.is-selected`
// (teal ink by day, violet by night). Only the word DOM, not app data --
// deliberately not porting the prototype's real dictionary/notebook
// content wiring (populateWordNotebook()) in this pass; see
// RemediationCoach.tsx's own header comment for that scope decision.
//
// NOTEBOOK ART (corrected): an earlier pass had RemediationCoach.tsx
// build its own brand-new hand-designed DOM notebook card instead of
// reusing the prototype's actual blank spiral-notebook SVG art. Fixed:
// that art is now ported into CoachTableBackdropArt.tsx as NOTEBOOK_ART
// (same mechanical-port pattern as DAY_LAYER/NIGHT_LAYER) and rendered
// right here, inside this component's own interactive SVG -- it's the
// real notebook surface now, not an invented one. `notebookOpen` (new
// prop) toggles `data-open` on the wrapping `.coach-notebook-transition`
// group, which slides it on/off-canvas via CSS transform + opacity --
// the same translate-based technique the prototype itself uses to flip
// its `#owl-transition`/`#notebook-transition` groups (per your call
// that this session's DOM/CSS crossfades should use that same
// technique). RemediationCoach.tsx no longer renders any notebook
// "card" of its own -- only a thin, undecorated HTML overlay for the
// word text + pronounce + close button, positioned over this SVG
// notebook's blank page.
import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react'
import { useTheme } from '../../../../../../contexts/ThemeContext'
import { DAY_LAYER, NIGHT_LAYER, NOTEBOOK_ART } from './CoachTableBackdropArt'
import {
    SLICE_BASES,
    STRIP_X0,
    STRIP_STEP,
    poseAt,
    smoothstep,
} from './coachPageGeometry'
import {
    renderSentence,
    type CoachSentenceContent,
    type CoachWordVerdict,
} from './coachStoryLayout'

export type { CoachSentenceContent, CoachWordVerdict }

const SVG_NS = 'http://www.w3.org/2000/svg'

export type CoachTableBackdropHandle = {
    /** Animates the page-turn from whatever is currently displayed to
     * `content`, then resolves once the turn has fully settled. Mirrors
     * the prototype's turnPage(direction) -- direction only controls
     * which way the sheet travels/curls, not "how many pages," since
     * there's no fixed page array here. */
    turnTo: (content: CoachSentenceContent, direction: 'next' | 'previous') => Promise<void>
    /** True while a turn animation is in flight -- mirrors the
     * prototype's `busy` guard so callers can avoid double-triggering. */
    isBusy: () => boolean
    /** Repaints the sentence CURRENTLY on the page in place -- no turn
     * animation, no busy-guard interaction, no change of which page is
     * "current." This is what the caller uses for live word-by-word
     * verdict coloring once a scoring result comes back for the word
     * already displayed (and to clear that coloring back to plain on
     * "Try Again") -- turnTo is only for moving to a genuinely NEW
     * word/sentence. */
    setCurrentContent: (content: CoachSentenceContent) => void
}

export type CoachTableBackdropProps = {
    /** The sentence shown on first mount, painted with no animation --
     * matches the prototype's initial renderStory(stationaryStory, ...)
     * on page load (no turn happens for the very first page). */
    initialContent: CoachSentenceContent
    previousDisabled: boolean
    nextDisabled: boolean
    previousLabel: string
    nextLabel: string
    onPrevious: () => void
    onNext: () => void
    /** Called with a word's own text whenever the reader taps it in the
     * story (see this file's header comment, "WORD NOTEBOOK"). Optional
     * -- word taps are simply inert if omitted. */
    onWordSelect?: (word: string) => void
    /** The word to visually mark as selected (underline + accent ink),
     * if any currently-rendered word matches it. Purely cosmetic --
     * doesn't gate onWordSelect or change what's paintable. */
    selectedWord?: string | null
    /** Slides the real NOTEBOOK_ART SVG group on-canvas (and slides it
     * back off when false) -- see this file's header comment ("NOTEBOOK
     * ART"). Defaults to false (owl mode / notebook off-canvas). */
    notebookOpen?: boolean
    className?: string
    /** Owl / speech bubble -- positioned by the caller as an
     * absolutely-positioned overlay on top of this backdrop's 1670x941
     * scene. */
    children?: React.ReactNode
}

export const CoachTableBackdrop = forwardRef<CoachTableBackdropHandle, CoachTableBackdropProps>(
    function CoachTableBackdrop(
        {
            initialContent,
            previousDisabled,
            nextDisabled,
            previousLabel,
            nextLabel,
            onPrevious,
            onNext,
            onWordSelect,
            selectedWord = null,
            notebookOpen = false,
            className = '',
            children,
        },
        ref,
    ) {
        const { theme } = useTheme()
        const isNight = theme === 'dark'

        const interactionLayerRef = useRef<SVGSVGElement>(null)
        const stationaryStoryRef = useRef<SVGGElement>(null)
        const turningSheetRef = useRef<SVGGElement>(null)
        const movingStoryRef = useRef<SVGGElement>(null)
        const outgoingSourceRef = useRef<SVGGElement>(null)
        const turnGeometryRef = useRef<SVGPathElement>(null)
        const sheetFaceRef = useRef<SVGUseElement>(null)
        const movingShadowRef = useRef<SVGUseElement>(null)
        const sheetRestLightRef = useRef<SVGUseElement>(null)
        const sheetLightRef = useRef<SVGUseElement>(null)
        const shadowGradientRef = useRef<SVGLinearGradientElement>(null)
        const turnPaperGradientRef = useRef<SVGLinearGradientElement>(null)
        const foldLightGradientRef = useRef<SVGLinearGradientElement>(null)
        const previousBtnRef = useRef<SVGGElement>(null)
        const nextBtnRef = useRef<SVGGElement>(null)

        // Mutable engine state that must never trigger a re-render mid-turn
        // (900ms of rAF frames -- re-rendering React on every frame was
        // never how the prototype worked either; it wrote straight to the
        // DOM). Matches turnPage()'s module-scope `busy`/`slicePool`.
        const busyRef = useRef(false)
        const currentContentRef = useRef<CoachSentenceContent>(initialContent)
        const storyStripPoolRef = useRef<{ carrier: SVGGElement; clip: SVGClipPathElement }[] | null>(null)
        const storyDefsRef = useRef<SVGDefsElement | null>(null)
        // Latest onWordSelect, read by the delegated click listener below
        // -- kept in a ref (rather than an effect dependency) so that
        // listener never has to be torn down/rebound just because the
        // caller passed a new closure identity on some unrelated render.
        const onWordSelectRef = useRef(onWordSelect)
        useEffect(() => {
            onWordSelectRef.current = onWordSelect
        }, [onWordSelect])

        // Paint every attribute a given pose implies -- the React
        // equivalent of the prototype's paint(t) applying pose.updates.
        const paint = useCallback((t: number) => {
            const pose = poseAt(t)
            if (turnGeometryRef.current) turnGeometryRef.current.setAttribute('d', pose.d)
            if (shadowGradientRef.current) {
                shadowGradientRef.current.setAttribute('x1', String(pose.shadowX1))
                shadowGradientRef.current.setAttribute('x2', String(pose.shadowX2))
            }
            if (turnPaperGradientRef.current) {
                turnPaperGradientRef.current.setAttribute('x2', String(pose.paperX2))
            }
            if (foldLightGradientRef.current) {
                foldLightGradientRef.current.setAttribute('x1', String(pose.foldX1))
                foldLightGradientRef.current.setAttribute('x2', String(pose.foldX2))
            }
            if (sheetLightRef.current) sheetLightRef.current.setAttribute('opacity', String(pose.sheetLightOpacity))
            if (sheetRestLightRef.current) sheetRestLightRef.current.setAttribute('opacity', String(pose.restLightOpacity))
            const pool = storyStripPoolRef.current
            if (pool) {
                pose.strips.forEach((strip, i) => {
                    const carrier = pool[i]?.carrier
                    if (!carrier) return
                    carrier.setAttribute('transform', strip.matrix)
                    carrier.setAttribute('opacity', strip.opacity)
                })
            }
        }, [])

        // prepareMovingStory(entry) -- lazily builds (or reuses pooled)
        // the 16 clip-strip carriers, each showing a slice of the hidden
        // #coach-outgoing-story-source through its own vertical clip rect.
        // Exact constants: step=(1520-936)/16, rect y=120 height=445,
        // width = step + .04 (tiny overlap fudge against hairline seams).
        const prepareMovingStory = useCallback((entry: CoachSentenceContent) => {
            const outgoing = outgoingSourceRef.current
            const interactionLayer = interactionLayerRef.current
            const movingStory = movingStoryRef.current
            const storyDefs = storyDefsRef.current
            if (!outgoing || !interactionLayer || !movingStory || !storyDefs) return
            renderSentence(outgoing, interactionLayer, entry)

            const pool = storyStripPoolRef.current
            if (pool) {
                for (const { clip, carrier } of pool) {
                    storyDefs.appendChild(clip)
                    movingStory.appendChild(carrier)
                }
                return
            }

            const newPool: { carrier: SVGGElement; clip: SVGClipPathElement }[] = []
            SLICE_BASES.forEach((_, index) => {
                const x = STRIP_X0 + index * STRIP_STEP
                const clip = document.createElementNS(SVG_NS, 'clipPath') as SVGClipPathElement
                clip.setAttribute('id', `coach-story-strip-${index}`)
                clip.setAttribute('clipPathUnits', 'userSpaceOnUse')
                clip.setAttribute('data-coach-temp-strip', '')
                const rect = document.createElementNS(SVG_NS, 'rect')
                rect.setAttribute('x', String(x))
                rect.setAttribute('y', '120')
                rect.setAttribute('width', String(STRIP_STEP + 0.04))
                rect.setAttribute('height', '445')
                clip.appendChild(rect)
                storyDefs.appendChild(clip)

                const carrier = document.createElementNS(SVG_NS, 'g') as SVGGElement
                const cut = document.createElementNS(SVG_NS, 'g')
                cut.setAttribute('clip-path', `url(#coach-story-strip-${index})`)
                const use = document.createElementNS(SVG_NS, 'use')
                use.setAttribute('href', '#coach-outgoing-story-source')
                cut.appendChild(use)
                carrier.appendChild(cut)
                movingStory.appendChild(carrier)

                newPool.push({ carrier, clip })
            })
            storyStripPoolRef.current = newPool
        }, [])

        // clearMovingStory() -- detaches (but never destroys) the pooled
        // strip carriers/clips for reuse next turn, exactly like the
        // prototype keeping slicePool's DOM node references alive.
        const clearMovingStory = useCallback(() => {
            movingStoryRef.current?.replaceChildren()
            outgoingSourceRef.current?.replaceChildren()
            storyDefsRef.current?.querySelectorAll('[data-coach-temp-strip]').forEach((n) => n.remove())
        }, [])

        const fadeControls = useCallback((toOpacity: number) => {
            return new Promise<void>((resolve) => {
                const prevBtn = previousBtnRef.current
                const nextBtn = nextBtnRef.current
                if (prevBtn) prevBtn.style.transition = 'opacity 120ms ease'
                if (nextBtn) nextBtn.style.transition = 'opacity 120ms ease'
                if (prevBtn) prevBtn.style.opacity = String(toOpacity)
                if (nextBtn) nextBtn.style.opacity = String(toOpacity)
                window.setTimeout(resolve, 120)
            })
        }, [])

        const animateTurn = useCallback((fromT: number, toT: number) => {
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            if (reduceMotion) {
                paint(toT)
                return Promise.resolve()
            }
            return new Promise<void>((resolve) => {
                const duration = 900
                let start: number | null = null
                const frame = (now: number) => {
                    if (start === null) start = now
                    const progress = Math.min(1, (now - start) / duration)
                    const eased = smoothstep(progress)
                    paint(fromT + (toT - fromT) * eased)
                    if (progress < 1) {
                        requestAnimationFrame(frame)
                    } else {
                        resolve()
                    }
                }
                requestAnimationFrame(frame)
            })
        }, [paint])

        // turnPage(direction) -- the state machine, adapted so "content"
        // is passed in directly rather than looked up from a fixed page
        // array. Order of operations matches the prototype's turnPage()
        // exactly: busy guard -> fade controls out -> prepare the
        // traveling sheet with whichever content it should carry -> jump
        // to the starting pose -> (for "previous" only) render the
        // revealed page underneath first -> animate -> commit -> clear ->
        // fade controls back in.
        const turnTo = useCallback(
            async (content: CoachSentenceContent, direction: 'next' | 'previous') => {
                if (busyRef.current) return
                const interactionLayer = interactionLayerRef.current
                const stationaryStory = stationaryStoryRef.current
                const turningSheet = turningSheetRef.current
                if (!interactionLayer || !stationaryStory || !turningSheet) return

                busyRef.current = true
                await fadeControls(0)

                prepareMovingStory(direction === 'next' ? content : currentContentRef.current)
                if (turnPaperGradientRef.current) turnPaperGradientRef.current.setAttribute('x1', '1594')
                if (sheetRestLightRef.current) {
                    sheetRestLightRef.current.setAttribute('fill', isNight ? 'url(#coach-night-pageLight)' : 'url(#coach-day-pageLight)')
                }

                const startT = direction === 'next' ? 2 : 1
                const endT = direction === 'next' ? 1 : 2
                paint(startT)
                turningSheet.style.display = 'block'

                if (direction === 'previous') {
                    renderSentence(stationaryStory, interactionLayer, content)
                }

                await animateTurn(startT, endT)

                currentContentRef.current = content
                renderSentence(stationaryStory, interactionLayer, content)
                turningSheet.style.display = 'none'
                clearMovingStory()

                await fadeControls(1)
                busyRef.current = false
            },
            [animateTurn, clearMovingStory, fadeControls, isNight, paint, prepareMovingStory],
        )

        // setCurrentContent(content) -- the non-animated counterpart to
        // turnTo, for repainting the sentence that's already on the page
        // (e.g. coloring it once a scoring result comes back, or
        // clearing that coloring on "Try Again"). Updates
        // currentContentRef too, so a subsequent turnTo('previous')
        // reveals this repainted version, not the stale one from before
        // scoring.
        const setCurrentContentImpl = useCallback((content: CoachSentenceContent) => {
            currentContentRef.current = content
            if (stationaryStoryRef.current && interactionLayerRef.current) {
                renderSentence(stationaryStoryRef.current, interactionLayerRef.current, content)
            }
        }, [])

        useImperativeHandle(ref, () => ({
            turnTo,
            isBusy: () => busyRef.current,
            setCurrentContent: setCurrentContentImpl,
        }), [turnTo, setCurrentContentImpl])

        // Initial paint -- no turn animation for the very first sentence,
        // matching the prototype's own first-load renderStory() call.
        useEffect(() => {
            currentContentRef.current = initialContent
            if (stationaryStoryRef.current && interactionLayerRef.current) {
                renderSentence(stationaryStoryRef.current, interactionLayerRef.current, initialContent)
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [])

        // WORD NOTEBOOK (1/2) -- one delegated click listener on the
        // stationary story group, added once (not per-word, not per-
        // render): renderSentence tears down and rebuilds every
        // `.coach-word` tspan on every turnTo/setCurrentContent call, so
        // binding per-word listeners would mean rebinding constantly.
        // Delegating to the parent group sidesteps that entirely. Only
        // #coach-stationary-story is wired -- #coach-moving-story (the
        // in-flight turning sheet) and #coach-outgoing-story-source (the
        // hidden source it's built from) intentionally are not, so words
        // are only tappable on the page currently at rest, same as the
        // prototype disabling `.passage-word` pointer-events while
        // `data-busy`/mid-turn.
        useEffect(() => {
            const story = stationaryStoryRef.current
            if (!story) return
            const handleClick = (event: MouseEvent) => {
                const wordEl = (event.target as Element).closest('.coach-word')
                const word = wordEl?.getAttribute('data-word')
                if (word) onWordSelectRef.current?.(word)
            }
            story.addEventListener('click', handleClick)
            return () => story.removeEventListener('click', handleClick)
        }, [])

        // WORD NOTEBOOK (2/2) -- purely cosmetic selection marking:
        // whenever `selectedWord` changes, flag whichever currently-
        // rendered `.coach-word` tspans match it via `data-selected`,
        // which the stylesheet below colors/underlines (mirrors the
        // prototype's `.passage-word.is-selected`). Since renderSentence
        // rebuilds the word nodes on every page turn, this intentionally
        // does NOT try to persist the mark across a turnTo -- landing on
        // a new page with no mark, until another word is tapped, matches
        // "selection is about this page's words," not global state.
        useEffect(() => {
            const story = stationaryStoryRef.current
            if (!story) return
            story.querySelectorAll('.coach-word').forEach((el) => {
                const isSelected = selectedWord != null && el.getAttribute('data-word') === selectedWord
                el.setAttribute('data-selected', String(isSelected))
            })
        }, [selectedWord])

        const handleControlKeyDown = useCallback(
            (handler: () => void) => (event: React.KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handler()
                }
            },
            [],
        )

        const onPreviousClick = onPrevious
        const onNextClick = onNext

        return (
            <div className={`coach-artwork ${className}`} data-coach-theme={isNight ? 'night' : 'day'}>
                {DAY_LAYER}

                {NIGHT_LAYER}

                <svg
                    ref={interactionLayerRef}
                    className="coach-interaction-layer"
                    viewBox="0 0 1670 941"
                    xmlns="http://www.w3.org/2000/svg"
                    role="group"
                    aria-label="Reading coach book controls"
                >
                    <defs>
                        <path id="coach-pageShape" d="M904 82 C1136 79 1375 62 1511 79 C1555 83 1580 88 1594 103 L1594 842 C1589 853 1577 849 1561 846 C1506 829 1416 834 1327 834 L901 837 C881 837 870 823 870 804 L870 113 C870 94 884 83 904 82Z"/>
                        <linearGradient id="coach-control-disc" x2="0" y2="1"><stop stopColor="var(--coach-shine)" stopOpacity=".4"/><stop offset="1" stopColor="var(--coach-disc)"/></linearGradient>
                        <linearGradient id="coach-control-mic" x2=".6" y2="1"><stop stopColor="var(--coach-mic)"/><stop offset="1" stopColor="var(--coach-mic-low)"/></linearGradient>
                        <filter id="coach-control-shadow" x="-.3" y="-.3" width="1.6" height="1.7"><feGaussianBlur stdDeviation="3"/></filter>
                        <path ref={turnGeometryRef} id="coach-turn-geometry"/>
                        <linearGradient ref={shadowGradientRef} id="coach-turn-shadow-gradient" gradientUnits="userSpaceOnUse"><stop stopColor="var(--coach-shade)" stopOpacity="0"/><stop offset=".6" stopColor="var(--coach-shade)" stopOpacity=".65"/><stop offset="1" stopColor="var(--coach-shade)" stopOpacity="0"/></linearGradient>
                        <clipPath id="coach-turn-page-clip"><use href="#coach-pageShape"/><path d="M1594 103Q1610 87 1670 80V834Q1620 835 1594 845Z"/></clipPath>
                        <linearGradient ref={turnPaperGradientRef} id="coach-turn-paper" gradientUnits="userSpaceOnUse"><stop stopColor="var(--coach-sheet-dark)"/><stop offset=".23" stopColor="var(--coach-sheet)"/><stop offset=".68" stopColor="var(--coach-sheet-light)"/><stop offset="1" stopColor="var(--coach-sheet)"/></linearGradient>
                        <linearGradient ref={foldLightGradientRef} id="coach-turn-fold-light" gradientUnits="userSpaceOnUse"><stop stopColor="var(--coach-shine)" stopOpacity="0"/><stop offset=".5" stopColor="var(--coach-shine)" stopOpacity=".65"/><stop offset="1" stopColor="var(--coach-shine)" stopOpacity="0"/></linearGradient>
                        <clipPath id="coach-stationary-story-clip"><use href="#coach-pageShape"/></clipPath>
                        <clipPath id="coach-moving-story-clip"><use id="coach-moving-story-outline" href="#coach-turn-geometry"/></clipPath>
                        <g ref={outgoingSourceRef} id="coach-outgoing-story-source"></g>
                    </defs>
                    <g ref={storyDefsRef}>{/* runtime home for the 16 temporary story-strip clipPaths */}</g>
                    {/* NOTEBOOK ART -- see this file's header comment. Slides
                    on/off-canvas via CSS transform + opacity, same
                    translate-based technique the prototype's own
                    #notebook-transition group uses. Sits in the left half of
                    the stage (same footprint RemediationCoach.tsx gives the
                    owl), so it never overlaps the book/story on the right. */}
                    <g className="coach-notebook-transition" data-open={notebookOpen} aria-hidden={!notebookOpen}>
                        {NOTEBOOK_ART}
                    </g>
                    <g ref={stationaryStoryRef} id="coach-stationary-story" clipPath="url(#coach-stationary-story-clip)" role="group" aria-label="Story"></g>
                    <g ref={turningSheetRef} className="coach-turning-sheet" aria-hidden="true" style={{ display: "none" }}>
                        <g clipPath="url(#coach-turn-page-clip)"><use ref={movingShadowRef} id="coach-moving-shadow" href="#coach-turn-geometry" fill="url(#coach-turn-shadow-gradient)"/></g>
                        <use ref={sheetFaceRef} href="#coach-turn-geometry" id="coach-sheet-face" fill="url(#coach-turn-paper)"/>
                        <use ref={sheetRestLightRef} href="#coach-turn-geometry" id="coach-sheet-rest-light"/>
                        <g ref={movingStoryRef} id="coach-moving-story" clipPath="url(#coach-moving-story-clip)"></g>
                        <use ref={sheetLightRef} href="#coach-turn-geometry" id="coach-sheet-light" fill="url(#coach-turn-fold-light)"/>
                    </g>
                    <g
                        ref={previousBtnRef}
                        id="coach-previous"
                        className="coach-book-control"
                        role="button"
                        tabIndex={previousDisabled ? -1 : 0}
                        aria-label={previousLabel}
                        aria-disabled={previousDisabled}
                        transform="translate(1051 674)"
                        onClick={previousDisabled ? undefined : onPreviousClick}
                        onKeyDown={previousDisabled ? undefined : handleControlKeyDown(onPreviousClick)}
                    >
                        <circle r="64" cy="5" fill="var(--coach-ring)" opacity=".23" filter="url(#coach-control-shadow)"/><circle r="69" fill="none" stroke="var(--coach-ring)" strokeWidth="5" opacity=".48"/><circle r="62" fill="var(--coach-disc)" opacity=".4"/><circle r="55" fill="url(#coach-control-disc)"/><circle className="coach-button-highlight" r="55" fill="none" stroke="var(--coach-shine)" strokeWidth="3" opacity=".7"/><path d="M-8 -27 Q-14 -31 -14 -22 V22 Q-14 31 -7 26 L20 5 Q27 0 20 -6Z" transform="scale(-1 1)" fill="var(--coach-arrow)"/><circle className="coach-focus-ring" r="76"/></g>
                    {/* Inert for now, matching the prototype's look only
                    -- no onClick/tabIndex yet. Next step wires this up to
                    real recording, at which point aria-disabled/aria-
                    pressed become props like previous/next's. */}
                    <g
                        id="coach-microphone"
                        className="coach-book-control"
                        role="button"
                        aria-label="Microphone"
                        aria-disabled="true"
                        aria-pressed="false"
                        tabIndex={-1}
                        transform="translate(1228 678)"
                    >
                        <circle r="92" cy="5" fill="var(--coach-ring)" opacity=".23" filter="url(#coach-control-shadow)"/><circle r="97" fill="none" stroke="var(--coach-ring)" strokeWidth="5" opacity=".48"/><circle r="90" fill="var(--coach-disc)" opacity=".4"/><circle r="83" fill="url(#coach-control-mic)"/><circle className="coach-button-highlight" r="83" fill="none" stroke="var(--coach-shine)" strokeWidth="3" opacity=".7"/><circle className="coach-recording-pulse" r="94"/><rect x="-20" y="-51" width="40" height="69" rx="20" fill="var(--coach-ink)"/><path d="M-35 -2 C-35 46 35 46 35 -2 M0 35V48" fill="none" stroke="var(--coach-ink)" strokeWidth="11" strokeLinecap="round"/><circle className="coach-focus-ring" r="104"/></g>
                    <g
                        ref={nextBtnRef}
                        id="coach-next"
                        className="coach-book-control"
                        role="button"
                        tabIndex={nextDisabled ? -1 : 0}
                        aria-label={nextLabel}
                        aria-disabled={nextDisabled}
                        transform="translate(1406 674)"
                        onClick={nextDisabled ? undefined : onNextClick}
                        onKeyDown={nextDisabled ? undefined : handleControlKeyDown(onNextClick)}
                    >
                        <circle r="64" cy="5" fill="var(--coach-ring)" opacity=".23" filter="url(#coach-control-shadow)"/><circle r="69" fill="none" stroke="var(--coach-ring)" strokeWidth="5" opacity=".48"/><circle r="62" fill="var(--coach-disc)" opacity=".4"/><circle r="55" fill="url(#coach-control-disc)"/><circle className="coach-button-highlight" r="55" fill="none" stroke="var(--coach-shine)" strokeWidth="3" opacity=".7"/><path d="M-8 -27 Q-14 -31 -14 -22 V22 Q-14 31 -7 26 L20 5 Q27 0 20 -6Z" transform="scale(1 1)" fill="var(--coach-arrow)"/><circle className="coach-focus-ring" r="76"/></g>
                </svg>

                {children}

                <style>{`
                    .coach-artwork {
                        position: absolute;
                        inset: 0;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        --coach-arrow: #ad9070; --coach-ring: #d9bc98; --coach-disc: #efdfc3;
                        --coach-shine: #fff9e9; --coach-ink: #fff5e9; --coach-shade: #874013;
                        --coach-sheet: #faf1dd; --coach-sheet-light: #fff9e8; --coach-sheet-dark: #dfbb94;
                        --coach-story-ink: #68401f; --coach-correct: #0d9488; --coach-miscue: #d97706;
                        --coach-mic: #ff593a; --coach-mic-low: #ff633c; --coach-selected: #00766d;
                        --coach-nb-cover: #934713; --coach-nb-border: #803b0e; --coach-nb-edge: #e6c49e;
                        --coach-nb-edge-light: #f6e4c7; --coach-nb-paper: #fdf7e7; --coach-nb-paper-low: #faf1dd;
                        --coach-nb-hole: #934713; --coach-nb-ring: #b7a083; --coach-nb-ring-light: #e4d6bd;
                        --coach-nb-ring-dark: #9a846b; --coach-nb-shadow: #71310c;
                    }
                    .coach-artwork[data-coach-theme="night"] {
                        --coach-arrow: #7068b5; --coach-ring: #a6a0e9; --coach-disc: #cbc9f7;
                        --coach-shine: #f3ecff; --coach-ink: #f2eaff; --coach-shade: #302260;
                        --coach-sheet: #e0dfff; --coach-sheet-light: #f4efff; --coach-sheet-dark: #b2acff;
                        --coach-story-ink: #2a2154; --coach-correct: #2dd4bf; --coach-miscue: #fbbf24;
                        --coach-mic: #7739ff; --coach-mic-low: #703bff; --coach-selected: #6932ce;
                        --coach-nb-cover: #171951; --coach-nb-border: #10133f; --coach-nb-edge: #8d89e7;
                        --coach-nb-edge-light: #b9b5ff; --coach-nb-paper: #e8e5ff; --coach-nb-paper-low: #d7d5ff;
                        --coach-nb-hole: #1c1e62; --coach-nb-ring: #8c8fda; --coach-nb-ring-light: #d3d5ff;
                        --coach-nb-ring-dark: #53599f; --coach-nb-shadow: #080c30;
                    }
                    .coach-art-layer { position: absolute; inset: 0; }
                    .coach-art-layer > svg { display: block; width: 100%; height: 100%; }
                    .coach-night-layer { opacity: 0; pointer-events: none; transition: opacity 300ms ease; }
                    .coach-artwork[data-coach-theme="night"] .coach-night-layer { opacity: 1; }
                    .coach-interaction-layer { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; }
                    .coach-book-control { cursor: pointer; outline: none; }
                    .coach-book-control[aria-disabled="true"] { opacity: .36; cursor: default; pointer-events: none; }
                    .coach-book-control .coach-focus-ring { opacity: 0; fill: none; stroke: var(--coach-arrow); stroke-width: 4; stroke-dasharray: 7 5; }
                    .coach-book-control:focus-visible .coach-focus-ring { opacity: 1; }
                    .coach-book-control:not([aria-disabled="true"]):hover .coach-button-highlight { opacity: .6; }
                    .coach-recording-pulse { opacity: 0; fill: none; stroke: var(--coach-mic); stroke-width: 5; transform-box: fill-box; transform-origin: center; }
                    #coach-microphone[aria-pressed="true"] .coach-recording-pulse { animation: coach-recording 1500ms ease-out infinite; }
                    @keyframes coach-recording { 0% { opacity: .55; transform: scale(.95); } 100% { opacity: 0; transform: scale(1.2); } }
                    .coach-turning-sheet { pointer-events: none; }
                    .coach-story-text { fill: var(--coach-story-ink); font-family: ui-rounded, "Trebuchet MS", Verdana, sans-serif; }
                    .coach-story-body { font-weight: 400; }
                    /* Word notebook -- tappable words, matching the
                    prototype's #stationary-story .passage-word rules
                    (underline-only feedback, no layout shift). */
                    .coach-word { transition: fill 200ms ease; cursor: pointer; pointer-events: visiblePainted; }
                    .coach-word:hover, .coach-word:focus { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 5px; }
                    .coach-word[data-selected="true"] { fill: var(--coach-selected); text-decoration: underline; text-decoration-thickness: 3px; text-decoration-color: var(--coach-selected); }
                    /* NOTEBOOK ART -- translate-based slide on/off-canvas,
                    same technique the prototype's own #notebook-transition
                    group uses (see this file's header comment). */
                    .coach-notebook-transition {
                        transform-box: view-box;
                        transform-origin: 410px 470px;
                        transition: transform 550ms cubic-bezier(.18,.72,.25,1), opacity 320ms ease;
                        transform: translateX(0);
                        opacity: 1;
                    }
                    .coach-notebook-transition[data-open="false"] {
                        transform: translateX(-2400px);
                        opacity: 0;
                        pointer-events: none;
                    }
                    #coach-notebook * { transition: fill 300ms ease, stroke 300ms ease, stop-color 300ms ease; }
                    @media (prefers-reduced-motion: reduce) {
                        .coach-night-layer { transition: none; }
                        #coach-microphone[aria-pressed="true"] .coach-recording-pulse { animation: none; opacity: .55; }
                        .coach-notebook-transition { transition: opacity 200ms ease; transform: translateX(0) !important; }
                        .coach-notebook-transition[data-open="false"] { opacity: 0; }
                    }
                `}</style>
            </div>
        )
    },
)

export default CoachTableBackdrop