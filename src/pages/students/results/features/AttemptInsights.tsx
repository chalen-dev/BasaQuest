// File: src/pages/students/results/features/AttemptInsights.tsx
//
// The entire "Results" tab body for AttemptResults.tsx — score pills,
// the Insights block (summary sentence + three insight cards), and the
// Generate Remediation Material / View Pupil's Remediation List buttons
// — split out once AttemptResults.tsx grew too large. Takes every value
// it needs as already-computed props (dominantWeakness/wcpm/
// agreementCount/etc. are all computed in AttemptResults.tsx via
// attemptResultsHelpers.ts) rather than recomputing anything itself, so
// this stays a pure presentation component.
import React from 'react'
import { Ear, Gauge, MessageSquareText, MinusCircle, Sparkles, ThumbsUp } from 'lucide-react'
import type { AttemptDetail } from '../../review/hooks'
import type { AttemptWordReviewStrings } from '../../review/features/attemptWordReviewStrings'
import { ScorePill } from '../../review/features/AttemptWordReviewShared'
import type { AttemptResultsStrings } from './attemptResultsStrings'
// Small icon per dominant weakness type — Insertion doesn't have a
// dedicated icon elsewhere in this codebase (PassageCard/SelectedWordsCard
// mark it with a dashed border instead of a corner icon), so it falls
// back to the same MinusCircle used for Omission here rather than
// pulling in a fourth icon just for this one card. Kept local since
// this is the only place a dominant-weakness type gets an icon.
function weaknessIcon(type: string) {
    if (type === 'Mispronunciation') return <Ear size={20} />
    return <MinusCircle size={20} />
}
type AttemptInsightsProps = {
    attempt: AttemptDetail
    reviewT: AttemptWordReviewStrings
    t: AttemptResultsStrings
    dominantWeakness: { type: string; count: number; total: number } | null
    wcpm: number | null
    agreementCount: number
    systemFlaggedWordsCount: number
    insightSummary: string
    onGenerateRemediation: () => void
    isGenerating: boolean
    onViewRemediation: () => void
}
export const AttemptInsights: React.FC<AttemptInsightsProps> = ({
                                                                    attempt,
                                                                    reviewT,
                                                                    t,
                                                                    dominantWeakness,
                                                                    wcpm,
                                                                    agreementCount,
                                                                    systemFlaggedWordsCount,
                                                                    insightSummary,
                                                                    onGenerateRemediation,
                                                                    isGenerating,
                                                                    onViewRemediation,
                                                                }) => {
    const hasAnyInsight = dominantWeakness != null || wcpm != null || systemFlaggedWordsCount > 0
    // Small self-contained insight card — label, big value, one line of
    // context underneath. Its own visual shape (not ScorePill, which is
    // a compact inline pill meant for the header row) since these carry
    // more explanatory text than a pill can hold.
    const insightCard = (icon: React.ReactNode, label: string, value: string, desc: string) => (
        <div className="flex flex-col gap-2 rounded-2xl border border-gray-900/5 bg-white/60 p-4 dark:border-gray-100/10 dark:bg-gray-900/40">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                {icon}
                <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
            </div>
            <span className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{value}</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{desc}</span>
        </div>
    )
    return (
        <section className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
            <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
            <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
            <div className="relative">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.resultsTabTitle}</h2>
                <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{t.resultsTabSubtitle}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                    <ScorePill label={reviewT.accuracy} value={attempt.accuracy_score} />
                    <ScorePill label={reviewT.fluency} value={attempt.fluency_score} />
                    <ScorePill label={reviewT.completeness} value={attempt.completeness_score} />
                    <ScorePill label={reviewT.prosody} value={attempt.prosody_score} />
                    <ScorePill label={reviewT.pronunciation} value={attempt.pron_score} />
                </div>
                {hasAnyInsight && (
                    <div className="mt-8 border-t border-dashed border-gray-900/10 pt-6 dark:border-gray-100/10">
                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.insightsTitle}</h3>
                        <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{t.insightsSubtitle}</p>
                        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 dark:border-teal-400/20 dark:bg-teal-400/5">
                            <MessageSquareText size={20} className="mt-0.5 shrink-0 text-teal-600 dark:text-teal-300" />
                            <p className="text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-300">{insightSummary}</p>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {dominantWeakness &&
                                insightCard(
                                    weaknessIcon(dominantWeakness.type),
                                    t.weaknessCardTitle,
                                    dominantWeakness.type,
                                    t.weaknessCardDesc(dominantWeakness.type, dominantWeakness.count, dominantWeakness.total)
                                )}
                            {wcpm != null &&
                                insightCard(<Gauge size={20} />, t.wcpmCardTitle, `${wcpm}`, t.wcpmUnit)}
                            {systemFlaggedWordsCount > 0 &&
                                insightCard(
                                    <ThumbsUp size={20} />,
                                    t.agreementCardTitle,
                                    `${agreementCount}/${systemFlaggedWordsCount}`,
                                    t.agreementCardDesc(agreementCount, systemFlaggedWordsCount)
                                )}
                        </div>
                        {dominantWeakness && (
                            <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                                <button
                                    type="button"
                                    onClick={onViewRemediation}
                                    className="rounded-full border border-gray-900/10 bg-white px-4 py-2 text-xs font-bold text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10"
                                >
                                    {t.viewRemediationButton}
                                </button>
                                <button
                                    type="button"
                                    onClick={onGenerateRemediation}
                                    disabled={isGenerating}
                                    className={`flex items-center justify-center gap-2 rounded-full bg-purple-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#6d28d9] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#6d28d9] dark:bg-purple-600 dark:shadow-[0_4px_0_0_#5b21b6] ${
                                        isGenerating ? 'cursor-not-allowed opacity-60 hover:translate-y-0' : 'cursor-pointer'
                                    }`}
                                >
                                    <Sparkles size={16} />
                                    {isGenerating ? t.generatingButton : t.generateButton}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}
export default AttemptInsights