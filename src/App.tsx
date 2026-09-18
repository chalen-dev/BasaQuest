// File: src/App.tsx
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from "react-router-dom"
import './App.css'
import {AdminRoute, GuestRoute, ProtectedRoute} from "./components/routes/AuthRoutes.tsx";
import Login from "./pages/auth/Login.tsx";
import { Dashboard } from "./pages/students/dashboard/Dashboard.tsx";
import { ProgressDashboard } from "./pages/students/progress/ProgressDashboard.tsx";
import PupilProgressReport from "./pages/students/reports/PupilProgressReport.tsx";
import ClassAnalyticsReport from "./pages/students/reports/ClassAnalyticsReport.tsx";
import { StudentList } from "./pages/students/list/StudentList.tsx";
import ReviewList from "./pages/students/review/ReviewList.tsx";
import TeacherReviewAttempt from "./pages/students/review/TeacherReviewAttempt.tsx";
import AttemptResults from "./pages/students/results/AttemptResults.tsx";
import RemediationPassagePreview from "./pages/students/results/RemediationPassagePreview.tsx";
import ResultsList from "./pages/students/results/ResultsList.tsx";
import RemediationList from "./pages/students/remediation/list/RemediationList.tsx";
import StudentRemediationDetail from "./pages/students/remediation/list/StudentRemediationDetail.tsx";
import RemediationSessionLayout from "./pages/students/remediation/session/layouts/RemediationSessionLayout.tsx";
import RemediationSession from "./pages/students/remediation/session/RemediationSession.tsx";
import RemediationCoachLayout from "./pages/students/remediation/coach/layout/RemediationCoachLayout.tsx";
import RemediationCoach from "./pages/students/remediation/coach/RemediationCoach.tsx";
import CoachBackdropTestPage from "./pages/students/remediation/coach/features/CoachBackdropTestPage.tsx";
import Register from "./pages/auth/Register.tsx";
import {Home} from "./pages/home/Home.tsx";
import ProtectedLayout from "./pages/_layouts/ProtectedLayout.tsx";
import PersistentBackdropLayout from "./pages/_layouts/PersistentBackdropLayout.tsx";
import GuestLayout from "./pages/auth/layouts/GuestLayout.tsx";
import AssessmentSessionLayout from "./pages/proficiency/pre_assessment/assessment_session/layouts/AssessmentSessionLayout.tsx";
import AdminSessionLayout from "./pages/admin/recording/session/layouts/AdminSessionLayout.tsx";
import MaterialSelection from "./pages/proficiency/material_selection/MaterialSelection.tsx";
import ProficiencyAssessmentSelectStudent from "./pages/proficiency/pre_assessment/select_student/ProficiencyAssessmentSelectStudent.tsx";
import AssessmentSession from "./pages/proficiency/pre_assessment/assessment_session/AssessmentSession.tsx";
import StudentSessionBridge from "./pages/auth/StudentSessionBridge.tsx";
import AdminSelectStudent from "./pages/admin/recording/select_student/AdminSelectStudent.tsx";
import RecordSession from "./pages/admin/recording/session/RecordSession.tsx";
import RecordingHistory from "./pages/admin/recording_history/RecordingHistory.tsx";
import SentenceScripts from "./pages/admin/sentence_scripts/SentenceScripts.tsx";
import { useSessionPresence } from "./hooks/useSessionPresence.ts";
import { useDocumentTitle } from "./hooks/useDocumentTitle.ts";
import FinetuneStudentList from "./pages/admin/students/FinetuneStudentList.tsx";
// MIGRATED FROM <BrowserRouter><Routes>...</Routes></BrowserRouter> TO A
// DATA ROUTER (createBrowserRouter + RouterProvider) — required for
// useBlocker (see src/hooks/useUnsavedChangesBlocker.ts), used on the
// teacher review screens.
//
// REMEDIATION SESSION ROUTES: /students/remediation/:studentId/session/:materialId
// (flashcard "Practice" drill, RemediationSession.tsx) uses
// RemediationSessionLayout (shared header, Exit only).
//
// /students/remediation/:studentId/session/:materialId/coach ("Reading
// Coach Mode", RemediationCoach.tsx) used to be nested under that SAME
// RemediationSessionLayout, but Coach Mode is a full-bleed table+book
// scene that can't share a header taking up vertical space — it now gets
// its OWN layout, RemediationCoachLayout (no header, just a floating
// Exit + Day/Night toggle), as its own sibling <Route> block, same
// reasoning as AssessmentSessionLayout below.
//
const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            {/*Guest Routes — GuestLayout owns the backdrop, the bare
            theme/language toggle header, and the onboarding hints, and
            stays mounted across /login <-> /register navigation so its
            HillsideBackdrop (and its CSS animations) never
            unmounts/remounts between the two auth screens */}
            <Route element={<GuestRoute />}>
                <Route element={<GuestLayout />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Route>
            </Route>
            {/*Authenticated Routes — PersistentBackdropLayout stays mounted
            across /dashboard, /home, /reading/proficiency, etc., so its
            HillsideBackdrop persists across navigation within this
            group too */}
            <Route element={<ProtectedRoute />}>
                <Route element={<PersistentBackdropLayout />}>
                    <Route element={<ProtectedLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        {/* Per-pupil progress dashboard — consolidates
                        Reading Proficiency (EN/FIL) scores + trend,
                        pending flagged-word counts, and stale remediation
                        material across a teacher's whole roster in one
                        screen. See teacher_dashboard_summary migration. */}
                        <Route path="/students/progress" element={<ProgressDashboard />} />
                        {/* Printable reports (capstone objective) — one
                        pupil's full picture over a period, and the
                        teacher's whole-roster analytics snapshot. See
                        get_pupil_progress_report/get_class_analytics_report. */}
                        <Route path="/students/progress/:studentId/report" element={<PupilProgressReport />} />
                        <Route path="/students/progress/class-report" element={<ClassAnalyticsReport />} />
                        <Route path="/students" element={<StudentList />} />
                        {/* Teacher review inbox, its per-attempt detail
                        page, the confirmed-results list, and the
                        remediation-material list + per-pupil detail
                        page — see remediation/hooks.ts. */}
                        <Route path="/students/review" element={<ReviewList />} />
                        <Route path="/students/review/:attemptId" element={<TeacherReviewAttempt />} />
                        <Route path="/students/review/:attemptId/results" element={<AttemptResults />} />
                        {/* Generation-preview step between "Generate
                        Remediation Material" and an actual saved row —
                        see RemediationPassagePreview.tsx's own header
                        comment. Same ProtectedLayout as AttemptResults
                        above (normal header) -- a review/decision
                        screen, not a focused/distraction-free session
                        like AssessmentSession or RemediationSession. */}
                        <Route path="/students/review/:attemptId/remediation-preview" element={<RemediationPassagePreview />} />
                        <Route path="/students/results" element={<ResultsList />} />
                        <Route path="/students/remediation" element={<RemediationList />} />
                        <Route path="/students/remediation/:studentId" element={<StudentRemediationDetail />} />
                        <Route path="/home" element={<Home />} />
                        <Route path="/reading/proficiency" element={<MaterialSelection />} />
                        <Route path="/reading/proficiency/assessment" element={<ProficiencyAssessmentSelectStudent />} />
                        {/* Admin-only: the child-recording capture page.
                        Nested inside ProtectedRoute (must be logged in)
                        and ProtectedLayout (shares the normal header/
                        shell) — AdminRoute only adds the role check.
                        /admin/recording/session lives in its own layout
                        block below instead — it needs the stripped
                        Exit-only header, not this full nav. */}
                        <Route element={<AdminRoute />}>
                            <Route path="/admin/students" element={<FinetuneStudentList />} />
                            <Route path="/admin/recording" element={<AdminSelectStudent />} />
                            <Route path="/admin/recording/scripts" element={<SentenceScripts />} />
                            <Route path="/admin/recording/history" element={<RecordingHistory />} />
                        </Route>
                    </Route>
                    {/* Focused check-in session — swaps ProtectedLayout's full
                    header for AssessmentSessionLayout's stripped-down one
                    (no nav, no language toggle) once a language has been
                    picked, so the session can't be navigated away from or
                    have its language changed except by an explicit Exit. */}
                    <Route element={<AssessmentSessionLayout />}>
                        <Route path="/reading/proficiency/assessment/session" element={<AssessmentSession />} />
                    </Route>
                    {/* Teacher-led remediation drill (flashcard "Practice") —
                    same stripped-header idea as AssessmentSessionLayout
                    above, scoped to one piece of remediation material for
                    one pupil. */}
                    <Route element={<RemediationSessionLayout />}>
                        <Route path="/students/remediation/:studentId/session/:materialId" element={<RemediationSession />} />
                    </Route>
                    {/* Reading Coach Mode — its own full-bleed layout, no
                    shared header at all (see RemediationCoachLayout.tsx's
                    header comment). Split out from RemediationSessionLayout
                    above because Coach Mode's table+book scene needs the
                    entire viewport, not a header-minus-height area. */}
                    <Route element={<RemediationCoachLayout />}>
                        <Route path="/students/remediation/:studentId/session/:materialId/coach" element={<RemediationCoach />} />
                    </Route>
                    {/* Same idea for the fine-tune mic-capture screen — a
                    stripped header with only an Exit button (back to the
                    student picker) instead of the full admin nav, so an
                    admin mid-recording can't wander off by accident.
                    AdminRoute still nests inside for the role check. */}
                    <Route element={<AdminSessionLayout />}>
                        <Route element={<AdminRoute />}>
                            <Route path="/admin/recording/session" element={<RecordSession />} />
                        </Route>
                    </Route>
                </Route>
            </Route>
            {/* Bridge tab for "log in as this student" — deliberately
            outside both GuestRoute and ProtectedRoute, since this tab
            starts unauthenticated until the token is redeemed. */}
            <Route path="/student-session" element={<StudentSessionBridge />} />
            {/* DEV-ONLY: isolated visual harness for CoachTableBackdrop.tsx
            (the Reading Coach Mode page-turn scene) — no auth guard, no
            data fetching, not linked from any nav. See
            CoachBackdropTestPage.tsx's own header comment. Safe to
            delete this route (and that file) once the backdrop's been
            checked against the real RemediationCoach.tsx and the
            standalone harness isn't needed anymore. */}
            <Route path="/dev/coach-backdrop" element={<CoachBackdropTestPage />} />
            {/* Catch */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </>
    )
)
function App() {
    // Mounted here — above <RouterProvider>, not inside any particular
    // layout — so it's active on every route a logged-in student could
    // be on, including /reading/proficiency/assessment/session which
    // uses AssessmentSessionLayout, a sibling of ProtectedLayout rather
    // than a child of it. It no-ops entirely for non-student accounts.
    useSessionPresence()
    // Same reasoning as above — the tab title needs to reflect whoever's
    // logged in (or reset to plain "BasaQuest") regardless of which
    // layout/route group is currently active.
    useDocumentTitle()
    return <RouterProvider router={router} />
}
export default App