// File: AuthRoutes.tsx
// File: src/components/routes/AuthRoutes.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../hooks/useProfile'
import OwlLoader from "../ui/OwlLoader.tsx";

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

// Gate for admin-only pages (currently just /admin/recording). Must be
// nested INSIDE a ProtectedRoute in App.tsx — it only checks the role, not
// whether the user is logged in at all, so it assumes auth already passed.
export const AdminRoute = () => {
    const { profile, loading } = useProfile()

    if (loading) return <OwlLoader fullScreen message="Loading…" />

    if (!profile || profile.role !== 'admin') {
        return <Navigate to="/home" replace />
    }
    return <Outlet />
}