// File: src/pages/students/remediation/session/RemediationSessionHeader.tsx
//
// Stripped-down header for an active remediation session — same
// "no nav, just Exit" pattern AssessmentSessionHeader.tsx uses during a
// reading check-in, reused here since a teacher drilling a pupil
// through their flagged words shouldn't be able to wander off into the
// rest of the app mid-session either.
//
// EXIT IS SIMPLE, NO CONFIRMATION: unlike AssessmentSessionHeader's
// Exit (which has to choose between a silent save-and-leave or a
// confirm dialog depending on what's active), nothing here is ever at
// risk of being lost — every practiced toggle persists immediately (see
// RemediationSession.tsx's own comment), so there's nothing to warn
// about. Exit just navigates straight back to the pupil's remediation
// list.
import { useNavigate, useParams } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'
import { Owl } from '../../../../../components/ui/Owl.tsx'
import { ThemeToggleButton } from '../../../../../components/buttons/ThemeToggleButton.tsx'
import { useLang } from '../../../../../contexts/LangContext.tsx'
import type { Lang } from '../../../../../components/buttons/LangToggle.tsx'
const TAGLINE: Record<Lang, string> = {
    fil: 'Plataporma ng Pagkatuto',
    en: 'Learning Platform',
}
const STRINGS: Record<Lang, { exit: string; forLabel: string }> = {
    fil: { exit: 'Lumabas', forLabel: 'Para kay' },
    en: { exit: 'Exit', forLabel: 'For' },
}
type RemediationSessionHeaderProps = {
    studentName: string | null
}
export default function RemediationSessionHeader({ studentName }: RemediationSessionHeaderProps) {
    const navigate = useNavigate()
    const { lang } = useLang()
    const { studentId } = useParams<{ studentId: string }>()
    const t = STRINGS[lang]
    return (
        <header className="fixed inset-x-0 top-0 z-40 border-b border-gray-900/10 bg-orange-50/30 backdrop-blur-sm transition-colors duration-300 dark:border-gray-100/10 dark:bg-gray-950/35">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Owl mood="neutral" size={40} />
                    <div className="leading-tight">
                        <div className="text-lg font-extrabold text-gray-900 dark:text-gray-50">BasaQuest</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {TAGLINE[lang]}
                        </div>
                    </div>
                </div>
                {studentName && (
                    <span className="hidden items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-400/15 dark:text-purple-300 sm:flex">
                        <UserRound size={13} />
                        {t.forLabel} {studentName}
                    </span>
                )}
                <div className="flex-1" />
                <button
                    onClick={() => navigate(`/students/remediation/${studentId}`)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
                >
                    <LogOut size={16} />
                    {t.exit}
                </button>
                <ThemeToggleButton />
            </div>
        </header>
    )
}