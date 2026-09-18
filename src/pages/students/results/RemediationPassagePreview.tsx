// File: src/pages/students/results/RemediationPassagePreview.tsx
//
// The new step between "Generate Remediation Material" (AttemptResults.tsx)
// and an actual saved remediation_materials row — reached by navigating
// here with just an attemptId (route: /students/review/:attemptId/
// remediation-preview), same "refetch by ID, nothing passed through
// router state" convention every other page in this app already follows
// (see AttemptResults.tsx's own three source queries, duplicated here
// for the same reason rather than passed in).
//
// WHY THIS SCREEN EXISTS: Reading Coach Mode moved from one isolated
// Gemini sentence per weak word to a SET of natural multi-word passages
// (see remediation/hooks.ts's RemediationPassage comment and
// coach/RemediationCoach.tsx's own header comment, "PAGES"). Unlike the
// old flow (attachSentences() in AttemptResults.tsx, generate-then-save
// in one uninterruptible step), passage generation is something a
// teacher should be able to look at and adjust before it's committed —
// a passage might group words oddly, or read awkwardly — so this screen
// generates, shows the result with target words already highlighted
// exactly as Coach Mode will render them, and only inserts the
// remediation_materials row once the teacher confirms.
//
// GENERATION: auto-starts once on mount (via hasStartedGeneration,
// below) once the attempt/word data has loaded — the teacher already
// explicitly clicked "Generate Remediation Material" to get here, so
// requiring a second click here would be redundant. "Start Over" reruns
// the exact same call from scratch, discarding whatever's currently
// shown. Regenerating a SINGLE passage (handleRegenerateOne) reuses the
// same generatePassages() call scoped to just that passage's own
// targetWords, so the replacement still covers the same weak words the
// original did, and replaces it in place rather than appending/
// reordering.
//
// THE >60-WORD CAP: generate-remediation-passages' own
// MAX_WORDS_PER_REQUEST safety-net expects the caller to already have
// trimmed the list — cappedEntries below takes the first
// MAX_WORDS_PER_REQUEST of buildRemediationWordEntries()'s own count-
// sorted output (already sorted most-repeated-problem-word first), so a
// long weak-word list keeps its worst offenders. The remainder
// (excludedEntries) never gets sent to Gemini at all, surfaced as a
// notice — same as every coverage-gap word, still fully available via
// the flashcard Practice session (RemediationSession.tsx), which has no
// such cap.
//
// COVERAGE GAP: computeCoverageGap() recomputes, after every
// generation/discard/regenerate, which weak words aren't a target of
// any currently-kept passage — shown as a persistent, non-blocking
// notice (never prevents Save), matching this whole feature's "never
// let a secondary detail block the main flow" spirit.
//
// SAVE: a single button, always available once the base attempt data
// has loaded — NOT gated behind successful generation. It saves with
// whatever `passages` currently holds, including null/empty (the
// generation-error state's own messaging just points at this same
// button rather than offering a separate escape-hatch button). `words`
// on the saved row is always the FULL uncapped entries list — the
// flashcard Practice session must keep seeing every flagged word
// regardless of what passage generation could fit.
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { useProfile } from '../../../hooks/useProfile'
import { showToast } from '../../../helpers/swalHelpers'
import { Skeleton } from '../../../components/ui/Skeleton'
import { Owl } from '../../../components/ui/Owl'
import { useAttemptQuery, useAttemptWordsQuery, useStudentProfileQuery } from '../review/hooks'
import { computeDominantWeakness, buildRemediationWordEntries } from './features/attemptResultsHelpers'
import {
    useDeleteRemediationDraftMutation,
    useGenerateRemediationMaterialMutation,
    useRemediationMaterialDraftQuery,
    useSaveRemediationDraftMutation,
    type RemediationPassage,
} from '../remediation/hooks'
import { STRINGS } from './features/remediationPassagePreviewStrings'
import {
    MAX_WORDS_PER_REQUEST,
    computeCoverageGap,
    generatePassages,
    parseGradeLevel,
    regeneratePassage,
} from './features/remediationPassagePreviewHelpers'

