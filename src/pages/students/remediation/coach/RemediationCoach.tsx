// File: src/pages/students/remediation/coach/RemediationCoach.tsx
//
// Reading Coach Mode — the coach-framed successor to the old mic-driven
// "remediation game" (game/RemediationGame.tsx, now deleted). Reached
// the same way as before: the button on StudentRemediationDetail.tsx's
// MaterialCard, relabeled/re-routed to /coach instead of /game.
//
// REBUILD IN PROGRESS: this file was previously carrying a whole
// recording/scoring UI (mic button, waveform, timer, pass/fail result
// cards) that was never actually part of the spec — it was invented
// while porting, not something the prototype (book-tabletop-theme-
// toggle_16.html) has. That's been stripped back out entirely so this
// can be rebuilt piece by piece, following the prototype's own actual
// UI instead. Right now this file fetches the material and renders the
// table/book (CoachTableBackdrop) with the owl + speech bubble + "Hear
// It" overlay, a word notebook panel, and Previous/Next navigation.
// CoachTableBackdrop.tsx also has the prototype's microphone button
// drawn in (next to Previous/Next, matching its look exactly) but it's
// still inert (aria-disabled, no handlers) until recording gets
// designed and wired back in as its own deliberate step.
//
// SCENE: CoachTableBackdrop.tsx (features/backdrop/CoachTableBackdrop.tsx)
// paints a fixed, fullscreen top-down wood-table + open-storybook scene
// behind everything, complete with the ported page-turn animation and
// its own baked-in Previous/Next (and now inert Microphone) buttons, and
// makes each story word tappable (see WORD NOTEBOOK below). This
// component owns everything CoachTableBackdrop does NOT: fetching the
// material, tracking which word is current, and rendering the owl +
// speech bubble + notebook as a real DOM overlay on top of the
// backdrop's 1670x941 scene (passed in via `children`, positioned with
// percentages derived from that viewBox — see OWL_AREA_STYLE below).
// Previous/Next themselves are NOT re-rendered here — they're the
// backdrop's own SVG buttons, driven via the onPrevious/onNext/
// previousDisabled/nextDisabled props.
//
// STAGE SIZING (COVER-FIT, not contain-fit): the backdrop is an
// absolutely-positioned 1670x941 SVG scene, and the owl/bubble/notebook
// overlay below is positioned with plain CSS percentages computed from
// that same viewBox. This used to size the stage with `width:
// min(100vw, calc(100vh*1670/941))` — a *contain*-fit that always shows
// the whole scene, which meant letterbox bars (empty space) on whichever
// axis the viewport's aspect ratio didn't match. The actual prototype
// does the opposite: it *covers* the viewport (always fills it, crops
// overflow instead of letterboxing) and anchors to the right edge —
// straight from its own CSS: `main { display:flex; justify-content:
// flex-end; container-type:size }` + `.artwork { width: max(100cqw,
// calc(100cqh * 1670/941)); aspect-ratio: 1670/941; overflow:hidden }`.
// That's what's ported below: the outer `fixed inset-0` wrapper is the
// CSS containment context (`containerType:'size'`) and is right-anchored
// (`justify-end`) with `overflow-hidden` so nothing ever leaks past the
// viewport edge; the inner `.coach-stage` div uses the same max()/
// aspect-ratio formula, in container query units (cqw/cqh) instead of
// viewport units so it measures against that wrapper specifically. On a
// portrait/narrow viewport this crops from the left, same as the
// prototype — that's why the prototype also has a `@media
// (max-aspect-ratio: 4/3)` fallback that drops back to a fit-everything
// width, ported below as the `.coach-stage` media rule in the inline
// <style>.
//
// NOT PORTED (known gap): the prototype also runs a ResizeObserver-
// driven script that dynamically re-centers the owl mascot INSIDE
// whatever crop remains, so it's never cut off by the cover-crop. That's
// a bigger architectural piece (its owl lives inside the same SVG scene;
// ours is a separate DOM overlay positioned by fixed percentages) and
// hasn't been ported here.
//
// LAYOUT: this route no longer sits under RemediationSessionLayout (the
// shared header-plus-Exit chrome used by the flashcard "Practice"
// drill) — it has its own RemediationCoachLayout instead (no header at
// all, just a floating Exit top-left and Day/Night toggle top-right),
// so this component can go truly full-bleed edge to edge instead of
// working around a fixed header's reserved height. There's no shared
// header here to fetch the student profile either — RemediationCoach
// itself doesn't need the pupil's name for anything, so it isn't
// fetched here at all. The notebook toggle button (bottom-left, see
// WORD NOTEBOOK below) lives HERE rather than in RemediationCoachLayout,
// deliberately — unlike Exit/Theme (generic session chrome that would
// make sense on any route that layout wrapped), the notebook is specific
// to this scene's own story content, so it belongs with the component
// that owns that content.
//
// PAGES (passage mode, replacing one-word-per-page sentence mode): one
// "page" now means one Gemini-generated multi-word PASSAGE
// (material.passages — see remediation/hooks.ts's RemediationPassage
// and generate-remediation-passages/index.ts), not one isolated
// sentence for a single weak word. Every weak word the passage covers
// is visually marked as a target (bold + --coach-target color, see
// coachStoryLayout.ts), not just one — CoachSentenceContent's
// targetIndices is plural for exactly this reason. pagesFromPassages()/
// pagesFromWords() below normalize whichever source this material
// actually has into one common `CoachPage[]` shape (`{ content,
// coachTip }`) ONCE, so Previous/Next, the backdrop's turnTo(), and the
// owl's speech bubble only ever deal with "the current page" from then
// on, never branching on material mode again themselves.
//
// LEGACY FALLBACK: material generated before passage mode existed has
// no `passages` array (or passage generation failed and the teacher
// proceeded without it on the preview screen — see AttemptResults.tsx's
// new generation flow) — pagesFromWords() reproduces today's exact
// original one-word-per-page behavior in that case, reusing
// getSentenceWords()/getTargetIndex() unchanged (which themselves
// already fall back further, to a bare one-word "sentence," for
// material older than sentence mode or a word Gemini's sentence
// generation failed for). So every material this route has ever
// produced still plays correctly — only the newest rows get the actual
// passage experience.
//
// WORD NAVIGATION: Previous/Next move currentIndex directly, any time —
// not gated on anything (explicit product decision: free navigation).
// goToWord() below is the single place that does this: it updates
// React's currentIndex AND tells the backdrop to animate the page-turn
// to the new page's content, together, every time.
//
// COACH TIPS: the owl's speech-bubble text is simply `pages[currentIndex]
// .coachTip`, already resolved by pagesFromPassages()/pagesFromWords()
// via the shared getCoachTipText() below — the page's own Gemini-
// generated coachTip (a RemediationPassage's own tip, or a legacy word
// entry's) when present, otherwise a line from the static
// STATIC_COACH_TIPS pool (remediationCoachStrings.ts), picked
// deterministically by page index so it's stable across re-renders of
// the same page. NOTE: the fallback pool is keyed by the UI's own
// display language (`lang` from useLang(), same as every STRINGS[lang]
// lookup elsewhere in this file) — NOT by the material's content
// language. Those are two different things (a Filipino-UI teacher
// coaching through an English-content word list should still see
// Filipino chrome/tips), so this deliberately does not reuse
// `material.language` for that lookup. Until recording/scoring is
// rebuilt, this always asks for the 'idle' tip — there's no other state
// yet.
//
// HEAR IT (passage mode only removes it): a passage has several target
// words now, so there's no longer one unambiguous word for the owl's
// "Hear It" button to pronounce the way there was with one word per
// page — rather than arbitrarily picking one, that button is simply not
// rendered in passage mode. Pronouncing a SPECIFIC word is already
// covered by the word notebook's own pronounce button (tap any word,
// target or not, to hear just that one). Legacy word-mode pages still
// show "Hear It" exactly as before, since they still have exactly one
// target word — recovered generically as
// `currentPage.content.words[currentPage.content.targetIndices[0]]`
// rather than needing a separate raw word reference kept around.
//
// OWL: the mascot here is OwlMascot.tsx — the real animated inline-SVG
// owl ported from the prototype (breathing/swaying idle loop, blinking,
// a talking pulse whenever the speech-bubble text changes, a hover glow
// using the prototype's own --owl-rim color, etc.). Deliberately NOT
// Owl.tsx (the flat per-mood PNG) — see OwlMascot.tsx's own header
// comment for why that's a separate component instead of a rewrite of
// Owl.tsx in place. `listening`/`celebrate` aren't driven by anything
// yet since there's no recording/scoring state in this file right now —
// they'll get wired up alongside the mic. `paused` IS wired now, to
// `companionMode !== 'owl'` — see WORD NOTEBOOK below.
//
// SIZING/CENTERING: the owl+bubble group and the notebook panel both
// live inside OWL_AREA_STYLE — the whole left half of the stage (0% to
// 50%, matching where CoachTableBackdrop's book cover art starts, around
// x=840 of the 1670-wide viewBox), centered on both axes with plain flex
// centering rather than fixed left/top offsets. That's a deliberate
// change from an earlier pass that anchored the owl to a top-left
// corner with fixed percentages — flex-centering the whole content
// column guarantees it's centered in the empty tabletop area regardless
// of exactly how tall the owl+bubble+button stack ends up being, and
// guarantees nothing gets clipped (the column's total height comfortably
// fits inside the 941-unit-tall stage with room to spare, unlike an
// earlier pass that sized the owl to ~25% of the stage width — close to
// the prototype's own `scale(.38)` in raw terms, but too big once the
// bubble/button were stacked below it inside a fixed box). The inner
// owl-column width (38% of this 50%-wide area = 19% of the full stage)
// targets the prototype's actual on-screen owl size (`scale(.38)` on the
// owl's own ~980-wide artwork ≈ 22% of a 1670-wide stage — 19% reads
// very close to that once the bubble/button below it are accounted for).
//
// WORD NOTEBOOK: a scoped-down first pass at the prototype's companion-
// mode toggle (owl <-> a word notebook), agreed as "shell only, no real
// per-word content yet" — tapping a word just shows that word's text and
// a pronounce button, same placeholder-level as the prototype's own
// notebook (which has no real dictionary data wired in either).
//
// CORRECTED: an earlier pass here built a brand-new hand-designed DOM
// notebook card (its own border/shadow, a decorative spiral-dot row, its
// own close-button styling) instead of reusing the prototype's actual
// blank spiral-notebook SVG art. That was wrong — the notebook surface
// now really is that ported art (NOTEBOOK_ART, in
// CoachTableBackdropArt.tsx, rendered by CoachTableBackdrop.tsx itself
// and slid on/off-canvas via the new `notebookOpen` prop, using the same
// translate-based technique the prototype's own #notebook-transition
// group uses — see that file's header comment). This file no longer
// renders any notebook "card" — only NOTEBOOK_CONTENT_STYLE below, a
// thin, undecorated overlay (word text + pronounce + close button, no
// border/shadow/background of its own) positioned over that SVG
// notebook's blank page, matching how the prototype's own
// #notebookContent is a plain HTML div layered on top of its SVG
// notebook rather than a self-contained card.
//
// Remaining pieces, unchanged from before:
//   - `companionMode` ('owl' | 'notebook') and `selectedWord` state,
//     right here — NOT lifted to RemediationCoachLayout, since nothing
//     outside this scene's own content needs them.
//   - The toggle button, bottom-left (fixed position, matching the
//     prototype's own `.companion-controls { position:fixed; left;
//     bottom }`), icon swapping between "open notebook" and "bring back
//     owl" like the prototype's button does.
//   - The owl mascot itself jumps off/on-canvas via keyframe animation
//     (`.coach-owl-jump`, see "OWL COMPANION ANIMATION" below) — a DOM/
//     CSS animation, since the owl is a DOM overlay outside
//     CoachTableBackdrop's SVG, not a candidate for the same SVG-group
//     translate CoachTableBackdrop uses for the real notebook art.
//   - The speech bubble + pronounce button (`.coach-owl-dialogue`) hide
//     INSTANTLY, no transition/animation of their own — matching the
//     prototype's own `#owlSpeechBubble` treatment exactly
//     (`visibility:hidden !important` the moment companion mode isn't
//     'owl', not a fade). An earlier pass wrongly bundled the bubble and
//     button into the same fading wrapper as the owl mascot, which is
//     why it looked like the owl "faded" instead of jumping — fixed by
//     splitting them into these two separately-behaved pieces.
//
// OWL COMPANION ANIMATION: the owl mascot doesn't fade -- it physically
// translates/rotates up past the top-left corner and swoops back in, no
// opacity change at all, ported as two @keyframes (coach-owl-exit/
// coach-owl-enter below) mirroring the prototype's own `owlLayer`
// keyframe arrays near-verbatim (same offsets/rotations/timing-offsets,
// same easing curves). Gated by `companionAnimated` (state below) so the
// very first render -- owl already visible, same as the prototype's
// "every visit starts in Owl Mode" -- never plays an unwanted intro
// animation; CSS alone can't tell "attribute true since mount" apart
// from "attribute just flipped to true," so this flag makes that call
// instead.
// Tapping a word (CoachTableBackdrop's onWordSelect prop, wired below)
// sets `selectedWord` and switches to notebook mode, ignored while a
// page-turn is in flight (isTurning) so a tap mid-turn can't desync from
// what's actually on the page.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bird, Image as ImageIcon, NotebookText, Volume2, X } from 'lucide-react'
import { useLang } from '../../../../contexts/LangContext.tsx'
import { OwlMascot } from '../../../../components/ui/OwlMascot.tsx'
import { Skeleton } from '../../../../components/ui/Skeleton.tsx'
import { readPracticed, useRemediationMaterialQuery, type RemediationPassage, type RemediationWordEntry } from '../hooks.ts'
import { usePronounceWord } from '../session/features/usePronounceWord.ts'
import {
    CoachTableBackdrop,
    type CoachSentenceContent,
    type CoachTableBackdropHandle,
} from './features/backdrop/CoachTableBackdrop.tsx'
import { STRINGS, getStaticCoachTip } from './features/remediationCoachStrings.ts'

