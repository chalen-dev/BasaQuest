// File: AssessmentSession.tsx
// File: AssessmentSession.tsx
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
// NAVIGATION GUARD (this pass): hasUnsavedChanges tracks
// AttemptWordReview.tsx's own unsaved-edit state (via its
// onUnsavedChangesChange callback) for the inline "Now"-mode review
// step, fed into useUnsavedChangesBlocker in SILENT mode (see
// src/hooks/useUnsavedChangesBlocker.ts) — this covers the browser's
// back/forward buttons and closing the tab mid-review, auto-saving a
// draft first with no confirmation dialog, matching
// AssessmentSessionHeader.tsx's own Exit button philosophy exactly
// ("nothing here is actually being lost, so nothing to confirm"). That
// Exit button itself is UNCHANGED — it already calls the registered
// reviewSaveHandler before navigating, and since that save already
// clears hasUnsavedChanges before navigate() runs, this new blocker
// simply won't have anything to intercept when Exit is used, avoiding a
// redundant double-save.
//
// PASSAGE CACHING (sessionStorage): a generated passage now survives a
// browser reload — previously, refreshing this page always dropped
// straight back to the 'intro' step, and clicking Start again called
// generatePassage() from scratch, spending another round of AI credits
// (real Gemini credits when USE_PLACEHOLDER_PASSAGE is off in devFlags.ts)
// on a passage that had already been generated moments earlier. Now every
// successfully generated passage is stashed in sessionStorage under a key
// scoped to (language, which student this session is for) via
// writeCachedPassage() below, and on mount — see the assessmentLang effect
// — readCachedPassage() is checked FIRST; a hit skips straight to the
// 'passage' step with the cached text instead of showing 'intro' at all.
// generatePassage() itself also checks the cache before calling the real
// API, so even an explicit Start click after a lost cache-miss reload
// won't double-spend credits if a cached passage is still there.
// sessionStorage (not localStorage) is deliberate — it survives a reload/
// refresh (the actual complaint) but clears once the tab is closed, so
// nobody ends up permanently stuck re-reading a months-old passage.
// The cache is cleared the moment a take is actually submitted (see
// handleSubmit) — once a reading has been turned in, the NEXT check-in
// for this student+language should get a genuinely fresh passage, not
// keep replaying the one that was just recorded against.
//
// LOADING STATES → SKELETONS (see components/ui/Skeleton.tsx): all three
// OwlLoader spinners on this page now show placeholder shapes instead:
//   - profileLoading: a skeleton of the 'intro' card itself (owl circle,
//     kicker/title/desc lines, badge pills, start-button pill).
//   - step === 'loading' (passage generation): a skeleton of the actual
//     two-panel passage/recorder grid — same grid classes as the real
//     'passage' step (see the container className below, which now also
//     widens for this step) so there's no layout jump once the real
//     passage lands.
//   - the inline-review "still scoring" branch: keeps its explanatory
//     text (this is a genuinely indeterminate wait on the external
//     scoring service, not "content about to pop in", so the copy stays)
//     but the spinner icon is replaced with a skeleton preview of the
//     two-panel AttemptWordReview layout that's about to load in.
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
// teacher keep going rather than treat it as a finish line. DISCARD
// (useDiscardAttemptMutation) permanently deletes the attempt instead —
// see handleDiscardReview below — and, per how AttemptWordReview.tsx's
// Discard button behaves everywhere it's used, navigates to the Pending
// Review list once done rather than staying on this screen or going back
// to the student picker. If the discard mutation throws (e.g. an RLS
// policy gap on the Supabase side rejecting the delete), an error toast
// is shown and the teacher stays right here instead of being silently
// left with no feedback at all — previously this was a console.error only.
//
// SCORING FAILURE HANDLING: if scoring never reaches 'scored' because
// something actually failed (see useSubmitAttempt.ts's runScoring /
// markAttemptFailed), the attempt lands on status: 'failed' instead of
// sitting at 'pending'/'processing' forever. The inline review branch
// below has a dedicated 'failed' case for that — an error card with a
// "Try Again" button wired to useRetryScoring, which re-runs scoring on
// the SAME attemptId (clearing any partial word rows first) rather than
// forcing the teacher to redo the whole recording. After the retry
// mutation settles, attemptQuery.refetch() is called directly (rather
// than relying on refetchInterval, which had already stopped polling
// once the query saw status: 'failed') so the UI picks up whatever the
// retry actually produced — including immediately going back to
// 'failed' again if the retry also fails.
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
// used for the passage/recorder grid whenever showPassageStep,
// showInlineReview, or step === 'loading' is true (the last one added so
// the new passage/recorder skeleton grid gets the same width the real
// grid will occupy an instant later, instead of squeezing a wide skeleton
// into the narrower intro-card container) — AttemptWordReview's two-panel
// layout (passage left, word list right) needs real width or both panels
// get crushed into a phone-width column.
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
import { Skeleton } from '../../../../components/ui/Skeleton.tsx'
import { useProfile } from '../../../../hooks/useProfile.ts'
import { useLang } from '../../../../contexts/LangContext.tsx'
import { useTheme } from '../../../../contexts/ThemeContext.tsx'
import { supabase } from '../../../../lib/supabaseClient.ts'
import { showToast } from '../../../../helpers/swalHelpers.ts'
import { useAssistedStudentProfile } from '../hooks.ts'
import { useUnsavedChangesBlocker } from '../../../../hooks/useUnsavedChangesBlocker.ts'
import { useRecorder } from './features/useRecorder.ts'
import { useSubmitAttempt, useRetryScoring } from './features/useSubmitAttempt.ts'
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
    useDiscardAttemptMutation,
    useSaveDraftMutation,
    useSubmitReviewMutation,
    type WordReviewOverride,
} from '../../../students/review/hooks.ts'
import { AttemptWordReview, type AttemptWordReviewHandle } from '../../../students/review/features/AttemptWordReview.tsx'
// See this file's PASSAGE CACHING header comment above. `studentKey` is
// the assisted session's studentId param, or the literal string 'self'
// for a student's own non-assisted session — using a fixed 'self' rather
// than the pupil's own profile id sidesteps a timing issue (ownProfile
// hasn't necessarily loaded yet the moment this file first mounts) and is
// safe in practice since a non-assisted session is always one pupil on
// their own login in their own tab.
const PASSAGE_CACHE_PREFIX = 'bq_passage_cache:'
function passageCacheKey(lang: Lang, studentKey: string): string {
    return `${PASSAGE_CACHE_PREFIX}${lang}:${studentKey}`
}
function readCachedPassage(lang: Lang, studentKey: string): Passage | null {
    try {
        const raw = sessionStorage.getItem(passageCacheKey(lang, studentKey))
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<Passage>
        if (typeof parsed?.title === 'string' && typeof parsed?.passage === 'string') {
            return { title: parsed.title, passage: parsed.passage }
        }
        return null
    } catch {
        // Malformed JSON, or sessionStorage unavailable (private
        // browsing edge cases) — just treat it as a cache miss.
        return null
    }
}
function writeCachedPassage(lang: Lang, studentKey: string, passage: Passage): void {
    try {
        sessionStorage.setItem(passageCacheKey(lang, studentKey), JSON.stringify(passage))
    } catch {
        // Storage full or unavailable — the passage still works for this
        // session, it just won't survive a reload. Not worth surfacing.
    }
}
function clearCachedPassage(lang: Lang, studentKey: string): void {
    try {
        sessionStorage.removeItem(passageCacheKey(lang, studentKey))
    } catch {
        // see writeCachedPassage
    }
}
export const AssessmentSession: React.FC = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { registerReviewSaveHandler } = useOutletContext<AssessmentSessionOutletContext>()
    const rawLang = searchParams.get('lang')
    const assessmentLang: Lang | null = rawLang === 'fil' || rawLang === 'en' ? rawLang : null
    const studentIdParam = searchParams.get('studentId')
    const studentNameParam = searchParams.get('studentName')
    const isAssisted = !!studentIdParam
    const passageCacheStudentKey = isAssisted ? (studentIdParam as string) : 'self'
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
    const retryScoring = useRetryScoring()
    const reviewRef = useRef<AttemptWordReviewHandle>(null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const showPassageStep = step === 'passage' && !!passage
    // Only ever polled for an assisted session that's actually been
    // submitted — the non-assisted case never needs this data at all.
    const showInlineReview = isAssisted && submitted
    const attemptQuery = useAttemptQuery(showInlineReview ? attemptId : null)
    const wordsQuery = useAttemptWordsQuery(attemptId, showInlineReview && attemptQuery.data?.status === 'scored')
    const submitReview = useSubmitReviewMutation(ownProfile?.id)
    const saveDraft = useSaveDraftMutation(ownProfile?.id)
    const discardAttempt = useDiscardAttemptMutation(ownProfile?.id)
    // True only once the actual AttemptWordReview UI is on screen (not
    // just "submitted and waiting on scoring") — matches the render
    // condition below exactly, since that's the only window where
    // reviewRef.current is non-null and there's anything to save.
    const reviewReady = showInlineReview && attemptQuery.data?.status === 'scored' && !!wordsQuery.data
    // Covers the browser's own back/forward buttons and tab close/
    // refresh mid-review — see this file's header comment for why this
    // is SILENT (no dialog), matching AssessmentSessionHeader.tsx's Exit
    // button. `reviewReady &&` guards against a stray true left over
    // from a just-unmounted AttemptWordReview instance.
    useUnsavedChangesBlocker({
        hasUnsavedChanges: reviewReady && hasUnsavedChanges,
        onSaveDraft: async () => {
            await reviewRef.current?.saveDraftNow()
        },
        silent: true,
    })
    const generatePassage = async () => {
        if (!assessmentLang) return
        // Cache check first — a Start click after a reload wiped local
        // state (but not sessionStorage) should never re-spend credits
        // on a passage that already exists. See PASSAGE CACHING comment.
        const cached = readCachedPassage(assessmentLang, passageCacheStudentKey)
        if (cached) {
            setPassage(cached)
            setStep('passage')
            return
        }
        setStep('loading')
        if (USE_PLACEHOLDER_PASSAGE) {
            await new Promise((resolve) => setTimeout(resolve, 400))
            const placeholder = PLACEHOLDER_PASSAGES[assessmentLang]
            setPassage(placeholder)
            writeCachedPassage(assessmentLang, passageCacheStudentKey, placeholder)
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
            writeCachedPassage(assessmentLang, passageCacheStudentKey, data)
            setStep('passage')
        } catch (err) {
            console.error('AssessmentSession: failed to generate passage', err)
            setStep('error')
        }
    }
    // On mount, and whenever the language/assisted-student identity
    // changes, check for a cached passage FIRST (see PASSAGE CACHING
    // header comment) — a hit restores straight to the 'passage' step
    // with no API call at all, which is what makes a plain browser
    // reload no longer waste a fresh generation. A miss falls back to
    // the original behavior of resetting to 'intro'.
    useEffect(() => {
        if (!assessmentLang) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStep('intro')
            setPassage(null)
            return
        }
        const cached = readCachedPassage(assessmentLang, passageCacheStudentKey)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (cached) {
            setPassage(cached)
            setStep('passage')
        } else {
            setPassage(null)
            setStep('intro')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assessmentLang, passageCacheStudentKey])
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
    // (console.error only, no failure toast). On success, also clears
    // this passage out of the cache (see PASSAGE CACHING comment) — once
    // a reading has actually been turned in, the next check-in for this
    // student+language should get a genuinely fresh passage rather than
    // keep serving the one just recorded against.
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
            clearCachedPassage(assessmentLang, passageCacheStudentKey)
        } catch (err) {
            console.error('AssessmentSession: failed to submit attempt', err)
        }
    }
    // Confirms the teacher's word-level review right here on the session
    // screen (assisted/"Now" mode only), then routes to the read-only
    // results page for this attempt — same destination TeacherReviewAttempt.tsx's
    // Send-mode confirm now uses, so both flows land somewhere with the
    // actual final scores instead of one of them just bouncing back to a
    // list/picker screen with nothing to show for it.
    const handleConfirmReview = async (overrides: WordReviewOverride[]) => {
        if (!attemptId || !attemptQuery.data) return
        try {
            await submitReview.mutateAsync({ attemptId, overrides, audioPath: attemptQuery.data.audio_path })
            showToast(t.reviewConfirmedToast, 'success', theme === 'dark')
            navigate(`/students/review/${attemptId}/results`)
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
    // Permanently deletes this attempt — see useDiscardAttemptMutation in
    // hooks.ts for exactly what gets removed (word rows, the recording,
    // the attempt row itself). Uses an inline bilingual string, same
    // reasoning as handleSaveDraft above. Navigates to the Pending Review
    // list once done, matching TeacherReviewAttempt.tsx's own Discard
    // destination — NOT back to the student picker, even though this is
    // the "Now" mode flow, since that's the consistent behavior asked for
    // regardless of which screen Discard is triggered from. On failure
    // (e.g. an RLS policy gap rejecting the delete server-side), shows an
    // error toast and stays right here — previously this was a
    // console.error only, so a failed discard looked identical to nothing
    // happening at all.
    const handleDiscardReview = async () => {
        if (!attemptId || !attemptQuery.data) return
        try {
            await discardAttempt.mutateAsync({ attemptId, audioPath: attemptQuery.data.audio_path })
            showToast(uiLang === 'fil' ? 'Itinapon ang pagbasang ito.' : 'This reading was discarded.', 'success', theme === 'dark')
            navigate('/students/review')
        } catch (err) {
            console.error('AssessmentSession: failed to discard attempt', err)
            showToast(
                uiLang === 'fil'
                    ? 'Hindi na-itapon ang pagbasang ito. Pakisubukang muli.'
                    : "Couldn't discard this reading. Please try again.",
                'error',
                theme === 'dark'
            )
        }
    }
    // Re-runs scoring on the SAME attempt (see useSubmitAttempt.ts's
    // useRetryScoring) after a scoring failure — no re-upload, no new
    // recording. attemptQuery.refetch() is called afterward regardless of
    // outcome because refetchInterval had already stopped polling once it
    // saw status: 'failed' (see hooks.ts's useAttemptQuery); a plain
    // refetch is what picks the UI back up, whether the retry landed on
    // 'processing' (real service, still working), 'scored' (placeholder,
    // already done by the time mutateAsync resolves), or 'failed' again.
    const handleRetryScoring = async () => {
        if (!attemptId || !passage) return
        try {
            await retryScoring.mutateAsync({ attemptId, language: assessmentLang, passageText: passage.passage })
        } catch (err) {
            console.error('AssessmentSession: failed to retry scoring', err)
        } finally {
            attemptQuery.refetch()
        }
    }
    return (
        <div
            className={
                showPassageStep || showInlineReview || step === 'loading'
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
                <section
                    role="status"
                    aria-busy="true"
                    className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8"
                >
                    <span className="sr-only">…</span>
                    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
                        <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
                        <div className="flex-1">
                            <Skeleton className="mx-auto h-3 w-24 rounded-full sm:mx-0" />
                            <Skeleton className="mx-auto mt-2 h-7 w-2/3 rounded-lg sm:mx-0" />
                            <Skeleton className="mt-3 h-3 w-full rounded-full" />
                            <Skeleton className="mt-2 h-3 w-4/5 rounded-full" />
                            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                        </div>
                    </div>
                    <Skeleton className="mx-auto mt-5 h-11 w-40 rounded-full sm:mx-0" />
                </section>
            )}
            {!profileLoading && isNonReader && step === 'intro' && (
                <section className="flex flex-col items-center gap-4 rounded-3xl border border-amber-500/25 bg-amber-500/5 p-8 text-center shadow-sm dark:border-amber-400/25 dark:bg-amber-400/5">
                    <Owl mood="neutral" size={80} bob />
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
                            <Owl mood="neutral" size={64} bob />
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
                <div className="grid gap-6 lg:h-[calc(100vh-14rem)] lg:grid-cols-[1.6fr_1fr]">
                    <section
                        role="status"
                        aria-busy="true"
                        className="flex h-full flex-col overflow-hidden rounded-3xl border border-gray-900/5 bg-white p-8 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-10"
                    >
                        <span className="sr-only">{t.loadingMessage}</span>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-16 rounded-full" />
                            <Skeleton className="h-4 w-14 rounded-full" />
                        </div>
                        <Skeleton className="mt-4 h-8 w-2/3 rounded-lg" />
                        <div className="mt-6 flex flex-1 flex-col gap-3">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className={`h-4 rounded-full ${i % 4 === 3 ? 'w-2/3' : 'w-full'}`} />
                            ))}
                        </div>
                    </section>
                    <section
                        role="status"
                        aria-busy="true"
                        className="flex h-full flex-col items-center justify-center gap-6 rounded-3xl border border-gray-900/5 bg-white p-8 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-10"
                    >
                        <Skeleton className="h-4 w-24 rounded-full" />
                        <Skeleton className="h-12 w-32 rounded-lg" />
                        <Skeleton className="h-20 w-full max-w-xs rounded-2xl" />
                        <Skeleton className="h-36 w-36 rounded-full" />
                        <Skeleton className="h-11 w-full rounded-full" />
                    </section>
                </div>
            )}
            {step === 'error' && (
                <section className="flex flex-col items-center gap-4 rounded-3xl border border-gray-900/5 p-8 text-center shadow-sm dark:border-gray-100/10">
                    <Owl mood="neutral" size={72} />
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
                        onDiscard={handleDiscardReview}
                        discarding={discardAttempt.isPending}
                        studentName={studentNameParam}
                        heightBudget={{ base: 144, lg: 128 }}
                        onUnsavedChangesChange={setHasUnsavedChanges}
                    />
                ) : attemptQuery.data?.status === 'failed' ? (
                    <section className="flex flex-col items-center gap-4 rounded-3xl border border-red-500/25 bg-red-500/5 p-8 text-center shadow-sm dark:border-red-400/25 dark:bg-red-400/5">
                        <Owl mood="neutral" size={72} />
                        <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.scoringFailedTitle}</h2>
                        <p className="max-w-md text-sm font-medium text-gray-600 dark:text-gray-400">{t.scoringFailedDesc}</p>
                        <button
                            onClick={handleRetryScoring}
                            disabled={retryScoring.isPending}
                            className={`flex items-center gap-2 rounded-full bg-teal-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59] ${
                                retryScoring.isPending ? 'cursor-not-allowed opacity-50 hover:translate-y-0' : 'cursor-pointer'
                            }`}
                        >
                            <RefreshCw size={16} />
                            {retryScoring.isPending ? t.retryingScoringLabel : t.retryScoringLabel}
                        </button>
                    </section>
                ) : (
                    <div className="flex flex-col gap-4">
                        <section className="flex flex-col items-center gap-2 rounded-3xl border border-amber-500/25 bg-amber-500/5 p-6 text-center shadow-sm dark:border-amber-400/25 dark:bg-amber-400/5">
                            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.scoringTitle}</h2>
                            <p className="max-w-md text-sm font-medium text-gray-600 dark:text-gray-400">{t.scoringDesc}</p>
                        </section>
                        <div role="status" aria-busy="true" className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                            <span className="sr-only">{t.scoringTitle}</span>
                            <div className="rounded-3xl border border-gray-900/5 bg-white p-8 shadow-sm dark:border-gray-100/10 dark:bg-gray-900">
                                <Skeleton className="h-3 w-24 rounded-full" />
                                <div className="mt-5 flex flex-col gap-2.5">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <Skeleton key={i} className={`h-3.5 rounded-full ${i === 5 ? 'w-2/3' : 'w-full'}`} />
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-3xl border border-gray-900/5 bg-white p-6 shadow-sm dark:border-gray-100/10 dark:bg-gray-900">
                                <Skeleton className="h-3 w-28 rounded-full" />
                                <div className="mt-4 flex flex-col gap-3">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-14 w-full rounded-2xl" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    )
}
export default AssessmentSession