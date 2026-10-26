// File: src/App.tsx
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from "react-router-dom"
import './App.css'
import {AdminRoute, GuestRoute, ProtectedRoute} from "./components/routes/AuthRoutes.tsx";
import LoginPage from "./pages/auth/LoginPage.tsx";
import { StudentsDashboardPage } from "./pages/students/dashboard/StudentsDashboardPage.tsx";
import { ProgressDashboardPage } from "./pages/students/progress/ProgressDashboardPage.tsx";
import PupilProgressReportPage from "./pages/students/reports/PupilProgressReportPage.tsx";
import ClassAnalyticsReportPage from "./pages/students/reports/ClassAnalyticsReportPage.tsx";
import { StudentListPage } from "./pages/students/list/StudentListPage.tsx";
import ReviewListPage from "./pages/students/review/ReviewListPage.tsx";
import TeacherReviewAttemptPage from "./pages/students/review/TeacherReviewAttemptPage.tsx";
import AttemptResultsPage from "./pages/students/results/AttemptResultsPage.tsx";
import RemediationPassagePreviewPage from "./pages/students/results/RemediationPassagePreviewPage.tsx";
import ResultsListPage from "./pages/students/results/ResultsListPage.tsx";
import RemediationListPage from "./pages/students/remediation/list/RemediationListPage.tsx";
import StudentRemediationDetailPage from "./pages/students/remediation/list/StudentRemediationDetailPage.tsx";
import StudentsLayout from "./pages/students/layouts/StudentsLayout.tsx";
import RemediationSessionLayout from "./pages/students/remediation/session/layouts/RemediationSessionLayout.tsx";
import RemediationSessionPage from "./pages/students/remediation/session/RemediationSessionPage.tsx";
import RemediationCoachLayout from "./pages/students/remediation/coach/layouts/RemediationCoachLayout.tsx";
import RemediationCoachPage from "./pages/students/remediation/coach/RemediationCoachPage.tsx";
import CoachBackdropTestPage from "./pages/students/remediation/coach/features/CoachBackdropTestPage.tsx";
import RegisterPage from "./pages/auth/RegisterPage.tsx";
import { HomePage } from "./pages/home/HomePage.tsx";
import ProtectedLayout from "./pages/_layouts/ProtectedLayout.tsx";
import PersistentBackdropLayout from "./pages/_layouts/PersistentBackdropLayout.tsx";
import GuestLayout from "./pages/auth/layouts/GuestLayout.tsx";
import AssessmentSessionLayout from "./pages/proficiency/pre_assessment/assessment_session/layouts/AssessmentSessionLayout.tsx";
import AdminSessionLayout from "./pages/admin/recording/session/layouts/AdminSessionLayout.tsx";
import MaterialSelectionPage from "./pages/proficiency/material_selection/MaterialSelectionPage.tsx";
import ProficiencyAssessmentSelectStudentPage from "./pages/proficiency/pre_assessment/select_student/ProficiencyAssessmentSelectStudentPage.tsx";
import AssessmentSessionPage from "./pages/proficiency/pre_assessment/assessment_session/AssessmentSessionPage.tsx";
import StudentSessionBridge from "./pages/auth/StudentSessionBridge.tsx";
import AdminSelectStudentPage from "./pages/admin/recording/select_student/AdminSelectStudentPage.tsx";
import RecordSessionPage from "./pages/admin/recording/session/RecordSessionPage.tsx";
import AnnotateRecordingPage from "./pages/admin/recording/annotate/AnnotateRecordingPage.tsx";
import RecordingHistoryPage from "./pages/admin/recording_history/RecordingHistoryPage.tsx";
import SentenceScriptsPage from "./pages/admin/sentence_scripts/SentenceScriptsPage.tsx";
import { useSessionPresence } from "./hooks/useSessionPresence.ts";
import { useDocumentTitle } from "./hooks/useDocumentTitle.ts";
import FinetuneStudentListPage from "./pages/admin/students/FinetuneStudentListPage.tsx";
import WordImagesPage from "./pages/admin/word_images/WordImagesPage.tsx";
import PictureCreditsPage from "./pages/credits/PictureCreditsPage.tsx";
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
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Route>
            </Route>
            {/*Authenticated Routes — PersistentBackdropLayout stays mounted
            across /dashboard, /home, /reading/proficiency, etc., so its
            HillsideBackdrop persists across navigation within this
            group too */}
            <Route element={<ProtectedRoute />}>
                <Route element={<PersistentBackdropLayout />}>
                    <Route element={<ProtectedLayout />}>
                        {/* Students sub-nav group — StudentsLayout renders
                        StudentsSubNav + the shared wide container ONCE and
                        keeps it mounted across navigation between these
                        routes (see StudentsLayout.tsx's own header comment
                        for why: it used to be duplicated per-page, so its
                        pending-review badge remounted/reset on every tab
                        switch). Routes that DON'T show StudentsSubNav
                        (class report, per-attempt review/results/preview,
                        the per-pupil remediation detail page) stay outside
                        this group, as direct ProtectedLayout children below. */}
                        <Route element={<StudentsLayout />}>
                            <Route path="/dashboard" element={<StudentsDashboardPage />} />
                            {/* Per-pupil progress dashboard — consolidates
                            Reading Proficiency (EN/FIL) scores + trend,
                            pending flagged-word counts, and stale remediation
                            material across a teacher's whole roster in one
                            screen. See teacher_dashboard_summary migration. */}
                            <Route path="/students/progress" element={<ProgressDashboardPage />} />
                            {/* Printable report (capstone objective) — one
                            pupil's full picture over a period. See
                            get_pupil_progress_report. */}
                            <Route path="/students/progress/:studentId/report" element={<PupilProgressReportPage />} />
                            <Route path="/students" element={<StudentListPage />} />
                            {/* Teacher review inbox, the confirmed-results
                            list, and the remediation-material list — see
                            remediation/hooks.ts. */}
                            <Route path="/students/review" element={<ReviewListPage />} />
                            <Route path="/students/results" element={<ResultsListPage />} />
                            <Route path="/students/remediation" element={<RemediationListPage />} />
                        </Route>
                        {/* Teacher's whole-roster analytics snapshot — just a
                        back button, not the full StudentsSubNav. See
                        get_class_analytics_report. */}
                        <Route path="/students/progress/class-report" element={<ClassAnalyticsReportPage />} />
                        {/* Per-attempt detail pages and the per-pupil
                        remediation detail page — none of these show
                        StudentsSubNav (they have their own back button). */}
                        <Route path="/students/review/:attemptId" element={<TeacherReviewAttemptPage />} />
                        <Route path="/students/review/:attemptId/results" element={<AttemptResultsPage />} />
                        {/* Generation-preview step between "Generate
                        Remediation Material" and an actual saved row —
                        see RemediationPassagePreview.tsx's own header
                        comment. Same ProtectedLayout as AttemptResults
                        above (normal header) -- a review/decision
                        screen, not a focused/distraction-free session
                        like AssessmentSession or RemediationSession. */}
                        <Route path="/students/review/:attemptId/remediation-preview" element={<RemediationPassagePreviewPage />} />
                        <Route path="/students/remediation/:studentId" element={<StudentRemediationDetailPage />} />
                        <Route path="/home" element={<HomePage />} />
                        <Route path="/credits" element={<PictureCreditsPage />} />
                        <Route path="/reading/proficiency" element={<MaterialSelectionPage />} />
                        <Route path="/reading/proficiency/assessment" element={<ProficiencyAssessmentSelectStudentPage />} />
                        {/* Admin-only: the child-recording capture page.
                        Nested inside ProtectedRoute (must be logged in)
                        and ProtectedLayout (shares the normal header/
                        shell) — AdminRoute only adds the role check.
                        /admin/recording/session lives in its own layout
                        block below instead — it needs the stripped
                        Exit-only header, not this full nav. */}
                        <Route element={<AdminRoute />}>
                            <Route path="/admin/students" element={<FinetuneStudentListPage />} />
                            <Route path="/admin/word-images" element={<WordImagesPage />} />
                            <Route path="/admin/recording" element={<AdminSelectStudentPage />} />
                            <Route path="/admin/recording/scripts" element={<SentenceScriptsPage />} />
                            <Route path="/admin/recording/history" element={<RecordingHistoryPage />} />
                        </Route>
                    </Route>
                    {/* Focused check-in session — swaps ProtectedLayout's full
                    header for AssessmentSessionLayout's stripped-down one
                    (no nav, no language toggle) once a language has been
                    picked, so the session can't be navigated away from or
                    have its language changed except by an explicit Exit. */}
                    <Route element={<AssessmentSessionLayout />}>
                        <Route path="/reading/proficiency/assessment/session" element={<AssessmentSessionPage />} />
                    </Route>
                    {/* Teacher-led remediation drill (flashcard "Practice") —
                    same stripped-header idea as AssessmentSessionLayout
                    above, scoped to one piece of remediation material for
                    one pupil. */}
                    <Route element={<RemediationSessionLayout />}>
                        <Route path="/students/remediation/:studentId/session/:materialId" element={<RemediationSessionPage />} />
                    </Route>
                    {/* Reading Coach Mode — its own full-bleed layout, no
                    shared header at all (see RemediationCoachLayout.tsx's
                    header comment). Split out from RemediationSessionLayout
                    above because Coach Mode's table+book scene needs the
                    entire viewport, not a header-minus-height area. */}
                    <Route element={<RemediationCoachLayout />}>
                        <Route path="/students/remediation/:studentId/session/:materialId/coach" element={<RemediationCoachPage />} />
                    </Route>
                    {/* Same idea for the fine-tune mic-capture screen — a
                    stripped header with only an Exit button (back to the
                    student picker) instead of the full admin nav, so an
                    admin mid-recording can't wander off by accident.
                    AdminRoute still nests inside for the role check. */}
                    <Route element={<AdminSessionLayout />}>
                        <Route element={<AdminRoute />}>
                            <Route path="/admin/recording/session" element={<RecordSessionPage />} />
                            <Route path="/admin/recording/annotate/:recordingId" element={<AnnotateRecordingPage />} />
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