// Which companion is currently showing in OWL_AREA_STYLE -- see this
// file's header comment ("WORD NOTEBOOK"). Kept local to this file
// rather than added to remediationCoachStrings.ts's shared STRINGS/
// CoachState, since neither of those is otherwise involved.
type CompanionMode = 'owl' | 'notebook'

// Small, self-contained strings for the notebook shell -- deliberately
// NOT added to remediationCoachStrings.ts's shared STRINGS record (this
// file doesn't have a current copy of that file to safely edit it into,
// and these three lines don't need to live anywhere else yet).
const NOTEBOOK_STRINGS: Record<'fil' | 'en', { openNotebook: string; closeNotebook: string; placeholder: string }> = {
    en: {
        openNotebook: 'Open word notebook',
        closeNotebook: 'Bring back the owl',
        placeholder: 'Tap a word in the story to explore it.',
    },
    fil: {
        openNotebook: 'Buksan ang kuwaderno ng salita',
        closeNotebook: 'Ibalik ang kuwago',
        placeholder: 'Pindutin ang isang salita sa kuwento para tingnan ito.',
    },
}

// Falls back to a one-word "sentence" for material generated before
// sentence mode existed, or where Gemini sentence generation failed for
// this particular word — see remediation/hooks.ts's comment on these
// fields.
function getSentenceWords(entry: RemediationWordEntry): string[] {
    return entry.sentenceWords && entry.sentenceWords.length > 0 ? entry.sentenceWords : [entry.word]
}
function getTargetIndex(entry: RemediationWordEntry): number {
    const words = getSentenceWords(entry)
    const idx = entry.sentenceTargetIndex
    return idx != null && idx >= 0 && idx < words.length ? idx : 0
}

