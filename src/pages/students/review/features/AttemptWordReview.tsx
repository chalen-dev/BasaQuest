// File: AttemptWordReview.tsx
// File: src/pages/students/review/features/AttemptWordReview.tsx
//
// Shared word-by-word review UI — used both inline, right after a "Now"
// mode session (from AssessmentSession.tsx), and standalone on the
// "Send"-mode review page (TeacherReviewAttempt.tsx). Kept as one
// component specifically so both flows produce identical review data
// (same defaults, same confirm behavior) instead of two implementations
// quietly drifting apart.
//
// Every word starts defaulted to the SYSTEM's own verdict — the teacher
// is confirming or overriding, not starting from a blank slate.
//
// "Needs attention" combines TWO independent signals, both driving the
// same amber ring: system-flagged (confidence === 'low', from the
// scoring pipeline) and MANUALLY flagged (a teacher tapping the Flag
// button on any word, regardless of what the system thought). Manual
// flags are local component state only — there's no database column for
// them yet, so they reset if the page reloads. That's a deliberate
// scope call for now, not an oversight: promoting this to a persisted
// column is a follow-up if it turns out teachers want it to survive
// across sessions.
//
// LAYOUT: two VISUALLY SEPARATE cards side by side (stacked on narrow
// screens):
//   LEFT  — header info (kicker/title, who this reading is for, score
//           pills, flagged-count badge, color legend, tap hint) AND the
//           passage read as flowing colored text underneath — all one
//           card, since the legend/scores describe THIS passage. Each
//           miscue word additionally gets a small corner icon
//           distinguishing Omission from Mispronunciation — the
//           correct/miscue background color stays the primary signal
//           (it's literally what gets toggled), the icon is a secondary
//           cue so the two error types aren't visually identical.
//   RIGHT — its own separate card (own background, heavier border) with
//           the detailed per-word list and the actual Correct / Miscue /
//           Flag controls.
// Clicking a word in the LEFT passage doesn't toggle anything — it
// scrolls the RIGHT list to that word's row and rings it briefly.
//
// onConfirm hands back a verdict for EVERY word, not just the changed
// ones — see useSubmitReviewMutation's own comment for why that matters
// (Cohen's kappa agreement-rate tracking needs agreement recorded too,
// not only disagreement). Manual flags are NOT part of that payload —
// they're a reviewing aid only, nothing to submit.
import { useEffect, useRef, useState } from 'react'
import { Check, CircleAlert, Ear, Flag, MinusCircle, Send, UserRound, X } from 'lucide-react'
import { useLang } from '../../../../contexts/LangContext'
import type { Lang } from '../../../../components/buttons/LangToggle'
import type { AttemptDetail, AttemptWord, Verdict, WordVerdictOverride } from '../hooks'

type AttemptWordReviewProps = {
    attempt: AttemptDetail
    words: AttemptWord[]
    onConfirm: (verdicts: WordVerdictOverride[]) => void
    confirming: boolean
    studentName?: string | null
}

