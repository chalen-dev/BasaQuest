// Stripped-down header shown only during an active reading check-in session
// (once a language has been picked in PreAssessment.tsx). Deliberately has
// no nav links, no LangToggle, and no account menu — the point is to keep
// the teacher/pupil from navigating away or changing the assessment
// language mid-session. Only the brand mark, dark-mode toggle, and an Exit
// button (with a confirmation, since this ends the check-in) remain.
//
// When a "Now" (one-device, teacher-run) session is active — see
// PreAssessment.tsx's handleStartNow — this also shows a small "Acting
// as: {name}" badge next to the brand mark, and Exit routes back to the
// student picker (/reading/proficiency/assessment) instead of the
// material list, so the teacher lands right back where they can pick the
// next student.
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useLang } from '../../contexts/LangContext'
import { Owl } from '../ui/Owl'
import { ThemeToggleButton } from '../buttons/ThemeToggleButton'
import { showConfirmation } from '../../helpers/swalHelpers'
import type { Lang } from '../buttons/LangToggle'

const TAGLINE: Record<Lang, string> = {
    fil: 'Plataporma ng Pagkatuto',
    en: 'Learning Platform',
}

const ASSISTED_LABEL: Record<Lang, string> = {
    fil: 'Para kay',
    en: 'For',
}

const EXIT_STRINGS: Record<Lang, { label: string; title: string; text: string; confirm: string }> = {
    fil: {
        label: 'Lumabas',
        title: 'Lumabas sa pagsusuri?',
        text: 'Mawawala ang kasalukuyang talata. Puwede kang bumalik at magsimula ulit.',
        confirm: 'Oo, lumabas',
    },
    en: {
        label: 'Exit',
        title: 'Exit the check-in?',
        text: 'The current passage will be lost. You can come back and start again.',
        confirm: 'Yes, exit',
    },
}

export default function AssessmentSessionHeader() {
    const navigate = useNavigate()
    const { theme } = useTheme()
    const { lang } = useLang()
    const [searchParams] = useSearchParams()
    const et = EXIT_STRINGS[lang]
    const studentName = searchParams.get('studentName')
    const isAssisted = !!searchParams.get('studentId')

    const handleExit = async () => {
        const confirmed = await showConfirmation(et.title, et.text, theme === 'dark', 'warning', et.confirm)
        if (confirmed) {
            navigate(isAssisted ? '/reading/proficiency/assessment' : '/reading/proficiency')
        }
    }

    return (
        <header className="fixed inset-x-0 top-0 z-40 border-b border-gray-900/10 bg-orange-50/30 backdrop-blur-sm transition-colors duration-300 dark:border-gray-100/10 dark:bg-gray-950/35">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Owl mood="greeting" size={40} />
                    <div className="leading-tight">
                        <div className="text-lg font-extrabold text-gray-900 dark:text-gray-50">BasaQuest</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {TAGLINE[lang]}
                        </div>
                    </div>
                </div>
                {isAssisted && studentName && (
                    <span className="hidden items-center gap-1.5 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-bold text-teal-700 dark:bg-teal-400/15 dark:text-teal-300 sm:flex">
                        <UserRound size={13} />
                        {ASSISTED_LABEL[lang]} {studentName}
                    </span>
                )}
                <div className="flex-1" />
                <button
                    onClick={handleExit}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
                >
                    <LogOut size={16} />
                    {et.label}
                </button>
                <ThemeToggleButton />
            </div>
        </header>
    )
}