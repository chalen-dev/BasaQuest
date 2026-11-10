// File: src/pages/proficiency/foundational/FoundationalPracticePage.tsx
// Practice page for a Foundational Words & Sounds level
// (/reading/proficiency/foundational/:levelId). Reads the level's cards from
// data/levels.ts and steps through them one at a time. Audio and the
// pick-the-right-word exercises that use `distractors` are not built yet.
import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { findFoundationalLevel } from './data/levels.ts'
import LettersScene from './LettersScene.tsx'
import type { FoundationalLevel } from './data/types.ts'

// The plain card viewer's own words, in the level's language.
const TEXT = {
    en: { back: 'Back to materials', missing: 'This level does not exist.', prev: 'Previous', next: 'Next', of: 'of', sentence: 'Sentence', sound: 'Sound', name: 'Name' },
    fil: { back: 'Bumalik sa mga materyales', missing: 'Wala ang antas na ito.', prev: 'Nakaraan', next: 'Susunod', of: 'ng', sentence: 'Pangungusap', sound: 'Tunog', name: 'Pangalan' },
} as const

type Card = {
    key: string
    big: string
    image: string
    caption: string
    detail: string
    sentence: string
    isSentence?: boolean
}

function buildCards(level: FoundationalLevel): Card[] {
    const t = TEXT[level.language]
    const wordCards: Card[] = level.letters
        ? level.letters.map((letter) => ({
              key: letter.id,
              big: `${letter.upper} ${letter.lower}`,
              image: letter.image,
              caption: letter.word,
              detail: `${t.sound}: ${letter.letter_sound} · ${t.name}: ${letter.letter_name}`,
              sentence: letter.example_sentence,
          }))
        : level.words.map((word) => ({
              key: word.id,
              big: word.word,
              image: word.image,
              caption: '',
              detail: word.phonics_focus,
              sentence: word.example_sentence,
          }))
    const sentenceCards: Card[] = (level.sentences ?? []).map((sentence) => ({
        key: sentence.id,
        big: sentence.text,
        image: sentence.image,
        caption: '',
        detail: t.sentence,
        sentence: '',
        isSentence: true,
    }))
    return [...wordCards, ...sentenceCards]
}

const FoundationalPracticePage: React.FC = () => {
    const navigate = useNavigate()
    const { levelId } = useParams()
    const level = findFoundationalLevel(levelId)
    const t = TEXT[level?.language ?? 'en']
    const [index, setIndex] = useState(0)

    const backButton = (
        <button
            onClick={() => navigate('/reading/proficiency')}
            className="mb-4 flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
        >
            <ArrowLeft size={16} /> {t.back}
        </button>
    )

    if (!level) {
        return (
            <div className="relative z-10 mx-auto max-w-3xl px-4 pb-12 pt-6">
                {backButton}
                <p className="text-base font-semibold text-gray-700 dark:text-gray-200">{t.missing}</p>
            </div>
        )
    }

    // Level 1 is the blackboard classroom scene; the other levels use the plain card viewer below.
    if (level.letters) return <LettersScene levelId={level.id} language={level.language} letters={level.letters} />

    const cards = buildCards(level)
    const card = cards[Math.min(index, cards.length - 1)]
    const isSentence = card.isSentence === true

    return (
        <div className="relative z-10 mx-auto max-w-3xl px-4 pb-12 pt-6">
            {backButton}
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{level.title}</h1>
            <p className="mb-6 text-sm font-medium text-gray-700 dark:text-gray-200">
                {level.subtitle} · {level.summary}
            </p>
            <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-amber-500/25 bg-white p-8 text-center shadow-sm dark:border-amber-400/25 dark:bg-gray-900">
                <span className="text-7xl" aria-hidden="true">{card.image}</span>
                <span
                    className={`font-extrabold text-gray-900 dark:text-gray-50 ${isSentence ? 'text-3xl' : 'text-6xl'}`}
                >
                    {card.big}
                </span>
                {card.caption && (
                    <span className="text-xl font-bold text-amber-700 dark:text-amber-300">{card.caption}</span>
                )}
                <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                    {card.detail}
                </span>
                {card.sentence && (
                    <p className="text-base font-medium text-gray-700 dark:text-gray-300">{card.sentence}</p>
                )}
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
                <button
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    disabled={index === 0}
                    aria-label={t.prev}
                    className="flex cursor-pointer items-center gap-1 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#b45309] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-600 dark:shadow-[0_4px_0_0_#92400e]"
                >
                    <ChevronLeft size={18} /> {t.prev}
                </button>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    {index + 1} {t.of} {cards.length}
                </span>
                <button
                    onClick={() => setIndex((i) => Math.min(cards.length - 1, i + 1))}
                    disabled={index >= cards.length - 1}
                    aria-label={t.next}
                    className="flex cursor-pointer items-center gap-1 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#b45309] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-600 dark:shadow-[0_4px_0_0_#92400e]"
                >
                    {t.next} <ChevronRight size={18} />
                </button>
            </div>
        </div>
    )
}

export default FoundationalPracticePage
