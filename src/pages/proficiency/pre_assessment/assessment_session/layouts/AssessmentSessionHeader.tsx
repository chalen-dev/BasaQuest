// File: src/pages/proficiency/pre_assessment/assessment_session/layouts/AssessmentSessionHeader.tsx
// Stripped-down header shown only during an active reading check-in session
// (once a language has been picked in PreAssessment.tsx). Deliberately has
// no nav links, no LangToggle, and no account menu — the point is to keep
// the teacher/pupil from navigating away or changing the assessment
// language mid-session. Only the brand mark, dark-mode toggle, and an Exit
// button remain.
//
// EXIT BEHAVIOR splits in two, based on reviewSaveHandler (passed down by
// AssessmentSessionLayout.tsx — see that file's own comment for the full
// wiring): when it's set, that means AssessmentSession.tsx's inline
// word-review step is actively showing, and there's nothing to warn
// about losing — Exit just saves the current review as a draft and
// leaves immediately, no confirmation popup. Every other step (intro,
// passage, recording, still-scoring) has no handler registered, so Exit
// falls back to the original "are you sure, the passage will be lost"
// confirmation before navigating.
//
// When a "Now" (one-device, teacher-run) session is active — see
// PreAssessment.tsx's handleStartNow — this also shows a small "Acting
// as: {name}" badge next to the brand mark, and Exit routes back to the
// student picker (/reading/proficiency/assessment) instead of the
// material list, so the teacher lands right back where they can pick the
// next student.
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'
import { useTheme } from '../../../../../contexts/ThemeContext'
import { useLang } from '../../../../../contexts/LangContext'
import { Owl } from '../../../../../components/ui/Owl'
import { ThemeToggleButton } from '../../../../../components/buttons/ThemeToggleButton'
import { showConfirmation } from '../../../../../helpers/swalHelpers'
import type { Lang } from '../../../../../components/buttons/LangToggle'
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
type AssessmentSessionHeaderProps = {
    reviewSaveHandler: (() => Promise<void>) | null
}
export default function AssessmentSessionHeader({ reviewSaveHandler }: AssessmentSessionHeaderProps) {
    const navigate = useNavigate()
    const { theme } = useTheme()
    const { lang } = useLang()
    const [searchParams] = useSearchParams()
    const et = EXIT_STRINGS[lang]
    const studentName = searchParams.get('studentName')
    const isAssisted = !!searchParams.get('studentId')
    const handleExit = async () => {
        const exitDestination = isAssisted ? '/reading/proficiency/assessment' : '/reading/proficiency'
        // Actively reviewing: save-and-leave, no dialog — nothing here is
        // actually being lost, so there's nothing to confirm. A failed
        // save is logged, not blocked on — matches how other failures in
        // this app degrade (console.error only), and a teacher stuck
        // unable to leave the screen would be worse than a dropped draft.
        if (reviewSaveHandler) {
            try {
                await reviewSaveHandler()
            } catch (err) {
                console.error('AssessmentSessionHeader: failed to save draft on exit', err)
            }
            navigate(exitDestination)
            return
        }
        const confirmed = await showConfirmation(et.title, et.text, theme === 'dark', 'warning', et.confirm)
        if (confirmed) {
            navigate(exitDestination)
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