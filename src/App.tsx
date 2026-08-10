import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom"
import './App.css'
import {GuestRoute, ProtectedRoute} from "./components/routes/AuthRoutes.tsx";
import Login from "./pages/auth/Login.tsx";
import { Dashboard } from "./pages/dashboard/Dashboard.tsx";
import Register from "./pages/auth/Register.tsx";
import {Home} from "./pages/home/Home.tsx";
import DashboardLayout from "./layouts/DashboardLayout.tsx";
import PersistentBackdropLayout from "./layouts/PersistentBackdropLayout.tsx";
import MaterialSelection from "./pages/proficiency/MaterialSelection.tsx";

function App() {

    return (
        <BrowserRouter>
            <Routes>

                {/*Guest Routes — PersistentBackdropLayout stays mounted across
                /login <-> /register navigation, so its HillsideBackdrop
                (and its CSS animations) never unmounts/remounts between
                the two auth screens */}
                <Route element = {<GuestRoute />}>
                    <Route element = {<PersistentBackdropLayout />}>
                        <Route path="/login" element={<Login />}/>
                        <Route path="/register" element={<Register />}/>
                    </Route>
                </Route>

                {/*Authenticated Routes — PersistentBackdropLayout stays mounted
                across /dashboard, /home, /reading/proficiency, etc., same as
                the guest routes above, so its HillsideBackdrop persists
                across navigation within this group too */}
                <Route element = {<ProtectedRoute />}>
                    <Route element = {<PersistentBackdropLayout />}>
                        <Route element = {<DashboardLayout />}>
                            <Route path="/dashboard" element={<Dashboard />}/>
                            <Route path="/home" element={<Home />}/>
                            <Route path="/reading/proficiency" element={<MaterialSelection />}/>
                        </Route>
                    </Route>
                </Route>

                {/* Catch */}
                <Route path="*"
                       element={<Navigate to="/login" replace/> }
                />
            </Routes>
        </BrowserRouter>
    )
}

export default App