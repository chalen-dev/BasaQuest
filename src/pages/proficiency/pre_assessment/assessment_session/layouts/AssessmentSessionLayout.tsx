// File: src/pages/proficiency/pre_assessment/assessment_session/layouts/AssessmentSessionLayout.tsx
// Same shape as ProtectedLayout, but paired with AssessmentSessionHeader
// instead of the full site Header — used only for the active reading
// check-in session route, where navigation and language switching are
// intentionally locked out.
import { Outlet } from 'react-router-dom'
import AssessmentSessionHeader from './AssessmentSessionHeader.tsx'
export default function AssessmentSessionLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-orange-50 transition-colors duration-300 dark:bg-gray-950">
            <AssessmentSessionHeader />
            <main className="relative flex-1 overflow-hidden p-4 pt-24 lg:pt-20">
                <div className="relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}