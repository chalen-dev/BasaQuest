// File: src/components/ui/AudioPlayer.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, Settings2, Volume2, VolumeX } from 'lucide-react'

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

const MEDIA_ERROR_NAMES: Record<number, string> = {
    1: 'MEDIA_ERR_ABORTED',
    2: 'MEDIA_ERR_NETWORK',
    3: 'MEDIA_ERR_DECODE',
    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const

export function AudioPlayer({ src, className }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const volumeTrackRef = useRef<HTMLDivElement>(null)
    const speedPopoverRef = useRef<HTMLDivElement>(null)
    const volumePopoverRef = useRef<HTMLDivElement>(null)

    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [playbackError, setPlaybackError] = useState<string | null>(null)

    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [isVolumeDragging, setIsVolumeDragging] = useState(false)
    const [showVolumePopover, setShowVolumePopover] = useState(false)
    const [playbackRate, setPlaybackRate] = useState<number>(1)
    const [showSpeedPopover, setShowSpeedPopover] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsPlaying(false)
        setCurrentTime(0)
        setDuration(0)
        setPlaybackError(null)
    }, [src])

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const onLoadedMetadata = () => { setDuration(Number.isFinite(audio.duration) ? audio.duration : 0) }
        const onTimeUpdate = () => { if (!isDragging) setCurrentTime(audio.currentTime) }
        const onEnded = () => { setIsPlaying(false); setCurrentTime(audio.duration) }
        const onPlay = () => setIsPlaying(true)
        const onPause = () => setIsPlaying(false)
        const onError = () => {
            const mediaError = audio.error
            const name = mediaError ? (MEDIA_ERROR_NAMES[mediaError.code] ?? `code ${mediaError.code}`) : 'unknown'
            const message = `${name}${mediaError?.message ? `: ${mediaError.message}` : ''}`
            console.error('AudioPlayer: media error', message)
            setPlaybackError(message)
        }

        if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) onLoadedMetadata()
        if (audio.error) onError()

        audio.addEventListener('loadedmetadata', onLoadedMetadata)
        audio.addEventListener('timeupdate', onTimeUpdate)
        audio.addEventListener('ended', onEnded)
        audio.addEventListener('play', onPlay)
        audio.addEventListener('pause', onPause)
        audio.addEventListener('error', onError)

        return () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata)
            audio.removeEventListener('timeupdate', onTimeUpdate)
            audio.removeEventListener('ended', onEnded)
            audio.removeEventListener('play', onPlay)
            audio.removeEventListener('pause', onPause)
            audio.removeEventListener('error', onError)
        }
    }, [isDragging])

    // Keep the <audio> element's volume/muted/playbackRate in sync with state,
    // and re-apply on src change since the element resets some of these itself.
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        audio.volume = volume
        audio.muted = isMuted
        audio.playbackRate = playbackRate
    }, [volume, isMuted, playbackRate, src])

    // Close either popover on an outside click.
    useEffect(() => {
        if (!showSpeedPopover && !showVolumePopover) return
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node
            if (showSpeedPopover && speedPopoverRef.current && !speedPopoverRef.current.contains(target)) {
                setShowSpeedPopover(false)
            }
            if (showVolumePopover && volumePopoverRef.current && !volumePopoverRef.current.contains(target) && !isVolumeDragging) {
                setShowVolumePopover(false)
            }
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [showSpeedPopover, showVolumePopover, isVolumeDragging])

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return
        if (audio.paused) {
            audio.play().catch((err) => {
                console.error('AudioPlayer: play() rejected', err)
                setPlaybackError(err instanceof Error ? err.message : String(err))
            })
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

    // Vertical volume track: top = full volume, bottom = silent.
    const setVolumeFromClientY = useCallback((clientY: number) => {
        const track = volumeTrackRef.current
        if (!track) return
        const rect = track.getBoundingClientRect()
        const ratio = Math.min(1, Math.max(0, (rect.bottom - clientY) / rect.height))
        setVolume(ratio)
        if (ratio > 0 && isMuted) setIsMuted(false)
        if (ratio === 0) setIsMuted(true)
    }, [isMuted])

    const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setIsVolumeDragging(true)
        setVolumeFromClientY(e.clientY)
    }

    const handleVolumePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isVolumeDragging) return
        setVolumeFromClientY(e.clientY)
    }

    const handleVolumePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isVolumeDragging) return
        e.currentTarget.releasePointerCapture(e.pointerId)
        setIsVolumeDragging(false)
    }

    // Direct mute toggle, used by the icon INSIDE the volume popover.
    // Unmuting while volume was dragged down to exactly 0 restores a sensible
    // audible level instead of unmuting into silence.
    const toggleMute = () => {
        setIsMuted((prev) => {
            const next = !prev
            if (!next && volume === 0) setVolume(1)
            return next
        })
    }

    const selectPlaybackRate = (rate: number) => {
        setPlaybackRate(rate)
        setShowSpeedPopover(false)
    }

    const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
    const effectiveVolumePct = isMuted ? 0 : Math.round(volume * 100)

    return (
        <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
            <div className="flex items-center gap-3">
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
                    <div className="h-full rounded-full bg-teal-500 dark:bg-teal-400" style={{ width: `${progressPct}%` }} />
                    <div
                        className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-teal-600 shadow ring-2 ring-white transition-transform duration-100 group-hover:scale-110 dark:bg-teal-300 dark:ring-gray-900"
                        style={{ left: `calc(${progressPct}% - 8px)` }}
                    />
                </div>

                <span className="w-20 shrink-0 text-right font-mono text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                {/* Playback speed popover */}
                <div ref={speedPopoverRef} className="relative flex shrink-0 items-center">
                    <button
                        type="button"
                        onClick={() => { setShowSpeedPopover((prev) => !prev); setShowVolumePopover(false) }}
                        aria-label="Playback speed"
                        aria-expanded={showSpeedPopover}
                        className="flex h-8 items-center justify-center gap-1 rounded-full border border-gray-900/10 bg-white px-2.5 text-xs font-bold tabular-nums text-gray-700 shadow-sm transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
                    >
                        <Settings2 size={13} />
                        {playbackRate}x
                    </button>

                    {showSpeedPopover && (
                        <div className="absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 flex-col gap-0.5 rounded-xl border border-gray-900/10 bg-white p-1.5 shadow-lg dark:border-gray-100/10 dark:bg-gray-900">
                            {PLAYBACK_RATES.map((rate) => (
                                <button
                                    key={rate}
                                    type="button"
                                    onClick={() => selectPlaybackRate(rate)}
                                    className={`rounded-lg px-3 py-1.5 text-left text-xs font-bold tabular-nums transition-colors duration-150 ${
                                        rate === playbackRate
                                            ? 'bg-teal-500 text-white'
                                            : 'text-gray-700 hover:bg-gray-900/5 dark:text-gray-200 dark:hover:bg-gray-100/10'
                                    }`}
                                >
                                    {rate}x
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Volume popover */}
                <div ref={volumePopoverRef} className="relative flex shrink-0 items-center">
                    <button
                        type="button"
                        onClick={() => { setShowVolumePopover((prev) => !prev); setShowSpeedPopover(false) }}
                        aria-label={showVolumePopover ? 'Close volume control' : 'Open volume control'}
                        aria-expanded={showVolumePopover}
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-600 transition-colors duration-150 hover:bg-gray-900/5 dark:text-gray-300 dark:hover:bg-gray-100/10"
                    >
                        {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                    </button>

                    {showVolumePopover && (
                        <div className="absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 flex-col items-center gap-2 rounded-xl border border-gray-900/10 bg-white p-3 shadow-lg dark:border-gray-100/10 dark:bg-gray-900">
                            {/* This icon is the actual mute toggle — the outer button only opens/closes this popover. */}
                            <button
                                type="button"
                                onClick={toggleMute}
                                aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-600 transition-colors duration-150 hover:bg-gray-900/5 dark:text-gray-300 dark:hover:bg-gray-100/10"
                            >
                                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>

                            <span className="font-mono text-[10px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                                {effectiveVolumePct}%
                            </span>

                            <div
                                ref={volumeTrackRef}
                                onPointerDown={handleVolumePointerDown}
                                onPointerMove={handleVolumePointerMove}
                                onPointerUp={handleVolumePointerUp}
                                className="relative h-24 w-2 cursor-pointer touch-none rounded-full bg-gray-900/10 dark:bg-gray-100/10"
                            >
                                <div
                                    className="absolute bottom-0 w-full rounded-full bg-teal-500 dark:bg-teal-400"
                                    style={{ height: `${effectiveVolumePct}%` }}
                                />
                                <div
                                    className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-teal-600 shadow ring-2 ring-white dark:bg-teal-300 dark:ring-gray-900"
                                    style={{ bottom: `calc(${effectiveVolumePct}% - 7px)` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {playbackError && (
                <p className="pl-1 text-xs font-semibold text-red-600 dark:text-red-400">
                    Playback error: {playbackError}
                </p>
            )}
        </div>
    )
}