// File: src/pages/proficiency/pre_assessment/assessment_session/features/PassagePanel.tsx
// Left column of the passage + recording step — displays the generated
// (or placeholder) passage, now paginated when it doesn't fit on one
// screen at a comfortable reading size.
//
// This card has a FIXED height (set by the grid in AssessmentSession.tsx —
// lg:h-[calc(100vh-14rem)]) and the whole point is still no page
// scrolling. Page breaks are found by measuring real rendered height in a
// hidden clone, not by estimating from word count. IMPORTANT: the hidden
// measurer must replicate the same markup as the visible text, not just
// the same font/line-height — each visible word is wrapped in a span with
// px-0.5 padding (see the word rendering below), and that padding adds up
// across a whole line. An earlier version measured plain text with no
// padding, which fit one extra word per line in the measurement that the
// real (padded) text couldn't actually fit — so pages still clipped their
// last line. Fixed by having the measurer build the identical
// span-per-word structure (padding and all), just visually hidden via
// opacity-0, so its wrapping matches the real paragraph exactly.
//
// Pagination controls only render when there's more than one page — a
// short Grade 1 passage that fits in one page shows no Previous/Next/dots
// at all. Recomputes on every new passage and via a ResizeObserver on the
// container (so it stays correct if the card's size ever changes);
// passage-change resets to page 1, a resize just clamps the current page
// into whatever the new page count allows. Previous/Next are sized up
// (px-6 py-3 text-base, was px-4 py-2 text-sm) for bigger, easier-to-hit
// tap targets — this screen is meant for young pupils on possibly a
// shared/tablet-ish device, so the original size read as fiddly.
//
// Interactive word gimmick: every word in the passage is its own clickable
// span. Click toggles a random pastel background on/off for that word
// (a fresh random hue each time it's turned on) — the hue is randomized,
// but lightness/saturation are fixed per theme (lighter+softer in light
// mode, a bit more saturated in dark mode so it still stands out against
// the dark card) and the word's text is always forced to near-black, so
// no random hue can ever land on something unreadable. Hover shows a
// yellow highlight via an inset box-shadow overlay rather than swapping
// the background directly. Word colors are tracked by each word's index
// in the WHOLE passage (not per-page), so highlights persist correctly
// when flipping between pages. Colors reset any time a new passage comes
// in (see the useEffect below).
//
// "Clear Highlights" is a deliberately low-key secret-feature affordance —
// completely absent until at least one word (on any page) has a color,
// sitting in the badge row up top. Clears every highlighted word across
// the whole passage, not just the current page.
//
// Three one-time onboarding <Hint>s (see components/ui/Hint.tsx): one on
// "Clear Highlights" the first time it ever appears, one on the Next
// button the first time a passage actually has more than one page, and
// one on the Previous button — gated to `!isFirstPage`, so it only shows
// once Previous has actually become clickable (i.e. after the pupil has
// already flipped forward at least once), not while it's sitting disabled
// on page 1. All three are `persist`-ed (the Hint default), so a pupil
// only ever sees each once, across sessions. `autoHideMs={6000}` — these
// close twice as fast as the auth-page hints (which use Hint's 12s
// default) since there's more going on on this screen competing for
// attention.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Lang } from '../../../../../components/buttons/LangToggle.tsx'
import { useTheme } from '../../../../../contexts/ThemeContext.tsx'
import { Hint } from '../../../../../components/ui/Hint.tsx'
import type { AssessmentStrings, Passage } from '../assessmentSessionStrings.ts'
type PassagePanelProps = {
    t: AssessmentStrings
    gradeLevel: number
    assessmentLang: Lang
    passage: Passage
}
type PageRange = { start: number; end: number }
const MIN_WORDS = 40
const MAX_WORDS = 240
const MAX_REM = 1.75
const MIN_REM = 1.35
function passageFontRem(wordCount: number): number {
    const clamped = Math.min(MAX_WORDS, Math.max(MIN_WORDS, wordCount))
    const progress = (clamped - MIN_WORDS) / (MAX_WORDS - MIN_WORDS)
    return MAX_REM - progress * (MAX_REM - MIN_REM)
}
// Deliberately not a "dark" hue at any random draw — lightness/saturation
// are pinned per theme so every random color stays light enough for the
// forced near-black text to read clearly on top of it.
function randomWordColor(isDark: boolean): string {
    const hue = Math.floor(Math.random() * 360)
    return isDark ? `hsl(${hue}, 65%, 60%)` : `hsl(${hue}, 82%, 83%)`
}
export function PassagePanel({ t, gradeLevel, assessmentLang, passage }: PassagePanelProps) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const tokens = useMemo(() => passage.passage.split(/(\s+)/), [passage.passage])
    const wordCount = useMemo(() => passage.passage.trim().split(/\s+/).filter(Boolean).length, [passage.passage])
    const fontRem = useMemo(() => passageFontRem(wordCount), [wordCount])
    const [wordColors, setWordColors] = useState<Record<number, string>>({})
    const hasHighlights = Object.keys(wordColors).length > 0
    const containerRef = useRef<HTMLDivElement>(null)
    const measureRef = useRef<HTMLParagraphElement>(null)
    const [pageRanges, setPageRanges] = useState<PageRange[]>([{ start: 0, end: tokens.length }])
    const [pageIndex, setPageIndex] = useState(0)
    // Walks the tokens and only cuts a page when the NEXT token would
    // actually overflow the container's real measured height. The
    // measurer builds the SAME word-span-with-padding structure as the
    // real rendered text (see the render below) so its wrapping matches
    // exactly — measuring plain text here was the bug that let pages
    // clip their last line.
    const computeRanges = useCallback((): PageRange[] | null => {
        const container = containerRef.current
        const measure = measureRef.current
        if (!container || !measure) return null
        const maxHeight = container.clientHeight
        if (maxHeight <= 0) return null
        measure.style.fontSize = `${fontRem}rem`
        measure.innerHTML = ''
        const appendToken = (token: string) => {
            if (token === '') return
            if (/^\s+$/.test(token)) {
                measure.appendChild(document.createTextNode(token))
            } else {
                const span = document.createElement('span')
                span.className = 'px-0.5'
                span.textContent = token
                measure.appendChild(span)
            }
        }
        const ranges: PageRange[] = []
        let start = 0
        let i = 0
        while (i < tokens.length) {
            appendToken(tokens[i])
            if (measure.scrollHeight <= maxHeight || i === start) {
                i++
            } else {
                ranges.push({ start, end: i })
                start = i
                measure.innerHTML = ''
                // i is NOT incremented — token i gets re-appended to the
                // now-empty measurer on the next loop pass, as the first
                // token of the new page.
            }
        }
        ranges.push({ start, end: tokens.length })
        return ranges
    }, [tokens, fontRem])
    // New passage: recompute pages and jump back to page 1.
    useLayoutEffect(() => {
        const ranges = computeRanges()
        if (ranges) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPageRanges(ranges)
            setPageIndex(0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [passage.passage])
    // Card resized: recompute pages, just clamp the current page instead
    // of jumping back to page 1 (don't yank the reader around).
    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const observer = new ResizeObserver(() => {
            const ranges = computeRanges()
            if (ranges) {
                setPageRanges(ranges)
                setPageIndex((p) => Math.min(p, ranges.length - 1))
            }
        })
        observer.observe(container)
        return () => observer.disconnect()
    }, [computeRanges])
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
    const currentRange = pageRanges[pageIndex] ?? { start: 0, end: tokens.length }
    const pageTokens = tokens.slice(currentRange.start, currentRange.end)
    const isFirstPage = pageIndex === 0
    const isLastPage = pageIndex === pageRanges.length - 1
    const showPagination = pageRanges.length > 1
    return (
        <section className="flex h-full flex-col overflow-hidden rounded-3xl border border-gray-900/5 bg-white p-8 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-10">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                    {t.gradeLabel(gradeLevel)}
                </span>
                <span className="rounded-full bg-gray-900/5 px-3 py-1 text-sm font-bold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                    {assessmentLang === 'fil' ? t.filipinoLabel : t.englishLabel}
                </span>
                <div className="flex-1" />
                {hasHighlights && (
                    <div className="relative">
                        <button
                            onClick={clearHighlights}
                            className="cursor-pointer rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_2px_0_0_#b45309] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_0px_0_0_#b45309] dark:bg-amber-500 dark:shadow-[0_2px_0_0_#92400e]"
                        >
                            Clear Highlights
                        </button>
                        <Hint id="assessment-clear-highlights" text={t.clearHighlightsHint} placement="bottom" align="center" autoHideMs={6000} />
                    </div>
                )}
                {showPagination && (
                    <span className="rounded-full bg-gray-900/5 px-3 py-1 text-sm font-bold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                        {t.pageLabel(pageIndex + 1, pageRanges.length)}
                    </span>
                )}
            </div>
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-4xl">{passage.title}</h2>
            <div ref={containerRef} className="relative mt-6 flex-1 overflow-hidden">
                {/* Hidden measurer — same word-span-with-padding structure
                    as the visible text below, used purely to find real
                    page breaks. Must match markup, not just font styling,
                    or its wrapping won't match the real paragraph's. */}
                <p
                    ref={measureRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 whitespace-pre-line font-medium opacity-0"
                    style={{ fontSize: `${fontRem}rem`, lineHeight: 1.65 }}
                />
                <p
                    className="whitespace-pre-line font-medium text-gray-800 dark:text-gray-200"
                    style={{ fontSize: `${fontRem}rem`, lineHeight: 1.65 }}
                >
                    {pageTokens.map((token, j) => {
                        const globalIndex = currentRange.start + j
                        if (token === '' || /^\s+$/.test(token)) {
                            return token
                        }
                        const bg = wordColors[globalIndex]
                        return (
                            <span
                                key={globalIndex}
                                onClick={() => toggleWord(globalIndex)}
                                className="cursor-pointer rounded-[3px] px-0.5 transition-colors duration-150 hover:shadow-[inset_0_0_0_999px_rgba(250,204,21,0.35)]"
                                style={bg ? { backgroundColor: bg, color: '#111827' } : undefined}
                            >
                                {token}
                            </span>
                        )
                    })}
                </p>
            </div>
            {showPagination && (
                <div className="mt-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button
                                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                                disabled={isFirstPage}
                                className="cursor-pointer rounded-full border-2 border-gray-900/10 px-6 py-3 text-base font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/10"
                            >
                                {t.prevPage}
                            </button>
                            <Hint id="assessment-prev-page" text={t.prevPageHint} show={!isFirstPage} placement="top" align="start" autoHideMs={6000} />
                        </div>
                        <div className="flex flex-1 items-center justify-center gap-2">
                            {pageRanges.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPageIndex(i)}
                                    aria-label={t.pageLabel(i + 1, pageRanges.length)}
                                    className={`h-2.5 cursor-pointer rounded-full transition-all duration-200 ${
                                        i === pageIndex ? 'w-7 bg-teal-500' : 'w-2.5 bg-gray-900/15 dark:bg-gray-100/15'
                                    }`}
                                />
                            ))}
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setPageIndex((p) => Math.min(pageRanges.length - 1, p + 1))}
                                disabled={isLastPage}
                                className="cursor-pointer rounded-full bg-teal-500 px-6 py-3 text-base font-bold text-white transition-colors duration-150 hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-teal-600 dark:hover:bg-teal-500"
                            >
                                {t.nextPage}
                            </button>
                            <Hint id="assessment-page-nav" text={t.pageNavHint} placement="top" align="end" autoHideMs={6000} />
                        </div>
                    </div>
                    <p className="mt-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {t.readAllHint}
                    </p>
                </div>
            )}
        </section>
    )
}