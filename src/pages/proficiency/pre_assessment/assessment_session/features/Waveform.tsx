// File: src/pages/proficiency/pre_assessment/assessment_session/features/Waveform.tsx
// Animated bar waveform for the recorder panel. When `active`, each bar's
// height is driven independently by `levels[i]` — real per-frequency-bucket
// magnitude from useRecorder's AnalyserNode, already run through an
// attack/release envelope there (see useRecorder.ts) — so the shape
// genuinely reflects what's coming through the mic instead of every bar
// scaling off one shared number. When idle, bars settle into a static,
// gently-shaped resting state.
//
// Deliberately NO CSS transition on height. useRecorder's envelope already
// provides the "snappy jump up, smooth glide down" motion at the data
// level (updated every animation frame); a CSS transition on top of that
// just adds a second, competing layer of lag that dulls the fast attack
// it's trying to give a snappy feel.
import { WAVEFORM_BARS } from './useRecorder.ts'
type WaveformProps = {
    active: boolean
    levels?: number[]
    // `compact`: the slim, shorter strip used either side of the mic in the
    // recorder bar. Shows `bars` bars, each sampled from the full levels array.
    compact?: boolean
    bars?: number
    className?: string
}
export function Waveform({ active, levels, compact = false, bars = WAVEFORM_BARS, className = '' }: WaveformProps) {
    return (
        <div className={`flex w-full items-center justify-center ${compact ? 'h-11 gap-[3px]' : 'h-20 gap-1'} ${className}`}>
            {Array.from({ length: bars }).map((_, i) => {
                const shape = 0.2 + Math.abs(Math.sin(i * 0.7)) * 0.8
                const live = levels?.[Math.floor((i * WAVEFORM_BARS) / bars)] ?? 0
                const h = active ? Math.max(0.08, Math.min(1, live)) : shape * 0.55
                return (
                    <span
                        key={i}
                        className={`block ${compact ? 'w-1' : 'w-1.5'} rounded-full ${active ? 'bg-rose-500' : 'bg-gray-900/15 dark:bg-gray-100/15'}`}
                        style={{ height: `${h * 100}%` }}
                    />
                )
            })}
        </div>
    )
}