// File: StudentsLayout.tsx
// File: src/pages/students/components/StudentsLayout.tsx
//
// Shared shell for every "Students" sub-nav destination (Dashboard,
// Progress, pupil Progress Report, Student List, Review, Results,
// Remediation list) — renders StudentsSubNav and the shared wide
// container ONCE and keeps both mounted across navigation between those
// routes via <Outlet/>, instead of each page rendering its own copy.
//
// Before this, StudentsSubNav (and its usePendingReviewCountQuery badge)
// was duplicated in every one of those pages: switching tabs unmounted
// the old page — and its StudentsSubNav instance — and mounted a brand
// new one, so the pending-review badge visibly reset/reflowed on every
// navigation even though ProtectedHeader's own copy of the same query
// never blinked. Same fix PersistentBackdropLayout already applies to
// the backdrop for the wider authenticated route group.
//
// Container width matches the max-w-[1350px] convention used by the
// other wide content pages (AttemptResults, TeacherReviewAttempt,
// RemediationPassagePreview, StudentRemediationDetail, AssessmentSession)
// — these sub-nav pages used to be stuck at max-w-6xl/max-w-4xl, much
// narrower than the rest of the app.
//
// "no-print" on the nav wrapper preserves PupilProgressReport's printable
// report behavior (StudentsSubNav used to be individually wrapped in
// no-print only on that page).
import { Outlet } from 'react-router-dom'
import { StudentsSubNav } from '../components/StudentsSubNav'
export default function StudentsLayout() {
    return (
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-2 sm:px-8">
            <div className="no-print mb-4">
                <StudentsSubNav />
            </div>
            <Outlet />
        </div>
    )
}
