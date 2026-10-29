// File: src/pages/proficiency/pre_assessment/assessment_session/features/PassagePanel.tsx
// The passage card of the passage + recording step: full width, with the
// recorder bar (RecorderPanel.tsx) underneath. The goal is that the pupil sees
// the WHOLE passage at once while recording, with no page flipping.
//
// AUTO-FIT: on large screens the grid in AssessmentSessionPage.tsx gives this
// card a fixed height (the space left under the header), and `fit()` below picks
// the largest text size, between MAX_REM and MIN_REM, at which the whole passage
// fits in the card's text area. A short Grade 1 passage ends up big; a long
// Grade 6 one ends up smaller. It re-runs when the passage changes and whenever
// the text area changes size (window resize, the recorder bar changing height).
// If the passage still does not fit at MIN_REM, the text area scrolls and the
// pupil gets a cue: a fade at the bottom, a "Scroll to keep reading" button, and
// a one-time hint. Below `lg` (phones) there is no fixed height: the text is a
// fixed size and the text area is capped at half the screen, scrolling inside.
//
// Interactive word gimmick: every word in the passage is its own clickable
// span. Click toggles a random pastel background on/off for that word
// (a fresh random hue each time it's turned on) — the hue is randomized,
// but lightness/saturation are fixed per theme (lighter+softer in light
// mode, a bit more saturated in dark mode so it still stands out against
// the dark card) and the word's text is always forced to near-black, so
// no random hue can ever land on something unreadable. Hover shows a
// yellow highlight via an inset box-shadow overlay rather than swapping
// the background directly. Colors reset any time a new passage comes in.
//
// "Clear Highlights" is a deliberately low-key secret-feature affordance —
// completely absent until at least one word has a color, sitting in the badge
// row up top, with a one-time <Hint> (see components/ui/Hint.tsx) the first time
// it ever appears. The scroll hint works the same way: persisted, shown once.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import type { Lang } from '../../../../../components/buttons/LangToggle.tsx'
import { useTheme } from '../../../../../contexts/ThemeContext.tsx'
import { Hint } from '../../../../../components/ui/Hint.tsx'
import { DifficultyStars } from '../../../../../components/ui/DifficultyStars.tsx'
import { Owl } from '../../../../../components/ui/Owl.tsx'
import type { AssessmentStrings, Passage } from '../assessmentSessionStrings.ts'

type PassagePanelProps = {
    t: AssessmentStrings
    gradeLevel: number
    assessmentLang: Lang
    passage: Passage
    // True while the microphone permission is still being sorted out (see
    // MicPermissionHelp.tsx): the one-time hints wait until then, so the
    // screen isn't covered in speech bubbles at once.
    hintsBlocked: boolean
}

const LG_QUERY = '(min-width: 1024px)'
const MAX_REM = 2
const MIN_REM = 1
const STEP_REM = 0.05
const PHONE_REM = 1.2

// Deliberately not a "dark" hue at any random draw — lightness/saturation
// are pinned per theme so every random color stays light enough for the
// forced near-black text to read clearly on top of it.
function randomWordColor(isDark: boolean): string {
    const hue = Math.floor(Math.random() * 360)
    return isDark ? `hsl(${hue}, 65%, 60%)` : `hsl(${hue}, 82%, 83%)`
}

