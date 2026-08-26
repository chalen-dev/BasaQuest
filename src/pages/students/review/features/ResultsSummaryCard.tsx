// File: ResultsSummaryCard.tsx
// File: src/pages/students/review/features/ResultsSummaryCard.tsx
//
// Header/summary panel for a reading attempt — kicker/title, who this
// reading is for, the recording playback, the per-metric score pills,
// and the flagged-word-count badge. Split out from PassageCard.tsx on
// purpose, per explicit ask: the passage panel should hold ONLY the
// passage text, with everything about the recording/results living in
// its own separate visual container instead of sharing one card. Used
// by both the editable review flow (AttemptWordReview.tsx) and the
// read-only results flow (AttemptResults.tsx) — identical rendering in
// both, since there's nothing here that differs between "still
// reviewing" and "already confirmed".
//
// LAYOUT: TWO STACKED PIECES, not one shared grid area.
//   1) A title/scores ROW — stacked (flex-col) under lg, and a
//      grid-cols-[1fr_auto] row at/above it: kicker/title/passage-title/
//      student-badge on the left, score pills + flagged badge on the
//      right. The score column uses lg:self-center (not the row's
//      default top alignment) so it sits vertically centered within the
//      row instead of pinned flush to the top — per explicit ask, it
//      was reading as too high/cramped against the top edge.
//   2) The RECORDING/audio player, entirely OUTSIDE that grid, as its
//      own full-width block below it. Two previous passes tried to make
//      the audio bar full-width by tuning flex-grow/justify-between,
//      then by making it a grid column — both failed because the audio
//      player was nested INSIDE the title column, which a 2-column
//      grid/flex row structurally boxes to less than the card's full
//      width whenever the other column (scores) needs its own width
//      reserved. Pulling it out as a sibling below the row is what
//      actually guarantees edge-to-edge width.
//
// flaggedCount is computed here (not passed in) from words + manualFlags
// — "needs attention" combines system-flagged (confidence === 'low')
// and manually-flagged words, the same combined signal PassageCard used
// to compute before the split.
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
}
export function ResultsSummaryCard({ attempt, studentName, words, manualFlags, t, audioUrl }: ResultsSummaryCardProps) {
    const flaggedCount = words.filter((w) => w.confidence === 'low' || !!manualFlags[w.id]).length
    return (
        <section className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
            <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
            <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
            <div className="relative flex flex-col gap-5">
                <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-6">
                    <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">{t.kicker}</span>
                        <h2 className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-4xl">{t.title}</h2>
                        {attempt.passage_title && (
                            <p className="mt-1 text-base font-medium text-gray-600 dark:text-gray-400">{attempt.passage_title}</p>
                        )}
                        {studentName && (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal-500/15 px-4 py-1.5 text-sm font-bold text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                                <UserRound size={15} />
                                {t.forLabel} {studentName}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-start gap-3 lg:items-end lg:justify-self-end lg:self-center">
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                            <ScorePill label={t.accuracy} value={attempt.accuracy_score} />
                            <ScorePill label={t.fluency} value={attempt.fluency_score} />
                            <ScorePill label={t.completeness} value={attempt.completeness_score} />
                            <ScorePill label={t.prosody} value={attempt.prosody_score} />
                            <ScorePill label={t.pronunciation} value={attempt.pron_score} />
                        </div>
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
                </div>
                {audioUrl && (
                    <div className="flex w-full flex-col gap-1.5 rounded-2xl border border-gray-900/5 bg-white/60 p-3 dark:border-gray-100/10 dark:bg-gray-900/40">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {t.recordingLabel}
                        </span>
                        <AudioPlayer src={audioUrl} className="w-full px-1 py-1" />
                    </div>
                )}
            </div>
        </section>
    )
}