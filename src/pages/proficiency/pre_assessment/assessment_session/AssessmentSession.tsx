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
// a MAX_RECORDING_SECONDS auto-stop cap.
//
// Submission (handleSubmit, via useSubmitAttempt) uploads the take to the
// assessment-recordings bucket, creates its assessment_attempts row, and
// — English only, for now — kicks off scoring on the basaquest-scoring
// service (Azure Pronunciation Assessment). Filipino attempts are saved
// but not yet scored by anything; there's no Filipino scoring pipeline
// wired up here (that's the separate basaquest-filipino-miscue-detection
// project). If there's no real Blob (mic was unavailable and the pupil
// continued via the simulated take — see useRecorder.ts's `simulate`),
// there's nothing to upload or score, so it falls back to the old
// local-only "flip to pending UI" behavior instead.
//
// ASSISTED ("Now" mode) INLINE REVIEW: scoring runs async on the separate
// basaquest-scoring service, so submitting doesn't mean scoring is done
// yet. For an assisted session, the teacher is physically still at this
// screen, so once submitted this file polls the new attempt (useAttemptQuery,
// from students/review/hooks.ts — the same data layer the standalone
// "Send"-mode review page uses) and, once it lands on status 'scored',
// swaps the passage/recorder grid out for the shared AttemptWordReview
// panel right here, instead of leaving the teacher on the old permanent
// "Waiting for Teacher" card (which only ever made sense for the
// non-assisted/self-serve case, where there's no teacher present to
// review anything right now — that case still gets the old card,
// untouched, via RecorderPanel's own `submitted` branch). Confirming here
// calls the same useSubmitReviewMutation the "Send"-mode review page
// uses, then routes back to the student picker — mirroring
// AssessmentSessionHeader's own Exit-button routing for assisted sessions.
// Save Draft (useSaveDraftMutation) works the same way but stays on this
// screen — it doesn't navigate anywhere, since the point is to let the
// teacher keep going rather than treat it as a finish line.
//
// EXIT-DURING-REVIEW: registers a save handler with
// AssessmentSessionLayout.tsx (via useOutletContext, see that file's own
// comment for the full wiring) for exactly as long as the actual review
// UI is on screen (reviewReady below — scored data loaded, not just
// "submitted"). AssessmentSessionHeader.tsx's Exit button calls that
// handler instead of showing its normal confirm dialog, which is why
// this holds a ref to AttemptWordReview: the verdicts/flags/overrides a
// teacher has been editing live inside THAT component's own state, not
// here, so reaching them means calling AttemptWordReview's own
// saveDraftNow() rather than duplicating that state up into this file.
//
// CONTAINER WIDTH: the outer container widens to the same max-w-[1350px]
// used for the passage/recorder grid whenever showInlineReview is true —
// AttemptWordReview's two-panel layout (passage left, word list right)
// needs real width or both panels get crushed into a phone-width column.
//
// The old "Acting as: {name}" banner only renders for the intro/passage/
// recording steps now (!showInlineReview) — once the review step is
// showing, AttemptWordReview itself displays the student's name
// prominently inside its own card (via the studentName prop below), so
// repeating it in a second tiny banner above the card would be redundant.
import React, { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { BookOpenCheck, RefreshCw, UserRound } from 'lucide-react'
import { Owl } from '../../../../components/ui/Owl.tsx'
import { OwlLoader } from '../../../../components/ui/OwlLoader.tsx'
import { useProfile } from '../../../../hooks/useProfile.ts'
import { useLang } from '../../../../contexts/LangContext.tsx'
import { useTheme } from '../../../../contexts/ThemeContext.tsx'
import { supabase } from '../../../../lib/supabaseClient.ts'
import { showToast } from '../../../../helpers/swalHelpers.ts'
import { useAssistedStudentProfile } from '../hooks.ts'
import { useRecorder } from './features/useRecorder.ts'
import { useSubmitAttempt } from './features/useSubmitAttempt.ts'
import { PassagePanel } from './features/PassagePanel.tsx'
import { RecorderPanel } from './features/RecorderPanel.tsx'
import {
    PLACEHOLDER_PASSAGES,
    STRINGS,
    type Passage,
    type Step,
} from './assessmentSessionStrings.ts'
import { USE_PLACEHOLDER_PASSAGE } from '../../../../../devFlags.ts'
import type { Lang } from '../../../../components/buttons/LangToggle.tsx'
import type { AssessmentSessionOutletContext } from './layouts/AssessmentSessionLayout.tsx'
import {
    useAttemptQuery,
    useAttemptWordsQuery,
    useSaveDraftMutation,
    useSubmitReviewMutation,
    type WordReviewOverride,
} from '../../../students/review/hooks.ts'
import { AttemptWordReview, type AttemptWordReviewHandle } from '../../../students/review/features/AttemptWordReview.tsx'
export const AssessmentSession: React.FC = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { registerReviewSaveHandler } = useOutletContext<AssessmentSessionOutletContext>()
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
    const { theme } = useTheme()
    const t = STRINGS[uiLang]
    const gradeLevel = activeProfile?.grade_level ?? 3
    const [step, setStep] = useState<Step>('intro')
    const [passage, setPassage] = useState<Passage | null>(null)
    const [submitted, setSubmitted] = useState(false)
    const [attemptId, setAttemptId] = useState<string | null>(null)
    const rec = useRecorder()
    const submitAttempt = useSubmitAttempt()
    const reviewRef = useRef<AttemptWordReviewHandle>(null)
    const showPassageStep = step === 'passage' && !!passage
    // Only ever polled for an assisted session that's actually been
    // submitted — the non-assisted case never needs this data at all.
    const showInlineReview = isAssisted && submitted
    const attemptQuery = useAttemptQuery(showInlineReview ? attemptId : null)
    const wordsQuery = useAttemptWordsQuery(attemptId, showInlineReview && attemptQuery.data?.status === 'scored')
    const submitReview = useSubmitReviewMutation(ownProfile?.id)
    const saveDraft = useSaveDraftMutation(ownProfile?.id)
    // True only once the actual AttemptWordReview UI is on screen (not
    // just "submitted and waiting on scoring") — matches the render
    // condition below exactly, since that's the only window where
    // reviewRef.current is non-null and there's anything to save.
    const reviewReady = showInlineReview && attemptQuery.data?.status === 'scored' && !!wordsQuery.data
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
        setAttemptId(null)
        rec.reset()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [passage])
    // Registers/unregisters the Exit-button save handler with the layout
    // exactly for as long as reviewReady is true — see this file's
    // header comment and AssessmentSessionLayout.tsx's own comment for
    // the full wiring. registerReviewSaveHandler is stable (wrapped in
    // useCallback in the layout), so this effect only re-fires when
    // reviewReady itself flips.
    useEffect(() => {
        if (!reviewReady) {
            registerReviewSaveHandler(null)
            return
        }
        registerReviewSaveHandler(async () => {
            await reviewRef.current?.saveDraftNow()
        })
        return () => registerReviewSaveHandler(null)
    }, [reviewReady, registerReviewSaveHandler])
    if (!assessmentLang) {
        return <Navigate to="/reading/proficiency/assessment" replace />
    }
    const isNonReader = activeProfile?.is_non_reader === true
    // Uploads the take, creates its assessment_attempts row, and (English
    // only) kicks off scoring — see this file's header comment and
    // useSubmitAttempt.ts for the full breakdown. Falls back to the old
    // local-only stub when there's no real Blob to submit (simulated
    // take). On failure, just logs and leaves the UI in the pre-submit
    // state so the pupil/teacher can hit Submit again — matching how
    // handleAssign/handleCancel elsewhere in this app handle failures
    // (console.error only, no failure toast).
    const handleSubmit = async () => {
        if (!passage) return
        if (!rec.blob) {
            setSubmitted(true)
            return
        }
        const studentId = isAssisted ? studentIdParam : ownProfile?.id
        if (!studentId) {
            console.error('AssessmentSession: missing studentId at submit time')
            return
        }
        const teacherId = isAssisted ? (ownProfile?.id ?? null) : (ownProfile?.teacher_id ?? null)
        try {
            const result = await submitAttempt.mutateAsync({
                studentId,
                teacherId,
                language: assessmentLang,
                passageTitle: passage.title,
                passageText: passage.passage,
                gradeLevel,
                blob: rec.blob,
                durationSeconds: rec.seconds,
            })
            setAttemptId(result.attemptId)
            setSubmitted(true)
        } catch (err) {
            console.error('AssessmentSession: failed to submit attempt', err)
        }
    }
    // Confirms the teacher's word-level review right here on the session
    // screen (assisted/"Now" mode only), then routes back to the student
    // picker — same destination AssessmentSessionHeader's Exit button
    // already uses for an assisted session, so behavior stays consistent
    // whether the teacher exits early or actually finishes a review.
    const handleConfirmReview = async (overrides: WordReviewOverride[]) => {
        if (!attemptId) return
        try {
            await submitReview.mutateAsync({ attemptId, overrides })
            showToast(t.reviewConfirmedToast, 'success', theme === 'dark')
            navigate('/reading/proficiency/assessment')
        } catch (err) {
            console.error('AssessmentSession: failed to confirm review', err)
        }
    }
    // Saves the in-progress review without finalizing it or leaving this
    // screen — unlike handleConfirmReview, there's nowhere to navigate to,
    // since the whole point is the teacher keeps working from right here.
    // Uses an inline bilingual string rather than adding a key to
    // assessmentSessionStrings.ts's STRINGS object. Also what the Exit
    // button ends up calling (via reviewRef) when exiting mid-review.
    const handleSaveDraft = async (overrides: WordReviewOverride[]) => {
        if (!attemptId) return
        try {
            await saveDraft.mutateAsync({ attemptId, overrides })
            showToast(uiLang === 'fil' ? 'Na-save ang draft.' : 'Draft saved.', 'success', theme === 'dark')
        } catch (err) {
            console.error('AssessmentSession: failed to save draft', err)
        }
    }
    return (
        <div
            className={
                showPassageStep || showInlineReview
                    ? 'mx-auto w-full max-w-[1350px] px-6 pb-6 pt-2 sm:px-10'
                    : 'mx-auto max-w-3xl px-4 pb-12 pt-2'
            }
        >
            {isAssisted && studentNameParam && !showInlineReview && (
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
            {showPassageStep && passage && !showInlineReview && (
                <div className="grid gap-6 lg:h-[calc(100vh-14rem)] lg:grid-cols-[1.6fr_1fr]">
                    <PassagePanel t={t} gradeLevel={gradeLevel} assessmentLang={assessmentLang} passage={passage} />
                    <RecorderPanel t={t} submitted={submitted} submitting={submitAttempt.isPending} rec={rec} onSubmit={handleSubmit} />
                </div>
            )}
            {showInlineReview && (
                attemptQuery.data?.status === 'scored' && wordsQuery.data ? (
                    <AttemptWordReview
                        ref={reviewRef}
                        attempt={attemptQuery.data}
                        words={wordsQuery.data}
                        onConfirm={handleConfirmReview}
                        confirming={submitReview.isPending}
                        onSaveDraft={handleSaveDraft}
                        savingDraft={saveDraft.isPending}
                        studentName={studentNameParam}
                    />
                ) : (
                    <section className="flex flex-col items-center gap-4 rounded-3xl border border-amber-500/25 bg-amber-500/5 p-8 text-center shadow-sm dark:border-amber-400/25 dark:bg-amber-400/5">
                        <OwlLoader message="…" />
                        <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.scoringTitle}</h2>
                        <p className="max-w-md text-sm font-medium text-gray-600 dark:text-gray-400">{t.scoringDesc}</p>
                    </section>
                )
            )}
        </div>
    )
}
export default AssessmentSession