// One passage's text, target words bold + the same pink Coach Mode uses
// for --coach-target (coachStoryLayout.ts / CoachTableBackdrop.tsx) —
// literal hex here rather than var(--coach-target) since that custom
// property is only ever defined inside .coach-artwork's own scope
// (the SVG storybook scene), which this plain review card isn't part
// of; Tailwind's dark: variant gives the same day/night split directly.
function PassageText({ passage }: { passage: RemediationPassage }) {
    const targetSet = new Set(passage.targetIndices)
    return (
        <p className="text-base font-medium leading-relaxed text-gray-800 dark:text-gray-100">
            {passage.passageWords.map((word, i) => (
                <span key={i} className={targetSet.has(i) ? 'font-extrabold text-[#be185d] dark:text-[#f472b6]' : undefined}>
                    {word}{' '}
                </span>
            ))}
        </p>
    )
}

export default function RemediationPassagePreview() {
    const { attemptId } = useParams<{ attemptId: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    // Where "back" goes depends on how the teacher got here -- the
    // Resume Review button on StudentRemediationDetail.tsx passes this
    // flag via router state (same fromAuthSwitch-style precedent as
    // Login.tsx/Register.tsx), so this screen can tell "reached from an
    // unfinished-review resume" apart from its other entry point
    // (AttemptResults.tsx's own "Generate Remediation Material" button)
    // without needing to guess from attempt/draft state, which can't
    // distinguish the two (a resumed draft and a freshly-generated one
    // look identical once loaded). Router state doesn't survive a hard
    // refresh, so a refreshed tab just falls back to the results
    // destination -- an acceptable, already-precedented tradeoff (see
    // GuestLayout.tsx's own fromAuthSwitch comment).
    const cameFromRemediation = (location.state as { from?: string } | null)?.from === 'remediation'
    const { lang } = useLang()
    const { theme } = useTheme()
    const { profile } = useProfile()
    const t = STRINGS[lang]

    const { data: attempt, isLoading: attemptLoading } = useAttemptQuery(attemptId)
    const { data: words, isLoading: wordsLoading } = useAttemptWordsQuery(attemptId, attempt?.status === 'scored')
    const { data: student } = useStudentProfileQuery(attempt?.student_id)
    const generateMaterial = useGenerateRemediationMaterialMutation(profile?.id)
    // AUTO-SAVED DRAFT: see remediation/hooks.ts's RemediationMaterialDraft
    // comment and the 20260918000000 migration. draftQuery is checked
    // BEFORE the auto-start effect below decides whether to call Gemini
    // at all; saveDraft is fired (in the background, not awaited) every
    // time `passages` changes to a new value; deleteDraft cleans up once
    // handleSave actually confirms the material.
    const draftQuery = useRemediationMaterialDraftQuery(attemptId)
    const saveDraft = useSaveRemediationDraftMutation(profile?.id)
    const deleteDraft = useDeleteRemediationDraftMutation()

    // Passage generation is this screen's own transient state -- never
    // persisted until handleSave. null = no successful generation yet
    // (either still loading, or the last attempt failed); an empty
    // array is a real state too (every passage discarded).
    const [passages, setPassages] = useState<RemediationPassage[] | null>(null)
    const [genStatus, setGenStatus] = useState<'idle' | 'loading' | 'error'>('idle')
    // Guards the auto-start effect below so it only ever fires once,
    // regardless of how many times attempt/words re-render.
    const [hasStartedGeneration, setHasStartedGeneration] = useState(false)
    // Which single passage (by index) is mid-regenerate, if any -- for
    // that one row's own spinner/disabled state, independent of the
    // page-wide genStatus (which is only for the initial/Start-Over call).
    const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)
    // Separate from both genStatus (the initial/Start-Over call) and
    // regeneratingIndex (an existing card's own spinner) -- this is a
    // THIRD, independent Gemini call: generating brand-new passages for
    // whatever's currently in coverageGap (see handleGenerateMore below),
    // appended onto the existing set rather than replacing anything.
    const [isGeneratingMore, setIsGeneratingMore] = useState(false)
    // Set right before restoring `passages` from an existing draft, so
    // the auto-save effect below skips writing that exact same data
    // straight back -- otherwise every restore would fire a pointless
    // (harmless, but wasteful) upsert of data that's already there.
    const skipNextDraftSaveRef = useRef(false)

    const wordList = words ?? []
    const manualErrorType = Object.fromEntries(
        wordList
            .filter((w) => w.teacher_error_type_override != null)
            .map((w) => [w.id, w.teacher_error_type_override as (typeof w)['error_type']])
    )
    const dominantWeakness = computeDominantWeakness(wordList, manualErrorType)
    const { entries: allEntries, total } = buildRemediationWordEntries(wordList, manualErrorType)
    const cappedEntries = allEntries.slice(0, MAX_WORDS_PER_REQUEST)
    const excludedEntries = allEntries.slice(MAX_WORDS_PER_REQUEST)

    const runGeneration = async () => {
        if (!attempt) return
        setGenStatus('loading')
        const result = await generatePassages(
            cappedEntries.map((e) => e.word),
            attempt.language,
            parseGradeLevel(attempt.grade_level)
        )
        if (result) {
            setPassages(result)
            setGenStatus('idle')
        } else {
            setGenStatus('error')
        }
    }

    // Waits on draftQuery (`!draftQuery.isLoading`) before deciding
    // anything, so this never races ahead and calls Gemini before the
    // draft check has actually come back. A found draft is restored
    // in-place, with no Gemini call at all; its absence (draftQuery.data
    // === null, a completely normal "first time reviewing this attempt"
    // result) falls through to runGeneration() exactly as before this
    // feature existed.
    useEffect(() => {
        if (!attempt || cappedEntries.length === 0 || hasStartedGeneration || draftQuery.isLoading) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHasStartedGeneration(true)
        if (draftQuery.data) {
            skipNextDraftSaveRef.current = true
            setPassages(draftQuery.data.passages)
            setGenStatus('idle')
            showToast(t.draftRestoredToast, 'info', theme === 'dark')
            return
        }
        void runGeneration()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt, cappedEntries.length, hasStartedGeneration, draftQuery.isLoading, draftQuery.data])

    // Keeps the draft mirroring whatever's currently on screen -- fires
    // on every generation success, discard, per-passage regenerate, and
    // Start Over (all of them replace `passages` with a new array/null),
    // so leaving and coming back always restores the latest state, not
    // just whatever the very first generation produced. Skips the
    // initial restore-from-draft itself (see skipNextDraftSaveRef) and
    // any state where there's nothing successful to cache yet.
    useEffect(() => {
        if (!attempt || !attemptId) return
        if (skipNextDraftSaveRef.current) {
            skipNextDraftSaveRef.current = false
            return
        }
        if (passages == null) return
        saveDraft.mutate({
            attemptId,
            studentId: attempt.student_id,
            language: attempt.language,
            passageTitle: attempt.passage_title,
            dominantErrorType: dominantWeakness?.type ?? null,
            wordCount: total,
            words: allEntries,
            passages,
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [passages])

    const handleDiscard = (index: number) => {
        setPassages((prev) => (prev ? prev.filter((_, i) => i !== index) : prev))
    }

    const handleRegenerateOne = async (index: number) => {
        if (!passages || !attempt) return
        setRegeneratingIndex(index)
        const replacement = await regeneratePassage(passages[index], attempt.language, parseGradeLevel(attempt.grade_level))
        if (replacement) {
            setPassages((prev) => (prev ? prev.map((p, i) => (i === index ? replacement : p)) : prev))
        } else {
            showToast(t.regenerateErrorToast, 'error', theme === 'dark')
        }
        setRegeneratingIndex(null)
    }

    // Generates a fresh batch scoped to whatever's currently uncovered
    // (coverageGap) and APPENDS it to the existing passages rather than
    // replacing them -- the opt-in alternative to just leaving those
    // words to the flashcard Practice session, without needing a second
    // "page" of its own (see this file's own coverageGap comment above).
    // Capped at MAX_WORDS_PER_REQUEST same as the initial batch, since
    // the edge function itself rejects anything longer; a coverage gap
    // bigger than that just means this button stays available for
    // another click afterward, covering the next chunk.
    const handleGenerateMore = async () => {
        if (!attempt || coverageGap.length === 0) return
        setIsGeneratingMore(true)
        const result = await generatePassages(
            coverageGap.slice(0, MAX_WORDS_PER_REQUEST).map((e) => e.word),
            attempt.language,
            parseGradeLevel(attempt.grade_level)
        )
        if (result) {
            setPassages((prev) => [...(prev ?? []), ...result])
        } else {
            showToast(t.generateMoreErrorToast, 'error', theme === 'dark')
        }
        setIsGeneratingMore(false)
    }

    const handleSave = async () => {
        if (!attemptId || !attempt) return
        try {
            await generateMaterial.mutateAsync({
                attemptId,
                studentId: attempt.student_id,
                language: attempt.language,
                passageTitle: attempt.passage_title,
                dominantErrorType: dominantWeakness?.type ?? null,
                wordCount: total,
                words: allEntries,
                passages: passages ?? undefined,
            })
            // Fire-and-forget: the draft's job is done now that a real,
            // confirmed row exists, but there's nothing left on this
            // screen worth waiting on it for -- see
            // useDeleteRemediationDraftMutation's own comment.
            deleteDraft.mutate({ attemptId, studentId: attempt.student_id })
            showToast(t.saveSuccessToast, 'success', theme === 'dark')
            navigate(`/students/remediation/${attempt.student_id}`)
        } catch (err) {
            console.error('RemediationPassagePreview: failed to save remediation material', err)
            showToast(t.saveErrorToast, 'error', theme === 'dark')
        }
    }

    const goBack = () => {
        if (cameFromRemediation) {
            navigate(attempt ? `/students/remediation/${attempt.student_id}` : '/students/remediation')
            return
        }
        navigate(`/students/review/${attemptId}/results`)
    }

    if (attemptLoading || (attempt?.status === 'scored' && wordsLoading)) {
        return (
            <div className="mx-auto w-full max-w-[1350px] px-4 pb-12 pt-2 sm:px-8">
                <div
                    role="status"
                    aria-busy="true"
                    className="flex flex-col gap-4 rounded-3xl border-2 border-gray-900/5 bg-white p-6 py-2 dark:border-gray-100/10 dark:bg-gray-900"
                >
                    <span className="sr-only">{t.loading}</span>
                    <Skeleton className="h-3 w-32 rounded-full" />
                    <Skeleton className="h-40 w-full rounded-3xl" />
                    <Skeleton className="h-40 w-full rounded-3xl" />
                </div>
            </div>
        )
    }
    if (!attempt) {
        return (
            <div className="mx-auto w-full max-w-[1350px] px-4 pb-12 pt-2 sm:px-8">
                <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-gray-900/5 bg-white p-8 text-center shadow-sm dark:border-gray-100/10 dark:bg-gray-900">
                    <Owl mood="neutral" size={64} />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.notFoundTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">{t.notFoundDesc}</p>
                </section>
            </div>
        )
    }

    // ONE notice for every "not in a passage" word, not two -- before the
    // first generation completes (passages is still null) this is just
    // the cap overflow (excludedEntries); once passages exist,
    // computeCoverageGap's own result already IS a superset of that same
    // overflow (see its comment), so switching to it here rather than
    // showing both is strictly more complete information, not less.
    const coverageGap = passages ? computeCoverageGap(allEntries, passages) : excludedEntries
    const studentName = student?.full_name || student?.username || ''

    return (
        <div className="mx-auto w-full max-w-[1350px] px-4 pb-14 pt-2 sm:px-8">
            {/* Same pill treatment as AttemptResultsSubNav.tsx's own back
            button -- this used to be a bare underlined-on-hover text
            link, which read as a different, lesser control next to that
            page's solid bordered pill even though both do the same job
            (leave this attempt's flow). */}
            <nav className="mb-6">
                <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
                >
                    <ArrowLeft size={16} />
                    {cameFromRemediation ? t.backToRemediationButton : t.backButton}
                </button>
            </nav>

            {/* Same gradient header-card treatment as ResultsList.tsx /
            AssessmentSession.tsx's own intro card -- a title/subtitle
            floating directly on the hillside backdrop with no card
            behind it (the previous version here) reads inconsistently
            against that busy sky/cloud scene; every other page in this
            app backs its header in one of these instead. */}
            <section className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
                <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
                <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
                <div
                    className="pointer-events-none absolute inset-0 dark:hidden"
                    style={{ background: 'radial-gradient(circle at 88% -20%, rgba(255,198,75,0.4), transparent 55%)' }}
                />
                <div
                    className="pointer-events-none absolute inset-0 hidden dark:block"
                    style={{ background: 'radial-gradient(circle at 88% -20%, rgba(45,212,191,0.28), transparent 55%)' }}
                />
                <div className="relative">
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.pageTitle}</h1>
                    <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {studentName ? `${t.pageSubtitle} (${studentName})` : t.pageSubtitle}
                    </p>
                </div>
            </section>

            {/* Everything below the header lives inside ONE body card,
            rather than a scatter of separately-floating pieces -- the
            previous per-block layout (each notice/state/grid sitting
            directly on the hillside backdrop) read as disconnected and
            made the amber notices in particular hard to register as part
            of the same screen. Kept slightly translucent + blurred
            (bg-white/75 + backdrop-blur) rather than fully opaque, so the
            day/night backdrop stays visible through it like the rest of
            the screen, instead of the page suddenly turning into a flat
            white sheet at this one boundary. Nested elements (notices,
            per-state cards, passage cards) are opaque bg-gray-50/dark:
            bg-gray-800 so their own text stays fully readable regardless
            of what's showing through the translucent body behind them. */}
            <div className="mt-6 flex flex-col gap-6 rounded-3xl border-2 border-gray-900/10 bg-white/75 p-6 shadow-sm backdrop-blur-md dark:border-gray-100/10 dark:bg-gray-900/70 sm:p-8">
                {/* Single merged notice -- see the coverageGap comment
                above. Used to be two separate boxes (an "excluded from
                this batch" one up here and a "not covered by what's left"
                one below the passage grid) that said almost the same
                thing in slightly different words at two different
                scroll positions; this is that same information as one
                notice, always in this one spot. */}
                {coverageGap.length > 0 && (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/15 p-4 dark:border-amber-400/25 dark:bg-amber-400/15">
                        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">{t.coverageGapTitle}</p>
                            <p className="mt-0.5 text-sm font-medium text-amber-700 dark:text-amber-300">{t.coverageGapDesc}</p>
                            <p className="mt-1.5 text-sm font-semibold text-amber-800 dark:text-amber-200">
                                {coverageGap.map((e) => e.word).join(', ')}
                            </p>
                            {/* Opt-in, not automatic -- see handleGenerateMore's
                            own comment. Only offered once there's already a
                            batch on screen to append to (passages/genStatus
                            match the same gate the passage grid itself uses)
                            so this can never fire before or during the
                            initial/Start-Over call. */}
                            {passages && genStatus === 'idle' && (
                                <button
                                    type="button"
                                    onClick={() => void handleGenerateMore()}
                                    disabled={isGeneratingMore}
                                    className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1.5 text-xs font-bold text-purple-700 shadow-sm transition-colors duration-150 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-purple-400/30 dark:bg-purple-400/10 dark:text-purple-300 dark:hover:bg-purple-400/20"
                                >
                                    <Sparkles size={13} className={isGeneratingMore ? 'animate-pulse' : ''} />
                                    {isGeneratingMore ? t.generatingMoreLabel : t.generateMoreButton}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {genStatus === 'loading' && (
                    <div
                        role="status"
                        aria-busy="true"
                        className="flex flex-col items-center gap-3 rounded-2xl bg-gray-50 p-10 text-center dark:bg-gray-800"
                    >
                        <Owl mood="neutral" size={56} />
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{t.generatingLabel}</p>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.generatingSubLabel}</p>
                    </div>
                )}

                {genStatus === 'error' && (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/25 bg-red-500/5 p-8 text-center dark:border-red-400/25 dark:bg-red-400/5">
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.generationErrorTitle}</h2>
                        <p className="max-w-md text-sm font-medium text-gray-600 dark:text-gray-400">{t.generationErrorDesc}</p>
                        <button
                            type="button"
                            onClick={() => void runGeneration()}
                            className="mt-1 flex cursor-pointer items-center gap-2 rounded-full bg-purple-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#6d28d9] dark:bg-purple-600 dark:shadow-[0_4px_0_0_#5b21b6]"
                        >
                            <RefreshCw size={16} />
                            {t.retryButton}
                        </button>
                    </div>
                )}

                {passages && genStatus === 'idle' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {t.passageLabel(passages.length, passages.length)}
                            </h2>
                            {/* Deliberately NOT the same plain white pill
                            as the per-card Discard/Regenerate buttons below
                            -- this one throws away every passage on the
                            page at once, not just one, so it gets its own
                            amber "careful" tone (matching this page's own
                            notice color) to read as a bigger, distinct
                            action rather than blending into the same row
                            of look-alike gray buttons. */}
                            <button
                                type="button"
                                onClick={() => void runGeneration()}
                                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-700 shadow-sm transition-colors duration-150 hover:bg-amber-500/20 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20"
                            >
                                <RefreshCw size={13} />
                                {t.startOverButton}
                            </button>
                        </div>

                        {passages.length === 0 && (
                            <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                {t.noPassagesLeft}
                            </p>
                        )}

                        {/* 1 column on small screens, 2 from md, 3 from xl
                        -- fills the wider max-w-[1350px] body once there's
                        room for it instead of leaving it mostly empty on
                        large screens, same as this file's own note above
                        on matching the rest of the app's card conventions. */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {passages.map((passage, index) => {
                                const isRegenerating = regeneratingIndex === index
                                return (
                                    <div
                                        key={index}
                                        className="rounded-2xl border border-gray-900/5 bg-gray-50 p-5 dark:border-gray-100/10 dark:bg-gray-800"
                                    >
                                        <PassageText passage={passage} />
                                        <p className="mt-3 text-sm font-medium italic text-gray-500 dark:text-gray-400">
                                            {passage.coachTip}
                                        </p>
                                        <div className="mt-4 flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleDiscard(index)}
                                                disabled={isRegenerating}
                                                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition-colors duration-150 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10"
                                            >
                                                <Trash2 size={13} />
                                                {t.discardButton}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleRegenerateOne(index)}
                                                disabled={isRegenerating}
                                                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition-colors duration-150 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10"
                                            >
                                                <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />
                                                {isRegenerating ? t.regeneratingLabel : t.regenerateButton}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div className="flex flex-col items-center gap-2 border-t border-dashed border-gray-900/10 pt-6 dark:border-gray-100/10">
                    {genStatus === 'error' && (
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.saveWithoutPassagesNote}</p>
                    )}
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={generateMaterial.isPending}
                        className={`flex items-center justify-center gap-2 rounded-full bg-purple-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#6d28d9] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#6d28d9] dark:bg-purple-600 dark:shadow-[0_4px_0_0_#5b21b6] ${
                            generateMaterial.isPending ? 'cursor-not-allowed opacity-60 hover:translate-y-0' : 'cursor-pointer'
                        }`}
                    >
                        <Sparkles size={16} />
                        {generateMaterial.isPending ? t.savingButton : t.saveButton}
                    </button>
                </div>
            </div>
        </div>
    )
}
