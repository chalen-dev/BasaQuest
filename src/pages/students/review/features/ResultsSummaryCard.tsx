// File: ResultsSummaryCard.tsx
// File: src/pages/students/review/features/ResultsSummaryCard.tsx
//
// Header/summary panel. No resize-related props of its own — in
// AttemptWordReview.tsx's draggable-divider layout, this component's
// wrapper div gets an explicit pixel height + its own internal scroll
// when the teacher drags it smaller than its natural content height;
// this component itself is unaware of that and just renders its normal
// content, same as always.
//
// STUDENT NAME MOVED INTO THE TITLE ROW: the student-name pill now sits
// on the same line as the kicker/title text (right-aligned via
// justify-between) instead of its own row further down. This is
// deliberate — AttemptWordReview.tsx measures this exact row
// (`headerRef`) to compute how short the card can be dragged: when
// fully contracted, this title+name row is the only thing left
// visible.
import { Check, CircleAlert, UserRound } from 'lucide-react'
import type { AttemptDetail, AttemptWord } from '../hooks'
import type { AttemptWordReviewStrings } from './attemptWordReviewStrings'
import { ScorePill } from './AttemptWordReviewShared'
import { AudioPlayer } from '../../../../components/ui/AudioPlayer.tsx'

type ResultsSummaryCardProps = {
    attempt: AttemptDetail
    studentName?: string | null
    words: AttemptWord[]
    manualFlags: Record<string, boolean>
    t: AttemptWordReviewStrings
    audioUrl: string | null
    showScores?: boolean
    // When false, the entire recording block (player AND the
    // "no recording" fallback text) is skipped — used on the
    // confirmed-results page, where the recording is always deleted
    // once an attempt is finalized, so there's nothing meaningful to
    // show either way. Defaults to true so the pre-confirm editable
    // AttemptWordReview.tsx flow keeps showing it as before.
    showRecording?: boolean
    // See this file's header comment — used only so
    // AttemptWordReview.tsx can measure this row's rendered height for
    // its drag-to-minimum calculation. Not a resize/layout prop.
    headerRef?: React.Ref<HTMLDivElement>
}

export function ResultsSummaryCard({ attempt, studentName, words, manualFlags, t, audioUrl, showScores = true, showRecording = true, headerRef }: ResultsSummaryCardProps) {
    const flaggedCount = words.filter((w) => w.confidence === 'low' || !!manualFlags[w.id]).length
    return (
        <section className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-4 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-5">
            <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
            <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
            <div className="relative flex flex-col gap-3">
                <div ref={headerRef} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">{t.kicker}</span>
                            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h2>
                        </div>
                        {attempt.passage_title && (
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{attempt.passage_title}</p>
                        )}
                    </div>
                    {studentName && (
                        <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-teal-500/15 px-4 py-1.5 text-sm font-bold text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                            <UserRound size={15} />
                            {t.forLabel} {studentName}
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center justify-start gap-2 border-t border-dashed border-gray-900/10 pt-3 dark:border-gray-100/10">
                    {showScores && (
                        <>
                            <ScorePill label={t.accuracy} value={attempt.accuracy_score} />
                            <ScorePill label={t.fluency} value={attempt.fluency_score} />
                            <ScorePill label={t.completeness} value={attempt.completeness_score} />
                            <ScorePill label={t.prosody} value={attempt.prosody_score} />
                            <ScorePill label={t.pronunciation} value={attempt.pron_score} />
                        </>
                    )}
                    {flaggedCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                            <CircleAlert size={13} />
                            {t.needsAttention(flaggedCount)}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-600 dark:text-green-400">
                            <Check size={13} />
                            {t.allClear}
                        </span>
                    )}
                </div>
                {showRecording && (
                    attempt.audio_path ? (
                        audioUrl && (
                            <div className="flex w-full flex-col gap-1.5 rounded-2xl border border-gray-900/5 bg-white/60 p-3 dark:border-gray-100/10 dark:bg-gray-900/40">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    {t.recordingLabel}
                                </span>
                                <AudioPlayer src={audioUrl} className="w-full px-1 py-1" />
                            </div>
                        )
                    ) : (
                        <div className="flex w-full flex-col gap-1.5 rounded-2xl border border-gray-900/5 bg-white/60 p-3 dark:border-gray-100/10 dark:bg-gray-900/40">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {t.recordingLabel}
                            </span>
                            <p className="text-sm font-medium italic text-gray-500 dark:text-gray-400">
                                {t.noRecordingMessage}
                            </p>
                        </div>
                    )
                )}
            </div>
        </section>
    )
}