// The owl's speech-bubble text for the current page — prefers the
// page's own Gemini-generated coachTip when present, otherwise a line
// from the static pool, picked deterministically by page index so it's
// stable across re-renders of the same page. Structural (not
// RemediationWordEntry-specific) so the same function covers both a
// legacy word entry's optional coachTip and a RemediationPassage's
// required one.
function getCoachTipText(entry: { coachTip?: string }, pageIndex: number, lang: 'fil' | 'en'): string {
    if (entry.coachTip) return entry.coachTip
    return getStaticCoachTip('idle', pageIndex, lang)
}

// TIP HIGHLIGHTING: the owl's speech-bubble coachTip is Gemini-written
// prose (generate-remediation-passages' own prompt asks it to "reference
// something real about the actual target words," and in practice it
// usually just names them — e.g. "...gaya ng Noong at naglalaro...").
// Rather than having Gemini mark spans itself (a schema/prompt change
// that also wouldn't apply to already-saved material), this highlights
// the CURRENT PAGE's own target words wherever they literally appear in
// the tip text, client-side, at render time — same words, same
// var(--coach-target) color/bold already used on the passage text
// itself (the bubble renders inside CoachTableBackdrop's .coach-artwork,
// which defines that variable, so no new styling to invent). Works
// uniformly for passage mode AND legacy per-word mode, and for every
// already-generated tip, with zero backend changes.

// Strips leading/trailing punctuation a passage word can carry (see
// generate-remediation-passages' own prompt: "punctuation can stay
// attached to its word, e.g. 'bahay.'") so it matches the same word
// however it's punctuated inside the tip's own prose.
function stripPunctuation(word: string): string {
    return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
}

