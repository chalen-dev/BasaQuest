// File: src/pages/students/remediation/coach/layout/RemediationCoachLayout.tsx
//
// Reading Coach Mode's own layout — replaces RemediationSessionLayout for
// this one route only. Coach Mode is a full-bleed table+book scene
// (CoachTableBackdrop's own fixed fullscreen SVG), so it can't share
// RemediationSessionLayout's header: that header reserves vertical space
// (a fixed bar plus pt-24 on <main>), and RemediationCoach.tsx's content
// was having to work around that reserved space instead of just filling
// the screen edge to edge.
//
// This layout is intentionally almost nothing: no header, no nav, no
// student-name pill. Just two floating controls the old header used to
// provide, that Coach Mode still needs access to even with no header:
//   - Exit (top-left) — same destination as the old header's Exit button
//     (back to this pupil's remediation list). Deliberately a plain
//     icon-only floating circle rather than the old labeled pill, per
//     explicit product decision, to match the minimal/floating feel of
//     the reference mockup instead of importing a chrome-y header button
//     into a full-bleed scene.
//   - Day/Night toggle (top-right) — reuses the existing
//     ThemeToggleButton exactly as-is (no visual rework requested), just
//     floated instead of living inside a header bar. This is the ONLY
//     way to reach the theme toggle on this route now that the shared
//     header (which used to render one) is gone.
// No word-counter pill lives here either — RemediationCoach.tsx used to
// render one of those itself, positioned to sit below the old header;
// that's deliberately dropped for now, not part of this pass.
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { ThemeToggleButton } from '../../../../../components/buttons/ThemeToggleButton.tsx'

export default function RemediationCoachLayout() {
    const navigate = useNavigate()
    const { studentId } = useParams<{ studentId: string }>()

    return (
        <div className="relative h-dvh w-full overflow-hidden">
            <button
                type="button"
                onClick={() => navigate(`/students/remediation/${studentId}`)}
                aria-label="Exit"
                className="fixed left-4 top-4 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gray-900/10 bg-white/85 text-gray-700 shadow-md backdrop-blur-sm transition-colors duration-200 hover:bg-white dark:border-gray-100/10 dark:bg-gray-900/80 dark:text-gray-200 dark:hover:bg-gray-900"
            >
                <LogOut size={18} />
            </button>
            <div className="fixed right-4 top-4 z-40">
                <ThemeToggleButton />
            </div>
            <Outlet />
        </div>
    )
}