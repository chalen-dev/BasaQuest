// File: src/components/ui/DifficultyStars.tsx
// A passage's 1-5 star difficulty as a small pill, rated from the passage text
// itself (see src/lib/passageDifficulty.ts), so it also works for readings
// saved before ratings existed. Shown wherever a reading passage is listed or
// opened: the session, the review and results lists, and the results card.
import { useLang } from '../../contexts/LangContext.tsx'
import { rateDifficulty } from '../../lib/passageDifficulty.ts'
import { StarRating } from './StarRating.tsx'

const LABEL = { fil: 'Hirap ng talata', en: 'Passage difficulty' } as const

export function DifficultyStars({
    text,
    language,
    size = 15,
    className = '',
}: {
    text: string | null | undefined
    language: 'en' | 'fil'
    size?: number
    className?: string
}) {
    const { lang } = useLang()
    if (!text || !text.trim()) return null
    const stars = rateDifficulty(text, language)
    const label = `${LABEL[lang]}: ${stars} / 5`
    return (
        <span
            title={label}
            className={`inline-flex items-center rounded-full bg-gray-900/5 px-3 py-1 dark:bg-gray-100/10 ${className}`}
        >
            <StarRating value={stars} label={label} size={size} />
        </span>
    )
}
