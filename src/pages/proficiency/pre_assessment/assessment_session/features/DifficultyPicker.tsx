// File: src/pages/proficiency/pre_assessment/assessment_session/features/DifficultyPicker.tsx
// The teacher's 1-5 star choice of how hard the passage should be, asked
// before a passage is generated (and again when generating a new one). Marks
// the level suggested for the pupil's grade.
import { Star } from 'lucide-react'
import type { AssessmentStrings } from '../assessmentSessionStrings.ts'

type DifficultyPickerProps = {
    t: AssessmentStrings
    value: number
    suggested: number
    gradeLevel: number
    onChange: (value: number) => void
}

export function DifficultyPicker({ t, value, suggested, gradeLevel, onChange }: DifficultyPickerProps) {
    return (
        <div className="flex flex-col gap-2 rounded-2xl bg-gray-900/5 p-4 dark:bg-gray-100/5">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{t.pickDifficultyLabel}</span>
            <div role="radiogroup" aria-label={t.pickDifficultyLabel} className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        aria-label={`${n} / 5 · ${t.levelNames[n - 1]}`}
                        onClick={() => onChange(n)}
                        className="cursor-pointer rounded-lg p-1 transition-transform duration-100 hover:scale-110 focus-visible:outline-2 focus-visible:outline-teal-500"
                    >
                        <Star
                            size={32}
                            strokeWidth={2}
                            className={
                                n <= value
                                    ? 'fill-amber-400 text-amber-500 dark:fill-amber-300 dark:text-amber-300'
                                    : 'fill-transparent text-gray-300 dark:text-gray-600'
                            }
                        />
                    </button>
                ))}
                <span className="ml-2 text-base font-extrabold text-gray-900 dark:text-gray-50">
                    {value} · {t.levelNames[value - 1]}
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span>{t.difficultyScale}</span>
                {value === suggested ? (
                    <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-teal-700 dark:text-teal-300">
                        {t.suggestedForGrade(gradeLevel)}
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={() => onChange(suggested)}
                        className="cursor-pointer rounded-full bg-gray-900/5 px-2.5 py-0.5 text-gray-600 hover:bg-gray-900/10 dark:bg-gray-100/10 dark:text-gray-300"
                    >
                        {t.useSuggested(suggested, gradeLevel)}
                    </button>
                )}
            </div>
        </div>
    )
}
