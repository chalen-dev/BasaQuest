// File: TeacherReviewAttempt.tsx
// File: TeacherReviewAttempt.tsx
// File: src/pages/students/review/TeacherReviewAttempt.tsx
//
// Detail page for reviewing a single "Send"-mode attempt. Routed at
// /students/review/:attemptId, reached from ReviewList.tsx. Renders the
// same AttemptWordReview component the inline "Now"-mode step uses, so
// the two flows produce identical review data.
//
// CONTAINER WIDTH: widens to max-w-[1350px] only for the actual review
// step (showingWordReview) — AttemptWordReview's two-panel layout needs
// real width or both panels get crushed. Every other state here
// (loading/failed/not-found) is just a centered message card, so those
// stay at the narrower max-w-3xl.
//
// The old small "{for} {studentName}" line only renders when NOT showing
// the word-review step — once AttemptWordReview is on screen it displays
// the student's name itself, prominently, inside its own card (via the
// studentName prop below), so repeating it in a second tiny line above
// the card would be redundant.
//
// BACK BUTTON: while showingWordReview is true, Back fires a three-way
// swal (showSaveOnLeaveConfirmation) — Save & Leave / Discard & Leave /
// Stay — instead of navigating straight away, since there could be
// unsaved verdict/flag/error-type edits sitting in AttemptWordReview's
// own local state. "Save & Leave" calls into that state via reviewRef
// (the same saveDraftNow() escape hatch AssessmentSessionHeader.tsx uses
// for its own Exit button — see AttemptWordReview.tsx's own comment).
// Every OTHER state on this page (loading, scoring, failed, not-found)
// has nothing to save, so Back just navigates immediately there, same
// as before. NOTE: this three-way "Discard & Leave" choice is a
// DIFFERENT, older concept than AttemptWordReview.tsx's own Discard
// button below — this one just discards unsaved EDITS on an attempt
// that still exists, while the new Discard button deletes the whole
// ATTEMPT permanently. They happen to share a word but not a mechanism.
//
// CONFIRM DESTINATION / ALREADY-REVIEWED: confirming a review now routes
// to AttemptResults.tsx (/students/review/:attemptId/results) instead of
// straight back to the review inbox — see that file's own comment for
// why. An already-reviewed attempt landing here (a stale link, a
// bookmark, Dashboard's Recent Activity) redirects straight to that same
// results page instead of rendering anything editable.
//
// DISCARD (permanent delete): handleDiscard below is what
// AttemptWordReview.tsx's own Discard button calls, via the onDiscard
// prop — see useDiscardAttemptMutation in hooks.ts for what actually
// gets deleted (word rows, the recording, the attempt row itself). Once
// it resolves, this page just navigates back to the Pending Review list
// — there's nothing left on screen to show, since the attempt this page
// was displaying no longer exists. If the mutation throws (e.g. an RLS
// policy gap on the Supabase side rejecting the delete), we now show an
// error toast instead of silently leaving the teacher stuck on this
// screen with no feedback — previously this was a console.error only.
//
// RE-EDITING A CONFIRMED ATTEMPT: this page no longer has any special
// handling for that case — AttemptResults.tsx's "Edit Results" button
// now genuinely clears reviewed_at/reviewed_by on the attempt itself
// (via useReopenAttemptMutation in hooks.ts) before ever navigating
// here, and then sends the teacher to the Pending Review list rather
// than straight into this page. So by the time this page is opened from
// that list, the attempt is honestly unreviewed again, and the normal
// branch below handles it with no special-casing needed. An earlier
// version of this file supported an explicit "?edit=1" query param to
// bypass the reviewed_at redirect without changing the database — that
// was removed once reopening started actually updating reviewed_at,
// since it made the bypass redundant.
import React, { useRef } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { useProfile } from '../../../hooks/useProfile'
import { OwlLoader } from '../../../components/ui/OwlLoader'
import { Owl } from '../../../components/ui/Owl'
import { showSaveOnLeaveConfirmation, showToast } from '../../../helpers/swalHelpers'
import type { Lang } from '../../../components/buttons/LangToggle'
import {
    useAttemptQuery,
    useAttemptWordsQuery,
    useDiscardAttemptMutation,
    useSaveDraftMutation,
    useStudentProfileQuery,
    useSubmitReviewMutation,
    type WordReviewOverride,
} from './hooks'
import { AttemptWordReview, type AttemptWordReviewHandle } from './features/AttemptWordReview'
const STRINGS: Record<Lang, {
    back: string
    for: string
    unnamedStudent: string
    loading: string
    scoringTitle: string
    scoringDesc: string
    failedTitle: string
    failedDesc: string
    notFoundTitle: string
    notFoundDesc: string
    confirmedToast: string
    draftSavedToast: string
    discardedToast: string
    discardFailedToast: string
    leaveDialogTitle: string
    leaveDialogText: string
    leaveDialogSaveButton: string
    leaveDialogDiscardButton: string
    leaveDialogCancelButton: string
}> = {
    fil: {
        back: 'Bumalik sa Review',
        for: 'Para kay',
        unnamedStudent: 'Estudyante',
        loading: 'Kinukuha ang detalye...',
        scoringTitle: 'Isinasagawa pa ang Pagsusuri',
        scoringDesc: 'Sinusuri pa ng sistema ang pagbasang ito. Maghintay lang ng ilang segundo.',
        failedTitle: 'Hindi Nasuri',
        failedDesc: 'May problema sa pagsusuri sa pagbasang ito. Wala pang paraan para subukan ulit dito.',
        notFoundTitle: 'Hindi Nahanap',
        notFoundDesc: 'Hindi na available ang pagbasang ito.',
        confirmedToast: 'Nakumpirma ang resulta.',
        draftSavedToast: 'Na-save ang draft.',
        discardedToast: 'Itinapon ang pagbasang ito.',
        discardFailedToast: 'Hindi na-itapon ang pagbasang ito. Pakisubukang muli.',
        leaveDialogTitle: 'Lumabas sa pagsusuring ito?',
        leaveDialogText: 'May mga pagbabagong hindi pa na-save. I-save muna bilang draft bago umalis, o i-discard na lang?',
        leaveDialogSaveButton: 'I-save at Umalis',
        leaveDialogDiscardButton: 'I-discard at Umalis',
        leaveDialogCancelButton: 'Manatili',
    },
    en: {
        back: 'Back to Review',
        for: 'For',
        unnamedStudent: 'Student',
        loading: 'Loading...',
        scoringTitle: 'Scoring In Progress',
        scoringDesc: 'This reading is still being scored. This should only take a few seconds.',
        failedTitle: 'Scoring Failed',
        failedDesc: "There was a problem scoring this reading. There's no retry option here yet.",
        notFoundTitle: 'Not Found',
        notFoundDesc: "This reading isn't available anymore.",
        confirmedToast: 'Results confirmed.',
        draftSavedToast: 'Draft saved.',
        discardedToast: 'This reading was discarded.',
        discardFailedToast: "Couldn't discard this reading. Please try again.",
        leaveDialogTitle: 'Leave this review?',
        leaveDialogText: 'You have unsaved changes. Save them as a draft before leaving, or discard them?',
        leaveDialogSaveButton: 'Save & Leave',
        leaveDialogDiscardButton: 'Discard & Leave',
        leaveDialogCancelButton: 'Stay',
    },
}
export const TeacherReviewAttempt: React.FC = () => {
    const { attemptId } = useParams<{ attemptId: string }>()
    const navigate = useNavigate()
    const { lang } = useLang()
    const { theme } = useTheme()
    const { profile } = useProfile()
    const t = STRINGS[lang]
    const { data: attempt, isLoading: attemptLoading, error: attemptError } = useAttemptQuery(attemptId)
    const { data: words, isLoading: wordsLoading } = useAttemptWordsQuery(attemptId, attempt?.status === 'scored')
    const { data: student } = useStudentProfileQuery(attempt?.student_id)
    const submitReview = useSubmitReviewMutation(profile?.id)
    const saveDraft = useSaveDraftMutation(profile?.id)
    const discardAttempt = useDiscardAttemptMutation(profile?.id)
    const reviewRef = useRef<AttemptWordReviewHandle>(null)
    const showingWordReview = !attemptLoading && !attemptError && !!attempt
        && attempt.status !== 'pending' && attempt.status !== 'processing' && attempt.status !== 'failed'
        && !attempt.reviewed_at && !wordsLoading && !!words
    const handleConfirm = async (overrides: WordReviewOverride[]) => {
        if (!attemptId) return
        try {
            await submitReview.mutateAsync({ attemptId, overrides })
            showToast(t.confirmedToast, 'success', theme === 'dark')
            navigate(`/students/review/${attemptId}/results`)
        } catch (err) {
            console.error('TeacherReviewAttempt: failed to submit review', err)
        }
    }
    // Unlike handleConfirm, this doesn't navigate away — saving a draft
    // is meant to let the teacher keep reviewing (or come back to this
    // exact page later), not to close the attempt out. Also what
    // handleBack calls (via reviewRef) when leaving with "Save & Leave".
    const handleSaveDraft = async (overrides: WordReviewOverride[]) => {
        if (!attemptId) return
        try {
            await saveDraft.mutateAsync({ attemptId, overrides })
            showToast(t.draftSavedToast, 'success', theme === 'dark')
        } catch (err) {
            console.error('TeacherReviewAttempt: failed to save draft', err)
        }
    }
    // Permanently deletes this attempt — see this file's header comment
    // and useDiscardAttemptMutation in hooks.ts. Navigates back to the
    // Pending Review list once done, since the attempt this page was
    // showing no longer exists. On failure (e.g. an RLS policy gap
    // rejecting the delete server-side), shows an error toast and stays
    // put — previously this just logged to the console, leaving the
    // teacher with no visible sign anything went wrong.
    const handleDiscard = async () => {
        if (!attemptId || !attempt) return
        try {
            await discardAttempt.mutateAsync({ attemptId, audioPath: attempt.audio_path })
            showToast(t.discardedToast, 'success', theme === 'dark')
            navigate('/students/review')
        } catch (err) {
            console.error('TeacherReviewAttempt: failed to discard attempt', err)
            showToast(t.discardFailedToast, 'error', theme === 'dark')
        }
    }
    // Only asks (and only bothers saving) while the actual review UI is
    // showing — every other state on this page has nothing to lose.
    const handleBack = async () => {
        if (!showingWordReview) {
            navigate('/students/review')
            return
        }
        const choice = await showSaveOnLeaveConfirmation(
            t.leaveDialogTitle,
            t.leaveDialogText,
            theme === 'dark',
            {
                saveButtonText: t.leaveDialogSaveButton,
                discardButtonText: t.leaveDialogDiscardButton,
                cancelButtonText: t.leaveDialogCancelButton,
            }
        )
        if (choice === 'cancel') return
        if (choice === 'save') {
            try {
                await reviewRef.current?.saveDraftNow()
            } catch (err) {
                console.error('TeacherReviewAttempt: failed to save draft before leaving', err)
            }
        }
        navigate('/students/review')
    }
    const backLink = (
        <button
            onClick={handleBack}
            className="mb-4 flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
        >
            <ArrowLeft size={16} />
            {t.back}
        </button>
    )
    if (attemptLoading) {
        return (
            <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
                {backLink}
                <div className="flex justify-center py-10">
                    <OwlLoader message={t.loading} />
                </div>
            </div>
        )
    }
    if (attemptError || !attempt) {
        return (
            <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
                {backLink}
                <section className="flex flex-col items-center gap-3 rounded-3xl border border-gray-900/5 p-8 text-center shadow-sm dark:border-gray-100/10">
                    <Owl mood="greeting" size={64} />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.notFoundTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">{t.notFoundDesc}</p>
                </section>
            </div>
        )
    }
    const studentName = student?.full_name || student?.username || t.unnamedStudent
    return (
        <div className={showingWordReview ? 'mx-auto w-full max-w-[1350px] px-6 pb-12 pt-2 sm:px-10' : 'mx-auto max-w-3xl px-4 pb-12 pt-2'}>
            {backLink}
            {!showingWordReview && (
                <p className="mb-4 text-sm font-bold text-teal-700 dark:text-teal-300">
                    {t.for} {studentName}
                </p>
            )}
            {attempt.status === 'pending' || attempt.status === 'processing' ? (
                <section className="flex flex-col items-center gap-3 rounded-3xl border border-amber-500/25 bg-amber-500/5 p-8 text-center shadow-sm dark:border-amber-400/25 dark:bg-amber-400/5">
                    <OwlLoader message="…" />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.scoringTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">{t.scoringDesc}</p>
                </section>
            ) : attempt.status === 'failed' ? (
                <section className="flex flex-col items-center gap-3 rounded-3xl border border-gray-900/5 p-8 text-center shadow-sm dark:border-gray-100/10">
                    <Owl mood="greeting" size={64} />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.failedTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">{t.failedDesc}</p>
                    {attempt.error_message && (
                        <p className="max-w-sm text-xs font-semibold text-gray-400 dark:text-gray-500">{attempt.error_message}</p>
                    )}
                </section>
            ) : attempt.reviewed_at ? (
                <Navigate to={`/students/review/${attemptId}/results`} replace />
            ) : wordsLoading || !words ? (
                <div className="flex justify-center py-10">
                    <OwlLoader message={t.loading} />
                </div>
            ) : (
                <AttemptWordReview
                    ref={reviewRef}
                    attempt={attempt}
                    words={words}
                    onConfirm={handleConfirm}
                    confirming={submitReview.isPending}
                    onSaveDraft={handleSaveDraft}
                    savingDraft={saveDraft.isPending}
                    onDiscard={handleDiscard}
                    discarding={discardAttempt.isPending}
                    studentName={studentName}
                    heightBudget={{ base: 232, lg: 200 }}
                />
            )}
        </div>
    )
}
export default TeacherReviewAttempt