export function PassagePanel({ t, gradeLevel, assessmentLang, passage, hintsBlocked }: PassagePanelProps) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const tokens = useMemo(() => passage.passage.split(/(\s+)/), [passage.passage])
    const [wordColors, setWordColors] = useState<Record<number, string>>({})
    const hasHighlights = Object.keys(wordColors).length > 0
    const wrapRef = useRef<HTMLDivElement>(null)
    const textRef = useRef<HTMLParagraphElement>(null)
    const [scroll, setScroll] = useState({ scrollable: false, atEnd: true })

    const updateScroll = useCallback(() => {
        const wrap = wrapRef.current
        if (!wrap) return
        const scrollable = wrap.scrollHeight > wrap.clientHeight + 1
        const atEnd = wrap.scrollHeight - wrap.clientHeight - wrap.scrollTop <= 8
        setScroll((prev) => (prev.scrollable === scrollable && prev.atEnd === atEnd ? prev : { scrollable, atEnd }))
    }, [])

    // The largest text size at which the whole passage fits (see AUTO-FIT above).
    // The font size is written straight to the element, not kept in state, so
    // fitting never causes a re-render loop.
    const fit = useCallback(() => {
        const wrap = wrapRef.current
        const text = textRef.current
        if (!wrap || !text) return
        if (!window.matchMedia(LG_QUERY).matches) {
            text.style.fontSize = `${PHONE_REM}rem`
        } else {
            let rem = MAX_REM
            text.style.fontSize = `${rem}rem`
            while (wrap.scrollHeight > wrap.clientHeight + 1 && rem > MIN_REM + 1e-6) {
                rem = Math.max(MIN_REM, Number((rem - STEP_REM).toFixed(2)))
                text.style.fontSize = `${rem}rem`
            }
        }
        updateScroll()
    }, [updateScroll])

    // New passage: fit it and start from the top.
    useLayoutEffect(() => {
        wrapRef.current?.scrollTo({ top: 0 })
        fit()
    }, [passage.passage, fit])

    // The text area changed size (window, or the recorder bar below changed
    // height), or the web fonts finished loading: fit again.
    useEffect(() => {
        const wrap = wrapRef.current
        if (!wrap) return
        const observer = new ResizeObserver(fit)
        observer.observe(wrap)
        void document.fonts?.ready.then(fit)
        return () => observer.disconnect()
    }, [fit])

    // Fresh passage = fresh colors, so a "regenerate" doesn't carry over
    // highlights from the previous text.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWordColors({})
    }, [passage.passage])

    const toggleWord = (index: number) => {
        setWordColors((prev) => {
            if (prev[index]) {
                const next = { ...prev }
                delete next[index]
                return next
            }
            return { ...prev, [index]: randomWordColor(isDark) }
        })
    }
    const clearHighlights = () => setWordColors({})
    const showScrollCue = scroll.scrollable && !scroll.atEnd

    return (
        <section className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-900/5 bg-white p-6 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-8 short:p-5">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                    {t.gradeLabel(gradeLevel)}
                </span>
                <span className="rounded-full bg-gray-900/5 px-3 py-1 text-sm font-bold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                    {assessmentLang === 'fil' ? t.filipinoLabel : t.englishLabel}
                </span>
                <DifficultyStars text={passage.passage} language={assessmentLang} size={16} />
                <div className="flex-1" />
                {hasHighlights && (
                    <div className="relative">
                        <button
                            onClick={clearHighlights}
                            className="cursor-pointer rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_2px_0_0_#b45309] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_0px_0_0_#b45309] dark:bg-amber-500 dark:shadow-[0_2px_0_0_#92400e]"
                        >
                            Clear Highlights
                        </button>
                        <Hint id="assessment-clear-highlights" text={t.clearHighlightsHint} show={!hintsBlocked} placement="bottom" align="end" autoHideMs={6000} />
                    </div>
                )}
            </div>
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-4xl short:text-3xl">{passage.title}</h2>
            <div className="relative mt-4 flex min-h-0 flex-1 flex-col">
                <div ref={wrapRef} onScroll={updateScroll} className="min-h-0 flex-1 overflow-y-auto pr-2 max-lg:max-h-[50vh]">
                    <p ref={textRef} className="whitespace-pre-line font-medium text-gray-800 dark:text-gray-200" style={{ lineHeight: 1.7 }}>
                        {tokens.map((token, index) => {
                            if (token === '' || /^\s+$/.test(token)) {
                                return token
                            }
                            const bg = wordColors[index]
                            return (
                                <span
                                    key={index}
                                    onClick={() => toggleWord(index)}
                                    className="cursor-pointer rounded-[3px] px-0.5 transition-colors duration-150 hover:shadow-[inset_0_0_0_999px_rgba(250,204,21,0.35)]"
                                    style={bg ? { backgroundColor: bg, color: '#111827' } : undefined}
                                >
                                    {token}
                                </span>
                            )
                        })}
                    </p>
                </div>
                {showScrollCue && (
                    <>
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent dark:from-gray-900"
                        />
                        <div className="absolute bottom-2 right-6">
                            <button
                                type="button"
                                onClick={() => wrapRef.current?.scrollBy({ top: wrapRef.current.clientHeight * 0.8, behavior: 'smooth' })}
                                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-teal-500 px-4 py-2 text-sm font-bold text-white shadow-lg transition-colors duration-150 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
                            >
                                <ArrowDown size={16} />
                                {t.scrollMore}
                            </button>
                            <Hint id="assessment-scroll-passage" text={t.scrollPassageHint} show={!hintsBlocked} placement="top" align="end" autoHideMs={7000} />
                        </div>
                    </>
                )}
            </div>
            <div className="mt-3 flex shrink-0 items-center gap-2.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                <Owl size={30} />
                <span>{t.recorderEncourage}</span>
            </div>
        </section>
    )
}