const STRINGS: Record<Lang, {
    kicker: string
    title: string
    forLabel: string
    accuracy: string
    fluency: string
    completeness: string
    prosody: string
    pronunciation: string
    needsAttention: (n: number) => string
    allClear: string
    tapHint: string
    legendCorrect: string
    legendMiscue: string
    legendInserted: string
    legendLowConfidence: string
    flagLabel: string
    recognizedAs: (word: string) => string
    inserted: string
    confirmLabel: string
    confirming: string
    emptyWords: string
}> = {
    fil: {
        kicker: 'Pagsusuri',
        title: 'Suriin ang Bawat Salita',
        forLabel: 'Para kay',
        accuracy: 'Katumpakan',
        fluency: 'Katatasan',
        completeness: 'Pagkakumpleto',
        prosody: 'Ritmo',
        pronunciation: 'Bigkas',
        needsAttention: (n) => `${n} salitang kailangan ng pansin`,
        allClear: 'Walang naka-flag na salita',
        tapHint: 'Pindutin ang salita sa talata para tumalon dito sa listahan.',
        legendCorrect: 'Tama',
        legendMiscue: 'Mali',
        legendInserted: 'Idinagdag na salita',
        legendLowConfidence: 'Kailangan ng pansin',
        flagLabel: 'I-flag',
        recognizedAs: (word) => `narinig: "${word}"`,
        inserted: 'Idinagdag na salita',
        confirmLabel: 'Kumpirmahin ang Resulta',
        confirming: 'Isinusumite…',
        emptyWords: 'Wala pang word-level na datos para sa pagsusuring ito.',
    },
    en: {
        kicker: 'Review',
        title: 'Review Each Word',
        forLabel: 'For',
        accuracy: 'Accuracy',
        fluency: 'Fluency',
        completeness: 'Completeness',
        prosody: 'Prosody',
        pronunciation: 'Pronunciation',
        needsAttention: (n) => `${n} word${n === 1 ? '' : 's'} flagged for attention`,
        allClear: 'No words flagged',
        tapHint: 'Tap a word in the passage to jump to it in the list.',
        legendCorrect: 'Correct',
        legendMiscue: 'Miscue',
        legendInserted: 'Inserted word',
        legendLowConfidence: 'Needs attention',
        flagLabel: 'Flag',
        recognizedAs: (word) => `heard: "${word}"`,
        inserted: 'Inserted word',
        confirmLabel: 'Confirm Results',
        confirming: 'Submitting…',
        emptyWords: "There's no word-level data for this attempt yet.",
    },
}

const ERROR_TYPE_COLOR: Record<AttemptWord['error_type'], string> = {
    None: 'bg-gray-900/5 text-gray-600 dark:bg-gray-100/10 dark:text-gray-300',
    Omission: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    Insertion: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    Mispronunciation: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
}

function ScorePill({ label, value }: { label: string; value: number | null }) {
    if (value == null) return null
    return (
        <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-bold text-gray-700 dark:bg-gray-100/10 dark:text-gray-300">
            {label}: {Math.round(value)}
        </span>
    )
}

function LegendSwatch({ colorClass, label }: { colorClass: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <span className={`inline-block h-3 w-3 rounded-full ${colorClass}`} />
            {label}
        </span>
    )
}

// Secondary cue for error type — deliberately NOT a color, since the
// word's background color is already reserved for the verdict
// (correct/miscue) and piling a third color meaning on top of that
// would make the background ambiguous. Insertion already has its own
// dashed-border cue (see the word rendering below), so it's not
// repeated here.
function ErrorTypeIcon({ errorType }: { errorType: AttemptWord['error_type'] }) {
    if (errorType === 'Omission') return <MinusCircle size={10} strokeWidth={2.5} />
    if (errorType === 'Mispronunciation') return <Ear size={10} strokeWidth={2.5} />
    return null
}

function wordTooltip(w: AttemptWord, t: (typeof STRINGS)['en']): string {
    const parts: string[] = [w.error_type]
    if (w.error_type === 'Insertion') {
        parts.push(t.inserted)
    } else if (w.recognized_word && w.recognized_word !== w.reference_word) {
        parts.push(t.recognizedAs(w.recognized_word))
    }
    if (w.accuracy_score != null) parts.push(`${Math.round(w.accuracy_score)}`)
    return parts.join(' · ')
}

