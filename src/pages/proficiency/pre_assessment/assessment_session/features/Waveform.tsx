// File: src/pages/proficiency/pre_assessment/features/Waveform.tsx
// Animated bar waveform for the recorder panel. When `active`, each bar's
// height is driven independently by `levels[i]` — real per-frequency-bucket
// magnitude from useRecorder's AnalyserNode (see getByteFrequencyData in
// useRecorder.ts) — so the shape genuinely reflects what's coming through
// the mic instead of every bar scaling off one shared number. When idle,
// bars settle into a static, gently-shaped resting state.
import { WAVEFORM_BARS } from './useRecorder.ts'

type WaveformProps = {
    active: boolean
    levels?: number[]
}

export function Waveform({ active, levels }: WaveformProps) {
    return (
        <div className="flex h-20 w-full items-center justify-center gap-1">
            {Array.from({ length: WAVEFORM_BARS }).map((_, i) => {
                const shape = 0.2 + Math.abs(Math.sin(i * 0.7)) * 0.8
                const live = levels?.[i] ?? 0
                const h = active ? Math.max(0.08, Math.min(1, live)) : shape * 0.55
                return (
                    <span
                        key={i}
                        className={`block w-1.5 rounded-full transition-[height] duration-75 ${
                            active ? 'bg-rose-500' : 'bg-gray-900/15 dark:bg-gray-100/15'
                        }`}
                        style={{ height: `${h * 100}%` }}
                    />
                )
            })}
        </div>
    )
}