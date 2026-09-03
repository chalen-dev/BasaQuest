// File: src/pages/proficiency/components/BookCover.tsx
import React from 'react'
type SceneName = 'moon' | 'market' | 'kite' | 'letters-fil' | 'letters-en'
type SvgSceneName = 'moon' | 'market' | 'kite'

// The foundational-skills scenes are AI-generated illustrations (an owl at a
// chalkboard, chalk-drawn "Aa Bb Cc") saved under public/track-scenes/ —
// rendered as a plain image instead of the hand-coded SVG chalkboard below.
const IMAGE_SCENES: Partial<Record<SceneName, string>> = {
    'letters-fil': '/track-scenes/mga_titik_at_tunog.png',
    'letters-en': '/track-scenes/letters_and_sounds.png',
}

function Scene({ name }: { name: SceneName }) {
    const image = IMAGE_SCENES[name]
    if (image) {
        return (
            <img
                src={image}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="block h-full w-full select-none object-cover"
            />
        )
    }
    return (
        <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
            {SCENES[name as SvgSceneName]()}
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
// Ported directly from the old prototype's components/Scene.jsx (moon,
// market, kite scenes). `letters-fil`/`letters-en` used to be hand-coded
// SVG chalkboard scenes here too, but those are now the AI-generated
// images in IMAGE_SCENES above instead — see Scene() — so this record only
// needs to cover the remaining SVG-rendered scenes.
const SCENES: Record<SvgSceneName, () => React.ReactNode> = {
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