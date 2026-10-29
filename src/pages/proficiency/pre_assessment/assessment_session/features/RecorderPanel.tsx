// File: RecorderPanel.tsx
// File: src/pages/proficiency/pre_assessment/assessment_session/features/RecorderPanel.tsx
// The bottom bar of the passage + recording step (the passage card sits above
// it, full width): timer and status on the left, waveform and mic in the
// middle (the player replaces them once a take exists), redo/submit on the
// right, and the submitted/"waiting for teacher" state. Anything that must not
// resize the bar (the mic-unavailable card, the hints) floats above it, so the
// passage above never changes size when it appears. Split out of AssessmentSession.tsx to keep that file focused on
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
// insert (+ scoring kick-off, for English) actually finishing — the whole
// panel swaps to a dedicated full-panel "sending" state during that
// window (see the submitting branch below, styled like the
// pendingTitle/pendingDesc "waiting for teacher" state below it) instead
// of just dimming the Submit button, so a pupil on a slow connection gets
// an unmistakable signal rather than something that could pass for a
// dead click.
//
// LISTEN-BACK PLAYER: once recorded, the take is played back through the
// shared AudioPlayer (components/ui/AudioPlayer.tsx) instead of a native
// <audio controls> element — same custom play/pause + scrub bar used in
// the teacher review page's PassageCard.tsx, moved into components/ui/
// since both features need it. Falls back to the "simulated take" pill
// when there's no real audioUrl (mic was unavailable and the pupil
// continued via useRecorder's `simulate`).
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
//
// MIC COUNTDOWN: tapping the mic button while idle starts a local 3-2-1
// countdown (`countdown` state below) instead of recording immediately.
// The countdown's visible 3-2-1 timer is purely client-side, but
// rec.prepare() (mic access + MediaRecorder/AudioContext setup) is kicked
// off in the BACKGROUND the instant the countdown starts, running in
// parallel with it — see useRecorder.ts's PREPARE / BEGIN SPLIT comment.
// That's what lets rec.begin() (synchronous) start capture the instant
// the countdown hits 0, with no perceptible gap: an earlier version only
// called rec.start() (which itself calls getUserMedia) after the
// countdown finished, so the pupil watched the countdown end, the button
// flash back to its idle mic icon, and only THEN start recording a beat
// later once getUserMedia actually resolved. Tapping the button again
// mid-countdown cancels it (rec.cancelPrepare() releases whatever
// prepare() already acquired) instead of arming recording, so a mis-tap
// can't force an unwanted take.
import { useEffect, useRef, useState } from 'react'
import { Hourglass, Loader2, Mic, RotateCcw, Send, TriangleAlert } from 'lucide-react'
import { Hint } from '../../../../../components/ui/Hint.tsx'
import { AudioPlayer } from '../../../../../components/ui/AudioPlayer.tsx'
import type { AssessmentStrings } from '../assessmentSessionStrings.ts'
import { formatSeconds, MAX_RECORDING_SECONDS } from '../assessmentSessionStrings.ts'
import type { useRecorder } from './useRecorder.ts'
import { Waveform } from './Waveform.tsx'
import { MicPermissionHelp } from './MicPermissionHelp.tsx'
const MIC_COUNTDOWN_SECONDS = 3
type RecorderPanelProps = {
    t: AssessmentStrings
    submitted: boolean
    submitting: boolean
    rec: ReturnType<typeof useRecorder>
    onSubmit: () => void
    // True while the microphone permission is still being sorted out: the
    // one-time hints wait until then, and this panel reports back whether its
    // microphone help card is up (see MicPermissionHelp.tsx).
    hintsBlocked: boolean
    onMicHelpActiveChange: (active: boolean) => void
}
export function RecorderPanel({ t, submitted, submitting, rec, onSubmit, hintsBlocked, onMicHelpActiveChange }: RecorderPanelProps) {
    const isRecording = rec.status === 'recording'
    const isRecorded = rec.status === 'recorded'
    const nearLimit = isRecording && rec.seconds >= MAX_RECORDING_SECONDS - 10
    const [countdown, setCountdown] = useState<number | null>(null)
    const countdownTickRef = useRef<ReturnType<typeof setInterval> | null>(null)
    // The in-flight (or settled) rec.prepare() call for the CURRENT
    // countdown — see handleMicClick. Compared by reference against
    // itself inside .then() callbacks so a stale prepare() from a
    // canceled/superseded countdown can never act on the current one.
    const preparePromiseRef = useRef<Promise<boolean> | null>(null)
    const isCountingDown = countdown !== null
    // PRE-WARM: kick off prepare() (getUserMedia + MediaRecorder/
    // AudioContext setup) the MOMENT this panel mounts — i.e. as soon as
    // the pupil reaches the recording screen — instead of only starting
    // it on the mic tap. Previously the countdown and prepare() ran in
    // parallel (see PREPARE / BEGIN SPLIT in useRecorder.ts), which
    // already removed the gap between "countdown ends" and "recording
    // starts", but the pupil still felt a lag on the very FIRST tap of a
    // session: that's when getUserMedia's browser permission prompt (and
    // the AudioContext/analyser setup behind it) is slowest, and it was
    // only starting right as the countdown appeared. Doing it here means
    // permission has usually already been granted/denied by the time the
    // pupil actually taps the mic, so handleMicClick below has nothing
    // left to wait on for that first take. `preparePromiseRef.current` is
    // cleared once handleMicClick's countdown actually hands it off to
    // begin() (see the intervalId branch below), so every take AFTER the
    // first (Redo) still gets its own fresh prepare() the same way it
    // always did — reusing a spent/closed stream from a finished
    // recording would throw. No unmount cleanup needed here: if the
    // pupil never taps the mic and leaves this screen, useRecorder's own
    // unmount effect already releases whatever stream/AudioContext this
    // pre-warm acquired.
    useEffect(() => {
        preparePromiseRef.current = rec.prepare()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    useEffect(() => {
        return () => {
            if (countdownTickRef.current != null) clearInterval(countdownTickRef.current)
        }
    }, [])
    const cancelCountdown = () => {
        if (countdownTickRef.current != null) clearInterval(countdownTickRef.current)
        countdownTickRef.current = null
        setCountdown(null)
        preparePromiseRef.current = null
        // Releases whatever stream/AudioContext prepare() already
        // acquired (or is about to) — otherwise canceling mid-countdown
        // would leave a live mic stream open in the background with
        // nothing ever recording from it.
        rec.cancelPrepare()
    }
    const handleMicClick = () => {
        if (isRecording) {
            rec.stop()
            return
        }
        if (isCountingDown) {
            cancelCountdown()
            return
        }
        // Defensive: if handleMicClick's "start" branch is somehow re-
        // entered before isCountingDown reflects the first call (e.g. a
        // touch device firing both a synthetic click and a real one for
        // what the pupil felt as one tap), kill any interval already in
        // flight before starting a fresh one — otherwise two intervals
        // would exist at once, see the intervalId comment below for what
        // that leads to.
        if (countdownTickRef.current != null) {
            clearInterval(countdownTickRef.current)
            countdownTickRef.current = null
        }
        // Reuse the PRE-WARM prepare() call kicked off on mount (see above)
        // if it's still there — getUserMedia was already requested before
        // the pupil ever tapped the mic, so there's nothing left to kick
        // off here for the first take. Falls back to a fresh prepare() for
        // every take after the first (preparePromiseRef.current is cleared
        // once a take actually begins, below) — same BACKGROUND-during-
        // countdown behavior the PREPARE / BEGIN SPLIT comment in
        // useRecorder.ts describes, just not pre-warmed since there's no
        // "screen just loaded" moment to hide it behind on a redo.
        const preparePromise = preparePromiseRef.current ?? rec.prepare()
        preparePromiseRef.current = preparePromise
        // Fail fast: if the mic turns out to be unavailable, don't make
        // the pupil sit through the rest of a countdown that's heading
        // nowhere — rec.error/rec.status already flipped to the
        // 'unsupported' fallback inside prepare() itself, so just cut the
        // countdown short here. Guarded against a stale promise in case
        // this countdown was already canceled/superseded by the time it
        // resolves.
        preparePromise.then((ok) => {
            if (ok || preparePromiseRef.current !== preparePromise) return
            // Clear the ref so a retry tap (e.g. after granting mic
            // permission in the browser's site settings) issues its own
            // fresh prepare() instead of reusing this same failed promise
            // forever.
            preparePromiseRef.current = null
            if (countdownTickRef.current != null) clearInterval(countdownTickRef.current)
            countdownTickRef.current = null
            setCountdown(null)
        })
        // `remaining` is a plain closure variable, not React state — it just
        // drives this interval's own tick logic.
        let remaining = MIC_COUNTDOWN_SECONDS
        setCountdown(remaining)
        // Captured by value in this closure so the completion branch below
        // clears THIS interval specifically, never whatever interval the
        // ref happens to be pointing at by the time it fires. Clearing via
        // `countdownTickRef.current` there was a real bug: if two
        // intervals were ever alive at once, the ref only ever pointed at
        // the newer one, so the OLDER interval's completion cleared the
        // NEWER one by mistake and never stopped itself — it kept firing
        // every second forever, each time re-triggering a start and
        // spinning up yet another recording tick interval on top of the
        // last, which is exactly what made the big timer climb forever
        // even after the take was already marked done.
        const intervalId: ReturnType<typeof setInterval> = setInterval(() => {
            remaining -= 1
            if (remaining <= 0) {
                clearInterval(intervalId)
                if (countdownTickRef.current === intervalId) countdownTickRef.current = null
                // Deliberately NOT clearing the countdown digit here —
                // only once prepare() actually settles, in the .then()
                // below. Clearing it immediately would flash the button
                // back to its idle mic icon for however long prepare()
                // takes to resolve on a slow device, reintroducing the
                // exact gap this whole split exists to remove. In the
                // normal case prepare() has already resolved by now, so
                // this .then() fires on the very next microtask — no
                // visible pause at all.
                preparePromise.then((ok) => {
                    setCountdown(null)
                    // This prepare() — pre-warmed or fresh — is now spent
                    // either way: on success its stream gets torn down the
                    // moment this take stops (see useRecorder.ts's mr.onstop
                    // -> cleanupAudio()), and on failure there's nothing
                    // live to reuse. Clearing the ref means the NEXT tap
                    // (Redo) always kicks off its own fresh prepare() rather
                    // than reusing this one's now-closed stream, which
                    // begin() would otherwise fail to start.
                    preparePromiseRef.current = null
                    if (ok) rec.begin(MAX_RECORDING_SECONDS)
                    // If !ok, rec.status/rec.error already reflect the
                    // failure (set inside prepare()) — the existing
                    // mic-unavailable fallback UI takes over once
                    // isCountingDown flips back to false above.
                })
            } else {
                setCountdown(remaining)
            }
        }, 1000)
        countdownTickRef.current = intervalId
    }
    const statusLabel = isCountingDown ? t.countdownLabel : isRecording ? t.recordingLabel : isRecorded ? t.recordedLabel : t.readyLabel
    const hintText = isCountingDown ? t.hintCountdown : isRecording ? t.hintRecording : isRecorded ? t.hintRecorded : t.hintIdle
    const busy = submitted || submitting
    // The listen-back player below gets a definite width: the middle of the bar sizes to its
    // content, and the player's seek track has no width of its own, so "w-full" left it a dot.
    const timeColor = nearLimit
        ? 'text-amber-600 dark:text-amber-400'
        : isRecording
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-gray-900 dark:text-gray-50'

    return (
        <div className="relative max-lg:sticky max-lg:bottom-2 max-lg:z-10">
            {/* Outside the bar on purpose: the card is position:fixed (top of the screen),
                and the bar's backdrop blur would make it position inside the bar instead. */}
            {!busy && !isRecorded && !isRecording && <MicPermissionHelp t={t} failed={!!rec.error} onActiveChange={onMicHelpActiveChange} />}
            {/* Mic unavailable: floats above the bar, so the bar keeps its height. */}
            {rec.error && !isRecorded && !busy && (
                <div className="absolute bottom-full left-1/2 z-20 mb-4 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border-2 border-gray-900/10 bg-white p-4 text-center text-sm font-semibold text-gray-600 shadow-xl dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300">
                    {t.micUnavailable}
                    <button
                        onClick={() => rec.simulate(38)}
                        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-gray-900/10 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/10"
                    >
                        {t.continueNoMic}
                    </button>
                </div>
            )}
            <section className="grid min-h-[7.5rem] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 rounded-3xl border border-gray-900/5 bg-white/95 px-5 py-4 shadow-[0_-6px_28px_rgba(0,0,0,0.12)] backdrop-blur transition-colors duration-300 dark:border-gray-100/10 dark:bg-gray-900/95 sm:px-6 lg:grid-cols-[1fr_auto_1fr]">
                {submitted ? (
                    <div className="col-span-full flex items-center justify-center gap-4 text-left">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
                            <Hourglass size={26} className="animate-pulse" />
                        </span>
                        <div>
                            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                                {t.pendingTitle}
                            </span>
                            <p className="mt-1.5 max-w-xl text-sm font-medium text-gray-600 dark:text-gray-400">{t.pendingDesc}</p>
                        </div>
                    </div>
                ) : submitting ? (
                    // In-flight upload, between tapping Submit and it actually
                    // finishing — see assessmentSessionStrings.ts's
                    // sendingTitle/sendingDesc header comment for why this got its
                    // own state instead of just a dimmed button label.
                    <div className="col-span-full flex items-center justify-center gap-4 text-left">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-600 dark:bg-teal-400/15 dark:text-teal-300">
                            <Loader2 size={26} className="animate-spin" />
                        </span>
                        <div>
                            <span className="rounded-full bg-teal-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                                {t.sendingTitle}
                            </span>
                            <p className="mt-1.5 max-w-xl text-sm font-medium text-gray-600 dark:text-gray-400">{t.sendingDesc}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="min-w-0">
                            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{statusLabel}</div>
                            <div className={`font-mono text-[2.1rem] font-extrabold leading-none ${timeColor}`}>
                                {formatSeconds(rec.seconds)}
                                {isRecording && (
                                    <span className="ml-1 text-base font-bold text-gray-400 dark:text-gray-500">
                                        / {formatSeconds(MAX_RECORDING_SECONDS)}
                                    </span>
                                )}
                            </div>
                            {isRecording && rec.isNoisy ? (
                                <p className="mt-1 flex items-start gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                                    <TriangleAlert size={14} className="mt-px shrink-0" />
                                    {t.noisyEnvironmentWarning}
                                </p>
                            ) : (
                                <p className="mt-1 max-w-[30ch] text-[0.8125rem] font-semibold leading-snug text-gray-600 dark:text-gray-400">
                                    {!isRecording && !isRecorded && !isCountingDown ? t.timeLimitNote(Math.round(MAX_RECORDING_SECONDS / 60)) : hintText}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            {!isRecorded ? (
                                <>
                                    {/* Mirrored: the left strip runs right to left, so the loudest bars sit next to the mic on both sides. */}
                                    <Waveform active={isRecording} levels={rec.levels} compact bars={18} className="w-[clamp(5rem,13vw,13rem)] flex-row-reverse max-lg:hidden" />
                                    <div className="relative -mt-5">
                                        <button
                                            onClick={handleMicClick}
                                            aria-label={isCountingDown ? t.hintCountdown : isRecording ? t.hintRecording : t.hintIdle}
                                            className={`flex h-[4.75rem] w-[4.75rem] cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-100 active:translate-y-1 ${
                                                isRecording
                                                    ? 'bg-rose-600 shadow-[0_8px_0_0_#9f1239] active:shadow-[0_3px_0_0_#9f1239]'
                                                    : 'bg-teal-500 shadow-[0_8px_0_0_#0f766e] active:shadow-[0_3px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_8px_0_0_#115e59]'
                                            }`}
                                        >
                                            {isCountingDown ? (
                                                <span key={countdown} className="animate-pulse font-mono text-4xl font-extrabold leading-none">
                                                    {countdown}
                                                </span>
                                            ) : isRecording ? (
                                                <span className="h-7 w-7 rounded-lg bg-white" />
                                            ) : (
                                                <Mic size={34} />
                                            )}
                                        </button>
                                        <Hint id="assessment-mic-button" text={t.micHint} show={!isRecording && !isCountingDown && !hintsBlocked} placement="top" align="center" autoHideMs={6000} />
                                    </div>
                                    <Waveform active={isRecording} levels={rec.levels} compact bars={18} className="w-[clamp(5rem,13vw,13rem)] max-lg:hidden" />
                                </>
                            ) : rec.audioUrl ? (
                                <AudioPlayer src={rec.audioUrl} className="w-[clamp(20rem,30vw,32rem)]" />
                            ) : (
                                <div className="rounded-full bg-gray-900/5 px-4 py-1.5 text-sm font-bold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                    {t.simulatedTake}
                                </div>
                            )}
                        </div>
                        <div className="col-span-full flex w-full justify-end gap-3 lg:col-span-1">
                            {isRecorded && (
                                <div className="relative flex-1 lg:flex-none">
                                    <button
                                        onClick={rec.reset}
                                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-gray-900/10 px-5 py-3 text-base font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/10"
                                    >
                                        <RotateCcw size={17} />
                                        {t.redoLabel}
                                    </button>
                                </div>
                            )}
                            <div className="relative flex-[2] lg:flex-none">
                                <button
                                    onClick={onSubmit}
                                    disabled={!isRecorded}
                                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                                >
                                    <Send size={17} />
                                    {t.submitLabel}
                                </button>
                                {/* Only the Submit hint: next to it, a Redo hint would overlap it in the bar. */}
                                <Hint id="assessment-submit-button" text={t.submitHint} show={isRecorded && !hintsBlocked} placement="top" align="end" autoHideMs={6000} />
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    )
}
