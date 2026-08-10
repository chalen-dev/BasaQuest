// File: src/components/backgrounds/HillsideBackdrop.tsx
import React from 'react'

const STARS = [
    { x: 120, y: 120, r: 1.2, delay: '0s' },
    { x: 420, y: 260, r: 1, delay: '0.6s' },
    { x: 760, y: 160, r: 1.2, delay: '1.1s' },
    { x: 230, y: 400, r: 0.9, delay: '1.6s' },
    { x: 1250, y: 220, r: 1, delay: '0.3s' },
    { x: 1000, y: 420, r: 0.8, delay: '2s' },
    { x: 600, y: 460, r: 0.95, delay: '0.9s' },
    { x: 1450, y: 460, r: 0.8, delay: '1.4s' },
    { x: 80, y: 300, r: 0.9, delay: '0.4s' },
    { x: 1550, y: 340, r: 0.8, delay: '1.8s' },
    { x: 880, y: 90, r: 0.8, delay: '0.7s' },
    { x: 340, y: 90, r: 0.8, delay: '1.2s' },
]

// Clouds now spawn off-screen to the left (startX is well beyond the
// viewBox's left edge) and travel the full width of the scene before
// looping back to the start — instead of the old small side-to-side
// wobble. Different durations per cloud (and negative delays, which make
// a CSS animation start already partway through its cycle) so they drift
// at different speeds and are staggered rather than moving in lockstep.
const CLOUDS = [
    { startX: -300, y: 170, scale: 1, opacity: { light: 0.75, dark: 0.55 }, duration: '52s', delay: '-4s' },
    { startX: -300, y: 260, scale: 0.75, opacity: { light: 0.6, dark: 0.4 }, duration: '68s', delay: '-34s' },
    { startX: -300, y: 340, scale: 0.9, opacity: { light: 0.7, dark: 0.5 }, duration: '60s', delay: '-18s' },
]

// A pine-tree silhouette (two stacked triangles + a trunk).
const PineTree: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <path d="M0 -46 L14 -14 L-14 -14 Z" />
        <path d="M0 -32 L16 0 L-16 0 Z" />
        <rect x="-3" y="0" width="6" height="10" />
    </g>
)

// Ground scenery along the nearest hill: dense forest clusters on the left
// and right, a couple of stray trees in between, and big open clear-plain
// gaps with nothing at all — instead of two lone symmetric tree pairs.
const TREES = [
    // forest cluster, left
    { x: 90, y: 800, scale: 1 },
    { x: 120, y: 812, scale: 0.8 },
    { x: 150, y: 795, scale: 1.15 },
    { x: 180, y: 808, scale: 0.7 },
    { x: 60, y: 815, scale: 0.6 },
    // clear plain: nothing from ~x260 to x520
    // small stray pair
    { x: 560, y: 818, scale: 0.7 },
    { x: 590, y: 810, scale: 0.8 },
    // clear plain: nothing from ~x650 to x1100
    // forest cluster, right
    { x: 1150, y: 805, scale: 0.95 },
    { x: 1180, y: 815, scale: 0.65 },
    { x: 1210, y: 798, scale: 1.1 },
    { x: 1330, y: 815, scale: 0.95 },
    { x: 1360, y: 825, scale: 0.7 },
    { x: 1390, y: 808, scale: 0.85 },
    { x: 1420, y: 818, scale: 0.6 },
    // clear plain: nothing from x1450 to the edge
]

// Flat, four-lobed cloud blob. `startX` places it off-screen to the left;
// `animate-cloud-drift` carries it all the way across and back off-screen
// to the right, then the animation loops (jumping invisibly back to the
// off-screen starting position).
const Cloud: React.FC<{
    startX: number
    y: number
    scale: number
    opacity: number
    duration: string
    delay: string
    fill: string
}> = ({ startX, y, scale, opacity, duration, delay, fill }) => (
    <g transform={`translate(${startX} ${y})`}>
        <g
            className="animate-cloud-drift"
            style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDuration: duration, animationDelay: delay }}
        >
            <g transform={`scale(${scale})`} fill={fill} opacity={opacity}>
                <ellipse cx="0" cy="10" rx="46" ry="20" />
                <ellipse cx="-32" cy="14" rx="26" ry="15" />
                <ellipse cx="34" cy="16" rx="30" ry="16" />
                <ellipse cx="4" cy="-4" rx="30" ry="18" />
            </g>
        </g>
    </g>
)

