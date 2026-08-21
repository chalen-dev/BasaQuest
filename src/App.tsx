// File: src/App.tsx
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom"
import './App.css'
import {AdminRoute, GuestRoute, ProtectedRoute} from "./components/routes/AuthRoutes.tsx";
import Login from "./pages/auth/Login.tsx";
import { Dashboard } from "./pages/students/dashboard/Dashboard.tsx";
import { StudentList } from "./pages/students/list/StudentList.tsx";
import Register from "./pages/auth/Register.tsx";
import {Home} from "./pages/home/Home.tsx";
import ProtectedLayout from "./layouts/ProtectedLayout.tsx";
import PersistentBackdropLayout from "./layouts/PersistentBackdropLayout.tsx";
import GuestLayout from "./layouts/GuestLayout.tsx";
import AssessmentSessionLayout from "./layouts/AssessmentSessionLayout.tsx";
import MaterialSelection from "./pages/proficiency/material_selection/MaterialSelection.tsx";
import BeforeAssessment from "./pages/proficiency/pre_assessment/before_assessment/BeforeAssessment.tsx";
import AssessmentSession from "./pages/proficiency/pre_assessment/assessment_session/AssessmentSession.tsx";
import StudentSessionBridge from "./pages/auth/StudentSessionBridge.tsx";
import RecordStudents from "./pages/admin/recording/RecordStudents.tsx";
import { useSessionPresence } from "./hooks/useSessionPresence.ts";
import { useDocumentTitle } from "./hooks/useDocumentTitle.ts";
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
                            <Route path="/home" element={<Home />}/>
                            <Route path="/reading/proficiency" element={<MaterialSelection />}/>
                            <Route path="/reading/proficiency/assessment" element={<BeforeAssessment />}/>
                            {/* Admin-only: the child-recording capture page.
                            Nested inside ProtectedRoute (must be logged in)
                            and ProtectedLayout (shares the normal header/
                            shell) — AdminRoute only adds the role check. */}
                            <Route element = {<AdminRoute />}>
                                <Route path="/admin/recording" element={<RecordStudents />}/>
                            </Route>
                        </Route>
                        {/* Focused check-in session — swaps DashboardLayout's full
                        header for AssessmentSessionLayout's stripped-down one
                        (no nav, no language toggle) once a language has been
                        picked, so the session can't be navigated away from or
                        have its language changed except by an explicit Exit. */}
                        <Route element = {<AssessmentSessionLayout />}>
                            <Route path="/reading/proficiency/assessment/session" element={<AssessmentSession />}/>
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