// File: src/pages/proficiency/pre_assessment/assessment_session/AssessmentSession.tsx
// The actual reading check-in session — reached either after a language
// has been picked in PreAssessment.tsx (student's own flow, or a
// teacher-assigned check-in the student opened on their own account), OR
// via the teacher's "Now" button on their student picker for a one-device
// one-on-one session. The second case adds ?studentId=&studentName= to
// the URL — when present, the passage is generated using THAT student's
// grade level / non-reader flag (via useAssistedStudentProfile) instead
// of the teacher's own profile, and a small "Acting as" banner is shown
// so it's never ambiguous whose check-in this is.
//
// This file just handles step routing (intro/loading/error/passage) and
// data flow — the passage display and the recorder panel are their own
// components under features/ (PassagePanel.tsx, RecorderPanel.tsx), and
// the bilingual copy lives in assessmentSessionStrings.ts, so this file
// doesn't balloon into one giant component.
//
// The passage step is deliberately built to require NO page scrolling,
// regardless of passage length — generate-passage's per-grade spec ranges
// from ~40 words (Grade 1) to ~240 words (Grade 6), and a scrollbar on a
// reading check-in defeats the point (the pupil should see the whole
// passage at once while recording). So the two-column grid gets a fixed
// height derived from the viewport (lg:h-[calc(100vh-14rem)] — 14rem is a
// rough allowance for the fixed header + assisted banner + page padding;
// tweak that number if your header height differs) instead of a
// min-height, and PassagePanel shrinks its own font size as the passage
// gets longer so long passages still fit inside that fixed height instead
// of scrolling. See PassagePanel.tsx's passageFontRem() for the scaling.
//
// Recording itself (useRecorder, ported from the prototype's
// src/lib/useRecorder.js) is REAL browser mic capture via
// getUserMedia + MediaRecorder, with a real per-bar frequency waveform and
// a MAX_RECORDING_SECONDS auto-stop cap. What ISN'T real yet: submitting
// the take anywhere. There's no storage bucket or attempts table wired
// up, so "Ipasa sa Guro" just flips local UI into a "Hinihintay ang Guro"
// pending state for now (and stays there — no resubmitting) — the
// recording itself is never uploaded. Wiring that up (upload the blob,
// insert an attempt row keyed by studentId when assisted, otherwise
// auth.uid()) is the natural next step once storage is in place.
import React, { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { BookOpenCheck, RefreshCw, UserRound } from 'lucide-react'
import { Owl } from '../../../../components/ui/Owl.tsx'
import { OwlLoader } from '../../../../components/ui/OwlLoader.tsx'
import { useProfile } from '../../../../hooks/useProfile.ts'
import { useLang } from '../../../../contexts/LangContext.tsx'
import { supabase } from '../../../../lib/supabaseClient.ts'
import { useAssistedStudentProfile } from '../hooks.ts'
import { useRecorder } from './features/useRecorder.ts'
import { PassagePanel } from './features/PassagePanel.tsx'
import { RecorderPanel } from './features/RecorderPanel.tsx'
import {
    PLACEHOLDER_PASSAGES,
    STRINGS,
    USE_PLACEHOLDER_PASSAGE,
    type Passage,
    type Step,
} from './assessmentSessionStrings.ts'
import type { Lang } from '../../../../components/buttons/LangToggle.tsx'

export const AssessmentSession: React.FC = () => {
    const [searchParams] = useSearchParams()
    const rawLang = searchParams.get('lang')
    const assessmentLang: Lang | null = rawLang === 'fil' || rawLang === 'en' ? rawLang : null

    const studentIdParam = searchParams.get('studentId')
    const studentNameParam = searchParams.get('studentName')
    const isAssisted = !!studentIdParam
    const { profile: ownProfile, loading: ownProfileLoading } = useProfile()
    const { profile: assistedProfile, loading: assistedProfileLoading } = useAssistedStudentProfile(studentIdParam)
    const activeProfile = isAssisted ? assistedProfile : ownProfile
    const profileLoading = isAssisted ? assistedProfileLoading : ownProfileLoading

    const { lang: uiLang } = useLang()
    const t = STRINGS[uiLang]
    const gradeLevel = activeProfile?.grade_level ?? 3

    const [step, setStep] = useState<Step>('intro')
    const [passage, setPassage] = useState<Passage | null>(null)
    const [submitted, setSubmitted] = useState(false)
    const rec = useRecorder()

    const showPassageStep = step === 'passage' && !!passage

    const generatePassage = async () => {
        if (!assessmentLang) return
        setStep('loading')
        if (USE_PLACEHOLDER_PASSAGE) {
            await new Promise((resolve) => setTimeout(resolve, 400))
            setPassage(PLACEHOLDER_PASSAGES[assessmentLang])
            setStep('passage')
            return
        }
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

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStep('intro')
        setPassage(null)
    }, [assessmentLang])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSubmitted(false)
        rec.reset()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [passage])

    if (!assessmentLang) {
        return <Navigate to="/reading/proficiency/assessment" replace />
    }

    const isNonReader = activeProfile?.is_non_reader === true

    const handleSubmit = () => {
        setSubmitted(true)
    }

    return (
        <div
            className={
                showPassageStep
                    ? 'mx-auto w-full max-w-[1350px] px-6 pb-6 pt-2 sm:px-10'
                    : 'mx-auto max-w-3xl px-4 pb-12 pt-2'
            }
        >
            {isAssisted && studentNameParam && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-teal-500/25 bg-teal-500/10 px-4 py-2.5 text-sm font-bold text-teal-700 dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-300">
                    <UserRound size={16} />
                    {t.assistedBannerLabel}: {studentNameParam}
                </div>
            )}

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
                    <div className="relative flex flex-col gap-5">
                        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
                            <Owl mood="greeting" size={64} bob />
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
                                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                    <span className="inline-block rounded-full bg-teal-500/15 px-3 py-1 text-xs font-bold text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                                        {t.gradeLabel(gradeLevel)}
                                    </span>
                                    <span className="inline-block rounded-full bg-gray-900/5 px-3 py-1 text-xs font-bold text-gray-700 dark:bg-gray-100/10 dark:text-gray-300">
                                        {assessmentLang === 'fil' ? t.filipinoLabel : t.englishLabel}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={generatePassage}
                            className="mx-auto flex cursor-pointer items-center gap-2 rounded-full bg-teal-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59] sm:mx-0"
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

            {showPassageStep && passage && (
                <div className="grid gap-6 lg:h-[calc(100vh-14rem)] lg:grid-cols-[1.6fr_1fr]">
                    <PassagePanel t={t} gradeLevel={gradeLevel} assessmentLang={assessmentLang} passage={passage} />
                    <RecorderPanel t={t} submitted={submitted} rec={rec} onSubmit={handleSubmit} />
                </div>
            )}
        </div>
    )
}

export default AssessmentSession