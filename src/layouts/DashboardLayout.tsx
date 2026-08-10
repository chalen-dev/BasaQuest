
import { Outlet } from 'react-router-dom'
import Header from "../components/partials/Header.tsx";
import { HillsideBackdrop } from "../components/backgrounds/HillsideBackdrop.tsx";
export default function DashboardLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-orange-50 transition-colors duration-300 dark:bg-gray-950">
            <Header />
            <main className="relative flex-1 overflow-hidden p-4">
                <HillsideBackdrop />
                <div className="relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}