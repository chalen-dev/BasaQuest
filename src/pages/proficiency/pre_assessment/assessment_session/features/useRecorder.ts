// File: src/pages/proficiency/pre_assessment/assessment_session/features/useRecorder.ts
// Real browser audio capture for the reading check-in's recording step —
// captures the pupil's voice via getUserMedia + MediaRecorder. Exposes
// TWO live signals from a Web Audio AnalyserNode, both updated every
// animation frame while recording:
//   - `level`: a single 0-1 RMS loudness scalar (kept for anything that
//     just wants "how loud right now")
//   - `levels`: a WAVEFORM_BARS-length array of 0-1 magnitudes, one per
//     frequency bucket (getByteFrequencyData downsampled), so a waveform
//     UI can show each bar reacting independently to the real spectrum
//     instead of every bar just scaling off one shared number.
// Produces a playable Blob URL so the take can be listened back to
// before it's submitted.
//
// start() takes an optional `maxSeconds` — when set, recording auto-stops
// (same end state as pressing stop manually) once that many seconds are
// reached, so a forgotten-running mic can't produce an unbounded take.
//
// Falls back to an 'unsupported' status if mic permission is denied or the
// browser doesn't support the APIs — the calling screen lets the pupil
// continue via a simulated take instead (see `simulate`). Ported from the
// basaquest prototype's src/lib/useRecorder.js, typed for this project,
// then extended with the real per-bar spectrum + the max-duration cap.
//
// Nothing here uploads or scores the recording — per AssessmentSession.tsx's
// header comment, submission/scoring isn't wired up to a backend yet. This
// hook only captures + previews; "Ipasa sa Guro" just flips local UI state
// for now (see AssessmentSession.tsx's handleSubmit).
import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderStatus = 'idle' | 'recording' | 'recorded' | 'unsupported'

export const WAVEFORM_BARS = 36

export function useRecorder() {
    const [status, setStatus] = useState<RecorderStatus>('idle')
    const [seconds, setSeconds] = useState(0)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [level, setLevel] = useState(0)
    const [levels, setLevels] = useState<number[]>(() => new Array(WAVEFORM_BARS).fill(0))
    const [error, setError] = useState<string | null>(null)

    const mediaRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const streamRef = useRef<MediaStream | null>(null)
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const rafRef = useRef<number | null>(null)
    const audioCtxRef = useRef<AudioContext | null>(null)

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

    const start = useCallback(async (maxSeconds?: number) => {
        setError(null)
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl)
            setAudioUrl(null)
        }
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setStatus('unsupported')
            setError('Hindi available ang mikropono sa browser na ito.')
            return
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream
            chunksRef.current = []

            const mr = new MediaRecorder(stream)
            mediaRef.current = mr
            mr.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }
            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
                setAudioUrl(URL.createObjectURL(blob))
                cleanupAudio()
                setLevel(0)
                setLevels(new Array(WAVEFORM_BARS).fill(0))
            }
            mr.start()

            const AudioCtxCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            const ctx = new AudioCtxCtor()
            audioCtxRef.current = ctx
            const src = ctx.createMediaStreamSource(stream)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 256
            src.connect(analyser)
            const freqData = new Uint8Array(analyser.frequencyBinCount)
            const chunkSize = Math.max(1, Math.floor(freqData.length / WAVEFORM_BARS))
            const loop = () => {
                analyser.getByteFrequencyData(freqData)
                const bars: number[] = []
                for (let i = 0; i < WAVEFORM_BARS; i++) {
                    let sum = 0
                    for (let j = 0; j < chunkSize; j++) {
                        sum += freqData[i * chunkSize + j] ?? 0
                    }
                    bars.push(Math.min(1, sum / chunkSize / 255))
                }
                setLevels(bars)
                setLevel(Math.min(1, (bars.reduce((a, b) => a + b, 0) / bars.length) * 1.6))
                rafRef.current = requestAnimationFrame(loop)
            }
            loop()

            setSeconds(0)
            tickRef.current = setInterval(() => {
                setSeconds((s) => {
                    const next = s + 1
                    if (maxSeconds != null && next >= maxSeconds) {
                        if (mediaRef.current && mediaRef.current.state !== 'inactive') {
                            mediaRef.current.stop()
                        }
                        if (tickRef.current != null) clearInterval(tickRef.current)
                        setStatus('recorded')
                    }
                    return next
                })
            }, 1000)
            setStatus('recording')
        } catch (err) {
            setStatus('unsupported')
            const name = err instanceof DOMException ? err.name : undefined
            setError(
                name === 'NotAllowedError'
                    ? 'Hindi pinayagan ang paggamit ng mikropono.'
                    : 'Hindi ma-access ang mikropono.',
            )
        }
    }, [audioUrl, cleanupAudio])

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
        setSeconds(0)
        setStatus('idle')
        setError(null)
        setLevels(new Array(WAVEFORM_BARS).fill(0))
    }, [audioUrl])

    const simulate = useCallback((secs = 38) => {
        setSeconds(secs)
        setStatus('recorded')
        setAudioUrl(null)
    }, [])

    return { status, seconds, audioUrl, level, levels, error, start, stop, reset, simulate }
}