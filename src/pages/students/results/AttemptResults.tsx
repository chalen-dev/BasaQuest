// File: AttemptResults.tsx
// File: src/pages/students/results/AttemptResults.tsx
//
// Read-only "here's how it went" page for a CONFIRMED attempt — reached
// after Confirm Results from either review flow (TeacherReviewAttempt.tsx
// for Send-mode, AssessmentSession.tsx for Now-mode), both of which
// navigate here instead of straight back to their own list/picker
// screens. Deliberately a separate route/page rather than swapping the
// editable review UI out in place — keeps "reviewing" and "done
// reviewing" as two distinct URLs instead of one page silently changing
// modes underneath the teacher.
//
// SPLIT INTO features/ (this pass): this file used to hold the entire
// Review-tab grid (draggable divider included) AND the entire
// Insights/Results-tab body inline, plus its own giant STRINGS record —
// it grew too large to work with comfortably. Those now live in:
//   - features/attemptResultsStrings.ts — the STRINGS record
//   - features/attemptResultsHelpers.ts — computeDominantWeakness,
//     buildRemediationWordEntries (pure functions, no JSX)
//   - features/AttemptResultsReviewGrid.tsx — the whole Review-tab grid
//     (bounded-height CSS grid, draggable divider, the "no words yet"
//     fallback layout)
//   - features/AttemptInsights.tsx — the whole Results-tab body (score
//     pills, the Insights block, the Generate Remediation Material /
//     View Remediation List buttons)
// This file is now orchestration only: the four data queries + two
// mutations, the three guard states (loading/error/not-reviewed-yet),
// the tab switch, computing the insight values via
// attemptResultsHelpers.ts, and the two handlers
// (handleEditResults/handleGenerateRemediation) that the two features/
// components call back into. Mirrors the same hooks.ts/features/ split
// review/ already uses.
//
// DEFAULT TAB: starts on 'results', not 'review' — landing here always
// means an attempt was just confirmed, or a teacher is revisiting an
// already-confirmed one, so the scores are what they came to see first.
//
// EDIT RESULTS: handleEditResults below fires a swal confirmation, then
// calls useReopenAttemptMutation to clear reviewed_at/reviewed_by, then
// navigates to /students/review (the Pending Review LIST, not this
// attempt's own edit screen) — see TeacherReviewAttempt.tsx's own
// comment for why that page needs no special-casing for this.
//
// GENERATE REMEDIATION MATERIAL: handleGenerateRemediation below turns
// this page's already-computed flagged-word data into a persisted
// snapshot (remediation_materials — see that migration's own comment)
// via buildRemediationWordEntries(), reusing the exact same
// wordList/manualErrorType AttemptInsights.tsx's cards already show, so
// remediation material can never disagree with the Insights block.
// Multiple generations from the same attempt are allowed on purpose
// (see remediation/hooks.ts's own header comment).
//
// GUARD: if a teacher (or a stale bookmark) lands here for an attempt
// that isn't actually reviewed yet (reviewed_at still null), this
// bounces to the real (editable) review page instead of rendering a
// results view for data that isn't final.
import React, { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLang } from '../../../contexts/LangContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { useProfile } from '../../../hooks/useProfile'
import { showConfirmation, showToast } from '../../../helpers/swalHelpers'
import { Skeleton } from '../../../components/ui/Skeleton'
import { Owl } from '../../../components/ui/Owl'
import {
    useAttemptAudioUrlQuery,
    useAttemptQuery,
    useAttemptWordsQuery,
    useReopenAttemptMutation,
    useStudentProfileQuery,
} from '../review/hooks'
import { STRINGS as REVIEW_STRINGS } from '../review/features/attemptWordReviewStrings'
import { AttemptResultsSubNav, type AttemptResultsTab } from './AttemptResultsSubNav'
import { STRINGS } from './features/attemptResultsStrings'
import { computeDominantWeakness, buildRemediationWordEntries } from './features/attemptResultsHelpers'
import { AttemptResultsReviewGrid } from './features/AttemptResultsReviewGrid'
import { AttemptInsights } from './features/AttemptInsights'
import { useGenerateRemediationMaterialMutation } from '../remediation/hooks'
export const AttemptResults: React.FC = () => {
    const { attemptId } = useParams<{ attemptId: string }>()
    const navigate = useNavigate()
    const { lang } = useLang()
    const { theme } = useTheme()
    const { profile } = useProfile()
    const t = STRINGS[lang]
    const reviewT = REVIEW_STRINGS[lang]
    const { data: attempt, isLoading: attemptLoading, error: attemptError } = useAttemptQuery(attemptId)
    const { data: words, isLoading: wordsLoading } = useAttemptWordsQuery(attemptId, attempt?.status === 'scored')
    const { data: student } = useStudentProfileQuery(attempt?.student_id)
    const audioUrlQuery = useAttemptAudioUrlQuery(attempt?.audio_path)
    const reopenAttempt = useReopenAttemptMutation(profile?.id)
    const generateMaterial = useGenerateRemediationMaterialMutation(profile?.id)
    // Starts on 'results' — see this file's header comment.
    const [tab, setTab] = useState<AttemptResultsTab>('results')
    // Same tap-to-stack behavior as AttemptWordReview.tsx's own
    // selectedWordIds/handleWordClick — most-recently-tapped first,
    // re-tapping an already-stacked word REMOVES it (toggle). Purely
    // local UI state: nothing here is saved, since this page has
    // nothing left to save.
    const [selectedWordIds, setSelectedWordIds] = useState<string[]>([])
    const handleWordClick = (wordId: string) => {
        const alreadySelected = selectedWordIds.includes(wordId)
        setSelectedWordIds((prev) => (alreadySelected ? prev.filter((id) => id !== wordId) : [wordId, ...prev]))
        if (!alreadySelected) {
            document.getElementById('selected-words-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }
    const clearSelectedWords = () => setSelectedWordIds([])
    // Confirm → clear reviewed_at/reviewed_by (useReopenAttemptMutation)
    // → land on the Pending Review LIST, not this attempt's own edit
    // screen. See this file's header comment for the full reasoning.
    const handleEditResults = async () => {
        if (!attemptId) return
        const confirmed = await showConfirmation(
            t.editConfirmTitle,
            t.editConfirmText,
            theme === 'dark',
            'question',
            t.editConfirmButton
        )
        if (!confirmed) return
        try {
            await reopenAttempt.mutateAsync(attemptId)
            navigate('/students/review')
        } catch (err) {
            console.error('AttemptResults: failed to reopen attempt for editing', err)
        }
    }
    if (attemptLoading || (attempt?.status === 'scored' && wordsLoading)) {
        return (
            <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
                <AttemptResultsSubNav />
                <div role="status" aria-busy="true" className="flex flex-col gap-4 py-2">
                    <span className="sr-only">{t.loading}</span>
                    <div className="rounded-3xl border border-gray-900/5 p-6 shadow-sm dark:border-gray-100/10 sm:p-8">
                        <Skeleton className="h-3 w-20 rounded-full" />
                        <Skeleton className="mt-3 h-6 w-1/2 rounded-lg" />
                        <div className="mt-5 flex flex-wrap gap-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-9 w-20 rounded-full" />
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
            </div>
        )
    }
    if (attemptError || !attempt) {
        return (
            <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
                <AttemptResultsSubNav />
                <section className="flex flex-col items-center gap-3 rounded-3xl border border-gray-900/5 p-8 text-center shadow-sm dark:border-gray-100/10">
                    <Owl mood="neutral" size={64} />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.notFoundTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">{t.notFoundDesc}</p>
                </section>
            </div>
        )
    }
    // Not actually confirmed yet — bounce to the real (editable) review
    // page instead of rendering a results view for data that isn't
    // final.
    if (!attempt.reviewed_at) {
        return <Navigate to={`/students/review/${attemptId}`} replace />
    }
    const studentName = student?.full_name || student?.username || t.unnamedStudent
    const wordList = words ?? []
    const verdicts = Object.fromEntries(wordList.map((w) => [w.id, w.teacher_verdict ?? w.system_verdict]))
    const manualFlags = Object.fromEntries(wordList.filter((w) => w.teacher_manual_flag).map((w) => [w.id, true]))
    const manualErrorType = Object.fromEntries(
        wordList
            .filter((w) => w.teacher_error_type_override != null)
            .map((w) => [w.id, w.teacher_error_type_override as (typeof w)['error_type']])
    )
    const dominantWeakness = computeDominantWeakness(wordList, manualErrorType)
    const correctCount = wordList.filter((w) => verdicts[w.id] === 'correct').length
    const wcpm = attempt.duration_seconds && attempt.duration_seconds > 0
        ? Math.round(correctCount / (attempt.duration_seconds / 60))
        : null
    const systemFlaggedWords = wordList.filter((w) => w.confidence === 'low')
    const agreementCount = systemFlaggedWords.filter((w) => w.teacher_verdict === w.system_verdict).length
    const summarySentences: string[] = []
    if (dominantWeakness) {
        summarySentences.push(t.summaryWeakness(studentName, dominantWeakness.type, dominantWeakness.count, dominantWeakness.total))
    } else {
        summarySentences.push(t.summaryNoErrors(studentName))
    }
    if (wcpm != null) {
        summarySentences.push(t.summaryWcpm(studentName, wcpm))
    }
    if (systemFlaggedWords.length > 0) {
        summarySentences.push(t.summaryAgreement(agreementCount, systemFlaggedWords.length))
    }
    const insightSummary = summarySentences.join(' ')
    // Generate Remediation Material — see this file's header comment.
    const handleGenerateRemediation = async () => {
        if (!attemptId || !attempt) return
        const { entries, total } = buildRemediationWordEntries(wordList, manualErrorType)
        if (entries.length === 0) return
        try {
            await generateMaterial.mutateAsync({
                attemptId,
                studentId: attempt.student_id,
                language: attempt.language,
                passageTitle: attempt.passage_title,
                dominantErrorType: dominantWeakness?.type ?? null,
                wordCount: total,
                words: entries,
            })
            showToast(t.generateSuccessToast, 'success', theme === 'dark')
        } catch (err) {
            console.error('AttemptResults: failed to generate remediation material', err)
            showToast(t.generateErrorToast, 'error', theme === 'dark')
        }
    }
    const hasWords = wordList.length > 0
    return (
        <div className={hasWords ? 'mx-auto w-full max-w-[1350px] px-6 pb-12 pt-2 sm:px-10' : 'mx-auto max-w-3xl px-4 pb-12 pt-2'}>
            <AttemptResultsSubNav tab={tab} onTabChange={setTab} />
            {tab === 'review' ? (
                <AttemptResultsReviewGrid
                    attempt={attempt}
                    studentName={studentName}
                    wordList={wordList}
                    verdicts={verdicts}
                    manualFlags={manualFlags}
                    manualErrorType={manualErrorType}
                    selectedWordIds={selectedWordIds}
                    onWordClick={handleWordClick}
                    onClearSelectedWords={clearSelectedWords}
                    audioUrl={audioUrlQuery.data ?? null}
                    reviewT={reviewT}
                    editButtonLabel={t.editButton}
                    onEditResults={handleEditResults}
                    isReopening={reopenAttempt.isPending}
                />
            ) : (
                <AttemptInsights
                    attempt={attempt}
                    reviewT={reviewT}
                    t={t}
                    dominantWeakness={dominantWeakness}
                    wcpm={wcpm}
                    agreementCount={agreementCount}
                    systemFlaggedWordsCount={systemFlaggedWords.length}
                    insightSummary={insightSummary}
                    onGenerateRemediation={handleGenerateRemediation}
                    isGenerating={generateMaterial.isPending}
                    onViewRemediation={() => navigate(`/students/remediation/${attempt.student_id}`)}
                />
            )}
        </div>
    )
}
export default AttemptResults