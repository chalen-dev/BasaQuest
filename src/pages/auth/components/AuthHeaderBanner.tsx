// File: src/pages/auth/components/AuthHeaderBanner.tsx
import React from 'react'
import { Owl } from '../../../components/ui/Owl.tsx'

interface AuthHeaderBannerProps {
    title?: string
    subtitle?: string
}

interface BookSpec {
    x: number
    h: number
    w: number
    rot: number
}

// Right-side shelf cluster — deliberately kept clear of where the title/
// subtitle text renders (verified visually — an earlier version had a
// middle cluster that collided with "Sto. Niño Elementary School").
const SHELF_BOOKS: BookSpec[] = [
    { x: 270, h: 40, w: 18, rot: -3 },
    { x: 292, h: 56, w: 20, rot: 2 },
    { x: 314, h: 36, w: 22, rot: -2 },
    { x: 336, h: 60, w: 18, rot: 3 },
    { x: 358, h: 44, w: 20, rot: -4 },
    { x: 380, h: 58, w: 18, rot: 2 },
]

const SHELF_COLORS_LIGHT = ['#c1440e', '#2f6690', '#e07a5f', '#3d5a80', '#8d5524', '#588157']
// Muted, lower-contrast "dim room" palette — deliberately darker/less
// saturated than the light-mode set so the shelf reads like it's sitting in
// dim moonlight rather than a bright colorful pop.
const SHELF_COLORS_DARK = ['#6b5b95', '#4a6670', '#7a5c58', '#5c6b73', '#6e5849', '#4f6350']

// A single standing book: colored spine, a light highlight stripe down one
// edge, and a pale "pages" cap along the top. Sits on the shelf line at
// y=116; the rect's height is padded +6 downward so its rounded bottom
// corners tuck under the shelf rect instead of leaving a sliver gap.
const Book: React.FC<{ x: number; h: number; w: number; rot: number; fill: string; capOpacity?: number; hiOpacity?: number }> = ({
                                                                                                                                     x,
                                                                                                                                     h,
                                                                                                                                     w,
                                                                                                                                     rot,
                                                                                                                                     fill,
                                                                                                                                     capOpacity = 0.9,
                                                                                                                                     hiOpacity = 0.18,
                                                                                                                                 }) => (
    <g transform={`translate(${x} 116) rotate(${rot})`}>
        <rect x={-w / 2} y={-h} width={w} height={h + 6} rx="2" fill={fill} />
        <rect x={-w / 2} y={-h} width={w * 0.3} height={h} fill={`rgba(255,255,255,${hiOpacity})`} />
        <rect x={-w / 2} y={-h} width={w} height="4" fill="#fff8e7" opacity={capOpacity} />
    </g>
)

// A little open book resting flat on the shelf, with a ribbon bookmark
// draped down the spine. Given its own breathing room — sitting well clear
// of both the owl's book stack and the right-hand shelf cluster.
const OpenBook: React.FC<{ pageFill: string; lineStroke: string; spineFill: string; ribbonFill: string }> = ({
                                                                                                                 pageFill,
                                                                                                                 lineStroke,
                                                                                                                 spineFill,
                                                                                                                 ribbonFill,
                                                                                                             }) => (
    <g transform="translate(200 116)">
        <path
            d="M-40 -2 C-40 -15 -16 -11 0 -6 C16 -11 40 -15 40 -2 L40 5 C20 -1 10 1 0 3 C-10 1 -20 -1 -40 5 Z"
            fill={pageFill}
        />
        <path d="M-34 -8 C-24 -10 -12 -8 -3 -5" stroke={lineStroke} strokeWidth="1" fill="none" opacity="0.7" />
        <path d="M34 -8 C24 -10 12 -8 3 -5" stroke={lineStroke} strokeWidth="1" fill="none" opacity="0.7" />
        <rect x="-1.6" y="-8" width="3.2" height="12" fill={spineFill} />
        <path d="M-1.6 -8 L1.6 -8 L1.6 10 L0 6 L-1.6 10 Z" fill={ribbonFill} />
    </g>
)

