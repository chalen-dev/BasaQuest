import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom"
import './App.css'
import {GuestRoute, ProtectedRoute} from "./components/routes/AuthRoutes.tsx";
import Login from "./pages/auth/Login.tsx";
import { Dashboard } from "./pages/dashboard/Dashboard.tsx";
import Register from "./pages/auth/Register.tsx";

function App() {

  return (
    <BrowserRouter>
        <Routes>

            {/*Guest Routes*/}
            <Route element = {<GuestRoute />}>
                <Route path="/login" element={<Login />}/>
                <Route path="/register" element={<Register />}/>
            </Route>

            {/*Authenticated Routes*/}
            <Route element = {<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />}/>
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
