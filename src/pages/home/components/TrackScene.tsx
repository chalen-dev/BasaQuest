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

    proficiency: () => (
        <>
            <defs>
                <linearGradient id="profSky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff3dd" />
                    <stop offset="100%" stopColor="#ffd9a8" />
                </linearGradient>
            </defs>
            <rect width="400" height="150" fill="url(#profSky)" />
            <circle cx="44" cy="26" r="16" fill="#ffc64b" className="animate-glow-pulse" style={box} />
            <rect y="124" width="400" height="26" fill="#f0c07f" />

            {/* book, centered in the card */}
            <g transform="translate(132 60) scale(0.4)">
                <BookGlyph palette={PROF_PALETTE} />
            </g>

            {/* mic — centered above the book, with real breathing room under it */}
            <g transform="translate(200 28)">
                <circle r="18" fill="none" stroke="#ff7a59" strokeWidth="2" opacity="0.5" className="animate-sound-ring" style={box} />
                <circle r="18" fill="none" stroke="#ff7a59" strokeWidth="2" opacity="0.35" className="animate-sound-ring" style={{ ...box, animationDelay: '0.4s' }} />
                <circle r="18" fill="none" stroke="#ff7a59" strokeWidth="2" opacity="0.2" className="animate-sound-ring" style={{ ...box, animationDelay: '0.8s' }} />
                <rect x="-6" y="-18" width="12" height="20" rx="6" fill="#ff7a59" stroke="#e05f3d" strokeWidth="1.6" />
                <path d="M-10 -1 a10 10 0 0 0 20 0" stroke="#e05f3d" strokeWidth="2" fill="none" strokeLinecap="round" />
                <line x1="0" y1="9" x2="0" y2="14" stroke="#e05f3d" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* audio line — book — audio line, with clear space on each side */}
            <g transform="translate(60 108)" fill="#4ea8a0">
                <g transform="translate(0 0)" className="animate-eq-bar" style={box}>
                    <rect x="0" y="-10" width="6" height="10" rx="2" />
                </g>
                <g transform="translate(10 0)" className="animate-eq-bar" style={{ ...box, animationDelay: '0.2s' }}>
                    <rect x="0" y="-20" width="6" height="20" rx="2" />
                </g>
                <g transform="translate(20 0)" className="animate-eq-bar" style={{ ...box, animationDelay: '0.4s' }}>
                    <rect x="0" y="-6" width="6" height="6" rx="2" />
                </g>
            </g>

            <g transform="translate(314 108)" fill="#4ea8a0">
                <g transform="translate(0 0)" className="animate-eq-bar" style={{ ...box, animationDelay: '0.1s' }}>
                    <rect x="0" y="-6" width="6" height="6" rx="2" />
                </g>
                <g transform="translate(10 0)" className="animate-eq-bar" style={{ ...box, animationDelay: '0.3s' }}>
                    <rect x="0" y="-20" width="6" height="20" rx="2" />
                </g>
                <g transform="translate(20 0)" className="animate-eq-bar" style={{ ...box, animationDelay: '0.5s' }}>
                    <rect x="0" y="-10" width="6" height="10" rx="2" />
                </g>
            </g>
        </>
    ),

    comprehension: () => (
        <>
            <defs>
                <linearGradient id="compSky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4a3a72" />
                    <stop offset="100%" stopColor="#2a2047" />
                </linearGradient>
            </defs>
            <rect width="400" height="150" fill="url(#compSky)" />

            <g fill="#ffe9a8">
                {[
                    { x: 30, y: 20, delay: '0s' },
                    { x: 90, y: 44, delay: '0.4s' },
                    { x: 150, y: 16, delay: '0.8s' },
                    { x: 270, y: 24, delay: '1.2s' },
                    { x: 330, y: 60, delay: '1.6s' },
                ].map((star, i) => (
                    <g key={i} transform={`translate(${star.x} ${star.y})`}>
                        <path
                            d="M0 0 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 Z"
                            className="animate-twinkle-star"
                            style={{ ...box, animationDelay: star.delay }}
                        />
                    </g>
                ))}
            </g>

            <path d="M0 118 Q200 100 400 122 V150 H0 Z" fill="#241d3d" />

            <g transform="translate(100 60) scale(0.45)">
                <g className="animate-float-slow" style={box}>
                    <BookGlyph palette={COMP_PALETTE} />
                </g>
            </g>

            <g transform="translate(244 20)">
                <g className="animate-float-slow" style={{ ...box, animationDelay: '0.5s' }}>
                    <circle r="17" fill="#fff" opacity="0.95" />
                    <circle cx="-17" cy="20" r="5" fill="#fff" opacity="0.9" />
                    <circle cx="-24" cy="28" r="3" fill="#fff" opacity="0.85" />
                    <text x="0" y="6" textAnchor="middle" fontSize="17" fontWeight={700} fill="#5b4a8a">
                        ?
                    </text>
                </g>
            </g>
        </>
    ),
}

export default TrackScene