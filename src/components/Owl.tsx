
import React from 'react'

type OwlMood = 'greeting' | 'happy' | 'proud'

interface OwlProps {
    mood?: OwlMood
    size?: number
    bob?: boolean
    className?: string
}

const BEAKS: Record<OwlMood, 'smile' | 'open'> = {
    greeting: 'smile',
    happy: 'smile',
    proud: 'smile',
}

export const Owl: React.FC<OwlProps> = ({ mood = 'greeting', size = 64, bob = false, className = '' }) => {
    const beak = BEAKS[mood] ?? 'smile'

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 200 200"
            role="img"
            aria-label="BasaQuest owl mascot"
            className={`${bob ? 'animate-bounce' : ''} ${className}`}
        >
            <path d="M62 58 Q50 30 74 40 Z" className="fill-teal-700 dark:fill-teal-800" />
            <path d="M138 58 Q150 30 126 40 Z" className="fill-teal-700 dark:fill-teal-800" />
            <ellipse cx="100" cy="118" rx="66" ry="70" className="fill-teal-500 dark:fill-teal-600" />
            <ellipse
                cx="100"
                cy="118"
                rx="66"
                ry="70"
                fill="none"
                className="stroke-teal-700 dark:stroke-teal-900"
                strokeWidth="3"
            />
            <path d="M40 108 Q26 128 44 158 Q52 140 52 118 Z" className="fill-teal-600 dark:fill-teal-700" />
            <path d="M160 108 Q174 128 156 158 Q148 140 148 118 Z" className="fill-teal-600 dark:fill-teal-700" />
            <path
                d="M100 74 Q150 78 148 132 Q140 176 100 178 Q60 176 52 132 Q50 78 100 74 Z"
                className="fill-amber-200 dark:fill-amber-300"
            />
            <g className="stroke-amber-500" strokeWidth="2.4" fill="none" opacity="0.7" strokeLinecap="round">
                <path d="M74 104 Q86 116 100 104 Q114 116 126 104" />
                <path d="M70 128 Q84 140 100 128 Q116 140 130 128" />
            </g>
            <circle cx="76" cy="86" r="30" className="fill-white dark:fill-gray-100" stroke="#e6d6bd" strokeWidth="2" />
            <circle cx="124" cy="86" r="30" className="fill-white dark:fill-gray-100" stroke="#e6d6bd" strokeWidth="2" />
            <circle cx="76" cy="88" r="16" fill="#fff" stroke="#2b2438" strokeWidth="2" />
            <circle cx="124" cy="88" r="16" fill="#fff" stroke="#2b2438" strokeWidth="2" />
            <circle cx="79" cy="90" r="8" fill="#2b2438" />
            <circle cx="121" cy="90" r="8" fill="#2b2438" />
            <circle cx="82" cy="87" r="2.6" fill="#fff" />
            <circle cx="124" cy="87" r="2.6" fill="#fff" />
            <g stroke="#2b2438" strokeWidth="3.5" strokeLinecap="round">
                <line x1="62" y1="68" x2="90" y2="72" />
                <line x1="138" y1="68" x2="110" y2="72" />
            </g>
            {beak === 'smile' ? (
                <path d="M92 100 Q100 114 108 100 Q100 106 92 100 Z" fill="#ff9b3d" stroke="#e07b1f" strokeWidth="1.5" />
            ) : (
                <path d="M92 100 Q100 122 108 100 Q100 108 92 100 Z" fill="#ff9b3d" stroke="#e07b1f" strokeWidth="1.5" />
            )}
            <circle cx="60" cy="102" r="7" fill="#ff7a59" opacity="0.5" />
            <circle cx="140" cy="102" r="7" fill="#ff7a59" opacity="0.5" />
            <g stroke="#f0a91f" strokeWidth="5" strokeLinecap="round" fill="none">
                <line x1="84" y1="182" x2="74" y2="196" />
                <line x1="84" y1="182" x2="84" y2="200" />
                <line x1="84" y1="182" x2="94" y2="196" />
                <line x1="116" y1="182" x2="106" y2="196" />
                <line x1="116" y1="182" x2="116" y2="200" />
                <line x1="116" y1="182" x2="126" y2="196" />
            </g>
            <circle cx="84" cy="182" r="4" fill="#f0a91f" />
            <circle cx="116" cy="182" r="4" fill="#f0a91f" />
            <g transform="translate(120 150) rotate(-12)">
                <rect x="-4" y="-2" width="34" height="24" rx="3" fill="#ff7a59" stroke="#e85f3d" strokeWidth="2" />
                <rect x="-1" y="0" width="14" height="20" rx="2" fill="#fffdf8" />
                <rect x="14" y="0" width="14" height="20" rx="2" fill="#fff3dd" />
                <line x1="13" y1="0" x2="13" y2="20" stroke="#e6d6bd" strokeWidth="1.5" />
            </g>
        </svg>
    )
}

export default Owl