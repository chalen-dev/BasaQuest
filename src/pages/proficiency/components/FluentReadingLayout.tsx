// File: src/pages/proficiency/components/FluentReadingLayout.tsx
// Shell for the teacher's Fluent Reading Review / Results / Remediation pages:
// the sub-nav stays mounted while switching between them (same idea as
// StudentsLayout), with the same wide container.
import { Outlet } from 'react-router-dom'
import { FluentReadingSubNav } from './FluentReadingSubNav'

export default function FluentReadingLayout() {
    return (
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-2 sm:px-8">
            <div className="no-print mb-4">
                <FluentReadingSubNav />
            </div>
            <Outlet />
        </div>
    )
}
