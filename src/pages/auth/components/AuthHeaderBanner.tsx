import React, { useId } from 'react'
import { Owl } from '../../../components/Owl'

interface AuthHeaderBannerProps {
    title?: string
    subtitle?: string
}

export const AuthHeaderBanner: React.FC<AuthHeaderBannerProps> = ({
                                                                      title = 'BasaQuest',
                                                                      subtitle = 'Sto. Niño Elementary School',
                                                                  }) => {
    const moonMaskId = useId()

    return (
        <div className="relative h-32 overflow-hidden bg-gradient-to-b from-orange-100 via-orange-200 to-orange-400 transition-colors duration-700 dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950">
            {/* --- daytime sky: sun + rays + hills --- */}
            <svg
                className="absolute inset-0 h-full w-full opacity-100 transition-opacity duration-700 ease-in-out dark:opacity-0"
                viewBox="0 0 400 128"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                <g transform="translate(336, 34)">
                    <circle r="34" className="fill-orange-300/80" />
                    <line x1="0" y1="-40" x2="0" y2="-54" transform="rotate(-55)" className="stroke-orange-300/70" strokeWidth="4" strokeLinecap="round" />
                    <line x1="0" y1="-40" x2="0" y2="-52" transform="rotate(-15)" className="stroke-orange-300/70" strokeWidth="4" strokeLinecap="round" />
                    <line x1="0" y1="-40" x2="0" y2="-54" transform="rotate(28)" className="stroke-orange-300/70" strokeWidth="4" strokeLinecap="round" />
                    <line x1="0" y1="-40" x2="0" y2="-52" transform="rotate(65)" className="stroke-orange-300/70" strokeWidth="4" strokeLinecap="round" />
                </g>
                <path
                    d="M0,128 L0,92 C80,62 160,108 240,90 C310,75 360,92 400,80 L400,128 Z"
                    className="fill-orange-400"
                />
                <path d="M0,128 L400,128 L400,112 L0,112 Z" className="fill-orange-500" />
            </svg>

            {/* --- night sky: moon + stars + hills --- */}
            <svg
                className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700 ease-in-out dark:opacity-100"
                viewBox="0 0 400 128"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                <defs>
                    <mask id={moonMaskId}>
                        {/* white = visible, black = cut out (true transparency, not a fake color) */}
                        <circle cx="336" cy="34" r="26" fill="white" />
                        <circle cx="346" cy="26" r="22" fill="black" />
                    </mask>
                </defs>

                <circle cx="336" cy="34" r="46" className="fill-indigo-400/10" />
                <circle cx="336" cy="34" r="26" className="fill-indigo-100" mask={`url(#${moonMaskId})`} />

                <circle cx="60" cy="20" r="1.6" className="fill-indigo-100/80" />
                <circle cx="120" cy="45" r="1.2" className="fill-indigo-100/60" />
                <circle cx="180" cy="16" r="1.8" className="fill-indigo-100/70" />
                <circle cx="230" cy="50" r="1.3" className="fill-indigo-100/50" />
                <circle cx="270" cy="22" r="1.4" className="fill-indigo-100/70" />
                <circle cx="20" cy="55" r="1.2" className="fill-indigo-100/50" />
                <path
                    d="M0,128 L0,92 C80,62 160,108 240,90 C310,75 360,92 400,80 L400,128 Z"
                    className="fill-slate-800"
                />
                <path d="M0,128 L400,128 L400,112 L0,112 Z" className="fill-slate-900" />
            </svg>

            {/* content */}
            <div className="relative z-10 flex h-full items-center gap-3 px-6">
                <Owl mood="greeting" size={58} bob />
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