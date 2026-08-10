// File: src/pages/proficiency/components/BookCover.tsx
import React from 'react'
type SceneName = 'moon' | 'market' | 'kite' | 'letters-fil' | 'letters-en'
function Scene({ name }: { name: SceneName }) {
    return (
        <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
            {SCENES[name]()}
        </svg>
    )
}
function sun(x = 320, y = 54, c = '#ffc64b') {
    return (
        <g>
            <circle cx={x} cy={y} r="30" fill={c} />
            <circle cx={x} cy={y} r="30" fill="#fff" opacity="0.15" />
        </g>
    )
}
// Small mound of produce, reused across every market stall counter.
const PRODUCE: { dx: number; dy: number; r: number; fill: string }[] = [
    { dx: 0, dy: 0, r: 6, fill: '#ff5a4d' },
    { dx: 11, dy: 1, r: 6.5, fill: '#79ad5b' },
    { dx: 22, dy: 0, r: 6, fill: '#ffc64b' },
    { dx: 33, dy: 2, r: 6.5, fill: '#ff9b3d' },
    { dx: 44, dy: 0, r: 6, fill: '#e05f3d' },
    { dx: 6, dy: -6, r: 5.5, fill: '#ffc64b' },
    { dx: 18, dy: -6, r: 5.5, fill: '#ff5a4d' },
    { dx: 30, dy: -6, r: 5.5, fill: '#79ad5b' },
    { dx: 41, dy: -6, r: 5.5, fill: '#ffd97a' },
]
// Chalk dust / sparkle points scattered over the letters scene's chalkboard.
// Static (no animation) — a scattered dusting, not a twinkle effect.
const CHALK_DUST: { x: number; y: number; r: number }[] = [
    { x: 40, y: 40, r: 1.8 },
    { x: 340, y: 30, r: 2.2 },
    { x: 96, y: 158, r: 1.6 },
    { x: 250, y: 150, r: 2 },
    { x: 320, y: 58, r: 1.8 },
    { x: 20, y: 130, r: 1.6 },
]
// A little pinned nameplate tag on the letters-scene chalkboard, shared by
// the `letters-fil` and `letters-en` variants — a solid badge (not plain
// chalk text) so the language reads clearly instead of blending into the
// board. Sits low, near the bottom-left of the board: the card's
// `preserveAspectRatio="xMidYMid slice"` crops off a wide band at the very
// top and bottom of this 400x260 viewBox (the card window is much wider
// than it is tall), so anything placed up near y=14 like an earlier version
// of this label never actually showed up — this y=150 placement is safely
// inside the visible middle band, below the "Aa Bb Cc" text.
function chalkLabel(text: string) {
    const width = text.length * 9.2 + 24
    return (
        <g transform="rotate(-3 24 163)">
            <rect x="24" y="150" width={width} height="26" rx="7" fill="#1f4335" stroke="#fdf6e3" strokeWidth="1.5" />
            <text
                x={24 + width / 2}
                y="168"
                fontSize="14"
                fontWeight="800"
                letterSpacing="1"
                textAnchor="middle"
                fill="#fdf6e3"
                fontFamily="'Baloo 2', 'Comic Sans MS', cursive"
            >
                {text}
            </text>
        </g>
    )
}
// Ported directly from the old prototype's components/Scene.jsx (moon,
// market, kite scenes), plus `letters-fil`/`letters-en` scenes for the
// foundational words/sounds cards: a chalkboard with chalk-drawn "Aa Bb Cc",
// a language nameplate, and a row of alphabet blocks on the ledge below, in
// the same flat paper-cut style.
const SCENES: Record<SceneName, () => React.ReactNode> = {
    moon: () => (
        <>
            <rect width="400" height="260" fill="#2f3b6e" />
            <rect y="170" width="400" height="90" fill="#243056" />
            <circle cx="300" cy="80" r="42" fill="#fff3c4" />
            <circle cx="286" cy="70" r="42" fill="#2f3b6e" />
            <g fill="#ffe9a8">
                {[[60, 50], [120, 90], [90, 150], [200, 60], [250, 150], [340, 170]].map(([x, y], i) => (
                    <path key={i} d={`M${x} ${y} l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z`} />
                ))}
            </g>
            <g transform="translate(150 176)" fill="#1b2240">
                <ellipse cx="30" cy="30" rx="30" ry="20" />
                <circle cx="8" cy="8" r="14" />
                <path d="M-2 -2 l6 -12 6 10 Z" />
                <path d="M14 -4 l4 -12 6 10 Z" />
                <path d="M56 26 q18 -4 12 -22" stroke="#1b2240" strokeWidth="7" fill="none" strokeLinecap="round" />
            </g>
            <circle cx="164" cy="182" r="2.6" fill="#ffc64b" />
            <circle cx="172" cy="182" r="2.6" fill="#ffc64b" />
        </>
    ),
    market: () => (
        <>
            <rect width="400" height="260" fill="#fff0d0" />
            <rect y="180" width="400" height="80" fill="#e9c68a" />
            {sun(60, 50, '#ffc64b')}
            {/* Market-stall dimensions, shared by all 3 stalls below:
                a scalloped awning (6 alternating color/white petals) held
                up on two posts, over a plank counter with a foot at the
                base — modeled on a real striped market-stall kiosk. */}
            {([[40, '#ff7a59'], [170, '#4ea8a0'], [300, '#5b8def']] as const).map(([x, c], i) => (
                <g key={i} transform={`translate(${x} 83)`}>
                    {/* scalloped awning — alternating color/white bands, each with a
                        hanging semicircle "petal" along the bottom edge */}
                    {Array.from({ length: 6 }).map((_, k) => {
                        const bandW = 86 / 6
                        const bx = k * bandW
                        const fill = k % 2 === 0 ? c : '#fff'
                        return (
                            <g key={k}>
                                <rect x={bx} y="0" width={bandW} height="12" fill={fill} />
                                <path
                                    d={`M${bx} 12 A ${bandW / 2} ${bandW / 2} 0 0 0 ${bx + bandW} 12 Z`}
                                    fill={fill}
                                />
                            </g>
                        )
                    })}
                    {/* support posts, visible in the gap between awning and counter */}
                    <rect x="4" y="19" width="6" height="26" fill="#c9a06a" stroke="#a9723d" strokeWidth="1" />
                    <rect x="76" y="19" width="6" height="26" fill="#c9a06a" stroke="#a9723d" strokeWidth="1" />
                    {/* counter/table — plank lines for wood-grain texture, the
                        produce basket sits right at its top edge */}
                    <rect x="0" y="45" width="86" height="46" rx="3" fill="#d9b06f" stroke="#a9723d" strokeWidth="2" />
                    <line x1="4" y1="60" x2="82" y2="60" stroke="#a9723d" strokeWidth="1.5" opacity="0.55" />
                    <line x1="4" y1="75" x2="82" y2="75" stroke="#a9723d" strokeWidth="1.5" opacity="0.55" />
                    {/* base foot */}
                    <rect x="14" y="91" width="58" height="6" rx="1" fill="#a9723d" />
                    {/* produce piled right on the counter's top edge */}
                    <g>
                        {PRODUCE.map(({ dx, dy, r, fill }, j) => (
                            <circle key={j} cx={17 + dx} cy={57 + dy} r={r} fill={fill} stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
                        ))}
                    </g>
                </g>
            ))}
        </>
    ),
    kite: () => (
        <>
            <rect width="400" height="260" fill="#bfe3f0" />
            <rect y="180" width="400" height="80" fill="#cfe3a6" />
            {sun(70, 54, '#ffd97a')}
            <path d="M0 200 Q200 175 400 200 V260 H0 Z" fill="#9fce8f" />
            <g transform="translate(250 70) rotate(12)">
                <path d="M0 -30 L26 0 L0 46 L-26 0 Z" fill="#d6547e" />
                <path d="M0 -30 L0 46 M-26 0 L26 0" stroke="#fff" strokeWidth="2" opacity="0.7" />
                <path d="M0 46 q6 14 -4 22 q10 -2 8 12" stroke="#e07b1f" strokeWidth="2" fill="none" />
                <g fill="#ffc64b">
                    <rect x="-4" y="52" width="8" height="6" rx="2" transform="rotate(20 0 55)" />
                    <rect x="-8" y="66" width="8" height="6" rx="2" transform="rotate(-20 -4 69)" />
                </g>
            </g>
            <path d="M226 90 Q160 140 120 200" stroke="#8a6a44" strokeWidth="1.6" fill="none" />
        </>
    ),
    'letters-fil': () => (
        <>
            <rect width="400" height="260" fill="#2f5d4f" />
            <rect x="10" y="10" width="380" height="168" rx="8" fill="#356a58" stroke="#1f4335" strokeWidth="6" />
            <rect y="178" width="400" height="82" fill="#c98f52" />
            <rect y="178" width="400" height="9" fill="#a9723d" />
            {chalkLabel('FILIPINO')}
            <g fill="#fdf6e3" opacity="0.92" fontFamily="'Baloo 2', 'Comic Sans MS', cursive" fontWeight="700">
                <text x="46" y="118" fontSize="66" transform="rotate(-6 46 118)">Aa</text>
                <text x="160" y="138" fontSize="66" transform="rotate(4 160 138)">Bb</text>
                <text x="272" y="112" fontSize="66" transform="rotate(-3 272 112)">Cc</text>
            </g>
            <g fill="#fdf6e3" opacity="0.6">
                {CHALK_DUST.map(({ x, y, r }, i) => (
                    <circle key={i} cx={x} cy={y} r={r} />
                ))}
            </g>
            {/* alphabet blocks resting on the ledge */}
            <g transform="translate(146 202)">
                <g>
                    <rect x="0" y="0" width="36" height="36" rx="6" fill="#ff7a59" stroke="rgba(0,0,0,0.12)" />
                    <text x="18" y="25" fontSize="20" fontWeight="800" textAnchor="middle" fill="#fff">A</text>
                </g>
                <g transform="rotate(5 66 4)">
                    <rect x="48" y="4" width="36" height="36" rx="6" fill="#4ea8a0" stroke="rgba(0,0,0,0.12)" />
                    <text x="66" y="29" fontSize="20" fontWeight="800" textAnchor="middle" fill="#fff">B</text>
                </g>
                <g transform="rotate(-6 114 2)">
                    <rect x="96" y="2" width="36" height="36" rx="6" fill="#5b8def" stroke="rgba(0,0,0,0.12)" />
                    <text x="114" y="27" fontSize="20" fontWeight="800" textAnchor="middle" fill="#fff">C</text>
                </g>
            </g>
        </>
    ),
    'letters-en': () => (
        <>
            <rect width="400" height="260" fill="#2f5d4f" />
            <rect x="10" y="10" width="380" height="168" rx="8" fill="#356a58" stroke="#1f4335" strokeWidth="6" />
            <rect y="178" width="400" height="82" fill="#c98f52" />
            <rect y="178" width="400" height="9" fill="#a9723d" />
            {chalkLabel('ENGLISH')}
            <g fill="#fdf6e3" opacity="0.92" fontFamily="'Baloo 2', 'Comic Sans MS', cursive" fontWeight="700">
                <text x="46" y="118" fontSize="66" transform="rotate(-6 46 118)">Aa</text>
                <text x="160" y="138" fontSize="66" transform="rotate(4 160 138)">Bb</text>
                <text x="272" y="112" fontSize="66" transform="rotate(-3 272 112)">Cc</text>
            </g>
            <g fill="#fdf6e3" opacity="0.6">
                {CHALK_DUST.map(({ x, y, r }, i) => (
                    <circle key={i} cx={x} cy={y} r={r} />
                ))}
            </g>
            {/* alphabet blocks resting on the ledge */}
            <g transform="translate(146 202)">
                <g>
                    <rect x="0" y="0" width="36" height="36" rx="6" fill="#ff7a59" stroke="rgba(0,0,0,0.12)" />
                    <text x="18" y="25" fontSize="20" fontWeight="800" textAnchor="middle" fill="#fff">A</text>
                </g>
                <g transform="rotate(5 66 4)">
                    <rect x="48" y="4" width="36" height="36" rx="6" fill="#4ea8a0" stroke="rgba(0,0,0,0.12)" />
                    <text x="66" y="29" fontSize="20" fontWeight="800" textAnchor="middle" fill="#fff">B</text>
                </g>
                <g transform="rotate(-6 114 2)">
                    <rect x="96" y="2" width="36" height="36" rx="6" fill="#5b8def" stroke="rgba(0,0,0,0.12)" />
                    <text x="114" y="27" fontSize="20" fontWeight="800" textAnchor="middle" fill="#fff">C</text>
                </g>
            </g>
        </>
    ),
}
export type BookCoverProps = {
    scene: SceneName
    coverColor: string
    title: string
    subtitle: string
}
/** A storybook cover rendered as a physical object: cloth spine on the
 * left, an illustrated scene window, and a title plate below — ported
 * from the earlier prototype's BookCover.jsx, adapted to Tailwind. */
