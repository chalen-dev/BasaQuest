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
// both by default, since there's nothing here that differs between
// "still reviewing" and "already confirmed" on its own.
//
// showScores (default true): AttemptResults.tsx's "Review" tab now
// passes showScores={false} — that page moved the numeric score pills
// into their own dedicated "Results" tab (a sub-nav local to that page)
// per explicit product decision, so they shouldn't also appear here
// while looking at the passage. The flagged-word-count badge STAYS
// regardless of showScores — also an explicit decision, since it's
// directly useful while looking at the passage, unlike the numeric
// scores. AttemptWordReview.tsx (the editable flow) never passes this
// prop, so it keeps showing scores exactly as before.
//
// COMPACT LAYOUT (per explicit ask): this used to be a tall block —
// text-3xl/4xl title, its own row, "for {student}" on a separate row
// below it, scores in a whole separate column at lg — eating a lot of
// the fixed vertical budget AttemptWordReview.tsx's bounded grid gives
// PassageCard to work with. Reworked to a much shorter footprint: a
// small kicker+title line, the passage title right under it, a thin
// divider, then ONE row (wraps only if it truly has to, e.g. many score
// pills on a narrow phone) holding "for {student}" on the left and the
// score pills + flagged badge on the right via justify-between —
// instead of a whole separate stacked block per breakpoint. Less
// height spent here directly means more of the bounded box is left for
// the actual passage before PassageCard's own scroll region kicks in.
//
// The RECORDING/audio player is still its own full-width block below
// everything else, same as before — nothing about how it renders
// changed, just what's above it.
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
    showScores?: boolean
}
export function ResultsSummaryCard({ attempt, studentName, words, manualFlags, t, audioUrl, showScores = true }: ResultsSummaryCardProps) {
    const flaggedCount = words.filter((w) => w.confidence === 'low' || !!manualFlags[w.id]).length
    return (
        <section className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-4 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-5">
            <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
            <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
            <div className="relative flex flex-col gap-3">
                <div>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">{t.kicker}</span>
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h2>
                    </div>
                    {attempt.passage_title && (
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{attempt.passage_title}</p>
                    )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-gray-900/10 pt-3 dark:border-gray-100/10">
                    {studentName && (
                        <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/15 px-4 py-1.5 text-sm font-bold text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                            <UserRound size={15} />
                            {t.forLabel} {studentName}
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
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