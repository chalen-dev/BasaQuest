// File: AttemptResults.tsx
// File: src/pages/students/results/AttemptResults.tsx
//
// Read-only "here's how it went" page for a CONFIRMED attempt — reached
// after Confirm Results from either review flow (TeacherReviewAttempt.tsx
// for Send-mode, AssessmentSession.tsx for Now-mode), both of which now
// navigate here instead of straight back to their own list/picker
// screens. Deliberately a separate route/page rather than swapping the
// editable review UI out in place, per explicit product decision — keeps
// "reviewing" and "done reviewing" as two distinct URLs instead of one
// page silently changing modes underneath the teacher.
//
// Lives in its own results/ folder (sibling to dashboard/, list/,
// remediation/, review/) rather than nested inside review/ — but still
// pulls hooks.ts and the ResultsSummaryCard/PassageCard/WordListCard/
// attemptWordReviewStrings UI pieces from review/, since that's the
// single shared data/UI layer for both the editable review flow and
// this read-only results flow.
//
// Reuses ResultsSummaryCard/PassageCard/WordListCard rather than
// building a parallel results layout. ResultsSummaryCard (recording,
// scores, flagged-count badge) sits full-width above the passage/word-
// list pair, mirroring how AttemptWordReview.tsx now separates that
// summary info from the passage panel per explicit ask — same three
// panels, just without the buttons/word-select-stack this page doesn't
// need. Unlike AttemptWordReview.tsx, there's no local edit state here
// at all — the verdict/flag/error-type maps below are built directly
// from each word's already-PERSISTED teacher_verdict/teacher_manual_
// flag/teacher_error_type_override, since nothing on this page can
// change them.
//
// GUARD: if a teacher (or a stale bookmark) lands here for an attempt
// that ISN'T actually reviewed yet (reviewed_at still null — e.g.
// Confirm failed partway, or someone navigated here by hand), this
// bounces to the real (editable) review page instead of rendering a
// results view for data that isn't final.
//
// Back goes to /students/results (the confirmed-results list) — that's
// this page's natural home regardless of whether you arrived here fresh
// off a Confirm Results action or by browsing an old result from
// ResultsList.tsx. Deliberately NOT /students/review (the pending
// inbox) — an attempt that's already confirmed has nothing to do with
// the pending queue anymore.
//
// NOTE: ResultsSummaryCard's own header still reads "Review" / "Review
// Each Word" (attemptWordReviewStrings.ts's kicker/title) since it
// hasn't been given separate results-mode copy yet — a known
// simplification, not an oversight.
import React from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { OwlLoader } from '../../../components/ui/OwlLoader'
import { Owl } from '../../../components/ui/Owl'
import type { Lang } from '../../../components/buttons/LangToggle'
import {
    useAttemptAudioUrlQuery,
    useAttemptQuery,
    useAttemptWordsQuery,
    useStudentProfileQuery,
} from '../review/hooks'
import { STRINGS as REVIEW_STRINGS } from '../review/features/attemptWordReviewStrings'
import { ResultsSummaryCard } from '../review/features/ResultsSummaryCard'
import { PassageCard } from '../review/features/PassageCard'
import { WordListCard } from '../review/features/WordListCard'
const STRINGS: Record<Lang, {
    back: string
    loading: string
    notFoundTitle: string
    notFoundDesc: string
    unnamedStudent: string
}> = {
    fil: {
        back: 'Bumalik sa Resulta',
        loading: 'Kinukuha ang resulta...',
        notFoundTitle: 'Hindi Nahanap',
        notFoundDesc: 'Hindi na available ang pagbasang ito.',
        unnamedStudent: 'Estudyante',
    },
    en: {
        back: 'Back to Results',
        loading: 'Loading results...',
        notFoundTitle: 'Not Found',
        notFoundDesc: "This reading isn't available anymore.",
        unnamedStudent: 'Student',
    },
}
export const AttemptResults: React.FC = () => {
    const { attemptId } = useParams<{ attemptId: string }>()
    const navigate = useNavigate()
    const { lang } = useLang()
    const t = STRINGS[lang]
    const reviewT = REVIEW_STRINGS[lang]
    const { data: attempt, isLoading: attemptLoading, error: attemptError } = useAttemptQuery(attemptId)
    const { data: words, isLoading: wordsLoading } = useAttemptWordsQuery(attemptId, attempt?.status === 'scored')
    const { data: student } = useStudentProfileQuery(attempt?.student_id)
    const audioUrlQuery = useAttemptAudioUrlQuery(attempt?.audio_path)
    const backLink = (
        <button
            onClick={() => navigate('/students/results')}
            className="mb-4 flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
        >
            <ArrowLeft size={16} />
            {t.back}
        </button>
    )
    if (attemptLoading || (attempt?.status === 'scored' && wordsLoading)) {
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
    // Not actually confirmed yet — bounce to the real (editable) review
    // page instead of rendering a results view for data that isn't
    // final. Covers a stale bookmark, a direct URL visit, or Confirm
    // having failed partway through.
    if (!attempt.reviewed_at) {
        return <Navigate to={`/students/review/${attemptId}`} replace />
    }
    const studentName = student?.full_name || student?.username || t.unnamedStudent
    const wordList = words ?? []
    // Built straight from each word's PERSISTED values — there's no
    // local edit state on this page, everything here is final.
    const verdicts = Object.fromEntries(wordList.map((w) => [w.id, w.teacher_verdict ?? w.system_verdict]))
    const manualFlags = Object.fromEntries(wordList.filter((w) => w.teacher_manual_flag).map((w) => [w.id, true]))
    const manualErrorType = Object.fromEntries(
        wordList
            .filter((w) => w.teacher_error_type_override != null)
            .map((w) => [w.id, w.teacher_error_type_override as (typeof w)['error_type']])
    )
    return (
        <div className={wordList.length > 0 ? 'mx-auto w-full max-w-[1350px] px-6 pb-12 pt-2 sm:px-10' : 'mx-auto max-w-3xl px-4 pb-12 pt-2'}>
            {backLink}
            <div className="mb-6">
                <ResultsSummaryCard
                    attempt={attempt}
                    studentName={studentName}
                    words={wordList}
                    manualFlags={manualFlags}
                    t={reviewT}
                    audioUrl={audioUrlQuery.data ?? null}
                />
            </div>
            <div className={wordList.length > 0 ? 'grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start' : ''}>
                <PassageCard
                    words={wordList}
                    verdicts={verdicts}
                    manualFlags={manualFlags}
                    manualErrorType={manualErrorType}
                    t={reviewT}
                    onWordClick={(wordId) => {
                        document.getElementById(`word-row-${wordId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                />
                {wordList.length > 0 && (
                    <WordListCard
                        words={wordList}
                        verdicts={verdicts}
                        manualFlags={manualFlags}
                        manualErrorType={manualErrorType}
                        selectedIds={{}}
                        selectMode={false}
                        highlightedId={null}
                        t={reviewT}
                        readOnly
                    />
                )}
            </div>
        </div>
    )
}
export default AttemptResults