export const BookCover: React.FC<BookCoverProps> = ({ scene, coverColor, title, subtitle }) => {
    return (
        <div className="relative flex h-full flex-col overflow-hidden" style={{ background: coverColor }}>
            {/* cloth spine */}
            <div className="absolute inset-y-0 left-0 z-10 w-3.5" style={{ background: shade(coverColor, -0.18) }} />
            {/* illustrated window */}
            <div className="m-2.5 ml-5 h-[58%] overflow-hidden rounded-lg border-2 border-white/50">
                <Scene name={scene} />
            </div>
            {/* title plate */}
            <div className="flex flex-1 flex-col justify-center px-3 pb-2.5 pl-5">
                <div className="text-sm font-extrabold leading-tight" style={{ color: readableInk(coverColor) }}>
                    {title}
                </div>
                <div className="mt-0.5 text-[11px] font-semibold" style={{ color: readableInk(coverColor, 0.8) }}>
                    {subtitle}
                </div>
            </div>
        </div>
    )
}
function shade(hex: string, amt: number) {
    const n = hex.replace('#', '')
    let [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16))
    r = clamp(r + amt * 255)
    g = clamp(g + amt * 255)
    b = clamp(b + amt * 255)
    return `rgb(${r},${g},${b})`
}
function clamp(v: number) {
    return Math.max(0, Math.min(255, Math.round(v)))
}
function readableInk(hex: string, alpha = 1) {
    const n = hex.replace('#', '')
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16))
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return lum > 0.62 ? `rgba(43,36,56,${alpha})` : `rgba(255,253,248,${alpha})`
}
export default BookCover