// File: src/pages/proficiency/pre_assessment/assessment_session/features/useRecorder.ts
// Real browser audio capture for the reading check-in's recording step —
// captures the pupil's voice via getUserMedia + MediaRecorder. Exposes
// live signals from a Web Audio AnalyserNode, all updated every animation
// frame while recording:
//   - `level`: a single 0-1 loudness scalar (mean of the displayed bars)
//   - `levels`: a WAVEFORM_BARS-length array of 0-1 magnitudes, one per
//     bar, so a waveform UI can show each bar reacting independently
//   - `isNoisy`: true when the recent ambient floor (see below) suggests
//     the room itself is noisy, not just that the pupil is reading loudly
// Produces a playable Blob URL so the take can be listened back to
// before it's submitted. Also exposes the underlying `blob` directly —
// the submit flow (see hooks.ts's useSubmitAttempt, once built) needs
// the actual bytes to upload to Supabase Storage; re-fetching them from
// the object URL would work but is wasteful when we already have the
// Blob in hand the moment MediaRecorder produces it.
//
// FREQUENCY MAPPING: log-scaled across roughly the human-voice range
// (~60Hz-8kHz), not linear across the whole 0Hz-Nyquist span — a linear
// spread left most higher-index bars sampling frequency bins speech
// barely excites, so the back half of the waveform stayed visually flat
// no matter how loud someone spoke. Bin edges are precomputed once per
// start() call (they only depend on the AudioContext's sample rate).
//
// SNAPPINESS: analyser.smoothingTimeConstant is set to 0 (no built-in
// smoothing at all) — instead each bar gets its own attack/release
// envelope computed by hand in the render loop: an *instant* jump up the
// moment a bar gets louder (so it actually feels snappy on strong sounds)
// and a short, gentle glide back down when it gets quieter (so it doesn't
// flicker to 0 between syllables). This is standard VU-meter ballistics.
// A version relying only on the analyser's own smoothingTimeConstant
// couldn't be fast in both directions at once — turning it down enough to
// feel snappy on attack also made the decay jittery.
//
// NOISE DETECTION: a lightweight heuristic, not real audio analysis.
// Every frame we compute a bar-less raw average magnitude (0-1, linear,
// no perceptual gamma) and drop it into a rolling ~1.2s time-windowed
// buffer. Normal speech has gaps between words/syllables that dip back
// down to the true room noise floor, so the MINIMUM value inside that
// window is a decent proxy for "how loud is it here when nobody's
// actively making a strong sound." If that floor stays above
// NOISE_ON_THRESHOLD for the whole window, we flag isNoisy; it clears
// once the floor drops back under the (lower) NOISE_OFF_THRESHOLD — the
// gap between the two thresholds (hysteresis) stops it flapping on/off
// every frame near the boundary. Purely a UI nudge — recording is not
// paused or blocked by this.
//
// start() takes an optional `maxSeconds` — when set, recording auto-stops
// (same end state as pressing stop manually) once that many seconds are
// reached, so a forgotten-running mic can't produce an unbounded take.
//
// PREPARE / BEGIN SPLIT: start() is just prepare() followed immediately by
// begin() — most callers (RecordSession.tsx) just want one-shot start-on-
// click and can keep using it as-is. RecorderPanel.tsx's mic-countdown
// needs the two halves separated: prepare() does the slow async part
// (getUserMedia, MediaRecorder + AudioContext/analyser setup) WITHOUT
// actually starting capture, so it can run in the background for the
// entire 3-2-1 countdown; begin() is synchronous and does only the fast
// part (mediaRecorder.start(), the waveform loop, the seconds tick) once
// the countdown visually reaches 0. That's what makes recording start the
// instant the countdown ends instead of only THEN requesting the mic and
// making the pupil wait out getUserMedia's latency after the countdown
// already said "go". cancelPrepare() releases a stream prepare() already
// acquired if the countdown gets canceled before begin() is ever called.
//
// Falls back to an 'unsupported' status if mic permission is denied or the
// browser doesn't support the APIs — the calling screen lets the pupil
// continue via a simulated take instead (see `simulate`). Ported from the
// basaquest prototype's src/lib/useRecorder.js, typed for this project,
// then extended with the real per-bar spectrum, the max-duration cap, the
// attack/release envelope, and ambient noise detection.
//
// Nothing here uploads or scores the recording on its own — that's the
// submit flow's job (see AssessmentSession.tsx's handleSubmit once it's
// wired up). This hook only captures + previews + hands back the Blob.
import { useCallback, useEffect, useRef, useState } from 'react'
export type RecorderStatus = 'idle' | 'recording' | 'recorded' | 'unsupported'
export const WAVEFORM_BARS = 36
// Log-scale frequency window the bars are mapped across. Below ~60Hz is
// mostly handling noise/rumble, above ~8kHz is mostly sibilance/hiss —
// neither carries much of what makes a voice waveform look "alive", so
// keeping the whole bar range inside this window means every bar actually
// moves with speech instead of a chunk of them sitting near silent.
const WAVEFORM_MIN_HZ = 60
const WAVEFORM_MAX_HZ = 8000
// Perceptual curve applied to each bar's normalized (0-1) magnitude before
// display. <1 lifts up quieter/moderate signal so normal talking volume
// doesn't look flat; 1 would be a straight linear mapping.
const WAVEFORM_GAMMA = 0.55
// Envelope ballistics: attack is instant (see loop below — target is
// applied directly when rising), RELEASE_FACTOR controls how much of the
// remaining gap to a lower target is closed per frame on the way down.
// Higher = snaps down faster; lower = smoother/slower decay.
const WAVEFORM_RELEASE_FACTOR = 0.35
// Rolling window (ms) used to estimate the ambient noise floor, and the
// two hysteresis thresholds (linear 0-1, pre-gamma) that flip isNoisy on
// and off. These are placeholder heuristics, not calibrated against real
// classroom recordings — tune them once you've tested against an actual
// noisy room vs. a quiet one.
const NOISE_WINDOW_MS = 1200
const NOISE_WARMUP_MS = 400
const NOISE_ON_THRESHOLD = 0.16
const NOISE_OFF_THRESHOLD = 0.1
export function useRecorder() {
    const [status, setStatus] = useState<RecorderStatus>('idle')
    const [seconds, setSeconds] = useState(0)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [blob, setBlob] = useState<Blob | null>(null)
    const [level, setLevel] = useState(0)
    const [levels, setLevels] = useState<number[]>(() => new Array(WAVEFORM_BARS).fill(0))
    const [isNoisy, setIsNoisy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const mediaRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const streamRef = useRef<MediaStream | null>(null)
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const rafRef = useRef<number | null>(null)
    const audioCtxRef = useRef<AudioContext | null>(null)
    // Set by prepare() once the analyser is wired up, called by begin() —
    // see the PREPARE / BEGIN SPLIT header comment above.
    const loopRef = useRef<(() => void) | null>(null)
    // Bumped by cancelPrepare() (and by prepare() itself, on entry) so an
    // in-flight prepare() can tell, once its own getUserMedia await
    // resolves, whether it's still the one anyone wants. Without this, a
    // prepare() that's still waiting on getUserMedia when cancelPrepare()
    // runs would land its stream/MediaRecorder into mediaRef/loopRef
    // AFTER cancelPrepare already cleared them — silently resurrecting a
    // live mic stream nobody asked for anymore.
    const prepareGenRef = useRef(0)
    const displayedBarsRef = useRef<number[]>(new Array(WAVEFORM_BARS).fill(0))
    const noiseBufRef = useRef<{ t: number; v: number }[]>([])
    const cleanupAudio = useCallback(() => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
        if (tickRef.current != null) clearInterval(tickRef.current)
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch(() => {})
        }
        audioCtxRef.current = null
    }, [])
    useEffect(() => {
        return () => {
            cleanupAudio()
            if (audioUrl) URL.revokeObjectURL(audioUrl)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    // Does everything up to (but not including) actually starting capture —
    // see the PREPARE / BEGIN SPLIT header comment. Returns whether it
    // succeeded; on failure, status/error are already set to the
    // 'unsupported' fallback exactly as start() always did.
    const prepare = useCallback(async (): Promise<boolean> => {
        const myGen = ++prepareGenRef.current
        setError(null)
        setIsNoisy(false)
        noiseBufRef.current = []
        displayedBarsRef.current = new Array(WAVEFORM_BARS).fill(0)
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl)
            setAudioUrl(null)
        }
        setBlob(null)
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setStatus('unsupported')
            setError('Hindi available ang mikropono sa browser na ito.')
            return false
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            if (myGen !== prepareGenRef.current) {
                // Superseded (cancelPrepare(), or a newer prepare()) while
                // this call was waiting on getUserMedia — release this
                // stream instead of handing it to state nobody asked for
                // anymore. See prepareGenRef's own comment above.
                stream.getTracks().forEach((t) => t.stop())
                return false
            }
            streamRef.current = stream
            chunksRef.current = []
            const mr = new MediaRecorder(stream)
            mediaRef.current = mr
            mr.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }
            mr.onstop = () => {
                const recordedBlob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
                setBlob(recordedBlob)
                setAudioUrl(URL.createObjectURL(recordedBlob))
                cleanupAudio()
                setLevel(0)
                setLevels(new Array(WAVEFORM_BARS).fill(0))
                setIsNoisy(false)
            }
            // NOT mr.start() here — that's begin()'s job, deliberately, so
            // it can fire the instant the countdown hits 0 instead of only
            // then kicking off this whole async setup.
            const AudioCtxCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            const ctx = new AudioCtxCtor()
            audioCtxRef.current = ctx
            const src = ctx.createMediaStreamSource(stream)
            const analyser = ctx.createAnalyser()
            // Larger fftSize than the original (256 -> 1024) gives finer
            // frequency bins, which matters now that bars are mapped onto a
            // narrow log-scaled window instead of the whole spectrum.
            analyser.fftSize = 1024
            // No built-in smoothing at all — we do our own attack/release
            // envelope per bar below, since a single smoothingTimeConstant
            // can't be fast on attack and smooth on release at the same time.
            analyser.smoothingTimeConstant = 0
            // Narrower dB window than the default (-100..-30) tuned closer
            // to typical laptop/phone mic input, so ordinary speaking
            // volume actually reaches the upper part of the 0-255 byte
            // range instead of sitting near the bottom.
            analyser.minDecibels = -85
            analyser.maxDecibels = -25
            src.connect(analyser)
            const freqData = new Uint8Array(analyser.frequencyBinCount)
            const nyquist = ctx.sampleRate / 2
            // Precompute log-scaled bin edges across the voice window, once
            // per recording session (sample rate doesn't change mid-take).
            const binEdges: number[] = []
            for (let i = 0; i <= WAVEFORM_BARS; i++) {
                const t = i / WAVEFORM_BARS
                const freq = WAVEFORM_MIN_HZ * Math.pow(WAVEFORM_MAX_HZ / WAVEFORM_MIN_HZ, t)
                const bin = Math.min(
                    analyser.frequencyBinCount - 1,
                    Math.max(0, Math.round((freq / nyquist) * analyser.frequencyBinCount)),
                )
                binEdges.push(bin)
            }
            const loop = () => {
                analyser.getByteFrequencyData(freqData)
                const displayed = displayedBarsRef.current
                let rawSum = 0
                for (let i = 0; i < WAVEFORM_BARS; i++) {
                    const rangeStart = binEdges[i]
                    const rangeEnd = Math.max(rangeStart + 1, binEdges[i + 1])
                    let sum = 0
                    for (let bin = rangeStart; bin < rangeEnd; bin++) {
                        sum += freqData[bin] ?? 0
                    }
                    const raw = sum / (rangeEnd - rangeStart) / 255
                    rawSum += raw
                    const target = Math.min(1, Math.pow(raw, WAVEFORM_GAMMA))
                    // Instant attack (jump straight to target when rising),
                    // eased release (glide toward target when falling).
                    displayed[i] = target >= displayed[i] ? target : displayed[i] + (target - displayed[i]) * WAVEFORM_RELEASE_FACTOR
                }
                setLevels([...displayed])
                setLevel(Math.min(1, displayed.reduce((a, b) => a + b, 0) / displayed.length))
                // Ambient noise floor tracking — see header comment.
                const rawAvg = rawSum / WAVEFORM_BARS
                const now = performance.now()
                const buf = noiseBufRef.current
                buf.push({ t: now, v: rawAvg })
                while (buf.length && now - buf[0].t > NOISE_WINDOW_MS) buf.shift()
                if (buf.length && now - buf[0].t >= NOISE_WARMUP_MS) {
                    let floor = 1
                    for (const entry of buf) floor = Math.min(floor, entry.v)
                    setIsNoisy((prev) => {
                        if (!prev && floor > NOISE_ON_THRESHOLD) return true
                        if (prev && floor < NOISE_OFF_THRESHOLD) return false
                        return prev
                    })
                }
                rafRef.current = requestAnimationFrame(loop)
            }
            // Stored, not called — begin() calls it once capture actually
            // starts, so the waveform doesn't animate during the countdown.
            loopRef.current = loop
            return true
        } catch (err) {
            // Same supersession check as above — don't let a stale, since-
            // canceled prepare() stomp status/error a newer call already
            // set once getUserMedia's rejection finally comes back.
            if (myGen !== prepareGenRef.current) return false
            setStatus('unsupported')
            const name = err instanceof DOMException ? err.name : undefined
            setError(
                name === 'NotAllowedError'
                    ? 'Hindi pinayagan ang paggamit ng mikropono.'
                    : 'Hindi ma-access ang mikropono.',
            )
            return false
        }
    }, [audioUrl, cleanupAudio])
    // The fast, synchronous half — assumes prepare() already succeeded
    // (mediaRef.current set). No-ops if it wasn't, e.g. prepare() failed or
    // cancelPrepare() already released it.
    const begin = useCallback((maxSeconds?: number) => {
        if (!mediaRef.current) return
        mediaRef.current.start()
        loopRef.current?.()
        setSeconds(0)
        // Defensive: clear any tick interval already in flight before
        // arming a new one, in case begin() is ever re-entered before
        // status has flipped away from a previous take (e.g. a
        // double-fired click on a touch device).
        if (tickRef.current != null) clearInterval(tickRef.current)
        // Captured by value so the max-duration branch below clears THIS
        // interval specifically, not whatever interval tickRef happens to
        // point at by the time it fires. Clearing via tickRef.current
        // there was a real bug: if two of these intervals were ever alive
        // at once, tickRef only ever pointed at the newer one, so the
        // OLDER interval's completion cleared the NEWER one by mistake and
        // never stopped itself — it kept incrementing `seconds` forever,
        // well past the DONE state.
        const tickId: ReturnType<typeof setInterval> = setInterval(() => {
            setSeconds((s) => {
                const next = s + 1
                if (maxSeconds != null && next >= maxSeconds) {
                    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
                        mediaRef.current.stop()
                    }
                    clearInterval(tickId)
                    if (tickRef.current === tickId) tickRef.current = null
                    setStatus('recorded')
                }
                return next
            })
        }, 1000)
        tickRef.current = tickId
        setStatus('recording')
    }, [])
    // Releases a stream/AudioContext prepare() already acquired when
    // begin() is never going to be called for it — e.g. the pupil canceled
    // the countdown before it finished. Safe to call even if prepare()
    // hasn't resolved yet: bumping prepareGenRef makes that in-flight call
    // recognize itself as superseded and release whatever stream it gets
    // handed back instead of resurrecting it into mediaRef (see
    // prepareGenRef's own comment) — cleanupAudio() below only needs to
    // clean up whatever, if anything, had already landed by this point.
    const cancelPrepare = useCallback(() => {
        prepareGenRef.current++
        mediaRef.current = null
        loopRef.current = null
        cleanupAudio()
    }, [cleanupAudio])
    // One-shot convenience for callers that don't need the countdown gap
    // closed (RecordSession.tsx) — identical to the old single start().
    const start = useCallback(async (maxSeconds?: number) => {
        const ok = await prepare()
        if (ok) begin(maxSeconds)
    }, [prepare, begin])
    const stop = useCallback(() => {
        if (mediaRef.current && mediaRef.current.state !== 'inactive') {
            mediaRef.current.stop()
        }
        if (tickRef.current != null) clearInterval(tickRef.current)
        setStatus('recorded')
    }, [])
    const reset = useCallback(() => {
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
        setBlob(null)
        setSeconds(0)
        setStatus('idle')
        setError(null)
        setLevels(new Array(WAVEFORM_BARS).fill(0))
        setIsNoisy(false)
        noiseBufRef.current = []
        displayedBarsRef.current = new Array(WAVEFORM_BARS).fill(0)
    }, [audioUrl])
    const simulate = useCallback((secs = 38) => {
        setSeconds(secs)
        setStatus('recorded')
        setAudioUrl(null)
        setBlob(null)
    }, [])
    return { status, seconds, audioUrl, blob, level, levels, isNoisy, error, start, prepare, begin, cancelPrepare, stop, reset, simulate }
}