// Two closed books lying flat and level (no tilt) that the owl stands on —
// drawn as front covers (a colored rect with a darker "pages edge" strip
// down one side and a thin title-line stroke) so they clearly read as
// books rather than an abstract plank. Includes its own soft contact
// shadow. This lives in the HTML content layer (not the background SVG) so
// it stays anchored directly under the owl icon.
const OwlBookStack: React.FC<{
    bottomFill: string
    bottomEdge: string
    topFill: string
    topEdge: string
    lineStroke: string
    lineOpacity: number
    shadowOpacity: number
}> = ({ bottomFill, bottomEdge, topFill, topEdge, lineStroke, lineOpacity, shadowOpacity }) => (
    <svg width="72" height="21" viewBox="0 0 88 26" className="-mt-1" aria-hidden="true">
        <ellipse cx="44" cy="24" rx="36" ry="2" fill={`rgba(0,0,0,${shadowOpacity})`} />
        <rect x="6" y="14" width="76" height="9" rx="2" fill={bottomFill} />
        <rect x="6" y="14" width="7" height="9" rx="1" fill={bottomEdge} />
        <line x1="26" y1="18.5" x2="64" y2="18.5" stroke={lineStroke} strokeWidth="1.4" opacity={lineOpacity} />
        <rect x="14" y="4" width="60" height="9" rx="2" fill={topFill} />
        <rect x="14" y="4" width="6" height="9" rx="1" fill={topEdge} />
        <line x1="30" y1="8.5" x2="58" y2="8.5" stroke={lineStroke} strokeWidth="1.3" opacity={lineOpacity} />
    </svg>
)

/**
 * Card header banner: a little bookshelf, with the owl standing on a small
 * stack of closed books instead of floating unanchored. The owl column is
 * bottom-anchored (`self-end` + a touch of padding) so the book stack sits
 * right on the shelf line drawn in the background SVG — previously it was
 * vertically centered independently of the shelf and visibly floated with
 * nothing connecting it to the ground.
 */
export const AuthHeaderBanner: React.FC<AuthHeaderBannerProps> = ({
                                                                      title = 'BasaQuest',
                                                                      subtitle = 'Sto. Niño Elementary School',
                                                                  }) => {
    return (
        <div className="relative h-32 overflow-hidden bg-gradient-to-b from-orange-100 via-orange-200 to-orange-400 transition-colors duration-700 dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950">
            {/* --- light mode bookshelf --- */}
            <svg
                className="absolute inset-0 h-full w-full opacity-100 transition-opacity duration-700 ease-in-out dark:opacity-0"
                viewBox="0 0 400 128"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                <rect x="0" y="112" width="400" height="16" fill="#a85c32" />
                <rect x="0" y="112" width="400" height="3" fill="#c98a55" />
                {SHELF_BOOKS.map((book, i) => (
                    <Book key={i} x={book.x} h={book.h} w={book.w} rot={book.rot} fill={SHELF_COLORS_LIGHT[i]} />
                ))}
                <OpenBook pageFill="#fff8e7" lineStroke="#d8b98a" spineFill="#c98a55" ribbonFill="#bc4749" />
            </svg>
            {/* --- dark mode bookshelf, moodier/darker palette --- */}
            <svg
                className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700 ease-in-out dark:opacity-100"
                viewBox="0 0 400 128"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                <rect x="0" y="112" width="400" height="16" fill="#161b2e" />
                <rect x="0" y="112" width="400" height="3" fill="#252c46" />
                {SHELF_BOOKS.map((book, i) => (
                    <Book
                        key={i}
                        x={book.x}
                        h={book.h}
                        w={book.w}
                        rot={book.rot}
                        fill={SHELF_COLORS_DARK[i]}
                        capOpacity={0.55}
                        hiOpacity={0.08}
                    />
                ))}
                <OpenBook pageFill="#d9cdb0" lineStroke="#b9ac8e" spineFill="#7a6c50" ribbonFill="#e0b83a" />
            </svg>
            {/* content */}
            <div className="relative z-10 flex h-full items-center gap-3 px-6">
                <div className="flex flex-col items-center self-end pb-2">
                    <Owl mood="neutral" size={58} bob />
                    <div className="dark:hidden">
                        <OwlBookStack
                            bottomFill="#8d5524"
                            bottomEdge="#6e421b"
                            topFill="#bc4749"
                            topEdge="#9c3438"
                            lineStroke="#fff8e7"
                            lineOpacity={0.55}
                            shadowOpacity={0.18}
                        />
                    </div>
                    <div className="hidden dark:block">
                        <OwlBookStack
                            bottomFill="#4a3d2f"
                            bottomEdge="#372e23"
                            topFill="#5a3f42"
                            topEdge="#432e30"
                            lineStroke="#cbbfa0"
                            lineOpacity={0.4}
                            shadowOpacity={0.35}
                        />
                    </div>
                </div>
                <div>
                    <div className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900 transition-colors duration-300 dark:text-gray-50">
                        {title}
                    </div>
                    <div className="text-xs font-semibold text-gray-700 transition-colors duration-300 dark:text-gray-200">{subtitle}</div>
                </div>
            </div>
        </div>
    )
}

export default AuthHeaderBanner