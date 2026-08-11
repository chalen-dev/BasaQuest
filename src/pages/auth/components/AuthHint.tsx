// File: src/pages/auth/components/AuthHint.tsx
import React from 'react'
import { X } from 'lucide-react'

interface AuthHintProps {
    side: 'left' | 'right'
    text: string
    onClose?: () => void
}

/**
 * Playful speech-bubble callout pointing up at a corner button (the theme
 * toggle or language toggle), used to onboard first-time/returning
 * visitors on the auth pages. `side="left"` anchors under the theme
 * toggle (top-left), `side="right"` anchors under the language toggle
 * (top-right) — matching where those buttons already sit in Login/Register.
 */
export const AuthHint: React.FC<AuthHintProps> = ({ side, text, onClose }) => {
    const sideClass = side === 'left' ? 'left-4' : 'right-4'
    const tailSideClass = side === 'left' ? 'left-3' : 'right-5'
    return (
        <div className={`absolute top-16 z-20 max-w-[220px] animate-hint-pop ${sideClass}`}>
            <div className="relative animate-hint-wiggle rounded-2xl border-2 border-orange-200 bg-white py-3 pl-4 pr-8 font-kid text-[15px] font-semibold leading-snug text-orange-700 shadow-lg transition-colors duration-300 dark:border-amber-400 dark:bg-slate-800 dark:text-amber-200">
                {text}
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close hint"
                        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-orange-400 transition-colors duration-200 hover:bg-orange-100 hover:text-orange-600 dark:text-amber-300 dark:hover:bg-slate-700 dark:hover:text-amber-100"
                    >
                        <X size={13} strokeWidth={3} />
                    </button>
                )}
                <span
                    className={`absolute -top-[7px] h-3.5 w-3.5 rotate-45 rounded-sm border-l-2 border-t-2 border-orange-200 bg-white transition-colors duration-300 dark:border-amber-400 dark:bg-slate-800 ${tailSideClass}`}
                />
            </div>
        </div>
    )
}

export default AuthHint