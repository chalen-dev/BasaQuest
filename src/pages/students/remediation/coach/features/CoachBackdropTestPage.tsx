// File: src/pages/students/remediation/coach/features/CoachBackdropTestPage.tsx
//
// Dev-only visual harness for CoachTableBackdrop.tsx — mounts it with a
// few hardcoded sample sentences and a floating control panel (Prev/
// Next, simulate-pass/simulate-fail/clear verdicts, day/night toggle) so
// the page-turn animation, the 16-strip text bend, and the live word
// coloring can all be checked by eye without needing a real
// RemediationMaterial row or a working scoring service. No auth guard,
// no data fetching — registered as a standalone route
// (/dev/coach-backdrop in App.tsx) outside every layout/route group.
//
// NOT linked from anywhere in the app's normal navigation — reach it by
// typing the URL directly. Safe to delete this file and its route once
// CoachTableBackdrop.tsx has been checked against the real thing inside
// RemediationCoach.tsx and you don't need the isolated harness anymore.
import { useRef, useState } from 'react'
import { ThemeToggleButton } from '../../../../../components/buttons/ThemeToggleButton.tsx'
import {
    CoachTableBackdrop,
    type CoachSentenceContent,
    type CoachTableBackdropHandle,
    type CoachWordVerdict,
} from './backdrop/CoachTableBackdrop.tsx'

// A handful of sample sentences with different lengths/target
// positions, specifically to exercise the word-wrap logic (short one-
// word "sentence," a long one that should wrap to 2-3 lines, target
// word at the start vs. in the middle vs. at the end).
const SAMPLES: { words: string[]; targetIndex: number }[] = [
    { words: ['Bahay'], targetIndex: 0 },
    { words: ['The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog', 'again', 'and', 'again'], targetIndex: 3 },
    { words: ['Ang', 'aso', 'ay', 'tumakbo', 'nang', 'mabilis', 'sa', 'parke'], targetIndex: 6 },
    { words: ['She', 'sells', 'seashells', 'by', 'the', 'seashore'], targetIndex: 2 },
]

function contentFor(index: number, verdictMode: 'none' | 'pass' | 'fail'): CoachSentenceContent {
    const sample = SAMPLES[index]
    if (verdictMode === 'none') return { words: sample.words, targetIndex: sample.targetIndex }
    const verdicts: (CoachWordVerdict | null)[] = sample.words.map((_, i) => {
        if (i === sample.targetIndex) return verdictMode === 'pass' ? 'correct' : 'miscue'
        // Sprinkle a couple of extra miscues elsewhere so the "whole
        // sentence gets colored, not just the target word" behavior is
        // actually visible, not just the target-word case.
        return i % 3 === 1 ? 'miscue' : i % 3 === 0 ? 'correct' : null
    })
    return { words: sample.words, targetIndex: sample.targetIndex, verdicts }
}

export default function CoachBackdropTestPage() {
    const backdropRef = useRef<CoachTableBackdropHandle>(null)
    const [index, setIndex] = useState(0)
    const [verdictMode, setVerdictMode] = useState<'none' | 'pass' | 'fail'>('none')
    const [isTurning, setIsTurning] = useState(false)

    const goTo = async (newIndex: number, direction: 'next' | 'previous') => {
        if (isTurning || newIndex < 0 || newIndex >= SAMPLES.length) return
        setIsTurning(true)
        setVerdictMode('none')
        setIndex(newIndex)
        await backdropRef.current?.turnTo(contentFor(newIndex, 'none'), direction)
        setIsTurning(false)
    }

    const applyVerdictMode = (mode: 'none' | 'pass' | 'fail') => {
        setVerdictMode(mode)
        backdropRef.current?.setCurrentContent(contentFor(index, mode))
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#c9701f] dark:bg-[#150d33]">
            {/* Same aspect-locked stage formula as RemediationCoach.tsx —
            see that file's header comment ("STAGE SIZING") for why. */}
            <div
                className="relative"
                style={{
                    width: 'min(100vw, calc(100vh * 1670 / 941))',
                    height: 'min(100vh, calc(100vw * 941 / 1670))',
                }}
            >
                <CoachTableBackdrop
                    ref={backdropRef}
                    initialContent={contentFor(0, 'none')}
                    previousDisabled={index === 0 || isTurning}
                    nextDisabled={index === SAMPLES.length - 1 || isTurning}
                    previousLabel="Previous sample"
                    nextLabel="Next sample"
                    onPrevious={() => void goTo(index - 1, 'previous')}
                    onNext={() => void goTo(index + 1, 'next')}
                />
            </div>

            {/* Floating dev control panel — deliberately plain/unstyled-
            ish (not trying to match the app's kid-facing visual
            language) since this is a harness, not a real screen. */}
            <div className="fixed left-4 top-4 z-50 flex w-64 flex-col gap-3 rounded-xl bg-black/80 p-4 font-mono text-xs text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <span className="font-bold">CoachTableBackdrop harness</span>
                    <ThemeToggleButton />
                </div>
                <div>
                    Sample {index + 1} / {SAMPLES.length}
                    {isTurning ? ' (turning...)' : ''}
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => void goTo(index - 1, 'previous')}
                        disabled={index === 0 || isTurning}
                        className="flex-1 rounded bg-white/10 px-2 py-1 disabled:opacity-30"
                    >
                        ← Prev
                    </button>
                    <button
                        type="button"
                        onClick={() => void goTo(index + 1, 'next')}
                        disabled={index === SAMPLES.length - 1 || isTurning}
                        className="flex-1 rounded bg-white/10 px-2 py-1 disabled:opacity-30"
                    >
                        Next →
                    </button>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-white/60">setCurrentContent (no page turn):</span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => applyVerdictMode('none')}
                            className={`flex-1 rounded px-2 py-1 ${verdictMode === 'none' ? 'bg-white/30' : 'bg-white/10'}`}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={() => applyVerdictMode('pass')}
                            className={`flex-1 rounded px-2 py-1 ${verdictMode === 'pass' ? 'bg-teal-500/60' : 'bg-white/10'}`}
                        >
                            Pass
                        </button>
                        <button
                            type="button"
                            onClick={() => applyVerdictMode('fail')}
                            className={`flex-1 rounded px-2 py-1 ${verdictMode === 'fail' ? 'bg-amber-500/60' : 'bg-white/10'}`}
                        >
                            Fail
                        </button>
                    </div>
                </div>
                <div className="text-white/50">
                    Checks: page-turn both directions, 16-strip text bend on a long
                    wrapped sentence, target-word bolding, whole-sentence verdict
                    coloring, day/night crossfade.
                </div>
            </div>
        </div>
    )
}