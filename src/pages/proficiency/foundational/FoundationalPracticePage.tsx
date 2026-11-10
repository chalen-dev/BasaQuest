// File: src/pages/proficiency/foundational/FoundationalPracticePage.tsx
// Practice page for a Foundational Words & Sounds level
// (/reading/proficiency/foundational/:levelId). Level 1 (letters) is the blackboard
// classroom scene. The other levels use the GROUP viewer below: the words are sorted
// into groups by what they teach (a word family like -at, a blend like st, a spelling
// pattern like a_e, a block of sight words), a strip of chips jumps between groups, and
// one group at a time is shown as a row of tiles, so a child sees cat, hat, bat, rat
// together. Tap a tile for the big card and "Hear it" (the server voice, same as the
// scene). The pick-the-right-word exercises that use `distractors` are not built yet.
import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react'
import { findFoundationalLevel } from './data/levels.ts'
import LettersScene from './LettersScene.tsx'
import { usePronounceWord } from '../remediation/session/features/usePronounceWord.ts'
import type { FoundationalLevel } from './data/types.ts'

// The viewer's own words, in the level's language.
const TEXT = {
    en: {
        back: 'Back to materials',
        missing: 'This level does not exist.',
        prev: 'Previous group',
        next: 'Next group',
        group: (n: number, total: number) => `Group ${n} of ${total}`,
        sentence: 'Sentence',
        sentences: 'Sentences',
        hear: 'Hear it',
        groups: 'Groups',
    },
    fil: {
        back: 'Bumalik sa mga materyales',
        missing: 'Wala ang antas na ito.',
        prev: 'Nakaraang pangkat',
        next: 'Susunod na pangkat',
        group: (n: number, total: number) => `Pangkat ${n} ng ${total}`,
        sentence: 'Pangungusap',
        sentences: 'Mga Pangungusap',
        hear: 'Pakinggan',
        groups: 'Mga Pangkat',
    },
} as const

// A group is split into pages of this many cards when a level lists many words under one heading.
const MAX_PER_GROUP = 10

type Card = {
    key: string
    groupKey: string
    big: string
    image: string
    detail: string
    sentence: string
    say: string
    isSentence?: boolean
}

type Group = { id: string; key: string; label: string; chip: string; cards: Card[] }

// "short a · -at family" stays whole; "pantig: ba-ta" and "a_e (cap → cape)" group by what comes
// before the colon, so every syllable word is one heading and the child sees them together.
function groupKeyOf(focus: string): string {
    return focus.split(':')[0].trim()
}

function buildGroups(level: FoundationalLevel): Group[] {
    const t = TEXT[level.language]
    const cards: Card[] = [
        ...level.words.map((word) => ({
            key: word.id,
            groupKey: groupKeyOf(word.phonics_focus),
            big: word.word,
            image: word.image,
            detail: word.phonics_focus,
            sentence: word.example_sentence,
            say: word.word,
        })),
        ...(level.sentences ?? []).map((sentence) => ({
            key: sentence.id,
            groupKey: t.sentences,
            big: sentence.text,
            image: sentence.image,
            detail: t.sentence,
            sentence: '',
            say: sentence.text,
            isSentence: true,
        })),
    ]
    const groups: Group[] = []
    for (const card of cards) {
        const last = groups[groups.length - 1]
        if (last && last.key === card.groupKey && last.cards.length < MAX_PER_GROUP) last.cards.push(card)
        else groups.push({ id: `${card.groupKey}#${groups.length}`, key: card.groupKey, label: card.groupKey, chip: '', cards: [card] })
    }
    // A heading that needed several pages gets a number; chips are short.
    const pages = new Map<string, number>()
    for (const key of new Set(groups.map((g) => g.key))) pages.set(key, groups.filter((g) => g.key === key).length)
    const seen = new Map<string, number>()
    for (const group of groups) {
        const n = (seen.get(group.key) ?? 0) + 1
        seen.set(group.key, n)
        const suffix = (pages.get(group.key) ?? 1) > 1 ? ` ${n}` : ''
        group.label = `${group.key}${suffix}`
        group.chip = `${group.key.replace(/^short /, '').replace(/ family$/, '').replace(/^kambal-katinig /, '').replace(/^diptonggo /, '')}${suffix}`
    }
    return groups
}

const pillButton =
    'flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10'
const amberButton =
    'flex cursor-pointer items-center gap-1 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#b45309] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-600 dark:shadow-[0_4px_0_0_#92400e]'

