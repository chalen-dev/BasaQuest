// src/layouts/DashboardLayout.tsx
import { Outlet } from 'react-router-dom'
import Header from "../components/partials/Header.tsx";

export default function DashboardLayout() {
    return (
        <div className="min-h-screen bg-orange-50 transition-colors duration-300 dark:bg-gray-950">
            <Header />
            <main className="p-4">
                <Outlet />
            </main>
        </div>
    )
}