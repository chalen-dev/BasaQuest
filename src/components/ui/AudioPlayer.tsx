// File: AudioPlayer.tsx
// File: src/components/ui/AudioPlayer.tsx
// Custom-styled replacement for a native <audio controls> element. Used
// in two places: PassageCard.tsx (teacher review of a submitted attempt's
// recording) and RecorderPanel.tsx (the pupil's own listen-back before
// submitting) — the native control was reported as too small/fiddly to
// tap reliably and visually inconsistent with the rest of the app in
// both spots, so this lives in components/ui/ rather than either
// feature's own folder.
//
// Deliberately built on a plain <audio> element with no `controls`
// attribute (so the browser draws nothing) plus a hand-rolled UI on top,
// rather than a library — this only needs play/pause, a scrub bar, and a
// time readout, which is a small enough surface to own directly and skin
// exactly like the rest of the app (teal shadow-button language from
// RecorderPanel.tsx's mic button, teal fill from Waveform.tsx's active
// bars).
//
// Scrubbing: the track is a plain div (not an <input type="range">) so it
// can be styled freely — a filled teal bar over a neutral track, same
// visual idea as the pagination dots/segments used elsewhere in the
// review UI. Both click-to-seek and drag-to-scrub are supported via
// pointer events on the track; pointer capture keeps the drag tracking
// even if the cursor slips outside the track's bounds mid-drag.
//
// durationSeconds falls back to 0 until the browser has loaded enough
// metadata to know it (loadedmetadata event) — some browsers report
// Infinity for a streamed/chunked source before that fires, so Infinity
// is treated the same as "unknown" and displayed as 0:00 rather than a
// broken-looking time.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

type AudioPlayerProps = {
    src: string
    className?: string
}

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AudioPlayer({ src, className }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isDragging, setIsDragging] = useState(false)

    // New recording loaded — reset playback UI so an old attempt's
    // scrub position/time doesn't linger onto a newly-opened one.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsPlaying(false)
        setCurrentTime(0)
        setDuration(0)
        // eslint-disable-next-line react-hooks/set-state-in-effect
    }, [src])

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const onLoadedMetadata = () => {
            setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
        }
        const onTimeUpdate = () => {
            if (!isDragging) setCurrentTime(audio.currentTime)
        }
        const onEnded = () => {
            setIsPlaying(false)
            setCurrentTime(audio.duration)
        }
        const onPlay = () => setIsPlaying(true)
        const onPause = () => setIsPlaying(false)

        audio.addEventListener('loadedmetadata', onLoadedMetadata)
        audio.addEventListener('timeupdate', onTimeUpdate)
        audio.addEventListener('ended', onEnded)
        audio.addEventListener('play', onPlay)
        audio.addEventListener('pause', onPause)
        return () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata)
            audio.removeEventListener('timeupdate', onTimeUpdate)
            audio.removeEventListener('ended', onEnded)
            audio.removeEventListener('play', onPlay)
            audio.removeEventListener('pause', onPause)
        }
    }, [isDragging])

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return
        if (audio.paused) {
            audio.play().catch(() => {})
        } else {
            audio.pause()
        }
    }

    const seekToClientX = useCallback((clientX: number) => {
        const track = trackRef.current
        const audio = audioRef.current
        if (!track || !audio || duration <= 0) return
        const rect = track.getBoundingClientRect()
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
        const next = ratio * duration
        setCurrentTime(next)
        audio.currentTime = next
    }, [duration])

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (duration <= 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        setIsDragging(true)
        seekToClientX(e.clientX)
    }
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return
        seekToClientX(e.clientX)
    }
    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return
        e.currentTarget.releasePointerCapture(e.pointerId)
        setIsDragging(false)
    }

    const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

    return (
        <div className={`flex items-center gap-3 ${className ?? ''}`}>
            <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
            <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-teal-500 text-white shadow-[0_3px_0_0_#0f766e] transition-transform duration-100 active:translate-y-0.5 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_3px_0_0_#115e59]"
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

            <div
                ref={trackRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="group relative h-2.5 flex-1 cursor-pointer touch-none rounded-full bg-gray-900/10 dark:bg-gray-100/10"
            >
                <div
                    className="h-full rounded-full bg-teal-500 dark:bg-teal-400"
                    style={{ width: `${progressPct}%` }}
                />
                <div
                    className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-teal-600 shadow ring-2 ring-white transition-transform duration-100 group-hover:scale-110 dark:bg-teal-300 dark:ring-gray-900"
                    style={{ left: `calc(${progressPct}% - 8px)` }}
                />
            </div>

            <span className="w-20 shrink-0 text-right font-mono text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>
        </div>
    )
}