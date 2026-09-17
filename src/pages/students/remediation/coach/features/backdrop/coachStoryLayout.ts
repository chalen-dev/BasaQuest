// File: src/pages/students/remediation/coach/features/coachStoryLayout.ts
//
// Word-wrap layout + SVG text rendering for the sentence painted onto
// CoachTableBackdrop's open page. Split out of CoachTableBackdrop.tsx
// (see that file's header comment) because this is standalone DOM
// logic — it only ever touches the <text>/<tspan> nodes it's handed,
// never anything about the page-turn animation or the art.
//
// Adapted from the "book tabletop" prototype's renderStory() (box
// constants + the decreasing-fontSize wrap search), extended for a
// single sentence (no title, no multi-paragraph loop) with per-word
// verdict coloring + target-word bolding.
const SVG_NS = 'http://www.w3.org/2000/svg'

export type CoachWordVerdict = 'correct' | 'miscue'

// One sentence's worth of content to paint onto the open page. `verdicts`
// is null/undefined before a scoring attempt exists for this word (the
// idle/recording/scoring phases); once useScoreSentence resolves, pass
// its per-word systemVerdict array here to color the whole sentence.
export type CoachSentenceContent = {
    words: string[]
    targetIndex: number
    verdicts?: (CoachWordVerdict | null)[] | null
}

const STORY_LEFT = 940
const STORY_WIDTH = 576
const STORY_TOP = 185
const STORY_BOTTOM = 545
const STORY_BODY_LEADING = 1.48

function wrapWords(measure: SVGTextElement, words: string[], fontSize: number): string[] {
    measure.setAttribute('font-size', String(fontSize))
    measure.setAttribute('font-weight', '400')
    const fits = (value: string) => {
        measure.textContent = value
        return measure.getComputedTextLength() <= STORY_WIDTH
    }
    const lines: string[] = []
    let line = ''
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word
        if (fits(candidate)) {
            line = candidate
            continue
        }
        if (line) lines.push(line)
        line = ''
        // Letter-by-letter fallback for a single word wider than the
        // whole column -- verbatim from renderStory(), practically
        // never hit for a short Gemini-generated sentence.
        for (const letter of word) {
            if (line && !fits(line + letter)) {
                lines.push(line)
                line = ''
            }
            line += letter
        }
    }
    if (line) lines.push(line)
    return lines
}

function layoutSentence(interactionLayer: SVGSVGElement, words: string[]): { lines: string[]; fontSize: number } {
    const measure = document.createElementNS(SVG_NS, 'text') as SVGTextElement
    measure.setAttribute('class', 'coach-story-text')
    measure.setAttribute('visibility', 'hidden')
    interactionLayer.appendChild(measure)
    let fontSize = 29
    let lines: string[] = []
    for (; fontSize >= 19; fontSize--) {
        lines = wrapWords(measure, words, fontSize)
        if (STORY_TOP + lines.length * fontSize * STORY_BODY_LEADING <= STORY_BOTTOM) break
    }
    measure.remove()
    return { lines, fontSize }
}

// Renders `content` into `target` (either #coach-stationary-story or the
// hidden #coach-outgoing-story-source) as real SVG <text>/<tspan>
// nodes, one <tspan class="coach-word"> per word, colored by verdict.
export function renderSentence(target: SVGGElement, interactionLayer: SVGSVGElement, content: CoachSentenceContent) {
    target.replaceChildren()
    const { lines, fontSize } = layoutSentence(interactionLayer, content.words)
    const textEl = document.createElementNS(SVG_NS, 'text')
    textEl.setAttribute('class', 'coach-story-text coach-story-body')
    textEl.setAttribute('font-size', String(fontSize))
    let wordCursor = 0
    lines.forEach((line, lineIndex) => {
        const span = document.createElementNS(SVG_NS, 'tspan')
        span.setAttribute('x', String(STORY_LEFT))
        span.setAttribute('y', String(STORY_TOP + lineIndex * fontSize * STORY_BODY_LEADING))
        span.setAttribute('xml:space', 'preserve')
        line.split(/(\s+)/).forEach((token) => {
            if (!token) return
            if (/^\s+$/.test(token)) {
                span.appendChild(document.createTextNode(token))
                return
            }
            const index = wordCursor++
            const wordEl = document.createElementNS(SVG_NS, 'tspan')
            wordEl.setAttribute('class', 'coach-word')
            wordEl.setAttribute('data-word', token)
            const isTarget = index === content.targetIndex
            wordEl.setAttribute('font-weight', isTarget ? '700' : '400')
            const verdict = content.verdicts?.[index]
            if (verdict === 'correct') wordEl.setAttribute('fill', 'var(--coach-correct)')
            else if (verdict === 'miscue') wordEl.setAttribute('fill', 'var(--coach-miscue)')
            else wordEl.removeAttribute('fill')
            wordEl.textContent = token
            span.appendChild(wordEl)
        })
        textEl.appendChild(span)
    })
    target.appendChild(textEl)
}