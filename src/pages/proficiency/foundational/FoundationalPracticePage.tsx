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

type Card = {
    key: string
    big: string
    image: string
    caption: string
    detail: string
    sentence: string
}

function buildCards(level: FoundationalLevel): Card[] {
    const wordCards: Card[] = level.letters
        ? level.letters.map((letter) => ({
              key: letter.id,
              big: `${letter.upper} ${letter.lower}`,
              image: letter.image,
              caption: letter.word,
              detail: `Sound: ${letter.letter_sound} · Name: ${letter.letter_name}`,
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
        detail: 'Sentence',
        sentence: '',
    }))
    return [...wordCards, ...sentenceCards]
}

const FoundationalPracticePage: React.FC = () => {
    const navigate = useNavigate()
    const { levelId } = useParams()
    const level = findFoundationalLevel(levelId)
    const [index, setIndex] = useState(0)

    const backButton = (
        <button
            onClick={() => navigate('/reading/proficiency')}
            className="mb-4 flex cursor-pointer items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
            <ArrowLeft size={16} /> Back to materials
        </button>
    )

    if (!level) {
        return (
            <div className="mx-auto max-w-3xl px-4 pb-12 pt-6">
                {backButton}
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">This level does not exist.</p>
            </div>
        )
    }

    // Level 1 is the blackboard classroom scene; the other levels use the plain card viewer below.
    if (level.letters) return <LettersScene letters={level.letters} />

    const cards = buildCards(level)
    const card = cards[Math.min(index, cards.length - 1)]
    const isSentence = card.detail === 'Sentence'

    return (
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-6">
            {backButton}
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{level.title}</h1>
            <p className="mb-6 text-sm font-medium text-gray-600 dark:text-gray-400">
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
                    aria-label="Previous"
                    className="flex cursor-pointer items-center gap-1 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#b45309] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-600 dark:shadow-[0_4px_0_0_#92400e]"
                >
                    <ChevronLeft size={18} /> Previous
                </button>
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                    {index + 1} of {cards.length}
                </span>
                <button
                    onClick={() => setIndex((i) => Math.min(cards.length - 1, i + 1))}
                    disabled={index >= cards.length - 1}
                    aria-label="Next"
                    className="flex cursor-pointer items-center gap-1 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#b45309] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-600 dark:shadow-[0_4px_0_0_#92400e]"
                >
                    Next <ChevronRight size={18} />
                </button>
            </div>
        </div>
    )
}

export default FoundationalPracticePage
