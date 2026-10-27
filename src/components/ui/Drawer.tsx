// File: src/components/ui/Drawer.tsx
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface DrawerProps {
    open: boolean
    onClose: () => void
    title: string
    subtitle?: string
    icon?: React.ReactNode
    children: React.ReactNode
}

// Generic slide-in side panel — backdrop + panel sliding in from the
// right, closes on Escape or backdrop click. Kept generic (no student-
// specific knowledge) so it can be reused anywhere else in the app that
// needs an "edit this thing" or "add this thing" panel instead of a
// permanently-docked sidebar.
//
// Rendered on document.body and starting at the very top of the viewport, so
// it always sits above the fixed app header (which the page layout would
// otherwise keep it underneath) whatever height that header is, with the
// header dimmed behind the backdrop.
export const Drawer: React.FC<DrawerProps> = ({ open, onClose, title, subtitle, icon, children }) => {
    useEffect(() => {
        if (!open) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [open, onClose])

    return createPortal(
        <>
            <div
                aria-hidden="true"
                onClick={onClose}
                className={`fixed inset-0 z-[100] cursor-pointer bg-gray-950/50 transition-opacity duration-300 ${
                    open ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-hidden={!open}
                className={`fixed inset-y-0 right-0 z-[101] w-full max-w-lg transform bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-gray-900 ${
                    open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
                }`}
            >
                <div className="flex h-full flex-col">
                    <div className="flex items-center gap-3 border-b border-gray-900/5 px-6 py-5 dark:border-gray-100/10">
                        {icon}
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{title}</h2>
                            {subtitle && <p className="text-sm font-medium text-gray-500 dark:text-gray-300">{subtitle}</p>}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-gray-900/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-100/10 dark:hover:text-gray-50"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
                </div>
            </div>
        </>,
        document.body,
    )
}

export default Drawer