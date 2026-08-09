// src/layouts/ProtectedLayout.tsx
import { Navigate, Outlet } from 'react-router-dom'
import {Header} from "../components/partials/Header.tsx";
import {useAuth} from "../contexts/AuthContext.tsx";

export default function ProtectedLayout() {
    const { isAuthenticated, loading } = useAuth()

    if (loading) return <div>Loading...</div> // or a spinner component

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return (
        <div className="min-h-screen flex">
            <div className="flex-1">
                <Header />
                <main className="p-4">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}