/**
 * Full-bleed sky + clouds + mountains + rolling hills, used as ambient
 * background behind guest-facing screens (login/register). Layered for
 * depth: clouds drifting all the way across the scene, a hazy distant
 * mountain range, a nearer/darker mountain range, then three rolling
 * foreground hill bands with forest clusters and clear plains along the
 * nearest one. This part is allowed to scale up and crop at the edges
 * ("cover" behavior) since it's ambient — the sun/moon is NOT drawn in
 * here (see `SunMoon` below) because that needs to stay in a fixed
 * on-screen spot regardless of viewport aspect ratio.
 */
const SkyAndHills: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
        aria-hidden="true"
    >
        <defs>
            <linearGradient id="hillsideSkyLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff6e5" />
                <stop offset="55%" stopColor="#ffe9c2" />
                <stop offset="100%" stopColor="#ffd48f" />
            </linearGradient>
            <linearGradient id="hillsideSkyDark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0b1330" />
                <stop offset="55%" stopColor="#141c45" />
                <stop offset="100%" stopColor="#1b2456" />
            </linearGradient>
        </defs>

        {/* sky */}
        <rect width="1600" height="900" fill="url(#hillsideSkyLight)" className="dark:hidden" />
        <rect width="1600" height="900" fill="url(#hillsideSkyDark)" className="hidden dark:block" />

        {/* stars — dark mode only, spread across the whole sky, not just the top */}
        <g fill="#ffe9a8" className="hidden dark:block">
            {STARS.map((star, i) => (
                <g key={i} transform={`translate(${star.x} ${star.y})`}>
                    <path
                        d={`M0 0 l${star.r * 3.6} ${star.r * 8.4} ${star.r * 8.4} ${star.r * 3.6} -${star.r * 8.4} ${star.r * 3.6} -${star.r * 3.6} ${star.r * 8.4} -${star.r * 3.6} -${star.r * 8.4} -${star.r * 8.4} -${star.r * 3.6} ${star.r * 8.4} -${star.r * 3.6} Z`}
                        className="animate-twinkle"
                        style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: star.delay }}
                    />
                </g>
            ))}
        </g>

        {/* clouds — spawn off-screen left, drift the full width, loop */}
        {CLOUDS.map((cloud, i) => (
            <Cloud
                key={`cloud-light-${i}`}
                startX={cloud.startX}
                y={cloud.y}
                scale={cloud.scale}
                opacity={cloud.opacity.light}
                duration={cloud.duration}
                delay={cloud.delay}
                fill="#ffffff"
            />
        ))}
        <g className="hidden dark:block">
            {CLOUDS.map((cloud, i) => (
                <Cloud
                    key={`cloud-dark-${i}`}
                    startX={cloud.startX}
                    y={cloud.y}
                    scale={cloud.scale}
                    opacity={cloud.opacity.dark}
                    duration={cloud.duration}
                    delay={cloud.delay}
                    fill="#2a355c"
                />
            ))}
        </g>

        {/* distant mountain range — soft rounded peaks (quadratic curves, not
            sharp zigzags) to stay consistent with the app's flat paper-cut
            illustration style, hazier/lighter to read as "further away" */}
        <path
            d="M0 560 Q80 470 160 440 Q230 480 300 540 Q365 420 430 400 Q525 470 620 560 Q690 460 760 450 Q830 490 900 560 Q980 430 1060 415 Q1150 480 1240 560 Q1310 470 1380 470 Q1490 510 1600 560 V900 H0 Z"
            fill="#ffd8a0"
            opacity="0.85"
            className="dark:hidden"
        />
        <path
            d="M0 560 Q80 470 160 440 Q230 480 300 540 Q365 420 430 400 Q525 470 620 560 Q690 460 760 450 Q830 490 900 560 Q980 430 1060 415 Q1150 480 1240 560 Q1310 470 1380 470 Q1490 510 1600 560 V900 H0 Z"
            fill="#1a2350"
            opacity="0.75"
            className="hidden dark:block"
        />

        {/* nearer mountain range — darker, a bit taller */}
        <path
            d="M0 620 Q100 500 200 490 Q280 540 360 600 Q440 460 520 450 Q610 520 700 610 Q790 480 880 480 Q970 550 1060 610 Q1160 460 1260 460 Q1350 530 1440 610 Q1520 550 1600 540 V900 H0 Z"
            fill="#f3c383"
            className="dark:hidden"
        />
        <path
            d="M0 620 Q100 500 200 490 Q280 540 360 600 Q440 460 520 450 Q610 520 700 610 Q790 480 880 480 Q970 550 1060 610 Q1160 460 1260 460 Q1350 530 1440 610 Q1520 550 1600 540 V900 H0 Z"
            fill="#131a3f"
            className="hidden dark:block"
        />

        {/* rolling foreground hills — gentle waves, low amplitude */}
        <path d="M0 700 Q400 670 800 695 T1600 685 V900 H0 Z" fill="#f3cf8e" className="dark:hidden" />
        <path d="M0 700 Q400 670 800 695 T1600 685 V900 H0 Z" fill="#141b3d" className="hidden dark:block" />

        <path d="M0 760 Q420 735 840 755 T1600 745 V900 H0 Z" fill="#e8b56a" className="dark:hidden" />
        <path d="M0 760 Q420 735 840 755 T1600 745 V900 H0 Z" fill="#0e1430" className="hidden dark:block" />

        <path d="M0 830 Q460 810 880 825 T1600 818 V900 H0 Z" fill="#d69a4c" className="dark:hidden" />
        <path d="M0 830 Q460 810 880 825 T1600 818 V900 H0 Z" fill="#080b20" className="hidden dark:block" />

        {/* forest clusters + clear plains dotting the nearest hill */}
        <g fill="#8a5a2c" className="dark:hidden">
            {TREES.map((tree, i) => (
                <PineTree key={i} x={tree.x} y={tree.y} scale={tree.scale} />
            ))}
        </g>
        <g fill="#050813" className="hidden dark:block">
            {TREES.map((tree, i) => (
                <PineTree key={i} x={tree.x} y={tree.y} scale={tree.scale} />
            ))}
        </g>
    </svg>
)

