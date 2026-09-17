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
// UI instead. Right now this file only fetches the material and renders
// the table/book (CoachTableBackdrop) with the owl + speech bubble +
// "Hear It" button overlay and Previous/Next navigation — nothing else.
// CoachTableBackdrop.tsx now also has the prototype's microphone button
// drawn in (next to Previous/Next, matching its look exactly) but it's
// inert (aria-disabled, no handlers) until recording gets designed and
// wired back in as its own deliberate step.
//
// SCENE: CoachTableBackdrop.tsx (features/backdrop/CoachTableBackdrop.tsx)
// paints a fixed, fullscreen top-down wood-table + open-storybook scene
// behind everything, complete with the ported page-turn animation and
// its own baked-in Previous/Next (and now inert Microphone) buttons.
// This component owns everything CoachTableBackdrop does NOT: fetching
// the material, tracking which word is current, and rendering the owl +
// speech bubble as a real DOM overlay on top of the backdrop's 1670x941
// scene (passed in via `children`, positioned with percentages derived
// from that viewBox — see the OWL_BOX_STYLE comment below). Previous/
// Next themselves are NOT re-rendered here — they're the backdrop's own
// SVG buttons, driven via the onPrevious/onNext/previousDisabled/
// nextDisabled props.
//
// STAGE SIZING (COVER-FIT, not contain-fit): the backdrop is an
// absolutely-positioned 1670x941 SVG scene, and the owl/bubble overlay
// below is positioned with plain CSS percentages computed from that same
// viewBox. This used to size the stage with `width: min(100vw,
// calc(100vh*1670/941))` — a *contain*-fit that always shows the whole
// scene, which meant letterbox bars (empty space) on whichever axis the
// viewport's aspect ratio didn't match. The actual prototype does the
// opposite: it *covers* the viewport (always fills it, crops overflow
// instead of letterboxing) and anchors to the right edge — straight from
// its own CSS: `main { display:flex; justify-content:flex-end;
// container-type:size }` + `.artwork { width: max(100cqw, calc(100cqh *
// 1670/941)); aspect-ratio: 1670/941; overflow:hidden }`. That's what's
// ported below: the outer `fixed inset-0` wrapper is the CSS containment
// context (`containerType:'size'`) and is right-anchored
// (`justify-end`) with `overflow-hidden` so nothing ever leaks past the
// viewport edge; the inner `.coach-stage` div uses the same max()/
// aspect-ratio formula, in container query units (cqw/cqh) instead of
// viewport units so it measures against that wrapper specifically. Right
// -anchoring keeps the book (which lives on the right side of the 1670-
// wide viewBox) always fully visible; on a portrait/narrow viewport this
// crops from the left, same as the prototype — that's why the prototype
// also has a `@media (max-aspect-ratio: 4/3)` fallback that drops back
// to a fit-everything width, ported below as the `.coach-stage` media
// rule in the inline <style>.
//
// NOT PORTED (known gap): the prototype also runs a ResizeObserver-
// driven script that dynamically re-centers the owl mascot INSIDE
// whatever crop remains, so it's never cut off by the cover-crop. That's
// a bigger architectural piece (its owl lives inside the same SVG scene;
// ours is a separate DOM overlay positioned by fixed percentages) and
// hasn't been ported here — on an unusually tall/narrow desktop window
// the owl overlay could end up partly cropped on the left. Flagging this
// rather than silently leaving it unhandled; revisit if it turns out to
// matter in practice.
//
// LAYOUT: this route no longer sits under RemediationSessionLayout (the
// shared header-plus-Exit chrome used by the flashcard "Practice"
// drill) — it has its own RemediationCoachLayout instead (no header at
// all, just a floating Exit top-left and Day/Night toggle top-right),
// so this component can go truly full-bleed edge to edge instead of
// working around a fixed header's reserved height. There's no shared
// header here to fetch the student profile either — RemediationCoach
// itself doesn't need the pupil's name for anything, so it isn't
// fetched here at all.
//
// WORD NAVIGATION: Previous/Next move currentIndex directly, any time —
// not gated on anything (explicit product decision: free navigation).
// goToWord() below is the single place that does this: it updates
// React's currentIndex AND tells the backdrop to animate the page-turn
// to the new word's content, together, every time.
//
// COACH TIPS: the owl's speech-bubble text comes from getCoachTipText()
// below — the current word's Gemini-generated coachTip
// (remediation/hooks.ts) when present, otherwise a line from the static
// STATIC_COACH_TIPS pool (remediationCoachStrings.ts), picked
// deterministically by word index so it's stable across re-renders of
// the same word. NOTE: the fallback pool is keyed by the UI's own
// display language (`lang` from useLang(), same as every STRINGS[lang]
// lookup elsewhere in this file) — NOT by the material's content
// language. Those are two different things (a Filipino-UI teacher
// coaching through an English-content word list should still see
// Filipino chrome/tips), so this deliberately does not reuse
// `material.language` for that lookup. Until recording/scoring is
// rebuilt, this always asks for the 'idle' tip — there's no other state
// yet.
//
// SENTENCE MODE: the book shows a short Gemini-generated SENTENCE using
// the weak word (material.words[i].sentenceWords, generated once at
// material-generation time — see AttemptResults.tsx's attachSentences()
// and remediation/hooks.ts's header comment), with the target word
// visually emphasized — rendered INSIDE CoachTableBackdrop's SVG story
// layer (via buildContent() below), not as separate DOM text.
//
// Materials generated before sentence mode existed (or where sentence
// generation failed for a given word) have no sentenceWords array —
// getSentenceWords()/getTargetIndex() below fall back to treating the
// bare word as its own one-word "sentence" in that case, so old
// material still plays, just without a full sentence to read.
//
// OWL: the mascot here is OwlMascot.tsx — the real animated inline-SVG
// owl ported from the prototype (breathing/swaying idle loop, blinking,
// a talking pulse whenever the speech-bubble text changes, a hover glow
// using the prototype's own --owl-rim color, etc.). Deliberately NOT
// Owl.tsx (the flat per-mood PNG) — see OwlMascot.tsx's own header
// comment for why that's a separate component instead of a rewrite of
// Owl.tsx in place. `listening`/`celebrate` aren't driven by anything
// yet since there's no recording/scoring state in this file right now —
// they'll get wired up alongside the mic.
//
// SIZING: the owl box and the speech bubble are both sized as
// percentages/container-query units of the stage (OWL_BOX_STYLE's width
// went 20% -> 34%, its inner wrapper 58% -> 74% of that box, to match
// how large the owl reads in the prototype at its normal, uncropped
// scale). The bubble's padding/font-size/border-radius use `cqw`-based
// clamp()s instead of fixed px, mirroring the prototype's own
// positionBubble() (which scales those exact same properties off
// `sceneWidth/1670`) — e.g. its 26px font at full scale becomes
// `clamp(16px, 1.6cqw, 26px)` here, since 26/1670*100 ≈ 1.6cqw. This
// makes both scale with the stage's actual on-screen size instead of
// staying a fixed pixel size regardless of window size.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Volume2 } from 'lucide-react'
import { useLang } from '../../../../contexts/LangContext.tsx'
import { OwlMascot } from '../../../../components/ui/OwlMascot.tsx'
import { Skeleton } from '../../../../components/ui/Skeleton.tsx'
import { readPracticed, useRemediationMaterialQuery, type RemediationWordEntry } from '../hooks.ts'
import { usePronounceWord } from '../session/features/usePronounceWord.ts'
import {
    CoachTableBackdrop,
    type CoachSentenceContent,
    type CoachTableBackdropHandle,
} from './features/backdrop/CoachTableBackdrop.tsx'
import { STRINGS, getStaticCoachTip } from './features/remediationCoachStrings.ts'

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

