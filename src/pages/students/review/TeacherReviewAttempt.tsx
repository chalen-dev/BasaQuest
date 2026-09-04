// File: TeacherReviewAttempt.tsx
// File: TeacherReviewAttempt.tsx
// File: src/pages/students/review/TeacherReviewAttempt.tsx
//
// NAVIGATION GUARD (this pass): hasUnsavedChanges now comes straight
// from AttemptWordReview.tsx (via its onUnsavedChangesChange callback)
// instead of only existing as a ref inside that component, and is fed
// into useUnsavedChangesBlocker (src/hooks/useUnsavedChangesBlocker.ts).
// That hook intercepts ANY navigation attempt while there's something
// unsaved — clicking a link in the full ProtectedHeader nav (Home,
// Students, etc.), the browser's back/forward buttons, closing the tab
// — and shows the exact same save/discard/cancel dialog the old
// handleBack used to show ONLY for its own Back button. handleBack
// itself is now just a plain navigate() — the blocker is what decides
// whether a dialog is needed, so a Back click with zero actual edits no
// longer pops up a needless "save first?" prompt the way it used to.
import React, { useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { useProfile } from '../../../hooks/useProfile'
import { useUnsavedChangesBlocker } from '../../../hooks/useUnsavedChangesBlocker.ts'
import { OwlLoader } from '../../../components/ui/OwlLoader'
import { Skeleton } from '../../../components/ui/Skeleton'
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
const reviewLoadingSkeleton = (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 py-2">
        <span className="sr-only">Loading…</span>
        <div className="rounded-3xl border border-gray-900/5 p-6 shadow-sm dark:border-gray-100/10 sm:p-8">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="mt-3 h-6 w-1/2 rounded-lg" />
            <div className="mt-5 flex flex-wrap gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-24 rounded-full" />
                ))}
            </div>
        </div>
        <div className="rounded-3xl border border-gray-900/5 p-6 shadow-sm dark:border-gray-100/10 sm:p-8">
            <Skeleton className="h-3 w-24 rounded-full" />
            <div className="mt-4 flex flex-col gap-2.5">
                <Skeleton className="h-3.5 w-full rounded-full" />
                <Skeleton className="h-3.5 w-full rounded-full" />
                <Skeleton className="h-3.5 w-11/12 rounded-full" />
                <Skeleton className="h-3.5 w-4/5 rounded-full" />
            </div>
        </div>
    </div>
)
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
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    // Intercepts any navigation attempt (header nav links, browser
    // back/forward, closing the tab) while hasUnsavedChanges is true —
    // see this file's header comment and
    // src/hooks/useUnsavedChangesBlocker.ts.
    useUnsavedChangesBlocker({
        hasUnsavedChanges,
        onSaveDraft: async () => {
            await reviewRef.current?.saveDraftNow()
        },
        confirmLeave: () =>
            showSaveOnLeaveConfirmation(
                t.leaveDialogTitle,
                t.leaveDialogText,
                theme === 'dark',
                {
                    saveButtonText: t.leaveDialogSaveButton,
                    discardButtonText: t.leaveDialogDiscardButton,
                    cancelButtonText: t.leaveDialogCancelButton,
                }
            ),
    })
    const showingWordReview = !attemptLoading && !attemptError && !!attempt
        && attempt.status !== 'pending' && attempt.status !== 'processing' && attempt.status !== 'failed'
        && !attempt.reviewed_at && !wordsLoading && !!words
    const handleConfirm = async (overrides: WordReviewOverride[]) => {
        if (!attemptId || !attempt) return
        try {
            await submitReview.mutateAsync({ attemptId, overrides, audioPath: attempt.audio_path })
            showToast(t.confirmedToast, 'success', theme === 'dark')
            navigate(`/students/review/${attemptId}/results`)
        } catch (err) {
            console.error('TeacherReviewAttempt: failed to submit review', err)
        }
    }
    const handleSaveDraft = async (overrides: WordReviewOverride[]) => {
        if (!attemptId) return
        try {
            await saveDraft.mutateAsync({ attemptId, overrides })
            showToast(t.draftSavedToast, 'success', theme === 'dark')
        } catch (err) {
            console.error('TeacherReviewAttempt: failed to save draft', err)
        }
    }
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
    // Just a plain navigate() now — useUnsavedChangesBlocker (registered
    // above) is what decides whether a save/discard/cancel dialog is
    // actually needed, based on the real hasUnsavedChanges state rather
    // than firing unconditionally just because the word-review UI
    // happens to be showing.
    const handleBack = () => {
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
                {reviewLoadingSkeleton}
            </div>
        )
    }
    if (attemptError || !attempt) {
        return (
            <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
                {backLink}
                <section className="flex flex-col items-center gap-3 rounded-3xl border border-gray-900/5 p-8 text-center shadow-sm dark:border-gray-100/10">
                    <Owl mood="neutral" size={64} />
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
                    <Owl mood="neutral" size={64} />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.failedTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">{t.failedDesc}</p>
                    {attempt.error_message && (
                        <p className="max-w-sm text-xs font-semibold text-gray-400 dark:text-gray-500">{attempt.error_message}</p>
                    )}
                </section>
            ) : attempt.reviewed_at ? (
                <Navigate to={`/students/review/${attemptId}/results`} replace />
            ) : wordsLoading || !words ? (
                reviewLoadingSkeleton
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
                    onUnsavedChangesChange={setHasUnsavedChanges}
                />
            )}
        </div>
    )
}
export default TeacherReviewAttempt