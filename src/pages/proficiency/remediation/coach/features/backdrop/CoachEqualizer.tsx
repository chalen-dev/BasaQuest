// File: src/pages/proficiency/remediation/coach/features/backdrop/CoachEqualizer.tsx
//
// The equalizer drawn above the Previous / Record / Next buttons while the pupil
// reads. Same motion as the assessment's recorder (useRecorder's 36 voice bands,
// instant attack and eased release, mirrored around the middle), in the same rose
// red; only the layout differs.
//
// It lives inside the backdrop's own SVG so it shares the scene's coordinates
// (centred on the microphone button), and it paints by writing straight to the
// bars from the recorder's level feed, so a frame of audio never re-renders React.
import { memo, useEffect, useRef } from 'react'

// Centre of the microphone button, and the band the bars sit in, just above it.
const CENTER_X = 1228
const CENTER_Y = 548
const BAR_COUNT = 36
const BAR_WIDTH = 6
const BAR_GAP = 4
const MAX_HALF_HEIGHT = 24
const MIN_HALF_HEIGHT = 2.5
const LEVEL_BANDS = 36

type Props = {
    subscribeLevels: (listener: (levels: number[]) => void) => () => void
}

function CoachEqualizerImpl({ subscribeLevels }: Props) {
    const barsRef = useRef<(SVGRectElement | null)[]>([])

    useEffect(() => {
        return subscribeLevels((levels) => {
            for (let bar = 0; bar < BAR_COUNT; bar++) {
                const rect = barsRef.current[bar]
                if (!rect) continue
                // Left half mirrors the right so the shape grows from the middle.
                const half = BAR_COUNT / 2
                const band = bar < half ? half - 1 - bar : bar - half
                const level = levels[Math.min(LEVEL_BANDS - 1, band * 2)] ?? 0
                const halfHeight = MIN_HALF_HEIGHT + Math.max(0, Math.min(1, level)) * (MAX_HALF_HEIGHT - MIN_HALF_HEIGHT)
                rect.setAttribute('y', String(CENTER_Y - halfHeight))
                rect.setAttribute('height', String(halfHeight * 2))
            }
        })
    }, [subscribeLevels])

    const totalWidth = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP
    const startX = CENTER_X - totalWidth / 2
    return (
        <g className="coach-equalizer" aria-hidden="true" pointerEvents="none">
            {Array.from({ length: BAR_COUNT }).map((_, bar) => (
                <rect
                    key={bar}
                    ref={(node) => {
                        barsRef.current[bar] = node
                    }}
                    x={startX + bar * (BAR_WIDTH + BAR_GAP)}
                    y={CENTER_Y - MIN_HALF_HEIGHT}
                    width={BAR_WIDTH}
                    height={MIN_HALF_HEIGHT * 2}
                    rx={BAR_WIDTH / 2}
                    fill="#f43f5e"
                />
            ))}
        </g>
    )
}

export const CoachEqualizer = memo(CoachEqualizerImpl)
