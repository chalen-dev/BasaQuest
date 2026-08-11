// File: src/components/ui/Tooltip.tsx
import React, { useState } from 'react'

interface TooltipProps {
    label: string
    children: React.ReactNode
    position?: 'top' | 'bottom'
}

// Small, dependency-free tooltip — shows a dark pill above (or below,
// via `position`) whatever it wraps on hover/focus. Built for icon-only
// buttons (StudentRow's login-as/edit/disable/delete icons) where the
// action isn't otherwise labeled on screen. Defaults to "top" since
// that's right for a roster row with room above it; header buttons sit
// right at the top edge of the viewport, so they pass position="bottom"
// instead — a tooltip rendered above them would be clipped off-screen.
export const Tooltip: React.FC<TooltipProps> = ({ label, children, position = 'top' }) => {
    const [visible, setVisible] = useState(false)
    return (
        <span
            className="relative inline-flex"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
        >
            {children}
            <span
                role="tooltip"
                className={`pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-bold text-white shadow-lg transition-opacity duration-150 dark:bg-gray-700 ${
                    position === 'bottom' ? 'top-full mt-2' : '-top-9'
                } ${visible ? 'opacity-100' : 'opacity-0'}`}
            >
                {label}
            </span>
        </span>
    )
}

export default Tooltip