import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import OwlLoader from "../OwlLoader.tsx";

export const ProtectedRoute = () => {
    const { isAuthenticated, loading } = useAuth()

    if (loading) return <OwlLoader fullScreen message="Loading…" />

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }
    return <Outlet />
}

export const GuestRoute = () => {
    const { isAuthenticated, loading } = useAuth()

    if (loading) return <OwlLoader fullScreen message="Loading…" />

    if (isAuthenticated) {
        return <Navigate to="/home" replace />
    }
    return <Outlet />
}