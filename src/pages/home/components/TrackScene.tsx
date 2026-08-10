// File: src/pages/home/components/TrackScene.tsx
import React from 'react'
type SceneName = 'history' | 'proficiency' | 'comprehension'
interface TrackSceneProps {
    name: SceneName
    className?: string
}
export const TrackScene: React.FC<TrackSceneProps> = ({ name, className = '' }) => {
    return (
        <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
            {SCENES[name]()}
        </svg>
    )
}
const box: React.CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' }
type BookPalette = {
    pageA: string
    pageB: string
    pageStroke: string
    cover: string
    text: string
}
/*
 * Open-book glyph — hardcover frame with a spine hump peeking above two
 * flat rectangular pages. Natural coordinate space is 340 x 178; scale it
 * down with a wrapping <g transform="... scale(s)">.
 */
const BookGlyph: React.FC<{ palette: BookPalette }> = ({ palette }) => (
    <>
        <rect x="160" y="0" width="20" height="30" rx="5" fill={palette.cover} />
        <rect x="0" y="8" width="340" height="170" rx="18" fill={palette.cover} />
        <rect x="24" y="30" width="136" height="126" rx="6" fill={palette.pageA} stroke={palette.pageStroke} strokeWidth="6" />
        <rect x="180" y="30" width="136" height="126" rx="6" fill={palette.pageB} stroke={palette.pageStroke} strokeWidth="6" />
        <g stroke={palette.text} strokeWidth="5" opacity="0.55" strokeLinecap="round">
            <path d="M40 66 L144 66" />
            <path d="M40 86 L144 86" />
            <path d="M40 106 L144 106" />
            <path d="M40 126 L144 126" />
        </g>
        <g stroke={palette.text} strokeWidth="5" opacity="0.55" strokeLinecap="round">
            <path d="M196 66 L300 66" />
            <path d="M196 86 L300 86" />
            <path d="M196 106 L300 106" />
            <path d="M196 126 L300 126" />
        </g>
    </>
)
const PROF_PALETTE: BookPalette = {
    pageA: '#fff8ec',
    pageB: '#fdf1dc',
    pageStroke: '#e0b877',
    cover: '#a9773f',
    text: '#c98f4a',
}
const COMP_PALETTE: BookPalette = {
    pageA: '#f4ecff',
    pageB: '#ece0fb',
    pageStroke: '#c9b8ec',
    cover: '#6f5a9e',
    text: '#9d8ac9',
}
/** A single equalizer bar, drawn symmetrically around y=0 (from -h/2 to +h/2)
 * so it grows both up AND down from a shared center line, like a real
 * waveform trace rather than bars standing up from a bottom baseline.
 * Static position lives on the OUTER <g>, the animation (which sets its own
 * CSS `transform`) lives on an INNER <g> with no transform attribute of its
 * own, so the two don't fight over `transform`. */
