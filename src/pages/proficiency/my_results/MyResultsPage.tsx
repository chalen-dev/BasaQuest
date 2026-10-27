// File: src/pages/proficiency/my_results/MyResultsPage.tsx
// A pupil's own check-in results, shown once their teacher has confirmed a
// reading (see hooks.ts). Each result has two layers: a friendly one on top
// (stars, an encouraging line, words to practice) and the technical numbers
// underneath (accuracy, words per minute, time), so the child gets the warm
// version and anyone curious can see the real figures.
//
// Opening the page marks what is listed as seen, which clears the "new" badge
// on the Fluent Reading tab and the results card.
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, Gauge, Star, Target } from 'lucide-react'
import { Owl, type OwlMood } from '../../../components/ui/Owl.tsx'
import { Skeleton } from '../../../components/ui/Skeleton.tsx'
import { useLang } from '../../../contexts/LangContext.tsx'
import { useProfile } from '../../../hooks/useProfile.ts'
import type { Lang } from '../../../components/buttons/LangToggle.tsx'
import {
    markResultsSeen,
    summarizeResult,
    useMyAttemptWordsQuery,
    useMyReviewedAttemptsQuery,
    type MyReviewedAttempt,
} from './hooks.ts'

const STRINGS: Record<Lang, {
    back: string
    title: string
    intro: string
    emptyTitle: string
    emptyDesc: string
    languageName: Record<Lang, string>
    starsLabel: (n: number) => string
    wordsRight: (correct: number, total: number) => string
    practiceHeading: string
    allGood: string
    numbersHeading: string
    accuracy: string
    speed: string
    speedUnit: string
    time: string
    dateOn: (d: string) => string
    untitled: string
}> = {
    fil: {
        back: 'Basa nang Malakas',
        title: 'Ang mga resulta mo',
        intro: 'Ito ang naging basa mo, na sinuri ng iyong guro.',
        emptyTitle: 'Wala pang resulta',
        emptyDesc: 'Lalabas dito ang resulta mo kapag natapos nang suriin ng iyong guro ang binasa mo.',
        languageName: { fil: 'Filipino', en: 'English' },
        starsLabel: (n) => `${n} sa 5 bituin`,
        wordsRight: (c, t) => `${c} sa ${t} salita ang nabasa mo nang tama`,
        practiceHeading: 'Mga salitang pagsasanayan natin',
        allGood: 'Walang salitang kailangang pagsanayan. Napakahusay!',
        numbersHeading: 'Ang mga numero',
        accuracy: 'Katumpakan',
        speed: 'Bilis ng pagbasa',
        speedUnit: 'salita bawat minuto',
        time: 'Tagal',
        dateOn: (d) => `Sinuri noong ${d}`,
        untitled: 'Ang binasa mo',
    },
    en: {
        back: 'Fluent Reading',
        title: 'Your results',
        intro: 'This is how your reading went, checked by your teacher.',
        emptyTitle: 'No results yet',
        emptyDesc: 'Your result will show up here once your teacher has finished checking your reading.',
        languageName: { fil: 'Filipino', en: 'English' },
        starsLabel: (n) => `${n} out of 5 stars`,
        wordsRight: (c, t) => `You read ${c} of ${t} words correctly`,
        practiceHeading: 'Words we will practice',
        allGood: 'No words to practice. Wonderful!',
        numbersHeading: 'The numbers',
        accuracy: 'Accuracy',
        speed: 'Reading speed',
        speedUnit: 'words per minute',
        time: 'Time',
        dateOn: (d) => `Checked on ${d}`,
        untitled: 'Your reading',
    },
}

// Encouraging, whatever the number: the stars and line are meant to cheer a
// child on, so even the lowest tier says "keep going".
const TIERS: { min: number; stars: number; mood: OwlMood; message: Record<Lang, string> }[] = [
    { min: 95, stars: 5, mood: 'celebrating', message: { fil: 'Napakahusay mong magbasa!', en: 'You read wonderfully!' } },
    { min: 85, stars: 4, mood: 'proud', message: { fil: 'Magaling! Ang husay ng basa mo.', en: 'Great job! Your reading is strong.' } },
    { min: 75, stars: 3, mood: 'happy', message: { fil: 'Mahusay! Patuloy ka lang.', en: 'Nice work! Keep it up.' } },
    { min: 60, stars: 2, mood: 'encouraging', message: { fil: 'Magandang simula! Magsanay pa tayo.', en: 'A good start! Let us practice more.' } },
    { min: 0, stars: 1, mood: 'encouraging', message: { fil: 'Mahusay ang pagsubok mo! Magsasanay tayo nang magkasama.', en: 'Great effort! We will practice together.' } },
]

