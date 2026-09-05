// File: src/pages/students/remediation/session/RemediationSession.tsx
//
// Teacher-led remediation drill — reached via "Start Remediation" on a
// material card in StudentRemediationDetail.tsx. One word at a time,
// flashcard-style: the teacher reads it out / has the pupil read it,
// and taps "Mark Practiced" before moving to the next one. No
// recording, no scoring — this is a live, in-person drill, not another
// assessment, which is why it needs none of AssessmentSession.tsx's
// recorder/scoring machinery.
//
// PERSISTENCE: every practiced toggle calls
// useUpdateRemediationProgressMutation immediately (see that hook's own
// comment) — there's no draft/save-on-exit step like the review flow
// has, since a toggle here is low-stakes and reversible, so the
// simplest and safest thing is to just always be saved. Local
// `sessionWords` state exists purely so the UI responds instantly
// without waiting on the mutation round-trip; it's seeded once from the
// query the first time material data arrives (see the init effect) and
// never overwritten by a later refetch, since our own mutation is the
// only thing that ever changes this row and local state already
// reflects whatever we just wrote.
//
// FINISH / END EARLY: both routes call persist() once more (redundant
// if a toggle already saved this exact state, but covers opening a
// session and leaving without ever toggling anything — that's still
// worth recording a last_practiced_at for) then either show the
// completion card (Finish, from the last word) or navigate straight
// back (End Session Early, available from any word).
//
// WORD LIST SIDEBAR: lets the teacher jump straight to any word instead
// of only stepping through Prev/Next. Deliberately `position: fixed` to
// the left edge of the viewport rather than living in the normal flex
// flow — that way it stays put on the left at every screen width
// instead of relocating below the flashcard on narrow screens. Wide
// enough (w-80) and wraps rather than truncates so longer words
// (e.g. "magkaibigan") are never cut off. Purely a `setCurrentIndex`
// jump; doesn't touch persistence. Only shown in the main flashcard
// view, not on the loading/not-found/empty/completion states.
//
// FLASHCARD CENTERING: the content area to the right of the fixed
// sidebar (CONTENT_OFFSET_CLASS) is its own full-width region, and the
// flashcard column is centered *within that region* (mx-auto on an
// inner wrapper), not within the whole viewport — otherwise it would
// sit visibly off-center, shifted right by the sidebar's width.
//
// UNIFIED PANEL: the counter/badge row, the flashcard, the nav buttons,
// and End Session Early all live inside one translucent, blurred panel
// rather than floating loose over the page's scenic background — keeps
// everything readable and reading as a single surface regardless of
// what's behind it. The flashcard itself keeps its own solid card
// background nested inside that panel so the word still pops.
//
// PRONUNCIATION: uses server-side Azure neural TTS (usePronounceWord)
// rather than the browser's built-in speech synthesis — the earlier
// browser-TTS approach (useSpeakWord, now deleted) produced incorrect
// pronunciations depending on the teacher's device/browser, which is
// disqualifying for a feature whose whole job is teaching correct
// pronunciation in a reading-proficiency tool. The edge function always
// works (no per-device voice availability to check), so unlike the old
// hook there's no "isSupported" gate — the button always renders, and
// is disabled while either actively playing (isSpeaking) or fetching
// the audio for the first time (isPronunciationLoading).
//
// NAV ROW LAYOUT: Prev / Mark Practiced / Finish-Next sit in a single
// 3-column grid so Mark Practiced lines up at the same vertical
// position as Prev and Next, rather than living inside the flashcard
// card above them.
//
// CURSOR: Tailwind's preflight resets <button> to cursor: default, so
// every clickable button here gets an explicit `cursor-pointer` class —
// otherwise none of them show a pointer cursor on hover despite being
// clickable.
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, PartyPopper, Volume2 } from 'lucide-react'
import { useLang } from '../../../../contexts/LangContext'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { Owl } from '../../../../components/ui/Owl'
import { ERROR_TYPE_COLOR } from '../../review/features/attemptWordReviewHelpers'
import { STRINGS } from './features/remediationSessionStrings'
import { usePronounceWord } from './features/usePronounceWord'
import {
    readPracticed,
    useRemediationMaterialQuery,
    useUpdateRemediationProgressMutation,
    type RemediationWordEntry,
} from '../hooks'

const SIDEBAR_WIDTH_CLASS = 'w-80'
// Keeps the content region clear of the fixed sidebar (its width + left
// offset + a gap) regardless of screen size — deliberately not
// responsive, since the sidebar itself doesn't move either.
const CONTENT_OFFSET_CLASS = 'pl-96'

