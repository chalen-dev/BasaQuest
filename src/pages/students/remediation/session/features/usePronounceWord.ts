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
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../../../../lib/supabaseClient'
import { USE_PLACEHOLDER_PRONUNCIATION } from '../../../../../../devFlags'
import type { RemediationPassage } from '../../hooks.ts'

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

// URL LOOKUP + PRELOAD. Cached clips live at a path we can compute ourselves
// (same rules as the edge function: a slug for a word, a SHA-256 of the
// whitespace-normalized text for a passage), so the app first checks that public
// file directly and only calls the edge function when it is missing -- no cold
// start or storage lookup on a repeat play. The caches are module-level, shared
// by every hook instance (word button and passage button), and `prefetchAudio`
// fills them and warms the browser's own HTTP cache ahead of the tap.
const BUCKET = 'pronunciation-audio'
const urlCache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()
// Kept referenced so the browser does not drop a preloaded clip before it is played.
const warmed = new Map<string, HTMLAudioElement>()

function slugifyWord(word: string): string {
    return word
        .toLowerCase()
        .replace(/[^\p{L}\p{N}']/gu, '')
        .replace(/'/g, '')
}

async function sha256Hex(text: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim()

const cacheKeyFor = (text: string, language: PronounceLanguage, whole: boolean) =>
    `${language}:${whole ? `text:${normalizeText(text)}` : slugifyWord(text)}`

function peekAudioUrl(text: string, language: PronounceLanguage, whole: boolean): string | undefined {
    return urlCache.get(cacheKeyFor(text, language, whole))
}

function resolveAudioUrl(text: string, language: PronounceLanguage, whole: boolean): Promise<string> {
    const key = cacheKeyFor(text, language, whole)
    const known = urlCache.get(key)
    if (known) return Promise.resolve(known)
    const pending = inflight.get(key)
    if (pending) return pending

    const request = (async () => {
        const spoken = whole ? normalizeText(text) : text
        try {
            const name = whole ? `passage-${await sha256Hex(spoken)}` : slugifyWord(spoken)
            const direct = supabase.storage.from(BUCKET).getPublicUrl(`${language}/${name}.mp3`).data.publicUrl
            if ((await fetch(direct, { method: 'HEAD' })).ok) return direct
        } catch {
            // No crypto.subtle, offline or CORS: the edge function path below covers it.
        }
        const { data, error } = await supabase.functions.invoke<{ url: string }>('pronounce-word', {
            body: whole ? { text: spoken, language } : { word: spoken, language },
        })
        if (error || !data?.url) throw error ?? new Error('Malformed response')
        return data.url
    })()
        .then((url) => {
            urlCache.set(key, url)
            return url
        })
        .finally(() => inflight.delete(key))
    inflight.set(key, request)
    return request
}

// Fire-and-forget: resolve (generating the clip on the server if it is new) and
// start downloading it, so a later tap plays at once. Never throws or sets state.
export function prefetchAudio(text: string, language: PronounceLanguage, whole = false) {
    if (USE_PLACEHOLDER_PRONUNCIATION || !text.trim() || (!whole && !slugifyWord(text))) return
    resolveAudioUrl(text.trim(), language, whole)
        .then((url) => {
            if (warmed.has(url)) return
            const audio = new Audio()
            audio.preload = 'auto'
            audio.src = url
            warmed.set(url, audio)
        })
        .catch(() => {})
}

// Called when a teacher saves a passage set: makes the server generate and store
// every passage's audio and its target words' audio now, so the pupil never waits
// on Azure for them. One at a time, so a big set does not fire dozens of requests
// at once; clips that already exist cost nothing (only the existence check runs).
// Fire-and-forget, never throws; a failure just means that clip is made on first play.
export async function pregenerateAudio(passages: RemediationPassage[], language: PronounceLanguage) {
    if (USE_PLACEHOLDER_PRONUNCIATION) return
    const seenWords = new Set<string>()
    for (const passage of passages) {
        await resolveAudioUrl(passage.passageWords.join(' '), language, true).catch(() => {})
        for (const index of passage.targetIndices) {
            const word = (passage.passageWords[index] ?? '').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
            const key = slugifyWord(word)
            if (!key || seenWords.has(key)) continue
            seenWords.add(key)
            await resolveAudioUrl(word, language, false).catch(() => {})
        }
    }
}

export function usePronounceWord() {
    const [isLoading, setIsLoading] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Silences whatever is playing (a passage read-aloud toggled off, or a page turn).
    const stop = useCallback(() => {
        audioRef.current?.pause()
        setIsPlaying(false)
    }, [])

    // Stop on unmount so a passage does not keep reading after leaving the page.
    useEffect(() => () => audioRef.current?.pause(), [])

    // `whole` speaks the text as written (a passage) instead of one word.
    const speak = useCallback(async (word: string, language: PronounceLanguage, whole = false) => {
        const trimmed = word.trim()
        if (!trimmed) return
        setError(null)

        if (USE_PLACEHOLDER_PRONUNCIATION) {
            setIsPlaying(true)
            playPlaceholderBeep(() => setIsPlaying(false))
            return
        }

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

        const readyUrl = peekAudioUrl(trimmed, language, whole)
        if (readyUrl) {
            playUrl(readyUrl)
            return
        }

        setIsLoading(true)
        try {
            playUrl(await resolveAudioUrl(trimmed, language, whole))
        } catch (err) {
            console.error('usePronounceWord: failed to get pronunciation audio', err)
            setError('Could not load the pronunciation audio. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    return { speak, stop, prefetch: prefetchAudio, isLoading, isPlaying, error }
}