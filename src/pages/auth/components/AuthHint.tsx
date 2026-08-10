// File: src/pages/auth/components/AuthHint.tsx
import React from 'react'

interface AuthHintProps {
    side: 'left' | 'right'
    text: string
}

/**
 * Playful speech-bubble callout pointing up at a corner button (the theme
 * toggle or language toggle), used to onboard first-time/returning
 * visitors on the auth pages. `side="left"` anchors under the theme
 * toggle (top-left), `side="right"` anchors under the language toggle
 * (top-right) — matching where those buttons already sit in Login/Register.
 */
export const AuthHint: React.FC<AuthHintProps> = ({ side, text }) => {
    const sideClass = side === 'left' ? 'left-4' : 'right-4'
    const tailSideClass = side === 'left' ? 'left-3' : 'right-5'

    return (
        <div className={`absolute top-16 z-20 max-w-[180px] animate-hint-pop ${sideClass}`}>
            <div className="animate-hint-wiggle rounded-2xl border-2 border-orange-200 bg-white px-3.5 py-2 font-kid text-[13px] font-semibold leading-snug text-orange-700 shadow-lg transition-colors duration-300 dark:border-amber-400 dark:bg-slate-800 dark:text-amber-200">
                {text}
                <span
                    className={`absolute -top-[7px] h-3.5 w-3.5 rotate-45 rounded-sm border-l-2 border-t-2 border-orange-200 bg-white transition-colors duration-300 dark:border-amber-400 dark:bg-slate-800 ${tailSideClass}`}
                />
            </div>
        </div>
    )
}

export default AuthHint