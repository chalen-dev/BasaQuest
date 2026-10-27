// File: src/pages/proficiency/pre_assessment/assessment_session/features/PassageReview.tsx
// The teacher's read-through of a generated passage, shown before an assisted
// ("Now") session starts. It uses the same two-panel layout as the recording
// screen: the passage on the left (here editable, in the same large type the
// pupil will read), and where the recorder would be, the validation settings
// on the right. The teacher reads the passage, can edit it or generate a new
// one at another difficulty, sees the measured 1-5 stars (re-rated live as the
// text is edited) and whether it suits the pupil's grade, and must tick "I
// have read this passage" before the session begins.
import { useState } from 'react'
import { ClipboardCheck, RefreshCw } from 'lucide-react'
import { StarRating } from '../../../../../components/ui/StarRating.tsx'
import { useTheme } from '../../../../../contexts/ThemeContext.tsx'
import { showConfirmation } from '../../../../../helpers/swalHelpers.ts'
import { countWords, gradeFit, rateDifficulty } from '../../../../../lib/passageDifficulty.ts'
import { DifficultyPicker } from './DifficultyPicker.tsx'
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

const panelClass =
    'flex h-full min-h-0 flex-col rounded-3xl border border-gray-900/5 bg-white p-8 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-10'

export function PassageReview({
    t,
    passage,
    lang,
    gradeLevel,
    gradeMissing,
    requestedDifficulty,
    suggestedDifficulty,
    onDifficultyChange,
    onApprove,
    onRegenerate,
}: PassageReviewProps) {
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
        <div className="grid gap-6 lg:h-[calc(100vh-14rem)] lg:grid-cols-[1.6fr_1fr]">
            <section className={`${panelClass} overflow-hidden`}>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                        {t.gradeLabel(gradeLevel)}
                    </span>
                    <span className="rounded-full bg-gray-900/5 px-3 py-1 text-sm font-bold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                        {lang === 'fil' ? t.filipinoLabel : t.englishLabel}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-gray-900/5 px-3 py-1 dark:bg-gray-100/10">
                        <StarRating value={stars} label={`${t.difficultyLabel}: ${stars} / 5`} size={16} />
                    </span>
                    <div className="flex-1" />
                    {edited && (
                        <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-700 dark:text-violet-300">
                            {t.editedBadge}
                        </span>
                    )}
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.wordCount(countWords(text))}</span>
                </div>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    aria-label={t.reviewTitleLabel}
                    className="mt-3 w-full rounded-lg border-b-2 border-transparent bg-transparent text-3xl font-extrabold text-gray-900 outline-none transition-colors duration-150 hover:border-gray-900/10 focus:border-teal-500 dark:text-gray-50 dark:hover:border-gray-100/10"
                />
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    aria-label={t.reviewTextLabel}
                    className="mt-5 min-h-[16rem] w-full flex-1 resize-none rounded-xl border-2 border-transparent bg-transparent p-1 text-xl font-medium leading-relaxed text-gray-800 outline-none transition-colors duration-150 hover:border-gray-900/10 focus:border-teal-500 dark:text-gray-100 dark:hover:border-gray-100/10"
                />
            </section>

            <section className={`${panelClass} gap-5 overflow-y-auto`}>
                <div>
                    <span className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                        {t.reviewKicker}
                    </span>
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.reviewTitle}</h1>
                    <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{t.reviewDesc}</p>
                </div>

                <div className="flex flex-col gap-2 rounded-2xl bg-gray-900/5 p-4 dark:bg-gray-100/5">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{t.difficultyLabel}</span>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <StarRating value={stars} label={`${stars} / 5`} size={24} />
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.difficultyScale}</span>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${FIT_STYLE[fit]}`}>{fitText}</span>
                    {gradeMissing && (
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{t.gradeNotSet(gradeLevel)}</span>
                    )}
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.difficultyNote}</span>
                </div>

                <DifficultyPicker
                    t={t}
                    value={requestedDifficulty}
                    suggested={suggestedDifficulty}
                    gradeLevel={gradeLevel}
                    onChange={onDifficultyChange}
                />
                <button
                    type="button"
                    onClick={handleRegenerate}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-gray-900/10 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/10"
                >
                    <RefreshCw size={16} />
                    {t.regenerateLabel}
                </button>

                <div className="mt-auto flex flex-col gap-4 border-t-2 border-dashed border-gray-900/10 pt-4 dark:border-gray-100/10">
                    <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                        <input
                            type="checkbox"
                            checked={readIt}
                            onChange={(e) => setReadIt(e.target.checked)}
                            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-teal-600"
                        />
                        {t.readConfirm}
                    </label>
                    <button
                        type="button"
                        onClick={() => onApprove({ title: title.trim(), passage: text.trim() })}
                        disabled={!canApprove}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                    >
                        <ClipboardCheck size={18} />
                        {t.approveStart}
                    </button>
                </div>
            </section>
        </div>
    )
}
