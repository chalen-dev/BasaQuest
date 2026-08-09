import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export const ProtectedRoute = () => {
    const { isAuthenticated, loading } = useAuth()

    if (loading) return null // or a spinner, once you have one

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }
    return <Outlet />
}

export const GuestRoute = () => {
    const { isAuthenticated, loading } = useAuth()

    if (loading) return null

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />
    }
    return <Outlet />
}