function formatDuration(seconds: number | null) {
    if (!seconds) return '—'
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
}

function ResultCard({ attempt, lang }: { attempt: MyReviewedAttempt; lang: Lang }) {
    const t = STRINGS[lang]
    const { data: words, isLoading } = useMyAttemptWordsQuery(attempt.id)
    if (isLoading || !words) {
        return <Skeleton className="h-64 w-full rounded-3xl" />
    }
    const summary = summarizeResult(words, attempt.duration_seconds)
    const tier = TIERS.find((x) => summary.accuracyPercent >= x.min) ?? TIERS[TIERS.length - 1]
    const checkedOn = new Date(attempt.reviewed_at).toLocaleDateString(lang === 'fil' ? 'fil-PH' : 'en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })
    const numberTile = 'flex flex-1 flex-col gap-1 rounded-2xl bg-gray-900/5 p-3 dark:bg-gray-100/10'
    return (
        <section className="flex flex-col gap-5 rounded-3xl border border-gray-900/5 bg-white p-6 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-8">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <Owl mood={tier.mood} size={84} bob />
                <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                            {t.languageName[attempt.language]}
                        </span>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.dateOn(checkedOn)}</span>
                    </div>
                    <h2 className="mt-1 text-xl font-extrabold text-gray-900 dark:text-gray-50">
                        {attempt.passage_title || t.untitled}
                    </h2>
                    <div className="mt-2 flex justify-center gap-1 sm:justify-start" role="img" aria-label={t.starsLabel(tier.stars)}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                                key={i}
                                size={28}
                                className={
                                    i < tier.stars
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-gray-300 dark:text-gray-600'
                                }
                            />
                        ))}
                    </div>
                    <p className="mt-2 text-lg font-extrabold text-teal-700 dark:text-teal-300">{tier.message[lang]}</p>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t.wordsRight(summary.correctWords, summary.totalWords)}
                    </p>
                </div>
            </div>
            <div>
                <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t.practiceHeading}
                </h3>
                {summary.practiceWords.length === 0 ? (
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t.allGood}</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {summary.practiceWords.map((word) => (
                            <span
                                key={word}
                                className="rounded-full bg-amber-500/15 px-4 py-1.5 text-base font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-200"
                            >
                                {word}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <div>
                <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t.numbersHeading}
                </h3>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className={numberTile}>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                            <Target size={14} /> {t.accuracy}
                        </span>
                        <span className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{summary.accuracyPercent}%</span>
                    </div>
                    <div className={numberTile}>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                            <Gauge size={14} /> {t.speed}
                        </span>
                        <span className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">
                            {summary.wordsPerMinute ?? '—'}
                            <span className="ml-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t.speedUnit}</span>
                        </span>
                    </div>
                    <div className={numberTile}>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                            <Clock size={14} /> {t.time}
                        </span>
                        <span className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">
                            {formatDuration(attempt.duration_seconds)}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function MyResultsPage() {
    const { lang } = useLang()
    const { profile } = useProfile()
    const t = STRINGS[lang]
    const { data: attempts, isPending } = useMyReviewedAttemptsQuery(profile?.id)

    // Looking at the results is what makes them "seen".
    useEffect(() => {
        if (profile?.id && attempts?.length) markResultsSeen(profile.id, attempts.map((a) => a.id))
    }, [profile?.id, attempts])

    return (
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
            <Link
                to="/reading/proficiency"
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
            >
                <ArrowLeft size={16} /> {t.back}
            </Link>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-3xl">{t.title}</h1>
            <p className="mb-5 text-base font-medium text-gray-600 dark:text-gray-400">{t.intro}</p>
            {isPending ? (
                <Skeleton className="h-64 w-full rounded-3xl" />
            ) : !attempts || attempts.length === 0 ? (
                <section className="flex flex-col items-center gap-3 rounded-3xl border border-gray-900/5 bg-white p-8 text-center shadow-sm dark:border-gray-100/10 dark:bg-gray-900">
                    <Owl mood="thinking" size={72} />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.emptyTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">{t.emptyDesc}</p>
                </section>
            ) : (
                <div className="flex flex-col gap-5">
                    {attempts.map((attempt) => (
                        <ResultCard key={attempt.id} attempt={attempt} lang={lang} />
                    ))}
                </div>
            )}
        </div>
    )
}