/**
 * Sun (light mode) / crescent moon (dark mode), pinned to the top-right
 * corner with plain CSS positioning instead of being drawn inside the
 * cover-scaled sky SVG, so it's always in the same on-screen spot no
 * matter the window's aspect ratio.
 *
 * The glow behind each shape is a BLURRED COPY of the shape itself (via an
 * SVG feGaussianBlur filter), not a separate low-opacity full circle. That
 * matters for the moon in particular: a flat translucent circle sitting
 * behind the crescent rendered as a hard-edged dark-gray disc (low-opacity
 * warm yellow blended over the dark navy background desaturates almost to
 * neutral gray), which looked like a mysterious flat-bottomed shape
 * overlapping the moon, and was centered on the invisible full disc rather
 * than the visually-offset crescent sliver. Blurring a copy of the crescent
 * itself means the light has no hard edge and hugs the actual visible
 * shape, so it reads as a soft glow that's naturally centered on the moon.
 */
const SunMoon: React.FC = () => (
    <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute right-6 top-6 h-16 w-16 sm:right-10 sm:top-10 sm:h-20 sm:w-20 lg:h-24 lg:w-24"
        aria-hidden="true"
    >
        <defs>
            <mask id="hillsideMoonMask">
                <rect width="100" height="100" fill="black" />
                <circle cx="50" cy="50" r="36" fill="white" />
                <circle cx="66" cy="38" r="31" fill="black" />
            </mask>
            <filter id="hillsideGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="5.5" />
            </filter>
        </defs>

        {/* sun, bigger disc + radiating rays */}
        <g className="dark:hidden">
            <g
                opacity="0.55"
                filter="url(#hillsideGlow)"
                className="animate-halo-pulse"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
                <circle cx="50" cy="50" r="34" fill="#ffb84d" />
            </g>
            <g stroke="#ffb84d" strokeWidth="4.5" strokeLinecap="round">
                <line x1="50" y1="2" x2="50" y2="13" />
                <line x1="50" y1="87" x2="50" y2="98" />
                <line x1="2" y1="50" x2="13" y2="50" />
                <line x1="87" y1="50" x2="98" y2="50" />
                <line x1="15" y1="15" x2="23" y2="23" />
                <line x1="77" y1="77" x2="85" y2="85" />
                <line x1="85" y1="15" x2="77" y2="23" />
                <line x1="23" y1="77" x2="15" y2="85" />
            </g>
            <circle cx="50" cy="50" r="34" fill="#ffb84d" />
        </g>

        {/* vibrant yellow crescent moon, bigger disc */}
        <g className="hidden dark:block">
            <g
                opacity="0.65"
                filter="url(#hillsideGlow)"
                className="animate-halo-pulse"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
                <g mask="url(#hillsideMoonMask)">
                    <circle cx="50" cy="50" r="36" fill="#ffe066" />
                </g>
            </g>
            <g mask="url(#hillsideMoonMask)">
                <circle cx="50" cy="50" r="36" fill="#ffe066" />
            </g>
        </g>
    </svg>
)

export const HillsideBackdrop: React.FC<{ className?: string }> = ({ className = '' }) => (
    <>
        <SkyAndHills className={className} />
        <SunMoon />
    </>
)

export default HillsideBackdrop