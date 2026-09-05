// File: src/pages/students/remediation/session/features/usePronounceWord.ts
//
// Replaces the earlier browser-text-to-speech approach (useSpeakWord,
// now deleted) — that relied on whatever TTS voices happened to be
// installed on the teacher's device/browser, which turned out
// unacceptably inconsistent for a feature whose entire job is teaching
// correct pronunciation. This instead calls the pronounce-word edge
// function, which generates (and permanently caches) real Azure neural
// TTS audio server-side — same voice, same quality, on every device.
//
// DEV PLACEHOLDER (USE_PLACEHOLDER_PRONUNCIATION, root devFlags.ts):
// same idea as USE_PLACEHOLDER_SCORING in useSubmitAttempt.ts — while
// the pronounce-word function isn't deployed yet / doesn't have its
// Azure secrets configured, this skips the edge function call entirely
// and instead plays a short synthesized beep via the Web Audio API
// (a plain oscillator tone, no bundled audio asset needed). That's
// enough to exercise every bit of UI wiring around this hook — the
// button, the disabled/loading state, the isPlaying pulse animation —
// without spending Azure credits or requiring AZURE_SPEECH_KEY/
// AZURE_SPEECH_REGION to exist anywhere yet. Flip the flag off once
// both of those are actually in place.
//
// CLIENT-SIDE URL CACHE: the edge function itself already caches the
// generated audio file in Storage forever, but this hook additionally
// keeps a small in-memory Map of word -> URL for the lifetime of one
// session, so clicking the same word's pronunciation button twice in a
// row (very likely during a drill — hear it, mark practiced, hear it
// again to double check) doesn't even re-invoke the edge function; it
// just replays the URL already fetched once this session. Not used at
// all in placeholder mode, since there's no URL to cache.
//
// PLAYBACK: a fresh HTMLAudioElement per real play() call rather than
// one reused instance — simplest way to guarantee a second click while
// still playing restarts cleanly instead of needing manual seek/pause
// handling. The placeholder beep uses its own short-lived
// AudioContext/OscillatorNode instead, since there's no URL to hand an
// <audio> element.
import { useCallback, useRef, useState } from 'react'
import { supabase } from '../../../../../lib/supabaseClient'
import { USE_PLACEHOLDER_PRONUNCIATION } from '../../../../../../devFlags'

type PronounceLanguage = 'en' | 'fil'

// Short, deliberately simple confirmation tone — two quick notes rather
// than one long beep, so it reads as "here's where the real word audio
// would have played" rather than an error/alert sound.
function playPlaceholderBeep(onDone: () => void) {
    try {
        const AudioCtxCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioCtxCtor()
        const now = ctx.currentTime
        const notes = [
            { freq: 660, start: 0, duration: 0.11 },
            { freq: 880, start: 0.12, duration: 0.14 },
        ]
        for (const note of notes) {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.value = note.freq
            gain.gain.setValueAtTime(0.0001, now + note.start)
            gain.gain.exponentialRampToValueAtTime(0.2, now + note.start + 0.01)
            gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration)
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(now + note.start)
            osc.stop(now + note.start + note.duration + 0.02)
        }
        const totalMs = (notes[notes.length - 1].start + notes[notes.length - 1].duration + 0.05) * 1000
        setTimeout(() => {
            ctx.close().catch(() => {})
            onDone()
        }, totalMs)
    } catch (err) {
        console.error('usePronounceWord: placeholder beep failed', err)
        onDone()
    }
}

export function usePronounceWord() {
    const [isLoading, setIsLoading] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const urlCacheRef = useRef<Map<string, string>>(new Map())
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const speak = useCallback(async (word: string, language: PronounceLanguage) => {
        const trimmed = word.trim()
        if (!trimmed) return
        setError(null)

        if (USE_PLACEHOLDER_PRONUNCIATION) {
            setIsPlaying(true)
            playPlaceholderBeep(() => setIsPlaying(false))
            return
        }

        const cacheKey = `${language}:${trimmed.toLowerCase()}`

        const playUrl = (url: string) => {
            audioRef.current?.pause()
            const audio = new Audio(url)
            audioRef.current = audio
            audio.onplay = () => setIsPlaying(true)
            audio.onended = () => setIsPlaying(false)
            audio.onerror = () => {
                setIsPlaying(false)
                setError('Could not play the pronunciation audio.')
            }
            audio.play().catch(() => {
                setIsPlaying(false)
                setError('Could not play the pronunciation audio.')
            })
        }

        const cachedUrl = urlCacheRef.current.get(cacheKey)
        if (cachedUrl) {
            playUrl(cachedUrl)
            return
        }

        setIsLoading(true)
        try {
            const { data, error: invokeError } = await supabase.functions.invoke<{ url: string }>('pronounce-word', {
                body: { word: trimmed, language },
            })
            if (invokeError || !data?.url) {
                throw invokeError ?? new Error('Malformed response')
            }
            urlCacheRef.current.set(cacheKey, data.url)
            playUrl(data.url)
        } catch (err) {
            console.error('usePronounceWord: failed to get pronunciation audio', err)
            setError('Could not load the pronunciation audio. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    return { speak, isLoading, isPlaying, error }
}