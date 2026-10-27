// File: src/pages/proficiency/pre_assessment/assessment_session/features/PassageReview.tsx
// The teacher's read-through of a generated passage, shown before an assisted
// ("Now") session starts. The teacher reads it, can edit the title and text or
// generate a new passage, sees a 1-5 star difficulty estimate (re-rated live as
// the text is edited) and whether it suits the pupil's grade, and must tick
// "I have read this passage" before the session begins.
import { useState } from 'react'
import { ClipboardCheck, RefreshCw } from 'lucide-react'
import { StarRating } from '../../../../../components/ui/StarRating.tsx'
import { DifficultyPicker } from './DifficultyPicker.tsx'
import { useTheme } from '../../../../../contexts/ThemeContext.tsx'
import { showConfirmation } from '../../../../../helpers/swalHelpers.ts'
import { countWords, gradeFit, rateDifficulty } from '../../../../../lib/passageDifficulty.ts'
import type { AssessmentStrings, Passage } from '../assessmentSessionStrings.ts'
import type { Lang } from '../../../../../components/buttons/LangToggle.tsx'

type PassageReviewProps = {
    t: AssessmentStrings
    passage: Passage
    lang: Lang
    gradeLevel: number
    gradeMissing: boolean
    // What the teacher asked for; changed here to generate a new one at another level.
    requestedDifficulty: number
    suggestedDifficulty: number
    onDifficultyChange: (value: number) => void
    onApprove: (passage: Passage) => void
    onRegenerate: () => void
}

const FIT_STYLE = {
    easier: 'bg-sky-500/15 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
    fits: 'bg-teal-500/15 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300',
    harder: 'bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
} as const

const fieldClass =
    'w-full rounded-xl border-2 border-gray-900/10 bg-white px-4 py-3 text-base font-medium text-gray-900 outline-none focus:border-teal-500 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-50'

export function PassageReview({ t, passage, lang, gradeLevel, gradeMissing, requestedDifficulty, suggestedDifficulty, onDifficultyChange, onApprove, onRegenerate }: PassageReviewProps) {
    const { theme } = useTheme()
    const [title, setTitle] = useState(passage.title)
    const [text, setText] = useState(passage.passage)
    const [readIt, setReadIt] = useState(false)

    const stars = rateDifficulty(text, lang)
    const fit = gradeFit(stars, gradeLevel)
    const fitText = { easier: t.fitEasier, fits: t.fitFits, harder: t.fitHarder }[fit](gradeLevel)
    const edited = title !== passage.title || text !== passage.passage
    const canApprove = readIt && text.trim().length > 0 && title.trim().length > 0

    const handleRegenerate = async () => {
        if (edited) {
            const ok = await showConfirmation(
                t.regenerateConfirmTitle,
                t.regenerateConfirmText,
                theme === 'dark',
                'warning',
                t.regenerateConfirmButton,
            )
            if (!ok) return
        }
        onRegenerate()
    }

    return (
        <section className="flex flex-col gap-5 rounded-3xl border border-gray-900/5 bg-white p-6 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-8">
            <div>
                <span className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                    {t.reviewKicker}
                </span>
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-3xl">{t.reviewTitle}</h1>
                <p className="mt-1 max-w-xl text-base font-medium text-gray-600 dark:text-gray-400">{t.reviewDesc}</p>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl bg-gray-900/5 p-4 dark:bg-gray-100/5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{t.difficultyLabel}</span>
                    <StarRating value={stars} label={`${stars} / 5`} />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.difficultyScale}</span>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${FIT_STYLE[fit]}`}>{fitText}</span>
                {gradeMissing && (
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{t.gradeNotSet(gradeLevel)}</span>
                )}
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.difficultyNote}</span>
            </div>

            <label className="flex flex-col gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200">
                {t.reviewTitleLabel}
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200">
                <span className="flex items-center justify-between gap-2">
                    {t.reviewTextLabel}
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {edited && (
                            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-700 dark:text-violet-300">
                                {t.editedBadge}
                            </span>
                        )}
                        {t.wordCount(countWords(text))}
                    </span>
                </span>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={12}
                    className={`${fieldClass} resize-y leading-relaxed`}
                />
            </label>

            <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <input
                    type="checkbox"
                    checked={readIt}
                    onChange={(e) => setReadIt(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-teal-600"
                />
                {t.readConfirm}
            </label>

            <DifficultyPicker
                t={t}
                value={requestedDifficulty}
                suggested={suggestedDifficulty}
                gradeLevel={gradeLevel}
                onChange={onDifficultyChange}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={handleRegenerate}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-gray-900/10 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/10"
                >
                    <RefreshCw size={16} />
                    {t.regenerateLabel}
                </button>
                <button
                    type="button"
                    onClick={() => onApprove({ title: title.trim(), passage: text.trim() })}
                    disabled={!canApprove}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                >
                    <ClipboardCheck size={18} />
                    {t.approveStart}
                </button>
            </div>
        </section>
    )
}