function GroupViewer({ level }: { level: FoundationalLevel }) {
    const t = TEXT[level.language]
    const groups = useMemo(() => buildGroups(level), [level])
    // Sounds and words first: example sentences and phrases only appear from Level 5, where reading sentences is the lesson.
    const showSentence = level.level >= 5
    const [groupIndex, setGroupIndex] = useState(0)
    const [pick, setPick] = useState(0)
    const { speak, isLoading, isPlaying } = usePronounceWord()

    const group = groups[Math.min(groupIndex, groups.length - 1)]
    const card = group.cards[Math.min(pick, group.cards.length - 1)]
    const go = (index: number) => {
        setGroupIndex(Math.max(0, Math.min(groups.length - 1, index)))
        setPick(0)
    }

    return (
        <>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{level.title}</h1>
            <p className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-200">
                {level.subtitle} · {level.summary}
            </p>

            <nav aria-label={t.groups} className="mb-4 flex flex-wrap gap-1.5">
                {groups.map((g, i) => (
                    <button
                        key={g.id}
                        onClick={() => go(i)}
                        aria-current={i === groupIndex}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-extrabold transition-colors ${
                            i === groupIndex
                                ? 'border-amber-500 bg-amber-500 text-white'
                                : 'border-gray-900/10 bg-white text-gray-700 hover:bg-amber-50 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                        }`}
                    >
                        {g.chip}
                    </button>
                ))}
            </nav>

            <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-amber-500/25 bg-white p-6 text-center shadow-sm dark:border-amber-400/25 dark:bg-gray-900 sm:p-8">
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                    {group.label}
                </span>
                <span className="text-7xl" aria-hidden="true">{card.image}</span>
                <span className={`font-extrabold text-gray-900 dark:text-gray-50 ${card.isSentence ? 'text-3xl' : 'text-6xl'}`}>{card.big}</span>
                {showSentence && card.sentence && <p className="text-base font-medium text-gray-700 dark:text-gray-200">{card.sentence}</p>}
                <button
                    onClick={() => void speak(card.say, level.language, card.isSentence === true)}
                    disabled={isLoading}
                    className={`${pillButton} ${isPlaying ? 'ring-2 ring-amber-500' : ''}`}
                >
                    <Volume2 size={16} /> {t.hear}
                </button>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3" role="list">
                {group.cards.map((c, i) => (
                    <button
                        key={c.key}
                        role="listitem"
                        onClick={() => setPick(i)}
                        aria-pressed={i === pick}
                        className={`flex min-w-24 cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 bg-white px-4 py-3 text-gray-900 shadow-sm transition-transform hover:-translate-y-0.5 dark:bg-gray-900 dark:text-gray-50 ${
                            i === pick ? 'border-amber-500' : 'border-gray-900/10 dark:border-gray-100/10'
                        }`}
                    >
                        <span className="text-4xl" aria-hidden="true">{c.image}</span>
                        <span className={`font-extrabold ${c.isSentence ? 'max-w-48 text-sm' : 'text-lg'}`}>{c.big}</span>
                    </button>
                ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
                <button onClick={() => go(groupIndex - 1)} disabled={groupIndex === 0} aria-label={t.prev} className={amberButton}>
                    <ChevronLeft size={18} /> {t.prev}
                </button>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{t.group(groupIndex + 1, groups.length)}</span>
                <button onClick={() => go(groupIndex + 1)} disabled={groupIndex >= groups.length - 1} aria-label={t.next} className={amberButton}>
                    {t.next} <ChevronRight size={18} />
                </button>
            </div>
        </>
    )
}

const FoundationalPracticePage: React.FC = () => {
    const navigate = useNavigate()
    const { levelId } = useParams()
    const level = findFoundationalLevel(levelId)
    const t = TEXT[level?.language ?? 'en']

    const backButton = (
        <button onClick={() => navigate('/reading/proficiency')} className={`mb-4 ${pillButton}`}>
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

    // Level 1 is the blackboard classroom scene; the other levels use the group viewer.
    if (level.letters) return <LettersScene levelId={level.id} language={level.language} letters={level.letters} />

    return (
        <div className="relative z-10 mx-auto max-w-3xl px-4 pb-12 pt-6">
            {backButton}
            <GroupViewer key={level.id} level={level} />
        </div>
    )
}

export default FoundationalPracticePage
