// File: src/pages/admin/recording/session/layouts/AdminSessionHeader.tsx
// Stripped-down header for the fine-tune recording session screen — same
// idea as AssessmentSessionHeader.tsx, minus the bilingual strings and
// "acting as" badge (this admin tool has no language toggle anywhere
// else, so there's nothing to lock out beyond navigation). Just the brand
// mark, dark-mode toggle, and an Exit button with a confirmation, back to
// the student picker.
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useTheme } from '../../../../../contexts/ThemeContext'
import { Owl } from '../../../../../components/ui/Owl'
import { ThemeToggleButton } from '../../../../../components/buttons/ThemeToggleButton'
import { showConfirmation } from '../../../../../helpers/swalHelpers'
export default function AdminSessionHeader() {
    const navigate = useNavigate()
    const { theme } = useTheme()
    const handleExit = async () => {
        const confirmed = await showConfirmation(
            'Exit the recording session?',
            "You'll return to the student picker. Any unsaved take will be lost.",
            theme === 'dark',
            'warning',
            'Yes, exit',
        )
        if (confirmed) {
            navigate('/admin/recording')
        }
    }
    return (
        <header className="fixed inset-x-0 top-0 z-40 border-b border-gray-900/10 bg-orange-50/30 backdrop-blur-sm transition-colors duration-300 dark:border-gray-100/10 dark:bg-gray-950/35">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Owl mood="neutral" size={40} />
                    <div className="leading-tight">
                        <div className="text-lg font-extrabold text-gray-900 dark:text-gray-50">BasaQuest</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Learning Platform
                        </div>
                    </div>
                </div>
                <div className="flex-1" />
                <button
                    onClick={handleExit}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
                >
                    <LogOut size={16} />
                    Exit
                </button>
                <ThemeToggleButton />
            </div>
        </header>
    )
}