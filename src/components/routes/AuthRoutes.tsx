import { Navigate, Outlet } from "react-router-dom";


const isLoggedIn = false;

export const ProtectedRoute = () => {
    if (!isLoggedIn) {
        return <Navigate to="/login" />;
    }
    return <Outlet/>;
};

export const GuestRoute = () => {
    if (isLoggedIn) {
        return <Navigate to="/dashboard" />;
    }
    return <Outlet/>;
};