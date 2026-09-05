// File: src/pages/students/remediation/session/RemediationSessionLayout.tsx
//
// Same shape as AssessmentSessionLayout — a stripped header (no nav,
// just Exit) paired with an <Outlet/> — used only for the active
// remediation session route. Much simpler than
// AssessmentSessionLayout.tsx: that one bridges a save-handler down
// from its routed child because Exit needs to trigger a draft save;
// nothing here needs saving on the way out (every toggle in
// RemediationSession.tsx already persists immediately), so this layout
// is pure chrome — no outlet context, no bridging.
import { Outlet, useParams } from 'react-router-dom'
import { useStudentProfileQuery } from '../../../review/hooks.ts'
import RemediationSessionHeader from './RemediationSessionHeader.tsx'
export default function RemediationSessionLayout() {
    const { studentId } = useParams<{ studentId: string }>()
    const { data: student } = useStudentProfileQuery(studentId)
    const studentName = student?.full_name || student?.username || null
    return (
        <div className="flex min-h-screen flex-col bg-orange-50 transition-colors duration-300 dark:bg-gray-950">
            <RemediationSessionHeader studentName={studentName} />
            <main className="relative flex-1 overflow-hidden p-4 pt-24 lg:pt-20">
                <div className="relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}