export function AttemptWordReview({ attempt, words, onConfirm, confirming, studentName }: AttemptWordReviewProps) {
    const { lang } = useLang()
    const t = STRINGS[lang]
    const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({})
    const [manualFlags, setManualFlags] = useState<Record<string, boolean>>({})
    const [highlightedId, setHighlightedId] = useState<string | null>(null)
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Defaults every word to the system's own verdict (and clears manual
    // flags) the moment the words for THIS attempt load — re-keyed off
    // attempt.id so switching to a different attempt (the review list
    // flow) resets local state instead of carrying over a previous
    // attempt's edits/flags.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVerdicts(Object.fromEntries(words.map((w) => [w.id, w.system_verdict])))
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setManualFlags({})
    }, [attempt.id, words])

    useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current != null) clearTimeout(highlightTimeoutRef.current)
        }
    }, [])

    const isFlagged = (w: AttemptWord) => w.confidence === 'low' || !!manualFlags[w.id]
    const flaggedCount = words.filter(isFlagged).length

    const setVerdict = (wordId: string, verdict: Verdict) => {
        setVerdicts((prev) => ({ ...prev, [wordId]: verdict }))
    }

    const toggleManualFlag = (wordId: string) => {
        setManualFlags((prev) => ({ ...prev, [wordId]: !prev[wordId] }))
    }

    // Passage-side word click: doesn't touch the verdict at all, just
    // scrolls the list to that word's row and rings it briefly so it's
    // obvious which row just got jumped to.
    const jumpToWord = (wordId: string) => {
        if (highlightTimeoutRef.current != null) clearTimeout(highlightTimeoutRef.current)
        setHighlightedId(wordId)
        document.getElementById(`word-row-${wordId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        highlightTimeoutRef.current = setTimeout(() => setHighlightedId(null), 1600)
    }

    const handleConfirm = () => {
        onConfirm(words.map((w) => ({ wordId: w.id, verdict: verdicts[w.id] ?? w.system_verdict })))
    }

    return (
        <div className="flex flex-col gap-6">
            <div className={words.length > 0 ? 'grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start' : ''}>
                {/* LEFT card: header info + score pills + legend + the passage itself, all one container */}
                <section className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
                    <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
                    <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
                    <div className="relative">
                        <span className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">{t.kicker}</span>
                        <h2 className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h2>
                        {attempt.passage_title && (
                            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{attempt.passage_title}</p>
                        )}
                        {studentName && (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal-500/15 px-4 py-1.5 text-sm font-bold text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                                <UserRound size={15} />
                                {t.forLabel} {studentName}
                            </div>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                            <ScorePill label={t.accuracy} value={attempt.accuracy_score} />
                            <ScorePill label={t.fluency} value={attempt.fluency_score} />
                            <ScorePill label={t.completeness} value={attempt.completeness_score} />
                            <ScorePill label={t.prosody} value={attempt.prosody_score} />
                            <ScorePill label={t.pronunciation} value={attempt.pron_score} />
                        </div>
                        <div className="mt-3">
                            {flaggedCount > 0 ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                                    <CircleAlert size={13} />
                                    {t.needsAttention(flaggedCount)}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-600 dark:text-green-400">
                                    <Check size={13} />
                                    {t.allClear}
                                </span>
                            )}
                        </div>
                    </div>

                    {words.length === 0 ? (
                        <p className="relative mt-6 rounded-2xl border border-dashed border-gray-900/15 px-4 py-6 text-center text-sm font-semibold text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                            {t.emptyWords}
                        </p>
                    ) : (
                        <>
                            <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-dashed border-gray-900/10 pb-4 dark:border-gray-100/10">
                                <LegendSwatch colorClass="bg-green-500" label={t.legendCorrect} />
                                <LegendSwatch colorClass="bg-rose-500" label={t.legendMiscue} />
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                    <span className="inline-block h-3 w-5 rounded-full border-2 border-dashed border-amber-500 dark:border-amber-400" />
                                    {t.legendInserted}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                    <span className="inline-block h-3 w-3 rounded-full bg-gray-300 ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:bg-gray-600 dark:ring-amber-300 dark:ring-offset-gray-900" />
                                    {t.legendLowConfidence}
                                </span>
                            </div>
                            <p className="relative mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{t.tapHint}</p>
                            <p className="relative mt-4 text-lg font-medium leading-loose text-gray-800 dark:text-gray-200">
                                {words.map((w) => {
                                    const verdict = verdicts[w.id] ?? w.system_verdict
                                    const isInsertion = w.error_type === 'Insertion'
                                    const displayWord = isInsertion ? w.recognized_word : w.reference_word
                                    const flagged = isFlagged(w)
                                    const hasTypeIcon = w.error_type === 'Omission' || w.error_type === 'Mispronunciation'
                                    return (
                                        <span key={w.id}>
                                            <span className="relative inline-block">
                                                <span
                                                    onClick={() => jumpToWord(w.id)}
                                                    title={wordTooltip(w, t)}
                                                    className={`cursor-pointer rounded-[4px] px-1 py-0.5 font-bold transition-colors duration-150 ${
                                                        verdict === 'correct'
                                                            ? 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500'
                                                            : 'bg-rose-500 text-white hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500'
                                                    } ${isInsertion ? 'border-b-2 border-dashed border-amber-500 dark:border-amber-300' : ''} ${
                                                        flagged ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-amber-300 dark:ring-offset-gray-900' : ''
                                                    }`}
                                                >
                                                    {displayWord}
                                                </span>
                                                {hasTypeIcon && (
                                                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-gray-700 shadow ring-1 ring-gray-900/10 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-100/10">
                                                        <ErrorTypeIcon errorType={w.error_type} />
                                                    </span>
                                                )}
                                            </span>
                                            {' '}
                                        </span>
                                    )
                                })}
                            </p>
                        </>
                    )}
                </section>

                {/* RIGHT card: fully separate container — own background, own border, own shadow. Just the list. */}
                {words.length > 0 && (
                    <section className="flex flex-col gap-2 rounded-3xl border-2 border-gray-900/10 bg-gray-50 p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-950 sm:p-5 lg:max-h-[42rem] lg:overflow-y-auto">
                        {words.map((w) => {
                            const verdict = verdicts[w.id] ?? w.system_verdict
                            const isInsertion = w.error_type === 'Insertion'
                            const flagged = isFlagged(w)
                            return (
                                <div
                                    key={w.id}
                                    id={`word-row-${w.id}`}
                                    className={`flex flex-wrap items-center gap-3 rounded-2xl border-2 bg-white p-3.5 shadow-sm transition-shadow duration-300 dark:bg-gray-900 ${
                                        highlightedId === w.id
                                            ? 'ring-4 ring-teal-500/50 dark:ring-teal-400/50'
                                            : ''
                                    } ${
                                        flagged
                                            ? 'border-amber-500/40 dark:border-amber-400/40'
                                            : 'border-gray-900/5 dark:border-gray-100/10'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-base font-extrabold text-gray-900 dark:text-gray-50">
                                                {isInsertion ? w.recognized_word : w.reference_word}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ERROR_TYPE_COLOR[w.error_type]}`}>
                                                <ErrorTypeIcon errorType={w.error_type} />
                                                {w.error_type}
                                            </span>
                                            {w.accuracy_score != null && (
                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                    {Math.round(w.accuracy_score)}
                                                </span>
                                            )}
                                        </div>
                                        {!isInsertion && w.recognized_word && w.recognized_word !== w.reference_word && (
                                            <div className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                {t.recognizedAs(w.recognized_word)}
                                            </div>
                                        )}
                                        {isInsertion && (
                                            <div className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t.inserted}</div>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        <button
                                            onClick={() => setVerdict(w.id, 'correct')}
                                            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-150 ${
                                                verdict === 'correct'
                                                    ? 'bg-green-500 text-white dark:bg-green-600'
                                                    : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                            }`}
                                        >
                                            <Check size={13} />
                                            {t.legendCorrect}
                                        </button>
                                        <button
                                            onClick={() => setVerdict(w.id, 'miscue')}
                                            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-150 ${
                                                verdict === 'miscue'
                                                    ? 'bg-rose-500 text-white dark:bg-rose-600'
                                                    : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                            }`}
                                        >
                                            <X size={13} />
                                            {t.legendMiscue}
                                        </button>
                                        <button
                                            onClick={() => toggleManualFlag(w.id)}
                                            title={t.legendLowConfidence}
                                            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-150 ${
                                                manualFlags[w.id]
                                                    ? 'bg-amber-500 text-white dark:bg-amber-500'
                                                    : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                                            }`}
                                        >
                                            <Flag size={13} />
                                            {t.flagLabel}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </section>
                )}
            </div>

            <button
                onClick={handleConfirm}
                disabled={confirming || words.length === 0}
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59] ${
                    confirming || words.length === 0 ? 'cursor-not-allowed opacity-50 hover:translate-y-0' : ''
                }`}
            >
                <Send size={17} />
                {confirming ? t.confirming : t.confirmLabel}
            </button>
        </div>
    )
}