// Recovers the literal target word strings for a page directly from its
// content — content.targetIndices already marks which of content.words
// are targets (one shared shape for both passage and legacy word mode,
// see this file's header comment, "PAGES"), so no separate field is
// needed just for this.
function getTargetWordsForPage(content: CoachSentenceContent): string[] {
    const seen = new Set<string>()
    const words: string[] = []
    for (const index of content.targetIndices) {
        const word = stripPunctuation(content.words[index] ?? '')
        const key = word.toLowerCase()
        if (word && !seen.has(key)) {
            seen.add(key)
            words.push(word)
        }
    }
    return words
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Splits `text` around case-insensitive, whole-word occurrences of
// `targetWords`, rendering each highlighted span in the same accent
// color the passage text itself uses. Longer words are tried first so
// e.g. a target word that's a substring of another target word can't
// steal part of its match. Unicode word-boundary lookarounds (not \b,
// which is Latin-letter-only) so this works the same for Filipino and
// English content. Falls back to the plain text untouched if there are
// no target words to look for, or none of them actually appear in it.
function renderHighlightedTip(text: string, targetWords: string[]): ReactNode {
    const unique = Array.from(new Set(targetWords.map((w) => w.toLowerCase())))
        .map((lower) => targetWords.find((w) => w.toLowerCase() === lower)!)
        .sort((a, b) => b.length - a.length)
    if (unique.length === 0) return text
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${unique.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'giu')
    const parts = text.split(pattern)
    if (parts.length === 1) return text
    return parts.map((part, i) =>
        i % 2 === 1 ? (
            <span key={i} className="font-extrabold" style={{ color: 'var(--coach-target)' }}>
                {part}
            </span>
        ) : (
            <span key={i}>{part}</span>
        ),
    )
}

// One "page" of Reading Coach Mode content, normalized from whichever
// source this material actually has -- see this file's header comment
// ("PAGES"). Previous/Next, the backdrop's turnTo(), and the owl's
// speech bubble all work off this shape alone from here on, never
// reaching back into RemediationPassage/RemediationWordEntry directly,
// so the rest of the component doesn't need to branch on material mode
// more than once.
type CoachPage = { content: CoachSentenceContent; coachTip: string }

function pagesFromPassages(passages: RemediationPassage[], lang: 'fil' | 'en'): CoachPage[] {
    return passages.map((passage, index) => ({
        content: { words: passage.passageWords, targetIndices: passage.targetIndices },
        coachTip: getCoachTipText(passage, index, lang),
    }))
}

function pagesFromWords(words: RemediationWordEntry[], lang: 'fil' | 'en'): CoachPage[] {
    return words.map((entry, index) => ({
        content: { words: getSentenceWords(entry), targetIndices: [getTargetIndex(entry)] },
        coachTip: getCoachTipText(entry, index, lang),
    }))
}

// The whole owl overlay's home — the left half of the stage, matching
// where CoachTableBackdrop's book cover art starts. See this file's
// header comment ("SIZING/CENTERING").
const OWL_AREA_STYLE: CSSProperties = { left: '0%', top: '0%', width: '50%', height: '100%' }

// Where the notebook's word/pronounce/close content sits, laid directly
// over NOTEBOOK_ART's blank page inside CoachTableBackdrop's own SVG
// (see that file's header comment, "NOTEBOOK ART"). These percentages
// are the notebook's own local paper rect (roughly x:170-727, y:190-800
// out of the art's 0-880-ish local coordinate space) run through the
// exact same transform NOTEBOOK_ART's wrapping group uses
// (translate(54 83) scale(0.82)) and converted to percentages of the
// 1670x941 stage viewBox -- not re-derived at runtime the way the
// prototype's own positionSlot() reads a live transform matrix, because
// our stage is always uniformly scaled by CSS (see coach-stage's
// max()/aspect-ratio sizing below), so a fixed percentage stays correct
// at any viewport size without that runtime math.
const NOTEBOOK_CONTENT_STYLE: CSSProperties = { left: '11.6%', top: '25.4%', width: '27.3%', height: '53.2%' }

export default function RemediationCoach() {
    const { studentId, materialId } = useParams<{ studentId: string; materialId: string }>()
    const navigate = useNavigate()
    const { lang } = useLang()
    const t = STRINGS[lang]
    const nt = NOTEBOOK_STRINGS[lang]
    const { data: material, isLoading, error } = useRemediationMaterialQuery(materialId)
    const { speak } = usePronounceWord()
    const backdropRef = useRef<CoachTableBackdropHandle>(null)

    // Seeded once from the query, same reasoning as RemediationSession.tsx:
    // nothing else in this file changes this material's words/passages,
    // so a background refetch shouldn't stomp on in-progress local
    // state. Both sources are seeded together; a plain `seeded` flag
    // (not sessionWords' own nullness, the way it worked before) tracks
    // whether that's happened yet -- sessionPassages can be legitimately
    // null even AFTER material has loaded (a material with no passages,
    // not "not loaded yet"), so its nullness can't double as the
    // loading check the way sessionWords' null default used to.
    const [seeded, setSeeded] = useState(false)
    const [sessionWords, setSessionWords] = useState<RemediationWordEntry[]>([])
    const [sessionPassages, setSessionPassages] = useState<RemediationPassage[] | null>(null)
    const [currentIndex, setCurrentIndex] = useState(0)
    // True only while a page-turn animation is in flight — mirrors
    // CoachTableBackdropHandle.isBusy(), tracked locally too so
    // Previous/Next can disable during a turn without polling the ref
    // every render.
    const [isTurning, setIsTurning] = useState(false)
    // Word notebook state — see this file's header comment.
    const [companionMode, setCompanionMode] = useState<CompanionMode>('owl')
    const [selectedWord, setSelectedWord] = useState<string | null>(null)
    // False until the owl<->notebook toggle has actually fired once --
    // gates the owl's jump keyframe animation (see "OWL COMPANION
    // ANIMATION" in this file's header comment) so it never plays on
    // first mount.
    const [companionAnimated, setCompanionAnimated] = useState(false)

    useEffect(() => {
        if (material && !seeded) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSessionWords(material.words)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSessionPassages(material.passages ?? null)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSeeded(true)
        }
    }, [material, seeded])

    // See this file's header comment ("PAGES"): normalizes whichever
    // source this material actually has into one common shape. Passage
    // mode only kicks in once there's at least one real passage -- an
    // empty array falls back to legacy word mode the same as a wholly
    // absent one.
    const isPassageMode = sessionPassages != null && sessionPassages.length > 0
    const pages: CoachPage[] = !seeded
        ? []
        : isPassageMode
            ? pagesFromPassages(sessionPassages, lang)
            : pagesFromWords(sessionWords, lang)

    const currentPage = pages[currentIndex] ?? null
    // The owl's speech-bubble text for the current page -- see this
    // file's header comment ("COACH TIPS"). Computed here (rather than
    // inline in the render branch below) so the reading-time auto-hide
    // effect further down can depend on it directly.
    const speechBubbleText = currentPage?.coachTip ?? null
    // Highlighted version of speechBubbleText -- see "TIP HIGHLIGHTING"
    // above. Recomputed whenever the page changes (via currentPage in the
    // deps below); kept separate from speechBubbleText itself (a plain
    // string) since the auto-hide effect below and the `key={speechBubbleText}`
    // remount trick in the render branch both want the plain string, not
    // a ReactNode.
    const speechBubbleNode: ReactNode = currentPage && speechBubbleText
        ? renderHighlightedTip(speechBubbleText, getTargetWordsForPage(currentPage.content))
        : speechBubbleText
    // Reading-time auto-hide -- ported from the prototype's
    // showOwlMessage()/hideOwlMessage(): the bubble (and its Hear-It
    // button, see the "coach-owl-dialogue" CSS below) fades out on its
    // own after a reading-time budget derived from the text length,
    // separate from and longer than OwlMascot's own shorter "talking"
    // pulse timer. Formula verbatim from the prototype: readFor =
    // max(talkFor+1500, min(16000, 2500+len*65)), where talkFor =
    // max(1200, min(5500, len*48)) -- the same formula OwlMascot.tsx
    // already uses for its talking-pulse duration. Resets whenever the
    // tip text changes (a new word); keeps counting down in real time
    // even while the notebook is open rather than pausing/resetting on
    // that toggle -- simplest match for "time already spent reading it."
    const [bubbleExpired, setBubbleExpired] = useState(false)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBubbleExpired(false)
        if (!speechBubbleText) return
        const talkFor = Math.max(1200, Math.min(5500, speechBubbleText.length * 48))
        const readFor = Math.max(talkFor + 1500, Math.min(16000, 2500 + speechBubbleText.length * 65))
        const timer = window.setTimeout(() => setBubbleExpired(true), readFor)
        return () => window.clearTimeout(timer)
    }, [speechBubbleText])

    const goBack = () => navigate(`/students/remediation/${studentId}`)

    const isLastPage = pages.length > 0 && currentIndex === pages.length - 1
    const isFirstPage = currentIndex === 0
    const allPracticed = seeded && sessionWords.every(readPracticed)

    // The single place that moves to a different page — see this file's
    // header comment ("WORD NAVIGATION"). Updates currentIndex and
    // drives the backdrop's page-turn animation together, every time.
    // Guarded against overlapping calls with isTurning (CoachTableBackdrop's
    // own turnTo already no-ops while busy, but without this guard
    // React's currentIndex could still advance on a call the backdrop
    // silently dropped, desyncing the two).
    const goToPage = async (newIndex: number, direction: 'next' | 'previous') => {
        if (isTurning) return
        const nextPage = pages[newIndex]
        if (!nextPage) return
        setIsTurning(true)
        setCurrentIndex(newIndex)
        await backdropRef.current?.turnTo(nextPage.content, direction)
        setIsTurning(false)
    }
    const handlePrevious = () => {
        if (isFirstPage) return
        void goToPage(currentIndex - 1, 'previous')
    }
    const handleNext = () => {
        if (isLastPage) return
        void goToPage(currentIndex + 1, 'next')
    }

    // Tapping a story word opens the notebook on that word — see this
    // file's header comment ("WORD NOTEBOOK"). Ignored mid-page-turn so
    // a tap can't land on a word from the page that's about to leave.
    const handleWordSelect = (word: string) => {
        if (isTurning) return
        setSelectedWord(word)
        setCompanionMode('notebook')
        setCompanionAnimated(true)
    }

    const isLoadingAll = isLoading || !seeded
    let content: ReactNode

    if (isLoadingAll) {
        content = (
            <div className="mx-auto flex h-full max-w-5xl items-center gap-8 px-4 pt-24">
                <Skeleton className="h-40 w-40 shrink-0 rounded-2xl" />
                <Skeleton className="h-[420px] flex-1 rounded-3xl" />
            </div>
        )
    } else if (!material || error) {
        content = (
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 text-center">
                <section className="flex flex-col items-center gap-3 rounded-3xl border border-gray-900/5 bg-white/90 p-8 text-center shadow-lg backdrop-blur-sm dark:border-gray-100/10 dark:bg-gray-900/90">
                    <OwlMascot size={64} />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.notFoundTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">{t.notFoundDesc}</p>
                    <button
                        type="button"
                        onClick={goBack}
                        className="mt-2 rounded-full bg-purple-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#6d28d9] dark:bg-purple-600 dark:shadow-[0_4px_0_0_#5b21b6]"
                    >
                        {t.back}
                    </button>
                </section>
            </div>
        )
    } else if (allPracticed && !currentPage) {
        // Every word already practiced and the student hasn't left yet —
        // e.g. a refresh right after finishing the final word — show the
        // completion card instead of a blank/undefined page.
        content = (
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
                <div className="flex flex-col items-center gap-4 rounded-3xl border border-gray-900/5 bg-white/90 p-10 shadow-lg backdrop-blur-sm dark:border-gray-100/10 dark:bg-gray-900/90">
                    <OwlMascot size={88} celebrate />
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.completionTitle}</h2>
                    <p className="max-w-sm text-base font-medium text-gray-600 dark:text-gray-400">{t.completionDesc}</p>
                    <button
                        type="button"
                        onClick={goBack}
                        className="mt-2 rounded-full bg-purple-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#6d28d9] dark:bg-purple-600 dark:shadow-[0_4px_0_0_#5b21b6]"
                    >
                        {t.finishButton}
                    </button>
                </div>
            </div>
        )
    } else if (!currentPage) {
        content = null
    } else {
        const notebookOpen = companionMode === 'notebook'

        content = (
            <div
                className="fixed inset-0 flex items-center justify-end overflow-hidden bg-[#c9701f] dark:bg-[#150d33]"
                style={{ containerType: 'size' } as CSSProperties}
            >
                {/* Narrow/portrait fallback -- mirrors the prototype's own
                `@media (max-aspect-ratio: 4/3) { .artwork { width:
                100cqw } }`: below a 4:3 viewport aspect ratio, stop
                cover-cropping (which would eat too much of the owl/table
                side) and fall back to fitting the whole scene by width
                instead. See this file's header comment
                ("STAGE SIZING"). Also holds the owl<->notebook crossfade
                -- see ("WORD NOTEBOOK"). */}
                <style>{`
                    @media (max-aspect-ratio: 4/3) {
                        .coach-stage { width: 100cqw !important; }
                    }
                    /* OWL COMPANION ANIMATION -- see this file's header
                    comment. Split in two, matching the prototype's own
                    structure: the owl mascot jumps via keyframes (no
                    fade), the speech bubble + pronounce button hide
                    instantly (no transition at all). The notebook itself
                    is no longer a DOM card here -- it slides as a real SVG
                    group inside CoachTableBackdrop (see that file's header
                    comment, "NOTEBOOK ART"). */
                    @keyframes coach-owl-exit {
                        0%   { transform: translate(0px, 0px) scale(1); }
                        18%  { transform: translate(0px, 8px) scale(1.025, .965); }
                        55%  { transform: translate(-95px, -280px) rotate(-6deg); }
                        100% { transform: translate(-650px, -1600px) rotate(-12deg); }
                    }
                    @keyframes coach-owl-enter {
                        0%   { transform: translate(-650px, -1600px) rotate(-12deg); }
                        55%  { transform: translate(-35px, -140px) rotate(-3deg); }
                        82%  { transform: translate(0px, 6px) scale(1.02, .97); }
                        100% { transform: translate(0px, 0px) scale(1); }
                    }
                    .coach-owl-jump[data-active="false"] {
                        transform: translate(-650px, -1600px) rotate(-12deg);
                        pointer-events: none;
                    }
                    .coach-owl-jump[data-animate="true"][data-active="false"] {
                        animation: coach-owl-exit 500ms cubic-bezier(.45,0,.85,.55) both;
                    }
                    .coach-owl-jump[data-animate="true"][data-active="true"] {
                        animation: coach-owl-enter 640ms cubic-bezier(.2,.55,.4,1) both;
                    }
                    /* Speech bubble + pronounce button -- instant, no
                    transition, matching the prototype's own
                    #owlSpeechBubble rule exactly. */
                    .coach-owl-dialogue[data-active="false"] {
                        visibility: hidden;
                        opacity: 0;
                        pointer-events: none;
                    }
                    /* Only start showing the dialogue once the owl has
                    actually landed back in position -- delay matches
                    coach-owl-enter's own duration (640ms) exactly, so the
                    bubble/button don't render mid-jump. Gated by
                    data-animate (same flag as the owl jump itself) so
                    this delay never applies to the very first mount --
                    only after a real toggle. Disappearing stays instant
                    (no delay, no transition), matching the prototype's
                    own #owlSpeechBubble treatment and the earlier fix. */
                    .coach-owl-dialogue[data-animate="true"] {
                        transition: opacity 0s linear 640ms, visibility 0s linear 640ms;
                    }
                    .coach-owl-dialogue[data-animate="true"][data-active="false"] {
                        transition: none;
                    }
                    /* Reading-time auto-hide -- ported from the prototype's
                    showOwlMessage()/hideOwlMessage(): once the reading-time
                    budget for the current tip elapses (see the
                    bubbleExpired effect above), the bubble/button fade out
                    on their own, using the bubble's own gradual 180ms fade
                    (matching the prototype's #owlSpeechBubble CSS
                    transition) -- distinct from data-active's INSTANT hide
                    above, which is only for the notebook-toggle case. The
                    owl mascot itself is untouched; it doesn't jump away
                    just because the message timed out, same as the
                    prototype (hideOwlMessage only ever touches the bubble). */
                    .coach-owl-dialogue[data-expired="true"] {
                        opacity: 0;
                        visibility: hidden;
                        pointer-events: none;
                        transition: opacity 180ms ease, visibility 0s linear 180ms;
                    }
                    @media (prefers-reduced-motion: reduce) {
                        .coach-owl-jump[data-animate="true"] { animation: none !important; }
                        .coach-owl-jump { transition: opacity 150ms ease; }
                        .coach-owl-jump[data-active="false"] { opacity: 0; transform: none !important; }
                        .coach-owl-jump[data-active="true"] { opacity: 1; }
                        .coach-owl-dialogue[data-animate="true"] { transition-delay: 150ms !important; }
                    }
                    /* Notebook content slot -- thin, undecorated overlay
                    (word text + pronounce + close only) positioned over
                    NOTEBOOK_ART's blank page. No border/shadow/background
                    of its own -- the real SVG notebook underneath already
                    provides all of that, matching how the prototype's own
                    #notebookContent is a plain HTML div, not a card. */
                    .coach-notebook-slot {
                        position: absolute;
                        transition: opacity 260ms ease, transform 260ms ease;
                        transform: translateY(0);
                    }
                    .coach-notebook-slot[data-active="false"] {
                        opacity: 0;
                        transform: translateY(12px);
                        pointer-events: none;
                    }
                    /* Only start fading the notebook's buttons/text in
                    once the real SVG notebook (CoachTableBackdrop's
                    .coach-notebook-transition) has actually finished
                    sliding into place -- delay matches that group's own
                    transform transition duration (550ms) exactly, gated
                    by data-animate (same flag the owl jump/dialogue use)
                    so it never applies on first mount. Closing stays a
                    quick, undelayed fade -- the content doesn't need to
                    wait for the notebook to fully leave before it's gone. */
                    .coach-notebook-slot[data-animate="true"] {
                        transition-delay: 550ms;
                    }
                    .coach-notebook-slot[data-animate="true"][data-active="false"] {
                        transition-delay: 0s;
                    }
                    @media (prefers-reduced-motion: reduce) {
                        .coach-notebook-slot { transition: opacity 200ms ease; transition-delay: 0s !important; }
                        .coach-notebook-slot[data-active="false"] { transform: translateY(0) !important; }
                    }
                `}</style>
                <div
                    className="coach-stage relative"
                    style={{
                        width: 'max(100cqw, calc(100cqh * 1670 / 941))',
                        aspectRatio: '1670 / 941',
                    }}
                >
                    <CoachTableBackdrop
                        ref={backdropRef}
                        initialContent={currentPage.content}
                        previousDisabled={isFirstPage || isTurning}
                        nextDisabled={isLastPage || isTurning}
                        previousLabel={t.back}
                        nextLabel={t.continueButton}
                        onPrevious={handlePrevious}
                        onNext={handleNext}
                        onWordSelect={handleWordSelect}
                        selectedWord={selectedWord}
                        notebookOpen={notebookOpen}
                    >
                        <div className="absolute flex items-center justify-center" style={OWL_AREA_STYLE}>
                            <div className="relative flex flex-col items-center gap-3" style={{ width: '58%' }}>
                                {/* OWL MASCOT -- jumps off/on-canvas via
                                keyframes, see "OWL COMPANION ANIMATION". */}
                                <div
                                    className="coach-owl-jump"
                                    data-active={!notebookOpen}
                                    data-animate={companionAnimated}
                                    aria-hidden={notebookOpen}
                                    style={{ width: '66%' }}
                                >
                                    <OwlMascot
                                        size={280}
                                        speakText={speechBubbleText}
                                        paused={notebookOpen}
                                        className="h-auto w-full drop-shadow-lg"
                                    />
                                </div>
                                {/* SPEECH BUBBLE + HEAR IT -- hides
                                instantly on notebook toggle (no fade, see
                                "OWL COMPANION ANIMATION"), but fades out
                                gradually on its own once the reading-time
                                budget for this tip elapses (data-expired,
                                see the bubbleExpired effect above and its
                                own CSS rule below). */}
                                <div
                                    className="coach-owl-dialogue flex w-full flex-col items-center gap-3"
                                    data-active={!notebookOpen}
                                    data-animate={companionAnimated}
                                    data-expired={bubbleExpired}
                                    aria-hidden={notebookOpen || bubbleExpired}
                                >
                                    <div
                                        key={speechBubbleText}
                                        className="animate-coach-bubble-pop relative w-full border-[3px] border-[var(--coach-nb-cover)] bg-white/95 text-center shadow-[0_8px_0_0_rgba(109,40,217,0.15),0_10px_20px_rgba(109,40,217,0.12)] dark:border-indigo-300 dark:bg-indigo-950/85 dark:shadow-[0_0_18px_rgba(121,118,199,0.45)]"
                                        style={{
                                            padding: 'clamp(12px, 1.6cqw, 28px) clamp(14px, 2.2cqw, 32px)',
                                            borderRadius: 'clamp(22px, 2.4cqw, 44px)',
                                        }}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l-[3px] border-t-[3px] border-[var(--coach-nb-cover)] bg-white/95 dark:border-indigo-300 dark:bg-indigo-950/85"
                                        />
                                        <p
                                            className="font-semibold leading-snug text-stone-700 dark:text-indigo-100"
                                            style={{ fontSize: 'clamp(13px, 1.6cqw, 22px)' }}
                                        >
                                            {speechBubbleNode}
                                        </p>
                                    </div>
                                    {/* Only in legacy (non-passage) mode --
                                    see this file's header comment
                                    ("HEAR IT"). Recovers the one target
                                    word generically from the page content
                                    itself (content.words at its own
                                    single targetIndices[0]) rather than
                                    needing a separate raw word reference
                                    kept around just for this. */}
                                    {!isPassageMode && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                speak(
                                                    currentPage.content.words[currentPage.content.targetIndices[0]],
                                                    material.language,
                                                )
                                            }
                                            className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold text-stone-700 shadow-sm backdrop-blur-sm transition-colors duration-150 hover:bg-white/90 dark:bg-gray-900/60 dark:text-gray-200 dark:hover:bg-gray-900/80"
                                        >
                                            <Volume2 size={12} />
                                            {t.pronounce}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* WORD NOTEBOOK CONTENT -- shell only, see this
                        file's header comment. Sits directly over
                        NOTEBOOK_ART's blank page (CoachTableBackdrop.tsx
                        renders and slides the actual SVG notebook itself;
                        this is only the thin HTML content layered on top
                        of it, same as the prototype's own #notebookContent
                        over its own SVG notebook). No card/border/shadow of
                        its own -- the SVG notebook underneath provides
                        that. */}
                        <div
                            className="coach-notebook-slot flex flex-col"
                            data-active={notebookOpen}
                            data-animate={companionAnimated}
                            aria-hidden={!notebookOpen}
                            style={{
                                ...NOTEBOOK_CONTENT_STYLE,
                                gap: 'clamp(8px, 1.1cqw, 16px)',
                                paddingLeft: 'clamp(8px, 1.1cqw, 16px)',
                                paddingRight: 'clamp(8px, 1.1cqw, 16px)',
                                paddingBottom: 'clamp(8px, 1.1cqw, 16px)',
                                paddingTop: 'clamp(2px, 0.4cqw, 6px)',
                            }}
                        >
                            {/* Close -- top-right corner, flush against the
                            slot's own padding (right-0 top-0, so its inset
                            from the visual edge matches the padding every
                            other edge already uses). Pronounce sits in the
                            title row below, right-aligned the same way (no
                            extra offset of its own), so it lands directly
                            under Close -- and centered with the title text
                            on the same line, per the notebook mockup.
                            Sized with clamp(...cqw...) rather than fixed
                            Tailwind spacing -- this whole slot is a
                            percentage of the cover-fit `coach-stage` (see
                            this file's header comment, "STAGE SIZING"),
                            which grows/shrinks with the viewport, but
                            fixed-px content doesn't -- it looked right only
                            at the one window size it was eyeballed at, and
                            shrank to looking "too tiny" at wider ones. cqw
                            here is relative to the stage (the same
                            container-query context the owl's speech bubble
                            text/padding below already uses), so these track
                            the notebook's own on-screen size at any width. */}
                            <button
                                type="button"
                                onClick={() => setCompanionMode('owl')}
                                aria-label={nt.closeNotebook}
                                className="absolute flex items-center justify-center rounded-full border-2 border-[var(--coach-nb-soft)] bg-[var(--coach-nb-btn)] text-[var(--coach-nb-ink)] shadow-sm transition-colors duration-150 hover:border-[var(--coach-nb-accent)]"
                                style={{
                                    // Matches the slot's own paddingRight/
                                    // paddingTop exactly (see the slot's
                                    // style below) -- an absolutely
                                    // positioned child's containing block is
                                    // the ancestor's PADDING edge, which
                                    // excludes the ancestor's own padding,
                                    // so `right: 0`/`top: 0` here would sit
                                    // outside the row's padded content
                                    // instead of flush with it. Reusing the
                                    // same clamp() keeps Close's right edge
                                    // exactly above Pronounce's.
                                    right: 'clamp(8px, 1.1cqw, 16px)',
                                    top: 'clamp(2px, 0.4cqw, 6px)',
                                    width: 'clamp(26px, 3.4cqw, 42px)',
                                    height: 'clamp(26px, 3.4cqw, 42px)',
                                }}
                            >
                                <X style={{ width: 'clamp(13px, 1.7cqw, 18px)', height: 'clamp(13px, 1.7cqw, 18px)' }} />
                            </button>
                            {selectedWord ? (
                                <>
                                    <div
                                        className="flex items-center justify-between gap-2"
                                        style={{ paddingTop: 'clamp(32px, 4.4cqw, 50px)' }}
                                    >
                                        <h3
                                            className="font-extrabold capitalize leading-tight"
                                            style={{ color: 'var(--coach-nb-ink)', fontSize: 'clamp(18px, 2.6cqw, 32px)' }}
                                        >
                                            {selectedWord}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => speak(selectedWord, material.language)}
                                            aria-label={t.pronounce}
                                            className="flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--coach-nb-soft)] bg-[var(--coach-nb-btn)] text-[var(--coach-nb-ink)] shadow-sm transition-colors duration-150 hover:border-[var(--coach-nb-accent)]"
                                            style={{
                                                width: 'clamp(26px, 3.4cqw, 42px)',
                                                height: 'clamp(26px, 3.4cqw, 42px)',
                                            }}
                                        >
                                            <Volume2 style={{ width: 'clamp(12px, 1.6cqw, 17px)', height: 'clamp(12px, 1.6cqw, 17px)' }} />
                                        </button>
                                    </div>
                                    {/* Picture placeholder -- there's no
                                    per-word illustration data yet, so this
                                    is a permanent decorative shell (same
                                    "shell only" spirit as the rest of the
                                    notebook -- see header comment), not a
                                    real image slot. Colors match the
                                    prototype's own .word-image-placeholder
                                    exactly (border/background var(--word-
                                    soft)/var(--word-button), icon stroke
                                    var(--word-accent) at .55 opacity). */}
                                    <div
                                        className="flex flex-1 items-center justify-center rounded-2xl border-2"
                                        style={{ backgroundColor: 'var(--coach-nb-btn)', borderColor: 'var(--coach-nb-soft)' }}
                                    >
                                        <ImageIcon
                                            strokeWidth={2}
                                            style={{
                                                width: 'clamp(30px, 4.6cqw, 58px)',
                                                height: 'clamp(30px, 4.6cqw, 58px)',
                                                color: 'var(--coach-nb-accent)',
                                                opacity: 0.55,
                                            }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <p
                                    className="flex flex-1 items-center justify-center text-center font-semibold"
                                    style={{
                                        color: 'var(--coach-nb-ink)',
                                        fontSize: 'clamp(11px, 1.5cqw, 16px)',
                                        paddingTop: 'clamp(32px, 4.4cqw, 50px)',
                                    }}
                                >
                                    {nt.placeholder}
                                </p>
                            )}
                        </div>
                    </CoachTableBackdrop>
                </div>

                {/* Word notebook toggle -- bottom-left, matching the
                prototype's own `.companion-controls { position:fixed;
                left; bottom }`. See this file's header comment. */}
                <button
                    type="button"
                    onClick={() => {
                        setCompanionMode((m) => (m === 'owl' ? 'notebook' : 'owl'))
                        setCompanionAnimated(true)
                    }}
                    aria-label={notebookOpen ? nt.closeNotebook : nt.openNotebook}
                    aria-pressed={notebookOpen}
                    className="fixed bottom-4 left-4 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-gray-900/10 bg-white/85 text-gray-700 shadow-md backdrop-blur-sm transition-colors duration-200 hover:bg-white dark:border-gray-100/10 dark:bg-gray-900/80 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                    {notebookOpen ? <Bird size={18} /> : <NotebookText size={18} />}
                </button>
            </div>
        )
    }

    return <div className="relative h-full">{content}</div>
}