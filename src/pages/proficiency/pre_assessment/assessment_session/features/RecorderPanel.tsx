// File: src/pages/proficiency/pre_assessment/assessment_session/features/RecorderPanel.tsx
// Right column of the passage + recording step — the timer, waveform, mic
// toggle, redo/submit controls, and the submitted/"waiting for teacher"
// state. Split out of AssessmentSession.tsx to keep that file focused on
// step routing (intro/loading/error/passage) rather than recorder UI.
//
// Once submitted, this is intentionally terminal — no "Record Again" from
// here, per explicit product decision (a pupil shouldn't be able to
// resubmit after their teacher has been notified).
//
// While actively recording, a small non-blocking amber pill can appear
// above the waveform when useRecorder's ambient-noise heuristic
// (rec.isNoisy) trips — see useRecorder.ts's header comment for how that's
// estimated. It's a nudge only; it never pauses or blocks recording.
//
// `submitting` (from AssessmentSession.tsx's useSubmitAttempt call) covers
// the window between tapping "Submit to Teacher" and the upload + attempt
// insert (+ scoring kick-off, for English) actually finishing — Redo and
// Submit both disable during that window so a pupil can't fire a second
// upload or yank the recording out from under an in-flight one, and the
// Submit label swaps to t.submitting so it's clear something's happening
// rather than looking like a dead click.
//
// Three one-time onboarding <Hint>s (see components/ui/Hint.tsx): the mic
// button (gated to `!isRecording`, so it only shows in the idle "ready to
// record" state), and — once a take exists (isRecorded) — Redo and
// Submit, so a pupil sees exactly one relevant hint per phase instead of
// several at once. All three are `persist`-ed (the Hint default) and mark
// themselves seen the moment they're actually shown, so each is a true
// "first time reaching this state" coach mark rather than a per-session
// nag. `autoHideMs={6000}` — half the auth-page hints' 12s default, since
// this screen already has more competing for attention (timer, waveform,
// mic button) than a bare login form.
//
// h-full here fills the grid's fixed height (set in AssessmentSession.tsx)
// instead of the old min-height + sticky approach — this panel's content
// is a fixed set of elements (timer, waveform, one button, some copy), not
// variable-length like the passage, so it just centers within whatever
// height the grid gives it.
import { Hourglass, Mic, RotateCcw, Send, TriangleAlert } from 'lucide-react'
import { Owl } from '../../../../../components/ui/Owl.tsx'
import { Hint } from '../../../../../components/ui/Hint.tsx'
import type { AssessmentStrings } from '../assessmentSessionStrings.ts'
import { formatSeconds, MAX_RECORDING_SECONDS } from '../assessmentSessionStrings.ts'
import type { useRecorder } from './useRecorder.ts'
import { Waveform } from './Waveform.tsx'
type RecorderPanelProps = {
    t: AssessmentStrings
    submitted: boolean
    submitting: boolean
    rec: ReturnType<typeof useRecorder>
    onSubmit: () => void
}
export function RecorderPanel({ t, submitted, submitting, rec, onSubmit }: RecorderPanelProps) {
    const isRecording = rec.status === 'recording'
    const isRecorded = rec.status === 'recorded'
    const nearLimit = isRecording && rec.seconds >= MAX_RECORDING_SECONDS - 10
    return (
        <section className="flex h-full flex-col items-center justify-center gap-6 rounded-3xl border border-gray-900/5 bg-white p-8 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-10">
            {submitted ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
                        <Hourglass size={34} className="animate-pulse" />
                    </span>
                    <span className="rounded-full bg-amber-500/15 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                        {t.pendingTitle}
                    </span>
                    <p className="max-w-sm text-base font-medium text-gray-600 dark:text-gray-400">{t.pendingDesc}</p>
                </div>
            ) : (
                <>
                    <div className="text-center">
                        <div className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {isRecording ? t.recordingLabel : isRecorded ? t.recordedLabel : t.readyLabel}
                        </div>
                        <div
                            className={`font-mono text-6xl font-extrabold leading-none ${
                                nearLimit
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : isRecording
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-gray-900 dark:text-gray-50'
                            }`}
                        >
                            {formatSeconds(rec.seconds)}
                            {isRecording && (
                                <span className="ml-1 text-2xl font-bold text-gray-400 dark:text-gray-500">
                                    / {formatSeconds(MAX_RECORDING_SECONDS)}
                                </span>
                            )}
                        </div>
                        {!isRecording && !isRecorded && (
                            <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                {t.timeLimitNote(Math.round(MAX_RECORDING_SECONDS / 60))}
                            </p>
                        )}
                    </div>
                    {isRecording && rec.isNoisy && (
                        <div className="flex items-center gap-2 rounded-full bg-amber-500/15 px-4 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                            <TriangleAlert size={14} />
                            {t.noisyEnvironmentWarning}
                        </div>
                    )}
                    <Waveform active={isRecording} levels={rec.levels} />
                    {isRecorded && rec.audioUrl && (
                        <audio controls src={rec.audioUrl} className="w-full" />
                    )}
                    {isRecorded && !rec.audioUrl && (
                        <div className="rounded-full bg-gray-900/5 px-4 py-1.5 text-sm font-bold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                            {t.simulatedTake}
                        </div>
                    )}
                    {!isRecorded && (
                        <div className="relative">
                            <button
                                onClick={isRecording ? rec.stop : () => rec.start(MAX_RECORDING_SECONDS)}
                                aria-label={isRecording ? t.hintRecording : t.hintIdle}
                                className={`flex h-36 w-36 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-100 active:translate-y-1 ${
                                    isRecording
                                        ? 'bg-rose-600 shadow-[0_10px_0_0_#9f1239] active:shadow-[0_3px_0_0_#9f1239]'
                                        : 'bg-teal-500 shadow-[0_10px_0_0_#0f766e] active:shadow-[0_3px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_10px_0_0_#115e59]'
                                }`}
                            >
                                {isRecording ? (
                                    <span className="h-10 w-10 rounded-xl bg-white" />
                                ) : (
                                    <Mic size={52} />
                                )}
                            </button>
                            <Hint id="assessment-mic-button" text={t.micHint} show={!isRecording} placement="top" align="center" autoHideMs={6000} />
                        </div>
                    )}
                    <p className="min-h-[24px] text-center text-base font-semibold text-gray-600 dark:text-gray-400">
                        {isRecording ? t.hintRecording : isRecorded ? t.hintRecorded : t.hintIdle}
                    </p>
                    {rec.error && !isRecorded && (
                        <div className="w-full rounded-2xl bg-gray-900/5 p-4 text-center text-sm font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                            {t.micUnavailable}
                            <button
                                onClick={() => rec.simulate(38)}
                                className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-gray-900/10 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/10"
                            >
                                {t.continueNoMic}
                            </button>
                        </div>
                    )}
                    {isRecorded ? (
                        <div className="flex w-full gap-3">
                            <div className="relative flex-1">
                                <button
                                    onClick={rec.reset}
                                    disabled={submitting}
                                    className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-gray-900/10 px-5 py-3 text-base font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/10 ${submitting ? 'cursor-not-allowed opacity-40 hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                                >
                                    <RotateCcw size={17} />
                                    {t.redoLabel}
                                </button>
                                <Hint id="assessment-redo-button" text={t.redoHint} placement="top" align="start" autoHideMs={6000} />
                            </div>
                            <div className="relative flex-[2]">
                                <button
                                    onClick={onSubmit}
                                    disabled={submitting}
                                    className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-teal-500 px-5 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59] ${submitting ? 'cursor-not-allowed opacity-60 hover:translate-y-0 active:translate-y-0' : ''}`}
                                >
                                    <Send size={17} />
                                    {submitting ? t.submitting : t.submitLabel}
                                </button>
                                <Hint id="assessment-submit-button" text={t.submitHint} placement="top" align="end" autoHideMs={6000} />
                            </div>
                        </div>
                    ) : (
                        <button disabled className="w-full cursor-not-allowed rounded-full bg-teal-500 px-5 py-3 text-base font-bold text-white opacity-40 dark:bg-teal-600">
                            <span className="inline-flex items-center justify-center gap-2">
                                <Send size={17} />
                                {t.submitLabel}
                            </span>
                        </button>
                    )}
                    <div className="flex w-full items-center gap-3 border-t-2 border-dashed border-gray-900/10 pt-4 dark:border-gray-100/10">
                        <Owl size={44} />
                        <p className="text-sm font-semibold leading-snug text-gray-600 dark:text-gray-400">
                            {t.recorderEncourage}
                        </p>
                    </div>
                </>
            )}
        </section>
    )
}