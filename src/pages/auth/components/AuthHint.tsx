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
 * visitors on the auth pages. Rendered inside GuestHeader, nested in a
 * small `relative` wrapper right next to its button — `top-full mt-2`
 * anchors it directly beneath that wrapper regardless of where the
 * header itself sits on the page, rather than assuming a fixed page-wide
 * offset. `side="left"` = theme toggle, `side="right"` = language toggle.
 */
export const AuthHint: React.FC<AuthHintProps> = ({ side, text, onClose }) => {
    const sideClass = side === 'left' ? 'left-0' : 'right-0'
    const tailSideClass = side === 'left' ? 'left-3' : 'right-5'
    return (
        <div className={`absolute top-full z-20 mt-2 max-w-[220px] animate-hint-pop ${sideClass}`}>
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