export const RemediationSession: React.FC = () => {
    const { studentId, materialId } = useParams<{ studentId: string; materialId: string }>()
    const navigate = useNavigate()
    const { lang } = useLang()
    const t = STRINGS[lang]

    const { data: material, isLoading, error } = useRemediationMaterialQuery(materialId)
    const updateProgress = useUpdateRemediationProgressMutation()
    const { speak, isLoading: isPronunciationLoading, isPlaying: isSpeaking } = usePronounceWord()

    const [sessionWords, setSessionWords] = useState<RemediationWordEntry[] | null>(null)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [showCompletion, setShowCompletion] = useState(false)

    useEffect(() => {
        if (material && sessionWords === null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSessionWords(material.words)
        }
    }, [material, sessionWords])

    const goBack = () => navigate(`/students/remediation/${studentId}`)

    const persist = (words: RemediationWordEntry[]) => {
        if (!material) return
        updateProgress.mutate({ id: material.id, studentId: material.student_id, words })
    }

    const toggleCurrentPracticed = () => {
        if (!sessionWords) return
        const next = sessionWords.map((w, i) => (i === currentIndex ? { ...w, practiced: !readPracticed(w) } : w))
        setSessionWords(next)
        persist(next)
    }

    const handleFinish = () => {
        if (sessionWords) persist(sessionWords)
        setShowCompletion(true)
    }

    const handleEndEarly = () => {
        if (sessionWords) persist(sessionWords)
        goBack()
    }

    if (isLoading) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-12 pt-2">
                <div role="status" aria-busy="true" className="flex flex-col items-center gap-4 rounded-3xl border border-gray-900/5 p-10 shadow-sm dark:border-gray-100/10">
                    <span className="sr-only">{t.loading}</span>
                    <Skeleton className="h-3 w-32 rounded-full" />
                    <Skeleton className="h-12 w-2/3 rounded-lg" />
                    <Skeleton className="h-11 w-48 rounded-full" />
                </div>
            </div>
        )
    }

    if (error || !material) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-12 pt-2">
                <section className="flex flex-col items-center gap-3 rounded-3xl border border-gray-900/5 p-8 text-center shadow-sm dark:border-gray-100/10">
                    <Owl mood="neutral" size={64} />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.notFoundTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">{t.notFoundDesc}</p>
                    <button
                        type="button"
                        onClick={goBack}
                        className="mt-2 cursor-pointer rounded-full border border-gray-900/10 bg-white px-5 py-2 text-sm font-bold text-gray-700 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200"
                    >
                        {t.backButton}
                    </button>
                </section>
            </div>
        )
    }

    if (material.words.length === 0) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-12 pt-2">
                <section className="flex flex-col items-center gap-3 rounded-3xl border border-gray-900/5 p-8 text-center shadow-sm dark:border-gray-100/10">
                    <Owl mood="neutral" size={64} />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.emptyTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">{t.emptyDesc}</p>
                </section>
            </div>
        )
    }

    const words = sessionWords ?? material.words
    const practicedCount = words.filter(readPracticed).length

    if (showCompletion) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-12 pt-2">
                <section className="flex flex-col items-center gap-4 rounded-3xl border border-purple-500/25 bg-purple-500/5 p-10 text-center shadow-sm dark:border-purple-400/25 dark:bg-purple-400/5">
                    <PartyPopper size={56} className="text-purple-600 dark:text-purple-300" />
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.completionTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t.completionDesc(practicedCount, words.length)}
                    </p>
                    {practicedCount === words.length && (
                        <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{t.completionAllDone}</p>
                    )}
                    <button
                        type="button"
                        onClick={goBack}
                        className="mt-2 flex cursor-pointer items-center gap-2 rounded-full bg-purple-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#6d28d9] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#6d28d9] dark:bg-purple-600 dark:shadow-[0_4px_0_0_#5b21b6]"
                    >
                        {t.backToMaterialButton}
                    </button>
                </section>
            </div>
        )
    }

    const currentWord = words[currentIndex]
    const isCurrentPracticed = readPracticed(currentWord)

    return (
        <>
            <aside
                className={`fixed left-4 top-24 bottom-4 z-20 flex ${SIDEBAR_WIDTH_CLASS} flex-col rounded-2xl border border-gray-900/10 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-gray-100/10 dark:bg-gray-950/95 lg:top-20`}
            >
                <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t.wordListTitle}
                </p>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
                    {words.map((w, i) => {
                        const practiced = readPracticed(w)
                        const isCurrent = i === currentIndex
                        const rowClasses = isCurrent
                            ? 'bg-purple-500/20 text-purple-700 ring-2 ring-purple-500/40 dark:bg-purple-400/20 dark:text-purple-300 dark:ring-purple-400/40'
                            : practiced
                                ? 'bg-emerald-500/20 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200'
                                : 'text-gray-700 hover:bg-gray-900/5 dark:text-gray-200 dark:hover:bg-gray-100/10'
                        return (
                            <button
                                key={`${w.word}-${i}`}
                                type="button"
                                onClick={() => setCurrentIndex(i)}
                                aria-current={isCurrent}
                                className={`flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-3 text-left text-base font-bold transition-colors duration-150 ${rowClasses}`}
                            >
                                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ERROR_TYPE_COLOR[w.errorType]}`}>
                                    {w.errorType}
                                </span>
                                <span className="min-w-0 flex-1 whitespace-normal break-words">{w.word}</span>
                                {practiced && (
                                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-200" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </aside>

            <div className={CONTENT_OFFSET_CLASS}>
                <div className="mx-auto max-w-3xl px-4 pb-14 pt-4">
                    <div className="flex flex-col gap-6 rounded-[2rem] border border-gray-900/10 bg-white/80 p-6 shadow-xl backdrop-blur-md dark:border-gray-100/10 dark:bg-gray-950/70 sm:p-10">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {t.wordCounter(currentIndex + 1, words.length)}
                            </span>
                            <span className="rounded-full bg-purple-500/15 px-4 py-1.5 text-sm font-extrabold text-purple-700 dark:text-purple-300">
                                {t.practicedBadge(practicedCount, words.length)}
                            </span>
                        </div>

                        <section className="flex min-h-[24rem] flex-col items-center justify-center gap-6 rounded-3xl border border-gray-900/5 bg-white p-10 text-center shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:min-h-[28rem] sm:p-16">
                            <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${ERROR_TYPE_COLOR[currentWord.errorType]}`}>
                                {currentWord.errorType}
                            </span>
                            <h1 className="text-6xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-8xl">
                                {currentWord.word}
                            </h1>
                            <button
                                type="button"
                                onClick={() => speak(currentWord.word, material.language)}
                                disabled={isSpeaking || isPronunciationLoading}
                                className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-900/10 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 disabled:cursor-wait disabled:opacity-60 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
                            >
                                <Volume2 size={18} className={isSpeaking ? 'animate-pulse' : ''} />
                                {t.pronounce}
                            </button>
                            {currentWord.count > 1 && (
                                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t.occurrences(currentWord.count)}</p>
                            )}
                        </section>

                        <div className="grid grid-cols-3 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                                disabled={currentIndex === 0}
                                className="flex cursor-pointer items-center justify-self-start gap-1.5 rounded-full border border-gray-900/10 bg-white px-6 py-3 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10 dark:disabled:hover:bg-gray-900"
                            >
                                <ChevronLeft size={18} />
                                {t.prev}
                            </button>
                            <button
                                type="button"
                                onClick={toggleCurrentPracticed}
                                className={`flex cursor-pointer items-center justify-self-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-sm transition-colors duration-200 ${
                                    isCurrentPracticed
                                        ? 'bg-teal-500/15 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300'
                                        : 'border border-gray-900/10 bg-white text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                }`}
                            >
                                {isCurrentPracticed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                {isCurrentPracticed ? t.markedPracticed : t.markPracticed}
                            </button>
                            {currentIndex === words.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={handleFinish}
                                    className="flex cursor-pointer items-center justify-self-end gap-2 rounded-full bg-purple-500 px-8 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#6d28d9] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#6d28d9] dark:bg-purple-600 dark:shadow-[0_4px_0_0_#5b21b6]"
                                >
                                    {t.finish}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setCurrentIndex((i) => Math.min(words.length - 1, i + 1))}
                                    className="flex cursor-pointer items-center justify-self-end gap-1.5 rounded-full bg-purple-500 px-7 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#6d28d9] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#6d28d9] dark:bg-purple-600 dark:shadow-[0_4px_0_0_#5b21b6]"
                                >
                                    {t.next}
                                    <ChevronRight size={18} />
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleEndEarly}
                            className="cursor-pointer text-center text-xs font-bold text-gray-400 underline-offset-2 transition-colors duration-200 hover:text-gray-600 hover:underline dark:text-gray-500 dark:hover:text-gray-300"
                        >
                            {t.endEarly}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default RemediationSession