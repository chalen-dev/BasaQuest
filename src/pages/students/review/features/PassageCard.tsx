// File: src/pages/students/review/features/PassageCard.tsx
//
// LEFT card of AttemptWordReview: header info (kicker/title, who this
// reading is for, score pills, flagged-count badge), an audio player for
// the pupil's actual recorded take (when one exists), the color legend,
// the passage itself as flowing colored text, the select-mode /
// bulk-action bar, and (at the bottom, still inside this same card) the
// Save Draft and Confirm Results buttons — moved in here from the
// orchestrator so they sit directly below the action bar instead of
// floating outside both cards.
//
// id="passage-card" on the outer section is load-bearing: the parent
// uses it both as the IntersectionObserver target (to know when to show
// the "Back to Passage" floating button) and as the scroll target that
// button jumps back to.
//
// AUDIO PLAYBACK: audioUrl is a plain string (or null) handed down from
// the orchestrator, which is the only thing that knows it's actually a
// short-lived signed Supabase Storage URL underneath
// (useAttemptAudioUrlQuery) — this component just renders a native
// <audio> element and doesn't care where the URL came from. Renders
// nothing when null (older attempts predating the audio_path column, or
// a signed URL that hasn't resolved yet).
//
// Selected words need to stand out even though the verdict color
// (green/rose) already owns the word's background — a thick, high-
// contrast teal ring PLUS a small corner check-badge (mirroring the
// error-type badge on the opposite corner) so "selected" reads clearly
// no matter which verdict color is underneath. Both corner badges carry
// an explicit z-index — without one, a neighboring word's background
// (later in the DOM, tightly packed inline) painted over them.
//
// Verdict backgrounds use the -600 shade (not -500) and stay fully
// OPAQUE — an earlier version tried a translucent /70 background to
// look "less vibrant", but the page background bled through it and
// washed out the white text's contrast. -600 solid reads as calmer
// than the neon -500 while keeping the white text crisp regardless of
// what's behind the card.
//
// The error-type corner icon reflects the EFFECTIVE type (system
// detection, or a teacher's manual Omission/Mispronunciation override
// from WordListCard's type picker) via effectiveErrorType(), not the
// raw system value — so overriding a word's type in the list updates
// its icon in the passage too.
//
// SAVE DRAFT vs CONFIRM RESULTS: Save Draft is the secondary/outline
// button, Confirm Results stays the primary filled teal button — same
// visual hierarchy as any "save vs. finish" pairing, since Confirm is
// the one-way door and Save Draft is the one a teacher should feel free
// to tap repeatedly.
import { Check, CheckSquare, CircleAlert, Save, Send, UserRound, X } from 'lucide-react'
import type { AttemptDetail, AttemptWord, Verdict } from '../hooks'
import type { AttemptWordReviewStrings } from './attemptWordReviewStrings'
import { effectiveErrorType, wordTooltip } from './attemptWordReviewHelpers'
import { ErrorTypeIcon, LegendSwatch, ScorePill } from './AttemptWordReviewShared'
type PassageCardProps = {
    attempt: AttemptDetail
    studentName?: string | null
    words: AttemptWord[]
    verdicts: Record<string, Verdict>
    manualFlags: Record<string, boolean>
    manualErrorType: Record<string, AttemptWord['error_type']>
    selectedIds: Record<string, boolean>
    selectMode: boolean
    t: AttemptWordReviewStrings
    confirming: boolean
    savingDraft: boolean
    audioUrl: string | null
    onWordClick: (wordId: string) => void
    onEnterSelectMode: () => void
    onExitSelectMode: () => void
    onBulkSetVerdict: (verdict: Verdict) => void
    onClearSelection: () => void
    onConfirm: () => void
    onSaveDraft: () => void
}
export function PassageCard({
                                attempt,
                                studentName,
                                words,
                                verdicts,
                                manualFlags,
                                manualErrorType,
                                selectedIds,
                                selectMode,
                                t,
                                confirming,
                                savingDraft,
                                audioUrl,
                                onWordClick,
                                onEnterSelectMode,
                                onExitSelectMode,
                                onBulkSetVerdict,
                                onClearSelection,
                                onConfirm,
                                onSaveDraft,
                            }: PassageCardProps) {
    const isFlagged = (w: AttemptWord) => w.confidence === 'low' || !!manualFlags[w.id]
    const flaggedCount = words.filter(isFlagged).length
    const selectedCount = Object.values(selectedIds).filter(Boolean).length
    return (
        <section id="passage-card" className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
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
                {audioUrl && (
                    <div className="mt-4 flex flex-col gap-1.5 rounded-2xl border border-gray-900/5 bg-white/60 p-3 dark:border-gray-100/10 dark:bg-gray-900/40">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {t.recordingLabel}
                        </span>
                        <audio controls src={audioUrl} className="h-9 w-full" />
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
                    <p className="relative mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {selectMode ? t.tapHintSelectMode : t.tapHint}
                    </p>
                    <p className="relative mt-4 text-lg font-medium leading-loose text-gray-800 dark:text-gray-200">
                        {words.map((w) => {
                            const verdict = verdicts[w.id] ?? w.system_verdict
                            const isInsertion = w.error_type === 'Insertion'
                            const displayWord = isInsertion ? w.recognized_word : w.reference_word
                            const flagged = isFlagged(w)
                            const selected = !!selectedIds[w.id]
                            const errorType = effectiveErrorType(w, manualErrorType)
                            const hasTypeIcon = errorType === 'Omission' || errorType === 'Mispronunciation'
                            return (
                                <span key={w.id}>
                                    <span className="relative inline-block">
                                        <span
                                            onClick={() => onWordClick(w.id)}
                                            title={wordTooltip(w, t, errorType)}
                                            className={`cursor-pointer rounded-[4px] px-1 py-0.5 font-bold transition-colors duration-150 ${
                                                verdict === 'correct'
                                                    ? 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
                                                    : 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600'
                                            } ${isInsertion ? 'border-b-2 border-dashed border-amber-500 dark:border-amber-300' : ''} ${
                                                flagged ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-amber-300 dark:ring-offset-gray-900' : ''
                                            } ${
                                                selected ? 'ring-4 ring-teal-500 dark:ring-teal-300' : ''
                                            }`}
                                        >
                                            {displayWord}
                                        </span>
                                        {hasTypeIcon && (
                                            <span className="absolute -right-1.5 -top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white text-gray-700 shadow ring-1 ring-gray-900/10 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-100/10">
                                                <ErrorTypeIcon errorType={errorType} />
                                            </span>
                                        )}
                                        {selected && (
                                            <span className="absolute -bottom-1.5 -left-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-white shadow ring-2 ring-white dark:ring-gray-900">
                                                <Check size={10} strokeWidth={3} />
                                            </span>
                                        )}
                                    </span>
                                    {' '}
                                </span>
                            )
                        })}
                    </p>
                    {!selectMode ? (
                        <div className="relative mt-6 flex items-center justify-center rounded-2xl border-2 border-dashed border-teal-500/30 bg-white/50 px-4 py-3 dark:border-teal-400/25 dark:bg-gray-900/40">
                            <button
                                onClick={onEnterSelectMode}
                                className="flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-bold text-white transition-colors duration-150 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
                            >
                                <CheckSquare size={15} />
                                {t.selectWordsLabel}
                            </button>
                        </div>
                    ) : (
                        <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-teal-500/40 bg-white/70 px-4 py-3 shadow-sm dark:border-teal-400/30 dark:bg-gray-900/60">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                {selectedCount > 0 ? t.selectedCount(selectedCount) : t.selectNone}
                            </span>
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                                <button
                                    onClick={() => onBulkSetVerdict('correct')}
                                    disabled={selectedCount === 0}
                                    className="flex items-center gap-1 rounded-full bg-green-500 px-3 py-1.5 text-xs font-bold text-white transition-colors duration-150 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-green-500 dark:bg-green-600 dark:hover:bg-green-500"
                                >
                                    <Check size={13} />
                                    {t.setToCorrect}
                                </button>
                                <button
                                    onClick={() => onBulkSetVerdict('miscue')}
                                    disabled={selectedCount === 0}
                                    className="flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-bold text-white transition-colors duration-150 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500"
                                >
                                    <X size={13} />
                                    {t.setToMiscue}
                                </button>
                                <button
                                    onClick={onClearSelection}
                                    disabled={selectedCount === 0}
                                    className="rounded-full border border-gray-900/10 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors duration-150 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10"
                                >
                                    {t.clearSelection}
                                </button>
                                <button
                                    onClick={onExitSelectMode}
                                    className="flex items-center gap-1 rounded-full bg-gray-900/10 px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-900/15 dark:bg-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/15"
                                >
                                    <X size={13} />
                                    {t.doneLabel}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
            <div className="relative mx-auto mt-6 flex w-full max-w-md flex-col gap-2 sm:flex-row">
                <button
                    onClick={onSaveDraft}
                    disabled={savingDraft || words.length === 0}
                    className={`flex items-center justify-center gap-2 rounded-full border-2 border-teal-500/40 px-5 py-3 text-sm font-bold text-teal-700 transition-colors duration-150 dark:border-teal-400/30 dark:text-teal-300 ${
                        savingDraft || words.length === 0
                            ? 'cursor-not-allowed opacity-50'
                            : 'cursor-pointer hover:bg-teal-500/10 dark:hover:bg-teal-400/10'
                    }`}
                >
                    <Save size={16} />
                    {savingDraft ? t.savingDraftLabel : t.saveDraftLabel}
                </button>
                <button
                    onClick={onConfirm}
                    disabled={confirming || words.length === 0}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59] ${
                        confirming || words.length === 0 ? 'cursor-not-allowed opacity-50 hover:translate-y-0' : 'cursor-pointer'
                    }`}
                >
                    <Send size={17} />
                    {confirming ? t.confirming : t.confirmLabel}
                </button>
            </div>
        </section>
    )
}