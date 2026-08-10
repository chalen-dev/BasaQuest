// File: src/components/OwlLoader.tsx

import React from 'react'
import { Owl } from './Owl.tsx'

interface OwlLoaderProps {
    /** Message shown under the owl. Set to '' to hide it. */
    message?: string
    /** Pixel size of the owl artwork. */
    size?: number
    /** Covers the whole viewport with a centered, blurred backdrop. */
    fullScreen?: boolean
    className?: string
}

/**
 * A loading indicator that swaps the usual spinner for the BasaQuest owl —
 * it floats gently, flaps its wings, and blinks while you wait.
 *
 * Usage:
 *   <OwlLoader />                                // inline, drops into a card/section
 *   <OwlLoader message="Fetching your quests…" /> // custom copy
 *   <OwlLoader fullScreen />                      // full-page overlay (route/auth loading)
 */
export const OwlLoader: React.FC<OwlLoaderProps> = ({
    message = 'Loading…',
    size = 96,
    fullScreen = false,
    className = '',
}) => {
    const content = (
        <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
            <div className="animate-owl-float">
                <Owl mood="loading" size={size} animated />
            </div>

            {message && (
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-teal-700 dark:text-teal-300">{message}</span>
                    <span className="flex items-end gap-1" aria-hidden="true">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-owl-dot" style={{ animationDelay: '0s' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-owl-dot" style={{ animationDelay: '0.15s' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-owl-dot" style={{ animationDelay: '0.3s' }} />
                    </span>
                </div>
            )}
        </div>
    )

    if (!fullScreen) return content

    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm"
        >
            {content}
        </div>
    )
}

export default OwlLoader