// Builds the exact shape CoachTableBackdrop wants for a word entry.
// (No scoring yet, so this never carries verdicts — CoachTableBackdrop
// renders that case as plain, unstyled text.)
function buildContent(entry: RemediationWordEntry): CoachSentenceContent {
    return { words: getSentenceWords(entry), targetIndex: getTargetIndex(entry) }
}

// The owl's speech-bubble text for the current word — prefers the
// word's own Gemini-generated coachTip when present, otherwise a line
// from the static pool, picked deterministically by word index so it's
// stable across re-renders of the same word.
function getCoachTipText(currentWord: RemediationWordEntry, wordIndex: number, lang: 'fil' | 'en'): string {
    if (currentWord.coachTip) return currentWord.coachTip
    return getStaticCoachTip('idle', wordIndex, lang)
}

// Owl + speech bubble + "Hear It" button, top-left of the table — see
// this file's header comment ("SIZING") for how these percentages
// relate to the prototype's own owl scale. Eyeballed against
// CoachTableBackdrop's 1670x941 viewBox (not measured against a live
// render) — nudge these if it ends up misaligned once you see this
// running.
const OWL_BOX_STYLE: CSSProperties = { left: '4%', top: '4%', width: '34%' }

export default function RemediationCoach() {
    const { studentId, materialId } = useParams<{ studentId: string; materialId: string }>()
    const navigate = useNavigate()
    const { lang } = useLang()
    const t = STRINGS[lang]
    const { data: material, isLoading, error } = useRemediationMaterialQuery(materialId)
    const { speak } = usePronounceWord()
    const backdropRef = useRef<CoachTableBackdropHandle>(null)

    // Seeded once from the query, same reasoning as RemediationSession.tsx:
    // nothing else in this file changes this material's words, so a
    // background refetch shouldn't stomp on in-progress local state.
    const [sessionWords, setSessionWords] = useState<RemediationWordEntry[] | null>(null)
    const [currentIndex, setCurrentIndex] = useState(0)
    // True only while a page-turn animation is in flight — mirrors
    // CoachTableBackdropHandle.isBusy(), tracked locally too so
    // Previous/Next can disable during a turn without polling the ref
    // every render.
    const [isTurning, setIsTurning] = useState(false)

    useEffect(() => {
        if (material && sessionWords === null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSessionWords(material.words)
        }
    }, [material, sessionWords])

    const currentWord = sessionWords?.[currentIndex] ?? null

    const goBack = () => navigate(`/students/remediation/${studentId}`)

    const isLastWord = sessionWords != null && currentIndex === sessionWords.length - 1
    const isFirstWord = currentIndex === 0
    const allPracticed = sessionWords != null && sessionWords.every(readPracticed)

    // The single place that moves to a different word — see this file's
    // header comment ("WORD NAVIGATION"). Updates currentIndex and
    // drives the backdrop's page-turn animation together, every time.
    // Guarded against overlapping calls with isTurning (CoachTableBackdrop's
    // own turnTo already no-ops while busy, but without this guard
    // React's currentIndex could still advance on a call the backdrop
    // silently dropped, desyncing the two).
    const goToWord = async (newIndex: number, direction: 'next' | 'previous') => {
        if (!sessionWords || isTurning) return
        const nextWord = sessionWords[newIndex]
        if (!nextWord) return
        setIsTurning(true)
        setCurrentIndex(newIndex)
        await backdropRef.current?.turnTo(buildContent(nextWord), direction)
        setIsTurning(false)
    }
    const handlePrevious = () => {
        if (isFirstWord) return
        void goToWord(currentIndex - 1, 'previous')
    }
    const handleNext = () => {
        if (isLastWord) return
        void goToWord(currentIndex + 1, 'next')
    }

    const isLoadingAll = isLoading || sessionWords === null
    let content: ReactNode

    if (isLoadingAll) {
        content = (
            <div className="mx-auto flex h-full max-w-5xl items-center gap-8 px-4 pt-24">
                <Skeleton className="h-40 w-40 shrink-0 rounded-2xl" />
                <Skeleton className="h-[420px] flex-1 rounded-3xl" />
            </div>
        )
    } else if (!material || error || !sessionWords) {
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
    } else if (allPracticed && !currentWord) {
        // Every word already practiced and the student hasn't left yet —
        // e.g. a refresh right after finishing the final word — show the
        // completion card instead of a blank/undefined word.
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
    } else if (!currentWord) {
        content = null
    } else {
        const speechBubbleText = getCoachTipText(currentWord, currentIndex, lang)

        content = (
            <div
                className="fixed inset-0 flex items-center justify-end overflow-hidden bg-[#c9701f] dark:bg-[#150d33]"
                style={{ containerType: 'size' } as CSSProperties}
            >
                {/* Narrow/portrait fallback — mirrors the prototype's own
                `@media (max-aspect-ratio: 4/3) { .artwork { width:
                100cqw } }`: below a 4:3 viewport aspect ratio, stop
                cover-cropping (which would eat too much of the owl/table
                side) and fall back to fitting the whole scene by width
                instead. See this file's header comment
                ("STAGE SIZING"). */}
                <style>{`
                    @media (max-aspect-ratio: 4/3) {
                        .coach-stage { width: 100cqw !important; }
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
                        initialContent={buildContent(currentWord)}
                        previousDisabled={isFirstWord || isTurning}
                        nextDisabled={isLastWord || isTurning}
                        previousLabel={t.back}
                        nextLabel={t.continueButton}
                        onPrevious={handlePrevious}
                        onNext={handleNext}
                    >
                        {/* OWL + SPEECH BUBBLE */}
                        <div className="absolute flex flex-col items-center gap-2" style={OWL_BOX_STYLE}>
                            <div style={{ width: '74%' }}>
                                <OwlMascot
                                    size={280}
                                    speakText={speechBubbleText}
                                    className="h-auto w-full drop-shadow-lg"
                                />
                            </div>
                            <div
                                key={speechBubbleText}
                                className="animate-coach-bubble-pop relative w-full border border-purple-300/60 bg-white/95 text-center shadow-md dark:border-indigo-300/30 dark:bg-indigo-950/85 dark:shadow-[0_0_18px_0_rgba(124,108,255,0.25)]"
                                style={{
                                    padding: 'clamp(12px, 1.6cqw, 28px) clamp(14px, 2.2cqw, 32px)',
                                    borderRadius: 'clamp(22px, 2.4cqw, 44px)',
                                }}
                            >
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-purple-300/60 bg-white/95 dark:border-indigo-300/30 dark:bg-indigo-950/85"
                                />
                                <p
                                    className="font-semibold leading-snug text-stone-700 dark:text-indigo-100"
                                    style={{ fontSize: 'clamp(13px, 1.6cqw, 22px)' }}
                                >
                                    {speechBubbleText}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => speak(currentWord.word, material.language)}
                                className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold text-stone-700 shadow-sm backdrop-blur-sm transition-colors duration-150 hover:bg-white/90 dark:bg-gray-900/60 dark:text-gray-200 dark:hover:bg-gray-900/80"
                            >
                                <Volume2 size={12} />
                                {t.pronounce}
                            </button>
                        </div>
                    </CoachTableBackdrop>
                </div>
            </div>
        )
    }

    return <div className="relative h-full">{content}</div>
}