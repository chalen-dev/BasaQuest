// File: src/pages/proficiency/pre_assessment/AssessmentSession.tsx
// The actual reading check-in session — reached only after a language has
// been picked in PreAssessment.tsx. Rendered under AssessmentSessionLayout,
// which swaps in a stripped-down header (no nav, no LangToggle, no account
// menu) so the language can't be changed and the page can't be navigated
// away from mid-session, only exited deliberately. Generates a
// grade-appropriate passage for the pupil to read ALOUD — no comprehension
// quiz, since this pipeline scores pronunciation/fluency, not comprehension.
// Recording/scoring (step 2+) isn't wired up yet; this is intentionally a
// stopping point once the passage is shown.
import React, { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { BookOpenCheck, RefreshCw } from 'lucide-react'
import { Owl } from '../../../components/ui/Owl.tsx'
import { OwlLoader } from '../../../components/ui/OwlLoader.tsx'
import { useProfile } from '../../../hooks/useProfile.ts'
import { useLang } from '../../../contexts/LangContext.tsx'
import { supabase } from '../../../lib/supabaseClient.ts'
import type { Lang } from '../../../components/buttons/LangToggle.tsx'

type Passage = {
    title: string
    passage: string
}

type Step = 'intro' | 'loading' | 'passage' | 'error'

const STRINGS: Record<Lang, {
    filipinoLabel: string
    englishLabel: string
    kicker: string
    title: string
    introDesc: string
    gradeLabel: (n: number) => string
    start: string
    loadingMessage: string
    regenerate: string
    nextStepsNote: string
    nonReaderKicker: string
    nonReaderTitle: string
    nonReaderDesc: string
    nonReaderComingSoon: string
    errorTitle: string
    errorDesc: string
    retry: string
}> = {
    fil: {
        filipinoLabel: 'Filipino',
        englishLabel: 'English',
        kicker: 'Unang Hakbang',
        title: 'Pagsusuri sa Kasanayan sa Pagbasa',
        introDesc: 'Bubuo ang ating kaibigang kuwago ng isang maikling talata na bagay sa iyong baitang — babasahin mo ito nang malakas sa iyong guro. Walang mali o tamang paraan dito.',
        gradeLabel: (n) => `Baitang ${n}`,
        start: 'Bumuo ng Talata',
        loadingMessage: 'Gumagawa ng talata para sa iyo…',
        regenerate: 'Bumuo ng Ibang Talata',
        nextStepsNote: 'Susunod na hakbang: pagbabasa nang malakas at pag-record — darating pa ito.',
        nonReaderKicker: 'Sa Ngayon',
        nonReaderTitle: 'Simula muna sa Batayang Kasanayan',
        nonReaderDesc: 'Naka-mark ang account na ito bilang bagong nagbabasa, kaya mas mainam munang magsanay sa mga letra, pantig, at simpleng salita bago sa buong talata.',
        nonReaderComingSoon: 'Ang bahaging ito (letra, pantig, CVC na salita) ay ginagawa pa — darating na ito.',
        errorTitle: 'Naku, may problema.',
        errorDesc: 'Hindi namin nabuo ang talata ngayon. Subukan ulit.',
        retry: 'Subukan Ulit',
    },
    en: {
        filipinoLabel: 'Filipino',
        englishLabel: 'English',
        kicker: 'First Step',
        title: 'Reading Skills Check-In',
        introDesc: "Our owl friend will put together a short passage suited to your grade — you'll read it aloud to your teacher. There's no right or wrong way to do this.",
        gradeLabel: (n) => `Grade ${n}`,
        start: 'Generate a Passage',
        loadingMessage: 'Writing a passage just for you…',
        regenerate: 'Generate a Different Passage',
        nextStepsNote: "Next up: reading aloud and recording — that part is still on its way.",
        nonReaderKicker: 'For Now',
        nonReaderTitle: 'Starting with the Basics',
        nonReaderDesc: "This account is flagged as a new reader, so it's better to practice letters, syllables, and simple words before a full passage.",
        nonReaderComingSoon: 'This part (letters, syllables, CVC words) is still being built — coming soon.',
        errorTitle: 'Oops, something went wrong.',
        errorDesc: "We couldn't put together a passage right now. Please try again.",
        retry: 'Try Again',
    },
}

export const AssessmentSession: React.FC = () => {
    const [searchParams] = useSearchParams()
    const rawLang = searchParams.get('lang')
    const assessmentLang: Lang | null = rawLang === 'fil' || rawLang === 'en' ? rawLang : null

    const { profile, loading: profileLoading } = useProfile()
    const { lang: uiLang } = useLang()
    const t = STRINGS[uiLang]
    const gradeLevel = profile?.grade_level ?? 3

    const [step, setStep] = useState<Step>('intro')
    const [passage, setPassage] = useState<Passage | null>(null)

    const generatePassage = async () => {
        if (!assessmentLang) return
        setStep('loading')
        try {
            const { data, error } = await supabase.functions.invoke<Passage>('generate-passage', {
                body: { gradeLevel, lang: assessmentLang },
            })
            if (error || !data || typeof data.passage !== 'string') {
                throw error ?? new Error('Malformed response')
            }
            setPassage(data)
            setStep('passage')
        } catch (err) {
            console.error('AssessmentSession: failed to generate passage', err)
            setStep('error')
        }
    }

    // Guards against a stale passage lingering if the ?lang= param ever
    // changes out from under this page (shouldn't normally happen, since
    // this header has no language control, but cheap to be safe about).
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStep('intro')
        setPassage(null)
    }, [assessmentLang])

    if (!assessmentLang) {
        return <Navigate to="/reading/proficiency/assessment" replace />
    }

    const isNonReader = profile?.is_non_reader === true

    return (
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
            {profileLoading && (
                <section className="flex min-h-[240px] items-center justify-center rounded-3xl border border-gray-900/5 shadow-sm dark:border-gray-100/10">
                    <OwlLoader message="…" />
                </section>
            )}

            {!profileLoading && isNonReader && step === 'intro' && (
                <section className="flex flex-col items-center gap-4 rounded-3xl border border-amber-500/25 bg-amber-500/5 p-8 text-center shadow-sm dark:border-amber-400/25 dark:bg-amber-400/5">
                    <Owl mood="greeting" size={80} bob />
                    <span className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        {t.nonReaderKicker}
                    </span>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.nonReaderTitle}</h2>
                    <p className="max-w-md text-sm font-medium text-gray-600 dark:text-gray-400">{t.nonReaderDesc}</p>
                    <p className="max-w-md text-xs font-semibold text-amber-700 dark:text-amber-300">{t.nonReaderComingSoon}</p>
                </section>
            )}

            {!profileLoading && !isNonReader && step === 'intro' && (
                <section className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
                    <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
                    <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
                    <div className="relative flex flex-col items-center gap-5 text-center sm:items-start sm:text-left">
                        <Owl mood="greeting" size={80} bob />
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                                {t.kicker}
                            </span>
                            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-3xl">
                                {t.title}
                            </h1>
                            <p className="mt-2 max-w-xl text-base font-medium text-gray-600 dark:text-gray-400">
                                {t.introDesc}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="inline-block rounded-full bg-teal-500/15 px-3 py-1 text-xs font-bold text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                                    {t.gradeLabel(gradeLevel)}
                                </span>
                                <span className="inline-block rounded-full bg-gray-900/5 px-3 py-1 text-xs font-bold text-gray-700 dark:bg-gray-100/10 dark:text-gray-300">
                                    {assessmentLang === 'fil' ? t.filipinoLabel : t.englishLabel}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={generatePassage}
                            className="mt-2 flex cursor-pointer items-center gap-2 rounded-full bg-teal-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                        >
                            <BookOpenCheck size={18} />
                            {t.start}
                        </button>
                    </div>
                </section>
            )}

            {step === 'loading' && (
                <section className="flex min-h-[320px] items-center justify-center rounded-3xl border border-gray-900/5 shadow-sm dark:border-gray-100/10">
                    <OwlLoader message={t.loadingMessage} />
                </section>
            )}

            {step === 'error' && (
                <section className="flex flex-col items-center gap-4 rounded-3xl border border-gray-900/5 p-8 text-center shadow-sm dark:border-gray-100/10">
                    <Owl mood="greeting" size={72} />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.errorTitle}</h2>
                    <p className="max-w-md text-sm font-medium text-gray-600 dark:text-gray-400">{t.errorDesc}</p>
                    <button
                        onClick={generatePassage}
                        className="flex cursor-pointer items-center gap-2 rounded-full bg-teal-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                    >
                        <RefreshCw size={16} />
                        {t.retry}
                    </button>
                </section>
            )}

            {step === 'passage' && passage && (
                <section className="rounded-3xl border border-gray-900/5 bg-white p-6 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                            {t.gradeLabel(gradeLevel)}
                        </span>
                        <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-bold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                            {assessmentLang === 'fil' ? t.filipinoLabel : t.englishLabel}
                        </span>
                    </div>
                    <h2 className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-gray-50">{passage.title}</h2>
                    <p className="mt-4 whitespace-pre-line text-xl font-medium leading-relaxed text-gray-800 dark:text-gray-200">
                        {passage.passage}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                            onClick={generatePassage}
                            className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-teal-500/30 px-5 py-2 text-sm font-bold text-teal-700 transition-colors duration-150 hover:bg-teal-500/10 dark:border-teal-400/30 dark:text-teal-300 dark:hover:bg-teal-400/10"
                        >
                            <RefreshCw size={16} />
                            {t.regenerate}
                        </button>
                    </div>
                    <p className="mt-4 text-xs font-semibold text-gray-500 dark:text-gray-400">{t.nextStepsNote}</p>
                </section>
            )}
        </div>
    )
}

export default AssessmentSession