const EqBar: React.FC<{ x: number; w: number; h: number; delay: number; duration: number; fill: string; stroke?: string }> = ({
                                                                                                                                  x,
                                                                                                                                  w,
                                                                                                                                  h,
                                                                                                                                  delay,
                                                                                                                                  duration,
                                                                                                                                  fill,
                                                                                                                                  stroke,
                                                                                                                              }) => (
    <g transform={`translate(${x} 0)`}>
        <g className="animate-eq-bar" style={{ ...box, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}>
            <rect x="0" y={-h / 2} width={w} height={h} rx="1.5" fill={fill} stroke={stroke} strokeWidth={stroke ? 1 : 0} />
        </g>
    </g>
)
// A speech-shaped equalizer row instead of a smooth rolling wave: short
// "syllable" bursts (a handful of bars rising then falling) separated by
// brief low-energy gaps (pauses between words/syllables), with irregular
// jitter inside each burst rather than a clean sine curve — closer to how
// a voice-message waveform actually looks. Runs the full card width,
// drawn BEHIND the book so only the ends show past its edges, mirrored
// around a center "plane" line.
const EQ_ROW_HEIGHTS = [
    8, 22, 6, 5, 5, 27, 9, 4, 5, 7, 23, 24, 5, 5, 5, 5, 22, 6, 6, 5,
    14, 19, 15, 5, 5, 5, 18, 19, 17, 7, 6, 5, 9, 21, 28, 28, 23, 7, 5, 6,
]
const EQ_ROW_DELAYS = [
    0.77, 0.46, 0.66, 0.79, 0.24, 0.68, 0.76, 0.25, 0.35, 0.23, 0.81, 0.89, 0.96, 0.52, 0.33, 0.39, 0.35, 0.53, 1.15, 0.31,
    0.16, 0.39, 0.19, 0.88, 0.72, 0.32, 0.27, 0.63, 0.72, 1.03, 0.77, 0.47, 0.77, 0.58, 0.02, 0.76, 0.41, 0.22, 0.98, 0.07,
]
const EQ_ROW_DURATIONS = [
    1.29, 1.05, 1.64, 1.26, 1.4, 1.06, 1.03, 1.16, 1.11, 1.33, 1.46, 1.48, 1.35, 1.69, 1.1, 1.48, 1.57, 0.98, 1.38, 0.9,
    0.97, 1, 0.91, 0.99, 0.91, 0.98, 1.21, 1.19, 1.31, 1.24, 1.63, 1.13, 0.91, 1.57, 0.87, 1.39, 1.42, 1.08, 1.56, 0.82,
]
/** Small floating "idea" speech bubble — a rounded bubble with two trailing
 * dots, wrapped so the whole thing bobs up and down. `tailDir` controls
 * which way the trailing dots point: 1 = down-right, -1 = down-left, 0 =
 * straight down — always pick whichever direction actually points back at
 * the book from this bubble's position. `children` draws whatever glyph
 * sits inside (a "?", a "!", a lightbulb, ...). */
const IdeaBubble: React.FC<{ x: number; y: number; r: number; delay: string; tailDir?: -1 | 0 | 1; children: React.ReactNode }> = ({
                                                                                                                                       x,
                                                                                                                                       y,
                                                                                                                                       r,
                                                                                                                                       delay,
                                                                                                                                       tailDir = 1,
                                                                                                                                       children,
                                                                                                                                   }) => (
    <g transform={`translate(${x} ${y})`}>
        <g className="animate-float-slow" style={{ ...box, animationDelay: delay }}>
            <circle r={r} fill="#fff" opacity="0.95" />
            <circle cx={tailDir * r * 0.9} cy={r * 1.1} r={r * 0.28} fill="#fff" opacity="0.9" />
            <circle cx={tailDir * r * 1.3} cy={r * 1.55} r={r * 0.16} fill="#fff" opacity="0.85" />
            {children}
        </g>
    </g>
)
/*
 * Bookshelf background system — shared between the "proficiency" (day) and
 * "comprehension" (night) scenes. A ShelfPalette carries the wall color,
 * the wooden-plank colors, and a rotating list of spine colors. Two rows
 * of book spines ("patterns", cycled to fill the full card width) sit on
 * top of two plank shapes, drawn first so every other scene element
 * layers cleanly on top of them.
 */
type ShelfPalette = {
    wall: string
    plank: string
    plankEdge: string
    plankShadow: string
    books: string[]
}
const DAY_SHELF_PALETTE: ShelfPalette = {
    wall: '#fff3dd',
    plank: '#c9853f',
    plankEdge: '#e0a765',
    plankShadow: '#8f5a28',
    books: ['#ff9f5a', '#4ea8a0', '#ffc64b', '#e0764a', '#7bbf9e', '#f2935a', '#5fa8a0', '#f2b25a'],
}
const NIGHT_SHELF_PALETTE: ShelfPalette = {
    wall: '#241d3d',
    plank: '#4a3a5e',
    plankEdge: '#6a577f',
    plankShadow: '#1a1530',
    books: ['#6f5a9e', '#8a6bb0', '#4a7a8e', '#9d5c63', '#c9b8ec', '#5b4a8a', '#3d5a80', '#7a5a9e'],
}
type BookSpec = { w: number; h: number }
const SHELF_PATTERN_A: BookSpec[] = [
    { w: 16, h: 24 }, { w: 11, h: 18 }, { w: 19, h: 28 }, { w: 13, h: 16 },
    { w: 10, h: 22 }, { w: 22, h: 30 }, { w: 14, h: 20 }, { w: 12, h: 24 },
]
const SHELF_PATTERN_B: BookSpec[] = [
    { w: 13, h: 30 }, { w: 18, h: 22 }, { w: 11, h: 36 }, { w: 20, h: 24 },
    { w: 14, h: 32 }, { w: 10, h: 20 }, { w: 22, h: 28 }, { w: 16, h: 34 },
]
/** Tiles `pattern` (widths/heights, cycled) across [startX, endX) so the
 * row always fully covers the card no matter the pattern length, each
 * spine bottom-aligned to `y` (the top of the shelf plank it sits on). */
const ShelfBooks: React.FC<{ y: number; pattern: BookSpec[]; palette: ShelfPalette; startX?: number; endX?: number }> = ({
                                                                                                                             y,
                                                                                                                             pattern,
                                                                                                                             palette,
                                                                                                                             startX = -10,
                                                                                                                             endX = 410,
                                                                                                                         }) => {
    const spines: React.ReactNode[] = []
    let x = startX
    let i = 0
    while (x < endX) {
        const { w, h } = pattern[i % pattern.length]
        const fill = palette.books[i % palette.books.length]
        spines.push(
            <g key={i} transform={`translate(${x} ${y - h})`}>
                <rect width={w} height={h} rx="1.5" fill={fill} />
                <rect y={h * 0.22} width={w} height={Math.max(2, h * 0.08)} fill="#000" opacity="0.12" />
                <rect x={w * 0.18} width={Math.max(1.5, w * 0.16)} height={h * 0.9} fill="#fff" opacity="0.15" />
            </g>
        )
        x += w + 2
        i += 1
    }
    return <>{spines}</>
}
const ShelfPlank: React.FC<{ y: number; height: number; palette: ShelfPalette }> = ({ y, height, palette }) => (
    <g>
        <rect x="0" y={y} width="400" height={height} fill={palette.plank} />
        <rect x="0" y={y} width="400" height="3" fill={palette.plankEdge} />
        <rect x="0" y={y + height - 4} width="400" height="4" fill={palette.plankShadow} opacity="0.6" />
    </g>
)
const BookshelfBackground: React.FC<{ palette: ShelfPalette }> = ({ palette }) => (
    <>
        <rect width="400" height="150" fill={palette.wall} />
        <ShelfBooks y={50} pattern={SHELF_PATTERN_A} palette={palette} />
        <ShelfPlank y={50} height={8} palette={palette} />
        <ShelfBooks y={144} pattern={SHELF_PATTERN_B} palette={palette} />
        <ShelfPlank y={144} height={8} palette={palette} />
    </>
)
const SCENES: Record<SceneName, () => React.ReactNode> = {
    history: () => (
        <>
            <defs>
                <linearGradient id="historySky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffe1ad" />
                    <stop offset="100%" stopColor="#ff9f5a" />
                </linearGradient>
            </defs>
            <rect width="400" height="150" fill="url(#historySky)" />
            <g transform="translate(342 28)">
                <circle r="26" fill="#ffb066" opacity="0.35" className="animate-glow-pulse" style={box} />
                <circle r="16" fill="#ff7a4d" />
            </g>
            <g transform="translate(50 24)" className="animate-drift-x" style={box}>
                <path d="M0 0 q6 -6 12 0" stroke="#7a3f18" strokeWidth="1.8" fill="none" opacity="0.5" strokeLinecap="round" />
            </g>
            <g transform="translate(70 32)" className="animate-drift-x" style={{ ...box, animationDelay: '0.6s' }}>
                <path d="M0 0 q5 -5 10 0" stroke="#7a3f18" strokeWidth="1.8" fill="none" opacity="0.5" strokeLinecap="round" />
            </g>
            <path d="M0 92 Q120 68 240 92 T400 82 V150 H0 Z" fill="#e2833f" />
            <path d="M0 112 Q150 96 300 116 T400 108 V150 H0 Z" fill="#b5602a" />
            {/* warrior — body stays put, only the shield and spear bob */}
            <g transform="translate(180 56)">
                <g>
                    <rect x="5" y="20" width="6" height="22" rx="3" fill="#3a2210" transform="rotate(9 8 31)" />
                    <rect x="15" y="20" width="6" height="22" rx="3" fill="#3a2210" transform="rotate(-7 18 31)" />
                    <rect x="5" y="15" width="14" height="27" rx="5" fill="#4a2c14" />
                    <circle cx="12" cy="8" r="9" fill="#4a2c14" />
                    <path d="M3 5 h18" stroke="#ff7a59" strokeWidth="2.2" strokeLinecap="round" />
                </g>
                <g transform="translate(-11 32)">
                    <g className="animate-float-slow" style={box}>
                        <circle r="11" fill="#8a4a20" stroke="#4a2510" strokeWidth="1.8" />
                        <path d="M0 -8 v16 M-6 0 h12" stroke="#e0b877" strokeWidth="1.4" opacity="0.8" />
                    </g>
                </g>
                <g transform="translate(31.5 18)">
                    <g className="animate-float-slow" style={{ ...box, animationDelay: '0.3s' }}>
                        <rect x="-1.5" y="-30" width="3" height="60" rx="1.5" fill="#4a2510" transform="rotate(9 0 0)" />
                        <path d="M-4.5 -33 l7 -9 5 10 Z" fill="#e0b877" transform="rotate(9 0 0)" />
                    </g>
                </g>
            </g>
            <g stroke="#8a4a1e" strokeWidth="2.4" opacity="0.4" fill="none" strokeLinecap="round">
                <path d="M30 128 h40 M300 136 h36" />
            </g>
        </>
    ),
    proficiency: () => {
        const n = EQ_ROW_HEIGHTS.length
        const startX = 26
        const endX = 374
        const barW = (endX - startX) / n
        const centerY = 100
        const HEIGHT_BOOST = 1.5
        return (
            <>
                <BookshelfBackground palette={DAY_SHELF_PALETTE} />
                {/* dark "trackpad" band behind the equalizer so the bars read as a
                    single unit against the busy bookshelf instead of blending in */}
                <rect x="0" y={centerY - 30} width="400" height="60" fill="#1a1006" opacity="0.32" />
                <line x1="0" y1={centerY} x2="400" y2={centerY} stroke="#fff3dd" strokeWidth="1.5" opacity="0.4" />
                {/* speech-shaped equalizer strip, mirrored around the center line,
                    drawn BEHIND the book — bars boosted in height and given a
                    darker stroke + brighter fill for contrast against the shelf */}
                <g transform={`translate(0 ${centerY})`}>
                    {EQ_ROW_HEIGHTS.map((h, i) => (
                        <EqBar
                            key={i}
                            x={startX + i * barW}
                            w={barW - 1}
                            h={Math.min(h * HEIGHT_BOOST, 56)}
                            delay={EQ_ROW_DELAYS[i]}
                            duration={EQ_ROW_DURATIONS[i]}
                            fill="#39ffe0"
                            stroke="#00b8a9"
                        />
                    ))}
                </g>
                {/* book — natural width 340 * scale 0.4 = 136, translate x=132 puts its
                    center at x=132+68=200, dead-center of the 400-wide viewBox, and on
                    top of the equalizer strip so it hides the middle bars */}
                <g transform="translate(132 60) scale(0.4)">
                    <BookGlyph palette={PROF_PALETTE} />
                </g>
                {/* mic — solid backing disc first for contrast against the shelf,
                    then rings + body scaled up ~35% from the original for visibility.
                    Rings recentered on the mic icon's true visual middle (the mic
                    body itself spans roughly y -18..14, center ~ -2, not 0) */}
                <g transform="translate(200 28)">
                    <circle cy="-2" r="26" fill="#fff8ec" opacity="0.92" />
                    <circle cy="-2" r="26" fill="none" stroke="#e0b877" strokeWidth="1.5" opacity="0.6" />
                    <g transform="scale(1.35)">
                        <circle cy="-2" r="18" fill="none" stroke="#ff7a59" strokeWidth="2.4" opacity="0.6" className="animate-sound-ring" style={box} />
                        <circle cy="-2" r="18" fill="none" stroke="#ff7a59" strokeWidth="2.4" opacity="0.4" className="animate-sound-ring" style={{ ...box, animationDelay: '0.4s' }} />
                        <circle cy="-2" r="18" fill="none" stroke="#ff7a59" strokeWidth="2.4" opacity="0.25" className="animate-sound-ring" style={{ ...box, animationDelay: '0.8s' }} />
                        <rect x="-6" y="-18" width="12" height="20" rx="6" fill="#ff7a59" stroke="#e05f3d" strokeWidth="2" />
                        <path d="M-10 -1 a10 10 0 0 0 20 0" stroke="#e05f3d" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                        <line x1="0" y1="9" x2="0" y2="14" stroke="#e05f3d" strokeWidth="2.4" strokeLinecap="round" />
                    </g>
                </g>
            </>
        )
    },
    comprehension: () => (
        <>
            <BookshelfBackground palette={NIGHT_SHELF_PALETTE} />
            {/* moon — mirrors the sun accent used on the day scenes, top-right corner */}
            <g transform="translate(354 26)">
                <circle r="18" fill="#c9d6ff" opacity="0.25" className="animate-glow-pulse" style={box} />
                <circle r="11" fill="#e9eeff" />
                <circle cx="-4" cy="-3" r="9" fill="#241d3d" opacity="0.35" />
            </g>
            {/* book — natural width 340 * scale 0.45 = 153, translate x=124 puts its
                center at x=124+76.5≈200.5, essentially dead-center of the viewBox */}
            <g transform="translate(124 60) scale(0.45)">
                <g className="animate-float-slow" style={box}>
                    <BookGlyph palette={COMP_PALETTE} />
                </g>
            </g>
            {/* three idea bubbles pulled in tight against the book — two flank its
                sides, one sits just above the spine — instead of sitting out in the
                corners where the icon sticker / "Preview" badge overlays cover them */}
            <IdeaBubble x={98} y={68} r={15} delay="0s" tailDir={1}>
                {/* left side of book → tail points right, toward the book */}
                <g stroke="#e0932e" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
                    <path d="M0 -13 v3" />
                    <path d="M-8.5 -9.5 l2 2" />
                    <path d="M8.5 -9.5 l-2 2" />
                </g>
                <circle cy="-3" r="6" fill="#ffcf72" stroke="#e0932e" strokeWidth="1.4" />
                <path d="M-2.4 1.8 h4.8 v3 a2.4 2.4 0 0 1 -4.8 0 Z" fill="#c9b8ec" stroke="#9d8ac9" strokeWidth="1.2" />
                <path d="M-2 6.5 h4" stroke="#9d8ac9" strokeWidth="1" />
            </IdeaBubble>
            <IdeaBubble x={302} y={68} r={15} delay="0.5s" tailDir={-1}>
                {/* right side of book → tail points left, toward the book */}
                <text x="0" y="6" textAnchor="middle" fontSize="15" fontWeight={700} fill="#5b4a8a">
                    ?
                </text>
            </IdeaBubble>
            <IdeaBubble x={200} y={40} r={13} delay="1s" tailDir={0}>
                {/* directly above the spine → tail points straight down at the book */}
                <text x="0" y="5" textAnchor="middle" fontSize="14" fontWeight={800} fill="#d65f4a">
                    !
                </text>
            </IdeaBubble>
        </>
    ),
}
export default TrackScene