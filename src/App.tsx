
// File: src/App.tsx
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom"
import './App.css'
import {AdminRoute, GuestRoute, ProtectedRoute} from "./components/routes/AuthRoutes.tsx";
import Login from "./pages/auth/Login.tsx";
import { Dashboard } from "./pages/students/dashboard/Dashboard.tsx";
import { StudentList } from "./pages/students/list/StudentList.tsx";
import ReviewList from "./pages/students/review/ReviewList.tsx";
import TeacherReviewAttempt from "./pages/students/review/TeacherReviewAttempt.tsx";
import AttemptResults from "./pages/students/results/AttemptResults.tsx";
import ResultsList from "./pages/students/results/ResultsList.tsx";
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
function App() {
    // Mounted here — above <Routes>, not inside any particular layout —
    // so it's active on every route a logged-in student could be on,
    // including /reading/proficiency/assessment/session which uses
    // AssessmentSessionLayout, a sibling of ProtectedLayout rather than a
    // child of it. It no-ops entirely for non-student accounts.
    useSessionPresence()
    // Same reasoning as above — the tab title needs to reflect whoever's
    // logged in (or reset to plain "BasaQuest") regardless of which
    // layout/route group is currently active.
    useDocumentTitle()
    return (
        <BrowserRouter>
            <Routes>
                {/*Guest Routes — GuestLayout owns the backdrop, the bare
                theme/language toggle header, and the onboarding hints, and
                stays mounted across /login <-> /register navigation so its
                HillsideBackdrop (and its CSS animations) never
                unmounts/remounts between the two auth screens */}
                <Route element = {<GuestRoute />}>
                    <Route element = {<GuestLayout />}>
                        <Route path="/login" element={<Login />}/>
                        <Route path="/register" element={<Register />}/>
                    </Route>
                </Route>
                {/*Authenticated Routes — PersistentBackdropLayout stays mounted
                across /dashboard, /home, /reading/proficiency, etc., so its
                HillsideBackdrop persists across navigation within this
                group too */}
                <Route element = {<ProtectedRoute />}>
                    <Route element = {<PersistentBackdropLayout />}>
                        <Route element = {<ProtectedLayout />}>
                            <Route path="/dashboard" element={<Dashboard />}/>
                            <Route path="/students" element={<StudentList />}/>
                            {/* Teacher review inbox ("Send"-mode attempts
                            that finished scoring but haven't been
                            confirmed yet) and its per-attempt detail page.
                            "Now"-mode attempts are reviewed inline on the
                            session screen itself instead — see
                            AssessmentSession.tsx — so they normally never
                            need to be reached from here, but nothing stops
                            one from showing up if a teacher exits early.
                            /results is the read-only post-confirm page
                            both flows land on after Confirm Results — see
                            AttemptResults.tsx's own comment. /students/results
                            (ResultsList) is the browsable list of every
                            already-confirmed attempt, the counterpart to
                            /students/review. */}
                            <Route path="/students/review" element={<ReviewList />}/>
                            <Route path="/students/review/:attemptId" element={<TeacherReviewAttempt />}/>
                            <Route path="/students/review/:attemptId/results" element={<AttemptResults />}/>
                            <Route path="/students/results" element={<ResultsList />}/>
                            <Route path="/home" element={<Home />}/>
                            <Route path="/reading/proficiency" element={<MaterialSelection />}/>
                            <Route path="/reading/proficiency/assessment" element={<ProficiencyAssessmentSelectStudent />}/>
                            {/* Admin-only: the child-recording capture page.
                            Nested inside ProtectedRoute (must be logged in)
                            and ProtectedLayout (shares the normal header/
                            shell) — AdminRoute only adds the role check.
                            /admin/recording/session lives in its own layout
                            block below instead — it needs the stripped
                            Exit-only header, not this full nav. */}
                            <Route element = {<AdminRoute />}>
                                <Route path="/admin/students" element={<FinetuneStudentList />}/>
                                <Route path="/admin/recording" element={<AdminSelectStudent />}/>
                                <Route path="/admin/recording/scripts" element={<SentenceScripts />}/>
                                <Route path="/admin/recording/history" element={<RecordingHistory />}/>
                            </Route>
                        </Route>
                        {/* Focused check-in session — swaps ProtectedLayout's full
                        header for AssessmentSessionLayout's stripped-down one
                        (no nav, no language toggle) once a language has been
                        picked, so the session can't be navigated away from or
                        have its language changed except by an explicit Exit. */}
                        <Route element = {<AssessmentSessionLayout />}>
                            <Route path="/reading/proficiency/assessment/session" element={<AssessmentSession />}/>
                        </Route>
                        {/* Same idea for the fine-tune mic-capture screen — a
                        stripped header with only an Exit button (back to the
                        student picker) instead of the full admin nav, so an
                        admin mid-recording can't wander off by accident.
                        AdminRoute still nests inside for the role check. */}
                        <Route element = {<AdminSessionLayout />}>
                            <Route element = {<AdminRoute />}>
                                <Route path="/admin/recording/session" element={<RecordSession />}/>
                            </Route>
                        </Route>
                    </Route>
                </Route>
                {/* Bridge tab for "log in as this student" — deliberately
                outside both GuestRoute and ProtectedRoute, since this tab
                starts unauthenticated until the token is redeemed. */}
                <Route path="/student-session" element={<StudentSessionBridge />}/>
                {/* Catch */}
                <Route path="*"
                       element={<Navigate to="/login" replace/> }
                />
            </Routes>
        </BrowserRouter>
    )
}
export default App