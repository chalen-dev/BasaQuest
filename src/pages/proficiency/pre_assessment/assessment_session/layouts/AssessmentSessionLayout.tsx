// File: src/pages/proficiency/pre_assessment/assessment_session/layouts/AssessmentSessionLayout.tsx
// Same shape as ProtectedLayout, but paired with AssessmentSessionHeader
// instead of the full site Header — used only for the active reading
// check-in session route, where navigation and language switching are
// intentionally locked out.
//
// REVIEW-SAVE HANDOFF: AssessmentSessionHeader.tsx's Exit button (a
// sibling of the routed page, not a parent/child of it) needs to trigger
// a draft save when the teacher exits WHILE the inline word-review step
// is showing — but the review step only exists inside AssessmentSession.tsx,
// reached through <Outlet/>, several levels below this layout. Since
// there's no direct prop path from a routed child back up to a sibling
// header, this layout holds the bridge itself: it keeps
// "whatever the currently-active review's save function is" in state,
// hands the SETTER down to AssessmentSession.tsx via Outlet context (so
// it can register/unregister a handler as the review step comes and
// goes), and hands the CURRENT handler itself straight to
// AssessmentSessionHeader.tsx as a prop (so Exit can call it). When no
// handler is registered — every step except the active review — Exit
// falls back to its normal confirm-and-navigate behavior.
import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import AssessmentSessionHeader from './AssessmentSessionHeader.tsx'
export type AssessmentSessionOutletContext = {
    registerReviewSaveHandler: (handler: (() => Promise<void>) | null) => void
}
export default function AssessmentSessionLayout() {
    const [reviewSaveHandler, setReviewSaveHandler] = useState<(() => Promise<void>) | null>(null)
    // Wrapped in a function-returning updater — useState's setter treats
    // a bare function argument as "compute the next state from the
    // previous state", so storing an actual function AS the state value
    // needs this indirection or it'd be invoked instead of stored.
    const registerReviewSaveHandler = useCallback((handler: (() => Promise<void>) | null) => {
        setReviewSaveHandler(() => handler)
    }, [])
    return (
        <div className="flex min-h-screen flex-col bg-orange-50 transition-colors duration-300 dark:bg-gray-950">
            <AssessmentSessionHeader reviewSaveHandler={reviewSaveHandler} />
            <main className="relative flex-1 overflow-hidden p-4 pt-24 lg:pt-20">
                <div className="relative z-10">
                    <Outlet context={{ registerReviewSaveHandler } satisfies AssessmentSessionOutletContext} />
                </div>
            </main>
        </div>
    )
}